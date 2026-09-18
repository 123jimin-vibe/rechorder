import { expect, test } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

test('optional key settings stay silent; previews leave edits untouched and commits are explicit', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  const panel = page.getByRole('region', { name: 'Chord suggestions' });
  const candidate = page.getByLabel('Candidate chord');
  await expect(
    page.getByRole('combobox', { name: 'Key', exact: true }),
  ).toHaveValue('');
  await expect(
    panel.getByRole('button', { name: 'Suggest replacements' }),
  ).toBeDisabled();
  await expect(
    panel.getByRole('button', { name: 'Suggest between chords' }),
  ).toBeDisabled();
  await page
    .getByRole('combobox', { name: 'Key', exact: true })
    .selectOption('C');
  await page
    .getByRole('combobox', { name: 'Mode', exact: true })
    .selectOption('minor');
  expect(await page.evaluate(() => window.audioProbe.resumeCalls)).toBe(0);
  const meters = panel.getByRole('meter', {
    name: /^Relative score for /,
  });
  await expect(meters).toHaveCount(4);
  const renderedScores = await meters.evaluateAll((items) =>
    items.map((item) => {
      const meter = item as HTMLMeterElement;
      const bounds = meter.getBoundingClientRect();
      return {
        value: meter.value,
        width: bounds.width,
        height: bounds.height,
      };
    }),
  );
  expect(Math.max(...renderedScores.map(({ value }) => value))).toBe(100);
  expect(
    new Set(renderedScores.map(({ value }) => value)).size,
  ).toBeGreaterThan(1);
  expect(
    renderedScores.every(
      ({ value, width, height }) =>
        value >= 15 && value <= 100 && width > 0 && height > 0,
    ),
  ).toBe(true);
  const before = await candidate.textContent();
  const preview = panel.getByRole('button', { name: /^Preview / }).first();
  const symbol = (await preview.getAttribute('aria-label'))!.replace(
    'Preview ',
    '',
  );
  const list = await panel.locator('li').allTextContents();
  await preview.click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBeGreaterThan(0);
  expect(await panel.locator('li').allTextContents()).toEqual(list);
  await expect(candidate).toHaveText(before!);
  await expect(page.locator('[data-entry-id]')).toHaveCount(0);
  const audioCount = await page.evaluate(
    () => window.audioProbe.sources.length,
  );
  await panel
    .getByRole('button', { name: `Add suggestion ${symbol}`, exact: true })
    .click();
  await expect(page.locator('[data-entry-id]')).toHaveCount(1);
  await expect(candidate.locator('strong')).toHaveText(symbol);
  expect(await page.evaluate(() => window.audioProbe.sources.length)).toBe(
    audioCount,
  );
});

