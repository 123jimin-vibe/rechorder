import { createContext } from 'preact';

export type QuarterTurn = 0 | 1 | 2 | 3;
export const ViewOrientation = createContext<QuarterTurn>(0);

/** Project screen movement onto the rotated view's left-to-right axis. */
export function inlineMovement(
  x: number,
  y: number,
  turn: QuarterTurn,
): number {
  switch (turn) {
    case 0:
      return x;
    case 1:
      return y;
    case 2:
      return -x;
    case 3:
      return -y;
  }
}
