import { describe, expect, it } from 'vitest';
import { BowedRenderer } from '../../packages/audio/src/bowed-renderer';
import { maximumVoices, type BowedEvent } from '../../packages/audio/src/bowed-protocol';

const rate = 48000;
function note(id = 1, frequency = 437.25, start = 0, end = 1): BowedEvent {
  return { type: 'start', id, frequency, gain: 0.25, start, end, seed: id * 1234567 };
}
function render(renderer: BowedRenderer, first: number, length: number, block = 128): Float32Array {
  const output = new Float32Array(length);
  const scratch = new Float32Array(block);
  for (let frame = first; frame < first + length; frame += block) {
    const count = Math.min(block, first + length - frame);
    const buffer = count === block ? scratch : scratch.subarray(0, count);
    renderer.render(buffer, frame);
    output.set(buffer, frame - first);
  }
  return output;
}

describe('streaming bowed renderer', () => {
  it('renders the same scheduled sound across different render-quantum sizes', () => {
    const a = new BowedRenderer(rate, () => {}), b = new BowedRenderer(rate, () => {});
    a.event(note(1, 437.25, 0.10123)); b.event(note(1, 437.25, 0.10123));
    const output = render(a, 0, rate, 128);
    expect(output).toEqual(render(b, 0, rate, 192));
    expect(output.subarray(0, Math.round(0.10123 * rate)).every((x) => x === 0)).toBe(true);
    expect(output.some((x) => Math.abs(x) > 0.01)).toBe(true);
  });

  it('cancels a future voice without a late onset and sends one completion', () => {
    const ended: number[] = [], renderer = new BowedRenderer(rate, (id) => ended.push(id));
    renderer.event(note(1, 440, 0.5, 1.5));
    renderer.event({ type: 'release', id: 1, at: 0.2, end: 0.2 });
    expect(render(renderer, 0, rate * 2).every((x) => x === 0)).toBe(true);
    renderer.event({ type: 'stop', id: 1 });
    expect(ended).toEqual([1]);
    expect(renderer.voiceCount).toBe(0);
  });

  it('releases one overlapping voice without shortening another', () => {
    const ended: number[] = [], renderer = new BowedRenderer(rate, (id) => ended.push(id));
    renderer.event(note(1, 440, 0, 4)); renderer.event(note(2, 523.251, 0, 4));
    render(renderer, 0, rate / 2);
    renderer.event({ type: 'release', id: 1, at: 0.5, end: 0.6 });
    render(renderer, rate / 2, rate / 2);
    expect(ended).toEqual([1]);
    expect(renderer.voiceCount).toBe(1);
    const held = render(renderer, rate, rate);
    expect(held.some((x) => Math.abs(x) > 0.03)).toBe(true);
    renderer.event({ type: 'stop', id: 2 });
    expect(render(renderer, rate * 2, rate).every((x) => x === 0)).toBe(true);
    expect(ended).toEqual([1, 2]);
  });

  it('keeps a dense arbitrary-frequency chord finite, audible and below the ceiling', () => {
    const renderer = new BowedRenderer(rate, () => {});
    for (let i = 0; i < 24; i++) renderer.event(note(i + 1, 130.8128 * 2 ** (i / 19)));
    const output = render(renderer, 0, rate * 2);
    expect(output.every((x) => Number.isFinite(x) && Math.abs(x) <= 0.881)).toBe(true);
    const sustain = output.subarray(rate / 4, rate * 3 / 4);
    expect(Math.sqrt(sustain.reduce((sum, x) => sum + x * x, 0) / sustain.length)).toBeGreaterThan(0.05);
    expect(output.subarray(rate + 256).every((x) => x === 0)).toBe(true);
    expect(renderer.voiceCount).toBe(0);
  });

  it('bounds live model allocation and frees the capacity on disposal', () => {
    const renderer = new BowedRenderer(rate, () => {});
    for (let i = 0; i < maximumVoices; i++) renderer.event(note(i + 1));
    expect(() => renderer.event(note(maximumVoices + 1))).toThrow(RangeError);
    renderer.event({ type: 'dispose' });
    expect(renderer.voiceCount).toBe(0);
    expect(() => renderer.event(note())).not.toThrow();
  });
});
