import type { AudioDriver, Voice } from './driver';
import { synthesizeString } from './string-model';

/** Buffers are synthesized locally; the bounded cache avoids repeated DSP during transcription. */
export function createPluckedString(
  context: BaseAudioContext,
): AudioDriver['schedule'] {
  const cache = new Map<string, { buffer: AudioBuffer; rate: number }>();
  let cachedFrames = 0;
  const frameBudget = 4_000_000;
  return (frequency, gain, start, end, onEnded): Voice => {
    const duration = end - start;
    const seconds = Math.ceil(duration * 4) / 4;
    const cacheKey = frequency + ':' + seconds;
    let pluck = cache.get(cacheKey);
    if (!pluck) {
      const model = synthesizeString(frequency, context.sampleRate, seconds);
      const buffer = context.createBuffer(
        1,
        model.samples.length,
        context.sampleRate,
      );
      buffer.copyToChannel(model.samples, 0);
      pluck = { buffer, rate: model.playbackRate };
      while (cachedFrames + buffer.length > frameBudget && cache.size) {
        const oldest = cache.entries().next().value;
        if (!oldest) break;
        cache.delete(oldest[0]);
        cachedFrames -= oldest[1].buffer.length;
      }
      if (buffer.length <= frameBudget) {
        cache.set(cacheKey, pluck);
        cachedFrames += buffer.length;
      }
    }
    const source = context.createBufferSource();
    const body = context.createBiquadFilter();
    const envelope = context.createGain();
    const attack = Math.min(0.005, duration / 4);
    const release = Math.min(0.1, duration / 4);
    let finished = false;
    let stopTime = end;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      source.disconnect();
      body.disconnect();
      envelope.disconnect();
      onEnded();
    };
    try {
      source.buffer = pluck.buffer;
      source.playbackRate.setValueAtTime(pluck.rate, start);
      body.type = 'peaking';
      body.frequency.value = 180;
      body.Q.value = 0.7;
      body.gain.value = 2;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(gain, start + attack);
      envelope.gain.setValueAtTime(gain, end - release);
      envelope.gain.linearRampToValueAtTime(0, end);
      source.connect(body).connect(envelope).connect(context.destination);
      source.onended = cleanup;
      source.start(start);
      source.stop(end);
    } catch (error) {
      try {
        source.stop();
      } catch {
        /* A source that never started needs no stop. */
      }
      cleanup();
      throw error;
    }
    return {
      release(at) {
        if (finished) return at;
        if (at < start) {
          stopTime = at;
          envelope.gain.cancelScheduledValues(at);
          envelope.gain.setValueAtTime(0, at);
        } else {
          stopTime = Math.min(stopTime, at + release);
          envelope.gain.cancelAndHoldAtTime(at);
          envelope.gain.linearRampToValueAtTime(0, stopTime);
        }
        source.stop(stopTime);
        return stopTime;
      },
      stop() {
        if (finished) return;
        source.stop();
        cleanup();
      },
    };
  };
}
