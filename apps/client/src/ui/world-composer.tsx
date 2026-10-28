import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  AiJobView,
  ApiResult,
  CommandReceiptResult,
  GameView,
  RequestRecoveryResult,
  SpeechVolume,
  PlayerInteractionAvailability,
} from '@open-legend/protocol';
import { post, getScoped } from '../api';
import { playerActionStatusKey } from '../action-browser';
import { Button, Icon, IconButton, SelectField } from '../design-system/components';
import { Portrait } from '../design-system/portrait';
import { ConversationComposer } from './conversation';
import { LoadingScope, LoadingIndicator } from '../design-system/loading';
import { namePhrase } from '@open-legend/language';
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
  return <Icon name={mode === 'speak' ? 'ui.speech' : 'ui.act'} />;
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
  portalTarget?: HTMLElement;
  negotiationPerson?: { id: string; name: string };
  visible: boolean;
  preferenceNotice?: string;
  notice?: string;
  clearRecipient(): void;
  chooseTarget?(id: string): void;
  close(): void;
  setup(): void;
};

/** Remains mounted when hidden; private ownership, not transport, owns its drafts. */
export function WorldComposer(props: WorldComposerProps) {
  const intent = props.negotiationPerson
    ? {
        mode: 'speak' as const,
        targetId: props.negotiationPerson.id,
        label: props.negotiationPerson.name,
      }
    : props.intent;
  return <ScopedWorldComposer key={composerDraftScope(props.view)} {...props} intent={intent} />;
}

