import { namePhrase } from '@open-legend/language';
import { godCharacterAvailability } from './god-character-actions';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type {
  ActionCatalogue,
  ActionContext,
  CatalogueAction,
  EntityView,
  GameView,
  PlayerProfile,
} from '@open-legend/protocol';
import { filterActions, retainActionOrder } from '../action-browser';
import { post } from '../api';
import { Icon, IconButton, symbol } from '../design-system/components';
import { ActionChoice } from './action-choice';
import { spawnIcons } from './god-tools';
import { PulloutPicker } from './pullout';
export type PickerContext = {
  context: ActionContext;
  point: { x: number; y: number };
  entity: EntityView | null;
  item?: { id: string; name: string };
  opener?: HTMLElement;
  subject?: string;
};
// A display window, not a discovery cutoff: search still visits every choice.
const CHOICE_WINDOW = 40;
export function ActionPicker({
  picker,
  view,
  connected,
  close,
  run,
  invent,
  requestAction,
  inspect,
  preference,
  revive,
  enableCognition,
  spawn,
  createPerson,
  createItem,
}: {
  picker: PickerContext;
  view: GameView;
  connected: boolean;
  close(): void;
  run(action: CatalogueAction): void;
  invent(text: string): void;
  requestAction(): void;
  inspect(entity: EntityView): void;
  preference(profile: PlayerProfile): void;
  revive(entity: EntityView): void;
  enableCognition(entity: EntityView): void;
  spawn(type: string, position: { x: number; y: number; z: number; surfaceId: string }): void;
  createItem(
    definitionId: string,
    position: { x: number; y: number; z: number; surfaceId: string },
  ): void;
  createPerson(position: { x: number; y: number; z: number; surfaceId: string }): void;
}) {
  const [query, setQuery] = useState(''),
    [visibleCount, setVisibleCount] = useState(CHOICE_WINDOW),
    [full, setFull] = useState(false),
    [result, setResult] = useState<{
      key: string;
      scopeKey: string;
      inventoryRevision: number;
      actions: CatalogueAction[];
    }>(),
    [error, setError] = useState(''),
    [preferenceError, setPreferenceError] = useState(''),
    [refreshing, setRefreshing] = useState(false),
    [saving, setSaving] = useState(false),
    [showUnavailable, setShowUnavailable] = useState(
      view.profile.preferences.showUnavailableActions,
    );
  const [openPullout, setOpenPullout] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const menu = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    refreshRequest = useRef(0),
    readController = useRef<AbortController | null>(null);
  const [position, setPosition] = useState(picker.point);
  const context = full ? { catalogue: true } : picker.context;
  const scopeKey = JSON.stringify([
    view.worldId,
    view.player.id,
    view.access?.scope,
    view.access?.controlGeneration,
    view.saveTimeline,
    context,
  ]);
  const key = JSON.stringify([scopeKey, view.player.inventoryRevision, view.clock.paused]);
  const entities = useMemo(
    () => new Map(view.entities.map((entity) => [entity.id, entity])),
    [view.entities],
  );
  // Movement replaces entity data without changing which targets are permitted.
  // Only identity membership needs to invalidate catalogue/search filtering.
  const visibleIds = view.entities.map((entity) => entity.id);
  const visibleIdentity = JSON.stringify(visibleIds);
  const visibleTargets = useMemo(() => new Set(visibleIds), [visibleIdentity]);
  const subject =
    picker.context.targetId === view.player.id
      ? view.player
      : entities.get(picker.context.targetId ?? '');
  const lostTarget = !full && !!picker.context.targetId && !subject;
  const checking = refreshing || (!!result && result.key !== key);
  // Pause changes availability, so those rows stay mounted for focus. Possession
  // or authority changes hide old details before another read can publish them.
  const actions = useMemo(
    () =>
      result?.scopeKey === scopeKey &&
      result.inventoryRevision === view.player.inventoryRevision &&
      !lostTarget
        ? result.actions.filter(
            (action) =>
              !action.targetId ||
              action.targetId === view.player.id ||
              visibleTargets.has(action.targetId),
          )
        : [],
    [result, scopeKey, view.player.inventoryRevision, view.player.id, lostTarget, visibleTargets],
  );
  const hadFocus = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    readController.current?.abort();
    const controller = new AbortController();
    readController.current = controller;
    setRefreshing(true);
    setError('');
    try {
      const result = await post<{ ok: boolean; message?: string; catalogue: ActionCatalogue }>(
        '/api/actions',
        context,
        controller.signal,
      );
      if (request !== refreshRequest.current) return;
      if (!result.ok) throw new Error(result.message);
      setResult((previous) => ({
        key,
        scopeKey,
        inventoryRevision: view.player.inventoryRevision,
        actions: retainActionOrder(
          previous?.scopeKey === scopeKey ? previous.actions : [],
          result.catalogue.actions,
        ),
      }));
      setError('');
    } catch (reason) {
      if (request === refreshRequest.current) {
        setResult(undefined);
        setError(`Actions could not be checked. Refresh to try again. ${String(reason)}`);
      }
    } finally {
      if (request === refreshRequest.current) setRefreshing(false);
    }
    // The serialized read identity includes actor/control/timeline and possession changes.
    // An obsolete completion cannot publish details for a different authorized scope.
  }, [key]);
  useEffect(() => {
    void refresh();
    return () => {
      refreshRequest.current++;
      readController.current?.abort();
    };
  }, [refresh]);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useLayoutEffect(() => {
    if (hadFocus.current && document.activeElement === document.body) input.current?.focus();
  }, [result, key, lostTarget, actions.length]);
  const matches = useMemo(
    () => filterActions(actions, query, showUnavailable),
    [actions, query, showUnavailable],
  );
  const isPickUpAll = (action: CatalogueAction) =>
    action.intent.kind === 'command' &&
    action.intent.command.type === 'pickup' &&
    !action.intent.command.itemId;
  const pickups = matches
    .filter((action) => action.category === 'Pick Up')
    .sort((a, b) => Number(isPickUpAll(b)) - Number(isPickUpAll(a)));
  const listedMatches = matches.filter(
    (a) => full || a.category !== 'Pick Up' || pickups.length <= 1,
  );
  const visibleMatches = listedMatches.slice(0, visibleCount);
  const canInvent =
    !view.inventionPolicy.playerLocked &&
    connected &&
    !error &&
    !checking &&
    !lostTarget &&
    result?.key === key &&
    !!query.trim() &&
    !matches.some((a) => a.enabled);
  const showInspect =
    !full &&
    !!subject &&
    !!picker.entity &&
    (!query || 'look closer description inspect'.includes(query.toLowerCase()));
  const showRevive =
    !full &&
    !lostTarget &&
    view.godMode &&
    !!picker.entity &&
    godCharacterAvailability(picker.entity).revive &&
    (!query || 'revive god mode'.includes(query.toLowerCase()));
  const creationPosition =
    picker.entity?.kind === 'item-pile' && picker.entity.supportSurfaceId
      ? { ...picker.entity.position, surfaceId: picker.entity.supportSurfaceId }
      : picker.context.position;
  const showAdd =
    !full &&
    !lostTarget &&
    view.godMode &&
    (!picker.entity || picker.entity.kind === 'item-pile') &&
    !!creationPosition &&
    (!query || 'add something spawn god mode'.includes(query.toLowerCase()));
  useLayoutEffect(() => {
    const place = () => {
      const bounds = menu.current?.getBoundingClientRect();
      if (bounds)
        setPosition({
          x: Math.max(12, Math.min(picker.point.x, innerWidth - bounds.width - 12)),
          y: Math.max(12, Math.min(picker.point.y, innerHeight - bounds.height - 12)),
        });
    };
    place();
    window.addEventListener('resize', place);
    const observer = new ResizeObserver(place);
    if (menu.current) observer.observe(menu.current);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [picker, matches.length, error]);
  async function toggle() {
    const previous = showUnavailable;
    const next = !previous;
    setShowUnavailable(next);
    setSaving(true);
    setPreferenceError('');
    try {
      const result = await post<{ ok: boolean; message?: string; profile: PlayerProfile }>(
        '/api/profile/preferences',
        { showUnavailableActions: next },
      );
      if (!result.ok) throw new Error(result.message);
      preference(result.profile);
    } catch (e) {
      setShowUnavailable(previous);
      setPreferenceError(`The unavailable-action preference could not be saved. ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      ref={menu}
      id="contextMenu"
      className="ol-picker"
      role="dialog"
      onFocusCapture={() => {
        hadFocus.current = true;
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
          hadFocus.current = false;
      }}
      aria-label={`Actions for ${full ? 'all known choices' : picker.item ? picker.item.name : picker.subject ? picker.subject : picker.entity ? namePhrase(picker.entity, 'definite') : 'the clearing'}`}
      style={{ left: position.x, top: position.y }}
      onKeyDown={(e) => {
        // Portaled pullouts own their keyboard navigation; React events still bubble here.
        if (!e.currentTarget.contains(e.target as Node)) return;
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
          return;
        }
        if (
          (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
          (e.target === input.current ||
            (e.target instanceof HTMLElement && e.target.hasAttribute('data-picker-row')))
        ) {
          const rows = Array.from(
            menu.current!.querySelectorAll<HTMLButtonElement>('[data-picker-row]'),
          );
          const index = rows.indexOf(document.activeElement as HTMLButtonElement);
          e.preventDefault();
          rows[(index + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length]?.focus();
        }
        if (e.key === 'Enter' && e.target === input.current) {
          e.preventDefault();
          if (!connected || checking || error || lostTarget || result?.key !== key) return;
          const first =
            visibleMatches.find((a) => a.enabled) ??
            (pickups.length > 1 && !full ? pickups.find((a) => a.enabled) : undefined);
          if (first) run(first);
          else if (canInvent) invent(query.trim());
        }
      }}
    >
      <div className="ol-picker-head">
        <Icon name={symbol(picker.entity?.subtype ?? 'ui.inview')} />
        <strong id="contextTitle">
          {full
            ? 'All known actions'
            : (picker.item?.name ??
              picker.subject ??
              subject?.name ??
              (lostTarget ? 'Target no longer in view' : 'The clearing'))}
        </strong>
        <IconButton
          icon="ui.refresh"
          label="Refresh actions"
          disabled={checking}
          onPress={() => void refresh()}
        />
        <IconButton icon="ui.close" label="Close action picker" onPress={close} />
      </div>
      <div className="ol-search">
        <Icon name="ui.search" size={16} />
        <input
          type="search"
          ref={input}
          id="actionSearch"
          aria-label="Find an action"
          placeholder="Search actions or invent something…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(CHOICE_WINDOW);
          }}
          maxLength={1000}
        />
        {canInvent && (
          <AriaButton
            className="ol-search-invent"
            aria-label={`Invent ${query}`}
            onPress={() => invent(query.trim())}
          >
            <Icon name="action.invent" size={16} />
            Invent
          </AriaButton>
        )}
        {query && (
          <IconButton
            icon="ui.close"
            label="Clear search"
            onPress={() => {
              setQuery('');
              setVisibleCount(CHOICE_WINDOW);
              input.current?.focus();
            }}
          />
        )}
      </div>
      {actions.some((a) => !a.enabled) && (
        <AriaButton
          className="ol-menu-toggle"
          aria-pressed={showUnavailable}
          isDisabled={saving || !connected}
          onPress={() => void toggle()}
        >
          {showUnavailable ? 'Hide Unavailable Actions' : 'Show Unavailable Actions'}
        </AriaButton>
      )}
      <div className="ol-menu-scroll" aria-busy={checking}>
        {(checking || (!result && !error)) && (
          <p role="status" className="ol-meta">
            {result ? 'Checking current choices…' : 'Loading actions…'}
          </p>
        )}
        {lostTarget && (
          <p role="status" className="ol-meta">
            That target is no longer in view. Choose a currently perceived target or browse all
            known actions.
          </p>
        )}
        {!full &&
          !lostTarget &&
          view.godMode &&
          !!picker.entity &&
          godCharacterAvailability(picker.entity).enableCognition &&
          (!query || 'grant cognition speech'.includes(query.toLowerCase())) && (
            <AriaButton
              data-picker-row
              className="ol-item ol-god-action"
              onPress={() => enableCognition(picker.entity!)}
            >
              <Icon name="ui.star" />
              <span>Grant cognition and speech</span>
              <small>God mode</small>
            </AriaButton>
          )}
        {showRevive && (
          <AriaButton
            data-picker-row
            className="ol-item ol-god-action"
            onPress={() => revive(picker.entity!)}
          >
            <Icon name="ui.star" />
            <span>Revive</span>
            <small className="ol-item-hint">God mode</small>
          </AriaButton>
        )}
        {showAdd && (
          <PulloutPicker
            label="Add something"
            isOpen={openPullout === 'add'}
            onOpenChange={(open) => setOpenPullout(open ? 'add' : null)}
            icon="ui.plus"
            badge="God mode"
            placeholder="Search objects…"
            options={[]}
            groups={[
              {
                label: 'Items',
                icon: 'ui.inventory',
                options: (view.godTools?.itemOptions ?? []).map((option) => ({
                  ...option,
                  id: `item:${option.id}`,
                  icon: symbol(option.id),
                })),
              },
              ...(['Actors', 'Environment'] as const).map((category) => ({
                label: category,
                icon: category === 'Actors' ? 'ui.character' : 'ui.world',
                options: (view.godTools?.spawnOptions ?? [])
                  .filter((option) => option.category === category)
                  .map((option) => ({ ...option, icon: spawnIcons[option.id] ?? 'ui.plus' })),
              })),
            ]}
            onSelect={(type) => {
              if (type.startsWith('item:')) createItem(type.slice(5), creationPosition!);
              else if (type === 'person') createPerson(creationPosition!);
              else spawn(type, creationPosition!);
            }}
          />
        )}
        {showInspect && (
          <AriaButton data-picker-row className="ol-item" onPress={() => inspect(picker.entity!)}>
            <Icon name="ui.inview" />
            <span>Look closer</span>
            <small className="ol-item-hint">Inspect</small>
          </AriaButton>
        )}
        {!full && pickups.length > 1 && (
          <PulloutPicker
            label="Pick Up"
            isOpen={openPullout === 'pickup'}
            onOpenChange={(open) => setOpenPullout(open ? 'pickup' : null)}
            icon="ui.inventory"
            placeholder="Search items…"
            options={pickups.map((a) => ({
              id: a.id,
              label: a.label,
              disabled: !a.enabled || !connected || checking,
              description: a.enabled ? a.description : a.reason,
            }))}
            onSelect={(id) => {
              const action = matches.find((a) => a.id === id);
              if (action?.enabled && connected && !checking) run(action);
            }}
          />
        )}
        {visibleMatches.map((a) => (
          <ActionChoice
            key={a.id}
            action={
              connected && !checking
                ? a
                : {
                    ...a,
                    enabled: false,
                    reason: connected ? 'Checking current choices…' : 'Reconnect to the world.',
                  }
            }
            run={run}
            expanded={expanded.includes(a.id)}
            expand={(open) =>
              setExpanded((current) =>
                open ? [...new Set([...current, a.id])] : current.filter((id) => id !== a.id),
              )
            }
            icon={symbol(
              a.intent.kind === 'command'
                ? a.intent.command.type === 'gather'
                  ? (entities.get(a.targetId ?? '')?.subtype ?? 'resource.reed')
                  : a.intent.command.type
                : a.intent.kind === 'compose'
                  ? 'talk'
                  : 'ui.lock',
            )}
            badge={
              a.intent.kind === 'command' && a.intent.command.type === 'gather'
                ? 'action.gather'
                : undefined
            }
          />
        ))}
        {visibleMatches.length < listedMatches.length && (
          <AriaButton
            className="ol-menu-toggle"
            onPress={() => {
              const next = listedMatches[visibleMatches.length];
              setVisibleCount((current) => current + CHOICE_WINDOW);
              requestAnimationFrame(() => {
                if (next)
                  menu.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-catalogue-action="${CSS.escape(next.id)}"]`,
                    )
                    ?.focus();
              });
            }}
          >
            Show more choices ({visibleMatches.length} of {listedMatches.length} shown)
          </AriaButton>
        )}
        {error && (
          <p role="status" className="ol-meta">
            {error}
          </p>
        )}
        {preferenceError && (
          <p role="status" className="ol-meta">
            {preferenceError}
          </p>
        )}
        {!error &&
          !checking &&
          !lostTarget &&
          result?.key === key &&
          !matches.length &&
          !showRevive &&
          !showAdd && (
            <p role="status" className="ol-meta">
              {query
                ? view.inventionPolicy.playerLocked
                  ? 'No matching actions. Player invention is locked.'
                  : canInvent
                    ? 'No matching actions. Enter opens an editable invention idea; only Send submits it.'
                    : 'No matching actions. Clear the search or show unavailable actions.'
                : actions.length
                  ? 'Available actions are hidden. Show unavailable actions to see why.'
                  : 'No permitted actions in this scope. Browse all known actions or make a freeform request.'}
            </p>
          )}
      </div>
      <div className="ol-picker-footer">
        <AriaButton
          className="ol-menu-toggle"
          onPress={() => {
            setFull(!full);
            setVisibleCount(CHOICE_WINDOW);
          }}
        >
          {full ? 'Back to selected subject' : 'Browse all known actions'}
        </AriaButton>
        <AriaButton className="ol-menu-toggle" onPress={() => requestAction()}>
          Make a freeform request
        </AriaButton>
      </div>
    </div>
  );
}
