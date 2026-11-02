import type { RecordChanges } from './world-records.js';
import {
  appendedEventCount,
  entityGet,
  hasMemory,
  appendedRecordCount,
  selectedTemporalPolicy,
  temporalChunkReceipt,
  temporalRecentAt,
  type WorldState,
  type Awareness,
  type WorldEvent,
  type TemporalChunk,
} from '@open-legend/domain';
import { timedSync } from './performance.js';
import { receivedEventAccounts, type ReceivedEventAccount } from './received-event-accounts.js';

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

const retiredHistoryInputs = new WeakMap<RecordChanges, Map<string, ReadonlySet<string>>>();
export interface HistoryAccountCut {
  readonly actorId: string;
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly forgotten: ReadonlySet<string>;
  readonly corrected: ReadonlySet<string>;
  readonly frontier?: { readonly chunkOrder: number; readonly ordinal: number };
  readonly chunks: ReadonlyMap<string, TemporalChunk>;
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
    ...(actor?.retiredThrough
      ? {
          frontier: {
            chunkOrder: actor.retiredThrough.chunkOrder,
            ordinal: actor.retiredThrough.ordinal,
          },
        }
      : {}),
    chunks: new Map(actor?.chunks.map((chunk) => [chunk.id, chunk])),
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
  account: Pick<
    NonNullable<ReceivedEventAccount['temporal']>,
    'receivedAt' | 'chunkOrder' | 'receipt'
  >,
): boolean {
  if (!temporalRecentAt(account.receivedAt, cut.at, cut.maxAgeSeconds)) return false;
  const frontier = cut.frontier;
  return (
    !frontier ||
    account.chunkOrder > frontier.chunkOrder ||
    (account.chunkOrder === frontier.chunkOrder && account.receipt.ordinal > frontier.ordinal)
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
    for (const table of ['mind_temporal_chunks', 'mind_awareness'])
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
    const frontier = cut.frontier;
    const id = JSON.stringify([
      'world',
      'experience',
      'temporal',
      'actors',
      actorId,
      'chunks',
      temporal.chunkId,
    ]);
    if (index?.get('mind_temporal_chunks')?.has(id)) return;
    const chunk = cut.chunks.get(temporal.chunkId);
    if (chunk) {
      const receipt = temporalChunkReceipt(chunk, temporal.receipt.ordinal);
      if (!receipt || !temporalRecentAt(receipt.at, cut.at, cut.maxAgeSeconds)) return;
      if (
        frontier &&
        (chunk.order < frontier.chunkOrder ||
          (chunk.order === frontier.chunkOrder && receipt.ordinal <= frontier.ordinal))
      )
        return;
    }
  }
  return account;
}
