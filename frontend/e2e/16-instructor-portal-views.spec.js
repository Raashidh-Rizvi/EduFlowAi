import { test, expect } from '@playwright/test';

// Covers the instructor portal sidebar views: every nav entry must render
// its view without the error boundary or the "service unavailable" banner.
test.describe('Instructor Portal Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.getByRole('button', { name: /Try Now|Get Started Free/i }).first().click();
    await page.getByLabel('Email Address').fill('instructor@eduflow.ai');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
    await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible({ timeout: 15000 });
  });

  const views = ['My Courses', 'Create Course', 'Enrollment Requests', 'My Students', 'Reviews & Ratings', 'Profile', 'Gamification & XP', 'Cohort Insights', 'Communications Hub'];

  for (const name of views) {
    test(`renders "${name}" view without errors`, async ({ page }) => {
      await page.getByRole('button', { name, exact: true }).first().click();
      await page.waitForTimeout(1500);
      await expect(page.locator('#instructor-main')).toBeVisible();
      await expect(page.getByText(/something went wrong|is not defined|cannot reach the API/i)).toHaveCount(0);
    });
  }

  test('My Courses lists seeded courses with Manage Curriculum action', async ({ page }) => {
    await page.getByRole('button', { name: 'My Courses', exact: true }).first().click();
    await expect(page.getByRole('button', { name: /Manage Curriculum/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('Manage Curriculum opens the course curriculum page', async ({ page }) => {
    await page.getByRole('button', { name: 'My Courses', exact: true }).first().click();
    await page.getByRole('button', { name: /Manage Curriculum/i }).first().click();
    await expect(page.getByText('Curriculum & Learning Journey').first()).toBeVisible({ timeout: 15000 });
  });

  test('Assessments button on a course opens the assessments workspace', async ({ page }) => {
    await page.getByRole('button', { name: 'My Courses', exact: true }).first().click();
    await page.getByRole('button', { name: /^Assessments$/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Assessments & Evaluation Engine' })).toBeVisible({ timeout: 15000 });
  });
});
