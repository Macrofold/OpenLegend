import {
  canonicalJson,
  entityGet,
  entityHas,
  type ActivityRequestChoice,
  type ActivityRequestDescriptor,
} from '@open-legend/domain';
import { accessiblePossession, worldPosition } from '@open-legend/domain';
import { knowledgeDocument, characterCount, recognizesSubject } from '@open-legend/domain';
import {
  awarenessBindsSubject,
  entityLabel,
  entityHandles,
  experienceEntityReferences,
} from './entity-references.js';
import {
  seesEntity,
  speechDescription,
  speechRoles,
  type Awareness,
  type WorldState,
} from '@open-legend/domain';
import { gameTime } from './recall.js';
import {
  experienceForModel,
  experienceModelBindings,
  modelEvidenceReference,
  MODEL_EXPERIENCE_MEANING,
  orderedDecisionContext,
  projectDecisionPresentation,
} from './perceived-context.js';
import type { WorldService } from './world-service.js';
import type { DecisionActionOffer } from './context.js';
import {
  ACTIVITY_REQUEST_LABEL,
  ACTIVITY_REQUEST_MEANING,
  ACTIVITY_INVOCATION_INSTRUCTIONS,
} from './navigation-contracts.js';
import {
  responseOperationEnabled,
  responseOperationGuide,
  RESPONSE_PORTRAYAL_GUIDE,
  responseTaskInstructions,
  type ResponseOperationKind,
} from './cognition-contracts.js';
import type { DecisionRequirements } from './decision-context-selection.js';
const KNOWN_PLANNING_MEANING =
  'These choices describe planning techniques, not actions guaranteed executable now. Prerequisites must be obtained first. These handles can be queued without a current action shortlist.';

export interface ModelActivityRequests {
  requests: ActivityRequestDescriptor[];
  choices: Array<
    Omit<ActivityRequestChoice, 'id'> & { entityId?: string; definitionId?: string; value?: string }
  >;
  warnings: string[];
}

/** Factor repeated transport metadata without selecting or shortening a choice.
 * The authoritative catalogue and exact bindings keep their ordinary shape. */
export function compactActivityRequests(catalogue: ModelActivityRequests) {
  const shared = new Map<
    string,
    {
      choice: Omit<ModelActivityRequests['choices'][number], 'requestIds'>;
      requestIds?: Set<string>;
    }
  >();
  for (const { requestIds, ...choice } of catalogue.choices) {
    // Merge only the same complete fact. Combining different role or parent
    // bindings would invent relationships between a form and its parameters.
    const key = canonicalJson({ choice, scoped: requestIds !== undefined });
    const prior = shared.get(key);
    if (prior) for (const id of requestIds ?? []) prior.requestIds!.add(id);
    else
      shared.set(key, {
        choice,
        ...(requestIds ? { requestIds: new Set(requestIds) } : {}),
      });
  }
  const groups = new Map<string, number>();
  const choiceGroups: Array<
    Pick<ActivityRequestChoice, 'kind' | 'roles' | 'accessible' | 'requestIds'>
  > = [];
  const choices = [...shared.values()].map(({ choice: sharedChoice, requestIds: familyIds }) => {
    const { kind, roles, accessible, ...choice } = sharedChoice;
    const requestIds = familyIds && [...familyIds];
    const common = { kind, roles, accessible, ...(requestIds ? { requestIds } : {}) };
    const key = canonicalJson(common);
    let group = groups.get(key);
    if (group === undefined) {
      group = choiceGroups.length;
      groups.set(key, group);
      choiceGroups.push(common);
    }
    return { group, ...choice };
  });
  return {
    // Native catalogue coverage is server preparation metadata, not model evidence.
    requests: catalogue.requests.map(({ covers: _covers, ...request }) => request),
    choiceGroups,
    choices,
    warnings: catalogue.warnings,
    reading:
      'Each choice inherits every field from choiceGroups[group], a zero-based metadata index, not an entity ID. Choices remain separate exact alternatives; group membership is not a requirement to perform them together.',
  };
}

