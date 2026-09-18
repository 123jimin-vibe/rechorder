import { useState } from 'preact/hooks';
import {
  chordRole,
  chordSymbol,
  diatonicChord,
  isAuditionable,
  rootLabel,
} from '@rechorder/music';
import type { TonalContext, WesternChord } from '@rechorder/music';
import { MusicalText } from './musical-text';
import { designKey, modeLabels } from './tonal-context';
import styles from './editor.module.css';

/** Key-relative chord design: one pad per scale degree, as triads or sevenths. */
export function FunctionPads({
  context,
  candidate,
  onChoose,
}: {
  readonly context: TonalContext;
  readonly candidate: WesternChord;
  readonly onChoose: (chord: WesternChord) => void;
}) {
  const [seventh, setSeventh] = useState(false);
  const { key, certain } = designKey(context);
  const keyLabel = `${rootLabel(key.tonic.position)} ${modeLabels[key.mode].toLowerCase()}`;
  const pads = Array.from({ length: 7 }, (_, index) =>
    diatonicChord(key, index, seventh),
  );
  return (
    <fieldset class={styles['functionPads']} aria-label="Function">
      <legend>
        Function{' '}
        <span aria-label="Design key" class={styles['roleLabel']}>
          <MusicalText text={keyLabel} />
          {certain ? '' : '?'}
        </span>
      </legend>
      <div class={styles['tonePads']}>
        {pads.map((chord) => {
          const numeral = chordRole(chord, key).numeral;
          const symbol = chordSymbol(chord);
          return (
            <button
              type="button"
              key={numeral}
              aria-label={`Function ${numeral} (${symbol})`}
              aria-pressed={
                candidate.root.spelling === chord.root.spelling &&
                candidate.definition.id === chord.definition.id
              }
              disabled={!isAuditionable(chord)}
              onClick={() => onChoose(chord)}
            >
              <MusicalText text={numeral} />
              <small>
                <MusicalText text={symbol} />
              </small>
            </button>
          );
        })}
        <button
          type="button"
          class={styles['seventhToggle']}
          aria-label="Seventh chords"
          aria-pressed={seventh}
          onClick={() => setSeventh((value) => !value)}
        >
          7
        </button>
      </div>
    </fieldset>
  );
}
