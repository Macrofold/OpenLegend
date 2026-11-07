import { sqlRowBatches } from './sql-rows.js';
import {
  accountClass,
  ensureExperienceAccounting,
  updateWorld,
  appendedRecordCount,
  type WorldState,
  type ExperienceEntry,
  type PersonalSourceRef,
} from '@open-legend/domain';
import {
  accountRetentionMetadata,
  type AccountRetentionMetadata,
} from './retention-record-metadata.js';
import { personalAccountRevision } from './personal-accounts.js';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { RecordChanges } from './world-records.js';
import { type RetentionMetadataView } from './retention-metadata.js';

type Category = 'optional' | 'required' | 'speech';
export interface VersionKey {
  actorId: string;
  kind: string;
  id: string;
  revision: string;
}
export interface RetainedSourceVersion extends VersionKey {
  payload?: string;
  category: Category;
  bytes: number;
}
export interface SourceVersionState {
  category: Category;
  bytes: number;
}
export interface SourceVersionChange extends VersionKey {
  expectedPrior: SourceVersionState | null;
  desired: (SourceVersionState & { payload?: string }) | null;
}
export interface SourceVersionPlan {
  changes: SourceVersionChange[];
}
export interface SourceVersionPreparation {
  /** Exact current headers immediately before these mutations, including pending rows. */
  before: RetentionMetadataView;
  actorIds?: readonly string[];
  /** Selected original bodies already hydrated by account retirement. */
  previous?: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
}
export const sourceVersionKey = (value: VersionKey) =>
  JSON.stringify([value.actorId, value.kind, value.id, value.revision]);
/** Pending cuts compose old expected state through to latest desired state. */
export function mergeSourceVersionChanges(
  before: SourceVersionChange,
  after: SourceVersionChange,
): SourceVersionChange {
  if (
    sourceVersionKey(before) !== sourceVersionKey(after) ||
    (before.desired?.category ?? null) !== (after.expectedPrior?.category ?? null) ||
    (before.desired?.bytes ?? null) !== (after.expectedPrior?.bytes ?? null)
  )
    throw new Error('Exact source-version plan does not continue its accepted predecessor.');
  return {
    ...after,
    expectedPrior: before.expectedPrior,
    desired: after.desired && {
      ...after.desired,
      ...(after.desired.payload === undefined && before.desired?.payload !== undefined
        ? { payload: before.desired.payload }
        : {}),
    },
  };
}
/** Restore owns complete canonical accounts. Original saved bytes are validated
 * first; this projection removes archive bodies that current privacy/owners no longer retain. */
