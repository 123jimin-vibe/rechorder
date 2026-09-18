import { type } from 'arktype';
import {
  chordData,
  chordFromData,
  isAuditionable,
  spelledPitch,
  tonalModes,
} from '@rechorder/music';
import type {
  ProgressionEntry,
  TonalKey,
  TonalMode,
  WesternChord,
} from '@rechorder/music';
import { tempoLimits } from '../audio/audition';
import type { DocumentSections } from '../persistence/stored-document';

/** Durable page state; candidate, selection and playback stay in memory (s0002). */
export interface ProgressionDocument {
  readonly progression: readonly ProgressionEntry<WesternChord>[];
  readonly tempo: number;
  readonly key: TonalKey | undefined;
}

export const progressionDocumentKey = 'rechorder.chord-progression';

const position = type({
  letter: "'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'",
  accidental: 'number.integer',
  octave: 'number.integer',
});

const integers = type('number.integer[]').readonly();

/** Mirrors `WesternChordData`; the `chordFromData` call below keeps the two in step. */
const chord = type({
  root: position,
  'bass?': type({ kind: "'degree'", degree: 'number.integer' }).or({
    kind: "'pitch'",
    pitch: position,
  }),
  definition: 'string',
  alterations: type
    .enumerated('♭5', '♯5', '♭9', '♯9', '♯11', '♭13')
    .array()
    .readonly(),
  additions: integers,
  omissions: integers,
  voicing: {
    kind: "'close' | 'open'",
    octave: 'number.integer',
    tones: type({ degree: 'number.integer', octaves: integers })
      .array()
      .readonly(),
  },
});

const progression = type({ id: 'string > 0', chord }).array();

const tempo = type.number.atLeast(tempoLimits.min).atMost(tempoLimits.max);

const tonalKey = type({
  tonic: position,
  mode: type.enumerated(...(Object.keys(tonalModes) as TonalMode[])),
}).or('null');

export const progressionDocument: DocumentSections<ProgressionDocument> = {
  progression: {
    encode: (entries) =>
      entries.map((entry) => ({ id: entry.id, chord: chordData(entry.value) })),
    decode(data) {
      const parsed = progression(data);
      if (parsed instanceof type.errors) return undefined;
      try {
        const entries = parsed.map((entry) => ({
          id: entry.id,
          value: chordFromData(entry.chord),
        }));
        const unique = new Set(entries.map((entry) => entry.id));
        return unique.size === entries.length &&
          entries.every((entry) => isAuditionable(entry.value))
          ? entries
          : undefined;
      } catch {
        return undefined;
      }
    },
  },
  tempo: {
    encode: (bpm) => bpm,
    decode(data) {
      const parsed = tempo(data);
      return parsed instanceof type.errors ? undefined : parsed;
    },
  },
  key: {
    encode: (key) =>
      key ? { tonic: key.tonic.position, mode: key.mode } : null,
    decode(data) {
      const parsed = tonalKey(data);
      return parsed instanceof type.errors || parsed === null
        ? undefined
        : { tonic: spelledPitch(parsed.tonic), mode: parsed.mode };
    },
  },
};
