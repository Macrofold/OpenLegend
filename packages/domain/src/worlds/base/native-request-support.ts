import type {
  ActivityHostDescriptor,
  ActivityRequestChoice,
  ActivityRequestDescriptor,
  ActivityRequestField,
  ActivityRequestObservation,
} from '../../activity-hosts.js';
import type { Command, Entity, ItemInstance, Outcome, WorldState } from '../../types.js';
import { entityGet } from '../../entity-collection.js';
import { itemFor } from '../../objects.js';
import { accessiblePossession, possessionItems } from '../../object-access.js';
import { availableItemQuantity } from '../../resource-claims.js';
import { inspectedContainer } from '../../inventory-inspection.js';
import { observeActor } from '../../kernel.js';
import { observerName } from './knowledge.js';
import { outcome } from '../../events.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';
import { pointVisionQuery } from '../../perception.js';
import { boundaryMaterialWorkQuery } from '../../boundary-assemblies.js';
import { BASE_COMMAND_DESCRIPTIONS } from './action-descriptions.js';

export type Arguments = Readonly<Record<string, string | number | boolean>>;
interface ReadScope {
  world: WorldState;
  actorId: string;
  observed: ActivityRequestObservation;
  possessions: readonly ItemInstance[];
  stockDefinitions: Map<string, Set<string>>;
  permitted: Set<string>;
  boundaryFaces: Map<string, ReturnType<typeof boundaryMaterialWorkQuery>>;
  sight?: ReturnType<typeof pointVisionQuery>;
}
export interface Role {
  /** Discovery stays in the already permitted namespace. Exact binding uses read. */
  ids(scope: ReadScope, args: Arguments): Iterable<string>;
  /** Candidate identities for a dependent role before its parents are selected.
   * Parameter-specific availability still belongs to read, never this metadata. */
  referenceIds?(scope: ReadScope): Iterable<string>;
  read(
    world: WorldState,
    actorId: string,
    id: string,
    args: Arguments,
    scope?: ReadScope,
  ): { label: string; kind: ActivityRequestChoice['kind'] } | undefined;
}
export interface Form {
  id: string;
  type: Command['type'];
  descriptor(world: WorldState, actorId?: string, binding?: true): ActivityRequestDescriptor;
  roles: Readonly<Record<string, Role>>;
  bind(world: WorldState, actorId: string, id: string, args: Arguments): Command | Outcome;
}

export const entityField = (
  label: string,
  dependencies?: readonly string[],
): ActivityRequestField => ({
  type: 'entity',
  label,
  required: true,
  discovery: { source: 'choices' },
  ...(dependencies ? { dependencies } : {}),
});
export const choiceField = (
  label: string,
  choices: readonly { value: string; label: string }[],
): ActivityRequestField => ({
  type: 'choice',
  label,
  required: true,
  choices,
});
export const quantityField: ActivityRequestField = {
  type: 'integer',
  label: 'Quantity',
  required: true,
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
};
export const unavailable = () =>
  outcome(
    false,
    'native-request-unavailable',
    'That choice is no longer available. Choose its details again.',
  );
export const entityLabel = (world: WorldState, actorId: string, id: string) =>
  observerName(world, actorId, id).name;
