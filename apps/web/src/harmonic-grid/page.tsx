import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
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
import {
  gridNote,
  gridPosition,
  isPlayable,
  layouts,
  pitchId,
  positionNote,
  type GridLayout,
} from './mapping';
import {
  chordCompletions,
  chordMovement,
  chordName,
  chordProfile,
  exploreAdditions,
  invertChord,
  keyMembers,
  shiftOctave,
  sortPitches,
  uniquePitches,
  validChord,
  type GridChord,
} from './harmony';
import styles from './page.module.css';

const octaveHues = [280, 320, 15, 45, 145, 185, 220, 255, 290, 335] as const;
const tonics = [
  ['C', 0],
  ['D♭', -5],
  ['C♯', 7],
  ['D', 2],
  ['E♭', -3],
  ['E', 4],
  ['F', -1],
  ['F♯', 6],
  ['G♭', -6],
  ['G', 1],
  ['A♭', -4],
  ['A', 3],
  ['B♭', -2],
  ['B', 5],
] as const;

// This spatial instrument implements its own arrow/hold keyboard interaction.
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
export function HarmonicGridPage({
  controller,
}: {
  readonly controller: AuditionController;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const [contacts] = useState(() => new GridContacts());
  const [taps] = useState(
    () => new Map<number, { start: Point; moved: boolean }>(),
  );
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [held, setHeld] = useState<readonly Cell[]>([]);
  const [focus, setFocus] = useState<Cell>({ q: 0, r: 0 });
  const keyboardNote = useRef<Cell | null>(null);
  const [layout, setLayout] = useState<GridLayout>('thirds');
  const [octave, setOctave] = useState(0);
  const [latch, setLatch] = useState(false);
  const [selected, setSelected] = useState<GridChord>([]);
  const [previous, setPrevious] = useState<GridChord>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [panel, setPanel] = useState<'chords' | 'voicing' | 'grid' | null>(
    null,
  );
  const [fixedBass, setFixedBass] = useState(false);
  const [tonic, setTonic] = useState<number | null>(null);
  const [mode, setMode] = useState<'major' | 'minor'>('major');
  const [playing, setPlaying] = useState(false);
  const [sounding, setSounding] = useState<readonly string[]>([]);
  const origin = { x: size.width / 2 + pan.x, y: size.height / 2 + pan.y };
  const focusedNote = gridNote(focus, layout, octave);
  const cells = visibleCells(size.width, size.height, origin);
  const heldIds = new Set(held.map(cellId));
  const candidate = useMemo(
    () =>
      uniquePitches([
        ...selected,
        ...held
          .map((cell) => gridPosition(cell, layout, octave))
          .filter((note) => isPlayable(positionNote(note))),
      ]).slice(0, 16),
    [selected, held, layout, octave],
  );
  const selectedIds = new Set(selected.map(pitchId));
  const selectedFifths = new Set(candidate.map((note) => note.fifths));
  const previousFifths = new Set(previous.map((note) => note.fifths));
  const completions = chordCompletions(candidate);
  const chosen = completions.find((chord) => chord.id === preview);
  const matches = chosen ? [chosen] : completions;
  const scale = keyMembers(tonic, mode);
  const name = chordName(candidate);
  const profile = useMemo(() => chordProfile(candidate), [candidate]);
  const explorations = useMemo(() => exploreAdditions(candidate), [candidate]);
  const movement = useMemo(
    () =>
      previous.length && candidate.length
        ? chordMovement(previous, candidate)
        : null,
    [previous, candidate],
  );

  function refreshHeld() {
    setHeld(
      [...contacts.active.values()]
        .map(({ cell }) => cell)
        .concat(keyboardNote.current ? [keyboardNote.current] : []),
    );
  }

  function releaseKeyboard() {
    controller.release('grid:keyboard');
    // oxlint-disable-next-line react/immutability
    keyboardNote.current = null;
    refreshHeld();
  }

  function clearContacts() {
    for (const id of contacts.active.keys()) controller.release(`grid:${id}`);
    contacts.clear();
    taps.clear();
    releaseKeyboard();
  }

  function stopAudio() {
    controller.stopAll();
    setPlaying(false);
    setSounding([]);
  }

  function stopAudition() {
    controller.stopProgression();
    controller.stopSource('grid:chord');
    setPlaying(false);
  }

  function changeChord(notes: GridChord | null, audition = false) {
    if (!notes) return;
    stopAudio();
    clearContacts();
    setSelected(notes);
    setPreview(null);
    if (audition && notes.length)
      void controller.play(notes.map(positionNote), 'grid:chord');
  }

  function toggleNote(cell: Cell) {
    const note = gridPosition(cell, layout, octave);
    if (!isPlayable(positionNote(note))) return;
    setPreview(null);
    setSelected((current) => {
      const id = pitchId(note);
      if (current.some((item) => pitchId(item) === id))
        return current.filter((item) => pitchId(item) !== id);
      const next = [...current, note];
      return validChord(next) ? next : current;
    });
  }

  function remap(nextLayout: GridLayout, nextOctave: number) {
    stopAudio();
    clearContacts();
    setLayout(nextLayout);
    setOctave(nextOctave);
    setFocus({ q: 0, r: 0 });
    setPan({ x: 0, y: 0 });
  }

  function audition(notes: GridChord) {
    stopAudition();
    if (notes.length)
      void controller.play(notes.map(positionNote), 'grid:chord');
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
      contacts.clear();
      taps.clear();
      keyboardNote.current = null;
      setHeld([]);
      controller.stopAll();
      setPlaying(false);
      setSounding([]);
    };
    const visibility = () => {
      if (document.hidden) releaseAll();
    };
    const timer = setInterval(() => {
      setPlaying(controller.progressionState().status === 'playing');
      setSounding(controller.notes().map(({ note }) => note.key));
    }, 80);
    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearInterval(timer);
      releaseAll();
      window.removeEventListener('blur', releaseAll);
      window.removeEventListener('pagehide', releaseAll);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [contacts, controller, taps]);

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !surface.current) return;
    event.preventDefault();
    stopAudition();
    const bounds = surface.current.getBoundingClientRect();
    const cell = cellAt({
      x: event.clientX - bounds.left - origin.x,
      y: event.clientY - bounds.top - origin.y,
    });
    const point = { x: event.clientX, y: event.clientY };
    if (!contacts.start(event.pointerId, cell, point)) return;
    taps.set(event.pointerId, { start: point, moved: false });
    surface.current.setPointerCapture(event.pointerId);
    const note = gridNote(cell, layout, octave);
    if (isPlayable(note))
      void controller.press(`grid:${event.pointerId}`, note);
    setPreview(null);
    refreshHeld();
  }

  function pointerMove(event: PointerEvent) {
    const tap = taps.get(event.pointerId);
    if (
      tap &&
      Math.hypot(event.clientX - tap.start.x, event.clientY - tap.start.y) >= 6
    )
      tap.moved = true;
    const delta = contacts.move(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (!keyboardNote.current && (delta.x || delta.y))
      setPan((current) => ({ x: current.x + delta.x, y: current.y + delta.y }));
  }

  function pointerEnd(event: PointerEvent) {
    const cell = contacts.active.get(event.pointerId)?.cell;
    const tap = taps.get(event.pointerId);
    if (!contacts.end(event.pointerId)) return;
    taps.delete(event.pointerId);
    controller.release(`grid:${event.pointerId}`);
    if (latch && cell && tap && !tap.moved && event.type === 'pointerup')
      toggleNote(cell);
    refreshHeld();
  }

  function keyDown(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat || keyboardNote.current) return;
      stopAudition();
      // oxlint-disable-next-line react/immutability
      keyboardNote.current = focus;
      if (latch) toggleNote(focus);
      if (isPlayable(focusedNote))
        void controller.press('grid:keyboard', focusedNote);
      setPreview(null);
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
      <header class={styles['header']}>
        <a href={import.meta.env.BASE_URL} aria-label="Rechorder home">
          ‹
        </a>
        <strong>Harmonic grid</strong>
        <span class={styles['axes']}>
          → {layouts[layout].right} · ↘ {layouts[layout].diagonal}
        </span>
      </header>
      <div
        ref={surface}
        class={styles['surface']}
        role="application"
        aria-label={`Harmonic grid, Pythagorean tuning. ${focusedNote.description}${isPlayable(focusedNote) ? '' : ', outside instrument range'}`}
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
        onBlur={clearContacts}
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
            const note = gridNote(cell, layout, octave);
            const color =
              ((note.octave % octaveHues.length) + octaveHues.length) %
              octaveHues.length;
            const completion = matches.filter((chord) =>
              chord.fifths.includes(note.position.fifths),
            );
            const selectedPitch = selectedIds.has(note.key);
            const equivalent = selectedFifths.has(note.position.fifths);
            const completing = !equivalent && completion.length > 0;
            const previousPitch = previousFifths.has(note.position.fifths);
            return (
              <g
                key={id}
                transform={`translate(${center.x + origin.x} ${center.y + origin.y})`}
                class={styles['cell']}
                style={{ '--octave-hue': octaveHues[color] }}
                data-cell={id}
                data-note={note.label}
                data-octave={note.octave}
                data-held={heldIds.has(id)}
                data-selected={selectedPitch}
                data-equivalent={equivalent && !selectedPitch}
                data-completion={completing}
                data-previous={previousPitch}
                data-key={scale.includes(note.position.fifths)}
                data-sounding={sounding.includes(note.key)}
                data-playable={isPlayable(note)}
                data-focused={cellId(focus) === id}
              >
                <polygon points={hexPoints} />
                {previousPitch && (
                  <circle
                    class={styles['previousMark']}
                    cx="0"
                    cy="-26"
                    r="3"
                  />
                )}
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
                {completing && (
                  <text
                    class={styles['completionLabel']}
                    text-anchor="middle"
                    y="28"
                  >
                    {completion[0]!.label}
                    {completion.length > 1 ? ` +${completion.length - 1}` : ''}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <section class={styles['dock']} aria-label="Chord design">
        <div class={styles['summary']}>
          <strong>
            {name || (candidate.length ? 'Unnamed chord' : 'Chord')}
          </strong>
          <span aria-label="Selected notes" aria-live="polite">
            {sortPitches(candidate)
              .map((note) => positionNote(note).label)
              .join(' · ') || '—'}
          </span>
          <button
            type="button"
            disabled={!candidate.length}
            onClick={() => changeChord([])}
          >
            Clear
          </button>
        </div>
        {candidate.length > 0 && (
          <div class={styles['texture']} aria-label="Chord texture">
            <span>Harmonicity {profile.harmonicity.toFixed(2)}</span>
            <span>Roughness {profile.roughness.toFixed(3)}</span>
            <span>Span {(profile.spanCents / 100).toFixed(1)} semitones</span>
            {movement !== null && (
              <span>
                From previous {(movement / 100).toFixed(1)} semitones/voice
              </span>
            )}
          </div>
        )}
        <div class={styles['actions']}>
          <button
            type="button"
            aria-pressed={latch}
            onClick={() => {
              clearContacts();
              setLatch(!latch);
            }}
          >
            Latch
          </button>
          <button
            type="button"
            disabled={!candidate.length}
            onClick={() => audition(candidate)}
          >
            ▶ Chord
          </button>
          <button
            type="button"
            disabled={!candidate.length}
            onClick={() => {
              setPrevious(candidate);
              changeChord([]);
              setLatch(true);
            }}
          >
            Keep as previous
          </button>
          <button
            type="button"
            disabled={!previous.length || !candidate.length}
            aria-pressed={playing}
            onClick={() => {
              if (playing) {
                stopAudition();
                return;
              }
              stopAudition();
              void controller.playProgression([
                { source: 'grid:previous', notes: previous.map(positionNote) },
                {
                  source: 'grid:candidate',
                  notes: candidate.map(positionNote),
                },
              ]);
              setPlaying(true);
            }}
          >
            {playing ? '■ Stop' : '▶ Previous → Chord'}
          </button>
        </div>
        <div class={styles['tabs']}>
          {(['chords', 'voicing', 'grid'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-expanded={panel === tab}
              aria-controls="grid-tools"
              onClick={() => setPanel(panel === tab ? null : tab)}
            >
              {tab === 'chords'
                ? 'Explore'
                : tab === 'voicing'
                  ? 'Voicing'
                  : 'Grid'}{' '}
              {panel === tab ? '▾' : '▸'}
            </button>
          ))}
          {previous.length > 0 && (
            <button
              type="button"
              class={styles['reference']}
              onClick={() => audition(previous)}
              aria-label={`Play previous chord ${previous.map((note) => positionNote(note).label).join(' ')}`}
            >
              ●{' '}
              {chordName(previous) ||
                previous
                  .map((note) => positionNote(note).label)
                  .join(' · ')}{' '}
              ▶
            </button>
          )}
        </div>
        {panel && (
          <div id="grid-tools" class={styles['tools']}>
            {panel === 'chords' && (
              <>
                <div class={styles['exploration']}>
                  <strong>Nearby additions</strong>
                  <div class={styles['choices']}>
                    {explorations.map(({ kind, note, profile: option }) => {
                      const label = positionNote(note).label;
                      const purpose =
                        kind === 'blend'
                          ? 'Blend'
                          : kind === 'edge'
                            ? 'More roughness'
                            : kind === 'wider'
                              ? 'Wider range'
                              : 'Doubling';
                      return (
                        <button
                          type="button"
                          key={kind}
                          aria-label={`Add ${label} for ${purpose.toLowerCase()}`}
                          title={`Resulting roughness ${option.roughness.toFixed(3)} · span ${(option.spanCents / 100).toFixed(1)} semitones`}
                          onClick={() => {
                            changeChord([...candidate, note], true);
                            setLatch(true);
                          }}
                        >
                          {purpose} · +{label}
                        </button>
                      );
                    })}
                    {!explorations.length && (
                      <span class={styles['muted']}>
                        {candidate.length
                          ? 'Selection is full'
                          : 'Select a note to explore'}
                      </span>
                    )}
                  </div>
                </div>
                <div class={styles['legend']}>
                  <span>━ Selected</span>
                  <span>┄ Octaves</span>
                  <span>◇ Matches</span>
                  <span>● Previous</span>
                </div>
                <strong class={styles['matchHeading']}>Named matches</strong>
                <div class={styles['choices']}>
                  {completions.length ? (
                    completions.map((chord) => (
                      <button
                        key={chord.id}
                        type="button"
                        aria-pressed={chord.id === preview}
                        onClick={() => {
                          setPreview(chord.id);
                          audition(chord.notes);
                        }}
                      >
                        {chord.label}
                      </button>
                    ))
                  ) : (
                    <span class={styles['muted']}>
                      {candidate.length
                        ? 'No common name for this selection'
                        : 'No notes selected'}
                    </span>
                  )}
                </div>
                {chosen && (
                  <button
                    type="button"
                    onClick={() => {
                      changeChord(chosen.notes, true);
                      setLatch(true);
                    }}
                  >
                    Use {chosen.label}
                  </button>
                )}
              </>
            )}
            {panel === 'voicing' && (
              <>
                <div class={styles['controlRow']}>
                  <strong>Chord octave</strong>
                  <button
                    type="button"
                    aria-label="Chord down one octave"
                    disabled={!shiftOctave(selected, -1)}
                    onClick={() => changeChord(shiftOctave(selected, -1), true)}
                  >
                    −8ve
                  </button>
                  <button
                    type="button"
                    aria-label="Chord up one octave"
                    disabled={!shiftOctave(selected, 1)}
                    onClick={() => changeChord(shiftOctave(selected, 1), true)}
                  >
                    +8ve
                  </button>
                </div>
                <div class={styles['controlRow']}>
                  <strong>Inversion</strong>
                  <button
                    type="button"
                    aria-label="Lower inversion"
                    disabled={!invertChord(selected, -1, fixedBass)}
                    onClick={() =>
                      changeChord(invertChord(selected, -1, fixedBass), true)
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Higher inversion"
                    disabled={!invertChord(selected, 1, fixedBass)}
                    onClick={() =>
                      changeChord(invertChord(selected, 1, fixedBass), true)
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-pressed={fixedBass}
                    onClick={() => setFixedBass(!fixedBass)}
                  >
                    Fixed bass
                  </button>
                </div>
                {sortPitches(selected).map((note) => (
                  <div class={styles['controlRow']} key={pitchId(note)}>
                    <strong>{positionNote(note).label}</strong>
                    <button
                      type="button"
                      aria-label={`Lower ${positionNote(note).label} one octave`}
                      disabled={!shiftOctave(selected, -1, pitchId(note))}
                      onClick={() =>
                        changeChord(
                          shiftOctave(selected, -1, pitchId(note)),
                          true,
                        )
                      }
                    >
                      −8ve
                    </button>
                    <button
                      type="button"
                      aria-label={`Raise ${positionNote(note).label} one octave`}
                      disabled={!shiftOctave(selected, 1, pitchId(note))}
                      onClick={() =>
                        changeChord(
                          shiftOctave(selected, 1, pitchId(note)),
                          true,
                        )
                      }
                    >
                      +8ve
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${positionNote(note).label}`}
                      onClick={() =>
                        changeChord(
                          selected.filter(
                            (item) => pitchId(item) !== pitchId(note),
                          ),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </>
            )}
            {panel === 'grid' && (
              <>
                <label class={styles['controlRow']}>
                  <strong>Layout</strong>
                  <select
                    aria-label="Layout"
                    value={layout}
                    onChange={(event) =>
                      remap(event.currentTarget.value as GridLayout, octave)
                    }
                  >
                    {(Object.keys(layouts) as GridLayout[]).map((key) => (
                      <option key={key} value={key}>
                        {layouts[key].name}
                      </option>
                    ))}
                  </select>
                </label>
                <div class={styles['controlRow']}>
                  <strong>
                    Grid octave {octave > 0 ? '+' : ''}
                    {octave}
                  </strong>
                  <button
                    type="button"
                    aria-label="Grid down one octave"
                    disabled={octave <= -7}
                    onClick={() => remap(layout, octave - 1)}
                  >
                    −8ve
                  </button>
                  <button
                    type="button"
                    aria-label="Grid up one octave"
                    disabled={octave >= 5}
                    onClick={() => remap(layout, octave + 1)}
                  >
                    +8ve
                  </button>
                </div>
                <div class={styles['controlRow']}>
                  <label htmlFor="grid-key">
                    <strong>Key</strong>
                  </label>
                  <select
                    id="grid-key"
                    value={tonic === null ? '' : String(tonic)}
                    onChange={(event) =>
                      setTonic(
                        event.currentTarget.value === ''
                          ? null
                          : Number(event.currentTarget.value),
                      )
                    }
                  >
                    <option value="">None</option>
                    {tonics.map(([label, fifths]) => (
                      <option key={fifths} value={fifths}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Key mode"
                    disabled={tonic === null}
                    value={mode}
                    onChange={(event) =>
                      setMode(event.currentTarget.value as 'major' | 'minor')
                    }
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
