import { test, expect, Page } from '@playwright/test';

// Helpers

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]',    'admin@resvy.com');
  await page.fill('input[type="password"]', 'Admin1234!');
  await page.click('button[type="submit"]');
  // Wait for redirect to amenities page after login
  await page.waitForURL('/');
}

async function goToAmenitySettings(page: Page) {
  await page.goto('/admin/amenities');
  await page.waitForLoadState('networkidle');
}

// Tests

test.describe('Admin Amenity Settings', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToAmenitySettings(page);
  });

  test('page loads and shows amenity list', async ({ page }) => {
    // Should show the page title
    await expect(page.getByRole('heading', { name: 'Amenity Settings' })).toBeVisible();

    // Should show at least one amenity in the sidebar
    const sidebarItems = page.locator('button').filter({ hasText: '헬스장' });
    await expect(sidebarItems.first()).toBeVisible();
  });

  test('selecting an amenity loads its settings', async ({ page }) => {
    // Click 스크린 골프 in the sidebar
    await page.getByRole('button', { name: /스크린 골프/ }).click();

    // Should show the panel title
    await expect(page.getByRole('heading', { name: '스크린 골프' })).toBeVisible();

    // Booking window should be enabled for 스크린 골프
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeChecked();
  });

  test('can toggle booking window on and off', async ({ page }) => {
    // Select 헬스장 which has no booking window
    await page.getByRole('button', { name: /헬스장/ }).click();
    await page.waitForLoadState('networkidle');

    const checkbox = page.locator('input[type="checkbox"]').first();

    // Enable booking window
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Time inputs should appear
    await expect(page.locator('input[type="time"]').first()).toBeVisible();

    // Disable it again
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    // Time inputs should disappear
    await expect(page.locator('input[type="time"]').first()).not.toBeVisible();
  });

  test('can toggle closed weekdays', async ({ page }) => {
    // Select 탁구장
    await page.getByRole('button', { name: /탁구장/ }).click();
    await page.waitForLoadState('networkidle');

    // Monday (월) button should be highlighted as closed
    const monButton = page.getByRole('button', { name: /월/ });
    await expect(monButton).toHaveCSS('color', 'rgb(220, 38, 38)'); // #dc2626

    // Click Wednesday (수) to close it
    const wedButton = page.getByRole('button', { name: /수/ });
    await wedButton.click();
    await expect(wedButton).toHaveCSS('color', 'rgb(220, 38, 38)');

    // Click Wednesday again to re-open it
    await wedButton.click();
    await expect(wedButton).not.toHaveCSS('color', 'rgb(220, 38, 38)');
  });

  test('can add a holiday', async ({ page }) => {
    // Select 헬스장
    await page.getByRole('button', { name: /헬스장/ }).click();
    await page.waitForLoadState('networkidle');

    // Fill in the holiday form
    await page.locator('input[type="date"]').last().fill('2026-12-25');
    await page.locator('input[placeholder="e.g. 추석"]').fill('크리스마스');

    // Click Add
    await page.getByRole('button', { name: 'Add' }).click();

    // The new holiday should appear in the list
    await expect(page.getByText('크리스마스')).toBeVisible();
    await expect(page.getByText('2026-12-25')).toBeVisible();
  });

  test('can remove a holiday', async ({ page }) => {
    // Select 헬스장 — it should have the 크리스마스 holiday we just added
    await page.getByRole('button', { name: /헬스장/ }).click();
    await page.waitForLoadState('networkidle');

    // Check if 크리스마스 exists first
    const christmasEntry = page.getByText('크리스마스');
    const exists = await christmasEntry.isVisible().catch(() => false);

    if (!exists) {
      // Add it first if previous test didn't run
      await page.locator('input[type="date"]').last().fill('2026-12-25');
      await page.locator('input[placeholder="e.g. 추석"]').fill('크리스마스');
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.getByText('크리스마스')).toBeVisible();
    }

    // Click the Remove button next to 크리스마스
    const holidayRow = page.locator('div').filter({ hasText: '크리스마스' }).last();
    const removeBtn  = holidayRow.getByRole('button', { name: 'Remove' });

    // Handle the confirm dialog
    page.on('dialog', dialog => dialog.accept());
    await removeBtn.click();

    // Holiday should be gone
    await expect(page.getByText('크리스마스')).not.toBeVisible();
  });

  test('save settings shows success message', async ({ page }) => {
    // Select 탁구장
    await page.getByRole('button', { name: /탁구장/ }).click();
    await page.waitForLoadState('networkidle');

    // Click Save settings
    await page.getByRole('button', { name: 'Save settings' }).click();

    // Should show success message
    await expect(page.getByText('Settings saved successfully')).toBeVisible();
  });

  test('cannot access admin amenities page as resident', async ({ page }) => {
    // Log out first
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('/login');

    // Log in as resident
    await page.fill('input[type="email"]',    'jisu2@resvy.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Try to access admin amenities directly
    await page.goto('/admin/amenities');

    // Should be redirected away — not see the admin page
    await expect(page).not.toHaveURL('/admin/amenities');
  });

});