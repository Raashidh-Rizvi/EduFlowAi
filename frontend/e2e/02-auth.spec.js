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
  await page.getByLabel('Password', { exact: true }).fill('StrongPassword123!');
  await page.getByLabel('Confirm Password').fill('StrongPassword123!');
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

for (const fields of [
  { email: '', password: 'Password123!', error: 'Enter a valid email address' },
  { email: 'broken', password: 'Password123!', error: 'Enter a valid email address' },
  { email: 'learner@example.test', password: '', error: 'Password is required' },
]) {
  test('login blocks invalid input: ' + JSON.stringify(fields), async ({ page }) => {
    await mockApi(page);
    let calls = 0;
    await page.route('**/api/auth/login', route => { calls++; return route.fulfill({ json: auth() }); });
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(fields.email);
    await page.getByLabel('Password', { exact: true }).fill(fields.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toContainText(fields.error);
    expect(calls).toBe(0);
  });
}

for (const fields of [
  { name: '   ', email: 'learner@example.test', password: 'Password123!', confirm: 'Password123!', error: 'Full name must be' },
  { name: 'Learner', email: 'broken', password: 'Password123!', confirm: 'Password123!', error: 'Enter a valid email address' },
  { name: 'Learner', email: 'learner@example.test', password: 'weak', confirm: 'weak', error: 'Password must be at least' },
  { name: 'Learner', email: 'learner@example.test', password: 'Password123!', confirm: '', error: 'Passwords must match.' },
  { name: 'Learner', email: 'learner@example.test', password: 'Password123!', confirm: 'Different123!', error: 'Passwords must match.' },
]) {
  test('registration validates ' + fields.error + ' / ' + fields.confirm, async ({ page }) => {
    await mockApi(page);
    let calls = 0;
    await page.route('**/api/auth/register', route => { calls++; return route.fulfill({ json: auth() }); });
    await page.goto('/login?mode=register');
    await page.getByLabel('Full Name').fill(fields.name);
    await page.getByLabel('Email Address').fill(fields.email);
    await page.getByLabel('Password', { exact: true }).fill(fields.password);
    await page.getByLabel('Confirm Password').fill(fields.confirm);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toContainText(fields.error);
    expect(calls).toBe(0);
  });
}

test('registration trims identity, never sends confirmation, and blocks duplicate submission', async ({ page }) => {
  await mockApi(page);
  let calls = 0, payload, release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth/register', async route => {
    calls++; payload = route.request().postDataJSON(); await gate;
    await route.fulfill({ status: 201, json: auth() });
  });
  await page.goto('/login?mode=register');
  await page.getByLabel('Full Name').fill('  P0 Learner  ');
  await page.getByLabel('Email Address').fill('  LEARNER@EXAMPLE.TEST  ');
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByLabel('Confirm Password').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await expect.poll(() => calls).toBe(1);
  expect(payload).toEqual({ fullName: 'P0 Learner', email: 'learner@example.test', password: 'Password123!', role: 'Student' });
  release();
  await expect(page).toHaveURL(/\/console$/);
});

test('model validation errors use safe messages and login errors never trigger refresh', async ({ page }) => {
  await mockApi(page);
  let refreshes = 0;
  await page.route('**/api/auth/refresh', route => { refreshes++; return route.fulfill({ status: 401, json: {} }); });
  await page.route('**/api/auth/login', route => route.fulfill({ status: 400, json: { errors: { Email: ['Enter a valid email address of at most 254 characters.'], Internal: ['secret stack trace'] } } }));
  await page.goto('/login');
  await submitLogin(page);
  await expect(page.getByRole('alert')).toContainText('Enter a valid email address');
  await expect(page.getByText('secret stack trace')).toHaveCount(0);
  expect(refreshes).toBe(0);
});

test('Admin login, page reload and logout use server identity and revoke the session', async ({ page }) => {
  await mockApi(page, { role: 'Admin' });
  await page.route('**/api/auth/login', route => route.fulfill({ json: auth('Admin') }));
  let logouts = 0;
  await page.route('**/api/auth/logout', route => { logouts++; return route.fulfill({ json: { message: 'Logged out successfully.' } }); });
  await page.goto('/login');
  await submitLogin(page);
  await expect(page).toHaveURL(/\/console$/);
  await page.goto('/console/admin');
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).role)).toBe('Admin');
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user'))?.role)).toBe('Admin');
  await page.evaluate(async () => { const { authService } = await import('/src/services/authService.js'); await authService.logout(); });
  await page.goto('/console/admin');
  await expect(page).toHaveURL(/\/login/);
  expect(logouts).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('eduflow_token'))).toBeNull();
  await expect(page.getByText(/admin123|Admin@gmail.com/)).toHaveCount(0);
});