export function restoredSourceVersions(
  state: SavedWorld,
  rows: readonly Record<string, unknown>[],
): { state: SavedWorld; rows: Record<string, unknown>[] } {
  const needed = new Map<string, Category>();
  const include = (actorId: string, entry: ExperienceEntry) => {
    if (entry.source === 'memory' && entry.value.kind === 'impression') return;
    const refs =
      entry.source === 'summary'
        ? [...entry.value.sources, ...entry.value.manifest.coverage]
        : entry.source === 'memory'
          ? (entry.value.manifest?.coverage ?? [])
          : [];
    for (const source of refs) {
      if (state.world.experience?.forgotten[actorId]?.includes(source.id)) continue;
      const id = key({ actorId, kind: source.kind, id: source.id, revision: source.revision }),
        category = accountClass(entry),
        old = needed.get(id);
      if (old === undefined || priority(category) > priority(old)) needed.set(id, category);
    }
  };
  for (const [actorId, values] of Object.entries(state.world.experience?.summaries ?? {}))
    for (const value of values) include(actorId, { source: 'summary', value });
  for (const [actorId, values] of Object.entries(state.world.memories))
    for (const value of values) include(actorId, { source: 'memory', value });
  const totals = new Map<string, ReturnType<typeof zero>>();
  const retained = rows.flatMap((row) => {
    if (row['source_kind'] === 'perspective')
      return state.world.experience?.forgotten[String(row['actor_id'])]?.includes(
        String(row['source_id']),
      )
        ? []
        : [{ ...row }];
    const actorId = String(row['actor_id']),
      category = needed.get(
        key({
          actorId,
          kind: String(row['source_kind']),
          id: String(row['source_id']),
          revision: String(row['revision']),
        }),
      );
    if (!category) return [];
    const bytes = Buffer.byteLength(String(row['payload']));
    const value = totals.get(actorId) ?? zero();
    value[category].bytes += bytes;
    value[category].count++;
    totals.set(actorId, value);
    return [{ ...row, retention_class: category, logical_bytes: bytes }];
  });
  const world = updateWorld(
    state.world,
    (draft) => {
      for (const [actorId, actor] of Object.entries(draft.experience?.temporal?.actors ?? {})) {
        const old = actor.accounts?.archives ?? zero(),
          next = totals.get(actorId) ?? zero();
        if (JSON.stringify(old) === JSON.stringify(next)) continue;
        ensureExperienceAccounting(draft, actorId);
        for (const category of ['optional', 'required', 'speech'] as const) {
          actor.accounts![category].bytes += next[category].bytes - old[category].bytes;
          actor.accounts![category].count += next[category].count - old[category].count;
        }
        actor.accounts!.archives = next;
      }
    },
    { retainNativeValues: true },
  );
  return { state: world === state.world ? state : { ...state, world }, rows: retained };
}
const tables = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;
const key = (value: VersionKey) =>
  JSON.stringify([value.actorId, value.kind, value.id, value.revision]);
const zero = () => ({
  optional: { bytes: 0, count: 0 },
  required: { bytes: 0, count: 0 },
  speech: { bytes: 0, count: 0 },
});
const priority = (category: Category) =>
  category === 'required' ? 2 : category === 'speech' ? 1 : 0;
