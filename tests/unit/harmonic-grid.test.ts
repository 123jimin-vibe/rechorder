import { describe, expect, it } from 'vitest';
import { pythagoreanPitch, pythagoreanTuning } from '@rechorder/music';
import {
  cellAt,
  cellCenter,
  visibleCells,
} from '../../apps/web/src/harmonic-grid/geometry';
import { GridContacts } from '../../apps/web/src/harmonic-grid/contacts';
import {
  gridNote,
  gridPosition,
  pitchId,
  positionNote,
} from '../../apps/web/src/harmonic-grid/mapping';
import {
  chordCompletions,
  chordMovement,
  chordProfile,
  exploreAdditions,
  invertChord,
  keyMembers,
  shiftOctave,
} from '../../apps/web/src/harmonic-grid/harmony';
import { gridNotation } from '../../apps/web/src/harmonic-grid/notation';

describe('Pythagorean pitch identity', () => {
  it('anchors A4 at 440 Hz and gives the grid exact fifth and third ratios', () => {
    expect(pythagoreanTuning.frequency({ fifths: 3, octaves: -1 })).toBe(440);
    const root = gridNote({ q: 0, r: 0 });
    const fifth = gridNote({ q: 1, r: 0 });
    const third = gridNote({ q: 0, r: 1 });
    expect([root.label, third.label, fifth.label]).toEqual(['C4', 'E4', 'G4']);
    expect(fifth.frequency / root.frequency).toBeCloseTo(3 / 2, 12);
    expect(third.frequency / root.frequency).toBeCloseTo(81 / 64, 12);
  });

  it('preserves enharmonic differences by the Pythagorean comma', () => {
    const sharp = pythagoreanPitch({ fifths: 7, octaves: -4 });
    const flat = pythagoreanPitch({ fifths: -5, octaves: 3 });
    expect(sharp.spelling).toBe('C♯4');
    expect(flat.spelling).toBe('D♭4');
    expect(
      pythagoreanTuning.frequency(sharp.position) /
        pythagoreanTuning.frequency(flat.position),
    ).toBeCloseTo(531441 / 524288, 12);
  });
});

describe('compact exact comma notation', () => {
  it('respells long names and handles octave crossings without changing pitches', () => {
    expect(gridNotation({ fifths: 12, octaves: -6 }).label).toBe('C↑5');
    expect(gridNotation({ fifths: -7, octaves: 4 }).label).toBe('B↓3');
    expect(gridNotation({ fifths: -8, octaves: 5 }).label).toBe('E↓4');
    expect(gridNotation({ fifths: 18, octaves: -10 }).label).toBe('F♯↑4');
    expect(gridNotation({ fifths: 36, octaves: -21 }).label).toBe('C↑³4');
    expect(gridNotation({ fifths: 7, octaves: -4 }).label).toBe('C♯4');
    expect(gridNotation({ fifths: -5, octaves: 3 }).label).toBe('D♭4');
  });

  it('reconstructs distant positive and negative fifth chains from the displayed note and exact commas', () => {
    const comma = 531441 / 524288;
    for (let fifths = -240; fifths <= 240; fifths++) {
      const position = {
        fifths,
        octaves: -Math.round(fifths * Math.log2(1.5)),
      };
      const notation = gridNotation(position);
      expect(notation.accidental.length).toBeLessThanOrEqual(1);
      expect(Number.isInteger(notation.commas)).toBe(true);
      const reconstructed =
        pythagoreanTuning.frequency(notation.basePosition) *
        comma ** notation.commas;
      expect(reconstructed).toBeCloseTo(
        pythagoreanTuning.frequency(position),
        8,
      );
    }
  });
});

describe('unbounded hex navigation', () => {
  it('hits the correct cell in every direction and keeps the render count bounded', () => {
    for (const q of [-10000, -1, 0, 1, 10000])
      for (const r of [-10000, -1, 0, 1, 10000]) {
        const center = cellCenter({ q, r });
        expect(cellAt(center)).toEqual({ q, r });
        expect(cellAt({ x: center.x + 15, y: center.y - 10 })).toEqual({
          q,
          r,
        });
        const cells = visibleCells(390, 844, { x: -center.x, y: -center.y });
        expect(cells).toContainEqual({ q, r });
        expect(cells.length).toBeLessThan(170);
      }
  });

  it('pauses panning during a chord and resumes from the remaining contact without a jump', () => {
    const contacts = new GridContacts();
    contacts.start(1, { q: 0, r: 0 }, { x: 0, y: 0 });
    expect(contacts.move(1, { x: 10, y: 0 })).toEqual({ x: 10, y: 0 });
    contacts.start(2, { q: 1, r: 0 }, { x: 100, y: 0 });
    expect(contacts.move(2, { x: 120, y: 25 })).toEqual({ x: 0, y: 0 });
    expect(contacts.move(1, { x: 50, y: 10 })).toEqual({ x: 0, y: 0 });
    expect(contacts.active.get(1)?.cell).toEqual({ q: 0, r: 0 });
    expect(contacts.active.get(2)?.cell).toEqual({ q: 1, r: 0 });
    contacts.end(2);
    expect(contacts.move(1, { x: 55, y: 15 })).toEqual({ x: 5, y: 5 });
    contacts.clear();
    expect(contacts.move(1, { x: 99, y: 99 })).toEqual({ x: 0, y: 0 });
    expect(contacts.active.size).toBe(0);
  });
});

