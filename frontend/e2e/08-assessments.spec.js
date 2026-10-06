import { test, expect } from '@playwright/test';
import { gotoInstructorSection } from './helpers.js';

test.describe('Assessments & AI Quiz Generation Exploration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Login as Instructor
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.getByLabel('Email Address').fill('instructor@eduflow.ai');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
    await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Assessments workspace and inspect evaluation suites', async ({ page }) => {
    // Click Assessments & Quizzes in sidebar
    await gotoInstructorSection(page, 'assessments');

    // Verify Assessments page loaded
    await expect(page.getByRole('heading', { name: 'Assessments & Evaluation Engine' })).toBeVisible({ timeout: 10000 });

    // Verify sub-tabs or assessments list exists
    await expect(page.locator('text=Active Quizzes').or(page.locator('text=No Assessments Configured')).first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/13-assessments-workspace.png', fullPage: true });
  });

  test('should allow opening AI Quiz Generation modal or creating assessment', async ({ page }) => {
    await gotoInstructorSection(page, 'assessments');

    // Find AI Quiz Generation or Create Assessment button
    const aiGenBtn = page.getByRole('button', { name: /AI Quiz Generator|Generate with AI|\+ Generate/i }).first();
    const createBtn = page.getByRole('button', { name: /Create Assessment|\+ New Quiz|Create First Assessment/i }).first();

    if (await aiGenBtn.isVisible()) {
      await aiGenBtn.click();
      await expect(page.locator('text=AI Quiz Generator').or(page.locator('text=Generate')).first()).toBeVisible();
      await page.screenshot({ path: 'e2e/screenshots/14-ai-quiz-modal.png' });
    } else if (await createBtn.isVisible()) {
      await createBtn.click();
      await expect(page.locator('text=Create Assessment').or(page.locator('input[placeholder*="Quiz Title"]')).first()).toBeVisible();
      await page.screenshot({ path: 'e2e/screenshots/14-create-quiz-modal.png' });
    }
  });
});
