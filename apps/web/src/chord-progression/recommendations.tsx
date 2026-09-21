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
  RecommendationFocus,
  RecommendationReason,
  TonalKey,
  WesternChord,
} from '@rechorder/music';
import { MusicalText } from './musical-text';
import { assumedKey, modeLabels } from './tonal-context';
import styles from './recommendations.module.css';

export type SuggestionMode = 'next' | 'replace' | 'between' | 'bass';
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
/** Design moves; theory shorthand keeps labels short on narrow screens. */
const focusLabels: Readonly<Record<RecommendationFocus, string>> = {
  dominant: 'V→I',
  'ii-v': 'ii–V',
  'fifth-down': '↓5th',
  'fifth-up': '↑5th',
  step: 'Step',
  third: '3rd',
  color: 'Color',
  'leading-tone': 'Leading tone',
  'same-root': 'Same root',
  tritone: 'Tritone',
};
const focusNames: Readonly<Record<RecommendationFocus, string>> = {
  dominant: 'Dominant resolution',
  'ii-v': 'ii–V motion',
  'fifth-down': 'Fifth down',
  'fifth-up': 'Fifth up',
  step: 'Stepwise root',
  third: 'Third-related root',
  color: 'Applied or borrowed color',
  'leading-tone': 'Leading-tone resolution',
  'same-root': 'Same root',
  tritone: 'Tritone root',
};
const focusChoices: readonly RecommendationFocus[] = [
  'dominant',
  'ii-v',
  'fifth-down',
  'fifth-up',
  'step',
  'third',
  'color',
];

function reasonLabel(reason: RecommendationReason): string {
  switch (reason.kind) {
    case 'role':
      return reason.numeral;
    case 'motion':
      return reason.side === 'after'
        ? `${focusLabels[reason.move]} to next`
        : focusLabels[reason.move];
    case 'bass-line':
      return 'Bass line';
    case 'fixed-bass':
      return 'Same bass';
    case 'smooth-voices':
      return 'Smooth voices';
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
  const [focus, setFocus] = useState<RecommendationFocus>();
  // Moves need a neighbor; the first chord has none.
  const activeFocus = progression.length ? focus : undefined;
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
        // An empty progression intentionally begins from the builder's assumed key.
        ...(tonalKey
          ? { key: tonalKey }
          : progression.length
            ? {}
            : { key: assumedKey }),
        ...(activeFocus ? { focus: activeFocus } : {}),
      }),
    [
      progression,
      selectedIndex,
      canReplace,
      activeMode,
      bassCandidate,
      tonalKey,
      activeFocus,
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
  const scores = result.recommendations.map((item) => item.score);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
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
      <fieldset class={styles['focus']} aria-label="Suggestion move">
        <button
          type="button"
          aria-label="Any move"
          aria-pressed={!activeFocus}
          onClick={() => setFocus(undefined)}
        >
          Any
        </button>
        {focusChoices.map((value) => (
          <button
            type="button"
            key={value}
            aria-label={focusNames[value]}
            aria-pressed={activeFocus === value}
            disabled={!progression.length}
            onClick={() => setFocus(value)}
          >
            <MusicalText text={focusLabels[value]} />
          </button>
        ))}
      </fieldset>
      <ul class={styles['list']}>
        {result.recommendations.map((item, index) => {
          const symbol = chordSymbol(item.chord);
          const reasons = item.reasons.map(reasonLabel);
          const relativeScore =
            highestScore === lowestScore
              ? 100
              : Math.round(
                  15 +
                    (85 * (item.score - lowestScore)) /
                      (highestScore - lowestScore),
                );
          // Numeral first, then the strongest move; details stay in the tooltip.
          const numeral = item.reasons.find((reason) => reason.kind === 'role');
          const move = item.reasons.find(
            (reason) =>
              reason.kind === 'bass-line' ||
              (reason.kind === 'motion' && reason.side === 'before'),
          );
          const primary = [
            ...(numeral ? [reasonLabel(numeral)] : []),
            ...(activeMode === 'bass'
              ? ['Same bass']
              : move
                ? [reasonLabel(move)]
                : []),
          ];
          const { assessment } = item;
          const texture = `Modeled harmonicity ${assessment.harmonicity.toFixed(2)} · roughness ${assessment.roughness.toFixed(3)} at a C4 bass${assessment.movementSemitones === null ? '' : ` · voice movement ${assessment.movementSemitones.toFixed(1)} semitones`}`;
          const detail = primary.join(' · ') || reasons[0]!;
          return (
            <li key={index}>
              <div className={styles['suggestion']}>
                <button
                  type="button"
                  class={styles['preview']}
                  aria-label={`Preview ${symbol}`}
                  aria-pressed={
                    preview?.result === result && preview.index === index
                  }
                  title={[...reasons, texture].join(' · ')}
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
                  <small>
                    <MusicalText text={detail} />
                  </small>
                </button>
                <meter
                  class={styles['score']}
                  aria-label={`Relative score for ${symbol}`}
                  min={0}
                  max={100}
                  value={relativeScore}
                  title={`Relative score ${relativeScore}/100 · heuristic ${item.score.toFixed(2)}`}
                />
              </div>
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
      {!result.recommendations.length && (
        <p>
          {activeFocus
            ? 'No chord makes this move here'
            : 'No playable matches'}
        </p>
      )}
    </section>
  );
}
