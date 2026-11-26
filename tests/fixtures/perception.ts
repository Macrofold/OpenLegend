import type { WorldState } from '../../packages/domain/src/types.js';
import { definitionPin } from '../../packages/domain/src/world-modules.js';
import { BASE_ATTENTION_POLICY } from '../../packages/domain/src/worlds/base/attention.js';

/** Literal chronology/geometry specimens own this timing; opening and browser
 * specimens use the installed world's ordinary cadence instead. */
const CHRONOLOGY_SIGHT_TIMING = { broadSeconds: 15, detailSeconds: 6 };

export function chronologyAttentionPolicy() {
  return {
    ...BASE_ATTENTION_POLICY,
    geometry: {
      ...BASE_ATTENTION_POLICY.geometry,
      intervalSeconds: CHRONOLOGY_SIGHT_TIMING.broadSeconds,
    },
    relation: {
      ...BASE_ATTENTION_POLICY.relation,
      intervalSeconds: CHRONOLOGY_SIGHT_TIMING.broadSeconds,
    },
  };
}

export function useChronologySightTiming(world: WorldState): void {
  const manifest = world.moduleManifest;
  const senses = manifest.senses.map((sense) =>
    sense.implementation === 'vision-geometry-v1'
      ? {
          ...sense,
          sampleSeconds: CHRONOLOGY_SIGHT_TIMING.broadSeconds,
          detailSampleSeconds: CHRONOLOGY_SIGHT_TIMING.detailSeconds,
        }
      : sense,
  );
  world.moduleManifest = {
    ...manifest,
    revision: manifest.revision + 1,
    senses,
    sensePins: senses.map(definitionPin),
  };
}
