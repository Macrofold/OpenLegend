import { entityHandle, permittedSourceHandle } from './entity-references.js';
import { memoryForModel, acceptedMindForModel, eventFieldsForModel } from './experience-context.js';
import { currentBodyObservation, currentObservedFacets, bodyContext } from '@open-legend/domain';
import { captureSituation } from './situation-context.js';
import { selectTemporalHistory } from '@open-legend/domain';
import { itemContainerCapacity } from '@open-legend/domain';
import { constructionHelpPlans } from './construction.js';
import { seesEntity, knownCeasefireConsequence } from '@open-legend/domain';
import { contributionWithdrawals } from './handover-actions.js';
import { manufactureInputQuantities, prepareManufactureChoices } from '@open-legend/domain';
import { entityGet } from '@open-legend/domain';
import { nativeCommandKind } from './native-command-kind.js';
import { nativeCommandSupported, rangedTargetAllowed, rangedPolicy } from '@open-legend/domain';

import { combatHelpBinding, combatHelpFor, BASE_COMBAT_HELP } from '@open-legend/domain';
import { domainCommand } from './cognition.js';
import { outingActions, cooperationProposals, cooperativePurposeChoice } from './outing-view.js';
import {
  isEquipped,
  combatRecoveryDeadline,
  guardDescription,
  guardChoiceLabel,
  equipmentChangeDescription,
} from '@open-legend/domain';
import { competenceOptions, competenceContext } from './competence-actions.js';
import { cookingOptions, fishingOptions, fishingTools } from './food-actions.js';
import { cookingPreparations } from '@open-legend/domain';
import { resourcesAfterEnding } from '@open-legend/domain';
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
  prepareCombatMeans,
  strikeDefinition,
  huntingDescription,
  rangedChoiceLabel,
  baseRangedTargetPoint,
  BASE_EVASION_TEXT,
  nativeActivityViews,
  possessionItems,
  evasionChoices,
  observedCombatActivity,
  observedAttackPreparation,
  observedBodyHealth,
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
import { visionRadius } from '@open-legend/domain';
import { fireCareOptions, hearthPlacementOptions } from './fire-actions.js';
import { gateUseOptions, prepareBoundaryImpactOptions } from './construction.js';
import { constructionProfile } from '@open-legend/domain';
import { handoverOptions } from './handover-actions.js';
import {
  BASE_FIRE_CARE,
  findPath,
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
    Math.min(resource.quantity, gatheringYield(service.world, tools, resource.definitionId)),
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
  const origin = worldPosition(entityGet(service.world.entities, actorId)!);
  const help = combatHelpFor(service.world, actorId);
  const purpose = help?.recipientId === actorId ? BASE_COMBAT_HELP.purpose : undefined;
  const choices = candidates
    .filter(
      (candidate) =>
        !candidate.command ||
        nativeCommandSupported(service.world, nativeCommandKind(candidate.command.type)),
    )
    .flatMap((candidate, index) => {
      if (!candidate.command || !purpose) return [candidate];
      const command = { ...candidate.command, purpose };
      const combatHelpId = combatHelpBinding(service.world, actorId, command);
      if (!combatHelpId) return [candidate];
      // Existing goal-owned work already helps; only the unbound alternative ends consent.
      // docs/worlds/base/social.md#voluntary-combat-help
      const ordinaryHelps = combatHelpBinding(service.world, actorId, candidate.command);
      return [
        ordinaryHelps
          ? candidate
          : {
              ...candidate,
              description: BASE_COMBAT_HELP.separateActionDescription(candidate.description),
            },
        {
          ...candidate,
          id: `help:${index}`,
          description: BASE_COMBAT_HELP.actionDescription(
            help!.combat!.labels[actorId]!,
            candidate.description,
          ),
          command: { ...command, combatHelpId },
        },
      ];
    });
  return choices.map((candidate) => {
    const command = candidate.command;
    candidate = {
      ...candidate,
      transition: candidate.transition ?? suggestedWorkTransition(command),
    };
    if (entityGet(service.world.entities, actorId)?.actor?.action && command)
      candidate.description +=
        candidate.transition === 'replace'
          ? ' Choosing this replaces my current work; spent materials and committed effects remain.'
          : candidate.transition === 'interrupt'
            ? ' Choosing this pauses the supported current plan; its unfinished step restarts later.'
            : candidate.transition === 'enqueue'
              ? ' Choosing this queues it after my current work.'
              : ' This choice keeps my current work.';
    const id = command && 'targetId' in command ? command.targetId : undefined;
    const consequence =
      command && knownCeasefireConsequence(service.world, actorId, command.type, id);
    if (consequence) candidate.description += ' ' + consequence;
    const candidateTarget = id ? entityGet(service.world.entities, id) : undefined;
    const target =
      candidateTarget &&
      (id === actorId ||
        seesEntity(service.world, entityGet(service.world.entities, actorId)!, candidateTarget))
        ? candidateTarget
        : undefined;
    if (target && !health.has(target.id)) {
      health.set(target.id, observedBodyHealth(service.world, actorId, target.id));
      const point =
        target.id === actorId
          ? effectivePosition(service.world, target.id)
          : currentBodyObservation(service.world, actorId, target.id)?.value.body.position;
      if (point) positions.set(target.id, point);
    }
    const position = target && positions.get(target.id);
    // Descriptions already use permitted names where they are constructed.
    // Substring replacement here would corrupt personal names and their articles.
    return target && position
      ? {
          ...candidate,
          description: `${candidate.description} Target: ${observerDescription(service.world, actorId, target.id)}.${health.get(target.id) ? ` Last observed ${health.get(target.id)}` : ''} Distance to the observed position: ${Math.hypot(origin.x - position.x, origin.y - position.y, origin.z - position.z).toFixed(1)} m. Route length is not known.`,
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
  const observed = decisionObservation(service.world, actorId);
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
  const situation = captureSituation(
    service.world,
    actorId,
    `context:${service.world.sequence}`,
    selectTemporalHistory(service.world.experience?.temporal, actorId),
  );
  const context = {
    receivedSituation: situation.packet,
    world: { id: observed.worldId, profile: service.world.profile, simulationSeconds: observed.at },
    contacts: observed.contacts.map((contact) => ({ text: contact.text })),
    self: {
      id: entityHandle(service.world, actorId, actorId),
      name: excerpt(observed.actor.name, 40),
      kind: observed.actor.kind,
      position: worldPosition(observed.actor),
      body: bodyContext(service.world, observed.actor),
      traits: observed.actor.actor?.traits ?? [],
      currentActivity: observed.actor.actor?.action
        ? {
            type: observed.actor.actor.action.type,
            stage: observed.actor.actor.action.stage,
            remainingSeconds: observed.actor.actor.action.remainingSeconds,
          }
        : null,
      goals:
        observed.actor.actor?.agency.goals.map(({ id, objective, status, revision }) => ({
          id,
          objective,
          status,
          revision,
        })) ?? [],
    },
    nearby: observed.visibleEntities.flatMap((entity) => {
      const received = currentBodyObservation(service.world, actorId, entity.id);
      if (!received) return [];
      const body = received.value.body;
      return [
        {
          id: entityHandle(service.world, actorId, entity.id),
          name: excerpt(observerName(service.world, actorId, entity.id).name, 40),
          kind: body.kind,
          position: body.position,
          facts: situation.bodyFacts(entity.id),
        },
      ];
    }),
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
                capacity: itemContainerCapacity(
                  service.world,
                  entityGet(service.world.entities, id)!,
                )!,
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
      family: recipe.source.kind === 'family' ? recipe.source.candidate.family : null,
      facts: recipe.facts,
    })),
    memories: (retained ?? queryMemories(service.world, actorId, { text: query, limit: 12 })).map(
      (memory) => ({
        ...memoryForModel(service.world, actorId, memory),
        summary: excerpt(memory.summary, 220),
      }),
    ),
    recentEvents: observed.recentEvents.slice(-12).map((event) => {
      const source = permittedSourceHandle(service.world, actorId, ['occurrence', event.id]);
      const participant = (id: string) =>
        id === actorId
          ? entityHandle(service.world, actorId, actorId)
          : permittedSourceHandle(service.world, actorId, ['historical-participant', event.id, id]);
      const data = eventFieldsForModel(
        service.world,
        actorId,
        Object.fromEntries(Object.entries(event.data ?? {}).filter(([key]) => key !== 'text')),
        event.id,
      );
      return {
        id: source,
        at: event.at,
        type: event.type,
        text: excerpt(
          typeof event.data?.['text'] === 'string' ? event.data['text'] : event.text,
          220,
        ),
        ...(event.actorId ? { actorId: participant(event.actorId) } : {}),
        ...(event.targetId ? { targetId: participant(event.targetId) } : {}),
        ...(data && typeof data === 'object' && Object.keys(data).length ? { data } : {}),
      };
    }),
    innerWorld: acceptedMindForModel(service.world, actorId),
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
  context.coverage.knownRecipeSupplied = context.knownRecipes.length;
  context.coverage.memorySupplied = context.memories.length;
  context.coverage.recentEventSupplied = context.recentEvents.length;
  context.coverage.nearbySupplied = context.nearby.length;
  const encodedBytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');
  let bytes = encodedBytes(context);
  // Count each removable record once. JSON punctuation and changing coverage-count
  // widths are part of the budget; UTF-16 string length is not UTF-8 byte length.
  const sizes = new Map<unknown[], number[]>();
  const trim = (
    records: unknown[],
    field: 'knownRecipeSupplied' | 'memorySupplied' | 'recentEventSupplied' | 'nearbySupplied',
    floor: number,
    front = false,
  ) => {
    if (bytes <= CONTEXT_BYTE_LIMIT || records.length <= floor) return;
    let recordSizes = sizes.get(records);
    if (!recordSizes) sizes.set(records, (recordSizes = records.map(encodedBytes)));
    while (bytes > CONTEXT_BYTE_LIMIT && records.length > floor) {
      const length = records.length;
      const removed = front ? recordSizes.shift()! : recordSizes.pop()!;
      if (front) records.shift();
      else records.pop();
      bytes -= removed + (length > 1 ? 1 : 0);
      bytes += String(length - 1).length - String(length).length;
      context.coverage[field] = records.length;
    }
  };
  // Discard complete lowest-priority records, never structural JSON fragments or
  // item/material identities. Keep current speech and the best memories when possible.
  trim(context.knownRecipes, 'knownRecipeSupplied', 8);
  trim(context.recentEvents, 'recentEventSupplied', 4, true);
  trim(context.memories, 'memorySupplied', 4);
  trim(context.knownRecipes, 'knownRecipeSupplied', 1);
  trim(context.nearby, 'nearbySupplied', 0);
  trim(context.recentEvents, 'recentEventSupplied', 1, true);
  trim(context.memories, 'memorySupplied', 1);
  // Even display labels are optional compared with physical fields and owned IDs.
  if (bytes > CONTEXT_BYTE_LIMIT)
    for (const material of context.materials) {
      bytes += 2 - encodedBytes(material.name);
      material.name = '';
    }
  const exactBytes = encodedBytes(context);
  if (exactBytes !== bytes) throw new Error('Context byte accounting disagreed with JSON.');
  if (exactBytes > CONTEXT_BYTE_LIMIT) throw new ContextBudgetError();
  return context;
}

export interface CandidateAction {
  id: string;
  description: string;
  command: CommandInput | null;
  /** A trusted world compiler can bind a native finite composition directly. */
  nativeInvocation?: import('@open-legend/domain').Command;
  subjectIds?: string[];
  purpose?: import('@open-legend/domain').ResponsePurposeBinding;
  /** Request-local supplied-purpose question, never an entity or executable command. */
  purposeHandle?: string;
  /** Permitted model-facing people labels; never persisted as the native purpose. */
  purposeDescription?: string;
  purposeMeaning?: string;
  firstActionDescription?: string;
  /** Once offered, retain the initiator's exact handling of current work. */
  transition?: import('@open-legend/domain').WorkTransitionMode;
}

function suggestedWorkTransition(
  command: CommandInput | null,
): import('@open-legend/domain').WorkTransitionMode {
  if (command?.type === 'outing' && command.outingOperation === 'work')
    return command.outingMode ?? 'replace';
  return !command ||
    [
      'say',
      'release-shot',
      'inspect-inventory',
      'inspect-activities',
      'learn-record',
      'teach',
      'handover',
      'outing',
      'transfer-item',
      'withdraw-attempt',
      'confirm-attempt',
    ].includes(command.type)
    ? 'continue'
    : 'replace';
}

export function candidateChoice(
  candidate: CandidateAction,
  actorId: string,
  decisionId: string,
  expectedWork: import('@open-legend/domain').ProspectiveWork['expected'],
): import('@open-legend/domain').ActionChoice {
  return {
    invocation: candidate.nativeInvocation
      ? {
          ...candidate.nativeInvocation,
          actorId,
          id: decisionId,
          ...(candidate.purpose ? { chosenPurpose: candidate.purpose } : {}),
        }
      : candidate.command
        ? {
            ...domainCommand(candidate.command, actorId, decisionId),
            ...(candidate.purpose ? { chosenPurpose: candidate.purpose } : {}),
          }
        : null,
    ...(candidate.purpose ? { purpose: candidate.purpose } : {}),
    transition: candidate.transition ?? suggestedWorkTransition(candidate.command),
    expectedWork,
  };
}
export function npcCandidates(
  service: WorldService,
  actorId = service.availableDefaultResidentEntityId,
  observed = actorId ? decisionObservation(service.world, actorId) : undefined,
  coverage: 'suggestions' | 'complete-physical' = 'suggestions',
): CandidateAction[] {
  const actor = observed?.actor.actor;
  // Explicit player-action callers share these native suggestions. Only implicit
  // resident selection may be absent; never substitute the controlled person.
  if (!actorId || !observed || !actor?.alive || actor.incapacitated || service.paused) return [];
  const craftCommand = prepareManufactureChoices(service.world, actorId);
  const personallyThreatened =
    Object.keys(actor.encounters?.unknown ?? {}).length > 0 ||
    Object.values(actor.encounters?.pairs ?? {}).some(
      (pair) =>
        Object.keys(pair.active).length > 0 || (pair.incomingUntil ?? 0) > service.world.simTime,
    );
  const temporary = new WeakMap<CommandInput, { message: string; nextAt?: number }>();
  const checked = new WeakMap<CommandInput, ReturnType<WorldService['previewCommand']>>();
  const previewChoice = (command: CommandInput) => {
    const prior = checked.get(command);
    if (prior) return prior;
    const result = service.prepareCommandChoice(command, actorId, suggestedWorkTransition(command));
    const available = 'outcome' in result ? result.outcome : result;
    checked.set(command, available);
    return available;
  };
  const canOfferPhysical = (command: CommandInput) => {
    const result = service.prepareCommandChoice(command, actorId, 'replace');
    const available = 'outcome' in result ? result.outcome : result;
    checked.set(command, available);
    if (available.ok) return true;
    if (!['combat-recovery', 'evasion-recovery'].includes(available.code ?? '')) return false;
    temporary.set(command, {
      message: available.message ?? 'Temporarily unavailable.',
      ...('nextAt' in result ? { nextAt: result.nextAt } : {}),
    });
    return true;
  };
  const finishChoices = (choices: CandidateAction[]) =>
    describeTargets(
      service,
      actorId,
      choices
        .filter(
          (candidate) =>
            !candidate.command ||
            temporary.has(candidate.command) ||
            previewChoice(candidate.command).ok,
        )
        .map((candidate) => {
          const blocker = candidate.command && temporary.get(candidate.command);
          return blocker
            ? {
                ...candidate,
                description: `${candidate.description} Temporarily unavailable: ${blocker.message}${blocker.nextAt !== undefined ? ` Recovery ends at game time ${blocker.nextAt}.` : ''}`,
              }
            : candidate;
        }),
    );
  const definitions = new Map(
    observed.itemDefinitions.map((definition) => [definition.id, definition]),
  );
  const inventory = observed.inventory.filter((item) => item.quantity > 0);
  const afterReplacement = resourcesAfterEnding(
    service.world,
    actor.action ? [actor.action.id] : [],
  );
  let shotView: ReturnType<typeof nativeActivityViews> | undefined;
  const castTools = fishingTools(service.world, inventory);
  const gatheringTools = carriedGatheringTools(observed);
  const quantity = (definitionId: string) =>
    inventory
      .filter((item) => item.definitionId === definitionId)
      .reduce((sum, item) => sum + item.quantity, 0);
  const replenishments: CandidateAction[] = observed.visibleEntities.flatMap((target) => {
    const definition =
      target.replenisher && attributeDefinition(service.world, target.replenisher.attributeId);
    if (
      !definition?.reservoir ||
      readAttribute(service.world, observed.actor, definition) === undefined
    )
      return [];
    const command: CommandInput = {
      type: 'replenish',
      targetId: target.id,
      attributeId: definition.id,
    };
    return previewChoice(command).ok
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
      return previewChoice(command).ok
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
      pickupActions(service.world, observed.actor, target, (command) => previewChoice(command))
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
  if (actor.action?.ranged?.manual && actor.action.targetId) {
    const command: CommandInput = { type: 'release-shot', aimId: actor.action.id };
    if (previewChoice(command).ok) {
      const view = nativeActivityViews(
        service.world,
        inventory,
      )(domainCommand(command, actorId, 'offered-held-release'));
      const label = rangedChoiceLabel('release-shot', view.target!, view.tool!);
      actions.push({
        id: `release-shot:${actor.action.id}`,
        firstActionDescription: label,
        description: `${label}. ${view.facts.map((fact) => `${fact.name}: ${String(fact.value)}`).join('; ')}`,
        command,
        subjectIds: [actor.action.targetId],
        transition: 'continue',
      });
    }
  }
  // Discover only known appearances, then let the actor select one exact container.
  // Its inspected page supplies take/pack choices, never an item × all-bags product.
  const knownContainers = new Map<string, Named>();
  for (const item of [...inventory, ...observed.groundItems])
    if (service.world.itemDefinitions[item.definitionId]?.container)
      knownContainers.set(item.id, service.world.itemDefinitions[item.definitionId]!);
  for (const entity of observed.visibleEntities)
    if (entity.kind === 'item-pile' || entityGet(service.world.entities, entity.id)?.container)
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
        let command: CommandInput = {
          type: 'transfer-item',
          itemId: item.id,
          quantity: available,
          targetId: destination,
          expectedRevision: item.revision,
          placementRevision: item.placementRevision,
          targetRevision: entityGet(service.world.entities, destination)!.inventoryRevision ?? 0,
        };
        // The same native owner checks unknown load, nesting, reservations and access.
        // If the whole lot will not fit, offer one exact unit only when it is admitted.
        if (!previewChoice(command).ok) {
          if (available === 1) continue;
          command = { ...command, quantity: 1 };
          if (!previewChoice(command).ok) continue;
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
  const followTargets = observed.visibleEntities.filter((e) => e.actor?.alive && e.id !== actorId);
  for (const target of coverage === 'complete-physical'
    ? followTargets
    : followTargets.slice(0, 4)) {
    const command: CommandInput = { type: 'follow', targetId: target.id };
    if (previewChoice(command).ok)
      actions.push({
        id: `follow:${target.id}`,
        description: `Follow ${namePhrase(target, 'definite')} while visible; no stealth or automatic sunset stop.`,
        command,
      });
  }
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
      contributions: true,
      permissions: service.store.authority!.constructionPermissions(service.world.id),
    })) {
      const isOffer =
        option.command.handoverOperation === 'offer' ||
        option.command.handoverOperation === 'counter';
      if (isOffer && offerCandidates >= (typed ? 24 : 12)) continue;
      if (option.received)
        checked.set(option.command, {
          ok: true,
          code: 'available',
          message: 'Attempt the last personally received offer terms.',
        });
      else if (!previewChoice(option.command).ok) continue;
      if (isOffer) offerCandidates++;
      actions.push({ id: option.id, description: option.description, command: option.command });
    }
  }
  for (const option of contributionWithdrawals(
    service.world,
    actorId,
    service.store.authority!.constructionPermissions(service.world.id),
  ))
    if (previewChoice(option.command).ok)
      actions.push({ id: option.id, description: option.description, command: option.command });
  const helpingPlans = constructionHelpPlans(
    service.world,
    actorId,
    inventory,
    service.store.authority!.constructionPermissions(service.world.id),
    observed.visibleEntities,
  );
  for (const target of observed.visibleEntities) {
    if (!target.actor || target.id === actorId) continue;
    for (const choice of cooperationProposals(service.world, actorId, target.id, helpingPlans))
      if (previewChoice(choice.command).ok)
        actions.push({
          id: choice.id,
          description: `${choice.label}. ${choice.description}`,
          command: choice.command,
        });
  }
  for (const choice of outingActions(service.world, actorId)) {
    if (choice.received)
      checked.set(choice.command, {
        ok: true,
        code: 'available',
        message:
          'Attempt using the last terms I personally received; current availability is checked when I act.',
      });
    if (previewChoice(choice.command).ok)
      actions.push({ id: choice.id, description: choice.description, command: choice.command });
  }
  // Timed alternatives declare their handling of current work; admission rechecks
  // the exact action before a transition can stop that work.
  const practiceContext = competenceContext(service.world, observed.actor);
  for (const target of observed.visibleEntities)
    for (const option of competenceOptions(service.world, actorId, target, inventory))
      if (previewChoice(option.command).ok)
        actions.push({
          id: option.id,
          description: `${option.description} ${practiceContext}`,
          command: option.command,
        });
  if (
    personallyThreatened ||
    observed.visibleEntities.some(
      (e) => e.actor?.alive && observedCombatActivity(service.world, observed.actor, e),
    ) ||
    combatRecoveryDeadline(service.world, observed.actor) > service.world.simTime
  )
    for (const choice of evasionChoices(service.world, observed.actor)) {
      const command: CommandInput = { type: 'evade', position: choice.destination };
      if (canOfferPhysical(command))
        actions.push({
          id: `evade:${choice.label}`,
          firstActionDescription: choice.label,
          description: `${choice.label}. ${choice.description} ${BASE_EVASION_TEXT.destinationScope}`,
          command,
        });
    }

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
    for (const action of [...actions]) {
      if (!action.command) continue;
      const choice = cooperativePurposeChoice(service.world, actorId, action.command);
      if (!choice) continue;
      // The ordinary physical option is already prepared. Missing live consent is
      // learned by an attempted use, never by an option disappearing remotely.
      checked.set(choice.command, previewChoice(action.command));
      const priorTemporary = temporary.get(action.command);
      if (priorTemporary) temporary.set(choice.command, priorTemporary);
      actions.push({
        ...action,
        id: JSON.stringify(['cooperative-purpose', choice.agreementId, action.id]),
        command: choice.command,
        description: `${choice.label}. ${choice.description} ${action.description}`,
      });
    }
    return finishChoices(actions);
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
    if (previewChoice(command).ok)
      actions.push({
        id: `approach:${entity.id}`,
        subjectIds: [entity.id],
        firstActionDescription: `Move once near ${observerDescription(service.world, actorId, entity.id, 'definite')}'s observed position`,
        description: `Move near the currently observed position of ${observerDescription(service.world, actorId, entity.id, 'definite')}, currently ${Math.hypot(worldPosition(observed.actor).x - worldPosition(entity).x, worldPosition(observed.actor).y - worldPosition(entity).y, worldPosition(observed.actor).z - worldPosition(entity).z).toFixed(1)} m away. Stop at the selected reachable place within ${SIMULATION_RULES.interactionRadius} m of that observed position; route length is not known. This moves to that location once; it does not follow later movement.`,
        command,
      });
  }
  const manualWork = supportsManualWork(observed.actor);
  if (manualWork) {
    const impactOptions = prepareBoundaryImpactOptions(service.world, actorId, inventory);
    for (const entity of observed.visibleEntities)
      for (const option of impactOptions(entity))
        if (previewChoice(option.command).ok)
          actions.push({
            id: option.id,
            subjectIds: [entity.id],
            firstActionDescription: option.label,
            description: option.description,
            command: option.command,
          });
    for (const entity of observed.visibleEntities)
      for (const option of gateUseOptions(service.world, actorId, entity))
        if (previewChoice(option.command).ok)
          actions.push({
            id: option.id,
            subjectIds: [entity.id],
            firstActionDescription: option.label,
            description: option.description,
            command: option.command,
          });
    actions.push(
      ...hearthPlacementOptions(
        service.world,
        actorId,
        constructionProfile(service.world)?.profile.suggested,
      ).map((option) => ({
        id: option.id,
        description: option.description,
        command: option.command,
      })),
    );
  }
  const { rangedWeapons, strikes, shields, ammunitionByKind } = prepareCombatMeans(
    service.world,
    actorId,
    inventory,
    afterReplacement,
  );
  const compatibleAmmo = (kind: string) => ammunitionByKind.get(kind)?.length;
  // Offers reuse current native admission: a carried component does not grant a supported
  // equipment use, permission to move reserved gear, or freedom from committed recovery.
  for (const item of manualWork ? inventory : []) {
    const definition = definitions.get(item.definitionId);
    if (
      definition &&
      !isEquipped(service.world, actorId, item.id) &&
      (definition.contactDefense ||
        definition.melee ||
        definition.gatheringTool ||
        (definition.rangedWeapon && compatibleAmmo(definition.rangedWeapon.ammunitionKind)))
    ) {
      const command: CommandInput = { type: 'equip', itemId: item.id };
      if (!previewChoice(command).ok) continue;
      actions.push({
        id: `equip:${item.id}`,
        description: `Equip ${namePhrase(definition)}: ${definition.description}`,
        command,
      });
    }
  }
  const cuttingTool =
    manualWork &&
    inventory.some((item) => definitions.get(item.definitionId)?.properties.includes('point'));
  // Visible contact or ranged preparation makes supported defense relevant here. A guard
  // offer neither selects it nor binds an unperceived attacker or future pursuit.
  if (personallyThreatened)
    for (const shield of shields) {
      const profile = definitions.get(shield.definitionId)!.contactDefense!;
      const command: CommandInput = { type: 'guard', itemId: shield.id, autoEquip: true };
      if (canOfferPhysical(command))
        actions.push({
          id: `guard:${shield.id}:current-facing`,
          firstActionDescription: guardChoiceLabel(definitions.get(shield.definitionId)!.name),
          description: `${equipmentChangeDescription(service.world, actorId, shield.id)}${guardChoiceLabel(definitions.get(shield.definitionId)!.name)}. ${guardDescription(profile)}`,
          command,
        });
    }
  for (const target of observed.visibleEntities.filter(
    (e) => e.actor?.alive && observedAttackPreparation(service.world, observed.actor, e),
  ))
    for (const shield of shields) {
      const profile = definitions.get(shield.definitionId)!.contactDefense!;
      const command: CommandInput = {
        type: 'guard',
        itemId: shield.id,
        targetId: target.id,
        autoEquip: true,
      };
      if (canOfferPhysical(command))
        actions.push({
          id: `guard:${shield.id}:${target.id}`,
          firstActionDescription: guardChoiceLabel(
            definitions.get(shield.definitionId)!.name,
            target.name,
          ),
          description: `${equipmentChangeDescription(service.world, actorId, shield.id)}${guardChoiceLabel(definitions.get(shield.definitionId)!.name, target.name)}. ${guardDescription(profile)}`,
          command,
        });
    }
  const fires: { id: string; travelSeconds: number; fuelSeconds: number }[] = [];
  for (const entity of observed.visibleEntities) {
    // Target discovery uses only this actor's perception. Terrain is the same public
    // geometry used by native movement, never a search for hidden entities/items.
    // Ranged offers use their own reach, even when the target cannot be approached
    // for contact. Equal ranges share geometry work within this observed snapshot.
    if (rangedTargetAllowed(service.world, entity) && entity.id !== actorId) {
      const reachable = new Map<number, boolean>();
      const targetPoint = baseRangedTargetPoint(service.world, entity);
      for (const { item, definition, rangedWeapon, ammunition: ammunitionLots } of rangedWeapons) {
        const description =
          huntingDescription(entity.actor?.species, 'rangedWeapon', entity, definition) ??
          `${rangedChoiceLabel('shoot-once', namePhrase(entity), namePhrase(definition))}.`;
        if (!reachable.has(rangedWeapon.range))
          reachable.set(
            rangedWeapon.range,
            canReachEntity(
              service.world,
              observed.actor,
              entity,
              rangedWeapon.range,
              undefined,
              targetPoint,
            ) ||
              !!findApproachPath(
                service.world,
                observed.actor,
                entity,
                rangedWeapon.range,
                false,
                targetPoint,
              ),
          );
        if (!reachable.get(rangedWeapon.range)) continue;
        for (const ammunition of ammunitionLots) {
          const command: CommandInput = {
            type: entity.animal ? 'hunt' : 'shoot-once',
            autoEquip: true,
            targetId: entity.id,
            itemId: item.id,
            ammunitionId: ammunition.id,
          };
          if (!canOfferPhysical(command)) continue;
          actions.push({
            id: `shot:${JSON.stringify([item.id, ammunition.id, entity.id])}`,
            firstActionDescription: `${rangedChoiceLabel(
              'shoot-once',
              namePhrase(entity),
              namePhrase(definition),
            )} using ${namePhrase(service.world.itemDefinitions[ammunition.definitionId]!)}`,
            description: `${equipmentChangeDescription(service.world, actorId, item.id)}${description} ${definition.name}: ${definition.description} ${(shotView ??=
              nativeActivityViews(service.world, [...possessionItems(service.world, actorId)]))(
              domainCommand(command, actorId, 'offered-shot'),
            )
              .facts.map((fact) => `${fact.name}: ${String(fact.value)}`)
              .join('; ')}`,
            command,
          });
        }
      }
    }
    if (entity.actor?.alive && entity.id !== actorId) {
      for (const definition of strikes) {
        // Authored intent describes the same finite command; equipment capability
        // supplies the variants, never a knife-name or hunger-specific rule.
        const tool = definition.weaponItemId ? definitions.get(definition.id)?.name : undefined;
        const description = manualWork
          ? huntingDescription(
              entity.actor.species,
              definition.weaponItemId ? 'melee' : 'unarmed',
              entity,
              definition.weaponItemId ? definitions.get(definition.id) : undefined,
            )
          : undefined;
        const command: CommandInput = {
          type: 'strike',
          autoEquip: true,
          ...(description ? { purpose: 'Hunt once' } : {}),
          definitionId: definition.id,
          itemId: definition.weaponItemId,
          targetId: entity.id,
        };
        if (!canOfferPhysical(command)) continue;
        const selectedStrike = strikeDefinition(
            definition.id,
            service.world,
            definition.weaponItemId,
            entity,
          )!,
          attackText =
            description ??
            `${selectedStrike.label}. ${definition.autoMoveToRange ? 'Approach and attempt one attack.' : 'Attempt one attack from my current position.'}`,
          equipmentText = definition.weaponItemId
            ? equipmentChangeDescription(service.world, actorId, definition.weaponItemId)
            : '',
          toolText = definition.weaponItemId
            ? `${tool}: ${definitions.get(definition.id)!.description}`
            : `${definition.label}.`;
        actions.push({
          id: `${definition.id}:${definition.weaponItemId ?? 'unarmed'}:${entity.id}`,
          firstActionDescription: definition.weaponItemId
            ? selectedStrike.label
            : `${definition.label} ${namePhrase(entity, 'definite')}`,
          description: `${equipmentText}${attackText} ${toolText} ${describeAttack(definition)}`,
          command,
        });
      }
    }
    // Natural attacks have their own anatomy and reach checks. A route for
    // hand-work proximity neither grants nor rules out physical contact.
    if (!manualWork) continue;
    const route = approaches.get(entity.id);
    if (!route) continue;
    const path = route.path;
    if (entity.resource && !entity.resource.cast && entity.resource.quantity > 0)
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
    for (const option of fishingOptions(service.world, castTools, entity))
      if (previewChoice(option.command).ok)
        actions.push({
          id: option.id,
          description: `${option.label} at ${entity.name}. ${option.description}`,
          command: option.command,
        });
    // Fire care is offered per perceived fire from current state; native admission rechecks it.
    if (entity.heat)
      for (const option of fireCareOptions(service.world, inventory, entity))
        if (previewChoice(option.command).ok)
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
  fires.sort((a, b) => a.travelSeconds - b.travelSeconds || a.id.localeCompare(b.id));
  for (const preparation of fires.length
    ? cookingPreparations(service.world, inventory, undefined, afterReplacement)
    : []) {
    const cookingFire = fires.find(
      (fire) => fire.fuelSeconds > fire.travelSeconds + preparation.definition.workSeconds + 2,
    );
    if (!cookingFire) continue;
    const option = cookingOptions([preparation], cookingFire.id)[0]!;
    const command = option.command;
    if (previewChoice(command).ok)
      actions.push({
        id: option.id,
        description: `${option.definition.description} Work takes ${option.definition.workSeconds} game seconds after approach; spent inputs are not returned on interruption.`,
        command,
      });
  }
  for (const recipe of manualWork ? observed.knownRecipes : []) {
    const required = manufactureInputQuantities(recipe);
    if ([...required].every(([definitionId, amount]) => quantity(definitionId) >= amount))
      actions.push({
        id: `craft:${recipe.id}`,
        description: `Craft the learned ${recipe.name} using the materials already carried.`,
        command: craftCommand(recipe),
      });
  }
  for (const action of [...actions]) {
    if (!action.command) continue;
    const choice = cooperativePurposeChoice(service.world, actorId, action.command);
    if (!choice) continue;
    // The ordinary physical option is already prepared. Missing live consent is
    // learned by an attempted use, never by an option disappearing remotely.
    checked.set(choice.command, previewChoice(action.command));
    const priorTemporary = temporary.get(action.command);
    if (priorTemporary) temporary.set(choice.command, priorTemporary);
    actions.push({
      ...action,
      id: JSON.stringify(['cooperative-purpose', choice.agreementId, action.id]),
      command: choice.command,
      description: `${choice.label}. ${choice.description} ${action.description}`,
    });
  }
  return finishChoices(actions);
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
  const craftCommand = prepareManufactureChoices(service.world, actorId);
  const gatheringTools = carriedGatheringTools(observed);
  return describeTargets(service, actorId, [
    ...hearthPlacementOptions(
      service.world,
      actorId,
      constructionProfile(service.world)?.profile.suggested,
    ).map((option) => ({
      id: `plan-${option.id}`,
      description: option.description,
      command: option.command,
    })),
    ...observed.visibleEntities
      .filter((entity) => entity.resource && !entity.resource.cast && entity.resource.quantity > 0)
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
      description: `Craft ${recipe.outputs.map((output) => `${output.quantity} ${service.world.itemDefinitions[output.definition.id]!.name}`).join(', ')} (${recipe.name}); ${recipe.workSeconds} work seconds, needs ${recipe.inputs.map((input) => `${input.quantity} ${service.world.itemDefinitions[input.definitionId]?.name ?? 'material'}`).join(', ')} at start.`,
      command: craftCommand(recipe),
    })),
  ]);
}

export async function buildStoredContext(service: WorldService, actorId: string, query: string) {
  const memories = await service.memoryContext(actorId, query, 12);
  return buildContext(service, actorId, query, memories);
}
