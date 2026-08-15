using System.Text;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=eduflow_db;Username=postgres;Password=postgres";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// 2. JWT Authentication & Authorization
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "EduFlowAI_Super_Secret_Key_For_Jwt_Signing_At_Least_32_Bytes_Long!";
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

// 3. CORS Policy for React Web Client
builder.Services.AddCors(options =>
{
    options.AddPolicy("EduFlowCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 4. Controllers & JSON Options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// 5. Swagger / OpenAPI Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EduFlow AI Web API",
        Version = "v1",
        Description = "Authoritative REST API Gateway for EduFlow AI Full-Stack Education Platform"
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

// 6. Health Checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduFlow AI API v1"));
}

app.UseCors("EduFlowCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
