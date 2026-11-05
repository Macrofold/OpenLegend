import type { ActivityHostDescriptor } from '../../activity-hosts.js';
import type { Command, WorldState } from '../../types.js';
import { entityGet } from '../../entity-collection.js';
import { itemFor } from '../../objects.js';
import { accessiblePossession, canAccessContainer, possessionItems } from '../../object-access.js';
import { availableItemQuantity } from '../../resource-claims.js';
import { currentInventoryInspection, inspectedContainer } from '../../inventory-inspection.js';
import { canonicalJson } from '../../events.js';
import { definitionPin } from '../../world-modules.js';
import { isEquipped } from '../../equipment.js';
import { castDefinition } from '../../finite-casts.js';
import { nativeFoodSourceCandidate } from '../../native-feeding.js';
import { readRecipeRecord } from '../../recipe-records.js';
import { strikeDefinition, supportsStrike } from '../../strikes.js';
import { rangedTargetAllowed } from '../../ranged-policy.js';
import { preparationPin } from '../../food-preparation.js';
import { canActivateStatusEffect } from '../../status-effects.js';
import { activeContributionId } from '../../status-capabilities.js';
import { evasionChoices } from './combat-views.js';
import { BASE_EVASION_DIRECTIONS } from './ranged-counterplay.js';
import { isFuel } from './fire.js';
import { BASE_COMMAND_DESCRIPTIONS } from './action-descriptions.js';
import { practiceStatus, toolPracticeDefinition } from '../../practical-competence.js';
import { reincarnationPolicy, replacementRest } from '../../reincarnation.js';
import { pointVisionQuery } from '../../perception.js';
import { boundaryMaterialWorkQuery } from '../../boundary-assemblies.js';
import { constructionProfile } from '../../construction-scene.js';
import { sameDefinitionPin } from '../../state-owners.js';
import { isAssemblyPlacement } from '../../spatial-state.js';
import {
  type Form,
  type Role,
  entityField,
  choiceField,
  quantityField,
  unavailable,
  entityLabel,
  perceived,
  people,
  carried,
  item,
  freePortable,
  heat,
  simple,
  pinLot,
  nativeRequestSupport,
} from './native-request-support.js';

const gift = simple(
  'base:offer-possession',
  'Offer a possession',
  'handover',
  {
    targetId: entityField('Person'),
    itemId: entityField('Your possession'),
    quantity: { ...quantityField, dependencies: ['itemId'] },
  },
  { targetId: people, itemId: freePortable },
  (world, actorId, id, args) => {
    const selected = itemFor(world, String(args.itemId));
    return selected && Number(args.quantity) <= availableItemQuantity(world, selected.id)
      ? {
          id,
          actorId,
          type: 'handover',
          operation: 'offer',
          targetId: String(args.targetId),
          offered: [pinLot(world, selected, Number(args.quantity))],
          requested: [],
        }
      : unavailable();
  },
  {
    covers: false,
    quantity: 'own-lot',
    description:
      'Offer an exact amount of one possession. Nothing moves until the other person accepts; you keep it meanwhile and may withdraw the offer.',
  },
);

const inspectOwn = simple(
  'base:inspect-possessions',
  'Inspect your possessions',
  'inspect-inventory',
  {},
  {},
  (_world, actorId, id) => ({ id, actorId, type: 'inspect-inventory' }),
  { covers: false },
);
const containers = perceived((_world, entity) => !!entity.container || entity.kind === 'item-pile');
const inspectContainer = simple(
  'base:inspect-container',
  'Inspect a container',
  'inspect-inventory',
  {
    containerId: entityField('Container'),
  },
  {
    containerId: {
      ids: ({ observed }) => [
        ...observed.visibleEntities
          .filter((entity) => entity.container || entity.kind === 'item-pile')
          .map((entity) => entity.id),
        ...observed.inventory.filter((item) => item.container).map((item) => item.id),
      ],
      read(world, actorId, id, args) {
        return canAccessContainer(world, actorId, id)
          ? containers.read(world, actorId, id, args)
          : undefined;
      },
    },
  },
  (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'inspect-inventory',
    containerId: String(args.containerId),
  }),
  { covers: false },
);
const inspectRecord = simple(
  'base:inspect-item',
  'Examine a possession',
  'inspect-inventory',
  {
    itemId: entityField('Possession'),
  },
  { itemId: item },
  (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'inspect-inventory',
    itemId: String(args.itemId),
  }),
  { covers: false },
);
const inspectWork = simple(
  'base:inspect-past-work',
  'Inspect your past work',
  'inspect-activities',
  {},
  {},
  (_world, actorId, id) => ({ id, actorId, type: 'inspect-activities', after: -1 }),
  { covers: false },
);

