import { measureSonority, voiceMotion } from '@rechorder/music';
import type { PythagoreanPosition, SonorityProfile } from '@rechorder/music';
import { gridNotation } from './notation';
import { isPlayable, pitchId, positionNote } from './mapping';

export type GridChord = readonly PythagoreanPosition[];

export function chordProfile(notes: GridChord): SonorityProfile {
  return measureSonority(notes.map((note) => positionNote(note).frequency));
}

export function chordMovement(from: GridChord, to: GridChord): number {
  return voiceMotion(
    from.map((note) => positionNote(note).frequency),
    to.map((note) => positionNote(note).frequency),
  );
}

export interface Exploration {
  readonly kind: 'blend' | 'edge' | 'wider' | 'double';
  readonly note: PythagoreanPosition;
  readonly profile: SonorityProfile;
}

/** Additions from an explicit lattice region, with no quality-template filter:
 * every fifth-chain class within four fifths of the selection's range (so
 * thirds, sixths and sevenths of a single note are reachable), placed at every
 * octave that lands within one octave beyond the selection's register. Fifths
 * also move register, so the region is bounded in both coordinates. An octave
 * copy of a selected pitch class is a doubling: it lowers pair-averaged
 * roughness without adding a pitch class, so it is offered as its own kind
 * instead of standing in for a blending note.
 */
export function exploreAdditions(notes: GridChord): readonly Exploration[] {
  if (!notes.length || notes.length >= 16) return [];
  const seen = new Set(notes.map(pitchId));
  const classes = new Set(notes.map((note) => note.fifths));
  const heights = notes.map(pitchHeight);
  const floor = Math.min(...heights) - 1;
  const ceiling = Math.max(...heights) + 1;
  const options: { note: PythagoreanPosition; profile: SonorityProfile }[] = [];
  for (
    let fifths = Math.min(...classes) - 4;
    fifths <= Math.max(...classes) + 4;
    fifths++
  ) {
    const base = fifths * Math.log2(1.5);
    for (
      let octaves = Math.ceil(floor - base);
      octaves <= Math.floor(ceiling - base);
      octaves++
    ) {
      const note = { fifths, octaves };
      if (seen.has(pitchId(note))) continue;
      seen.add(pitchId(note));
      if (!isPlayable(positionNote(note))) continue;
      options.push({ note, profile: chordProfile([...notes, note]) });
    }
  }
  const chosen = new Set<string>();
  const pick = (
    kind: Exploration['kind'],
    doubling: boolean,
    compare: (
      a: (typeof options)[number],
      b: (typeof options)[number],
    ) => number,
  ): Exploration | undefined => {
    const best = options
      .filter(
        (option) =>
          !chosen.has(pitchId(option.note)) &&
          classes.has(option.note.fifths) === doubling,
      )
      .sort(compare)[0];
    if (!best) return undefined;
    chosen.add(pitchId(best.note));
    return { kind, ...best };
  };
  return [
    pick('blend', false, (a, b) => a.profile.roughness - b.profile.roughness),
    pick('edge', false, (a, b) => b.profile.roughness - a.profile.roughness),
    pick('wider', false, (a, b) => b.profile.spanCents - a.profile.spanCents),
    pick('double', true, (a, b) => a.profile.roughness - b.profile.roughness),
  ].filter((item): item is Exploration => item !== undefined);
}
const qualities = [
  { suffix: '', degrees: [0, 4, 1] },
  { suffix: 'm', degrees: [0, -3, 1] },
  { suffix: 'dim', degrees: [0, -3, -6] },
  { suffix: 'aug', degrees: [0, 4, 8] },
  { suffix: 'sus2', degrees: [0, 2, 1] },
  { suffix: 'sus4', degrees: [0, -1, 1] },
  { suffix: '7', degrees: [0, 4, 1, -2] },
  { suffix: 'maj7', degrees: [0, 4, 1, 5] },
  { suffix: 'm7', degrees: [0, -3, 1, -2] },
] as const;

export function uniquePitches(notes: GridChord): GridChord {
  return [...new Map(notes.map((note) => [pitchId(note), note])).values()];
}

