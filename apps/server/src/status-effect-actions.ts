import { canActivateStatusEffect, type Entity, type WorldState } from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

/** Author labels once; discovery and execution share target bindings and applicability. */
export function statusEffectActions(
  world: WorldState,
  source: Entity,
  target: Entity,
): Array<{ id: string; label: string; command: CommandInput }> {
  source = world.entities[source.id]!;
  target = world.entities[target.id]!;
  return world.statusEffectPolicy.definitions.flatMap((d) => {
    if (!d.actions || (source.id !== target.id && !d.actions.allowOther)) return [];
    const active = !!target.statusEffects?.[d.id]?.active;
    if (!active && source.id !== target.id && !d.actions.activateOther) return [];
    if (
      !active &&
      !canActivateStatusEffect(world, { subject: target, source, actionTarget: target }, d)
    )
      return [];
    return [
      {
        id: `${d.id}:${target.id}:${active ? 'deactivate' : 'activate'}`,
        label: `${active ? d.actions.deactivate : d.actions.activate}${source.id === target.id ? '' : ` · ${target.name}`}`,
        command: {
          type: 'status-effect',
          definitionId: d.id,
          targetId: target.id,
          effectOperation: active ? 'deactivate' : 'activate',
        },
      },
    ];
  });
}
