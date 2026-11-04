export { nextRecentRetentionAt } from './retention-deadlines.js';
import {
  retireTemporalPages,
  temporalOpenReservationTotals,
  temporalPageLastReceivedAt,
  expireTemporalOpenRecordings,
  selectedPruneObserverIndividuals,
  selectedTemporalPolicy,
  retireTemporalOperations,
  updateWorld,
  type TemporalPage,
} from '@open-legend/domain';
import { retirableTemporalPage } from './temporal-page-storage.js';
import type { RecordChanges } from './world-records.js';
import type { RetainedSourceChanges } from './retention-record-metadata.js';
import type { SqlDatabase, SavedWorld } from './store.js';
import {
  selectTemporalRetirement,
  temporalPageRecordId,
  MemoryRetentionError,
  type PreparedMemoryRetention,
} from './temporal-storage.js';

// One slice selects cheap headers. It neither loads source bodies nor opens a
// per-person support closure: lasting owners already admitted their own support.
const headerSlice = 64;
interface Header {
  actorId: string;
  id: string;
  sourceId: string;
  order: number;
  firstAt: number;
  throughAt: number;
  receivedThrough: number;
  throughOrdinal: number;
  bytes: number;
  count: number;
}
interface ActorPlan {
  actorId: string;
  epoch: string;
  physicalLife: number;
  removed: Header[];
  expiredOpen: { bytes: number; count: number };
  // Only a selected resident boundary can require exact pressure trimming. Its
  // immutable identity is the dependency, not the unrelated world's revision.
  partial?: { chunk: TemporalPage; ordinals: Set<number>; nextDue: number | null };
  nextDue: number | null;
  more: boolean;
}
export interface RecentRetentionPlan {
  worldId: string;
  at: number;
  actors: ActorPlan[];
}

function nativeHeader(actorId: string, chunk: TemporalPage): Header {
  return {
    actorId,
    id: temporalPageRecordId(actorId, chunk.id),
    sourceId: chunk.id,
    order: chunk.order,
    firstAt: chunk.fromAt,
    throughAt: chunk.throughAt,
    receivedThrough: temporalPageLastReceivedAt(chunk),
    throughOrdinal: chunk.throughOrdinal,
    bytes: chunk.bytes,
    count: chunk.count,
  };
}
const compareHeaders = (a: Header, b: Header) =>
  a.receivedThrough - b.receivedThrough ||
  a.order - b.order ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Read preparation selects acknowledged physical headers outside mutation.
 * Pending edits exclude targets; native history stays charged until its normal save. */
