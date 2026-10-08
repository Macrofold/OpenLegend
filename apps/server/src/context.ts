import { outingActions } from './outing-view.js';
import { competenceOptions, competenceContext } from './competence-actions.js';
import { namePhrase, type Named } from '@open-legend/language';
import { learnedActivityCandidates } from './activity-context.js';
import { consumptionDescription } from './body-services.js';
import { applicableConsumption } from '@open-legend/domain';
import { worldPosition } from '@open-legend/domain';
import { decisionObservation } from './decision-observation.js';
import {
  itemFor,
  canAccessContainer,
  currentInventoryInspection,
  inspectedRecipeRecords,
  inspectedContainer,
  availableItemQuantity,
  effectivePosition,
} from '@open-legend/domain';
import { inventionMaterials } from './invention-context.js';
import { observerDescription, observerName } from '@open-legend/domain';
import { dropItemReason } from '@open-legend/domain';
import { pickupActions } from './item-actions.js';
import { statusEffectActions } from './status-effect-actions.js';
import {
  availableStrikes,
  strikeDefinition,
  huntingDescription,
  observedAnimalHealth,
  describeAttack,
} from '@open-legend/domain';
import {
  canReachEntity,
  findApproachPath,
  sameSurfacePoint,
  supportsManualWork,
  inventionFamily,
  recipeFamily,
} from '@open-legend/domain';
import { attributeDefinition, readAttribute, offerRecipientProblem } from '@open-legend/domain';
import { hearsEntity, visionRadius } from '@open-legend/domain';
import { fireCareOptions } from './fire-actions.js';
import { handoverOptions } from './handover-actions.js';
import {
  BASE_FIRE_CARE,
  findPath,
  NATIVE_PREPARATIONS,
  queryMemories,
  mindFor,
  SIMULATION_RULES,
  gatheringYield,
  gatheringDescription,
  type Entity,
  type ItemDefinition,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
import type { WorldService } from './world-service.js';

// Describe the native batch, not an invented quantity choice. Interpretation may
// compose these steps but cannot rewrite their arguments or effects.
function gatherDescription(
  service: WorldService,
  entity: Entity,
  tools: ItemDefinition[],
  completeInventory: boolean,
): string {
  const resource = entity.resource!;
  return gatheringDescription(
    entity.name,
    service.world.itemDefinitions[resource.definitionId]?.name ?? 'material',
    Math.min(resource.quantity, gatheringYield(tools, resource.definitionId)),
    resource.quantity,
    resource.workSeconds,
    completeInventory,
  );
}

/** Only actual observed possessions establish carried capability. Known recipes and
 * ground items also have permitted definitions; they cannot count as carried tools. */
function carriedGatheringTools(observed: NonNullable<ReturnType<typeof decisionObservation>>) {
  const carried = new Set(observed.inventory.map((item) => item.definitionId));
  return observed.itemDefinitions.filter(
    (definition) => carried.has(definition.id) && definition.gatheringTool,
  );
}

function describeTargets(
  service: WorldService,
  actorId: string,
  candidates: CandidateAction[],
): CandidateAction[] {
  const health = new Map<string, string>();
  const positions = new Map<string, ReturnType<typeof effectivePosition>>();
  const origin = worldPosition(service.world.entities[actorId]!);
  return candidates.map((candidate) => {
    const command = candidate.command;
    const id = command && 'targetId' in command ? command.targetId : undefined;
    const target = id ? service.world.entities[id] : undefined;
    if (target && !health.has(target.id)) {
      health.set(target.id, observedAnimalHealth(service.world, actorId, target.id));
      positions.set(target.id, effectivePosition(service.world, target.id));
    }
    const position = target && positions.get(target.id);
    // Descriptions already use permitted names where they are constructed.
    // Substring replacement here would corrupt personal names and their articles.
    return target && position
      ? {
          ...candidate,
          description: `${candidate.description} Target: ${observerDescription(service.world, actorId, target.id)}${target.actor ? `; species: ${target.actor.species ?? 'unknown'}` : ''}.${health.get(target.id) ? ` ${health.get(target.id)}` : ''} Distance: ${Math.hypot(origin.x - position.x, origin.y - position.y, origin.z - position.z).toFixed(1)} m. Route length is not known.`,
        }
      : candidate;
  });
}

export const CONTEXT_BYTE_LIMIT = 100_000;
export class ContextBudgetError extends Error {
  constructor(
    message = 'Required actor facts exceed the 100KB context budget; this context was not sent.',
  ) {
    super(message);
    this.name = 'ContextBudgetError';
  }
}
const excerpt = (text: string, limit: number) => {
  const characters = [...text];
  return characters.length <= limit ? text : `${characters.slice(0, limit - 1).join('')}…`;
};

/** Relevance is local and deterministic. A model cannot broaden its own knowledge scope. */
export function buildContext(
  service: WorldService,
  actorId: string,
  query: string,
  retained?: ReturnType<typeof queryMemories>,
) {
  const observed = service.observe(actorId, { includeMemories: false });
  if (!observed) throw new Error('Actor unavailable');
  const words = [
    ...new Set(
      query
        .normalize('NFKC')
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu) ?? [],
    ),
  ].filter(
    (word) =>
      word.length >= 3 && !['the', 'and', 'with', 'that', 'this', 'make', 'using'].includes(word),
  );
  // Rank the entire known registry (currently capped at 64), then bound the supplied set.
  // This deterministic retrieval helps old techniques surface; it does not prove paraphrase equivalence.
  const rankedRecipes = observed.knownRecipes
    .map((recipe, index) => {
      const family = inventionFamily(recipe);
      const familyTerms = family
        ? (recipeFamily(service.world, family)?.definition.description ?? '')
        : '';
      const text =
        `${recipe.name} ${recipe.description} ${familyTerms} ${recipe.inputs.map((input) => `${input.definitionId} ${input.role}`).join(' ')}`.toLowerCase();
      return {
        recipe,
        index,
        score: words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0),
      };
    })
    .sort((a, b) => b.score - a.score || b.index - a.index)
    .slice(0, 24);
  const materials = inventionMaterials(service.world, observed);
  const inspected = inspectedContainer(service.world, actorId);
  const context = {
    world: { id: observed.worldId, profile: service.world.profile, simulationSeconds: observed.at },
    contacts: observed.contacts,
    self: { ...observed.actor, name: excerpt(observed.actor.name, 40) },
    nearby: observed.visibleEntities.map((entity) => ({
      id: entity.id,
      name: excerpt(entity.name, 40),
      kind: entity.actor ? (entity.actor.species ?? 'human') : entity.kind,
      position: worldPosition(entity),
      ...(entity.resource ? { resource: entity.resource } : {}),
      ...(entity.animal
        ? { animal: { alive: entity.actor!.alive, fleeing: entity.animal.danger > 0 } }
        : {}),
      ...(entity.actor
        ? { activity: entity.actor.action?.type ?? 'idle', alive: entity.actor.alive }
        : {}),
    })),
    // Ownership is implicit in this actor-scoped list; IDs and quantities are exact.
    inventory: observed.inventory.map(
      ({ id, definitionId, quantity, revision, placementRevision, individuality, container }) => ({
        id,
        definitionId,
        quantity,
        revision,
        placementRevision,
        individuality,
        ...(container
          ? {
              container: {
                load: container.load,
                capacity: service.world.itemDefinitions[definitionId]!.container!.capacity,
              },
            }
          : {}),
      }),
    ),
    ...(inspected
      ? {
          inspectedContainer: {
            id: inspected.id,
            name: inspected.name,
            revision: inspected.revision,
            ...(inspected.load !== undefined && inspected.capacity !== undefined
              ? { load: inspected.load, capacity: inspected.capacity }
              : {}),
            items: inspected.items.map(
              ({ id, definitionId, quantity, revision, placementRevision }) => ({
                id,
                definitionId,
                quantity,
                revision,
                placementRevision,
                name: service.world.itemDefinitions[definitionId]!.name,
              }),
            ),
            more: inspected.inspection.more,
          },
        }
      : {}),
    materials,
    knownRecipes: rankedRecipes.map(({ recipe }) => ({
      id: recipe.id,
      name: excerpt(recipe.name, 64),
      description: excerpt(recipe.description, 120),
      inputs: recipe.inputs,
      workSeconds: recipe.workSeconds,
      family: recipe.sourceCandidate.family,
      facts: recipe.facts,
    })),
    memories: (retained ?? queryMemories(service.world, actorId, { text: query, limit: 12 })).map(
      (memory) => ({
        ...memory,
        summary: excerpt(memory.summary, 220),
      }),
    ),
    recentEvents: observed.recentEvents.slice(-12).map((event) => {
      const data = Object.fromEntries(
        Object.entries(event.data ?? {}).filter(([key]) => key !== 'text'),
      );
      return {
        id: event.id,
        at: event.at,
        type: event.type,
        text: excerpt(
          typeof event.data?.['text'] === 'string' ? event.data['text'] : event.text,
          220,
        ),
        ...(event.actorId ? { actorId: event.actorId } : {}),
        ...(event.targetId ? { targetId: event.targetId } : {}),
        ...(Object.keys(data).length ? { data } : {}),
      };
    }),
    innerWorld: (() => {
      const { thoughts, receipts, ...mind } = mindFor(service.world, actorId);
      return mind;
    })(),
    request: query,
    coverage: {
      proseMayBeExcerpted: true,
      knownRecipeTotal: observed.knownRecipes.length,
      knownRecipeSupplied: rankedRecipes.length,
      memorySupplied: 0,
      recentEventSupplied: 0,
      nearbySupplied: observed.visibleEntities.length,
    },
  };
  const bytes = () => {
    context.coverage.knownRecipeSupplied = context.knownRecipes.length;
    context.coverage.memorySupplied = context.memories.length;
    context.coverage.recentEventSupplied = context.recentEvents.length;
    context.coverage.nearbySupplied = context.nearby.length;
    return Buffer.byteLength(JSON.stringify(context), 'utf8');
  };
  // Discard complete lowest-priority records, never structural JSON fragments or
  // item/material identities. Keep current speech and the best memories when possible.
  while (bytes() > CONTEXT_BYTE_LIMIT && context.knownRecipes.length > 8)
    context.knownRecipes.pop();
  while (bytes() > CONTEXT_BYTE_LIMIT && context.recentEvents.length > 4)
    context.recentEvents.shift();
  while (bytes() > CONTEXT_BYTE_LIMIT && context.memories.length > 4) context.memories.pop();
  while (bytes() > CONTEXT_BYTE_LIMIT && context.knownRecipes.length > 1)
    context.knownRecipes.pop();
  while (bytes() > CONTEXT_BYTE_LIMIT && context.nearby.length > 0) context.nearby.pop();
  while (bytes() > CONTEXT_BYTE_LIMIT && context.recentEvents.length > 1)
    context.recentEvents.shift();
  while (bytes() > CONTEXT_BYTE_LIMIT && context.memories.length > 1) context.memories.pop();
  // Even display labels are optional compared with physical fields and owned IDs.
  if (bytes() > CONTEXT_BYTE_LIMIT) for (const material of context.materials) material.name = '';
  if (bytes() > CONTEXT_BYTE_LIMIT) throw new ContextBudgetError();
  return context;
}

