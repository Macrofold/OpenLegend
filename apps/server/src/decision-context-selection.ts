import {
  addWork,
  canonicalJson,
  requireWork,
  workVector,
  WORK_LIMITS,
  WorkBudgetError,
  type WorkDemand,
  type WorkVector,
} from '@open-legend/domain';
import { digest } from './content-digest.js';

/** Request-owned preparation, never a saved mind or a new world authority.
 * docs/technical/situation-aware-cognition-context.md#4-typed-preparation-model */
export interface DecisionContextScope {
  worldId: string;
  actorId: string;
  generation: string;
  decisionId: string;
  sourceTime: number;
}
export type ContextFamily =
  | 'identity'
  | 'body'
  | 'work'
  | 'obligation'
  | 'evidence'
  | 'feeling'
  | 'contact'
  | 'possession'
  | 'method'
  | 'capability'
  | 'instruction'
  | 'reference'
  | 'coverage';
export type ContextCoverage =
  | 'complete'
  | 'partial'
  | 'notRequested'
  | 'unavailable'
  | 'stale'
  | 'forbidden';

export interface ContextUnit<T = unknown> {
  /** Canonical structured identity, including source namespace and permitted view. */
  key: string;
  family: ContextFamily;
  source: { id: string; revision: string; view: string };
  dependencies: readonly string[];
  requiredReasons: readonly string[];
  coverage: ContextCoverage;
  /** Encoded contribution including owned delimiters/references. When this is an
   * upper bound, minimumBytes prevents calling an unsettled fit an actual overflow. */
  bytes: number;
  minimumBytes?: number;
  value: T;
  /** Present only for a positively justified optional root. */
  relevance?: { source: string; order: number; rank?: number };
}

export interface DecisionRequirements {
  question: string;
  requiredRoots: ReadonlyMap<string, readonly string[]>;
  queryCues: readonly { source: string; text: string }[];
  enabledSemantics: readonly string[];
}

/** Owners add requirements; another owner or relevance result cannot erase them. */
export function composeDecisionRequirements(
  question: string,
  contributions: readonly Omit<DecisionRequirements, 'question'>[],
): DecisionRequirements {
  const roots = new Map<string, Set<string>>();
  const cues = new Map<string, { source: string; text: string }>();
  const enabled = new Set<string>();
  for (const contribution of contributions) {
    for (const [key, reasons] of contribution.requiredRoots) {
      const all = roots.get(key) ?? new Set<string>();
      for (const reason of reasons) all.add(reason);
      roots.set(key, all);
    }
    for (const cue of contribution.queryCues) cues.set(canonicalJson(cue), cue);
    for (const semantic of contribution.enabledSemantics) enabled.add(semantic);
  }
  return {
    question,
    requiredRoots: new Map([...roots].map(([key, reasons]) => [key, [...reasons]])),
    queryCues: [...cues.values()],
    enabledSemantics: [...enabled],
  };
}

/** The same existing ceilings contain preparation across pages and asynchronous waits.
 * No native invocation, fictional cost or global active meter is created. */
export class DecisionPreparationWork {
  private consumed = workVector();
  private completion = workVector();

  constructor(private readonly limit: WorkDemand = WORK_LIMITS.group) {}

  charge(demand: WorkDemand): void {
    const next = addWork(this.consumed, demand);
    requireWork(addWork(next, this.completion), this.limit);
    this.consumed = next;
  }

  reserveCompletion(demand: WorkDemand): void {
    const completion = workVector(demand);
    requireWork(addWork(this.consumed, completion), this.limit);
    this.completion = completion;
  }

  finish<T>(operation: () => T): T {
    // Reserved credit becomes available only for finalizing the accepted selection.
    this.completion = workVector();
    return operation();
  }

  get used(): Readonly<WorkVector> {
    return { ...this.consumed };
  }
}

export class DecisionContextSelectionError extends Error {
  constructor(
    readonly code: 'required-context-overflow' | 'required-context-unavailable',
    readonly key: string,
  ) {
    super(code);
  }
}

export function contextUnitKey(
  scope: DecisionContextScope,
  identity: {
    family: ContextFamily;
    id: string;
    revision: string;
    view?: string;
  },
): string {
  return canonicalJson([
    scope.worldId,
    scope.generation,
    scope.actorId,
    identity.family,
    identity.id,
    identity.revision,
    identity.view ?? 'personal',
  ]);
}