export function sourceVersionPreparationNeeded(
  before: Pick<WorldState, 'memories' | 'experience'> | undefined,
  after: WorldState,
): boolean {
  if (!before) return false;
  if (before.experience?.privacyRevisions !== after.experience?.privacyRevisions) return true;
  if (before.experience?.summaries !== after.experience?.summaries) return true;
  for (const [old, next] of [
    [before.memories, after.memories],
    [before.experience?.awareness, after.experience?.awareness],
  ] as const) {
    if (old === next) continue;
    for (const actorId of new Set([...Object.keys(old ?? {}), ...Object.keys(next ?? {})])) {
      const a = old?.[actorId] ?? [],
        b = next?.[actorId] ?? [];
      if (a === b) continue;
      const appended = appendedRecordCount(a, b);
      if (appended === undefined && a.length) return true;
      if (
        b
          .slice(appended === undefined ? 0 : b.length - appended)
          .some((value) => 'manifest' in value && !!value.manifest)
      )
        return true;
    }
  }
  return false;
}
export async function prepareSourceVersions(
  db: SqlDatabase,
  state: SavedWorld,
  changes: RecordChanges,
  preparation: SourceVersionPreparation,
): Promise<{ state: SavedWorld; plan: SourceVersionPlan }> {
  const selected = preparation.actorIds && new Set(preparation.actorIds);
  type Changed = {
    actorId: string;
    kind: keyof typeof tables;
    recordId: string;
    prior: ReturnType<RetentionMetadataView['prior']>;
    next?: ExperienceEntry;
  };
  const changed: Changed[] = [];
  const affected = new Map<string, VersionKey>();
  const include = (actorId: string, source: PersonalSourceRef) => {
    if (!Object.hasOwn(tables, source.kind)) return;
    const value = { actorId, kind: source.kind, id: source.id, revision: source.revision };
    affected.set(key(value), value);
  };
  for (const [kind, table] of Object.entries(tables) as Array<
    [keyof typeof tables, (typeof tables)[keyof typeof tables]]
  >) {
    const writes = new Map((changes.writes.get(table) ?? []).map((row) => [row.id, row]));
    for (const recordId of new Set([...(changes.deletes.get(table) ?? []), ...writes.keys()])) {
      const path = JSON.parse(recordId) as string[],
        actorId = path[kind === 'memory' ? 2 : 3]!;
      if (selected && !selected.has(actorId)) continue;
      const row = writes.get(recordId);
      let prior = preparation.before.get(table, recordId);
      if (!row?.create && !prior) {
        // A selected cold predecessor can be absent from the finite catalogue.
        // Resolve it through the same captured live-before cut, never today's head.
        const old = await db
          .prepare(
            `SELECT id,parent_id,position,source_id,account_revision,retention_metadata,
          retention_class,logical_bytes,octet_length(payload) AS encoded_bytes FROM ${table}
          WHERE world_id=? AND actor_id=? AND id=?`,
          )
          .get(state.world.id, actorId, recordId);
        if (old)
          prior = {
            table,
            id: recordId,
            parent: String(old['parent_id']),
            position: Number(old['position']),
            actorId,
            columns: old,
            encodedBytes: Number(old['encoded_bytes']),
          };
        else if (row)
          row.create = true; // Exact captured absence proves this new account, including nonempty manifests.
        else if (!changes.expired?.get(table)?.includes(recordId))
          throw new Error('Changed account requires its exact previous metadata.');
      }
      const next = row
        ? ({ source: kind, value: JSON.parse(row.payload) } as ExperienceEntry)
        : undefined;
      changed.push({ actorId, kind, recordId, prior, ...(next ? { next } : {}) });
      if (prior) {
        include(actorId, {
          kind,
          id: String(prior.columns['source_id']),
          revision: String(prior.columns['account_revision']),
        });
        for (const source of (prior.columns['retention_metadata'] as AccountRetentionMetadata)
          .versions)
          include(actorId, source);
      }
      if (next)
        for (const source of accountRetentionMetadata(next).versions) include(actorId, source);
    }
  }
  // Learning aliases acquire their exact revision from this captured current cut.
  // Existing flattened reverse links already contain exact revisions for cold owners.
  for (const item of changed) {
    const inputs = [
      ...(item.prior
        ? (item.prior.columns['retention_metadata'] as AccountRetentionMetadata).learning
        : []),
      ...(item.next ? accountRetentionMetadata(item.next).learning : []),
    ];
    for (const source of inputs) {
      const replacement = changed.find(
        (other) =>
          other.actorId === item.actorId &&
          other.kind === source.kind &&
          (other.next
            ? other.next.source === 'awareness'
              ? other.next.value.eventId
              : other.next.value.id
            : other.prior?.columns['source_id']) === source.id,
      );
      const revision = replacement?.next
        ? personalAccountRevision(JSON.stringify(replacement.next.value))
        : replacement?.prior?.columns['account_revision'];
      if (revision) {
        include(item.actorId, { ...source, revision: String(revision) });
        continue;
      }
      const table = tables[source.kind as keyof typeof tables];
      if (!table) continue;
      const found = await db
        .prepare(
          `SELECT account_revision FROM ${table} WHERE world_id=? AND actor_id=? AND source_id=?`,
        )
        .get(state.world.id, item.actorId, source.id);
      if (!found) throw new Error('Exact learned-identity source is unavailable.');
      include(item.actorId, { ...source, revision: String(found['account_revision']) });
    }
  }
  const future = new Map<string, Category>();
  const needed = (value: VersionKey, category: Category) => {
    if (state.world.experience?.forgotten[value.actorId]?.includes(value.id)) return;
    const id = key(value),
      old = future.get(id);
    if (old === undefined || priority(category) > priority(old)) future.set(id, category);
  };
  const keys = [...affected.values()];
  const changedOwners = changed.map((item) => ({
    actor_id: item.actorId,
    kind: item.kind,
    id: item.next
      ? item.next.source === 'awareness'
        ? item.next.value.eventId
        : item.next.value.id
      : item.prior
        ? String(item.prior.columns['source_id'])
        : (JSON.parse(item.recordId) as string[]).at(-1)!,
  }));
  const currentRevisions = new Set(
    changed.flatMap((item) =>
      item.next
        ? [
            key({
              actorId: item.actorId,
              kind: item.kind,
              id: item.next.source === 'awareness' ? item.next.value.eventId : item.next.value.id,
              revision: personalAccountRevision(JSON.stringify(item.next.value)),
            }),
          ]
        : [],
    ),
  );
  const archives = new Map<string, RetainedSourceVersion>();
  for (let offset = 0; offset < keys.length; offset += 256) {
    const batch = keys.slice(offset, offset + 256).map((value) => ({
      actor_id: value.actorId,
      kind: value.kind,
      id: value.id,
      revision: value.revision,
    }));
    const accountUnion = Object.entries(tables)
      .map(
        ([kind, table]) =>
          `SELECT '${kind}' AS kind,actor_id,source_id,retention_class FROM ${table} WHERE world_id=?`,
      )
      .join(' UNION ALL ');
    const rows = await db
      .prepare(
        `WITH requested AS (
      SELECT * FROM jsonb_to_recordset(?::jsonb) q(actor_id text,kind text,id text,revision text)
    ), changed AS (SELECT * FROM jsonb_to_recordset(?::jsonb) q(actor_id text,kind text,id text)),
    accounts AS (${accountUnion})
    SELECT DISTINCT q.actor_id,q.kind,q.id,q.revision,a.retention_class
    FROM requested q JOIN mind_source_dependencies d ON d.world_id=? AND d.actor_id=q.actor_id
      AND d.source_kind=q.kind AND d.source_id=q.id AND d.source_revision=q.revision
    JOIN accounts a ON a.actor_id=d.actor_id AND a.kind=d.derived_kind AND a.source_id=d.derived_id
    WHERE a.retention_class<>'sensory' AND NOT EXISTS(SELECT 1 FROM changed c WHERE c.actor_id=d.actor_id AND c.kind=d.derived_kind AND c.id=d.derived_id)`,
      )
      .all(
        JSON.stringify(batch),
        JSON.stringify(changedOwners),
        ...Object.keys(tables).map(() => state.world.id),
        state.world.id,
      );
    for (const row of rows)
      needed(
        {
          actorId: String(row['actor_id']),
          kind: String(row['kind']),
          id: String(row['id']),
          revision: String(row['revision']),
        },
        row['retention_class'] as Category,
      );
    const old = await db
      .prepare(
        `SELECT v.actor_id,v.source_kind,v.source_id,v.revision,v.retention_class,v.logical_bytes
      FROM mind_source_versions v JOIN jsonb_to_recordset(?::jsonb) q(actor_id text,kind text,id text,revision text)
      ON v.actor_id=q.actor_id AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision WHERE v.world_id=?`,
      )
      .all(JSON.stringify(batch), state.world.id);
    for (const row of old) {
      const value = {
        actorId: String(row['actor_id']),
        kind: String(row['source_kind']),
        id: String(row['source_id']),
        revision: String(row['revision']),
        category: row['retention_class'] as Category,
        bytes: Number(row['logical_bytes']),
      };
      archives.set(key(value), value);
    }
  }
  for (const item of changed)
    if (item.next) {
      const meta = accountRetentionMetadata(item.next),
        category = accountClass(item.next);
      for (const source of meta.versions) needed({ actorId: item.actorId, ...source }, category);
      for (const source of meta.learning)
        for (const value of keys)
          if (
            value.actorId === item.actorId &&
            value.kind === source.kind &&
            value.id === source.id
          )
            needed(value, category);
    }
  const oldOwners = new Map(
    changed.flatMap((item) =>
      item.prior
        ? [
            [
              key({
                actorId: item.actorId,
                kind: item.kind,
                id: String(item.prior.columns['source_id']),
                revision: String(item.prior.columns['account_revision']),
              }),
              item,
            ] as const,
          ]
        : [],
    ),
  );
  const bodyGroups = new Map<
    string,
    { actorId: string; kind: keyof typeof tables; items: Changed[] }
  >();
  const archivedBodies = new Map<string, string>();
  for (const value of keys) {
    const id = key(value),
      owner = oldOwners.get(id);
    if (!future.has(id) || archives.has(id) || currentRevisions.has(id) || !owner) continue;
    const previous = preparation.previous?.get(tables[owner.kind])?.get(owner.recordId);
    if (previous !== undefined) {
      const payload = JSON.stringify(previous);
      if (personalAccountRevision(payload) !== value.revision)
        throw new Error('Selected exact source changed before retention.');
      archivedBodies.set(id, payload);
      continue;
    }
    const groupKey = JSON.stringify([value.actorId, owner.kind]);
    let group = bodyGroups.get(groupKey);
    if (!group)
      bodyGroups.set(groupKey, (group = { actorId: value.actorId, kind: owner.kind, items: [] }));
    group.items.push(owner);
  }
  for (const group of bodyGroups.values())
    for (let offset = 0; offset < group.items.length; ) {
      const batch: Changed[] = [];
      let bytes = 0;
      while (offset < group.items.length) {
        const item = group.items[offset]!,
          size = item.prior!.encodedBytes;
        if (size > 4 * 1024 * 1024)
          throw new Error('Exact source closure exceeds bounded preparation.');
        if (batch.length && bytes + size > 4 * 1024 * 1024) break;
        batch.push(item);
        bytes += size;
        offset++;
      }
      const wanted = new Map(batch.map((item) => [item.recordId, item]));
      for (const row of await db
        .prepare(
          `SELECT id,source_id,account_revision,payload FROM ${tables[group.kind]}
      WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])`,
        )
        .all(state.world.id, group.actorId, [...wanted.keys()])) {
        const item = wanted.get(String(row['id']));
        if (!item || item.prior!.columns['account_revision'] !== row['account_revision'])
          throw new Error('Selected exact source changed before retention.');
        archivedBodies.set(
          key({
            actorId: group.actorId,
            kind: group.kind,
            id: String(row['source_id']),
            revision: String(row['account_revision']),
          }),
          String(row['payload']),
        );
      }
      if (
        batch.some(
          (item) =>
            !archivedBodies.has(
              key({
                actorId: item.actorId,
                kind: item.kind,
                id: String(item.prior!.columns['source_id']),
                revision: String(item.prior!.columns['account_revision']),
              }),
            ),
        )
      )
        throw new Error('Selected exact source changed before retention.');
    }
  const plan: SourceVersionPlan = { changes: [] };
  for (const value of keys) {
    const id = key(value),
      old = archives.get(id),
      category = future.get(id);
    // An unchanged current source needs no second archived body.
    const isOldChanged = oldOwners.has(id) && !currentRevisions.has(id);
    if (!old && (!category || !isOldChanged)) continue;
    let desired: SourceVersionChange['desired'] = null;
    if (category) {
      if (old) desired = { category, bytes: old.bytes };
      else {
        const payload = archivedBodies.get(id);
        if (payload === undefined)
          throw new Error('Selected exact source changed before retention.');
        desired = { category, bytes: Buffer.byteLength(payload), payload };
      }
    }
    if (old && desired && old.category === desired.category && old.bytes === desired.bytes)
      continue;
    plan.changes.push({
      ...value,
      expectedPrior: old ? { category: old.category, bytes: old.bytes } : null,
      desired,
    });
  }
  const world = applySourceVersionAccounting(state.world, plan);
  return { state: world === state.world ? state : { ...state, world }, plan };
}

