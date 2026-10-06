# Support Desk / Help & Support — implementation specification

Specification only, based on repository inspection on 2026-09-29. Paths are relative to the inner EduFlowAi repository. This task creates only the four requested documents; it implements no source, database, migration, test or configuration changes and performs no commit/push.

Stage A owns visual/frontend work; Stage B owns persistence, authorization and business logic. Stage A must use the contracts below and show an explicit unavailable/error state until the backend is ready. No production mock records, fake successful saves or localStorage ticket persistence. Fixtures belong only in later automated tests.

## 1. Purpose

Provide real persisted private support for Students and Instructors and a central Admin Support Desk. Highest priority among these four extensions. Bug, Dispute and Feedback tickets retain their original message and administrator response history. A dispute does not itself change grades, enrollment decisions, courses or AI results.

## 2. User roles involved

| Role | Permissions |
| --- | --- |
| Student | Create as self; list and inspect only own tickets and responses. |
| Instructor | Same self-service permissions; course ownership grants no access to student tickets. |
| Admin | List/search all tickets, inspect submitter, append responses, progress and resolve tickets. No self-service creation in v1. |
| Anonymous/deleted/suspended account | No access to these endpoints. |

## 3. Existing reusable project components

- frontend/src/App.jsx: /console role selection, server-restored currentUser, Admin activeTab state.
- context/AuthContext.jsx and services/authService.js: identity context and GET /api/auth/me.
- services/api.js: Axios base URL ending /api, Bearer injection, one session-refresh retry, friendlyMessage errors; services return response.data.
- components/layout/Sidebar.jsx and Navbar.jsx: Admin navigation/header. Sidebar explicitly filters Admin-visible IDs; update its allowlist as well as its entries.
- pages/Admin/AdminManagement.jsx: native dialog, in-flight guard, form validation and success patterns; reference only.
- pages/Instructor/shared.jsx: SectionHeading, LoadingBlock, EmptyState, ErrorBanner, date helpers and Avatar. StatusPill has no support statuses; use a support-specific mapping.
- index.css: purple --primary, typography, card-premium, form-input/select/textarea, btn-primary/secondary, badge-pill and light/dark variables.
- Backend BaseEntity, User, ApplicationDbContext, JWT role attributes and NameIdentifier/uid conventions; existing Notification and AuditLog entities.

## 4. Current architecture relevant to this feature

React 18/Vite uses sections under /console rather than URLs for every console page. App chooses StudentPortal, InstructorPortal or the Admin shell. InstructorPortal delegates to InstructorPortalV2 when UI version is v2. StudentPortal owns a compact header/bottom tabs and does not use the shared Navbar.

ASP.NET Core controllers use api/[controller] and action suffixes. EF Core/Npgsql persists PostgreSQL data, with retry-on-failure enabled. Entities and enums are centralized in backend/EduFlow.Core/Entities/Entities.cs and Enums/DomainEnums.cs; mappings are in backend/EduFlow.Infrastructure/Data/ApplicationDbContext.cs.

No SupportTicket entity, service or API was found in inspected relevant backend/frontend sources. Notification contains UserId, Title, Message, Type and IsRead; Announcement is broadcast storage, unsuitable for private tickets. AuditLog exists but no runtime writer was found (see AUDIT_LOGS.md).

Program.cs validates JWTs but has no per-request database status/role revalidation. New support handlers must also load the caller and enforce current IsActive/Role. Client boot-time /auth/me validation is insufficient.

## 5. Proposed frontend UI — Stage A

### Persistent entry points

StudentPortal: add one labeled Help & Support header action outside activeTab/activeQuiz branches. Leave bottom tabs unchanged. Mount the dialog at shell level; opening/closing must not reset quiz, PDF, course or learning state. Let the header wrap on narrow web screens.

Instructor V1 and V2: one Help & Support sidebar action with an onOpenSupport callback, opening the shared dialog without navigating away from the current section. Mount in both shells. Do not let an unknown section fall through to Dashboard.

Admin: one support-desk tab labeled Support Desk, with App render branch, Navbar title and Sidebar allowlist entry. Preserve Overview, Course Management, Enrollment Requests, User Management and Communications Hub.

### Help & Support modal