export function sortPitches(notes: GridChord): PythagoreanPosition[] {
  return [...notes].sort((a, b) => pitchHeight(a) - pitchHeight(b));
}

function pitchHeight(note: PythagoreanPosition): number {
  return note.fifths * Math.log2(1.5) + note.octaves;
}

export function validChord(notes: GridChord): boolean {
  return (
    notes.length > 0 &&
    notes.length <= 16 &&
    uniquePitches(notes).length === notes.length &&
    notes.every((note) => isPlayable(positionNote(note)))
  );
}

export function shiftOctave(
  notes: GridChord,
  amount: number,
  target?: string,
): GridChord | null {
  const shifted = notes.map((note) =>
    target === undefined || pitchId(note) === target
      ? { ...note, octaves: note.octaves + amount }
      : note,
  );
  return validChord(shifted) ? shifted : null;
}

export function invertChord(
  notes: GridChord,
  direction: 1 | -1,
  fixedBass: boolean,
): GridChord | null {
  const ordered = sortPitches(notes);
  const bass = fixedBass ? ordered.shift() : undefined;
  if (ordered.length < 2) return null;
  const moving = direction === 1 ? ordered.shift()! : ordered.pop()!;
  const boundary = direction === 1 ? ordered.at(-1)! : ordered[0]!;
  const octaves =
    direction === 1
      ? Math.floor(pitchHeight(boundary) - pitchHeight(moving)) + 1
      : Math.ceil(pitchHeight(boundary) - pitchHeight(moving)) - 1;
  const moved = { ...moving, octaves: moving.octaves + octaves };
  if (bass && pitchHeight(moved) <= pitchHeight(bass)) return null;
  const result = sortPitches([...ordered, moved, ...(bass ? [bass] : [])]);
  return validChord(result) ? result : null;
}

export interface Completion {
  readonly id: string;
  readonly label: string;
  readonly fifths: readonly number[];
  readonly notes: GridChord;
  readonly missing: number;
}

/** Match the whole selection by exact fifth-chain identity, never rounded semitones. */
export function chordCompletions(notes: GridChord): readonly Completion[] {
  if (!notes.length) return [];
  const members = [...new Set(notes.map((note) => note.fifths))];
  if (members.length > 4) return [];
  const anchor = sortPitches(notes)[0]!;
  const result: Completion[] = [];
  for (const quality of qualities) {
    const roots = new Set(
      quality.degrees.map((degree) => members[0]! - degree),
    );
    for (const root of roots) {
      const fifths = quality.degrees.map((degree) => root + degree);
      if (!members.every((member) => fifths.includes(member))) continue;
      const rootPosition = {
        fifths: root,
        octaves: Math.ceil(pitchHeight(anchor) - root * Math.log2(1.5) - 1e-10),
      };
      const notation = gridNotation(rootPosition);
      const label = `${notation.letter}${notation.accidental}${notation.arrow}${notation.count}${quality.suffix}`;
      const missing = fifths.filter((fifth) => !members.includes(fifth));
      const added = missing.map((fifth) => ({
        fifths: fifth,
        octaves: Math.ceil(
          pitchHeight(anchor) - fifth * Math.log2(1.5) - 1e-10,
        ),
      }));
      const completed = sortPitches([...notes, ...added]);
      if (!validChord(completed)) continue;
      result.push({
        id: `${root}:${quality.suffix}`,
        label,
        fifths,
        notes: completed,
        missing: missing.length,
      });
    }
  }
  return result.sort(
    (a, b) => a.missing - b.missing || a.label.length - b.label.length,
  );
}

export function chordName(notes: GridChord): string {
  return chordCompletions(notes)
    .filter((chord) => chord.missing === 0)
    .map((chord) => chord.label)
    .join(' / ');
}

export function keyMembers(
  tonic: number | null,
  mode: 'major' | 'minor',
): readonly number[] {
  if (tonic === null) return [];
  return (
    mode === 'major' ? [0, 2, 4, -1, 1, 3, 5] : [0, 2, -3, -1, 1, -4, -2]
  ).map((degree) => tonic + degree);
}
