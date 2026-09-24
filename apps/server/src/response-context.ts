import type { WorldState } from '@open-legend/domain';
import { gameTime } from './recall.js';
import type { WorldService } from './world-service.js';

/** Attribution comes from event-time awareness, never a name guessed from a quote. */
export function responseTrigger(
  service: WorldService,
  actorId: string,
  evidenceIds: string[],
  fallback: string,
): string {
  const world = service.world;
  const awareness = new Map(
    (world.experience?.awareness[actorId] ?? []).map((entry) => [entry.eventId, entry]),
  );
  const lines = evidenceIds.flatMap((id) => {
    const aware = awareness.get(id);
    const event = service.worldEvent(id);
    if (!aware) return [];
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
      aware.recognized && sourceId && world.entities[sourceId]
        ? world.entities[sourceId]!.name
        : 'An unidentified person';
    const time = `(${gameTime(aware.at)})`;
    if (eventType === 'speech' || aware.modality === 'heard') {
      if (!aware.intelligible)
        return [
          `${triggerKind === 'addressed_speech' ? 'Addressed speech' : 'Overheard speech'}: I heard indistinct speech. ${time}`,
        ];
      const words =
        aware.content !== undefined
          ? JSON.stringify(aware.content)
          : typeof event?.data?.['text'] === 'string'
            ? JSON.stringify(event.data['text'])
            : JSON.stringify(aware.text);
      if (triggerKind === 'self_event') return [`My own speech: I said ${words}. ${time}`];
      return [
        triggerKind === 'addressed_speech'
          ? `Addressed speech: ${source} said to me: ${words}. I am being spoken to directly. ${time}`
          : `Overheard speech: ${source} said nearby: ${words}. This was not addressed to me. ${time}`,
      ];
    }
    return [
      `${triggerKind === 'directed_action' ? 'Action directed at me' : triggerKind === 'self_event' ? 'My action or change' : 'Observed event'}: ${aware.content ?? aware.text} ${time}`,
    ];
  });
  return lines.length ? lines.join('\n') : `Situation change: ${fallback}`;
}

