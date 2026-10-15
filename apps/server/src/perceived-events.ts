import { projectEventEvidence, type ActorEvent, type WorldEvent } from '@open-legend/domain';
import type {
  PerceivedEventsPage,
  PublicEvent,
  WorldEventSourceAcquisition,
  WorldEventSourceDetail,
  WorldEventSourceReference,
} from '@open-legend/protocol';
import { digest } from './content-digest.js';
import type { SqlDatabase } from './store.js';
import type { StorySource } from './history.js';
import { SEARCH_SCAN_ROWS, matchesSearch, scanMatches, searchTerms } from './text-search.js';
import { HistoryCursorError } from './history-cursor-error.js';
export { HistoryCursorError } from './history-cursor-error.js';

export function worldEventSourceReference(
  sourceScope: string,
  family: 'speech' | 'encounter',
  sourceId: string,
  revision = '1',
): WorldEventSourceReference {
  return {
    family,
    sourceId,
    revision,
    token: digest(['world-event-source-v1', sourceScope, family, sourceId]),
  };
}

/** Presentation never receives raw source text, origins or hidden subject IDs. */
export function publicEvent(event: ActorEvent): PublicEvent {
  const change = event.type === 'attribute-changed' ? event.data : undefined;
  const attributeChange =
    change &&
    typeof change['attributeId'] === 'string' &&
    typeof change['definitionVersion'] === 'number' &&
    typeof change['before'] === 'number' &&
    typeof change['after'] === 'number' &&
    typeof change['unit'] === 'string'
      ? {
          attributeId: change['attributeId'],
          definitionVersion: change['definitionVersion'],
          before: change['before'],
          after: change['after'],
          unit: change['unit'],
        }
      : undefined;
  return {
    ...(event.type === 'expression' &&
    event.data?.['descriptive'] === true &&
    event.data?.['mechanical'] === false
      ? { descriptive: true as const }
      : {}),
    ...(attributeChange ? { attributeChange } : {}),
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

function correctionEventIdFor(
  corrections: Record<string, string> | undefined,
  sourceId: string,
): string | undefined {
  return corrections?.[sourceId] ?? corrections?.[`memory-${sourceId}`];
}

function unavailableSourceDetail(sourceId: string): WorldEventSourceDetail {
  return {
    status: 'unavailable',
    sourceId,
    reason: 'This source is no longer available in retained personal history.',
  };
}

/** Keyset pagination of the existing actor/event perspectives. No alternate event writer.
 * docs/perceived-world-events.md#4-query-and-storage-behavior */
export async function readPerceivedEvents(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
  scope: string,
  options: { type?: string; cursor?: string; limit?: number; q?: string },
  sourceScope = scope,
  corrections?: Record<string, string>,
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
    `p.world_id=? AND p.actor_id=? AND (${field('scope')}='external' OR ${field('type')} IN ('encounter','contact','attribute-concern','attribute-changed'))` +
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
        const projected = projectEventEvidence(event, perspective.evidence);
        const corr = correctionEventIdFor(corrections, projected.id);
        const source =
          projected.type === 'speech' || projected.type === 'encounter'
            ? worldEventSourceReference(
                sourceScope,
                projected.type,
                projected.id,
                corr ? `${perspective.revision}:corrected:${corr}` : perspective.revision,
              )
            : undefined;
        return {
          ...publicEvent(projected),
          ...(source ? { source } : {}),
        };
      }),
      ...(next ? { nextCursor: Buffer.from(JSON.stringify(next)).toString('base64url') } : {}),
      ...(scanLimited ? { scanLimited } : {}),
    };
  });
}

/** Exact indexed lookup of one or two retained actor perspectives for source detail/comparison.
 * Never falls back to raw world events when an actor perspective is missing or revoked.
 * docs/perceived-world-events.md#4-query-and-storage-behavior
 */
