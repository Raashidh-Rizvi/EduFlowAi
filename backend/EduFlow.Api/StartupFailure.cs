using System.Net.Sockets;
using Npgsql;

namespace EduFlow.Api;

/// <summary>
/// Fallback host used when normal startup throws: logs the exception and answers every request
/// with 503 and a non-secret description of what failed, so a misconfigured deployment can be
/// diagnosed from the browser instead of only from platform logs.
/// </summary>
public static class StartupFailure
{
    public static bool ShouldServe(Exception ex)
    {
        // The test host and EF tooling stop Program on purpose by throwing these.
        if (ex.GetType().Name is "HostAbortedException" or "StopTheHostException") return false;
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        return !string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase);
    }

    public static void Serve(string[] args, Exception ex)
    {
        var builder = WebApplication.CreateBuilder(args);
        var app = builder.Build();
        var reason = Describe(ex);
        app.Logger.LogCritical(ex, "EduFlow.Api failed to start: {Reason}", reason);
        app.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new { status = "startup_failed", reason });
        });
        app.Run();
    }

    public static string Describe(Exception ex)
    {
        for (var current = ex; current != null; current = current.InnerException)
        {
            switch (current)
            {
                case PostgresException pg when pg.SqlState == "28P01":
                    return "Database rejected the username/password in ConnectionStrings__DefaultConnection.";
                case PostgresException pg when pg.SqlState == "3D000":
                    return "The database named in ConnectionStrings__DefaultConnection does not exist.";
                case PostgresException pg:
                    return $"Database error during migration (SQLSTATE {pg.SqlState}).";
                case SocketException socket:
                    return $"Database host unreachable ({socket.SocketErrorCode}). Check the host/port in " +
                           "ConnectionStrings__DefaultConnection; Vercel has no IPv6, so use an IPv4/pooler host.";
                case TimeoutException:
                    return "Timed out connecting to the database in ConnectionStrings__DefaultConnection.";
                case NpgsqlException npgsql when npgsql.InnerException == null:
                    return "Could not connect to the database in ConnectionStrings__DefaultConnection.";
                case ArgumentException when current.StackTrace?.Contains("ConnectionString", StringComparison.Ordinal) == true:
                    return "ConnectionStrings__DefaultConnection is malformed.";
                case InvalidOperationException when current.Message.Contains("is not configured", StringComparison.Ordinal)
                                                 || current.Message.Contains("must contain", StringComparison.Ordinal):
                    // Our own config checks: the message names the missing key and no values.
                    return current.Message.Split(". Set it via", 2)[0].TrimEnd('.') + ".";
            }
        }
        return $"Startup failed ({ex.GetType().Name}). See the deployment's runtime logs.";
    }
}
