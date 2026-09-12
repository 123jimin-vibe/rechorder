export interface ProgressionEntry<Value> {
  readonly id: string;
  readonly value: Value;
}

export function entryIndex<Value>(
  entries: readonly ProgressionEntry<Value>[],
  id: string,
): number {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) throw new RangeError('Progression entry does not exist.');
  return index;
}

export function insertEntry<Value>(
  entries: readonly ProgressionEntry<Value>[],
  index: number,
  entry: ProgressionEntry<Value>,
): readonly ProgressionEntry<Value>[] {
  if (!Number.isInteger(index) || index < 0 || index > entries.length) {
    throw new RangeError('Invalid insertion position.');
  }
  if (!entry.id || entries.some((existing) => existing.id === entry.id)) {
    throw new RangeError('Progression IDs must be nonempty and unique.');
  }
  return [...entries.slice(0, index), entry, ...entries.slice(index)];
}

export function removeEntry<Value>(
  entries: readonly ProgressionEntry<Value>[],
  id: string,
): readonly ProgressionEntry<Value>[] {
  const index = entryIndex(entries, id);
  return [...entries.slice(0, index), ...entries.slice(index + 1)];
}

/** Destination is the final index of the moved entry. */
export function moveEntry<Value>(
  entries: readonly ProgressionEntry<Value>[],
  id: string,
  destination: number,
): readonly ProgressionEntry<Value>[] {
  const source = entryIndex(entries, id);
  if (
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination >= entries.length
  ) {
    throw new RangeError('Invalid move destination.');
  }
  const entry = entries[source];
  if (!entry) throw new RangeError('Progression entry does not exist.');
  return insertEntry(removeEntry(entries, id), destination, entry);
}
