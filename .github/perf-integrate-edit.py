from pathlib import Path

def edit(path, fn):
 p=Path(path);p.write_text(fn(p.read_text()))
def kernel(s):
 s=s.replace('''      if (world.visibleObjects?.[actor.id]?.length) world.visibleObjects[actor.id] = [];
    };''','''      if (world.visibleObjects?.[actor.id]?.length) world.visibleObjects[actor.id] = [];
      // Perception loss ends continuous recognition too; an old episode is not a live identity grant.
      if (Object.keys(world.perceptionEpisodes?.[actor.id] ?? {}).length)
        world.perceptionEpisodes![actor.id] = {};
    };''')
 s=s.replace("        component.action?.type === 'pickup'\n", "        component.action?.type === 'pickup' ||\n        component.action?.type === 'follow'\n")
 s=s.replace("  if (action.type === 'follow') {\n    const error", "  if (action.type === 'follow') {\n    if (capabilityBlocked(world, actor, 'actions') || capabilityBlocked(world, actor, 'locomotion')) {\n      failAction(world, actor, events, 'following is no longer available to this body.');\n      return;\n    }\n    const error")
 return s
edit('packages/domain/src/kernel.ts',kernel)
def grounding(s):
 s=s.replace('  bindNavigationInvocation,','  observerDescription,\n  bindNavigationInvocation,',1)
 s=s.replace('normalize(e.name) === name', "normalize(observerDescription(world, actorId, e.id)).replace(/^(?:an?|the)\\s+/u, '') === name")
 s=s.replace('`Follow ${target.name} [${target.id}]', '`Follow ${observerDescription(world, actorId, target.id)} [${target.id}]')
 s=s.replace('          name: e.name,','          name: observerDescription(world, actorId, e.id),')
 s=s.replace("${observed.visibleEntities.find((e) => e.id === command.targetId)?.name ?? 'the selected actor'}", "${observerDescription(world, actorId, command.targetId)}")
 return s
edit('apps/server/src/action-grounding.ts',grounding)
def upgrades(s):
 anchor='export function upgradeWorldState(world: WorldState): void {'
 extra='''
  // Preserve old facts and IDs while ordering raw source arrays for cursor reads.
  // Missing sequence remains unknown (zero); malformed numeric data is left for validation.
  for (const rows of [...Object.values(world.memories ?? {}), ...Object.values(world.experience?.awareness ?? {})]) {
    if (Array.isArray(rows) && rows.every(row => row && Number.isSafeInteger(row.sequence ?? 0) && (row.sequence ?? 0) >= 0) &&
        rows.some((row, i) => i > 0 && (row.sequence ?? 0) < (rows[i - 1]!.sequence ?? 0)))
      rows.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }
'''
 if s.count(anchor)!=1:raise ValueError('Upgrade boundary changed')
 return s.replace(anchor,anchor+extra)
edit('apps/server/src/upgrade-world.ts',upgrades)
def profiler(s):
 s=s.replace("  const [settings] = await once(process, 'message');", "  const settingsReady = once(process, 'message');\n  process.send({booted:true});\n  const [settings] = await settingsReady;")
 s=s.replace("  process.send({ready:true});\n  await once(process,'message');", "  const go = once(process,'message');\n  process.send({ready:true});\n  await go;")
 s=s.replace("  child.on('message',message=>{if(message.ready)", "  result.catch(()=>{}); // The startup path can fail before the caller awaits the result.\n  child.on('message',message=>{if(message.booted)child.send(settings);if(message.ready)")
 s=s.replace('  child.send(settings);\n','')
 return s
edit('scripts/performance/profile-server.mjs',profiler)
