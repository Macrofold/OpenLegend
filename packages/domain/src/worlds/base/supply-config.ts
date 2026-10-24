import { hasRecordFields, isSafeRecordId } from '../../records.js';
import {
  validateSupplyOpportunityProfile,
  type SupplyOpportunityProfile,
} from '../../supply-opportunities.js';
import { entityGet } from '../../entity-collection.js';
import { supportedPosition } from '../../spatial-state.js';
import { acquireExposure } from '../../events.js';
import { migrateCognition } from '../../experience.js';
import { learnRecipe } from '../../knowledge.js';
import type { WorldState } from '../../types.js';

export interface BaseSupplyConfiguration {
  actors: Array<{ actorId: string; profile: SupplyOpportunityProfile; methodRefs: string[] }>;
  places: Array<{
    id: string;
    landmarkId: string;
    label: string;
    description: string;
    reportedBy: string;
  }>;
}
export function compileBaseSupplyConfiguration(
  value: unknown,
  methods: readonly string[],
): BaseSupplyConfiguration {
  if (
    !hasRecordFields(value, ['actors', 'places']) ||
    !Array.isArray(value.actors) ||
    !Array.isArray(value.places)
  )
    throw new Error('Invalid authored supply considerations.');
  for (const actor of value.actors) {
    if (
      !hasRecordFields(actor, ['actorId', 'profile', 'methodRefs']) ||
      !isSafeRecordId(actor.actorId) ||
      !Array.isArray(actor.methodRefs) ||
      actor.methodRefs.some((id) => !methods.includes(id))
    )
      throw new Error('Invalid authored supply actor.');
    validateSupplyOpportunityProfile(actor.profile);
  }
  for (const place of value.places)
    if (
      !hasRecordFields(place, ['id', 'landmarkId', 'label', 'description', 'reportedBy']) ||
      !isSafeRecordId(place.id) ||
      !isSafeRecordId(place.landmarkId) ||
      [place.label, place.description, place.reportedBy].some(
        (text) => typeof text !== 'string' || !text.trim() || text.length > 2000,
      )
    )
      throw new Error('Invalid authored supply report.');
  return structuredClone(value) as unknown as BaseSupplyConfiguration;
}
export function installBaseSupplyOpportunities(
  world: WorldState,
  config: BaseSupplyConfiguration,
  methods: ReadonlyMap<string, string>,
): void {
  // Authored reports are real private evidence, so the experience owner must exist
  // before emitting them; the final initializer pass is deliberately idempotent.
  migrateCognition(world);
  world.supplyOpportunities = {};
  for (const report of config.places) {
    const landmark = entityGet(world.entities, report.landmarkId),
      point = landmark && supportedPosition(landmark);
    if (!point) throw new Error('A supply report needs its actual starting landmark.');
    (world.places ??= {})[report.id] = {
      id: report.id,
      revision: 1,
      label: report.label,
      description: report.description,
      landmarkId: report.landmarkId,
      point: { ...point },
      exposure: { kind: 'arrive-and-see', radius: 4, importance: 8 },
    };
  }
  for (const row of config.actors) {
    const actor = entityGet(world.entities, row.actorId);
    if (!actor?.actor) throw new Error('The supply consideration actor is missing.');
    world.supplyOpportunities[row.actorId] = structuredClone(row.profile);
    for (const ref of row.methodRefs) {
      const recipeId = methods.get(ref);
      if (!recipeId) throw new Error('A supply method was not installed.');
      learnRecipe(world, row.actorId, recipeId, 'authored', row.profile.id);
    }
    for (const known of row.profile.places) {
      const place = world.places?.[known.id],
        report = config.places.find((row) => row.id === known.id);
      if (!place) throw new Error('The personally known supply place is missing.');
      acquireExposure(
        world,
        [],
        actor,
        place.landmarkId,
        {
          kind: 'place',
          id: place.id,
          revision: place.revision,
          label: place.label,
          description: place.description,
          point: { ...place.point },
          landmarkId: place.landmarkId,
          locationLabel: 'Old reported place; current contents and inhabitants unknown',
          reportedBy: report?.reportedBy ?? row.profile.descriptions.motive,
        },
        8,
      );
    }
  }
}
