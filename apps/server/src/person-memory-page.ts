import { experienceEntries, type WorldState, type ExperienceEntry } from '@open-legend/domain';
import type { GodMemoryEditorEntry } from '@open-legend/protocol';
import { digest } from './store.js';

function orderedEntries(world: WorldState, actorId: string) {
  return [...experienceEntries(world, actorId)]
    .map(([id, entry]) => ({
      id,
      entry,
      time: entry.source === 'summary' ? entry.value.to : entry.value.at,
    }))
    .sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
}

export function createPersonMemoryPager() {
  const cache = new Map<
    string,
    {
      awareness: unknown;
      memories: unknown;
      summaries: unknown;
      entries: ReturnType<typeof orderedEntries>;
      positions: Map<string, number>;
    }
  >();
  return (world: WorldState, actorId: string, before?: string) => {
    const awareness = world.experience?.awareness[actorId];
    const memories = world.memories[actorId];
    const summaries = world.experience?.summaries[actorId];
    let cached = cache.get(actorId);
    // Immutable collection references invalidate sorting; only the requested page is hashed.
    // See docs/architecture.md#public-updates-and-owner-editors.
    if (
      !cached ||
      cached.awareness !== awareness ||
      cached.memories !== memories ||
      cached.summaries !== summaries
    ) {
      const entries = orderedEntries(world, actorId);
      cached = {
        awareness,
        memories,
        summaries,
        entries,
        positions: new Map(entries.map((entry, index) => [entry.id, index])),
      };
      cache.set(actorId, cached);
    }
    const index = before ? cached.positions.get(before) : -1;
    if (index === undefined) return undefined;
    const page: GodMemoryEditorEntry[] = cached.entries
      .slice(index + 1, index + 101)
      .map(({ entry }) => formatMemoryEntry(entry));
    return {
      memories: page,
      before: index + 101 < cached.entries.length ? page.at(-1)?.id : undefined,
    };
  };
}

export function formatMemoryEntry(entry: ExperienceEntry): GodMemoryEditorEntry {
  const id = `${entry.source}:${entry.source === 'awareness' ? entry.value.eventId : entry.value.id}`;
  const time = entry.source === 'summary' ? entry.value.to : entry.value.at;
  const common = { id, time, hash: digest(entry.value) };
  if (entry.source === 'awareness') {
    const value = entry.value;
    return {
      ...common,
      source: entry.source,
      label: 'Raw',
      text: value.text,
      tags: [value.modality, ...(value.recognized ? ['recognized'] : []), ...value.entityIds],
      eventType: value.eventType ?? value.modality,
    };
  }
  if (entry.source === 'memory') {
    const value = entry.value;
    return {
      ...common,
      source: entry.source,
      label: 'Raw',
      text: value.summary,
      tags: [value.kind, value.source, ...value.entityIds],
    };
  }
  return {
    ...common,
    source: entry.source,
    label: 'Consolidated',
    text: entry.value.text,
    tags: ['reflection', ...entry.value.entityIds],
  };
}
