from pathlib import Path

changes = {}
def get(path):
    return changes.get(path, Path(path).read_text())
def edit(path, old, new, count=1):
    text = get(path)
    if text.count(old) != count:
        raise RuntimeError(f'{path}: expected {count} occurrences of {old[:100]!r}, got {text.count(old)}')
    changes[path] = text.replace(old, new)

p = 'packages/domain/src/events.ts'
edit(p, "import { mutateExperience } from './experience.js';", "import { mutateExperience, type ExperienceMutation } from './experience.js';")
s = get(p)
a = s.index('/** Only for the synchronous post-movement encounter phase:')
b = s.index('\nfunction recordEvent(', a)
changes[p] = s[:a] + '''/** Acquiring evidence is private, not an observable act by the observer.
 * Batch only this fixed-position phase through the existing experience owner;
 * external speech/actions still resolve their actual event-time audiences.
 * docs/architecture.md#private-perception-and-evidence-batches
 */
export function encounterEmitter(world: WorldState, events: WorldEvent[]) {
  let owner: string | undefined;
  let pending: ExperienceMutation[] = [];
  const flush = () => {
    if (owner && pending.length && mutateExperience(world, owner, pending) === null)
      throw new Error('Private perception evidence could not be admitted.');
    pending = [];
  };
  const acquire = (source: Entity, targetId: string, meaningful: boolean): WorldEvent => {
    if (owner !== source.id) {
      flush();
      owner = source.id;
    }
    const event = recordEvent(
      world, events, 'encounter',
      `${source.name} saw ${world.entities[targetId]!.name}.`,
      [source.id], source, targetId,
      meaningful
        ? { importance: 6, semanticTrigger: true, acquisition: true }
        : { importance: 0, urgency: 0, semanticTrigger: false, acquisition: true },
      'private', pending,
    );
    // Bound temporary memory independently of the number of visible objects.
    if (pending.length >= 128) flush();
    return event;
  };
  return Object.assign(acquire, { flush });
}
''' + s[b:]
edit(p, "  scope: 'external' | 'private',\n): WorldEvent {", "  scope: 'external' | 'private',\n  awarenessBatch?: ExperienceMutation[],\n): WorldEvent {")
edit(p, "      mutateExperience(world, actorId, {\n        operation: 'add',", "      const addition: ExperienceMutation = {\n        operation: 'add',")
edit(p, "scope === 'private'\n                ? type === 'contact'", "scope === 'private' && data?.['acquisition'] !== true\n                ? type === 'contact'")
edit(p, "source?.id === actorId\n                ? 'self_event'", "data?.['acquisition'] === true\n                ? 'observed_event'\n                : source?.id === actorId\n                ? 'self_event'")
edit(p, "      });\n    }\n  }\n  appraiseEvent(world, event);", "      };\n      if (awarenessBatch) awarenessBatch.push(addition);\n      else mutateExperience(world, actorId, addition);\n    }\n  }\n  appraiseEvent(world, event);")
p = 'packages/domain/src/kernel.ts'
edit(p, "    for (const id of seen.filter((id) => !previouslySeen.has(id))) {\n      const recent = (world.memories[actor.id] ?? []).some(\n        (m) =>\n          m.kind === 'episode' &&\n          m.entityIds.includes(id) &&\n          (m.summary.startsWith('I saw ') || m.eventType === 'encounter') &&\n          world.simTime - m.at < 3600,\n      );\n      if (!recent) encounter(actor.entity, id, true);\n    }", "    const acquired = seen.filter((id) => !previouslySeen.has(id));\n    // One retained-memory scan only when there are actual new living contacts.\n    const recent = new Set(acquired.length ? (world.memories[actor.id] ?? [])\n      .filter((m) => m.kind === 'episode' &&\n        (m.summary.startsWith('I saw ') || m.eventType === 'encounter') &&\n        world.simTime - m.at < 3600)\n      .flatMap((m) => m.entityIds) : []);\n    for (const id of acquired) if (!recent.has(id)) encounter(actor.entity, id, true);")
edit(p, "      (world.visibleObjects ??= {})[actor.id] = objectIds;\n  }\n}\n\n/** Private records", "      (world.visibleObjects ??= {})[actor.id] = objectIds;\n    encounter.flush();\n  }\n}\n\n/** Private records")
# This semantic cutover must not retain past broadcast-acquisition leakage as valid current-format knowledge.
for p in ['packages/domain/src/data.ts','packages/domain/src/types.ts','packages/domain/src/world-modules.ts','apps/server/src/game-saves.ts']:
    s = get(p)
    import re
    s = re.sub(r'(schemaVersion\s*(?::|!==|===)\s*)11\b', r'\g<1>12', s)
    if p.endswith('game-saves.ts'):
        s = re.sub(r"export const SAVE_FORMAT = '[^']+';", "export const SAVE_FORMAT = 'development-2026-09-24-perception1';", s)
    changes[p] = s
p='docs/architecture.md'
changes[p] = get(p) + '''\n\n## Private perception and evidence batches

Native visual acquisition now records an observer-private `encounter` with observed modality and actual source/target provenance. Noticing an object is not an external act and cannot give another observer knowledge of that target. Speech, gestures and other outward actions retain their event-time audience rules. This is the intentional EPR03 semantics change, not a behavior-preserving cache optimization.

The fixed-position encounter phase batches at most 128 new awareness entries through `mutateExperience`; no second evidence store or post-commit best-effort delivery is added. Event identities and required native commitment/appraisal processing remain in the authoritative transition. Retained-memory encounter deduplication scans once per observer with newly seen living contacts, not once per pair. Development schema 12 rejects earlier worlds without conversion; same-version capture retains private evidence and active exposures.
'''
p='docs/maintainers/TODO.md'
changes[p] = get(p) + '''\n\n## Perception performance — deferred automated validation

- [ ] Automate observer-private visual acquisition: A sees an object while C sees A but not the object; C learns nothing from A's private acquisition. Check actual speech/gesture witnesses separately, acquisition modality/provenance, ordinary-object non-trigger behavior and living-contact cognition opportunities.
- [ ] Cover 0/1/128/129/many batch entries, duplicate/forgotten-ID rejection, required commitment side effects, unchanged source ownership, event ordering, rollback, copied records and same-version restore without new acquisitions. Compare intentional private audiences separately from unchanged physical state and native RNG. No unit/browser suite was written or run for this change.
'''
for p,s in changes.items(): Path(p).write_text(s)
