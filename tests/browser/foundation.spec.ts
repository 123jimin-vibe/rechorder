import { expect, test } from '@playwright/test';

test('the built foundation loads an empty, styled page without errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('./');
  await expect(page).toHaveTitle('Rechorder');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('main')).toBeEmpty();
  await expect(page.locator('body')).toHaveText('');
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );

  const layout = await page.evaluate(() => ({
    contentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);

  // Direct reload must also resolve the deployed page and its hashed assets.
  await page.reload();
  await expect(page.getByRole('main')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('foundation.png') });
  expect(errors).toEqual([]);
});
