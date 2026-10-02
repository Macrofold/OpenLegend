/** Process-local tallies for native profiling. They are never saved, projected or read by
 * simulation logic, so enabling them cannot change outcomes, RNG draws or audiences. With no
 * sink installed each call is one undefined check.
 * docs/maintainers/events-perception-and-reactions.md#epr00--baseline-invariants-and-task-ownership
 */
export const DOMAIN_COUNTERS = [
  /** Root-entity enumerations and the roots they returned. */
  'rootScans',
  'rootsVisited',
  /** Spatial candidate grids built and candidates they returned to queries. */
  'spatialBuilds',
  'spatialQueries',
  'spatialCandidates',
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
] as const;
export type DomainCounter = (typeof DOMAIN_COUNTERS)[number];
export type DomainCounters = Partial<Record<DomainCounter, number>>;

let sink: DomainCounters | undefined;

export function countDomainWork(name: DomainCounter, amount = 1): void {
  if (sink) sink[name] = (sink[name] ?? 0) + amount;
}

/** Install (or with no argument remove) the profiler's tally object. */
export function observeDomainCounters(target?: DomainCounters): void {
  sink = target;
}
