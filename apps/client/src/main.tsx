import { WorldComposer, type WorldIntent } from './ui/world-composer';
import { AimControls } from './ui/aim-controls';
import { modalOwnsInput, uiOwnsShortcut } from './ui/keyboard';
import { Construction } from './ui/construction';
import { FamilyEditor } from './ui/family-editor';
import { WorldEvents } from './ui/world-events';
import { GameSavesPanel } from './ui/game-saves';
import { OperationsConsole } from './ui/operations-console';
import { EntryScreen, type EntryStatus } from './ui/entry-screen';
import { EntryNotice } from './ui/entry-notice';
import { MaintenanceNotice } from './ui/maintenance-notice';
import { TabResumeDialog } from './ui/tab-resume';
import { LethalAttackDialog } from './ui/lethal-attack-dialog';
import { DeathNotice } from './ui/death-notice';
import { useTabControl, type TabControl } from './tab-control';
import { Narrator } from './ui/history';
import { Journal } from './ui/journal';
import { Settings } from './ui/settings';
import { createRoot } from 'react-dom/client';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { ClockOffsetContext, clockParts } from './ui/event-time';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type {
  ActionOption,
  ApiResult,
  CatalogueAction,
  EntityView,
  GamePatch,
  GameView,
} from '@open-legend/protocol';
import {
  AccessError,
  SignInRequiredError,
  CharacterlessError,
  WorldLoadingError,
  WorldCreationHostError,
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
import { usePrimaryAction } from './ui/primary-action';
import { CurrentWork } from './ui/current-work';
import { AiConnectionNotice, EvasionCooldown } from './ui/hud-status';
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
  SelectField,
  SegmentedControl,
  Toolbar,
  symbol,
} from './design-system/components';
import { ItemCreationModal, type ItemCreationTarget } from './ui/item-creation';
import { CreationRecoveryModal, useCreationRequest } from './ui/creation-request';
import { ActionPicker, type PickerContext } from './ui/action-picker';
import {
  PersonCreationModal,
  PersonEditor,
  WorldEventsEditor,
  type PersonDraft,
} from './ui/god-tools';
import { QuickActions } from './ui/quick-actions';
import { WorldAgent } from './ui/world-agent';
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
  | 'world-editor'
  | 'world-inspection'
  | 'building'
  | 'game'
  | 'checkpoints'
  | 'nearby'
  | 'journal'
  | 'events'
  | 'ai'
  | 'intelligence'
  | 'help'
  | 'mind';
