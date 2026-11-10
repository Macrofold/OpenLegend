import {
  activeGoalTexts,
  type ActorAgency,
  type ActorComponent,
  type MemoryRecord,
  type DefinitionPin,
  type currentAttentionCues,
} from '@open-legend/domain';
import { digest } from './store.js';

export const THOUGHT_RESPONSE_INTERRUPTION = { importance: 8, urgency: 8 } as const;

export interface ThoughtEventRead {
  readonly type: string;
  readonly actorId?: string | null;
  readonly data?: Readonly<Record<string, string | number | boolean | null>> | null;
  readonly responseRecorded: boolean;
}
/** Selection reads the actor's actual retained account and the corresponding
 * finite original metadata. A job owns its speech regardless of its outcome. */
export function thoughtEvidenceFromRead(
  actorId: string,
  afterSequence: number,
  records: readonly MemoryRecord[],
  conditions: Readonly<ActorComponent['conditions']> | null,
  event: (id: string) => ThoughtEventRead | undefined,
  handledSpeech: ReadonlySet<string>,
  significantEventTypes: readonly string[],
): MemoryRecord[] {
  return records
    .filter((memory) => {
      if (
        memory.speakerId === actorId &&
        (memory.eventType === 'speech' || memory.eventType === 'speech-result')
      )
        return false;
      const original = event(memory.eventId ?? '');
      const attributeId = original?.type === 'body-condition' && original.data?.['attributeId'];
      if (
        typeof attributeId === 'string' &&
        ((typeof original?.data?.['severity'] === 'number' &&
          (conditions?.[attributeId]?.severity ?? 0) < original.data['severity']) ||
          (typeof original?.data?.['definitionVersion'] === 'number' &&
            conditions?.[attributeId]?.version !== original.data['definitionVersion']))
      )
        return false;
      const consumed =
        original?.actorId === actorId &&
        original.type === 'appraisal-changed' &&
        original.data?.['appraisalPipeline'] === 'prepared-response' &&
        typeof original.data['responseId'] === 'string' &&
        typeof original.data['appraisalInputSequence'] === 'number' &&
        typeof original.data['appraisalCauseIds'] === 'string' &&
        original.responseRecorded;
      return (
        !consumed &&
        !handledSpeech.has(memory.eventId ?? memory.id) &&
        (memory.importance >= 6 || significantEventTypes.includes(original?.type ?? '')) &&
        (memory.sequence ?? 0) > afterSequence
      );
    })
    .sort((a, b) => (b.sequence ?? 0) - (a.sequence ?? 0));
}

export interface ThoughtNativeCause {
  readonly key: string;
  readonly qualitativeRevision: string;
  readonly severity: number;
  readonly generation: number;
}
export function thoughtNativeCausesFromRead(
  cues: ReturnType<typeof currentAttentionCues>,
  severity: number,
  resolved: (key: string, revision: string, severity: number) => boolean,
): ThoughtNativeCause[] {
  return cues.flatMap((cue) => {
    const key = JSON.stringify([cue.anchorKey, cue.family]),
      qualitativeRevision = cue.descriptionRevision;
    return resolved(key, qualitativeRevision, severity)
      ? []
      : [{ key, qualitativeRevision, severity, generation: cue.generation }];
  });
}
export interface ThoughtAgencyRead {
  readonly goals: ActorAgency['goals'];
  readonly lastResultEvidence?: ActorAgency['lastResultEvidence'];
  readonly plan?:
    | (Pick<NonNullable<ActorAgency['plan']>, 'id' | 'status'> & {
        readonly steps: readonly (Pick<
          NonNullable<ActorAgency['plan']>['steps'][number],
          'id' | 'status'
        > & { readonly outcome?: { readonly code: string } | null })[];
      })
    | null;
}
export interface ThoughtMeaningRead {
  readonly nativeProtection?: string;
  readonly agency: ThoughtAgencyRead;
  readonly techniques: readonly { readonly recipeId: string; readonly evidenceId?: string }[];
  readonly bodyInputs: readonly { readonly key: string; readonly value: boolean }[];
  readonly bodyPolicyPin?: DefinitionPin | null;
  readonly concerns: readonly (readonly [string, string])[];
  readonly mind?: number;
  readonly knowledge: number;
  readonly policy: number;
  readonly reviews?: string;
}
/** Hash field order is the existing Source factory. Native reads supply those
 * same scoped facts; they do not substitute a world or invent missing causes. */
export function thoughtMeaningFromRead(read: ThoughtMeaningRead) {
  const agency = read.agency;
  return {
    fingerprint: digest({
      nativeProtection: read.nativeProtection,
      goal: activeGoalTexts(agency.goals).join('; '),
      techniques: read.techniques.map((record) => record.recipeId),
      bodyInputs: read.bodyInputs,
      bodyPolicyPin: read.bodyPolicyPin,
      concerns: read.concerns,
      mind: read.mind,
      knowledge: read.knowledge,
      policy: read.policy,
      reviews: read.reviews,
    }),
    semanticRevision: digest({
      goals: agency.goals
        .filter((goal) => goal.author !== 'actor')
        .map((goal) => [goal.id, goal.revision, goal.status]),
      techniques: read.techniques.map((record) => [record.recipeId, record.evidenceId]),
      blocked:
        agency.plan?.status === 'blocked'
          ? [
              agency.plan.id,
              agency.plan.steps
                .filter((step) => step.status === 'blocked')
                .map((step) => [step.id, step.outcome?.code]),
            ]
          : null,
      concerns: read.concerns,
    }),
  };
}
export function thoughtOpportunityFromRead(read: {
  readonly semanticRevision: string;
  readonly evidence: readonly string[];
  readonly nativeCauses: readonly ThoughtNativeCause[];
  readonly review: string | null | undefined;
  readonly discovery?: number;
}): string {
  return digest({
    semanticRevision: read.semanticRevision,
    evidence: read.evidence,
    nativeCauses: read.nativeCauses,
    review: read.review,
    discovery: read.discovery,
  });
}
export function priorityThoughtEvidence(
  unseen: readonly MemoryRecord[],
  urgentId: string | undefined,
  resultId: string | undefined,
): MemoryRecord[] {
  const priority = unseen.find((memory) => {
    const id = memory.eventId ?? memory.id;
    return id === urgentId || id === resultId;
  });
  return priority
    ? [priority, ...unseen.filter((memory) => memory !== priority)].slice(0, 8)
    : unseen.slice(0, 8);
}
