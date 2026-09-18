import { describe, expect, it } from 'vitest';
import { alterChord, chordData, createChord, setBass } from '@rechorder/music';
import {
  progressionDocument,
  progressionDocumentKey,
} from '../../apps/web/src/chord-progression/document';
import type { ProgressionDocument } from '../../apps/web/src/chord-progression/document';
import { openStoredDocument } from '../../apps/web/src/persistence/stored-document';
import {
  editorReducer,
  initialEditor,
} from '../../apps/web/src/chord-progression/editor';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const items = new Map(Object.entries(initial));
  return {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
  };
}

const gMajor = {
  tonic: createChord('G', 'major').root,
  mode: 'major',
} as const;

const filled: ProgressionDocument = {
  progression: [
    { id: 'a', value: createChord('C', 'major') },
    {
      id: 'b',
      value: setBass(createChord('E', 'minor'), { kind: 'degree', degree: 3 }),
    },
    { id: 'c', value: alterChord(createChord('G', 'dominant7'), ['♭9']) },
    { id: 'd', value: createChord('D♭', 'major7', 'F') },
  ],
  tempo: 96,
  key: gMajor,
};

describe('chord progression document', () => {
  it('round-trips entries, IDs, tempo and key through storage text', () => {
    const storage = memoryStorage();
    openStoredDocument(
      storage,
      progressionDocumentKey,
      progressionDocument,
    ).save(filled);
    const loaded = openStoredDocument(
      storage,
      progressionDocumentKey,
      progressionDocument,
    ).load();
    expect(loaded.tempo).toBe(96);
    expect(loaded.key).toEqual(gMajor);
    expect(loaded.progression?.map((entry) => entry.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(loaded.progression?.map((entry) => entry.value)).toEqual(
      filled.progression.map((entry) => entry.value),
    );
  });

  it('stores an automatic key as null and reads it back as none', () => {
    const storage = memoryStorage();
    const store = openStoredDocument(
      storage,
      progressionDocumentKey,
      progressionDocument,
    );
    store.save({ ...filled, key: undefined });
    expect(JSON.parse(storage.getItem(progressionDocumentKey)!)).toMatchObject({
      version: 1,
      key: null,
    });
    expect(store.load().key).toBeUndefined();
  });

  it('falls back section by section and keeps foreign sections through a save', () => {
    const storage = memoryStorage({
      [progressionDocumentKey]: JSON.stringify({
        version: 1,
        progression: [{ id: 'x', chord: { root: 'nope' } }],
        tempo: 5000,
        key: {
          tonic: { letter: 'D', accidental: 0, octave: 4 },
          mode: 'dorian',
        },
        futureFeature: { enabled: true },
      }),
    });
    const store = openStoredDocument(
      storage,
      progressionDocumentKey,
      progressionDocument,
    );
    const loaded = store.load();
    expect(loaded.progression).toBeUndefined();
    expect(loaded.tempo).toBeUndefined();
    expect(loaded.key?.mode).toBe('dorian');
    expect(loaded.key?.tonic.spelling).toBe('D4');
    store.save({ progression: [], tempo: 120, key: loaded.key });
    expect(JSON.parse(storage.getItem(progressionDocumentKey)!)).toMatchObject({
      futureFeature: { enabled: true },
      progression: [],
    });
  });

  it('rejects unknown chord types, duplicate IDs and unplayable voicings', () => {
    const decode = progressionDocument.progression.decode;
    const entry = { id: 'a', chord: chordData(filled.progression[0]!.value) };
    expect(decode([entry])).toHaveLength(1);
    expect(decode([entry, entry])).toBeUndefined();
    expect(
      decode([{ ...entry, chord: { ...entry.chord, definition: 'quartal' } }]),
    ).toBeUndefined();
    expect(
      decode([
        {
          ...entry,
          chord: {
            ...entry.chord,
            root: { letter: 'C', accidental: 0, octave: 9 },
          },
        },
      ]),
    ).toBeUndefined();
  });

  it('survives unreadable text and missing storage', () => {
    const storage = memoryStorage({ [progressionDocumentKey]: '{not json' });
    expect(
      openStoredDocument(
        storage,
        progressionDocumentKey,
        progressionDocument,
      ).load(),
    ).toEqual({});
    const detached = openStoredDocument(
      undefined,
      progressionDocumentKey,
      progressionDocument,
    );
    expect(detached.load()).toEqual({});
    expect(() => detached.save(filled)).not.toThrow();
  });
});

describe('clear action', () => {
  it('empties entries and selection, and leaves an empty editor untouched', () => {
    const state = editorReducer(
      { entries: filled.progression, selectedId: 'b' },
      { type: 'clear' },
    );
    expect(state).toEqual(initialEditor);
    expect(editorReducer(initialEditor, { type: 'clear' })).toBe(initialEditor);
  });
});
