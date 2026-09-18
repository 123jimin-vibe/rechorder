import type { ChordAlteration, WesternChord, WesternPosition } from './western';
import { alterChord, createChord, spelledPitch } from './western';
import { setBass } from './chord-manipulation';

/**
 * Plain shape of a conventional chord at storage and transfer boundaries: the
 * recipe (catalogue ID plus explicit modifiers) rather than the derived
 * definition, so stored data stays small and follows catalogue corrections.
 * Callers validate untrusted input against this shape before `chordFromData`.
 */
export interface WesternChordData {
  readonly root: WesternPosition;
  readonly bass?:
    | { readonly kind: 'degree'; readonly degree: number }
    | { readonly kind: 'pitch'; readonly pitch: WesternPosition };
  readonly definition: string;
  readonly alterations: readonly ChordAlteration[];
  readonly additions: readonly number[];
  readonly omissions: readonly number[];
  readonly voicing: WesternChord['voicing'];
}

export function chordData(chord: WesternChord): WesternChordData {
  const bass: WesternChordData['bass'] =
    chord.bass?.kind === 'pitch'
      ? { kind: 'pitch', pitch: chord.bass.pitch.position }
      : chord.bass;
  return {
    root: chord.root.position,
    ...(bass ? { bass } : {}),
    definition: chord.definition.id,
    alterations: chord.alterations,
    additions: chord.additions,
    omissions: chord.omissions,
    voicing: chord.voicing,
  };
}

/** Rebuilds the derived definition from the recipe; throws on unknown or inconsistent data. */
export function chordFromData(data: WesternChordData): WesternChord {
  if (
    [...data.additions, ...data.omissions].some(
      (degree) => !Number.isInteger(degree) || degree < 2 || degree > 13,
    )
  )
    throw new RangeError('Editable degrees are 2 through 13.');
  const chord = alterChord(
    {
      ...createChord('C', data.definition),
      root: spelledPitch(data.root),
      additions: data.additions,
      omissions: data.omissions,
    },
    data.alterations,
  );
  const bass: WesternChord['bass'] =
    data.bass?.kind === 'pitch'
      ? { kind: 'pitch', pitch: spelledPitch(data.bass.pitch) }
      : data.bass;
  return { ...(bass ? setBass(chord, bass) : chord), voicing: data.voicing };
}
