import { pythagoreanTuning } from '@rechorder/music';
import type { ResolvedNote } from '@rechorder/music';
import { cellId, type Cell } from './geometry';
import { gridNotation } from './notation';

export interface GridNote extends ResolvedNote {
  readonly letter: string;
  readonly accidental: string;
  readonly octave: number;
  readonly arrow: string;
  readonly count: string;
  readonly description: string;
}

/** Right: 3/2. Down-right: four fifths minus two octaves, or 81/64. */
export function gridNote({ q, r }: Cell): GridNote {
  const position = { fifths: q + 4 * r, octaves: -2 * r };
  const notation = gridNotation(position);
  return {
    key: cellId({ q, r }),
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
