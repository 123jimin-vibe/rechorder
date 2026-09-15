/// <reference path="./assets.d.ts" />
import type { AudioDriver } from './driver';
import { createBowedString, type BowedInstrument } from './bowed-string';
// Vite `?worker&url` virtual module; oxlint resolves the query-less source file, which has no default export.
// oxlint-disable-next-line import/default
import processorUrl from './bowed-processor.ts?worker&url';

// A blocked `resume()` is parked by the specification instead of rejecting, so a
// gesture that may not start audio would otherwise wait forever. Give up after
// this many milliseconds and let the next musical gesture try again.
const startTimeout = 2000;

export function createWebAudioDriver(): AudioDriver {
  const context = new AudioContext();
  let instrument: BowedInstrument | undefined;
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
      let starting: Promise<unknown> = Promise.resolve();
      // A document that has never been activated may not start audio, and its
      // parked promise never settles; leave `starting` resolved so this gesture
      // reports the failure and the gesture that activates the document retries.
      if (
        context.state !== 'running' &&
        navigator.userActivation?.hasBeenActive !== false
      ) {
        // Call resume during the gesture, before awaiting any in-flight preparation.
        const attempt = context.resume();
        attempt.catch(() => {});
        starting = Promise.race([
          attempt,
          new Promise<void>((resolve) => {
            const check = () => {
              if (context.state === 'suspended') return;
              clearTimeout(timer);
              context.removeEventListener('statechange', check);
              resolve();
            };
            context.addEventListener('statechange', check);
            const timer = setTimeout(() => {
              context.removeEventListener('statechange', check);
              resolve();
            }, startTimeout);
          }),
        ]);
      }
      await Promise.all([starting, prepare()]);
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
