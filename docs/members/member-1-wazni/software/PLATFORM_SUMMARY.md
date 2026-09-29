# Platform Summary — implementation specification

Specification only, based on repository inspection on 2026-09-29. Paths are relative to the inner EduFlowAi repository. This task creates only the four requested documents; it implements no source, database, migration, test or configuration changes and performs no commit/push.

Stage A owns visual/frontend work; Stage B owns persistence, authorization and business logic. Stage A must use the contracts below and show an explicit unavailable/error state until the backend is ready. No production mock records, fake successful saves or localStorage ticket persistence. Fixtures belong only in later automated tests.

## 1. Purpose

Replace only the Admin Overview content with a factual platform summary. Every displayed count is a database aggregate with a defined meaning. No synthetic AI usage, latency, activity feed, trend, revenue or engagement metrics.

## 2. User roles involved

Admin alone sees the new governance summary and support/account distributions. Existing Instructor analytics must retain their current payload and behavior. Student/anonymous access to this summary is denied.

## 3. Existing reusable project components

App.jsx Admin activeTab dashboard, Sidebar.jsx Overview entry and Navbar.jsx header; api.js; insightsService.getPlatformAnalytics() calling GET /api/analytics/platform; card-premium and purple typography/theme tokens in index.css. SectionHeading/LoadingBlock/ErrorBanner/EmptyState from pages/Instructor/shared.jsx can be reused without altering Instructor workflows.

No chart package is installed in frontend/package.json. Use simple CSS bars or SVG with visible numeric labels and an accessible table; no dependency installation is necessary.

## 4. Current architecture relevant to the feature

App currently renders pages/Dashboard/Dashboard.jsx for Admin dashboard. That shared page invokes academic/AI behavior and /analytics/recent-activity; the latter returns hardcoded records. Do not reuse its activity feed or edit its academic logic; render a new Admin PlatformSummary component for the Admin dashboard branch.

AnalyticsController.cs already provides:
- GET /analytics/platform: real counts of users, Students, all courses, IsPublished courses, Active enrollments, submissions, challenges, XP, badges and AI plan states. Existing totalEnrollments means Active only.
- GET /analytics/dashboard-summary: totalCourses actually counts IsPublished courses; other counts include academic/AI/gamification data.
- Class authorization permits Instructor and Admin.
- GET /admin/system-health contains some real counts but fixed latency/AI-health values.
- GET /admin/ai-telemetry contains synthesized estimates/values; it is not a source for this feature.
- GET /instructor/enrollment-requests/summary is already used for the existing pending badge, with Admin-wide scoping. Keep it rather than introducing another badge API.

Entities.cs has User.Role/IsActive, Course.IsPublished plus string Status, Enrollment.Status, BaseEntity timestamps. Enrollment is one row per (CourseId, StudentId), mutated through the request lifecycle. No online-user/last-login metric is established.

## 5. Proposed frontend UI

Keep existing Overview entry/id dashboard; Navbar title becomes Platform Summary only when currentUser.role is Admin. Do not add a second Overview tab or change Instructor titles.

Top: summary title, “Current database totals”, last successful generatedAt and Refresh. Responsive card grid: Total users, Active accounts, Courses, Active enrollments, Pending enrollment requests, Unresolved support tickets (when available). Smaller detail cards/list show remaining role/status totals. Card links navigate to existing admin, courses, enrollment-requests and new support-desk tab IDs without creating duplicate management pages. Link to support opens its default list; only pass a filter if that callback contract is explicitly added.

Charts: users by role; active/suspended accounts; published/unpublished courses; support status and type once available. Display counts and accessible legends; a zero denominator produces “No data yet”, never NaN or a full circle. Use CSS/SVG with current theme colors, not another application's dashboard design. No date filters or growth arrows because historical series are not part of the contract.

## 6. Proposed backend responsibilities and metric definitions

Extend the existing /analytics/platform response with an Admin-only adminSummary property; do not create /admin/platform-summary or a duplicate aggregate endpoint. Preserve existing top-level keys and their semantics for all existing consumers. Use existing queries where semantics match. Compute new sensitive fields only for a verified current active Admin; never attach them to Instructor payloads.

