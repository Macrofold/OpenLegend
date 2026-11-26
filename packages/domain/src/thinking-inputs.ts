import { bodyPolicy } from './body-policy.js';
import { statusDefinitions } from './status-capabilities.js';
import {
  bodyPolicyConditions,
  statusDefinitionConditions,
  visitStatusCondition,
} from './status-condition-references.js';
import type { WorldState } from './types.js';

interface ClockInputs {
  boundaries: number[];
  external: boolean;
}
const clocks = new WeakMap<object, { statuses: object; value: ClockInputs }>();
function clockInputs(world: WorldState): ClockInputs {
  const definitions = statusDefinitions(world),
    manifest = world.moduleManifest;
  const prior =
    Object.isFrozen(manifest) && Object.isFrozen(definitions) ? clocks.get(manifest) : undefined;
  if (prior?.statuses === definitions) return prior.value;
  const boundaries = new Set<number>();
  let external = false;
  const conditions = [
    ...bodyPolicyConditions(bodyPolicy(world)),
    ...definitions.flatMap(statusDefinitionConditions),
  ];
  for (const { condition, sourcePath } of conditions)
    visitStatusCondition(condition, sourcePath, (part) => {
      if ('dailyWindow' in part) {
        boundaries.add(part.dailyWindow.start);
        boundaries.add(part.dailyWindow.end);
      } else {
        const target =
          'compare' in part
            ? part.compare.target
            : 'field' in part
              ? part.field.target
              : 'hasAttribute' in part
                ? part.hasAttribute.target
                : 'statusActive' in part
                  ? part.statusActive.target
                  : undefined;
        if (target && target !== '$subject') external = true;
      }
    });
  const value = { boundaries: [...boundaries], external };
  if (Object.isFrozen(manifest) && Object.isFrozen(definitions))
    clocks.set(manifest, { statuses: definitions, value });
  return value;
}
/** Elapsed values belong to actual native arithmetic participants. Clock crossings
 * use the installed condition language, never a recurring cognition timer.
 * Unknown cross-body conditions keep conservative complete predicate coverage. */
export function nativeThinkingTimeChanges(
  before: WorldState,
  after: WorldState,
): Set<string> | undefined {
  const inputs = clockInputs(after);
  if (inputs.external) return;
  if (before.simTime !== after.simTime) {
    const offset = after.statusEffectPolicy.clockOffsetHours;
    if (
      inputs.boundaries.some(
        (boundary) =>
          Math.floor((before.simTime / 3600 + offset - boundary) / 24) !==
          Math.floor((after.simTime / 3600 + offset - boundary) / 24),
      )
    )
      return;
  }
  if (before.pendingNativeIntegration === after.pendingNativeIntegration) return new Set();
  return new Set([
    ...Object.keys(before.pendingNativeIntegration?.byEntity ?? {}),
    ...Object.keys(after.pendingNativeIntegration?.byEntity ?? {}),
  ]);
}
