/** Bundled-world intent and eligible methods, not a hunger-to-action policy.
 * docs/worlds/base/survival.md#embodied-survival-and-authored-start
 */
export const BASE_HUNTING = {
  label: 'Hunt',
  purpose: 'for meat',
  scope: 'One attack.',
  knownPrey: ['hare', 'deer', 'bird'] as readonly string[],
  methods: { melee: true, launcher: true, unarmed: true },
  unarmedTool: 'bare hands',
};

export function huntingDescription(
  species: string | undefined,
  method: keyof typeof BASE_HUNTING.methods,
  target: string,
  tool?: string,
): string | undefined {
  if (!species || !BASE_HUNTING.knownPrey.includes(species) || !BASE_HUNTING.methods[method])
    return;
  return `${BASE_HUNTING.label} ${target} with ${tool ?? BASE_HUNTING.unarmedTool} ${BASE_HUNTING.purpose}. ${BASE_HUNTING.scope}`;
}
