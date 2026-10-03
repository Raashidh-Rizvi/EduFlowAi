import { test, expect } from '@playwright/test';

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });

// API fixtures are confined to tests. Production never substitutes learning content.
const section = { id: 'search-slides-2-3', title: 'Breadth first search', page_start: 2, page_end: 3, topics: ['FIFO queue'], source_file: 'search.pdf' };
const citation = { page_number: 2, source_file: 'search.pdf', preview_text: 'Breadth first search uses a FIFO queue.', relevance_score: 0.95 };

// The coach view's deck picker — scoped past the always-mounted support
// dialog's "Ticket Category" select that also lives in the DOM.
const deckSelect = (page) => page.locator('select:has(option[value="search.pdf"])');
// Placeholder text changes once a deck is selected ("Ask a question about…"
// vs "Ask anything about…"); both open the chat.
const chatInput = (page) => page.getByPlaceholder(/Ask (a question|anything)/);
// The study controls live behind a "Study Tools" disclosure that only mounts
// once a deck is selected, and it auto-collapses whenever a learning request
// fires — so every control click is preceded by an expand.
const studyTools = (page) => page.getByRole('button', { name: 'Study Tools', exact: true });
const expandTools = async (page) => {
  if (await studyTools(page).count() > 0) await studyTools(page).click();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eduflow_user', JSON.stringify({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', fullName: 'Test Student', role: 'Student', isActive: true }));
    // The P0 auth shell requires a token pair before it renders any console.
    localStorage.setItem('eduflow_token', 'access-test');
    localStorage.setItem('eduflow_refresh_token', 'refresh-test');
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { detail: 'Backend unavailable in isolated UI test' } }));
  // Registered AFTER the catch-all (later routes win) so the auth shell can
  // validate this session exactly like a real login would.
  await page.route('**/api/auth/me', route => route.fulfill({
    json: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', fullName: 'Test Student', email: 'learner@example.test', role: 'Student', isActive: true }
  }));
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, json: {} }));
  await page.route('**/health', route => route.fulfill({ json: { status: 'healthy' } }));
  await page.route('**/api/aireview/learning/slide-decks', route => route.fulfill({ json: { slide_decks: [
    { source_file: 'search.pdf', course_id: 'course-a', display_title: 'Search lecture', total_chunks: 3 },
    { source_file: 'other.pdf', course_id: 'course-b', display_title: 'Other lecture', total_chunks: 2 }
  ] } }));
  // The AI Learning Assistant lives in the student console, not the public marketplace.
  await page.goto('/console');
  await page.getByRole('button', { name: /AI Assistant|AI Coach/i }).first().click();
  // Substring match: the opened assistant view carries the greeting
  // "…I am your AI Learning Assistant…", not an exact-titled header.
  await expect(page.locator('text=AI Learning Assistant').first()).toBeVisible();
});

