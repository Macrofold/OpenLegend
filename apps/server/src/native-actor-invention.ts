import type { NativeWorldService } from './native-world-service.js';
import { lockedActorInvention, readActorInventionHistory } from './actor-invention.js';

/** The proof admits only the locked autonomous-invention closure. Current
 * private results are still read from their actual account/timeline owner. */
export async function prepareNativeActorInvention(service: NativeWorldService, actorId: string) {
  const policy = service.definitions.facts.definitions.inventionPolicy;
  if (!policy.agentLocked)
    throw new Error('Autonomous invention is outside the installed native proof closure.');
  const history = await readActorInventionHistory(
    service.store,
    service.worldId,
    actorId,
    service.timelineId,
  );
  return lockedActorInvention(policy.revision, history);
}
