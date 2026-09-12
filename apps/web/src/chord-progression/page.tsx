import { Fragment } from 'preact';
import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import {
  chordDefinitions,
  chordSymbol,
  createChord,
  roots,
  resolvePitches,
  standardTuning,
  voiceChord,
} from '@rechorder/music';
import type { WesternChord } from '@rechorder/music';
import type { ActiveNote } from '@rechorder/audio';
import type { AuditionController } from './audition';
import { editorReducer, initialEditor } from './editor';
import styles from './editor.module.css';

function useSoundingNotes(
  controller: AuditionController,
): readonly ActiveNote[] {
  const [notes, setNotes] = useState<readonly ActiveNote[]>([]);
  useEffect(() => {
    let frame = 0;
    let signature = '';
    const update = () => {
      const current = controller.notes();
      const next = current
        .map((item) => item.playbackId + ':' + item.note.key)
        .join('|');
      if (next !== signature) {
        signature = next;
        setNotes(current);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [controller]);
  return notes;
}

export function EditorPage({
  controller,
}: {
  readonly controller: AuditionController;
}) {
  const [state, dispatch] = useReducer(editorReducer, initialEditor);
  const [rootId, setRoot] = useState('C');
  const [definitionId, setDefinition] = useState('major');
  const [reveal, setReveal] = useState(0);
  const cursorRef = useRef<HTMLButtonElement>(null);
  const candidate = useMemo(
    () => createChord(rootId, definitionId),
    [rootId, definitionId],
  );
  const candidateNotes = useMemo(() => voiceChord(candidate), [candidate]);
  const sounding = useSoundingNotes(controller);
  const uniqueNotes = [
    ...new Map(
      sounding.map(({ note }) => [note.label + ':' + note.frequency, note]),
    ).values(),
  ];
  const selectedIndex = state.entries.findIndex(
    (entry) => entry.id === state.selectedId,
  );
  const selected = state.entries[selectedIndex];

  useEffect(() => {
    if (reveal > 0)
      cursorRef.current?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
  }, [reveal]);

  function play(chord: WesternChord, source: string) {
    try {
      void controller.play(
        resolvePitches(voiceChord(chord), standardTuning),
        source,
      );
    } catch (error) {
      console.error('Chord playback failed.', error);
    }
  }

  function insert() {
    dispatch({
      type: 'insert',
      entry: { id: crypto.randomUUID(), value: candidate },
    });
    setReveal((value) => value + 1);
  }

  function insertionPoint(index: number, beforeId: string | null) {
    const active = state.beforeId === beforeId;
    return (
      <button
        type="button"
        class={styles['cursor']}
        aria-label={
          active
            ? `Insert ${chordSymbol(candidate)} at position ${index + 1}`
            : `Set insertion point at position ${index + 1}`
        }
        data-insertion-active={active}
        title={active ? 'Insert chord here' : 'Move insertion preview here'}
        ref={active ? cursorRef : null}
        onClick={() => {
          if (active) insert();
          else {
            dispatch({ type: 'cursor', beforeId });
            setReveal((value) => value + 1);
          }
        }}
      >
        {active ? (
          <>
            <strong>+ {chordSymbol(candidate)}</strong>
            <span>Insert</span>
          </>
        ) : (
          <span aria-hidden="true">+</span>
        )}
      </button>
    );
  }

  return (
    <main class={styles['shell']}>
      <header>
        <a href={import.meta.env.BASE_URL}>Rechorder</a>
        <h1>Chord progression</h1>
      </header>

      <section aria-labelledby="progression-heading">
        <div class={styles['sectionHeading']}>
          <h2 id="progression-heading">Progression</h2>
          <span>
            {state.entries.length}{' '}
            {state.entries.length === 1 ? 'chord' : 'chords'}
          </span>
        </div>
        <fieldset class={styles['strip']} aria-label="Chord progression">
          {state.entries.map((entry, index) => (
            <Fragment key={entry.id}>
              {insertionPoint(index, entry.id)}
              <div
                class={styles['card']}
                data-entry-id={entry.id}
                data-selected={state.selectedId === entry.id}
              >
                <button
                  type="button"
                  class={styles['selectChord']}
                  aria-label={`Select chord ${index + 1}: ${chordSymbol(entry.value)}`}
                  aria-pressed={state.selectedId === entry.id}
                  onClick={() => dispatch({ type: 'select', id: entry.id })}
                >
                  <span class={styles['ordinal']}>{index + 1}</span>
                  <strong>{chordSymbol(entry.value)}</strong>
                </button>
                <button
                  type="button"
                  aria-label={`Play chord ${index + 1}: ${chordSymbol(entry.value)}`}
                  onClick={() => play(entry.value, entry.id)}
                >
                  Play
                </button>
              </div>
            </Fragment>
          ))}
          {insertionPoint(state.entries.length, null)}
          {state.entries.length === 0 && (
            <p class={styles['empty']}>No chords yet.</p>
          )}
        </fieldset>
        <fieldset class={styles['editing']} aria-label="Selected chord actions">
          <button
            type="button"
            disabled={!selected || selectedIndex === 0}
            onClick={() => {
              if (selected)
                dispatch({ type: 'move', id: selected.id, direction: -1 });
            }}
          >
            Move left
          </button>
          <button
            type="button"
            disabled={!selected || selectedIndex === state.entries.length - 1}
            onClick={() => {
              if (selected)
                dispatch({ type: 'move', id: selected.id, direction: 1 });
            }}
          >
            Move right
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (selected) {
                controller.stopSource(selected.id);
                dispatch({ type: 'remove', id: selected.id });
              }
            }}
          >
            Remove
          </button>
        </fieldset>
      </section>

      <section aria-labelledby="candidate-heading">
        <h2 id="candidate-heading">Add a chord</h2>
        <div class={styles['fields']}>
          <label>
            Root
            <select
              value={rootId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (roots.some((root) => root.id === value)) setRoot(value);
              }}
            >
              {roots.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chord type
            <select
              value={definitionId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (
                  chordDefinitions.some((definition) => definition.id === value)
                )
                  setDefinition(value);
              }}
            >
              {chordDefinitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div class={styles['candidate']} aria-label="Candidate chord">
          <strong>{chordSymbol(candidate)}</strong>
          <span>{candidateNotes.map((note) => note.spelling).join(' · ')}</span>
        </div>
        <div class={styles['editing']}>
          <button type="button" onClick={() => play(candidate, 'candidate')}>
            Play candidate
          </button>
          <button type="button" class={styles['primary']} onClick={insert}>
            Insert chord
          </button>
        </div>
      </section>

      <section aria-labelledby="playing-heading">
        <h2 id="playing-heading">Now playing</h2>
        <output
          class={styles['playing']}
          aria-label="Currently playing notes"
          aria-live="polite"
        >
          {uniqueNotes.length === 0 ? (
            <span class={styles['hint']}>No notes playing</span>
          ) : (
            uniqueNotes.map((note) => (
              <span
                class={styles['note']}
                key={note.label + ':' + note.frequency}
              >
                {note.label}
              </span>
            ))
          )}
        </output>
      </section>
    </main>
  );
}
