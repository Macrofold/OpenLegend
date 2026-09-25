import { observerDescription, recognizesSubject } from './worlds/base/knowledge.js';
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
  speaker: { entityId: string; nameAtTime: string } | null;
  delivery: SpeechVolume | null;
  direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
  listenerPosition: Position;
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
  const name = speech.speaker?.nameAtTime;
  if (speech.perception === 'seen') return `${name ?? 'Someone'} appears to be speaking.`;
  const words = speechWords(speech);
  if (speech.perception === 'self') return `I said: “${words}”`;
  if (speech.intelligibility === 'none')
    return name
      ? `${name} is ${speech.delivery === 'whisper' ? 'whispering' : speech.delivery === 'shout' ? 'shouting' : 'saying'} something; the words are unintelligible.`
      : 'I hear indistinct speech nearby.';
  return `${speech.intelligibility === 'partial' ? 'I partly heard' : 'I heard'} ${name ?? 'someone nearby'}: “${words}”${speech.intelligibility === 'partial' && speech.segments.some((part) => part.kind === 'unintelligible') ? ' Other words were unintelligible.' : ''}`;
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
  const dx = source.position.x - observer.position.x,
    dz = source.position.z - observer.position.z,
    dy = source.position.y - observer.position.y;
  const speech: PerceivedSpeech = {
    perception,
    intelligibility: detail === 'clear' || detail === 'partial' ? detail : 'none',
    segments:
      detail === 'clear'
        ? [{ kind: 'heard', text: raw }]
        : detail === 'partial'
          ? partialSpeech(raw, `${world.seed}:${event.id}:${observer.id}`, words)
          : [],
    speaker: visible
      ? { entityId: source.id, nameAtTime: observerDescription(world, observer.id, source.id) }
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
    listenerPosition: { ...observer.position },
  };
  if (!speech.segments.some((part) => part.kind === 'heard' && part.text.trim()))
    speech.intelligibility = 'none';
  // Communicative intent is not available merely because the server knows targetId.
  const intendedId =
    typeof event.data?.['intendedRecipientId'] === 'string'
      ? event.data['intendedRecipientId']
      : event.targetId;
  const recipient = intendedId ? world.entities[intendedId] : undefined;
  const perceivedRecipient =
    intendedId &&
    (self ||
      (speech.intelligibility !== 'none' &&
        visible &&
        (intendedId === observer.id || (recipient && contact?.sees(recipient)))))
      ? intendedId
      : undefined;
  const addressed = !self && perceivedRecipient === observer.id;
  const targetId = self
    ? event.targetId
    : event.targetId === perceivedRecipient
      ? perceivedRecipient
      : undefined;
  const entityIds = [
    ...new Set([
      ...(visible ? [source.id] : []),
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
    recognized: visible && recognizesSubject(world, observer.id, source.id),
    intelligible: speech.intelligibility !== 'none',
    ...(visible ? { sourceId: source.id } : {}),
    ...(targetId ? { targetId } : {}),
    ...(perceivedRecipient ? { intendedRecipientId: perceivedRecipient } : {}),
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
  | 'text'
  | 'content'
  | 'modality'
  | 'sourceId'
  | 'targetId'
  | 'intendedRecipientId'
  | 'speech'
  | 'importance'
  | 'urgency'
>;
export type ActorEvent = WorldEvent & { speech?: PerceivedSpeech; modality: Awareness['modality'] };
export function projectEventEvidence(event: WorldEvent, evidence: EventEvidence): ActorEvent {
  if (event.type === 'speech' && !evidence.speech)
    throw new Error('Speech is missing its committed listener perspective.');
  return {
    id: event.id,
    sequence: event.sequence,
    at: event.at,
    order: event.order,
    type: event.type,
    scope: event.scope,
    conversationId: event.conversationId,
    text: evidence.text,
    audience: [evidence.actorId],
    modality: evidence.modality,
    ...(evidence.sourceId ? { actorId: evidence.sourceId } : {}),
    ...(evidence.targetId ? { targetId: evidence.targetId } : {}),
    importance: evidence.importance,
    urgency: evidence.urgency,
    ...(evidence.speech
      ? {
          speech: evidence.speech,
          data: {
            text: speechWords(evidence.speech),
            ...(evidence.intendedRecipientId
              ? { intendedRecipientId: evidence.intendedRecipientId }
              : {}),
            ...(evidence.speech.delivery ? { volume: evidence.speech.delivery } : {}),
            ...(typeof event.data?.['responseId'] === 'string'
              ? { responseId: event.data['responseId'] }
              : {}),
          },
        }
      : { data: event.data }),
  };
}
