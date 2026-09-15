import { useEffect, useState } from 'preact/hooks';
import type { AuditionController, ProgressionPlaybackState } from './audition';

const stopped: ProgressionPlaybackState = {
  status: 'stopped',
  currentIndex: null,
};

export function useProgressionPlayback(
  controller: AuditionController,
): ProgressionPlaybackState {
  const [playback, setPlayback] = useState(stopped);
  useEffect(() => {
    let frame = 0;
    let signature = 'stopped:null';
    const update = () => {
      const current = controller.progressionState();
      const next = current.status + ':' + current.currentIndex;
      if (next !== signature) {
        signature = next;
        setPlayback(current);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [controller]);
  return playback;
}
