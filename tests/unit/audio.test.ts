import { describe, expect, it, vi } from 'vitest';
import { createPlaybackEngine } from '@rechorder/audio';
import { AuditionController } from '../../apps/web/src/chord-progression/audition';
import { deferred, FakeDriver } from './fake-audio';

const notes = [
  { key: 'root', label: 'A4', frequency: 440 },
  { key: 'fifth', label: 'E5', frequency: 660 },
];

describe('audio scheduling engine', () => {
  it('starts lazily, schedules polyphony on the audio clock, and includes release until completion', async () => {
    const driver = new FakeDriver();
    const factory = vi.fn(() => driver);
    const engine = createPlaybackEngine(factory);
    expect(factory).not.toHaveBeenCalled();
    await engine.initialize();
    const handle = engine.schedule({ notes, startTime: 2, duration: 1 });
    expect(handle.state).toBe('scheduled');
    expect(engine.activeNotes()).toEqual([]);
    driver.advance(2);
    expect(handle.state).toBe('playing');
    expect(engine.activeNotes().map((item) => item.note.label)).toEqual([
      'A4',
      'E5',
    ]);
    expect(
      driver.voices.map((voice) => [voice.start, voice.end, voice.gain]),
    ).toEqual([
      [2, 3, 0.09],
      [2, 3, 0.09],
    ]);
    driver.advance(0.95);
    expect(engine.activeNotes()).toHaveLength(2);
    driver.advance(0.06);
    expect(handle.state).toBe('completed');
    expect(engine.activeNotes()).toEqual([]);
  });

  it('cancels one handle without changing an independent playback', async () => {
    const driver = new FakeDriver();
    const engine = createPlaybackEngine(() => driver);
    await engine.initialize();
    const first = engine.schedule({ notes, startTime: 0, duration: 1 });
    const second = engine.schedule({ notes, startTime: 0, duration: 2 });
    first.cancel();
    expect(first.state).toBe('releasing');
    driver.advance(0.11);
    expect(first.state).toBe('cancelled');
    expect(second.state).toBe('playing');
    expect(
      engine.activeNotes().every((item) => item.playbackId === second.id),
    ).toBe(true);
    engine.stopAll();
    expect(engine.activeNotes()).toEqual([]);
    expect(driver.voices.every((voice) => voice.stopped)).toBe(true);
  });

  it('can cancel a future start and hides sound while suspended', async () => {
    const driver = new FakeDriver();
    const engine = createPlaybackEngine(() => driver);
    await engine.initialize();
    const future = engine.schedule({ notes, startTime: 4, duration: 1 });
    future.cancel();
    expect(future.state).toBe('cancelled');
    const present = engine.schedule({ notes, startTime: 0, duration: 1 });
    driver.running = false;
    expect(present.state).toBe('suspended');
    expect(engine.activeNotes()).toEqual([]);
    present.cancel();
    expect(present.state).toBe('cancelled');
  });

  it('rejects invalid data and cleans voices when a partial schedule fails', async () => {
    const driver = new FakeDriver();
    const engine = createPlaybackEngine(() => driver);
    await engine.initialize();
    for (const frequency of [0, -1, NaN, Infinity]) {
      expect(() =>
        engine.schedule({
          notes: [{ key: 'x', label: 'x', frequency }],
          startTime: 0,
          duration: 1,
        }),
      ).toThrow();
    }
    expect(() =>
      engine.schedule({
        notes: [notes[0]!, notes[0]!],
        startTime: 0,
        duration: 1,
      }),
    ).toThrow();
    expect(() =>
      engine.schedule({ notes, startTime: -1, duration: 1 }),
    ).toThrow();
    expect(() =>
      engine.schedule({ notes, startTime: 0, duration: 0 }),
    ).toThrow();
    for (const level of [-1, 1.1, NaN, Infinity])
      expect(() =>
        engine.schedule({ notes, startTime: 0, duration: 1, level }),
      ).toThrow();
    driver.failVoice = 1;
    expect(() => engine.schedule({ notes, startTime: 0, duration: 1 })).toThrow(
      'Instrument failed',
    );
    expect(driver.voices.every((voice) => voice.stopped)).toBe(true);
    expect(engine.activeNotes()).toEqual([]);
  });

  it('clamps past starts and rejects duration overflow on the actual clock', async () => {
    const driver = new FakeDriver();
    const engine = createPlaybackEngine(() => driver);
    await engine.initialize();
    driver.advance(10);
    engine.schedule({ notes, startTime: 0, duration: 1 });
    expect(driver.voices.map((voice) => [voice.start, voice.end])).toEqual([
      [10, 11],
      [10, 11],
    ]);
    driver.advance(Number.MAX_VALUE);
    expect(() => engine.schedule({ notes, startTime: 0, duration: 1 })).toThrow(
      'clock range',
    );
    expect(() =>
      engine.schedule({ notes, startTime: 0, duration: Number.MAX_VALUE }),
    ).toThrow('clock range');
  });

  it('takes an immutable note snapshot and disposes idempotently', async () => {
    const driver = new FakeDriver();
    const engine = createPlaybackEngine(() => driver);
    await engine.initialize();
    const input = [{ key: 'x', label: 'A4', frequency: 440 }];
    engine.schedule({ notes: input, startTime: 0, duration: 1 });
    input[0]!.frequency = 220;
    expect(engine.activeNotes()[0]?.note.frequency).toBe(440);
    await engine.dispose();
    await engine.dispose();
    expect(driver.closed).toBe(true);
    expect(engine.activeNotes()).toEqual([]);
    await expect(engine.initialize()).rejects.toThrow('disposed');
  });
});

