import { describe, expect, it } from 'vitest';
import {
  chordDefinitions,
  chordSymbol,
  createChord,
  resolvePitches,
  standardTuning,
  voiceChord,
  alterChord,
  chordRecipe,
  jazzDefinitions,
  pianoPitches,
  roots,
} from '@rechorder/music';
import type { Pitch, Tuning } from '@rechorder/music';

describe('conventional chord adapter', () => {
  it('keeps the full catalogue, including extreme slash basses, inside the displayed piano range', () => {
    const frequencies = resolvePitches(pianoPitches, standardTuning).map(
      (note) => note.frequency,
    );
    const minimum = Math.min(...frequencies),
      maximum = Math.max(...frequencies);
    for (const root of roots)
      for (const definition of [...chordDefinitions, ...jazzDefinitions])
        for (const bass of roots) {
          const notes = resolvePitches(
            voiceChord(createChord(root.id, definition.id, bass.id)),
            standardTuning,
          );
          expect(
            notes.every(
              (note) => note.frequency >= minimum && note.frequency <= maximum,
            ),
          ).toBe(true);
        }
  });
  it('voices a chord-member bass by rearranging tones and preserves outside bass spelling', () => {
    const chord = createChord('C', 'major9', 'E');
    expect(chordSymbol(chord)).toBe('Cmaj9/E');
    expect(voiceChord(chord).map((pitch) => pitch.spelling)).toEqual([
      'E4',
      'G4',
      'B4',
      'C5',
      'D5',
    ]);
    expect(voiceChord(createChord('C♭', 'minor', 'B♯'))[0]?.spelling).toBe(
      'B♯2',
    );
    expect(() => createChord('C', 'major', 'H')).toThrow();
  });
  it('voices jazz extensions and alterations without losing the editable recipe', () => {
    const chord = alterChord(createChord('F♯', 'dominant13', 'E'), [
      '♭9',
      '♯11',
    ]);
    expect(chordSymbol(chord)).toBe('F♯13(♭9,♯11)/E');
    expect(voiceChord(chord).map((pitch) => pitch.spelling)).toEqual([
      'E5',
      'F♯5',
      'G5',
      'A♯5',
      'B♯5',
      'C♯6',
      'D♯6',
    ]);
    expect(chordRecipe(chord)).toEqual({
      definitionId: 'dominant13',
      alterations: ['♭9', '♯11'],
      additions: [],
      omissions: [],
    });
    expect(chordSymbol(alterChord(chord, []))).toBe('F♯13/E');
    expect(() => alterChord(chord, ['♭9', '♯9'])).toThrow();
    expect(voiceChord(createChord('C', 'diminished7')).at(-1)?.spelling).toBe(
      'B♭♭4',
    );
    expect(
      voiceChord(createChord('C', 'halfDiminished7')).at(-1)?.spelling,
    ).toBe('B♭4');
    expect(
      voiceChord(createChord('C', 'sixNine')).map((pitch) => pitch.spelling),
    ).toEqual(['C4', 'E4', 'G4', 'A4', 'D5']);
  });
  it.each([
    ['major', ['C4', 'E4', 'G4']],
    ['minor', ['C4', 'E♭4', 'G4']],
    ['diminished', ['C4', 'E♭4', 'G♭4']],
    ['augmented', ['C4', 'E4', 'G♯4']],
    ['sus2', ['C4', 'D4', 'G4']],
    ['sus4', ['C4', 'F4', 'G4']],
    ['dominant7', ['C4', 'E4', 'G4', 'B♭4']],
    ['major7', ['C4', 'E4', 'G4', 'B4']],
    ['minor7', ['C4', 'E♭4', 'G4', 'B♭4']],
  ])('spells %s in root position', (quality, labels) => {
    expect(
      voiceChord(createChord('C', quality)).map((pitch) => pitch.spelling),
    ).toEqual(labels);
  });

  it('preserves enharmonic identity while resolving equal sounding pitches', () => {
    const sharp = voiceChord(createChord('C♯', 'major'));
    const flat = voiceChord(createChord('D♭', 'major'));
    expect(sharp.map((pitch) => pitch.spelling)).toEqual(['C♯4', 'E♯4', 'G♯4']);
    expect(flat.map((pitch) => pitch.spelling)).toEqual(['D♭4', 'F4', 'A♭4']);
    expect(
      resolvePitches(sharp, standardTuning).map((note) => note.frequency),
    ).toEqual(
      resolvePitches(flat, standardTuning).map((note) => note.frequency),
    );
  });

  it('handles register crossings and double accidentals', () => {
    expect(
      voiceChord(createChord('B♯', 'major')).map((pitch) => pitch.spelling),
    ).toEqual(['B♯4', 'D♯♯5', 'F♯♯5']);
    expect(
      voiceChord(createChord('B', 'minor7')).map((pitch) => pitch.spelling),
    ).toEqual(['B4', 'D5', 'F♯5', 'A5']);
    expect(chordSymbol(createChord('B♭', 'dominant7'))).toBe('B♭7');
  });

  it('uses the specified reference pitch and rejects unsupported catalogue input', () => {
    expect(
      standardTuning.frequency({ letter: 'A', accidental: 0, octave: 4 }),
    ).toBe(440);
    expect(() => createChord('H', 'major')).toThrow();
    expect(() => createChord('C', 'unknown')).toThrow();
    expect(chordDefinitions).toHaveLength(9);
  });
});

describe('tuning-independent resolution', () => {
  it('accepts a non-octave repeating coordinate system', () => {
    const tuning: Tuning<number> = {
      id: '13-divisions-of-3',
      frequency: (step) => 100 * 3 ** (step / 13),
    };
    const pitches: readonly Pitch<number>[] = [
      { position: 0, spelling: 'origin' },
      { position: 13, spelling: 'next period' },
    ];
    expect(
      resolvePitches(pitches, tuning).map((note) => note.frequency),
    ).toEqual([100, 300]);
  });

  it('accepts unequal ratio-based pitches with no conventional notation', () => {
    const tuning: Tuning<{ numerator: number; denominator: number }> = {
      id: 'ratio-set',
      frequency: ({ numerator, denominator }) =>
        (200 * numerator) / denominator,
    };
    const notes = resolvePitches(
      [
        { position: { numerator: 1, denominator: 1 }, spelling: '1/1' },
        { position: { numerator: 7, denominator: 4 }, spelling: '7/4' },
      ],
      tuning,
    );
    expect(notes.map((note) => note.frequency)).toEqual([200, 350]);
  });

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid frequency %s',
    (frequency) => {
      expect(() =>
        resolvePitches([{ position: 0, spelling: 'test' }], {
          id: 'invalid',
          frequency: () => frequency,
        }),
      ).toThrow(RangeError);
    },
  );
});
