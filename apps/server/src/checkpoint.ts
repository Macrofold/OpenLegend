import { HISTORY_TABLES } from './history.js';
import { MEMORY_HISTORY_TABLES } from './memory-repository.js';
import { RECORD_NODES, legacyObjectRecordSchema, type JsonRecord } from './world-record-schema.js';
import { assembleWorldRecords, WorldRecords } from './world-records.js';
import type { SqlDatabase } from './store.js';
import type { SavePayload } from './game-saves.js';
import { SaveFiles, type SaveFileMetadata } from './save-files.js';
import { CHECKPOINT_ENCODING } from './checkpoint-format.js';
import { tableRows } from './record-pages.js';
export const CHECKPOINT_TABLES = [
  ...RECORD_NODES.keys(),
  ...HISTORY_TABLES,
  ...MEMORY_HISTORY_TABLES,
];

// Exact preceding layout: upgrade through the existing in-place object migration,
// never treat arbitrary missing owner tables as optional current state.
const FOUNDATION_TABLES = new Set([
  'config_participation',
  'sim_containers',
  'sim_declared_owners',
  'sim_object_retirements',
  'sim_object_state',
  'sim_object_lineage',
  'sim_resource_reservations',
  'sim_work_state',
  'sim_work_invocations',
  'mind_appraisal_processes',
  'actor_milestones',
]);
const PRE_FOUNDATION_TABLES = CHECKPOINT_TABLES.filter((table) => !FOUNDATION_TABLES.has(table));

/** Shared capture path for the worker and an already-owned operational snapshot. */
export async function writeCheckpoint(
  db: SqlDatabase,
  files: SaveFiles,
  identity: Pick<SaveFileMetadata, 'id' | 'worldId' | 'label' | 'format' | 'kind'>,
  options: { expectedRevision?: number; captured?: () => void } = {},
) {
  const snapshot = db.readTransaction?.bind(db) ?? db.transaction.bind(db);
  await snapshot(async () => {
    const head = await new WorldRecords(db).head();
    if (
      !head ||
      head.worldId !== identity.worldId ||
      (options.expectedRevision !== undefined && head.revision !== options.expectedRevision)
    )
      throw new Error('Checkpoint capture revision changed.');
    const settings = await db
      .prepare('SELECT payload FROM world_settings WHERE world_id=?')
      .get(head.worldId);
    if (!settings) throw new Error('Checkpoint world settings missing.');
    const simTime = Number(JSON.parse(String(settings['payload'])).simTime);
    options.captured?.();
    await files.writeStream(
      { ...identity, createdAt: new Date().toISOString(), simTime, revision: head.revision },
      checkpointLines(db, head.worldId, identity.format, head.revision),
    );
  });
}

async function* checkpointLines(
  db: SqlDatabase,
  worldId: string,
  format: string,
  revision: number,
) {
  yield JSON.stringify({
    encoding: CHECKPOINT_ENCODING,
    format,
    worldId,
    revision,
    tables: CHECKPOINT_TABLES,
  }) + '\n';
  const started = performance.now();
  for (const table of CHECKPOINT_TABLES) {
    if (performance.now() - started > 120_000)
      throw new Error('Checkpoint capture exceeded two minutes; previous saves retained.');
    yield JSON.stringify({ table }) + '\n';
    for await (const row of tableRows(db, table, worldId)) {
      if (performance.now() - started > 120_000)
        throw new Error('Checkpoint capture exceeded two minutes; previous saves retained.');
      yield JSON.stringify({ table, row }) + '\n';
    }
  }
}

