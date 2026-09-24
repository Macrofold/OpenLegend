import { validateWorldModules } from '@open-legend/domain';
import { HISTORY_TABLES } from './history.js';
import { digest, type SavedWorld, type SqlDatabase } from './store.js';
import type { GameSaveSummary } from '@open-legend/protocol';
import { SaveFiles } from './save-files.js';

// 2026-09-21: no real players. No legacy readers or migrations until the owner lifts
// docs/save-and-load.md#active-development-policy. Bump this on incompatible changes.
export class GameSaveError extends Error {}
export const SAVE_FORMAT = 'development-2026-09-24-perception2';
const MAX_SAVES = 20;
const MAX_BYTES = 64 * 1024 * 1024;
type Rows = Record<string, unknown>[];
export interface SavePayload {
  format: string;
  state: SavedWorld;
  history: Record<(typeof HISTORY_TABLES)[number], Rows>;
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
  constructor(
    private readonly db: SqlDatabase,
    directory: string,
  ) {
    this.files = new SaveFiles(directory);
  }
  async initialize() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS game_saves (
      id TEXT PRIMARY KEY, world_id TEXT NOT NULL, label TEXT NOT NULL,
      created_at TEXT NOT NULL, sim_time REAL NOT NULL, format TEXT NOT NULL,
      checksum TEXT NOT NULL, payload TEXT NOT NULL
    )`);
  }
  async list(worldId: string): Promise<GameSaveSummary[]> {
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
      compatible: row['format'] === SAVE_FORMAT,
    }));
    const manual = (await this.files.list(worldId)).map((metadata) => ({
      id: metadata.id,
      label: metadata.label,
      createdAt: metadata.createdAt,
      simTime: metadata.simTime,
      compatible: metadata.format === SAVE_FORMAT,
    }));
    return [...manual, ...recovery].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async capture(state: SavedWorld): Promise<SavePayload> {
    validateWorldModules(state.world);
    const history = {} as SavePayload['history'];
    for (const table of HISTORY_TABLES)
      history[table] = await this.db
        .prepare(`SELECT * FROM ${table} WHERE world_id=?`)
        .all(state.world.id);
    return { format: SAVE_FORMAT, state, history };
  }
  async insert(id: string, label: string, payload: SavePayload) {
    const encoded = JSON.stringify(payload);
    if (Buffer.byteLength(encoded) > MAX_BYTES)
      throw new GameSaveError('This world exceeds the initial 64 MiB save limit.');
    await this.db
      .prepare(`INSERT INTO game_saves VALUES (?,?,?,?,?,?,?,?)`)
      .run(
        id,
        payload.state.world.id,
        label,
        new Date().toISOString(),
        payload.state.world.simTime,
        SAVE_FORMAT,
        digest(payload),
        encoded,
      );
  }
  async create(state: SavedWorld, label: string, id: string) {
    const prior = await this.files.metadata(id);
    if (prior) {
      if (prior.worldId !== state.world.id) throw new GameSaveError('Save identity conflicts.');
      return;
    }
    if ((await this.files.list(state.world.id)).length >= MAX_SAVES)
      throw new GameSaveError(
        'All 20 manual slots are in use. Delete a save before creating another.',
      );
    const payload = await this.db.transaction(() => this.capture(state));
    const encoded = JSON.stringify(payload);
    if (Buffer.byteLength(encoded) > MAX_BYTES)
      throw new GameSaveError('This world exceeds the initial 64 MiB save limit.');
    await this.files.write(
      {
        id,
        worldId: state.world.id,
        label,
        createdAt: new Date().toISOString(),
        simTime: state.world.simTime,
        format: SAVE_FORMAT,
        checksum: digest(payload),
      },
      encoded,
    );
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
    if (row['format'] !== SAVE_FORMAT)
      throw new GameSaveError(
        'This development save is incompatible. Older versions are not supported.',
      );
    const encoded =
      'payload' in row ? String(row['payload']) : await this.files.read(id, MAX_BYTES);
    if (Buffer.byteLength(encoded) > MAX_BYTES)
      throw new GameSaveError('Save exceeds the supported size.');
    const payload = JSON.parse(encoded) as SavePayload;
    if (
      payload.format !== SAVE_FORMAT ||
      digest(payload) !== row['checksum'] ||
      payload.state?.world?.id !== worldId ||
      payload.state.world.schemaVersion !== 13 ||
      !HISTORY_TABLES.every((table) => Array.isArray(payload.history?.[table]))
    )
      throw new GameSaveError('Save integrity check failed.');
    validateWorldModules(payload.state.world);
    return payload;
  }
  async delete(worldId: string, id: string) {
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
    const before = await this.capture(current);
    await this.delete(current.world.id, 'before-load');
    await this.insert('before-load', 'Before last load', before);
    for (const table of HISTORY_TABLES) {
      await this.db.prepare(`DELETE FROM ${table} WHERE world_id=?`).run(current.world.id);
      const rows = restore.payload.history[table];
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
    if (this.db.dialect === 'postgres')
      await this.db.prepare('DELETE FROM mind.inner_world WHERE world_id=?').run(current.world.id);
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
