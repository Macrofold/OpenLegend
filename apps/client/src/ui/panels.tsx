import { useState } from 'react';
import { EventTime } from './event-time';
import { Button as AriaButton } from 'react-aria-components';
import type { ActionOption, EntityView, GameView, InventoryItemView } from '@open-legend/protocol';
import {
  Button,
  Condition,
  EmptyState,
  EntityRow,
  Explanation,
  Section,
  Tag,
  symbol,
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
export function Inventory({
  view,
  command,
  connected,
}: {
  view: GameView;
  command(a: ActionOption): void;
  connected: boolean;
}) {
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState<string | null>(null);
  const item = view.player.inventory.find((i) => i.id === selected);
  const row = (i: InventoryItemView) => (
    <EntityRow
      key={i.id}
      name={i.name}
      meta={i.equipped ? 'Equipped' : i.category}
      count={i.quantity}
      icon={symbol(i.definitionId)}
      onPress={() => setSelected(i.id)}
    />
  );
  return (
    <>
      <input
        type="search"
        aria-label="Search inventory"
        placeholder="Search possessions…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {item ? (
        <>
          <Button size="sm" variant="quiet" icon="ui.back" onPress={() => setSelected(null)}>
            All possessions
          </Button>
          <h3 className="ol-heading">
            {item.name} × {item.quantity}
          </h3>
          <p>{item.description}</p>
          <div className="ol-traits">
            {item.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <Actions actions={item.actions} command={command} connected={connected} />
        </>
      ) : (
        <>
          {(['material', 'food', 'equipment', 'ammunition'] as const).map((category) => {
            const items = view.player.inventory.filter(
              (i) => i.category === category && i.name.toLowerCase().includes(query.toLowerCase()),
            );
            return items.length ? (
              <Section key={category} title={category} count={items.length}>
                {items.map(row)}
              </Section>
            ) : null;
          })}
          {!view.player.inventory.some((i) =>
            i.name.toLowerCase().includes(query.toLowerCase()),
          ) && (
            <EmptyState title="Nothing here yet.">
              Gather resources in the clearing to fill your pack.
            </EmptyState>
          )}
        </>
      )}
    </>
  );
}
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
  return (
    <>
      <Section title="Known recipes" count={view.recipes.length}>
        {view.recipes.length ? (
          view.recipes.map((r) => (
            <details className="ol-proposal" key={r.id}>
              <summary>
                <span className="ol-heading">{r.name}</span> <Tag>Known recipe</Tag>
              </summary>
              <p>{r.description}</p>
              <dl>
                <dt>Needs</dt>
                <dd>
                  {r.ingredients.map((i) => (
                    <div key={`${i.name}-${i.role}`}>
                      {i.quantity} {i.name} · {i.available} held
                    </div>
                  ))}
                </dd>
                <dt>Time</dt>
                <dd>{r.workSeconds} game seconds</dd>
                <dt>Gives</dt>
                <dd>{r.name}</dd>
              </dl>
              <Actions actions={r.actions} command={command} connected={connected} />
              <p className="ol-caption">{r.provenance}</p>
            </details>
          ))
        ) : (
          <EmptyState title="Nothing invented yet.">
            Describe a useful tool and discover a way to make it.
          </EmptyState>
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
  connected,
  command,
  talk,
  inspectMind,
  editPerson,
}: {
  entity: EntityView;
  connected: boolean;
  command(a: ActionOption): void;
  talk(id: string): void;
  inspectMind?(): void;
  editPerson?(): void;
}) {
  return (
    <>
      <p className="ol-narrative">{entity.description ?? entity.status}</p>
      <Tag>{entity.status}</Tag>
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
      <Actions actions={entity.actions} command={command} connected={connected} />
      {editPerson && (
        <Button variant="quiet" size="sm" icon="ui.character" onPress={editPerson}>
          Edit Person · God mode
        </Button>
      )}
      {inspectMind && (
        <Button variant="quiet" size="sm" onPress={inspectMind}>
          Inspect private mind · God mode
        </Button>
      )}
    </>
  );
}
export function Character({
  view,
  command,
  connected,
}: {
  view: GameView;
  command(a: ActionOption): void;
  connected: boolean;
}) {
  return (
    <>
      <Section title="Condition">
        <Condition {...view.player} />
        <Actions actions={view.player.actions} command={command} connected={connected} />
      </Section>
      <Section title="Traits">
        <Traits traits={view.player.traits} />
        <p className="ol-caption">Starting dispositions, with no mechanical bonuses.</p>
      </Section>
      <Section title="Memories">
        {view.player.memories?.length ? (
          view.player.memories.map((m) => (
            <div className="ol-memory" key={m.id}>
              <EventTime time={m.time} />
              <span>{m.text}</span>
            </div>
          ))
        ) : (
          <p className="ol-meta">Your experiences will leave memories here.</p>
        )}
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
      <Section title="World allowance">
        <h3 className="ol-heading">
          ${Math.max(0, b.limitUsd - b.spentUsd - b.reservedUsd).toFixed(2)} remaining
        </h3>
        <p>
          Limit ${b.limitUsd.toFixed(2)} · Spent ${b.spentUsd.toFixed(4)}
          {b.estimated ? ' (estimated)' : ''}
          <br />
          Reserved ${b.reservedUsd.toFixed(4)}
        </p>
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
