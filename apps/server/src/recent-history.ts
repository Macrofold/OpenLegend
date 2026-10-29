import {
  entityGet,
  speechDescription,
  soundDescription,
  type TemporalValue,
  type ObservedLocation,
  type SensoryFacet,
} from '@open-legend/domain';
import type { MemoryHistoryPage } from '@open-legend/protocol';
import { z } from 'zod';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import { HistoryCursorError } from './perceived-events.js';
import { permittedSourceHandle, historicalAccountText } from './entity-references.js';
import { digest } from './store.js';
import { sealCursor, openCursor } from './scoped-cursor.js';
import { captureTemporalHistoryReadContext, temporalHistoryWindow } from './temporal-storage.js';
import type { WorldService } from './world-service.js';

const cursorSchema = z
  .object({
    fence: z.string(),
    at: z.number().finite(),
    epoch: z.string(),
    ordinal: z.number().int().nonnegative(),
    order: z.number().int().nonnegative(),
  })
  .strict();
const point = (p: { x: number; y: number; z: number }) => `(${p.x}, ${p.y}, ${p.z})`;
function receivedLocation(location: ObservedLocation): string {
  if (location.kind === 'point')
    return `position ${point(location.point)}${location.errorRadius ? `, within ${location.errorRadius}` : ''}`;
  if (location.kind === 'region') return `within ${location.radius} of ${point(location.center)}`;
  return location.elevation === 'level'
    ? 'a direction around my level'
    : `a direction ${location.elevation} me`;
}
function receivedText(values: readonly (TemporalValue | SensoryFacet)[]): string {
  const parts: string[] = [];
  for (const value of values) {
    if (value.kind === 'personal-account') parts.push(historicalAccountText(value.text));
    else if (value.kind === 'speech') parts.push(speechDescription(value.speech));
    else if (value.kind === 'sound') parts.push(soundDescription(value.sound));
    else if (value.kind === 'location') parts.push(receivedLocation(value.location));
    else if (value.kind === 'body')
      parts.push(`${value.body.label?.name ?? 'something'} at ${point(value.body.position)}`);
    else if (value.kind === 'event')
      parts.push(value.eventType === 'speech' ? value.text : historicalAccountText(value.text));
    else if (value.kind === 'claim') parts.push(value.wordsAsHeard);
    else if (value.kind === 'observed-motion')
      parts.push(
        `${receivedLocation(value.earlier.location)} → ${receivedLocation(value.later.location)}`,
      );
    else if (value.kind === 'surface-patch')
      parts.push(
        `Visible part of a surface through ${value.patch.vertices.map(point).join(', ')}${value.patch.errorRadius ? `; uncertainty ${value.patch.errorRadius}` : ''}`,
      );
    else if (value.kind === 'physical-boundary')
      parts.push(
        `Edge from ${point(value.boundary.a)} to ${point(value.boundary.b)}${value.boundary.dropLower > 0 ? `; drop at least ${value.boundary.dropLower}` : ''}`,
      );
    else if (value.kind === 'public-attributes')
      parts.push(
        ...value.attributes.map(
          (attribute) =>
            `${attribute.name}: ${attribute.status === 'known' && attribute.value !== null ? `${attribute.value}${attribute.unit ? ` ${attribute.unit}` : ''}` : 'unknown'}`,
        ),
      );
    else if (value.kind === 'carried')
      parts.push(
        `Carried: ${value.items.map((item) => item.itemKindAsObserved).join(', ') || 'nothing observed'}`,
      );
    else if (value.kind === 'pile-contents')
      parts.push(
        `Contents: ${value.items.map((item) => `${item.quantity} ${item.name}`).join(', ') || 'nothing observed'}`,
      );
    else if (value.kind === 'encounter-exposure') {
      const exposure = value.exposure;
      parts.push(`${exposure.label}: ${exposure.description}`);
      if (exposure.kind === 'inventory-item') {
        if (exposure.inscription) parts.push(`Inscription: ${exposure.inscription}`);
        if (exposure.observedLocation) parts.push(exposure.observedLocation.label);
      }
    } else if (value.kind === 'contact')
      parts.push(value.detail === 'moving' ? 'Movement noticed.' : 'Presence noticed.');
    else if (value.kind === 'detected') parts.push(`${value.detected} detected.`);
  }
  return [...new Set(parts)].join('; ') || 'A received detail changed.';
}

