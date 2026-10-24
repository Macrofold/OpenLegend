import { entityGet } from './entity-collection.js';
import { personPhrase, personalPronoun, validName, type Named } from '@open-legend/language';
import { worldPosition } from './spatial-state.js';
import {
  associatePerceivedSubject,
  observerName,
  recognizesSubject,
} from './worlds/base/knowledge.js';
import { hasMemory, understandsSpeech } from './living.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { speechPerception, speechEmission, seesEntity } from './perception.js';
import {
  acousticDirection,
  perceiveSound,
  soundEvidenceProjection,
  validatePerceivedSound,
} from './sound.js';
import { contentLabel } from './events.js';
import type { NarrationPerspective } from './narration.js';
import { isSpeechVolume, type SpeechVolume } from './acoustics.js';
import type { Awareness } from './experience.js';
import type { Entity, Position, WorldEvent, WorldState } from './types.js';

export type SpeechSegment = { kind: 'heard'; text: string } | { kind: 'unintelligible' };
/** This entire shape is observer-permitted, including only the observer's own acquisition pose. */
export type SpeechParticipant = Omit<Named, 'name'> & { nameAtTime: string };
interface SpeechAcquisition {
  speaker: SpeechParticipant | null;
  delivery: SpeechVolume | null;
  direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
  listenerPosition: Position;
}
export type PerceivedSpeech = SpeechAcquisition &
  (
    | {
        perception: 'seen';
        addressing: null;
        intelligibility: 'none';
        segments: [];
        addressee: null;
      }
    | {
        perception: 'heard' | 'self';
        addressing: 'ambient' | 'directed';
        intelligibility: 'none' | 'partial' | 'clear';
        segments: SpeechSegment[];
        addressee: SpeechParticipant | null;
      }
  );
const segmenter = new Intl.Segmenter('und', { granularity: 'word' });
export function prepareSpeechWords(text: string) {
  return [...segmenter.segment(text)].filter((part) => part.isWordLike);
}
/** A versioned local stream avoids perturbing unrelated simulation RNG. Only its result is saved. */
export function partialSpeech(
  text: string,
  key: string,
  words = prepareSpeechWords(text),
): SpeechSegment[] {
  let seed = parseInt(contentLabel(`speech-mask-v1:${key}`), 36) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const runs: number[][] = [];
  for (let i = 0; i < words.length; ) {
    const run: number[] = [];
    for (let n = 1 + Math.floor(random() * 3); n-- && i < words.length; ) run.push(i++);
    runs.push(run);
  }
  for (let i = runs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [runs[i], runs[j]] = [runs[j]!, runs[i]!];
  }
  const heard = new Set(
    runs
      .flat()
      .slice(0, words.length === 1 ? (random() < 0.5 ? 1 : 0) : Math.floor(words.length / 2)),
  );
  const result: SpeechSegment[] = [];
  for (let i = 0; i < words.length; ) {
    const start = i,
      visible = heard.has(i);
    while (i < words.length && heard.has(i) === visible) i++;
    if (visible) {
      const last = words[i - 1]!;
      const end = i === words.length ? text.length : last.index + last.segment.length;
      result.push({ kind: 'heard', text: text.slice(words[start]!.index, end).trim() });
    } else result.push({ kind: 'unintelligible' });
  }
  return result.length ? result : [{ kind: 'unintelligible' }];
}
export function speechWords(speech: PerceivedSpeech): string {
  return speech.segments
    .map((segment) => (segment.kind === 'heard' ? segment.text : '[…]'))
    .join(' ');
}
export interface SpeechRoles {
  sourceId?: string;
  targetId?: string;
  addressing: PerceivedSpeech['addressing'];
  acquisition: PerceivedSpeech['perception'];
  relationship: 'self' | 'addressed' | 'overheard' | 'ambient' | 'seen';
  speaker: SpeechParticipant | null;
  addressee: SpeechParticipant | null;
}
export function speechRelationship(
  ownerId: string,
  targetId: string | null | undefined,
  speech: Pick<PerceivedSpeech, 'perception' | 'addressing'>,
): SpeechRoles['relationship'] {
  return speech.perception === 'self'
    ? 'self'
    : speech.perception === 'seen'
      ? 'seen'
      : speech.addressing === 'ambient'
        ? 'ambient'
        : targetId === ownerId
          ? 'addressed'
          : 'overheard';
}
/** Select only the acquired roles; this never looks up people or parses words. */
export function speechRoles(
  evidence: Pick<EventEvidence, 'actorId' | 'sourceId' | 'targetId' | 'speech'>,
): SpeechRoles | undefined {
  const speech = evidence.speech;
  if (!speech) return undefined;
  return {
    ...(evidence.sourceId ? { sourceId: evidence.sourceId } : {}),
    ...(evidence.targetId ? { targetId: evidence.targetId } : {}),
    addressing: speech.addressing,
    acquisition: speech.perception,
    relationship: speechRelationship(evidence.actorId, evidence.targetId, speech),
    speaker: speech.speaker,
    addressee: speech.addressee,
  };
}
/** Addressing selects an acquired individual, not an arbitrary hidden world ID.
 * Recognition never grants the person's current location or physical targeting. */
