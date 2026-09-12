import type { AudioDriver } from './driver';
import { createPluckedString } from './plucked-string';

export function createWebAudioDriver(): AudioDriver {
  const context = new AudioContext();
  const instrument = createPluckedString(context);
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
    schedule: instrument,
    async close() {
      if (context.state !== 'closed') await context.close();
    },
  };
}
