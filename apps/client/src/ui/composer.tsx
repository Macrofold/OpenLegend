import { namePhrase } from '@open-legend/language';
import { useChatHistory } from './use-chat-history';
import { useReplyPreview } from './use-reply-preview';
import { useEffect, useRef, useState } from 'react';
import { Label, Slider, SliderOutput, SliderTrack, SliderThumb } from 'react-aria-components';
import type { GameView, SpeechVolume } from '@open-legend/protocol';
import { Button, Tag, SegmentedControl } from '../design-system/components';
import { aiSetupReason } from '../ai-readiness';
import { post } from '../api';
import { useLocal } from './storage';
import { readDraft, saveDraft, type ComposerDraft } from '../draft';
import {
  ConversationComposer,
  ConversationMessage,
  ConversationThread,
  TypingIndicator,
  type ConversationItem,
} from './conversation';

const activeReply = (status: string | undefined) =>
  status !== undefined && ['queued', 'judging', 'generating'].includes(status);

export function Composer({
  view,
  connected,
  npcId,
  seed,
  setup,
  notify,
  visible,
}: {
  view: GameView;
  connected: boolean;
  npcId: string | null;
  seed: ComposerDraft | null;
  setup(): void;
  notify(text: string): void;
  visible: boolean;
}) {
  const [draft, setDraft] = useState(readDraft),
    [sending, setSending] = useState(false);
  const [volume, setVolume] = useLocal<SpeechVolume>(
    'open-legend:speech-volume',
    'normal',
    (v): v is SpeechVolume => v === 'whisper' || v === 'normal' || v === 'shout',
  );
  const volumeLabel = volume === 'whisper' ? 'Whisper' : volume === 'normal' ? 'Normal' : 'Shout';
  const input = useRef<HTMLTextAreaElement>(null);
  const retryKeys = useRef(new Map<string, string>());
  const retryLock = useRef(new Set<string>());
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  async function retry(originalRequestId: string) {
    if (retryLock.current.has(originalRequestId)) return;
    retryLock.current.add(originalRequestId);
    setRetrying((current) => ({ ...current, [originalRequestId]: true }));
    const requestId = retryKeys.current.get(originalRequestId) ?? crypto.randomUUID();
    retryKeys.current.set(originalRequestId, requestId);
    try {
      const result = await post('/api/chat/retry', { requestId, originalRequestId });
      if (!result.ok) {
        retryKeys.current.delete(originalRequestId);
        notify(result.message);
      } else {
        if (result.jobId) history.markRetry(originalRequestId, result.jobId);
        await history.refresh();
      }
    } catch (error) {
      notify(`${String(error)} Retry again to check the same attempt.`);
    } finally {
      retryLock.current.delete(originalRequestId);
      setRetrying((current) => ({ ...current, [originalRequestId]: false }));
    }
  }
  useEffect(() => {
    if (seed) {
      setDraft(seed);
      input.current?.focus();
    }
  }, [seed]);
  useEffect(() => saveDraft(draft), [draft]);
  const npc = npcId
    ? view.entities.find((e) => e.id === npcId)
    : view.entities.find((e) => e.canTalk);
  const nativeSpeech = draft.mode === 'chat' && npc?.talkRequiresAi === false;
  const reason = nativeSpeech ? null : aiSetupReason(view.ai);
  const job =
    !nativeSpeech &&
    view.ai.jobs.find(
      (j) =>
        j.kind === (draft.mode === 'chat' ? 'chat' : 'invention') &&
        ['queued', 'judging', 'generating'].includes(j.status),
    );
  const actorBlocked =
    draft.mode !== 'chat'
      ? view.inventionPolicy.playerLocked
        ? 'Player invention is locked. Existing crafts remain available.'
        : null
      : !npc
        ? npcId
          ? 'This person is no longer in view.'
          : 'Move within hearing of someone to talk.'
        : (npc.talkUnavailableReason ?? null);
  const blocked = !connected
    ? 'Reconnect to the world.'
    : view.access?.controlling === false || view.player.participation === 'inactive'
      ? 'Take control of your character to speak.'
      : view.clock.paused
        ? 'Resume the world before sending a message.'
        : actorBlocked
          ? actorBlocked
          : !view.player.alive
            ? 'Recover at camp to continue.'
            : null;
  const history = useChatHistory(view, npcId ?? npc?.id, visible && draft.mode === 'chat');
  const replyMessage = history.messages.filter((message) => !!message.replyRequestId).at(-1);
  const preview = useReplyPreview(
    view,
    npcId ?? npc?.id,
    replyMessage?.replyRequestId,
    visible &&
      connected &&
      draft.mode === 'chat' &&
      view.access?.controlling !== false &&
      view.player.alive &&
      view.player.participation !== 'inactive' &&
      !!npc,
    history.refresh,
  );
  const awaitingHistory =
    preview?.state === 'settled' &&
    preview.historyIds.some((id) => !history.messages.some((message) => message.id === id));
  const previewText =
    preview?.state === 'forming' && activeReply(replyMessage?.replyStatus) ? preview.text : '';
  const messages: ConversationItem[] = history.messages.map((message) => ({
    id: message.id,
    content:
      message.kind === 'action' ? (
        <div className="ol-meta">
          <p>{message.text}</p>
        </div>
      ) : (
        <>
          <ConversationMessage
            role={message.speakerId === view.player.id ? 'you' : 'agent'}
            label={`${message.speaker}${message.speech?.delivery === 'whisper' ? ' · Whispering' : message.speech?.delivery === 'shout' ? ' · Shouting' : ''}${message.speech?.intelligibility === 'partial' ? ' · Partly heard' : ''}`}
            text={message.text}
            failureReason={
              message.replyStatus === 'failed' && !retrying[message.replyRequestId ?? '']
                ? message.replyFailure
                : undefined
            }
            onRetry={
              message.retryable && message.replyRequestId
                ? () => void retry(message.replyRequestId!)
                : undefined
            }
            pending={
              !(previewText && message.replyRequestId === preview?.requestId) &&
              (!!retrying[message.replyRequestId ?? ''] ||
                activeReply(message.replyStatus) ||
                (message.replyRequestId === preview?.requestId &&
                  (!!awaitingHistory || preview?.state === 'forming')))
            }
          />
          {preview && previewText && message.replyRequestId === preview.requestId && (
            <ConversationMessage
              role="agent"
              label={`${preview.speaker}${preview.volume === 'whisper' ? ' · Whispering' : preview.volume === 'shout' ? ' · Shouting' : ''}`}
              text={previewText}
            >
              <TypingIndicator />
            </ConversationMessage>
          )}
        </>
      ),
  }));
  async function submit() {
    if (reason) {
      setup();
      return;
    }
    if (blocked || sending || job || !draft.text.trim()) return;
    const sent = draft;
    setSending(true);
    try {
      const result = nativeSpeech
        ? await post('/api/command', {
            commandId: crypto.randomUUID(),
            commandEpoch: view.commandEpoch,
            command: { type: 'say', text: sent.text.trim(), targetId: npc!.id, volume },
          })
        : await post(sent.mode === 'chat' ? '/api/chat' : '/api/invent', {
            requestId: crypto.randomUUID(),
            text: sent.text.trim(),
            ...(sent.mode === 'chat' ? { npcId: npc?.id, volume } : {}),
          });
      if (result.ok)
        setDraft((current) =>
          current.text === sent.text && current.mode === sent.mode
            ? { ...current, text: '' }
            : current,
        );
      else notify(result.message);
    } catch (e) {
      notify(`${String(e)} Check recent work before submitting again.`);
    } finally {
      setSending(false);
    }
  }
  return (
    <div id="composer">
      <div className="ol-conversation-toolbar">
        <SegmentedControl
          label="Conversation mode"
          options={[
            { value: 'chat', label: 'Talk' },
            { value: 'invention', label: 'Invent something' },
          ]}
          value={draft.mode}
          onChange={(v) => setDraft({ ...draft, mode: v as ComposerDraft['mode'] })}
        />
        {draft.mode === 'chat' && (
          <p className="ol-meta ol-conversation-recipient">
            {npc ? `With ${namePhrase(npc, 'definite')}` : 'Find someone to talk to.'}
          </p>
        )}
      </div>
      <div className="ol-conversation-body" data-mode={draft.mode}>
        {draft.mode === 'chat' ? (
          <>
            <div className="ol-conversation-history">
              {history.error && <p role="alert">{history.error}</p>}
              <ConversationThread
                id="conversation"
                conversationKey={`${view.worldId}:${npcId ?? npc?.id ?? 'nearby'}`}
                items={messages}
                openingRevision={history.openingRevision}
                contentRevision={`${preview?.generation ?? ''}:${preview?.sequence ?? 0}`}
                before={
                  history.hasOlder ? (
                    <Button
                      size="sm"
                      variant="quiet"
                      onPress={history.loadOlder}
                      isDisabled={history.loading}
                    >
                      Older messages
                    </Button>
                  ) : undefined
                }
                empty={
                  <p className="ol-meta">
                    {history.loading
                      ? 'Loading conversation…'
                      : 'No saved messages with this person yet.'}
                  </p>
                }
                ariaLabel={
                  npc ? `Conversation with ${namePhrase(npc, 'definite')}` : 'Conversation'
                }
                visible={visible}
              />
            </div>
            <Slider
              className="ol-speech-volume"
              orientation="vertical"
              minValue={0}
              maxValue={2}
              step={1}
              value={volume === 'whisper' ? 0 : volume === 'normal' ? 1 : 2}
              onChange={(value) =>
                setVolume(value === 0 ? 'whisper' : value === 1 ? 'normal' : 'shout')
              }
              isDisabled={sending}
              aria-describedby="speechVolumeHint"
            >
              <Label>Volume</Label>
              <SliderOutput>{volumeLabel}</SliderOutput>
              <SliderTrack className="ol-volume-track">
                <SliderThumb
                  className="ol-volume-thumb"
                  aria-label={`Speech volume: ${volumeLabel}`}
                />
              </SliderTrack>
              <span id="speechVolumeHint" className="ol-sr">
                Louder speech can be heard farther away. Use the arrow keys or drag to choose a
                level.
              </span>
            </Slider>
          </>
        ) : (
          <div className="ol-proposal">
            <Tag>Invention</Tag>
            <h3 className="ol-heading">Make something possible</h3>
            <p>
              Describe a tool and the materials you want to use. An admitted recipe appears in
              Crafting; making it still takes materials and work.
            </p>
            <p className="ol-meta">
              The current wilderness supports ranged launchers and arrow ammunition. Conjuring
              objects is not available.
            </p>
            {view.ai.jobs
              .filter((j) => j.kind === 'invention' && j.status === 'failed')
              .slice(0, 3)
              .map((j) => (
                <div key={j.id}>
                  <Tag>Failed</Tag>
                  <p>{j.message}</p>
                </div>
              ))}
          </div>
        )}
      </div>
      <ConversationComposer
        formId="messageForm"
        textareaId="message"
        inputRef={input}
        ariaLabel={draft.mode === 'chat' ? 'Your message' : 'Your invention'}
        placeholder={draft.mode === 'chat' ? 'Say something…' : 'Describe what you want to invent…'}
        maxLength={1000}
        value={draft.text}
        onChange={(text) => setDraft({ ...draft, text })}
        onSubmit={submit}
        submitIcon={reason ? 'ui.settings' : 'ui.send'}
        submitLabel={reason ? 'Set up AI' : 'Send'}
        disabled={!reason && (sending || !!blocked || !!job || !draft.text.trim())}
        inputDisabled={!!actorBlocked}
        inputDisabledReason={actorBlocked}
      />
      <p id="composerReadiness" className="ol-caption">
        {reason
          ? 'AI needs setup. Open settings to continue.'
          : (blocked ?? 'Enter to send · Shift + Enter for a new line')}
      </p>
    </div>
  );
}
