import bundle from './config/first-playable.generated.json' with { type: 'json' };
import type { GroundedPanelFamily } from '../../boundary-types.js';
import type { AttributeDefinition } from '../../world-modules.js';
import type { WorldState } from '../../types.js';
import { definitionPin } from '../../world-modules.js';
import { validateBoundaryFamily } from '../../boundary-validation.js';

/** Construction YAML owns content; only exact installed definitions enter a game. */
export interface BaseBoundaryConfiguration {
  attributes: AttributeDefinition[];
  family: Omit<
    GroundedPanelFamily,
    'roles' | 'postTools' | 'integrity' | 'repair' | 'salvage' | 'damage'
  > & {
    roles: Record<keyof GroundedPanelFamily['roles'], string>;
    postTools: string[];
    integrity: Record<keyof GroundedPanelFamily['integrity'], string>;
    repair: Omit<GroundedPanelFamily['repair'], 'input' | 'toolDefinitions'> & {
      input: string;
      toolDefinitions: string[];
    };
    damage?: Omit<NonNullable<GroundedPanelFamily['damage']>, 'tools'> & {
      tools: Array<
        Omit<NonNullable<GroundedPanelFamily['damage']>['tools'][number], 'definition'> & {
          definition: string;
        }
      >;
    };
    salvage: Omit<GroundedPanelFamily['salvage'], 'outputs'> & {
      outputs: Record<
        keyof GroundedPanelFamily['integrity'],
        Array<{
          port: string;
          definition: string;
          quantity: number;
        }>
      >;
    };
  };
}
// The generator validates the explicit source candidate before writing this artifact.
export const BASE_BOUNDARY_CONFIGURATION = bundle.boundary as BaseBoundaryConfiguration;

export function installBaseBoundary(
  world: WorldState,
  source: BaseBoundaryConfiguration,
): GroundedPanelFamily {
  const item = (id: string) => {
    const definition = world.itemDefinitions[id];
    if (!definition) throw new Error('An authored camp reference needs an installed item.');
    return definitionPin(definition);
  };
  const attribute = (id: string) => {
    const definition = world.moduleManifest.definitions.find((entry) => entry.id === id);
    if (!definition) throw new Error('An authored camp reference needs an installed attribute.');
    return definitionPin(definition);
  };
  const authored = source.family;
  const { damage, ...core } = authored;
  const outputs = (role: keyof GroundedPanelFamily['integrity']) =>
    authored.salvage.outputs[role].map((output) => ({
      ...output,
      definition: item(output.definition),
    }));
  const family: GroundedPanelFamily = {
    ...structuredClone(core),
    roles: {
      post: item(authored.roles.post),
      gatePost: item(authored.roles.gatePost),
      panel: item(authored.roles.panel),
      parkingPanel: item(authored.roles.parkingPanel),
      gate: item(authored.roles.gate),
      rail: item(authored.roles.rail),
      binding: item(authored.roles.binding),
    },
    postTools: authored.postTools.map(item),
    ...(damage
      ? {
          damage: {
            ...damage,
            tools: damage.tools.map((profile) => ({
              ...profile,
              definition: item(profile.definition),
            })),
          },
        }
      : {}),
    integrity: {
      post: attribute(authored.integrity.post),
      panel: attribute(authored.integrity.panel),
      gate: attribute(authored.integrity.gate),
      rail: attribute(authored.integrity.rail),
    },
    repair: {
      ...authored.repair,
      input: item(authored.repair.input),
      toolDefinitions: authored.repair.toolDefinitions.map(item),
    },
    salvage: {
      ...authored.salvage,
      outputs: {
        post: outputs('post'),
        panel: outputs('panel'),
        gate: outputs('gate'),
        rail: outputs('rail'),
      },
    },
  };
  validateBoundaryFamily(world, family.id, family);
  world.assemblyFamilies![family.id] = family;
  return family;
}