/** Judgment questions own the task. Reuse the actor's evidence and available forms
 * without embedding the generator's response-format instructions in its state. */
export function judgmentDecisionContext(context: Record<string, unknown>) {
  context = projectDecisionPresentation(context);
  const projected = Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !['knowledgeInstructions', 'navigation'].includes(key))
      .map(([key, value]) => [
        key,
        key === 'activityRequests'
          ? compactActivityRequests(value as ModelActivityRequests)
          : value,
      ]),
  );
  // Known techniques can matter before their materials are owned. Preserve their
  // exact handles and costs without presenting planning vocabulary as feasibility.
  if (Array.isArray(context['planOffers']) && context['planOffers'].length)
    projected['planningMeaning'] = KNOWN_PLANNING_MEANING;
  return orderedDecisionContext(projected);
}

/** Attribution comes from event-time awareness, never a name guessed from a quote. */
export function responseTrigger(
  service: WorldService,
  actorId: string,
  eventId: string | undefined,
  fallback: string,
  evidence?: Awareness[],
): string {
  const world = service.world;
  const aware = eventId
    ? (evidence ?? world.experience?.awareness[actorId])?.find((entry) => entry.eventId === eventId)
    : undefined;
  if (!aware) return `Situation change: ${fallback}`;
  const triggerKind = aware.triggerKind;
  const time = `(${gameTime(aware.at, world.statusEffectPolicy.clockOffsetHours, world.presentation?.calendar?.dayLabel)})`;
  if (aware.speech) {
    return `${triggerKind === 'addressed_speech' ? 'Addressed speech (to me)' : triggerKind === 'self_event' ? 'My own speech' : 'Nearby speech'}: ${speechDescription(aware)} ${time}`;
  }
  return `${triggerKind === 'directed_action' ? 'Action directed at me' : aware.modality === 'internal' ? 'Internal change' : 'World change'}: ${aware.content ?? aware.text} ${time}`;
}

/** Present event-time attribution alongside current perception, without filling unknown roles. */
export function responseTriggerContext(
  service: WorldService,
  actorId: string,
  eventId?: string,
  evidence?: Awareness[],
): Record<string, unknown> | undefined {
  if (!eventId) return undefined;
  const world = service.world;
  const aware = (evidence ?? world.experience?.awareness[actorId])?.find(
    (entry) => entry.eventId === eventId,
  );
  if (!aware) return undefined;
  const source =
    aware.sourceId && awarenessBindsSubject(world, actorId, aware, aware.sourceId)
      ? entityGet(world.entities, aware.sourceId)
      : undefined;
  const recipientId = aware.targetId;
  const recipient =
    recipientId && awarenessBindsSubject(world, actorId, aware, recipientId)
      ? entityGet(world.entities, recipientId)
      : undefined;
  const observer = entityGet(world.entities, actorId);
  const bindings = experienceModelBindings(
    world,
    actorId,
    { source: 'awareness', value: aware },
    'trigger',
  );
  const experience = experienceForModel({ source: 'awareness', value: aware }, bindings);
  return {
    experience,
    // Awareness.actorId identifies the observer, not necessarily the acting person.
    // An unknown source stays unknown; contact alone does not identify an attacker.
    participants: aware.speech
      ? {
          observer: experience.owner,
          speaker: aware.sourceId ? (bindings.entities.get(aware.sourceId) ?? null) : null,
          intendedAddressee: aware.targetId
            ? (bindings.entities.get(aware.targetId) ?? null)
            : null,
        }
      : {
          observer: experience.owner,
          perceivedSource: aware.sourceId ? (bindings.entities.get(aware.sourceId) ?? null) : null,
          subject: aware.targetId ? (bindings.entities.get(aware.targetId) ?? null) : null,
        },
    eventTime: gameTime(
      aware.at,
      world.statusEffectPolicy.clockOffsetHours,
      world.presentation?.calendar?.dayLabel,
    ),
    ageGameSeconds: Math.max(0, world.simTime - aware.at),
    observerRelationship: aware.triggerKind ?? 'observed_event',
    // Omit inapplicable roles: strict AI serialization rejects undefined before dispatch.
    // docs/architecture.md#cognition-attribution-and-pacing
    ...(aware.speech
      ? {
          addressing: aware.speech?.addressing ?? null,
          observerRelation: speechRoles(aware)?.relationship ?? 'unavailable',
        }
      : {}),
    ...(source && !aware.speech
      ? { source: entityLabel(world, source, actorId), sourceIsMe: source.id === actorId }
      : {}),
    ...(!aware.speech && recipient
      ? {
          subject: entityLabel(world, recipient, actorId),
          subjectCurrentlyVisible: !!(observer && seesEntity(world, observer, recipient)),
        }
      : {}),
    sourceCurrentlyVisible: !!(source && observer && seesEntity(world, observer, source)),
  };
}

