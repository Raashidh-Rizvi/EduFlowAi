# Audit Logs — implementation specification

Specification only, based on repository inspection on 2026-09-29. Paths are relative to the inner EduFlowAi repository. This task creates only the four requested documents; it implements no source, database, migration, test or configuration changes and performs no commit/push.

Stage A owns visual/frontend work; Stage B owns persistence, authorization and business logic. Stage A must use the contracts below and show an explicit unavailable/error state until the backend is ready. No production mock records, fake successful saves or localStorage ticket persistence. Fixtures belong only in later automated tests.

## 1. Purpose

Provide an Admin-only, searchable view of persisted administrator/support action history. Reuse the existing AuditLog entity and add the smallest explicit writer/read API needed. Do not confuse AI traces, diagnostic console logs or fake recent activity with a governance audit trail.

## 2. User roles involved

Admin may read/filter logs; authenticated business operations write audit rows internally with their real actor. Students/Instructors cannot query governance logs or post audit events. Support ticket creation can record a Student/Instructor actor, but that does not grant audit-read access. No browser role may edit/delete log rows through this feature.

## 3. Existing reusable project components

backend/EduFlow.Core/Entities/Entities.cs: AuditLog : BaseEntity.
backend/EduFlow.Infrastructure/Data/ApplicationDbContext.cs: AuditLogs DbSet and Actor relationship.
backend/EduFlow.Infrastructure/Data/Migrations/20260825191012_InitialCreate.cs: AuditLogs table and ActorId FK already defined.
backend/EduFlow.Api/Controllers/AdminController.cs: existing Admin role authorization and user-deletion guard referencing AuditLog.
frontend App/Sidebar/Navbar Admin shell, services/api.js, Instructor shared loading/error/empty/date components, current theme/cards/badges/dialog patterns.

Reuse schema and DbContext rather than introduce ActivityLog/EventLedger tables.

## 4. Current architecture and search findings

Inspected backend controller/Core/Infrastructure service sources for AuditLogs, new AuditLog, support and related references; inspected DbContext, initial migration, DbInitializer, MarketplaceSeedData and DomainEvents. Findings:
- AuditLog has nullable ActorId/Actor, Action, EntityType, EntityId, Details and IpAddress, plus Id/CreatedAt/UpdatedAt inherited from BaseEntity.
- Actor relationship is Users FK with DeleteBehavior.SetNull.
- Initial migration already creates AuditLogs. Live deployment/table contents were not checked.
- No runtime AuditLog insertion service/call site or audit seed records were found in these sources. The schema exists, but meaningful governance capture is not currently established.
- AdminController.DeleteUser reads AuditLogs while enforcing protected activity. This is a guard, not an event writer.
- GET /api/analytics/audit-logs?limit=50 in AnalyticsController returns AiWorkflowLogs (workflowId, agentName, executionTimeMs, validationPassed/errors, createdAt), authorized Instructor/Admin. It does not query AuditLogs.
- insightsService.getAuditLogs() wraps that AI-trace endpoint. Leave both unchanged.
- /analytics/recent-activity returns hardcoded activity; not an audit source.
- ILogger diagnostics and domain-event definitions are not proof of persisted governance events.

Consequently, proposed baseline coverage is new SupportTicket events plus any legitimate pre-existing AuditLogs rows; no historic reconstruction or fabricated backfill.

## 5. Proposed frontend UI — Stage A

Add Admin tab id audit-logs, label Audit Logs, to App render branch, Sidebar entry/allowlist and Navbar title. Keep existing Communications and other tabs.

Read-only page with title, honest coverage note (“Recorded actions from enabled audit integrations; earlier actions may be absent”), Refresh, search, Action, Resource type, optional Actor ID and From/To date inputs. Do not imply all platform activity is captured.

Table: time (local with UTC tooltip), actor name/ID, action label, resource type/ID and View details. Stable newest-first pagination; default page size 20. Narrow screens can use stacked rows or contained scrolling.

