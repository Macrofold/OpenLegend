import { useEffect, useRef, useState } from 'react';
import type {
  CognitionLabArtifact,
  CognitionLabConfiguration,
  CognitionLabJson,
  CognitionLabPage,
  CognitionLabPrepared,
  CognitionLabRun,
  CognitionLabStage,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import { formatDisplayNumber } from '@open-legend/language';
import { Button, SelectField } from '../design-system/components';
import {
  expected,
  LabAccessError,
  LabResponseError,
  labMessage,
  labRead,
  labRefreshReceipt,
} from './api';
import {
  LabEmpty,
  LabError,
  LabIconButton,
  LabJson,
  LabModal,
  LabPane,
  LabSearch,
  LabTabs,
  LabTextEditor,
  LabUpdates,
} from './controls';
import { SourceModal } from './current-editor';
import { bytesLabel, instantLabel, readableStatus, type LabExecute } from './types';
import { useLabPage, useLabRead } from './use-lab-read';

export interface LabSelection {
  runId: string;
  rootId?: string;
  stageId?: string;
}
type InspectorSection =
  | 'overview'
  | 'input'
  | 'questions'
  | 'memories'
  | 'changes'
  | 'calls'
  | 'wire'
  | 'timing';
const sections: Array<{ id: InspectorSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'input', label: 'Inputs' },
  { id: 'questions', label: 'Choices' },
  { id: 'changes', label: 'Changes' },
  { id: 'calls', label: 'Calls' },
  { id: 'wire', label: 'Provider exchange' },
  { id: 'timing', label: 'Timing/cost' },
];

