import { test, expect } from '@playwright/test';

// The P0 authentication hardening removed the header fast role-switcher
// (#btn-switch-* buttons) — 02-auth asserts those elements stay gone because a
// role change must always require a full credential login. This spec covers
// that secure transition path across all three roles.
test.describe('Secure Role Transitions (login-based)', () => {
  const loginAs = async (page, email) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
  };

  const resetSession = async (page) => {
    await page.evaluate(() => localStorage.clear());
  };

  test('should switch roles only through full login: Student, Admin, Instructor, Student', async ({ page }) => {
    await page.goto('/');

    // Security contract: no direct role-switch buttons anywhere in the header.
    await expect(page.locator('[id^="btn-switch-"]')).toHaveCount(0);

    // 1. Student login → Student Workspace
    await loginAs(page, 'student@eduflow.ai');
    await expect(page.locator('text=Student Workspace').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/10-student-portal-header.png' });

    // 2. Sign out (clear the session) and log in as Admin → Platform Summary
    await resetSession(page);
    await loginAs(page, 'admin@eduflow.ai');
    await expect(page.getByRole('heading', { name: 'Platform Summary' })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/10-admin-console-header.png' });

    // 3. Sign out and log in as Instructor → Executive Overview
    await resetSession(page);
    await loginAs(page, 'instructor@eduflow.ai');
    await expect(page.getByRole('heading', { name: 'Executive Overview' })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/10-instructor-console-header.png' });

    // 4. Back to Student — every transition went through credentials.
    await resetSession(page);
    await loginAs(page, 'student@eduflow.ai');
    await expect(page.locator('text=Student Workspace').first()).toBeVisible({ timeout: 15000 });
  });
});
