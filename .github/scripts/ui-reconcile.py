"""Temporary, pinned reconciliation preparation; removed from the final merge tree.

No branch/ref is changed by this script. Source is reconciled in an isolated
Actions directory. Every conflicting file has an explicit reviewed decision.
"""
from pathlib import Path
import os
import re
import subprocess
import sys

UI = '705efb2bd102ba151123659b129372aea62b6a79'
MAIN = '1700f3b23a39acfdd14f3a6ab34c8ce330847bc3'
BASE = '741e8cf7e0e3f4ab7b1eea47d32d33e5f483eda6'
ROOT = Path(os.environ['RUNNER_TEMP']) / 'ui-reconciled'
PATTERN = re.compile(r'^<<<<<<< [^\n]+\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]+\n?', re.M | re.S)

def git(*args):
    return subprocess.check_output(['git', *args], text=True)

def source(ref, path):
    return git('show', f'{ref}:{path}')

def replace(text, old, new, count=1):
    assert text.count(old) == count, (old[:100], text.count(old), count)
    return text.replace(old, new)

def between(text, start, end):
    return text[text.index(start):text.index(end, text.index(start))]

def union(a, b):
    return a + b

def api_classes(a, b):
    return between(b, '/**', 'export function clearAccess') + a

def api_owner(a, b):
    return a

def operations_import(a, b):
    return next(line + '\n' for line in b.splitlines() if 'ACCESS_CAPABILITY_TEXT' in line) + a

def entry(a, b):
    return a + '            </>\n' + b[b.index("          ) : status.kind === 'creation-host'"):]

def agent_identity(a, b):
    return a[:a.index('  const selectionKey')] + b

def review_heading(a, b):
    return a.replace('Review exact change', "{plan.kind === 'creation' ? 'Review and start this world' : 'Review exact change'}")

def review_result(a, b):
    return re.sub(r'^\s*\{plan\.result\?\.message &&.*?</p>\s*\)\}\s*', '', b, count=1, flags=re.S)

def catalogue_names(a, b):
    return a

def base_activity(a, b):
    return b[:b.index('  const view: ActivityView')] + a

def base_imports(a, b):
    return b + "import { BASE_WORLD_PRESENTATION } from './presentation.js';\n"

def seed_items(a, b):
    return a + b[b.index('  for (const material'):]

def viewed_resource(a, b):
    return a.replace('if (entity.resource)', 'if (entity.resource && !entity.resource.cast)')

def viewed_fishing(a, b):
    return a + b[b.index('          for (const option of fishingOptions'):]

def restore(a, b):
    return a.replace('this.reconcileParticipation()', 'this.reconcileParticipation(true)')

def status_table(a, b):
    current = next(line for line in b.splitlines() if '[NC]' in line)
    old = next(line for line in a.splitlines() if '[NC]' in line)
    cells = old.split('|')
    cells[-2] = current.split('|')[-2]
    return a.replace(old, '|'.join(cells))

def architecture(a, b):
    return a.replace('cooking without raw meat', "cooking without the selected recipe's ingredients")

def changelog(a, b):
    heading = '## October 8, 2026'
    if heading in b:
        index = b.index(heading)
        return b[:index] + a.rstrip() + '\n\n' + b[index:]
    return b.rstrip() + '\n\n' + a