export function canAddressSpeech(world: WorldState, source: Entity, target: Entity): boolean {
  return recognizesSubject(world, source.id, target.id) || seesEntity(world, source, target);
}
/** Detected directed language is a social opportunity even when no words resolve.
 * Seen-only cues and ambient/overheard speech cannot stand in for that evidence. */
export function heardAddressedSpeech(
  evidence: Pick<EventEvidence, 'actorId' | 'sourceId' | 'targetId' | 'speech'>,
): boolean {
  const roles = speechRoles(evidence);
  return roles?.acquisition === 'heard' && roles.relationship === 'addressed';
}
export type SpeechDisplayPart =
  | { kind: 'literal'; text: string }
  | { kind: 'participant'; id: string; role: 'speaker' | 'addressee'; text: string }
  | { kind: 'quotation'; segments: readonly SpeechSegment[]; text: string };
export interface SpeechPresentation {
  acquisition: PerceivedSpeech['perception'];
  speakerLabel: string;
  directionLabel: string | null;
  segments: readonly SpeechSegment[];
  personalText: string;
  accessibilityText: string;
  parts: readonly SpeechDisplayPart[];
}
/** Occurrence labels are selected once, independently of current person displays. */
export function speechPerspective(
  evidence: Pick<EventEvidence, 'actorId' | 'sourceId' | 'targetId' | 'speech'>,
  selfId: string | undefined = evidence.actorId,
): NarrationPerspective {
  const names = new Map<string, Named>();
  for (const [id, label] of [
    [evidence.sourceId, evidence.speech?.speaker],
    [evidence.targetId, evidence.speech?.addressee],
  ] as const)
    if (id && label) names.set(id, { ...label, name: label.nameAtTime });
  return { selfId, names };
}
/** Typed spans and flattened prose are derived together; words are never parsed as identities. */
export function speechPresentation(
  evidence: Pick<EventEvidence, 'actorId' | 'sourceId' | 'targetId' | 'speech'>,
  perspective: Readonly<NarrationPerspective>,
  purpose: 'personal' | 'caption' | 'neutral',
): SpeechPresentation | undefined {
  const speech = evidence.speech,
    roles = speechRoles(evidence);
  if (!speech || !roles) return undefined;
  const grammaticalPerson =
    purpose === 'personal' ? 'first' : purpose === 'caption' ? 'second' : 'third';
  const participant = (
    id: string | undefined,
    role: 'speaker' | 'addressee',
    grammar: 'subject' | 'object' | 'reflexive',
    unknown: string,
    capitalize = false,
  ): SpeechDisplayPart => {
    const named = id ? perspective.names.get(id) : undefined;
    if (!id || !named)
      return {
        kind: 'literal',
        text: capitalize ? unknown[0]!.toUpperCase() + unknown.slice(1) : unknown,
      };
    const self =
      grammaticalPerson !== 'third' &&
      id === (purpose === 'personal' ? evidence.actorId : perspective.selfId);
    let text = personPhrase(
      named,
      grammar,
      self,
      'indefinite',
      grammaticalPerson === 'second' ? 'second' : 'first',
    );
    if (capitalize && (self || named.nameForm !== 'proper'))
      text = text[0]!.toUpperCase() + text.slice(1);
    return { kind: 'participant', id, role, text };
  };
  const source = participant(roles.sourceId, 'speaker', 'subject', 'someone', true);
  const target = participant(
    roles.targetId,
    'addressee',
    roles.targetId === roles.sourceId ? 'reflexive' : 'object',
    'someone else',
  );
  const directionLabel = roles.addressing === 'directed' ? `to ${target.text}` : null;
  const literal = (text: string): SpeechDisplayPart => ({ kind: 'literal', text });
  const parts: SpeechDisplayPart[] = [source];
  const observer = personalPronoun('subject', purpose === 'caption' ? 'second' : 'first');
  if (roles.relationship === 'seen') parts.push(literal(' appears to be speaking.'));
  else {
    parts.push(literal(speech.intelligibility === 'none' ? ' spoke' : ' said'));
    if (directionLabel) parts.push(literal(' to '), target);
    if (speech.intelligibility === 'none')
      parts.push(
        literal(
          purpose === 'neutral'
            ? '; the words were unintelligible.'
            : `; ${observer} could not understand the words.`,
        ),
      );
    else {
      parts.push(literal(': '), {
        kind: 'quotation',
        segments: speech.segments,
        text: `“${speechWords(speech)}”`,
      });
      if (speech.intelligibility === 'partial')
        parts.push(
          literal(
            purpose === 'neutral'
              ? ' Some words were unintelligible.'
              : ` ${observer[0]!.toUpperCase() + observer.slice(1)} heard only part of the words.`,
          ),
        );
    }
  }
  const personalText = parts.map((part) => part.text).join('');
  return {
    acquisition: speech.perception,
    speakerLabel: source.text,
    directionLabel,
    segments: speech.segments,
    personalText,
    accessibilityText: personalText,
    parts,
  };
}
export function speechDescription(
  evidence: Pick<EventEvidence, 'actorId' | 'sourceId' | 'targetId' | 'speech'>,
): string {
  const presentation = speechPresentation(evidence, speechPerspective(evidence), 'personal');
  if (!presentation) throw new Error('Linguistic evidence is unavailable.');
  return presentation.personalText;
}
/** All denormalized speech wording/roles are projections of the same acquired facts. */
export function speechEvidenceProjection(
  evidence: Pick<EventEvidence, 'actorId' | 'sourceId' | 'targetId'> & { speech: PerceivedSpeech },
) {
  const roles = speechRoles(evidence)!;
  const references: NonNullable<Awareness['references']> = [];
  if (roles.sourceId && roles.speaker)
    references.push({ id: roles.sourceId, label: roles.speaker.nameAtTime, role: 'actor' });
  if (roles.targetId && roles.addressee)
    references.push({ id: roles.targetId, label: roles.addressee.nameAtTime, role: 'target' });
  return {
    text: speechDescription(evidence),
    content: speechWords(evidence.speech),
    references,
    entityIds: [...new Set([roles.sourceId, roles.targetId].filter((id): id is string => !!id))],
    modality:
      evidence.speech.perception === 'self'
        ? ('internal' as const)
        : evidence.speech.perception === 'seen'
          ? ('observed' as const)
          : ('heard' as const),
    intelligible: evidence.speech.intelligibility !== 'none',
    triggerKind:
      roles.relationship === 'self'
        ? ('self_event' as const)
        : roles.relationship === 'seen'
          ? ('observed_event' as const)
          : roles.relationship === 'addressed'
            ? ('addressed_speech' as const)
            : ('overheard_speech' as const),
  };
}
/** Called once per utterance/listener inside the atomic event commitment. */
export function perceiveSpeech(
  world: WorldState,
  observer: Entity,
  source: Entity,
  event: WorldEvent,
  volume: SpeechVolume,
  words?: ReturnType<typeof prepareSpeechWords>,
): Awareness | null {
  const self = observer.id === source.id;
  const contact = speechPerception(world, observer, source, volume);
  const acoustic = perceiveSound(
    world,
    observer,
    event,
    speechEmission(world, source, volume),
    contact,
  );
  if (
    !hasMemory(observer) ||
    !understandsSpeech(observer) ||
    (!self && !world.moduleManifest.socialPerception)
  )
    return acoustic;
  if (!self && (!observer.actor?.alive || observer.actor.incapacitated)) return null;
  if (!self && !contact) return null;
  const detail = self ? 'clear' : contact!.detail;
  const visible = self || contact!.sees(source);
  if (detail === 'undetected' && !visible) return null;
  const perception = self ? 'self' : detail === 'undetected' ? 'seen' : 'heard';
  const voice =
    perception === 'heard' &&
    associatePerceivedSubject(world, observer.id, source.id, 'linguistic-voice');
  if (visible && !self) associatePerceivedSubject(world, observer.id, source.id, 'sight');
  const sourceId = visible || voice ? source.id : undefined;
  const label = (id: string): SpeechParticipant => {
    const name = observerName(world, observer.id, id);
    return {
      nameAtTime: name.name,
      ...(name.nameForm ? { nameForm: name.nameForm } : {}),
      ...(name.indefiniteArticle ? { indefiniteArticle: name.indefiniteArticle } : {}),
    };
  };
  const intended = event.targetId ? entityGet(world.entities, event.targetId) : undefined;
  // A bystander needs actual sight of the recipient, independently of speaker sight.
  const targetId =
    perception !== 'seen' &&
    event.targetId &&
    (self || event.targetId === observer.id || (intended && contact?.sees(intended)))
      ? event.targetId
      : undefined;
  if (!self && targetId && targetId !== observer.id)
    associatePerceivedSubject(world, observer.id, targetId, 'sight');
  const origin = worldPosition(source),
    listener = worldPosition(observer);
  const base: SpeechAcquisition = {
    speaker: sourceId ? label(sourceId) : null,
    delivery: visible && perception !== 'seen' ? volume : null,
    direction: !self && perception === 'heard' ? acousticDirection(origin, listener) : null,
    listenerPosition: { ...listener },
  };
  const segments: SpeechSegment[] =
    detail === 'clear'
      ? [{ kind: 'heard', text: String(event.data?.['text'] ?? '') }]
      : detail === 'partial'
        ? partialSpeech(
            String(event.data?.['text'] ?? ''),
            `${world.seed}:${event.id}:${observer.id}`,
            words,
          )
        : [];
  const speech: PerceivedSpeech =
    perception === 'seen'
      ? {
          ...base,
          perception,
          addressing: null,
          intelligibility: 'none',
          segments: [],
          addressee: null,
        }
      : {
          ...base,
          perception,
          addressing: event.targetId ? 'directed' : 'ambient',
          intelligibility: segments.some((part) => part.kind === 'heard' && part.text.trim())
            ? detail === 'clear'
              ? 'clear'
              : 'partial'
            : 'none',
          segments,
          addressee: targetId ? label(targetId) : null,
        };
  const projection = speechEvidenceProjection({ actorId: observer.id, sourceId, targetId, speech });
  return {
    retentionClass: 'memory',
    ...(acoustic?.sound ? { sound: acoustic.sound } : {}),
    eventId: event.id,
    actorId: observer.id,
    at: event.at,
    sequence: event.order ?? event.sequence,
    eventType: 'speech',
    speech,
    ...(sourceId ? { sourceId } : {}),
    ...(targetId ? { targetId } : {}),
    ...projection,
    recognized: !!sourceId && recognizesSubject(world, observer.id, sourceId),
    entityEpisodes: Object.fromEntries(
      projection.entityIds.flatMap((id) => {
        const episode = world.perceptionEpisodes?.[observer.id]?.[id];
        return episode ? [[id, episode]] : [];
      }),
    ),
    importance:
      perception === 'seen' || speech.intelligibility === 'none' ? 3 : (event.importance ?? 7),
    urgency: event.urgency ?? 4,
  };
}
/** Durable perspectives keep the same evidence used by hot observation and model context. */
export type EventEvidence = Pick<
  Awareness,
  | 'retentionClass'
  | 'expiresAt'
  | 'sound'
  | 'actorId'
  | 'eventData'
  | 'references'
  | 'eventType'
  | 'text'
  | 'content'
  | 'modality'
  | 'sourceId'
  | 'targetId'
  | 'speech'
  | 'importance'
  | 'urgency'
  | 'exposure'
  | 'recognized'
  | 'intelligible'
  | 'entityIds'
  | 'triggerKind'
  | 'change'
