import { MEMORY_HISTORY_TABLES } from './memory-repository.js';
import { migrateCognition } from '@open-legend/domain';
import { upgradeWorldState } from './upgrade-world.js';
import { validateWorldModules } from '@open-legend/domain';
import { HISTORY_TABLES } from './history.js';
import { digest, type SavedWorld, type SqlDatabase } from './store.js';
import type { AutosaveSettings, CheckpointFailure, GameSaveSummary } from '@open-legend/protocol';
import { SaveFiles, compareSaves, type SavePosition, type SaveFileMetadata } from './save-files.js';
import { writeCheckpoint, readCheckpoint } from './checkpoint.js';
import { CheckpointWorker, type CheckpointSource } from './checkpoint-worker-client.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Physical storage changes reject incompatible development checkpoints without conversion.
// docs/save-and-load.md#active-development-policy.
export class GameSaveError extends Error {}
/** The capture slot is taken; an automatic save simply waits for its next opportunity. */
export class CheckpointBusyError extends GameSaveError {}

/** Operator policy, outside gameplay rewind (docs/limits/persistence.md#sv01). */
export const AUTOSAVE_DEFAULTS = { enabled: true, intervalMinutes: 5, retain: 3 } as const;
const settingsSchema = z
  .object({
    enabled: z.boolean(),
    intervalMinutes: z.number().int().min(1).max(1440),
    retain: z.number().int().min(1).max(20),
  })
  .strict();
const storedSettingsSchema = settingsSchema.extend({ revision: z.number().int().positive() });
const failureSchema = z
  .object({
    id: z.string().uuid(),
    at: z.string().datetime(),
    kind: z.enum(['auto', 'manual', 'recovery']),
    message: z.string().min(1).max(500),
    acknowledgedAt: z.string().datetime().optional(),
  })
  .strict();
// Checkpoint operations own these meta keys; they are outside the checkpoint tables, so a
// load never rewinds them, and operational backup carries them with the database.
const metaKey = (kind: 'settings' | 'failure' | 'sequence', worldId: string) =>
  `checkpoint:${kind}:${worldId}`;
const DAMAGED_FAILURE_ID = '00000000-0000-4000-8000-00000000dead';
const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
/** The recovery row may contain a legacy payload or an integrity-checked file pointer. */
export function recoveryFile(payload: unknown, checksum: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('file' in payload)) return;
  const file = z.string().uuid().safeParse(payload.file);
  if (!file.success || digest(payload) !== checksum)
    throw new GameSaveError('Recovery pointer integrity check failed.');
  return file.data;
}
export const SAVE_FORMAT = 'development-2026-10-02-native-continuation';
const MAX_BYTES = 64 * 1024 * 1024;
type Rows = Record<string, unknown>[];
export interface SavePayload {
  format: string;
  state: SavedWorld;
  history: Record<(typeof HISTORY_TABLES)[number], Rows>;
  memory?: Record<(typeof MEMORY_HISTORY_TABLES)[number], Rows>;
}
export interface RestoreSave {
  id: string;
  requestId: string;
  payload: SavePayload;
  epoch: { generation: number; openedAt: number; token: string };
  timeline: string;
  /** Recovery checkpoint every caller publishes before the restore transaction (SL09-A, SB18),
   * so a refused or failed installation can never leave one it cannot account for. */
  recoveryId: string;
}

