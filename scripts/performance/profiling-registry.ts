/** Source-bound measurement catalogue. Labels describe the installed code, not engine policy.
 * docs/performance/simulation-inventory.md owns semantic coverage; this table owns executable sites.
 * Nothing here imports gameplay or executes a workload. */
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { MeasurementResultKind } from '../../packages/spatial/src/diagnostic-measurements.js';

export type ProfilingKind =
  | 'sync'
  | 'active-segments'
  | 'async-latency'
  | 'queue-wait'
  | 'counter'
  | 'gauge'
  | 'sampled-cpu';
export type ProfilingRole = 'parent' | 'operation' | 'leaf';
export interface ProfilingBinding {
  path: string;
  symbol: string;
  /** Exact logical source block: no line-number fallback after code moves. */
  filter?: { expression: string; values: readonly string[] };
  installed?: boolean;
  resultKind?: MeasurementResultKind;
  resultExpression?: string;
  logical?: 'sight-observer';
  kind?: ProfilingKind;
  sourceHash?: string;
  anchorHash?: string;
  startLine?: number;
  endLine?: number;
  start?: number;
  end?: number;
  async?: boolean;
  generator?: boolean;
  promise?: boolean;
  /** Async scopes end at body/necessary-return completion; the caller's final
   * promise-adoption microtask is outside this source boundary. */
  latencyBoundary?: 'async-body-and-native-return-settlement';
  counterNames?: readonly string[];
}
export interface ProfilingDefinition {
  id: string;
  numericId: number;
  parent: string;
  label: string;
  role: ProfilingRole;
  kind: ProfilingKind;
  unit: string;
  dimensions: readonly string[];
  work: readonly string[];
  shared: boolean;
  coverage: readonly string[];
  bindings: readonly ProfilingBinding[];
}
export interface ProfilingCategory {
  id: string;
  label: string;
}
const roots: Record<string, string> = {
  a: 'apps/server/src/',
  d: 'packages/domain/src/',
  s: 'packages/spatial/src/',
  t: 'scripts/performance/',
};
const workloads: Record<string, readonly string[]> = {
  S00: ['W00'],
  S01: ['W02', 'W08', 'W12'],
  S02: ['W01', 'W03'],
  S03: ['W03', 'W08'],
  S04: ['W01', 'W08'],
  S05: ['W03', 'W04', 'W06'],
  S06: ['W06', 'W11'],
  S07: ['W06', 'W07'],
  S08: ['W06', 'W10'],
  S09: ['W09'],
  S10: ['W08'],
  S11: ['W02', 'W06'],
  S12: ['W10', 'W12'],
  S13: ['W12'],
  S14: ['W10', 'W11'],
  S15: ['W11', 'W12'],
  S16: ['W03', 'W10', 'W12'],
};
/** Audited plain result owners only. Tiny data accessors and unknown results
 * are never inspected to fabricate outcomes. */
const resultOwners: Readonly<
  Record<string, { resultKind: MeasurementResultKind; resultExpression?: string }>
