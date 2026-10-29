import type { EntityView, GameView } from '@open-legend/protocol';

type InventoryEntity = Pick<EntityView, 'id' | 'name' | 'kind' | 'storage' | 'trade' | 'portrait'> &
  Partial<Pick<EntityView, 'position' | 'supportSurfaceId'>>;
type InventoryPlayer = Pick<
  GameView['player'],
  | 'id'
  | 'name'
  | 'portrait'
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
  | 'worldId'
  | 'saveTimeline'
  | 'access'
  | 'commandEpoch'
  | 'godMode'
  | 'recipes'
  | 'conversation'
  | 'historyEpoch'
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
        portrait: entity.portrait,
        // Open roots and selected trade readers recheck physical availability.
        // A closed trade reader performs no work from these compact pose fields.
        position: entity.storage || entity.trade ? entity.position : undefined,
        supportSurfaceId: entity.storage || entity.trade ? entity.supportSurfaceId : undefined,
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
      portrait: view.player.portrait,
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
      conversation: view.conversation,
      historyEpoch: view.historyEpoch,
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
