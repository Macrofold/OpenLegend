import { GameSavesPanel } from './ui/game-saves';
import { History, Narrator } from './ui/history';
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type {
  ActionOption,
  CatalogueAction,
  EntityView,
  GamePatch,
  GameView,
  PlayerProfile,
} from '@open-legend/protocol';
import { applyGamePatch, getState, post, setWorldPaused, startPresence } from './api';
import { aiSetupReason } from './ai-readiness';
import { playerEntity } from './entity-view';
import { WildernessScene } from './scene';
import {
  Button,
  Condition,
  EmptyState,
  EntityRow,
  Icon,
  IconButton,
  Launcher,
  Panel,
  Section,
  SegmentedControl,
  Toolbar,
  symbol,
} from './design-system/components';
import { ActionPicker, type PickerContext } from './ui/action-picker';
import {
  PersonCreationModal,
  PersonEditor,
  WorldEventsEditor,
  type PersonDraft,
} from './ui/god-tools';
import { QuickActions } from './ui/quick-actions';
import { WorldAgent } from './ui/world-agent';
import { Composer } from './ui/composer';
import { EventTime } from './ui/event-time';
import { AiSettings, Character, Crafting, EntityDetail, Inventory } from './ui/panels';
import { Diagnostics, Mind, type DiagnosticSelection } from './ui/diagnostics';
import { useLocal } from './ui/storage';
import { readDraft, type ComposerDraft } from './draft';
import icons from './design-system/icons/icons.json';
import './design-system/tokens/tokens.css';
import './design-system/components.css';
import './design-system/layout.css';

type PanelId =
  | 'inventory'
  | 'crafting'
  | 'character'
  | 'agent'
  | 'nearby'
  | 'journal'
  | 'ai'
  | 'intelligence'
  | 'composer'
  | 'help'
  | 'mind';
const panelInfo: Record<PanelId, { title: string; side: 'left' | 'right'; wide?: boolean }> = {
  inventory: { title: 'Inventory', side: 'left' },
  crafting: { title: 'Crafting', side: 'left' },
  character: { title: 'Character', side: 'left' },
  agent: { title: 'World agent', side: 'right', wide: true },
  nearby: { title: 'In view', side: 'right' },
  journal: { title: 'Journal', side: 'left' },
  ai: { title: 'AI & allowance', side: 'right' },
  intelligence: { title: 'Intelligence', side: 'right', wide: true },
  composer: { title: 'Conversation', side: 'left', wide: true },
  help: { title: 'Settings & help', side: 'right' },
  mind: { title: 'Private mind', side: 'right', wide: true },
};
type GodEditorWindow =
  | { id: string; type: 'person'; actorId: string }
  | { id: string; type: 'world-events' };
