import { initializeAppraisalWork, ownsAppraisalWork } from './appraisals.js';
import { canonicalJson, contentLabel } from './events.js';
import { isDraft, original } from 'immer';
import { worldRootEntities } from './entity-index.js';
import {
  admitWork,
  advanceWorkInterval,
  chargeInvocation,
  multiplyWork,
  addWork,
  requireWork,
  WORK_LIMITS,
  type WorkDemand,
} from './work-budget.js';
import type {
  StatusCondition,
  StatusEffectDefinition,
  StatusEffectPolicy,
  StatusEffectInstance,
} from './status-effects.js';
import type { Entity, WorldState } from './types.js';

function conditionCost(condition: StatusCondition | undefined): number {
  if (!condition) return 0;
  return (
    1 +
    ('all' in condition ? condition.all : 'any' in condition ? condition.any : []).reduce(
      (sum, child) => sum + conditionCost(child),
      0,
    )
  );
}
const costs = new WeakMap<StatusEffectDefinition, WorkDemand>();
/** This native family has no generated child calls: selectors bind exactly three
 * explicit entities, and condition groups are finite validated trees. */
export function statusWork(definition: StatusEffectDefinition): WorkDemand {
  const value = isDraft(definition) ? original(definition)! : definition;
  const prior = Object.isFrozen(value) ? costs.get(value) : undefined;
  if (prior) return prior;
  const result = {
    tests:
      4 +
      conditionCost(value.requires) +
      conditionCost(value.activationCondition) +
      conditionCost(value.automaticActivation) +
      2 * conditionCost(value.automaticDeactivation) +
      value.whileActive.reduce(
        (sum, op) => sum + ('when' in op ? conditionCost(op.when) : 0) + 1,
        0,
      ),
    effects: value.whileActive.length + 2,
    retainedBytes: JSON.stringify(value).length * 3 + 1024,
    depth: 1,
  };
  if (Object.isFrozen(value)) costs.set(value, result);
  return result;
}
/** Rechecked at activation as well as candidate validation; library artifacts do not
 * reserve live slots. No definition-count quota substitutes for combined real work. */
export function validateStatusInstallation(world: WorldState, policy: StatusEffectPolicy): void {
  let combined = addWork({}, {});
  // These are installed interfaces, not the inactive invention/item library. Cost
  // composes with statuses so splitting one workload between families cannot evade it.
  const manifest = world.moduleManifest;
  const interfaces =
    manifest.definitions.length +
    manifest.senses.length +
    (manifest.appraisals?.definitions.length ?? 0);
  combined = addWork(combined, {
    tests: interfaces,
    subscriptions: interfaces,
    retainedBytes: JSON.stringify(manifest).length * 3,
  });
  for (const definition of policy.definitions)
    if (definition.enabled) {
      const cost = statusWork(definition);
      combined = addWork(combined, { ...cost, subscriptions: 1 });
    }
  requireWork(combined, WORK_LIMITS.module);
  const roots = worldRootEntities(world).length;
  requireWork(
    multiplyWork(
      { tests: combined.tests, effects: combined.effects, subscriptions: combined.subscriptions },
      roots,
    ),
    WORK_LIMITS.group,
  );
}
const installedFootprints = new WeakMap<object, WeakMap<object, WorkDemand>>();
/** Passive native interfaces are resident host work too, even before an episode
 * allocates live state. Library item/recipe artifacts are not installed interfaces. */