/** Keep current visibility/age/roles beside the cause, but reference the complete
 * source already admitted to the request instead of copying its payload or words. */
export function referenceTriggerContext(facts: Record<string, unknown>, index: number) {
  return {
    triggerFacts: { ...facts, experience: modelEvidenceReference(index) },
    stimulus: `Current cause: ${modelEvidenceReference(index)}`,
  };
}

export function readableDecisionContext(
  context: Record<string, unknown>,
  actions: DecisionActionOffer[],
  includeActions = false,
): string {
  return renderDecisionContext(context, actions, includeActions).prompt;
}

/** Shared rendering lets final fitting measure only changed offers, rather than
 * repeatedly formatting the unchanged identity, conversation and source bodies. */
export function renderActionChoices(actions: readonly DecisionActionOffer[]): string {
  return `## Actions\nOptional relevant executable choices; selection is not mandatory:\n${actions.length ? actions.map((action) => `- ${action.id}: ${action.description} [mode=${action.mode}]`).join('\n') : 'No shortlisted mechanical action.'}\nI may propose an unlisted action. I should not prefer an existing action just because it is listed. A proposal is an intention, not a completed action; unsupported mechanics cannot execute. A useful partial interpretation must report omissions; uncertain revisions require explicit initiator acceptance, not automatic invention.`;
}

/** Keep the response-only supplement seam with the renderer, never by searching
 * authored text for headings or serializing the complete selected context again. */
