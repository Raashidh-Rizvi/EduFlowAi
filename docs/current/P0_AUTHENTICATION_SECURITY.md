# P0 authentication and user management

Public registration stays Student-only. Demo login controls and embedded frontend
credentials have been removed. Existing login/register/refresh responses and squad
API route prefixes are preserved. Explicit portal entries are available at
/console/admin, /console/instructor (Instructor or Admin), and /console/student.
The role-selected /console entry remains supported.

## Demo accounts and historical data

Historical migrations remain unchanged. They insert demo accounts in all
environments. After migrations and before serving requests, startup applies an
idempotent provisioning policy: outside explicitly enabled Development demos,
accounts matching BOTH known seed IDs and their reserved emails are deactivated
and their refresh tokens revoked. Users, hashes, courses, enrollments, submissions
and relationships are preserved. Policy failures prevent startup.

Both settings default to false:

- DevelopmentDemo:Enabled: opt into demo accounts/content in Development only.
- DevelopmentDemo:ResetCredentials: additionally opt into resetting existing
  demo credentials and reactivating the primary demo accounts. This is ignored
  unless Development demo provisioning is enabled. Do not leave it enabled.

Environment equivalents use double underscores. A production environment can
never enable demo provisioning even if these flags are supplied. Ordinary startup
does not reset credentials or reactivate disabled demo accounts. Already-issued
JWTs check the account's current activation and role on every authenticated
request. Refresh rejects inactive users.

Before deployment, inventory the known demo IDs/emails. Accounts whose IDs/emails
were changed cannot safely be identified automatically and need an administrator
to investigate and disable/revoke them. Provision a separate real administrator
through the established controlled administration process before retiring demo
administrator access. Never make public registration create privileged users.
No historical migration changes, destructive cleanup, DB reset or blind deletion
is needed. Deployment startup applies the policy; this patch does not require
manually applying a new EF migration.

## Authorization decisions

AI topology, tool registry and observability are Admin-only. Squad lookup is
Student self-access or Instructor/Admin; all-squad and eligible-student lists
are staff-only. Student squad creation/joining is Student-only. Student enrollment,
unenrollment, own course/request lists, lesson completion, challenge submission,
reward claim, streak freeze, focus session and student recommendation operations
require Student. Shared course-content/progress/grade reads retain their existing
enrollment/ownership checks. Public catalog/leaderboards and quiz architecture
are unchanged.

## Verification

Backend tests use isolated EF in-memory databases and real JWT middleware.
Frontend tests use a separate Vite port and intercepted API responses, requiring
no live PostgreSQL, AI service or demo accounts:

    dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj --filter "FullyQualifiedName~AuthSessionRbacTests|FullyQualifiedName~P0DemoAccountPolicyTests"
    cd frontend
    npx playwright test --config=playwright.p0.config.js

If bundled Chromium is unavailable, use an installed browser with
P0_BROWSER_CHANNEL=msedge (or chrome) when running the same command.

The focused authentication suite replaces the old demo-login tests. Other legacy
end-to-end suites assume automatic demo logins. They need an explicitly
provisioned isolated demo environment or a later fixture migration; the P0 suite
verifies normal production-facing UI behavior independently.

## Implementation verification results

- Backend targeted tests: 34 passed, 0 failed, 0 skipped.
- Frontend authentication tests: 20 passed using installed Microsoft Edge.
- Backend solution build: succeeded.
- Frontend production build: succeeded; existing bundle-size warning remains.
- Production frontend/source scan: no demo account/password literals found.
- Whitespace check: passed.
- No commits, pushes, stash application, database reset, historical migration
  edits, Learning Agent/RAG/ChromaDB or quiz architecture changes.

Validation uses isolated in-memory backend data and mocked browser API responses;
live PostgreSQL provisioning is not exercised by these suites. Existing backend
nullable/analyzer warnings observed during compilation are outside this change.
Tracked configuration secrets and legacy demo-dependent suites outside focused
authentication tests remain separate follow-up concerns.

## Files changed

- backend/EduFlow.Api/Controllers/AiReviewController.cs
- backend/EduFlow.Api/Controllers/AiStudentController.cs
- backend/EduFlow.Api/Controllers/ChallengesController.cs
- backend/EduFlow.Api/Controllers/CoursesController.cs
- backend/EduFlow.Api/Controllers/GamificationController.cs
- backend/EduFlow.Api/Controllers/TeamsController.cs
- backend/EduFlow.Api/Program.cs
- backend/EduFlow.Api/Security/AccountTokenValidation.cs
- backend/EduFlow.Infrastructure/Data/DbInitializer.cs
- backend/EduFlow.Infrastructure/Services/AuthService.cs
- backend/EduFlow.Tests/AuthSessionRbacTests.cs
- backend/EduFlow.Tests/P0AuthenticationTests.cs
- docs/current/P0_AUTHENTICATION_SECURITY.md
- frontend/e2e/02-auth.spec.js
- frontend/playwright.p0.config.js
- frontend/src/App.jsx
- frontend/src/components/common/ProtectedRoute.jsx
- frontend/src/components/common/RoleSwitcher.jsx
- frontend/src/components/layout/Navbar.jsx
- frontend/src/components/layout/NavbarV2.jsx
- frontend/src/pages/AiReview/AiReview.jsx
- frontend/src/pages/Auth/Login.jsx
- frontend/src/pages/Gamification/Gamification.jsx
- frontend/src/pages/Student/StudentPortal.jsx
- frontend/src/services/api.js
- frontend/src/services/authErrors.js
- frontend/src/services/authService.js
- frontend/src/services/gamificationService.js
