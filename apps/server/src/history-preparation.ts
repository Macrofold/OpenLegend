import type { RecordChanges } from './world-records.js';
import {
  appendedEventCount,
  entityGet,
  hasMemory,
  appendedRecordCount,
  selectedTemporalPolicy,
  temporalRecentAt,
  receivedDirectoryContains,
  defaultStoryPolicy,
  personalText,
  type StoryPolicy,
  type StorySubject,
  type WorldState,
  type Awareness,
  type WorldEvent,
} from '@open-legend/domain';
import { timedSync } from './performance.js';
import { receivedEventAccounts, type ReceivedEventAccount } from './received-event-accounts.js';
import { personalEventEvidence as eventEvidence } from './personal-accounts.js';

/** Derived indexes for one exact immutable candidate, not another history store.
 * Prepare before acquiring the database when readiness is already committed.
 * docs/performance.md#compact-transactional-persistence
 */
export function prepareHistory(
  previous: WorldState | undefined,
  world: WorldState,
  appendCount?: number,
) {
  return timedSync('history.prepare', () => {
    // Only the domain proof authorizes appending; an application hint is insufficient.
    const fastAppend =
      !!previous &&
      appendCount !== undefined &&
      appendedEventCount(previous.events, world.events) === appendCount;
    const old = fastAppend
      ? undefined
      : new Map(previous?.events.map((event) => [event.id, event]));
    const current = fastAppend ? undefined : new Set(world.events.map((event) => event.id));
    const removed = old ? [...old.keys()].filter((id) => !current!.has(id)) : [];
    const changed = fastAppend
      ? world.events.slice(previous!.events.length)
      : world.events.filter((event) => old!.get(event.id) !== event);
    const previousIds = old ? new Set(old.keys()) : undefined;
    return historyInputs(previous, world, fastAppend, changed, removed, previousIds);
  });
}

function historyInputs(
  previous: WorldState | undefined,
  world: WorldState,
  fastAppend: boolean,
  changed: WorldEvent[],
  removed: string[],
  previousIds: Set<string> | undefined,
) {
  const changedIds = new Set<string>();
  for (const event of changed) {
    if (changedIds.has(event.id)) throw new Error('Duplicate changed history event identity.');
    changedIds.add(event.id);
  }
  const wanted = new Map<string, Set<string>>();
  for (const event of changed)
    for (const actorId of event.audience) {
      let ids = wanted.get(actorId);
      if (!ids) wanted.set(actorId, (ids = new Set()));
      ids.add(event.id);
    }
  const awarenessIndexes = new Map<string, Map<string, ReceivedEventAccount>>();
  const forgottenIndexes = new Map<string, Set<string>>();
  for (const [actorId, ids] of wanted) {
    const values = receivedEventAccounts(world, actorId, ids, { previous, append: fastAppend });
    awarenessIndexes.set(actorId, values);
    forgottenIndexes.set(actorId, new Set(world.experience?.forgotten[actorId] ?? []));
  }
  return {
    previous,
    world,
    fastAppend,
    changed,
    removed,
    previousIds,
    forgotten(actorId: string) {
      let ids = forgottenIndexes.get(actorId);
      if (!ids) {
        ids = new Set(world.experience?.forgotten[actorId] ?? []);
        forgottenIndexes.set(actorId, ids);
      }
      return ids;
    },
    perspective(actorId: string, eventId: string) {
      return awarenessIndexes.get(actorId)?.get(eventId);
    },
  };
}

export type PreparedHistory = ReturnType<typeof prepareHistory>;

/** Fold immutable admitted occurrences, retaining their original personal cuts even
 * after their resident accounts roll out. The archive does not depend on a later
 * world's awareness of an earlier event. */