>;
/** Current persisted observation format; absent payload is never permission to consult truth. */
export function validateEventEvidence(value: unknown): asserts value is EventEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid committed observer facts.');
  const evidence = value as Partial<EventEvidence>;
  if (
    !['memory', 'sensory'].includes(evidence.retentionClass ?? '') ||
    (evidence.retentionClass === 'sensory'
      ? !Number.isFinite(evidence.expiresAt) || !evidence.sound || !!evidence.speech
      : evidence.expiresAt !== undefined)
  )
    throw new Error('Invalid observer retention.');
  if (evidence.sound) {
    validatePerceivedSound(evidence.sound);
    if (evidence.sound.visibleSource && evidence.sound.visibleSource.entityId !== evidence.sourceId)
      throw new Error('Sound and linguistic evidence disagree about the visible source.');
    if (evidence.retentionClass === 'sensory' && evidence.expiresAt! <= evidence.sound.acquiredAt)
      throw new Error('Invalid sensory expiry.');
  }
  if (
    !isSafeRecordId(evidence.actorId) ||
    typeof evidence.recognized !== 'boolean' ||
    typeof evidence.intelligible !== 'boolean' ||
    !Array.isArray(evidence.entityIds) ||
    evidence.entityIds.some((id) => !isSafeRecordId(id)) ||
    new Set(evidence.entityIds).size !== evidence.entityIds.length
  )
    throw new Error('Invalid committed observer identity or acquisition.');
  if (
    evidence.references !== undefined &&
    (!Array.isArray(evidence.references) ||
      new Set(evidence.references.map((ref) => `${ref?.role}:${ref?.id}`)).size !==
        evidence.references.length ||
      evidence.references.some(
        (ref) =>
          !ref ||
          typeof ref.id !== 'string' ||
          !ref.id ||
          typeof ref.label !== 'string' ||
          !ref.label.trim() ||
          !['actor', 'target', 'participant'].includes(ref.role) ||
          (ref.role === 'actor' && ref.id !== evidence.sourceId) ||
          (ref.role === 'target' && ref.id !== evidence.targetId) ||
          (ref.role === 'participant' &&
            (ref.id === evidence.sourceId || ref.id === evidence.targetId)),
      ))
  )
    throw new Error('Invalid occurrence-time participant references.');
  if (
    typeof evidence.eventType !== 'string' ||
    !/^[a-z][a-z0-9_.:-]{0,63}$/.test(evidence.eventType)
  )
    throw new Error('Invalid committed observer event type.');
  if (evidence.sound && !evidence.speech) {
    const sound = evidence.sound;
    const projection = soundEvidenceProjection(evidence.actorId!, sound);
    if (
      evidence.sourceId !== projection.sourceId ||
      evidence.targetId !== undefined ||
      evidence.content !== undefined ||
      evidence.eventData !== undefined ||
      evidence.intelligible !== projection.intelligible ||
      evidence.recognized !== projection.recognized ||
      evidence.modality !== projection.modality ||
      evidence.text !== projection.text ||
      evidence.triggerKind !== projection.triggerKind ||
      JSON.stringify(evidence.entityIds) !== JSON.stringify(projection.entityIds) ||
      JSON.stringify(evidence.references ?? []) !== JSON.stringify(projection.references)
    )
      throw new Error('Sound-only evidence contains unsupported linguistic or source facts.');
  } else if (evidence.eventType === 'speech') {
    if (!evidence.speech) throw new Error('Speech is missing its committed listener perspective.');
    const speech = evidence.speech;
    const participant = (value: unknown): boolean =>
      value === null ||
      (hasRecordFields(value, ['nameAtTime'], ['nameForm', 'indefiniteArticle']) &&
        validName({ ...value, name: value.nameAtTime }));
    if (
      !hasRecordFields(speech, [
        'perception',
        'addressing',
        'intelligibility',
        'segments',
        'speaker',
        'addressee',
        'delivery',
        'direction',
        'listenerPosition',
      ]) ||
      !['heard', 'seen', 'self'].includes(speech.perception) ||
      !['none', 'partial', 'clear'].includes(speech.intelligibility) ||
      !participant(speech.speaker) ||
      !participant(speech.addressee) ||
      (speech.delivery !== null && !isSpeechVolume(speech.delivery)) ||
      !hasRecordFields(speech.listenerPosition, ['x', 'y', 'z']) ||
      !Object.values(speech.listenerPosition).every(
        (v) => typeof v === 'number' && Number.isFinite(v),
      ) ||
      (speech.direction !== null &&
        (!hasRecordFields(speech.direction, ['sector', 'elevation']) ||
          !Number.isInteger(speech.direction.sector) ||
          speech.direction.sector < 0 ||
          speech.direction.sector > 7 ||
          !['above', 'level', 'below'].includes(speech.direction.elevation))) ||
      !Array.isArray(speech.segments) ||
      speech.segments.some((part) =>
        part.kind === 'heard'
          ? !hasRecordFields(part, ['kind', 'text']) || typeof part.text !== 'string'
          : part.kind !== 'unintelligible' || !hasRecordFields(part, ['kind']),
      ) ||
      (speech.perception === 'seen'
        ? speech.addressing !== null ||
          speech.intelligibility !== 'none' ||
          speech.segments.length !== 0 ||
          speech.addressee !== null ||
          evidence.targetId !== undefined ||
          speech.delivery !== null ||
          speech.direction !== null
        : !['ambient', 'directed'].includes(speech.addressing) ||
          (speech.addressing === 'ambient' &&
            (evidence.targetId !== undefined || speech.addressee !== null))) ||
      !!evidence.sourceId !== !!speech.speaker ||
      !!evidence.targetId !== !!speech.addressee ||
      (evidence.sourceId !== undefined && !isSafeRecordId(evidence.sourceId)) ||
      (evidence.targetId !== undefined && !isSafeRecordId(evidence.targetId)) ||
      (evidence.sourceId === evidence.actorId) !== (speech.perception === 'self') ||
      (speech.perception === 'self' &&
        (evidence.sourceId !== evidence.actorId ||
          speech.delivery === null ||
          speech.intelligibility !== 'clear' ||
          speech.direction !== null)) ||
      (speech.intelligibility === 'none' &&
        speech.segments.some((part) => part.kind === 'heard' && part.text.trim())) ||
      (speech.intelligibility === 'clear' &&
        speech.segments.some((part) => part.kind === 'unintelligible')) ||
      (speech.intelligibility !== 'none' &&
        !speech.segments.some((part) => part.kind === 'heard' && part.text.trim()))
    )
      throw new Error('Invalid acquired speech roles or payload.');
    const projection = speechEvidenceProjection({
      actorId: evidence.actorId!,
      sourceId: evidence.sourceId,
      targetId: evidence.targetId,
      speech,
    });
    if (
      evidence.text !== projection.text ||
      evidence.content !== projection.content ||
      evidence.modality !== projection.modality ||
      JSON.stringify(evidence.references?.map((ref) => [ref.role, ref.id, ref.label])) !==
        JSON.stringify(projection.references.map((ref) => [ref.role, ref.id, ref.label]))
    )
      throw new Error('Contradictory speech projections.');
    if (
      JSON.stringify(evidence.entityIds) !== JSON.stringify(projection.entityIds) ||
      evidence.intelligible !== projection.intelligible ||
      evidence.triggerKind !== projection.triggerKind
    )
      throw new Error('Contradictory indexed speech roles.');
  } else if (
    !evidence.eventData ||
    typeof evidence.eventData !== 'object' ||
    Array.isArray(evidence.eventData) ||
    Object.values(evidence.eventData).some(
      (entry) =>
        entry !== null &&
        typeof entry !== 'string' &&
        typeof entry !== 'boolean' &&
        !(typeof entry === 'number' && Number.isFinite(entry)),
    )
  )
    throw new Error('Event is missing valid committed observer facts.');
}
export type ActorEvent = WorldEvent & {
  sound?: import('./sound.js').PerceivedSound;
  speech?: PerceivedSpeech;
  modality: Awareness['modality'];
  references?: Awareness['references'];
};
/** An occurrence's private source type does not teach a detector that the
 * sound it heard was language. Memory, models and display share this distinction. */
