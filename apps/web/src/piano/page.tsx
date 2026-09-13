import { useSoundingNotes } from '../audio/use-sounding-notes';
import type { AuditionController } from '../audio/audition';
import { PianoKeyboard } from '../components/piano-keyboard';
import { RotatableView } from '../components/rotatable-view';
import styles from './page.module.css';

export function PianoPage({
  controller,
}: {
  readonly controller: AuditionController;
}) {
  const sounding = useSoundingNotes(controller);
  const notes = sounding.map((item) => item.note);
  return (
    <RotatableView className={styles['page']!}>
      <header class={styles['header']}>
        <a href={import.meta.env.BASE_URL}>Rechorder</a>
        <h1>Piano</h1>
      </header>
      <div class={styles['rows']}>
        {(['Upper', 'Lower'] as const).map((row) => (
          <section
            class={styles['row']}
            aria-label={`${row} keyboard`}
            key={row}
          >
            <PianoKeyboard
              controller={controller}
              notes={notes}
              sourceId={`piano:${row.toLowerCase()}`}
              label={`${row} piano keyboard`}
              fill
            />
          </section>
        ))}
      </div>
    </RotatableView>
  );
}
