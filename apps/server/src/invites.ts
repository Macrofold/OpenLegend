import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { InviteView } from '@open-legend/protocol';
import {
  AuthorityError,
  actorIdSchema,
  capabilitySchema,
  type Capability,
  type RequestScope,
  type WorldGrant,
} from './authority.js';
import type { WorldState } from '@open-legend/domain';
import type { SqlDatabase, SqlGameRepository } from './store.js';
import type { WorldService } from './world-service.js';

/** Operational invite bounds; docs/limits/multiplayer.md#mp15. */
export const INVITE_LIMITS = { minHours: 1, maxHours: 720, defaultHours: 168, pending: 100 };
const OPERATOR_CAPABILITIES: readonly Capability[] = [
  'spectate',
  'inspect',
  'save',
  'manage-access',
  'create',
];
const roleSchema = z.enum(['player', 'spectator', 'operator']);
const recordSchema = z
  .object({
    id: z.string().uuid(),
    worldId: z.string().min(1),
    role: roleSchema,
    capabilities: z.array(capabilitySchema).min(1).max(6),
    actorId: actorIdSchema.optional(),
    label: z.string().min(1).max(80),
    createdBy: z.string().min(1),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
    revokedAt: z.number().int().nonnegative().optional(),
    revokedBy: z.string().min(1).optional(),
    redeemedAt: z.number().int().nonnegative().optional(),
    accountId: z.string().min(1).optional(),
  })
  .strict();
export type InviteRecord = z.infer<typeof recordSchema>;
export const inviteRequestSchema = z
  .object({
    id: z.string().uuid(),
    role: roleSchema,
    actorId: actorIdSchema.optional(),
    capabilities: z.array(capabilitySchema).max(6).optional(),
    label: z.string().trim().min(1).max(80),
    expiresInHours: z
      .number()
      .int()
      .min(INVITE_LIMITS.minHours)
      .max(INVITE_LIMITS.maxHours)
      .default(INVITE_LIMITS.defaultHours),
  })
  .strict();
export type InviteRequest = z.infer<typeof inviteRequestSchema>;
export const inviteTokenPattern = /^[a-f0-9]{64}$/;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export function inviteStatus(invite: InviteRecord, now: number): InviteView['status'] {
  if (invite.redeemedAt !== undefined) return 'redeemed';
  if (invite.revokedAt !== undefined) return 'revoked';
  return invite.expiresAt <= now ? 'expired' : 'pending';
}
export function inviteView(invite: InviteRecord, now: number): InviteView {
  return {
    id: invite.id,
    role: invite.role,
    capabilities: invite.capabilities,
    ...(invite.actorId ? { actorId: invite.actorId } : {}),
    label: invite.label,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    status: inviteStatus(invite, now),
    ...(invite.redeemedAt !== undefined ? { redeemedAt: invite.redeemedAt } : {}),
    ...(invite.accountId ? { accountId: invite.accountId } : {}),
  };
}

/** Capabilities an invite grants. Issuers delegate only what they currently hold, and a
 * characterless grant never plays. docs/projects/multiplayer-entry-maintenance.md#decisions */
export function inviteCapabilities(
  request: InviteRequest,
  issuer: readonly Capability[],
): Capability[] {
  const requested =
    request.role === 'player'
      ? (['play'] as Capability[])
      : request.role === 'spectator'
        ? (['spectate'] as Capability[])
        : [...new Set(request.capabilities ?? [])];
  if (
    (request.role === 'player') !== !!request.actorId ||
    (request.role !== 'operator' && request.capabilities?.length) ||
    !requested.length ||
    (request.role === 'operator' &&
      requested.some((capability) => !OPERATOR_CAPABILITIES.includes(capability))) ||
    requested.some((capability) => capability !== 'play' && !issuer.includes(capability))
  )
    throw new AuthorityError('forbidden');
  return requested;
}

/** Scoped, expiring, single-use invite links. Only a token hash is stored; the plaintext
 * token is returned once to the issuer. Records are operational and never rewind with a
 * gameplay save. Callers serialize mutations through the world writer. */
