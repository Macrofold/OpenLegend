/** Process-local tallies for native profiling. They are never saved, projected or read by
 * simulation logic, so enabling them cannot change outcomes, RNG draws or audiences. With no
 * sink installed each call is one undefined check.
 * docs/maintainers/events-perception-and-reactions.md#epr00--baseline-invariants-and-task-ownership
 */
export const DOMAIN_COUNTERS = [
  'projectileBodiesPrepared',
  'projectileBroadCandidates',
  'projectileExactTests',
  'projectileMotionTracksPrepared',
  'projectileMotionBranchesPrepared',
  'projectileMotionPiecesPrepared',
  'projectileForecastRefinements',
  'projectileCurrentCandidates',
  'localPoseReturnCandidates',
  /** Native scheduler frequency, independent of host clock and profiling wall time. */
  'nativeForecasts',
  'nativeCapabilityPreparations',
  'nativeCapabilityReuses',
  'nativeActionCalls',
  'nativeCoarseActionCallsAvoided',
  'nativeCoarseEnvelopesTested',
  'entityDraftLookupHits',
  'entityDraftTreeLookups',
  'entityEnumerationEntriesVisited',
  'orderedRecordBranchesVisited',
  'animalWanderDecisions',
  'animalWanderQueueEntriesVisited',
  'animalWanderEligibilityChecks',
  'nativeForagingSightCandidates',
  'nativeForagingSightExclusions',
  'nativeWalkingForecastReuses',
  'nativeTerritorialDeadlineReuses',
  'nativeTerritorialReviewFallbacks',
  'statusFlowPreparations',
  'statusFlowReuses',
  'statusRulesConsidered',
  'statusDormantRulesExcluded',
  'nativeValueSegmentsRetained',
  'nativeValuesMaterialized',
  'nativeValueOperationsReplayed',
  'nativeValueReadCacheHits',
  'materialMembershipBuilds',
  'materialMembershipCandidates',
  'materialMembershipUpdates',
  'materialFootprintsBuilt',
  'materialFootprintsReused',
  'nativeLocalForecasts',
  'nativeStatusParticipantsPrepared',
  'nativeStatusParticipantsReused',
  'nativeStatusReconciliationsAvoided',
  'nativeStatusIntegrationReuses',
  'nativeLocalBodyChanges',
  'nativeLocalStatusChanges',
  'nativeLocalAttributeChanges',
  'nativeLocalActivityChanges',
  'nativeLocalFallbackCoupled',
  'nativeLocalFallbackReactive',
  'nativeLocalFallbackUnknown',
  'nativeLocalFallbackMembership',
  'nativeLocalFallbackAllocation',
  'nativePublicationPreparationInvalidations',
  'nativeMotionSlices',
  'nativeSliceActorsVisited',
  'nativeActionCandidatesPrepared',
  'nativeFireCandidatesPrepared',
  'nativeAmbientCandidatesPrepared',
  'nativeAmbientMoversVisited',
  'nativeRateMaterializations',
  'nativeRateParticipants',
  'nativeSharedBoundaries',
  'nativeParticipantDeadlineCauses',
  'nativeSharedDeadlineCauses',
  'nativeBoundaryDeadline',
  'nativeBoundaryMovementEffects',
  'nativeBoundaryEvents',
  'nativeBoundaryState',
  'nativePublications',
  'nativePreparationCheckpoints',
  'nativeContinuationsReused',
  'nativeMovementDraftReuses',
  'nativeMovementIsolated',
  'outingIndexed',
  'outingChecked',
  'itemOffersChecked',
  /** Sensory input preparation, certified draft coverage, affected observers and recovery. */
  'sensoryCaptures',
  'combatObservationPreparations',
  'combatObservedPairs',
  'nativeResponseDangerQueries',
  'nativeResponseDangerReuses',
  'nativeResponseDangerCandidates',
  'nativeResponseDangerRecords',
  'nativeResponseGroundRoutePreparations',
  'nativeResponseRetainedGroundRouteChecks',
  'nativeResponseStaleProposals',
  'nativeResponseSightSourceChecks',
  'nativeResponseSharedSourceChecks',
  'nativeResponseExposureSourceChecks',
  'nativeDangerCatalogBuilds',
  'nativeDangerCatalogUpdates',
  'nativeDangerCatalogEntitiesVisited',
  'nativeResponseSightSourceExclusions',
  /** Calls include tentative values in transactions that may subsequently refuse. */
  'randomEvaluations',
  'sensoryComparisons',
  'sensoryDraftsVisited',
  'sensoryEntriesUpdated',
  'sensoryRebuildEntries',
  'sensoryPhases',
  'sensoryScopesPeak',
  'sensoryColdRebuilds',
  'sensoryUnknownRebuilds',
  'sensoryOverflowRebuilds',
  'sensoryPolicyRebuilds',
  'sensoryObserversSelected',
  'sensoryPairReuseObservers',
  'sensoryPairsRetested',
  /** Entries installed in rebuilt or incrementally maintained spatial bins. */
  'spatialEntriesPrepared',
  /** Root-entity enumerations and the roots they returned. */
  'rootScans',
  'rootsVisited',
  /** Spatial candidate grids built and candidates they returned to queries. */
  'spatialBuilds',
  'spatialQueries',
  'spatialCandidates',
  /** Lazy queried-cell metadata built only for live discovery continuation. */
  'spatialMembershipBuilds',
  'spatialMembershipCells',
  'spatialMembershipCandidates',
  /** Exact per-target sight tests (after cache misses) and sight-cache hits. */
  'senseTests',
  'senseCacheHits',
  /** Encounter-phase observers that rescanned exposure versus reused it. */
  'observersExamined',
  'observersSkipped',
  /** External-event receiver enumerations and the receivers they considered. */
  'audienceScans',
  'audienceCandidates',
  /** Recorded occurrences and awareness entries written for them. */
  'eventsRecorded',
  'awarenessWritten',
  /** Observer-private exposure changes: arrivals, departures and outward-state changes. */
  'exposureEntries',
  'exposureExits',
  'exposureDetails',
  /** Common outward values prepared once or reused across receivers in one actual sight phase. */
  'visualSourcePreparations',
  'visualSourcePreparationReuses',
  'attentionCandidatesChanged',
  'attentionCandidatesUnchanged',
  'attentionSelectionsRanked',
  'attentionSelectionsReused',
  'receivedValueIndexBuilds',
  'receivedValueValuesIndexed',
  'receivedValueAppends',
  'receivedValueVectorCopies',
  'attentionDescriptionPreparations',
  'attentionDescriptionReuses',
  'receivedReferenceRootsReused',
  'receivedReferenceOwnersRebuilt',
  'receivedReferenceReceiptsVisited',
  'nativeEvidenceOwnersSealed',
  'nativeEvidenceSnapshotsReused',
  /** Sighting-identity assignments (including redundant baseline writes), additions/removals. */
  'episodeBindingsAssigned',
  'episodeBindingsInserted',
  'episodeBindingsDeleted',
  /** Brief sight/contact pair work and derived-cache lifecycle. */
  'crossingPairEvaluations',
  'crossingPairCacheHits',
  'crossingSightPieces',
  'crossingSightPrunedPieces',
  'crossingContactPieces',
  'crossingReachPieces',
  'crossingContactPrunedPieces',
  'crossingInvalidationKeys',
  'crossingPruneKeys',
  'crossingPairsRetained',
  'crossingRetentionExpired',
  'crossingRetentionGeometry',
  'crossingRetentionEligibility',
  'crossingRetentionBody',
  'crossingRetentionPath',
  'crossingPairPeak',
  'crossingTrackPeak',
  'crossingOutcomePeak',
] as const;
export type DomainCounter = (typeof DOMAIN_COUNTERS)[number];
export type DomainCounters = Partial<Record<DomainCounter, number>>;

let sink: DomainCounters | undefined;

/** Callers guard diagnostic-only preparation; no simulation work depends on this. */
export function domainCountersEnabled(): boolean {
  return sink !== undefined;
}

export function countDomainWork(name: DomainCounter, amount = 1): void {
  if (sink) sink[name] = (sink[name] ?? 0) + amount;
}

/** Cardinality high-water marks, observed without making cache behavior depend on a sink. */
export function maximumDomainWork(name: DomainCounter, amount: number): void {
  if (sink) sink[name] = Math.max(sink[name] ?? 0, amount);
}

/** Install (or with no argument remove) the profiler's tally object. */
export function observeDomainCounters(target?: DomainCounters): void {
  sink = target;
}
