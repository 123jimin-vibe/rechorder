import type { Pitch } from '../model';
import type { WesternChord, WesternPosition } from '../western';
import { chromaticPosition } from '../western';
import {
  chordTones,
  isAuditionable,
  setBass,
  voiceChord,
} from '../chord-manipulation';

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

const heights = (chord: WesternChord) =>
  voiceChord(chord).map((pitch) => chromaticPosition(pitch.position));

export function chooseVoicing(
  chord: WesternChord,
  before?: WesternChord,
  after?: WesternChord,
  fixedBass?: Pitch<WesternPosition>,
  preferRootBass = false,
): { chord: WesternChord; movement: number } {
  const previous = before ? heights(before) : undefined;
  const following = after ? heights(after) : undefined;
  const basses = fixedBass
    ? [{ kind: 'pitch' as const, pitch: fixedBass }]
    : chordTones(chord)
        .filter((tone) => tone.degree <= 7)
        .map((tone) => ({ kind: 'degree' as const, degree: tone.degree }));
  let best: { chord: WesternChord; movement: number; cost: number } | undefined;
  for (const bass of basses) {
    const inversion = setBass(chord, bass);
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
      // Without neighbors, prefer the ordinary register; inversions remain options,
      // but a tiny root-position prior avoids gratuitous inversions on ties.
      const cost =
        movement +
        (bass.kind === 'degree' && bass.degree !== 1
          ? preferRootBass
            ? 2
            : 0.35
          : 0) +
        (!previous && !following ? Math.abs(octave) : 0);
      if (!best || cost < best.cost) best = { chord: voiced, movement, cost };
    }
  }
  return best ?? { chord, movement: 24 };
}
