import { expect, test, type Page } from '@playwright/test';
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
  test.skip(
    await page.evaluate(() => typeof AudioContext === 'undefined'),
    'This browser build does not provide Web Audio.',
  );
  await page.getByRole('link', { name: 'Harmonic grid', exact: true }).click();
  await expect(page).toHaveTitle('Harmonic grid · Rechorder');
  await page.reload();
  const grid = page.getByRole('application');
  const viewport = page.viewportSize()!;
  await expect(grid).toBeVisible();
  const gridBounds = (await grid.boundingBox())!;
  const dockBounds = (await page
    .getByRole('region', { name: 'Chord design' })
    .boundingBox())!;
  expect(gridBounds.width).toBe(viewport.width);
  expect(gridBounds.height).toBeGreaterThan(viewport.height * 0.55);
  expect(gridBounds.y + gridBounds.height).toBeLessThanOrEqual(
    dockBounds.y + 1,
  );
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
  const bounds = (await grid.boundingBox())!;
  const first = { id: 1, x: bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const second = { id: 2, x: first.x + 76.21, y: first.y };
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
    .toBeCloseTo(0, 3);
  await expect(grid).toHaveAttribute('data-pan-y', '0');
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
    .toBeCloseTo(20, 3);
  await expect(grid).toHaveAttribute('data-pan-y', '0');
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

async function tapCell(page: Page, id: string) {
  const bounds = (await page
    .locator(`[data-cell="${id}"] polygon`)
    .boundingBox())!;
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
}

test('native touch latches a chord and focus loss stops comparison without losing selections', async ({
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
  await page.getByRole('button', { name: 'Latch', exact: true }).click();
  const grid = page.getByRole('application');
  const bounds = (await grid.boundingBox())!;
  const first = { id: 1, x: bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const second = { id: 2, x: first.x + 76.21, y: first.y };
  const input = await page.context().newCDPSession(page);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first, second],
  });
  await expect(page.locator('[data-held="true"]')).toHaveCount(2);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · G4');
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first],
  });
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  });
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · G4');
  await page.getByRole('button', { name: 'Keep as previous' }).click();
  await tapCell(page, '0,1');
  await page.getByRole('button', { name: '▶ Previous → Chord' }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeGreaterThan(0.001);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(
    page.getByRole('button', { name: '▶ Previous → Chord' }),
  ).toBeVisible();
  await expect(page.getByLabel('Selected notes')).toHaveText('E4');
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-previous',
    'true',
  );
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.00001);
  expect(errors).toEqual([]);
});