Detail dialog: full event ID, UTC timestamp, actor identifier/current display name (or unavailable actor), action, target and safe metadata key/value rows. Escape text; do not render arbitrary HTML or raw JSON from legacy Details. No edit, delete, export, replay, rollback or “undo” action. A resource ID remains readable when the resource no longer exists; do not require a successful target join.

Use existing purple cards, type scale, form controls and native dialog behavior. Filters have visible labels and reset; skeleton/error/empty states match existing portals. Do not use AI badges/trace visualizations to imply governance coverage.

## 6. Proposed backend responsibilities and event coverage

Introduce a small IAuditLogWriter/AuditLogWriter that only adds validated AuditLog entities to the caller's existing DbContext. It must NOT call SaveChanges independently, create a second context/connection, or catch a failed audit save and silently report success. The business operation commits the event and mutation together.

Server supplies actor, event time, action/resource and allowlisted metadata; the browser does not submit audit payloads. Use typed methods or a registry, not arbitrary request-body serialization. No generic SaveChanges interceptor over the entire domain: it risks logging passwords, changes protected behavior and cannot reliably express actor/business intent.

### Event registry and staged capture scope

| Event | Source / safe metadata | Delivery decision |
| --- | --- | --- |
| SupportTicket.Created | Support create; type and newStatus Open | Required with Support Desk. |
| SupportTicket.Replied | Support update; responseId and unchanged/changed status | Required; no reply body. |
| SupportTicket.StatusChanged | Open → InProgress; oldStatus/newStatus | Required. |
| SupportTicket.Resolved | Open/InProgress → Resolved; oldStatus/newStatus | Required; replaces generic StatusChanged for resolution. |
| User.Created | AdminController.CreateUser / AuthService.CreateUserAsync; newRole | Documented candidate; deferred due to deletion-guard conflict below. |
| User.RoleChanged | AdminController.ChangeUserRole; oldRole/newRole | Deferred protected User Management integration. |
| User.StatusChanged | AdminController.ToggleUserStatus; oldIsActive/newIsActive | Deferred protected User Management integration. |
| User.Deleted | AdminController.DeleteUser; resource ID only | Deferred; requires reviewed transaction placement and regression tests. |
| Course.Created/Updated/PublicationChanged/Deleted | Existing CoursesController Admin actions; changed field names or IsPublished before/after | Deferred; Course Management behavior is protected. |
| Enrollment.Approved/Rejected/Added/Dropped | InstructorController approval/rejection and CoursesController roster mutations, only when actor is Admin | Deferred protected integration; no academic workflow expansion. |
| Admin.ProfileUpdated | Existing shared profile update, safe changed field names | Not part of read-only ADMIN_PROFILE.md v1. |

Required support events count as meaningful initial audit coverage; do not advertise deferred categories as already recorded. New reply+resolve produces Replied and Resolved events in one transaction; status-only progress produces one StatusChanged; ticket creation one Created. Failed requests, idempotent replay and no-op updates must not generate successful-action events. Operational errors remain ILogger diagnostics, not fabricated successful audits.

### Protected-behavior conflict: User deletion

DeleteUser enumerates all User foreign keys and rejects non-auxiliary references; AuditLog.ActorId is one such reference. It separately rejects a user if any AuditLog.EntityId normalizes to that user's UUID. Existing tests explicitly cover audit-subject references and deletion of a newly created unused account.

Logging User.Created with EntityId = new user's ID would make a just-created unused account undeletable, breaking existing behavior/tests. Therefore baseline MUST NOT enable user creation/status/role/profile instrumentation or silently weaken/reformat references to bypass this guard. Do not change EntityId formats or hide target IDs in metadata to evade deletion protections.

Resolving wider audit coverage needs a separately reviewed decision about deletion retention/semantics and protected-area scope. Record this blocker, continue with safe read API/support capture, and leave the current guard unchanged. For a future approved deletion audit, write only after eligibility checks/removal is staged, within the same existing retryable transaction, never before guard checks or after commit in an unrelated save. Preserve current deletion guarantees and review actor-reference implications too.

New support FKs/audit references reflect real support activity and correctly fall under the existing guard; they must not be exempted.

