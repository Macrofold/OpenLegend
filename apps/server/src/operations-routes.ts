import type { Entity, WorldState } from '@open-legend/domain';
import type { OperationsView, WorldOverview } from '@open-legend/protocol';
import { AuthorityError, scopeKey, type Capability, type RequestScope } from './authority.js';
import type { AppConfig } from './config.js';
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
  'POST /api/saves/list',
  'POST /api/saves/create',
  'POST /api/saves/delete',
  'POST /api/saves/load',
]);
export const characterlessRoute = (method: string | undefined, path: string) =>
  CHARACTERLESS_ROUTES.has(`${method} ${path}`);

/** Bounded spectator payload; worlds above this report how many bodies were omitted. */
const OVERVIEW_BODY_LIMIT = 2_000;
const CATEGORY: Record<Entity['kind'], WorldOverview['bodies'][number]['category']> = {
  player: 'person',
  npc: 'person',
  animal: 'animal',
  resource: 'resource',
  campfire: 'fire',
  remains: 'object',
  'item-pile': 'object',
  item: 'object',
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
    private readonly config: AppConfig,
    private readonly now: () => number,
  ) {}
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
    // Access may have changed during any awaited section; never return a stale audience's data.
    this.capabilities(scope);
    return view;
  }
}
