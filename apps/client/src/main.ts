import { IntelligencePanel } from './intelligence-panel';
import type { GodMindView } from '@open-legend/protocol';
import { PanelDock } from './panel-dock';
import type {
  ActionOption,
  CommandInput,
  EntityView,
  GameView,
  InventoryItemView,
  RecipeView,
  Position,
} from '@open-legend/protocol';
import { getState, post, setWorldPaused, startPresence } from './api';
import { aiSetupReason } from './ai-readiness';
import { readDraft, saveDraft, type ComposerMode } from './draft';
import { playerEntity } from './entity-view';
import { ActionBrowser } from './action-browser';
import { TimeSettings } from './time-settings';
import { WorldAgentPanel } from './world-agent';
import { QuickActions } from './quick-actions';
import { WildernessScene } from './scene';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
const icons = {
  leaf: '<path d="M18 3C8 2 3 6 4 13c1 7 11 7 13 0 1-4 1-7 1-10Z"/><path d="M4 20 14 8M8 15l-1-5M11 12l5 1"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  bag: '<path d="M5 8h14l1 13H4L5 8ZM8 8V6a4 4 0 0 1 8 0v2M8 12v4M16 12v4"/>',
  craft: '<path d="m4 20 9-9M15 3l6 6-3 3-6-6 3-3ZM3 6l3-3 15 15-3 3L3 6Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
  chat: '<path d="M4 4h16v12H9l-5 4V4ZM8 8h8M8 12h5"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  book: '<path d="M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3ZM4 17h16M8 7h8M8 11h5"/>',
  heart: '<path d="M12 20S2 14 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 6-10 12-10 12Z"/>',
  moon: '<path d="M19 16A9 9 0 0 1 8 3a9 9 0 1 0 11 13Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
};
function icon(name: keyof typeof icons): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}
function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}
function formatMoney(value: number): string {
  return `$${value.toFixed(value > 0.01 ? 2 : 4)}`;
}
function uid(): string {
  return crypto.randomUUID();
}
function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
const renderedHtml = new Map<string, string>();
function updateHtml(id: string, html: string): void {
  if (renderedHtml.get(id) === html) return;
  const element = byId(id);
  const focused = element.contains(document.activeElement)
    ? ((document.activeElement as HTMLElement).dataset.action ??
      (document.activeElement as HTMLElement).dataset.entity)
    : undefined;
  element.innerHTML = html;
  renderedHtml.set(id, html);
  if (focused)
    Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.dataset.action === focused || button.dataset.entity === focused)
      ?.focus({ preventScroll: true });
}

