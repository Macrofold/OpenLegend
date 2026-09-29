import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccessCapability, OperationsView, WorldOverview } from '@open-legend/protocol';
import { AccessError, getOperations, post } from '../api';
import { Button, Section, Tag } from '../design-system/components';
import { GameSavesPanel } from './game-saves';
import { useLocal } from './storage';
import './operations.css';

/** Characterless sessions poll instead of streaming: no presence, no control lease. */
const REFRESH_MS = 5_000;
const CAPABILITY_TEXT: Record<AccessCapability, string> = {
  play: 'Play a character',
  spectate: 'Watch the world overview',
  create: 'Creator tools and maintenance',
  inspect: 'Inspect characters and diagnostics',
  save: 'Save and load the world',
  'manage-access': 'Invite people and manage access',
};
const PAUSE_TEXT = {
  manual: 'Paused',
  away: 'Paused while players are away',
  storage: 'Paused: storage needs attention',
  maintenance: 'Paused for maintenance',
} as const;

/** World operations for operators, spectators and creators; see
 * docs/projects/multiplayer-entry-maintenance.md. */
export function OperationsConsole() {
  const [theme] = useLocal('open-legend:theme', 'wilderness', (v): v is string =>
    ['wilderness', 'fantasy', 'scifi'].includes(String(v)),
  );
  const [view, setView] = useState<OperationsView | null>(null);
  const [error, setError] = useState('');
  const latest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++latest.current;
    try {
      const next = await getOperations();
      if (request !== latest.current) return;
      setView(next);
      setError('');
    } catch (reason) {
      if (request !== latest.current) return;
      if (reason instanceof AccessError) setView(null);
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);
  const can = (capability: AccessCapability) => !!view?.capabilities.includes(capability);
  return (
    <div className="ol-root ol-operations" data-theme={theme}>
      <header className="ol-operations-head">
        <h1 className="ol-wordmark t-wordmark">OPEN LEGEND</h1>
        <span className="ol-heading">World operations</span>
        <div className="ol-operations-links">
          {view?.actorId && <a href="/">Return to your character</a>}
          {view?.mode === 'oidc' && (
            <Button
              size="sm"
              variant="quiet"
              onPress={() =>
                void post('/api/session/logout', {})
                  .then(() => window.location.assign('/'))
                  .catch((reason: unknown) => setError(String(reason)))
              }
            >
              Sign out
            </Button>
          )}
        </div>
      </header>
      {!view ? (
        <div className="ol-card ol-operations-card">
          <p role="status">{error || 'Loading world operations…'}</p>
          {error && <a href="/auth/login">Sign in</a>}
        </div>
      ) : (
        <main className="ol-operations-grid">
          <section className="ol-card ol-operations-card" aria-label="World status">
            <Section title="World">
              <p className="ol-operations-clock">
                Day {view.clock.day} · {String(Math.floor(view.clock.hour)).padStart(2, '0')}:
                {String(Math.floor(view.clock.seconds / 60) % 60).padStart(2, '0')} ·{' '}
                {view.clock.paused
                  ? PAUSE_TEXT[view.clock.pauseReason ?? 'manual']
                  : `Running at ${view.clock.speed}×`}
              </p>
              {error && <p role="status">{error}</p>}
            </Section>
            <Section title="Your access">
              <p className="ol-muted">
                {view.actorId
                  ? 'This account has a character in this world.'
                  : 'This account has no character here; it cannot act in the world.'}
              </p>
              <ul className="ol-operations-tags" aria-label="Granted operations">
                {view.capabilities.map((capability) => (
                  <li key={capability}>
                    <Tag>{CAPABILITY_TEXT[capability]}</Tag>
                  </li>
                ))}
              </ul>
            </Section>
          </section>
          {view.overview && (
            <section className="ol-card ol-operations-card" aria-label="World overview">
              <Section title="World overview">
                <OverviewMap overview={view.overview} />
              </Section>
            </section>
          )}
          {can('save') && (
            <section className="ol-card ol-operations-card" aria-label="Saves">
              <GameSavesPanel />
            </section>
          )}
        </main>
      )}
    </div>
  );
}

const CATEGORY_TEXT = {
  person: 'People',
  animal: 'Animals',
  resource: 'Resources',
  fire: 'Fires',
  object: 'Objects',
} as const;

/** Top-down public map. Terrain rows merge equal neighbouring tiles to bound DOM size. */
function OverviewMap({ overview }: { overview: WorldOverview }) {
  const counts = new Map<keyof typeof CATEGORY_TEXT, number>();
  for (const body of overview.bodies)
    counts.set(body.category, (counts.get(body.category) ?? 0) + 1);
  const summary = [...counts].map(([category, count]) => `${CATEGORY_TEXT[category]}: ${count}`);
  return (
    <>
      <svg
        className="ol-overview-map"
        viewBox={`0 0 ${overview.map.width} ${overview.map.height}`}
        role="img"
        aria-label={`Public world map. ${summary.join(', ') || 'No visible bodies'}.`}
      >
        {overview.map.tiles.flatMap((row, z) => {
          const runs: Array<{ x: number; width: number; terrain: string }> = [];
          row.forEach((terrain, x) => {
            const last = runs.at(-1);
            if (last?.terrain === terrain) last.width++;
            else runs.push({ x, width: 1, terrain });
          });
          return runs.map((run) => (
            <rect
              key={`${z}:${run.x}`}
              x={run.x}
              y={z}
              width={run.width}
              height={1}
              data-terrain={run.terrain}
            />
          ));
        })}
        {overview.bodies.map((body, index) => (
          <circle
            key={index}
            cx={body.x + 0.5}
            cy={body.z + 0.5}
            r={body.category === 'person' ? 0.6 : 0.4}
            data-category={body.category}
          />
        ))}
      </svg>
      <ul className="ol-overview-legend">
        {(Object.keys(CATEGORY_TEXT) as Array<keyof typeof CATEGORY_TEXT>).map((category) => (
          <li key={category}>
            <svg viewBox="0 0 2 2" aria-hidden="true">
              <circle cx={1} cy={1} r={0.8} data-category={category} />
            </svg>
            {CATEGORY_TEXT[category]} {counts.get(category) ?? 0}
          </li>
        ))}
      </ul>
      {overview.omitted > 0 && (
        <p className="ol-muted">{overview.omitted} further bodies are not drawn.</p>
      )}
      <p className="ol-muted">
        Spectators see public terrain and body positions only: no names, possessions, speech or
        private knowledge.
      </p>
    </>
  );
}
