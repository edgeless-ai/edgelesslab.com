import { test, expect } from '@playwright/test';

test.describe('Edgeless website e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home page renders and shows primary headline', async ({ page }) => {
    await expect(page).toHaveTitle(/edgeless/i);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('chat shell loads on /agents', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.getByRole('heading', { name: /swarm/i })).toBeVisible();
  });
});
