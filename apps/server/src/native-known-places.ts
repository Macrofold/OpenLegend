import type { EncounterExposure } from '@open-legend/domain';
import type { NativeWorld } from '@open-legend/native-simulation';
import type { SurfacePoint } from '@open-legend/spatial';
import type { RequestScope } from './authority.js';
import { HistoryCursorError } from './history-cursor-error.js';
import {
  knownPlacesQuery,
  knownPlaceUnavailable,
  projectKnownPlaceInspection,
  projectKnownPlacesPage,
  requireKnownPlace,
  type KnownPlaceReference,
} from './known-places.js';
import { NativePrivateHistoryCapture } from './native-history-capture.js';
import {
  decodeNativeProduct,
  encodeNativeJson,
  releaseNativeProduct,
  withNativeConsumerScope,
  withNativeJsonInput,
} from './native-consumer.js';
import type { MemoryRepository } from './memory-repository.js';
import type { NativeWorldService } from './native-world-service.js';
import { jsonByteLength, PERSONAL_EVIDENCE_PREPARATION } from '@open-legend/domain';
import { readNativePersonalSourceRows } from './native-npc-sources.js';
import { nativeCurrentRow } from './native-current-sources.js';
import { withNativeSqlPreparation } from './native-source-preparation.js';

type Page = Awaited<ReturnType<MemoryRepository['knownPlaces']>>;
type Options = Parameters<MemoryRepository['knownPlaces']>[1];
type PlaceFact = {
  readonly note: { readonly text: string; readonly revision: number };
  readonly current?: boolean;
};

/** The SQL page owns historical evidence; the native read owns its private
 * life/timeline. Neither is a replacement for the final disclosure lease. */
export class NativeKnownPlaceSelection {
  private selected: Page | undefined;
  private formatting: ReturnType<NativeWorld['reserveConsumerBytes']> | undefined;
  private constructor(
    private readonly service: NativeWorldService,
    private readonly world: NativeWorld,
    readonly scope: RequestScope,
    private readonly capture: NativePrivateHistoryCapture,
    private readonly permitted: () => boolean,
  ) {}

  static async prepare(service: NativeWorldService, world: NativeWorld, scope: RequestScope) {
    return service.publishRecall(async () => {
      service.assertScope(scope);
      const permitted = service.privateReadFence(scope.actorId, () =>
        service.mayInspectPrivate(scope.actorId, scope),
      );
      const capture = await NativePrivateHistoryCapture.capture(world, scope.actorId, 'personal');
      return new NativeKnownPlaceSelection(service, world, scope, capture, permitted);
    });
  }

  assertCurrent(): void {
    if (!this.permitted() || !this.capture.read.isCurrent())
      throw new HistoryCursorError('Remembered places changed. Refresh Known places.');
  }

  /** During native candidate work the lane excludes other world mutations;
   * external privacy admission can still change. Do not read tentative state. */
  sourcesCurrent(): boolean {
    return this.permitted();
  }

  async select(options: Options): Promise<Page> {
    this.assertCurrent();
    if (this.selected) throw new Error('A place reader already owns its selection.');
    this.selected = await withNativeSqlPreparation(this.world, this.service.store.db, () =>
      this.service.withActorMemoryRead(this.scope.actorId, async (cut) => {
        const selected = await this.service.store.memories.knownPlaces(
          {
            worldId: this.service.worldId,
            actorId: this.scope.actorId,
            generation: this.service.generation,
          },
          options,
        );
        this.selected = selected;
        this.formatting = this.world.reserveConsumerBytes(
          16 * jsonByteLength(selected, { cache: false }) + 20 * 512,
        );
        // The selected evidence and its source rows use this original read cut,
        // including pending writes. A later save ACK must not move the boundary.
        const personal = new Map(
          selected.entries.flatMap(({ place }) =>
            place.capsule.personalSource
              ? [
                  [
                    JSON.stringify([
                      place.capsule.personalSource.kind,
                      place.capsule.personalSource.id,
                      place.capsule.personalSource.revision,
                    ]),
                    { reference: place.capsule.personalSource },
                  ] as const,
                ]
              : [],
          ),
        );
        const personalRows = await readNativePersonalSourceRows(
          this.service.store.db,
          {
            origin: this.capture.facts.scope,
            acceptedCut: cut.sequence,
            selection: { receipts: [], personal: [...personal.values()] },
            maximumTransferBytes: PERSONAL_EVIDENCE_PREPARATION.bytes,
          },
          cut,
        );
        const ids = [
          ...new Set(
            selected.entries
              .filter(({ place }) => !place.capsule.personalSource)
              .map(({ memory }) => memory.id),
          ),
        ];
        const supports = ids.length
          ? (
              await this.service.store.db
                .prepare(
                  'SELECT * FROM mind_temporal_supports WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[]) ORDER BY position,id',
                )
                .all(cut.worldId, this.scope.actorId, ids)
            ).map((row) => nativeCurrentRow('mind_temporal_supports', row))
          : [];
        await this.service.publishRecall(async () => {
          this.assertCurrent();
          await withNativeJsonInput(
            this.world,
            {
              places: selected.entries.map(({ place }) => place),
              personalRows,
              supports,
            },
            (bytes) => this.world.historyPlaceSources(this.capture.read, bytes),
          );
        });
        return selected;
      }),
    );
    this.assertCurrent();
    return this.selected;
  }

