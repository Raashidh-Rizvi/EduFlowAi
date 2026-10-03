import { test, expect } from '@playwright/test';

/**
 * Mandatory end-to-end acceptance scenario for the LMS.
 *
 * Accounts:
 *   Instructor A : instructor@eduflow.ai   (seeded)
 *   Instructor B : instructor.b@eduflow.ai (seeded)
 *   Admin        : admin@eduflow.ai        (seeded)
 *   Student A    : registered by this suite, approved by Instructor A
 *   Student B    : registered by this suite; one request left pending on
 *                  Course A, one approved by the platform Admin on Course B
 *
 * Everything is verified against the live API (http://localhost:5204/api) and,
 * where the requirement is a UI requirement, against the rendered page.
 */

const API = process.env.E2E_API_BASE_URL || 'http://localhost:5204/api';
const PASSWORD = 'Password123!';
const RUN = Date.now().toString(36).toUpperCase();

const INSTRUCTOR_A = 'instructor@eduflow.ai';
const INSTRUCTOR_B = 'instructor.b@eduflow.ai';
const ADMIN = 'admin@eduflow.ai';

const CODE_A = `E2EA${RUN}`.slice(0, 16);
const CODE_B = `E2EB${RUN}`.slice(0, 16);
const CODE_DRAFT = `E2ED${RUN}`.slice(0, 16);
const TITLE_A = `Course Alpha ${RUN}`;
const TITLE_B = `Course Beta ${RUN}`;
const DRAFT_TITLE = `Draft Course ${RUN}`;

/** Shared scenario state, filled in by the serial tests below. */
const s = {
  authA: null,
  authB: null,
  admin: null,
  studentA: null,
  studentB: null,
  courseA: null,
  courseB: null,
  draftCourse: null,
  enrollStudentA: null,
  enrollStudentBPending: null,
  enrollStudentBApproved: null
};

// --- API helpers -------------------------------------------------------------

async function loginApi(request, email, password = PASSWORD) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.status(), `login failed for ${email}`).toBe(200);
  return res.json();
}

async function registerStudentApi(request, tag) {
  const email = `e2e.${tag}.${RUN.toLowerCase()}@eduflow.test`;
  const res = await request.post(`${API}/auth/register`, {
    data: { fullName: `E2E Student ${tag}`, email, password: PASSWORD, role: 'Student' }
  });
  expect(res.status(), `register failed for ${email}`).toBeLessThan(300);
  const body = await res.json();
  expect(body.role).toBe('Student');
  return body;
}

async function call(request, method, url, token, data) {
  const options = { method };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  if (data !== undefined) options.data = data;
  return request.fetch(`${API}${url}`, options);
}