export function mergeHistoryPreparation(
  before: PreparedHistory,
  after: PreparedHistory,
): PreparedHistory {
  if (!after.changed.length && !after.removed.length)
    return {
      ...before,
      world: after.world,
      fastAppend: before.fastAppend && after.fastAppend,
      forgotten: after.forgotten,
    };
  const changed = new Map(before.changed.map((event) => [event.id, event]));
  const removed = new Set(before.removed);
  const perspectives = new Map<string, Map<string, ReceivedEventAccount>>();
  for (const prepared of [before, after]) {
    for (const id of prepared.removed) {
      changed.delete(id);
      removed.add(id);
      perspectives.delete(id);
    }
    for (const event of prepared.changed) {
      changed.set(event.id, event);
      removed.delete(event.id);
      const accounts = new Map<string, ReceivedEventAccount>();
      for (const actor of event.audience) {
        const account = prepared.perspective(actor, event.id);
        if (account) accounts.set(actor, account);
      }
      perspectives.set(event.id, accounts);
    }
  }
  return {
    previous: before.previous,
    world: after.world,
    fastAppend: before.fastAppend && after.fastAppend && !removed.size,
    changed: [...changed.values()],
    removed: [...removed],
    previousIds: before.previousIds,
    forgotten: after.forgotten,
    perspective: (actor, event) => perspectives.get(event)?.get(actor),
  };
}

/** Read input contains only selected occurrences and their exact personal
 * accounts. Its maps do not retain preparation functions, world roots or baselines. */
export interface PreparedHistoryRead {
  readonly changed: readonly WorldEvent[];
  readonly removed: readonly string[];
  readonly accounts: ReadonlyMap<string, ReadonlyMap<string, ReceivedEventAccount>>;
  readonly forgotten: ReadonlyMap<string, ReadonlySet<string>>;
}
export function captureHistoryRead(input: PreparedHistory, actorId?: string): PreparedHistoryRead {
  const changed = actorId
    ? input.changed.filter((event) => event.audience.includes(actorId))
    : [...input.changed];
  const accounts = new Map<string, Map<string, ReceivedEventAccount>>(),
    forgotten = new Map<string, ReadonlySet<string>>();
  for (const event of changed) {
    const selected = new Map<string, ReceivedEventAccount>();
    for (const actor of actorId ? [actorId] : event.audience) {
      const account = input.perspective(actor, event.id);
      if (account) selected.set(actor, account);
      if (!forgotten.has(actor)) forgotten.set(actor, new Set(input.forgotten(actor)));
    }
    accounts.set(event.id, selected);
  }
  return { changed, removed: [...input.removed], accounts, forgotten };
}

/** Exact immutable inputs to the history writer. Native producers supply these
 * selected facts directly; SQL never needs a live or reconstructed world. */
export interface HistoryProjection {
  readonly worldId: string;
  readonly initial: boolean;
  readonly restore: boolean;
  readonly policy: StoryPolicy;
  readonly policyRevision: number;
  readonly policyChanged: boolean;
  readonly principals: readonly { actorId: string; ownerId: string }[];
  readonly fastAppend: boolean;
  readonly changed: readonly WorldEvent[];
  readonly removed: readonly string[];
  readonly newEventIds: ReadonlySet<string>;
  readonly accounts: ReadonlyMap<string, ReadonlyMap<string, ReceivedEventAccount>>;
  readonly accountCuts: ReadonlyMap<string, HistoryAccountCut>;
  readonly personalText: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly subjects: ReadonlyMap<string, StorySubject>;
  readonly forgotten: ReadonlyMap<string, ReadonlySet<string>>;
  readonly forgottenChanges: ReadonlyMap<string, readonly string[]>;
  readonly awarenessChanges: ReadonlyMap<string, readonly Awareness[]>;
  readonly correctedEvents: ReadonlyMap<string, readonly string[]>;
}

/** Fold successive accepted cuts behind one SQL prefix. Occurrences keep the
 * personal accounts captured when they were admitted; eligibility follows the
 * latest supplied actor cut. Neither resident eviction nor a later empty cut
 * can erase an earlier admitted perspective.
 * docs/projects/native-simulation-core-tech-design.md#62-direct-changed-record-saving
 */
