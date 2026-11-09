import type { ProfilingWorkload } from './profiling-types.js';
/** Only the selected initial campaign is executable. W00–W12 remain the
 * documented reusable catalogue, not unimplemented dummy runtime fixtures. */
export const PROFILING_WORKLOADS: readonly ProfilingWorkload[] = [
  {
    id: 'W01-ordinary',
    workload: 'W01',
    variant: 'ordinary',
    categories: [
      'S01',
      'S02',
      'S03',
      'S04',
      'S05',
      'S06',
      'S07',
      'S08',
      'S10',
      'S11',
      'S12',
      'S13',
      'S14',
      'S16',
    ],
    timing: 'realtime',
    warmupSeconds: 30,
    measureSeconds: 120,
    setup: {
      world: 'wilderness',
      completionDriven: true,
      nextCommandDeadlineMs: 10000,
      statePollMs: 0,
      bursts: false,
    },
    expectedWork: {
      actualMovement: true,
      aliveControlledActor: true,
      noProviderCalls: true,
      noRendering: true,
    },
  },
  {
    id: 'W05-100-movement',
    workload: 'W05',
    variant: '100-movement',
    categories: [
      'S01',
      'S02',
      'S03',
      'S04',
      'S05',
      'S06',
      'S07',
      'S08',
      'S10',
      'S11',
      'S12',
      'S13',
      'S14',
      'S16',
    ],
    timing: 'realtime',
    warmupSeconds: 30,
    measureSeconds: 120,
    setup: {
      world: 'wilderness',
      totalPeople: 100,
      normalWildlife: true,
      completionDriven: true,
      nextCommandDeadlineMs: 10000,
      statePollMs: 0,
      bursts: false,
    },
    expectedWork: {
      everyAssignedActorMoved: true,
      livingPeople: 100,
      noProviderCalls: true,
      noRendering: true,
    },
  },
];
export function workloadFor(id: string): ProfilingWorkload {
  const result = PROFILING_WORKLOADS.find((workload) => workload.id === id);
  if (!result) throw new Error(`Workload ${id} is outside the selected initial campaign.`);
  return result;
}
