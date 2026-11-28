import { test, expect } from '@playwright/test';

test('mortgage calculator page loads', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Mortgage/i);
});

test('about us footer link navigates to about page', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'About Us' }).click();

  await expect(page).toHaveURL(/about\.html$/);
  await expect(page).toHaveTitle(/About Us/i);
  await expect(page.getByRole('heading', { name: /Clarity Over Complexity/i })).toBeVisible();
  await expect(page.getByText('Faruk Hasan')).toBeVisible();
});