> = {
  'a:world-service.ts#WorldService.transition': { resultKind: 'api-result' },
  'a:world-service.ts#WorldService.godAct': { resultKind: 'api-result' },
  'a:world-service.ts#WorldService.control': { resultKind: 'api-result' },
  'a:http.ts#initializeGameServer.@createServer:0': {
    resultKind: 'http-status',
    resultExpression: 'response.statusCode',
  },
  'd:kernel.ts#executeCommand': { resultKind: 'transition' },
  'd:god-tools.ts#spawnWorldEntity': { resultKind: 'transition' },
  'd:experience.ts#correctExperience': { resultKind: 'transition' },
  'd:experience.ts#forgetExperience': { resultKind: 'transition' },
  'd:declarations.ts#admitDeclaration': { resultKind: 'transition' },
};
function binding(spec: string): ProfilingBinding {
  const separator = spec.indexOf('#'),
    prefix = spec.slice(0, 1),
    root = roots[prefix];
  if (!root || separator < 3) throw new Error(`Invalid authored profiling binding: ${spec}`);
  return {
    path: root + spec.slice(2, separator),
    symbol: spec.slice(separator + 1),
    ...resultOwners[spec],
  };
}
function row(
  id: string,
  label: string,
  unit: string,
  sites: readonly string[],
): ProfilingDefinition[] {
  const group = id.slice(0, 3);
  return sites.map((site, index) => ({
    id:
      index === 0
        ? id
        : `${id}.${site
            .slice(2)
            .replace(/\.ts#/g, '-')
            .replace(/[/.#]/g, '-')
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase()}`,
    numericId: 0,
    parent: index === 0 ? group : id,
    label: index === 0 ? label : `${label}: ${site.slice(site.indexOf('#') + 1)}`,
    role: index === 0 ? 'operation' : 'leaf',
    kind: 'sync',
    unit: 'function invocation',
    dimensions: ['invocations', 'loop-iterations', 'returned-items', 'refused', 'stale', 'empty'],
    work: [
      `inventory input scale: ${unit}`,
      'executed loop bodies',
      'existing source work counters',
      'actual returned collection length where declared',
    ],
    shared: /shared|batch|phase/.test(unit.toLowerCase()),
    coverage: workloads[group] ?? [],
    bindings: [binding(site)],
  }));
}
export const PROFILING_CATEGORIES: readonly ProfilingCategory[] = [
  { id: 'S00', label: 'Start, load, connect and close' },
  { id: 'S01', label: 'Server input, authority and command results' },
  { id: 'S02', label: 'Clock, scheduling and native interval orchestration' },
  { id: 'S03', label: 'Movement, geometry and navigation' },
  { id: 'S04', label: 'Native animals and physical responses' },
  { id: 'S05', label: 'Physical sensing, especially sight' },
  { id: 'S06', label: 'Current personal knowledge and identity' },
  { id: 'S07', label: 'Attention, held context and spatial relationships' },
  { id: 'S08', label: 'Events, experience and recent chronology' },
  { id: 'S09', label: 'Native cognition orchestration and server memory reads' },
  { id: 'S10', label: 'Gameplay mechanics, actions and long-lived obligations' },
  { id: 'S11', label: 'Permitted views, streams and history consumption' },
  { id: 'S12', label: 'Accepted changes, encoding and durable saving' },
  { id: 'S13', label: 'Database execution, queues and shared readers' },
  { id: 'S14', label: 'Retention, forgetting, cleanup and maintenance' },
  { id: 'S15', label: 'Checkpoints, restoration and recovery' },
  { id: 'S16', label: 'Shared representation and cross-cutting work' },
];
const rows: ProfilingDefinition[][] = [
  row(
    'S00.01',
    'Process imports; configuration validation; collision/WASM initialization before server readiness',
    'Cold process; modules, native initialization, fixed asset metadata only',
    ['t:profile-campaign-case.ts#importProfileServer', 'a:config.ts#readConfig'],
  ),
  row(
    'S00.02',
    'PostgreSQL connection and repository schema initialization (SqlGameRepository.initialize, WorldRecords.initialize)',
    'Fresh database versus current database; statements, tables/indexes',
    [
      'a:store.ts#SqlGameRepository.initialize',
      'a:world-records.ts#WorldRecords.initialize',
      'a:postgres.ts#PostgresDatabase.connect',
    ],
  ),
  row(
    'S00.03',
    'World factory and selected-world startup preparation; initial entity/item/definition installation',
    'New world; entities, definitions, starting effects',
    ['a:initial-world-preparation.ts#prepareCreatedWorld', 'd:worlds/base/world.ts#createWorld'],
  ),
  row(
    'S00.04',
    'WorldService.initialize: load/assemble; current-format validation; rebuild derived indexes; install resident state',
    'World load; rows, bytes, validation visits, resident/cold counts',
    [
      'a:world-service.ts#WorldService.initialize',
      'a:world-records.ts#assembleWorldRecords',
      'a:upgrade-world.ts#validateCurrentWorldState',
    ],
  ),
  row(
    'S00.05',
    'Initial initializePerception and first exposure',
    'Fresh observer and shared startup batch; candidates, accepted contacts, records',
    ['d:kernel.ts#initializePerception'],
  ),
  row(
    'S00.06',
    'Navigation/geometry workers: spawn→ready; initial geometry/body preparation',
    'Worker/map/body-profile preparation; serialized bytes',
    [
      'a:navigation/backend.ts#initializeNavigationRuntime',
      'a:geometry-batches.ts#GeometryBatches.compute',
    ],
  ),
  row(
    'S00.07',
    'Session/profile/control/presence and initial permitted state/SSE subscription',
    'Client connection; requests, authorization/cache reads, projection bytes',
    [
      'a:world-service.ts#WorldService.signInLocal',
      'a:world-service.ts#WorldService.control',
      'a:world-service.ts#WorldService.reportPresence',
    ],
  ),
  row(
    'S00.08',
    'Normal shutdown: stop admission; settle accepted saves; stop workers; disconnect repository',
    'Server close; pending work, drain time, errors; fixture deletion separately',
    [
      'a:http.ts#initializeGameServer.shutdownOnce',
      'a:world-service.ts#WorldService.settleBackgroundSaves',
      'a:store.ts#SqlGameRepository.close',
    ],
  ),
  row(
    'S01.01',
    'HTTP body read/decode; route schema validation; request dispatch',
    'Request by route family and outcome; input bytes',
    ['a:http-json.ts#readBoundedJson', 'a:http-json.ts#readHttpJson'],
  ),
  row(
    'S01.02',
    'Session resolution; scope/profile lookup; current authority checks',
    'Authorized operation; cache hits, database reads, changed/expired permissions',
    [
      'a:world-service.ts#WorldService.authorized',
      'a:authority.ts#AuthorityRepository.authenticateScope',
      'a:world-service.ts#WorldService.assertScope',
    ],
  ),
  row(
    'S01.03',
    'Command fingerprint and accepted-receipt lookup in hot/pending/in-flight/durable owners',
    'Command ID; hit/miss/conflict, SQL, duplicate replay versus new action',
    [
      'a:world-service.ts#WorldService.commandReceipt',
      'a:command-receipts.ts#CommandReceipts.get',
      'a:world-service.ts#commandRecoveryFingerprint',
    ],
  ),
  row(
    'S01.04',
    'Mutation lane enqueue→admission; active invocation segments; admission→release',
    'Command and native tick separately; queue depth, refusal, hold/wait',
    ['a:work-lane.ts#WorkLane.run', 'a:work-lane.ts#WorkLane.pump'],
  ),
  row(
    'S01.05',
    'Command history/evidence/known-place preparation before native admission',
    'Command; selected source IDs, metadata/body rows, pending overlays',
    [
      'a:world-service.ts#WorldService.prepareAndAdmitCommand',
      'a:world-service.ts#WorldService.withActorHistory',
      'a:world-service.ts#WorldService.prepareNativeKnownPlaces',
    ],
  ),
  row(
    'S01.06',
    'transition/reviewedTransition: validate live preconditions; execute command; accept effects',
    'Native command kind/outcome; no provider routing included',
    [
      'a:world-service.ts#WorldService.transition',
      'a:world-service.ts#WorldService.reviewedTransition',
      'a:domain-command.ts#domainCommand',
    ],
  ),
  row(
    'S01.07',
    'Receipt install; memory acceptance; required durable barrier; response encoding',
    'Accepted/rejected command; pending-save bytes, barrier waits, output bytes',
    [
      'a:world-service.ts#WorldService.installCommandReceipt',
      'a:world-service.ts#WorldService.whenDurable',
      'a:http.ts#writeJson',
    ],
  ),
  row(
    'S01.08',
    'Presence/control/world-input renewal, expiry, pause/reconnect and idempotent retry',
    'Actual update; no-op/changed, input leases, restores/revocations',
    [
      'a:world-service.ts#WorldService.updateWorldInput',
      'a:world-service.ts#WorldService.reportPresence',
      'a:world-service.ts#WorldService.control',
      'a:world-service.ts#WorldService.syncPause',
    ],
  ),
  row(
    'S01.09',
    'Native typed action/tool routing (typed-actions.ts, world-tools.ts, world-mcp.ts) into the same authorization/command owners',
    'Tool/action request; schema/argument binding, refusals, downstream native command; no model transport',
    [
      'a:typed-actions.ts#commitTypedAction',
      'a:world-tools.ts#WorldToolService.execute',
      'a:world-mcp.ts#createWorldMcp.handle',
    ],
  ),
  row(
    'S02.01',
    'Host wake scheduled→delivered; elapsed time/input admission and pause/debt bookkeeping',
    'Wake; requested/advanced/excluded seconds, runnable debt, suspended gaps',
    ['a:world-service.ts#WorldService.accountInputTime', 'a:world-service.ts#WorldService.tick'],
  ),
  row(
    'S02.02',
    'Known-place preparation, participation reconciliation and native admission guards',
    'Tick opportunity; actors, history reads, no-op/changed checks',
    [
      'a:world-service.ts#WorldService.prepareNativeKnownPlaces',
      'a:world-service.ts#WorldService.reconcileParticipation',
    ],
  ),
  row(
    'S02.03',
    'Native participant/index preparation (nativeParticipants, entity indexes)',
    'Native batch; roster visits/build/reuse; count-only readers separately',
    ['d:kernel.ts#nativeParticipants', 'd:entity-index.ts#nativeEntityGroups'],
  ),
  row(
    'S02.04',
    'Native deadline/interval selection: actions; status/meters; contact/geometry; sensing; commitments/resources',
    'Interval selection and each declared boundary owner; eligible/due items, minimum deadline',
    [
      'd:simulation-time.ts#statusBoundary',
      'd:simulation-time.ts#attributeBoundary',
      'd:activity-execution.ts#nextActivityBoundary',
      'd:commitments.ts#nextCommitmentDeadline',
      'd:kernel.ts#advanceWorldNative.prepareIntegration',
    ],
  ),
  row(
    'S02.05',
    'Reuse or rebuild of prepared native mechanics/rates and changed-dependency reconciliation',
    'Batch/interval; reused inputs, invalidated owners, actual rebuilds',
    [
      'd:kernel.ts#advanceWorldNative.workingNativeWorld',
      'd:kernel.ts#advanceWorldNative.reconcileStatuses',
    ],
  ),
  row(
    'S02.06',
    'Work-budget admission and charging; zero-time pre-step reconciliation',
    'Interval; attempts, admitted work, refusals, zero-progress passes',
    ['d:work-budget.ts#chargeWork', 'd:kernel.ts#advanceWorldNative.observationPreparation'],
  ),
  row(
    'S02.07',
    'Actual interval integration and endpoint consequences',
    'Accepted interval; duration, actors touched, mechanical effects',
    ['d:kernel.ts#integrateEndpoint', 'd:kernel.ts#advanceWorldNative.materialize'],
  ),
  row(
    'S02.08',
    'Generator resume and coherent publication decision',
    'Resume; active elapsed segments, yields by reason, no-yield spans',
    [
      'd:kernel.ts#advanceWorldSlices',
      'a:world-service.ts#WorldService.tickBatch.@this.mutate:0.nextSlice',
    ],
  ),
  row(
    'S02.09',
    'Cooperative yield/worker wait; navigation barrier; save backpressure',
    'Wait episode separately by cause; debt before/after, outstanding jobs',
    ['a:world-service.ts#WorldService.preparedNavigationBatch', 'a:host-work.ts#HostWork.reserve'],
  ),
  row(
    'S02.10',
    'Result finalization, acceptProgress/commit, debt subtraction and notification',
    'Published batch; actual game-time prefix, mutated owners, abandoned work',
    ['a:world-service.ts#WorldService.acceptProgress', 'd:kernel.ts#finishCommandTransition'],
  ),
  row(
    'S03.01',
    'Derive position/support/body/attachment inputs; candidate-index update/rebuild/reuse',
    'Changed body or spatial snapshot; cells/bounds/entities touched',
    ['d:spatial.ts#prepareChangedEntityCandidates', 'd:spatial.ts#spatialCandidateReader'],
  ),
  row(
    'S03.02',
    'Nearby/selected-body query; static bounds filtering; exact support/reach/clearance tests',
    'Query; candidate counts before/after each filter, geometry primitives',
    [
      'd:spatial.ts#nearbyEntities',
      'd:spatial.ts#SpatialCandidateIndex.querySphere',
      'd:spatial.ts#occupiedBodySweepQuery',
    ],
  ),
  row(
    'S03.03',
    'Target/approach preparation and route request deduplication',
    'Actor request; reused/pending/new routes, target revisions',
    ['d:kernel.ts#prepareApproach', 'd:kernel.ts#pendingNavigation'],
  ),
  row(
    'S03.04',
    'Navigation coordinator reconcile; queue; serialize/transfer; worker execution; result validation/application',
    'Route batch and request; mesh cache/build, path nodes, transfer bytes, stale results',
    [
      'a:navigation/coordinator.ts#NavigationCoordinator.reconcile',
      'a:navigation/coordinator.ts#NavigationCoordinator.pump',
      'a:navigation/coordinator.ts#NavigationCoordinator.completed',
    ],
  ),
  row(
    'S03.05',
    'Navigation mesh/prepared map/body construction versus actual route search',
    'Map/body build or path search; polygons/cells, visited nodes, success/unreachable/budget limit',
    [
      'a:navigation/backend.ts#RecastPlanner.prepare',
      'a:navigation/backend.ts#RecastPlanner.route',
    ],
  ),
  row(
    'S03.06',
    'Ground movement integration, steering and local body separation',
    'Moving actor interval; route segments, neighbors examined, collision/sweep queries',
    ['d:action-movement.ts#moveAlongPath', 'd:local-avoidance.ts#tryLocalAvoidance'],
  ),
  row(
    'S03.07',
    'Motion tracks/forecasts and crossing calculations (reconcileCrossings, sensoryCrossingBound)',
    'Moving pair/forecast; reused certificates, physical crossing candidates',
    ['d:motion-boundaries.ts#reconcileCrossings', 'd:motion-boundaries.ts#sensoryCrossingBound'],
  ),
  row(
    'S03.08',
    'Visibility/line-of-effect batch worker: main preparation; queue/transfer; worker ray loop; return/application',
    'Batch and ray; hit/miss/cache, batch size, active worker time and round-trip latency',
    [
      'a:geometry-batches.ts#GeometryBatches.compute',
      's:geometry.ts#prepareSightBatch',
      's:geometry.ts#completeGeometryBatch',
    ],
  ),
  row(
    'S03.09',
    'Actual movement mutation: set position/support; spatial/sensory dependency invalidation',
    'Moved entity; changed cells, changed-source notices, consumers dirtied',
    ['d:spatial-state.ts#setSpatialPosition', 'd:dependencies.ts#recordSensoryChange'],
  ),
  row(
    'S03.10',
    'Boundary exits, refuge and landing-route preparation',
    'Request; candidate sites, route/sweep work, accepted/refused/stale answers',
    [
      'd:native-response-refuge.ts#prepareNativeRefugeRoute',
      'd:native-response-flight.ts#prepareNativeFlightChoices',
    ],
  ),
  row(
    'S04.01',
    'Population/due-animal selection and native-controller eligibility',
    'Native opportunity; roster/queue visits, asleep/idle/due actors',
    [
      'd:animal-work-queue.ts#AnimalWorkQueue.due',
      'd:native-response-controller.ts#nativeResponseDue',
    ],
  ),
  row(
    'S04.02',
    'Wander countdown, retained route and route-choice evaluation',
    'Animal opportunity; actual RNG evaluations, route requests/reuses',
    [
      'd:native-response-controller.ts#nativeWanderRoute',
      'd:native-response-controller.ts#advanceAnimalWanderClock',
    ],
  ),
  row(
    'S04.03',
    'Received danger/sound/attack evidence and response-state reconciliation',
    'Animal-received cue; source candidates, repeated/changed inputs',
    [
      'd:native-response-controller.ts#reconcileNativeExposure',
      'd:native-response-controller.ts#acquireNativeSound',
      'd:native-response-controller.ts#acquireNativeResponseEvent',
    ],
  ),
  row(
    'S04.04',
    'Threat decision and candidate escape/refuge/flight routes',
    'Response review; route candidates, clearances, retained/new choices',
    [
      'd:native-response-controller.ts#nativeResponseDecision',
      'd:native-response-refuge.ts#nativeRefugeChoices',
      'd:native-response-flight.ts#prepareNativeFlightChoices',
    ],
  ),
  row(
    'S04.05',
    'Flight/ground response admission; public response event emission',
    'Admitted choice; state transitions versus continuing legs, emitted events and recipients',
    [
      'd:native-response-controller.ts#admitNativeFlightChoices',
      'd:kernel.ts#nativeMovementTransition',
    ],
  ),
  row(
    'S04.06',
    'advanceFlight, landing/falling and ground motion continuation',
    'Moving animal interval; segments, occupancy checks, landing/collision outcomes',
    ['d:flight.ts#advanceFlight', 'd:flight.ts#admittedLanding'],
  ),
  row(
    'S04.07',
    'Feeding/foraging source selection, approach and consumption',
    'Animal attempt; candidates, resource claims, successful feed/work',
    [
      'd:native-feeding.ts#prepareNativeFeeding',
      'd:native-feeding.ts#completeNativeFeeding',
      'd:native-response-navigation.ts#preparedForagingRoutes',
    ],
  ),
  row(
    'S04.08',
    'Response expiry, source loss, return to routine and native acoustic continuity',
    'Due episode; retained/ended states, discarded work',
    [
      'd:native-response-controller.ts#expireNativeAcousticPatterns',
      'd:native-response-controller.ts#reconcileNativeControl',
    ],
  ),
  row(
    'S05.01',
    'Select eligible observers; expire/clear inactive sensory participation',
    'Observer admission and phase roster; visits, dead/blocked/nonparticipating cases',
    ['d:kernel.ts#retirePerceptionEpisodes', 'd:perception-evidence.ts#beginPerceptionPhase'],
  ),
  row(
    'S05.02',
    'perceptionMeasurementWork, sightScopeDue, takeRoutineObservation',
    'Observer deadline check; broad/detail/contact/geometry/due/clean outcomes',
    [
      'd:perception-evidence.ts#perceptionMeasurementWork',
      'd:perception-timing.ts#sightScopeDue',
      'd:perception-timing.ts#takeRoutineObservation',
    ],
  ),
  row(
    'S05.03',
    'prepareExposure/prepareExposurePhase: shared source/body preparation; observer bindings; change-index/cached relation preparation',
    'Exposure phase; source/observer counts, changed dependencies, reused preparation',
    ['d:encounter-cache.ts#prepareExposure', 'd:encounter-cache.ts#prepareExposurePhase'],
  ),
  row(
    'S05.04',
    'Candidate retrieval: nearbySight/changed people; object query; selected detailed subjects; native danger sources',
    'Observer query by channel/cohort; entities/index cells visited and candidates returned',
    [
      'd:encounter-cache.ts#prepareExposurePhase.nearbySight',
      'd:kernel.ts#requestedDetailSubjects',
      'd:native-response-danger.ts#prepareNativeDangerSources',
    ],
  ),
  row(
    'S05.05',
    'Cheap candidate rejection: self, living/assembly eligibility, range and field of view',
    'Observer-candidate or batched real loop; candidates eliminated at each step',
    ['d:kernel.ts#updateEncounters.@body:prepareRay'],
  ),
  row(
    'S05.06',
    'sightPreparationQuery: cache lookup; ray construction; round-robin batch preparation',
    'Observer-candidate and batch; reused rays, actual rays, bytes, yields',
    ['d:perception.ts#sightPreparationQuery.@return', 'd:kernel.ts#updateEncounters.prepare'],
  ),
  row(
    'S05.07',
    'Wait for and consume geometry answers; visionQuery exact visibility result',
    'Observer-candidate; visible/blocked, main active segments, shared S03.08 reference',
    [
      'd:perception.ts#unblockedVisionQuery.@return',
      'd:perception.ts#visionQuery',
      's:geometry.ts#completeGeometryBatch',
    ],
  ),
  row(
    'S05.08',
    'Reconcile visible people/objects: unchanged membership, changed subset, full set, new/lost subjects',
    'Observer opportunity; old/new sizes, inserted/removed bindings',
    ['d:perception-evidence.ts#reconcileVisualEvidence', 'd:kernel.ts#updateEncounters'],
  ),
  row(
    'S05.09',
    'Landmark index and exposedPlaces; newly supported place exposure',
    'Observer/place opportunity; queried/visible/new places; no fabricated terrain knowledge',
    ['d:places.ts#exposedPlaces', 'd:places.ts#placeLandmarkIndex'],
  ),
  row(
    'S05.10',
    'Episode membership and unknown local-subject binding',
    'Observer subject change; allocated/reused/retired local identities',
    [
      'd:encounter-cache.ts#ensurePerceptionEpisode',
      'd:perception-evidence.ts#enrollReceivedCorrespondence',
    ],
  ),
  row(
    'S05.11',
    'Visual evidence dispatch: broad current changes; detail selected changes; complete reception',
    'Observer opportunity; references to S06 children, actual eligible/changed parts',
    [
      'd:perception-evidence.ts#reconcileVisualEvidence',
      'd:perception-evidence.ts#finishVisualReception',
    ],
  ),
  row(
    'S05.12',
    'Contact candidate acquisition, precise contact episodes and moving-contact continuation',
    'Observer/contact query; bodies tested, actual begin/change/end contact',
    [
      'd:contact-acquisition.ts#updateContactEpisodes',
      'd:perception-evidence.ts#reconcileContactEvidence',
    ],
  ),
  row(
    'S05.13',
    'Speech/sound emitter setup; receiver candidate index/query; attenuation/blockage tests',
    'Emission and listener; candidates, hearing/partial/no-hearing outcomes',
    [
      'd:perception.ts#speechObservers',
      'd:perception.ts#speechExposure',
      'd:perception.ts#physicalSoundExposure',
    ],
  ),
  row(
    'S05.14',
    'Listener-specific words, voice/identity cues and received sound evidence',
    'Listener utterance; words permitted/withheld, binding work, received bytes',
    ['d:speech.ts#perceiveSpeech', 'd:perception.ts#speechPerception'],
  ),
  row(
    'S05.15',
    'Native/combat exposure reactions and sensory continuation completion',
    'Observer phase; encounter transitions, retired work, completed broad/detail cuts',
    [
      'd:native-response-controller.ts#reconcileNativeExposure',
      'd:combat-encounters.ts#reconcileCombatSight',
      'd:perception-timing.ts#completeSightWork',
    ],
  ),
  row(
    'S05.16',
    'Sight loss/blocked senses and end-current handling',
    'Affected observer/subject; actual detail changes, lost bindings, retained last-known facts',
    [
      'd:perception-evidence.ts#endCurrentEvidence',
      'd:perception-evidence.ts#pruneLostBodyIndividuals',
    ],
  ),
  row(
    'S06.01',
    'Open reception/batch and prepare immutable/shared received source values',
    'Observer reception/shared source; new/reused source values and body parts',
    [
      'd:perception-evidence.ts#beginCurrentReception',
      'd:perception-evidence.ts#prepareVisualSourceValues',
      'd:received-values.ts#retainReceivedValue',
    ],
  ),
  row(
    'S06.02',
    'receiveCurrentChange/receiveCurrentChanges: determine actual changed meaning',
    'Received contact/part; compared, unchanged, changed, rejected/ineligible',
    [
      'd:perception-evidence.ts#receiveCurrentChange',
      'd:perception-evidence.ts#receiveCurrentChanges',
    ],
  ),
  row(
    'S06.03',
    'Current-contact lookup and field selection (currentContactGet, currentNativeFacet, currentContactNativeFacet)',
    'Actual lookup grouped by caller; source/facet/part counts, miss/hit',
    [
      'd:perception-current.ts#currentContactGet',
      'd:perception-current.ts#currentNativeFacet',
      'd:perception-current.ts#currentContactNativeFacet',
    ],
  ),
  row(
    'S06.04',
    'Current content mutation; metadata mutation; one broad confirmation; exceptional detail confirmation',
    'Observer/contact group; records dirtied, materialized old checks, inserted fields',
    [
      'd:perception-current.ts#currentFacetSet',
      'd:perception-current.ts#currentConfirmGroups',
      'd:perception-current.ts#setCurrentSightCheck',
      'd:perception-current.ts#updateCurrentFacetTimes',
    ],
  ),
  row(
    'S06.05',
    'Independent freshness/loss/eligibility and original/confirming frame reconstruction',
    'Selected facet/read scope; checks, stale/current/unavailable outcomes',
    [
      'd:perception-evidence.ts#effectiveCurrentFacetTimes',
      'd:perception-evidence.ts#currentChannelEligible',
      'd:perception-evidence.ts#receivedObservationFrame',
    ],
  ),
  row(
    'S06.06',
    'Local individual allocation, correspondence, recognition and name/familiarity updates',
    'Actual acquisition/recognition change; unknown/recognized, knowledge grants',
    [
      'd:knowledge.ts#allocateObserverIndividual',
      'd:perception-evidence.ts#prepareReceivedIdentityChange',
      'd:perception-evidence.ts#currentBodyAssociation',
    ],
  ),
  row(
    'S06.07',
    'Learn/retain recipe, personal social and Known-place support',
    'Knowledge change; new/corrected/forgotten entries, independently retained evidence',
    [
      'd:knowledge.ts#learnRecipe',
      'd:known-place-evidence.ts#acquireKnownPlaceEvidence',
      'd:known-place-evidence.ts#acquireKnownPlaceCapsules',
    ],
  ),
  row(
    'S06.08',
    'Capture exact observation/evidence cut; resolve captured support/proof',
    'Capture/read; selected fields, bytes, source dependencies, reused projection',
    [
      'd:perception-evidence.ts#captureEvidenceCut',
      'd:perception-evidence.ts#captureCurrentFacet',
      'd:perception-evidence.ts#prepareCurrentBodyReadScope',
    ],
  ),
  row(
    'S06.09',
    'Correct/forget/retire evidence; dependent invalidation and pending-work revocation',
    'Correction operation; reachable dependent owners/keys, not every known subject',
    [
      'd:experience.ts#correctExperience',
      'd:experience.ts#forgetExperience',
      'd:temporal-evidence.ts#invalidateTemporalEvidence',
    ],
  ),
  row(
    'S06.10',
    'Finish reception: install current checks, publish change notice, preserve identity and close batch',
    'Observer batch; final mutations, downstream attention/history calls',
    [
      'd:perception-evidence.ts#finishVisualReception',
      'd:perception-current.ts#withCurrentContactBatch',
    ],
  ),
  row(
    'S07.01',
    'Dirty/due attention selection and preparation validity',
    'Observer opportunity; cached/no-work/changed/deadline reasons',
    [
      'd:attention.ts#workingFor',
      'd:attention.ts#beginAttentionPreparation',
      'd:attention.ts#nextAttentionWorkAt',
    ],
  ),
  row(
    'S07.02',
    'attentionCandidates: source selection; current received body/field reads; description inputs',
    'Observer and candidate; visited sources/parts, useful eligible candidates',
    ['d:attention.ts#attentionCandidates', 'd:perception-current.ts#prepareReceivedAttentionRead'],
  ),
  row(
    'S07.03',
    'bodyDescriptionMeaning/descriptions: input gathering versus reused/rebuilt meaning',
    'Candidate description; sibling reads, cache hits, output bytes',
    ['d:attention.ts#bodyDescriptionMeaning', 'd:attention.ts#descriptions'],
  ),
  row(
    'S07.04',
    'Familiarity/focus/urgency inputs; rank; stable winner reuse; discovery-slot progress',
    'Observer competition; candidates scored/sorted, capacity, retained/changed winners',
    [
      'd:attention.ts#rank',
      'd:attention.ts#retainedSelection',
      'd:attention.ts#updateAttention.take',
    ],
  ),
  row(
    'S07.05',
    'Entry/exit of detailed attention and selected-track enrollment/difference',
    'Observer transition; subjects/tracks entered/exited, history captures referenced',
    [
      'd:perception-evidence.ts#selectionChanged',
      'd:perception-evidence.ts#noteReceivedAttention',
      'd:perception-evidence.ts#reconcileReceivedAttention',
    ],
  ),
  row(
    'S07.06',
    'Held scene query and geometric anchors',
    'Scene read; selected subjects, broad context, inherited geometry, actual reads',
    ['d:received-scene.ts#prepareReceivedSceneRead', 'd:received-scene.ts#receivedScene'],
  ),
  row(
    'S07.07',
    'Received terrain/boundary/context geometry: candidate preparation; physical checks; retained coverage',
    'Observer geometry opportunity; features/cells considered, acquired/reused/lost',
    [
      'd:received-geometry.ts#refreshReceivedGeometry',
      'd:received-geometry.ts#refreshGeometry',
      'd:received-geometry.ts#finalizeGeometry',
    ],
  ),
  row(
    'S07.08',
    'evaluateAttentionRelations: select candidates; resolve bounds; evaluate changes; publish cues',
    'Observer relation opportunity and pair; pairs examined, skipped/changed cues',
    [
      'd:received-geometry.ts#evaluateAttentionRelations',
      'd:attention.ts#applyAttentionRelationEvaluations',
    ],
  ),
  row(
    'S07.09',
    'Detection support patterns and deadline settlement',
    'Received cue/pattern; candidates, evidence dependencies, completed/expired patterns',
    [
      'd:perception-support.ts#receiveDetectionSupport',
      'd:perception-support.ts#settleDetectionSupport',
    ],
  ),
  row(
    'S07.10',
    'Interpretation eligibility, attention presentation/acknowledgement and explicit focus changes',
    'Consumer/attention request; selected sources, no-op/update, queued thinking',
    [
      'd:attention.ts#setAttentionFocus',
      'd:attention.ts#captureAttentionPresentation',
      'd:attention.ts#acknowledgeAttention',
      'a:attention-request.ts#attentionRequest',
    ],
  ),
  row(
    'S08.01',
    'emit/recordEvent: source event allocation, payload and audience preparation',
    'Event; type, payload bytes, eligible receivers',
    ['d:events.ts#recordEvent', 'd:events.ts#emit', 'd:event-audience.ts#externalAudience'],
  ),
  row(
    'S08.02',
    'Observer-specific disclosure, awareness acquisition and relevance/cue handling',
    'Event-recipient; permitted parts, awareness records, cues, retention outcomes',
    [
      'd:perception-evidence.ts#acquireAwarenessObservation',
      'd:experience.ts#acquireEventAwareness',
      'd:perception-evidence.ts#attendedEventParticipants',
    ],
  ),
  row(
    'S08.03',
    'Begin/append/flush received acquisition batches',
    'Actor batch; occurrences versus baselines versus detail changes',
    [
      'd:temporal-evidence.ts#beginTemporalAcquisition',
      'd:temporal-evidence.ts#flushTemporalAcquisition',
      'd:temporal-evidence.ts#flushReceivedBatch',
    ],
  ),
  row(
    'S08.04',
    'captureTemporalCurrent/observation/geometry: compare selected prior content and capture actual changes',
    'Attended track/part; unchanged checks, new changes, closure/loss/exit records',
    [
      'd:temporal-evidence.ts#captureTemporalCurrent',
      'd:temporal-evidence.ts#captureTemporalObservation',
      'd:temporal-evidence.ts#captureTemporalGeometry',
    ],
  ),
  row(
    'S08.05',
    'Shared value intern/lookup and proof/frame/descriptor preparation',
    'Value/receipt; reused/new bytes, observer references, expensive encoding',
    [
      'd:received-values.ts#retainReceivedValue',
      'd:temporal-evidence.ts#valueEncoding',
      'd:perception-evidence.ts#retainObservationFrame',
    ],
  ),
  row(
    'S08.06',
    'Recent charge directories, quota/accounting, page append/rollover and terminal reservations',
    'Appended receipt/page; logical bytes, physical page bytes, member visits',
    [
      'd:temporal-evidence.ts#appendTemporalReceipt',
      'd:temporal-evidence.ts#appendTemporalChargeDirectory',
      'd:experience.ts#reserveExperienceAddition',
    ],
  ),
  row(
    'S08.07',
    'Action-result binding and automatic personal-account/impression admission',
    'Action outcome; result accounts, retained trivial/meaningful effects, dependency closure',
    [
      'd:action-experience.ts#endActivity',
      'd:experience.ts#admitAutomaticExperience',
      'd:remembered-impressions.ts#createRememberedImpression',
    ],
  ),
  row(
    'S08.08',
    'Current/recent source eligibility, chronological selection and materialization',
    'Consumer read; selected versus visited receipts, independent stale/missing evidence',
    [
      'd:temporal-evidence.ts#selectTemporalHistory',
      'd:temporal-evidence.ts#temporalReceiptForRead',
      'd:perception-evidence.ts#readReceivedSources',
    ],
  ),
  row(
    'S08.09',
    'Retain required support; release/expire/correct chronology and recognition support',
    'Actual retention/correction; sources, dependents, blocks, protected entries',
    [
      'd:temporal-evidence.ts#retainTemporalSupport',
      'd:temporal-evidence.ts#releaseTemporalSupport',
      'd:temporal-evidence.ts#advanceTemporalRecent',
    ],
  ),
  row(
    'S08.10',
    'Event finish: reconcile semantic effects; immutable sealing; history notification',
    'Event/transition; drafts finalized, changed owners, downstream invalidation',
    ['d:events.ts#finish', 'd:events.ts#finishInDraft', 'd:events.ts#reconcileTransition'],
  ),
  row(
    'S09.01',
    'Decide whether thinking/maintenance is due; budget/slot/deadline admission',
    'Actor opportunity; no-work/budget-blocked/admitted; SQL reads and queued work',
    [
      'a:ai-director.ts#AiDirector.update',
      'a:ai-director.ts#AiDirector.readSchedule',
      'a:ai-director.ts#AiDirector.admission',
    ],
  ),
  row(
    'S09.02',
    'Capture cause, current evidence, attention and exact revision/identity bindings',
    'Decision preparation; evidence IDs/parts, capture bytes, repeated reads',
    ['a:decision-observation.ts#decisionObservation', 'a:situation-context.ts#captureSituation'],
  ),
  row(
    'S09.03',
    'Assemble body, goals, obligations, action choices, inventory and learned methods',
    'Decision stage; candidates before/after filtering, validations, serialized bytes',
    [
      'a:decision-context.ts#prepareDecision',
      'a:decision-context.ts#decisionActionCandidates',
      'a:decision-context.ts#selectDecisionActions',
    ],
  ),
  row(
    'S09.04',
    'Recall selection: lexical terms; personal SQL/vector lookup; pending/durable merge; ranking',
    'Query; scanned/returned/hydrated rows, cache behavior, result bounds',
    [
      'a:recall.ts#RecallService.select',
      'a:memory-repository.ts#MemoryRepository.select',
      'a:recall.ts#candidateSet',
    ],
  ),
  row(
    'S09.05',
    'Resolve recent chronology, source support and privacy; build permitted scene/model spatial frames',
    'Context read; dependencies, receipts, point transforms, discarded inaccessible facts',
    [
      'a:situation-context.ts#prepareTemporalHistoryForModel',
      'a:decision-context.ts#readCapturedSituationHistory',
      'a:situation-context.ts#expandSituation',
    ],
  ),
  row(
    'S09.06',
    'Fit/encode actual prompt and schemas, context byte budgets and truncation decisions',
    'Prepared request; bytes by section, candidates dropped; no provider call',
    ['a:decision-context.ts#fitDecisionEnvelope', 'a:decision-context.ts#prepareDecision.generate'],
  ),
  row(
    'S09.07',
    'Decode/validate controlled result; bind references; revalidate against current world',
    'Submitted decision result; valid/stale/refused, elapsed pending interval',
    [
      'a:decision-context.ts#validateCapturedDecision',
      'a:decision-context.ts#validateCapturedSituation',
      'a:decision-publication.ts#decisionClaimCurrent',
    ],
  ),
  row(
    'S09.08',
    'Publish decision/response, action proposal, memory/reflection/learning result',
    'Accepted publication; mutation/save/receipt waits, actual executed outcomes',
    [
      'a:decision-publication.ts#finishDecisionPublication',
      'a:ai-director.ts#AiDirector.decideAttempt',
    ],
  ),
  row(
    'S09.09',
    'Prepared responses, reconsideration, escalation bookkeeping and cancellation',
    'Attempt; reused/invalidated/withdrawn work, queue ages; transport disabled',
    [
      'a:ai-director.ts#AiDirector.preparedResponse',
      'a:ai-director.ts#AiDirector.retrySupersededResponse',
      'a:ai-director.ts#AiDirector.cancel',
    ],
  ),
  row(
    'S09.10',
    'Invention/authoring server preparation and trusted declaration admission from supplied valid proposals',
    'Native/server operation; family/tool/schema candidates, dependency checks, resulting definitions',
    [
      'a:world-authoring.ts#WorldAuthoringService.localDraftCheck',
      'a:world-authoring.ts#WorldAuthoringService.applyLocal',
      'd:declarations.ts#admitDeclaration',
    ],
  ),
  row(
    'S10.01',
    'Movement/follow/evasion: action-movement.ts, follow.ts, evasion.ts, player-steering.ts',
    'Bound target/path, ordinary traversal, replacement, stop, occluded/lost target',
    [
      'd:action-movement.ts#moveAlongPath',
      'd:follow.ts#updateFollowPath',
      'd:evasion.ts#prepareEvasion',
    ],
  ),
  row(
    'S10.02',
    'Needs/body/status: living.ts, body-policy.ts, body-state.ts, world-modules.ts, status-effects.ts, native-status-preparation.ts, conditions.ts',
    'Installed attribute/rate preparation and reuse; integration; threshold transitions; status candidates/conditions; start/stop/expiry; health/death',
    [
      'd:status-effects.ts#reconcileStatusEffects',
      'd:status-effects.ts#prepareStatusIntegration',
      'd:status-effects.ts#integrateStatusRates',
      'd:living.ts#commitBodyEffects',
    ],
  ),
  row(
    'S10.03',
    'Gathering/resources: gathering.ts, resource-claims.ts, stock-activity.ts',
    'Tool/resource eligibility, reservation contention, quantity/yield, depletion/release',
    [
      'd:gathering.ts#gatheringYield',
      'd:resource-claims.ts#reserveResource',
      'd:resource-claims.ts#applyResourceGroup',
    ],
  ),
  row(
    'S10.04',
    'Manufacture/composition: manufacture.ts, declarations.ts, recipe-records.ts, activity-hosts.ts',
    'Select/claim materials/tools, family validation, finite work, lot/output creation, learned method grants',
    [
      'd:manufacture.ts#prepareManufacture',
      'd:manufacture.ts#manufactureOutputLots',
      'd:recipe-records.ts#prepareRecipeLearning',
    ],
  ),
  row(
    'S10.05',
    'Inventory/custody: item-handling.ts, stock-transfer.ts, objects.ts, material-inventory.ts, equipment.ts, contents-exposure.ts',
    'Pick/drop/transfer/split/merge/equip/unequip; capacity/access; inspected versus hidden contents; changed custody indexes',
    [
      'd:item-handling.ts#pickUpItems',
      'd:item-handling.ts#dropItems',
      'd:stock-transfer.ts#transferStock',
      'd:equipment.ts#equipmentProblem',
      'd:inventory-inspection.ts#inspectPossessions',
    ],
  ),
  row(
    'S10.06',
    'Food/fire/fishing: food-preparation.ts, meals.ts, consumption-stock.ts, hearths.ts, finite-casts.ts, base fire/river-fishing policy',
    'Claims, cast/work completion, cook/eat/feed/replenish, fire fuel/rates, extinguish/refuse',
    [
      'd:food-preparation.ts#cookingPreparations',
      'd:consumption-stock.ts#resolveConsumptionStock',
      'd:hearths.ts#completeHearth',
      'd:finite-casts.ts#castBindingProblem',
    ],
  ),
  row(
    'S10.07',
    'Ranged combat: ranged.ts, ranged-policy.ts, combat-execution.ts, packages/spatial/src/projectile-contact.ts',
    'Aim/retarget, release proof/ammunition, projectile candidate bodies, trajectory/contact, hit/miss, defense/body effects',
    [
      'd:ranged.ts#bindAim',
      'd:ranged.ts#releaseShot',
      'd:ranged.ts#advanceProjectiles',
      's:projectile-contact.ts#movingBodyContact',
    ],
  ),
  row(
    'S10.08',
    'Melee/guard/threat: strikes.ts, contact-defense.ts, combat-encounters.ts, territorial-threat.ts, combat-consent.ts',
    'Attack/guard offers and consent, moving strike, contact/recovery, encounter renewal/expiry, friendly-harm refusal',
    [
      'd:combat-execution.ts#bindAttackExecution',
      'd:combat-encounters.ts#reconcileCombatSight',
      'd:contact-defense.ts#commitContactImpact',
      'd:territorial-threat.ts#territorialIntention',
    ],
  ),
  row(
    'S10.09',
    'Build/repair/cover/gates: assemblies.ts, boundary-assemblies.ts, boundary-phase.ts, boundary-impacts.ts, assembly-use.ts, gate-operations.ts, construction-contributions.ts',
    'Material/site/permission queries, phased work, collision/support change, gate use, damage/failure/repair, dependent geometry invalidation',
    [
      'd:assemblies.ts#evaluateAssemblyPhase',
      'd:assemblies.ts#commitAssemblyPhase',
      'd:gate-operations.ts#prepareGateAction',
      'd:boundary-impacts.ts#completeBoundaryImpact',
    ],
  ),
  row(
    'S10.10',
    'Plans/activities/work batches: agency.ts, activity-execution.ts, work-batches.ts, activity-learning.ts',
    'Frontier choice/binding, advance/end/cancel/suspend/resume, dependency changes, produced output bindings, learned sequence',
    [
      'd:agency.ts#readyPlanStep',
      'd:agency.ts#suspendCurrentWork',
      'd:agency.ts#resumeSuspended',
      'd:activity-execution.ts#firstActivityCommand',
      'd:work-batches.ts#compileWorkBatch',
    ],
  ),
  row(
    'S10.11',
    'Speech/teaching/records/practice/coaching: speech.ts, knowledge.ts, coaching.ts, practical-competence.ts',
    'Real utterance/recipient, teach/learn-record, outcome feedback, practice progression; no language generation',
    [
      'd:speech.ts#perceiveSpeech',
      'd:knowledge.ts#learnRecipe',
      'd:coaching.ts#applyCoaching',
      'd:practical-competence.ts#creditRelease',
    ],
  ),
  row(
    'S10.12',
    'Offers/trades/cooperation/outings: handover.ts, outings.ts, cooperation.ts, social-offers.ts, related indexes',
    'Offer/accept/decline/expire, reservation/custody transfer, destination/consent changes, shared-work control',
    [
      'd:handover.ts#executeHandover',
      'd:outings.ts#executeOuting',
      'd:cooperation.ts#personalCooperationTerms',
      'd:social-offers.ts#socialOfferAdmissionProblem',
    ],
  ),
  row(
    'S10.13',
    'Compacts/promises/appraisals/family: social-compacts.ts, commitments.ts, appraisals.ts, personal-social.ts, base family.ts',
    'Due selection, observed obligations, relationship/recognition inputs, correction/expiry, private versus public consequences',
    [
      'd:social-compacts.ts#executeCompact',
      'd:commitments.ts#advanceCommitments',
      'd:appraisals.ts#appraisePerceivedEvent',
      'd:personal-social.ts#mutualSocialReception',
    ],
  ),
  row(
    'S10.14',
    'Death/remains/recovery: remains.ts, reincarnation.ts, scar-effects.ts, participation.ts',
    'Body loss, possession transfer, harvest/decay, scar treatment, replacement life, retire old evidence/control',
    [
      'd:remains.ts#advanceRemains',
      'd:reincarnation.ts#respawnPlayer',
      'd:reincarnation.ts#completeScarTreatment',
      'd:participation.ts#departActor',
    ],
  ),
  row(
    'S10.15',
    'Explicit world/edit changes: god-tools.ts, world-composition.ts, world-modules.ts, server world-authoring*.ts/world-input.ts',
    'Owner-authorized spawn/remove/edit, native definition install/validation, dependency invalidation, permission and paused-world behavior',
    [
      'd:god-tools.ts#spawnWorldEntity',
      'd:god-tools.ts#editPerson',
      'd:declarations.ts#admitDeclaration',
      'a:world-authoring.ts#WorldAuthoringService.localMutation',
    ],
  ),
  row(
    'S11.01',
    'Select authorized projection/snapshot and validate its revision',
    'View request/subscriber; cache hits, waits, stale retries',
    ['a:http.ts#initializeGameServer.currentView', 'a:world-service.ts#WorldService.currentScope'],
  ),
  row(
    'S11.02',
    'projectView: self/status/control; nearby perceived entities; inventory/actions; social/work/places',
    'Recipient projection and each section; visited entities/fields, actual output',
    [
      'a:view.ts#projectView',
      'a:inventory-view.ts#inventoryItemsView',
      'a:public-contact-references.ts#projectActionCatalogue',
    ],
  ),
  row(
    'S11.03',
    'Identity labels, permitted details and private reference construction',
    'Exposed entity/reference; source/facet reads, withheld fields, reuse',
    [
      'a:public-contact-references.ts#currentContactReference',
      'd:perception-evidence.ts#prepareCurrentBodyReadScope',
      'a:public-contact-references.ts#projectObservedAssembly',
    ],
  ),
  row(
    'S11.04',
    'projectPatch: compare previously published view; build removed/changed fields/events',
    'Subscriber update; compared entries, empty/nonempty patches, bytes',
    ['a:view.ts#projectPatch', 'a:view.ts#changedFields', 'a:view.ts#eventChanges'],
  ),
  row(
    'S11.05',
    'SSE fan-out, encoding, buffering and socket/backpressure settlement',
    'Publication/subscriber; connections, queued/dropped/coalesced messages, bytes',
    ['a:http.ts#initializeGameServer.writeStream'],
  ),
  row(
    'S11.06',
    '/api/state full response encoding and transport',
    'Request; full view bytes, projection versus JSON/HTTP work',
    ['a:http.ts#writeJson'],
  ),
  row(
    'S11.07',
    'History/journal page: SQL selection; pending merge; evidence materialization; disclosure; story projection',
    'Page request; scanned/selected events, sources hydrated, narrative reuse',
    [
      'a:history.ts#HistoryRepository.readEventPage',
      'a:perceived-events.ts#readPerceivedEvents',
      'a:history.ts#HistoryRepository.project',
    ],
  ),
  row(
    'S11.08',
    'Inventory/recipe/activity/knowledge/memory/place page and explicit inspection',
    'Page/request family; requested versus visited rows, gated reads, cold/hot',
    [
      'a:inventory-view.ts#objectHistoryPage',
      'a:known-places.ts#inspectKnownPlace',
      'a:person-memory-page.ts#createPersonMemoryPager',
    ],
  ),
  row(
    'S11.09',
    'Deterministic narration/story selection and interpretation of supplied narration result',
    'Source event/page; selection candidates, permission/revision checks; no model generation',
    [
      'a:history.ts#HistoryRepository.storySelection',
      'a:history.ts#HistoryRepository.saveStory',
      'a:history.ts#projectNarration',
    ],
  ),
  row(
    'S12.01',
    'Accept transition in memory, install immutable baseline and determine affected record owners',
    'Accepted publication; changes, reused owners, invalidated baselines',
    [
      'a:world-service.ts#WorldService.acceptProgress',
      'a:world-service.ts#WorldService.prepareSnapshot',
    ],
  ),
  row(
    'S12.02',
    'WorldRecords.prepareRecords: enumerate actual changes; compare predecessors; create/delete distinction',
    'Preparation; keys visited, changed rows, fallback full scans and reason',
    [
      'a:world-records.ts#WorldRecords.prepareRecords',
      'a:world-records.ts#WorldRecords.proveRecordCreates',
    ],
  ),
  row(
    'S12.03',
    'Encode content; encode metadata; reuse encoding; materialize temporal row changes',
    'Row/family and batch; field visits, row images, encoded bytes, cache hit/miss',
    [
      'a:world-records.ts#encodedBody',
      'a:world-records.ts#materializeTemporalChanges',
      'a:current-contact-codec.ts#currentContactPayload',
      'a:current-contact-codec.ts#currentContactMetadata',
    ],
  ),
  row(
    'S12.04',
    'Merge pending saves, temporal appends, reference and source-version changes',
    'Accepted batch; superseded rows/bytes, retained pending state, work duplicated',
    [
      'a:pending-world-save.ts#PendingWorldSave.admit',
      'a:history-preparation.ts#mergeHistoryPreparation',
      'a:source-version-retention.ts#mergeSourceVersionChanges',
    ],
  ),
  row(
    'S12.05',
    'Prepare source closure, protected references and original/pending removal intent',
    'Batch; keys selected, bodies versus metadata loaded, dependent versions',
    [
      'a:source-version-retention.ts#prepareSourceVersions',
      'a:received-value-ownership.ts#ReceivedValueOwnership.project',
    ],
  ),
  row(
    'S12.06',
    'Save scheduling, age/byte backpressure and explicit flush admission',
    'Save opportunity; empty/not-due/due, unsaved age/bytes, waiting duration',
    [
      'a:world-service.ts#WorldService.scheduleSave',
      'a:world-service.ts#WorldService.flushAcceptedProgress',
      'a:world-service.ts#WorldService.pendingAdmissionOpen',
    ],
  ),
  row(
    'S12.07',
    'SqlGameRepository.commit/applyWorldTables: transaction, grouped row batches, history/index writes',
    'Durable batch; S13 children, logical operations versus round trips',
    ['a:store.ts#SqlGameRepository.commit', 'a:store.ts#SqlGameRepository.applyWorldTables'],
  ),
  row(
    'S12.08',
    'Successful settlement: install durable revision/baseline, wake waiters, release old residents',
    'Settled batch; acknowledged commands, owner references released',
    [
      'a:world-service.ts#WorldService.publishDurable',
      'a:world-service.ts#WorldService.adoptDurableHistory',
    ],
  ),
  row(
    'S12.09',
    'Save failure/rollback, accepted-state protection and subsequent recovery',
    'Fault scenario only; no duplicate effects, rejected versus already accepted work',
    [
      'a:world-service.ts#WorldService.failProgressSave',
      'a:postgres.ts#PostgresDatabase.afterRollback',
    ],
  ),
  row(
    'S13.01',
    'Read/write lane queue admission and hold, by submitting semantic owner',
    'Query/transaction; depth, wait, expiration, hold, concurrent blocked requests',
    ['a:postgres.ts#PostgresDatabase.read', 'a:work-lane.ts#WorkLane.run'],
  ),
  row(
    'S13.02',
    'Live pending/durable read cut: scope selection; SQL removal compilation; overlay merge',
    'Read scope; selected owners/keys, expanded rows, repeated preparation',
    [
      'a:postgres.ts#PostgresDatabase.resolveLiveOverlay',
      'a:live-read-overlay.ts#compileScopeRemovals',
      'a:live-read-overlay.ts#LiveReadOverlay.rewrite',
    ],
  ),
  row(
    'S13.03',
    'SQL batch/parameter preparation and grouping (SqlWriteBatch, row batches)',
    'Batch; statements, rows, parameters/bytes, transport grouping',
    [
      'a:sql-rows.ts#SqlWriteBatch.flush',
      'a:sql-rows.ts#sqlRowBatches',
      'a:sql-rows.ts#insertRows',
    ],
  ),
  row(
    'S13.04',
    'Driver submission→callback and row decode/materialization',
    'Adapter call/template; success/failure, returned/affected rows, latency',
    ['a:postgres.ts#PostgresDatabase.query', 'a:postgres.ts#PostgresDatabase.query.execute'],
  ),
  row(
    'S13.05',
    'Transaction begin→commit/rollback and nested scope reuse',
    'Transaction/owner; statements, held time, rollback and contention',
    ['a:postgres.ts#PostgresDatabase.transaction', 'a:postgres.ts#PostgresDatabase.inTransaction'],
  ),
  row(
    'S13.06',
    'PostgreSQL execution/plan statistics and sampled locks/I/O/CPU',
    'Query family/backend/window; actual execution plans outside timed case',
    ['t:profile-resources.ts#collectDatabaseWindowStats'],
  ),
  row(
    'S13.07',
    'Personal history/recall/reference indexes, joins and hydration',
    'Actual repository query; filter inputs, rows before/after expansion, fan-out',
    [
      'a:memory-repository.ts#MemoryRepository.hydrate',
      'a:memory-repository.ts#MemoryRepository.readSelection',
      'a:memory-repository.ts#MemoryRepository.readRequired',
    ],
  ),
  row(
    'S13.08',
    'Session/receipt/permission/job/operational metadata queries and caches',
    'Owner/query; hits/misses, repeated no-change reads, actual durable writes',
    [
      'a:command-receipts.ts#CommandReceipts.get',
      'a:authority.ts#AuthorityRepository.authenticationRead',
      'a:store.ts#SqlGameRepository.getJob',
    ],
  ),
  row(
    'S14.01',
    'Deadline/due actor selection and rescheduling',
    'Maintenance opportunity; actors visited, reused indexes, actual due owners',
    [
      'a:retention-deadlines.ts#RetentionActorSelection.select',
      'a:world-service.ts#WorldService.scheduleRetention',
    ],
  ),
  row(
    'S14.02',
    'Natural recent expiry and sensor-awareness expiry',
    'Due actor/block; cutoff changes, pages visited, logical releases',
    ['a:recent-retention.ts#retireRecentHistory', 'd:experience.ts#expireSensoryAwareness'],
  ),
  row(
    'S14.03',
    'Account pressure/age selection: metadata; dependencies; protected membership; plan',
    'Actor/batch/cause; candidate versus actually retired accounts, SQL/bytes',
    [
      'a:account-retention.ts#prepareAccountRetention',
      'a:retention-metadata.ts#RetentionMetadata.capture',
      'a:account-retention.ts#prepareAccountRetentionPlan',
    ],
  ),
  row(
    'S14.04',
    'Apply retirement plan and race/stale revision checks',
    'Plan; accepted/stale/no-op, current pending work preserved',
    ['a:account-retention.ts#applyAccountRetentionPlan'],
  ),
  row(
    'S14.05',
    'Standalone support and learned-name/place retention',
    'Due support/knowledge change; dependency closure, selected aliases, removed/protected',
    [
      'a:retention-cleanup.ts#releaseUnusedTemporalSupports',
      'd:temporal-evidence.ts#maintainRecognitionKnowledge',
      'a:retention-cleanup.ts#cleanupRetiredIndividuals',
    ],
  ),
  row(
    'S14.06',
    'Shared-value/reference collection and cold-storage reclamation',
    'Cleanup batch; candidate/protected/removed values and bytes, actual SQL/WAL',
    ['a:received-value-ownership.ts#ReceivedValueOwnership.collect'],
  ),
  row(
    'S14.07',
    'Search/vector/derived-memory invalidation and cleanup',
    'Source edit/batch; indexes/derivatives touched, privacy revocation before deletion',
    [
      'a:memory-repository.ts#MemoryRepository.trimDerived',
      'a:memory-repository.ts#MemoryRepository.invalidateSourceReads',
    ],
  ),
  row(
    'S14.08',
    'Summarization/reflection/learning intake and supplied-result application',
    'Maintenance batch; selected records, context preparation, accepted memory; provider excluded',
    [
      'a:memory-consolidation.ts#consolidationRequests',
      'a:cognition-maintenance.ts#CognitionMaintenance.startNow',
      'a:cognition-maintenance.ts#CognitionMaintenance.learnActivities',
    ],
  ),
  row(
    'S14.09',
    'Maintenance mode and admission/restore generation transitions',
    'Operational change; schedule/banner queries, no-op reuse, accepted-receipt preservation',
    [
      'a:maintenance.ts#MaintenanceSchedule.transition',
      'a:world-service.ts#WorldService.changeMaintenance',
    ],
  ),
  row(
    'S14.10',
    'Maintenance backlog and reclamation balance',
    'Measured window; created versus reclaimed debt, oldest eligible age, resident versus durable bytes',
    ['t:profile-resources.ts#collectStorageCensus'],
  ),
  row(
    'S15.01',
    'Manual/autosave admission, settle accepted state and establish complete snapshot',
    'Save request; queue/barrier/capture-ready latency, revision and row set',
    ['a:world-service.ts#WorldService.createSave', 'a:game-saves.ts#GameSaves.admit'],
  ),
  row(
    'S15.02',
    'Worker export: database selection/stream; JSONL encoding; checksum; file write',
    'Checkpoint/table; rows/bytes, active worker time, transfer/I/O waits',
    [
      'a:checkpoint-worker-client.ts#CheckpointWorker.capture',
      'a:checkpoint.ts#writeCheckpoint',
      'a:checkpoint.ts#checkpointLines',
    ],
  ),
  row(
    'S15.03',
    'Metadata publication/atomic rename, retention rotation and asset-reference checks',
    'Saved slot; files, bytes, durable completion; assets staged, not downloaded',
    [
      'a:save-files.ts#SaveFiles.writeStream',
      'a:game-saves.ts#GameSaves.rotate',
      'a:save-files.ts#syncDirectory',
    ],
  ),
  row(
    'S15.04',
    'Read/decode/integrity-check checkpoint; current-format model validation',
    'Restored world; rows/bytes/validation counts, private/source closure integrity',
    [
      'a:checkpoint.ts#readCheckpoint',
      'a:save-files.ts#SaveFiles.verify',
      'a:upgrade-world.ts#validateCurrentWorldState',
    ],
  ),
  row(
    'S15.05',
    'Install restored canonical tables/state, rebuild current indexes, rebind control/authority',
    'Restore; SQL writes, derived builds, canceled stale jobs, ready latency',
    [
      'a:world-service.ts#WorldService.restoreSave',
      'a:game-saves.ts#GameSaves.install',
      'a:authority.ts#AuthorityRepository.restoreBindings',
    ],
  ),
  row(
    'S15.06',
    'First resumed native action, observation, memory read and save after restore',
    'Restored caller; cold rebuilds versus subsequent warm cost',
    ['a:world-service.ts#WorldService.tickBatch', 'a:world-service.ts#WorldService.memoryContext'],
  ),
  row(
    'S15.07',
    'Failed/abandoned checkpoint, orderly recovery and current receipt replay',
    'Fault scenario; partial output cleanup, preserved accepted effects, waiters',
    [
      'a:game-saves.ts#GameSaves.recordFailure',
      'a:checkpoint-worker-client.ts#CheckpointWorker.close',
      'a:world-service.ts#WorldService.commandReceipt',
    ],
  ),
  row(
    'S16.01',
    'Draft creation/access/read-only view; changed-owner tracking',
    'Actual enclosing scope and sampled accessor; proxy/owner visits, rebuild/reuse',
    ['d:draft.ts#draftWorld', 'd:draft.ts#readOnlyDraftView', 'd:draft.ts#touchNativeEvidence'],
  ),
  row(
    'S16.02',
    'finishWorld/finishTransitionWorld, freezeWorld, native owner sealing',
    'Finalization; objects/arrays visited/changed/reused, event-only versus native batch',
    [
      'd:draft.ts#finishWorld',
      'd:draft.ts#finishTransitionWorld',
      'd:draft.ts#freezeWorld',
      'd:draft.ts#sealNativeOwner',
    ],
  ),
  row(
    'S16.03',
    'Entity/item lookup, roster iteration/counting, index build/update',
    'Actual query/loop; keys visited versus returned, caller attribution',
    [
      'd:entity-collection.ts#entityGet',
      'd:entity-index.ts#worldRootEntityIds',
      'd:entity-index.ts#worldRootCount',
      'd:spatial.ts#SpatialCandidateIndex.query',
    ],
  ),
  row(
    'S16.04',
    'Record-map/array changes, append journals, snapshot projection and clone/serialization',
    'Change set/capture; entries copied, encoded bytes, unchanged identities reused',
    [
      'd:records.ts#immutableDataSnapshot',
      'd:records.ts#jsonEncoding',
      'd:draft.ts#appendSnapshot',
      'a:record-pages.ts#tableRows',
    ],
  ),
  row(
    'S16.05',
    'Definition/pin/schema/permission validation and cache invalidation',
    'Owning validation boundary; fields/dependencies visited, repeated trusted checks',
    [
      'd:world-modules.ts#validateWorldModules',
      'd:perception-evidence.ts#validateSensoryFacet',
      'a:authority.ts#AuthorityRepository.assertFence',
    ],
  ),
  row(
    'S16.06',
    'Allocation and GC; process memory and non-JS native work',
    'Separate sampled/profile window; allocated/retained/RSS, GC pause distribution',
    [
      't:profile-resources.ts#startAllocationCapture',
      't:profile-resources.ts#sampleOwnedResources',
    ],
  ),
  row(
    'S16.07',
    'Unmapped synchronous/worker CPU and asynchronous waits',
    'Residual evidence with actual stack/source; expand named rows if material',
    ['t:profile-resources.ts#attributeCpuProfile'],
  ),
];
const parentSites: readonly [string, string, string, string][] = [
  ['S00.entry.ready', 'Server readiness', 'server lifecycle', 'a:http.ts#initializeGameServer'],
  [
    'S00.entry.close',
    'Server shutdown',
    'server lifecycle',
    'a:http.ts#initializeGameServer.shutdownOnce',
  ],
  [
    'S01.entry.command',
    'Native command acceptance',
    'command',
    'a:world-service.ts#WorldService.transition',
  ],
  [
    'S01.entry.http',
    'HTTP request receive through reply',
    'request',
    'a:http.ts#initializeGameServer.@createServer:0',
  ],
  ['S02.entry.tick', 'Host tick', 'tick', 'a:world-service.ts#WorldService.tick'],
  ['S02.entry.batch', 'Native batch', 'batch', 'a:world-service.ts#WorldService.tickBatch'],
  [
    'S02.entry.native',
    'Native interval generator',
    'native batch',
    'd:kernel.ts#advanceWorldSlices',
  ],
  [
    'S03.entry.navigation',
    'Route preparation and completion',
    'navigation batch',
    'a:world-service.ts#WorldService.preparedNavigationBatch',
  ],
  [
    'S03.entry.geometry',
    'Geometry batch round trip',
    'geometry batch',
    'a:geometry-batches.ts#GeometryBatches.compute',
  ],
  ['S03.entry.movement', 'Actor movement', 'actor interval', 'd:action-movement.ts#moveAlongPath'],
  [
    'S04.entry.response',
    'Native animal response',
    'animal opportunity',
    'd:native-response-controller.ts#nativeResponseDecision',
  ],
  [
    'S04.entry.flight',
    'Physical flight continuation',
    'animal interval',
    'd:flight.ts#advanceFlight',
  ],
  [
    'S04.entry.feeding',
    'Native feeding',
    'animal attempt',
    'd:native-feeding.ts#completeNativeFeeding',
  ],
  ['S05.entry.phase', 'Encounter phase', 'exposure phase', 'd:kernel.ts#updateEncounters'],
  [
    'S05.entry.observer',
    'Observer due opportunity',
    'observer opportunity',
    'd:kernel.ts#updateEncounters',
  ],
  ['S05.entry.speech', 'Speech reception', 'emission', 'd:perception.ts#speechPerception'],
  [
    'S06.entry.reception',
    'Current reception',
    'observer reception',
    'd:perception-evidence.ts#withCurrentPerceptionBatch',
  ],
  [
    'S06.entry.observation',
    'Received observation',
    'acquired fact',
    'd:perception-evidence.ts#receiveObservation',
  ],
  ['S06.entry.edit', 'Personal evidence edit', 'edit', 'd:experience.ts#correctExperience'],
  [
    'S07.entry.attention',
    'Detailed attention selection',
    'observer opportunity',
    'd:attention.ts#updateAttention',
  ],
  [
    'S07.entry.relations',
    'Received spatial relations',
    'relation opportunity',
    'd:received-geometry.ts#evaluateAttentionRelations',
  ],
  ['S08.entry.event', 'World event reception', 'event', 'd:events.ts#recordEvent'],
  [
    'S08.entry.batch',
    'Received temporal batch',
    'received batch',
    'd:temporal-evidence.ts#flushReceivedBatch',
  ],
  [
    'S09.entry.prepare',
    'Prepare a permitted decision',
    'decision preparation',
    'a:decision-context.ts#prepareDecision',
  ],
  [
    'S09.entry.publish',
    'Publish controlled decision',
    'decision publication',
    'a:decision-publication.ts#finishDecisionPublication',
  ],
  ['S09.entry.recall', 'Read personal memory', 'recall query', 'a:recall.ts#RecallService.select'],
  ['S10.entry.admission', 'Native action admission', 'command', 'd:kernel.ts#executeCommand'],
  [
    'S10.entry.execution',
    'Native action advancement',
    'actor interval',
    'd:kernel.ts#advanceAction',
  ],
  ['S11.entry.view', 'Permitted player view', 'recipient projection', 'a:view.ts#projectView'],
  ['S11.entry.patch', 'Permitted view difference', 'subscriber update', 'a:view.ts#projectPatch'],
  [
    'S11.entry.history',
    'Personal history page',
    'page request',
    'a:history.ts#HistoryRepository.readEventPage',
  ],
  [
    'S12.entry.accept',
    'Accept in-memory progress',
    'accepted batch',
    'a:world-service.ts#WorldService.acceptProgress',
  ],
  [
    'S12.entry.save',
    'Durable save transaction',
    'durable batch',
    'a:store.ts#SqlGameRepository.commit',
  ],
  ['S13.entry.query', 'SQL adapter query', 'adapter call', 'a:postgres.ts#PostgresDatabase.query'],
  [
    'S13.entry.transaction',
    'SQL transaction',
    'transaction',
    'a:postgres.ts#PostgresDatabase.transaction',
  ],
  [
    'S14.entry.retention',
    'Retention preparation',
    'maintenance plan',
    'a:world-service.ts#WorldService.prepareRetention',
  ],
  [
    'S14.entry.cleanup',
    'Shared-value cleanup',
    'cleanup batch',
    'a:received-value-ownership.ts#ReceivedValueOwnership.collect',
  ],
  [
    'S15.entry.capture',
    'Checkpoint capture',
    'checkpoint',
    'a:world-service.ts#WorldService.createSave',
  ],
  [
    'S15.entry.restore',
    'Checkpoint restoration',
    'restore',
    'a:world-service.ts#WorldService.restoreSave',
  ],
  [
    'S16.entry.finalize',
    'Publish immutable world',
    'publication',
    'd:draft.ts#finishTransitionWorld',
  ],
  [
    'S16.entry.snapshot',
    'Detach immutable value',
    'snapshot',
    'd:records.ts#immutableDataSnapshot',
  ],
];
const parents = parentSites.map(
  ([id, label, unit, site]): ProfilingDefinition => ({
    ...row(id, label, unit, [site])[0]!,
    role: 'parent',
    unit,
    parent: id.slice(0, 3),
    ...(id === 'S05.entry.observer'
      ? {
          kind: 'active-segments' as const,
          bindings: [{ ...binding(site), logical: 'sight-observer' as const }],
        }
      : {}),
  }),
);
/** This is a census of the pinned world's installed command/action families,
 * not a vocabulary imported by the engine. Instant operations have no invented
 * advancement/completion phase. Shared cancellation stays with agency/result
 * owners rather than being charged in full to every family. */