test('latches notes, previews whole-chord matches, and compares the previous chord', async ({
  page,
}, testInfo) => {
  await page.goto('./harmonic-grid/');
  test.skip(
    await page.evaluate(() => typeof AudioContext === 'undefined'),
    'This browser build does not provide Web Audio.',
  );
  await page.getByRole('button', { name: 'Latch', exact: true }).click();
  await tapCell(page, '0,0');
  await tapCell(page, '0,1');
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · E4');
  await expect(page.locator('[data-cell="1,0"]')).toHaveAttribute(
    'data-completion',
    'true',
  );
  await expect(page.locator('[data-selected="true"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Matches' }).click();
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: 'Use C', exact: true }).click();
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · E4 · G4');
  await page.getByRole('button', { name: 'Matches' }).click();
  await page.getByRole('button', { name: 'Keep as previous' }).click();
  await expect(page.getByLabel('Selected notes')).toHaveText('—');
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-previous',
    'true',
  );
  await tapCell(page, '0,0');
  await tapCell(page, '0,1');
  const before = await page.evaluate(() => window.audioProbe.sources.length);
  await page.getByRole('button', { name: '▶ Previous → Chord' }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBe(before + 5);
  const transition = await page.evaluate(
    (start) => window.audioProbe.sources.slice(start),
    before,
  );
  expect(transition[3]!.start - transition[0]!.start).toBeCloseTo(1, 2);
  expect(transition[0]!.frequency).toBeCloseTo(transition[3]!.frequency, 8);
  await expect(
    page.getByRole('button', { name: '▶ Previous → Chord' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Grid ▸' }).click();
  await page.getByLabel('Layout', { exact: true }).selectOption('steps');
  await page.getByRole('button', { name: 'Grid ▾' }).click();
  await page.getByRole('button', { name: 'Matches' }).click();
  await page.screenshot({ path: testInfo.outputPath('chord-design.png') });
});

test('preserves exact selections across layouts and supports individual octave edits and inversions', async ({
  page,
}) => {
  await page.goto('./harmonic-grid/');
  await page.getByRole('button', { name: 'Latch', exact: true }).click();
  for (const id of ['0,0', '0,1', '1,0']) await tapCell(page, id);
  await page.getByRole('button', { name: 'Grid ▸' }).click();
  await page.getByLabel('Layout', { exact: true }).selectOption('steps');
  await page
    .getByRole('button', { name: 'Grid up one octave', exact: true })
    .click();
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-note',
    'C5',
  );
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute(
    'data-equivalent',
    'true',
  );
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · E4 · G4');
  await page.getByLabel('Layout', { exact: true }).selectOption('octaves');
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · E4 · G4');
  await page.getByRole('button', { name: 'Voicing' }).click();
  await page
    .getByRole('button', { name: 'Higher inversion', exact: true })
    .click();
  await expect(page.getByLabel('Selected notes')).toHaveText('E4 · G4 · C5');
  await page
    .getByRole('button', { name: 'Lower C5 one octave', exact: true })
    .click();
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · E4 · G4');
  await page.getByRole('button', { name: 'Fixed bass', exact: true }).click();
  await page
    .getByRole('button', { name: 'Higher inversion', exact: true })
    .click();
  await expect(page.getByLabel('Selected notes')).toHaveText('C4 · G4 · E5');
  await page
    .getByRole('button', { name: 'Chord up one octave', exact: true })
    .click();
  await expect(page.getByLabel('Selected notes')).toHaveText('C5 · G5 · E6');
});

test('keyboard latch toggles and dragging or cancellation does not select notes', async ({
  page,
}) => {
  await page.goto('./harmonic-grid/');
  await page.getByRole('button', { name: 'Latch', exact: true }).click();
  const grid = page.getByRole('application');
  await grid.focus();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Selected notes')).toHaveText('C4');
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Selected notes')).toHaveText('—');
  const bounds = (await grid.boundingBox())!;
  const x = bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 90, y, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByLabel('Selected notes')).toHaveText('—');
  await page.mouse.move(x, y);
  const pointerId = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        document
          .querySelector('[role="application"]')!
          .addEventListener(
            'pointerdown',
            (event) => resolve((event as PointerEvent).pointerId),
            { once: true },
          );
      }),
  );
  await page.mouse.down();
  await grid.dispatchEvent('pointercancel', {
    pointerId: await pointerId,
    button: 0,
  });
  await page.mouse.up();
  await expect(page.getByLabel('Selected notes')).toHaveText('—');
});

test('controls reserve their own space on small portrait and landscape screens', async ({
  page,
}, testInfo) => {
  await page.goto('./harmonic-grid/');
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const name of ['Grid', 'Voicing', 'Matches']) {
      await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
      const grid = (await page.getByRole('application').boundingBox())!;
      const dock = (await page
        .getByRole('region', { name: 'Chord design' })
        .boundingBox())!;
      expect(grid.height).toBeGreaterThan(viewport.height * 0.45);
      expect(grid.y + grid.height).toBeLessThanOrEqual(dock.y + 1);
      expect(dock.y + dock.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
    }
    await page.screenshot({
      path: testInfo.outputPath(`controls-${viewport.width}.png`),
    });
    await page.getByRole('button', { name: 'Matches' }).click();
  }
});

test('repeated mouse drags keep rendering bounded and release starting notes', async ({
  page,
}) => {
  await page.goto('./harmonic-grid/');
  const grid = page.getByRole('application');
  const { width, height, y } = (await grid.boundingBox())!;
  const initialCount = await page.locator('[data-cell]').count();
  // Keep native mouse coordinates inside the viewport; Firefox's automation
  // does not deliver arbitrary off-screen coordinates like Chromium does.
  for (let index = 0; index < 20; index++) {
    await page.mouse.move(width / 4, y + height / 2);
    await page.mouse.down();
    await page.mouse.move((width * 3) / 4, y + height / 2, { steps: 2 });
    await page.mouse.up();
  }
  await expect
    .poll(async () => Number(await grid.getAttribute('data-pan-x')))
    .toBeCloseTo(width * 10, 0);
  expect(await page.locator('[data-cell]').count()).toBeLessThan(
    initialCount + 30,
  );
  await expect(page.locator('[data-held="true"]')).toHaveCount(0);
  if (await page.evaluate(() => typeof AudioContext !== 'undefined')) {
    await expect
      .poll(() => page.evaluate(() => window.audioProbe.energy()))
      .toBeLessThan(0.00001);
  }
});