function App() {
  const [view, setView] = useState<GameView | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(''),
    [sceneError, setSceneError] = useState(''),
    [notice, setNotice] = useState('');
  const [open, setOpen] = useState<PanelId[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [picker, setPicker] = useState<PickerContext | null>(null),
    [hover, setHover] = useState<{ entity: EntityView; point: { x: number; y: number } } | null>(
      null,
    );
  const [npcId, setNpcId] = useState<string | null>(null),
    [seed, setSeed] = useState<ComposerDraft | null>(null),
    [mindId, setMindId] = useState<string | null>(null),
    [intelligenceSelection, setIntelligenceSelection] = useState<DiagnosticSelection | null>(null),
    [personPosition, setPersonPosition] = useState<{ x: number; z: number } | null>(null),
    [godEditors, setGodEditors] = useState<GodEditorWindow[]>([]),
    [timeSettings, setTimeSettings] = useState(false),
    [pausePending, setPausePending] = useState(false),
    [preferencePending, setPreferencePending] = useState(false),
    [width, setWidth] = useState(innerWidth),
    [hiddenPreference, setHiddenPreference] = useState<boolean | null>(null);
  const [theme, setTheme] = useLocal('open-legend:theme', 'wilderness', (v): v is string =>
    ['wilderness', 'fantasy', 'scifi'].includes(String(v)),
  );
  const [scale, setScale] = useLocal('open-legend:ui-scale', 1, (v): v is number =>
    [0.9, 1, 1.15, 1.3].includes(Number(v)),
  );
  const [reduce, setReduce] = useLocal(
    'open-legend:reduce-motion',
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
  const canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<WildernessScene | null>(null),
    latest = useRef(view),
    currentPicker = useRef(picker),
    handlers = useRef({
      select: (
        _e: EntityView | null,
        _p?: { x: number; y: number },
        _g?: { x: number; z: number },
      ) => {},
      move: (_p: { x: number; z: number }) => {},
    }),
    retry = useRef(() => {});
  latest.current = view;
  currentPicker.current = picker;
  const notify = useCallback((text: string) => setNotice(text), []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.reduceMotion = String(reduce);
  }, [theme, reduce]);
  const accept = useCallback(
    (next: GameView, reset = false) =>
      setView((previous) => {
        if (previous?.saveTimeline && next.saveTimeline !== previous.saveTimeline) {
          // A restored timeline must not reuse abandoned browser conversations or drafts.
          try {
            localStorage.removeItem(`open-legend:world-agent:${next.worldId}`);
            sessionStorage.removeItem('open-legend:composer-draft:v2');
          } catch {
            /* Browser storage is optional. */
          }
          window.location.reload();
          return previous;
        }
        if (!reset && previous?.worldId === next.worldId) {
          if (next.revision < previous.revision) return previous;
          if (next.profile.revision < previous.profile.revision)
            next = { ...next, profile: previous.profile };
        }
        return next;
      }),
    [],
  );
  useEffect(() => {
    let streamView: GameView | undefined;
    let bootstrapVersion = 0;
    let active = true,
      source: EventSource | undefined,
      timer: ReturnType<typeof setTimeout> | undefined,
      stop: (() => void) | undefined;
    const schedule = (delay: number) => {
      if (!active) return;
      source?.close();
      setConnected(false);
      clearTimeout(timer);
      timer = setTimeout(() => void bootstrap(), delay);
    };
    function connectEvents() {
      const current = streamView;
      if (!active || !current) return;
      clearTimeout(timer);
      source?.close();
      const connection = new EventSource(`/api/events?revision=${current.revision}`);
      source = connection;
      source.onopen = () => {
        if (active && source === connection) {
          clearTimeout(timer);
          setConnected(true);
        }
      };
      source.addEventListener('reset', (event) => {
        try {
          if (!active || source !== connection) return;
          const reset = JSON.parse((event as MessageEvent<string>).data) as GameView;
          streamView = reset;
          accept(reset, true);
        } catch {
          notify('A world update could not be read. Reconnecting…');
          schedule(250);
        }
      });
      source.addEventListener('patch', (event) => {
        try {
          if (!active || source !== connection || !streamView) return;
          const patch = JSON.parse((event as MessageEvent<string>).data) as GamePatch;
          const next = applyGamePatch(streamView, patch);
          streamView = next;
          accept(next);
        } catch {
          schedule(250);
        }
      });
      source.onerror = () => {
        if (source === connection) schedule(6000);
      };
    }
    async function bootstrap() {
      const attempt = ++bootstrapVersion;
      clearTimeout(timer);
      source?.close();
      source = undefined;
      try {
        const initial = await getState();
        if (!active || attempt !== bootstrapVersion) return;
        streamView = initial;
        accept(initial, true);
        setConnected(true);
        setError('');
        stop ??= startPresence();
        connectEvents();
      } catch (e) {
        if (active && attempt === bootstrapVersion) {
          setConnected(false);
          setError(String(e));
          schedule(6000);
        }
      }
    }
    retry.current = () => void bootstrap();
    void bootstrap();
    const hide = () => {
        clearTimeout(timer);
        source?.close();
        source = undefined;
        bootstrapVersion++;
      },
      show = (e: PageTransitionEvent) => {
        if (e.persisted) void bootstrap();
      };
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => {
      active = false;
      source?.close();
      stop?.();
      clearTimeout(timer);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    };
  }, [accept, notify]);
  useEffect(() => {
    const resize = () => setWidth(innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  function fit(panels: PanelId[]) {
    const available = width / scale;
    if (available < 720) return panels;
    let result = [...panels];
    const size = (id: PanelId) => (panelInfo[id].wide ? 504 : 336);
    while (
      result.length > 1 &&
      (result.reduce((n, id) => n + size(id) + 16, 0) > available - 220 ||
        (available < 1100 &&
          result.filter((id) => panelInfo[id].side === panelInfo[result.at(-1)!].side).length > 1))
    )
      result.shift();
    return result;
  }
  function show(id: PanelId) {
    setOpen((v) => fit([...v.filter((p) => p !== id), id]));
  }
  function hide(id: PanelId) {
    setOpen((v) => v.filter((p) => p !== id));
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(`.ol-launcher[aria-label="${panelInfo[id].title}"]`)
        ?.focus(),
    );
  }
  function toggle(id: PanelId) {
    if (open.includes(id)) hide(id);
    else show(id);
  }
  useEffect(() => setOpen((v) => fit(v)), [width, scale]);
  async function command(action: ActionOption) {
    if (!connected || !action.enabled) {
      notify(action.reason ?? 'Reconnect to the world.');
      return;
    }
    setPicker(null);
    try {
      const r = await post('/api/command', {
        commandId: crypto.randomUUID(),
        commandEpoch: view?.commandEpoch,
        command: action.command,
      });
      if (!r.ok || r.code !== 'accepted') notify(r.message);
    } catch (e) {
      notify(`${String(e)} Check the journal before repeating this action.`);
    }
  }
  function talk(id: string) {
    setNpcId(id);
    setSeed({ text: readDraft().text, mode: 'chat' });
    show('composer');
    setPicker(null);
  }
  function invent(text = readDraft().text) {
    setSeed({ text, mode: 'invention' });
    show('composer');
    setPicker(null);
  }
  function inspect(entity: EntityView) {
    setSelected(entity.id);
    scene.current?.select(entity.id);
    show(entity.id === view?.player.id ? 'character' : 'nearby');
    setPicker(null);
  }
  handlers.current = {
    select: (entity, point, ground) => {
      if (point) {
        setPicker({
          context: {
            ...(entity ? { targetId: entity.id } : {}),
            ...(ground ? { position: ground } : {}),
          },
          point,
          entity,
        });
        setHover(null);
      } else if (entity) inspect(entity);
      else {
        setSelected(null);
        scene.current?.select(null);
      }
    },
    move: (position) =>
      void command({
        id: 'move',
        label: 'Walk',
        enabled: !latest.current?.clock.paused,
        command: { type: 'move', position },
      }),
  };
  useEffect(() => {
    if (!view || !canvas.current || sceneError) return;
    try {
      if (!scene.current)
        scene.current = new WildernessScene(canvas.current, {
          select: (...args) => handlers.current.select(...args),
          move: (p) => handlers.current.move(p),
          hover: (entity, point) => setHover(entity ? { entity, point } : null),
        });
      scene.current.setView(view);
    } catch (e) {
      scene.current?.destroy();
      scene.current = null;
      setSceneError(`${String(e)}. The In view list still provides interactions.`);
    }
  }, [view, sceneError]);
  useEffect(
    () => () => {
      scene.current?.destroy();
    },
    [],
  );
  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      if (
        currentPicker.current &&
        !(e.target as HTMLElement).closest(
          '#contextMenu,[role="tooltip"],.ol-select-popover,.ol-pullout-popover,.ol-modal-overlay,.ol-editor',
        )
      ) {
        setPicker(null);
        if (e.button === 0 && e.target === canvas.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('pointerdown', dismiss, true);
    return () => window.removeEventListener('pointerdown', dismiss, true);
  }, []);
  useEffect(() => {
    if (!timeSettings) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('.ol-clock-position')) setTimeSettings(false);
    };
    window.addEventListener('pointerdown', outside, true);
    return () => window.removeEventListener('pointerdown', outside, true);
  }, [timeSettings]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (picker) {
          setPicker(null);
          canvas.current?.focus();
        } else if (timeSettings) setTimeSettings(false);
        else if (selected && open.includes('nearby')) setSelected(null);
        else if (open.length) hide(open.at(-1)!);
        return;
      }
      if (
        /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      const ids: Record<string, PanelId> = {
        i: 'inventory',
        c: 'crafting',
        k: 'character',
        w: 'agent',
        v: 'nearby',
        j: 'journal',
      };
      const id = ids[e.key.toLowerCase()];
      if (id) {
        e.preventDefault();
        toggle(id);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  function preference(profile: PlayerProfile) {
    setView((v) => (v && profile.revision >= v.profile.revision ? { ...v, profile } : v));
  }
  async function pause() {
    if (!view || pausePending) return;
    setPausePending(true);
    try {
      const r = await setWorldPaused(!view.clock.paused);
      if (!r.ok) notify(r.message);
      accept(await getState());
    } catch (e) {
      notify(String(e));
    } finally {
      setPausePending(false);
    }
  }
  async function pauseWhenHidden(value: boolean) {
    setHiddenPreference(value);
    setPreferencePending(true);
    try {
      const r = await post<{ ok: boolean; message?: string; profile: PlayerProfile }>(
        '/api/profile/preferences',
        { pauseWhenHidden: value },
      );
      if (!r.ok) throw new Error(r.message);
      preference(r.profile);
    } catch (e) {
      notify(String(e));
    } finally {
      setPreferencePending(false);
      setHiddenPreference(null);
    }
  }
  function run(a: CatalogueAction) {
    if (a.intent.kind === 'command')
      void command({
        id: a.id,
        label: a.label,
        enabled: a.enabled,
        command: a.intent.command,
        reason: a.reason,
      });
    else if (a.intent.kind === 'compose') {
      if (a.intent.mode === 'invention') invent();
      else talk(a.intent.npcId ?? '');
    }
  }
  async function revive(entity: EntityView) {
    if (!connected) return notify('Reconnect to the world.');
    try {
      const result = await post('/api/god/act', {
        action: 'revive',
        targetId: entity.id,
        requestId: crypto.randomUUID(),
        expectedRevision: entity.bodyRevision,
      });
      notify(result.message);
      if (result.ok) setPicker(null);
    } catch (reason) {
      notify(String(reason));
    }
  }
  async function spawn(type: string, position: { x: number; z: number }) {
    if (!connected) return notify('Reconnect to the world.');
    try {
      const result = await post('/api/god/spawn', { type, position });
      notify(result.message);
      if (result.ok) setPicker(null);
    } catch (reason) {
      notify(String(reason));
    }
  }
  async function createPerson(position: { x: number; z: number }, draft: PersonDraft) {
    if (!connected)
      return { ok: false, code: 'offline', message: 'Reconnect to the world.' } as const;
    const result = await post('/api/god/person', { position, ...draft });
    notify(result.message);
    return result;
  }
  const entity =
    view &&
    (selected === view.player.id
      ? playerEntity(view)
      : view.entities.find((e) => e.id === selected));
  const narrow = width / scale < 720;
  const title = (id: PanelId) =>
    id === 'nearby' && entity
      ? entity.name
      : id === 'intelligence' && intelligenceSelection
        ? `${intelligenceSelection.actorName ?? 'World agent'} request`
        : panelInfo[id].title;
  function content(id: PanelId) {
    if (!view) return null;
    const props = { view, connected, command: (a: ActionOption) => void command(a) };
    switch (id) {
      case 'inventory':
        return <Inventory {...props} />;
      case 'crafting':
        return <Crafting {...props} invent={() => invent()} />;
      case 'character':
        return <Character {...props} />;
      case 'nearby':
        return entity ? (
          <EntityDetail
            entity={entity}
            {...props}
            talk={talk}
            editPerson={
              view.godMode && entity.kind === 'actor'
                ? () =>
                    setGodEditors((current) => [
                      ...current,
                      { id: crypto.randomUUID(), type: 'person', actorId: entity.id },
                    ])
                : undefined
            }
            inspectMind={
              view.godMode && entity.kind === 'actor'
                ? () => {
                    setMindId(entity.id);
                    show('mind');
                  }
                : undefined
            }
          />
        ) : (
          <>
            <p className="ol-meta">Within your character’s sight.</p>
            {view.entities.map((e) => (
              <div
                key={e.id}
                data-entity={e.id}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setPicker({
                    entity: e,
                    context: { targetId: e.id },
                    point: { x: event.clientX, y: event.clientY },
                  });
                }}
              >
                <EntityRow
                  name={e.name}
                  icon={symbol(e.subtype)}
                  meta={e.status}
                  count={e.quantity}
                  onPress={() => inspect(e)}
                />
              </div>
            ))}
          </>
        );
      case 'agent':
        return (
          <WorldAgent
            key={view.worldId}
            worldId={view.worldId}
            invent={invent}
            visible={open.includes('agent') && (!narrow || open.at(-1) === 'agent')}
          />
        );
      case 'composer':
        return (
          <Composer
            {...props}
            npcId={npcId}
            seed={seed}
            setup={() => show('ai')}
            notify={notify}
            visible={open.includes('composer') && (!narrow || open.at(-1) === 'composer')}
          />
        );
      case 'ai':
        return <AiSettings view={view} />;
      case 'journal':
        return (
          <>
            <Section title="A possible beginning">
              {view.milestones.map((m) => (
                <p key={m.id}>
                  <Icon name={m.done ? 'ui.check' : 'ui.more'} size={16} /> {m.label}
                </p>
              ))}
            </Section>
            <Section title="Your story">
              <History
                epoch={view.historyEpoch}
                revision={`${view.historyRevision}:${JSON.stringify(view.narrator)}`}
              />
            </Section>
          </>
        );
      case 'intelligence':
        return view.godMode ? (
          <Diagnostics
            key={view.worldId}
            worldId={view.worldId}
            selection={intelligenceSelection}
            onSelect={setIntelligenceSelection}
          />
        ) : (
          <p>God inspection is disabled.</p>
        );
      case 'mind':
        return view.godMode && mindId ? (
          <Mind key={`${view.worldId}:${mindId}`} actorId={mindId} />
        ) : null;
      case 'help':
        return (
          <>
            <GameSavesPanel />
            <Section title="Appearance">
              <label>
                World theme
                <select
                  aria-label="World theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="wilderness">Wilderness</option>
                  <option value="fantasy">Fantasy</option>
                  <option value="scifi">Sci-fi</option>
                </select>
              </label>
              <SegmentedControl
                label="UI scale"
                options={[0.9, 1, 1.15, 1.3].map((n) => ({
                  value: String(n),
                  label: `${Math.round(n * 100)}%`,
                }))}
                value={String(scale)}
                onChange={(v) => setScale(Number(v))}
              />
              <label>
                <input
                  type="checkbox"
                  checked={reduce}
                  onChange={(e) => setReduce(e.target.checked)}
                />{' '}
                Reduce motion
              </label>
            </Section>
            <Section title="Controls">
              <p>
                Click ground to walk. Click an object to look closer. Right-click or Control-click
                for actions. Drag with the primary, right or middle mouse button to pan. Scroll to
                zoom.
              </p>
              <p>
                I Inventory · C Crafting · K Character · W World agent · V In view · J Journal · 1–3
                Shortcuts · Escape Back / Close
              </p>
            </Section>
            <Section title="Credits">
              <p>Open Legend · AGPL-3.0-only</p>
              <details>
                <summary>Icon and font credits</summary>
                <p>
                  <a
                    href="https://creativecommons.org/licenses/by/3.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Game-icons.net · CC BY 3.0
                  </a>
                  . Silhouettes adapted to inherit interface color.
                </p>
                <ul>
                  {Object.entries(icons)
                    .filter(([, icon]) => 'author' in icon)
                    .map(([id, icon]) => {
                      const credit = icon as { source: string; author: string; url: string };
                      return (
                        <li key={id}>
                          <a href={credit.url} target="_blank" rel="noreferrer">
                            {credit.source}
                          </a>{' '}
                          — {credit.author}
                        </li>
                      );
                    })}
                </ul>
                <p>Lucide utility icons — Lucide contributors, ISC.</p>
                <p>
                  Self-hosted fonts: Cormorant Garamond, Atkinson Hyperlegible Next, IBM Plex Mono,
                  Cinzel and Chakra Petch. SIL Open Font License 1.1.
                </p>
              </details>
            </Section>
          </>
        );
    }
  }
  return (
    <>
      <canvas id="world" ref={canvas} tabIndex={0} aria-label="Wilderness world" />
      <div
        className="ol-root ol-hud"
        data-theme={theme}
        data-reduce-motion={reduce}
        data-narrow={narrow}
        data-compact={width / scale < 1200}
        data-tight={width / scale < 360}
        style={{ '--ui-scale': scale } as CSSProperties}
      >
        {!view ? (
          <div id="loading" className="ol-loading ol-card">
            <h1 className="ol-heading">OPEN LEGEND</h1>
            <p>{error || 'Entering the clearing…'}</p>
            {error && <Button onPress={() => retry.current()}>Retry connection</Button>}
          </div>
        ) : (
          <>
            <h1 className="ol-wordmark t-wordmark">OPEN LEGEND</h1>
            <section className="ol-card ol-survival" aria-label="Your condition">
              <div className="ol-survival-top">
                <span id="saveStatus" className="ol-caption" title={view.persistence.message}>
                  {view.persistence.status === 'saved' ? 'Saved' : 'Save error'}
                </span>
              </div>
              <div className="ol-survival-name">
                <h3 className="ol-heading">{view.player.name}</h3>
                <span className="ol-meta">The first clearing</span>
              </div>
              <Condition {...view.player} />
              <p className="ol-caption ol-player-state">
                {!view.player.alive ? 'Life has ended' : 'In the wild'}
              </p>
            </section>
            <div className="ol-clock-position">
              <div className="ol-card ol-timebar" aria-label="Time">
                <div className="ol-timebar-when">
                  <Icon
                    name={view.clock.hour < 6 || view.clock.hour >= 19 ? 'ui.night' : 'ui.day'}
                  />
                  <div>
                    <span className="ol-timebar-day">Day {view.clock.day}</span>
                    <span className="ol-timebar-clock">
                      {String(Math.floor(view.clock.hour)).padStart(2, '0')}:
                      {String(Math.floor(view.clock.seconds / 60) % 60).padStart(2, '0')}
                    </span>
                    <div className="ol-caption">
                      {view.clock.paused ? 'Paused' : 'Time in the wilderness'}
                    </div>
                  </div>
                </div>
                <span className="ol-timebar-sep" />
                <IconButton
                  id="pause"
                  icon={view.clock.paused ? 'ui.play' : 'ui.pause'}
                  label={view.clock.paused ? 'Resume world' : 'Pause world'}
                  disabled={!connected || pausePending}
                  pressed={view.clock.paused}
                  onPress={() => void pause()}
                />
                <SegmentedControl
                  label="Time speed"
                  options={[0.5, 1, 3, 8].map((n) => ({ value: String(n), label: `${n}×` }))}
                  value={String(view.clock.speed)}
                  onChange={(v) =>
                    void post('/api/control', { speed: Number(v) })
                      .then((r) => {
                        if (!r.ok) notify(r.message);
                      })
                      .catch((e) => notify(String(e)))
                  }
                />
                <IconButton
                  icon="ui.settings"
                  label="Time settings"
                  pressed={timeSettings}
                  onPress={() => setTimeSettings(!timeSettings)}
                />
              </div>
              {timeSettings && (
                <div className="ol-card ol-time-settings" role="region" aria-label="Time settings">
                  <label>
                    <input
                      type="checkbox"
                      checked={hiddenPreference ?? view.profile.preferences.pauseWhenHidden}
                      disabled={preferencePending}
                      onChange={(e) => void pauseWhenHidden(e.target.checked)}
                    />{' '}
                    Pause game when hidden
                  </label>
                  <p className="ol-caption">
                    1×: one real second is one game minute. Manual pause always wins.
                  </p>
                </div>
              )}
            </div>
            <div className="ol-top-tools">
              <Button id="aiLabel" size="sm" variant="quiet" onPress={() => toggle('ai')}>
                {aiSetupReason(view.ai)
                  ? 'AI needs setup'
                  : view.ai.mode === 'fixture'
                    ? 'Fixture mode'
                    : 'AI connected'}
              </Button>
              <IconButton icon="ui.help" label="Settings and help" onPress={() => toggle('help')} />
            </div>
            {(['left', 'right'] as const).map((side) => (
              <Toolbar
                key={side}
                className={`ol-rail ol-rail-${side}`}
                orientation="vertical"
                aria-label={`${side} panels`}
              >
                {(side === 'left'
                  ? (['inventory', 'crafting', 'character', 'journal'] as PanelId[])
                  : ([
                      'agent',
                      'nearby',
                      ...(view.godMode ? ['intelligence' as PanelId] : []),
                    ] as PanelId[])
                ).map((id) => (
                  <Launcher
                    key={id}
                    icon={
                      {
                        inventory: 'ui.inventory',
                        crafting: 'ui.crafting',
                        character: 'ui.character',
                        journal: 'ui.journal',
                        agent: 'ui.agent',
                        nearby: 'ui.inview',
                        intelligence: 'ui.star',
                      }[id as 'inventory']
                    }
                    label={panelInfo[id].title}
                    open={open.includes(id)}
                    side={side}
                    shortcut={
                      {
                        inventory: 'I',
                        crafting: 'C',
                        character: 'K',
                        agent: 'W',
                        nearby: 'V',
                        journal: 'J',
                      }[id as 'inventory']
                    }
                    onPress={() => toggle(id)}
                  />
                ))}
              </Toolbar>
            ))}
            {narrow && open.length > 0 && (
              <div className="ol-mobile-tabs" role="toolbar" aria-label="Open panels">
                {open.map((id) => (
                  <Button
                    key={id}
                    size="sm"
                    variant={id === open.at(-1) ? 'primary' : 'quiet'}
                    onPress={() => show(id)}
                  >
                    {panelInfo[id].title}
                  </Button>
                ))}
              </div>
            )}
            {(['left', 'right'] as const).map((side) => (
              <div key={side} className={`ol-dock ol-dock-${side}`} data-side={side}>
                {(Object.keys(panelInfo) as PanelId[])
                  .filter((id) => panelInfo[id].side === side)
                  .map((id) => (
                    <div
                      key={id}
                      className="ol-panel-slot"
                      hidden={!open.includes(id) || (narrow && open.at(-1) !== id)}
                      style={{ order: open.indexOf(id) }}
                    >
                      <Panel
                        title={title(id)}
                        id={id === 'nearby' ? 'nearbyPanel' : `${id}Panel`}
                        wide={panelInfo[id].wide}
                        draggable={!narrow && (id === 'agent' || id === 'composer')}
                        onClose={() => hide(id)}
                        onBack={
                          id === 'nearby' && entity
                            ? () => setSelected(null)
                            : id === 'intelligence' && intelligenceSelection
                              ? () => setIntelligenceSelection(null)
                              : undefined
                        }
                        backLabel={id === 'intelligence' ? 'Intelligence' : 'In view'}
                      >
                        {id === 'agent' || id === 'composer' || open.includes(id)
                          ? content(id)
                          : null}
                      </Panel>
                    </div>
                  ))}
              </div>
            ))}
            <QuickActions
              key={view.worldId}
              view={view}
              connected={connected}
              command={(a) => void command(a)}
              talk={talk}
            />
            <Narrator item={view.narrator} />
            <Toolbar className="ol-camera ol-card" aria-label="Camera">
              <IconButton
                icon="ui.plus"
                label="Zoom in"
                onPress={() => scene.current?.setZoom(-2)}
              />
              <IconButton
                icon="ui.minus"
                label="Zoom out"
                onPress={() => scene.current?.setZoom(2)}
              />
              <IconButton
                icon="ui.recenter"
                label="Recenter camera"
                onPress={() => scene.current?.center()}
              />
            </Toolbar>
            {picker && (
              <ActionPicker
                key={`${picker.point.x}:${picker.point.y}:${picker.entity?.id}`}
                picker={picker}
                view={view}
                connected={connected}
                close={() => {
                  setPicker(null);
                  canvas.current?.focus();
                }}
                run={run}
                invent={invent}
                inspect={inspect}
                preference={preference}
                revive={(target) => void revive(target)}
                enableCognition={(target) => {
                  void post('/api/god/act', { action: 'enable-cognition', targetId: target.id })
                    .then((result) => {
                      notify(result.message);
                      if (result.ok) setPicker(null);
                    })
                    .catch((reason) => notify(String(reason)));
                }}
                spawn={(type, position) => void spawn(type, position)}
                createPerson={(position) => {
                  setPicker(null);
                  setPersonPosition(position);
                }}
              />
            )}
            {personPosition && view.godMode && (
              <PersonCreationModal
                position={personPosition}
                traits={view.godTools?.traits ?? []}
                create={(draft) => createPerson(personPosition, draft)}
                close={() => setPersonPosition(null)}
              />
            )}
            {view.godMode &&
              godEditors.map((editor) =>
                editor.type === 'person' ? (
                  <PersonEditor
                    key={editor.id}
                    actorId={editor.actorId}
                    traits={view.godTools?.traits ?? []}
                    close={() =>
                      setGodEditors((current) => current.filter((item) => item.id !== editor.id))
                    }
                    openWorldEvents={() =>
                      setGodEditors((current) => [
                        ...current,
                        { id: crypto.randomUUID(), type: 'world-events' },
                      ])
                    }
                  />
                ) : (
                  <WorldEventsEditor
                    key={editor.id}
                    close={() =>
                      setGodEditors((current) => current.filter((item) => item.id !== editor.id))
                    }
                  />
                ),
              )}
          </>
        )}
        <div id="toast" role="status" className="ol-toast" hidden={!notice}>
          {notice}
        </div>
        {!connected && view && (
          <div id="connection" role="status" className="ol-connection ol-card">
            Connection interrupted. Reconnecting to your saved world…
          </div>
        )}
        {sceneError && (
          <div className="ol-scene-error ol-card" role="alert">
            <p>{sceneError}</p>
            <Button
              onPress={() => {
                setSceneError('');
                show('nearby');
              }}
            >
              Retry scene
            </Button>
            <Button onPress={() => show('nearby')}>Open In view</Button>
          </div>
        )}
      </div>
      {hover && !picker && (
        <div
          className="ol-world-hover"
          style={{ left: Math.min(hover.point.x + 16, width - 220), top: hover.point.y + 18 }}
        >
          {hover.entity.name}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById('app')!).render(<App />);