export async function prepareRecentRetention(
  db: SqlDatabase,
  state: SavedWorld,
  due: readonly string[],
  pending?: RecordChanges,
): Promise<RecentRetentionPlan> {
  const world = state.world,
    policy = selectedTemporalPolicy(world).recent;
  const result: RecentRetentionPlan = { worldId: world.id, at: world.simTime, actors: [] };
  if (!due.length) return result;
  // Pending native containers are not durable page IDs. Editing or deleting them
  // could race their in-flight prefix save. Their charges remain until that save
  // publishes exact physical pages; the existing save/maintenance wakes retry.
  const blocked = new Set(pending?.deletes.get('mind_temporal_pages') ?? []);
  for (const row of pending?.writes.get('mind_temporal_pages') ?? []) blocked.add(row.id);
  for (const intent of pending?.temporal?.values() ?? [])
    blocked.add(temporalPageRecordId(intent.after.actorId, intent.after.id));
  for (const actorId of due)
    for (const page of world.experience!.temporal!.actors[actorId]!.pages)
      if (!retirableTemporalPage(page)) blocked.add(temporalPageRecordId(actorId, page.id));
  const readHeaders = () =>
    db
      .prepare(
        `
    SELECT q.actor_id,h.id,h.source_id,h.page_order,h.first_at,h.last_at,h.last_received_at,
      h.last_ordinal,h.logical_bytes,h.receipt_count
    FROM jsonb_to_recordset(?::jsonb) q(actor_id text)
    CROSS JOIN LATERAL (
      SELECT id,source_id,page_order,first_at,last_at,last_received_at,last_ordinal,logical_bytes,receipt_count
      FROM mind_temporal_pages
      WHERE world_id=? AND actor_id=q.actor_id AND retired_revision IS NULL
        AND NOT(id=ANY(?::text[]))
      ORDER BY last_received_at,last_order,id LIMIT ?
    ) h`,
      )
      .all(
        JSON.stringify(due.map((actor_id) => ({ actor_id }))),
        world.id,
        [...blocked],
        headerSlice + 1,
      );
  // Read canonical metadata in the validated cut. Pending bodies cannot supply
  // a durable target and must not expand before this bounded header selection.
  const rows = db.readMetadataBaseline
    ? await db.readMetadataBaseline(due, (baseline) => {
        if (baseline.worldId !== world.id)
          throw new MemoryRetentionError('Recent retirement belongs to another world.');
        return readHeaders();
      })
    : await readHeaders();
  const edges = new Map<string, Header>();
  const counts = new Map<string, number>();
  const byActor = new Map<string, Map<string, Header>>();
  for (const actorId of due) byActor.set(actorId, new Map());
  const removed = new Set(pending?.deletes.get('mind_temporal_pages') ?? []);
  for (const row of rows) {
    const actorId = String(row['actor_id']);
    if (removed.has(String(row['id']))) continue;
    const header: Header = {
      actorId,
      id: String(row['id']),
      sourceId: String(row['source_id']),
      order: Number(row['page_order']),
      firstAt: Number(row['first_at']),
      throughAt: Number(row['last_at']),
      receivedThrough: Number(row['last_received_at']),
      throughOrdinal: Number(row['last_ordinal']),
      bytes: Number(row['logical_bytes']),
      count: Number(row['receipt_count']),
    };
    const count = (counts.get(actorId) ?? 0) + 1;
    counts.set(actorId, count);
    if (count > headerSlice) continue;
    edges.set(actorId, header);
    byActor.get(actorId)!.set(header.sourceId, header);
  }
  for (const actorId of due) {
    const actor = world.experience!.temporal!.actors[actorId]!;
    const headers = byActor.get(actorId)!;
    const deferred = actor.pages.filter(
      (page) => !retirableTemporalPage(page) || blocked.has(temporalPageRecordId(actorId, page.id)),
    );
    for (const chunk of actor.pages)
      if (retirableTemporalPage(chunk) && !blocked.has(temporalPageRecordId(actorId, chunk.id)))
        headers.set(chunk.id, nativeHeader(actorId, chunk));
    const hasMore = (counts.get(actorId) ?? 0) > headerSlice,
      edge = edges.get(actorId);
    // A hot tail beyond a cold-page gap cannot turn that gap into a retired
    // prefix. Only the header interval actually examined is eligible this slice.
    const ordered = [...headers.values()]
      .filter((header) => !hasMore || (edge && compareHeaders(header, edge) <= 0))
      .sort(compareHeaders);
    const open = temporalOpenReservationTotals(world, actorId);
    if (
      !ordered.length &&
      !deferred.length &&
      (actor.bytes > open.bytes || actor.count > open.count)
    )
      throw new MemoryRetentionError('Selected recent retirement headers are unavailable.');
    const plan: ActorPlan = {
      actorId,
      epoch: actor.epoch,
      physicalLife: actor.physicalLife,
      removed: [],
      expiredOpen: open.expired,
      nextDue: null,
      more: false,
    };
    const selected = selectTemporalRetirement(
      world,
      actorId,
      ordered.map((header) => ({
        id: header.id,
        sourceId: header.sourceId,
        order: header.order,
        at: header.firstAt,
        through: header.receivedThrough,
        bytes: header.bytes,
        count: header.count,
        sources: [],
        epoch: actor.epoch,
        ordinal: header.throughOrdinal,
      })),
      !hasMore,
    );
    const retiredIds = new Set(selected.retired.map((header) => header.id));
    plan.removed = ordered.filter((header) => retiredIds.has(header.id));
    plan.nextDue = selected.nextDue;
    if (open.nextDue !== null && open.nextDue > world.simTime)
      plan.nextDue = Math.min(plan.nextDue ?? Infinity, open.nextDue);
    const deferredDue = deferred.reduce(
      (at, page) => Math.min(at, temporalPageLastReceivedAt(page) + policy.maxAgeSeconds),
      Infinity,
    );
    if (deferredDue > world.simTime && Number.isFinite(deferredDue))
      plan.nextDue = Math.min(plan.nextDue ?? Infinity, deferredDue);
    const deferredPressure =
      deferred.length > 0 &&
      (actor.bytes -
        open.expired.bytes -
        plan.removed.reduce((sum, header) => sum + header.bytes, 0) >
        policy.maxBytes ||
        actor.count -
          open.expired.count -
          plan.removed.reduce((sum, header) => sum + header.count, 0) >
          policy.maxChanges ||
        deferredDue <= world.simTime);
    plan.more = selected.needsMore || deferredPressure;
    if (selected.partial && selected.boundary) {
      const chunk = actor.pages.find((chunk) => chunk.id === selected.boundary!.sourceId);
      if (!chunk || !retirableTemporalPage(chunk)) plan.more = true;
      else {
        const expired = new Set<number>();
        const removedCount = selected.retired.reduce((sum, header) => sum + header.count, 0);
        const removedBytes = selected.retired.reduce((sum, header) => sum + header.bytes, 0);
        let released = 0,
          releasedBytes = 0;
        for (const operation of chunk.operations.slice(0, -1)) {
          if (
            released >=
              Math.max(1, actor.count - open.expired.count - removedCount - policy.maxChanges) &&
            actor.bytes - open.expired.bytes - removedBytes - releasedBytes <= policy.maxBytes
          )
            break;
          expired.add(operation.ordinal);
          released += operation.charge.count;
          releasedBytes += operation.charge.bytes;
        }
        if (expired.size)
          plan.partial = {
            chunk,
            ordinals: expired,
            nextDue: temporalPageLastReceivedAt(chunk) + policy.maxAgeSeconds,
          };
        else plan.more = true;
      }
    }
    if (plan.more) plan.nextDue = world.simTime;
    result.actors.push(plan);
  }
  return result;
}

