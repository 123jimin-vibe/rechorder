import { useContext, useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { ResolvedNote } from '@rechorder/music';
import type { PianoPlayer } from './piano-keyboard';
import { inlineMovement, ViewOrientation } from './view-orientation';

interface Gesture {
  readonly start: number;
  readonly scroll: number;
  dragging: boolean;
}

/** Each pointer owns a note or a drag; browser-wide touch panning cannot do both. */
export function usePianoGestures(
  viewport: RefObject<HTMLDivElement>,
  controller: PianoPlayer,
  sourceId: string,
) {
  const turn = useContext(ViewOrientation);
  const gestures = useRef(new Map<number, Gesture>());
  const source = (id: number) => `${sourceId}:pointer:${id}`;

  useEffect(() => {
    const active = gestures.current;
    const clear = () => {
      for (const id of active.keys())
        controller.release(`${sourceId}:pointer:${id}`);
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

  function start(event: PointerEvent, note?: ResolvedNote) {
    const element = viewport.current;
    if (!element || event.button !== 0 || gestures.current.has(event.pointerId))
      return;
    element.setPointerCapture(event.pointerId);
    gestures.current.set(event.pointerId, {
      start: inlineMovement(event.clientX, event.clientY, turn),
      scroll: element.scrollLeft,
      dragging: false,
    });
    if (note) void controller.press(source(event.pointerId), note);
  }

  function move(event: PointerEvent) {
    const element = viewport.current;
    const gesture = gestures.current.get(event.pointerId);
    if (!element || !gesture) return;
    const delta =
      inlineMovement(event.clientX, event.clientY, turn) - gesture.start;
    if (!gesture.dragging && Math.abs(delta) >= 8) {
      // One scrolling pointer per row; other pointers retain their note ownership.
      if ([...gestures.current.values()].some((value) => value.dragging))
        return;
      gesture.dragging = true;
      controller.release(source(event.pointerId));
    }
    if (gesture.dragging) element.scrollTo({ left: gesture.scroll - delta });
  }

  function end(event: PointerEvent) {
    controller.release(source(event.pointerId));
    gestures.current.delete(event.pointerId);
  }

  return { start, move, end };
}
