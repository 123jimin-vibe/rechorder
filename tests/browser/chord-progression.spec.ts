import { expect, test } from '@playwright/test';
import { installAudioProbe } from './audio-probe';

test('jazz and slash chords round-trip through append and replace', async ({
  page,
}, testInfo) => {
  await page.goto('./chord-progression/');
  await page
    .getByRole('group', { name: 'Chord quality', exact: true })
    .getByText('Jazz & extensions', { exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Dominant thirteenth', exact: true })
    .click();
  await page.getByRole('button', { name: 'Alter ♭9', exact: true }).click();
  await page.getByRole('button', { name: 'Alter ♯11', exact: true }).click();
  await page
    .getByRole('group', { name: 'Root and bass', exact: true })
    .locator('summary')
    .filter({ hasText: /^Bass$/ })
    .click();
  await page.getByRole('button', { name: 'Bass E', exact: true }).click();
  await expect(page.getByLabel('Candidate chord').locator('strong')).toHaveText(
    'C13(♭9,♯11)/E',
  );
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.getByRole('button', { name: 'Root F♯', exact: true }).click();
  await expect(page.getByLabel('Candidate chord').locator('strong')).toHaveText(
    'F♯13(♭9,♯11)/E',
  );
  const entry = page.locator('[data-entry-id]');
  const id = await entry.getAttribute('data-entry-id');
  await entry.click();
  await expect(
    page.getByRole('button', { name: 'Alter ♭9', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Bass E', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Alter ♯9', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Alter ♭9', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(entry).toHaveText('C13(♯9,♯11)/E');
  await expect(entry).toHaveAttribute('data-entry-id', id!);
  expect(
    await entry.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Major', exact: true }).click();
  await expect(page.getByLabel('Candidate chord').locator('strong')).toHaveText(
    'C/E',
  );
  await page.getByRole('button', { name: 'No slash', exact: true }).click();
  await expect(page.getByLabel('Candidate chord').locator('strong')).toHaveText(
    'C',
  );
  expect(
    await page
      .getByRole('group', { name: 'Jazz chords', exact: true })
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons.every((button) => button.scrollWidth <= button.clientWidth),
      ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('jazz-builder.png'),
    fullPage: true,
  });
});

test('piano highlights enharmonic pitches and releases independent touch and keyboard notes', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const piano = page.getByRole('group', {
    name: 'Piano keyboard',
    exact: true,
  });
  await page.getByRole('button', { name: 'Root D♭', exact: true }).click();
  await expect(
    piano.getByRole('button', { name: 'Play C♯4', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(piano.getByRole('button', { pressed: true })).toHaveCount(3);
  await expect(piano.getByRole('button', { pressed: true })).toHaveCount(0);
  const c = piano.getByRole('button', { name: 'Play C4', exact: true });
  const e = piano.getByRole('button', { name: 'Play E4', exact: true });
  await c.scrollIntoViewIfNeeded();
  const cBox = (await c.boundingBox())!;
  const eBox = (await e.boundingBox())!;
  const firstTouch = {
    id: 11,
    x: cBox.x + cBox.width / 2,
    y: cBox.y + cBox.height - 15,
  };
  const secondTouch = {
    id: 12,
    x: eBox.x + eBox.width / 2,
    y: eBox.y + eBox.height - 15,
  };
  const input = await page.context().newCDPSession(page);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [firstTouch],
  });
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [firstTouch, secondTouch],
  });
  await expect(c).toHaveAttribute('aria-pressed', 'true');
  await expect(e).toHaveAttribute('aria-pressed', 'true');
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(c).toHaveAttribute('aria-pressed', 'false');
  await expect(e).toHaveAttribute('aria-pressed', 'false');
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [secondTouch],
  });
  await expect(e).toHaveAttribute('aria-pressed', 'true');
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  });
  await input.detach();
  await expect(e).toHaveAttribute('aria-pressed', 'false');
  await c.focus();
  await page.keyboard.down('Space');
  await expect(c).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('Space');
  await expect(c).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-entry-id]')).toHaveCount(0);
});

test('two direct choices audition a candidate without committing it', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.worklets.length))
    .toBe(1);
  expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(1);
  expect(await page.evaluate(() => window.audioProbe.resumeCalls)).toBe(0);

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
    'D♭mD♭4 · F♭4 · A♭4',
  );
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'D♭4F♭4A♭4',
  );
  await expect(page.locator('[data-entry-id]')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Root D♭', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Minor', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Replace', exact: true }),
  ).toBeDisabled();
});

