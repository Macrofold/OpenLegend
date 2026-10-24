import type { ResourceAvailability } from './resource-claims.js';
import { applicableConsumption, bodyPolicy } from './body-policy.js';
import { entityGet } from './entity-collection.js';
import { outcome } from './events.js';
import { selectOwnConsumptionStock } from './stock-transfer.js';
import { definitionPin, attributeDefinition, readAttribute } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import type { Command, Outcome, WorldState } from './types.js';

/** Resolve the selected scope immediately before native Eat, so its ordinary
 * occurrence records the actual consumed lot rather than a hypothetical item. */
export function resolveConsumptionStock(
  world: WorldState,
  command: Command,
  availability?: ResourceAvailability,
): Command | Outcome {
  if (command.type !== 'eat' || !command.sourceId) return command;
  const actor = entityGet(world.entities, command.actorId),
    policy = bodyPolicy(world),
    food = world.itemDefinitions[command.definitionId],
    consumption = actor && applicableConsumption(world, actor);
  if (
    !policy ||
    !policy.consumption?.meal ||
    !sameDefinitionPin(definitionPin(policy), {
      id: command.bodyPolicyId,
      version: command.bodyPolicyVersion,
      digest: command.bodyPolicyDigest,
    }) ||
    !food ||
    !sameDefinitionPin(definitionPin(food), {
      id: command.definitionId,
      version: command.definitionVersion,
      digest: command.definitionDigest,
    })
  )
    return outcome(
      false,
      'meal-definition-changed',
      'The chosen food or consumption policy changed.',
    );
  if (
    !actor?.actor?.alive ||
    !consumption ||
    !(food.nutrition! > 0) ||
    consumption.refusals.some((refusal) => refusal.itemType === food.id)
  )
    return outcome(
      false,
      'not-edible',
      consumption?.unavailableText ?? 'This body cannot eat the chosen food.',
    );
  const meter = attributeDefinition(world, consumption.attributeId),
    value = meter && readAttribute(world, actor, meter);
  if (meter?.schema.kind !== 'number' || typeof value !== 'number')
    return outcome(false, 'not-applicable', 'The consumption meter is unavailable.');
  if (value >= meter.schema.max)
    return outcome(true, 'meal-full', 'Already full; no food was eaten.');
  const stock = selectOwnConsumptionStock(
    world,
    actor.id,
    command.sourceId,
    definitionPin(food),
    1,
    availability,
  );
  if (!stock.itemId)
    return outcome(
      false,
      stock.status,
      stock.status === 'incomplete'
        ? 'The selected stock examination reached its limit before finding an available unit.'
        : 'No available unit of the chosen food remains in the selected own-stock location.',
    );
  const {
    sourceId: _source,
    definitionId: _definition,
    definitionVersion: _version,
    definitionDigest: _digest,
    bodyPolicyId: _policy,
    bodyPolicyVersion: _policyVersion,
    bodyPolicyDigest: _policyDigest,
    ...envelope
  } = command;
  return { ...envelope, itemId: stock.itemId };
}
