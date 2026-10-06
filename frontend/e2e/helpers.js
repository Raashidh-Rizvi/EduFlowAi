// Instructor portal sections are no longer all reachable from the sidebar
// (courses / assessments / ai-review live behind in-page actions), so specs
// deep-link by seeding the portal's persisted section before a reload.
export async function gotoInstructorSection(page, section) {
  await page.evaluate((s) => sessionStorage.setItem('eduflow_instructor_section', s), section);
  await page.reload();
}