interface OrderedRoot<T> {
  unit: T;
  tie: string;
}
function compareTie<T extends { key: string }>(
  left: OrderedRoot<T>,
  right: OrderedRoot<T>,
): number {
  return left.tie < right.tie
    ? -1
    : left.tie > right.tie
      ? 1
      : left.unit.key < right.unit.key
        ? -1
        : left.unit.key > right.unit.key
          ? 1
          : 0;
}

/** Never compare unrelated vector/recency/model scales. A source-local merge only
 * breaks ties between current query heads; it preserves each owner's own order. */
export function orderDecisionContextRoots<
  T extends Pick<ContextUnit, 'key' | 'requiredReasons' | 'relevance'>,
>(units: readonly T[], basis: 'shared-rank' | 'source-local'): T[] {
  const roots = units.filter((unit) => !unit.requiredReasons.length && unit.relevance);
  const keyed = roots.map((unit) => ({ unit, tie: digest(unit.key) }));
  if (basis === 'shared-rank') {
    if (keyed.some(({ unit }) => unit.relevance?.rank === undefined))
      throw new Error('A shared context rank must cover every optional root.');
    return keyed
      .sort((a, b) => b.unit.relevance!.rank! - a.unit.relevance!.rank! || compareTie(a, b))
      .map(({ unit }) => unit);
  }
  const sources = new Map<string, OrderedRoot<T>[]>();
  for (const entry of keyed) {
    const key = entry.unit.relevance!.source;
    const source = sources.get(key) ?? [];
    source.push(entry);
    sources.set(key, source);
  }
  const queues = [...sources.values()].map((source) => ({
    values: source.sort(
      (a, b) => a.unit.relevance!.order - b.unit.relevance!.order || compareTie(a, b),
    ),
    next: 0,
  }));
  const result: T[] = [];
  while (result.length < roots.length) {
    let chosen: (typeof queues)[number] | undefined;
    for (const queue of queues) {
      const head = queue.values[queue.next];
      if (head && (!chosen || compareTie(head, chosen.values[chosen.next]!) < 0)) chosen = queue;
    }
    result.push(chosen!.values[chosen!.next++]!.unit);
  }
  return result;
}

export interface SelectedDecisionContext<T> {
  units: readonly ContextUnit<T>[];
  roots: readonly string[];
  requiredRoots: readonly string[];
  bytes: number;
  omitted: ReadonlyMap<string, 'size' | 'unavailable' | 'preparation'>;
  work: Readonly<WorkVector>;
  optionalCoverage: 'complete' | 'unavailable';
}

/** Complete roots and their dependencies are selected together. Closure is iterative,
 * so a valid long chain or cycle does not consume the native call-depth allowance. */