/** Apply each exact archive delta once on native acceptance. Saving only persists it. */
export function applySourceVersionAccounting(
  world: WorldState,
  plan: SourceVersionPlan,
): WorldState {
  if (!plan.changes.length) return world;
  return updateWorld(
    world,
    (draft) => {
      for (const change of plan.changes) {
        ensureExperienceAccounting(draft, change.actorId);
        const accounts = draft.experience!.temporal!.actors[change.actorId]!.accounts!;
        accounts.archives ??= zero();
        for (const [value, direction] of [
          [change.expectedPrior, -1],
          [change.desired, 1],
        ] as const)
          if (value) {
            for (const totals of [accounts, accounts.archives]) {
              totals[value.category].bytes += direction * value.bytes;
              totals[value.category].count += direction;
              if (totals[value.category].bytes < 0 || totals[value.category].count < 0)
                throw new Error('Exact archived support accounting underflow.');
            }
          }
        accounts.nextDue = Math.min(accounts.nextDue ?? Infinity, draft.simTime);
      }
    },
    { retainNativeValues: true },
  );
}

/** A multi-round candidate starts its next preparation from the unchanged
 * durable archive charges. This never runs on an accepted publication. */
export function resetPreparedSourceVersionAccounting(
  world: WorldState,
  plan: SourceVersionPlan,
): WorldState {
  return applySourceVersionAccounting(world, {
    changes: plan.changes.map((change) => ({
      ...change,
      expectedPrior: change.desired && {
        category: change.desired.category,
        bytes: change.desired.bytes,
      },
      desired: change.expectedPrior,
    })),
  });
}

