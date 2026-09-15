import { useState } from 'preact/hooks';
import { tempoLimits } from '../audio/audition';
import type { AuditionController } from '../audio/audition';
import styles from './editor.module.css';

export function ProgressionSettings({
  controller,
}: {
  readonly controller: AuditionController;
}) {
  const [value, setValue] = useState(String(controller.tempo()));
  const apply = (input: HTMLInputElement) => {
    if (input.reportValidity()) controller.setTempo(input.valueAsNumber);
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
      <label>
        BPM{' '}
        <input
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
      </label>
    </form>
  );
}
