import { expect, test } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

test('editing preserves identities, candidate isolation, and insertion anchors', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const cards = page.locator('[data-entry-id]');
  const insert = page.getByRole('button', { name: 'Insert chord' });
  const remove = page.getByRole('button', { name: 'Remove', exact: true });
  await expect(remove).toBeDisabled();
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'No notes playing',
  );
  await insert.click();
  await insert.click();
  const ids = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-entry-id')),
  );
  expect(new Set(ids).size).toBe(2);
  await page
    .getByRole('button', {
      name: 'Set insertion point at position 2',
      exact: true,
    })
    .click();
  await page
    .getByRole('combobox', { name: 'Root', exact: true })
    .selectOption('D♭');
  await page.getByLabel('Chord type').selectOption('minor');
  await insert.click();
  await expect(cards.locator('strong')).toHaveText(['C', 'D♭m', 'C']);
  await expect(
    page.getByRole('button', {
      name: 'Insert D♭m at position 3',
      exact: true,
    }),
  ).toHaveAttribute('data-insertion-active', 'true');
  await page.getByRole('button', { name: 'Move right', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['C', 'C', 'D♭m']);
  // The insertion point follows the same C entry when it moves left.
  await expect(
    page.getByRole('button', {
      name: 'Insert D♭m at position 2',
      exact: true,
    }),
  ).toHaveAttribute('data-insertion-active', 'true');
  await expect(
    page.getByRole('button', { name: 'Move right', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Select chord 2: C', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Root', exact: true }),
  ).toHaveValue('D♭');
  await expect(page.getByLabel('Chord type')).toHaveValue('minor');
  await remove.click();
  await expect(cards.locator('strong')).toHaveText(['C', 'D♭m']);
  await expect(
    page.getByRole('button', {
      name: 'Insert D♭m at position 2',
      exact: true,
    }),
  ).toHaveAttribute('data-insertion-active', 'true');
  await remove.click();
  await remove.click();
  await expect(cards).toHaveCount(0);
  await expect(remove).toBeDisabled();
  await expect(
    page.getByRole('button', {
      name: 'Insert D♭m at position 1',
      exact: true,
    }),
  ).toHaveAttribute('data-insertion-active', 'true');
});

test('the insertion preview shows and inserts the candidate exactly where placed', async ({
  page,
}, testInfo) => {
  await page.goto('./chord-progression/');
  await expect(page.getByText(/Next chord goes/)).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Insert C at position 1', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Insert C at position 2', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: 'Set insertion point at position 2',
      exact: true,
    })
    .click();
  await page
    .getByRole('combobox', { name: 'Root', exact: true })
    .selectOption('D');
  await page
    .getByRole('combobox', { name: 'Chord type', exact: true })
    .selectOption('minor');
  const preview = page.getByRole('button', {
    name: 'Insert Dm at position 2',
    exact: true,
  });
  await expect(preview).toHaveText('+ DmInsert');
  const cards = page.locator('[data-entry-id]');
  await expect(cards).toHaveCount(2);
  const before = await cards.nth(0).boundingBox();
  const gap = await preview.boundingBox();
  const after = await cards.nth(1).boundingBox();
  expect(
    before &&
      gap &&
      after &&
      before.x + before.width <= gap.x &&
      gap.x + gap.width <= after.x,
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('insertion-preview.png'),
    fullPage: true,
  });
  await preview.press('Enter');
  await expect(cards.locator('strong')).toHaveText(['C', 'Dm', 'C']);
  await expect(
    page.getByRole('button', { name: 'Insert Dm at position 3', exact: true }),
  ).toBeVisible();
});

