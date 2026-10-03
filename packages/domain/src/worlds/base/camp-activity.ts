import type {
  ActivityHostDescriptor,
  ActivityRequest,
  ActivityRequestDescriptor,
  ActivityRequestChoice,
} from '../../activity-hosts.js';
import { activityHostForCommand, activityHostPin } from '../../activity-hosts.js';
import type { ActivityNode, ActivityArgument } from '../../action-experience.js';
import { ACTIVITY_LIMITS } from '../../action-experience.js';
import { targetApproachPoint } from '../../action-capabilities.js';
import { inspectedContainer, currentInventoryInspection } from '../../inventory-inspection.js';
import { accessiblePossession, canAccessContainer, possessionItems } from '../../object-access.js';
import { custodian, objectAncestors, itemFor } from '../../objects.js';
import { proveAvailableStock, STOCK_TRANSFER_LIMITS } from '../../stock-transfer.js';
import { gatheringYield } from '../../gathering.js';
import { seesEntity } from '../../perception.js';
import { canReachEntity } from '../../spatial.js';
import { itemDefinitionPin } from '../../resource-claims.js';
import { outcome } from '../../events.js';
import { isFuel, fireFuelDescription } from './fire.js';
import { observeActor } from '../../kernel.js';
import { worldPosition } from '../../spatial-state.js';
import { observerDescription } from './knowledge.js';
import type { Command, WorldState, Outcome } from '../../types.js';
import { isSafeRecordId, getOwn } from '../../records.js';