/** The database captures authority; manual slots publish to local files after capture. */
export class GameSaves {
  private readonly files: SaveFiles;
  private readonly worker?: CheckpointWorker;
  private active?: {
    id: string;
    label: string;
    kind: SaveFileMetadata['kind'];
    worldId: string;
    done: Promise<void>;
    captured: Promise<void>;
  };
  /** A capture owns the slot from admission until completion, or one manual save waits. */
  get busy() {
    return !!this.active || !!this.claim || !!this.waiting;
  }
  get pendingManual() {
    return !!this.waiting;
  }
  get catalogIssues() {
    return this.files.issueCount;
  }
  private claim?: { id: string; release: Promise<void> };
  private waiting?: { id: string; turn: Promise<void> };
  /** Reserve the single capture slot before the world mutation queue. One manual save may wait
   * for the capture in progress and goes ahead of the next automatic save; an automatic save
   * never waits. Returns the release for the caller's completion path.
   * docs/limits/persistence.md#la167 */
  async admit(id: string, kind: SaveFileMetadata['kind'] = 'manual'): Promise<() => void> {
    // An identical request shares the admitted capture's completion inside create().
    if (this.claim?.id === id || this.active?.id === id) return () => undefined;
    // A waiting manual save also blocks automatic saves in the moment between the release of
    // the previous capture and its own claim.
    if (this.claim || this.active || this.waiting) {
      if (kind !== 'manual')
        throw new CheckpointBusyError(
          'Another checkpoint is in progress; the next opportunity will retry.',
        );
      if (this.waiting && this.waiting.id !== id)
        throw new CheckpointBusyError(
          'Another save is already waiting for the current checkpoint. Try again after it finishes.',
        );
      this.waiting ??= {
        id,
        turn: (async () => {
          while (this.claim || this.active)
            await (this.claim?.release ?? this.active!.done.catch(() => undefined));
        })(),
      };
      const waiting = this.waiting;
      await waiting.turn;
      if (this.waiting === waiting) this.waiting = undefined;
      if (this.claim?.id === id) return () => undefined;
    }
    let free!: () => void;
    const claim = { id, release: new Promise<void>((resolve) => (free = resolve)) };
    this.claim = claim;
    return () => {
      if (this.claim !== claim) return;
      this.claim = undefined;
      free();
    };
  }

