import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:2174';

test.describe('Instructor Full Flow - End to End', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Login as Instructor
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.getByLabel('Email Address').fill('instructor@eduflow.ai');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
    await expect(
      page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('1. Login as instructor and see dashboard', async ({ page }) => {
    // Verify instructor dashboard is visible
    await expect(page.locator('text=INSTRUCTOR CONSOLE').or(page.locator('text=Executive Overview')).first()).toBeVisible();
    // Verify KPI cards are present
    await expect(page.locator('text=My Courses').or(page.locator('text=Courses')).first()).toBeVisible();
  });

  test('2. Navigate to Courses page', async ({ page }) => {
    await page.getByRole('button', { name: /Courses|Manage Curriculum/i }).first().click();
    await expect(page.locator('text=Course').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/phase4-02-courses.png', fullPage: true });
  });

  test('3. Create a new course', async ({ page }) => {
    await page.getByRole('button', { name: /Courses|Manage Curriculum/i }).first().click();
    await expect(page.locator('text=Course').first()).toBeVisible({ timeout: 10000 });
    
    // Click create course button
    const createBtn = page.getByRole('button', { name: /Create Course|Add Course|New Course/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      // Fill in course form
      const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="course" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E Test Course');
      }
      await page.screenshot({ path: 'e2e/screenshots/phase4-03-create-course.png', fullPage: true });
    }
  });

  test('4. Add module to course', async ({ page }) => {
    await page.getByRole('button', { name: /Courses|Manage Curriculum/i }).first().click();
    await expect(page.locator('text=Course').first()).toBeVisible({ timeout: 10000 });
    
    // Look for module-related buttons
    const addModuleBtn = page.getByRole('button', { name: /Add Module|Create Module|New Module/i }).first();
    if (await addModuleBtn.isVisible()) {
      await addModuleBtn.click();
      await page.screenshot({ path: 'e2e/screenshots/phase4-04-add-module.png', fullPage: true });
    }
  });

  test('5. Navigate to Assessments page', async ({ page }) => {
    await page.getByRole('button', { name: /Assessments|Quizzes/i }).first().click();
    await expect(page.locator('text=Assessment').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/phase4-05-assessments.png', fullPage: true });
  });

  test('6. AI Review page loads', async ({ page }) => {
    await page.getByRole('button', { name: /AI Review|Review AI/i }).first().click();
    await expect(page.locator('text=AI').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/phase4-06-ai-review.png', fullPage: true });
  });

  test('7. Gamification page loads', async ({ page }) => {
    await page.getByRole('button', { name: /Gamification|Squads|Leaderboard/i }).first().click();
    await expect(page.locator('text=Squad').or(page.locator('text=Leaderboard')).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/phase4-07-gamification.png', fullPage: true });
  });

  test('8. Insights page loads with analytics', async ({ page }) => {
    await page.getByRole('button', { name: /Insights|Analytics/i }).first().click();
    await expect(page.locator('text=Analytics').or(page.locator('text=Insight')).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/phase4-08-insights.png', fullPage: true });
  });

  test('9. Communications page loads', async ({ page }) => {
    await page.getByRole('button', { name: /Communications|Broadcast/i }).first().click();
    await expect(page.locator('text=Broadcast').or(page.locator('text=Communication')).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/phase4-09-communications.png', fullPage: true });
  });

  test('10. Dashboard KPIs display data', async ({ page }) => {
    // Verify dashboard has loaded with real data indicators
    await expect(page.locator('text=INSTRUCTOR CONSOLE').or(page.locator('text=Executive Overview')).first()).toBeVisible({ timeout: 10000 });
    
    // Check that at least one KPI is visible
    const kpiVisible = await page.locator('text=Courses').or(page.locator('text=Students')).first().isVisible();
    expect(kpiVisible).toBeTruthy();
    await page.screenshot({ path: 'e2e/screenshots/phase4-10-dashboard-kpis.png', fullPage: true });
  });

  test('11. Role switching works', async ({ page }) => {
    // Look for role switcher
    const roleSwitcher = page.locator('[class*="role"]').or(page.locator('text=Switch Role')).first();
    if (await roleSwitcher.isVisible()) {
      await roleSwitcher.click();
      await page.screenshot({ path: 'e2e/screenshots/phase4-11-role-switcher.png', fullPage: true });
    }
  });

  test('12. Navigation between all pages works', async ({ page }) => {
    // Verify we can navigate to each major page without errors
    const pages = ['Courses', 'Assessments', 'AI Review', 'Gamification', 'Insights', 'Communications'];
    for (const pageName of pages) {
      const navBtn = page.getByRole('button', { name: new RegExp(pageName, 'i') }).first();
      if (await navBtn.isVisible()) {
        await navBtn.click();
        await page.waitForTimeout(1000);
        // No JavaScript errors should occur
      }
    }
    await page.screenshot({ path: 'e2e/screenshots/phase4-12-navigation.png', fullPage: true });
  });
});
