import { continuityView } from './continuity-view.js';
import { projectStatusEffects } from '@open-legend/domain';
import { mindFor, wordCount } from '@open-legend/domain';
import type { GodMindView } from '@open-legend/protocol';
import type { WorldService } from './world-service.js';
/** Local host owner capability is configured by the operator, never by request JSON. */
export async function inspectGodMind(
  service: WorldService,
  actorId: string,
  scope = service.localScope,
): Promise<GodMindView> {
  if (!service.config.godMode) throw new Error('God inspection is disabled by the host.');
  let entity = service.world.entities[actorId];
  if (!entity?.actor) throw new Error('Character not found.');
  if (!service.mayInspectPrivate(actorId, scope))
    throw new Error('Human-private character content is unavailable to this principal.');
  const history = await service.inspectMemoryContext(actorId, scope);
  entity = service.world.entities[actorId];
  if (
    !entity?.actor ||
    !service.mayInspectPrivate(actorId, scope) ||
    history.generation !== service.generation ||
    history.sourceRevision !== service.store.memories?.actorRevision(actorId)
  )
    throw new Error('Private mind changed during inspection.');
  const mind = mindFor(service.world, actorId);
  return {
    actorId,
    knowledgeLimits: service.world.knowledgePolicy?.maxCharacters,
    worldId: service.world.id,
    generation: service.generation,
    ...(() => {
      const projection = continuityView(service, actorId, scope);
      return {
        notepads: projection.notepads,
        identities: projection.identities,
        continuity: projection.continuity,
      };
    })(),
    name: entity.name,
    revision: service.world.innerWorlds?.[actorId]?.revision ?? mind.revision,
    corrections: service.world.experience?.corrections?.[actorId],
    acceptedText: service.world.innerWorlds?.[actorId]?.text,
    experiences: history.recent.map((m) => ({
      id: m.id,
      text: m.summary,
      at: m.at,
      kind: m.kind,
      source: m.source,
    })),
    commitments: history.commitments.map((m) => ({
      id: m.id,
      text: m.summary,
      resolved: !!m.resolved,
    })),
    skills: (service.world.knowledge[actorId] ?? []).map((k) => ({
      name: service.world.recipes[k.recipeId]?.name ?? 'Unavailable technique',
      source: k.source,
      learnedAt: k.learnedAt,
    })),
    statusEffects: projectStatusEffects(service.world, entity, 'owner').map((d) => ({
      id: d.id,
      label: d.label,
      elapsedSeconds: entity.statusEffects?.[d.id]?.elapsedSeconds ?? 0,
    })),

    documents: mind.documents,
    records: mind.records,
    thoughts: mind.thoughts.filter((t) => t.kind !== 'thought' && wordCount(t.text) <= 20),
    legacyThoughts: mind.thoughts.filter((t) => t.kind === 'thought' || wordCount(t.text) > 20),
  };
}