test('append, load, replace, and backspace preserve musical values and identities', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const cards = page.locator('[data-entry-id]');
  const append = page.getByRole('button', {
    name: 'Append',
    exact: true,
  });
  const replace = page.getByRole('button', {
    name: 'Replace',
    exact: true,
  });
  const backspace = page.getByRole('button', {
    name: 'Remove last chord',
    exact: true,
  });
  await expect(backspace).toBeDisabled();
  const strip = page.getByRole('group', {
    name: 'Chord progression',
    exact: true,
  });
  const emptyHeight = (await strip.boundingBox())?.height;
  await append.click();
  expect((await strip.boundingBox())?.height).toBe(emptyHeight);
  await expect(cards.first()).toHaveText('C');
  await expect(page.getByText('Find the chord. Keep the idea.')).toHaveCount(0);
  await expect(page.getByText('Your progression starts here')).toHaveCount(0);
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
  await expect(page.getByLabel('Candidate chord')).toHaveText('CC4 · E4 · G4');
  await expect(page.getByLabel('Currently playing notes')).toHaveText('C4E4G4');
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
  await expect(replace).toHaveText('Replace');
  await cards.nth(1).click();
  await backspace.click();
  await expect(replace).toBeDisabled();
  await expect(page.getByLabel('Candidate chord')).toHaveText('DmD4 · F4 · A4');
  await backspace.click();
  await expect(cards).toHaveCount(0);
  await expect(backspace).toBeDisabled();
});

test('root rows remain aligned and chord changes do not move the controls', async ({
  page,
}) => {
  await page.goto('./chord-progression/');
  const sharp = await page
    .getByRole('button', { name: 'Root C♯', exact: true })
    .boundingBox();
  const natural = await page
    .getByRole('button', { name: 'Root C', exact: true })
    .boundingBox();
  const flat = await page
    .getByRole('button', { name: 'Root C♭', exact: true })
    .boundingBox();
  expect(sharp && natural && flat).toBeTruthy();
  expect(sharp!.x).toBeCloseTo(natural!.x, 0);
  expect(natural!.x).toBeCloseTo(flat!.x, 0);
  expect(sharp!.y).toBeLessThan(natural!.y);
  expect(natural!.y).toBeLessThan(flat!.y);
  expect(sharp!.height).toBeGreaterThanOrEqual(36);

  const progression = (await page
    .getByRole('heading', { name: 'Progression', exact: true })
    .boundingBox())!;
  const playing = (await page
    .getByRole('heading', { name: 'Now playing' })
    .boundingBox())!;
  const append = (await page
    .getByRole('button', { name: 'Append', exact: true })
    .boundingBox())!;
  expect(playing.y + playing.height).toBeLessThan(progression.y);
  expect(append.y + append.height).toBeLessThan(sharp!.y);
  expect(append.width).toBeLessThan(120);
  const root = page.getByRole('button', { name: 'Root C', exact: true });
  const nowPlaying = page.getByRole('heading', { name: 'Now playing' });
  const before = {
    root: await root.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    ),
    playing: await nowPlaying.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    ),
  };
  for (const type of ['Dominant seventh', 'Augmented', 'Major']) {
    await page.getByRole('button', { name: type, exact: true }).click();
    expect(
      await root.evaluate(
        (element) => element.getBoundingClientRect().top + window.scrollY,
      ),
    ).toBeCloseTo(before.root, 0);
    expect(
      await nowPlaying.evaluate(
        (element) => element.getBoundingClientRect().top + window.scrollY,
      ),
    ).toBeCloseTo(before.playing, 0);
  }
});

test('timeline and type choices immediately replace a sounding audition', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  const first = page.getByRole('button', {
    name: 'Select and play chord 1: C',
    exact: true,
  });
  await first.click();
  await expect(page.getByLabel('Currently playing notes')).toHaveText('C4E4G4');
  const before = await page.evaluate(() => ({
    count: window.audioProbe.sources.length,
    resumes: window.audioProbe.resumeCalls,
    time: window.audioProbe.contexts[0]!.currentTime,
  }));
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length), {
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
    'C4E♭4G4',
    { timeout: 300 },
  );
  await first.click();
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'C4E4G4',
    { timeout: 300 },
  );
  const count = await page.evaluate(() => window.audioProbe.sources.length);
  await first.click();
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBe(count + 3);
});

