import { useEffect, useRef, useState } from 'react';
import type {
  WorldAgentDraftView,
  WorldAgentExactDraftView,
  WorldAgentDraftHistoryView,
  WorldAgentDraftComparisonView,
  WorldAgentPlanView,
  WorldAgentSessionStatus,
  WorldAgentSessionView,
  WorldAgentValidation,
  WorldAgentWorkResult,
} from '@open-legend/protocol';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { Button, EmptyState, Icon, Tag } from '../design-system/components';
import { post, privateDraftScope } from '../api';
import { readLocal, writeLocal } from './storage';
import { WorldAgentPreparationDetails } from './world-agent-work-details';
import { WorldAgentRecipeEditor, hasRetainedRecipeEdit } from './world-agent-recipe-editor';
import './world-agent-work.css';

export interface WorldAgentWorkViewProps {
  worldId: string;
  sessionId: string;
  accessScope: string;
  session: WorldAgentSessionView;
  connected: boolean;
  visible: boolean;
  onRefresh(): void;
  onOpenReview(planId: string): void;
}
const kindLabel: Record<WorldAgentDraftView['kind'], string> = {
  recipe: 'Recipe',
  attribute: 'Characteristic definition',
  'attribute-bindings': 'Character characteristics',
  'attribute-values': 'Character characteristic values',
  'status-effect-policy': 'Status rules',
  'cognition-policy': 'Rules for character thought',
  action: 'Action definition',
};
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Saved work is unavailable. Try this exact request again.';
const selectionValid = (value: unknown): value is { id: string; revision: number } =>
  !!value &&
  typeof value === 'object' &&
  'id' in value &&
  typeof value.id === 'string' &&
  'revision' in value &&
  typeof value.revision === 'number' &&
  Number.isSafeInteger(value.revision) &&
  value.revision > 0;
const displayValue = (value: unknown, present: boolean) =>
  !present ? 'Not present' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);

/** Human inspection shares the session/draft owner. Local state never grants permission.
 * docs/projects/next-playable-week/invention-workspace.md#human-read-and-edit-contract
 */
