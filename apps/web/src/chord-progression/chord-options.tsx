import {
  alterChord,
  chordAlterations,
  chordRecipe,
  chooseChord,
  chordTones,
  bassRole,
  bassPitch,
  setBass,
  rootLabel,
  isAuditionable,
  jazzDefinitions,
  roots,
} from '@rechorder/music';
import type { WesternChord } from '@rechorder/music';
import { MusicalText } from './musical-text';
import styles from './editor.module.css';

export const rootPads = [1, 0, -1].flatMap((accidental) =>
  roots.filter((root) => root.pitch.position.accidental === accidental),
);

interface OptionsProps {
  readonly chord: WesternChord;
  readonly onChange: (chord: WesternChord) => void;
}

export function JazzOptions({ chord, onChange }: OptionsProps) {
  const recipe = chordRecipe(chord);
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
              disabled={
                !isAuditionable(chooseChord(chord, chord.root, definition.id))
              }
              onClick={() =>
                onChange(chooseChord(chord, chord.root, definition.id))
              }
            >
              <MusicalText text={definition.suffix} />
            </button>
          ))}
        </fieldset>
        <fieldset class={styles['alterations']}>
          <legend>Alterations</legend>
          {chordAlterations.map((item) => {
            const remaining = recipe.alterations.filter(
              (id) =>
                chordAlterations.find((other) => other.id === id)?.interval
                  .diatonicSteps !== item.interval.diatonicSteps,
            );
            const next = alterChord(
              chord,
              recipe.alterations.includes(item.id)
                ? remaining
                : [...remaining, item.id],
            );
            return (
              <button
                type="button"
                key={item.id}
                aria-label={`Alter ${item.id}`}
                aria-pressed={recipe.alterations.includes(item.id)}
                disabled={!isAuditionable(next)}
                onClick={() => onChange(next)}
              >
                <MusicalText text={item.id} />
              </button>
            );
          })}
        </fieldset>
      </details>
    </div>
  );
}

export function BassOptions({ chord, onChange }: OptionsProps) {
  const tones = chordTones(chord);
  const bass = bassPitch(chord) ?? chord.root;
  const role = bassRole(chord);
  return (
    <fieldset class={styles['bassOptions']} aria-label="Bass">
      <legend>
        Bass{' '}
        <span aria-label="Bass position" class={styles['roleLabel']}>
          {role.label}
        </span>
      </legend>
      <div class={styles['tonePads']}>
        {tones.map((tone) => (
          <button
            type="button"
            key={tone.degree}
            aria-label={`Bass ${rootLabel(tone.pitch.position)} (${tone.label})`}
            aria-pressed={role.member?.degree === tone.degree}
            disabled={
              !isAuditionable(
                setBass(
                  chord,
                  tone.degree === 1
                    ? undefined
                    : { kind: 'degree', degree: tone.degree },
                ),
              )
            }
            onClick={() =>
              onChange(
                setBass(
                  chord,
                  tone.degree === 1
                    ? undefined
                    : { kind: 'degree', degree: tone.degree },
                ),
              )
            }
          >
            <MusicalText text={rootLabel(tone.pitch.position)} />
            <small>{tone.label}</small>
          </button>
        ))}
      </div>
      <details class={styles['otherBass']}>
        <summary>
          Other bass
          {!role.member && (
            <span>
              {' '}
              / <MusicalText text={rootLabel(bass.position)} />
            </span>
          )}
        </summary>
        <div class={styles['roots']}>
          {rootPads.map((root) => {
            const relation = bassRole(chord, root.pitch);
            return relation.member ? (
              <span key={root.id} />
            ) : (
              <button
                type="button"
                key={root.id}
                aria-label={`Bass ${root.id}`}
                disabled={
                  !isAuditionable(
                    setBass(chord, { kind: 'pitch', pitch: root.pitch }),
                  )
                }
                title={relation.label}
                data-equivalent={Boolean(relation.equivalent)}
                aria-pressed={rootLabel(bass.position) === root.id}
                onClick={() =>
                  onChange(setBass(chord, { kind: 'pitch', pitch: root.pitch }))
                }
              >
                <MusicalText text={root.id} />
                {relation.equivalent && (
                  <small> ≈{relation.equivalent.label}</small>
                )}
              </button>
            );
          })}
        </div>
      </details>
    </fieldset>
  );
}
