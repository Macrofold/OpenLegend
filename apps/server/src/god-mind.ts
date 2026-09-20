import { mindFor } from '@open-legend/domain';
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
    revision: mind.revision,
    documents: mind.documents,
    records: mind.records,
    thoughts: mind.thoughts,
  };
}
