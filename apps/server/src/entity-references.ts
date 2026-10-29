import type { NameArticle } from '@open-legend/language';
import {
  observerDescription,
  recognizesSubject,
  currentBodyGrant,
  identitiesForEntity,
  canAddressRememberedSubject,
  canonicalJson,
  coachingFor,
} from '@open-legend/domain';
import type { EncounterPreferenceBinding } from '@open-legend/domain';
import type { CatalogueAction } from '@open-legend/protocol';
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
export type PersonalReferenceScope = Pick<WorldState, 'id'>;
/** Private life/recognition metadata never becomes wire fields. Restart invalidates
 * previews; committed requests still recover through their original receipts. */
export function encounterControlReference(
  scope: string,
  operation: 'speak' | 'stop',
  binding: EncounterPreferenceBinding,
): string {
  return createHmac('sha256', bodyReferenceKey)
    .update(canonicalJson(['encounter-control', scope, operation, binding]))
    .digest('hex');
}
export function primaryActionReference(
  scope: string,
  actor: Entity,
  target: Entity,
  binding: EncounterPreferenceBinding | undefined,
  action: CatalogueAction,
  bindingFacts: CatalogueAction['facts'],
): string {
  return createHmac('sha256', bodyReferenceKey)
    .update(
      canonicalJson([
        'primary-action',
        scope,
        actor.id,
        actor.actor?.physicalLife ?? null,
        target.id,
        target.actor?.physicalLife ?? null,
        target.actor?.alive ?? null,
        target.actor?.incapacitated ?? null,
        binding ?? null,
        action.id,
        action.label,
        action.description,
        bindingFacts ?? null,
        action.intent,
        action.enabled,
        action.reason ?? null,
      ]),
    )
    .digest('hex');
}
/** Constant-sized player-owned meaning only. No hidden target activity, location,
 * inventory or meters invalidate the permitted hover preview. */
export function contextActionRevision(
  scope: string,
  world: WorldState,
  actor: Entity,
  target: Entity,
  binding: EncounterPreferenceBinding | undefined,
): string {
  const coaching = coachingFor(world, actor.id);
  return createHmac('sha256', bodyReferenceKey)
    .update(
      canonicalJson([
        'context-preview',
        scope,
        world.moduleManifest.revision,
        actor.actor?.physicalLife ?? null,
        target.actor?.physicalLife ?? null,
        binding ?? null,
        coaching && [coaching.coachId, coaching.learnerId].includes(target.id)
          ? [coaching.id, coaching.phase, coaching.pin, coaching.observed?.eventId]
          : null,
        (actor.actor?.combatReadyAt ?? 0) > world.simTime,
        actor.actor?.action?.ranged?.ready ?? null,
      ]),
    )
    .digest('hex');
}

// These are display/binding tokens, not native source revisions. 144 keyed bits
// keep them opaque while repeated exact evidence stays within existing context budgets.
export function permittedSourceHandle(
  world: PersonalReferenceScope,
  observerId: string,
  identity: unknown,
): string {
  return createHmac('sha256', bodyReferenceKey)
    .update(JSON.stringify(['personal-source', world.id, observerId, identity]))
    .digest()
    .subarray(0, 18)
    .toString('base64url');
}
/** One acquired exposure can join its received history and event participants;
 * the token grants neither canonical identity nor a current physical target. */
