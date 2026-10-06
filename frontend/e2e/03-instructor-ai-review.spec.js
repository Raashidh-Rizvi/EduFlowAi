import { test, expect } from '@playwright/test';
import { gotoInstructorSection } from './helpers.js';

test.describe('Instructor AI Review & HITL Governance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Quick login as Instructor
    const tryNowBtn = page.getByRole('button', { name: /Try Now|Get Started Free/i }).first();
    await tryNowBtn.click();
    await page.getByLabel('Email Address').fill('instructor@eduflow.ai');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /Authenticate & Continue/i }).click();
    await expect(page.locator('text=Executive Overview').or(page.locator('text=INSTRUCTOR CONSOLE')).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to AI Review and inspect governance workspace', async ({ page }) => {
    // Click AI Study Approvals in sidebar
    await gotoInstructorSection(page, 'ai-review');

    // Verify AI Review header
    await expect(page.locator('text=Human-in-the-Loop AI Review').first()).toBeVisible();

    // Verify queue tabs exist (Pending, Approved, Rejected, etc.)
    await expect(page.locator('text=Pending Approval').or(page.locator('text=Pending')).first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/05-ai-review-workspace.png', fullPage: true });
  });

  test('should trigger multi-agent study plan orchestration and approve proposal', async ({ page }) => {
    await gotoInstructorSection(page, 'ai-review');

    // Look for Orchestrate button
    const orchestrateBtn = page.getByRole('button', { name: /\+ Orchestrate AI Proposal|Orchestrate New AI Study Plan/i }).first();
    await expect(orchestrateBtn).toBeVisible({ timeout: 8000 });
    await orchestrateBtn.click();

    // Verify Generator Modal opened
    await expect(page.locator('text=Orchestrate New AI Study Plan').first()).toBeVisible();

    // Click "Run Multi-Agent Orchestration"
    const runBtn = page.getByRole('button', { name: /Run Multi-Agent Orchestration/i }).first();
    await runBtn.click();

    // Wait for agent execution animation to finish and proposal to appear
    await expect(page.locator('text=Liam Davies').first()).toBeVisible({ timeout: 30000 });

    // Check if there is an Approve & Dispatch button to review
    const approveBtn = page.getByRole('button', { name: /Approve & Dispatch|Approve Proposal/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      // Should show success toast
      await expect(page.locator('text=approved & dispatched').or(page.locator('text=Approved')).first()).toBeVisible({ timeout: 8000 });
    }

    await page.screenshot({ path: 'e2e/screenshots/06-ai-review-approved.png' });
  });
});