async function json(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

async function createCourse(request, token, code, title) {
  const res = await call(request, 'POST', '/courses', token, {
    code,
    title,
    description: `${title} - created by the LMS integration suite.`,
    category: 'Quality Engineering',
    thumbnailUrl: null,
    term: 'Fall 2026',
    difficulty: 'Medium',
    durationHours: 6,
    price: 0,
    isFree: true
  });
  expect(res.status()).toBe(201);
  return json(res);
}

async function publish(request, token, courseId, isPublished = true) {
  const res = await call(request, 'POST', `/courses/${courseId}/publish`, token, { isPublished });
  expect(res.status()).toBe(200);
}

function editPayload(course, overrides = {}) {
  return {
    code: course.code,
    title: course.title,
    description: course.description || '',
    category: 'Quality Engineering',
    thumbnailUrl: null,
    term: 'Fall 2026',
    difficulty: 'Medium',
    durationHours: 6,
    price: 0,
    isFree: true,
    ...overrides
  };
}

// --- Browser helpers ---------------------------------------------------------

async function uiLogin(page, email) {
  await page.goto('/');
  await page.getByRole('button', { name: /Try Now|Get Started Free/i }).first().click();
  await expect(page.locator('text=Sign in to Platform')).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
  await expect(page.locator('#instructor-main').or(page.locator('#student-portal')).first())
    .toBeVisible({ timeout: 20000 });
}

/** Puts an already-issued session into a clean browser and opens the console. */
async function useSession(page, auth) {
  await page.goto('/');
  await page.evaluate((a) => {
    localStorage.setItem('eduflow_token', a.token);
    localStorage.setItem('eduflow_refresh_token', a.refreshToken);
    localStorage.setItem('eduflow_token_expires_at', String(new Date(a.expiresAt).getTime()));
    localStorage.setItem('eduflow_user', JSON.stringify({
      userId: a.userId, id: a.userId, fullName: a.fullName,
      email: a.email, role: a.role, avatarUrl: null, isActive: true
    }));
  }, auth);
}

async function openInstructorSection(page, section) {
  await page.evaluate((value) => sessionStorage.setItem('eduflow_instructor_section', value), section);
  await page.goto('/console');
  await expect(page.locator('#instructor-main')).toBeVisible({ timeout: 20000 });
}

async function openStudentTab(page, tab) {
  await page.evaluate((value) => sessionStorage.setItem('eduflow_student_active_tab', value), tab);
  await page.goto('/console');
}

// --- Tests -------------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('LMS mandatory integration scenario', () => {
  test('01 - accounts, courses and baseline state are provisioned', async ({ request }) => {
    s.authA = await loginApi(request, INSTRUCTOR_A);
    s.authB = await loginApi(request, INSTRUCTOR_B);
    s.admin = await loginApi(request, ADMIN);
    s.studentA = await registerStudentApi(request, 'stuA');
    s.studentB = await registerStudentApi(request, 'stuB');

    expect(s.authA.role).toBe('Instructor');
    expect(s.authB.role).toBe('Instructor');
    expect(s.admin.role).toBe('Admin');
    expect(s.studentA.role).toBe('Student');
    expect(s.studentB.role).toBe('Student');

    // Best-effort sweep of courses an earlier aborted run left behind, so stale
    // rows never pollute this run's instructor queues or the public catalog.
    for (const token of [s.authA.token, s.authB.token]) {
      const stale = (await json(await call(request, 'GET', '/instructor/courses', token))) || [];
      for (const c of stale) {
        if (/^E2E[ABDU]/.test(c.code)) await call(request, 'DELETE', `/courses/${c.id}`, token);
      }
    }

    s.courseA = await createCourse(request, s.authA.token, CODE_A, TITLE_A);
    s.courseB = await createCourse(request, s.authB.token, CODE_B, TITLE_B);
    s.draftCourse = await createCourse(request, s.authA.token, CODE_DRAFT, DRAFT_TITLE);

    expect(s.courseA.instructorId).toBe(s.authA.userId);
    expect(s.courseB.instructorId).toBe(s.authB.userId);
    expect(s.courseA.isPublished).toBe(false);
    expect(s.courseA.status).toBe('Draft');

    await publish(request, s.authA.token, s.courseA.id);
    await publish(request, s.authB.token, s.courseB.id);

    const catalog = await json(await call(request, 'GET',
      `/marketplace/courses?search=${encodeURIComponent(DRAFT_TITLE)}`, null));
    expect((catalog.items || catalog).map((c) => c.id)).not.toContain(s.draftCourse.id);
  });

  test('02 - instructor A creates, edits and publishes a course through the UI', async ({ page, request }) => {
    await uiLogin(page, INSTRUCTOR_A);

    // -- Create --
    const uiTitle = `UI Course ${RUN}`;
    const uiCode = `E2EU${RUN}`.slice(0, 16);

    await openInstructorSection(page, 'create-course');
    await page.getByLabel('Course Title').fill(uiTitle);
    await page.getByLabel('Course Code').fill(uiCode);
    // exact: the support dialog also renders a "Ticket Category" field in the DOM.
    await page.getByLabel('Category', { exact: true }).fill('Quality Engineering');
    await page.locator('form').getByRole('button', { name: /^Create Course$/ }).click();
    await expect(page.locator('text=Course created as a draft')).toBeVisible({ timeout: 20000 });

    const mine = await json(await call(request, 'GET', '/instructor/courses', s.authA.token));
    const created = mine.find((c) => c.code === uiCode);
    expect(created, 'the UI-created course must exist').toBeTruthy();
    expect(created.isPublished).toBe(false);
    expect(created.instructorId).toBe(s.authA.userId);

    // -- Edit --
    await openInstructorSection(page, 'my-courses');
    const card = page.locator('.card-premium', { hasText: uiCode }).first();
    await expect(card).toBeVisible({ timeout: 20000 });
    await card.getByRole('button', { name: /^Edit Course$/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Course Title').fill(`${uiTitle} v2`);
    await dialog.getByLabel('Description').fill('Edited by the LMS integration suite.');
    await dialog.getByRole('button', { name: /^Save changes$/ }).click();
    await expect(dialog).toBeHidden({ timeout: 20000 });
    await expect(card.locator('h3')).toContainText(`${uiTitle} v2`);

    const afterEdit = await json(await call(request, 'GET', '/instructor/courses', s.authA.token));
    const edited = afterEdit.find((c) => c.code === uiCode);
    expect(edited.title).toBe(`${uiTitle} v2`);
    expect(edited.instructorId).toBe(s.authA.userId);
    expect(edited.isPublished, 'editing must not flip publish state').toBe(false);

    // -- Publish --
    await card.getByRole('button', { name: /^Publish$/ }).click();
    await expect(card.locator('.badge-pill', { hasText: 'PUBLISHED' })).toBeVisible({ timeout: 20000 });
    const afterPublish = await json(await call(request, 'GET', '/instructor/courses', s.authA.token));
    expect(afterPublish.find((c) => c.id === edited.id).isPublished).toBe(true);

    // -- Delete --
    page.once('dialog', (dialogMsg) => dialogMsg.accept());
    await card.getByRole('button', { name: /^Delete$/ }).click();
    await expect(page.locator('.card-premium', { hasText: uiCode })).toHaveCount(0, { timeout: 20000 });
    expect((await call(request, 'GET', `/courses/${edited.id}`, s.authA.token)).status()).toBe(404);
  });

  test('03 - course ownership is enforced server-side for every write path', async ({ request }) => {
    // Instructor B must not touch Course A ...
    expect((await call(request, 'PUT', `/courses/${s.courseA.id}`, s.authB.token,
      editPayload(s.courseA, { title: 'Hijacked' }))).status()).toBe(403);
    expect((await call(request, 'DELETE', `/courses/${s.courseA.id}`, s.authB.token)).status()).toBe(403);
    expect((await call(request, 'POST', `/courses/${s.courseA.id}/publish`, s.authB.token,
      { isPublished: false })).status()).toBe(403);
    expect((await call(request, 'POST', `/courses/${s.courseA.id}/modules`, s.authB.token,
      { title: 'Injected', description: '', orderIndex: 1 })).status()).toBe(403);

    // ... and Instructor A must not touch Course B.
    expect((await call(request, 'PUT', `/courses/${s.courseB.id}`, s.authA.token,
      editPayload(s.courseB, { title: 'Hijacked' }))).status()).toBe(403);
    expect((await call(request, 'DELETE', `/courses/${s.courseB.id}`, s.authA.token)).status()).toBe(403);
    expect((await call(request, 'POST', `/courses/${s.courseB.id}/publish`, s.authA.token,
      { isPublished: false })).status()).toBe(403);
    expect((await call(request, 'POST', `/courses/${s.courseB.id}/modules`, s.authA.token,
      { title: 'Injected', description: '', orderIndex: 1 })).status()).toBe(403);

    // Course A survived all of that.
    const ownedA = (await json(await call(request, 'GET', '/instructor/courses', s.authA.token)))
      .find((c) => c.id === s.courseA.id);
    expect(ownedA.title).toBe(TITLE_A);
    expect(ownedA.isPublished).toBe(true);

    // Editing your own course works and never transfers ownership.
    const ownEdit = await call(request, 'PUT', `/courses/${s.courseA.id}`, s.authA.token,
      editPayload(s.courseA, { title: TITLE_A }));
    expect(ownEdit.status()).toBe(200);
    expect((await json(ownEdit)).instructorId).toBe(s.authA.userId);

    // Reusing somebody else's code is a 409, not a 500.
    const clash = await call(request, 'PUT', `/courses/${s.courseA.id}`, s.authA.token,
      editPayload(s.courseB, { title: TITLE_A }));
    expect(clash.status()).toBe(409);

    // Empty identity fields are rejected.
    const blank = await call(request, 'PUT', `/courses/${s.courseA.id}`, s.authA.token,
      editPayload(s.courseA, { code: '   ', title: '' }));
    expect(blank.status()).toBe(400);

    // Each instructor's list only ever contains their own courses.
    const listA = await json(await call(request, 'GET', '/instructor/courses', s.authA.token));
    const listB = await json(await call(request, 'GET', '/instructor/courses', s.authB.token));
    expect(listA.map((c) => c.id)).toContain(s.courseA.id);
    expect(listA.map((c) => c.id)).not.toContain(s.courseB.id);
    expect(listB.map((c) => c.id)).toContain(s.courseB.id);
    expect(listB.map((c) => c.id)).not.toContain(s.courseA.id);
  });

  test('04 - published courses are discoverable with the right instructor and rating', async ({ page, request }) => {
    const catalog = await json(await call(request, 'GET',
      `/marketplace/courses?search=${encodeURIComponent(TITLE_A)}`));
    const found = (catalog.items || catalog).find((c) => c.id === s.courseA.id);
    expect(found, 'published Course A must be publicly discoverable').toBeTruthy();
    const profileA = await json(await call(request, 'GET', '/auth/me', s.authA.token));
    expect(found.instructorName).toBe(profileA.fullName);
    expect(found.instructorId).toBe(profileA.id);
    expect(found.isPublished).toBe(true);
    expect(found).toHaveProperty('averageRating');
    expect(found).toHaveProperty('ratingCount');

    const catalogB = await json(await call(request, 'GET',
      `/marketplace/courses?search=${encodeURIComponent(TITLE_B)}`));
    const foundB = (catalogB.items || catalogB).find((c) => c.id === s.courseB.id);
    const profileB = await json(await call(request, 'GET', '/auth/me', s.authB.token));
    expect(foundB.instructorName).toBe(profileB.fullName);
    expect(foundB.instructorId).toBe(profileB.id);

    // The draft stays out of the public surface entirely.
    const draftCatalog = await json(await call(request, 'GET',
      `/marketplace/courses?search=${encodeURIComponent(DRAFT_TITLE)}`));
    expect((draftCatalog.items || draftCatalog).map((c) => c.id)).not.toContain(s.draftCourse.id);
    expect((await call(request, 'GET', `/marketplace/courses/${s.draftCourse.id}`, null)).status()).toBe(404);

    // Public landing page renders published course cards with instructor + rating.
    await page.goto('/');
    await expect(page.locator('.mk-card').first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator('.mk-card__instructor').first()).toBeVisible();
    await expect(page.locator('.mk-rating').first()).toBeVisible();

    // Catalog search surfaces Course A with the credited instructor.
    await page.goto(`/courses?q=${encodeURIComponent(TITLE_A)}`);
    const catalogCard = page.locator('.mk-card', { hasText: TITLE_A }).first();
    await expect(catalogCard).toBeVisible({ timeout: 25000 });
    await expect(catalogCard.locator('.mk-card__instructor', { hasText: profileA.fullName })).toBeVisible();
    await expect(catalogCard.locator('.mk-rating').first()).toBeVisible();
  });

  test('05 - only Instructor A or an Admin may approve Student A on Course A', async ({ request }) => {
    const reqA = await call(request, 'POST', `/courses/${s.courseA.id}/enroll`, s.studentA.token, {});
    expect(reqA.status()).toBe(200);
    const bodyA = await json(reqA);
    expect(bodyA.status).toBe('Pending');
    s.enrollStudentA = bodyA.enrollmentId;

    // A duplicate request collapses onto the same row.
    const reqA2 = await call(request, 'POST', `/courses/${s.courseA.id}/enroll`, s.studentA.token, {});
    expect((await json(reqA2)).enrollmentId).toBe(s.enrollStudentA);

    for (const [who, token] of [
      ['Student A (self)', s.studentA.token],
      ['Student B', s.studentB.token],
      ['Instructor B', s.authB.token]
    ]) {
      const res = await call(request, 'POST',
        `/instructor/enrollment-requests/${s.enrollStudentA}/approve`, token, {});
      expect(res.status(), `${who} must not approve Course A requests`).toBe(403);
    }
    expect((await call(request, 'POST',
      `/instructor/enrollment-requests/${s.enrollStudentA}/approve`, null, {})).status()).toBe(401);

    // Student B: one request left pending on Course A, one on Course B for the Admin.
    const reqB = await call(request, 'POST', `/courses/${s.courseA.id}/enroll`, s.studentB.token, {});
    s.enrollStudentBPending = (await json(reqB)).enrollmentId;
    const reqB2 = await call(request, 'POST', `/courses/${s.courseB.id}/enroll`, s.studentB.token, {});
    s.enrollStudentBApproved = (await json(reqB2)).enrollmentId;

    // Instructor B owns Course B but not Course A, so Course A stays off-limits.
    expect((await call(request, 'POST',
      `/instructor/enrollment-requests/${s.enrollStudentBPending}/approve`, s.authB.token, {})).status())
      .toBe(403);
    // No student may approve their own request, on either course.
    expect((await call(request, 'POST',
      `/instructor/enrollment-requests/${s.enrollStudentBPending}/approve`, s.studentB.token, {})).status())
      .toBe(403);
    expect((await call(request, 'POST',
      `/instructor/enrollment-requests/${s.enrollStudentBApproved}/approve`, s.studentB.token, {})).status())
      .toBe(403);
    // Instructor A owns Course A but not Course B either.
    expect((await call(request, 'POST',
      `/instructor/enrollment-requests/${s.enrollStudentBApproved}/approve`, s.authA.token, {})).status())
      .toBe(403);

    // An appropriately authorized Admin may approve on somebody else's course.
    expect((await call(request, 'POST',
      `/instructor/enrollment-requests/${s.enrollStudentBApproved}/approve`, s.admin.token, {})).status())
      .toBe(200);

    // Student A is still pending everywhere it matters.
    expect((await json(await call(request, 'GET', `/courses/${s.courseA.id}/access`, s.studentA.token)))
      .hasAccess).toBe(false);
    expect((await call(request, 'GET', `/courses/${s.courseA.id}/modules`, s.studentA.token)).status())
      .toBe(403);
  });

  test('06 - Instructor A approves in the UI and access opens for Student A only', async ({ request, page }) => {
    await useSession(page, s.authA);
    await openInstructorSection(page, 'enrollment-requests');
    await expect(page.locator('text=Enrollment Requests').first()).toBeVisible({ timeout: 20000 });

    // Scoped by this run's unique student email so leftover rows from earlier runs never match.
    const stuARow = page.locator('.card-premium', { hasText: s.studentA.email });
    const row = stuARow.first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(TITLE_A);
    await row.getByRole('button', { name: /Approve/ }).click();

    // The request leaves the Pending queue and lands in Approved.
    await expect(stuARow).toHaveCount(0, { timeout: 20000 });
    await page.getByRole('button', { name: /^Approved\s*\(/ }).click();
    await expect(stuARow.first())
      .toBeVisible({ timeout: 20000 });

    // -- Access matrix after the UI approval --
    expect((await json(await call(request, 'GET', `/courses/${s.courseA.id}/access`, s.studentA.token)))
      .hasAccess).toBe(true);
    expect((await call(request, 'GET', `/courses/${s.courseA.id}/modules`, s.studentA.token)).status())
      .toBe(200);

    expect((await json(await call(request, 'GET', `/courses/${s.courseB.id}/access`, s.studentA.token)))
      .hasAccess).toBe(false);
    expect((await call(request, 'GET', `/courses/${s.courseB.id}/modules`, s.studentA.token)).status())
      .toBe(403);

    // Student B: approved on Course B, still pending on Course A.
    expect((await json(await call(request, 'GET', `/courses/${s.courseB.id}/access`, s.studentB.token)))
      .hasAccess).toBe(true);
    expect((await json(await call(request, 'GET', `/courses/${s.courseA.id}/access`, s.studentB.token)))
      .hasAccess).toBe(false);
    expect((await call(request, 'GET', `/courses/${s.courseA.id}/modules`, s.studentB.token)).status())
      .toBe(403);

    const myA = await json(await call(request, 'GET', '/students/me/courses', s.studentA.token));
    expect(myA.map((c) => c.courseId)).toContain(s.courseA.id);
    expect(myA.map((c) => c.courseId)).not.toContain(s.courseB.id);

    const myB = await json(await call(request, 'GET', '/students/me/courses', s.studentB.token));
    expect(myB.map((c) => c.courseId)).toContain(s.courseB.id);
    expect(myB.find((c) => c.courseId === s.courseA.id).status).toBe('Pending');

    // -- UI: Student A's portal shows Course A and never Course B --
    await useSession(page, s.studentA);
    await openStudentTab(page, 'enrollments');
    await expect(page.locator('text=My Enrollment Requests').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator(`text=${TITLE_A}`).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator(`text=${TITLE_B}`)).toHaveCount(0);

    // -- UI: Student B's portal shows both rows, each labelled with its status --
    await useSession(page, s.studentB);
    await openStudentTab(page, 'enrollments');
    await expect(page.locator('text=My Enrollment Requests').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator(`text=${TITLE_A}`).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator(`text=${TITLE_B}`).first()).toBeVisible({ timeout: 20000 });
  });

  test('07 - reviews are accepted only from eligible students', async ({ request, page }) => {
    // Anonymous visitors get an invitation, not a form.
    await page.goto(`/courses/${s.courseA.id}`);
    await expect(page.locator('text=Leave a review').first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator('text=Log in with a student account to review this course.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Submit review$/ })).toHaveCount(0);

    // Instructors never get the form.
    await useSession(page, s.authA);
    await page.goto(`/courses/${s.courseA.id}`);
    await expect(page.locator('text=Instructors and admins cannot leave reviews').first())
      .toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('button', { name: /^Submit review$/ })).toHaveCount(0);

    // Server-side eligibility.
    expect((await call(request, 'POST', `/courses/${s.courseA.id}/reviews`, s.studentB.token,
      { rating: 1, comment: 'Not approved yet.' })).status()).toBe(403);
    expect((await call(request, 'POST', `/courses/${s.courseB.id}/reviews`, s.studentA.token,
      { rating: 1, comment: 'Not enrolled here.' })).status()).toBe(403);
    expect((await call(request, 'POST', `/courses/${s.courseA.id}/reviews`, s.authA.token,
      { rating: 5, comment: 'Instructor rating his own course.' })).status()).toBe(403);

    const accepted = await call(request, 'POST', `/courses/${s.courseA.id}/reviews`, s.studentA.token,
      { rating: 5, comment: 'Approved student review from the LMS integration suite.' });
    expect(accepted.status()).toBe(200);

    const approvedList = await json(await call(request, 'GET', `/courses/${s.courseA.id}/reviews`, null));
    expect(approvedList.map((r) => r.studentName)).toContain('E2E Student stuA');

    // The marketplace card picks the rating up.
    const catalog = await json(await call(request, 'GET',
      `/marketplace/courses?search=${encodeURIComponent(TITLE_A)}`));
    const found = (catalog.items || catalog).find((c) => c.id === s.courseA.id);
    expect(found.ratingCount).toBeGreaterThanOrEqual(1);
    expect(found.averageRating).toBeGreaterThan(0);

    // Eligible student sees a working form in the UI.
    await useSession(page, s.studentA);
    await page.goto(`/courses/${s.courseA.id}`);
    await expect(page.getByRole('button', { name: /Update review|Submit review/i }).first())
      .toBeVisible({ timeout: 25000 });

    // Ineligible student submits and is refused by the server, in the UI.
    await useSession(page, s.studentB);
    await page.goto(`/courses/${s.courseA.id}`);
    await page.getByRole('radio', { name: '1 star' }).click();
    await page.getByLabel('Your review').fill('Should be refused by the backend.');
    await page.getByRole('button', { name: /^Submit review$/ }).click();
    await expect(page.locator('text=/approved enrollment|awaiting instructor approval|not enrolled|only students/i').first())
      .toBeVisible({ timeout: 25000 });
  });

  test('08 - two simultaneous browser sessions stay fully isolated', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await useSession(pageA, s.studentA);
      await useSession(pageB, s.studentB);
      await openStudentTab(pageA, 'enrollments');
      await openStudentTab(pageB, 'enrollments');

      await expect(pageA.locator('text=My Enrollment Requests').first()).toBeVisible({ timeout: 25000 });
      await expect(pageB.locator('text=My Enrollment Requests').first()).toBeVisible({ timeout: 25000 });

      // Each session renders only its own rows and identity.
      await expect(pageA.locator(`text=${TITLE_A}`).first()).toBeVisible();
      await expect(pageA.locator(`text=${TITLE_B}`)).toHaveCount(0);
      await expect(pageA.locator('text=E2E Student stuB')).toHaveCount(0);

      await expect(pageB.locator(`text=${TITLE_A}`).first()).toBeVisible();
      await expect(pageB.locator(`text=${TITLE_B}`).first()).toBeVisible();
      await expect(pageB.locator('text=E2E Student stuA')).toHaveCount(0);

      // Refreshing preserves the isolation.
      await pageA.reload();
      await pageB.reload();
      await expect(pageA.locator('text=E2E Student stuB')).toHaveCount(0);
      await expect(pageB.locator('text=E2E Student stuA')).toHaveCount(0);

      // Ending session A must not disturb session B. Clear both storages and force a
      // full navigation (reload() alone can be held up by the page's own guards).
      await pageA.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await pageA.goto('/console');
      await expect(pageA).toHaveURL(/\/login/, { timeout: 20000 });
      await expect(pageA.locator('text=My Enrollment Requests')).toHaveCount(0, { timeout: 20000 });

      await pageB.reload();
      await expect(pageB.locator('text=My Enrollment Requests').first()).toBeVisible({ timeout: 25000 });
      await expect(pageB.locator(`text=${TITLE_B}`).first()).toBeVisible();
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('09 - anonymous, forged and revoked sessions are rejected', async ({ request, page }) => {
    const protectedUrls = [
      '/students/me/courses',
      '/students/me/enrollment-requests',
      '/instructor/courses',
      '/instructor/dashboard',
      '/instructor/enrollment-requests',
      '/auth/me'
    ];
    for (const url of protectedUrls) {
      expect((await call(request, 'GET', url, null)).status(), `${url} anonymous`).toBe(401);
      const forged = await request.get(`${API}${url}`,
        { headers: { Authorization: 'Bearer not-a-real-token' } });
      expect(forged.status(), `${url} forged token`).toBe(401);
    }

    expect((await call(request, 'POST', `/courses/${s.courseA.id}/enroll`, null, {})).status()).toBe(401);
    expect((await call(request, 'DELETE', `/courses/${s.courseA.id}`, null)).status()).toBe(401);
    expect((await call(request, 'GET', '/admin/users', null)).status()).toBe(401);

    // A refresh token is single-use: logout revokes it for good.
    expect((await call(request, 'POST', '/auth/logout', null,
      { refreshToken: s.studentA.refreshToken })).status()).toBe(200);
    const reuse = await call(request, 'POST', '/auth/refresh', null, {
      token: s.studentA.token,
      refreshToken: s.studentA.refreshToken
    });
    expect(reuse.status(), 'a revoked refresh token must not be reusable').toBe(401);
    s.studentA = await loginApi(request, s.studentA.email);

    // The browser clears a broken session and returns to the login screen.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('eduflow_token', 'garbage');
      localStorage.setItem('eduflow_refresh_token', 'garbage');
      localStorage.setItem('eduflow_user', JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000000',
        id: '00000000-0000-0000-0000-000000000000',
        fullName: 'Broken Session', email: 'broken@test.local', role: 'Student'
      }));
    });
    await page.goto('/console');
    await expect(page).toHaveURL(/\/login/, { timeout: 25000 });
  });

  test('10 - ownership, enrollment and ratings survive logout, login and refresh', async ({ request, page }) => {
    const listA = await json(await call(request, 'GET', '/instructor/courses', s.authA.token));
    expect(listA.find((c) => c.id === s.courseA.id)).toBeTruthy();
    expect(listA.find((c) => c.id === s.courseB.id)).toBeFalsy();

    expect((await json(await call(request, 'GET', `/courses/${s.courseA.id}/access`, s.studentA.token)))
      .hasAccess).toBe(true);
    expect((await json(await call(request, 'GET', `/courses/${s.courseA.id}/access`, s.studentB.token)))
      .hasAccess).toBe(false);

    const reviews = await json(await call(request, 'GET', `/courses/${s.courseA.id}/reviews`, null));
    expect(reviews.find((r) => r.studentName === 'E2E Student stuA')).toBeTruthy();
    expect(reviews.find((r) => r.studentName === 'E2E Student stuB')).toBeFalsy();

    await useSession(page, s.authA);
    await openInstructorSection(page, 'my-courses');
    await expect(page.locator('.card-premium', { hasText: CODE_A }).first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator('.card-premium', { hasText: CODE_B })).toHaveCount(0);

    // Full logout, fresh login, identical picture.
    await page.evaluate(() => localStorage.clear());
    await page.goto('/console');
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });

    await uiLogin(page, INSTRUCTOR_A);
    await openInstructorSection(page, 'my-courses');
    await expect(page.locator('.card-premium', { hasText: CODE_A }).first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator('.card-premium', { hasText: CODE_B })).toHaveCount(0);
  });

  test('11 - cleanup removes every course this suite created', async ({ request }) => {
    for (const [token, course] of [
      [s.authA.token, s.courseA],
      [s.authB.token, s.courseB],
      [s.authA.token, s.draftCourse]
    ]) {
      const res = await call(request, 'DELETE', `/courses/${course.id}`, token);
      expect([200, 404]).toContain(res.status());
    }
  });
});
