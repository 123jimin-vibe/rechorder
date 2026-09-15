/// <reference path="./assets.d.ts" />
import type { AudioDriver } from './driver';
import { createBowedString } from './bowed-string';
// Vite `?worker&url` virtual module; oxlint resolves the query-less source file, which has no default export.
// oxlint-disable-next-line import/default
import processorUrl from './bowed-processor.ts?worker&url';

export function createWebAudioDriver(): AudioDriver {
  const context = new AudioContext();
  let instrument: ReturnType<typeof createBowedString> | undefined;
  let module: Promise<void> | undefined;
  const closed = () => context.state === 'closed';
  const prepare = async () => {
    if (closed()) throw new Error('Audio context is closed.');
    module ??= context.audioWorklet
      .addModule(processorUrl)
      .catch((error: unknown) => {
        module = undefined;
        throw error;
      });
    await module;
    if (closed()) throw new Error('Audio context closed while preparing.');
    if (!instrument || instrument.failed) {
      instrument?.dispose();
      instrument = createBowedString(context);
    }
  };
  return {
    get currentTime() {
      return context.currentTime;
    },
    get running() {
      return (
        context.state === 'running' &&
        Boolean(instrument) &&
        !instrument!.failed
      );
    },
    prepare,
    async resume() {
      if (closed()) throw new Error('Audio context is closed.');
      // Call resume during the gesture, before awaiting any in-flight preparation.
      const resume =
        context.state === 'running' ? Promise.resolve() : context.resume();
      await Promise.all([resume, prepare()]);
      if (context.state !== 'running')
        throw new Error('Audio context could not start.');
    },
    schedule(...args) {
      if (!instrument)
        throw new Error('Audio must be initialized before scheduling.');
      return instrument.schedule(...args);
    },
    async close() {
      instrument?.dispose();
      if (context.state !== 'closed') await context.close();
    },
  };
}
