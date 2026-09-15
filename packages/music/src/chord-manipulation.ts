import type { Pitch } from './model';
import type { WesternChord, WesternInterval, WesternPosition } from './western';
import {
  alterChord,
  bassPitch,
  chordPitches,
  chromaticPosition,
  createChord,
  rootLabel,
  spelledPitch,
} from './western';

const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const mod = (value: number, period: number) =>
  ((value % period) + period) % period;

export interface ChordTone {
  readonly degree: number;
  readonly label: string;
  readonly pitch: Pitch<WesternPosition>;
}

export function chordTones(chord: WesternChord): readonly ChordTone[] {
  return chordPitches(chord).map((pitch, index) => {
    const value = chord.definition.intervals[index]!;
    const degree = value.diatonicSteps + 1;
    const natural =
      [0, 2, 4, 5, 7, 9, 11][mod(value.diatonicSteps, 7)]! +
      12 * Math.floor(value.diatonicSteps / 7);
    const difference = value.chromaticSteps - natural;
    const accidental =
      difference < 0 ? '♭'.repeat(-difference) : '♯'.repeat(difference);
    return {
      degree,
      label: degree === 1 ? 'Root' : accidental + degree,
      pitch,
    };
  });
}

export function bassRole(
  chord: WesternChord,
  pitch = bassPitch(chord) ?? chord.root,
) {
  const tones = chordTones(chord);
  const member = tones.find(
    (tone) => rootLabel(tone.pitch.position) === rootLabel(pitch.position),
  );
  const equivalent = tones.find(
    (tone) =>
      mod(
        chromaticPosition(tone.pitch.position) -
          chromaticPosition(pitch.position),
        12,
      ) === 0,
  );
  const traditional =
    [1, 3, 5].every((degree) => tones.some((tone) => tone.degree === degree)) &&
    tones.every((tone) => [1, 3, 5, 7].includes(tone.degree));
  const label = !member
    ? equivalent
      ? 'Enharmonic ' + equivalent.label
      : 'Outside chord'
    : member.degree === 1
      ? 'Root position'
      : traditional && member.degree === 3
        ? '1st inversion'
        : traditional && member.degree === 5
          ? '2nd inversion'
          : traditional && member.degree === 7
            ? '3rd inversion'
            : member.label + ' in bass';
  return { member, equivalent, label };
}

function shift(pitch: Pitch<WesternPosition>, octaves: number) {
  if (!Number.isSafeInteger(octaves))
    throw new RangeError('Octave must be an integer.');
  return spelledPitch({
    ...pitch.position,
    octave: pitch.position.octave + octaves,
  });
}

export interface VoicedTone extends ChordTone {
  readonly offsets: readonly number[];
  readonly pitches: readonly Pitch<WesternPosition>[];
  readonly isBass: boolean;
}

/** Degree zero represents an explicit bass outside the spelled chord. */
export function voicedTones(chord: WesternChord): readonly VoicedTone[] {
  const tones = chordTones(chord);
  const bass = bassPitch(chord) ?? chord.root;
  const role = bassRole(chord, bass);
  const member = role.member ?? role.equivalent;
  const bassDegree = member?.degree ?? 0;
  const rootHeight = chromaticPosition(chord.root.position);
  const bassHeight = member
    ? rootHeight + mod(chromaticPosition(bass.position) - rootHeight, 12)
    : rootHeight + mod(chromaticPosition(bass.position) - rootHeight, 12) - 12;
  const base = tones.map((tone) => {
    const height = chromaticPosition(tone.pitch.position);
    const octaves =
      tone.degree === bassDegree
        ? (bassHeight - height) / 12
        : Math.max(0, Math.ceil((bassHeight - height) / 12));
    return {
      ...tone,
      pitch:
        tone.degree === bassDegree
          ? shift(bass, (bassHeight - chromaticPosition(bass.position)) / 12)
          : shift(tone.pitch, octaves),
    };
  });
  if (!member)
    base.push({
      degree: 0,
      label: 'Bass',
      pitch: shift(bass, (bassHeight - chromaticPosition(bass.position)) / 12),
    });
  base.sort(
    (a, b) =>
      chromaticPosition(a.pitch.position) - chromaticPosition(b.pitch.position),
  );
  return base.map((tone, index) => {
    const defaultOffset =
      chord.voicing.kind === 'open' && index > 0 && index % 2 === 0 ? 1 : 0;
    const offsets = chord.voicing.tones.find(
      (item) => item.degree === tone.degree,
    )?.octaves ?? [defaultOffset];
    return {
      ...tone,
      offsets,
      isBass: tone.degree === bassDegree,
      pitches: offsets.map((octave) =>
        shift(tone.pitch, octave + chord.voicing.octave),
      ),
    };
  });
}

