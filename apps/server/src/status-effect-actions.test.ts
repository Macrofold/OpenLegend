import { setSpatialPosition, worldSupport } from '@open-legend/domain';
import { worldPosition } from '@open-legend/domain';
import { describe, expect, it } from 'vitest';
import { createWorld, executeCommand, type WorldState } from '@open-legend/domain';
import { statusEffectActions } from './status-effect-actions.js';

// No providers: exercise authored configuration through real discovery and command admission.
function sleepingTarget() {
  let world = structuredClone(createWorld());
  world.paused = false;
  const source = Object.values(world.entities).find((e) => e.actor?.controller === 'player')!;
  const target = Object.values(world.entities).find((e) => e.actor?.controller === 'npc')!;
  setSpatialPosition(
    world,
    target,
    { ...worldPosition(source), x: worldPosition(source).x + 0.5 },
    worldSupport(target),
  );
  target.spatial = structuredClone(source.spatial);
  target.actor!.energy = 40;
  const definition = world.statusEffectPolicy.definitions.find((d) => d.actions)!;
  const result = executeCommand(world, {
    id: 'fixture-sleep',
    actorId: target.id,
    type: 'status-effect',
    definitionId: definition.id,
    targetId: target.id,
    operation: 'activate',
  });
  expect(result.outcome.ok).toBe(true);
  world = result.world;
  const wake = (state: WorldState) =>
    executeCommand(state, {
      id: 'fixture-wake',
      actorId: source.id,
      type: 'status-effect',
      definitionId: definition.id,
      targetId: target.id,
      operation: 'deactivate',
    });
  return { world, source, target, definition, wake };
}

describe('authored status actions', () => {
  it('discovers and executes waking another nearby sleeping entity', () => {
    const { world, source, target, definition, wake } = sleepingTarget();
    expect(statusEffectActions(world, source, target).map((a) => a.label)).toContain(
      `Wake Up · ${target.name}`,
    );
    const result = wake(world);
    expect(result.outcome.ok).toBe(true);
    expect(result.world.entities[target.id]!.statusEffects?.[definition.id]?.active).toBe(false);
    expect(result.events.some((event) => event.text === `${target.name} woke up.`)).toBe(true);
  });

  it('rejects distant interaction without waking the target', () => {
    const { world, target, definition, wake } = sleepingTarget();
    const distant = structuredClone(world);
    worldPosition(distant.entities[target.id]!).x += 100;
    expect(wake(distant).outcome.ok).toBe(false);
    expect(distant.entities[target.id]!.statusEffects?.[definition.id]?.active).toBe(true);
  });

  it('takes labels and other-target permission from configuration', () => {
    const { world, source, target, definition, wake } = sleepingTarget();
    const changed = structuredClone(world);
    const actions = changed.statusEffectPolicy.definitions.find(
      (d) => d.id === definition.id,
    )!.actions!;
    actions.deactivate = 'End this state';
    expect(statusEffectActions(changed, source, target)[0]!.label).toBe(
      `End this state · ${target.name}`,
    );
    actions.allowOther = false;
    expect(statusEffectActions(changed, source, target)).toEqual([]);
    expect(wake(changed).outcome.ok).toBe(false);
  });
});