const transferItems: Role = {
  ids: ({ observed }) => [
    ...observed.inventory.map((item) => item.id),
    ...(observed.inspectedContainer?.items.map((item) => item.id) ?? []),
  ],
  read(world, actorId, id) {
    const selected = itemFor(world, id),
      inspection = currentInventoryInspection(world, actorId);
    if (
      !selected ||
      (!accessiblePossession(world, actorId, id) && !inspection?.itemIds.includes(id)) ||
      !canAccessContainer(world, actorId, selected.ownerId)
    )
      return;
    const definition = world.itemDefinitions[selected.definitionId];
    return definition ? { label: definition.name, kind: 'entity' } : undefined;
  },
};
const transferDestinations: Role = {
  ids: ({ actorId, observed }) => [
    actorId,
    ...(observed.inspectedContainer ? [observed.inspectedContainer.id] : []),
  ],
  read(world, actorId, id) {
    if (id !== actorId && currentInventoryInspection(world, actorId)?.containerId !== id) return;
    return canAccessContainer(world, actorId, id)
      ? {
          label: id === actorId ? 'Your possessions' : entityLabel(world, actorId, id),
          kind: 'entity',
        }
      : undefined;
  },
};
const differentDestination: Role = {
  ids: transferDestinations.ids,
  read(world, actorId, id, args) {
    if (
      args.sourceId === id ||
      (typeof args.itemId === 'string' && itemFor(world, args.itemId)?.ownerId === id)
    )
      return;
    return transferDestinations.read(world, actorId, id, args);
  },
};
const transfer = simple(
  'base:move-possession',
  'Move possessions into or out of a container',
  'transfer-item',
  {
    itemId: entityField('Known item'),
    targetId: entityField('Destination', ['itemId']),
    quantity: { ...quantityField, dependencies: ['itemId'] },
  },
  { itemId: transferItems, targetId: differentDestination },
  (world, actorId, id, args) => {
    const selected = itemFor(world, String(args.itemId)),
      target = entityGet(world.entities, String(args.targetId));
    return selected && target && Number(args.quantity) <= availableItemQuantity(world, selected.id)
      ? {
          id,
          actorId,
          type: 'transfer-item',
          ...pinLot(world, selected, Number(args.quantity)),
          targetId: target.id,
          targetRevision: target.inventoryRevision ?? 0,
        }
      : unavailable();
  },
  { covers: false, quantity: 'known-lot' },
);

const equip = simple(
  'base:equip-possession',
  'Equip a possession',
  'equip',
  { itemId: entityField('Equipment') },
  {
    itemId: carried((world, item) => {
      const definition = world.itemDefinitions[item.definitionId];
      return !!definition?.equipment;
    }),
  },
  (_world, actorId, id, args) => ({ id, actorId, type: 'equip', itemId: String(args.itemId) }),
  { covers: true },
);
const unequip = simple(
  'base:unequip-possession',
  'Put away equipped gear',
  'unequip',
  { itemId: entityField('Equipped possession') },
  {
    itemId: carried((world, item, _args, actorId) => isEquipped(world, actorId, item.id)),
  },
  (world, actorId, id, args) => {
    const selected = itemFor(world, String(args.itemId));
    return selected
      ? {
          id,
          actorId,
          type: 'unequip',
          itemId: selected.id,
          expectedRevision: selected.revision!,
          placementRevision: selected.placementRevision!,
        }
      : unavailable();
  },
  { covers: true },
);
const shield = carried((world, item) => !!world.itemDefinitions[item.definitionId]?.contactDefense);
const guard = simple(
  'base:guard-facing',
  'Guard in your current direction',
  'guard',
  { itemId: entityField('Shield') },
  { itemId: shield },
  (world, actorId, id, args) => ({
    id,
    actorId,
    type: 'guard',
    itemId: String(args.itemId),
    facing: entityGet(world.entities, actorId)?.spatial.heading,
    autoEquip: true,
  }),
  { covers: false },
);
const guardTarget = simple(
  'base:guard-person',
  'Guard toward someone',
  'guard',
  { targetId: entityField('Person'), itemId: entityField('Shield') },
  { targetId: people, itemId: shield },
  (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'guard',
    itemId: String(args.itemId),
    targetId: String(args.targetId),
    autoEquip: true,
  }),
  { covers: false },
);