## 7. Proposed API endpoints

New AdminAuditLogsController with explicit api/admin/audit-logs route and [Authorize(Roles = "Admin")] is appropriate; this avoids editing protected User Management handlers.

| Endpoint | Result |
| --- | --- |
| GET /api/admin/audit-logs | Paginated safe AuditLogSummary records. |
| GET /api/admin/audit-logs/{id:guid} | Safe AuditLogDetail or 404. |

This is not a duplicate of /analytics/audit-logs: that route serves different AI trace entities and permissions and remains unchanged. No public POST/PUT/DELETE audit endpoint.

List filters: page default 1; pageSize default 20, 1..100; search trimmed max 100; action max 100; entityType max 50; actorId optional nonempty UUID; fromUtc inclusive and toUtc exclusive ISO UTC timestamps. Either date may be omitted; when both exist fromUtc < toUtc. Fixed CreatedAt descending then Id descending. Exact action/type/actor filters, combined with AND. Search is parameterized literal case-insensitive substring over Action, EntityType, EntityId and current Actor.FullName; never search raw Details, IP, emails or secret data.

Frontend date-only inputs represent local calendar boundaries and are converted to UTC; inclusive selected To day becomes the next local midnight as exclusive toUtc (do not assume every local day is 24 hours). Apply server count/filter before paging. Unknown but syntactically valid action/type returns empty so future/legacy actions remain queryable.

## 8. Request/response data contracts

No request bodies. CamelCase JSON, UUID strings, ISO UTC timestamps.

~~~text
AuditLogSummary = {
  id, createdAt,
  actor: { id: UUID | null, displayName: string | null },
  action: string,
  entityType: string,
  entityId: string
}
Page = { items: AuditLogSummary[], page, pageSize, totalCount, totalPages }
AuditLogDetail = AuditLogSummary + {
  metadata: object,
  metadataUnavailable: boolean
}
~~~

Actor.id uses ActorId when present, otherwise a validated actorUserId snapshot from new safe metadata if available. Actor.displayName is current joined name, not a historical claim; show “Unavailable actor” for a missing account. Do not label every null actor “System”: null alone does not establish that provenance.

New stored Details JSON:
~~~json
{
  "schemaVersion": 1,
  "actorUserId": "<server-resolved UUID>",
  "actorRole": "Admin",
  "data": {
    "oldStatus": "Open",
    "newStatus": "Resolved"
  }
}
~~~

Created event data instead contains type/newStatus; Replied data contains responseId and newStatus. API metadata returns allowlisted data plus actorRole where appropriate, not raw stored JSON. Limit serialized Details to 2048 characters for new writes and allow only bounded primitive values/known keys. Unknown schema/action, malformed or old free-text Details produce metadata: {} and metadataUnavailable: true; the event summary remains visible. Never echo raw legacy Details as a fallback.

Existing IpAddress default is "127.0.0.1", so it is not reliable evidence of client origin. Exclude it from the API. For new records explicitly store empty string if unused; do not pretend loopback is the caller IP or trust forwarded headers without existing trusted-proxy configuration.

Errors: 400 { message, errors? } for malformed filters; 401 invalid identity; 403 unauthorized current role/status; 404 absent detail; 500 safe failure. Pagination totalPages is 0 when totalCount is 0.

## 9. Required database/entity changes

No new audit table is required. Preserve AuditLog's existing nullable actor relationship and scalar resource reference. EntityId stays a canonical resource UUID string for new GUID resources; no target FK, so deleted-resource evidence survives.

Consider one additive migration for indexes (CreatedAt, Id), (ActorId, CreatedAt, Id), and (EntityType, CreatedAt, Id). Add (Action, CreatedAt, Id) only if filter query plans justify it. Existing actor FK index may already exist; inspect generated migration and avoid duplicates.

No schema rewrite, deletion cascade, automatic purge or historical backfill. Service-level validation is sufficient for new metadata size/type restrictions without truncating legacy rows. Application append-only behavior is required; this does not claim database-level tamper-proof storage. Direct DBA edits are outside this academic feature's guarantee.