test('parallel protected failures perform one refresh and each retry once', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('eduflow_token', 'expired');
    localStorage.setItem('eduflow_refresh_token', 'refresh-test');
  });
  let refreshes = 0, attempts = 0;
  await page.route('**/api/auth/refresh', async route => { refreshes++; await new Promise(resolve => setTimeout(resolve, 100)); return route.fulfill({ json: auth() }); });
  await page.route('**/api/auth-test', route => {
    attempts++;
    const valid = route.request().headers().authorization === 'Bearer access-test';
    return route.fulfill({ status: valid ? 200 : 401, json: {} });
  });
  const statuses = await page.evaluate(async () => {
    const { default: api } = await import('/src/services/api.js');
    return Promise.all([api.get('/auth-test'), api.get('/auth-test')]).then(items => items.map(item => item.status));
  });
  expect(statuses).toEqual([200, 200]); expect(refreshes).toBe(1); expect(attempts).toBe(4);
});

test('successful refresh followed by another 401 ends session without a loop', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.evaluate(() => { localStorage.setItem('eduflow_token', 'expired'); localStorage.setItem('eduflow_refresh_token', 'refresh-test'); });
  let refreshes = 0, attempts = 0;
  await page.route('**/api/auth/refresh', route => { refreshes++; return route.fulfill({ json: auth() }); });
  await page.route('**/api/auth-test', route => { attempts++; return route.fulfill({ status: 401, json: {} }); });
  await page.evaluate(async () => { const { default: api } = await import('/src/services/api.js'); await api.get('/auth-test').catch(() => {}); });
  expect(refreshes).toBe(1); expect(attempts).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('eduflow_token'))).toBeNull();
});

test('logout during refresh prevents the delayed response from recreating a session', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.evaluate(() => { localStorage.setItem('eduflow_token', 'expired'); localStorage.setItem('eduflow_refresh_token', 'refresh-test'); });
  let release, refreshing = false;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth/refresh', async route => { refreshing = true; await gate; return route.fulfill({ json: auth() }); });
  await page.route('**/api/auth-test', route => route.fulfill({ status: 401, json: {} }));
  await page.evaluate(async () => { const { default: api } = await import('/src/services/api.js'); window.pendingAuthRequest = api.get('/auth-test').catch(() => null); });
  await expect.poll(() => refreshing).toBe(true);
  await page.evaluate(async () => { const { authService } = await import('/src/services/authService.js'); await authService.logout(); });
  release();
  await page.evaluate(() => window.pendingAuthRequest);
  expect(await page.evaluate(() => ['eduflow_token', 'eduflow_refresh_token', 'eduflow_user'].map(key => localStorage.getItem(key)))).toEqual([null, null, null]);
});

test('browser restoration issues only one auth/me request under React StrictMode', async ({ page }) => {
  await mockApi(page);
  await storedSession(page);
  let meCalls = 0;
  await page.route('**/api/auth/me', async route => { meCalls++; await new Promise(resolve => setTimeout(resolve, 100)); return route.fulfill({ json: profile() }); });
  await page.goto('/console/student');
  await expect(page.getByText('Student Workspace', { exact: true })).toBeVisible();
  expect(meCalls).toBe(1);
});

test('public auth errors neither attach stale JWTs nor refresh an existing session', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('eduflow_token', 'stale-access');
    localStorage.setItem('eduflow_refresh_token', 'existing-refresh');
  });
  let authorization, refreshes = 0;
  await page.route('**/api/auth/refresh', route => { refreshes++; return route.fulfill({ status: 401, json: {} }); });
  await page.route('**/api/auth/login', route => { authorization = route.request().headers().authorization; return route.fulfill({ status: 401, json: { message: 'Invalid email or password.' } }); });
  await submitLogin(page);
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  expect(authorization).toBeUndefined(); expect(refreshes).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('eduflow_refresh_token'))).toBe('existing-refresh');
});

test('a delayed protected failure cannot clear a newer login session', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.evaluate(() => { localStorage.setItem('eduflow_token', 'old-access'); localStorage.setItem('eduflow_refresh_token', 'old-refresh'); });
  let release, waiting = false;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth-test', async route => { waiting = true; await gate; return route.fulfill({ status: 401, json: {} }); });
  await page.route('**/api/auth/login', route => route.fulfill({ json: auth() }));
  await page.evaluate(async () => { const { default: api } = await import('/src/services/api.js'); window.pendingOldRequest = api.get('/auth-test').catch(() => null); });
  await expect.poll(() => waiting).toBe(true);
  await submitLogin(page);
  await expect(page).toHaveURL(/\/console$/);
  release();
  await page.evaluate(() => window.pendingOldRequest);
  expect(await page.evaluate(() => localStorage.getItem('eduflow_token'))).toBe('access-test');
  await expect(page.getByText('Student Workspace', { exact: true })).toBeVisible();
});

test('backend profile without explicit active status cannot restore authentication', async ({ page }) => {
  await mockApi(page);
  await storedSession(page);
  await page.route('**/api/auth/me', route => route.fulfill({ json: { id, fullName: 'Learner', email: 'learner@example.test', role: 'Student' } }));
  await page.goto('/console/student');
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('eduflow_user'))).toBeNull();
});
