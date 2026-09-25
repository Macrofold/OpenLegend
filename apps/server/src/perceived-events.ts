import { projectEventEvidence, type ActorEvent, type WorldEvent } from '@open-legend/domain';
import type { PerceivedEventsPage, PublicEvent } from '@open-legend/protocol';
import type { SqlDatabase } from './store.js';
import type { StorySource } from './history.js';

/** Presentation never receives raw source text, origins or hidden subject IDs. */
export function publicEvent(event: ActorEvent): PublicEvent {
  return {
    id: event.id,
    time: event.at,
    type: event.type,
    text: event.text,
    modality: event.modality,
    ...(event.actorId ? { actorId: event.actorId } : {}),
    ...(event.targetId ? { targetId: event.targetId } : {}),
    ...(event.speech ? { speech: event.speech } : {}),
  };
}
export class HistoryCursorError extends Error {}
type Position = { order: number; id: string };
type Cursor = { version: 1; scope: string; type: string; watermark: Position; before: Position };
const validPosition = (p: Position) =>
  p &&
  Number.isSafeInteger(p.order) &&
  p.order >= 0 &&
  typeof p.id === 'string' &&
  p.id.length > 0 &&
  p.id.length <= 160;

export function perspectiveField(db: SqlDatabase, name: 'order' | 'type', alias = ''): string {
  const column = `${alias ? `${alias}.` : ''}payload`;
  const value =
    db.dialect === 'postgres'
      ? `(${column}::jsonb->>'${name}')`
      : `json_extract(${column}, '$.${name}')`;
  return name === 'order' ? `CAST(${value} AS BIGINT)` : value;
}
/** Index the existing perspective, not all world events; the same expressions drive reads.
 * docs/perceived-world-events.md#4-query-and-storage-behavior */
export async function initializePerceivedEventIndexes(db: SqlDatabase): Promise<void> {
  const order = perspectiveField(db, 'order'),
    type = perspectiveField(db, 'type');
  await db.exec(`
    CREATE INDEX IF NOT EXISTS history_perspective_order ON history_perspectives(world_id,actor_id,(${order}),event_id);
    CREATE INDEX IF NOT EXISTS history_perspective_type_order ON history_perspectives(world_id,actor_id,(${type}),(${order}),event_id);
  `);
}

/** Keyset pagination of the existing actor/event perspectives. No alternate event writer.
 * docs/perceived-world-events.md#4-query-and-storage-behavior */
export async function readPerceivedEvents(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
  scope: string,
  options: { type?: string; cursor?: string; limit?: number },
): Promise<PerceivedEventsPage> {
  const type = options.type ?? 'all';
  if (!/^[a-z][a-z0-9_.:-]{0,63}$/.test(type)) throw new HistoryCursorError('Invalid event type.');
  let cursor: Cursor | undefined;
  if (options.cursor) {
    try {
      if (options.cursor.length > 2048) throw new Error();
      cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as Cursor;
      if (
        cursor.version !== 1 ||
        cursor.scope !== scope ||
        cursor.type !== type ||
        !validPosition(cursor.watermark) ||
        !validPosition(cursor.before)
      )
        throw new Error();
    } catch {
      throw new HistoryCursorError('This event page expired. Refresh the event log.');
    }
  }
  if (options.limit !== undefined && !Number.isFinite(options.limit))
    throw new HistoryCursorError('Invalid event page size.');
  const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 50)));
  const position = perspectiveField(db, 'order', 'p');
  const eventType = perspectiveField(db, 'type', 'p');
  const field = (name: string) =>
    db.dialect === 'postgres'
      ? `(e.payload::jsonb->>'${name}')`
      : `json_extract(e.payload, '$.${name}')`;
  // Private thoughts, plans and diagnostics do not become world events. Own sensed body/contact
  // episodes are permitted observations, even though their acquisition is receiver-private.
  const where =
    `p.world_id=? AND p.actor_id=? AND (${field('scope')}='external' OR ${field('type')} IN ('contact','attribute-concern'))` +
    (type === 'all' ? '' : ` AND ${eventType}=?`);
  const args: unknown[] = [worldId, actorId, ...(type === 'all' ? [] : [type])];
  const join =
    'history_perspectives p JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id JOIN history_audiences a ON a.world_id=e.world_id AND a.event_id=e.id AND a.actor_id=p.actor_id';
  let watermark = cursor?.watermark;
  if (!watermark) {
    const row = await db
      .prepare(
        `SELECT ${position} AS position,p.event_id AS id FROM ${join} WHERE ${where} ORDER BY ${position} DESC,p.event_id DESC LIMIT 1`,
      )
      .get(...args);
    if (!row) return { events: [] };
    watermark = { order: Number(row['position']), id: String(row['id']) };
  }
  // The scalar ceiling enables SQLite range seeks as well as tuple tie-breaking.
  let boundary = ` AND ${position}<=? AND (${position},p.event_id)<=(?,?)`;
  const positions: unknown[] = [watermark.order, watermark.order, watermark.id];
  if (cursor) {
    boundary += ` AND ${position}<=? AND (${position},p.event_id)<(?,?)`;
    positions.push(cursor.before.order, cursor.before.order, cursor.before.id);
  }
  const rows = await db
    .prepare(
      `SELECT ${position} AS position,p.event_id AS id,e.payload,p.payload AS perspective FROM ${join} WHERE ${where}${boundary} ORDER BY ${position} DESC,p.event_id DESC LIMIT ?`,
    )
    .all(...args, ...positions, limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const next: Cursor | undefined =
    rows.length > limit && last
      ? {
          version: 1,
          scope,
          type,
          watermark,
          before: { order: Number(last['position']), id: String(last['id']) },
        }
      : undefined;
  return {
    events: page.reverse().map((row) => {
      const event = JSON.parse(String(row['payload'])) as WorldEvent;
      const perspective = JSON.parse(String(row['perspective'])) as StorySource;
      return publicEvent(projectEventEvidence(event, perspective.evidence));
    }),
    ...(next ? { nextCursor: Buffer.from(JSON.stringify(next)).toString('base64url') } : {}),
  };
}
