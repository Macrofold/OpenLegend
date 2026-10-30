import {
  referencedReceivedValues,
  pruneReceivedValueBlock,
  updateReceivedRetirementPressure,
  updateWorld,
  freezeWorld,
  type ReceivedValueBlock,
  type ReceivedValueRetirement,
  type WorldState,
} from '@open-legend/domain';
import {
  receiptLookupBuckets,
  evidenceEncodedBytesSql,
  restoreEvidenceLayout,
  snapshotEvidenceOwner,
} from './evidence-segments.js';
import { RECORD_NODES } from './world-record-schema.js';
import type { RecordChanges } from './world-records.js';
import type { JournalTransition } from './world-journal-data.js';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { PreparedMemoryRetention } from './temporal-storage.js';

const maximumBytes = 4 * 1024 * 1024;
const maximumOrdinals = 8192;
const maximumBlocks = 32;
const recordId = (id: string) => JSON.stringify(['world', 'receivedValues', 'sources', id]);
type Candidate = ReceivedValueRetirement['pending'][string];

/** Small known garbage can wait for the next coalesced batch. Unknown physical
 * charges must be resolved promptly because they withhold optional recording. */
export function receivedReclamationNeedsPromptWork(
  world: WorldState,
  journalBytes: number,
  maximumDebtBytes: number,
): boolean {
  const retirement = world.receivedValues?.retirement;
  return (
    !!retirement &&
    (retirement.bytes + journalBytes >= maximumDebtBytes / 8 ||
      Object.values(retirement.pending).some((candidate) => candidate.unknown))
  );
}
export interface ReceivedReclamationCapture {
  worldId: string;
  candidates: Array<{ id: string; candidate: Candidate }>;
  resident: Map<string, ReadonlySet<number>>;
}
export interface PreparedReceivedReclamation {
  capture: ReceivedReclamationCapture;
  appliedRevision: number;
  blocks: Map<string, ReceivedValueBlock>;
  sizes: Map<string, number>;
  unowned: Set<string>;
  examined: Set<string>;
  cold: Map<string, Set<number>>;
  /** Later accepted source changes invalidate only this finite batch. */
  changed: Set<string>;
  release(): void;
}

/** Keep only candidate metadata and references across the SQL await, never a world root. */
export function captureReceivedReclamation(
  world: WorldState,
  selection?: ReadonlySet<string>,
): ReceivedReclamationCapture | undefined {
  const retirement = world.receivedValues?.retirement;
  if (!retirement) return;
  const ids = Object.keys(retirement.pending).filter((id) => !selection || selection.has(id));
  if (!ids.length) return;
  const start = retirement.cursor ? ids.indexOf(retirement.cursor) + 1 : 0;
  const candidates: ReceivedReclamationCapture['candidates'] = [];
  for (let offset = 0; offset < ids.length && candidates.length < maximumBlocks; offset++) {
    const id = ids[(start + offset) % ids.length]!;
    const candidate = retirement.pending[id]!;
    candidates.push({ id, candidate });
  }
  if (!candidates.length) return;
  const all = referencedReceivedValues(world, { captures: false });
  const resident = new Map(candidates.map(({ id }) => [id, all.get(id) ?? new Set<number>()]));
  return { worldId: world.id, candidates, resident };
}

const columns = Object.keys(RECORD_NODES.get('mind_temporal_segments')!.columns!);
const valueRefsColumn = columns.indexOf('value_refs');
const sourceRefsColumn = columns.indexOf('source_refs');

/** The accepted suffix replaces affected SQL pages, rather than accumulating old
 * owners from each intermediate revision. Canonical tables may be applying while read. */
function pendingOwnership(pending: readonly JournalTransition[]) {
  const segments = new Map<string, { parent: string; refs: Record<string, number[]> }>();
  const replaced = new Set<string>();
  const chunks = new Set<string>();
  const actors = new Set<string>();
  let allDeleted = false;
  for (const transition of pending) {
    for (const [table, ids] of transition.changes.deletes) {
      if (table === 'mind_temporal_segments')
        for (const id of ids) {
          replaced.add(id);
          segments.delete(id);
        }
      if (table === 'mind_temporal_chunks')
        for (const id of ids) {
          chunks.add(id);
          for (const [key, value] of segments) if (value.parent === id) segments.delete(key);
        }
      if (table === 'mind_temporal_actors')
        for (const id of ids) {
          const actor = (JSON.parse(id) as string[]).at(-1)!;
          actors.add(actor);
          for (const [key, value] of segments)
            if ((JSON.parse(value.parent) as string[])[4] === actor) segments.delete(key);
        }
      if (
        ids.length &&
        ['mind_temporal_state', 'experience_state', 'world_settings', 'data_world'].includes(table)
      ) {
        allDeleted = true;
        segments.clear();
      }
    }
    for (const row of transition.changes.writes.get('mind_temporal_segments') ?? []) {
      replaced.add(row.id);
      segments.set(row.id, {
        parent: row.parent,
        refs: row.extra[valueRefsColumn] as Record<string, number[]>,
      });
    }
  }
  return { segments, replaced, chunks, actors, allDeleted };
}

