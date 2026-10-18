import type { EntityView, GameView } from '@open-legend/protocol';

type InventoryEntity = Pick<EntityView, 'id' | 'name' | 'kind' | 'storage' | 'trade'> &
  Partial<Pick<EntityView, 'position' | 'supportSurfaceId'>>;
type InventoryPlayer = Pick<
  GameView['player'],
  | 'id'
  | 'name'
  | 'inventory'
  | 'inventoryRevision'
  | 'canUseInventory'
  | 'alive'
  | 'participation'
  | 'statusEffects'
  | 'position'
  | 'supportSurfaceId'
> & { action: boolean };
/** The complete facts this connected panel reads. Adding a new display dependency
 * requires adding it here, rather than accidentally receiving an old full view. */
export type InventoryPresentation = Pick<
  GameView,
  'worldId' | 'saveTimeline' | 'access' | 'commandEpoch' | 'godMode' | 'recipes'
> & {
  clock: Pick<GameView['clock'], 'paused'>;
  map: { spatial: Pick<GameView['map']['spatial'], 'revision'> };
  player: InventoryPlayer;
  entities: InventoryEntity[];
};
function reuse<T extends object>(next: T, previous?: T): T {
  return previous &&
    Object.keys(next).every((key) => next[key as keyof T] === previous[key as keyof T])
    ? previous
    : next;
}
export function inventoryPresentation(
  view: GameView,
  previous?: InventoryPresentation,
): InventoryPresentation {
  const before = new Map(previous?.entities.map((entity) => [entity.id, entity]));
  let entities = view.entities.map((entity) =>
    reuse<InventoryEntity>(
      {
        id: entity.id,
        name: entity.name,
        kind: entity.kind,
        storage: entity.storage,
        trade: entity.trade,
        // World-container movement invalidates an open root. Other people's poses
        // are neither displayed nor used to select recipients; those reads are scoped.
        position: entity.storage ? entity.position : undefined,
        supportSurfaceId: entity.storage ? entity.supportSurfaceId : undefined,
      },
      before.get(entity.id),
    ),
  );
  if (
    previous &&
    entities.length === previous.entities.length &&
    entities.every((entity, index) => entity === previous.entities[index])
  )
    entities = previous.entities;
  const player = reuse<InventoryPlayer>(
    {
      id: view.player.id,
      name: view.player.name,
      inventory: view.player.inventory,
      inventoryRevision: view.player.inventoryRevision,
      canUseInventory: view.player.canUseInventory,
      alive: view.player.alive,
      participation: view.player.participation,
      statusEffects: view.player.statusEffects,
      position: view.player.position,
      supportSurfaceId: view.player.supportSurfaceId,
      action: !!view.player.action,
    },
    previous?.player,
  );
  const clock = reuse({ paused: view.clock.paused }, previous?.clock);
  const spatial = reuse({ revision: view.map.spatial.revision }, previous?.map.spatial);
  const map = previous?.map.spatial === spatial ? previous.map : { spatial };
  return reuse(
    {
      worldId: view.worldId,
      saveTimeline: view.saveTimeline,
      access: view.access,
      commandEpoch: view.commandEpoch,
      godMode: view.godMode,
      recipes: view.recipes,
      clock,
      map,
      player,
      entities,
    },
    previous,
  );
}
