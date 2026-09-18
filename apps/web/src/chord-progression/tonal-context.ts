import { roots } from '@rechorder/music';
import type { TonalContext, TonalKey, TonalMode } from '@rechorder/music';

export const modeLabels: Readonly<Record<TonalMode, string>> = {
  major: 'Major',
  minor: 'Minor',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  locrian: 'Locrian',
};

/** Design controls need some key before any chord exists; the draft starts in C. */
export const assumedKey: TonalKey = {
  tonic: roots.find((root) => root.id === 'C')!.pitch,
  mode: 'major',
};

/** The key that design controls work in, and whether it is more than a guess. */
export function designKey(context: TonalContext): {
  readonly key: TonalKey;
  readonly certain: boolean;
} {
  return {
    key: context.hypotheses[0]?.key ?? assumedKey,
    certain: context.source === 'explicit' || context.confident,
  };
}