Native dialog matching existing Admin dialog styling. Two views: New Ticket and Support History. Approximately 760px desktop maximum width, viewport minus 32px on small screens, maximum 90vh with internal scrolling. Implement labeled controls, focus containment/return, keyboard close and readable inline errors.

New Ticket: required Type select with unselected placeholder and Bug/Dispute/Feedback; required Message textarea with 5000-character counter; brief reminder to omit passwords/tokens; Cancel and Submit Ticket. No subject, attachments, priority, course selector or AI assistant. No client userId/email/role fields.

Disable repeated submit and dismiss while a save is in flight. Otherwise confirm discard for dirty text. Drafts live in memory only and clear on logout/account change. On confirmed success display the actual ticket ID and Open in Support History; refresh history and clear the draft. A timeout is not success.

### Support History

Load on opening History, on Refresh, after submission and when reopened; no websocket requirement. Paginated table/cards: ticket ID, type, status and submitted date. Shortened UUID display must expose the full ID accessibly. Detail shows full original message, timestamps and chronological administrator responses. Resolved records remain visible. Distinguish “No support tickets yet” from “No administrator response yet.”

Students/Instructors cannot edit/delete tickets, reply, resolve or reopen in this release.

### Admin Support Desk

Header and Refresh; search box (300ms debounce), Type and Status filters, all defaulting to All. Table: ID, submitter name/email/current role, type, status, submitted/updated dates and View. Reset page to 1 on filter changes. Narrow screens use cards or contained table scrolling.

Detail panel/dialog shows original message, submitter, all responses and response textarea. Actions:
- Send reply: keep current Open/InProgress status.
- Mark in progress: Open only; response optional.
- Resolve ticket: Open/InProgress only; require a new response or an already saved response. Confirm ticket ID and whether a response will be sent.
- Resolved detail is read-only.

All replies are visible to the submitter; there are no internal notes. Display “In Progress” for wire value InProgress, with warning/primary/success badges for Open/InProgress/Resolved. Escape multiline text; never render supplied HTML/Markdown. Status must have a text label, not color alone.

## 6. Proposed backend responsibilities and complete ticket lifecycle

Use a small SupportTicketService behind SupportController and AdminSupportController. Authenticate, load current account, scope queries, validate DTOs, apply transactions and return explicit projections; never return User entity graphs.

| Current | Operation | Result/rules |
| --- | --- | --- |
| None | Student/Instructor creates | Open; server assigns owner, IDs, UTC dates and version. |
| Open | Reply, status Open | Append response and remain Open. |
| Open | Mark in progress, optional response | InProgress. |
| InProgress | Reply, status InProgress | Append response and remain InProgress. |
| Open/InProgress | Resolve, optional response | Resolved; at least one existing/new response required; set ResolvedAt. |
| Resolved | Read | Preserved in history. |
| Resolved | Mutation | 409; no reopening or later replies in v1. |
| InProgress | Return to Open | 409; no backward transition. |

Type, original Message, SubmittedByUserId and CreatedAt are immutable. Same-status update without response is a 400 no-op. No assignment, SLA engine, deletion, auto-resolution, email transport or two-way chat.

## 7. Proposed API endpoints

Full paths below include /api; service calls omit it. SupportController uses api/[controller]; AdminSupportController uses explicit api/admin/support-tickets to retain Admin resource naming without enlarging AdminController.

| Method/path | Access | Success |
| --- | --- | --- |
| POST /api/support/tickets | Active Student/Instructor | 201 TicketDetail plus owned-detail Location; exact replay 200 same record. |
| GET /api/support/tickets | Active Student/Instructor | Paginated own TicketSummary records. |
| GET /api/support/tickets/{id:guid} | Active Student/Instructor owner | TicketDetail; 404 for missing or another owner's ticket. |
| GET /api/admin/support-tickets | Active Admin | Paginated AdminTicketSummary records. |
| GET /api/admin/support-tickets/{id:guid} | Active Admin | AdminTicketDetail. |
| PUT /api/admin/support-tickets/{id:guid} | Active Admin | Updated AdminTicketDetail; optional reply/status saved atomically. |

List query: page default 1; pageSize default 20, range 1..100; type/status exact wire values or omitted. Admin additionally accepts search (trimmed, max 100 chars): literal case-insensitive substring of original message and submitter FullName/Email, plus exact full UUID match if parseable. Parameterize/escape search wildcards; do not search credentials, audit details or academic records. No userId selector on requester APIs.

