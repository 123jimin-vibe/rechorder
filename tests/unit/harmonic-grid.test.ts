import { describe, expect, it } from 'vitest';
import { pythagoreanPitch, pythagoreanTuning } from '@rechorder/music';
import {
  cellAt,
  cellCenter,
  visibleCells,
} from '../../apps/web/src/harmonic-grid/geometry';
import { GridContacts } from '../../apps/web/src/harmonic-grid/contacts';
import { gridNote } from '../../apps/web/src/harmonic-grid/mapping';
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
