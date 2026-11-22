import { BASE_ATTENTION_FOCUS_COPY, setAttentionFocus, updateWorld } from '@open-legend/domain';
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
      const candidates = world.perceptionEvidence?.[scope.actorId]?.attention?.annotations;
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
                  ? BASE_ATTENTION_FOCUS_COPY.cleared
                  : BASE_ATTENTION_FOCUS_COPY.focused,
            }
          : {
              ok: false,
              code: 'attention-unavailable',
              message: BASE_ATTENTION_FOCUS_COPY.unavailable,
            },
      };
    }),
  );
}
