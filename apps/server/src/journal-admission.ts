import { toUSVString } from 'node:util';
import {
  definitionPin,
  observationDependencies,
  type ExperienceSummary,
  entityGet,
  sameDefinitionPin,
  type WorldState,
  type WorldEvent,
} from '@open-legend/domain';
import { RECORD_NODES, RECORD_PARENTS, RECORD_PATH_DEPTHS } from './world-record-schema.js';
import {
  ownedAppendRow,
  ownedCreationRow,
  ownedParentRow,
  ownedPhysicalReclamation,
  preparedRecordChanges,
  type RecordChanges,
} from './world-records.js';
import type { SqlDatabase } from './store.js';
import { journalRecordPath, type JournalTransition } from './world-journal-data.js';

/** A narrower eligibility ceiling, never a gameplay/world-size limit. Large changes
 * retain existing synchronous saving instead of creating expensive deferred admission. */
const CONSTRAINT_LOOKUPS = 512;
const sources = new Set(['mind_memories', 'mind_awareness', 'mind_summaries']);
const physical = new Set(['sim_entities', 'sim_items', 'sim_placements']);
export function journalTableFamily(
  before: WorldState,
  after: WorldState,
  changes: RecordChanges,
  events: readonly WorldEvent[] = [],
): boolean {
  if (events.some((event) => !postgresJson(event))) return false;
  const ownsPreparation = preparedRecordChanges(changes);
  const reclaims = (id: string) => ownsPreparation && ownedPhysicalReclamation(changes, id);
  // Count real summary-dependency preparation here; canonical membership probes
  // have their own deduplicated ceiling in prepareJournalConstraints.
  let relatedRows = 0;
  if (
    before.responseReceipts !== after.responseReceipts ||
    before.declarationReceipts !== after.declarationReceipts ||
    before.innerWorlds !== after.innerWorlds ||
    before.experience?.forgotten !== after.experience?.forgotten ||
    before.experience?.corrections !== after.experience?.corrections
  )
    return false;
  const createdPhysical = new Map(
    [...physical].map((table) => [
      table,
      new Set(
        changes.writes
          .get(table)
          ?.filter((row) => row.create)
          .map((row) => (JSON.parse(row.id) as string[])[2]!),
      ),
    ]),
  );
  const newItems = createdPhysical.get('sim_entities')!;
  if (newItems.size) {
    if (
      before.itemDefinitions !== after.itemDefinitions ||
      before.moduleManifest !== after.moduleManifest ||
      before.statusEffectPolicy !== after.statusEffectPolicy ||
      before.recipes !== after.recipes
    )
      return false;
    for (const id of newItems) {
      const entity = entityGet(after.entities, id),
        item = entity?.item,
        placement = entity?.placement;
      const definition = item && before.itemDefinitions[item.definitionPin.id];
      if (
        entityGet(before.entities, id) ||
        entity?.id !== id ||
        entity.kind !== 'item' ||
        entity.actor ||
        entity.animal ||
        entity.threat ||
        entity.retirement ||
        !item ||
        !definition ||
        !sameDefinitionPin(item.definitionPin, definitionPin(definition)) ||
        placement?.mode !== 'contained' ||
        !entityGet(before.entities, placement.parentEntityId) ||
        !entityGet(after.entities, placement.parentEntityId) ||
        !createdPhysical.get('sim_items')!.has(id) ||
        !createdPhysical.get('sim_placements')!.has(id)
      )
        return false;
    }
  }
  const allowed = (table: string) =>
    table === 'data_world' ||
    table === 'world_settings' ||
    table === 'world_command_receipts' ||
    table === 'world_hot_events' ||
    table.startsWith('sim_') ||
    table.startsWith('mind_') ||
    table.startsWith('activity_') ||
    table === 'experience_state';
  for (const [table, rows] of changes.writes) {
    if (!allowed(table) || table === 'activity_methods') return false;
    if (sources.has(table) && rows.some((row) => !row.create)) return false;
    const node = RECORD_NODES.get(table)!;
    if (
      (node.constraints?.length || node.uniqueIndexes?.length) &&
      !physical.has(table) &&
      table !== 'activity_occurrences'
    )
      return false;
    for (const row of rows) {
      if (table === 'mind_perception_segments' && !row.create && !reclaims(row.parent))
        return false;
      if (![row.id, row.parent, row.slot].every(postgresText)) return false;
      const entityId = physical.has(table) ? (JSON.parse(row.id) as string[])[2]! : undefined;
      if (physical.has(table) && row.create && !newItems.has(entityId!)) return false;
      if (table === 'sim_items') {
        const id = entityId!;
        if (
          (!newItems.has(id) && !entityGet(before.entities, id)?.item) ||
          !entityGet(after.entities, id)?.item
        )
          return false;
      }
      if (table === 'sim_entities') {
        const id = entityId!;
        if (
          (!newItems.has(id) && entityGet(before.entities, id)?.id !== id) ||
          entityGet(after.entities, id)?.id !== id
        )
          return false;
      }
      if (table === 'sim_placements' && !newItems.has(entityId!)) {
        const id = entityId!;
        const old = entityGet(before.entities, id)?.placement,
          next = entityGet(after.entities, id)?.placement;
        if (
          !old ||
          !next ||
          old.mode !== 'world' ||
          next.mode !== 'world' ||
          !next.position ||
          ![next.position.x, next.position.y, next.position.z].every(Number.isFinite) ||
          (next.motionContinuityRevision !== undefined &&
            (!Number.isSafeInteger(next.motionContinuityRevision) ||
              next.motionContinuityRevision < 0 ||
              next.motionContinuityRevision > next.revision)) ||
          Object.keys(next).some(
            (field) =>
              ![
                'mode',
                'position',
                'supportSurfaceId',
                'revision',
                'motionContinuityRevision',
              ].includes(field),
          )
        )
          return false;
      }
      // This owner produced payload with JSON.stringify. Its only PostgreSQL JSONB
      // hazards are escaped NUL/unpaired surrogates; ordinary payloads need no
      // second parse and complete graph traversal. Ambiguous escaped text takes
      // the exact validator, as do unowned preparations.
      let value: unknown;
      const decoded = () => (value ??= JSON.parse(row.payload));
      if (
        (!ownsPreparation || /\\u(?:0000|d[89a-f][0-9a-f]{2})/i.test(row.payload)) &&
        !postgresJson(decoded())
      )
        return false;
      // The entity's secondary unique key comes from its body; item/placement keys
      // come from the path. Keep those identities equal before deferring their SQL.
      if (
        table === 'sim_entities' &&
        row.create &&
        (!decoded() ||
          typeof decoded() !== 'object' ||
          (decoded() as Record<string, unknown>)['id'] !== entityId)
      )
        return false;
      if (table === 'sim_placements' && row.create) {
        const placement = decoded() as Record<string, unknown>,
          actual = entityGet(after.entities, entityId!)!.placement;
        if (
          !placement ||
          placement['mode'] !== 'contained' ||
          actual?.mode !== 'contained' ||
          placement['parentEntityId'] !== actual.parentEntityId ||
          Object.keys(placement).some(
            (field) => !['mode', 'parentEntityId', 'revision'].includes(field),
          )
        )
          return false;
      }
      if (table === 'mind_summaries') {
        const summary = decoded() as ExperienceSummary;
        if (!Array.isArray(summary.sources) || !summary.manifest) return false;
        relatedRows +=
          summary.sources.length +
          summary.manifest.coverage.length +
          summary.manifest.speech.reduce((sum, group) => sum + group.sources.length, 0) +
          observationDependencies(summary.manifest.observations).reduce(
            (sum, dependency) => sum + Math.max(1, dependency.aliases.length),
            0,
          );
        if (relatedRows > CONSTRAINT_LOOKUPS) return false;
      }
      const columns = Object.values(node.columns ?? {});
      for (let index = 0; index < columns.length; index++) {
        const column = columns[index]!,
          value = row.extra[index];
        if (value == null) {
          if (/NOT NULL/.test(column.sql)) return false;
          continue;
        }
        // Current temporal/search indexes include typed arrays. Check their
        // elements before scalar prefixes; for-of also rejects sparse holes.
        if (/^(?:TEXT|BIGINT)\[\]/.test(column.sql)) {
          if (!Array.isArray(value)) return false;
          for (const part of value)
            if (
              /^TEXT/.test(column.sql)
                ? typeof part !== 'string' || !postgresText(part)
                : typeof part !== 'number' || !Number.isSafeInteger(part)
            )
              return false;
        } else if (/^(?:BIGINT|DOUBLE PRECISION)/.test(column.sql)) {
          if (
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            (/^BIGINT/.test(column.sql) && !Number.isSafeInteger(value))
          )
            return false;
        } else if (/^TEXT/.test(column.sql) && (typeof value !== 'string' || !postgresText(value)))
          return false;
      }
    }
  }
  for (const [table, ids] of changes.deletes)
    if (
      (table === 'mind_perception_values' && ids.some((id) => !reclaims(id))) ||
      (table === 'mind_perception_segments' &&
        ids.some((id) => !reclaims(JSON.stringify((JSON.parse(id) as string[]).slice(0, -2))))) ||
      !allowed(table) ||
      physical.has(table) ||
      sources.has(table) ||
      table === 'activity_methods' ||
      table === 'experience_state' ||
      /mind_(?:memories|awareness|summaries|forgotten|corrections)_owners/.test(table)
    )
      return false;
  return true;
}
function postgresText(text: string): boolean {
  return !text.includes('\0') && toUSVString(text) === text;
}
function postgresJson(value: unknown): boolean {
  const pending = [value];
  while (pending.length) {
    const value = pending.pop();
    if (typeof value === 'string') {
      if (!postgresText(value)) return false;
    } else if (value && typeof value === 'object') {
      for (const [key, part] of Object.entries(value)) {
        if (!postgresText(key)) return false;
        pending.push(part);
      }
    }
  }
  return true;
}
const key = (table: string, id: string) => JSON.stringify([table, id]);
/** Canonical rows have one schema-owned parent chain. Deleting a sibling cannot
 * remove a row: use exact membership, not every write × every deleted path. The
 * attempt-local path cache is shared across pending overlays and never retains a world. */
