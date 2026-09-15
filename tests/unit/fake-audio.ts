import type { AudioDriver, Voice } from '@rechorder/audio';

export interface FakeVoice {
  readonly frequency: number;
  readonly gain: number;
  readonly start: number;
  end: number;
  stopped: boolean;
  readonly onEnded: () => void;
}

export class FakeDriver implements AudioDriver {
  currentTime = 0;
  running = false;
  closed = false;
  prepareCalls = 0;
  resumeCalls = 0;
  failure: Error | null = null;
  failVoice = -1;
  gate: Promise<void> = Promise.resolve();
  readonly voices: FakeVoice[] = [];

  async prepare() {
    this.prepareCalls++;
    if (this.failure) throw this.failure;
    if (this.closed) throw new Error('Closed');
  }

  async resume() {
    this.resumeCalls++;
    await this.gate;
    if (this.failure) throw this.failure;
    if (this.closed) throw new Error('Closed');
    this.running = true;
  }

  schedule(
    frequency: number,
    gain: number,
    start: number,
    end: number,
    onEnded: () => void,
  ): Voice {
    if (this.voices.length === this.failVoice)
      throw new Error('Instrument failed');
    const voice: FakeVoice = {
      frequency,
      gain,
      start,
      end,
      onEnded,
      stopped: false,
    };
    this.voices.push(voice);
    return {
      release: (at) => {
        voice.end = Math.min(voice.end, at + 0.1);
        return voice.end;
      },
      stop: () => this.end(voice),
    };
  }

  advance(seconds: number) {
    if (!this.running) return;
    this.currentTime += seconds;
    for (const voice of this.voices)
      if (voice.end <= this.currentTime) this.end(voice);
  }

  private end(voice: FakeVoice) {
    if (voice.stopped) return;
    voice.stopped = true;
    voice.onEnded();
  }

  async close() {
    this.closed = true;
    this.running = false;
  }
}

export function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
