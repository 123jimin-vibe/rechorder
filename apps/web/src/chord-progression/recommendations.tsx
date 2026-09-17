import { useMemo, useState } from 'preact/hooks';
import {
  chordSymbol,
  recommendChords,
  rootLabel,
  roots,
  setBass,
  isAuditionable,
  voiceChord,
} from '@rechorder/music';
import type {
  RecommendationReason,
  TonalKey,
  TonalMode,
  WesternChord,
} from '@rechorder/music';
import { MusicalText } from './musical-text';
import styles from './recommendations.module.css';

export type SuggestionMode = 'next' | 'replace' | 'between' | 'bass';
export const modeLabels: Readonly<Record<TonalMode, string>> = {
  major: 'Major',
  minor: 'Minor',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  locrian: 'Locrian',
};
const labels = {
  next: 'Next',
  replace: 'Replace',
  between: 'Between',
  bass: 'Bass',
} as const;
const actions = {
  next: 'Add',
  replace: 'Replace',
  between: 'Insert',
  bass: 'Use',
} as const;
const modeNames = {
  next: 'Suggest next chords',
  replace: 'Suggest replacements',
  between: 'Suggest between chords',
  bass: 'Suggest chords for bass',
} as const;

function reasonLabel(reason: RecommendationReason): string {
  switch (reason.kind) {
    case 'dominant-resolution':
      return reason.side === 'after' ? 'Leads to next' : 'Dominant resolution';
    case 'leading-tone-resolution':
      return reason.side === 'after'
        ? 'Leading tone to next'
        : 'Leading-tone resolution';
    case 'ii-v':
      return 'ii–V motion';
    case 'plagal':
      return 'Plagal motion';
    case 'fifths':
      return 'Fifth movement';
    case 'key-fit':
      return 'Fits key';
    case 'borrowed':
      return 'Borrowed color';
    case 'deceptive':
      return 'Deceptive resolution';
    case 'fixed-bass':
      return 'Same bass';
    case 'smooth-voices':
      return 'Smooth voices';
    case 'shared-tones':
      return 'Shared tones';
    case 'starting-point':
      return 'Explore';
  }
}

