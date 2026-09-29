# Personal Details / Admin Profile — implementation specification

Specification only, based on repository inspection on 2026-09-29. Paths are relative to the inner EduFlowAi repository. This task creates only the four requested documents; it implements no source, database, migration, test or configuration changes and performs no commit/push.

Stage A owns visual/frontend work; Stage B owns persistence, authorization and business logic. Stage A must use the contracts below and show an explicit unavailable/error state until the backend is ready. No production mock records, fake successful saves or localStorage ticket persistence. Fixtures belong only in later automated tests.

## 1. Purpose

Show the CURRENT authenticated administrator's personal, account and system details. Deliver a read-only profile first using the existing identity API. Document which fields the model can edit and the exact existing update integration, without expanding authentication or adding an unsafe password form.

## 2. User roles involved

The new Admin profile tab is only for Admin. Existing Student/Instructor profile screens and shared account API permissions remain unchanged. This is not an account browser or a way to edit another user.

## 3. Existing reusable project components

- frontend/src/App.jsx supplies currentUser via AuthProvider; role selection gates the Admin console.
- context/AuthContext.jsx exposes useAuth().
- services/authService.js supplies getProfile(), restoreSession() and toUserProfile(); getProfile calls GET /api/auth/me and refreshes cached eduflow_user.
- services/api.js supplies JWT injection, refresh retry and friendly errors.
- backend/EduFlow.Api/Controllers/AuthController.cs already has GET me, GET users/{id:guid}, PUT users/{id:guid}.
- backend/EduFlow.Infrastructure/Services/AuthService.cs implements GetUserProfileAsync, GetUserByIdAsync and UpdateProfileAsync.
- backend/EduFlow.Core/DTOs/AuthDtos.cs defines UserProfileDto and UpdateProfileRequest.
- Avatar, SectionHeading, LoadingBlock and ErrorBanner in pages/Instructor/shared.jsx are reusable. Reuse existing purple cards, inputs, spacing and date typography without Instructor teaching-stat widgets.

## 4. Current architecture relevant to the feature

User in Entities.cs inherits BaseEntity (Id, CreatedAt, UpdatedAt), and has FullName, Email, PasswordHash, AvatarUrl, Role, IsActive plus domain relationships. Role is Admin/Instructor/Student. There is no separate AdminProfile entity, phone/address model or enrollment date for administrators.

UserProfileDto currently returns Id, FullName, Email, Role as string, AvatarUrl and IsActive. It does NOT return CreatedAt/UpdatedAt. toUserProfile normalizes id/userId and keeps those fields but drops any unrecognized date field. The cached currentUser is not proof of identity; /auth/me is authoritative for display.

PUT /auth/users/{id} currently allows own profile or Admin acting on any user, and accepts only FullName and AvatarUrl. UpdateProfileAsync replaces FullName, changes AvatarUrl only when non-null, sets UpdatedAt and returns UserProfileDto. It does not perform meaningful name validation in the inspected implementation.

No change-password/reset-password endpoint or service operation was found in the inspected authentication/controller/service sources. Existing login/registration hashing is not a password-change API. Do not build a password field or call an account-creation endpoint to change credentials.

Program.cs has JWT role validation but no per-request account status/role refresh. GET /auth/me reads the User row and returns status/role; it does not itself reject an inactive user. The Admin profile must check the returned role/status before displaying its Admin content.

## 5. Proposed frontend UI — Stage A

Add one Admin tab id admin-profile, label Personal Details. Using a distinct ID avoids Navbar's existing profile title “Instructor Profile.” Add it to the Admin Sidebar entries and visibility allowlist, App render branch and Navbar title map. An optional Navbar menu shortcut may navigate to this same tab via callback; do not create another profile page.

Three cards:
1. Personal Information: avatar/initials and Full name.
2. Account Information: email and role.
3. System Information: account ID (full UUID/copy button) and account status.

Read-only values, not disabled input boxes that imply editing. Show verified IsActive as Active/Suspended; never infer from being logged in. If profile returns non-Admin or inactive, hide Admin details and show an access/session-changed state, triggering established session revalidation.

Account creation date exists in the entity but is not available from the current profile DTO. In v1 omit the row (or show a clearly labeled “Not available from the current profile API”), never substitute login time, a fixed date, enrollment date, or browser time. Optional additive date integration is documented below.

Use responsive stacked cards, existing typography/colors, long-email/UUID wrapping, loading/error states and keyboard-accessible copy feedback. No XP, achievements, biography, public teaching statistics, system settings or role/status editing.

## 6. Proposed backend responsibilities

For the read-only delivery, reuse the existing GET /auth/me projection; no new controller, service, entity or authentication change is required.

