import { useEffect, useRef, useState } from 'preact/hooks';
import type { AuditionController } from '../audio/audition';
import { GridContacts } from './contacts';
import {
  cellAt,
  cellCenter,
  cellId,
  hexPoints,
  visibleCells,
  type Cell,
  type Point,
} from './geometry';
import { gridNote, isPlayable } from './mapping';
import styles from './page.module.css';

const octaveHues = [280, 320, 15, 45, 145, 185, 220, 255, 290, 335] as const;

// This spatial instrument implements its own arrow/hold keyboard interaction.
// `application` is intentional: native buttons cannot represent a moving plane.
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

export function HarmonicGridPage({
  controller,
}: {
  readonly controller: AuditionController;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const [contacts] = useState(() => new GridContacts());
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [held, setHeld] = useState<readonly Cell[]>([]);
  const [focus, setFocus] = useState<Cell>({ q: 0, r: 0 });
  const keyboardNote = useRef<Cell | null>(null);
  const origin = { x: size.width / 2 + pan.x, y: size.height / 2 + pan.y };
  const focusedNote = gridNote(focus);
  const cells = visibleCells(size.width, size.height, origin);
  const heldIds = new Set(held.map(cellId));

  function refreshHeld() {
    setHeld([
      ...[...contacts.active.values()].map(({ cell }) => cell),
      ...(keyboardNote.current ? [keyboardNote.current] : []),
    ]);
  }

  function releaseKeyboard() {
    controller.release('grid:keyboard');
    // Preact refs are mutable lifecycle storage; the React rule misses this hook.
    // oxlint-disable-next-line react/immutability
    keyboardNote.current = null;
    refreshHeld();
  }

  function clear() {
    for (const id of contacts.active.keys()) controller.release(`grid:${id}`);
    contacts.clear();
    releaseKeyboard();
  }

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const releaseAll = () => {
      for (const id of contacts.active.keys()) controller.release(`grid:${id}`);
      contacts.clear();
      controller.release('grid:keyboard');
      keyboardNote.current = null;
      setHeld([]);
    };
    const visibility = () => {
      if (document.hidden) releaseAll();
    };
    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      releaseAll();
      window.removeEventListener('blur', releaseAll);
      window.removeEventListener('pagehide', releaseAll);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [contacts, controller]);

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !surface.current) return;
    event.preventDefault();
    const bounds = surface.current.getBoundingClientRect();
    const cell = cellAt({
      x: event.clientX - bounds.left - origin.x,
      y: event.clientY - bounds.top - origin.y,
    });
    if (
      !contacts.start(event.pointerId, cell, {
        x: event.clientX,
        y: event.clientY,
      })
    )
      return;
    surface.current.setPointerCapture(event.pointerId);
    const note = gridNote(cell);
    if (isPlayable(note))
      void controller.press(`grid:${event.pointerId}`, note);
    refreshHeld();
  }

  function pointerMove(event: PointerEvent) {
    const delta = contacts.move(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (delta.x || delta.y)
      setPan((previous) => ({
        x: previous.x + delta.x,
        y: previous.y + delta.y,
      }));
  }

  function pointerEnd(event: PointerEvent) {
    if (!contacts.end(event.pointerId)) return;
    controller.release(`grid:${event.pointerId}`);
    refreshHeld();
  }

  function keyDown(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat || keyboardNote.current) return;
      // Preact refs are mutable lifecycle storage; the React rule misses this hook.
      // oxlint-disable-next-line react/immutability
      keyboardNote.current = focus;
      if (isPlayable(focusedNote))
        void controller.press('grid:keyboard', focusedNote);
      refreshHeld();
      return;
    }
    const directions: Record<string, Cell> = {
      ArrowLeft: { q: -1, r: 0 },
      ArrowRight: { q: 1, r: 0 },
      ArrowUp: { q: 0, r: -1 },
      ArrowDown: { q: 0, r: 1 },
    };
    const direction = directions[event.key];
    if (!direction && event.key !== 'Home') return;
    event.preventDefault();
    const next = direction
      ? { q: focus.q + direction.q, r: focus.r + direction.r }
      : { q: 0, r: 0 };
    setFocus(next);
    const center = cellCenter(next);
    setPan({ x: -center.x, y: -center.y });
  }

  return (
    <main class={styles['page']}>
      <div
        ref={surface}
        class={styles['surface']}
        role="application"
        aria-label={`Harmonic grid, Pythagorean tuning. ${focusedNote.description}${isPlayable(focusedNote) ? '' : ', outside instrument range'}`}
        aria-describedby="grid-instructions"
        tabIndex={0}
        data-pan-x={pan.x}
        data-pan-y={pan.y}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onLostPointerCapture={pointerEnd}
        onFocus={() => {
          const center = cellCenter(focus);
          setPan({ x: -center.x, y: -center.y });
        }}
        onBlur={clear}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={keyDown}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            releaseKeyboard();
          }
        }}
      >
        <svg
          class={styles['grid']}
          aria-hidden="true"
          width="100%"
          height="100%"
        >
          {cells.map((cell) => {
            const id = cellId(cell);
            const center = cellCenter(cell);
            const note = gridNote(cell);
            const octaveColor =
              ((note.octave % octaveHues.length) + octaveHues.length) %
              octaveHues.length;
            return (
              <g
                key={id}
                transform={`translate(${center.x + origin.x} ${center.y + origin.y})`}
                class={styles['cell']}
                data-cell={id}
                data-note={note.label}
                data-octave={note.octave}
                style={{ '--octave-hue': octaveHues[octaveColor] }}
                data-held={heldIds.has(id)}
                data-playable={isPlayable(note)}
                data-focused={cellId(focus) === id}
              >
                <polygon points={hexPoints} />
                <title>{note.description}</title>
                <text text-anchor="middle" y="8">
                  <tspan>{note.letter}</tspan>
                  <tspan class={styles['accidental']}>{note.accidental}</tspan>
                  <tspan class={styles['comma']}>{note.arrow}</tspan>
                  <tspan class={styles['commaCount']}>{note.count}</tspan>
                  <tspan class={styles['octave']} dx="1.5" dy="3">
                    {note.octave}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <a
        class={styles['back']}
        href={import.meta.env.BASE_URL}
        aria-label="Rechorder home"
        title="Rechorder home"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14 7-5 5 5 5" />
        </svg>
      </a>
      <p id="grid-instructions" class={styles['srOnly']}>
        Hold notes to play. Drag while holding to move the grid. Use multiple
        fingers for chords. Right is a pure fifth; down-right is a Pythagorean
        major third. With a keyboard, use arrows to choose notes, Space or Enter
        to hold, and Home to return to C4. Dimmed notes are outside the
        instrument range. Up and down arrows raise or lower the named
        Pythagorean note by the exact comma ratio 531441 to 524288. A number
        beside an arrow counts commas; the lower number is the octave.
      </p>
    </main>
  );
}