export const PROFILING_COMMAND_FAMILIES: readonly {
  id: string;
  commands: readonly string[];
  actions: readonly string[];
}[] = [
  { id: 'S10.01', commands: ['move', 'follow', 'evade'], actions: ['move', 'follow', 'evade'] },
  { id: 'S10.02', commands: ['status-effect'], actions: ['status-effect'] },
  { id: 'S10.03', commands: ['gather'], actions: ['gather'] },
  { id: 'S10.04', commands: ['craft', 'compose'], actions: ['craft'] },
  {
    id: 'S10.05',
    commands: [
      'pickup',
      'drop',
      'equip',
      'unequip',
      'transfer-stock',
      'transfer-item',
      'split-item',
      'merge-item',
      'inspect-inventory',
    ],
    actions: ['pickup'],
  },
  {
    id: 'S10.06',
    commands: ['feed', 'cook', 'eat', 'fish', 'replenish', 'tend-fire', 'place-hearth'],
    actions: ['feed', 'cook', 'fish', 'replenish', 'tend-fire', 'place-hearth'],
  },
  {
    id: 'S10.07',
    commands: ['aim', 'shoot-once', 'hunt', 'practice-shot', 'release-shot'],
    actions: ['aim', 'shoot-once', 'hunt', 'practice-shot'],
  },
  {
    id: 'S10.08',
    commands: ['strike', 'guard', 'release-strike', 'encounter-preference'],
    actions: ['strike', 'guard'],
  },
  {
    id: 'S10.09',
    commands: ['assemble', 'operate-gate', 'impact-boundary'],
    actions: ['assemble', 'operate-gate', 'impact-boundary'],
  },
  {
    id: 'S10.10',
    commands: [
      'activity',
      'inspect-activities',
      'confirm-attempt',
      'withdraw-attempt',
      'resume-work',
      'cancel',
      'goal',
    ],
    actions: [],
  },
  { id: 'S10.11', commands: ['say', 'teach', 'learn-record', 'coaching'], actions: ['coaching'] },
  { id: 'S10.12', commands: ['handover', 'outing'], actions: [] },
  { id: 'S10.13', commands: ['compact'], actions: [] },
  {
    id: 'S10.14',
    commands: ['harvest', 'treat-scar', 'respawn', 'recover'],
    actions: ['harvest', 'treat-scar'],
  },
  { id: 'S10.15', commands: [], actions: [] },
];
const mechanics = PROFILING_COMMAND_FAMILIES.flatMap((family) => {
  const phases: {
    phase: string;
    site: string;
    expression: string;
    values: readonly string[];
    unit: string;
  }[] = [];
  if (family.commands.length)
    phases.push({
      phase: 'admit',
      site: 'd:kernel.ts#executeCommand',
      expression: 'command.type',
      values: family.commands,
      unit: 'native command attempt',
    });
  if (family.actions.length)
    phases.push(
      {
        phase: 'offer-bind',
        site: 'd:kernel.ts#prepareNativeChoice',
        expression: 'invocation?.type',
        values: family.actions,
        unit: 'offered action',
      },
      {
        phase: 'advance',
        site: 'd:kernel.ts#advanceAction',
        expression: 'actor.actor?.action?.type',
        values: family.actions,
        unit: 'actor interval',
      },
      {
        phase: 'complete',
        site: 'd:kernel.ts#completeAction',
        expression: 'action.type',
        values: family.actions,
        unit: 'completed action',
      },
      {
        phase: 'fail',
        site: 'd:kernel.ts#failAction',
        expression: 'actor.actor?.action?.type',
        values: family.actions,
        unit: 'failed action',
      },
    );
  return phases.map(
    (phase): ProfilingDefinition => ({
      ...row(`${family.id}.${phase.phase}`, `${family.id} ${phase.phase}`, phase.unit, [
        phase.site,
      ])[0]!,
      parent: family.id,
      unit: phase.unit,
      role: 'leaf',
      coverage: ['W08'],
      bindings: [
        { ...binding(phase.site), filter: { expression: phase.expression, values: phase.values } },
      ],
    }),
  );
});
const sqlInstalled: readonly [string, ProfilingKind, string][] = [
  ['S13.01.wait', 'queue-wait', 'submitted operation'],
  ['S13.01.hold', 'async-latency', 'admitted read/write operation'],
  ['S13.04.submit', 'async-latency', 'driver request'],
  ['S13.04.decode', 'sync', 'returned row batch'],
  ['S13.04.driverDecode', 'sync', 'driver data row'],
  ['S13.05.transaction', 'async-latency', 'transaction'],
];
const installed = sqlInstalled.map(
  ([id, kind, unit]): ProfilingDefinition => ({
    ...row(id, `SQL ${id.split('.').at(-1)}`, unit, ['a:postgres.ts#PostgresDatabase.query'])[0]!,
    parent: id.slice(0, 6),
    role: 'leaf',
    unit,
    kind,
    bindings: [
      id === 'S13.04.driverDecode'
        ? {
            path: 'apps/server/src/performance.ts',
            symbol: 'observeDatabaseDecoder.measured',
            installed: true,
            kind,
          }
        : id.startsWith('S13.01')
          ? { path: 'apps/server/src/work-lane.ts', symbol: 'WorkLane.run', installed: true, kind }
          : {
              path: 'apps/server/src/postgres.ts',
              symbol: id.startsWith('S13.05')
                ? 'PostgresDatabase.transaction'
                : 'PostgresDatabase.query',
              installed: true,
              kind,
            },
    ],
  }),
);
const additional = [
  ...row(
    'S00.01.collision-runtime',
    'Initialize native collision runtime',
    'runtime initialization',
    ['s:rapier.ts#initializeCollisionRuntime'],
  ),
  ...row('S03.04.worker-execute', 'Actual navigation worker message execution', 'worker batch', [
    'a:navigation/worker.ts#@parentPort.on(message):1',
  ]),
  ...row('S03.08.worker-execute', 'Actual geometry worker message execution', 'worker batch', [
    'a:geometry-worker.ts#@parentPort.on(message):1',
  ]),
  ...row('S03.08.ray-loop', 'Execute the actual shared geometry batch', 'ray batch', [
    's:geometry.ts#evaluateGeometryBatch',
  ]),
  ...row('S03.08.ray', 'Execute an actual geometry ray', 'ray query', ['s:geometry.ts#rayHits']),
  ...row('S10.10.cancel', 'Cancel current work through agency', 'cancellation', [
    'd:agency.ts#cancelPlan',
  ]),
  ...row(
    'S10.15.offer-bind',
    'Validate an owner-authored native declaration',
    'definition proposal',
    ['a:world-authoring.ts#WorldAuthoringService.localDraftCheck'],
  ),
  ...row('S10.15.admit', 'Admit an owner-authorized world edit', 'world edit', [
    'a:world-service.ts#WorldService.godAct',
  ]),
  ...row(
    'S15.02.worker-execute',
    'Actual checkpoint worker message execution',
    'checkpoint request',
    ['a:checkpoint-worker.ts#@port.on(message):1'],
  ),
].map(
  (definition): ProfilingDefinition => ({
    ...definition,
    parent: definition.id.slice(0, 6),
    role: 'leaf',
  }),
);
const externalKinds: Readonly<Record<string, ProfilingKind>> = {
  'S13.06': 'gauge',
  'S14.10': 'gauge',
  'S16.06': 'gauge',
  'S16.07': 'sampled-cpu',
};
/** Frozen source candidates for the selected opening campaign. Reachable means
 * an installed opening caller can invoke the owner, including a legitimate
 * empty/no-work invocation; positive exercised coverage still requires the run's
 * measured eligible/completed counts. The complete catalogue is not selected. */
