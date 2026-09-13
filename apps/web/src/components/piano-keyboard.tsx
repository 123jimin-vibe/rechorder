import { useLayoutEffect, useRef } from 'preact/hooks';
import {
  pianoPitches,
  resolvePitches,
  standardTuning,
  defaultChordOctave,
} from '@rechorder/music';
import type { ResolvedNote } from '@rechorder/music';
import styles from './piano-keyboard.module.css';

export interface PianoPlayer {
  press(source: string, note: ResolvedNote): Promise<void>;
  release(source: string): void;
  play(notes: readonly ResolvedNote[], source: string): Promise<void>;
}

const octaves = [
  ...new Set(pianoPitches.map((pitch) => pitch.position.octave)),
];

const keys = pianoPitches.map((pitch) => ({
  pitch,
  note: resolvePitches([pitch], standardTuning)[0]!,
}));

export function PianoKeyboard({
  controller,
  notes,
  sourceId = 'chord-piano',
  label = 'Piano keyboard',
  fill = false,
}: {
  readonly controller: PianoPlayer;
  readonly notes: readonly ResolvedNote[];
  readonly sourceId?: string;
  readonly label?: string;
  readonly fill?: boolean;
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
    showOctave(defaultChordOctave);
  }, []);
  return (
    <div class={`${styles['piano']} ${fill ? styles['fill'] : ''}`}>
      {!fill && (
        <nav aria-label="Keyboard octave" class={styles['octaves']}>
          {octaves.map((octave) => (
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
      )}
      <div
        ref={viewport}
        class={styles['viewport']}
        data-keyboard-scroll={sourceId}
      >
        <fieldset class={styles['keys']} aria-label={label}>
          {keys.map(({ pitch, note }) => {
            const black = pitch.position.accidental !== 0;
            const sounding = notes.some(
              (value) =>
                Math.abs(1200 * Math.log2(value.frequency / note.frequency)) <
                0.1,
            );
            const keyboardSource = `${sourceId}:key:${note.label}`;
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
                  void controller.press(
                    `${sourceId}:pointer:${event.pointerId}`,
                    note,
                  );
                }}
                onPointerUp={(event) =>
                  controller.release(`${sourceId}:pointer:${event.pointerId}`)
                }
                onPointerCancel={(event) =>
                  controller.release(`${sourceId}:pointer:${event.pointerId}`)
                }
                onLostPointerCapture={(event) =>
                  controller.release(`${sourceId}:pointer:${event.pointerId}`)
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
                    void controller.play(
                      [note],
                      `${sourceId}:keyboard-accessibility`,
                    );
                }}
              >
                <span>
                  {pitch.position.letter}
                  {black ? '♯' : ''}
                  {pitch.position.letter === 'C' ? pitch.position.octave : ''}
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
