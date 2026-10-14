import type { SurfacePoint } from '@open-legend/spatial';
import type { ConstructionProfile } from '../../assembly-types.js';
import { definitionPin } from '../../world-modules.js';
import { BASE_CANOPY, BASE_CANOPY_SCENE } from './canopies.js';

/** The opening selects the construction family, location and optional comparison cue.
 * Permission to invoke the cue remains with the application. */
export function baseConstructionProfile(suggested: SurfacePoint): ConstructionProfile {
  return {
    family: definitionPin(BASE_CANOPY),
    suggested: { ...suggested },
    shower: {
      site: {
        minX: suggested.x + BASE_CANOPY_SCENE.site.minX - BASE_CANOPY_SCENE.suggested.x,
        maxX: suggested.x + BASE_CANOPY_SCENE.site.maxX - BASE_CANOPY_SCENE.suggested.x,
        minZ: suggested.z + BASE_CANOPY_SCENE.site.minZ - BASE_CANOPY_SCENE.suggested.z,
        maxZ: suggested.z + BASE_CANOPY_SCENE.site.maxZ - BASE_CANOPY_SCENE.suggested.z,
      },
      seconds: BASE_CANOPY_SCENE.rainSeconds,
      intensity: 1,
      startText:
        'A brief shower starts over the building place. It will end after {minutes} game minutes.',
      resultText:
        'The {minutes}-minute shower started. Covered material stays protected; exposed eligible material becomes wet.',
      actionLabel: 'Run a {minutes}-minute shower',
      remainingText:
        'The shower has {minutes} game minutes remaining. Drying continues during ordinary world time.',
      endedText: 'The shower ended. Drying continues during ordinary world time.',
    },
  };
}