export function mergeHistoryProjection(
  before: HistoryProjection,
  after: HistoryProjection,
): HistoryProjection {
  if (before.worldId !== after.worldId)
    throw new Error('Cannot merge history from different worlds.');
  if (before.initial || after.initial || before.restore || after.restore)
    throw new Error('Initial and restored history require their own SQL prefix.');
  const changed = new Map<string, WorldEvent>();
  const removed = new Set<string>();
  const newEventIds = new Set<string>();
  const accounts = new Map<string, ReadonlyMap<string, ReceivedEventAccount>>();
  const personalText = new Map<string, ReadonlyMap<string, string>>();
  for (const input of [before, after]) {
    const incomingIds = new Set<string>();
    if (input.fastAppend && input.removed.length)
      throw new Error('Append-only history cannot remove an original.');
    for (const id of input.removed) {
      changed.delete(id);
      removed.add(id);
      newEventIds.delete(id);
      accounts.delete(id);
      personalText.delete(id);
    }
    for (const event of input.changed) {
      if (incomingIds.has(event.id)) throw new Error('Duplicate changed history event identity.');
      incomingIds.add(event.id);
      if (input.fastAppend && (!input.newEventIds.has(event.id) || changed.has(event.id)))
        throw new Error('Append-only history cannot replace an original.');
      changed.set(event.id, event);
      removed.delete(event.id);
      if (input.newEventIds.has(event.id)) newEventIds.add(event.id);
      const captured = input.accounts.get(event.id);
      if (captured) accounts.set(event.id, captured);
      else accounts.delete(event.id);
      const text = input.personalText.get(event.id);
      if (text) personalText.set(event.id, text);
      else personalText.delete(event.id);
    }
  }
  const forgottenChanges = mergeHistoryIds(before.forgottenChanges, after.forgottenChanges);
  const correctedEvents = mergeHistoryIds(before.correctedEvents, after.correctedEvents);
  const awarenessChanges = new Map<string, readonly Awareness[]>();
  for (const input of [before, after])
    for (const [actor, entries] of input.awarenessChanges) {
      const selected = new Map(awarenessChanges.get(actor)?.map((entry) => [entry.eventId, entry]));
      for (const entry of entries) selected.set(entry.eventId, entry);
      awarenessChanges.set(actor, [...selected.values()]);
    }
  return {
    worldId: after.worldId,
    initial: false,
    restore: false,
    policy: after.policy,
    policyRevision: after.policyRevision,
    policyChanged: before.policyChanged || after.policyChanged,
    principals: after.principals,
    fastAppend: before.fastAppend && after.fastAppend,
    changed: [...changed.values()],
    removed: [...removed],
    newEventIds,
    accounts,
    accountCuts: new Map([...before.accountCuts, ...after.accountCuts]),
    personalText,
    subjects: new Map([...before.subjects, ...after.subjects]),
    forgotten: new Map([...before.forgotten, ...after.forgotten]),
    forgottenChanges,
    awarenessChanges,
    correctedEvents,
  };
}

