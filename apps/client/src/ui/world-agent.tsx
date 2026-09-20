import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton, Tabs, TabList, Tab, TabPanel } from 'react-aria-components';
import { Button, EmptyState, Icon, IconButton, Tag } from '../design-system/components';
import { post } from '../api';
import { readLocal, writeLocal } from './storage';
type Message = { role: 'you' | 'status' | 'agent'; text: string };
type Conversation = { id: string; title: string; draft: string; messages: Message[] };
const valid = (v: unknown): v is Conversation[] =>
  Array.isArray(v) &&
  v.every(
    (t) =>
      t &&
      typeof t.id === 'string' &&
      typeof t.title === 'string' &&
      typeof t.draft === 'string' &&
      Array.isArray(t.messages) &&
      t.messages.every(
        (m: Message) =>
          m && ['you', 'status', 'agent'].includes(m.role) && typeof m.text === 'string',
      ),
  );
export function WorldAgent({ worldId, invent }: { worldId: string; invent(text: string): void }) {
  const key = `open-legend:world-agent:${worldId}`;
  const [tabs, setTabs] = useState(() => readLocal(key, [], valid));
  const [active, setActive] = useState(() => tabs[0]?.id ?? '');
  const [pending, setPending] = useState<string[]>([]),
    [ended, setEnded] = useState<Conversation | null>(null);
  const [error, setError] = useState('');
  const alive = useRef(true),
    textarea = useRef<HTMLTextAreaElement>(null),
    log = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  useEffect(() => writeLocal(key, tabs), [key, tabs]);
  const tab = tabs.find((t) => t.id === active);
  useEffect(() => {
    if (log.current) log.current.scrollTop = tab?.messages.length ? log.current.scrollHeight : 0;
  }, [active, tab?.messages.length]);
  function create() {
    const t = {
      id: crypto.randomUUID(),
      title: `Conversation ${tabs.length + 1}`,
      draft: '',
      messages: [],
    };
    setTabs((v) => [...v, t]);
    setActive(t.id);
  }
  function update(id: string, fn: (t: Conversation) => Conversation) {
    setTabs((v) => v.map((t) => (t.id === id ? fn(t) : t)));
  }
  async function send() {
    if (!tab || pending.includes(tab.id) || !tab.draft.trim()) return;
    const id = tab.id,
      text = tab.draft.trim();
    update(id, (t) => ({
      ...t,
      title: t.messages.length ? t.title : text.slice(0, 36),
      draft: '',
      messages: [...t.messages, { role: 'you', text }],
    }));
    setPending((v) => [...v, id]);
    try {
      const result = await post('/api/world-agent/messages', {
        requestId: crypto.randomUUID(),
        conversationId: id,
        worldId,
        text,
      });
      if (alive.current)
        update(id, (t) => ({
          ...t,
          messages: [...t.messages, { role: result.ok ? 'agent' : 'status', text: result.message }],
        }));
    } catch {
      if (alive.current)
        update(id, (t) => ({
          ...t,
          messages: [
            ...t.messages,
            {
              role: 'status',
              text: 'Delivery is unconfirmed. Check recent activity before sending again; no automatic retry was made.',
            },
          ],
        }));
    } finally {
      if (alive.current) setPending((v) => v.filter((x) => x !== id));
    }
  }
  async function end(t: Conversation) {
    setError('');
    try {
      const result = await post('/api/world-agent/close', { worldId, conversationId: t.id });
      if (!result.ok) throw new Error(result.message);
      if (!alive.current) return;
      setTabs((v) => v.filter((x) => x.id !== t.id));
      setActive(tabs.find((x) => x.id !== t.id)?.id ?? '');
      setEnded(t);
    } catch (e) {
      setError(String(e));
    }
  }
  function undo() {
    if (!ended) return;
    const restored = {
      ...ended,
      id: crypto.randomUUID(),
      messages: [
        ...ended.messages,
        {
          role: 'status' as const,
          text: 'Transcript restored. Continuing starts a new backend session; the ended session stays closed.',
        },
      ],
    };
    setTabs((v) => [...v, restored]);
    setActive(restored.id);
    setEnded(null);
  }
  return (
    <div className="ol-agent">
      <Tabs
        className="ol-agent-tabs"
        selectedKey={active}
        onSelectionChange={(k) => setActive(String(k))}
      >
        <div className="ol-conversation-tabs">
          <TabList aria-label="World conversations" items={tabs}>
            {(t) => (
              <Tab id={t.id} className="ol-conversation-tab">
                <span>{t.title}</span>
                {pending.includes(t.id) && <span aria-label="Working">•</span>}
                <AriaButton
                  className="ol-ibtn"
                  aria-label={`End conversation: ${t.title}`}
                  onPress={() => void end(t)}
                >
                  <Icon name="ui.close" />
                </AriaButton>
              </Tab>
            )}
          </TabList>
          <IconButton icon="ui.plus" label="New conversation" onPress={create} />
        </div>
        {tabs.map((t) => (
          <TabPanel key={t.id} id={t.id} className="ol-conversation-panel">
            <div
              ref={t.id === active ? log : undefined}
              className="ol-thread"
              role="log"
              aria-live="polite"
            >
              {!t.messages.length && (
                <EmptyState title="What might this world become?">
                  Ask about the clearing, explore a possibility, or discuss an invention.
                </EmptyState>
              )}
              {t.messages.map((m, i) => (
                <div key={i} className={`ol-message ol-message-${m.role}`}>
                  <span className="ol-eyebrow">
                    {m.role === 'you' ? 'You' : m.role === 'agent' ? 'World agent' : 'Status'}
                  </span>
                  <div className="ol-prose">{m.text}</div>
                  {m.role === 'agent' && /\?\s*$/.test(m.text) && (
                    <div className="ol-question-card">
                      <Tag>Question</Tag>
                      <Button size="sm" variant="quiet" onPress={() => textarea.current?.focus()}>
                        Write an answer
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {pending.includes(t.id) && (
                <p role="status" className="ol-meta">
                  The world agent is considering your message…
                </p>
              )}
            </div>
          </TabPanel>
        ))}
      </Tabs>
      {!tabs.length && (
        <EmptyState title="A conversation begins with a question.">
          <Button onPress={create} icon="ui.plus">
            New conversation
          </Button>
        </EmptyState>
      )}
      {ended && (
        <div className="ol-notice">
          Ended “{ended.title}”.{' '}
          <Button size="sm" variant="quiet" onPress={undo}>
            Restore transcript
          </Button>
          <IconButton
            icon="ui.close"
            label="Dismiss ended conversation"
            onPress={() => setEnded(null)}
          />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {tab && (
        <>
          <div className="ol-agent-tools">
            <Button
              size="sm"
              variant="quiet"
              icon="action.invent"
              onPress={() => invent(tab.draft)}
            >
              Invent a tool
            </Button>
            <span className="ol-caption">Discussing an idea does not create it.</span>
          </div>
          <form
            className="ol-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              ref={textarea}
              aria-label="Message to world agent"
              placeholder="Ask about the world or explore an idea…"
              maxLength={2000}
              rows={3}
              value={tab.draft}
              onChange={(e) => update(tab.id, (t) => ({ ...t, draft: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              type="submit"
              icon="ui.send"
              variant="primary"
              busy={pending.includes(tab.id)}
              disabled={!tab.draft.trim()}
            >
              Send
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
