import { MEMORY_HISTORY_TABLES } from './memory-repository.js';
import { migrateCognition } from '@open-legend/domain';
import { upgradeWorldState } from './upgrade-world.js';
import { validateWorldModules } from '@open-legend/domain';
import { HISTORY_TABLES } from './history.js';
import { digest, type SavedWorld, type SqlDatabase } from './store.js';
import type { GameSaveSummary } from '@open-legend/protocol';
import { SaveFiles, compareSaves, type SavePosition, type SaveFileMetadata } from './save-files.js';
import { writeCheckpoint, readCheckpoint } from './checkpoint.js';
import { CheckpointWorker, type CheckpointSource } from './checkpoint-worker-client.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// The envelope label is not a per-feature compatibility gate. Validate and upgrade the
// actual state: docs/save-and-load.md#active-development-policy.
export class GameSaveError extends Error {}
/** The recovery row may contain a legacy payload or an integrity-checked file pointer. */
export function recoveryFile(payload: unknown, checksum: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('file' in payload)) return;
  const file = z.string().uuid().safeParse(payload.file);
  if (!file.success || digest(payload) !== checksum)
    throw new GameSaveError('Recovery pointer integrity check failed.');
  return file.data;
}
export const SAVE_FORMAT = 'development-2026-09-22-spatial1';
const MAX_BYTES = 64 * 1024 * 1024;
type Rows = Record<string, unknown>[];
export interface SavePayload {
  /** Verified preceding stream layout; used only for its matching operational conversion. */
  legacyRecordLayout?: true;
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
  get busy() {
    return !!this.active;
  }
  get catalogIssues() {
    return this.files.issueCount;
  }
  lastError?: string;
  async drain() {
    // The requesting caller receives the failure. A failed optional checkpoint
    // must not prevent native shutdown flushing or a subsequent explicit restore.
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
        "SELECT id,label,created_at,sim_time,format FROM game_saves WHERE world_id=? AND id='before-load'",
      )
      .all(worldId);
    const recovery = rows.map((row) => ({
      id: String(row['id']),
      label: String(row['label']),
      createdAt: String(row['created_at']),
      simTime: Number(row['sim_time']),
      compatible: typeof row['format'] === 'string',
    }));
    const manual = (await this.files.list(worldId, { ...options, excludeRecovery: true })).map(
      (metadata) => ({
        id: metadata.id,
        label: metadata.label,
        createdAt: metadata.createdAt,
        simTime: metadata.simTime,
        kind: metadata.kind ?? 'manual',
        compatible: typeof metadata.format === 'string',
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
          new GameSaveError('Another checkpoint is in progress. Try again after it finishes.'),
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
          },
          { expectedRevision: options.expectedRevision, captured: finishCapture },
        );
      })
      .then(() => {
        this.lastError = undefined;
      })
      .catch((error: unknown) => {
        this.lastError = error instanceof Error ? error.message : 'Checkpoint failed.';
        throw error;
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
      if (pointer) await this.rotate(worldId, 'recovery', 2, pointer);
    } catch (error) {
      // Installation already committed. Report cleanup failure without telling
      // the caller that its successful timeline replacement failed.
      this.lastError = `Recovery retention failed: ${error instanceof Error ? error.message : 'unknown error'}`;
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
      // Only the checked stream manifest can establish the preceding record layout.
      delete payload.legacyRecordLayout;
    }
    if (
      typeof payload.format !== 'string' ||
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
  async install(current: SavedWorld, restore: RestoreSave) {
    validateWorldModules(restore.payload.state.world);
    const recoveryId = randomUUID();
    await this.create(current, 'Before last load', recoveryId, { kind: 'recovery' });
    // Publish the immutable recovery file first. Its pointer switches atomically
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
