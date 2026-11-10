import { formatResponseTrigger, type ResponseTriggerRead } from './response-trigger-format.js';
import { gameTime } from './recall.js';
import { namePhrase, type Named } from '@open-legend/language';
import type { NativeWorld, NativeWorldNpcTrigger } from '@open-legend/native-simulation';
import {
  EXPERIENCE_LIMITS,
  STIMULUS_POLICY,
  activeStimuliFromRead,
  awarenessMemory,
  summaryMemory,
  nativeText,
  preparedResponseResultFromRead,
  resultEvidenceId,
  semanticCauseResolvedFromRead,
  type ActorComponent,
  type Awareness,
  type ExperienceSummary,
  type MemoryRecord,
  type PreparedThreatResultRead,
  type SemanticContinuation,
  type StimulusPolicy,
  type StimulusRead,
} from '@open-legend/domain';
import type { IntakeInputs } from './actor-work.js';
import { THOUGHT_INPUT_REASONS, stimulusReviewFromRead } from './interests.js';
import { nativeProtectionReasonFromRead } from './native-protection.js';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
import type { NativeActorSelf } from './native-perception.js';
import type { NativeCurrentCaptureSeed } from './native-current-capture.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import {
  THOUGHT_RESPONSE_INTERRUPTION,
  priorityThoughtEvidence,
  thoughtEvidenceFromRead,
  thoughtMeaningFromRead,
  thoughtNativeCausesFromRead,
  thoughtOpportunityFromRead,
  type ThoughtEventRead,
  type ThoughtAgencyRead,
} from './thought-trigger.js';

type Source =
  | { readonly kind: 'awareness'; readonly value: Awareness }
  | { readonly kind: 'memory'; readonly value: MemoryRecord }
  | { readonly kind: 'summary'; readonly value: ExperienceSummary };
export interface NativeNpcIntakeFacts {
  readonly worldId: string;
  readonly generation: string;
  readonly acceptedCut: number;
  readonly at: number;
  readonly actorId: string;
  readonly name: string;
  readonly physicalLife: number | null;
  /** Accepted native allocation highwater; durability is the service's SQL cut. */
  readonly identityThrough: number;
  readonly controller: string;
  readonly alive: boolean;
  readonly incapacitated: boolean;
  readonly participating: boolean;
  readonly hasMemory: boolean;
  readonly cognition: boolean;
  /** The Source autonomous ready predicate; escalation retains its own gates. */
  readonly eligible: boolean;
  /** Source enrolls actual mind-owner keys, separately from capabilities. */
  readonly enrolled: boolean;
  readonly conditions: ActorComponent['conditions'] | null;
  readonly values: readonly string[];
  readonly dependencyToken: string;
  readonly awarenessThrough: number;
  readonly urgency: number;
  readonly unseen: {
    readonly records: readonly Source[];
    readonly triggerAwareness: readonly ResponseTriggerRead[];
    readonly maxSequence: number;
    readonly interruptions: readonly { readonly kind: 'awareness'; readonly value: Awareness }[];
  };
  readonly own: {
    readonly agency: ThoughtAgencyRead;
    readonly attributes: NativeActorSelf['attributes'];
  };
  readonly attention: NativeCurrentCaptureSeed['attention'];
  readonly protectionLabels: readonly string[];
  readonly actionsBlocked: boolean;
  readonly speechBlocked: boolean;
  readonly semantic?: SemanticContinuation;
  readonly opportunity: {
    readonly bodyInputs: readonly { readonly key: string; readonly value: boolean }[];
    readonly concerns: readonly (readonly [string, string])[];
    /** Nonempty learned methods are refused by the current native owner. */
    readonly knowledge: readonly string[];
    readonly knowledgeRevision: number;
    readonly mindRevision: number | null;
    readonly semanticPurpose: string | null;
  };
  readonly preparedResult: PreparedThreatResultRead;
  readonly stimuli: readonly (StimulusRead & { readonly label: Named })[];
  readonly events: readonly (ThoughtEventRead & { readonly id: string })[];
}
export interface NativeThoughtSchedule {
  readonly watermark?: number;
  readonly semanticRevision?: string;
  readonly reviewKey?: string;
}

export type NativeNpcInputFacts = Pick<
  NativeNpcIntakeFacts,
  | 'worldId'
  | 'generation'
  | 'acceptedCut'
  | 'at'
  | 'actorId'
  | 'name'
  | 'physicalLife'
  | 'eligible'
  | 'enrolled'
  | 'controller'
  | 'alive'
  | 'incapacitated'
  | 'cognition'
  | 'actionsBlocked'
  | 'speechBlocked'
  | 'values'
  | 'dependencyToken'
  | 'awarenessThrough'
  | 'urgency'
