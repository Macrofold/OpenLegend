import { entityKeys } from '@open-legend/domain';
import type { NameArticle } from '@open-legend/language';
import { observerDescription, recognizesSubject, canonicalJson } from '@open-legend/domain';
import type { EncounterPreferenceBinding } from '@open-legend/domain';
import type { CatalogueAction } from '@open-legend/protocol';
import type {
  ActorResponse,
  ActivityRequestDescriptor,
  Entity,
  WorldState,
} from '@open-legend/domain';
import { createHash, createHmac, randomBytes } from 'node:crypto';

const cache = new WeakMap<WorldState, Map<string, Map<string, string>>>();
// A life count has a small guessable range. A process-local key keeps the
// presentation reference opaque; restart invalidation grants no authority.
const bodyReferenceKey = randomBytes(32);
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
  return createHmac('sha256', bodyReferenceKey)
    .update(
      canonicalJson([
        'context-preview',
        scope,
        world.moduleManifest.revision,
        actor.actor?.physicalLife ?? null,
        target.actor?.physicalLife ?? null,
        binding ?? null,
        (actor.actor?.combatReadyAt ?? 0) > world.simTime,
        actor.actor?.action?.ranged?.ready ?? null,
      ]),
    )
    .digest('hex');
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
export function entityHandles(
  world: WorldState,
  observerId = world.identity?.controlledEntityId ?? '',
): Map<string, string> {
  const cached = cache.get(world)?.get(observerId);
  if (cached) return cached;
  const hashes = [
    ...new Set([
      ...entityKeys(world.entities),
      ...Object.keys(world.observerIdentities?.[observerId] ?? {}),
    ]),
  ].map(
    (id) =>
      [
        id,
        createHash('sha256')
          .update(
            canonicalJson([
              observerId,
              id,
              recognizesSubject(world, observerId, id)
                ? 'known'
                : (world.perceptionEpisodes?.[observerId]?.[id] ?? world.sequence),
            ]),
          )
          .digest('hex'),
      ] as const,
  );
  const groups = new Map<string, typeof hashes>();
  for (const entry of hashes) {
    const prefix = entry[1].slice(0, 4);
    const group = groups.get(prefix) ?? [];
    group.push(entry);
    groups.set(prefix, group);
  }
  const handles = new Map<string, string>();
  for (const group of groups.values()) {
    let length = 4;
    while (new Set(group.map(([, hash]) => hash.slice(0, length))).size !== group.length) {
      if (++length > 64) throw new Error('Entity reference collision.');
    }
    for (const [id, hash] of group) handles.set(id, hash.slice(0, length));
  }
  const observers = cache.get(world) ?? new Map<string, Map<string, string>>();
  observers.set(observerId, handles);
  cache.set(world, observers);
  return handles;
}

export function entityLabel(
  world: WorldState,
  entity: Entity,
  observerId: string,
  article: NameArticle = 'none',
): string {
  const label = observerDescription(world, observerId, entity.id, article);
  return `${label} (ID:${entityHandles(world, observerId).get(entity.id)!})`;
}

export function entityReferenceMap(
  world: WorldState,
  ids: string[],
  observerId: string,
): Record<string, string> {
  const handles = entityHandles(world, observerId);
  return Object.fromEntries(
    ids.map((id) => {
      const handle = handles.get(id);
      if (!handle) throw new Error('Referenced entity is unavailable.');
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
  const current = entityHandles(world, observerId);
  const references = new Map<string, string>();
  for (const id of ids) {
    if (references.has(id)) continue;
    const known = current.get(id);
    if (known) {
      references.set(id, known);
      continue;
    }
    const hash = createHash('sha256')
      .update(canonicalJson([observerId, id, 'remembered']))
      .digest('hex');
    // This namespace cannot collide with ordinary hexadecimal body references.
    const reference = `remembered-${hash}`;
    references.set(id, reference);
  }
  return references;
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
  const handles = entityHandles(world, observerId);
  return text.replace(/\(ID:([^()\s]+)\)/g, (original, id: string) =>
    handles.has(id)
      ? recognizesSubject(world, observerId, id)
        ? `(ID:${handles.get(id)})`
        : '(unrecognized identity)'
      : original,
  );
}

/** Resolve structured references only; prose cannot grant a mechanical target. */
export function resolveResponseEntities(
  response: ActorResponse,
  references: Record<string, string>,
  knowledgeReferences: Record<string, string> = {},
  activityRequests: ActivityRequestDescriptor[] = [],
): ActorResponse {
  const resolve = (handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return references[handle]!;
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
                  ? op.note.subjectId
                  : resolve(op.note.subjectId)
                : null,
              text: resolveEntityMarkers(op.note.text, references),
            },
          }
        : {}),
      ...(op.name ? { name: { ...op.name, subjectId: resolve(op.name.subjectId) } } : {}),
      talk: op.talk
        ? {
            ...op.talk,
            addresseeEntityId:
              op.talk.addresseeEntityId === null ? null : resolve(op.talk.addresseeEntityId),
          }
        : null,
      act: op.act
        ? {
            ...op.act,
            ...(op.act.invocation
              ? {
                  invocation: {
                    ...op.act.invocation,
                    targetEntityId: op.act.invocation.targetEntityId
                      ? resolve(op.act.invocation.targetEntityId)
                      : null,
                    itemId: op.act.invocation.itemId ? resolve(op.act.invocation.itemId) : null,
                    ...(op.act.invocation.parameters
                      ? {
                          parameters: Object.fromEntries(
                            Object.entries(op.act.invocation.parameters).map(([key, value]) => [
                              key,
                              activityRequests.find(
                                (request) => request.id === op.act!.invocation!.family,
                              )?.fields[key]?.type === 'entity'
                                ? resolve(String(value))
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
                    itemId: op.act.slots.itemId ? resolve(op.act.slots.itemId) : null,
                    instrumentId: op.act.slots.instrumentId
                      ? resolve(op.act.slots.instrumentId)
                      : null,
                    recipientId: op.act.slots.recipientId
                      ? resolve(op.act.slots.recipientId)
                      : null,
                  },
                }
              : {}),
            targetEntityId: op.act.targetEntityId ? resolve(op.act.targetEntityId) : null,
            description: op.act.description
              ? resolveEntityMarkers(op.act.description, references)
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
    recognizesSubject(world, observerId, subjectId) &&
    (subjectId === aware.sourceId ||
      subjectId === aware.targetId ||
      aware.entityIds.includes(subjectId))
  )
    return true;
  const episode = aware.entityEpisodes?.[subjectId];
  return !!episode && episode === world.perceptionEpisodes?.[observerId]?.[subjectId];
}
