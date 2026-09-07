import { test, expect } from '@playwright/test';

test.describe('Gamification & Admin Governance Exploration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should explore Gamification Dashboard as Instructor', async ({ page }) => {
    // Login as Instructor
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.locator('text=Dr. Sarah Jenkins').click();
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
    await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible({ timeout: 10000 });

    // Click Gamification in sidebar
    await page.getByRole('button', { name: /Gamification & XP/i }).click();

    // Verify Gamification banner & tabs
    await expect(page.getByRole('heading', { name: /Gamification & Team Command Center|Gamification & Experience Progression/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Quantum Coders').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/11-gamification-dashboard.png' });
  });

  test('should explore Admin Management as System Administrator', async ({ page }) => {
    // Login as Admin
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.locator('text=System Administrator').click();
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();

    // Verify Admin is logged in
    await expect(page.getByRole('heading', { name: 'Executive Overview' })).toBeVisible({ timeout: 10000 });

    // Click Platform Governance in sidebar
    const adminLink = page.getByRole('button', { name: /Platform Governance/i });
    await expect(adminLink).toBeVisible();
    await adminLink.click();

    await expect(page.getByRole('heading', { name: 'Platform Governance & Administration', level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=System Administrator').first()).toBeVisible();

    // Check sub-tabs: Configuration
    const configTab = page.locator('button', { hasText: /Configuration|System Settings/i }).or(page.locator('text=Configuration')).first();
    if (await configTab.isVisible()) {
      await configTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'e2e/screenshots/12-admin-management.png' });
  });
});
