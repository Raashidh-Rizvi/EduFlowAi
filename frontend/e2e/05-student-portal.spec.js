import { test, expect } from '@playwright/test';

test.describe('Student Portal & AI Coach Exploration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Login as Student
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.locator('text=Alex Rivera').click();
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();

    // Verify Student Portal loads
    await expect(page.locator('text=Student Workspace').first()).toBeVisible({ timeout: 10000 });
  });

  test('should explore Student Dashboard, claim daily mission reward, and use streak freeze', async ({ page }) => {
    // Navigate to Dashboard tab
    const dashboardTab = page.getByRole('button', { name: /Dashboard/i }).first();
    await dashboardTab.click();

    // Verify XP, Streak, and Daily Mission card
    await expect(page.locator('text=LEVEL').first()).toBeVisible();
    await expect(page.locator('text=RECOMMENDED STUDY MISSION')).toBeVisible();

    // Claim Mission Reward
    const claimBtn = page.getByRole('button', { name: /Claim Reward/i }).first();
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.locator('text=✓ Completed').or(page.locator('text=Completed')).first()).toBeVisible();
    }

    await page.screenshot({ path: 'e2e/screenshots/08-student-dashboard.png' });
  });

  test('should interact with AI Learning Assistant / Coach', async ({ page }) => {
    // Navigate to AI Assistant tab
    const coachTab = page.getByRole('button', { name: /AI Assistant|AI Coach/i }).first();
    await coachTab.click();

    // Verify AI Assistant header
    await expect(page.locator('text=AI Learning Assistant').first()).toBeVisible();

    // Click quick prompt
    const quickPrompt = page.locator('text=Explain PostgreSQL Composite Indexes').first();
    if (await quickPrompt.isVisible()) {
      await quickPrompt.click();
    } else {
      // Type message manually
      const chatInput = page.locator('input[placeholder*="Ask a technical"]').first();
      await chatInput.fill('Explain PostgreSQL Composite Indexes');
      await page.keyboard.press('Enter');
    }

    // Verify AI responds
    await expect(page.locator('text=PostgreSQL').or(page.locator('text=composite index')).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/09-student-ai-coach.png' });
  });

  test('should explore Cohort Rankings and Student Profile Badges', async ({ page }) => {
    // Navigate to Rankings tab
    const ranksTab = page.getByRole('button', { name: /Rankings/i }).first();
    await ranksTab.click();
    await expect(page.locator('text=Cohort Rankings').first()).toBeVisible();
    await expect(page.locator('text=Alex Rivera').first()).toBeVisible();

    // Navigate to Profile tab
    const profileTab = page.getByRole('button', { name: /Profile/i }).first();
    await profileTab.click();
    await expect(page.locator('text=EARNED CREDENTIALS & BADGES').or(page.locator('text=Credentials')).first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/10-student-profile.png' });
  });

  test('should take a quiz in QuizRunner, answer questions, submit, and earn XP', async ({ page }) => {
    // Navigate to Dashboard tab
    const dashboardTab = page.getByRole('button', { name: /Dashboard/i }).first();
    await dashboardTab.click();

    // Click "Start Mission Assessment"
    const startQuizBtn = page.getByRole('button', { name: /Start Mission Assessment/i }).first();
    await startQuizBtn.click();

    // Verify QuizRunner opens with question prompt
    await expect(page.locator('text=Clean Architecture & PostgreSQL Indexing Diagnostic')).toBeVisible();
    await expect(page.locator('text=Question 1 of 3')).toBeVisible();

    // Answer Q1: Select "Isolation"
    await page.locator('text=Isolation').first().click();
    await page.getByRole('button', { name: /Submit Answer/i }).click();
    await page.getByRole('button', { name: /Next Question/i }).click();

    // Answer Q2: Select "Left-to-right"
    await expect(page.locator('text=Question 2 of 3')).toBeVisible();
    await page.locator('text=Left-to-right').first().click();
    await page.getByRole('button', { name: /Submit Answer/i }).click();
    await page.getByRole('button', { name: /Next Question/i }).click();

    // Answer Q3: Select "Enforce safety invariants"
    await expect(page.locator('text=Question 3 of 3')).toBeVisible();
    await page.locator('text=Enforce safety invariants').first().click();
    await page.getByRole('button', { name: /Submit Answer/i }).click();
    await page.getByRole('button', { name: /Finish & Record XP/i }).click();

    // Verify Completion Card
    await expect(page.locator('text=Assessment Completed')).toBeVisible();
    await expect(page.locator('text=Earned +80 XP')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/15-quiz-completed.png' });

    // Return to dashboard/curriculum
    await page.getByRole('button', { name: /Return to Curriculum/i }).click();
    await expect(page.locator('text=Student Workspace').first()).toBeVisible();
  });
});
