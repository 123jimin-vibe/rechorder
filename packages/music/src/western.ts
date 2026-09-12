import type { Chord, ChordDefinition, Pitch, Tuning } from './model';

const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
type Letter = (typeof letters)[number];
const naturalSteps: Readonly<Record<Letter, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** This coordinate system belongs only to the conventional notation adapter. */
export interface WesternPosition {
  readonly letter: Letter;
  readonly accidental: number;
  readonly octave: number;
}

export interface WesternInterval {
  readonly diatonicSteps: number;
  readonly chromaticSteps: number;
}

interface CloseVoicing {
  readonly kind: 'root-position-close';
}

export type WesternChord = Chord<
  WesternPosition,
  WesternInterval,
  CloseVoicing
>;

function interval(
  diatonicSteps: number,
  chromaticSteps: number,
): WesternInterval {
  return { diatonicSteps, chromaticSteps };
}

function definition(
  id: string,
  label: string,
  suffix: string,
  intervals: readonly WesternInterval[],
): ChordDefinition<WesternInterval> {
  return { id, label, suffix, intervals: [interval(0, 0), ...intervals] };
}

export const chordDefinitions: readonly ChordDefinition<WesternInterval>[] = [
  definition('major', 'Major', '', [interval(2, 4), interval(4, 7)]),
  definition('minor', 'Minor', 'm', [interval(2, 3), interval(4, 7)]),
  definition('diminished', 'Diminished', 'dim', [
    interval(2, 3),
    interval(4, 6),
  ]),
  definition('augmented', 'Augmented', 'aug', [interval(2, 4), interval(4, 8)]),
  definition('sus2', 'Suspended second', 'sus2', [
    interval(1, 2),
    interval(4, 7),
  ]),
  definition('sus4', 'Suspended fourth', 'sus4', [
    interval(3, 5),
    interval(4, 7),
  ]),
  definition('dominant7', 'Dominant seventh', '7', [
    interval(2, 4),
    interval(4, 7),
    interval(6, 10),
  ]),
  definition('major7', 'Major seventh', 'maj7', [
    interval(2, 4),
    interval(4, 7),
    interval(6, 11),
  ]),
  definition('minor7', 'Minor seventh', 'm7', [
    interval(2, 3),
    interval(4, 7),
    interval(6, 10),
  ]),
];

function accidentalLabel(accidental: number): string {
  return accidental < 0 ? '♭'.repeat(-accidental) : '♯'.repeat(accidental);
}

function rootLabel(position: WesternPosition): string {
  return position.letter + accidentalLabel(position.accidental);
}

function spelledPitch(position: WesternPosition): Pitch<WesternPosition> {
  return { position, spelling: rootLabel(position) + position.octave };
}

export const roots = letters.flatMap((letter) =>
  [-1, 0, 1].map((accidental) => {
    const position: WesternPosition = { letter, accidental, octave: 3 };
    return { id: rootLabel(position), pitch: spelledPitch(position) };
  }),
);

function chromaticPosition(position: WesternPosition): number {
  if (
    !Number.isSafeInteger(position.octave) ||
    !Number.isSafeInteger(position.accidental)
  ) {
    throw new RangeError(
      'Conventional register and accidentals must be integers.',
    );
  }
  return (
    (position.octave + 1) * 12 +
    naturalSteps[position.letter] +
    position.accidental
  );
}

export const standardTuning: Tuning<WesternPosition> = {
  id: '12edo-a4-440',
  frequency: (position) => 440 * 2 ** ((chromaticPosition(position) - 69) / 12),
};

export function createChord(
  rootId: string,
  definitionId: string,
): WesternChord {
  const root = roots.find((item) => item.id === rootId)?.pitch;
  const chordDefinition = chordDefinitions.find(
    (item) => item.id === definitionId,
  );
  if (!root || !chordDefinition)
    throw new RangeError('Unsupported root or chord type.');
  return {
    root,
    definition: chordDefinition,
    voicing: { kind: 'root-position-close' },
  };
}

export function chordSymbol(chord: WesternChord): string {
  return rootLabel(chord.root.position) + chord.definition.suffix;
}

export function voiceChord(
  chord: WesternChord,
): readonly Pitch<WesternPosition>[] {
  const root = chord.root.position;
  return chord.definition.intervals.map((value) => {
    const diatonic = letters.indexOf(root.letter) + value.diatonicSteps;
    const letter = letters[diatonic % letters.length];
    if (!letter) throw new RangeError('Invalid diatonic interval.');
    const octave = root.octave + Math.floor(diatonic / letters.length);
    const desired = chromaticPosition(root) + value.chromaticSteps;
    const accidental = desired - ((octave + 1) * 12 + naturalSteps[letter]);
    return spelledPitch({ letter, octave, accidental });
  });
}