Filter before count/paging; fixed CreatedAt descending then Id descending order. Do not introduce duplicate account, notification or enrollment APIs.

## 8. Request/response data contracts

JSON camelCase, UUID strings, ISO-8601 UTC dates ending Z. Explicit string DTO values for type/status: global JSON configuration currently does not install a string-enum converter.

Creation:
~~~json
{
  "type": "Bug",
  "message": "The authenticated user's description",
  "clientRequestId": "<UUID generated once for this submission attempt>"
}
~~~

clientRequestId is internal, not a form field. Retain it on transport failure; changed payload requires a new key. Reject supplied unknown/privileged writable properties, including owner, role, status and timestamps.

Update:
~~~json
{
  "status": "InProgress",
  "responseMessage": "Administrator response or null for status-only update",
  "expectedVersion": "<UUID from latest detail>"
}
~~~

TicketSummary fields: id, type, status, messagePreview (first 160 characters), createdAt, updatedAt, resolvedAt (nullable), responseCount.
Pagination envelope: { items, page, pageSize, totalCount, totalPages }; zero items gives totalPages 0.

TicketDetail fields: id, type, status, message, createdAt, updatedAt, resolvedAt, version, responses.
Each requester response: { id, message, createdAt, authorLabel: "Support team" }. Order responses CreatedAt ascending then Id ascending. No Admin email or audit data.

AdminTicketSummary adds submittedBy: { id, fullName, email, role, isActive }.
AdminTicketDetail includes submittedBy and response fields adminUserId/adminName. Names/roles are current directory values, not historical snapshots. Detail returns the whole small-project thread; lists never return full threads.

Errors: { message, code?, errors? }, also accepting ASP.NET ValidationProblemDetails errors arrays. Codes: validation_failed, submission_key_reused, ticket_conflict, invalid_transition, resolution_response_required. Statuses: 400 invalid input/no-op; 401 invalid identity; 403 current status/role denial; 404 missing/not-owned; 409 conflict; 500 safe generic failure. UI prioritizes response.data.message/errors over friendlyMessage because api.js has no special 409 handling.

## 9. Required database/entity changes

Two new entities/DbSets and additive migration; no separate database.

| SupportTicket field | Mapping |
| --- | --- |
| Id, CreatedAt, UpdatedAt | BaseEntity UUID and UTC timestamps. |
| SubmittedByUserId | Required Users FK, Restrict. User has many SubmittedSupportTickets. |
| Type | Bug/Dispute/Feedback enum stored as string, max 20. |
| Status | Open/InProgress/Resolved enum stored as string, max 20, default Open. |
| Message | Required trimmed text, 1..5000 characters. |
| ResolvedAt | Nullable UTC timestamp, present iff Resolved. |
| Version | Required UUID, EF concurrency token; new server value on every accepted update. |
| ClientRequestId | Required UUID; unique with SubmittedByUserId. |

| SupportTicketResponse field | Mapping |
| --- | --- |
| Id, CreatedAt, UpdatedAt | BaseEntity; immutable after insert. |
| SupportTicketId | Required ticket FK, Restrict; ticket has many Responses. |
| AdminUserId | Required Users FK, Restrict, explicit WithMany relationship. |
| Message | Required trimmed text, 1..5000 characters. |

Indexes: unique (SubmittedByUserId, ClientRequestId); (SubmittedByUserId, CreatedAt, Id); (Status, CreatedAt, Id); (Type, CreatedAt, Id); response (SupportTicketId, CreatedAt, Id). Add a global (CreatedAt, Id) index if query-plan inspection justifies it. Add enum/length/ResolvedAt consistency constraints. Configure all User relationships explicitly to prevent unintended shadow FKs.

Creation deduplication: same caller/key and same trimmed payload returns original record; different payload returns 409. For simultaneous creation, handle the unique violation by rolling back and re-reading using a clean transaction/context. Never retry a failed PostgreSQL transaction in place.

Version must participate in EF's UPDATE WHERE predicate; comparing versions only in C# before saving is insufficient.

## 10. Authorization/security rules and privacy

Student and Instructor queries must include SubmittedByUserId == callerId before fetch/count/page. Course ownership, ticket UUID knowledge and localStorage roles confer no access.

