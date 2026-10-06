import { namePhrase } from '@open-legend/language';
import { FamilyEditor } from './ui/family-editor';
import { WorldEvents } from './ui/world-events';
import { GameSavesPanel } from './ui/game-saves';
import { OperationsConsole } from './ui/operations-console';
import { EntryScreen, type EntryStatus } from './ui/entry-screen';
import { EntryNotice } from './ui/entry-notice';
import { MaintenanceNotice } from './ui/maintenance-notice';
import { TabResumeDialog } from './ui/tab-resume';
import { useTabControl, type TabControl } from './tab-control';
import { Narrator } from './ui/history';
import { Journal } from './ui/journal';
import { Settings } from './ui/settings';
import { createRoot } from 'react-dom/client';
import { ClockOffsetContext, clockParts } from './ui/event-time';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type {
  ActionOption,
  ApiResult,
  CatalogueAction,
  EntityView,
  GamePatch,
  GameView,
  PlayerProfile,
} from '@open-legend/protocol';
import {
  AccessError,
  SignInRequiredError,
  CharacterlessError,
  clearAccess,
  acceptAccess,
  eventsUrl,
  applyGamePatch,
  getState,
  post,
  setWorldPaused,
  startPresence,
  logOut,
} from './api';
import type { CommandRequestIdentity } from './command-request';
import { playerEntity } from './entity-view';
import { createWorldRenderer } from './scene';
import type { ScreenRect, WorldRenderer, ShadowQuality } from './world-renderer';
import { observeHudLayout } from './ui/hud-layout';
import { WorldHover } from './ui/world-hover';
import { CaptionGapNotice, useMissedCaptions } from './ui/caption-gap-notice';
import { captionScope } from './speech-captions';
import { CameraControls } from './ui/camera-controls';
import { FpsCounter } from './ui/fps-counter';
import type { CameraState } from './world-camera';
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
import { ItemCreationModal, type ItemCreationTarget } from './ui/item-creation';
import { ActionPicker, type PickerContext } from './ui/action-picker';
import {
  PersonCreationModal,
  PersonEditor,
  WorldEventsEditor,
  type PersonDraft,
} from './ui/god-tools';
import { QuickActions } from './ui/quick-actions';
import { WorldAgent } from './ui/world-agent';
import { Composer, type ComposerEntry } from './ui/composer';
import { EventTime } from './ui/event-time';
import { AiSettings, Character, Crafting, EntityDetail, Inventory } from './ui/panels';
import { CampActivity, type ActivityEntry } from './ui/camp-activity';
import { ContainerOpening, useContainerOpening } from './ui/container-opening';
import { Diagnostics, Mind, type DiagnosticSelection } from './ui/diagnostics';
import { useLocal } from './ui/storage';
import './design-system/tokens/tokens.css';
import './design-system/components.css';
import './design-system/layout.css';

type PanelId =
  | 'inventory'
  | 'crafting'
  | 'activity'
  | 'character'
  | 'agent'
  | 'game'
  | 'checkpoints'
  | 'nearby'
  | 'journal'
  | 'events'
  | 'ai'
  | 'intelligence'
  | 'composer'
  | 'help'
  | 'mind';
const timeSpeeds = [0.5, 1, 3, 8];
const panelInfo: Record<PanelId, { title: string; side: 'left' | 'right'; wide?: boolean }> = {
  inventory: { title: 'Inventory', side: 'left' },
  crafting: { title: 'Crafting', side: 'left' },
  activity: { title: 'Current task', side: 'left', wide: true },
  character: { title: 'Character', side: 'left' },
  agent: { title: 'Create', side: 'right', wide: true },
  game: { title: 'Game', side: 'right' },
  checkpoints: { title: 'Checkpoints', side: 'right', wide: true },
  nearby: { title: 'In view', side: 'right' },
  journal: { title: 'Journal', side: 'left', wide: true },
  events: { title: 'World Events', side: 'left', wide: true },
  ai: { title: 'Intelligence & allowance', side: 'right' },
  intelligence: { title: 'Intelligence', side: 'right', wide: true },
  composer: { title: 'Conversation', side: 'left', wide: true },
  help: { title: 'Settings & help', side: 'right', wide: true },
  mind: { title: 'Private mind', side: 'right', wide: true },
};
type GodEditorWindow =
  | { id: string; type: 'person'; actorId: string }
  | { id: string; type: 'world-events' }
  | { id: string; type: 'family'; actorId: string };
