import { describe, expect, it } from 'vitest';
import {
  chordSymbol,
  createChord,
  inferTonality,
  isAuditionable,
  recommendChords,
  roots,
  setToneVoicing,
  voiceChord,
  voiceLeadingDistance,
} from '@rechorder/music';
import type { TonalKey, WesternChord } from '@rechorder/music';
import { chromaticPosition } from '../../packages/music/src/western';
import { relation } from '../../packages/music/src/recommendations/harmony';

const key = (id: string, mode: TonalKey['mode'] = 'major'): TonalKey => ({
  tonic: roots.find((root) => root.id === id)!.pitch,
  mode,
});
const c = createChord;
const names = (chords: readonly { chord: WesternChord }[]) =>
  chords.map((item) => chordSymbol(item.chord));

describe('contextual recommendations', () => {
  it('distinguishes dominant sevenths from major sevenths in directed resolution', () => {
    expect(relation(c('G', 'dominant7'), c('C', 'major'))?.kind).toBe(
      'dominant-resolution',
    );
    expect(relation(c('G', 'major7'), c('C', 'major'))?.kind).not.toBe(
      'dominant-resolution',
    );
    expect(relation(c('D', 'minorMajor7'), c('G', 'dominant7'))?.kind).not.toBe(
      'ii-v',
    );
  });
  it('resolves ii–V toward tonic and supplies concrete voicings', () => {
    const result = recommendChords({
      progression: [c('D', 'minor7'), c('G', 'dominant7')],
      target: { kind: 'insert', index: 2 },
      key: key('C'),
    });
    expect(result.recommendations[0]!.chord.root.spelling).toBe('C4');
    expect(result.recommendations[0]!.reasons).toContainEqual({
      kind: 'dominant-resolution',
      side: 'before',
    });
    expect(
      result.recommendations.every((item) => isAuditionable(item.chord)),
    ).toBe(true);
    expect(
      new Set(result.recommendations.map((item) => item.chord.root.spelling))
        .size,
    ).toBeGreaterThan(1);
  });
  it('uses both neighbors to bridge ii and I with a dominant', () => {
    const result = recommendChords({
      progression: [c('D', 'minor7'), c('C', 'major7')],
      target: { kind: 'insert', index: 1 },
      key: key('C'),
    });
    const best = result.recommendations[0]!;
    expect(best.chord.root.spelling).toBe('G4');
    expect(best.reasons).toContainEqual({ kind: 'ii-v', side: 'before' });
    expect(best.reasons).toContainEqual({
      kind: 'dominant-resolution',
      side: 'after',
    });
  });
  it('admits the raised leading tone of minor and applied dominants outside the key', () => {
    const minor = recommendChords({
      progression: [c('B', 'halfDiminished7'), c('A', 'minor')],
      target: { kind: 'insert', index: 1 },
      key: key('A', 'minor'),
    });
    expect(minor.recommendations[0]!.chord.root.spelling).toBe('E4');
    expect(minor.recommendations[0]!.components.tonality).toBeGreaterThan(0);
    const applied = recommendChords({
      progression: [c('A', 'minor7'), c('G', 'major')],
      target: { kind: 'insert', index: 1 },
      key: key('C'),
    });
    expect(
      applied.recommendations.some(
        (item) =>
          item.chord.root.spelling === 'D4' &&
          item.chord.definition.id === 'dominant7',
      ),
    ).toBe(true);
  });
  it('replaces using surrounding context without recommending the identical harmony', () => {
    const original = [c('D', 'minor7'), c('F♯', 'augmented'), c('C', 'major7')];
    const copy = JSON.stringify(original);
    const result = recommendChords({
      progression: original,
      target: { kind: 'replace', index: 1 },
      key: key('C'),
    });
    expect(result.recommendations[0]!.chord.root.spelling).toBe('G4');
    expect(names(result.recommendations)).not.toContain('F♯aug');
    expect(JSON.stringify(original)).toBe(copy);
  });
  it('keeps the actual bass spelling/register while offering other roots and qualities', () => {
    const candidate = setToneVoicing(c('C', 'major', 'E'), 3, [-1]);
    const bass = voiceChord(candidate)[0]!;
    const result = recommendChords({
      progression: [],
      target: { kind: 'bass', chord: candidate, index: 0 },
      key: key('C'),
    });
    expect(result.recommendations).toHaveLength(4);
    for (const item of result.recommendations)
      expect(voiceChord(item.chord)[0]).toEqual(bass);
    expect(
      result.recommendations.some((item) => item.chord.root.spelling !== 'C4'),
    ).toBe(true);
    expect(
      new Set(result.recommendations.map((item) => item.chord.definition.id))
        .size,
    ).toBeGreaterThan(1);
  });
  it('preserves enharmonic bass spelling and handles the low/high audition boundaries', () => {
    for (const [root, bass, octave] of [
      ['D♭', 'F', -3],
      ['G♭', 'B♭', 1],
    ] as const) {
      const original = c(root, 'major', bass);
      const chord = { ...original, voicing: { ...original.voicing, octave } };
      const result = recommendChords({
        progression: [],
        target: { kind: 'bass', chord, index: 0 },
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      for (const item of result.recommendations) {
        expect(voiceChord(item.chord)[0]).toEqual(voiceChord(chord)[0]);
        expect(isAuditionable(item.chord)).toBe(true);
      }
    }
  });
  it('leaves empty and ambiguous context uncertain and honors explicit modal context', () => {
    expect(inferTonality([]).source).toBe('unknown');
    expect(inferTonality([c('C', 'major')]).confident).toBe(false);
    expect(inferTonality([c('C', 'major'), c('A', 'minor')]).confident).toBe(
      false,
    );
    const explicit = key('D', 'dorian');
    const result = recommendChords({
      progression: [],
      target: { kind: 'insert', index: 0 },
      key: explicit,
    });
    expect(result.context).toMatchObject({
      source: 'explicit',
      hypotheses: [{ key: explicit, weight: 1 }],
    });
    expect(
      result.recommendations.every((item) => item.components.tonality > 0),
    ).toBe(true);
  });
  it('is deterministic, bounded to local context and validates target/limit boundaries', () => {
    const local = [
      c('C', 'major'),
      c('A', 'minor'),
      c('D', 'minor7'),
      c('G', 'dominant7'),
    ];
    const request = {
      progression: local,
      target: { kind: 'insert' as const, index: 4 },
    };
    const result = recommendChords(request);
    expect(recommendChords(request)).toEqual(result);
    expect(
      recommendChords({
        progression: [
          ...Array<WesternChord>(1000).fill(c('F♯', 'major')),
          ...local,
        ],
        target: { kind: 'insert', index: 1004 },
      }),
    ).toEqual(result);
    expect(recommendChords({ ...request, limit: 0 }).recommendations).toEqual(
      [],
    );
    expect(() => recommendChords({ ...request, limit: -1 })).toThrow(
      RangeError,
    );
    expect(() =>
      recommendChords({ ...request, target: { kind: 'replace', index: 4 } }),
    ).toThrow(RangeError);
    expect(() =>
      recommendChords({ ...request, target: { kind: 'insert', index: 1.5 } }),
    ).toThrow(RangeError);
  });
  it('compares sounding registers and accounts for added/dropped voices', () => {
    const pitches = voiceChord(c('C', 'major')).map((pitch) =>
      chromaticPosition(pitch.position),
    );
    expect(voiceLeadingDistance(pitches, pitches)).toBe(0);
    expect(
      voiceLeadingDistance(
        pitches,
        pitches.map((value) => value + 12),
      ),
    ).toBeGreaterThan(
      voiceLeadingDistance(
        pitches,
        pitches.map((value) => value + 1),
      ),
    );
    expect(
      voiceLeadingDistance([48, 60, 64], [48, 60, 64, 67]),
    ).toBeGreaterThan(0);
    expect(voiceLeadingDistance([48, 60, 64], [48, 60, 64, 67])).toBe(
      voiceLeadingDistance([48, 60, 64, 67], [48, 60, 64]),
    );
  });

  it('spells minor leading tones and keeps chromatic alternatives available', () => {
    const result = recommendChords({
      progression: [c('A', 'minor')],
      target: { kind: 'insert', index: 0 },
      key: key('A', 'minor'),
      limit: 24,
    });
    const leading = result.recommendations.find(
      (item) => item.chord.root.spelling === 'G♯4',
    );
    expect(leading).toBeDefined();
    const borrowed = recommendChords({
      progression: [c('C', 'major')],
      target: { kind: 'insert', index: 0 },
      key: key('C'),
      limit: 24,
    });
    expect(
      borrowed.recommendations.some((item) =>
        item.reasons.some((reason) => reason.kind === 'borrowed'),
      ),
    ).toBe(true);
  });

  it('uses an explicit tonic as the first-chord anchor without deriving one from an empty draft', () => {
    const result = recommendChords({
      progression: [],
      target: { kind: 'insert', index: 0 },
      key: key('D', 'dorian'),
    });
    expect(result.recommendations[0]!.chord.root.spelling).toBe('D4');
    const context = inferTonality([
      c('D♯', 'minor7'),
      c('G♯', 'dominant7'),
      c('C♯', 'major'),
    ]);
    expect(context.confident).toBe(true);
    expect(context.hypotheses[0]!.key.tonic.spelling).toBe('C♯4');
  });
});