Require JWT role plus a current active database account with matching permitted role. Missing identity/account: 401; inactive or mismatched role: 403. Apply these checks locally without global authentication redesign. Admin may manage tickets from suspended submitters.

Use DTO allowlists, parameterized queries, escaped text and no-store responses. Never serialize password hashes, tokens, refresh tokens or private navigation objects. Ticket bodies must not reach broadcasts, AI tools, public profiles, analytics or logs.

Clear ticket state/drafts on currentUser.id/role changes; cancel/ignore stale async results. No localStorage history or sensitive query cache. No anonymous ticket links/export.

New support FKs represent real business activity: the existing metadata-driven permanent user deletion guard must continue denying deletion of referenced users. Preserve suspension behavior and never cascade-delete support history to permit deletion.

## 11. Validation rules

Exact string type/status values only; reject numeric enum input. Trim message/response, require 1..5000 characters when present; permit line breaks. Treat optional whitespace response as absent, then apply lifecycle rules. Reject invalid/nonempty UUID requirements and invalid paging/filter values with 400, never silently convert invalid filters to All. Dates, owner/actor IDs, creation status and versions are server-controlled.

## 12. Loading/error/empty states and concurrency

Initial list/detail: skeleton or LoadingBlock. Successful empty list: New Ticket action; filtered empty: Clear filters. Failed fetch is an error with Retry, never empty success. Changing selection clears previous detail content.

Disable repeated mutations using pending state and an in-flight guard. Lost create response retries the same key. Two Admin sessions use expectedVersion plus EF concurrency; only one wins. The loser gets 409 and no partial response/audit/notification. Reload latest data, retain unsent response text and require deliberate resubmission.

Save ticket update, response, AuditLog and optional Notification in one transaction. A failure rolls back all. Explicit transactions run inside Npgsql execution strategy; allocate stable inserted IDs for a logical attempt and account for uncertain commit outcome.

After update timeout, reload detail before allowing resubmission. Show persisted state without inferring success solely from matching text. Retried old expectedVersion cannot append another reply. Do not automatically retry non-idempotent replies with a new version.

401 follows api.js refresh behavior; 403 blocks actions and requests session revalidation; 409 preserves draft; network/500 does not claim success. Cancel/discard stale list responses after filters/account changes.

## 13. Integration points

Existing GET /api/notifications/user and POST /api/notifications/{id}/read are owner-scoped. Optional notification reuse: on reply/resolve create one Notification for the submitter, Type SupportUpdate, generic text plus ticket ID only, in the same transaction. Combined reply+resolve sends one notification. Do not use Announcement or /notifications/broadcast. Notification has no resource-link column; Support History stays the authoritative entry point. App currently hardcodes unreadNotifications to 3: do not claim a live support badge or redesign it here.

Audit events: SupportTicket.Created, SupportTicket.Replied, SupportTicket.StatusChanged and SupportTicket.Resolved, with safe status/ID metadata only (AUDIT_LOGS.md). A combined reply/resolve can write Replied and Resolved atomically. Platform Summary counts persisted tickets after the support migration.

## 14. Files likely to require modification later

New frontend:
- frontend/src/components/support/HelpSupportDialog.jsx, SupportHistory.jsx, TicketDetail.jsx.
- frontend/src/pages/Admin/SupportDesk.jsx.
- frontend/src/services/supportService.js: createTicket, getMyTickets, getMyTicket, getAdminTickets, getAdminTicket, updateAdminTicket; response.data return values, cancellation for reads.

Existing shell hooks: App.jsx; components/layout/Sidebar.jsx, Navbar.jsx; pages/Student/StudentPortal.jsx; pages/Instructor/InstructorPortal.jsx, InstructorPortalV2.jsx, InstructorSidebar.jsx, InstructorSidebarV2.jsx. Reuse CSS.

New backend: Controllers/SupportController.cs and AdminSupportController.cs in EduFlow.Api; DTOs/SupportDtos.cs and Interfaces/ISupportTicketService.cs in EduFlow.Core; Services/SupportTicketService.cs in EduFlow.Infrastructure.
Extend Entities.cs, DomainEnums.cs, ApplicationDbContext.cs; register services in Program.cs; add a new migration and generated snapshot only in Stage B. Coordinate audit writer with AUDIT_LOGS.md. Tests go in existing EduFlow.Tests/frontend/e2e.