export function invalidateReceivedReclamation(
  ticket: Pick<PreparedReceivedReclamation, 'capture' | 'changed'>,
  worldId: string,
  changes: RecordChanges,
  restored: boolean,
): void {
  if (worldId !== ticket.capture.worldId || restored) {
    for (const { id } of ticket.capture.candidates) ticket.changed.add(id);
    return;
  }
  const ids = new Set(ticket.capture.candidates.map(({ id }) => id));
  // A deleted page may be cold and its source index is intentionally not fetched
  // on the command lane. Retry this bounded batch instead of querying its old body.
  if (
    [...changes.deletes].some(
      ([table, values]) =>
        values.length &&
        [
          'mind_temporal_segments',
          'mind_temporal_chunks',
          'mind_temporal_actors',
          'mind_temporal_state',
          'experience_state',
          'world_settings',
          'data_world',
        ].includes(table),
    )
  )
    for (const id of ids) ticket.changed.add(id);
  for (const row of changes.writes.get('mind_temporal_segments') ?? [])
    for (const id of row.extra[sourceRefsColumn] as string[])
      if (ids.has(id)) ticket.changed.add(id);
  for (const row of changes.writes.get('mind_perception_values') ?? []) {
    const id = (JSON.parse(row.id) as string[]).at(-1)!;
    if (ids.has(id)) ticket.changed.add(id);
  }
  for (const key of changes.deletes.get('mind_perception_values') ?? []) {
    const id = (JSON.parse(key) as string[]).at(-1)!;
    if (ids.has(id)) ticket.changed.add(id);
  }
}

/** Run in a bounded raw read snapshot. The supplied pending suffix closes its
 * applied-prefix gap; a ticket observes all later accepted changes. */
