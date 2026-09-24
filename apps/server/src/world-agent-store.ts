import type { SqlDatabase } from './store.js';

/** Operational authoring state is not rewound with gameplay. Domain definitions remain in WorldState.
 * docs/world-agent-runtime.md#durable-write-sessions
 */
export const WORLD_AGENT_TABLES = ['world_agent_sessions', 'world_agent_records'] as const;
export interface AgentSession {
  id: string;
  worldId: string;
  timeline: string;
  principal: string;
  credential: string;
  contextHash: string;
  createdAt: number;
  expiresAt: number;
  closed: boolean;
  budgetUsd: number;
  policy: string;
  actorId: string;
  activeTurn?: string;
}
export class WorldAgentStore {
  constructor(readonly db: SqlDatabase) {}
  async initialize() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS world_agent_sessions (
      id TEXT PRIMARY KEY, world_id TEXT NOT NULL, context_hash TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS world_agent_context ON world_agent_sessions(context_hash);
      CREATE INDEX IF NOT EXISTS world_agent_world ON world_agent_sessions(world_id,id);
      CREATE TABLE IF NOT EXISTS world_agent_records (
        session_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(session_id,kind,id));`);
  }
  async session(id: string): Promise<AgentSession | undefined> {
    const row = await this.db
      .prepare('SELECT payload FROM world_agent_sessions WHERE id=?')
      .get(id);
    return row ? (JSON.parse(String(row['payload'])) as AgentSession) : undefined;
  }
  async byContext(hash: string): Promise<AgentSession | undefined> {
    const row = await this.db
      .prepare('SELECT payload FROM world_agent_sessions WHERE context_hash=?')
      .get(hash);
    return row ? (JSON.parse(String(row['payload'])) as AgentSession) : undefined;
  }
  async saveSession(session: AgentSession) {
    await this.db
      .prepare(
        `INSERT INTO world_agent_sessions VALUES (?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET context_hash=excluded.context_hash,payload=excluded.payload`,
      )
      .run(session.id, session.worldId, session.contextHash, JSON.stringify(session));
  }
  async get<T>(sessionId: string, kind: string, id: string): Promise<T | undefined> {
    const row = await this.db
      .prepare('SELECT payload FROM world_agent_records WHERE session_id=? AND kind=? AND id=?')
      .get(sessionId, kind, id);
    return row ? (JSON.parse(String(row['payload'])) as T) : undefined;
  }
  async put(sessionId: string, kind: string, id: string, value: unknown) {
    const payload = JSON.stringify(value);
    if (Buffer.byteLength(payload) > 128 * 1024)
      throw new Error('Authoring record exceeds its byte limit.');
    await this.db
      .prepare(
        `INSERT INTO world_agent_records VALUES (?,?,?,?)
      ON CONFLICT(session_id,kind,id) DO UPDATE SET payload=excluded.payload`,
      )
      .run(sessionId, kind, id, payload);
  }
  async list<T>(sessionId: string, kind: string, after = '', limit = 50): Promise<T[]> {
    return (
      await this.db
        .prepare(
          `SELECT payload FROM world_agent_records
      WHERE session_id=? AND kind=? AND id>? ORDER BY id LIMIT ?`,
        )
        .all(sessionId, kind, after, limit)
    ).map((row) => JSON.parse(String(row['payload'])) as T);
  }
  async count(sessionId: string, kind: string): Promise<number> {
    const row = await this.db
      .prepare('SELECT COUNT(*) AS count FROM world_agent_records WHERE session_id=? AND kind=?')
      .get(sessionId, kind);
    return Number(row?.['count'] ?? 0);
  }
  async exposure(budgetId: string) {
    const row = await this.db
      .prepare(
        `SELECT COALESCE(SUM(a.spent),0) AS spent,
      COALESCE(SUM(a.reserved),0) AS reserved,
      COALESCE(SUM(CASE WHEN a.status='uncertain' THEN a.spent ELSE 0 END),0) AS uncertain
      FROM attempts a JOIN attempt_budgets b ON b.attempt_id=a.id WHERE b.budget_id=?`,
      )
      .get(budgetId);
    return {
      spentUsd: Number(row?.['spent'] ?? 0) / 1e6,
      reservedUsd: Number(row?.['reserved'] ?? 0) / 1e6,
      uncertainUsd: Number(row?.['uncertain'] ?? 0) / 1e6,
    };
  }
}