export function Recommendations({
  progression,
  selectedIndex,
  candidate,
  tonalKey,
  mode,
  onMode,
  onPreview,
  onBassChange,
  onUse,
}: {
  readonly progression: readonly WesternChord[];
  readonly selectedIndex: number;
  readonly candidate: WesternChord;
  readonly tonalKey: TonalKey | undefined;
  readonly mode: SuggestionMode;
  readonly onMode: (mode: SuggestionMode) => void;
  readonly onPreview: (chord: WesternChord) => void;
  readonly onBassChange: (chord: WesternChord) => void;
  readonly onUse: (chord: WesternChord, mode: SuggestionMode) => void;
}) {
  const canReplace = selectedIndex >= 0;
  const canInsert = canReplace && selectedIndex < progression.length - 1;
  const activeMode =
    (mode === 'replace' && !canReplace) || (mode === 'between' && !canInsert)
      ? 'next'
      : mode;
  const bassCandidate = activeMode === 'bass' ? candidate : undefined;
  const result = useMemo(
    () =>
      recommendChords({
        progression,
        target:
          activeMode === 'replace'
            ? { kind: 'replace', index: selectedIndex }
            : activeMode === 'bass' && bassCandidate
              ? {
                  kind: 'bass',
                  chord: bassCandidate,
                  index: canReplace ? selectedIndex : progression.length,
                }
              : {
                  kind: 'insert',
                  index:
                    activeMode === 'between'
                      ? selectedIndex + 1
                      : progression.length,
                },
        ...(tonalKey ? { key: tonalKey } : {}),
      }),
    [
      progression,
      selectedIndex,
      canReplace,
      activeMode,
      bassCandidate,
      tonalKey,
    ],
  );
  const [preview, setPreview] = useState<{
    result: typeof result;
    index: number;
  }>();
  const selected = progression[selectedIndex];
  const following = progression[selectedIndex + 1];
  const last = progression.at(-1);
  const targetLabel =
    activeMode === 'replace' && selected
      ? `Replace ${chordSymbol(selected)}`
      : activeMode === 'between' && selected && following
        ? `${chordSymbol(selected)} → ? → ${chordSymbol(following)}`
        : activeMode === 'bass'
          ? `Bass ${rootLabel(voiceChord(candidate)[0]!.position)}`
          : last
            ? `${chordSymbol(last)} → ?`
            : 'First chord';
  const inferred =
    result.context.source === 'inferred' && result.context.confident
      ? result.context.hypotheses[0]?.key
      : undefined;
  const currentBass = rootLabel(voiceChord(candidate)[0]!.position);
  return (
    <section
      class={styles['panel']}
      aria-label="Chord suggestions"
      id="chord-suggestions"
    >
      <div class={styles['heading']}>
        <h2>Suggestions</h2>
        <span aria-label="Suggestion target" hidden={activeMode === 'bass'}>
          <MusicalText text={targetLabel} />
        </span>
        {activeMode === 'bass' && (
          <label class={styles['bassPicker']}>
            Bass
            <select
              aria-label="Suggestion bass"
              value={currentBass}
              onChange={(event) => {
                const pitch = roots.find(
                  (root) => root.id === event.currentTarget.value,
                )?.pitch;
                if (pitch)
                  onBassChange(setBass(candidate, { kind: 'pitch', pitch }));
              }}
            >
              {!roots.some((root) => root.id === currentBass) && (
                <option value={currentBass}>{currentBass}</option>
              )}
              {roots.map((root) => (
                <option
                  key={root.id}
                  value={root.id}
                  disabled={
                    !isAuditionable(
                      setBass(candidate, { kind: 'pitch', pitch: root.pitch }),
                    )
                  }
                >
                  {root.id}
                </option>
              ))}
            </select>
          </label>
        )}
        {inferred && (
          <span class={styles['inferred']}>
            Possibly <MusicalText text={rootLabel(inferred.tonic.position)} />{' '}
            {modeLabels[inferred.mode].toLowerCase()}
          </span>
        )}
      </div>
      <fieldset class={styles['modes']} aria-label="Suggestion purpose">
        {(Object.keys(labels) as SuggestionMode[]).map((value) => (
          <button
            type="button"
            key={value}
            aria-label={modeNames[value]}
            aria-pressed={activeMode === value}
            disabled={
              (value === 'replace' && !canReplace) ||
              (value === 'between' && !canInsert)
            }
            onClick={() => onMode(value)}
          >
            {labels[value]}
          </button>
        ))}
      </fieldset>
      <ul class={styles['list']}>
        {result.recommendations.map((item, index) => {
          const symbol = chordSymbol(item.chord);
          const reasons = item.reasons.map(reasonLabel);
          const primary =
            activeMode === 'bass'
              ? 'Same bass'
              : (reasons.find(
                  (reason) =>
                    ![
                      'Fits key',
                      'Shared tones',
                      'Smooth voices',
                      'Explore',
                    ].includes(reason),
                ) ?? reasons[0]!);
          return (
            <li key={index}>
              <button
                type="button"
                class={styles['preview']}
                aria-label={`Preview ${symbol}`}
                aria-pressed={
                  preview?.result === result && preview.index === index
                }
                title={reasons.join(' · ')}
                onClick={() => {
                  setPreview({ result, index });
                  onPreview(item.chord);
                }}
              >
                <strong>
                  <span aria-hidden="true" class={styles['play']}>
                    ▶
                  </span>{' '}
                  <MusicalText text={symbol} />
                </strong>
                <small>{primary}</small>
              </button>
              <button
                type="button"
                class={styles['apply']}
                aria-label={`${actions[activeMode]} suggestion ${symbol}`}
                onClick={() => onUse(item.chord, activeMode)}
              >
                {actions[activeMode]}
              </button>
            </li>
          );
        })}
      </ul>
      {!result.recommendations.length && <p>No playable matches</p>}
    </section>
  );
}
