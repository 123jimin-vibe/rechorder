import {
  alterChord,
  chordAlterations,
  chordRecipe,
  createChord,
  jazzDefinitions,
  roots,
} from '@rechorder/music';
import type { WesternChord } from '@rechorder/music';
import { MusicalText } from './musical-text';
import styles from './editor.module.css';

export const rootPads = [1, 0, -1].flatMap((accidental) =>
  roots.filter((root) => root.pitch.position.accidental === accidental),
);

export function ChordOptions({
  chord,
  onChange,
}: {
  readonly chord: WesternChord;
  readonly onChange: (chord: WesternChord) => void;
}) {
  const recipe = chordRecipe(chord);
  const rootId = roots.find(
    (root) =>
      root.pitch.position.letter === chord.root.position.letter &&
      root.pitch.position.accidental === chord.root.position.accidental,
  )?.id;
  const bassId = roots.find(
    (root) =>
      root.pitch.position.letter === chord.bass?.position.letter &&
      root.pitch.position.accidental === chord.bass.position.accidental,
  )?.id;
  return (
    <div class={styles['extras']}>
      <details>
        <summary>Jazz & extensions</summary>
        <fieldset aria-label="Jazz chords" class={styles['types']}>
          {jazzDefinitions.map((definition) => (
            <button
              type="button"
              key={definition.id}
              aria-label={definition.label}
              aria-pressed={recipe.definitionId === definition.id}
              onClick={() => {
                if (rootId)
                  onChange(createChord(rootId, definition.id, bassId));
              }}
            >
              <MusicalText text={definition.suffix} />
            </button>
          ))}
        </fieldset>
        <fieldset class={styles['alterations']}>
          <legend>Alterations</legend>
          {chordAlterations.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-label={`Alter ${item.id}`}
              aria-pressed={recipe.alterations.includes(item.id)}
              onClick={() => {
                const remaining = recipe.alterations.filter(
                  (id) =>
                    chordAlterations.find((other) => other.id === id)?.interval
                      .diatonicSteps !== item.interval.diatonicSteps,
                );
                onChange(
                  alterChord(
                    chord,
                    recipe.alterations.includes(item.id)
                      ? remaining
                      : [...remaining, item.id],
                  ),
                );
              }}
            >
              <MusicalText text={item.id} />
            </button>
          ))}
        </fieldset>
      </details>
      <details>
        <summary>
          Bass
          {bassId ? (
            <span>
              {' '}
              / <MusicalText text={bassId} />
            </span>
          ) : null}
        </summary>
        <fieldset aria-label="Slash bass">
          <button
            type="button"
            aria-pressed={!chord.bass}
            onClick={() => {
              const { bass: _bass, ...rest } = chord;
              onChange(rest);
            }}
          >
            No slash
          </button>
          <div class={styles['roots']}>
            {rootPads.map((root) => (
              <button
                type="button"
                key={root.id}
                aria-label={`Bass ${root.id}`}
                aria-pressed={root.id === bassId}
                onClick={() => onChange({ ...chord, bass: root.pitch })}
              >
                <MusicalText text={root.id} />
              </button>
            ))}
          </div>
        </fieldset>
      </details>
    </div>
  );
}
