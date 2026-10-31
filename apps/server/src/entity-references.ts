import { entityHas } from '@open-legend/domain';
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

interface EntityReferenceResolver {
  get(id: string): string | undefined;
  has(id: string): boolean;
  /** Counts only exact subjects actually requested by this observer's consumers. */
  readonly resolvedCount: number;
}
const cache = new WeakMap<WorldState, Map<string, EntityReferenceResolver>>();
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
): EntityReferenceResolver {
  const cached = cache.get(world)?.get(observerId);
  if (cached) return cached;
  const resolved = new Map<string, string>();
  const tokenOwners = new Map<string, string>();
  const digestOwners = new Map<string, string>();
  const available = (id: string) =>
    entityHas(world.entities, id) ||
    Object.hasOwn(world.observerIdentities?.[observerId] ?? {}, id);
  const resolver: EntityReferenceResolver = {
    has: available,
    get resolvedCount() {
      return resolved.size;
    },
    get(id) {
      const existing = resolved.get(id);
      if (existing || !available(id)) return existing;
      // Labels and evidence request exact permitted subjects before hashing. Never
      // enumerate the world to shorten a local reference table (SC03/SC08).
      // docs/technical/situation-aware-cognition-context.md#73-exact-name-to-id-mappings-remain
      const hash = createHash('sha256')
        .update(
          canonicalJson([
            observerId,
            id,
            recognizesSubject(world, observerId, id)
              ? 'known'
              : (world.perceptionEpisodes?.[observerId]?.[id] ?? world.sequence),
          ]),
        )
        .digest('hex');
      const sameDigest = digestOwners.get(hash);
      if (sameDigest && sameDigest !== id) throw new Error('Entity reference collision.');
      let length = 4;
      while (tokenOwners.has(hash.slice(0, length))) {
        if (++length > hash.length) throw new Error('Entity reference collision.');
      }
      // Exact tokens, rather than prefix matches, resolve references. Preserve an
      // earlier emitted label; only a newly colliding token grows. This keeps every
      // current caller's rendered evidence and captured binding in agreement.
      const handle = hash.slice(0, length);
      resolved.set(id, handle);
      tokenOwners.set(handle, id);
      digestOwners.set(hash, id);
      return handle;
    },
  };
  const observers = cache.get(world) ?? new Map<string, EntityReferenceResolver>();
  observers.set(observerId, resolver);
  cache.set(world, observers);
  return resolver;
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

/** Stored annotations reveal recognized identities, never hidden world membership. */
export function projectEntityMarkers(text: string, world: WorldState, observerId: string): string {
  const handles = entityHandles(world, observerId);
  return text.replace(/\(ID:([^()\s]+)\)/g, (_, id: string) => {
    const reference = recognizesSubject(world, observerId, id) ? handles.get(id) : undefined;
    return reference ? `(ID:${reference})` : '(unrecognized identity)';
  });
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
      ...(op.talk
        ? {
            talk: {
              ...op.talk,
              addresseeEntityId:
                op.talk.addresseeEntityId === null ? null : resolve(op.talk.addresseeEntityId),
            },
          }
        : {}),
      ...(op.act
        ? {
            act: {
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
            },
          }
        : {}),
      ...(op.think
        ? {
            think: {
              ...op.think,
              text: resolveEntityMarkers(op.think.text, references),
              aboutEntityIds: op.think.aboutEntityIds.map(resolve),
            },
          }
        : {}),
      ...(op.goal
        ? {
            goal: {
              ...op.goal,
              objective: op.goal.objective
                ? resolveEntityMarkers(op.goal.objective, references)
                : null,
            },
          }
        : {}),
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
