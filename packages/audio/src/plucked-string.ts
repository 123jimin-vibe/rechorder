import type { AudioDriver, Voice } from './driver';

/** A shared harmonic excitation; each pluck owns its damping and amplitude envelope. */
export function createPluckedString(
  context: BaseAudioContext,
): AudioDriver['schedule'] {
  const harmonics = 16;
  const real = new Float32Array(harmonics + 1);
  const imaginary = new Float32Array(harmonics + 1);
  for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
    // A pluck away from the bridge softens the highest partials.
    imaginary[harmonic] = Math.sin(harmonic * Math.PI * 0.22) / harmonic ** 1.5;
  }
  const wave = context.createPeriodicWave(real, imaginary);

  return (frequency, gain, start, end, onEnded): Voice => {
    if (frequency >= context.sampleRate / 2)
      throw new RangeError('Pitch exceeds the audio output range.');
    const oscillator = context.createOscillator();
    const damping = context.createBiquadFilter();
    const envelope = context.createGain();
    const duration = end - start;
    const attack = Math.min(0.005, duration / 4);
    const release = Math.min(0.1, duration / 4);
    let finished = false;
    let stopTime = end;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      oscillator.disconnect();
      damping.disconnect();
      envelope.disconnect();
      onEnded();
    };
    try {
      oscillator.setPeriodicWave(wave);
      oscillator.frequency.setValueAtTime(frequency, start);
      damping.type = 'lowpass';
      damping.Q.value = 0.5;
      const nyquist = context.sampleRate / 2;
      damping.frequency.setValueAtTime(
        Math.min(frequency * 10, nyquist),
        start,
      );
      damping.frequency.exponentialRampToValueAtTime(
        Math.min(frequency * 2, nyquist),
        end - release,
      );
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(gain, start + attack);
      envelope.gain.exponentialRampToValueAtTime(gain * 0.18, end - release);
      envelope.gain.linearRampToValueAtTime(0, end);
      oscillator
        .connect(damping)
        .connect(envelope)
        .connect(context.destination);
      oscillator.onended = cleanup;
      oscillator.start(start);
      oscillator.stop(end);
    } catch (error) {
      try {
        oscillator.stop();
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
        oscillator.stop(stopTime);
        return stopTime;
      },
      stop() {
        if (finished) return;
        oscillator.stop();
        cleanup();
      },
    };
  };
}
