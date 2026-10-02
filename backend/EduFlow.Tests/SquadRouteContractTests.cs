using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using EduFlow.Api.Controllers;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduFlow.Tests;

/// <summary>
/// The squad (team) endpoints are reachable under two prefixes: the frontend
/// gamificationService calls /api/gamification/squads/* while the documented API
/// contract is /api/v1/gamification/squads/*. Only one of them existing used to
/// break the instructor Gamification console (Promise.all in Gamification.jsx
/// rejected on the 404s and showed "Unable to load gamification data").
/// These tests pin both prefixes so the routes can never drift apart again.
/// </summary>
public class SquadRouteContractTests
{
    private static async Task<WebApplication> StartApp()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Testing",
            ContentRootPath = Path.GetTempPath()
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:Secret"] = "squad-route-contract-test-secret-32-chars"
        });

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(Guid.NewGuid().ToString()));

        builder.Services.AddLmsDomainServices();
        builder.Services.AddScoped<ITeamService, TeamService>();

        builder.Services.AddAuthentication("SquadRouteContract")
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("SquadRouteContract", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddControllers().AddApplicationPart(typeof(TeamsController).Assembly);

        var app = builder.Build();
        app.UseDeveloperExceptionPage();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    private static HttpClient CreateClient(WebApplication app, string? role = null)
    {
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        var client = new HttpClient { BaseAddress = new Uri(addresses.Addresses.Single()) };
        if (role != null) client.DefaultRequestHeaders.Add("X-Test-Role", role);
        return client;
    }

    public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var role = Request.Headers["X-Test-Role"].ToString();
            if (string.IsNullOrEmpty(role)) return Task.FromResult(AuthenticateResult.NoResult());

            var identity = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
            }, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }

    public static TheoryData<string> FrontendSquadRoutes => new()
    {
        "/api/gamification/squads",
        "/api/gamification/squads/eligible-students",
        "/api/gamification/squads/leaderboard?top=10"
    };

    public static TheoryData<string> DocumentedSquadRoutes => new()
    {
        "/api/v1/gamification/squads",
        "/api/v1/gamification/squads/eligible-students",
        "/api/v1/gamification/squads/leaderboard?top=10"
    };

    [Theory]
    [MemberData(nameof(FrontendSquadRoutes))]
    public async Task Frontend_prefix_is_reachable(string route)
    {
        using var app = await StartApp();
        using var client = CreateClient(app, "Instructor");

        var response = await client.GetAsync(route);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(DocumentedSquadRoutes))]
    public async Task Documented_v1_prefix_is_reachable(string route)
    {
        using var app = await StartApp();
        using var client = CreateClient(app, "Instructor");

        var response = await client.GetAsync(route);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(FrontendSquadRoutes))]
    public async Task Missing_prefix_reports_unauthorized_not_not_found(string route)
    {
        // A 404 here means the route table lost the prefix; [Authorize] must be what
        // stops the caller instead.
        using var app = await StartApp();
        using var client = CreateClient(app);

        var response = await client.GetAsync(route);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
