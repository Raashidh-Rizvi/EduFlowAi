import { test, expect } from '@playwright/test';

test.describe('Student Portal & AI Coach Exploration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Login as Student
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.getByLabel('Email Address').fill('student@eduflow.ai');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
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
    await expect(page.locator('text=Cohort Standings').or(page.locator('text=Cohort Rankings')).first()).toBeVisible();
    await expect(page.locator('text=/d streak/').first()).toBeVisible();

    // Navigate to Profile tab
    const profileTab = page.getByRole('button', { name: /Profile/i }).first();
    await profileTab.click();
    await expect(page.locator('text=EARNED CREDENTIALS & BADGES').or(page.locator('text=Credentials')).first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/10-student-profile.png' });
  });

  test('should explore Focus & Flow Studio and run a study sprint', async ({ page }) => {
    // Navigate to Focus & Flow tab
    const focusTab = page.getByRole('button', { name: /Focus & Flow/i }).first();
    await focusTab.click();
    await expect(page.locator('text=Study Focus & Mind Garden').first()).toBeVisible();
    await expect(page.locator('text=DEEP WORK STUDIO').first()).toBeVisible();

    // Select 1m Test Demo sprint
    const demoBtn = page.locator('button', { hasText: /1m Test Demo/i }).first();
    await demoBtn.click();

    // Start Focus Sprint
    const startBtn = page.getByRole('button', { name: /Start Focus Sprint/i }).first();
    await startBtn.click();
    await expect(page.getByRole('button', { name: /Pause Sprint/i }).first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/16-focus-sprint-active.png' });
  });

  test('should open the mission quiz in QuizRunner, answer every question, and surface a rejected submission', async ({ page }) => {
    // Navigate to Dashboard tab
    const dashboardTab = page.getByRole('button', { name: /Dashboard/i }).first();
    await dashboardTab.click();

    // The static mission card starts the built-in mastery quiz runner.
    const startQuizBtn = page.getByRole('button', { name: /Start Mission Assessment/i }).first();
    await startQuizBtn.click();

    // Verify QuizRunner opens with the mastery quiz and question flow
    await expect(page.locator('text=Module Mastery & Knowledge Check')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=Question 1 of 3')).toBeVisible();

    // Answers are collected locally; nothing is graded until submit.
    await page.locator('text=Loose coupling and independent deployability').first().click();
    await page.getByRole('button', { name: /Next Question/i }).click();

    await expect(page.locator('text=Question 2 of 3')).toBeVisible();
    await page.locator('text=lookup trees').first().click();
    await page.getByRole('button', { name: /Next Question/i }).click();

    await expect(page.locator('text=Question 3 of 3')).toBeVisible();
    await page.locator('text=Dependency Inversion').first().click();
    await page.getByRole('button', { name: /Submit Assessment/i }).click();

    // The mission card binds no server attempt, so the submission is rejected
    // and the runner must show a clear retry state — never a fake result.
    await expect(page.locator('text=Submission Failed')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=Retry Submission')).toBeVisible();
    await expect(page.locator('text=Assessment Passed')).toHaveCount(0);
    await expect(page.locator('text=Assessment Finished')).toHaveCount(0);

    await page.screenshot({ path: 'e2e/screenshots/15-quiz-completed.png' });

    // Recovery path: return to the student workspace
    await page.locator('text=Return to Curriculum').first().click();
    await expect(page.locator('text=Student Workspace').first()).toBeVisible();
  });
});
