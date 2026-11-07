import { currentContactEntries, currentContactGet } from '@open-legend/domain';
import {
  receiptLookupBuckets,
  decodeTemporalPageRow,
  temporalPageRecordId,
  temporalPageValueReferences,
} from './temporal-page-storage.js';
import {
  selectedTemporalPolicy,
  captureTemporalReadContext,
  captureTemporalReceiptPrefix,
  receivedDirectoryContains,
  canonicalJson,
  immutableDataSnapshot,
  appendedRecordCount,
  selectedAttentionPolicy,
  temporalPageReferences,
  selectTemporalPageEntries,
  receivedRecordValueReferences,
  selectCapturedTemporalHistory,
  receivedObservationValueReferences,
  receivedContactValueReferences,
  receivedVisualConfirmationValueReferences,
  recordMapChangesBetween,
  type TemporalReadContext,
  type WorldState,
  type TemporalPage,
  type TemporalHistorySelection,
  type ReceivedValueLookup,
  type ReceivedValueFragment,
  type TemporalReceiptPrefix,
  type TemporalReceiptLocator,
  type TemporalValue,
  type ReceivedFrontier,
  type ReceivedObservation,
  type ReceivedEntrySelection,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { MemoryScope } from './memory-repository.js';
import type { SourceVersionPlan } from './source-version-retention.js';

const maximumPreparation = 4 * 1024 * 1024;
export const maximumTemporalPreparationRows = 8192;
export { temporalPageRecordId } from './temporal-page-storage.js';
export { temporalPageValueReferences } from './temporal-page-storage.js';

/** This projection controls payload reclamation, so a malformed saved index
 * must refuse before it can erase a still-owned value. */
export function readTemporalPageRecord(row: Record<string, unknown>): TemporalPage {
  const chunk = decodeTemporalPageRow(row);
  validateTemporalPageValueReferences(chunk, row['value_refs']);
  return chunk;
}
export function validateTemporalPageValueReferences(
  chunk: TemporalPage,
  references: unknown,
): void {
  if (canonicalJson(references) !== canonicalJson(temporalPageValueReferences(chunk)))
    throw new MemoryRetentionError('Temporal value ownership metadata disagrees with its receipt.');
}
export function temporalPageSourceId(actorId: string, recordId: string): string | undefined {
  const path = JSON.parse(recordId) as unknown;
  if (!Array.isArray(path) || typeof path.at(-1) !== 'string') return;
  const id = path.at(-1) as string;
  return temporalPageRecordId(actorId, id) === recordId ? id : undefined;
}
export interface PreparedMemoryRetention {
  state: SavedWorld;
  rows: Map<string, string[]>;
  positions?: Map<string, Map<string, number>>;
  /** Selected canonical predecessors for exact archival and cold-owner diffs. */
  previous?: Map<string, Map<string, unknown>>;
  versions?: SourceVersionPlan;
}
/** Several retention stages may edit one account. Preserve its first selected
 * body, not an intermediate replacement, for the captured pre-change revision.
 * docs/projects/bookkeeping-simplification-runtime-design.md#e2--a-read-context-is-not-a-write-set */
export function mergeRetirementPredecessors(
  target: NonNullable<PreparedMemoryRetention['previous']>,
  source: PreparedMemoryRetention['previous'],
): void {
  for (const [table, records] of source ?? []) {
    let originals = target.get(table);
    if (!originals) target.set(table, (originals = new Map()));
    for (const [id, value] of records) if (!originals.has(id)) originals.set(id, value);
  }
}
export interface TemporalHistoryPage extends TemporalHistorySelection {
  hasMore: boolean;
  /** Last examined receipt, including a whole omitted oversized receipt. */
  nextBefore?: NonNullable<TemporalHistoryQuery['before']>;
}
export interface TemporalHistoryQuery {
  from?: number;
  through?: number;
  before?: {
    epoch: string;
    batchOrder: number;
    entryIndex: number;
    memberIndex: number;
    at: number;
    order: number;
  };
  subjects?: readonly string[];
  includeGeometry?: boolean;
  physicalLife?: number;
  epoch?: string;
  limit?: number;
  bytes?: number;
  cut?: TemporalReceiptPrefix;
  measurements?: { from: number; through: number };
  kinds?: readonly TemporalValue['kind'][];
}

/** Captured actor-local read inputs. Blocks are copied only for this actor's
 * resident tail; the global received-value catalogue is never retained. */
export interface TemporalHistoryWindow {
  capture(subjects: ReadonlySet<string>): TemporalHistoryReadContext;
  contains(locator: TemporalReceiptLocator, memberIndex: number): boolean;
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly frontier?: ReceivedFrontier;
}
export function temporalHistoryWindow(world: WorldState, actorId: string): TemporalHistoryWindow {
  const actor = world.experience?.temporal?.actors[actorId];
  return {
    contains: (locator, memberIndex) =>
      !!actor && receivedDirectoryContains(actor.recent, locator, memberIndex),
    capture: (subjects) =>
      captureTemporalHistoryReadContext(world, actorId, { subjects: [...subjects] }),
    at: world.simTime,
    maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
    frontier: world.experience?.temporal?.actors[actorId]?.frontier,
  };
}
export interface TemporalHistoryReadContext {
  readonly worldId: string;
  readonly actorId: string;
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly maximumSubjects: number;
  readonly maximumOperations: number;
  readonly maximumCandidates: number;
  readonly pages: readonly TemporalPage[];
  readonly releasedThrough?: number;
  readonly frontier?: ReceivedFrontier;
  readonly recordingGap?: { readonly from: number; readonly through: number };
  readonly sources: ReceivedValueLookup;
  readonly disclosure: TemporalReadContext;
  readonly cut: TemporalReceiptPrefix;
}
export function captureTemporalHistoryReadContext(
  world: WorldState,
  actorId: string,
  selection: Pick<TemporalHistoryQuery, 'subjects' | 'from' | 'through' | 'includeGeometry'> = {},
): TemporalHistoryReadContext {
  const actor = world.experience?.temporal?.actors[actorId];
  const subjectSet = selection.subjects ? new Set(selection.subjects) : undefined;
  const pages = (actor?.pages ?? [])
    .filter(
      (page) =>
        !subjectSet ||
        page.subjects.some((subject) => subjectSet.has(subject)) ||
        (selection.includeGeometry &&
          page.batches.some((batch) =>
            batch.entries.some((entry) => entry.receipt?.spatialContext),
          )),
    )
    .map((page) => immutableDataSnapshot(page));
  const sources: Record<string, ReceivedValueLookup[string]> = {};
  for (const chunk of pages)
    for (const id of temporalPageReferences(chunk)) {
      const source = world.receivedValues?.sources[id];
      if (!source) continue;
      sources[id] = { value: immutableDataSnapshot(source.value) };
    }
  return {
    worldId: world.id,
    actorId,
    at: world.simTime,
    maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
    maximumSubjects: selectedAttentionPolicy(world).maximumCapacity,
    maximumOperations: selectedAttentionPolicy(world).scene.historyReceipts,
    maximumCandidates: selectedAttentionPolicy(world).scene.candidateVisits,
    pages,
    ...(actor?.frontier ? { frontier: immutableDataSnapshot(actor.frontier) } : {}),
    ...(actor?.releasedThrough === undefined ? {} : { releasedThrough: actor.releasedThrough }),
    ...(actor?.recordingGap ? { recordingGap: { ...actor.recordingGap } } : {}),
    sources,
    disclosure: captureTemporalReadContext(world, actorId),
    cut: captureTemporalReceiptPrefix(world, actorId),
  };
}

/** Changed personal ownership selects candidate blocks before any global
 * reference union or SQL. Confirmation/header-only changes release nothing. */
export function receivedValueReleaseCandidates(
  before: Pick<WorldState, 'receivedValues' | 'perceptionEvidence' | 'experience'> | undefined,
  after: WorldState,
): Set<string> {
  const candidates = new Set<string>();
  const observations = new WeakSet<ReceivedObservation>();
  const addObservation = (source: ReceivedObservation) => {
    if (observations.has(source)) return;
    observations.add(source);
    for (const reference of receivedObservationValueReferences(source)) candidates.add(reference);
  };
  if (before?.perceptionEvidence !== after.perceptionEvidence)
    for (const [actorId, owner] of Object.entries(before?.perceptionEvidence ?? {})) {
      const current = after.perceptionEvidence?.[actorId];
      if (owner === current) continue;
      if (owner.visualConfirmation !== current?.visualConfirmation) {
        const nextFrames = receivedVisualConfirmationValueReferences(current?.visualConfirmation);
        for (const frame of receivedVisualConfirmationValueReferences(owner.visualConfirmation))
          if (!nextFrames.has(frame)) candidates.add(frame);
      }
      if (owner.received !== current?.received) {
        const retained = new Set(current?.received);
        for (const source of owner.received) if (!retained.has(source)) addObservation(source);
      }
      if (owner.current !== current?.current)
        for (const [key, contact] of currentContactEntries(owner)) {
          const next = current && currentContactGet(current, key);
          if (contact === next) continue;
          const nextRefs = next && receivedContactValueReferences(next);
          for (const reference of receivedContactValueReferences(contact))
            if (!nextRefs?.has(reference)) candidates.add(reference);
        }
    }
  if (before?.experience?.temporal !== after.experience?.temporal)
    for (const [actorId, actor] of Object.entries(before?.experience?.temporal?.actors ?? {})) {
      const next = after.experience?.temporal?.actors[actorId];
      if (actor.pages === next?.pages) continue;
      const pages = new Map((next?.pages ?? []).map((chunk) => [chunk.id, chunk]));
      for (const chunk of actor.pages) {
        const retained = pages.get(chunk.id);
        if (
          chunk === retained ||
          (retained && appendedRecordCount(chunk.batches, retained.batches) !== undefined)
        )
          continue;
        // A surviving block ID can still lose an individual logical member.
        for (const id of temporalPageReferences(chunk)) candidates.add(id);
      }
    }
  if (before?.receivedValues !== after.receivedValues) {
    const old = before?.receivedValues?.sources ?? {},
      current = after.receivedValues?.sources ?? {};
    if (old !== current)
      for (const id of recordMapChangesBetween(old, current) ??
        new Set([...Object.keys(old), ...Object.keys(current)])) {
        const source = current[id];
        const prior = old[id];
        if (
          (!source && prior) ||
          (source && !prior) ||
          (source && prior && source !== prior && prior.value !== source.value)
        )
          candidates.add(id);
      }
  }
  return candidates;
}

/** Recent history already owns exact totals/deadlines; do not query cold pages
 * merely because a current frame appended. */
export function recentRetentionDue(world: WorldState, actorId: string): boolean {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return false;
  const policy = selectedTemporalPolicy(world).recent;
  return (
    actor.maintenanceDue ||
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (actor.nextDue !== null && actor.nextDue <= world.simTime)
  );
}

/** Saved counters select actors before any cold metadata is read. */
export function* retentionDueActors(world: WorldState): Generator<string> {
  const policy = selectedTemporalPolicy(world);
  for (const [id, actor] of Object.entries(world.experience?.temporal?.actors ?? {}))
    if (
      !actor.accounts ||
      (actor.accounts.nextDue !== null && actor.accounts.nextDue <= world.simTime) ||
      (['optional', 'required', 'speech'] as const).some(
        (key) =>
          actor.accounts![key].bytes > policy[key].maxBytes ||
          actor.accounts![key].count > policy[key].maxRecords,
      )
    )
      yield id;
}
export function retentionNeedsPreparation(world: WorldState): boolean {
  return !retentionDueActors(world).next().done;
}

export class MemoryRetentionError extends Error {
  override readonly name = 'MemoryRetentionError';
}

/** Read metadata before bodies. The caller retains the same authority/privacy
 * fence across this await and the final disclosure. Shared source IDs grant nothing. */
export async function readTemporalHistory(
  db: SqlDatabase,
  scope: MemoryScope,
  context: TemporalHistoryReadContext,
  query: TemporalHistoryQuery,
): Promise<TemporalHistoryPage> {
  if (context.worldId !== scope.worldId || context.actorId !== scope.actorId)
    throw new MemoryRetentionError('Foreign temporal history scope.');
  const cut = query.cut ?? context.cut;
  if (cut.throughOrder > context.cut.throughOrder)
    throw new MemoryRetentionError('Temporal history selection exceeds its captured cut.');
  if (cut.epoch === null) return { entries: [], incomplete: true, hasMore: false };
  const head = await db
    .prepare('SELECT generation FROM world_head WHERE world_id=?')
    .get(scope.worldId);
  if (head?.['generation'] !== scope.generation)
    throw new MemoryRetentionError('Temporal history changed before selection.');
  const from = Math.max(
    query.from ?? 0,
    context.at - context.maxAgeSeconds,
    context.frontier?.expiredThroughTime ?? 0,
  );
  const through = Math.min(query.through ?? context.at, context.at);
  const subjects = query.subjects ?? [];
  if (subjects.length > context.maximumSubjects)
    throw new MemoryRetentionError('Temporal history selection exceeds its subject allowance.');
  const limit = Math.max(1, Math.min(128, query.limit ?? 128));
  const maxBytes = Math.max(1, Math.min(maximumPreparation, query.bytes ?? 8192));
  const metadata = await db
    .prepare(
      `SELECT id,first_at,receipt_epoch,first_batch_order,first_entry,first_member,
        encoded_bytes FROM mind_temporal_pages c
      WHERE world_id=? AND actor_id=? AND last_at>=? AND first_at<=?
      ${subjects.length ? `AND ((c.lookup_buckets && ?::smallint[] AND c.subject_keys && ?::text[])${query.includeGeometry ? ' OR c.spatial_context=1' : ''})` : ''}
      ${query.physicalLife === undefined ? '' : 'AND physical_life=?'}
      ${query.epoch === undefined ? '' : 'AND receipt_epoch=?'}
      ${cut ? 'AND (first_batch_order,first_entry)<=(?,?)' : ''}
      ${query.before ? 'AND (first_batch_order,first_entry,first_member)<(?,?,?)' : ''}
      ORDER BY first_batch_order DESC,first_entry DESC,first_member DESC,id DESC LIMIT 129`,
    )
    .all(
      scope.worldId,
      scope.actorId,
      from,
      through,
      ...(subjects.length ? [receiptLookupBuckets('subjects', subjects), subjects] : []),
      ...(query.physicalLife === undefined ? [] : [query.physicalLife]),
      ...(query.epoch === undefined ? [] : [query.epoch]),
      ...(cut ? [cut.throughBatchOrder, cut.throughEntryIndex] : []),
      ...(query.before
        ? [query.before.batchOrder, query.before.entryIndex, query.before.memberIndex]
        : []),
    );
  const pages = new Map<string, TemporalPage>();
  const selected: string[] = [];
  const sourceIds = new Set<string>();
  const metadataCursor = (row: Record<string, unknown>) => ({
    at: Number(row['first_at']),
    order: Number(row['first_batch_order']),
    epoch: String(row['receipt_epoch']),
    batchOrder: Number(row['first_batch_order']),
    entryIndex: Number(row['first_entry']),
    memberIndex: Number(row['first_member']),
  });
  let metadataBefore: TemporalHistoryPage['nextBefore'];
  let preparationBytes = 0,
    incomplete = metadata.length > 128 || !!context.recordingGap,
    hasMore = metadata.length > 128;
  for (const row of metadata.slice(0, 128)) {
    const size = Number(row['encoded_bytes']);
    if (preparationBytes + size > maximumPreparation) {
      incomplete = true;
      hasMore = true;
      if (!selected.length) metadataBefore = metadataCursor(row);
      break;
    }
    metadataBefore = metadataCursor(row);
    selected.push(String(row['id']));
    preparationBytes += size;
  }
  const hydrate = async (ids: readonly string[]) => {
    if (!ids.length) return;
    for (const row of await db
      .prepare(
        'SELECT * FROM mind_temporal_pages WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
      )
      .all(scope.worldId, scope.actorId, ids)) {
      const page = readTemporalPageRecord(row);
      if (page.actorId !== scope.actorId) throw new MemoryRetentionError('Foreign temporal block.');
      pages.set(page.id, page);
    }
  };
  await hydrate(selected);
  for (const page of context.pages)
    if (
      (!subjects.length ||
        query.includeGeometry ||
        page.subjects.some((subject) => subjects.includes(subject))) &&
      (query.physicalLife === undefined || page.physicalLife === query.physicalLife) &&
      (query.epoch === undefined || page.epoch === query.epoch)
    )
      pages.set(page.id, page);
  // Pending members replace the same immutable logical coordinates. Physical
  // slices can share an entry, so overlay only their actual member intersection.
  const nativeMembers = new Map<string, Set<number>>();
  for (const page of context.pages)
    for (const batch of page.batches)
      for (const entry of batch.entries) {
        const key = JSON.stringify([
          page.physicalLife,
          page.epoch,
          batch.batchOrder,
          entry.entryIndex,
        ]);
        let members = nativeMembers.get(key);
        if (!members) nativeMembers.set(key, (members = new Set()));
        for (const facet of entry.receipt?.facets ?? []) members.add(facet.memberIndex);
      }
  const trimmedPages = new Map<string, readonly ReceivedEntrySelection[]>();
  for (const [id, page] of pages) {
    if (context.pages.includes(page)) continue;
    let changed = false;
    const selections = page.batches.flatMap((batch) =>
      batch.entries.flatMap((entry) => {
        const replaced = nativeMembers.get(
          JSON.stringify([page.physicalLife, page.epoch, batch.batchOrder, entry.entryIndex]),
        );
        if (!replaced) return [{ batchOrder: batch.batchOrder, entryIndex: entry.entryIndex }];
        const all = [...(entry.receipt?.facets.map((facet) => facet.memberIndex) ?? [])];
        const kept = new Set(all.filter((member) => !replaced.has(member)));
        changed ||= kept.size !== all.length;
        return kept.size
          ? [{ batchOrder: batch.batchOrder, entryIndex: entry.entryIndex, members: kept }]
          : [];
      }),
    );
    if (!changed) continue;
    if (!selections.length) pages.delete(id);
    else trimmedPages.set(id, selections);
  }
  // Select native field references before cold value hydration. Rebuilding the
  // selected page's authoritative metadata waits for those exact values below.
  for (const [id, chunk] of pages) {
    const selections = trimmedPages.get(id);
    if (!selections) {
      for (const ref of temporalPageReferences(chunk)) sourceIds.add(ref);
      continue;
    }
    const selected = new Map(
      selections.map((selection) => [
        JSON.stringify([selection.batchOrder, selection.entryIndex]),
        selection.members,
      ]),
    );
    for (const batch of chunk.batches)
      for (const entry of batch.entries) {
        const key = JSON.stringify([batch.batchOrder, entry.entryIndex]);
        if (!selected.has(key)) continue;
        for (const ref of receivedRecordValueReferences(entry.receipt, selected.get(key)))
          sourceIds.add(ref);
      }
  }
  preparationBytes = [...pages.values()].reduce(
    (bytes, chunk) => bytes + Buffer.byteLength(JSON.stringify(chunk)),
    0,
  );
  const sources: Record<string, { value: ReceivedValueFragment }> = {},
    missing: string[] = [];
  for (const id of sourceIds.keys()) {
    const value = context.sources[id]?.value;
    if (value) {
      sources[id] = { value };
      preparationBytes += Buffer.byteLength(JSON.stringify(value));
    } else missing.push(id);
  }
  const unavailable = () => ({
    entries: [],
    incomplete: true,
    hasMore: !!metadataBefore,
    ...(metadataBefore ? { nextBefore: metadataBefore } : {}),
  });
  if (preparationBytes > maximumPreparation || missing.length > maximumTemporalPreparationRows)
    return unavailable();
  if (missing.length) {
    const args = [scope.worldId, missing];
    const sizes = await db
      .prepare(
        `SELECT SUM(octet_length((payload::json->'value')::text)) AS bytes
      FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])`,
      )
      .get(...args);
    preparationBytes += Number(sizes?.['bytes'] ?? 0);
    if (preparationBytes > maximumPreparation) return unavailable();
    for (const row of await db
      .prepare(
        `SELECT source_id,(payload::json->'value')::text AS payload
      FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])`,
      )
      .all(...args)) {
      if (typeof row['payload'] === 'string')
        sources[String(row['source_id'])] = {
          value: JSON.parse(row['payload']) as ReceivedValueFragment,
        };
    }
  }

  for (const [id, selections] of trimmedPages)
    pages.set(id, selectTemporalPageEntries(pages.get(id)!, selections, { sources }));
  const selection = selectCapturedTemporalHistory(
    { ...context, pages: [...pages.values()], sources },
    { ...query, cut, from, through, limit, bytes: maxBytes, operations: context.maximumOperations },
  );
  incomplete ||= selection.incomplete;
  hasMore ||= selection.hasMore === true;
  const nextBefore = hasMore ? (selection.examinedBefore ?? metadataBefore) : undefined;
  return { ...selection, incomplete, hasMore, ...(nextBefore ? { nextBefore } : {}) };
}