export const OPENING_PARENT_IDS: readonly string[] = [
  'S01.entry.command',
  'S01.entry.http',
  'S02.entry.tick',
  'S02.entry.batch',
  'S02.entry.native',
  'S03.entry.navigation',
  'S03.entry.geometry',
  'S03.entry.movement',
  'S04.entry.response',
  'S04.entry.flight',
  'S04.entry.feeding',
  'S05.entry.phase',
  'S05.entry.observer',
  'S06.entry.reception',
  'S06.entry.observation',
  'S07.entry.attention',
  'S07.entry.relations',
  'S08.entry.event',
  'S08.entry.batch',
  'S10.entry.admission',
  'S10.entry.execution',
  'S11.entry.view',
  'S11.entry.patch',
  'S12.entry.accept',
  'S12.entry.save',
  'S13.entry.query',
  'S13.entry.transaction',
  'S14.entry.retention',
  'S14.entry.cleanup',
  'S16.entry.finalize',
  'S16.entry.snapshot',
];
const openingRows = [
  ...['S01', 'S02', 'S03', 'S04', 'S05', 'S07', 'S08'].flatMap((category) => {
    const maximum: Record<string, number> = {
      S01: 8,
      S02: 10,
      S03: 10,
      S04: 8,
      S05: 16,
      S07: 9,
      S08: 10,
    };
    return Array.from(
      { length: maximum[category]! },
      (_, index) => `${category}.${String(index + 1).padStart(2, '0')}`,
    );
  }),
  ...[1, 2, 3, 4, 5, 6, 8, 10].map((n) => `S06.${String(n).padStart(2, '0')}`),
  'S10.01',
  'S10.02',
  ...Array.from({ length: 6 }, (_, i) => `S11.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, i) => `S12.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, i) => `S13.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `S14.${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `S16.${String(i + 1).padStart(2, '0')}`),
];
const openingExtraIds = new Set([
  'S03.04.worker-execute',
  'S03.08.worker-execute',
  'S03.08.ray-loop',
  'S03.08.ray',
  'S10.01.offer-bind',
  'S10.01.admit',
  'S10.01.advance',
  'S10.01.complete',
  'S10.01.fail',
]);
const openingExtraSymbols = new Set([
  'advanceCommitments',
  'advanceRemains',
  'acquireKnownPlaceEvidence',
  'acquireKnownPlaceCapsules',
]);
/** A reused helper is one selected timing definition, even when several catalogue
 * rows explain its different consumers. Never install several identical clocks
 * merely to make those coverage rows look independently measured. */