  async facts(
    entries: readonly { placeId: string; exposure?: EncounterExposure }[],
  ): Promise<readonly PlaceFact[]> {
    this.assertCurrent();
    const facts = decodeNativeProduct<readonly PlaceFact[]>(
      await withNativeJsonInput(
        this.world,
        { accountId: this.scope.accountId, actorId: this.scope.actorId, entries },
        (bytes) => this.world.playerPlaces(bytes),
      ),
    );
    try {
      this.assertCurrent();
      if (facts.length !== entries.length)
        throw new Error('Native place facts lost a selected row.');
      return facts;
    } catch (error) {
      releaseNativeProduct(facts);
      throw error;
    }
  }

  async publish<T>(value: unknown, send: (bytes: Buffer) => T): Promise<T> {
    this.assertCurrent();
    const publication = await this.world.historyPublication(this.capture.read);
    try {
      if (!publication?.isCurrent())
        throw new HistoryCursorError('Remembered places changed. Refresh Known places.');
      this.assertCurrent();
      // Encoding and transport handoff are synchronous inside this current
      // native disclosure lease. No delayed encoder escapes to an HTTP caller.
      return send(encodeNativeJson(this.world, value));
    } finally {
      publication?.release();
    }
  }

  release(): void {
    this.capture.release();
    this.formatting?.release();
    this.formatting = undefined;
    if (this.selected) releaseNativeProduct(this.selected);
    this.selected = undefined;
  }
}

export async function publishNativeKnownPlaces<T>(
  service: NativeWorldService,
  world: NativeWorld,
  scope: RequestScope,
  request: { query?: string; cursor?: string } | { reference: KnownPlaceReference },
  preview: (position: SurfacePoint) => Promise<{ ok: boolean; message: string }>,
  send: (bytes: Buffer) => T,
): Promise<T> {
  return withNativeConsumerScope(async () => {
    const read = await NativeKnownPlaceSelection.prepare(service, world, scope);
    try {
      if ('reference' in request) {
        const selected = await read.select({ placeId: request.reference.id, limit: 1, scan: 1 });
        const { entry, place } = requireKnownPlace(selected.entries[0], request.reference);
        return await service.publishRecall(async () => {
          const facts = await read.facts([{ placeId: place.id, exposure: entry.place.exposure }]);
          try {
            const outcome =
              !place.corrected && facts[0]?.current
                ? await preview(place.position)
                : { ok: false, message: knownPlaceUnavailable };
            return await read.publish(
              projectKnownPlaceInspection(place, request.reference, outcome),
              send,
            );
          } finally {
            releaseNativeProduct(facts);
          }
        });
      }
      const { fence, options } = knownPlacesQuery(
        scope,
        service.generation,
        service.historyEpoch,
        request,
      );
      const selected = await read.select(options);
      return await service.publishRecall(async () => {
        // Browsing historical places never joins current physical availability.
        const facts = await read.facts(
          selected.entries.map((entry) => ({ placeId: entry.place.exposure.id })),
        );
        try {
          return await read.publish(
            projectKnownPlacesPage(
              service.worldId,
              service.generation,
              selected,
              fence,
              (_id, index) => facts[index]!.note,
            ),
            send,
          );
        } finally {
          releaseNativeProduct(facts);
        }
      });
    } finally {
      read.release();
    }
  });
}