Existing GET /auth/users/{id} is suitable for an account detail view elsewhere, but this page must use /auth/me so no selected user ID can accidentally drive the page. Do not load GET /admin/users just to obtain the current account's creation date.

Optional later enhancement: add CreatedAt to UserProfileDto and its three service projections (get self, get by ID, update), preserving existing fields and authorization. Carry createdAt through toUserProfile. This is an additive account-contract change that requires checking all consumers, including mobile deserialization, without modifying mobile behavior. It is not necessary for read-only v1 and must not be silently introduced by the frontend agent.

## 7. Proposed API endpoints

| Endpoint | Decision |
| --- | --- |
| GET /api/auth/me | Reuse as the only v1 profile source. No body. |
| GET /api/auth/users/{id:guid} | Existing; do not duplicate or use for selecting an Admin profile. |
| PUT /api/auth/users/{id:guid} | Existing update integration for a later validated self-name editor; not required/enabled in v1. |
| Change password | No suitable existing API found; do not add a weak substitute. |

No /admin/profile duplicate API and no new account table.

## 8. Request/response data contracts

Existing GET me / GET by ID / PUT response:
~~~text
{
  id: UUID string,
  fullName: string,
  email: string,
  role: "Admin" | "Instructor" | "Student",
  avatarUrl: string | null,
  isActive: boolean
}
~~~

authService normalizes this to include both id and userId. Use the raw server boolean for display; its existing normalization defaults missing isActive to true, so malformed profile payloads must not be accepted as verified status by this page. Stage B/frontend integration should validate required fields before normalization or expose a strict profile-read helper reusing the same endpoint. Do not alter global login behavior for this page.

Existing optional update request:
~~~json
{ "fullName": "Validated new display name", "avatarUrl": null }
~~~

With existing semantics, null avatarUrl preserves the current avatar; it does not delete it. No client email/role/status/id/password field belongs in this body. Update response is the same UserProfileDto. Optional future date extension adds createdAt as ISO-8601 UTC, never an enrollment date.

Existing API failures may use { message }, empty 401/403 bodies or generic errors; UI must tolerate all. GetProfile does not catch missing-user KeyNotFoundException in AuthController, so do not assume a clean 404 today. Record that gap; show a safe retry/session error instead of fabricated profile data.

## 9. Required database/entity changes

None. User already contains the necessary identity/status fields and creation timestamp. Do not introduce an AdminProfile table, duplicate identity fields or expose PasswordHash. Optional date serialization requires no migration.

## 10. Authorization/security rules

Require currentUser.role Admin for the new UI branch, then verify fresh /auth/me identity/role/status. The ID displayed must match the authenticated session response. Cancel/discard late requests when currentUser changes. Do not use query strings, static personas or edited localStorage as identity authority.

Backend /auth/me already uses NameIdentifier/uid from JWT. Keep existing ownership rules for shared profile APIs; read-only v1 does not expand them. Hide/deny Admin content if live role/status no longer qualifies. This UI check does not remediate all existing stale-token permissions; shared authentication is outside scope.

Never display/log password hashes, JWTs, refresh tokens, password reset tokens or secret configuration. Do not serialize full User entities. Existing avatar URL may be absent/broken; show initials. Do not add avatar upload, remote image proxying or editable arbitrary URL behavior here.

## 11. Validation rules and safely editable fields

| Field | Current model/API ability | Specification decision |
| --- | --- | --- |
| FullName | Existing PUT can update it. | Only proposed editable v1-adjacent field; keep read-only until server validation and state-refresh integration are implemented. |
| AvatarUrl | Existing PUT can set a non-null URL; null preserves. | Display existing value/initials; no editor or upload in this extension. |
| Email | Stored but no verified email-change flow in current profile API. | Read-only. |
| Role/IsActive | Existing Admin management operations. | Read-only here; preserve User Management workflow. |
| Id/CreatedAt/UpdatedAt | Server identity/metadata. | Read-only; dates only when actually provided. |
| Password | Stored hash, no change-password flow found. | Never expose/edit. |

If a later name editor is included, frontend and backend must trim and require 1..200 characters, allow normal Unicode names, reject blank/overlong input and overposting, and restrict this page's target to the current verified ID. Existing shared update lacks these checks; frontend-only validation is insufficient. Backend authorization must still enforce current active account/role for Admin-specific actions. Document this as a prerequisite integration change, not permission to redesign login/session logic.

## 12. Loading/error/empty states

Load fresh profile on opening and Refresh. Show skeleton cards; no invented “System Administrator” name. A missing profile is an error/session issue, not an empty successful account. Empty avatar uses initials; absent optional dates remain unavailable. Network error: Retry; avoid showing cached identity as freshly verified. 401 uses api.js session handling; non-Admin/inactive response hides content. Copy ID has immediate success/failure feedback without sending analytics.

