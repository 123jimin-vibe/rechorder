import type { Pitch } from '../model';
import type { WesternChord, WesternPosition } from '../western';
import { createChord, roots, rootLabel } from '../western';
import { transposePitch, voiceChord } from '../chord-manipulation';
import {
  hasInterval,
  hasThird,
  mod12,
  motion,
  pitchClass,
  pitchClasses,
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

/** 3 when every tone is in the key; each outside tone removes a proportional share. */
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

const canonicalRoots = [
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

/** Inspect a caller-supplied local window, capped defensively for standalone use.
 * Tonic evidence needs a root-position chord; an inverted chord is heard as a
 * passing harmony over a bass line, not as a key center.
 */
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
  const estimates = canonicalRoots
    .flatMap((id) =>
      (['major', 'minor'] as const).map((mode) => {
        const canonicalTonic = roots.find((root) => root.id === id)!.pitch;
        const tonic =
          local.findLast(
            (chord) => pitchClass(chord.root) === pitchClass(canonicalTonic),
          )?.root ?? canonicalTonic;
        const key = { tonic, mode };
        let score = 0;
        let tonicHeard = false;
        for (const [index, chord] of local.entries()) {
          const weight = 0.6 + (0.4 * (index + 1)) / local.length;
          score += keyFit(chord, key) * weight;
          const onTonic =
            pitchClass(chord.root) === pitchClass(tonic) &&
            hasInterval(chord, mode === 'major' ? 4 : 3) &&
            pitchClass(voiceChord(chord)[0]!) === pitchClass(chord.root);
          if (onTonic) {
            tonicHeard = true;
            score += index === 0 || index === local.length - 1 ? 1 : 0.4;
            const before = local[index - 1];
            if (before && motion(before, chord).move === 'dominant') score += 3;
          }
        }
        // A key whose tonic never sounds in root position is a weaker claim.
        return { key, score: tonicHeard ? score : score - 0.8 };
      }),
    )
    .sort((a, b) => b.score - a.score);
  const best = estimates[0]!;
  const top = estimates.slice(0, 3);
  const weights = top.map((item) => Math.exp((item.score - best.score) / 1.5));
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
  const pitches = canonicalRoots.map(
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

export type HarmonicFunction =
  'tonic' | 'subdominant' | 'dominant' | 'applied' | 'borrowed' | 'chromatic';
export interface ChordRole {
  /** Roman numeral relative to the key, e.g. `V7`, `vi`, `♭VII`, `V7/ii`. */
  readonly numeral: string;
  readonly function: HarmonicFunction;
  /** Idiom frequency, 0–1; see n0004. */
  readonly prior: number;
}

const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;
const majorDiatonicPrior: Readonly<Record<number, number>> = {
  0: 1,
  2: 0.7,
  4: 0.45,
  5: 0.9,
  7: 0.95,
  9: 0.85,
  11: 0.3,
};
const minorDiatonicPrior: Readonly<Record<number, number>> = {
  0: 1,
  2: 0.5,
  3: 0.6,
  5: 0.85,
  7: 0.5,
  8: 0.8,
  10: 0.65,
  11: 0.4,
};
const majorBorrowedPrior: Readonly<Record<number, number>> = {
  0: 0.2,
  2: 0.25,
  3: 0.3,
  5: 0.45,
  8: 0.4,
  10: 0.5,
};
const minorBorrowedPrior: Readonly<Record<number, number>> = {
  0: 0.3,
  2: 0.35,
  5: 0.4,
};
const functionByScaleIndex: readonly HarmonicFunction[] = [
  'tonic',
  'subdominant',
  'tonic',
  'subdominant',
  'dominant',
  'tonic',
  'dominant',
];

function qualitySuffix(chord: WesternChord): string {
  const seventh = hasInterval(chord, 10)
    ? '7'
    : hasInterval(chord, 11)
      ? 'Δ7'
      : '';
  if (hasInterval(chord, 3) && hasInterval(chord, 6))
    return hasInterval(chord, 9) ? '°7' : hasInterval(chord, 10) ? 'ø7' : '°';
  if (!hasThird(chord)) return 'sus' + seventh;
  if (hasInterval(chord, 4) && hasInterval(chord, 8) && !hasInterval(chord, 7))
    return '+' + seventh;
  return seventh;
}

function degreeNumeral(key: TonalKey, degree: number, minorQuality: boolean) {
  const scale: readonly number[] = tonalModes[key.mode];
  const index = scale.indexOf(degree);
  const sharpFirst = key.mode === 'minor';
  const base =
    index >= 0
      ? numerals[index]!
      : sharpFirst && scale.includes(degree - 1)
        ? '♯' + numerals[scale.indexOf(degree - 1)]!
        : scale.includes(mod12(degree + 1))
          ? '♭' + numerals[scale.indexOf(mod12(degree + 1))]!
          : '♯' + numerals[scale.indexOf(mod12(degree - 1))]!;
  return minorQuality ? base.toLowerCase() : base;
}

/** Key-relative interpretation of one chord. The numeral is a label for people;
 * the prior is the ranker's idiom-frequency term.
 */
export function chordRole(chord: WesternChord, key: TonalKey): ChordRole {
  const scale: readonly number[] = tonalModes[key.mode];
  const degree = mod12(pitchClass(chord.root) - pitchClass(key.tonic));
  const fit = keyFit(chord, key);
  const minorQuality =
    hasInterval(chord, 3) || (hasInterval(chord, 6) && !hasInterval(chord, 4));
  const suffix = qualitySuffix(chord);
  const numeral = degreeNumeral(key, degree, minorQuality) + suffix;
  const colour = hasThird(chord) ? 1 : 0.6;
  const index = scale.indexOf(degree);
  // An augmented triad never functions as a diatonic degree even when its tones fit.
  if (hasInterval(chord, 8) && hasInterval(chord, 4) && !hasInterval(chord, 7))
    return { numeral, function: 'chromatic', prior: 0.15 * colour };
  if (fit === 3 && index >= 0) {
    const prior =
      key.mode === 'major'
        ? majorDiatonicPrior[degree]!
        : key.mode === 'minor'
          ? degree === 7 && hasInterval(chord, 4)
            ? 0.95
            : minorDiatonicPrior[degree]!
          : degree === 0
            ? 1
            : index === 3 || index === 4
              ? 0.8
              : 0.55;
    return {
      numeral,
      function: functionByScaleIndex[index]!,
      prior: prior * colour,
    };
  }
  if (key.mode === 'minor' && degree === 11 && fit === 3)
    return {
      numeral: 'vii' + suffix,
      function: 'dominant',
      prior: 0.4 * colour,
    };
  const dominantQuality =
    hasInterval(chord, 4) && !hasInterval(chord, 11) && !hasInterval(chord, 8);
  const diminishedQuality = hasInterval(chord, 3) && hasInterval(chord, 6);
  const goal = mod12(degree + (dominantQuality ? 5 : 1));
  const goalIndex = scale.indexOf(goal);
  if ((dominantQuality || diminishedQuality) && goal === 0)
    return {
      numeral,
      function: 'dominant',
      prior: (dominantQuality ? 0.7 : 0.3) * colour,
    };
  // Only major or minor goals are tonicized; nothing applies to a diminished degree.
  const goalFifth =
    goalIndex >= 0 ? mod12(scale[(goalIndex + 4) % 7]! - goal) : 0;
  if (
    (dominantQuality || diminishedQuality) &&
    goalIndex >= 0 &&
    goalFifth === 7
  ) {
    const goalMinor =
      mod12(scale[(goalIndex + 2) % 7]! - goal) === 3 &&
      !(key.mode === 'minor' && goal === 7);
    const goalNumeral = degreeNumeral(key, goal, goalMinor);
    return {
      numeral:
        (dominantQuality ? 'V' + suffix : 'vii' + suffix) + '/' + goalNumeral,
      function: 'applied',
      prior: (dominantQuality ? 0.45 : 0.35) * colour,
    };
  }
  if (key.mode === 'major' || key.mode === 'minor') {
    const parallel = {
      tonic: key.tonic,
      mode: key.mode === 'major' ? ('minor' as const) : ('major' as const),
    };
    if (keyFit(chord, parallel) === 3) {
      const table =
        key.mode === 'major' ? majorBorrowedPrior : minorBorrowedPrior;
      return {
        numeral,
        function: 'borrowed',
        prior: (table[degree] ?? 0.2) * colour,
      };
    }
    if (key.mode === 'major' && degree === 1 && dominantQuality)
      return { numeral, function: 'chromatic', prior: 0.25 * colour };
  }
  return {
    numeral,
    function: 'chromatic',
    prior: (Math.max(0, fit) / 3) * 0.1 * colour,
  };
}

const triadDefinitions: Readonly<Record<string, string>> = {
  '4,7': 'major',
  '3,7': 'minor',
  '3,6': 'diminished',
  '4,8': 'augmented',
};
const seventhDefinitions: Readonly<Record<string, string>> = {
  '4,7,10': 'dominant7',
  '4,7,11': 'major7',
  '3,7,10': 'minor7',
  '3,7,11': 'minorMajor7',
  '3,6,10': 'halfDiminished7',
  '3,6,9': 'diminished7',
};

/** Diatonic chord on a scale degree (0–6), stacked in thirds from the scale.
 * Minor keys raise the leading tone for V and vii°, matching common practice.
 */
export function diatonicChord(
  key: TonalKey,
  index: number,
  seventh = false,
): WesternChord {
  if (!Number.isInteger(index) || index < 0 || index > 6)
    throw new RangeError('Scale degree must be an integer from 0 to 6.');
  const pitches = scalePitches(key);
  const harmonic =
    key.mode === 'minor'
      ? pitches.map((pitch, position) =>
          position === 6
            ? transposePitch(key.tonic, {
                diatonicSteps: 6,
                chromaticSteps: 11,
              })
            : pitch,
        )
      : pitches;
  const stack = (position: number) => (index + position) % 7;
  const root = (index === 4 || index === 6 ? harmonic : pitches)[index]!;
  const member = (position: number) =>
    mod12(
      pitchClass(
        (index === 4 || index === 6 ? harmonic : pitches)[stack(position)]!,
      ) - pitchClass(root),
    );
  const triad = `${member(2)},${member(4)}`;
  const definitionId =
    (seventh ? seventhDefinitions[`${triad},${member(6)}`] : undefined) ??
    triadDefinitions[triad] ??
    'major';
  return {
    ...createChord('C', definitionId),
    root: {
      position: { ...root.position, octave: 4 },
      spelling: rootLabel(root.position) + '4',
    },
  };
}