export function selectDecisionContext<T>(input: {
  units: readonly ContextUnit<T>[];
  requiredRoots?: ReadonlyMap<string, readonly string[]>;
  maxBytes: number;
  fixedBytes?: number;
  basis: 'shared-rank' | 'source-local';
  work?: DecisionPreparationWork;
}): SelectedDecisionContext<T> {
  const work = input.work ?? new DecisionPreparationWork();
  work.charge({ candidates: input.units.length });
  const byKey = new Map<string, ContextUnit<T>>();
  for (const unit of input.units) {
    if (!Number.isSafeInteger(unit.bytes) || unit.bytes < 0)
      throw new Error('A context contribution needs its exact nonnegative byte count.');
    if (
      unit.minimumBytes !== undefined &&
      (!Number.isSafeInteger(unit.minimumBytes) ||
        unit.minimumBytes < 0 ||
        unit.minimumBytes > unit.bytes)
    )
      throw new Error('A context size bound must contain its complete representation.');
    const previous = byKey.get(unit.key);
    if (previous) throw new Error('Context source identities must be deduplicated by their owner.');
    byKey.set(unit.key, unit);
  }
  const required = new Set([
    ...input.units.filter((unit) => unit.requiredReasons.length).map((unit) => unit.key),
    ...(input.requiredRoots?.keys() ?? []),
  ]);
  const chosen = new Map<string, ContextUnit<T>>();
  const roots: string[] = [];
  let bytes = input.fixedBytes ?? 0;
  let minimumBytes = bytes;
  const omitted = new Map<string, 'size' | 'unavailable' | 'preparation'>();
  let optionalCoverage: 'complete' | 'unavailable' = 'complete';
  const closure = (root: string) => {
    const visited = new Set<string>();
    const pending = [root];
    const additions: ContextUnit<T>[] = [];
    let additionalBytes = 0;
    let minimumBytes = 0;
    while (pending.length) {
      work.charge({ tests: 1 });
      const key = pending.pop()!;
      if (visited.has(key) || chosen.has(key)) continue;
      visited.add(key);
      const unit = byKey.get(key);
      if (!unit || ['unavailable', 'stale', 'forbidden'].includes(unit.coverage)) return undefined;
      additions.push(unit);
      additionalBytes += unit.bytes;
      minimumBytes += unit.minimumBytes ?? unit.bytes;
      work.charge({ tests: unit.dependencies.length });
      for (const dependency of unit.dependencies) pending.push(dependency);
    }
    return { additions, additionalBytes, minimumBytes };
  };
  const admit = (root: string, value: NonNullable<ReturnType<typeof closure>>) => {
    for (const unit of value.additions) chosen.set(unit.key, unit);
    bytes += value.additionalBytes;
    minimumBytes += value.minimumBytes;
    roots.push(root);
  };
  for (const root of required) {
    const value = closure(root);
    if (!value) throw new DecisionContextSelectionError('required-context-unavailable', root);
    if (bytes + value.additionalBytes > input.maxBytes)
      throw new DecisionContextSelectionError(
        minimumBytes + value.minimumBytes > input.maxBytes
          ? 'required-context-overflow'
          : 'required-context-unavailable',
        root,
      );
    admit(root, value);
  }
  for (const unit of orderDecisionContextRoots(input.units, input.basis)) {
    if (chosen.has(unit.key)) continue;
    let value: ReturnType<typeof closure>;
    try {
      value = closure(unit.key);
    } catch (error) {
      if (!(error instanceof WorkBudgetError)) throw error;
      omitted.set(unit.key, 'preparation');
      optionalCoverage = 'unavailable';
      break;
    }
    if (!value) {
      omitted.set(unit.key, 'unavailable');
      optionalCoverage = 'unavailable';
    } else if (bytes + value.additionalBytes > input.maxBytes) {
      const reason = minimumBytes + value.minimumBytes > input.maxBytes ? 'size' : 'preparation';
      omitted.set(unit.key, reason);
      if (reason === 'preparation') optionalCoverage = 'unavailable';
    } else admit(unit.key, value);
  }
  return {
    units: [...chosen.values()],
    roots,
    requiredRoots: [...required],
    bytes,
    omitted,
    work: work.used,
    optionalCoverage,
  };
}

/** Bind inspection, dispatch and decoding to the same completed request. The
 * caller has already projected permissions and applied the size/spending gates. */
export function finalizeDecisionRequest(input: {
  scope: DecisionContextScope;
  context: string;
  instructions: string;
  schema: Record<string, unknown>;
  sourceKeys: readonly string[];
  references: Readonly<Record<string, string>>;
}) {
  const schema = structuredClone(input.schema);
  const pending: object[] = [schema];
  const seen = new Set<object>();
  while (pending.length) {
    const value = pending.pop()!;
    if (seen.has(value)) continue;
    seen.add(value);
    for (const child of Object.values(value))
      if (child && typeof child === 'object') pending.push(child);
    Object.freeze(value);
  }
  const references = Object.freeze({ ...input.references });
  const sourceKeys = Object.freeze([...input.sourceKeys]);
  const identity = digest({
    scope: input.scope,
    context: input.context,
    instructions: input.instructions,
    schema,
    sourceKeys,
    references,
  });
  return Object.freeze({
    scope: Object.freeze({ ...input.scope }),
    context: input.context,
    instructions: input.instructions,
    schema,
    sourceKeys,
    references,
    digest: identity,
    bytes: Object.freeze({
      instructions: Buffer.byteLength(input.instructions),
      context: Buffer.byteLength(input.context),
      schema: Buffer.byteLength(JSON.stringify(schema)),
    }),
  });
}
