"""Temporary, pinned file reconciliation; no git commands or ref updates."""
from pathlib import Path
import subprocess, re, json

root = Path.cwd()
before = root / '_before'
ancestor = root / '_ancestor'

def paths(directory):
    return {str(p.relative_to(directory)) for p in directory.rglob('*')
            if p.is_file() and '.git' not in p.relative_to(directory).parts}

def resolve(name, main, branch):
    if main == branch: return main
    if name == 'apps/server/src/ai-director.ts':
        if 'attemptBindings' in main:
            return "    let attemptBindings: AttemptBinding[] = [];\n    if (nativeReply.operations.some((op) => op.act?.kind === 'proposal')) {\n"
    if name == 'apps/server/src/cognition-contracts.ts':
        if 'COGNITION_VERSION' in main:
            return "export const COGNITION_VERSION = 'cognition-v15-grounded-introductions';\n"
        if 'capabilities.expressions' in main:
            return main.replace("z.enum(['known', 'proposal'])", "z.enum(['known', 'proposal', 'invoke'])").replace(
                '        actionId,\n', '        actionId,\n        invocation: navigationInvocationSchema.extend({ targetEntityId: entityId.nullable() }).nullable(),\n')
    if name in ['apps/server/src/cognition-maintenance.ts', 'apps/server/src/entity-references.ts', 'packages/domain/src/response.ts']:
        # Main adds remembered-document references and validation; branch-only invocation edits
        # outside these specific hunks remain in the automatic merge.
        return main
    if name == 'apps/server/src/response-context.ts':
        if '## Conversation so far' in main:
            return main.replace('Use a known action handle to withdraw an unresolved intent.',
                'Use a known action handle to accept the exact revised action or withdraw an unresolved intent; never accept on behalf of another actor.')
        if 'sections.push(' in main:
            return main.replace('unsupported mechanics require separate invention admission.',
                'unsupported mechanics cannot execute; proposals may use explicit partial fulfillment or ask the initiator to accept a revised action.')
        if 'Speech: talk=' in main:
            return main.replace("'known|expression|proposal' : 'known|proposal'", "'known|expression|proposal|invoke' : 'known|proposal|invoke'").replace(
                '\"description\":null,\"mode\"', '\"description\":null,\"invocation\":null,\"mode\"').replace(
                'for proposal, fill description (max 500).',
                'for proposal, fill description (max 500) and optionally targetEntityId. For invoke, fill invocation according to Native navigation and leave other action payload fields null.')
    if name == 'packages/domain/src/events.ts':
        if 'entityEpisodes' in main: return main
        if '? memoryPerspective(' in branch: return branch
    if name == 'packages/domain/src/kernel.ts':
        return branch # only the already-inspected encounter blocks; full owner is reconciled below
    if name == 'archive/05-project/implementation-status.md':
        marker = '## Native action capability slice'
        if marker in branch:
            return main.replace('This does not implement sustained target following.',
                'These one-shot approaches remain distinct from the sustained native follow activity described below.') + '\n' + branch[branch.index(marker):]
    if name == 'docs/architecture.md':
        if 'The Narrator wakes' in main: return main
        if 'Immediate responses use' in main:
            prefix = branch.split('Immediate responses use')[0]
            return prefix + main
        if not main.strip() or 'Generated speech carries' in main: return main + branch
    if name == 'docs/maintainers/TODO.md':
        if 'back-to-back different actors' in main:
            return main.replace('same-actor cooldown', 'immediate new-evidence eligibility')
        if '## Simulation and cognition audit' in main: return main + branch
    if name == 'docs/maintainers/performance.md' and 'PF00/PF01' in main:
        return ('PF00/PF01/PF02/PF03/PF04/PF05/PF08/PF09 include delivered work below. '
                'PF10 includes local SQLite worker isolation only; PostgreSQL remains the primary production baseline. '
                'Additional database isolation, simulation/serialization workers and PF06/PF07 remain conditional. '
                'Unmet measurement, failure and population-qualification gates remain unchecked.\n')
    if name == 'docs/verification.md': return main + branch
    raise RuntimeError('Unreviewed conflict in ' + name + '\nMAIN:\n' + main[:1200] + '\nBRANCH:\n' + branch[:1200])

