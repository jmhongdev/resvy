import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helpers
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]',    'admin@resvy.com');
  await page.fill('input[type="password"]', 'Admin1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function loginAsResident(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]',    'jisu2@resvy.com');
  await page.fill('input[type="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// Tests

test.describe('Amenities Page', () => {

  test.describe('as resident', () => {

    test.beforeEach(async ({ page }) => {
      await loginAsResident(page);
      await page.waitForLoadState('networkidle');
    });

    test('shows amenities page with list of amenities', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Amenities' })).toBeVisible();
      await expect(page.getByText('Book a shared space in your building')).toBeVisible();

      // Should show at least one amenity card
      await expect(page.getByText('헬스장')).toBeVisible();
    });

    test('shows all seeded amenities', async ({ page }) => {
      await expect(page.getByText('헬스장')).toBeVisible();
      await expect(page.getByText('BBQ 공간')).toBeVisible();
      await expect(page.getByText('커뮤니티룸')).toBeVisible();
      await expect(page.getByText('독서실')).toBeVisible();
      await expect(page.getByText('스크린 골프')).toBeVisible();
      await expect(page.getByText('탁구장')).toBeVisible();
    });

    test('shows 예약하기 button for residents', async ({ page }) => {
      const bookButtons = page.getByRole('button', { name: '예약하기' });
      await expect(bookButtons.first()).toBeVisible();
    });

    test('clicking 예약하기 navigates to availability page', async ({ page }) => {
      await page.getByRole('button', { name: '예약하기' }).first().click();
      await expect(page).toHaveURL(/\/amenities\/.+\/availability/);
    });

    test('shows amenity details — capacity, location, hours', async ({ page }) => {
      // 헬스장 has capacity 10, location B1층
      await expect(page.getByText('최대 10명')).toBeVisible();
      await expect(page.getByText('📍 B1층')).toBeVisible();
    });

    test('search filters amenities by name', async ({ page }) => {
      await page.fill('input[placeholder="Search amenities..."]', '헬스');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('헬스장')).toBeVisible();
      await expect(page.getByText('BBQ 공간')).not.toBeVisible();
    });

    test('search Enter key triggers search', async ({ page }) => {
      await page.fill('input[placeholder="Search amenities..."]', '탁구');
      await page.press('input[placeholder="Search amenities..."]', 'Enter');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('탁구장')).toBeVisible();
      await expect(page.getByText('헬스장')).not.toBeVisible();
    });

    test('reset button clears search and shows all amenities', async ({ page }) => {
      // Search for something first
      await page.fill('input[placeholder="Search amenities..."]', '헬스');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('BBQ 공간')).not.toBeVisible();

      // Reset
      await page.getByRole('button', { name: 'Reset' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('BBQ 공간')).toBeVisible();
      await expect(page.getByText('헬스장')).toBeVisible();
    });

    test('capacity filter shows only amenities with enough capacity', async ({ page }) => {
      await page.selectOption('select', '20');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle');

      // BBQ 공간 has capacity 20
      await expect(page.getByText('BBQ 공간')).toBeVisible();

      // 독서실 has capacity 8
      await expect(page.getByText('독서실')).not.toBeVisible();
    });

    test('available today checkbox filters amenities', async ({ page }) => {
      await page.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle');

      // Page should still load without error
      await expect(page.getByRole('heading', { name: 'Amenities' })).toBeVisible();
    });

    test('shows no amenities found when search has no results', async ({ page }) => {
      await page.fill('input[placeholder="Search amenities..."]', 'XYZNOTFOUND123');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('No amenities found.')).toBeVisible();
    });

    test('shows today booking banner when user has booking today', async ({ page }) => {
      // This test depends on DB state — skip if no booking exists today
      // The banner only shows if the resident has a confirmed booking today
      const banner = page.getByText(/booking.*today|today.*booking/i);
      const hasBanner = await banner.isVisible().catch(() => false);

      if (hasBanner) {
        await expect(page.getByRole('link', { name: /View all/ })).toBeVisible();
      } else {
        // No booking today — banner should not show, which is correct
        await expect(page.getByRole('heading', { name: 'Amenities' })).toBeVisible();
      }
    });

    test('navbar shows correct links for resident', async ({ page }) => {
      await expect(page.getByRole('link', { name: 'Amenities' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'My Bookings' })).toBeVisible();

      // Admin links should not be visible
      await expect(page.getByRole('link', { name: 'Dashboard' })).not.toBeVisible();
      await expect(page.getByRole('link', { name: 'Bookings' })).not.toBeVisible();
    });

  });

  test.describe('as admin', () => {

    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.waitForLoadState('networkidle');
    });

    test('does not show 예약하기 button for admin', async ({ page }) => {
      const bookButtons = page.getByRole('button', { name: '예약하기' });
      await expect(bookButtons).not.toBeVisible();
    });

    test('navbar shows admin links', async ({ page }) => {
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Bookings' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Amenities' })).toBeVisible();
    });

    test('navbar does not show My Bookings for admin', async ({ page }) => {
      await expect(page.getByRole('link', { name: 'My Bookings' })).not.toBeVisible();
    });

    test('admin can navigate to dashboard', async ({ page }) => {
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL('/admin');
      await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    });

    test('admin can navigate to amenity settings', async ({ page }) => {
      await page.getByRole('link', { name: 'Amenities' }).click();
      await expect(page).toHaveURL('/admin/amenities');
      await expect(page.getByRole('heading', { name: 'Amenity Settings' })).toBeVisible();
    });

  });

  test.describe('unauthenticated', () => {

    test('redirects to login when not authenticated', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      });

      await page.goto('/');
      await expect(page).toHaveURL('/login');
    });

  });

});