const naturalStrike: Form = {
  id: 'base:body-strike',
  type: 'strike',
  descriptor(world, actorId) {
    return {
      id: 'base:body-strike',
      label: 'Strike with your body',
      description: BASE_COMMAND_DESCRIPTIONS.strike!,
      requires: ['strike'],
      fields: {
        targetId: entityField('Target'),
        methodId: choiceField(
          'Strike',
          Object.values(world.nativeStrikes ?? {})
            .filter(
              (definition) =>
                !actorId || supportsStrike(entityGet(world.entities, actorId), definition),
            )
            .map((definition) => ({ value: definition.id, label: definition.label })),
        ),
      },
    };
  },
  roles: { targetId: perceived((_world, entity) => !!entity.actor || !!entity.animal) },
  bind: (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'strike',
    definitionId: String(args.methodId),
    targetId: String(args.targetId),
  }),
};
const weaponStrike = simple(
  'base:weapon-strike',
  'Strike with a weapon',
  'strike',
  {
    targetId: entityField('Target'),
    weaponItemId: entityField('Melee weapon'),
  },
  {
    targetId: perceived((_world, entity) => !!entity.actor || !!entity.animal),
    weaponItemId: carried((world, item) => !!strikeDefinition(item.definitionId, world, item.id)),
  },
  (world, actorId, id, args) => {
    const selected = itemFor(world, String(args.weaponItemId));
    return selected
      ? {
          id,
          actorId,
          type: 'strike',
          definitionId: selected.definitionId,
          weaponItemId: selected.id,
          targetId: String(args.targetId),
          autoEquip: true,
        }
      : unavailable();
  },
  { covers: false },
);

const rangedWeapon = carried(
  (world, item) => !!world.itemDefinitions[item.definitionId]?.rangedWeapon,
);
const ammunition = carried((world, item, args) => {
  const selected = itemFor(world, String(args.weaponItemId)),
    definition = selected && world.itemDefinitions[selected.definitionId];
  return (
    !!definition?.rangedWeapon &&
    world.itemDefinitions[item.definitionId]?.ammunition?.kind ===
      definition.rangedWeapon.ammunitionKind
  );
});
const rangedForms = (['hunt', 'aim', 'shoot-once', 'practice-shot'] as const).map((type) =>
  simple(
    `base:${type}`,
    type === 'hunt'
      ? 'Hunt once'
      : type === 'aim'
        ? 'Prepare an aimed shot'
        : type === 'practice-shot'
          ? 'Practice one shot'
          : 'Shoot once',
    type,
    {
      targetId: entityField(type === 'practice-shot' ? 'Practice target' : 'Target'),
      weaponItemId: entityField('Ranged tool', type === 'practice-shot' ? ['targetId'] : undefined),
      ammoItemId: entityField('Ammunition', ['weaponItemId']),
    },
    {
      targetId: perceived((world, entity) =>
        type === 'practice-shot'
          ? !!entity.practiceTarget
          : type === 'hunt'
            ? !!entity.animal
            : rangedTargetAllowed(world, entity),
      ),
      weaponItemId:
        type === 'practice-shot'
          ? carried((world, item, args) => {
              const target = entityGet(world.entities, String(args.targetId)),
                definition = world.itemDefinitions[item.definitionId];
              return (
                !!definition &&
                toolPracticeDefinition(world, definition)?.id ===
                  target?.practiceTarget?.attributeId
              );
            })
          : rangedWeapon,
      ammoItemId: ammunition,
    },
    (_world, actorId, id, args) => ({
      id,
      actorId,
      type,
      targetId: String(args.targetId),
      weaponItemId: String(args.weaponItemId),
      ammoItemId: String(args.ammoItemId),
      ...(type === 'practice-shot' ? {} : { autoEquip: true }),
    }),
    // Point-target aim and manual execution remain separately offered. A target form
    // must not claim to cover those more precise native parameters.
    { covers: type === 'hunt' || type === 'practice-shot' },
  ),
);
const release: Form = {
  id: 'base:release-current-shot',
  type: 'release-shot',
  roles: {},
  descriptor(world, actorId) {
    const action = actorId ? entityGet(world.entities, actorId)?.actor?.action : undefined;
    return {
      id: this.id,
      label: 'Release your prepared shot',
      description: BASE_COMMAND_DESCRIPTIONS['release-shot']!,
      requires: ['release-shot'],
      fields: {
        aimId: choiceField(
          'Prepared shot',
          action?.ranged ? [{ value: action.id, label: 'Your current prepared shot' }] : [],
        ),
      },
    };
  },
  bind: (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'release-shot',
    aimId: String(args.aimId),
  }),
};

