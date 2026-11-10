import { entityGet } from '@open-legend/domain';
import { foundationCapabilities } from './foundation-capabilities.js';
import type { MacrofoldExecutionHost } from './macrofold.js';
import type { WorldService } from './world-service.js';
import { buildStoredContext } from './context.js';

/** Source keeps its actual gameplay/authoring owners. The provider adapter
 * consumes only operational identity, configuration and explicit callbacks. */
export function sourceMacrofoldHost(service: WorldService): MacrofoldExecutionHost {
  return {
    get worldId() {
      return service.world.id;
    },
    get timelineId() {
      return service.timelineId;
    },
    config: service.config,
    store: service.store,
    actorName: (id) => entityGet(service.world.entities, id)?.name ?? id,
    assertScope: (scope, capability, controlling) =>
      service.assertScope(scope, capability, controlling),
    notify: () => service.notify(),
    authoring: {
      localScope: () => service.localScope,
      nativeCapabilities: () => foundationCapabilities(service.world),
      storedContext: (actorId, text) => buildStoredContext(service, actorId, text),
    },
  };
}
