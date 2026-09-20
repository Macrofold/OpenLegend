import { useEffect, useRef, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { Button, Tag, SegmentedControl } from '../design-system/components';
import { aiSetupReason } from '../ai-readiness';
import { post } from '../api';
import { readDraft, saveDraft, type ComposerDraft } from '../draft';
export function Composer({
  view,
  connected,
  npcId,
  seed,
  setup,
  notify,
}: {
  view: GameView;
  connected: boolean;
  npcId: string | null;
  seed: ComposerDraft | null;
  setup(): void;
  notify(text: string): void;
}) {
  const [draft, setDraft] = useState(readDraft),
    [sending, setSending] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (seed) {
      setDraft(seed);
      input.current?.focus();
    }
  }, [seed]);
  useEffect(() => saveDraft(draft), [draft]);
  const reason = aiSetupReason(view.ai),
    npc = view.entities.find((e) => e.id === npcId) ?? view.entities.find((e) => e.canTalk);
  const job = view.ai.jobs.find(
    (j) =>
      j.kind === (draft.mode === 'chat' ? 'chat' : 'invention') &&
      ['queued', 'judging', 'generating'].includes(j.status),
  );
  const blocked = !connected
    ? 'Reconnect to the world.'
    : view.clock.paused
      ? 'Resume the world to send.'
      : draft.mode === 'chat' && !npc?.canTalk
        ? 'Move within hearing of someone to talk.'
        : !view.player.alive
          ? 'Recover at camp to continue.'
          : null;
  async function submit() {
    if (reason) {
      setup();
      return;
    }
    if (blocked || sending || job || !draft.text.trim()) return;
    const sent = draft;
    setSending(true);
    try {
      const result = await post(sent.mode === 'chat' ? '/api/chat' : '/api/invent', {
        requestId: crypto.randomUUID(),
        text: sent.text.trim(),
        ...(sent.mode === 'chat' ? { npcId: npc?.id } : {}),
      });
      notify(result.message);
      if (result.ok)
        setDraft((current) =>
          current.text === sent.text && current.mode === sent.mode
            ? { ...current, text: '' }
            : current,
        );
    } catch (e) {
      notify(`${String(e)} Check recent work before submitting again.`);
    } finally {
      setSending(false);
    }
  }
  return (
    <div id="composer">
      <SegmentedControl
        label="Conversation mode"
        options={[
          { value: 'chat', label: 'Talk' },
          { value: 'invention', label: 'Invent something' },
        ]}
        value={draft.mode}
        onChange={(v) => setDraft({ ...draft, mode: v as ComposerDraft['mode'] })}
      />
      {draft.mode === 'chat' ? (
        <>
          <p className="ol-meta">
            {npc ? `Talk with ${npc.name}` : 'Find someone in the clearing.'}
          </p>
          <div id="conversation" className="ol-thread" role="log">
            {view.conversation.map((m) => (
              <div
                key={m.id}
                className={`ol-message ol-message-${m.speakerId === view.player.id ? 'you' : 'agent'}`}
              >
                <strong>{m.speaker}</strong>
                <p>{m.text}</p>
                {m.replyStatus && <Tag>{m.replyStatus}</Tag>}
              </div>
            ))}
          </div>
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
            The current wilderness supports ranged launchers and arrow ammunition. Conjuring objects
            is not available.
          </p>
          {view.ai.jobs
            .filter((j) => j.kind === 'invention')
            .slice(0, 3)
            .map((j) => (
              <div key={j.id}>
                <Tag>{j.status}</Tag>
                <p>{j.message}</p>
              </div>
            ))}
        </div>
      )}
      <form
        id="messageForm"
        className="ol-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <textarea
          id="message"
          ref={input}
          aria-label={draft.mode === 'chat' ? 'Your message' : 'Your invention'}
          placeholder={
            draft.mode === 'chat' ? 'Say something…' : 'Describe what you want to invent…'
          }
          rows={3}
          maxLength={1000}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Button
          id="sendMessage"
          type="submit"
          variant="primary"
          icon={reason ? 'ui.settings' : 'ui.send'}
          busy={sending}
          disabled={!reason && (!!blocked || !!job || !draft.text.trim())}
        >
          {reason ? 'Set up AI' : 'Send'}
        </Button>
      </form>
      <p id="composerReadiness" className="ol-caption">
        {reason ?? blocked ?? 'Enter to send · Shift + Enter for a new line'}
      </p>
      {job && (
        <div className="ol-notice">
          <span>{job.message}</span>
          <Button
            size="sm"
            onPress={() =>
              void post('/api/ai/cancel', { jobId: job.id })
                .then((r) => notify(r.message))
                .catch((e) => notify(String(e)))
            }
          >
            Cancel request
          </Button>
        </div>
      )}
    </div>
  );
}