export interface CandidateAction {
  id: string;
  description: string;
  command: CommandInput | null;
  prerequisite?: CommandInput;
}
export function npcCandidates(
  service: WorldService,
  actorId = service.defaultResidentEntityId,
  observed = decisionObservation(service.world, actorId),
): CandidateAction[] {
  const actor = observed?.actor.actor;
  if (!observed || !actor?.alive || actor.incapacitated || service.paused) return [];
  const definitions = new Map(
    observed.itemDefinitions.map((definition) => [definition.id, definition]),
  );
  const inventory = observed.inventory.filter((item) => item.quantity > 0);
  const gatheringTools = carriedGatheringTools(observed);
  const quantity = (definitionId: string) =>
    inventory
      .filter((item) => item.definitionId === definitionId)
      .reduce((sum, item) => sum + item.quantity, 0);
  const replenishments: CandidateAction[] = observed.visibleEntities.flatMap((target) => {
    const definition =
      target.replenisher && attributeDefinition(service.world, target.replenisher.attributeId);
    if (!definition?.reservoir || readAttribute(actor, definition) === undefined) return [];
    const command: CommandInput = {
      type: 'replenish',
      targetId: target.id,
      attributeId: definition.id,
    };
    return service.previewCommand(command, actorId).ok
      ? [
          {
            id: `replenish-${target.id}`,
            description: `${definition.reservoir.actionLabel} at ${namePhrase(target, 'definite')}.`,
            command,
          },
        ]
      : [];
  });
  const cursor = currentInventoryInspection(service.world, actorId);
  const actions: CandidateAction[] = [
    ...learnedActivityCandidates(service, actorId, observed),
    ...(service.world.actionExperience.learning[actorId]
      ? [
          {
            id: 'inspect-activities',
            description:
              'Inspect a page of my own past actions, results and learned activities. This does not perform them again.',
            command: { type: 'inspect-activities' as const, historyAfter: -1 },
          },
        ]
      : []),
    {
      id: 'inspect-inventory',
      description:
        'Inspect the first page of my own accessible possessions if the selected context omits needed information. This reads at most 16 possessions; it does not change them.',
      command: { type: 'inspect-inventory' },
    },
    ...(cursor?.more && !cursor.containerId
      ? [
          {
            id: 'inspect-inventory-next',
            description:
              'Explicitly inspect the next page of my own accessible possessions, continuing my last inspection.',
            command: {
              type: 'inspect-inventory' as const,
              after: cursor.after,
              expectedRevision: cursor.revision,
              expectedScope: cursor.scope,
            },
          },
        ]
      : []),
    ...inspectedRecipeRecords(service.world, actorId).flatMap(({ definition, recipe, command }) => {
      if (service.world.knowledge[actorId]?.some((record) => record.recipeId === recipe.id))
        return [];
      return service.previewCommand(command, actorId).ok
        ? [
            {
              id: `learn-record-${command.itemId}`,
              description: `Learn ${recipe.name} from the inspected ${definition.name}. ${recipe.description} Learning makes no item and consumes no record; manufacture later needs the exact ingredients and work.`,
              command,
            },
          ]
        : [];
    }),
    ...replenishments,
    ...observed.visibleEntities.flatMap((target) =>
      pickupActions(service.world, observed.actor, target, (command) =>
        service.previewCommand(command, actorId),
      )
        .filter((option) => option.availability.ok)
        .map((option) => ({
          id: option.id,
          description: `${option.description} from ${namePhrase(target, 'definite')}.`,
          command: option.command,
        })),
    ),
    ...inventory
      .filter((item) => definitions.get(item.definitionId)?.portable === true)
      .flatMap((item) => {
        const command: CommandInput = { type: 'drop', itemId: item.id, quantity: item.quantity };
        return !dropItemReason(service.world, observed.actor, item.id, item.quantity)
          ? [
              {
                id: `drop-${item.id}`,
                description: `Drop ${item.quantity} ${definitions.get(item.definitionId)!.name} on the ground.`,
                command,
              },
            ]
          : [];
      }),
    {
      id: 'continue',
      description: actor.action
        ? `Continue the ${actor.action.type} already in progress.`
        : actor.agency.plan?.status === 'active' &&
            (actor.agency.plan.activity ||
              actor.agency.plan.steps.some(
                (step) => step.status === 'queued' || step.status === 'running',
              ))
          ? // Between steps, continuation still advances chosen work; it is not idleness.
            // docs/agent-agency.md#4-plans-preserve-continuity-without-prescribing-a-life
            'Continue the remaining chosen work, including steps not yet started. Each step rechecks its prerequisites.'
          : 'Remain in place while considering the next useful step.',
      command: null,
    },
  ];
  // Discover only known appearances, then let the actor select one exact container.
  // Its inspected page supplies take/pack choices, never an item × all-bags product.
  const knownContainers = new Map<string, Named>();
  for (const item of [...inventory, ...observed.groundItems])
    if (service.world.itemDefinitions[item.definitionId]?.container)
      knownContainers.set(item.id, service.world.itemDefinitions[item.definitionId]!);
  for (const entity of observed.visibleEntities)
    if (entity.kind === 'item-pile' || service.world.entities[entity.id]?.container)
      knownContainers.set(entity.id, observerName(service.world, actorId, entity.id));
  const accessibleContainers = [...knownContainers].filter(([id]) =>
    canAccessContainer(service.world, actorId, id),
  );
  for (const [id, name] of accessibleContainers.slice(0, 16)) {
    const location = effectivePosition(service.world, id);
    const distance = Math.hypot(
      location.x - worldPosition(observed.actor).x,
      location.y - worldPosition(observed.actor).y,
      location.z - worldPosition(observed.actor).z,
    ).toFixed(1);
    actions.push({
      id: `inspect-container:${id}`,
      description: `Inspect the first page of ${namePhrase(name, 'definite')}, currently accessible within reach, ${distance} m away. Read at most 16 direct contents; this does not move anything or reveal unopened nested bags.`,
      command: { type: 'inspect-inventory', containerId: id },
    });
  }
  if (accessibleContainers.length > 16)
    actions.push({
      id: 'inspect-container-coverage',
      description: `${accessibleContainers.length - 16} other currently accessible containers are omitted from these suggestions; choose a known container explicitly to inspect it.`,
      command: null,
    });
  const selected = observed.inspectedContainer;
  if (selected) {
    const free =
      selected.load !== undefined && selected.capacity !== undefined
        ? ` ${selected.capacity - selected.load} of ${selected.capacity} packing units are free.`
        : ' Packing capacity is not known.';
    if (selected.inspection.more)
      actions.push({
        id: `inspect-container-next:${selected.id}`,
        description: `Inspect the next page of ${namePhrase(selected, 'definite')}; additional contents remain. This continues the currently accessible container inspection.`,
        command: {
          type: 'inspect-inventory',
          containerId: selected.id,
          after: selected.inspection.after,
          expectedRevision: selected.revision,
          expectedScope: selected.inspection.scope,
        },
      });
    let suggestions = 0,
      unexamined = 0;
    for (const [direction, items, destination] of [
      ['take', selected.items, actorId],
      ['pack', inventory, selected.id],
    ] as const) {
      for (const [index, item] of items.entries()) {
        if (suggestions === 24) {
          unexamined += items.length - index;
          break;
        }
        if (item.ownerId === destination || item.id === destination) continue;
        const available = availableItemQuantity(service.world, item.id);
        if (!available) continue;
        const command: CommandInput = {
          type: 'transfer-item',
          itemId: item.id,
          quantity: available,
          targetId: destination,
          expectedRevision: item.revision,
          placementRevision: item.placementRevision,
          targetRevision: service.world.entities[destination]!.inventoryRevision ?? 0,
        };
        // The same native owner checks unknown load, nesting, reservations and access.
        // If the whole lot will not fit, offer one exact unit only when it is admitted.
        if (!service.previewCommand(command, actorId).ok) {
          if (available === 1) continue;
          command.quantity = 1;
          if (!service.previewCommand(command, actorId).ok) continue;
        }
        suggestions++;
        const name = service.world.itemDefinitions[item.definitionId]!.name;
        actions.push({
          id: `${direction}:${item.id}:${selected.id}`,
          description:
            direction === 'take'
              ? `Take ${command.quantity} ${name} from ${namePhrase(selected, 'definite')} into my possessions, currently accessible within reach.${free}`
              : `Put ${command.quantity} ${name} from my accessible possessions into ${namePhrase(selected, 'definite')}, currently within reach.${free}`,
          command,
        });
      }
    }
    if (unexamined)
      actions.push({
        id: `container-transfer-coverage:${selected.id}`,
        description: `${unexamined} known item rows were not checked for additional transfer suggestions in this decision. Exact accessible item transfers can still be selected explicitly; this is not an empty-container result.`,
        command: null,
      });
  }
  for (const target of observed.visibleEntities
    .filter((e) => e.actor?.alive && e.id !== actorId)
    .slice(0, 4)) {
    const command: CommandInput = { type: 'follow', targetId: target.id };
    if (service.previewCommand(command, actorId).ok)
      actions.push({
        id: `follow:${target.id}`,
        description: `Follow ${namePhrase(target, 'definite')} while visible; no stealth or automatic sunset stop.`,
        command,
      });
  }
  const activeId = service.world.conversations?.active[actorId];
  if (activeId) {
    const active = service.world.conversations!.records[activeId]!;
    actions.push({
      id: 'leave-conversation',
      description: 'Leave the current conversation while others may continue.',
      command: {
        type: 'conversation',
        operation: 'leave',
        conversationId: activeId,
        generation: active.generation,
      },
    });
  }
  const nearbyConversations = new Map<string, string>();
  for (const entity of observed.visibleEntities) {
    const id = service.world.conversations?.active[entity.id];
    if (id && id !== activeId && hearsEntity(service.world, observed.actor, entity))
      nearbyConversations.set(id, namePhrase(entity, 'definite'));
  }
  for (const [id, name] of nearbyConversations)
    actions.push({
      id: `join:${id}`,
      description: `Join the conversation involving ${name}.`,
      command: {
        type: 'conversation',
        operation: 'join',
        conversationId: id,
        generation: service.world.conversations!.records[id]!.generation,
      },
    });
  for (const item of inventory) {
    const definition = definitions.get(item.definitionId);
    if (definition?.nutrition && applicableConsumption(service.world, observed.actor))
      actions.push({
        id: `eat:${item.id}`,
        description: consumptionDescription(service.world, observed.actor, definition),
        command: { type: 'eat', itemId: item.id },
      });
  }
  for (const target of [
    observed.actor,
    ...observed.visibleEntities.filter((e) => e.id !== observed.actor.id),
  ])
    for (const option of statusEffectActions(service.world, observed.actor, target))
      actions.push({ id: option.id, description: option.label, command: option.command });
  // Offers and replies are immediate and never interrupt work. Replies to every pending
  // offer with a visible party are listed (bounded by three offers per offerer). New offers
  // go only to the nearest three people who can take items within reach. A player's typed
  // request names what to offer, so it may bind more lots than a character's shortlist.
  const typed = actor.controller === 'player';
  const here = worldPosition(observed.actor);
  const people = observed.visibleEntities.filter((e) => e.actor?.alive && e.id !== actorId);
  const recipients = people
    .filter((e) => !offerRecipientProblem(service.world, observed.actor, e))
    .sort(
      (a, b) =>
        Math.hypot(worldPosition(a).x - here.x, worldPosition(a).z - here.z) -
        Math.hypot(worldPosition(b).x - here.x, worldPosition(b).z - here.z),
    )
    .slice(0, 3);
  let offerCandidates = 0;
  for (const person of people) {
    const offering = recipients.includes(person);
    for (const option of handoverOptions(service.world, actorId, inventory, person, {
      offers: offering,
      maxLots: typed ? 12 : 4,
    })) {
      const isOffer =
        option.command.handoverOperation === 'offer' ||
        option.command.handoverOperation === 'counter';
      if (isOffer && offerCandidates >= (typed ? 24 : 12)) continue;
      if (!service.previewCommand(option.command, actorId).ok) continue;
      if (isOffer) offerCandidates++;
      actions.push({ id: option.id, description: option.description, command: option.command });
    }
  }
  for (const choice of outingActions(service.world, actorId)) {
    if (service.previewCommand(choice.command, actorId).ok)
      actions.push({ id: choice.id, description: choice.description, command: choice.command });
  }
  // Starting another timed task would discard actual work/materials. The actor can
  // explicitly cancel work; listing alternatives must not silently interrupt it.
  const practiceContext = competenceContext(service.world, observed.actor);
  for (const target of observed.visibleEntities)
    for (const option of competenceOptions(service.world, actorId, target, inventory))
      if (
        !(actor.action && option.command.type === 'practice-shot') &&
        service.previewCommand(option.command, actorId).ok
      )
        actions.push({
          id: option.id,
          description: `${option.description} ${practiceContext}`,
          command: option.command,
        });
  if (actor.action) return actions;

  if (visionRadius(service.world, observed.actor) === 0) {
    // Offer probes independently of hidden walkability; native admission supplies blocked feedback.
    for (const [direction, dx, dz] of [
      ['north', 0, -0.75],
      ['east', 0.75, 0],
      ['south', 0, 0.75],
      ['west', -0.75, 0],
    ] as const)
      actions.push({
        id: `probe-${direction}`,
        description: `Probe a short distance ${direction}.`,
        command: {
          type: 'move',
          position:
            sameSurfacePoint(
              service.world,
              observed.actor,
              worldPosition(observed.actor).x + dx,
              worldPosition(observed.actor).z + dz,
            ) ?? undefined,
        },
      });
    return describeTargets(service, actorId, actions);
  }
  // Locomotion is available to every capable body, independently of hand/tool work.
  // Bind a perceived destination, not continuous tracking: docs/agent-agency.md#5-trying-something-outside-the-shortlist.
  const approaches = new Map(
    observed.visibleEntities.map((entity) => [
      entity.id,
      canReachEntity(service.world, observed.actor, entity, SIMULATION_RULES.interactionRadius)
        ? { status: 'reached' as const, path: [] as import('@open-legend/spatial').SurfacePoint[] }
        : findApproachPath(
            service.world,
            observed.actor,
            entity,
            SIMULATION_RULES.interactionRadius,
          ),
    ]),
  );
  for (const entity of observed.visibleEntities) {
    const approach = approaches.get(entity.id);
    const position =
      approach?.status === 'pending' ? approach.request.destinations[0] : approach?.path.at(-1);
    if (!position) continue;
    const command: CommandInput = { type: 'move', position };
    if (service.previewCommand(command, actorId).ok)
      actions.push({
        id: `approach:${entity.id}`,
        description: `Move near the currently observed position of ${observerDescription(service.world, actorId, entity.id, 'definite')}, currently ${Math.hypot(worldPosition(observed.actor).x - worldPosition(entity).x, worldPosition(observed.actor).y - worldPosition(entity).y, worldPosition(observed.actor).z - worldPosition(entity).z).toFixed(1)} m away. Stop at the selected reachable place within ${SIMULATION_RULES.interactionRadius} m of that observed position; route length is not known. This moves to that location once; it does not follow later movement.`,
        command,
      });
  }
  if (!supportsManualWork(observed.actor)) return describeTargets(service, actorId, actions);
  for (const [preparation, recipe] of Object.entries(NATIVE_PREPARATIONS)) {
    if (quantity(recipe.input) >= recipe.inputQuantity)
      actions.push({
        id: `prepare:${preparation}`,
        description:
          preparation === 'fiber'
            ? 'Clean raw plant fibers into usable prepared fibers.'
            : 'Twist prepared fibers into binding cord.',
        command: { type: 'prepare', preparation: preparation as 'fiber' | 'cord' },
      });
  }
  const ammunitionByKind = new Map<string, (typeof inventory)[number]>();
  for (const item of inventory) {
    const kind = definitions.get(item.definitionId)?.ammunition?.kind;
    if (kind && !ammunitionByKind.has(kind)) ammunitionByKind.set(kind, item);
  }
  const compatibleAmmo = (kind: string) => ammunitionByKind.get(kind);
  for (const item of inventory) {
    const definition = definitions.get(item.definitionId);
    if (
      definition &&
      item.id !== actor.equippedItemId &&
      (definition.melee ||
        definition.gatheringTool ||
        (definition.launcher && compatibleAmmo(definition.launcher.ammunitionKind)))
    )
      actions.push({
        id: `equip:${item.id}`,
        description: `Equip ${namePhrase(definition)}: ${definition.description}`,
        command: { type: 'equip', itemId: item.id },
      });
  }
  const launchers = inventory.flatMap((item) => {
    const definition = definitions.get(item.definitionId);
    const launcher = definition?.launcher;
    const ammunition = launcher && compatibleAmmo(launcher.ammunitionKind);
    return definition &&
      launcher &&
      ammunition &&
      (item.id === actor.equippedItemId || item.quantity === 1)
      ? [{ item, definition, launcher, ammunition }]
      : [];
  });
  const cuttingTool = inventory.some((item) =>
    definitions.get(item.definitionId)?.properties.includes('point'),
  );
  const strikes = [
    ...availableStrikes(service.world, actorId),
    ...inventory
      .filter(
        (item) =>
          item.id !== actor.equippedItemId &&
          item.quantity === 1 &&
          definitions.get(item.definitionId)?.melee,
      )
      .flatMap((item) => {
        const strike = strikeDefinition(item.definitionId, service.world, item.id);
        return strike ? [strike] : [];
      }),
  ];
  const fires: { id: string; travelSeconds: number; fuelSeconds: number }[] = [];
  for (const entity of observed.visibleEntities) {
    // Target discovery uses only this actor's perception. Terrain is the same public
    // geometry used by native movement, never a search for hidden entities/items.
    // Ranged offers use their own reach, even when the target cannot be approached
    // for contact. Equal ranges share geometry work within this observed snapshot.
    if (entity.animal && entity.actor?.alive) {
      const reachable = new Map<number, boolean>();
      for (const { item, definition, launcher, ammunition } of launchers) {
        const description =
          huntingDescription(entity.actor.species, 'launcher', entity, definition) ??
          `Shoot ${namePhrase(entity)} with ${namePhrase(definition)}. One shot.`;
        if (!reachable.has(launcher.range))
          reachable.set(
            launcher.range,
            canReachEntity(service.world, observed.actor, entity, launcher.range) ||
              !!findApproachPath(service.world, observed.actor, entity, launcher.range),
          );
        if (!reachable.get(launcher.range)) continue;
        actions.push({
          id: `hunt:${item.id}:${entity.id}`,
          description: `${item.id !== actor.equippedItemId ? 'Auto-equip the chosen weapon first. ' : ''}${description} ${definition.name}: ${definition.description} ${describeAttack({ ...launcher, damage: launcher.damage + (definitions.get(ammunition.definitionId)?.ammunition?.damageBonus ?? 0), workSeconds: SIMULATION_RULES.shotSeconds })}`,
          command: {
            type: 'hunt',
            targetId: entity.id,
            itemId: item.id,
            ammunitionId: ammunition.id,
          },
          ...(item.id !== actor.equippedItemId
            ? { prerequisite: { type: 'equip' as const, itemId: item.id } }
            : {}),
        });
      }
    }
    const route = approaches.get(entity.id);
    if (!route) continue;
    const path = route.path;
    if (entity.actor?.alive && entity.id !== actorId && supportsManualWork(observed.actor)) {
      for (const definition of strikes) {
        // Authored intent describes the same finite command; equipment capability
        // supplies the variants, never a knife-name or hunger-specific rule.
        const tool = definition.weaponItemId ? definitions.get(definition.id)?.name : undefined;
        const description = huntingDescription(
          entity.actor.species,
          definition.weaponItemId ? 'melee' : 'unarmed',
          entity,
          definition.weaponItemId ? definitions.get(definition.id) : undefined,
        );
        actions.push({
          id: `${definition.id}:${definition.weaponItemId ?? 'unarmed'}:${entity.id}`,
          description: `${definition.weaponItemId && definition.weaponItemId !== actor.equippedItemId ? 'Auto-equip the chosen weapon first. ' : ''}${description ?? `${strikeDefinition(definition.id, service.world, definition.weaponItemId, entity)?.label ?? definition.label}. Approach and attempt one attack.`} ${definition.weaponItemId ? `${tool}: ${definitions.get(definition.id)!.description}` : `${definition.label} with bare hands.`} ${describeAttack(definition)}`,
          command: {
            type: 'strike',
            ...(description ? { purpose: 'Hunt once' } : {}),
            definitionId: definition.id,
            itemId: definition.weaponItemId,
            targetId: entity.id,
          },
          ...(definition.weaponItemId && definition.weaponItemId !== actor.equippedItemId
            ? { prerequisite: { type: 'equip' as const, itemId: definition.weaponItemId } }
            : {}),
        });
      }
    }
    if (entity.resource && entity.resource.quantity > 0)
      actions.push({
        id: `gather:${entity.id}`,
        description: gatherDescription(
          service,
          entity,
          gatheringTools,
          !observed.inventoryCoverage.paged,
        ),
        command: { type: 'gather', targetId: entity.id },
      });
    if (
      entity.remains &&
      !entity.remains.harvested &&
      entity.remains.yields.some((item) => item.quantity > 0) &&
      cuttingTool
    )
      actions.push({
        id: `harvest:${entity.id}`,
        description: `Harvest ${entity.remains.yields
          .filter((item) => item.quantity > 0)
          .map(
            (item) =>
              `${item.quantity} × ${service.world.itemDefinitions[item.definitionId]!.name}`,
          )
          .join(', ')} from ${namePhrase(entity, 'definite')} using a carried cutting tool.`,
        command: { type: 'harvest', targetId: entity.id },
      });
    // Fire care is offered per perceived fire from current state; native admission rechecks it.
    if (entity.heat)
      for (const option of fireCareOptions(service.world, inventory, entity))
        if (service.previewCommand(option.command, actorId).ok)
          actions.push({ id: option.id, description: option.description, command: option.command });
    if (entity.heat?.lit) {
      let previous = worldPosition(observed.actor);
      // Pending detours are not yet a travel-time promise; fuel is rechecked at work start.
      let length =
        route.status === 'pending'
          ? Math.hypot(
              worldPosition(entity).x - previous.x,
              worldPosition(entity).y - previous.y,
              worldPosition(entity).z - previous.z,
            )
          : 0;
      for (const point of path) {
        length += Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z);
        previous = point;
      }
      fires.push({
        id: entity.id,
        travelSeconds: length / SIMULATION_RULES.movementTilesPerSecond,
        fuelSeconds: entity.heat.fuelSeconds,
      });
    }
  }
  const cookingFire = fires
    .filter((fire) => fire.fuelSeconds > fire.travelSeconds + SIMULATION_RULES.cookSeconds + 2)
    .sort((a, b) => a.travelSeconds - b.travelSeconds || a.id.localeCompare(b.id))[0];
  if (cookingFire)
    for (const item of inventory) {
      if (item.definitionId === 'raw_meat')
        actions.push({
          id: `cook:${item.id}`,
          description: 'Cook one raw meat over the nearby lit campfire before eating it.',
          command: { type: 'cook', itemId: item.id, targetId: cookingFire.id },
        });
    }
  for (const recipe of observed.knownRecipes) {
    const required = new Map<string, number>();
    for (const input of recipe.inputs)
      required.set(input.definitionId, (required.get(input.definitionId) ?? 0) + input.quantity);
    if ([...required].every(([definitionId, amount]) => quantity(definitionId) >= amount))
      actions.push({
        id: `craft:${recipe.id}`,
        description: `Craft the learned ${recipe.name} using the materials already carried.`,
        command: { type: 'craft', recipeId: recipe.id },
      });
  }
  return describeTargets(service, actorId, actions);
}

