import { useContext, useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { ResolvedNote } from '@rechorder/music';
import type { PianoPlayer } from './piano-keyboard';
import { inlineMovement, ViewOrientation } from './view-orientation';

interface Gesture {
  readonly clientX: number;
  readonly clientY: number;
  readonly start: number;
  readonly scroll: number;
  readonly source: string;
  readonly touchCompatible: boolean;
  dragging: boolean;
}

type ContactKind = 'pointer' | 'touch';

/** Each mouse, pen, or touch contact owns its note and drag lifecycle. */
export function usePianoGestures(
  viewport: RefObject<HTMLDivElement>,
  controller: PianoPlayer,
  sourceId: string,
) {
  const turn = useContext(ViewOrientation);
  const gestures = useRef(new Map<string, Gesture>());
  const contactId = (kind: ContactKind, id: number) => `${kind}:${id}`;
  const source = (kind: ContactKind, id: number) => `${sourceId}:${kind}:${id}`;

  useEffect(() => {
    const active = gestures.current;
    const clear = () => {
      for (const gesture of active.values()) controller.release(gesture.source);
      active.clear();
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clear();
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [controller, sourceId, turn]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const along = inlineMovement(event.deltaX, event.deltaY, turn);
      const delta = along || (turn % 2 === 0 ? event.deltaY : event.deltaX);
      const scale =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? element.clientWidth
            : 1;
      const next = Math.max(
        0,
        Math.min(
          element.scrollWidth - element.clientWidth,
          element.scrollLeft + delta * scale,
        ),
      );
      if (next !== element.scrollLeft) {
        event.preventDefault();
        element.scrollTo({ left: next });
      }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [viewport, turn]);

  function start(
    kind: ContactKind,
    id: number,
    clientX: number,
    clientY: number,
    note?: ResolvedNote,
    touchCompatible = false,
  ) {
    const element = viewport.current;
    const key = contactId(kind, id);
    if (!element || gestures.current.has(key)) return;
    const gesture = {
      clientX,
      clientY,
      start: inlineMovement(clientX, clientY, turn),
      scroll: element.scrollLeft,
      source: source(kind, id),
      touchCompatible,
      dragging: false,
    };
    gestures.current.set(key, gesture);
    if (note) void controller.press(gesture.source, note);
  }

  function move(kind: ContactKind, id: number, position: number) {
    const element = viewport.current;
    const gesture = gestures.current.get(contactId(kind, id));
    if (!element || !gesture) return;
    const delta = position - gesture.start;
    if (!gesture.dragging && Math.abs(delta) >= 8) {
      // One scrolling contact per row; other contacts retain their note ownership.
      if ([...gestures.current.values()].some((value) => value.dragging))
        return;
      gesture.dragging = true;
    }
    if (gesture.dragging) element.scrollTo({ left: gesture.scroll - delta });
  }

  function end(kind: ContactKind, id: number) {
    const key = contactId(kind, id);
    const gesture = gestures.current.get(key);
    if (!gesture) return;
    gestures.current.delete(key);
    controller.release(gesture.source);
  }

  function pointerStart(event: PointerEvent, note?: ResolvedNote) {
    if (
      event.button !== 0 ||
      gestures.current.has(contactId('pointer', event.pointerId))
    )
      return;
    if (note && event.pointerType === 'pen') event.preventDefault();
    const element = viewport.current;
    if (!element) return;
    element.setPointerCapture(event.pointerId);
    start(
      'pointer',
      event.pointerId,
      event.clientX,
      event.clientY,
      note,
      event.pointerType === 'touch',
    );
  }

  function pointerMove(event: PointerEvent) {
    move(
      'pointer',
      event.pointerId,
      inlineMovement(event.clientX, event.clientY, turn),
    );
  }

  function pointerEnd(event: PointerEvent) {
    end('pointer', event.pointerId);
  }

  function touchStart(event: TouchEvent, note?: ResolvedNote) {
    // The keyboard owns touch panning. Prevent compatibility mouse events from
    // focusing keys or starting a second gesture lifecycle.
    event.preventDefault();
    for (const touch of event.changedTouches) {
      const key = contactId('touch', touch.identifier);
      if (gestures.current.has(key)) continue;
      // Pointer-capable browsers dispatch pointerdown before touchstart. Move
      // that same contact to touch ownership without restarting its note, so a
      // later pointercancel from panning cannot terminate the touch hold.
      const pointer = [...gestures.current.entries()].find(
        ([candidate, gesture]) =>
          candidate.startsWith('pointer:') &&
          gesture.touchCompatible &&
          Math.abs(gesture.clientX - touch.clientX) <= 1 &&
          Math.abs(gesture.clientY - touch.clientY) <= 1,
      );
      if (pointer) {
        gestures.current.delete(pointer[0]);
        gestures.current.set(key, pointer[1]);
        continue;
      }
      start('touch', touch.identifier, touch.clientX, touch.clientY, note);
    }
  }

  function touchMove(event: TouchEvent) {
    event.preventDefault();
    for (const touch of event.changedTouches)
      move(
        'touch',
        touch.identifier,
        inlineMovement(touch.clientX, touch.clientY, turn),
      );
  }

  function touchEnd(event: TouchEvent) {
    for (const touch of event.changedTouches) end('touch', touch.identifier);
  }

  return {
    pointerStart,
    pointerMove,
    pointerEnd,
    touchStart,
    touchMove,
    touchEnd,
  };
}