export function renderDecisionContext(
  context: Record<string, unknown>,
  actions: DecisionActionOffer[],
  includeActions = false,
): { prompt: string; responseSupplementOffset: number; actionSectionBytes: number } {
  context = projectDecisionPresentation(context);
  const requirements = context['decisionRequirements'] as
    | Pick<DecisionRequirements, 'question' | 'enabledSemantics'>
    | undefined;
  const allows = (operation: ResponseOperationKind) =>
    responseOperationEnabled(requirements?.enabledSemantics, operation);
  const actionsEnabled = allows('act') || allows('plan');
  const capabilities = context['capabilities'] as
    | { speech: boolean; expressions: string[] }
    | undefined;
  // Output families come from the selected world, never from this text.
  const outputs = Array.isArray(context['outputFamilies'])
    ? (context['outputFamilies'] as string[]).join(', ')
    : 'none supplied';
  const supportsExpressions = !!capabilities?.expressions.length;
  const expressionGuidance = !actionsEnabled
    ? ''
    : supportsExpressions
      ? `Supported expressions:\n${((context['expressionDescriptions'] as string[]) ?? []).join('; ')}`
      : 'This body has no supported gesture expressions; act.kind=expression is unavailable. Descriptive emotion in speech is still allowed and does not perform a gesture.';
  const hasItems = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0;
  const list = (value: unknown) =>
    hasItems(value)
      ? value.map((line) => `- ${String(line).replace(/\n/g, '\n  ')}`).join('\n')
      : 'None supplied.';
  const triggerFacts = context['triggerFacts'] as Record<string, unknown> | null | undefined;
  const memories = hasItems(context['recall'])
    ? [
        `## Recalled memories\nReferences into the complete personal evidence array:\n${list(context['recall'])}`,
      ]
    : [];
  const conversation = hasItems(context['conversation'])
    ? [
        `## Conversation so far\nReferences to selected speech I personally experienced, in chronological order; older unselected history may remain:\n${list(context['conversation'])}\nEach referenced record preserves who spoke to whom. My own speech is not a reply from someone else. Avoid repeating an unanswered greeting or question unless the situation warrants it.`,
      ]
    : [];
  const sections = [
    `## Task\n${requirements?.question ?? responseTaskInstructions(triggerFacts?.['observerRelationship'] === 'addressed_speech')}`,
    '## Context\nMy identity, present state, acquired evidence and available choices follow. These are information for my decision, not a checklist of things to mention or goals to adopt. Keep current facts, memories, claims and interpretations distinct.',
    ...(triggerFacts
      ? [
          `## Current cause\n${JSON.stringify(triggerFacts)}\nEvent-time identity and current visibility are separate. Another nearby individual of the same species is not the speaker. Reconsider whether an older social opportunity still warrants a response; overhearing does not imply an invitation, but deliberate participation is allowed.`,
        ]
      : []),
    ...(context['stimulus'] ? [`## Trigger\n${context['stimulus']}`] : []),
    `## Me\n${[context['identity'], context['aboutMe'], context['body'], context['feelings'], context['carryingConcern']].filter((value) => typeof value === 'string' && value.length > 0).join('\n')}\n${expressionGuidance}${capabilities?.speech === false ? '\nI cannot speak; do not emit talk operations.' : ''}`,
    ...(hasItems(context['commitments']) || context['activityCoverage']
      ? [`## My commitments\n${list(context['commitments'])}\n${context['activityCoverage'] ?? ''}`]
      : []),
    `## Private intentions and native work\n${formatIntentions(context['agency'], requirements?.enabledSemantics)}\nThese are intentions and actual step dispositions, never proof that an objective was achieved.${actionsEnabled || allows('goal') ? ' Reconsider an existing purpose when its reason has ended, an opportunity was declined, or an unchanged obstacle prevents progress. Continuing for a remaining reason is legitimate; a trait alone does not require restarting completed work.' : ''}`,
    `## Complete personal evidence\n${JSON.stringify(context['experience'] ?? [])}\nThis array is character.experience; an index reference is zero-based. ${MODEL_EXPERIENCE_MEANING} Self, addressed, overheard, ambient and seen-only are distinct; none grants consent or forces a reply.`,
    ...conversation,
    ...memories,
    ...(Array.isArray(context['planOffers']) && context['planOffers'].length
      ? [
          `## Known planning techniques\n${JSON.stringify(context['planOffers'] ?? [])}\n${KNOWN_PLANNING_MEANING}`,
        ]
      : []),
    ...(Array.isArray(context['intentActions']) && context['intentActions'].length
      ? [
          `## Private intent controls\n${JSON.stringify(context['intentActions'] ?? [])}\nUse a known action handle to accept the exact revised action or withdraw an unresolved intent. Withdrawal does not cancel physical work; neither control can be queued in a plan. Never accept for another actor.`,
        ]
      : []),
    ...(Array.isArray(context['supplyOpportunities']) && context['supplyOpportunities'].length
      ? [`## Optional personal supply considerations\n${list(context['supplyOpportunities'])}`]
      : []),
    ...(Array.isArray(context['blockedCapabilities']) && context['blockedCapabilities'].length
      ? [
          `## Currently blocked capabilities\n${JSON.stringify(context['blockedCapabilities'])}\nThese are information, not selectable immediate actions. Native reasons and game-time recovery boundaries describe what must change; an unlisted proposal still requires native admission.`,
        ]
      : []),
    ...(context['navigation'] || context['currentPosition']
      ? [
          `## ${actionsEnabled ? 'Native navigation' : 'Current position and known places'}\n${context['navigation'] ?? ''}${context['spatialPerspective'] ? `\n${context['spatialPerspective']}` : ''}${context['currentPosition'] ? `\nPosition: ${JSON.stringify(context['currentPosition'])}; support: ${context['currentSupport'] ?? 'unavailable'}` : ''}${context['currentFacing'] ? `\nFacing in world X/Z directions: ${JSON.stringify(context['currentFacing'])}` : ''}${hasItems(context['publicSurfaces']) ? `\nPublic supports: ${JSON.stringify(context['publicSurfaces'])}` : ''}${context['publicSurfacesCoverage'] ? `\n${context['publicSurfacesCoverage']}` : ''}`,
        ]
      : []),
    ...(context['now'] || typeof context['simTime'] === 'number'
      ? [
          `## Current time\n${context['now'] ?? ''}${typeof context['simTime'] === 'number' ? ` (simulation seconds: ${context['simTime']})` : ''}`,
        ]
      : []),
    ...(hasItems(context['activityDirectory'])
      ? [
          `## Additional supported activities\n${JSON.stringify(context['activityDirectory'])}\nInvocation details for these additional families are not included in this response. Complete activity forms below supply the exact parameters for direct invocation. A family description alone supplies no parameter values or permission to execute.`,
        ]
      : []),
    ...(actionsEnabled && context['activityRequests']
      ? [
          `## ${ACTIVITY_REQUEST_LABEL}\n${ACTIVITY_REQUEST_MEANING}\n${JSON.stringify(compactActivityRequests(context['activityRequests'] as ModelActivityRequests))}\nChoose act.kind "invoke" for one of these activity forms. ${ACTIVITY_INVOCATION_INSTRUCTIONS} If a parameter declares a work mode, keep it equal to act.mode.`,
        ]
      : []),
    ...(context['inspectedContainer']
      ? [
          `## Container I chose to inspect\n${JSON.stringify(context['inspectedContainer'])}\nOnly these exact contents are known from this page. Further pages and nested contents remain unknown. Access or movement can invalidate this inspection.`,
        ]
      : []),
    ...(context['inspectedActions']
      ? [`## Actions I chose to inspect\n${list(context['inspectedActions'])}`]
      : []),
    ...(context['inspectedMethods']
      ? [`## Activities I chose to inspect\n${list(context['inspectedMethods'])}`]
      : []),
    ...(hasItems(context['surroundings']) || hasItems(context['contacts'])
      ? [
          `## Nearby actors and objects\n${list(context['surroundings'])}${hasItems(context['contacts']) ? `\nContact evidence:\n${list(context['contacts'])}` : ''}`,
        ]
      : []),
    ...(hasItems(context['possessions']) || context['inventoryCoverage']
      ? [
          `## Inventory\n${list(context['possessions'])}${context['inventoryCoverage'] ? `\nPartial inventory preparation: ${JSON.stringify(context['inventoryCoverage'])}. Only this page and bound tools were considered. Other possessions may be useful; explicitly inspect another page when needed. Omission is not absence.` : ''}`,
        ]
      : []),
    ...(context['notepad']
      ? [`## General knowledge notepad\n${JSON.stringify(context['notepad'])}`]
      : []),
    ...(hasItems(context['knowledge']) ? [`## Knowledge\n${list(context['knowledge'])}`] : []),
  ];
  const actionSection = includeActions && actionsEnabled ? renderActionChoices(actions) : '';
  if (includeActions && actionsEnabled) sections.push(actionSection);
  // Schema-use and optional-silence guidance improved matched responses beyond the schema alone.
  // docs/verification/cognition-lab-native-model-study.md#october-28--prompt-voice-and-context-comparison
  const responseRules = [
    `## Response rules\n${responseOperationGuide(requirements?.enabledSemantics)}`,
    allows('talk') ? RESPONSE_PORTRAYAL_GUIDE : '',
    actionsEnabled
      ? 'Proposals preserve exact references, amounts and qualifiers in slots: quantityMode exact means units handled; held means total to carry afterward.'
      : '',
    [
      allows('goal') ? 'Goals are private intentions; marking one complete grants no reward.' : '',
      allows('goal') || allows('plan')
        ? `Copy current ${allows('goal') && allows('plan') ? 'goal/plan revisions' : allows('goal') ? 'goal revisions' : 'plan revisions'}.`
        : '',
      allows('plan')
        ? `Plans wait for actual earlier completion, recheck prerequisites and stop on failure; a new goal alias "$localId" requires that earlier goal's admission. Only ${outputs} supply a single item receipt for later equip/eat steps; do not invent future item IDs. Empty or blocked work does not require restarting it.`
        : '',
      actionsEnabled
        ? 'Native navigation and installed requests retain their exact parameters and work modes.'
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    allows('note') || allows('name') || allows('talk')
      ? (context['knowledgeInstructions'] ?? '')
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  sections.push(`## References
Names are display prose, never identifiers. Copy the opaque ID token from (ID:token) into structured entity fields. Never invent a token or use a species name as an ID.${actionsEnabled ? ' Include (ID:token) in an unlisted proposal when identifying its target.' : ''}
${list((context['references'] as ResponseReference[] | undefined)?.map(responseReferenceText))}`);
  const responseSupplementOffset = sections.reduce(
    (size, section, index) => size + section.length + (index ? 2 : 0),
    0,
  );
  sections.push(responseRules);
  return {
    prompt: sections.join('\n\n'),
    responseSupplementOffset,
    actionSectionBytes: Buffer.byteLength(actionSection),
  };
}

/** Readable permitted directory data; native IDs and authority remain in the binding. */
export interface ResponseReference {
  entityId: string | undefined;
  label: string;
  relation?: string;
  species?: string;
  position?: ReturnType<typeof worldPosition>;
  noteRevision?: number;
  noteCharacters?: number;
  nameRevision?: number;
  knowledgeBinding?: 'unresolved';
  triggerRoles?: { evidenceId: string; role: string }[];
}

/** Prose is the encoding boundary; structured callers retain the original row. */
export function responseReferenceText(reference: ResponseReference): string {
  return JSON.stringify(reference);
}

/** Only visible or explicitly perceived identities enter the reference contract. */
export function responseReferences(
  world: WorldState,
  actorId: string,
  visibleIds: string[],
  evidenceIds: string[],
  rememberedIds: string[] = [],
  retainedEvidence?: Awareness[],
  /** Own accessible possessions already selected into context; usable in action slots. */
  possessionIds: string[] = [],
  /** Portable stacks lying in visible piles; usable for pickup and slots. */
  pileItemIds: string[] = [],
  /** Current prepared request choices and an explicitly inspected container page. */
  inspectedIds: string[] = [],
) {
  const evidence = new Set(evidenceIds);
  const awareness = (retainedEvidence ?? world.experience?.awareness[actorId] ?? []).filter(
    (entry) => evidence.has(entry.eventId),
  );
  const ids = [
    ...new Set([
      actorId,
      ...visibleIds,
      ...rememberedIds,
      ...awareness
        .flatMap((entry) =>
          [entry.sourceId, entry.targetId, ...entry.entityIds].filter(
            (id): id is string => !!id && awarenessBindsSubject(world, actorId, entry, id),
          ),
        )
        .filter((id): id is string => !!id),
    ]),
  ];
  const visible = new Set(visibleIds);
  const handles = experienceEntityReferences(world, actorId, ids);
  const recognizedIds = new Set([actorId, ...visibleIds]);
  const roles = new Map<string, { evidenceId: string; role: string }[]>();
  const rememberedLabels = new Map<string, string>();
  for (const entry of awareness) {
    for (const reference of entry.references ?? [])
      rememberedLabels.set(reference.id, reference.label);
    if (entry.recognized && entry.sourceId) recognizedIds.add(entry.sourceId);
    if (entry.targetId) recognizedIds.add(entry.targetId);
    for (const [id, role] of [
      [entry.sourceId, 'source'],
      [entry.targetId, entry.speech ? 'intended_recipient' : 'subject'],
    ] as const) {
      if (!id || !awarenessBindsSubject(world, actorId, entry, id)) continue;
      const entries = roles.get(id) ?? [];
      entries.push({ evidenceId: entry.eventId, role });
      roles.set(id, entries);
    }
  }
  const possessions = possessionIds.filter(
    (id) => !ids.includes(id) && accessiblePossession(world, actorId, id),
  );
  const piled = pileItemIds.filter((id) => !ids.includes(id) && !possessions.includes(id));
  const references = ids.map((id): ResponseReference => {
    const entity = entityGet(world.entities, id);
    const rememberedLabel = rememberedLabels.get(id);
    if (!entity)
      return {
        entityId: handles.get(id),
        label: rememberedLabel ?? 'Remembered individual',
        relation: 'remembered identity; current body and location unavailable',
      };
    return {
      entityId: entityHandles(world, actorId).get(id),
      label: recognizedIds.has(id)
        ? entityLabel(world, entity, actorId)
        : `Unidentified ${entity.actor ? 'actor' : 'entity'} (ID:${entityHandles(world, actorId).get(id)})`,
      ...(entity.actor
        ? { species: recognizedIds.has(id) ? (entity.actor.species ?? 'unknown') : 'unknown' }
        : {}),
      ...(id === actorId ? { relation: 'myself' } : {}),
      ...(visible.has(id) ? { position: worldPosition(entity) } : {}),
      ...(recognizesSubject(world, actorId, id) || !world.observerIdentities?.[actorId]?.[id]
        ? {
            noteRevision: knowledgeDocument(world, actorId, id)?.revision ?? 0,
            noteCharacters: characterCount(knowledgeDocument(world, actorId, id)?.text ?? ''),
            nameRevision: world.observerIdentities?.[actorId]?.[id]?.revision ?? 0,
          }
        : { knowledgeBinding: 'unresolved' }),
      ...(roles.has(id) ? { triggerRoles: roles.get(id)! } : {}),
    };
  });
  for (const id of possessions)
    references.push({
      entityId: entityHandles(world, actorId).get(id),
      label: entityLabel(world, entityGet(world.entities, id)!, actorId),
      relation: 'my possession',
    });
  for (const id of piled)
    references.push({
      entityId: entityHandles(world, actorId).get(id),
      label: entityLabel(world, entityGet(world.entities, id)!, actorId),
      relation: 'lying in a visible pile',
    });
  const inspected = [...new Set(inspectedIds)].filter(
    (id) =>
      !ids.includes(id) &&
      !possessions.includes(id) &&
      !piled.includes(id) &&
      entityHas(world.entities, id),
  );
  for (const id of inspected)
    references.push({
      entityId: entityHandles(world, actorId).get(id),
      label: entityLabel(world, entityGet(world.entities, id)!, actorId),
      relation: 'current permitted activity choice or inspected container page',
    });
  const all = [...ids, ...possessions, ...piled, ...inspected];
  const completeHandles = experienceEntityReferences(world, actorId, all);
  return {
    entityIds: all,
    references,
    entityReferences: Object.fromEntries(all.map((id) => [completeHandles.get(id)!, id])),
  };
}

function formatIntentions(value: unknown, enabledSemantics?: readonly string[]): string {
  const agency = value as
    | {
        goals?: { id: string; revision: number; objective: string; status: string }[];
        plan?: unknown;
        paused?: unknown;
        planRevision?: number;
        outcomeCoverage?: string;
        attempts?: { description: string }[];
      }
    | undefined;
  return [
    typeof agency?.plan === 'string' ? agency.plan : 'No remaining work supplied.',
    ...(typeof agency?.paused === 'string' ? [agency.paused] : []),
    ...(agency?.outcomeCoverage ? [agency.outcomeCoverage] : []),
    ...(responseOperationEnabled(enabledSemantics, 'plan')
      ? [`For structured plan changes, current plan revision: ${agency?.planRevision ?? 0}.`]
      : []),
    ...(agency?.goals?.length
      ? [
          responseOperationEnabled(enabledSemantics, 'goal')
            ? `Goals and their current controls: ${JSON.stringify(agency.goals.map(({ id, revision, objective, status }) => ({ id, revision, objective, status })))}`
            : `Goals: ${JSON.stringify(agency.goals.map(({ objective, status }) => ({ objective, status })))}`,
        ]
      : []),
    ...(agency?.attempts ?? []).map((attempt) => `Unresolved intention: ${attempt.description}`),
  ].join('\n');
}
