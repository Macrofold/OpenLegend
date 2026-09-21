import type { WorldState } from '@open-legend/domain';
import { gameTime } from './recall.js';

/** Attribution comes from event-time awareness, never a name guessed from a quote. */
export function responseTrigger(
  world: WorldState,
  actorId: string,
  evidenceIds: string[],
  fallback: string,
): string {
  const awareness = new Map(
    (world.experience?.awareness[actorId] ?? []).map((entry) => [entry.eventId, entry]),
  );
  const events = new Map(world.events.map((event) => [event.id, event]));
  const lines = evidenceIds.flatMap((id) => {
    const aware = awareness.get(id);
    const event = events.get(id);
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
    `## Me\n${context['identity']}\n${context['aboutMe']}\n${context['body']} ${context['feelings'] ?? ''} ${context['kinship'] ?? ''}\nMy current goal: ${context['goal']}${context['food'] ? `\n${context['food']}` : ''}`,
    `## Trigger\n${context['stimulus']}`,
    '## Task\nChoose whether to speak, act, think privately, or any combination. A direct question normally deserves a direct conversational reply; silence is also a valid choice. Respond as this person, not as an observer reporting the prompt. A small action shortlist does not mean I can only speak.',
    `## Conversation so far\nSpeech I personally experienced in this exchange:\n${list(context['conversation'])}`,
    `## Current time\n${context['now']}`,
    `## Recent memories\n${list(context['recall'])}${context['reconsideration'] ? `\n${context['reconsideration']}` : ''}`,
    `## Nearby actors and objects\n${list(context['surroundings'])}`,
    `## Inventory\n${list(context['possessions'])}`,
    `## Knowledge\n${list(context['knowledge'])}`,
  ];
  if (includeActions)
    sections.splice(
      6,
      0,
      `## Actions\nOptional relevant executable choices; selection is not mandatory:\n${actions.length ? actions.map((action) => `- ${action.description}`).join('\n') : 'No shortlisted mechanical action.'}\nI may instead express a gesture (nod, smile, frown, wave, shrug, shake_head, slap), or propose an unlisted action. I should not prefer an existing action just because it is listed. Expressions have no mechanical effects; a slap requires contact range. A proposal is an intention, not a completed action; unsupported mechanics require separate invention admission.`,
    );
  sections.push(
    `## Response format\nReturn a JSON object with exactly talk, act, think. Each unused component is null; all null means no new response. talk: {"text":"spoken words","addresseeEntityId":"permitted entity id"}. ${includeActions ? 'act is null or a total object with kind, actionId, verb, targetEntityId, description. For known: set actionId and all other action fields null. For expression: set verb and optional targetEntityId; set actionId and description null. For proposal: set description; set actionId, verb and targetEntityId null.' : 'No action context was needed, so act must be null.'} think: {"text":"brief private feeling or intention","aboutEntityIds":["permitted entity ids"]}. Speech: at most 1200 characters; thought: 240; proposal: 500. Thoughts must not claim the proposed action has already succeeded. No narration, reasoning explanation, invented effects, or changes to my biography. Components are admitted in talk, act, think order.`,
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
