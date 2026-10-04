import { GodCharacterActions, type GodCharacterControls } from './god-character-actions';
import { playerEntity } from '../entity-view';
import { ActionAttempts } from './action-attempts';
import { RecipeDetails } from './recipe-details';
import { useState } from 'react';
import { MemoryHistory } from './memory-history';
import { ActivityEntries, type ActivityEntry } from './camp-activity';
import { Button as AriaButton } from 'react-aria-components';
import type { ActionOption, EntityView, GameView } from '@open-legend/protocol';
import {
  Button,
  Condition,
  EmptyState,
  Explanation,
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
  command(a: ActionOption): void;
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
          Talk to {entity.name}
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
      <Actions actions={entity.actions} command={command} connected={connected} />
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
}: {
  view: GameView;
  command(a: ActionOption): void;
  connected: boolean;
  godControls?: GodCharacterControls;
  openMind?: () => void;
  openActivity?: () => void;
}) {
  return (
    <>
      {godControls && (
        <GodCharacterActions
          entity={playerEntity(view)}
          connected={connected}
          controls={godControls}
        />
      )}
      {openMind && <Button onPress={openMind}>My thoughts and relationships</Button>}
      {openActivity && view.player.activity && <Button onPress={openActivity}>Current task</Button>}
      <ActionAttempts
        key={`${view.access?.scope}:${view.access?.controlGeneration}:${view.worldId}:${view.saveTimeline}:${view.player.id}`}
        view={view}
        connected={connected}
      />
      <Section title="Condition">
        <Condition {...view.player} />
        {view.player.statusEffects?.map((effect) => (
          <Tag key={effect.id}>{effect.label}</Tag>
        ))}
        <Actions actions={view.player.actions} command={command} connected={connected} />
      </Section>
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
        />
      </Section>
    </>
  );
}
export function AiSettings({ view }: { view: GameView }) {
  const ai = view.ai,
    b = ai.budget;
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
