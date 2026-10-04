using EduFlow.Api;
using System.Text;
using EduFlow.Api.Errors;
using EduFlow.Api.Security;
using EduFlow.Core.Interfaces;
using EduFlow.Core.Options;
using EduFlow.Infrastructure;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Services.Evaluation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // 1. Database Configuration (PostgreSQL)
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "ConnectionStrings:DefaultConnection is not configured. " +
            "Set it via user secrets (dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" ...), " +
            "environment variable ConnectionStrings__DefaultConnection, or a git-ignored appsettings.Development.json.");
    }

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(3);
            npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        });
        // options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    });

    // 2. Register Domain & Infrastructure Services
    builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>();
    // Uploads: private Vercel Blob when a store is connected (container disk is ephemeral and
    // not shared with the AI agent there), otherwise wwwroot/uploads on local disk.
    // A malformed token (e.g. an unfilled "<...>" placeholder) would make every controller that
    // depends on IUploadStorage throw, so it falls back to local disk with a startup warning.
    var blobToken = builder.Configuration["BLOB_READ_WRITE_TOKEN"];
    if (!string.IsNullOrWhiteSpace(blobToken) && !VercelBlobUploadStorage.IsValidToken(blobToken))
    {
        Console.Error.WriteLine("WARNING: BLOB_READ_WRITE_TOKEN is set but is not a valid Vercel Blob read-write token; using local upload storage.");
        blobToken = null;
    }
    if (!string.IsNullOrWhiteSpace(blobToken))
    {
        builder.Services.AddHttpClient(nameof(VercelBlobUploadStorage));
        builder.Services.AddSingleton<IUploadStorage>(sp => new VercelBlobUploadStorage(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(VercelBlobUploadStorage)),
            blobToken,
            sp.GetRequiredService<ILogger<VercelBlobUploadStorage>>()));
    }
    else
    {
        builder.Services.AddSingleton<IUploadStorage>(sp =>
            new LocalUploadStorage(sp.GetRequiredService<IWebHostEnvironment>().WebRootPath
                ?? Path.Combine(AppContext.BaseDirectory, "wwwroot")));
    }
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddLmsDomainServices();
    builder.Services.AddScoped<ITeamService, TeamService>();
    // Enrollment approval must never bypass payment verification. Swap this registration for a
    // provider-backed implementation when a payment gateway is introduced.
    builder.Services.AddScoped<IRatingService, RatingService>();
    builder.Services.AddScoped<ISupportTicketService, SupportTicketService>();
    builder.Services.AddScoped<IAdminAuditLogService, AdminAuditLogService>();

    // 2b. Review moderation behaviour (see docs/current/RATINGS_AND_REVIEWS.md)
    builder.Services.Configure<ReviewModerationOptions>(builder.Configuration.GetSection("ReviewModeration"));

    // 3. JWT Authentication & Authorization
    var jwtSecret = builder.Configuration["JwtSettings:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret))
    {
        throw new InvalidOperationException(
            "JwtSettings:Secret is not configured. " +
            "Set it via user secrets (dotnet user-secrets set \"JwtSettings:Secret\" ...), " +
            "environment variable JwtSettings__Secret, or a git-ignored appsettings.Development.json.");
    }
    var key = Encoding.UTF8.GetBytes(jwtSecret);
    if (key.Length < 32) throw new InvalidOperationException("JwtSettings:Secret must contain at least 32 UTF-8 bytes.");

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.Events = new JwtBearerEvents { OnTokenValidated = AccountTokenValidation.ValidateAsync };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "EduFlowAPI",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "EduFlowClients",
            ClockSkew = TimeSpan.Zero
        };
    });

    builder.Services.AddAuthorization(AuthorizationPolicies.Configure);

    // 4. CORS Policy for React Web Client & Mobile Dev
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("EduFlowCorsPolicy", policy =>
        {
            policy.SetIsOriginAllowed(origin =>
                  {
                      if (string.IsNullOrWhiteSpace(origin)) return false;
                      if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                      {
                          if (builder.Environment.IsDevelopment()) return true;
                          return uri.Host == "localhost" ||
                                 uri.Host == "127.0.0.1" ||
                                 uri.Host.StartsWith("172.") ||
                                 uri.Host.StartsWith("192.168.") ||
                                 uri.Host.StartsWith("10.");
                      }
                      return false;
                  })
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    // 5. Controllers & JSON Options
    builder.Services.AddControllers()
        .ConfigureApiBehaviorOptions(ApiErrorHandling.ConfigureInvalidModelState)
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        });

    // 6. Swagger / OpenAPI Documentation
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "EduFlow AI Web API 🎓🎮",
            Version = "v1",
            Description = "Authoritative REST API Gateway for EduFlow AI Gamified Education Platform"
        });

        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });

        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    var app = builder.Build();

    // 7. Database Initialization & Auto-Migration
    // Migration failures are intentionally NOT suppressed: the application must not
    // start against a database whose schema is out of sync.
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<Program>>();
        try
        {
            var context = services.GetRequiredService<ApplicationDbContext>();
            DbInitializer.Initialize(context);
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "Database initialization/migration failed. Application cannot start safely.");
            throw;
        }

        // This separate flag provisions only the requested local auth account, no LMS demo content.
        DbInitializer.EnsureDevelopmentAdmin(services.GetRequiredService<ApplicationDbContext>(),
            app.Environment.IsDevelopment(), builder.Configuration.GetValue<bool>("DemoAccounts:Enabled"),
            builder.Configuration.GetValue<bool>("DemoAccounts:ResetCredentials"));

        // Historical migrations also insert demo users. Enforce the current policy
        // after migration, in every environment, before accepting any requests.
        var demoEnabled = builder.Configuration.GetValue<bool>("DevelopmentDemo:Enabled");
        var resetDemoCredentials = builder.Configuration.GetValue<bool>("DevelopmentDemo:ResetCredentials");
        DbInitializer.ApplyDemoAccountPolicy(services.GetRequiredService<ApplicationDbContext>(),
            app.Environment.IsDevelopment(), demoEnabled, resetDemoCredentials);

    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduFlow AI API v1");
        });
    }

    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
            var exception = exceptionHandlerPathFeature?.Error;

            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(exception, "An unhandled exception occurred while processing the request.");

            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new 
            { 
                message = "An unexpected server error occurred. Please try again later."
            });
        });
    });

    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }
    app.UseCors("EduFlowCorsPolicy");
    // Uploaded course material is served only through UploadsController (authorization + enrollment
    // check); keep the static-file middleware from serving wwwroot/uploads anonymously.
    app.UseWhen(ctx => !ctx.Request.Path.StartsWithSegments("/uploads"), branch => branch.UseStaticFiles());
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    // Lightweight health endpoints for system monitoring & dev auto-reload coordination
    app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "EduFlow.Api", timestamp = DateTime.UtcNow })).AllowAnonymous();
    app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", service = "EduFlow.Api", timestamp = DateTime.UtcNow })).AllowAnonymous();

    // Readiness: confirms the database and the AI agent are reachable from this instance.
    // Reports only status strings, never connection details.
    app.MapGet("/api/health/ready", async (ApplicationDbContext db, IAiGatewayClient ai, CancellationToken ct) =>
    {
        string database;
        try { database = await db.Database.CanConnectAsync(ct) ? "ok" : "unreachable"; }
        catch { database = "unreachable"; }

        string aiAgent;
        try
        {
            using var status = System.Text.Json.JsonDocument.Parse(await ai.GetAiStatusAsync(ct));
            aiAgent = status.RootElement.TryGetProperty("status", out var s) ? s.GetString() ?? "unknown" : "unknown";
        }
        catch { aiAgent = "unreachable"; }

        var ready = database == "ok" && aiAgent == "healthy";
        return Results.Json(new { status = ready ? "ready" : "degraded", database, aiAgent, timestamp = DateTime.UtcNow },
            statusCode: ready ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable);
    }).AllowAnonymous();

    app.Run();
}
// A crash at startup surfaces on Vercel only as FUNCTION_INVOCATION_FAILED. Outside Development,
// stay up and answer 503 with the reason (config key or failure category, never secrets).
catch (Exception ex) when (StartupFailure.ShouldServe(ex))
{
    StartupFailure.Serve(args, ex);
}

public partial class Program { }
