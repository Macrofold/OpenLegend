import { z } from 'zod';
import type { Entity, WorldState } from '@open-legend/domain';
import type { OperationsView, WorldOverview } from '@open-legend/protocol';
import { AuthorityError, scopeKey, type Capability, type RequestScope } from './authority.js';
import type { AppConfig } from './config.js';
import {
  InviteError,
  inviteCapabilities,
  inviteRequestSchema,
  inviteStatus,
  inviteView,
  invitableCharacters,
  isInvitable,
  ownedActors,
  redeemInvite,
} from './invites.js';
import { MaintenanceError, type MaintenanceSchedule } from './maintenance.js';
import type { SqlGameRepository } from './store.js';
import { calendarFields } from './view.js';
import type { WorldService } from './world-service.js';

/** Routes a characterless operator/spectator session may reach. Every other route assumes an
 * embodied character and rejects such a session before dispatch; each listed route still
 * checks its own capability. docs/projects/multiplayer-entry-maintenance.md#decisions */
const CHARACTERLESS_ROUTES = new Set([
  'GET /api/operations',
  'GET /api/performance',
  'POST /api/access',
  'POST /api/access/binding',
  'POST /api/access/construction',
  'POST /api/saves/list',
  'POST /api/saves/create',
  'POST /api/saves/delete',
  'POST /api/saves/load',
  'POST /api/invites/create',
  'POST /api/invites/revoke',
  'POST /api/maintenance/schedule',
  'POST /api/maintenance/update',
  'POST /api/maintenance/cancel',
  'POST /api/maintenance/start',
  'POST /api/maintenance/ready',
]);
export const characterlessRoute = (method: string | undefined, path: string) =>
  CHARACTERLESS_ROUTES.has(`${method} ${path}`);
/** Ordinary gameplay mutations stop while maintenance holds the world. Creators keep the
 * existing paused-world editing; any job they start waits and is fenced at Ready. */
const MAINTENANCE_GAMEPLAY = new Set([
  '/api/command',
  '/api/action-attempt',
  '/api/commitment',
  '/api/conversation',
  '/api/knowledge',
  '/api/chat',
  '/api/chat/retry',
  '/api/invent',
  '/api/world-agent/messages',
  '/api/narration/regenerate',
]);

/** Bounded spectator payload; worlds above this report how many bodies were omitted.
 * docs/limits/multiplayer.md#mp17 */
const OVERVIEW_BODY_LIMIT = 2_000;
const CATEGORY: Record<Entity['kind'], WorldOverview['bodies'][number]['category']> = {
  player: 'person',
  npc: 'person',
  animal: 'animal',
  resource: 'resource',
  campfire: 'fire',
  'practice-target': 'object',
  remains: 'object',
  'item-pile': 'object',
  item: 'object',
  assembly: 'object',
};
const tenth = (value: number) => Math.round(value * 10) / 10;

/** Physical appearance only: no names, IDs, human/NPC distinction, possessions or speech.
 * Sorting removes entity-creation order, which would otherwise identify original players.
 * Departed humans are absent here exactly as they are for in-world witnesses. */
export function worldOverview(world: WorldState): WorldOverview {
  const bodies: WorldOverview['bodies'] = [];
  let omitted = 0;
  for (const entity of Object.values(world.entities)) {
    if (
      entity.placement?.mode !== 'world' ||
      entity.retirement ||
      entity.actor?.participation?.phase === 'inactive'
    )
      continue;
    if (bodies.length >= OVERVIEW_BODY_LIMIT) {
      omitted++;
      continue;
    }
    const { x, z } = entity.placement.position;
    bodies.push({ category: CATEGORY[entity.kind], x: tenth(x), z: tenth(z) });
  }
  bodies.sort((a, b) => a.category.localeCompare(b.category) || a.x - b.x || a.z - b.z);
  return {
    map: { width: world.map.width, height: world.map.height, tiles: world.map.tiles },
    bodies,
    omitted,
  };
}