export function receivedSubjectHandle(
  world: PersonalReferenceScope,
  observerId: string,
  episodeId: string,
) {
  return permittedSourceHandle(world, observerId, ['received-subject', episodeId]);
}
/** Preserve exact evidence-family identity across fact, support and confirmation views. */
export function evidenceSourceHandle(
  world: PersonalReferenceScope,
  observerId: string,
  source: import('@open-legend/domain').EvidenceSource,
): string {
  return permittedSourceHandle(world, observerId, [
    'evidence',
    source.family,
    source.observer.actorId,
    source.observer.physicalLife,
    source.id,
    source.revision,
  ]);
}
export function personalSourceHandle(
  world: PersonalReferenceScope,
  observerId: string,
  source: import('@open-legend/domain').PersonalSourceRef,
): string {
  return permittedSourceHandle(world, observerId, [
    'personal',
    source.kind,
    source.id,
    source.revision,
  ]);
}
export function subjectHandle(
  world: PersonalReferenceScope,
  observerId: string,
  subject: ObserverSubject,
): string {
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
export function entityHandle(world: WorldState, observerId: string, id: string): string {
  // Bind only identities actually selected by the caller. Enumerating the world
  // here made one permitted reference prepare handles for every hidden being.
  // The structured tuple also keeps authored IDs containing separators distinct.
  return createHmac('sha256', bodyReferenceKey)
    .update(
      JSON.stringify([
        'personal-reference',
        world.id,
        observerId,
        id,
        currentBodyGrant(world, observerId, id)?.leaseId ??
          (recognizesSubject(world, observerId, id) ? 'known' : world.sequence),
      ]),
    )
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

/** Selected historical evidence can name a departed person or consumed item. These
 * references bind that permitted identity only; they supply no current body facts. */
export function experienceEntityReferences(
  world: WorldState,
  observerId: string,
  ids: Iterable<string>,
): Map<string, string> {
  const references = new Map<string, string>();
  for (const id of ids)
    if (!references.has(id)) references.set(id, entityHandle(world, observerId, id));
  return references;
}

/** Captured historical attribution survives loss of current bodily contact.
 * Changing an acquired identity still invalidates its prepared presentation;
 * physical proposals separately recheck their captured body lease at execution. */
type AttributionIdentity = readonly [string | null, string | null, string, string | null, boolean];
function attributionRevision(
  worldId: string,
  observerId: string,
  entries: Iterable<readonly [string, readonly AttributionIdentity[]]>,
): string {
  return createHmac('sha256', bodyReferenceKey)
    .update(canonicalJson([worldId, observerId, [...entries]]))
    .digest('hex');
}
function attributionIdentities(
  world: WorldState,
  observerId: string,
  id: string,
): AttributionIdentity[] {
  return identitiesForEntity(world, observerId, id).map((identity) => [
    identity.individualId ?? null,
    identity.canonicalId ?? null,
    identity.givenName,
    identity.nickname ?? null,
    identity.authored,
  ]);
}
export function personalAttributionRevision(
  world: WorldState,
  observerId: string,
  ids: Iterable<string>,
): string {
  return attributionRevision(
    world.id,
    observerId,
    [...ids].map((id) => [id, attributionIdentities(world, observerId, id)]),
  );
}
function capturedAttributionReader(
  worldId: string,
  observerId: string,
  identities: ReadonlyMap<string, readonly AttributionIdentity[]>,
) {
  return (ids: Iterable<string>) =>
    attributionRevision(
      worldId,
      observerId,
      [...ids].map((id) => {
        const value = identities.get(id);
        if (!value) throw new Error('Uncaptured personal attribution.');
        return [id, value] as const;
      }),
    );
}
/** Capture only selected historical participants; later formatting cannot keep
 * an old whole world alive or silently acquire a later identity association. */
export function capturePersonalAttributionReader(
  world: WorldState,
  observerId: string,
  ids: Iterable<string>,
) {
  return capturedAttributionReader(
    world.id,
    observerId,
    new Map([...new Set(ids)].map((id) => [id, attributionIdentities(world, observerId, id)])),
  );
}

export function resolveEntityMarkers(text: string, references: Record<string, string>): string {
  return text.replace(/\(ID:([^()\s]+)\)/g, (_, handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return `(ID:${references[handle]})`;
  });
}

/** Native routing annotations in retained prose are not participant evidence.
 * Structured historical references carry any supported identity separately. */
export function historicalAccountText(text: string): string {
  return text.replace(/[ \t]*\(ID:[^()\s]+\)/g, '');
}

/** A saved canonical annotation requires an acquired person association. Merely
 * individuating today's unfamiliar body cannot identify an earlier unknown one. */
export function projectEntityMarkers(text: string, world: WorldState, observerId: string): string {
  return text.replace(/\(ID:([^()\s]+)\)/g, (_original, id: string) =>
    canAddressRememberedSubject(world, observerId, id)
      ? `(ID:${entityHandle(world, observerId, id)})`
      : '(unrecognized identity)',
  );
}

/** Only associations acquired when this request was prepared may become lasting
 * canonical prose. A current unfamiliar body handle is temporary permission. */
export function intentionEntityReferences(
  world: WorldState,
  actorId: string,
  references: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(references).filter(([, id]) => canAddressRememberedSubject(world, actorId, id)),
  );
}

export function resolveIntentionMarkers(
  text: string,
  references: Readonly<Record<string, string>>,
  intentions: Readonly<Record<string, string>>,
): string {
  return text.replace(/([ \t]*)\(ID:([^()\s]+)\)/g, (_marker, spacing: string, handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return Object.hasOwn(intentions, handle)
      ? `${spacing}(ID:${intentions[handle]})`
      : `${spacing}(unidentified)`;
  });
}

/** Resolve structured references only; prose cannot grant a mechanical target. */
export function resolveResponseEntities(
  response: ActorResponse,
  references: Record<string, string>,
  intentionReferences: Readonly<Record<string, string>>,
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
    if (!Object.hasOwn(physicalReferences, handle))
      throw new Error('A current physical reference is required.');
    return physicalReferences[handle]!;
  };
  const talk = (value: NonNullable<ActorResponse['operations'][number]['talk']>) => {
    const { addresseeRole: _untrustedRole, ...utterance } = value;
    const handle = value.addresseeEntityId;
    return {
      ...utterance,
      addresseeEntityId: handle === null ? null : resolve(handle),
      ...(handle === null
        ? {}
        : {
            addresseeRole: Object.hasOwn(physicalReferences, handle)
              ? ('body' as const)
              : ('remembered' as const),
          }),
    };
  };
  return {
    operations: response.operations.map((op) => ({
      ...op,
      ...(op.note
        ? {
            note: {
              ...op.note,
              subjectId: op.note.subjectId
                ? Object.hasOwn(knowledgeReferences, op.note.subjectId) ||
                  Object.hasOwn(identityReferences, op.note.subjectId)
                  ? op.note.subjectId
                  : resolve(op.note.subjectId)
                : null,
              text: resolveIntentionMarkers(op.note.text, references, intentionReferences),
            },
          }
        : {}),
      ...(op.name
        ? {
            name: {
              ...op.name,
              subjectId: Object.hasOwn(identityReferences, op.name.subjectId)
                ? op.name.subjectId
                : resolve(op.name.subjectId),
            },
          }
        : {}),
      talk: op.talk ? talk(op.talk) : null,
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
            text: resolveIntentionMarkers(op.think.text, references, intentionReferences),
            aboutEntityIds: op.think.aboutEntityIds.map(resolve),
          }
        : null,
      goal: op.goal
        ? {
            ...op.goal,
            objective: op.goal.objective
              ? resolveIntentionMarkers(op.goal.objective, references, intentionReferences)
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
    recognizesSubject(world, observerId, subjectId) &&
    (subjectId === aware.sourceId ||
      subjectId === aware.targetId ||
      aware.entityIds.includes(subjectId))
  )
    return true;
  const episode = aware.entityEpisodes?.[subjectId];
  return !!episode && episode === world.perceptionEpisodes?.[observerId]?.[subjectId];
}
