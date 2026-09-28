# User Management

Owner: Wazni / IT24103352. [Current allocation](../../../current/RESPONSIBILITY_MATRIX.md).

**Status: Phase 2 Add User and Phase 2.5 guarded Delete implemented; automated verification passed in Release configuration. Manual UAT pending.**

## Verified flow and changes

- Previously, Add User displayed a placeholder alert. Public registration accepted caller-selected privileged roles; AdminController had no create-user endpoint.
- Admin User Management now opens a modal for full name, email, password, and Student/Instructor/Admin role. Cancel resets the form; creation shows loading, validation/backend errors, and success feedback.
- `POST /api/admin/users` requires authenticated Admin authorization. It saves through the existing AuthService/EF Core model and returns user details without passwords, hashes, or login tokens. The Admin session stays intact.
- The saved user is inserted immediately into the directory; search and role filters reset so the new account is visible. Listing, role changes, and suspend/reactivate remain unchanged.
- `POST /api/auth/register` defaults to Student and rejects any other role. Existing login behavior is retained.
- Shared creation validation requires a nonblank name (maximum 200 characters), valid email (maximum 254 characters), password of at least 8 characters and at most 72 UTF-8 bytes, and an allowed role. Email is trimmed/lowercased; duplicate email is rejected, including the existing PostgreSQL unique-index conflict.
- Password hashing retains BCrypt with work factor 12. API console logging no longer prints credential-bearing request/response/error objects.
- Student creation reuses the existing XP/streak initialization unchanged. No entity/schema changes or migrations were needed.
- Phase 1 remains intact: Directory only, hidden telemetry/policy tabs, no visible XP column. Sidebar and Instructor behavior are preserved.

## Phase 2.5: guarded permanent deletion

- Added Admin-authorized `DELETE /api/admin/users/{id}`: 204 after deletion, 404 for an unknown user, 401/403 for invalid identity or insufficient authorization, and 409 for guarded conflicts. No credentials are returned.
- Self-deletion is rejected using the authenticated user ID. An active Admin cannot be deleted when no other active Admin exists; inactive Admins do not count as replacements.
- The current model includes cascade deletion of academic/history records and SetNull behavior for approval, report, and audit references. The guard checks every EF foreign key pointing to User, including shadow keys, regardless of its delete behavior.
- Protected references include instructed courses, enrollments, submissions, lesson completions, XP transactions, badges, streak history, skill mastery, personal bests, daily missions, challenges, team membership/leadership, study-plan ownership/approval, notifications, announcements, reports, and audit actors.
- Additional checks protect scalar assessment `CreatedBy` and audit `EntityId` references that are not User foreign keys.
- Refresh tokens may be removed. Student XP/streak records are allowed only when absent or still at the creation baseline: XP 0, level 1, coins 50; current/longest streak 0, freeze tokens 2, no last activity date. Changed values block deletion.
- Meaningful dependencies return: “This user has existing platform activity and cannot be permanently deleted. Suspend the account instead.”
- Guard checks and deletion run in one PostgreSQL transaction with table locks on User-linked tables and scalar-reference tables. These briefly block writes so concurrent activity or Admin changes cannot bypass the checks. Database failures roll back; EF delete mappings and migrations are unchanged.
- A small Delete action opens a confirmation naming the account and warning that deletion cannot be undone. Cancel receives initial focus. Own-account Delete is disabled; duplicate submissions/cancellation are blocked while deletion runs.
- Success removes the row and updates directory counts immediately. Errors, including the backend conflict message, remain in the dialog without removing the user. Existing Add User, role, search/filter, and Suspend/Activate behavior is preserved.

## Automated verification

- Frontend: `npm run build` passed with the Vite chunk-size warning.
- The requested default backend build was blocked by the running EduFlow.Api process locking Debug assemblies. The process was left running.
- `dotnet build backend/EduFlow.slnx --configuration Release` passed (20 warnings in unchanged code, zero errors).
- `dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj --filter UserCourseManagementTests --configuration Release` passed: 84 tests, zero failures (42 existing cases and 42 new guarded-delete cases).
- Phase 2 cases cover all three Admin-created roles, persisted user details, existing Student record initialization, duplicate email, invalid fields, 401/403 authorization, public privilege-escalation rejection, default Student registration, login, BCrypt hashing, and credential-free creation responses.
- Phase 2.5 cases cover unused Student/Instructor/Admin deletion and auxiliary cleanup, every mapped business-reference guard, scalar author/audit subjects, changed Student profiles, self/last-active-Admin protection, 401/403/404 handling, and Suspend/Activate regression.
- HTTP tests exercise real controllers and authorization middleware with test authentication and isolated EF InMemory databases; they do not verify production JWT configuration, PostgreSQL locking/concurrency, or database cascade behavior.

## Manual UAT still required

- Verify Delete confirmation, Cancel/Escape, self-delete disable, loading, successful row/count removal, and 409 feedback with Suspend guidance in the browser.
- On a test PostgreSQL database, verify unused-account deletion and auxiliary cleanup, protected-history retention, and concurrent deletion/activity/Admin changes. Confirm lock permissions and acceptable response times.

- Restart the API with the updated code, then use a real Admin login to create each role and confirm the Admin session remains active.
- Check modal styling, keyboard focus/Escape/Cancel, errors, loading, duplicate submission prevention, success, and immediate directory visibility.
- Verify accounts survive reload and API restart against the configured database; verify concurrent duplicate-email handling on PostgreSQL.
- Verify created-account login, public Student registration, privileged-registration rejection, search/filter, role changes, and suspend/reactivate in the running application.

Learning Agent/RAG, ai-agent, mobile, Course Management, quizzes, gamification logic, Instructor AI approvals, Communications Hub, and Admin Overview were not changed. No manual UAT completion is claimed.
