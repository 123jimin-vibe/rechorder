import { expect, test } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installAudioProbe);
});

test('static page fills the viewport, stays silent on load, and supports keyboard playing', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await page.getByRole('link', { name: 'Harmonic grid', exact: true }).click();
  await expect(page).toHaveTitle('Harmonic grid · Rechorder');
  await page.reload();
  const grid = page.getByRole('application');
  const viewport = page.viewportSize()!;
  await expect(grid).toBeVisible();
  expect(await grid.boundingBox()).toEqual({ x: 0, y: 0, ...viewport });
  expect(await page.evaluate(() => window.audioProbe.sources.length)).toBe(0);
  await grid.focus();
  await page.keyboard.down('Space');
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-held',
    'true',
  );
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeGreaterThan(0.001);
  await page.keyboard.up('Space');
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-held',
    'false',
  );
  await page.keyboard.press('ArrowRight');
  await page.keyboard.down('Enter');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBe(2);
  const frequencies = await page.evaluate(() =>
    window.audioProbe.sources.map((note) => note.frequency),
  );
  expect(frequencies[1]! / frequencies[0]!).toBeCloseTo(1.5, 10);
  await page.getByRole('link', { name: 'Rechorder home' }).focus();
  await expect(page.locator('[data-held="true"]')).toHaveCount(0);
  await page.keyboard.up('Enter');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.00001);
  await grid.focus();
  await page.keyboard.press('Home');
  await page.screenshot({ path: testInfo.outputPath('harmonic-grid.png') });
  expect(errors).toEqual([]);
});

test('real multitouch sustains a chord while dragging, releases independently, and cancels cleanly', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Uses Chromium native multitouch injection.',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./harmonic-grid/');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const grid = page.getByRole('application');
  const first = { id: 1, x: 195, y: 422 };
  const second = { id: 2, x: 271.21, y: 422 };
  const input = await page.context().newCDPSession(page);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first],
  });
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first, second],
  });
  await expect(page.locator('[data-held="true"]')).toHaveCount(2);
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBe(2);
  for (const distance of [20, 40, 60, 80]) {
    await input.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        first,
        { ...second, x: second.x - distance, y: second.y + distance },
      ],
    });
  }
  await expect
    .poll(async () => Number(await grid.getAttribute('data-pan-x')))
    .toBeCloseTo(-80, 3);
  await expect(grid).toHaveAttribute('data-pan-y', '80');
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-held',
    'true',
  );
  await expect(page.locator('[data-cell="1,0"]')).toHaveAttribute(
    'data-held',
    'true',
  );
  expect(await page.evaluate(() => window.audioProbe.sources.length)).toBe(2);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ ...second, x: second.x - 80, y: second.y + 80 }],
  });
  await expect(page.locator('[data-cell="1,0"]')).toHaveAttribute(
    'data-held',
    'false',
  );
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-held',
    'true',
  );
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...first, x: first.x + 20 }],
  });
  await expect
    .poll(async () => Number(await grid.getAttribute('data-pan-x')))
    .toBeCloseTo(-60, 3);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  });
  await expect(page.locator('[data-held="true"]')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.00001);
  expect(errors).toEqual([]);
});

test('long mouse drags keep rendering bounded and release off-screen starting notes', async ({
  page,
}) => {
  await page.goto('./harmonic-grid/');
  const grid = page.getByRole('application');
  const { width, height } = page.viewportSize()!;
  const initialCount = await page.locator('[data-cell]').count();
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.down();
  await page.mouse.move(width / 2 + 5000, height / 2 + 5000, { steps: 8 });
  await expect(grid).toHaveAttribute('data-pan-x', '5000');
  expect(await page.locator('[data-cell]').count()).toBeLessThan(
    initialCount + 30,
  );
  await page.mouse.up();
  await expect(page.locator('[data-held="true"]')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.00001);
});
