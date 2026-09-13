import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import styles from './rotatable-view.module.css';

/** Rotate the utility's own viewport without changing device orientation. */
export function RotatableView({
  children,
  className = '',
}: {
  readonly children: ComponentChildren;
  readonly className?: string;
}) {
  const [rotated, setRotated] = useState(false);
  return (
    <main class={`${styles['view']} ${className}`} data-rotated={rotated}>
      <button
        class={styles['rotate']}
        type="button"
        aria-label={
          rotated ? 'Return to upright view' : 'Rotate view 90 degrees'
        }
        aria-pressed={rotated}
        onClick={() => setRotated((value) => !value)}
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
          <path d="M4 11a8 8 0 1 1 3 6" />
          <path d="M4 17v-6h6" />
        </svg>
        <span>Rotate</span>
      </button>
      {children}
    </main>
  );
}
