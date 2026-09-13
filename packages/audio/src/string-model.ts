/** Sustained bow-like excitation: band-limited stick/slip harmonics, body formants,
 * gentle vibrato and bow noise. Frequencies remain continuous, not MIDI-quantized.
 * The instrument owns attack/release; the source never decays like a plucked string.
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
  const frames = Math.ceil(duration * sampleRate) + 2;
  if (sampleRate / frequency > 4_000_000 || frames > 4_000_000)
    throw new RangeError('String synthesis buffer exceeds its resource limit.');

  const size = 4096;
  const table = new Float32Array(size);
  const harmonics = Math.min(
    96,
    Math.floor((sampleRate * 0.49) / (frequency * 1.004)),
  );
  const resonance = (hz: number, center: number, width: number) =>
    Math.exp(-0.5 * (Math.log2(hz / center) / width) ** 2);
  for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
    const hz = frequency * harmonic;
    const body =
      0.45 +
      1.2 * resonance(hz, 450, 0.65) +
      0.9 * resonance(hz, 1100, 0.5) +
      0.7 * resonance(hz, 2400, 0.45);
    const amplitude = body / harmonic ** 0.85 / (1 + (hz / 5500) ** 4);
    for (let index = 0; index < size; index++)
      table[index] =
        table[index]! +
        amplitude * Math.sin((2 * Math.PI * harmonic * index) / size);
  }
  // Retain the fundamental near Nyquist, where no vibrato headroom remains.
  if (harmonics === 0)
    for (let index = 0; index < size; index++)
      table[index] = Math.sin((2 * Math.PI * index) / size);
  let energy = 0;
  let peak = 0;
  for (const value of table) {
    energy += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const scale = Math.min(0.4 / Math.sqrt(energy / size), 0.9 / peak);
  const samples = new Float32Array(frames);
  let phase = 0;
  let seed = 0x12345678;
  let noise = 0;
  for (let index = 0; index < frames; index++) {
    const time = index / sampleRate;
    const vibrato =
      harmonics > 0
        ? 0.003 * Math.min(1, time / 0.3) * Math.sin(2 * Math.PI * 5.2 * time)
        : 0;
    const position = phase * size;
    const left = Math.floor(position);
    const fraction = position - left;
    const wave =
      table[left]! * (1 - fraction) + table[(left + 1) % size]! * fraction;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noise += 0.15 * ((seed / 0x100000000) * 2 - 1 - noise);
    samples[index] =
      wave * scale * (0.98 + 0.02 * Math.sin(2 * Math.PI * 0.7 * time)) +
      noise * 0.008;
    phase = (phase + (frequency * (1 + vibrato)) / sampleRate) % 1;
  }
  return { samples, playbackRate: 1 };
}
