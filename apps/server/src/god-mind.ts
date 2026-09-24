import { activeStatusEffects } from '@open-legend/domain';
import { mindFor, experiences, wordCount } from '@open-legend/domain';
import type { GodMindView } from '@open-legend/protocol';
import type { WorldService } from './world-service.js';
/** Local host owner capability is configured by the operator, never by request JSON. */
export function inspectGodMind(service: WorldService, actorId: string): GodMindView {
  if (!service.config.godMode) throw new Error('God inspection is disabled by the host.');
  const entity = service.world.entities[actorId];
  if (!entity?.actor) throw new Error('Character not found.');
  const mind = mindFor(service.world, actorId);
  return {
    actorId,
    name: entity.name,
    revision: service.world.innerWorlds?.[actorId]?.revision ?? mind.revision,
    corrections: service.world.experience?.corrections?.[actorId],
    acceptedText: service.world.innerWorlds?.[actorId]?.text,
    experiences: experiences(service.world, actorId, true)
      .slice(-100)
      .map((m) => ({ id: m.id, text: m.summary, at: m.at, kind: m.kind, source: m.source })),
    commitments: (service.world.memories[actorId] ?? [])
      .filter((m) => m.kind === 'commitment')
      .map((m) => ({ id: m.id, text: m.summary, resolved: !!m.resolved })),
    skills: (service.world.knowledge[actorId] ?? []).map((k) => ({
      name: service.world.recipes[k.recipeId]?.name ?? 'Unavailable technique',
      source: k.source,
      learnedAt: k.learnedAt,
    })),
    statusEffects: activeStatusEffects(service.world, entity).map((d) => ({
      id: d.id,
      label: d.label,
      elapsedSeconds: entity.statusEffects![d.id]!.elapsedSeconds,
    })),

    documents: mind.documents,
    records: mind.records,
    thoughts: mind.thoughts.filter((t) => t.kind !== 'thought' && wordCount(t.text) <= 20),
    legacyThoughts: mind.thoughts.filter((t) => t.kind === 'thought' || wordCount(t.text) > 20),
  };
}