const fish = simple(
  'base:fish-once',
  'Fish once',
  'fish',
  { targetId: entityField('Fishing reach'), itemId: entityField('Fishing tool', ['targetId']) },
  {
    targetId: perceived((world, entity) => !!castDefinition(world, entity)),
    itemId: carried((world, item, args) => {
      const source = entityGet(world.entities, String(args.targetId));
      return (
        !!source &&
        world.itemDefinitions[item.definitionId]?.fishingTool?.kind ===
          castDefinition(world, source)?.toolKind
      );
    }),
  },
  (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'fish',
    targetId: String(args.targetId),
    itemId: String(args.itemId),
  }),
  { covers: true },
);
const harvest = simple(
  'base:harvest-remains',
  'Harvest animal remains',
  'harvest',
  { targetId: entityField('Remains') },
  {
    targetId: perceived((_world, entity) => !!entity.remains),
  },
  (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'harvest',
    targetId: String(args.targetId),
  }),
  { covers: true },
);
const feed = simple(
  'base:feed-from-source',
  'Feed from an exposed source',
  'feed',
  { targetId: entityField('Food source') },
  {
    targetId: perceived((_world, entity) => nativeFoodSourceCandidate(entity)),
  },
  (_world, actorId, id, args) => ({ id, actorId, type: 'feed', targetId: String(args.targetId) }),
  { covers: false },
);
const teach = simple(
  'base:teach-method',
  'Teach a known method',
  'teach',
  {
    recipeId: {
      type: 'definition',
      definitionKind: 'recipe',
      label: 'Personally known method',
      required: true,
      discovery: { source: 'choices' },
    },
    targetId: entityField('Listener'),
  },
  {
    targetId: people,
    recipeId: {
      ids: ({ world, actorId }) =>
        new Set((world.knowledge[actorId] ?? []).map((record) => record.recipeId)),
      read(world, actorId, recipeId) {
        const recipe = world.recipes[recipeId];
        return recipe && world.knowledge[actorId]?.some((record) => record.recipeId === recipeId)
          ? { label: recipe.name, kind: 'definition' }
          : undefined;
      },
    },
  },
  (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'teach',
    targetId: String(args.targetId),
    recipeId: String(args.recipeId),
  }),
  { covers: true },
);
const learnRecord = simple(
  'base:learn-inspected-record',
  'Learn from an inspected record',
  'learn-record',
  { itemId: entityField('Inspected record') },
  {
    itemId: {
      ids: ({ world, actorId }) => currentInventoryInspection(world, actorId)?.itemIds ?? [],
      read(world, actorId, itemId) {
        if (!currentInventoryInspection(world, actorId)?.itemIds.includes(itemId)) return;
        const read = readRecipeRecord(world, actorId, itemId);
        return 'recipe' in read ? { label: read.definition.name, kind: 'entity' } : undefined;
      },
    },
  },
  (world, actorId, id, args) => {
    const read = readRecipeRecord(world, actorId, String(args.itemId));
    return 'recipe' in read
      ? {
          id,
          actorId,
          type: 'learn-record',
          itemId: read.item.id,
          expectedRevision: read.item.revision!,
          placementRevision: read.item.placementRevision!,
          recordPin: definitionPin(read.definition),
        }
      : read;
  },
  { covers: true },
);

