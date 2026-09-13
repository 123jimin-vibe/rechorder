import { useEffect, useState } from 'preact/hooks';
import type { ActiveNote } from '@rechorder/audio';
import type { AuditionController } from './audition';

export function useSoundingNotes(
  controller: AuditionController,
): readonly ActiveNote[] {
  const [notes, setNotes] = useState<readonly ActiveNote[]>([]);
  useEffect(() => {
    let frame = 0;
    let signature = '';
    const update = () => {
      const current = controller.notes();
      const next = current
        .map((item) => item.playbackId + ':' + item.note.key)
        .join('|');
      if (next !== signature) {
        signature = next;
        setNotes(current);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [controller]);
  return notes;
}
