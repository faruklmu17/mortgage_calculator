import { test, expect } from '@playwright/test';

test('mortgage calculator page loads', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Mortgage/i);
});