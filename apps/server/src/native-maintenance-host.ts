import { AsyncLocalStorage } from 'node:async_hooks';
import type { HttpPublication } from '@open-legend/network';
import type { ExecutionLease } from './cognition-execution.js';
import { CognitionMaintenance } from './cognition-maintenance.js';
import type { MaintenanceAdmission, MaintenanceHost } from './maintenance-host.js';
import type { NativeNpcMaintenancePorts } from './native-npc-director.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeRecallRuntime } from './native-recall-service.js';
import { NativeMaintenanceRead } from './native-maintenance-read.js';
import { NativeMaintenanceIntake } from './native-maintenance-intake.js';
import { dispatchEmbedding } from './embedding-dispatch.js';
import { nativeActivityLearning } from './native-activity-learning.js';
import { prepareNativeMaintenanceReflection } from './native-maintenance-reflection.js';
import { prepareNativeConsolidation } from './native-consolidation.js';

/** Compose the same asynchronous scheduler/accounting owner as Source. All
 * private facts and every canonical mutation stay with actual native handles. */
export function createNativeCognitionMaintenance(
  service: NativeWorldService,
  ports: NativeNpcMaintenancePorts,
  now = Date.now,
): CognitionMaintenance {
  return new CognitionMaintenance(
    nativeMaintenanceHost(service, ports, now),
    ports.client,
    ports.macrofold,
    ports.log,
    now,
    ports.execution,
  );
}

