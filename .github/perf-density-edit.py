import pathlib,subprocess
r=pathlib.Path.cwd()
def edit(p,f):
 x=r/p;x.write_text(f(x.read_text()))
# Patch elimination had no decisive broad benefit and adds a retained-prefix scan.
# Keep the prior append certification while fixing the actual copying boundary.
subprocess.run(['git','checkout','3be6601f862a48fe1facf951943f53c16024cb1f','--','packages/domain/src/draft.ts'],check=True)
def evidence(s):
 old='''      return cloneValue(change.entry);
    });'''
 new='''      const entry = cloneValue(change.entry);
      // Freeze the owned copy before insertion, not a detached current(rows) snapshot.
      // Fresh drafts can still edit it; caller-owned builder data stays untouched.
      // docs/architecture.md#private-perception-and-evidence-batches
      return isDraft(world) && Object.isFrozen(original(world)) ? freeze(entry, true) : entry;
    });'''
 if s.count(old)!=1:raise ValueError('Evidence copy binding changed')
 s=s.replace(old,new)
 start=s.index('  for (const id of actorIds) {',s.index('export function* sealNativeEvidence'))
 end=s.index('\n}',start)
 s=s[:start]+s[end:]
 s=s.replace('  actorIds: readonly string[],\n): Generator<void, void, void>', '): Generator<void, void, void>')
 return s
edit('packages/domain/src/experience.ts',evidence)
edit('packages/domain/src/kernel.ts',lambda s:s.replace('sealNativeEvidence(world, events, participants.actors)','sealNativeEvidence(world, events)'))
def capture(s):
 # Scalar reads from current draft state, never original transforms or copied actor subtrees.
 old='''  const samples = Object.values(plain(world.entities)).map((entity) =>
    captureSource(world, entity),
  );'''
 new='''  // Reading scalar fields avoids materializing every changed action/status/agency subtree.
  // Keep live draft values so same-step movement and capability changes remain visible.
  const samples = Object.keys(world.entities).map((id) => captureSource(world, world.entities[id]!));'''
 if s.count(old)!=1:raise ValueError('Capture boundary changed')
 return s.replace(old,new)
edit('packages/domain/src/perception-frame.ts',capture)
