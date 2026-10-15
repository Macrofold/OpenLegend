import {
  boundedText,
  readRetainedRequest,
  retainRequest,
  releaseRequest,
  type RetainedRequest,
} from '../retained-request';
import type { ApiResult, RequestRecoveryResult } from '@open-legend/protocol';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { EntityView, GameView, WorkState, WorkStepView } from '@open-legend/protocol';
import { post } from '../api';
import { playerEntity } from '../entity-view';
import { Button, IconButton, Section, Tag } from '../design-system/components';
import './character-actions.css';

type Mode = 'enqueue' | 'replace' | 'interrupt';
type PendingAction = {
  requestId: string;
  text: string;
  mode: Mode;
  targetId?: string;
  subjectLabel: string;
  timeline: string;
};
function validPendingAction(value: unknown): value is PendingAction {
  if (!value || typeof value !== 'object') return false;
  return (
    'requestId' in value &&
    boundedText(value.requestId, 200) &&
    'text' in value &&
    boundedText(value.text, 500) &&
    'mode' in value &&
    typeof value.mode === 'string' &&
    ['enqueue', 'replace', 'interrupt'].includes(value.mode) &&
    'subjectLabel' in value &&
    boundedText(value.subjectLabel, 500) &&
    'timeline' in value &&
    boundedText(value.timeline, 200) &&
    (!('targetId' in value) || value.targetId === undefined || boundedText(value.targetId, 200))
  );
}
const STATE_LABELS: Record<WorkState, [string, string]> = {
  queued: ['Queued', 'neutral'],
  running: ['Running', 'accent'],
  waiting: ['Waiting', 'highlight'],
  blocked: ['Blocked', 'danger'],
  completed: ['Completed', 'neutral'],
  cancelled: ['Cancelled', 'future'],
  paused: ['Paused', 'highlight'],
};
const CATEGORY_LABELS: Record<string, string> = {
  needs_clarification: 'Needs a clearer request',
  needs_planning: 'No supported way found',
  needs_information: 'Needs more information',
  blocked: 'Cannot be done now',
  unsupported_capability: 'Not possible in this world yet',
  forbidden: 'Not allowed',
  unavailable: 'Interpretation unavailable',
};

