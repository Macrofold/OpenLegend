import { inventionPermission } from './invention-policy.js';
import { draftWorld, cloneValue } from './draft.js';
import { finish, outcome } from './events.js';
import type { Transition, WorldState } from './types.js';
export interface CognitionPolicy {
  version: 1;
  revision: number;
  maxImmediateLevel: 2 | 3 | 4;
  significantEventTypes: string[];
  reflection: boolean;
  cooldownSeconds: number;
}
export const DEFAULT_COGNITION_POLICY: CognitionPolicy = {
  version: 1,
  revision: 1,
  maxImmediateLevel: 4,
  significantEventTypes: ['death', 'animal-died', 'incapacitated', 'taught'],
  reflection: true,
  cooldownSeconds: 45,
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
      'cooldownSeconds,maxImmediateLevel,reflection,revision,significantEventTypes,version' ||
    p.version !== 1 ||
    p.revision !== expectedRevision + 1 ||
    (input.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).revision !== expectedRevision ||
    ![2, 3, 4].includes(p.maxImmediateLevel) ||
    typeof p.reflection !== 'boolean' ||
    !Number.isFinite(p.cooldownSeconds) ||
    p.cooldownSeconds < 15 ||
    p.cooldownSeconds > 3600 ||
    !Array.isArray(p.significantEventTypes) ||
    p.significantEventTypes.length > 16 ||
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
