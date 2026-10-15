import { useEffect, useRef, useState } from 'react';
import { Checkbox } from 'react-aria-components';
import type {
  WorldAgentPlanView,
  WorldAgentWorkResult,
  WorldStatusRemovalPage,
  WorldStatusRemovalSection,
  WorldStatusRemovalSummary,
} from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { post, privateDraftScope } from '../api';
import { authoringKey } from './world-agent-identity';
import { holdActionFocus } from './action-focus';
import { readLocal, writeLocal } from './storage';

const failureText = (failure: unknown) =>
  failure instanceof Error ? failure.message : 'This removal review is unavailable.';
const sameSelection = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id) => right.includes(id));
type PrepareRequest = { sessionId: string; operationId: string };
type RevisionRequest = { id: string; optionalIds: string[] };
const isPrepareRequest = (value: unknown): value is PrepareRequest =>
  !!value &&
  typeof value === 'object' &&
  'sessionId' in value &&
  typeof value.sessionId === 'string' &&
  'operationId' in value &&
  typeof value.operationId === 'string';
const isRevisionRequest = (value: unknown): value is RevisionRequest =>
  !!value &&
  typeof value === 'object' &&
  'id' in value &&
  typeof value.id === 'string' &&
  'optionalIds' in value &&
  Array.isArray(value.optionalIds) &&
  value.optionalIds.every((id) => typeof id === 'string');
// These records identify native writes; optional choices/reading-position storage
// cannot replace them. docs/world-agent-runtime.md#durable-write-sessions
function readOperation<T>(key: string, valid: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (value === null || valid(value)) return value;
  } catch {
    // An unreadable original is not evidence that no operation was sent.
  }
  throw new Error('The original removal request could not be read. Restore storage and check it.');
}
function restoreOperation<T>(key: string, valid: (value: unknown) => value is T) {
  try {
    return readOperation(key, valid);
  } catch {
    return 'unreadable' as const;
  }
}
function writeOperation<T>(
  key: string,
  request: T,
  valid: (value: unknown) => value is T,
  clear = false,
) {
  const current = readOperation(key, valid);
  if (current && JSON.stringify(current) !== JSON.stringify(request))
    throw new Error('A different removal request remains retained. Check its original result.');
  const text = JSON.stringify(clear ? null : request);
  try {
    localStorage.setItem(key, text);
    if (localStorage.getItem(key) === text) return;
  } catch {
    // Retention and matching cleanup are required for these native operation IDs.
  }
  throw new Error(
    'The exact removal request could not be retained or cleared. Restore storage and check its original result.',
  );
}
const sections: Array<{ id: WorldStatusRemovalSection; label: string }> = [
  { id: 'definitions', label: 'Conditions to remove' },
  { id: 'optional', label: 'Optional supporting conditions' },
  { id: 'instances', label: 'Affected characters and objects' },
  { id: 'blockers', label: 'Reasons removal is blocked' },
];

