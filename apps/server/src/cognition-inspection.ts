import type { WorldState } from '@open-legend/domain';
import type { IntelligenceCall } from '@open-legend/protocol';
import type { DiagnosticAccess, GameRepository } from './store.js';

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

// Keep diagnostic presentation separate from actor-perspective reasoning context.
// docs/memory-architecture.md#god-mode-cognition-debugger
export function diagnosticTriggerText(text: string): string {
  return text
    .replace(
      /^(?:My action or change|Observed event|World change|Internal change|Action directed at me|Situation change|Addressed speech|Overheard speech|My own speech):\s*/,
      '',
    )
    .replace(/\s*\(Day \d+, \d{2}:\d{2}\)\s*$/, '')
    .replace(/\s*I am being spoken to directly\.$|\s*This was not addressed to me\.$/, '')
    .trim();
}

function presentation(call: IntelligenceCall, world?: WorldState) {
  const entity = call.actorId ? world?.entities[call.actorId] : undefined;
  const actorKind = entity?.actor
    ? entity.actor.species === 'human' || !entity.actor.species
      ? 'person'
      : 'animal'
    : entity
      ? 'object'
      : call.actorId
        ? 'unknown'
        : 'world';
  return {
    ...call,
    trigger: diagnosticTriggerText(call.trigger ?? call.kind),
    actorKind,
    actorSpecies: entity?.actor?.species,
  };
}

function responseParts(calls: IntelligenceCall[]): { label: string; text: string }[] | undefined {
  const actions = new Map<string, string>();
  for (const call of calls)
    if (call.kind === 'Action context' && Array.isArray(call.output)) {
      for (const raw of call.output) {
        const item = record(raw);
        if (typeof item?.['id'] === 'string' && typeof item['description'] === 'string')
          actions.set(item['id'], item['description']);
      }
    }
  for (const call of [...calls].reverse()) {
    const value =
      record(record(call.input)?.['proposed']) ?? record(record(call.output)?.['value']);
    if (!Array.isArray(value?.['operations'])) continue;
    return value['operations'].map((raw) => {
      const op = record(raw);
      for (const [key, label] of [
        ['talk', 'Speech'],
        ['think', 'Thought'],
        ['act', 'Action'],
        ['goal', 'Goal'],
        ['plan', 'Plan'],
        ['note', 'Knowledge edit'],
        ['name', 'Given name'],
      ]) {
        const part = record(op?.[key!]);
        if (part)
          return {
            label: label!,
            text: String(
              (key === 'plan' && Array.isArray(part['steps'])
                ? `${part['mode']}: ${
                    part['steps']
                      .map((raw) => {
                        const step = record(raw);
                        return step?.['actionId']
                          ? (actions.get(String(step['actionId'])) ?? String(step['actionId']))
                          : `${step?.['useItemAs']} item from step ${Number(step?.['itemFromStep']) + 1}`;
                      })
                      .join('; ') || 'no steps'
                  }`
                : undefined) ??
                part['text'] ??
                part['givenName'] ??
                part['description'] ??
                part['objective'] ??
                part['verb'] ??
                actions.get(String(part['actionId'])) ??
                part['actionId'] ??
                part['operation'] ??
                part['mode'] ??
                'proposed',
            ),
          };
      }
      return { label: 'Operation', text: 'Unrecognized operation' };
    });
  }
  return undefined;
}

function responseSummary(calls: IntelligenceCall[]): string | undefined {
  const parts = responseParts(calls);
  return parts
    ? parts.map(({ label, text }) => `${label}: ${text}`).join(' · ') ||
        'Continue existing behavior'
    : undefined;
}

function failureMessage(call: IntelligenceCall): string | undefined {
  const output = record(call.output);
  const failed = call.status === 'failed' || output?.['ok'] === false;
  if (!failed) return undefined;
  for (const key of ['reason', 'error', 'message'])
    if (typeof output?.[key] === 'string') return output[key];
  return 'Stage failed; inspect request and response.';
}

function normalizeRoot(call: IntelligenceCall): IntelligenceCall {
  const input = record(call.input);
  const output = record(call.output);
  // A finished scheduler check is not an executed cognition stage.
  // docs/memory-architecture.md#god-mode-cognition-debugger
  if (
    call.kind === 'Semantic trigger' &&
    call.route === 'level0' &&
    (call.disposition === 'native' || call.disposition === 'skipped')
  ) {
    const reason = typeof input?.['reason'] === 'string' ? input['reason'] : call.trigger;
    return {
      ...call,
      triggerType: `Cognition skipped${reason ? ` · ${reason}` : ''}`,
      trigger: reason ?? 'Native protection prevented cognition.',
      disposition: 'skipped',
    };
  }
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
export async function traceHistory(
  store: GameRepository,
  filter: TraceFilter,
  world?: WorldState,
  access?: DiagnosticAccess,
) {
  const { offset, ...filters } = filter;
  const roots = await store.diagnosticRoots(
    offset,
    Object.fromEntries(
      Object.entries(filters).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
    access,
  );
  const all = await store.diagnosticStages(roots.slice(0, 25).map((c) => c.id));
  const children = new Map<string, IntelligenceCall[]>();
  for (const call of all)
    if (call.parentId) children.set(call.parentId, [...(children.get(call.parentId) ?? []), call]);
  return {
    roots: roots.slice(0, 25).map((stored) => {
      const c = presentation(normalizeRoot(stored), world);
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
        responseParts: responseParts(stages),
        responseSummary:
          responseSummary(stages) ??
          (c.status !== 'failed' && typeof record(c.output)?.['message'] === 'string'
            ? record(c.output)!['message']
            : undefined),
        errorSummary:
          [...new Set([c, ...stages].map(failureMessage).filter(Boolean))].join(' · ') || undefined,
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
export async function traceDetails(store: GameRepository, id: string, world?: WorldState) {
  const stored = await store.intelligenceCall(id);
  if (!stored) return null;
  const root = presentation(normalizeRoot(stored), world);
  const children = await store.diagnosticStages([id], true);
  return {
    root,
    responseSummary: responseSummary(children),
    children: children.sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    coverage:
      'Retained diagnostic records only; the periodic 1,000-record target includes trigger roots and stages, and failed captures may be unavailable.',
  };
}
