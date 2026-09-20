import type { Pitch } from '../model';
import type { WesternChord, WesternPosition } from '../western';
import { chromaticPosition } from '../western';
import {
  chordTones,
  isAuditionable,
  setBass,
  voiceChord,
} from '../chord-manipulation';
import { mod12, pitchClass, pitchClasses } from './harmony';

/** Ordered minimum-cost voice matching: no crossings or many-to-one shortcuts.
 * Unmatched voices cost three semitones; bass motion is evaluated separately.
 */
export function voiceLeadingDistance(
  from: readonly number[],
  to: readonly number[],
): number {
  if (!from.length || !to.length) return 3 * Math.max(from.length, to.length);
  const a = [...from].sort((x, y) => x - y);
  const b = [...to].sort((x, y) => x - y);
  let previous = b.map((_, index) => index * 3);
  for (let i = 1; i < a.length; i++) {
    const row = [i * 3];
    for (let j = 1; j < b.length; j++) {
      const leap = Math.abs(a[i]! - b[j]!);
      row[j] = Math.min(
        previous[j - 1]! + leap + Math.max(0, leap - 7),
        previous[j]! + 3,
        row[j - 1]! + 3,
      );
    }
    previous = row;
  }
  return (
    (previous[b.length - 1]! + 1.3 * Math.abs(a[0]! - b[0]!)) /
    Math.max(a.length, b.length)
  );
}

/** Signed nearest interval between pitch classes, −6..5 semitones. */
const nearest = (from: number, to: number) => {
  const up = mod12(to - from);
  return up > 6 ? up - 12 : up;
};

/** Register-free smoothness: average distance from each tone to the nearest tone
 * of the other chord, in both directions. Ranks harmonies; concrete registers
 * are chosen afterwards.
 */
export function pitchClassMovement(a: WesternChord, b: WesternChord): number {
  const from = pitchClasses(a);
  const to = pitchClasses(b);
  const toward = (source: readonly number[], target: readonly number[]) =>
    source.reduce(
      (sum, value) =>
        sum +
        Math.min(...target.map((other) => Math.abs(nearest(value, other)))),
      0,
    );
  return (toward(from, to) + toward(to, from)) / (from.length + to.length);
}

const heights = (chord: WesternChord) =>
  voiceChord(chord).map((pitch) => chromaticPosition(pitch.position));
const bassClass = (chord: WesternChord) => pitchClass(voiceChord(chord)[0]!);

/** A stepwise bass line in progress. `direction` is the sign of the last step, or
 * 0 when only an inversion signals that the bass is meant to move.
 */
export interface BassLine {
  readonly direction: -1 | 0 | 1;
}

/** Detect a bass line from the two chords before a position. Only an inverted
 * chord is evidence that the bass is designed rather than following the roots:
 * an inverted `before` starts a line, and a step from an inverted `earlier` into
 * `before` continues one. Two root-position chords a step apart are root motion,
 * not a line (n0004 §4). Register is ignored: a bass heard as C then B is a step
 * regardless of octave placement.
 */
export function detectBassLine(
  before: WesternChord | undefined,
  earlier: WesternChord | undefined,
): BassLine | undefined {
  if (!before) return undefined;
  const inverted = (chord: WesternChord) =>
    bassClass(chord) !== pitchClass(chord.root);
  if (!inverted(before) && !(earlier && inverted(earlier))) return undefined;
  if (earlier) {
    const step = nearest(bassClass(earlier), bassClass(before));
    if (Math.abs(step) === 1 || Math.abs(step) === 2)
      return { direction: step > 0 ? 1 : -1 };
  }
  return inverted(before) ? { direction: 0 } : undefined;
}

/** 1 for a step continuing the line, 0.5 for a step against it, 0.25 for a leap,
 * 0 for a bass that stalls.
 */
function bassStep(from: number, to: number, direction: number): number {
  const step = nearest(from, to);
  if (step === 0) return 0;
  if (Math.abs(step) > 2) return 0.25;
  return direction === 0 || Math.sign(step) === direction ? 1 : 0.5;
}

export interface Voicing {
  readonly chord: WesternChord;
  /** 0–1 bass-line continuation, or 0 without a line. */
  readonly bassLine: number;
  /** Register-aware movement of the chosen voicing against the neighbors. */
  readonly movement: number;
}

/** Choose the bass, then the register. Inversions need a reason: a bass line in
 * progress, a following inverted chord, or a fixed bass. Otherwise the root
 * stays in the bass and only the octave adapts to the neighbors.
 */
export function chooseVoicing(
  chord: WesternChord,
  before?: WesternChord,
  after?: WesternChord,
  fixedBass?: Pitch<WesternPosition>,
  line?: BassLine,
  explore = false,
): Voicing {
  const previous = before ? heights(before) : undefined;
  const following = after ? heights(after) : undefined;
  const afterInverted = after && bassClass(after) !== pitchClass(after.root);
  const bassValue = (bass: number) => {
    const sides = [
      ...(line && before
        ? [bassStep(bassClass(before), bass, line.direction)]
        : []),
      ...((line || afterInverted) && after
        ? [bassStep(bass, bassClass(after), line?.direction ?? 0)]
        : []),
    ];
    return sides.length ? sides.reduce((a, b) => a + b, 0) / sides.length : 0;
  };
  const basses = fixedBass
    ? [{ kind: 'pitch' as const, pitch: fixedBass }]
    : line || afterInverted || explore
      ? chordTones(chord)
          .filter((tone) => tone.degree <= 7)
          .map((tone) => ({ kind: 'degree' as const, degree: tone.degree }))
      : [{ kind: 'degree' as const, degree: 1 }];
  let best: (Voicing & { readonly cost: number }) | undefined;
  for (const bass of basses) {
    const inversion = setBass(chord, bass);
    const bassLine = bassValue(bassClass(inversion));
    const initialBass = heights(inversion)[0]!;
    const fixedOctave = fixedBass
      ? (chromaticPosition(fixedBass.position) - initialBass) / 12
      : undefined;
    for (const octave of fixedOctave === undefined
      ? [-2, -1, 0, 1]
      : [fixedOctave]) {
      const voiced = {
        ...inversion,
        voicing: { ...inversion.voicing, octave },
      };
      if (!isAuditionable(voiced)) continue;
      const notes = heights(voiced);
      const movement =
        ((previous ? voiceLeadingDistance(previous, notes) : 0) +
          (following ? voiceLeadingDistance(notes, following) : 0)) /
        (Number(!!previous) + Number(!!following) || 1);
      // The bass line decides the inversion; register then follows the neighbors.
      // Ties keep the root in the bass; alone, the home octave.
      const cost =
        -100 * bassLine +
        movement +
        (!explore && bass.kind === 'degree' && bass.degree !== 1 ? 10 : 0) +
        (!previous && !following ? Math.abs(octave) : 0);
      if (!best || cost < best.cost)
        best = { chord: voiced, bassLine, movement, cost };
    }
  }
  return best ?? { chord, bassLine: 0, movement: 24 };
}
