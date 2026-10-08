import { ItemTrade } from './item-trade';
import { OutingStatus } from './outing-status';
import { namePhrase } from '@open-legend/language';
import { GodCharacterActions, type GodCharacterControls } from './god-character-actions';
import { playerEntity } from '../entity-view';
import { UsageRemaining } from './usage-remaining';
import { ActionAttempts } from './action-attempts';
import { RecipeDetails } from './recipe-details';
import { useEffect, useState } from 'react';
import { MemoryHistory } from './memory-history';
import { ActivityHistory } from './activity-history';
import { ActivityEntries, type ActivityEntry } from './camp-activity';
import { Button as AriaButton, Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import type { ActionOption, ApiResult, EntityView, GameView } from '@open-legend/protocol';
import {
  Button,
  Condition,
  EmptyState,
  Explanation,
  Icon,
  Section,
  Tag,
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
        <div key={a.id}>
          <Button size="sm" disabled={!a.enabled || !connected} onPress={() => command(a)}>
            {a.label}
          </Button>
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
  command,
  connected,
  invent,
}: {
  view: GameView;
  command(a: ActionOption): void;
  connected: boolean;
  invent(): void;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const recipes = view.recipes.filter((recipe) =>
    `${recipe.output.name} ${recipe.name}`.toLocaleLowerCase().includes(search),
  );
  const selected = selectedId
    ? view.recipes.find((recipe) => recipe.id === selectedId)
    : recipes[0];
  return (
    <>
      <Section title="Known recipes" count={recipes.length}>
        <label className="ol-task-search">
          Find an output
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="ol-recipe-choices" aria-label="Known recipe outputs">
          {recipes.map((recipe) => (
            <Button
              key={recipe.id}
              variant={selected?.id === recipe.id ? 'secondary' : 'quiet'}
              aria-pressed={selected?.id === recipe.id}
              onPress={() => setSelectedId(recipe.id)}
            >
              <span>
                <strong>{recipe.output.name}</strong>
                <span className="ol-caption">
                  {recipe.name}
                  {!recipe.actions.some((action) => action.enabled)
                    ? ' · Missing requirements'
                    : ''}
                </span>
              </span>
            </Button>
          ))}
        </div>
        {!recipes.length && (
          <EmptyState
            title={view.recipes.length ? 'No recipes match this filter.' : 'Nothing invented yet.'}
          >
            {view.recipes.length
              ? 'Change or clear the output search.'
              : 'Describe a useful tool and discover a way to make it.'}
          </EmptyState>
        )}
        {selected ? (
          <section className="ol-selected-recipe" aria-label={`Make ${selected.output.name}`}>
            {!!search && !recipes.some((recipe) => recipe.id === selected.id) && (
              <p className="ol-caption">
                Your selected output is outside this filter. Clear the search to see it in the list.
              </p>
            )}
            <h3>{selected.output.name}</h3>
            <RecipeDetails recipe={selected} />
            <Actions actions={selected.actions} command={command} connected={connected} />
          </section>
        ) : (
          selectedId && (
            <p role="status">This recipe is no longer available. Choose a known output.</p>
          )
        )}
      </Section>
      <Button variant="primary" icon="action.invent" onPress={invent}>
        Invent a tool
      </Button>
    </>
  );
}
export function EntityDetail({
  entity,
  view,
  connected,
  command,
  talk,
  openContainer,
  openActivity,
  godControls,
}: {
  entity: EntityView;
  view: GameView;
  connected: boolean;
  command(a: ActionOption): Promise<ApiResult>;
  talk(id: string): void;
  openContainer(entity: EntityView): void;
  openActivity(entry: ActivityEntry): void;
  godControls?: GodCharacterControls;
}) {
  return (
    <>
      <p className="ol-narrative">{entity.description ?? entity.status}</p>
      {entity.contents && !entity.storage && (
        <ul>
          {entity.contents.map((item) => (
            <li key={item.id}>
              {item.name} × {item.quantity}
              {!item.portable ? ' · Not portable' : ''}
            </li>
          ))}
        </ul>
      )}
      <Tag>{entity.status}</Tag>
      {!!entity.attributes?.length && <Condition attributes={entity.attributes} />}
      {entity.quantity !== undefined && <p>{entity.quantity} available</p>}
      {!!entity.traits?.length && (
        <Section title="Traits">
          <Traits traits={entity.traits} />
        </Section>
      )}
      {entity.canTalk && (
        <Button icon="action.talk" onPress={() => talk(entity.id)}>
          Talk to {namePhrase(entity, 'definite')}
        </Button>
      )}
      {entity.storage && (
        <Button
          variant="primary"
          icon="ui.inventory"
          disabled={!connected}
          onPress={() => openContainer(entity)}
        >
          Open {entity.name}
        </Button>
      )}
      <ActivityEntries
        view={view}
        targetId={entity.id}
        connected={connected}
        onOpen={openActivity}
      />
      <Actions
        actions={
          entity.trade
            ? entity.actions.filter((action) => action.command.type !== 'handover')
            : entity.actions
        }
        command={command}
        connected={connected}
      />
      {entity.trade && (
        <ItemTrade
          key={entity.trade.scope}
          trade={entity.trade}
          connected={connected}
          command={command}
        />
      )}
      {godControls && (
        <GodCharacterActions entity={entity} connected={connected} controls={godControls} />
      )}
    </>
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
  openInventory,
  visible = true,
}: {
  view: GameView;
  command(a: ActionOption): void;
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
  openInventory?(): void;
  visible?: boolean;
}) {
  const [section, setSection] = useState('condition');
  const equipped = view.player.inventory.find((item) => item.equipped);
  useEffect(() => {
    if (actionEntry) setSection('capabilities');
  }, [actionEntry]);
  useEffect(() => {
    if (conditionEntry) setSection('condition');
  }, [conditionEntry]);
  useEffect(() => {
    if (workEntry) setSection('capabilities');
  }, [workEntry]);
  return (
    <div className="ol-character">
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
          <Tab id="condition">Condition</Tab>
          <Tab id="capabilities">Capabilities</Tab>
          <Tab id="equipment">Equipped</Tab>
          <Tab id="record">Record</Tab>
        </TabList>
        <TabPanel id="condition" className="ol-character-page">
          <Section title="Condition">
            <Condition {...view.player} />
            {view.player.scars?.map((scar) => (
              <div key={scar.id}>
                <Tag>{scar.name}</Tag>
                <p className="ol-caption">
                  {scar.description} Treatments remaining: {scar.treatmentsRemaining}.
                </p>
              </div>
            ))}
            <div className="ol-character-statuses">
              {view.player.statusEffects?.map((effect) => (
                <Tag key={effect.id}>{effect.label}</Tag>
              ))}
            </div>
            {!view.player.alive && <p>This character cannot act right now.</p>}
          </Section>
          <Section title="Available responses">
            <Actions
              actions={view.player.actions.filter((action) => action.command.type !== 'cancel')}
              command={command}
              connected={connected}
            />
            {!view.player.actions.some((action) => action.command.type !== 'cancel') && (
              <p className="ol-caption">No direct response is offered in this condition.</p>
            )}
          </Section>
          {openActivity && view.player.activity && (
            <Button variant="quiet" onPress={openActivity}>
              Task · {view.player.activity.name} · {view.player.activity.status}
            </Button>
          )}
        </TabPanel>
        <TabPanel id="capabilities" shouldForceMount className="ol-character-page">
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
            visible={visible && section === 'capabilities'}
          >
            <Section title="Actions available to you">
              <Actions
                actions={view.player.actions.filter((action) => action.command.type !== 'cancel')}
                command={command}
                connected={connected}
              />
              <p className="ol-caption">
                Select something in the world to see its actions. Belongings and known recipes keep
                their actions with the item or output.
              </p>
            </Section>
            <details className="ol-character-record-detail">
              <summary>Actions and learned activities</summary>
              <ActivityHistory actorId={view.player.id} owned />
            </details>
          </ActionAttempts>
        </TabPanel>
        <TabPanel id="equipment" className="ol-character-page">
          <Section title="Equipped item">
            {equipped ? (
              <div className="ol-character-equipment">
                <Icon
                  name={equipped.icon ?? 'ui.inventory'}
                  fallbackLabel={equipped.name}
                  size={32}
                />
                <div>
                  <h3>{equipped.name}</h3>
                  <p>{equipped.description}</p>
                </div>
              </div>
            ) : (
              <p>No item is equipped.</p>
            )}
            <p className="ol-caption">Compare or change your equipped item in Inventory.</p>
            {openInventory && (
              <Button icon="ui.inventory" onPress={openInventory}>
                Open inventory
              </Button>
            )}
          </Section>
        </TabPanel>
        <TabPanel id="record" shouldForceMount className="ol-character-page">
          {openMind && (
            <Button variant="quiet" onPress={openMind}>
              My thoughts and relationships
            </Button>
          )}
          <Section title="Traits">
            <Traits traits={view.player.traits} />
            <p className="ol-caption">Starting dispositions, with no mechanical bonuses.</p>
          </Section>
          <Section title="Memories">
            <MemoryHistory
              key={`${view.access?.scope}:${view.worldId}:${view.saveTimeline}:${view.historyEpoch}:${view.player.id}`}
              actorId={view.player.id}
              owned
              recent={view.player.memories}
              visible={visible && section === 'record'}
            />
          </Section>
        </TabPanel>
      </Tabs>
      {godControls && (
        <details className="ol-character-record-detail">
          <summary>God mode · Character controls</summary>
          <GodCharacterActions
            entity={playerEntity(view)}
            connected={connected}
            controls={godControls}
          />
        </details>
      )}
    </div>
  );
}
export function AiSettings({ view }: { view: GameView }) {
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
          On the computer running Open Legend, configure the backend in <code>.env</code> and choose
          a nonzero <code>AI_BUDGET_USD</code>, then restart the server.
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
            {Math.max(0, b.limitUsd - account.spentUsd - account.reservedUsd).toFixed(2)} remaining
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
}
