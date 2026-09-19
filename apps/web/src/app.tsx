import styles from './app.module.css';

export function App() {
  return (
    <main class={styles['home']}>
      <h1>Rechorder</h1>
      <ul>
        <li>
          <a href={`${import.meta.env.BASE_URL}chord-progression/`}>
            Chord progression
          </a>
        </li>
        <li>
          <a href={`${import.meta.env.BASE_URL}piano/`}>Piano</a>
        </li>
        <li>
          <a href={`${import.meta.env.BASE_URL}harmonic-grid/`}>
            Harmonic grid
          </a>
        </li>
      </ul>
    </main>
  );
}