/** Operator/spectator console surface. Registered from http.ts; embodied accounts may also
 * open it, but every section is gated by the scope's current capabilities. */
export class OperationsRoutes {
  private overview?: { version: number; value: WorldOverview };
  constructor(
    private readonly service: WorldService,
    private readonly store: SqlGameRepository,
    private readonly maintenance: MaintenanceSchedule,
    private readonly config: AppConfig,
    private readonly now: () => number,
  ) {}
  /** Rejection message while maintenance holds the world, or undefined to continue. */
  maintenanceBlock(path: string, scope: RequestScope): string | undefined {
    if (!this.service.maintenanceActive) return undefined;
    // Only Ready resumes; pause and speed controls would suggest otherwise.
    if (path === '/api/control')
      return 'The world is paused for maintenance until a creator marks it ready.';
    if (MAINTENANCE_GAMEPLAY.has(path) && !this.service.currentScope(scope, 'create'))
      return 'The world is paused for maintenance. Ordinary actions resume when it is ready.';
    return undefined;
  }
  /** Current capabilities of this exact scope, or a stale-scope rejection. */
  capabilities(scope: RequestScope): readonly Capability[] {
    const capabilities =
      scope.worldId === this.service.world.id && scope.timelineId === this.service.timelineId
        ? this.service.store.authority?.currentCapabilities(scope, this.now())
        : undefined;
    if (!capabilities?.length) throw new AuthorityError('stale-scope');
    return capabilities;
  }
  async state(scope: RequestScope): Promise<OperationsView> {
    const capabilities = this.capabilities(scope);
    const world = this.service.world;
    const view: OperationsView = {
      ok: true,
      worldId: world.id,
      accountId: scope.accountId,
      capabilities: [...capabilities],
      ...(scope.actorId ? { actorId: scope.actorId } : {}),
      scope: scopeKey(scope),
      generation: this.service.generation,
      mode: this.config.authentication.mode,
      clock: {
        ...calendarFields(world),
        speed: this.service.speed,
        paused: this.service.paused,
        pauseReason: this.service.pauseReason,
      },
      maintenance: this.service.maintenanceNotice,
    };
    if (capabilities.includes('spectate')) {
      if (this.overview?.version !== this.service.version)
        this.overview = { version: this.service.version, value: worldOverview(world) };
      view.overview = this.overview.value;
    }
    if (capabilities.includes('manage-access')) {
      const worldId = world.id;
      const grants = await this.store.authority.listGrants(worldId);
      const invites = await this.store.invites.list(worldId);
      const owned = await ownedActors(this.store, worldId, grants);
      const labels = new Map(
        invites.flatMap((invite) => (invite.accountId ? [[invite.accountId, invite.label]] : [])),
      );
      const now = this.now();
      view.access = {
        grants: grants.map((grant) => ({
          accountId: grant.accountId,
          ...(grant.actorId ? { actorId: grant.actorId } : {}),
          capabilities: grant.capabilities,
          revision: grant.revision,
          ...(labels.has(grant.accountId) ? { label: labels.get(grant.accountId) } : {}),
          self: grant.accountId === scope.accountId,
        })),
        invites: invites.map((invite) => inviteView(invite, now)),
        candidates: invitableCharacters(this.service.world, owned),
      };
    }
    if (capabilities.includes('create')) view.maintenanceHistory = this.maintenance.history();
    // Access may have changed during any awaited section; never return a stale audience's data.
    this.capabilities(scope);
    return view;
  }
  /** POST routes owned here; each checks its own capability inside the writer lane. */
  owns(path: string): boolean {
    return path.startsWith('/api/invites/') || path.startsWith('/api/maintenance/');
  }
  async post(
    path: string,
    scope: RequestScope,
    body: unknown,
  ): Promise<{ status: number; value: unknown }> {
    try {
      if (path === '/api/invites/create') return await this.createInvite(scope, body);
      if (path === '/api/invites/revoke') return await this.revokeInvite(scope, body);
      const maintenance = {
        '/api/maintenance/schedule': () => this.maintenance.schedule(scope, body),
        '/api/maintenance/update': () => this.maintenance.update(scope, body),
        '/api/maintenance/cancel': () => this.maintenance.cancel(scope, body),
        '/api/maintenance/start': () => this.maintenance.start(scope, body),
        '/api/maintenance/ready': () => this.maintenance.ready(scope, body),
      }[path];
      if (maintenance)
        return {
          status: 200,
          value: { ok: true, message: 'Maintenance updated.', maintenance: await maintenance() },
        };
      return { status: 404, value: { ok: false, code: 'route', message: 'Unknown API route.' } };
    } catch (error) {
      if (error instanceof InviteError)
        return { status: 409, value: { ok: false, code: 'invite', message: error.message } };
      if (error instanceof MaintenanceError)
        return {
          status: 409,
          value: { ok: false, code: error.code, message: error.message, field: error.field },
        };
      throw error;
    }
  }
  private async createInvite(scope: RequestScope, body: unknown) {
    const request = inviteRequestSchema.parse(body);
    if (this.config.authentication.mode !== 'oidc')
      throw new InviteError('Invites need OIDC sign-in; local mode has a single player.');
    return this.service.authorized(scope, 'manage-access', false, async () => {
      const capabilities = inviteCapabilities(request, this.capabilities(scope));
      if (
        request.actorId &&
        !isInvitable(
          this.service.world,
          request.actorId,
          await ownedActors(this.store, scope.worldId),
        )
      )
        throw new InviteError('That character cannot be offered to a new player.');
      const now = this.now();
      const { invite, token } = await this.store.invites.create(scope, request, capabilities, now);
      return {
        status: 200,
        value: {
          ok: true,
          message: 'Invite created. Copy the link now; it is shown only once.',
          invite: inviteView(invite, now),
          link: `${this.config.authentication.origin}/auth/invite?token=${token}`,
        },
      };
    });
  }
  private async revokeInvite(scope: RequestScope, body: unknown) {
    const { id } = z.object({ id: z.string().uuid() }).strict().parse(body);
    return this.service.authorized(scope, 'manage-access', false, async () => {
      const invite = await this.store.invites.byId(scope.worldId, id);
      if (!invite) throw new InviteError('That invite does not exist.');
      const status = inviteStatus(invite, this.now());
      if (status === 'redeemed')
        throw new InviteError('Already used. Remove that account’s access instead.');
      if (status !== 'pending')
        return { status: 200, value: { ok: true, message: `That invite is already ${status}.` } };
      await this.store.invites.save({
        ...invite,
        revokedAt: this.now(),
        revokedBy: scope.accountId,
      });
      return { status: 200, value: { ok: true, message: 'Invite revoked.' } };
    });
  }
  /** `/auth/invite`: remember a usable token for the OIDC round trip, or explain why not. */
  async inviteLanding(token: string): Promise<{ usable: boolean; location: string }> {
    const invite =
      this.config.authentication.mode === 'oidc'
        ? await this.store.invites.byToken(token)
        : undefined;
    const usable =
      !!invite &&
      invite.worldId === this.service.world.id &&
      inviteStatus(invite, this.now()) === 'pending';
    return { usable, location: usable ? '/auth/login' : '/?entry=invite-unavailable' };
  }
  /** Completes a remembered invite after verified sign-in; returns the landing location. */
  async completeInvite(token: string, accountId: string): Promise<string> {
    try {
      const outcome = await redeemInvite(this.service, this.store, token, accountId, this.now);
      return `/?entry=${outcome.ok ? 'invite-accepted' : outcome.code}${outcome.ok && outcome.role !== 'player' ? '&view=operations' : ''}`;
    } catch (error) {
      console.error(
        'Invite redemption failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
      return '/?entry=storage';
    }
  }
}
