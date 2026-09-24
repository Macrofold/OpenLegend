from pathlib import Path
p=Path('packages/domain/src/perception-frame.ts')
s=p.read_text()
old='  const samples = Object.values(plain(world.entities)).map((entity) =>\n    captureSource(world, entity),\n  );'
if s.count(old)!=1:raise RuntimeError('Expected whole-roster snapshot capture')
s=s.replace(old,'''  // Read only needed actor scalars; current(entities) would recursively copy their private state.
  // Unchanged inert entities still reuse the immutable per-entity descriptor in captureSource.
  const samples = Object.values(world.entities).map(entity => captureSource(world, entity));''')
p.write_text(s)