test('replacement preserves identity and insertion preserves both neighbors and stops transport', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const panel = page.getByRole('region', { name: 'Chord suggestions' });
  const entries = page.locator('[data-entry-id]');
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.getByRole('button', { name: 'Root G', exact: true }).click();
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  const ids = await entries.evaluateAll((items) =>
    items.map((item) => item.getAttribute('data-entry-id')),
  );
  await entries.first().click();
  await panel.getByRole('button', { name: 'Suggest replacements' }).click();
  const replacement = panel
    .getByRole('button', { name: /^Replace suggestion / })
    .first();
  const replacementName = (await replacement.getAttribute(
    'aria-label',
  ))!.replace('Replace suggestion ', '');
  await replacement.click();
  await expect(entries.first()).toHaveAttribute('data-entry-id', ids[0]!);
  await expect(entries.first()).toHaveText(replacementName);
  await panel.getByRole('button', { name: 'Suggest between chords' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await panel
    .getByRole('button', { name: /^Insert suggestion / })
    .first()
    .click();
  await expect(entries).toHaveCount(3);
  await expect(entries.first()).toHaveAttribute('data-entry-id', ids[0]!);
  await expect(entries.last()).toHaveAttribute('data-entry-id', ids[1]!);
  await expect(entries.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeDisabled();
  await entries.last().click();
  await expect(
    panel.getByRole('button', { name: 'Suggest between chords' }),
  ).toBeDisabled();
  await expect(
    panel.getByRole('button', { name: 'Suggest next chords' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('bass suggestions keep the chosen bass and can be used without touching the progression', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const panel = page.getByRole('region', { name: 'Chord suggestions' });
  await page
    .getByRole('combobox', { name: 'Key', exact: true })
    .selectOption('C');
  await panel.getByRole('button', { name: 'Suggest chords for bass' }).click();
  await panel
    .getByRole('combobox', { name: 'Suggestion bass' })
    .selectOption('E');
  const notes = page.getByLabel('Candidate chord').locator(':scope > span');
  const bass = (await notes.textContent())!.split(' · ')[0]!;
  const use = panel.getByRole('button', { name: /^Use suggestion / }).first();
  const name = (await use.getAttribute('aria-label'))!.replace(
    'Use suggestion ',
    '',
  );
  await use.click();
  await expect(page.getByLabel('Candidate chord').locator('strong')).toHaveText(
    name,
  );
  expect((await notes.textContent())!.split(' · ')[0]).toBe(bass);
  await expect(entries(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await expect(entries(page)).toHaveText(name);
});

function entries(page: import('@playwright/test').Page) {
  return page.locator('[data-entry-id]');
}

test('long-timeline insertion reveals its new entry and transposition carries the explicit key', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./chord-progression/');
  const panel = page.getByRole('region', { name: 'Chord suggestions' });
  await page
    .getByRole('combobox', { name: 'Key', exact: true })
    .selectOption('C');
  for (let index = 0; index < 12; index++)
    await page.getByRole('button', { name: 'Append', exact: true }).click();
  await entries(page).first().click();
  await panel.getByRole('button', { name: 'Suggest between chords' }).click();
  await panel
    .getByRole('button', { name: /^Insert suggestion / })
    .first()
    .click();
  const selected = entries(page).nth(1);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  const bounds = await selected.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.getByText('Transpose & spelling', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Transpose interval', exact: true })
    .selectOption({ label: 'Whole tone' });
  await page.getByRole('button', { name: 'Transpose up', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Key', exact: true }),
  ).toHaveValue('C');
  await page
    .getByRole('combobox', { name: 'Transpose scope', exact: true })
    .selectOption('progression');
  await page.getByRole('button', { name: 'Transpose up', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Key', exact: true }),
  ).toHaveValue('D');
  await expect(
    page.getByRole('combobox', { name: 'Mode', exact: true }),
  ).toHaveValue('major');
});

test('suggestions fit mobile and enlarged text, with keyboard-accessible actions', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./chord-progression/');
  const panel = page.getByRole('region', { name: 'Chord suggestions' });
  await page
    .getByRole('combobox', { name: 'Key', exact: true })
    .selectOption('C');
  await page.screenshot({
    path: testInfo.outputPath('suggestions-mobile.png'),
    fullPage: true,
  });
  const bounds = await panel.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(844);
  const preview = panel.getByRole('button', { name: /^Preview / }).first();
  await preview.focus();
  await page.keyboard.press('Enter');
  await expect(preview).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(
    panel.getByRole('button', { name: /^Add suggestion / }).first(),
  ).toBeFocused();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const size of ['100%', '200%']) {
      await page.evaluate((fontSize) => {
        document.documentElement.style.fontSize = fontSize;
      }, size);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const button of await panel.getByRole('button').all()) {
        const box = await button.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
  expect(errors).toEqual([]);
});

test('function pads design key-relative chords and move chips narrow suggestions', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  const panel = page.getByRole('region', { name: 'Chord suggestions' });
  const pads = page.locator('fieldset[aria-label="Function"]');
  const candidate = page.getByLabel('Candidate chord');
  await expect(pads.locator('legend')).toHaveText('Function C major?');
  await expect(
    panel.getByRole('button', { name: 'ii–V motion' }),
  ).toBeDisabled();
  await pads.getByRole('button', { name: 'Function V (G)' }).click();
  await expect(candidate.locator('strong')).toHaveText('G');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBeGreaterThan(0);
  await pads.getByRole('button', { name: 'Seventh chords' }).click();
  await pads.getByRole('button', { name: 'Function ii7 (Dm7)' }).click();
  await expect(candidate.locator('strong')).toHaveText('Dm7');
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Key', exact: true })
    .selectOption('C');
  await expect(pads.locator('legend')).toHaveText('Function C major');
  await panel.getByRole('button', { name: 'ii–V motion' }).click();
  const previews = panel.getByRole('button', { name: /^Preview / });
  await expect(previews.first()).toHaveAccessibleName('Preview G7');
  for (const name of await previews.allInnerTexts())
    expect(name).toContain('ii–V');
  await panel.getByRole('button', { name: 'Dominant resolution' }).click();
  await expect(panel.getByText('No chord makes this move here')).toBeVisible();
  await panel.getByRole('button', { name: 'Any move' }).click();
  await expect(previews.first()).toBeVisible();
});
