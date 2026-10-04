import { accessiblePossession, ITEM_OUTPUT_FAMILIES, worldPosition } from '@open-legend/domain';
import { knowledgeDocument, characterCount, recognizesSubject } from '@open-legend/domain';
import {
  awarenessBindsSubject,
  entityLabel,
  entityReferenceMap,
  entityHandles,
} from './entity-references.js';
import {
  seesEntity,
  speechDescription,
  type Awareness,
  type WorldState,
} from '@open-legend/domain';
import { gameTime } from './recall.js';
import type { JsonValue } from '@open-legend/ai';
import type { WorldService } from './world-service.js';

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
  const time = `(${gameTime(aware.at, world.statusEffectPolicy.clockOffsetHours)})`;
  if (aware.eventType === 'speech') {
    if (!aware.speech) throw new Error('Speech is missing its committed listener perspective.');
    return `${triggerKind === 'addressed_speech' ? 'Addressed speech (to me)' : triggerKind === 'self_event' ? 'My own speech' : 'Nearby speech'}: ${speechDescription(aware.speech)} ${time}`;
  }
  return `${triggerKind === 'directed_action' ? 'Action directed at me' : aware.modality === 'internal' ? 'Internal change' : 'World change'}: ${aware.content ?? aware.text} ${time}`;
}

/** Present event-time attribution alongside current perception, without filling unknown roles. */
export function responseTriggerContext(
  service: WorldService,
  actorId: string,
  eventId?: string,
  evidence?: Awareness[],
): Record<string, JsonValue> | undefined {
  if (!eventId) return undefined;
  const world = service.world;
  const aware = (evidence ?? world.experience?.awareness[actorId])?.find(
    (entry) => entry.eventId === eventId,
  );
  if (!aware) return undefined;
  const source =
    aware.sourceId && awarenessBindsSubject(world, actorId, aware, aware.sourceId)
      ? world.entities[aware.sourceId]
      : undefined;
  const recipientId = aware.intendedRecipientId ?? aware.targetId;
  const recipient =
    recipientId && awarenessBindsSubject(world, actorId, aware, recipientId)
      ? world.entities[recipientId]
      : undefined;
  const observer = world.entities[actorId];
  return {
    eventId: aware.eventId,
    eventTime: gameTime(aware.at, world.statusEffectPolicy.clockOffsetHours),
    ageGameSeconds: Math.max(0, world.simTime - aware.at),
    observerRelationship: aware.triggerKind ?? 'observed_event',
    // Omit inapplicable roles: strict AI serialization rejects undefined before dispatch.
    // docs/architecture.md#cognition-attribution-and-pacing
    ...(aware.eventType === 'speech'
      ? {
          speaker: source ? entityLabel(world, source, actorId) : 'Unknown speaker',
          intendedRecipient: recipient
            ? entityLabel(world, recipient, actorId)
            : 'Unknown; no recipient identity perceived',
        }
      : {}),
    ...(source && aware.eventType !== 'speech'
      ? { source: entityLabel(world, source, actorId), sourceIsMe: source.id === actorId }
      : {}),
    ...(aware.eventType !== 'speech' && recipient
      ? {
          subject: entityLabel(world, recipient, actorId),
          subjectCurrentlyVisible: !!(observer && seesEntity(world, observer, recipient)),
        }
      : {}),
    sourceCurrentlyVisible: !!(source && observer && seesEntity(world, observer, source)),
  };
}

