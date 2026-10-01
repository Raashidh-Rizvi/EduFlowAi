using System.Text;
using EduFlow.Core.Interfaces;
using EduFlow.Core.Options;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Services.Evaluation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Configuration (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not configured. " +
        "Set it via appsettings.json, environment variable ConnectionStrings__DefaultConnection, or user secrets.");
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(3);
    });
    // options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// 2. Register Domain & Infrastructure Services
builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGamificationService, GamificationService>();
builder.Services.AddScoped<IAssessmentAccessService, AssessmentAccessService>();
builder.Services.AddScoped<IAttemptService, AttemptService>();
builder.Services.AddSingleton<IEvaluationService>(_ => new EvaluationService(EvaluationService.DefaultEvaluators()));
builder.Services.AddScoped<IAttemptGradingService, AttemptGradingService>();
builder.Services.AddScoped<ITeamService, TeamService>();
// Enrollment approval must never bypass payment verification. Swap this registration for a
// provider-backed implementation when a payment gateway is introduced.
builder.Services.AddScoped<IPaymentVerificationService, PaymentVerificationService>();
builder.Services.AddScoped<IRatingService, RatingService>();
builder.Services.AddScoped<ISupportTicketService, SupportTicketService>();
builder.Services.AddScoped<IAuditLogWriter, AuditLogWriter>();
builder.Services.AddScoped<IAdminAuditLogService, AdminAuditLogService>();

// 2b. Review moderation behaviour (see docs/current/RATINGS_AND_REVIEWS.md)
builder.Services.Configure<ReviewModerationOptions>(builder.Configuration.GetSection("ReviewModeration"));

// 3. JWT Authentication & Authorization
var jwtSecret = builder.Configuration["JwtSettings:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException(
        "JwtSettings:Secret is not configured. " +
        "Set it via appsettings.json, environment variable JwtSettings__Secret, or user secrets.");
}
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "EduFlowAPI",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "EduFlowClients",
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("InstructorOnly", policy => policy.RequireRole("Instructor"));
    options.AddPolicy("StudentOnly", policy => policy.RequireRole("Student"));
    options.AddPolicy("InstructorOrAdmin", policy => policy.RequireRole("Instructor", "Admin"));
});

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
                      return uri.Host == "localhost" || uri.Host == "127.0.0.1";
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

    // Demo accounts and content exist only in Development; other environments get schema only.
    if (app.Environment.IsDevelopment())
    {
        try
        {
            DbInitializer.SeedDevelopmentData(services.GetRequiredService<ApplicationDbContext>());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Development demo data seeding failed; continuing without complete demo data.");
        }
    }
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
            message = "An unexpected server error occurred. Please try again later.",
            error = app.Environment.IsDevelopment() ? exception?.Message : null
        });
    });
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("EduFlowCorsPolicy");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Lightweight health endpoints for system monitoring & dev auto-reload coordination
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "EduFlow.Api", timestamp = DateTime.UtcNow }));
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", service = "EduFlow.Api", timestamp = DateTime.UtcNow }));

app.Run();

public partial class Program { }
