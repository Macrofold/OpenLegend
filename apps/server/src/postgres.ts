import { WorkLane } from './work-lane.js';
import { timed, beginTiming, endTiming } from './performance.js';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlDatabase } from './store.js';

/** Independent bounded read and write lanes; a large recall cannot occupy the writer. */
export class PostgresDatabase implements SqlDatabase {
  get checkpointSource() {
    return { url: this.connectionString };
  }
  private client: pg.Client;
  private ready: Promise<void>;
  private reader: pg.Client;
  private readReady?: Promise<void>;
  private readonly readLane = new WorkLane('postgres.read', 512);
  private readonly writeLane = new WorkLane('postgres', 512);
  private readonly materializationLane = new WorkLane('postgres.materialization', 1);
  private materializer?: pg.Client;
  private materializerReady?: Promise<void>;
  private transactionContext = new AsyncLocalStorage<{
    active: boolean;
    client: pg.Client;
    readOnly: boolean;
    committed: (() => void)[];
    rolledBack: (() => void)[];
    projectionRevision?: number;
  }>();
  private failed = false;
  private sharedLease?: Promise<void>;
  private materializerClosing?: Promise<void>;
  private fail(): void {
    if (this.failed) return;
    this.failed = true;
    // A subordinate holds the same reservation until its server session ends.
    void this.closeMaterializer().catch(() => undefined);
    try {
      this.applicationFailure?.();
    } catch {
      /* Failure remains sticky. */
    }
  }
  private closeMaterializer(): Promise<void> {
    if (this.materializer) {
      const client = this.materializer;
      this.materializer = undefined;
      this.materializerReady = undefined;
      this.materializerClosing = client.end();
    }
    return this.materializerClosing ?? Promise.resolve();
  }
  constructor(
    private readonly connectionString: string,
    private readonly readOnly = false,
    readonly writeGroups = true,
    private readonly role: 'primary' | 'application' = 'primary',
    private applicationFailure?: () => void,
  ) {
    this.client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    this.reader = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    this.reader.on('error', () => {
      this.fail();
    });
    this.ready = this.connect();
    this.ready.catch(() => {
      this.fail();
    });
    this.client.on('error', () => {
      this.fail();
    });
  }
  private async connect() {
    await this.client.connect();
    if (this.readOnly) {
      await this.client.query(
        'SET search_path TO open_legend; SET default_transaction_read_only=on',
      );
      return;
    }
    if (this.role === 'application') {
      const lock = await this.client.query(
        'SELECT pg_try_advisory_lock_shared(187114, 1) AS acquired',
      );
      if (!lock.rows[0].acquired) throw new Error('The application reservation is unavailable.');
      await this.client.query('SET search_path TO open_legend');
      return;
    }
    const lock = await this.client.query('SELECT pg_try_advisory_lock(187114, 1) AS acquired');
    if (!lock.rows[0].acquired) throw new Error('Another Open Legend writer owns this database.');
    await this.client.query(
      'CREATE SCHEMA IF NOT EXISTS open_legend; SET search_path TO open_legend; CREATE SCHEMA IF NOT EXISTS mind',
    );
  }
  /** The original game owner first excludes every independent writer, then
   * retains a shared hold before releasing exclusive. Owned application sessions
   * share that reservation; every independent startup still needs exclusive. */
  private shareLease(): Promise<void> {
    return (this.sharedLease ??= this.serial(async () => {
      await this.ready;
      if (this.readOnly || this.role !== 'primary' || this.failed)
        throw new Error('The primary writer reservation is unavailable.');
      await this.client.query('SELECT pg_advisory_lock_shared(187114, 1)');
      await this.client.query('SELECT pg_advisory_unlock(187114, 1)');
    }));
  }
  async shareApplicationLease(
    onFailure: () => void,
  ): Promise<{ url: string; writeGroups: boolean }> {
    if (this.applicationFailure) throw new Error('The application owner is already installed.');
    this.applicationFailure = onFailure;
    await this.shareLease();
    return { url: this.connectionString, writeGroups: this.writeGroups };
  }
  /** Must follow the subordinate's shared-hold acknowledgement, before activation.
   * A ping on this SAME unreconnected primary session proves overlapping ownership. */
  async confirmApplicationLease(): Promise<void> {
    await this.serial(async () => {
      await this.ready;
      if (this.failed) throw new Error('The original PostgreSQL owner is unavailable.');
      await this.client.query('SELECT 1');
      if (this.failed) throw new Error('The original PostgreSQL owner is unavailable.');
    });
  }
  /** Call only after the worker has stopped. Regaining exclusive proves every
   * subordinate server session has ended, including an ambiguously sent COMMIT.
   * The existing connection statement timeout bounds the upgrade; failure cannot
   * authorize replay. Keep the parent's shared hold throughout the inspection. */
  applicationBarrier<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionActive)
      return Promise.reject(new Error('Application inspection requires its owned transaction.'));
    return this.materializationLane.run(async () => {
      await this.closeMaterializer();
      this.materializerClosing = undefined;
      return this.serial(async () => {
        await this.ready;
        if (this.readOnly || this.role !== 'primary' || this.failed || !this.sharedLease)
          throw new Error('The original PostgreSQL owner is unavailable.');
        let exclusive = false;
        try {
          await this.client.query('SELECT pg_advisory_lock(187114, 1)');
          exclusive = true;
          return await this.inTransaction(this.client, false, operation);
        } finally {
          if (exclusive) await this.client.query('SELECT pg_advisory_unlock(187114, 1)');
        }
      });
    });
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    return this.writeLane.run(operation);
  }

  get transactionActive(): boolean {
    return this.transactionContext.getStore()?.active ?? false;
  }
  get projectionRevision(): number | undefined {
    return this.transactionContext.getStore()?.projectionRevision;
  }
  /** Every application connection holds the primary owner's shared reservation.
   * It applies already accepted entries; independent startup still needs exclusive. */
  materializationTransaction<T>(
    revision: number,
    operation: (useRevision: (revision: number) => void) => Promise<T>,
  ): Promise<T> {
    if (this.readOnly || this.transactionActive)
      return Promise.reject(new Error('Application requires its independent owned transaction.'));
    return this.materializationLane.run(async () => {
      await this.ready;
      if (this.failed) throw new Error('PostgreSQL writer lease is unavailable.');
      if (this.role === 'application')
        return this.inTransaction(
          this.client,
          false,
          () => operation(this.revisionScope(this.client, revision)),
          revision,
        );
      await this.shareLease();
      await this.materializerClosing;
      this.materializerClosing = undefined;
      if (!this.materializerReady) {
        this.materializer = new pg.Client({
          connectionString: this.connectionString,
          connectionTimeoutMillis: 5000,
          statement_timeout: 5000,
        });
        this.materializer.on('error', () => {
          this.fail();
        });
        const client = this.materializer;
        this.materializerReady = client.connect().then(async () => {
          const lock = await client.query(
            'SELECT pg_try_advisory_lock_shared(187114, 1) AS acquired',
          );
          if (!lock.rows[0].acquired)
            throw new Error('The application reservation is unavailable.');
          await client.query('SET search_path TO open_legend');
          // Do not activate an old connection under a replacement owner's hold.
          await this.confirmApplicationLease();
        });
      }
      await this.materializerReady;
      if (this.failed || !this.materializer)
        throw new Error('PostgreSQL writer lease is unavailable.');
      return this.inTransaction(
        this.materializer!,
        false,
        () => operation(this.revisionScope(this.materializer!, revision)),
        revision,
      );
    });
  }

  private revisionScope(client: pg.Client, first: number): (next: number) => void {
    return (next) => {
      const scope = this.transactionContext.getStore();
      if (!scope?.active || scope.client !== client || !Number.isSafeInteger(next) || next < first)
        throw new Error('Invalid applying revision scope.');
      scope.projectionRevision = next;
    };
  }

  afterCommit(callback: () => void) {
    const scope = this.transactionContext.getStore();
    if (scope?.active) scope.committed.push(callback);
    else callback();
  }
  afterRollback(callback: () => void) {
    const scope = this.transactionContext.getStore();
    if (scope?.active) scope.rolledBack.push(callback);
  }
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    const existing = this.transactionContext.getStore();
    if (existing?.active) {
      if (existing.readOnly) throw new Error('A read snapshot cannot admit writes.');
      return operation();
    }
    return this.serial(() => this.inTransaction(this.client, false, operation));
  }
  readTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()?.active) return operation();
    return this.read(operation, true);
  }
  private read<T>(operation: () => Promise<T>, snapshot: boolean): Promise<T> {
    const queuedAt = beginTiming();
    return this.readLane.run(async () => {
      endTiming('postgres.readWait', queuedAt);
      this.readReady ??= this.ready.then(async () => {
        await this.reader.connect();
        await this.reader.query(
          'SET search_path TO open_legend; SET default_transaction_read_only=on',
        );
      });
      await this.readReady;
      if (snapshot) return this.inTransaction(this.reader, true, operation);
      // A single SELECT already has an atomic PostgreSQL snapshot. It needs neither
      // a writer slot nor BEGIN/COMMIT; explicit multi-query reads still use both.
      const scope = {
        active: true,
        client: this.reader,
        readOnly: true,
        committed: [] as (() => void)[],
        rolledBack: [] as (() => void)[],
      };
      try {
        return await this.transactionContext.run(scope, operation);
      } finally {
        scope.active = false;
      }
    });
  }
  private inTransaction<T>(
    client: pg.Client,
    readOnly: boolean,
    operation: () => Promise<T>,
    projectionRevision?: number,
  ): Promise<T> {
    const scope = {
      active: true,
      client,
      readOnly,
      committed: [] as (() => void)[],
      rolledBack: [] as (() => void)[],
      projectionRevision,
    };
    return this.transactionContext.run(scope, async () => {
      let result: T;
      try {
        // Cold extraction/restore can update an entire retained source set. Keep
        // interactive read deadlines separate from these atomic write operations.
        await this.query(
          readOnly
            ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'
            : this.writeGroups
              ? "BEGIN; SET LOCAL statement_timeout = '30s'"
              : 'BEGIN',
        );
        if (!readOnly && !this.writeGroups) await this.query("SET LOCAL statement_timeout = '30s'");
        result = await operation();
        await this.query('COMMIT');
      } catch (error) {
        await this.query('ROLLBACK').catch(() => {
          this.fail();
        });
        scope.active = false;
        for (const callback of scope.rolledBack) callback();
        throw error;
      }
      scope.active = false;
      for (const callback of scope.committed) callback();
      return result;
    });
  }
  async query(sql: string, params: unknown[] = []) {
    const execute = async () => {
      await this.ready;
      if (this.failed)
        throw new Error('PostgreSQL unavailable; restart and reconcile pending writes.');
      let index = 0;
      const translated = sql.replace(/\?/g, () => `$${++index}`);
      try {
        const result = await timed('postgres.statement', () =>
          (this.transactionContext.getStore()?.active
            ? this.transactionContext.getStore()!.client
            : this.client
          ).query(translated, params),
        );
        return { rows: result.rows ?? [], changes: result.rowCount ?? 0 };
      } catch (error) {
        const code = (error as { code?: string }).code;
        // Do not leak SQL parameters or connection credentials in diagnostics.
        throw new Error(
          `PostgreSQL operation failed${code ? ` (${code})` : ''}. No automatic retry.`,
        );
      }
    };
    return this.transactionContext.getStore()?.active ? execute() : this.serial(execute);
  }
  async exec(sql: string): Promise<void> {
    await this.query(sql);
  }
  prepare(sql: string) {
    const select = (...params: unknown[]) =>
      !this.transactionContext.getStore()?.active &&
      /^\s*SELECT\b/i.test(sql) &&
      !/\bFOR\s+(UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i.test(sql)
        ? this.read(() => this.query(sql, params), false)
        : this.query(sql, params);
    return {
      get: async (...params: unknown[]) => (await select(...params)).rows[0],
      all: async (...params: unknown[]) => (await select(...params)).rows,
      run: (...params: unknown[]) => this.query(sql, params),
    };
  }
  async close(): Promise<void> {
    await Promise.all([
      this.writeLane.idle(),
      this.readLane.idle(),
      this.materializationLane.idle(),
    ]);
    await this.ready.catch(() => undefined);
    this.fail();
    await this.closeMaterializer();
    await this.client.end();
    if (this.readReady) {
      await this.readReady.catch(() => undefined);
      await this.reader.end();
    }
  }
}
