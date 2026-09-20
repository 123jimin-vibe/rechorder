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
    await lower.evaluate((element) =>
      element.addEventListener(
        'pointerdown',
        (event) => {
          element.dataset['lastTouchPointer'] = String(
            (event as PointerEvent).pointerId,
          );
        },
        { capture: true },
      ),
    );
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
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
      const pointerId = Number(
        await lower.getAttribute('data-last-touch-pointer'),
      );
      await lower.dispatchEvent('pointercancel', {
        bubbles: true,
        pointerId,
        pointerType: 'touch',
        clientX: second.x,
        clientY: second.y,
      });
      await expect(dragged).toHaveAttribute('aria-pressed', 'true');
    }

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
    await expect(dragged).toHaveAttribute('aria-pressed', 'true');
    await input.send('Input.dispatchTouchEvent', {
      type: turn === 3 ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
    await expect(held).toHaveAttribute('aria-pressed', 'false');
    await expect(dragged).toHaveAttribute('aria-pressed', 'false');

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

test('two touched notes pause row scrolling until one releases', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Uses constructed touch input.');
  await page.addInitScript(installAudioProbe);
  await page.goto('./piano/');
  test.skip(
    (await page.evaluate(() => navigator.maxTouchPoints)) === 0,
    'Requires a touch-enabled browser context.',
  );
  const row = page.locator('[data-keyboard-scroll="piano:upper"]');
  const held = row.getByRole('button', { name: 'Play C4', exact: true });
  const dragged = row.getByRole('button', { name: 'Play G4', exact: true });
  const heldPoint = await keyPoint(held, 0);
  const draggedPoint = await keyPoint(dragged, 0);
  const before = await row.evaluate((element) => element.scrollLeft);

  await page.evaluate(
    ({ heldPoint, draggedPoint }) => {
      const held = document.querySelector<HTMLElement>(
        '[data-keyboard-scroll="piano:upper"] [aria-label="Play C4"]',
      )!;
      const dragged = document.querySelector<HTMLElement>(
        '[data-keyboard-scroll="piano:upper"] [aria-label="Play G4"]',
      )!;
      const contact = (
        identifier: number,
        target: EventTarget,
        point: { x: number; y: number },
      ) =>
        new Touch({
          identifier,
          target,
          clientX: point.x,
          clientY: point.y,
        });
      const send = (
        target: HTMLElement,
        type: string,
        touches: Touch[],
        changedTouches: Touch[],
      ) =>
        target.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches,
            targetTouches: touches.filter((touch) => touch.target === target),
            changedTouches,
          }),
        );

      const first = contact(31, held, heldPoint);
      const second = contact(32, dragged, draggedPoint);
      send(held, 'touchstart', [first], [first]);
      send(dragged, 'touchstart', [first, second], [second]);
      for (const distance of [20, 40, 60, 80]) {
        const moved = contact(32, dragged, {
          x: draggedPoint.x - distance,
          y: draggedPoint.y,
        });
        send(dragged, 'touchmove', [first, moved], [moved]);
      }
      send(dragged, 'touchcancel', [first], [second]);
      (window as typeof window & { moveHeldTouch: () => void }).moveHeldTouch =
        () => {
          const moved = contact(31, held, {
            x: heldPoint.x - 80,
            y: heldPoint.y,
          });
          send(held, 'touchmove', [moved], [moved]);
        };
      (
        window as typeof window & { finishHeldTouch: () => void }
      ).finishHeldTouch = () => send(held, 'touchend', [], [first]);
    },
    { heldPoint, draggedPoint },
  );

  expect(await row.evaluate((element) => element.scrollLeft)).toBe(before);
  await expect(dragged).toHaveAttribute('aria-pressed', 'false');
  await expect(held).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() =>
    (window as typeof window & { moveHeldTouch: () => void }).moveHeldTouch(),
  );
  await expect
    .poll(() => row.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(before + 70);
  await page.evaluate(() =>
    (
      window as typeof window & { finishHeldTouch: () => void }
    ).finishHeldTouch(),
  );
  await expect(held).toHaveAttribute('aria-pressed', 'false');
});