const fireForms = (['light', 'fuel', 'extinguish'] as const).map((operation) =>
  simple(
    `base:fire-${operation}`,
    operation === 'light'
      ? 'Light a fire'
      : operation === 'fuel'
        ? 'Add fuel to a fire'
        : 'Put out a fire',
    'tend-fire',
    {
      targetId: entityField('Fire'),
      ...(operation === 'fuel' ? { itemId: entityField('Carried fuel') } : {}),
    },
    {
      targetId: heat,
      ...(operation === 'fuel'
        ? {
            itemId: carried(
              (world, item) =>
                !!world.itemDefinitions[item.definitionId] &&
                isFuel(world.itemDefinitions[item.definitionId]!),
            ),
          }
        : {}),
    },
    (_world, actorId, id, args) => ({
      id,
      actorId,
      type: 'tend-fire',
      operation,
      targetId: String(args.targetId),
      ...(operation === 'fuel' ? { itemId: String(args.itemId) } : {}),
    }),
    { equals: { operation }, covers: operation !== 'fuel' },
  ),
);

function preparationForms(world: WorldState, selectedId?: string): Form[] {
  const selected = selectedId ? world.foodPreparations[selectedId] : undefined;
  return (selectedId ? (selected ? [selected] : []) : Object.values(world.foodPreparations)).map(
    (preparation) =>
      simple(
        `base:prepare:${preparation.id}`,
        preparation.name,
        'cook',
        {
          heatId: entityField('Heat source'),
          ...Object.fromEntries(
            preparation.inputs.map((input) => [
              `input:${input.role}`,
              entityField(
                `${world.itemDefinitions[input.definitionId]?.name ?? input.role} (${input.quantity})`,
              ),
            ]),
          ),
        },
        {
          heatId: heat,
          ...Object.fromEntries(
            preparation.inputs.map((input) => [
              `input:${input.role}`,
              carried((_world, item) => item.definitionId === input.definitionId),
            ]),
          ),
        },
        (current, actorId, id, args) => {
          const definition = current.foodPreparations[preparation.id],
            pin = definition && preparationPin(current, definition);
          return pin
            ? {
                id,
                actorId,
                type: 'cook',
                preparationId: pin.id,
                preparationVersion: pin.version,
                preparationDigest: pin.digest,
                heatId: String(args.heatId),
                inputs: Object.fromEntries(
                  definition.inputs.map((input) => [
                    input.role,
                    String(args[`input:${input.role}`]),
                  ]),
                ),
              }
            : unavailable();
        },
        { description: preparation.description, covers: false },
      ),
  );
}

const evade: Form = {
  id: 'base:evade-direction',
  type: 'evade',
  descriptor: () => ({
    id: 'base:evade-direction',
    label: 'Evade',
    description: BASE_COMMAND_DESCRIPTIONS.evade!,
    requires: ['evade'],
    fields: {
      direction: choiceField(
        'Direction',
        BASE_EVASION_DIRECTIONS.map((direction) => ({
          value: direction.label,
          label: direction.label,
        })),
      ),
    },
  }),
  roles: {},
  bind(world, actorId, id, args) {
    const actor = entityGet(world.entities, actorId),
      direction = BASE_EVASION_DIRECTIONS.find((direction) => direction.label === args.direction);
    const selected =
      actor &&
      direction &&
      evasionChoices(world, actor).find((choice) => choice.direction === direction.label);
    return selected
      ? { id, actorId, type: 'evade', destination: selected.destination }
      : unavailable();
  },
};
function statusForms(
  world: WorldState,
  selectedId?: string,
  selectedOperation?: 'activate' | 'deactivate',
): Form[] {
  return world.statusEffectPolicy.definitions
    .filter((definition) => !selectedId || definition.id === selectedId)
    .flatMap((definition) => {
      if (!definition.enabled || !definition.actions) return [];
      const actions = definition.actions;
      return (selectedOperation ? [selectedOperation] : (['activate', 'deactivate'] as const)).map(
        (operation) =>
          simple(
            `base:state:${definition.id}:${operation}`,
            actions[operation],
            'status-effect',
            { targetId: entityField(actions.allowOther ? 'Person' : 'Yourself') },
            {
              targetId: {
                ids: ({ observed }) =>
                  [observed.actor, ...(actions.allowOther ? observed.visibleEntities : [])]
                    .filter((target) => !!target.actor)
                    .map((target) => target.id),
                read(current, actorId, targetId) {
                  // Only the actor's own state may narrow this role. A visible other person's
                  // hidden condition cannot reveal itself by an option appearing/disappearing.
                  const target = entityGet(current.entities, targetId),
                    actor = entityGet(current.entities, actorId);
                  if (
                    !target?.actor ||
                    !actor ||
                    (targetId !== actorId &&
                      (!actions.allowOther || (operation === 'activate' && !actions.activateOther)))
                  )
                    return;
                  if (targetId === actorId) {
                    const active = definition.contribution
                      ? !!activeContributionId(target, definition.id, actorId)
                      : !!target.statusEffects?.[definition.id]?.active;
                    if (
                      operation === 'deactivate'
                        ? !active
                        : !canActivateStatusEffect(
                            current,
                            { subject: actor, source: actor, actionTarget: actor },
                            definition,
                          )
                    )
                      return;
                  }
                  return {
                    label:
                      targetId === actorId ? 'Yourself' : entityLabel(current, actorId, targetId),
                    kind: 'entity',
                  };
                },
              },
            },
            (_current, actorId, id, args) => ({
              id,
              actorId,
              type: 'status-effect',
              definitionId: definition.id,
              operation,
              targetId: String(args.targetId),
            }),
            {
              description: definition.meaning ?? BASE_COMMAND_DESCRIPTIONS['status-effect'],
              covers: false,
            },
          ),
      );
    });
}