## 10. Authorization/security rules

Both read endpoints require JWT Admin AND a current active Admin database row. Invalid/missing caller → 401; inactive/role mismatch → 403. No Student/Instructor log visibility through the new route. Existing AI trace route remains its existing integration.

Return DTOs only. No passwords, hashes, tokens, raw requests/responses, emails, payment data, ticket bodies/replies, quiz answers, documents or secret configuration in new audit metadata. Do not return User navigation graphs. Do not bulk-expose legacy Details because its safety is unknown.

Event writes derive actor from server claims and verified account, never supplied userId. Use UTC and typed/allowlisted action/resource values. Query parameterization, no-store responses and escaped frontend text apply. Clear audit page state on logout/role switch. No audit-event editing through UI/API.

## 11. Validation rules

New writer: allowed action <=100 chars, entityType <=50, canonical nonempty resource UUID string <=36 for supported resources, actual actor UUID, server UTC timestamp; metadata <=2048 serialized characters with approved schemaVersion/keys/primitive value types and bounded lengths. Reject unsafe data before committing the business transaction.

List: page >=1, pageSize 1..100; length limits above; valid GUID/timestamps; from < to. Reject invalid syntax with 400. Do not turn invalid dates into unbounded queries. Valid unknown actions/types return zero results. Client uses ISO serialization, not locale-formatted request dates.

## 12. Loading/error/empty states and consistency

Loading skeleton; successful no records: “No recorded actions yet,” with coverage note. Filtered empty: “No recorded actions match these filters,” Clear filters. Database error is Retry, never empty success. Keep selected detail separate from list loading; 404 shows unavailable record without showing prior selected metadata.

Cancel/ignore stale searches and account-switched requests. Refresh preserves filters; reset page when filters change. Actor/resource may no longer exist: preserve IDs and display unavailable labels.

Business event persistence is atomic with its operation: failed support save or concurrent loser produces no successful event. Support creation idempotency returns the previous ticket without another Created event. Allocate stable event IDs for retryable operations and verify uncertain commits using business idempotency/version outcomes; do not blindly append on retry. Audit read failures never write an audit row recursively.

## 13. Integration points

Support Desk is the first required writer integration. Platform Summary counts tickets/users directly, not audit events. Profile v1 is read-only and adds no writer. Existing user/course/enrollment hooks remain documented candidates until protected behavior conflicts are resolved.

Do not reuse insightsService.getAuditLogs() because it returns AI traces. Add an adminAuditService using the shared Axios instance. The new writer participates in the same support DbContext/transaction; no queue, external logging service or event bus is needed.

## 14. Files likely to require modification later

New frontend/src/pages/Admin/AuditLogs.jsx and services/adminAuditService.js (getLogs(params), getLog(id), cancellation for GETs); App.jsx, components/layout/Sidebar.jsx and Navbar.jsx hooks.

New backend/EduFlow.Api/Controllers/AdminAuditLogsController.cs; Core/DTOs/AuditLogDtos.cs; Core/Interfaces/IAuditLogWriter.cs; Infrastructure/Services/AuditLogWriter.cs. Register writer in Program.cs. Optional index-only changes in ApplicationDbContext/new migration/snapshot. SupportTicketService calls writer before its save.

Deferred integration sites are AdminController CreateUser/ChangeUserRole/ToggleUserStatus/DeleteUser, AuthService account creation/profile update, CoursesController Admin mutations, InstructorController Admin enrollment decisions. These are NOT baseline edit targets. Test additions: EduFlow.Tests/AdminAuditLogTests.cs and frontend/e2e/admin-audit-logs.spec.js.

## 15. Files/systems that must remain untouched

