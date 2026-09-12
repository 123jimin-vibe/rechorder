import { expect, test } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

test('two direct choices audition a candidate without committing it', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(
    page.getByRole('group', { name: 'Root', exact: true }).getByRole('button'),
  ).toHaveCount(21);
  await expect(
    page
      .getByRole('group', { name: 'Chord type', exact: true })
      .getByRole('button'),
  ).toHaveCount(9);
  await page.getByRole('button', { name: 'Root D♭', exact: true }).click();
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  await expect(page.getByLabel('Candidate chord')).toHaveText(
    'D♭mD♭3 · F♭3 · A♭3',
  );
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'D♭3F♭3A♭3',
  );
  await expect(page.locator('[data-entry-id]')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Root D♭', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Minor', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Replace selected chord', exact: true }),
  ).toBeDisabled();
});

test('append, load, replace, and backspace preserve musical values and identities', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const cards = page.locator('[data-entry-id]');
  const append = page.getByRole('button', {
    name: 'Append chord',
    exact: true,
  });
  const replace = page.getByRole('button', {
    name: 'Replace selected chord',
    exact: true,
  });
  const backspace = page.getByRole('button', {
    name: 'Remove last chord',
    exact: true,
  });
  await expect(backspace).toBeDisabled();
  await append.click();
  await page.getByRole('button', { name: 'Root D', exact: true }).click();
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['C']);
  await append.click();
  await append.click();
  const ids = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-entry-id')),
  );
  expect(new Set(ids).size).toBe(3);
  await cards.nth(0).click();
  await expect(page.getByLabel('Candidate chord')).toHaveText('CC3 · E3 · G3');
  await expect(page.getByLabel('Currently playing notes')).toHaveText('C3E3G3');
  await page.getByRole('button', { name: 'Root G', exact: true }).click();
  await page
    .getByRole('button', { name: 'Dominant seventh', exact: true })
    .click();
  await expect(cards.locator('strong')).toHaveText(['C', 'Dm', 'Dm']);
  await replace.click();
  await expect(cards.locator('strong')).toHaveText(['G7', 'Dm', 'Dm']);
  expect(
    await cards.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-entry-id')),
    ),
  ).toEqual(ids);
  await backspace.click();
  await expect(cards.locator('strong')).toHaveText(['G7', 'Dm']);
  await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(replace).toHaveText('↔ Replace #1');
  await cards.nth(1).click();
  await backspace.click();
  await expect(replace).toBeDisabled();
  await expect(page.getByLabel('Candidate chord')).toHaveText('DmD3 · F3 · A3');
  await backspace.click();
  await expect(cards).toHaveCount(0);
  await expect(backspace).toBeDisabled();
});

test('timeline and type choices immediately replace a sounding audition', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Append chord', exact: true }).click();
  const first = page.getByRole('button', {
    name: 'Select and play chord 1: C',
    exact: true,
  });
  await first.click();
  await expect(page.getByLabel('Currently playing notes')).toHaveText('C3E3G3');
  const before = await page.evaluate(() => ({
    count: window.audioProbe.oscillators.length,
    resumes: window.audioProbe.resumeCalls,
    time: window.audioProbe.contexts[0]!.currentTime,
  }));
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.oscillators.length), {
      timeout: 300,
    })
    .toBe(before.count + 3);
  const timing = await page.evaluate(() => ({
    start: window.audioProbe.starts.at(-1)!,
    resumes: window.audioProbe.resumeCalls,
  }));
  expect(timing.resumes).toBe(before.resumes);
  expect(timing.start - before.time).toBeLessThan(0.3);
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'C3E♭3G3',
    { timeout: 300 },
  );
  await first.click();
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'C3E3G3',
    { timeout: 300 },
  );
  const count = await page.evaluate(() => window.audioProbe.oscillators.length);
  await first.click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.oscillators.length))
    .toBe(count + 3);
});