const stock = simple(
  'base:transfer-stock',
  'Move a quantity of known stock',
  'transfer-stock',
  {
    sourceId: entityField('Source'),
    destinationId: entityField('Destination', ['sourceId']),
    definitionId: {
      type: 'definition',
      definitionKind: 'item',
      label: 'Known stock',
      required: true,
      dependencies: ['sourceId'],
      discovery: { source: 'choices' },
    },
    quantity: { ...quantityField, dependencies: ['sourceId', 'definitionId'] },
    minimumHeld: {
      ...quantityField,
      label: 'Amount to keep in your possessions',
      minimum: 0,
      dependencies: ['definitionId'],
    },
  },
  {
    sourceId: transferDestinations,
    destinationId: differentDestination,
    definitionId: {
      ids: ({ observed, actorId }, args) =>
        new Set(
          (args.sourceId === actorId
            ? observed.inventory
            : observed.inspectedContainer && observed.inspectedContainer.id === args.sourceId
              ? observed.inspectedContainer.items
              : []
          ).map((item) => item.definitionId),
        ),
      read(world, actorId, definitionId, args, scope) {
        const source = String(args.sourceId),
          inspection = currentInventoryInspection(world, actorId);
        const known =
          scope?.stockDefinitions.get(source) ??
          new Set(
            Array.from(
              source === actorId
                ? possessionItems(world, actorId)
                : inspection?.containerId === source
                  ? (inspectedContainer(world, actorId)?.items ?? [])
                  : [],
            ).map((item) => item.definitionId),
          );
        const definition = world.itemDefinitions[definitionId];
        return definition?.portable && known.has(definitionId)
          ? { label: definition.name, kind: 'definition' }
          : undefined;
      },
    },
  },
  (world, actorId, id, args) => {
    const definition = world.itemDefinitions[String(args.definitionId)];
    if (!definition) return unavailable();
    const pin = definitionPin(definition);
    return {
      id,
      actorId,
      type: 'transfer-stock',
      sourceId: String(args.sourceId),
      destinationId: String(args.destinationId),
      definitionId: pin.id,
      definitionVersion: pin.version,
      definitionDigest: pin.digest,
      quantity: Number(args.quantity),
      minimumHeld: Number(args.minimumHeld),
    };
  },
  {
    covers: false,
    quantity: 'known-stock',
    description:
      'Move an exact quantity of a known kind between your possessions and a currently inspected accessible container, keeping the chosen amount in your possession.',
  },
);

