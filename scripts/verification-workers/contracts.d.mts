export interface WorkerCase {
  id: string;
  source: string;
  sourceHash?: string;
  steps: Array<{ id: string; argv: string[]; database?: string }>;
  env?: Record<string, string>;
  inputs?: Array<{ id: string; bundle: string }>;
  databases?: string[];
  requiredArtifacts?: string[];
}
type WorkerInstanceType = 'm7i.xlarge' | 'm7i.2xlarge' | 'r7iz.xlarge';

export interface WorkerJob {
  id: string;
  mode: 'batch' | 'browser-session';
  timeoutSeconds: number;
  cases: WorkerCase[];
  environment?: {
    instanceType: WorkerInstanceType;
    node: '24.13.0';
    pnpm: '10.33.0';
    imageId?: string;
    nodeHeapMiB?: number;
    priceQuote?: {
      instanceType: WorkerInstanceType;
      hourlyUsd: number;
      observedAt: string;
      source: string;
    };
  };
  outputLimitBytes?: number;
  diskLimitBytes?: number;
  requiredArtifacts?: string[];
  acceptance?: 'measurement' | 'check';
  paid?: { limitMicroUsd: number; maxCalls: number; lanes: string[] };
}
export interface WorkerCampaign {
  taskId: string;
  cloudAllocationId: string;
  concurrency: number;
  deadlineSeconds: number;
  lifetime: 'attached' | 'durable';
  inputs?: Array<{ id: string; root: string; paths: string[] }>;
  workerAffinity?: { workerId: string; instanceId: string };
  requireRetainedWorkers?: boolean;
  jobs: WorkerJob[];
}
/** Runtime validation remains owned by contracts.mjs. */
export function campaign(value: unknown): WorkerCampaign;
