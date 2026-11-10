import type { NativeWorld, NativeWorldActivityLearningBatch } from '@open-legend/native-simulation';
import type {
  MaintenanceHost,
  MaintenanceAdmission,
  MaintenanceLearningBatch,
} from './maintenance-host.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeMaintenanceRead } from './native-maintenance-read.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import type { NativeHistoryReadContext } from './native-providers.js';
import { answerNativeProvider } from './native-providers.js';
import {
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeSources,
} from './native-consumer.js';

const origins = new WeakMap<MaintenanceLearningBatch, NativeWorldActivityLearningBatch>();

/** The shared maintenance scheduler receives its existing finite batch shape;
 * only this module keeps the genuine native preparation behind that object. */
export async function prepareNativeActivityLearning(
  world: NativeWorld,
  actorId: string,
  geometry: NativeGeometryProviders,
  history: NativeHistoryReadContext,
): Promise<MaintenanceLearningBatch> {
  const native = await world.prepareActivityLearning(Buffer.from(JSON.stringify({ actorId })));
  try {
    let turn = await world.stepActivityLearning(native);
    while (turn.kind === 'provider') {
      if (!turn.provider) throw new Error('Native learning has no provider question.');
      const answer = await answerNativeProvider(turn.provider, geometry, history);
      try {
        turn = await world.answerActivityLearning(native, turn.provider, Buffer.from(answer.json));
      } finally {
        releaseNativeProduct(answer);
      }
    }
    if (turn.kind !== 'complete')
      throw new Error('Native learning did not complete its preparation.');
    const batch = decodeNativeProduct<MaintenanceLearningBatch>(await native.packet());
    origins.set(batch, native);
    return batch;
  } catch (error) {
    native.release();
    throw error;
  }
}

export function nativeActivityLearning(
  service: NativeWorldService,
  admissionRead: (admission: MaintenanceAdmission) => NativeMaintenanceRead,
): Pick<
  MaintenanceHost,
  'prepareActivityLearning' | 'acquiredActivitySignatures' | 'publishActivityLearning'
> {
  return {
    prepareActivityLearning: (actorId) => service.prepareActivityLearning(actorId),
    acquiredActivitySignatures: (actorId) =>
      service.publishRecall(async () => {
        const product = decodeNativeProduct<readonly string[]>(
          await service.world.acquiredActivitySignatures(Buffer.from(JSON.stringify({ actorId }))),
        );
        return retainNativeSources(new Set(product), product);
      }),
    async publishActivityLearning(batch, judgments, validateOnly, admission, signal) {
      const native = origins.get(batch);
      if (!native) throw new Error('Learning publication requires its originating native batch.');
      const read = admission ? admissionRead(admission) : undefined;
      const result = await service.publishMaintenance(
        'activity-learning',
        batch.actorId,
        async () => {
          signal.throwIfAborted();
          if (admission && (!read?.current(admission) || service.paused))
            throw new Error('Maintenance admission changed before learning publication.');
          return service.world.beginActivityLearningPublication(
            native,
            Buffer.from(
              JSON.stringify({
                judgments,
                dispatched: validateOnly,
                ...(admission
                  ? {
                      admission: {
                        purpose: admission.purpose,
                        requiresBody: admission.requiresBody,
                        ...(admission.dreamEpisode ? { dreamEpisode: admission.dreamEpisode } : {}),
                      },
                    }
                  : {}),
              }),
            ),
            read?.native,
          );
        },
        signal,
      );
      return result.ok;
    },
  };
}
