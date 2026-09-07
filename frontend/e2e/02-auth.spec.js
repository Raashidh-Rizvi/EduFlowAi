import { test, expect } from '@playwright/test';

test.describe('Authentication & Role Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Navigate to Login page
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await expect(page.locator('text=Sign in to Platform')).toBeVisible();
  });

  test('should display pre-configured demo personas and allow one-click fill', async ({ page }) => {
    // Verify Demo Personas are listed
    await expect(page.locator('text=Quick-Switch Demo Personas:')).toBeVisible();
    await expect(page.locator('text=Dr. Sarah Jenkins')).toBeVisible();
    await expect(page.locator('text=Alex Rivera')).toBeVisible();
    await expect(page.locator('text=System Administrator')).toBeVisible();

    // Click Student demo persona
    await page.locator('text=Alex Rivera').click();

    // Verify email input updated
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('student@eduflow.ai');

    // Click Admin demo persona
    await page.locator('text=System Administrator').click();
    await expect(emailInput).toHaveValue('admin@eduflow.ai');

    // Click Instructor demo persona
    await page.locator('text=Dr. Sarah Jenkins').click();
    await expect(emailInput).toHaveValue('instructor@eduflow.ai');

    await page.screenshot({ path: 'e2e/screenshots/02-demo-persona-switch.png' });
  });

  test('should successfully authenticate as Instructor and open Instructor Console', async ({ page }) => {
    // Select Instructor
    await page.locator('text=Dr. Sarah Jenkins').click();

    // Click submit
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();

    // Should navigate to Instructor dashboard
    await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /AI Study Approvals/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/03-instructor-dashboard.png' });
  });

  test('should successfully authenticate as Student and open Student Portal', async ({ page }) => {
    // Select Student
    await page.locator('text=Alex Rivera').click();

    // Click submit
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();

    // Should navigate to Student Portal
    await expect(page.locator('text=Student Workspace').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Curriculum/i })).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/04-student-portal-home.png' });
  });

  test('should handle logout correctly and return to Landing Page', async ({ page }) => {
    // Login as Instructor
    await page.locator('text=Dr. Sarah Jenkins').click();
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
    await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible();

    // Open User Profile Pill in Navbar to reveal popover
    await page.locator('header').locator('text=Dr. Sarah Jenkins').click();

    // Click Sign Out button inside the popover
    const signOutBtn = page.getByRole('button', { name: /Sign Out/i }).first();
    await signOutBtn.click();

    // Should return to Login or Landing Page
    await expect(page.locator('text=Sign in to Platform').first()).toBeVisible({ timeout: 10000 });
  });
});
