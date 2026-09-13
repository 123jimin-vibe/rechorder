import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'preact/hooks';
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
import { BassOptions, JazzOptions, rootPads } from './chord-options';
import { MusicalText } from './musical-text';
import { Piano } from './piano';
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
  const [candidate, setCandidate] = useState(() => createChord('C', 'major'));
  const previousLength = useRef(0);
  const stripRef = useRef<HTMLFieldSetElement>(null);
  const candidateNotes = useMemo(() => voiceChord(candidate), [candidate]);
  const rootId = roots.find(
    ({ pitch }) =>
      pitch.position.letter === candidate.root.position.letter &&
      pitch.position.accidental === candidate.root.position.accidental &&
      pitch.position.octave === candidate.root.position.octave,
  )?.id;
  const sounding = useSoundingNotes(controller);
  const uniqueNotes = [
    ...new Map(
      sounding.map(({ note }) => [note.label + ':' + note.frequency, note]),
    ).values(),
  ];
  const selected = state.entries.find((entry) => entry.id === state.selectedId);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (strip && state.entries.length > previousLength.current)
      strip.scrollTo({ left: strip.scrollWidth });
    // Preact refs are mutable lifecycle storage; this rule only recognizes React refs.
    // oxlint-disable-next-line react/immutability
    previousLength.current = state.entries.length;
  }, [state.entries.length]);

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

  function auditionCandidate(chord: WesternChord) {
    setCandidate(chord);
    play(chord, 'candidate');
  }

  return (
    <main class={styles['shell']}>
      <header class={styles['header']}>
        <a href={import.meta.env.BASE_URL}>
          Rechorder<span aria-hidden="true"> / </span>
        </a>
        <h1>Chord progression</h1>
      </header>

      <section class={styles['playingRow']} aria-labelledby="playing-heading">
        <h2 id="playing-heading">
          <span
            class={styles['indicator']}
            data-sounding={uniqueNotes.length > 0}
            aria-hidden="true"
          />
          Now playing
        </h2>
        <Piano controller={controller} notes={uniqueNotes} />
      </section>

      <section class={styles['timeline']} aria-labelledby="progression-heading">
        <div class={styles['sectionHeading']}>
          <h2 id="progression-heading">Progression</h2>
          <button
            type="button"
            class={styles['backspace']}
            aria-label="Remove last chord"
            disabled={state.entries.length === 0}
            onClick={() => {
              const last = state.entries.at(-1);
              if (last) {
                controller.stopSource(last.id);
                dispatch({ type: 'remove-last' });
              }
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 5h12v14H9l-7-7Z" />
              <path d="m12 9 6 6m0-6-6 6" />
            </svg>
          </button>
        </div>
        <div class={styles['timelineRow']}>
          <fieldset
            class={styles['strip']}
            aria-label="Chord progression"
            ref={stripRef}
          >
            {state.entries.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                class={styles['chord']}
                data-entry-id={entry.id}
                aria-label={`Select and play chord ${index + 1}: ${chordSymbol(entry.value)}`}
                aria-pressed={state.selectedId === entry.id}
                onClick={() => {
                  dispatch({ type: 'select', id: entry.id });
                  setCandidate(entry.value);
                  play(entry.value, entry.id);
                }}
              >
                <strong>
                  <MusicalText text={chordSymbol(entry.value)} />
                </strong>
              </button>
            ))}
          </fieldset>
        </div>
      </section>

      <section class={styles['composer']} aria-label="Chord builder">
        <div class={styles['candidateRow']}>
          <div class={styles['candidate']} aria-label="Candidate chord">
            <strong>
              <MusicalText text={chordSymbol(candidate)} />
            </strong>
            <span>
              <MusicalText
                text={candidateNotes.map((note) => note.spelling).join(' · ')}
              />
            </span>
          </div>
          <button
            type="button"
            class={styles['replay']}
            aria-label="Play candidate"
            onClick={() => play(candidate, 'candidate')}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="m8 5 11 7-11 7Z" />
            </svg>
            Listen
          </button>
        </div>

        <div class={styles['commits']}>
          <button
            type="button"
            class={styles['primary']}
            aria-label="Append"
            onClick={() =>
              dispatch({
                type: 'append',
                entry: { id: crypto.randomUUID(), value: candidate },
              })
            }
          >
            <span aria-hidden="true">＋</span> Append
          </button>
          <button
            type="button"
            disabled={!selected}
            aria-label="Replace"
            onClick={() => {
              if (selected) {
                controller.stopSource(selected.id);
                dispatch({ type: 'replace', value: candidate });
              }
            }}
          >
            Replace
          </button>
        </div>

        <div class={styles['choices']}>
          <fieldset class={styles['choiceGroup']} aria-label="Root and bass">
            <fieldset>
              <legend>Root</legend>
              <div class={styles['roots']}>
                {rootPads.map((root) => (
                  <button
                    type="button"
                    key={root.id}
                    aria-label={`Root ${root.id}`}
                    aria-pressed={rootId === root.id}
                    onClick={() =>
                      auditionCandidate({ ...candidate, root: root.pitch })
                    }
                  >
                    <MusicalText text={root.id} />
                  </button>
                ))}
              </div>
            </fieldset>
            <BassOptions chord={candidate} onChange={auditionCandidate} />
          </fieldset>
          <fieldset class={styles['choiceGroup']} aria-label="Chord quality">
            <fieldset>
              <legend>Chord type</legend>
              <div class={styles['types']}>
                {chordDefinitions.map((definition) => (
                  <button
                    type="button"
                    key={definition.id}
                    aria-label={definition.label}
                    aria-pressed={candidate.definition.id === definition.id}
                    onClick={() => {
                      if (rootId)
                        auditionCandidate({
                          ...createChord(rootId, definition.id),
                          ...(candidate.bass ? { bass: candidate.bass } : {}),
                        });
                    }}
                  >
                    {definition.suffix || 'Major'}
                    {definition.id === 'minor' && (
                      <span class={styles['typeHint']}>Minor</span>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
            <JazzOptions chord={candidate} onChange={auditionCandidate} />
          </fieldset>
        </div>
      </section>
    </main>
  );
}
