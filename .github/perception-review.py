from pathlib import Path
p=Path('apps/server/src/ai-director.ts');s=p.read_text()
s=s.replace('            world.perceptionFeatures,\n','')
s=s.replace('// Goal edits refresh interests but do not buy a new response by themselves.', '// Relevant intent/knowledge changes create an ordinary opportunity, not mandatory generation.\n          // docs/architecture.md#change-driven-exposure-and-reaction-intake\n          goal: currentGoal(actor),\n          knowledge: (world.knowledge[entity.id] ?? []).map(record => record.recipeId),')
s=s.replace('deferredCount: latest.length - latest.length,','deferredCount: latest.length < 8 ? 0 : null,\n              selectedSourceLimit: 8,')
p.write_text(s)
p=Path('packages/domain/src/experience.ts');s=p.read_text().replace('const as = a?.sequence ?? Infinity,','const as = a ? (a.sequence ?? 0) : Infinity,');p.write_text(s)
