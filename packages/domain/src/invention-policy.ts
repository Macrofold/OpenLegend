import { draftWorld } from './draft.js';
import { finish, outcome } from './events.js';
import type { Outcome, Transition, WorldState } from './types.js';

export type InventionOrigin = 'player' | 'agent';
export interface InventionAuthority {
  origin: InventionOrigin;
  policyRevision: number;
}
export interface InventionPolicy {
  revision: number;
  playerLocked: boolean;
  agentLocked: boolean;
  lastPlayerLock: number;
  lastAgentLock: number;
  changedAt: number;
  changedBy: string;
  reason: string;
}
export function initialInventionPolicy(): InventionPolicy {
  return {
    revision: 1,
    playerLocked: false,
    agentLocked: true,
    lastPlayerLock: 0,
    lastAgentLock: 1,
    changedAt: 0,
    changedBy: 'world-initialization',
    reason: 'Player invention open; autonomous invention locked.',
  };
}

export function validateInventionPolicy(p: InventionPolicy): void {
  if (
    !p ||
    !Number.isSafeInteger(p.revision) ||
    p.revision < 1 ||
    typeof p.playerLocked !== 'boolean' ||
    typeof p.agentLocked !== 'boolean' ||
    !Number.isSafeInteger(p.lastPlayerLock) ||
    p.lastPlayerLock < 0 ||
    p.lastPlayerLock > p.revision ||
    !Number.isSafeInteger(p.lastAgentLock) ||
    p.lastAgentLock < 0 ||
    p.lastAgentLock > p.revision ||
    (p.playerLocked && p.lastPlayerLock === 0) ||
    (p.agentLocked && p.lastAgentLock === 0) ||
    !Number.isFinite(p.changedAt) ||
    p.changedAt < 0 ||
    typeof p.changedBy !== 'string' ||
    !p.changedBy.trim() ||
    p.changedBy.length > 100 ||
    typeof p.reason !== 'string' ||
    !p.reason.trim() ||
    p.reason.length > 500
  )
    throw new Error('Invalid or missing invention policy; incompatible development save.');
}

/** Origin is established by the application, never by model output or browser JSON.
 * Per-origin lock watermarks prevent reopen from reviving work without coupling the locks.
 * archive/03-design-proposals/invention-governance-and-ownership.md#open-and-locked-invention
 */
export function inventionPermission(
  world: WorldState,
  authority: InventionAuthority | undefined,
): Outcome {
  const p = world.inventionPolicy;
  if (
    !authority ||
    !['player', 'agent'].includes(authority.origin) ||
    !Number.isSafeInteger(authority.policyRevision) ||
    authority.policyRevision < 1 ||
    authority.policyRevision > p.revision
  )
    return outcome(
      false,
      'invention-authority',
      'A current server-established invention origin is required.',
    );
  const player = authority.origin === 'player';
  if (player ? p.playerLocked : p.agentLocked)
    return outcome(
      false,
      'invention-locked',
      `${player ? 'Player' : 'Agent'} invention is locked. Existing actions, crafts and learning remain available.`,
    );
  if (authority.policyRevision < (player ? p.lastPlayerLock : p.lastAgentLock))
    return outcome(
      false,
      'invention-revoked',
      'This invention request was revoked by a lock change. Start a new request.',
    );
  return outcome(true, 'invention-permitted', 'Invention policy permits this request.');
}

export function changeInventionPolicy(
  input: WorldState,
  expectedRevision: number,
  settings: { playerLocked: boolean; agentLocked: boolean },
  principal: string,
  reason: string,
): Transition {
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'policy-rejected', message),
  });
  const p = input.inventionPolicy;
  if (p.revision !== expectedRevision || p.revision === Number.MAX_SAFE_INTEGER)
    return reject('Invention settings changed; refresh before saving.');
  if (typeof settings.playerLocked !== 'boolean' || typeof settings.agentLocked !== 'boolean')
    return reject('Both independent lock settings are required.');
  if (p.playerLocked === settings.playerLocked && p.agentLocked === settings.agentLocked)
    return {
      world: input,
      events: [],
      outcome: outcome(true, 'policy-unchanged', 'Invention settings are unchanged.'),
    };
  const next: InventionPolicy = {
    ...p,
    playerLocked: settings.playerLocked,
    agentLocked: settings.agentLocked,
    revision: p.revision + 1,
    lastPlayerLock: settings.playerLocked && !p.playerLocked ? p.revision + 1 : p.lastPlayerLock,
    lastAgentLock: settings.agentLocked && !p.agentLocked ? p.revision + 1 : p.lastAgentLock,
    changedAt: input.simTime,
    changedBy: principal,
    reason,
  };
  try {
    validateInventionPolicy(next);
  } catch {
    return reject('A bounded principal and audit reason are required.');
  }
  const world = draftWorld(input);
  world.inventionPolicy = next;
  return finish(
    world,
    [],
    outcome(true, 'policy-admitted', 'Invention settings saved. Existing mechanics continue.'),
  );
}
