import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Label, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';
import type {
  AiJobView,
  ApiResult,
  CommandReceiptResult,
  GameView,
  RequestRecoveryResult,
  SpeechVolume,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, Icon, IconButton } from '../design-system/components';
import { ConversationComposer } from './conversation';
import { useLocal } from './storage';
import {
  composerDraftKey,
  composerDraftScope,
  readDraft,
  saveDraft,
  type ComposerDraft,
} from '../draft';

export type WorldIntent = {
  mode: 'speak' | 'act';
  targetId?: string;
  label?: string;
  possession?: boolean;
  item?: { id: string; name: string };
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
  draftText: string;
  revision: string;
  volume: SpeechVolume;
  scope: string;
  key: string;
  intent: WorldIntent;
  directReply: boolean;
  retryOf?: string;
  timeline: string;
  commandEpoch: string | undefined;
};

type WorldComposerProps = {
  view: GameView;
  connected: boolean;
  intent: WorldIntent | null;
  visible: boolean;
  close(): void;
  setup(): void;
};

/** Remains mounted when hidden; private ownership, not transport, owns its drafts. */
export function WorldComposer(props: WorldComposerProps) {
  return <ScopedWorldComposer key={composerDraftScope(props.view)} {...props} />;
}

function ScopedWorldComposer({
  view,
  connected,
  intent,
  visible,
  close,
  setup,
}: WorldComposerProps) {
  const [drafts, setDrafts] = useState<Record<string, ComposerDraft>>({});
  const latestDrafts = useRef(drafts);
  latestDrafts.current = drafts;
  function writeDraft(key: string, draft: ComposerDraft) {
    const next = { ...latestDrafts.current, [key]: draft };
    latestDrafts.current = next;
    setDrafts(next);
    saveDraft(key, draft);
  }
  const [sendingState, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uncertainAttempt, setUncertain] = useState<Attempt | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, { jobId: string; attempt: Attempt }>>(
    {},
  );
  const [failedReplies, setFailedReplies] = useState<
    Record<string, { jobId: string; scope: string; retryId: string; attempt: Attempt }>
  >({});
  const [volume, setVolume] = useLocal<SpeechVolume>(
    'open-legend:speech-volume',
    'normal',
    (value): value is SpeechVolume => volumes.includes(value as SpeechVolume),
  );
  const input = useRef<HTMLTextAreaElement>(null);
  const pendingRequest = useRef<{ scope: string; attempt: Attempt } | null>(null);
  const surface = useRef<HTMLElement>(null);
  const scope = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.scope,
    view.access?.controlGeneration,
  ]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const sending = sendingState && pendingRequest.current?.scope === scope;
  const uncertain =
    uncertainAttempt ??
    (pendingRequest.current?.scope !== scope ? pendingRequest.current?.attempt : null);
  const key =
    composerDraftKey(
      composerDraftScope(view),
      intent?.mode ?? 'speak',
      intent?.targetId ?? null,
      intent?.item?.id ?? null,
    ) ?? '';
  const [preparedIntent, setPreparedIntent] = useState<WorldIntent | null>(null);
  let draft = drafts[key] ?? readDraft(key);
  const freshIntent = preparedIntent !== intent;
  if (freshIntent) setPreparedIntent(intent);
  // A new explicit Talk about choice restores its chip after a completed send,
  // without changing a nonempty draft where the player removed the mention.
  if (freshIntent && intent?.item && !draft.text && !draft.item)
    draft = { ...draft, item: { itemId: intent.item.id, name: intent.item.name } };
  if (drafts[key] !== draft) {
    const next = { ...drafts, [key]: draft };
    latestDrafts.current = next;
    setDrafts(next);
  }
  const text = draft.text;
  const mentionedItem = draft.item;
  const error = errors[key] ?? '';
  function setError(message: string, errorKey = key) {
    setErrors((current) => ({ ...current, [errorKey]: message }));
  }
  const targetAvailable =
    !intent?.targetId ||
    intent.possession ||
    view.entities.some((e) => e.id === intent.targetId) ||
    view.player.inventory.some((item) => item.id === intent.targetId);
  const recipient = intent?.targetId
    ? view.entities.find((entity) => entity.id === intent.targetId)
    : undefined;
  const requestsReply =
    intent?.mode === 'speak' && !!recipient && recipient.talkRequiresAi !== false;
  const replyAccount = intent?.targetId ? view.ai.budget.accounts?.[intent.targetId] : undefined;
  const replyUsage = view.ai.budget.perAgent ? replyAccount : view.ai.budget;
  const replyAllowance =
    view.ai.budget.limitUsd > (replyUsage?.spentUsd ?? 0) + (replyUsage?.reservedUsd ?? 0);
  // The player's speech is native even when the addressed person cannot generate
  // a reply. Never retry a refused paid request as a second spoken utterance.
  const directReply =
    requestsReply &&
    !recipient?.talkUnavailableReason &&
    replyAllowance &&
    (view.ai.mode === 'fixture' || (view.ai.jevConfigured && view.ai.llmConfigured));
  const spokenText = `${intent?.mode === 'speak' && mentionedItem ? `About ${mentionedItem.name}: ` : ''}${text.trim()}`;
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
            : spokenText.length > (directReply ? 1000 : intent?.mode === 'speak' ? 1500 : 500)
              ? 'Shorten these words before sending.'
              : needsAi
                ? 'This needs AI access and a spending allowance.'
                : null;
  const currentSubmission = submitted[key];
  const failedReply = failedReplies[key];
  const waitingForAct = !!currentSubmission;
  function finishSubmission(attempt: Attempt, job: Pick<AiJobView, 'id' | 'status' | 'message'>) {
    if (job.status === 'completed') return;
    if (attempt.directReply && job.status === 'failed')
      setFailedReplies((previous) => ({
        ...previous,
        [attempt.key]: { jobId: job.id, scope, retryId: crypto.randomUUID(), attempt },
      }));
    // Spoken words already happened. A failed reply must never restore/resend them.
    if (
      attempt.intent.mode === 'act' &&
      latestDrafts.current[attempt.key]?.revision === attempt.revision
    )
      writeDraft(attempt.key, { text: attempt.draftText, revision: attempt.revision });
    setError(job.message, attempt.key);
  }
  useEffect(
    () => () => {
      currentScope.current = '';
    },
    [],
  );
  useEffect(() => {
    if (visible && intent && !uncertain) input.current?.focus();
  }, [visible, key, intent]);
  useLayoutEffect(() => {
    // A result check may replace its button. Return only the focus it still owns;
    // a player who moved into another task keeps that newer focus.
    if (!uncertain && visible && document.activeElement === surface.current) input.current?.focus();
  }, [uncertain, visible]);
  useEffect(() => {
    if (!Object.keys(submitted).length) return;
    const jobs = new Map(view.ai.jobs.map((job) => [job.id, job]));
    const finished: string[] = [];
    // A different recipient is a different draft. Their pending reply must not
    // replace the earlier person's recovery controls while both are working.
    for (const [draftKey, submission] of Object.entries(submitted)) {
      const { attempt } = submission;
      const job = jobs.get(submission.jobId);
      if (!job || ['queued', 'judging', 'generating'].includes(job.status)) continue;
      finishSubmission(attempt, job);
      finished.push(draftKey);
    }
    if (finished.length)
      setSubmitted((previous) => {
        const next = { ...previous };
        for (const draftKey of finished)
          if (next[draftKey] === submitted[draftKey]) delete next[draftKey];
        return next;
      });
  }, [view.ai.jobs, submitted, scope]);
  async function send(reconcile?: Attempt, recovery = false) {
    if (
      pendingRequest.current?.scope === scope ||
      (!reconcile && (blocked || !text.trim() || !intent || waitingForAct || uncertain))
    )
      return;
    let attempt = reconcile;
    if (!attempt) {
      const draft = latestDrafts.current[key];
      if (!draft || !intent) return;
      attempt = {
        id: crypto.randomUUID(),
        text: spokenText,
        draftText: draft.text,
        revision: draft.revision,
        volume,
        scope,
        key,
        intent: {
          ...intent,
          item: mentionedItem ? { id: mentionedItem.itemId, name: mentionedItem.name } : undefined,
        },
        directReply,
        timeline: view.saveTimeline ?? '',
        commandEpoch: view.commandEpoch,
      };
    }
    if (!recovery && attempt.scope !== scope) {
      setError('Control changed. Check the previous send before repeating it.');
      return;
    }
    const request = { scope, attempt };
    pendingRequest.current = request;
    setSending(true);
    setError('');
    if (reconcile) surface.current?.focus({ preventScroll: true });
    else input.current?.focus();
    try {
      const command = {
        type: 'say' as const,
        text: attempt.text,
        volume: attempt.volume,
        ...(attempt.intent.targetId ? { targetId: attempt.intent.targetId } : {}),
      };
      let result: ApiResult;
      if (recovery) {
        const receipt = await post<RequestRecoveryResult | CommandReceiptResult>(
          attempt.directReply
            ? '/api/chat/receipt'
            : attempt.intent.mode === 'act'
              ? '/api/action-attempt/receipt'
              : '/api/command/receipt',
          attempt.directReply
            ? { requestId: attempt.id, timeline: attempt.timeline }
            : attempt.intent.mode === 'act'
              ? {
                  requestId: attempt.id,
                  timeline: attempt.timeline,
                  text: attempt.text,
                  mode: 'enqueue',
                  expression: true,
                  ...(attempt.intent.targetId ? { targetId: attempt.intent.targetId } : {}),
                }
              : { commandId: attempt.id, commandEpoch: attempt.commandEpoch, command },
        );
        if (pendingRequest.current !== request) return;
        if (currentScope.current !== scope) {
          setUncertain(attempt);
          return;
        }
        if (!receipt.ok || receipt.status !== 'resolved' || receipt.scope !== view.access?.scope) {
          setUncertain(attempt);
          setError(
            'message' in receipt ? receipt.message : 'Reconnect before checking this send.',
            attempt.key,
          );
          return;
        }
        result = receipt.result;
      } else
        result = await post<ApiResult>(
          attempt.retryOf
            ? '/api/chat/retry'
            : attempt.directReply
              ? '/api/chat'
              : attempt.intent.mode === 'speak'
                ? '/api/command'
                : '/api/expression',
          attempt.retryOf
            ? { requestId: attempt.id, originalRequestId: attempt.retryOf }
            : attempt.directReply
              ? {
                  requestId: attempt.id,
                  text: attempt.text,
                  npcId: attempt.intent.targetId,
                  volume: attempt.volume,
                }
              : attempt.intent.mode === 'speak'
                ? {
                    commandId: attempt.id,
                    commandEpoch: attempt.commandEpoch,
                    command,
                  }
                : {
                    requestId: attempt.id,
                    text: attempt.text,
                    ...(attempt.intent.targetId ? { targetId: attempt.intent.targetId } : {}),
                  },
        );
      if (pendingRequest.current !== request) return;
      if (currentScope.current !== scope) {
        setUncertain(attempt);
        setError('Control changed. Check Events before repeating this request.');
        return;
      }
      if (['unconfirmed', 'expired', 'idempotency-conflict'].includes(result.code)) {
        setUncertain(attempt);
        setError(result.message);
        return;
      }
      setUncertain(null);
      if (!result.ok && !result.jobStatus) {
        setError(result.message);
        return;
      }
      if (latestDrafts.current[attempt.key]?.revision === attempt.revision)
        writeDraft(attempt.key, { text: '', revision: attempt.revision });
      setFailedReplies((previous) => {
        const next = { ...previous };
        delete next[attempt.key];
        return next;
      });
      const jobId = result.jobId;
      if (jobId) {
        if (result.jobStatus && !['queued', 'judging', 'generating'].includes(result.jobStatus)) {
          finishSubmission(attempt, {
            id: jobId,
            status: result.jobStatus,
            message: result.message,
          });
          setSubmitted((previous) => {
            const next = { ...previous };
            delete next[attempt.key];
            return next;
          });
        } else setSubmitted((previous) => ({ ...previous, [attempt.key]: { jobId, attempt } }));
      }
    } catch (reason) {
      if (pendingRequest.current !== request) return;
      if (currentScope.current !== scope) {
        setUncertain(attempt);
        setError('Control changed. Check Events before repeating this request.');
        return;
      }
      setUncertain(attempt);
      setError(
        `Send could not be confirmed. Check the same send before trying again. ${String(reason)}`,
      );
    } finally {
      if (pendingRequest.current === request) {
        pendingRequest.current = null;
        setSending(false);
      }
    }
  }
  return (
    <section
      ref={surface}
      tabIndex={-1}
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
          {intent?.mode === 'speak'
            ? intent.label
              ? `Speak to ${intent.label}`
              : 'Speak'
            : intent?.label
              ? `Act on ${intent.label}`
              : 'Act'}
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
        <p className="ol-caption">Descriptive only. No mechanical effects yet.</p>
      )}
      {mentionedItem && (
        <div className="ol-world-item-mention">
          <span>About {mentionedItem.name}</span>
          <IconButton
            icon="ui.close"
            label={`Remove mention of ${mentionedItem.name}`}
            onPress={() =>
              writeDraft(key, { ...draft, item: undefined, revision: crypto.randomUUID() })
            }
          />
        </div>
      )}
      <div className="ol-world-composer-input">
        <WorldIntentIcon mode={intent?.mode ?? 'act'} />
        <ConversationComposer
          inputRef={input}
          ariaLabel={intent?.mode === 'speak' ? 'Words to say out loud' : 'Describe your action'}
          placeholder={intent?.mode === 'speak' ? 'Say something…' : 'Do a jig…'}
          maxLength={directReply ? 1000 : intent?.mode === 'speak' ? 1500 : 500}
          value={text}
          onChange={(value) =>
            writeDraft(key, { ...draft, text: value, revision: crypto.randomUUID() })
          }
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
            : error ||
              blocked ||
              (currentSubmission?.attempt.directReply
                ? `${currentSubmission.attempt.intent.label ?? 'The listener'} is considering a reply…`
                : 'Describing your action…')}
        </p>
      )}
      {uncertain && (
        <Button
          size="sm"
          onPress={() => void send(uncertain, true)}
          disabled={sending || !connected}
        >
          Check previous send
        </Button>
      )}
      {failedReply && (
        <Button
          size="sm"
          variant="secondary"
          isPending={sending}
          isDisabled={!!blocked || sending || !!uncertain}
          onPress={() =>
            void send({
              ...failedReply.attempt,
              scope,
              id: failedReply.retryId,
              retryOf: failedReply.jobId,
            })
          }
        >
          Retry their reply
        </Button>
      )}
      {currentSubmission && !view.ai.jobs.some((job) => job.id === currentSubmission.jobId) && (
        <Button
          size="sm"
          variant="secondary"
          disabled={sending || !connected || !!uncertain}
          onPress={() => void send(currentSubmission.attempt, true)}
        >
          Check {currentSubmission.attempt.directReply ? 'reply' : 'action'} status
        </Button>
      )}
      {requestsReply && !directReply && !blocked && (
        <p className="ol-caption">You can still speak. A reply is unavailable right now.</p>
      )}
      {needsAi && (
        <Button size="sm" onPress={setup}>
          AI settings and allowance
        </Button>
      )}
    </section>
  );
}
