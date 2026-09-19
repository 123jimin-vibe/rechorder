import type { WesternChord, WesternPosition } from '../western';
import type { Pitch } from '../model';
import { chordPitches, chromaticPosition } from '../western';

export const mod12 = (value: number) => ((value % 12) + 12) % 12;
export const pitchClass = (pitch: Pitch<WesternPosition>) =>
  mod12(chromaticPosition(pitch.position));
export const pitchClasses = (chord: WesternChord) => [
  ...new Set(chordPitches(chord).map(pitchClass)),
];
export const hasInterval = (chord: WesternChord, interval: number) =>
  chord.definition.intervals.some(
    (value) => mod12(value.chromaticSteps) === interval,
  );
export const hasThird = (chord: WesternChord) =>
  hasInterval(chord, 3) || hasInterval(chord, 4);
/** Ninths and beyond, plus added sixths: colour that context must justify. */
export const isExtended = (chord: WesternChord) =>
  chord.definition.intervals.some(
    (value) =>
      value.chromaticSteps > 12 ||
      (value.diatonicSteps === 5 && value.chromaticSteps === 9),
  );

/** Root moves shared by the ranker and the design controls. */
export type Move =
  | 'dominant'
  | 'ii-v'
  | 'leading-tone'
  | 'fifth-down'
  | 'fifth-up'
  | 'step'
  | 'third'
  | 'same-root'
  | 'tritone';
export interface Motion {
  readonly move: Move;
  /** Idiom frequency, 0–1; see n0004. */
  readonly strength: number;
}

/** Directed root motion; no key is needed. Dominant moves require a major third
 * and a resolving third in the goal; ii–V requires a minor source and a
 * dominant-seventh goal.
 */
export function motion(from: WesternChord, to: WesternChord): Motion {
  const interval = mod12(pitchClass(to.root) - pitchClass(from.root));
  if (interval === 5) {
    if (hasInterval(from, 4) && !hasInterval(from, 11) && hasThird(to))
      return { move: 'dominant', strength: hasInterval(from, 10) ? 1 : 0.9 };
    if (
      hasInterval(from, 3) &&
      !hasInterval(from, 11) &&
      hasInterval(to, 4) &&
      hasInterval(to, 10)
    )
      return { move: 'ii-v', strength: 0.9 };
    return { move: 'fifth-down', strength: 0.7 };
  }
  if (interval === 1 && hasInterval(from, 3) && hasInterval(from, 6))
    return { move: 'leading-tone', strength: 0.8 };
  if (interval === 7) return { move: 'fifth-up', strength: 0.6 };
  if (interval === 2 || interval === 10) return { move: 'step', strength: 0.6 };
  if (interval === 1 || interval === 11)
    return { move: 'step', strength: 0.45 };
  if ([3, 4, 8, 9].includes(interval)) return { move: 'third', strength: 0.55 };
  if (interval === 0) return { move: 'same-root', strength: 0.4 };
  return { move: 'tritone', strength: 0.2 };
}

export function commonToneCount(a: WesternChord, b: WesternChord): number {
  const target = pitchClasses(b);
  return pitchClasses(a).filter((value) => target.includes(value)).length;
}
