import { objectAncestors } from './objects.js';
import { seesEntity } from './perception.js';
import { renderNarration, type Narration } from './narration.js';
import { selectedEventDisclosure } from './world-composition.js';
import type { WorldEvent, WorldState } from './types.js';

export interface EventDisclosurePolicy {
  /** Physical references whose exposure is required for the supplied detailed account. */
  references(event: WorldEvent): string[];
  permitsDetails(event: WorldEvent, observerId: string): boolean;
  partial(event: WorldEvent, sourceId?: string, targetId?: string): Narration | string;
  data(event: WorldEvent, observerId: string, detailed: boolean): NonNullable<WorldEvent['data']>;
}

/** Capture permitted facts once, before later movement or cold history can change them.
 * The audience grants the occurrence; it does not grant every participant or payload field.
 * docs/events-perception-and-reactions.md#event-time-evidence-versus-current-action-authority */
export function observeEvent(world: WorldState, event: WorldEvent, observerId: string) {
  const policy = selectedEventDisclosure(world);
  const owned = event.scope === 'private' || event.actorId === observerId;
  const complete = () => ({
    sourceId: event.actorId,
    targetId: event.targetId,
    text: event.narration ? renderNarration(world, event.narration, observerId) : event.text,
    eventType: event.type,
    eventData: policy.data(event, observerId, true),
  });
  // Private acquisition is the common path; its producer already supplied the grant.
  if (owned) return complete();
  // The trusted audience resolver already tested this source at this occurrence.
  const visible = new Map<string, boolean>(event.actorId ? [[event.actorId, true]] : []);
  const permits = (id: string) => {
    let permitted = visible.get(id);
    if (permitted === undefined) {
      const observer = world.entities[observerId],
        subject = world.entities[id];
      // Visible external attachments share their root's pose; containment never grants
      // observation of bag contents merely because the carrier can be seen.
      const chain = subject?.placement?.mode === 'attached' ? objectAncestors(world, id) : [];
      const root = subject?.placement?.mode === 'world' ? subject : chain.at(-1);
      permitted =
        id === observerId ||
        !!(
          observer &&
          root &&
          root.placement?.mode === 'world' &&
          chain.slice(0, -1).every((part) => part.placement?.mode === 'attached') &&
          seesEntity(world, observer, root)
        );
      visible.set(id, permitted);
    }
    return permitted;
  };
  const sourceId = event.actorId && permits(event.actorId) ? event.actorId : undefined;
  const targetId = event.targetId && permits(event.targetId) ? event.targetId : undefined;
  const references = [
    event.actorId,
    event.targetId,
    ...policy.references(event),
    ...(event.narration?.parts.flatMap((part) =>
      typeof part === 'string' ? [] : ['entityId' in part ? part.entityId : part.subjectId],
    ) ?? []),
  ];
  const detailed =
    policy.permitsDetails(event, observerId) && references.every((id) => !id || permits(id));
  if (detailed) return complete();
  const narration = policy.partial(event, sourceId, targetId);
  return {
    sourceId,
    targetId,
    text: typeof narration === 'string' ? narration : renderNarration(world, narration, observerId),
    eventType: 'activity-observed',
    eventData: policy.data(event, observerId, false),
  };
}
