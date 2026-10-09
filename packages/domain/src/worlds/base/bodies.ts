import { initializeAttributes } from '../../world-modules.js';
import { namePhrase } from '@open-legend/language';
import type { AttributeDefinition } from '../../world-modules.js';
import { seedAgency } from '../../agency.js';
import type { ActorComponent } from '../../types.js';
import type { Entity, ItemDefinition } from '../../types.js';
import type { LivingBody } from '../../living.js';
import { BASE_EQUIPMENT_PORTS } from './equipment.js';

// Authored starting anatomy and animal capabilities; lifecycle integrity remains generic.
// docs/worlds/base/survival.md
/** The bundled world's species; typed requests and bodies read this one list. */
export const BASE_SPECIES = ['human', 'deer', 'hare', 'construct', 'bird', 'wolf', 'bear'] as const;
export function describeBodyRemains(
  entity: Entity,
  definitions: Record<string, ItemDefinition>,
): string | undefined {
  const remains = entity.remains;
  if (!remains) return;
  const subject = namePhrase(entity, 'definite');
  if (remains.phase === 'rotting')
    return `The remains of ${subject} are rotting.${entity.actor?.body?.harvestYield.length ? ' Fresh materials can no longer be harvested.' : ''}`;
  if (remains.phase === 'removed') return `The body of ${subject} has decomposed.`;
  if (remains.harvested) return `The remains of ${subject} have been harvested.`;
  if (!remains.yields.length) return `The body of ${subject} lies here.`;
  return `The remains of ${subject} can be harvested for ${remains.yields.map((y) => `${y.quantity} ${definitions[y.definitionId]?.name ?? 'materials'}`).join(', ')}.`;
}
export function livingBody(species: (typeof BASE_SPECIES)[number]): LivingBody {
  return {
    equipmentPorts: species === 'human' ? BASE_EQUIPMENT_PORTS.map((port) => ({ ...port })) : [],
    plan:
      species === 'human' || species === 'construct'
        ? 'biped'
        : species === 'bird'
          ? 'avian'
          : 'quadruped',
    maxHealth:
      species === 'human' || species === 'construct'
        ? 100
        : species === 'bear'
          ? 72
          : species === 'deer' || species === 'wolf'
            ? 36
            : 18,
    revision: 0,
    conditions: { injury: 0, wetness: 0, burning: 0 },
    susceptibility: { injury: 1, wetness: 1, burning: 1, healing: 1 },
    harvestYield:
      species === 'human' || species === 'construct'
        ? []
        : [
            {
              definitionId: 'raw_meat',
              quantity: species === 'bear' ? 6 : species === 'deer' || species === 'wolf' ? 4 : 2,
            },
            {
              definitionId: 'bone',
              quantity: species === 'bear' ? 4 : species === 'deer' || species === 'wolf' ? 3 : 2,
            },
          ],
  };
}
export function nativeActor(
  species: 'hare' | 'deer' | 'bird' | 'wolf' | 'bear',
  bornAt: number,
  bindings: readonly AttributeDefinition[],
): ActorComponent {
  const body = livingBody(species);
  const actor: ActorComponent = {
    species,
    body,
    controller: 'native',
    capabilities: {
      cognition: false,
      memory: false,
      innerWorld: false,
      speech: false,
    },
    health: body.maxHealth,
    alive: true,
    incapacitated: false,
    bornAt,
    action: null,
    agency: seedAgency(),
    planGeneration: 0,
  };
  initializeAttributes(
    actor,
    [...bindings],
    Object.fromEntries(
      bindings
        .filter((definition) => definition.schema.kind === 'number')
        .map((definition) => [
          definition.id,
          definition.schema.kind === 'number' ? definition.schema.max : definition.schema.initial,
        ]),
    ),
  );
  return actor;
}