const coaching: Form = {
  id: 'base:request-coaching',
  type: 'coaching',
  roles: { targetId: people },
  descriptor(world, actorId) {
    const actor = actorId ? entityGet(world.entities, actorId) : undefined;
    return {
      id: this.id,
      label: 'Ask for coaching',
      description: BASE_COMMAND_DESCRIPTIONS.coaching!,
      requires: ['coaching'],
      fields: {
        attributeId: choiceField(
          'Practiced skill',
          actor
            ? practiceStatus(world, actor).map((skill) => ({ value: skill.id, label: skill.name }))
            : [],
        ),
        targetId: entityField('Person'),
      },
    };
  },
  // Replies and feedback keep their existing exact episode bindings. Asking is
  // only a request; it does not promise another person's participation.
  bind: (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'coaching',
    operation: 'request',
    attributeId: String(args.attributeId),
    targetId: String(args.targetId),
  }),
};
const treatment: Form = {
  id: 'base:treat-own-scar',
  type: 'treat-scar',
  roles: { targetId: perceived(replacementRest) },
  descriptor(world, actorId) {
    const policy = reincarnationPolicy(world),
      scars = actorId && entityGet(world.entities, actorId)?.actor?.scars;
    return {
      id: this.id,
      label: policy?.treatmentLabel ?? 'Treat a scar',
      description: BASE_COMMAND_DESCRIPTIONS['treat-scar']!,
      requires: ['treat-scar'],
      fields: {
        scarId: choiceField(
          'Your scar',
          policy?.treatment && scars
            ? policy.scars
                .filter((scar) => scars[scar.id])
                .map((scar) => ({ value: scar.id, label: scar.name }))
            : [],
        ),
        targetId: entityField('Recovery place'),
      },
    };
  },
  bind: (_world, actorId, id, args) => ({
    id,
    actorId,
    type: 'treat-scar',
    scarId: String(args.scarId),
    targetId: String(args.targetId),
  }),
};

function boundaryPart(world: WorldState, itemId: string) {
  const item = entityGet(world.entities, itemId),
    placement = item?.placement;
  if (!isAssemblyPlacement(placement)) return;
  const root = entityGet(world.entities, placement.parentEntityId),
    component = root?.assembly;
  const family = component && world.assemblyFamilies?.[component.family.id];
  return root &&
    component?.implementation === 'grounded-panel-boundary' &&
    !component.retired &&
    family?.implementation === component.implementation &&
    component.parts[itemId]
    ? { root, component, family, part: component.parts[itemId]! }
    : undefined;
}
const boundaryParts = (gate: boolean): Role => ({
  ids: ({ observed }) => observed.visibleEntities.map((entity) => entity.id),
  read(world, actorId, itemId, _args, scope) {
    const details = boundaryPart(world, itemId),
      actor = entityGet(world.entities, actorId);
    if (
      !details ||
      !actor ||
      (gate
        ? !details.component.gates[itemId]
        : !details.family.damage || details.part.role === 'binding')
    )
      return;
    const sight = scope
      ? (scope.sight ??= pointVisionQuery(world, actor))
      : pointVisionQuery(world, actor);
    let faces = scope?.boundaryFaces.get(details.root.id);
    if (!faces) {
      faces = boundaryMaterialWorkQuery(world, details.root.id, actorId);
      scope?.boundaryFaces.set(details.root.id, faces);
    }
    if (!faces(itemId).some((face) => sight(face.point))) return;
    return { label: entityLabel(world, actorId, itemId), kind: 'entity' };
  },
});
const gate = simple(
  'base:use-gate',
  'Use a gate',
  'operate-gate',
  {
    itemId: entityField('Gate'),
    operation: choiceField('Use', [
      { value: 'open', label: 'Open' },
      { value: 'close', label: 'Close' },
      { value: 'bar', label: 'Bar from inside' },
      { value: 'unbar', label: 'Unbar from inside' },
    ]),
  },
  { itemId: boundaryParts(true) },
  (world, actorId, id, args) => {
    const details = boundaryPart(world, String(args.itemId));
    if (!details) return unavailable();
    const pin = definitionPin(details.family);
    return {
      id,
      actorId,
      type: 'operate-gate',
      assemblyId: details.root.id,
      itemId: String(args.itemId),
      operation: args.operation as 'open' | 'close' | 'bar' | 'unbar',
      familyId: pin.id,
      familyVersion: pin.version,
      familyDigest: pin.digest,
      expectedRevision: details.component.revision,
    };
  },
  { covers: false },
);
const impact = simple(
  'base:impact-structure',
  'Strike a structural part',
  'impact-boundary',
  {
    itemId: entityField('Visible structural part'),
    toolId: entityField('Carried tool', ['itemId']),
  },
  {
    itemId: boundaryParts(false),
    toolId: carried((world, item, args) => {
      const details = boundaryPart(world, String(args.itemId)),
        pin = entityGet(world.entities, item.id)?.item?.definitionPin;
      return (
        !!pin &&
        !!details?.family.damage?.tools.some((tool) => sameDefinitionPin(tool.definition, pin))
      );
    }),
  },
  (world, actorId, id, args) => {
    const details = boundaryPart(world, String(args.itemId));
    if (!details) return unavailable();
    const pin = definitionPin(details.family);
    return {
      id,
      actorId,
      type: 'impact-boundary',
      assemblyId: details.root.id,
      itemId: String(args.itemId),
      toolId: String(args.toolId),
      familyId: pin.id,
      familyVersion: pin.version,
      familyDigest: pin.digest,
    };
  },
  { covers: false },
);
const placeFire: Form = {
  id: 'base:place-fire',
  type: 'place-hearth',
  roles: {},
  descriptor(world, actorId) {
    const actor = actorId ? entityGet(world.entities, actorId) : undefined,
      site = constructionProfile(world)?.profile.suggested;
    return {
      id: this.id,
      label: 'Place a fire at the selected construction site',
      description: BASE_COMMAND_DESCRIPTIONS['place-hearth']!,
      requires: ['place-hearth'],
      fields: {
        definitionId: choiceField(
          'Fire construction',
          Object.values(world.hearthDefinitions ?? {}).map((definition) => ({
            value: definition.id,
            label: definition.actionLabel,
          })),
        ),
        site: choiceField(
          'Personally visible site',
          actor && site && pointVisionQuery(world, actor)(site)
            ? [{ value: canonicalJson(site), label: 'Selected construction site' }]
            : [],
        ),
      },
    };
  },
  bind(world, actorId, id, args) {
    const definition = world.hearthDefinitions?.[String(args.definitionId)],
      site = constructionProfile(world)?.profile.suggested;
    if (!definition || !site || canonicalJson(site) !== args.site) return unavailable();
    const pin = definitionPin(definition);
    return {
      id,
      actorId,
      type: 'place-hearth',
      definitionId: pin.id,
      definitionVersion: pin.version,
      definitionDigest: pin.digest,
      destination: { ...site },
    };
  },
};

