import { describe, it, expect } from 'vitest';
import { createPlaybackEngine } from '@rechorder/audio';
import { AuditionController } from '../../apps/web/src/audio/audition';
import { FakeDriver, deferred } from './fake-audio';

const notes = [{ key: 'C', label: 'C4', frequency: 261.625565 }];
const chords = [
  { source: 'one', notes },
  { source: 'two', notes },
];

describe('editable progression tempo', () => {
  it('applies tempo before playback without starting audio and keeps audition duration fixed', async () => {
    const driver = new FakeDriver();
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    controller.setTempo(60);
    expect(driver.resumeCalls).toBe(0);
    await controller.playProgression(chords);
    expect(driver.voices[0]?.end).toBe(2);
    await controller.play(notes, 'candidate');
    expect(driver.voices.at(-1)?.end).toBe(1);
    controller.stopAll();
  });

  it('retimes the remainder at the same musical position and cancels old schedules', async () => {
    const driver = new FakeDriver();
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    await controller.playProgression(chords);
    driver.advance(0.25);
    controller.setTempo(60);
    expect(controller.progressionState()).toEqual({
      status: 'playing',
      currentIndex: 0,
    });
    expect(driver.voices[0]?.end).toBeCloseTo(0.35);
    expect(driver.voices.at(-1)?.start).toBeCloseTo(0.25);
    expect(driver.voices.at(-1)?.end).toBeCloseTo(1.75);
    driver.advance(1.51);
    expect(controller.progressionState().currentIndex).toBe(1);
    controller.pauseProgression();
    const voices = driver.voices.length;
    controller.setTempo(240);
    expect(driver.voices).toHaveLength(voices);
    expect(controller.progressionState().status).toBe('paused');
    await controller.playProgression([]);
    expect(driver.voices.at(-1)?.end).toBeCloseTo(1.76 + 0.995 * 0.5);
    controller.stopAll();
  });

  it('uses the latest tempo while initialization is pending and rejects invalid input atomically', async () => {
    const driver = new FakeDriver();
    const gate = deferred();
    driver.gate = gate.promise;
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    const pending = controller.playProgression(chords, 1);
    controller.setTempo(60);
    for (const value of [0, -1, NaN, Infinity, 601])
      expect(() => controller.setTempo(value)).toThrow();
    expect(controller.tempo()).toBe(60);
    gate.resolve();
    await pending;
    expect(controller.progressionState().currentIndex).toBe(1);
    expect(driver.voices[0]?.end).toBe(2);
    controller.stopAll();
  });

  it('bounds scheduling at the fastest supported tempo and keeps completed sessions stopped', async () => {
    const driver = new FakeDriver();
    const controller = new AuditionController(
      createPlaybackEngine(() => driver),
    );
    controller.setTempo(600);
    await controller.playProgression(
      Array.from({ length: 100 }, (_, i) => ({ source: String(i), notes })),
    );
    expect(driver.voices).toHaveLength(2);
    controller.stopProgression();
    await controller.playProgression([chords[0]!]);
    driver.advance(0.3);
    controller.setTempo(120);
    expect(controller.progressionState()).toEqual({
      status: 'stopped',
      currentIndex: null,
    });
    controller.stopAll();
  });
});
