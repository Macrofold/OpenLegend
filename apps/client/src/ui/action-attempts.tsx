import { useEffect, useRef, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';

/** Keyed by world/timeline/actor in Character; stale asynchronous replies die with that scope.
 * docs/architecture.md#action-fulfillment-and-revision-approval
 */
export function ActionAttempts({ view, connected }: { view: GameView; connected: boolean }) {
  const draftKey = `open-legend:action-draft:${view.worldId}:${view.saveTimeline}:${view.player.id}`;
  const [text, setText] = useState(() => {
    try {
      return sessionStorage.getItem(draftKey) ?? '';
    } catch {
      return '';
    }
  });
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState<'enqueue' | 'replace'>('enqueue');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const submission = useRef<{ id: string; body: string } | null>(null);
  const decision = useRef<{
    id: string;
    attemptId: string;
    accept: boolean;
    epoch?: string;
  } | null>(null);
  const job = view.ai.jobs.find((entry) => entry.id === requestId && entry.kind === 'action');
  const targetMissing = !!targetId && !view.entities.some((entity) => entity.id === targetId);
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

  const send = async () => {
    if (inFlight.current || targetMissing) return;
    const body = JSON.stringify({ text: text.trim(), targetId: targetId || undefined, mode });
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
      if (result.ok) setRequestId(submitted.id);
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
  const decide = async (attemptId: string, accept: boolean) => {
    if (inFlight.current) return;
    if (
      !decision.current ||
      decision.current.attemptId !== attemptId ||
      decision.current.accept !== accept
    )
      decision.current = { id: crypto.randomUUID(), attemptId, accept, epoch: view.commandEpoch };
    const submitted = decision.current;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await post('/api/command', {
        commandId: submitted.id,
        commandEpoch: submitted.epoch,
        command: { type: accept ? 'confirm-attempt' : 'withdraw-attempt', attemptId },
      });
      if (!alive.current) return;
      setRequestId(null);
      setMessage(result.message ?? 'Decision submitted.');
      decision.current = null;
      // The shared authoritative state stream removes the pending card after commit.
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : 'Decision failed.');
    } finally {
      if (alive.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <Section title="Take an action">
      <p className="ol-caption">
        Describe your character's action, not dialogue. Coordinates use X,Z; inference may use your
        configured allowance.
      </p>
      <textarea
        aria-label="Action intention"
        maxLength={500}
        value={text}
        placeholder="Follow Ada, or go to x=12, z=14"
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
      <label>
        Current work{' '}
        <select value={mode} onChange={(e) => setMode(e.target.value as 'enqueue' | 'replace')}>
          <option value="enqueue">Queue after current work</option>
          <option value="replace">Replace current work</option>
        </select>
      </label>
      <Button
        disabled={busy || !connected || view.clock.paused || !text.trim() || targetMissing}
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
              <strong>Accept this revised action?</strong>
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
                  : 'Acceptance will queue after your current work.'}
              </p>
              <Button
                disabled={busy || !connected || view.clock.paused}
                onPress={() => void decide(attempt.id, true)}
              >
                Accept revised action
              </Button>
            </>
          ) : (
            <p className="ol-caption">
              No executable binding yet. Revise or explicitly resubmit the request, or withdraw it.
            </p>
          )}
          <Button
            variant="quiet"
            disabled={busy || !connected || view.clock.paused}
            onPress={() => void decide(attempt.id, false)}
          >
            Decline / withdraw
          </Button>
        </div>
      ))}
    </Section>
  );
}
