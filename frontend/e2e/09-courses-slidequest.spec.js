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
    test.setTimeout(300000);
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

    // 4-5. Generation is a live, grounded LLM call: it legitimately runs for tens
    //      of seconds, and the provider can transiently return an unusable answer.
    //      Drive the UI's own recovery control within a bounded budget, then
    //      require a real draft: a persistent failure still fails this test.
    const reviewDraftBtn = page.getByRole('button', { name: /Review Draft & Publish/i });
    const retryGenerationBtn = page.getByRole('button', { name: /Reconfigure Provider \/ Retry/i });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await page.locator('text=Synthesize SlideQuest Assessment Draft').click();
      await expect(reviewDraftBtn.or(retryGenerationBtn).first()).toBeVisible({ timeout: 180000 });
      if (await reviewDraftBtn.isVisible()) break;
      console.log(`generation attempt ${attempt} failed at the provider; retrying through the UI`);
      await retryGenerationBtn.click();
      await expect(page.locator('text=Synthesize SlideQuest Assessment Draft')).toBeVisible();
    }
    await expect(reviewDraftBtn).toBeVisible();
    await reviewDraftBtn.click();

    // 6. Wait for the generated draft
    const approveBtn = page.locator('text=Approve & Publish to Curriculum').first();
    await expect(approveBtn).toBeVisible({ timeout: 30000 });

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
