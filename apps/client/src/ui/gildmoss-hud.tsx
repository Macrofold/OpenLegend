import { assetUrl } from '../asset-files';
import { ProgressRing } from '../design-system/progress-ring';
import { useEffect, useRef, useState } from 'react';
import { uiOwnsShortcut } from './keyboard';
import { composerDraftScope } from '../draft';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type { GameView, InventoryItemBinding, InventoryBindingsView } from '@open-legend/protocol';
import { worldClockText, worldDayText } from '@open-legend/protocol';
import { Button, Icon, IconButton, TextTooltip } from '../design-system/components';
import { revealHorizontalChild } from '../design-system/horizontal-reveal';
import { post } from '../api';
import { InventoryCollection } from './inventory-collection';
import { useInventoryCollection } from './use-inventory-collection';
import { clockParts } from './event-time';
import { sunlightAtHour } from '../sunlight';
import { ItemIllustration } from '../design-system/item-illustration';
import './gildmoss-hud.css';

export type MainDestination = 'character' | 'skills' | 'journal' | 'map' | 'crafting';

/** The game menu and its launcher share the same approved brand artwork. */
export function GameSeal() {
  return (
    <img
      className="ol-logo-seal"
      src={assetUrl('apps/client/src/design-system/gildmoss/art/ui/logo-seal-campfire-32.png')}
      alt=""
      width={40}
      height={40}
      draggable={false}
    />
  );
}

const destinations: Array<{ id: MainDestination; label: string; icon: string; key?: string }> = [
  { id: 'character', label: 'Character', icon: 'ui.character', key: 'C' },
  { id: 'skills', label: 'Skills', icon: 'ui.skills' },
  { id: 'journal', label: 'Journal', icon: 'ui.journal', key: 'J' },
  { id: 'map', label: 'Map', icon: 'ui.map', key: 'M' },
  { id: 'crafting', label: 'Crafting', icon: 'ui.crafting', key: 'K' },
];

export function MainPanelTabs({
  selected,
  show,
  mapAvailable,
}: {
  selected: MainDestination;
  show(id: MainDestination): void;
  mapAvailable: boolean;
}) {
  return (
    <div className="ol-main-destination-strip">
      <nav
        className="ol-main-destinations"
        aria-label="Character and world records"
        onFocusCapture={(event) => {
          if (event.target instanceof HTMLButtonElement)
            revealHorizontalChild(event.currentTarget, event.target);
        }}
      >
        {destinations
          .filter(({ id }) => id !== 'map' || mapAvailable)
          .map(({ id, label, icon, key }) => (
            <Button
              key={id}
              className="ol-navigation-tab"
              icon={icon}
              variant="quiet"
              aria-current={selected === id ? 'page' : undefined}
              onPress={() => show(id)}
              aria-description={key ? `${label} (${key})` : label}
              aria-keyshortcuts={key}
            >
              <span className="ol-main-destination-label">
                {label}
                {key && (
                  <kbd className="ol-kbd" aria-hidden="true">
                    {key}
                  </kbd>
                )}
              </span>
            </Button>
          ))}
      </nav>
    </div>
  );
}

/** Uses the installed world's dawn/dusk; neither half assumes twelve hours. */
export function DaylightDial({ clock }: { clock: GameView['clock'] }) {
  const { hour, minute } = clockParts(clock.seconds, clock.offsetHours);
  const policy = clock.daylight;
  const lighting = sunlightAtHour(clock.hour, policy);
  let angle = 0;
  if (policy) {
    const dayLength = (policy.endHour - policy.startHour + 24) % 24;
    const elapsed = (clock.hour - policy.startHour + 24) % 24;
    angle = lighting.isDay
      ? Math.PI + (elapsed / dayLength) * Math.PI
      : ((elapsed - dayLength) / (24 - dayLength)) * Math.PI;
  }
  return (
    <div
      className="ol-daylight"
      aria-label={`${worldClockText(clock.seconds, clock.offsetHours, clock.dayLabel)}${clock.paused ? ', paused' : ''}`}
    >
      {policy && (
        <div className="ol-daylight-face" data-day={lighting.isDay} aria-hidden="true">
          <span className="ol-daylight-sky" />
          <img
            className="ol-dial-sunrise"
            src={assetUrl(
              'apps/client/src/design-system/gildmoss/icons/hud/hud-horizon-sunrise.svg',
            )}
            alt=""
          />
          <img
            className="ol-dial-sunset"
            src={assetUrl(
              'apps/client/src/design-system/gildmoss/icons/hud/hud-horizon-sunset.svg',
            )}
            alt=""
          />
          <span
            className="ol-daylight-orb"
            style={{
              left: `${50 + (28 / 72) * 100 * Math.cos(angle)}%`,
              top: `${50 + (28 / 72) * 100 * Math.sin(angle)}%`,
            }}
          >
            <img
              src={assetUrl(
                `apps/client/src/design-system/gildmoss/icons/hud/hud-${lighting.isDay ? 'sun' : 'moon'}.svg`,
              )}
              width={10}
              height={10}
              alt=""
            />
          </span>
        </div>
      )}
      <span>{worldDayText(clock.day, clock.dayLabel)}</span>
      <strong>
        {hour}:{minute}
      </strong>
      {clock.paused && <small>Paused</small>}
    </div>
  );
}

