import { setImmediate } from 'node:timers/promises';
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
import { restoreEvidenceLayout, snapshotEvidenceOwner } from './evidence-segments.js';
import type { RecordChanges } from './world-records.js';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { PreparedMemoryRetention } from './temporal-storage.js';

const maximumBytes = 4 * 1024 * 1024;
const maximumOrdinals = 8192;
const maximumBlocks = 32;
const recordId = (id: string) => JSON.stringify(['world', 'receivedValues', 'sources', id]);
type Candidate = ReceivedValueRetirement['pending'][string];

/** Derived allocation headers, not another source or ownership store. Accepted
 * suffixes reserve their charge until actual table application acknowledges them.
 * No world, payload or old immutable source is retained by this index. */
export class ReceivedValueAllocationCharges {
  private worldId?: string;
  private readonly physical = new Map<string, number>();
  private readonly pending = new Map<number, Map<string, number | undefined>>();
  private readonly bySource = new Map<string, Map<number, number | undefined>>();
  initialize(worldId: string, headers: Iterable<readonly [string, number]>): void {
    this.clear();
    for (const [id, bytes] of headers) {
      if (!Number.isSafeInteger(bytes) || bytes < 0 || this.physical.has(id))
        throw new Error('Invalid received allocation header.');
      this.physical.set(id, bytes);
    }
    this.worldId = worldId;
  }
  clear(): void {
    this.worldId = undefined;
    this.physical.clear();
    this.pending.clear();
    this.bySource.clear();
  }
  private assertWorld(worldId: string): void {
    if (this.worldId !== worldId)
      throw new Error('Received allocation headers are not complete for this world.');
  }
  private changes(changes: RecordChanges): Map<string, number | undefined> {
    const result = new Map<string, number | undefined>();
    for (const id of changes.deletes.get('mind_perception_values') ?? [])
      result.set((JSON.parse(id) as string[]).at(-1)!, undefined);
    for (const row of changes.writes.get('mind_perception_values') ?? []) {
      const storage = JSON.parse(row.payload).storage as
        | { segmentBytes: number; metadataBytes: number }
        | undefined;
      if (
        !storage ||
        !Number.isSafeInteger(storage.segmentBytes) ||
        storage.segmentBytes < 0 ||
        !Number.isSafeInteger(storage.metadataBytes) ||
        storage.metadataBytes < 0
      )
        throw new Error('Invalid received allocation layout.');
      const bytes = Buffer.byteLength(row.payload) + storage.segmentBytes + storage.metadataBytes;
      if (!Number.isSafeInteger(bytes)) throw new Error('Received allocation exceeds accounting.');
      result.set((JSON.parse(row.id) as string[]).at(-1)!, bytes);
    }
    return result;
  }
  accepted(worldId: string, revision: number, changes: RecordChanges): void {
    this.assertWorld(worldId);
    const entries = this.changes(changes);
    if (!entries.size) return;
    if (this.pending.has(revision)) throw new Error('Received allocation revision repeated.');
    this.pending.set(revision, entries);
    for (const [id, bytes] of entries) {
      let suffix = this.bySource.get(id);
      if (!suffix) this.bySource.set(id, (suffix = new Map()));
      suffix.set(revision, bytes);
    }
  }
  applied(worldId: string, revision: number, changes: RecordChanges): void {
    this.assertWorld(worldId);
    for (const [id, bytes] of this.changes(changes)) {
      if (bytes === undefined) this.physical.delete(id);
      else this.physical.set(id, bytes);
    }
    for (const [at, entries] of this.pending) {
      if (at > revision) continue;
      for (const id of entries.keys()) {
        const suffix = this.bySource.get(id)!;
        suffix.delete(at);
        if (!suffix.size) this.bySource.delete(id);
      }
      this.pending.delete(at);
    }
  }
  bytes(worldId: string, id: string): number {
    this.assertWorld(worldId);
    let bytes = this.physical.get(id) ?? 0;
    for (const pending of this.bySource.get(id)?.values() ?? [])
      if (pending !== undefined) bytes = Math.max(bytes, pending);
    return bytes;
  }
  physicalBytes(worldId: string, id: string): number {
    this.assertWorld(worldId);
    return this.physical.get(id) ?? 0;
  }
}

