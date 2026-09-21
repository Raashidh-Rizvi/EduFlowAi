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

  test('should generate a SlideQuest quiz and run it', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds timeout for this test
    // 1. Navigate to Curriculum & Modules
    await page.getByRole('button', { name: /Curriculum & Modules/i }).click();
    await expect(page.locator('text=Curriculum & Learning Journey')).toBeVisible({ timeout: 10000 });

    // Wait briefly for course data to load
    await page.waitForTimeout(1000);

    // 2. Open Module AI Quiz Generator
    const generateAiQuizBtn = page.locator('text=⚡ Module AI Quiz').first();
    await generateAiQuizBtn.click();

    // 3. Wait for modal to open
    await expect(page.locator('text=AI Assessment Generator & Reviewer')).toBeVisible();

    // 4. Click Synthesize SlideQuest Assessment Draft
    await page.locator('text=Synthesize SlideQuest Assessment Draft').click();

    // 5. Wait for the generated draft
    const approveBtn = page.locator('text=Approve & Publish to Curriculum').first();
    await expect(approveBtn).toBeVisible({ timeout: 60000 });

    // 6. Approve & Publish
    await page.locator('text=Approve & Publish to Curriculum').click();

    // 7. Start Quiz Runner
    const takeQuizBtn = page.locator('text=🎮 Take Quiz Quest').first();
    await takeQuizBtn.click();

    // 8. Verify Quiz Runner opened
    await expect(page.locator('text=SLIDEQUEST RUNNER')).toBeVisible();
  });
});