const editReferenceSchema = z
  .object({
    purpose: z.literal('recent-observation-edit'),
    scope: z.string(),
    worldId: z.string(),
    generation: z.string(),
    receipt: z
      .object({
        actorId: z.string(),
        physicalLife: z.number().int().nonnegative(),
        epoch: z.string(),
        ordinal: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
/** A reader-issued address is opaque and scoped; editing still rechecks current
 * authority and retained receipt membership through the ordinary mutation owner. */
export function resolveRecentObservationReference(
  service: WorldService,
  actorId: string,
  scope: RequestScope,
  token: string,
) {
  const value = editReferenceSchema.parse(openCursor(token));
  if (
    value.scope !== scopeKey(scope) ||
    value.worldId !== service.world.id ||
    value.generation !== service.generation ||
    value.receipt.actorId !== actorId
  )
    throw new HistoryCursorError('Recent observation reference expired. Refresh the reader.');
  return value.receipt;
}

/** Deliberate inspection of recent received evidence, separate from lasting memories.
 * No AI, reinforcement, canonical identity lookup or raw world-event fallback. */
export async function recentHistory(
  service: WorldService,
  actorId: string,
  scope: RequestScope,
  request: { cursor?: string; query?: string },
): Promise<MemoryHistoryPage> {
  const permitted = () =>
    service.mayInspectPrivate(actorId, scope) &&
    !!entityGet(service.world.entities, actorId)?.actor;
  if (!permitted()) throw new AuthorityError('forbidden');
  await service.flushMemorySources(actorId);
  const records = service.store.records,
    memories = service.store.memories;
  if (!records || !memories) throw new Error('Recent observations require the history database.');
  const head = await records.head();
  if (!head) throw new Error('Recent observations are unavailable.');
  const context = captureTemporalHistoryReadContext(service.world, actorId);
  const worldId = context.worldId,
    forgotten = service.world.experience?.forgotten[actorId],
    corrections = service.world.experience?.corrections?.[actorId],
    generation = service.generation,
    historyEpoch = service.historyEpoch;
  const query = request.query?.trim().toLocaleLowerCase() ?? '';
  const fence = digest([scopeKey(scope), head.generation, actorId, 'recent-observations', query]);
  let before: { at: number; epoch: string; ordinal: number; order: number } | undefined;
  if (request.cursor) {
    try {
      const cursor = cursorSchema.parse(openCursor(request.cursor));
      if (cursor.fence !== fence) throw Error();
      before = cursor;
    } catch {
      throw new HistoryCursorError('Recent observations changed. Browse again.');
    }
  }
  if (!permitted()) throw new AuthorityError('forbidden');
  const selected = await memories.temporalHistory(
    { worldId, actorId, generation: head.generation },
    { before, limit: 128, bytes: 8192 },
    context,
  );
  const rows = selected.entries
    .filter(({ receipt }) => receipt.change !== 'receiver-frame')
    .map((entry) => ({
      entry,
      text: receivedText(entry.values),
    }));
  const matching = rows.filter((row) => !query || row.text.toLocaleLowerCase().includes(query));
  const page = matching.slice(-20),
    oldest =
      matching.length > 20
        ? page[0]?.entry.receipt
        : (selected.nextBefore ?? rows[0]?.entry.receipt);
  const more = matching.length > 20 || selected.hasMore;
  const receiptsCurrent = await memories.temporalSelectionsCurrent(
    { worldId, actorId, generation: head.generation },
    page.map((row) => row.entry),
    () => temporalHistoryWindow(service.world),
  );
  if (
    !receiptsCurrent ||
    !permitted() ||
    generation !== service.generation ||
    historyEpoch !== service.historyEpoch ||
    forgotten !== service.world.experience?.forgotten[actorId] ||
    corrections !== service.world.experience?.corrections?.[actorId]
  )
    throw new HistoryCursorError('Recent observations changed. Browse again.');
  return {
    ok: true,
    worldId,
    generation,
    entries: page.map(({ entry: { receipt }, text }) => ({
      id: permittedSourceHandle({ id: worldId }, actorId, [
        'receipt',
        receipt.physicalLife,
        receipt.epoch,
        receipt.ordinal,
      ]),
      sourceKind: 'observation',
      fidelity: 'exact',
      time: receipt.at,
      editReference: sealCursor({
        purpose: 'recent-observation-edit',
        scope: scopeKey(scope),
        worldId,
        generation,
        receipt: {
          actorId,
          physicalLife: receipt.physicalLife,
          epoch: receipt.epoch,
          ordinal: receipt.ordinal,
        },
      }),
      text: `${receipt.change === 'loss' ? 'Lost contact; last received' : receipt.change === 'attention-exit' ? 'Last noted' : 'Received'}: ${text}`,
    })),
    next:
      more && oldest
        ? sealCursor({
            fence,
            at: oldest.at,
            epoch: oldest.epoch,
            ordinal: oldest.ordinal,
            order: oldest.order,
          })
        : null,
    scanLimited: selected.incomplete,
  };
}
