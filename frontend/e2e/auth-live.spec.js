import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = process.env.AUTH_API_URL || 'http://localhost:5204';
const studentEmail = 'auth-live-' + randomUUID() + '@example.test';
const studentPassword = 'Student-' + randomUUID() + '!A1';

async function logout(page) {
  await page.evaluate(async () => {
    const { authService } = await import('/src/services/authService.js');
    await authService.logout();
  });
  await page.goto('/console');
  await expect(page).toHaveURL(/\/login/);
}

async function signIn(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /Authenticate & Continue/ }).click();
  await expect(page).toHaveURL(/\/console$/);
}

test('real PostgreSQL Student registration, login, restoration, refresh, role denial and logout', async ({ page, request }) => {
  const health = await request.get(api + '/health');
  expect(health.status()).toBe(200);
  await page.goto('/login?mode=register');
  await page.getByLabel('Full Name').fill('Authentication Live Verification');
  await page.getByLabel('Email Address').fill(studentEmail);
  await page.getByLabel('Password', { exact: true }).fill(studentPassword);
  await page.getByLabel('Confirm Password').fill(studentPassword);
  await page.getByRole('button', { name: 'Register Account' }).click();
  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByText('Student Workspace', { exact: true })).toBeVisible();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).id);
  expect(id).toBeTruthy();
  await logout(page);
  const start = Date.now();
  await signIn(page, studentEmail.toUpperCase(), studentPassword);
  await expect(page.getByText('Student Workspace', { exact: true })).toBeVisible();
  console.log('Observed Student visible login duration (ms): ' + (Date.now() - start));
  await page.reload();
  await expect(page.getByText('Student Workspace', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).id)).toBe(id);
  await page.goto('/console/admin');
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('eduflow_token'));
  const forbidden = await request.get(api + '/api/admin/users', { headers: { Authorization: 'Bearer ' + token } });
  expect(forbidden.status()).toBe(403);
  // Force a real refresh by replacing only the access credential; the server validates the persisted refresh token.
  await page.evaluate(() => localStorage.setItem('eduflow_token', 'expired-test-token'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user')).id)).toBe(id);
  const refresh = await page.evaluate(() => localStorage.getItem('eduflow_refresh_token'));
  await logout(page);
  const revoked = await request.post(api + '/api/auth/refresh', { data: { refreshToken: refresh } });
  expect(revoked.status()).toBe(401);
  await page.goto('/console/student');
  await expect(page).toHaveURL(/\/login/);
});

test('real controlled Development Admin login, restoration, backend authorization and logout', async ({ page, request }) => {
  test.skip(!process.env.AUTH_ADMIN_EMAIL || !process.env.AUTH_ADMIN_PASSWORD,
    'Provide the internally provisioned Development admin credential through process environment.');
  expect((await request.get(api + '/health')).status()).toBe(200);
  await signIn(page, process.env.AUTH_ADMIN_EMAIL, process.env.AUTH_ADMIN_PASSWORD);
  await page.goto('/console/admin');
  await expect(page.getByRole('heading', { name: 'Platform Summary', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user'))?.role)).toBe('Admin');
  const token = await page.evaluate(() => localStorage.getItem('eduflow_token'));
  expect((await request.get(api + '/api/admin/users', { headers: { Authorization: 'Bearer ' + token } })).status()).toBe(200);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Platform Summary', exact: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('eduflow_user'))?.role)).toBe('Admin');
  await logout(page);
  await page.goto('/console/admin');
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('eduflow_user'))).toBeNull();
});
