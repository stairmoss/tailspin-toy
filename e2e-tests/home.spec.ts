import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    // Check that the main page heading is present
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    // Check that the site branding is present in the header (no longer an h1)
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    // Check that the welcome message is present using more specific locator
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should toggle and persist the selected theme', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-toggle');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to light theme');

    await themeToggle.click();

    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to dark theme');
    await expect(page.locator('body')).toHaveClass(/bg-slate-50/);

    await page.reload();

    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'false');
  });
});
