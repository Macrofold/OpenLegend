import type { ActionOption, RecipeView } from '@open-legend/protocol';
import { Inventions } from './inventions';
import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton, Tabs, TabList, Tab, TabPanel } from 'react-aria-components';
import { Button, EmptyState, Icon, IconButton, Tag } from '../design-system/components';
import { post } from '../api';
import { readLocal, writeLocal } from './storage';
import {
  ConversationComposer,
  ConversationMessage,
  ConversationThread,
  type ConversationItem,
} from './conversation';
type Message = {
  id?: string;
  role: 'you' | 'status' | 'agent';
  text: string;
  status?: 'sending' | 'failed';
  failureReason?: string;
  attemptId?: string;
  pendingAttemptId?: string;
  pendingRetryOf?: string;
};
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
export function WorldAgent({
  worldId,
  inventionSeed,
  invent,
  visible,
  recipes,
  command,
  connected,
}: {
  worldId: string;
  inventionSeed: { id: string; text: string } | null;
  invent(text: string): void;
  visible: boolean;
  recipes: RecipeView[];
  command(action: ActionOption): void;
  connected: boolean;
}) {
  const [authoring, setAuthoring] = useState(false);
  useEffect(() => {
    if (inventionSeed) setAuthoring(true);
  }, [inventionSeed]);
  const key = `open-legend:world-agent:${worldId}`;
  const [tabs, setTabs] = useState(() => readLocal(key, [], valid));
  const [active, setActive] = useState(() => tabs[0]?.id ?? '');
  const [pending, setPending] = useState<string[]>([]),
    [ended, setEnded] = useState<Conversation | null>(null);
  const [error, setError] = useState('');
  const sending = useRef(new Set<string>());
  const alive = useRef(true),
    textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  useEffect(() => writeLocal(key, tabs), [key, tabs]);
  const tab = tabs.find((t) => t.id === active);
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
  async function send(retryMessage?: Message) {
    if (!tab || sending.current.has(tab.id) || (!retryMessage && !tab.draft.trim())) return;
    const id = tab.id;
    const text = retryMessage?.text ?? tab.draft.trim();
    const requestId = retryMessage?.pendingAttemptId ?? crypto.randomUUID();
    const retryOf = retryMessage?.pendingAttemptId
      ? retryMessage.pendingRetryOf
      : (retryMessage?.attemptId ?? retryMessage?.id);
    const messageId = retryMessage?.id ?? requestId;
    sending.current.add(id);
    update(id, (t) => ({
      ...t,
      title: t.messages.length ? t.title : text.slice(0, 36),
      draft: retryMessage ? t.draft : '',
      messages: retryMessage
        ? t.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  status: 'sending',
                  pendingAttemptId: requestId,
                  pendingRetryOf: retryOf,
                }
              : message,
          )
        : [
            ...t.messages,
            { id: messageId, role: 'you', text, status: 'sending', pendingAttemptId: requestId },
          ],
    }));
    setPending((v) => [...v, id]);
    try {
      const result = await post('/api/world-agent/messages', {
        mode: 'discuss',
        requestId,
        conversationId: id,
        worldId,
        text,
        ...(retryOf ? { retryOf } : {}),
      });
      if (alive.current)
        update(id, (t) => {
          const messages = t.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  status: result.ok ? undefined : ('failed' as const),
                  failureReason: result.ok ? undefined : result.message,
                  attemptId: result.jobId ?? message.attemptId ?? message.id,
                  pendingAttemptId: !result.ok && !result.jobId ? requestId : undefined,
                  pendingRetryOf: !result.ok && !result.jobId ? retryOf : undefined,
                }
              : message,
          );
          return {
            ...t,
            messages: result.ok
              ? [...messages, { id: `${requestId}:reply`, role: 'agent', text: result.message }]
              : messages,
          };
        });
    } catch (error) {
      if (alive.current)
        update(id, (t) => ({
          ...t,
          messages: t.messages.map((message) =>
            message.id === messageId
              ? { ...message, status: 'failed', failureReason: String(error) }
              : message,
          ),
        }));
    } finally {
      sending.current.delete(id);
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
  const messages: ConversationItem[] = (tab?.messages ?? []).map((message, index) => ({
    id: message.id ?? `${message.role}:${index}`,
    content: (
      <ConversationMessage
        role={message.role}
        label={message.role === 'you' ? 'You' : message.role === 'agent' ? 'World agent' : 'Status'}
        text={message.text}
        failureReason={message.status === 'failed' ? message.failureReason : undefined}
        pending={message.status === 'sending'}
        onRetry={
          message.role === 'you' && message.id && message.status === 'failed'
            ? () => void send(message)
            : undefined
        }
      >
        {message.role === 'agent' && /\?\s*$/.test(message.text) && (
          <div className="ol-question-card">
            <Tag>Question</Tag>
            <Button size="sm" variant="quiet" onPress={() => textarea.current?.focus()}>
              Write an answer
            </Button>
          </div>
        )}
      </ConversationMessage>
    ),
  }));
  return (
    <div className="ol-agent">
      <div className="ol-agent-tools">
        <Button
          size="sm"
          variant={authoring ? 'quiet' : 'primary'}
          onPress={() => setAuthoring(false)}
        >
          Discuss
        </Button>
        <Button
          size="sm"
          variant={authoring ? 'primary' : 'quiet'}
          onPress={() => setAuthoring(true)}
        >
          Invent
        </Button>
      </div>
      {authoring ? (
        <Inventions
          worldId={worldId}
          seed={inventionSeed}
          visible={visible}
          recipes={recipes}
          command={command}
          connected={connected}
        />
      ) : (
        <>
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
                {t.id === active && (
                  <ConversationThread
                    conversationKey={`${worldId}:${t.id}`}
                    items={messages}
                    ariaLabel={t.title}
                    visible={visible}
                    empty={
                      <EmptyState title="What might this world become?">
                        Ask about the clearing, explore a possibility, or discuss an invention.
                      </EmptyState>
                    }
                  />
                )}
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
              <ConversationComposer
                inputRef={textarea}
                ariaLabel="Message to world agent"
                placeholder="Ask about the world or explore an idea…"
                maxLength={2000}
                value={tab.draft}
                onChange={(draft) => update(tab.id, (value) => ({ ...value, draft }))}
                onSubmit={() => send()}
                disabled={pending.includes(tab.id) || !tab.draft.trim()}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
