import { WorldIntentIcon, type WorldIntent } from './world-composer';
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
} from '@open-legend/protocol';
import { actionSections, filterActions, retainActionOrder } from '../action-browser';
import { post } from '../api';
import { playerEntity } from '../entity-view';
import { Icon, IconButton, symbol } from '../design-system/components';
import { ActionChoice } from './action-choice';
import { Pullout, PulloutPicker } from './pullout';
import { ActivityEntries, type ActivityEntry } from './camp-activity';
export type PickerContext = {
  context: ActionContext;
  point: { x: number; y: number };
  entity: EntityView | null;
  item?: { id: string; name: string };
  browse?: boolean;
  opener?: HTMLElement;
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
  inspect,
  openContainer,
  openActivity,
  compose,
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
  openContainer(entity: EntityView): void;
  openActivity(entry: ActivityEntry): void;
  compose(mode: WorldIntent['mode']): void;
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
    [result, setResult] = useState<{
      key: string;
      scopeKey: string;
      inventoryRevision: number;
      actions: CatalogueAction[];
      categories: string[];
    }>(),
    [error, setError] = useState(''),
    [refreshing, setRefreshing] = useState(false);
  const [openPullout, setOpenPullout] = useState<string | null>(null);
  const [taskMatches, setTaskMatches] = useState(0);
  const [sectionDisplay, setSectionDisplay] = useState({
    scopeKey: '',
    counts: new Map<string | null, number>(),
  });
  const menu = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    refreshRequest = useRef(0),
    readController = useRef<AbortController | null>(null);
  const [position, setPosition] = useState(picker.point);
  const context = picker.context;
  const full = context.catalogue === true;
  const browsing = full || picker.browse === true;
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
      ? playerEntity(view)
      : entities.get(picker.context.targetId ?? '');
  const lostTarget = !full && !!picker.context.targetId && !subject;
  const checking = refreshing || (!!result && result.key !== key);
  // Pause changes availability, so those rows stay mounted for focus. Possession
  // or authority changes hide old details before another read can publish them.
  const catalogueCurrent =
    result?.scopeKey === scopeKey &&
    result.inventoryRevision === view.player.inventoryRevision &&
    !lostTarget;
  const actions = useMemo(
    () =>
      catalogueCurrent && result
        ? result.actions.filter(
            (action) =>
              !action.targetId ||
              action.targetId === view.player.id ||
              visibleTargets.has(action.targetId),
          )
        : [],
    [result, catalogueCurrent, view.player.id, visibleTargets],
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
      setResult((previous) => {
        const actions = retainActionOrder(
          previous?.scopeKey === scopeKey ? previous.actions : [],
          result.catalogue.actions,
        );
        return {
          key,
          scopeKey,
          inventoryRevision: view.player.inventoryRevision,
          actions,
          categories: result.catalogue.categories,
        };
      });
      setError('');
    } catch (reason) {
      if (request === refreshRequest.current) {
        setResult(undefined);
        setError(
          `Actions could not be checked. Close and reopen this menu to try again. ${String(reason)}`,
        );
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
  // Walking uses primary click. Known blocked choices remain inspectable.
  const contextualActions = useMemo(
    () =>
      actions.filter(
        (action) =>
          action.id !== 'move' &&
          !(action.intent.kind === 'command' && action.intent.command.type === 'move'),
      ),
    [actions],
  );
  const matches = useMemo(
    () => filterActions(contextualActions, query, true),
    [contextualActions, query],
  );
  const categories = useMemo(() => {
    if (!catalogueCurrent || !result) return [];
    // Removing walking or a disappeared target must also remove categories left
    // empty by that omission. Genuinely empty permitted categories remain gray.
    const omitted = new Set(result.actions.map((action) => action.category));
    for (const action of contextualActions) omitted.delete(action.category);
    return result.categories.filter((category) => !omitted.has(category));
  }, [result, catalogueCurrent, contextualActions]);
  const sections = useMemo(() => actionSections(matches, categories), [matches, categories]);
  const searching = !!query.trim();
  const display = sectionDisplay.scopeKey === scopeKey ? sectionDisplay : undefined;
  const searchCount = display?.counts.get(null) ?? CHOICE_WINDOW;
  const visibleMatches = searching ? matches.slice(0, searchCount) : [];
  function changeQuery(value: string) {
    setQuery(value);
    setOpenPullout(null);
    setSectionDisplay({ scopeKey, counts: new Map() });
  }
  function showMore(
    category: string | null,
    visible: CatalogueAction[],
    choices: CatalogueAction[],
    container: Element | null,
  ) {
    const next = choices[visible.length];
    setSectionDisplay((current) => ({
      scopeKey,
      counts: new Map(current.scopeKey === scopeKey ? current.counts : []).set(
        category,
        visible.length + CHOICE_WINDOW,
      ),
    }));
    requestAnimationFrame(() => {
      if (next)
        container
          ?.querySelector<HTMLButtonElement>(`[data-catalogue-action="${CSS.escape(next.id)}"]`)
          ?.focus();
    });
  }
  function revealOnScroll(
    category: string | null,
    visibleCount: number,
    total: number,
    container: HTMLElement,
  ) {
    if (
      visibleCount >= total ||
      container.scrollHeight - container.scrollTop - container.clientHeight > 80
    )
      return;
    setSectionDisplay((current) => {
      const previous =
        current.scopeKey === scopeKey
          ? (current.counts.get(category) ?? CHOICE_WINDOW)
          : CHOICE_WINDOW;
      // Multiple scroll events before rendering must reveal only one new window.
      if (previous > visibleCount) return current;
      return {
        scopeKey,
        counts: new Map(current.scopeKey === scopeKey ? current.counts : []).set(
          category,
          Math.min(total, visibleCount + CHOICE_WINDOW),
        ),
      };
    });
  }
  function actionRow(action: CatalogueAction) {
    return (
      <ActionChoice
        key={action.id}
        action={
          connected && !checking
            ? action
            : {
                ...action,
                enabled: false,
                reason: connected ? 'Checking current choices…' : 'Reconnect to the world.',
              }
        }
        run={run}
        hideTarget={!full && !!context.targetId}
        icon={
          action.icon ??
          symbol(
            action.intent.kind === 'command'
              ? action.intent.command.type
              : action.intent.kind === 'compose'
                ? 'talk'
                : 'ui.lock',
          )
        }
        badge={
          action.intent.kind === 'command' && action.intent.command.type === 'gather'
            ? 'action.gather'
            : undefined
        }
      />
    );
  }
  const canInvent =
    browsing &&
    !view.inventionPolicy.playerLocked &&
    connected &&
    !error &&
    !checking &&
    !lostTarget &&
    result?.key === key &&
    !!query.trim() &&
    (full || !taskMatches) &&
    !matches.some((a) => a.enabled);
  const showInspect =
    !full &&
    !!subject &&
    !!picker.entity &&
    picker.entity.id !== view.player.id &&
    (!query || 'look closer description inspect'.includes(query.toLowerCase()));
  const showOpen =
    !full &&
    !lostTarget &&
    !!subject?.storage &&
    (!query ||
      `open storage inventory ${subject.name}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()));
  const showCognition =
    !full &&
    !lostTarget &&
    view.godMode &&
    !!subject &&
    godCharacterAvailability(subject).enableCognition &&
    (!query || 'grant cognition speech'.includes(query.toLowerCase()));
  const self = !full && context.targetId === view.player.id;
  const showSpeak = self && (!query || 'speak say whisper shout'.includes(query.toLowerCase()));
  const showAct = !full && !lostTarget && (!query || 'act action'.includes(query.toLowerCase()));
  // Quick suggestions contain executable choices; All actions retains known blockers.
  const suggested = useMemo(() => {
    const limit = Math.max(
      0,
      5 - Number(showSpeak) - Number(showAct) - Number(showInspect) - Number(showOpen),
    );
    if (full || searching || !limit) return [];
    const choices: CatalogueAction[] = [];
    for (const action of matches) {
      if (!action.enabled) continue;
      choices.push(action);
      if (choices.length === limit) break;
    }
    return choices;
  }, [matches, full, searching, showSpeak, showAct, showInspect, showOpen]);
  const showRevive =
    !full &&
    !lostTarget &&
    view.godMode &&
    !!subject &&
    godCharacterAvailability(subject).revive &&
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
        if (
          event.relatedTarget instanceof Element &&
          !event.currentTarget.contains(event.relatedTarget) &&
          !event.relatedTarget.closest('.ol-pullout-popover')
        )
          hadFocus.current = false;
      }}
      aria-label={`Actions for ${full ? 'all known choices' : (picker.item?.name ?? (subject ? namePhrase(subject, 'definite') : picker.entity ? namePhrase(picker.entity, 'definite') : view.presentation.locationName))}`}
      style={{ left: position.x, top: position.y }}
      onKeyDown={(e) => {
        if (e.defaultPrevented || e.nativeEvent.isComposing || e.repeat) return;
        // Portaled pullouts own their keyboard navigation; React events still bubble here.
        if (!e.currentTarget.contains(e.target as Node)) return;
        if (e.key === 'Escape') {
          e.preventDefault();
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
          const first = visibleMatches.find((a) => a.enabled);
          if (first) run(first);
          else if (canInvent) invent(query.trim());
        }
      }}
    >
      <div className="ol-picker-head">
        <Icon
          name={subject?.icon ?? picker.entity?.icon ?? 'ui.inview'}
          fallbackLabel={picker.item?.name ?? subject?.name ?? picker.entity?.name}
        />
        <strong id="contextTitle">
          {full
            ? 'Action browser'
            : (picker.item?.name ??
              subject?.name ??
              picker.entity?.name ??
              view.presentation.locationName)}
        </strong>
        <IconButton icon="ui.close" label="Close action picker" onPress={close} />
      </div>
      {full && (
        <p className="ol-meta">Known actions involving what you can currently see or carry.</p>
      )}
      <div className="ol-search">
        <Icon name="ui.search" size={16} />
        <input
          type="search"
          ref={input}
          id="actionSearch"
          aria-label="Find an action"
          placeholder={browsing ? 'Search actions or invent something…' : 'Search actions…'}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
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
              changeQuery('');
              input.current?.focus();
            }}
          />
        )}
      </div>
      <div
        className="ol-menu-scroll"
        aria-busy={checking}
        onScroll={
          searching
            ? (event) =>
                revealOnScroll(null, visibleMatches.length, matches.length, event.currentTarget)
            : undefined
        }
      >
        {showSpeak && (
          <AriaButton data-picker-row className="ol-item" onPress={() => compose('speak')}>
            <WorldIntentIcon mode="speak" />
            <span>Speak</span>
          </AriaButton>
        )}
        {showAct && (
          <AriaButton data-picker-row className="ol-item" onPress={() => compose('act')}>
            <WorldIntentIcon mode="act" />
            <span>Act</span>
          </AriaButton>
        )}
        {(checking || (!result && !error)) && (
          <p role="status" className="ol-meta">
            {result ? 'Checking current choices…' : 'Loading actions…'}
          </p>
        )}
        {lostTarget && (
          <p role="status" className="ol-meta">
            {picker.entity?.name ?? 'That target'} is no longer in view. Choose a currently
            perceived target or browse all known actions.
          </p>
        )}
        {showOpen && subject && (
          <AriaButton
            data-picker-row
            className="ol-item"
            isDisabled={!connected}
            onPress={() => openContainer(subject)}
          >
            <Icon name="ui.inventory" />
            <span>Open {subject.name}</span>
          </AriaButton>
        )}
        {!full && subject && !lostTarget && (
          <ActivityEntries
            view={view}
            targetId={subject.id}
            connected={connected}
            onOpen={openActivity}
            query={query}
            presentation="menu"
            onMatchCount={setTaskMatches}
            excludeFamilies={actions.flatMap((action) =>
              action.targetId === subject.id && action.intent.kind === 'activity'
                ? [action.intent.family]
                : [],
            )}
          />
        )}
        {showInspect && (
          <AriaButton data-picker-row className="ol-item" onPress={() => inspect(subject!)}>
            <Icon name="ui.inview" />
            <span>Look closer</span>
            <small className="ol-item-hint">Inspect</small>
          </AriaButton>
        )}
        {searching ? (
          <>
            {visibleMatches.map(actionRow)}
            {visibleMatches.length < matches.length && (
              <AriaButton
                data-picker-row
                className="ol-menu-toggle"
                onPress={() => showMore(null, visibleMatches, matches, menu.current)}
              >
                Show more choices ({visibleMatches.length} of {matches.length} shown)
              </AriaButton>
            )}
          </>
        ) : (
          <>
            {suggested.map(actionRow)}
            {!!sections.length && <p className="ol-menu-section-label">All actions</p>}
            {sections.map((section) => {
              const key = `category:${section.category}`;
              const count = display?.counts.get(section.category) ?? CHOICE_WINDOW;
              const open =
                !!section.actions.length && display?.scopeKey === scopeKey && openPullout === key;
              const visible = open ? section.actions.slice(0, count) : [];
              return (
                <Pullout
                  key={section.category}
                  label={section.category}
                  icon="ui.more"
                  badge={String(section.actions.length)}
                  muted={!section.actions.some((action) => action.enabled)}
                  disabled={!section.actions.length}
                  isOpen={open}
                  onOpenChange={(open) => {
                    if (open && !display) setSectionDisplay({ scopeKey, counts: new Map() });
                    setOpenPullout((current) => (open ? key : current === key ? null : current));
                  }}
                >
                  <div className="ol-pullout-head">
                    <strong>{section.category}</strong>
                    <span className="ol-caption">{section.actions.length} choices</span>
                  </div>
                  <div
                    className="ol-action-category"
                    data-action-section={section.category}
                    onScroll={(event) =>
                      revealOnScroll(
                        section.category,
                        visible.length,
                        section.actions.length,
                        event.currentTarget,
                      )
                    }
                  >
                    {visible.map(actionRow)}
                    {visible.length < section.actions.length && (
                      <AriaButton
                        data-picker-row
                        className="ol-menu-toggle"
                        onPress={(event) =>
                          showMore(
                            section.category,
                            visible,
                            section.actions,
                            event.target.parentElement,
                          )
                        }
                      >
                        Show more choices ({visible.length} of {section.actions.length} shown)
                      </AriaButton>
                    )}
                  </div>
                </Pullout>
              );
            })}
          </>
        )}
        {(showRevive || showCognition || showAdd) && !lostTarget && (
          <div className="ol-picker-creator" role="group" aria-label="God mode">
            <p className="ol-eyebrow">God mode</p>
            {showCognition && (
              <AriaButton
                data-picker-row
                className="ol-item ol-god-action"
                isDisabled={!connected}
                onPress={() => enableCognition(subject!)}
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
                isDisabled={!connected}
                onPress={() => revive(subject!)}
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
                      icon: symbol(option.icon ?? 'ui.inventory'),
                    })),
                  },
                  ...(['Actors', 'Environment'] as const).map((category) => ({
                    label: category,
                    icon: category === 'Actors' ? 'ui.character' : 'ui.world',
                    options: (view.godTools?.spawnOptions ?? [])
                      .filter((option) => option.category === category)
                      .map((option) => ({ ...option, icon: option.icon ?? 'ui.plus' })),
                  })),
                ]}
                onSelect={(type) => {
                  if (type.startsWith('item:')) createItem(type.slice(5), creationPosition!);
                  else if (type === 'person') createPerson(creationPosition!);
                  else spawn(type, creationPosition!);
                }}
              />
            )}
          </div>
        )}
        {error && (
          <p role="status" className="ol-meta">
            {error}
          </p>
        )}
        {!error &&
          !checking &&
          !lostTarget &&
          result?.key === key &&
          !matches.length &&
          (full || !taskMatches) &&
          !showOpen &&
          !showCognition &&
          !showInspect &&
          !showSpeak &&
          !showAct &&
          !showRevive &&
          !showAdd && (
            <p role="status" className="ol-meta">
              {!browsing
                ? query
                  ? 'No matching known actions.'
                  : 'No known actions here.'
                : query
                  ? view.inventionPolicy.playerLocked
                    ? 'No matching actions. Player invention is locked.'
                    : canInvent
                      ? 'No matching actions. Enter opens an editable invention idea; only Send submits it.'
                      : 'No matching known actions.'
                  : 'No known actions in the current view.'}
            </p>
          )}
      </div>
    </div>
  );
}
