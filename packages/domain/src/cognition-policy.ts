import { inventionPermission } from './invention-policy.js';
import { draftWorld, cloneValue } from './draft.js';
import { finish, outcome } from './events.js';
import type { Transition, WorldState } from './types.js';
export interface CognitionPolicy {
  dream: { statusEffectId: string; afterSeconds: number };
  version: 1;
  revision: number;
  maxImmediateLevel: 2 | 3 | 4;
  significantEventTypes: string[];
  reflection: boolean;
}
export const DEFAULT_COGNITION_POLICY: CognitionPolicy = {
  dream: { statusEffectId: 'wilderness:restorative-rest', afterSeconds: 7200 },
  version: 1,
  revision: 1,
  maxImmediateLevel: 4,
  significantEventTypes: ['death', 'animal-died', 'incapacitated', 'taught'],
  reflection: true,
};
export function admitCognitionPolicy(
  input: WorldState,
  proposed: unknown,
  expectedRevision: number,
): Transition {
  const reject = () => ({
    world: input,
    events: [],
    outcome: outcome(false, 'policy-rejected', 'Unsupported or stale cognition policy.'),
  });
  if (!proposed || typeof proposed !== 'object' || Array.isArray(proposed)) return reject();
  const p = proposed as CognitionPolicy;
  if (
    Object.keys(p).sort().join(',') !==
      'dream,maxImmediateLevel,reflection,revision,significantEventTypes,version' ||
    !p.dream ||
    Object.keys(p.dream).sort().join() !== 'afterSeconds,statusEffectId' ||
    !input.statusEffectPolicy.definitions.some((d) => d.id === p.dream.statusEffectId) ||
    !Number.isFinite(p.dream.afterSeconds) ||
    p.dream.afterSeconds <= 0 ||
    p.version !== 1 ||
    p.revision !== expectedRevision + 1 ||
    (input.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).revision !== expectedRevision ||
    ![2, 3, 4].includes(p.maxImmediateLevel) ||
    typeof p.reflection !== 'boolean' ||
    !Array.isArray(p.significantEventTypes) ||
    p.significantEventTypes.some((t) => typeof t !== 'string' || !/^[a-z-]{1,64}$/.test(t))
  )
    return reject();
  const permission = inventionPermission(input, {
    origin: 'player',
    policyRevision: input.inventionPolicy.revision,
  });
  if (!permission.ok) return { world: input, events: [], outcome: permission };
  const world = draftWorld(input);
  world.cognitionPolicy = cloneValue(p);
  return finish(
    world,
    [],
    outcome(
      true,
      'policy-admitted',
      'Cognition policy accepted; native hazards and spending limits remain authoritative.',
    ),
  );
}

export function dreamPolicy(world: WorldState): CognitionPolicy['dream'] {
  return (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).dream;
}
export function dreamStatus(
  world: WorldState,
  entity: import('./types.js').Entity | undefined,
): import('./status-effects.js').StatusEffectInstance | undefined {
  const state = entity?.statusEffects?.[dreamPolicy(world).statusEffectId];
  return state?.active ? state : undefined;
}
