import {
  entryIndex,
  insertEntry,
  removeEntry,
  replaceEntry,
  transposeChord,
} from '@rechorder/music';
import type {
  ProgressionEntry,
  WesternChord,
  WesternInterval,
} from '@rechorder/music';

export interface EditorState {
  readonly entries: readonly ProgressionEntry<WesternChord>[];
  readonly selectedId: string | null;
}

export type EditorAction =
  | { readonly type: 'append'; readonly entry: ProgressionEntry<WesternChord> }
  | { readonly type: 'select'; readonly id: string }
  | { readonly type: 'replace'; readonly value: WesternChord }
  | { readonly type: 'transpose'; readonly interval: WesternInterval }
  | { readonly type: 'remove-last' };

export const initialEditor: EditorState = { entries: [], selectedId: null };

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'transpose':
      return {
        ...state,
        entries: state.entries.map((entry) => ({
          ...entry,
          value: transposeChord(entry.value, action.interval),
        })),
      };
    case 'append':
      return {
        entries: insertEntry(state.entries, state.entries.length, action.entry),
        selectedId: action.entry.id,
      };
    case 'select':
      entryIndex(state.entries, action.id);
      return { ...state, selectedId: action.id };
    case 'replace':
      return state.selectedId === null
        ? state
        : {
            ...state,
            entries: replaceEntry(
              state.entries,
              state.selectedId,
              action.value,
            ),
          };
    case 'remove-last': {
      const last = state.entries.at(-1);
      if (!last) return state;
      return {
        entries: removeEntry(state.entries, last.id),
        selectedId: state.selectedId === last.id ? null : state.selectedId,
      };
    }
  }
}
