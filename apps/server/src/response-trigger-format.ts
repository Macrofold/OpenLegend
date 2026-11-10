import { nativeText, speechDescription, type Awareness } from '@open-legend/domain';
import type { experienceForModel } from './perceived-context.js';

export type ResponseTriggerRead = Pick<
  Awareness,
  | 'eventId'
  | 'at'
  | 'eventType'
  | 'text'
  | 'content'
  | 'modality'
  | 'triggerKind'
  | 'speech'
  | 'targetId'
>;

/** Event-time awareness supplies the words and roles. Formatting cannot infer
 * a speaker or intended recipient from nearby bodies or quoted names. */
export function formatResponseTrigger(
  aware: ResponseTriggerRead | undefined,
  actorId: string,
  fallback: string,
  eventTime: string | undefined,
): string {
  if (!aware) return `Situation change: ${fallback}`;
  const kind = aware.triggerKind,
    time = `(${eventTime})`;
  if (aware.eventType === 'speech') {
    if (!aware.speech) throw new Error('Speech is missing its committed listener perspective.');
    return `${kind === 'addressed_speech' ? 'Addressed speech (to me)' : kind === 'self_event' ? 'My own speech' : 'Nearby speech'}: ${speechDescription(aware.speech, { observerId: actorId, targetId: aware.targetId })} ${time}`;
  }
  return `${kind === 'directed_action' ? 'Action directed at me' : aware.modality === 'internal' ? 'Internal change' : 'World change'}: ${nativeText(aware.content ?? aware.text)} ${time}`;
}

export function formatResponseTriggerContext(
  aware: Awareness,
  read: {
    readonly experience: ReturnType<typeof experienceForModel>;
    readonly eventTime: string;
    readonly now: number;
    readonly speakerSubject?: string;
    readonly source?: { readonly myself: boolean };
    readonly recipient?: { readonly currentBody: boolean };
    readonly sourceCurrentlyVisible: boolean;
  },
): Record<string, unknown> {
  const occurrenceLabel = (role: 'actor' | 'target') =>
    aware.references?.find((reference) => reference.role === role)?.label;
  return {
    experience: read.experience,
    eventTime: read.eventTime,
    ageGameSeconds: Math.max(0, read.now - aware.at),
    observerRelationship: aware.triggerKind ?? 'observed_event',
    ...(aware.speech
      ? {
          speaker: aware.speech.speaker?.nameAtTime ?? 'Unknown speaker',
          addressing: aware.speech.addressing,
          intendedRecipient:
            aware.speech.addressee?.nameAtTime ??
            (aware.speech.addressing === 'ambient'
              ? 'Ambient speech'
              : 'Unknown; no recipient identity perceived'),
          ...(read.speakerSubject ? { speakerSubject: read.speakerSubject } : {}),
        }
      : {}),
    ...(read.source && !aware.speech
      ? {
          source: occurrenceLabel('actor') ?? 'Unknown source',
          sourceIsMe: read.source.myself,
        }
      : {}),
    ...(!aware.speech && read.recipient
      ? {
          subject: occurrenceLabel('target') ?? 'Unidentified subject',
          subjectCurrentlyVisible: read.recipient.currentBody,
        }
      : {}),
    sourceCurrentlyVisible: read.sourceCurrentlyVisible,
  };
}
