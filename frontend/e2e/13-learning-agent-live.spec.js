import { test, expect } from '@playwright/test';

// Opt-in: exercises the real local services and existing indexed lecture, never seeds/reindexes.
test.skip(process.env.EDUFLOW_LIVE_TESTS !== '1', 'Requires running services and the seeded student login.');
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
test.setTimeout(180000);

test('real Student chat returns global, strict and follow-up answers via ASP.NET', async ({ page }) => {
  const directPython = [];
  page.on('request', request => {
    if (new URL(request.url()).port === '8000') directPython.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Try Now|Get Started Free/i }).first().click();
  await page.getByText('Alex Rivera', { exact: true }).click();
  const loginResponse = page.waitForResponse(r => r.url().includes('/api/auth/login'));
  await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
  expect((await loginResponse).status()).toBe(200);
  await page.getByRole('button', { name: /AI Assistant|AI Coach/i }).first().click();
  await expect(page.getByText('AI Learning Assistant', { exact: true })).toBeVisible();
  const input = page.getByPlaceholder(/Ask a .*question/);
  const lecture = 'IT3091_Machine_Learning_Lecture_1.pdf';
  let session;
  for (const [question, source] of [
    ['explain machine learning', null],
    ['What are the main topics in this lecture?', lecture],
    ['Explain the first of those topics more simply.', lecture],
    ['What is data mining according to this lecture?', lecture],
    ['How does it differ from machine learning?', lecture],
    ['Summarize the comparison in your previous answer in one sentence.', lecture]
  ]) {
    const started = Date.now();
    if (source) await page.locator('select').selectOption(source);
    const reply = page.waitForResponse(r => r.url().includes('/api/aireview/coach/chat'), { timeout: 90000 });
    await input.fill(question);
    await input.press('Enter');
    const response = await reply;
    expect(response.status()).toBe(200);
    const payload = response.request().postDataJSON();
    const result = await response.json();
    expect(payload.source_file).toBe(source);
    expect(payload.session_id).toBeTruthy();
    session ||= payload.session_id;
    expect(payload.session_id).toBe(session);
    expect(result.reply?.trim().length).toBeGreaterThan(0);
    expect(result.citations.length).toBeGreaterThan(0);
    if (source) expect(result.citations.every(c => c.source_file === source)).toBe(true);
    await expect(page.getByText(result.reply, { exact: true })).toBeVisible();
    if (process.env.EDUFLOW_EXPECT_EXTRACTIVE === '1') expect(result.source).toBe('extractive_rag');
    console.log(JSON.stringify({ endpoint: '/api/aireview/coach/chat', status: response.status(),
      question, source_file: payload.source_file, source: result.source,
      seconds: (Date.now() - started) / 1000, answer: result.reply,
      answer_length: result.reply.length, citations: result.citations.map(c => ({ file: c.source_file, page: c.page_number })) }));
  }
  await expect(page.getByRole('button', { name: /Deep Dive Slide/ }).last()).toBeVisible();
  expect(directPython).toEqual([]);
});
