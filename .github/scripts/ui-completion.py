"""Apply the reviewed recovery changes to exact current owners in the disposable runner.
The runner exports immutable candidate objects; branch publication uses the connector.
"""
from pathlib import Path


def change(path, transform):
    file = Path(path)
    before = file.read_text()
    after = transform(before)
    assert before != after, path
    file.write_text(after)


def once(text, before, after):
    assert text.count(before) == 1, (before[:120], text.count(before))
    return text.replace(before, after, 1)


change('packages/protocol/src/index.ts', lambda text: "export type { RequestRecoveryResult, CheckpointRequest } from './request-recovery.js';\n" + text)


def director(text):
    text = "import { playerActionIdentity } from './action-request-recovery.js';\n" + text
    text = once(text,
        "        id = `human:${digest({ account: authority.accountId, world: authority.worldId, id })}`;\n        const actorId = authority.actorId;",
        "        const identity = playerActionIdentity(this.service.world.id, this.service.timelineId, authority, { requestId: id, text, mode, targetId, slots });\n        id = identity.id;\n        const actorId = authority.actorId;")
    text = once(text, """        const fingerprint = digest({
          kind: 'action',
          world: this.service.world.id,
          timeline: this.service.timelineId,
          actorId,
          text,
          mode,
          targetId,
          slots,
        });""", "        const fingerprint = identity.fingerprint;")
    return text


change('apps/server/src/ai-director.ts', director)


def action_ui(text):
    text = "import { boundedText, readRetainedRequest, retainRequest, releaseRequest, type RetainedRequest } from '../retained-request';\nimport type { ApiResult, RequestRecoveryResult } from '@open-legend/protocol';\n" + text
    text = once(text, "type Mode = 'enqueue' | 'replace' | 'interrupt';", """type Mode = 'enqueue' | 'replace' | 'interrupt';
type PendingAction = {
  requestId: string;
  text: string;
  mode: Mode;
  targetId?: string;
  timeline: string;
};
function validPendingAction(value: unknown): value is PendingAction {
  if (!value || typeof value !== 'object') return false;
  return 'requestId' in value && boundedText(value.requestId, 200) &&
    'text' in value && boundedText(value.text, 500) &&
    'mode' in value && ['enqueue', 'replace', 'interrupt'].includes(String(value.mode)) &&
    'timeline' in value && boundedText(value.timeline, 200) &&
    (!('targetId' in value) || value.targetId === undefined || boundedText(value.targetId, 200));
}""")
    text = once(text, '  const draftKey = view.access?.privateDraftScope', """  const recoveryKey = view.access?.privateDraftScope && view.saveTimeline
    ? `open-legend:action-request:${JSON.stringify([view.access.privateDraftScope, view.worldId, view.player.id, view.saveTimeline])}`
    : undefined;
  const [retained, setRetained] = useState<RetainedRequest<PendingAction>>(() => readRetainedRequest(recoveryKey, validPendingAction));
  const retainedRef = useRef(retained);
  function remember(next: RetainedRequest<PendingAction>) {
    retainedRef.current = next;
    setRetained(next);
  }
  const draftKey = view.access?.privateDraftScope""")
    text = once(text, '  const submission = useRef<{ id: string; body: string } | null>(null);', "  const submission = useRef<PendingAction | null>(retained.status === 'pending' ? retained.request : null);")
    start = text.index('  const send = async () => {')
    end = text.index('  /** One idempotent native command', start)
    text = text[:start] + """  function settle(result: ApiResult, submitted: PendingAction) {
    if (!alive.current || submission.current?.requestId !== submitted.requestId) return;
    releaseRequest(recoveryKey, submitted.requestId);
    submission.current = null;
    remember({ status: 'empty' });
    if (result.jobId) setRequestId(result.jobId);
    setMessage(result.message);
  }
  const send = async () => {
    if (inFlight.current || retainedRef.current.status !== 'empty' || unavailable || targetMissing || !text.trim()) return;
    inFlight.current = true;
    setBusy(true);
    const submitted: PendingAction = {
      requestId: crypto.randomUUID(),
      text: text.trim(),
      targetId: targetId || undefined,
      mode: hasWork ? mode : 'enqueue',
      timeline: view.saveTimeline!,
    };
    try {
      retainRequest(recoveryKey, submitted);
      submission.current = submitted;
      remember({ status: 'pending', request: submitted });
      const { timeline: _timeline, ...body } = submitted;
      const result = await post('/api/action-attempt', body);
      if (!alive.current || submission.current?.requestId !== submitted.requestId) return;
      setMessage(result.message);
      // A failed transport, changed authority or ambiguous storage response is not a refusal
      // of the original action. Only the original explicit admission/refusal settles it.
      if (result.ok || result.jobId || ['invalid-action', 'invalid-input', 'paused', 'actor-unavailable', 'target', 'ai-unavailable', 'busy'].includes(result.code))
        settle(result, submitted);
    } catch (error) {
      if (alive.current) {
        if (!submission.current) remember(readRetainedRequest(recoveryKey, validPendingAction));
        setMessage(error instanceof Error ? error.message : 'The original action result is not confirmed.');
      }
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };
  async function checkOriginalAction() {
    const submitted = submission.current;
    if (inFlight.current || !submitted || !connected) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const outcome = await post<RequestRecoveryResult>('/api/action-attempt/receipt', submitted);
      if (!alive.current || submission.current?.requestId !== submitted.requestId) return;
      if (!outcome.ok) { setMessage(outcome.message); return; }
      if (outcome.scope !== view.access?.scope) throw new Error('Character access changed. Refresh before checking the original action.');
      if (outcome.status === 'resolved') settle(outcome.result, submitted);
      else setMessage(outcome.message);
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : 'The original result is still unknown.');
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }
""" + text[end:]
    text = once(text, '    <div className="ol-character-actions">', """    <div className="ol-character-actions">
      {retained.status !== 'empty' && (
        <div className="ol-notice" role="status">
          <strong>Original action result not confirmed</strong>
          {retained.status === 'pending' ? (
            <>
              <p>{retained.request.text}</p>
              <p className="ol-caption">Original choice: {retained.request.mode === 'replace' ? 'Replace current work' : retained.request.mode === 'interrupt' ? 'Pause current work, then resume' : 'After current work'}.</p>
              <Button variant="quiet" disabled={!connected || busy} onPress={() => void checkOriginalAction()}>
                Check original action
              </Button>
            </>
          ) : <p>This browser could not read the retained request. Restore browser storage access and reload before sending another action.</p>}
          <p className="ol-caption">Your draft can change, but another action will not be submitted until the original result is known. Checking never sends the action again.</p>
        </div>
      )}""")
    text = once(text, 'disabled={!!unavailable || !text.trim() || targetMissing}', 'disabled={!!unavailable || !text.trim() || targetMissing || retained.status !== \'empty\'}')
    return text


