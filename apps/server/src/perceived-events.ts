import { projectEventEvidence, type ActorEvent, type WorldEvent } from '@open-legend/domain';
import type { PerceivedEventsPage, PublicEvent } from '@open-legend/protocol';
import { digest } from './content-digest.js';
import type { SqlDatabase } from './store.js';
import type { StorySource } from './history.js';
import { SEARCH_SCAN_ROWS, matchesSearch, scanMatches, searchTerms } from './text-search.js';

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
type Cursor = {
  version: 1;
  scope: string;
  type: string;
  /** Digest of the normalized search words; absent for plain browsing. */
  query?: string;
  watermark: Position;
  before: Position;
};
const validPosition = (p: Position) =>
  p &&
  Number.isSafeInteger(p.order) &&
  p.order >= 0 &&
  typeof p.id === 'string' &&
  p.id.length > 0 &&
  p.id.length <= 160;

export function perspectiveField(name: 'order' | 'type', alias = ''): string {
  return `${alias ? `${alias}.` : ''}${name === 'order' ? 'position' : 'event_type'}`;
}
/** Index the existing perspective, not all world events; the same columns drive reads.
 * docs/perceived-world-events.md#4-query-and-storage-behavior */
export async function initializePerceivedEventIndexes(db: SqlDatabase): Promise<void> {
  await db.exec(`
    CREATE INDEX IF NOT EXISTS history_perspective_order ON history_perspectives(world_id,actor_id,position,event_id);
    CREATE INDEX IF NOT EXISTS history_perspective_type_order ON history_perspectives(world_id,actor_id,event_type,position,event_id);
    CREATE INDEX IF NOT EXISTS history_perspective_peer_order ON history_perspectives(world_id,actor_id,speech_peer_id,position,event_id) WHERE speech_peer_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS history_perspective_response_order ON history_perspectives(world_id,actor_id,position,event_id) WHERE response_action;
    CREATE INDEX IF NOT EXISTS history_perspective_source_response_order ON history_perspectives(world_id,actor_id,source_id,position,event_id) WHERE response_action;
  `);
}

/** Keyset pagination of the existing actor/event perspectives. No alternate event writer.
 * docs/perceived-world-events.md#4-query-and-storage-behavior */
export async function readPerceivedEvents(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
  scope: string,
  options: { type?: string; cursor?: string; limit?: number; q?: string },
): Promise<PerceivedEventsPage> {
  const type = options.type ?? 'all';
  const terms = searchTerms(options.q);
  const query = terms ? digest(terms) : undefined;
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
        (cursor.query ?? '') !== (query ?? '') ||
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
  const position = perspectiveField('order', 'p');
  const eventType = perspectiveField('type', 'p');
  const field = (name: string) => `(e.payload::jsonb->>'${name}')`;
  // Private thoughts, plans and diagnostics do not become world events. Own sensed body/contact
  // episodes are permitted observations, even though their acquisition is receiver-private.
  const where =
    `p.world_id=? AND p.actor_id=? AND (${field('scope')}='external' OR ${field('type')} IN ('encounter','contact','attribute-concern'))` +
    (type === 'all' ? '' : ` AND ${eventType}=?`);
  const args: unknown[] = [worldId, actorId, ...(type === 'all' ? [] : [type])];
  const join =
    'history_perspectives p JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id';
  // One read snapshot: a search's matches and the bodies loaded for them must agree.
  const snapshot = db.readTransaction?.bind(db) ?? db.transaction.bind(db);
  return snapshot(async () => {
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
    // The scalar ceiling bounds the range before tuple tie-breaking.
    const boundary = (before: Position | undefined) =>
      ` AND ${position}<=? AND (${position},p.event_id)<=(?,?)` +
      (before ? ` AND ${position}<=? AND (${position},p.event_id)<(?,?)` : '');
    const positions = (before: Position | undefined) => [
      watermark.order,
      watermark.order,
      watermark.id,
      ...(before ? [before.order, before.order, before.id] : []),
    ];
    type Row = Record<string, unknown>;
    const at = (row: Row): Position => ({ order: Number(row['position']), id: String(row['id']) });
    let rows: Row[], last: Row | undefined, scanLimited: boolean;
    if (terms) {
      // A search examines at most SEARCH_SCAN_ROWS rows per request and matches only the
      // viewer's perspective text, never raw event payloads (docs/limits/hearing-and-speech.md#hr06--history-paging-and-growth).
      ({
        matched: rows,
        last,
        scanLimited,
      } = await scanMatches<Row>(
        (after, count) => {
          const before = after ? at(after) : cursor?.before;
          return db
            .prepare(
              `SELECT ${position} AS position,p.event_id AS id,coalesce(p.payload::jsonb->>'text','') AS text FROM ${join} WHERE ${where}${boundary(before)} ORDER BY ${position} DESC,p.event_id DESC LIMIT ?`,
            )
            .all(...args, ...positions(before), count);
        },
        (row) => matchesSearch(terms, String(row['text'])),
        limit,
        SEARCH_SCAN_ROWS,
      ));
      const ids = rows.slice(0, limit).map((row) => String(row['id']));
      const bodies = new Map(
        (ids.length
          ? await db
              .prepare(
                `SELECT p.event_id AS id,e.payload,p.payload AS perspective FROM ${join} WHERE p.world_id=? AND p.actor_id=? AND p.event_id IN (${ids.map(() => '?').join(',')})`,
              )
              .all(worldId, actorId, ...ids)
          : []
        ).map((row) => [String(row['id']), row]),
      );
      rows = rows.map((row, index) => {
        if (index >= limit) return row;
        const body = bodies.get(String(row['id']));
        if (!body)
          throw new HistoryCursorError('History changed while loading. Refresh the event log.');
        return { ...row, ...body };
      });
    } else {
      rows = await db
        .prepare(
          `SELECT ${position} AS position,p.event_id AS id,e.payload,p.payload AS perspective FROM ${join} WHERE ${where}${boundary(cursor?.before)} ORDER BY ${position} DESC,p.event_id DESC LIMIT ?`,
        )
        .all(...args, ...positions(cursor?.before), limit + 1);
      scanLimited = false;
    }
    const page = rows.slice(0, limit);
    const cursorAt = (row: Row): Cursor => ({
      version: 1,
      scope,
      type,
      ...(query ? { query } : {}),
      watermark,
      before: at(row),
    });
    const next: Cursor | undefined =
      rows.length > limit
        ? cursorAt(page.at(-1)!)
        : scanLimited && last
          ? cursorAt(last)
          : undefined;
    return {
      events: page.reverse().map((row) => {
        const event = JSON.parse(String(row['payload'])) as WorldEvent;
        const perspective = JSON.parse(String(row['perspective'])) as StorySource;
        return publicEvent(projectEventEvidence(event, perspective.evidence));
      }),
      ...(next ? { nextCursor: Buffer.from(JSON.stringify(next)).toString('base64url') } : {}),
      ...(scanLimited ? { scanLimited } : {}),
    };
  });
}