export async function readCheckpoint(
  lines: AsyncIterable<string>,
  worldId: string,
  format: string,
): Promise<SavePayload> {
  const groups = new Map<string, Map<string, JsonRecord[]>>();
  const history = Object.fromEntries(
    HISTORY_TABLES.map((table) => [table, [] as JsonRecord[]]),
  ) as SavePayload['history'];
  const memory = Object.fromEntries(
    MEMORY_HISTORY_TABLES.map((table) => [table, [] as JsonRecord[]]),
  ) as NonNullable<SavePayload['memory']>;
  let legacyRecordLayout = false;
  let header = false,
    index = -1;
  let tables: string[] = [];
  const identities = new Set<string>();
  for await (const line of lines) {
    const value = JSON.parse(line) as Record<string, unknown>;
    if (!header) {
      const declared = value['tables'];
      legacyRecordLayout =
        Array.isArray(declared) &&
        declared.length === PRE_FOUNDATION_TABLES.length &&
        PRE_FOUNDATION_TABLES.every((table) => declared.includes(table));
      if (
        value['encoding'] !== CHECKPOINT_ENCODING ||
        value['worldId'] !== worldId ||
        value['format'] !== format ||
        !Array.isArray(declared) ||
        declared.some((table) => typeof table !== 'string' || !CHECKPOINT_TABLES.includes(table)) ||
        new Set(declared).size !== declared.length ||
        (!legacyRecordLayout &&
          (declared.length !== CHECKPOINT_TABLES.length ||
            !CHECKPOINT_TABLES.every((table) => declared.includes(table))))
      )
        throw new Error('Unsupported or incomplete checkpoint manifest.');
      header = true;
      tables = value['tables'] as string[];
      continue;
    }
    const table = String(value['table']);
    const row = value['row'] as JsonRecord | undefined;
    if (!row) {
      if (tables[++index] !== table) throw new Error('Checkpoint table coverage mismatch.');
      identities.clear();
      continue;
    }
    if (tables[index] !== table || row['world_id'] !== worldId)
      throw new Error('Checkpoint row scope mismatch.');
    if (RECORD_NODES.has(table)) {
      if (
        typeof row['id'] !== 'string' ||
        typeof row['parent_id'] !== 'string' ||
        typeof row['slot'] !== 'string' ||
        typeof row['payload'] !== 'string' ||
        !Number.isSafeInteger(Number(row['position'])) ||
        Number(row['position']) < 0 ||
        identities.has(row['id'])
      )
        throw new Error('Invalid or repeated canonical checkpoint record.');
      identities.add(row['id']);
      const parents = groups.get(table) ?? new Map<string, JsonRecord[]>();
      const siblings = parents.get(row['parent_id']) ?? [];
      siblings.push(row);
      parents.set(row['parent_id'], siblings);
      groups.set(table, parents);
    } else {
      const target =
        table in history
          ? history[table as keyof typeof history]
          : memory[table as keyof typeof memory];
      target.push(row);
    }
  }
  if (!header || index !== tables.length - 1) throw new Error('Incomplete checkpoint.');
  for (const parents of groups.values())
    for (const siblings of parents.values())
      siblings.sort(
        (a, b) =>
          Number(a['position']) - Number(b['position']) ||
          String(a['id']).localeCompare(String(b['id'])),
      );
  const events = new Map(history.history_events.map((row) => [row['id'], row['payload']]));
  for (const siblings of groups.get('world_hot_events')?.values() ?? [])
    for (const row of siblings) {
      const id = (JSON.parse(String(row['payload'])) as { id: string }).id;
      if (!events.has(id)) throw new Error('Checkpoint is missing referenced event history.');
      row['payload'] = events.get(id);
    }
  const schema = legacyRecordLayout ? legacyObjectRecordSchema() : undefined;
  if (legacyRecordLayout) {
    for (const row of [...(groups.get('world_settings')?.values() ?? [])].flat()) {
      const world = JSON.parse(String(row['payload']));
      if (world.objectState || world.workState || world.participationPolicy)
        throw new Error('Current world cannot omit foundation checkpoint tables.');
    }
  }
  return {
    format,
    state: assembleWorldRecords(groups, worldId, false, undefined, schema),
    history,
    memory,
    ...(legacyRecordLayout ? { legacyRecordLayout: true } : {}),
  };
}