function deletionLookup(changes: RecordChanges, paths: Map<string, string[]>) {
  const deleted = new Map([...changes.deletes].map(([table, ids]) => [table, new Set(ids)]));
  return (table: string, id: string): boolean => {
    if (deleted.get(table)?.has(id)) return true;
    for (let owner = RECORD_PARENTS.get(table); owner; owner = RECORD_PARENTS.get(owner)) {
      const ids = deleted.get(owner);
      if (!ids?.size) continue;
      let path = paths.get(id);
      if (!path) {
        path = JSON.parse(id) as string[];
        paths.set(id, path);
      }
      if (ids.has(JSON.stringify(path.slice(0, RECORD_PATH_DEPTHS.get(owner)!)))) return true;
    }
    return false;
  };
}

/** Owned by one exact save attempt; this only prepares which current facts to
 * read. It does not certify database membership or permission. */
export interface JournalConstraintPlan {
  readonly worldId: string;
  readonly changes: RecordChanges;
  readonly positions: ReadonlyMap<string, readonly { parent_id: string; position: number }[]>;
  readonly physicalParents: ReadonlyMap<string, string>;
  readonly sql: string | undefined;
  readonly params: readonly unknown[];
}
export function prepareJournalConstraints(
  worldId: string,
  changes: RecordChanges,
): JournalConstraintPlan | undefined {
  const ownsPreparation = preparedRecordChanges(changes);
  const created = new Map(
    [...changes.writes].map(([table, rows]) => [
      table,
      new Set(rows.filter((row) => row.create).map((row) => row.id)),
    ]),
  );
  const wanted = new Map<string, Set<string>>();
  const positions = new Map<string, Array<{ parent_id: string; position: number }>>();
  const positionQueries = new Map<string, Array<{ parent_id: string; position: number }>>();
  const positionKeys = new Set<string>();
  const physicalParents = new Map<string, string>();
  const add = (table: string, id: string) => {
    const ids = wanted.get(table) ?? new Set();
    ids.add(id);
    wanted.set(table, ids);
  };
  for (const [table, rows] of changes.writes)
    for (const row of rows) {
      if (!RECORD_NODES.has(table)) throw new Error('Unknown journal constraint table.');
      const parent = RECORD_PARENTS.get(table);
      // A newly created owner's absence is checked once. Its FK-owned children
      // cannot already exist in canonical storage; the exact codec also proves
      // their within-transition identities and positions.
      const newParent = ownsPreparation && !!parent && created.get(parent)?.has(row.parent);
      const append = ownsPreparation && ownedAppendRow(changes, row);
      const complete = ownsPreparation && ownedCreationRow(changes, row);
      if (row.create && !append && !newParent && !complete) add(table, row.id);
      if (row.create && !append && !newParent && journalRecordPath(table, row.id).list) {
        const positionKey = JSON.stringify([table, row.parent, row.position]);
        const probe = { parent_id: row.parent, position: row.position };
        const checks = positions.get(table) ?? [];
        checks.push(probe);
        positions.set(table, checks);
        // Complete resident membership replaces the SQL lookup, not validation
        // of conflicting positions in the accepted pending suffix.
        if (!complete && !positionKeys.has(positionKey)) {
          positionKeys.add(positionKey);
          const probes = positionQueries.get(table) ?? [];
          probes.push(probe);
          positionQueries.set(table, probes);
        }
      }
      if (
        parent &&
        !created.get(parent)?.has(row.parent) &&
        !(ownsPreparation && ownedParentRow(changes, parent, row.parent))
      )
        add(parent, row.parent);
      if (table === 'sim_placements' && row.create) {
        const placement = JSON.parse(row.payload) as Record<string, unknown>;
        if (placement['mode'] !== 'contained' || typeof placement['parentEntityId'] !== 'string')
          return;
        // Structural ownership is the new item, whereas physical ownership is its
        // existing inventory. Both references must survive the committed suffix.
        // docs/projects/performance-overhaul/journal-contract.md#contained-item-creation--selected-october-17-2026-1336-edt
        const owner = JSON.stringify(['world', 'entities', placement['parentEntityId']]);
        physicalParents.set(row.id, owner);
        add('sim_entities', owner);
      }
    }
  if (
    [...wanted.values()].reduce((total, ids) => total + ids.size, positionKeys.size) >
    CONSTRAINT_LOOKUPS
  )
    return;
  const queries: string[] = [],
    params: unknown[] = [];
  for (const [table, ids] of wanted) {
    queries.push(
      `SELECT '${table}' AS table_name,id,parent_id,position FROM ${table} WHERE world_id=? AND id=ANY(?::text[])`,
    );
    params.push(worldId, [...ids]);
  }
  for (const [table, probes] of positionQueries) {
    queries.push(`SELECT '${table}' AS table_name,t.id,t.parent_id,t.position FROM ${table} t
      JOIN jsonb_to_recordset(?::jsonb) AS p(parent_id TEXT,position BIGINT)
        ON t.parent_id=p.parent_id AND t.position=p.position WHERE t.world_id=?`);
    params.push(JSON.stringify(probes), worldId);
  }
  return {
    worldId,
    changes,
    positions,
    physicalParents,
    sql: queries.length
      ? `SELECT * FROM (${queries.join(' UNION ALL ')}) AS constraint_records LIMIT ${CONSTRAINT_LOOKUPS * 3 + 1}`
      : undefined,
    params,
  };
}

