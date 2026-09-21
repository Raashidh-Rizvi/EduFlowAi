# EduFlow AI — Backend

The ASP.NET Core public API connects authenticated clients to PostgreSQL and the internal AI service. The API project targets .NET 10. Authorization, migrations, reward integrity and workflow execution remain PARTIAL; see [implementation status](../docs/project/17_IMPLEMENTATION_STATUS.md).

## Local commands

Run from the repository root with a compatible .NET 10 SDK and the required PostgreSQL/service configuration. Review the [whole-system run guide](../docs/project/18_RUN_AND_SETUP.md) first; startup initialization can affect demo data.

~~~powershell
dotnet restore backend/EduFlow.slnx
dotnet build backend/EduFlow.slnx
dotnet test backend/EduFlow.slnx
dotnet run --project backend/EduFlow.Api --launch-profile http
~~~

The checked-in HTTP launch profile uses localhost:5204. Runtime binding can be overridden; use the server's actual startup output. These are commands to run, not recorded successful results.

## Key entry points

- [API startup](EduFlow.Api/Program.cs)
- [Controllers](EduFlow.Api/Controllers/)
- [Domain entities](EduFlow.Core/Entities/Entities.cs) and [interfaces](EduFlow.Core/Interfaces/)
- [ApplicationDbContext](EduFlow.Infrastructure/Data/ApplicationDbContext.cs)
- [Services](EduFlow.Infrastructure/Services/)
- [Tests](EduFlow.Tests/)

Program.cs, identity contracts, DbContext, migrations and AI gateway are shared infrastructure. Method-level ownership comes from the matrix; runtime Admin permission does not transfer academic authorship.

## Canonical documentation

[Start here](../docs/README.md) · [Responsibility matrix](../docs/responsibilities/RESPONSIBILITY_MATRIX.md) · [Architecture](../docs/project/03_ARCHITECTURE.md) · [Database](../docs/project/05_DATABASE_SCHEMA.md) · [API contracts](../docs/project/06_API_CONTRACTS.md) · [Security](../docs/project/07_SECURITY_AND_PRIVACY.md) · [Integration](../docs/project/08_COMPONENT_INTEGRATION.md)
