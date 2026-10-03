import { test, expect } from '@playwright/test';

test.describe('SlideQuest AI Generation & Quiz Runner', () => {
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

  test('should generate a SlideQuest assessment and publish it', async ({ page }) => {
    // Real Azure generation + publish round-trip; allow a generous budget.
    test.setTimeout(180000);
    // 1. Navigate to Curriculum & Modules (opens the course directory)
    await page.getByRole('button', { name: /Curriculum & Modules/i }).click();
    await expect(page.locator('text=Curriculum & Learning Journey')).toBeVisible({ timeout: 10000 });

    // 1b. Wait for the directory to actually render (the course list is an
    // API call), then open the first course's dedicated page.
    const courseCard = page.getByTestId('course-directory-card').first();
    await courseCard.waitFor({ state: 'visible', timeout: 20000 });
    await courseCard.click();

    // 2. Open Module AI Quiz Generator (appears once the hierarchy renders)
    const generateAiQuizBtn = page.locator('text=⚡ Module AI Quiz').first();
    await generateAiQuizBtn.waitFor({ state: 'visible', timeout: 30000 });
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

    // 7. Approve & Publish - assert the backend published the persisted draft.
    //    Note: the "Take Quiz Quest" runner button is role-gated to learners, and learners
    //    get their own StudentPortal, so an instructor can publish but never run the draft.
    //    Current contract: the draft already exists (created by generate-ai), so approval
    //    PUTs edits then POSTs /api/quizzes/{id}/publish (200), it does not create a new quiz.
    const publishResponse = page.waitForResponse(
      r => r.request().method() === 'POST' && /\/api\/quizzes\/[0-9a-f-]+\/publish$/i.test(new URL(r.url()).pathname)
    );
    await approveBtn.click();
    const published = await publishResponse;
    expect(published.status()).toBe(200);

    // 8. The draft is streamed to the Assessments & Quizzes tab
    await page.getByRole('button', { name: /Assessments & Quizzes/i }).click();
    await expect(page.locator('text=Assessments').first()).toBeVisible({ timeout: 15000 });
  });
});
