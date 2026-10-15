import { useEffect, useRef, useState } from 'react';
import { Label, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';
import type { ApiResult, GameView, SpeechVolume } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Icon, IconButton } from '../design-system/components';
import { ConversationComposer } from './conversation';
import { useLocal } from './storage';

export type WorldIntent = {
  mode: 'speak' | 'act';
  targetId?: string;
  label?: string;
  possession?: boolean;
};
export function WorldIntentIcon({ mode }: { mode: WorldIntent['mode'] }) {
  return mode === 'speak' ? (
    <Icon name="ui.speech" />
  ) : (
    <svg
      className="ol-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 13V6a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6c0 4-2.5 7-6 7h-1c-2 0-3.5-1-4.5-2.5L4 13a1.7 1.7 0 0 1 2.7-2L8 13Z" />
    </svg>
  );
}
const volumes: SpeechVolume[] = ['whisper', 'normal', 'shout'];
type Attempt = {
  id: string;
  text: string;
  volume: SpeechVolume;
  scope: string;
  key: string;
  intent: WorldIntent;
};

/** Remains mounted when hidden so closing, pausing and reconnecting retain the draft. */
export function WorldComposer({
  view,
  connected,
  intent,
  visible,
  close,
  setup,
}: {
  view: GameView;
  connected: boolean;
  intent: WorldIntent | null;
  visible: boolean;
  close(): void;
  setup(): void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uncertain, setUncertain] = useState<Attempt | null>(null);
  const [submitted, setSubmitted] = useState<{ jobId: string; attempt: Attempt } | null>(null);
  const [volume, setVolume] = useLocal<SpeechVolume>(
    'open-legend:speech-volume',
    'normal',
    (value): value is SpeechVolume => volumes.includes(value as SpeechVolume),
  );
  const input = useRef<HTMLTextAreaElement>(null),
    locked = useRef(false);
  const scope = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.scope,
    view.access?.controlGeneration,
  ]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const key = JSON.stringify([intent?.mode, intent?.targetId]);
  const text = drafts[key] ?? '';
  const error = errors[key] ?? '';
  function setError(message: string, errorKey = key) {
    setErrors((current) => ({ ...current, [errorKey]: message }));
  }
  const targetAvailable =
    !intent?.targetId ||
    intent.possession ||
    view.entities.some((e) => e.id === intent.targetId) ||
    view.player.inventory.some((item) => item.id === intent.targetId);
  const needsAi =
    intent?.mode === 'act' &&
    view.ai.mode !== 'fixture' &&
    (!view.ai.llmConfigured || view.ai.budget.limitUsd <= 0);
  const blocked = !connected
    ? 'Reconnect to the world to send.'
    : view.access?.controlling === false || view.player.participation === 'inactive'
      ? 'Resume here to send.'
      : view.clock.paused
        ? 'Resume the game to send.'
        : !view.player.alive
          ? 'Your character cannot do this now.'
          : !targetAvailable
            ? 'The selected object is no longer available.'
            : needsAi
              ? 'Act needs AI access and a spending allowance.'
              : null;
  const job = submitted ? view.ai.jobs.find((job) => job.id === submitted.jobId) : undefined;
  const pendingJob =
    !!submitted && (!job || ['queued', 'judging', 'generating'].includes(job.status));
  const waitingForAct = intent?.mode === 'act' && pendingJob;
  useEffect(() => {
    if (visible && intent && !uncertain) input.current?.focus();
  }, [visible, key, uncertain]);
  useEffect(() => {
    if (!submitted) return;
    if (submitted.attempt.scope !== scope) {
      setSubmitted(null);
      return;
    }
    if (!job || ['queued', 'judging', 'generating'].includes(job.status)) return;
    if (job.status !== 'completed') {
      setDrafts((current) =>
        current[submitted.attempt.key]
          ? current
          : { ...current, [submitted.attempt.key]: submitted.attempt.text },
      );
      setError(job.message, submitted.attempt.key);
    }
    setSubmitted(null);
  }, [job, submitted, scope]);
  async function send(reconcile?: Attempt) {
    if (
      locked.current ||
      (!reconcile && (blocked || !text.trim() || !intent || waitingForAct || uncertain))
    )
      return;
    const attempt = reconcile ?? {
      id: crypto.randomUUID(),
      text: text.trim(),
      volume,
      scope,
      key,
      intent: intent!,
    };
    if (attempt.scope !== scope) {
      setError('Control changed. Check World Events before repeating this request.');
      return;
    }
    locked.current = true;
    setSending(true);
    setError('');
    try {
      const result = await post<ApiResult>(
        attempt.intent.mode === 'speak' ? '/api/command' : '/api/expression',
        attempt.intent.mode === 'speak'
          ? {
              commandId: attempt.id,
              commandEpoch: view.commandEpoch,
              command: { type: 'say', text: attempt.text, volume: attempt.volume },
            }
          : {
              requestId: attempt.id,
              text: attempt.text,
              ...(attempt.intent.targetId ? { targetId: attempt.intent.targetId } : {}),
            },
      );
      if (currentScope.current !== attempt.scope) {
        setUncertain(attempt);
        setError('Control changed. Check World Events before repeating this request.');
        return;
      }
      setUncertain(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDrafts((current) => {
        if (current[attempt.key]?.trim() !== attempt.text) return current;
        const next = { ...current };
        delete next[attempt.key];
        return next;
      });
      if (result.jobId) setSubmitted({ jobId: result.jobId, attempt });
    } catch (reason) {
      if (currentScope.current !== attempt.scope) {
        setUncertain(attempt);
        setError('Control changed. Check World Events before repeating this request.');
        return;
      }
      setUncertain(attempt);
      setError(
        `Send could not be confirmed. Check the same send before trying again. ${String(reason)}`,
      );
    } finally {
      locked.current = false;
      setSending(false);
      input.current?.focus();
    }
  }
  return (
    <section
      className="ol-world-composer ol-card"
      hidden={!visible || !intent}
      role="region"
      aria-label={intent?.mode === 'speak' ? 'Speak out loud' : 'Act'}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && event.nativeEvent.isComposing) {
          event.stopPropagation();
          return;
        }
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <div className="ol-world-composer-head">
        <strong>
          {intent?.mode === 'speak' ? 'Speak' : intent?.label ? `Act on ${intent.label}` : 'Act'}
        </strong>
        <IconButton icon="ui.close" label="Close text bar" onPress={close} />
      </div>
      {intent?.mode === 'speak' ? (
        <Slider
          className="ol-world-volume"
          aria-label="Speech volume"
          minValue={0}
          maxValue={2}
          step={1}
          value={volumes.indexOf(volume)}
          onChange={(value) => setVolume(volumes[Number(value)]!)}
        >
          <Label>Volume</Label>
          <SliderOutput>{volume[0]!.toUpperCase() + volume.slice(1)}</SliderOutput>
          <SliderTrack>
            <SliderThumb aria-label={`Speech volume: ${volume}`} />
          </SliderTrack>
          <div className="ol-world-volume-labels" aria-hidden="true">
            <span>Whisper</span>
            <span>Normal</span>
            <span>Shout</span>
          </div>
        </Slider>
      ) : (
        <p className="ol-caption">Descriptive only · no mechanical effects yet.</p>
      )}
      <div className="ol-world-composer-input">
        <WorldIntentIcon mode={intent?.mode ?? 'act'} />
        <ConversationComposer
          inputRef={input}
          ariaLabel={intent?.mode === 'speak' ? 'Words to say out loud' : 'Describe your action'}
          placeholder={intent?.mode === 'speak' ? 'Say something…' : 'Do a jig…'}
          maxLength={intent?.mode === 'speak' ? 1500 : 500}
          value={text}
          onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))}
          onSubmit={() => send()}
          inputDisabled={!!uncertain}
          disabled={!!blocked || !text.trim() || sending || waitingForAct || !!uncertain}
          submitLabel={sending ? 'Sending…' : intent?.mode === 'speak' ? 'Speak' : 'Act'}
        />
      </div>
      {(blocked || error || waitingForAct || uncertain) && (
        <p role="status" className="ol-meta">
          {uncertain
            ? 'A previous send is unconfirmed. Check it before sending again.'
            : error || blocked || 'Describing your action…'}
        </p>
      )}
      {uncertain?.scope !== scope && uncertain ? (
        <Button
          size="sm"
          onPress={() => {
            setUncertain(null);
            setError('');
          }}
        >
          Keep draft and start a new send
        </Button>
      ) : (
        uncertain && (
          <Button size="sm" onPress={() => void send(uncertain)} disabled={sending || !connected}>
            Check previous send
          </Button>
        )
      )}
      {needsAi && (
        <Button size="sm" onPress={setup}>
          AI settings and allowance
        </Button>
      )}
    </section>
  );
}
