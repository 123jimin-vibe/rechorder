import { useState } from 'preact/hooks';
import {
  chordTones,
  voicedTones,
  setToneVoicing,
  setChordDegree,
  isAuditionable,
  rootLabel,
  transpositionIntervals,
  transposeChord,
  enharmonicSpellings,
  respellChord,
} from '@rechorder/music';
import type { WesternChord, WesternInterval } from '@rechorder/music';
import { MusicalText } from './musical-text';
import styles from './editor.module.css';

interface OptionsProps {
  readonly chord: WesternChord;
  readonly onChange: (chord: WesternChord) => void;
}

export function HarmonicOptions({ chord, onChange }: OptionsProps) {
  const tones = chordTones(chord);
  return (
    <div class={styles['extras']}>
      <details>
        <summary>Chord tones</summary>
        <fieldset aria-label="Defined chord tones" class={styles['tonePads']}>
          {tones.map((tone) => (
            <button
              key={tone.degree}
              type="button"
              disabled={tone.degree === 1}
              aria-label={`Include degree ${tone.label}`}
              aria-pressed="true"
              onClick={() =>
                onChange(setChordDegree(chord, tone.degree, false))
              }
            >
              <MusicalText text={rootLabel(tone.pitch.position)} />
              <small>{tone.label}</small>
            </button>
          ))}
          {chord.omissions.map((degree) => (
            <button
              key={degree}
              type="button"
              aria-label={`Include degree ${degree}`}
              aria-pressed="false"
              onClick={() => onChange(setChordDegree(chord, degree, true))}
            >
              no{degree}
            </button>
          ))}
        </fieldset>
        <fieldset aria-label="Add chord tones" class={styles['compactRow']}>
          {[2, 4, 6, 9, 11, 13]
            .filter(
              (degree) =>
                !tones.some((tone) => tone.degree === degree) &&
                !chord.omissions.includes(degree),
            )
            .map((degree) => {
              const next = setChordDegree(chord, degree, true);
              return (
                <button
                  key={degree}
                  type="button"
                  disabled={!isAuditionable(next)}
                  onClick={() => onChange(next)}
                >
                  Add {degree}
                </button>
              );
            })}
        </fieldset>
      </details>
    </div>
  );
}

