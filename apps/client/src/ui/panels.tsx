import { GodCharacterActions, type GodCharacterControls } from './god-character-actions';
import { playerEntity } from '../entity-view';
import { useState } from 'react';
import { EventTime } from './event-time';
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
  const [creatorFilter, setCreatorFilter] = useState('all');
  const recipes = view.recipes.filter(
    (recipe) => creatorFilter === 'all' || recipe.npcCreated === (creatorFilter === 'npc'),
  );
  return (
    <>
      <Section title="Known recipes" count={recipes.length}>
        <label>
          Created by{' '}
          <select
            aria-label="Recipe creator"
            value={creatorFilter}
            onChange={(event) => setCreatorFilter(event.target.value)}
          >
            <option value="all">Everyone</option>
            <option value="player">Players</option>
            <option value="npc">NPCs</option>
          </select>
        </label>
        {recipes.length ? (
          recipes.map((r) => (
            <details className="ol-proposal" key={r.id}>
              <summary>
                <span className="ol-heading">{r.name}</span>{' '}
                <Tag>{r.npcCreated ? 'NPC-created' : 'Player-created'}</Tag>
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
          <EmptyState
            title={view.recipes.length ? 'No recipes match this filter.' : 'Nothing invented yet.'}
          >
            {view.recipes.length
              ? 'Choose another creator filter.'
              : 'Describe a useful tool and discover a way to make it.'}
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
  godControls,
}: {
  entity: EntityView;
  connected: boolean;
  command(a: ActionOption): void;
  talk(id: string): void;
  godControls?: GodCharacterControls;
}) {
  return (
    <>
      <p className="ol-narrative">{entity.description ?? entity.status}</p>
      {entity.contents && (
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
  view,
  command,
  connected,
}: {
  view: GameView;
  command(a: ActionOption): void;
  connected: boolean;
  godControls?: GodCharacterControls;
  openMind?: () => void;
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
