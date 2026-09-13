import { registerHooks } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

// Node 24 strips types; resolve the package's bundler-style relative TS imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/packages/audio/src/') && specifier.startsWith('./') && !specifier.endsWith('.ts'))
      return nextResolve(specifier + '.ts', context);
    return nextResolve(specifier, context);
  },
});
const { BowedRenderer } = await import('../../packages/audio/src/bowed-renderer.ts');
const rate = 48000;
const directory = resolve('.cache/bowed-synthesis');
mkdirSync(directory, { recursive: true });

function wav(name, samples) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  const path = resolve(directory, name + '.wav');
  writeFileSync(path, bytes);
  return path;
}
function render(chords, name, length = 2) {
  const renderer = new BowedRenderer(rate, () => {});
  let id = 0;
  chords.forEach((frequencies, index) => {
    frequencies.forEach((frequency) => {
      renderer.event({ type: 'start', id: ++id, seed: Math.imul(id, 0x45d9f3b) >>> 0, frequency,
        gain: 0.5 / Math.sqrt(frequencies.length), start: index * length,
        end: index * length + length - 0.12 });
    });
  });
  const samples = new Float32Array(Math.ceil((chords.length * length + 0.25) * rate));
  const block = new Float32Array(128), costs = [];
  let peak = 0, energy = 0;
  for (let frame = 0; frame < samples.length; frame += block.length) {
    const output = block.subarray(0, Math.min(block.length, samples.length - frame));
    const begin = performance.now(); renderer.render(output, frame); costs.push(performance.now() - begin);
    samples.set(output, frame);
    for (const value of output) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
  }
  costs.sort((a, b) => a - b);
  return { file: wav(name, samples), peak, rms: Math.sqrt(energy / samples.length),
    renderBlockMs: { median: costs[Math.floor(costs.length * 0.5)], p99: costs[Math.floor(costs.length * 0.99)], max: costs.at(-1) } };
}
const report = {
  sampleRate: rate, framesPerBlock: 128, blockBudgetMs: 128 / rate * 1000,
  caveat: 'Offline Node timings on this host are not browser deadline or physical-phone measurements. No subjective listening score is inferred.',
  solo: render([[65.4064], [130.8128], [261.6256], [437.25]], 'bowed-solo'),
  chords: render([[261.6256, 329.6276, 391.9954], [220, 261.6256, 329.6276], [174.6141, 261.6256, 349.2282, 440], [195.9977, 246.9417, 293.6648, 349.2282, 440]], 'bowed-progression'),
  microtonal: render([[220, 220 * 7 / 6, 220 * 11 / 8, 330], [261.6256, 261.6256 * 2 ** (5 / 19), 261.6256 * 2 ** (11 / 19)]], 'bowed-arbitrary-frequencies'),
  dense: render([Array.from({ length: 24 }, (_, i) => 130.8128 * 2 ** (i / 19))], 'bowed-dense', 4),
};
writeFileSync(resolve(directory, 'measurements.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