# Each decision applies only to a displayed conflict hunk, not to an entire file.
DECISIONS = {
    'apps/client/src/api.ts': [api_classes, api_owner],
    'apps/client/src/design-system/layout.css': ['ui', 'ui'],
    'apps/client/src/main.tsx': [union, 'ui'],
    'apps/client/src/ui/entry-screen.tsx': [entry],
    'apps/client/src/ui/inventory.tsx': [union, 'ui', 'ui'],
    'apps/client/src/ui/operations-console.tsx': [operations_import, 'ui'],
    'apps/client/src/ui/panels.tsx': ['ui', 'ui', 'ui', 'ui'],
    'apps/client/src/ui/quick-actions.tsx': ['ui', 'ui'],
    'apps/client/src/ui/world-agent-review.tsx': [review_heading, 'main', review_result],
    'apps/client/src/ui/world-agent-session.tsx': ['ui', 'ui'],
    'apps/client/src/ui/world-agent.tsx': [union, agent_identity, 'ui'],
    'apps/client/src/ui/world-events.tsx': ['ui', 'main', union, union, 'main'],
    'apps/server/src/action-catalogue.ts': ['main', 'main', 'main'],
    'apps/server/src/action-descriptions.ts': ['ui'],
    'apps/server/src/context.test.ts': ['main', 'ui'],
    'apps/server/src/http.test.ts': ['main', 'main', 'main'],
    'apps/server/src/inventory-view.ts': [union],
    'apps/server/src/spatial-http.test.ts': ['main', 'main', 'main', 'main', 'main'],
    'apps/server/src/view.ts': [viewed_resource, viewed_fishing],
    'apps/server/src/world-service.ts': [restore],
    'archive/05-project/implementation-status.md': [status_table],
    'docs/architecture.md': [architecture],
    'docs/documentation-changelog.md': [changelog],
    'docs/maintainers/README.md': ['main'],
    'docs/ui-ux/research.md': [union],
    'packages/domain/src/kernel.ts': [lambda a, b: b + a],
    'packages/domain/src/types.ts': [union],
    'packages/domain/src/worlds/base/action-views.ts': [base_activity],
    'packages/domain/src/worlds/base/items.ts': [union, union],
    'packages/domain/src/worlds/base/landscape.ts': ['ui'],
    'packages/domain/src/worlds/base/world.ts': [base_imports, seed_items],
    'packages/protocol/src/index.ts': [union],
}
assert git('merge-base', UI, MAIN).strip() == BASE
result = subprocess.run(['git', 'merge-tree', '--write-tree', UI, MAIN], text=True, capture_output=True)
assert result.returncode in (0, 1), result.stderr
tree = result.stdout.splitlines()[0]
paths = set(re.findall(r'^\d+ [0-9a-f]+ [123]\t(.+)$', result.stdout, re.M))
assert paths == set(DECISIONS), (paths - set(DECISIONS), set(DECISIONS) - paths)
ROOT.mkdir()
archive = subprocess.Popen(['git', 'archive', tree], stdout=subprocess.PIPE)
subprocess.run(['tar', '-xf', '-', '-C', str(ROOT)], stdin=archive.stdout, check=True)
archive.stdout.close()
assert archive.wait() == 0
hunks = {}
for path, decisions in DECISIONS.items():
    data = source(tree, path)
    matches = list(PATTERN.finditer(data))
    assert len(matches) == len(decisions), (path, len(matches), len(decisions))
    hunks[path] = [(match[1], match[2]) for match in matches]
    iterator = iter(decisions)
    def resolve(match):
        decision = next(iterator)
        return match[1] if decision == 'ui' else match[2] if decision == 'main' else decision(match[1], match[2])
    (ROOT / path).write_text(PATTERN.sub(resolve, data))

def edit(path, fn):
    file = ROOT / path
    file.write_text(fn(file.read_text()))

# Keep independent session/local cleanup while using unambiguous identity fields.
edit('apps/client/src/api.ts', lambda s: replace(s,
    "const owner = `${view.worldId}:${view.access?.accountId ?? 'local-player'}:${view.access?.actorId ?? view.player.id}`;",
    "const owner = JSON.stringify([view.worldId, view.access?.accountId ?? 'local-player', view.access?.actorId ?? view.player.id]);"))

# The paired inventory already owns explicit inspection. Refresh that exact page
# after success; do not add a second inspection or repeat uncertain operations.
def inventory(s):
    s = replace(s, '      item.comparison,\n', '      item.comparison,\n      item.recipeRecord,\n      item.materialCondition,\n')
    s = replace(s,
        '          if (alive.current && inspectedSelection.current === identity && !result.ok)\n            operations.setMessage(result.message);',
        '          if (alive.current && inspectedSelection.current === identity) {\n            if (result.ok) collection(side).refresh();\n            else operations.setMessage(result.message);\n          }')
    native = source(MAIN, 'apps/client/src/ui/inventory.tsx')
    record = between(native, '                {item.recipeRecord && (', '                <dl') if '                {item.recipeRecord && (' in native else ''
    if not record:
        match = re.search(r'(\s*\{item\.recipeRecord && \(.*?\n\s*\)\})', native, re.S)
        assert match
        record = match[1]
    else:
        match = re.search(r'(\s*\{item\.recipeRecord && \(.*?\n\s*\)\})', record, re.S)
        assert match
        record = match[1]
    s = replace(s, '                      <dl className="ol-inventory-facts">', record + '\n                      <dl className="ol-inventory-facts">')
    material = re.search(r'(\s*\{item\.materialCondition && \(.*?\n\s*\)\})', native, re.S)
    assert material
    s = replace(s, '                      <p>{item.description}</p>', '                      <p>{item.description}</p>' + material[1])
    return s
