import { describe, expect, it } from 'vitest';
import { synthesizeString } from '../../packages/audio/src/string-model';

function rms(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let index = from; index < to; index++) sum += samples[index]! ** 2;
  return Math.sqrt(sum / (to - from));
}

describe('plucked string physical model', () => {
  it.each([32.7032, 65.4064, 130.8128, 277.1826, 440, 987.7666, 1975.5332])(
    'keeps %s Hz in tune across the keyboard',
    (frequency) => {
      const sampleRate = 48000;
      const { samples, playbackRate } = synthesizeString(
        frequency,
        sampleRate,
        1,
      );
      const expected = (sampleRate * playbackRate) / frequency;
      const begin = 4800;
      function correlation(lag: number) {
        let value = 0;
        for (let index = begin; index < begin + 4096; index++)
          value += samples[index]! * samples[index + lag]!;
        return value;
      }
      let best = Math.round(expected);
      for (
        let lag = Math.floor(expected) - 2;
        lag <= Math.ceil(expected) + 2;
        lag++
      )
        if (correlation(lag) > correlation(best)) best = lag;
      const a = correlation(best - 1),
        b = correlation(best),
        c = correlation(best + 1);
      const measured = best + (a - c) / (2 * (a - 2 * b + c));
      expect(Math.abs(1200 * Math.log2(expected / measured))).toBeLessThan(5);
      expect(samples.every(Number.isFinite)).toBe(true);
      expect(rms(samples, 30000, 34000)).toBeLessThan(
        rms(samples, 1000, 5000) * 0.4,
      );
    },
  );

  it('rejects invalid or unbounded synthesis allocations', () => {
    for (const frequency of [0, -1, NaN, Infinity, 24000, 1e-10])
      expect(() => synthesizeString(frequency, 48000, 1)).toThrow(RangeError);
    expect(() => synthesizeString(440, 48000, 1e9)).toThrow(RangeError);
  });
});
