import type { IntelligenceCall } from '@open-legend/protocol';
import type { GameRepository } from './store.js';

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeRoot(call: IntelligenceCall): IntelligenceCall {
  const input = record(call.input);
  const output = record(call.output);
  if (call.kind.toLowerCase().includes('world agent')) {
    const rejected = output?.['ok'] === false;
    return {
      ...call,
      actorName: call.actorName ?? 'World agent',
      trigger:
        call.trigger ??
        (typeof input?.['text'] === 'string' ? input['text'] : 'World-agent message'),
      triggerType: call.triggerType ?? 'Player world-agent message',
      route: call.route ?? 'full-harness',
      status: rejected ? 'failed' : call.status,
      disposition:
        rejected && typeof output?.['code'] === 'string'
          ? output['code']
          : (call.disposition ?? call.status),
    };
  }
  if (call.triggerType || !call.id.startsWith('thought-')) return call;
  const trigger = call.trigger ?? '';
  const remembered = trigger.match(/Summary of remembered experience:/g)?.length ?? 0;
  const urgent = /critically hungry|exhausted/i.test(trigger);
  return {
    ...call,
    triggerType: urgent ? 'Native survival need' : 'Autonomous cognition',
    trigger: urgent
      ? /critically hungry/i.test(trigger)
        ? 'Critical hunger required native survival behavior.'
        : 'Exhaustion required native survival behavior.'
      : remembered
        ? `${remembered} remembered ${remembered === 1 ? 'experience prompted' : 'experiences prompted'} autonomous reconsideration.`
        : 'Recent events or state changes prompted autonomous reconsideration.',
  };
}

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
    roots: roots.slice(0, 25).map((stored) => {
      const c = normalizeRoot(stored);
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
  const stored = await store.intelligenceCall(id);
  if (!stored) return null;
  const root = normalizeRoot(stored);
  const children = await store.diagnosticStages([id], true);
  return {
    root,
    children: children.sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    coverage:
      'Retained diagnostic records only; the periodic 1,000-record target includes trigger roots and stages, and failed captures may be unavailable.',
  };
}
