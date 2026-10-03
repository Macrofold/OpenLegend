import type { EntityView, GameView } from '@open-legend/protocol';

/** Adapt the separately projected player to the same presentation contract as other things. */
export function playerEntity(view: GameView): EntityView {
  return {
    id: view.player.id,
    name: view.player.name,
    kind: 'actor',
    statusEffects: view.player.statusEffects,
    subtype: 'player',
    position: view.player.position,
    supportSurfaceId: view.player.supportSurfaceId,
    heading: view.player.heading,
    appearance: view.player.appearance ?? 'sprite',
    radius: 0.35,
    status: !view.player.alive
      ? 'Dead'
      : view.player.statusEffects?.length
        ? view.player.statusEffects.map((d) => d.label).join(', ')
        : (view.player.action?.label ?? 'In the wild'),
    attributes: view.player.attributes,
    actionAnimation: view.player.actionAnimation,
    description: view.player.history,
    traits: view.player.traits,
    actions: view.player.actions,
  };
}
