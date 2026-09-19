import { pythagoreanPitch } from '@rechorder/music';
import type { PythagoreanPosition } from '@rechorder/music';

// Simple enharmonic representatives for the twelve semitone classes. Naturals
// take precedence; sharp/flat alternatives use the closest fifth-chain member.
const representatives = [
  [0],
  [7, -5],
  [2],
  [9, -3],
  [4],
  [-1],
  [6, -6],
  [1],
  [8, -4],
  [3],
  [10, -2],
  [5],
] as const;

export function gridNotation(position: PythagoreanPosition) {
  const semitones = 7 * position.fifths + 12 * position.octaves;
  const pitchClass = ((semitones % 12) + 12) % 12;
  const choices = representatives[pitchClass]!;
  const fifths = choices.reduce((best, candidate) =>
    Math.abs(position.fifths - candidate) < Math.abs(position.fifths - best)
      ? candidate
      : best,
  );
  const commas = (position.fifths - fifths) / 12;
  // Twelve pure fifths minus seven octaves is exactly one Pythagorean comma.
  const basePosition = { fifths, octaves: position.octaves + 7 * commas };
  const base = pythagoreanPitch(basePosition);
  const arrow = commas > 0 ? '↑' : commas < 0 ? '↓' : '';
  const count = Math.abs(commas) > 1 ? String(Math.abs(commas)) : '';
  const superscript = [...count]
    .map((digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)])
    .join('');
  const label = `${base.letter}${base.accidental}${arrow}${superscript}${base.octave}`;
  const description = commas
    ? `${base.spelling}, ${Math.abs(commas)} Pythagorean comma${Math.abs(commas) === 1 ? '' : 's'} ${commas > 0 ? 'higher' : 'lower'}`
    : base.spelling;
  return { ...base, basePosition, commas, arrow, count, label, description };
}
