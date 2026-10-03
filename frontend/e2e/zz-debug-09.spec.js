import { test, expect } from '@playwright/test';

test('debug 09 attempts', async ({ page }) => {
  test.setTimeout(600000);
  page.on('response', async r => {
    if (r.url().includes('/api/quizzes/generate-ai')) {
      let b = ''; try { b = (await r.text()).slice(0, 400); } catch {}
      console.log('[res %s] %s :: %s', r.status(), new Date().toISOString(), b);
    }
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Try Now|Get Started Free/i }).first().click();
  await page.getByLabel('Email Address').fill('instructor@eduflow.ai');
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
  await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Curriculum & Modules/i }).click();
  await expect(page.locator('text=Curriculum & Learning Journey')).toBeVisible({ timeout: 15000 });
  const courseCard = page.getByTestId('course-directory-card').first();
  await courseCard.waitFor({ state: 'visible', timeout: 20000 });
  await courseCard.click();
  await page.locator('text=⚡ Module AI Quiz').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('text=⚡ Module AI Quiz').first().click();
  await expect(page.locator('text=AI Assessment Generator & Reviewer')).toBeVisible();

  const reviewDraftBtn = page.getByRole('button', { name: /Review Draft & Publish/i });
  const retryGenerationBtn = page.getByRole('button', { name: /Reconfigure Provider \/ Retry/i });
  for (let attempt = 1; attempt <= 4; attempt++) {
    console.log('>>> attempt %d at %s', attempt, new Date().toISOString());
    await page.locator('text=Synthesize SlideQuest Assessment Draft').click();
    await expect(reviewDraftBtn.or(retryGenerationBtn).first()).toBeVisible({ timeout: 180000 });
    if (await reviewDraftBtn.isVisible()) { console.log('>>> SUCCESS on attempt %d', attempt); break; }
    const modal = await page.locator('.modal-content').last().ariaSnapshot().catch(() => '');
    console.log('>>> error modal: %s', modal.split('\n').filter(l => /heading|AI_|RAG_|QUIZ_|Reference|Trace ID|paragraph/.test(l)).join(' | '));
    await retryGenerationBtn.click();
    await expect(page.locator('text=Synthesize SlideQuest Assessment Draft')).toBeVisible();
  }
});
