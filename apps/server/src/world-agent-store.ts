import type { RequestScope } from './authority.js';
import { readAttemptBudget } from './attempt-budget.js';
import type {
  WorldAgentReply,
  WorldAgentTurnCursor,
  WorldAgentTurnView,
  WorldAgentRequirement,
  WorldAgentQuestion,
  WorldAgentQuestionAnswer,
  WorldAgentProgress,
} from '@open-legend/protocol';
import type { SqlDatabase } from './store.js';
import type { AuthoringPacket, AuthoringProfile } from './world-authoring-context.js';

/** Operational authoring state is not rewound with gameplay. Domain definitions remain in WorldState.
 * docs/world-agent-runtime.md#durable-write-sessions
 */
export const WORLD_AGENT_TABLES = ['world_agent_sessions', 'world_agent_records'] as const;
export interface AgentSession {
  id: string;
  worldId: string;
  timeline: string;
  principal: string;
  authority: RequestScope;
  credential: string;
  contextHash: string;
  title?: string;
  createdAt: number;
  expiresAt: number;
  closed: boolean;
  budgetUsd: number;
  policy: string;
  actorId: string;
  activeTurn?: string;
  questionTurn?: string;
  recoveryTurn?: string;
  turnSequence?: number;
  profile?: AuthoringProfile;
  initialPurpose?: 'conversation' | 'invention';
  selectedDraft?: { id: string; revision: number };
  toolCalls?: number;
  packetRef?: string;
  pendingProfile?: { kind: Exclude<AuthoringProfile, 'discovery'>; reason: string; turnId: string };
  requirements?: WorldAgentRequirement[];
}
export interface AgentQuestionRecord {
  view: WorldAgentQuestion;
  source: { runId: string; requestId: string; sequence: string };
  binding: Pick<AuthoringPacket, 'generation' | 'membership' | 'pins'> & {
    selected?: AgentSession['selectedDraft'];
  };
}
export interface AgentTurnRecord {
  fingerprint: string;
  revision?: number;
  /** Outer planned handoff, retained before another Run can be admitted. */
  nextRunRequestId?: string;
  text?: string;
  sequence?: number;
  createdAt?: number;
  cancelRequested?: boolean;
  response?: WorldAgentReply;
  progress?: WorldAgentProgress & {
    runId: string;
    sequence: string;
    requestId: string;
    applicationRequestId?: string;
    prefixLength?: number;
    prefixOmittedBytes?: number;
    providerOmittedBytes?: number;
    projectionOmittedBytes?: number;
  };
  question?: AgentQuestionRecord;
  answer?: {
    questionTurnId: string;
    digest: string;
    value: WorldAgentQuestionAnswer;
    principal: string;
  };
  continuationOf?: { questionTurnId: string; answerId: string };
}
export class WorldAgentStore {
  constructor(readonly db: SqlDatabase) {}
  async initialize() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS world_agent_sessions (
      id TEXT PRIMARY KEY, world_id TEXT NOT NULL, context_hash TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS world_agent_context ON world_agent_sessions(context_hash);
      CREATE INDEX IF NOT EXISTS world_agent_world ON world_agent_sessions(world_id,id);
      CREATE INDEX IF NOT EXISTS world_agent_active ON world_agent_sessions(world_id,id)
        WHERE (payload::jsonb #>> '{activeTurn}') IS NOT NULL;
      CREATE INDEX IF NOT EXISTS world_agent_owner_order_numeric
        ON world_agent_sessions(world_id,(payload::jsonb #>> '{principal}'),CAST((payload::jsonb #>> '{createdAt}') AS BIGINT),id);
      CREATE TABLE IF NOT EXISTS world_agent_records (
        session_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(session_id,kind,id));
      CREATE INDEX IF NOT EXISTS world_agent_turn_order_numeric
        ON world_agent_records(session_id, COALESCE(CAST((payload::jsonb #>> '{sequence}') AS BIGINT),0),id)
        WHERE kind='turn';
      CREATE INDEX IF NOT EXISTS world_agent_revision_order_numeric
        ON world_agent_records(session_id,(payload::jsonb #>> '{id}'),CAST((payload::jsonb #>> '{revision}') AS BIGINT))
        WHERE kind='revision';
      CREATE INDEX IF NOT EXISTS world_agent_plan_draft_order
        ON world_agent_records(session_id,(payload::jsonb #>> '{draftId}'),CAST((payload::jsonb #>> '{revision}') AS BIGINT),id)
        WHERE kind='plan';
`);
  }
  // Cast sortable JSON numbers explicitly: PostgreSQL projects JSON as text.
  // Keep PostgreSQL index and query expressions identical.
  async sessions(worldId: string, principal: string, before?: { createdAt: number; id: string }) {
    const cursor = before ?? { createdAt: Number.MAX_SAFE_INTEGER, id: '\uffff' };
    const rows = await this.db
      .prepare(
        `SELECT payload FROM world_agent_sessions
      WHERE world_id=? AND (payload::jsonb #>> '{principal}')=?
      AND (CAST((payload::jsonb #>> '{createdAt}') AS BIGINT),id)<(?,?)
      ORDER BY CAST((payload::jsonb #>> '{createdAt}') AS BIGINT) DESC,id DESC LIMIT 21`,
      )
      .all(worldId, principal, cursor.createdAt, cursor.id);
    return rows.map((row) => JSON.parse(String(row['payload'])) as AgentSession);
  }
  async activeSessions(worldId: string): Promise<AgentSession[]> {
    const rows = await this.db
      .prepare(
        `SELECT payload FROM world_agent_sessions WHERE world_id=?
       AND (payload::jsonb #>> '{activeTurn}') IS NOT NULL ORDER BY id LIMIT 50`,
      )
      .all(worldId);
    return rows.map((row) => JSON.parse(String(row['payload'])) as AgentSession);
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
    const payload = JSON.stringify(session);
    if (Buffer.byteLength(payload) > 128 * 1024)
      throw new Error('Authoring session exceeds its byte limit.');
    await this.db
      .prepare(
        `INSERT INTO world_agent_sessions VALUES (?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET context_hash=excluded.context_hash,payload=excluded.payload`,
      )
      .run(session.id, session.worldId, session.contextHash, payload);
  }
  async get<T>(sessionId: string, kind: string, id: string): Promise<T | undefined> {
    const row = await this.db
      .prepare('SELECT payload FROM world_agent_records WHERE session_id=? AND kind=? AND id=?')
      .get(sessionId, kind, id);
    return row ? (JSON.parse(String(row['payload'])) as T) : undefined;
  }
  async put(sessionId: string, kind: string, id: string, value: unknown) {
    if (kind === 'turn') {
      // Every turn write is serialized by the session owner. Questions, answers
      // and cancellation must outrank held snapshots just as growing text does.
      const prior = await this.get<AgentTurnRecord>(sessionId, kind, id);
      value = { ...(value as AgentTurnRecord), revision: (prior?.revision ?? 0) + 1 };
    }
    // Optional preview must not crowd out an immutable question or required terminal
    // outcome. Control characters can occupy more JSON bytes than UTF-8 source bytes.
    const retained = kind === 'turn' ? boundedTurn(value as AgentTurnRecord) : value;
    const payload = JSON.stringify(retained);
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
  async workRevision(sessionId: string): Promise<string> {
    // Cover all admitted drafts/reviews, including work beyond the visible page.
    // The existing 64-draft/512-plan caps bound this aggregate; no bodies leave SQL.
    const row = await this.db
      .prepare(
        `SELECT md5(COALESCE(string_agg(kind || ':' || id || ':' ||
          COALESCE(payload::jsonb->>'digest','') || ':' ||
          COALESCE(payload::jsonb->>'revision','') || ':' ||
          COALESCE(payload::jsonb->>'status',''), '|' ORDER BY kind,id),'')) AS revision
         FROM world_agent_records WHERE session_id=? AND kind IN ('draft','plan')`,
      )
      .get(sessionId);
    return String(row?.['revision'] ?? '');
  }
  async revisions<T>(sessionId: string, draftId: string, before = Number.MAX_SAFE_INTEGER) {
    const rows = await this.db
      .prepare(
        `SELECT payload FROM world_agent_records WHERE session_id=? AND kind='revision'
        AND (payload::jsonb #>> '{id}')=?
        AND CAST((payload::jsonb #>> '{revision}') AS BIGINT)<?
        ORDER BY CAST((payload::jsonb #>> '{revision}') AS BIGINT) DESC LIMIT 21`,
      )
      .all(sessionId, draftId, before);
    return rows.map((row) => JSON.parse(String(row['payload'])) as T);
  }
  async plansForDraft<T>(sessionId: string, draftId: string, revision: number, after = '') {
    const rows = await this.db
      .prepare(
        `SELECT payload FROM world_agent_records WHERE session_id=? AND kind='plan'
      AND (payload::jsonb #>> '{draftId}')=?
      AND CAST((payload::jsonb #>> '{revision}') AS BIGINT)=? AND id>?
      ORDER BY id LIMIT 21`,
      )
      .all(sessionId, draftId, revision, after);
    return rows.map((row) => JSON.parse(String(row['payload'])) as T);
  }
  async clearPackets(sessionId: string) {
    await this.db
      .prepare("DELETE FROM world_agent_records WHERE session_id=? AND kind='packet'")
      .run(sessionId);
  }
  async turns(
    sessionId: string,
    before?: WorldAgentTurnCursor,
    projectQuestion: (question: NonNullable<AgentTurnRecord['question']>) => WorldAgentQuestion = (
      question,
    ) => question.view,
    limit = 20,
  ) {
    const cursor = before ?? { sequence: Number.MAX_SAFE_INTEGER, id: '\uffff' };
    const rows = await this.db
      .prepare(
        `SELECT id,payload FROM world_agent_records
      WHERE session_id=? AND kind='turn'
      AND (COALESCE(CAST((payload::jsonb #>> '{sequence}') AS BIGINT),0),id)<(?,?)
      ORDER BY COALESCE(CAST((payload::jsonb #>> '{sequence}') AS BIGINT),0) DESC,id DESC LIMIT ?`,
      )
      .all(sessionId, cursor.sequence, cursor.id, limit + 1);
    const items: WorldAgentTurnView[] = rows.slice(0, limit).map((row) => {
      const turn = JSON.parse(String(row['payload'])) as AgentTurnRecord;
      return {
        id: String(row['id']),
        revision: turn.revision ?? 0,
        sequence: turn.sequence ?? 0,
        text: turn.text ?? null,
        createdAt: turn.createdAt ?? null,
        cancelRequested: !!turn.cancelRequested,
        response: turn.response ?? null,
        ...(turn.progress ? { progress: publicProgress(turn.progress) } : {}),
        ...(turn.question ? { question: projectQuestion(turn.question) } : {}),
      };
    });
    const last = items.at(-1);
    return {
      turns: items,
      next: rows.length > limit && last ? { sequence: last.sequence, id: last.id } : null,
    };
  }
  exposure(budgetId: string) {
    return readAttemptBudget(this.db, budgetId);
  }
}

export function publicProgress(
  progress: NonNullable<AgentTurnRecord['progress']>,
): WorldAgentProgress {
  return {
    revision: progress.revision,
    stage: progress.stage,
    text: progress.text,
    completeness: progress.completeness,
    ...(progress.omittedBytes ? { omittedBytes: progress.omittedBytes } : {}),
  };
}

function boundedTurn(turn: AgentTurnRecord): AgentTurnRecord {
  if (turn.response?.code === 'completed' && Buffer.byteLength(JSON.stringify(turn)) > 128 * 1024) {
    turn = {
      ...turn,
      ...(turn.progress ? { progress: { ...turn.progress, text: '' } } : {}),
    };
    // Character counts do not bound UTF-8 or escaped JSON. Keep the terminal
    // receipt and required question, using the existing oversized-result policy.
    if (Buffer.byteLength(JSON.stringify(turn)) > 128 * 1024)
      turn = {
        ...turn,
        response: {
          ...turn.response!,
          message:
            'The agent result exceeds the conversation limit. Saved drafts and reviews remain available; inspect the remote run for its full text.',
        },
      };
  }
  if (
    !turn.progress?.text ||
    (Buffer.byteLength(turn.progress.text) <= 64 * 1024 &&
      Buffer.byteLength(JSON.stringify(turn)) <= 128 * 1024)
  )
    return turn;
  const words = Array.from(turn.progress.text);
  const progress = { ...turn.progress, completeness: 'incomplete' as const };
  const bounded = { ...turn, progress };
  let low = 0,
    high = words.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    progress.text = words.slice(0, middle).join('');
    if (
      Buffer.byteLength(progress.text) <= 64 * 1024 &&
      Buffer.byteLength(JSON.stringify(bounded)) <= 128 * 1024 - 128
    )
      low = middle;
    else high = middle - 1;
  }
  progress.text = words.slice(0, low).join('');
  if ((progress.prefixLength ?? 0) > progress.text.length) {
    // New-stage metadata or required outcomes can shorten the carried reply.
    // The next cumulative batch must never mistake new text for that prefix.
    progress.prefixOmittedBytes =
      (progress.prefixOmittedBytes ?? 0) +
      Buffer.byteLength(turn.progress.text.slice(progress.text.length, progress.prefixLength));
    progress.prefixLength = progress.text.length;
  }
  progress.projectionOmittedBytes =
    (turn.progress.projectionOmittedBytes ?? 0) +
    Buffer.byteLength(turn.progress.text) -
    Buffer.byteLength(progress.text);
  progress.omittedBytes =
    (turn.progress.providerOmittedBytes ??
      Math.max(
        0,
        (turn.progress.omittedBytes ?? 0) - (turn.progress.projectionOmittedBytes ?? 0),
      )) + progress.projectionOmittedBytes;
  return bounded;
}
