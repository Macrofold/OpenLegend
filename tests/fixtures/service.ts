import { definitionPin, validateModuleManifest } from '../../packages/domain/src/world-modules.js';
import type { WorldState } from '../../packages/domain/src/index.js';
import { entityGet, initializePerception, NPC_ID } from '../../packages/domain/src/index.js';
import { routineSensePolicy } from '../../packages/domain/src/perception.js';
import type { WorldService } from '../../apps/server/src/world-service.js';
import {
  cloneValue,
  invalidateInheritedNativeInterval,
  updateWorld,
} from '../../packages/domain/src/draft.js';

/** Simulate explicit control acquisition by this test's authenticated local connection. */
export async function enterLocalWorld(service: WorldService): Promise<void> {
  await service.ready;
  const scope = service.localScope;
  const result = await service.changeEmbodiment(scope, {
    id: `fixture-control-${scope.sessionId}-${scope.controlGeneration}`,
    expectedGeneration: scope.controlGeneration,
    operation: 'replace',
  });
  if (!result.ok) throw new Error(result.message);
}

/** Fixture construction still publishes through the real immutable mutation owner. */
export async function editWorld<T>(
  service: WorldService,
  edit: (world: WorldState) => T,
): Promise<T> {
  let value!: T;
  const result = await service.transition((original) => {
    const world = updateWorld(
      original,
      (draft) => {
        const inherited = draft.nativeInterval;
        // Returned fixture values must outlive the draft, while unchanged history
        // retains its shared immutable values and certified append ancestry.
        value = cloneValue(edit(draft));
        // Authored fixture edits are semantic mutations, including clock edits.
        // A callback's fresh prediction survives; the inherited one does not.
        // docs/simulation-time.md#native-interval-contract
        invalidateInheritedNativeInterval(draft, inherited);
      },
      { retainNativeValues: true },
    );
    return { world, events: [], outcome: { ok: true, code: 'fixture', message: 'Fixture setup' } };
  });
  if (!result.ok) throw new Error(result.message);
  return value;
}

/** A deliberately small native scene for routing/accounting fixtures, not
 * a production sight limit. Expanded-world optional attention has its own
 * coverage; these scenarios retain exact single-request assertions. */
export async function useNearCampSight(service: WorldService): Promise<void> {
  await editWorld(service, (world) => {
    const manifest = world.moduleManifest;
    const senses = manifest.senses.map((sense) =>
      sense.implementation === 'vision-geometry-v1' ? { ...sense, radius: 14 } : sense,
    );
    world.moduleManifest = {
      ...manifest,
      revision: manifest.revision + 1,
      senses,
      sensePins: senses.map(definitionPin),
    };
    validateModuleManifest(world.moduleManifest);
    // A changed detector cannot reuse its former received grants. Complete one
    // actual selected-world opportunity before these fixtures address a body.
    world.simTime +=
      routineSensePolicy(world, entityGet(world.entities, NPC_ID)!).sight?.seconds ?? 0;
    initializePerception(world, []);
  });
}
