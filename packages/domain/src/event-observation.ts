import { entityGet } from './entity-collection.js';
import { objectAncestors } from './objects.js';
import { seesEntity } from './perception.js';
import { renderNarration, nativeText, type Narration, type NativeText } from './narration.js';
import { selectedEventDisclosure } from './world-composition.js';
import { namePhrase } from '@open-legend/language';
import type { WorldEvent, WorldState } from './types.js';

export interface EventDisclosurePolicy {
  /** Native physical consequences can be felt without seeing their performer.
   * This grants the contacted person an account, never the hidden source. */
  feltTarget(event: Pick<WorldEvent, 'type' | 'targetId' | 'data'>): string | undefined;
  /** Physical references whose exposure is required for the supplied detailed account. */
  references(event: WorldEvent): string[];
  permitsDetails(event: WorldEvent, observerId: string): boolean;
  partial(event: WorldEvent, sourceId?: string, targetId?: string): Narration | string;
  data(event: WorldEvent, observerId: string, detailed: boolean): NonNullable<WorldEvent['data']>;
}

/** Prepare permitted event-time participants before names, prose or account data.
 * Materialize the rich view synchronously in this same received boundary, only
 * for an admitted consumer. The closure must never survive a wait or world advance.
 * The audience grants the occurrence; it does not grant every participant or payload field.
 * docs/events-perception-and-reactions.md#event-time-evidence-versus-current-action-authority */
export function prepareEventObservation(
  world: WorldState,
  event: WorldEvent,
  observerId: string,
  reception?: { feltImpact: true },
) {
  const policy = selectedEventDisclosure(world);
  const owned = event.scope === 'private' || event.actorId === observerId;
  const capturedName = (id: string): string | undefined => {
    const named = typeof event.text === 'string' ? undefined : event.text.names[id];
    if (!named) return;
    const value = namePhrase(named, 'none');
    return named.nameForm === 'proper' ? value : value[0]!.toUpperCase() + value.slice(1);
  };
  const label = (id: string, captured = true) =>
    (captured ? capturedName(id) : undefined) ??
    renderNarration(
      world,
      { parts: [{ entityId: id, role: 'name', article: 'none' }] },
      observerId,
    );
  const names = (sourceId?: string, targetId?: string) => [
    ...(sourceId
      ? [
          {
            id: sourceId,
            label: label(sourceId),
            role: 'actor' as const,
          },
        ]
      : []),
    ...(targetId
      ? [
          {
            id: targetId,
            label: label(targetId),
            role: 'target' as const,
          },
        ]
      : []),
  ];
  const completeReferences = () => [
    ...(event.actorId ? [{ id: event.actorId, role: 'actor' as const }] : []),
    ...(event.targetId ? [{ id: event.targetId, role: 'target' as const }] : []),
    ...[
      ...new Set(
        event.narration?.parts.flatMap((part) =>
          typeof part === 'string' ? [] : ['entityId' in part ? part.entityId : part.subjectId],
        ) ?? [],
      ),
    ]
      .filter((id) => id !== event.actorId && id !== event.targetId)
      .map((id) => ({ id, role: 'participant' as const })),
  ];
  const complete = (references: ReturnType<typeof completeReferences>) => {
    const eventData = policy.data(event, observerId, true);
    let text: NativeText = event.narration
      ? renderNarration(world, event.narration, observerId)
      : typeof event.text !== 'string'
        ? { ...event.text, selfId: observerId, person: 'first' }
        : event.text;
    // A visible meter change does not expose a private bodily cause. The installed
    // disclosure policy must separately admit the recorded cause before it is narrated.
    if (event.type === 'attribute-changed' && typeof eventData['causeLabel'] === 'string')
      text = `${nativeText(text).replace(/[.!?]$/, '')} from ${eventData['causeLabel'].toLowerCase()}.`;
    return {
      sourceId: event.actorId,
      targetId: event.targetId,
      text,
      eventType: event.type,
      eventData,
      references: references.map((reference) => ({
        ...reference,
        label: label(reference.id, reference.role !== 'participant'),
      })),
    };
  };
  const completeView = () => {
    const references = completeReferences();
    return {
      sourceId: event.actorId,
      targetId: event.targetId,
      eventType: event.type,
      references,
      materialize: () => complete(references),
    };
  };
  // Private acquisition is the common path; its producer already supplied the grant.
  if (owned) return completeView();
  // The trusted audience resolver already tested this source at this occurrence.
  const felt = reception?.feltImpact === true || policy.feltTarget(event) === observerId;
  const observer = felt ? entityGet(world.entities, observerId) : undefined;
  const source = felt && event.actorId ? entityGet(world.entities, event.actorId) : undefined;
  const visible = new Map<string, boolean>(
    event.actorId
      ? [
          [
            event.actorId,
            !felt ||
              event.actorId === observerId ||
              !!(observer && source && seesEntity(world, observer, source)),
          ],
        ]
      : [],
  );
  const permits = (id: string) => {
    let permitted = visible.get(id);
    if (permitted === undefined) {
      const observer = entityGet(world.entities, observerId),
        subject = entityGet(world.entities, id);
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
  if (detailed) return completeView();
  return {
    sourceId,
    targetId,
    eventType: felt ? event.type : 'activity-observed',
    references: [
      ...(sourceId ? [{ id: sourceId, role: 'actor' as const }] : []),
      ...(targetId ? [{ id: targetId, role: 'target' as const }] : []),
    ],
    materialize: () => {
      const narration = policy.partial(event, sourceId, targetId);
      return {
        sourceId,
        targetId,
        text:
          typeof narration === 'string' ? narration : renderNarration(world, narration, observerId),
        eventType: felt ? event.type : 'activity-observed',
        eventData: policy.data(event, observerId, false),
        references: names(sourceId, targetId),
      };
    },
  };
}
