/** Positions and intervals belong to their musical system, not to the renderer. */
export interface Pitch<Position> {
  readonly position: Position;
  readonly spelling: string;
}

export interface Tuning<Position> {
  readonly id: string;
  frequency(position: Position): number;
}

export interface ChordDefinition<Interval> {
  readonly id: string;
  readonly label: string;
  readonly suffix: string;
  readonly intervals: readonly Interval[];
}

export interface Chord<Position, Interval, Voicing> {
  readonly root: Pitch<Position>;
  readonly definition: ChordDefinition<Interval>;
  readonly voicing: Voicing;
}

export interface ResolvedNote {
  readonly key: string;
  readonly label: string;
  readonly frequency: number;
}

export function resolvePitches<Position>(
  pitches: readonly Pitch<Position>[],
  tuning: Tuning<Position>,
): readonly ResolvedNote[] {
  return pitches.map((pitch, index) => {
    const frequency = tuning.frequency(pitch.position);
    if (!Number.isFinite(frequency) || frequency <= 0) {
      throw new RangeError('Tuning must produce finite positive frequencies.');
    }
    return { key: String(index), label: pitch.spelling, frequency };
  });
}
