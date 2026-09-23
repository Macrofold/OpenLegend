import type { EntityView, GameView } from '@open-legend/protocol';

/** Adapt the separately projected player to the same presentation contract as other things. */
export function playerEntity(view: GameView): EntityView {
  return {
    id: view.player.id,
    name: view.player.name,
    kind: 'actor',
    subtype: 'player',
    position: view.player.position,
    supportSurfaceId: view.player.supportSurfaceId,
    heading: view.player.heading,
    appearance: 'sprite',
    radius: 0.35,
    status: view.player.alive ? (view.player.action?.label ?? 'In the wild') : 'Dead',
    health: view.player.health,
    description: view.player.history,
    traits: view.player.traits,
    actions: view.player.actions,
  };
}
