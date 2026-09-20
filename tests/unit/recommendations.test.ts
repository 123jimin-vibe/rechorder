import { describe, expect, it } from 'vitest';
import {
  chordRole,
  chordData,
  chordFromData,
  chordSymbol,
  createChord,
  diatonicChord,
  inferTonality,
  isAuditionable,
  motion,
  recommendChords as scoreChords,
  measureSonority,
  voiceMotion,
  roots,
  setToneVoicing,
  voiceChord,
  voiceLeadingDistance,
} from '@rechorder/music';
import type {
  RecommendationRequest,
  TonalKey,
  WesternChord,
} from '@rechorder/music';
import { chromaticPosition } from '../../packages/music/src/western';

const key = (id: string, mode: TonalKey['mode'] = 'major'): TonalKey => ({
  tonic: roots.find((root) => root.id === id)!.pitch,
  mode,
});
const c = createChord;
const recommendChords = (request: RecommendationRequest) =>
  scoreChords({ ...request, lens: 'tonal' });
const names = (chords: readonly { chord: WesternChord }[]) =>
  chords.map((item) => chordSymbol(item.chord));

describe('contextual recommendations', () => {
  it('measures arbitrary sounding collections and distinguishes register and transition', () => {
    expect(measureSonority([])).toEqual({ roughness: 0, spanCents: 0 });
    const low = measureSonority([220, 275, 330, 440, 466]);
    const high = measureSonority([440, 550, 660, 880, 932]);
    expect(low.spanCents).toBeCloseTo(high.spanCents);
    expect(low.roughness).not.toBeCloseTo(high.roughness);
    expect(voiceMotion([220, 330], [220, 330])).toBe(0);
    expect(voiceMotion([220, 330], [230, 350])).toBeLessThan(
      voiceMotion([220, 330], [440, 660]),
    );
  });
  it('offers distinct acoustic and tonal lenses without a named-chord goodness claim', () => {
    const request = {
      progression: [c('C', 'major'), c('G', 'major')],
      target: { kind: 'insert' as const, index: 2 },
      key: key('C'),
    };
    const varied = scoreChords(request);
    expect(varied.recommendations.map((item) => item.basis)).toEqual([
      'blend',
      'contrast',
      'voices',
      'tonal',
    ]);
    expect(varied.recommendations.every((item) => item.score === 0)).toBe(true);
    expect(
      varied.recommendations.every((item) => item.assessment !== undefined),
    ).toBe(true);
    expect(
      new Set(varied.recommendations.map((item) => item.chord.root.spelling))
        .size,
    ).toBe(4);
    const blended = scoreChords({ ...request, lens: 'blend' });
    const contrasted = scoreChords({ ...request, lens: 'contrast' });
    expect(
      contrasted.recommendations[0]!.assessment!.roughnessChange,
    ).toBeGreaterThan(blended.recommendations[0]!.assessment!.roughnessChange!);
    for (const result of [blended, contrasted]) {
      const scores = result.recommendations.map((item) => item.score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
      for (const item of result.recommendations)
        expect(item.score).toBeCloseTo(
          Object.values(item.components).reduce((a, b) => a + b, 0),
        );
    }
    const generated = scoreChords({
      progression: [],
      target: { kind: 'insert', index: 0 },
      lens: 'contrast',
      limit: 24,
    });
    const edited = generated.recommendations.find(
      (item) => item.chord.additions.length || item.chord.omissions.length,
    )?.chord;
    expect(edited).toBeDefined();
    expect(chordFromData(chordData(edited!))).toEqual(edited);
    expect(
      recommendChords(request).recommendations[0]!.chord.root.spelling,
    ).toBe('C4');
  });
  it('distinguishes dominant sevenths and ii–V from plain fifth motion', () => {
    expect(motion(c('G', 'dominant7'), c('C', 'major')).move).toBe('dominant');
    expect(motion(c('G', 'major7'), c('C', 'major')).move).toBe('fifth-down');
    expect(motion(c('D', 'minor7'), c('G', 'dominant7')).move).toBe('ii-v');
    expect(motion(c('D', 'minorMajor7'), c('G', 'dominant7')).move).not.toBe(
      'ii-v',
    );
    expect(motion(c('B', 'diminished'), c('C', 'major')).move).toBe(
      'leading-tone',
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
      kind: 'motion',
      move: 'dominant',
      side: 'before',
    });
    expect(result.recommendations[0]!.reasons).toContainEqual({
      kind: 'role',
      numeral: 'IΔ7',
      function: 'tonic',
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
    expect(best.reasons).toContainEqual({
      kind: 'motion',
      move: 'ii-v',
      side: 'before',
    });
    expect(best.reasons).toContainEqual({
      kind: 'motion',
      move: 'dominant',
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
    expect(minor.recommendations[0]!.components.role).toBeGreaterThan(0);
    const applied = recommendChords({
      progression: [c('A', 'minor7'), c('G', 'major')],
      target: { kind: 'insert', index: 1 },
      key: key('C'),
    });
    const secondary = applied.recommendations.find(
      (item) =>
        item.chord.root.spelling === 'D4' &&
        item.chord.definition.id === 'dominant7',
    );
    expect(secondary?.reasons).toContainEqual({
      kind: 'role',
      numeral: 'V7/V',
      function: 'applied',
    });
  });
  it('continues a descending bass line with the next step rather than stalling', () => {
    const result = recommendChords({
      progression: [c('C', 'major'), c('E', 'minor', 'B')],
      target: { kind: 'insert', index: 2 },
      key: key('C'),
    });
    const symbols = names(result.recommendations);
    expect(symbols[0]).toBe('Am');
    expect(symbols).toContain('F/A');
    for (const item of result.recommendations)
      expect(voiceChord(item.chord)[0]!.position.letter).not.toBe('B');
    expect(result.recommendations[0]!.reasons).toContainEqual({
      kind: 'bass-line',
    });
    const continued = recommendChords({
      progression: [c('C', 'major'), c('E', 'minor', 'B'), c('A', 'minor')],
      target: { kind: 'insert', index: 3 },
      key: key('C'),
    });
    expect(names(continued.recommendations)[0]).toBe('C/G');
  });
  it('keeps roots in the bass when no bass line is in progress', () => {
    const result = recommendChords({
      progression: [c('C', 'major')],
      target: { kind: 'insert', index: 1 },
      key: key('C'),
      limit: 8,
    });
    for (const item of result.recommendations)
      expect(voiceChord(item.chord)[0]!.position.letter).toBe(
        item.chord.root.position.letter,
      );
    expect(names(result.recommendations)).not.toContain('C');
  });
  it('narrows to a requested move or to color harmony', () => {
    const progression = [c('C', 'major'), c('E', 'minor', 'B')];
    const iiV = recommendChords({
      progression,
      target: { kind: 'insert', index: 2 },
      key: key('C'),
      focus: 'ii-v',
    });
    expect(iiV.recommendations.length).toBeGreaterThan(0);
    for (const item of iiV.recommendations) {
      expect(item.chord.root.spelling).toBe('A4');
      expect(item.reasons).toContainEqual({
        kind: 'motion',
        move: 'ii-v',
        side: 'before',
      });
    }
    const color = recommendChords({
      progression,
      target: { kind: 'insert', index: 2 },
      key: key('C'),
      focus: 'color',
    });
    expect(color.recommendations.length).toBeGreaterThan(0);
    for (const item of color.recommendations)
      expect(
        item.reasons.some(
          (reason) =>
            reason.kind === 'role' &&
            (reason.function === 'applied' || reason.function === 'borrowed'),
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
      result.recommendations.every((item) => item.components.role > 0),
    ).toBe(true);
  });
  it('does not mistake an inverted mediant for a new tonic', () => {
    const context = inferTonality([c('C', 'major'), c('E', 'minor', 'B')]);
    expect(context.hypotheses[0]!.key).toMatchObject({ mode: 'major' });
    expect(context.hypotheses[0]!.key.tonic.spelling).toBe('C4');
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
        item.reasons.some(
          (reason) => reason.kind === 'role' && reason.function === 'borrowed',
        ),
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
  it('removes duplicate sounds unless their functional interpretation differs', () => {
    const result = recommendChords({
      progression: [c('A', 'minor7'), c('G', 'major')],
      target: { kind: 'insert', index: 1 },
      key: key('C'),
      limit: 24,
    });
    const interpretationsBySound = new Map<string, Set<string>>();
    for (const item of result.recommendations) {
      const sound = voiceChord(item.chord)
        .map((pitch) => chromaticPosition(pitch.position))
        .sort((a, b) => a - b)
        .join(',');
      const interpretation = item.reasons
        .flatMap((reason) =>
          reason.kind === 'motion'
            ? `${reason.move}:${reason.side}`
            : reason.kind === 'role' &&
                (reason.function === 'applied' ||
                  reason.function === 'borrowed')
              ? reason.numeral
              : [],
        )
        .sort()
        .join(',');
      const existing = interpretationsBySound.get(sound);
      expect(existing?.has(interpretation) ?? false).toBe(false);
      if (existing) existing.add(interpretation);
      else interpretationsBySound.set(sound, new Set([interpretation]));
    }
  });
  it('treats stepwise root motion as roots, not as a bass line to continue', () => {
    const key_ = key('C');
    const next = recommendChords({
      progression: [c('C', 'major'), c('G', 'major'), c('A', 'minor')],
      target: { kind: 'insert', index: 3 },
      key: key_,
    });
    for (const item of next.recommendations)
      expect(voiceChord(item.chord)[0]!.position.letter).toBe(
        item.chord.root.position.letter,
      );
    expect(names(next.recommendations)[0]).toBe('C');
    const cadence = recommendChords({
      progression: [c('F', 'major'), c('G', 'major')],
      target: { kind: 'insert', index: 2 },
      key: key_,
    });
    expect(names(cadence.recommendations)[0]).toBe('C');
    const replaced = recommendChords({
      progression: [
        c('C', 'major'),
        c('G', 'major'),
        c('A', 'minor'),
        c('E', 'minor'),
      ],
      target: { kind: 'replace', index: 3 },
      key: key_,
    });
    expect(names(replaced.recommendations)).toContain('C');
    expect(names(replaced.recommendations)).not.toContain('Cmaj7/B');
  });
  it('lists in score order with the diversity penalty accounted in the score', () => {
    const result = recommendChords({
      progression: [
        c('C', 'major'),
        c('G', 'major'),
        c('A', 'minor'),
        c('E', 'minor'),
      ],
      target: { kind: 'replace', index: 3 },
      key: key('C'),
      limit: 8,
    });
    const scores = result.recommendations.map((item) => item.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    for (const item of result.recommendations) {
      const sum = Object.values(item.components).reduce((a, b) => a + b, 0);
      expect(item.score).toBeCloseTo(sum, 6);
    }
    expect(result.recommendations[0]!.components.variety).toBe(0);
    expect(
      result.recommendations
        .slice(1)
        .some((item) => item.components.variety < 0),
    ).toBe(true);
  });
  it('keeps the plain tonic triad available after a dominant seventh', () => {
    const major = recommendChords({
      progression: [c('G', 'dominant7')],
      target: { kind: 'insert', index: 1 },
    });
    expect(names(major.recommendations)).toContain('C');
    const minor = recommendChords({
      progression: [c('E', 'dominant7')],
      target: { kind: 'insert', index: 1 },
      key: key('A', 'minor'),
    });
    expect(names(minor.recommendations)).toContain('Am');
  });
  it('does not penalize returning to the tonic after two chords', () => {
    const loop = recommendChords({
      progression: [
        c('A', 'minor'),
        c('F', 'major'),
        c('C', 'major'),
        c('G', 'major'),
      ],
      target: { kind: 'insert', index: 4 },
    });
    expect(names(loop.recommendations)[0]).toBe('C');
    const plagal = recommendChords({
      progression: [c('C', 'major'), c('F', 'major')],
      target: { kind: 'insert', index: 2 },
      key: key('C'),
    });
    expect(names(plagal.recommendations)).toContain('C');
    const oscillation = recommendChords({
      progression: [c('C', 'major'), c('D', 'minor'), c('G', 'major')],
      target: { kind: 'insert', index: 3 },
      key: key('C'),
      limit: 24,
    });
    expect(
      oscillation.recommendations.find(
        (item) => item.chord.root.spelling === 'D4',
      )!.components.complexity,
    ).toBeLessThan(0);
  });
  it('ranks a focused list by score and prefers the diatonic quality', () => {
    const result = recommendChords({
      progression: [c('C', 'major'), c('G', 'major'), c('A', 'minor')],
      target: { kind: 'insert', index: 3 },
      key: key('C'),
      focus: 'fifth-up',
    });
    expect(names(result.recommendations)[0]).toBe('Em');
    expect(
      result.recommendations.every((item) => item.components.variety === 0),
    ).toBe(true);
  });
  it('spells leading-tone chords on the raised degree', () => {
    const result = recommendChords({
      progression: [c('C', 'major')],
      target: { kind: 'insert', index: 1 },
      key: key('C'),
      focus: 'color',
      limit: 8,
    });
    expect(names(result.recommendations)).toContain('C♯dim');
    expect(names(result.recommendations)).not.toContain('D♭dim');
  });
});

describe('key-relative roles and chords', () => {
  it('labels diatonic, applied, borrowed and chromatic harmony', () => {
    const major = key('C');
    expect(chordRole(c('G', 'dominant7'), major)).toMatchObject({
      numeral: 'V7',
      function: 'dominant',
    });
    expect(chordRole(c('A', 'minor'), major).numeral).toBe('vi');
    expect(chordRole(c('B', 'diminished'), major).numeral).toBe('vii°');
    expect(chordRole(c('D', 'dominant7'), major)).toMatchObject({
      numeral: 'V7/V',
      function: 'applied',
    });
    expect(chordRole(c('C', 'dominant7'), major).numeral).toBe('V7/IV');
    expect(chordRole(c('B♭', 'major'), major)).toMatchObject({
      numeral: '♭VII',
      function: 'borrowed',
    });
    expect(chordRole(c('F', 'minor'), major).numeral).toBe('iv');
    expect(chordRole(c('D♭', 'dominant7'), major).function).toBe('chromatic');
    expect(chordRole(c('F♯', 'major'), major).prior).toBe(0);
    const minor = key('A', 'minor');
    expect(chordRole(c('E', 'major'), minor)).toMatchObject({
      numeral: 'V',
      prior: 0.95,
    });
    expect(chordRole(c('G♯', 'diminished'), minor).numeral).toBe('vii°');
    expect(chordRole(c('F', 'major'), minor).numeral).toBe('VI');
    expect(chordRole(c('E', 'augmented'), minor).function).toBe('chromatic');
    expect(chordRole(c('C', 'major'), major).prior).toBeGreaterThan(
      chordRole(c('E', 'minor'), major).prior,
    );
    // Diatonic iii outranks the applied dominant on the same root; colour variants
    // rank below the plain degree.
    expect(chordRole(c('E', 'minor'), major).prior).toBeGreaterThan(
      chordRole(c('E', 'major'), major).prior,
    );
    expect(chordRole(c('C', 'add9'), major).prior).toBeLessThan(
      chordRole(c('C', 'major7'), major).prior,
    );
    expect(chordRole(c('C', 'sus4'), major).prior).toBeLessThan(
      chordRole(c('C', 'add9'), major).prior,
    );
  });
  it('builds diatonic triads and sevenths with the minor leading tone', () => {
    const names = (mode: TonalKey['mode'], seventh: boolean) =>
      Array.from({ length: 7 }, (_, index) =>
        chordSymbol(
          diatonicChord(
            key(mode === 'major' ? 'C' : 'A', mode),
            index,
            seventh,
          ),
        ),
      );
    expect(names('major', false)).toEqual([
      'C',
      'Dm',
      'Em',
      'F',
      'G',
      'Am',
      'Bdim',
    ]);
    expect(names('major', true)).toEqual([
      'Cmaj7',
      'Dm7',
      'Em7',
      'Fmaj7',
      'G7',
      'Am7',
      'Bm7♭5',
    ]);
    expect(names('minor', false)).toEqual([
      'Am',
      'Bdim',
      'C',
      'Dm',
      'E',
      'F',
      'G♯dim',
    ]);
    expect(names('minor', true)[4]).toBe('E7');
    expect(names('minor', true)[6]).toBe('G♯dim7');
    expect(chordSymbol(diatonicChord(key('D', 'dorian'), 3))).toBe('G');
    expect(() => diatonicChord(key('C'), 7)).toThrow(RangeError);
  });
});
