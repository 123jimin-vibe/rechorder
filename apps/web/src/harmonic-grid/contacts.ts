import type { Cell, Point } from './geometry';

interface Contact {
  readonly cell: Cell;
  readonly start: Point;
  previous: Point;
}

/** Notes remain attached to their starting cell even as the viewport moves. */
export class GridContacts {
  readonly active = new Map<number, Contact>();
  private dragging: number | null = null;

  start(id: number, cell: Cell, point: Point): boolean {
    if (this.active.has(id)) return false;
    this.active.set(id, { cell, start: point, previous: point });
    return true;
  }

  move(id: number, point: Point): Point {
    const contact = this.active.get(id);
    if (!contact) return { x: 0, y: 0 };
    const previous = contact.previous;
    contact.previous = point;
    if (point.x === previous.x && point.y === previous.y) return { x: 0, y: 0 };
    if (
      this.dragging === null &&
      Math.hypot(point.x - contact.start.x, point.y - contact.start.y) >= 6
    )
      this.dragging = id;
    if (this.dragging !== id) return { x: 0, y: 0 };
    return { x: point.x - previous.x, y: point.y - previous.y };
  }

  end(id: number): boolean {
    if (this.dragging === id) this.dragging = null;
    return this.active.delete(id);
  }

  clear(): void {
    this.active.clear();
    this.dragging = null;
  }
}
