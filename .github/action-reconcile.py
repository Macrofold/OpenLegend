from pathlib import Path
import difflib, hashlib, json, re, shutil, subprocess, sys

# File-content reconciliation only: no Git branch, commit, reset, rebase or push commands.
root = Path.cwd()
r = root
m = r / 'merged'
u = r / 'upstream'
b = r / 'branch'
a = r / 'ancestor'

def inventory(directory):
    result = {}
    for path in directory.rglob('*'):
        rel = path.relative_to(directory)
        if any(part in ['.git', 'node_modules', '.data', 'dist'] for part in rel.parts):
            continue
        if path.is_file():
            result[str(rel)] = path
    return result

sources = [inventory(directory) for directory in [b, a, u]]
conflicts = []
both = []
for name in sorted(set().union(*(source.keys() for source in sources))):
    paths = [source.get(name) for source in sources]
    values = [path.read_bytes() if path else None for path in paths]
    ours, base, theirs = values
    destination = m / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    if ours == base:
        chosen, path = theirs, paths[2]
    elif theirs == base or ours == theirs:
        chosen, path = ours, paths[0]
    else:
        both.append(name)
        if not all(paths):
            raise RuntimeError('Review required for add/delete conflict: ' + name)
        result = subprocess.run(['diff3', '-m', '-L', 'BRANCH', '-L', 'ANCESTOR', '-L', 'MAIN', *map(str, paths)], capture_output=True)
        if result.returncode not in [0, 1]:
            raise RuntimeError(result.stderr.decode())
        chosen, path = result.stdout, paths[0]
        if result.returncode == 1:
            conflicts.append(name)
    if chosen is not None:
        destination.write_bytes(chosen)
        shutil.copymode(path, destination)
    else:
        destination.unlink(missing_ok=True)

pattern = re.compile(r'^<<<<<<< ([^\n]+)\n(.*?)^>>>>>>> MAIN\n', re.S | re.M)
log = []
for name in conflicts:
    path = m / name
    n = [0]
    def replace(match):
        index = n[0]
        n[0] += 1
        tag, body = match.groups()
        left, right = body.split('=======\n', 1)
        ours, _, base = left.partition('||||||| ANCESTOR\n')
        if tag == 'ANCESTOR':
            choice, why = right, 'identical upstream/branch change'
        elif name.endswith('.md'):
            choice = ours.rstrip() + '\n\n' + right if not base.strip() else ours
            why = 'preserve independent additions; reconcile canonical paragraphs below'
        elif name == 'apps/server/src/ai-director.ts':
            choice = "    let attemptBindings: AttemptBinding[] = [];\n    if (nativeReply.operations.some((op) => op.act?.kind === 'proposal')) {\n"
            why = 'retain upstream prior parsing and branch grounding'
        elif name == 'apps/server/src/cognition-contracts.ts':
            if index == 0:
                choice = "export const COGNITION_VERSION = 'cognition-v15-grounded-introductions';\n"
            else:
                choice = right.replace("z.enum(['known', 'proposal'])", "z.enum(['known', 'proposal', 'invoke'])")
                choice = choice.replace('        actionId,\n', '        actionId,\n        invocation: navigationInvocationSchema\n          .extend({ targetEntityId: entityId.nullable() })\n          .nullable(),\n')
            why = 'introductions/capability variants with native invocation'
        elif name in ['apps/server/src/cognition-maintenance.ts', 'apps/server/src/entity-references.ts', 'packages/domain/src/response.ts']:
            choice, why = right, 'retain upstream knowledge-reference distinction'
        elif name == 'apps/server/src/response-context.ts':
            choice = right
            if index == 0:
                choice = choice.replace('Use a known action handle to withdraw an unresolved intent.', 'Use a known action handle to accept the exact revised action or withdraw an unresolved intent; never accept on behalf of another actor.')
            elif index == 1:
                choice = choice.replace('unsupported mechanics require separate invention admission.', 'unsupported mechanics cannot execute; proposals may use explicit partial fulfillment or ask the initiator to accept a revised action.')
            elif index == 2:
                choice = choice.replace('known|expression|proposal', 'known|expression|proposal|invoke').replace(": 'known|proposal'", ": 'known|proposal|invoke'")
                choice = choice.replace('for proposal, fill description (max 500).', 'for proposal, fill description (max 500) and optionally targetEntityId. For invoke use the Native navigation contract and invocation field; other fields stay null.')
            why = 'combine capability-aware prompt and native/partial invocation'
        elif name == 'packages/domain/src/events.ts':
            choice = right if index == 0 else ours
            why = 'episode provenance with batched private acquisition'
        elif name == 'packages/domain/src/kernel.ts':
            choice, why = ours, 'preserve optimized exposure and move episode binding before emission'
        else:
            raise RuntimeError('Unreviewed conflict: ' + name)
        log.append({'path': name, 'section': index, 'resolution': why})
        return choice
    path.write_text(pattern.sub(replace, path.read_text()))

