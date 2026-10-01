import { useEffect, useRef, useState } from 'react';
import type { GameView, WorkState, WorkStepView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section, Tag } from '../design-system/components';

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
export function ActionAttempts({ view, connected }: { view: GameView; connected: boolean }) {
  const draftKey = `open-legend:action-draft:${view.access?.accountId}:${view.worldId}:${view.saveTimeline}:${view.player.id}`;
  const [text, setText] = useState(() => {
    try {
      return sessionStorage.getItem(draftKey) ?? '';
    } catch {
      return '';
    }
  });
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState<Mode>('enqueue');
  // Optional exact details: they travel as references, not re-derived from the wording.
  const [itemId, setItemId] = useState('');
  const [instrumentId, setInstrumentId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityMode, setQuantityMode] = useState<'exact' | 'held'>('exact');
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const submission = useRef<{ id: string; body: string } | null>(null);
  const decision = useRef<{
    id: string;
    key: string;
    epoch?: string;
  } | null>(null);
  const job = view.ai.jobs.find((entry) => entry.id === requestId && entry.kind === 'action');
  const unavailable = !connected || view.access?.controlling === false || view.clock.paused;
  const inView = new Set(view.entities.map((entity) => entity.id));
  const targetMissing = !!targetId && !inView.has(targetId);
  const pileItems = view.entities.flatMap((entity) =>
    entity.kind === 'item-pile'
      ? (entity.contents ?? []).filter((item) => item.portable).map((item) => ({ ...item }))
      : [],
  );
  const references = [itemId, instrumentId, recipientId].filter(Boolean);
  const carried = new Set(view.player.inventory.map((item) => item.id));
  const reachable = new Set([...carried, ...pileItems.map((item) => item.id)]);
  const beings = view.entities.filter(
    (entity) =>
      (entity.kind === 'actor' || entity.kind === 'animal') && entity.id !== view.player.id,
  );
  const staleItem = !!itemId && !reachable.has(itemId);
  const staleTool = !!instrumentId && !carried.has(instrumentId);
  const staleRecipient = !!recipientId && !beings.some((entity) => entity.id === recipientId);
  const staleUntil = !!until && !view.clock.namedTimes.includes(until);
  const staleReference = staleItem || staleTool || staleRecipient || staleUntil;
  const amount = quantity.trim() ? Number(quantity) : null;
  const invalidAmount =
    amount !== null && (!Number.isSafeInteger(amount) || amount < 1 || amount > 999);
  const work = view.player.work;
  // Examples come in this world's own words; the engine form states none of its own.
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

  const slots =
    references.length || amount !== null || until
      ? {
          itemId: itemId || null,
          instrumentId: instrumentId || null,
          recipientId: recipientId || null,
          quantity: amount,
          quantityMode: amount === null ? null : quantityMode,
          until: until || null,
          method: null,
        }
      : undefined;
  const send = async () => {
    if (inFlight.current || unavailable || targetMissing || staleReference || invalidAmount) return;
    const body = JSON.stringify({
      text: text.trim(),
      targetId: targetId || undefined,
      mode,
      slots,
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
  const stoppable =
    !!work && (['queued', 'running', 'waiting', 'blocked'].includes(work.state) || !!work.paused);
  const workKey = work?.id ?? '';
  return (
    <Section title="Take an action">
      {work && (
        <div className="ol-proposal" role="region" aria-label="Current work">
          <p>
            <StateTag state={work.state} /> <strong>{work.label}</strong>
          </p>
          {work.reason && <p className="ol-caption">{work.reason}</p>}
          {work.steps.length > 0 && <Steps steps={work.steps} />}
          {work.paused && (
            <>
              <p>
                <StateTag state="paused" /> <strong>{work.paused.label}</strong>
              </p>
              <p className="ol-caption">
                Resumes, after rechecking its targets, when the current work ends. Stopping or
                replacing work discards it.
              </p>
              {work.paused.steps.length > 0 && <Steps steps={work.paused.steps} />}
            </>
          )}
          {stoppable && (
            <Button
              variant="quiet"
              disabled={busy || unavailable}
              // A retry reuses the identity only while the same work is shown; stopping
              // later work is a new command, never a replay of an earlier stop.
              onPress={() => void command(`stop:${workKey}`, { type: 'cancel' }, 'Stopped.')}
            >
              Stop all work
            </Button>
          )}
        </div>
      )}
      <p className="ol-caption">
        Describe your character's action, not dialogue
        {examples.length ? <>, for example {examples.map((e) => `“${e}”`).join(', ')}</> : ''}.
        Coordinates use X,Z; left and right mean your character's own left and right. Wording the
        game does not recognize may use your configured AI allowance.
      </p>
      <textarea
        aria-label="Action intention"
        maxLength={500}
        value={text}
        placeholder={view.player.actionWording?.placeholder ?? ''}
        onChange={(e) => setText(e.target.value)}
      />
      <label>
        Target reference{' '}
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Resolve from text</option>
          {targetMissing && (
            <option value={targetId} disabled>
              Previously selected target is no longer in view
            </option>
          )}
          {view.entities
            .filter((entity) => entity.id !== view.player.id)
            .map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
        </select>
      </label>
      <details>
        <summary>Exact details (optional)</summary>
        <label>
          Item{' '}
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">From text</option>
            {staleItem && (
              <option value={itemId} disabled>
                Previously chosen item is no longer available
              </option>
            )}
            {view.player.inventory.map((item) => (
              <option key={item.id} value={item.id}>
                {item.quantity} × {item.name} (carried)
              </option>
            ))}
            {pileItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.quantity} × {item.name} (on the ground)
              </option>
            ))}
          </select>
        </label>
        <label>
          Tool{' '}
          <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
            <option value="">Any suitable</option>
            {staleTool && (
              <option value={instrumentId} disabled>
                Previously chosen tool is no longer carried
              </option>
            )}
            {view.player.inventory.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          For{' '}
          <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
            <option value="">No one in particular</option>
            {staleRecipient && (
              <option value={recipientId} disabled>
                Previously chosen being is no longer in view
              </option>
            )}
            {beings.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount{' '}
          <input
            aria-label="Amount"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="none"
          />
          <select
            aria-label="Amount means"
            value={quantityMode}
            onChange={(e) => setQuantityMode(e.target.value as 'exact' | 'held')}
          >
            <option value="exact">exactly this many</option>
            <option value="held">until I carry this many</option>
          </select>
        </label>
        {(view.clock.namedTimes.length > 0 || staleUntil) && (
          <label>
            Stop at{' '}
            <select value={until} onChange={(e) => setUntil(e.target.value)}>
              <option value="">No set time</option>
              {staleUntil && (
                <option value={until} disabled>
                  Previously chosen time is not one this world names
                </option>
              )}
              {/* This world's own named times; a world may name none. */}
              {view.clock.namedTimes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </details>
      {(staleReference || invalidAmount) && (
        <p role="alert" className="ol-caption">
          {invalidAmount
            ? 'Amount must be a whole number from 1 to 999.'
            : 'A chosen exact detail is no longer available; choose another or reset it.'}
        </p>
      )}
      <label>
        Current work{' '}
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="enqueue">Queue after current work</option>
          <option value="interrupt">Pause current work, then resume it</option>
          <option value="replace">Replace current work</option>
        </select>
      </label>
      <Button
        disabled={
          busy || unavailable || !text.trim() || targetMissing || staleReference || invalidAmount
        }
        onPress={() => void send()}
      >
        Attempt action
      </Button>
      {message && <p role="status">{message}</p>}
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
              <Button disabled={busy || unavailable} onPress={() => void decide(attempt.id, true)}>
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
          <Button variant="quiet" onPress={() => setText(attempt.description)}>
            Edit as new request
          </Button>
          <Button
            variant="quiet"
            disabled={busy || unavailable}
            onPress={() => void decide(attempt.id, false)}
          >
            Decline / withdraw
          </Button>
        </div>
      ))}
    </Section>
  );
}