function StateTag({ state }: { state: WorkState }) {
  const [label, tone] = STATE_LABELS[state];
  return <Tag tone={tone}>{label}</Tag>;
}
function Steps({ steps }: { steps: WorkStepView[] }) {
  return (
    <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
      {steps.map((step) => (
        <li key={step.id}>
          <StateTag state={step.state} /> <span>{step.label}</span>
          {step.reason && <span className="ol-caption"> — {step.reason}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Keyed by private owner/world/timeline/actor in Character. The API rejects stale
 * access replies while a permitted same-owner Resume preserves this private draft.
 * docs/architecture.md#action-fulfillment-and-revision-approval
 */
export function ActionAttempts({
  view,
  connected,
  subject,
  entry,
  workEntry,
  chooseSubject,
  clearSubject,
  openActivity,
  visible = true,
  children,
}: {
  view: GameView;
  connected: boolean;
  subject?: EntityView | null;
  entry?: number;
  workEntry?: number;
  chooseSubject?(): void;
  clearSubject?(): void;
  openActivity?(): void;
  visible?: boolean;
  children?: ReactNode;
}) {
  const recoveryKey =
    view.access?.privateDraftScope && view.saveTimeline
      ? `open-legend:action-request:${JSON.stringify([view.access.privateDraftScope, view.worldId, view.player.id, view.saveTimeline])}`
      : undefined;
  const [retained, setRetained] = useState<RetainedRequest<PendingAction>>(() =>
    readRetainedRequest(recoveryKey, validPendingAction),
  );
  const retainedRef = useRef(retained);
  function remember(next: RetainedRequest<PendingAction>) {
    retainedRef.current = next;
    submission.current = next.status === 'pending' ? next.request : null;
    setRetained(next);
  }
  const draftKey = view.access?.privateDraftScope
    ? `open-legend:action-draft:${view.access.privateDraftScope}:${view.worldId}:${view.saveTimeline}:${view.player.id}`
    : null;
  const [text, setText] = useState(() => {
    try {
      return draftKey ? (sessionStorage.getItem(draftKey) ?? '') : '';
    } catch {
      return '';
    }
  });
  const [editing, setEditing] = useState(!!text);
  const [mode, setMode] = useState<Mode>('enqueue');
  const [busy, setBusy] = useState(false);
  const [requestPhase, setRequestPhase] = useState<'sending' | 'checking' | null>(null);
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const alive = useRef(true);
  const composer = useRef<HTMLTextAreaElement>(null);
  const openerId = useId();
  const returnToOpener = useRef(false);
  const inFlight = useRef(false);
  const submission = useRef<PendingAction | null>(
    retained.status === 'pending' ? retained.request : null,
  );
  const decision = useRef<{
    id: string;
    key: string;
    epoch?: string;
  } | null>(null);
  const job = view.ai.jobs.find((entry) => entry.id === requestId && entry.kind === 'action');
  const unavailable = !connected
    ? 'Reconnect to act.'
    : view.access?.controlling === false
      ? 'Resume control here to act.'
      : !view.player.alive
        ? 'This character cannot act now.'
        : view.clock.paused
          ? 'Resume the world to act.'
          : '';
  const targetId = subject?.id;
  const currentSubject = targetId
    ? targetId === view.player.id
      ? playerEntity(view)
      : view.entities.find((entity) => entity.id === targetId)
    : undefined;
  const targetMissing = !!targetId && !currentSubject;
  const work = view.player.work;
  // Availability still belongs to the native cancel capability. The separate
  // work summary survives a paused world without exposing creator-only steps.
  const stopAction = view.player.actions.find((action) => action.command.type === 'cancel');
  const hasWork = view.player.hasWork;
  const activeActivity =
    view.player.activity &&
    ['active', 'blocked', 'paused', 'queued', 'waiting'].includes(view.player.activity.status)
      ? view.player.activity
      : undefined;
  const workLabel = activeActivity?.name ?? view.player.action?.label ?? work?.label;
  // Examples come in this world's own words, not a second client action grammar.
  const examples = view.player.actionWording?.examples ?? [];
  const wordingNotice =
    view.ai.mode === 'fixture'
      ? 'Uses configured test responses.'
      : !view.ai.jevConfigured || !view.ai.llmConfigured || view.ai.budget.limitUsd <= 0
        ? 'Familiar wording only.'
        : 'May use intelligence allowance.';
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!draftKey) return;
    try {
      sessionStorage.setItem(draftKey, text);
    } catch {
      /* Optional browser storage. */
    }
  }, [text, draftKey]);
  useEffect(() => {
    if (job) setMessage(job.message);
  }, [job?.id, job?.status, job?.message]);
  useEffect(() => {
    if (entry) setEditing(true);
  }, [entry]);
  useEffect(() => {
    if (workEntry) setEditing(false);
  }, [workEntry]);
  useEffect(() => {
    if (editing && visible) composer.current?.focus();
    else if (visible && returnToOpener.current) {
      returnToOpener.current = false;
      document.getElementById(openerId)?.focus();
    }
  }, [editing, entry, visible]);
  function settle(result: ApiResult, submitted: PendingAction) {
    if (!alive.current || submission.current?.requestId !== submitted.requestId) return;
    releaseRequest(recoveryKey, submitted.requestId);
    submission.current = null;
    remember({ status: 'empty' });
    if (result.jobId) setRequestId(result.jobId);
    setMessage(result.message);
  }
  const send = async () => {
    if (
      inFlight.current ||
      retainedRef.current.status !== 'empty' ||
      unavailable ||
      targetMissing ||
      !text.trim()
    )
      return;
    inFlight.current = true;
    setBusy(true);
    const submitted: PendingAction = {
      requestId: crypto.randomUUID(),
      text: text.trim(),
      targetId: targetId || undefined,
      subjectLabel: currentSubject?.name ?? 'No fixed subject',
      mode: hasWork ? mode : 'enqueue',
      timeline: view.saveTimeline!,
    };
    try {
      retainRequest(recoveryKey, submitted);
      submission.current = submitted;
      remember({ status: 'pending', request: submitted });
      setRequestPhase('sending');
      const { timeline: _timeline, subjectLabel: _subjectLabel, ...body } = submitted;
      const result = await post('/api/action-attempt', body);
      if (!alive.current || submission.current?.requestId !== submitted.requestId) return;
      setMessage(result.message);
      // A failed transport, changed authority or ambiguous storage response is not a refusal
      // of the original action. Only the original explicit admission/refusal settles it.
      if (
        result.ok ||
        result.jobId ||
        [
          'invalid-action',
          'invalid-input',
          'paused',
          'actor-unavailable',
          'target',
          'ai-unavailable',
          'busy',
        ].includes(result.code)
      )
        settle(result, submitted);
    } catch (error) {
      if (alive.current) {
        if (!submission.current) remember(readRetainedRequest(recoveryKey, validPendingAction));
        setMessage(
          error instanceof Error ? error.message : 'The original action result is not confirmed.',
        );
      }
    } finally {
      inFlight.current = false;
      if (alive.current) {
        setRequestPhase(null);
        setBusy(false);
      }
    }
  };
  async function checkOriginalAction() {
    const submitted = submission.current;
    if (inFlight.current || !submitted || !connected) return;
    inFlight.current = true;
    setBusy(true);
    try {
      setRequestPhase('checking');
      const { subjectLabel: _subjectLabel, ...request } = submitted;
      const outcome = await post<RequestRecoveryResult>('/api/action-attempt/receipt', request);
      if (!alive.current || submission.current?.requestId !== submitted.requestId) return;
      if (!outcome.ok) {
        setMessage(outcome.message);
        return;
      }
      if (outcome.scope !== view.access?.scope)
        throw new Error('Character access changed. Refresh before checking the original action.');
      if (outcome.status === 'resolved') settle(outcome.result, submitted);
      else setMessage(outcome.message);
    } catch (error) {
      if (alive.current)
        setMessage(
          error instanceof Error ? error.message : 'The original result is still unknown.',
        );
    } finally {
      inFlight.current = false;
      if (alive.current) {
        setRequestPhase(null);
        setBusy(false);
      }
    }
  }
  /** One idempotent native command per explicit choice (accept, decline or stop). */
  const command = async (key: string, input: Record<string, unknown>, done: string) => {
    if (inFlight.current || unavailable) return;
    if (!decision.current || decision.current.key !== key)
      decision.current = { id: crypto.randomUUID(), key, epoch: view.commandEpoch };
    const submitted = decision.current;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await post('/api/command', {
        commandId: submitted.id,
        commandEpoch: submitted.epoch,
        command: input,
      });
      if (!alive.current) return;
      setRequestId(null);
      setMessage(result.message ?? done);
      decision.current = null;
      // The shared authoritative state stream updates work and pending cards after commit.
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : 'Request failed.');
    } finally {
      if (alive.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const decide = (attemptId: string, accept: boolean) =>
    command(
      `${accept ? 'accept' : 'decline'}:${attemptId}`,
      { type: accept ? 'confirm-attempt' : 'withdraw-attempt', attemptId },
      'Decision submitted.',
    );
  const workKey = work?.id ?? view.player.action?.id ?? view.player.activity?.name ?? 'current';
  const closeEditor = () => {
    returnToOpener.current = true;
    setEditing(false);
  };
  return (
    <div className="ol-character-actions">
      {retained.status !== 'empty' && (
        <div className="ol-notice" role="status">
          <strong>
            {requestPhase === 'sending'
              ? 'Sending original action…'
              : requestPhase === 'checking'
                ? 'Checking original action…'
                : 'Original action result not confirmed'}
          </strong>
          {retained.status === 'pending' ? (
            <>
              <p>{retained.request.text}</p>
              <p className="ol-caption">Original subject: {retained.request.subjectLabel}</p>
              <p className="ol-caption">
                Original choice:{' '}
                {retained.request.mode === 'replace'
                  ? 'Replace current work'
                  : retained.request.mode === 'interrupt'
                    ? 'Pause current work, then resume'
                    : 'After current work'}
                .
              </p>
              <Button
                variant="quiet"
                disabled={!connected || busy}
                onPress={() => void checkOriginalAction()}
              >
                Check original action
              </Button>
            </>
          ) : (
            <p>
              This browser could not read the retained request. Restore browser storage access and
              reload before sending another action.
            </p>
          )}
          <p className="ol-caption">
            Your draft can change, but another action will not be submitted until the original
            result is known. Checking never sends the action again.
          </p>
        </div>
      )}
      {hasWork && !editing && (
        <Section title="Current work">
          <p className="ol-character-work-name">
            <strong>{workLabel ?? 'Work is in progress.'}</strong>
          </p>
          {activeActivity && <Tag>{activeActivity.status}</Tag>}
          {activeActivity?.reason && <p>{activeActivity.reason}</p>}
          <div className="ol-actions">
            {openActivity && activeActivity && (
              <Button variant="quiet" onPress={openActivity}>
                View task
              </Button>
            )}
            <Button
              variant="quiet"
              disabled={busy || !!unavailable || !stopAction?.enabled}
              onPress={() => void command(`stop:${workKey}`, { type: 'cancel' }, 'Stopped.')}
            >
              Stop all work
            </Button>
          </div>
          <p className="ol-caption">Stopping also discards work paused for later.</p>
          {!stopAction?.enabled && stopAction?.reason && (
            <p className="ol-caption">{stopAction.reason}</p>
          )}
          {work && (
            <details className="ol-character-work-details">
              <summary>God mode · Work steps</summary>
              <p>
                <StateTag state={work.state} /> {work.label}
              </p>
              {work.reason && <p>{work.reason}</p>}
              {!!work.steps.length && <Steps steps={work.steps} />}
              {work.paused && (
                <>
                  <p>
                    <StateTag state="paused" /> {work.paused.label}
                  </p>
                  <p className="ol-caption">
                    Resumes after rechecking its targets when current work ends. Stopping or
                    replacing work discards it.
                  </p>
                  {!!work.paused.steps.length && <Steps steps={work.paused.steps} />}
                </>
              )}
            </details>
          )}
        </Section>
      )}
      <div className="ol-character-native" hidden={editing}>
        {children}
      </div>
      <Button
        id={openerId}
        className={editing ? 'ol-action-opener-hidden' : ''}
        variant="quiet"
        aria-expanded={editing}
        onPress={() => (editing ? closeEditor() : setEditing(true))}
      >
        Describe an action
      </Button>
      <div
        className="ol-action-intention"
        hidden={!editing}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.defaultPrevented && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            closeEditor();
          }
        }}
      >
        <strong>{view.player.name} · Action</strong>
        <div className="ol-action-subject">
          {subject ? (
            <>
              <span>
                With <strong>{currentSubject?.name ?? subject.name}</strong>
              </span>
              {clearSubject && (
                <IconButton icon="ui.close" label="Remove action subject" onPress={clearSubject} />
              )}
            </>
          ) : (
            <span>Subject comes from your words.</span>
          )}
          {chooseSubject && (
            <Button variant="quiet" size="sm" onPress={chooseSubject}>
              {subject ? 'Change subject' : 'Choose subject'}
            </Button>
          )}
        </div>
        {targetMissing && (
          <p role="status">
            {subject?.name} is no longer in view. Change or remove this subject before sending.
          </p>
        )}
        <div className="ol-action-fields">
          <label className="ol-action-composer">
            What do you want to do?
            <textarea
              ref={composer}
              aria-label="Action intention"
              maxLength={500}
              value={text}
              placeholder={view.player.actionWording?.placeholder ?? ''}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          {hasWork && (
            <fieldset className="ol-action-scheduling">
              <legend>When should this happen?</legend>
              <p className="ol-caption">Current work: {workLabel ?? 'In progress'}.</p>
              {(
                [
                  ['enqueue', 'After current work'],
                  ['interrupt', 'Pause current work, then resume'],
                  ['replace', 'Replace current work'],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={`action-mode-${view.player.id}`}
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
              {mode === 'replace' && (
                <p className="ol-caption">
                  Replaces current and paused work. Effects and materials already spent stay spent.
                </p>
              )}
              {mode === 'interrupt' && (
                <p className="ol-caption">
                  Current work resumes afterward only if its conditions still hold.
                </p>
              )}
            </fieldset>
          )}
          <details>
            <summary>Examples and wording</summary>
            {examples.length > 0 && <p>{examples.map((example) => `“${example}”`).join(' · ')}</p>}
            <p className="ol-caption">
              Describe an action here; use Conversation to speak. Coordinates use X,Z. Left and
              right refer to your character.
            </p>
          </details>
          {unavailable && <p role="status">{unavailable}</p>}
          {message && (
            <p role="status" className="ol-action-result">
              {message}
            </p>
          )}
        </div>
        <div className="ol-actions ol-action-submit">
          <Button
            variant="primary"
            disabled={!!unavailable || !text.trim() || targetMissing || retained.status !== 'empty'}
            isPending={busy}
            onPress={() => void send()}
          >
            {busy
              ? 'Sending action…'
              : !hasWork
                ? 'Attempt action'
                : mode === 'replace'
                  ? 'Replace work'
                  : mode === 'interrupt'
                    ? 'Pause and attempt'
                    : 'Queue action'}
          </Button>
          <Button variant="quiet" onPress={closeEditor}>
            Cancel
          </Button>
        </div>
        <p className="ol-caption">{wordingNotice} Cancel keeps this draft.</p>
      </div>
      {message && !editing && (
        <p role="status" className="ol-action-result">
          {message}
        </p>
      )}
      {view.player.actionAttempts.map((attempt) => (
        <div className="ol-proposal" key={attempt.id}>
          <p>{attempt.description}</p>
          {attempt.fulfillment ? (
            <>
              <strong>Understood — accept this revised action?</strong>
              <p>{attempt.fulfillment.executableDescription}</p>
              <p>
                Not fulfilled:{' '}
                {attempt.fulfillment.omitted
                  .map((omitted) => `${omitted.requirement} (${omitted.reason})`)
                  .join('; ') || 'No omitted clause; interpretation requires your decision.'}
              </p>
              <p className="ol-caption">{attempt.fulfillment.reason}</p>
              <p className="ol-caption">
                {attempt.mode === 'replace'
                  ? 'Acceptance will replace your current work.'
                  : attempt.mode === 'interrupt'
                    ? 'Acceptance will pause your current work and resume it afterwards.'
                    : 'Acceptance will queue after your current work.'}
              </p>
              <Button
                disabled={busy || !!unavailable}
                onPress={() => void decide(attempt.id, true)}
              >
                Accept revised action
              </Button>
            </>
          ) : attempt.reason ? (
            <p className="ol-caption">
              {CATEGORY_LABELS[attempt.category ?? ''] ?? 'Not done'}: {attempt.reason}
            </p>
          ) : (
            <p className="ol-caption">
              No executable binding yet. Revise or explicitly resubmit the request, or withdraw it.
            </p>
          )}
          <Button
            variant="quiet"
            onPress={() => {
              setText(attempt.description);
              setMode(attempt.mode);
              clearSubject?.();
              setEditing(true);
              composer.current?.focus();
            }}
          >
            Edit as new request
          </Button>
          <Button
            variant="quiet"
            disabled={busy || !!unavailable}
            onPress={() => void decide(attempt.id, false)}
          >
            Decline / withdraw
          </Button>
        </div>
      ))}
    </div>
  );
}