export function readableDecisionContext(
  context: Record<string, unknown>,
  actions: { id: string; description: string }[],
  includeActions = false,
): string {
  const list = (value: unknown) =>
    Array.isArray(value) && value.length
      ? value.map((line) => `- ${String(line).replace(/\n/g, '\n  ')}`).join('\n')
      : 'None supplied.';
  const sections = [
    `## Me\n${context['identity']}\n${context['aboutMe']}\n${context['body']} ${context['feelings'] ?? ''} ${context['kinship'] ?? ''}${context['food'] ? `\n${context['food']}` : ''}`,
    `## Trigger\n${context['stimulus']}`,
    '## Task\nChoose only warranted speech, actions, private thoughts, goals or a short native plan. Each kind is optional and may repeat. A direct question normally deserves a direct conversational reply; silence is also a valid choice. Respond as this person, not as an observer reporting the prompt. A small action shortlist does not mean I can only speak.',
    `## Conversation so far\nSpeech I personally experienced in this exchange:\n${list(context['conversation'])}`,
    `## Known planning techniques\n${JSON.stringify(context['planOffers'] ?? [])}\nPrerequisites must be obtained first. These handles can be queued without a current action shortlist.`,
    `## Private intent controls\n${JSON.stringify(context['intentActions'] ?? [])}\nUse a known action handle to accept the exact revised action or withdraw an unresolved intent; never accept on behalf of another actor. Withdrawal does not cancel physical work and cannot be queued in a plan.`,
    `## Private intentions and native work\n${JSON.stringify(context['agency'] ?? { goals: [], plan: null })}\nThese are intentions and actual step dispositions, never proof that an objective was achieved.`,
    `## Native navigation\n${context['navigation'] ?? ''}\nPosition: ${JSON.stringify(context['currentPosition'])}; support: ${context['currentSupport']}\nPublic supports: ${JSON.stringify(context['publicSurfaces'] ?? [])}`,
    `## Current time\n${context['now']}`,
    `## Recent memories\n${list(context['recall'])}${context['reconsideration'] ? `\n${context['reconsideration']}` : ''}`,
    `## Nearby actors and objects\n${list(context['surroundings'])}${Array.isArray(context['contacts']) && context['contacts'].length ? `\nContact evidence:\n${list(context['contacts'])}` : ''}`,
    `## Inventory\n${list(context['possessions'])}`,
    `## Knowledge\n${list(context['knowledge'])}`,
  ];
  if (includeActions)
    sections.splice(
      6,
      0,
      `## Actions\nOptional relevant executable choices; selection is not mandatory:\n${actions.length ? actions.map((action) => `- ${action.description}`).join('\n') : 'No shortlisted mechanical action.'}\nI may instead express a gesture (nod, smile, frown, wave, shrug, shake_head, slap), or propose an unlisted action. I should not prefer an existing action just because it is listed. Expressions have no mechanical effects; a slap requires contact range. A proposal is an intention, not a completed action; unsupported mechanics cannot execute; proposals may use explicit partial fulfillment or ask the initiator to accept a revised action.`,
    );
  sections.push(
    `## Response format\nReturn {"operations":[]} to continue without intervention. At most 16 operations and 16000 UTF-8 bytes in total. Each operation has localId (unique lowercase letter followed by letters/digits/underscores, max 24), requiresAccepted (earlier localIds only), and exactly one non-null field among talk, act, think, goal, plan; all four unused fields must be null. Operations are admitted in order; requiresAccepted means admission, never physical completion.
Speech: talk={"text":"words","addresseeEntityId":"permitted ID"}, max 1200 characters. Thought: think={"text":"brief private feeling","aboutEntityIds":[]}, max 240 characters.
Action: act={"kind":"known|expression|proposal|invoke","actionId":null,"verb":null,"targetEntityId":null,"description":null,"mode":"enqueue|replace"}. For known, fill only actionId; for expression, fill verb and optionally targetEntityId; for proposal, fill description (max 500) and optionally targetEntityId. For invoke use the Native navigation contract and invocation field; other fields stay null. Expressions and unlisted attempts remain available with no action suggestions. No unsupported effects are implied.
Goal: goal={"operation":"create|revise|pause|resume|complete|abandon","goalId":null,"expectedRevision":null,"objective":null,"parentId":null}. Create supplies objective (max 500), optional parentId; revise supplies existing goalId/revision, objective and optional parentId. Status changes supply only existing goalId/revision. Eight active/paused goals maximum. Completion is a subjective declaration.
Plan: plan={"mode":"enqueue|replace|cancel","expectedRevision":0,"goalId":null,"steps":[]}. Copy current plan revision (0 if absent). At most eight sequential steps. A step selects {"actionId":"supplied handle","itemFromStep":null,"useItemAs":null}, or consumes an earlier item output with {"actionId":null,"itemFromStep":0,"useItemAs":"equip"} (also "eat"). Indexes are zero-based within this submitted frontier. Only gather, prepare, craft and cook supply item outputs. Later steps wait for earlier completion and recheck prerequisites. Cancel has empty steps and null goalId. A new goal may be referenced as "$localId" only with that localId in requiresAccepted. Physical work takes simulation time. A plan may have no goal.
Examples: empty {"operations":[]}; speech alone {"operations":[{"localId":"reply","requiresAccepted":[],"talk":{"text":"Hello.","addresseeEntityId":"COPY_PERMITTED_ID"},"act":null,"think":null,"goal":null,"plan":null}]}; combined decisions can contain separate speech and thought operations, repeated kinds, or a goal creation followed by a plan requiring that goal's admission. Never invent a goal or thought just to fill the schema. No reasoning transcript or fabricated completion.`,
  );
  sections.push(`## References
Names are display prose, never identifiers. Copy exact IDs into structured fields.
${list(context['references'])}${actions.length ? `\nAction IDs (valid only for this response):\n${actions.map((action) => JSON.stringify(action)).join('\n')}` : ''}`);
  return sections.join('\n\n');
}

/** Only visible or explicitly perceived identities enter the reference contract. */
export function responseReferences(
  world: WorldState,
  actorId: string,
  visibleIds: string[],
  evidenceIds: string[],
) {
  const evidence = new Set(evidenceIds);
  const awareness = (world.experience?.awareness[actorId] ?? []).filter((entry) =>
    evidence.has(entry.eventId),
  );
  const ids = [
    ...new Set([
      actorId,
      ...visibleIds,
      ...awareness
        .flatMap((entry) => [entry.sourceId, entry.targetId, ...entry.entityIds])
        .filter((id): id is string => !!id && Object.hasOwn(world.entities, id)),
    ]),
  ];
  const visible = new Set(visibleIds);
  const recognizedIds = new Set([actorId, ...visibleIds]);
  const roles = new Map<string, { evidenceId: string; role: string }[]>();
  for (const entry of awareness) {
    if (entry.recognized && entry.sourceId) recognizedIds.add(entry.sourceId);
    for (const [id, role] of [
      [entry.sourceId, 'source'],
      [entry.targetId, 'recipient'],
    ] as const) {
      if (!id) continue;
      const entries = roles.get(id) ?? [];
      entries.push({ evidenceId: entry.eventId, role });
      roles.set(id, entries);
    }
  }
  const references = ids.map((id) => {
    const entity = world.entities[id]!;
    return JSON.stringify({
      entityId: id,
      label: recognizedIds.has(id) ? entity.name : 'Unidentified entity',
      ...(id === actorId ? { relation: 'myself' } : {}),
      ...(visible.has(id) ? { position: entity.position } : {}),
      triggerRoles: roles.get(id) ?? [],
    });
  });
  return { entityIds: ids, references };
}
