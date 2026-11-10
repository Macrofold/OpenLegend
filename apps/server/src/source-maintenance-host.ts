import {
  acceptedMindFiles,
  acquiredActivities,
  acceptConsolidation,
  bodyEligibilityRevision,
  bodyThinkingBlocked,
  dreamPolicy,
  dreamStatus,
  entityGet,
  EXPERIENCE_LIMITS,
  experienceReading,
  mindFor,
  publishInnerWorld,
  type InnerRecordChange,
  type MindFiles,
  type ObserverSubject,
  type WorldState,
} from '@open-legend/domain';
import { bindReflectionAppraisals } from './appraisal-context.js';
import { boundReflectionJsonSchema, boundSummarySchema } from './cognition-contracts.js';
import { MaintenanceIntakeInputs, availableForMaintenance } from './cognition-maintenance.js';
import { prepareDecision } from './decision-context.js';
import { retainedMemorySubjects } from './experience-context.js';
import { consolidationRequests } from './memory-consolidation.js';
import { prepareReflectionPublication } from './reflection-publication.js';
import { offerInterpretationRecords, resolveInterpretationRecords } from './reflection-records.js';
import { digest } from './store.js';
import { timedSync } from './performance.js';
import type {
  MaintenanceActor,
  MaintenanceAdmission,
  MaintenanceHost,
} from './maintenance-host.js';
import type { WorldService } from './world-service.js';
import type { RecallService } from './recall.js';
import type { MacrofoldBackend } from './macrofold.js';

function actorRead(world: WorldState, actorId: string): MaintenanceActor | undefined {
  const entity = entityGet(world.entities, actorId),
    actor = entity?.actor;
  if (!entity || !actor) return undefined;
  const available = availableForMaintenance(world, actorId);
  const dream = dreamStatus(world, entity),
    policy = dreamPolicy(world);
  return {
    actorId,
    name: entity.name,
    alive: actor.alive,
    available,
    reflectionSafe: available && !bodyThinkingBlocked(world, entity, 'reflection'),
    bodyFence: bodyEligibilityRevision(world, entity),
    hasAction: !!actor.action,
    activePlan: actor.agency.plan?.status === 'active',
    simTime: world.simTime,
    lastReflectionAt:
      world.minds?.[actorId]?.lastReflectionAt ?? mindFor(world, actorId).lastReflectionAt,
    ...(dream && policy ? { dream: { ...dream, afterSeconds: policy.afterSeconds } } : {}),
    learningPending: !!world.actionExperience.learning[actorId]?.pending.length,
  };
}
function assertAdmission(
  service: WorldService,
  admission: MaintenanceAdmission,
  world = service.world,
): void {
  if (admission.generation === service.generation && !admission.requiresBody) return;
  const entity = entityGet(world.entities, admission.actorId);
  if (
    admission.generation !== service.generation ||
    !entity ||
    !availableForMaintenance(world, admission.actorId) ||
    bodyEligibilityRevision(world, entity) !== admission.fence ||
    (admission.purpose === 'reflection' &&
      (entity.actor?.action || bodyThinkingBlocked(world, entity, 'reflection'))) ||
    (admission.dreamEpisode !== undefined &&
      dreamStatus(world, entity)?.episode !== admission.dreamEpisode)
  )
    throw new Error(
      'The body, installed policy or maintenance eligibility changed before completion.',
    );
}

/** The existing Source owners remain the only readers and mutators of a TS
 * world. The shared scheduler receives finite facts and real publications. */
