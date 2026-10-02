import { test, expect } from '@playwright/test';

test.describe('SlideQuest AI Generation & Quiz Runner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Login as Instructor
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.locator('text=Dr. Sarah Jenkins').click();
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
    await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible({ timeout: 10000 });
  });

  test('should generate a SlideQuest assessment and publish it', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds timeout for this test
    // 1. Navigate to Curriculum & Modules (opens the course directory)
    await page.getByRole('button', { name: /Curriculum & Modules/i }).click();
    await expect(page.locator('text=Curriculum & Learning Journey')).toBeVisible({ timeout: 10000 });

    // Wait briefly for course data to load
    await page.waitForTimeout(1000);

    // 1b. Open the first course's dedicated page from the directory
    const courseCard = page.getByTestId('course-directory-card').first();
    if (await courseCard.isVisible().catch(() => false)) {
      await courseCard.click();
      await page.waitForTimeout(1000);
    }

    // 2. Open Module AI Quiz Generator
    const generateAiQuizBtn = page.locator('text=⚡ Module AI Quiz').first();
    await generateAiQuizBtn.click();

    // 3. Wait for modal to open
    await expect(page.locator('text=AI Assessment Generator & Reviewer')).toBeVisible();

    // 4. Click Synthesize SlideQuest Assessment Draft
    await page.locator('text=Synthesize SlideQuest Assessment Draft').click();

    // 5. The generator closes the modal for a non-blocking UX; open the draft from the notification
    await page.getByRole('button', { name: /Review Draft & Publish/i }).click({ timeout: 60000 });

    // 6. Wait for the generated draft
    const approveBtn = page.locator('text=Approve & Publish to Curriculum').first();
    await expect(approveBtn).toBeVisible({ timeout: 60000 });

    // 7. Approve & Publish - assert the backend persisted the assessment.
    //    Note: the "Take Quiz Quest" runner button is role-gated to learners, and learners
    //    get their own StudentPortal, so an instructor can publish but never run the draft.
    const publishResponse = page.waitForResponse(
      r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/quizzes'
    );
    await approveBtn.click();
    const published = await publishResponse;
    expect(published.status()).toBe(201);

    // 8. The draft is streamed to the Assessments & Quizzes tab
    await page.getByRole('button', { name: /Assessments & Quizzes/i }).click();
    await expect(page.locator('text=Assessments').first()).toBeVisible({ timeout: 15000 });
  });
});
