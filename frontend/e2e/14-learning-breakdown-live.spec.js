import { test, expect } from '@playwright/test';

test.skip(process.env.EDUFLOW_LIVE_TESTS !== '1', 'Requires local services and the indexed IT3091 lecture.');
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
test.setTimeout(180000);

test('real IT3091 breakdown supports a scoped topic plan and explanation via ASP.NET', async ({ page }) => {
  const directPython = [];
  page.on('request', request => {
    if (new URL(request.url()).port === '8888') directPython.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Try Now|Get Started Free/i }).first().click();
  await page.getByLabel('Email Address').fill('student@eduflow.ai');
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  const login = page.waitForResponse(r => r.url().includes('/api/auth/login'));
  await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
  expect((await login).status()).toBe(200);
  await page.getByRole('button', { name: /AI Assistant|AI Coach/i }).first().click();
  const source = 'IT3091_Machine_Learning_Lecture_1.pdf';
  await page.locator('select').selectOption(source);

  async function learn(button, kind) {
    const started = Date.now();
    const pending = page.waitForResponse(r => r.url().includes('/api/aireview/learn'), { timeout: 145000 });
    await page.getByRole('button', { name: button, exact: true }).click();
    const response = await pending;
    const data = await response.json();
    console.log(JSON.stringify({ kind, seconds: (Date.now() - started) / 1000, status: response.status(),
      sections: data.sub_lectures?.map(s => ({ id: s.id, title: s.title, pages: [s.page_start, s.page_end], topics: s.topics })),
      sessions: data.plan?.sessions.length, answer: data.answer,
      citations: data.citations?.map(c => ({ source_file: c.source_file, page_number: c.page_number })) }));
    expect(response.status()).toBe(200);
    expect(data.source_file).toBe(source);
    return { data, request: response.request().postDataJSON() };
  }

  const { data: breakdown } = await learn('Break Into Topics', 'breakdown');
  expect(breakdown.sub_lectures.length).toBeGreaterThan(1);
  for (const section of breakdown.sub_lectures) {
    expect(section.id).toBeTruthy();
    expect(section.title.trim()).toBeTruthy();
    expect(section.source_file).toBe(source);
    expect(section.page_end).toBeGreaterThanOrEqual(section.page_start);
    expect(section.topics.length).toBeGreaterThan(0);
  }
  await expect(page.locator('summary')).toHaveCount(breakdown.sub_lectures.length);
  const section = breakdown.sub_lectures[1];
  await page.getByRole('button', { name: 'Select Topic', exact: true }).nth(1).click();
  const plan = await learn('Study This Topic', 'plan');
  expect(plan.request.sub_lecture_id).toBe(section.id);
  expect(plan.data.plan.sessions.length).toBeGreaterThan(0);
  expect(plan.data.plan.sessions.every(s => s.sub_lecture_id === section.id)).toBe(true);
  await expect(page.getByText(plan.data.plan.title, { exact: true })).toBeVisible();
  // Use a concrete generated subtopic, rather than asking to define an organizational heading.
  await page.locator('details').nth(1).getByRole('button', { name: section.topics[0], exact: true }).click();
  const explanation = await learn('Explain This Topic', 'explain');
  expect(explanation.request.sub_lecture_id).toBe(section.id);
  expect(explanation.request.topic).toBe(section.topics[0]);
  expect(explanation.data.answer.trim()).toBeTruthy();
  expect(explanation.data.citations.length).toBeGreaterThan(0);
  expect(explanation.data.citations.every(c => c.source_file === source &&
    c.page_number >= section.page_start && c.page_number <= section.page_end)).toBe(true);
  await expect(page.getByText(explanation.data.answer, { exact: true })).toBeVisible();
  expect(directPython).toEqual([]);
});
