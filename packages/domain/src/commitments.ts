import { selectedSpokenPromise, selectedCommitmentCompletionAllowed } from './world-composition.js';
import { entityGet } from './entity-collection.js';
import { subjectNarration } from './narration.js';
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
    pending: Pending[];
    completions: Map<string, Pending[]>;
    deadlines: Pending[];
  }
>();

function commitmentIndex(source: WorldState['memories']) {
  const memories = isDraft(source) ? current(source) : source;
  let index = indexes.get(memories);
  if (index) return index;
  index = { pending: [], completions: new Map(), deadlines: [] };
  let order = 0;
  for (const [actorId, records] of Object.entries(memories)) {
    let pending = activeRecords.get(records);
    if (!pending) {
      pending = records.filter(
        (record) => (record.obligation || record.kind === 'commitment') && !record.resolved,
      );
      activeRecords.set(records, pending);
    }
    for (const record of pending) {
      const entry = { actorId, record, order: order++ },
        obligation = record.obligation;
      index.pending.push(entry);
      if (!obligation) continue;
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
/** History placement cannot remove or edit an unresolved promise, including native
 * completion/deadline dependencies and the owner's exact tie-breaking order. */
export function retainsCommitmentSchedule(
  before: WorldState['memories'],
  after: WorldState['memories'],
): boolean {
  if (before === after) return true;
  const previous = commitmentIndex(before).pending,
    next = commitmentIndex(after).pending;
  return (
    previous.length === next.length &&
    previous.every(
      (entry, index) =>
        entry.actorId === next[index]!.actorId && entry.record === next[index]!.record,
    )
  );
}
/** Event suppression consults the same completion index as fulfillment. A
 * matching live promise requires the original occurrence; silence cannot fulfill it. */
export function hasCommitmentCompletion(
  world: WorldState,
  actorId: string,
  eventTypes: readonly string[],
): boolean {
  const index = commitmentIndex(world.memories);
  // The index contains unresolved promises, including overdue promises that can
  // still be fulfilled. Match the same candidates as advanceCommitments.
  return eventTypes.some(
    (type) => !!index.completions.get(JSON.stringify([actorId, type]))?.length,
  );
}
/** Reuse the obligation owner's existing sorted deadline index. */
export function nextCommitmentDeadline(world: WorldState): number {
  return (
    commitmentIndex(world.memories).deadlines.find(
      (e) => e.record.obligation!.dueAt! > world.simTime,
    )?.record.obligation?.dueAt ?? Infinity
  );
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
/** Unresolved obligations per actor; further promise speech is still spoken but not
 * recorded. docs/limits/base-world.md#bw04 */
/** The count admission checks against the limit: every unresolved commitment record,
 * including forgotten ones and commitments without a native obligation. */
export function unresolvedCommitmentCount(world: WorldState, actorId: string): number {
  return (world.memories[actorId] ?? []).filter((m) => m.kind === 'commitment' && !m.resolved)
    .length;
}
/** An actor's current (active or overdue) obligations that it has not forgotten. */
export function openObligations(world: WorldState, actorId: string): MemoryRecord[] {
  const forgotten = new Set(world.experience?.forgotten[actorId] ?? []);
  return (world.memories[actorId] ?? []).filter(
    (memory) =>
      !!memory.obligation &&
      !memory.resolved &&
      (memory.obligation.status === 'active' || memory.obligation.status === 'overdue') &&
      !forgotten.has(memory.id),
  );
}
/** Only committed, self-attributed explicit promise speech creates an obligation. */
export function recordSpokenPromise(world: WorldState, event: WorldEvent): void {
  const recognized = selectedSpokenPromise(world, event);
  if (!recognized || !event.actorId) return;
  const actorId = event.actorId;
  if (unresolvedCommitmentCount(world, actorId) >= recognized.limit) return;
  const completion = recognized.completion;
  appendMemory(world, actorId, {
    kind: 'commitment',
    source: 'observed',
    summary: subjectNarration(actorId, [
      recognized.summaryPrefix,
      String(event.data?.['text'] ?? ''),
    ]),
    eventId: event.id,
    eventType: recognized.speechEvent,
    speakerId: actorId,
    entityIds: [actorId, ...(event.targetId ? [event.targetId] : [])],
    importance: recognized.importance,
    resolved: false,
    obligation: {
      revision: 1,
      status: 'active',
      evidenceId: event.id,
      ...(completion ? { completion } : {}),
    },
  });
}
/** Keep the open native event-name contract while refusing conditions the
 * selected world has deliberately retired. Presentation is not that vocabulary. */
export function supportsCommitmentCompletion(world: WorldState, eventType: string): boolean {
  return /^[a-z-]{1,64}$/.test(eventType) && selectedCommitmentCompletionAllowed(world, eventType);
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
    !entityGet(input.entities, actorId)?.actor?.alive ||
    (change.dueAt !== undefined &&
      (!Number.isFinite(change.dueAt) || change.dueAt < input.simTime)) ||
    (change.completion &&
      (!supportsCommitmentCompletion(input, change.completion.eventType) ||
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
  const index = commitmentIndex(world.memories),
    candidates = new Set<Pending>();
  // Dense private acquisition records thousands of events; skip keying them when no
  // obligation awaits any completion (PF12.3/SW08.4a first-exposure burst).
  if (index.completions.size)
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
