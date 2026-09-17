import type { Pitch } from '../model';
import type { WesternChord, WesternPosition } from '../western';
import { roots, rootLabel } from '../western';
import { transposePitch } from '../chord-manipulation';
import {
  hasInterval,
  mod12,
  pitchClass,
  pitchClasses,
  relation,
} from './harmony';

export const tonalModes = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
} as const;
export type TonalMode = keyof typeof tonalModes;
export interface TonalKey {
  readonly tonic: Pitch<WesternPosition>;
  readonly mode: TonalMode;
}
export interface TonalHypothesis {
  readonly key: TonalKey;
  /** Relative evidence, not a calibrated probability. */
  readonly weight: number;
}
export interface TonalContext {
  readonly source: 'explicit' | 'inferred' | 'unknown';
  readonly hypotheses: readonly TonalHypothesis[];
  readonly confident: boolean;
}

export function scalePitches(key: TonalKey): readonly Pitch<WesternPosition>[] {
  return tonalModes[key.mode].map((chromaticSteps, diatonicSteps) =>
    transposePitch(key.tonic, { diatonicSteps, chromaticSteps }),
  );
}

export function keyFit(chord: WesternChord, key: TonalKey): number {
  const tonic = pitchClass(key.tonic);
  const scale: readonly number[] = tonalModes[key.mode];
  const notes = pitchClasses(chord).map((value) => mod12(value - tonic));
  const degree = mod12(pitchClass(chord.root) - tonic);
  // Minor uses a raised leading tone in V and vii°, not a global extra scale note.
  const minorDominant =
    key.mode === 'minor' &&
    ((degree === 7 && hasInterval(chord, 4)) ||
      (degree === 11 && hasInterval(chord, 6)));
  const outside = notes.filter(
    (value) => !scale.includes(value) && !(minorDominant && value === 11),
  ).length;
  return 3 - (9 * outside) / notes.length;
}

/** Inspect a caller-supplied local window, capped defensively for standalone use. */
export function inferTonality(
  chords: readonly WesternChord[],
  explicit?: TonalKey,
): TonalContext {
  if (explicit)
    return {
      source: 'explicit',
      hypotheses: [{ key: explicit, weight: 1 }],
      confident: true,
    };
  const local = chords.slice(-8);
  if (!local.length)
    return { source: 'unknown', hypotheses: [], confident: false };
  const canonical = [
    'C',
    'D♭',
    'D',
    'E♭',
    'E',
    'F',
    'F♯',
    'G',
    'A♭',
    'A',
    'B♭',
    'B',
  ];
  const estimates = canonical
    .flatMap((id) =>
      (['major', 'minor'] as const).map((mode) => {
        const canonicalTonic = roots.find((root) => root.id === id)!.pitch;
        const tonic =
          local.findLast(
            (chord) => pitchClass(chord.root) === pitchClass(canonicalTonic),
          )?.root ?? canonicalTonic;
        const key = { tonic, mode };
        let score = 0;
        for (const [index, chord] of local.entries()) {
          const weight = 0.6 + (0.4 * (index + 1)) / local.length;
          score += keyFit(chord, key) * weight;
          const onTonic =
            pitchClass(chord.root) === pitchClass(tonic) &&
            hasInterval(chord, mode === 'major' ? 4 : 3);
          if (onTonic) {
            score += index === local.length - 1 ? 1.2 : 0.4;
            const before = local[index - 1];
            if (
              before &&
              relation(before, chord)?.kind === 'dominant-resolution'
            )
              score += 3;
          }
        }
        return { key, score };
      }),
    )
    .sort((a, b) => b.score - a.score);
  const best = estimates[0]!;
  const top = estimates.slice(0, 3);
  const weights = top.map((item) => Math.exp((item.score - best.score) / 2));
  const sum = weights.reduce((a, b) => a + b, 0);
  return {
    source: 'inferred',
    hypotheses: top.map((item, index) => ({
      key: item.key,
      weight: weights[index]! / sum,
    })),
    confident:
      new Set(local.map((chord) => pitchClass(chord.root))).size >= 3 &&
      best.score - estimates[1]!.score >= 2,
  };
}

/** One spelling per pitch class, preferring explicit scale spelling and local roots. */
export function recommendationRoots(
  context: TonalContext,
  neighbors: readonly WesternChord[],
): readonly Pitch<WesternPosition>[] {
  const canonical = [
    'C',
    'D♭',
    'D',
    'E♭',
    'E',
    'F',
    'F♯',
    'G',
    'A♭',
    'A',
    'B♭',
    'B',
  ];
  const pitches = canonical.map(
    (id) => roots.find((root) => root.id === id)!.pitch,
  );
  for (const chord of neighbors) pitches[pitchClass(chord.root)] = chord.root;
  const key = context.hypotheses[0]?.key;
  if (key && (context.source === 'explicit' || context.confident)) {
    for (const pitch of scalePitches(key)) pitches[pitchClass(pitch)] = pitch;
    if (key.mode === 'minor') {
      const leadingTone = transposePitch(key.tonic, {
        diatonicSteps: 6,
        chromaticSteps: 11,
      });
      pitches[pitchClass(leadingTone)] = leadingTone;
    }
  }
  return pitches.map((pitch) => ({
    position: { ...pitch.position, octave: 4 },
    spelling: rootLabel(pitch.position) + '4',
  }));
}