change('apps/client/src/ui/action-attempts.tsx', action_ui)


def save_owner(text):
    return once(text, '  async list(\n', """  /** Inspect only the original capture. Existing publication verification also finishes
   * directory synchronization after an ambiguous acknowledgement; it never captures again.
   * No catalogue/history scan, new save identity, load or recovery rotation is performed. */
  async creationResult(worldId: string, id: string, label: string): Promise<'pending' | 'unknown' | 'resolved'> {
    if (this.active?.id === id || this.claim?.id === id || this.waiting?.id === id) return 'pending';
    const prior = await this.files.metadata(id);
    if (!prior) return 'unknown';
    if (prior.worldId !== worldId || prior.label !== label || (prior.kind ?? 'manual') !== 'manual')
      throw new GameSaveError('The saved checkpoint does not match the original creation request.');
    await this.files.confirmPublished(prior);
    return 'resolved';
  }
  async list(
""")


change('apps/server/src/game-saves.ts', save_owner)


def http(text):
    text = "import { recoverPlayerAction } from './action-request-recovery.js';\n" + text
    action_route = "            case '/api/action-attempt': {"
    start = text.index(action_route)
    schema_start = text.index('              const value = z', start)
    schema_end = text.index('                .parse(body);', schema_start) + len('                .parse(body);')
    original_schema = text[schema_start:schema_end]
    receipt_schema = once(original_schema, '                  requestId: requestIdSchema,', '                  requestId: requestIdSchema,\n                  timeline: requestIdSchema,')
    receipt = "            case '/api/action-attempt/receipt': {\n" + receipt_schema + "\n              return send(response, 200, await recoverPlayerAction(service, scope, value));\n            }\n"
    text = once(text, action_route, receipt + action_route)
    text = once(text, "            case '/api/saves/create': {", """            case '/api/saves/receipt': {
              const value = z.discriminatedUnion('operation', [
                z.object({ operation: z.literal('create'), requestId: z.string().uuid(), label: z.string().trim().min(1).max(80), timeline: requestIdSchema }).strict(),
                z.object({ operation: z.literal('load'), requestId: z.string().uuid(), saveId: requestIdSchema, label: z.string().min(1).max(80), timeline: requestIdSchema }).strict(),
              ]).parse(body);
              service.assertScope(scope, 'save');
              if (value.operation === 'create') {
                if (!store.saves) throw new GameSaveError('Checkpoints are unavailable.');
                const status = await store.saves.creationResult(service.world.id, value.requestId, value.label);
                service.assertScope(scope, 'save');
                const message = status === 'resolved' ? 'The original checkpoint was created.' : status === 'pending' ? 'The original checkpoint is still being created. Nothing was resubmitted.' : 'The original checkpoint has no confirmed published result. Nothing was resubmitted.';
                return send(response, 200, { ok: true, scope: scopeKey(scope), status, message, ...(status === 'resolved' ? { result: { ok: true, code: 'saved', message } } : {}) });
              }
              const prior = await store.getIntegration(`load-request:${value.requestId}`) as { saveId: string } | undefined;
              service.assertScope(scope, 'save');
              if (prior && prior.saveId !== value.saveId)
                return send(response, 409, { ok: false, code: 'idempotency-conflict', message: 'The saved checkpoint does not match the original load request.' });
              if (!prior) return send(response, 200, { ok: true, scope: scopeKey(scope), status: 'unknown', message: 'The original load has no confirmed installation record. Nothing was loaded again.' });
              const message = service.storageError
                ? `The original load was installed, but saving still needs attention: ${service.storageError}`
                : 'The original load was installed. No checkpoint was loaded again and its protection was not replaced.';
              return send(response, 200, { ok: true, scope: scopeKey(scope), status: 'resolved', message, result: { ok: !service.storageError, code: service.storageError ? 'storage' : 'loaded', message } });
            }
            case '/api/saves/create': {""")
    # The exact file verification belongs outside the world mutation lane just like list/capture.
    text = once(text, "          '/api/saves/list',\n          '/api/saves/load',", "          '/api/saves/list',\n          '/api/saves/receipt',\n          '/api/saves/load',")
    return text


