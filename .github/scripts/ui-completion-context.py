"""Complete the same recovery patch for both existing checkpoint entry points."""
from pathlib import Path
import runpy

stage = runpy.run_path('.github/scripts/ui-completion.py')
change, once = stage['change'], stage['once']

change('packages/protocol/src/request-recovery.ts', lambda text: text + """
/** The recovery namespace survives a checkpoint's own timeline replacement, but not a
 * different account, session, grant, character or audience. It grants no authority. */
export interface CheckpointContext {
  scope: string;
  recoveryScope: string;
  timeline: string;
}
""")
change('packages/protocol/src/index.ts', lambda text: once(once(text,
    'RequestRecoveryResult, CheckpointRequest', 'RequestRecoveryResult, CheckpointRequest, CheckpointContext'),
    'export interface GameView {', "export interface GameView {\n  checkpoint?: import('./request-recovery.js').CheckpointContext;"))

owners = [path for path in Path('packages/protocol/src').glob('*.ts') if 'export interface OperationsView {' in path.read_text()]
assert len(owners) == 1, owners
change(str(owners[0]), lambda text: once(text, 'export interface OperationsView {', "export interface OperationsView {\n  checkpoint?: import('./request-recovery.js').CheckpointContext;"))

change('apps/server/src/authority.ts', lambda text: once(text,
    'const key = (worldId: string, id: string) => JSON.stringify([worldId, id]);',
    """/** Only checkpoint outcome descriptions cross their own load's timeline change.
 * Every live read still requires the complete current scope and save capability. */
export const checkpointRecoveryScopeKey = (scope: RequestScope) => {
  const { timelineId: _timelineId, ...privateScope } = commandRecoveryFields(scope);
  return hash(JSON.stringify(privateScope));
};
const key = (worldId: string, id: string) => JSON.stringify([worldId, id]);"""))

change('apps/server/src/view.ts', lambda text: once(once(text,
    '  commandRecoveryScopeKey,', '  commandRecoveryScopeKey,\n  checkpointRecoveryScopeKey,'),
    '    schemaVersion: 2,\n    access: {',
    """    schemaVersion: 2,
    checkpoint: service.mayManageSaves(scope) ? {
      scope: scopeKey(scope),
      recoveryScope: checkpointRecoveryScopeKey(scope),
      timeline: service.timelineId,
    } : undefined,
    access: {"""))

def operations(text):
    text = once(text, 'AuthorityError, scopeKey, type Capability', 'AuthorityError, scopeKey, checkpointRecoveryScopeKey, type Capability')
    text = once(text, "  'POST /api/saves/list',", "  'POST /api/saves/list',\n  'POST /api/saves/receipt',")
    text = once(text, '      generation: this.service.generation,', """      generation: this.service.generation,
      checkpoint: this.service.mayManageSaves(scope) ? {
        scope: scopeKey(scope),
        recoveryScope: checkpointRecoveryScopeKey(scope),
        timeline: this.service.timelineId,
      } : undefined,""")
    return text
change('apps/server/src/operations-routes.ts', operations)

change('apps/client/src/retained-request.ts', lambda text: text + """
/** One retained checkpoint operation for the native account/session/grant/character scope. */
export const checkpointRequestKey = (scope: string) => `open-legend:checkpoint-request:${scope}`;

/** Scope adoption is independent of unrelated draft markers or storage areas. */
export function pruneCheckpointRequests(scope: string | undefined): void {
  try {
    const keep = scope ? checkpointRequestKey(scope) : undefined;
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith('open-legend:checkpoint-request:') && key !== keep) sessionStorage.removeItem(key);
  } catch {
    // Inaccessible storage never grants permission to submit or disclose a retained request.
  }
}
""")

def saves(text):
    text = once(text, 'boundedText, readRetainedRequest', 'checkpointRequestKey, boundedText, readRetainedRequest')
    text = once(text, 'ApiResult, CheckpointRequest, GameView, RequestRecoveryResult', 'ApiResult, CheckpointContext, CheckpointRequest, RequestRecoveryResult')
    text = once(text, 'export function GameSavesPanel({\n  view,', 'export function GameSavesPanel({\n  context,')
    text = once(text, '  view: GameView;', '  context: CheckpointContext;')
    text = once(text, """  const recoveryKey = view.access?.privateDraftScope
    ? `open-legend:checkpoint-request:${JSON.stringify([view.access.privateDraftScope, view.worldId, view.player.id])}`
    : undefined;""", '  const recoveryKey = checkpointRequestKey(context.recoveryScope);')
    assert text.count('view.saveTimeline!') == 2
    text = text.replace('view.saveTimeline!', 'context.timeline')
    text = once(text, 'view.access?.scope', 'context.scope')
    return text
change('apps/client/src/ui/game-saves.tsx', saves)
change('apps/client/src/main.tsx', lambda text: once(text,
    'return view.access?.canManageSaves ? <GameSavesPanel key={JSON.stringify([view.access.privateDraftScope, view.worldId, view.player.id])} view={view} visible={visible} /> : null;',
    'return view.access?.canManageSaves && view.checkpoint ? <GameSavesPanel key={view.checkpoint.recoveryScope} context={view.checkpoint} visible={visible} /> : null;'))
change('apps/client/src/ui/operations-console.tsx', lambda text: once(text,
    '<GameSavesPanel visible={selectedTask === \'checkpoints\'} timeDisplay="elapsed" />',
    '{view.checkpoint && <GameSavesPanel key={view.checkpoint.recoveryScope} context={view.checkpoint} visible={selectedTask === \'checkpoints\'} timeDisplay="elapsed" />}'))

def api(text):
    text = "import { pruneCheckpointRequests } from './retained-request';\n" + text
    text = once(text, '  const view = result as OperationsView;', '  const view = result as OperationsView;\n  pruneCheckpointRequests(view.checkpoint?.recoveryScope);')
    text = once(text, '  privateDraftNamespace = view.access?.privateDraftScope ?? \'\';', '  privateDraftNamespace = view.access?.privateDraftScope ?? \'\';\n  pruneCheckpointRequests(view.checkpoint?.recoveryScope);')
    text = once(text, '      clearSessionDrafts(false, previousOwner === owner);', '      clearSessionDrafts(false, true);')
    return text
change('apps/client/src/api.ts', api)
print('Connected both checkpoint entry points; timeline-only replacement preserves only original-result inspection.')