/** Known techniques are valid planning vocabulary before their materials are owned.
 * Admission queues intentions; native dispatch still owns all physical prerequisites.
 */
export function planningCandidates(
  service: WorldService,
  actorId: string,
  observed = decisionObservation(service.world, actorId),
): CandidateAction[] {
  if (!observed || !supportsManualWork(observed.actor)) return [];
  const gatheringTools = carriedGatheringTools(observed);
  return describeTargets(service, actorId, [
    ...observed.visibleEntities
      .filter((entity) => entity.resource && entity.resource.quantity > 0)
      .map((entity) => ({
        id: `plan-gather:${entity.id}`,
        description: gatherDescription(
          service,
          entity,
          gatheringTools,
          !observed.inventoryCoverage.paged,
        ),
        command: { type: 'gather' as const, targetId: entity.id },
      })),
    ...Object.entries(NATIVE_PREPARATIONS).map(([preparation, recipe]) => ({
      id: `plan-prepare:${preparation}`,
      description: `Prepare ${recipe.outputQuantity} ${service.world.itemDefinitions[recipe.output]?.name ?? 'material'}; needs ${recipe.inputQuantity} ${service.world.itemDefinitions[recipe.input]?.name ?? 'material'} at start, ${recipe.workSeconds} work seconds.`,
      command: { type: 'prepare' as const, preparation: preparation as 'fiber' | 'cord' },
    })),
    // Fuel and tinder may be gathered by earlier steps; each step rechecks at dispatch.
    ...observed.visibleEntities
      .filter((entity) => entity.heat)
      .flatMap((entity) => [
        {
          id: `plan-fire-fuel:${entity.id}`,
          description: `Add one piece of carried fuel (such as a Supple branch) to ${namePhrase(entity, 'definite')}; about ${BASE_FIRE_CARE.fuel.secondsPerUnit / 3600} more hour of burning each, ${BASE_FIRE_CARE.fuel.workSeconds} work seconds; the fuel must be carried when this step starts.`,
          command: {
            type: 'tend-fire' as const,
            fireOperation: 'fuel' as const,
            targetId: entity.id,
          },
        },
        ...(entity.heat!.lit
          ? []
          : [
              {
                id: `plan-fire-light:${entity.id}`,
                description: `Light ${namePhrase(entity, 'definite')} once it has fuel, using one carried bundle of plain fibers as tinder and a rigid shaft as a drill; ${BASE_FIRE_CARE.light.workSeconds} work seconds.`,
                command: {
                  type: 'tend-fire' as const,
                  fireOperation: 'light' as const,
                  targetId: entity.id,
                },
              },
            ]),
      ]),
    ...observed.knownRecipes.map((recipe) => ({
      id: `plan-craft:${recipe.id}`,
      description: `Craft one ${service.world.itemDefinitions[recipe.outputDefinitionId]?.name ?? recipe.name} (${recipe.name}); ${recipe.workSeconds} work seconds, needs ${recipe.inputs.map((input) => `${input.quantity} ${service.world.itemDefinitions[input.definitionId]?.name ?? 'material'}`).join(', ')} at start.`,
      command: { type: 'craft' as const, recipeId: recipe.id },
    })),
  ]);
}

export async function buildStoredContext(service: WorldService, actorId: string, query: string) {
  const memories = await service.memoryContext(actorId, query, 12);
  return buildContext(service, actorId, query, memories);
}
