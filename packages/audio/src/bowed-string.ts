import type { AudioDriver, Voice } from './driver';
import { maximumVoices, validateString, type BowedEvent, type BowedReply } from './bowed-protocol';

/** Main-thread resource/lifecycle adapter. All sample generation runs in the worklet. */
export function createBowedString(context: BaseAudioContext) {
  const node = new AudioWorkletNode(context, 'rechorder-bowed-strings', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1],
  });
  node.connect(context.destination);
  const voices = new Map<number, () => void>();
  let nextId = 0;
  let failed = false;
  let disposed = false;
  const send = (event: BowedEvent) => node.port.postMessage(event);
  const finish = (id: number) => {
    const ended = voices.get(id);
    voices.delete(id);
    ended?.();
  };
  const fail = (error: unknown) => {
    failed = true;
    node.disconnect();
    for (const id of voices.keys()) finish(id);
    console.error('Bowed-string renderer failed.', error);
  };
  node.onprocessorerror = fail;
  node.port.onmessage = ({ data }: MessageEvent<BowedReply>) => {
    if (data.type === 'ended') finish(data.id);
    else fail(data.message);
  };

  const schedule: AudioDriver['schedule'] = (frequency, gain, start, end, onEnded): Voice => {
    if (failed || disposed) throw new Error('Bowed-string renderer is unavailable.');
    validateString(frequency, context.sampleRate);
    if (voices.size >= maximumVoices) throw new RangeError('Bowed voice limit reached.');
    if (!Number.isSafeInteger(Math.round(start * context.sampleRate)) ||
        !Number.isSafeInteger(Math.round(end * context.sampleRate)) ||
        Math.round(end * context.sampleRate) <= Math.round(start * context.sampleRate) ||
        !Number.isFinite(gain) || gain < 0 || gain > 1)
      throw new RangeError('Invalid bowed voice schedule.');
    const id = ++nextId;
    const release = Math.min(0.1, (end - start) / 4);
    let stopTime = end;
    voices.set(id, onEnded);
    try {
      send({ type: 'start', id, frequency, gain, start, end, seed: Math.imul(id, 0x45d9f3b) >>> 0 });
    } catch (error) {
      finish(id);
      throw error;
    }
    return {
      release(at) {
        if (!voices.has(id)) return at;
        stopTime = at < start ? at : Math.min(stopTime, at + release);
        send({ type: 'release', id, at, end: stopTime });
        return stopTime;
      },
      stop() {
        if (!voices.has(id)) return;
        send({ type: 'stop', id });
        finish(id);
      },
    };
  };
  return {
    schedule,
    get failed() { return failed; },
    dispose() {
      if (disposed) return;
      disposed = true;
      send({ type: 'dispose' });
      node.disconnect();
      node.port.close();
      for (const id of voices.keys()) finish(id);
    },
  };
}
