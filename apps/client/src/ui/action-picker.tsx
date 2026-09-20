import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
}: {
  picker: PickerContext;
  view: GameView;
  connected: boolean;
  close(): void;
  run(action: CatalogueAction): void;
  invent(text: string): void;
  inspect(entity: EntityView): void;
  preference(profile: PlayerProfile): void;
}) {
  const [query, setQuery] = useState(''),
    [actions, setActions] = useState<CatalogueAction[]>([]),
    [error, setError] = useState('Loading actions…'),
    [saving, setSaving] = useState(false);
  const menu = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState(picker.point);
  useEffect(() => {
    input.current?.focus();
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const result = await post<{ ok: boolean; message?: string; catalogue: ActionCatalogue }>(
          '/api/actions',
          picker.context,
        );
        if (!active) return;
        if (!result.ok) throw new Error(result.message);
        setActions(result.catalogue.actions);
        setError('');
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        if (active) timer = setTimeout(refresh, 750);
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [picker]);
  const matches = filterActions(
    actions.map((a) =>
      connected ? a : { ...a, enabled: false, reason: 'Reconnect to the world.' },
    ),
    query,
    view.profile.preferences.showUnavailableActions,
    picker.context.targetId,
  );
  const canInvent = connected && !error && !!query.trim() && !matches.some((a) => a.enabled);
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
    setSaving(true);
    try {
      const result = await post<{ ok: boolean; message?: string; profile: PlayerProfile }>(
        '/api/profile/preferences',
        { showUnavailableActions: !view.profile.preferences.showUnavailableActions },
      );
      if (!result.ok) throw new Error(result.message);
      preference(result.profile);
    } catch (e) {
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
        {picker.entity &&
          (!query || 'look closer description inspect'.includes(query.toLowerCase())) && (
            <AriaButton data-picker-row className="ol-item" onPress={() => inspect(picker.entity!)}>
              <Icon name="ui.inview" />
              <span>Look closer</span>
              <small className="ol-item-hint">Inspect</small>
            </AriaButton>
          )}
        {matches.map((a) => (
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
                      ? (view.entities.find((e) => e.id === a.targetId)?.subtype ?? 'resource.reed')
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
        {!error && !matches.length && (
          <p className="ol-meta">
            {query
              ? 'No matching actions. Press Enter to invent this idea.'
              : 'No actions here yet.'}
          </p>
        )}
      </div>
      {actions.some((a) => !a.enabled) && (
        <AriaButton
          className="ol-menu-toggle"
          aria-expanded={view.profile.preferences.showUnavailableActions}
          isDisabled={saving || !connected}
          onPress={() => void toggle()}
        >
          {view.profile.preferences.showUnavailableActions
            ? 'Hide Unavailable Actions'
            : 'Show Unavailable Actions'}
          {saving ? ' · Saving…' : ''}
        </AriaButton>
      )}
    </div>
  );
}