export function readableDecisionContext(
  context: Record<string, unknown>,
  actions: { id: string; description: string }[],
  includeActions = false,
): string {
  const capabilities = context['capabilities'] as
    | { speech: boolean; expressions: boolean }
    | undefined;
  // Stopping-time names and output families come from the world, never from this text.
  const namedTimes = Array.isArray(context['namedTimes'])
    ? (context['namedTimes'] as string[])
    : [];
  const outputs =
    ITEM_OUTPUT_FAMILIES.slice(0, -1).join(', ') + ' and ' + ITEM_OUTPUT_FAMILIES.at(-1);
  const expressionGuidance = capabilities?.expressions
    ? 'Supported gestures: nod, smile, frown, wave, shrug, shake_head, slap. Expressions have no mechanical effects; a slap requires contact range.'
    : 'This body has no supported gesture expressions. Do not use act.kind=expression or describe human gestures as performed.';
  const list = (value: unknown) =>
    Array.isArray(value) && value.length
      ? value.map((line) => `- ${String(line).replace(/\n/g, '\n  ')}`).join('\n')
      : 'None supplied.';
  const sections = [
    `## Me\n${context['identity']}\n${context['aboutMe']}\n${context['body']} ${context['feelings'] ?? ''}${context['carryingConcern'] ? `\n${context['carryingConcern']}` : ''}\n${expressionGuidance}${capabilities?.speech === false ? '\nI cannot speak; talk must be null.' : ''}`,
    `## My commitments\n${list(context['commitments'])}\n${context['activityCoverage'] ?? ''}`,
    `## Trigger\n${context['stimulus']}`,
    `## Trigger facts\n${JSON.stringify(context['triggerFacts'] ?? {})}\nEvent-time identity and current visibility are separate. Another nearby individual of the same species is not the speaker. Reconsider whether an older social opportunity still warrants a response; overhearing does not imply an invitation, but deliberate participation is allowed.`,
    `## Task\nChoose only warranted speech, actions, private thoughts, goals or a short native plan. Each kind is optional and may repeat.${(context['triggerFacts'] as { observerRelationship?: string } | undefined)?.observerRelationship === 'addressed_speech' ? ' Speech directed at me normally deserves a natural conversational response, whether a question, statement or greeting.' : ''} Silence is also a valid choice. Respond as this person, not as an observer reporting the prompt. A small action shortlist does not mean I can only speak.`,
    `## Conversation so far\nSpeech I personally experienced in this exchange:\n${list(context['conversation'])}\nA turn marked "I said" is my own speech, not a reply from someone else. Avoid repeating an unanswered greeting or question unless the situation warrants it.`,
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
    `## Private intentions and native work\n${formatIntentions(context['agency'])}\nThese are intentions and actual step dispositions, never proof that an objective was achieved.`,
    `## Native navigation\n${context['navigation'] ?? ''}\nPosition: ${JSON.stringify(context['currentPosition'])}; support: ${context['currentSupport']}\nPublic supports: ${JSON.stringify(context['publicSurfaces'] ?? [])}`,
    `## Current time\n${context['now']} (simulation seconds: ${context['simTime'] ?? 'unavailable'})`,
    ...(context['activityRequests']
      ? [
          `## Optional installed activity requests\n${JSON.stringify(context['activityRequests'])}\nThese are optional selected compositions, not goals or learned behavior. Use exact authored parameters only. Later native checks can refuse changed prerequisites.`,
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
    `## Recent memories\n${list(context['recall'])}${context['reconsideration'] ? `\n${context['reconsideration']}` : ''}`,
    `## Nearby actors and objects\n${list(context['surroundings'])}${Array.isArray(context['contacts']) && context['contacts'].length ? `\nContact evidence:\n${list(context['contacts'])}` : ''}`,
    `## Inventory\n${list(context['possessions'])}${context['inventoryCoverage'] ? `\nPartial inventory preparation: ${JSON.stringify(context['inventoryCoverage'])}. Only this page and bound tools were considered. Other possessions may be useful; explicitly inspect another page when needed. Omission is not absence.` : ''}`,
    `## General knowledge notepad\n${JSON.stringify(context['notepad'] ?? {})}`,
    `## Knowledge\n${list(context['knowledge'])}`,
  ];
  if (includeActions)
    sections.push(
      `## Actions\nOptional relevant executable choices; selection is not mandatory:\n${actions.length ? actions.map((action) => `- ${action.id}: ${action.description}`).join('\n') : 'No shortlisted mechanical action.'}\nI may propose an unlisted action. I should not prefer an existing action just because it is listed. A proposal is an intention, not a completed action; unsupported mechanics cannot execute. A useful partial interpretation must report omissions; uncertain revisions require explicit initiator acceptance, not automatic invention.`,
    );
  sections.push(
    `## Response format\nReturn {"operations":[]} to continue without intervention. At most 16 operations and 40000 UTF-8 bytes in total. Each operation has localId (unique lowercase letter followed by letters/digits/underscores, max 24), requiresAccepted (earlier localIds only), and exactly one non-null field among talk, act, think, goal, plan, note, name; all six unused fields must be null. Operations are admitted in order; requiresAccepted means admission, never physical completion.
Speech: talk={"text":"words","addresseeEntityId":"permitted ID","selfIntroduction":null,"volume":"normal"}, max 1200 characters. Choose volume whisper, normal or shout; whispering is not guaranteed private. Thought: think={"text":"brief private feeling","aboutEntityIds":[]}, max 240 characters.
Action: act={"kind":"${capabilities?.expressions ? 'known|expression|proposal|invoke' : 'known|proposal|invoke'}","actionId":null,"verb":null,"targetEntityId":null,"description":null,"invocation":null,"slots":null,"mode":"enqueue|replace|interrupt"}. For known, fill only actionId; ${capabilities?.expressions ? 'for expression, fill verb and optionally targetEntityId; ' : ''}for proposal, fill description (max 500), optionally targetEntityId, and optionally slots={"itemId":null,"instrumentId":null,"recipientId":null,"quantity":null,"quantityMode":null,"until":null,"method":null}: exact permitted IDs for the item acted on, the tool used and the recipient; a whole quantity with quantityMode exact (units handled) or held (total to carry afterwards); ${namedTimes.length ? `until ${namedTimes.join('|')}` : 'until null (this world names no stopping times)'}; method keeps required wording such as quietly. Slots are null for other kinds. Complete typed proposals such as "drop 2 ITEM", "pick up ITEM" or "follow NAME at 4 m" bind without interpretation; a refused one states why. For invoke, fill invocation using Native navigation or an optional installed activity request; actionId, verb, description and top-level targetEntityId remain null. Request families use only their exact parameters and null navigation fields; their selected mode equals act.mode. A chosen request is neither a learned method nor completed work. Unlisted attempts remain available with no action suggestions. No unsupported effects are implied.
Goal: goal={"operation":"create|revise|pause|resume|complete|abandon","goalId":null,"expectedRevision":null,"objective":null,"parentId":null}. Create supplies objective (max 500), optional parentId; revise supplies existing goalId/revision, objective and optional parentId. Status changes supply only existing goalId/revision. Eight active/paused goals maximum. Completion is a subjective declaration.
Plan: plan={"mode":"enqueue|replace|cancel","expectedRevision":0,"goalId":null,"steps":[]}. Copy current plan revision (0 if absent). At most eight sequential steps. A step selects {"actionId":"supplied handle","itemFromStep":null,"useItemAs":null}, or consumes an earlier item output with {"actionId":null,"itemFromStep":0,"useItemAs":"equip"} (also "eat"). Indexes are zero-based within this submitted frontier. Only ${outputs} supply item outputs. Later steps wait for earlier completion and recheck prerequisites. Cancel has empty steps and null goalId. A new goal may be referenced as "$localId" only with that localId in requiresAccepted. Physical work takes simulation time. A plan may have no goal.
${context['knowledgeInstructions'] ?? 'Knowledge edits are unavailable.'}
Examples: empty {"operations":[]}; speech alone {"operations":[{"localId":"reply","requiresAccepted":[],"talk":{"text":"Hello.","addresseeEntityId":"COPY_PERMITTED_ID","selfIntroduction":null,"volume":"normal"},"act":null,"think":null,"goal":null,"plan":null,"note":null,"name":null}]}; combined decisions can contain separate speech and thought operations, repeated kinds, or a goal creation followed by a plan requiring that goal's admission. Never invent a goal or thought just to fill the schema. No reasoning transcript or fabricated completion.`,
  );
  sections.push(`## References
Names are display prose, never identifiers. Copy the opaque ID token from (ID:token) into structured entity fields. Never invent a token or use a species name as an ID. Include (ID:token) in an unlisted proposal when identifying its target.
${list(context['references'])}`);
  return sections.join('\n\n');
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
      ...rememberedIds.filter((id) => Object.hasOwn(world.entities, id)),
      ...awareness
        .flatMap((entry) =>
          [entry.sourceId, entry.intendedRecipientId ?? entry.targetId, ...entry.entityIds].filter(
            (id): id is string => !!id && awarenessBindsSubject(world, actorId, entry, id),
          ),
        )
        .filter((id): id is string => !!id && Object.hasOwn(world.entities, id)),
    ]),
  ];
  const visible = new Set(visibleIds);
  const recognizedIds = new Set([actorId, ...visibleIds]);
  const roles = new Map<string, { evidenceId: string; role: string }[]>();
  for (const entry of awareness) {
    if (entry.recognized && entry.sourceId) recognizedIds.add(entry.sourceId);
    if (entry.intendedRecipientId) recognizedIds.add(entry.intendedRecipientId);
    for (const [id, role] of [
      [entry.sourceId, 'source'],
      [
        entry.intendedRecipientId ?? entry.targetId,
        entry.eventType === 'speech' ? 'intended_recipient' : 'subject',
      ],
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
    const entity = world.entities[id]!;
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
        label: entityLabel(world, world.entities[id]!, actorId),
        relation: 'my possession',
      }),
    );
  for (const id of piled)
    references.push(
      JSON.stringify({
        entityId: entityHandles(world, actorId).get(id),
        label: entityLabel(world, world.entities[id]!, actorId),
        relation: 'lying in a visible pile',
      }),
    );
  const inspected = [...new Set(inspectedIds)].filter(
    (id) =>
      !ids.includes(id) &&
      !possessions.includes(id) &&
      !piled.includes(id) &&
      Object.hasOwn(world.entities, id),
  );
  for (const id of inspected)
    references.push(
      JSON.stringify({
        entityId: entityHandles(world, actorId).get(id),
        label: entityLabel(world, world.entities[id]!, actorId),
        relation: 'current permitted activity choice or inspected container page',
      }),
    );
  const all = [...ids, ...possessions, ...piled, ...inspected];
  return { entityIds: all, references, entityReferences: entityReferenceMap(world, all, actorId) };
}

function formatIntentions(value: unknown): string {
  const agency = value as
    | {
        goals?: { id: string; revision: number; objective: string; status: string }[];
        plan?: unknown;
        paused?: unknown;
        planRevision?: number;
        attempts?: { description: string }[];
      }
    | undefined;
  return [
    ...(agency?.goals ?? []).map((goal) => `${goal.status} goal: ${goal.objective}`),
    typeof agency?.plan === 'string' ? agency.plan : 'No remaining work supplied.',
    ...(typeof agency?.paused === 'string' ? [agency.paused] : []),
    `For structured plan changes, current plan revision: ${agency?.planRevision ?? 0}.`,
    ...(agency?.goals?.length
      ? [
          `Goal controls for structured goal changes: ${JSON.stringify(agency.goals.map(({ id, revision, objective }) => ({ id, revision, objective })))}`,
        ]
      : []),
    ...(agency?.attempts ?? []).map((attempt) => `Unresolved intention: ${attempt.description}`),
  ].join('\n');
}
