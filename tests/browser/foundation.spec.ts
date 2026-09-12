import { expect, test } from '@playwright/test';

test('home links to a reloadable static tool page without asset errors', async ({
  page,
}) => {
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
  await page.getByRole('link', { name: 'Chord progression' }).click();
  await expect(page).toHaveTitle('Chord progression · Rechorder');
  await expect(
    page.getByRole('heading', { name: 'Chord progression', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Append chord' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Rechorder', exact: true }).click();
  await expect(page).toHaveTitle('Rechorder');
  expect(errors).toEqual([]);
});
