import type { GodMemoryEditorEntry, GodWorldEventEditorEntry } from '@open-legend/protocol';

function changedEntries<T extends { id: string; hash: string; json?: string }>(
  loaded: T[],
  current: T[],
  dirtyIds: ReadonlySet<string>,
  drafts: ReadonlyMap<string, string>,
  label: string,
): Array<{ original: T; replacement: Record<string, unknown> | null }> {
  const originalById = new Map(loaded.map((entry) => [entry.id, entry]));
  const currentById = new Map(current.map((entry) => [entry.id, entry]));
  return [...dirtyIds].map((id) => {
    const original = originalById.get(id);
    if (!original) throw new Error(`A changed ${label} is no longer in the loaded editor.`);
    const entry = currentById.get(id);
    if (!entry) return { original, replacement: null };
    if (entry.json === undefined) throw new Error(`Open the ${label} JSON before editing it.`);
    let value: unknown;
    try {
      value = JSON.parse(drafts.get(id) ?? entry.json);
    } catch {
      throw new Error(`The ${label} JSON is invalid. Check the selected entry before saving.`);
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`The ${label} JSON must contain an object.`);
    return { original, replacement: value as Record<string, unknown> };
  });
}

/** Only explicitly edited entries cross the network; the loaded list is the conflict baseline. */
export function memoryEditorChanges(
  loaded: GodMemoryEditorEntry[],
  current: GodMemoryEditorEntry[],
  dirtyIds: ReadonlySet<string>,
  drafts: ReadonlyMap<string, string>,
) {
  return changedEntries(loaded, current, dirtyIds, drafts, 'memory').map(
    ({ original, replacement }) => ({
      entryId: original.id,
      expectedHash: original.hash,
      replacement: replacement ? { source: original.source, value: replacement } : null,
    }),
  );
}

export function worldEventEditorChanges(
  loaded: GodWorldEventEditorEntry[],
  current: GodWorldEventEditorEntry[],
  dirtyIds: ReadonlySet<string>,
  drafts: ReadonlyMap<string, string>,
) {
  return changedEntries(loaded, current, dirtyIds, drafts, 'world event').map(
    ({ original, replacement }) => ({
      id: original.id,
      expectedHash: original.hash,
      replacement,
    }),
  );
}
