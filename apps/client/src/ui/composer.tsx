import { History } from './history';
import { useEffect, useRef, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { Button, Tag, SegmentedControl } from '../design-system/components';
import { aiSetupReason } from '../ai-readiness';
import { post } from '../api';
import { readDraft, saveDraft, type ComposerDraft } from '../draft';
import { ConversationComposer } from './conversation';

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
          <History conversation visible={visible} />
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
      />
      <p id="composerReadiness" className="ol-caption">
        {reason ?? blocked ?? 'Enter to send · Shift + Enter for a new line'}
      </p>
    </div>
  );
}
