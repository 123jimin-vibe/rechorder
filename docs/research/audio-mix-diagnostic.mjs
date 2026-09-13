/** Reproduce the current output curve on coherent two-tone signals.
 * This isolates static intermodulation; it does not simulate the compressor,
 * Web Audio oversampling, actual string signals, or perceived instrument identity.
 * Run: node docs/research/audio-mix-diagnostic.mjs
 */
const sampleRate = 48000;
const frequencies = [437, 563];
const products = [311, 689, 1437, 1563];
const curve = Float32Array.from(
  { length: 2049 },
  (_, index) => 0.9 * Math.tanh(((index / 2048) * 2 - 1) / 0.9),
);

function shape(value) {
  const position = ((Math.max(-1, Math.min(1, value)) + 1) / 2) * 2048;
  const left = Math.floor(position);
  const fraction = position - left;
  return (
    curve[left] * (1 - fraction) + curve[Math.min(left + 1, 2048)] * fraction
  );
}

function amplitude(samples, frequency) {
  let real = 0;
  let imaginary = 0;
  for (let index = 0; index < samples.length; index++) {
    const phase = (2 * Math.PI * frequency * index) / sampleRate;
    real += samples[index] * Math.cos(phase);
    imaginary -= samples[index] * Math.sin(phase);
  }
  return (2 * Math.hypot(real, imaginary)) / samples.length;
}

function measure(samples) {
  const fundamental = amplitude(samples, frequencies[0]);
  return Object.fromEntries(
    products.map((frequency) => [
      frequency,
      Number(
        (
          20 *
          Math.log10(
            Math.max(1e-15, amplitude(samples, frequency)) / fundamental,
          )
        ).toFixed(2),
      ),
    ]),
  );
}

const observations = [0.1, 0.25, 0.4].map((peakPerTone) => {
  const linear = new Float64Array(sampleRate);
  const shared = new Float64Array(sampleRate);
  const separate = new Float64Array(sampleRate);
  for (let index = 0; index < sampleRate; index++) {
    const a =
      peakPerTone *
      Math.sin((2 * Math.PI * frequencies[0] * index) / sampleRate);
    const b =
      peakPerTone *
      Math.sin((2 * Math.PI * frequencies[1] * index) / sampleRate);
    linear[index] = a + b;
    shared[index] = shape(a + b);
    separate[index] = shape(a) + shape(b);
  }
  return {
    peakPerTone,
    intermodulationDbRelativeTo437Hz: {
      linear: measure(linear),
      sharedCurve: measure(shared),
      separateCurves: measure(separate),
    },
  };
});

console.log(
  JSON.stringify(
    { sampleRate, seconds: 1, frequencies, observations },
    null,
    2,
  ),
);
