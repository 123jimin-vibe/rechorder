/** Karplus–Strong: a pluck travels through a lossy string, losing high partials fastest.
 * The averaging filter adds half a sample of delay. Resampling compensates that delay
 * at the fundamental instead of rounding the requested pitch to a delay-line length.
 */
export function synthesizeString(
  frequency: number,
  sampleRate: number,
  duration: number,
): { samples: Float32Array<ArrayBuffer>; playbackRate: number } {
  if (
    !Number.isFinite(frequency) ||
    frequency <= 0 ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    frequency >= sampleRate / 2 ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    throw new RangeError('Invalid string synthesis range.');
  const period = Math.max(2, Math.round(sampleRate / frequency - 0.5));
  const playbackRate = (frequency * (period + 0.5)) / sampleRate;
  const frames = Math.ceil(duration * sampleRate * playbackRate) + 2;
  if (period > 4_000_000 || frames > 4_000_000)
    throw new RangeError('String synthesis buffer exceeds its resource limit.');
  const delay = new Float32Array(period);
  let seed = 0x12345678;
  let mean = 0;
  for (let index = 0; index < period; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const position = index / period;
    const triangle = position < 0.22 ? position / 0.22 : (1 - position) / 0.78;
    const value =
      (triangle * 2 - 1) * 0.65 + ((seed / 0x100000000) * 2 - 1) * 0.35;
    delay[index] = value;
    mean += value / period;
  }
  for (let index = 0; index < period; index++)
    delay[index] = delay[index]! - mean;
  const samples = new Float32Array(frames);
  const loss = Math.pow(0.001, 1 / (frequency * 3));
  let previous = delay[period - 1]!;
  let cursor = 0;
  for (let index = 0; index < frames; index++) {
    const current = delay[cursor]!;
    samples[index] = current;
    delay[cursor] = (current + previous) * 0.5 * loss;
    previous = current;
    cursor = (cursor + 1) % period;
  }
  return { samples, playbackRate };
}
