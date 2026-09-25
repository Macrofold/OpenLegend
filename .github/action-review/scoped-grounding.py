from pathlib import Path

def edit(path, old, new):
    p=Path(path); text=p.read_text()
    if old not in text: raise RuntimeError(f'Missing reviewed anchor: {path}: {old[:90]}')
    p.write_text(text.replace(old,new))

edit('apps/server/src/ai-director.ts', '''    attemptBindings = attemptBindings.map((binding) => ({
      ...binding,
      description: resolveEntityMarkers(binding.description, {
        ...prepared.visibleEntityReferences,
        ...prepared.entityReferences,
      }),
    }));
''', '')
p='apps/server/src/action-grounding.ts'
edit(p,"import { navigationInvocationSchema }", "import { entityReferenceMap, resolveEntityMarkers } from './entity-references.js';\nimport { navigationInvocationSchema }")
edit(p, '  const proposals = response.operations', '''  const references = entityReferenceMap(world, entityIds, actorId);
  const handles = new Map(Object.entries(references).map(([handle, id]) => [id, handle]));
  // Use the existing episode-scoped namespace throughout interpretation and review.
  // Canonical identities remain in trusted bindings, not generated target parameters.
  // docs/architecture.md#jev-first-action-grounding
  const projectText = (value: string) => value.replace(/\(ID:([^()\s]+)\)/g,
    (marker, id: string) => handles.has(id) ? `(ID:${handles.get(id)})`
      : Object.hasOwn(references, id) ? marker : '(unavailable subject)');
  const invocationSchema = navigationInvocationSchema.extend({
    targetEntityId: z.enum(Object.keys(references) as [string, ...string[]]).nullable(),
  });
  const projectCommand = (command: Command) => {
    const { actorId: _actorId, id: _id, ...value } = command;
    return {
      ...value,
      ...('targetId' in value && value.targetId ? { targetId: handles.get(value.targetId) ?? null } : {}),
      ...('heatId' in value ? { heatId: handles.get(value.heatId) ?? null } : {}),
    };
  };
  const proposals = response.operations''')
edit(p,'[${target.id}] at ordinary distance','(ID:${handles.get(target.id)}) at ordinary distance')
edit(p,'''        request: text,
        targetEntityId: act.targetEntityId,''','''        request: projectText(text),
        targetEntityId: act.targetEntityId ? handles.get(act.targetEntityId) : null,''')
edit(p,"goals: actor.agency.goals.filter((g) => g.status === 'active').map((g) => g.objective),", "goals: actor.agency.goals.filter((g) => g.status === 'active').map((g) => projectText(g.objective)),")
edit(p,'''          id: e.id,
          name: observerDescription''','''          id: handles.get(e.id),
          name: observerDescription''')
edit(p,"choices: scoped.map((c, index) => ({ id: `n${index}`, description: c.description })),", "choices: scoped.map((c, index) => ({ id: `n${index}`, description: projectText(c.description) })),")
edit(p,'no qualifier or required step omitted: ${c.description}', 'no qualifier or required step omitted: ${projectText(c.description)}')
edit(p,'.object({ actionId: handle, invocation: navigationInvocationSchema.nullable() })', '.object({ actionId: handle, invocation: invocationSchema.nullable() })')
edit(p,'''                step.invocation,
                entityIds,''','''                step.invocation ? {
                  ...step.invocation,
                  targetEntityId: step.invocation.targetEntityId
                    ? references[step.invocation.targetEntityId] ?? null : null,
                } : null,
                entityIds,''')
edit(p,'''            request: text,
            targetEntityId: act.targetEntityId,''','''            request: context.request,
            targetEntityId: context.targetEntityId,''')
edit(p,'native: { description: nativeDescription, commands: boundCommands },','native: { description: projectText(nativeDescription), commands: boundCommands.map(projectCommand) },')
edit(p,'''      let reason = result.reason;
      let omitted = result.omitted;''','''      let reason = resolveEntityMarkers(result.reason, references);
      let omitted = result.omitted.map((entry) => ({
        requirement: resolveEntityMarkers(entry.requirement, references),
        reason: resolveEntityMarkers(entry.reason, references),
      }));''')
