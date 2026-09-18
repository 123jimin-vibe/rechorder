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
  chooseChord,
  inferTonality,
  transposeChord,
  transposePitch,
  isAuditionable,
  roots,
  resolvePitches,
  standardTuning,
  voiceChord,
} from '@rechorder/music';
import type { TonalKey, WesternChord } from '@rechorder/music';
import { progressionBpm } from '../audio/audition';
import type { AuditionController } from '../audio/audition';
import { useProgressionPlayback } from '../audio/use-progression-playback';
import { useSoundingNotes } from '../audio/use-sounding-notes';
import {
  availableStorage,
  openStoredDocument,
} from '../persistence/stored-document';
import { progressionDocument, progressionDocumentKey } from './document';
import { editorReducer, initialEditor } from './editor';
import { BassOptions, JazzOptions, rootPads } from './chord-options';
import {
  HarmonicOptions,
  VoicingOptions,
  TransformOptions,
} from './manipulation-options';
import { ProgressionSettings } from './settings';
import { FunctionPads } from './function-pads';
import { Recommendations } from './recommendations';
import type { SuggestionMode } from './recommendations';
import { MusicalText } from './musical-text';
import { PianoKeyboard } from '../components/piano-keyboard';
import styles from './editor.module.css';

export function EditorPage({
  controller,
}: {
  readonly controller: AuditionController;
}) {
  const [{ store, saved }] = useState(() => {
    const store = openStoredDocument(
      availableStorage(() => globalThis.localStorage),
      progressionDocumentKey,
      progressionDocument,
    );
    return { store, saved: store.load() };
  });
  const [state, dispatch] = useReducer(
    editorReducer,
    saved.progression
      ? { entries: saved.progression, selectedId: null }
      : initialEditor,
  );
  const [candidate, setCandidate] = useState(() => createChord('C', 'major'));
  const [tonalKey, setTonalKey] = useState<TonalKey | undefined>(saved.key);
  const [tempo, setTempo] = useState(saved.tempo ?? progressionBpm);
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>('next');
  const [copied, setCopied] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);
  const progression = useMemo(
    () => state.entries.map((entry) => entry.value),
    [state.entries],
  );
  // Same window the Next suggestions read, so pads and panel agree on the key.
  const tonalContext = useMemo(
    () => inferTonality(progression.slice(-4), tonalKey),
    [progression, tonalKey],
  );
  const insertedId = useRef<string | null>(null);
  const previousLength = useRef(0);
  const stripRef = useRef<HTMLFieldSetElement>(null);
  const candidateNotes = useMemo(() => voiceChord(candidate), [candidate]);
  const rootId = roots.find(
    ({ pitch }) =>
      pitch.position.letter === candidate.root.position.letter &&
      pitch.position.accidental === candidate.root.position.accidental,
  )?.id;
  const sounding = useSoundingNotes(controller);
  const playback = useProgressionPlayback(controller);
  const activeAuditionSources = new Set(controller.activeAuditionSources());
  const uniqueNotes = [
    ...new Map(
      sounding.map(({ note }) => [note.label + ':' + note.frequency, note]),
    ).values(),
  ];
  const selected = state.entries.find((entry) => entry.id === state.selectedId);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (strip && insertedId.current) {
      strip
        .querySelector<HTMLElement>(`[data-entry-id="${insertedId.current}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      // Preact refs are mutable lifecycle storage; this rule recognizes React only.
      // oxlint-disable-next-line react/immutability
      insertedId.current = null;
    } else if (strip && state.entries.length > previousLength.current)
      strip.scrollTo({ left: strip.scrollWidth });
    // Preact refs are mutable lifecycle storage; this rule only recognizes React refs.
    // oxlint-disable-next-line react/immutability
    previousLength.current = state.entries.length;
  }, [state.entries.length]);

  useEffect(() => {
    controller.setTempo(tempo);
  }, [controller, tempo]);

  useEffect(() => {
    store.save({ progression: state.entries, tempo, key: tonalKey });
  }, [store, state.entries, tempo, tonalKey]);

  // Transient button feedback: both states clear themselves.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  useEffect(() => {
    if (!clearArmed) return;
    const timer = setTimeout(() => setClearArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [clearArmed]);

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
    if (!isAuditionable(chord)) return;
    setCandidate(chord);
    play(chord, 'candidate');
  }

  function progressionChords() {
    return state.entries.map((entry) => ({
      source: entry.id,
      notes: resolvePitches(voiceChord(entry.value), standardTuning),
    }));
  }

  function copyProgression() {
    const text = state.entries
      .map((entry) => chordSymbol(entry.value))
      .join(' ');
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      (error: unknown) =>
        console.error('Copying the progression failed.', error),
    );
  }

  function clearProgression() {
    controller.stopProgression();
    for (const entry of state.entries) controller.stopSource(entry.id);
    dispatch({ type: 'clear' });
    setClearArmed(false);
  }

  function useSuggestion(chord: WesternChord, mode: SuggestionMode) {
    if (mode === 'bass') {
      setCandidate(chord);
      return;
    }
    if ((mode === 'replace' || mode === 'between') && !selected) return;
    controller.stopProgression();
    controller.stopSource('suggestion');
    controller.stopSource('candidate');
    if (mode === 'replace' && selected) {
      controller.stopSource(selected.id);
      dispatch({ type: 'replace', value: chord });
    } else {
      const entry = { id: crypto.randomUUID(), value: chord };
      if (mode === 'between' && selected) {
        // oxlint-disable-next-line react/immutability
        insertedId.current = entry.id;
        dispatch({ type: 'insert-after', id: selected.id, entry });
      } else dispatch({ type: 'append', entry });
    }
    setCandidate(chord);
  }

  return (
    <main class={styles['shell']}>
      <header class={styles['header']}>
        <a href={import.meta.env.BASE_URL}>
          Rechorder<span aria-hidden="true"> / </span>
        </a>
        <h1>Chord progression</h1>
      </header>
      <ProgressionSettings
        tempo={tempo}
        onTempoChange={setTempo}
        tonalKey={tonalKey}
        onKeyChange={setTonalKey}
      />

      <section class={styles['playingRow']} aria-labelledby="playing-heading">
        <h2 id="playing-heading">
          <span
            class={styles['indicator']}
            data-sounding={uniqueNotes.length > 0}
            aria-hidden="true"
          />
          Now playing
        </h2>
        <PianoKeyboard
          controller={controller}
          notes={uniqueNotes}
          compact
          showOctaveShortcuts={false}
        />
      </section>

      <section class={styles['timeline']} aria-labelledby="progression-heading">
        <div class={styles['sectionHeading']}>
          <h2 id="progression-heading">Progression</h2>
          <div class={styles['timelineActions']}>
            <fieldset class={styles['transport']} aria-label="Playback">
              <button
                type="button"
                disabled={
                  state.entries.length === 0 || playback.status === 'playing'
                }
                aria-label="Play"
                title="Play"
                onClick={() =>
                  void controller.playProgression(progressionChords())
                }
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="m8 5 11 7-11 7Z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!selected || playback.status === 'playing'}
                aria-label="Play from here"
                title="Play from here"
                onClick={() => {
                  const index = state.entries.findIndex(
                    (entry) => entry.id === selected?.id,
                  );
                  if (index >= 0) {
                    controller.stopProgression();
                    void controller.playProgression(progressionChords(), index);
                  }
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M5 4v16" />
                  <path d="m9 5 11 7-11 7Z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={playback.status === 'stopped'}
                aria-label="Stop"
                title="Stop"
                onClick={() => controller.stopProgression()}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            </fieldset>
            <fieldset class={styles['editing']} aria-label="Editing">
              <button
                type="button"
                aria-label={copied ? 'Copied' : 'Copy progression'}
                title="Copy progression"
                disabled={state.entries.length === 0}
                data-done={copied}
                onClick={copyProgression}
              >
                {copied ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <rect x="9" y="8" width="11" height="12" rx="1.5" />
                    <path d="M15 8V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H9" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                class={styles['danger']}
                aria-label="Remove last chord"
                title="Remove last chord"
                disabled={state.entries.length === 0}
                onClick={() => {
                  const last = state.entries.at(-1);
                  if (last) {
                    controller.stopSource(last.id);
                    dispatch({ type: 'remove-last' });
                  }
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M9 5h12v14H9l-7-7Z" />
                  <path d="m12 9 6 6m0-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                class={styles['danger']}
                aria-label={
                  clearArmed ? 'Confirm remove all chords' : 'Remove all chords'
                }
                title={
                  clearArmed
                    ? 'Tap again to remove all chords'
                    : 'Remove all chords'
                }
                disabled={state.entries.length === 0}
                data-armed={clearArmed}
                onClick={() =>
                  clearArmed ? clearProgression() : setClearArmed(true)
                }
                onBlur={() => setClearArmed(false)}
              >
                {clearArmed ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M4 7h16" />
                    <path d="M9 7V4.5h6V7" />
                    <path d="M6 7l1 13h10l1-13" />
                    <path d="M10 11v6m4-6v6" />
                  </svg>
                )}
              </button>
            </fieldset>
          </div>
        </div>
        <div class={styles['timelineRow']}>
          <fieldset
            class={styles['strip']}
            aria-label="Chord progression"
            ref={stripRef}
          >
            {state.entries.map((entry, index) => {
              const isPlaying =
                activeAuditionSources.has(entry.id) ||
                (playback.status === 'playing' &&
                  playback.currentIndex === index);
              return (
                <button
                  key={entry.id}
                  type="button"
                  class={styles['chord']}
                  data-entry-id={entry.id}
                  data-playing={isPlaying}
                  aria-current={isPlaying ? 'true' : undefined}
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
              );
            })}
          </fieldset>
        </div>
      </section>

      <Recommendations
        progression={progression}
        selectedIndex={state.entries.findIndex(
          (entry) => entry.id === state.selectedId,
        )}
        candidate={candidate}
        tonalKey={tonalKey}
        mode={suggestionMode}
        onMode={setSuggestionMode}
        onPreview={(chord) => play(chord, 'suggestion')}
        onBassChange={auditionCandidate}
        onUse={useSuggestion}
      />

      <section class={styles['composer']} aria-label="Chord builder">
        <div class={styles['composerToolbar']}>
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
              title="Play candidate"
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
        </div>
        <div class={styles['choices']}>
          <fieldset
            class={styles['choiceGroup']}
            aria-label="Function, root and bass"
          >
            <FunctionPads
              context={tonalContext}
              candidate={candidate}
              onChoose={auditionCandidate}
            />
            <fieldset>
              <legend>Root</legend>
              <div class={styles['roots']}>
                {rootPads.map((root) => (
                  <button
                    type="button"
                    key={root.id}
                    aria-label={`Root ${root.id}`}
                    aria-pressed={rootId === root.id}
                    disabled={
                      !isAuditionable(chooseChord(candidate, root.pitch))
                    }
                    onClick={() =>
                      auditionCandidate(chooseChord(candidate, root.pitch))
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
                    disabled={
                      !isAuditionable(
                        chooseChord(candidate, candidate.root, definition.id),
                      )
                    }
                    onClick={() => {
                      auditionCandidate(
                        chooseChord(candidate, candidate.root, definition.id),
                      );
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
            <HarmonicOptions chord={candidate} onChange={auditionCandidate} />
          </fieldset>
        </div>
        <VoicingOptions chord={candidate} onChange={auditionCandidate} />
        <TransformOptions
          chord={candidate}
          onChange={auditionCandidate}
          progression={state.entries.map((entry) => entry.value)}
          onTransposeProgression={(interval) => {
            controller.stopProgression();
            for (const entry of state.entries) controller.stopSource(entry.id);
            dispatch({ type: 'transpose', interval });
            if (tonalKey)
              setTonalKey({
                ...tonalKey,
                tonic: transposePitch(tonalKey.tonic, interval),
              });
            auditionCandidate(transposeChord(candidate, interval));
          }}
        />
      </section>
    </main>
  );
}
