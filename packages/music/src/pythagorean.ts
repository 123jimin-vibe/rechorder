import type { Pitch, Tuning } from './model';

/** Exact musical identity: pure fifths and octaves relative to C4. */
export interface PythagoreanPosition {
  readonly fifths: number;
  readonly octaves: number;
}

export interface PythagoreanPitch extends Pitch<PythagoreanPosition> {
  readonly letter: string;
  readonly accidental: string;
  readonly octave: number;
}

const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const modulo = (value: number, period: number) =>
  ((value % period) + period) % period;

export function pythagoreanPitch(
  position: PythagoreanPosition,
): PythagoreanPitch {
  if (
    !Number.isSafeInteger(position.fifths) ||
    !Number.isSafeInteger(position.octaves)
  )
    throw new RangeError('Pythagorean coordinates must be safe integers.');
  const degree = 4 * position.fifths + 7 * position.octaves;
  const letter = letters[modulo(degree, 7)]!;
  const accidental = Math.floor((position.fifths + 1) / 7);
  const sign = accidental < 0 ? '♭' : '♯';
  const double = accidental < 0 ? '𝄫' : '𝄪';
  const count = Math.abs(accidental);
  // Long fifth chains retain their spelling without allocating unbounded text.
  const suffix =
    count <= 4
      ? sign.repeat(count % 2) + double.repeat(Math.floor(count / 2))
      : `(${sign}×${count})`;
  const octave = 4 + Math.floor(degree / 7);
  return {
    position: { ...position },
    spelling: `${letter}${suffix}${octave}`,
    letter,
    accidental: suffix,
    octave,
  };
}

/** A4 = 440 Hz; C4 lies three pure fifths below A4 and one octave above. */
export const pythagoreanTuning: Tuning<PythagoreanPosition> = {
  id: 'pythagorean-a4-440',
  frequency({ fifths, octaves }) {
    return 440 * 2 ** ((fifths - 3) * Math.log2(3 / 2) + octaves + 1);
  },
};
