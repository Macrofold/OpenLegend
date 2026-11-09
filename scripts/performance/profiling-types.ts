/** Tool contracts only. Importing the planner must never initialize the game or a provider. */
export type ProfilingMode =
  | 'control'
  | 'disabled'
  | 'parents'
  | 'children'
  | 'leaf'
  | 'cpu'
  | 'sql'
  | 'allocation';
export type HardwareId = 'H0' | 'H1' | 'H2';
export interface ProfilingPlanInput {
  id: string;
  gameSource: string;
  toolSource: string;
  inventory: string;
  select: string[];
  workloads: string[];
  machines: string[];
  modes: ProfilingMode[];
  repetitions: 3;
  seed: number;
  limitUsd: number;
  authorizationRef: string;
  outputDirectory: string;
  includePopulation?: boolean;
}
export interface ProfilingHardware {
  id: HardwareId;
  instanceType: 'm7i.xlarge' | 'm7i.2xlarge' | 'r7iz.xlarge';
  vcpus: number;
  memoryMiB: number;
  limits?: { vcpus: 4 | 8; memoryMiB: 14336 | 28672 };
  price: { hourlyUsd: number; observedAt: string; source: string } | null;
}
export interface FixedWorkSchedule {
  episodes: number;
  operations: number;
  gameStepSeconds: number;
  completionDeadlineSeconds: number;
  resetBetweenEpisodes: boolean;
}
export interface ProfilingWorkload {
  id: string;
  workload: string;
  variant: string;
  categories: string[];
  timing: 'realtime' | 'fixed' | 'startup' | 'first-exposure';
  fixedWork?: FixedWorkSchedule;
  warmupSeconds: number;
  measureSeconds?: number;
  expectedWork: Record<string, number | string | boolean>;
  setup: Record<string, number | string | boolean>;
}
export interface ProfilingCase {
  id: string;
  gameSource: string;
  toolSource: string;
  source: string;
  sourceConfiguration: 'control' | 'instrumented';
  sourceArchiveHash: string;
  instrumentationPatchHash: string;
  fixtureHash: string;
  configurationHash: string;
  samplingSeed: number;
  samplingProbability: 1 | 0.125 | 0.015625;
  probeIds: string[];
  mode: ProfilingMode;
  group: string;
  selection?: 'pending' | 'resolved';
  dependsOn: string[];
  scenarioId: string;
  workload: ProfilingWorkload;
  repetition: 1 | 2 | 3;
  seed: number;
  hardware: ProfilingHardware;
  warmupSeconds: number;
  measureSeconds?: number;
  fixedWork?: FixedWorkSchedule;
  drainSeconds: number;
  hardDeadlineSeconds: number;
  expectedWork: Record<string, number | string | boolean>;
  requiredArtifacts: string[];
  outputDirectory: string;
  comparison: { baseline: string | null; disabled: string | null; hardwarePartner: string | null };
  purpose: 'measurement' | 'correctness';
}
export interface ProfilingObservation {
  id: string;
  intendedAt: number;
  sentAt: number | null;
  completedAt: number | null;
  outcome: string;
  phase: 'warmup' | 'measure' | 'drain';
}
