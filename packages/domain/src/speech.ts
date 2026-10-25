import { entityGet } from './entity-collection.js';
import { namePhrase, personalPronoun, validName, type Named } from '@open-legend/language';
import { worldPosition } from './spatial-state.js';
import { observerName, recognizesSubject, observerIndividual } from './worlds/base/knowledge.js';
import { perceiveVoice, receivedVoiceFeatures } from './worlds/base/recognition.js';
import { hasMemory } from './living.js';
import { speechPerception } from './perception.js';
import { contentLabel } from './events.js';
import type { SpeechVolume } from './acoustics.js';
import type { Awareness } from './experience.js';
import type { Entity, Position, WorldEvent, WorldState } from './types.js';

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
export function speechDescription(speech: PerceivedSpeech): string {
  const name = speech.speaker
    ? namePhrase({ ...speech.speaker, name: speech.speaker.nameAtTime }, 'indefinite', {
        capitalize: speech.perception === 'seen' || speech.intelligibility === 'none',
      })
    : undefined;
  if (speech.perception === 'seen') return `${name ?? 'Someone'} appears to be speaking.`;
  const words = speechWords(speech);
  if (speech.perception === 'self') return `${personalPronoun('subject')} said: “${words}”`;
  if (speech.intelligibility === 'none')
    return name
      ? `${name} is ${speech.delivery === 'whisper' ? 'whispering' : speech.delivery === 'shout' ? 'shouting' : 'saying'} something; the words are unintelligible.`
      : `${personalPronoun('subject')} hear indistinct speech nearby.`;
  return `${personalPronoun('subject')} ${speech.intelligibility === 'partial' ? 'partly heard' : 'heard'} ${name ?? 'someone nearby'}: “${words}”${speech.intelligibility === 'partial' && speech.segments.some((part) => part.kind === 'unintelligible') ? ' Other words were unintelligible.' : ''}`;
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
  if (!hasMemory(observer) || (!self && (!observer.actor?.alive || observer.actor.incapacitated)))
    return null;
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
  const voice =
    !self &&
    perception === 'heard' &&
    source.actor?.voiceProfile &&
    contact?.clarityMarginDb !== null &&
    contact?.clarityMarginDb !== undefined
      ? perceiveVoice(
          world,
          observer.id,
          event,
          receivedVoiceFeatures(source.actor.voiceProfile),
          contact.clarityMarginDb,
          visible ? source.id : undefined,
        )
      : undefined;
  const learnedSubject = voice?.subject ?? voice?.learnedSubject;
  const individual = learnedSubject && observerIndividual(world, observer.id, learnedSubject);
  const speaker = visible
    ? observerName(world, observer.id, source.id)
    : individual
      ? {
          name: individual.givenName || 'unidentified voice',
          nameForm: individual.givenName ? ('proper' as const) : ('count' as const),
        }
      : undefined;
  const sourceId = visible ? source.id : voice?.recognized ? individual?.canonicalId : undefined;
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
    direction:
      !self && perception === 'heard' && Math.hypot(dx, dz) >= Math.max(0.25, Math.abs(dy))
        ? {
            sector: (Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8,
            elevation: dy > 2 ? 'above' : dy < -2 ? 'below' : 'level',
          }
        : null,
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
    (self || intendedId === observer.id || (visible && recipient && contact?.sees(recipient)))
      ? intendedId
      : undefined;
  const addressed = !self && perceivedRecipient === observer.id;
  if (perceivedRecipient) {
    const name = observerName(world, observer.id, perceivedRecipient);
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
    text: speechDescription(speech),
    content: speechWords(speech),
    speech,
    modality: perception === 'self' ? 'internal' : perception === 'seen' ? 'observed' : 'heard',
    recognized:
      (visible && recognizesSubject(world, observer.id, source.id)) || voice?.recognized === true,
    intelligible: speech.intelligibility !== 'none',
    ...(sourceId ? { sourceId } : {}),
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
  | 'targetId'
  | 'sourceSubject'
  | 'observation'
  | 'speech'
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
  if (evidence.eventType === 'speech') {
    if (!evidence.speech) throw new Error('Speech is missing its committed listener perspective.');
    const recipient = evidence.speech.addressee;
    if (
      !['ambient', 'directed', null].includes(evidence.speech.addressing) ||
      (evidence.speech.perception === 'seen'
        ? evidence.speech.addressing !== null
        : evidence.speech.addressing === null)
    )
      throw new Error('Invalid committed speech addressing.');
    if (
      recipient != null &&
      (typeof recipient !== 'object' ||
        Array.isArray(recipient) ||
        !validName({ ...recipient, name: recipient.nameAtTime }))
    )
      throw new Error('Invalid occurrence-time speech recipient.');
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
  speech?: PerceivedSpeech;
  modality: Awareness['modality'];
  references?: Awareness['references'];
};
export function projectEventEvidence(event: WorldEvent, evidence: EventEvidence): ActorEvent {
  if (event.type === 'speech' && !evidence.speech)
    throw new Error('Speech is missing its committed listener perspective.');
  if (!evidence.speech && (!evidence.eventData || !evidence.eventType))
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
