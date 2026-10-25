import type { NameArticle } from '@open-legend/language';
import { observerDescription, recognizesSubject, currentBodyObservation } from '@open-legend/domain';
import type {
  ActorResponse,
  ActivityRequestDescriptor,
  Entity,
  WorldState,
  ObserverSubject,
} from '@open-legend/domain';
import { createHmac, randomBytes } from 'node:crypto';

// A life count has a small guessable range. A process-local key keeps the
// presentation reference opaque; restart invalidation grants no authority.
const bodyReferenceKey = randomBytes(32);

export function permittedSourceHandle(world: WorldState, observerId: string, identity: unknown): string {
  return createHmac('sha256', bodyReferenceKey)
    .update(JSON.stringify(['personal-source', world.id, observerId, identity]))
    .digest('hex');
}
/** Preserve exact evidence-family identity across fact, support and confirmation views. */
export function evidenceSourceHandle(world:WorldState,observerId:string,source:import('@open-legend/domain').EvidenceSource):string {
  return permittedSourceHandle(world,observerId,['evidence',source.family,source.observer.actorId,
    source.observer.physicalLife,source.id,source.revision]);
}
export function subjectHandle(world: WorldState, observerId: string, subject: ObserverSubject): string {
  return permittedSourceHandle(world, observerId, ['subject', subject]);
}

/** Presentation freshness for one permitted body, without exposing its life count.
 * Unlike body revision, this stays stable through ordinary injury and healing. */
export function entityBodyReference(scope: string, entity: Entity): string {
  return createHmac('sha256', bodyReferenceKey)
    .update(JSON.stringify([scope, entity.id, entity.actor?.physicalLife ?? 0]))
    .digest('hex');
}

/** Opaque presentation references are not domain identities or authority.
 * docs/memory-architecture.md#metadata-stays-in-the-server-binding
 */
export function entityHandle(
  world: WorldState,
  observerId: string,
  id: string,
): string {
  // Bind only identities actually selected by the caller. Enumerating the world
  // here made one permitted reference prepare handles for every hidden being.
  // The structured tuple also keeps authored IDs containing separators distinct.
  return createHmac('sha256', bodyReferenceKey)
    .update(JSON.stringify([
      'personal-reference', world.id, observerId, id,
      currentBodyObservation(world, observerId, id)?.id ??
        (recognizesSubject(world, observerId, id) ? 'known' : world.sequence),
    ]))
    .digest('hex');
}

export function entityLabel(
  world: WorldState,
  entity: Entity,
  observerId: string,
  article: NameArticle = 'none',
): string {
  const label = observerDescription(world, observerId, entity.id, article);
  return `${label} (ID:${entityHandle(world, observerId, entity.id)})`;
}

export function entityReferenceMap(
  world: WorldState,
  ids: string[],
  observerId: string,
): Record<string, string> {
  return Object.fromEntries(
    ids.map((id) => {
      const handle = entityHandle(world, observerId, id);
      return [handle, id];
    }),
  );
}

export function resolveEntityMarkers(text: string, references: Record<string, string>): string {
  return text.replace(/\(ID:([^()\s]+)\)/g, (_, handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return `(ID:${references[handle]})`;
  });
}

/** Persist full identities in intentions, then reproject annotations in a later context. */
export function projectEntityMarkers(text: string, world: WorldState, observerId: string): string {
  return text.replace(/\(ID:([^()\s]+)\)/g, (_original, id: string) =>
    recognizesSubject(world, observerId, id)
      ? `(ID:${entityHandle(world, observerId, id)})`
      : '(unrecognized identity)',
  );
}

/** Resolve structured references only; prose cannot grant a mechanical target. */
export function resolveResponseEntities(
  response: ActorResponse,
  references: Record<string, string>,
  knowledgeReferences: Record<string, ObserverSubject> = {},
  activityRequests: ActivityRequestDescriptor[] = [],
  identityReferences: Record<string, ObserverSubject> = {},
  physicalReferences: Record<string, string> = {},
): ActorResponse {
  const resolve = (handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return references[handle]!;
  };
  const physical = (handle: string) => {
    if (!Object.hasOwn(physicalReferences, handle)) throw new Error('A current physical reference is required.');
    return physicalReferences[handle]!;
  };
  return {
    operations: response.operations.map((op) => ({
      ...op,
      ...(op.note
        ? {
            note: {
              ...op.note,
              subjectId: op.note.subjectId
                ? Object.hasOwn(knowledgeReferences, op.note.subjectId)
                  || Object.hasOwn(identityReferences, op.note.subjectId)
                  ? op.note.subjectId
                  : resolve(op.note.subjectId)
                : null,
              text: resolveEntityMarkers(op.note.text, references),
            },
          }
        : {}),
      ...(op.name ? { name: { ...op.name, subjectId: Object.hasOwn(identityReferences, op.name.subjectId)
        ? op.name.subjectId : resolve(op.name.subjectId) } } : {}),
      talk: op.talk ? { ...op.talk, addresseeEntityId: op.talk.addresseeEntityId === null ? null : resolve(op.talk.addresseeEntityId) } : null,
      act: op.act
        ? {
            ...op.act,
            ...(op.act.invocation
              ? {
                  invocation: {
                    ...op.act.invocation,
                    targetEntityId: op.act.invocation.targetEntityId
                      ? physical(op.act.invocation.targetEntityId)
                      : null,
                    itemId: op.act.invocation.itemId ? physical(op.act.invocation.itemId) : null,
                    ...(op.act.invocation.parameters
                      ? {
                          parameters: Object.fromEntries(
                            Object.entries(op.act.invocation.parameters).map(([key, value]) => [
                              key,
                              activityRequests.find(
                                (request) => request.id === op.act!.invocation!.family,
                              )?.fields[key]?.type === 'entity'
                                ? physical(String(value))
                                : value,
                            ]),
                          ),
                        }
                      : {}),
                  },
                }
              : {}),
            ...(op.act.slots
              ? {
                  slots: {
                    ...op.act.slots,
                    itemId: op.act.slots.itemId ? physical(op.act.slots.itemId) : null,
                    instrumentId: op.act.slots.instrumentId
                      ? physical(op.act.slots.instrumentId)
                      : null,
                    recipientId: op.act.slots.recipientId
                      ? physical(op.act.slots.recipientId)
                      : null,
                  },
                }
              : {}),
            targetEntityId: op.act.targetEntityId ? physical(op.act.targetEntityId) : null,
            description: op.act.description
              ? resolveEntityMarkers(op.act.description, physicalReferences)
              : null,
          }
        : null,
      think: op.think
        ? {
            ...op.think,
            text: resolveEntityMarkers(op.think.text, references),
            aboutEntityIds: op.think.aboutEntityIds.map(resolve),
          }
        : null,
      goal: op.goal
        ? {
            ...op.goal,
            objective: op.goal.objective
              ? resolveEntityMarkers(op.goal.objective, references)
              : null,
          }
        : null,
    })),
  };
}

/** An old event's canonical source cannot identify a new, unrecognized exposure. */
export function awarenessBindsSubject(
  world: WorldState,
  observerId: string,
  aware: import('@open-legend/domain').Awareness,
  subjectId: string,
): boolean {
  if (subjectId === observerId) return true;
  if (
    aware.recognized &&
    subjectId === aware.sourceId &&
    recognizesSubject(world, observerId, subjectId)
  )
    return true;
  const episode = aware.entityEpisodes?.[subjectId];
  return !!episode && episode === world.perceptionEpisodes?.[observerId]?.[subjectId];
}