test('progression items are raised by default and pressed only while sounding', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  const chord = page.locator('[data-entry-id]').first();
  const appearance = () =>
    chord.evaluate((element) => ({
      shadow: getComputedStyle(element).boxShadow,
      transform: getComputedStyle(element).transform,
    }));
  const raised = await appearance();
  expect(raised.shadow).not.toBe('none');
  await expect(chord).toHaveAttribute('data-playing', 'false');

  await chord.click();
  await expect(chord).toHaveAttribute('data-playing', 'true');
  await page.waitForTimeout(100);
  const directlyPressed = await appearance();
  expect(directlyPressed.shadow).not.toBe(raised.shadow);
  expect(directlyPressed.transform).not.toBe(raised.transform);
  await expect(chord).toHaveAttribute('data-playing', 'false', {
    timeout: 1_500,
  });

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(chord).toHaveAttribute('data-playing', 'true');
  await page.waitForTimeout(100);
  expect(await appearance()).toEqual(directlyPressed);
  await expect(chord).toHaveAttribute('data-playing', 'false', {
    timeout: 1_500,
  });
});

test('progression transport plays from the beginning or selection and stops', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  const play = page.getByRole('button', { name: 'Play', exact: true });
  const playFromHere = page.getByRole('button', {
    name: 'Play from here',
    exact: true,
  });
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  const remove = page.getByRole('button', {
    name: 'Remove last chord',
    exact: true,
  });
  await expect(play).toBeDisabled();
  await expect(playFromHere).toBeDisabled();
  await expect(stop).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Keyboard octave' }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.getByRole('button', { name: 'Root D', exact: true }).click();
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await expect(playFromHere).toBeEnabled();
  for (const button of [play, playFromHere, stop])
    await expect(button).toHaveText('');
  const controlStyles = await Promise.all(
    [play, remove].map((button) =>
      button.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          width: bounds.width,
          height: bounds.height,
          color: getComputedStyle(element).color,
        };
      }),
    ),
  );
  expect(controlStyles[1]?.width).toBeCloseTo(controlStyles[0]!.width, 0);
  expect(controlStyles[1]?.height).toBeCloseTo(controlStyles[0]!.height, 0);
  expect(controlStyles[1]?.color).not.toBe(controlStyles[0]?.color);

  const entries = page.locator('[data-entry-id]');
  const beforeFromHere = await page.evaluate(
    () => window.audioProbe.sources.length,
  );
  await playFromHere.click();
  await expect(entries.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBe(beforeFromHere + 3);
  await stop.click();

  const beforeBeginning = await page.evaluate(
    () => window.audioProbe.sources.length,
  );
  await play.click();
  await expect(play).toBeDisabled();
  await expect(playFromHere).toBeDisabled();
  await expect(stop).toBeEnabled();
  await expect(entries.first()).toHaveAttribute('aria-current', 'true');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.sources.length))
    .toBe(beforeBeginning + 6);
  const scheduled = await page.evaluate(
    (start) =>
      window.audioProbe.sources.slice(start).map((source) => source.start),
    beforeBeginning,
  );
  expect(scheduled.slice(0, 3).every((start) => start === scheduled[0])).toBe(
    true,
  );
  expect(scheduled.slice(3).every((start) => start === scheduled[3])).toBe(
    true,
  );
  expect(scheduled[3]! - scheduled[0]!).toBeCloseTo(1, 2);

  const second = entries.nth(1);
  await second.click();
  await expect(play).toBeEnabled();
  await expect(playFromHere).toBeEnabled();
  await expect(stop).toBeEnabled();
  await expect(second).toHaveAttribute('data-playing', 'true');
  await expect(second).toHaveAttribute('aria-current', 'true');
  await expect(page.getByLabel('Currently playing notes')).toHaveText(
    'D4F♯4A4',
  );
  await playFromHere.click();
  await expect(play).toBeDisabled();
  await expect(playFromHere).toBeDisabled();
  await expect(second).toHaveAttribute('aria-current', 'true');
  await stop.click();
  await expect(stop).toBeDisabled();
});