## 15. Files/systems that must remain untouched

Keep ai-agent/**, Learning Agent/RAG, PDF indexing, quiz generation, gamification, mobile/**, Instructor academic workflows, Student learning workflows, existing Course Management and User Management behavior untouched. Shell edits are limited to the specified navigation/actions. Reuse authentication; document its integration gaps rather than redesign it. Future schema work must use new additive migrations, never rewrite existing migrations.

AdminManagement.jsx and Communications.jsx are references, not support implementation targets. Do not refactor StudentPortal's learning logic or Instructor academic views.

## 16. Exact frontend/backend integration sequence

1. Freeze wire contracts, lifecycle, tab ID and file ownership; coordinate shared App/Sidebar/Navbar edits across four features.
2. Stage A: build shared dialog/history/detail presentation and states; add Student header and both Instructor sidebar actions without affecting underlying work.
3. Stage A: build Admin tab/filter/detail/reply controls and service boundary. Missing endpoints show unavailable; no fabricated production records or successful writes.
4. Stage B: add entities/mappings/constraints/migration and review interactions with deletion guard; verify on a disposable PostgreSQL database.
5. Implement live-account validation, ownership-scoped reads and idempotent creation; prove cross-user privacy before Admin mutations.
6. Implement atomic concurrency-controlled reply/status updates plus safe audit writer; optional private generic notifications only if included.
7. Connect frontend, replace details from canonical responses, invalidate lists/summary after writes, preserve honest failure/conflict states.
8. Add summary support counts and finish reload/relogin persistence verification.
9. Run focused backend/PostgreSQL/Playwright tests and UAT. Stage A visual completion is not feature completion.

## 17. Manual UAT checklist

- [ ] Student and Instructor V1/V2 actions work across portal sections without losing learning/teaching state.
- [ ] All types persist after refresh and relogin; history displays IDs, dates, original text and every response.
- [ ] Another Student/Instructor cannot list/fetch a ticket via guessed IDs or forged owner input.
- [ ] Admin search, combined filters, paging and resolved history work.
- [ ] Reply keeps status; progress changes Open; resolve requires response; resolved mutation/backward transitions fail.
- [ ] Blank/oversized/invalid payloads fail; HTML is text.
- [ ] Concurrent Admin update conflicts; repeated creation does not duplicate.
- [ ] Suspended/stale-role sessions fail; account switch clears private state.
- [ ] Keyboard, narrow web viewport, light/dark themes work; mobile app unchanged.
- [ ] Outages produce errors, not fake data/success. Optional notification goes only to requester.

## 18. Automated tests to add

xUnit/FluentAssertions: HTTP role matrix, live-account status/role denial, ownership list/count/detail, overposting, validation, create deduplication, lifecycle matrix, immutable fields, reply order, DTO secret exclusion and all-or-nothing writes.

Disposable PostgreSQL tests: racing unique keys, Restrict FKs, version UPDATE concurrency, simultaneous resolve/reply, rollback and execution strategy. EF InMemory cannot prove these. Extend existing metadata-driven deletion regression coverage without weakening protections.

Playwright: real Student submit → Admin reply/resolve → requester history after reload; multiple identities; both Instructor versions; dialog accessibility; filters; cancellation on account switch; error/409 draft preservation. Stubs only in isolated tests. Use existing frameworks; no new package required.

## 19. Known risks/conflicts

Stale JWT claims need local live-account checks. New support references intentionally become protected account activity. Historical deployment/table state is unverified; no live database or API was executed during this inspection.

UI has two Instructor versions and a separate Student shell. Shared shell work across agents must be merged deliberately. Notification badges are not currently live support delivery.

User/Course audit instrumentation has a protected-behavior conflict (AUDIT_LOGS.md); do not silently broaden those workflows. Scope excludes attachments, reopen, internal notes, assignments, SLA and chat.

## 20. Definition of Done

Database-backed records survive reload/relogin; required types/lifecycle/response history work; ownership and live-role security hold; concurrency/retry does not duplicate or partially write; all required portal entry points and Admin filters/details work; states/style/accessibility match EduFlow; tests/UAT pass; protected workflows remain intact. No hardcoded tickets or localStorage-only persistence.