app.innerHTML = `
  <main class="game-shell" aria-label="Open Legend wilderness">
    <canvas id="world" aria-label="Wilderness map. Click a person or resource to inspect, right-click for actions, or click empty ground to walk. Use the nearby list for keyboard access." tabindex="0"></canvas>
    <header class="topbar">
      <div class="brand"><span class="brand-mark">${icon('leaf')}</span><div><h1>OPEN LEGEND</h1></div></div>
      <div class="time-control surface"><div class="clock-icon">${icon('sun')}</div><div id="worldClock" class="clock-text">The first clearing<span>Opening your world…</span></div><span class="divider"></span><button id="pause" class="icon-button" title="Pause or resume world" aria-label="Pause world" disabled>${icon('pause')}</button><div id="speeds" class="speed-control" aria-label="Simulation speed"><button data-speed="0.5">0.5×</button><button data-speed="1">1×</button><button data-speed="3">3×</button><button data-speed="8">8×</button></div>
      <div id="timeSettings" class="time-settings"><button type="button" class="icon-button" aria-label="Time settings" title="Time settings" aria-expanded="false" aria-controls="timeSettingsPanel">${icon('settings')}</button>
        <div id="timeSettingsPanel" class="time-settings-panel surface" role="group" aria-label="Time settings" hidden>
          <label class="time-setting"><input type="checkbox" checked disabled aria-describedby="timeSettingsHint">Pause game when hidden</label>
          <p id="timeSettingsHint">Pause when this tab is hidden or loses focus. Turn off to keep playing in the background.</p>
          <p class="time-rate"></p><span class="time-settings-status" role="status" aria-live="polite"></span>
        </div>
      </div></div>
      <div class="top-tools"><button id="aiToggle" class="status-chip" aria-expanded="false"><span class="status-dot"></span><span id="aiLabel">Connecting</span></button><button id="helpToggle" class="icon-button surface" title="Controls and how to play" aria-label="Controls and how to play">${icon('help')}</button></div>
    </header>
    <div id="sceneError" class="scene-error surface" role="alert" hidden><h2>The scene needs a moment.</h2><p id="sceneErrorMessage"></p><button id="retryScene" class="primary-button">Retry the scene</button></div>
    <div id="connection" class="connection-banner" role="status" hidden></div>
    <aside class="survival surface" aria-label="Your survival">
      <div class="eyebrow">THE WAYFARER <span id="saveStatus" title="Waiting for the world">—</span></div>
      <div class="survival-heading"><h2>You</h2><span id="playerState">In the wild</span></div>
      <div id="needs"></div>
    </aside>
    <nav class="icon-rail left-rail" aria-label="Character tools">
      <button class="round-tool" data-panel="packPanel" aria-label="Inventory" aria-expanded="false">${icon('bag')}<span class="icon-label">Inventory</span></button>
      <button class="round-tool" data-panel="makePanel" aria-label="Crafting" aria-expanded="false">${icon('craft')}<span class="icon-label">Crafting</span></button>
      <button class="round-tool" data-panel="characterPanel" aria-label="Character" aria-expanded="false">${icon('heart')}<span class="icon-label">Character</span></button>
    </nav>
    <nav class="icon-rail right-rail" aria-label="World tools">
      <button class="round-tool" data-panel="intelligencePanel" aria-label="Intelligence calls" aria-expanded="false">${icon('spark')}<span class="icon-label">Intelligence calls</span></button>
      <button id="worldAgentToggle" class="round-tool" data-panel="worldAgent" aria-label="World agent" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="10" r="7"/><path d="m8 17-2 4h12l-2-4M10 5l-1 3m7 3-2 2"/></svg><span class="icon-label">World agent</span></button>
      <button class="round-tool" data-panel="fieldPanel" aria-label="In View" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span class="icon-label">In View</span></button>
    </nav>
    <div id="panelDock" class="panel-dock">
      <div class="dock-side dock-left">
        ${[
          ['pack', 'Inventory'],
          ['make', 'Crafting'],
          ['character', 'Character'],
        ]
          .map(
            ([id, title]) =>
              `<section id="${id}Panel" class="dock-panel surface" aria-label="${title}" hidden><header><h2>${title}</h2><button class="icon-button" data-panel-close="${id}Panel" aria-label="Close ${title}">×</button></header><div id="${id}Content" class="panel-content"></div></section>`,
          )
          .join('')}
      </div><div class="dock-spacer"></div><div class="dock-side dock-right">
        <section id="fieldPanel" class="dock-panel surface" aria-label="In View" hidden><header><h2 id="fieldHeading">In View</h2><button class="icon-button" data-panel-close="fieldPanel" aria-label="Close visible panel">×</button></header><div id="fieldContent" class="panel-content"></div></section>
        <section id="intelligencePanel" class="dock-panel surface intelligence-calls" aria-label="Intelligence calls" hidden><header><h2>Intelligence calls</h2><button class="icon-button" data-panel-close="intelligencePanel" aria-label="Close intelligence calls">×</button></header><div class="panel-content"></div></section>
        <section id="worldAgent" class="world-agent dock-panel surface" aria-label="World agent" hidden></section>
      </div>
    </div>
    <div id="selectionLabel" class="selection-label" hidden></div>
    <nav id="quickActions" class="quick-bar" aria-label="Quick actions"></nav>
    <section id="composer" class="composer npc-conversation surface" aria-label="Conversation" hidden><button type="button" class="icon-button npc-close" data-close="composer" aria-label="Close conversation">×</button>
      <div class="composer-top"><div class="composer-tabs" role="tablist" aria-label="Interaction mode"><button id="talkTab" class="active" role="tab" aria-selected="true">${icon('chat')}<span id="talkTitle">Talk to Ada</span></button><button id="inventTab" role="tab" aria-selected="false">${icon('spark')}Invent something</button></div><button id="conversationToggle" class="text-button" aria-expanded="false">Conversation <span id="chatCount">0</span></button></div>
      <div id="conversation" class="conversation" hidden aria-live="polite"></div>
      <div id="requestStatus" class="request-status" role="status"></div><button id="cancelAiRequest" type="button" class="text-button" hidden>Cancel request</button>
      <div id="composerAvailability" class="request-status" role="status" hidden><span id="composerReadiness"></span> <button id="composerSetup" class="text-button" type="button" hidden>Set up AI</button></div>
      <form id="messageForm" class="message-form"><label class="sr-only" for="message">What would you like to say?</label><textarea id="message" rows="1" maxlength="1000" placeholder="Say something. A conversation can change what happens next." autocomplete="off" aria-describedby="composerReadiness composerHint"></textarea><button id="sendMessage" class="send-button" aria-label="Send message" title="Send message">${icon('arrow')}</button></form>
      <div class="composer-bottom"><span id="composerHint">Talk, ask, remember. The world keeps moving.</span><span id="composerShortcut"><kbd>Enter</kbd> send</span></div>
    </section>
    <footer class="bottom-bar"><div class="footer-left"><button id="journalToggle" class="footer-button">${icon('book')}Journal <span id="eventCount">0</span></button><span id="placeLabel">THE FIRST CLEARING</span></div><div class="camera-tools"><span class="camera-hint">Click to walk · Scroll to zoom</span><button id="zoomOut" class="icon-button" title="Zoom out" aria-label="Zoom out">−</button><button id="centerCamera" class="icon-button" title="Find your character" aria-label="Center camera on your character">${icon('compass')}</button><button id="zoomIn" class="icon-button" title="Zoom in" aria-label="Zoom in">+</button></div></footer>
    <aside id="journal" class="journal surface floating-panel" hidden><div class="floating-heading"><div><div class="eyebrow">YOUR WORLD, REMEMBERED</div><h2>Field journal</h2></div><button data-close="journal" class="icon-button" aria-label="Close journal">${icon('close')}</button></div><div id="milestones"></div><div id="journalEvents"></div></aside>
    <aside id="aiPanel" class="ai-panel surface floating-panel" hidden><div class="floating-heading"><div><div class="eyebrow">INTELLIGENCE & ALLOWANCE</div><h2>Behind the world</h2></div><button data-close="aiPanel" class="icon-button" aria-label="Close intelligence panel">${icon('close')}</button></div><div id="aiContent"></div></aside>
    <div id="contextMenu" class="context-menu surface" role="group" aria-labelledby="contextTitle" tabindex="-1" hidden></div>
    <div id="hover" class="hover-label" hidden></div>
    <div id="toast" class="toast" role="status" hidden></div>
    <div id="loading" class="loading-overlay"><div class="loading-emblem">${icon('leaf')}</div><div class="eyebrow">OPEN LEGEND</div><h2>A clearing. A beginning.</h2><p id="loadingMessage">Returning to the wilderness…</p><button id="retry" class="primary-button" hidden>Try again</button></div>
    <dialog id="help" class="help-dialog surface"><div class="floating-heading"><div><div class="eyebrow">LEARN BY LIVING</div><h2>Make your way.</h2></div><button id="helpClose" class="icon-button" aria-label="Close help">${icon('close')}</button></div><p>You and Ada have a little knowledge, a few possessions, and a wilderness full of possibilities. There is no village yet.</p><div class="help-grid"><div><h3>Explore & survive</h3><p>Click empty ground to walk. Right-click a person, animal or resource to open its actions (Control-click also works on a Mac). Hold the left mouse button and drag to pan the camera. Click to inspect it. The Nearby tab offers the same controls with a keyboard.</p></div><div><h3>Talk & invent</h3><p>Talk to Ada about what is happening. Under Invent, describe a useful tool and its materials. An available AI service can propose a supported recipe; the world checks it before you can make it.</p></div><div><h3>Make & use</h3><p>Gather and prepare materials, then craft an admitted recipe. Equip a launcher in Possessions, carry compatible ammunition, and select an animal to hunt. Harvest remains, cook raw meat at the fire, then eat.</p></div><div><h3>Take your time</h3><p>Pause to inspect, or choose 0.5×, 1×, 3× or 8×. At 1×, each real second advances one game minute. Time settings let you pause when the tab loses focus or keep it running in the background. Manual pause stays paused until you resume.</p></div></div><div class="control-list"><span><kbd>Click</kbd> Select / walk</span><span><kbd>Right / Control-click</kbd> Actions</span><span><kbd>Scroll</kbd> Zoom</span><span><kbd>Left drag</kbd> Pan</span><span><kbd>Esc</kbd> Close / cancel action</span></div><p class="small-note">Original procedural artwork · PlayCanvas · First playable development build. AI availability and actual allowance are shown in the top-right corner.</p></dialog>
  </main>`;