/** Sparse archive mutations share the existing world transaction; unrelated versions survive. */
export async function applySourceVersions(
  db: SqlDatabase,
  worldId: string,
  revision: number,
  plan: SourceVersionPlan,
): Promise<void> {
  if (!plan.changes.length) return;
  const rows = plan.changes.map((change) => ({
    actor_id: change.actorId,
    kind: change.kind,
    id: change.id,
    revision: change.revision,
    old_class: change.expectedPrior?.category ?? null,
    old_bytes: change.expectedPrior?.bytes ?? null,
    category: change.desired?.category ?? null,
    bytes: change.desired?.bytes ?? null,
    payload: change.desired?.payload ?? null,
  }));
  for (const batch of sqlRowBatches(rows.map((row) => [row]))) {
    const encoded = JSON.stringify(batch.map(([row]) => row));
    const shape =
      'actor_id text,kind text,id text,revision text,old_class text,old_bytes bigint,category text,bytes bigint,payload text';
    const conflict = await db
      .prepare(
        `SELECT 1 AS conflict FROM jsonb_to_recordset(?::jsonb)q(${shape})
      LEFT JOIN mind_source_versions v ON v.world_id=? AND v.actor_id=q.actor_id AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision
      WHERE (v.retention_class,v.logical_bytes) IS DISTINCT FROM(q.old_class,q.old_bytes) LIMIT 1`,
      )
      .get(encoded, worldId);
    if (conflict) throw new Error('Exact archived support changed before saving.');
    await db
      .prepare(
        `DELETE FROM mind_source_versions v USING jsonb_to_recordset(?::jsonb)q(${shape})
      WHERE v.world_id=? AND v.actor_id=q.actor_id AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision AND q.category IS NULL`,
      )
      .run(encoded, worldId);
    await db
      .prepare(
        `UPDATE mind_source_versions v SET retention_class=q.category,logical_bytes=q.bytes FROM jsonb_to_recordset(?::jsonb)q(${shape})
      WHERE v.world_id=? AND v.actor_id=q.actor_id AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision AND q.category IS NOT NULL AND q.payload IS NULL`,
      )
      .run(encoded, worldId);
    await db
      .prepare(
        `INSERT INTO mind_source_versions(world_id,actor_id,source_kind,source_id,revision,payload,retired_revision,retention_class,logical_bytes)
      SELECT ?,q.actor_id,q.kind,q.id,q.revision,q.payload,?,q.category,q.bytes FROM jsonb_to_recordset(?::jsonb)q(${shape})
      WHERE q.category IS NOT NULL AND q.payload IS NOT NULL
      ON CONFLICT(world_id,actor_id,source_kind,source_id,revision)DO UPDATE SET retention_class=excluded.retention_class,logical_bytes=excluded.logical_bytes`,
      )
      .run(worldId, revision, encoded);
  }
}
