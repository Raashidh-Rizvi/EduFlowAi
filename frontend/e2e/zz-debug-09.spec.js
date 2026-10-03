import { test, expect } from '@playwright/test';

test('debug 09 generate flow', async ({ page }) => {
  test.setTimeout(420000);
  page.on('pageerror', e => console.log('[pageerror] %s', String(e).slice(0, 400)));
  page.on('console', m => { if (m.type() === 'error') console.log('[console:error] %s', m.text().slice(0, 200)); });
  page.on('response', async r => {
    if (r.url().includes('/api/quizzes/generate-ai')) {
      let b = '';
      try { b = (await r.text()).slice(0, 500); } catch {}
      console.log('[res] %s %s :: %s', r.status(), new URL(r.url()).pathname, b);
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
  const generateAiQuizBtn = page.locator('text=⚡ Module AI Quiz').first();
  await generateAiQuizBtn.waitFor({ state: 'visible', timeout: 30000 });
  await generateAiQuizBtn.click();
  await expect(page.locator('text=AI Assessment Generator & Reviewer')).toBeVisible();

  console.log('>>> clicking synthesize at %s', new Date().toISOString());
  await page.locator('text=Synthesize SlideQuest Assessment Draft').click();
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(5000);
    const snap = await page.locator('body').ariaSnapshot();
    const review = snap.includes('Review Draft & Publish');
    const error = snap.includes('Troubleshooting Guidance') || snap.includes('Connection Error') || snap.includes('No Questions');
    const busy = snap.includes('Synthesizing Strict RAG Questions');
    console.log('[t+%ds] review=%s error=%s busy=%s', (i + 1) * 5, review, error, busy);
    if (review || error) {
      console.log('>>> MATCH LINES:');
      console.log(snap.split('\n').filter(l => /Review Draft|Troubleshooting|Connection Error|No Questions|Draft Ready|AI_|Trace ID/i.test(l)).join('\n'));
      break;
    }
  }
});