export const OPENING_CANDIDATE_IDS: readonly string[] = (() => {
  const sites = new Set<string>(
    parents.flatMap((definition) =>
      definition.bindings
        .filter((binding) => OPENING_PARENT_IDS.includes(definition.id) && !binding.logical)
        .map(
          (binding) =>
            `${binding.path}#${binding.symbol}:${JSON.stringify(binding.filter ?? null)}`,
        ),
    ),
  );
  return [...rows.flat(), ...mechanics, ...additional, ...installed]
    .filter((definition) => {
      const requested =
        openingRows.some((row) => definition.id === row || definition.id.startsWith(`${row}.`)) ||
        openingExtraIds.has(definition.id) ||
        definition.bindings.some((binding) => openingExtraSymbols.has(binding.symbol));
      if (!requested) return false;
      const key = definition.bindings
        .map(
          (binding) =>
            `${binding.path}#${binding.symbol}:${JSON.stringify(binding.filter ?? null)}${binding.installed ? ':' + definition.id : ''}`,
        )
        .join('|');
      if (sites.has(key)) return false;
      sites.add(key);
      return true;
    })
    .map((definition) => definition.id);
})();
const openingSelected = new Set([...OPENING_PARENT_IDS, ...OPENING_CANDIDATE_IDS]);