| New field | Exact source/definition |
| --- | --- |
| users.total | All Users rows, including suspended accounts. |
| users.students / instructors / admins | Users grouped by current Role. These categories sum to total for valid schema values. |
| users.active / suspended | IsActive true / false. “Active accounts” means enabled, not recently online. |
| courses.total | All Courses rows. |
| courses.published / unpublished | IsPublished true / false; these are complementary. |
| courses.draft | IsPublished == false AND Status == "Draft", case-insensitive. |
| courses.archived | IsPublished == false AND Status == "Archived", case-insensitive. |
| courses.otherUnpublished | IsPublished == false and neither Draft nor Archived (including unexpected values). |
| enrollments.totalRecords | All Enrollment rows, including pending/rejected/cancelled/dropped. Not historical requests or unique learners. |
| enrollments.active / completed / pending / rejected / cancelled / dropped | Exact EnrollmentStatus counts. “Pending enrollment requests” is Pending. |
| support.total | All SupportTicket rows after support migration. |
| support.open / inProgress / resolved | Exact status counts. |
| support.unresolved | open + inProgress, explicitly distinguished from Open. |
| support.byType.bug / dispute / feedback | Exact Type counts. |

Course.IsPublished is authoritative for publication distribution, matching current analytics. Do not equate !IsPublished with Draft: Status also documents Archived. Existing course create/publish handlers synchronize flags but historical inconsistencies are possible. Do not repair course data here; mismatched rows remain counted by IsPublished, with a documented data-quality investigation if noticed.

Compute grouped counts with AsNoTracking, database-side aggregation and cancellation; do not load user lists or entire courses into the browser for counting. Execute sequential queries on one DbContext (no parallel EF queries). For a consistent multi-query result, use a short PostgreSQL repeatable-read transaction inside the configured execution strategy, including reused base aggregates. Preserve current Instructor query behavior; the snapshot requirement applies to Admin composition. Return generatedAt from the server after successful computation.

## 7. Proposed API endpoints

Reuse GET /api/analytics/platform (no request body). Keep insightsService.getPlatformAnalytics() and add no duplicate service transport. Existing platform fields remain unchanged; only the verified Admin response receives adminSummary.

JWT Admin plus live User row must be active and still Admin before returning the extension. Stale Admin/deleted/inactive callers fail 403/401 as appropriate; existing Instructor responses retain their current contract without the extension. The new UI itself is Admin-only. Existing /instructor/enrollment-requests/summary continues serving the badge independently.

No summary write endpoint, refresh mutation, database table or reporting job is required.

## 8. Request/response data contracts

Below is a shape description, not production fallback data. Counts are nonnegative JSON integers; dates ISO-8601 UTC.

~~~text
existingPlatformResponse + {
  adminSummary: {
    generatedAt: string,
    users: { total, students, instructors, admins, active, suspended },
    courses: { total, published, unpublished, draft, archived, otherUnpublished },
    enrollments: { totalRecords, active, completed, pending, rejected, cancelled, dropped },
    support: null | {
      total, open, inProgress, resolved, unresolved,
      byType: { bug, dispute, feedback }
    },
    supportAvailability: "NotImplemented" | "Available"
  }
}
~~~

Before Stage B support persistence is implemented, support is null and supportAvailability is NotImplemented; display “Support reporting not available yet.” Once the SupportTicket model/migration is released, support is required and Available; a real empty table returns zeros. A missing expected table/database failure is an error, never NotImplemented or zero. Do not probe missing tables on every request or catch broad exceptions to hide broken deployment. The temporary NotImplemented branch is a release-stage contract, not a runtime database-discovery mechanism.

An Admin response lacking adminSummary means the old backend is deployed; show “Platform summary is not available on this server” rather than infer new fields. Existing top-level fields remain usable by their existing consumers only.

Errors follow existing { message } / ProblemDetails conventions: 401 unauthenticated, 403 unauthorized live role/status, 500 aggregate failure. No partial success with silent zero substitutions.

## 9. Required database/entity changes

None for user/course/enrollment metrics. Support counts depend on SUPPORT_DESK.md's additive tables. No analytics snapshot, audit-as-analytics, event sourcing or last-login field is required. Existing enum/status indexes can be used; introduce indexes only if measured aggregate queries need them. No migration changes in this documentation task.

## 10. Authorization/security rules

Protect the extension using server claims plus a current active Admin lookup; hiding a card is insufficient. Never send the extension to Instructors/Students, including support counts. Return aggregates only—no emails, ticket bodies, tokens or hashes. Use private/no-store response behavior for the Admin extension and no cross-user client caches. Discard data on account/role switch.

## 11. Validation rules

There are no user filters in v1. Server ensures all categories are exhaustive for current enum values; tests catch unexpected role/status values rather than dropping them silently. Frontend validates expected shape and finite nonnegative counts; a missing field is unavailable/error, not zero. Preserve real zero with null-aware logic, never truthiness fallbacks. Percentages use count/total with a zero guard and display rounding only; counts remain exact.

## 12. Loading/error/empty states

Initial fetch: card skeletons and loading label. Successful empty database: zero counts and empty chart explanations. Missing support implementation: unavailable support panel, not zero. Failure: retryable error. During refresh keep last successful snapshot with “Refresh failed; showing data from [time]” if it fails; do not relabel stale data as fresh. Disable overlapping refreshes and ignore late responses after unmount/account change.

