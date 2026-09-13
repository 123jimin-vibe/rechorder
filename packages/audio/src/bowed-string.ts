import type { AudioDriver, Voice } from './driver';
import { synthesizeString } from './string-model';

/** Buffers are synthesized locally; the bounded cache avoids repeated DSP during transcription. */
export function createBowedString(
  context: BaseAudioContext,
): AudioDriver['schedule'] {
  // Shared dynamics preserve chord energy while containing overlapping release tails.
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 12;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;
  const ceiling = context.createWaveShaper();
  const curve = new Float32Array(2049);
  for (let index = 0; index < curve.length; index++) {
    const value = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = 0.9 * Math.tanh(value / 0.9);
  }
  ceiling.curve = curve;
  ceiling.oversample = '2x';
  const output = compressor;
  compressor.connect(ceiling).connect(context.destination);
  const cache = new Map<string, { buffer: AudioBuffer; rate: number }>();
  let cachedFrames = 0;
  const frameBudget = 4_000_000;
  return (frequency, gain, start, end, onEnded): Voice => {
    const duration = end - start;
    const seconds = Math.ceil(duration * 4) / 4;
    const cacheKey = frequency + ':' + seconds;
    let tone = cache.get(cacheKey);
    if (!tone) {
      const model = synthesizeString(frequency, context.sampleRate, seconds);
      const buffer = context.createBuffer(
        1,
        model.samples.length,
        context.sampleRate,
      );
      buffer.copyToChannel(model.samples, 0);
      tone = { buffer, rate: model.playbackRate };
      while (cachedFrames + buffer.length > frameBudget && cache.size) {
        const oldest = cache.entries().next().value;
        if (!oldest) break;
        cache.delete(oldest[0]);
        cachedFrames -= oldest[1].buffer.length;
      }
      if (buffer.length <= frameBudget) {
        cache.set(cacheKey, tone);
        cachedFrames += buffer.length;
      }
    }
    const source = context.createBufferSource();

    const envelope = context.createGain();
    const attack = Math.min(0.065, duration / 4);
    const release = Math.min(0.1, duration / 4);
    let finished = false;
    let stopTime = end;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      source.disconnect();

      envelope.disconnect();
      onEnded();
    };
    try {
      source.buffer = tone.buffer;
      source.playbackRate.setValueAtTime(tone.rate, start);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(gain, start + attack);
      envelope.gain.setValueAtTime(gain, end - release);
      envelope.gain.linearRampToValueAtTime(0, end);
      source.connect(envelope).connect(output);
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