export function voiceChord(
  chord: WesternChord,
): readonly Pitch<WesternPosition>[] {
  const tones = voicedTones(chord);
  const pitches = tones
    .flatMap((tone) => tone.pitches)
    .sort(
      (a, b) => chromaticPosition(a.position) - chromaticPosition(b.position),
    );
  const bass = tones.find((tone) => tone.isBass)?.pitches;
  if (
    !pitches.length ||
    !bass?.length ||
    !bass.some(
      (pitch) =>
        chromaticPosition(pitch.position) ===
        chromaticPosition(pitches[0]!.position),
    )
  )
    throw new RangeError(
      'The selected bass must remain the lowest sounding tone.',
    );
  return pitches;
}

/** Bounds belong to this conventional editor, never generic pitch/voicing types. */
export function isAuditionable(chord: WesternChord): boolean {
  try {
    const pitches = voiceChord(chord);
    return (
      pitches.length <= 16 &&
      pitches.every((pitch) => {
        const height = chromaticPosition(pitch.position);
        return height >= 24 && height <= 95;
      })
    );
  } catch {
    return false;
  }
}

export function setToneVoicing(
  chord: WesternChord,
  degree: number,
  octaves: readonly number[],
): WesternChord {
  if (
    !voicedTones(chord).some((tone) => tone.degree === degree) ||
    new Set(octaves).size !== octaves.length ||
    octaves.some((value) => !Number.isSafeInteger(value))
  )
    throw new RangeError('Invalid tone voicing.');
  const next = {
    ...chord,
    voicing: {
      ...chord.voicing,
      tones: [
        ...chord.voicing.tones.filter((tone) => tone.degree !== degree),
        { degree, octaves },
      ],
    },
  };
  voiceChord(next);
  return next;
}

export function setBass(
  chord: WesternChord,
  bass: WesternChord['bass'],
): WesternChord {
  const { bass: _previous, ...rest } = chord;
  const next = {
    ...rest,
    ...(bass ? { bass } : {}),
    voicing: { ...chord.voicing, tones: [] },
  };
  if (
    bass?.kind === 'degree' &&
    !chordTones(next).some((tone) => tone.degree === bass.degree)
  )
    throw new RangeError('Bass degree is absent from the chord.');
  return next;
}

/** Choosing another chord is distinct from transposing the existing harmony. */
export function chooseChord(
  chord: WesternChord,
  root = chord.root,
  definitionId = chord.definition.id,
): WesternChord {
  if (
    rootLabel(root.position) === rootLabel(chord.root.position) &&
    definitionId === chord.definition.id
  )
    return chord;
  const next = {
    ...createChord('C', definitionId),
    root,
    voicing: { ...chord.voicing, tones: [] },
  };
  return next;
}