let view: GameView | null = null;
let scene: WildernessScene | null = null;
let sceneStartupFailed = false;
let selectedId: string | null = null;

const initialDraft = readDraft();
let composerMode: ComposerMode = 'chat';
let conversationNpcId: string | null = null;
let conversationOpen = false;
let submitting = false;
let pauseControlPending = false;
let connected = false;
let firstConnection = true;
let actions = new Map<string, ActionOption>();
let source: EventSource | null = null;
let stopPresence: (() => void) | null = null;
let toastTimeout = 0;
let pollTimeout = 0;
let contextPoint: { x: number; y: number } | null = null;
const messageInput = byId<HTMLTextAreaElement>('message');
messageInput.value = initialDraft.text;
const timeSettings = new TimeSettings(byId('timeSettings'), (message) => toast(message, true));
const dock = new PanelDock(byId('panelDock'));
const intelligencePanel = new IntelligencePanel(byId('intelligencePanel'));
const worldAgents = new WorldAgentPanel(byId('worldAgent'), (open) => dock.set('worldAgent', open));
const quickActions = new QuickActions(
  byId('quickActions'),
  (action) => {
    void command(action.command);
  },
  (id) => {
    conversationNpcId = id;
    setComposerMode('chat');
  },
);

const actionBrowser = new ActionBrowser(byId('contextMenu'), {
  command: (action) => {
    if (action.intent.kind === 'command') void command(action.intent.command);
  },
  compose: (mode, text, npcId) => {
    if (npcId && view)
      chooseEntity(
        view.entities.find((entity) => entity.id === npcId) ?? null,
        undefined,
        undefined,
        false,
      );
    if (mode === 'invention') {
      if (text) worldAgents.invent(text);
      else worldAgents.open();
      return;
    }
    conversationNpcId = npcId ?? null;
    setComposerMode('chat');
  },
  error: (message) => toast(message, true),
  closed: () => {
    contextPoint = null;
  },
});
if (messageInput.value) messageInput.style.height = `${Math.min(100, messageInput.scrollHeight)}px`;

