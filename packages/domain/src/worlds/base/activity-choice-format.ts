import { namePhrase, type Named } from '@open-legend/language';
import type { ActivityRequestChoice } from '../../activity-hosts.js';

export const BASE_CAMP_CHOICE_READ = {
  maximumVisible: 32,
  ownLabel: 'My accessible possessions',
  visibleWarning: 'Some visible choices are omitted. Select or inspect a narrower target.',
} as const;

export type BaseActivityChoiceLabel =
  | { readonly kind: 'camp-own' }
  | { readonly kind: 'hands'; readonly label: string }
  | { readonly kind: 'person'; readonly name: Named };

/** Actual choice eligibility is supplied by the world owner. This formatter
 * only names that selected row and is shared with detached native preparation. */
export function baseActivityChoiceLabel(input: BaseActivityChoiceLabel): string {
  switch (input.kind) {
    case 'camp-own':
      return BASE_CAMP_CHOICE_READ.ownLabel;
    case 'hands':
      return input.label;
    case 'person':
      return namePhrase(input.name, 'definite');
  }
}
export function baseCampOwnSupplyChoice(actorId: string, requestId: string): ActivityRequestChoice {
  return {
    id: actorId,
    label: baseActivityChoiceLabel({ kind: 'camp-own' }),
    kind: 'entity',
    roles: ['sourceId'],
    requestIds: [requestId],
    distance: 0,
    accessible: true,
  };
}
export function baseWorkHandsChoice(
  actorId: string,
  requestId: string,
  label: string,
): ActivityRequestChoice {
  return {
    id: actorId,
    label: baseActivityChoiceLabel({ kind: 'hands', label }),
    kind: 'entity',
    roles: ['instrumentId'],
    requestIds: [requestId],
    accessible: true,
  };
}
export function baseOutingChoice(
  id: string,
  requestId: string,
  role: string,
  name: Named,
): ActivityRequestChoice {
  return {
    id,
    label: baseActivityChoiceLabel({ kind: 'person', name }),
    kind: 'entity',
    roles: [role],
    requestIds: [requestId],
    accessible: true,
  };
}
