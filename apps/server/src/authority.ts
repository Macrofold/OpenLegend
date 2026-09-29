import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { isSafeRecordId, type WorldState } from '@open-legend/domain';
import type { SqlDatabase } from './store.js';

// Dependency order for operational recovery; these records never enter gameplay checkpoints.
// Invites and maintenance windows are operational access/control records owned by
// invites.ts and maintenance.ts; they back up and restore with current authority.
export const AUTHORITY_TABLES = [
  'auth_accounts',
  'auth_sessions',
  'auth_grants',
  'auth_controls',
  'auth_exits',
  'auth_control_receipts',
  'auth_actor_owners',
  'auth_binding_receipts',
  'auth_access_audit',
  'auth_invites',
  'ops_maintenance',
];

export const capabilitySchema = z.enum([
  'play',
  'spectate',
  'create',
  'inspect',
  'save',
  'manage-access',
]);
export type Capability = z.infer<typeof capabilitySchema>;
/** Characterless grants share the one-grant-per-account row without a character. The marker
 * never leaves this repository; changing the existing NOT NULL column would convert saves.
 * docs/projects/multiplayer-entry-maintenance.md#decisions */
const CHARACTERLESS = '#characterless:';
const storedActor = (accountId: string, actorId: string | undefined) =>
  actorId ?? `${CHARACTERLESS}${accountId}`;
const grantActor = (stored: unknown): string | undefined =>
  String(stored).startsWith(CHARACTERLESS) ? undefined : String(stored);
export const actorIdSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((id) => isSafeRecordId(id) && !id.startsWith(CHARACTERLESS));
/** A grant without a character can never play or hold a control lease. */
export const grantCapabilitiesValid = (actorId: string | undefined, capabilities: Capability[]) =>
  actorId !== undefined || !capabilities.includes('play');
export const accountBindingSchema = z
  .object({
    issuer: z.string().url(),
    subject: z.string().min(1).max(512),
    accountId: z.string().min(1).max(100).refine(isSafeRecordId),
    actorId: actorIdSchema.optional(),
    capabilities: z.array(capabilitySchema).max(6),
  })
  .strict()
  .refine((binding) => grantCapabilitiesValid(binding.actorId, binding.capabilities), {
    message: 'A binding without a character cannot include play.',
  });
export type AccountBinding = z.infer<typeof accountBindingSchema>;
export interface VerifiedIdentity {
  issuer: string;
  subject: string;
}
export interface LoginSession {
  id: string;
  accountId: string;
  revision: number;
  expiresAt: number;
}
export interface WorldGrant {
  worldId: string;
  accountId: string;
  /** Absent for an operator/spectator grant; such grants never include play. */
  actorId?: string;
  revision: number;
  capabilities: Capability[];
}
export interface ControlLease {
  worldId: string;
  actorId: string;
  generation: number;
  accountId: string;
  sessionId: string;
  connectionId: string;
}
/** Server-created immutable authority. It contains no bearer credential. A characterless
 * operator/spectator scope has an empty actorId, generation 0 and inspection audience. */
