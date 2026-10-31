import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type {
  CognitionLabActor,
  CognitionLabChanges,
  CognitionLabOperation,
  CognitionLabPage,
  CognitionLabReceipt,
  CognitionLabSettings,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { LoadingIndicator, LoadingRegion } from '../design-system/loading';
import { readLocal, writeLocal } from '../ui/storage';
import {
  currentScope,
  expected,
  LabAccessError,
  labImport,
  labMessage,
  labOperation,
  labRead,
  type LabImportRequest,
  type LabImportResult,
} from './api';
import { LabEmpty, LabError, LabIconButton, LabModal } from './controls';
import { CurrentEditor } from './current-editor';
import { LabTimeline } from './timeline';
import { LabInspector, type LabSelection } from './inspector';
import { CompareRuns, Library, SaveWork } from './saved-work';
import { ImportWork } from './import-work';
import { LabSettings } from './settings';
import { CreateCharacter } from './create-character';
import {
  bytesLabel,
  draftEdit,
  draftGroup,
  readableStatus,
  type LabDraft,
  type LabIntention,
} from './types';
import { useLabRead } from './use-lab-read';
import '../design-system/tokens/tokens.css';
import '../design-system/components.css';
import './cognition-lab.css';

type PendingWrite = {
  id: string;
  owner: string;
  readingRevision: number;
  label: string;
  status: 'pending' | 'unconfirmed' | 'confirmed';
  request:
    | { kind: 'operation'; operation: CognitionLabOperation }
    | { kind: 'import'; import: LabImportRequest };
  message?: string;
  result?: CognitionLabReceipt | LabImportResult;
};
const writeOwner = (workspace: CognitionLabWorkspace) => workspace.operationOwnerScope;
type LabWidths = { left?: number; middle?: number };
const layoutKey = 'openlegend.cognition-lab.layout';
function validWidths(value: unknown): value is LabWidths {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return ['left', 'middle'].every((key) => {
    const width = (value as Record<string, unknown>)[key];
    return (
      width === undefined || (typeof width === 'number' && Number.isFinite(width) && width >= 240)
    );
  });
}
interface DraftReview {
  scope: string;
  intention?: LabIntention;
  resolve?: (receipt: CognitionLabReceipt | undefined) => void;
}

export function CognitionLabApp() {
  const [workspace, setWorkspace] = useState<CognitionLabWorkspace>();
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const [connection, setConnection] = useState<
    'loading' | 'ready' | 'failed' | 'forbidden' | 'signedOut'
  >('loading');
  const [readError, setReadError] = useState('');
  const [readerGeneration, setReaderGeneration] = useState(0);
  const readerController = useRef<AbortController | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState<{ owner?: string; text: string }>();
  const message =
    notice?.owner === (workspace ? writeOwner(workspace) : undefined) ? (notice?.text ?? '') : '';
  const setMessage = (text: string) => {
    const current = workspaceRef.current;
    setNotice({ owner: current ? writeOwner(current) : undefined, text });
  };
  const [writes, setWrites] = useState<PendingWrite[]>([]);
  const writesRef = useRef(writes);
  writesRef.current = writes;
  // A lost acknowledgement retains the original caller as well as its command.
  // Reconciliation can then clear only that caller's submitted draft revision.
  const completions = useRef(
    new Map<
      string,
      {
        scope: string;
        resolve(result: CognitionLabReceipt | LabImportResult | undefined): void;
      }
    >(),
  );
  const [operations, setOperations] = useState(false);
  const [inspected, setInspected] = useState<{ scope: string; id?: string }>();
  const [drafts, setDrafts] = useState<LabDraft[]>([]);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const [settingsDraft, setSettingsDraft] = useState<{
    scope: string;
    value: CognitionLabSettings;
  }>();
  const settingsRef = useRef(settingsDraft);
  settingsRef.current = settingsDraft;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftReview, setDraftReview] = useState<DraftReview>();
  const readingRevision = useRef(0);
  const [selection, setSelectionState] = useState<LabSelection>();
  const setSelection = (value: LabSelection | undefined) => {
    readingRevision.current++;
    setSelectionState(value);
  };
  const [follow, setFollowState] = useState(true);
  const setFollow = (value: boolean) => {
    readingRevision.current++;
    setFollowState(value);
  };
  const [showPrepared, setShowPrepared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveKind, setSaveKind] = useState<'scenario' | 'checkpoint' | 'run'>();
  const [compare, setCompare] = useState(false);
  const [comparisonView, setComparisonViewState] = useState<{
    a?: LabSelection;
    b?: LabSelection;
  }>();
  const setComparisonView: typeof setComparisonViewState = (value) => {
    readingRevision.current++;
    setComparisonViewState(value);
  };
  const [importing, setImporting] = useState(false);
  const [newScene, setNewScene] = useState(false);
  const [addingCharacter, setAddingCharacter] = useState(false);
  const [focus, setFocus] = useState<'current' | 'timeline' | 'inspector'>();
  const [widths, setWidths] = useState(() => readLocal<LabWidths>(layoutKey, {}, validWidths));
  const widthsRef = useRef(widths);
  widthsRef.current = widths;
  const mounted = useRef(true);
  useEffect(() => {
    document.documentElement.setAttribute('data-cognition-lab', '');
    const oldTitle = document.title;
    document.title = 'Cognition Lab · Open Legend';
    return () => {
      mounted.current = false;
      document.documentElement.removeAttribute('data-cognition-lab');
      document.title = oldTitle;
    };
  }, []);
  const loseAccess = useCallback((error: LabAccessError, ownerScope?: string) => {
    if (
      !mounted.current ||
      (ownerScope !== undefined && ownerScope !== workspaceRef.current?.operationOwnerScope)
    )
      return;
    // Stop an older observation before clearing private state, so its late reply
    // cannot restore the workspace after a current operation confirms access loss.
    readerController.current?.abort();
    setConnection(error.status === 401 ? 'signedOut' : 'forbidden');
    setReadError(labMessage(error));
    workspaceRef.current = undefined;
    setWorkspace(undefined);
    draftsRef.current = [];
    setDrafts([]);
    settingsRef.current = undefined;
    setSettingsDraft(undefined);
    setSelection(undefined);
  }, []);
  const accept = useCallback((next: CognitionLabWorkspace, replacingGeneration?: string) => {
    const previous = workspaceRef.current;
    if (previous && next.workspaceId !== previous.workspaceId) return;
    if (
      previous &&
      next.runtimeGeneration === previous.runtimeGeneration &&
      next.nativeRevision < previous.nativeRevision
    )
      return;
    if (
      previous &&
      next.runtimeGeneration !== previous.runtimeGeneration &&
      replacingGeneration &&
      previous.runtimeGeneration !== replacingGeneration
    )
      return;
    if (previous && next.disclosureRevision !== previous.disclosureRevision) {
      // A forgotten or newly private source must not survive in a local source editor.
      const retained = draftsRef.current.filter(
        (draft) => draft.field.owner !== 'memory' && draft.field.owner !== 'worldEvent',
      );
      if (retained.length !== draftsRef.current.length) {
        draftsRef.current = retained;
        setDrafts(retained);
        setMessage(
          'Source access changed. Memory and history drafts were cleared; other drafts remain.',
        );
      }
      setShowPrepared(false);
    }
    if (previous && next.runtimeGeneration !== previous.runtimeGeneration) {
      // Replacement invalidates the old long-poll scope, not the operator's next intention.
      readerController.current?.abort();
      setConnection('loading');
      setReaderGeneration((value) => value + 1);
    }
    workspaceRef.current = next;
    if (mounted.current) setWorkspace(next);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    readerController.current = controller;
    let cursor = '';
    const read = async () => {
      try {
        const first = await labRead<CognitionLabWorkspace>(
          '/workspace',
          undefined,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        accept(first);
        if (controller.signal.aborted) return;
        // Reconnection may skip publications already included in this cursor.
        // Refresh mounted readers once even when the next long poll is unchanged.
        // docs/projects/cognition-lab-tech-design.md#114-browser-and-server-lifecycle
        setRefresh((value) => value + 1);
        cursor = first.cursor;
        setConnection('ready');
        setReadError('');
        while (!controller.signal.aborted) {
          const change = await labRead<CognitionLabChanges>(
            '/changes',
            { cursor },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          cursor = change.cursor;
          if (change.workspace) accept(change.workspace);
          if (controller.signal.aborted) return;
          if (change.changed) setRefresh((value) => value + 1);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof LabAccessError) loseAccess(error);
        else {
          setConnection('failed');
          setReadError(labMessage(error));
        }
      }
    };
    void read();
    return () => controller.abort();
  }, [accept, loseAccess, readerGeneration]);
  const scope = workspace ? currentScope(workspace) : '';
  const ownedWrites = workspace
    ? writes.filter((write) => write.owner === writeOwner(workspace))
    : [];
  const focalActor = useLabRead(
    workspace?.settings.policy.focalActorId
      ? JSON.stringify([
          workspace.workspaceId,
          workspace.privateDraftScope,
          workspace.runtimeGeneration,
          workspace.settings.policy.focalActorId,
        ])
      : undefined,
    (signal) =>
      labRead<CognitionLabPage<CognitionLabActor>>(
        '/actors',
        { id: workspace?.settings.policy.focalActorId },
        signal,
      ),
    workspace?.scenarioRevision,
  );
  const retryActor = useLabRead(
    workspace?.run?.responseRetry
      ? JSON.stringify([scope, workspace.run.responseRetry.actorId, 'responseRetry'])
      : undefined,
    (signal) =>
      labRead<CognitionLabPage<CognitionLabActor>>(
        '/actors',
        {
          id: workspace?.run?.responseRetry?.actorId,
        },
        signal,
      ),
    workspace?.scenarioRevision,
  );
  useEffect(() => {
    setDrafts((previous) => previous.filter((draft) => draft.scope === scope));
    setSettingsDraft((previous) => (previous?.scope === scope ? previous : undefined));
    setShowPrepared(false);
  }, [scope]);
  useEffect(() => {
    if (draftReview && draftReview.scope !== scope) {
      draftReview.resolve?.(undefined);
      setDraftReview(undefined);
    }
  }, [scope, draftReview]);
  useEffect(() => {
    if (follow && workspace?.run)
      setSelectionState({ runId: workspace.run.id, rootId: workspace.run.latestRootId });
  }, [follow, workspace?.run?.id, workspace?.run?.latestRootId]);
  const setWrite = (write: PendingWrite) => {
    const next = [...writesRef.current.filter((other) => other.id !== write.id), write];
    writesRef.current = next;
    setWrites(next);
  };
  const finishWrite = (id: string) => {
    const next = writesRef.current.filter((write) => write.id !== id);
    writesRef.current = next;
    if (mounted.current) setWrites(next);
  };
  const observeReceipt = (
    receipt: CognitionLabReceipt,
    write: PendingWrite,
    generation?: string,
  ) => {
    // Compare before adopting this receipt's own replacement workspace.
    const sameSource = !generation || generation === workspaceRef.current?.runtimeGeneration;
    if (receipt.workspace) {
      if (receipt.workspace.privateDraftScope === workspaceRef.current?.privateDraftScope)
        accept(receipt.workspace, generation);
      else setReaderGeneration((value) => value + 1);
    }
    if (mounted.current) {
      setMessage(receipt.message);
      if (!receipt.ok) setOperations(true);
      setRefresh((value) => value + 1);
      // Late acknowledgements, including original-command reconciliation, cannot
      // replace a reading target the operator deliberately chose after dispatch.
      // docs/projects/cognition-lab-feature-spec.md#11-common-state-and-recovery-rules
      const sameReading = write.readingRevision === readingRevision.current;
      const submittedSource =
        write.request.kind === 'operation' &&
        ['submitStimulus', 'prepareAndHold'].includes(write.request.operation.kind);
      if (sameSource && sameReading && receipt.runId && (follow || submittedSource)) {
        setSelectionState({ runId: receipt.runId });
        if (submittedSource) setFollowState(true);
      }
      if (
        sameSource &&
        sameReading &&
        (receipt.ok || receipt.sourceAccepted) &&
        write.request.kind === 'operation' &&
        write.request.operation.kind === 'prepareAndHold'
      )
        setShowPrepared(true);
      if (sameReading && receipt.comparisonRunIds?.length) {
        const [a, b] = receipt.comparisonRunIds;
        setComparisonViewState({
          a: a ? { runId: a } : undefined,
          b: b ? { runId: b } : undefined,
        });
        setFollowState(false);
      }
    }
  };
  const dispatch = async (
    write: PendingWrite,
  ): Promise<CognitionLabReceipt | LabImportResult | undefined> => {
    const isCurrentOwner = () =>
      !!workspaceRef.current && write.owner === writeOwner(workspaceRef.current);
    // A retained command is private work, not permission for a replacement login
    // to submit its predecessor's body. Keep its identity for the original owner.
    if (!isCurrentOwner()) return;
    setWrite({ ...write, status: 'pending' });
    try {
      const result =
        write.result ??
        (write.request.kind === 'operation'
          ? await labOperation(write.request.operation, write.owner)
          : await labImport(write.request.import));
      if ('unconfirmed' in result && result.unconfirmed) {
        setWrite({ ...write, status: 'unconfirmed', message: result.message });
        if (mounted.current && isCurrentOwner()) {
          setMessage(result.message);
          setOperations(true);
        }
        return undefined;
      }
      if (!isCurrentOwner()) {
        // A late acknowledgement stays known without painting private results
        // into another login or sending the command again when its owner returns.
        setWrite({ ...write, status: 'confirmed', result });
        return undefined;
      }
      finishWrite(write.id);
      const completion = completions.current.get(write.id);
      completion?.resolve(
        completion.scope === workspaceRef.current?.privateDraftScope ? result : undefined,
      );
      completions.current.delete(write.id);
      if (!mounted.current) return result;
      if (write.request.kind === 'operation') {
        observeReceipt(
          result as CognitionLabReceipt,
          write,
          'expected' in write.request.operation
            ? write.request.operation.expected.runtimeGeneration
            : undefined,
        );
      } else {
        setMessage(result.message);
        setReaderGeneration((value) => value + 1);
      }
      return result;
    } catch (error) {
      const text = labMessage(error);
      setWrite({ ...write, status: 'unconfirmed', message: text });
      if (mounted.current && isCurrentOwner()) {
        setMessage(text);
        setOperations(true);
        if (error instanceof LabAccessError) loseAccess(error, write.owner);
      }
      return undefined;
    }
  };
  const perform = async (intention: LabIntention): Promise<CognitionLabReceipt | undefined> => {
    const urgent =
      intention.kind === 'controlRun' &&
      ['hold', 'stop', 'cancelAttempt', 'pause'].includes(intention.action);
    const current = workspaceRef.current;
    if (
      current &&
      writesRef.current.some((write) => write.owner === writeOwner(current)) &&
      !urgent
    ) {
      setMessage('Finish or reconcile the existing operation before sending another change.');
      setOperations(true);
      return;
    }
    if (!current || (connection !== 'ready' && !urgent)) {
      setMessage('Refresh the current lab state before sending this change.');
      return;
    }
    const operation: CognitionLabOperation = { ...intention, commandId: crypto.randomUUID() };
    const completion = new Promise<CognitionLabReceipt | LabImportResult | undefined>((resolve) =>
      completions.current.set(operation.commandId, { scope: current.privateDraftScope, resolve }),
    );
    void dispatch({
      id: operation.commandId,
      owner: writeOwner(current),
      readingRevision: readingRevision.current,
      label: readableStatus(operation.kind),
      status: 'pending',
      request: { kind: 'operation', operation },
    });
    return (await completion) as CognitionLabReceipt;
  };
  const currentDrafts = drafts.filter((draft) => draft.scope === scope);
  const activeSettings = settingsDraft?.scope === scope ? settingsDraft.value : workspace?.settings;
  const settingsDirty =
    !!workspace &&
    !!activeSettings &&
    JSON.stringify(activeSettings) !== JSON.stringify(workspace.settings);
  const execute = (intention: LabIntention): Promise<CognitionLabReceipt | undefined> => {
    const needsAppliedState =
      [
        'submitStimulus',
        'prepareAndHold',
        'submitPrepared',
        'continueOriginal',
        'retryResponse',
        'saveScenario',
        'saveCheckpoint',
        'continueCheckpoint',
        'requestMaintenance',
      ].includes(intention.kind) ||
      (intention.kind === 'controlRun' &&
        ['continue', 'step', 'run', 'advanceTime', 'advanceToOutcome', 'resume'].includes(
          intention.action,
        ));
    if (
      needsAppliedState &&
      (draftsRef.current.some((draft) => draft.scope === scope) || settingsDirty)
    ) {
      if (draftReview?.resolve) return Promise.resolve(undefined);
      return new Promise((resolve) => setDraftReview({ scope, intention, resolve }));
    }
    return perform(intention);
  };
  const applyGroup = async (group: string) => {
    const current = workspaceRef.current;
    if (!current) return false;
    const members = draftsRef.current.filter(
      (draft) => draftGroup(draft) === group && draft.scope === currentScope(current),
    );
    if (!members.length) return true;
    try {
      const receipt = await perform({
        kind: 'applyEdits',
        expected: expected(current),
        edits: members.map(draftEdit),
      });
      if (!receipt?.ok) return false;
      setDrafts((previous) => previous.filter((draft) => !members.includes(draft)));
      draftsRef.current = draftsRef.current.filter((draft) => !members.includes(draft));
      return true;
    } catch (error) {
      setMessage(labMessage(error));
      setOperations(true);
      return false;
    }
  };
  const applySettings = async () => {
    const current = workspaceRef.current;
    const draft = settingsRef.current;
    if (!current || !draft || draft.scope !== currentScope(current)) return true;
    const values = draft.value;
    if (
      ![
        values.policy.durationSeconds,
        values.policy.maximumCalls,
        values.policy.activeWallSeconds,
        values.storageAllowanceBytes,
        values.runCaptureAllowanceBytes,
        values.maxOutputTokens ?? 0,
      ].every(Number.isFinite)
    ) {
      setMessage(
        'Complete every numeric setting before applying. The current settings are unchanged.',
      );
      setOperations(true);
      return false;
    }
    const receipt = await perform({
      kind: 'applySettings',
      expected: expected(current),
      settings: {
        ...draft.value,
        effort: draft.value.effort ?? null,
        maxOutputTokens: draft.value.maxOutputTokens ?? null,
      },
    });
    if (!receipt?.ok) return false;
    setSettingsDraft((previous) => (previous === draft ? undefined : previous));
    if (settingsRef.current === draft) settingsRef.current = undefined;
    return true;
  };
  const continueAfterDrafts = async (apply: boolean) => {
    const review = draftReview;
    if (!review) return;
    const starting = workspaceRef.current;
    if (!starting || review.scope !== currentScope(starting)) {
      review.resolve?.(undefined);
      setDraftReview(undefined);
      return;
    }
    if (apply) {
      const groups = [
        ...new Set(draftsRef.current.filter((draft) => draft.scope === scope).map(draftGroup)),
      ];
      for (const group of groups) if (!(await applyGroup(group))) return;
      if (!(await applySettings())) return;
    }
    if (!review.intention) {
      setDraftReview(undefined);
      return;
    }
    const current = workspaceRef.current;
    if (!current) return;
    if (review.scope !== currentScope(current)) {
      review.resolve?.(undefined);
      setDraftReview(undefined);
      return;
    }
    const acceptedIntention =
      'expected' in review.intention
        ? { ...review.intention, expected: expected(current) }
        : review.intention;
    const intention =
      'policy' in acceptedIntention
        ? { ...acceptedIntention, policy: current.settings.policy }
        : acceptedIntention;
    setDraftReview(undefined);
    review.resolve?.(await perform(intention));
  };
  const upload = async (
    file: File,
    validateOnly: boolean,
  ): Promise<LabImportResult | undefined> => {
    const current = workspaceRef.current;
    if (!current || writesRef.current.some((write) => write.owner === writeOwner(current))) {
      setOperations(true);
      return;
    }
    const request: LabImportRequest = {
      commandId: crypto.randomUUID(),
      ownerScope: writeOwner(current),
      expected: expected(current),
      file,
      validateOnly,
    };
    const completion = new Promise<CognitionLabReceipt | LabImportResult | undefined>((resolve) =>
      completions.current.set(request.commandId, { scope: current.privateDraftScope, resolve }),
    );
    void dispatch({
      id: request.commandId,
      owner: writeOwner(current),
      readingRevision: readingRevision.current,
      label: validateOnly ? 'Validate import' : 'Install import',
      status: 'pending',
      request: { kind: 'import', import: request },
    });
    return (await completion) as LabImportResult;
  };
  const busy = ownedWrites.length > 0;
  const control = (
    action: Extract<CognitionLabOperation, { kind: 'controlRun' }>['action'],
    durationSeconds?: number,
  ) => {
    const current = workspaceRef.current;
    if (!current) return;
    const revision = ['hold', 'stop', 'cancelAttempt', 'pause'].includes(action)
      ? undefined
      : current.scenarioRevision;
    void execute({
      kind: 'controlRun',
      expected: { runtimeGeneration: current.runtimeGeneration, scenarioRevision: revision },
      runId: current.run?.id,
      action,
      durationSeconds,
    });
  };
  const resize = (pane: 'left' | 'middle', delta: number, persist = false) => {
    const current = document.querySelector<HTMLElement>(
      `[data-pane='${pane === 'left' ? 'current' : 'timeline'}']`,
    );
    const width = current?.getBoundingClientRect().width ?? 420;
    const next = {
      ...widthsRef.current,
      [pane]: Math.max(240, Math.min(innerWidth - 500, width + delta)),
    };
    widthsRef.current = next;
    setWidths(next);
    if (persist) writeLocal(layoutKey, next);
  };
  const dragResize = (pane: 'left' | 'middle', event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    let previous = event.clientX;
    const move = (next: PointerEvent) => {
      resize(pane, next.clientX - previous);
      previous = next.clientX;
    };
    const end = () => {
      writeLocal(layoutKey, widthsRef.current);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  };
  if (!workspace)
    return (
      <main className="ol-root cl-entry">
        <LoadingRegion>
          <h1>Cognition Lab</h1>
          <p>Isolated character experiments through the ordinary game runtime.</p>
          <LoadingIndicator active={connection === 'loading'} label="Opening Cognition Lab" />
          <LabError message={readError} />
          {connection === 'signedOut' ? (
            <a className="ol-btn" href="/auth/login">
              Sign in
            </a>
          ) : connection !== 'loading' ? (
            <Button
              onPress={() => {
                setConnection('loading');
                setReaderGeneration((value) => value + 1);
              }}
            >
              Refresh lab access
            </Button>
          ) : null}
          <a href="/">Open ordinary game</a>
        </LoadingRegion>
      </main>
    );
  const inspectedId =
    inspected?.scope === scope ? inspected.id : workspace.defaults.inspectedActorId;
  const style = {
    ...(widths.left ? { '--cl-left': `${widths.left}px` } : {}),
    ...(widths.middle ? { '--cl-middle': `${widths.middle}px` } : {}),
  } as CSSProperties;
  return (
    <main className="ol-root cl-app" style={style}>
      <header className="cl-header">
        <h1>Cognition Lab</h1>
        <span className="cl-scenario-name">{workspace.name}</span>
        {!!currentDrafts.length && (
          <Button size="sm" variant="quiet" onPress={() => setDraftReview({ scope })}>
            {currentDrafts.length} drafts
          </Button>
        )}
        <span className="cl-spacer" />
        <Button size="sm" onPress={() => setNewScene(true)}>
          New
        </Button>
        <Button size="sm" onPress={() => setAddingCharacter(true)}>
          Add character
        </Button>
        <Button size="sm" onPress={() => setSaved(true)}>
          Library
        </Button>
        <select
          className="cl-input"
          aria-label="Save lab work"
          value=""
          onChange={(event) => {
            if (event.target.value) setSaveKind(event.target.value as typeof saveKind);
          }}
        >
          <option value="">Save…</option>
          <option value="scenario">Save scenario</option>
          <option value="checkpoint">Save checkpoint</option>
          <option value="run" disabled={!workspace.run}>
            Retain run
          </option>
        </select>
        <Button
          size="sm"
          onPress={() => {
            setComparisonView((previous) => previous ?? { a: selection });
            setFollow(false);
            setFocus(undefined);
          }}
        >
          Compare
        </Button>
        {comparisonView && (
          <>
            <Button size="sm" onPress={() => setCompare(true)}>
              Run variants…
            </Button>
            <Button size="sm" onPress={() => setComparisonView(undefined)}>
              Return to experiment
            </Button>
          </>
        )}
        <Button size="sm" onPress={() => setImporting(true)}>
          Import
        </Button>
        <LabIconButton
          icon="ui.settings"
          label={settingsDirty ? 'Lab settings · unapplied draft' : 'Lab settings'}
          onPress={() => setSettingsOpen(true)}
        />
        <span className="cl-header-secondary cl-hint">
          {bytesLabel(workspace.storage.usedBytes + workspace.storage.reservedBytes)} /{' '}
          {bytesLabel(workspace.storage.allowanceBytes)}
        </span>
        <div className="cl-inline" role="group" aria-label="Focus a pane">
          <LabIconButton
            icon="ui.refresh"
            label="Reset pane layout"
            onPress={() => {
              widthsRef.current = {};
              setWidths({});
              writeLocal(layoutKey, {});
              setFocus(undefined);
            }}
          />
          {(['current', 'timeline', 'inspector'] as const).map((pane) => (
            <LabIconButton
              key={pane}
              icon={
                pane === 'current'
                  ? 'ui.character'
                  : pane === 'timeline'
                    ? 'ui.speech'
                    : 'ui.search'
              }
              label={
                focus === pane
                  ? 'Return to three panes'
                  : `Focus ${pane === 'current' ? 'current character' : pane}`
              }
              pressed={focus === pane}
              onPress={() => setFocus(focus === pane ? undefined : pane)}
            />
          ))}
        </div>
      </header>
      <div className="cl-run-strip" aria-label="Experiment controls">
        <span className="cl-state">
          <strong>{readableStatus(workspace.state)}</strong>
          {workspace.run?.reason && (
            <span title={workspace.run.reason}>{workspace.run.reason}</span>
          )}
        </span>
        <Button
          size="sm"
          disabled={busy || connection !== 'ready'}
          onPress={() => control('continue')}
        >
          Continue
        </Button>
        <Button size="sm" disabled={busy || connection !== 'ready'} onPress={() => control('run')}>
          Run
        </Button>
        <Button size="sm" onPress={() => control('hold')}>
          Hold
        </Button>
        <Button size="sm" onPress={() => control('stop')}>
          Stop
        </Button>
        <Button size="sm" disabled={busy || connection !== 'ready'} onPress={() => control('step')}>
          Step
        </Button>
        <Button
          size="sm"
          disabled={busy || connection !== 'ready'}
          onPress={() => control('advanceTime', 5)}
        >
          Advance 5 s
        </Button>
        {workspace.settings.policy.stopCondition?.kind === 'actionOutcome' &&
          workspace.settings.policy.stopCondition.id && (
            <Button
              size="sm"
              disabled={busy || connection !== 'ready'}
              onPress={() => control('advanceToOutcome')}
            >
              Advance to outcome
            </Button>
          )}
        <Button size="sm" variant="quiet" onPress={() => setSettingsOpen(true)}>
          {workspace.settings.policy.mode === 'oneResponse'
            ? 'One response'
            : readableStatus(workspace.settings.policy.mode)}{' '}
          · Wait for{' '}
          {focalActor.value?.items[0]?.name ??
            workspace.settings.policy.focalActorId ??
            'selected condition'}
        </Button>
        {workspace.run?.prepared && (
          <Button size="sm" onPress={() => setShowPrepared(true)}>
            Edit held input
          </Button>
        )}
        {workspace.run?.responseRetry && (
          <Button
            size="sm"
            disabled={busy || connection !== 'ready'}
            onPress={() =>
              void execute({
                kind: 'retryResponse',
                expected: expected(workspace),
                sourceId: workspace.run!.responseRetry!.sourceId,
                policy: workspace.settings.policy,
              })
            }
          >
            Retry response ·{' '}
            {retryActor.value?.items[0]?.name ?? workspace.run.responseRetry.actorId}
          </Button>
        )}
        {!follow &&
          workspace.run &&
          (selection?.runId !== workspace.run.id ||
            selection?.rootId !== workspace.run.latestRootId) && (
            <Button
              size="sm"
              onPress={() => {
                setSelection({ runId: workspace.run!.id, rootId: workspace.run!.latestRootId });
                setFollow(true);
                setComparisonView(undefined);
                setFocus(undefined);
              }}
            >
              Latest recorded source
            </Button>
          )}
        <span className="cl-spacer" />
        {connection !== 'ready' && (
          <Button size="sm" onPress={() => setReaderGeneration((value) => value + 1)}>
            Reconnect
          </Button>
        )}
        {(message || readError || ownedWrites.length > 0) && (
          <Button size="sm" variant="quiet" onPress={() => setOperations(true)}>
            {ownedWrites.length
              ? `${ownedWrites.length} ${ownedWrites.some((write) => write.status === 'unconfirmed') ? 'unconfirmed' : ownedWrites.some((write) => write.status === 'pending') ? 'pending' : 'confirmed'} operation${ownedWrites.length > 1 ? 's' : ''}`
              : 'Operation results'}
          </Button>
        )}
        <span className="cl-hint">
          {workspace.settings.policy.maximumCalls} calls ·{' '}
          {workspace.settings.policy.durationSeconds} simulated s ·{' '}
          {workspace.settings.policy.activeWallSeconds} active s
        </span>
      </div>
      <div className="cl-columns" data-focus={focus}>
        <div className="cl-column" data-pane="current">
          <CurrentEditor
            key={workspace.privateDraftScope}
            workspace={workspace}
            actorId={inspectedId}
            inspect={(id) => setInspected({ scope, id })}
            drafts={drafts}
            setDrafts={setDrafts}
            applyGroup={applyGroup}
            reviewDrafts={() => setDraftReview({ scope })}
            execute={execute}
            busy={busy}
            refresh={refresh}
          />
          <div
            className="cl-resizer"
            role="separator"
            aria-label="Resize current character pane"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={(event) => dragResize('left', event)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                resize('left', event.key === 'ArrowLeft' ? -16 : 16, true);
              }
            }}
          />
        </div>
        <div className="cl-column" data-pane="timeline">
          {comparisonView && (
            <LabInspector
              key={`variant-a:${workspace.privateDraftScope}`}
              title="Variant A · captured run"
              comparison
              workspace={workspace}
              onAccessError={loseAccess}
              selection={comparisonView.a}
              select={(value) => setComparisonView((previous) => ({ ...previous, a: value }))}
              follow={false}
              setFollow={() => {}}
              refresh={refresh}
              execute={execute}
              busy={busy}
              showPrepared={false}
              closePrepared={() => {}}
            />
          )}
          <div className="cl-retained-pane" hidden={!!comparisonView}>
            <LabTimeline
              key={scope}
              active={!comparisonView}
              connectionMessage={
                connection === 'ready'
                  ? undefined
                  : 'Reconnect to revalidate the lab before submitting. Your words remain editable.'
              }
              workspace={workspace}
              execute={execute}
              busy={busy}
              refresh={refresh}
              selectRecord={(runId, rootId, stageId) => {
                setSelection({ runId, rootId, stageId });
                setFollow(false);
              }}
            />
          </div>
          <div
            className="cl-resizer"
            role="separator"
            aria-label="Resize event pane"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={(event) => dragResize('middle', event)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                resize('middle', event.key === 'ArrowLeft' ? -16 : 16, true);
              }
            }}
          />
        </div>
        <div className="cl-column" data-pane="inspector">
          {comparisonView && (
            <LabInspector
              key={`variant-b:${workspace.privateDraftScope}`}
              title="Variant B · captured run"
              comparison
              workspace={workspace}
              onAccessError={loseAccess}
              selection={comparisonView.b}
              select={(value) => setComparisonView((previous) => ({ ...previous, b: value }))}
              follow={false}
              setFollow={() => {}}
              refresh={refresh}
              execute={execute}
              busy={busy}
              showPrepared={false}
              closePrepared={() => {}}
            />
          )}
          <div className="cl-retained-pane" hidden={!!comparisonView}>
            <LabInspector
              key={`recorded:${workspace.privateDraftScope}`}
              active={!comparisonView}
              workspace={workspace}
              onAccessError={loseAccess}
              selection={selection}
              select={setSelection}
              follow={follow}
              setFollow={setFollow}
              refresh={refresh}
              execute={execute}
              busy={busy}
              showPrepared={showPrepared}
              closePrepared={() => setShowPrepared(false)}
            />
          </div>
        </div>
      </div>
      {operations && (
        <LabModal
          title="Operation results"
          close={() => setOperations(false)}
          footer={
            <Button size="sm" onPress={() => setOperations(false)}>
              Close
            </Button>
          }
        >
          <div className="cl-stack">
            <LabError message={readError} />
            {message && <p role="status">{message}</p>}
            {ownedWrites.map((write) => (
              <section key={write.id} className="cl-section">
                <h3>{write.label}</h3>
                <p>
                  {write.status === 'pending'
                    ? 'Waiting for its authoritative result.'
                    : write.status === 'confirmed'
                      ? 'Its original result is confirmed and ready to read.'
                      : (write.message ?? 'The result is not confirmed.')}
                </p>
                <p className="cl-hint">Operation {write.id}</p>
                {write.status !== 'pending' && (
                  <Button size="sm" onPress={() => void dispatch(write)}>
                    {write.status === 'confirmed'
                      ? 'Read confirmed result'
                      : 'Check same operation'}
                  </Button>
                )}
              </section>
            ))}
          </div>
        </LabModal>
      )}
      {draftReview?.scope === scope && (
        <LabModal
          title="Review unapplied edits"
          close={() => {
            draftReview.resolve?.(undefined);
            setDraftReview(undefined);
          }}
          footer={
            <>
              <Button
                size="sm"
                onPress={() => {
                  draftReview.resolve?.(undefined);
                  setDraftReview(undefined);
                }}
              >
                Cancel
              </Button>
              {draftReview.intention && (
                <Button size="sm" disabled={busy} onPress={() => void continueAfterDrafts(false)}>
                  Use applied values
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                busy={busy}
                onPress={() => void continueAfterDrafts(true)}
              >
                {draftReview.intention ? 'Apply edits and continue' : 'Apply named groups'}
              </Button>
            </>
          }
        >
          <div className="cl-stack">
            <p>
              Commands use the last applied values. These named groups remain local drafts until
              their native owners accept them.
            </p>
            {[...new Set(currentDrafts.map(draftGroup))].map((group) => {
              const members = currentDrafts.filter((draft) => draftGroup(draft) === group);
              return (
                <section key={group} className="cl-section">
                  <h3>
                    {members[0]?.actorName} · {members[0]?.field.owner}
                  </h3>
                  <p>{members.map((draft) => draft.field.label).join(', ')}</p>
                  <Button size="sm" busy={busy} onPress={() => void applyGroup(group)}>
                    Apply this group
                  </Button>
                </section>
              );
            })}
            {settingsDirty && (
              <section className="cl-section">
                <h3>Lab settings</h3>
                <p>Policy or model settings have an unapplied draft.</p>
                <Button size="sm" busy={busy} onPress={() => void applySettings()}>
                  Apply settings
                </Button>
              </section>
            )}
            <p className="cl-hint">
              Each group is atomic only within its owning operation. A failed group retains its
              draft and prevents a queued stimulus from running.
            </p>
          </div>
        </LabModal>
      )}
      {activeSettings && (
        <LabSettings
          key={scope}
          open={settingsOpen}
          workspace={workspace}
          draft={activeSettings}
          change={(value) => setSettingsDraft({ scope, value })}
          apply={applySettings}
          discard={() => setSettingsDraft(undefined)}
          busy={busy}
          close={() => setSettingsOpen(false)}
          nativePause={(paused) => control(paused ? 'pause' : 'resume')}
          maintenance={(actorId) =>
            void execute({
              kind: 'requestMaintenance',
              actorId,
              policy: workspace.settings.policy,
              expected: expected(workspace),
            })
          }
          execute={execute}
        />
      )}
      {saved && (
        <Library
          key={workspace.privateDraftScope}
          workspace={workspace}
          execute={execute}
          busy={busy}
          refresh={refresh}
          saveScenario={() => {
            setSaved(false);
            setSaveKind('scenario');
          }}
          importWork={() => {
            setSaved(false);
            setImporting(true);
          }}
          inspectRun={(runId) => {
            setComparisonView(undefined);
            setSelection({ runId });
            setFollow(false);
          }}
          inspectComparison={(runIds) => {
            setComparisonView({
              a: runIds[0] ? { runId: runIds[0] } : undefined,
              b: runIds[1] ? { runId: runIds[1] } : undefined,
            });
          }}
          close={() => setSaved(false)}
        />
      )}
      <CreateCharacter
        key={`creation:${scope}`}
        workspace={workspace}
        execute={execute}
        busy={busy}
        open={addingCharacter}
        close={() => setAddingCharacter(false)}
        created={(id) => setInspected({ scope, id })}
        importScene={() => setNewScene(true)}
      />
      {saveKind && (
        <SaveWork
          key={JSON.stringify([scope, saveKind])}
          workspace={workspace}
          kind={saveKind}
          execute={execute}
          busy={busy}
          close={() => setSaveKind(undefined)}
        />
      )}
      {compare && (
        <CompareRuns
          key={`comparison:${scope}`}
          workspace={workspace}
          execute={execute}
          busy={busy}
          drafts={currentDrafts}
          close={() => setCompare(false)}
        />
      )}
      {importing && (
        <ImportWork
          key={`import:${scope}`}
          upload={upload}
          busy={busy}
          close={() => setImporting(false)}
        />
      )}
      {newScene && (
        <LabModal
          title="Replace with a fresh starting scenario"
          close={() => setNewScene(false)}
          footer={
            <>
              <Button size="sm" onPress={() => setNewScene(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                busy={busy}
                onPress={() => {
                  void execute({ kind: 'newScenario', expected: expected(workspace) }).then(
                    (receipt) => {
                      if (receipt?.ok) setNewScene(false);
                    },
                  );
                }}
              >
                Create fresh scene
              </Button>
              <Button
                size="sm"
                busy={busy}
                onPress={() => {
                  void execute({ kind: 'importGameSnapshot', expected: expected(workspace) }).then(
                    (receipt) => {
                      if (receipt?.ok) setNewScene(false);
                    },
                  );
                }}
              >
                Copy current game once
              </Button>
            </>
          }
        >
          <p>
            A fresh scene uses the selected world's normal initializer. Copy current game takes one
            coherent point-in-time snapshot. Either replaces only the lab, settles its active work
            and leaves execution stopped; no ongoing synchronization is created.
          </p>
        </LabModal>
      )}
    </main>
  );
}