> & {
  readonly discovery?: {
    readonly state: SemanticContinuation['discovery'];
    readonly reservation?: string;
  };
};
export interface NativeNpcQueueInputs {
  readonly facts: NativeNpcInputFacts;
  readonly input: IntakeInputs;
}
function intakeRequest(actorId: string, afterSequence: number, weighedThrough?: number): Buffer {
  return Buffer.from(
    JSON.stringify({
      actorId,
      afterSequence,
      ...(weighedThrough !== undefined ? { weighedThrough } : {}),
      selection: {
        limit: 256,
        protectedImportance: EXPERIENCE_LIMITS.protectedImportance,
        preferredImportance: 6,
        interruptionImportance: THOUGHT_RESPONSE_INTERRUPTION.importance,
        interruptionUrgency: THOUGHT_RESPONSE_INTERRUPTION.urgency,
      },
    }),
  );
}
async function queueInputs(read: NativeWorldNpcTrigger): Promise<NativeNpcQueueInputs> {
  const facts = freezeNativeProduct(decodeNativeProduct<NativeNpcInputFacts>(await read.inputs()));
  const values = retainNativeSources([...facts.values, facts.dependencyToken], facts);
  return retainNativeSources(
    {
      facts,
      input: {
        values,
        reasons: [...THOUGHT_INPUT_REASONS, 'state'] as const,
        urgency: facts.urgency,
      },
    },
    facts,
  );
}

/** One actual native owner across async schedule/job reads. Its JSON is only
 * presentation; inspection rechecks the originating native input witness. */