export interface RequestScope {
  accountId: string;
  sessionId: string;
  sessionRevision: number;
  worldId: string;
  timelineId: string;
  grantRevision: number;
  actorId: string;
  controlGeneration: number;
  connectionId: string;
  audience: 'embodied' | 'authorized-inspection';
}
export interface ExitAttempt {
  worldId: string;
  actorId: string;
  id: string;
  deadline: number;
}
export interface ControlRequest {
  id: string;
  expectedGeneration: number;
  operation: 'acquire' | 'replace' | 'release';
}
export interface BindingRequest {
  id: string;
  accountId: string;
  actorId: string;
  expectedRevision: number;
}
export interface AuthorityFence {
  scope: RequestScope;
  capability: Capability;
  controlling: boolean;
  now: () => number;
}
export class AuthorityError extends Error {
  constructor(
    readonly code: 'session' | 'forbidden' | 'control-changed' | 'stale-scope' | 'conflict',
  ) {
    super(
      {
        session: 'Sign in to continue.',
        forbidden: 'This operation is unavailable to this account.',
        'control-changed': 'Control changed. Choose Take control to continue.',
        'stale-scope': 'Your access or world changed. Refresh before continuing.',
        conflict: 'This request conflicts with an earlier request.',
      }[code],
    );
  }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const isCharacterless = (scope: RequestScope) => scope.audience === 'authorized-inspection';
export const scopeKey = (scope: RequestScope) => hash(JSON.stringify(scope));
/** Reconnect keeps device drafts; security, embodiment and timeline changes do not.
 * This namespace grants no request authority and never replaces scopeKey.
 * docs/invention-workshop-tools.md#implemented-human-saved-work-interface
 */
export const privateDraftScopeKey = (scope: RequestScope) => {
  const { connectionId: _connectionId, ...privateScope } = scope;
  return hash(JSON.stringify(privateScope));
};
const key = (worldId: string, id: string) => JSON.stringify([worldId, id]);

/** Current authority is deliberately outside WorldRecords and every gameplay save.
 * All mutations use the application's existing writer; SQL also checks publication fences.
 * docs/projects/multiplayer-authority-tech-design.md#2-identity-and-records
 */
export class AuthorityRepository {
  private sessions = new Map<string, LoginSession>();
  private grants = new Map<string, WorldGrant>();
  private controls = new Map<string, ControlLease>();
  private listeners = new Set<() => void>();
  constructor(private readonly db: SqlDatabase) {}
  async initialize() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_accounts (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, UNIQUE(issuer,subject));
      CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL REFERENCES auth_accounts(id), revision BIGINT NOT NULL, expires_at BIGINT NOT NULL);
      CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS auth_grants (world_id TEXT NOT NULL, account_id TEXT NOT NULL REFERENCES auth_accounts(id), actor_id TEXT NOT NULL, revision BIGINT NOT NULL, capabilities TEXT NOT NULL, PRIMARY KEY(world_id,account_id), UNIQUE(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_controls (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, generation BIGINT NOT NULL, account_id TEXT NOT NULL, session_id TEXT NOT NULL, connection_id TEXT NOT NULL, PRIMARY KEY(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_exits (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_control_receipts (world_id TEXT NOT NULL, account_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,account_id,request_id));
      CREATE TABLE IF NOT EXISTS auth_actor_owners (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, account_id TEXT NOT NULL, PRIMARY KEY(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_binding_receipts (world_id TEXT NOT NULL, issuer_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,issuer_id,request_id));
      CREATE TABLE IF NOT EXISTS auth_access_audit (id TEXT PRIMARY KEY, world_id TEXT NOT NULL, account_id TEXT NOT NULL, issuer_id TEXT NOT NULL, recorded_at BIGINT NOT NULL, payload TEXT NOT NULL);
    `);
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private changed(apply: () => void) {
    const publish = () => {
      apply();
      for (const listener of this.listeners) listener();
    };
    if (this.db.afterCommit) this.db.afterCommit(publish);
    else publish();
  }
  async account(identity: VerifiedIdentity, explicitId?: string): Promise<string> {
    return this.db.transaction(async () => {
      const prior = await this.db
        .prepare('SELECT id FROM auth_accounts WHERE issuer=? AND subject=?')
        .get(identity.issuer, identity.subject);
      if (prior) {
        if (explicitId && prior['id'] !== explicitId) throw new AuthorityError('conflict');
        return String(prior['id']);
      }
      const id = explicitId ?? randomUUID();
      if (explicitId) {
        const local = await this.db
          .prepare('SELECT issuer,subject FROM auth_accounts WHERE id=?')
          .get(explicitId);
        if (
          local?.['issuer'] === 'https://local.openlegend.invalid' &&
          local['subject'] === 'local-player'
        ) {
          await this.db
            .prepare('UPDATE auth_accounts SET issuer=?,subject=? WHERE id=?')
            .run(identity.issuer, identity.subject, explicitId);
          await this.db.prepare('DELETE FROM auth_sessions WHERE account_id=?').run(explicitId);
          this.changed(() => {
            for (const [sessionId, session] of this.sessions)
              if (session.accountId === explicitId) this.sessions.delete(sessionId);
          });
          return explicitId;
        }
      }
      await this.db
        .prepare('INSERT INTO auth_accounts VALUES (?,?,?)')
        .run(id, identity.issuer, identity.subject);
      return id;
    });
  }
  async provision(worldId: string, binding: AccountBinding): Promise<void> {
    await this.db.transaction(async () => {
      await this.account(binding, binding.accountId);
      const current = await this.grant(worldId, binding.accountId);
      // Operator configuration establishes a binding once. Restart never undoes a later revocation.
      if (current) return;
      await this.insertGrant({
        worldId,
        accountId: binding.accountId,
        actorId: binding.actorId,
        revision: 1,
        capabilities: [...new Set(binding.capabilities)],
      });
    });
  }
  /** One insertion path for bootstrap and invited grants; the caller owns admission. */
  async insertGrant(grant: WorldGrant): Promise<void> {
    if (!grantCapabilitiesValid(grant.actorId, grant.capabilities))
      throw new AuthorityError('forbidden');
    if (grant.actorId) await this.retainActorOwner(grant.worldId, grant.actorId, grant.accountId);
    await this.db
      .prepare('INSERT INTO auth_grants VALUES (?,?,?,?,?)')
      .run(
        grant.worldId,
        grant.accountId,
        storedActor(grant.accountId, grant.actorId),
        grant.revision,
        JSON.stringify(grant.capabilities),
      );
    this.changed(() => this.grants.set(key(grant.worldId, grant.accountId), grant));
  }
  async login(
    identity: VerifiedIdentity,
    now: number,
    duration: number,
    capacity = 4096,
  ): Promise<{ token: string; session: LoginSession }> {
    return this.db.transaction(async () => {
      const accountId = await this.account(identity);
      await this.db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').run(now);
      const count = await this.db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get();
      if (Number(count?.['count']) >= capacity)
        throw new Error('Authentication session capacity reached.');
      const token = randomBytes(32).toString('hex');
      const session: LoginSession = {
        id: randomUUID(),
        accountId,
        revision: 1,
        expiresAt: now + duration,
      };
      await this.db
        .prepare('INSERT INTO auth_sessions VALUES (?,?,?,?,?)')
        .run(session.id, hash(token), accountId, session.revision, session.expiresAt);
      this.changed(() => {
        for (const [id, old] of this.sessions) if (old.expiresAt <= now) this.sessions.delete(id);
        this.sessions.set(session.id, session);
      });
      return { token, session };
    });
  }
  async authenticate(token: string | undefined, now: number): Promise<LoginSession> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AuthorityError('session');
    const row = await this.db
      .prepare(
        'SELECT id,account_id,revision,expires_at FROM auth_sessions WHERE token_hash=? AND expires_at>?',
      )
      .get(hash(token), now);
    if (!row) throw new AuthorityError('session');
    const session: LoginSession = {
      id: String(row['id']),
      accountId: String(row['account_id']),
      revision: Number(row['revision']),
      expiresAt: Number(row['expires_at']),
    };
    this.sessions.set(session.id, session);
    return session;
  }
  async revokeSession(sessionId: string, now: number): Promise<void> {
    await this.db.transaction(async () => {
      await this.db
        .prepare('UPDATE auth_sessions SET revision=revision+1,expires_at=? WHERE id=?')
        .run(now, sessionId);
      this.changed(() => this.sessions.delete(sessionId));
    });
  }
  async grant(worldId: string, accountId: string): Promise<WorldGrant | undefined> {
    const row = await this.db
      .prepare('SELECT * FROM auth_grants WHERE world_id=? AND account_id=?')
      .get(worldId, accountId);
    if (!row) return undefined;
    const value: WorldGrant = {
      worldId,
      accountId,
      actorId: grantActor(row['actor_id']),
      revision: Number(row['revision']),
      capabilities: z.array(capabilitySchema).parse(JSON.parse(String(row['capabilities']))),
    };
    this.grants.set(key(worldId, accountId), value);
    return value;
  }
  async control(worldId: string, actorId: string): Promise<ControlLease> {
    const row = await this.db
      .prepare('SELECT * FROM auth_controls WHERE world_id=? AND actor_id=?')
      .get(worldId, actorId);
    const value: ControlLease = {
      worldId,
      actorId,
      generation: Number(row?.['generation'] ?? 0),
      accountId: String(row?.['account_id'] ?? ''),
      sessionId: String(row?.['session_id'] ?? ''),
      connectionId: String(row?.['connection_id'] ?? ''),
    };
    this.controls.set(key(worldId, actorId), value);
    return value;
  }
  async scope(
    session: LoginSession,
    worldId: string,
    timelineId: string,
    connectionId: string,
  ): Promise<RequestScope> {
    const grant = await this.grant(worldId, session.accountId);
    if (grant && !grant.actorId && grant.capabilities.length)
      return Object.freeze({
        accountId: session.accountId,
        sessionId: session.id,
        sessionRevision: session.revision,
        worldId,
        timelineId,
        grantRevision: grant.revision,
        actorId: '',
        controlGeneration: 0,
        connectionId,
        audience: 'authorized-inspection' as const,
      });
    if (!grant?.actorId || !grant.capabilities.includes('play'))
      throw new AuthorityError('forbidden');
    const control = await this.control(worldId, grant.actorId);
    return Object.freeze({
      accountId: session.accountId,
      sessionId: session.id,
      sessionRevision: session.revision,
      worldId,
      timelineId,
      grantRevision: grant.revision,
      actorId: grant.actorId,
      controlGeneration: control.generation,
      connectionId,
      audience: 'embodied' as const,
    });
  }
  refresh(scope: RequestScope, now: number): RequestScope {
    if (!this.current(scope, 'play', false, now)) throw new AuthorityError('stale-scope');
    const control = this.controls.get(key(scope.worldId, scope.actorId));
    return Object.freeze({ ...scope, controlGeneration: control?.generation ?? 0 });
  }
  /** Capabilities of a still-current session and grant, from the committed cache. */
  currentCapabilities(scope: RequestScope, now: number): readonly Capability[] | undefined {
    const session = this.sessions.get(scope.sessionId),
      grant = this.grants.get(key(scope.worldId, scope.accountId));
    return session &&
      session.accountId === scope.accountId &&
      session.revision === scope.sessionRevision &&
      session.expiresAt > now &&
      grant &&
      grant.revision === scope.grantRevision &&
      (grant.actorId ?? '') === scope.actorId
      ? grant.capabilities
      : undefined;
  }
  current(scope: RequestScope, capability: Capability, controlling: boolean, now: number): boolean {
    const control = this.controls.get(key(scope.worldId, scope.actorId));
    return (
      !!this.currentCapabilities(scope, now)?.includes(capability) &&
      (!controlling ||
        (!!control &&
          control.generation === scope.controlGeneration &&
          control.accountId === scope.accountId &&
          control.sessionId === scope.sessionId &&
          control.connectionId === scope.connectionId))
    );
  }
  /** Re-read in the world publication transaction, including session expiry after any await. */
  async assertFence(fence: AuthorityFence): Promise<void> {
    const { scope, capability, controlling, now } = fence;
    // One publication snapshot validates all three fences. Separate round trips
    // amplified command latency; cache refresh belongs to the committed owners.
    const session = await this.db
      .prepare(
        `SELECT s.account_id,s.revision,s.expires_at,
      g.actor_id AS grant_actor,g.revision AS grant_revision,g.capabilities,
      c.generation,c.account_id AS control_account,c.session_id,c.connection_id
      FROM auth_sessions s
      LEFT JOIN auth_grants g ON g.world_id=? AND g.account_id=?
      LEFT JOIN auth_controls c ON c.world_id=? AND c.actor_id=?
      WHERE s.id=?`,
      )
      .get(scope.worldId, scope.accountId, scope.worldId, scope.actorId, scope.sessionId);
    if (
      !session ||
      session['account_id'] !== scope.accountId ||
      Number(session['revision']) !== scope.sessionRevision ||
      Number(session['expires_at']) <= now()
    )
      throw new AuthorityError('session');
    if (
      session['grant_revision'] === null ||
      Number(session['grant_revision']) !== scope.grantRevision ||
      (grantActor(session['grant_actor']) ?? '') !== scope.actorId ||
      !z
        .array(capabilitySchema)
        .parse(JSON.parse(String(session['capabilities'])))
        .includes(capability)
    )
      throw new AuthorityError('forbidden');
    if (
      controlling &&
      (session['generation'] === null ||
        Number(session['generation']) !== scope.controlGeneration ||
        session['control_account'] !== scope.accountId ||
        session['session_id'] !== scope.sessionId ||
        session['connection_id'] !== scope.connectionId)
    )
      throw new AuthorityError('control-changed');
  }
  async changeControl(
    scope: RequestScope,
    request: ControlRequest,
    now: () => number,
  ): Promise<ControlLease> {
    return this.db.transaction(async () => {
      await this.assertFence({ scope, capability: 'play', controlling: false, now });
      const prior = await this.controlReceipt(scope, request);
      if (prior) return prior;
      const old = await this.control(scope.worldId, scope.actorId);
      if (
        old.generation !== request.expectedGeneration ||
        !Number.isSafeInteger(old.generation + 1)
      )
        throw new AuthorityError('control-changed');
      if (request.operation === 'release')
        await this.assertFence({ scope, capability: 'play', controlling: true, now });
      if (request.operation === 'acquire' && old.sessionId) {
        const live = await this.db
          .prepare('SELECT id FROM auth_sessions WHERE id=? AND expires_at>?')
          .get(old.sessionId, now());
        if (live) throw new AuthorityError('control-changed');
      }
      const value: ControlLease = {
        ...old,
        generation: old.generation + 1,
        accountId: scope.accountId,
        sessionId: request.operation === 'release' ? '' : scope.sessionId,
        connectionId: request.operation === 'release' ? '' : scope.connectionId,
      };
      await this.db
        .prepare(
          'INSERT INTO auth_controls VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET generation=excluded.generation,account_id=excluded.account_id,session_id=excluded.session_id,connection_id=excluded.connection_id',
        )
        .run(
          value.worldId,
          value.actorId,
          value.generation,
          value.accountId,
          value.sessionId,
          value.connectionId,
        );
      await this.db
        .prepare('INSERT INTO auth_control_receipts VALUES (?,?,?,?,?)')
        .run(
          scope.worldId,
          scope.accountId,
          request.id,
          this.controlFingerprint(scope, request),
          JSON.stringify(value),
        );
      this.changed(() => this.controls.set(key(scope.worldId, scope.actorId), value));
      return value;
    });
  }
  private controlFingerprint(scope: RequestScope, request: ControlRequest): string {
    return hash(
      JSON.stringify({
        request,
        actorId: scope.actorId,
        sessionId: scope.sessionId,
        connectionId: scope.connectionId,
        timelineId: scope.timelineId,
        grantRevision: scope.grantRevision,
      }),
    );
  }
  /** Receipts remain cold SQL records. They do not populate a process-wide cache. */
  async controlReceipt(
    scope: RequestScope,
    request: ControlRequest,
  ): Promise<ControlLease | undefined> {
    const prior = await this.db
      .prepare(
        'SELECT fingerprint,payload FROM auth_control_receipts WHERE world_id=? AND account_id=? AND request_id=?',
      )
      .get(scope.worldId, scope.accountId, request.id);
    if (!prior) return undefined;
    if (prior['fingerprint'] !== this.controlFingerprint(scope, request))
      throw new AuthorityError('conflict');
    return JSON.parse(String(prior['payload'])) as ControlLease;
  }
  /** One bounded read for the access console; it does not refresh the currency cache. */
  async listGrants(worldId: string, limit = 500): Promise<WorldGrant[]> {
    const rows = await this.db
      .prepare('SELECT * FROM auth_grants WHERE world_id=? ORDER BY account_id LIMIT ?')
      .all(worldId, limit);
    return rows.map((row) => ({
      worldId,
      accountId: String(row['account_id']),
      actorId: grantActor(row['actor_id']),
      revision: Number(row['revision']),
      capabilities: z.array(capabilitySchema).parse(JSON.parse(String(row['capabilities']))),
    }));
  }
  async worldGrants(worldId: string): Promise<WorldGrant[]> {
    const rows = await this.db
      .prepare('SELECT account_id FROM auth_grants WHERE world_id=?')
      .all(worldId);
    const grants: WorldGrant[] = [];
    for (const row of rows) {
      const grant = await this.grant(worldId, String(row['account_id']));
      if (grant) grants.push(grant);
    }
    return grants;
  }
  /** Historical human privacy is independent of the currently selected embodiment.
   * Rebinding never transfers another human's notes or makes an abandoned character an NPC.
   */
  async retainActorOwner(worldId: string, actorId: string, accountId: string): Promise<void> {
    const old = await this.db
      .prepare('SELECT account_id FROM auth_actor_owners WHERE world_id=? AND actor_id=?')
      .get(worldId, actorId);
    if (old && old['account_id'] !== accountId) throw new AuthorityError('forbidden');
    if (!old)
      await this.db
        .prepare('INSERT INTO auth_actor_owners VALUES (?,?,?)')
        .run(worldId, actorId, accountId);
  }
  /** Reapply current human ownership to a candidate before either gameplay or
   * operational installation; historical gameplay cannot restore revoked bindings. */
  async restoreBindings(world: WorldState): Promise<void> {
    for (const [actorId, accountId] of await this.actorOwners(world.id)) {
      const actor = world.entities[actorId]?.actor;
      if (actor) actor.controller = 'player';
      world.authorship.playerAccountIds[actorId] = accountId;
    }
    for (const grant of await this.worldGrants(world.id)) {
      if (!grant.actorId) continue;
      const actor = world.entities[grant.actorId]?.actor;
      if (!actor)
        throw new Error(
          'The save lacks a currently bound human character; authority cannot be restored from historical state.',
        );
      actor.controller = 'player';
      world.authorship.playerAccountIds[grant.actorId] = grant.accountId;
    }
  }
  async actorOwners(worldId: string): Promise<Map<string, string>> {
    const rows = await this.db
      .prepare('SELECT actor_id,account_id FROM auth_actor_owners WHERE world_id=?')
      .all(worldId);
    return new Map(rows.map((row) => [String(row['actor_id']), String(row['account_id'])]));
  }
  private bindingFingerprint(scope: RequestScope, request: BindingRequest): string {
    return hash(JSON.stringify({ request, timelineId: scope.timelineId }));
  }
  async bindingReceipt(scope: RequestScope, request: BindingRequest): Promise<boolean> {
    const row = await this.db
      .prepare(
        'SELECT fingerprint FROM auth_binding_receipts WHERE world_id=? AND issuer_id=? AND request_id=?',
      )
      .get(scope.worldId, scope.accountId, request.id);
    if (!row) return false;
    if (row['fingerprint'] !== this.bindingFingerprint(scope, request))
      throw new AuthorityError('conflict');
    return true;
  }
  async rebind(scope: RequestScope, request: BindingRequest, now: () => number): Promise<void> {
    await this.db.transaction(async () => {
      await this.assertFence({ scope, capability: 'manage-access', controlling: false, now });
      if (await this.bindingReceipt(scope, request)) return;
      const old = await this.grant(scope.worldId, request.accountId);
      if (
        !old?.actorId ||
        old.revision !== request.expectedRevision ||
        !Number.isSafeInteger(old.revision + 1) ||
        old.actorId === request.actorId
      )
        throw new AuthorityError('conflict');
      const previousActor = old.actorId;
      const occupied = await this.db
        .prepare('SELECT account_id FROM auth_grants WHERE world_id=? AND actor_id=?')
        .get(scope.worldId, request.actorId);
      if (occupied) throw new AuthorityError('forbidden');
      await this.retainActorOwner(scope.worldId, previousActor, old.accountId);
      await this.retainActorOwner(scope.worldId, request.actorId, old.accountId);
      for (const actorId of [previousActor, request.actorId]) {
        const previous = await this.control(scope.worldId, actorId);
        if (!Number.isSafeInteger(previous.generation + 1)) throw new AuthorityError('conflict');
        const value = {
          ...previous,
          generation: previous.generation + 1,
          accountId: old.accountId,
          sessionId: '',
          connectionId: '',
        };
        await this.db
          .prepare(
            'INSERT INTO auth_controls VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET generation=excluded.generation,account_id=excluded.account_id,session_id=excluded.session_id,connection_id=excluded.connection_id',
          )
          .run(scope.worldId, actorId, value.generation, old.accountId, '', '');
        await this.saveExit(scope.worldId, actorId, null);
        this.changed(() => this.controls.set(key(scope.worldId, actorId), value));
      }
      const grant = { ...old, actorId: request.actorId, revision: old.revision + 1 };
      await this.db
        .prepare(
          'UPDATE auth_grants SET actor_id=?,revision=? WHERE world_id=? AND account_id=? AND revision=?',
        )
        .run(grant.actorId, grant.revision, scope.worldId, grant.accountId, old.revision);
      const audit = { type: 'binding', before: old, after: grant };
      await this.db
        .prepare('INSERT INTO auth_binding_receipts VALUES (?,?,?,?,?)')
        .run(
          scope.worldId,
          scope.accountId,
          request.id,
          this.bindingFingerprint(scope, request),
          JSON.stringify(audit),
        );
      await this.audit(scope, grant.accountId, audit, now());
      this.changed(() => this.grants.set(key(scope.worldId, grant.accountId), grant));
    });
  }
  private async audit(
    scope: RequestScope,
    accountId: string,
    payload: unknown,
    now: number,
  ): Promise<void> {
    await this.recordAudit(scope.worldId, accountId, scope.accountId, payload, now);
  }
  /** Access audit for changes whose issuer is not the current request, such as redemption
   * of an invite issued earlier. */
  async recordAudit(
    worldId: string,
    accountId: string,
    issuerId: string,
    payload: unknown,
    now: number,
  ): Promise<void> {
    await this.db
      .prepare('INSERT INTO auth_access_audit VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), worldId, accountId, issuerId, now, JSON.stringify(payload));
  }
  async exitAttempts(worldId: string): Promise<ExitAttempt[]> {
    const rows = await this.db
      .prepare('SELECT payload FROM auth_exits WHERE world_id=?')
      .all(worldId);
    return rows.map((row) => JSON.parse(String(row['payload'])) as ExitAttempt);
  }
  async saveExit(worldId: string, actorId: string, attempt: ExitAttempt | null): Promise<void> {
    if (attempt)
      await this.db
        .prepare(
          'INSERT INTO auth_exits VALUES (?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET payload=excluded.payload',
        )
        .run(worldId, actorId, JSON.stringify(attempt));
    else
      await this.db
        .prepare('DELETE FROM auth_exits WHERE world_id=? AND actor_id=?')
        .run(worldId, actorId);
  }
  async setCapabilities(
    scope: RequestScope,
    accountId: string,
    expectedRevision: number,
    capabilities: Capability[],
    now: () => number,
  ): Promise<void> {
    await this.db.transaction(async () => {
      await this.assertFence({ scope, capability: 'manage-access', controlling: false, now });
      const old = await this.grant(scope.worldId, accountId);
      if (!old || old.revision !== expectedRevision || !Number.isSafeInteger(expectedRevision + 1))
        throw new AuthorityError('conflict');
      const grant = {
        ...old,
        revision: old.revision + 1,
        capabilities: [...new Set(capabilities)],
      };
      if (!grantCapabilitiesValid(grant.actorId, grant.capabilities))
        throw new AuthorityError('forbidden');
      const releasedActor =
        old.capabilities.includes('play') && !grant.capabilities.includes('play')
          ? old.actorId
          : undefined;
      if (releasedActor) {
        const control = await this.control(scope.worldId, releasedActor);
        if (!Number.isSafeInteger(control.generation + 1)) throw new AuthorityError('conflict');
        const released = {
          ...control,
          generation: control.generation + 1,
          sessionId: '',
          connectionId: '',
        };
        await this.db
          .prepare(
            'INSERT INTO auth_controls VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET generation=excluded.generation,account_id=excluded.account_id,session_id=excluded.session_id,connection_id=excluded.connection_id',
          )
          .run(scope.worldId, releasedActor, released.generation, old.accountId, '', '');
        this.changed(() => this.controls.set(key(scope.worldId, releasedActor), released));
      }
      await this.db
        .prepare(
          'UPDATE auth_grants SET revision=?,capabilities=? WHERE world_id=? AND account_id=? AND revision=?',
        )
        .run(
          grant.revision,
          JSON.stringify(grant.capabilities),
          scope.worldId,
          accountId,
          expectedRevision,
        );
      await this.audit(
        scope,
        accountId,
        { type: 'capabilities', before: old, after: grant },
        now(),
      );
      this.changed(() => this.grants.set(key(scope.worldId, accountId), grant));
    });
  }
}
