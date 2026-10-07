import { currentPlaceObservation } from '@open-legend/domain';
import type {
  KnownPlaceView,
  KnownPlacesPage,
  KnownPlaceInspection,
  ApiResult,
} from '@open-legend/protocol';
import { z } from 'zod';
import { scopeKey, type RequestScope } from './authority.js';
import { HistoryCursorError } from './history-cursor-error.js';
import { ACTION_DESCRIPTIONS } from './action-descriptions.js';
import { searchTerms, SEARCH_SCAN_ROWS } from './text-search.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';
import type { KnownPlaceSource } from './memory-repository.js';

export const knownPlaceReference = z
  .object({
    id: z.string().min(1).max(180),
    sourceId: z.string().min(1).max(180),
    revision: z.string().length(64),
  })
  .strict();
type Reference = z.infer<typeof knownPlaceReference>;
const pageCursor = z.object({ fence: z.string(), after: z.string() }).strict();
const unavailable =
  'This remembered destination cannot be used now. Refresh Known places or inspect it again when you can.';

function placeView(entry: KnownPlaceSource): KnownPlaceView | undefined {
  const exposure = entry.awareness?.exposure;
  if (exposure?.kind !== 'place') return;
  return {
    id: exposure.id,
    sourceId: entry.memory.id,
    revision: entry.revision,
    label: exposure.label,
    description: entry.correctionId
      ? entry.correction
        ? `Corrected observation: ${entry.correction}`
        : 'This observation was corrected. Its original description is no longer established information.'
      : entry.memory.summary,
    locationLabel: exposure.locationLabel,
    position: { ...exposure.point },
    time: entry.memory.at,
    corrected: !!entry.correctionId,
  };
}

async function prepare(service: WorldService, actorId: string) {
  await service.flushMemorySources(actorId);
  const repository = service.store.memories,
    head = await service.store.records?.head();
  if (!repository || !head) throw new Error('Known places require the memory repository.');
  return {
    repository,
    actorRevision: repository.actorRevision(actorId),
    world: service.world,
    generation: service.generation,
    scope: { worldId: service.world.id, actorId, generation: head.generation },
  };
}
function assertUnchanged(
  service: WorldService,
  prepared: Awaited<ReturnType<typeof prepare>>,
  actorId: string,
) {
  if (
    prepared.actorRevision !== prepared.repository.actorRevision(actorId) ||
    prepared.generation !== service.generation ||
    prepared.world.id !== service.world.id ||
    prepared.world.experience?.forgotten[actorId] !==
      service.world.experience?.forgotten[actorId] ||
    prepared.world.experience?.corrections?.[actorId] !==
      service.world.experience?.corrections?.[actorId]
  )
    throw new HistoryCursorError('Remembered places changed. Refresh Known places.');
}

/** Only retained character evidence enters this list. No join to current place bodies. */
export async function knownPlaces(
  service: WorldService,
  scope: RequestScope,
  request: { query?: string; cursor?: string },
): Promise<KnownPlacesPage> {
  service.assertScope(scope);
  const terms = searchTerms(request.query),
    prepared = await prepare(service, scope.actorId);
  const fence = digest([
    scopeKey(scope),
    prepared.scope.generation,
    terms ?? [],
    service.historyEpoch,
  ]);
  let after: string | undefined;
  if (request.cursor) {
    let cursor: z.infer<typeof pageCursor>;
    try {
      cursor = pageCursor.parse(JSON.parse(Buffer.from(request.cursor, 'base64url').toString()));
    } catch {
      throw new HistoryCursorError('This place page expired. Search or browse again.');
    }
    if (cursor.fence !== fence)
      throw new HistoryCursorError('Remembered places changed. Refresh Known places.');
    after = cursor.after;
  }
  const result = await prepared.repository.knownPlaces(prepared.scope, {
    after,
    terms,
    limit: 20,
    scan: SEARCH_SCAN_ROWS,
  });
  service.assertScope(scope);
  assertUnchanged(service, prepared, scope.actorId);
  return {
    ok: true,
    worldId: prepared.world.id,
    generation: prepared.generation,
    entries: result.entries.flatMap((entry) => {
      const place = placeView(entry);
      return place ? [place] : [];
    }),
    next: result.after
      ? Buffer.from(JSON.stringify({ fence, after: result.after })).toString('base64url')
      : null,
    scanLimited: result.scanLimited,
  };
}

async function selectedPlace(service: WorldService, actorId: string, reference: Reference) {
  const prepared = await prepare(service, actorId);
  const result = await prepared.repository.knownPlaces(prepared.scope, {
    placeId: reference.id,
    limit: 1,
    scan: 1,
  });
  assertUnchanged(service, prepared, actorId);
  const entry = result.entries[0],
    place = entry && placeView(entry);
  if (
    !entry ||
    !place ||
    place.sourceId !== reference.sourceId ||
    place.revision !== reference.revision
  )
    throw new HistoryCursorError(
      'This place observation changed or was forgotten. Refresh Known places.',
    );
  return { entry, place };
}

/** Called under the existing command mutation owner, after authorization and retry lookup. */
export async function resolveKnownPlaceMove(
  service: WorldService,
  actorId: string,
  reference: Reference,
): Promise<{ position: import('@open-legend/spatial').SurfacePoint } | ApiResult> {
  const { entry, place } = await selectedPlace(service, actorId, reference);
  const exposure = entry.awareness?.exposure;
  if (
    exposure?.kind !== 'place' ||
    place.corrected ||
    !currentPlaceObservation(service.world, exposure)
  )
    return { ok: false, code: 'stale-place', message: unavailable };
  return { position: { ...exposure.point } };
}

export async function inspectKnownPlace(
  service: WorldService,
  scope: RequestScope,
  reference: Reference,
): Promise<KnownPlaceInspection> {
  service.assertScope(scope);
  const { entry, place } = await selectedPlace(service, scope.actorId, reference);
  service.assertScope(scope);
  const exposure = entry.awareness?.exposure;
  const valid =
    exposure?.kind === 'place' &&
    !place.corrected &&
    currentPlaceObservation(service.world, exposure);
  const preview = valid
    ? service.previewCommand({ type: 'move', position: place.position }, scope.actorId)
    : { ok: false, message: unavailable };
  return {
    ok: true,
    place,
    moveDescription: ACTION_DESCRIPTIONS.move,
    move: {
      id: 'move-to-known-place',
      label: 'Move to last-known location',
      command: { type: 'move', knownPlace: reference },
      enabled: preview.ok,
      ...(preview.ok ? {} : { reason: preview.message }),
    },
  };
}
