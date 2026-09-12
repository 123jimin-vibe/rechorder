import type { AudioDriver, Voice } from './driver';

export function createWebAudioDriver(): AudioDriver {
  const context = new AudioContext();
  return {
    get currentTime() {
      return context.currentTime;
    },
    get running() {
      return context.state === 'running';
    },
    async resume() {
      if (context.state === 'closed')
        throw new Error('Audio context is closed.');
      await context.resume();
      if (context.state !== 'running')
        throw new Error('Audio context could not start.');
    },
    schedule(frequency, gain, start, end, onEnded): Voice {
      if (frequency >= context.sampleRate / 2)
        throw new RangeError('Pitch exceeds the audio output range.');
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const duration = end - start;
      const attack = Math.min(0.01, duration / 4);
      const release = Math.min(0.1, duration / 4);
      let finished = false;
      let stopTime = end;
      const cleanup = () => {
        if (finished) return;
        finished = true;
        oscillator.disconnect();
        envelope.disconnect();
        onEnded();
      };
      try {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(gain, start + attack);
        envelope.gain.setValueAtTime(gain, end - release);
        envelope.gain.linearRampToValueAtTime(0, end);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
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
    },
    async close() {
      if (context.state !== 'closed') await context.close();
    },
  };
}