const timeSpeeds = [0.5, 1, 3, 8];
const panelInfo: Record<PanelId, { title: string; side: 'left' | 'right'; wide?: boolean }> = {
  inventory: { title: 'Inventory', side: 'left' },
  crafting: { title: 'Craft', side: 'left' },
  building: { title: 'Build', side: 'left' },
  'world-editor': { title: 'World editor', side: 'right', wide: true },
  'world-inspection': { title: 'Inspect world', side: 'right', wide: true },
  activity: { title: 'Current task', side: 'left', wide: true },
  character: { title: 'Character', side: 'left' },
  agent: { title: 'Create', side: 'right', wide: true },
  game: { title: 'Game', side: 'right' },
  checkpoints: { title: 'Checkpoints', side: 'right', wide: true },
  nearby: { title: 'In view', side: 'right' },
  journal: { title: 'Character records', side: 'left', wide: true },
  events: { title: 'Events', side: 'left', wide: true },
  ai: { title: 'Intelligence & allowance', side: 'right' },
  intelligence: { title: 'Intelligence', side: 'right', wide: true },
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
    [sceneCreated, setSceneCreated] = useState(false),
    [notice, setNotice] = useState('');
  const [conditionPolicyRevision, setConditionPolicyRevision] = useState(0);
  const [inspectors, setInspectors] = useState<{ id: string; slot: number }[]>([]);
  const [activeInspector, setActiveInspector] = useState<string | null>(null);
  const [worldIntent, setWorldIntent] = useState<(WorldIntent & { owner: string }) | null>(null);
  const [itemCreation, setItemCreation] = useState<{
    target: ItemCreationTarget;
    definitionId?: string;
  } | null>(null);
  const [creationEntryScope, setCreationEntryScope] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<
    Pick<CameraState, 'projection' | 'rotationLocked' | 'following'>
  >({
    projection: 'orthographic',
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
  const [lethalReview, setLethalReview] = useState<{
    review: NonNullable<ApiResult['lethalReview']>;
    action: ActionOption;
  } | null>(null);
  const [lethalBusy, setLethalBusy] = useState(false);
  useEffect(
    () => setLethalReview(null),
    [
      view?.worldId,
      view?.saveTimeline,
      view?.access?.scope,
      view?.access?.controlGeneration,
      view?.player.life,
      view?.player.alive,
    ],
  );
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
  const [settingsSection, setSettingsSection] = useState('reading');
  const gameReturnFocus = useRef<Element | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [gameError, setGameError] = useState('');
  const [mindDirty, setMindDirty] = useState(false);
  const [mindSwitchMessage, setMindSwitchMessage] = useState('');
  const [inventionSeed, setInventionSeed] = useState<{
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
  const missedCaptions = useMissedCaptions(true);
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
      primaryAction: (_entity: EntityView) => {},
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
    document.documentElement.style.setProperty('--ui-scale', String(scale));
  }, [theme, reduce, scale]);
  useEffect(() => {
    document.title = view ? `Open Legend — ${view.presentation.worldName}` : 'Open Legend';
  }, [view?.presentation.worldName]);
  const { paused: tabPaused, acceptView, pause: pauseTab, isPaused, enter } = tab;
  const connected = transportReady && !tabPaused && !!view?.access?.controlling;
  const creation = useCreationRequest(view, connected);
  const showEntry = !view || (tabPaused && !tab.blocked && entryStatus.kind !== 'loading');
  const showFocusPause = !!view && tabPaused && !tab.blocked && !showEntry;
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
          // A successful load replaces the timeline, but its original outcome
          // remains readable under the same native checkpoint authority. This
          // exception never preserves an executable old-timeline command.
          clearAccess({
            preservePendingCommands: samePrivateOwner,
            preserveCheckpointResultsFor:
              previous.checkpoint?.recoveryScope === next.checkpoint?.recoveryScope
                ? next.checkpoint?.recoveryScope
                : undefined,
          });
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
  const presenceScope = !tabPaused && view?.access?.controlling ? view.access.scope : undefined;
  useEffect(() => {
    if (!presenceScope) return;
    // Report verified control before the scene effect can begin cold graphics work.
    // docs/world-presentation.md#camera-and-settings
    return startPresence(presenceScope);
  }, [presenceScope]);
  useEffect(() => {
    let streamView: GameView | undefined;
    let bootstrapVersion = 0;
    let active = true,
      source: EventSource | undefined,
      timer: ReturnType<typeof setTimeout> | undefined;
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
      source.addEventListener('timeline-changed', () => {
        if (!active || source !== connection) return;
        // The server proved that only the saved timeline changed. Old gameplay
        // commands and other private drafts still disappear; checkpoint recovery
        // is read-only and fresh state rechecks the exact retained owner.
        pauseTab();
        clearAccess({ preserveCheckpointResultsFor: current.checkpoint?.recoveryScope });
        resetApplication();
      });
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
    async function bootstrap(foreground = false) {
      const attempt = ++bootstrapVersion;
      clearTimeout(timer);
      source?.close();
      source = undefined;
      const acceptBootstrapView = (next: GameView) => {
        if (!active || attempt !== bootstrapVersion) return false;
        streamView = next;
        scene.current?.resetTransientCaptions();
        accept(next, true);
        setConnected(true);
        setEntryStatus({ kind: 'loading' });
        return true;
      };
      try {
        // Entry already reads fresh authority. Record a new foreground intent
        // before another lookup lets an older automatic attempt commit again.
        if (foreground && isPaused()) {
          await enter(acceptBootstrapView);
          return;
        }
        const initial = await getState();
        if (!acceptBootstrapView(initial)) return;
        if (isPaused()) {
          await enter((next) => {
            if (active && attempt === bootstrapVersion) accept(next, true);
          });
          return;
        }
        if (initial.access?.controlling) connectEvents();
      } catch (e) {
        if (active && attempt === bootstrapVersion) {
          setConnected(false);
          if (e instanceof WorldLoadingError) {
            // A load can remount the App before native restoration releases state reads.
            // Wait only for that explicit temporary state, under this entry's lifetime.
            setEntryStatus({ kind: 'loading' });
            timer = setTimeout(() => {
              if (active && attempt === bootstrapVersion) void bootstrap(foreground);
            }, 250);
            return;
          }
          if (e instanceof CharacterlessError) {
            clearAccess();
            onCharacterless();
            return;
          }
          if (e instanceof WorldCreationHostError) {
            setView(null);
            streamView = undefined;
            setEntryStatus({ kind: 'creation-host', host: e.host });
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
      if (isPaused()) void bootstrap(true);
    };
    window.addEventListener('focus', focus);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => {
      active = false;
      source?.close();
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
  // Full meters, the clock and useful current-work details need a horizontal
  // launcher strip on short narrow screens; centered rails leave too little room.
  const shortHud = narrow && height / scale < 780;
  const inspectedEntities = new Map(
    inspectors.length ? view?.entities.map((entity) => [entity.id, entity] as const) : [],
  );
  const raisedInspector = inspectors.some((entry) => entry.id === activeInspector)
    ? activeInspector
    : (inspectors.at(-1)?.id ?? null);
  const inspectorSheetVisible =
    narrow && activeInspector !== null && inspectors.length > 0 && open.at(-1) !== 'game';
  const inspectorOptions = inspectors.map(({ id }) => ({
    id,
    label: inspectedEntities.get(id)?.name ?? 'Out of sight',
  }));
  const panelVisible = (id: PanelId) =>
    open.includes(id) && (!narrow || (open.at(-1) === id && !inspectorSheetVisible));
  const inventoryFeedbackVisible = useRef(false);
  const activityFeedbackVisible = useRef(false);
  useLayoutEffect(() => {
    // A delayed acknowledgement belongs to the panel currently shown, not its dispatch closure.
    inventoryFeedbackVisible.current = panelVisible('inventory');
    activityFeedbackVisible.current = connected && panelVisible('activity');
    return () => {
      inventoryFeedbackVisible.current = false;
      activityFeedbackVisible.current = false;
    };
  }, [connected, narrow, open, inspectorSheetVisible]);
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
  const aimPanel =
    view?.player.action?.controls &&
    ((narrow && open.length > 0) || expandedWorkspaces.some((id) => open.includes(id)))
      ? open.at(-1)
      : undefined;
  useEffect(() => {
    if (!worldVisible || !survival.current || !hud.current || !canvas.current) return;
    return observeHudLayout(hud.current, canvas.current, survival.current, setCaptionOcclusions);
  }, [
    worldVisible,
    width,
    height,
    scale,
    open,
    inspectors,
    activeInspector,
    timeSettings,
    expandedWorkspaces,
    choosingActionSubject,
    tabPaused,
    !!view?.player.action?.controls,
    !!view?.player.hasWork,
    aimPanel,
  ]);
  const workspaceWidth = Math.min(792, Math.max(336, width / scale - 184));
  function fit(panels: PanelId[]) {
    const available = width / scale;
    if (narrow) return panels;
    // Game overlays the current tasks; its width must never evict one of them.
    const hasGame = panels.includes('game');
    let result = panels.filter((id) => id !== 'game');
    const size = (id: PanelId) =>
      expandedWorkspaces.includes(id) ? workspaceWidth : panelInfo[id].wide ? 504 : 336;
    while (
      result.length > 1 &&
      (result.reduce((n, id) => n + size(id) + 16, 0) > available - 220 ||
        (available < 1100 &&
          result.filter((id) => panelInfo[id].side === panelInfo[result.at(-1)!].side).length > 1))
    )
      result.shift();
    return hasGame ? [...result, 'game' as const] : result;
  }
  function show(id: PanelId) {
    if (id === 'game') {
      if (!panelVisible('game')) gameReturnFocus.current = document.activeElement;
      const opener = document.activeElement;
      setOpen((panels) => [...panels.filter((panel) => panel !== 'game'), 'game']);
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLButtonElement>('#gamePanel .ol-game-return');
        if (
          target &&
          !target.closest('[hidden]') &&
          (document.activeElement === opener || document.activeElement === document.body)
        )
          target.focus({ preventScroll: true });
      });
      return;
    }
    gameReturnFocus.current = null;
    setActiveInspector(null);
    if (
      ['character', 'journal', 'events', 'help', 'checkpoints', 'mind', 'intelligence'].includes(id)
    )
      setRetainedPanels((current) => (current.includes(id) ? current : [...current, id]));
    if (id === 'inventory') setInventoryOpened(true);
    if (id === 'activity') setActivityOpened(true);
    // Opening speech history is the recovery path, so it settles the missed-caption notice.
    if (id === 'events') missedCaptions.clear();
    setOpen((v) => fit([...v.filter((p) => p !== id && p !== 'game'), id]));
  }
  function openGameTask(id: PanelId) {
    const opener = document.activeElement;
    show(id);
    requestAnimationFrame(() => {
      const target = document.getElementById(`${id}Panel`);
      if (
        target &&
        !target.closest('[hidden]') &&
        (document.activeElement === opener || document.activeElement === document.body)
      )
        target
          .querySelector<HTMLButtonElement>('.ol-panel-tools button')
          ?.focus({ preventScroll: true });
    });
  }
  function hide(id: PanelId) {
    if (id === 'inventory') containerOpening.cancel();
    const focused = document.activeElement;
    const returnTo = id === 'game' ? gameReturnFocus.current : null;
    if (id === 'game') gameReturnFocus.current = null;
    const ownsFocus =
      focused === document.body ||
      (focused instanceof HTMLElement &&
        focused.closest(`#${id === 'nearby' ? 'nearbyPanel' : `${id}Panel`}`));
    setOpen((v) => v.filter((p) => p !== id));
    if (ownsFocus)
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body && document.activeElement !== focused) return;
        if (
          returnTo instanceof HTMLElement &&
          returnTo.isConnected &&
          !returnTo.closest('[hidden], [inert], [aria-hidden="true"]')
        ) {
          returnTo.focus({ preventScroll: true });
          return;
        }
        const launcher = document.querySelector<HTMLButtonElement>(
          `.ol-launcher[aria-label="${panelInfo[id].title}"]`,
        );
        (launcher ?? document.getElementById('gameMenuButton') ?? canvas.current)?.focus({
          preventScroll: true,
        });
        // Toolbar entry restores its remembered child synchronously. An explicit
        // panel return must finish on its own launcher without changing Tab reentry.
        if (
          launcher &&
          document.activeElement !== launcher &&
          launcher.closest('[role="toolbar"]')?.contains(document.activeElement)
        )
          launcher.focus({ preventScroll: true });
        if (launcher && document.activeElement === launcher)
          launcher.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
  }
  function toggle(id: PanelId) {
    if (panelVisible(id) && !inspectorSheetVisible && (id === 'game' || !open.includes('game')))
      hide(id);
    else show(id);
  }
  function showInspector(id: string) {
    gameReturnFocus.current = null;
    setOpen((panels) => panels.filter((panel) => panel !== 'game'));
    const focused = document.activeElement;
    setActiveInspector(id);
    if (narrow)
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body && document.activeElement !== focused) return;
        const inspection = [...document.querySelectorAll<HTMLElement>('[data-inspector-id]')].find(
          (element) => element.dataset.inspectorId === id && !element.hidden,
        );
        inspection
          ?.querySelector<HTMLElement>('.ol-inspector-switch input, .ol-panel-tools button')
          ?.focus({ preventScroll: true });
      });
  }
  function closeInspector(id: string) {
    const remaining = inspectors.filter((entry) => entry.id !== id);
    const focused = document.activeElement;
    const ownsFocus =
      focused === document.body ||
      (focused instanceof HTMLElement &&
        focused.closest<HTMLElement>('[data-inspector-id]')?.dataset.inspectorId === id);
    setInspectors(remaining);
    setActiveInspector((current) => (current === id ? (remaining.at(-1)?.id ?? null) : current));
    if (ownsFocus)
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body && document.activeElement !== focused) return;
        const next = remaining.at(-1)?.id;
        const inspection = [...document.querySelectorAll<HTMLElement>('[data-inspector-id]')].find(
          (element) => element.dataset.inspectorId === next && !element.hidden,
        );
        const panel = open.length ? document.getElementById(`${open.at(-1)}Panel`) : null;
        const target = inspection ?? (panel?.closest('[hidden]') ? null : panel);
        (
          target?.querySelector<HTMLButtonElement>('.ol-panel-tools button') ?? canvas.current
        )?.focus({ preventScroll: true });
      });
  }
  useEffect(() => setOpen((v) => fit(v)), [width, height, scale, expandedWorkspaces]);
  async function sendCommand(
    action: ActionOption,
    request?: CommandRequestIdentity,
    acknowledgement: 'notice' | 'inventory' | 'activity' = 'notice',
  ): Promise<ApiResult> {
    if (
      (isPaused() &&
        !['inspect-inventory', 'cancel'].includes(action.command.type) &&
        !(
          action.command.type === 'outing' &&
          ['leave', 'decline'].includes(action.command.outingOperation ?? '')
        )) ||
      !latest.current?.access?.controlling
    ) {
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
    const requestedLife = latest.current?.player.life;
    const requestedScope = latest.current?.access?.scope;
    // A task switch replaces this group; its pending result still belongs to the original reader.
    const activityFeedback =
      acknowledgement === 'activity'
        ? hud.current?.querySelector('#activityPanel .ol-camp-activities')
        : null;
    try {
      const r = await post('/api/command', {
        commandId: request?.commandId ?? crypto.randomUUID(),
        commandEpoch: request?.commandEpoch ?? view?.commandEpoch,
        command: action.command,
      });
      // The original caller may still recover its receipt, but a later character
      // or control session must not receive that action's notification or prompt.
      // docs/ui-ux/react.md#effects-asynchronous-work-and-mutations
      if (latest.current?.access?.scope !== requestedScope) return r;
      if (
        r.lethalReview &&
        !latest.current?.player.death &&
        latest.current?.player.life === requestedLife
      ) {
        setLethalReview({ review: r.lethalReview, action });
        return r;
      }
      const feedback =
        acknowledgement === 'inventory' && inventoryFeedbackVisible.current
          ? hud.current?.querySelector('#inventoryPanel .ol-inventory-feedback')
          : acknowledgement === 'activity' &&
              activityFeedbackVisible.current &&
              activityFeedback?.isConnected
            ? activityFeedback
            : null;
      const localReceipt = feedback && !feedback.closest('[hidden], [inert], [aria-hidden="true"]');
      if (!r.ok || (r.code !== 'accepted' && !localReceipt)) notify(r.message);
      return r;
    } catch (e) {
      const message = `${String(e)} The action's outcome is unconfirmed. Check Events and the world before repeating it; a missing event does not prove it failed.`;
      if (latest.current?.access?.scope === requestedScope) notify(message);
      return {
        ok: false,
        code: 'unconfirmed',
        message,
      };
    }
  }
  const containerOpening = useContainerOpening(view, connected, sendCommand);
  function command(
    action: ActionOption,
    request?: CommandRequestIdentity,
    acknowledgement: 'notice' | 'inventory' | 'activity' = 'notice',
  ): Promise<ApiResult> {
    if (connected && action.enabled) containerOpening.stopFollowing();
    return sendCommand(action, request, acknowledgement);
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
  async function confirmLethalAttack() {
    if (!lethalReview || lethalBusy) return;
    setLethalBusy(true);
    try {
      const result = await command({
        ...lethalReview.action,
        command: { ...lethalReview.action.command, lethalReviewId: lethalReview.review.id },
      });
      if (!('lethalReview' in result) || !result.lethalReview) setLethalReview(null);
    } finally {
      setLethalBusy(false);
    }
  }
  function talk(id: string) {
    const current = latest.current;
    const recipient = current?.entities.find((entity) => entity.id === id && entity.canTalk);
    if (!current || !recipient) return;
    setWorldIntent({
      mode: 'speak',
      targetId: id,
      label: recipient.name,
      owner: JSON.stringify([current.worldId, current.saveTimeline, current.player.id]),
    });
    setPicker(null);
  }
  function talkAbout(item: { itemId: string; name: string; recipientId?: string }) {
    const current = latest.current;
    if (!current) return;
    const recipient = current.entities.find(
      (entity) => entity.canTalk && entity.id === item.recipientId,
    );
    setWorldIntent({
      mode: 'speak',
      ...(recipient ? { targetId: recipient.id, label: recipient.name } : {}),
      item: { id: item.itemId, name: item.name },
      owner: JSON.stringify([current.worldId, current.saveTimeline, current.player.id]),
    });
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
    if (entity.id === view?.player.id) show('character');
    else {
      setInspectors((current) => {
        const existing = current.find((entry) => entry.id === entity.id);
        if (existing) return current;
        const used = new Set(current.map((entry) => entry.slot));
        let slot = 0;
        while (used.has(slot)) slot++;
        return [...current.filter((entry) => entry.id !== entity.id), { id: entity.id, slot }];
      });
      showInspector(entity.id);
    }
    setPicker(null);
  }
  function clearSelection() {
    setSelected(null);
    scene.current?.select(null);
  }
  const primaryAction = usePrimaryAction(view, connected && !tabPaused, run, notify);
  handlers.current = {
    primaryAction,
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
  const failScene = useCallback((error: unknown) => {
    scene.current?.destroy();
    scene.current = null;
    setSceneCreated(false);
    setSceneError(`${String(error)}. The In view list still provides interactions.`);
  }, []);
  useEffect(() => {
    const initial = latest.current;
    const surface = canvas.current;
    if (!initial || !surface || sceneError || scene.current || tabPaused) return;
    let cancelled = false;
    let frame = 0;
    let task: number | undefined;
    let allocated: WorldRenderer | null = null;
    const discard = () => {
      allocated?.destroy();
      allocated = null;
    };
    const current = () => {
      const next = latest.current;
      return (
        !cancelled &&
        !isPaused() &&
        canvas.current === surface &&
        next?.worldId === initial.worldId &&
        next.saveTimeline === initial.saveTimeline &&
        next.access?.scope === initial.access?.scope &&
        next.player.id === initial.player.id
      );
    };
    // Graphics allocation and the first world draw can each block. Give input
    // and paint a turn between them, without postponing ordinary view updates.
    const schedule = (next: () => void) => {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          task = window.setTimeout(next, 0);
        });
      });
    };
    schedule(() => {
      if (!current()) return;
      try {
        allocated = createWorldRenderer(surface, {
          select: (...args) => handlers.current.select(...args),
          move: (p) => handlers.current.move(p),
          target: (entity) => handlers.current.target(entity),
          primaryAction: (entity) => handlers.current.primaryAction(entity),
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
          cameraChanged: ({ projection, rotationLocked, following }) =>
            setCameraView((previous) =>
              previous.projection === projection &&
              previous.rotationLocked === rotationLocked &&
              previous.following === following
                ? previous
                : { projection, rotationLocked, following },
            ),
        });
        allocated.setSuspended(true);
        schedule(() => {
          if (!current()) {
            discard();
            return;
          }
          scene.current = allocated;
          allocated = null;
          setSceneCreated(true);
        });
      } catch (error) {
        discard();
        failScene(error);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(task);
      discard();
    };
  }, [
    view?.worldId,
    view?.saveTimeline,
    view?.access?.scope,
    view?.player.id,
    sceneError,
    tabPaused,
    isPaused,
    failScene,
  ]);
  useEffect(() => {
    if (!view || !scene.current || sceneError) return;
    try {
      scene.current.setSuspended(tabPaused);
      scene.current.setShadowQuality(shadowQuality);
      scene.current.setPerceptionOptions({
        vision: visionGuide,
        hearing: hearingGuide,
      });
      scene.current.setView(view);
    } catch (error) {
      failScene(error);
    }
  }, [view, sceneError, shadowQuality, tabPaused, sceneCreated, failScene]);
  useEffect(() => {
    // List inspection can precede graphics. Replay once; inspect/clear own later selections.
    if (
      sceneCreated &&
      selected &&
      (selected === view?.player.id || view?.entities.some((entity) => entity.id === selected))
    )
      scene.current?.select(selected);
  }, [sceneCreated]);
  useEffect(() => {
    scene.current?.setPerceptionOptions({
      vision: visionGuide,
      hearing: hearingGuide,
    });
  }, [worldVisible, sceneCreated, sceneError, visionGuide, hearingGuide]);
  useEffect(() => {
    scene.current?.setTargeting(targeting && connected && !tabPaused && !choosingActionSubject);
  }, [
    targeting,
    connected,
    tabPaused,
    worldVisible,
    sceneCreated,
    sceneError,
    choosingActionSubject,
  ]);
  useEffect(() => {
    setTargeting(false);
  }, [view?.access?.scope, view?.saveTimeline, tabPaused, connected]);
  useEffect(() => {
    scene.current?.setCaptionOptions({
      enabled: true,
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
    sceneCreated,
    sceneError,
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
      if (e.defaultPrevented || e.isComposing || isPaused() || modalOwnsInput()) return;
      if (e.key === 'Escape') {
        if (e.repeat) return;
        // Child popups own the first Escape. Ordinary retained panels keep their
        // drafts and reading position while the Game menu opens above them.
        if (document.querySelector('[role="listbox"], [role="menu"]')) return;
        e.preventDefault();
        if (choosingActionSubject) {
          finishActionSubject();
        } else if (picker) {
          closePicker();
        } else if (targeting) {
          setTargeting(false);
        } else if (timeSettings) setTimeSettings(false);
        else if (panelVisible('game')) hide('game');
        else if (view) show('game');
        return;
      }
      if (choosingActionSubject) return;
      if (uiOwnsShortcut(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.shiftKey && (e.code === 'KeyS' || e.code === 'KeyA')) {
        if (!view || !connected || e.repeat) return;
        e.preventDefault();
        setWorldIntent({
          mode: e.code === 'KeyS' ? 'speak' : 'act',
          owner: JSON.stringify([view.worldId, view.saveTimeline, view.player.id]),
        });
        setPicker(null);
        return;
      }
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
        j: 'events',
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
  function run(a: CatalogueAction, dispatchCommand?: (action: ActionOption) => Promise<ApiResult>) {
    if (a.intent.kind === 'command')
      void (dispatchCommand ?? command)({
        id: a.id,
        label: a.label,
        enabled: a.enabled,
        command: a.intent.command,
        reason: a.reason,
      });
    else if (a.intent.kind === 'activity' && a.targetId && a.enabled) {
      openActivity({
        familyId: a.intent.family,
        targetId: a.targetId,
        label: a.label,
        description: a.description,
      });
    } else if (a.intent.kind === 'compose') {
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
    const opened = currentPicker.current;
    const result = await creation.create({
      kind: 'environment',
      body: { type, position },
      label: `Create ${view?.godTools?.spawnOptions.find((option) => option.id === type)?.label ?? type}`,
      destinationLabel: `On the selected ground at ${position.x.toFixed(1)}, ${position.z.toFixed(1)}.`,
    });
    if (result) {
      notify(result.message);
      if (result.ok && currentPicker.current === opened) setPicker(null);
    }
  }
  async function createPerson(
    position: { x: number; y: number; z: number; surfaceId: string },
    draft: PersonDraft,
  ) {
    const result = await creation.create({
      kind: 'person',
      body: { position, ...draft },
      label: `Create ${draft.name}`,
      destinationLabel: `On the selected ground at ${position.x.toFixed(1)}, ${position.z.toFixed(1)}.`,
    });
    if (result?.ok) notify(result.message);
    return result;
  }
  function openItemCreation(value: NonNullable<typeof itemCreation>) {
    if (!creation.openEntry()) return;
    setCreationEntryScope(creation.key);
    setPersonPosition(null);
    setItemCreation(value);
  }
  function closeCreationRecovery() {
    creation.hide();
    setItemCreation(null);
    setPersonPosition(null);
    setPicker(null);
  }
  const title = (id: PanelId) =>
    id === 'activity' && activityEntry
      ? activityEntry.label
      : id === 'nearby' && choosingActionSubject
        ? 'Choose a subject'
        : id === 'intelligence' && intelligenceSelection
          ? `${intelligenceSelection.actorName ?? 'World agent'} request`
          : panelInfo[id].title;
  function actionBrowser(
    picker: PickerContext,
    presentation: 'context' | 'inspection' = 'context',
    visible = true,
  ) {
    if (!view) return null;
    return (
      <ActionPicker
        key={JSON.stringify([presentation, picker.context, picker.point])}
        createItem={(definitionId, position) => {
          openItemCreation({ definitionId, target: { position } });
          setPicker(null);
        }}
        presentation={presentation}
        visible={visible}
        picker={picker}
        view={view}
        connected={connected}
        close={closePicker}
        run={(action) => run(action, picker.dispatchCommand)}
        invent={invent}
        inspect={inspect}
        openContainer={openContainer}
        openActivity={openActivity}
        compose={(mode) => {
          const targetId = picker.context.itemId ?? picker.context.targetId;
          setWorldIntent({
            mode,
            owner: JSON.stringify([view.worldId, view.saveTimeline, view.player.id]),
            ...(targetId &&
            targetId !== view.player.id &&
            (mode === 'act' || !!picker.entity?.canTalk)
              ? {
                  targetId,
                  label: picker.item?.name ?? picker.entity?.name,
                  possession: !!picker.context.itemId,
                }
              : {}),
          });
          setPicker(null);
        }}
        revive={(target) => void revive(target)}
        enableCognition={(target) => void enableCognition(target)}
        spawn={(type, position) => void spawn(type, position)}
        createPerson={(position) => {
          setPicker(null);
          if (!creation.openEntry()) return;
          setCreationEntryScope(creation.key);
          setItemCreation(null);
          setPersonPosition(position);
        }}
      />
    );
  }
  function content(id: PanelId) {
    if (!view) return null;
    // Quiet pause leaves the player's reading place mounted. Each reader owns
    // request cancellation and privacy loss; inactive control never permits writes.
    const visible = connected && panelVisible(id);
    const props = {
      view,
      connected,
      command: (a: ActionOption) => command(a),
    };
    switch (id) {
      case 'inventory':
        return (
          <>
            <ContainerOpening state={containerOpening} paused={view.clock.paused} />
            <Inventory
              {...props}
              narrow={narrow}
              showHeading={false}
              browseActions={(item, opener, dispatchCommand) => {
                const bounds = opener.getBoundingClientRect();
                setPicker({
                  context: {
                    itemId: item.id,
                    inventoryGroup: item.group?.token,
                    quantity: item.availableQuantity,
                  },
                  browse: true,
                  item: { id: item.id, name: item.name },
                  point: { x: bounds.right, y: bounds.top },
                  entity: null,
                  opener,
                  dispatchCommand,
                });
              }}
              command={(action, request) => command(action, request, 'inventory')}
              openContainer={containerOpening.openContainer}
              onTalkAbout={talkAbout}
              visible={panelVisible('inventory')}
              addItem={() => openItemCreation({ target: { actorId: view.player.id } })}
              contextMenu={(item, point, opener, dispatchCommand) =>
                setPicker({
                  context: {
                    itemId: item.id,
                    inventoryGroup: item.group?.token,
                    quantity: item.availableQuantity,
                  },
                  item: { id: item.id, name: item.name },
                  point,
                  entity: null,
                  opener,
                  dispatchCommand,
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
            command={(action, request) => command(action, request, 'activity')}
            entry={activityEntry}
            visible={connected && panelVisible('activity')}
          />
        );
      case 'crafting':
        return <Crafting {...props} invent={() => invent()} />;
      case 'building':
        return (
          <Construction
            key={taskScope(view)}
            view={view}
            connected={connected}
            visible={panelVisible('building')}
            command={command}
            placement={(controls) => scene.current?.setConstructionPlacement(controls)}
            preview={(shapes, valid, transform) =>
              scene.current?.setConstructionPreview(shapes, valid, transform)
            }
          />
        );
      case 'character':
        return (
          <>
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
              godControls={characterGodControls(playerEntity(view))}
              openActivity={() => openActivity()}
              openMind={() => openMind(view.player.id)}
            />
          </>
        );
      case 'nearby':
        return (
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
      case 'world-editor':
      case 'world-inspection':
        return (
          <WorldAgent
            mode={id === 'agent' ? 'invent' : id === 'world-editor' ? 'author' : 'inspect'}
            conditionPolicyRevision={conditionPolicyRevision}
            onStatusPolicyChanged={() => setConditionPolicyRevision((value) => value + 1)}
            actorId={view.player.id}
            accessScope={view.access?.privateDraftScope ?? view.player.id}
            requestScope={view.access?.scope ?? ''}
            inspectionScope={JSON.stringify([view.access?.scope, view.historyEpoch])}
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
            visible={visible}
          />
        );
      case 'ai':
        return <AiSettings view={view} />;
      case 'events':
        return (
          <WorldEvents
            view={view}
            inspectEntity={(id) => {
              const target =
                id === view.player.id
                  ? playerEntity(view)
                  : view.entities.find((entity) => entity.id === id);
              if (target) inspect(target);
              else notify('This person or object is not currently in view.');
            }}
            key={eventsReset}
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
            <Journal
              key={taskScope(view)}
              view={view}
              visible={visible}
              storyRequest={storyRequest}
              command={command}
              focus={(point) => {
                const renderer = scene.current;
                if (!renderer) return;
                if (renderer.cameraState().following) renderer.cameraCommand({ type: 'follow' });
                renderer.cameraCommand({ type: 'focus', point });
              }}
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
              evidenceEpoch={view.historyEpoch}
            />
          </>
        ) : null;
      case 'game':
        return (
          <div className="ol-game-menu">
            <header className="ol-game-brand">
              <h1 className="t-wordmark">OPEN LEGEND</h1>
              <strong>{view.presentation.worldName}</strong>
              <p className="ol-caption">Playing as {view.player.name}</p>
            </header>
            <Button className="ol-game-return" variant="primary" onPress={() => hide('game')}>
              Back to the world
            </Button>
            <Section title="Your game">
              <p role={view.persistence.status === 'error' ? 'alert' : undefined}>
                {view.persistence.message}
              </p>
              {view.access?.canManageSaves && (
                <Button onPress={() => openGameTask('checkpoints')}>Checkpoints</Button>
              )}
              <Button onPress={() => openGameTask('help')}>Settings & help</Button>
              <Button
                onPress={() => {
                  setSettingsSection('controls');
                  openGameTask('help');
                }}
              >
                Controls
              </Button>
              <Button disabled aria-describedby="gameEncyclopediaHelp">
                Encyclopedia
              </Button>
              <p id="gameEncyclopediaHelp" className="ol-caption">
                Not available yet.
              </p>
              <Button onPress={() => openGameTask('ai')}>Intelligence & allowance</Button>
            </Section>
            <Section title="Create">
              <Button onPress={() => openGameTask('agent')}>Invent something</Button>
              <p className="ol-caption">
                Describe an idea, find learned recipes, or revisit a request.
              </p>
            </Section>
            {(view.godMode || view.access?.canOperate) && (
              <Section title="World tools">
                {view.godMode && (
                  <>
                    <Button onPress={() => openGameTask('world-editor')}>World editor</Button>
                    <p className="ol-caption">
                      Chat about changes to the world, then review and apply them.
                    </p>
                    <Button onPress={() => openGameTask('world-inspection')}>Inspect world</Button>
                    <Button onPress={() => openGameTask('intelligence')}>
                      Intelligence diagnostics
                    </Button>
                  </>
                )}
                {view.access?.canOperate && (
                  <a href="/?view=operations" target="_blank" rel="noopener">
                    World operations — opens separately
                  </a>
                )}
              </Section>
            )}
            {view.player.departureNotice && <p>{view.player.departureNotice}</p>}
            <Button busy={loggingOut} onPress={() => void leaveAccount()}>
              Log Out
            </Button>
            {gameError && <p role="alert">{gameError}</p>}
          </div>
        );
      case 'checkpoints':
        return view.access?.canManageSaves && view.checkpoint ? (
          <GameSavesPanel
            key={view.checkpoint.recoveryScope}
            context={view.checkpoint}
            visible={visible}
          />
        ) : null;
      case 'help':
        return (
          <Settings
            view={view}
            section={settingsSection}
            setSection={setSettingsSection}
            theme={theme}
            setTheme={setTheme}
            scale={scale}
            setScale={setScale}
            reduce={reduce}
            setReduce={setReduce}
            captionsPaused={captionsPaused}
            setCaptionsPaused={setCaptionsPaused}
            captionReadingScale={captionReadingScale}
            setCaptionReadingScale={setCaptionReadingScale}
            shadowQuality={shadowQuality}
            setShadowQuality={setShadowQuality}
            performance={performance}
            setPerformance={setPerformance}
            browseActions={(opener) => {
              const bounds = opener.getBoundingClientRect();
              setPicker({
                context: { catalogue: true },
                point: { x: bounds.right, y: bounds.top },
                entity: null,
                opener,
              });
            }}
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
        inert={tabPaused}
      />
      <div
        ref={hud}
        className="ol-root ol-hud"
        data-theme={theme}
        data-reduce-motion={reduce}
        data-narrow={narrow}
        data-compact={width / scale < 1200}
        data-tight={width / scale < 360}
        data-short={shortHud}
        data-picking={choosingActionSubject}
        style={{ '--ui-scale': scale } as CSSProperties}
        inert={tabPaused && !showEntry}
      >
        {showEntry && (
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
        )}
        {view && (
          // Keep the last game view and drafts visible through ordinary focus loss.
          // Actual entry/return failures retain their separate retry screen.
          <div className="ol-play-workspace" hidden={showEntry} inert={tabPaused}>
            <section ref={survival} className="ol-card ol-survival" aria-label="Your condition">
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
              </div>
              <Condition {...view.player} />
              <EvasionCooldown evasion={view.player.evasion} />

              {(view.player.participation !== 'active' || !view.player.alive) && (
                <p className="ol-caption ol-player-state">
                  {view.player.participation === 'inactive'
                    ? 'Away from the world'
                    : view.player.participation === 'exiting'
                      ? 'Preparing to leave'
                      : !view.player.alive
                        ? 'Life has ended'
                        : null}
                </p>
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
            <CurrentWork
              key={taskScope(view)}
              player={view.player}
              review={() => {
                setWorkEntry((value) => value + 1);
                show('character');
              }}
            />
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
                    <div className="ol-timebar-location">{view.presentation.locationName}</div>
                    {(view.clock.paused || view.clock.preparingNavigation) && (
                      <div className="ol-timebar-status">
                        {view.clock.paused
                          ? view.clock.pauseReason === 'maintenance'
                            ? 'Paused for maintenance'
                            : 'Paused'
                          : 'Preparing navigation…'}
                      </div>
                    )}
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
              {view.player.action?.controls && !aimPanel && (
                <div className="ol-card ol-aim-status">
                  <AimControls
                    action={view.player.action}
                    connected={connected}
                    controlling={!!view.access?.controlling}
                    command={(choice) => void command(choice)}
                  />
                </div>
              )}
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
                    width / scale < 360 ||
                    shortHud ||
                    (narrow && (open.length > 0 || inspectors.length > 0))
                      ? 'horizontal'
                      : 'vertical'
                  }
                  aria-label={
                    side === 'left' ? 'Your character and records' : 'World actions and creation'
                  }
                >
                  {(side === 'left'
                    ? (['inventory', 'character', 'events', 'journal'] as PanelId[])
                    : (['nearby', 'crafting', 'building', 'agent'] as PanelId[])
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
                          building: 'ui.build',
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
                          events: 'J',
                        }[id as 'inventory']
                      }
                      onPress={() => toggle(id)}
                    />
                  ))}
                  {side === 'right' && (
                    <Launcher
                      icon="ui.speech"
                      label="Speak"
                      open={worldIntent?.mode === 'speak'}
                      side="right"
                      onPress={() =>
                        setWorldIntent({
                          mode: 'speak',
                          owner: JSON.stringify([view.worldId, view.saveTimeline, view.player.id]),
                        })
                      }
                    />
                  )}
                </Toolbar>
              ))}
            </div>
            {narrow && (open.length > 0 || inspectors.length > 0) && (
              <div
                className="ol-mobile-tabs"
                data-single={open.length + Number(inspectors.length > 0) === 1 ? 'true' : undefined}
                role="toolbar"
                aria-label="Open panels"
              >
                {open.map((id) => (
                  <Button
                    key={id}
                    size="sm"
                    variant={!inspectorSheetVisible && id === open.at(-1) ? 'primary' : 'quiet'}
                    onPress={() => show(id)}
                  >
                    {panelInfo[id].title}
                  </Button>
                ))}
                {raisedInspector && (
                  <Button
                    size="sm"
                    variant={inspectorSheetVisible ? 'primary' : 'quiet'}
                    onPress={() => showInspector(raisedInspector)}
                  >
                    Inspect
                  </Button>
                )}
              </div>
            )}
            {(['left', 'right', 'game'] as const).map((side) => (
              <div
                key={side}
                className={`ol-dock ol-dock-${side}`}
                data-side={side === 'game' ? 'right' : side}
              >
                {(Object.keys(panelInfo) as PanelId[])
                  .filter((id) =>
                    side === 'game' ? id === 'game' : id !== 'game' && panelInfo[id].side === side,
                  )
                  .map((id) => (
                    <div
                      key={id}
                      className="ol-panel-slot"
                      hidden={!panelVisible(id)}
                      style={{ order: open.indexOf(id) }}
                      onPointerDownCapture={() => {
                        if (id !== 'game') setActiveInspector(null);
                      }}
                      onFocusCapture={() => {
                        if (id !== 'game') setActiveInspector(null);
                      }}
                    >
                      <Panel
                        title={title(id)}
                        id={id === 'nearby' ? 'nearbyPanel' : `${id}Panel`}
                        wide={panelInfo[id].wide}
                        draggable={!narrow}
                        resizable={!narrow && id === 'intelligence'}
                        workspace={
                          [
                            'inventory',
                            'agent',
                            'world-editor',
                            'world-inspection',
                            'journal',
                            'events',
                            'character',
                            'mind',
                          ].includes(id)
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
                        footer={
                          id === aimPanel && view.player.action?.controls ? (
                            <AimControls
                              action={view.player.action}
                              connected={connected}
                              controlling={!!view.access?.controlling}
                              command={(choice) => void command(choice)}
                            />
                          ) : undefined
                        }
                        onClose={() => hide(id)}
                        onBack={
                          id === 'intelligence' && intelligenceSelection
                            ? () => setIntelligenceSelection(null)
                            : undefined
                        }
                        backLabel={id === 'intelligence' ? 'Intelligence' : 'In view'}
                      >
                        {id === 'agent' ||
                        id === 'world-editor' ||
                        id === 'world-inspection' ||
                        id === 'building' ||
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
            <div
              className="ol-inspectors"
              style={{
                zIndex:
                  activeInspector && !panelVisible('game') ? 'calc(var(--z-sheet) + 2)' : undefined,
              }}
            >
              {inspectors.map(({ id, slot }, index) => {
                const inspected = inspectedEntities.get(id);
                const raised = raisedInspector === id;
                return (
                  <div
                    key={`${taskScope(view)}:${id}`}
                    className="ol-inspector-slot"
                    data-inspector-id={id}
                    hidden={narrow && (!raised || !inspectorSheetVisible)}
                    style={
                      {
                        '--inspector-offset': `${(slot % 5) * 24}px`,
                        zIndex: raised ? inspectors.length : index,
                      } as CSSProperties
                    }
                    onPointerDownCapture={() => setActiveInspector(id)}
                    onFocusCapture={() => setActiveInspector(id)}
                  >
                    <Panel
                      title={inspected?.name ?? 'Out of sight'}
                      draggable={!narrow}
                      tabs={
                        narrow && inspectors.length > 1 ? (
                          <div className="ol-inspector-switch">
                            <SelectField
                              label="Open inspections"
                              value={id}
                              options={inspectorOptions}
                              onChange={showInspector}
                            />
                          </div>
                        ) : undefined
                      }
                      onClose={() => closeInspector(id)}
                    >
                      {inspected ? (
                        <EntityDetail
                          entity={inspected}
                          view={view}
                          connected={connected}
                          command={command}
                          godControls={characterGodControls(inspected)}
                          actionBrowser={actionBrowser(
                            { entity: inspected, context: { targetId: id }, point: { x: 0, y: 0 } },
                            'inspection',
                            !narrow || (raised && inspectorSheetVisible),
                          )}
                        />
                      ) : (
                        <EmptyState title="No longer in sight">
                          Look at this person or object again to inspect it.
                        </EmptyState>
                      )}
                    </Panel>
                  </div>
                );
              })}
            </div>
            <div
              className="ol-world-controls"
              data-bounded={narrow && open.length === 0 ? '' : undefined}
            >
              <QuickActions
                key={`quick:${captionScope(view)}`}
                view={view}
                connected={connected && !choosingActionSubject}
                command={(a) => void command(a)}
                talk={talk}
              />
              <CameraControls
                overlays={{ vision: visionGuide, hearing: hearingGuide }}
                toggleOverlay={(sense) =>
                  sense === 'vision' ? setVisionGuide(!visionGuide) : setHearingGuide(!hearingGuide)
                }
                state={cameraView}
                send={(command) => scene.current?.cameraCommand(command)}
                center={() => scene.current?.center()}
              />
            </div>
            <div hidden={tabPaused}>
              <Narrator
                key={JSON.stringify([
                  view.worldId,
                  view.saveTimeline,
                  view.player.id,
                  view.player.life,
                  view.access?.privateDraftScope,
                  view.historyEpoch,
                ])}
                item={view.narrator}
                onReadStory={readStory}
              />
            </div>
            {!tabPaused && performance && <FpsCounter renderer={scene} />}
            {!tabPaused && picker && !creation.visible && actionBrowser(picker)}
            <WorldComposer
              key={JSON.stringify([
                view.worldId,
                view.saveTimeline,
                view.player.id,
                view.player.life,
              ])}
              view={view}
              connected={connected}
              intent={
                worldIntent?.owner ===
                JSON.stringify([view.worldId, view.saveTimeline, view.player.id])
                  ? worldIntent
                  : null
              }
              visible={!tabPaused && !picker}
              close={() => {
                setWorldIntent(null);
                canvas.current?.focus();
              }}
              setup={() => show('ai')}
            />
            {!tabPaused &&
              view.godMode &&
              itemCreation &&
              creationEntryScope === creation.key &&
              !creation.visible && (
                <ItemCreationModal
                  key={`item:${creation.key}`}
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
                  enabled={creation.enabled}
                  close={() => setItemCreation(null)}
                  create={async (definitionId, quantity) => {
                    const target = itemCreation.target;
                    const result = await creation.create({
                      kind: 'item',
                      body: { definitionId, quantity, destination: target },
                      label: `Create ${quantity} ${view.godTools?.itemOptions.find((option) => option.id === definitionId)?.label ?? definitionId}`,
                      destinationLabel:
                        'actorId' in target
                          ? `In ${target.actorId === view.player.id ? view.player.name : (view.entities.find((entity) => entity.id === target.actorId)?.name ?? 'the selected character')}’s inventory.`
                          : `On the selected ground at ${target.position.x.toFixed(1)}, ${target.position.z.toFixed(1)}.`,
                    });
                    if (result?.ok) notify(result.message);
                    return result;
                  }}
                />
              )}
            {!tabPaused &&
              personPosition &&
              view.godMode &&
              creationEntryScope === creation.key &&
              !creation.visible && (
                <PersonCreationModal
                  key={`person:${creation.key}`}
                  position={personPosition}
                  traits={view.godTools?.traits ?? []}
                  enabled={creation.enabled}
                  create={(draft) => createPerson(personPosition, draft)}
                  close={() => setPersonPosition(null)}
                />
              )}
            {!tabPaused && view.godMode && creation.visible && (
              <CreationRecoveryModal
                key={creation.key}
                recovery={creation}
                close={closeCreationRecovery}
                resolved={(result) => {
                  notify(result.message);
                  closeCreationRecovery();
                }}
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
          </div>
        )}
        <div id="toast" role="status" className="ol-toast" hidden={!notice}>
          {notice}
        </div>
        {targeting && (
          <div className="ol-targeting-hint" role="status">
            {hover?.entity.equippedAction?.label ??
              'Choose a highlighted target for an equipped-item action.'}
            <Button size="sm" onPress={() => setTargeting(false)}>
              Cancel — Esc
            </Button>
          </div>
        )}
        {view && (
          <CaptionGapNotice
            missed={missedCaptions.value}
            scope={captionScope(view)}
            enabled={true}
            onOpen={() => {
              setEventsType('speech');
              setEventsReset((value) => value + 1);
              show('events');
              // Opening history hides this notice; keep keyboard focus in the opened history.
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>(
                    '#eventsPanel .ol-event-filters button[aria-pressed="true"]',
                  )
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
          key={hover?.entity.id}
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
      {view?.player.death && (
        <div className="ol-play-workspace" inert={tabPaused}>
          <DeathNotice view={view} command={command} />
        </div>
      )}
      {showFocusPause && (
        <ModalOverlay
          className="ol-root ol-focus-pause"
          data-theme={theme}
          style={{ '--ui-scale': scale } as CSSProperties}
          isOpen
          isKeyboardDismissDisabled
        >
          <Modal>
            <Dialog className="ol-focus-pause-message" aria-label="Game is paused.">
              Game is paused.
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
      {lethalReview && !tabPaused && (
        <LethalAttackDialog
          review={lethalReview.review}
          busy={lethalBusy}
          cancel={() => setLethalReview(null)}
          confirm={() => void confirmLethalAttack()}
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
