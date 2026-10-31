import { entityGet } from './entity-collection.js';
import { sameDefinitionPin } from './definition-pins.js';
import {
  attributeDefinition,
  definitionPin,
  readAttribute,
  type DefinitionPin,
} from './world-modules.js';
import type { WorldState } from './types.js';
import type { StatusRateInterval } from './status-effects.js';

/** Trusted transient experimental control, outside saved fictional state. Exact
 * body life/definition bindings prevent a hold from following a replacement. */
export interface NativeValueHold {
  entityId: string;
  definition: DefinitionPin;
  physicalLife: number;
  value: number;
}
export type NativeValueHoldContext = ReadonlyMap<string, NativeValueHold>;
const key = (entityId: string, definitionId: string) => JSON.stringify([entityId, definitionId]);
export function nativeValueHoldSupported(
  world: WorldState,
  entityId: string,
  attributeId: string,
): boolean {
  const entity = entityGet(world.entities, entityId),
    definition = attributeDefinition(world, attributeId);
  return (
    !!entity?.actor?.alive &&
    !!definition &&
    definition.implementation === 'number-v1' &&
    definition.schema.kind === 'number' &&
    !definition.reservoir &&
    typeof readAttribute(world, entity, definition) === 'number'
  );
}
export function nativeValueHoldCurrent(world: WorldState, hold: NativeValueHold): boolean {
  const entity = entityGet(world.entities, hold.entityId),
    definition = attributeDefinition(world, hold.definition.id);
  return (
    !!entity?.actor &&
    nativeValueHoldSupported(world, hold.entityId, hold.definition.id) &&
    (entity.actor.physicalLife ?? 0) === hold.physicalLife &&
    !!definition &&
    sameDefinitionPin(definitionPin(definition), hold.definition)
  );
}
/** Admission validates the applied native value, not an arbitrary JSON path or a
 * promise to repair it later. Restore validates against its candidate before install. */
export function validateNativeValueHolds(
  world: WorldState,
  holds: readonly NativeValueHold[],
): readonly NativeValueHold[] {
  const seen = new Set<string>();
  for (const hold of holds) {
    if (
      !hold ||
      !hold.definition ||
      !Number.isFinite(hold.value) ||
      !Number.isSafeInteger(hold.physicalLife) ||
      hold.physicalLife < 0 ||
      !nativeValueHoldCurrent(world, hold)
    )
      throw new Error('This native field has no compatible value-hold capability.');
    const identity = key(hold.entityId, hold.definition.id);
    if (seen.has(identity)) throw new Error('A native field can have only one active hold.');
    seen.add(identity);
    const entity = entityGet(world.entities, hold.entityId)!,
      definition = attributeDefinition(world, hold.definition.id)!;
    if (readAttribute(world, entity, definition) !== hold.value)
      throw new Error('Apply the selected native value before holding it.');
  }
  return holds;
}
export function prepareNativeValueHolds(
  world: WorldState,
  holds?: readonly NativeValueHold[],
): NativeValueHoldContext | undefined {
  if (!holds?.length) return undefined;
  return new Map(
    holds
      .filter((hold) => nativeValueHoldCurrent(world, hold))
      .map((hold) => [key(hold.entityId, hold.definition.id), hold]),
  );
}
export function heldNativeValue(
  context: NativeValueHoldContext | undefined,
  entityId: string,
  definitionId: string,
): number | undefined {
  return context?.get(key(entityId, definitionId))?.value;
}
/** Remove selected writes before interval/threshold preparation, so held drift
 * creates neither false depletion nor repeated predictions of an impossible crossing. */
export function heldStatusRates(
  intervals: StatusRateInterval[],
  context?: NativeValueHoldContext,
): StatusRateInterval[] {
  if (!context?.size) return intervals;
  return intervals.map((interval) => ({
    ...interval,
    rates: interval.rates.filter(
      (rate) => heldNativeValue(context, rate.targetId, rate.attribute) === undefined,
    ),
    periodic: interval.periodic.filter(
      (change) => heldNativeValue(context, change.targetId, change.attribute) === undefined,
    ),
  }));
}
