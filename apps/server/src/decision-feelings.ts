import {
  person,
  presentVerb,
  renderNarrationParts,
  subjectNarration,
  type AppraisalView,
} from '@open-legend/domain';
import type { Named } from '@open-legend/language';

/** Selected private interpretation and installed display laws. Names belong to
 * this observer's captured naming scope, never a canonical-person fallback. */
export interface DecisionFeeling extends AppraisalView {
  readonly scale?: { readonly min: number; readonly max: number };
  readonly decayPerHour?: number;
}

export function formatDecisionFeelings(
  actorId: string,
  values: readonly DecisionFeeling[],
  names: ReadonlyMap<string, Named>,
): string {
  return values
    .map((value) => {
      const amount =
        value.value.kind === 'scaled' && value.scale
          ? `; current intensity ${value.value.value} on the installed ${value.scale.min}–${value.scale.max} scale`
          : '';
      const duration =
        value.decayPerHour !== undefined
          ? `decays by ${value.decayPerHour} per game hour without a new interpretation`
          : value.lifetime;
      return renderNarrationParts(
        subjectNarration(actorId, [
          presentVerb(actorId, 'feel'),
          ` ${value.feeling}`,
          ...(value.targetId && names.has(value.targetId)
            ? [
                ' concerning ',
                person(value.targetId, value.targetId === actorId ? 'reflexive' : 'object'),
              ]
            : []),
          `${amount}. Source: ${value.coverage}; lifetime: ${duration}.`,
        ]),
        { names, selfId: actorId },
        'first',
      );
    })
    .join(' ');
}
