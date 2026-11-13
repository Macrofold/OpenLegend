import { knowledgeDocument } from '@open-legend/domain';
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
import type { KnownPlaceSource, MemoryRepository } from './memory-repository.js';

export const knownPlaceReference = z
  .object({
    id: z.string().min(1).max(180),
    sourceId: z.string().min(1).max(180),
    revision: z.string().length(64),
  })
  .strict();
export type KnownPlaceReference = z.infer<typeof knownPlaceReference>;
type Reference = KnownPlaceReference;
const pageCursor = z.object({ fence: z.string(), after: z.string() }).strict();
export const knownPlaceUnavailable =
  'This remembered destination cannot be used now. Refresh Known places or inspect it again when you can.';

export function knownPlaceView(entry: KnownPlaceSource): KnownPlaceView {
  const { exposure, capsule } = entry.place;
  return {
    id: exposure.id,
    sourceId: entry.memory.id,
    revision: entry.revision,
    label: exposure.label,
    description: entry.correctionId
      ? entry.correction
        ? `Corrected observation: ${entry.correction}`
        : 'This observation was corrected. Its original description is no longer established information.'
      : exposure.description,
    locationLabel: exposure.locationLabel,
    position: { ...exposure.point },
    time: capsule.observedAt,
    corrected: !!entry.correctionId,
  };
}

/** Both authorities use the same private page grammar and cursor policy. */
export function knownPlacesQuery(
  scope: RequestScope,
  generation: string,
  historyEpoch: string,
  request: { query?: string; cursor?: string },
) {
  const terms = searchTerms(request.query);
  const fence = digest([scopeKey(scope), generation, terms ?? [], historyEpoch]);
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
  return { fence, options: { after, terms, limit: 20, scan: SEARCH_SCAN_ROWS } };
}

export function projectKnownPlacesPage(
  worldId: string,
  generation: string,
  selected: Awaited<ReturnType<MemoryRepository['knownPlaces']>>,
  fence: string,
  note: (id: string, index: number) => { readonly text: string; readonly revision: number },
): KnownPlacesPage {
  return {
    ok: true,
    worldId,
    generation,
    entries: selected.entries.map((entry, index) => {
      const place = knownPlaceView(entry);
      return { ...place, note: note(place.id, index) };
    }),
    next: selected.after
      ? Buffer.from(JSON.stringify({ fence, after: selected.after })).toString('base64url')
      : null,
    scanLimited: selected.scanLimited,
  };
}

export function requireKnownPlace(entry: KnownPlaceSource | undefined, reference: Reference) {
  const place = entry && knownPlaceView(entry);
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

export function projectKnownPlaceInspection(
  place: KnownPlaceView,
  reference: Reference,
  preview: { ok: boolean; message: string },
): KnownPlaceInspection {
  return {
    ok: true,
    place,
    moveDescription: ACTION_DESCRIPTIONS.move!,
    move: {
      id: 'move-to-known-place',
      label: 'Move to last-known location',
      command: { type: 'move', knownPlace: reference },
      enabled: preview.ok,
      ...(preview.ok ? {} : { reason: preview.message }),
    },
  };
}

async function prepare(service: WorldService, actorId: string) {
  await service.ready;
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
  const prepared = await prepare(service, scope.actorId);
  const { fence, options } = knownPlacesQuery(
    scope,
    prepared.scope.generation,
    service.historyEpoch,
    request,
  );
  const result = await prepared.repository.knownPlaces(prepared.scope, options);
  service.assertScope(scope);
  assertUnchanged(service, prepared, scope.actorId);
  return projectKnownPlacesPage(
    prepared.world.id,
    prepared.generation,
    result,
    fence,
    (placeId) => {
      const note = knowledgeDocument(prepared.world, scope.actorId, { kind: 'place', placeId });
      return { text: note?.text ?? '', revision: note?.revision ?? 0 };
    },
  );
}

export async function selectedPlace(service: WorldService, actorId: string, reference: Reference) {
  const prepared = await prepare(service, actorId);
  const result = await prepared.repository.knownPlaces(prepared.scope, {
    placeId: reference.id,
    limit: 1,
    scan: 1,
  });
  assertUnchanged(service, prepared, actorId);
  return requireKnownPlace(result.entries[0], reference);
}

/** Prepare outside mutation; native admission rechecks current permissions before effects. */
export async function resolveKnownPlaceMove(
  service: WorldService,
  actorId: string,
  reference: Reference,
): Promise<{ position: import('@open-legend/spatial').SurfacePoint } | ApiResult> {
  const { entry, place } = await selectedPlace(service, actorId, reference);
  const exposure = entry.place.exposure;
  if (
    exposure?.kind !== 'place' ||
    place.corrected ||
    !currentPlaceObservation(service.world, exposure)
  )
    return { ok: false, code: 'stale-place', message: knownPlaceUnavailable };
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
  const exposure = entry.place.exposure;
  const valid =
    exposure?.kind === 'place' &&
    !place.corrected &&
    currentPlaceObservation(service.world, exposure);
  const preview = valid
    ? service.previewCommand({ type: 'move', position: place.position }, scope)
    : { ok: false, message: knownPlaceUnavailable };
  return projectKnownPlaceInspection(place, reference, preview);
}
