import { installedStateQuery } from './queries.js';
import { ResourceReservationError } from './resource-claims.js';
import { recordSemanticChange } from './dependencies.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import {
  attributeDefinition,
  definitionPin,
  HOST_IMPLEMENTATIONS,
  readAttribute,
  setAttribute,
  validateAttributeValue,
  type AttributeDefinition,
  type AttributeValue,
  type DefinitionPin,
} from './world-modules.js';
import { setBodyHealth } from './body-state.js';
import { reconcileBody } from './living.js';
import { setWildernessNeed } from './worlds/base/needs.js';
import type { Entity, WorldEvent, WorldState } from './types.js';

export interface StateAddress {
  entityId: string;
  definition: DefinitionPin;
}
export type StateRead =
  | { status: 'known'; value: AttributeValue; revision: number }
  | { status: 'unknown' | 'uninitialized' | 'not-applicable' | 'unsupported' };
export type StateOperation =
  | { kind: 'replace'; value: AttributeValue }
  | { kind: 'increment'; amount: number };
export type StateWriteResult =
  | { status: 'applied' | 'unchanged'; value: AttributeValue; revision: number }
  | { status: 'stale' | 'invalid' | 'reserved' | 'not-applicable' | 'unsupported' };

export function isDefinitionPin(value: unknown): value is DefinitionPin {
  return (
    hasRecordFields(value, ['id', 'version', 'digest']) &&
    isSafeRecordId(value.id) &&
    Number.isSafeInteger(value.version) &&
    (value.version as number) > 0 &&
    typeof value.digest === 'string' &&
    value.digest.length > 0 &&
    value.digest.length <= 128
  );
}
export function isStateAddress(value: unknown): value is StateAddress {
  return (
    hasRecordFields(value, ['entityId', 'definition']) &&
    isSafeRecordId(value.entityId) &&
    isDefinitionPin(value.definition)
  );
}
export function isStateOperation(value: unknown): value is StateOperation {
  if (!hasRecordFields(value, ['kind'], ['value', 'amount'])) return false;
  if (value.kind === 'replace')
    return (
      hasRecordFields(value, ['kind', 'value']) &&
      (typeof value.value === 'string' ||
        (typeof value.value === 'number' && Number.isFinite(value.value)))
    );
  return (
    value.kind === 'increment' &&
    hasRecordFields(value, ['kind', 'amount']) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount)
  );
}

export function sameDefinitionPin(a: DefinitionPin, b: DefinitionPin): boolean {
  return a.id === b.id && a.version === b.version && a.digest === b.digest;
}

function resolve(world: WorldState, address: StateAddress): AttributeDefinition | undefined {
  const definition = attributeDefinition(world, address.definition.id);
  const pin = world.moduleManifest.pins.find((entry) => entry.id === address.definition.id);
  return definition && pin && sameDefinitionPin(pin, address.definition) ? definition : undefined;
}

export function stateAddress(entityId: string, definition: AttributeDefinition): StateAddress {
  return { entityId, definition: definitionPin(definition) };
}

/** Creator discovery describes implemented ports; it neither initializes values
 * nor grants execution. Workshop candidates still use the existing declaration
 * admission and exact approval/receipt boundary. */
export function stateOwnerCapabilities(world: WorldState) {
  const query = installedStateQuery(world);
  if (query.status !== 'complete') throw new Error('Installed state capabilities are unavailable.');
  return query.values.map((definition) => ({
    definition: definitionPin(definition),
    owner: HOST_IMPLEMENTATIONS[definition.implementation].owner,
    valueKind: definition.schema.kind,
    operations: definition.schema.kind === 'number' ? ['replace', 'increment'] : ['replace'],
    initialization:
      HOST_IMPLEMENTATIONS[definition.implementation].storage === 'attributes'
        ? 'explicit-owner-initialization'
        : 'native-body-applicability',
    disclosure: definition.disclosure,
    ...(definition.reservoir
      ? {
          resource: {
            precision: 'native-continuous',
            unit: definition.schema.kind === 'number' ? definition.schema.unit : '',
            compatibility: 'exact-definition-pin',
            fulfillment: ['all-or-nothing', 'bounded-partial'],
            reservation:
              definition.reservoir.drainPerSecond === 0
                ? 'explicit-release-or-simulation-deadline'
                : 'supply-only; draining-recipient-holds-unsupported',
          },
        }
      : {}),
  }));
}

