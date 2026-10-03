import { test, expect } from '@playwright/test';

const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const profile = (role = 'Student') => ({ id, fullName: 'P0 Learner', email: 'learner@example.test', role, isActive: true });
const auth = (role = 'Student') => ({ ...profile(role), userId: id, token: 'access-test', refreshToken: 'refresh-test', expiresAt: new Date(Date.now() + 3600000).toISOString() });

async function mockApi(page, { role = 'Student', invalid = false } = {}) {
  await page.route('http://127.0.0.1:59999/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/me') {
      return route.fulfill({ status: invalid ? 401 : 200, json: invalid ? { message: 'Unauthorized' } : profile(role) });
    }
    if (endpoint === '/api/auth/refresh') return route.fulfill({ status: 401, json: {} });
    if (endpoint.endsWith('/health')) return route.fulfill({ json: { status: 'healthy' } });
    return route.fulfill({ json: [] });
  });
}

async function storedSession(page, { role = 'Student', tokens = true } = {}) {
  await page.addInitScript(({ role, tokens, id }) => {
    if (sessionStorage.getItem('p0-seeded')) return;
    sessionStorage.setItem('p0-seeded', 'yes');
    localStorage.setItem('eduflow_user', JSON.stringify({ id, fullName: 'Forged Administrator', role, isActive: true }));
    if (tokens) {
      localStorage.setItem('eduflow_token', 'access-test');
      localStorage.setItem('eduflow_refresh_token', 'refresh-test');
    }
  }, { role, tokens, id });
}

async function submitLogin(page) {
  await page.getByLabel('Email Address').fill('learner@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Test-login-credential');
  await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
}

test('normal login has empty fields and no demo personas or portal login buttons', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await expect(page.getByLabel('Email Address')).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByText(/Quick-Switch Demo|Master Password|admin@eduflow|instructor@eduflow|student@eduflow/)).toHaveCount(0);
  await expect(page.locator('[id^="btn-switch-"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Switch to .* portal/ })).toHaveCount(0);
});

test('registration offers Student only and sends the Student role', async ({ page }) => {
  await mockApi(page);
  let request;
  await page.route('**/api/auth/register', async route => {
    request = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: auth() });
  });
  await page.goto('/login?mode=register');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByText('Create your Student account')).toBeVisible();
  await page.getByLabel('Full Name').fill('P0 Learner');
  await page.getByLabel('Email Address').fill('learner@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Test-login-credential');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp("/console$"));
  expect(request.role).toBe('Student');
});

test('tokenless cached Admin identity cannot open a protected portal', async ({ page }) => {
  await mockApi(page);
  await storedSession(page, { role: 'Admin', tokens: false });
  await page.goto('/console/admin');
  await expect(page).toHaveURL(new RegExp("/login"));
  await expect(page.getByRole('heading', { name: 'Sign in to Platform' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('eduflow_user'))).toBeNull();
});

test('invalid tokens clear all authentication storage and cannot render cached Admin identity', async ({ page }) => {
  await mockApi(page, { invalid: true });
  await storedSession(page, { role: 'Admin' });
  await page.goto('/console/admin');
  await expect(page).toHaveURL(new RegExp("/login"));
  expect(await page.evaluate(() => ['eduflow_user', 'eduflow_token', 'eduflow_refresh_token', 'eduflow_token_expires_at'].map(key => localStorage.getItem(key)))).toEqual([null, null, null, null]);
});

for (const portal of ['admin', 'instructor']) {
  test(portal + ' portal rejects a server-validated Student, even with cached Admin metadata', async ({ page }) => {
    await mockApi(page);
    await storedSession(page, { role: 'Admin' });
    await page.goto('/console/' + portal);
    await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).role)).toBe('Student');
  });
}

for (const route of ['/console/student', '/learn/' + id]) {
  test('unauthenticated caller is redirected from ' + route, async ({ page }) => {
    await mockApi(page);
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp("/login"));
    await expect(page.getByRole('heading', { name: 'Sign in to Platform' })).toBeVisible();
  });
}