export function perceivedEventType(
  evidence: Pick<Awareness, 'eventType' | 'sound' | 'speech'>,
): string | undefined {
  return evidence.sound && !evidence.speech ? 'sound' : evidence.eventType;
}
export function projectEventEvidence(event: WorldEvent, evidence: EventEvidence): ActorEvent {
  if (event.type === 'speech' && !evidence.speech && !evidence.sound)
    throw new Error('Speech is missing its committed listener perspective.');
  if (!evidence.speech && !evidence.sound && (!evidence.eventData || !evidence.eventType))
    throw new Error('Event is missing its committed observer facts.');
  return {
    id: event.id,
    sequence: event.sequence,
    at: event.at,
    order: event.order,
    type: perceivedEventType(evidence)!,
    scope: event.scope,
    text: evidence.text,
    audience: [evidence.actorId],
    modality: evidence.modality,
    ...(evidence.sound ? { sound: evidence.sound } : {}),
    ...(evidence.references?.length ? { references: evidence.references } : {}),
    ...(evidence.exposure ? { exposure: evidence.exposure } : {}),
    ...(evidence.sourceId ? { actorId: evidence.sourceId } : {}),
    ...(evidence.targetId ? { targetId: evidence.targetId } : {}),
    importance: evidence.importance,
    urgency: evidence.urgency,
    ...(evidence.speech
      ? {
          speech: evidence.speech,
          data: {
            text: speechWords(evidence.speech),
            ...(evidence.speech.delivery ? { volume: evidence.speech.delivery } : {}),
            ...(typeof event.data?.['responseId'] === 'string'
              ? { responseId: event.data['responseId'] }
              : {}),
          },
        }
      : { data: evidence.eventData }),
  };
}