change('apps/server/src/http.ts', http)


def api(text):
    text = once(text, 'function clearSessionDrafts(preservePendingCommands = false): void {', 'function clearSessionDrafts(preservePendingCommands = false, preserveCheckpointResults = false): void {')
    text = once(text, "        key.startsWith('open-legend:creation-request:') ||", "        key.startsWith('open-legend:creation-request:') ||\n        (!preservePendingCommands && !preserveCheckpointResults && key.startsWith('open-legend:checkpoint-request:')) ||")
    text = once(text, "          (key.startsWith('open-legend:inventory-command:') ||", "          (key.startsWith('open-legend:action-request:') ||\n            key.startsWith('open-legend:inventory-command:') ||")
    text = once(text, """    if (previousOwner !== owner || (previousTimeline && previousTimeline !== view.saveTimeline)) {
      clearTradeDrafts();
      clearSessionDrafts();
    }""", """    if (previousOwner !== owner || (previousTimeline && previousTimeline !== view.saveTimeline)) {
      clearTradeDrafts();
      // A load can itself replace the timeline. Keep only the same owner's read-only
      // checkpoint outcome description; never restore an executable old-world request.
      clearSessionDrafts(false, previousOwner === owner);
    }""")
    return text


change('apps/client/src/api.ts', api)


