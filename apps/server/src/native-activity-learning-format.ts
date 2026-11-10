import {
  activityLearningDescription,
  activityLearningFailureDescription,
  formatSharedNativeActivityName,
  type ActivityOccurrence,
  type OrdinaryActivityNameInput,
  type WorldState,
} from '@open-legend/domain';
import type { NativeGeometryQueries } from '@open-legend/native-simulation';

export interface NativeActivityLearningFormatRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly profile: WorldState['profile'];
  readonly input:
    | { readonly kind: 'names'; readonly entries: readonly (OrdinaryActivityNameInput | null)[] }
    | {
        readonly kind: 'descriptions';
        readonly entries: readonly {
          readonly name: string;
          readonly entries: readonly Pick<ActivityOccurrence, 'parentId' | 'parentName' | 'view'>[];
          readonly incomplete: boolean;
          readonly failures: readonly ActivityOccurrence['view'][];
        }[];
      };
}
/** Pure finite wording only. It receives no world, selectors or mutation port. */
export function nativeActivityLearningFormat(request: NativeActivityLearningFormatRequest) {
  return {
    binding: request.binding,
    texts:
      request.input.kind === 'names'
        ? request.input.entries.map((entry) =>
            entry ? formatSharedNativeActivityName(request.profile, entry) : null,
          )
        : request.input.entries.map(
            (entry) =>
              activityLearningDescription(entry.name, entry.entries, entry.incomplete) +
              activityLearningFailureDescription(entry.failures),
          ),
  };
}
