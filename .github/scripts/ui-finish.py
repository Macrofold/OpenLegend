"""Apply scoped corrections to the saved completion candidate and its finite probes."""
from pathlib import Path


def edit(path, changes):
    file = Path(path)
    text = file.read_text()
    for before, after in changes:
        assert text.count(before) == 1, (path, before[:100], text.count(before))
        text = text.replace(before, after, 1)
    file.write_text(text)


plan = Path('docs/projects/game-interaction-redesign-completion.md')
plan.write_text(plan.read_text() + '''

## Integrated recovery continuation — October 14

Development now includes GitHub `Macrofold/OpenLegend` `refs/heads/main` at
`b72e9d9aab8072eb1b5ae9d25f620a4421509148`, through normal merge `28baace2983f60baff0179def860c089af6b6e6d`.
Keep the revised creator removal controls and single-scroll review together with
this branch's task navigation. The earlier verification remains source-specific.

The running-game recovery checks exposed two additional presentation/lifetime
problems: opening Checkpoints leaves focus in the Game menu, and the application
reset erases the pending checkpoint when its own load changes the timeline.
Selecting a task from Game will close that navigation menu and move focus into the
selected task without trapping it. A load transition may retain only the exact
read-only checkpoint description whose server-issued recovery scope still matches;
old executable commands and unrelated private drafts remain cleared. Changed
account, grant, character or session must not retain that description.

The clockwork preset deliberately reuses real shelter materials and the existing
practice target. Install their exact attribute definitions and the shelter activity
as selected authored dependencies, without installing human hunger/energy or
turning wilderness defaults into mandatory engine rules. Current validation stays
strict. Verify all three existing presets, then actual recharge and recovery.

The recovery probes use the visible Replace current work control and inspect the
actual generated pre-load protection checkpoint through the existing save owner.
A missing fixed `before-load` row cannot establish protection. Preserve the original
request counts, exact content, native effects and all existing deadlines. These
changes do not close wider native, accessibility or uncoached-play requirements.
''')

edit('apps/client/src/ui/action-attempts.tsx', [
    ('  targetId?: string;\n  timeline: string;', '  targetId?: string;\n  subjectLabel: string;\n  timeline: string;'),
    ("    ['enqueue', 'replace', 'interrupt'].includes(String(value.mode)) &&", "    typeof value.mode === 'string' &&\n    ['enqueue', 'replace', 'interrupt'].includes(value.mode) &&\n    'subjectLabel' in value && boundedText(value.subjectLabel, 500) &&"),
    ('    retainedRef.current = next;\n    setRetained(next);', "    retainedRef.current = next;\n    submission.current = next.status === 'pending' ? next.request : null;\n    setRetained(next);"),
    ("  const [busy, setBusy] = useState(false);", "  const [busy, setBusy] = useState(false);\n  const [requestPhase, setRequestPhase] = useState<'sending' | 'checking' | null>(null);"),
    ('      targetId: targetId || undefined,\n      mode:', "      targetId: targetId || undefined,\n      subjectLabel: currentSubject?.name ?? 'No fixed subject',\n      mode:"),
    ("      const { timeline: _timeline, ...body } = submitted;\n      const result = await post('/api/action-attempt', body);", "      setRequestPhase('sending');\n      const { timeline: _timeline, subjectLabel: _subjectLabel, ...body } = submitted;\n      const result = await post('/api/action-attempt', body);"),
    ("      const outcome = await post<RequestRecoveryResult>('/api/action-attempt/receipt', submitted);", "      setRequestPhase('checking');\n      const { subjectLabel: _subjectLabel, ...request } = submitted;\n      const outcome = await post<RequestRecoveryResult>('/api/action-attempt/receipt', request);"),
    ('          <strong>Original action result not confirmed</strong>', "          <strong>{requestPhase === 'sending' ? 'Sending original action…' : requestPhase === 'checking' ? 'Checking original action…' : 'Original action result not confirmed'}</strong>"),
    ('              <p>{retained.request.text}</p>', '              <p>{retained.request.text}</p>\n              <p className="ol-caption">Original subject: {retained.request.subjectLabel}</p>'),
])
path = Path('apps/client/src/ui/action-attempts.tsx')
text = path.read_text()
needle = '      inFlight.current = false;\n      if (alive.current) setBusy(false);'
assert text.count(needle) == 2
path.write_text(text.replace(needle, '      inFlight.current = false;\n      if (alive.current) { setRequestPhase(null); setBusy(false); }'))

