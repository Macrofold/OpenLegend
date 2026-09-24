from pathlib import Path

def edit(path, old, new, count=1):
    p=Path(path); s=p.read_text()
    if old not in s:
        if new in s: return
        raise RuntimeError(f'Missing expected source in {path}: {old[:100]}')
    if s.count(old)!=count: raise RuntimeError(f'Ambiguous source in {path}: {old[:100]} ({s.count(old)})')
    p.write_text(s.replace(old,new))

Path('packages/domain/src/follow.ts').write_text('''import { seesEntity } from './perception.js';
import { canReachEntity, distance, findApproachPath } from './spatial.js';
import { supportedPosition } from './spatial-state.js';
import type { Action, Entity, WorldState } from './types.js';

export const FOLLOW_RULES = {
  defaultDistance: 3,
  minimumDistance: 1.5,
  maximumDistance: 12,
  resumeMargin: 0.75,
  repathSeconds: 4,
  targetDisplacement: 1,
} as const;

/** Follow owns only its path/hold state; the kernel remains the sole movement owner.
 * docs/architecture.md#native-follow-activity
 */
export function updateFollowPath(world: WorldState, actor: Entity, action: Action): string | null {
  const follow = action.follow;
  const target = action.targetId && Object.hasOwn(world.entities, action.targetId)
    ? world.entities[action.targetId] : undefined;
  // Check current evidence before reading a target transform: identity is not tracking permission.
  if (!follow || !target || !seesEntity(world, actor, target)) return 'the followed target is no longer perceived.';
  if (!target.actor?.alive) return 'the followed actor is no longer alive.';
  if (!supportedPosition(actor)) return 'a supported ground stance is required.';
  const stopDistance = follow.distance + (action.stage === 'working' ? FOLLOW_RULES.resumeMargin : 0);
  if (canReachEntity(world, actor, target, stopDistance)) {
    action.stage = 'working';
    if (action.path.length) action.path = [];
    return null;
  }
  action.stage = 'approaching';
  const moved = !follow.lastObservedPosition || distance(follow.lastObservedPosition, target.position) >= FOLLOW_RULES.targetDisplacement;
  if (!action.path.length || (moved && world.simTime >= follow.nextRepathAt)) {
    const path = findApproachPath(world, actor, target, follow.distance);
    if (!path) return 'no supported route to the perceived target remains.';
    action.path = path;
    follow.lastObservedPosition = { ...target.position };
    follow.nextRepathAt = world.simTime + FOLLOW_RULES.repathSeconds;
  }
  return null;
}
''')
edit('packages/domain/src/types.ts',"export type ActionType =\n  | 'move'", "export type ActionType =\n  | 'follow'\n  | 'move'")
edit('packages/domain/src/types.ts',"export interface Action {\n  id: string;", "export interface Action {\n  follow?: { distance: number; nextRepathAt: number; lastObservedPosition?: Position };\n  id: string;")
edit('packages/domain/src/types.ts',"| { type: 'move'; destination: SurfacePoint }", "| { type: 'move'; destination: SurfacePoint }\n    | { type: 'follow'; targetId: string; distance?: number }")
edit('packages/domain/src/kernel.ts',"import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';", "import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';\nimport { FOLLOW_RULES, updateFollowPath } from './follow.js';")
edit('packages/domain/src/kernel.ts',"['gather', 'harvest', 'hunt', 'replenish'].includes(command.type)","['gather', 'harvest', 'hunt', 'replenish', 'follow'].includes(command.type)")
edit('packages/domain/src/kernel.ts',"switch (command.type) {\n    case 'move': {", """switch (command.type) {
    case 'follow': {
      const desiredDistance = command.distance ?? FOLLOW_RULES.defaultDistance;
      if (command.targetId === actor.id || !Number.isFinite(desiredDistance) || desiredDistance < FOLLOW_RULES.minimumDistance || desiredDistance > FOLLOW_RULES.maximumDistance)
        return reject('invalid-follow', 'Choose another perceived actor and a following distance between 1.5 and 12 world units.');
      action = createAction(world, 'follow', 0);
      action.targetId = command.targetId;
      action.follow = { distance: desiredDistance, nextRepathAt: 0 };
      const error = updateFollowPath(world, actor, action);
      if (error) return reject('follow-unavailable', error);
      break;
    }
    case 'move': {""")
