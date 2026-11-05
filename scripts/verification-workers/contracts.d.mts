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
export interface WorkerJob {
  id: string;
  mode: 'batch' | 'browser-session';
  timeoutSeconds: number;
  cases: WorkerCase[];
  environment?: { instanceType: 'm7i.xlarge'; node: '24.13.0'; pnpm: '10.33.0' };
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
  jobs: WorkerJob[];
}
/** Runtime validation remains owned by contracts.mjs. */
export function campaign(value: unknown): WorkerCampaign;
