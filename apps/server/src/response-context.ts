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
} from './perceived-context.js';
import type { WorldService } from './world-service.js';
import type { DecisionActionOffer } from './context.js';

export const KNOWN_ACTION_MODE_INSTRUCTION =
  'For a known action, copy its offered mode exactly; it specifies how that choice handles current work. Continuing choices use enqueue to preserve current work.';

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
  const groups = new Map<string, number>();
  const choiceGroups: Array<
    Pick<ActivityRequestChoice, 'kind' | 'roles' | 'accessible' | 'requestIds'>
  > = [];
  const choices = catalogue.choices.map(({ kind, roles, accessible, requestIds, ...choice }) => {
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
    requests: catalogue.requests,
    choiceGroups,
    choices,
    warnings: catalogue.warnings,
    reading:
      'Each choice inherits every field from choiceGroups[group], a zero-based metadata index, not an entity ID. Choices remain separate exact alternatives; group membership is not a requirement to perform them together.',
  };
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
  const experience = experienceForModel(
    { source: 'awareness', value: aware },
    experienceModelBindings(world, actorId, { source: 'awareness', value: aware }, 'trigger'),
  );
  return {
    experience,
    // Awareness.actorId identifies the observer, not necessarily the acting person.
    // An unknown source stays unknown; contact alone does not identify an attacker.
    participants: aware.speech
      ? {
          observer: experience.owner,
          speaker: experience.value['sourceId'] ?? null,
          intendedAddressee: experience.value['targetId'] ?? null,
        }
      : {
          observer: experience.owner,
          perceivedSource: experience.value['sourceId'] ?? null,
          subject: experience.value['targetId'] ?? null,
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
  const capabilities = context['capabilities'] as
    | { speech: boolean; expressions: string[] }
    | undefined;
  // Output families come from the selected world, never from this text.
  const outputs = Array.isArray(context['outputFamilies'])
    ? (context['outputFamilies'] as string[]).join(', ')
    : 'none supplied';
  const supportsExpressions = !!capabilities?.expressions.length;
  const expressionGuidance = supportsExpressions
    ? `Supported expressions:\n${((context['expressionDescriptions'] as string[]) ?? []).join('; ')}`
    : 'This body has no supported gesture expressions; act.kind=expression is unavailable. Descriptive emotion in speech is still allowed and does not perform a gesture.';
  const hasItems = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0;
  const list = (value: unknown) =>
    hasItems(value)
      ? value.map((line) => `- ${String(line).replace(/\n/g, '\n  ')}`).join('\n')
      : 'None supplied.';
  const triggerFacts = context['triggerFacts'] as Record<string, unknown> | null | undefined;
  // Organization follows an acquired event role, not a guessed scene or personality.
  const speechCause = triggerFacts?.['observerRelation'] !== undefined;
  const memories =
    hasItems(context['recall']) || context['reconsideration']
      ? [
          `## Recalled memories\nReferences into the complete personal evidence array:\n${list(context['recall'])}${context['reconsideration'] ? `\n${context['reconsideration']}` : ''}`,
        ]
      : [];
  const conversation = hasItems(context['conversation'])
    ? [
        `## Conversation so far\nReferences to selected speech I personally experienced, in chronological order; older unselected history may remain:\n${list(context['conversation'])}\nEach referenced record preserves who spoke to whom. My own speech is not a reply from someone else. Avoid repeating an unanswered greeting or question unless the situation warrants it.`,
      ]
    : [];
  const sections = [
    `## Me\n${[context['identity'], context['aboutMe'], context['body'], context['feelings'], context['carryingConcern']].filter((value) => typeof value === 'string' && value.length > 0).join('\n')}\n${expressionGuidance}${capabilities?.speech === false ? '\nI cannot speak; do not emit talk operations.' : ''}`,
    ...(hasItems(context['commitments']) || context['activityCoverage']
      ? [`## My commitments\n${list(context['commitments'])}\n${context['activityCoverage'] ?? ''}`]
      : []),
    ...(Array.isArray(context['planOffers']) && context['planOffers'].length
      ? [
          `## Known planning techniques\n${JSON.stringify(context['planOffers'] ?? [])}\nPrerequisites must be obtained first. These handles can be queued without a current action shortlist.`,
        ]
      : []),
    ...(Array.isArray(context['intentActions']) && context['intentActions'].length
      ? [
          `## Private intent controls\n${JSON.stringify(context['intentActions'] ?? [])}\nUse a known action handle to accept the exact revised action or withdraw an unresolved intent. Withdrawal does not cancel physical work; neither control can be queued in a plan. Never accept for another actor.`,
        ]
      : []),
    `## Private intentions and native work\n${formatIntentions(context['agency'])}\nThese are intentions and actual step dispositions, never proof that an objective was achieved. Reconsider an existing purpose when its reason has ended, an opportunity was declined, or an unchanged obstacle prevents progress. Continuing for a remaining reason is legitimate; a trait alone does not require restarting completed work.`,
    ...(Array.isArray(context['supplyOpportunities']) && context['supplyOpportunities'].length
      ? [`## Optional personal supply considerations\n${list(context['supplyOpportunities'])}`]
      : []),
    ...(context['navigation'] || context['currentPosition']
      ? [
          `## Native navigation\n${context['navigation'] ?? ''}${context['currentPosition'] ? `\nPosition: ${JSON.stringify(context['currentPosition'])}; support: ${context['currentSupport'] ?? 'unavailable'}` : ''}${context['currentFacing'] ? `\nFacing in world X/Z directions: ${JSON.stringify(context['currentFacing'])}` : ''}${hasItems(context['publicSurfaces']) ? `\nPublic supports: ${JSON.stringify(context['publicSurfaces'])}` : ''}${context['publicSurfacesCoverage'] ? `\n${context['publicSurfacesCoverage']}` : ''}`,
        ]
      : []),
    ...(context['now'] || typeof context['simTime'] === 'number'
      ? [
          `## Current time\n${context['now'] ?? ''}${typeof context['simTime'] === 'number' ? ` (simulation seconds: ${context['simTime']})` : ''}`,
        ]
      : []),
    ...(context['activityRequests']
      ? [
          `## Optional installed activity requests\n${JSON.stringify(compactActivityRequests(context['activityRequests'] as ModelActivityRequests))}\nUse these exact installed definitions and situation-specific choices. They are optional compositions, not goals, learned methods or completed work. An installed request selects its exact family and only that family's declared parameters. When its parameters declare the same work mode, keep it equal to act.mode. Current native prerequisites still apply.`,
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
  const actionSection = includeActions ? renderActionChoices(actions) : '';
  if (includeActions) sections.push(actionSection);
  // Schema-use and optional-silence guidance improved matched responses beyond the schema alone.
  // docs/verification/cognition-lab-native-model-study.md#october-28--prompt-voice-and-context-comparison
  sections.push(
    `## Response format\nUse the supplied JSON schema: each operation contains localId, requiresAccepted and only its selected nonnull payload. Return {"operations":[]} to continue without intervention. Independent speech and action can coexist as separate operations; requiresAccepted refers only to earlier localIds and means admission, never physical completion. Do not invent a thought or goal to fill the response.
Speech addresses only a supplied reference or explicitly nobody; never inherit a recipient. Whispering is not guaranteed private. Express the person's voice and feelings in their speech; emotional asides need no matching action. A relationship or past playful response is evidence, not permanent permission. Distinguish memory, another person's claim, inference and deliberate deception. You may elaborate a sparse pre-game past consistently with this person's supplied identity; do not contradict established history or present an invented detail as a retrieved memory, shared experience or current fact.
${KNOWN_ACTION_MODE_INSTRUCTION} Proposals preserve exact references, amounts and qualifiers in slots: quantityMode exact means units handled; held means total to carry afterward. A proposal or descriptive gesture does not perform contact, injury, equipment changes or movement. Only native admitted operations produce their declared effects; unsupported intentions remain unperformed.
Goals are private intentions; marking one complete grants no reward. Copy current goal/plan revisions. Plans wait for actual earlier completion, recheck prerequisites and stop on failure; a new goal alias "$localId" requires that earlier goal's admission. Only ${outputs} supply a single item receipt for later equip/eat steps; do not invent future item IDs. Empty or blocked work does not require restarting it. Native navigation and installed requests retain their exact parameters and work modes.
${context['knowledgeInstructions'] ?? 'Knowledge edits are unavailable.'}`,
  );
  sections.push(`## References
Names are display prose, never identifiers. Copy the opaque ID token from (ID:token) into structured entity fields. Never invent a token or use a species name as an ID. Include (ID:token) in an unlisted proposal when identifying its target.
${list(context['references'])}`);
  const responseSupplementOffset = sections.reduce(
    (size, section, index) => size + section.length + (index ? 2 : 0),
    0,
  );
  sections.push(
    `## Complete personal evidence\n${JSON.stringify(context['experience'] ?? [])}\nThis array is character.experience; an index reference is zero-based. A record's owner, and value.actorId when present, identify the experiencer, not necessarily who acted. In speech awareness, sourceId is the acquired speaker and targetId the acquired addressee; eventData retains the event's own role names. A perceived source need not be the agent or cause. Source, acquisition, event time, exact heard fragments and uncertainty retain their recorded meaning. Quoted "I" and "you" belong to that speaker and addressee. Self, addressed, overheard, ambient and seen-only are distinct; none grants consent or forces a reply.`,
    ...(speechCause ? [...memories, ...conversation] : [...conversation, ...memories]),
    ...(triggerFacts
      ? [
          `## Trigger facts\n${JSON.stringify(triggerFacts)}\nEvent-time identity and current visibility are separate. Another nearby individual of the same species is not the speaker. Reconsider whether an older social opportunity still warrants a response; overhearing does not imply an invitation, but deliberate participation is allowed.`,
        ]
      : []),
    ...(context['stimulus'] ? [`## Trigger\n${context['stimulus']}`] : []),
    `## Task\nChoose only warranted speech, actions, private thoughts, goals or a short native plan. Each kind is optional and may repeat.${triggerFacts?.['observerRelationship'] === 'addressed_speech' ? ' Speech directed at me normally deserves a natural conversational response, whether a question, statement or greeting.' : ''} Silence is also a valid choice. Respond as this person, not as an observer reporting the prompt. A small action shortlist does not mean I can only speak.`,
  );
  return {
    prompt: sections.join('\n\n'),
    responseSupplementOffset,
    actionSectionBytes: Buffer.byteLength(actionSection),
  };
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
  const references = ids.map((id) => {
    const entity = entityGet(world.entities, id);
    const rememberedLabel = rememberedLabels.get(id);
    if (!entity)
      return JSON.stringify({
        entityId: handles.get(id),
        label: rememberedLabel ?? 'Remembered individual',
        relation: 'remembered identity; current body and location unavailable',
      });
    return JSON.stringify({
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
      triggerRoles: roles.get(id) ?? [],
    });
  });
  for (const id of possessions)
    references.push(
      JSON.stringify({
        entityId: entityHandles(world, actorId).get(id),
        label: entityLabel(world, entityGet(world.entities, id)!, actorId),
        relation: 'my possession',
      }),
    );
  for (const id of piled)
    references.push(
      JSON.stringify({
        entityId: entityHandles(world, actorId).get(id),
        label: entityLabel(world, entityGet(world.entities, id)!, actorId),
        relation: 'lying in a visible pile',
      }),
    );
  const inspected = [...new Set(inspectedIds)].filter(
    (id) =>
      !ids.includes(id) &&
      !possessions.includes(id) &&
      !piled.includes(id) &&
      entityHas(world.entities, id),
  );
  for (const id of inspected)
    references.push(
      JSON.stringify({
        entityId: entityHandles(world, actorId).get(id),
        label: entityLabel(world, entityGet(world.entities, id)!, actorId),
        relation: 'current permitted activity choice or inspected container page',
      }),
    );
  const all = [...ids, ...possessions, ...piled, ...inspected];
  const completeHandles = experienceEntityReferences(world, actorId, all);
  return {
    entityIds: all,
    references,
    entityReferences: Object.fromEntries(all.map((id) => [completeHandles.get(id)!, id])),
  };
}

function formatIntentions(value: unknown): string {
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
    `For structured plan changes, current plan revision: ${agency?.planRevision ?? 0}.`,
    ...(agency?.goals?.length
      ? [
          `Goals and their current controls: ${JSON.stringify(agency.goals.map(({ id, revision, objective, status }) => ({ id, revision, objective, status })))}`,
        ]
      : []),
    ...(agency?.attempts ?? []).map((attempt) => `Unresolved intention: ${attempt.description}`),
  ].join('\n');
}
