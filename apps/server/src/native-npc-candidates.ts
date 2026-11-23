import activityLearningCopy from '../../../packages/domain/src/activity-learning-copy.json' with { type: 'json' };
import { namePhrase } from '@open-legend/language';
import {
  decisionOfferDescription,
  formatObservedBodyHealth,
  guardChoiceLabel,
  guardDescription,
  type ActivityView,
  type Outcome,
  type ProspectiveWork,
  type WorkTransitionMode,
  type WorldState,
  WORK_TRANSITION_AVAILABLE_MESSAGE,
} from '@open-legend/domain';
import type { NativeActorPerception, NativeActorSelf } from './native-perception.js';
import { formatCandidateDetails, formatCandidateTemporary } from './candidate-description.js';
import { retainNativeSources } from './native-consumer.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import type { DecisionActivityRead } from './decision-activity-facts.js';
import {
  formatRemainingActivity,
  formatPausedWork,
  formatDecisionWorkHandling,
} from './decision-work-context.js';

export type NativeNpcOfferMeaning =
  | { readonly kind: 'activities' | 'inspection' }
  | { readonly kind: 'activity-page'; readonly page: 'history' | 'methods' }
  | {
      readonly kind: 'continuation';
      readonly actionType: string | null;
      readonly planPending: boolean;
    }
  | { readonly kind: 'follow'; readonly body: number }
  | {
      readonly kind: 'status';
      readonly body: number | null;
      readonly definition: number;
      readonly active: boolean;
    }
  | {
      readonly kind: 'approach';
      readonly body: number;
      readonly distance: number;
      readonly reach: number;
    }
  | { readonly kind: 'probe'; readonly probe: number }
  | { readonly kind: 'fish' | 'cook' | 'fire-care' | 'handover'; readonly body: number }
  | {
      readonly kind: 'guard';
      readonly body: number;
      readonly tool: {
        readonly label: string;
        readonly shield: string;
        readonly equipment: string;
        readonly preparation: number;
        readonly ready: number;
        readonly reduction: number;
        readonly coverage: number;
        readonly recovery: number;
      };
    }
  | {
      readonly kind: 'strike';
      readonly body: number;
      readonly definition: number;
      readonly hunting: boolean;
    };

/** Native origin owns executable commands. The bridge supplies presence for
 * wording and retains ordinal identity for selection inside that owner. */
export interface NativeNpcCandidates {
  readonly activity: Omit<DecisionActivityRead, 'simTime' | 'requests'>;
  readonly offers: readonly {
    readonly description: string;
    readonly id: string;
    readonly meaning: NativeNpcOfferMeaning;
    readonly hasCommand: boolean;
    readonly transition: WorkTransitionMode;
    readonly temporary?: Outcome;
    readonly nextAt?: number;
  }[];
  readonly bodyOrdinals: readonly number[];
  readonly visibleBodyOrdinals: readonly number[];
  readonly work: ProspectiveWork['expected'];
  readonly workContext: {
    readonly lostWorkSeconds: number;
    readonly spentInputs: readonly { readonly definitionId: string; readonly quantity: number }[];
    readonly hasPlan: boolean;
    readonly combatUntil: number;
    readonly evadeUntil: number;
    readonly suspensionProblem: Outcome | null;
    readonly plan: NativeRemainingPlan | null;
    readonly suspended: NativeRemainingPlan | null;
  };
}
export interface NativeRemainingPlan {
  readonly status: 'active' | 'blocked' | 'completed' | 'cancelled';
  readonly paused: boolean;
  readonly views: readonly ActivityView[];
}

/** The native capture owns all physical work facts and pause admission. The
 * selected immutable definitions supply only material labels for formatting. */
