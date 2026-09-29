# Admin audit hardening — implementation and verification

Date: 2026-09-30. This report supersedes the staged coverage description in AUDIT_LOGS.md for the integrations listed below. Changes remain local and uncommitted. Final runtime verification is limited by Windows Code Integrity, not a diagnosed application assertion failure.

## 1. Coverage before and after

Before: four SupportTicket events only. After: fifteen allowlisted event types across SupportTicket, Course, Enrollment and User. No historical backfill, UI activity logging, general GET logging or second audit table.

## 2. Exact newly captured events

| Event | Existing operation | Safe metadata |
| --- | --- | --- |
| Course.Created | CoursesController.CreateCourse, Admin or Instructor | None |
| Course.Updated | CoursesController.UpdateCourse, only changed persisted business fields | changedFields: approved field names only, never values |
| Course.Published | CoursesController.PublishCourse, false to true | None |
| Course.Unpublished | CoursesController.PublishCourse, true to false | None |
| Course.Deleted | CoursesController.DeleteCourse | None |
| Enrollment.Approved | InstructorController.ApproveEnrollmentRequest, Admin or owning Instructor | courseId, studentId |
| Enrollment.Rejected | InstructorController.RejectEnrollmentRequest, including decline alias | courseId, studentId |
| Enrollment.Added | CoursesController.AddStudentToCourse, new or reactivated enrollment | courseId, studentId |
| Enrollment.Dropped | Admin/Instructor removal or Student withdrawal of active/completed enrollment | courseId, studentId |
| Enrollment.Cancelled | Student withdrawal of a pending request | courseId, studentId |
| User.Deleted | AdminController.DeleteUser, after every existing eligibility check | None |

Retained unchanged integrations: SupportTicket.Created, SupportTicket.Replied, SupportTicket.StatusChanged, SupportTicket.Resolved. The existing safe actor UUID/role envelope remains in use. Actor identity is taken from server authentication claims, never a request actor ID. Support service continues to resolve its caller against the database.

## 3. Explicit deferrals and absent operations

| Event/area | Exact reason |
| --- | --- |
| User.Created, User.RoleChanged, User.StatusChanged | A canonical user EntityId causes the unchanged scalar audit-subject guard to reject deletion of an otherwise unused account. These hooks cannot be added while preserving that behavior without a reviewed retention/deletion redesign. No IDs were obscured or moved to evade the guard. |
| Successful login, token refresh, server logout | These operations exist, but adding ActorId or a user target audit reference also makes an otherwise unused account undeletable. The existing PostgreSQL regression explicitly logs in before deleting the account, and refresh tokens are intentionally auxiliary. The new focused test covers creation, role/status changes, login, refresh and logout before deletion. |
| Failed login | A supplied email does not authenticate the caller. Assigning the attempted account as actor would falsely attribute the attempt and create a deletion-denial opportunity. A target reference would still change deletion eligibility. Unknown accounts cannot safely be attributed. |
| Profile changes | The Admin Personal Details page remains read-only. A shared mutable profile API exists, but auditing its user target has the same deletion-reference conflict. No new profile operation was invented. |
| Password change | No implemented password-change/reset operation was found in current backend controllers, services or interfaces. |
| AI/RAG, gamification and other academic actions | No isolated additional hook was selected; these protected subsystems were left unchanged. This work does not claim exhaustive platform coverage. |

## 4. Exact files changed by this task

Paths are relative to the inner EduFlowAi repository. Existing uncommitted files listed here were edited in place, not replaced with repository HEAD versions.

