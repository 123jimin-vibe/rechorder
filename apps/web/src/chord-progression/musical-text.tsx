import styles from './editor.module.css';

/** Tighten only the wide sharp glyph, retaining the complete accessible text. */
export function MusicalText({ text }: { readonly text: string }) {
  return (
    <>
      {text.split('♯').map((part, index) => (
        <span key={index}>
          {index > 0 && <span class={styles['sharp']}>♯</span>}
          {part}
        </span>
      ))}
    </>
  );
}