/** Small charged garbage can wait for the next coalesced batch. Real byte
 * pressure wakes maintenance promptly without treating nomination as a pause. */
export function receivedReclamationNeedsPromptWork(
  world: WorldState,
  journalBytes: number,
  maximumDebtBytes: number,
): boolean {
  const retirement = world.receivedValues?.retirement;
  return !!retirement && retirement.bytes + journalBytes >= maximumDebtBytes / 8;
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

export function invalidateReceivedReclamation(
  ticket: Pick<PreparedReceivedReclamation, 'capture' | 'changed'>,
  worldId: string,
  changes: RecordChanges,
  restored: boolean,
  affected: ReadonlySet<string>,
): void {
  if (worldId !== ticket.capture.worldId || restored) {
    for (const { id } of ticket.capture.candidates) ticket.changed.add(id);
    return;
  }
  const ids = new Set(ticket.capture.candidates.map(({ id }) => id));
  // Complete metadata resolves deleted page/chunk ownership before mutation.
  // Ordinary deletion retries only its own sources; destructive root replacement
  // retains the broad barrier. Current references use the same exact feed.
  if (
    [...changes.deletes].some(
      ([table, values]) =>
        values.length &&
        [
          'mind_temporal_actors',
          'mind_temporal_state',
          'experience_state',
          'world_settings',
          'data_world',
        ].includes(table),
    )
  )
    for (const id of ids) ticket.changed.add(id);
  for (const id of affected) if (ids.has(id)) ticket.changed.add(id);
}

export interface ReceivedReclamationOwnership {
  appliedRevision: number;
  sources: ReadonlyMap<string, { bytes: number; ordinals: ReadonlySet<number>; pending: boolean }>;
}

/** Ownership is already complete before I/O. Whole-block absence needs no reader;
 * mixed cold blocks share one bounded snapshot, released before reconstruction.
 * Source rows newer/larger than the captured admission cannot enlarge its read.
 * Later accepted changes invalidate the existing ticket.
 * docs/projects/attention-and-scenes-runtime-design.md#122-complete-compact-retention-and-ownership-metadata
 */
export async function prepareReceivedReclamation(
  db: SqlDatabase,
  capture: ReceivedReclamationCapture,
  ownership: ReceivedReclamationOwnership,
  changed: ReadonlySet<string>,
): Promise<Omit<PreparedReceivedReclamation, 'changed' | 'release'>> {
  const blocks = new Map<string, ReceivedValueBlock>(),
    sizes = new Map<string, number>(),
    unowned = new Set<string>(),
    examined = new Set<string>(),
    cold = new Map<string, Set<number>>();
  const selected: Array<{ source_id: string; bytes: number }> = [];
  let bytes = 0,
    ordinals = 0;
  for (const { id, candidate } of capture.candidates) {
    const owned = ownership.sources.get(id);
    if (!owned) throw new Error('Complete received ownership is unavailable.');
    // Accepted deletion cannot erase the physical prefix's last ownership. Wait
    // for its real application acknowledgement, rather than finish its candidate.
    if (candidate.stage !== 'candidate' || owned.pending) continue;
    if (owned.bytes) sizes.set(id, owned.bytes);
    const retained = new Set(owned.ordinals);
    cold.set(id, retained);
    if (!retained.size && !capture.resident.get(id)?.size) {
      unowned.add(id);
      continue;
    }
    if (!owned.bytes) continue; // Native transient source has not been saved yet.
    if (bytes + owned.bytes > maximumBytes || ordinals + retained.size > maximumOrdinals) continue;
    bytes += owned.bytes;
    ordinals += retained.size;
    selected.push({ source_id: id, bytes: owned.bytes });
  }
  if (selected.length) {
    const read = () =>
      db
        .prepare(
          `SELECT b.source_id,p.id AS present,h.world_id AS applied_world,h.applied_revision,
            CASE WHEN p.world_id=h.world_id AND p.revision<=? AND p.encoded_bytes<=b.bytes THEN p.payload END AS payload,
            CASE WHEN p.world_id=h.world_id AND p.revision<=? AND p.encoded_bytes<=b.bytes THEN p.segments END AS segments
          FROM jsonb_to_recordset(?::jsonb) b(source_id TEXT,bytes BIGINT)
          CROSS JOIN world_head h
          LEFT JOIN mind_perception_values_read p ON p.world_id=? AND p.source_id=b.source_id
          WHERE h.id=1`,
        )
        .all(
          ownership.appliedRevision,
          ownership.appliedRevision,
          JSON.stringify(selected),
          capture.worldId,
        );
    const rows = db.readTransaction ? await db.readTransaction(read) : await db.transaction(read);
    const byId = new Map(rows.map((row) => [String(row['source_id']), row]));
    for (let index = 0; index < selected.length; index++) {
      const id = selected[index]!.source_id;
      if (changed.has(id)) continue;
      const row = byId.get(id);
      if (!row) throw new Error('A retained received-value source is unavailable.');
      if (row['applied_world'] !== capture.worldId) continue;
      if (row['present'] === null) {
        // SQL COMMIT can precede its application notification. Absence at a newer
        // cut is incomplete; absence at the captured cut is an integrity failure.
        if (Number(row['applied_revision']) > ownership.appliedRevision) continue;
        throw new Error('A retained received-value source is unavailable.');
      }
      // A source changed after admission. Its commit may still be publishing;
      // leave this candidate incomplete instead of reading outside the budget.
      if (row['payload'] === null) continue;
      const block = snapshotEvidenceOwner(
        restoreEvidenceLayout(JSON.parse(String(row['payload'])), 'values', row['segments']),
        'values',
      ) as unknown as ReceivedValueBlock;
      if (block.id !== id) throw new Error('Received cleanup source changed.');
      blocks.set(id, block);
      examined.add(id);
      // Preserve cooperation between bounded decodes without holding the reader.
      if (index + 1 < selected.length) await setImmediate();
    }
  }
  return {
    capture,
    appliedRevision: ownership.appliedRevision,
    blocks,
    sizes,
    unowned,
    examined,
    cold,
  };
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
  const recheck = new Set<string>();
  const finish = (id: string, latest: Candidate, checked: number) => {
    if (latest.releaseRevision === checked) completed.add(id);
    else recheck.add(id);
  };
  const debts = new Map<string, number>();
  const checkedRevisions = new Map(
    prepared.capture.candidates.map(({ id, candidate }) => [id, candidate.releaseRevision]),
  );
  for (const { id, candidate } of prepared.capture.candidates) {
    const latest = state.world.receivedValues?.retirement?.pending[id];
    if (!latest || latest.generation !== candidate.generation || prepared.changed.has(id)) continue;
    if (candidate.stage === 'applying') {
      if (candidate.applicationRevision! <= prepared.appliedRevision)
        finish(id, latest, candidate.checkedRevision!);
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
        finish(id, latest, candidate.releaseRevision);
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
      finish(id, latest, candidate.releaseRevision);
      continue;
    }
    const keep = new Set([
      ...cold,
      ...(prepared.capture.resident.get(id) ?? []),
      ...(current.get(id) ?? []),
    ]);
    const next = pruneReceivedValueBlock(block, keep);
    if (next === block) {
      finish(id, latest, candidate.releaseRevision);
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
          latest.bytes !== size
        ) {
          retirement.bytes += size - (latest.bytes ?? 0);
          latest.bytes = size;
        }
      }
      for (const id of recheck) {
        const candidate = retirement.pending[id]!;
        candidate.stage = 'candidate';
        delete candidate.applicationRevision;
        delete candidate.checkedRevision;
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
            releaseRevision: candidate.releaseRevision,
            checkedRevision: checkedRevisions.get(id)!,
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