export async function prepareReceivedReclamation(
  db: SqlDatabase,
  capture: ReceivedReclamationCapture,
  pending: readonly JournalTransition[],
): Promise<Omit<PreparedReceivedReclamation, 'changed' | 'release'>> {
  const head = await db
    .prepare('SELECT world_id,applied_revision FROM world_head WHERE id=1')
    .get();
  if (head?.['world_id'] !== capture.worldId) throw new Error('Received cleanup world changed.');
  const appliedRevision = Number(head['applied_revision']);
  const blocks = new Map<string, ReceivedValueBlock>();
  const pendingValues = new Set(
    pending
      .flatMap((transition) => [
        ...(transition.changes.writes.get('mind_perception_values') ?? []).map((row) => row.id),
        ...(transition.changes.deletes.get('mind_perception_values') ?? []),
      ])
      .map((id) => (JSON.parse(id) as string[]).at(-1)!),
  );
  const candidates = capture.candidates.filter(
    ({ id, candidate }) => candidate.stage === 'candidate' && !pendingValues.has(id),
  );
  const ids = candidates.map(({ id }) => id);
  const overlay = pendingOwnership(pending);
  const cold = new Map<string, Set<number>>();
  for (const { refs } of overlay.segments.values())
    for (const id of ids) {
      const ordinals = refs[id];
      if (!ordinals) continue;
      const kept = cold.get(id) ?? new Set<number>();
      for (const ordinal of ordinals) kept.add(ordinal);
      cold.set(id, kept);
    }
  const sizes = new Map<string, number>();
  const unowned = new Set<string>();
  let bytes = 0;
  const selected: string[] = [];
  if (ids.length) {
    const headers = await db
      .prepare(
        `SELECT p.source_id,${evidenceEncodedBytesSql('p')} AS encoded_bytes
         FROM mind_perception_values p WHERE p.world_id=? AND p.source_id=ANY(?::text[])`,
      )
      .all(capture.worldId, ids);
    // Most expired blocks have no owner. Prove that directly without reading a
    // payload or enumerating all witnesses sharing some other candidate block.
    const owned = new Set(
      (
        await db
          .prepare(
            `
      SELECT c.block FROM unnest(?::text[],?::smallint[]) AS c(block,bucket)
      WHERE EXISTS (SELECT 1 FROM mind_temporal_segments s
        WHERE NOT ?::boolean AND s.world_id=? AND s.lookup_buckets @> ARRAY[c.bucket]::smallint[]
          AND s.source_refs @> ARRAY[c.block]::text[]
          AND s.id<>ALL(?::text[]) AND s.parent_id<>ALL(?::text[]) AND s.actor_id<>ALL(?::text[]))
    `,
          )
          .all(
            ids,
            ids.map((id) => receiptLookupBuckets('sourceRefs', [id])[0]!),
            overlay.allDeleted,
            capture.worldId,
            [...overlay.replaced],
            [...overlay.chunks],
            [...overlay.actors],
          )
      ).map((row) => String(row['block'])),
    );
    for (const row of headers) {
      const id = String(row['source_id']);
      sizes.set(id, Number(row['encoded_bytes']));
      if (!owned.has(id) && !cold.get(id)?.size && !capture.resident.get(id)?.size) {
        unowned.add(id);
        continue;
      }
      const size = Number(row['encoded_bytes']);
      if (bytes + size > maximumBytes) continue;
      bytes += size;
      selected.push(id);
    }
    if (selected.length)
      for (const row of await db
        .prepare(
          'SELECT payload,segments FROM mind_perception_values_read WHERE world_id=? AND source_id=ANY(?::text[])',
        )
        .all(capture.worldId, selected)) {
        const block = snapshotEvidenceOwner(
          restoreEvidenceLayout(JSON.parse(String(row['payload'])), 'values', row['segments']),
          'values',
        ) as unknown as ReceivedValueBlock;
        blocks.set(block.id, block);
      }
    // A vanished canonical block with no pending value write was already removed.
    // Its candidate remains generation-fenced through admission like every other.
    for (const id of ids)
      if (!sizes.has(id)) {
        if (owned.has(id) || cold.get(id)?.size)
          throw new Error('A retained received-value source is unavailable.');
        // Native progress can nominate a transient block before its first save.
        // Its current owner is real, but absence from the durable snapshot proves
        // neither corruption nor retirement. A later accepted write fences this
        // ticket; otherwise the next bounded pass observes its save or release.
        if (capture.resident.get(id)?.size) continue;
        unowned.add(id);
      }
  }
  const examined = new Set<string>();
  const wantedBlocks: string[] = [],
    wantedOrdinals: number[] = [],
    buckets: number[] = [];
  for (const { id } of candidates) {
    if (unowned.has(id)) continue;
    const block = blocks.get(id);
    if (!block) continue;
    const unknown = block.values.flatMap((value, ordinal) =>
      value && !capture.resident.get(id)?.has(ordinal) && !cold.get(id)?.has(ordinal)
        ? [ordinal]
        : [],
    );
    if (wantedOrdinals.length + unknown.length > maximumOrdinals) continue;
    const bucket = receiptLookupBuckets('sourceRefs', [id])[0]!;
    for (const ordinal of unknown) {
      wantedBlocks.push(id);
      wantedOrdinals.push(ordinal);
      buckets.push(bucket);
    }
    examined.add(id);
    // An empty set is also a complete absence proof for this examined block.
    if (!cold.has(id)) cold.set(id, new Set());
  }
  if (wantedOrdinals.length)
    for (const row of await db
      .prepare(
        `
      SELECT c.block,c.ordinal FROM unnest(?::text[],?::bigint[],?::smallint[]) AS c(block,ordinal,bucket)
      WHERE EXISTS (SELECT 1 FROM mind_temporal_segments s
        WHERE NOT ?::boolean AND s.world_id=? AND s.lookup_buckets @> ARRAY[c.bucket]::smallint[]
          AND s.source_refs @> ARRAY[c.block]::text[]
          AND (s.value_refs -> c.block) @> to_jsonb(ARRAY[c.ordinal])
          AND s.id<>ALL(?::text[]) AND s.parent_id<>ALL(?::text[]) AND s.actor_id<>ALL(?::text[]))
    `,
      )
      .all(
        wantedBlocks,
        wantedOrdinals,
        buckets,
        overlay.allDeleted,
        capture.worldId,
        [...overlay.replaced],
        [...overlay.chunks],
        [...overlay.actors],
      ))
      cold.get(String(row['block']))!.add(Number(row['ordinal']));
  return { capture, appliedRevision, blocks, sizes, unowned, examined, cold };
}