export function setChordDegree(
  chord: WesternChord,
  degree: number,
  included: boolean,
): WesternChord {
  if (!Number.isInteger(degree) || degree < 2 || degree > 13)
    throw new RangeError('Editable degrees are 2 through 13.');
  const natural =
    createChord('C', chord.definition.id).definition.intervals.some(
      (value) => value.diatonicSteps + 1 === degree,
    ) || chord.alterations.some((id) => Number(id.slice(1)) === degree);
  const additions = chord.additions.filter((value) => value !== degree);
  const omissions = chord.omissions.filter((value) => value !== degree);
  if (included && !natural) additions.push(degree);
  if (!included && natural) omissions.push(degree);
  let next = alterChord(
    {
      ...chord,
      additions: additions.sort((a, b) => a - b),
      omissions: omissions.sort((a, b) => a - b),
      voicing: { ...chord.voicing, tones: [] },
    },
    chord.alterations,
  );
  if (next.bass?.kind === 'degree' && next.bass.degree === degree && !included)
    next = setBass(next, undefined);
  return next;
}

export const transpositionIntervals = [
  { label: 'Semitone', diatonicSteps: 1, chromaticSteps: 1 },
  { label: 'Whole tone', diatonicSteps: 1, chromaticSteps: 2 },
  { label: 'Minor 3rd', diatonicSteps: 2, chromaticSteps: 3 },
  { label: 'Major 3rd', diatonicSteps: 2, chromaticSteps: 4 },
  { label: 'Perfect 4th', diatonicSteps: 3, chromaticSteps: 5 },
  { label: 'Augmented 4th', diatonicSteps: 3, chromaticSteps: 6 },
  { label: 'Perfect 5th', diatonicSteps: 4, chromaticSteps: 7 },
  { label: 'Minor 6th', diatonicSteps: 5, chromaticSteps: 8 },
  { label: 'Major 6th', diatonicSteps: 5, chromaticSteps: 9 },
  { label: 'Minor 7th', diatonicSteps: 6, chromaticSteps: 10 },
  { label: 'Major 7th', diatonicSteps: 6, chromaticSteps: 11 },
  { label: 'Octave', diatonicSteps: 7, chromaticSteps: 12 },
] as const;

export function transposePitch(
  pitch: Pitch<WesternPosition>,
  interval: WesternInterval,
): Pitch<WesternPosition> {
  if (
    !Number.isSafeInteger(interval.diatonicSteps) ||
    !Number.isSafeInteger(interval.chromaticSteps)
  )
    throw new RangeError('Conventional transposition requires integer steps.');
  const index = letters.indexOf(pitch.position.letter) + interval.diatonicSteps;
  const position = {
    letter: letters[mod(index, 7)]!,
    accidental: 0,
    octave: pitch.position.octave + Math.floor(index / 7),
  };
  return spelledPitch({
    ...position,
    accidental:
      chromaticPosition(pitch.position) +
      interval.chromaticSteps -
      chromaticPosition(position),
  });
}

export function transposeChord(
  chord: WesternChord,
  interval: WesternInterval,
): WesternChord {
  return {
    ...chord,
    root: transposePitch(chord.root, interval),
    ...(chord.bass?.kind === 'pitch'
      ? {
          bass: {
            kind: 'pitch' as const,
            pitch: transposePitch(chord.bass.pitch, interval),
          },
        }
      : {}),
  };
}

export function enharmonicSpellings(
  pitch: Pitch<WesternPosition>,
): readonly Pitch<WesternPosition>[] {
  const height = chromaticPosition(pitch.position);
  return letters.flatMap((letter) =>
    [-2, -1, 0, 1, 2].flatMap((accidental) => {
      const reference = { letter, accidental, octave: pitch.position.octave };
      const difference = height - chromaticPosition(reference);
      return difference % 12 === 0
        ? [
            spelledPitch({
              ...reference,
              octave: reference.octave + difference / 12,
            }),
          ]
        : [];
    }),
  );
}

export function respellChord(
  chord: WesternChord,
  root: Pitch<WesternPosition>,
): WesternChord {
  if (
    chromaticPosition(root.position) !== chromaticPosition(chord.root.position)
  )
    throw new RangeError('Respelling must preserve pitch.');
  return { ...chord, root };
}