function revision(entity: Entity, definition: AttributeDefinition): number {
  const storage = HOST_IMPLEMENTATIONS[definition.implementation].storage;
  if (storage === 'attributes')
    return (entity.actor?.attributes ?? entity.attributes)?.[definition.id]?.revision ?? 0;
  if (storage === 'health') return entity.actor?.body?.revision ?? 0;
  return entity.actor?.[storage === 'fullness' ? 'fullnessRevision' : 'energyRevision'] ?? 0;
}

/** A missing native need is inapplicable, never a known zero. Sparse installed
 * state distinguishes uninitialized from a value hidden by current disclosure.
 */
export function readState(
  world: WorldState,
  address: StateAddress,
  audience: 'owner' | 'public',
): StateRead {
  if (!isStateAddress(address)) return { status: 'unsupported' };
  const definition = resolve(world, address);
  if (!definition) return { status: 'unsupported' };
  if (audience === 'public' && definition.disclosure === 'owner') return { status: 'unknown' };
  const entity = getOwn(world.entities, address.entityId);
  if (!entity) return { status: 'not-applicable' };
  const storage = HOST_IMPLEMENTATIONS[definition.implementation].storage;
  const value = entity.actor
    ? readAttribute(entity.actor, definition)
    : storage === 'attributes'
      ? entity.attributes?.[definition.id]?.value
      : undefined;
  if (value === undefined)
    return { status: storage === 'attributes' ? 'uninitialized' : 'not-applicable' };
  return { status: 'known', value, revision: revision(entity, definition) };
}

/** Internal typed owner port, called only inside an admitted domain draft. Authority
 * and provenance are bound by the semantic caller, never supplied as a raw field path.
 * The exact pin and revision still protect native callers from stale bindings.
 */
export function writeState(
  world: WorldState,
  address: StateAddress,
  expectedRevision: number,
  operation: StateOperation,
  events: WorldEvent[],
  cause: string,
): StateWriteResult {
  if (!isStateAddress(address) || !isStateOperation(operation)) return { status: 'invalid' };
  const definition = resolve(world, address);
  if (!definition) return { status: 'unsupported' };
  const entity = getOwn(world.entities, address.entityId);
  const prior = readState(world, address, 'owner');
  if (!entity || prior.status !== 'known') return { status: 'not-applicable' };
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== prior.revision)
    return { status: 'stale' };
  let value: AttributeValue;
  if (operation.kind === 'replace') value = operation.value;
  else if (
    operation.kind === 'increment' &&
    typeof prior.value === 'number' &&
    Number.isFinite(operation.amount)
  )
    value = prior.value + operation.amount;
  else return { status: 'invalid' };
  try {
    validateAttributeValue(definition, value);
  } catch {
    return { status: 'invalid' };
  }
  if (value === prior.value) return { status: 'unchanged', value, revision: prior.revision };
  if (!Number.isSafeInteger(prior.revision + 1)) return { status: 'invalid' };
  const storage = HOST_IMPLEMENTATIONS[definition.implementation].storage;
  if (storage === 'attributes') {
    try {
      setAttribute(world, entity, definition, value, events);
    } catch (error) {
      if (error instanceof ResourceReservationError) return { status: 'reserved' };
      throw error;
    }
  } else {
    if (!entity.actor || typeof value !== 'number') return { status: 'not-applicable' };
    if (storage === 'health') {
      setBodyHealth(entity.actor, (value / 100) * (entity.actor.body?.maxHealth ?? 100));
      reconcileBody(world, entity, events, cause);
    } else setWildernessNeed(entity.actor, storage, value);
  }
  recordSemanticChange(world, {
    kind: 'state',
    entityId: entity.id,
    field: storage === 'health' ? 'body' : storage === 'attributes' ? 'attribute' : 'needs',
  });
  return { status: 'applied', value, revision: revision(entity, definition) };
}