test('Student portal rejects an authenticated Instructor', async ({ page }) => {
  await mockApi(page, { role: 'Instructor' });
  await storedSession(page, { role: 'Instructor' });
  await page.goto('/console/student');
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
});

test('protected shell waits for auth/me rather than rendering cached identity', async ({ page }) => {
  await mockApi(page);
  await storedSession(page, { role: 'Admin' });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth/me', async route => { await gate; await route.fulfill({ json: profile() }); });
  await page.goto('/console/admin');
  await expect(page.getByText('Forged Administrator')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
});

test('valid login establishes a real response-backed session', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/auth/login', route => route.fulfill({ json: auth() }));
  await page.goto('/login');
  await submitLogin(page);
  await expect(page).toHaveURL(new RegExp("/console$"));
  await expect(page.getByText('Student Workspace', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).fullName)).toBe('P0 Learner');
  expect(await page.evaluate(() => localStorage.getItem('eduflow_token'))).toBe('access-test');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).role)).toBe('Student');
  await expect(page.getByRole('button', { name: /Switch to .* portal/ })).toHaveCount(0);
});

const failures = [
  { name: 'wrong credentials', status: 401, message: 'Invalid email or password.', expected: 'Invalid email or password.' },
  { name: 'inactive account', status: 401, message: 'This user account is inactive.', expected: 'This user account is inactive.' },
  { name: 'safe validation error', status: 400, message: 'A valid email address is required.', expected: 'A valid email address is required.' },
  { name: 'backend failure', status: 500, message: 'Npgsql database stack trace secret', expected: 'Authentication service unavailable.' },
  { name: 'unsafe validation message', status: 400, message: 'Npgsql database stack trace secret', expected: 'Please check your name, email and password' },
  { name: 'network unavailable', network: true, expected: 'Authentication service unavailable.' },
];
for (const failure of failures) {
  test('login categorizes ' + failure.name + ' without establishing a session', async ({ page }) => {
    await mockApi(page);
    await page.route('**/api/auth/login', route => failure.network ? route.abort('connectionrefused') : route.fulfill({ status: failure.status, json: { message: failure.message, error: 'Npgsql stack trace' } }));
    await page.goto('/login');
    await submitLogin(page);
    await expect(page.getByText(failure.expected, { exact: false })).toBeVisible();
    await expect(page.getByText(/Npgsql|stack trace secret/)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('eduflow_token'))).toBeNull();
    await expect(page).toHaveURL(new RegExp("/login$"));
  });
}


test('refresh-only session is validated through auth/me before opening the portal', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('eduflow_refresh_token', 'refresh-test'));
  let refreshed = false;
  await page.route('**/api/auth/refresh', route => { refreshed = true; return route.fulfill({ json: auth() }); });
  await page.route('**/api/auth/me', route => route.fulfill({
    status: route.request().headers().authorization === 'Bearer access-test' ? 200 : 401,
    json: route.request().headers().authorization === 'Bearer access-test' ? profile() : {},
  }));
  await page.goto('/console/student');
  await expect(page.getByText('Student Workspace', { exact: true })).toBeVisible();
  expect(refreshed).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).role)).toBe('Student');
});

test('login without an access token cannot create a fake session', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/auth/login', route => route.fulfill({ json: profile('Admin') }));
  await page.goto('/login');
  await submitLogin(page);
  await expect(page.getByText('Authentication service unavailable.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('eduflow_user'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('eduflow_token'))).toBeNull();
});

test('Student squad view uses self lookup and never calls the staff directory', async ({ page }) => {
  await mockApi(page);
  await storedSession(page);
  let staffDirectoryRequests = 0;
  await page.route('**/api/gamification/squads', route => {
    staffDirectoryRequests++;
    return route.fulfill({ status: 403, json: {} });
  });
  await page.route('**/api/gamification/squads/' + id, route => route.fulfill({
    json: { id: 'squad-test', name: 'My authorized squad', combinedXp: 0, members: [] },
  }));
  await page.goto('/console/student');
  await page.getByRole('button', { name: 'Rankings & Squad' }).click();
  await expect(page.getByText('My authorized squad')).toBeVisible();
  expect(staffDirectoryRequests).toBe(0);
});