export const PROFILING_REGISTRY: readonly ProfilingDefinition[] = [
  ...rows.flat(),
  ...parents,
  ...mechanics,
  ...additional,
  ...installed,
].map((definition, index) => ({
  ...definition,
  numericId: index + 1,
  ...(openingSelected.has(definition.id)
    ? { coverage: [...new Set([...definition.coverage, 'W01'])] }
    : {}),
  ...(externalKinds[definition.id]
    ? {
        kind: externalKinds[definition.id]!,
        unit:
          definition.id === 'S13.06'
            ? 'database observation window'
            : definition.id === 'S14.10'
              ? 'storage census'
              : definition.id === 'S16.06'
                ? 'allocation observation window'
                : 'CPU sampling window',
        bindings: definition.bindings.map((site) => ({
          ...site,
          kind: externalKinds[definition.id]!,
          installed: true,
        })),
      }
    : {}),
}));
export const PROFILING_BY_ID = new Map(
  PROFILING_REGISTRY.map((definition) => [definition.id, definition]),
);
export const PROFILING_SQL_OWNERS: readonly { site: ProfilingBinding; owner: string }[] = [
  { site: binding('a:store.ts#SqlGameRepository.commit'), owner: 'save' },
  { site: binding('a:store.ts#SqlGameRepository.load'), owner: 'startup' },
  { site: binding('a:store.ts#SqlGameRepository.prepareAccountRetention'), owner: 'retention' },
  { site: binding('a:store.ts#SqlGameRepository.prepareSupportRetention'), owner: 'retention' },
  { site: binding('a:store.ts#SqlGameRepository.prepareSourceEdit'), owner: 'retention' },
  { site: binding('a:command-receipts.ts#CommandReceipts.get'), owner: 'receipt' },
  { site: binding('a:command-receipts.ts#CommandReceipts.saveBatch'), owner: 'receipt' },
  { site: binding('a:command-receipts.ts#CommandReceipts.prune'), owner: 'receipt' },
  { site: binding('a:recall.ts#RecallService.select'), owner: 'recall' },
  { site: binding('a:recall.ts#RecallService.candidates'), owner: 'recall' },
  { site: binding('a:view.ts#projectView'), owner: 'projection' },
  { site: binding('a:checkpoint.ts#writeCheckpoint'), owner: 'checkpoint' },
  { site: binding('a:authority.ts#AuthorityRepository.authenticationRead'), owner: 'authority' },
  { site: binding('a:authority.ts#AuthorityRepository.assertFence'), owner: 'authority' },
];
export async function resolveProfilingInventory(
  root: string,
  definitions: readonly ProfilingDefinition[] = PROFILING_REGISTRY,
): Promise<ProfilingDefinition[]> {
  const { sourceFunctionBindings } = await import('./profiling-source-patches.js');
  const files = new Map<string, { boundaries: ProfilingBinding[]; hash: string }>();
  const result: ProfilingDefinition[] = [];
  for (const definition of definitions) {
    const bindings: ProfilingBinding[] = [];
    for (const binding of definition.bindings) {
      let file = files.get(binding.path);
      if (!file) {
        const source = await readFile(join(root, binding.path), 'utf8');
        file = {
          boundaries: sourceFunctionBindings(binding.path, source),
          hash: createHash('sha256').update(source).digest('hex'),
        };
        files.set(binding.path, file);
      }
      const matches = file.boundaries.filter((candidate) => candidate.symbol === binding.symbol);
      if (matches.length !== 1)
        throw new Error(
          `Profiling boundary ${definition.id}: ${binding.path}#${binding.symbol} matched ${matches.length} sites; expected exactly one.`,
        );
      const match = matches[0]!;
      bindings.push({
        ...binding,
        ...match,
        ...(binding.kind ? { kind: binding.kind } : {}),
        sourceHash: file.hash,
      });
    }
    const kinds = bindings.map(
      (site) =>
        site.kind ??
        (site.async || site.generator
          ? 'active-segments'
          : site.promise
            ? 'async-latency'
            : 'sync'),
    );
    const counterNames =
      definition.role === 'parent'
        ? []
        : [...new Set(bindings.flatMap((site) => site.counterNames ?? []))];
    if (counterNames.length > 26)
      throw new Error(
        `${definition.id} needs a split work-counter group: ${counterNames.length} existing counters.`,
      );
    result.push({
      ...definition,
      kind: definition.bindings[0]?.kind ?? kinds[0]!,
      dimensions: [...definition.dimensions, ...counterNames],
      work: bindings.some((site) => site.async)
        ? [
            ...definition.work,
            'async latency covers original body and required native-return settlement; final caller-adoption microtasks excluded',
          ]
        : definition.work,
      bindings,
    });
  }
  return result;
}

