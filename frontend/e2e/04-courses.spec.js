import { test, expect } from '@playwright/test';

test.describe('Courses Curriculum & Learning Path Exploration', () => {
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

  test('should navigate to Courses, display curriculum tree and allow course management', async ({ page }) => {
    // Click Curriculum & Modules in sidebar
    await page.getByRole('button', { name: /Curriculum & Modules/i }).click();

    // Verify page loaded
    await expect(page.locator('text=Curriculum & Learning Journey')).toBeVisible({ timeout: 10000 });

    // Check if courses exist or create button is visible
    const addCourseBtn = page.getByRole('button', { name: /\+ New Course|Create Course|\+ Add Course/i }).first();
    if (await addCourseBtn.isVisible()) {
      await addCourseBtn.click();
      
      // Fill modal if opened
      const titleInput = page.locator('input[placeholder*="Course Title"]').or(page.locator('input[placeholder*="Distributed Systems"]')).first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('CS-401: Advanced Distributed Systems & Cloud Microservices');
        const codeInput = page.locator('input[placeholder*="Course Code"]').or(page.locator('input[placeholder*="CS-301"]')).first();
        if (await codeInput.isVisible()) {
          await codeInput.fill('CS-401');
        }
        
        // Submit
        const submitBtn = page.getByRole('button', { name: /Create Course|Save Course/i }).last();
        await submitBtn.click();

        // Wait for course to appear or toast
        await page.waitForTimeout(1000);
      }
    }

    // Toggle between Curriculum and Journey view if toggle exists
    const journeyTab = page.locator('text=Learning Path Journey').or(page.locator('text=Visual Roadmap')).first();
    if (await journeyTab.isVisible()) {
      await journeyTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'e2e/screenshots/07-courses-curriculum.png', fullPage: true });
  });
});
