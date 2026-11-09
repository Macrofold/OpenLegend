import type { ActorEvent } from '@open-legend/domain';
import type { GameView } from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import type { JobRecord } from './store.js';

/** Private evidence changed during a read; prepare a current permitted view. */
export class ViewChangedError extends Error {
  constructor() {
    super('The world changed while preparing this view. Refresh to see current information.');
  }
}

export interface PlayerAsyncCache {
  readonly scope: RequestScope;
  readonly values: Map<string, { deps: unknown[]; value: unknown }>;
  readonly sections: Map<string, { token: unknown; value?: unknown }>;
}
export interface PlayerAsyncOwner {
  currentScope(scope: RequestScope): boolean;
  notify(history: boolean): void;
}
export function memoizer(cache: Pick<PlayerAsyncCache, 'values'>) {
  return <T>(key: string, deps: unknown[], build: () => T): T => {
    const old = cache.values.get(key);
    if (old && old.deps.length === deps.length && deps.every((dep, i) => dep === old.deps[i]))
      return old.value as T;
    const value = build();
    cache.values.set(key, { deps, value });
    if (value instanceof Promise)
      void value.catch(() => {
        if (cache.values.get(key)?.value === value) cache.values.delete(key);
      });
    return value;
  };
}
/** Late operational reads populate only their original still-permitted scope. */
export function optional<T>(
  owner: PlayerAsyncOwner,
  cache: PlayerAsyncCache,
  key: string,
  token: Promise<T>,
  fallback: T,
): T {
  const old = cache.sections.get(key);
  if (old?.token === token) return (old.value as T | undefined) ?? fallback;
  const entry: { token: unknown; value?: unknown } = { token };
  cache.sections.set(key, entry);
  void token
    .then((value) => {
      if (cache.sections.get(key) !== entry || !owner.currentScope(cache.scope)) return;
      entry.value = value;
      owner.notify(false);
    })
    .catch(() => {});
  return fallback;
}
export function permittedPlayerJobs(
  jobs: readonly JobRecord[],
  scope: RequestScope,
  eventActor: (id: string) => string | undefined,
) {
  return jobs.filter((job) =>
    job.authority
      ? job.authority.accountId === scope.accountId && job.authority.actorId === scope.actorId
      : job.request.invention?.actorId === scope.actorId ||
        (job.kind === 'thought' && job.request.npcId === scope.actorId) ||
        (!!job.playerSpeechEventId && eventActor(job.playerSpeechEventId) === scope.actorId),
  );
}
export function projectPlayerJobs(jobs: readonly JobRecord[]): GameView['ai']['jobs'] {
  return jobs.map(({ id, kind, status, message, queueLatencyMs, totalLatencyMs }) => ({
    id,
    kind,
    status,
    // Operational telemetry never discloses a resident's private selected plan.
    message: kind === 'thought' ? `Resident reconsideration: ${status}.` : message,
    queueLatencyMs,
    totalLatencyMs,
  }));
}
export function playerUsageFallback(limitUsd: number): Pick<GameView['ai'], 'budget' | 'usage'> {
  return {
    budget: { limitUsd, spentUsd: 0, reservedUsd: 0, estimated: true },
    usage: { jevCalls: 0, llmCalls: 0, inputTokens: 0, outputTokens: 0, lastLatencyMs: 0 },
  };
}
export function projectPlayerAi(
  jobs: GameView['ai']['jobs'],
  usage: Pick<GameView['ai'], 'budget' | 'usage'>,
  config: {
    executionSource: 'live-model' | 'test-fixture';
    jevConfigured: boolean;
    llmConfigured: boolean;
  },
): GameView['ai'] {
  const latestSettled = jobs.find((job) => job.status === 'failed' || job.status === 'completed');
  const latestProblem = latestSettled?.status === 'failed' ? latestSettled : undefined;
  const mode =
    config.executionSource === 'test-fixture'
      ? 'fixture'
      : config.jevConfigured
        ? latestProblem
          ? 'degraded'
          : 'live'
        : 'unconfigured';
  return {
    mode,
    jevConfigured: config.jevConfigured,
    llmConfigured: config.llmConfigured,
    message:
      mode === 'fixture'
        ? 'Injected test provider. This is not live AI acceptance evidence.'
        : mode === 'unconfigured'
          ? 'Configure backend AI credentials and a spending cap. Macrofold native execution also needs an owner-selected MACROFOLD_WORKER_ID; direct inference does not.'
          : (latestProblem?.message ??
            'Jev routes bounded decisions. LLMs handle conversation, reconsideration and new recipes.'),
    jobs,
    ...usage,
  };
}

export function playerSpeechJobIds(events: readonly ActorEvent[], actorId: string) {
  return events.filter((event) => event.actorId === actorId).map((event) => event.id);
}
