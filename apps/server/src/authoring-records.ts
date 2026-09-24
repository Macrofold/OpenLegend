import type { SqlDatabase, GameRepository } from './store.js';
import type { AuthoringDraftView, AuthoringPlanView } from '@open-legend/protocol';
import { digest } from './content-digest.js';

export interface AuthoringSession {
  id: string;
  conversationId: string;
  worldId: string;
  timelineId: string;
  accountId: string;
  actorId?: string;
  mode: 'player' | 'creator';
  limitUsd: number;
  closed: boolean;
  draftIds: string[];
  planIds: string[];
}
export interface AuthoringDraft extends AuthoringDraftView {
  sessionId: string;
}
export interface AuthoringPlan extends AuthoringPlanView {
  sessionId: string;
  timelineId: string;
  policyRevision: number;
  manifestRevision: number;
  commandEpoch: string;
  actorId: string;
  /** Material definitions can change without changing the module manifest. */
  dependencyDigest: string;
  approvedBy?: string;
}

/** Authoring metadata belongs in existing operational storage, outside gameplay rewind.
 * Draft versions and receipts are exact-key records; inspecting one never loads session history.
 * docs/world-agent-runtime.md#implemented-authoring-sessions
 */
export class AuthoringRecords {
  constructor(
    private store: GameRepository,
    readonly db: SqlDatabase,
  ) {}
  private key(kind: string, id: string) {
    return `world-authoring:v1:${kind}:${id}`;
  }
  async get<T>(kind: string, id: string): Promise<T | undefined> {
    return (await this.store.getIntegration(this.key(kind, id))) as T | undefined;
  }
  async put(kind: string, id: string, value: unknown) {
    if (Buffer.byteLength(JSON.stringify(value)) > 96 * 1024)
      throw new Error('Authoring record exceeds its retained size limit. Narrow the draft.');
    await this.store.putIntegration(this.key(kind, id), value);
  }
  async many<T>(kind: string, ids: string[]): Promise<T[]> {
    if (ids.length > 64) throw new Error('Authoring page exceeds its limit.');
    if (!ids.length) return [];
    const keys = ids.map((id) => `integration:${this.key(kind, id)}`);
    const rows = await this.db
      .prepare(`SELECT key, value FROM meta WHERE key IN (${keys.map(() => '?').join(',')})`)
      .all(...keys);
    const byKey = new Map(rows.map((row) => [String(row['key']), String(row['value'])]));
    return keys.flatMap((key) => (byKey.has(key) ? [JSON.parse(byKey.get(key)!) as T] : []));
  }
  /** Only metadata work enters this transaction; never provider calls or world commits. */
  async write<T>(
    sessionId: string,
    operationId: string,
    input: unknown,
    action: () => Promise<T>,
  ): Promise<T> {
    const key = `${sessionId}:${operationId}`;
    const fingerprint = digest(input);
    return this.db.transaction(async () => {
      const prior = await this.get<{ fingerprint: string; result: T }>('operation', key);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new Error('Operation ID has different content.');
        return prior.result;
      }
      const result = await action();
      await this.put('operation', key, { fingerprint, result });
      return result;
    });
  }
}
