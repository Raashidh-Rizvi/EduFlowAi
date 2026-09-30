# Ratings & Reviews — calculation method and eligibility rules

Single source of truth: `IRatingService` / `RatingService`
(`backend/EduFlow.Core/Interfaces/IRatingService.cs`,
`backend/EduFlow.Infrastructure/Services/RatingService.cs`).
Every average shown anywhere — course cards, course details, instructor
profiles, instructor dashboards, marketplace storefront — comes from this
service, so the numbers can never disagree.

## 1. What counts

Only reviews with `Status == Approved` are visible publicly and counted.
`Pending` reviews are awaiting moderation, `Rejected` reviews were hidden by
an administrator. Both are excluded from every aggregate.

## 2. Course rating

```
N               = number of APPROVED reviews for the course
average         = N == 0 ? 0.0 : round(sum(approved ratings) / N, 2)
review count    = N
```

`Course.AverageRating` / `Course.RatingCount` are denormalized columns, but
they are always **recomputed from the source review rows**
(`RecalculateCourseAsync`) after every create / edit / delete / moderation —
never incremented — so they cannot drift from the real data.

## 3. Instructor aggregate rating

```
eligible reviews = APPROVED reviews on the instructor's PUBLISHED courses
average          = none ? 0.0 : round(sum / count, 2)
review count     = number of eligible reviews
```

This is the **review-weighted mean (micro-average)**: it equals
`Σ (course average × course review count) / Σ (course review count)`,
so a course with 1 review cannot out-weigh a course with 40 reviews, and
draft/unpublished courses never contribute.

## 4. Student count (profiles)

Distinct students holding a verified enrollment (`Active` or `Completed`)
in the instructor's **published** courses. `Pending` requests and `Dropped`
enrollments do not count.

## 5. Review eligibility rules

A student may submit (or edit) a review for a course only when **all** hold:

| # | Rule | Enforced by |
|---|------|-------------|
| R1 | Caller is authenticated with the **Student** role | `[Authorize(Roles = "Student")]` on `POST /api/courses/{id}/reviews` |
| R2 | The course exists and **is published** | `RatingService.CheckReviewEligibilityAsync` |
| R3 | Caller holds a **verified enrollment**: status `Active` or `Completed` (`EnrollmentStatus.GrantsAccess()`). `Pending`, `Dropped`, `Rejected` and `Cancelled` do not qualify | `CheckReviewEligibilityAsync` |
| R4 | Caller is **not the course's instructor** | `CheckReviewEligibilityAsync` |
| R5 | Rating is an integer **1–5**; comment ≤ **2000 chars** | Controller validation + `CK_CourseReviews_Rating_Range` check constraint |
| R6 | **One review row per (course, student)** — unique DB index; a second POST edits the existing row instead of inserting | Unique index + upsert in `CreateOrUpdateReview` |

Rule violations return `403` with the reason in the body (`404` for unknown
courses, `400` for invalid payloads). The student id always comes from the
JWT — it is never read from the request body.

## 6. Moderation lifecycle

- New (and newly edited) student reviews start as `Approved`, unless
  `ReviewModeration:RequireApproval` is set to `true`, in which case they
  start as `Pending` and stay hidden until an administrator approves them.
- `POST /api/admin/reviews/{id}/approve` publishes a review into every aggregate.
- `POST /api/admin/reviews/{id}/reject` hides it (row kept, auditable, reversible).
- `DELETE /api/admin/reviews/{id}` removes it permanently. Students may also
  delete their own review via `DELETE /api/courses/{id}/reviews/{reviewId}`.
- Instructors can **view** reviews for their own courses
  (`GET /api/instructor/reviews`) but have **no** endpoint that modifies them.
- Every mutation recomputes the affected course's denormalized columns.

## 7. Public profiles

`GET /api/instructors` (directory) and `GET /api/instructors/{id}` (full
profile) are anonymous and expose only published-course data plus the fields
the instructor chose to publish — never the email address. Instructors edit
their own profile via `GET/PUT /api/instructors/me/profile`, which binds
ownership from the JWT (no instructor id in the request), so an instructor
can only ever edit their own row.