test('compact long progressions scroll and controls remain keyboard operable', async ({
  page,
}, testInfo) => {
  await page.goto('./chord-progression/');
  const append = page.getByRole('button', {
    name: 'Append chord',
    exact: true,
  });
  for (let index = 0; index < 20; index++) await append.click();
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
  const cards = page.locator('[data-entry-id]');
  const dimensions = await cards.nth(0).boundingBox();
  expect(dimensions?.width).toBeLessThanOrEqual(64);
  expect(dimensions?.height).toBeLessThanOrEqual(64);
  await cards.nth(0).focus();
  await page.keyboard.press('Space');
  await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(cards.nth(1)).toBeFocused();
  const minor = page.getByRole('button', { name: 'Minor', exact: true });
  await minor.focus();
  await page.keyboard.press('Enter');
  await expect(minor).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', {
      name: /Move left|Move right|insertion|Insert chord/,
    }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Remove/ })).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath('quick-transcription.png'),
    fullPage: true,
  });
});

test('plucked audio has pitched harmonics, decays, and reaches silence', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page
    .getByRole('button', { name: 'Play candidate', exact: true })
    .click();
  await expect(page.getByLabel('Currently playing notes')).toHaveText('C3E3G3');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeGreaterThan(0.01);
  const onset = await page.evaluate(() => ({
    energy: window.audioProbe.energy(),
    start: window.audioProbe.starts[0]!,
    frequencies: window.audioProbe.oscillators.map(
      (node) => node.frequency.value,
    ),
    types: window.audioProbe.oscillators.map((node) => node.type),
  }));
  expect(onset.energy).toBeLessThan(0.3);
  expect(onset.types).toEqual(['custom', 'custom', 'custom']);
  expect(onset.frequencies[0]).toBeCloseTo(130.8128, 3);
  expect(onset.frequencies[1]).toBeCloseTo(164.8138, 3);
  expect(onset.frequencies[2]).toBeCloseTo(195.9977, 3);
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.contexts[0]!.currentTime))
    .toBeGreaterThan(onset.start + 0.65);
  const tail = await page.evaluate(() => window.audioProbe.energy());
  expect(tail).toBeLessThan(onset.energy);
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'No notes playing',
  );
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.00001);
});

test('removing or replacing a source cancels it; suspended audio resumes from a choice', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  const append = page.getByRole('button', {
    name: 'Append chord',
    exact: true,
  });
  const sounding = page.getByLabel('Currently playing notes');
  await append.click();
  await page.locator('[data-entry-id]').click();
  await expect(sounding).toHaveText('C3E3G3');
  await page
    .getByRole('button', { name: 'Replace selected chord', exact: true })
    .click();
  await expect(sounding).toHaveText('No notes playing', { timeout: 750 });
  await page.locator('[data-entry-id]').click();
  await expect(sounding).toHaveText('C3E3G3');
  await page
    .getByRole('button', { name: 'Remove last chord', exact: true })
    .click();
  await expect(sounding).toHaveText('No notes playing', { timeout: 750 });
  await page
    .getByRole('button', { name: 'Play candidate', exact: true })
    .click();
  await page.evaluate(async () => {
    await window.audioProbe.contexts[0]?.suspend();
  });
  await expect(sounding).toHaveText('No notes playing');
  await page.getByRole('button', { name: 'Major', exact: true }).click();
  await expect(sounding).toHaveText('C3E3G3');
  await expect(sounding).toHaveText('No notes playing');
});

test('audio failure is logged while append and replace remain usable', async ({
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
  await page.getByRole('button', { name: 'Root D', exact: true }).click();
  await expect
    .poll(() =>
      errors.some((error) => error.includes('Chord playback failed.')),
    )
    .toBe(true);
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'No notes playing',
  );
  await page.getByRole('button', { name: 'Append chord', exact: true }).click();
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  await page
    .getByRole('button', { name: 'Replace selected chord', exact: true })
    .click();
  await expect(page.locator('[data-entry-id] strong')).toHaveText(['Dm']);
});

test('narrow portrait and zoom keep choices and commits within the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Root B♯', exact: true }).click();
  await page
    .getByRole('button', { name: 'Major seventh', exact: true })
    .click();
  await expect(page.getByLabel('Candidate chord')).toHaveText(
    'B♯maj7B♯3 · D♯♯4 · F♯♯4 · A♯♯4',
  );
  await page.getByRole('button', { name: 'Append chord', exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Replace selected chord', exact: true })
    .click();
});