export function sourceMaintenanceHost(
  service: WorldService,
  recall: RecallService,
  macrofold: MacrofoldBackend,
): MaintenanceHost {
  const intake = new MaintenanceIntakeInputs();
  let sourceRevision: number | undefined;
  const admissions = new Set<MaintenanceAdmission>();
  const assertCurrentAdmission = (admission: MaintenanceAdmission, world = service.world) => {
    if (!admissions.has(admission)) throw new Error('Maintenance admission was released.');
    assertAdmission(service, admission, world);
  };
  return {
    get worldId() {
      return service.world.id;
    },
    get generation() {
      return service.generation;
    },
    get timelineId() {
      return service.timelineId;
    },
    get simTime() {
      return service.world.simTime;
    },
    get paused() {
      return service.paused;
    },
    get reflectionEnabled() {
      return service.world.cognitionPolicy.reflection;
    },
    get memoryBacklog() {
      return service.memoryBacklog;
    },
    config: service.config,
    store: service.store,
    subscribe: (callback) => service.subscribe(callback),
    notify: () => service.notify(),
    publishRecall: (work) => service.publishRecall(work),
    durabilityTicket: () => service.durabilityTicket(),
    isDurable: (ticket) => service.isDurable(ticket),
    whenDurable: (ticket) => service.whenDurable(ticket),
    clearIntake() {
      intake.clear();
      admissions.clear();
    },
    async refresh(work) {
      timedSync('cognition.maintenanceRefresh', () => {
        const changes = service.store.memories?.actorChangesSince(sourceRevision);
        sourceRevision = changes?.revision;
        const { population, affected } = intake.reconcile(
          service.world,
          service.generation,
          service.memoryBacklog,
          (id) => service.store.memories?.actorRevision(id),
          changes?.actors,
        );
        if (affected) work.refreshAffected(service.world, affected);
        else
          work.refresh(
            service.world,
            (id, world, verify) =>
              intake.read(
                world,
                id,
                service.memoryBacklog,
                service.store.memories?.actorRevision(id),
                verify,
              ),
            service.generation,
            population,
          );
      });
    },
    async inspection(work, actorId) {
      let captured = work.capture(service.world, actorId);
      return {
        async acknowledge(nextSimAt) {
          return work.inspected(actorId, nextSimAt, captured, service.world, service.generation);
        },
        release() {
          captured = undefined;
        },
      };
    },
    async actor(actorId) {
      return actorRead(service.world, actorId);
    },
    async rawDeadlines(actorId) {
      return [
        ...(service.world.experience?.awareness[actorId] ?? []),
        ...(service.world.memories[actorId] ?? []),
      ].map((entry) => entry.at + EXPERIENCE_LIMITS.rawHours * 3600);
    },
    async admission(actorId, generation, purpose, requiresBody) {
      const actor = actorRead(service.world, actorId);
      if (!actor || generation !== service.generation || (requiresBody && !actor.available))
        return undefined;
      const admission: MaintenanceAdmission = {
        actorId,
        generation,
        purpose,
        requiresBody,
        fence: actor.bodyFence,
      };
      admissions.add(admission);
      return admission;
    },
    releaseAdmission(admission) {
      admissions.delete(admission);
    },
    async assertAdmission(admission) {
      assertCurrentAdmission(admission);
    },
    memoryMaintenanceStatus: (actorId) => service.memoryMaintenanceStatus(actorId),
    maintenanceBatch: (actorId, mode, review) => service.maintenanceBatch(actorId, mode, review),
    prepareActivityLearning: (actorId) => service.prepareActivityLearning(actorId),
    async acquiredActivitySignatures(actorId) {
      return new Set(acquiredActivities(service.world, actorId).map((method) => method.signature));
    },
    publishActivityLearning(batch, judgments, validateOnly, admission, signal) {
      return service.publishActivityLearning(
        batch,
        [...judgments],
        validateOnly,
        admission
          ? (world) => {
              signal.throwIfAborted();
              if (service.paused) throw new Error('Learning canceled before publication.');
              assertCurrentAdmission(admission, world);
            }
          : undefined,
      );
    },
    withExecution: (_actorId, id, lease, work) => recall.withExecution(id, lease, work),
    async prepareReflection(input) {
      const { actorId, job, signal, admission } = input;
      const generation = service.generation;
      const snapshot = service.world.innerWorlds?.[actorId];
      if (!snapshot) throw new Error('The actor has no inner-world workspace.');
      const obligations = digest(
        (service.world.memories[actorId] ?? []).filter(
          (memory) => memory.kind === 'commitment' && !memory.resolved,
        ),
      );
      const prepared = await prepareDecision(
        service,
        recall,
        actorId,
        job.id,
        input.reason,
        [],
        input.judge,
        signal,
        input.budgetCeiling,
        false,
        0,
        undefined,
        input.compact,
      );
      try {
        signal.throwIfAborted();
        if (generation !== service.generation)
          throw new Error('Timeline changed during reflection preparation.');
        const appraisals = await bindReflectionAppraisals(
          service,
          actorId,
          job.id,
          prepared.binding.evidenceIds,
          {
            ...prepared.entityReferences,
            ...Object.fromEntries(
              Object.entries(prepared.binding.knowledgeReferences ?? {}).flatMap(
                ([handle, subject]) =>
                  subject.kind === 'entity' ? [[handle, subject.entityId]] : [],
              ),
            ),
          },
          { sharedExperiences: prepared.sharedExperiences, frame: prepared.situation.frame },
        );
        prepared.context['feelings'] = appraisals.context;
        offerInterpretationRecords(service.world, actorId, prepared.context, prepared.binding);
        return {
          context: prepared.context,
          diagnostics: prepared.diagnostics,
          schema: boundReflectionJsonSchema(
            Object.keys(prepared.binding.identityReferences ?? {}),
            Object.keys(prepared.binding.evidenceReferences ?? {}),
          ),
          async files() {
            return acceptedMindFiles(service.world, actorId);
          },
          validate: () => prepared.validateConversation(),
          async publish(value) {
            const publish = prepareReflectionPublication(
              prepared,
              appraisals,
              value,
              actorId,
              job.id,
              snapshot.revision,
            );
            return service.transition(
              (world) => {
                signal.throwIfAborted();
                assertCurrentAdmission(admission, world);
                if (!prepared.temporalSourcesCurrent() || !prepared.situation.valid(world))
                  throw new Error(
                    'Selected personal evidence changed before reflection publication.',
                  );
                if (generation !== service.generation)
                  throw new Error('Timeline changed during reflection.');
                if (
                  obligations !==
                  digest(
                    (world.memories[actorId] ?? []).filter(
                      (memory) => memory.kind === 'commitment' && !memory.resolved,
                    ),
                  )
                )
                  throw new Error('Obligations changed during reflection.');
                return publish(world);
              },
              undefined,
              undefined,
              async () => {
                await prepared.validateConversation(false);
                return appraisals.current();
              },
            );
          },
          dispose: () => prepared.dispose(),
        };
      } catch (error) {
        prepared.dispose();
        throw error;
      }
    },
    async prepareConsolidation(input) {
      const { actorId, batch, job, signal, admission } = input;
      const revision = service.world.innerWorlds?.[actorId]?.revision;
      const episode = admission.dreamEpisode;
      const files = batch.mode === 'daily' ? acceptedMindFiles(service.world, actorId) : [];
      type Interpretation = {
        files: MindFiles;
        thoughts: string[];
        recordChanges: InnerRecordChange[];
        evidenceIds: string[];
        subjects: ObserverSubject[];
      };
      // Tokens are private products of this preparation, never caller-created
      // subject maps. Native uses its own sealed binding in the same seam.
      const interpretations = new Set<object>();
      return {
        requests: consolidationRequests(batch, service.world, actorId),
        async request(index, context, handles) {
          const interpreting =
            batch.mode === 'daily' &&
            index === 0 &&
            episode !== service.world.minds?.[actorId]?.lastDreamEpisode;
          const bindings = {
            evidenceReferences: Object.fromEntries(
              [...handles].map(([handle, source]) => [
                handle,
                experienceReading(source, actorId).id,
              ]),
            ),
            identityReferences: {} as Record<string, ObserverSubject>,
          };
          const supplied = { ...context };
          if (interpreting) {
            supplied['mindFiles'] = files;
            offerInterpretationRecords(
              service.world,
              actorId,
              supplied,
              bindings,
              [...handles.values()].flatMap((source) =>
                retainedMemorySubjects(experienceReading(source, actorId)),
              ),
            );
          }
          return {
            context: supplied,
            interpreting,
            schema: boundSummarySchema(
              Object.keys(bindings.identityReferences),
              Object.keys(bindings.evidenceReferences),
            ),
            interpretation(value) {
              const resolved: Interpretation = {
                files: value.files ?? files,
                thoughts: value.thoughts,
                recordChanges: resolveInterpretationRecords(value.recordChanges, bindings),
                evidenceIds: Object.values(bindings.evidenceReferences),
                subjects: Object.values(bindings.identityReferences),
              };
              interpretations.add(resolved);
              return resolved;
            },
          };
        },
        async publish(groups, token) {
          if (
            token !== undefined &&
            (token === null || typeof token !== 'object' || !interpretations.has(token))
          )
            throw new Error('Dream interpretation has no source-owned preparation.');
          const interpretation = token as Interpretation | undefined;
          return service.withActorHistory(actorId, batch, async () => {
            signal.throwIfAborted();
            if (service.paused) throw new Error('Consolidation canceled before publication.');
            return service.transition((world) => {
              assertCurrentAdmission(admission, world);
              let candidate = world;
              if (interpretation) {
                if (revision === undefined || !episode)
                  throw new Error('Dream publication lost its admitted episode.');
                const published = publishInnerWorld(
                  world,
                  actorId,
                  revision,
                  `${job.id}:dream`,
                  job.id,
                  interpretation.files,
                  interpretation.thoughts,
                  interpretation.evidenceIds,
                  episode,
                  [],
                  [],
                  [],
                  interpretation.subjects,
                  undefined,
                  {},
                  [],
                  { sources: [], subjects: [], reflection: true },
                  interpretation.recordChanges,
                );
                if (!published.outcome.ok) return published;
                candidate = published.world;
              }
              const result = acceptConsolidation(
                candidate,
                actorId,
                job.id,
                batch.sources,
                [...groups],
                batch.prepared,
              );
              return result.outcome.ok ? result : { ...result, world, events: [] };
            });
          });
        },
        dispose() {
          interpretations.clear();
        },
      };
    },
    dispatch(_actorId, admission, validate, beforeStart, start, requestedPublication) {
      const publish = async <T>(begin: () => T): Promise<{ result: T }> => {
        await validate();
        const checked = () => {
          assertCurrentAdmission(admission);
          beforeStart();
          return begin();
        };
        return requestedPublication ? requestedPublication(checked) : { result: checked() };
      };
      return macrofold.withSourceValidation(validate, () => start(publish), publish);
    },
  };
}
