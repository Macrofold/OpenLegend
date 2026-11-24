import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { beginTiming } from './performance.js';
import { PostgresDatabase } from './postgres.js';
import type { LiveSqlDatabase } from './live-sql-database.js';
import { nativeSourceColumnParsers } from './native-source-preparation.js';
import { createNativeConsumerScope } from './native-consumer.js';
import {
  LiveReadOverlay,
  LiveReadRevisionError,
  mayReadLiveTables,
  readsPersonalHistory,
  type LiveReadCuts,
  type LiveReadCutsProvider,
  type MetadataBaseline,
} from './live-read-overlay.js';

interface ReadScope {
  liveCuts?: LiveReadCuts;
  liveCutOwner?: ReturnType<typeof createNativeConsumerScope>;
  liveHead?: Record<string, unknown>;
  liveOverlays?: Map<string, LiveReadOverlay>;
  exactCut: boolean;
  actor?: { worldId: string; actorId: string };
}

/** Request-local pending rows and native JSON custody of the retiring Node
 * host. The durable database client owns the one connection and transaction
 * path. Reviewed stopped/opening tools never import this adapter.
 */
export class LivePostgresDatabase extends PostgresDatabase implements LiveSqlDatabase {
  get checkpointSource() {
    return { url: this.connectionString };
  }
  private readonly metadataBaselineRead = new AsyncLocalStorage<boolean>();
  private readonly readScope = new AsyncLocalStorage<ReadScope>();

  readMetadataBaseline<T>(
    actorIds: readonly string[],
    operation: (baseline: MetadataBaseline) => Promise<T>,
  ): Promise<T> {
    const read = async () => {
      const scope = this.readScope.getStore();
      const actor = this.actorReadScope.getStore() ?? scope?.actor;
      if (this.inReadScope && actor && actorIds.some((id) => id !== actor.actorId))
        throw new LiveReadRevisionError();
      const overlay =
        this.inReadScope && scope?.liveCuts ? await this.resolveLiveOverlay(scope) : undefined;
      const head = overlay
        ? overlay.metadataBaseline(actorIds)
        : await this.query('SELECT world_id,revision FROM world_head WHERE id=1').then(
            ({ rows }) => ({
              worldId: String(rows[0]?.['world_id']),
              revision: Number(rows[0]?.['revision']),
            }),
          );
      // This consumer merges its selected pending metadata itself. Expanding the
      // same pending bodies into SQL duplicates that work and can exceed the read
      // allowance before SQL filters them. Body/source reads outside this callback
      // retain normal live semantics. The captured cut was validated above.
      // docs/projects/bookkeeping-simplification-runtime-design.md#63-reads-while-progress-is-unsaved
      return this.metadataBaselineRead.run(true, () => operation(head));
    };
    return this.transactionActive ? read() : this.readTransaction(read);
  }
  private readonly actorReadScope = new AsyncLocalStorage<{ worldId: string; actorId: string }>();
  readForActor<T>(worldId: string, actorId: string, operation: () => Promise<T>): Promise<T> {
    return this.actorReadScope.run({ worldId, actorId }, operation);
  }
  private readonly explicitReadCut = new AsyncLocalStorage<LiveReadCuts>();
  readAtCut<T>(cut: LiveReadCuts, operation: () => Promise<T>): Promise<T> {
    return this.explicitReadCut.run(cut, operation);
  }
  private liveReadCuts?: LiveReadCutsProvider;
  setLiveReadCuts(provider: LiveReadCutsProvider): void {
    this.liveReadCuts = provider;
  }

  protected override read<T>(
    operation: () => Promise<T>,
    snapshot: boolean,
    sql?: string,
  ): Promise<T> {
    const queuedAt = beginTiming();
    const liveTables = !!sql && mayReadLiveTables(sql);
    const personalHistory = !!sql && readsPersonalHistory(sql);
    const explicitCut = this.explicitReadCut.getStore();
    const actor = this.actorReadScope.getStore();
    // A provider can create a new native pending-cut snapshot. Only that
    // capture and its retry belong to this read, while explicit caller cuts
    // and independently admitted SQL results keep their own lifetimes.
    const liveCutOwner =
      !explicitCut && (snapshot || liveTables) && this.liveReadCuts
        ? createNativeConsumerScope()
        : undefined;
    let liveCuts: LiveReadCuts | undefined;
    try {
      liveCuts = explicitCut ?? liveCutOwner?.runSync(() => this.liveReadCuts?.(actor));
    } catch (error) {
      liveCutOwner?.dispose();
      throw error;
    }
    const mustSnapshot =
      snapshot ||
      !!explicitCut ||
      !!(
        liveTables &&
        (liveCuts?.cuts.length || (personalHistory && liveCuts?.historyEligibility?.size))
      );
    return this.readScope
      .run({ liveCuts, liveCutOwner, exactCut: !!explicitCut, actor }, () =>
        super.read(operation, mustSnapshot, sql, queuedAt),
      )
      .finally(() => liveCutOwner?.dispose());
  }

