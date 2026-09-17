import { describe, expect, it } from 'vitest';
import {
  createChord,
  insertEntry,
  moveEntry,
  removeEntry,
  replaceEntry,
} from '@rechorder/music';
import type { EditorState } from '../../apps/web/src/chord-progression/editor';
import {
  editorReducer,
  initialEditor,
} from '../../apps/web/src/chord-progression/editor';

const entry = (id: string) => ({ id, value: createChord('C', 'major') });
const entries = [entry('a'), entry('b'), entry('c')];
const ids = (state: EditorState) => state.entries.map((item) => item.id);

describe('progression operations', () => {
  it('keeps identical chords distinct and never mutates the input array', () => {
    const next = insertEntry(entries, 1, entry('d'));
    expect(next.map((item) => item.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(entries.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(removeEntry(next, 'b').map((item) => item.id)).toEqual([
      'a',
      'd',
      'c',
    ]);
    expect(() => insertEntry(entries, 0, entry('a'))).toThrow();
    expect(() => removeEntry(entries, 'missing')).toThrow();
  });
  it('replaces a value while retaining identity, order, and untouched entries', () => {
    const value = createChord('D♭', 'minor7');
    const next = replaceEntry(entries, 'b', value);
    expect(next.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(next[1]?.value).toBe(value);
    expect(next[0]).toBe(entries[0]);
    expect(next[2]).toBe(entries[2]);
    expect(entries[1]?.value.definition.id).toBe('major');
    expect(() => replaceEntry(entries, 'missing', value)).toThrow();
  });
  it('moves every item to each final index without losing identity', () => {
    for (const source of entries)
      for (let destination = 0; destination < entries.length; destination++) {
        const moved = moveEntry(entries, source.id, destination);
        expect(moved[destination]).toBe(source);
        expect(new Set(moved.map((item) => item.id)).size).toBe(entries.length);
      }
    expect(() => moveEntry(entries, 'a', -1)).toThrow();
    expect(() => moveEntry(entries, 'a', entries.length)).toThrow();
  });
});

describe('editor state', () => {
  it('inserts between neighbors, selects the new ID, and rejects stale or terminal gaps', () => {
    const state = editorReducer(
      { entries, selectedId: 'a' },
      { type: 'insert-after', id: 'a', entry: entry('new') },
    );
    expect(ids(state)).toEqual(['a', 'new', 'b', 'c']);
    expect(state.selectedId).toBe('new');
    expect(state.entries[0]).toBe(entries[0]);
    expect(state.entries[2]).toBe(entries[1]);
    expect(
      editorReducer(state, {
        type: 'insert-after',
        id: 'c',
        entry: entry('unused'),
      }),
    ).toBe(state);
    expect(() =>
      editorReducer(state, {
        type: 'insert-after',
        id: 'missing',
        entry: entry('unused'),
      }),
    ).toThrow();
  });
  it('always appends at the end and selects the new identity', () => {
    let state: EditorState = { entries, selectedId: 'a' };
    state = editorReducer(state, { type: 'append', entry: entry('d') });
    state = editorReducer(state, { type: 'append', entry: entry('e') });
    expect(ids(state)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(state.selectedId).toBe('e');
  });
  it('replaces only the selection and safely ignores replacement without one', () => {
    const value = createChord('G', 'dominant7');
    const state = editorReducer(
      { entries, selectedId: 'b' },
      { type: 'replace', value },
    );
    expect(state.selectedId).toBe('b');
    expect(ids(state)).toEqual(['a', 'b', 'c']);
    expect(state.entries[1]?.value).toBe(value);
    expect(editorReducer(initialEditor, { type: 'replace', value })).toBe(
      initialEditor,
    );
  });
  it('backspaces the last entry even with an earlier selection', () => {
    let state: EditorState = { entries, selectedId: 'a' };
    state = editorReducer(state, { type: 'remove-last' });
    expect(ids(state)).toEqual(['a', 'b']);
    expect(state.selectedId).toBe('a');
    state = editorReducer(state, { type: 'remove-last' });
    expect(state.selectedId).toBe('a');
    state = editorReducer(state, { type: 'remove-last' });
    expect(state).toEqual(initialEditor);
    expect(editorReducer(state, { type: 'remove-last' })).toBe(state);
  });
  it('clears a removed selection without silently choosing a different replacement target', () => {
    const state = editorReducer(
      { entries, selectedId: 'c' },
      { type: 'remove-last' },
    );
    expect(ids(state)).toEqual(['a', 'b']);
    expect(state.selectedId).toBeNull();
  });
  it('selects without modifying stored data and rejects stale IDs', () => {
    const state = editorReducer(
      { entries, selectedId: null },
      { type: 'select', id: 'b' },
    );
    expect(state.entries).toBe(entries);
    expect(state.selectedId).toBe('b');
    expect(() =>
      editorReducer(state, { type: 'select', id: 'missing' }),
    ).toThrow();
  });
});
