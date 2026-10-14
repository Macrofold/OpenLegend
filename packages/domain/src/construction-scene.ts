import { finitePoint, resolveSupport } from '@open-legend/spatial';
import { draftWorld } from './draft.js';
import { definitionPin } from './world-modules.js';
import { sameDefinitionPin, isDefinitionPin } from './state-owners.js';
import { emit, finish, outcome, canonicalJson } from './events.js';
import type { Transition, WorldState } from './types.js';
import { activityHostForCommand } from './activity-hosts.js';
import { spatialMap } from './spatial-state.js';

export function constructionProfile(world: WorldState) {
  const profile = world.constructionProfile;
  if (!profile) return undefined;
  if (!activityHostForCommand(world, 'assemble')) return undefined;
  if (!isDefinitionPin(profile.family))
    throw new Error('The construction selection needs an exact family definition.');
  const family = world.assemblyFamilies?.[profile.family.id];
  if (!family || !sameDefinitionPin(profile.family, definitionPin(family)))
    throw new Error('The selected construction family is missing or changed.');
  return { profile, family };
}
export function constructionShowerText(text: string, seconds: number): string {
  return text.replaceAll('{minutes}', String(seconds / 60));
}
/** Saved authored configuration must resolve before projection or any effects. */
export function validateConstructionProfile(world: WorldState): void {
  const selected = constructionProfile(world);
  if (world.constructionProfile && !selected)
    throw new Error('The selected construction profile needs an installed construction activity.');
  if (!selected) return;
  const { suggested, shower } = selected.profile;
  if (
    !finitePoint(suggested) ||
    typeof suggested.surfaceId !== 'string' ||
    !resolveSupport(spatialMap(world), suggested, suggested.surfaceId)
  )
    throw new Error('The suggested construction place has no supported surface.');
  if (
    shower &&
    (!shower.site ||
      ![
        shower.site.minX,
        shower.site.maxX,
        shower.site.minZ,
        shower.site.maxZ,
        shower.seconds,
        shower.intensity,
      ].every(Number.isFinite) ||
      shower.site.minX >= shower.site.maxX ||
      shower.site.minZ >= shower.site.maxZ ||
      shower.seconds <= 0 ||
      shower.intensity < 0 ||
      shower.intensity > 1 ||
      [
        shower.startText,
        shower.resultText,
        shower.actionLabel,
        shower.remainingText,
        shower.endedText,
      ].some((text) => typeof text !== 'string' || !text.trim() || text.length > 2000))
  )
    throw new Error('The selected construction shower is invalid.');
}

/** Reusable finite weather cue; its bounds, timing and meaning are authored inputs. */
export function beginConstructionShower(original: WorldState, id: string): Transition {
  const digest = canonicalJson({ type: 'construction-shower', id }),
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
  const selected = constructionProfile(original);
  const cue = selected?.profile.shower;
  if (!selected || !cue)
    return {
      world: original,
      events: [],
      outcome: outcome(
        false,
        'scene-unavailable',
        'This authored comparison scene is unavailable.',
      ),
    };
  validateConstructionProfile(original);
  if (original.finiteRain && original.finiteRain.endsAt > original.simTime)
    return {
      world: original,
      events: [],
      outcome: outcome(false, 'rain-active', 'The finite shower is already running.'),
    };
  const world = draftWorld(original),
    events: Transition['events'] = [];
  world.finiteRain = {
    family: definitionPin(selected.family),
    ...cue.site,
    startsAt: world.simTime,
    endsAt: world.simTime + cue.seconds,
    intensity: cue.intensity,
  };
  emit(
    world,
    events,
    'weather-cue',
    constructionShowerText(cue.startText, cue.seconds),
    undefined,
    undefined,
    { endsAt: world.finiteRain.endsAt },
    'system',
  );
  const result = outcome(
    true,
    'shower-started',
    constructionShowerText(cue.resultText, cue.seconds),
  );
  world.commandReceipts[id] = { digest, outcome: result };
  return finish(world, events, result);
}