edit('apps/client/src/ui/game-saves.tsx', [
    ('{confirm?.save.id === save.id && !unresolved && (', '{confirm?.save.id === save.id && (!unresolved || rowBusy) && ('),
    ('            <strong>Checkpoint result not confirmed</strong>', "            <strong>{creating || rowBusy ? 'Checkpoint operation in progress…' : checking ? 'Checking original checkpoint…' : 'Checkpoint result not confirmed'}</strong>"),
])
edit('apps/client/src/api.ts', [
    ("        (!preservePendingCommands &&\n          !preserveCheckpointResults &&\n          key.startsWith('open-legend:checkpoint-request:')) ||", "        (!preserveCheckpointResults && key.startsWith('open-legend:checkpoint-request:')) ||"),
    ('export function clearAccess(options?: { preservePendingCommands?: boolean }): void {', 'export function clearAccess(options?: {\n  preservePendingCommands?: boolean;\n  preserveCheckpointResultsFor?: string;\n}): void {'),
    ('  clearSessionDrafts(options?.preservePendingCommands);', '  clearSessionDrafts(options?.preservePendingCommands, !!options?.preserveCheckpointResultsFor);\n  pruneCheckpointRequests(options?.preserveCheckpointResultsFor);'),
])
edit('apps/client/src/main.tsx', [
    ('          clearAccess({ preservePendingCommands: samePrivateOwner });', '''          // A successful load replaces the timeline, but its original outcome
          // remains readable under the same native checkpoint authority. This
          // exception never preserves an executable old-timeline command.
          clearAccess({
            preservePendingCommands: samePrivateOwner,
            preserveCheckpointResultsFor:
              previous.checkpoint?.recoveryScope === next.checkpoint?.recoveryScope
                ? next.checkpoint?.recoveryScope
                : undefined,
          });'''),
    ('  function hide(id: PanelId) {', '''  function openGameTask(id: PanelId) {
    const opener = document.activeElement;
    show(id);
    // Game is navigation, not an editing task. Its focused launcher must not
    // displace the chosen task when the layout becomes a single narrow sheet.
    setOpen((panels) => panels.filter((panel) => panel !== 'game'));
    requestAnimationFrame(() => {
      const target = document.getElementById(`${id}Panel`);
      if (
        target &&
        !target.closest('[hidden]') &&
        (document.activeElement === opener || document.activeElement === document.body)
      )
        target.querySelector<HTMLButtonElement>('.ol-panel-tools button')?.focus({ preventScroll: true });
    });
  }
  function hide(id: PanelId) {'''),
])
path = Path('apps/client/src/main.tsx')
text = path.read_text()
start = text.index("      case 'game':")
end = text.index("      case 'checkpoints':", start)
section = text[start:end]
assert section.count("show('") == 5
path.write_text(text[:start] + section.replace("show('", "openGameTask('") + text[end:])

edit('packages/domain/src/world-presets.ts', [
    ("import { worldPlacement } from './spatial-state.js';", "import { CANOPY_ATTRIBUTES, BASE_CANOPY_ACTIVITY_HOST } from './worlds/base/canopies.js';\nimport { SLING_HANDLING } from './worlds/base/practical-competence.js';\nimport { worldPlacement } from './spatial-state.js';"),
    ('    [integrity, ...RESERVOIR_DEMO_ATTRIBUTES],', "    // This preset reuses the camp's actual shelter materials and practice target.\n    // Their rules remain authored dependencies; human food/energy meters do not.\n    [integrity, ...RESERVOIR_DEMO_ATTRIBUTES, ...CANOPY_ATTRIBUTES, SLING_HANDLING],"),
    ('    [activityHostPin(RESERVOIR_ACTIVITY_HOST)],', '    [activityHostPin(RESERVOIR_ACTIVITY_HOST), activityHostPin(BASE_CANOPY_ACTIVITY_HOST)],'),
])

edit('tests/browser/ui-finish-recovery.spec.ts', [
    ("    await panel.getByRole('radio', { name: 'Replace current work', exact: true }).check();", "    await panel.getByText('Replace current work', { exact: true }).click();\n    await expect(panel.getByRole('radio', { name: 'Replace current work', exact: true })).toBeChecked();"),
    ("    await page.setViewportSize({ width: 390, height: 844 });", "    await page.setViewportSize({ width: 390, height: 844 });\n    await expect(panel).toBeVisible();\n    await expect(page.locator('.ol-game-menu')).toBeHidden();"),
    ("    const timeline = game.service.timelineId;\n    let submissions = 0;", "    const timeline = game.service.timelineId;\n    const protectedTime = game.service.world.simTime;\n    let protectedId: string | undefined;\n    const originalCommit = store.commit.bind(store);\n    store.commit = async (...args) => {\n      const revision = await originalCommit(...args);\n      if (args[4]?.restore) protectedId = args[4].restore.recoveryId;\n      return revision;\n    };\n    let submissions = 0;"),
    ('    const protection = await store.db.prepare("SELECT payload, checksum FROM game_saves WHERE id=\'before-load\'").get();', '    expect(protectedId).toBeTruthy();\n    const protection = await store.saves!.read(game.service.world.id, protectedId!);\n    expect(protection.state.world.simTime).toBe(protectedTime);'),
    ('    expect(await store.db.prepare("SELECT payload, checksum FROM game_saves WHERE id=\'before-load\'").get()).toEqual(protection);', '    expect(await store.saves!.read(game.service.world.id, protectedId!)).toEqual(protection);'),
])
print('Prepared exact action/load recovery, Game task handoff, selected clockwork dependencies and native probes.')