export function installedWorkAllocation(world: WorldState): WorkDemand {
  const manifest = world.moduleManifest,
    policy = world.statusEffectPolicy;
  const immutable =
    !isDraft(manifest) && !isDraft(policy) && Object.isFrozen(manifest) && Object.isFrozen(policy);
  let interfaces = immutable ? installedFootprints.get(manifest)?.get(policy) : undefined;
  if (!interfaces) {
    interfaces = {
      retainedBytes: JSON.stringify(manifest).length * 3,
      subscriptions:
        manifest.definitions.length +
        manifest.senses.length +
        (manifest.appraisals?.definitions.length ?? 0),
    };
    for (const definition of policy.definitions)
      if (definition.enabled)
        interfaces = addWork(interfaces, {
          retainedBytes: statusWork(definition).retainedBytes,
          subscriptions: 1,
        });
    if (immutable) {
      let policies = installedFootprints.get(manifest);
      if (!policies) installedFootprints.set(manifest, (policies = new WeakMap()));
      policies.set(policy, interfaces);
    }
  }
  return {
    retainedBytes: interfaces.retainedBytes,
    subscriptions: interfaces.subscriptions! * worldRootEntities(world).length,
  };
}
export function admitStatusWork(
  world: WorldState,
  entity: Entity,
  definition: StatusEffectDefinition,
  episode: string,
): void {
  const cost = statusWork(definition);
  // Existing public native advancement accepts subsecond samples. Its operational
  // allowance permits 1024 samples per simulated second without changing their order
  // or rates. The ordinary server clock advances at one sample per second.
  const limit = multiplyWork({ tests: cost.tests, effects: cost.effects, depth: 1 }, 1024);
  admitWork(world, {
    id: episode,
    actorId: entity.id,
    moduleId: definition.id,
    definitionPin: {
      id: definition.id,
      version: 1,
      digest: contentLabel(canonicalJson(definition)),
    },
    limit,
    allocation: { live: 1, retainedBytes: cost.retainedBytes, subscriptions: 1 },
    recurrence: { intervalSeconds: 1, burst: 1024 },
  });
}
export function chargeStatusWork(
  world: WorldState,
  entity: Entity,
  definition: StatusEffectDefinition,
  state: StatusEffectInstance,
): void {
  if (!world.workState?.invocations[state.episode])
    admitStatusWork(world, entity, definition, state.episode);
  advanceWorkInterval(world, state.episode);
  const cost = statusWork(definition);
  chargeInvocation(world, state.episode, { tests: cost.tests, effects: cost.effects });
}

/** Startup/restore initializes only absent allocations for existing native episodes.
 * Existing interval progress is retained, so reload cannot refill a live root. */
export function initializeNativeWork(world: WorldState): void {
  initializeAppraisalWork(world);
  const definitions = new Map(
    world.statusEffectPolicy.definitions.map((definition) => [definition.id, definition]),
  );
  for (const entity of Object.values(world.entities))
    for (const [id, state] of Object.entries(entity.statusEffects ?? {})) {
      if (!state.active) continue;
      const definition = definitions.get(state.contribution?.definitionId ?? id);
      if (!definition) throw new Error('Saved work has no installed definition.');
      admitStatusWork(world, entity, definition, state.episode);
    }
}
export function validateNativeWork(world: WorldState): void {
  const definitions = new Map(
    world.statusEffectPolicy.definitions.map((definition) => [definition.id, definition]),
  );
  const episodes = new Map<string, Set<string>>();
  for (const invocation of Object.values(world.workState?.invocations ?? {})) {
    if (invocation.parentId) continue;
    if (ownsAppraisalWork(world, invocation.id, invocation.actorId, invocation.definitionPin))
      continue;
    const entity = world.entities[invocation.actorId];
    let active = episodes.get(invocation.actorId);
    if (!active) {
      active = new Set(
        Object.values(entity?.statusEffects ?? {})
          .filter((value) => value.active)
          .map((value) => value.episode),
      );
      episodes.set(invocation.actorId, active);
    }
    const definition = definitions.get(invocation.moduleId);
    const owner = Object.entries(entity?.statusEffects ?? {}).find(
      ([, value]) => value.active && value.episode === invocation.id,
    );
    if (
      !active.has(invocation.id) ||
      !owner ||
      (owner[1].contribution?.definitionId ?? owner[0]) !== invocation.moduleId ||
      !definition ||
      invocation.definitionPin.id !== definition.id ||
      invocation.definitionPin.version !== 1 ||
      invocation.definitionPin.digest !== contentLabel(canonicalJson(definition))
    )
      throw new Error('Saved native work has an unavailable owner or definition pin.');
  }
}
