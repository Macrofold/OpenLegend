import type { ApiResult } from './index.js';
type Pin = { id: string; version: number; digest: string };
export type WorkBatchSelection =
  | { kind: 'meal'; sourceId: string; food: Pin }
  | { kind: 'gather'; targetId: string; itemId?: string; gatheringMode?: 'bare-hands' }
  | { kind: 'craft'; recipe: Pin; tools?: Record<string, string> };
export interface WorkBatchRequest {
  selection: WorkBatchSelection;
  batches: number;
  mode: 'enqueue' | 'replace' | 'interrupt';
}
export interface WorkBatchPreview {
  ok: true;
  revision: number;
  result: ApiResult;
  name?: string;
  digest?: string;
  suggestedCount?: number;
  meterId?: string;
  gatheringChoices?: {
    label: string;
    automaticLabel: string;
    handsLabel: string;
    tools: Array<{ itemId: string; label: string }>;
  };
  facts: Array<[string, string]>;
  policy?: {
    maximumBatches: number;
    onceLabel: string;
    repeatLabel: string;
    countLabel: string;
    startLabel: string;
    help: string;
  };
}
