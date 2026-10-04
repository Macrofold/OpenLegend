import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccessCapability, OperationsView, WorldOverview } from '@open-legend/protocol';
import { AccessError, SignInRequiredError, getOperations, post } from '../api';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { Button, Section, Tag } from '../design-system/components';
import { EntryNotice } from './entry-notice';
import { GameSavesPanel } from './game-saves';
import { AccessSection } from './operations-access';
import { MaintenanceNotice } from './maintenance-notice';
import { MaintenanceSection } from './operations-maintenance';
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
  const [entry, setEntry] = useState<'signed-out' | 'forbidden' | 'failed'>();
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [task, setTask] = useState('overview');
  const latest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++latest.current;
    setRefreshing(true);
    try {
      const next = await getOperations();
      if (request !== latest.current) return;
      setView(next);
      setError('');
      setEntry(undefined);
      setUpdatedAt(Date.now());
    } catch (reason) {
      if (request !== latest.current) return;
      if (reason instanceof AccessError) setView(null);
      setEntry(
        reason instanceof SignInRequiredError
          ? 'signed-out'
          : reason instanceof AccessError
            ? 'forbidden'
            : 'failed',
      );
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (request === latest.current) setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, REFRESH_MS);
    return () => {
      clearInterval(timer);
      latest.current++;
    };
  }, [refresh]);
  const can = (capability: AccessCapability) => !!view?.capabilities.includes(capability);
  const selectedTask =
    (task === 'access' && !view?.access) ||
    (task === 'maintenance' && !can('create')) ||
    (task === 'checkpoints' && !can('save'))
      ? 'overview'
      : task;
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
              Log Out
            </Button>
          )}
        </div>
      </header>
      <EntryNotice />
      {view && (
        <div className="ol-operations-notices">
          <MaintenanceNotice maintenance={view.maintenance} />
        </div>
      )}
      {!view ? (
        <main className="ol-card ol-operations-card ol-operations-entry">
          <h2 className="ol-heading">
            {entry === 'signed-out'
              ? 'Sign in to World operations'
              : entry === 'forbidden'
                ? 'No access to World operations'
                : entry === 'failed'
                  ? 'World operations could not connect'
                  : 'Opening World operations…'}
          </h2>
          <p role={error ? 'alert' : 'status'}>
            {error || 'Checking this account’s permitted world access.'}
          </p>
          {entry === 'forbidden' && (
            <p>
              Ask the world operator to check this account’s access, or sign in with another
              account.
            </p>
          )}
          <div className="ol-operations-row">
            {entry === 'signed-out' ? (
              <a className="ol-btn" data-variant="primary" href="/auth/login">
                Sign in
              </a>
            ) : (
              entry && (
                <Button busy={refreshing} onPress={() => void refresh()}>
                  {entry === 'forbidden' ? 'Check access again' : 'Retry connection'}
                </Button>
              )
            )}
            {entry === 'forbidden' && <a href="/auth/login?change-account=true">Change account</a>}
          </div>
        </main>
      ) : (
        <main className="ol-operations-workspace">
          <section
            className="ol-card ol-operations-card ol-operations-summary"
            aria-label="World and account status"
          >
            <div>
              <h2 className="ol-heading">World status</h2>
              <p className="ol-operations-clock">
                Day {view.clock.day} · {String(Math.floor(view.clock.hour)).padStart(2, '0')}:
                {String(Math.floor(view.clock.seconds / 60) % 60).padStart(2, '0')} ·{' '}
                {view.clock.paused
                  ? PAUSE_TEXT[view.clock.pauseReason ?? 'manual']
                  : `Running at ${view.clock.speed}×`}
              </p>
              <p className="ol-muted">
                {view.actorId
                  ? 'This account has a character. Return to your character to play.'
                  : 'This account has no character here. Viewing operations does not control a character or keep the world running.'}
              </p>
            </div>
            <div className="ol-operations-summary-actions">
              <Button size="sm" variant="quiet" busy={refreshing} onPress={() => void refresh()}>
                Refresh world status
              </Button>
              {updatedAt && (
                <span className="ol-caption">
                  Updated {new Date(updatedAt).toLocaleTimeString()}
                </span>
              )}
              <details>
                <summary>World and account details</summary>
                <p className="ol-caption">World: {view.worldId}</p>
                <p className="ol-caption">Account: {view.accountId}</p>
              </details>
            </div>
            {error && (
              <p role="alert">
                World status could not refresh. The previous view remains visible. {error}
              </p>
            )}
          </section>
          <Tabs
            key={`${view.worldId}:${view.accountId}`}
            className="ol-operations-tabs"
            selectedKey={selectedTask}
            onSelectionChange={(key) => setTask(String(key))}
          >
            <TabList aria-label="World operations tasks" className="ol-operations-task-list">
              <Tab id="overview" className="ol-operations-task">
                Overview and access
              </Tab>
              {view.access && (
                <Tab id="access" className="ol-operations-task">
                  People and invitations
                </Tab>
              )}
              {can('create') && (
                <Tab id="maintenance" className="ol-operations-task">
                  Maintenance
                </Tab>
              )}
              {can('save') && (
                <Tab id="checkpoints" className="ol-operations-task">
                  Checkpoints
                </Tab>
              )}
            </TabList>
            <TabPanel id="overview" className="ol-operations-task-panel" shouldForceMount>
              <div className="ol-operations-grid">
                <section className="ol-card ol-operations-card">
                  <Section title="Your permitted tasks">
                    <p>
                      These permissions belong to this account in this world. Opening a tab does not
                      perform an operation.
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
                <section className="ol-card ol-operations-card" aria-label="Public world overview">
                  <Section title="Public world overview">
                    <p className="ol-caption">
                      A read-only map of broad categories. It does not show private names,
                      possessions, speech or character knowledge.
                    </p>
                    {view.overview ? (
                      <OverviewMap overview={view.overview} />
                    ) : (
                      <p>
                        This account does not have access to the public map. Its permitted world
                        status is shown above.
                      </p>
                    )}
                  </Section>
                </section>
              </div>
            </TabPanel>
            {view.access && (
              <TabPanel
                id="access"
                className="ol-operations-task-panel ol-card ol-operations-card"
                shouldForceMount
              >
                <AccessSection
                  view={view}
                  access={view.access}
                  describe={(capability) => CAPABILITY_TEXT[capability]}
                  onChanged={() => void refresh()}
                />
              </TabPanel>
            )}
            {can('create') && (
              <TabPanel
                id="maintenance"
                className="ol-operations-task-panel ol-card ol-operations-card"
                shouldForceMount
              >
                <MaintenanceSection
                  current={
                    view.maintenance?.status === 'scheduled' ||
                    view.maintenance?.status === 'active'
                      ? view.maintenance
                      : undefined
                  }
                  history={view.maintenanceHistory ?? []}
                  onChanged={() => void refresh()}
                />
              </TabPanel>
            )}
            {can('save') && (
              <TabPanel
                id="checkpoints"
                className="ol-operations-task-panel ol-card ol-operations-card"
                shouldForceMount
              >
                <GameSavesPanel visible={selectedTask === 'checkpoints'} timeDisplay="elapsed" />
              </TabPanel>
            )}
          </Tabs>
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
    </>
  );
}
