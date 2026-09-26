import {
  upgradeObjects,
  upgradeAppraisals,
  initializeNativeWork,
  BASE_ITEM_HANDLING,
  BASE_PARTICIPATION_POLICY,
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
  // Actor cognition is change-driven; remove the retired pacing field from saved policies.
  if (world.cognitionPolicy)
    delete (world.cognitionPolicy as typeof world.cognitionPolicy & { cooldownSeconds?: number })
      .cooldownSeconds;
  if (!Object.hasOwn(world, 'itemHandling')) {
    world.itemHandling = structuredClone(BASE_ITEM_HANDLING);
    for (const definition of Object.values(world.itemDefinitions)) definition.portable ??= true;
  }
  for (const entity of Object.values(world.entities)) {
    const action = entity.actor?.action;
    if (action?.type !== 'replenish' || action.resourceDefinition) continue;
    const definition = world.moduleManifest.definitions.find(
      (value) => value.id === action.attributeId,
    );
    if (!definition?.reservoir || definition.version !== action.definitionVersion)
      throw new Error(
        'Cannot bind the saved replenishment definition without changing its meaning.',
      );
    action.resourceDefinition = definitionPin(definition);
  }
  upgradeObjects(world);
  upgradeAppraisals(world);
  world.participationPolicy ??= structuredClone(BASE_PARTICIPATION_POLICY);
  if (Object.hasOwn(world, 'statusEffectPolicy')) {
    initializeNativeWork(world);
    return;
  }
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
  initializeNativeWork(world);
}