path = m / 'packages/domain/src/kernel.ts'
text = path.read_text()
start = text.index('    // Persistent exposure episodes do not imply identity recognition across a disappearance.', text.index('function* updateEncounters'))
end = text.index('    if (', start + 10)
end = text.index('      );', end) + len('      );\n')
block = text[start:end]
text = text[:start] + text[end:]
text = text.replace('    const acquired = seen.filter((id) => !previouslySeen.has(id));', '    const objectIds = visible.objects;\n' + block + '    const acquired = seen.filter((id) => !previouslySeen.has(id));', 1)
text = text.replace('    const objectIds = visible.objects;\n    const previousObjects', '    const previousObjects', 1)
path.write_text(text)

def paragraph(text, prefix):
    return next(item for item in text.split('\n\n') if item.startswith(prefix))

def use_main_paragraph(name, prefix):
    path = m / name
    text = path.read_text()
    path.write_text(text.replace(paragraph(text, prefix), paragraph((u / name).read_text(), prefix)))

use_main_paragraph('docs/architecture.md', 'The Narrator wakes')
use_main_paragraph('docs/architecture.md', 'Immediate responses use')
path = m / 'docs/architecture.md'
text = path.read_text()
intro = paragraph((u / 'docs/architecture.md').read_text(), 'Cognition offers one-shot')
path.write_text(text.replace('Immediate responses use', intro + '\n\nImmediate responses use', 1))
path = m / 'archive/05-project/implementation-status.md'
text = path.read_text()
upstream = (u / 'archive/05-project/implementation-status.md').read_text()
for prefix in ['Editable general/subject knowledge', 'The simulation/cognition audit', 'Cognitive actors can select']:
    options = [item for item in upstream.split('\n\n') if item.startswith(prefix)]
    if not options:
        continue
    replacement = options[0].replace('This does not implement sustained target following.', 'The separate native follow activity below provides ongoing visible-target proximity; this one-shot approach does not replace it.')
    old = [item for item in text.split('\n\n') if item.startswith(prefix)]
    if prefix.startswith('Editable') and old:
        text = text.replace(old[0], replacement)
    elif replacement not in text:
        text += '\n\n' + replacement
text = text.replace('schema-9 implementation', 'current spatial implementation').replace('Schema-9 world', 'Current world').replace('Schema 9 retains', 'The current model retains')
path.write_text(text.rstrip() + '\n')
path = m / 'docs/maintainers/TODO.md'
text = path.read_text()
old = [line for line in text.splitlines() if line.startswith('- [ ] Cover individual named episodes')]
if old:
    new = next(line for line in (u / 'docs/maintainers/TODO.md').read_text().splitlines() if line.startswith('- [ ] Cover observer-named episodes'))
    text = text.replace(old[0], new)
path.write_text(text)
path = m / 'docs/maintainers/performance.md'
text = path.read_text()
start = text.index('\n', text.index('## Delivery status')) + 1
end = text.index('\n\nThis pass', start)
text = text[:start] + '\nPF00/PF01/PF02/PF03/PF04/PF05/PF08/PF09 include delivered shared work; PF10 includes the existing local SQLite worker only. Remaining qualification stays unchecked. Further connection isolation, diagnostics batching, command grouping and CPU-worker work remain measured gates. PostgreSQL is the primary full-server performance baseline under [profiling policy](performance-profiling.md#primary-performance-baseline); SQLite-specific optimization is not production scaling. PF11 remains deferred.' + text[end:]
path.write_text(text)
(r / 'reconciliation.json').write_text(json.dumps({'main': 'fdcbd31fc9e4eb31daaf00d997648aba588c8577', 'source': '94a7682aee9f100ccb54e073969bb4ed4f9fea49', 'ancestor': 'fc01e19b30060e6c7213b1c5405be13df209297e', 'conflicts': conflicts, 'bothChanged': both, 'resolutions': log}, indent=2) + '\n')
for name, path in inventory(m).items():
    if path.suffix in ['.ts', '.tsx', '.md'] and re.search(r'^(<<<<<<<|=======|>>>>>>>)', path.read_text(), re.M):
        raise RuntimeError('Unresolved marker: ' + name)
print('Reconciled', len(conflicts), 'files and', len(log), 'sections. No repository reference was changed.')
