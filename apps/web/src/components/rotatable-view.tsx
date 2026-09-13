import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ViewOrientation } from './view-orientation';
import type { QuarterTurn } from './view-orientation';
import styles from './rotatable-view.module.css';

/** Rotate the utility's own viewport without changing device orientation. */
export function RotatableView({
  children,
  className = '',
}: {
  readonly children: ComponentChildren;
  readonly className?: string;
}) {
  const [turn, setTurn] = useState<QuarterTurn>(0);
  return (
    <ViewOrientation.Provider value={turn}>
      <main
        class={`${styles['view']} ${className}`}
        data-orientation={turn * 90}
      >
        <button
          class={styles['rotate']}
          type="button"
          aria-label="Rotate view 90 degrees clockwise"
          onClick={() => setTurn((value) => ((value + 1) % 4) as QuarterTurn)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <span>Rotate</span>
        </button>
        {children}
      </main>
    </ViewOrientation.Provider>
  );
}