function mergeHistoryIds(
  before: ReadonlyMap<string, readonly string[]>,
  after: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, readonly string[]> {
  const merged = new Map(before);
  for (const [actor, ids] of after)
    merged.set(actor, [...new Set([...(merged.get(actor) ?? []), ...ids])]);
  return merged;
}

/** A replacement changes archived personal wording only when its acquired
 * evidence changed. Native changed-row readers reuse this exact comparison. */
export function replacedHistoryAwareness(
  before: ReadonlyMap<string, Awareness>,
  after: readonly Awareness[],
): readonly Awareness[] {
  return after.filter((entry) => {
    const prior = before.get(entry.eventId);
    return (
      !!prior &&
      prior !== entry &&
      JSON.stringify(eventEvidence(prior)) !== JSON.stringify(eventEvidence(entry))
    );
  });
}

export function captureHistoryProjection(
  previous: WorldState | undefined,
  world: WorldState,
  input: PreparedHistory,
  restore: boolean,
  changes?: RecordChanges,
): HistoryProjection {
  const appendSources =
    !!changes &&
    !restore &&
    !changes.deletes.has('experience_state') &&
    !changes.deletes.has('mind_awareness_owners') &&
    !changes.deletes.has('mind_awareness') &&
    !(changes.writes.get('mind_awareness') ?? []).some((row) => !row.create) &&
    [
      'mind_forgotten',
      'mind_corrections',
      'mind_forgotten_owners',
      'mind_corrections_owners',
    ].every((table) => !changes.writes.has(table) && !changes.deletes.has(table));
  const read = captureHistoryRead(input);
  const accountCuts = new Map<string, HistoryAccountCut>();
  const texts = new Map<string, Map<string, string>>();
  const subjects = new Map<string, StorySubject>();
  const policy = world.storyPolicy ?? defaultStoryPolicy();
  const newEventIds = new Set<string>();
  for (const event of input.changed) {
    if (previous && !input.previousIds?.has(event.id)) newEventIds.add(event.id);
    const eventTexts = new Map<string, string>();
    for (const actorId of event.audience) {
      if (!accountCuts.has(actorId))
        accountCuts.set(actorId, captureHistoryAccountCut(world, actorId));
      if (!input.fastAppend && event.type !== 'speech')
        eventTexts.set(actorId, personalText(world, actorId, event.narration ?? event.text));
    }
    texts.set(event.id, eventTexts);
    const evidence = [...(read.accounts.get(event.id)?.values() ?? [])].map(
      (account) => account.evidence,
    );
    for (const id of [
      event.actorId,
      event.targetId,
      ...evidence.flatMap((entry) => [entry.sourceId, entry.targetId]),
    ]) {
      if (!id || subjects.has(id)) continue;
      const entity = entityGet(world.entities, id);
      if (entity)
        subjects.set(id, {
          id,
          ...(entity.mechanismFields?.[policy.id]
            ? { mechanismFields: { [policy.id]: entity.mechanismFields[policy.id]! } }
            : {}),
          ...(entity.actor ? { actor: {} } : {}),
          ...(entity.animal ? { animal: {} } : {}),
        });
    }
  }
  const forgottenChanges = new Map<string, readonly string[]>();
  for (const [actorId, ids] of appendSources
    ? []
    : Object.entries(world.experience?.forgotten ?? {})) {
    if (!restore && ids === previous?.experience?.forgotten[actorId]) continue;
    const prior = new Set(restore ? [] : previous?.experience?.forgotten[actorId]);
    forgottenChanges.set(
      actorId,
      ids.filter((id) => !prior.has(id)),
    );
  }
  const awarenessChanges = new Map<string, readonly Awareness[]>();
  if (previous && !appendSources)
    for (const [actorId, entries] of Object.entries(world.experience?.awareness ?? {})) {
      const before = previous.experience?.awareness[actorId] ?? [];
      if (entries === before || appendedRecordCount(before, entries) !== undefined) continue;
      let prefix = 0;
      while (prefix < before.length && entries[prefix] === before[prefix]) prefix++;
      const old = new Map(before.slice(prefix).map((entry) => [entry.eventId, entry]));
      awarenessChanges.set(actorId, replacedHistoryAwareness(old, entries.slice(prefix)));
    }
  const correctedEvents = new Map<string, readonly string[]>();
  for (const [actorId, corrections] of Object.entries(world.experience?.corrections ?? {})) {
    if (corrections === previous?.experience?.corrections?.[actorId]) continue;
    correctedEvents.set(
      actorId,
      Object.entries(corrections).flatMap(([id, evidence]) =>
        previous?.experience?.corrections?.[actorId]?.[id] === evidence
          ? []
          : [world.memories[actorId]?.find((memory) => memory.id === id)?.eventId ?? id],
      ),
    );
  }
  return {
    worldId: world.id,
    initial: !previous,
    restore,
    policy,
    policyRevision: world.storyPolicyRevision ?? 0,
    policyChanged: !!previous && previous.storyPolicyRevision !== world.storyPolicyRevision,
    principals: Object.entries(world.authorship.playerAccountIds).map(([actorId, ownerId]) => ({
      actorId,
      ownerId,
    })),
    fastAppend: input.fastAppend,
    changed: read.changed,
    removed: read.removed,
    newEventIds,
    accounts: read.accounts,
    accountCuts,
    personalText: texts,
    subjects,
    forgotten: read.forgotten,
    forgottenChanges,
    awarenessChanges,
    correctedEvents,
  };
}

const retiredHistoryInputs = new WeakMap<RecordChanges, Map<string, ReadonlySet<string>>>();
export interface HistoryAccountCut {
  readonly actorId: string;
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly forgotten: ReadonlySet<string>;
  readonly corrected: ReadonlySet<string>;
  readonly frontier: import('@open-legend/domain').TemporalActorHistory['frontier'];
  readonly recent: import('@open-legend/domain').TemporalActorHistory['recent'] | undefined;
}
/** Selected-actor history input owns bounded scalar/receipt references, never the
 * whole world or its shared received-value catalogue across a read wait. */
export function captureHistoryAccountCut(world: WorldState, actorId: string): HistoryAccountCut {
  const actor = world.experience?.temporal?.actors[actorId];
  return {
    actorId,
    at: world.simTime,
    maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
    forgotten: new Set(world.experience?.forgotten[actorId]),
    corrected: new Set(Object.keys(world.experience?.corrections?.[actorId] ?? {})),
    frontier: actor?.frontier,
    recent: actor?.recent,
  };
}
/** Saved and pending readers share current personal eligibility. An admitted
 * world event remains archived after its temporary personal receipt expires. */
export function historyAccountAtCut(
  world: WorldState,
  changes: RecordChanges | undefined,
  actorId: string,
  eventId: string,
  account: ReceivedEventAccount | undefined,
): ReceivedEventAccount | undefined {
  return historyAccountAtCapturedCut(
    captureHistoryAccountCut(world, actorId),
    changes,
    eventId,
    account,
  );
}
/** Scalar personal grant eligibility also applies when its exact body is cold.
 * A saved row's presence is never a substitute for the current retention cut. */
export function temporalHistoryAccountAvailable(
  cut: HistoryAccountCut,
  account: Pick<NonNullable<ReceivedEventAccount['temporal']>, 'receivedAt' | 'receipt'>,
): boolean {
  if (
    account.receipt.actorId !== cut.actorId ||
    !temporalRecentAt(account.receivedAt, cut.at, cut.maxAgeSeconds) ||
    (cut.frontier?.expiredThroughTime !== null &&
      cut.frontier?.expiredThroughTime !== undefined &&
      account.receivedAt <= cut.frontier.expiredThroughTime) ||
    !cut.recent ||
    !receivedDirectoryContains(cut.recent, account.receipt)
  )
    return false;
  const pressure = cut.frontier?.pressureThrough?.address;
  // An occurrence is indivisible: a boundary inside this entry removes all of
  // its story grant. Sample members keep their separate native eligibility.
  return (
    !pressure ||
    account.receipt.batchOrder > pressure.batchOrder ||
    (account.receipt.batchOrder === pressure.batchOrder &&
      account.receipt.entryIndex > pressure.entryIndex)
  );
}
export function historyAccountAtCapturedCut(
  cut: HistoryAccountCut,
  changes: RecordChanges | undefined,
  eventId: string,
  account: ReceivedEventAccount | undefined,
): ReceivedEventAccount | undefined {
  const actorId = cut.actorId;
  if (!account || cut.forgotten.has(eventId) || cut.corrected.has(eventId)) return;
  let index = changes && retiredHistoryInputs.get(changes);
  if (changes && !index) {
    index = new Map();
    for (const table of ['mind_temporal_pages', 'mind_awareness'])
      index.set(
        table,
        new Set([...(changes.deletes.get(table) ?? []), ...(changes.expired?.get(table) ?? [])]),
      );
    retiredHistoryInputs.set(changes, index);
  }
  if (account.awareness) {
    const id = JSON.stringify([
      'world',
      'experience',
      'awareness',
      actorId,
      account.awareness.eventId,
    ]);
    if (index?.get('mind_awareness')?.has(id)) return;
  }
  if (account.temporal) {
    const temporal = account.temporal;
    if (!temporalHistoryAccountAvailable(cut, temporal)) return;
  }
  return account;
}
