from pathlib import Path
import re
changes={}
def get(p):return changes.get(p,Path(p).read_text())
def edit(p,old,new,count=1):
 s=get(p)
 if s.count(old)!=count:raise RuntimeError(f'{p}: expected {count} of {old[:100]!r}, got {s.count(old)}')
 changes[p]=s.replace(old,new)
p='packages/domain/src/kernel.ts'
edit(p,"export function advanceWorld(original: WorldState, elapsedSimSeconds: number): Transition {",'''export function advanceWorld(original: WorldState, elapsedSimSeconds: number): Transition {
  const work = advanceWorldWork(original, elapsedSimSeconds);
  let result = work.next();
  while (!result.done) result = work.next();
  return result.value;
}

/** Cooperative checkpoints expose no candidate state. Draining synchronously and yielding
 * between checkpoints have identical native ordering and simulation time. The application
 * must hold exclusive mutation ownership until completion or discard the whole candidate.
 * docs/architecture.md#cooperative-native-burst-handling
 */
export function* advanceWorldWork(original: WorldState, elapsedSimSeconds: number): Generator<void, Transition, void> {''')
edit(p,'      advanceAction(world, actor, seconds, events);\n    }','      advanceAction(world, actor, seconds, events);\n      yield;\n    }')
edit(p,'  const perception = updateEncounters(world, original, events, participants.actors);\n  sealNativeEvidence(world, events, participants.actors);','  const perception = yield* updateEncounters(world, original, events, participants.actors);\n  yield* sealNativeEvidence(world, events, participants.actors);\n  yield;')
edit(p,'function updateEncounters(','function* updateEncounters(')
edit(p,'): ReturnType<typeof createPerceptionFrame> | undefined {','): Generator<void, ReturnType<typeof createPerceptionFrame> | undefined, void> {')
edit(p,'    const visible = frame.query(actor);','    const visible = yield* frame.query(actor);')
edit(p,'    for (const id of acquired) if (!recent.has(id)) encounter(observer, id, true);','    for (const [index, id] of acquired.entries()) {\n      if (!recent.has(id)) encounter(observer, id, true);\n      if ((index + 1) % 64 === 0) yield;\n    }')
edit(p,'    for (const id of objectIds) {','    for (const [index, id] of objectIds.entries()) {\n      if (index && index % 64 === 0) yield;')
edit(p,'    encounter.flush();\n  }','    encounter.flush();\n    yield;\n  }')
# Bound active ambient phases too; already each actor yields independently.
edit(p,"          emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);\n        }\n      }\n    }","          emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);\n        }\n      }\n      yield;\n    }")
p='packages/domain/src/perception-frame.ts'
edit(p,'    query(observer: Source): Exposure {','    *query(observer: Source): Generator<void, Exposure, void> {')
s=get(p);a=s.index('      const result = {\n        people: people.filter(');b=s.index('      next.exposures.set(observer.id, result);',a)
s=s[:a]+'''      const result: Exposure = { people: [], objects: [] };
      let examined = 0;
      for (const source of people) {
        if (source.id !== observer.id && sees(source)) result.people.push(source.id);
        if (++examined % 64 === 0) yield;
      }
      for (const source of things) {
        if (sees(source)) result.objects.push(source.id);
        if (++examined % 64 === 0) yield;
      }
'''+s[b:];changes[p]=s
p='packages/domain/src/experience.ts'
edit(p,'export function sealNativeEvidence(','export function* sealNativeEvidence(')
s=get(p);a=s.index('export function* sealNativeEvidence(');tail=s[a:]
tail=tail.replace('): void {','): Generator<void, void, void> {',1)
tail=tail.replace('  for (const event of events) if (!isDraft(event)) freeze(event, true);','  for (const [index, event] of events.entries()) {\n    if (!isDraft(event)) freeze(event, true);\n    if ((index + 1) % 128 === 0) yield;\n  }')
tail=tail.replace('    for (let i = before.length; i < snapshot.length; i++) freeze(snapshot[i]!, true);','    for (let i = before.length; i < snapshot.length; i++) {\n      freeze(snapshot[i]!, true);\n      if ((i - before.length + 1) % 128 === 0) yield;\n    }')
changes[p]=s[:a]+tail
p='packages/domain/src/index.ts';edit(p,'  advanceWorld,','  advanceWorld,\n  advanceWorldWork,')
p='apps/server/src/world-service.ts';changes[p]="import { advanceNativeStep } from './native-step.js';\n"+get(p)
edit(p,'        world = freezeWorld(advanceWorld(world, 1).world);\n        const stepMs = performance.now() - stepStarted;', '        const advanced = await advanceNativeStep(world);\n        const freezeStarted = performance.now();\n        world = freezeWorld(advanced.transition.world);\n        const stepMs = advanced.cpuMs + performance.now() - freezeStarted;')
edit(p,'        const stepStarted = performance.now();\n        const advanced', '        const advanced')
edit(p,'      // A single transition remains atomic even if it exceeds this time budget.','      // Cooperative checkpoints keep I/O responsive; candidate state stays private until completion.')
# Maintenance backlog changes are an explicit external dependency of refresh, not telemetry.
p='apps/server/src/cognition-maintenance.ts'
s=get(p);a=s.index("      timedSync('cognition.maintenanceRefresh'");b=s.index('      const actors =',a)
chunk=s[a:b];chunk,n=re.subn(r'        \}\),\n      \);',r'        }, this.service.memoryBacklog),\n      );',chunk)
if n!=1:raise RuntimeError('maintenance refresh closure missing')
s=s[:a]+chunk+s[b:];changes[p]=s
p='docs/architecture.md';changes[p]=get(p)+'''

## Change-driven exposure and reaction intake

The native post-movement phase retains derived visibility frames keyed to an exact immutable world. It reuses an observer's exposure only while geometry, sense bindings, observer pose/body and relevant source motion/removal permit it. Static immutable objects share scalar descriptors; no private actor plan is copied into the cache. A single saved outward-feature baseline supports native name/life/incapacity/fire/depletion/remains changes. It is not a general material/lighting evaluator. Current visual evidence remains observer-private; asleep and sightless actors do not acquire visual facts. Restore preserves exposure and feature baselines without replaying entry events.

`ActorWork` still owns coalesced thought/maintenance work. Repeated inspection of the same frozen snapshot skips input reconstruction; source refs and native concern bands, not diagnostic telemetry, mark work dirty. The expensive second all-observer sight scan is removed: only eligible actors revalidate their committed exposure candidates. At most 64 eligible schedule records are considered per intake pass, with inspected tickets rotated and generation-aware acknowledgements preserving newer wakes. The lightweight per-mind signature walk still runs after a changed world; a fully mutation-fed regional index remains conditional work.

`experiencesSince` merges the unconsumed ordered raw evidence tails and bounded summaries without reconstructing full recall. The existing memory/awareness projections and forgetting/duplicate rules are shared. Raw sequence order is validated at append and load; full retrieval and consolidation remain separate. Intake selects up to eight significant sources. No event, need crossing or private acquisition directly forces a paid model call. Installed cooldowns, budgets and actor decisions retain authority.

## Cooperative native burst handling

`advanceWorldWork` performs the same deterministic native transition as synchronous `advanceWorld`, with bounded checkpoints between actors, sensory candidates, acquisition groups and sealing new evidence. It yields no world state. `WorldService` retains the one mutation lane while `native-step.ts` yields to the event loop after approximately eight milliseconds of work. Reads and I/O may use the preceding committed snapshot; commands wait for completion and cannot interleave mutations into a partly perceived world. Nothing is deferred to a later simulation tick or dropped to meet a budget.

Finalization, a single path query, serialization and database commit are still indivisible suboperations and can exceed the slice target. Native CPU, elapsed wall time, yields and longest slices are measured separately. Workers remain conditional on measured residual blocking, not a second authority or an unconditional rewrite. Pausing or shutdown waits for the admitted native step; half-finished evidence never becomes visible.
'''
p='docs/maintainers/TODO.md';changes[p]=get(p)+'''

- [ ] Automate exposure-frame reuse versus fresh exact sensing for source motion/removal, stationary observers, geometry/sense/body changes, within-cell motion, sleeping/waking and feature updates. Check cold restore and cache eviction; no stale live knowledge or repeated entry. Profile sparse and crowded layouts independently.
- [ ] Cover ordered raw evidence append/load rejection, equal sequence values, forgotten/duplicated/updated sources, summaries, last-considered watermarks, cold event rotation and bounded intake. Cover external backlog invalidation, more than 64 eligible minds, cooldown fairness, and wakes arriving during asynchronous schedule reads.
- [ ] Compare synchronous and cooperatively drained native transitions, intermediate event order, RNG, finite-resource claims, current/next command admission and cancellation. Verify HTTP reads see only prior or complete state; rejected/abandoned candidates publish nothing. Qualify pause/restore/shutdown, event-loop tails and irreducible finalization/path/commit cost without paid calls.
'''
for p,s in changes.items():Path(p).write_text(s)
