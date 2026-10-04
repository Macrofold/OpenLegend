import { namePhrase } from '@open-legend/language';
import {
  applicableConsumption,
  attributeDefinition,
  bodyPolicy,
  readAttribute,
  type Entity,
  type ItemDefinition,
  type WorldState,
} from '@open-legend/domain';

/** Describe only installed services and the acting body's permitted meter.
 * The command owner still rechecks custody, refusals and current values. */
export function consumptionDescription(
  world: WorldState,
  entity: Entity,
  item?: ItemDefinition,
): string {
  const policy = bodyPolicy(world)?.consumption;
  const consumption = applicableConsumption(world, entity);
  if (!consumption) return policy?.unavailableText ?? 'Consumption is not available for this body.';
  const definition = attributeDefinition(world, consumption.attributeId)!;
  const value = readAttribute(entity.actor!, definition);
  if (definition.schema.kind !== 'number' || typeof value !== 'number')
    return consumption.unavailableText;
  const refusal = item && consumption.refusals.find((entry) => entry.itemType === item.id);
  if (refusal) return refusal.reason;
  const amount = item?.[consumption.quantityProperty];
  return `${consumption.label}.${item ? ` Selected item: ${namePhrase(item, 'definite')}.` : ''} ${typeof amount === 'number' && amount > 0 ? `Restores up to ${amount} ${definition.schema.unit} of ${definition.name}, capped at ${definition.schema.max}. ` : ''}Current ${definition.name}: ${Math.round(value)} ${definition.schema.unit}; range ${definition.schema.min}–${definition.schema.max}.`;
}
