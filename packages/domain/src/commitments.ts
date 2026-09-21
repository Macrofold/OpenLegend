import { mutateExperience } from './experience.js';
import { draftWorld } from './draft.js';
import { appendMemory, finish, outcome } from './events.js';
import type { Transition, WorldEvent, WorldState } from './types.js';
import { current, isDraft } from 'immer';
import type { MemoryRecord } from './types.js';

type Pending = { actorId: string; record: MemoryRecord; order: number };
const activeRecords = new WeakMap<MemoryRecord[], MemoryRecord[]>();
const indexes = new WeakMap<
  WorldState['memories'],
  {
    completions: Map<string, Pending[]>;
    deadlines: Pending[];
  }
>();

function commitmentIndex(world: WorldState) {
  const memories = isDraft(world.memories) ? current(world.memories) : world.memories;
  let index = indexes.get(memories);
  if (index) return index;
  index = { completions: new Map(), deadlines: [] };
  let order = 0;
  for (const [actorId, records] of Object.entries(memories)) {
    let pending = activeRecords.get(records);
    if (!pending) {
      pending = records.filter((record) => record.obligation && !record.resolved);
      activeRecords.set(records, pending);
    }
    for (const record of pending) {
      const entry = { actorId, record, order: order++ },
        obligation = record.obligation!;
      if (obligation.completion) {
        const key = JSON.stringify([actorId, obligation.completion.eventType]);
        const group = index.completions.get(key) ?? [];
        group.push(entry);
        index.completions.set(key, group);
      }
      if (obligation.status === 'active' && obligation.dueAt !== undefined)
        index.deadlines.push(entry);
    }
  }
  index.deadlines.sort((a, b) => a.record.obligation!.dueAt! - b.record.obligation!.dueAt!);
  indexes.set(memories, index);
  return index;
}
export interface Obligation {
  revision: number;
  status: 'active' | 'fulfilled' | 'cancelled' | 'overdue';
  dueAt?: number;
  completion?: { eventType: string; targetId?: string; definitionId?: string };
  evidenceId: string;
  fulfilledBy?: string;
  fulfilledAt?: number;
}
/** Only committed, self-attributed explicit promise speech creates an obligation. */
export function recordSpokenPromise(world: WorldState, event: WorldEvent): void {
  if (
    event.type !== 'speech' ||
    !event.actorId ||
    !/^I promise to\s+\S/i.test(String(event.data?.['text'] ?? ''))
  )
    return;
  const actorId = event.actorId;
  if (
    (world.memories[actorId] ?? []).filter((m) => m.kind === 'commitment' && !m.resolved).length >=
    16
  )
    return;
  const words = String(event.data?.['text'] ?? '')
    .trim()
    .replace(/[.!]$/, '');
  const gather = /^I promise to gather (.+)$/i.exec(words);
  const named = gather?.[1]?.toLowerCase();
  const definitions = Object.values(world.itemDefinitions).filter(
    (d) => d.id.replaceAll('_', ' ').toLowerCase() === named || d.name.toLowerCase() === named,
  );
  const completion =
    definitions.length === 1
      ? { eventType: 'gathered', definitionId: definitions[0]!.id }
      : undefined;
  appendMemory(world, actorId, {
    kind: 'commitment',
    source: 'observed',
    summary: event.text,
    eventId: event.id,
    eventType: 'speech',
    speakerId: actorId,
    entityIds: [actorId, ...(event.targetId ? [event.targetId] : [])],
    importance: 10,
    resolved: false,
    obligation: {
      revision: 1,
      status: 'active',
      evidenceId: event.id,
      ...(completion ? { completion } : {}),
    },
  });
}
export function amendCommitment(
  input: WorldState,
  actorId: string,
  id: string,
  expectedRevision: number,
  change: {
    cancel?: boolean;
    dueAt?: number;
    completion?: { eventType: string; targetId?: string; definitionId?: string };
  },
): Transition {
  const record = input.memories[actorId]?.find((m) => m.id === id && m.kind === 'commitment');
  if (
    !record?.obligation ||
    record.obligation.revision !== expectedRevision ||
    record.resolved ||
    input.paused ||
    !input.entities[actorId]?.actor?.alive ||
    (change.dueAt !== undefined &&
      (!Number.isFinite(change.dueAt) || change.dueAt < input.simTime)) ||
    (change.completion &&
      (!/^[a-z-]{1,64}$/.test(change.completion.eventType) ||
        (change.completion.targetId && !record.entityIds.includes(change.completion.targetId)) ||
        (change.completion.definitionId && !input.itemDefinitions[change.completion.definitionId])))
  )
    return {
      world: input,
      events: [],
      outcome: outcome(false, 'commitment-rejected', 'Stale or unsupported obligation change.'),
    };
  const world = draftWorld(input);
  const invalidated = mutateExperience(world, actorId, {
    operation: 'obligation',
    id,
    expectedRevision,
    obligation: {
      ...record.obligation,
      revision: expectedRevision + 1,
      ...(change.dueAt !== undefined ? { dueAt: change.dueAt } : {}),
      ...(change.completion ? { completion: change.completion } : {}),
      ...(change.cancel ? { status: 'cancelled' as const } : {}),
    },
  });
  if (!invalidated)
    return {
      world: input,
      events: [],
      outcome: outcome(false, 'commitment-rejected', 'Obligation changed.'),
    };
  return {
    ...finish(world, [], outcome(true, 'commitment-updated', 'Native obligation updated.')),
    invalidatedMemoryIds: { [actorId]: invalidated },
  };
}
export function advanceCommitments(world: WorldState, events: WorldEvent[]): void {
  // Indexes follow immutable source identities, including edits/recovery; ordering stays native.
  const index = commitmentIndex(world),
    candidates = new Set<Pending>();
  for (const event of events)
    for (const entry of index.completions.get(JSON.stringify([event.actorId, event.type])) ?? [])
      candidates.add(entry);
  for (const entry of index.deadlines) {
    if (entry.record.obligation!.dueAt! > world.simTime) break;
    candidates.add(entry);
  }
  for (const { actorId, record } of [...candidates].sort((a, b) => a.order - b.order)) {
    const obligation = record.obligation;
    if (!obligation || record.resolved) continue;
    const evidence = obligation.completion
      ? events.find(
          (e) =>
            e.actorId === actorId &&
            e.id !== obligation.evidenceId &&
            e.type === obligation.completion!.eventType &&
            (!obligation.completion!.targetId || e.targetId === obligation.completion!.targetId) &&
            (!obligation.completion!.definitionId ||
              e.data?.['definitionId'] === obligation.completion!.definitionId),
        )
      : undefined;
    if (evidence) {
      mutateExperience(world, actorId, {
        operation: 'obligation',
        id: record.id,
        expectedRevision: obligation.revision,
        obligation: {
          ...obligation,
          fulfilledBy: evidence.id,
          fulfilledAt: evidence.at,
          status: 'fulfilled',
          revision: obligation.revision + 1,
        },
      });
    } else if (
      obligation.status === 'active' &&
      obligation.dueAt !== undefined &&
      world.simTime >= obligation.dueAt
    ) {
      mutateExperience(world, actorId, {
        operation: 'obligation',
        id: record.id,
        expectedRevision: obligation.revision,
        obligation: { ...obligation, status: 'overdue', revision: obligation.revision + 1 },
      });
    }
  }
}