test('a different chord starts immediately while the previous chord is sounding', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Insert chord', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Root', exact: true })
    .selectOption('D');
  await page
    .getByRole('combobox', { name: 'Chord type', exact: true })
    .selectOption('minor');
  await page.getByRole('button', { name: 'Insert chord', exact: true }).click();
  await page
    .getByRole('button', { name: 'Play chord 1: C', exact: true })
    .click();
  await expect(page.getByLabel('Currently playing notes')).toHaveText('C3E3G3');
  const initialResumes = await page.evaluate(
    () => window.audioProbe.resumeCalls,
  );
  await page
    .getByRole('button', { name: 'Play chord 2: Dm', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.oscillators.length), {
      timeout: 300,
    })
    .toBe(6);
  const timing = await page.evaluate(() => ({
    starts: window.audioProbe.starts,
    resumes: window.audioProbe.resumeCalls,
  }));
  expect(timing.resumes).toBe(initialResumes);
  expect(timing.starts[3]! - timing.starts[0]!).toBeLessThan(0.5);
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'D3F3A3',
    { timeout: 300 },
  );
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeGreaterThan(0.01);
});

test('long progressions scroll within the page and remain keyboard operable', async ({
  page,
}, testInfo) => {
  await page.goto('./chord-progression/');
  const insert = page.getByRole('button', { name: 'Insert chord' });
  for (let index = 0; index < 12; index++) await insert.click();
  const strip = page.getByRole('group', {
    name: 'Chord progression',
    exact: true,
  });
  await expect
    .poll(() => strip.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const layout = await strip.evaluate((element) => ({
    scroll: element.scrollWidth,
    width: element.clientWidth,
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(layout.scroll).toBeGreaterThan(layout.width);
  expect(layout.page).toBeLessThanOrEqual(layout.viewport);
  const first = page.getByRole('button', {
    name: 'Select chord 1: C',
    exact: true,
  });
  await first.focus();
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Move left', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Play chord 1: C', exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('chord-editor.png'),
    fullPage: true,
  });
});

test('individual chords render native audio and report sounding notes until silence', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Insert chord' }).click();
  await page
    .getByRole('combobox', { name: 'Root', exact: true })
    .selectOption('D');
  await page.getByLabel('Chord type').selectOption('minor');
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0);
  const sounding = page.getByLabel('Currently playing notes');
  await page
    .getByRole('button', { name: 'Play chord 1: C', exact: true })
    .click();
  await expect(sounding).toHaveText('C3E3G3');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeGreaterThan(0.01);
  const frequencies = await page.evaluate(() =>
    window.audioProbe.oscillators.map((node) => node.frequency.value),
  );
  expect(frequencies).toHaveLength(3);
  expect(frequencies[0]).toBeCloseTo(130.8128, 3);
  expect(frequencies[1]).toBeCloseTo(164.8138, 3);
  expect(frequencies[2]).toBeCloseTo(195.9977, 3);
  await expect(sounding).toHaveText('No notes playing');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.00001);
  await page.getByRole('button', { name: 'Play candidate' }).click();
  await expect(sounding).toHaveText('D3F3A3');
  await page
    .getByRole('combobox', { name: 'Root', exact: true })
    .selectOption('E');
  await expect(sounding).toHaveText('D3F3A3');
  await expect(sounding).toHaveText('No notes playing');
});

test('removing an audition source stops audio; suspended contexts report silence', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Insert chord' }).click();
  const sounding = page.getByLabel('Currently playing notes');
  await page
    .getByRole('button', { name: 'Play chord 1: C', exact: true })
    .click();
  await expect(sounding).toHaveText('C3E3G3');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(sounding).toHaveText('No notes playing', { timeout: 750 });
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.00001);
  await page.getByRole('button', { name: 'Play candidate' }).click();
  await expect(sounding).toHaveText('C3E3G3');
  await page.evaluate(async () => {
    await window.audioProbe.contexts[0]?.suspend();
  });
  await expect(sounding).toHaveText('No notes playing');
  await page.getByRole('button', { name: 'Play candidate' }).click();
  await expect(sounding).toHaveText('C3E3G3');
  await expect(sounding).toHaveText('No notes playing');
});

test('audio failure is logged while the editor remains usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.AudioContext = new Proxy(AudioContext, {
      construct() {
        throw new Error('Test audio unavailable');
      },
    });
  });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Play candidate' }).click();
  await expect
    .poll(() =>
      errors.some((error) => error.includes('Chord playback failed.')),
    )
    .toBe(true);
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'No notes playing',
  );
  await page.getByRole('button', { name: 'Insert chord' }).click();
  await expect(page.locator('[data-entry-id]')).toHaveCount(1);
});
