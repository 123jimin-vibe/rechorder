import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

const rotateName = 'Rotate view 90 degrees clockwise';

async function keyPoint(key: Locator, turn: number) {
  const box = (await key.boundingBox())!;
  // Aim near the bottom of the white key, clear of black keys in each orientation.
  const positions = [
    [0.5, 0.85],
    [0.15, 0.5],
    [0.5, 0.15],
    [0.85, 0.5],
  ];
  const [x, y] = positions[turn]!;
  return { x: box.x + box.width * x!, y: box.y + box.height * y! };
}

for (const turn of [0, 1, 2, 3]) {
  test(`holding one row permits touch and wheel scrolling of the other at ${turn * 90} degrees`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName !== 'chromium',
      'Uses Chromium multi-touch injection.',
    );
    await page.addInitScript(installAudioProbe);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./piano/');
    for (let count = 0; count < turn; count++)
      await page.getByRole('button', { name: rotateName }).click();
    await expect(page.locator('main')).toHaveAttribute(
      'data-orientation',
      String(turn * 90),
    );
    const bounds = (await page.locator('main').boundingBox())!;
    expect(bounds.x).toBeCloseTo(0, 0);
    expect(bounds.y).toBeCloseTo(0, 0);
    expect(bounds.width).toBeCloseTo(390, 0);
    expect(bounds.height).toBeCloseTo(844, 0);

    const upper = page.locator('[data-keyboard-scroll="piano:upper"]');
    const lower = page.locator('[data-keyboard-scroll="piano:lower"]');
    const held = upper.getByRole('button', { name: 'Play C4', exact: true });
    const dragged = lower.getByRole('button', { name: 'Play G4', exact: true });
    const initialUpper = await upper.evaluate((element) => element.scrollLeft);
    const initialLower = await lower.evaluate((element) => element.scrollLeft);
    const first = { id: 11, ...(await keyPoint(held, turn)) };
    const second = { id: 12, ...(await keyPoint(dragged, turn)) };
    const input = await page.context().newCDPSession(page);
    await input.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [first],
    });
    await input.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [first, second],
    });
    await expect(held).toHaveAttribute('aria-pressed', 'true');
    await expect(dragged).toHaveAttribute('aria-pressed', 'true');

    const axis = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ][turn]!;
    for (const distance of [20, 40, 60, 80]) {
      await input.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          first,
          {
            ...second,
            x: second.x - axis[0]! * distance,
            y: second.y - axis[1]! * distance,
          },
        ],
      });
    }
    await expect
      .poll(() => lower.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(initialLower + 70);
    expect(await upper.evaluate((element) => element.scrollLeft)).toBe(
      initialUpper,
    );
    await expect(held).toHaveAttribute('aria-pressed', 'true');
    await expect(dragged).toHaveAttribute('aria-pressed', 'false');
    await input.send('Input.dispatchTouchEvent', {
      type: turn === 3 ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
    await expect(held).toHaveAttribute('aria-pressed', 'false');

    const beforeWheel = await lower.evaluate((element) => element.scrollLeft);
    const rowBox = (await lower.boundingBox())!;
    await page.mouse.move(
      rowBox.x + rowBox.width / 2,
      rowBox.y + rowBox.height / 2,
    );
    await page.mouse.wheel(axis[0]! * 72, axis[1]! * 72);
    await expect
      .poll(() => lower.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(beforeWheel + 1);
    expect(await upper.evaluate((element) => element.scrollLeft)).toBe(
      initialUpper,
    );
    await page.screenshot({
      path: testInfo.outputPath(`piano-${turn * 90}.png`),
    });
  });
}

test('rotation completes a full cycle without resetting rows or adding visible labels', async ({
  page,
}) => {
  await page.goto('./piano/');
  const rows = page.locator('[data-keyboard-scroll]');
  const before = await rows.evaluateAll((elements) =>
    elements.map((element) => element.scrollLeft),
  );
  for (const angle of [90, 180, 270, 0]) {
    await page.getByRole('button', { name: rotateName }).click();
    await expect(page.locator('main')).toHaveAttribute(
      'data-orientation',
      String(angle),
    );
  }
  expect(
    await rows.evaluateAll((elements) =>
      elements.map((element) => element.scrollLeft),
    ),
  ).toEqual(before);
  await expect(page.getByText('Upper', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Lower', { exact: true })).toHaveCount(0);
});

test('both utilities share complete key styling and keyboard controls', async ({
  page,
}) => {
  const keyStyle = (key: Locator) =>
    key.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        border: style.border,
        background: style.backgroundColor,
        color: style.color,
        width: style.width,
        padding: style.padding,
        radius: style.borderRadius,
        font: style.font,
        touchAction: style.touchAction,
      };
    });
  await page.goto('./chord-progression/');
  const white = await keyStyle(
    page.getByRole('button', { name: 'Play C4', exact: true }),
  );
  const black = await keyStyle(
    page.getByRole('button', { name: 'Play C♯4', exact: true }),
  );
  await page.goto('./piano/');
  const piano = page.getByRole('group', { name: 'Upper piano keyboard' });
  const key = piano.getByRole('button', { name: 'Play C4', exact: true });
  expect(await keyStyle(key)).toEqual(white);
  expect(
    await keyStyle(
      piano.getByRole('button', { name: 'Play C♯4', exact: true }),
    ),
  ).toEqual(black);
  await key.focus();
  await page.keyboard.down('Space');
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('Space');
  await expect(key).toHaveAttribute('aria-pressed', 'false');
});
