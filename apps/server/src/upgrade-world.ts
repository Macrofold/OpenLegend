import {
  BASE_ITEM_HANDLING,
  DEFAULT_STATUS_EFFECT_POLICY,
  DEFAULT_COGNITION_POLICY,
  type WorldState,
} from '@open-legend/domain';

/** Update the saved shape in place; the runtime understands only the current model.
 * docs/save-and-load.md#active-development-policy
 */
export function upgradeWorldState(world: WorldState): void {
  // Preserve old facts and IDs while ordering raw source arrays for cursor reads.
  // Missing sequence remains unknown (zero); malformed numeric data is left for validation.
  for (const rows of [
    ...Object.values(world.memories ?? {}),
    ...Object.values(world.experience?.awareness ?? {}),
  ]) {
    if (
      Array.isArray(rows) &&
      rows.every(
        (row) => row && Number.isSafeInteger(row.sequence ?? 0) && (row.sequence ?? 0) >= 0,
      ) &&
      rows.some((row, i) => i > 0 && (row.sequence ?? 0) < (rows[i - 1]!.sequence ?? 0))
    )
      rows.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }

  if (!Object.hasOwn(world, 'perceptionFeatures')) world.perceptionFeatures = {};
  // Actor cognition is change-driven; remove the retired pacing field from saved policies.
  if (world.cognitionPolicy)
    delete (world.cognitionPolicy as typeof world.cognitionPolicy & { cooldownSeconds?: number })
      .cooldownSeconds;
  if (!Object.hasOwn(world, 'itemHandling')) {
    world.itemHandling = structuredClone(BASE_ITEM_HANDLING);
    for (const definition of Object.values(world.itemDefinitions)) definition.portable ??= true;
  }
  if (Object.hasOwn(world, 'statusEffectPolicy')) return;
  world.statusEffectPolicy = structuredClone(DEFAULT_STATUS_EFFECT_POLICY);
  delete (world as WorldState & { sleepPolicy?: unknown }).sleepPolicy;
  if (world.cognitionPolicy && !Object.hasOwn(world.cognitionPolicy, 'dream'))
    world.cognitionPolicy.dream = structuredClone(DEFAULT_COGNITION_POLICY.dream);
  for (const entity of Object.values(world.entities)) {
    const actor = entity.actor as
      | (NonNullable<typeof entity.actor> & { rest?: { sleepingSeconds?: number } })
      | undefined;
    if (!actor) continue;
    const action = actor.action;
    if (action && (action.type as string) === 'rest') {
      const definitionId = DEFAULT_COGNITION_POLICY.dream.statusEffectId;
      // Preserve action identity and dream progress without replaying a transition event.
      action.type = 'status-effect';
      action.definitionId = definitionId;
      action.remainingSeconds = action.totalSeconds = 0;
      (entity.statusEffects ??= {})[definitionId] = {
        active: true,
        episode: action.id,
        elapsedSeconds: actor.rest?.sleepingSeconds ?? 0,
        automaticAfter: 0,
        sourceId: entity.id,
        actionTargetId: entity.id,
      };
    }
    delete actor.rest;
  }
}
