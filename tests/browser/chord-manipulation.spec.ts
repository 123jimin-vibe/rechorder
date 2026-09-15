import { expect, test } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

test('member bass, outside bass and new-chord resets are direct and reversible', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const candidate = page.getByLabel('Candidate chord');
  await page.getByRole('button', { name: 'Bass E (3)', exact: true }).click();
  await expect(candidate).toHaveText('C/EE4 · G4 · C5');
  await expect(page.getByLabel('Bass position')).toHaveText('1st inversion');
  await page.getByRole('button', { name: 'Root C', exact: true }).click();
  await expect(candidate.locator('strong')).toHaveText('C/E');
  await page.getByText('Other bass', { exact: true }).click();
  await page.getByRole('button', { name: 'Bass D', exact: true }).click();
  await expect(page.getByLabel('Bass position')).toHaveText('Outside chord');
  await expect(candidate).toHaveText('C/DD3 · C4 · E4 · G4');
  await page.getByText('Jazz & extensions', { exact: true }).click();
  await page.getByRole('button', { name: 'Alter ♯5', exact: true }).click();
  await page.getByRole('button', { name: 'Root G', exact: true }).click();
  await expect(candidate.locator('strong')).toHaveText('G');
  await expect(
    page.getByRole('button', { name: 'Alter ♯5', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page
    .getByRole('button', { name: 'Diminished seventh', exact: true })
    .click();
  await page.getByRole('button', { name: 'Root C', exact: true }).click();
  await page
    .getByRole('button', { name: 'Bass B♭♭ (♭♭7)', exact: true })
    .click();
  await expect(candidate.locator('strong')).toHaveText('Cdim7/B♭♭');
  await page.getByRole('button', { name: 'Major', exact: true }).click();
  await expect(candidate.locator('strong')).toHaveText('C');
});

test('voicing edits preserve harmony and round-trip; tone removal changes it', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const candidate = page.getByLabel('Candidate chord');
  await page.getByText('Voiced notes', { exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Sound G (5)', exact: true })
    .uncheck();
  await expect(candidate).toHaveText('CC4 · E4');
  await page.getByRole('button', { name: 'Double E', exact: true }).click();
  await expect(candidate).toHaveText('CC4 · E4 · E5');
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  const id = await page
    .locator('[data-entry-id]')
    .getAttribute('data-entry-id');
  await page.getByRole('button', { name: 'Root D', exact: true }).click();
  await page.locator('[data-entry-id]').click();
  await expect(candidate).toHaveText('CC4 · E4 · E5');
  await expect(
    page.getByRole('checkbox', { name: 'Sound G (5)', exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole('button', { name: 'Close voicing', exact: true })
    .click();
  await page.getByText('Chord tones', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Include degree 5', exact: true })
    .click();
  await expect(candidate.locator('strong')).toHaveText('C(no5)');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.locator('[data-entry-id]')).toHaveAttribute(
    'data-entry-id',
    id!,
  );
  await expect(page.locator('[data-entry-id]')).toHaveText('C(no5)');
});

test('transpose preserves inversion, supports whole progressions and keeps respelling sounding equal', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Bass E (3)', exact: true }).click();
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  const ids = await page
    .locator('[data-entry-id]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-entry-id')),
    );
  await page.getByText('Transpose & spelling', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Transpose interval', exact: true })
    .selectOption({ label: 'Whole tone' });
  await page
    .getByRole('combobox', { name: 'Transpose scope', exact: true })
    .selectOption('progression');
  await page.getByRole('button', { name: 'Transpose up', exact: true }).click();
  await expect(page.locator('[data-entry-id] strong')).toHaveText([
    'D/F♯',
    'D/F♯',
  ]);
  expect(
    await page
      .locator('[data-entry-id]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-entry-id')),
      ),
  ).toEqual(ids);
  await page
    .getByRole('button', { name: 'Spell root C♯♯', exact: true })
    .click();
  await expect(page.getByLabel('Candidate chord').locator('strong')).toHaveText(
    'C♯♯/E♯♯',
  );
  await expect(
    page.getByRole('button', { name: 'Play F♯4', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-entry-id] strong')).toHaveText([
    'D/F♯',
    'D/F♯',
  ]);
});

test('BPM form below the header steps and applies transport timing without starting audio', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  const bpm = page.getByRole('spinbutton', { name: 'BPM', exact: true });
  await expect(bpm).toHaveValue('120');
  const form = await page
    .getByRole('form', { name: 'Progression settings', exact: true })
    .boundingBox();
  const header = await page
    .getByRole('heading', { name: 'Chord progression', exact: true })
    .boundingBox();
  expect(form!.y).toBeGreaterThan(header!.y);
  await page.getByRole('button', { name: 'Increase tempo' }).click();
  await expect(bpm).toHaveValue('121');
  await page.getByRole('button', { name: 'Decrease tempo' }).click();
  await expect(bpm).toHaveValue('120');
  await bpm.fill('60');
  await bpm.press('Enter');
  expect(await page.evaluate(() => window.audioProbe.resumeCalls)).toBe(0);
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBeGreaterThanOrEqual(3);
  expect(
    await page.evaluate(
      () =>
        window.audioProbe.sources[0]!.end - window.audioProbe.sources[0]!.start,
    ),
  ).toBeCloseTo(2);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  const before = await page.evaluate(() => window.audioProbe.sources.length);
  await page
    .getByRole('button', { name: 'Play candidate', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBeGreaterThan(before);
  expect(
    await page.evaluate(
      () =>
        window.audioProbe.sources.at(-1)!.end -
        window.audioProbe.sources.at(-1)!.start,
    ),
  ).toBeCloseTo(1);
  await bpm.fill('0');
  await bpm.press('Enter');
  expect(
    await bpm.evaluate(
      (element: HTMLInputElement) => element.validity.rangeUnderflow,
    ),
  ).toBe(true);
});

test('expanded manipulation controls fit narrow portrait and enlarged text', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./chord-progression/');
  await page.screenshot({
    path: testInfo.outputPath('compact-chord-editor.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  const commit = await page
    .getByRole('button', { name: 'Append', exact: true })
    .boundingBox();
  expect(commit!.y).toBeGreaterThanOrEqual(0);
  expect(commit!.y + commit!.height).toBeLessThan(844);
  await page.screenshot({
    path: testInfo.outputPath('sticky-mobile-commits.png'),
  });
  for (const title of [
    'Other bass',
    'Jazz & extensions',
    'Chord tones',
    'Voiced notes',
    'Transpose & spelling',
  ])
    await page.getByText(title, { exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath('expanded-chord-editor.png'),
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const size of ['100%', '200%']) {
      await page.evaluate((value) => {
        document.documentElement.style.fontSize = value;
      }, size);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