For a later editor, disable save during request, retain draft on failure, and show success only after server confirmation. Current API has no concurrency token: explicitly accept last-write-wins for name-only editing or defer editing; do not claim conflict detection exists.

## 13. Integration points

App owns currentUser. AuthContext currently exposes login/logout/switch callbacks but no dedicated profile-refresh setter. Read-only v1 can keep page-local verified data. If editing is later enabled, add a narrowly scoped refreshCurrentUser callback in App/context that invokes the existing getProfile and updates parent state; merely updating localStorage will leave Navbar identity stale. Do not repurpose login callback because it navigates/reset tabs.

Use admin-profile everywhere. Keep existing Instructor profile section/profile API unchanged. Audit logging of profile edits would add protected activity references; follow AUDIT_LOGS.md's conflict policy rather than silently adding it.

## 14. Files likely to require modification later

Required: new frontend/src/pages/Admin/AdminProfile.jsx; App.jsx, components/layout/Sidebar.jsx and Navbar.jsx navigation hooks. A strict payload-check wrapper may be added in services/authService.js while reusing GET /auth/me. Existing AuthContext and auth service can otherwise stay unchanged for read-only v1.

Conditional, not required: App/AuthContext refresh callback and authService update method for a validated editor; backend/EduFlow.Core/DTOs/AuthDtos.cs and Infrastructure/Services/AuthService.cs for optional CreatedAt projection/validation. Such account-contract changes need explicit implementation scope review before extending protected authentication integrations.

Tests: backend/EduFlow.Tests/AdminProfileContractTests.cs as needed for additive contract work; frontend/e2e/admin-profile.spec.js.

## 15. Files/systems that must remain untouched

Keep ai-agent/**, Learning Agent/RAG, PDF indexing, quiz generation, gamification, mobile/**, Instructor academic workflows, Student learning workflows, existing Course Management and User Management behavior untouched. Shell edits are limited to the specified navigation/actions. Reuse authentication; document its integration gaps rather than redesign it. Future schema work must use new additive migrations, never rewrite existing migrations.

No AdminManagement refactor, InstructorProfile data changes, password/hash handling changes, registration/login/refresh redesign, mobile implementation changes or migrations.

## 16. Step-by-step implementation plan

1. Stage A constructs read-only three-card page and admin-profile navigation with existing components.
2. Bind to existing GET /auth/me, validating required shape before trusting defaults; separate loading/error/access-changed states.
3. Stage B confirms real authentication behavior, identity/status projection and no secret fields; no new backend is required for read-only scope.
4. Omit creation date unless additive DTO work is separately included and checked against existing consumers.
5. If name editing is explicitly included later, complete backend validation first, then PUT wrapper and parent-state refresh; keep all other fields read-only.
6. Run focused UI/contract UAT without touching existing portals or authentication behavior.

## 17. Manual UAT checklist

- [ ] Two different Admin accounts show their own values after login/switch; no static persona.
- [ ] Name, email, role, full ID and status match /auth/me.
- [ ] Creation date is not fabricated; no password field/hash/token is visible.
- [ ] Instructor/Student cannot enter the new Admin page.
- [ ] Stale role/inactive response removes Admin content; late responses do not overwrite another account.
- [ ] Missing/broken avatar shows initials; long names/emails wrap at narrow width.
- [ ] Loading, expired session and server outage are clear; existing Instructor profile remains unchanged.
- [ ] If optional editing is included, header updates after saved name and failed save preserves draft.

## 18. Automated tests to add

Playwright with real account reads: two Admin identities, role switch, reload, tab gating, server error and missing required-field rejection, no sensitive text, responsive rendering. Mock only isolated error cases. Existing UserCourseManagementTests already covers profile read/update and null-avatar preservation; reuse those regressions.

If optional backend changes occur, xUnit verifies additive DTO compatibility, safe projection, self/other authorization, name validation and no writes to email/role/status/password. No test or package change is performed in this documentation task.

## 19. Known risks/conflicts

CreatedAt exists in the database but not the current DTO; do not invent a date or fetch the entire user directory. AuthContext lacks a refresh setter; cache-only edits would leave stale Navbar text. Normalization defaults isActive to true, so strict response validation matters. No password-change API exists in inspected sources.

Read-only v1 is deliberately complete without authentication changes. Editable name/date exposure are documented extension points, not implied completed features. Runtime database/API behavior was not executed during inspection.

## 20. Definition of Done

Current verified Admin identity is shown accurately with safe fields, existing visual language, correct role gating and honest states; no secret, duplicate account API/table, fake dates or password form. Existing profile/auth/portal behavior remains intact. Any separately included name/date enhancement meets its validation, consumer-compatibility and parent-state refresh requirements.
