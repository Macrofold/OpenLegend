import runpy
from pathlib import Path
runpy.run_path('.github/intake-edit.py')
p=Path('apps/server/src/ai-director.ts');s=p.read_text();s=s.replace('unseen.length','latest.length');p.write_text(s)
p=Path('packages/domain/src/perception-frame.ts');s=p.read_text();s=s.replace('Object.values(world.entities).map(entity => captureSource(world, entity))','Object.values(plain(world.entities)).map(entity => captureSource(world, entity))');p.write_text(s)
p=Path('apps/server/src/actor-work.ts');s=p.read_text();s=s.replace('if (this.lastWorld === world && this.context === context) return;', 'if (Object.isFrozen(world) && this.lastWorld === world && this.context === context) return;');p.write_text(s)
p=Path('packages/domain/src/events.ts');s=p.read_text().replace('${source.name} notices ${world.entities[targetId]!.name}', '${source.name} noticed ${world.entities[targetId]!.name}');p.write_text(s)