export function perceived(
  predicate: (world: WorldState, entity: Entity) => boolean = () => true,
  self = false,
): Role {
  return {
    ids: ({ observed, world }) =>
      [...(self ? [observed.actor] : []), ...observed.visibleEntities]
        .filter((entity) => predicate(world, entity))
        .map((entity) => entity.id),
    // The caller proves the selected reference's disclosure before this role predicate.
    read(world, actorId, id) {
      const entity = entityGet(world.entities, id);
      return entity && (self || id !== actorId) && predicate(world, entity)
        ? { label: entityLabel(world, actorId, id), kind: 'entity' }
        : undefined;
    },
  };
}
export const people = perceived((_world, entity) => !!entity.actor);
export function carried(
  predicate: (
    world: WorldState,
    item: ItemInstance,
    args: Arguments,
    actorId: string,
  ) => boolean = () => true,
): Role {
  return {
    ids: ({ possessions, world, actorId }, args) =>
      possessions.filter((item) => predicate(world, item, args, actorId)).map((item) => item.id),
    referenceIds: ({ possessions }) => possessions.map((item) => item.id),
    read(world, actorId, id, args) {
      const item = itemFor(world, id),
        definition = item && world.itemDefinitions[item.definitionId];
      return item &&
        definition &&
        accessiblePossession(world, actorId, id) &&
        predicate(world, item, args, actorId)
        ? { label: definition.name, kind: 'entity' }
        : undefined;
    },
  };
}
export const item = carried();
export const freePortable = carried(
  (world, item) =>
    world.itemDefinitions[item.definitionId]?.portable === true &&
    availableItemQuantity(world, item.id) > 0,
);
export const heat = perceived((_world, entity) => !!entity.heat);
interface QuantitySummary {
  ownMaximum: number;
  ownTotal: number;
  knownMaximum: number;
  knownTotal: number;
}
const quantitySummaries = new WeakMap<WorldState, Map<string, QuantitySummary>>();
function quantitySummary(world: WorldState, actorId: string): QuantitySummary {
  const frozen = Object.isFrozen(world),
    previous = frozen ? quantitySummaries.get(world)?.get(actorId) : undefined;
  if (previous) return previous;
  const summary = { ownMaximum: 0, ownTotal: 0, knownMaximum: 0, knownTotal: 0 };
  for (const item of possessionItems(world, actorId)) {
    const quantity = availableItemQuantity(world, item.id);
    summary.ownMaximum = Math.max(summary.ownMaximum, quantity);
    summary.ownTotal += quantity;
  }
  summary.knownMaximum = summary.ownMaximum;
  summary.knownTotal = summary.ownTotal;
  for (const item of inspectedContainer(world, actorId)?.items ?? []) {
    const quantity = availableItemQuantity(world, item.id);
    summary.knownMaximum = Math.max(summary.knownMaximum, quantity);
    summary.knownTotal += quantity;
  }
  // Inspection, custody and reservations belong to this immutable world. Reuse
  // only derived scalars across its forms; exact binding reads the selected lot.
  if (frozen) {
    let actors = quantitySummaries.get(world);
    if (!actors) quantitySummaries.set(world, (actors = new Map()));
    actors.set(actorId, summary);
  }
  return summary;
}
export function simple(
  id: string,
  label: string,
  type: Command['type'],
  fields: ActivityRequestDescriptor['fields'],
  roles: Form['roles'],
  bind: Form['bind'],
  options: {
    description?: string;
    equals?: Record<string, string | number | boolean>;
    covers?: boolean;
    quantity?: 'own-lot' | 'known-lot' | 'known-stock';
  } = {},
): Form {
  return {
    id,
    type,
    descriptor: (world, actorId, binding) => {
      let bounded = fields;
      if (actorId && options.quantity && !binding) {
        const quantities = quantitySummary(world, actorId);
        const maximum =
          options.quantity === 'known-stock'
            ? quantities.knownTotal
            : options.quantity === 'own-lot'
              ? quantities.ownMaximum
              : quantities.knownMaximum;
        bounded = {
          ...fields,
          quantity: { ...fields.quantity!, maximum: Math.max(1, maximum) },
          ...(fields.minimumHeld
            ? {
                minimumHeld: {
                  ...fields.minimumHeld,
                  maximum: quantities.ownTotal,
                },
              }
            : {}),
        };
      }
      return {
        id,
        label,
        description: options.description ?? BASE_COMMAND_DESCRIPTIONS[type]!,
        requires: [type],
        ...(options.covers !== true
          ? {}
          : { covers: [{ type, ...(options.equals ? { equals: options.equals } : {}) }] }),
        fields: bounded,
      };
    },
    roles,
    bind,
  };
}
export const pinLot = (world: WorldState, item: ItemInstance, quantity: number) => ({
  itemId: item.id,
  quantity,
  expectedRevision: item.revision!,
  placementRevision: item.placementRevision!,
  ...(item.container
    ? { expectedContentsRevision: entityGet(world.entities, item.id)?.inventoryRevision ?? 0 }
    : {}),
});

// The caller shares one immutable observation across selected hosts and dependent
// queries. Prepare access once for that scope; never retain a global actor cache.
const scopes = new WeakMap<ActivityRequestObservation, ReadScope>();
function readScope(
  world: WorldState,
  actorId: string,
  observed: ActivityRequestObservation,
): ReadScope {
  const prior = scopes.get(observed);
  if (Object.isFrozen(world) && prior?.world === world && prior.actorId === actorId) return prior;
  const possessions = observed.inventory.filter((item) =>
    accessiblePossession(world, actorId, item.id),
  );
  const stockDefinitions = new Map([
    [actorId, new Set(possessions.map((item) => item.definitionId))],
  ]);
  if (observed.inspectedContainer)
    stockDefinitions.set(
      observed.inspectedContainer.id,
      new Set(observed.inspectedContainer.items.map((item) => item.definitionId)),
    );
  const scope: ReadScope = {
    world,
    actorId,
    observed,
    possessions,
    stockDefinitions,
    permitted: new Set([
      actorId,
      ...observed.visibleEntities.map((entity) => entity.id),
      ...observed.inventory.map((item) => item.id),
      ...(observed.inspectedContainer?.items.map((item) => item.id) ?? []),
    ]),
    boundaryFaces: new Map(),
  };
  if (Object.isFrozen(world)) scopes.set(observed, scope);
  return scope;
}

function validArgument(
  form: Form,
  descriptor: ActivityRequestDescriptor,
  world: WorldState,
  actorId: string,
  field: string,
  args: Arguments,
  allowed: ReadonlySet<string>,
  scope?: ReadScope,
): boolean {
  const meaning = descriptor.fields[field],
    value = args[field];
  if (!meaning) return false;
  if (meaning.type === 'integer')
    return (
      Number.isSafeInteger(value) &&
      Number(value) >= (meaning.minimum ?? Number.MIN_SAFE_INTEGER) &&
      Number(value) <= (meaning.maximum ?? Number.MAX_SAFE_INTEGER)
    );
  if (meaning.type === 'choice') return meaning.choices.some((choice) => choice.value === value);
  if (meaning.type !== 'entity' && meaning.type !== 'definition') return false;
  return (
    isSafeRecordId(value) &&
    (meaning.type !== 'entity' || value === actorId || allowed.has(value)) &&
    !!form.roles[field]?.read(world, actorId, value, args, scope)
  );
}