edit('apps/client/src/ui/inventory.tsx', inventory)
edit('apps/client/src/ui/operations-console.tsx', lambda s: re.sub(r'(?<![\w])CAPABILITY_TEXT\b', 'ACCESS_CAPABILITY_TEXT', s))

# Combine source filtering with output search/selection, rather than restoring
# the previous disclosure-list layout. Practice belongs in Capabilities.
def panels(s):
    s = replace(s, "  const [query, setQuery] = useState('');", "  const [query, setQuery] = useState('');\n  const [creatorFilter, setCreatorFilter] = useState('all');")
    s = replace(s, '`${recipe.output.name} ${recipe.name}`.toLocaleLowerCase().includes(search),', "`${recipe.output.name} ${recipe.name}`.toLocaleLowerCase().includes(search) &&\n      (creatorFilter === 'all' || recipe.origin === creatorFilter),")
    source_filter = hunks['apps/client/src/ui/panels.tsx'][1][1].split('        {recipes.length ? (')[0]
    s = replace(s, '        <label className="ol-task-search">', source_filter + '        <label className="ol-task-search">')
    s = s.replace('Change or clear the output search.', 'Change the method source or clear the output search.')
    s = s.replace('Describe a useful tool and discover a way to make it.', 'Learn from an accessible recipe record, or describe a useful tool to invent a method with live AI.')
    s = s.replace('!!search && !recipes.some', "(!!search || creatorFilter !== 'all') && !recipes.some")
    practice = between(hunks['apps/client/src/ui/panels.tsx'][3][1], '      {!!view.player.practice?.length', '      <Section title="Traits">')
    s = replace(s, '          <OutingStatus view={view} connected={connected} command={command} />', practice + '\n          <OutingStatus view={view} connected={connected} command={command} />')
    s = replace(s, 'const equipped = view.player.inventory.find((item) => item.equipped);', 'const equipped = view.player.inventory.filter((item) => item.equipped);')
    s = replace(s, '<Section title="Equipped item">', '<Section title="Equipped items">')
    s = replace(s, '{equipped ? (\n              <div className="ol-character-equipment">', '{equipped.length ? equipped.map((item) => (\n              <div className="ol-character-equipment" key={item.id}>')
    start = s.index('<Section title="Equipped items">')
    end = s.index('</Section>', start)
    block = s[start:end].replace('equipped.icon', 'item.icon').replace('equipped.name', 'item.name').replace('equipped.description', 'item.description')
    block = replace(block, '            ) : (', '            )) : (')
    block = block.replace('your equipped item in Inventory', 'your equipped items in Inventory')
    s = s[:start] + block + s[end:]
    return s
edit('apps/client/src/ui/panels.tsx', panels)

# Preserve authored shortcuts and exact-source review, with main's single-pass
# nearest-offer selection instead of sorting every material group.
def shortcuts(s):
    start = s.index('export function gatherQuickActions(')
    end = s.index('\nexport function QuickActions', start)
    fn = '''export function gatherQuickActions(view: GameView): ActionOption[] {
  const nearest = new Map<string, { action: ActionOption; source: GameView['entities'][number]; distance: number }>();
  for (const source of view.entities) {
    let distance: number | undefined;
    for (const action of source.actions) {
      if (!action.shortcut) continue;
      distance ??= distance3D(source.position, view.player.position);
      const previous = nearest.get(action.shortcut.id);
      if (!previous || Number(action.enabled) > Number(previous.action.enabled) ||
        (action.enabled === previous.action.enabled &&
          (distance < previous.distance || (distance === previous.distance && source.id.localeCompare(previous.source.id) < 0)))) {
        nearest.set(action.shortcut.id, { action, source, distance });
      }
    }
  }
  return [...nearest.values()].map(({ action, source }) => ({
    ...action,
    id: action.shortcut!.id,
    label: `${action.shortcut!.label} · ${source.name}`,
    icon: action.shortcut!.icon ?? action.icon,
  }));
}
'''
    return s[:start] + fn + s[end:]