function ScopedWorldComposer({
  view,
  connected,
  intent,
  visible,
  preferenceNotice,
  notice,
  clearRecipient,
  chooseTarget,
  close,
  setup,
  portalTarget,
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
    intent?.mode === 'speak' ||
    !intent?.targetId ||
    intent.possession ||
    view.entities.some((e) => e.id === intent.targetId) ||
    view.player.inventory.some((item) => item.id === intent.targetId);
  const recipient = intent?.targetId
    ? view.entities.find((entity) => entity.id === intent.targetId)
    : undefined;
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);
  const availabilityKey = JSON.stringify([
    scope,
    intent?.mode,
    intent?.targetId,
    visible,
    connected,
    view.clock.paused,
    view.clock.pauseReason,
    playerActionStatusKey(view.player),
    view.player.knowledgeRevision,
    recipient?.bodyReference,
    recipient?.bodyState,
    recipient?.canTalk,
    recipient?.talkUnavailableReason,
    view.ai.jevConfigured,
    view.ai.llmConfigured,
    view.ai.budget.limitUsd,
    view.ai.budget.spentUsd,
    view.ai.budget.reservedUsd,
    view.ai.budget.period,
    intent?.targetId ? view.ai.budget.accounts?.[intent.targetId] : undefined,
    view.ai.jobs.map((job) => [job.id, job.status]),
    availabilityRefresh,
  ]);
  const [availability, setAvailability] = useState<{
    key: string;
    value: PlayerInteractionAvailability;
  }>();
  const available = availability?.key === availabilityKey ? availability.value : undefined;
  const checkingAvailability = visible && !!intent && connected && !available;
  const recipientLabel =
    available?.recipientName ??
    (recipient ? namePhrase(recipient, 'indefinite') : intent?.label) ??
    'Selected person';
  useEffect(() => {
    if (!visible || !intent || !connected) return;
    let current = true;
    const controller = new AbortController();
    const query = new URLSearchParams({
      mode: intent.mode,
      ...(intent.targetId ? { targetId: intent.targetId } : {}),
    });
    void getScoped<PlayerInteractionAvailability>(
      `/api/player-interaction/availability?${query}`,
      controller.signal,
    ).then(
      (value) => {
        if (current) setAvailability({ key: availabilityKey, value });
      },
      () => {
        if (current)
          setAvailability({
            key: availabilityKey,
            value: {
              available: false,
              code: 'unavailable',
              reason:
                'Interaction availability could not be confirmed. Check again before sending.',
              reply: false,
            },
          });
      },
    );
    return () => {
      current = false;
      controller.abort();
    };
  }, [availabilityKey]);
  // The server selects native-only speech versus the source-bound reply request.
  // Known unavailability never falls back to a second route that speaks anyway.
  const directReply = available?.reply ?? (!!recipient && recipient.talkRequiresAi !== false);
  const spokenText = `${intent?.mode === 'speak' && mentionedItem ? `About ${mentionedItem.name}: ` : ''}${text.trim()}`;
  const needsAi = available?.code === 'ai-unavailable';
  const blocked = !connected
    ? 'Reconnect to the world to send.'
    : !targetAvailable
      ? 'The selected object is no longer available.'
      : !available
        ? null
        : !available.available
          ? available.reason
          : spokenText.length > (directReply ? 1000 : intent?.mode === 'speak' ? 1500 : 500)
            ? 'Shorten these words before sending.'
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
  }, [visible, key, intent?.mode, intent?.targetId]);
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
      (!recovery && !available?.available) ||
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
          ...(intent.mode === 'speak' && intent.targetId ? { label: recipientLabel } : {}),
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
        if (result.code === 'ai-unavailable')
          setAvailability({
            key: availabilityKey,
            value: {
              available: false,
              code: result.code,
              reason: result.message,
              reply: false,
              ...(available?.recipientName ? { recipientName: available.recipientName } : {}),
            },
          });
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
  const composer = (
    <section
      ref={surface}
      tabIndex={-1}
      className="ol-world-composer ol-card"
      hidden={!visible || !intent}
      role="region"
      aria-label={intent?.mode === 'speak' ? 'Speak out loud' : 'Act'}
      aria-busy={checkingAvailability}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && event.nativeEvent.isComposing) {
          event.stopPropagation();
          return;
        }
        if (event.key === 'Escape' && !event.defaultPrevented && !portalTarget) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <LoadingScope region={surface}>
        <div className="ol-world-composer-head">
          <strong>
            {intent?.mode === 'speak' ? 'Speak' : intent?.label ? `Act on ${intent.label}` : 'Act'}
          </strong>
          {!portalTarget && <IconButton icon="ui.close" label="Close text bar" onPress={close} />}
        </div>
        <div className="ol-world-composer-body">
          <div className="ol-composer-target">
            {chooseTarget && !portalTarget ? (
              <SelectField
                label={intent?.mode === 'speak' ? 'To' : 'Target'}
                triggerArtwork={<Portrait art={recipient?.portrait} head size={48} />}
                toggleLabel={intent?.mode === 'speak' ? 'Choose addressee' : 'Choose target'}
                placeholder={intent?.mode === 'speak' ? 'Choose a listener…' : 'Choose a target…'}
                value={intent?.targetId ?? ''}
                onChange={chooseTarget}
                options={[
                  { id: '', label: intent?.mode === 'speak' ? 'Anyone who can hear' : 'No target' },
                  ...view.entities
                    .filter((entity) => intent?.mode !== 'speak' || entity.canTalk)
                    .map((entity) => ({ id: entity.id, label: entity.name })),
                ]}
              />
            ) : (
              <>
                <Portrait art={recipient?.portrait} head size={48} />
                <span>{recipientLabel}</span>
              </>
            )}
          </div>
          {notice && !(intent?.mode === 'speak' && notice === preferenceNotice) && (
            <p role="status" className="ol-meta">
              {notice}
            </p>
          )}
          {preferenceNotice && intent?.mode === 'speak' && (
            <p role="status" className="ol-muted">
              {preferenceNotice}
            </p>
          )}
          {intent?.mode === 'speak' && (
            <div className="ol-world-volume" role="group" aria-label="Speech volume">
              {volumes.map((value) => (
                <IconButton
                  key={value}
                  icon={`speech.${value}`}
                  label={value[0]!.toUpperCase() + value.slice(1)}
                  pressed={volume === value}
                  onPress={() => setVolume(value)}
                />
              ))}
            </div>
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
              ariaLabel={
                intent?.mode === 'speak' ? 'Words to say out loud' : 'Describe your action'
              }
              placeholder={intent?.mode === 'speak' ? 'Say something…' : 'Do a jig…'}
              maxLength={directReply ? 1000 : intent?.mode === 'speak' ? 1500 : 500}
              value={text}
              onChange={(value) =>
                writeDraft(key, { ...draft, text: value, revision: crypto.randomUUID() })
              }
              onSubmit={() => send()}
              inputDisabled={!!uncertain}
              busy={sending}
              disabled={
                !available?.available ||
                !!blocked ||
                !text.trim() ||
                sending ||
                waitingForAct ||
                !!uncertain
              }
              submitLabel={intent?.mode === 'speak' ? 'Say' : 'Act'}
              submitIcon={intent?.mode === 'speak' ? 'ui.speech' : 'ui.act'}
            />
          </div>
          {(blocked || error || waitingForAct || uncertain) && (
            <p role="status" className="ol-meta">
              {uncertain
                ? 'A previous send is unconfirmed. Check it before sending again.'
                : error ||
                  (waitingForAct
                    ? currentSubmission?.attempt.directReply
                      ? `${currentSubmission.attempt.intent.label ?? 'The listener'} is considering a reply…`
                      : 'Describing your action…'
                    : blocked)}
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
              isDisabled={!available?.available || !!blocked || sending || !!uncertain}
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
          {needsAi && (
            <Button size="sm" onPress={setup}>
              AI settings and allowance
            </Button>
          )}
          {available && !available.available && connected && !sending && !uncertain && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setAvailabilityRefresh((n) => n + 1)}
            >
              Check availability
            </Button>
          )}
          <LoadingIndicator
            active={checkingAvailability}
            label="Checking interaction availability"
          />
        </div>
      </LoadingScope>
    </section>
  );
  return portalTarget ? createPortal(composer, portalTarget) : composer;
}
