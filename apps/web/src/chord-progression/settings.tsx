import { useState } from 'preact/hooks';
import { tempoLimits } from '../audio/audition';
import type { AuditionController } from '../audio/audition';
import styles from './editor.module.css';

/** One beat per press keeps the pads useful for both fine and repeated changes. */
const tempoStep = 1;

export function ProgressionSettings({
  controller,
}: {
  readonly controller: AuditionController;
}) {
  const [value, setValue] = useState(String(controller.tempo()));
  const typed = Number.parseFloat(value);
  // Step from what the user is looking at; fall back to the applied tempo while
  // the field is empty or unparseable.
  const current = Number.isFinite(typed) ? typed : controller.tempo();
  const apply = (input: HTMLInputElement) => {
    if (input.reportValidity()) controller.setTempo(input.valueAsNumber);
  };
  const step = (delta: number) => {
    const next = Math.min(
      tempoLimits.max,
      Math.max(tempoLimits.min, current + delta),
    );
    setValue(String(next));
    controller.setTempo(next);
  };
  return (
    <form
      class={styles['settings']}
      aria-label="Progression settings"
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.querySelector('input');
        if (input) apply(input);
      }}
    >
      <div class={styles['tempo']}>
        <label htmlFor="progression-tempo">BPM</label>
        <button
          type="button"
          aria-label="Decrease tempo"
          disabled={current <= tempoLimits.min}
          onClick={() => step(-tempoStep)}
        >
          <span aria-hidden="true">−</span>
        </button>
        <input
          id="progression-tempo"
          type="number"
          inputMode="decimal"
          required
          min={tempoLimits.min}
          max={tempoLimits.max}
          step="any"
          value={value}
          onInput={(event) => setValue(event.currentTarget.value)}
          onBlur={(event) => apply(event.currentTarget)}
        />
        <button
          type="button"
          aria-label="Increase tempo"
          disabled={current >= tempoLimits.max}
          onClick={() => step(tempoStep)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </form>
  );
}
