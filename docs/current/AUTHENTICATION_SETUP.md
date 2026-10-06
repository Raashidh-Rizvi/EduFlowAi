# Authentication local setup and verification

The existing React → ASP.NET Core → AuthService → EF Core/PostgreSQL flow handles authentication. Python is not involved. Public registration returns a token pair and creates an active Student only.

## Configuration

Run commands from the inner EduFlowAi repository containing backend and frontend.

The API uses User Secrets ID `eduflow-ai-api-1f6c2e4a-8b3d-4c7e-9a2f-3d6b1c8e5f90`. Development configuration precedence is appsettings.json → appsettings.Development.json → User Secrets → environment variables → command-line arguments. ConnectionStrings:DefaultConnection and JwtSettings:Secret have empty tracked defaults. Supply them using local User Secrets or environment variables; never commit them. The signing secret must have at least 32 UTF-8 bytes.

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<your PostgreSQL connection string>" --project backend/EduFlow.Api
dotnet user-secrets set "JwtSettings:Secret" "<your private signing key>" --project backend/EduFlow.Api
```

The Development admin is opt-in. `DemoAccounts:Enabled=true` ensures a new reserved Admin account for `Admin@gmail.com` using the supplied Development-only demo password (masked), with normalized email, IsActive=true, and BCrypt work factor 12. Public password policy rejects that weak password. Credentials are never bundled into frontend application code.

```powershell
dotnet user-secrets set "DemoAccounts:Enabled" "true" --project backend/EduFlow.Api
```

Normal startup never resets an existing password or reactivates a disabled account. For the reserved demo account only, explicit `DemoAccounts:ResetCredentials=true` resets the password, reactivates it, and revokes existing refresh records. Turn that flag off after use. An independently owned account at the same email is never modified or elevated. Resolve an email conflict deliberately; provisioning will not overwrite it.

Outside enabled Development mode, the account is never created or reset. A previously provisioned account matching BOTH its reserved ID and email is deactivated and its refresh tokens revoked. This prevents a weak credential created against a shared development database from becoming usable in Production. The existing DevelopmentDemo policy remains separate and continues protecting historical seeds. The new flag does not seed courses or other LMS content.

## Database migration

New migration `20261003090511_AuthenticationEmailIdentity` adds only a unique expression index on `lower("Email")`. It prevents case-variant accounts under concurrent inserts and supports the existing login lookup. Existing User/RefreshTokens tables, naming, historical migrations and data are retained. The model snapshot records refresh revocation as an EF concurrency token; no extra column is needed.

If legacy case-variant duplicates exist, index creation fails. Review and resolve identities through administration; the migration never deletes or merges users. Review all pending historical migrations before starting the API because startup automatically applies pending migrations.

Existing Team model/schema drift detected during generation was excluded from this authentication migration. It remains a separate pre-existing issue.

## Demo database recovered on this machine

The original service on 127.0.0.1:5432 remains unchanged and its supplied credential is still rejected. To meet the demo deadline without Administrator elevation or resetting existing data, a fresh isolated PostgreSQL 16 cluster was created in ignored `scratch/postgres-demo-data`, bound only to 127.0.0.1:5433. It uses SCRAM authentication and a random password kept in project User Secrets. The effective Development database is now `eduflow_main_local` on port 5433. All migrations were applied there; this is fresh demo data, not a copy of the unavailable original database. Windows security policies were unchanged.

After a machine restart, start this cluster before the application:

```powershell
./scripts/start-demo-database.ps1
npm run dev
```

The helper only starts the existing isolated cluster; it never initializes, resets or deletes data. The data directory is gitignored, so retain it locally and back it up if demo records need to persist.

## Start and verify

```powershell
npm run dev
```

The existing unified runner starts frontend at http://localhost:2174, backend at http://localhost:5204, and the independent AI service. Authentication can be tested without Python by starting `npm --prefix frontend run dev` and `dotnet run --project backend/EduFlow.Api --launch-profile http` separately. Backend startup fails if PostgreSQL authentication or migrations fail. A 200 /health response follows successful initialization.

## Focused checks

```powershell
dotnet build backend/EduFlow.slnx
dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj --filter "FullyQualifiedName~AuthSessionRbacTests|FullyQualifiedName~P0DemoAccountPolicyTests|FullyQualifiedName~DevelopmentAdminProvisioningTests|FullyQualifiedName~UserCourseManagementTests"
npm --prefix frontend run build
cd frontend
$env:P0_BROWSER_CHANNEL="msedge"
npx playwright test --config=playwright.p0.config.js
```

The P0 suite intercepts API responses and does not prove PostgreSQL-backed success. The separate real-service suite requires already-running frontend/backend and successful database initialization:

```powershell
# Set AUTH_ADMIN_EMAIL and AUTH_ADMIN_PASSWORD in this process using local demo credentials.
# These are test inputs only; never use frontend VITE environment variables for passwords.
npx playwright test --config=playwright.auth-live.config.js
```

The live suite creates one uniquely named Student account and retains it as verification data. It checks registration, logout/relogin, browser restoration, real refresh, frontend role denial, backend 403, revoked refresh rejection, and controlled Admin restoration/logout. Admin verification skips unless explicit credential environment variables are supplied. No auth requests are mocked.

## Session behavior and limits

New refresh credentials are random 64-byte values. The existing Token column stores a prefixed SHA-256 digest. Previously issued raw records remain accepted until expiry/revocation and rotate into hash storage. A stored hash cannot authenticate. Revocation concurrency permits only one rotation of a credential. Logout revokes renewal and immediately clears local tokens/user metadata. Existing access JWTs remain valid until expiry unless account status/role changes; no access-token blacklist was added.

At boot, a shared /auth/me request validates identity before protected portals render. Parallel 401 responses share one refresh, and each protected request retries at most once. Auth endpoint failures cannot invoke refresh recursively. Delayed refresh/profile responses cannot recreate a locally logged-out session. Cached user metadata does not establish identity.

Email syntax validation does not verify ownership. No email provider or fake verification flow was added. Existing localStorage bearer storage remains susceptible to credential theft through XSS; HttpOnly cookies would require a separate contract/design change.
