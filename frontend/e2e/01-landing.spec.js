import { test, expect } from '@playwright/test';

test.describe('Landing Page Exploration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should render hero title, brand badge, and value propositions', async ({ page }) => {
    await page.goto('/');

    // Verify Brand Logo
    await expect(page.locator('header')).toContainText('EduFlow');

    // Verify Hero Heading
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('Discover courses that');
    await expect(heroHeading).toContainText('move you forward');

    // Live eyebrow + platform stats (rendered from GET /api/marketplace/stats)
    await expect(page.locator('.mk-eyebrow').first()).toContainText('published courses live');
    const heroStats = page.locator('.mk-hero__stats');
    await expect(heroStats).toContainText('Courses');
    await expect(heroStats).toContainText('Instructors');
    await expect(heroStats).toContainText('Enrollments');
    await expect(heroStats).toContainText('Avg. rating');

    // Verify CTAs
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await expect(tryNowBtn).toBeVisible();

    // Capture screenshot of landing page
    await page.screenshot({ path: 'e2e/screenshots/01-landing-page.png', fullPage: true });
  });

  test('should navigate to the Login / Auth screen when clicking CTA', async ({ page }) => {
    await page.goto('/');

    // Click the hero CTA ("Get Started Free" / "Try Now")
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();

    // Verify Login page appears
    await expect(page.locator('text=Sign in to Platform')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Capture screenshot of Login screen
    await page.screenshot({ path: 'e2e/screenshots/02-login-modal.png' });
  });
});
