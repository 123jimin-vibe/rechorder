import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWebAudioDriver } from '../../packages/audio/src/web-audio';

function nativeHarness(load: () => Promise<void> = async () => {}) {
  const nodes: FakeNode[] = [];
  class FakeContext {
    state = 'suspended';
    currentTime = 0;
    sampleRate = 48000;
    destination = {};
    audioWorklet = { addModule: vi.fn(load) };
    resume = vi.fn(async () => {
      this.state = 'running';
    });
    close = vi.fn(async () => {
      this.state = 'closed';
    });
  }
  const context = new FakeContext();
  class FakeNode {
    port = { postMessage: vi.fn(), close: vi.fn(), onmessage: null };
    connect = vi.fn();
    disconnect = vi.fn();
    onprocessorerror: ((error: unknown) => void) | null = null;
    constructor() {
      nodes.push(this);
    }
  }
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      return context;
    }),
  );
  vi.stubGlobal('AudioWorkletNode', FakeNode);
  return { context, nodes };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('native audio worklet lifecycle', () => {
  it('resumes in the gesture and becomes schedulable only after the module loads', async () => {
    let loaded!: () => void;
    const { context, nodes } = nativeHarness(
      () =>
        new Promise((resolve) => {
          loaded = resolve;
        }),
    );
    const driver = createWebAudioDriver(),
      ready = driver.resume();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.audioWorklet.addModule).toHaveBeenCalledOnce();
    expect(driver.running).toBe(false);
    expect(nodes).toHaveLength(0);
    loaded();
    await ready;
    expect(driver.running).toBe(true);
    const ended = vi.fn();
    const voice = driver.schedule(437.25, 0.25, 0.2, 1.2, ended);
    expect(nodes[0]!.port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        frequency: 437.25,
        start: 0.2,
        end: 1.2,
      }),
    );
    voice.stop();
    voice.stop();
    expect(ended).toHaveBeenCalledOnce();
    await driver.close();
    await driver.close();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('retries a failed module fetch without creating a second context', async () => {
    const { context, nodes } = nativeHarness();
    context.audioWorklet.addModule.mockRejectedValueOnce(
      new Error('module unavailable'),
    );
    const driver = createWebAudioDriver();
    await expect(driver.resume()).rejects.toThrow('module unavailable');
    expect(driver.running).toBe(false);
    await driver.resume();
    expect(driver.running).toBe(true);
    expect(context.audioWorklet.addModule).toHaveBeenCalledTimes(2);
    expect(nodes).toHaveLength(1);
    await driver.close();
  });

  it('does not create a renderer if disposed during initialization', async () => {
    let loaded!: () => void;
    const { nodes } = nativeHarness(
      () =>
        new Promise((resolve) => {
          loaded = resolve;
        }),
    );
    const driver = createWebAudioDriver(),
      ready = driver.resume();
    await driver.close();
    loaded();
    await expect(ready).rejects.toThrow('Audio context could not start');
    expect(nodes).toHaveLength(0);
  });

  it('finishes voices after a processor failure and rebuilds on the next gesture', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { context, nodes } = nativeHarness();
    const driver = createWebAudioDriver();
    await driver.resume();
    const ended = vi.fn();
    driver.schedule(440, 0.5, 0, 1, ended);
    nodes[0]!.onprocessorerror!(new Error('processor failed'));
    expect(driver.running).toBe(false);
    expect(ended).toHaveBeenCalledOnce();
    await driver.resume();
    expect(driver.running).toBe(true);
    expect(nodes).toHaveLength(2);
    expect(context.audioWorklet.addModule).toHaveBeenCalledOnce();
    await driver.close();
  });
});