edit('packages/domain/src/kernel.ts',"if (action.stage === 'working') {\n      const error = startWork", "if (action.stage === 'working' && action.type !== 'follow') {\n      const error = startWork")
edit('packages/domain/src/kernel.ts',"  if (!action) return;\n  if (action.stage === 'approaching') {", """  if (!action) return;
  if (action.type === 'follow') {
    const error = updateFollowPath(world, actor, action);
    if (error) { failAction(world, actor, events, error); return; }
    if (action.stage === 'approaching' && !moveAlongPath(world, actor, action.path,
      SIMULATION_RULES.movementTilesPerSecond * seconds * (1 - (actor.actor?.body?.conditions.injury ?? 0) / 200)))
      failAction(world, actor, events, 'the following route became physically blocked.');
    return; // Holding is still an active activity, never a completed arrival.
  }
  if (action.stage === 'approaching') {""")
edit('packages/domain/src/agency.ts',"    case 'move':\n      return finitePoint(command.destination) && isSafeRecordId(command.destination.surfaceId);", """    case 'move':
      return finitePoint(command.destination) && isSafeRecordId(command.destination.surfaceId);
    case 'follow':
      return isSafeRecordId(command.targetId) && (command.distance === undefined || (Number.isFinite(command.distance) && command.distance >= 1.5 && command.distance <= 12));""")
edit('packages/protocol/src/index.ts',"    | 'move'\n", "    | 'move'\n    | 'follow'\n")
edit('packages/protocol/src/index.ts',"  position?: SurfacePoint;\n  quantity?: number;", "  position?: SurfacePoint;\n  distance?: number;\n  quantity?: number;")
edit('apps/server/src/world-service.ts',"      'move',\n", "      'move',\n      'follow',\n")
edit('apps/server/src/world-service.ts',"    targetId: id.optional(),", "    targetId: id.optional(),\n    distance: z.number().min(1.5).max(12).optional(),")
edit('apps/server/src/world-service.ts',"      case 'gather':\n      case 'harvest':", """      case 'follow':
        if (!input.targetId) return { ok: false, code: 'target', message: 'Choose an actor to follow.' };
        command = { ...envelope, type: 'follow', targetId: input.targetId, ...(input.distance !== undefined ? { distance: input.distance } : {}) };
        break;
      case 'gather':
      case 'harvest':""")
edit('apps/server/src/cognition.ts',"    case 'move':\n      return { ...base, type: 'move', destination: input.position! };", """    case 'move':
      return { ...base, type: 'move', destination: input.position! };
    case 'follow':
      return { ...base, type: 'follow', targetId: input.targetId!, ...(input.distance !== undefined ? { distance: input.distance } : {}) };""")
edit('apps/server/src/action-descriptions.ts',"  move: 'Walk", "  follow: 'Follow a currently perceived actor, stopping when the target is lost or the activity is interrupted. No attack or stealth is implied.',\n  move: 'Walk")
with Path('docs/architecture.md').open('a') as f: f.write('''\n\n## Native follow activity\n\nThe native `follow` command uses the existing physical action lane and movement owner. It follows a currently visible living actor at a bounded desired distance (default 3 world units), with a 0.75-unit hold/resume band and bounded target-displacement replanning. Losing current visual evidence, losing support, or an invalid route ends the activity honestly; there is no hidden-position tracking, scent, stealth or sunset condition. Holding near the target remains running. Explicit cancellation/replacement and plan interruption retain their existing semantics. This is the initial ground/visual adapter, not a universal locomotion controller.\n''')
with Path('docs/maintainers/TODO.md').open('a') as f: f.write('''\n\n## Action capability slice: deferred automated coverage\n\nNo new unit/browser tests are written or run for this task at the owner's request. Add automated cases for direct/queued follow admission, self/hidden/dead targets, blocked/multi-level routes, visual loss, hold/resume hysteresis, cancellation, interrupted plans, same-version save/load and bounded replanning. Runtime smoke and existing stress scripts provide separate limited evidence, not these tests. Follow-up acceptance is owned by [AC04/AC05](action-capabilities.md).\n''')
