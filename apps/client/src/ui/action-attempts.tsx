import { useEffect, useId, useRef, useState } from 'react';
import type { EntityView, GameView, WorkState, WorkStepView } from '@open-legend/protocol';
import { post } from '../api';
import { playerEntity } from '../entity-view';
import { Button, IconButton, Section, Tag } from '../design-system/components';
import './character-actions.css';

type Mode = 'enqueue' | 'replace' | 'interrupt';
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

/** Keyed by access/control/world/timeline/actor in Character; stale asynchronous replies die with that scope.
 * docs/architecture.md#action-fulfillment-and-revision-approval
 */
export function ActionAttempts({
  view,
  connected,
  subject,
  entry,
  chooseSubject,
  clearSubject,
  openActivity,
  visible = true,
}: {
  view: GameView;
  connected: boolean;
  subject?: EntityView | null;
  entry?: number;
  chooseSubject?(): void;
  clearSubject?(): void;
  openActivity?(): void;
  visible?: boolean;
}) {
  const draftKey = `open-legend:action-draft:${view.access?.accountId}:${view.worldId}:${view.saveTimeline}:${view.player.id}`;
  const [text, setText] = useState(() => {
    try {
      return sessionStorage.getItem(draftKey) ?? '';
    } catch {
      return '';
    }
  });
  const [editing, setEditing] = useState(!!text);
  const [mode, setMode] = useState<Mode>('enqueue');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const alive = useRef(true);
  const composer = useRef<HTMLTextAreaElement>(null);
  const openerId = useId();
  const inFlight = useRef(false);
  const submission = useRef<{ id: string; body: string } | null>(null);
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
    ? targetId === view.player.id ? playerEntity(view) : view.entities.find((entity) => entity.id === targetId)
    : undefined;
  const targetMissing = !!targetId && !currentSubject;
  const work = view.player.work;
  // The ordinary cancel capability also covers waiting/paused plans. Detailed work
  // steps remain under their existing creator permission; they are not a busy flag.
  const stoppable = view.player.actions.some(
    (action) => action.command.type === 'cancel' && action.enabled,
  );
  const hasWork = stoppable || !!view.player.action;
  const activeActivity = view.player.activity && ['active', 'blocked', 'paused', 'queued', 'waiting'].includes(view.player.activity.status)
    ? view.player.activity
    : undefined;
  const workLabel = activeActivity?.name ?? view.player.action?.label ?? work?.label;
  // Examples come in this world's own words, not a second client action grammar.
  const examples = view.player.actionWording?.examples ?? [];
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
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
    if (editing && visible) composer.current?.focus();
  }, [editing, entry, visible]);
  const send = async () => {
    if (inFlight.current || unavailable || targetMissing || !text.trim()) return;
    const body = JSON.stringify({
      text: text.trim(),
      targetId: targetId || undefined,
      mode: hasWork ? mode : 'enqueue',
    });
    if (!submission.current || submission.current.body !== body)
      submission.current = { id: crypto.randomUUID(), body };
    const submitted = submission.current;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await post('/api/action-attempt', {
        requestId: submitted.id,
        ...JSON.parse(body),
      });
      if (!alive.current) return;
      setMessage(result.message ?? 'Action submitted.');
      if (result.ok || result.jobId) setRequestId(result.jobId ?? null);
      submission.current = null;
    } catch (error) {
      // Retain the identity on ambiguous delivery; an explicit retry must not buy the action twice.
      if (alive.current)
        setMessage(error instanceof Error ? error.message : 'Action request failed.');
    } finally {
      if (alive.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
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
    setEditing(false);
    document.getElementById(openerId)?.focus();
  };
  return (
    <div className="ol-character-actions">
      {hasWork && (
        <Section title="Current work">
          <p className="ol-character-work-name">
            <strong>{workLabel ?? 'Work is in progress.'}</strong>
          </p>
          {activeActivity && <Tag>{activeActivity.status}</Tag>}
          {activeActivity?.reason && <p>{activeActivity.reason}</p>}
          <div className="ol-actions">
            {openActivity && activeActivity && (
              <Button variant="quiet" onPress={openActivity}>View task</Button>
            )}
            {stoppable && (
              <Button
                variant="quiet"
                disabled={busy || !!unavailable}
                onPress={() => void command(`stop:${workKey}`, { type: 'cancel' }, 'Stopped.')}
              >
                Stop all work
              </Button>
            )}
          </div>
          <p className="ol-caption">Stopping also discards work paused for later.</p>
          {work && (
            <details className="ol-character-work-details">
              <summary>God mode · Work steps</summary>
              <p><StateTag state={work.state} /> {work.label}</p>
              {work.reason && <p>{work.reason}</p>}
              {!!work.steps.length && <Steps steps={work.steps} />}
              {work.paused && (
                <>
                  <p><StateTag state="paused" /> {work.paused.label}</p>
                  <p className="ol-caption">
                    Resumes after rechecking its targets when current work ends. Stopping or replacing work discards it.
                  </p>
                  {!!work.paused.steps.length && <Steps steps={work.paused.steps} />}
                </>
              )}
            </details>
          )}
        </Section>
      )}
      <Button
        id={openerId}
        variant="quiet"
        aria-expanded={editing}
        onPress={() => editing ? closeEditor() : setEditing(true)}
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
        <div className="ol-action-subject">
          {subject ? (
            <>
              <span>With <strong>{currentSubject?.name ?? subject.name}</strong></span>
              {clearSubject && (
                <IconButton icon="ui.close" label="Remove action subject" onPress={clearSubject} />
              )}
            </>
          ) : <span>Choose a subject, or include it in your words.</span>}
          {chooseSubject && (
            <Button variant="quiet" size="sm" onPress={chooseSubject}>
              {subject ? 'Change subject' : 'Choose subject'}
            </Button>
          )}
        </div>
        {targetMissing && (
          <p role="status">{subject?.name} is no longer in view. Change or remove this subject before sending.</p>
        )}
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
            {([
              ['enqueue', 'After current work'],
              ['interrupt', 'Pause current work, then resume'],
              ['replace', 'Replace current work'],
            ] as const).map(([value, label]) => (
              <label key={value}>
                <input type="radio" name={`action-mode-${view.player.id}`} value={value} checked={mode === value} onChange={() => setMode(value)} />
                <span>{label}</span>
              </label>
            ))}
            {mode === 'replace' && <p className="ol-caption">Replaces current and paused work. Effects and materials already spent stay spent.</p>}
            {mode === 'interrupt' && <p className="ol-caption">Current work resumes afterward only if its conditions still hold.</p>}
          </fieldset>
        )}
        <p className="ol-caption">
          Familiar wording runs directly. Other wording may use the world’s intelligence allowance.
          {view.ai.mode !== 'fixture' && (!view.ai.jevConfigured || !view.ai.llmConfigured || view.ai.budget.limitUsd <= 0)
            ? ' That interpretation is unavailable with the current setup; familiar actions still work.'
            : ''}
        </p>
        <details>
          <summary>Examples and wording</summary>
          {examples.length > 0 && <p>{examples.map((example) => `“${example}”`).join(' · ')}</p>}
          <p className="ol-caption">Describe an action here; use Conversation to speak. Coordinates use X,Z. Left and right refer to your character.</p>
        </details>
        {unavailable && <p role="status">{unavailable}</p>}
        <div className="ol-actions ol-action-submit">
          <Button variant="primary" disabled={busy || !!unavailable || !text.trim() || targetMissing} onPress={() => void send()}>
            {busy ? 'Sending action…' : 'Attempt action'}
          </Button>
          <Button variant="quiet" onPress={closeEditor}>Cancel</Button>
        </div>
        <p className="ol-caption">Cancel closes this draft; it does not stop work already requested.</p>
      </div>
      {message && <p role="status" className="ol-action-result">{message}</p>}
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
              <Button disabled={busy || !!unavailable} onPress={() => void decide(attempt.id, true)}>
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
          <Button variant="quiet" onPress={() => {
            setText(attempt.description);
            setMode(attempt.mode);
            clearSubject?.();
            setEditing(true);
            composer.current?.focus();
          }}>
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
