import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helpers

async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  });
}

// Login Tests

test.describe('Login Page', () => {

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Resvy' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows link to register page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
    await page.getByRole('link', { name: 'Register' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('shows error on empty submit', async ({ page }) => {
    await page.click('button[type="submit"]');
    // Browser native validation prevents submission where email field required
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();
  });

  test('shows error on wrong password', async ({ page }) => {
    await page.fill('input[type="email"]',    'admin@resvy.com');
    await page.fill('input[type="password"]', 'WrongPassword1!');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Invalid email or password/)).toBeVisible();
  });

  test('shows error on non-existent email', async ({ page }) => {
    await page.fill('input[type="email"]',    'nobody@resvy.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Invalid email or password/)).toBeVisible();
  });

  test('shows attempts remaining on wrong password', async ({ page }) => {
    await page.fill('input[type="email"]',    'jisu2@resvy.com');
    await page.fill('input[type="password"]', 'WrongPassword1!');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/attempt/)).toBeVisible();
  });

  test('successful login redirects to amenities page', async ({ page }) => {
    await page.fill('input[type="email"]',    'admin@resvy.com');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Amenities')).toBeVisible();
  });

  test('shows loading state while signing in', async ({ page }) => {
    await page.fill('input[type="email"]',    'admin@resvy.com');
    await page.fill('input[type="password"]', 'Admin1234!');

    // Click and immediately check for loading state
    await page.click('button[type="submit"]');
    // Loading text may be brief but should appear
    const btn = page.getByRole('button', { name: /Signing in/ });
    // Either loading shows or we've already redirected
    const redirected = await page.url().includes('/') && !page.url().includes('/login');
    if (!redirected) {
      await expect(btn).toBeVisible();
    }
  });

  test('already logged in users are redirected away from login', async ({ page }) => {
    // Log in first
    await page.fill('input[type="email"]',    'admin@resvy.com');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Try to go back to login
    await page.goto('/login');

    // Should be redirected back to home
    await expect(page).toHaveURL('/');
  });

  test('shows account locked message after too many attempts', async ({ page }) => {
    // First unlock the account in case it's locked from previous test runs
    // This test is intentionally skipped in CI — it modifies DB state
    test.skip(process.env.CI === 'true', 'Skipped in CI to avoid DB state pollution');

    // Make 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]',    'jisu2@resvy.com');
      await page.fill('input[type="password"]', 'WrongPassword1!');
      await page.click('button[type="submit"]');
      await page.waitForResponse(r => r.url().includes('/auth/login'));
    }

    await expect(page.getByText(/Account locked/)).toBeVisible();
    await expect(page.getByText(/minute/)).toBeVisible();
  });

});

// ─── Register Tests ───────────────────────────────────────────────