  /** Durable, monotonic capture order for this world; survives restart and backup/restore. */
  private reconciledWorlds = new Set<string>();
  private async nextSequence(worldId: string): Promise<number> {
    // Once per process and world: the first capture also covers slots restored from a backup.
    if (!this.reconciledWorlds.has(worldId)) {
      await this.reconcileSequence(worldId);
      this.reconciledWorlds.add(worldId);
    }
    const row = await this.db
      .prepare(
        `INSERT INTO meta VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value=(CAST(meta.value AS BIGINT)+1)::text RETURNING value`,
      )
      .get(metaKey('sequence', worldId));
    const sequence = Number(row?.['value']);
    if (!Number.isSafeInteger(sequence) || sequence < 1)
      throw new GameSaveError('Checkpoint order could not be allocated.');
    return sequence;
  }
  /** Raise the capture counter above every slot of this world already on disk. After an
   * operational restore the database counter can be older than the copied slots; new captures
   * must still sort as newest, or rotation would delete them at once. */
  async reconcileSequence(worldId: string): Promise<number> {
    const highest = Math.max(
      0,
      ...(await this.files.list(worldId)).map((metadata) => metadata.sequence ?? 0),
    );
    const row = await this.db
      .prepare(
        `INSERT INTO meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=GREATEST(CAST(meta.value AS BIGINT), CAST(excluded.value AS BIGINT))::text RETURNING value`,
      )
      .get(metaKey('sequence', worldId), String(highest));
    return Number(row?.['value']);
  }
  /** Shutdown: wait until no capture is running, admitted or waiting (restore must not use
   * this while it holds the mutation queue a waiting capture needs). */
  async settle(): Promise<void> {
    while (this.active || this.claim || this.waiting)
      await (this.active?.done.catch(() => undefined) ??
        this.claim?.release ??
        this.waiting?.turn ??
        Promise.resolve());
  }
  storageBytes(): Promise<number> {
    return this.files.usage();
  }
  async settings(worldId: string): Promise<AutosaveSettings> {
    const row = await this.db
      .prepare('SELECT value FROM meta WHERE key=?')
      .get(metaKey('settings', worldId));
    if (!row) return { ...AUTOSAVE_DEFAULTS, revision: 0 };
    // Text that is not JSON is the same damage case, replaceable by an explicit save.
    const parsed = storedSettingsSchema.safeParse(safeJson(String(row['value'])));
    // Never guess operator policy from a damaged record.
    if (!parsed.success)
      throw new GameSaveError('Stored autosave settings are invalid; save them again.');
    return parsed.data;
  }
  async updateSettings(
    worldId: string,
    input: unknown,
    expectedRevision: number,
  ): Promise<AutosaveSettings> {
    const next = settingsSchema.parse(input);
    return this.db.transaction(async () => {
      // A damaged record may be replaced by an explicit save; it is never guessed. Storage
      // errors are not damage and propagate.
      const current = await this.settings(worldId).catch((error: unknown) => {
        if (error instanceof GameSaveError) return undefined;
        throw error;
      });
      if (current && current.revision !== expectedRevision)
        throw new GameSaveError('Autosave settings changed elsewhere. Refresh and try again.');
      const stored = { ...next, revision: Math.max(current?.revision ?? 0, expectedRevision) + 1 };
      await this.db
        .prepare(
          'INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run(metaKey('settings', worldId), JSON.stringify(stored));
      return stored;
    });
  }

  private memoryFailure?: CheckpointFailure & { worldId: string };
  /** The latest checkpoint failure survives restart until an operator acknowledges it (SL08-A).
   * If storage cannot record it, it is still reported from memory and says so. */
  async recordFailure(worldId: string, kind: CheckpointFailure['kind'], message: string) {
    const failure = {
      id: randomUUID(),
      at: new Date().toISOString(),
      kind,
      message: message.slice(0, 500) || 'Checkpoint failed.',
    };
    this.memoryFailure = { ...failure, worldId };
    try {
      await this.db
        .prepare(
          'INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run(metaKey('failure', worldId), JSON.stringify(failure));
    } catch {
      this.memoryFailure = {
        ...failure,
        worldId,
        message: `${failure.message} (Not recorded durably; it will not survive a restart.)`.slice(
          0,
          500,
        ),
      };
    }
  }
  async failure(worldId: string): Promise<CheckpointFailure | undefined> {
    const row = await this.db
      .prepare('SELECT value FROM meta WHERE key=?')
      .get(metaKey('failure', worldId));
    const parsed = row ? failureSchema.safeParse(safeJson(String(row['value']))) : undefined;
    // A damaged record is reported (and can be acknowledged) instead of breaking the catalog.
    const stored = parsed
      ? parsed.success
        ? parsed.data
        : {
            id: DAMAGED_FAILURE_ID,
            at: new Date(0).toISOString(),
            kind: 'auto' as const,
            message: 'The stored checkpoint failure record is unreadable. Acknowledge to clear it.',
          }
      : undefined;
    const memory = this.memoryFailure?.worldId === worldId ? this.memoryFailure : undefined;
    // This process's newest record wins unless it is the stored one; wall-clock order is not
    // trusted (a clock can move backwards).
    const latest = memory && memory.id !== stored?.id ? memory : stored;
    if (!latest || ('acknowledgedAt' in latest && latest.acknowledgedAt)) return undefined;
    return { id: latest.id, at: latest.at, kind: latest.kind, message: latest.message };
  }
  /** Explicit operator acknowledgment; the record is kept with its acknowledgment time. */
  async acknowledgeFailure(worldId: string, id: string): Promise<boolean> {
    if (this.memoryFailure?.id === id) this.memoryFailure = undefined;
    return this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT value FROM meta WHERE key=?')
        .get(metaKey('failure', worldId));
      if (!row) return false;
      const parsed = failureSchema.safeParse(safeJson(String(row['value'])));
      if (!parsed.success) {
        if (id !== DAMAGED_FAILURE_ID) return false;
        await this.db.prepare('DELETE FROM meta WHERE key=?').run(metaKey('failure', worldId));
        return true;
      }
      const stored = parsed.data;
      if (stored.id !== id) return false;
      await this.db
        .prepare('UPDATE meta SET value=? WHERE key=?')
        .run(
          JSON.stringify({ ...stored, acknowledgedAt: new Date().toISOString() }),
          metaKey('failure', worldId),
        );
      return true;
    });
  }
  async drain() {
    // The requesting caller receives the failure. A failed optional checkpoint
    // must not prevent native shutdown flushing or a subsequent explicit restore.
    // Admitted captures still waiting for the mutation queue are not awaited here:
    // a restore holding that queue would otherwise wait for itself.
    await this.active?.done.catch(() => undefined);
  }
  constructor(
    private readonly db: SqlDatabase,
    private readonly directory: string,
    source?: CheckpointSource,
  ) {
    this.files = new SaveFiles(directory);
    if (source) this.worker = new CheckpointWorker(source);
  }
  async close() {
    try {
      await this.drain();
    } finally {
      await this.worker?.close();
    }
  }
  async initialize() {
    await this.worker?.ready;
    await this.files.cleanInterruptedStages();
    await this.db.exec(`CREATE TABLE IF NOT EXISTS game_saves (
      id TEXT PRIMARY KEY, world_id TEXT NOT NULL, label TEXT NOT NULL,
      created_at TEXT NOT NULL, sim_time REAL NOT NULL, format TEXT NOT NULL,
      checksum TEXT NOT NULL, payload TEXT NOT NULL
    )`);
  }
  async list(
    worldId: string,
    options?: { limit: number; before?: SavePosition },
  ): Promise<GameSaveSummary[]> {
    const rows = await this.db
      .prepare(
        "SELECT id,label,created_at,sim_time,format,payload,checksum FROM game_saves WHERE world_id=? AND id='before-load'",
      )
      .all(worldId);
    const recovery = await Promise.all(
      rows.map(async (row) => {
        // Order the pointer row by its recovery file's capture sequence when readable.
        const pointer = (() => {
          try {
            return recoveryFile(JSON.parse(String(row['payload'] ?? 'null')), row['checksum']);
          } catch {
            return undefined;
          }
        })();
        const target = pointer ? await this.files.metadata(pointer).catch(() => null) : null;
        return {
          id: String(row['id']),
          label: String(row['label']),
          createdAt: String(row['created_at']),
          simTime: Number(row['sim_time']),
          kind: 'recovery' as const,
          compatible: row['format'] === SAVE_FORMAT,
          ...(target?.sequence ? { sequence: target.sequence } : {}),
        };
      }),
    );
    const manual = (await this.files.list(worldId, { ...options, excludeRecovery: true })).map(
      (metadata) => ({
        id: metadata.id,
        label: metadata.label,
        createdAt: metadata.createdAt,
        simTime: metadata.simTime,
        kind: metadata.kind ?? 'manual',
        compatible: metadata.format === SAVE_FORMAT,
        ...(metadata.sequence ? { sequence: metadata.sequence } : {}),
      }),
    );
    return [...manual, ...recovery]
      .filter((save) => !options?.before || compareSaves(save, options.before) > 0)
      .sort(compareSaves)
      .slice(0, options?.limit);
  }
  create(
    state: { world: { id: string } },
    label: string,
    id: string,
    options: {
      captured?: () => void;
      expectedRevision?: number;
      kind?: SaveFileMetadata['kind'];
      /** Backup artifacts are not catalog slots and may run on a read-only connection. */
      unordered?: boolean;
    } = {},
  ): Promise<void> {
    if (this.active) {
      if (
        this.active.id !== id ||
        this.active.worldId !== state.world.id ||
        this.active.label !== label ||
        this.active.kind !== (options.kind ?? 'manual')
      )
        return Promise.reject(
          new CheckpointBusyError(
            'Another checkpoint is in progress. Try again after it finishes.',
          ),
        );
      void this.active.captured.then(() => options.captured?.());
      return this.active.done;
    }
    let captured!: () => void;
    const ready = new Promise<void>((resolve) => {
      captured = resolve;
    });
    const finishCapture = () => {
      captured();
      options.captured?.();
    };
    const done = Promise.resolve()
      .then(async () => {
        const prior = await this.files.metadata(id);
        if (prior) {
          if (
            prior.worldId !== state.world.id ||
            prior.label !== label ||
            (prior.kind ?? 'manual') !== (options.kind ?? 'manual')
          )
            throw new GameSaveError('Save identity conflicts.');
          finishCapture();
          await this.files.confirmPublished(prior);
          return;
        }
        const sequence = options.unordered ? undefined : await this.nextSequence(state.world.id);
        if (this.worker) {
          await this.worker.capture(
            {
              directory: this.directory,
              id,
              worldId: state.world.id,
              label,
              format: SAVE_FORMAT,
              kind: options.kind ?? 'manual',
              expectedRevision: options.expectedRevision,
              sequence,
            },
            finishCapture,
          );
          return;
        }
        await writeCheckpoint(
          this.db,
          this.files,
          {
            id,
            worldId: state.world.id,
            label,
            format: SAVE_FORMAT,
            kind: options.kind ?? 'manual',
            sequence,
          },
          { expectedRevision: options.expectedRevision, captured: finishCapture },
        );
      })
      .finally(() => {
        this.active = undefined;
      });
    this.active = {
      id,
      label,
      kind: options.kind ?? 'manual',
      worldId: state.world.id,
      done,
      captured: ready,
    };
    return done;
  }
  async rotate(worldId: string, kind: 'auto' | 'recovery', retain: number, protectedId?: string) {
    const candidates = await this.files.list(worldId, { kind });
    const valid: SaveFileMetadata[] = [];
    for (const candidate of candidates) {
      try {
        await this.files.verify(candidate);
        valid.push(candidate);
      } catch {
        /* A corrupt point never displaces a recoverable one. Surface it via reads. */
      }
      if (valid.length >= retain) break;
    }
    if (valid.length < retain) return;
    const keep = new Set([...valid.map((m) => m.id), ...(protectedId ? [protectedId] : [])]);
    for (const candidate of candidates)
      if (!keep.has(candidate.id)) await this.files.delete(candidate.id);
  }
  async retainRecovery(worldId: string) {
    try {
      const row = await this.db
        .prepare("SELECT payload,checksum FROM game_saves WHERE world_id=? AND id='before-load'")
        .get(worldId);
      const pointer = row
        ? recoveryFile(JSON.parse(String(row['payload'])), row['checksum'])
        : undefined;
      // No pointer yet: every recovery file came from a refused load. A pointer row that cannot
      // be read protects nothing, so rotation waits rather than risk deleting its file.
      if (pointer || !row) await this.rotate(worldId, 'recovery', 2, pointer);
    } catch (error) {
      // Runs after the load settles. Report a cleanup failure without changing the load's own
      // outcome (a committed timeline replacement stays successful).
      await this.recordFailure(
        worldId,
        'recovery',
        `Recovery retention failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
  async read(worldId: string, id: string): Promise<SavePayload> {
    const row =
      id === 'before-load'
        ? await this.db
            .prepare('SELECT format,checksum,payload FROM game_saves WHERE world_id=? AND id=?')
            .get(worldId, id)
        : await this.files.metadata(id);
    if (!row) throw new GameSaveError('That save no longer exists.');
    if ('worldId' in row && row.worldId !== worldId)
      throw new GameSaveError('Save belongs to another world.');
    if ('payload' in row && Buffer.byteLength(String(row['payload'])) > MAX_BYTES)
      throw new GameSaveError('Legacy save exceeds the supported size.');
    const stored: unknown = 'payload' in row ? JSON.parse(String(row['payload'])) : undefined;
    const pointer = recoveryFile(stored, row['checksum']);
    if (pointer) return this.read(worldId, pointer);
    let payload: SavePayload;
    if ('encoding' in row && row.encoding) {
      payload = await readCheckpoint(
        this.files.lines(row as SaveFileMetadata),
        worldId,
        String(row['format']),
      );
    } else {
      const encoded =
        'payload' in row ? String(row['payload']) : await this.files.read(id, MAX_BYTES);
      if (Buffer.byteLength(encoded) > MAX_BYTES)
        throw new GameSaveError('Legacy save exceeds the supported size.');
      payload = (stored ?? JSON.parse(encoded)) as SavePayload;
      if (digest(payload) !== row['checksum'])
        throw new GameSaveError('Save integrity check failed.');
    }
    if (
      payload.format !== SAVE_FORMAT ||
      payload.format !== row['format'] ||
      payload.state?.world?.id !== worldId ||
      !HISTORY_TABLES.every((table) => Array.isArray(payload.history?.[table]))
    )
      throw new GameSaveError('Save integrity check failed.');
    upgradeWorldState(payload.state.world);
    migrateCognition(payload.state.world);
    validateWorldModules(payload.state.world);
    return payload;
  }
  async delete(worldId: string, id: string) {
    // A creation still waiting for its capture would publish after this deletion.
    if (this.claim?.id === id || this.waiting?.id === id)
      throw new CheckpointBusyError(
        'That save is still being created. Try again after it finishes.',
      );
    if (this.active?.id === id) {
      if (this.active.worldId !== worldId)
        throw new GameSaveError('Save belongs to another world.');
      // A later deletion wins over an in-flight creation of this immutable identity.
      await this.active.done.catch(() => undefined);
    }
    if (id !== 'before-load') {
      const metadata = await this.files.metadata(id);
      if (metadata && metadata.worldId !== worldId)
        throw new GameSaveError('Save belongs to another world.');
      await this.files.delete(id);
      return;
    }
    await this.db.prepare('DELETE FROM game_saves WHERE world_id=? AND id=?').run(worldId, id);
  }
  /** Called inside the world commit. Keep accounting and external operation journals untouched. */
  /** Checks that need no database; loads run them before writing the pre-load checkpoint. */
  validatePayload(payload: SavePayload) {
    if (payload.format !== SAVE_FORMAT)
      throw new GameSaveError('Unsupported save format; existing data was not changed.');
    const totals = payload.history.history_totals;
    if (
      totals.length !== 1 ||
      Number(totals[0]!['event_count']) !== payload.history.history_events.length
    )
      throw new GameSaveError('Save event count disagrees with retained records.');
    validateWorldModules(payload.state.world);
  }
  async install(current: SavedWorld, restore: RestoreSave) {
    this.validatePayload(restore.payload);
    const { recoveryId } = restore;
    const prepared = await this.files.metadata(recoveryId);
    if (!prepared || prepared.worldId !== current.world.id || prepared.kind !== 'recovery')
      throw new GameSaveError('The pre-load recovery checkpoint is missing; nothing was changed.');
    // The immutable recovery file is already published. Its pointer switches atomically
    // with the world; a failed install retains the previous pointer and authority.
    const pointer = { file: recoveryId };
    await this.db
      .prepare(
        `INSERT INTO game_saves VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET world_id=excluded.world_id,label=excluded.label,created_at=excluded.created_at,sim_time=excluded.sim_time,format=excluded.format,checksum=excluded.checksum,payload=excluded.payload`,
      )
      .run(
        'before-load',
        current.world.id,
        'Before last load',
        new Date().toISOString(),
        current.world.simTime,
        SAVE_FORMAT,
        digest(pointer),
        JSON.stringify(pointer),
      );
    for (const table of [...HISTORY_TABLES, ...MEMORY_HISTORY_TABLES]) {
      await this.db.prepare(`DELETE FROM ${table} WHERE world_id=?`).run(current.world.id);
      const rows =
        table in restore.payload.history
          ? restore.payload.history[table as keyof SavePayload['history']]
          : (restore.payload.memory?.[table as keyof NonNullable<SavePayload['memory']>] ?? []);
      const columns = Object.keys(rows[0] ?? {});
      if (columns.some((key) => !/^[a-z_]+$/.test(key)))
        throw new GameSaveError('Invalid save history.');
      for (let offset = 0; offset < rows.length; ) {
        const values: unknown[][] = [];
        let bytes = 0;
        while (offset < rows.length) {
          const row = rows[offset]!;
          if (row['world_id'] !== current.world.id || Object.keys(row).join() !== columns.join())
            throw new GameSaveError('Invalid save history.');
          const size = Buffer.byteLength(JSON.stringify(row));
          if (
            values.length &&
            (bytes + size > 262144 || (values.length + 1) * columns.length > 900)
          )
            break;
          values.push(columns.map((key) => row[key]));
          bytes += size;
          offset++;
        }
        await this.db
          .prepare(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.map((row) => `(${row.map(() => '?').join(',')})`).join(',')}`,
          )
          .run(...values.flat());
      }
    }
    for (const row of await this.db.prepare('SELECT id,payload FROM jobs').all()) {
      const job = JSON.parse(String(row['payload'])) as Record<string, unknown>;
      if (!job['playerSpeechEventId']) continue;
      delete job['playerSpeechEventId'];
      await this.db
        .prepare('UPDATE jobs SET payload=? WHERE id=?')
        .run(JSON.stringify(job), row['id']);
    }
    // Captured pending narration is not permission to repeat an uncertain paid request.
    await this.db
      .prepare(
        "UPDATE story_jobs SET state='cancelled' WHERE world_id=? AND state IN ('running','queued')",
      )
      .run(current.world.id);
    for (const [key, value] of [
      [`command-epoch:${current.world.id}`, restore.epoch],
      [`world-timeline:${current.world.id}`, restore.timeline],
      [`load-request:${restore.requestId}`, { saveId: restore.id }],
    ] as const)
      await this.db
        .prepare(
          'INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run(`integration:${key}`, JSON.stringify(value));
    // These are queued opportunities / derived caches, not billing or attempt records.
    for (const actorId of new Set([
      ...Object.keys(current.world.entities),
      ...Object.keys(restore.payload.state.world.entities),
    ]))
      for (const prefix of ['vectors', 'interests', 'reflection-queue', 'semantic-schedule'])
        await this.db
          .prepare('DELETE FROM meta WHERE key=?')
          .run(`integration:${prefix}:${current.world.id}:${actorId}`);
  }
}
