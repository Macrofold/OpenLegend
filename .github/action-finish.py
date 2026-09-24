from pathlib import Path
import runpy

runpy.run_path('.github/action-slice.py')
# Existing legacy utility typings remain, while all actual current-world admission rejects old saves.
p=Path('packages/domain/src/types.ts');s=p.read_text();s=s.replace('schemaVersion: 10;', 'schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;');p.write_text(s)
# Pause can win the writer queue after the await; repeat only the same unpaid commit, never inference.
p=Path('apps/server/src/ai-director.ts');s=p.read_text();a=s.index('    const result = await this.service.transition(',s.index('  private async playerAction('));b=s.index('    const component =',a)
s=s[:a]+'''    const commit = () => this.service.transition(
      world => {
        this.current(run);
        return commitActorResponse(world, run.job.id, actorId, response, {}, refs, request.expectedPlan, bindings);
      }, undefined, run.job.id,
    );
    let result = await commit();
    while (!result.ok && result.code === 'paused') {
      await this.awaitResume(run, true);
      this.current(run);
      result = await commit();
    }
'''+s[b:];p.write_text(s)
# A matching text from an obsolete manifest is not the newly created pending revision.
p=Path('packages/domain/src/agency.ts');s=p.read_text();s=s.replace('(a) => a.normalized === normalizeAttempt(fulfillment.requested)', '(a) => a.normalized === normalizeAttempt(fulfillment.requested) && a.manifestRevision === world.moduleManifest.revision');p.write_text(s)
# The temporary smoke script lives outside the pnpm server workspace, so resolve its schema dependency there.
p=Path('.github/action-smoke.mjs');s=p.read_text();s=s.replace("import { z } from 'zod';", "import { createRequire } from 'node:module';\nconst { z } = createRequire(new URL('../apps/server/package.json', import.meta.url))('zod');");p.write_text(s)
with Path('docs/maintainers/TODO.md').open('a') as f:f.write('\n- Add runtime action admission coverage for pause winning the serialized writer queue: resuming repeats only the original unpaid commit, never grounding or provider dispatch. Verify a new manifest cannot select an old pending revision with matching text.\n')