/** Runs before the final expected-head update and receipt/append acknowledgement.
 * One bounded union uses the canonical PK/parent indexes; pending exact changes
 * cover the newer committed suffix absent from those applied rows. */
export async function journalConstraints(
  db: SqlDatabase,
  plan: JournalConstraintPlan,
  pending: readonly JournalTransition[],
): Promise<boolean> {
  const { changes, positions, physicalParents, sql, params } = plan;
  const ownsPreparation = preparedRecordChanges(changes);
  const present = new Set<string>();
  const placed = new Map<string, { table: string; id: string; parent: string; position: number }>();
  if (sql) {
    const rows = await db.prepare(sql).all(...params);
    if (rows.length > CONSTRAINT_LOOKUPS * 3) return false;
    for (const row of rows) {
      present.add(key(String(row['table_name']), String(row['id'])));
      if (positions.has(String(row['table_name'])))
        placed.set(key(String(row['table_name']), String(row['id'])), {
          table: String(row['table_name']),
          id: String(row['id']),
          parent: String(row['parent_id']),
          position: Number(row['position']),
        });
    }
  }
  const paths = new Map<string, string[]>();
  const removedBy = deletionLookup(changes, paths);
  const overlays = pending.map((entry) => ({
    writes: new Map(
      [...entry.changes.writes].map(([table, rows]) => [table, new Set(rows.map((row) => row.id))]),
    ),
    changes: entry.changes,
    removedBy: deletionLookup(entry.changes, paths),
  }));
  for (const entry of overlays) {
    for (const [table, rows] of entry.changes.writes)
      if (positions.has(table))
        for (const row of rows)
          placed.set(key(table, row.id), {
            table,
            id: row.id,
            parent: row.parent,
            position: row.position,
          });
    for (const [id, row] of placed) if (entry.removedBy(row.table, row.id)) placed.delete(id);
  }
  // Finite plans discard completed steps and move retained steps in the same
  // transition that appends the next one. Check their final positions: a slot
  // vacated by a retained step is available to the new step in this commit.
  for (const [table, rows] of changes.writes)
    if (positions.has(table))
      for (const row of rows)
        placed.set(key(table, row.id), {
          table,
          id: row.id,
          parent: row.parent,
          position: row.position,
        });
  const slots = new Map<string, Set<string>>();
  for (const row of placed.values()) {
    if (removedBy(row.table, row.id)) continue;
    const slot = JSON.stringify([row.table, row.parent, row.position]),
      ids = slots.get(slot) ?? new Set<string>();
    ids.add(row.id);
    slots.set(slot, ids);
  }
  for (const [table, rows] of changes.writes)
    for (const row of rows)
      if (row.create && positions.has(table)) {
        const slot = JSON.stringify([table, row.parent, row.position]),
          ids = slots.get(slot) ?? new Set<string>();
        if ([...ids].some((id) => id !== row.id))
          throw new Error('A journal insertion reuses a saved list position.');
        ids.add(row.id);
        slots.set(slot, ids);
      }
  const exists = (table: string, id: string, known = false): boolean => {
    let result = known || present.has(key(table, id));
    for (const entry of overlays) {
      if (entry.writes.get(table)?.has(id)) result = true;
      if (entry.removedBy(table, id)) result = false;
    }
    return result;
  };
  const created = new Map<string, Set<string>>(
    [...changes.writes].map(([table, rows]) => [
      table,
      new Set(rows.filter((row) => row.create).map((row) => row.id)),
    ]),
  );
  for (const [table, rows] of changes.writes)
    for (const row of rows) {
      if (row.create && exists(table, row.id))
        throw new Error('A journal insertion reuses an existing canonical record.');
      const parent = RECORD_PARENTS.get(table);
      if (
        parent &&
        !created.get(parent)?.has(row.parent) &&
        !exists(parent, row.parent, ownsPreparation && ownedParentRow(changes, parent, row.parent))
      )
        throw new Error('A journal record has no committed parent.');
      const owner = table === 'sim_placements' ? physicalParents.get(row.id) : undefined;
      if (owner && !exists('sim_entities', owner))
        throw new Error('A journal item has no committed physical parent.');
      if (owner && removedBy('sim_entities', owner)) return false;
      if (removedBy(table, row.id)) return false;
    }
  return true;
}