/** Ten stable item bindings. Activating a binding opens its real current actions,
 * so a stored shortcut never becomes stored command authority. */
export function QuickSlots({
  view,
  browse,
  connected,
  visible,
}: {
  view: GameView;
  connected: boolean;
  visible: boolean;
  browse(item: InventoryItemBinding, opener: Element): void;
}) {
  const privateScope = composerDraftScope(view);
  const storageKey = privateScope ? `open-legend:quick-slots:${privateScope}` : null;
  const [slots, setSlots] = useState<Array<string | null>>(() => {
    try {
      const saved: unknown = JSON.parse(
        (storageKey && sessionStorage.getItem(storageKey)) || 'null',
      );
      if (
        Array.isArray(saved) &&
        saved.length === 10 &&
        saved.every((id) => id === null || typeof id === 'string')
      )
        return saved;
    } catch {
      /* Optional browser storage never grants item access. */
    }
    return Array.from({ length: 10 }, (_, index) => view.player.inventory[index]?.id ?? null);
  });
  const buttons = useRef<HTMLDivElement>(null);
  const [refresh, setRefresh] = useState(0);
  const [bindings, setBindings] = useState<{
    key: string;
    items: InventoryItemBinding[];
    error?: string;
  }>();
  const readKey = JSON.stringify([
    privateScope,
    view.access?.scope,
    view.access?.controlGeneration,
    view.historyEpoch,
    view.player.inventoryRevision,
    view.player.inventoryReadRevision.bindings,
    view.player.inventoryReadRevision.disclosure,
    slots,
    refresh,
  ]);
  const available = visible && connected && !!privateScope && !!view.access?.scope;
  const currentRead = useRef<string | null>(null);
  currentRead.current = available ? readKey : null;
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    const itemIds = [...new Set(slots.filter((id): id is string => !!id))];
    if (!itemIds.length) {
      setBindings({ key: readKey, items: [] });
      return;
    }
    void post<InventoryBindingsView>('/api/inventory/bindings', { itemIds }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || currentRead.current !== readKey) return;
        if (!result.ok) throw new Error(result.message ?? 'Your quick-slot items are unavailable.');
        setBindings({ key: readKey, items: result.items });
      })
      .catch((error) => {
        if (!controller.signal.aborted && currentRead.current === readKey)
          setBindings({
            key: readKey,
            items: [],
            error: error instanceof Error ? error.message : String(error),
          });
      });
    return () => controller.abort();
  }, [readKey, available]);
  const current = available && bindings?.key === readKey ? bindings : undefined;
  const activate = useRef<(index: number, opener: Element) => void>(() => {});
  activate.current = (index, opener) => {
    const item = current?.items.find((item) => item.id === slots[index]);
    if (item) browse(item, opener);
    else setEditing(index);
  };
  useEffect(() => {
    try {
      if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(slots));
    } catch {
      /* Keep bindings usable in memory. */
    }
  }, [storageKey, slots]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        uiOwnsShortcut(event) ||
        !/^[0-9]$/.test(event.key)
      )
        return;
      const index = event.key === '0' ? 9 : Number(event.key) - 1;
      const button = buttons.current?.querySelectorAll<HTMLButtonElement>('button')[index];
      if (!button || button.closest('[hidden], [inert]')) return;
      event.preventDefault();
      activate.current(index, button);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <>
      <div ref={buttons} className="ol-gildmoss-slots" role="group" aria-label="Quick slots">
        {slots.map((id, index) => {
          const item = current?.items.find((value) => value.id === id);
          const label = item
            ? item.name
            : id
              ? available && !current
                ? 'Reading item'
                : 'Item unavailable'
              : 'Empty';
          return (
            <Button
              key={index}
              className="ol-hotbar-slot"
              variant="quiet"
              data-empty={!id || undefined}
              aria-label={`Quick slot ${index === 9 ? 0 : index + 1}: ${label}`}
              aria-description={`${label}. Right-click or press Shift+F10 to change this shortcut.`}
              onContextMenu={(event) => {
                event.preventDefault();
                setEditing(index);
              }}
              onKeyDown={(event) => {
                if (
                  !event.nativeEvent.isComposing &&
                  (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  setEditing(index);
                }
              }}
              onPress={(event) => {
                activate.current(index, event.target);
              }}
            >
              <small>{index === 9 ? 0 : index + 1}</small>
              {item && (
                <>
                  <ItemIllustration
                    art={item.art}
                    icon={item.icon ?? 'ui.inventory'}
                    label={item.name}
                    size={44}
                    fallbackSize={24}
                    nativeSize
                  />
                  {item.quantity > 1 && <span className="ol-slot-count">{item.quantity}</span>}
                </>
              )}
              {!item && id && <Icon name="ui.unavailable" />}
            </Button>
          );
        })}
      </div>
      {editing !== null && (
        <ModalOverlay
          className="ol-modal-overlay"
          isOpen
          isDismissable
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <Modal className="ol-modal ol-root ol-quick-slot-dialog">
            <Dialog aria-label="Choose a quick-slot item">
              <h2>Quick slot {editing === 9 ? 0 : editing + 1}</h2>
              <QuickSlotPicker
                view={view}
                visible={visible}
                connected={connected}
                selected={current?.items.find((item) => item.id === slots[editing])}
                error={current?.error}
                refresh={() => setRefresh((value) => value + 1)}
                choose={(id) => {
                  setSlots((values) =>
                    values.map((value, index) => (index === editing ? id : value)),
                  );
                  setEditing(null);
                }}
                cancel={() => setEditing(null)}
              />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </>
  );
}

/** Uses the inventory's existing bounded search and nested-container navigation;
 * saving a shortcut stores an ID only, never a prepared command or access grant. */
function QuickSlotPicker({
  view,
  connected,
  visible,
  selected,
  error,
  refresh,
  choose,
  cancel,
}: {
  view: GameView;
  connected: boolean;
  visible: boolean;
  selected?: InventoryItemBinding;
  error?: string;
  refresh(): void;
  choose(id: string | null): void;
  cancel(): void;
}) {
  const [selection, setSelection] = useState<InventoryItemBinding | null | undefined>(selected);
  const inventory = useInventoryCollection({
    initialId: view.player.id,
    scope: view.access?.scope ?? '',
    displayOwner: composerDraftScope(view) ?? '',
    revisionKey: JSON.stringify([
      view.player.inventoryRevision,
      view.player.inventoryReadRevision.details,
    ]),
    disclosureRevision: view.player.inventoryReadRevision.disclosure,
    visible,
    connected: connected && !!view.access?.scope,
    expectedRootId: view.player.id,
  });
  return (
    <>
      <InventoryCollection
        side="belongings"
        title="Your belongings"
        state={inventory}
        selectedId={selection?.id}
        compact
        selectionRole="choose"
        onSelectedAnchor={() => {}}
        busy={!inventory.current}
        canMove={false}
        dropActive={false}
        onNavigate={inventory.navigate}
        onSelect={setSelection}
        onContextMenu={(item) => {
          if (item.container) inventory.navigate(item.id);
          else setSelection(item);
        }}
        onQuickMove={() => {}}
        onDragStart={(item, event) => event.preventDefault()}
        onDragEnd={() => {}}
        onDrop={(event) => event.preventDefault()}
      />
      {selection && (
        <div className="ol-actions">
          <span>Selected: {selection.name}</span>
          {selection.container && (
            <Button variant="quiet" onPress={() => inventory.navigate(selection.id)}>
              Open {selection.name}
            </Button>
          )}
        </div>
      )}
      {error && (
        <div role="status">
          <p>{error}</p>
          <Button variant="quiet" onPress={refresh}>
            Refresh quick-slot items
          </Button>
        </div>
      )}
      <div className="ol-actions">
        <Button disabled={!selection} onPress={() => choose(selection?.id ?? null)}>
          Set shortcut
        </Button>
        <Button variant="quiet" onPress={() => choose(null)}>
          Empty slot
        </Button>
        <Button variant="quiet" onPress={cancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}

export function GildmossHotbar({
  view,
  connected,
  visible = true,
  mode,
  attackMode,
  toggleAttack,
  intent,
  show,
  game,
  browse,
}: {
  view: GameView;
  connected: boolean;
  visible?: boolean;
  mode?: 'speak' | 'act';
  attackMode: boolean;
  toggleAttack(): void;
  intent(mode: 'speak' | 'act'): void;
  show(id: MainDestination | 'building'): void;
  game(): void;
  browse(item: InventoryItemBinding, opener: Element): void;
}) {
  return (
    <nav className="ol-gildmoss-hotbar" aria-label="Play controls">
      <QuickSlots
        key={JSON.stringify([
          view.worldId,
          view.saveTimeline,
          view.player.id,
          view.access?.privateDraftScope,
        ])}
        view={view}
        browse={browse}
        connected={connected}
        visible={visible}
      />
      <span className="ol-hotbar-divider" />
      <div className="ol-hotbar-intents" role="group" aria-label="Speech and action modes">
        <IconButton
          icon="ui.speech"
          label="Speak (Shift+S)"
          pressed={mode === 'speak'}
          onPress={() => intent('speak')}
        />
        <IconButton
          icon="ui.act"
          label="Act (Shift+A)"
          pressed={mode === 'act'}
          onPress={() => intent('act')}
        />
        <IconButton
          icon="ui.attack-mode"
          label="Combat mode"
          pressed={attackMode}
          disabled={!connected || !view.access?.controlling}
          onPress={toggleAttack}
        />
      </div>
      <span className="ol-hotbar-divider" />
      <div className="ol-hotbar-panels" role="group" aria-label="Game panels">
        {destinations
          .filter(({ id }) => ['character', 'journal', 'crafting'].includes(id))
          .map(({ id, label, icon, key }) => (
            <IconButton
              id={`launcher-${id}`}
              key={id}
              icon={icon}
              label={`${label} (${key})`}
              onPress={() => show(id)}
            />
          ))}
        <IconButton
          id="launcher-building"
          icon="ui.build"
          label="Build (B)"
          onPress={() => show('building')}
        />
        <Button
          variant="quiet"
          id="gameMenuButton"
          className="ol-game-seal"
          aria-label="Game menu (Escape)"
          onPress={game}
        >
          <GameSeal />
        </Button>
      </div>
    </nav>
  );
}

export function ConditionStatuses({
  view,
  openCondition,
}: {
  view: GameView;
  openCondition(): void;
}) {
  const statuses = [
    ...(view.player.statusEffects ?? []),
    ...(view.player.scars ?? []).map((scar) => ({
      id: `scar:${scar.id}`,
      label: scar.name,
      explanation: scar.description,
      icon: undefined,
      timing: undefined,
      tone: undefined,
    })),
  ];
  if (!statuses.length) return null;
  const groups = [
    { label: 'Lasting effects', effects: statuses.filter((effect) => !effect.timing) },
    { label: 'Timed statuses', effects: statuses.filter((effect) => effect.timing) },
  ];
  return (
    <div className="ol-condition-status-groups" aria-label="Current conditions">
      {groups.map(
        (group) =>
          group.effects.length > 0 && (
            <div className="ol-condition-status-icons" key={group.label} aria-label={group.label}>
              {group.effects.map((effect) => {
                const timing = effect.timing;
                const remaining = timing
                  ? Math.max(0, timing.expiresAt - view.clock.seconds)
                  : undefined;
                const realSeconds =
                  remaining === undefined
                    ? undefined
                    : Math.ceil(remaining / (view.clock.baseRatio * view.clock.speed));
                const label = [
                  effect.label,
                  effect.explanation,
                  realSeconds === undefined
                    ? undefined
                    : `${view.clock.paused ? 'Paused; ' : ''}${realSeconds} seconds at the current speed`,
                ]
                  .filter(Boolean)
                  .join('. ');
                return (
                  <span
                    key={effect.id}
                    className="ol-condition-status-icon"
                    data-timed={!!timing}
                    data-tone={effect.tone ?? 'neutral'}
                  >
                    <IconButton
                      icon={effect.icon ?? 'ui.condition'}
                      label={label}
                      onPress={openCondition}
                    />
                    {timing && remaining !== undefined && (
                      // The board's elapsed gap grows clockwise from 12 o'clock, so the
                      // remaining arc occupies the counterclockwise side of that origin.
                      <ProgressRing
                        size={32}
                        direction="counterclockwise"
                        fraction={remaining / timing.durationSeconds}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          ),
      )}
    </div>
  );
}