Keep ai-agent/**, Learning Agent/RAG, PDF indexing, quiz generation, gamification, mobile/**, Instructor academic workflows, Student learning workflows, existing Course Management and User Management behavior untouched. Shell edits are limited to the specified navigation/actions. Reuse authentication; document its integration gaps rather than redesign it. Future schema work must use new additive migrations, never rewrite existing migrations.

Do not repurpose AnalyticsController.GetAuditLogs, insightsService.getAuditLogs, AiWorkflowLog, AI trace screens, DomainEvents/gamification infrastructure or existing user-deletion guard. Audit visibility is not permission to rewrite protected controllers.

## 16. Step-by-step implementation plan

1. Freeze baseline scope: read existing AuditLog rows safely and record new support operations; mark deferred coverage explicitly.
2. Stage A builds Admin read-only list/filter/detail UI and service contract. Missing API shows unavailable, not synthetic logs.
3. Stage B implements DTO projections, current-account authorization and database-side paging/filtering; safe handling of legacy metadata.
4. Add small writer/registry and DI, retaining existing entity. Add only justified indexes in an additive migration.
5. Integrate support operations atomically; verify no event on failed/conflicting/replayed request.
6. Run authorization, redaction, transaction and UI tests. UAT should prove a new support event appears after real mutation/reload.
7. Do not enable wider User/Course/Enrollment instrumentation until the deletion/behavior conflict has a separately reviewed resolution. Document current coverage in the UI/release; no fabricated historical backfill.

## 17. Manual UAT checklist

- [ ] Admin sees real saved SupportTicket events after refresh/relogin, with correct actor/time/resource.
- [ ] Student/Instructor/stale/suspended Admin cannot read new log endpoints.
- [ ] Search, action/type/actor/date combinations and pagination work, including date boundary records.
- [ ] Reply+resolve shows intended events, failed/conflicting/repeated create does not add duplicates.
- [ ] Legacy malformed/free-text Details never render raw; safe summary remains visible.
- [ ] Missing actor/resource keeps event readable without claiming it was a system action.
- [ ] No secret, message body, response, raw IP or request payload appears in API/UI.
- [ ] Existing AI trace API/UI remains unchanged.
- [ ] Existing unused-user deletion behavior/tests remain unchanged; deferred user instrumentation is not quietly enabled.
- [ ] Keyboard, responsive, empty/error states and coverage note are accurate.

## 18. Automated tests to add

xUnit HTTP tests: Admin-only plus current-role/status checks; paging/count/order; exact combined filters; UTC inclusive/exclusive boundaries; invalid filters; missing actor; missing target; unknown/legacy Details redaction; strict DTO fields and no secret serialization.

Writer tests verify registry validation, metadata length/type allowlist, server actor attribution and no independent SaveChanges. PostgreSQL integration proves mutation+audit rollback, support conflict loser has no log, idempotent creation has one event, and retry behavior preserves IDs. EF InMemory is insufficient for transactional evidence.

Preserve UserCourseManagementTests' unused-user deletion, AuditSubject and all mapped reference regressions. Do not adjust their expectations merely to make new broad audit hooks pass. Playwright exercises real support event visibility, filters/details, denied roles and unavailable/empty/error states.

## 19. Known risks/conflicts

Schema existence is not established event coverage; deployment may contain manually inserted or unknown legacy rows. No live database/API was queried. Do not claim historical completeness or tamper-proof storage.

User creation audit directly conflicts with existing permanent deletion rules. Broad User/Course/Enrollment instrumentation is deferred, not implicitly authorized. New Support Desk activity remains protected by the existing guard.

The old audit-named endpoint is AI-only and Instructor-accessible. Reusing it for private governance logs would couple protected systems and broaden exposure. New Admin route is necessary despite similar naming.

App-level timestamps/current actor names do not provide immutable historical identity snapshots. Actor UUID snapshot in safe new metadata preserves attribution if the FK later becomes null, without redesigning retention. Retention/export/DBA immutability are future topics, not enterprise logging scope.

## 20. Definition of Done

Admin-only search/list/detail reads real AuditLogs with safe projections; support events persist atomically and without duplicates; privacy/filtering/paging/errors work; legacy data is handled safely; UI accurately states limited coverage; existing AI traces and protected deletion/workflows remain unchanged. Broader event categories are not claimed complete until their documented conflicts are resolved and integration tests pass.