function taskScope(view: GameView) {
  return JSON.stringify([
    view.access?.privateDraftScope,
    view.worldId,
    view.saveTimeline,
    view.player.id,
  ]);
}
function App({
  resetApplication,
  onCharacterless,
  tab,
}: {
  resetApplication: () => void;
  onCharacterless: () => void;
  tab: TabControl;
}) {
  const [view, setView] = useState<GameView | null>(null),
    [transportReady, setConnected] = useState(false),
    [entryStatus, setEntryStatus] = useState<EntryStatus>({ kind: 'loading' }),
    [sceneError, setSceneError] = useState(''),
    [notice, setNotice] = useState('');
  const [itemCreation, setItemCreation] = useState<{
    target: ItemCreationTarget;
    definitionId?: string;
  } | null>(null);
  const [cameraView, setCameraView] = useState<
    Pick<CameraState, 'projection' | 'levelId' | 'rotationLocked' | 'following'>
  >({
    projection: 'orthographic',
    levelId: null,
    rotationLocked: false,
    following: true,
  });
  const [open, setOpen] = useState<PanelId[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [targeting, setTargeting] = useState(false),
    [picker, setPicker] = useState<PickerContext | null>(null),
    [hover, setHover] = useState<{
      entity: EntityView;
      point: { x: number; y: number };
    } | null>(null);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<PanelId[]>(['inventory']);
  const [inventoryOpened, setInventoryOpened] = useState(false);
  const [activityOpened, setActivityOpened] = useState(false);
  const [activityEntry, setActivityEntry] = useState<ActivityEntry>();
  const [retainedPanels, setRetainedPanels] = useState<PanelId[]>([]);
  const [actionSubject, setActionSubject] = useState<EntityView | null>(null);
  const [actionEntry, setActionEntry] = useState(0);
  const [conditionEntry, setConditionEntry] = useState(0);
  const [workEntry, setWorkEntry] = useState(0);
  const [choosingActionSubject, setChoosingActionSubject] = useState(false);
  const subjectReturnPanels = useRef<PanelId[]>([]);
  const [storyRequest, setStoryRequest] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [gameError, setGameError] = useState('');
  const [mindDirty, setMindDirty] = useState(false);
  const [mindSwitchMessage, setMindSwitchMessage] = useState('');
  const [npcId, setNpcId] = useState<string | null>(null),
    [composerEntry, setComposerEntry] = useState<ComposerEntry | null>(null),
    [talkRevision, setTalkRevision] = useState(0),
    [inventionSeed, setInventionSeed] = useState<{
      id: string;
      text: string;
    } | null>(null),
    [mindId, setMindId] = useState<string | null>(null),
    [intelligenceSelection, setIntelligenceSelection] = useState<DiagnosticSelection | null>(null),
    [personPosition, setPersonPosition] = useState<{
      x: number;
      y: number;
      z: number;
      surfaceId: string;
    } | null>(null),
    [godEditors, setGodEditors] = useState<GodEditorWindow[]>([]),
    [timeSettings, setTimeSettings] = useState(false),
    [pausePending, setPausePending] = useState(false),
    [speedPending, setSpeedPending] = useState(false),
    [width, setWidth] = useState(innerWidth),
    [height, setHeight] = useState(innerHeight);
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
  const [visionGuide, setVisionGuide] = useLocal(
    'open-legend:vision-guide',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [hearingGuide, setHearingGuide] = useLocal(
    'open-legend:hearing-guide',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [shadowQuality, setShadowQuality] = useLocal<ShadowQuality>(
    'open-legend:shadow-quality',
    'detailed',
    (v): v is ShadowQuality => v === 'detailed' || v === 'economy',
  );
  const [captionsEnabled, setCaptionsEnabled] = useLocal(
    'open-legend:captions',
    true,
    (v): v is boolean => typeof v === 'boolean',
  );
  const [captionsPaused, setCaptionsPaused] = useLocal(
    'open-legend:captions-paused',
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
  const [captionReadingScale, setCaptionReadingScale] = useLocal(
    'open-legend:caption-reading',
    1,
    (v): v is number => typeof v === 'number' && [1, 1.5, 2, 3].includes(v),
  );
  const [performance, setPerformance] = useLocal(
    'open-legend:show-performance',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [captionOcclusions, setCaptionOcclusions] = useState<ScreenRect[]>([]);
  const missedCaptions = useMissedCaptions(captionsEnabled);
  const [eventsType, setEventsType] = useState('all');
  // Opening speech history from the missed-caption notice starts a fresh, unsearched list.
  const [eventsReset, setEventsReset] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null),
    hud = useRef<HTMLDivElement>(null),
    survival = useRef<HTMLElement>(null),
    scene = useRef<WorldRenderer | null>(null),
    latest = useRef(view),
    currentPicker = useRef(picker),
    handlers = useRef({
      select: (
        _e: EntityView | null,
        _p?: { x: number; y: number },
        _g?: { x: number; y: number; z: number; surfaceId: string },
      ) => {},
      move: (_p: { x: number; y: number; z: number; surfaceId: string }) => {},
      target: (_entity: EntityView) => {},
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
  useEffect(() => {
    document.title = view ? `Open Legend · ${view.presentation.worldName}` : 'Open Legend';
  }, [view?.presentation.worldName]);
  const { paused: tabPaused, acceptView, pause: pauseTab, isPaused, enter } = tab;
  const connected = transportReady && !tabPaused && !!view?.access?.controlling;
  const accept = useCallback(
    (next: GameView, reset = false) => {
      const previous = latest.current;
      if (
        previous?.access &&
        next.access &&
        previous.access.privateDraftScope === next.access.privateDraftScope &&
        next.access.controlGeneration < previous.access.controlGeneration
      )
        return;
      if (!reset && previous?.worldId === next.worldId && next.revision < previous.revision) return;
      acceptView(next);
      if (
        previous &&
        (previous.access?.scope !== next.access?.scope ||
          previous.saveTimeline !== next.saveTimeline)
      ) {
        // Keep the scene and private drafts through a same-owner control transfer.
        // A security/character/timeline change remounts private panels; only exact
        // unresolved command receipts may survive when their native owner still matches.
        if (
          previous.access?.privateDraftScope !== next.access?.privateDraftScope ||
          previous.saveTimeline !== next.saveTimeline
        ) {
          const samePrivateOwner =
            !!previous.access?.commandRecoveryScope &&
            previous.access.commandRecoveryScope === next.access?.commandRecoveryScope &&
            previous.worldId === next.worldId &&
            previous.access.actorId === next.access?.actorId &&
            previous.player.id === next.player.id &&
            previous.saveTimeline === next.saveTimeline;
          clearAccess({ preservePendingCommands: samePrivateOwner });
          resetApplication();
          return;
        }
        setPicker(null);
        setHover(null);
        scene.current?.resetTransientCaptions();
      }
      acceptAccess(next);
      setView((current) => {
        if (!reset && current?.worldId === next.worldId && next.revision < current.revision)
          return current;
        return next;
      });
    },
    [resetApplication, acceptView],
  );
  useEffect(() => {
    let streamView: GameView | undefined;
    let bootstrapVersion = 0;
    let active = true,
      source: EventSource | undefined,
      timer: ReturnType<typeof setTimeout> | undefined,
      stop: (() => void) | undefined;
    const schedule = (delay: number) => {
      if (!active || isPaused()) return;
      source?.close();
      setConnected(false);
      clearTimeout(timer);
      timer = setTimeout(() => void bootstrap(), delay);
    };
    function connectEvents() {
      const current = streamView;
      if (!active || !current || isPaused()) return;
      clearTimeout(timer);
      source?.close();
      const connection = new EventSource(eventsUrl(current));
      source = connection;
      source.onopen = () => {
        if (active && source === connection) {
          clearTimeout(timer);
          setConnected(true);
        }
      };
      source.addEventListener('access-changed', () => {
        if (!active || source !== connection) return;
        pauseTab();
        clearAccess();
        resetApplication();
      });
      source.addEventListener('reset', (event) => {
        try {
          if (!active || source !== connection) return;
          const reset = JSON.parse((event as MessageEvent<string>).data) as GameView;
          streamView = reset;
          scene.current?.resetTransientCaptions();
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
        scene.current?.resetTransientCaptions();
        accept(initial, true);
        setConnected(true);
        setEntryStatus({ kind: 'loading' });
        if (isPaused()) {
          await enter((next) => accept(next, true));
          return;
        }
        if (initial.access?.controlling) {
          stop ??= startPresence();
          connectEvents();
        }
      } catch (e) {
        if (active && attempt === bootstrapVersion) {
          setConnected(false);
          if (e instanceof CharacterlessError) {
            clearAccess();
            onCharacterless();
            return;
          }
          if (e instanceof AccessError) {
            clearAccess();
            if (latest.current) {
              resetApplication();
              return;
            }
            setView(null);
            streamView = undefined;
            stop?.();
            stop = undefined;
          }
          if (e instanceof AccessError) {
            setEntryStatus({
              kind: e instanceof SignInRequiredError ? 'signed-out' : 'forbidden',
            });
            return;
          }
          setEntryStatus({
            kind: 'failed',
            message: e instanceof Error ? e.message : 'The world could not be loaded.',
          });
          // Existing play reconnects automatically; initial entry waits for an explicit retry.
          if (latest.current && !isPaused()) schedule(6000);
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
    const focus = () => {
      if (isPaused()) void bootstrap();
    };
    window.addEventListener('focus', focus);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => {
      active = false;
      source?.close();
      stop?.();
      clearTimeout(timer);
      window.removeEventListener('focus', focus);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    };
  }, [accept, notify, onCharacterless, tabPaused, pauseTab, isPaused, enter, resetApplication]);
  // A wide, short window can leave less room than one action button below the
  // condition card. Reuse the existing sheet without shrinking text or drafts.
  // docs/projects/parallel-batch-01-playable-week/camp-activities.md#engineer-3-implementation-plan--october-2-2026
  const needsSheet = (nextWidth: number, nextHeight: number) =>
    nextWidth / scale < 720 || nextHeight / scale <= 600;
  const narrow = needsSheet(width, height);
  useEffect(() => {
    const resize = () => {
      if (!narrow && needsSheet(innerWidth, innerHeight)) {
        const focused = document.activeElement;
        const panel = focused?.closest('.ol-panel');
        if (panel) {
          // The single visible sheet must follow the panel being edited, rather
          // than hide its focused input in favor of a more recently opened panel.
          setOpen((panels) => {
            const current = panels.find(
              (id) => (id === 'nearby' ? 'nearbyPanel' : `${id}Panel`) === panel.id,
            );
            return current ? [...panels.filter((id) => id !== current), current] : panels;
          });
          requestAnimationFrame(() => {
            if (
              focused instanceof HTMLElement &&
              focused.isConnected &&
              !focused.closest('[hidden]') &&
              document.activeElement === document.body
            )
              focused.focus({ preventScroll: true });
          });
        }
      }
      setWidth(innerWidth);
      setHeight(innerHeight);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [scale, narrow]);
  const worldVisible = view !== null && (!tabPaused || tab.blocked);
  useEffect(() => {
    if (!worldVisible || !survival.current || !hud.current || !canvas.current) return;
    return observeHudLayout(hud.current, canvas.current, survival.current, setCaptionOcclusions);
  }, [
    worldVisible,
    width,
    height,
    scale,
    open,
    timeSettings,
    expandedWorkspaces,
    choosingActionSubject,
    tabPaused,
  ]);
  const workspaceWidth = Math.min(792, Math.max(336, width / scale - 184));
  function fit(panels: PanelId[]) {
    const available = width / scale;
    if (narrow) return panels;
    let result = [...panels];
    const size = (id: PanelId) =>
      expandedWorkspaces.includes(id) ? workspaceWidth : panelInfo[id].wide ? 504 : 336;
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
    if (
      ['character', 'journal', 'events', 'help', 'checkpoints', 'mind', 'intelligence'].includes(id)
    )
      setRetainedPanels((current) => (current.includes(id) ? current : [...current, id]));
    if (id === 'inventory') setInventoryOpened(true);
    if (id === 'activity') setActivityOpened(true);
    // Opening speech history is the recovery path, so it settles the missed-caption notice.
    if (id === 'events') missedCaptions.clear();
    setOpen((v) => fit([...v.filter((p) => p !== id), id]));
  }
  function hide(id: PanelId) {
    if (id === 'inventory') containerOpening.cancel();
    const focused = document.activeElement;
    const ownsFocus =
      focused === document.body ||
      (focused instanceof HTMLElement &&
        focused.closest(`#${id === 'nearby' ? 'nearbyPanel' : `${id}Panel`}`));
    setOpen((v) => v.filter((p) => p !== id));
    if (ownsFocus)
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body && document.activeElement !== focused) return;
        const launcher = document.querySelector<HTMLButtonElement>(
          `.ol-launcher[aria-label="${panelInfo[id].title}"]`,
        );
        (launcher ?? document.getElementById('gameMenuButton') ?? canvas.current)?.focus({
          preventScroll: true,
        });
      });
  }
  function toggle(id: PanelId) {
    if (open.includes(id)) hide(id);
    else show(id);
  }
  useEffect(() => setOpen((v) => fit(v)), [width, height, scale, expandedWorkspaces]);
  async function sendCommand(
    action: ActionOption,
    request?: CommandRequestIdentity,
  ): Promise<ApiResult> {
    if (isPaused() || !latest.current?.access?.controlling) {
      return { ok: false, code: 'paused', message: 'Resume here to play.' };
    }
    if (!connected) {
      notify('Reconnect to the world.');
      return { ok: false, code: 'offline', message: 'Reconnect to the world.' };
    }
    if (!action.enabled) {
      notify(action.reason ?? 'This action is unavailable.');
      return {
        ok: false,
        code: 'unavailable',
        message: action.reason ?? 'This action is unavailable.',
      };
    }
    setPicker(null);
    setTargeting(false);
    try {
      const r = await post('/api/command', {
        commandId: request?.commandId ?? crypto.randomUUID(),
        commandEpoch: request?.commandEpoch ?? view?.commandEpoch,
        command: action.command,
      });
      if (!r.ok || r.code !== 'accepted') notify(r.message);
      return r;
    } catch (e) {
      notify(`${String(e)} Check the journal before repeating this action.`);
      return {
        ok: false,
        code: 'unconfirmed',
        message: `${String(e)} Check the journal before repeating this action.`,
      };
    }
  }
  const containerOpening = useContainerOpening(view, connected, sendCommand);
  function command(action: ActionOption, request?: CommandRequestIdentity): Promise<ApiResult> {
    if (connected && action.enabled) containerOpening.stopFollowing();
    return sendCommand(action, request);
  }
  function openContainer(entity: EntityView) {
    setExpandedWorkspaces((current) =>
      current.includes('inventory') ? current : [...current, 'inventory'],
    );
    show('inventory');
    setPicker(null);
    containerOpening.open(entity);
  }
  function openActivity(entry?: ActivityEntry) {
    setActivityEntry(entry);
    show('activity');
    setPicker(null);
  }
  function talk(id: string) {
    setNpcId(id);
    setComposerEntry(null);
    setTalkRevision((value) => value + 1);
    show('composer');
    setPicker(null);
  }
  function chooseRecipient(id: string) {
    if (!latest.current?.entities.some((entity) => entity.id === id && entity.canTalk)) return;
    setNpcId(id);
    setComposerEntry((entry) =>
      entry ? { ...entry, id: crypto.randomUUID(), recipientId: id } : null,
    );
    setTalkRevision((value) => value + 1);
  }
  function talkAbout(item: { itemId: string; name: string; recipientId?: string }) {
    const recipient = latest.current?.entities.find(
      (entity) => entity.canTalk && entity.id === (item.recipientId ?? npcId),
    );
    setNpcId(recipient?.id ?? null);
    setComposerEntry({
      id: crypto.randomUUID(),
      ...(recipient ? { recipientId: recipient.id } : {}),
      item: { itemId: item.itemId, name: item.name },
    });
    setTalkRevision((value) => value + 1);
    show('composer');
    setPicker(null);
  }
  function invent(text = '') {
    setInventionSeed({ id: crypto.randomUUID(), text });
    show('agent');
    setPicker(null);
  }
  function describeAction(subject: EntityView | null) {
    setActionSubject(subject);
    setActionEntry((value) => value + 1);
    setPicker(null);
    show('character');
  }
  function chooseActionSubject() {
    setTargeting(false);
    subjectReturnPanels.current = open;
    setChoosingActionSubject(true);
    setPicker(null);
    setOpen([]);
    requestAnimationFrame(() => canvas.current?.focus());
  }
  function closePicker() {
    const opener = picker?.opener;
    setPicker(null);
    if (opener?.isConnected && opener.getClientRects().length) {
      opener.focus({ preventScroll: true });
    } else canvas.current?.focus();
  }
  function finishActionSubject(subject?: EntityView) {
    if (subject) {
      const current = latest.current;
      const permitted =
        current &&
        (subject.id === current.player.id ||
          current.entities.some((entity) => entity.id === subject.id));
      if (!permitted) return notify('That subject is no longer in view. Choose another or cancel.');
      setActionSubject(subject);
      setActionEntry((value) => value + 1);
    }
    setChoosingActionSubject(false);
    setOpen(fit([...subjectReturnPanels.current.filter((id) => id !== 'character'), 'character']));
  }
  function readStory() {
    setStoryRequest((value) => value + 1);
    show('journal');
  }
  function openMind(actorId: string) {
    if (mindDirty && mindId !== actorId) {
      setMindSwitchMessage('Save or discard these notes before inspecting someone else.');
      show('mind');
      return;
    }
    setMindSwitchMessage('');
    setMindId(actorId);
    show('mind');
  }
  async function leaveAccount() {
    if (loggingOut) return;
    setLoggingOut(true);
    setGameError('');
    try {
      await logOut();
    } catch (error) {
      setGameError(error instanceof Error ? error.message : 'Could not log out. Try again.');
    } finally {
      setLoggingOut(false);
    }
  }
  function inspect(entity: EntityView) {
    const current = latest.current;
    const permitted =
      current &&
      (entity.id === current.player.id || current.entities.some((e) => e.id === entity.id));
    if (!permitted) {
      notify(`${current?.player.name ?? 'Your character'} can't see this.`);
      return;
    }
    if (scene.current && !scene.current.select(entity.id)) return;
    setSelected(entity.id);
    show(entity.id === view?.player.id ? 'character' : 'nearby');
    setPicker(null);
  }
  function clearSelection() {
    setSelected(null);
    scene.current?.select(null);
  }
  handlers.current = {
    target: (entity) => {
      if (choosingActionSubject) return;
      const action = latest.current?.entities.find(
        (target) => target.id === entity.id,
      )?.equippedAction;
      if (!action) {
        notify('Your equipped item has no available use on this target.');
        return;
      }
      if (action.enabled) setTargeting(false);
      void command(action);
    },
    select: (entity, point, ground) => {
      if (choosingActionSubject) {
        if (entity) finishActionSubject(entity);
        return;
      }
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
        clearSelection();
      }
    },
    move: (position) => {
      if (choosingActionSubject) return;
      void command({
        id: 'move',
        label: 'Walk',
        enabled: !latest.current?.clock.paused,
        // Loaded worlds start paused; blocked movement is not a lost connection.
        reason: latest.current?.clock.paused ? 'Press Play to resume the world.' : undefined,
        command: { type: 'move', position },
      });
    },
  };
  useEffect(() => {
    if (!view || !canvas.current || sceneError) return;
    // A fresh blocked tab needs its Resume decision before allocating graphics.
    // Existing scenes still receive suspended updates and private-scope resets.
    if (!scene.current && tabPaused) return;
    try {
      if (!scene.current)
        scene.current = createWorldRenderer(canvas.current, {
          select: (...args) => handlers.current.select(...args),
          move: (p) => handlers.current.move(p),
          target: (entity) => handlers.current.target(entity),
          hover: (entity, point) =>
            setHover((previous) =>
              previous?.entity === entity &&
              previous.point.x === point.x &&
              previous.point.y === point.y
                ? previous
                : entity
                  ? { entity, point }
                  : null,
            ),
          selectionDenied: notify,
          cameraChanged: ({ projection, levelId, rotationLocked, following }) =>
            setCameraView((previous) =>
              previous.projection === projection &&
              previous.levelId === levelId &&
              previous.rotationLocked === rotationLocked &&
              previous.following === following
                ? previous
                : { projection, levelId, rotationLocked, following },
            ),
        });
      scene.current.setSuspended(tabPaused);
      scene.current.setShadowQuality(shadowQuality);
      scene.current.setPerceptionOptions({
        vision: visionGuide,
        hearing: hearingGuide,
      });
      scene.current.setView(view);
    } catch (e) {
      scene.current?.destroy();
      scene.current = null;
      setSceneError(`${String(e)}. The In view list still provides interactions.`);
    }
  }, [view, sceneError, shadowQuality, tabPaused]);
  useEffect(() => {
    scene.current?.setPerceptionOptions({
      vision: visionGuide,
      hearing: hearingGuide,
    });
  }, [worldVisible, sceneError, visionGuide, hearingGuide]);
  useEffect(() => {
    scene.current?.setTargeting(targeting && connected && !tabPaused && !choosingActionSubject);
  }, [targeting, connected, tabPaused, worldVisible, sceneError, choosingActionSubject]);
  useEffect(() => {
    setTargeting(false);
  }, [view?.access?.scope, view?.saveTimeline, tabPaused, connected]);
  useEffect(() => {
    scene.current?.setCaptionOptions({
      enabled: captionsEnabled,
      onMissedCaptions: missedCaptions.report,
      paused: captionsPaused,
      readingScale: captionReadingScale,
      uiScale: scale,
      reducedMotion: reduce,
      occlusions: captionOcclusions,
    });
  }, [
    worldVisible,
    tabPaused,
    sceneError,
    captionsEnabled,
    captionsPaused,
    captionReadingScale,
    scale,
    reduce,
    captionOcclusions,
  ]);
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
      if (
        e.defaultPrevented ||
        e.isComposing ||
        isPaused() ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      if (e.key === 'Escape') {
        if (choosingActionSubject) {
          e.preventDefault();
          finishActionSubject();
        } else if (picker) {
          closePicker();
        } else if (targeting) {
          setTargeting(false);
          e.preventDefault();
        } else if (timeSettings) setTimeSettings(false);
        else if (selected && open.includes('nearby')) clearSelection();
        else if (open.length) hide(open.at(-1)!);
        return;
      }
      if (choosingActionSubject) return;
      if (
        (e.target instanceof Element &&
          e.target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="dialog"], [role="listbox"], [role="menu"]',
          )) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (e.key.toLowerCase() === 't') {
        if (!view || picker || !connected || e.repeat) return;
        e.preventDefault();
        if (!view.player.inventory.some((item) => item.equipped)) {
          notify('Equip an item before targeting.');
          return;
        }
        setTargeting((active) => !active);
        return;
      }
      if (
        e.key.toLowerCase() === 'p' ||
        (e.shiftKey && (e.code === 'BracketRight' || e.code === 'BracketLeft'))
      ) {
        if (!view || picker) return;
        e.preventDefault();
        if (e.repeat) return;
        if (e.key.toLowerCase() === 'p') void pause();
        else {
          const speed =
            e.code === 'BracketRight'
              ? timeSpeeds.find((value) => value > view.clock.speed)
              : [...timeSpeeds].reverse().find((value) => value < view.clock.speed);
          if (speed !== undefined) void changeSpeed(speed);
        }
        return;
      }
      if (choosingActionSubject || e.repeat) return;
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
    if (!view || !connected || pausePending || view.clock.pauseReason === 'maintenance') return;
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
  async function changeSpeed(speed: number) {
    if (!view || !connected || speedPending) return;
    setSpeedPending(true);
    try {
      const r = await post('/api/control', { speed });
      if (!r.ok) notify(r.message);
      accept(await getState());
    } catch (e) {
      notify(String(e));
    } finally {
      setSpeedPending(false);
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
  async function enableCognition(entity: EntityView) {
    if (!connected) return notify('Reconnect to the world.');
    try {
      const result = await post('/api/god/act', {
        action: 'enable-cognition',
        targetId: entity.id,
      });
      notify(result.message);
      if (result.ok) setPicker(null);
    } catch (reason) {
      notify(String(reason));
    }
  }
  function characterGodControls(target: EntityView) {
    if (!view?.godMode) return undefined;
    return {
      revive,
      enableCognition,
      ...(target.kind === 'actor'
        ? {
            editPerson: () =>
              setGodEditors((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  type: 'person' as const,
                  actorId: target.id,
                },
              ]),
            ...(view.godTools?.familyLabel
              ? {
                  familyLabel: view.godTools.familyLabel,
                  editFamily: () =>
                    setGodEditors((current) => [
                      ...current,
                      { id: crypto.randomUUID(), type: 'family', actorId: target.id },
                    ]),
                }
              : {}),
            inspectMind: () => openMind(target.id),
          }
        : {}),
    };
  }
  async function spawn(
    type: string,
    position: { x: number; y: number; z: number; surfaceId: string },
  ) {
    if (!connected) return notify('Reconnect to the world.');
    try {
      const result = await post('/api/god/spawn', { type, position });
      notify(result.message);
      if (result.ok) setPicker(null);
    } catch (reason) {
      notify(String(reason));
    }
  }
  async function createPerson(
    position: { x: number; y: number; z: number; surfaceId: string },
    draft: PersonDraft,
  ) {
    if (!connected)
      return {
        ok: false,
        code: 'offline',
        message: 'Reconnect to the world.',
      } as const;
    const result = await post('/api/god/person', { position, ...draft });
    notify(result.message);
    return result;
  }
  const entity =
    view &&
    (selected === view.player.id
      ? playerEntity(view)
      : view.entities.find((e) => e.id === selected));
  const title = (id: PanelId) =>
    id === 'activity' && activityEntry
      ? activityEntry.label
      : id === 'nearby' && choosingActionSubject
        ? 'Choose a subject'
        : id === 'nearby' && entity
          ? namePhrase(entity, 'indefinite')
          : id === 'intelligence' && intelligenceSelection
            ? `${intelligenceSelection.actorName ?? 'World agent'} request`
            : panelInfo[id].title;
  function content(id: PanelId) {
    if (!view) return null;
    // Keep editable drafts mounted, but close readers with their own polling.
    if (
      (tabPaused || !view.access?.controlling) &&
      !['inventory', 'activity', 'agent', 'composer', ...retainedPanels].includes(id)
    )
      return null;
    const visible = connected && open.includes(id) && (!narrow || open.at(-1) === id);
    const props = {
      view,
      connected,
      command: (a: ActionOption) => void command(a),
    };
    switch (id) {
      case 'inventory':
        return (
          <>
            <ContainerOpening state={containerOpening} paused={view.clock.paused} />
            <Inventory
              {...props}
              browseActions={(item, opener) => {
                const bounds = opener.getBoundingClientRect();
                setPicker({
                  context: { itemId: item.id },
                  item: { id: item.id, name: item.name },
                  point: { x: bounds.right, y: bounds.top },
                  entity: null,
                  opener,
                });
              }}
              command={command}
              openContainer={containerOpening.openContainer}
              onTalkAbout={talkAbout}
              visible={
                connected && open.includes('inventory') && (!narrow || open.at(-1) === 'inventory')
              }
              addItem={() => setItemCreation({ target: { actorId: view.player.id } })}
              contextMenu={(item, point, opener) =>
                setPicker({
                  context: { itemId: item.id },
                  item: { id: item.id, name: item.name },
                  point,
                  entity: null,
                  opener,
                })
              }
            />
          </>
        );
      case 'activity':
        return (
          <CampActivity
            view={view}
            connected={connected}
            command={command}
            entry={activityEntry}
            visible={
              connected && open.includes('activity') && (!narrow || open.at(-1) === 'activity')
            }
          />
        );
      case 'crafting':
        return <Crafting {...props} invent={() => invent()} />;
      case 'character':
        return (
          <Character
            {...props}
            key={taskScope(view)}
            visible={visible}
            actionSubject={actionSubject}
            actionEntry={actionEntry}
            conditionEntry={conditionEntry}
            workEntry={workEntry}
            chooseActionSubject={chooseActionSubject}
            clearActionSubject={() => setActionSubject(null)}
            openInventory={() => show('inventory')}
            godControls={characterGodControls(playerEntity(view))}
            openActivity={() => openActivity()}
            openMind={() => openMind(view.player.id)}
          />
        );
      case 'nearby':
        return entity && !choosingActionSubject ? (
          <EntityDetail
            entity={entity}
            {...props}
            talk={talk}
            openContainer={openContainer}
            openActivity={openActivity}
            godControls={characterGodControls(entity)}
          />
        ) : (
          <>
            <p className="ol-meta">
              {choosingActionSubject
                ? 'Choose the exact subject for your action. This does not act or move your character.'
                : 'Within your character’s sight. Select a name to look closer, or right-click for actions.'}
            </p>
            {choosingActionSubject && (
              <Button onPress={() => finishActionSubject(playerEntity(view))}>
                Choose {view.player.name} (you)
              </Button>
            )}
            {!view.entities.length && (
              <EmptyState title="Nothing else in view">
                Only currently visible objects appear here.
              </EmptyState>
            )}
            {view.entities.map((e) => (
              <div
                key={e.id}
                data-entity={e.id}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (choosingActionSubject) {
                    finishActionSubject(e);
                    return;
                  }
                  setPicker({
                    entity: e,
                    context: { targetId: e.id },
                    point: { x: event.clientX, y: event.clientY },
                  });
                }}
              >
                <EntityRow
                  name={e.name}
                  icon={symbol(e.icon ?? '')}
                  meta={e.status}
                  count={e.quantity}
                  onPress={() => (choosingActionSubject ? finishActionSubject(e) : inspect(e))}
                />
              </div>
            ))}
          </>
        );
      case 'agent':
        return (
          <WorldAgent
            actorId={view.player.id}
            accessScope={view.access?.privateDraftScope ?? view.player.id}
            budget={view.ai.budget}
            godMode={view.godMode}
            saveTimeline={view.saveTimeline}
            key={view.worldId}
            worldId={view.worldId}
            recipes={view.recipes}
            command={command}
            connected={connected}
            inventionSeed={inventionSeed}
            invent={invent}
            visible={connected && open.includes('agent') && (!narrow || open.at(-1) === 'agent')}
          />
        );
      case 'composer':
        return (
          <Composer
            {...props}
            npcId={npcId}
            entry={composerEntry}
            talkRevision={talkRevision}
            chooseRecipient={chooseRecipient}
            clearEntry={() => setComposerEntry(null)}
            setup={() => show('ai')}
            notify={notify}
            visible={
              connected && open.includes('composer') && (!narrow || open.at(-1) === 'composer')
            }
          />
        );
      case 'ai':
        return <AiSettings view={view} />;
      case 'events':
        return (
          <WorldEvents
            key={`${captionScope(view)}:${eventsReset}`}
            visible={visible}
            scope={captionScope(view)}
            revision={view.worldEventsRevision}
            type={eventsType}
            onTypeChange={setEventsType}
          />
        );
      case 'journal':
        return (
          <>
            <Button size="sm" variant="quiet" onPress={() => show('events')}>
              World Events · what you perceived
            </Button>
            <Journal
              key={taskScope(view)}
              view={view}
              visible={visible}
              storyRequest={storyRequest}
            />
          </>
        );
      case 'intelligence':
        return view.godMode ? (
          <Diagnostics
            key={view.worldId}
            worldId={view.worldId}
            selection={intelligenceSelection}
            onSelect={setIntelligenceSelection}
            visible={visible}
            readScope={view.access?.scope}
          />
        ) : (
          <p>God inspection is disabled.</p>
        );
      case 'mind':
        return mindId && (view.godMode || mindId === view.player.id) ? (
          <>
            {mindSwitchMessage && <p role="status">{mindSwitchMessage}</p>}
            <Mind
              key={`${taskScope(view)}:${mindId}`}
              actorId={mindId}
              owned={mindId === view.player.id}
              visible={visible}
              onDirtyChange={setMindDirty}
              readScope={view.access?.scope}
            />
          </>
        ) : null;
      case 'game':
        return (
          <div className="ol-game-menu">
            <p>
              {view.presentation.worldName} · playing as {view.player.name}
            </p>
            <Button variant="primary" onPress={() => hide('game')}>
              Back to the world
            </Button>
            <Section title="Your game">
              <p role={view.persistence.status === 'error' ? 'alert' : undefined}>
                {view.persistence.message}
              </p>
              {view.access?.canManageSaves && (
                <Button onPress={() => show('checkpoints')}>Checkpoints</Button>
              )}
              <Button onPress={() => show('help')}>Settings & help</Button>
              <Button onPress={() => show('ai')}>Intelligence & allowance</Button>
            </Section>
            <Section title="Creation and inspection">
              <Button onPress={() => show('agent')}>Create</Button>
              <p className="ol-caption">
                Open your invention workshop
                {view.godMode ? ' and the world-owner conversation' : ''}.
              </p>
              {view.godMode && (
                <Button onPress={() => show('intelligence')}>
                  God mode · Intelligence diagnostics
                </Button>
              )}
              {view.access?.canOperate && (
                <a href="/?view=operations" target="_blank" rel="noopener">
                  World operations · opens separately
                </a>
              )}
            </Section>
            <Button busy={loggingOut} onPress={() => void leaveAccount()}>
              Log Out
            </Button>
            {gameError && <p role="alert">{gameError}</p>}
          </div>
        );
      case 'checkpoints':
        return view.access?.canManageSaves ? <GameSavesPanel visible={visible} /> : null;
      case 'help':
        return (
          <Settings
            view={view}
            theme={theme}
            setTheme={setTheme}
            scale={scale}
            setScale={setScale}
            reduce={reduce}
            setReduce={setReduce}
            captionsEnabled={captionsEnabled}
            setCaptionsEnabled={setCaptionsEnabled}
            captionsPaused={captionsPaused}
            setCaptionsPaused={setCaptionsPaused}
            captionReadingScale={captionReadingScale}
            setCaptionReadingScale={setCaptionReadingScale}
            shadowQuality={shadowQuality}
            setShadowQuality={setShadowQuality}
            performance={performance}
            setPerformance={setPerformance}
          />
        );
    }
  }
  return (
    <ClockOffsetContext.Provider value={view?.clock.offsetHours ?? 0}>
      <canvas
        id="world"
        ref={canvas}
        tabIndex={view ? 0 : -1}
        aria-hidden={!view}
        aria-label={view?.presentation.worldName ?? 'World'}
      />
      <div
        ref={hud}
        className="ol-root ol-hud"
        data-theme={theme}
        data-reduce-motion={reduce}
        data-narrow={narrow}
        data-compact={width / scale < 1200}
        data-tight={width / scale < 360}
        data-picking={choosingActionSubject}
        style={{ '--ui-scale': scale } as CSSProperties}
      >
        {!view || (tabPaused && !tab.blocked) ? (
          <EntryScreen
            status={entryStatus}
            onRetry={() => {
              setEntryStatus({
                kind: 'loading',
                retryLabel:
                  entryStatus.kind === 'forbidden' ? 'Check access again' : 'Retry connection',
              });
              retry.current();
            }}
          />
        ) : (
          <>
            <h1 className="ol-wordmark t-wordmark">OPEN LEGEND</h1>
            <section ref={survival} className="ol-card ol-survival" aria-label="Your condition">
              <div className="ol-survival-top">
                <span id="saveStatus" className="ol-caption" title={view.persistence.message}>
                  {view.persistence.status === 'saved' ? 'World saved' : 'World save failed'}
                </span>
              </div>
              <div className="ol-survival-name">
                <Button
                  variant="quiet"
                  className="ol-character-link"
                  onPress={() => {
                    setConditionEntry((value) => value + 1);
                    show('character');
                  }}
                >
                  {view.player.name}
                  <Icon name="ui.character" size={16} />
                </Button>
                <span className="ol-meta">{view.presentation.locationName}</span>
              </div>
              <Condition {...view.player} />
              <p className="ol-caption ol-player-state">
                {view.player.participation === 'inactive'
                  ? 'Away from the world'
                  : view.player.participation === 'exiting'
                    ? 'Preparing to leave'
                    : !view.player.alive
                      ? 'Life has ended'
                      : 'In the world'}
              </p>
              {view.player.hasWork && (
                <div className="ol-current-work">
                  <span className="ol-caption">Current work</span>
                  <strong>
                    {view.player.action?.label ?? view.player.activity?.name ?? 'Work is waiting'}
                  </strong>
                  {view.player.activity?.reason && (
                    <span className="ol-caption">{view.player.activity.reason}</span>
                  )}
                  <Button
                    size="sm"
                    onPress={() => {
                      setWorkEntry((value) => value + 1);
                      show('character');
                    }}
                  >
                    Review current work
                  </Button>
                </div>
              )}
              {view.persistence.status === 'error' && (
                <p className="ol-save-failure" role="alert">
                  {view.persistence.message}
                  {view.access?.canManageSaves && (
                    <Button size="sm" onPress={() => show('checkpoints')}>
                      Open recovery
                    </Button>
                  )}
                </p>
              )}
            </section>
            {choosingActionSubject && (
              <section className="ol-card ol-subject-picking" aria-label="Choose action subject">
                <strong>Choose a subject</strong>
                <p>
                  Click an object in the world, or choose from In view. Your action will be prepared
                  for that exact subject.
                </p>
                <div>
                  <Button onPress={() => show('nearby')}>In view</Button>
                  <Button onPress={() => finishActionSubject()}>Cancel</Button>
                </div>
              </section>
            )}
            <div className="ol-clock-position">
              <div className="ol-card ol-timebar" aria-label="Time">
                <div className="ol-timebar-when">
                  <Icon
                    name={view.clock.hour < 6 || view.clock.hour >= 19 ? 'ui.night' : 'ui.day'}
                  />
                  <div>
                    <span className="ol-timebar-day">Day {view.clock.day}</span>
                    <span className="ol-timebar-clock">
                      {clockParts(view.clock.seconds, view.clock.offsetHours).hour}:
                      {clockParts(view.clock.seconds, view.clock.offsetHours).minute}
                    </span>
                    <div className="ol-caption">
                      {view.clock.paused
                        ? view.clock.pauseReason === 'maintenance'
                          ? 'Paused for maintenance'
                          : 'Paused'
                        : view.clock.preparingNavigation
                          ? 'Preparing navigation…'
                          : view.presentation.timeLabel}
                    </div>
                  </div>
                </div>
                <span className="ol-timebar-sep" />
                <IconButton
                  id="pause"
                  icon={view.clock.paused ? 'ui.play' : 'ui.pause'}
                  label={view.clock.paused ? 'Resume world' : 'Pause world'}
                  disabled={!connected || pausePending || view.clock.pauseReason === 'maintenance'}
                  pressed={view.clock.paused}
                  onPress={() => void pause()}
                />
                <SegmentedControl
                  label="Time speed"
                  options={timeSpeeds.map((n) => ({
                    value: String(n),
                    label: `${n}×`,
                  }))}
                  value={String(view.clock.speed)}
                  disabled={!connected || speedPending}
                  onChange={(v) => void changeSpeed(Number(v))}
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
                  <p>
                    Leaving this tab pauses your play. Returning resumes automatically unless you
                    started playing in another tab.
                  </p>
                  <p className="ol-caption">
                    1×: one real second is {view.clock.baseRatio} game seconds. Manual pause always
                    wins. P pauses or resumes; Shift + ] speeds up; Shift + [ slows down.
                  </p>
                </div>
              )}
              <div className="ol-hud-notices">
                <EntryNotice />
                <MaintenanceNotice maintenance={view.maintenance} />
              </div>
            </div>
            <div className="ol-top-tools">
              <Button id="gameMenuButton" size="sm" variant="quiet" onPress={() => toggle('game')}>
                Game
              </Button>
              <IconButton icon="ui.help" label="Settings and help" onPress={() => toggle('help')} />
            </div>
            <div className="ol-launcher-rails">
              {(['left', 'right'] as const).map((side) => (
                <Toolbar
                  key={side}
                  className={`ol-rail ol-rail-${side}`}
                  orientation={
                    width / scale < 360 || (narrow && open.length > 0) ? 'horizontal' : 'vertical'
                  }
                  aria-label={
                    side === 'left' ? 'Your character and records' : 'World actions and creation'
                  }
                >
                  {(side === 'left'
                    ? (['inventory', 'character', 'journal', 'composer'] as PanelId[])
                    : (['nearby', 'crafting', 'agent'] as PanelId[])
                  ).map((id) => (
                    <Launcher
                      key={id}
                      icon={
                        {
                          inventory: 'ui.inventory',
                          crafting: 'ui.crafting',
                          character: 'ui.character',
                          journal: 'ui.journal',
                          events: 'ui.journal',
                          composer: 'action.talk',
                          agent: 'ui.agent',
                          game: 'ui.settings',
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
            </div>
            {narrow && open.length > 0 && (
              <div
                className="ol-mobile-tabs"
                data-single={open.length === 1 ? 'true' : undefined}
                role="toolbar"
                aria-label="Open panels"
              >
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
                        draggable={!narrow && ['agent', 'composer', 'intelligence'].includes(id)}
                        resizable={!narrow && id === 'intelligence'}
                        workspace={
                          ['inventory', 'agent', 'journal', 'events', 'character', 'mind'].includes(
                            id,
                          )
                            ? {
                                expanded: expandedWorkspaces.includes(id),
                                width: workspaceWidth,
                                onToggle: () => {
                                  setExpandedWorkspaces((current) =>
                                    current.includes(id)
                                      ? current.filter((value) => value !== id)
                                      : [...current, id],
                                  );
                                  setOpen((current) => [
                                    ...current.filter((value) => value !== id),
                                    id,
                                  ]);
                                },
                              }
                            : undefined
                        }
                        onClose={() => hide(id)}
                        onBack={
                          id === 'nearby' && entity
                            ? clearSelection
                            : id === 'intelligence' && intelligenceSelection
                              ? () => setIntelligenceSelection(null)
                              : undefined
                        }
                        backLabel={id === 'intelligence' ? 'Intelligence' : 'In view'}
                      >
                        {id === 'agent' ||
                        id === 'composer' ||
                        (id === 'inventory' && inventoryOpened) ||
                        (id === 'activity' && activityOpened) ||
                        retainedPanels.includes(id) ||
                        open.includes(id)
                          ? content(id)
                          : null}
                      </Panel>
                    </div>
                  ))}
              </div>
            ))}
            <QuickActions
              key={`quick:${captionScope(view)}`}
              view={view}
              connected={connected && !choosingActionSubject}
              command={(a) => void command(a)}
              talk={talk}
            />
            {!tabPaused && (
              <Narrator
                key={`narrator:${captionScope(view)}`}
                item={view.narrator}
                onReadStory={readStory}
              />
            )}
            {!tabPaused && performance && <FpsCounter renderer={scene} />}
            <CameraControls
              overlays={{ vision: visionGuide, hearing: hearingGuide }}
              toggleOverlay={(sense) =>
                sense === 'vision' ? setVisionGuide(!visionGuide) : setHearingGuide(!hearingGuide)
              }
              levels={view.map.spatial.levels}
              state={cameraView}
              send={(command) => scene.current?.cameraCommand(command)}
              center={() => scene.current?.center()}
            />
            {!tabPaused && picker && (
              <ActionPicker
                createItem={(definitionId, position) => {
                  setItemCreation({ definitionId, target: { position } });
                  setPicker(null);
                }}
                key={`${view.access?.scope}:${view.access?.controlGeneration}:${view.saveTimeline}:${picker.point.x}:${picker.point.y}:${picker.entity?.id}:${picker.context.itemId}`}
                picker={picker}
                view={view}
                connected={connected}
                close={closePicker}
                run={run}
                invent={invent}
                describeAction={describeAction}
                inspect={inspect}
                openContainer={openContainer}
                openActivity={openActivity}
                preference={preference}
                revive={(target) => void revive(target)}
                enableCognition={(target) => void enableCognition(target)}
                spawn={(type, position) => void spawn(type, position)}
                createPerson={(position) => {
                  setPicker(null);
                  setPersonPosition(position);
                }}
              />
            )}
            {!tabPaused && view.godMode && itemCreation && (
              <ItemCreationModal
                options={view.godTools?.itemOptions ?? []}
                target={itemCreation.target}
                targetLabel={
                  'actorId' in itemCreation.target
                    ? itemCreation.target.actorId === view.player.id
                      ? view.player.name
                      : view.entities.find(
                          (entity) =>
                            entity.id ===
                            ('actorId' in itemCreation.target
                              ? itemCreation.target.actorId
                              : undefined),
                        )?.name
                    : undefined
                }
                initialDefinitionId={itemCreation.definitionId}
                close={() => setItemCreation(null)}
                notify={notify}
              />
            )}
            {!tabPaused && personPosition && view.godMode && (
              <PersonCreationModal
                position={personPosition}
                traits={view.godTools?.traits ?? []}
                create={(draft) => createPerson(personPosition, draft)}
                close={() => setPersonPosition(null)}
              />
            )}
            {!tabPaused &&
              view.godMode &&
              godEditors.map((editor) =>
                editor.type === 'family' ? (
                  <FamilyEditor
                    title={view.godTools?.familyLabel ?? 'Relationships'}
                    key={editor.id}
                    actorId={editor.actorId}
                    close={() =>
                      setGodEditors((current) => current.filter((item) => item.id !== editor.id))
                    }
                  />
                ) : editor.type === 'person' ? (
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
        {targeting && (
          <div className="ol-targeting-hint" role="status">
            Use {view?.player.inventory.find((item) => item.equipped)?.name}: click a highlighted
            target.
            <Button size="sm" onPress={() => setTargeting(false)}>
              Cancel · Esc
            </Button>
          </div>
        )}
        {view && (
          <CaptionGapNotice
            missed={missedCaptions.value}
            scope={captionScope(view)}
            enabled={captionsEnabled}
            onOpen={() => {
              setEventsType('speech');
              setEventsReset((value) => value + 1);
              show('events');
              // Opening history hides this notice; keep keyboard focus in the opened history.
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>('select[aria-label="World event type"]')
                  ?.focus(),
              );
            }}
            onDismiss={() => {
              missedCaptions.clear();
              canvas.current?.focus();
            }}
          />
        )}
        {!connected && view && !tabPaused && (
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
      {hover && !picker && !tabPaused && (
        <WorldHover
          name={hover.entity.name}
          point={hover.point}
          contents={view?.entities.find((entity) => entity.id === hover.entity.id)?.contents}
        />
      )}
      {view && tabPaused && tab.blocked && (
        <TabResumeDialog
          busy={tab.resuming}
          loggingOut={tab.loggingOut}
          error={tab.error}
          resume={() => void tab.enter((next) => accept(next, true), true)}
          logout={() => void tab.logout()}
        />
      )}
    </ClockOffsetContext.Provider>
  );
}
function ApplicationScope() {
  const [generation, setGeneration] = useState(0);
  const [operations, setOperations] = useState(
    () => new URLSearchParams(location.search).get('view') === 'operations',
  );
  const resetApplication = useCallback(() => setGeneration((value) => value + 1), []);
  const openOperations = useCallback(() => setOperations(true), []);
  const tab = useTabControl();
  // Characterless operator/spectator accounts, or an explicit ?view=operations tab.
  if (operations) return <OperationsConsole />;
  return (
    <App
      key={generation}
      resetApplication={resetApplication}
      onCharacterless={openOperations}
      tab={tab}
    />
  );
}
createRoot(document.getElementById('app')!).render(<ApplicationScope />);