test('two notes in the lower row do not lock the upper row', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Uses Chromium native multitouch.');
  await page.addInitScript(installAudioProbe);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./piano/');
  const upper = page.locator('[data-keyboard-scroll="piano:upper"]');
  const lower = page.locator('[data-keyboard-scroll="piano:lower"]');
  const upperKey = upper.getByRole('button', {
    name: 'Play E4',
    exact: true,
  });
  const lowerC = lower.getByRole('button', { name: 'Play C4', exact: true });
  const lowerG = lower.getByRole('button', { name: 'Play G4', exact: true });
  const first = { id: 41, ...(await keyPoint(lowerC, 0)) };
  const second = { id: 42, ...(await keyPoint(lowerG, 0)) };
  const third = { id: 43, ...(await keyPoint(upperKey, 0)) };
  const beforeLower = await lower.evaluate((element) => element.scrollLeft);
  const beforeUpper = await upper.evaluate((element) => element.scrollLeft);
  const input = await page.context().newCDPSession(page);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first],
  });
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first, second],
  });
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first, second, third],
  });
  await expect(lowerC).toHaveAttribute('aria-pressed', 'true');
  await expect(lowerG).toHaveAttribute('aria-pressed', 'true');
  await expect(upperKey).toHaveAttribute('aria-pressed', 'true');
  expect(
    await lower.evaluate((element) => getComputedStyle(element).overflowX),
  ).toBe('hidden');
  expect(
    await upper.evaluate((element) => getComputedStyle(element).overflowX),
  ).toBe('auto');
  for (const distance of [20, 40, 60, 80]) {
    await input.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        first,
        { ...second, x: second.x - distance },
        { ...third, x: third.x - distance },
      ],
    });
  }
  expect(await lower.evaluate((element) => element.scrollLeft)).toBe(
    beforeLower,
  );
  await expect
    .poll(() => upper.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(beforeUpper + 70);
  const lowerBox = (await lower.boundingBox())!;
  await page.mouse.move(
    lowerBox.x + lowerBox.width / 2,
    lowerBox.y + lowerBox.height / 2,
  );
  await page.mouse.wheel(72, 0);
  expect(await lower.evaluate((element) => element.scrollLeft)).toBe(
    beforeLower,
  );
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ ...second, x: second.x - 80 }],
  });
  await expect(lowerG).toHaveAttribute('aria-pressed', 'false');
  expect(
    await lower.evaluate((element) => getComputedStyle(element).overflowX),
  ).toBe('auto');
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { ...first, x: first.x - 80 },
      { ...third, x: third.x - 80 },
    ],
  });
  await expect
    .poll(() => lower.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(beforeLower + 70);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(lowerC).toHaveAttribute('aria-pressed', 'false');
  await expect(upperKey).toHaveAttribute('aria-pressed', 'false');
});

test('mouse dragging scrolls without releasing the starting key', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./piano/');
  const row = page.locator('[data-keyboard-scroll="piano:upper"]');
  const key = row.getByRole('button', { name: 'Play G4', exact: true });
  const before = await row.evaluate((element) => element.scrollLeft);
  const point = await keyPoint(key, 0);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(point.x + 100, point.y, { steps: 5 });
  await expect
    .poll(() => row.evaluate((element) => element.scrollLeft))
    .toBeLessThan(before - 80);
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.up();
  await expect(key).toHaveAttribute('aria-pressed', 'false');
});

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

test('prepares audio before touch without focusing or duplicating the held key', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Uses Chromium touch injection.');
  await page.addInitScript(installAudioProbe);
  await page.goto('./piano/');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.worklets.length))
    .toBe(1);
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(1);
  expect(await page.evaluate(() => window.audioProbe.resumeCalls)).toBe(0);

  const key = page
    .getByRole('group', { name: 'Upper piano keyboard' })
    .getByRole('button', { name: 'Play C4', exact: true });
  const point = { id: 21, ...(await keyPoint(key, 0)) };
  const input = await page.context().newCDPSession(page);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [point],
  });
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBe(1);
  expect(
    await key.evaluate((element) => ({
      focused: document.activeElement === element,
      tap: getComputedStyle(element).getPropertyValue(
        '-webkit-tap-highlight-color',
      ),
    })),
  ).toEqual({ focused: false, tap: 'rgba(0, 0, 0, 0)' });
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await input.detach();
  await expect(key).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.audioProbe.sources.length)).toBe(1);
});

test('both utilities share complete key styling and keyboard controls', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
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
        shadow: style.boxShadow,
        transform: style.transform,
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
  expect(
    await key.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe('solid');
  await page.keyboard.down('Space');
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(100);
  const pressed = await keyStyle(key);
  expect(pressed.shadow).not.toBe(white.shadow);
  expect(pressed.transform).not.toBe(white.transform);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(key).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.up('Space');
  await expect(key).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.audioProbe.sources.length)).toBe(1);

  const blackKey = piano.getByRole('button', {
    name: 'Play C♯4',
    exact: true,
  });
  await blackKey.focus();
  await page.keyboard.down('Space');
  await expect(blackKey).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(100);
  const blackPressed = await keyStyle(blackKey);
  expect(blackPressed.shadow).not.toBe(black.shadow);
  expect(blackPressed.transform).not.toBe(black.transform);
  await page.keyboard.up('Space');
  await expect(blackKey).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.audioProbe.sources.length)).toBe(2);
});
