import { MemoryIndex } from './memory-index.js';
import { nativeRecordActor } from './native-publication-actors.js';
import { NativeMaintenanceRead } from './native-maintenance-read.js';
import {
  attachNativeConsumer,
  createNativeConsumerScope,
  decodeNativeProduct,
} from './native-consumer.js';
import { dispatchEmbedding } from './embedding-dispatch.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeNpcMaintenancePorts } from './native-npc-director.js';
import type { MaintenanceAdmission } from './maintenance-host.js';

/** Indexing reads genuine scoped SQL/pending personal accounts. The exact
 * source fence and final SQL eligibility guard privacy; the body-free native
 * publication fence binds the active world without requiring a perceiving body. */
export function nativeMemoryIndex(
  service: NativeWorldService,
  ports: Pick<NativeNpcMaintenancePorts, 'embeddings' | 'log' | 'execution'>,
  now = Date.now,
): MemoryIndex {
  const isNpc = (actorId: string) => service.npcActor(actorId)?.controller === 'npc';
  const fundedSet = (values: readonly string[], source: object) => {
    const storage = service.world.reserveConsumerBytes(256 + values.length * 512);
    let result: Set<string>;
    try {
      result = new Set(values);
    } catch (error) {
      storage.release();
      throw error;
    }
    return attachNativeConsumer(result, storage, source);
  };
  let roster:
    | {
        generation: string;
        minds: ReadonlySet<string>;
        npcs: ReadonlySet<string>;
        ids: readonly string[];
      }
    | undefined;
  let rosterDirty = true;
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
      subscribe(changed) {
        const publication = service.onPublication(({ records }) => {
          if (!roster || rosterDirty) return;
          if (
            records.writes['mind_state']?.some((row) => row.create) ||
            records.deletes['mind_state']?.length
          ) {
            rosterDirty = true;
            return;
          }
          for (const row of records.writes['sim_actors'] ?? []) {
            const actor = nativeRecordActor('sim_actors', row.id);
            if (actor && roster.minds.has(actor) && roster.npcs.has(actor) !== isNpc(actor)) {
              rosterDirty = true;
              return;
            }
          }
          for (const table of ['sim_actors', 'sim_entities']) {
            if (
              records.deletes[table]?.some((id) => {
                const actor = nativeRecordActor(table, id);
                return actor !== undefined && roster!.npcs.has(actor);
              })
            ) {
              rosterDirty = true;
              return;
            }
          }
        });
        const change = service.subscribe(changed);
        return () => {
          publication();
          change();
          roster = undefined;
        };
      },
      async actorIds() {
        return service.publishRecall(async () => {
          if (roster && !rosterDirty && roster.generation === service.generation) return roster.ids;
          const population = decodeNativeProduct<{ thought: readonly string[] }>(
            await service.world.maintenancePopulation(),
          );
          let count = 0;
          for (const id of population.thought) if (isNpc(id)) count++;
          const idsStorage = service.world.reserveConsumerBytes(256 + count * 64);
          let selected: string[];
          try {
            selected = population.thought.filter(isNpc).sort();
          } catch (error) {
            idsStorage.release();
            throw error;
          }
          // pendingActors retains a registration cursor by this array's actual
          // identity. Ordinary mind/body updates must not restart its first64.
          const reuseIds =
            roster?.generation === service.generation &&
            selected.length === roster.ids.length &&
            selected.every((id, index) => id === roster!.ids[index]);
          const ids = reuseIds
            ? roster!.ids
            : attachNativeConsumer(selected, idsStorage, population);
          if (reuseIds) idsStorage.release();
          const minds = fundedSet(population.thought, population);
          const npcs = fundedSet(ids, ids);
          const rosterStorage = service.world.reserveConsumerBytes(256 + 4 * 512);
          roster = attachNativeConsumer(
            {
              generation: service.generation,
              minds,
              npcs,
              ids,
            },
            rosterStorage,
          );
          rosterDirty = false;
          return ids;
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
        const outputOwner = createNativeConsumerScope();
        return {
          current,
          async embed(request, sourcesCurrent, lease) {
            if (!lease) throw new Error('Native memory indexing has no admitted execution lease.');
            return outputOwner.run(() =>
              dispatchEmbedding({
                service,
                embeddings: ports.embeddings,
                request,
                lease,
                current: () => sourcesCurrent.validate(),
                now,
                assertCurrent() {
                  if (service.paused || !current() || !sourcesCurrent.current())
                    throw new Error('Personal indexing source was revoked.');
                },
                publication: (start) =>
                  service.publishRecall(async () => {
                    if (!(await sourcesCurrent.validate()))
                      throw new Error('Indexed personal sources changed before dispatch.');
                    const publication = await read.publication(service.world, admission);
                    try {
                      if (!isNpc(actorId) || !publication?.isCurrent() || !sourcesCurrent.current())
                        throw new Error('Personal indexing source was revoked.');
                      return { result: start() };
                    } finally {
                      publication?.release();
                    }
                  }),
              }),
            );
          },
          release() {
            outputOwner.dispose();
            read.release();
          },
        };
      },
      read: (actorId, work) => service.withActorMemoryRead(actorId, work),
      publishRecall: (work) => service.publishRecall(work),
    },
    ports.log,
    ports.execution,
  );
}
