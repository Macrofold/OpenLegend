import { MemoryIndex } from './memory-index.js';
import { NativeMaintenanceRead } from './native-maintenance-read.js';
import { decodeNativeProduct, retainNativeSources } from './native-consumer.js';
import { dispatchEmbedding } from './embedding-dispatch.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeNpcMaintenancePorts } from './native-npc-director.js';
import type { MaintenanceAdmission } from './maintenance-host.js';

/** Indexing reads genuine scoped SQL/pending personal accounts. The native
 * personal owner guards disclosure without requiring a live/perceiving body. */
export function nativeMemoryIndex(
  service: NativeWorldService,
  ports: Pick<NativeNpcMaintenancePorts, 'embeddings' | 'log' | 'execution'>,
  now = Date.now,
): MemoryIndex {
  const isNpc = (actorId: string) => service.npcActor(actorId)?.controller === 'npc';
  return new MemoryIndex(
    {
      get config() {
        return service.config;
      },
      store: service.store,
      get generation() {
        return service.generation;
      },
      get paused() {
        return service.paused;
      },
      subscribe: (changed) => service.subscribe(changed),
      async actorIds() {
        return service.publishRecall(async () => {
          const population = decodeNativeProduct<{ thought: readonly string[] }>(
            await service.world.maintenancePopulation(),
          );
          return retainNativeSources(population.thought.filter(isNpc), population);
        });
      },
      isNpc,
      async admission(actorId) {
        if (!isNpc(actorId)) return undefined;
        const read = await service.publishRecall(() =>
          NativeMaintenanceRead.capture(service.world, actorId),
        );
        const admission: MaintenanceAdmission = {
          actorId,
          generation: read.facts.generation,
          purpose: 'maintenance',
          requiresBody: false,
          fence: read.facts.bodyFence,
        };
        const current = () =>
          service.generation === admission.generation && isNpc(actorId) && read.current(admission);
        return {
          current,
          async embed(request, sourcesCurrent, lease) {
            if (!lease) throw new Error('Native memory indexing has no admitted execution lease.');
            return dispatchEmbedding({
              service,
              embeddings: ports.embeddings,
              request,
              lease,
              current: sourcesCurrent,
              now,
              assertCurrent() {
                if (service.paused || !current())
                  throw new Error('Personal indexing source was revoked.');
              },
              publication: (start) =>
                service.publishRecall(async () => {
                  if (!(await sourcesCurrent()))
                    throw new Error('Indexed personal sources changed before dispatch.');
                  const publication = await read.publication(service.world, admission);
                  try {
                    if (!isNpc(actorId) || !publication?.isCurrent())
                      throw new Error('Personal indexing source was revoked.');
                    return { result: start() };
                  } finally {
                    publication?.release();
                  }
                }),
            });
          },
          release: () => read.release(),
        };
      },
      read: (actorId, work) => service.withActorMemoryRead(actorId, work),
      publishRecall: (work) => service.publishRecall(work),
    },
    ports.log,
    ports.execution,
  );
}
