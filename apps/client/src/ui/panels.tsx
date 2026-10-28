import { post } from '../api';
import { playerActionStatusKey } from '../action-browser';
import type { InventoryCommandOperations } from './use-inventory-command';
import { LoadingIndicator } from '../design-system/loading';
import './crafting-workspace.css';
import { formatDisplayNumber } from '@open-legend/language';
import { assetUrl } from '../asset-files';
import { Portrait } from '../design-system/portrait';
import { ItemIllustration } from '../design-system/item-illustration';
import { ConditionStatuses } from './gildmoss-hud';
import { EventTime, GameDeadline } from './event-time';
import './character-sheet.css';
import { PersonKnowledge } from './diagnostics';
import { Promises } from './promises';
import { PerceivedEventText } from './perceived-event-text';
import type { CommandDispatcher } from '../command-request';
import { OutingStatus } from './outing-status';
import { GodCharacterActions, type GodCharacterControls } from './god-character-actions';
import { playerEntity } from '../entity-view';
import { UsageRemaining } from './usage-remaining';
import { ActionAttempts } from './action-attempts';
import { RecipeDetails } from './recipe-details';
import { memo, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MemoryHistory } from './memory-history';
import { ActivityHistory } from './activity-history';
import { Button as AriaButton, Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import type {
  ActionCatalogue,
  ActionOption,
  ApiResult,
  EntityView,
  GameView,
  WorkBatchPreview,
} from '@open-legend/protocol';
import {
  Button,
  Condition,
  EmptyState,
  Explanation,
  Icon,
  Section,
  Tag,
  TextTooltip,
  SelectField,
} from '../design-system/components';
export function Actions({
  actions,
  command,
  connected,
}: {
  actions: ActionOption[];
  command(a: ActionOption): void;
  connected: boolean;
}) {
  return (
    <div className="ol-actions">
      {actions.map((a) => (
        <div key={a.id} title={a.detail}>
          <Button size="sm" disabled={!a.enabled || !connected} onPress={() => command(a)}>
            {a.label}
          </Button>
          {a.facts?.map(([name, value]) => (
            <p className="ol-caption" key={name}>
              {name}: {value}
            </p>
          ))}
          {!a.enabled && a.reason && <p className="ol-caption">{a.reason}</p>}
        </div>
      ))}
    </div>
  );
}
export function Traits({ traits }: { traits: EntityView['traits'] }) {
  return (
    <div className="ol-traits">
      {traits?.map((t) => (
        <Explanation key={t.id} title={t.name} text={t.description}>
          <AriaButton
            className="ol-tag ol-trait"
            data-tone="accent"
            aria-label={`${t.name}: ${t.description}`}
          >
            {t.name}
          </AriaButton>
        </Explanation>
      ))}
    </div>
  );
}
export { Inventory } from './inventory';
export function Crafting({
  view,
  operations,
  resolutionRevision,
  connected,
  invent,
  browseRecipe,
  visible = true,
}: {
  view: GameView;
  operations: InventoryCommandOperations;
  resolutionRevision: number;
  connected: boolean;
  visible?: boolean;
  invent(): void;
  browseRecipe(recipeId: string, opener: Element): void;
}) {
  const quantityId = useId();
  const [query, setQuery] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [haveEverything, setHaveEverything] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [quantityDraft, setQuantityDraft] = useState<{ id: string; value: string }>();
  const [schedule, setSchedule] = useState<'enqueue' | 'replace' | 'interrupt'>('enqueue');
  const [refresh, setRefresh] = useState(0);
  const [catalogue, setCatalogue] = useState<{
    key: string;
    value?: ActionCatalogue;
    error?: string;
  }>();
  const [preview, setPreview] = useState<{
    key: string;
    value?: WorkBatchPreview;
    error?: string;
  }>();
  const submitting = useRef(false);
  const cataloguePolicy = view.presentation.crafting;
  const categories = cataloguePolicy?.categories ?? [];
  const search = query.trim().toLocaleLowerCase();
  const held = (recipe: GameView['recipes'][number]) =>
    recipe.ingredients.every((item) => item.available >= item.quantity) &&
    recipe.retainedTools.every((tool) =>
      tool.choices.some((choice) => choice.available >= tool.quantity),
    );
  const matches = view.recipes.filter(
    (recipe) =>
      `${recipe.outputs.map((output) => output.name).join(' ')} ${recipe.name} ${recipe.description}`
        .toLocaleLowerCase()
        .includes(search) &&
      (creatorFilter === 'all' || recipe.origin === creatorFilter) &&
      (!haveEverything || held(recipe)),
  );
  const recipes = matches.filter(
    (recipe) => categoryFilter === 'all' || recipe.category?.id === categoryFilter,
  );
  const selected = selectedId
    ? view.recipes.find((recipe) => recipe.id === selectedId)
    : recipes[0];
  const quantityText =
    quantityDraft && quantityDraft.id === selected?.id ? quantityDraft.value : '1';
  const count = /^\d+$/.test(quantityText.trim()) ? Number(quantityText.trim()) : NaN;
  const validCount = Number.isSafeInteger(count) && count > 0;
  const owner = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.scope,
    view.access?.controlGeneration,
  ]);
  const readKey = JSON.stringify([
    owner,
    selected,
    view.player.inventoryRevision,
    playerActionStatusKey(view.player),
    view.player.action?.id,
    view.player.activity?.status,
    view.player.workBatchRevision,
    view.player.position,
    view.player.supportSurfaceId,
    view.map.spatial.revision,
    view.clock.paused,
    refresh,
    resolutionRevision,
  ]);
  const available = visible && connected && !!selected;
  const currentRead = useRef<string | undefined>(undefined);
  currentRead.current = available ? readKey : undefined;
  useEffect(() => {
    if (!available || !selected) return;
    const abort = new AbortController();
    void post<{ ok: boolean; message?: string; catalogue?: ActionCatalogue }>(
      '/api/actions',
      { recipeId: selected.id },
      abort.signal,
    )
      .then((result) => {
        if (abort.signal.aborted || currentRead.current !== readKey) return;
        setCatalogue({
          key: readKey,
          ...(result.ok && result.catalogue
            ? { value: result.catalogue }
            : { error: result.message ?? 'Crafting options are unavailable.' }),
        });
      })
      .catch((error) => {
        if (!abort.signal.aborted && currentRead.current === readKey)
          setCatalogue({
            key: readKey,
            error: error instanceof Error ? error.message : 'Crafting options are unavailable.',
          });
      });
    return () => abort.abort();
  }, [readKey, available]);
  const options = catalogue?.key === readKey ? (catalogue.value?.actions ?? []) : [];
  const craft = options.find(
    (option) => option.intent.kind === 'command' && option.intent.command.type === 'craft',
  );
  const batch = options.find(
    (option) => option.intent.kind === 'work-batch' && option.intent.selection.kind === 'craft',
  );
  const batchSelection = batch?.intent.kind === 'work-batch' ? batch.intent.selection : undefined;
  const request =
    batchSelection && validCount
      ? { selection: batchSelection, batches: count, mode: schedule }
      : undefined;
  const previewKey = JSON.stringify([readKey, request]);
  const currentPreview = useRef<string | undefined>(undefined);
  currentPreview.current = available && request && !operations.pending ? previewKey : undefined;
  useEffect(() => {
    if (!available || !request || operations.pending) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      void post<WorkBatchPreview | ApiResult>('/api/work-batches/preview', request, abort.signal)
        .then((value) => {
          if (abort.signal.aborted || currentPreview.current !== previewKey) return;
          setPreview({
            key: previewKey,
            ...('result' in value ? { value } : { error: value.message }),
          });
        })
        .catch((error) => {
          if (!abort.signal.aborted && currentPreview.current === previewKey)
            setPreview({
              key: previewKey,
              error:
                error instanceof Error
                  ? error.message
                  : 'Crafting could not be checked. Nothing was started.',
            });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [previewKey, available, !!request, !!operations.pending]);
  const checked = preview?.key === previewKey ? preview : undefined;
  const result = checked?.value;
  const checking =
    available && (catalogue?.key !== readKey || (!!batchSelection && validCount && !checked));
  const catalogueError = catalogue?.key === readKey ? catalogue.error : undefined;
  const missingIngredient = validCount
    ? selected?.ingredients.find((item) => item.available < item.quantity * count)
    : undefined;
  const reason = operations.pending
    ? 'Check the original result before crafting again.'
    : !connected
      ? 'Reconnect to craft.'
      : !validCount
        ? 'Enter a positive whole quantity.'
        : missingIngredient
          ? `Needs ${formatDisplayNumber(missingIngredient.quantity * count - missingIngredient.available)} more ${missingIngredient.name}.`
          : batchSelection
            ? (checked?.error ?? (result?.result.ok ? undefined : result?.result.message))
            : (catalogueError ??
              craft?.reason ??
              (!craft ? 'No crafting action is available for this method.' : undefined));
  const ready =
    available &&
    !operations.pending &&
    !missingIngredient &&
    validCount &&
    !checking &&
    (batchSelection ? !!result?.result.ok && !!result.digest : count === 1 && !!craft?.enabled);
  const craftNow = async () => {
    if (submitting.current || !ready || !selected) return;
    submitting.current = true;
    try {
      if (batchSelection && request && result?.digest)
        await operations.dispatch({
          id: 'craft-selected-quantity',
          label: `Craft ${selected.outputs.map((output) => output.name).join(', ')}`,
          enabled: true,
          command: { type: 'repeat-work', workBatch: request, workBatchDigest: result.digest },
        });
      else if (craft?.intent.kind === 'command')
        await operations.dispatch({
          id: craft.id,
          label: craft.label,
          enabled: craft.enabled,
          command: craft.intent.command,
        });
    } finally {
      submitting.current = false;
    }
  };
  const output = selected?.outputs[0];
  const ports = [
    ...new Set(selected?.outputs.flatMap((item) => item.equipmentPorts ?? []) ?? []),
  ].flatMap((id) => view.player.equipmentPorts.find((port) => port.id === id)?.label ?? []);
  const realSeconds =
    selected && validCount
      ? (selected.workSeconds * count) / (view.clock.baseRatio * view.clock.speed)
      : undefined;
  return (
    <div className="ol-crafting-workspace">
      <aside
        className="ol-crafting-categories"
        aria-label={cataloguePolicy?.categoryLabel ?? 'Recipe categories'}
      >
        <label className="ol-crafting-owned-toggle">
          <input
            type="checkbox"
            role="switch"
            checked={haveEverything}
            onChange={(event) => setHaveEverything(event.target.checked)}
          />
          Have everything
        </label>
        <Button
          variant="quiet"
          aria-pressed={categoryFilter === 'all'}
          onPress={() => setCategoryFilter('all')}
          icon="category.all-recipes"
        >
          {cataloguePolicy?.allLabel ?? 'All recipes'}
          <span className="ol-crafting-count">{matches.length}</span>
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant="quiet"
            aria-pressed={categoryFilter === category.id}
            onPress={() => setCategoryFilter(category.id)}
            icon={category.icon}
          >
            {category.label}
            <span className="ol-crafting-count">
              {matches.filter((recipe) => recipe.category?.id === category.id).length}
            </span>
          </Button>
        ))}
        <details>
          <summary>More filters</summary>
          <label>
            Method source
            <select
              value={creatorFilter}
              onChange={(event) => setCreatorFilter(event.target.value)}
            >
              <option value="all">All methods</option>
              <option value="authored">Authored methods</option>
              <option value="player">Players</option>
              <option value="npc">NPCs</option>
            </select>
          </label>
        </details>
        <Button variant="quiet" icon="action.invent" onPress={invent}>
          Invention
        </Button>
      </aside>
      <section className="ol-crafting-list" aria-label="Known recipes">
        <label className="ol-crafting-search">
          <span className="ol-sr">Search recipes</span>
          <Icon name="ui.search" size={16} />
          <input
            type="search"
            placeholder="Search recipes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="ol-crafting-recipes">
          {recipes.map((recipe) => (
            <Button
              key={recipe.id}
              variant="quiet"
              className="ol-crafting-recipe"
              aria-pressed={selected?.id === recipe.id}
              onPress={() => setSelectedId(recipe.id)}
            >
              <ItemIllustration
                art={recipe.outputs[0]?.art}
                icon={recipe.outputs[0]?.icon ?? 'ui.crafting'}
                label={recipe.outputs[0]?.name ?? recipe.name}
                size={40}
                fallbackSize={24}
                nativeSize
              />
              <span>
                <strong>{recipe.outputs.map((item) => item.name).join(', ')}</strong>
                <span className="ol-caption">{recipe.description}</span>
              </span>
              {held(recipe) && <Icon name="ui.check" size={14} />}
            </Button>
          ))}
        </div>
        {!recipes.length && (
          <EmptyState title={view.recipes.length ? 'No recipes match.' : 'No methods learned yet.'}>
            {view.recipes.length
              ? 'Change the filters or clear your search.'
              : 'Learn from a recipe record or open Invention.'}
          </EmptyState>
        )}
      </section>
      {selected ? (
        <section
          className="ol-crafting-detail"
          aria-label={`Make ${selected.outputs.map((item) => item.name).join(', ')}`}
        >
          <div className="ol-crafting-art" aria-hidden="true">
            <ItemIllustration
              art={output?.art}
              icon={output?.icon ?? 'ui.crafting'}
              label={output?.name ?? selected.name}
              size={132}
              detail
            />
          </div>
          <div className="ol-crafting-identity">
            <h3>{selected.outputs.map((item) => item.name).join(', ')}</h3>
            <p>{selected.description}</p>
          </div>
          {!recipes.some((recipe) => recipe.id === selected.id) && (
            <p className="ol-caption">Your selected method is outside the current filters.</p>
          )}
          <div className="ol-crafting-facts">
            {realSeconds !== undefined && (
              <Tag>
                About {formatDisplayNumber(realSeconds)} real seconds
                {view.clock.paused ? ' while running' : ''}
              </Tag>
            )}
            {ports.map((port) => (
              <Tag key={port}>{port}</Tag>
            ))}
          </div>
          <section aria-label="Ingredients" className="ol-crafting-ingredients">
            <header>
              <h4 className="ol-eyebrow">Ingredients</h4>
              <span className="ol-caption">Have / need</span>
            </header>
            {selected.ingredients.map((item, index) => {
              const need = validCount ? item.quantity * count : undefined;
              return (
                <div key={`${item.name}:${index}`}>
                  <ItemIllustration
                    art={item.art}
                    icon={item.icon ?? 'ui.inventory'}
                    label={item.name}
                    size={44}
                    fallbackSize={18}
                    nativeSize
                  />
                  <span className="ol-crafting-ingredient-name">{item.name}</span>
                  <span
                    className="ol-crafting-ingredient-quantity"
                    data-missing={need !== undefined && item.available < need}
                  >
                    <strong>{formatDisplayNumber(item.available)}</strong>
                    <span> / {need === undefined ? '—' : formatDisplayNumber(need)}</span>
                  </span>
                </div>
              );
            })}
          </section>
          {!!selected.retainedTools.length && (
            <section aria-label="Kept tools" className="ol-crafting-tools">
              <h4>Kept tools</h4>
              {selected.retainedTools.map((tool) => (
                <p key={tool.role}>
                  {tool.quantity}{' '}
                  {tool.choices
                    .map((choice) => `${choice.name} (${choice.available} held)`)
                    .join(' or ')}
                </p>
              ))}
            </section>
          )}
          {batchSelection && (
            <div className="ol-crafting-quantity">
              <label htmlFor={quantityId}>Quantity</label>
              <Button
                size="sm"
                variant="quiet"
                aria-label="Decrease crafting quantity"
                disabled={!!operations.pending || !validCount || count <= 1}
                onPress={() => setQuantityDraft({ id: selected.id, value: String(count - 1) })}
              >
                −
              </Button>
              <input
                id={quantityId}
                aria-describedby={`${quantityId}-hint`}
                type="text"
                inputMode="numeric"
                value={quantityText}
                onChange={(event) =>
                  setQuantityDraft({ id: selected.id, value: event.target.value })
                }
                disabled={!!operations.pending}
              />
              <Button
                size="sm"
                variant="quiet"
                aria-label="Increase crafting quantity"
                disabled={
                  !!operations.pending ||
                  !validCount ||
                  (result?.policy !== undefined && count >= result.policy.maximumBatches)
                }
                onPress={() => setQuantityDraft({ id: selected.id, value: String(count + 1) })}
              >
                +
              </Button>
              <span className="ol-caption" id={`${quantityId}-hint`}>
                Batches{result?.policy ? ` · up to ${result.policy.maximumBatches}` : ''}
              </span>
            </div>
          )}
          {batchSelection && view.player.hasWork && (
            <SelectField
              label="When busy"
              value={schedule}
              onChange={(value) => setSchedule(value as typeof schedule)}
              options={[
                { id: 'enqueue', label: 'After current work' },
                { id: 'interrupt', label: 'Pause current work, then resume' },
                { id: 'replace', label: 'Replace current work' },
              ]}
            />
          )}
          <LoadingIndicator active={checking} label="Checking crafting" />
          {catalogueError && <p role="alert">{catalogueError}</p>}
          <TextTooltip text={reason}>
            <span
              className="ol-crafting-submit"
              tabIndex={reason ? 0 : undefined}
              aria-label={reason ? `Craft. ${reason}` : undefined}
            >
              <Button
                variant="primary"
                icon="action.craft"
                disabled={!ready}
                onPress={() => void craftNow()}
              >
                Craft
              </Button>
            </span>
          </TextTooltip>
          {reason && !checking && <p className="ol-caption ol-crafting-reason">{reason}</p>}
          <details className="ol-crafting-more">
            <summary>Method details and options</summary>
            <RecipeDetails recipe={selected} />
            <Button
              variant="quiet"
              disabled={!connected}
              onPress={(event) => browseRecipe(selected.id, event.target)}
            >
              More crafting options
            </Button>
            <Button
              variant="quiet"
              disabled={!connected || checking}
              onPress={() => setRefresh((value) => value + 1)}
            >
              Refresh crafting
            </Button>
          </details>
        </section>
      ) : selectedId ? (
        <p role="status">This recipe is no longer available. Choose a known output.</p>
      ) : null}
      {(operations.pending || operations.message) && (
        <section className="ol-crafting-operation-feedback" aria-label="Crafting result">
          {operations.pending && (
            <div role="status">
              <p>
                {operations.pending.status === 'sending'
                  ? 'Sending your original crafting request.'
                  : operations.pending.status === 'checking'
                    ? 'Checking your original crafting result.'
                    : 'The original crafting result is unconfirmed.'}
              </p>
              <Button
                variant="quiet"
                disabled={!connected || operations.pending.status !== 'unknown'}
                onPress={() => void operations.check()}
              >
                Check result
              </Button>
            </div>
          )}
          {operations.message && <p role="status">{operations.message}</p>}
        </section>
      )}
    </div>
  );
}
export function EntityDetail({
  entity,
  view,
  connected,
  godControls,
  actionBrowser,
  visible = true,
}: {
  visible?: boolean;
  entity: EntityView;
  view: GameView;
  connected: boolean;
  godControls?: GodCharacterControls;
  actionBrowser: ReactNode;
}) {
  const [personTab, setPersonTab] = useState('overview');
  const events = view.events.filter(
    (event) =>
      event.references?.some((reference) => reference.id === entity.id) ||
      event.actorId === entity.id ||
      event.targetId === entity.id,
  );
  const observations = events
    .filter((event) => !event.speech && event.presentation?.displayToPlayer !== false)
    .slice(-4);
  const details = (
    <div className="ol-person-overview" data-person={entity.kind === 'actor' || undefined}>
      <p className="ol-narrative">{entity.description ?? entity.status}</p>
      {entity.kind !== 'actor' && entity.contents && !entity.storage && (
        <ul>
          {entity.contents.map((item) => (
            <li key={item.id}>
              {item.name} × {item.quantity}
              {!item.portable ? ' (not portable)' : ''}
            </li>
          ))}
        </ul>
      )}
      {entity.status && <Tag>{entity.status}</Tag>}
      {!!entity.attributes?.length && <Condition attributes={entity.attributes} />}
      {entity.quantity !== undefined && <p>{entity.quantity} available</p>}
      {!!entity.traits?.length && (
        <Section title="Traits">
          <Traits traits={entity.traits} />
        </Section>
      )}
      {actionBrowser}
      {godControls && (
        <details>
          <summary>God mode</summary>
          <GodCharacterActions entity={entity} connected={connected} controls={godControls} />
        </details>
      )}
    </div>
  );
  if (entity.kind !== 'actor') return details;
  return (
    <Tabs
      selectedKey={personTab}
      onSelectionChange={(key) => setPersonTab(String(key))}
      className="ol-person-details"
    >
      <TabList aria-label="Person information">
        <Tab id="overview" className="ol-navigation-tab">
          <Icon name="ui.overview" size={16} />
          <span>Overview</span>
        </Tab>
        <Tab id="events" className="ol-navigation-tab">
          <Icon name="ui.events" size={16} />
          <span>Events</span>
        </Tab>
      </TabList>
      <TabPanel id="overview" shouldForceMount>
        <div className="ol-person-overview" data-person>
          <div className="ol-person-column">
            <Section title="Doing now">
              <p>{entity.status}</p>
            </Section>
            {!!entity.attributes?.length && <Condition attributes={entity.attributes} />}
            {!!entity.statusEffects?.length && (
              <Section title="Conditions seen">
                <div className="ol-person-condition-list">
                  {entity.statusEffects.map((effect) => (
                    <Explanation key={effect.id} title={effect.label} text={effect.explanation}>
                      <span tabIndex={0} className="ol-person-condition">
                        <Icon name={effect.icon ?? 'ui.condition'} size={16} />
                        {effect.label}
                      </span>
                    </Explanation>
                  ))}
                </div>
              </Section>
            )}
            <Section title="Observations">
              {observations.length ? (
                observations.map((event) => (
                  <div className="ol-person-observation" key={event.id}>
                    <span>
                      <PerceivedEventText event={event} />
                    </span>
                    <span className="ol-caption">
                      <EventTime time={event.time} />
                    </span>
                  </div>
                ))
              ) : (
                <p className="ol-caption">No observations are recorded here.</p>
              )}
            </Section>
            {!!entity.traits?.length && (
              <details>
                <summary>Traits</summary>
                <Traits traits={entity.traits} />
              </details>
            )}
          </div>
          <div className="ol-person-column">
            <Section title="Commitments">
              <Promises
                personId={entity.id}
                visible={visible && personTab === 'overview'}
                revision={view.historyRevision}
              />
            </Section>
            <PersonKnowledge
              entity={entity}
              view={view}
              connected={connected}
              visible={visible && personTab === 'overview'}
              compact
            />
            {actionBrowser}
            {godControls && (
              <details>
                <summary>God mode</summary>
                <GodCharacterActions entity={entity} connected={connected} controls={godControls} />
              </details>
            )}
          </div>
        </div>
      </TabPanel>
      <TabPanel id="events">
        <Section title="Perceived events">
          {events.length ? (
            events.map((event) => (
              <p key={event.id}>
                <PerceivedEventText event={event} />
              </p>
            ))
          ) : (
            <EmptyState title="No events with this person are in the current view" />
          )}
        </Section>
      </TabPanel>
    </Tabs>
  );
}
export function Character({
  godControls,
  openMind,
  openActivity,
  view,
  command,
  connected,
  actionSubject,
  actionEntry,
  conditionEntry,
  workEntry,
  chooseActionSubject,
  clearActionSubject,
  visible = true,
}: {
  view: GameView;
  command: CommandDispatcher;
  connected: boolean;
  godControls?: GodCharacterControls;
  openMind?: () => void;
  openActivity?: () => void;
  actionSubject?: EntityView | null;
  actionEntry?: number;
  conditionEntry?: number;
  workEntry?: number;
  chooseActionSubject?(): void;
  clearActionSubject?(): void;
  visible?: boolean;
}) {
  const [section, setSection] = useState('condition');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [failedFigure, setFailedFigure] = useState<string>();
  const statusDetails = useRef<HTMLDetailsElement>(null);
  const statusesOnly = view.player.scars?.length
    ? { ...view, player: { ...view.player, scars: [] } }
    : view;
  useEffect(() => {
    if (actionEntry) {
      setSection('condition');
      setActionsOpen(true);
    }
  }, [actionEntry]);
  useEffect(() => {
    if (conditionEntry) setSection('condition');
  }, [conditionEntry]);
  useEffect(() => {
    if (workEntry) {
      setSection('condition');
      setActionsOpen(true);
    }
  }, [workEntry]);
  const openStatusDetails = () => {
    if (!statusDetails.current) return;
    statusDetails.current.open = true;
    statusDetails.current.querySelector('summary')?.focus({ preventScroll: true });
  };
  return (
    <div className="ol-character ol-character-sheet">
      <div className="ol-character-information">
        <header className="ol-character-identity">
          <strong>{view.player.name}</strong>
          {!view.player.alive && <Tag tone="danger">Cannot act</Tag>}
          {view.player.participation === 'exiting' && <Tag>Leaving the world</Tag>}
          {view.player.participation === 'inactive' && <Tag>Away</Tag>}
        </header>
        <Tabs
          selectedKey={section}
          onSelectionChange={(key) => setSection(String(key))}
          className="ol-character-sections"
        >
          <TabList aria-label="Character sections" className="ol-character-tabs">
            <Tab id="condition">
              <Icon name="ui.condition" size={14} />
              Condition
            </Tab>
            <Tab id="attributes">
              <Icon name="ui.attributes" size={14} />
              Attributes
            </Tab>
            <Tab id="mind">
              <Icon name="ui.cognition" size={14} />
              Mind
            </Tab>
          </TabList>
          <TabPanel id="condition" shouldForceMount className="ol-character-page">
            <section className="ol-character-needs" aria-label="Condition">
              {view.player.attributes.map((attribute) => (
                <div
                  key={attribute.id}
                  className="ol-character-need"
                  data-has-condition={!!attribute.condition}
                >
                  <Condition attributes={[attribute]} showCondition />
                </div>
              ))}
            </section>
            {!!view.player.statusEffects?.length && (
              <section aria-label="Statuses" className="ol-character-effects">
                <h3 className="ol-eyebrow">Statuses</h3>
                <ConditionStatuses view={statusesOnly} openCondition={openStatusDetails} />
                <details ref={statusDetails} className="ol-character-effect-details">
                  <summary>Condition details</summary>
                  {view.player.statusEffects.map((effect) => (
                    <div key={effect.id}>
                      <strong>{effect.label}</strong>
                      {effect.explanation && <p>{effect.explanation}</p>}
                      {effect.timing && <GameDeadline at={effect.timing.expiresAt} label="Ends" />}
                    </div>
                  ))}
                </details>
              </section>
            )}
            {!!view.player.scars?.length && (
              <section aria-label="Injuries" className="ol-character-effects">
                <h3 className="ol-eyebrow">Injuries</h3>
                <div className="ol-character-injuries">
                  {view.player.scars.map((scar) => (
                    <Explanation
                      key={scar.id}
                      title={scar.name}
                      text={scar.description}
                      facts={[['Treatments remaining', String(scar.treatmentsRemaining)]]}
                    >
                      <span
                        className="ol-character-injury"
                        tabIndex={0}
                        aria-label={`${scar.name}. ${scar.description}. Treatments remaining: ${scar.treatmentsRemaining}.`}
                      >
                        <Icon name="ui.condition" />
                      </span>
                    </Explanation>
                  ))}
                </div>
              </section>
            )}
            {!view.player.alive && <p>This character cannot act right now.</p>}
            {openActivity && view.player.activity && (
              <Button variant="quiet" onPress={openActivity}>
                Task: {view.player.activity.name} ({view.player.activity.status})
              </Button>
            )}
            <details
              className="ol-character-record-detail ol-character-capabilities"
              open={actionsOpen}
              onToggle={(event) => setActionsOpen(event.currentTarget.open)}
            >
              <summary>Actions and abilities</summary>
              <OutingStatus view={view} connected={connected} command={command} />
              <ActionAttempts
                key={`${view.access?.privateDraftScope}:${view.worldId}:${view.saveTimeline}:${view.player.id}`}
                view={view}
                connected={connected}
                subject={actionSubject}
                entry={actionEntry}
                workEntry={workEntry}
                chooseSubject={chooseActionSubject}
                clearSubject={clearActionSubject}
                openActivity={openActivity}
                visible={visible && section === 'condition' && actionsOpen}
              >
                {!!view.player.practice?.length && (
                  <Section title="Practice">
                    {view.player.practice.map((progress) => (
                      <div key={progress.id}>
                        <Tag>
                          {progress.name}: {progress.rankLabel}
                        </Tag>
                        <p>{progress.progressText}</p>
                        {progress.starting && (
                          <p className="ol-caption">{progress.authoredStartingText}</p>
                        )}
                        <p className="ol-caption">
                          {progress.scope} {progress.effect}
                        </p>
                        <details>
                          <summary>
                            {progress.evidenceHeading} ({progress.evidence.length})
                          </summary>
                          <ul>
                            {progress.evidence.map((evidence, index) => (
                              <li key={evidence.occurrenceId}>
                                {progress.evidenceItemTemplate
                                  .replaceAll('{number}', String(index + 1))
                                  .replaceAll('{description}', evidence.description)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    ))}
                  </Section>
                )}
                <details className="ol-character-record-detail">
                  <summary>Actions and learned activities</summary>
                  <ActivityHistory key={view.historyEpoch} actorId={view.player.id} owned />
                </details>
              </ActionAttempts>
            </details>
          </TabPanel>
          <TabPanel id="attributes" className="ol-character-page">
            <section className="ol-character-values" aria-label="Attributes">
              {view.player.attributes.length ? (
                <dl>
                  {view.player.attributes.map((attribute) => (
                    <div key={attribute.id}>
                      <dt>
                        <Explanation
                          title={attribute.name}
                          text={attribute.meaning}
                          facts={
                            attribute.condition ? [['Condition', attribute.condition]] : undefined
                          }
                        >
                          <span tabIndex={0}>{attribute.name}</span>
                        </Explanation>
                      </dt>
                      <dd>
                        {attribute.status === 'unknown'
                          ? 'Unknown'
                          : attribute.value === null
                            ? 'Unavailable'
                            : typeof attribute.value === 'number'
                              ? formatDisplayNumber(attribute.value, {
                                  integer: attribute.bodyHealth,
                                })
                              : attribute.value}
                        {attribute.status === 'known' && attribute.value !== null && attribute.unit
                          ? ` ${attribute.unit}`
                          : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>No attributes are provided for this character.</p>
              )}
            </section>
          </TabPanel>
          <TabPanel id="mind" shouldForceMount className="ol-character-page">
            {openMind && (
              <Button variant="quiet" onPress={openMind}>
                My thoughts and relationships
              </Button>
            )}
            <Section title="Traits">
              <Traits traits={view.player.traits} />
            </Section>
            <Section title="Memories">
              <MemoryHistory
                key={JSON.stringify([
                  view.access?.privateDraftScope,
                  view.worldId,
                  view.saveTimeline,
                  view.player.id,
                ])}
                actorId={view.player.id}
                owned
                requestScope={JSON.stringify([
                  view.access?.scope,
                  view.access?.controlGeneration,
                  view.historyEpoch,
                ])}
                revision={view.player.memoryRevision}
                visible={visible && section === 'mind'}
              />
            </Section>
          </TabPanel>
        </Tabs>
        {godControls && (
          <details className="ol-character-record-detail">
            <summary>Character controls (God mode)</summary>
            <GodCharacterActions
              entity={playerEntity(view)}
              connected={connected}
              controls={godControls}
            />
          </details>
        )}
      </div>
      <section className="ol-character-figure" aria-label="Equipment">
        <div className="ol-character-figure-art" aria-hidden="true">
          {view.player.portrait?.figurePath && failedFigure !== view.player.portrait.figurePath ? (
            <img
              src={assetUrl(view.player.portrait.figurePath)}
              alt=""
              onError={() => setFailedFigure(view.player.portrait?.figurePath)}
            />
          ) : (
            <Portrait art={view.player.portrait} label={view.player.name} size={160} />
          )}
        </div>
        <ul className="ol-character-ports">
          {view.player.equipmentPorts.map((port) => (
            <li key={port.id}>
              <Explanation title={port.label} text={port.item?.name ?? 'Empty'}>
                <span
                  className="ol-character-port"
                  tabIndex={0}
                  aria-label={`${port.label}: ${port.item?.name ?? 'Empty'}`}
                  data-occupied={!!port.item}
                >
                  <ItemIllustration
                    art={port.item?.art}
                    icon={port.item?.icon ?? port.icon ?? 'ui.inventory'}
                    label={port.item?.name ?? port.label}
                    size={40}
                    fallbackSize={18}
                    nativeSize
                  />
                  <span className="ol-sr">
                    {port.label}: {port.item?.name ?? 'Empty'}
                  </span>
                </span>
              </Explanation>
            </li>
          ))}
        </ul>
        {!view.player.equipmentPorts.length && (
          <p className="ol-caption">This character has no equipment places.</p>
        )}
        <p className="ol-character-equipment-hint ol-caption">
          Change equipped items in Inventory.
        </p>
      </section>
    </div>
  );
}
type AiSettingsView = Pick<GameView, 'ai' | 'godMode'> & {
  player: Pick<GameView['player'], 'id'>;
  entities: Array<Pick<EntityView, 'id' | 'name'>>;
};
export const AiSettings = memo(
  function AiSettings({ view }: { view: AiSettingsView }) {
    const ai = view.ai,
      b = ai.budget;
    const account = b.accounts?.[view.player.id];
    if (!view.godMode)
      return (
        <>
          <Section title="Your allowance">
            <UsageRemaining
              limit={b.limitUsd}
              spent={account?.spentUsd ?? 0}
              reserved={account?.reservedUsd ?? 0}
              available={ai.llmConfigured && b.limitUsd > 0}
            />
            <p>
              Describing an action or proposing a new invention uses this character's allowance.
              Existing native actions remain available according to the world's rules.
            </p>
            <p className="ol-caption">
              Allowance includes work already in progress.{' '}
              {b.period ? `Current period: ${b.period}.` : ''}
            </p>
          </Section>
          <Section title="Intelligence availability">
            <p>
              {ai.mode === 'fixture'
                ? 'This world is using test replies.'
                : ai.llmConfigured
                  ? 'Intelligence is connected.'
                  : 'Intelligence is unavailable. The world owner can configure it.'}
            </p>
          </Section>
        </>
      );
    return (
      <>
        <Tag>{ai.mode === 'fixture' ? 'Test fixtures — not live AI' : ai.mode}</Tag>
        <p>{ai.message}</p>
        <Section title="Connect intelligence">
          <p>
            On the computer running Open Legend, configure the backend in <code>.env</code> and
            choose a nonzero <code>AI_BUDGET_USD</code>, then restart the server.
          </p>
          <p className="ol-meta">
            Macrofold also requires an explicit compute allowance. See the project’s live AI setup
            guide. Credentials stay on the server.
          </p>
          <p>
            Language model: {ai.llmConfigured ? 'Configured' : 'Not configured'}
            <br />
            Jev: {ai.jevConfigured ? 'Configured' : 'Not configured'}
          </p>
        </Section>
        <Section title="Monthly agent allowances">
          <h3 className="ol-heading">
            ${b.limitUsd.toFixed(2)} per agent · {b.period ?? 'current month'}
          </h3>
          <p>
            Total spent ${b.spentUsd.toFixed(4)}
            {b.estimated ? ' (estimated)' : ''}
            <br />
            Reserved ${b.reservedUsd.toFixed(4)}
          </p>
          {Object.entries(b.accounts ?? {}).map(([id, account]) => (
            <p key={id}>
              {view.entities.find((e) => e.id === id)?.name ?? id}: $
              {Math.max(0, b.limitUsd - account.spentUsd - account.reservedUsd).toFixed(2)}{' '}
              remaining
            </p>
          ))}
          <p className="ol-caption">
            Connected background play follows your time settings. Requests already sent may still
            incur usage while paused.
          </p>
        </Section>
        <details>
          <summary>Execution details</summary>
          <p>
            {ai.usage.llmCalls} language model calls · {ai.usage.jevCalls} Jev calls
            <br />
            {ai.usage.inputTokens} input / {ai.usage.outputTokens} output tokens
            <br />
            Last latency {(ai.usage.lastLatencyMs / 1000).toFixed(1)}s
          </p>
          {ai.jobs
            .filter((job) => job.status === 'failed')
            .map((job) => (
              <p key={job.id}>
                <Tag>Failed</Tag> {job.message}
              </p>
            ))}
        </details>
      </>
    );
  },
  ({ view: previous }, { view: next }) =>
    previous.ai === next.ai &&
    previous.godMode === next.godMode &&
    previous.player.id === next.player.id &&
    previous.entities.length === next.entities.length &&
    previous.entities.every(
      (entity, index) =>
        entity.id === next.entities[index]?.id && entity.name === next.entities[index]?.name,
    ),
);