| File | Change |
| --- | --- |
| backend/EduFlow.Core/Interfaces/AuditEventRegistry.cs | New shared enabled-action and safe-metadata registry |
| backend/EduFlow.Infrastructure/Services/AuditLogWriter.cs | Registry enforcement; actor/resource UUID checks; key/value allowlist |
| backend/EduFlow.Infrastructure/Services/AdminAuditLogService.cs | Use shared metadata registry and bounded safe value projection |
| backend/EduFlow.Api/Controllers/GovernanceAudit.cs | New claims-derived audit hook helpers |
| backend/EduFlow.Api/Controllers/AdminController.cs | User.Deleted hook after eligibility checks |
| backend/EduFlow.Api/Controllers/CoursesController.cs | Course/roster/withdrawal hooks and no-op suppression |
| backend/EduFlow.Api/Controllers/InstructorController.cs | Decision hooks; stable retry staging and transactional status recheck |
| backend/EduFlow.Api/Controllers/AdminAuditLogsController.cs | Authorized options endpoint and no-store responses |
| frontend/src/services/adminAuditService.js | Fetch server-supported filter options |
| frontend/src/pages/Admin/AuditLogs.jsx | Dynamic action/resource options and accurate coverage notice |
| backend/EduFlow.Tests/AdminAuditLogTests.cs | Options/detail authorization and expanded filtering HTTP tests |
| backend/EduFlow.Tests/GovernanceAuditIntegrationTests.cs | New functional, privacy, deletion and opt-in PostgreSQL tests |
| docs/members/member-1-wazni/software/AUDIT_HARDENING.md | This report |

No migration, entity, DbContext, authentication, support service, AI telemetry endpoint, or unrelated UI source was changed by this task. Existing user changes in those areas remain present.

## 5. Deletion semantics

All foreign-key enumeration, default-deny reference checks, auxiliary exceptions, scalar subject normalization, self-deletion and last-active-Admin protections remain unchanged. User.Deleted is staged only after eligibility checks and committed in the same deletion transaction. Its target UUID remains readable after removal. An Admin who performs a deletion has genuine audited business activity, subject to the existing actor-reference protection.

The first full regression run after adding the hooks passed all 472 existing runnable tests, including deletion regressions (one existing opt-in PostgreSQL test skipped). Final new deletion tests could not load the API under Code Integrity; full final regression proof is therefore pending. Do not interpret source review as a replacement for the blocked tests.

## 6. Backend/API and transaction behavior

Existing IAuditLogWriter, AuditLogWriter and AuditLog table are retained. Writer does not call SaveChanges. All new hooks enqueue the event before the existing business save. UTC timestamps, canonical UUIDs, matching action/resource categories, recognized roles, a 2048-character serialized envelope limit and per-key semantic value allowlists are enforced. Course updates record field names, not titles/descriptions/content. Enrollment notes, support bodies/replies, credentials and token values are excluded.

The existing GET /api/admin/audit-logs and GET /api/admin/audit-logs/{id} remain the governance APIs. New GET /api/admin/audit-logs/options returns actions and resourceTypes from the same enabled registry. It applies the same current-active-Admin database check and role authorization. All governance reads now have no-store response caching. The existing GET /api/analytics/audit-logs AI trace endpoint was not edited, renamed or repurposed by this task.

Sequential no-op course updates/publication calls, already-active roster additions and repeated drops/cancellations add no success event. Enrollment decision rows, notification and audit are staged once outside the retry callback; SaveChanges(false) preserves states across rollback. A stable audit UUID verifies an uncertain commit before replay. A serializable transaction rechecks Pending before saving, preventing two concurrent decisions from both succeeding. Added PostgreSQL tests cover rollback, transient retry, lost commit acknowledgement and concurrent decisions, but the controller-dependent tests are blocked by the environment.

## 7. Frontend

Action and Resource Type selectors load options from the server registry instead of listing only SupportTicket constants. Failure to fetch options is explicitly shown; reloading retries. Existing search, date boundaries, pagination, detail display and layout remain in place. The coverage note names enabled categories and the account/auth deferral. No UI redesign was performed.

## 8. Build results

