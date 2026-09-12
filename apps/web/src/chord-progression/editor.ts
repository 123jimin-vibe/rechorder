import {
  entryIndex,
  insertEntry,
  moveEntry,
  removeEntry,
} from '@rechorder/music';
import type { ProgressionEntry, WesternChord } from '@rechorder/music';

export interface EditorState {
  readonly entries: readonly ProgressionEntry<WesternChord>[];
  readonly selectedId: string | null;
  /** Null represents the end; otherwise the cursor stays before this entry. */
  readonly beforeId: string | null;
}

export type EditorAction =
  | { readonly type: 'insert'; readonly entry: ProgressionEntry<WesternChord> }
  | { readonly type: 'select'; readonly id: string }
  | { readonly type: 'cursor'; readonly beforeId: string | null }
  | { readonly type: 'remove'; readonly id: string }
  | { readonly type: 'move'; readonly id: string; readonly direction: -1 | 1 };

export const initialEditor: EditorState = {
  entries: [],
  selectedId: null,
  beforeId: null,
};

export function cursorIndex(state: EditorState): number {
  return state.beforeId === null
    ? state.entries.length
    : entryIndex(state.entries, state.beforeId);
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'insert':
      return {
        ...state,
        entries: insertEntry(state.entries, cursorIndex(state), action.entry),
        selectedId: action.entry.id,
      };
    case 'select':
      entryIndex(state.entries, action.id);
      return { ...state, selectedId: action.id };
    case 'cursor':
      if (action.beforeId !== null) entryIndex(state.entries, action.beforeId);
      return { ...state, beforeId: action.beforeId };
    case 'remove': {
      const index = entryIndex(state.entries, action.id);
      return {
        entries: removeEntry(state.entries, action.id),
        beforeId:
          state.beforeId === action.id
            ? (state.entries[index + 1]?.id ?? null)
            : state.beforeId,
        selectedId:
          state.selectedId === action.id
            ? (state.entries[index + 1]?.id ??
              state.entries[index - 1]?.id ??
              null)
            : state.selectedId,
      };
    }
    case 'move':
      return {
        ...state,
        entries: moveEntry(
          state.entries,
          action.id,
          entryIndex(state.entries, action.id) + action.direction,
        ),
      };
  }
}
