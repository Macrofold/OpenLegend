import { BASE_CANOPY, BASE_CANOPY_SCENE } from './canopies.js';
import { draftWorld } from '../../draft.js';
import { definitionPin } from '../../world-modules.js';
import { emit, finish, outcome, canonicalJson } from '../../events.js';
import type { Transition, WorldState } from '../../types.js';
/** Explicit creator-controlled comparison cue. It neither repeats nor changes body/fire laws. */
export function beginCanopyShower(original: WorldState, id: string): Transition {
  const digest = canonicalJson({ type: 'canopy-shower', id }),
    prior = original.commandReceipts[id];
  if (prior)
    return {
      world: original,
      events: [],
      outcome:
        prior.digest === digest
          ? prior.outcome
          : outcome(false, 'idempotency-conflict', 'This request identity was already used.'),
    };
  if (original.finiteRain && original.finiteRain.endsAt > original.simTime)
    return {
      world: original,
      events: [],
      outcome: outcome(false, 'rain-active', 'The finite shower is already running.'),
    };
  const world = draftWorld(original),
    events: Transition['events'] = [];
  const family = world.assemblyFamilies?.[BASE_CANOPY.id];
  if (!family)
    return {
      world: original,
      events: [],
      outcome: outcome(
        false,
        'scene-unavailable',
        'This authored comparison scene is unavailable.',
      ),
    };
  world.finiteRain = {
    family: definitionPin(family),
    minX: BASE_CANOPY_SCENE.site.minX,
    maxX: BASE_CANOPY_SCENE.site.maxX,
    minZ: BASE_CANOPY_SCENE.site.minZ,
    maxZ: BASE_CANOPY_SCENE.site.maxZ,
    startsAt: world.simTime,
    endsAt: world.simTime + BASE_CANOPY_SCENE.rainSeconds,
    intensity: 1,
  };
  emit(
    world,
    events,
    'weather-cue',
    'A brief shower starts over the building place. It will end after twenty game minutes.',
    undefined,
    undefined,
    { endsAt: world.finiteRain.endsAt },
    'system',
  );
  const result = outcome(
    true,
    'shower-started',
    'The twenty-minute shower started. Covered material stays protected; exposed eligible material becomes wet.',
  );
  world.commandReceipts[id] = { digest, outcome: result };
  return finish(world, events, result);
}
