import { pythagoreanTuning } from '@rechorder/music';
import type { PythagoreanPosition, ResolvedNote } from '@rechorder/music';
import type { Cell } from './geometry';
import { gridNotation } from './notation';

export interface GridNote extends ResolvedNote {
  readonly position: PythagoreanPosition;
  readonly letter: string;
  readonly accidental: string;
  readonly octave: number;
  readonly arrow: string;
  readonly count: string;
  readonly description: string;
}

export const layouts = {
  thirds: {
    name: 'Fifth + third',
    right: '5th',
    diagonal: 'major 3rd',
    q: [1, 0],
    r: [4, -2],
  },
  steps: {
    name: 'Whole tone + fourth',
    right: 'whole tone',
    diagonal: '4th',
    q: [2, -1],
    r: [-1, 1],
  },
  octaves: {
    name: 'Fifth + octave',
    right: '5th',
    diagonal: 'octave',
    q: [1, 0],
    r: [0, 1],
  },
} as const;
export type GridLayout = keyof typeof layouts;

export function pitchId(position: PythagoreanPosition): string {
  return `${position.fifths}:${position.octaves}`;
}

export function gridPosition(
  { q, r }: Cell,
  layout: GridLayout = 'thirds',
  octave = 0,
): PythagoreanPosition {
  const axes = layouts[layout];
  return {
    fifths: q * axes.q[0] + r * axes.r[0],
    octaves: q * axes.q[1] + r * axes.r[1] + octave,
  };
}

export function gridNote(
  cell: Cell,
  layout: GridLayout = 'thirds',
  octave = 0,
): GridNote {
  return positionNote(gridPosition(cell, layout, octave));
}

export function positionNote(position: PythagoreanPosition): GridNote {
  const notation = gridNotation(position);
  return {
    key: pitchId(position),
    position,
    label: notation.label,
    frequency: pythagoreanTuning.frequency(position),
    letter: notation.letter,
    accidental: notation.accidental,
    octave: notation.octave,
    arrow: notation.arrow,
    count: notation.count,
    description: notation.description,
  };
}

/** View bounds for this instrument, never a restriction on pitch identity. */
export function isPlayable(note: ResolvedNote): boolean {
  return note.frequency >= 20 && note.frequency <= 16000;
}
