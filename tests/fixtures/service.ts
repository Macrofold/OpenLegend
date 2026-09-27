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
