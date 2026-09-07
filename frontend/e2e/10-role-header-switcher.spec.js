import { test, expect } from '@playwright/test';

test.describe('Header Direct Role Redirection Switcher', () => {
  test('should switch login and redirect seamlessly between Student, Admin, and Instructor from header', async ({ page }) => {
    // Start at base url
    await page.goto('http://localhost:2174');

    // 1. If starting from Landing Page, verify role switcher buttons exist in header
    const studentBtnLanding = page.locator('#btn-switch-student').first();
    await expect(studentBtnLanding).toBeVisible();

    // Click Student directly from landing header
    await studentBtnLanding.click();

    // Should redirect to Student Portal & update login
    await expect(page.locator('text=Student Workspace')).toBeVisible({ timeout: 8000 });
    
    // Check localStorage user
    const userRoleAfterStudentClick = await page.evaluate(() => {
      const u = JSON.parse(localStorage.getItem('eduflow_user') || '{}');
      return u.role;
    });
    expect(userRoleAfterStudentClick).toBe('Student');

    // Verify Student button is marked as active in Student Top Bar
    const studentActiveIndicator = page.locator('#btn-switch-student span').first();
    await expect(studentActiveIndicator).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/10-student-portal-header.png' });

    // 2. Click Admin button directly from Student Top Bar header
    const adminBtnFromStudent = page.locator('#btn-switch-admin').first();
    await expect(adminBtnFromStudent).toBeVisible();
    await adminBtnFromStudent.click();

    // Should redirect to Admin Management Console
    await expect(page.locator('text=Platform Governance & Administration').first()).toBeVisible({ timeout: 8000 });

    const userRoleAfterAdminClick = await page.evaluate(() => {
      const u = JSON.parse(localStorage.getItem('eduflow_user') || '{}');
      return u.role;
    });
    expect(userRoleAfterAdminClick).toBe('Admin');

    await page.screenshot({ path: 'e2e/screenshots/10-admin-console-header.png' });

    // 3. Click Instructor button directly from Console Navbar header
    const instructorBtnFromAdmin = page.locator('#btn-switch-instructor').first();
    await expect(instructorBtnFromAdmin).toBeVisible();
    await instructorBtnFromAdmin.click();

    // Should redirect to Instructor Executive Overview
    await expect(page.locator('text=Executive Overview')).toBeVisible({ timeout: 8000 });

    const userRoleAfterInstructorClick = await page.evaluate(() => {
      const u = JSON.parse(localStorage.getItem('eduflow_user') || '{}');
      return u.role;
    });
    expect(userRoleAfterInstructorClick).toBe('Instructor');

    await page.screenshot({ path: 'e2e/screenshots/10-instructor-console-header.png' });

    // 4. Click Student again from Instructor Console Navbar header
    const studentBtnFromInstructor = page.locator('#btn-switch-student').first();
    await studentBtnFromInstructor.click();

    // Verify back in Student Portal
    await expect(page.locator('text=Student Workspace')).toBeVisible({ timeout: 8000 });
  });
});
