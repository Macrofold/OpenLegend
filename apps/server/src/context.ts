import { observerDescription } from '@open-legend/domain';
import { dropItemReason } from '@open-legend/domain';
import { pickupActions } from './item-actions.js';
import { entityLabel } from './entity-references.js';
import { statusEffectActions } from './status-effect-actions.js';
import { NATIVE_STRIKES } from '@open-legend/domain';
import {
  canReachEntity,
  findApproachPath,
  sameSurfacePoint,
  supportsManualWork,
  inventionFamily,
  SUPPORTED_INVENTION_FAMILIES,
} from '@open-legend/domain';
import { nativeNeedBelow } from '@open-legend/domain';
import { attributeDefinition, readAttribute } from '@open-legend/domain';
import { hearsEntity, visionRadius } from '@open-legend/domain';
import {
  findPath,
  NATIVE_PREPARATIONS,
  queryMemories,
  mindFor,
  SIMULATION_RULES,
  type Entity,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
import type { WorldService } from './world-service.js';

// Describe the native batch, not an invented quantity choice. Interpretation may
// compose these steps but cannot rewrite their arguments or effects.
function gatherDescription(entity: Entity): string {
  const resource = entity.resource!;
  return `Gather ${entity.name}: base yield ${SIMULATION_RULES.gatherQuantity} ${resource.definitionId} per batch, up to 4 with a compatible carried gathering tool (${resource.quantity} currently available), ${resource.workSeconds} work seconds after approach; target must remain perceived, reachable and nonempty.`;
}

function describeTargets(
  service: WorldService,
  actorId: string,
  candidates: CandidateAction[],
): CandidateAction[] {
  return candidates.map((candidate) => {
    const command = candidate.command;
    const id = command && 'targetId' in command ? command.targetId : undefined;
    const target = id ? service.world.entities[id] : undefined;
    return target
      ? {
          ...candidate,
          description: `${candidate.description.split(target.name).join(observerDescription(service.world, actorId, target.id))} Target: ${entityLabel(service.world, target, actorId)}${target.actor ? `; species: ${target.actor.species ?? 'unknown'}` : ''}.`,
        }
      : candidate;
  });
}

export const CONTEXT_BYTE_LIMIT = 100_000;
export class ContextBudgetError extends Error {
  constructor() {
    super('Required actor facts exceed the 100KB context budget; this context was not sent.');
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
      const familyTerms = family ? SUPPORTED_INVENTION_FAMILIES[family].description : '';
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
  const ownedDefinitionIds = new Set(observed.inventory.map((item) => item.definitionId));
  // Native mechanics and every owned definition remain present. Unowned generated
  // definitions duplicate candidate recipe outputs and need not be sent twice.
  const materials = observed.itemDefinitions
    .filter((definition) => !definition.recipeId || ownedDefinitionIds.has(definition.id))
    .map((definition) => ({
      id: definition.id,
      version: definition.version,
      name: excerpt(definition.name, 40),
      properties: definition.properties,
      native: !definition.recipeId,
      ...(definition.nutrition !== undefined ? { nutrition: definition.nutrition } : {}),
      ...(definition.cooked !== undefined ? { cooked: definition.cooked } : {}),
      ...(definition.launcher ? { launcher: definition.launcher } : {}),
      ...(definition.ammunition ? { ammunition: definition.ammunition } : {}),
      ...(definition.gatheringTool ? { gatheringTool: definition.gatheringTool } : {}),
    }));
  const context = {
    world: { id: observed.worldId, profile: service.world.profile, simulationSeconds: observed.at },
    contacts: observed.contacts,
    self: { ...observed.actor, name: excerpt(observed.actor.name, 40) },
    nearby: observed.visibleEntities.map((entity) => ({
      id: entity.id,
      name: excerpt(entity.name, 40),
      kind: entity.actor ? (entity.actor.species ?? 'human') : entity.kind,
      position: entity.position,
      ...(entity.resource ? { resource: entity.resource } : {}),
      ...(entity.animal
        ? { animal: { alive: entity.actor!.alive, fleeing: entity.animal.fleeSeconds > 0 } }
        : {}),
      ...(entity.actor
        ? { activity: entity.actor.action?.type ?? 'idle', alive: entity.actor.alive }
        : {}),
    })),
    // Ownership is implicit in this actor-scoped list; IDs and quantities are exact.
    inventory: observed.inventory.map(({ id, definitionId, quantity }) => ({
      id,
      definitionId,
      quantity,
    })),
    materials,
    knownRecipes: rankedRecipes.map(({ recipe }) => ({
      id: recipe.id,
      name: excerpt(recipe.name, 64),
      description: excerpt(recipe.description, 120),
      inputs: recipe.inputs,
      workSeconds: recipe.workSeconds,
      output: {
        kind: recipe.output.kind,
        properties: recipe.output.properties,
        ...(recipe.output.launcher ? { launcher: recipe.output.launcher } : {}),
        ...(recipe.output.ammunition ? { ammunition: recipe.output.ammunition } : {}),
        ...(recipe.output.gatheringTool ? { gatheringTool: recipe.output.gatheringTool } : {}),
      },
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
}
export function npcCandidates(
  service: WorldService,
  actorId = service.defaultResidentEntityId,
): CandidateAction[] {
  const observed = service.observe(actorId, { includeMemories: false });
  const actor = observed?.actor.actor;
  if (!observed || !actor?.alive || actor.incapacitated || service.paused) return [];
  const definitions = new Map(
    observed.itemDefinitions.map((definition) => [definition.id, definition]),
  );
  const inventory = observed.inventory.filter(
    (item) => item.ownerId === observed.actor.id && item.quantity > 0,
  );
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
            description: `${definition.reservoir.actionLabel} at ${target.name}.`,
            command,
          },
        ]
      : [];
  });
  const actions: CandidateAction[] = [
    ...replenishments,
    ...observed.visibleEntities.flatMap((target) =>
      pickupActions(service.world, observed.actor, target, (command) =>
        service.previewCommand(command, actorId),
      )
        .filter((option) => option.availability.ok)
        .map((option) => ({
          id: option.id,
          description: `${option.description} from ${target.name}.`,
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
        : 'Remain in place while considering the next useful step.',
      command: null,
    },
  ];
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
      nearbyConversations.set(id, entity.name);
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
    if (definition?.nutrition && nativeNeedBelow(actor, 'fullness', actor.action ? 30 : 85))
      actions.push({
        id: `eat:${item.id}`,
        description: `Eat one ${definition.name} to restore fullness.`,
        command: { type: 'eat', itemId: item.id },
      });
  }
  for (const target of [
    observed.actor,
    ...observed.visibleEntities.filter((e) => e.id !== observed.actor.id),
  ])
    for (const option of statusEffectActions(service.world, observed.actor, target))
      actions.push({ id: option.id, description: option.label, command: option.command });
  // Starting another timed task would discard actual work/materials. Native survival
  // may still interrupt an emergency; ordinary thought preserves the existing plan.
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
              observed.actor.position.x + dx,
              observed.actor.position.z + dz,
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
        ? []
        : findApproachPath(
            service.world,
            observed.actor,
            entity,
            SIMULATION_RULES.interactionRadius,
          ),
    ]),
  );
  for (const entity of observed.visibleEntities) {
    const position = approaches.get(entity.id)?.at(-1);
    if (!position) continue;
    const command: CommandInput = { type: 'move', position };
    if (service.previewCommand(command, actorId).ok)
      actions.push({
        id: `approach:${entity.id}`,
        description: `Move near the currently observed position of ${entityLabel(service.world, entity, actorId)}. This moves to that location once; it does not follow later movement.`,
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
  const compatibleAmmo = (kind: string) =>
    inventory.find((item) => definitions.get(item.definitionId)?.ammunition?.kind === kind);
  for (const item of inventory) {
    const definition = definitions.get(item.definitionId);
    if (
      definition?.launcher &&
      item.id !== actor.equippedItemId &&
      compatibleAmmo(definition.launcher.ammunitionKind)
    )
      actions.push({
        id: `equip:${item.id}`,
        description: `Equip ${definition.name}; compatible ${definition.launcher.ammunitionKind} ammunition is carried.`,
        command: { type: 'equip', itemId: item.id },
      });
  }
  const equipped = inventory.find((item) => item.id === actor.equippedItemId);
  const launcher = equipped && definitions.get(equipped.definitionId)?.launcher;
  const ammunition = launcher && compatibleAmmo(launcher.ammunitionKind);
  const cuttingTool = inventory.some((item) =>
    definitions.get(item.definitionId)?.properties.includes('point'),
  );
  const fires: { id: string; travelSeconds: number; fuelSeconds: number }[] = [];
  for (const entity of observed.visibleEntities) {
    // Target discovery uses only this actor's perception. Terrain is the same public
    // geometry used by native movement, never a search for hidden entities/items.
    const reach = entity.animal && launcher ? launcher.range : SIMULATION_RULES.interactionRadius;
    const path =
      reach === SIMULATION_RULES.interactionRadius
        ? approaches.get(entity.id)
        : canReachEntity(service.world, observed.actor, entity, reach)
          ? []
          : findApproachPath(service.world, observed.actor, entity, reach);
    if (!path) continue;
    if (entity.actor?.alive && entity.id !== actorId && supportsManualWork(observed.actor))
      for (const definition of Object.values(NATIVE_STRIKES))
        actions.push({
          id: `${definition.id}:${entity.id}`,
          description: `${definition.label} ${entity.name}: approach within ${definition.range} units, then one strike after ${definition.workSeconds} game seconds; ${definition.damage} injury damage if still in reach. Violence is optional and must be warranted by the actor's intent.`,
          command: { type: 'strike', definitionId: definition.id, targetId: entity.id },
        });
    if (entity.resource && entity.resource.quantity > 0)
      actions.push({
        id: `gather:${entity.id}`,
        description: gatherDescription(entity),
        command: { type: 'gather', targetId: entity.id },
      });
    if (entity.animal && entity.actor?.alive && equipped && launcher && ammunition)
      actions.push({
        id: `hunt:${entity.id}`,
        description: `Hunt the visible ${entity.name} using ${definitions.get(equipped.definitionId)!.name} and one ${launcher.ammunitionKind} projectile.`,
        command: {
          type: 'hunt',
          targetId: entity.id,
          itemId: equipped.id,
          ammunitionId: ammunition.id,
        },
      });
    if (
      entity.remains &&
      !entity.remains.harvested &&
      entity.remains.yields.some((item) => item.quantity > 0) &&
      cuttingTool
    )
      actions.push({
        id: `harvest:${entity.id}`,
        description: `Use a carried cutting point to harvest the finite ${entity.name}.`,
        command: { type: 'harvest', targetId: entity.id },
      });
    if (entity.heat?.lit) {
      let previous = observed.actor.position;
      let length = 0;
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
export function planningCandidates(service: WorldService, actorId: string): CandidateAction[] {
  const observed = service.observe(actorId, { includeMemories: false });
  if (!observed || !supportsManualWork(observed.actor)) return [];
  return describeTargets(service, actorId, [
    ...observed.visibleEntities
      .filter((entity) => entity.resource && entity.resource.quantity > 0)
      .map((entity) => ({
        id: `plan-gather:${entity.id}`,
        description: gatherDescription(entity),
        command: { type: 'gather' as const, targetId: entity.id },
      })),
    ...Object.entries(NATIVE_PREPARATIONS).map(([preparation, recipe]) => ({
      id: `plan-prepare:${preparation}`,
      description: `Prepare ${recipe.outputQuantity} ${recipe.output}; needs ${recipe.inputQuantity} ${recipe.input} at start, ${recipe.workSeconds} work seconds.`,
      command: { type: 'prepare' as const, preparation: preparation as 'fiber' | 'cord' },
    })),
    ...observed.knownRecipes.map((recipe) => ({
      id: `plan-craft:${recipe.id}`,
      description: `Craft one ${recipe.outputDefinitionId} (${recipe.name}); ${recipe.workSeconds} work seconds, needs ${recipe.inputs.map((input) => `${input.quantity} ${input.definitionId}`).join(', ')} at start.`,
      command: { type: 'craft' as const, recipeId: recipe.id },
    })),
  ]);
}

export async function buildStoredContext(service: WorldService, actorId: string, query: string) {
  const memories = await service.memoryContext(actorId, query, 12);
  return buildContext(service, actorId, query, memories);
}
