import { renderNarration, subjectNarration, personalText, type Narration } from './narration.js';
import { namePhrase } from '@open-legend/language';
import { countDomainWork } from './diagnostic-counters.js';
import { activeActivity } from './action-experience.js';
import { chargeWork } from './work-budget.js';
import { externalAudience } from './event-audience.js';
import { worldPosition } from './spatial-state.js';
import { current, isDraft } from 'immer';
import {
  observerDescription,
  recognizesSubject,
  learnSpeechIntroduction,
} from './worlds/base/knowledge.js';
import { capabilityBlocked } from './status-capabilities.js';
import { perceiveSpeech, prepareSpeechWords } from './speech.js';
import { isSpeechVolume } from './acoustics.js';
import type { Awareness } from './experience.js';
import { soundOrigin, speechObservers } from './perception.js';
import { appraiseEvent } from './worlds/base/appraisals.js';
import { mutateExperience, acquireEventAwareness, type ExperienceMutation } from './experience.js';
import { engageConversation, reconcileConversations } from './conversations.js';
import { hasMemory } from './living.js';
import { finishWorld, cloneValue, appendEvents, readOnlyDraftView } from './draft.js';
import { recordSpokenPromise, advanceCommitments } from './commitments.js';
import { nextId } from './data.js';
import { MIND_LIMITS, byteCount } from './mind.js';
import type {
  Entity,
  MemoryRecord,
  Outcome,
  Transition,
  WorldEvent,
  WorldState,
  EventScope,
} from './types.js';

