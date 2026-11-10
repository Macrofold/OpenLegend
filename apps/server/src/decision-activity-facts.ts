import type { ActivityRequestChoice, ActivityRequestDescriptor } from '@open-legend/domain';

export interface DecisionActivityRead {
  readonly simTime: number;
  readonly outing: string;
  readonly requests: readonly ActivityRequestDescriptor[];
  readonly available: {
    readonly choices: readonly ActivityRequestChoice[];
    readonly warnings: readonly string[];
  };
  readonly inspectedContainer?: {
    readonly entityId: string;
    readonly name: string;
    readonly revision: number;
    readonly load?: number;
    readonly capacity?: number;
    readonly more: boolean;
    readonly items: readonly {
      readonly entityId: string;
      readonly definitionId: string;
      readonly name: string;
      readonly quantity: number;
      readonly revision?: number;
    }[];
  };
}

/** Choice eligibility and wording come from the selected world's actual read
 * owner. Formatting roles supplies neither a command nor execution permission. */
export function decisionActivityFactsFromRead(input: DecisionActivityRead) {
  return {
    simTime: input.simTime,
    outing: input.outing,
    activityRequests: {
      requests: input.requests,
      choices: input.available.choices.map(({ id, kind, ...choice }) => ({
        ...choice,
        kind,
        ...(kind === 'entity' ? { entityId: id } : { definitionId: id }),
      })),
      warnings: input.available.warnings,
    },
    ...(input.inspectedContainer ? { inspectedContainer: input.inspectedContainer } : {}),
  };
}