function nativeMaintenanceHost(
  service: NativeWorldService,
  ports: NativeNpcMaintenancePorts,
  now: () => number,
): MaintenanceHost {
  const admissions = new Map<MaintenanceAdmission, NativeMaintenanceRead>();
  const execution = new AsyncLocalStorage<{ rootId: string; lease: ExecutionLease }>();
  const intake = new NativeMaintenanceIntake(service, () => service.memoryBacklog);
  const admissionRead = (admission: MaintenanceAdmission) => {
    const read = admissions.get(admission);
    if (!read) throw new Error('Native maintenance admission was released.');
    return read;
  };
  const publish =
    (admission: MaintenanceAdmission, prior?: HttpPublication): HttpPublication =>
    async (start) => {
      const read = admissionRead(admission);
      if (prior)
        return prior(() => {
          if (service.paused || !read.current(admission))
            throw new Error('Maintenance admission changed before dispatch.');
          return start();
        });
      return service.publishRecall(async () => {
        const gate = await read.publication(service.world, admission);
        try {
          if (service.paused || !gate?.isCurrent())
            throw new Error('Maintenance admission changed before dispatch.');
          return { result: start() };
        } finally {
          gate?.release();
        }
      });
    };
  const runtime = (admission: MaintenanceAdmission): NativeRecallRuntime => ({
    config: service.config,
    store: service.store,
    log: ports.log,
    get indexFailure() {
      return ports.indexFailure;
    },
    publish: (operation) => service.publishRecall(operation),
    attemptLink: (stage) => {
      const owner = execution.getStore();
      return owner
        ? { rootJobId: owner.rootId, category: 'preparation', stage, executionClass: 'background' }
        : undefined;
    },
    embed: (request, current, publication) => {
      const owner = execution.getStore();
      if (!owner) throw new Error('Maintenance embedding has no admitted execution lease.');
      return dispatchEmbedding({
        service,
        embeddings: ports.embeddings,
        request,
        lease: owner.lease,
        current,
        publication: publish(admission, publication),
        now,
        assertCurrent: () => {
          if (
            service.paused ||
            request.signal?.aborted ||
            !admissionRead(admission).current(admission)
          )
            throw new Error('Maintenance embedding admission changed.');
        },
      });
    },
  });
  const host: MaintenanceHost = {
    get worldId() {
      return service.worldId;
    },
    get generation() {
      return service.generation;
    },
    get timelineId() {
      return service.timelineId;
    },
    get simTime() {
      return service.simTime;
    },
    get paused() {
      return service.paused;
    },
    get reflectionEnabled() {
      return service.definitions.facts.definitions.cognitionPolicy.reflection;
    },
    get memoryBacklog() {
      return service.memoryBacklog;
    },
    config: service.config,
    store: service.store,
    subscribe: (callback) => service.subscribe(callback),
    notify: () => service.notifyTelemetry(),
    publishRecall: (work) => service.publishRecall(work),
    durabilityTicket: () => service.durabilityTicket(),
    isDurable: (ticket) => service.isDurable(ticket),
    whenDurable: (ticket) => service.whenDurable(ticket),
    clearIntake() {
      intake.clear();
      for (const read of admissions.values()) read.release();
      admissions.clear();
    },
    refresh: (work) => intake.refresh(work),
    inspection: (work, actorId) => intake.inspection(work, actorId),
    async actor(actorId) {
      const actor = service.npcActor(actorId);
      if (!actor) return undefined;
      const read = await service.publishRecall(() =>
        NativeMaintenanceRead.capture(service.world, actorId),
      );
      try {
        return read.facts;
      } finally {
        read.release();
      }
    },
    async rawDeadlines(actorId) {
      const read = await service.publishRecall(() =>
        NativeMaintenanceRead.capture(service.world, actorId),
      );
      try {
        return await read.rawDeadlines();
      } finally {
        read.release();
      }
    },
    async admission(actorId, generation, purpose, requiresBody) {
      if (generation !== service.generation) return undefined;
      const read = await service.publishRecall(() =>
        NativeMaintenanceRead.capture(service.world, actorId),
      );
      const facts = read.facts;
      if (generation !== service.generation || (requiresBody && !facts.available)) {
        read.release();
        return undefined;
      }
      const admission: MaintenanceAdmission = {
        actorId,
        generation,
        purpose,
        requiresBody,
        fence: facts.bodyFence,
      };
      admissions.set(admission, read);
      return admission;
    },
    releaseAdmission(admission) {
      admissions.get(admission)?.release();
      admissions.delete(admission);
    },
    async assertAdmission(admission) {
      const read = admissionRead(admission);
      await service.publishRecall(async () => {
        const gate = await read.publication(service.world, admission);
        try {
          if (!gate?.isCurrent()) throw new Error('Native maintenance admission changed.');
        } finally {
          gate?.release();
        }
      });
    },
    memoryMaintenanceStatus: (actorId) =>
      service.withActorMemoryRead(actorId, () =>
        service.store.memories.maintenanceStatus(
          { worldId: service.worldId, actorId },
          service.simTime,
        ),
      ),
    async maintenanceBatch(actorId, mode, review) {
      await service.whenDurable();
      const generation = service.generation;
      const batch = await service.withActorMemoryRead(actorId, (cut) =>
        service.store.memories.maintenanceBatch(
          { worldId: service.worldId, actorId, generation: cut.generation },
          service.simTime,
          mode,
          review,
        ),
      );
      return generation === service.generation ? batch : null;
    },
    ...nativeActivityLearning(service, admissionRead),
    withExecution(actorId, id, lease, work) {
      const active = [...admissions].find(
        ([admission]) =>
          admission.actorId === actorId && admission.generation === service.generation,
      );
      if (!active) throw new Error('Maintenance execution has no actor admission.');
      return ports.withActorName(active[0].actorId, active[1].facts.name, () =>
        execution.run({ rootId: id, lease }, work),
      );
    },
    prepareReflection: (input) =>
      prepareNativeMaintenanceReflection({
        service,
        input,
        runtime: runtime(input.admission),
        body: admissionRead(input.admission),
      }),
    prepareConsolidation: (input) =>
      prepareNativeConsolidation({
        service,
        input,
        body: admissionRead(input.admission),
      }),
    dispatch(actorId, admission, validate, beforeStart, start, requestedPublication) {
      if (actorId !== admission.actorId)
        throw new Error('Maintenance dispatch belongs to another actor.');
      const publication: HttpPublication = async (begin) => {
        await validate();
        return publish(
          admission,
          requestedPublication,
        )(() => {
          beforeStart();
          return begin();
        });
      };
      return ports.macrofold.withSourceValidation(validate, () => start(publication), publication);
    },
  };
  return host;
}