/** Source inventory only: reading this never imports game code or runs a case. */
export async function auditProfilingEntrypoints(root: string) {
  const { sourceEntrypointCensus } = await import('./profiling-source-patches.js');
  const paths: string[] = [];
  const discover = async (directory: string) => {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await discover(path);
      else if (/\.(?:ts|mjs)$/.test(path) && !path.endsWith('.test.ts')) paths.push(path);
    }
  };
  for (const directory of ['apps/server/src', 'packages/domain/src', 'packages/spatial/src'])
    await discover(directory);
  const selected = new Set([...OPENING_PARENT_IDS, ...OPENING_CANDIDATE_IDS]);
  const entries = [];
  for (const path of paths.sort())
    entries.push(
      ...sourceEntrypointCensus(
        path,
        await readFile(join(root, path), 'utf8'),
        PROFILING_REGISTRY,
        selected,
      ),
    );
  return entries;
}

/** Correctness-only scopes; never selected in an opening speed campaign. They
 * exercise the same source patcher and capture with controlled return/throw/
 * iterator effects, without pretending to be measured simulation work. */
export const PROFILING_SAFETY_DEFINITIONS: readonly ProfilingDefinition[] = [
  ['Q01.sync', 'safetySync', 'sync'],
  ['Q01.async', 'safetyAsync', 'active-segments'],
  ['Q01.generator', 'safetyGenerator', 'active-segments'],
  ['Q01.delegate', 'safetyDelegated', 'active-segments'],
].map(([id, symbol, kind], index) => ({
  id: id!,
  numericId: PROFILING_REGISTRY.length + index + 1,
  parent: 'Q01',
  label: `Profiler safety ${symbol}`,
  role: 'operation',
  kind: kind as ProfilingKind,
  unit: 'controlled protocol specimen',
  dimensions: ['invocations', 'loop-iterations', 'returned-items', 'refused', 'stale', 'empty'],
  work: ['actual protocol effects'],
  shared: false,
  coverage: ['profiler-safety'],
  bindings: [{ path: 'scripts/performance/profiling-safety.ts', symbol: symbol! }],
}));
