from pathlib import Path
import re
changes={}
def get(p):return changes.get(p,Path(p).read_text())
def edit(p,old,new,count=1):
 s=get(p)
 if s.count(old)!=count:raise RuntimeError(f'{p}: expected {count} of {old[:90]!r}, got {s.count(old)}')
 changes[p]=s.replace(old,new)
p='packages/domain/src/kernel.ts'
edit(p,"import { confirmActionRevision } from './agency.js';","import { createPerceptionFrame } from './perception-frame.js';\nimport { confirmActionRevision } from './agency.js';")
s=get(p);a=s.index('/** Positions stay fixed during this phase:') if '/** Positions stay fixed during this phase:' in s else s.index('/** Positions stay fixed during this phase;')
b=s.index('\n/** Private records are returned',a)
old=s[a:b]
# Keep the already-qualified contact detector and its authority path unchanged.
touch_a=old.index('    const touch = sensesFor(')
touch_b=old.index('    if (radius === 0) continue;',touch_a)
touch=old[touch_a:touch_b]
new='''/** Positions stay fixed during this phase; never reuse a frame across intervening motion. */
function updateEncounters(
  world: WorldState, original: WorldState, events: WorldEvent[], actorIds: readonly string[],
): ReturnType<typeof createPerceptionFrame> | undefined {
  if (!actorIds.some(id => world.entities[id]?.actor?.alive && hasMemory(world.entities[id]))) return;
  const frame = createPerceptionFrame(world, original);
  const entities = frame.sources.map(source => ({ ...source, entity: world.entities[source.id]! }));
  const byId = new Map(entities.map(source => [source.id, source]));
  const encounter = encounterEmitter(world, events);
  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;
  for (const actor of entities.filter(source => source.alive && hasMemory(source.entity))) {
    const radius = actor.radius;
    const clearSight = () => {
      if (world.visiblePeople?.[actor.id]?.length) world.visiblePeople[actor.id] = [];
      if (world.visibleObjects?.[actor.id]?.length) world.visibleObjects[actor.id] = [];
    };
    // Sleeping does not manufacture conscious acquisitions. Waking reacquires actual evidence.
    if (actor.sleeping) { clearSight(); continue; }
''' + touch + '''
    if (radius === 0) { clearSight(); continue; }
    const visible = frame.query(actor);
    const seen = visible.people;
    const previous = original.visiblePeople?.[actor.id] ?? [];
    const previouslySeen = new Set(previous);
    const acquired = seen.filter(id => !previouslySeen.has(id));
    const recent = new Set(acquired.length ? (world.memories[actor.id] ?? [])
      .filter(m => m.kind === 'episode' && (m.summary.startsWith('I saw ') || m.eventType === 'encounter') && world.simTime - m.at < 3600)
      .flatMap(m => m.entityIds) : []);
    for (const id of acquired) if (!recent.has(id)) encounter(actor.entity, id, true);
    for (const id of seen)
      if (previouslySeen.has(id) && frame.changedFeatures.has(id)) encounter(actor.entity, id, true, byId.get(id)!.detail);
    if (!original.visiblePeople?.[actor.id] || seen.length !== previous.length || seen.some((id,i) => id !== previous[i]))
      (world.visiblePeople ??= {})[actor.id] = seen;
    const objectIds = visible.objects;
    const previousObjects = original.visibleObjects?.[actor.id] ?? [];
    const priorObjects = new Set(previousObjects);
    for (const id of objectIds) {
      if (!priorObjects.has(id)) encounter(actor.entity, id, false);
      else if (frame.changedFeatures.has(id)) encounter(actor.entity, id, false, byId.get(id)!.detail);
    }
    if (!original.visibleObjects?.[actor.id] || objectIds.length !== previousObjects.length || objectIds.some((id,i) => id !== previousObjects[i]))
      (world.visibleObjects ??= {})[actor.id] = objectIds;
    encounter.flush();
  }
  frame.finish();
  return frame;
}
'''
changes[p]=s[:a]+new+s[b:]
edit(p,'  updateEncounters(world, original, events, participants.actors);\n  return finish(', '  const perception = updateEncounters(world, original, events, participants.actors);\n  const result = finish(')
edit(p,"    outcome(true, 'advanced', `Advanced ${elapsedSimSeconds} simulation seconds.`),\n  );\n}","    outcome(true, 'advanced', `Advanced ${elapsedSimSeconds} simulation seconds.`),\n  );\n  perception?.retain(result.world);\n  return result;\n}")
p='packages/domain/src/events.ts'
# Add a bounded detail payload through the same private acquisition owner.
s=get(p)
s,n=re.subn(r'const acquire = \(source: Entity, targetId: string, meaningful: boolean\): WorldEvent =>', 'const acquire = (source: Entity, targetId: string, meaningful: boolean, detail?: string): WorldEvent =>',s)
if n!=1:raise RuntimeError('acquire signature missing')
s=s.replace('`${source.name} saw ${world.entities[targetId]!.name}.`','detail ? `${source.name} notices ${world.entities[targetId]!.name}: ${detail}.` : `${source.name} saw ${world.entities[targetId]!.name}.`')
s=s.replace('semanticTrigger: true, acquisition: true','semanticTrigger: true, acquisition: true, change: detail ? \'detail\' : \'onset\'').replace('semanticTrigger: false, acquisition: true','semanticTrigger: false, acquisition: true, change: detail ? \'detail\' : \'onset\'')
changes[p]=s
p='packages/domain/src/types.ts'
edit(p,'export interface WorldState {','export interface WorldState {\n  /** Shared outward-feature baseline for the completed perception phase, not private knowledge. */\n  perceptionFeatures: Record<string, string>;')
s=get(p);s,n=re.subn(r'(schemaVersion:\s*1\s*\|[^;]*\b12)(;)',r'\1 | 13\2',s)
if n!=1:raise RuntimeError('schema union missing')
changes[p]=s
p='packages/domain/src/data.ts';edit(p,'    schemaVersion: 12,','    schemaVersion: 13,\n    perceptionFeatures: {},')
p='packages/domain/src/world-modules.ts';changes[p]="import { validatePerceptionState } from './perception-frame.js';\n"+get(p)
edit(p,'world.schemaVersion !== 12','world.schemaVersion !== 13')
edit(p,'  validateSpatialWorld(world);','  validateSpatialWorld(world);\n  validatePerceptionState(world);')
edit(p,'This build requires 3D format 9;','This build requires perception format 13;')
p='apps/server/src/game-saves.ts';edit(p,'payload.state.world.schemaVersion !== 12','payload.state.world.schemaVersion !== 13');edit(p,"'development-2026-09-24-perception1'","'development-2026-09-24-perception2'")
for p,s in changes.items():Path(p).write_text(s)
