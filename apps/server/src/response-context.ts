import { knowledgeDocument, characterCount, recognizesSubject } from '@open-legend/domain';
import {
  awarenessBindsSubject,
  entityLabel,
  entityReferenceMap,
  entityHandles,
} from './entity-references.js';
import { seesEntity, type Awareness, type WorldState } from '@open-legend/domain';
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
  const event = service.worldEvent(aware.eventId);
  const sourceId = aware.sourceId ?? event?.actorId;
  const targetId = aware.targetId ?? event?.targetId;
  const eventType = aware.eventType ?? event?.type;
  const triggerKind =
    aware.triggerKind ??
    (sourceId === actorId
      ? 'self_event'
      : eventType === 'speech'
        ? targetId === actorId
          ? 'addressed_speech'
          : 'overheard_speech'
        : targetId === actorId
          ? 'directed_action'
          : 'observed_event');
  const source =
    sourceId && awarenessBindsSubject(world, actorId, aware, sourceId) && world.entities[sourceId]
      ? entityLabel(world, world.entities[sourceId]!, actorId)
      : 'An unidentified individual';
  const time = `(${gameTime(aware.at)})`;
  if (eventType === 'speech') {
    if (!aware.intelligible)
      return `${triggerKind === 'addressed_speech' ? 'Addressed speech' : 'Overheard speech'}: I heard indistinct speech. ${time}`;
    const words =
      aware.content !== undefined
        ? JSON.stringify(aware.content)
        : typeof event?.data?.['text'] === 'string'
          ? JSON.stringify(event.data['text'])
          : JSON.stringify(aware.text);
    if (triggerKind === 'self_event') return `My own speech: I said ${words}. ${time}`;
    return triggerKind === 'addressed_speech'
      ? `Addressed speech: ${source} said to me: ${words}. I am being spoken to directly. ${time}`
      : `Overheard speech: ${source} said nearby: ${words}. This was not addressed to me. ${time}`;
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
    eventTime: gameTime(aware.at),
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
  const expressionGuidance = capabilities?.expressions
    ? 'Supported gestures: nod, smile, frown, wave, shrug, shake_head, slap. Expressions have no mechanical effects; a slap requires contact range.'
    : 'This body has no supported gesture expressions. Do not use act.kind=expression or describe human gestures as performed.';
  const list = (value: unknown) =>
    Array.isArray(value) && value.length
      ? value.map((line) => `- ${String(line).replace(/\n/g, '\n  ')}`).join('\n')
      : 'None supplied.';
  const sections = [
    `## Me\n${context['identity']}\n${context['aboutMe']}\n${context['body']} ${context['feelings'] ?? ''} ${context['kinship'] ?? ''}${context['food'] ? `\n${context['food']}` : ''}\n${expressionGuidance}${capabilities?.speech === false ? '\nI cannot speak; talk must be null.' : ''}`,
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
          `## Private intent controls\n${JSON.stringify(context['intentActions'] ?? [])}\nUse a known action handle to withdraw an unresolved intent. Withdrawal does not cancel physical work and cannot be queued in a plan.`,
        ]
      : []),
    `## Private intentions and native work\n${JSON.stringify(context['agency'] ?? { goals: [], plan: null })}\nThese are intentions and actual step dispositions, never proof that an objective was achieved.`,
    `## Current time\n${context['now']}`,
    `## Recent memories\n${list(context['recall'])}${context['reconsideration'] ? `\n${context['reconsideration']}` : ''}`,
    `## Nearby actors and objects\n${list(context['surroundings'])}${Array.isArray(context['contacts']) && context['contacts'].length ? `\nContact evidence:\n${list(context['contacts'])}` : ''}`,
    `## Inventory\n${list(context['possessions'])}`,
    `## General knowledge notepad\n${JSON.stringify(context['notepad'] ?? {})}`,
    `## Knowledge\n${list(context['knowledge'])}`,
  ];
  if (includeActions)
    sections.push(
      `## Actions\nOptional relevant executable choices; selection is not mandatory:\n${actions.length ? actions.map((action) => `- ${action.id}: ${action.description}`).join('\n') : 'No shortlisted mechanical action.'}\nI may propose an unlisted action. I should not prefer an existing action just because it is listed. A proposal is an intention, not a completed action; unsupported mechanics require separate invention admission.`,
    );
  sections.push(
    `## Response format\nReturn {"operations":[]} to continue without intervention. At most 16 operations and 40000 UTF-8 bytes in total. Each operation has localId (unique lowercase letter followed by letters/digits/underscores, max 24), requiresAccepted (earlier localIds only), and exactly one non-null field among talk, act, think, goal, plan, note, name; all six unused fields must be null. Operations are admitted in order; requiresAccepted means admission, never physical completion.
Speech: talk={"text":"words","addresseeEntityId":"permitted ID","selfIntroduction":null}, max 1200 characters. Thought: think={"text":"brief private feeling","aboutEntityIds":[]}, max 240 characters.
Action: act={"kind":"${capabilities?.expressions ? 'known|expression|proposal' : 'known|proposal'}","actionId":null,"verb":null,"targetEntityId":null,"description":null,"mode":"enqueue|replace"}. For known, fill only actionId; ${capabilities?.expressions ? 'for expression, fill verb and optionally targetEntityId; ' : ''}for proposal, fill description (max 500). Unlisted attempts remain available with no action suggestions. No unsupported effects are implied.
Goal: goal={"operation":"create|revise|pause|resume|complete|abandon","goalId":null,"expectedRevision":null,"objective":null,"parentId":null}. Create supplies objective (max 500), optional parentId; revise supplies existing goalId/revision, objective and optional parentId. Status changes supply only existing goalId/revision. Eight active/paused goals maximum. Completion is a subjective declaration.
Plan: plan={"mode":"enqueue|replace|cancel","expectedRevision":0,"goalId":null,"steps":[]}. Copy current plan revision (0 if absent). At most eight sequential steps. A step selects {"actionId":"supplied handle","itemFromStep":null,"useItemAs":null}, or consumes an earlier item output with {"actionId":null,"itemFromStep":0,"useItemAs":"equip"} (also "eat"). Indexes are zero-based within this submitted frontier. Only gather, prepare, craft and cook supply item outputs. Later steps wait for earlier completion and recheck prerequisites. Cancel has empty steps and null goalId. A new goal may be referenced as "$localId" only with that localId in requiresAccepted. Physical work takes simulation time. A plan may have no goal.
${context['knowledgeInstructions'] ?? 'Knowledge edits are unavailable.'}
Examples: empty {"operations":[]}; speech alone {"operations":[{"localId":"reply","requiresAccepted":[],"talk":{"text":"Hello.","addresseeEntityId":"COPY_PERMITTED_ID","selfIntroduction":null},"act":null,"think":null,"goal":null,"plan":null,"note":null,"name":null}]}; combined decisions can contain separate speech and thought operations, repeated kinds, or a goal creation followed by a plan requiring that goal's admission. Never invent a goal or thought just to fill the schema. No reasoning transcript or fabricated completion.`,
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
      ...(visible.has(id) ? { position: entity.position } : {}),
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
  return { entityIds: ids, references, entityReferences: entityReferenceMap(world, ids, actorId) };
}