export function outcome(ok: boolean, code: string, message: string): Outcome {
  return { ok, code, message };
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
/** Non-security content label; admission/dedup compares complete canonical bodies as well. */
export function contentLabel(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}
export function appendMemory(
  world: WorldState,
  actorId: string,
  memory: Omit<MemoryRecord, 'id' | 'actorId' | 'at' | 'summary'> & { summary: string | Narration },
): string | undefined {
  if (!hasMemory(world.entities[actorId])) return;
  const summary = personalText(world, actorId, memory.summary);
  if (!summary.trim()) return;
  const records = world.memories[actorId] ?? (world.memories[actorId] = []);
  const prior =
    memory.eventId &&
    records.find((record) => record.eventId === memory.eventId && record.kind === memory.kind);
  if (prior) return prior.id;
  const record: MemoryRecord = {
    ...memory,
    summary,
    id: nextId(world, 'memory'),
    actorId,
    at: world.simTime,
    sequence: world.nextId,
    // Preserve who/what a memory concerns; prompt selection owns request size.
    // docs/memory-architecture.md#personal-perspective-and-acquisition
    entityIds: [...memory.entityIds],
    importance: Math.max(0, Math.min(10, memory.importance)),
  };
  if (
    mutateExperience(world, actorId, {
      operation: 'add',
      entry: { source: 'memory', value: record },
    }) === null
  )
    throw new Error('Personal experience could not be recorded.');
  return record.id;
}
export function emit(
  world: WorldState,
  events: WorldEvent[],
  type: string,
  text: string | Narration,
  source?: Entity,
  targetId?: string,
  data?: WorldEvent['data'],
  scope: EventScope = 'external',
): WorldEvent {
  return recordEvent(
    world,
    events,
    type,
    text,
    type === 'speech' ? [] : eventAudience(world, type, source, scope),
    source,
    targetId,
    data,
    scope,
  );
}

/** A permitted observation with a named witness, preserving the actual acting person.
 * Private item terms must wake the recipient as a directed action without reaching bystanders. */
export function emitPrivateObservation(
  world: WorldState,
  events: WorldEvent[],
  type: string,
  observer: Entity,
  text: string | Narration,
  source: Entity,
  targetId?: string,
  data?: WorldEvent['data'],
): WorldEvent {
  return recordEvent(world, events, type, text, [observer.id], source, targetId, data, 'private');
}

/** Parties receive their own detailed receipt; bystanders learn only the witnessed act. */
export function emitWitnessObservation(
  world: WorldState,
  events: WorldEvent[],
  type: string,
  text: string | Narration,
  source: Entity,
  targetId: string,
  data?: WorldEvent['data'],
): WorldEvent {
  const witnesses = eventAudience(world, type, source, 'external').filter(
    (id) => id !== source.id && id !== targetId,
  );
  return recordEvent(world, events, type, text, witnesses, source, targetId, data, 'external');
}

function eventAudience(
  world: WorldState,
  type: string,
  source: Entity | undefined,
  scope: EventScope,
): string[] {
  // A control notice has no perceiver, not even its subject.
  if (scope === 'system') return [];
  const audience = scope === 'private' || !source ? [] : externalAudience(world, source);
  if (source && hasMemory(source) && !audience.includes(source.id)) audience.push(source.id);
  return audience;
}

const eventEncoder = new TextEncoder();

/** The caller has admitted the observation or inspection. Narration is a later consumer. */
export function acquireExposure(
  world: WorldState,
  events: WorldEvent[],
  observer: Entity,
  targetId: string,
  exposure: import('./places.js').EncounterExposure,
  importance = 6,
): WorldEvent {
  const text =
    exposure.kind === 'place'
      ? `I reached ${exposure.label}. ${exposure.description}`
      : `I inspected ${exposure.label}. ${exposure.description}`;
  return recordEvent(
    world,
    events,
    'encounter',
    text,
    [observer.id],
    observer,
    targetId,
    { acquisition: true, change: 'onset', importance, urgency: 0 },
    'private',
    undefined,
    exposure,
  );
}

/** Acquiring evidence is private, not an observable act by the observer.
 * Batch only this fixed-position phase through the existing experience owner;
 * external speech/actions still resolve their actual event-time audiences.
 * docs/architecture.md#private-perception-and-evidence-batches
 */
export function encounterEmitter(world: WorldState, events: WorldEvent[]) {
  let owner: string | undefined;
  let pending: ExperienceMutation[] = [];
  const flush = () => {
    if (owner && pending.length && mutateExperience(world, owner, pending) === null)
      throw new Error('Private perception evidence could not be admitted.');
    pending = [];
  };
  const acquire = (
    source: Entity,
    targetId: string,
    stimulus: { importance: number; urgency: number; semanticTrigger: boolean },
    detail?: string,
    departed = false,
  ): WorldEvent => {
    if (owner !== source.id) {
      flush();
      owner = source.id;
    }
    // Describe a departing subject before its episode ends, so recognition is event-time.
    const subject = observerDescription(
      world,
      source.id,
      targetId,
      departed || detail ? 'definite' : 'indefinite',
    );
    const observed = departed
      ? `lost sight of ${subject}.`
      : detail
        ? `noticed ${subject}: ${detail}.`
        : `saw ${subject}.`;
    const event = recordEvent(
      world,
      events,
      'encounter',
      subjectNarration(source, observed),
      [source.id],
      source,
      targetId,
      {
        // Recording evidence must not turn a story/relevance score into urgency.
        // The caller's world policy owns these separate choices.
        // docs/events-perception-and-reactions.md#8-ongoing-salience-relevance-and-reminders
        ...stimulus,
        acquisition: true,
        change: departed ? 'end' : detail ? 'detail' : 'onset',
      },
      'private',
      pending,
    );
    // Bound temporary memory independently of the number of visible objects.
    if (pending.length >= 128) flush();
    return event;
  };
  return Object.assign(acquire, { flush });
}

function recordEvent(
  world: WorldState,
  events: WorldEvent[],
  type: string,
  narration: string | Narration,
  audience: string[],
  source: Entity | undefined,
  targetId: string | undefined,
  data: WorldEvent['data'],
  scope: EventScope,
  awarenessBatch?: ExperienceMutation[],
  exposure?: import('./places.js').EncounterExposure,
): WorldEvent {
  const text = typeof narration === 'string' ? narration : renderNarration(world, narration);
  const boundedMetric = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(10, value))
      : fallback;
  const importance = boundedMetric(
    data?.['importance'],
    data?.['significant'] === true || ['death', 'taught', 'incapacitated'].includes(type)
      ? 9
      : type === 'speech'
        ? 7
        : data?.['semanticTrigger'] === true ||
            [
              'crafted',
              'declaration-admitted',
              'shot',
              'struck',
              'fire-out',
              'fire-lit',
              'fire-extinguished',
              'rested',
            ].includes(type)
          ? 6
          : 3,
  );
  const urgency = boundedMetric(
    data?.['urgency'],
    ['death', 'incapacitated'].includes(type) ? 10 : type === 'speech' ? 4 : 2,
  );
  const event: WorldEvent = {
    ...(exposure ? { exposure: cloneValue(exposure) } : {}),
    ...(source
      ? {
          // Copy the committed pose without walking a live draft through proxy traps.
          origin:
            type === 'speech'
              ? soundOrigin(source)
              : { ...readOnlyDraftView(worldPosition(source)) },
        }
      : {}),
    scope,
    id: nextId(world, 'event'),
    order: world.nextId,
    sequence: world.sequence + 1,
    at: world.simTime,
    type,
    text,
    ...(typeof narration !== 'string' ? { narration } : {}),
    audience: [...audience],
    importance,
    urgency,
  };
  if (source) event.actorId = source.id;
  if (targetId) event.targetId = targetId;
  event.data = {
    ...cloneValue(data),
    importancePolicy: 'native-v1',
    importanceReason: data?.['significant'] ? 'significant' : type,
  };
  const speechAwareness = new Map<string, Awareness>();
  if (type === 'speech' && source && scope !== 'system') {
    const volume = isSpeechVolume(data?.['volume']) ? data['volume'] : 'normal';
    const origin = isDraft(source) ? current(source) : source;
    // The shared source is parsed once; masking and recognition remain listener-local.
    const words = prepareSpeechWords(String(data?.['text'] ?? ''));
    for (const observer of scope === 'private'
      ? [origin]
      : speechObservers(world, origin, volume)) {
      const entry = perceiveSpeech(world, observer, origin, event, volume, words);
      if (entry) {
        audience.push(observer.id);
        speechAwareness.set(observer.id, entry);
      }
    }
    event.audience = [...audience];
  }
  // Being addressed is not permission to join a conversation one could not perceive.
  const conversationId =
    type === 'speech' && source
      ? engageConversation(
          world,
          source.id,
          targetId && speechAwareness.get(targetId)?.triggerKind === 'addressed_speech'
            ? targetId
            : undefined,
        )
      : (type === 'expression' || data?.['conversationRelevant'] === true) && source
        ? world.conversations?.active[source.id]
        : undefined;
  if (conversationId) {
    event.conversationId = conversationId;
    const conversation = world.conversations?.records[conversationId];
    if (conversation) conversation.lastActivityAt = world.simTime;
  }
  chargeWork({ effects: 1, outputBytes: eventEncoder.encode(JSON.stringify(event)).byteLength });
  countDomainWork('eventsRecorded');
  events.push(event);
  if (
    [
      'action-started',
      'speech',
      'ate',
      'equipped',
      'gathered',
      'prepared',
      'crafted',
      'harvested',
      'cooked',
      'fire-lit',
      'fire-fueled',
      'fire-extinguished',
      'struck',
      'guarded',
      'shot',
      'body-effect',
      'moved',
      'action-stopped',
    ].includes(type)
  ) {
    const cause =
      data?.['actionId'] ??
      data?.['effectId'] ??
      (source && world.actionExperience.current[source.id]);
    const experience = typeof cause === 'string' ? activeActivity(world, cause) : undefined;
    if (
      experience &&
      audience.includes(experience.actorId) &&
      experience.evidenceIds.length < 64 &&
      !experience.evidenceIds.includes(event.id)
    )
      experience.evidenceIds.push(event.id);
    // Speech already has a complete listener-specific account, including exact words.
    // Reuse it as the speaker's result rather than narrating the utterance twice.
    if (experience && type === 'speech' && speechAwareness.has(experience.actorId))
      experience.resultMemoryId = event.id;
  }
  if (world.experience) {
    countDomainWork('awarenessWritten', audience.length);
    const acquired: Awareness[] = [];
    for (const actorId of audience) {
      const speech = speechAwareness.get(actorId);
      if (speech) {
        acquired.push(speech);
        continue;
      }
      // Native participants and grammar are rendered once for this observer; literal
      // prose/quotes retain their supplied ownership. Speech has listener-specific evidence.
      // docs/architecture.md#private-perception-and-evidence-batches
      const perceivedText =
        typeof narration === 'string' ? narration : renderNarration(world, narration, actorId);
      const awareness: Awareness = {
        ...(event.exposure ? { exposure: cloneValue(event.exposure) } : {}),
        eventId: event.id,
        actorId,
        text: perceivedText,
        at: event.at,
        sequence: world.nextId,
        modality:
          scope === 'private' && source?.id === actorId && data?.['acquisition'] !== true
            ? type === 'contact'
              ? 'felt'
              : type === 'encounter'
                ? 'observed'
                : 'internal'
            : type === 'speech'
              ? 'heard'
              : 'observed',
        entityEpisodes: Object.fromEntries(
          [source?.id, targetId].flatMap((id) => {
            const episode = id && world.perceptionEpisodes?.[actorId]?.[id];
            return id && episode ? [[id, episode]] : [];
          }),
        ),
        recognized: type !== 'contact' && !!source && recognizesSubject(world, actorId, source.id),
        intelligible: true,
        entityIds: [source?.id, targetId].filter((id): id is string => !!id),
        importance: event.importance ?? importance,
        urgency: event.urgency ?? urgency,
        eventType: type,
        ...(source ? { sourceId: source.id } : {}),
        ...(targetId ? { targetId } : {}),
        triggerKind:
          data?.['acquisition'] === true
            ? 'observed_event'
            : source?.id === actorId
              ? 'self_event'
              : targetId === actorId
                ? 'directed_action'
                : 'observed_event',
        content: typeof data?.['text'] === 'string' ? data['text'] : perceivedText,
        ...(data?.['acquisition'] === true &&
        (data['change'] === 'onset' || data['change'] === 'detail' || data['change'] === 'end')
          ? { change: data['change'] }
          : {}),
      };
      if (awarenessBatch)
        awarenessBatch.push({ operation: 'add', entry: { source: 'awareness', value: awareness } });
      else acquired.push(awareness);
    }
    acquireEventAwareness(world, acquired);
  }
  learnSpeechIntroduction(world, event);
  // Finalize optional native metadata before handing an immutable record to persistence.
  if (audience.length || importance >= (world.socialPolicy?.notableThreshold ?? 8))
    appendEvents(world, [cloneValue(event)]);
  // Control notices are not occurrences characters can appraise, promise on or fulfil.
  if (scope !== 'system') {
    appraiseEvent(world, event);
    recordSpokenPromise(world, event);
    advanceCommitments(world, [event]);
  }
  return event;
}
export function finish(world: WorldState, events: WorldEvent[], result: Outcome): Transition {
  advanceCommitments(world, events);
  reconcileConversations(world);
  world.sequence++;
  const committedEvents = cloneValue(events);
  return { world: finishWorld(world), events: committedEvents, outcome: result };
}

/** Observed conversation events may be native state narration, not an actor reply. */
export function isConversationEvent(event: WorldEvent): boolean {
  return (
    event.type === 'speech' ||
    typeof event.data?.['responseId'] === 'string' ||
    event.data?.['conversationRelevant'] === true
  );
}