export function LabInspector({
  workspace,
  onAccessError,
  selection,
  select,
  follow,
  setFollow,
  refresh,
  execute,
  busy,
  showPrepared,
  closePrepared,
  title = 'Recorded decisions',
  active = true,
  comparison = false,
}: {
  workspace: CognitionLabWorkspace;
  onAccessError(error: LabAccessError, ownerScope: string): void;
  selection?: LabSelection;
  select(selection: LabSelection | undefined): void;
  follow: boolean;
  setFollow(follow: boolean): void;
  refresh: number;
  execute: LabExecute;
  busy: boolean;
  showPrepared: boolean;
  closePrepared(): void;
  title?: string;
  active?: boolean;
  comparison?: boolean;
}) {
  const disclosureScope = JSON.stringify([workspace.workspaceId, workspace.disclosureRevision]);
  const [query, setQuery] = useState('');
  const [sourceQuery, setSourceQuery] = useState<string>();
  const [callQuery, setCallQuery] = useState<string>();
  const [section, setSection] = useState<InspectorSection>('overview');
  const [source, setSource] = useState<string>();
  const [payload, setPayload] = useState<{ id: string; label: string }>();
  const [annotation, setAnnotation] = useState(false);
  const [replay, setReplay] = useState<{ scope: string; originId: string; name: string }>();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const runs = useLabPage(
    active && !selection ? JSON.stringify([disclosureScope, query]) : undefined,
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabRun>>('/runs', { query, cursor, limit: 50 }, signal),
    refresh,
    query ? 150 : 0,
  );
  const run = useLabRead(
    active && selection ? JSON.stringify([disclosureScope, selection.runId]) : undefined,
    (signal) =>
      labRead<CognitionLabRun>(
        `/runs/${encodeURIComponent(selection?.runId ?? '')}`,
        undefined,
        signal,
      ),
    refresh,
  );
  const roots = useLabPage(
    active && selection
      ? JSON.stringify([disclosureScope, selection.runId, 'roots', sourceQuery])
      : undefined,
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabStage>>(
        `/runs/${encodeURIComponent(selection?.runId ?? '')}/records`,
        { kind: 'root', query: sourceQuery, cursor, limit: 50 },
        signal,
      ),
    refresh,
    sourceQuery ? 150 : 0,
  );
  const rootId =
    selection?.rootId ??
    run.value?.latestRootId ??
    (roots.value?.items.length === 1 ? roots.value.items[0]?.id : undefined);
  const root = useLabRead(
    active && selection && rootId
      ? JSON.stringify([disclosureScope, selection.runId, rootId])
      : undefined,
    (signal) =>
      labRead<CognitionLabStage>(
        `/runs/${encodeURIComponent(selection?.runId ?? '')}/stages/${encodeURIComponent(rootId ?? '')}`,
        { section: 'overview' },
        signal,
      ),
    refresh,
  );
  const callId = selection?.stageId ?? root.value?.primaryStageId;
  const calls = useLabPage(
    active && selection && rootId
      ? JSON.stringify([disclosureScope, selection.runId, rootId, 'calls', callQuery])
      : undefined,
    (cursor, signal) =>
      labRead<CognitionLabPage<CognitionLabStage>>(
        `/runs/${encodeURIComponent(selection?.runId ?? '')}/records`,
        { kind: 'stage', rootId, query: callQuery, cursor, limit: 50 },
        signal,
      ),
    refresh,
    callQuery ? 150 : 0,
  );
  const stage = useLabRead(
    active && selection && callId
      ? JSON.stringify([
          disclosureScope,
          selection.runId,
          callId,
          section === 'calls' || section === 'timing' ? 'overview' : section,
          query,
        ])
      : undefined,
    (signal) =>
      labRead<CognitionLabStage>(
        `/runs/${encodeURIComponent(selection?.runId ?? '')}/stages/${encodeURIComponent(callId ?? '')}`,
        {
          section: section === 'calls' || section === 'timing' ? 'overview' : section,
          query,
          limit: 50,
        },
        signal,
      ),
    refresh,
    query ? 150 : 0,
  );
  const [itemCursor, setItemCursor] = useState<string>();
  const moreStage = useLabRead(
    active && selection && callId && itemCursor
      ? JSON.stringify([disclosureScope, selection.runId, callId, section, query, itemCursor])
      : undefined,
    (signal) =>
      labRead<CognitionLabStage>(
        `/runs/${encodeURIComponent(selection?.runId ?? '')}/stages/${encodeURIComponent(callId ?? '')}`,
        { section, query, cursor: itemCursor, limit: 50 },
        signal,
      ),
    0,
    query ? 150 : 0,
  );
  const visibleStage = itemCursor ? moreStage.value : stage.value;
  const captured = root.value ?? stage.value;
  const originalSelection = JSON.stringify(selection);
  useEffect(() => {
    setSourceQuery(undefined);
    setCallQuery(undefined);
  }, [originalSelection, disclosureScope]);
  useEffect(() => {
    setItemCursor(undefined);
    setSource(undefined);
    setPayload(undefined);
  }, [originalSelection, section, query, disclosureScope]);
  const choose = (next: LabSelection) => {
    setFollow(false);
    select(next);
    setSection('overview');
  };
  const exactArtifact = (kind: 'input' | 'output' | 'request' | 'wire') => {
    const artifacts = stage.value?.artifacts ?? [];
    const match = artifacts.find(
      (artifact) => artifact.kind === kind || (kind === 'request' && artifact.kind === 'original'),
    );
    if (match)
      setPayload({
        id: match.id,
        label: `${stage.value?.purpose ?? 'Call'} · ${kind === 'request' ? 'Full request' : kind === 'wire' ? 'Provider exchange' : kind}`,
      });
    else
      setError(
        `This call's ${kind === 'request' ? 'complete request' : kind} was not captured or is unavailable.`,
      );
  };
  const prepared = workspace.run?.prepared;
  const sectionFact = stage.value?.sections.find((item) => item.id === section);
  const sourceItems = [...(roots.value?.items ?? [])];
  if (root.value && !sourceItems.some((item) => item.id === root.value?.id))
    sourceItems.unshift(root.value);
  const callItems = [...(calls.value?.items ?? [])];
  if (stage.value && !callItems.some((item) => item.id === stage.value?.id))
    callItems.unshift(stage.value);
  return (
    <>
      <LabPane
        title={title}
        description={selection ? 'Captured history' : 'Choose an experiment'}
        actions={
          <LabIconButton
            icon="ui.chevron-down"
            label={follow ? 'Following latest results' : 'Follow latest results'}
            pressed={follow}
            onPress={() => setFollow(!follow)}
          />
        }
        navigation={
          selection ? (
            <>
              <div className="cl-inspector-navigation">
                <LabIconButton
                  icon="ui.back"
                  label="Back to recorded runs"
                  onPress={() => {
                    select(undefined);
                    setFollow(false);
                  }}
                />
                <span className="cl-spacer cl-hint">{run.value?.name ?? 'Recorded run'}</span>
                <Button size="sm" variant="quiet" onPress={() => setAnnotation(true)}>
                  Note
                </Button>
              </div>
              <div className="cl-call-selectors">
                <SelectField
                  label="Recorded source"
                  value={rootId ?? null}
                  options={sourceItems.map((item) => ({
                    id: item.id,
                    label: item.purpose,
                    description: item.summary,
                  }))}
                  inputValue={sourceQuery ?? root.value?.purpose ?? ''}
                  onInputChange={setSourceQuery}
                  onChange={(id) => choose({ runId: selection.runId, rootId: id })}
                  onOpenChange={(open) => {
                    if (!open) setSourceQuery(undefined);
                  }}
                  onLoadMore={roots.value?.nextCursor ? roots.loadMore : undefined}
                  loading={roots.pending || root.pending}
                  placement="bottom start"
                />
                <SelectField
                  label="Actual call"
                  value={callId ?? null}
                  options={callItems.map((item) => ({
                    id: item.id,
                    label: item.purpose,
                    description: `${readableStatus(item.kind)} · ${readableStatus(item.status)}`,
                  }))}
                  inputValue={callQuery ?? stage.value?.purpose ?? ''}
                  onInputChange={setCallQuery}
                  onChange={(id) => choose({ ...selection, stageId: id })}
                  onOpenChange={(open) => {
                    if (!open) setCallQuery(undefined);
                  }}
                  placeholder="Choose call"
                  onLoadMore={calls.value?.nextCursor ? calls.loadMore : undefined}
                  loading={calls.pending || stage.pending}
                  placement="bottom start"
                />
              </div>
              <div className="cl-result-strip">
                <div className="cl-record-heading">
                  <strong>{captured?.actorName ?? captured?.purpose ?? 'Recorded result'}</strong>
                  <small>
                    {captured
                      ? readableStatus(captured.status)
                      : run.value
                        ? readableStatus(run.value.status)
                        : ''}
                  </small>
                </div>
                <div className="cl-result-summary">
                  {captured?.summary ??
                    run.value?.reason ??
                    'Choose the source and actual call to inspect.'}
                </div>
                <div className="cl-inline">
                  <span className="cl-hint">
                    {captured?.gameTime !== undefined
                      ? `Game time ${captured.gameTime}`
                      : run.value
                        ? instantLabel(run.value.startedAt)
                        : ''}{' '}
                    · {captured?.completeness ?? run.value?.completeness ?? 'unavailable'}
                  </span>
                  <span className="cl-spacer" />
                  <Button size="sm" variant="quiet" onPress={() => setSection('memories')}>
                    Memories
                  </Button>
                  {(['input', 'output', 'request'] as const).map((kind) => (
                    <Button
                      key={kind}
                      size="sm"
                      variant="quiet"
                      disabled={!callId || !stage.value}
                      onPress={() => exactArtifact(kind)}
                    >
                      {kind === 'request' ? 'Full request' : kind === 'input' ? 'Input' : 'Output'}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={!stage.value?.artifacts.some((artifact) => artifact.kind === 'wire')}
                    onPress={() => exactArtifact('wire')}
                  >
                    Provider exchange
                  </Button>
                </div>
              </div>
              {comparison && run.value && (
                <div className="cl-comparison-context">
                  <div>
                    <strong>Comparison origin</strong>{' '}
                    {run.value.comparison?.originId ?? 'Not captured'}
                    {run.value.comparison && <> · {run.value.comparison.variantName}</>}
                  </div>
                  <div>
                    <strong>Replay checkpoint</strong> {run.value.originId}
                  </div>
                  <CapturedConfiguration
                    value={stage.value ? stage.value.configuration : run.value.configuration}
                    compact
                  />
                </div>
              )}
              <LabTabs<InspectorSection>
                label="Recorded evidence"
                options={sections}
                value={section}
                onChange={setSection}
              />
            </>
          ) : undefined
        }
        toolbar={
          <>
            <LabSearch
              label={selection ? 'Find captured evidence' : 'Search recorded runs'}
              value={query}
              onChange={setQuery}
            />
            <LabUpdates
              available={
                selection ? roots.updatesAvailable || calls.updatesAvailable : runs.updatesAvailable
              }
              refresh={() => {
                runs.refreshPage();
                roots.refreshPage();
                calls.refreshPage();
              }}
              label="Refresh recorded lists"
            />
          </>
        }
        pending={
          selection
            ? run.pending || root.pending || stage.pending || moreStage.pending
            : runs.pending
        }
        footer={
          selection && run.value ? (
            <>
              <span className="cl-hint">
                {run.value.counts.calls} actual calls · $
                {run.value.accounting.knownCostUsd.toString()} USD known
                {run.value.accounting.uncertainAttempts
                  ? ` + ${run.value.accounting.uncertainAttempts} uncertain`
                  : ''}
              </span>
              <span className="cl-spacer" />
              <Button
                size="sm"
                disabled={busy}
                onPress={() =>
                  void execute({ kind: 'retainRun', runId: run.value?.id ?? selection.runId })
                }
              >
                {run.value.retained ? 'Retained' : 'Retain run'}
              </Button>
            </>
          ) : undefined
        }
      >
        <LabError
          message={
            error ||
            (selection ? run.error || root.error || stage.error || moreStage.error : runs.error)
          }
        />
        {!selection ? (
          <>
            <ul className="cl-list">
              {runs.value?.items.map((item) => (
                <li key={item.id} className="cl-record">
                  <button className="cl-record-action" onClick={() => choose({ runId: item.id })}>
                    <div className="cl-record-heading">
                      <strong>{item.name}</strong>
                      <small>{readableStatus(item.status)}</small>
                    </div>
                    <p>
                      {item.reason ?? `${item.counts.roots} sources · ${item.counts.calls} calls`}
                    </p>
                    <span className="cl-hint">
                      {instantLabel(item.startedAt)} · {item.completeness}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {runs.value?.nextCursor && (
              <Button size="sm" onPress={runs.loadMore}>
                More recorded runs
              </Button>
            )}
            {!runs.pending && !runs.value?.items.length && !runs.error && (
              <LabEmpty title="No recorded experiments yet.">
                Submit a sentence to inspect its real processing.
              </LabEmpty>
            )}
          </>
        ) : section === 'calls' ? (
          <>
            <p className="cl-hint">
              These stages were actually recorded. Their order and relationships do not imply a
              fixed cognition pipeline.
            </p>
            <ul className="cl-list">
              {calls.value?.items.map((item) => (
                <li key={item.id} className="cl-record">
                  <button
                    className="cl-record-action"
                    onClick={() => choose({ ...selection, stageId: item.id })}
                  >
                    <div className="cl-record-heading">
                      <strong>{item.purpose}</strong>
                      <small>{readableStatus(item.status)}</small>
                    </div>
                    <p>{item.summary}</p>
                    <span className="cl-hint">
                      {item.completeness} · {readableStatus(item.kind)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {calls.value?.nextCursor && (
              <Button size="sm" onPress={calls.loadMore}>
                More recorded stages
              </Button>
            )}
          </>
        ) : section === 'timing' && run.value ? (
          <div className="cl-stack">
            <h3>Recorded time and cost</h3>
            <dl className="cl-facts">
              <dt>Run began</dt>
              <dd>{instantLabel(run.value.startedAt)}</dd>
              <dt>Run ended</dt>
              <dd>
                {run.value.endedAt === undefined ? 'Still open' : instantLabel(run.value.endedAt)}
              </dd>
              <dt>Known recorded cost</dt>
              <dd>${run.value.accounting.knownCostUsd.toString()} USD</dd>
              <dt>Uncertain attempts</dt>
              <dd>{run.value.accounting.uncertainAttempts}</dd>
              <dt>Captured evidence</dt>
              <dd>{bytesLabel(run.value.accounting.capturedBytes)}</dd>
              <dt>Completeness</dt>
              <dd>{run.value.completeness}</dd>
              <dt>Simulation held for processing</dt>
              <dd>
                {run.value.timing
                  ? `${formatDisplayNumber(run.value.timing.processingMs)} ms`
                  : 'Unavailable'}
              </dd>
              <dt>Total capture I/O</dt>
              <dd>
                {run.value.timing
                  ? `${formatDisplayNumber(run.value.timing.captureMs)} ms`
                  : 'Unavailable'}
              </dd>
              <dt>Total operator hold</dt>
              <dd>
                {run.value.timing
                  ? `${formatDisplayNumber(run.value.timing.operatorHoldMs)} ms`
                  : 'Unavailable'}
              </dd>
            </dl>
            <h3>Selected actual call</h3>
            {active && callId && stage.value?.kind !== 'root' && (
              <ReceiptRefresh
                key={JSON.stringify([
                  disclosureScope,
                  workspace.operationOwnerScope,
                  selection.runId,
                  callId,
                ])}
                runId={selection.runId}
                stageId={callId}
                ownerScope={workspace.operationOwnerScope}
                onAccessError={onAccessError}
                onMissing={(message) => {
                  setFollow(false);
                  select(undefined);
                  setSource(undefined);
                  setPayload(undefined);
                  setError(message);
                }}
                onRefresh={() => {
                  run.refreshPage();
                  stage.refreshPage();
                }}
              />
            )}
            <dl className="cl-facts">
              <dt>Capture preparation</dt>
              <dd>
                {stage.value?.timing
                  ? `${formatDisplayNumber(stage.value.timing.captureMs)} ms`
                  : 'Unavailable'}
              </dd>
              <dt>Operator hold</dt>
              <dd>
                {stage.value?.timing
                  ? `${formatDisplayNumber(stage.value.timing.operatorHoldMs)} ms`
                  : 'Unavailable'}
              </dd>
              <dt>Provider execution</dt>
              <dd>
                {stage.value?.timing?.providerMs !== undefined
                  ? `${formatDisplayNumber(stage.value.timing.providerMs)} ms`
                  : 'Unavailable'}
              </dd>
            </dl>
            <p className="cl-hint">
              Unknown or unsettled charges are not zero. Exact per-attempt timing is available only
              where the native operation captured it. Processing includes overlapping provider and
              capture time; these measurements are not additive. Deliberate operator holds are
              separate.
            </p>
          </div>
        ) : section === 'wire' ? (
          <section className="cl-stack">
            <h3>Actual provider exchange</h3>
            <p className="cl-hint">
              The native adapter captures only its bounded, sanitized exchange. A model-facing
              request is separate evidence.
            </p>
            {stage.value?.artifacts.some((artifact) => artifact.kind === 'wire') ? (
              stage.value.artifacts
                .filter((artifact) => artifact.kind === 'wire')
                .map((artifact, index) => (
                  <Button
                    key={artifact.id}
                    size="sm"
                    onPress={() =>
                      setPayload({ id: artifact.id, label: `Provider exchange ${index + 1}` })
                    }
                  >
                    Read exact exchange {index + 1} · {bytesLabel(artifact.length)}
                  </Button>
                ))
            ) : (
              <LabEmpty
                title={
                  sectionFact?.reason ?? 'No actual provider exchange was captured for this call.'
                }
              />
            )}
          </section>
        ) : (
          <>
            {section === 'overview' && run.value && (
              <section className="cl-section">
                <h3>Captured run</h3>
                <dl className="cl-facts">
                  <dt>Replay checkpoint</dt>
                  <dd>{run.value.originId}</dd>
                  {run.value.comparison && (
                    <>
                      <dt>Comparison origin</dt>
                      <dd>{run.value.comparison.originId}</dd>
                      <dt>Declared variant</dt>
                      <dd>{run.value.comparison.variantName}</dd>
                    </>
                  )}
                  <dt>Focal person</dt>
                  <dd>{run.value.focalActorId ?? 'No focal person recorded'}</dd>
                  <dt>Run policy</dt>
                  <dd>
                    {readableStatus(run.value.policy.mode)} · {run.value.policy.durationSeconds}{' '}
                    simulated seconds · {run.value.policy.maximumCalls} calls per interval
                  </dd>
                </dl>
              </section>
            )}
            {section === 'overview' && (
              <section className="cl-section">
                <h3>Captured configuration</h3>
                <p className="cl-hint">
                  {stage.value ? 'Selected actual call' : 'Selected recorded interval'}
                </p>
                <CapturedConfiguration
                  value={
                    stage.value
                      ? stage.value.configuration
                      : (captured?.configuration ?? run.value?.configuration)
                  }
                />
              </section>
            )}
            {section === 'overview' && captured?.resultText && (
              <section className="cl-section">
                <h3>Accepted response and action result</h3>
                <p className="cl-prose">{captured.resultText}</p>
              </section>
            )}
            {section === 'overview' && !captured?.resultText && captured?.summary && (
              <p className="cl-prose">{captured.summary}</p>
            )}
            {sectionFact && !sectionFact.available && (
              <LabEmpty
                title={sectionFact.reason ?? 'This evidence was not captured by the native owner.'}
              />
            )}
            {visibleStage?.items?.items.length ? (
              <div className="cl-stack">
                {visibleStage.items.items.map((field) => (
                  <section key={field.id} className="cl-section">
                    <div className="cl-inline">
                      <h3>{field.label}</h3>
                      <span className="cl-spacer" />
                      {field.detail && (
                        <Button
                          size="sm"
                          variant="quiet"
                          onPress={() => setSource(field.detail?.id)}
                        >
                          Read full source
                        </Button>
                      )}
                    </div>
                    {field.description && <p className="cl-hint">{field.description}</p>}
                    {typeof field.value === 'string' ? (
                      <p className="cl-prose">{field.value}</p>
                    ) : (
                      <LabJson value={field.value} />
                    )}
                  </section>
                ))}
              </div>
            ) : (
              !stage.pending &&
              !root.pending && (
                <LabEmpty
                  title={
                    !callId && section !== 'overview'
                      ? 'Choose the actual call to inspect its captured evidence.'
                      : 'No additional evidence was captured for this section.'
                  }
                />
              )
            )}
            {itemCursor && (
              <Button size="sm" onPress={() => setItemCursor(undefined)}>
                First evidence page
              </Button>
            )}
            {visibleStage?.items?.nextCursor && (
              <Button size="sm" onPress={() => setItemCursor(visibleStage.items?.nextCursor)}>
                More captured evidence
              </Button>
            )}
            {stage.value && (
              <section className="cl-section">
                <h3>Repeat or continue</h3>
                <div className="cl-inline">
                  <Button
                    size="sm"
                    disabled={!stage.value.rerunAvailable || busy}
                    onPress={() =>
                      void execute({
                        kind: 'rerunRequest',
                        runId: selection.runId,
                        stageId: stage.value?.id ?? '',
                      })
                    }
                  >
                    Rerun request only
                  </Button>
                  <Button
                    size="sm"
                    disabled={!stage.value.continuationCheckpointId || busy}
                    onPress={() =>
                      void execute({
                        kind: 'continueCheckpoint',
                        expected: expected(workspace),
                        savedId: stage.value?.continuationCheckpointId ?? '',
                        stageId: stage.value?.id ?? '',
                        policy: workspace.settings.policy,
                      })
                    }
                  >
                    Continue from checkpoint
                  </Button>
                </div>
                {!stage.value.rerunAvailable && (
                  <p className="cl-hint">
                    {stage.value.rerunReason ??
                      'This operation has no supported isolated request replay.'}
                  </p>
                )}
                {!stage.value.continuationCheckpointId && (
                  <div className="cl-stack">
                    <p className="cl-hint">
                      No compatible native checkpoint was captured at this call. Restore the run's
                      replay checkpoint, then submit a fresh stimulus to run the scenario again.
                    </p>
                    {run.value?.originId && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onPress={() =>
                          setReplay({
                            scope: disclosureScope,
                            originId: run.value!.originId,
                            name: run.value!.name,
                          })
                        }
                      >
                        Restore replay checkpoint
                      </Button>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </LabPane>
      {active && replay?.scope === disclosureScope && (
        <LabModal
          title="Restore replay checkpoint"
          close={() => setReplay(undefined)}
          footer={
            <>
              <Button size="sm" onPress={() => setReplay(undefined)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                busy={busy}
                onPress={() => {
                  void execute({
                    kind: 'restoreCheckpoint',
                    expected: expected(workspace),
                    savedId: replay.originId,
                  }).then((receipt) => {
                    if (receipt?.ok) setReplay(undefined);
                  });
                }}
              >
                Replace lab scenario
              </Button>
            </>
          }
        >
          <p>
            This replaces the current lab situation with the replay checkpoint for {replay.name},
            settles or cancels active work and leaves execution stopped. Current local drafts are
            discarded only after confirmed replacement. The ordinary game is independent.
          </p>
          <p>
            Submit a fresh stimulus afterward. This does not replay the recorded response or start a
            model request.
          </p>
        </LabModal>
      )}
      {active && payload && (
        <ArtifactModal
          artifactId={payload.id}
          scope={disclosureScope}
          title={payload.label}
          close={() => setPayload(undefined)}
        />
      )}
      {active && source && (
        <SourceModal sourceId={source} scope={disclosureScope} close={() => setSource(undefined)} />
      )}
      {active && showPrepared && prepared && (
        <PreparedModal
          key={JSON.stringify([prepared.id, workspace.disclosureRevision])}
          prepared={prepared}
          workspace={workspace}
          execute={execute}
          busy={busy}
          close={closePrepared}
        />
      )}
      {active && showPrepared && !prepared && (
        <LabModal
          title="Waiting for the selected call"
          close={closePrepared}
          footer={
            <Button size="sm" onPress={closePrepared}>
              Close
            </Button>
          }
        >
          <p>
            {workspace.state === 'running' || workspace.state === 'settling'
              ? 'Ordinary preparation is still progressing. Earlier required work remains visible in this run.'
              : (workspace.run?.reason ??
                'No valid held model call is available. Inspect the recorded disposition before preparing another stimulus.')}
          </p>
        </LabModal>
      )}
      {active && annotation && selection && (
        <LabModal
          title="Evaluation note"
          close={() => setAnnotation(false)}
          footer={
            <>
              <Button size="sm" onPress={() => setAnnotation(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                busy={busy}
                onPress={() => {
                  void execute({
                    kind: 'annotateRun',
                    runId: selection.runId,
                    recordId: selection.stageId ?? selection.rootId,
                    text: note,
                  }).then((result) => {
                    if (result?.ok) {
                      setAnnotation(false);
                      setNote('');
                    }
                  });
                }}
              >
                Save note
              </Button>
            </>
          }
        >
          <label className="cl-field">
            Human expectations and observations
            <textarea value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
          </label>
          <p className="cl-hint">Evaluation notes stay outside every character's model input.</p>
        </LabModal>
      )}
    </>
  );
}

function ReceiptRefresh({
  runId,
  stageId,
  ownerScope,
  onAccessError,
  onMissing,
  onRefresh,
}: {
  runId: string;
  stageId: string;
  ownerScope: string;
  onAccessError(error: LabAccessError, ownerScope: string): void;
  onMissing(message: string): void;
  onRefresh(): void;
}) {
  const request = useRef<AbortController | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => request.current?.abort(), []);
  const refreshReceipt = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setMessage('');
    setError('');
    try {
      const result = await labRefreshReceipt(runId, stageId, ownerScope, controller.signal);
      if (controller.signal.aborted) return;
      setMessage(result);
      onRefresh();
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof LabAccessError) onAccessError(cause, ownerScope);
      else if (cause instanceof LabResponseError && [404, 410].includes(cause.status))
        onMissing(labMessage(cause));
      else setError(labMessage(cause));
    } finally {
      if (!controller.signal.aborted) {
        request.current = undefined;
        setPending(false);
      }
    }
  };
  return (
    <div className="cl-stack">
      <div>
        <Button size="sm" busy={pending} onPress={() => void refreshReceipt()}>
          Refresh receipt
        </Button>
      </div>
      <p className="cl-hint">
        Checks the original call’s completion and cost. No new model request.
      </p>
      {message && <p role="status">{message}</p>}
      <LabError message={error} />
    </div>
  );
}

function CapturedConfiguration({
  value,
  compact = false,
}: {
  value?: CognitionLabConfiguration;
  compact?: boolean;
}) {
  const model =
    value?.model ??
    (value?.models
      ? Object.entries(value.models)
          .map(([purpose, id]) => `${purpose}: ${id}`)
          .join(' · ')
      : undefined);
  const policy = value?.policy;
  const facts = [
    ['Model', model],
    ['Effort', value?.effort],
    [
      'Output ceiling',
      value?.maxOutputTokens === undefined ? undefined : String(value.maxOutputTokens),
    ],
    [
      'Model-only inputs',
      value?.customInputCount === undefined ? undefined : String(value.customInputCount),
    ],
    ['Held values', value?.heldValueCount === undefined ? undefined : String(value.heldValueCount)],
    [
      'Request override',
      value?.requestOverride === undefined ? undefined : value.requestOverride ? 'Yes' : 'No',
    ],
    [
      'Run policy',
      policy
        ? `${readableStatus(policy.mode)} · ${policy.maximumCalls} calls · ${formatDisplayNumber(policy.durationSeconds)} simulated seconds`
        : undefined,
    ],
  ];
  return compact ? (
    <div className="cl-hint">
      {facts.map(([label, fact]) => `${label}: ${fact ?? 'unavailable'}`).join(' · ')}
    </div>
  ) : (
    <dl className="cl-facts">
      {facts.map(([label, fact]) => (
        <div key={label} className="cl-fact-pair">
          <dt>{label}</dt>
          <dd>{fact || 'Unavailable'}</dd>
        </div>
      ))}
    </dl>
  );
}

function ArtifactModal({
  artifactId,
  scope,
  title,
  close,
}: {
  artifactId: string;
  scope: string;
  title: string;
  close(): void;
}) {
  const [offsets, setOffsets] = useState([0]);
  const offset = offsets.at(-1)!;
  const artifact = useLabRead(JSON.stringify([scope, artifactId, offset]), (signal) =>
    labRead<CognitionLabArtifact>(
      `/artifacts/${encodeURIComponent(artifactId)}`,
      { offset, limit: 1024 * 1024 },
      signal,
    ),
  );
  const text = artifact.value?.text ?? '';
  const nextOffset = artifact.value?.nextOffset;
  return (
    <LabModal
      title={title}
      close={close}
      wide
      editor
      pending={artifact.pending}
      footer={
        <>
          <span className="cl-hint">
            {offset.toLocaleString()}–
            {(offset + new TextEncoder().encode(text).byteLength).toLocaleString()} of{' '}
            {artifact.value?.length.toLocaleString() ?? '?'} bytes
          </span>
          <span className="cl-spacer" />
          {offset > 0 && (
            <Button size="sm" onPress={() => setOffsets([0])}>
              First chunk
            </Button>
          )}
          {offsets.length > 1 && (
            <Button size="sm" onPress={() => setOffsets((previous) => previous.slice(0, -1))}>
              Previous chunk
            </Button>
          )}
          {nextOffset !== undefined && (
            <Button size="sm" onPress={() => setOffsets((previous) => [...previous, nextOffset])}>
              Next chunk
            </Button>
          )}
          {artifact.value && (
            <a className="ol-btn" href={artifact.value.downloadUrl} download>
              Download complete content
            </a>
          )}
          <Button size="sm" onPress={close}>
            Close
          </Button>
        </>
      }
    >
      <div className="cl-stack">
        <LabError message={artifact.error} />
        <LabTextEditor label="Exact captured content" value={text} readOnly />
        <p className="cl-hint">
          Exact retained bytes are shown in bounded chunks. Find and Copy apply to this chunk;
          download preserves the complete captured content.
        </p>
      </div>
    </LabModal>
  );
}

function PreparedModal({
  prepared,
  workspace,
  execute,
  busy,
  close,
}: {
  prepared: CognitionLabPrepared;
  workspace: CognitionLabWorkspace;
  execute: LabExecute;
  busy: boolean;
  close(): void;
}) {
  const [value, setValue] = useState(() =>
    prepared.request === undefined ? '' : JSON.stringify(prepared.request, null, 2),
  );
  const [original, setOriginal] = useState(value);
  const [view, setView] = useState('edited');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loadRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => loadRequest.current?.abort(), []);
  const valid = prepared.status === 'held';
  const load = async () => {
    if (!prepared.originalArtifactId) return;
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    setLoading(true);
    try {
      let offset: number | undefined = 0;
      const chunks: string[] = [];
      while (offset !== undefined) {
        const chunk: CognitionLabArtifact = await labRead(
          `/artifacts/${encodeURIComponent(prepared.originalArtifactId)}`,
          { offset, limit: 1024 * 1024 },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        chunks.push(chunk.text);
        offset = chunk.nextOffset;
      }
      const text = chunks.join('');
      if (controller.signal.aborted) return;
      setValue(text);
      setOriginal(text);
    } catch (failure) {
      if (!controller.signal.aborted) setError(labMessage(failure));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  const submit = async () => {
    let request: CognitionLabJson;
    try {
      request = JSON.parse(value) as CognitionLabJson;
    } catch {
      setError('Enter valid request JSON. Your override draft is unchanged.');
      return;
    }
    const result = await execute({
      kind: 'submitPrepared',
      expected: expected(workspace),
      handleId: prepared.id,
      request,
    });
    if (result?.ok) close();
    else if (result) setError(result.message);
  };
  return (
    <LabModal
      title={`${valid ? 'Held live call' : 'Stale held call'} · ${prepared.purpose}`}
      close={close}
      wide
      editor
      pending={busy || loading}
      toolbar={
        <LabTabs
          label="Prepared request version"
          value={view}
          onChange={setView}
          options={[
            { id: 'edited', label: 'Edited input' },
            { id: 'original', label: 'Original input' },
          ]}
        />
      }
      footer={
        <>
          <Button
            size="sm"
            variant="quiet"
            onPress={() => {
              setValue(original);
              setView('edited');
            }}
          >
            Restore original draft
          </Button>
          <span className="cl-spacer" />
          <Button size="sm" onPress={close}>
            Close editor
          </Button>
          <Button
            size="sm"
            disabled={!valid || busy}
            onPress={() => {
              void execute({
                kind: 'continueOriginal',
                expected: expected(workspace),
                handleId: prepared.id,
              }).then((result) => {
                if (result?.ok) close();
              });
            }}
          >
            Continue original
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!valid || !prepared.editable || !value || loading || view !== 'edited'}
            busy={busy}
            onPress={() => void submit()}
          >
            Submit this input once
          </Button>
        </>
      }
    >
      <div className="cl-stack">
        <p>
          Only Submit this input once sends this edited request. Closing discards the local override
          draft and leaves the original call held. Normal composer Submit always uses current
          scenario information.
        </p>
        <p className="cl-hint">
          {prepared.kind} · {prepared.actorId} · {prepared.stageId}
        </p>
        <LabError message={error || prepared.reason} />
        {!value && prepared.originalArtifactId && (
          <Button size="sm" onPress={() => void load()}>
            Load complete original request for editing
          </Button>
        )}
        <LabTextEditor
          label="Model-facing request"
          value={view === 'original' ? original : value}
          onChange={setValue}
          readOnly={!valid || !prepared.editable || view === 'original'}
          autoFocus
        />
        {!valid && (
          <p className="cl-hint">
            This call cannot dispatch. Inspect its native disposition before an eligible same-source
            response retry or an explicit scenario rerun.
          </p>
        )}
      </div>
    </LabModal>
  );
}
