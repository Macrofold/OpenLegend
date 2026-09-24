from pathlib import Path

def edit(path, f):
 p=Path(path);p.write_text(f(p.read_text()))
def frame(s):
 a=s.index('      if (\n        compatible &&',s.index('*query(observer'))
 b=s.index('      next.exposures.set(observer.id, result);',a)
 s=s[:a]+'''      const stableObserver = compatible && exposed && prior &&
        sameSource(prior, observer) && prior.radius === observer.radius &&
        prior.eyeHeight === observer.eyeHeight && prior.sleeping === observer.sleeping &&
        prior.memory === observer.memory;
      // A moving person does not invalidate static object geometry. Classification changes
      // check both the old and new source so death/removal cannot leave stale exposures.
      const canReuse = (kind: 'alive' | 'object') => stableObserver &&
        !changed.some(source => {
          const before = old!.sources.get(source.id);
          return ((source[kind] && nearby(observer, source)) ||
            (!!before?.[kind] && nearby(observer, before)));
        }) && !removed.some(source => source[kind] && nearby(observer, source));
      const reusePeople = canReuse('alive'), reuseObjects = canReuse('object');
      if (reusePeople && reuseObjects) {
        next.stats.reused++;
        next.exposures.set(observer.id, exposed!);
        return exposed!;
      }
      const sees = visionQuery(world, world.entities[observer.id]!);
      const result: Exposure = {
        people: reusePeople ? exposed!.people : [],
        objects: reuseObjects ? exposed!.objects : [],
      };
      let examined = 0;
      next.stats.queried++;
      if (!reusePeople) {
        living ??= spatialCandidates(samples.filter(source => source.alive));
        const candidates = living(observer.position, observer.radius + 2);
        next.stats.candidates += candidates.length;
        for (const source of candidates) {
          if (source.id !== observer.id && sees(source)) result.people.push(source.id);
          if (++examined % 64 === 0) yield;
        }
      }
      if (!reuseObjects) {
        objects ??= spatialCandidates(samples.filter(source => source.object));
        const candidates = objects(observer.position, observer.radius);
        next.stats.candidates += candidates.length;
        for (const source of candidates) {
          if (sees(source)) result.objects.push(source.id);
          if (++examined % 64 === 0) yield;
        }
      }
      // Preserve committed identities when a geometry recheck finds no membership change.
      const retain = (ids: string[], before: string[] | undefined) =>
        before && ids.length === before.length && ids.every((id, i) => id === before[i]) ? before : ids;
      result.people = retain(result.people, previous.visiblePeople?.[observer.id]);
      result.objects = retain(result.objects, previous.visibleObjects?.[observer.id]);
'''+s[b:]
 return s
edit('packages/domain/src/perception-frame.ts',frame)
def kernel(s):
 old='''    const seen = visible.people;
    const previous = original.visiblePeople?.[actor.id] ?? [];'''
 new='''    const seen = visible.people;
    // Stable exposure is current knowledge, not a fresh acquisition. Skip all per-object
    // set construction and episode rebuilding when neither membership nor detail changed.
    if (original.perceptionEpisodes?.[actor.id] &&
        seen === original.visiblePeople?.[actor.id] &&
        visible.objects === original.visibleObjects?.[actor.id] &&
        frame.changedFeatures.size === 0) {
      encounter.flush();
      yield;
      continue;
    }
    const previous = original.visiblePeople?.[actor.id] ?? [];'''
 if s.count(old)!=1:raise ValueError('Exposure delta boundary changed')
 return s.replace(old,new)
edit('packages/domain/src/kernel.ts',kernel)
def status(s):
 old="    if (!state?.active && (!d.enabled || !d.automaticActivation)) continue;"
 new="""    // An occupying effect requires an actor by the admission contract. Avoid evaluating
    // automatic conditions on every inert object, while still reconciling active states.
    if (!state?.active && (!d.enabled || !d.automaticActivation || (d.occupiesAction && !entity.actor))) continue;"""
 if s.count(old)!=1:raise ValueError('Status eligibility boundary changed')
 return s.replace(old,new)
edit('packages/domain/src/status-effects.ts',status)
def events(s):
 before='''      const addition: ExperienceMutation = {'''
 s=s.replace(before,"      const perspective = memoryPerspective(world, actorId, text, type === 'speech', source?.id);\n"+before)
 s=s.replace("text: memoryPerspective(world, actorId, text, type === 'speech', source?.id),",'text: perspective,')
 # Preserve explicit attributed speech content; reuse only the identical non-speech projection.
 s=s.replace("content: typeof data?.['text'] === 'string' ? data['text'] : memoryPerspective(world, actorId, text, false, source?.id),", "content: typeof data?.['text'] === 'string' ? data['text'] : type === 'speech' ? memoryPerspective(world, actorId, text, false, source?.id) : perspective,")
 return s
edit('packages/domain/src/events.ts',events)