export function nativeNpcWorkContext(
  candidates: NativeNpcCandidates,
  definitions: NativeDefinitionCapture,
) {
  const facts = candidates.workContext,
    installed = definitions.facts;
  const remaining = (plan: NativeRemainingPlan | null) =>
    formatRemainingActivity(
      plan
        ? {
            status: plan.status,
            paused: plan.paused,
            view: { facts: [], children: [...plan.views] },
          }
        : null,
    );
  const choices = (['continue', 'replace', 'interrupt'] as const).map((handling) => {
    const ending = handling === 'replace' || handling === 'interrupt';
    return formatDecisionWorkHandling({
      handling,
      outcome:
        handling === 'interrupt' && facts.suspensionProblem
          ? facts.suspensionProblem
          : { ok: true, message: WORK_TRANSITION_AVAILABLE_MESSAGE },
      lostWorkSeconds: ending ? facts.lostWorkSeconds : 0,
      spentInputs: ending
        ? facts.spentInputs.map((input) => ({
            material:
              installed.definitions.itemDefinitions[input.definitionId]?.name ?? 'Unknown material',
            quantity: input.quantity,
          }))
        : [],
      pausedWork:
        handling === 'replace'
          ? 'discarded'
          : handling === 'interrupt' && facts.hasPlan
            ? 'restart-current-step'
            : 'unchanged',
      recovery: { combatUntil: facts.combatUntil, evadeUntil: facts.evadeUntil },
    });
  });
  return retainNativeSources(
    {
      plan: remaining(facts.plan),
      paused: formatPausedWork(facts.suspended ? remaining(facts.suspended) : null),
      choicesForCurrentWork: choices,
    },
    candidates,
    installed,
  );
}
export interface NativeNpcCandidateDefinitions {
  readonly statusEffectPolicy: WorldState['statusEffectPolicy'];
  readonly nativeStrikes: WorldState['nativeStrikes'];
  readonly probes: readonly { readonly direction: string }[];
}
export interface NativeFormattedNpcOffer {
  readonly ordinal: number;
  readonly id: string;
  readonly description: string;
  readonly firstActionDescription?: string;
  readonly subjectIds?: readonly string[];
  readonly transition: WorkTransitionMode;
}

/** The actual candidate owner supplies only these measured/current facts.
 * This formatter receives no command, source permission map or writable world. */
export interface NativeNpcDescriptionRead {
  readonly self: {
    readonly name: NativeActorSelf['observerName'];
    readonly position: Pick<NativeActorSelf['position'], 'x' | 'y' | 'z'>;
    readonly hasAction: boolean;
    readonly health: Parameters<typeof formatObservedBodyHealth>[0] | null;
  };
  readonly bodies: readonly {
    readonly ordinal: number;
    readonly sourceId: string;
    readonly name: NativeActorSelf['observerName'];
    readonly position?: Pick<NativeActorSelf['position'], 'x' | 'y' | 'z'> | null;
    readonly visible: boolean;
    readonly health: Parameters<typeof formatObservedBodyHealth>[0] | null;
  }[];
  readonly offers: readonly {
    readonly description?: string;
    readonly id: string;
    readonly meaning: NativeNpcOfferMeaning;
    readonly transition: WorkTransitionMode;
    readonly hasCommand: boolean;
    readonly temporary?: Outcome;
    readonly nextAt?: number;
  }[];
  readonly definitions: NativeNpcCandidateDefinitions;
}

/** Existing complete-capture caller and the finite native provider use the same
 * Source description path. Their actual owners retain the formatted product. */
export function nativeNpcCandidateDescriptions(
  self: NativeActorSelf,
  perception: NativeActorPerception,
  candidates: NativeNpcCandidates,
  definitions: NativeNpcCandidateDefinitions,
): readonly NativeFormattedNpcOffer[] {
  const visible = new Set(candidates.visibleBodyOrdinals);
  return retainNativeSources(
    formatNativeNpcCandidateDescriptions({
      self: {
        name: self.observerName,
        position: self.position,
        hasAction: !!self.action,
        health: self.attributes.find((attribute) => attribute.bodyHealth),
      },
      bodies: perception.bodies.map((binding, ordinal) => {
        const facets = perception.cut.current.slice(binding.first, binding.first + binding.count);
        const body = facets.find((facet) => facet.value.kind === 'body')?.value;
        return {
          ordinal,
          sourceId: binding.sourceId,
          name: binding.name,
          visible: visible.has(ordinal),
          ...(body?.kind === 'body' ? { position: body.body.position } : {}),
          health: facets
            .flatMap((facet) =>
              facet.value.kind === 'public-attributes' ? facet.value.attributes : [],
            )
            .find((attribute) => attribute.bodyHealth),
        };
      }),
      offers: candidates.offers,
      definitions,
    }),
    candidates,
  );
}