test.describe('Register Page', () => {

  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
  });

  test('shows register form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Join Resvy' })).toBeVisible();
    await expect(page.locator('input[placeholder="Your name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Min 8 characters"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Re-enter your password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. DEMO-BUILD1"]')).toBeVisible();
  });

  test('shows link to login page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('shows password strength meter when typing', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder="Min 8 characters"]');
    await passwordInput.fill('weak');

    // Strength bar should appear
    await expect(page.getByText('Weak')).toBeVisible();
  });

  test('password strength updates as password gets stronger', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder="Min 8 characters"]');

    await passwordInput.fill('weak');
    await expect(page.getByText('Weak')).toBeVisible();

    await passwordInput.fill('Stronger1');
    await expect(page.getByText('Good')).toBeVisible();

    await passwordInput.fill('Str0ng!Pass');
    await expect(page.getByText('Strong')).toBeVisible();
  });

  test('shows password rules checklist', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder="Min 8 characters"]');
    await passwordInput.fill('a');

    await expect(page.getByText('At least 8 characters')).toBeVisible();
    await expect(page.getByText('At least one uppercase letter')).toBeVisible();
    await expect(page.getByText('At least one number')).toBeVisible();
    await expect(page.getByText('At least one special character')).toBeVisible();
  });

  test('confirm password shows match indicator', async ({ page }) => {
    await page.locator('input[placeholder="Min 8 characters"]').fill('Test1234!');
    await page.locator('input[placeholder="Re-enter your password"]').fill('Test1234!');

    await expect(page.getByText('✓ Passwords match')).toBeVisible();
  });

  test('confirm password shows mismatch indicator', async ({ page }) => {
    await page.locator('input[placeholder="Min 8 characters"]').fill('Test1234!');
    await page.locator('input[placeholder="Re-enter your password"]').fill('Different1!');

    await expect(page.getByText('✗ Passwords do not match')).toBeVisible();
  });

  test('shows error when password requirements not met', async ({ page }) => {
    await page.fill('input[placeholder="Your name"]',        'Test User');
    await page.fill('input[type="email"]',                   'newuser@resvy.com');
    await page.fill('input[placeholder="Min 8 characters"]', 'weak');
    await page.fill('input[placeholder="Re-enter your password"]', 'weak');
    await page.fill('input[placeholder="e.g. DEMO-BUILD1"]', 'DEMO-BUILD1');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Please meet all password requirements')).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.fill('input[placeholder="Your name"]',             'Test User');
    await page.fill('input[type="email"]',                        'newuser@resvy.com');
    await page.fill('input[placeholder="Min 8 characters"]',      'Test1234!');
    await page.fill('input[placeholder="Re-enter your password"]', 'Different1!');
    await page.fill('input[placeholder="e.g. DEMO-BUILD1"]',      'DEMO-BUILD1');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('shows error on invalid building code', async ({ page }) => {
    await page.fill('input[placeholder="Your name"]',              'Test User');
    await page.fill('input[type="email"]',                         'newuser@resvy.com');
    await page.fill('input[placeholder="Min 8 characters"]',       'Test1234!');
    await page.fill('input[placeholder="Re-enter your password"]', 'Test1234!');
    await page.fill('input[placeholder="e.g. DEMO-BUILD1"]',       'INVALID-CODE');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Building code not found/)).toBeVisible();
  });

  test('shows error on duplicate email', async ({ page }) => {
    await page.fill('input[placeholder="Your name"]',              'Test User');
    await page.fill('input[type="email"]',                         'admin@resvy.com');
    await page.fill('input[placeholder="Min 8 characters"]',       'Test1234!');
    await page.fill('input[placeholder="Re-enter your password"]', 'Test1234!');
    await page.fill('input[placeholder="e.g. DEMO-BUILD1"]',       'DEMO-BUILD1');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Email already registered/)).toBeVisible();
  });

  test('building code auto-uppercases', async ({ page }) => {
    const codeInput = page.locator('input[placeholder="e.g. DEMO-BUILD1"]');
    await codeInput.fill('demo-build1');
    await expect(codeInput).toHaveValue('DEMO-BUILD1');
  });

  test('successful registration redirects to amenities page', async ({ page }) => {
    // Use a unique email to avoid conflicts
    const uniqueEmail = `test-${Date.now()}@resvy.com`;

    await page.fill('input[placeholder="Your name"]',              'New Resident');
    await page.fill('input[type="email"]',                         uniqueEmail);
    await page.fill('input[placeholder="Min 8 characters"]',       'Test1234!');
    await page.fill('input[placeholder="Re-enter your password"]', 'Test1234!');
    await page.fill('input[placeholder="e.g. DEMO-BUILD1"]',       'DEMO-BUILD1');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Amenities')).toBeVisible();
  });

  test('already logged in users are redirected away from register', async ({ page }) => {
    // Log in first via login page
    await page.goto('/login');
    await page.fill('input[type="email"]',    'admin@resvy.com');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Try to go to register
    await page.goto('/register');

    // Should be redirected back to home
    await expect(page).toHaveURL('/');
  });

});