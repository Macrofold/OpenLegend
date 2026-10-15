import { definitionPin, validateModuleManifest } from '../../packages/domain/src/world-modules.js';
import type { WorldState } from '../../packages/domain/src/index.js';
import type { WorldService } from '../../apps/server/src/world-service.js';

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
    const world = structuredClone(original);
    value = edit(world);
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
  });
}
