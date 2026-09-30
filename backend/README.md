# EduFlow AI — Backend

ASP.NET Core public API, business services, EF Core/PostgreSQL and internal AI gateway. The API targets **.NET 8**; repository `global.json` selects SDK **10.0.401**. Follow actual project files and the [current setup guide](../docs/current/LOCAL_SETUP_GUIDE.md).

From repository root:

```powershell
dotnet restore backend/EduFlow.slnx
dotnet build backend/EduFlow.slnx
dotnet run --project backend/EduFlow.Api --launch-profile http
```

Default HTTP port: 5204. The root `npm run dev` already launches this service; do not start a duplicate. Database migrations/startup initialization can change data and are not health checks.

[Program.cs](EduFlow.Api/Program.cs), [controllers](EduFlow.Api/Controllers/), [services](EduFlow.Infrastructure/Services/), and [tests](EduFlow.Tests/) are implementation evidence. Learning gateway tests passed in the recorded run; Admin/User/Course Management and other business workflows are not certified complete by those tests.

[Authority](../docs/00_SOURCE_OF_TRUTH.md) · [Catalog](../docs/INDEX.md) · [Actual Learning API contracts](../docs/current/API_CONTRACTS.md) · [Current status](../docs/current/IMPLEMENTATION_STATUS.md)