## 13. Integration points

App/Sidebar/Navbar integration is coordinated with Support Desk, Profile and Audit Logs. Reuse existing tab IDs for management links. Keep pending enrollment badge's established API unchanged. Read support counts directly, not from a page of tickets or notifications. Audit UI is a separate feature; no fabricated recent-activity list belongs here.

## 14. Files likely to require modification later

New frontend/src/pages/Admin/PlatformSummary.jsx. Existing frontend/src/App.jsx Admin dashboard render branch; components/layout/Navbar.jsx Admin title/subtitle. Sidebar Overview entry remains, unless a label-only change is desired; no duplicate entry. Reuse services/insightsService.js unchanged unless a typed shape check/helper is added.

Backend/EduFlow.Api/Controllers/AnalyticsController.cs, plus a proposed backend/EduFlow.Core/DTOs/PlatformSummaryDtos.cs for explicit contract. A small aggregate service may be extracted if necessary, not a new subsystem. Proposed tests: backend/EduFlow.Tests/AdminPlatformSummaryTests.cs and frontend/e2e/admin-platform-summary.spec.js.

## 15. Files/systems that must remain untouched

Keep ai-agent/**, Learning Agent/RAG, PDF indexing, quiz generation, gamification, mobile/**, Instructor academic workflows, Student learning workflows, existing Course Management and User Management behavior untouched. Shell edits are limited to the specified navigation/actions. Reuse authentication; document its integration gaps rather than redesign it. Future schema work must use new additive migrations, never rewrite existing migrations.

In particular preserve Dashboard.jsx's academic implementation, Instructor analytics response semantics, CoursesController behavior, AI telemetry, gamification data and Communications. Querying existing tables is not permission to expand those workflows.

## 16. Step-by-step implementation plan

1. Stage A builds Admin-only summary cards/charts/states, retaining dashboard tab ID and existing navigation.
2. Stage A consumes adminSummary through existing insightsService; absent extension shows unavailable. No example values ship in production.
3. Stage B adds explicit DTO and live Admin validation; preserves Instructor/legacy fields.
4. Add grouped aggregates and consistent snapshot; verify exact metric definitions with mixed statuses.
5. Integrate support counts only after its schema exists; preserve staged availability semantics.
6. Wire management links, refresh and account-change cleanup.
7. Run aggregate/auth/contract tests, frontend build and UAT; verify protected dashboards remain unchanged.

## 17. Manual UAT checklist

- [ ] Compare counts against known database fixtures/administration views with pagination accounted for.
- [ ] Role totals equal users.total; active+suspended equals total.
- [ ] Published+unpublished equals all courses; draft is not every unpublished course.
- [ ] Enrollment totalRecords includes all six statuses; Active is not mislabeled total requests.
- [ ] Support Open differs from Unresolved; resolved/type distributions match persisted tickets.
- [ ] Instructor/Student cannot receive adminSummary; stale Admin access is denied.
- [ ] Empty database, old backend, missing support stage and network failure are distinct.
- [ ] Refresh time and stale-data notice are accurate; charts are readable by keyboard/screen reader and at narrow widths.
- [ ] Course/User Management, pending badge and Instructor dashboard still behave as before.

## 18. Automated tests to add

xUnit HTTP contract tests: Admin extension present, Instructor legacy response unchanged with extension absent, Student 403, invalid/stale/inactive Admin denial. Mixed fixture counts include every role/enrollment status, unpublished Archived and mismatched course flags; zero cases; support sum invariants. Assert old totalEnrollments still means Active.

PostgreSQL integration tests verify aggregate translation and snapshot behavior; EF InMemory alone cannot prove transactions. Playwright covers populated/empty/unavailable/error/stale states, actual backend data refresh, navigation and role isolation. Do not add analytics library dependencies.

## 19. Known risks/conflicts

Existing analytics routes are shared with Instructors; adding governance fields without Admin-only branching would leak new data. The existing endpoint is suitable for extension, so duplicating it would create conflicting definitions. Existing dashboard totalCourses and platform totalEnrollments names are semantically narrower than they sound; preserve legacy contracts and use explicit new names.

Course status/flag inconsistencies and seeded creation timestamps are possible. “Active users” must never imply online or recent activity. No runtime DB/API verification was performed. No invented trend, service health, revenue or AI cost metric is authorized.

## 20. Definition of Done

Admin Overview displays only verified database aggregates with documented meanings, accessible charts, honest empty/unavailable/error states and refresh time. Existing API consumers retain their contract; new sensitive fields are Admin-only; support dependency is handled explicitly; no duplicate Overview/API, source-of-truth drift or protected workflow changes.