  private async resolveLiveOverlay(scope: ReadScope): Promise<LiveReadOverlay> {
    if (!scope.liveCuts) throw new LiveReadRevisionError();
    const requested = this.actorReadScope.getStore(),
      actor = requested ?? scope.actor;
    if (
      scope.actor &&
      requested &&
      (scope.actor.worldId !== requested.worldId || scope.actor.actorId !== requested.actorId)
    )
      throw new LiveReadRevisionError();
    const key = actor ? JSON.stringify([actor.worldId, actor.actorId]) : '';
    const cached = scope.liveOverlays?.get(key);
    if (cached) return cached;
    // Every selected durable row and the header use the same repeatable-read
    // snapshot, whether the consumer merges bodies or only canonical metadata.
    const value = (scope.liveHead ??=
      (await this.query('SELECT world_id,generation,revision FROM world_head WHERE id=1'))
        .rows[0] ?? {});
    const prepare = (cut: LiveReadCuts) =>
      new LiveReadOverlay(
        cut,
        Number(value?.['revision']),
        String(value?.['generation']),
        String(value?.['world_id']),
        actor,
      );
    let overlay: LiveReadOverlay;
    try {
      overlay = prepare(scope.liveCuts);
    } catch (error) {
      const latest =
        !scope.exactCut && error instanceof LiveReadRevisionError
          ? scope.liveCutOwner
            ? scope.liveCutOwner.runSync(() => this.liveReadCuts?.(scope.actor))
            : this.liveReadCuts?.(scope.actor)
          : undefined;
      if (
        !latest ||
        latest.generation !== scope.liveCuts.generation ||
        latest.timeline !== scope.liveCuts.timeline
      )
        throw error;
      overlay = prepare(latest);
      scope.liveCuts = latest;
    }
    scope.liveOverlays ??= new Map();
    scope.liveOverlays.set(key, overlay);
    return overlay;
  }
  protected override readonly rewriteRead = (sql: string, params: unknown[]) => {
    const scope = this.readScope.getStore();
    if (
      this.metadataBaselineRead.getStore() ||
      !scope?.liveCuts ||
      !(
        scope.liveCuts.cuts.length ||
        scope.exactCut ||
        (scope.liveCuts.historyEligibility?.size && readsPersonalHistory(sql))
      ) ||
      !mayReadLiveTables(sql)
    )
      return;
    return this.resolveLiveOverlay(scope).then((overlay) => overlay.rewrite(sql, params));
  };

  protected override readonly readColumnDecoder = () => {
    let columnRefusal: unknown;
    const parsers = nativeSourceColumnParsers((error) => {
      columnRefusal = error;
    });
    if (!parsers) return;
    const types: pg.CustomTypesConfig = {
      getTypeParser(oid, format = 'text') {
        const parse = pg.types.getTypeParser(oid, format);
        if (format !== 'text') return parse;
        if (oid === pg.types.builtins.JSON || oid === pg.types.builtins.JSONB)
          return (text: string) => parsers.json(text, () => parse(text));
        // These are the actual text/numeric array OIDs used by current
        // record columns, parsed by pg-types' unchanged array codecs.
        if (Number(oid) === 1009 || Number(oid) === 1016 || Number(oid) === 1022)
          return (text: string) => parsers.array(text, () => parse(text));
        return parse;
      },
    };
    return { types, refusal: () => columnRefusal };
  };

  override async close(): Promise<void> {
    await super.close();
    // All read lanes are drained. A closed connection must no longer retain
    // an operational world/capture through its live-overlay callback.
    this.liveReadCuts = undefined;
  }
}