- dotnet build EduFlow.slnx --nologo: passed; 0 errors, 15 existing warnings in the final rebuilt test project.
- npm run build: passed; Vite reports the existing large-bundle warning (over 500 kB).
- git diff --check: passed. Git also prints informational LF/CRLF normalization warnings for three edited controllers.

## 9. Test results

The complete final suite was attempted after the single authorized generated-output remediation and normal rebuild. It included Audit, Support, Auth, User/Course Management, Enrollment and the new disposable PostgreSQL tests.

| Suite | Passed | Environment-blocked | Skipped |
| --- | ---: | ---: | ---: |
| Complete backend suite | 241 | 255 | 1 |
| AdminAuditLogTests | 3 | 22 | 0 |
| GovernanceAuditIntegrationTests | 5 | 15 | 0 |
| SupportDeskTests | 0 | 19 | 0 |
| AuthSessionRbacTests | 0 | 14 | 0 |
| UserCourseManagementTests | 23 | 66 | 1 |
| EnrollmentLifecycleTests | 0 | 23 | 0 |

The TRX runner labels blocked cases Failed, but every one of the 255 final non-passing cases contains the same 0x800711C7 assembly-load error. There are no separately observed application assertion failures in that final run. This does not establish that the blocked assertions would pass.

Passed real PostgreSQL verification: support ticket creation, exact creation replay without duplicate event, Admin reply+resolution, expected three support events, and absence of private message/reply text. Writer rejection tests also pass on PostgreSQL. Four new transaction/concurrency controller tests and the new deletion scenario remain unverified because the API assembly cannot load.

The disposable instance was initialized only under the outer workspace Temp/audit-hardening-pg, listened on 127.0.0.1:55439, and was stopped after testing. No live database or existing application data was edited, migrated or deleted. Test-created databases remain within that stopped temporary cluster.

Evidence is preserved outside the inner git repository under ../Temp/audit-hardening-verification/: audit-build.log, audit-frontend-build.log, audit-final-tests.log, audit-final.trx, audit-postgres.log, audit-postgres.trx, earlier test logs, and test-summary.json.

## 10. Runtime environment limitation

Final command, from backend (environment variable set only for the disposable cluster):

~~~powershell
$env:EDUFLOW_AUDIT_TEST_POSTGRES = 'Host=127.0.0.1;Port=55439;Username=audit_test;Database=eduflow_audit_regression'
dotnet test EduFlow.slnx --no-build --nologo --logger 'trx;LogFileName=audit-final.trx'
~~~

Exact error:

~~~text
System.IO.FileLoadException: Could not load file or assembly
'.../backend/EduFlow.Tests/bin/Debug/net8.0/EduFlow.Api.dll'.
An Application Control policy has blocked this file. (0x800711C7)
~~~

Windows Code Integrity event 3077 confirms a signing-level/policy block. No active testhost was found. No Zone.Identifier unblock operation was needed. Only generated EduFlow.Tests/bin and EduFlow.Tests/obj were removed after their absolute paths were verified; projects were rebuilt normally and the single user-authorized retry was attempted. No Smart App Control, Code Integrity, Defender, Group Policy, administrator policy or other security setting was modified or bypassed. Further blocked runtime retries were stopped as requested.

## 11. Final git state

Branch remains main, reported by git as ahead of origin/main by one existing commit; no commit was created by this task. There are 18 modified tracked files, 31 untracked entries and no staged changes. Prior tracked and untracked work is preserved; this task adds three tracked-controller modifications and four new source/report files, and edits existing untracked audit/frontend/test files. Full final git status is saved alongside the verification evidence. Nothing is staged or committed by this task. Generated verification logs were moved to the outer workspace Temp directory so they do not appear as new repository source files.

## 12. Git and scope confirmation

No commit, push, reset, revert, git clean, stash, checkout, rebase, merge or pull was performed. No live database operation or migration was required. The final changes remain in the local working tree. Implementation and static/build checks are complete within the documented deferrals; final controller/runtime verification remains environment-blocked.