describe('page audition policy', () => {
  it('owns independent held notes and suppresses released pending gestures', async () => {
    const driver = new FakeDriver();
    const ready = deferred();
    driver.gate = ready.promise;
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    const cancelled = controller.press('finger1', notes[0]!);
    controller.release('finger1');
    const kept = controller.press('finger2', notes[1]!);
    ready.resolve();
    await Promise.all([cancelled, kept]);
    expect(driver.voices.map((voice) => voice.frequency)).toEqual([660]);
    await controller.press('finger3', notes[0]!);
    controller.release('finger2');
    driver.advance(0.11);
    expect(controller.notes().map((item) => item.note.label)).toEqual(['A4']);
    expect(driver.voices[1]?.gain).toBe(0.045);
    controller.stopAll();
    expect(controller.notes()).toEqual([]);
    await controller.press('finger3', notes[0]!);
    expect(controller.notes()).toHaveLength(1);
    await controller.dispose();
    expect(controller.notes()).toEqual([]);
  });
  it('starts a replacement synchronously without resuming running audio or waiting for release', async () => {
    const driver = new FakeDriver();
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    await controller.play(notes, 'first');
    driver.advance(0.2);
    driver.gate = deferred().promise;
    const replacement = controller.play(
      [{ key: 'new', label: 'D4', frequency: 293.66 }],
      'next',
    );
    expect(driver.resumeCalls).toBe(1);
    expect(driver.voices[2]?.start).toBe(0.2);
    expect(driver.voices[0]?.end).toBeCloseTo(0.3);
    expect(controller.notes().some((item) => item.note.label === 'D4')).toBe(
      true,
    );
    await replacement;
  });

  it('shares pending initialization and gives the newest request priority', async () => {
    const driver = new FakeDriver();
    const ready = deferred();
    driver.gate = ready.promise;
    const engine = createPlaybackEngine(() => driver);
    const controller = new AuditionController(engine);
    const first = controller.play(notes, 'first');
    const last = controller.play(
      [{ key: 'x', label: 'A3', frequency: 220 }],
      'last',
    );
    ready.resolve();
    await Promise.all([first, last]);
    expect(driver.resumeCalls).toBe(1);
    expect(driver.voices.map((voice) => voice.frequency)).toEqual([220]);
    expect(controller.notes().map((item) => item.note.label)).toEqual(['A3']);
  });

  it('cancels pending source removal and pending playback when hidden', async () => {
    for (const stop of ['source', 'all'] as const) {
      const driver = new FakeDriver();
      const ready = deferred();
      driver.gate = ready.promise;
      const controller = new AuditionController(
        createPlaybackEngine(() => driver),
      );
      const playing = controller.play(notes, 'entry');
      if (stop === 'source') controller.stopSource('entry');
      else controller.stopAll();
      ready.resolve();
      await playing;
      expect(driver.voices).toEqual([]);
    }
  });

  it('keeps an unrelated pending request when an old entry is removed', async () => {
    const driver = new FakeDriver();
    const ready = deferred();
    driver.gate = ready.promise;
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    const playing = controller.play(notes, 'new');
    controller.stopSource('old');
    ready.resolve();
    await playing;
    expect(driver.voices).toHaveLength(2);
  });

  it('releases previous auditions and stops removed sources', async () => {
    const driver = new FakeDriver();
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    await controller.play(notes, 'entry');
    driver.advance(0.2);
    await controller.play(
      [{ key: 'x', label: 'A3', frequency: 220 }],
      'candidate',
    );
    driver.advance(0.11);
    expect(controller.notes().map((item) => item.note.label)).toEqual(['A3']);
    controller.stopSource('candidate');
    driver.advance(0.11);
    expect(controller.notes()).toEqual([]);
  });

  it('reports errors and permits retry; disposal prevents late scheduling', async () => {
    const driver = new FakeDriver();
    const report = vi.fn<(error: unknown) => void>();
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
      report,
    );
    driver.failure = new Error('Activation denied');
    await controller.play(notes, 'candidate');
    expect(report).toHaveBeenCalledWith(driver.failure);
    expect(controller.notes()).toEqual([]);
    driver.failure = null;
    await controller.play(notes, 'candidate');
    expect(controller.notes()).toHaveLength(2);
    await controller.dispose();
    await controller.play(notes, 'entry');
    expect(controller.notes()).toEqual([]);
    expect(driver.closed).toBe(true);
  });
});
