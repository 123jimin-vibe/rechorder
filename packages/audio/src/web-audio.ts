/// <reference path="./assets.d.ts" />
import type { AudioDriver } from './driver';
import { createBowedString } from './bowed-string';
import processorUrl from './bowed-processor.ts?worker&url';

export function createWebAudioDriver(): AudioDriver {
  const context = new AudioContext();
  let instrument: ReturnType<typeof createBowedString> | undefined;
  let module: Promise<void> | undefined;
  return {
    get currentTime() {
      return context.currentTime;
    },
    get running() {
      return context.state === 'running' && Boolean(instrument) && !instrument!.failed;
    },
    async resume() {
      if (context.state === 'closed')
        throw new Error('Audio context is closed.');
      // Call resume during the gesture, before awaiting the module fetch.
      const resume = context.resume();
      module ??= context.audioWorklet.addModule(processorUrl).catch((error: unknown) => {
        module = undefined;
        throw error;
      });
      await Promise.all([resume, module]);
      if (context.state !== 'running')
        throw new Error('Audio context could not start.');
      if (!instrument || instrument.failed) {
        instrument?.dispose();
        instrument = createBowedString(context);
      }
    },
    schedule(...args) {
      if (!instrument) throw new Error('Audio must be initialized before scheduling.');
      return instrument.schedule(...args);
    },
    async close() {
      instrument?.dispose();
      if (context.state !== 'closed') await context.close();
    },
  };
}
