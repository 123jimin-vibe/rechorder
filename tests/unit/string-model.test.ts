import { describe, expect, it } from 'vitest';
import { BowedString, bowReflection } from '../../packages/audio/src/string-model';
import { StringBody } from '../../packages/audio/src/string-body';
import { PeakLimiter } from '../../packages/audio/src/peak-limiter';

function render(frequency: number, rate: number, duration: number, expressive = false, seed = 1): Float32Array {
  const model = new BowedString(frequency, rate, seed, expressive);
  return Float32Array.from({ length: duration * rate }, () => model.tick());
}
function rms(samples: Float32Array, from = 0, to = samples.length): number {
  let sum = 0;
  for (let index = from; index < to; index++) sum += samples[index]! ** 2;
  return Math.sqrt(sum / (to - from));
}
function cents(samples: Float32Array, frequency: number, rate: number): number {
  const expected = rate / frequency;
  const begin = Math.floor(rate * 0.4), window = Math.floor(rate * 0.25);
  // Normalized autocorrelation avoids an amplitude envelope bias at low pitches.
  const correlation = (lag: number) => {
    let xy = 0, xx = 0, yy = 0;
    for (let index = begin; index < begin + window; index++) {
      const x = samples[index]!, y = samples[index + lag]!;
      xy += x * y; xx += x * x; yy += y * y;
    }
    return xy / Math.sqrt(xx * yy);
  };
  let best = Math.round(expected);
  for (let lag = Math.max(2, Math.floor(expected) - 8); lag <= Math.ceil(expected) + 8; lag++)
    if (correlation(lag) > correlation(best)) best = lag;
  const a = correlation(best - 1), b = correlation(best), c = correlation(best + 1);
  const measured = best + (a - c) / (2 * (a - 2 * b + c));
  return 1200 * Math.log2(expected / measured);
}

describe('physical bowed strings', () => {
  it.each([44100, 48000, 96000])('keeps continuous pitches in tune at %s Hz', (rate) => {
    for (const frequency of [32.7032, 65.4064, 130.8128, 277.1826, 437.25, 987.7666, 1975.5332]) {
      const samples = render(frequency, rate, 1);
      expect(samples.every(Number.isFinite)).toBe(true);
      expect(Math.abs(cents(samples, frequency, rate)), `${frequency} Hz at ${rate}`).toBeLessThan(8);
      expect(rms(samples, rate / 2, rate)).toBeGreaterThan(0.025);
    }
  });

  it('models a sticking/slipping bow and rings down when contact is removed', () => {
    expect(bowReflection(0, 3)).toBe(0.98);
    expect(bowReflection(1, 3)).toBeLessThan(0.02);
    const rate = 48000, model = new BowedString(220, rate, 1, false);
    const bowed = Float32Array.from({ length: rate * 2 }, () => model.tick());
    const released = Float32Array.from({ length: rate * 2 }, () => model.tick(0));
    expect(rms(bowed, rate, rate * 2)).toBeGreaterThan(rms(bowed, rate / 2, rate) * 0.6);
    expect(rms(released, 0, 1000)).toBeGreaterThan(0.001);
    expect(rms(released, rate, rate * 2)).toBeLessThan(rms(bowed, rate, rate * 2) * 0.03);
    const unbowed = new BowedString(220, rate);
    expect(Float32Array.from({ length: rate }, () => unbowed.tick(0)).every((x) => x === 0)).toBe(true);
  });

  it.each([32.7032, 65.4064, 130.8128, 440, 1975.5332])('sustains speaker-band energy at %s Hz', (frequency) => {
    const samples = render(frequency, 48000, 4, true);
    const band = new Float32Array(samples.length);
    let low = 0, high = 0;
    const lowAlpha = 1 - Math.exp(-2 * Math.PI * 300 / 48000);
    const highAlpha = 1 - Math.exp(-2 * Math.PI * 4000 / 48000);
    for (let index = 0; index < samples.length; index++) {
      const value = samples[index]!;
      low += lowAlpha * (value - low);
      high += highAlpha * (value - low - high);
      band[index] = high;
    }
    const full = rms(samples, 48000, 144000);
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(full).toBeGreaterThan(0.08);
    expect(rms(band, 48000, 144000)).toBeGreaterThan(full * 0.35);
    expect(rms(samples, 144000, 180000)).toBeGreaterThan(full * 0.55);
  });

  it('gives repeated notes independent bow motion, with reproducible diagnostic seeds', () => {
    const first = render(437.25, 48000, 1, true, 17);
    expect(first).toEqual(render(437.25, 48000, 1, true, 17));
    const next = render(437.25, 48000, 1, true, 18);
    expect(rms(Float32Array.from(first, (x, i) => x - next[i]!))).toBeGreaterThan(0.01);
    expect(Math.abs(cents(first, 437.25, 48000))).toBeLessThan(10);
    expect(Math.abs(cents(next, 437.25, 48000))).toBeLessThan(10);
  });

  it('keeps the body resonances stable at different output rates', () => {
    for (const rate of [8000, 44100, 48000, 96000, 192000]) {
      const body = new StringBody(rate);
      const impulse = Float32Array.from({ length: rate }, (_, i) => body.tick(i === 0 ? 1 : 0));
      expect(impulse.every(Number.isFinite)).toBe(true);
      expect(rms(impulse, 0, rate / 10)).toBeGreaterThan(0.001);
      expect(rms(impulse, rate / 2, rate)).toBeLessThan(0.00001);
    }
  });

  it('rejects frequencies that would produce invalid or unbounded delay lines', () => {
    for (const frequency of [0, -1, NaN, Infinity, 24000, 1e-10])
      expect(() => new BowedString(frequency, 48000)).toThrow(RangeError);
    for (const rate of [0, NaN, Infinity, 1e9])
      expect(() => new BowedString(440, rate)).toThrow(RangeError);
  });
});

describe('transparent output peak protection', () => {
  it('preserves a quiet chord mixture exactly apart from its lookahead delay', () => {
    const limiter = new PeakLimiter(48000);
    const input = Float64Array.from({ length: 48000 }, (_, i) => 0.25 * (Math.sin(2 * Math.PI * 437 * i / 48000) + Math.sin(2 * Math.PI * 563 * i / 48000)));
    for (let i = 0; i < input.length; i++)
      expect(limiter.tick(input[i]!)).toBe(i < limiter.latency ? 0 : input[i - limiter.latency]);
  });
  it('contains abrupt overlapping peaks and clears delayed sound on stop', () => {
    const limiter = new PeakLimiter(48000);
    for (let i = 0; i < 48000; i++) {
      const signal = i % 1000 < 500 ? 8 * Math.sin(i * 0.1) : 0.2;
      expect(Math.abs(limiter.tick(signal))).toBeLessThanOrEqual(0.8800001);
    }
    limiter.clear();
    for (let i = 0; i < limiter.latency * 2; i++) expect(limiter.tick(0)).toBe(0);
  });
});