/** Apply only the selected prefix. A new later suffix neither invalidates this
 * plan nor loses its charges. A selected rewrite/restore invalidates that actor. */
export function applyRecentRetention(
  state: SavedWorld,
  plan: RecentRetentionPlan,
  changesSinceCapture: RetainedSourceChanges,
): PreparedMemoryRetention & { stale: boolean } {
  const rows = new Map<string, string[]>();
  if (state.world.id !== plan.worldId) return { state, rows, stale: true };
  let stale = false;
  const accepted: ActorPlan[] = [];
  for (const candidate of plan.actors) {
    const actor = state.world.experience?.temporal?.actors[candidate.actorId];
    if (
      !actor ||
      actor.epoch !== candidate.epoch ||
      actor.physicalLife !== candidate.physicalLife
    ) {
      stale = true;
      continue;
    }
    const partialCurrent =
      candidate.partial && actor.pages.find((chunk) => chunk.id === candidate.partial!.chunk.id);
    // A physical page cannot append. Its exact immutable identity must still be
    // the selected acknowledged version when this prepared trim is applied.
    if (
      candidate.partial &&
      (partialCurrent !== candidate.partial.chunk || !retirableTemporalPage(partialCurrent))
    ) {
      stale = true;
      continue;
    }
    const selected = new Set(candidate.removed.map((header) => header.id));
    if (candidate.partial)
      selected.add(temporalPageRecordId(candidate.actorId, candidate.partial.chunk.id));
    const sourceChanges = changesSinceCapture.get(candidate.actorId);
    const changedSelected =
      !sourceChanges ||
      sourceChanges.invalidated ||
      [...sourceChanges.temporalPages].some((id) => selected.has(id));

    if (changedSelected) {
      stale = true;
      continue;
    }
    if (
      candidate.removed.some((header) => {
        const current = actor.pages.find((chunk) => chunk.id === header.sourceId);
        return (
          current &&
          (!retirableTemporalPage(current) ||
            current.bytes !== header.bytes ||
            current.count !== header.count ||
            current.throughOrdinal !== header.throughOrdinal)
        );
      })
    ) {
      stale = true;
      continue;
    }
    // Waiting for the ordinary save changes no personal state. Keep the existing
    // due wake instead of publishing another empty retention update.
    if (
      candidate.more &&
      !candidate.removed.length &&
      !candidate.partial &&
      !candidate.expiredOpen.bytes &&
      !candidate.expiredOpen.count
    )
      continue;
    accepted.push(candidate);
  }
  if (!accepted.length) return { state, rows, stale };
  const world = updateWorld(
    state.world,
    (draft) => {
      for (const candidate of accepted) {
        const expiredOpen = expireTemporalOpenRecordings(draft, candidate.actorId);
        const total = candidate.removed.reduce(
          (sum, header) => ({ bytes: sum.bytes + header.bytes, count: sum.count + header.count }),
          { bytes: 0, count: 0 },
        );
        const last = candidate.removed.at(-1);
        retireTemporalPages(
          draft,
          candidate.actorId,
          candidate.removed.map((header) => header.sourceId),
          total,
          candidate.nextDue,
          last?.throughAt,
          last ? { pageOrder: last.order, ordinal: last.throughOrdinal } : undefined,
        );
        if (candidate.partial)
          retireTemporalOperations(
            draft,
            candidate.actorId,
            candidate.partial.chunk.id,
            candidate.partial.ordinals,
            candidate.partial.nextDue,
          );
        const actor = draft.experience!.temporal!.actors[candidate.actorId]!;
        const policy = selectedTemporalPolicy(draft).recent;
        if (
          candidate.partial &&
          expiredOpen.bytes >= candidate.expiredOpen.bytes &&
          expiredOpen.count >= candidate.expiredOpen.count &&
          (actor.bytes > policy.maxBytes || actor.count > policy.maxChanges)
        ) {
          const current = actor.pages.find((chunk) => chunk.id === candidate.partial!.chunk.id);
          if (current) {
            retireTemporalPages(
              draft,
              candidate.actorId,
              [current.id],
              current,
              null,
              current.throughAt,
              { pageOrder: current.order, ordinal: current.throughOrdinal },
            );
            actor.recordingGap = {
              from: actor.recordingGap?.from ?? current.throughAt,
              through: draft.simTime,
            };
            rows.set('mind_temporal_pages', [
              ...(rows.get('mind_temporal_pages') ?? []),
              temporalPageRecordId(candidate.actorId, current.id),
            ]);
          }
        }
        const openAfter = temporalOpenReservationTotals(draft, candidate.actorId);
        if (openAfter.nextDue !== null)
          actor.nextDue = Math.min(actor.nextDue ?? Infinity, openAfter.nextDue);
        actor.maintenanceDue =
          candidate.more || actor.bytes > policy.maxBytes || actor.count > policy.maxChanges;
        selectedPruneObserverIndividuals(draft, candidate.actorId, { releasedSourceIds: [] });
        if (candidate.removed.length)
          rows.set('mind_temporal_pages', [
            ...(rows.get('mind_temporal_pages') ?? []),
            ...candidate.removed.map((header) => header.id),
          ]);
      }
    },
    { retainNativeValues: true },
  );
  return { state: { ...state, world }, rows, stale };
}
