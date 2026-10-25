import { entityGet } from './entity-collection.js';
import { speechPresentation, validName, type Named } from '@open-legend/language';
import { worldPosition } from './spatial-state.js';
import {
  observerName,
  intendedAddresseeName,
  recognizesSubject,
  observerIndividual,
} from './worlds/base/knowledge.js';
import {
  validRecognitionFeatures,
  validateIndividualRecognition,
} from './worlds/base/recognition.js';
import { hasMemory } from './living.js';
import { selectedVoiceReception } from './world-composition.js';
import { currentBodyLocalSubject } from './perception-evidence.js';
import { validObserverSubject } from './knowledge.js';
import { isSafeRecordId } from './records.js';
import { speechPerception } from './perception.js';
import { contentLabel } from './events.js';
import type { SpeechVolume } from './acoustics.js';
import type { Awareness } from './experience.js';
import type { Entity, Position, WorldEvent, WorldState } from './types.js';

/** Which already permitted role the speaker selected; the recipient remains targetId. */
export type SpeechTargetRole = 'body' | 'remembered';
export const isSpeechTargetRole = (value: unknown): value is SpeechTargetRole =>
  value === 'body' || value === 'remembered';

export interface PerceivedSound {
  kind: 'voice-like';
  receivedLevelDbSpl: number;
  clarityMarginDb: number;
  direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
  listenerPosition: Position;
}
export const soundDescription = (_sound: PerceivedSound): string =>
  'You hear a voice-like sound nearby.';

export type SpeechSegment = { kind: 'heard'; text: string } | { kind: 'unintelligible' };
/** This entire shape is observer-permitted, including only the observer's own acquisition pose. */
export interface PerceivedSpeech {
  perception: 'heard' | 'seen' | 'self';
  intelligibility: 'none' | 'partial' | 'clear';
  segments: SpeechSegment[];
  speaker: (Omit<Named, 'name'> & { nameAtTime: string }) | null;
  /** Address intention is distinct from whether any known individual heard it. */
  addressing: 'ambient' | 'directed' | null;
  addressee: (Omit<Named, 'name'> & { nameAtTime: string }) | null;
  delivery: SpeechVolume | null;
  direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
  listenerPosition: Position;
  /** Actually understood self-name claim; never canonical identity proof. */
  nameClaim?: string;
}
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
export function perceivedSpeechPresentation(
  speech: PerceivedSpeech,
  roles: { observerId?: string; targetId?: string } = {},
) {
  return speechPresentation({
    speaker: speech.speaker ? { ...speech.speaker, name: speech.speaker.nameAtTime } : null,
    addressee: speech.addressee ? { ...speech.addressee, name: speech.addressee.nameAtTime } : null,
    self: speech.perception === 'self',
    addressed: roles.observerId !== undefined && roles.targetId === roles.observerId,
    directed: speech.addressing === 'directed',
    seen: speech.perception === 'seen',
    intelligibility: speech.intelligibility,
    delivery: speech.delivery,
    words: speechWords(speech),
  });
}
export function speechDescription(
  speech: PerceivedSpeech,
  roles?: { observerId?: string; targetId?: string },
): string {
  return perceivedSpeechPresentation(speech, roles).description;
}
/** Called once per utterance/listener inside event commitment, never during projection.
 * docs/hearing-and-speech.md#5-one-occurrence-listener-specific-evidence */