/** Inspection prepares a native saved review; this never dispatches a model call. */
export function WorldStatusRemovalButton({
  worldId,
  sessionId,
  definitionId,
  label,
  disabled,
  onPrepared,
}: {
  worldId: string;
  sessionId?: string;
  definitionId: string;
  label: string;
  disabled?: boolean;
  onPrepared(sessionId: string, plan: WorldAgentPlanView): void;
}) {
  const scope = authoringKey(
    'removal-prepare',
    worldId,
    privateDraftScope(),
    sessionId ?? null,
    definitionId,
  );
  const [retained, setRetained] = useState(() => restoreOperation(scope, isPrepareRequest));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const pending = useRef(false);
  useEffect(
    () => () => {
      currentScope.current = '';
    },
    [],
  );
  async function prepare() {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const requestScope = scope;
    try {
      const stored = readOperation(scope, isPrepareRequest);
      if (retained === 'unreadable' && !stored) {
        setRetained(null);
        setError(
          'Storage is readable and no original removal request is retained. Nothing was sent.',
        );
        return;
      }
      const request = (retained !== 'unreadable' && retained) ||
        stored || {
          sessionId: sessionId ?? crypto.randomUUID(),
          operationId: crypto.randomUUID(),
        };
      writeOperation(scope, request, isPrepareRequest);
      setRetained(request);
      const result = await post<WorldAgentWorkResult<WorldAgentPlanView>>(
        '/api/world-agent/session/removal',
        { worldId, ...request, rootIds: [definitionId] },
      );
      if (currentScope.current !== requestScope) return;
      if (result.data?.removal) {
        writeOperation(scope, request, isPrepareRequest, true);
        setRetained(null);
        onPrepared(request.sessionId, result.data);
      } else {
        if (result.status !== 'unavailable') {
          writeOperation(scope, request, isPrepareRequest, true);
          setRetained(null);
        }
        throw new Error(result.message ?? 'A complete saved removal review could not be prepared.');
      }
    } catch (failure) {
      if (currentScope.current === requestScope) {
        setRetained((current) => current ?? restoreOperation(scope, isPrepareRequest));
        setError(failureText(failure));
      }
    } finally {
      pending.current = false;
      if (currentScope.current === requestScope) setBusy(false);
    }
  }
  return (
    <div className="ol-status-removal-entry">
      <Button size="sm" disabled={disabled} busy={busy} onPress={() => void prepare()}>
        {retained ? 'Check original removal preparation' : 'Review removal'}
      </Button>
      <p className="ol-caption">
        Review removing {label} and any conditions that require it. No paid calls.
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

/** Rows come from the complete retained native plan. Paging never changes its membership. */
export function WorldStatusRemovalDetails({
  worldId,
  sessionId,
  plan,
  removal,
  canChange,
  busy,
  onRevised,
  onUnsafeChange,
  onReadReady,
  onCancellationBlocked,
}: {
  worldId: string;
  sessionId: string;
  plan: WorldAgentPlanView;
  removal: WorldStatusRemovalSummary;
  canChange: boolean;
  busy: boolean;
  onRevised(plan: WorldAgentPlanView): void;
  onUnsafeChange(unsafe: boolean): void;
  onReadReady(): void;
  onCancellationBlocked(blocked: boolean): void;
}) {
  const scope = authoringKey(
    'removal-choices',
    worldId,
    privateDraftScope(),
    sessionId,
    plan.draftId,
    plan.revision,
    plan.id,
    removal.binding,
  );
  const readingKey = authoringKey(
    'removal-reading',
    worldId,
    privateDraftScope(),
    sessionId,
    plan.id,
  );
  const operationKey = authoringKey(
    'removal-revision-operation',
    worldId,
    privateDraftScope(),
    sessionId,
    plan.draftId,
    plan.revision,
    plan.id,
    removal.binding,
  );
  const [pendingRevision, setPendingRevision] = useState(() =>
    restoreOperation(operationKey, isRevisionRequest),
  );
  const [selected, setSelected] = useState(
    () =>
      (pendingRevision !== 'unreadable' && pendingRevision?.optionalIds) ||
      readLocal<string[]>(
        scope,
        removal.optionalIds,
        (value): value is string[] =>
          Array.isArray(value) && value.every((id) => typeof id === 'string'),
      ),
  );
  type Reading = {
    section: WorldStatusRemovalSection;
    cursors: Array<string | null>;
    pageIndex: number;
  };
  const [reading, setReading] = useState(() =>
    readLocal<Reading>(
      readingKey,
      { section: 'definitions', cursors: [null], pageIndex: 0 },
      (value): value is Reading =>
        !!value &&
        typeof value === 'object' &&
        'section' in value &&
        sections.some((entry) => entry.id === value.section) &&
        'cursors' in value &&
        Array.isArray(value.cursors) &&
        value.cursors.length > 0 &&
        value.cursors.every((cursor) => cursor === null || typeof cursor === 'string') &&
        'pageIndex' in value &&
        typeof value.pageIndex === 'number' &&
        Number.isSafeInteger(value.pageIndex) &&
        value.pageIndex >= 0 &&
        value.pageIndex < value.cursors.length,
    ),
  );
  const { section, cursors, pageIndex } = reading;
  const [page, setPage] = useState<WorldStatusRemovalPage>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const container = useRef<HTMLElement>(null);
  const working = useRef(false);
  const identity = authoringKey(
    'removal-page',
    worldId,
    privateDraftScope(),
    sessionId,
    plan.draftId,
    plan.revision,
    removal.binding,
    section,
    cursors[pageIndex] ?? null,
  );
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const dirty = !sameSelection(selected, removal.optionalIds);
  const editable =
    canChange &&
    removal.selectionEditable &&
    (plan.status === 'pending' || plan.status === 'approved');
  useEffect(() => {
    onUnsafeChange(dirty || saving || loading || !!error || !!pendingRevision || !page);
  }, [dirty, saving, loading, error, pendingRevision, page, onUnsafeChange]);
  useEffect(() => {
    onCancellationBlocked(saving || !!pendingRevision);
  }, [saving, pendingRevision, onCancellationBlocked]);
  useEffect(() => {
    if (plan.status === 'rejected' || plan.status === 'applied') {
      setSelected(removal.optionalIds);
      writeLocal(scope, null);
    }
  }, [plan.status]);
  useEffect(
    () => () => {
      currentIdentity.current = '';
      currentScope.current = '';
      onUnsafeChange(false);
      onCancellationBlocked(false);
    },
    [onUnsafeChange, onCancellationBlocked],
  );
  useEffect(() => {
    const controller = new AbortController();
    const requestIdentity = identity;
    setLoading(true);
    setError('');
    setPage(undefined);
    void post<WorldAgentWorkResult<WorldStatusRemovalPage>>(
      '/api/world-agent/session/removal-page',
      {
        worldId,
        sessionId,
        planId: plan.id,
        draftId: plan.draftId,
        revision: plan.revision,
        section,
        ...(cursors[pageIndex] ? { cursor: cursors[pageIndex] } : {}),
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted || currentIdentity.current !== requestIdentity) return;
        if (!result.ok || !result.data)
          throw new Error(result.message ?? 'Removal details are unavailable.');
        if (
          result.data.draftId !== plan.draftId ||
          result.data.revision !== plan.revision ||
          result.data.section !== section ||
          result.data.summary.binding !== removal.binding
        )
          throw new Error(
            'These details belong to a different removal review. Refresh the exact review.',
          );
        setPage(result.data);
        onReadReady();
      })
      .catch((failure) => {
        if (!controller.signal.aborted && currentIdentity.current === requestIdentity)
          setError(failureText(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted && currentIdentity.current === requestIdentity)
          setLoading(false);
      });
    return () => controller.abort();
  }, [identity, reload]);

  function choose(id: string, remove: boolean) {
    if (!editable || saving || busy || pendingRevision) return;
    // A choice takes effect before a second event can approve the old selection.
    onUnsafeChange(true);
    const next = remove
      ? [...new Set([...selected, id])]
      : selected.filter((value) => value !== id);
    setSelected(next);
    writeLocal(scope, next);
  }
  function navigate(next: Reading) {
    if (
      next.section === section &&
      next.pageIndex === pageIndex &&
      next.cursors[next.pageIndex] === cursors[pageIndex]
    )
      return;
    onUnsafeChange(true);
    setReading(next);
    writeLocal(readingKey, next);
  }
  async function saveChoices(refresh = false) {
    if ((!dirty && !pendingRevision && !refresh) || !editable || working.current || busy) return;
    working.current = true;
    onUnsafeChange(true);
    onCancellationBlocked(true);
    const restoreFocus = holdActionFocus(container.current);
    setSaving(true);
    setError('');
    const requestScope = scope;
    let retainedAfter = pendingRevision;
    try {
      const stored = readOperation(operationKey, isRevisionRequest);
      if (pendingRevision === 'unreadable' && !stored) {
        retainedAfter = null;
        setPendingRevision(null);
        setError(
          'Storage is readable and no original removal revision is retained. Nothing was sent.',
        );
        return;
      }
      const request = (pendingRevision !== 'unreadable' && pendingRevision) ||
        stored || {
          id: crypto.randomUUID(),
          optionalIds: selected,
        };
      writeOperation(operationKey, request, isRevisionRequest);
      retainedAfter = request;
      setPendingRevision(request);
      setSelected(request.optionalIds);
      const result = await post<WorldAgentWorkResult<WorldAgentPlanView>>(
        '/api/world-agent/session/removal',
        {
          worldId,
          sessionId,
          draftId: plan.draftId,
          expectedRevision: plan.revision,
          rootIds: removal.rootIds,
          optionalIds: request.optionalIds,
          operationId: request.id,
        },
      );
      if (currentScope.current !== requestScope) return;
      if (!result.data?.removal) {
        if (result.status !== 'unavailable') {
          writeOperation(operationKey, request, isRevisionRequest, true);
          retainedAfter = null;
          setPendingRevision(null);
        }
        throw new Error(result.message ?? 'The revised removal review could not be saved.');
      }
      writeOperation(operationKey, request, isRevisionRequest, true);
      retainedAfter = null;
      setPendingRevision(null);
      writeLocal(scope, null);
      onRevised(result.data);
    } catch (failure) {
      if (currentScope.current === requestScope) {
        retainedAfter ??= restoreOperation(operationKey, isRevisionRequest);
        setPendingRevision(retainedAfter);
        setError(failureText(failure));
      }
    } finally {
      working.current = false;
      if (currentScope.current === requestScope) {
        setSaving(false);
        // A pre-dispatch storage failure can batch both saving updates away, so
        // its synchronous parent guard must settle even without another Effect.
        onCancellationBlocked(!!retainedAfter);
        restoreFocus();
      }
    }
  }
  return (
    <section
      ref={container}
      tabIndex={-1}
      className="ol-status-removal"
      aria-label="Condition removal consequences"
    >
      <h3>Conditions and current effects to remove</h3>
      <p>
        {removal.totals.definitions} conditions · {removal.totals.instances} current condition
        records · {removal.totals.activities} activities ending · {removal.totals.blockers}{' '}
        blockers. These totals cover the entire saved review.
      </p>
      <p>Historical events, memories, learned knowledge and completed actions remain.</p>
      {removal.status !== 'complete' && <p role="status">{plan.validation.message}</p>}
      <div className="ol-agent-tools" aria-label="Removal detail sections">
        {sections.map((entry) => (
          <Button
            key={entry.id}
            size="sm"
            variant="quiet"
            aria-pressed={section === entry.id}
            disabled={saving}
            onPress={() => {
              navigate({ section: entry.id, cursors: [null], pageIndex: 0 });
            }}
          >
            {entry.label} ({removal.totals[entry.id]})
          </Button>
        ))}
      </div>
      {loading && <p role="status">Reading this page of the saved removal review…</p>}
      {error && <p role="alert">{error} Your optional choices are retained.</p>}
      {error && (
        <Button
          size="sm"
          variant="quiet"
          disabled={loading || saving}
          onPress={() => {
            navigate({ section, cursors: [null], pageIndex: 0 });
            setReload((value) => value + 1);
          }}
        >
          Read this section from the beginning
        </Button>
      )}
      {page?.section === 'definitions' && (
        <>
          {!page.definitions.length && <p>No conditions on this page.</p>}
          <ul className="ol-status-removal-list">
            {page.definitions.map((row) => (
              <li key={row.id}>
                <Checkbox className="ol-status-removal-choice" isSelected isDisabled>
                  <span className="ol-status-removal-mark" aria-hidden="true" />
                  <strong>{row.label}</strong>
                </Checkbox>
                <p>
                  {row.selectedRoot
                    ? removal.optionalIds.includes(row.id)
                      ? 'Selected optional removal. Change this choice under Optional supporting conditions.'
                      : 'Chosen for removal.'
                    : `Required: this condition refers to ${row.reason.viaDefinitionLabel ?? 'another condition being removed'}.`}
                </p>
                {row.reason.witness.length > 1 && (
                  <p className="ol-caption">
                    Dependency chain: {row.reason.witnessLabels.join(' → ')}
                  </p>
                )}
                <p className="ol-caption">
                  Condition ID: {row.id}
                  {row.reason.sourcePath && ` · reference: ${row.reason.sourcePath}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      {page?.section === 'optional' && (
        <>
          <p>
            Supporting conditions stay by default. Choosing one adds it and every condition that
            requires it to a new removal review.
          </p>
          {!removal.selectionEditable && (
            <p>
              These choices belong to the saved policy proposal. Revise that proposal before
              changing which supporting conditions are removed.
            </p>
          )}
          {!page.optional.length && <p>No optional supporting conditions on this page.</p>}
          {page.optional.map((row) => (
            <div key={row.id}>
              <Checkbox
                className="ol-status-removal-choice"
                isSelected={row.required || selected.includes(row.id)}
                isDisabled={!editable || saving || busy || !!pendingRevision || row.required}
                onChange={(value) => choose(row.id, value)}
              >
                <span className="ol-status-removal-mark" aria-hidden="true" />
                <span>
                  Also remove <strong>{row.label}</strong>
                </span>
              </Checkbox>
              {row.required && (
                <p>
                  Required by another selected condition. It cannot be kept while that dependency is
                  removed.
                </p>
              )}
              <p className="ol-caption">
                Used by removed conditions: {row.referencedByLabels.join(', ')}. Condition ID:{' '}
                {row.id}.
              </p>
            </div>
          ))}
        </>
      )}
      {page?.section === 'instances' && (
        <>
          {!page.instances.length && (
            <p>
              No current condition records on this page. Removing an unused definition is still a
              real world change.
            </p>
          )}
          <ul className="ol-status-removal-list">
            {page.instances.map((row) => (
              <li key={JSON.stringify([row.entityId, row.definitionId, row.recordId, row.episode])}>
                <strong>{row.entityLabel}</strong>
                <p>
                  {row.definitionLabel}: {row.active ? 'active effect ends' : 'inactive condition'};{' '}
                  {row.disposition === 'remove'
                    ? 'its current record is removed'
                    : 'its retained record remains'}
                  .
                </p>
                {row.action && (
                  <p>
                    {row.action.label} ends
                    {row.action.workInvocationId ? '; its occupied work is released' : ''}.
                  </p>
                )}
                <details>
                  <summary>Exact affected record</summary>
                  <p className="ol-caption">
                    Entity {row.entityId} · condition {row.definitionId} · record {row.recordId} ·
                    episode {row.episode}.
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
      {page?.section === 'blockers' && (
        <>
          {!page.blockers.length && <p>No blockers on this page.</p>}
          <ul className="ol-status-removal-list">
            {page.blockers.map((row, index) => (
              <li key={JSON.stringify([row.kind, row.definitionId, row.sourcePath, index])}>
                <p>{row.message}</p>
                {row.sourcePath && <p className="ol-caption">Reference: {row.sourcePath}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
      {page && (
        <div className="ol-agent-tools">
          <span className="ol-caption">Page {pageIndex + 1}</span>
          {pageIndex > 0 && (
            <Button
              size="sm"
              variant="quiet"
              disabled={loading || saving}
              onPress={() => navigate({ ...reading, pageIndex: pageIndex - 1 })}
            >
              Previous page
            </Button>
          )}
          {page.nextCursor && (
            <Button
              size="sm"
              variant="quiet"
              disabled={loading || saving}
              onPress={() => {
                navigate({
                  section,
                  cursors: [...cursors.slice(0, pageIndex + 1), page.nextCursor],
                  pageIndex: pageIndex + 1,
                });
              }}
            >
              Next page
            </Button>
          )}
        </div>
      )}
      {removal.selectionEditable && (
        <div className="ol-status-removal-selection">
          <p>{selected.length} optional removals selected across all pages.</p>
          {dirty && (
            <p role="status">
              Save these choices to create a new exact review. Any earlier approval cannot authorize
              the revised removal.
            </p>
          )}
          {pendingRevision && (
            <p role="status">
              The revised removal review needs confirmation. Check it before changing optional
              removals.
            </p>
          )}
          <Button
            size="sm"
            disabled={(!dirty && !pendingRevision) || !editable || saving || busy}
            busy={saving}
            onPress={() => void saveChoices()}
          >
            {pendingRevision ? 'Check original review revision' : 'Save removal choices and review'}
          </Button>
          <Button
            size="sm"
            variant="quiet"
            disabled={!editable || dirty || !!pendingRevision || saving || busy}
            onPress={() => void saveChoices(true)}
          >
            Refresh removal review
          </Button>
          <p className="ol-caption">
            Refreshing keeps your selected conditions, checks their current consequences and
            requires a new approval.
          </p>
          {dirty && !pendingRevision && (
            <Button
              size="sm"
              variant="quiet"
              disabled={saving || busy}
              onPress={() => {
                setSelected(removal.optionalIds);
                writeLocal(scope, null);
              }}
            >
              Discard optional changes
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
