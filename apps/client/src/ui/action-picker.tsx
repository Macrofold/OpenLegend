import { godCharacterAvailability } from './god-character-actions';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type {
  ActionCatalogue,
  ActionContext,
  CatalogueAction,
  EntityView,
  GameView,
  PlayerProfile,
} from '@open-legend/protocol';
import { filterActions } from '../action-browser';
import { post } from '../api';
import { Explanation, Icon, IconButton, symbol } from '../design-system/components';
import { spawnIcons } from './god-tools';
import { PulloutPicker } from './pullout';
export type PickerContext = {
  context: ActionContext;
  point: { x: number; y: number };
  entity: EntityView | null;
};
export function ActionPicker({
  picker,
  view,
  connected,
  close,
  run,
  invent,
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
    [actions, setActions] = useState<CatalogueAction[]>([]),
    [error, setError] = useState('Loading actions…'),
    [refreshing, setRefreshing] = useState(false),
    [saving, setSaving] = useState(false),
    [showUnavailable, setShowUnavailable] = useState(
      view.profile.preferences.showUnavailableActions,
    );
  const [openPullout, setOpenPullout] = useState<string | null>(null);
  const menu = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    refreshRequest = useRef(0);
  const [position, setPosition] = useState(picker.point);
  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    setRefreshing(true);
    try {
      const result = await post<{ ok: boolean; message?: string; catalogue: ActionCatalogue }>(
        '/api/actions',
        picker.context,
      );
      if (request !== refreshRequest.current) return;
      if (!result.ok) throw new Error(result.message);
      setActions(result.catalogue.actions);
      setError('');
    } catch (reason) {
      if (request === refreshRequest.current) setError(String(reason));
    } finally {
      if (request === refreshRequest.current) setRefreshing(false);
    }
  }, [picker.context]);
  useEffect(() => {
    input.current?.focus();
    void refresh();
    return () => {
      refreshRequest.current++;
    };
  }, [refresh]);
  const matches = filterActions(
    actions.map((a) =>
      connected ? a : { ...a, enabled: false, reason: 'Reconnect to the world.' },
    ),
    query,
    showUnavailable,
    picker.context.targetId,
  );
  const isPickUpAll = (action: CatalogueAction) =>
    action.intent.kind === 'command' &&
    action.intent.command.type === 'pickup' &&
    !action.intent.command.itemId;
  const pickups = matches
    .filter((action) => action.category === 'Pick Up')
    .sort((a, b) => Number(isPickUpAll(b)) - Number(isPickUpAll(a)));
  const canInvent =
    !view.inventionPolicy.playerLocked &&
    connected &&
    !error &&
    !!query.trim() &&
    !matches.some((a) => a.enabled);
  const showInspect =
    !!picker.entity && (!query || 'look closer description inspect'.includes(query.toLowerCase()));
  const showRevive =
    view.godMode &&
    !!picker.entity &&
    godCharacterAvailability(picker.entity).revive &&
    (!query || 'revive god mode'.includes(query.toLowerCase()));
  const creationPosition =
    picker.entity?.kind === 'item-pile' && picker.entity.supportSurfaceId
      ? { ...picker.entity.position, surfaceId: picker.entity.supportSurfaceId }
      : picker.context.position;
  const showAdd =
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
    return () => window.removeEventListener('resize', place);
  }, [picker, matches.length, error]);
  async function toggle() {
    const previous = showUnavailable;
    const next = !previous;
    setShowUnavailable(next);
    setSaving(true);
    try {
      const result = await post<{ ok: boolean; message?: string; profile: PlayerProfile }>(
        '/api/profile/preferences',
        { showUnavailableActions: next },
      );
      if (!result.ok) throw new Error(result.message);
      preference(result.profile);
    } catch (e) {
      setShowUnavailable(previous);
      setError(String(e));
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
      aria-label={`Actions for ${picker.entity?.name ?? 'the clearing'}`}
      style={{ left: position.x, top: position.y }}
      onKeyDown={(e) => {
        // Portaled pullouts own their keyboard navigation; React events still bubble here.
        if (!e.currentTarget.contains(e.target as Node)) return;
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
          return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const rows = Array.from(
            menu.current!.querySelectorAll<HTMLButtonElement>('[data-picker-row]'),
          );
          const index = rows.indexOf(document.activeElement as HTMLButtonElement);
          e.preventDefault();
          rows[(index + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length]?.focus();
        }
        if (e.key === 'Enter' && e.target === input.current) {
          e.preventDefault();
          const first = matches.find((a) => a.enabled);
          if (first) run(first);
          else if (canInvent) invent(query.trim());
        }
      }}
    >
      <div className="ol-picker-head">
        <Icon name={symbol(picker.entity?.subtype ?? 'ui.inview')} />
        <strong id="contextTitle">{picker.entity?.name ?? 'The clearing'}</strong>
        <IconButton
          icon="ui.refresh"
          label="Refresh actions"
          disabled={refreshing}
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
          onChange={(e) => setQuery(e.target.value)}
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
              input.current?.focus();
            }}
          />
        )}
      </div>
      <div className="ol-menu-scroll">
        {view.godMode &&
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
        {pickups.length > 1 && (
          <PulloutPicker
            label="Pick Up"
            isOpen={openPullout === 'pickup'}
            onOpenChange={(open) => setOpenPullout(open ? 'pickup' : null)}
            icon="ui.inventory"
            placeholder="Search items…"
            options={pickups.map((a) => ({
              id: a.id,
              label: a.label,
              disabled: !a.enabled,
              description: a.enabled ? undefined : a.reason,
            }))}
            onSelect={(id) => {
              const action = matches.find((a) => a.id === id);
              if (action?.enabled) run(action);
            }}
          />
        )}
        {matches
          .filter((a) => a.category !== 'Pick Up' || pickups.length <= 1)
          .map((a) => (
            <Explanation
              key={a.id}
              title={a.label}
              text={`${a.description}${!a.enabled ? `\n\n${a.reason ?? 'Unavailable right now.'}` : ''}`}
              facts={a.facts}
            >
              <AriaButton
                data-picker-row
                data-catalogue-action={a.id}
                className="ol-item"
                aria-disabled={!a.enabled}
                onPress={() => {
                  if (a.enabled) run(a);
                }}
              >
                <Icon
                  name={symbol(
                    a.intent.kind === 'command'
                      ? a.intent.command.type === 'gather'
                        ? (view.entities.find((e) => e.id === a.targetId)?.subtype ??
                          'resource.reed')
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
                <span>
                  {a.label}
                  {!a.enabled && <small className="ol-item-reason">{a.reason}</small>}
                </span>
                <small className="ol-item-hint">{a.category}</small>
              </AriaButton>
            </Explanation>
          ))}
        {error && (
          <p role="status" className="ol-meta">
            {error}
          </p>
        )}
        {!error && !matches.length && !showInspect && !showRevive && !showAdd && (
          <p className="ol-meta">
            {query
              ? view.inventionPolicy.playerLocked
                ? 'No matching actions. Player invention is locked.'
                : 'No matching actions. Press Enter to invent this idea.'
              : actions.length
                ? 'Available actions are hidden. Show unavailable actions to see why.'
                : 'No actions here yet.'}
          </p>
        )}
      </div>
      {actions.some((a) => !a.enabled) && (
        <AriaButton
          className="ol-menu-toggle"
          aria-expanded={showUnavailable}
          isDisabled={saving || !connected}
          onPress={() => void toggle()}
        >
          {showUnavailable ? 'Hide Unavailable Actions' : 'Show Unavailable Actions'}
        </AriaButton>
      )}
    </div>
  );
}
