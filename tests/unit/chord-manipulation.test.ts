import { describe, expect, it } from 'vitest';
import {
  createChord,
  chordSymbol,
  chordTones,
  bassRole,
  setBass,
  voiceChord,
  alterChord,
  setChordDegree,
  setToneVoicing,
  transposeChord,
  chooseChord,
  enharmonicSpellings,
  respellChord,
  standardTuning,
  isAuditionable,
} from '@rechorder/music';
import type { WesternChord } from '@rechorder/music';
import { editorReducer } from '../../apps/web/src/chord-progression/editor';

const pitches = (chord: WesternChord) =>
  voiceChord(chord).map((pitch) => pitch.spelling);
const frequencies = (chord: WesternChord) =>
  voiceChord(chord).map((pitch) => standardTuning.frequency(pitch.position));

describe('chord meaning and manipulation', () => {
  it('distinguishes root, inversions, extensions, outside bass and enharmonic membership', () => {
    const c = createChord('C', 'major');
    expect(bassRole(c).label).toBe('Root position');
    const first = setBass(c, { kind: 'degree', degree: 3 });
    expect(bassRole(first).label).toBe('1st inversion');
    expect(pitches(first)).toEqual(['E4', 'G4', 'C5']);
    expect(pitches(setBass(c, { kind: 'degree', degree: 5 }))).toEqual([
      'G4',
      'C5',
      'E5',
    ]);
    expect(bassRole(createChord('C', 'dominant7', 'B♭')).label).toBe(
      '3rd inversion',
    );
    expect(
      bassRole(
        setBass(createChord('C', 'dominant9'), { kind: 'degree', degree: 9 }),
      ).label,
    ).toBe('9 in bass');
    const outside = createChord('C', 'major', 'D');
    expect(bassRole(outside).label).toBe('Outside chord');
    expect(pitches(outside)).toEqual(['D3', 'C4', 'E4', 'G4']);
    const equivalent = createChord('C', 'major', 'F♭');
    expect(bassRole(equivalent).member).toBeUndefined();
    expect(bassRole(equivalent).equivalent?.degree).toBe(3);
    expect(pitches(equivalent)).toEqual(['F♭4', 'G4', 'C5']);
  });

  it('exposes double accidentals as members and follows degree alterations', () => {
    const dim = setBass(createChord('C', 'diminished7'), {
      kind: 'degree',
      degree: 7,
    });
    expect(chordSymbol(dim)).toBe('Cdim7/B♭♭');
    expect(pitches(dim)[0]).toBe('B♭♭4');
    const fifth = setBass(createChord('C', 'dominant7'), {
      kind: 'degree',
      degree: 5,
    });
    expect(chordSymbol(alterChord(fifth, ['♯5']))).toBe('C7(♯5)/G♯');
    expect(bassRole(alterChord(fifth, ['♯5'])).member?.label).toBe('♯5');
  });

  it('keeps voicing muting, doubling and register independent of chord identity', () => {
    const c = createChord('C', 'dominant7');
    const muted = setToneVoicing(c, 5, []);
    expect(chordSymbol(muted)).toBe('C7');
    expect(chordTones(muted).some((tone) => tone.degree === 5)).toBe(true);
    expect(pitches(muted)).toEqual(['C4', 'E4', 'B♭4']);
    const doubled = setToneVoicing(muted, 3, [0, 1]);
    expect(pitches(doubled)).toEqual(['C4', 'E4', 'B♭4', 'E5']);
    expect(chordSymbol(doubled)).toBe('C7');
    const open = {
      ...c,
      voicing: { ...c.voicing, kind: 'open' as const, octave: -1 },
    };
    expect(pitches(open)).toEqual(['C3', 'E3', 'B♭3', 'G4']);
    expect(() => setToneVoicing(c, 1, [])).toThrow('bass');
    expect(() => setToneVoicing(c, 3, [-1])).toThrow('bass');
    expect(() => setToneVoicing(c, 3, [0, 0])).toThrow('Invalid');
    expect(isAuditionable({ ...c, voicing: { ...c.voicing, octave: 4 } })).toBe(
      false,
    );
  });

  it('changes harmony explicitly and restores omitted/altered degrees without stale bass', () => {
    const c = createChord('C', 'dominant7');
    const omitted = setChordDegree(c, 5, false);
    expect(chordSymbol(omitted)).toBe('C7(no5)');
    expect(chordTones(omitted).some((tone) => tone.degree === 5)).toBe(false);
    expect(chordSymbol(setChordDegree(omitted, 5, true))).toBe('C7');
    expect(chordSymbol(setChordDegree(c, 11, true))).toBe('C7(add11)');
    expect(chordSymbol(alterChord(setChordDegree(c, 9, true), ['♭9']))).toBe(
      'C7(♭9)',
    );
    expect(chordSymbol(setChordDegree(alterChord(c, ['♯5']), 5, false))).toBe(
      'C7(no5)',
    );
    expect(chordSymbol(alterChord(omitted, ['♯5']))).toBe('C7(♯5)');
    const ninth = setBass(alterChord(c, ['♭9']), { kind: 'degree', degree: 9 });
    expect(alterChord(ninth, []).bass).toBeUndefined();
    expect(
      setChordDegree(setBass(c, { kind: 'degree', degree: 5 }), 5, false).bass,
    ).toBeUndefined();
  });

  it('resets bass and alterations on different root/type choices but preserves same-choice replay', () => {
    const c = alterChord(createChord('C', 'dominant7', 'E'), ['♭9']);
    expect(chooseChord(c)).toBe(c);
    const d = chooseChord(c, createChord('D', 'major').root);
    expect(chordSymbol(d)).toBe('D7');
    expect(d.bass).toBeUndefined();
    expect(d.alterations).toEqual([]);
    const minor = chooseChord(c, c.root, 'minor');
    expect(chordSymbol(minor)).toBe('Cm');
    expect(minor.bass).toBeUndefined();
  });

  it('transposes whole chords and preserves sounding voicings when respelling across octaves', () => {
    const c = setToneVoicing(createChord('C', 'major', 'E'), 5, [0, 1]);
    const interval = { diatonicSteps: 1, chromaticSteps: 2 };
    const d = transposeChord(c, interval);
    expect(chordSymbol(d)).toBe('D/F♯');
    expect(frequencies(d)).toEqual(
      frequencies(c).map((frequency) =>
        expect.closeTo(frequency * 2 ** (2 / 12), 6),
      ),
    );
    expect(
      transposeChord(d, { diatonicSteps: -1, chromaticSteps: -2 }),
    ).toEqual(c);
    const bSharp = enharmonicSpellings(c.root).find(
      (pitch) => pitch.spelling === 'B♯3',
    )!;
    const respelled = respellChord(c, bSharp);
    expect(chordSymbol(respelled)).toBe('B♯/E');
    expect(frequencies(respelled)).toEqual(frequencies(c));
    expect(() => respellChord(c, createChord('D', 'major').root)).toThrow(
      'preserve',
    );
  });

  it('transposes progression entries without changing IDs, selection or source values', () => {
    const c = createChord('C', 'major', 'E');
    const state = {
      entries: [
        { id: 'one', value: c },
        { id: 'two', value: c },
      ],
      selectedId: 'two',
    };
    const next = editorReducer(state, {
      type: 'transpose',
      interval: { diatonicSteps: 1, chromaticSteps: 2 },
    });
    expect(
      next.entries.map((entry) => [entry.id, chordSymbol(entry.value)]),
    ).toEqual([
      ['one', 'D/F♯'],
      ['two', 'D/F♯'],
    ]);
    expect(next.selectedId).toBe('two');
    expect(chordSymbol(state.entries[0]!.value)).toBe('C/E');
  });
});