export async function readPerceivedEventSources(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
  sourceScope: string,
  references: readonly WorldEventSourceReference[],
  state?: { corrections?: Record<string, string>; forgotten?: readonly string[] },
): Promise<WorldEventSourceDetail[]> {
  if (!Array.isArray(references) || references.length < 1 || references.length > 2)
    throw new HistoryCursorError('Select one or two event sources.');
  for (const ref of references) {
    if (
      !ref ||
      (ref.family !== 'speech' && ref.family !== 'encounter') ||
      typeof ref.sourceId !== 'string' ||
      ref.sourceId.length === 0 ||
      ref.sourceId.length > 160 ||
      typeof ref.revision !== 'string' ||
      ref.revision.length === 0 ||
      ref.revision.length > 200 ||
      typeof ref.token !== 'string' ||
      ref.token !==
        worldEventSourceReference(sourceScope, ref.family, ref.sourceId, ref.revision).token
    )
      throw new HistoryCursorError('This source selection expired. Refresh the event log.');
  }
  const forgottenSet = state?.forgotten?.length ? new Set(state.forgotten) : undefined;
  const isForgotten = (id: string) =>
    Boolean(forgottenSet && (forgottenSet.has(id) || forgottenSet.has(`memory-${id}`)));
  const corrections = state?.corrections;
  const requestedIds = [
    ...new Set(references.map((ref) => ref.sourceId).filter((id) => !isForgotten(id))),
  ];
  if (!requestedIds.length) {
    return references.map((ref) => unavailableSourceDetail(ref.sourceId));
  }
  const correctionIds = requestedIds.flatMap((id) => {
    const corr = correctionEventIdFor(corrections, id);
    return corr && !isForgotten(corr) ? [corr] : [];
  });
  const allIds = [...new Set([...requestedIds, ...correctionIds])];
  const position = perspectiveField('order', 'p');
  const field = (name: string) => `(e.payload::jsonb->>'${name}')`;
  const join =
    'history_perspectives p JOIN history_events e ON e.world_id=p.world_id AND e.id=p.event_id';
  const where = `p.world_id=? AND p.actor_id=? AND (${field('scope')}='external' OR ${field('type')} IN ('encounter','contact','attribute-concern','attribute-changed')) AND p.event_id IN (${allIds.map(() => '?').join(',')})`;
  const snapshot = db.readTransaction?.bind(db) ?? db.transaction.bind(db);
  return snapshot(async () => {
    const rows = await db
      .prepare(
        `SELECT ${position} AS position,p.event_id AS id,e.payload,p.payload AS perspective FROM ${join} WHERE ${where}`,
      )
      .all(worldId, actorId, ...allIds);
    const byId = new Map(rows.map((row) => [String(row['id']), row]));
    return references.map((ref): WorldEventSourceDetail => {
      if (isForgotten(ref.sourceId)) {
        return unavailableSourceDetail(ref.sourceId);
      }
      const row = byId.get(ref.sourceId);
      if (!row) {
        return unavailableSourceDetail(ref.sourceId);
      }
      const event = JSON.parse(String(row['payload'])) as WorldEvent;
      const perspective = JSON.parse(String(row['perspective'])) as StorySource;
      const projected = projectEventEvidence(event, perspective.evidence);
      if (
        (projected.type !== 'speech' && projected.type !== 'encounter') ||
        projected.type !== ref.family
      )
        throw new HistoryCursorError('This source selection expired. Refresh the event log.');
      const exposure = perspective.evidence.exposure ?? event.exposure;
      let acquisition: WorldEventSourceAcquisition;
      let acquisitionLabel: string;
      let sourceLabel: string;
      if (projected.type === 'speech') {
        const selfSpoken =
          projected.speech?.perception === 'self' ||
          projected.actorId === actorId ||
          perspective.evidence.sourceId === actorId;
        acquisition = selfSpoken ? 'spoken-by-self' : 'heard-speech';
        acquisitionLabel = selfSpoken ? 'Spoken by you' : 'Heard';
        sourceLabel =
          projected.speech?.speaker?.nameAtTime || (selfSpoken ? 'You' : 'Unrecognized speaker');
      } else if (exposure?.kind === 'inventory-item') {
        if (exposure.inscription) {
          acquisition = 'inspected-document';
          acquisitionLabel = 'Inspected a written account';
        } else {
          acquisition = 'inspected-item';
          acquisitionLabel = 'Inspected';
        }
        sourceLabel = exposure.label;
      } else if (exposure?.kind === 'place') {
        acquisition = 'observed-place';
        acquisitionLabel = 'Observed';
        sourceLabel = exposure.label;
      } else {
        acquisition = 'observed-encounter';
        acquisitionLabel = 'Observed';
        sourceLabel = 'Observed encounter';
      }
      const observedLocation =
        exposure?.kind === 'inventory-item' && exposure.observedLocation
          ? exposure.observedLocation.kind === 'world'
            ? {
                kind: 'world' as const,
                label: exposure.observedLocation.label,
                point: {
                  x: exposure.observedLocation.point.x,
                  y: exposure.observedLocation.point.y,
                  z: exposure.observedLocation.point.z,
                  surfaceId: exposure.observedLocation.point.surfaceId,
                },
              }
            : {
                kind: 'possession' as const,
                label: exposure.observedLocation.label,
              }
          : undefined;
      const correctionEventId = correctionEventIdFor(corrections, ref.sourceId);
      const corrected = Boolean(correctionEventId);
      let correctionNote: string | undefined;
      if (correctionEventId) {
        const corrRow = !isForgotten(correctionEventId) ? byId.get(correctionEventId) : undefined;
        if (corrRow) {
          const corrEvent = JSON.parse(String(corrRow['payload'])) as WorldEvent;
          const corrPerspective = JSON.parse(String(corrRow['perspective'])) as StorySource;
          const corrProjected = projectEventEvidence(corrEvent, corrPerspective.evidence);
          correctionNote = `Qualified by later observation: ${corrProjected.text}`;
        } else {
          correctionNote = 'Qualified by a later observation in retained history.';
        }
      }
      return {
        status: 'available',
        reference: worldEventSourceReference(
          sourceScope,
          ref.family,
          ref.sourceId,
          correctionEventId
            ? `${perspective.revision}:corrected:${correctionEventId}`
            : perspective.revision,
        ),
        time: projected.at,
        order: Number(row['position']),
        acquisition,
        acquisitionLabel,
        sourceLabel,
        text: projected.text,
        ...(exposure?.kind === 'inventory-item' && exposure.inscription
          ? { inscription: exposure.inscription }
          : {}),
        ...(projected.speech ? { speech: projected.speech } : {}),
        ...(observedLocation ? { observedLocation } : {}),
        corrected,
        ...(correctionNote ? { correctionNote } : {}),
      };
    });
  });
}