export function perceiveSpeech(
  world: WorldState,
  observer: Entity,
  source: Entity,
  event: WorldEvent,
  volume: SpeechVolume,
  words?: ReturnType<typeof prepareSpeechWords>,
): Awareness | null {
  const self = observer.id === source.id;
  if (!self && (!observer.actor?.alive || observer.actor.incapacitated)) return null;
  const contact = self ? null : speechPerception(world, observer, source, volume);
  if (!self && !contact) return null;
  const detail = self ? 'clear' : contact!.detail;
  const visible = self || contact!.sees(source);
  if (detail === 'undetected' && !visible) return null;
  const perception = self ? 'self' : detail === 'undetected' ? 'seen' : 'heard';
  const raw = String(event.data?.['text'] ?? '');
  const origin = worldPosition(source),
    listener = worldPosition(observer);
  const dx = origin.x - listener.x,
    dz = origin.z - listener.z,
    dy = origin.y - listener.y;
  const direction: PerceivedSound['direction'] =
    !self && perception === 'heard' && Math.hypot(dx, dz) >= Math.max(0.25, Math.abs(dy))
      ? {
          sector: (Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8,
          elevation: dy > 2 ? 'above' : dy < -2 ? 'below' : 'level',
        }
      : null;
  const reception =
    !self && perception === 'heard' && contact?.clarityMarginDb != null
      ? selectedVoiceReception(
          world,
          observer,
          source,
          event,
          contact.clarityMarginDb,
          visible ? source.id : undefined,
        )
      : undefined;
  const receivedFeatures = reception?.features;
  const voice = reception?.recognition;
  const learnedSubject = voice?.subject ?? voice?.learnedSubject;
  const individual = learnedSubject && observerIndividual(world, observer.id, learnedSubject);
  const localBodySubject = visible
    ? currentBodyLocalSubject(world, observer.id, source.id)
    : undefined;
  const preferredBodyName = localBodySubject
    ? observerIndividual(world, observer.id, localBodySubject)?.givenName
    : undefined;
  const speaker =
    voice?.recognized && individual
      ? {
          name: preferredBodyName || individual.givenName || 'unidentified voice',
          nameForm:
            preferredBodyName || individual.givenName ? ('proper' as const) : ('count' as const),
        }
      : visible
        ? observerName(world, observer.id, source.id)
        : individual
          ? {
              name: individual.givenName || 'unidentified voice',
              nameForm: individual.givenName ? ('proper' as const) : ('count' as const),
            }
          : undefined;
  const sourceId = visible ? source.id : voice?.recognized ? individual?.canonicalId : undefined;
  if (!hasMemory(observer) || observer.actor?.capabilities?.comprehendsSpeech === false) {
    if (
      perception !== 'heard' ||
      contact?.receivedLevelDbSpl == null ||
      contact.clarityMarginDb == null
    )
      return null;
    const sound: PerceivedSound = {
      kind: 'voice-like',
      receivedLevelDbSpl: contact.receivedLevelDbSpl,
      clarityMarginDb: contact.clarityMarginDb,
      direction,
      listenerPosition: { ...listener },
    };
    return {
      eventId: event.id,
      actorId: observer.id,
      at: event.at,
      sequence: event.order ?? event.sequence,
      eventType: 'sound',
      sound,
      text: soundDescription(sound),
      modality: 'heard',
      recognized: voice?.recognized === true,
      ...(voice ? { recognition: voice } : {}),
      ...(voice && receivedFeatures
        ? {
            receivedFeatures: {
              modality: 'hearing' as const,
              family: reception!.family,
              features: receivedFeatures,
              quality: voice.quality,
            },
          }
        : {}),
      ...(hasMemory(observer) && sourceId ? { sourceId } : {}),
      ...(hasMemory(observer) && learnedSubject ? { sourceSubject: learnedSubject } : {}),
      intelligible: false,
      entityIds: [],
      importance: event.importance ?? 3,
      urgency: event.urgency ?? 4,
      triggerKind: 'observed_event',
    };
  }
  const bodyLease =
    visible && !self
      ? Object.values(world.perceptionEvidence?.[observer.id]?.current ?? {}).find(
          (facet) =>
            facet.subjectId === source.id &&
            facet.subjectPhysicalLife === (source.actor?.physicalLife ?? 0) &&
            facet.value.kind === 'body',
        )
      : undefined;
  const speech: PerceivedSpeech = {
    perception,
    intelligibility: detail === 'clear' || detail === 'partial' ? detail : 'none',
    segments:
      detail === 'clear'
        ? [{ kind: 'heard', text: raw }]
        : detail === 'partial'
          ? partialSpeech(raw, `${world.seed}:${event.id}:${observer.id}`, words)
          : [],
    addressing: perception === 'seen' ? null : event.targetId ? 'directed' : 'ambient',
    addressee: null,
    speaker: speaker
      ? {
          nameAtTime: speaker!.name,
          nameForm: speaker!.nameForm,
          indefiniteArticle: speaker!.indefiniteArticle,
        }
      : null,
    delivery: visible && perception !== 'seen' ? volume : null,
    // A coarse direct-path bearing is not a source location or a future tracking handle.
    direction,
    listenerPosition: { ...listener },
  };
  const introduction = event.data?.['selfIntroduction'];
  if (
    typeof introduction === 'string' &&
    speech.segments.some((part) => part.kind === 'heard' && part.text.includes(introduction.trim()))
  )
    speech.nameClaim = introduction.trim();
  if (!speech.segments.some((part) => part.kind === 'heard' && part.text.trim()))
    speech.intelligibility = 'none';
  // Linguistic direction is selected world policy for detected speech. The
  // actual third-person addressee still needs an independently observed binding.
  const intendedId = event.targetId;
  const recipient = intendedId ? entityGet(world.entities, intendedId) : undefined;
  const perceivedRecipient =
    intendedId &&
    perception !== 'seen' &&
    (self || intendedId === observer.id || (recipient && contact?.sees(recipient)))
      ? intendedId
      : undefined;
  const addressed = !self && perceivedRecipient === observer.id;
  if (perceivedRecipient) {
    const name = self
      ? intendedAddresseeName(
          world,
          observer.id,
          perceivedRecipient,
          event.data?.['targetRole'] === 'remembered' ? 'remembered' : 'body',
        )
      : observerName(world, observer.id, perceivedRecipient);
    speech.addressee = {
      nameAtTime: name.name,
      nameForm: name.nameForm,
      indefiniteArticle: name.indefiniteArticle,
    };
  }
  const targetId = self
    ? event.targetId
    : event.targetId === perceivedRecipient
      ? perceivedRecipient
      : undefined;
  const entityIds = [
    ...new Set([
      ...(sourceId ? [sourceId] : []),
      ...(perceivedRecipient ? [perceivedRecipient] : []),
    ]),
  ];
  return {
    eventId: event.id,
    actorId: observer.id,
    at: event.at,
    sequence: event.order ?? event.sequence,
    eventType: 'speech',
    text: speechDescription(speech, { observerId: observer.id, targetId }),
    content: speechWords(speech),
    speech,
    modality: perception === 'self' ? 'internal' : perception === 'seen' ? 'observed' : 'heard',
    recognized:
      (visible && recognizesSubject(world, observer.id, source.id)) || voice?.recognized === true,
    intelligible: speech.intelligibility !== 'none',
    ...(sourceId ? { sourceId } : {}),
    ...(self || bodyLease
      ? {
          sourceBody: {
            entityId: source.id,
            physicalLife: source.actor?.physicalLife ?? 0,
            leaseId: self ? null : bodyLease!.id,
          },
        }
      : {}),
    ...(voice ? { recognition: voice } : {}),
    ...(voice && receivedFeatures
      ? {
          receivedFeatures: {
            modality: 'hearing' as const,
            family: reception!.family,
            features: receivedFeatures,
            quality: voice.quality,
          },
        }
      : {}),
    ...(learnedSubject ? { sourceSubject: learnedSubject } : {}),
    ...(targetId ? { targetId } : {}),
    entityIds,
    entityEpisodes: Object.fromEntries(
      entityIds.flatMap((id) => {
        const episode = world.perceptionEpisodes?.[observer.id]?.[id];
        return episode ? [[id, episode]] : [];
      }),
    ),
    importance:
      perception === 'seen' || speech.intelligibility === 'none' ? 3 : (event.importance ?? 7),
    urgency: event.urgency ?? 4,
    triggerKind: self
      ? 'self_event'
      : perception === 'seen'
        ? 'observed_event'
        : addressed
          ? 'addressed_speech'
          : 'overheard_speech',
  };
}
/** Durable perspectives keep the same evidence used by hot observation and model context. */
export type EventEvidence = Pick<
  Awareness,
  | 'actorId'
  | 'eventData'
  | 'references'
  | 'eventType'
  | 'text'
  | 'content'
  | 'modality'
  | 'sourceId'
  | 'sourceBody'
  | 'recognition'
  | 'receivedFeatures'
  | 'targetId'
  | 'sourceSubject'
  | 'observation'
  | 'observations'
  | 'speech'
  | 'sound'
  | 'importance'
  | 'urgency'
  | 'exposure'
>;
/** Current persisted observation format; absent payload is never permission to consult truth. */
export function validateEventEvidence(value: unknown): asserts value is EventEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid committed observer facts.');
  const evidence = value as Partial<EventEvidence>;
  if (
    !isSafeRecordId(evidence.actorId) ||
    (evidence.sourceId !== undefined && !isSafeRecordId(evidence.sourceId)) ||
    (evidence.targetId !== undefined && !isSafeRecordId(evidence.targetId)) ||
    (evidence.sourceSubject !== undefined && !validObserverSubject(evidence.sourceSubject))
  )
    throw new Error('Invalid observer or acquired subject reference.');
  if (evidence.recognition !== undefined) validateIndividualRecognition(evidence.recognition);
  if (evidence.receivedFeatures !== undefined) validateReceivedFeatures(evidence.receivedFeatures);
  if (
    evidence.sourceBody !== undefined &&
    (!evidence.sourceBody ||
      typeof evidence.sourceBody.entityId !== 'string' ||
      !evidence.sourceBody.entityId ||
      !Number.isSafeInteger(evidence.sourceBody.physicalLife) ||
      evidence.sourceBody.physicalLife < 0 ||
      !evidence.speech ||
      evidence.sourceBody.entityId !== evidence.sourceId ||
      (evidence.sourceBody.leaseId === null
        ? evidence.speech?.perception !== 'self' ||
          evidence.sourceBody.entityId !== evidence.actorId
        : typeof evidence.sourceBody.leaseId !== 'string' || !evidence.sourceBody.leaseId))
  )
    throw new Error('Invalid acquired speech body correspondence.');
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
  if (evidence.eventType === 'sound') {
    if (!evidence.sound || evidence.speech || evidence.targetId || evidence.content)
      throw new Error('Sound-only evidence cannot contain linguistic or canonical source facts.');
    validatePerceivedSound(evidence.sound);
  } else if (evidence.eventType === 'speech') {
    validatePerceivedSpeech(evidence.speech);
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
  /** Private event-time physical grant for later scoped publication, not voice identity. */
  sourceBody?: Awareness['sourceBody'];
  sourceSubject?: Awareness['sourceSubject'];
  speech?: PerceivedSpeech;
  sound?: PerceivedSound;
  modality: Awareness['modality'];
  references?: Awareness['references'];
};
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
    type: evidence.eventType!,
    scope: event.scope,
    conversationId: event.conversationId,
    text: evidence.text,
    audience: [evidence.actorId],
    modality: evidence.modality,
    ...(evidence.references?.length ? { references: evidence.references } : {}),
    ...(evidence.exposure ? { exposure: evidence.exposure } : {}),
    ...(evidence.sourceId ? { actorId: evidence.sourceId } : {}),
    ...(evidence.targetId ? { targetId: evidence.targetId } : {}),
    ...(evidence.sourceBody ? { sourceBody: evidence.sourceBody } : {}),
    ...(evidence.sourceSubject ? { sourceSubject: evidence.sourceSubject } : {}),
    importance: evidence.importance,
    urgency: evidence.urgency,
    ...(evidence.sound ? { sound: evidence.sound, data: {} } : {}),
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
      : evidence.sound
        ? {}
        : { data: evidence.eventData }),
  };
}

function validListenerPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const position = value as Position;
  return [position.x, position.y, position.z].every(
    (number) => typeof number === 'number' && Number.isFinite(number),
  );
}
function validDirection(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const direction = value as PerceivedSound['direction'];
  return (
    !!direction &&
    Number.isInteger(direction.sector) &&
    direction.sector >= 0 &&
    direction.sector < 8 &&
    ['above', 'level', 'below'].includes(direction.elevation)
  );
}
export function validatePerceivedSound(value: unknown): asserts value is PerceivedSound {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid received sound.');
  const sound = value as PerceivedSound;
  if (
    Object.keys(value).some(
      (key) =>
        ![
          'kind',
          'receivedLevelDbSpl',
          'clarityMarginDb',
          'direction',
          'listenerPosition',
        ].includes(key),
    )
  )
    throw new Error('Unsupported received sound field.');
  if (
    sound.kind !== 'voice-like' ||
    !Number.isFinite(sound.receivedLevelDbSpl) ||
    !Number.isFinite(sound.clarityMarginDb) ||
    !validDirection(sound.direction) ||
    !validListenerPosition(sound.listenerPosition)
  )
    throw new Error('Invalid received sound.');
}
export function validSpeechLabel(value: unknown): value is PerceivedSpeech['speaker'] {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const label = value as NonNullable<PerceivedSpeech['speaker']>;
  return (
    Object.keys(label).every((key) =>
      ['nameAtTime', 'nameForm', 'indefiniteArticle'].includes(key),
    ) && validName({ ...label, name: label.nameAtTime })
  );
}
export function validatePerceivedSpeech(value: unknown): asserts value is PerceivedSpeech {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid received speech.');
  const speech = value as PerceivedSpeech;
  if (
    Object.keys(value).some(
      (key) =>
        ![
          'perception',
          'intelligibility',
          'segments',
          'speaker',
          'addressing',
          'addressee',
          'delivery',
          'direction',
          'listenerPosition',
          'nameClaim',
        ].includes(key),
    )
  )
    throw new Error('Unsupported received speech field.');
  if (
    !['heard', 'seen', 'self'].includes(speech.perception) ||
    !['none', 'partial', 'clear'].includes(speech.intelligibility) ||
    !Array.isArray(speech.segments) ||
    speech.segments.some(
      (segment) =>
        !segment ||
        (segment.kind === 'unintelligible'
          ? Object.keys(segment).length !== 1
          : !(
              segment.kind === 'heard' &&
              typeof segment.text === 'string' &&
              Object.keys(segment).length === 2
            )),
    ) ||
    !validSpeechLabel(speech.speaker) ||
    !validSpeechLabel(speech.addressee) ||
    !['ambient', 'directed', null].includes(speech.addressing) ||
    (speech.perception === 'seen'
      ? speech.addressing !== null || speech.segments.length > 0
      : speech.addressing === null) ||
    (speech.delivery !== null && !['whisper', 'normal', 'shout'].includes(speech.delivery)) ||
    !validDirection(speech.direction) ||
    !validListenerPosition(speech.listenerPosition) ||
    (speech.nameClaim !== undefined &&
      (typeof speech.nameClaim !== 'string' ||
        !speech.nameClaim.trim() ||
        Array.from(speech.nameClaim).length > 120))
  )
    throw new Error('Invalid received speech.');
}

export function validateReceivedFeatures(
  value: unknown,
): asserts value is NonNullable<Awareness['receivedFeatures']> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid received individual features.');
  const sample = value as NonNullable<Awareness['receivedFeatures']>;
  if (
    !['sight', 'hearing'].includes(sample.modality) ||
    !sample.family ||
    typeof sample.family.id !== 'string' ||
    !sample.family.id ||
    !Number.isSafeInteger(sample.family.version) ||
    sample.family.version < 1 ||
    !validRecognitionFeatures(sample.features) ||
    !Number.isFinite(sample.quality) ||
    sample.quality < 0 ||
    sample.quality > 1
  )
    throw new Error('Invalid received individual features.');
}
