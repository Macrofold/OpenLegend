import { post } from './api';

type Message = { role: 'you' | 'status' | 'agent'; text: string };
type Conversation = { id: string; title: string; draft: string; messages: Message[] };

/** Local conversation UX. Remote session creation belongs to the server adapter. */
export class WorldAgentPanel {
  private worldId = '';
  private tabs: Conversation[] = [];
  private active = '';
  private pending = new Set<string>();
  private readonly nav: HTMLElement;
  private readonly history: HTMLElement;
  private readonly input: HTMLTextAreaElement;
  private readonly send: HTMLButtonElement;
  constructor(
    private readonly element: HTMLElement,
    private readonly visibility: (open: boolean) => void,
  ) {
    element.innerHTML = `<header><h2>World agent</h2><button type="button" data-new>+ New conversation</button><button type="button" class="icon-button" data-close aria-label="Close world agent">×</button></header><nav class="world-agent-tabs" role="tablist" aria-label="World conversations"></nav><div class="world-agent-history" role="log" aria-live="polite"></div><form><textarea maxlength="2000" rows="3" aria-label="Message to world agent" placeholder="Ask about the world or invent something…"></textarea><button type="submit">Send</button></form><p class="small-note">Conversations saved in this browser. Each conversation uses a separate backend agent session.</p>`;
    this.nav = element.querySelector('nav')!;
    this.history = element.querySelector('[role="log"]')!;
    this.input = element.querySelector('textarea')!;
    this.send = element.querySelector('[type="submit"]')!;
    element.querySelector('[data-new]')!.addEventListener('click', () => this.create());
    element.querySelector('[data-close]')!.addEventListener('click', () => {
      this.visibility(false);
    });
    element.querySelector('form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submit();
    });
    this.input.addEventListener('input', () => {
      const tab = this.current();
      if (tab) {
        tab.draft = this.input.value;
        this.save();
      }
    });
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        void this.submit();
      }
    });
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.visibility(false);
      }
    });
  }
  setWorld(worldId: string): void {
    if (this.worldId === worldId) return;
    this.worldId = worldId;
    this.tabs = [];
    this.active = '';
    this.visibility(false);
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(this.key()) ?? '[]');
      if (Array.isArray(saved))
        this.tabs = saved.filter(
          (tab): tab is Conversation =>
            !!tab &&
            typeof tab.id === 'string' &&
            typeof tab.title === 'string' &&
            typeof tab.draft === 'string' &&
            Array.isArray(tab.messages) &&
            tab.messages.every(
              (m: Message) =>
                m && ['you', 'status', 'agent'].includes(m.role) && typeof m.text === 'string',
            ),
        );
    } catch {
      /* Storage is optional; the current page remains usable. */
    }
    this.active = this.tabs[0]?.id ?? '';
  }
  open(): void {
    if (!this.worldId) return;
    if (!this.tabs.length) this.create();
    this.visibility(true);
    this.render();
    this.input.focus();
  }
  invent(idea: string): void {
    if (!this.worldId) return;
    this.create();
    this.current()!.draft = `Invent this: ${idea}`;
    this.render();
    void this.submit();
  }
  private current(): Conversation | undefined {
    return this.tabs.find((tab) => tab.id === this.active);
  }
  private key(): string {
    return `open-legend:world-agent:${this.worldId}`;
  }
  private save(): void {
    try {
      localStorage.setItem(this.key(), JSON.stringify(this.tabs));
    } catch {
      /* Keep in-memory conversation on quota/privacy errors. */
    }
  }
  private create(): void {
    if (!this.worldId) return;
    const tab = {
      id: crypto.randomUUID(),
      title: `Conversation ${this.tabs.length + 1}`,
      draft: '',
      messages: [],
    };
    this.tabs.push(tab);
    this.active = tab.id;
    this.visibility(true);
    this.save();
    this.render();
    this.input.focus();
  }
  private async submit(): Promise<void> {
    const tab = this.current();
    if (!tab || this.pending.has(tab.id) || !tab.draft.trim()) return;
    const text = tab.draft.trim();
    const worldId = this.worldId;
    tab.messages.push({ role: 'you', text });
    tab.draft = '';
    if (tab.messages.length === 1) tab.title = text.slice(0, 36);
    this.pending.add(tab.id);
    this.save();
    this.render();
    try {
      const response = await post('/api/world-agent/messages', {
        requestId: crypto.randomUUID(),
        conversationId: tab.id,
        worldId,
        text,
      });
      tab.messages.push({ role: response.ok ? 'agent' : 'status', text: response.message });
    } catch {
      tab.messages.push({
        role: 'status',
        text: 'Could not reach the world agent. Delivery is unconfirmed; nothing will be retried automatically.',
      });
    } finally {
      this.pending.delete(tab.id);
      if (worldId === this.worldId && this.tabs.includes(tab)) {
        this.save();
        this.render();
      }
    }
  }
  private render(): void {
    this.nav.replaceChildren();
    for (const tab of this.tabs) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(tab.id === this.active));
      button.textContent = tab.title;
      button.addEventListener('click', () => {
        this.active = tab.id;
        this.render();
        this.input.focus();
      });
      const wrapper = document.createElement('div');
      wrapper.className = 'world-agent-tab';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'icon-button';
      close.textContent = '×';
      close.setAttribute('aria-label', `Close conversation: ${tab.title}`);
      close.addEventListener('click', async () => {
        close.disabled = true;
        try {
          const result = await post('/api/world-agent/close', {
            conversationId: tab.id,
            worldId: this.worldId,
          });
          if (!result.ok) throw new Error(result.message);
          this.tabs = this.tabs.filter((candidate) => candidate.id !== tab.id);
          if (this.active === tab.id) this.active = this.tabs.at(-1)?.id ?? '';
        } catch {
          tab.messages.push({
            role: 'status',
            text: 'Could not confirm agent closure. The tab is retained; check Macrofold before continuing.',
          });
        }
        this.save();
        this.render();
      });
      wrapper.append(button, close);
      this.nav.append(wrapper);
    }
    const tab = this.current();
    this.history.replaceChildren();
    for (const message of tab?.messages ?? []) {
      const entry = document.createElement('p');
      entry.className = `world-message ${message.role}`;
      const label = document.createElement('strong');
      label.textContent =
        message.role === 'you' ? 'You' : message.role === 'agent' ? 'World agent' : 'Status';
      const body = document.createElement('span');
      body.textContent = message.text;
      entry.append(label, body);
      this.history.append(entry);
    }
    if (!tab?.messages.length)
      this.history.textContent =
        'Ask questions about the world, explore an idea, or invent something.';
    this.input.value = tab?.draft ?? '';
    this.input.disabled = !tab;
    this.send.disabled = !tab || this.pending.has(tab.id);
    this.send.textContent = tab && this.pending.has(tab.id) ? 'Sending…' : 'Send';
    this.history.scrollTop = this.history.scrollHeight;
  }
}
