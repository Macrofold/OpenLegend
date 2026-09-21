import type { IntelligenceCall } from '@open-legend/protocol';
import type { GameRepository } from './store.js';
export interface TraceFilter {
  offset: number;
  search?: string;
  actor?: string;
  route?: string;
  outcome?: string;
  stage?: string;
  from?: string;
  to?: string;
}
export async function traceHistory(store: GameRepository, filter: TraceFilter) {
  const { offset, ...filters } = filter;
  const roots = await store.diagnosticRoots(
    offset,
    Object.fromEntries(
      Object.entries(filters).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
  );
  const all = await store.diagnosticStages(roots.slice(0, 25).map((c) => c.id));
  const children = new Map<string, IntelligenceCall[]>();
  for (const call of all)
    if (call.parentId) children.set(call.parentId, [...(children.get(call.parentId) ?? []), call]);
  return {
    roots: roots.slice(0, 25).map((c) => {
      const stages = children.get(c.id) ?? [];
      const receipts = new Map<string, { estimatedCostUsd?: number }>();
      for (const stage of [c, ...stages]) {
        const receipt = (
          stage.output as { receipt?: { requestId: string; estimatedCostUsd?: number } } | undefined
        )?.receipt;
        if (receipt) receipts.set(receipt.requestId, receipt);
      }
      return {
        ...c,
        input: undefined,
        output: undefined,
        exchanges: [],
        stageCount: stages.length,
        knownCostUsd: [...receipts.values()].reduce((sum, r) => sum + (r.estimatedCostUsd ?? 0), 0),
        costIncomplete:
          [...receipts.values()].some((r) => r.estimatedCostUsd === undefined) ||
          (!receipts.size && c.route !== 'level0'),
      };
    }),
    hasMore: roots.length > 25,
    retention: { records: 1000, scope: 'trigger roots and stages', enforcement: 'periodic' },
  };
}
export async function traceDetails(store: GameRepository, id: string) {
  const root = await store.intelligenceCall(id);
  if (!root) return null;
  const children = await store.diagnosticStages([id], true);
  return {
    root,
    children: children.sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    coverage:
      'Retained diagnostic records only; the periodic 1,000-record target includes trigger roots and stages, and failed captures may be unavailable.',
  };
}
