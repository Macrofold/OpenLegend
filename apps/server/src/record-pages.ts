import { setImmediate } from 'node:timers/promises';
import type { SqlDatabase } from './store.js';
import { CHECKPOINT_LIMITS } from './checkpoint-format.js';

const identifier = (name: string) => {
  if (!/^[a-z_]+$/.test(name)) throw new Error('Invalid checkpoint table or column.');
  return name;
};

/** Keyset paging never scans an increasing OFFSET or retains previous pages. */
export async function* tableRows(db: SqlDatabase, table: string, worldId?: string) {
  identifier(table);
  const primary = (
    await db
      .prepare(
        `SELECT a.attname AS name FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
        WHERE i.indrelid=?::regclass AND i.indisprimary ORDER BY array_position(i.indkey,a.attnum)`,
      )
      .all(table)
  ).map((r) => String(r['name']));
  const columns = primary.filter((name) => worldId === undefined || name !== 'world_id');
  if (!columns.length) throw new Error(`Checkpoint table ${table} needs a stable primary key.`);
  columns.forEach(identifier);
  let cursor: unknown[] | undefined;
  for (;;) {
    const predicates = [
      worldId !== undefined ? 'world_id=?' : '',
      cursor ? `(${columns.join(',')}) > (${columns.map(() => '?').join(',')})` : '',
    ].filter(Boolean);
    const rows = await db
      .prepare(
        `SELECT * FROM ${table}${predicates.length ? ` WHERE ${predicates.join(' AND ')}` : ''} ORDER BY ${columns.join(',')} LIMIT ${CHECKPOINT_LIMITS.page}`,
      )
      .all(...(worldId !== undefined ? [worldId] : []), ...(cursor ?? []));
    for (const row of rows) yield row;
    if (rows.length < CHECKPOINT_LIMITS.page) return;
    cursor = columns.map((column) => rows.at(-1)![column]);
    // Cooperate between bounded pages so native commands and timers can continue.
    await setImmediate();
  }
}