const entity = (label: string, source: 'spatial' | 'storage') => ({
  type: 'entity' as const,
  label,
  required: true as const,
  discovery: { source },
});
/** Authored camp request tuning; native admission still applies its own bounds. */
export const BASE_CAMP_ACTIVITY_RULES = {
  maximumFuelUnits: 16,
  maximumFuelAttempts: 16,
  minimumDuration: 60,
  maximumDuration: 86400,
};
const integer = (label: string, minimum: number, maximum = 1000) => ({
  type: 'integer' as const,
  label,
  minimum,
  maximum,
  required: true as const,
});
const common = {
  fireId: entity('Fire', 'spatial'),
  definitionId: {
    type: 'definition' as const,
    label: 'Fuel material',
    required: true as const,
    discovery: { source: 'materials' as const, sourceField: 'sourceId' },
  },
  minimumHeld: integer('Leave at least this many available to me', 0),
  mode: { type: 'mode' as const, label: 'Current work', required: true as const },
};
const requests: ActivityRequestDescriptor[] = [
  {
    id: 'base:camp-supply-method',
    label: 'Gather, return, pack and fuel',
    description:
      'Gather once from your selected source, return to this container’s current position, pack an exact quantity and add one fuel unit. Later steps can fail when yield, access or stock changes.',
    fields: {
      sourceId: entity('Gathering source', 'spatial'),
      containerId: entity('Camp container', 'storage'),
      ...common,
      quantity: integer('Put this many into the container', 1),
    },
  },
  {
    id: 'base:fire-watch',
    label: 'Watch this fire for one session',
    description:
      'Stay here and attend to this burning fire until your stopping time. Use only your chosen supply. It does not gather, follow a moved cache, relight a fire, or teach a conditional method.',
    fields: {
      sourceId: entity('Fuel supply', 'storage'),
      ...common,
      deadline: {
        type: 'time',
        label: 'Stopping time',
        minimum: 0,
        minimumDuration: BASE_CAMP_ACTIVITY_RULES.minimumDuration,
        maximumDuration: BASE_CAMP_ACTIVITY_RULES.maximumDuration,
        required: true,
      },
      maxUnits: integer('Maximum fuel units', 1, BASE_CAMP_ACTIVITY_RULES.maximumFuelUnits),
      maxAttempts: integer(
        'Maximum fuel attempts',
        1,
        BASE_CAMP_ACTIVITY_RULES.maximumFuelAttempts,
      ),
    },
  },
];
const literal = (value: string | number | boolean): ActivityArgument => ({ literal: value });
const role = (value: string): ActivityArgument => ({ role: value });
function compile(
  world: WorldState,
  actorId: string,
  id: string,
  request: ActivityRequest,
  permitted?: readonly string[],
): Command | Outcome {
  const descriptor = requests.find((value) => value.id === request.family);
  const args = request.arguments;
  const refuse = (message: string) => outcome(false, 'activity-choices', message);
  if (
    !descriptor ||
    !args ||
    typeof args !== 'object' ||
    Array.isArray(args) ||
    Object.keys(args).sort().join(',') !== Object.keys(descriptor.fields).sort().join(',')
  )
    return refuse('Choose every requested activity parameter.');
  for (const [key, field] of Object.entries(descriptor.fields)) {
    const value = args[key];
    if (field.type === 'integer' || field.type === 'time') {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        (field.type === 'integer' && !Number.isSafeInteger(value)) ||
        value < (field.minimum ?? 0) ||
        value > (field.maximum ?? Infinity)
      )
        return refuse(`Choose a valid ${field.label.toLowerCase()}.`);
    } else if (
      typeof value !== 'string' ||
      !value.length ||
      value.length > 120 ||
      (field.type !== 'mode' && !isSafeRecordId(value))
    )
      return refuse(`Choose ${field.label.toLowerCase()}.`);
  }
  const mode = args.mode;
  if (mode !== 'enqueue' && mode !== 'replace' && mode !== 'interrupt')
    return refuse('Choose whether to enqueue, replace or interrupt current work.');
  const actor = getOwn(world.entities, actorId),
    sourceId = String(args.sourceId),
    fireId = String(args.fireId),
    definition = getOwn(world.itemDefinitions, String(args.definitionId));
  const fire = getOwn(world.entities, fireId),
    source = getOwn(world.entities, sourceId);
  const known = (targetId: string) =>
    targetId === actorId ||
    (permitted?.includes(targetId) !== false &&
      (accessiblePossession(world, actorId, targetId) ||
        inspectedContainer(world, actorId)?.id === targetId ||
        (!!world.entities[targetId] && seesEntity(world, actor!, world.entities[targetId]!))));
  const host = activityHostForCommand(world, 'tend-fire');
  if (
    !actor?.actor ||
    !definition ||
    !isFuel(definition) ||
    !fire?.heat ||
    !known(fireId) ||
    !host?.acceptsTarget?.(world, fireId) ||
    !activityHostForCommand(world, 'transfer-stock')
  )
    return refuse('Choose a currently observed fire and supported fuel material.');
  const pin = itemDefinitionPin(definition),
    minimum = Number(args.minimumHeld);
  const fuel = (guarded: boolean, item?: ActivityArgument): ActivityNode => ({
    kind: 'invoke',
    key: 'fuel',
    name: 'Add one selected fuel unit',
    command: 'tend-fire',
    args: {
      targetId: role('fire'),
      operation: literal('fuel'),
      definitionId: literal(pin.id),
      definitionVersion: literal(pin.version),
      definitionDigest: literal(pin.digest),
      minimumHeld: literal(minimum),
      onlyWhenLow: literal(guarded),
      ...(item ? { itemId: item } : {}),
    },
  });
  const transfer = (
    sourceRole: string,
    destinationRole: string,
    quantity: number,
  ): ActivityNode => ({
    kind: 'invoke',
    key: 'pack',
    name: 'Move the exact selected stock',
    command: 'transfer-stock',
    args: {
      sourceId: role(sourceRole),
      destinationId: role(destinationRole),
      definitionId: literal(pin.id),
      definitionVersion: literal(pin.version),
      definitionDigest: literal(pin.digest),
      quantity: literal(quantity),
      minimumHeld: literal(minimum),
    },
    outputs: [{ port: pin.id, definitionId: pin.id, quantity }],
  });
  if (request.family === requests[0]!.id) {
    const containerId = String(args.containerId),
      container = world.entities[containerId];
    if (
      !source?.resource ||
      source.resource.definitionId !== pin.id ||
      !known(sourceId) ||
      !container?.container ||
      !known(containerId) ||
      !canAccessContainer(world, actorId, containerId) ||
      (custodian(world, containerId) !== actorId &&
        inspectedContainer(world, actorId)?.id !== containerId)
    )
      return refuse(
        'Choose a visible source of this material and an accessible camp container. Inspect a ground container first.',
      );
    const root = objectAncestors(world, containerId).find(
      (value) => value.placement?.mode === 'world',
    );
    const point = root && targetApproachPoint(world, actor, root);
    if (!point) return refuse('The selected return point cannot currently be reached.');
    return {
      id,
      actorId,
      type: 'compose',
      name: descriptor.label,
      purpose: descriptor.label,
      mode,
      bindings: {
        source: sourceId,
        return: point,
        self: actorId,
        container: containerId,
        fire: fireId,
      },
      root: {
        kind: 'sequence',
        name: descriptor.label,
        children: [
          {
            kind: 'invoke',
            key: 'gather',
            name: 'Gather from my selected source',
            command: 'gather',
            args: { targetId: role('source') },
          },
          {
            kind: 'invoke',
            key: 'return',
            name: 'Return to the selected camp position',
            command: 'move',
            args: { destination: role('return') },
          },
          transfer('self', 'container', Number(args.quantity)),
          fuel(false),
        ],
      },
    };
  }
  const deadline = Number(args.deadline);
  if (
    deadline <= world.simTime ||
    deadline - world.simTime > descriptor.fields.deadline!.maximumDuration! ||
    !fire.heat.lit ||
    !canReachEntity(world, actor, fire, world.itemHandling.reach) ||
    host.evaluateCondition?.(world, actorId, fireId).value === undefined
  )
    return refuse('Choose a burning fire within reach and a stopping time within one game day.');
  if (
    sourceId !== actorId &&
    (!source?.container ||
      !known(sourceId) ||
      !canAccessContainer(world, actorId, sourceId) ||
      (inspectedContainer(world, actorId)?.id !== sourceId &&
        !accessiblePossession(world, actorId, sourceId)))
  )
    return refuse('Choose your own possessions or inspect one reachable fuel cache.');
  let materialKnown =
    inspectedContainer(world, actorId)?.id === sourceId &&
    inspectedContainer(world, actorId)!.items.some((item) => item.definitionId === pin.id);
  const ownInspection = currentInventoryInspection(world, actorId);
  if (sourceId === actorId || accessiblePossession(world, actorId, sourceId))
    materialKnown ||= !!ownInspection?.itemIds.some((id) => {
      const item = itemFor(world, id);
      return (
        item?.definitionId === pin.id &&
        accessiblePossession(world, actorId, id) &&
        objectAncestors(world, id).some((entry) => entry.id === sourceId)
      );
    });
  let examined = 0;
  if (sourceId === actorId || accessiblePossession(world, actorId, sourceId))
    for (const item of possessionItems(world, actorId)) {
      if (++examined > 200) break;
      if (
        item.definitionId === pin.id &&
        objectAncestors(world, item.id).some((entry) => entry.id === sourceId)
      ) {
        materialKnown = true;
        break;
      }
    }
  if (!materialKnown)
    return refuse(
      'Inspect your selected supply to identify this fuel material. A partial page does not prove the whole cache is empty.',
    );
  const low = { test: 'registered' as const, definition: activityHostPin(host), role: 'fire' };
  const wait: ActivityNode = {
    kind: 'wait',
    name: 'Wait until fuel is visibly low',
    until: low,
    seconds: ACTIVITY_LIMITS.waitSeconds,
  };
  const cache = sourceId !== actorId;
  const body: ActivityNode = {
    kind: 'sequence',
    name: 'Attend when fuel is visibly low',
    children: [
      ...(cache ? [transfer('supply', 'self', 1)] : []),
      fuel(true, cache ? { output: 'pack', port: pin.id, quantity: 1 } : undefined),
      wait,
    ],
  };
  return {
    id,
    actorId,
    type: 'compose',
    name: descriptor.label,
    purpose: descriptor.label,
    mode,
    bindings: { fire: fireId, ...(cache ? { supply: sourceId, self: actorId } : {}) },
    control: {
      deadline,
      observation: { definition: activityHostPin(host), role: 'fire' },
      accessRoles: cache ? ['supply'] : [],
      reachRoles: ['fire'],
      budget: {
        command: 'tend-fire',
        maximumAttempts: Number(args.maxAttempts),
        maximumSpent: Number(args.maxUnits),
      },
    },
    root: {
      kind: 'sequence',
      name: descriptor.label,
      children: [
        wait,
        {
          kind: 'repeat',
          name: 'Care until my chosen stopping time',
          until: { test: 'time', at: deadline },
          maximum: ACTIVITY_LIMITS.iterations,
          body,
        },
      ],
    },
  };
}
/** These are world-authored selected compositions, never automatic camp goals. */
export const BASE_CAMP_ACTIVITY_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'base:camp-activities',
    version: 1,
    interface: 'activity-host-v1',
    implementationVersion: 1,
    commands: [],
    deadlineSafeCommands: [],
    requests,
  },
  compileRequest: compile,
  reviewRequest(world, actorId, request) {
    const args = request.arguments,
      definition = world.itemDefinitions[String(args.definitionId)]!,
      minimum = Number(args.minimumHeld),
      finite = request.family === requests[0]!.id,
      ownSupply =
        String(args.sourceId) === actorId || custodian(world, String(args.sourceId)) === actorId;
    const actor = world.entities[actorId]!.actor!,
      plan = actor.agency.plan;
    if (
      args.mode !== 'enqueue' &&
      (actor.action ||
        plan?.status === 'active' ||
        plan?.status === 'blocked' ||
        actor.agency.suspended)
    )
      return [
        'Pausing or replacing current work can release its claims and change available supplies. Current work is not stopped by review; future supply and gathering yield remain uncertain. Review reserves nothing.',
      ];
    // Preview admission already validated every reference and field. Never inspect
    // another page/cache to turn partial knowledge into a complete supply count.
    // docs/projects/next-playable-week/camp-activities.md#finite-gather-pack-and-fuel-method
    if (!finite && !ownSupply) {
      const selected = inspectedContainer(world, actorId);
      const listed =
        selected?.items
          .filter((item) => item.definitionId === definition.id)
          .reduce((sum, item) => sum + item.quantity, 0) ?? 0;
      return [
        `This permitted inspection page lists ${listed} matching fuel units. It is not a complete available-stock proof. The chosen maximum is ${args.maxUnits}; later access, claims and your personal minimum still apply.`,
      ];
    }
    const staysOwn = finite && custodian(world, String(args.containerId)) === actorId;
    const required = finite
      ? staysOwn
        ? Math.max(Number(args.quantity), minimum + 1)
        : Number(args.quantity) + minimum + 1
      : minimum + Number(args.maxUnits);
    const proof = proveAvailableStock(world, actorId, itemDefinitionPin(definition), required);
    if (proof.status === 'incomplete' || proof.status === 'unavailable')
      return [
        'Current available fuel cannot be completely proved within this review. Missing evidence is not empty stock; later work can stop.',
      ];
    if (!finite) {
      const supply =
        String(args.sourceId) === actorId
          ? proof
          : proveAvailableStock(
              world,
              actorId,
              itemDefinitionPin(definition),
              Number(args.maxUnits),
              { sourceId: String(args.sourceId) },
            );
      if (supply.status === 'incomplete' || supply.status === 'unavailable')
        return [
          'The selected supply cannot be completely proved within this review. Missing evidence is not empty stock; later work can stop.',
        ];
      const notes = [
        `At least ${supply.available} matching units are currently available in the selected supply, and at least ${proof.available} among all accessible own possessions. Funding the full maximum would require ${required} total available units while leaving your chosen minimum ${minimum}. The watch may use fewer; review reserves nothing.`,
      ];
      if (proof.status === 'insufficient' || supply.status === 'insufficient')
        notes.push(
          'Current supply cannot fund the entire chosen fuel budget while leaving that minimum. The watch may need fewer units or stop early.',
        );
      return notes;
    }
    const notes = [
      `At least ${proof.available} matching units are currently available among your accessible possessions. This finite request needs ${required} units under unchanged conditions, including the chosen personal minimum ${minimum}. Review reserves nothing.`,
    ];
    const definitions = [];
    const items = possessionItems(world, actorId);
    let complete = false;
    for (let count = 0; count < STOCK_TRANSFER_LIMITS.examined; count++) {
      const next = items.next();
      if (next.done) {
        complete = true;
        break;
      }
      definitions.push(world.itemDefinitions[next.value.definitionId]);
    }
    const yieldLimit = gatheringYield(definitions, definition.id);
    if (proof.status === 'insufficient' && complete && proof.available + yieldLimit < required)
      notes.push(
        `Known shortfall under current conditions: even a full ${yieldLimit}-unit gathering batch would leave this request short. Change the quantity or supplies before expecting completion.`,
      );
    else
      notes.push(
        'The selected gathering happens once; its future yield is uncertain and later access, capacity or stock can change. A feasible first step does not promise completion.',
      );
    return notes;
  },
  requestChoice(world, actorId, requestId, fieldId, candidateId) {
    const finite = requestId === requests[0]!.id;
    const target = world.entities[candidateId];
    const choice = (
      id: string,
      label: string,
      kind: 'entity' | 'definition' = 'entity',
      reason?: string,
    ): ActivityRequestChoice => ({
      id,
      label,
      kind,
      roles: [fieldId],
      requestIds: [requestId],
      accessible: true,
      ...(reason ? { reason } : {}),
    });
    if (
      fieldId === 'fireId' &&
      target?.heat &&
      activityHostForCommand(world, 'tend-fire')?.acceptsTarget?.(world, candidateId)
    )
      return choice(
        candidateId,
        observerDescription(world, actorId, candidateId),
        'entity',
        `${fireFuelDescription(target.heat)}. A full fire can refuse additional fuel.`,
      );
    if (
      fieldId === 'sourceId' &&
      finite &&
      target?.resource &&
      isFuel(world.itemDefinitions[target.resource.definitionId]!)
    )
      return choice(candidateId, observerDescription(world, actorId, candidateId));
    if (
      (fieldId === 'containerId' || (fieldId === 'sourceId' && !finite)) &&
      (target?.container || (!finite && candidateId === actorId))
    )
      return choice(
        candidateId,
        candidateId === actorId
          ? 'My accessible possessions'
          : observerDescription(world, actorId, candidateId),
      );
    if (fieldId === 'definitionId') {
      const definitionId = target?.item?.definitionPin.id ?? target?.resource?.definitionId;
      const definition = definitionId && world.itemDefinitions[definitionId];
      if (definition && isFuel(definition))
        return choice(definition.id, definition.name, 'definition');
    }
    return undefined;
  },
  requestChoices(world, actorId, prepared) {
    const observed = prepared ?? observeActor(world, actorId, { includeMemories: false });
    if (!observed) return { choices: [], warnings: ['Your character is unavailable.'] };
    const choices: ActivityRequestChoice[] = [
      {
        id: actorId,
        label: 'My accessible possessions',
        kind: 'entity',
        roles: ['sourceId'],
        requestIds: [requests[1]!.id],
        distance: 0,
        accessible: true,
      },
    ];
    const definitions = new Set<string>(),
      warnings: string[] = [];
    const addDefinition = (definitionId: string) => {
      const definition = world.itemDefinitions[definitionId];
      if (!definition || !isFuel(definition) || definitions.has(definitionId)) return;
      definitions.add(definitionId);
      choices.push({
        id: definitionId,
        label: definition.name,
        kind: 'definition',
        roles: ['definitionId'],
        accessible: true,
      });
    };
    const position = worldPosition(observed.actor);
    for (const target of observed.visibleEntities.slice(0, 32)) {
      const roles =
        target.resource && isFuel(world.itemDefinitions[target.resource.definitionId]!)
          ? ['sourceId']
          : target.heat
            ? ['fireId']
            : [];
      if (!roles.length) continue;
      const here = worldPosition(target),
        distance = Math.hypot(here.x - position.x, here.y - position.y, here.z - position.z);
      choices.push({
        id: target.id,
        label: observerDescription(world, actorId, target.id),
        kind: 'entity',
        roles,
        ...(target.resource ? { requestIds: [requests[0]!.id] } : {}),
        distance,
        accessible: true,
      });
      if (target.resource) addDefinition(target.resource.definitionId);
      if (target.heat)
        warnings.push(
          `${observerDescription(world, actorId, target.id)}: ${fireFuelDescription(target.heat)}. A full fire can refuse additional fuel; waiting alone is not a fuel-care result.`,
        );
    }
    let count = 0;
    for (const item of observed.inventory) {
      if (++count > 32) {
        warnings.push('Some possessions are omitted. Inspect or narrow your selected supply.');
        break;
      }
      addDefinition(item.definitionId);
      if (item.container) {
        const choice = {
          id: item.id,
          label: world.itemDefinitions[item.definitionId]!.name,
          kind: 'entity' as const,
          distance: 0,
          accessible: true,
        };
        choices.push(
          { ...choice, roles: ['containerId'], requestIds: [requests[0]!.id] },
          { ...choice, roles: ['sourceId'], requestIds: [requests[1]!.id] },
        );
      }
    }
    const selected = prepared ? prepared.inspectedContainer : inspectedContainer(world, actorId);
    if (selected && !choices.some((choice) => choice.id === selected.id)) {
      const root = objectAncestors(world, selected.id).at(-1)!,
        here = worldPosition(root);
      const choice = {
        id: selected.id,
        label: selected.name,
        kind: 'entity' as const,
        distance: Math.hypot(here.x - position.x, here.y - position.y, here.z - position.z),
        accessible: true,
      };
      choices.push(
        { ...choice, roles: ['containerId'], requestIds: [requests[0]!.id] },
        { ...choice, roles: ['sourceId'], requestIds: [requests[1]!.id] },
      );
      selected.items.forEach((item) => addDefinition(item.definitionId));
      if (selected.inspection.more)
        warnings.push(
          'The selected cache has further inspection pages; this page is not a complete stock count.',
        );
    }
    if (observed.visibleEntities.length > 32)
      warnings.push('Some visible choices are omitted. Select or inspect a narrower target.');
    return { choices, warnings };
  },
};