def checkpoint_ui(text):
    text = "import { boundedText, readRetainedRequest, retainRequest, releaseRequest, type RetainedRequest } from '../retained-request';\nimport type { ApiResult, CheckpointRequest, GameView, RequestRecoveryResult } from '@open-legend/protocol';\n" + text
    text = once(text, 'type SettingsDraft =', """function validCheckpointRequest(value: unknown): value is CheckpointRequest {
  if (!value || typeof value !== 'object') return false;
  return 'requestId' in value && boundedText(value.requestId, 200) &&
    'label' in value && boundedText(value.label, 80) &&
    'timeline' in value && boundedText(value.timeline, 200) &&
    'operation' in value && (value.operation === 'create' ||
      (value.operation === 'load' && 'saveId' in value && boundedText(value.saveId, 200)));
}

type SettingsDraft =""")
    text = once(text, 'export function GameSavesPanel({\n', 'export function GameSavesPanel({\n  view,\n')
    text = once(text, '  visible?: boolean;\n', '  view: GameView;\n  visible?: boolean;\n')
    text = once(text, '  const [saves, setSaves]', """  const recoveryKey = view.access?.privateDraftScope
    ? `open-legend:checkpoint-request:${JSON.stringify([view.access.privateDraftScope, view.worldId, view.player.id])}`
    : undefined;
  const [retained, setRetained] = useState<RetainedRequest<CheckpointRequest>>(() => readRetainedRequest(recoveryKey, validCheckpointRequest));
  const pending = useRef(retained);
  const mutationActive = useRef(false);
  const alive = useRef(true);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  function remember(next: RetainedRequest<CheckpointRequest>) {
    pending.current = next;
    setRetained(next);
  }
  const pendingRequest = retained.status === 'pending' ? retained.request : undefined;
  const [saves, setSaves]""")
    text = once(text, "  const loadRequest = useRef<{ id: string; requestId: string } | null>(null);\n  const createRequest = useRef<{ id: string; label: string } | null>(null);\n  const [createUncertain, setCreateUncertain] = useState(false);\n", '')
    text = once(text, "  const [rowUncertain, setRowUncertain] = useState<{\n    action: 'load' | 'delete';", "  const [rowUncertain, setRowUncertain] = useState<{\n    action: 'delete';")
    text = once(text, '  const busy = listing || creating || rowBusy;', '  const busy = listing || creating || rowBusy || checking;')
    start = text.index('  async function create() {')
    end = text.index('  async function saveSettings()', start)
    text = text[:start] + """  function settle(result: ApiResult, request: CheckpointRequest) {
    if (!alive.current || pending.current.status !== 'pending' || pending.current.request.requestId !== request.requestId) return;
    releaseRequest(recoveryKey, request.requestId);
    remember({ status: 'empty' });
    setConfirm(null);
    if (request.operation === 'create') setLabel('');
    setMessage(result.message);
  }
  async function create() {
    if (mutationActive.current || pending.current.status !== 'empty' || rowUncertain) return;
    mutationActive.current = true;
    catalogRequest.current++;
    setCreating(true);
    setMessage('');
    const request: CheckpointRequest = { operation: 'create', requestId: crypto.randomUUID(), label: label.trim() || 'Manual save', timeline: view.saveTimeline! };
    try {
      retainRequest(recoveryKey, request);
      remember({ status: 'pending', request });
      const result = await post('/api/saves/create', { id: request.requestId, label: request.label });
      if (!alive.current) return;
      if (result.ok || ['busy', 'invalid-input', 'loading', 'deferred'].includes(result.code)) settle(result, request);
      else setMessage(result.message || 'The original checkpoint result is not confirmed.');
      await refresh();
    } catch (error) {
      if (alive.current) {
        if (pending.current.status === 'empty') remember(readRetainedRequest(recoveryKey, validCheckpointRequest));
        setMessage(error instanceof Error ? error.message : 'The original checkpoint result is not confirmed.');
        await refresh();
      }
    } finally {
      mutationActive.current = false;
      if (alive.current) setCreating(false);
    }
  }
  async function run(action: 'load' | 'delete', save: GameSaveSummary) {
    if (mutationActive.current || pending.current.status !== 'empty' || (rowUncertain && (action !== 'delete' || rowUncertain.save.id !== save.id))) return;
    mutationActive.current = true;
    catalogRequest.current++;
    setRowBusy(true);
    setMessage('');
    const request: CheckpointRequest | undefined = action === 'load'
      ? { operation: 'load', requestId: crypto.randomUUID(), saveId: save.id, label: save.label, timeline: view.saveTimeline! }
      : undefined;
    try {
      if (request) {
        retainRequest(recoveryKey, request);
        remember({ status: 'pending', request });
      }
      const result = await post(`/api/saves/${action}`, request ? { id: save.id, requestId: request.requestId } : { id: save.id });
      if (!alive.current) return;
      if (!result.ok) {
        if (request && ['invalid-input', 'loading', 'deferred'].includes(result.code)) settle(result, request);
        else setMessage(result.message || 'The original checkpoint operation is not confirmed.');
        await refresh();
        return;
      }
      if (request) {
        settle(result, request);
        window.location.reload();
        return;
      }
      setRowUncertain(undefined);
      setConfirm(null);
      setMessage(result.message ?? 'Done.');
      await refresh();
      restoreCatalogFocus();
    } catch (error) {
      if (alive.current) {
        if (!request) setRowUncertain({ action: 'delete', save });
        else if (pending.current.status === 'empty') remember(readRetainedRequest(recoveryKey, validCheckpointRequest));
        setMessage(error instanceof Error ? error.message : 'The original checkpoint operation is not confirmed.');
        await refresh();
      }
    } finally {
      mutationActive.current = false;
      if (alive.current) setRowBusy(false);
    }
  }
  async function checkOriginalCheckpoint() {
    if (mutationActive.current || pending.current.status !== 'pending') return;
    const request = pending.current.request;
    mutationActive.current = true;
    setChecking(true);
    try {
      const result = await post<RequestRecoveryResult>('/api/saves/receipt', request);
      if (!alive.current || pending.current.status !== 'pending' || pending.current.request.requestId !== request.requestId) return;
      if (!result.ok) { setMessage(result.message); return; }
      if (result.scope !== view.access?.scope) throw new Error('Checkpoint access changed. Refresh before checking the original result.');
      if (result.status === 'resolved') {
        settle(result.result, request);
        await refresh();
      } else setMessage(result.message);
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : 'The original checkpoint result is still unknown.');
    } finally {
      mutationActive.current = false;
      if (alive.current) setChecking(false);
    }
  }
""" + text[end:]
    text = once(text, '  const unresolved = createUncertain || !!rowUncertain;', "  const unresolved = retained.status !== 'empty' || !!rowUncertain;")
    start = text.index('        {unresolved && (')
    end = text.index('        {message &&', start)
    text = text[:start] + """        {unresolved && (
          <div className="ol-notice" role="alert">
            <strong>Checkpoint result not confirmed</strong>
            {pendingRequest ? (
              <>
                <p>{pendingRequest.operation === 'load' ? 'Loading' : 'Creating'} “{pendingRequest.label}” has an unresolved original request.</p>
                <Button busy={checking} disabled={creating || rowBusy} onPress={() => void checkOriginalCheckpoint()}>
                  Check original checkpoint result
                </Button>
                <p className="ol-caption">Checking does not create or load a checkpoint again. Your original protection checkpoint is not replaced.</p>
              </>
            ) : retained.status === 'unreadable' ? (
              <p>This browser could not read its retained checkpoint request. Restore browser storage access and reload before making another checkpoint change.</p>
            ) : rowUncertain ? (
              <>
                <p>Deleting “{rowUncertain.save.label}” did not return a confirmed result.</p>
                <Button busy={rowBusy} onPress={() => void run('delete', rowUncertain.save)}>Retry the same delete</Button>
              </>
            ) : null}
            <p className="ol-caption">Other checkpoint changes wait until the original result is known.</p>
          </div>
        )}
""" + text[end:]
    text = once(text, '                createRequest.current = null;\n', '')
    text = once(text, "createRequest.current?.label ?? (label.trim() || 'Manual save')", "pendingRequest?.label ?? (label.trim() || 'Manual save')")
    return text


change('apps/client/src/ui/game-saves.tsx', checkpoint_ui)
change('apps/client/src/main.tsx', lambda text: once(text,
    '<GameSavesPanel visible={visible} />',
    '<GameSavesPanel key={JSON.stringify([view.access.privateDraftScope, view.worldId, view.player.id])} view={view} visible={visible} />'))

print('Prepared action and checkpoint recovery through existing native owners.')