// Each form belongs to a selected base-world host. This list contains authored
// meanings, not a second command executor or an ambient installation grant.
const forms = [
  gift,
  inspectOwn,
  inspectContainer,
  inspectRecord,
  inspectWork,
  transfer,
  stock,
  equip,
  unequip,
  guard,
  guardTarget,
  naturalStrike,
  weaponStrike,
  ...rangedForms,
  release,
  fish,
  harvest,
  feed,
  teach,
  coaching,
  learnRecord,
  evade,
  treatment,
  gate,
  impact,
  placeFire,
  ...fireForms,
];

export function baseNativeRequestSupport(
  types: readonly Command['type'][],
): Pick<
  ActivityHostDescriptor,
  | 'requestDescriptors'
  | 'compileRequest'
  | 'requestChoice'
  | 'requestChoices'
  | 'requestRoleEntityIds'
> {
  const staticForms = forms.filter((form) => types.includes(form.type)),
    byId = new Map(staticForms.map((form) => [form.id, form]));
  const selected = (world: WorldState) => [
    ...staticForms,
    ...(types.includes('cook') ? preparationForms(world) : []),
    ...(types.includes('status-effect') ? statusForms(world) : []),
  ];
  const find = (world: WorldState, family: string) => {
    const existing = byId.get(family);
    if (existing) return existing;
    if (types.includes('cook') && family.startsWith('base:prepare:'))
      return preparationForms(world, family.slice('base:prepare:'.length))[0];
    if (types.includes('status-effect') && family.startsWith('base:state:')) {
      const operation = family.endsWith(':activate')
        ? 'activate'
        : family.endsWith(':deactivate')
          ? 'deactivate'
          : undefined;
      if (operation)
        return statusForms(
          world,
          family.slice('base:state:'.length, -(operation.length + 1)),
          operation,
        )[0];
    }
    return undefined;
  };
  return nativeRequestSupport(selected, find);
}
