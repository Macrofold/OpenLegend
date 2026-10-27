import {
  accountClass,
  ensureExperienceAccounting,
  updateWorld,
  validPersonalSourceRef,
  appendedRecordCount,
  type WorldState,
  type ExperienceEntry,
  type PersonalSourceRef,
} from '@open-legend/domain';
import { personalAccountRevision } from './personal-accounts.js';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { RecordChanges } from './world-records.js';

type Category = 'optional' | 'required' | 'speech';
interface VersionKey {
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
export interface SourceVersionPlan {
  actors: string[];
  retained: RetainedSourceVersion[];
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
  const world = updateWorld(state.world, (draft) => {
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
  });
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
): Promise<{ state: SavedWorld; plan: SourceVersionPlan }> {
  const actors = new Set<string>(),
    future = new Map<string, Category>(),
    changedRecords: string[] = [];
  const needed = (actorId: string, source: PersonalSourceRef, category: Category) => {
    if (state.world.experience?.forgotten[actorId]?.includes(source.id)) return;
    const id = key({ actorId, kind: source.kind, id: source.id, revision: source.revision });
    const old = future.get(id);
    if (old === undefined || priority(category) > priority(old)) future.set(id, category);
  };
  for (const [kind, table] of Object.entries(tables)) {
    for (const id of changes.deletes.get(table) ?? []) {
      const path = JSON.parse(id) as string[];
      actors.add(path[kind === 'memory' ? 2 : 3]!);
      changedRecords.push(id);
    }
    for (const row of changes.writes.get(table) ?? []) {
      const path = JSON.parse(row.id) as string[],
        actorId = path[kind === 'memory' ? 2 : 3]!;
      const value = JSON.parse(row.payload) as ExperienceEntry['value'];
      const manifest = 'manifest' in value ? value.manifest : undefined;
      const sources = 'sources' in value ? value.sources : [];
      if (!row.create || manifest || sources?.length) actors.add(actorId);
      changedRecords.push(row.id);
      if ('kind' in value && value.kind === 'impression') continue;
      const category = accountClass({ source: kind, value } as ExperienceEntry);
      for (const source of [...(sources ?? []), ...(manifest?.coverage ?? [])])
        if (validPersonalSourceRef(source)) needed(actorId, source, category);
    }
  }
  const retained: RetainedSourceVersion[] = [];
  let world = state.world;
  for (const actorId of actors) {
    const existing = await db
      .prepare(
        "SELECT source_kind,source_id,revision,retention_class,logical_bytes FROM mind_source_versions WHERE world_id=? AND actor_id=? AND source_kind IN ('awareness','memory','summary')",
      )
      .all(world.id, actorId);
    for (const row of await db
      .prepare(
        `SELECT d.source_kind,d.source_id,d.source_revision,COALESCE(a.retention_class,m.retention_class,s.retention_class) AS retention_class FROM mind_source_dependencies d JOIN recall_sources r ON r.world_id=d.world_id AND r.actor_id=d.actor_id AND r.source_kind=d.derived_kind AND r.id=d.derived_id LEFT JOIN mind_awareness a ON r.source_kind='awareness' AND a.world_id=r.world_id AND a.id=r.record_id LEFT JOIN mind_memories m ON r.source_kind='memory' AND m.world_id=r.world_id AND m.id=r.record_id LEFT JOIN mind_summaries s ON r.source_kind='summary' AND s.world_id=r.world_id AND s.id=r.record_id
      WHERE d.world_id=? AND d.actor_id=? AND d.source_kind IN ('awareness','memory','summary') AND r.memory_kind IS DISTINCT FROM 'impression' AND r.record_id<>ALL(?::text[])`,
      )
      .all(world.id, actorId, changedRecords))
      needed(
        actorId,
        {
          kind: String(row['source_kind']) as PersonalSourceRef['kind'],
          id: String(row['source_id']),
          revision: String(row['source_revision']),
        },
        row['retention_class'] as Category,
      );
    const candidates = new Map<string, RetainedSourceVersion>();
    for (const row of existing) {
      const value = {
        actorId,
        kind: String(row['source_kind']),
        id: String(row['source_id']),
        revision: String(row['revision']),
        category: row['retention_class'] as Category,
        bytes: Number(row['logical_bytes']),
      };
      candidates.set(key(value), value);
    }
    for (const [kind, table] of Object.entries(tables)) {
      const ids = [
        ...(changes.deletes.get(table) ?? []),
        ...(changes.writes.get(table) ?? []).filter((row) => !row.create).map((row) => row.id),
      ];
      if (!ids.length) continue;
      const size = await db
        .prepare(
          `SELECT COALESCE(SUM(octet_length(payload)),0) AS bytes FROM ${table} WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])`,
        )
        .get(world.id, actorId, ids);
      if (Number(size?.['bytes'] ?? 0) > 4 * 1024 * 1024)
        throw new Error('Exact source closure exceeds bounded preparation.');
      for (const row of await db
        .prepare(
          `SELECT source_id,payload FROM ${table} WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])`,
        )
        .all(world.id, actorId, ids)) {
        const payload = String(row['payload']);
        const value = {
          actorId,
          kind,
          id: String(row['source_id']),
          revision: personalAccountRevision(payload),
          payload,
          category: 'optional' as Category,
          bytes: Buffer.byteLength(payload),
        };
        candidates.set(key(value), value);
      }
    }
    const totals = zero();
    for (const value of candidates.values()) {
      const category = future.get(key(value));
      if (!category) continue;
      const charged = { ...value, category };
      retained.push(charged);
      totals[category].bytes += value.bytes;
      totals[category].count++;
    }
    const old = world.experience?.temporal?.actors[actorId]?.accounts?.archives ?? zero();
    if (JSON.stringify(old) !== JSON.stringify(totals))
      world = updateWorld(world, (draft) => {
        ensureExperienceAccounting(draft, actorId);
        const accounts = draft.experience!.temporal!.actors[actorId]!.accounts!;
        for (const category of ['optional', 'required', 'speech'] as const) {
          accounts[category].bytes += totals[category].bytes - old[category].bytes;
          accounts[category].count += totals[category].count - old[category].count;
          if (accounts[category].bytes < 0 || accounts[category].count < 0)
            throw new Error('Exact archived support accounting underflow.');
        }
        accounts.archives = totals;
        accounts.nextDue = Math.min(accounts.nextDue ?? Infinity, draft.simTime);
      });
  }
  return {
    state: world === state.world ? state : { ...state, world },
    plan: { actors: [...actors], retained },
  };
}

/** Applied beside canonical records in their existing transaction, never later
 * as a best-effort archive cleanup. The prepared actor set owns the complete replacement. */
export async function applySourceVersions(
  db: SqlDatabase,
  worldId: string,
  revision: number,
  plan: SourceVersionPlan,
): Promise<void> {
  for (const actorId of plan.actors) {
    const retained = plan.retained.filter((value) => value.actorId === actorId);
    const keys = retained.map((value) => ({
      kind: value.kind,
      id: value.id,
      revision: value.revision,
    }));
    await db
      .prepare(
        `DELETE FROM mind_source_versions v WHERE world_id=? AND actor_id=? AND source_kind IN ('awareness','memory','summary') AND NOT EXISTS(SELECT 1 FROM jsonb_to_recordset(?::jsonb)q(kind text,id text,revision text)WHERE q.kind=v.source_kind AND q.id=v.source_id AND q.revision=v.revision)`,
      )
      .run(worldId, actorId, JSON.stringify(keys));
    if (retained.length)
      await db
        .prepare(
          `UPDATE mind_source_versions v SET retention_class=q.category,logical_bytes=q.bytes FROM jsonb_to_recordset(?::jsonb)q(kind text,id text,revision text,category text,bytes bigint) WHERE v.world_id=? AND v.actor_id=? AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision AND (v.retention_class,v.logical_bytes) IS DISTINCT FROM(q.category,q.bytes)`,
        )
        .run(JSON.stringify(retained), worldId, actorId);
    const inserted = retained.filter((value) => value.payload !== undefined);
    if (inserted.length)
      await db
        .prepare(
          `INSERT INTO mind_source_versions(world_id,actor_id,source_kind,source_id,revision,payload,retired_revision,retention_class,logical_bytes) SELECT ?,?,q.kind,q.id,q.revision,q.payload,?,q.category,q.bytes FROM jsonb_to_recordset(?::jsonb)q(kind text,id text,revision text,payload text,category text,bytes bigint)
      ON CONFLICT(world_id,actor_id,source_kind,source_id,revision)DO UPDATE SET retention_class=excluded.retention_class,logical_bytes=excluded.logical_bytes`,
        )
        .run(worldId, actorId, revision, JSON.stringify(inserted));
  }
}
