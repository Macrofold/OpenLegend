import {
  stateOwnerCapabilities,
  appraisalPin,
  WORK_LIMITS,
  type WorldState,
} from '@open-legend/domain';
import { MAX_CONTAINMENT_DEPTH, ITEM_COUNT_PIN } from '@open-legend/domain';

/** Creator discovery describes admitted native ports, never instance/private state.
 * INV candidates still pass their existing finite family schema and exact admission;
 * these interfaces do not expand generated recipes or grant mutation authority. */
export function foundationCapabilities(world: WorldState) {
  return {
    states: stateOwnerCapabilities(world),
    contributions: world.statusEffectPolicy.definitions.flatMap((definition) =>
      definition.enabled && definition.contribution
        ? [
            {
              id: definition.id,
              label: definition.label,
              policyRevision: world.statusEffectPolicy.revision,
              lifetime: definition.contribution,
              operations: ['attach', 'refresh', 'end'],
              removal: 'Ends only this cause; never restores old stock or body values.',
            },
          ]
        : [],
    ),
    objects: {
      unit: ITEM_COUNT_PIN,
      placement: ['world', 'contained', 'attached-equipment'],
      operations: [
        'pickup',
        'drop',
        'split-item',
        'merge-item',
        'transfer-item',
        'equip',
        'unequip',
      ],
      maximumContainmentDepth: MAX_CONTAINMENT_DEPTH,
      packing: 'Exact authored packing units and finite capacity; unknown compatibility rejects.',
      identity:
        'Whole moves preserve identity; split creates a new identity; merge and consumption retain non-actionable history.',
      access:
        'Current custody and access are separate from declared ownership; hidden contents are not discoverable.',
      retirement: 'Nonempty containers and unsupported active references reject removal.',
    },
    appraisals: (world.moduleManifest.appraisals?.definitions ?? []).map((definition) => ({
      pin: appraisalPin(definition),
      label: definition.label,
      causes: definition.causes,
      value: definition.value,
      lifetime: definition.lifetime,
      reflection: definition.reflection,
    })),
    work: {
      version: WORK_LIMITS.version,
      invocation: WORK_LIMITS.group,
      actor: WORK_LIMITS.actor,
      installedModule: WORK_LIMITS.module,
      world: WORK_LIMITS.world,
      recurrence:
        'Positive simulation time, finite burst and retained allocation; descendants share root allowance.',
    },
    authoring:
      'These are supported native interfaces, not additional generated recipe fields. Use the existing finite invention contract; unsupported families require an admitted implementation.',
  };
}