function toast(message: string, error = false): void {
  clearTimeout(toastTimeout);
  const element = byId('toast');
  element.textContent = message;
  element.classList.toggle('error', error);
  element.hidden = false;
  toastTimeout = window.setTimeout(
    () => {
      element.hidden = true;
    },
    error ? 7500 : 4500,
  );
}
function actionButtons(options: ActionOption[], className = ''): string {
  return options
    .map(
      (option) =>
        `<button class="action-button ${className}" data-action="${escape(option.id)}" ${!option.enabled ? 'disabled' : ''} title="${escape(option.reason ?? option.label)}">${escape(option.label)}${!option.enabled && option.reason ? `<small>${escape(option.reason)}</small>` : ''}</button>`,
    )
    .join('');
}
function selectedEntity(): EntityView | undefined {
  return view?.player.id === selectedId
    ? playerEntity(view)
    : view?.entities.find((entity) => entity.id === selectedId);
}
function npc(): EntityView | undefined {
  if (conversationNpcId) return view?.entities.find((entity) => entity.id === conversationNpcId);
  const selected = selectedEntity();
  return selected?.kind === 'actor' && selected.id !== view?.player.id
    ? selected
    : view?.entities.find((entity) => entity.kind === 'actor' && entity.id !== view?.player.id);
}
function nameForKind(entity: EntityView): string {
  return entity.kind === 'actor'
    ? entity.id === view?.player.id
      ? 'Your character'
      : 'Fellow wayfarer'
    : {
        animal: 'Wildlife',
        resource: 'Gathering place',
        remains: 'Animal remains',
        station: 'Camp & shelter',
      }[entity.kind];
}
function itemGlyph(item: InventoryItemView): string {
  return icon(
    item.category === 'food'
      ? 'leaf'
      : item.category === 'equipment' || item.category === 'ammunition'
        ? 'craft'
        : 'bag',
  );
}
function entityGlyph(entity: EntityView): string {
  return icon(
    entity.kind === 'actor'
      ? 'chat'
      : entity.kind === 'resource'
        ? 'leaf'
        : entity.kind === 'station'
          ? 'sun'
          : 'compass',
  );
}
function actionReason(): string | null {
  if (!view) return 'Opening world';
  if (!connected) return 'Reconnecting to the world';
  if (!view.player.alive) return 'Your character has died';
  if (view.clock.paused)
    return `World paused${view.clock.pauseReason === 'away' ? ' while away' : ''}. Resume to act.`;
  return null;
}
function setComposerMode(mode: ComposerMode, focus = true): void {
  if (mode === 'invention') {
    worldAgents.open();
    return;
  }
  byId('composer').hidden = false;
  composerMode = mode;
  saveDraft({ text: messageInput.value, mode });
  byId('talkTab').classList.toggle('active', mode === 'chat');
  byId('inventTab').classList.remove('active');
  byId('talkTab').setAttribute('aria-selected', String(mode === 'chat'));
  byId('inventTab').setAttribute('aria-selected', 'false');
  messageInput.placeholder =
    mode === 'chat'
      ? 'Say something. A conversation can change what happens next.'
      : 'I want to make a sling from cord and prepared fibers…';
  messageInput.setAttribute(
    'aria-label',
    mode === 'chat' ? 'Message to the nearby person' : 'Describe something to invent',
  );
  renderComposer();
  if (focus) messageInput.focus();
}
function chooseEntity(
  entity: EntityView | null,
  point?: { x: number; y: number },
  ground?: Position,
  inspect = !point,
): void {
  selectedId = entity?.id ?? null;
  scene?.select(selectedId);
  contextPoint = point ?? null;
  byId('hover').hidden = true;
  if (entity) {
    if (inspect && byId('fieldPanel').hidden) dock.set('fieldPanel', true);
  }
  renderPanel();
  renderContext();
  renderComposer();
  if (point) {
    actionBrowser.open(
      entity ? { targetId: entity.id } : ground ? { position: ground } : {},
      point,
      entity?.name ?? 'Actions here',
    );
  }
}
let inspectedMind: GodMindView | null = null;
let mindError = '';
let mindRequest = 0;
let mindCheckedAt = 0;
function mindMarkup(): string {
  if (!inspectedMind) return `<p class="small-note">${escape(mindError)}</p>`;
  const mind = inspectedMind;
  return `<h3>${escape(mind.name)} · Inner world</h3><details><summary>Accepted About me · revision ${mind.revision}</summary><pre>${escape(mind.acceptedText ?? 'Unavailable')}</pre></details><details><summary>Experiences, obligations and learned skills</summary><pre>${escape(JSON.stringify({ experiences: mind.experiences, commitments: mind.commitments, skills: mind.skills, rest: mind.rest }, null, 2))}</pre></details><h3>Thoughts</h3>${
    mind.thoughts
      .slice()
      .reverse()
      .map(
        (t) => `<p><small>${escape(t.kind)} · ${escape(t.source)}</small><br>${escape(t.text)}</p>`,
      )
      .join('') || '<p class="small-note">No thoughts recorded yet.</p>'
  }${mind.legacyThoughts?.length ? `<details><summary>Legacy thought audit</summary><pre>${escape(JSON.stringify(mind.legacyThoughts, null, 2))}</pre></details>` : ''}${mind.documents
    .map(
      (d) =>
        `<details><summary>${escape(d.title)}</summary><p style="white-space:pre-wrap">${escape(d.text)}</p>${mind.records
          .filter((r) => r.documentId === d.id)
          .map(
            (r) =>
              `<p class="small-note">${escape(r.kind)} · ${escape(r.source)}${r.subjectId ? ' → ' + escape(r.subjectId) : ''} · confidence ${r.confidence}${r.trust !== null ? ' · trust ' + r.trust : ''}</p>`,
          )
          .join('')}</details>`,
    )
    .join('')}`;
}
function renderPanel(): void {
  if (!view) return;
  for (const tab of ['field', 'pack', 'make'] as const) renderPanelContent(tab);
  updateHtml(
    'characterContent',
    `<h3>${escape(view.player.name)}</h3>${[
      ['Health', view.player.health],
      ['Food', 100 - view.player.hunger],
      ['Energy', view.player.energy],
    ]
      .map(
        ([label, value]) =>
          `<div class="detail-pair"><span>${label}</span><strong>${Math.round(Number(value))} / 100</strong></div>`,
      )
      .join(
        '',
      )}<h3>Traits</h3><p class="small-note">Traits and attributes are not recorded yet.</p><h3>God inspection</h3><div class="inspect-actions">${[view.player, ...view.entities.filter((e) => e.kind === 'actor')].map((e) => `<button data-inspect-mind="${escape(e.id)}">${escape(e.name)}</button>`).join('')}</div>${mindMarkup()}`,
  );
}
function renderPanelContent(panelTab: 'field' | 'pack' | 'make'): void {
  if (!view) return;
  const contentId = `${panelTab}Content`;
  let html = '';
  if (panelTab === 'field') {
    const entity = selectedEntity();
    byId('fieldHeading').textContent = entity ? entity.name : 'In View';
    if (entity) {
      html += `<button data-deselect class="text-button" aria-label="Back to In View">← In View</button><div class="eyebrow">${escape(nameForKind(entity))}</div><p class="entity-status">${escape(entity.status)}</p>`;
      if (entity.quantity !== undefined)
        html += `<div class="detail-pair"><span>Available to gather</span><strong>${entity.quantity}</strong></div>`;
      if (entity.health !== undefined)
        html += `<div class="detail-pair"><span>Health</span><strong>${Math.round(entity.health)}</strong></div>`;
      html += `<div class="inspect-actions">${actionButtons(entity.actions)}</div>`;
      if (entity.kind === 'actor')
        html += `<button data-inspect-mind="${escape(entity.id)}">Thoughts and inner world</button>`;
      if (entity.kind === 'actor' && entity.id !== view.player.id)
        html += `<button class="primary-button talk-to" data-talk>${icon('chat')} Talk to ${escape(entity.name)}</button>`;
      if (entity.actions.length === 0 && entity.kind !== 'actor')
        html += '<p class="small-note">No available interaction here right now.</p>';
    } else {
      html += `<div class="nearby-list">`;
      const sorted = [...view.entities].sort(
        (a, b) => (a.kind === 'actor' ? -1 : 0) - (b.kind === 'actor' ? -1 : 0),
      );
      for (const entity of sorted)
        html += `<button class="nearby-row ${entity.id === selectedId ? 'selected' : ''}" data-entity="${escape(entity.id)}"><span class="entity-icon ${entity.kind}">${entityGlyph(entity)}</span><span><strong>${escape(entity.name)}</strong><small>${escape(entity.status)}</small></span><span class="row-chevron">›</span></button>`;
      html += '</div>';
    }
  } else if (panelTab === 'pack') {
    html += `<div class="inventory-list">`;
    const items = [...view.player.inventory].sort((a, b) => a.category.localeCompare(b.category));
    for (const item of items)
      html += `<details data-inventory-item="${escape(item.id)}" class="item-card" ${item.equipped ? 'open' : ''}><summary><span class="item-icon ${item.category}">${itemGlyph(item)}</span><span><strong>${escape(item.name)}</strong><small>${item.equipped ? 'Equipped · ' : ''}${escape(item.category)}</small></span><span class="quantity">${item.quantity}</span></summary><div class="item-details"><p>${escape(item.description)}</p><div class="tag-row">${item.tags.map((tag) => `<span>${escape(tag)}</span>`).join('')}</div><div class="inspect-actions">${actionButtons(item.actions)}</div></div></details>`;
    if (!items.length)
      html += '<div class="empty-state">Your hands are empty. Gather something useful.</div>';
    html += '</div>';
  } else {
    html += '';
    const prep = view.player.actions.filter((action) => action.command.type === 'prepare');
    if (prep.length)
      html += `<section class="preparation"><h3>Prepare materials</h3><p class="small-note">Turn suitable plant fibers into useful bindings.</p><div class="inspect-actions">${actionButtons(prep)}</div></section>`;
    html += `<div class="list-heading"><h3>Known recipes</h3><span>${view.recipes.length}</span></div>`;
    for (const recipe of view.recipes) html += recipeCard(recipe);
    if (!view.recipes.length)
      html +=
        '<div class="empty-state"><span class="empty-symbol">✧</span><h3>Nothing invented yet.</h3><p>Describe a tool you need. If its method fits what this world can do, the idea may become a recipe.</p><button data-invent class="outline-button">Invent a tool</button></div>';
  }
  // Preserve expanded inventory cards across ordinary state updates.
  const openItems = new Set(
    Array.from(byId(contentId).querySelectorAll('details[open]')).map(
      (element) => element.querySelector('strong')?.textContent,
    ),
  );
  updateHtml(contentId, html);
  if (panelTab === 'pack')
    byId(contentId)
      .querySelectorAll('details')
      .forEach((element) => {
        if (openItems.has(element.querySelector('strong')?.textContent)) element.open = true;
      });
}
function recipeCard(recipe: RecipeView): string {
  return `<article data-recipe="${escape(recipe.id)}" class="recipe-card"><div class="recipe-heading"><span>${icon('craft')}</span><div><h3>${escape(recipe.name)}</h3><small>${escape(recipe.family)} · ${Math.round(recipe.workSeconds)}s of world time</small></div></div><p>${escape(recipe.description)}</p><ul class="ingredient-list">${recipe.ingredients.map((item) => `<li class="${item.available < item.quantity ? 'missing' : ''}"><span>${escape(item.name)}<small>${escape(item.role)}</small></span><strong>${item.available} / ${item.quantity}</strong></li>`).join('')}</ul><div class="inspect-actions">${actionButtons(recipe.actions)}</div><div class="recipe-provenance">${escape(recipe.provenance)}</div></article>`;
}
function renderComposer(): void {
  if (!view) return;
  const person = npc();
  byId('talkTitle').textContent = person ? `Talk to ${person.name}` : 'Conversation';
  byId('chatCount').textContent = String(view.conversation.length);
  const conversation = byId('conversation');
  const nearBottom =
    conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 40;
  updateHtml(
    'conversation',
    view.conversation.length
      ? view.conversation
          .map(
            (message) =>
              `<div class="chat-message ${message.speakerId === view!.player.id ? 'you' : ''}"><strong>${escape(message.speaker)}</strong><p>${escape(message.text)}</p>${message.replyStatus === 'cancelled' ? '<small class="chat-reply-status">Cancelled</small>' : message.replyStatus === 'failed' || message.replyStatus === 'stale' ? '<small class="chat-reply-status">Couldn’t get a reply</small>' : ''}</div>`,
          )
          .join('')
      : '<p class="empty-conversation">No conversation yet. Your first words are up to you.</p>',
  );
  if (nearBottom) conversation.scrollTop = conversation.scrollHeight;
  conversation.hidden = !conversationOpen;
  const pending = view.ai.jobs.filter((job) =>
    ['queued', 'judging', 'generating'].includes(job.status),
  );
  const interactivePending = pending.filter((job) => job.kind !== 'thought');
  const active = interactivePending[0] ?? pending[0];
  const cancelButton = byId<HTMLButtonElement>('cancelAiRequest');
  cancelButton.hidden = !active;
  cancelButton.dataset.jobId = active?.id ?? '';
  cancelButton.disabled = active?.message === 'Cancelling request…';
  cancelButton.textContent =
    active?.kind === 'thought' ? 'Cancel background thought' : 'Cancel request';
  const setupReason = aiSetupReason(view.ai);
  const reason =
    actionReason() ??
    (composerMode === 'chat' && !person?.canTalk ? 'Move within hearing range to talk.' : null);
  const status =
    (active?.kind === 'thought'
      ? 'Ada is thinking in the background. You can still send a message.'
      : active?.message) ?? '';
  byId('requestStatus').textContent = status;
  byId('requestStatus').classList.toggle('busy', pending.length > 0);
  byId('requestStatus').hidden = !status;
  const availability = setupReason ?? reason;
  byId('composerReadiness').textContent = availability ?? '';
  byId('composerAvailability').hidden = !availability;
  byId('composerSetup').hidden = !setupReason;
  const button = byId<HTMLButtonElement>('sendMessage');
  // Setup is a read-only action, so it remains reachable even while the world is paused.
  button.disabled = !setupReason && (submitting || !!reason || interactivePending.length > 0);
  button.title = setupReason
    ? 'Set up AI'
    : (reason ??
      (interactivePending.length
        ? 'Your request is in progress'
        : composerMode === 'chat'
          ? 'Send message'
          : 'Propose invention'));
  button.setAttribute('aria-label', setupReason ? 'Set up AI for this message' : button.title);
  button.innerHTML = icon(setupReason ? 'help' : 'arrow');
  updateHtml('composerShortcut', `<kbd>Enter</kbd> ${setupReason ? 'AI setup' : 'send'}`);
  const hint = setupReason
    ? `${view.clock.paused ? 'The world is also paused. ' : ''}You can keep writing your draft.`
    : view.ai.mode === 'fixture'
      ? 'Fixture mode — these responses are test data.'
      : reason
        ? 'You can keep writing your draft.'
        : composerMode === 'invention'
          ? 'A proposal must pass the world’s rules before it becomes a recipe.'
          : 'Talk, ask, remember. The world keeps moving.';
  byId('composerHint').textContent = hint;
}
function renderContext(): void {
  if (!contextPoint) actionBrowser.close();
  if (view) actionBrowser.update(view, connected);
}
function render(): void {
  if (!view) return;
  actions = new Map(
    [
      ...view.player.actions,
      ...view.entities.flatMap((entity) => entity.actions),
      ...view.player.inventory.flatMap((item) => item.actions),
      ...view.recipes.flatMap((recipe) => recipe.actions),
    ].map((action) => [action.id, action]),
  );
  timeSettings.update(view, connected);
  const hour = Math.floor(view.clock.hour) % 24;
  const minutes = Math.floor((view.clock.hour % 1) * 60);
  updateHtml(
    'worldClock',
    `Day ${view.clock.day} <span class="clock-hour">${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}</span><span>${view.clock.paused ? (view.clock.pauseReason === 'manual' ? 'Paused · take your time' : view.clock.pauseReason === 'storage' ? 'Paused · save needs attention' : 'Paused while away') : 'Time in the wilderness'}</span>`,
  );
  const pause = byId<HTMLButtonElement>('pause');
  pause.disabled = !connected || pauseControlPending || view.clock.pauseReason === 'storage';
  pause.innerHTML = icon(view.clock.paused ? 'play' : 'pause');
  pause.setAttribute('aria-label', view.clock.paused ? 'Resume world' : 'Pause world');
  pause.title = view.clock.paused ? 'Resume world' : 'Pause world';
  document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.speed) === view!.clock.speed);
    button.disabled = !connected;
    button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === view!.clock.speed));
  });
  const meters: Array<[keyof typeof icons, string, number, string, string]> = [
    ['heart', 'Health', view.player.health, 'health', `${Math.round(view.player.health)}%`],
    ['leaf', 'Food', 100 - view.player.hunger, 'food', `${Math.round(100 - view.player.hunger)}%`],
    ['moon', 'Energy', view.player.energy, 'energy', `${Math.round(view.player.energy)}%`],
  ];
  updateHtml(
    'needs',
    meters
      .map(
        ([glyph, name, value, color, text]) =>
          `<div class="need"><span class="need-label">${icon(glyph)}${name}</span><div class="meter ${color} ${value < 25 ? 'low' : ''}" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div><span class="need-value">${text}</span></div>`,
      )
      .join(''),
  );
  const action = view.player.action;
  byId('playerState').textContent = !view.player.alive
    ? 'Life has ended'
    : action
      ? 'At work'
      : view.clock.paused
        ? 'At a standstill'
        : 'In the wild';
  quickActions.update(view, connected);
  worldAgents.setWorld(view.worldId);
  intelligencePanel.setWorld(view.worldId);
  const saved = byId('saveStatus');
  saved.textContent = view.persistence.status === 'saved' ? 'SAVED' : 'SAVE ERROR';
  saved.title = view.persistence.message;
  saved.classList.toggle('error-text', view.persistence.status === 'error');
  const ai = view.ai;
  byId('aiLabel').textContent =
    ai.mode === 'fixture'
      ? 'Fixture mode'
      : aiSetupReason(ai)
        ? ai.jevConfigured && ai.llmConfigured
          ? 'AI needs allowance'
          : 'AI needs setup'
        : ai.mode === 'live'
          ? 'AI connected'
          : ai.mode === 'degraded'
            ? 'Recent AI error'
            : 'AI not configured';
  byId('aiToggle').dataset.mode = ai.mode;
  renderPanel();
  renderComposer();
  renderContext();
  updateHtml(
    'milestones',
    `<div class="milestone-heading">A possible beginning</div><ol class="milestone-list">${view.milestones.map((milestone) => `<li class="${milestone.done ? 'done' : ''}"><span>${milestone.done ? icon('check') : '○'}</span>${escape(milestone.label)}</li>`).join('')}</ol>`,
  );
  const events = [...view.events].reverse();
  updateHtml(
    'journalEvents',
    events.length
      ? events
          .map(
            (event) =>
              `<article class="journal-event"><time>${formatWorldTime(event.time)}</time><p>${escape(event.text)}</p></article>`,
          )
          .join('')
      : '<p class="small-note">Your story is still unwritten. What happens here will appear in this journal.</p>',
  );
  byId('eventCount').textContent = String(view.events.length);
  const budget = ai.budget,
    used = budget.spentUsd + budget.reservedUsd;
  updateHtml(
    'aiContent',
    `<div class="ai-mode ${ai.mode}"><span class="status-dot"></span>${ai.mode === 'live' ? 'Live intelligence' : ai.mode === 'fixture' ? 'Test fixtures — not live AI' : ai.mode === 'degraded' ? 'Latest AI request failed' : 'Waiting for configuration'}</div><p>${escape(ai.message)}</p><div class="provider-row"><span>Language model</span><strong>${ai.llmConfigured ? 'Configured' : 'Not configured'}</strong></div><div class="provider-row"><span>Jev</span><strong>${ai.jevConfigured ? 'Configured' : 'Not configured'}</strong></div>${
      aiSetupReason(ai)
        ? '<div class="section-rule"></div><h3>Enable Talk & invention</h3><p class="small-note">On the computer running Open Legend, open the project’s <code>.env</code> file. Add Jev’s <code>TYPESAFE_API_KEY</code> and the language model’s <code>OPENAI_API_KEY</code>. Choose a nonzero <code>AI_BUDGET_USD</code> within your intended spending limit, then restart the local server and refresh this page. Your draft stays here while you review setup.</p>'
        : ''
    }<div class="section-rule"></div><h3>World allowance</h3><div class="allowance"><strong>${formatMoney(Math.max(0, budget.limitUsd - used))}</strong><span>remaining of ${formatMoney(budget.limitUsd)}</span></div><div class="budget-track"><i style="width:${budget.limitUsd > 0 ? Math.min(100, (used / budget.limitUsd) * 100) : 0}%"></i></div><div class="provider-row"><span>Spent${budget.estimated ? ' · estimated' : ''}</span><strong>${formatMoney(budget.spentUsd)}</strong></div><div class="provider-row"><span>Reserved for pending work</span><strong>${formatMoney(budget.reservedUsd)}</strong></div><p class="small-note">Acceleration shares the same allowance. Leaving the world stops new autonomous work; a request already sent can still incur usage.</p><details class="diagnostics"><summary>Execution details</summary><p>${ai.usage.llmCalls} language model calls · ${ai.usage.jevCalls} Jev calls<br>${ai.usage.inputTokens} input / ${ai.usage.outputTokens} output tokens<br>Last latency: ${(ai.usage.lastLatencyMs / 1000).toFixed(1)}s</p></details>${
      ai.jobs.length
        ? `<h3 class="jobs-heading">Recent work</h3><div class="job-list">${[...ai.jobs]
            .reverse()
            .slice(0, 5)
            .map(
              (job) =>
                `<div><span class="job-state ${job.status}">${escape(job.status)}</span><strong>${escape(job.kind)}</strong><p>${escape(job.message)}</p></div>`,
            )
            .join('')}</div>`
        : ''
    }`,
  );
}
function formatWorldTime(seconds: number): string {
  const day = Math.floor(seconds / 86400) + 1;
  const hour = (8 + Math.floor(seconds / 3600)) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  return `Day ${day} · ${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
async function command(command: CommandInput): Promise<void> {
  const reason = actionReason();
  if (reason && command.type !== 'recover') {
    toast(reason);
    return;
  }
  contextPoint = null;
  renderContext();
  try {
    const result = await post('/api/command', { commandId: uid(), command });
    // Ongoing work is already shown above its subject; avoid technical start toasts.
    if (!result.ok || result.code !== 'accepted') toast(result.message, !result.ok);
  } catch (error) {
    toast(
      `${error instanceof Error ? error.message : 'Connection failed.'} Check the journal before repeating an action.`,
      true,
    );
  }
}
function setConnection(ok: boolean): void {
  connected = ok;
  const element = byId('connection');
  element.hidden = ok;
  element.textContent = ok ? '' : 'Connection interrupted. Reconnecting to your saved world…';
  if (view) render();
}
function acceptState(next: GameView): void {
  if (view && next.worldId === view.worldId && next.revision < view.revision) return;
  if (view && next.worldId !== view.worldId) {
    inspectedMind = null;
    mindError = '';
    mindRequest++;
  }
  view = next;
  intelligencePanel.setAccess(next.godMode !== false);
  if (next.godMode === false) {
    inspectedMind = null;
    mindRequest++;
  }
  if (inspectedMind && !byId('characterPanel').hidden && Date.now() - mindCheckedAt > 2000) {
    mindCheckedAt = Date.now();
    const request = ++mindRequest;
    const worldId = next.worldId;
    void post<{ ok: boolean; mind?: GodMindView }>('/api/god/mind', {
      actorId: inspectedMind.actorId,
    })
      .then((result) => {
        if (request !== mindRequest || worldId !== view?.worldId) return;
        inspectedMind = result.ok ? (result.mind ?? null) : null;
        renderPanel();
      })
      .catch(() => {
        if (request === mindRequest) {
          inspectedMind = null;
          renderPanel();
        }
      });
  }
  if (!sceneStartupFailed) {
    try {
      if (!scene) {
        scene = new WildernessScene(byId<HTMLCanvasElement>('world'), {
          select: chooseEntity,
          move: (position) => {
            void command({ type: 'move', position });
          },
          hover: (entity, point) => {
            const element = byId('hover');
            element.hidden = !entity || !!contextPoint;
            if (entity) {
              element.textContent = `${entity.name}${entity.quantity !== undefined ? ` · ${entity.quantity} available` : ''}`;
              element.style.left = `${Math.min(point.x + 15, window.innerWidth - 220)}px`;
              element.style.top = `${point.y + 18}px`;
            }
          },
        });
      }
      scene.setView(next);
      byId('sceneError').hidden = true;
    } catch (error) {
      sceneStartupFailed = true;
      scene?.destroy();
      scene = null;
      byId<HTMLCanvasElement>('world').dataset.ready = 'false';
      byId('sceneErrorMessage').textContent =
        `${error instanceof Error ? error.message : 'WebGL unavailable'}. The Nearby list still provides world interactions.`;
      byId('sceneError').hidden = false;
      toast(
        `The 3D scene could not start: ${error instanceof Error ? error.message : 'WebGL unavailable'}. The Nearby list still provides all interactions.`,
        true,
      );
    }
  }
  byId('loading').hidden = true;
  render();
}
async function connect(): Promise<void> {
  byId('retry').hidden = true;
  try {
    const initial = await getState();
    setConnection(true);
    acceptState(initial);
    if (firstConnection) {
      stopPresence = startPresence();
      firstConnection = false;
    }
    source?.close();
    source = new EventSource('/api/events');
    source.addEventListener('open', () => {
      clearTimeout(pollTimeout);
      setConnection(true);
    });
    source.addEventListener('state', (event) => {
      try {
        acceptState(JSON.parse((event as MessageEvent<string>).data) as GameView);
      } catch {
        toast('A world update could not be read. Reconnecting…', true);
      }
    });
    source.addEventListener('error', () => {
      setConnection(false);
      clearTimeout(pollTimeout);
      pollTimeout = window.setTimeout(() => {
        void connect();
      }, 6000);
    });
  } catch (error) {
    setConnection(false);
    byId('loadingMessage').textContent =
      error instanceof Error ? error.message : 'Your world is unavailable.';
    byId('retry').hidden = false;
  }
}

app.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('button');
  if (!target) return;
  if (target.dataset.action) {
    const option = actions.get(target.dataset.action);
    if (option?.enabled) void command(option.command);
  }
  if (target.dataset.entity) {
    const entity = view?.entities.find((item) => item.id === target.dataset.entity);
    if (entity) chooseEntity(entity);
  }
  if (target.dataset.inspectMind) {
    const request = ++mindRequest;
    const worldId = view?.worldId;
    const actorId = target.dataset.inspectMind;
    dock.set('characterPanel', true);
    void post<{ ok: boolean; message?: string; mind?: GodMindView }>('/api/god/mind', { actorId })
      .then((result) => {
        if (request !== mindRequest || worldId !== view?.worldId) return;
        inspectedMind = result.mind ?? null;
        mindError = result.message ?? '';
        renderPanel();
      })
      .catch(() => {
        if (request === mindRequest) {
          inspectedMind = null;
          mindError = 'Could not load private mind.';
          renderPanel();
        }
      });
  }
  if (target.hasAttribute('data-deselect')) chooseEntity(null);
  if (target.dataset.panel) {
    if (target.dataset.panel === 'intelligencePanel') void intelligencePanel.refresh();
    if (target.dataset.panel === 'worldAgent' && byId('worldAgent').hidden) worldAgents.open();
    else dock.toggle(target.dataset.panel);
  }
  if (target.dataset.panelClose) dock.set(target.dataset.panelClose, false);
  if (target.hasAttribute('data-talk')) {
    conversationNpcId = selectedEntity()?.id ?? null;
    setComposerMode('chat');
    contextPoint = null;
    renderContext();
  }
  if (target.hasAttribute('data-invent')) setComposerMode('invention');
  if (target.dataset.close) {
    byId(target.dataset.close).hidden = true;
    if (target.dataset.close === 'aiPanel') byId('aiToggle').setAttribute('aria-expanded', 'false');
  }
  if (target.dataset.speed)
    void post('/api/control', { speed: Number(target.dataset.speed) })
      .then((result) => {
        if (!result.ok) toast(result.message, true);
      })
      .catch((error) => toast(String(error), true));
});
app.addEventListener('contextmenu', (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-entity]');
  if (!row) {
    const card = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-inventory-item], [data-recipe]',
    );
    if (card) {
      event.preventDefault();
      chooseEntity(null, { x: event.clientX, y: event.clientY });
    }
    return;
  }
  const entity = view?.entities.find((item) => item.id === row.dataset.entity);
  if (!entity) return;
  event.preventDefault();
  const rect = row.getBoundingClientRect();
  chooseEntity(
    entity,
    event.clientX || event.clientY
      ? { x: event.clientX, y: event.clientY }
      : { x: rect.left, y: rect.bottom },
  );
});
window.addEventListener(
  'pointerdown',
  (event) => {
    if (contextPoint && !actionBrowser.contains(event.target as Node)) {
      contextPoint = null;
      renderContext();
      // Consume a map dismissal before the canvas starts its click/drag gesture.
      // Pointer-up then has no matching press, so it cannot select or walk.
      if (event.button === 0 && event.target === byId('world')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  },
  { capture: true },
);
byId('pause').addEventListener('click', () => {
  if (!view || pauseControlPending) return;
  pauseControlPending = true;
  const paused = !view.clock.paused;
  render();
  void setWorldPaused(paused)
    .then(async (result) => {
      if (!result.ok) toast(result.message, true);
      // A successful control should be visible immediately, even if SSE is delayed.
      acceptState(await getState());
    })
    .catch((error) => toast(String(error), true))
    .finally(() => {
      pauseControlPending = false;
      render();
    });
});
byId('composer').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    byId('composer').hidden = true;
  }
});
byId('talkTab').addEventListener('click', () => setComposerMode('chat'));
byId('inventTab').addEventListener('click', () => setComposerMode('invention'));
byId('conversationToggle').addEventListener('click', () => {
  conversationOpen = !conversationOpen;
  byId('conversationToggle').setAttribute('aria-expanded', String(conversationOpen));
  renderComposer();
  if (conversationOpen) byId('conversation').scrollTop = byId('conversation').scrollHeight;
});
byId('journalToggle').addEventListener('click', () => {
  byId('journal').hidden = !byId('journal').hidden;
});
byId('aiToggle').addEventListener('click', () => {
  byId('aiPanel').hidden = !byId('aiPanel').hidden;
  byId('aiToggle').setAttribute('aria-expanded', String(!byId('aiPanel').hidden));
});
function openAiSetup(): void {
  byId('aiPanel').hidden = false;
  byId('aiToggle').setAttribute('aria-expanded', 'true');
  byId('aiPanel').querySelector<HTMLButtonElement>('[data-close]')?.focus();
}
byId('composerSetup').addEventListener('click', openAiSetup);
byId('helpToggle').addEventListener('click', () => byId<HTMLDialogElement>('help').showModal());
byId('helpClose').addEventListener('click', () => byId<HTMLDialogElement>('help').close());
byId('retryScene').addEventListener('click', () => {
  const failedCanvas = byId<HTMLCanvasElement>('world');
  failedCanvas.replaceWith(failedCanvas.cloneNode(false));
  sceneStartupFailed = false;
  if (view) acceptState(view);
});
byId('retry').addEventListener('click', () => {
  void connect();
});
byId('centerCamera').addEventListener('click', () => scene?.center());
byId('zoomIn').addEventListener('click', () => scene?.setZoom(-2));
byId('zoomOut').addEventListener('click', () => scene?.setZoom(2));
byId('cancelAiRequest').addEventListener('click', () => {
  const button = byId<HTMLButtonElement>('cancelAiRequest');
  const jobId = button.dataset.jobId;
  if (!jobId || button.disabled) return;
  button.disabled = true;
  void post('/api/ai/cancel', { jobId })
    .then((result) => toast(result.message, !result.ok))
    .catch((error) => toast(String(error), true))
    .finally(() => renderComposer());
});
byId('messageForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (view && aiSetupReason(view.ai)) {
    openAiSetup();
    return;
  }
  const text = messageInput.value.trim();
  if (!text || submitting || byId<HTMLButtonElement>('sendMessage').disabled) return;
  const person = npc();
  const submittedMode = composerMode;
  submitting = true;
  renderComposer();
  const payload =
    composerMode === 'chat'
      ? { requestId: uid(), text, npcId: person?.id }
      : { requestId: uid(), text };
  void post(composerMode === 'chat' ? '/api/chat' : '/api/invent', payload)
    .then((result) => {
      if (result.ok) {
        // Keep any next draft the player typed while the request was being accepted.
        if (messageInput.value.trim() === text && composerMode === submittedMode) {
          messageInput.value = '';
          messageInput.style.height = '';
          saveDraft({ text: '', mode: composerMode });
        }
        if (submittedMode === 'chat') {
          conversationOpen = true;
          byId('conversationToggle').setAttribute('aria-expanded', 'true');
        }
      }
      toast(result.message, !result.ok);
    })
    .catch((error) => toast(`${String(error)} Check recent work before submitting again.`, true))
    .finally(() => {
      submitting = false;
      renderComposer();
    });
});
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    byId<HTMLFormElement>('messageForm').requestSubmit();
  }
});
messageInput.addEventListener('input', () => {
  saveDraft({ text: messageInput.value, mode: composerMode });
  messageInput.style.height = 'auto';
  messageInput.style.height = `${Math.min(100, messageInput.scrollHeight)}px`;
});
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || /INPUT|TEXTAREA/.test((event.target as HTMLElement).tagName))
    return;
  if (byId<HTMLDialogElement>('help').open) return;
  if (contextPoint) {
    contextPoint = null;
    renderContext();
    byId('world').focus({ preventScroll: true });
    return;
  }
  if (!byId('journal').hidden || !byId('aiPanel').hidden) {
    byId('journal').hidden = true;
    byId('aiPanel').hidden = true;
    return;
  }
  if (selectedId) {
    chooseEntity(null);
    return;
  }
  const cancel = view?.player.actions.find(
    (action) => action.command.type === 'cancel' && action.enabled,
  );
  if (cancel) void command(cancel.command);
});
window.addEventListener('pagehide', () => {
  source?.close();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) void connect();
});
window.addEventListener('beforeunload', () => {
  stopPresence?.();
});
void connect();
