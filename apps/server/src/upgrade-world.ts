import {
  BASE_ITEM_HANDLING,
  definitionPin,
  DEFAULT_STATUS_EFFECT_POLICY,
  DEFAULT_COGNITION_POLICY,
  type WorldState,
} from '@open-legend/domain';

/** Update the saved shape in place; the runtime understands only the current model.
 * docs/save-and-load.md#active-development-policy
 */
export function upgradeWorldState(world: WorldState): void {
  // Correct the retired detector in place; preserve authored bindings and historical evidence.
  // docs/spatial-world.md#physical-contact
  const retired = new Set<string>();
  for (const sense of world.moduleManifest?.senses ?? []) {
    if ((sense.implementation as string) !== 'contact-proximity-v1') continue;
    retired.add(sense.id);
    sense.implementation = 'body-contact-v1';
    sense.radius = 0;
  }
  if (retired.size) {
    world.moduleManifest!.revision++;
    world.moduleManifest!.sensePins = world.moduleManifest!.senses.map(definitionPin);
    for (const entity of Object.values(world.entities)) {
      if (!entity.actor?.contacts) continue;
      for (const [id, contact] of Object.entries(entity.actor.contacts))
        if (retired.has(contact.senseId)) delete entity.actor.contacts[id];
    }
  }

  // Earlier pending requests had no explicit target/mode scope. Preserve the request;
  // a stored alternative retains its mode, otherwise queueing grants no replace authority.
  for (const entity of Object.values(world.entities ?? {})) {
    const attempts = entity.actor?.agency?.attempts;
    if (!Array.isArray(attempts)) continue;
    for (const attempt of attempts) {
      if (!attempt || typeof attempt !== 'object') continue;
      if (!Object.hasOwn(attempt, 'targetEntityId')) attempt.targetEntityId = null;
      if (!Object.hasOwn(attempt, 'mode')) attempt.mode = attempt.alternative?.mode ?? 'enqueue';
    }
  }

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
