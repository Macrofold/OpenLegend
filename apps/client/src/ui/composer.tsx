import { namePhrase } from '@open-legend/language';
import { useChatHistory } from './use-chat-history';
import { useReplyPreview } from './use-reply-preview';
import { useComposerDraft } from './use-composer-draft';
import { useEffect, useRef, useState } from 'react';
import { Label, Slider, SliderOutput, SliderTrack, SliderThumb } from 'react-aria-components';
import type { GameView, SpeechVolume } from '@open-legend/protocol';
import { Button, Tag, SegmentedControl } from '../design-system/components';
import { aiSetupReason } from '../ai-readiness';
import { post } from '../api';
import { useLocal } from './storage';
import {
  composerDraftKey,
  composerDraftScope,
  type ComposerItem,
  type ComposerMode,
} from '../draft';
import './composer.css';
import {
  ConversationComposer,
  ConversationMessage,
  ConversationThread,
  TypingIndicator,
  type ConversationItem,
} from './conversation';

const activeReply = (status: string | undefined) =>
  status !== undefined && ['queued', 'judging', 'generating'].includes(status);

export interface ComposerEntry {
  id: string;
  recipientId?: string;
  item: ComposerItem;
}

export function Composer({
  view,
  connected,
  npcId,
  entry,
  talkRevision,
  chooseRecipient,
  clearEntry,
  setup,
  notify,
  visible,
}: {
  view: GameView;
  connected: boolean;
  npcId: string | null;
  entry: ComposerEntry | null;
  talkRevision: number;
  chooseRecipient(id: string): void;
  clearEntry(): void;
  setup(): void;
  notify(text: string): void;
  visible: boolean;
}) {
  const [mode, setMode] = useState<ComposerMode>('chat');
  const scope = composerDraftScope(view);
  const draftKey = composerDraftKey(scope, mode, npcId);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [sendIssue, setSendIssue] = useState<{ key: string; message: string } | null>(null);
  const { draft, edit, clearSent } = useComposerDraft(scope, draftKey);
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
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
    setMode('chat');
    input.current?.focus();
  }, [talkRevision]);
  const npc = npcId ? view.entities.find((e) => e.id === npcId) : undefined;
  const entryOwner = useRef({ id: entry?.id, scope });
  if (entryOwner.current.id !== entry?.id) entryOwner.current = { id: entry?.id, scope };
  const currentEntry = entry && scope && entryOwner.current.scope === scope ? entry : null;
  const consumedEntry = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!entry || consumedEntry.current === entry.id) return;
    if (!currentEntry) {
      consumedEntry.current = entry.id;
      clearEntry();
      return;
    }
    if (!entry.recipientId) return;
    if (mode !== 'chat') return;
    consumedEntry.current = entry.id;
    if (entry.recipientId === npcId && npc?.canTalk && draftKey) {
      edit({ item: entry.item });
      input.current?.focus();
    }
    clearEntry();
  }, [entry, scope, mode, npcId, npc?.canTalk, draftKey]);
  const pendingItem = !npcId && !currentEntry?.recipientId ? currentEntry?.item : undefined;
  const mention = mode === 'chat' ? (draft.item ?? pendingItem) : undefined;
  // The chat API accepts words, not an item attachment. The visible prefix is sent as speech.
  const spokenText = `${mode === 'chat' && draft.item ? `About ${draft.item.name}: ` : ''}${draft.text.trim()}`;
  const limitReason =
    spokenText.length > 1000
      ? `Message and item mention are ${spokenText.length} characters. Shorten to 1,000 to send.`
      : null;
  const nativeSpeech = mode === 'chat' && npc?.talkRequiresAi === false;
  const reason = nativeSpeech ? null : aiSetupReason(view.ai);
  const job =
    !nativeSpeech &&
    view.ai.jobs.find(
      (j) =>
        j.kind === (mode === 'chat' ? 'chat' : 'invention') &&
        ['queued', 'judging', 'generating'].includes(j.status),
    );
  const actorBlocked =
    mode !== 'chat'
      ? view.inventionPolicy.playerLocked
        ? 'Player invention is locked. Existing crafts remain available.'
        : null
      : !npc
        ? npcId
          ? 'This person is no longer in view.'
          : 'Choose someone to talk to.'
        : (npc.talkUnavailableReason ?? null);
  const blocked = !connected
    ? 'Reconnect to the world.'
    : !scope
      ? 'Take control of your character to speak.'
      : view.clock.paused
        ? 'Resume the world before sending a message.'
        : actorBlocked
          ? actorBlocked
          : !view.player.alive
            ? 'Recover at camp to continue.'
            : null;
  const history = useChatHistory(view, npcId ?? undefined, visible && mode === 'chat');
  const replyMessage = history.messages.filter((message) => !!message.replyRequestId).at(-1);
  const preview = useReplyPreview(
    view,
    npcId ?? undefined,
    replyMessage?.replyRequestId,
    visible &&
      connected &&
      mode === 'chat' &&
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
    if (blocked || sendLock.current || job || !scope || !draftKey || limitReason) return;
    if (reason) {
      setup();
      return;
    }
    if (!draft.text.trim()) return;
    const sent = { scope, key: draftKey, revision: draft.revision };
    sendLock.current = true;
    setSending(true);
    setSendIssue(null);
    try {
      const result = nativeSpeech
        ? await post('/api/command', {
            commandId: crypto.randomUUID(),
            commandEpoch: view.commandEpoch,
            command: { type: 'say', text: spokenText, targetId: npc?.id, volume },
          })
        : await post(mode === 'chat' ? '/api/chat' : '/api/invent', {
            requestId: crypto.randomUUID(),
            text: spokenText,
            ...(mode === 'chat' ? { npcId: npc?.id, volume } : {}),
          });
      if (result.ok) clearSent(sent);
      else if (currentScope.current === sent.scope)
        setSendIssue({ key: sent.key, message: result.message });
    } catch (e) {
      if (currentScope.current === sent.scope)
        setSendIssue({
          key: sent.key,
          message: `${String(e)} Sending was not confirmed. Check ${mode === 'chat' ? 'the conversation' : 'your recent invention work'} before sending again. Your draft is retained.`,
        });
    } finally {
      sendLock.current = false;
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
          value={mode}
          onChange={(value) => {
            setMode(value as ComposerMode);
            if (value !== 'chat' && pendingItem) clearEntry();
          }}
        />
        {mode === 'chat' && (
          <p className="ol-meta ol-conversation-recipient">
            {npc
              ? `To ${namePhrase(npc, 'definite')}`
              : npcId
                ? 'This person is no longer in view.'
                : 'Choose someone to talk to.'}
            {npc && <span className="ol-caption">Others within hearing may hear you.</span>}
          </p>
        )}
      </div>
      <div className="ol-conversation-body" data-mode={mode}>
        {mode === 'chat' ? (
          <>
            <div className="ol-conversation-history">
              {history.error && <p role="alert">{history.error}</p>}
              <ConversationThread
                id="conversation"
                conversationKey={draftKey ?? 'no-recipient'}
                preserveReading
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
                  !npcId ? (
                    <div className="ol-composer-people">
                      <p className="ol-meta">
                        Choose someone nearby, or use Talk on a person in the world.
                      </p>
                      {view.entities
                        .filter((person) => person.canTalk)
                        .map((person) => (
                          <Button
                            key={person.id}
                            variant="secondary"
                            onPress={() => chooseRecipient(person.id)}
                            isDisabled={!scope}
                          >
                            Talk to {namePhrase(person, 'definite')}
                          </Button>
                        ))}
                      {!view.entities.some((person) => person.canTalk) && (
                        <p className="ol-meta">No one is available to talk right now.</p>
                      )}
                    </div>
                  ) : (
                    <p className="ol-meta">
                      {history.loading
                        ? 'Loading conversation…'
                        : 'No saved messages with this person yet.'}
                    </p>
                  )
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
      {mention && (
        <div className="ol-composer-item">
          <span>About {mention.name}:</span>
          <Button
            size="sm"
            variant="quiet"
            aria-label={`Remove mention of ${mention.name}`}
            onPress={() => (draft.item ? edit({ item: undefined }) : clearEntry())}
          >
            Remove
          </Button>
          <p className="ol-caption">
            {pendingItem
              ? 'Choose a person before writing your message.'
              : 'This name will begin your message.'}
          </p>
        </div>
      )}
      {sendIssue?.key === draftKey && (
        <div className="ol-composer-send-issue">
          <p role="alert">{sendIssue.message}</p>
          {mode === 'chat' && (
            <Button
              size="sm"
              variant="quiet"
              isDisabled={history.loading}
              onPress={() => void history.refresh()}
            >
              Refresh conversation
            </Button>
          )}
        </div>
      )}
      <ConversationComposer
        formId="messageForm"
        textareaId="message"
        inputRef={input}
        ariaLabel={mode === 'chat' ? 'Your message' : 'Your invention'}
        placeholder={mode === 'chat' ? 'Say something…' : 'Describe what you want to invent…'}
        maxLength={1000}
        value={draft.text}
        onChange={(text) => edit({ text })}
        onSubmit={submit}
        submitIcon={reason && !blocked ? 'ui.settings' : 'ui.send'}
        submitLabel={reason && !blocked ? 'Set up AI' : 'Send'}
        disabled={sending || !!blocked || !!job || !!limitReason || (!reason && !draft.text.trim())}
        inputDisabled={!scope || !!actorBlocked}
        inputDisabledReason={!scope ? 'Take control of your character to speak.' : actorBlocked}
      />
      <p id="composerReadiness" className="ol-caption">
        {blocked ??
          limitReason ??
          (reason
            ? 'AI needs setup. Open settings to continue.'
            : 'Enter to send · Shift + Enter for a new line')}
      </p>
    </div>
  );
}