export class NativeNpcIntake {
  private constructor(
    private product: NativeNpcIntakeFacts | undefined,
    private readonly read: NativeWorldNpcTrigger,
    private readonly afterSequence: number,
  ) {}
  static async capture(
    world: NativeWorld,
    actorId: string,
    afterSequence: number,
    weighedThrough?: number,
  ): Promise<NativeNpcIntake> {
    const read = await world.readNpcTrigger(intakeRequest(actorId, afterSequence, weighedThrough));
    try {
      return new NativeNpcIntake(
        freezeNativeProduct(decodeNativeProduct<NativeNpcIntakeFacts>(await read.packet())),
        read,
        afterSequence,
      );
    } catch (error) {
      read.release();
      throw error;
    }
  }
  static async refresh(
    world: NativeWorld,
    actorId: string,
    weighedThrough?: number,
  ): Promise<NativeNpcQueueInputs> {
    const read = await world.readNpcTrigger(intakeRequest(actorId, 0, weighedThrough));
    try {
      return await queueInputs(read);
    } finally {
      read.release();
    }
  }
  async queueInputs(): Promise<NativeNpcQueueInputs> {
    this.facts;
    return queueInputs(this.read);
  }
  get facts(): NativeNpcIntakeFacts {
    if (!this.product) throw new Error('The native thought intake read was released.');
    return this.product;
  }
  get trigger(): NativeWorldNpcTrigger {
    this.facts;
    return this.read;
  }
  async inspection(world: NativeWorld) {
    this.facts;
    return world.inspectNpcTrigger(this.read);
  }
  async current(world: NativeWorld): Promise<boolean> {
    return !!this.product && (await world.npcTriggerCurrent(this.read));
  }
  release(): void {
    this.product = undefined;
    this.read.release();
  }
  retain<T extends object>(owner: T): T {
    return retainNativeSources(owner, this.facts);
  }
  inputs(): IntakeInputs {
    const facts = this.facts;
    // The extra dependency token is the actual native owner witness, not a
    // made-up Source Dependency[] or the world's unrelated accepted cut.
    const values = retainNativeSources([...facts.values, facts.dependencyToken], facts);
    return { values, reasons: [...THOUGHT_INPUT_REASONS, 'state'], urgency: facts.urgency };
  }
  records(): MemoryRecord[] {
    const facts = this.facts;
    return this.retain(
      facts.unseen.records.map((source) =>
        this.retain(
          source.kind === 'awareness'
            ? awarenessMemory(source.value)
            : source.kind === 'summary'
              ? summaryMemory(source.value, facts.actorId)
              : source.value,
        ),
      ),
    );
  }
  review(policy: StimulusPolicy = STIMULUS_POLICY) {
    const facts = this.facts;
    return this.retain(
      stimulusReviewFromRead(
        activeStimuliFromRead(facts.at, facts.stimuli, { ...policy, limit: Infinity }).stimuli,
      ),
    );
  }
  /** Exact Source trigger recipe over actual scoped facts. Speech ownership is
   * supplied only by the director's real durable speech-job lookup. */
  thought(
    definitions: NativeDefinitionCapture,
    schedule: NativeThoughtSchedule | undefined,
    handledSpeech: ReadonlySet<string>,
    stimulusPolicy: StimulusPolicy = STIMULUS_POLICY,
  ) {
    const facts = this.facts,
      installed = definitions.facts;
    if (definitions.worldId !== facts.worldId || (schedule?.watermark ?? 0) !== this.afterSequence)
      throw new Error('Thought scheduling facts belong to a different native read.');
    const policy = installed.definitions.cognitionPolicy,
      attentionPolicy = installed.nativePolicies.attention;
    const all = this.records();
    const events = new Map(facts.events.map((event) => [event.id, event]));
    const unseen = this.retain(
      thoughtEvidenceFromRead(
        facts.actorId,
        this.afterSequence,
        all,
        facts.conditions,
        (id) => events.get(id),
        handledSpeech,
        policy.significantEventTypes,
      ),
    );
    const unseenIds = new Set(unseen.map((entry) => entry.eventId ?? entry.id));
    const interruptions = this.retain(
      facts.unseen.interruptions
        .filter(({ value }) => unseenIds.has(value.eventId))
        .map(({ value }) =>
          this.retain({
            eventId: value.eventId,
            sequence: value.sequence,
            importance: value.importance,
            urgency: value.urgency ?? 0,
            triggerKind: value.triggerKind,
            text: nativeText(value.text),
          }),
        ),
    );
    const preparedResult = preparedResponseResultFromRead(
      policy.preparedResponses,
      facts.preparedResult,
      [...unseenIds],
    );
    const nativeCauses = this.retain(
      thoughtNativeCausesFromRead(
        facts.attention.cues,
        attentionPolicy.urgentCue,
        (key, revision, severity) =>
          semanticCauseResolvedFromRead(
            facts.semantic,
            facts.opportunity.semanticPurpose,
            key,
            revision,
            severity,
          ),
      ),
    );
    const resultId = preparedResult
      ? resultEvidenceId(facts.own.agency.lastResultEvidence)
      : undefined;
    const latest = this.retain(
      priorityThoughtEvidence(unseen, interruptions.at(-1)?.eventId, resultId),
    );
    const review = this.review(stimulusPolicy);
    const nativeProtection = nativeProtectionReasonFromRead(
      facts.actionsBlocked,
      facts.protectionLabels,
    );
    const { fingerprint, semanticRevision } = thoughtMeaningFromRead({
      nativeProtection,
      agency: facts.own.agency,
      techniques: facts.opportunity.knowledge.map((recipeId) => ({ recipeId })),
      bodyInputs: facts.opportunity.bodyInputs,
      bodyPolicyPin: installed.definitions.moduleManifest.bodyPolicyPin,
      concerns: facts.opportunity.concerns,
      mind: facts.opportunity.mindRevision ?? undefined,
      knowledge: facts.opportunity.knowledgeRevision,
      policy: policy.revision,
      reviews: review.key,
    });
    const meaningfulChange =
        !!schedule?.semanticRevision && schedule.semanticRevision !== semanticRevision,
      newReview = !!review.key && review.key !== schedule?.reviewKey && !!review.due.length;
    const discovery =
      !latest.length &&
      !nativeCauses.length &&
      !meaningfulChange &&
      !newReview &&
      attentionPolicy.semantic.discovery &&
      Object.values(facts.attention.candidates).some(
        (candidate) => candidate.presentedDescription !== candidate.descriptionRevision,
      ) &&
      facts.alive &&
      facts.semantic?.occupiedPurpose === null &&
      facts.semantic.discovery === 'available'
        ? facts.semantic.interval
        : undefined;
    const opportunity = thoughtOpportunityFromRead({
      semanticRevision,
      evidence: latest.map((memory) => memory.id),
      nativeCauses,
      review: newReview ? review.key! : null,
      discovery,
    });
    const latestSource = latest[0];
    const aware =
      latestSource &&
      facts.unseen.triggerAwareness.find(
        (aware) => aware.eventId === (latestSource.eventId ?? latestSource.id),
      );
    const diagnosticTrigger = latestSource
      ? formatResponseTrigger(
          aware,
          facts.actorId,
          latestSource.summary,
          aware
            ? gameTime(
                aware.at,
                installed.definitions.statusEffectPolicy.clockOffsetHours,
                installed.definitions.presentation?.calendar?.dayLabel,
              )
            : undefined,
        )
      : undefined;
    const reviewSource =
      review.due[0] && facts.stimuli.find((stimulus) => stimulus.sourceId === review.due[0]);
    return this.retain({
      all,
      unseen,
      interruptions,
      preparedResult,
      nativeCauses,
      latest,
      review,
      reviewDescription: reviewSource ? namePhrase(reviewSource.label, 'definite') : undefined,
      nativeProtection,
      fingerprint,
      semanticRevision,
      meaningfulChange,
      newReview,
      discovery,
      opportunity,
      maxSequence: facts.unseen.maxSequence,
      diagnosticTrigger,
    });
  }
}