/** Re-enter the latest semantic owner, never the world captured before SQL. */
export function applyReceivedReclamation(
  state: SavedWorld,
  prepared: PreparedReceivedReclamation,
  revision: number,
  journalBytes: number,
  debtLimit: number,
): PreparedMemoryRetention {
  const rows = new Map<string, string[]>();
  const positions = new Map<string, Map<string, number>>();
  const previous = new Map<string, Map<string, unknown>>();
  if (state.world.id !== prepared.capture.worldId || !state.world.receivedValues?.retirement)
    return { state, rows };
  const current = referencedReceivedValues(state.world, { captures: false });
  const changes = new Map<string, ReceivedValueBlock | undefined>();
  const completed = new Set<string>();
  const debts = new Map<string, number>();
  for (const { id, candidate } of prepared.capture.candidates) {
    const latest = state.world.receivedValues?.retirement?.pending[id];
    if (!latest || latest.generation !== candidate.generation || prepared.changed.has(id)) continue;
    if (candidate.stage === 'applying') {
      if (candidate.applicationRevision! <= prepared.appliedRevision) completed.add(id);
      continue;
    }
    if (prepared.unowned.has(id) && !current.get(id)?.size) {
      if (prepared.sizes.has(id)) {
        changes.set(id, undefined);
        debts.set(id, prepared.sizes.get(id)!);
        rows.set('mind_perception_values', [
          ...(rows.get('mind_perception_values') ?? []),
          recordId(id),
        ]);
      } else {
        completed.add(id);
        // A transient source can lose its final owner before its first save.
        // Drop the resident bytes too; there is no durable allocation to await.
        if (state.world.receivedValues?.sources[id]) changes.set(id, undefined);
      }
      continue;
    }
    const cold = prepared.cold.get(id);
    if (!cold || !prepared.examined.has(id)) continue; // Incomplete absence proves nothing.
    const stored = prepared.blocks.get(id);
    const block = state.world.receivedValues?.sources[id] ?? stored;
    if (!block) {
      completed.add(id);
      continue;
    }
    const keep = new Set([
      ...cold,
      ...(prepared.capture.resident.get(id) ?? []),
      ...(current.get(id) ?? []),
    ]);
    const next = pruneReceivedValueBlock(block, keep);
    if (next === block) {
      completed.add(id);
      continue;
    }
    changes.set(id, next);
    debts.set(id, prepared.sizes.get(id) ?? block.bytes);
    if (stored) {
      const key = recordId(id);
      const held = positions.get('mind_perception_values') ?? new Map();
      held.set(key, 0);
      positions.set('mind_perception_values', held);
      const values = previous.get('mind_perception_values') ?? new Map();
      values.set(key, stored);
      previous.set('mind_perception_values', values);
      if (!next)
        rows.set('mind_perception_values', [...(rows.get('mind_perception_values') ?? []), key]);
    }
  }
  const world = updateWorld(
    state.world,
    (draft) => {
      const owner = draft.receivedValues!;
      const retirement = owner.retirement!;
      for (const { id, candidate } of prepared.capture.candidates) {
        const latest = retirement.pending[id];
        const size = prepared.sizes.get(id);
        if (
          latest?.generation === candidate.generation &&
          latest.stage === 'candidate' &&
          !prepared.changed.has(id) &&
          size !== undefined &&
          (latest.bytes !== size || latest.unknown)
        ) {
          retirement.bytes += size - (latest.bytes ?? 0);
          latest.bytes = size;
          delete latest.unknown;
        }
      }
      for (const id of completed) {
        retirement.bytes -= retirement.pending[id]!.bytes ?? 0;
        delete retirement.pending[id];
      }
      for (const [id, block] of changes) {
        if (!completed.has(id)) {
          const candidate = retirement.pending[id]!;
          retirement.bytes += debts.get(id)! - (candidate.bytes ?? 0);
          retirement.pending[id] = {
            generation: candidate.generation,
            bytes: debts.get(id)!,
            stage: 'applying',
            applicationRevision: revision,
          };
        }
        if (block) owner.sources[id] = block;
        else delete owner.sources[id];
      }
      const last = prepared.capture.candidates.at(-1)?.id;
      if (last) retirement.cursor = last;
      if (owner.activeSource && changes.has(owner.activeSource) && !changes.get(owner.activeSource))
        delete owner.activeSource;
      if (owner.activeSources) {
        const retained = owner.activeSources.filter((id) => !!owner.sources[id]);
        if (retained.length !== owner.activeSources.length) {
          if (retained.length) owner.activeSources = retained;
          else {
            delete owner.activeSources;
            delete owner.activeAt;
          }
        }
      }
      for (const actor of Object.values(draft.experience?.temporal?.actors ?? {}))
        for (const [key, reference] of Object.entries(actor.captures))
          if (
            changes.has(reference.blockId) &&
            !changes.get(reference.blockId)?.values[reference.valueOrdinal]
          ) {
            delete actor.captures[key];
            actor.capturesInvalidated = true;
          }
      updateReceivedRetirementPressure(draft, journalBytes, debtLimit);
      if (state.world.nativeInterval) draft.nativeInterval = { ...state.world.nativeInterval };
    },
    { retainNativeValues: true },
  );
  if (Object.isFrozen(state.world)) freezeWorld(world, { completedTransition: true });
  // Existing-row placement is a reclamation proof even when only a suffix changes.
  if (positions.size && !rows.has('mind_perception_values')) rows.set('mind_perception_values', []);
  return { state: world === state.world ? state : { ...state, world }, rows, positions, previous };
}
