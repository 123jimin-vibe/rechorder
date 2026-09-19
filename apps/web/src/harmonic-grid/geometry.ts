export interface Cell {
  readonly q: number;
  readonly r: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const hexRadius = 44;
export const hexWidth = Math.sqrt(3) * hexRadius;
export const rowHeight = 1.5 * hexRadius;

export const cellId = ({ q, r }: Cell) => `${q},${r}`;

export function cellCenter({ q, r }: Cell): Point {
  return { x: hexWidth * (q + r / 2), y: rowHeight * r };
}

/** Round all three cube coordinates together, including near hex corners. */
export function cellAt({ x, y }: Point): Cell {
  const r = y / rowHeight;
  const q = x / hexWidth - r / 2;
  const s = -q - r;
  let roundedQ = Math.round(q);
  let roundedR = Math.round(r);
  const roundedS = Math.round(s);
  const qError = Math.abs(roundedQ - q);
  const rError = Math.abs(roundedR - r);
  const sError = Math.abs(roundedS - s);
  if (qError > rError && qError > sError) roundedQ = -roundedR - roundedS;
  else if (rError > sError) roundedR = -roundedQ - roundedS;
  return { q: roundedQ || 0, r: roundedR || 0 };
}

/** Only enumerate rows and columns intersecting the viewport plus one-cell overscan. */
export function visibleCells(
  width: number,
  height: number,
  origin: Point,
): Cell[] {
  const cells: Cell[] = [];
  const firstRow = Math.floor((-origin.y - hexRadius) / rowHeight);
  const lastRow = Math.ceil((height - origin.y + hexRadius) / rowHeight);
  for (let r = firstRow; r <= lastRow; r++) {
    const firstColumn = Math.floor(-origin.x / hexWidth - r / 2) - 1;
    const lastColumn = Math.ceil((width - origin.x) / hexWidth - r / 2) + 1;
    for (let q = firstColumn; q <= lastColumn; q++) cells.push({ q, r });
  }
  return cells;
}

export const hexPoints = Array.from({ length: 6 }, (_, index) => {
  const angle = ((60 * index - 30) * Math.PI) / 180;
  return `${Math.cos(angle) * (hexRadius - 1.5)},${Math.sin(angle) * (hexRadius - 1.5)}`;
}).join(' ');
