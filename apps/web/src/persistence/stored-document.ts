/**
 * A page keeps its durable state in one stored document made of independent
 * sections. Each section validates its own data, so a corrupt or outdated part
 * falls back to its default without discarding the rest. Sections this build
 * does not know are carried through a save so a newer build's data survives.
 */
export interface DocumentSection<Value> {
  encode(value: Value): unknown;
  /** Undefined means absent or unusable; the caller falls back to its default. */
  decode(data: unknown): Value | undefined;
}

export type DocumentSections<Values extends object> = {
  readonly [Name in keyof Values]: DocumentSection<Values[Name]>;
};

export interface StoredDocument<Values extends object> {
  load(): Partial<Values>;
  save(values: Values): void;
}

/** Bumped only for a wholesale format change; section shapes evolve through their own schemas. */
const documentVersion = 1;

/** Storage access itself can throw when a browser blocks site data. */
export function availableStorage(
  read: () => Storage | undefined,
): Storage | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

export function openStoredDocument<Values extends object>(
  storage: Storage | undefined,
  key: string,
  sections: DocumentSections<Values>,
): StoredDocument<Values> {
  let foreign: Record<string, unknown> = {};
  return {
    load() {
      const values: Partial<Values> = {};
      const stored = readDocument(storage, key);
      if (!stored) return values;
      foreign = {};
      for (const [name, data] of Object.entries(stored)) {
        if (name === 'version') continue;
        if (name in sections) {
          const section = sections[name as keyof Values];
          const value = section.decode(data);
          if (value !== undefined) values[name as keyof Values] = value;
        } else foreign[name] = data;
      }
      return values;
    },
    save(values) {
      if (!storage) return;
      const document: Record<string, unknown> = {
        version: documentVersion,
        ...foreign,
      };
      for (const name of Object.keys(sections) as (keyof Values)[])
        document[name as string] = sections[name].encode(values[name]);
      try {
        storage.setItem(key, JSON.stringify(document));
      } catch (error) {
        console.warn('Saving the page state failed.', error);
      }
    },
  };
}

function readDocument(
  storage: Storage | undefined,
  key: string,
): Record<string, unknown> | undefined {
  try {
    const text = storage?.getItem(key);
    if (!text) return undefined;
    const parsed: unknown = JSON.parse(text);
    return parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch (error) {
    console.warn('Stored page state was unreadable.', error);
    return undefined;
  }
}
