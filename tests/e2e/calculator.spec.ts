import { test, expect } from '@playwright/test';

test('mortgage calculator page loads', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Mortgage/i);
});

test('calculates the monthly payment from the entered mortgage details', async ({ page }) => {
  await page.goto('/');
  await page.locator('#price').fill('500000');
  await page.locator('#downPayment').fill('100000');
  await page.locator('#rate').fill('6');
  await page.locator('#tax').fill('6000');
  await page.locator('#insurance').fill('1200');
  await page.locator('#hoa').fill('100');

  await page.locator('#calcBtn').click();

  await expect(page.locator('#piAmount')).toHaveText('$2,398');
  await expect(page.locator('#paymentAmount')).toHaveText('$3,098');
});

test('calculates the principal payment when the interest rate is zero', async ({ page }) => {
  await page.goto('/');
  await page.locator('#price').fill('500000');
  await page.locator('#downPayment').fill('100000');
  await page.locator('#rate').fill('0');

  await page.locator('#calcBtn').click();

  await expect(page.locator('#piAmount')).toHaveText('$1,111');
  await expect(page.locator('#paymentAmount')).toHaveText('$1,111');
});
