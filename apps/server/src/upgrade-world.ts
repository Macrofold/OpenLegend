import { validateWorldModules, type WorldState } from '@open-legend/domain';

/** Current-format restoration validates installed meaning; it never reconstructs missing rules.
 * AGENTS.md#development-save-policy
 */
export function validateCurrentWorldState(world: WorldState): void {
  if (
    !world.moduleManifest ||
    !world.statusEffectPolicy ||
    !world.cognitionPolicy ||
    !Object.hasOwn(world.cognitionPolicy, 'dream') ||
    !world.experience ||
    !world.innerWorlds
  )
    throw new Error('Incompatible development world. Existing data was not converted or replaced.');
  validateWorldModules(world);
}