export function nativeRequestSupport(
  selected: (world: WorldState) => readonly Form[],
  find: (world: WorldState, family: string) => Form | undefined,
): Pick<
  ActivityHostDescriptor,
  | 'requestDescriptors'
  | 'compileRequest'
  | 'requestChoice'
  | 'requestChoices'
  | 'requestRoleEntityIds'
> {
  return {
    requestDescriptors: (world, actorId) =>
      selected(world)
        .map((form) => form.descriptor(world, actorId))
        .filter(
          (descriptor) =>
            !actorId ||
            !Object.values(descriptor.fields).some(
              (field) => field.type === 'choice' && field.choices.length === 0,
            ),
        ),
    requestChoice(world, actorId, family, field, candidateId, args = {}) {
      const form = find(world, family),
        value = form?.roles[field]?.read(world, actorId, candidateId, args);
      return value
        ? { id: candidateId, ...value, roles: [field], requestIds: [family], accessible: true }
        : undefined;
    },
    requestRoleEntityIds(world, actorId, family, prepared) {
      const form = find(world, family);
      const observed = prepared ?? observeActor(world, actorId, { includeMemories: false });
      if (!form || !observed) return [];
      const descriptor = form.descriptor(world, actorId);
      const scope = readScope(world, actorId, observed);
      const ids = new Set<string>();
      for (const [field, role] of Object.entries(form.roles)) {
        if (descriptor.fields[field]?.type !== 'entity') continue;
        const candidates = descriptor.fields[field]?.dependencies?.length
          ? (role.referenceIds?.(scope) ?? role.ids(scope, {}))
          : role.ids(scope, {});
        for (const id of candidates) if (scope.permitted.has(id)) ids.add(id);
      }
      return ids;
    },
    requestChoices(world, actorId, prepared, query) {
      const observed = prepared ?? observeActor(world, actorId, { includeMemories: false });
      if (!observed) return { choices: [], warnings: [] };
      const scope = readScope(world, actorId, observed);
      const choices: ActivityRequestChoice[] = [];
      const queried = query && find(world, query.family);
      for (const form of query ? (queried ? [queried] : []) : selected(world)) {
        const descriptor = form.descriptor(world, actorId);
        if (query && query.family !== descriptor.id) continue;
        for (const [field, role] of Object.entries(form.roles)) {
          if (query && query.field !== field) continue;
          const dependencies = descriptor.fields[field]?.dependencies ?? [];
          if (dependencies.some((parent) => query?.arguments[parent] === undefined)) continue;
          const args = query?.arguments ?? {};
          // Caller-provided dependency IDs cannot use a hidden target to select a
          // revealing child list. Validate the parent frontier in the same scope.
          const parents = new Set<string>();
          const addParents = (name: string) => {
            for (const parent of descriptor.fields[name]?.dependencies ?? [])
              if (!parents.has(parent)) {
                parents.add(parent);
                addParents(parent);
              }
          };
          addParents(field);
          if (
            [...parents].some(
              (parent) =>
                !validArgument(
                  form,
                  descriptor,
                  world,
                  actorId,
                  parent,
                  args,
                  scope.permitted,
                  scope,
                ),
            )
          )
            continue;
          for (const id of new Set(role.ids(scope, args))) {
            const value = role.read(world, actorId, id, args, scope);
            if (value)
              choices.push({
                id,
                ...value,
                roles: [field],
                requestIds: [descriptor.id],
                accessible: true,
                ...(dependencies.length
                  ? {
                      requires: Object.fromEntries(
                        dependencies.map((parent) => [parent, args[parent]!]),
                      ),
                    }
                  : {}),
              });
          }
        }
      }
      return { choices, warnings: [] };
    },
    compileRequest(world, actorId, id, request, permitted) {
      const form = find(world, request.family);
      if (!form) return unavailable();
      const descriptor = form.descriptor(world, actorId, true),
        args = request.arguments;
      if (!hasRecordFields(args, Object.keys(descriptor.fields))) return unavailable();
      const observation = permitted
        ? undefined
        : observeActor(world, actorId, { includeMemories: false });
      const observed: ActivityRequestObservation | undefined = observation
        ? { ...observation, inspectedContainer: inspectedContainer(world, actorId) }
        : undefined;
      const allowed = new Set(
        permitted ?? [
          actorId,
          ...(observed?.visibleEntities.map((entity) => entity.id) ?? []),
          ...(observed?.inventory.map((item) => item.id) ?? []),
          ...(observed?.inspectedContainer?.items.map((item) => item.id) ?? []),
        ],
      );
      for (const field of Object.keys(descriptor.fields))
        if (!validArgument(form, descriptor, world, actorId, field, args, allowed))
          return unavailable();
      return form.bind(world, actorId, id, args);
    },
  };
}
