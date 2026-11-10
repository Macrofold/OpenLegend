import { entityGet, settleDiscovery } from '@open-legend/domain';
import type { WorldService } from './world-service.js';
import type { DecisionEscalationHost } from './decision-escalator.js';
import { decisionValidity } from './decision-validity.js';
import { nativeProtectionReason } from './native-protection.js';

/** Existing Source semantic checks remain at their real world owner. Native
 * execution supplies a separately scoped read without constructing a world. */
export function sourceDecisionHost(service: WorldService): DecisionEscalationHost {
  return {
    get worldId() {
      return service.world.id;
    },
    get timelineId() {
      return service.timelineId;
    },
    get generation() {
      return service.generation;
    },
    get config() {
      return service.config;
    },
    get store() {
      return service.store;
    },
    get paused() {
      return service.paused;
    },
    get simTime() {
      return service.world.simTime;
    },
    mutateDecision: (rootId, operation) => service.store.mutateDecision(rootId, operation),
    observe: (read) => read(),
    scopeCurrent(state, authority, validity, eligibility = false) {
      const actor = entityGet(service.world.entities, state.actorId)?.actor;
      return (
        service.generation === state.generation &&
        service.timelineId === state.timelineId &&
        !!actor?.alive &&
        !actor.incapacitated &&
        actor.controller === 'npc' &&
        (actor.physicalLife ?? 0) === state.physicalLife &&
        (!eligibility ||
          (actor.capabilities?.cognition !== false &&
            !nativeProtectionReason(service.world, state.actorId))) &&
        (!validity || validity === decisionValidity(service.world, state.actorId)) &&
        (state.usefulUntilSim === undefined || service.world.simTime < state.usefulUntilSim) &&
        (!authority || service.currentScope(authority, 'play', true))
      );
    },
    validity: (actorId) => decisionValidity(service.world, actorId),
    async settleDiscovery(actorId, rootId, generation) {
      const semantic = entityGet(service.world.entities, actorId)?.actor?.agency.semantic;
      if (semantic?.discovery !== 'reserved' || semantic.reservation !== rootId) return true;
      return service.publishAttention(actorId, generation, (world) =>
        settleDiscovery(world, actorId, rootId, true),
      );
    },
    subscribe: (listener) => service.subscribe(listener),
    notify: () => service.notify(),
    storageFailed: (message) => {
      service.storageError = message;
    },
  };
}
