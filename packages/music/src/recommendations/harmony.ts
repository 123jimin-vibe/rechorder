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

export type Relation =
  | 'dominant-resolution'
  | 'leading-tone-resolution'
  | 'ii-v'
  | 'plagal'
  | 'fifths';

/** Directed harmonic relationships; no key is required for local tonicization. */
export function relation(
  from: WesternChord,
  to: WesternChord,
): { kind: Relation; score: number } | undefined {
  const movement = mod12(pitchClass(to.root) - pitchClass(from.root));
  const targetTriad =
    hasInterval(to, 7) && (hasInterval(to, 3) || hasInterval(to, 4));
  if (
    movement === 5 &&
    hasInterval(from, 4) &&
    hasInterval(from, 7) &&
    !hasInterval(from, 11) &&
    targetTriad
  )
    return {
      kind: 'dominant-resolution',
      score: hasInterval(from, 10) ? 8 : 6,
    };
  if (
    movement === 1 &&
    hasInterval(from, 3) &&
    hasInterval(from, 6) &&
    targetTriad
  )
    return { kind: 'leading-tone-resolution', score: 6 };
  if (
    movement === 5 &&
    hasInterval(from, 3) &&
    hasInterval(to, 4) &&
    !hasInterval(from, 11) &&
    hasInterval(to, 10)
  )
    return { kind: 'ii-v', score: 6 };
  if (movement === 7 && hasInterval(from, 7) && targetTriad)
    return { kind: 'plagal', score: 2 };
  if (movement === 5) return { kind: 'fifths', score: 1.5 };
  return undefined;
}

export function commonToneCount(a: WesternChord, b: WesternChord): number {
  const target = pitchClasses(b);
  return pitchClasses(a).filter((value) => target.includes(value)).length;
}

/** Reward available directed resolutions of a dominant's third and seventh. */
export function tendencyResolution(
  from: WesternChord,
  to: WesternChord,
): number {
  if (relation(from, to)?.kind !== 'dominant-resolution') return 0;
  const root = pitchClass(from.root);
  const targets = pitchClasses(to);
  return (
    Number(targets.includes(mod12(root + 5))) +
    Number(
      hasInterval(from, 10) &&
        (targets.includes(mod12(root + 9)) ||
          targets.includes(mod12(root + 8))),
    )
  );
}
