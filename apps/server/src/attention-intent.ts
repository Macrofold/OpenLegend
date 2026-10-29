import { setAttentionFocus, updateWorld } from '@open-legend/domain';
import type { RequestScope } from './authority.js';
import { resolveContactTarget } from './public-contact-references.js';
import type { WorldService } from './world-service.js';

/** Prospective preference only: no sensing, physical watch, memory grant or AI.
 * Resolve the issued contact inside the current authorized mutation. */
export function setPlayerAttention(
  service: WorldService,
  scope: RequestScope,
  target: string | null,
) {
  return service.authorized(scope, 'play', true, () =>
    service.transition((world) => {
      const targetId = target === null ? undefined : resolveContactTarget(world, scope, target);
      const candidates = world.perceptionEvidence?.[scope.actorId]?.attention?.candidates;
      const key =
        targetId === undefined
          ? undefined
          : Object.entries(candidates ?? {}).find(
              ([, candidate]) => candidate.sourceId === targetId,
            )?.[0];
      let accepted = false;
      const next =
        targetId !== undefined && !key
          ? world
          : updateWorld(
              world,
              (draft) => {
                accepted = setAttentionFocus(draft, scope.actorId, key ? [key] : []);
              },
              { retainNativeValues: true },
            );
      return {
        world: accepted ? next : world,
        events: [],
        outcome: accepted
          ? {
              ok: true,
              code: 'attention-selected',
              message:
                target === null
                  ? 'Focus preference cleared.'
                  : 'Focusing here. Important events can still interrupt.',
            }
          : {
              ok: false,
              code: 'attention-unavailable',
              message: 'That subject is no longer available for attention.',
            },
      };
    }),
  );
}
