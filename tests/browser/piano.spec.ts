import { expect, test } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

test('two piano rows scroll independently and remain visible when rotated', async ({
  page,
}, testInfo) => {
  await page.addInitScript(installAudioProbe);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./piano/');
  await expect(page).toHaveTitle('Piano · Rechorder');
  const upper = page.locator('[data-keyboard-scroll="piano:upper"]');
  const lower = page.locator('[data-keyboard-scroll="piano:lower"]');
  const starting = await Promise.all([
    upper.evaluate((element) => element.scrollLeft),
    lower.evaluate((element) => element.scrollLeft),
  ]);
  expect(starting[0]).toBeGreaterThan(0);
  expect(starting[1]).toBeGreaterThan(0);
  await upper.evaluate((element) => {
    element.scrollLeft += 320;
  });
  expect(await upper.evaluate((element) => element.scrollLeft)).toBeGreaterThan(
    starting[0]!,
  );
  expect(await lower.evaluate((element) => element.scrollLeft)).toBe(
    starting[1],
  );

  await page.getByRole('button', { name: 'Rotate view 90 degrees' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-rotated', 'true');
  const bounds = await page.locator('main').boundingBox();
  expect(bounds?.x).toBeCloseTo(0, 0);
  expect(bounds?.y).toBeCloseTo(0, 0);
  expect(bounds?.width).toBeCloseTo(390, 0);
  expect(bounds?.height).toBeCloseTo(844, 0);
  await expect(
    page
      .getByRole('group', { name: 'Lower piano keyboard' })
      .getByRole('button', { name: 'Play C4' }),
  ).toBeVisible();
  const key = page
    .getByRole('group', { name: 'Lower piano keyboard' })
    .getByRole('button', { name: 'Play C4' });
  const keyBox = (await key.boundingBox())!;
  await page.mouse.move(
    keyBox.x + keyBox.width / 2,
    keyBox.y + keyBox.height / 2,
  );
  await page.mouse.down();
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.up();
  await page.screenshot({ path: testInfo.outputPath('rotated-piano.png') });
  expect(await lower.evaluate((element) => element.scrollLeft)).toBe(
    starting[1],
  );
  await page.getByRole('button', { name: 'Return to upright view' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-rotated', 'false');
  expect(await upper.evaluate((element) => element.scrollLeft)).toBeGreaterThan(
    starting[0]!,
  );
});

test('both rows can sound a chord and release their own touch', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Uses Chromium touch injection.');
  await page.addInitScript(installAudioProbe);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./piano/');
  const upper = page.getByRole('group', { name: 'Upper piano keyboard' });
  const lower = page.getByRole('group', { name: 'Lower piano keyboard' });
  const c = upper.getByRole('button', { name: 'Play C4' });
  const e = lower.getByRole('button', { name: 'Play E4' });
  const cBox = (await c.boundingBox())!;
  const eBox = (await e.boundingBox())!;
  const first = {
    id: 11,
    x: cBox.x + cBox.width / 2,
    y: cBox.y + cBox.height - 15,
  };
  const second = {
    id: 12,
    x: eBox.x + eBox.width / 2,
    y: eBox.y + eBox.height - 15,
  };
  const input = await page.context().newCDPSession(page);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first],
  });
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first, second],
  });
  await expect(c).toHaveAttribute('aria-pressed', 'true');
  await expect(e).toHaveAttribute('aria-pressed', 'true');
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(c).toHaveAttribute('aria-pressed', 'false');
  await expect(e).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.audioProbe.sources.length)).toBe(2);
});