changed = []
conflicts = []
for name in sorted(paths(before) | paths(ancestor)):
    a, b, out = ancestor / name, before / name, root / name
    ab = a.read_bytes() if a.exists() else None
    bb = b.read_bytes() if b.exists() else None
    if ab == bb: continue
    current = out.read_bytes() if out.exists() else None
    if current == bb: continue
    if current == ab:
        if bb is None: out.unlink(missing_ok=True)
        else:
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(bb)
    else:
        if ab is None or bb is None or current is None:
            raise RuntimeError('File-lifecycle conflict: ' + name)
        # -E suppresses changes where both sides already agree, unlike the diagnostic -m output.
        result = subprocess.run(['diff3', '-m', '-E', '-L', 'MAIN', '-L', 'BASE', '-L', 'BRANCH', str(out), str(a), str(b)], capture_output=True)
        if result.returncode not in (0, 1): raise RuntimeError(result.stderr.decode())
        text = result.stdout.decode()
        if result.returncode:
            conflicts.append(name)
            pattern = re.compile(r'^<<<<<<< MAIN\n(.*?)^=======\n(.*?)^>>>>>>> BRANCH\n', re.M | re.S)
            text = pattern.sub(lambda m: resolve(name, m[1], m[2]), text)
        if re.search(r'^(<<<<<<<|=======|>>>>>>>)', text, re.M):
            raise RuntimeError('Unresolved markers: ' + name)
        out.write_text(text)
    changed.append(name)

# The whole encounter owner uses the branch's optimized generator; main's new evidence
# contract requires episode identities to exist BEFORE either living/object acquisition.
name = 'packages/domain/src/kernel.ts'
p = root / name
text = p.read_text()
branch = (before / name).read_text()
start = branch.index('function* updateEncounters(')
end = branch.find('\nexport ', start)
# Use the next top-level declaration, whichever comes first.
for match in re.finditer(r'\n(?:export )?(?:function|const|class) ', branch[start + 1:]):
    candidate = start + 1 + match.start()
    if end < 0 or candidate < end: end = candidate
if end < 0: end = len(branch)
function = branch[start:end]
episode_start = function.index('    // Persistent exposure episodes')
episode_end = function.index('    if (\n      !original.visibleObjects', episode_start)
episodes = function[episode_start:episode_end]
function = function[:episode_start] + function[episode_end:]
# objectIds is required by episode capture and therefore also precedes event construction.
function = function.replace('    const objectIds = visible.objects;\n', '')
insert = function.index('    const previous = original.visiblePeople')
function = function[:insert] + '    const objectIds = visible.objects;\n' + episodes + function[insert:]
merged_start = text.index('function* updateEncounters(')
merged_end = text.find('\nexport ', merged_start)
for match in re.finditer(r'\n(?:export )?(?:function|const|class) ', text[merged_start + 1:]):
    candidate = merged_start + 1 + match.start()
    if merged_end < 0 or candidate < merged_end: merged_end = candidate
if merged_end < 0: merged_end = len(text)
p.write_text(text[:merged_start] + function + text[merged_end:])

# Check the replay did not remove any main guidance or normal CI.
for name in ['AGENTS.md', '.agents/rules/verification.md', '.github/workflows/check.yml']:
    if not (root / name).is_file(): raise RuntimeError('Missing current owner: ' + name)
(root / '_review-paths.json').write_text(json.dumps(sorted(set(changed))))
print('RECONCILIATION', json.dumps({'main':'fdcbd31fc9e4eb31daaf00d997648aba588c8577','source':'94a7682aee9f100ccb54e073969bb4ed4f9fea49','conflicts':conflicts,'changed':changed}, indent=2))
