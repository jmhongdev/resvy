import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helpers

async function loginAsResident(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]',    'jisu2@resvy.com');
  await page.fill('input[type="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function goToGymAvailability(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '예약하기' }).first().click();
  await page.waitForLoadState('networkidle');
}

function getNextNonMondayStr(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 1) {
    date.setDate(date.getDate() + 1);
  }
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getNextMondayStr(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

// Tests

test.describe('Availability Page', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsResident(page);
    await goToGymAvailability(page);
  });

  test('shows amenity name and location', async ({ page }) => {
    // Should show an amenity name in the heading
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('shows back button that navigates to amenities', async ({ page }) => {
    await expect(page.getByText('← Back')).toBeVisible();
    await page.getByText('← Back').click();
    await expect(page).toHaveURL('/');
  });

  test('shows calendar date picker', async ({ page }) => {
    // react-day-picker renders a table-based calendar
    await expect(page.locator('table')).toBeVisible();
  });

  test('shows slot legend', async ({ page }) => {
    await expect(page.getByText('Closed day')).toBeVisible();
    await expect(page.getByText('Holiday')).toBeVisible();
    await expect(page.getByText('Selected')).toBeVisible();
  });

  test('selecting a valid date shows time slots', async ({ page }) => {
    const dateStr = getNextNonMondayStr();

    // Click the date in the calendar
    // DayPicker renders dates as buttons with aria-label containing the date
    const dayButton = page.locator(`button[name="${dateStr}"]`);
    if (await dayButton.isVisible()) {
      await dayButton.click();
    } else {
      // Navigate to next month if needed
      await page.locator('button[aria-label="Go to next month"]').click();
      await page.locator(`button[name="${dateStr}"]`).click();
    }

    await page.waitForLoadState('networkidle');

    // Should show the slots label
    await expect(page.getByText(/Available slots for/)).toBeVisible();
  });

  test('shows prompt to select date when no date selected', async ({ page }) => {
    await expect(page.getByText('Select a date above to see available slots')).toBeVisible();
  });

  test('Monday dates are visually disabled for gym', async ({ page }) => {
    // Navigate to next Monday in calendar
    const mondayStr = getNextMondayStr();
    const month = Number(mondayStr.split('-')[1]);

    // Navigate calendar to correct month if needed
    const currentMonth = new Date().getMonth() + 1;
    if (month > currentMonth) {
      await page.locator('button[aria-label="Go to next month"]').click();
    }

    // Monday button should be disabled
    const mondayButton = page.locator(`button[name="${mondayStr}"]`);
    if (await mondayButton.isVisible()) {
      await expect(mondayButton).toBeDisabled();
    }
  });

  test('past dates are disabled in calendar', async ({ page }) => {
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');

    const yesterdayButton = page.locator(`button[name="${yesterdayStr}"]`);
    if (await yesterdayButton.isVisible()) {
      await expect(yesterdayButton).toBeDisabled();
    }
  });

  test('selecting a slot shows confirm box', async ({ page }) => {
    const dateStr = getNextNonMondayStr();

    const dayButton = page.locator(`button[name="${dateStr}"]`);
    if (await dayButton.isVisible()) {
      await dayButton.click();
    } else {
      await page.locator('button[aria-label="Go to next month"]').click();
      await page.locator(`button[name="${dateStr}"]`).click();
    }

    await page.waitForLoadState('networkidle');

    // Click the first available slot
    const availableSlot = page.locator('button').filter({
      hasNot: page.locator('[disabled]'),
    }).filter({ hasText: /\d{2}:\d{2}/ }).first();

    if (await availableSlot.isVisible()) {
      await availableSlot.click();
      await expect(page.getByText('Booking:')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Confirm booking' })).toBeVisible();
    }
  });

  test('booking window banner shows for golf range', async ({ page }) => {
    // Navigate to 스크린 골프 specifically
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find the 스크린 골프 book button
    const golfCard = page.locator('div').filter({ hasText: '스크린 골프' }).last();
    const bookBtn  = golfCard.getByRole('button', { name: '예약하기' });

    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForLoadState('networkidle');

      // Should show booking window banner (green or red)
      const banner = page.locator('div').filter({
        hasText: /Booking open|Booking is currently closed/,
      }).first();
      await expect(banner).toBeVisible();
    }
  });

  test('shows capacity remaining on slots when capacity > 1', async ({ page }) => {
    // Navigate to 스크린 골프 which has capacity 4
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const golfCard = page.locator('div').filter({ hasText: '스크린 골프' }).last();
    const bookBtn  = golfCard.getByRole('button', { name: '예약하기' });

    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForLoadState('networkidle');

      const dateStr = getNextNonMondayStr();
      const dayButton = page.locator(`button[name="${dateStr}"]`);

      if (await dayButton.isVisible()) {
        await dayButton.click();
        await page.waitForLoadState('networkidle');

        // Should show "X left" on slots
        await expect(page.getByText(/\d+ left/)).toBeVisible();
      }
    }
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    });

    await page.goto('/amenities/a1b2c3d4-0000-0000-0000-000000000010/availability');
    await expect(page).toHaveURL('/login');
  });

});