export class InviteRepository {
  constructor(private readonly db: SqlDatabase) {}
  async initialize(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_invites (id TEXT PRIMARY KEY, world_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, closed BOOLEAN NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS auth_invites_world ON auth_invites(world_id, created_at);
      CREATE INDEX IF NOT EXISTS auth_invites_open ON auth_invites(world_id, closed, expires_at);
    `);
  }
  private parse(row: Record<string, unknown>): InviteRecord {
    return recordSchema.parse(JSON.parse(String(row['payload'])));
  }
  private parseOptional(row: Record<string, unknown> | undefined): InviteRecord | undefined {
    return row && this.parse(row);
  }
  /** Newest first, bounded for the console; admission uses {@link pending}. */
  async list(worldId: string, limit = 200): Promise<InviteRecord[]> {
    const rows = await this.db
      .prepare(
        'SELECT payload FROM auth_invites WHERE world_id=? ORDER BY created_at DESC, id DESC LIMIT ?',
      )
      .all(worldId, limit);
    return rows.map((row) => this.parse(row));
  }
  /** Every unexpired invite that is neither redeemed nor revoked (at most the pending limit). */
  async pending(worldId: string, now: number): Promise<InviteRecord[]> {
    const rows = await this.db
      .prepare('SELECT payload FROM auth_invites WHERE world_id=? AND closed=? AND expires_at>?')
      .all(worldId, false, now);
    return rows.map((row) => this.parse(row));
  }
  async byId(worldId: string, id: string): Promise<InviteRecord | undefined> {
    return this.parseOptional(
      await this.db
        .prepare('SELECT payload FROM auth_invites WHERE world_id=? AND id=?')
        .get(worldId, id),
    );
  }
  async byToken(token: string): Promise<InviteRecord | undefined> {
    if (!inviteTokenPattern.test(token)) return undefined;
    return this.parseOptional(
      await this.db
        .prepare('SELECT payload FROM auth_invites WHERE token_hash=?')
        .get(tokenHash(token)),
    );
  }
  async create(
    scope: RequestScope,
    request: InviteRequest,
    capabilities: Capability[],
    now: number,
  ): Promise<{ invite: InviteRecord; token: string }> {
    if (await this.byId(scope.worldId, request.id)) throw new AuthorityError('conflict');
    const pending = await this.pending(scope.worldId, now);
    if (pending.length >= INVITE_LIMITS.pending)
      throw new InviteError('Too many pending invites. Revoke unused invites first.');
    if (request.actorId && pending.some((invite) => invite.actorId === request.actorId))
      throw new InviteError('That character already has a pending invite.');
    const token = randomBytes(32).toString('hex');
    const invite: InviteRecord = {
      id: request.id,
      worldId: scope.worldId,
      role: request.role,
      capabilities,
      ...(request.actorId ? { actorId: request.actorId } : {}),
      label: request.label,
      createdBy: scope.accountId,
      createdAt: now,
      expiresAt: now + request.expiresInHours * 3_600_000,
    };
    await this.db
      .prepare('INSERT INTO auth_invites VALUES (?,?,?,?,?,?,?)')
      .run(
        invite.id,
        invite.worldId,
        tokenHash(token),
        invite.createdAt,
        invite.expiresAt,
        false,
        JSON.stringify(invite),
      );
    return { invite, token };
  }
  async save(invite: InviteRecord): Promise<void> {
    await this.db
      .prepare('UPDATE auth_invites SET closed=?,payload=? WHERE world_id=? AND id=?')
      .run(
        invite.redeemedAt !== undefined || invite.revokedAt !== undefined,
        JSON.stringify(recordSchema.parse(invite)),
        invite.worldId,
        invite.id,
      );
  }
}
export class InviteError extends Error {}

/** Characters with a current grant or a historical human owner are never offered again;
 * transferring a human's private history needs consent rules (docs/limits/multiplayer.md#mp06). */
export async function ownedActors(
  store: SqlGameRepository,
  worldId: string,
  grants?: readonly WorldGrant[],
): Promise<Set<string>> {
  const owned = new Set((await store.authority.actorOwners(worldId)).keys());
  for (const grant of grants ?? (await store.authority.listGrants(worldId)))
    if (grant.actorId) owned.add(grant.actorId);
  return owned;
}
export function isInvitable(world: WorldState, actorId: string, owned: ReadonlySet<string>) {
  const entity = world.entities[actorId];
  return (
    !!entity?.actor?.alive &&
    (entity.kind === 'npc' || entity.kind === 'player') &&
    !entity.retirement &&
    entity.actor.controller !== 'player' &&
    !world.authorship.playerAccountIds[actorId] &&
    !owned.has(actorId)
  );
}
export function invitableCharacters(world: WorldState, owned: ReadonlySet<string>) {
  return Object.values(world.entities)
    .filter((entity) => isInvitable(world, entity.id, owned))
    .map((entity) => ({ actorId: entity.id, name: entity.name }));
}

export type RedeemOutcome =
  | { ok: true; role: InviteRecord['role'] }
  | {
      ok: false;
      code: 'invite-unavailable' | 'already-member' | 'character-unavailable' | 'storage';
    };
/** Redeem after verified OIDC sign-in. Validation and all writes run in the world writer
 * lane; a player invite binds its character in the same commit as the invite and grant. */
export async function redeemInvite(
  service: WorldService,
  store: SqlGameRepository,
  token: string,
  accountId: string,
  now: () => number,
): Promise<RedeemOutcome> {
  return service.authenticationMutation(async () => {
    const invite = await store.invites.byToken(token);
    if (!invite || invite.worldId !== service.world.id || inviteStatus(invite, now()) !== 'pending')
      return { ok: false, code: 'invite-unavailable' };
    if (await store.authority.grant(invite.worldId, accountId))
      return { ok: false, code: 'already-member' };
    const at = now();
    const persist = async () => {
      await store.invites.save({ ...invite, redeemedAt: at, accountId });
      await store.authority.insertGrant({
        worldId: invite.worldId,
        accountId,
        ...(invite.actorId ? { actorId: invite.actorId } : {}),
        revision: 1,
        capabilities: invite.capabilities,
      });
      await store.authority.recordAudit(
        invite.worldId,
        accountId,
        invite.createdBy,
        { type: 'invite', inviteId: invite.id, role: invite.role, after: invite.capabilities },
        at,
      );
    };
    if (!invite.actorId) {
      await store.db.transaction(persist);
      return { ok: true, role: invite.role };
    }
    if (!isInvitable(service.world, invite.actorId, await ownedActors(store, invite.worldId)))
      return { ok: false, code: 'character-unavailable' };
    const result = await service.enrollCharacter(invite.actorId, accountId, persist);
    return result.ok
      ? { ok: true, role: invite.role }
      : { ok: false, code: result.code === 'storage' ? 'storage' : 'character-unavailable' };
  });
}