test('compact long progressions scroll and controls remain keyboard operable', async ({
  page,
}, testInfo) => {
  await page.goto('./chord-progression/');
  const append = page.getByRole('button', {
    name: 'Append',
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
  const geometry = await strip.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const last = element.lastElementChild!.getBoundingClientRect();
    return {
      top: last.top - bounds.top,
      bottom: bounds.bottom - last.bottom,
      right: bounds.right - last.right,
      scrollHeight: element.scrollHeight,
      height: element.clientHeight,
    };
  });
  expect(geometry.scrollHeight).toBe(geometry.height);
  expect(geometry.top).toBeGreaterThanOrEqual(2);
  expect(geometry.bottom).toBeGreaterThanOrEqual(2);
  expect(geometry.right).toBeGreaterThanOrEqual(-1);
  await strip.evaluate((element) => {
    element.scrollLeft = 0;
  });
  const offset = await strip.evaluate((element) => element.scrollLeft);
  await cards.nth(1).click();
  expect(await strip.evaluate((element) => element.scrollLeft)).toBe(offset);
  await cards.nth(1).click();
  expect(await strip.evaluate((element) => element.scrollLeft)).toBe(offset);
  await append.click();
  await expect
    .poll(() =>
      strip.evaluate(
        (element) =>
          element.scrollWidth - element.clientWidth - element.scrollLeft,
      ),
    )
    .toBeLessThan(2);
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

test('native bowed sources play together and reach silence', async ({
  page,
}) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page
    .getByRole('button', { name: 'Play candidate', exact: true })
    .click();
  await expect(page.getByLabel('Currently playing notes')).toHaveText('C4E4G4');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeGreaterThan(0.01);
  const onset = await page.evaluate(() => ({
    energy: window.audioProbe.energy(),
    start: window.audioProbe.starts[0]!,
    voices: window.audioProbe.sources,
    worklets: window.audioProbe.worklets.length,
  }));
  expect(onset.energy).toBeLessThan(0.91);
  expect(onset.voices).toHaveLength(3);
  expect(onset.worklets).toBe(1);
  expect(new Set(onset.voices.map((voice) => voice.start)).size).toBe(1);
  expect(onset.voices.map((voice) => voice.frequency)).toEqual([
    expect.closeTo(261.6256, 3),
    expect.closeTo(329.6276, 3),
    expect.closeTo(391.9954, 3),
  ]);
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
    name: 'Append',
    exact: true,
  });
  const sounding = page.getByLabel('Currently playing notes');
  await append.click();
  await page.locator('[data-entry-id]').click();
  await expect(sounding).toHaveText('C4E4G4');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(sounding).toHaveText('No notes playing', { timeout: 750 });
  await page.locator('[data-entry-id]').click();
  await expect(sounding).toHaveText('C4E4G4');
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
  await expect(sounding).toHaveText('C4E4G4');
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
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
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
    'B♯maj7B♯4 · D♯♯5 · F♯♯5 · A♯♯5',
  );
  await page.getByRole('button', { name: 'Append', exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const narrowRoots = await page
    .getByRole('button', { name: 'Root C♯', exact: true })
    .boundingBox();
  const narrowNatural = await page
    .getByRole('button', { name: 'Root C', exact: true })
    .boundingBox();
  expect(narrowRoots?.x).toBeCloseTo(narrowNatural!.x, 0);
  expect(narrowRoots!.y).toBeLessThan(narrowNatural!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
});

test('bowed chords sustain audible output through dense chords and overlapping notes', async ({
  page,
}, testInfo) => {
  await page.addInitScript(installAudioProbe);
  await page.goto('./chord-progression/');
  await page
    .getByRole('button', { name: 'Play candidate', exact: true })
    .click();
  const readSustain = () =>
    page.evaluate(async () => {
      const begin = window.audioProbe.contexts[0]!.currentTime;
      const readings: { time: number; rms: number; peak: number }[] = [];
      await new Promise<void>((resolve) => {
        const sample = () => {
          const time = window.audioProbe.contexts[0]!.currentTime - begin;
          if (time >= 0.18 && time < 0.8)
            readings.push({
              time,
              rms: window.audioProbe.rms(),
              peak: window.audioProbe.energy(),
            });
          if (time < 0.8) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      return readings;
    });
  const triad = await readSustain();
  await page.getByText('Jazz & extensions', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Dominant thirteenth', exact: true })
    .click();
  const extended = await readSustain();
  for (const samples of [triad, extended]) {
    expect(samples.length).toBeGreaterThan(3);
    expect(Math.min(...samples.map((sample) => sample.rms))).toBeGreaterThan(
      0.045,
    );
    expect(Math.max(...samples.map((sample) => sample.peak))).toBeLessThan(
      0.91,
    );
  }
  const average = (samples: typeof triad) =>
    samples.reduce((sum, sample) => sum + sample.rms, 0) / samples.length;
  expect(average(extended) / average(triad)).toBeGreaterThan(0.65);
  await testInfo.attach('sustained-output.json', {
    body: JSON.stringify({ triad, extended }),
    contentType: 'application/json',
  });
  const key = page.getByRole('button', { name: 'Play C4', exact: true });
  await key.focus();
  await page.keyboard.down('Space');
  await page
    .getByRole('button', { name: 'Play candidate', exact: true })
    .dispatchEvent('click');
  // A held gesture plus successive auditions exercise concurrent release tails.
  for (const root of ['D', 'E', 'F']) {
    await page
      .getByRole('button', { name: 'Root ' + root, exact: true })
      .dispatchEvent('click');
    const peak = await page.evaluate(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return window.audioProbe.energy();
    });
    expect(peak).toBeLessThan(0.91);
  }
  await expect(key).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('Space');
  await expect(key).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => page.evaluate(() => window.audioProbe.energy()))
    .toBeLessThan(0.001);
});
