# Course Management

Owner: Wazni / IT24103352. [Current allocation](../../../current/RESPONSIBILITY_MATRIX.md).

## Verified current structure

```text
Course
└── Module
    ├── Lesson (flat content path)
    ├── Topic
    │   └── ContentItem
    └── ContentItem (optional direct module attachment)
```

Course holds platform metadata, an instructor/owner, modules and enrollments. Module groups course content and may have an attached document. Lesson is the existing flat module content record. Topic groups hierarchical content inside a module. ContentItem holds hierarchical content, always belongs to a module, may belong to a topic, and may have a parent ContentItem and nested children. Lesson and Topic/ContentItem coexist; this change does not migrate, merge or replace either path.

## Responsibility and implemented Admin view

Wazni owns platform inventory, administrative course metadata, access/enrollments and supported module administration. Instructor academic curriculum, publishing, assessment generation and deep content authoring remain with the shared Instructor workflow / Raashidh. There is one shared Course model and API.

Only the Admin role renders the new Course Management component. Other roles retain the existing component body unchanged. Admin has:

- A responsive, searchable course inventory using actual DTO code, title, category, term, instructor name, active student count, module count and IsPublished status. No synthetic academic metrics.
- Course selection, refresh, persisted New Course and Edit Course dialogs. Required code/title/category/term are trimmed and validated. Metadata updates preserve thumbnail, ownership, publication and displayed counts; the list is refreshed after saving.
- Add & Manage Course Students, name/email search, active available students, enrollment and confirmed removal. Existing removal marks enrollment Dropped and retains history. Roster and inventory counts refresh after changes.
- Module list, Add Module (with an optional supported document), metadata-only Edit Details and attached document information. Existing attachments are preserved during edits. PDF preview and document download use the actual attachment and report failures. Word/PowerPoint preview explains that a download is required; no placeholder document is generated.
- Loading, empty, error/retry, validation and success states, with duplicate submissions disabled and dialogs protecting in-flight saves.

Admin does not render Hierarchy & Quizzes Tree, Student Journey Map, final-assessment generation/card, quiz quests, AI regeneration, module/topic/boss quizzes, Edit / Slides or Add Topic. Existing Instructor handlers and rendering remain unchanged. Learning Agent/RAG, PDF indexing and assessment internals are untouched.

## Shared APIs reused

All routes are under the existing /api/courses prefix through courseService:

| Operation | Existing route |
| --- | --- |
| Inventory / selected course metadata | GET / |
| Create / update metadata | POST /; PUT /{id} |
| View / add modules | GET /{id}/modules; POST /{id}/modules |
| Edit module details | PUT /modules/{id} |
| Optional new module document | POST /upload-pdf |
| Available / enrolled students | GET /students/available; GET /{id}/enrolled-students |
| Add / remove enrollment | POST /{id}/students; DELETE /{id}/students/{studentId} |

No backend, DTO, entity, service contract, schema or migration changes were needed. The create endpoint assigns the current caller as InstructorId and creates a draft; Admin instructor reassignment and publishing are not added. Update responses omit the instructor name and return zero counts, so the Admin UI retains inventory values while refreshing authoritative list data.

## Blockers and deliberately deferred shared issues

- **Course deletion is not exposed for Admin.** The current endpoint unconditionally removes the course after ownership authorization. EF cascades into modules, enrollments and academic records, including completion/submission history, without history safeguards. This specific Delete implementation is stopped pending a separately agreed backend retention policy; no cascade behavior was changed.
- Module deletion also removes its content without history safeguards and is not exposed for Admin. The existing Instructor handler is unchanged.
- The shared Add Topic action still calls createLesson(). Topic/ContentItem CRUD and hierarchy routes exist in CoursesController but are not wired into courseService or this Admin UI. The Instructor mapping also synthesizes topic grouping around flat lessons. Repairing this academic authoring path is outside this task.
- Instructor module deletion currently updates the UI optimistically and only logs API failure. This existing shared issue was not changed.
- Document upload and module creation remain separate existing requests. An upload can succeed before a failed module save; retrying the same open form reuses the uploaded document, but abandoned uploads have no cleanup workflow here.
- User Management was not revisited. No manual UAT or real PostgreSQL Course persistence verification is claimed.

## Verification

Automated verification on 2026-09-29:

- `dotnet build backend/EduFlow.slnx --configuration Release`: passed, 0 errors and 20 warnings in unchanged source (nullable-reference and xUnit analyzer warnings).
- `dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj --filter UserCourseManagementTests --configuration Release`: passed, 84 passed / 1 skipped / 0 failed. The PostgreSQL-specific delete regression was skipped; no Course PostgreSQL UAT is implied.
- Frontend `npm run build`: passed; Vite reported a bundle larger than 500 kB.
- `git diff --check`: passed. The new untracked Admin component was also checked for trailing whitespace.
- The existing Instructor component body was compared with its pre-edit contents and is identical. Only the role wrapper/import was added to Courses.jsx.
- Only the two Course frontend files and this document changed; the pre-existing untracked backend/.vs/ directory remains untouched. No Learning Agent/RAG tests were run.

These checks do not replace the manual UAT below.

## Manual UAT still required

1. Sign in as Admin; open Course Management. Check inventory fields against existing courses, search by code/title/category/term/instructor, select courses and refresh. Check empty/no-match states and narrow-screen layout.
2. Create a uniquely coded draft course. Verify blank/whitespace required fields are rejected, saving is disabled in flight, API failures retain input, success selects the saved course, and reload preserves it. Confirm the existing caller-as-owner behavior.
3. Edit course code/title/category/term/description; verify saved values survive refresh and student/module counts, instructor, thumbnail and publication state remain unchanged. Exercise a duplicate code/API error.
4. Open Add Students, search and enroll an available active student. Verify the roster/count and persistence after reload. Cancel removal, then confirm removal and verify the student leaves the active roster; re-enroll and verify no duplicate active enrollment.
5. Add a module with valid metadata, then another with a supported document. Verify required title/order/file validation, persistence, correct order and inventory module count. Edit details and confirm the attached document remains unchanged.
6. Preview/download an existing PDF and compare the actual file; download Word/PowerPoint attachments. Check unavailable-document errors and verify no fabricated fallback file appears.
7. Simulate API/network failures for inventory, modules, saves and enrollment refresh; verify retry, no false save success, and successful writes remain distinguished from failed refreshes. Check double-click protection and dialog Escape/keyboard focus.
8. Confirm Admin has no course/module Delete action or academic/AI/quiz/tree/journey/slide/topic controls. Do not test destructive course/module endpoints on historical data.
9. Sign in as Instructor; verify unchanged Curriculum & Modules title, course selection, Edit / Slides, Add Topic, AI/Boss quizzes, final assessment, hierarchy tree and journey map. Existing academic issues listed above remain outside this Admin change.
