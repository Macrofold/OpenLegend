from pathlib import Path
import re
changes={}
def get(p):return changes.get(p,Path(p).read_text())
def edit(p,old,new,count=1):
 s=get(p)
 if s.count(old)!=count:raise RuntimeError(f'{p}: expected {count} of {old[:100]!r}, got {s.count(old)}')
 changes[p]=s.replace(old,new)
# Share immutable inert source descriptors. Do not clone actor plans just to inspect a transform.
p='packages/domain/src/perception-frame.ts'
edit(p,"import { current, isDraft } from 'immer';", "import { current, isDraft } from 'immer';\nimport { hasMemory } from './living.js';")
s=get(p)
a=s.index('  const samples: Source[] = Object.values(world.entities).map(')
b=s.index('  const next: Frame =',a)
old=s[a:b]
# Preserve the exact capture fields while moving construction behind a frozen-source cache.
body=old[old.index('    const body ='):old.rindex('  });')]
body=body.replace('const body = bodyProfile(entity);','const body = bodyProfile(entity);').replace('memory: !!entity.actor && entity.actor.capabilities?.memory !== false,','memory: hasMemory(entity),')
helper='''const inertSources = new WeakMap<Entity, Source>();
function captureSource(world: WorldState, value: Entity): Source {
  const entity = value.actor ? value : plain(value);
  const immutable = !entity.actor && Object.isFrozen(entity);
  const cached = immutable ? inertSources.get(entity) : undefined;
  if (cached) return cached;
''' + body.replace('    return {','    const source: Source = {',1) + '''
  if (immutable) inertSources.set(entity, source);
  return source;
}

'''
s=s[:a]+'  const samples = Object.values(world.entities).map(entity => captureSource(world, entity));\n'+s[b:]
pos=s.index('/** Derived fixed-phase visibility reuse.')
s=s[:pos]+helper+s[pos:]
s=s.replace('    sources: samples,','    sources: samples,\n    source(id: string) { return next.sources.get(id); },')
changes[p]=s
p='packages/domain/src/kernel.ts'
edit(p,"import { experiences } from './experience.js';", "import { experiences, sealNativeEvidence } from './experience.js';")
s=get(p)
a=s.index('  const entities = frame.sources.map(');b=s.index('  const encounter = encounterEmitter',a)
s=s[:a]+'  const entities = frame.sources;\n'+s[b:]
s=s.replace('entities.filter((source) => source.alive && hasMemory(source.entity))','entities.filter((source) => source.alive && source.memory)')
s=s.replace('    const radius = actor.radius;','    const observer = world.entities[actor.id]!;\n    const radius = actor.radius;')
s=s.replace('actor.entity','observer').replace('e.entity)', 'world.entities[e.id]!)')
s=s.replace('byId.get(id)!.detail','frame.source(id)!.detail')
# This owner boundary is after all native writes; immutable input worlds alone qualify.
s=s.replace('  const result = finish(\n    world,\n    events,\n    outcome(true, \'advanced\'', '  sealNativeEvidence(world, events, participants.actors);\n  const result = finish(\n    world,\n    events,\n    outcome(true, \'advanced\'')
changes[p]=s
# Reuse existing memory projections for an ordered, bounded intake tail; full recall remains separate.
p='packages/domain/src/experience.ts'
edit(p,"import { current, isDraft } from 'immer';", "import { current, isDraft, original, freeze } from 'immer';")
s=get(p)
a=s.index('    .map((a) => ({',s.index('export function experiences('));b=s.index('\n  const summaries:',a)
aware=s[a:b]
start=aware.index('({')+2;end=aware.rindex('}));')
awarefields=aware[start:end]
s=s[:a]+'    .map(a => awarenessMemory(actorId, a));'+s[b:]
a=s.index('    .map((s) => ({',s.index('export function experiences('));b=s.index('\n  const raw =',a)
summary=s[a:b];summaryfields=summary[summary.index('({')+2:summary.rindex('}));')]
s=s[:a]+'    .map(s => summaryMemory(actorId, s));'+s[b:]
s += '\nfunction awarenessMemory(actorId: string, a: Awareness): MemoryRecord { return {'+awarefields+'}; }\n'
s += '\nfunction summaryMemory(actorId: string, s: ExperienceSummary): MemoryRecord { return {'+summaryfields+'}; }\n'
s += '''
/** Ordered raw sequence is an admission/load invariant, not an assumption about arbitrary JSON. */
function afterSequence<T extends { sequence?: number }>(entries: readonly T[], watermark: number): number {
  let lo = 0, hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((entries[mid]!.sequence ?? 0) <= watermark) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** New evidence for reaction intake; do not reconstruct/sort an actor's entire recall corpus.
 * Summaries retain their independently bounded ordering; raw additions are monotonic.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
export function* experiencesSince(world: WorldState, actorId: string, watermark: number): Generator<MemoryRecord> {
  if (!Object.hasOwn(world.entities, actorId) || !world.entities[actorId]?.actor) return;
  const state = world.experience, aware = state?.awareness[actorId] ?? [], memories = world.memories[actorId] ?? [];
  const forgotten = new Set(state?.forgotten[actorId] ?? []);
  const summaries = (state?.summaries[actorId] ?? []).filter(s => (s.sequence ?? 0) > watermark &&
    !s.sourceIds.some(id => forgotten.has(id) || !!state?.corrections?.[actorId]?.[id]))
    .slice().sort((a,b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  let ai = afterSequence(aware, watermark), mi = afterSequence(memories, watermark), si = 0;
  let eventIds: Set<string> | undefined;
  while (ai < aware.length || mi < memories.length || si < summaries.length) {
    const a = aware[ai], m = memories[mi], s = summaries[si];
    const as = a?.sequence ?? Infinity, ms = m ? m.sequence ?? 0 : Infinity, ss = s ? s.sequence ?? 0 : Infinity;
    if (m && ms <= as && ms <= ss) {
      mi++;
      if (forgotten.has(m.id) || forgotten.has(m.eventId ?? '') ||
        !(m.kind === 'commitment' || m.kind === 'episode' && m.source !== 'inferred')) continue;
      if (m.eventId && m.kind === 'episode') {
        eventIds ??= new Set(aware.map(entry => entry.eventId));
        if (eventIds.has(m.eventId)) continue;
      }
      yield m;
    } else if (a && as <= ss) {
      ai++;
      if (!forgotten.has(a.eventId)) yield awarenessMemory(actorId, a);
    } else if (s) { si++; yield summaryMemory(actorId, s); }
  }
}
export function validateExperienceOrder(world: WorldState): void {
  for (const rows of [...Object.values(world.experience?.awareness ?? {}), ...Object.values(world.memories)]) {
    let last = 0;
    for (const row of rows) {
      const seq = row.sequence ?? 0;
      if (!Number.isSafeInteger(seq) || seq < last) throw new Error('Experience sequence must be monotonic.');
      last = seq;
    }
  }
}

/** Seal only newly owned evidence after the final native phase. Old mutable builder data
 * must not be frozen as a side effect. Later transitions still edit through fresh drafts.
 * This avoids repeated deep finalization without changing event append lineage.
 */
export function sealNativeEvidence(world: WorldState, events: WorldEvent[], actorIds: readonly string[]): void {
  if (!isDraft(world) || !Object.isFrozen(original(world))) return;
  for (const event of events) if (!isDraft(event)) freeze(event, true);
  for (const id of actorIds) {
    const rows = world.experience?.awareness[id];
    if (!rows || !isDraft(rows)) continue;
    const before = original(rows)!;
    if (rows.length <= before.length) continue;
    const snapshot = current(rows);
    for (let i = before.length; i < snapshot.length; i++) freeze(snapshot[i]!, true);
  }
}
'''
s=s.replace('ExperienceEntry, MemoryRecord, Transition, WorldState','ExperienceEntry, MemoryRecord, Transition, WorldState, WorldEvent')
# Validate raw sequence extension before publishing any member of an add batch.
needle='    for (const entry of additions) {\n      if (entry.source === \'awareness\')'
if s.count(needle)!=1:raise RuntimeError('addition publication boundary missing')
s=s.replace(needle,'''    const tails = {
      awareness: world.experience?.awareness[actorId]?.at(-1)?.sequence ?? 0,
      memory: world.memories[actorId]?.at(-1)?.sequence ?? 0,
    };
    for (const entry of additions) {
      if (entry.source === 'summary') continue;
      const sequence = entry.value.sequence ?? 0;
      if (!Number.isSafeInteger(sequence) || sequence < tails[entry.source]) return null;
      tails[entry.source] = sequence;
    }
''' + needle)
changes[p]=s
p='packages/domain/src/world-modules.ts';changes[p]="import { validateExperienceOrder } from './experience.js';\n"+get(p);edit(p,'  validateAgency(world);','  validateAgency(world);\n  validateExperienceOrder(world);')
# Cheap input signatures and bounded evidence consumption share the existing scheduler.
p='apps/server/src/ai-director.ts';changes[p]="import { experiencesSince } from '@open-legend/domain';\n"+get(p)
s=get(p);s=s.replace('      const visible = new Map<string, string[]>();\n','')
a=s.index('          const ids = nearbyEntities(world, entity.position, visionRadius(world, entity))',s.index('async considerThought'))
b=s.index('          return [',a)
s=s[:a]+s[b:]
s=s.replace('            nativeProtectionReason(world, id),','            actor.action?.id,\n            actor.action?.type,\n            actor.agency.revision,\n            actor.capabilities,\n            world.items,\n            world.knowledge[id],\n            world.moduleManifest,\n            world.perceptionFeatures,')
s=s.replace("            ids.join('\\0'),",'            world.visiblePeople?.[id],\n            world.visibleObjects?.[id],')
s=s.replace('            this.service.telemetryRevision,\n','')
s=s.replace('.ready(this.now(), world.simTime)','.ready(this.now(), world.simTime, id => world.entities[id]?.actor?.controller === \'npc\' && !world.entities[id]?.actor?.incapacitated)')
s=s.replace('      const scheduled = new Map(','      const workVersions = new Map(actors.map(e => [e.id, this.thoughtWork.version(e.id)]));\n      const scheduled = new Map(')
a=s.index('        const all = experiences(world, entity.id);',s.index('async considerThought'))
b=s.index('        const subscription =',a)
old=s[a:b]
# Keep the native significant-event/own-response criteria, but visit only unconsumed source tails.
new='''        const latest = [] as ReturnType<typeof experiences>;
        for (const memory of experiencesSince(world, entity.id, last?.watermark ?? 0)) {
          const event = this.service.worldEvent(memory.eventId ?? '');
          const ownResponse = event?.actorId === entity.id && typeof event.data?.['responseId'] === 'string';
          if (!ownResponse && (memory.importance >= 6 || policy.significantEventTypes.includes(memory.eventType ?? event?.type ?? ''))) latest.push(memory);
          if (latest.length === 8) break;
        }
'''
s=s[:a]+new+s[b:]
s=s.replace('            : Infinity,\n        );\n        const matches = interestMatches(', '            : Infinity,\n          workVersions.get(entity.id),\n        );\n        const matches = interestMatches(')
s=s.replace('          visible.get(entity.id) ?? [],','          [...(world.visiblePeople?.[entity.id] ?? []), ...(world.visibleObjects?.[entity.id] ?? [])]\n            .filter(id => !!world.entities[id] && seesEntity(world, entity, world.entities[id]!)),')
s=s.replace('!unseen.length','!latest.length')
# Avoid one more full-awareness cross-product simply to identify a selected significant event.
a=s.index('        const significant = world.experience?.awareness[entity.id]?.some(',s.index('async considerThought'))
b=s.index('        if (significant)',a)
s=s[:a]+'''        const significant = latest.some(m => m.id === m.eventId &&
          policy.significantEventTypes.includes(m.eventType ?? this.service.worldEvent(m.id)?.type ?? ''));
'''+s[b:]
changes[p]=s
p='apps/server/src/cognition-maintenance.ts';changes[p]="import { experiencesSince } from '@open-legend/domain';\n"+get(p)
s=get(p)
s=s.replace('      const times = new Map(','      const workVersions = new Map(actors.map(e => [e.id, this.work.version(e.id)]));\n      const times = new Map(')
s=s.replace('        this.work.inspected(entity.id, Math.min(...future));','        this.work.inspected(entity.id, Math.min(...future), workVersions.get(entity.id));')
s=s.replace('const hasMemories = experiences(world, entity.id, true).length > 0;','const hasMemories = !experiencesSince(world, entity.id, -1).next().done;')
changes[p]=s
for p,s in changes.items():Path(p).write_text(s)