export function WorldAgentWorkView(props: WorldAgentWorkViewProps) {
  const { worldId, sessionId, accessScope, session, connected, visible, onRefresh, onOpenReview } =
    props;
  const scope = `${worldId}:${accessScope}:${sessionId}`;
  // Local recovery survives a new connection; requests still use the full access scope.
  const storageScope = `${worldId}:${privateDraftScope()}:${sessionId}`;
  const key = `open-legend:authoring:${storageScope}:work-selection`;
  const [selected, setSelected] = useState(() =>
    readLocal<{ id: string; revision: number } | null>(key, null, selectionValid),
  );
  const [rows, setRows] = useState<WorldAgentDraftView[]>(session.drafts);
  const [next, setNext] = useState(session.nextDraft);
  const [exact, setExact] = useState<WorldAgentExactDraftView>();
  const [history, setHistory] = useState<WorldAgentDraftHistoryView>();
  const [comparison, setComparison] = useState<WorldAgentDraftComparisonView>();
  const [validation, setValidation] = useState<WorldAgentValidation>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [switchTo, setSwitchTo] = useState<{ id: string; revision: number }>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const identity = `${scope}:${selected?.id}:${selected?.revision}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const loadSequence = useRef(0);
  const workSequence = useRef(0);
  const working = useRef(false);
  const paged = useRef(false);
  const workspace = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const listPosition = useRef(0);
  const returnRow = useRef<string | null>(null);
  const mutationReason = !connected
    ? 'Reconnect before changing saved work.'
    : session.workspaceMutationReason;

  useEffect(() => {
    return () => {
      identityRef.current = '';
    };
  }, []);
  useEffect(() => {
    setRows((previous) => {
      const map = new Map(previous.map((row) => [row.id, row]));
      for (const row of session.drafts) {
        const prior = map.get(row.id);
        if (!prior || row.revision >= prior.revision) map.set(row.id, row);
      }
      return [...map.values()];
    });
    // Session polling returns the first page; it must not reset a continuation.
    if (!paged.current) setNext(session.nextDraft);
  }, [session.drafts, session.nextDraft]);
  useEffect(() => {
    writeLocal(key, selected);
  }, [key, selected]);
  useEffect(() => {
    if (!selected || !visible) return;
    const requestIdentity = identity;
    const sequence = ++loadSequence.current;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void read<WorldAgentExactDraftView>(
      'draft-read',
      { draftId: selected.id, revision: selected.revision },
      controller.signal,
    )
      .then((result) => {
        if (
          controller.signal.aborted ||
          identityRef.current !== requestIdentity ||
          loadSequence.current !== sequence
        )
          return;
        if (result.id !== selected.id || result.revision !== selected.revision)
          throw new Error(
            'The returned draft is not the exact revision you selected. Refresh this exact request.',
          );
        setExact(result);
        setValidation(result.validation);
        if (
          result.kind === 'recipe' &&
          hasRetainedRecipeEdit(
            result,
            `open-legend:authoring:${storageScope}:${result.id}:${result.revision}:recipe-edit`,
          )
        ) {
          setEditorOpen(true);
          setDirty(true);
        }
      })
      .catch((failure) => {
        if (
          !controller.signal.aborted &&
          identityRef.current === requestIdentity &&
          loadSequence.current === sequence
        )
          setError(errorText(failure));
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          identityRef.current === requestIdentity &&
          loadSequence.current === sequence
        )
          setLoading(false);
      });
    return () => controller.abort();
  }, [identity, visible, reload]);
  useEffect(() => {
    if (!visible) return;
    if (selected) detailHeading.current?.focus();
    else if (list.current) {
      list.current.scrollTop = listPosition.current;
      const row = [...list.current.querySelectorAll<HTMLButtonElement>('.ol-agent-work-row')].find(
        (node) => node.dataset.draftId === returnRow.current,
      );
      row?.focus({ preventScroll: true });
    }
  }, [selected?.id, selected?.revision, exact?.revision]);

  async function read<T>(
    suffix: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await post<WorldAgentWorkResult<T>>(
      `/api/world-agent/session/${suffix}`,
      { worldId, sessionId, ...body },
      signal,
    );
    if (!response.ok || response.data === undefined)
      throw new Error(response.message ?? 'This exact saved work is unavailable.');
    return response.data;
  }
  function select(value: { id: string; revision: number } | null, discard = false) {
    if (value && selected?.id === value.id && selected.revision === value.revision) return;
    if (dirty && !discard && value) {
      setSwitchTo(value);
      return;
    }
    if (list.current?.getClientRects().length) listPosition.current = list.current.scrollTop;
    if (!value) returnRow.current = selected?.id ?? null;
    setSelected(value);
    setExact(undefined);
    setHistory(undefined);
    setComparison(undefined);
    setValidation(undefined);
    setEditorOpen(false);
    setDirty(false);
    setNotice('');
    setError('');
  }
  async function perform(work: (requestIdentity: string) => Promise<void>) {
    if (working.current) return;
    working.current = true;
    const sequence = ++workSequence.current;
    const opener =
      document.activeElement instanceof HTMLButtonElement &&
      workspace.current?.contains(document.activeElement)
        ? document.activeElement
        : null;
    const holdingFocus = opener ? (detailHeading.current ?? workspace.current) : null;
    // Disabled buttons lose focus. Keep keyboard position inside this task while
    // waiting, and restore it only if the player has not moved elsewhere.
    holdingFocus?.focus({ preventScroll: true });
    setBusy(true);
    setError('');
    setNotice('');
    const requestIdentity = identity;
    try {
      await work(requestIdentity);
    } catch (failure) {
      if (identityRef.current === requestIdentity) setError(errorText(failure));
    } finally {
      working.current = false;
      setBusy(false);
      if (opener)
        requestAnimationFrame(() => {
          if (
            workSequence.current === sequence &&
            identityRef.current === requestIdentity &&
            document.activeElement === holdingFocus &&
            workspace.current?.getClientRects().length &&
            opener.isConnected &&
            !opener.disabled
          )
            opener.focus();
        });
    }
  }
  async function loadMore() {
    if (!next) return;
    await perform(async (requestIdentity) => {
      const response = await post<WorldAgentSessionStatus & { ok: boolean; message?: string }>(
        '/api/world-agent/session/status',
        { worldId, sessionId, afterDraft: next },
      );
      if (!response.ok || !response.data)
        throw new Error(response.message ?? 'More saved drafts are unavailable.');
      if (identityRef.current !== requestIdentity) return;
      const page = response.data;
      paged.current = true;
      setRows((current) => [
        ...new Map([...current, ...page.drafts].map((row) => [row.id, row])).values(),
      ]);
      setNext(response.data.nextDraft);
    });
  }
  async function moreExactReviews() {
    if (!selected || !exact?.nextPlan) return;
    await perform(async (requestIdentity) => {
      const response = await read<WorldAgentExactDraftView>('draft-read', {
        draftId: selected.id,
        revision: selected.revision,
        afterPlan: exact.nextPlan,
      });
      if (identityRef.current !== requestIdentity) return;
      setExact(
        (current) =>
          current && {
            ...response,
            plans: [
              ...new Map(
                [...current.plans, ...response.plans].map((plan) => [plan.id, plan]),
              ).values(),
            ],
          },
      );
    });
  }
  async function showHistory(before?: number) {
    if (!selected) return;
    await perform(async (requestIdentity) => {
      const response = await read<WorldAgentDraftHistoryView>('draft-history', {
        draftId: selected.id,
        ...(before !== undefined ? { before } : {}),
      });
      if (identityRef.current !== requestIdentity) return;
      setHistory((previous) =>
        before !== undefined && previous
          ? { ...response, revisions: [...previous.revisions, ...response.revisions] }
          : response,
      );
    });
  }
  async function compare(fromRevision: number) {
    if (!selected) return;
    if (working.current) return;
    setComparison(undefined);
    await perform(async (requestIdentity) => {
      const response = await read<WorldAgentDraftComparisonView>('draft-compare', {
        draftId: selected.id,
        fromRevision,
        toRevision: selected.revision,
      });
      if (identityRef.current === requestIdentity) setComparison(response);
    });
  }
  async function check() {
    if (!selected || !connected) return;
    await perform(async (requestIdentity) => {
      const response = await read<WorldAgentValidation>('draft-check', {
        draftId: selected.id,
        revision: selected.revision,
      });
      if (identityRef.current !== requestIdentity) return;
      setValidation(response);
      setNotice(
        'Native checks completed for this exact saved revision. No world change was applied.',
      );
    });
  }
  const prepareKey = selected
    ? `open-legend:authoring:${storageScope}:${selected.id}:${selected.revision}:prepare-operation`
    : '';
  const prepareBody = selected ? { draftId: selected.id, revision: selected.revision } : null;
  const prepareSerialized = JSON.stringify(prepareBody);
  const retainedPrepare = readLocal<{ body: string; id: string } | null>(
    prepareKey,
    null,
    (value): value is { body: string; id: string } =>
      !!value &&
      typeof value === 'object' &&
      'body' in value &&
      typeof value.body === 'string' &&
      'id' in value &&
      typeof value.id === 'string',
  );
  const canRetryPrepare = retainedPrepare?.body === prepareSerialized;
  async function prepare(retry = false) {
    if (!selected || !connected || (retry ? !canRetryPrepare : !!mutationReason)) return;
    const body = { draftId: selected.id, revision: selected.revision };
    const serialized = JSON.stringify(body);
    const operationId =
      canRetryPrepare && retainedPrepare ? retainedPrepare.id : crypto.randomUUID();
    writeLocal(prepareKey, { body: serialized, id: operationId });
    await perform(async (requestIdentity) => {
      const response = await post<WorldAgentWorkResult<WorldAgentPlanView>>(
        '/api/world-agent/session/draft-prepare',
        { worldId, sessionId, ...body, operationId },
      );
      if (identityRef.current !== requestIdentity) return;
      if (!response.ok || !response.data) {
        if (response.status !== 'unavailable') writeLocal(prepareKey, null);
        throw new Error(response.message ?? 'This exact review was not prepared.');
      }
      if (response.data.draftId !== body.draftId || response.data.revision !== body.revision)
        throw new Error(
          'The returned review is for a different exact revision. Retry this request.',
        );
      writeLocal(prepareKey, null);
      onRefresh();
      onOpenReview(response.data.id);
    });
  }
  const selectedExact =
    exact && exact.id === selected?.id && exact.revision === selected.revision ? exact : undefined;
  const applicablePlans =
    selectedExact?.plans ??
    session.plans.filter(
      (plan) => plan.draftId === selected?.id && plan.revision === selected.revision,
    );
  const historical = selectedExact && selectedExact.revision !== selectedExact.latestRevision;

  return (
    <section
      ref={workspace}
      tabIndex={-1}
      className="ol-agent-work"
      aria-label="Saved invention work"
      hidden={!visible}
      data-detail={!!selected}
    >
      <div className="ol-agent-work-panes">
        <div ref={list} className="ol-agent-work-list" aria-label="Saved drafts">
          <h3>Saved work</h3>
          {!rows.length && (
            <EmptyState title="No saved drafts yet">
              Completed proposals will appear here. Reading work never starts a model request.
            </EmptyState>
          )}
          {rows.map((row) => (
            <Button
              key={row.id}
              variant="quiet"
              className="ol-agent-work-row"
              data-draft-id={row.id}
              aria-pressed={selected?.id === row.id}
              onPress={() => select({ id: row.id, revision: row.revision })}
            >
              <strong>{row.title ?? row.intent}</strong>
              <span>
                <Icon
                  name={
                    (row.state ?? row.preparation?.next) === 'ready_for_review'
                      ? 'ui.check'
                      : (row.state ?? row.preparation?.next) === 'blocked'
                        ? 'ui.lock'
                        : (row.state ?? row.preparation?.next) === 'pending_analysis'
                          ? 'ui.refresh'
                          : 'ui.json'
                  }
                  size={14}
                />
                {kindLabel[row.kind]} · revision {row.revision} · saved preparation:{' '}
                {(row.state ?? row.preparation?.next)?.replaceAll('_', ' ') ?? 'Saved proposal'}
                {row.summary && ` — ${row.summary}`}
              </span>
            </Button>
          ))}
          {next && (
            <Button size="sm" variant="quiet" disabled={busy} onPress={() => void loadMore()}>
              More saved drafts
            </Button>
          )}
          <section aria-label="Saved exact reviews">
            <h4>Exact reviews</h4>
            {!session.plans.length && (
              <p className="ol-caption">No prepared changes on this page.</p>
            )}
            {session.plans.map((plan) => (
              <article key={plan.id}>
                <p>{plan.validation.semantics}</p>
                <p className="ol-caption">
                  Revision {plan.revision} · {plan.status} · {plan.validation.message}
                </p>
                <Button size="sm" variant="quiet" onPress={() => onOpenReview(plan.id)}>
                  Inspect exact review
                </Button>
              </article>
            ))}
          </section>
        </div>
        <div className="ol-agent-work-detail">
          {!selected && (
            <EmptyState title="Choose saved work">
              Inspect the exact proposal, its native checks and its retained revisions.
            </EmptyState>
          )}
          {selected && (
            <>
              <div className="ol-agent-work-header">
                <Button
                  size="sm"
                  variant="quiet"
                  onPress={() => {
                    // Returning to the list leaves the edit mounted and device-local.
                    if (dirty) {
                      setSwitchTo({ id: '', revision: 0 });
                      return;
                    }
                    select(null);
                  }}
                >
                  Back to saved work
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  disabled={busy || loading}
                  onPress={() => setReload((value) => value + 1)}
                >
                  Refresh exact revision
                </Button>
              </div>
              {loading && <p role="status">Loading revision {selected.revision}…</p>}
              {selectedExact && (
                <>
                  <h3 ref={detailHeading} tabIndex={-1}>
                    {selectedExact.title}
                  </h3>
                  <p>{selectedExact.summary}</p>
                  <details>
                    <summary>Original purpose</summary>
                    <p>{selectedExact.intent}</p>
                  </details>
                  <p>
                    <Tag>{kindLabel[selectedExact.kind]}</Tag> · revision {selectedExact.revision}
                  </p>
                  {historical && (
                    <p role="status">
                      Historical revision. Its values and receipts remain readable. Edit the latest
                      revision to create a new proposal.{' '}
                      <Button
                        size="sm"
                        variant="quiet"
                        onPress={() =>
                          select({ id: selectedExact.id, revision: selectedExact.latestRevision })
                        }
                      >
                        Open latest revision {selectedExact.latestRevision}
                      </Button>
                    </p>
                  )}
                  <WorldAgentPreparationDetails
                    preparation={selectedExact.preparation}
                    preparationRevision={selectedExact.revision}
                    validation={validation}
                  />
                  <div className="ol-agent-tools">
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={busy}
                      onPress={() => void showHistory()}
                    >
                      History
                    </Button>
                    {selectedExact.kind === 'recipe' && !historical && (
                      <Button
                        size="sm"
                        variant="quiet"
                        disabled={busy}
                        onPress={() => setEditorOpen(true)}
                      >
                        Edit recipe
                      </Button>
                    )}
                  </div>
                  {selectedExact.kind !== 'recipe' && (
                    <p className="ol-caption">
                      This kind can be revised in Conversation. Exact inspection, native checks and
                      review are available here.
                    </p>
                  )}
                  {history && (
                    <section aria-label="Exact revision history">
                      <h4>Retained revisions</h4>
                      {history.revisions.map((revision) => (
                        <div key={revision.revision} className="ol-agent-history-row">
                          <span>
                            Revision {revision.revision} · {revision.intent}
                          </span>
                          <Button
                            size="sm"
                            variant="quiet"
                            disabled={busy}
                            onPress={() => select({ id: revision.id, revision: revision.revision })}
                          >
                            Inspect revision {revision.revision}
                          </Button>
                          {revision.revision !== selectedExact.revision && (
                            <Button
                              size="sm"
                              variant="quiet"
                              disabled={busy}
                              onPress={() => void compare(revision.revision)}
                            >
                              Compare from {revision.revision}
                            </Button>
                          )}
                        </div>
                      ))}
                      {history.next !== null && (
                        <Button
                          size="sm"
                          variant="quiet"
                          disabled={busy}
                          onPress={() => void showHistory(history.next ?? undefined)}
                        >
                          Earlier revisions
                        </Button>
                      )}
                    </section>
                  )}
                  {comparison && (
                    <section aria-label="Exact revision comparison">
                      <h4>
                        Revision {comparison.before.revision} → {comparison.after.revision}
                      </h4>
                      <p className="ol-caption">
                        These are structural proposed changes. Native validation is shown
                        separately; comparison does not prove broader consequences.
                      </p>
                      {!comparison.changed.length && <p>No changed fields.</p>}
                      <div className="ol-agent-comparison-scroll">
                        <table className="ol-agent-comparison">
                          <thead>
                            <tr>
                              <th scope="col">Field</th>
                              <th scope="col">Before</th>
                              <th scope="col">After</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparison.changed.map((change) => (
                              <tr key={change.field}>
                                <th scope="row">
                                  {(() => {
                                    const field =
                                      comparison.after.recipeEditor?.fields.find(
                                        (field) => field.path.join('.') === change.field,
                                      ) ??
                                      comparison.before.recipeEditor?.fields.find(
                                        (field) => field.path.join('.') === change.field,
                                      );
                                    return field
                                      ? `${field.label}${field.unit ? ` (${field.unit})` : ''}`
                                      : change.field;
                                  })()}
                                </th>
                                <td>
                                  <pre>{displayValue(change.before, change.beforePresent)}</pre>
                                </td>
                                <td>
                                  <pre>{displayValue(change.after, change.afterPresent)}</pre>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="ol-caption">
                        Before:{' '}
                        {comparison.before.validation.ok
                          ? 'Native checks passed'
                          : comparison.before.validation.message}
                        . After:{' '}
                        {comparison.after.validation.ok
                          ? 'Native checks passed'
                          : comparison.after.validation.message}
                        .
                      </p>
                    </section>
                  )}
                  {editorOpen && !dirty && (
                    <Button size="sm" variant="quiet" onPress={() => setEditorOpen(false)}>
                      Close recipe editor
                    </Button>
                  )}
                  {editorOpen && (
                    <WorldAgentRecipeEditor
                      key={`${scope}:${selectedExact.id}:${selectedExact.revision}`}
                      draft={selectedExact}
                      worldId={worldId}
                      sessionId={sessionId}
                      accessScope={accessScope}
                      connected={connected}
                      mutationReason={mutationReason}
                      onDirty={setDirty}
                      onRebased={(latest) => {
                        select({ id: latest.id, revision: latest.revision }, true);
                        setExact(latest);
                        setValidation(latest.validation);
                        setEditorOpen(true);
                        setDirty(true);
                        setNotice(
                          `Local edit now starts from revision ${latest.revision}. It has not been saved or applied.`,
                        );
                      }}
                      onSaved={(saved) => {
                        setRows((current) => [
                          ...new Map([...current, saved].map((row) => [row.id, row])).values(),
                        ]);
                        select({ id: saved.id, revision: saved.revision }, true);
                        setExact(saved);
                        setValidation(saved.validation);
                        onRefresh();
                        setNotice(
                          `Saved revision ${saved.revision}. Review and approval remain separate.`,
                        );
                      }}
                    />
                  )}
                  <details>
                    <summary>Exact saved candidate</summary>
                    <pre className="ol-agent-json">
                      {JSON.stringify(selectedExact.payload, null, 2)}
                    </pre>
                  </details>
                  {!!applicablePlans.length && (
                    <section aria-label="Reviews for selected revision">
                      {applicablePlans.map((plan) => (
                        <article key={plan.id}>
                          <p>
                            Exact review: {plan.status} · {plan.validation.message}
                          </p>
                          {plan.result && <p>{plan.result.message}</p>}
                          <Button size="sm" variant="quiet" onPress={() => onOpenReview(plan.id)}>
                            Inspect revision {plan.revision} review
                          </Button>
                        </article>
                      ))}
                      {selectedExact.nextPlan && (
                        <Button
                          size="sm"
                          variant="quiet"
                          disabled={busy}
                          onPress={() => void moreExactReviews()}
                        >
                          More exact reviews for this revision
                        </Button>
                      )}
                    </section>
                  )}
                  <div className="ol-agent-work-actions">
                    {error && <p role="alert">{error}</p>}
                    {notice && <p role="status">{notice}</p>}
                    {mutationReason && <p role="status">{mutationReason}</p>}
                    {dirty && (
                      <p role="status">
                        Save or discard your local edit before checking or preparing this saved
                        revision.
                      </p>
                    )}
                    <div className="ol-agent-tools">
                      <Button
                        size="sm"
                        disabled={busy || dirty || !connected}
                        onPress={() => void check()}
                      >
                        Check saved revision
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={
                          busy || dirty || !!mutationReason || !!historical || canRetryPrepare
                        }
                        onPress={() => void prepare()}
                      >
                        Prepare exact review
                      </Button>
                      {canRetryPrepare && (
                        <Button
                          size="sm"
                          disabled={busy || !connected}
                          onPress={() => void prepare(true)}
                        >
                          Retry original Prepare
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {!selectedExact && error && <p role="alert">{error}</p>}
          {!selectedExact && notice && <p role="status">{notice}</p>}
        </div>
      </div>
      {switchTo && (
        <ModalOverlay
          className="ol-root ol-modal-overlay"
          isOpen
          isDismissable
          onOpenChange={(open) => {
            if (!open) setSwitchTo(undefined);
          }}
        >
          <Modal className="ol-modal">
            <Dialog className="ol-person-dialog" aria-label="Unsaved recipe changes">
              <h2>Keep this recipe edit?</h2>
              <p>Your unfinished changes have not been saved as a revision.</p>
              <Button variant="primary" onPress={() => setSwitchTo(undefined)}>
                Keep editing
              </Button>
              <Button
                variant="quiet"
                onPress={() => {
                  writeLocal(
                    `open-legend:authoring:${storageScope}:${selected?.id}:${selected?.revision}:recipe-edit`,
                    null,
                  );
                  select(switchTo.id ? switchTo : null, true);
                  setSwitchTo(undefined);
                }}
              >
                Discard changes and continue
              </Button>
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </section>
  );
}