edit('apps/client/src/ui/quick-actions.tsx', shortcuts)

# Retain the redesigned workspace, inserting the current native opening chooser
# and its exact selected draft into the existing review flow.
def session(s):
    native = source(MAIN, 'apps/client/src/ui/world-agent-session.tsx')
    selector = between(native, "      {sessionPurpose === 'creation' && status", '      {!session && status && !nativeOpeningSession')
    s = replace(s, '    <div className="ol-world-agent-session">', '    <div className="ol-world-agent-session">\n' + selector)
    s = replace(s, '            <UsageRemaining\n', '            {!nativeOpeningSession && <UsageRemaining\n')
    s = replace(s, '              available={connected}\n            />', '              available={connected}\n            />}')
    s = s.replace('{!session && status && (', '{!session && status && !nativeOpeningSession && (')
    s = s.replace('{!session && status && !status.availability.configured && (', '{!session && status && !nativeOpeningSession && !status.availability.configured && (')
    s = s.replace("initialPurpose === 'invention'", "sessionPurpose === 'invention'")
    s = replace(s, "                : 'One conversation to investigate and create'", "                : sessionPurpose === 'creation' ? 'Describe a world' : 'One conversation to investigate and create'")
    s = replace(s,
        "              The agent can inspect this world's mechanics and prepare changes. Live changes require\n              your review. Starting a conversation does not use your allowance.",
        "              {sessionPurpose === 'creation'\n                ? 'Describe the opening you want. This funded conversation can prepare a supported new world; it cannot replace the current one.'\n                : \"The agent can inspect this world's mechanics and prepare changes. Live changes require your review.\"}{' '}\n              Starting a conversation does not use your allowance.")
    s = replace(s, '              onOpenReview={setReview}\n', '              onOpenReview={setReview}\n              requestedSelection={requestedSelection}\n')
    s = replace(s, '                placeholder="Investigate, design, or ask for a change…"', '                placeholder={sessionPurpose === \'creation\' ? \'Describe a new world opening…\' : \'Investigate, design, or ask for a change…\'}')
    hint = re.search(r'(\s*\{nativeOpeningSession && \(.*?\n\s*\)\})', native, re.S)
    assert hint
    s = replace(s, '              <ConversationComposer\n', hint[1] + '\n              <ConversationComposer\n')
    # Exact tuple boundaries, not delimiter-joined IDs that can collide.
    s = re.sub(r'contentRevision=\{turns\s*\.map\(\s*\(turn\) =>\s*`\$\{turn.id\}:\$\{turn.revision \?\? 0\}:\$\{turn.progress\?\.revision \?\? 0\}:\$\{turn.response\?\.code \?\? \'\'\}`,\s*\)\s*\.join\(\'\|\'\)\}',
               "contentRevision={JSON.stringify(turns.map((turn) => [turn.id, turn.revision ?? 0, turn.progress?.revision ?? 0, turn.response?.code ?? '']))}", s)
    return s
edit('apps/client/src/ui/world-agent-session.tsx', session)

def agent(s):
    buttons = '''            <Button size="sm" variant="quiet" onPress={() => create('creation', true)}>
              Create a world
            </Button>
            <Button size="sm" variant="quiet" onPress={() => create('creation')}>
              Describe a world
            </Button>
'''
    marker = '              New invention\n            </Button>'
    if marker not in s:
        marker = '            New invention\n          </Button>'
    s = replace(s, marker, marker + '\n' + buttons)
    return s
edit('apps/client/src/ui/world-agent.tsx', agent)

