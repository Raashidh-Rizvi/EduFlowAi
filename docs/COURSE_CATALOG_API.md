# Course Catalog and Course Management API

Backend: `CoursesController` (`api/courses`) and `MarketplaceController` (`api/marketplace`).
Frontend: `frontend/src/pages/Marketplace/`.

## Visibility rules

- Identity and role come only from the JWT, never from the request.
- Anonymous visitors and students see published courses only.
- Instructors see only their own courses, drafts included.
- Admins see everything.
- Draft course detail returns 404 to anyone but the owner or an Admin.

## Public catalog (marketplace)

- `GET /api/marketplace/stats`
- `GET /api/marketplace/categories`
- `GET /api/marketplace/instructors`
- `GET /api/marketplace/courses`
- `GET /api/marketplace/courses/{id}`
- `GET /api/marketplace/courses/{id}/similar`

## Courses

| Action | Endpoint | Access |
| --- | --- | --- |
| List | `GET /api/courses` | Public |
| Detail | `GET /api/courses/{id}` | Public |
| Create | `POST /api/courses` | Instructor, Admin |
| Update | `PUT /api/courses/{id}` | Instructor, Admin |
| Delete | `DELETE /api/courses/{id}` | Instructor, Admin |
| Publish | `POST /api/courses/{id}/publish` | Instructor, Admin |
| XP summary | `GET /api/courses/{id}/xp-summary` | Public |
| Hierarchy | `GET /api/courses/{courseId}/hierarchy` | Public |

## Reviews

- `GET /api/courses/{id}/reviews` (public)
- `GET /api/courses/{id}/reviews/mine` (Student)
- `POST /api/courses/{id}/reviews` (Student)
- `DELETE /api/courses/{id}/reviews/{reviewId}` (authenticated)

## Modules, topics and lessons

- `GET /api/courses/{courseId}/modules`
- `POST /api/courses/{courseId}/modules`
- `PUT` / `DELETE /api/courses/modules/{moduleId}`
- `POST /api/courses/modules/{moduleId}/topics`
- `PUT` / `DELETE /api/courses/topics/{topicId}`
- `POST /api/courses/topics/{topicId}/content-items`
- `PUT` / `DELETE /api/courses/content-items/{contentItemId}`
- `POST /api/courses/modules/{moduleId}/lessons`
- `PUT /api/courses/lessons/{lessonId}`
- `GET /api/courses/lessons/{lessonId}` (authenticated)
- `GET /api/courses/lessons/{lessonId}/preview` (public)
- `POST /api/courses/lessons/{lessonId}/complete` (Student)

Write endpoints need Instructor or Admin unless noted.

## Uploads

- `POST /api/courses/upload-pdf`
- `POST /api/courses/upload-slide`
- `POST /api/courses/modules/{moduleId}/categorize-topics`

## Enrollment

Student:

- `POST /api/courses/{id}/enroll`
- `DELETE /api/courses/{courseId}/enroll`
- `GET /api/students/me/enrollment-requests`
- `GET /api/students/me/courses`
- `GET /api/courses/{courseId}/access` (any authenticated user)

Instructor and Admin:

- `POST /api/courses/{courseId}/students`
- `GET /api/courses/{courseId}/enrolled-students`
- `GET /api/courses/students/available`
- `DELETE /api/courses/{courseId}/students/{studentId}`

## Tests

- Backend: `UserCourseManagementTests`, `Phase4_CurriculumTests`
- E2E: `frontend/e2e/04-courses.spec.js`, `frontend/e2e/09-courses-slidequest.spec.js`