export function VoicingOptions({ chord, onChange }: OptionsProps) {
  const tones = voicedTones(chord);
  const octaveChord = (direction: number): WesternChord => ({
    ...chord,
    voicing: { ...chord.voicing, octave: chord.voicing.octave + direction },
  });
  function toneChange(
    degree: number,
    offsets: readonly number[],
  ): WesternChord | null {
    try {
      const next = setToneVoicing(chord, degree, offsets);
      return isAuditionable(next) ? next : null;
    } catch {
      return null;
    }
  }
  return (
    <fieldset class={styles['voicing']} aria-label="Voicing">
      <legend>Voicing</legend>
      <div class={styles['compactRow']}>
        {(['close', 'open'] as const).map((kind) => {
          const next = {
            ...chord,
            voicing: { ...chord.voicing, kind, tones: [] },
          };
          return (
            <button
              key={kind}
              type="button"
              aria-label={`${kind === 'close' ? 'Close' : 'Open'} voicing`}
              aria-pressed={
                chord.voicing.kind === kind && chord.voicing.tones.length === 0
              }
              disabled={!isAuditionable(next)}
              onClick={() => onChange(next)}
            >
              {kind === 'close' ? 'Close' : 'Open'}
            </button>
          );
        })}
        <fieldset class={styles['stepper']} aria-label="Chord octave">
          <button
            type="button"
            aria-label="Lower chord octave"
            disabled={!isAuditionable(octaveChord(-1))}
            onClick={() => onChange(octaveChord(-1))}
          >
            −
          </button>
          <span>
            Octave {chord.voicing.octave > 0 ? '+' : ''}
            {chord.voicing.octave}
          </span>
          <button
            type="button"
            aria-label="Raise chord octave"
            disabled={!isAuditionable(octaveChord(1))}
            onClick={() => onChange(octaveChord(1))}
          >
            +
          </button>
        </fieldset>
      </div>
      <details class={styles['noteVoicing']}>
        <summary>Voiced notes</summary>
        {tones.map((tone) => {
          const name = rootLabel(tone.pitch.position);
          const toggled = toneChange(
            tone.degree,
            tone.offsets.length ? [] : [0],
          );
          const doubled = toneChange(tone.degree, [
            ...tone.offsets,
            Math.max(0, ...tone.offsets) + 1,
          ]);
          return (
            <fieldset
              class={styles['voiceRow']}
              key={tone.degree}
              aria-label={`Voice ${name} (${tone.label})`}
            >
              <label>
                <input
                  type="checkbox"
                  aria-label={`Sound ${name} (${tone.label})`}
                  checked={tone.offsets.length > 0}
                  disabled={!toggled}
                  onChange={() => {
                    if (toggled) onChange(toggled);
                  }}
                />
                <MusicalText text={name} />
                <small>{tone.label}</small>
              </label>
              <div class={styles['voiceCopies']}>
                {tone.offsets.map((offset, index) => (
                  <span key={index}>
                    <select
                      aria-label={`${name} voice ${index + 1} octave`}
                      value={offset}
                      onChange={(event) => {
                        const next = toneChange(
                          tone.degree,
                          tone.offsets.map((value, i) =>
                            i === index
                              ? Number(event.currentTarget.value)
                              : value,
                          ),
                        );
                        if (next) onChange(next);
                      }}
                    >
                      {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((value) => (
                        <option
                          value={value}
                          key={value}
                          disabled={
                            !toneChange(
                              tone.degree,
                              tone.offsets.map((old, i) =>
                                i === index ? value : old,
                              ),
                            )
                          }
                        >
                          {name}
                          {tone.pitch.position.octave +
                            chord.voicing.octave +
                            value}
                        </option>
                      ))}
                    </select>
                    {index > 0 && (
                      <button
                        type="button"
                        aria-label={`Drop ${name} doubling ${index}`}
                        onClick={() => {
                          const next = toneChange(
                            tone.degree,
                            tone.offsets.filter((_, i) => i !== index),
                          );
                          if (next) onChange(next);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <button
                type="button"
                aria-label={`Double ${name}`}
                disabled={!tone.offsets.length || !doubled}
                onClick={() => {
                  if (doubled) onChange(doubled);
                }}
              >
                +
              </button>
            </fieldset>
          );
        })}
      </details>
    </fieldset>
  );
}

export function TransformOptions({
  chord,
  onChange,
  progression,
  onTransposeProgression,
}: OptionsProps & {
  readonly progression: readonly WesternChord[];
  readonly onTransposeProgression: (interval: WesternInterval) => void;
}) {
  const [intervalIndex, setIntervalIndex] = useState(0);
  const [scope, setScope] = useState('candidate');
  const interval = transpositionIntervals[intervalIndex]!;
  const spellings = enharmonicSpellings(chord.root);
  return (
    <div class={styles['extras']}>
      <details>
        <summary>Transpose & spelling</summary>
        <fieldset aria-label="Transpose" class={styles['compactRow']}>
          <select
            aria-label="Transpose scope"
            value={scope}
            onChange={(event) => setScope(event.currentTarget.value)}
          >
            <option value="candidate">Candidate</option>
            <option value="progression">Progression</option>
          </select>
          <select
            aria-label="Transpose interval"
            value={intervalIndex}
            onChange={(event) =>
              setIntervalIndex(Number(event.currentTarget.value))
            }
          >
            {transpositionIntervals.map((value, index) => (
              <option key={value.label} value={index}>
                {value.label}
              </option>
            ))}
          </select>
          {[-1, 1].map((direction) => {
            const shift = {
              diatonicSteps: direction * interval.diatonicSteps,
              chromaticSteps: direction * interval.chromaticSteps,
            };
            const next = transposeChord(chord, shift);
            const allowed =
              isAuditionable(next) &&
              (scope === 'candidate' ||
                (progression.length > 0 &&
                  progression.every((value) =>
                    isAuditionable(transposeChord(value, shift)),
                  )));
            return (
              <button
                key={direction}
                type="button"
                aria-label={direction < 0 ? 'Transpose down' : 'Transpose up'}
                disabled={!allowed}
                onClick={() =>
                  scope === 'candidate'
                    ? onChange(next)
                    : onTransposeProgression(shift)
                }
              >
                {direction < 0 ? '↓' : '↑'}
              </button>
            );
          })}
        </fieldset>
        <fieldset class={styles['compactRow']} aria-label="Enharmonic spelling">
          <legend>Candidate spelling</legend>
          {spellings.map((pitch) => (
            <button
              key={pitch.spelling}
              type="button"
              aria-label={`Spell root ${rootLabel(pitch.position)}`}
              aria-pressed={pitch.spelling === chord.root.spelling}
              onClick={() => onChange(respellChord(chord, pitch))}
            >
              <MusicalText text={rootLabel(pitch.position)} />
            </button>
          ))}
        </fieldset>
      </details>
    </div>
  );
}
