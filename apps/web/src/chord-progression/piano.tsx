import { useLayoutEffect, useRef } from 'preact/hooks';
import { pianoPitches, resolvePitches, standardTuning } from '@rechorder/music';
import type { ResolvedNote } from '@rechorder/music';
import type { AuditionController } from './audition';
import { MusicalText } from './musical-text';
import styles from './piano.module.css';

const keys = pianoPitches.map((pitch) => ({
  pitch,
  note: resolvePitches([pitch], standardTuning)[0]!,
}));

export function Piano({
  controller,
  notes,
}: {
  readonly controller: AuditionController;
  readonly notes: readonly ResolvedNote[];
}) {
  const viewport = useRef<HTMLDivElement>(null);
  function showOctave(octave: number) {
    const element = viewport.current;
    const key = element?.querySelector<HTMLElement>(
      `[data-octave="${octave}"]`,
    );
    if (element && key)
      element.scrollTo({
        left:
          element.scrollLeft +
          key.getBoundingClientRect().left -
          element.getBoundingClientRect().left,
      });
  }
  useLayoutEffect(() => {
    showOctave(3);
  }, []);
  return (
    <div class={styles['piano']}>
      <nav aria-label="Keyboard octave" class={styles['octaves']}>
        {[1, 2, 3, 4, 5].map((octave) => (
          <button
            type="button"
            key={octave}
            data-sounding={notes.some((note) => {
              const low = standardTuning.frequency({
                letter: 'C',
                accidental: 0,
                octave,
              });
              return note.frequency >= low && note.frequency < low * 2;
            })}
            onClick={() => showOctave(octave)}
          >
            C{octave}
          </button>
        ))}
      </nav>
      <div ref={viewport} class={styles['viewport']}>
        <fieldset class={styles['keys']} aria-label="Piano keyboard">
          {keys.map(({ pitch, note }) => {
            const black = pitch.position.accidental !== 0;
            const sounding = notes.some(
              (value) =>
                Math.abs(1200 * Math.log2(value.frequency / note.frequency)) <
                0.1,
            );
            const keyboardSource = `key:${note.label}`;
            return (
              <button
                type="button"
                key={note.label}
                class={black ? styles['black'] : styles['white']}
                data-octave={
                  pitch.position.letter === 'C' && !black
                    ? pitch.position.octave
                    : undefined
                }
                aria-label={`Play ${note.label}`}
                aria-pressed={sounding}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  void controller.press(`pointer:${event.pointerId}`, note);
                }}
                onPointerUp={(event) =>
                  controller.release(`pointer:${event.pointerId}`)
                }
                onPointerCancel={(event) =>
                  controller.release(`pointer:${event.pointerId}`)
                }
                onLostPointerCapture={(event) =>
                  controller.release(`pointer:${event.pointerId}`)
                }
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    if (!event.repeat)
                      void controller.press(keyboardSource, note);
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    controller.release(keyboardSource);
                  }
                }}
                onBlur={() => controller.release(keyboardSource)}
                onClick={(event) => {
                  if (event.detail === 0)
                    void controller.play([note], 'keyboard-accessibility');
                }}
              >
                <span>
                  <MusicalText
                    text={
                      pitch.position.letter +
                      (black ? '♯' : '') +
                      (pitch.position.letter === 'C'
                        ? pitch.position.octave
                        : '')
                    }
                  />
                </span>
              </button>
            );
          })}
        </fieldset>
      </div>
      <output
        class={styles['accessible']}
        aria-label="Currently playing notes"
        aria-live="polite"
      >
        {notes.length
          ? notes.map((note) => note.label).join('')
          : 'No notes playing'}
      </output>
    </div>
  );
}
