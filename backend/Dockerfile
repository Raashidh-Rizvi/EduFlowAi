# EduFlow.Api - ASP.NET Core 8 backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first so the package layer is cached between code changes
COPY Directory.Build.props ./
COPY EduFlow.Core/EduFlow.Core.csproj EduFlow.Core/
COPY EduFlow.Infrastructure/EduFlow.Infrastructure.csproj EduFlow.Infrastructure/
COPY EduFlow.Api/EduFlow.Api.csproj EduFlow.Api/
RUN dotnet restore EduFlow.Api/EduFlow.Api.csproj

COPY EduFlow.Core/ EduFlow.Core/
COPY EduFlow.Infrastructure/ EduFlow.Infrastructure/
COPY EduFlow.Api/ EduFlow.Api/
RUN dotnet publish EduFlow.Api/EduFlow.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .
RUN mkdir -p /app/wwwroot/uploads

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://localhost:${PORT:-8080}/health || exit 1
# Listens on $PORT when set (Vercel container runtime), else 8080 (docker-compose)
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} exec dotnet EduFlow.Api.dll"]