describe('chord design musical identity', () => {
  const c = { fifths: 0, octaves: 0 };
  const e = { fifths: 4, octaves: -2 };
  const g = { fifths: 1, octaves: 0 };
  const chord = [c, e, g];
  const labels = (notes: readonly (typeof c)[]) =>
    notes.map((note) => positionNote(note).label);

  it('offers additions and measurements even when a five-class selection has no name', () => {
    const unnamed = [-2, -1, 0, 1, 2].map((fifths) => ({ fifths, octaves: 0 }));
    expect(chordCompletions(unnamed)).toEqual([]);
    const ideas = exploreAdditions(unnamed);
    expect(ideas.map((item) => item.kind)).toEqual(['blend', 'edge', 'wider']);
    expect(new Set(ideas.map((item) => pitchId(item.note))).size).toBe(3);
    expect(ideas.every((item) => item.profile.spanCents > 0)).toBe(true);
    expect(chordProfile(unnamed).roughness).toBeGreaterThan(0);
    expect(chordMovement(unnamed, unnamed)).toBe(0);
    expect(
      chordMovement(unnamed, [...unnamed, ideas[0]!.note]),
    ).toBeGreaterThan(0);
  });

  it('offers completions of the entire selection and keeps comma variants separate', () => {
    const matches = chordCompletions([c, e]);
    expect(matches.find((match) => match.label === 'C')?.fifths).toEqual([
      0, 4, 1,
    ]);
    expect(matches.find((match) => match.label === 'Am')?.fifths).toEqual([
      3, 0, 4,
    ]);
    expect(
      matches.every(
        (match) => match.fifths.includes(0) && match.fifths.includes(4),
      ),
    ).toBe(true);
    expect(chordCompletions([c, { fifths: 16, octaves: -9 }])).toEqual([]);
    expect(chordCompletions([...chord, { fifths: 12, octaves: -7 }])).toEqual(
      [],
    );
    expect(
      chordCompletions([c, { ...c, octaves: 1 }, e]).some(
        (match) => match.label === 'C',
      ),
    ).toBe(true);
    expect(keyMembers(0, 'major')).toContain(4);
    expect(keyMembers(0, 'major')).not.toContain(16);
    expect(keyMembers(null, 'minor')).toEqual([]);
  });

  it('maps alternative axes exactly and reaches every nearby fifth/octave coordinate', () => {
    expect(
      gridNote({ q: 1, r: 0 }, 'steps').frequency /
        gridNote({ q: 0, r: 0 }).frequency,
    ).toBeCloseTo(9 / 8, 12);
    expect(
      gridNote({ q: 0, r: 1 }, 'steps').frequency /
        gridNote({ q: 0, r: 0 }).frequency,
    ).toBeCloseTo(4 / 3, 12);
    for (let fifths = -12; fifths <= 12; fifths++) {
      for (let octaves = -5; octaves <= 5; octaves++) {
        expect(
          gridPosition(
            { q: fifths + octaves, r: fifths + 2 * octaves },
            'steps',
          ),
        ).toEqual({ fifths, octaves });
        expect(gridPosition({ q: fifths, r: octaves }, 'octaves')).toEqual({
          fifths,
          octaves,
        });
      }
    }
    expect(gridNote({ q: 0, r: 0 }, 'thirds', 1).label).toBe('C5');
    expect(gridNote({ q: 0, r: 0 }, 'thirds', -1).label).toBe('C3');
  });

  it('transposes exact pitches and preserves bass on upper-voice inversions', () => {
    expect(labels(shiftOctave(chord, 1)!)).toEqual(['C5', 'E5', 'G5']);
    expect(labels(shiftOctave(chord, -1, pitchId(e))!)).toEqual([
      'C4',
      'E3',
      'G4',
    ]);
    expect(labels(invertChord(chord, 1, false)!)).toEqual(['E4', 'G4', 'C5']);
    expect(labels(invertChord(chord, -1, false)!)).toEqual(['G3', 'C4', 'E4']);
    expect(labels(invertChord(chord, 1, true)!)).toEqual(['C4', 'G4', 'E5']);
    expect(invertChord(chord, -1, true)).toBeNull();
    expect(invertChord([c], 1, false)).toBeNull();
    expect(shiftOctave(chord, 10)).toBeNull();
    expect(shiftOctave([c, { ...c, octaves: 1 }], 1, pitchId(c))).toBeNull();
    expect(labels(chord)).toEqual(['C4', 'E4', 'G4']);
  });
});
