import { describe, expect, it } from 'vitest';
import {
  createChord,
  insertEntry,
  moveEntry,
  removeEntry,
} from '@rechorder/music';
import type { EditorState } from '../../apps/web/src/chord-progression/editor';
import {
  cursorIndex,
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
  it('inserts repeatedly at the cursor and advances past each new entry', () => {
    let state = editorReducer(initialEditor, {
      type: 'insert',
      entry: entry('a'),
    });
    state = editorReducer(state, { type: 'cursor', beforeId: 'a' });
    state = editorReducer(state, { type: 'insert', entry: entry('b') });
    state = editorReducer(state, { type: 'insert', entry: entry('c') });
    expect(ids(state)).toEqual(['b', 'c', 'a']);
    expect(cursorIndex(state)).toBe(2);
    expect(state.selectedId).toBe('c');
  });

  it('follows the insertion anchor when entries are reordered', () => {
    let state: EditorState = { entries, beforeId: 'b', selectedId: 'a' };
    state = editorReducer(state, { type: 'move', id: 'b', direction: 1 });
    expect(ids(state)).toEqual(['a', 'c', 'b']);
    expect(cursorIndex(state)).toBe(2);
    expect(state.selectedId).toBe('a');
  });

  it('moves a deleted anchor to its successor and repairs selection', () => {
    let state: EditorState = { entries, beforeId: 'b', selectedId: 'b' };
    state = editorReducer(state, { type: 'remove', id: 'b' });
    expect(state.beforeId).toBe('c');
    expect(state.selectedId).toBe('c');
    state = editorReducer(state, { type: 'remove', id: 'c' });
    expect(state.beforeId).toBeNull();
    expect(state.selectedId).toBe('a');
    state = editorReducer(state, { type: 'remove', id: 'a' });
    expect(state).toEqual(initialEditor);
  });

  it('preserves the end cursor and rejects stale selection/cursor IDs', () => {
    const state: EditorState = { entries, beforeId: null, selectedId: null };
    expect(
      cursorIndex(
        editorReducer(state, { type: 'move', id: 'a', direction: 1 }),
      ),
    ).toBe(3);
    expect(() =>
      editorReducer(state, { type: 'cursor', beforeId: 'missing' }),
    ).toThrow();
    expect(() =>
      editorReducer(state, { type: 'select', id: 'missing' }),
    ).toThrow();
  });
});
