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
> & { readonly alterations: readonly ChordAlteration[] };

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

export const defaultChordOctave = 4;

export const roots = letters.flatMap((letter) =>
  [-1, 0, 1].map((accidental) => {
    const position: WesternPosition = {
      letter,
      accidental,
      octave: defaultChordOctave,
    };
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
  bassId?: string,
): WesternChord {
  const root = roots.find((item) => item.id === rootId)?.pitch;
  const chordDefinition = [...chordDefinitions, ...jazzDefinitions].find(
    (item) => item.id === definitionId,
  );
  if (!root || !chordDefinition)
    throw new RangeError('Unsupported root or chord type.');
  const bass =
    bassId === undefined
      ? undefined
      : roots.find((item) => item.id === bassId)?.pitch;
  if (bassId !== undefined && !bass) throw new RangeError('Unsupported bass.');
  return {
    root,
    alterations: [],
    ...(bass ? { bass } : {}),
    definition: chordDefinition,
    voicing: { kind: 'root-position-close' },
  };
}

export function chordSymbol(chord: WesternChord): string {
  return (
    rootLabel(chord.root.position) +
    chord.definition.suffix +
    (chord.bass ? '/' + rootLabel(chord.bass.position) : '')
  );
}

export function voiceChord(
  chord: WesternChord,
): readonly Pitch<WesternPosition>[] {
  const root = chord.root.position;
  const pitches = chord.definition.intervals.map((value) => {
    const diatonic = letters.indexOf(root.letter) + value.diatonicSteps;
    const letter = letters[diatonic % letters.length];
    if (!letter) throw new RangeError('Invalid diatonic interval.');
    const octave = root.octave + Math.floor(diatonic / letters.length);
    const desired = chromaticPosition(root) + value.chromaticSteps;
    const accidental = desired - ((octave + 1) * 12 + naturalSteps[letter]);
    return spelledPitch({ letter, octave, accidental });
  });
  if (!chord.bass) return pitches;
  // Keep the chord's complete upper structure; place the specified bass strictly below it.
  const lowest = Math.min(
    ...pitches.map((pitch) => chromaticPosition(pitch.position)),
  );
  const position = chord.bass.position;
  const octave =
    position.octave +
    Math.ceil((lowest - chromaticPosition(position)) / 12) -
    1;
  return [spelledPitch({ ...position, octave }), ...pitches];
}

const majorThird = interval(2, 4);
const minorThird = interval(2, 3);
const fifth = interval(4, 7);
const seventh = interval(6, 10);
const majorSeventh = interval(6, 11);
const ninth = interval(8, 14);
const eleventh = interval(10, 17);
const thirteenth = interval(12, 21);

/** Explicit complete stacks; omission/voicing choices remain independent future controls. */
export const jazzDefinitions: readonly ChordDefinition<WesternInterval>[] = [
  definition('sixth', 'Sixth', '6', [majorThird, fifth, interval(5, 9)]),
  definition('minor6', 'Minor sixth', 'm6', [
    minorThird,
    fifth,
    interval(5, 9),
  ]),
  definition('sixNine', 'Six nine', '6/9', [
    majorThird,
    fifth,
    interval(5, 9),
    ninth,
  ]),
  definition('add9', 'Added ninth', 'add9', [majorThird, fifth, ninth]),
  definition('minorAdd9', 'Minor added ninth', 'm(add9)', [
    minorThird,
    fifth,
    ninth,
  ]),
  definition('minorMajor7', 'Minor major seventh', 'm(maj7)', [
    minorThird,
    fifth,
    majorSeventh,
  ]),
  definition('diminished7', 'Diminished seventh', 'dim7', [
    minorThird,
    interval(4, 6),
    interval(6, 9),
  ]),
  definition('halfDiminished7', 'Half diminished seventh', 'm7♭5', [
    minorThird,
    interval(4, 6),
    seventh,
  ]),
  definition('dominant7sus4', 'Dominant seventh suspended fourth', '7sus4', [
    interval(3, 5),
    fifth,
    seventh,
  ]),
  definition('dominant9', 'Dominant ninth', '9', [
    majorThird,
    fifth,
    seventh,
    ninth,
  ]),
  definition('major9', 'Major ninth', 'maj9', [
    majorThird,
    fifth,
    majorSeventh,
    ninth,
  ]),
  definition('minor9', 'Minor ninth', 'm9', [
    minorThird,
    fifth,
    seventh,
    ninth,
  ]),
  definition('dominant11', 'Dominant eleventh', '11', [
    majorThird,
    fifth,
    seventh,
    ninth,
    eleventh,
  ]),
  definition('major11', 'Major eleventh', 'maj11', [
    majorThird,
    fifth,
    majorSeventh,
    ninth,
    eleventh,
  ]),
  definition('minor11', 'Minor eleventh', 'm11', [
    minorThird,
    fifth,
    seventh,
    ninth,
    eleventh,
  ]),
  definition('dominant13', 'Dominant thirteenth', '13', [
    majorThird,
    fifth,
    seventh,
    ninth,
    eleventh,
    thirteenth,
  ]),
  definition('major13', 'Major thirteenth', 'maj13', [
    majorThird,
    fifth,
    majorSeventh,
    ninth,
    eleventh,
    thirteenth,
  ]),
  definition('minor13', 'Minor thirteenth', 'm13', [
    minorThird,
    fifth,
    seventh,
    ninth,
    eleventh,
    thirteenth,
  ]),
];

export const chordAlterations = [
  { id: '♭5', interval: interval(4, 6) },
  { id: '♯5', interval: interval(4, 8) },
  { id: '♭9', interval: interval(8, 13) },
  { id: '♯9', interval: interval(8, 15) },
  { id: '♯11', interval: interval(10, 18) },
  { id: '♭13', interval: interval(12, 20) },
] as const;
export type ChordAlteration = (typeof chordAlterations)[number]['id'];

/** A definition remains interval-based; this adapter records editable modifiers explicitly. */
export interface ChordRecipe {
  readonly definitionId: string;
  readonly alterations: readonly ChordAlteration[];
}
export function chordRecipe(chord: WesternChord): ChordRecipe {
  return { definitionId: chord.definition.id, alterations: chord.alterations };
}
export function alterChord(
  chord: WesternChord,
  alterations: readonly ChordAlteration[],
): WesternChord {
  const recipe = chordRecipe(chord);
  const base = [...chordDefinitions, ...jazzDefinitions].find(
    (item) => item.id === recipe.definitionId,
  );
  if (!base) throw new RangeError('Unsupported chord definition.');
  const selected = chordAlterations.filter((item) =>
    alterations.includes(item.id),
  );
  if (
    new Set(selected.map((item) => item.interval.diatonicSteps)).size !==
    selected.length
  )
    throw new RangeError('Conflicting alterations.');
  const intervals = [...base.intervals];
  for (const item of selected) {
    const index = intervals.findIndex(
      (value) => value.diatonicSteps === item.interval.diatonicSteps,
    );
    if (index < 0) intervals.push(item.interval);
    else intervals[index] = item.interval;
  }
  intervals.sort((a, b) => a.diatonicSteps - b.diatonicSteps);
  return {
    ...chord,
    alterations: selected.map((item) => item.id),
    definition: {
      ...base,
      suffix:
        base.suffix +
        (selected.length
          ? '(' + selected.map((item) => item.id).join(',') + ')'
          : ''),
      intervals,
    },
  };
}

/** Keyboard coordinates stay in the western adapter, outside generic pitch types. */
export const pianoPitches = [1, 2, 3, 4, 5, 6].flatMap((octave) =>
  letters.flatMap((letter) =>
    (letter === 'E' || letter === 'B' ? [0] : [0, 1]).map((accidental) =>
      spelledPitch({ letter, accidental, octave }),
    ),
  ),
);