test('global chat, strict chat, breakdown, topic plan, explanation and full plan', async ({ page }) => {
  const chats = [];
  const learning = [];
  const directPythonRequests = [];
  page.on('request', req => { if (new URL(req.url()).port === '8888') directPythonRequests.push(req.url()); });
  await page.route('**/api/aireview/coach/chat', route => {
    chats.push(route.request().postDataJSON());
    return route.fulfill({ json: { reply: 'According to Slide 2, breadth first search uses a FIFO queue.', citations: [citation], source: 'mock_rag' } });
  });
  await page.route('**/api/aireview/learn', route => {
    const body = route.request().postDataJSON();
    learning.push(body);
    const result = { request_type: body.request_type, source_file: body.source_file, sub_lectures: [], citations: [] };
    if (body.request_type === 'breakdown') result.sub_lectures = [section];
    if (body.request_type === 'plan') result.plan = {
      title: body.sub_lecture_id ? 'Queue topic study plan' : 'Full search lecture study plan',
      sessions: [{ session_number: 1, title: 'Read and recall search', tasks: ['Read Slide 2 and describe the queue.'], estimated_minutes: 25, sub_lecture_id: body.sub_lecture_id }]
    };
    if (body.request_type === 'explain') Object.assign(result, { answer: 'A FIFO queue processes items in arrival order, as shown on Slide 2.', citations: [citation] });
    return route.fulfill({ json: result });
  });

  await expect(page.getByRole('button', { name: /Break Into Topics/ })).toHaveCount(0);
  const input = chatInput(page);
  await input.fill('Explain search');
  await input.press('Enter');
  await expect(page.getByText('According to Slide 2, breadth first search uses a FIFO queue.', { exact: true })).toBeVisible();
  expect(chats[0].source_file).toBeNull();

  await deckSelect(page).selectOption('search.pdf');
  await input.fill('How does this lecture use a queue?');
  await input.press('Enter');
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(chats.at(-1).source_file).toBe('search.pdf');
  await expandTools(page);
  await page.getByRole('button', { name: /Break Into Topics/ }).click();
  await expect(page.locator('summary')).toContainText('Breadth first search');
  await page.getByRole('button', { name: 'Select Topic', exact: true }).click();
  await expandTools(page);
  await page.getByRole('button', { name: 'Study This Topic', exact: true }).click();
  await expect(page.getByText('Queue topic study plan', { exact: true })).toBeVisible();
  expect(learning.at(-1).sub_lecture_id).toBe(section.id);
  await page.getByRole('button', { name: 'FIFO queue', exact: true }).click();
  await expandTools(page);
  await page.getByRole('button', { name: 'Explain This Topic', exact: true }).click();
  await expect(page.getByText('A FIFO queue processes items in arrival order, as shown on Slide 2.')).toBeVisible();
  expect(learning.at(-1).topic).toBe('FIFO queue');
  expect(learning.at(-1).source_file).toBe('search.pdf');
  await expect(page.getByRole('button', { name: /Deep Dive Slide 2/ }).last()).toBeVisible();
  await expandTools(page);
  await page.getByRole('button', { name: /Complete (Lecture )?Study Plan/ }).click();
  await expect(page.getByText('Full search lecture study plan', { exact: true })).toBeVisible();
  expect(learning.at(-1).sub_lecture_id).toBeNull();
  expect(chats[0].session_id).toBeTruthy();
  expect([...chats, ...learning].every(r => r.session_id === chats[0].session_id)).toBe(true);
  expect(directPythonRequests).toEqual([]);
  await deckSelect(page).selectOption('other.pdf');
  await expect(page.locator('summary')).toHaveCount(0);
  // Switching decks clears the selected topic — expand to prove the panel is gone.
  await expandTools(page);
  await expect(page.getByRole('button', { name: 'Study This Topic', exact: true })).toHaveCount(0);
  await deckSelect(page).selectOption('');
  // The whole disclosure is gated on having a deck selected.
  await expect(studyTools(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Break Into Topics/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Complete (Lecture )?Study Plan/ })).toHaveCount(0);
});

test('failed learning and chat requests show errors and allow retry without fake answers', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/aireview/learn', route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { detail: 'The AI generation service is unavailable. Please retry.' } })
      : route.fulfill({ json: { request_type: 'breakdown', source_file: 'search.pdf', sub_lectures: [section], citations: [] } });
  });
  await page.route('**/api/aireview/coach/chat', route => route.fulfill({ status: 503, json: { detail: 'Unavailable' } }));
  await deckSelect(page).selectOption('search.pdf');
  await expandTools(page);
  await page.getByRole('button', { name: /Break Into Topics/ }).click();
  await expect(page.getByRole('alert')).toContainText('unavailable');
  await expect(page.locator('summary')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('summary')).toContainText('Breadth first search');
  const input = chatInput(page);
  await input.fill('Explain composite indexes');
  await input.press('Enter');
  await expect(page.getByRole('alert').last()).toContainText('Unavailable');
  await expect(page.getByText(/Always place higher cardinality/)).toHaveCount(0);
});

test('lecture discovery failure has a visible retry state', async ({ page }) => {
  let available = false;
  await page.route('**/api/aireview/learning/slide-decks', route => available
    ? route.fulfill({ json: { slide_decks: [{ source_file: 'search.pdf', display_title: 'Search lecture', total_chunks: 3 }] } })
    : route.fulfill({ status: 503, json: { detail: 'Unavailable' } }));
  await page.reload();
  await page.getByRole('button', { name: /AI Assistant|AI Coach/i }).first().click();
  await expect(page.getByRole('alert')).toContainText('Indexed lectures could not be loaded');
  available = true;
  await page.getByRole('button', { name: 'Retry loading lectures' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await deckSelect(page).selectOption('search.pdf');
  await expandTools(page);
  await expect(page.getByRole('button', { name: /Break Into Topics/ })).toBeVisible();
});

test('extractive RAG answers and citations are displayed through the gateway', async ({ page }) => {
  const directRequests = [];
  page.on('request', request => { if (new URL(request.url()).port === '8888') directRequests.push(request.url()); });
  await page.route('**/api/aireview/coach/chat', route => route.fulfill({ json: {
    reply: 'Based on the course lecture slides: Breadth first search uses a FIFO queue.',
    source: 'extractive_rag', citations: [citation]
  } }));
  await deckSelect(page).selectOption('search.pdf');
  const input = chatInput(page);
  await input.fill('Explain search');
  await input.press('Enter');
  await expect(page.getByText('Based on the course lecture slides: Breadth first search uses a FIFO queue.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Deep Dive Slide 2/ })).toBeVisible();
  expect(directRequests).toEqual([]);
});