export function formatNativeNpcCandidateDescriptions(
  read: NativeNpcDescriptionRead,
): readonly NativeFormattedNpcOffer[] {
  const definitions = read.definitions;
  const strikes = Object.values(definitions.nativeStrikes ?? {});
  const bodies = new Map(read.bodies.map((body) => [body.ordinal, body]));
  const body = (ordinal: number) => {
    const value = bodies.get(ordinal);
    if (!value) throw new Error('The native choice has no captured body.');
    return value;
  };
  const targetDetails = (ordinal: number | null) => {
    if (ordinal === null)
      return {
        description: namePhrase(read.self.name),
        health: formatObservedBodyHealth(read.self.health ?? undefined),
        distance: 0,
      };
    const target = body(ordinal);
    if (!target.visible) return;
    if (!target.position) throw new Error('The native choice body value is unavailable.');
    return {
      description: namePhrase(target.name),
      health: formatObservedBodyHealth(target.health ?? undefined),
      distance: Math.hypot(
        read.self.position.x - target.position.x,
        read.self.position.y - target.position.y,
        read.self.position.z - target.position.z,
      ),
    };
  };
  return read.offers.map((offer, ordinal) => {
    const meaning = offer.meaning;
    let base: { description: string; firstActionDescription?: string };
    let target: ReturnType<typeof targetDetails>;
    let subjectIds: readonly string[] | undefined;
    switch (meaning.kind) {
      case 'activities':
      case 'inspection':
        base = decisionOfferDescription({ kind: meaning.kind });
        break;
      case 'activity-page':
        base = {
          description:
            meaning.page === 'history'
              ? activityLearningCopy.inspection.nextHistory
              : activityLearningCopy.inspection.nextMethods,
        };
        break;
      case 'continuation':
        base = decisionOfferDescription({
          kind: 'continuation',
          actionType: meaning.actionType ?? undefined,
          planPending: meaning.planPending,
        });
        break;
      case 'follow':
        base = decisionOfferDescription({ kind: 'follow', target: body(meaning.body).name });
        target = targetDetails(meaning.body);
        break;
      case 'status': {
        const definition = definitions.statusEffectPolicy.definitions[meaning.definition];
        if (!definition?.actions)
          throw new Error('The native status choice definition is unavailable.');
        base = decisionOfferDescription({
          kind: 'status',
          label: meaning.active ? definition.actions.deactivate : definition.actions.activate,
          ...(meaning.body === null ? {} : { targetName: body(meaning.body).name.name }),
        });
        target = targetDetails(meaning.body);
        break;
      }
      case 'approach':
        base = decisionOfferDescription({
          kind: 'approach',
          targetDescription: namePhrase(body(meaning.body).name, 'definite'),
          distance: meaning.distance.toFixed(1),
          reach: meaning.reach,
        });
        subjectIds = [body(meaning.body).sourceId];
        break;
      case 'probe': {
        const probe = definitions.probes[meaning.probe];
        if (!probe) throw new Error('The native movement probe is unavailable.');
        base = decisionOfferDescription({ kind: 'probe', direction: probe.direction });
        break;
      }
      case 'guard': {
        const tool = meaning.tool;
        const observed = body(meaning.body);
        const firstActionDescription = guardChoiceLabel(
          tool.shield,
          observed.name.name,
          tool.label,
        );
        const equip = tool.equipment ? `${tool.equipment} ` : '';
        const detail = guardDescription({
          preparationSeconds: tool.preparation,
          readySeconds: tool.ready,
          coverageDegrees: tool.coverage,
          reduction: tool.reduction,
          recoverySeconds: tool.recovery,
        });
        base = {
          firstActionDescription,
          description: `${equip}${firstActionDescription}. ${detail}`,
        };
        subjectIds = [observed.sourceId];
        break;
      }
      case 'strike': {
        const definition = strikes[meaning.definition];
        if (!definition) throw new Error('The native strike choice definition is unavailable.');
        base = decisionOfferDescription({
          kind: 'natural-strike',
          target: body(meaning.body).name,
          definition,
          hunting: meaning.hunting,
        });
        target = targetDetails(meaning.body);
        break;
      }
      case 'handover':
        return {
          ordinal,
          id: offer.id,
          description: offer.description ?? '',
          subjectIds: [body(meaning.body).sourceId],
          transition: offer.transition,
        };
      case 'fish':
      case 'cook':
      case 'fire-care':
        subjectIds = [body(meaning.body).sourceId];
        // An already prepared choice includes the exact native text and the
        // common details. A formatter request asks only for those details.
        if (offer.description !== undefined)
          return {
            ordinal,
            id: offer.id,
            description: offer.description,
            subjectIds,
            transition: offer.transition,
          };
        base = { description: '' };
        target = targetDetails(meaning.body);
        break;
    }
    const description = offer.temporary
      ? formatCandidateTemporary(base.description, {
          message: offer.temporary.message,
          ...(offer.nextAt === undefined ? {} : { nextAt: offer.nextAt }),
        })
      : base.description;
    return {
      ordinal,
      id: offer.id,
      ...(base.firstActionDescription
        ? { firstActionDescription: base.firstActionDescription }
        : {}),
      ...(subjectIds ? { subjectIds } : {}),
      transition: offer.transition,
      description: formatCandidateDetails(
        description,
        offer.transition,
        read.self.hasAction && offer.hasCommand,
        undefined,
        target,
      ),
    };
  });
}