# Keep comparison selection across an evidence correction, but not across the
# viewing identity. Hidden retained panels do not fetch new list/source pages.
def events(s):
    native = source(MAIN, 'apps/client/src/ui/world-events.tsx')
    prefix = between(native, 'type Props = ', 'function ScopedWorldEvents({')
    prefix = replace(prefix, 'revision: string | undefined };', 'revision: string | undefined; visible?: boolean };')
    prefix = replace(prefix,
        'export const WorldEvents = memo(function WorldEvents({',
        'type FilterProps = Props & { type?: string; onTypeChange?: (type: string) => void };\nexport const WorldEvents = memo(function WorldEvents(props: FilterProps) {\n  return <WorldEventScope key={comparisonOwnerScope(props.scope)} {...props} />;\n});\nfunction WorldEventScope({')
    prefix = replace(prefix, '}: Props & { type?: string; onTypeChange?: (type: string) => void }) {', '}: FilterProps) {')
    prefix = replace(prefix, '});\n\nfunction ScopedComparisonOwner', '}\n\nfunction ScopedComparisonOwner')
    prefix = replace(prefix, 'function ScopedComparisonOwner({\n  scope,\n  revision,', 'function ScopedComparisonOwner({\n  scope,\n  revision,\n  visible = true,')
    prefix = replace(prefix, 'if (!comparisonOpen || !activeRefs.length)', 'if (!visible || !comparisonOpen || !activeRefs.length)')
    prefix = replace(prefix, '[comparisonOpen, refsKey, revision]', '[visible, comparisonOpen, refsKey, revision]')
    prefix = replace(prefix, '      revision={revision}\n', '      revision={revision}\n      visible={visible}\n')
    prefix = replace(prefix, 'reloadDetails={() => void loadDetails(activeRefs)}', 'reloadDetails={() => { if (visible) void loadDetails(activeRefs); }}')
    start = s.index('type Props = ')
    end = s.index('function ScopedWorldEvents({', start)
    s = s[:start] + prefix + s[end:]
    signature = between(s, 'function ScopedWorldEvents({', '}: Props & {')
    if 'visible' not in signature:
        s = replace(s, 'function ScopedWorldEvents({\n  scope,\n  revision,', 'function ScopedWorldEvents({\n  scope,\n  revision,\n  visible = true,')
    s = replace(s, '<EventTime time={event.time} /> · {event.type}', '''<EventTime time={event.time} /> · {filters.find(([value]) => value === event.type)?.[1] ?? event.type}
                {event.modality && ` · ${event.modality === 'heard' ? 'Heard' : event.modality === 'observed' ? 'Observed' : event.modality === 'felt' ? 'Felt' : 'Personal experience'}`}''')
    return s
edit('apps/client/src/ui/world-events.tsx', events)

# Both variants use the NPC-native binder; retain only one import and bind from
# the serialized world's current sequence, without a human lethal-confirmation path.
def context_test(s):
    line = "import { domainCommand } from './cognition.js';\n"
    if s.count(line) == 2:
        s = s.replace(line, '', 1)
    a = s.index('  const command = domainCommand(', s.index('async function perform('))
    b = s.index('  expect(result.ok, result.message)', a)
    s = s[:a] + '''  const result = await service.transition((world) =>
    executeCommand(world, domainCommand(candidate.command!, NPC_ID, `test:${world.sequence}:${candidate.id}`)),
  );
''' + s[b:]
    return s
edit('apps/server/src/context.test.ts', context_test)

# Base vocabulary remains authored once, not copied back into the server.
def descriptions(s):
    world_file = ROOT / 'packages/domain/src/worlds/base/presentation.ts'
    presentation = world_file.read_text()
    print('=== presentation description owner ===')
    print(presentation[presentation.index('BASE_ACTION_DESCRIPTIONS'):presentation.index('BASE_ACTION_DESCRIPTIONS') + 1800])
    return s
edit('apps/server/src/action-descriptions.ts', descriptions)

# Do not retain reconciliation machinery in the candidate being qualified.
for path in ('.github/workflows/ui-merge-source.yml', '.github/scripts/ui-reconcile.py'):
    (ROOT / path).unlink(missing_ok=True)
for path in paths:
    assert not PATTERN.search((ROOT / path).read_text()), path
print(f'RECONCILED_DIRECTORY={ROOT}')
print(f'RECONCILED_CONFLICT_FILES={len(paths)}')
print('=== Required action-availability contract ===')
contract = source(MAIN, 'docs/action-capabilities.md')
heading = re.search(r'^#{2,4} Action availability and temporary execution.*$', contract, re.M)
assert heading
end = re.search(r'^#{1,3} ', contract[heading.end():], re.M)
print(contract[heading.start():heading.end() + end.start()] if end else contract[heading.start():])
print('=== Nested domain/protocol instructions ===')
for path in git('ls-tree', '-r', '--name-only', MAIN).splitlines():
    if path.endswith('/AGENTS.md') and (path.startswith('packages/domain/src/') or path.startswith('packages/protocol/src/')):
        print(path + '\n' + source(MAIN, path))
