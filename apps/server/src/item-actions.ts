import { canHandleItems, portableItems, type WorldState, type Entity } from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
export function pickupActions(
  world: WorldState,
  actor: Entity,
  pile: Entity,
  preview: (command: CommandInput) => { ok: boolean; message: string },
) {
  if (pile.kind !== 'item-pile' || !canHandleItems(world, actor)) return [];
  const items = portableItems(world, pile.id);
  const one = items.map((item) => ({
    id: `pickup-${item.id}`,
    label:
      items.length === 1
        ? 'Pick Up'
        : `${world.itemDefinitions[item.definitionId]!.name} × ${item.quantity}`,
    description: `Pick up ${item.quantity} ${world.itemDefinitions[item.definitionId]!.name}`,
    command: { type: 'pickup' as const, targetId: pile.id, itemId: item.id } as CommandInput,
  }));
  const options =
    items.length > 1
      ? [
          {
            id: `pickup-all-${pile.id}`,
            label: 'Pick Up All',
            description: 'Pick up all portable contents',
            command: { type: 'pickup', targetId: pile.id } as CommandInput,
          },
          ...one,
        ]
      : one;
  if (!options.length) return [];
  // Every listed stack is portable in this snapshot. Preview shared body/path admission once,
  // not once per stack; actual execution still rechecks the selected IDs and quantities.
  // docs/worlds/base/items.md#pickup-and-drop
  const availability = preview(options[0]!.command);
  return options.map((option) => ({ ...option, availability }));
}
