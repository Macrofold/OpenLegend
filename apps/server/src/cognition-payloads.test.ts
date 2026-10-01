import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  MIND_LIMITS,
  NPC_ID,
  byteCount,
  controlledEntityId,
  createItemLot,
  flattenFiles,
  quantityOf,
  wordCount,
} from '@open-legend/domain';
import {
  validateJudgmentSize,
  type AiClient,
  type AiReceipt,
  type AiResult,
  type GenerateRequest,
  type JudgeRequest,
  type JudgeValue,
  type JudgmentAnswer,
} from '@open-legend/ai';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { AiDirector } from './ai-director.js';
import {
  decisionAllowance,
  levelLimits,
  type CognitionLevel,
  type LedgerEntry,
} from './cognition-budget.js';
import { traceDetails } from './cognition-inspection.js';
import type { IntelligenceLog } from './intelligence-log.js';
import type { JobRecord } from './store.js';
import { WorldService } from './world-service.js';

// CR01 deterministic payload inspection: the actual requests the director sends for a greeting,
// a resource task, a promise and a hazard, measured against the per-level limits, plus output
// rejection without paid repair. Fixture specimens with a fake AiClient and a blocked global
// transport; they establish request shape and size, never model quality.
// docs/maintainers/cognition-redesign.md#cr01--separate-model-text-from-execution-metadata
// docs/limits/cognition.md#cg08 (per-level limits) and #cg09 (inner world versus greeting target)

let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  network = vi.fn(async () => {
    throw new Error('network blocked in fixture');
  });
  vi.stubGlobal('fetch', network);
});
const cleanup: (() => Promise<void>)[] = [];
// Closing the director flushes diagnostics; shared fixture databases can be slow under load.
afterEach(async () => {
  try {
    for (const close of cleanup.splice(0)) await close();
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
}, 120_000);

/** Simulated per-request cost on every fixture receipt; no provider is reachable. */
const FIXTURE_COST_USD = 0.0001;
/** The CR01 greeting input target this inspection compares against (bytes, not tokens). */
const GREETING_TARGET_BYTES = 2_000;

function receipt(requestId: string, provider: 'jev' | 'openai'): AiReceipt {
  return {
    requestId,
    provider,
    requestedModel: `${provider}-fixture`,
    model: `${provider}-fixture`,
    modelVersionStatus: 'reported',
    contextDigest: 'fixture-context',
    startedAt: new Date(0).toISOString(),
    completedAt: new Date(1).toISOString(),
    latencyMs: 1,
    dispatched: true,
    completionUncertain: false,
    estimatedCostUsd: FIXTURE_COST_USD,
  };
}
function value<T>(requestId: string, provider: 'jev' | 'openai', result: T): AiResult<T> {
  return { outcome: 'value', value: result, receipt: receipt(requestId, provider) };
}

/** A Choice answer covering exactly the offered keys; weights for unoffered keys are dropped. */
function distribution(keys: string[], weights: Record<string, number>): JudgmentAnswer {
  const specified = keys.filter((key) => weights[key] !== undefined);
  const used = specified.reduce((sum, key) => sum + weights[key]!, 0);
  const rest = keys.length - specified.length;
  const share = rest ? Math.max(0, 1 - used) / rest : 0;
  const raw = Object.fromEntries(keys.map((key) => [key, weights[key] ?? share]));
  const total = Object.values(raw).reduce((sum, probability) => sum + probability, 0);
  const probabilities = Object.fromEntries(keys.map((key) => [key, raw[key]! / total]));
  const choice = keys.reduce((best, key) =>
    probabilities[key]! > probabilities[best]! ? key : best,
  );
  return { type: 'choice', choice, probabilities, confidence: probabilities[choice]! };
}
const noul = (rating: number): JudgmentAnswer => ({ type: 'noul', noul: rating });
const handleKey = (key: string) => /^a\d+$/.test(key);
const isEat = (description: string) => description.startsWith('Eat one Wild berries');
const isContinue = (description: string) =>
  description.startsWith('Continue the') || description.startsWith('Remain in place');

interface Script {
  route?: Record<string, number>;
  possibleAction?: Record<string, number>;
}
/** Route/reflection/possibleAction Choices, a* ratings; optional recall attention is declined. */
function answer(request: JudgeRequest, script: Script): AiResult<JudgeValue> {
  const answers: Record<string, JudgmentAnswer> = {};
  const state = request.state as { candidates?: Record<string, string> };
  const handles = Object.keys(request.questions).filter(handleKey);
  const descriptions = Object.values(state.candidates ?? {});
  for (const [key, question] of Object.entries(request.questions)) {
    if (question.type === 'choice') {
      const keys = Object.keys(question.criteria);
      if (key === 'route') answers[key] = distribution(keys, script.route ?? { level1: 0.9 });
      else if (key === 'reflection') answers[key] = distribution(keys, { no: 0.95 });
      else if (key === 'possibleAction')
        answers[key] = distribution(keys, script.possibleAction ?? { yes: 0.9 });
      else throw new Error(`Unexpected fixture Choice question ${key}`);
    } else if (question.type === 'noul') {
      if (handleKey(key)) {
        if (descriptions.length !== handles.length) throw new Error('Unaligned fixture options');
        const description = descriptions[handles.indexOf(key)]!;
        answers[key] = noul(isEat(description) ? 0.9 : isContinue(description) ? 0.2 : 0.1);
      } else answers[key] = noul(0.1);
    } else throw new Error('Unexpected fixture Score question');
  }
  return value(request.requestId, 'jev', { answers });
}

type Kind = 'talk' | 'act' | 'think' | 'goal' | 'plan' | 'note' | 'name';
function operation(localId: string, fields: Partial<Record<Kind, unknown>>) {
  return {
    localId,
    requiresAccepted: [],
    talk: null,
    act: null,
    think: null,
    goal: null,
    plan: null,
    note: null,
    name: null,
    ...fields,
  };
}
const talk = (text: string, addresseeEntityId: string) => ({
  text,
  addresseeEntityId,
  selfIntroduction: null,
  volume: 'normal',
});

// ---------------------------------------------------------------------------------------------
// Rendered-context inspection

interface Section {
  heading: string;
  body: string;
  bytes: number;
}
/** Split the model-facing readable context at its `## Heading` lines. */
function sections(text: string): Section[] {
  return text
    .split(/\n(?=## )/)
    .filter((part) => part.startsWith('## '))
    .map((part) => {
      const newline = part.indexOf('\n');
      return {
        heading: part.slice(3, newline < 0 ? undefined : newline).trim(),
        body: newline < 0 ? '' : part.slice(newline + 1),
        bytes: Buffer.byteLength(part),
      };
    });
}
function section(parts: Section[], heading: string): Section {
  const found = parts.find((part) => part.heading === heading);
  if (!found) throw new Error(`Missing ## ${heading}`);
  return found;
}
/** Entity references the provider may copy into structured fields. */
function references(context: string) {
  return section(sections(context), 'References')
    .body.split('\n')
    .filter((line) => line.startsWith('- {'))
    .map(
      (line) =>
        JSON.parse(line.slice(2)) as {
          entityId: string;
          label: string;
          relation?: string;
          triggerRoles: { role: string }[];
        },
    );
}
/** The perceived speaker's opaque handle, so a fixture reply addresses the player. */
function speakerHandle(request: GenerateRequest): string {
  const all = references(String(request.context));
  const speaker =
    all.find((entry) => entry.triggerRoles.some((role) => role.role === 'source')) ??
    all.find((entry) => entry.relation !== 'myself');
  if (!speaker) throw new Error('No addressable speaker reference.');
  return speaker.entityId;
}
/** Every action handle a generation schema permits (act and plan-step `actionId` enums). */
function actionHandles(schema: unknown): string[] {
  const found = new Set<string>();
  const collect = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (Array.isArray(record['enum']))
      for (const entry of record['enum']) if (typeof entry === 'string') found.add(entry);
    for (const child of Object.values(record)) collect(child);
  };
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    const properties = record['properties'] as Record<string, unknown> | undefined;
    if (properties?.['actionId']) collect(properties['actionId']);
    for (const child of Object.values(record)) visit(child);
  };
  visit(schema);
  return [...found].filter(handleKey).sort();
}
/** The provider JSON Schema actually sent, as a validator for candidate fixture replies. */
const providerSchema = (request: GenerateRequest) =>
  z.fromJSONSchema(request.schema as Parameters<typeof z.fromJSONSchema>[0]);

/** Every heading readableDecisionContext can emit; anything else means a split inside content. */
const KNOWN_HEADINGS = new Set([
  'Me',
  'My commitments',
  'Trigger',
  'Trigger facts',
  'Task',
  'Conversation so far',
  'Known planning techniques',
  'Private intent controls',
  'Private intentions and native work',
  'Native navigation',
  'Current time',
  'Actions I chose to inspect',
  'Activities I chose to inspect',
  'Recent memories',
  'Nearby actors and objects',
  'Inventory',
  'General knowledge notepad',
  'Knowledge',
  'Actions',
  'Response format',
  'References',
]);
/** Section sizes account for every byte of the rendered text, under known unique headings. */
function expectCompleteSections(text: string, parts: Section[]) {
  expect(text.startsWith('## Me\n')).toBe(true);
  const headings = parts.map((part) => part.heading);
  expect(headings.filter((heading) => !KNOWN_HEADINGS.has(heading))).toEqual([]);
  expect(new Set(headings).size).toBe(headings.length);
  // split() drops one separating newline before each following heading.
  expect(parts.reduce((sum, part) => sum + part.bytes, 0) + parts.length - 1).toBe(
    Buffer.byteLength(text),
  );
}

const isEmptyJson = (value: unknown): boolean =>
  value === null ||
  value === '' ||
  (Array.isArray(value)
    ? value.every(isEmptyJson)
    : typeof value === 'object' && Object.values(value as object).every(isEmptyJson));
function parsed(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}
interface Finding {
  section: string;
  kind: string;
  example: string;
  count?: number;
}
/** JSON-path of every null or empty ('' / [] / {}) value inside a parsed JSON value. JSON
 * serialization also turns NaN and Infinity into null, so this catches them in Jev state. */
function emptyPaths(value: unknown, path = '$'): string[] {
  if (value === null) return [`${path}=null`];
  if (value === '') return [`${path}=""`];
  if (Array.isArray(value))
    return value.length
      ? value.flatMap((item, index) => emptyPaths(item, `${path}[${index}]`))
      : [`${path}=[]`];
  if (typeof value === 'object') {
    const entries = Object.entries(value as object);
    return entries.length
      ? entries.flatMap(([key, item]) => emptyPaths(item, `${path}.${key}`))
      : [`${path}={}`];
  }
  return [];
}
/** JSON objects/arrays embedded in a prose line (bracket-matched, string-aware), with spans. */
function embeddedJson(line: string): { start: number; end: number; value: unknown }[] {
  const found: { start: number; end: number; value: unknown }[] = [];
  for (let start = 0; start < line.length; start++) {
    if (line[start] !== '{' && line[start] !== '[') continue;
    let depth = 0;
    let quoted = false;
    let end = -1;
    for (let index = start; index < line.length; index++) {
      const char = line[index];
      if (quoted) {
        if (char === '\\') index++;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{' || char === '[') depth++;
      else if ((char === '}' || char === ']') && --depth === 0) {
        end = index;
        break;
      }
    }
    if (end < 0) continue;
    const json = parsed(line.slice(start, end + 1));
    if (!json.ok) continue;
    found.push({ start, end, value: json.value });
    start = end;
  }
  return found;
}
// Format and reference sections legitimately describe nullable fields and empty role lists;
// only whole-line JSON there is inspected, which exposes content appended without a heading.
const SCAFFOLDING_EXEMPT = new Set(['Response format', 'References']);
/** Null/empty scaffolding in model-facing sections: empty bodies, whole-line empty JSON,
 * null/empty values inside embedded JSON, bare `null` prose, separators left by empty values
 * and blank lines. Reported, never asserted to exist. The accepted About-me text is authored
 * prose and is excluded verbatim. Repeats of one kind in one section are counted. */
function scaffolding(parts: Section[], accepted = ''): Finding[] {
  const findings = new Map<string, Finding>();
  const add = (section: string, kind: string, example: string) => {
    const key = `${section}\u0000${kind}`;
    const prior = findings.get(key);
    if (prior) prior.count = (prior.count ?? 1) + 1;
    else findings.set(key, { section, kind, example });
  };
  const clip = (text: string) => (text.length > 160 ? `${text.slice(0, 157)}...` : text);
  for (const part of parts) {
    const exempt = SCAFFOLDING_EXEMPT.has(part.heading);
    const text = accepted ? part.body.replace(accepted, '<accepted About-me text>') : part.body;
    const body = text.trim();
    const whole = parsed(body);
    if (!body) add(part.heading, 'empty-body', '');
    else if (whole.ok && isEmptyJson(whole.value))
      add(part.heading, 'body-only-empty-json', clip(body));
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      const json = parsed(trimmed);
      if (trimmed && trimmed !== body && json.ok && isEmptyJson(json.value))
        add(part.heading, 'empty-json-line', clip(trimmed));
      if (exempt) continue;
      const spans = embeddedJson(line);
      const empty = spans.flatMap((span) => emptyPaths(span.value));
      if (empty.length)
        add(
          part.heading,
          'json-empty-values',
          clip(
            `${empty.slice(0, 6).join(', ')}${empty.length > 6 ? ` (+${empty.length - 6})` : ''} in ${trimmed}`,
          ),
        );
      const prose = spans.reduceRight(
        (rest, span) =>
          rest.slice(0, span.start) +
          ' '.repeat(span.end - span.start + 1) +
          rest.slice(span.end + 1),
        line,
      );
      if (/\bnull\b/.test(prose)) add(part.heading, 'literal-null', clip(trimmed));
      if (/\S[ \t]+$/.test(line) || /[^ ] {2,}\S/.test(line))
        add(
          part.heading,
          'blank-from-empty-value',
          // The tail shows where empty values left separators behind.
          JSON.stringify(line.length > 80 ? `...${line.slice(-80)}` : line),
        );
    }
    const blank = /[^\n]*\n[ \t]*\n[^\n]*/.exec(text.trimEnd());
    if (blank) add(part.heading, 'blank-line-inside-section', clip(JSON.stringify(blank[0])));
    // Sections normally end with the single newline before the next heading.
    if (!exempt && /\n[ \t]*\n$/.test(text))
      add(part.heading, 'trailing-blank-line', clip(JSON.stringify(text.slice(-40))));
  }
  return [...findings.values()];
}
/** Entries of a structured Jev state whose value is null or empty, as sent. */
function emptyStateEntries(state: unknown): Record<string, unknown> {
  const context = (state as { decisionContext?: Record<string, unknown> } | undefined)
    ?.decisionContext;
  return Object.fromEntries(
    Object.entries(context ?? {}).filter(([, entry]) => isEmptyJson(entry)),
  );
}
/** Every null/empty path in a structured Jev state, compacted for the printed summary. */
function stateEmptyPaths(state: unknown) {
  const paths = typeof state === 'string' ? [] : emptyPaths(state);
  return { count: paths.length, paths: paths.slice(0, 30) };
}
/** Serialization artifacts that must never reach a model. */
function artifacts(text: string): string[] {
  return [...text.matchAll(/.{0,40}(\bundefined\b|\bNaN\b|\[object Object\]).{0,40}/g)].map(
    (match) => match[0],
  );
}

interface Inspection {
  request: string;
  level: CognitionLevel;
  provider: 'jev' | 'openai';
  bytes: { instructions: number; context: number; schema: number };
  /** Total input bytes / 4 (optimistic) and / 3 (conservative), rounded up. */
  estimatedInputTokens: [number, number];
  maxOutputTokens?: number;
  sections?: Record<string, number>;
}
function tokens(bytes: Inspection['bytes']): [number, number] {
  const total = bytes.instructions + bytes.context + bytes.schema;
  return [Math.ceil(total / 4), Math.ceil(total / 3)];
}
const sectionSizes = (parts: Section[]) =>
  Object.fromEntries(parts.map((part) => [part.heading, part.bytes]));

type Harness = Awaited<ReturnType<typeof harness>>;

/** Inspect one Jev request; Jev counts serialized state plus questions as its level-1 input. */
function inspectJudge(h: Harness, jobId: string, request: JudgeRequest): Inspection {
  const limits = levelLimits(h.config)[1];
  const state = JSON.stringify(request.state);
  const questions = JSON.stringify(request.questions);
  expect(
    JSON.stringify({ state: request.state, questions: request.questions }).length,
  ).toBeLessThanOrEqual(limits.inputSize);
  expect(() => validateJudgmentSize(request.state, request.questions)).not.toThrow();
  expect(artifacts(state + questions), request.requestId).toEqual([]);
  const bytes = {
    instructions: 0,
    context: Buffer.byteLength(state),
    schema: Buffer.byteLength(questions),
  };
  const parts = typeof request.state === 'string' ? sections(request.state) : undefined;
  if (parts) expectCompleteSections(request.state as string, parts);
  return {
    request: request.requestId.slice(jobId.length + 1),
    level: 1,
    provider: 'jev',
    bytes,
    estimatedInputTokens: tokens(bytes),
    ...(parts ? { sections: sectionSizes(parts) } : {}),
  };
}
/** Inspect one generation request against its level's input, schema and output limits. */
function inspectGeneration(
  h: Harness,
  jobId: string,
  request: GenerateRequest,
  level: CognitionLevel,
): Inspection {
  const limits = levelLimits(h.config)[level];
  const context = String(request.context);
  const schema = JSON.stringify(request.schema);
  const bytes = {
    instructions: Buffer.byteLength(request.instructions),
    context: Buffer.byteLength(context),
    schema: Buffer.byteLength(schema),
  };
  expect(request.task).toBe('npc_response');
  expect(request.execution).toBe(level === 2 ? 'fast' : 'complex');
  expect(bytes.instructions + bytes.context).toBeLessThanOrEqual(limits.inputSize);
  expect(bytes.schema).toBeLessThanOrEqual(limits.schemaBytes);
  expect(request.maxOutputTokens ?? Infinity).toBeLessThanOrEqual(limits.outputTokens);
  expect(artifacts(request.instructions + context + schema), request.requestId).toEqual([]);
  const parts = sections(context);
  expectCompleteSections(context, parts);
  return {
    request: request.requestId.slice(jobId.length + 1),
    level,
    provider: 'openai',
    bytes,
    estimatedInputTokens: tokens(bytes),
    ...(request.maxOutputTokens !== undefined ? { maxOutputTokens: request.maxOutputTokens } : {}),
    sections: sectionSizes(parts),
  };
}

interface Totals {
  requests: number;
  reservedUsd: number;
  settledUsd: number;
  uncertain: boolean;
  usageMissing: boolean;
  inputBytes: number;
  schemaBytes: number;
}

async function harness(
  options: {
    script?: Script;
    reply?: (request: GenerateRequest) => unknown;
    food?: boolean;
  } = {},
) {
  const now = 10_000;
  const config = readConfig({
    TYPESAFE_API_KEY: 'test-fixture-key',
    OPENAI_API_KEY: 'test-fixture-key',
    // Background recall indexing otherwise inherits the fixture key and reaches the real
    // embeddings endpoint through the global transport.
    OPENAI_EMBEDDING_API_KEY: '',
    // In-process simulated ceiling for fake receipts; no provider is reachable.
    AI_BUDGET_USD: '1',
  });
  const store = await testRepository();
  const service = new WorldService(store, config, () => now);
  await enterLocalWorld(service);
  await service.setConnection('fixture-browser', true);
  await service.setPresence('fixture-browser', true);
  await service.control({ paused: false });
  const state = {
    script: options.script ?? {},
    reply: options.reply ?? ((): unknown => ({ operations: [] })),
  };
  const calls = { judges: [] as JudgeRequest[], generations: [] as GenerateRequest[] };
  const client: AiClient = {
    async judge(request) {
      calls.judges.push(request);
      return answer(request, state.script);
    },
    async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
      calls.generations.push(request);
      // Only NPC decisions are inspected; background work receives no fixture content.
      return (
        request.task === 'npc_response'
          ? value(request.requestId, 'openai', state.reply(request))
          : {
              outcome: 'unavailable',
              reason: 'fixture',
              receipt: receipt(request.requestId, 'openai'),
            }
      ) as AiResult<T>;
    },
  };
  const director = new AiDirector(service, client, () => now);
  cleanup.push(async () => {
    await director.close();
    await store.close();
  });
  // Hungry, conscious Ada; the resource task also gives her owned edible food.
  await editWorld(service, (world) => {
    if (options.food) createItemLot(world, NPC_ID, 'berries', 2, 'fixture-berries');
    world.entities[NPC_ID]!.actor!.fullness = 30;
  });
  const jobCalls = (jobId: string) => ({
    judges: calls.judges.filter((request) => request.requestId.startsWith(`${jobId}:`)),
    generations: calls.generations.filter((request) => request.requestId.startsWith(`${jobId}:`)),
  });
  async function trace(jobId: string) {
    await director.idle();
    await (director as unknown as { log: IntelligenceLog }).log.flush();
    const details = await traceDetails(store, jobId);
    if (!details) throw new Error('Missing trace root');
    return {
      root: details.root,
      stage: (kind: string) => details.children.filter((child) => child.kind === kind),
    };
  }
  return {
    config,
    store,
    service,
    director,
    calls,
    state,
    jobCalls,
    trace,
    /** Admit one autonomous decision and wait for it; returns the newest thought job. */
    async thought(): Promise<JobRecord> {
      const before = new Set(
        (await store.recentJobs(50)).filter((job) => job.kind === 'thought').map((job) => job.id),
      );
      await director.considerThought();
      await director.idle();
      const jobs = (await store.recentJobs(50)).filter(
        (job) => job.kind === 'thought' && !before.has(job.id),
      );
      expect(jobs).toHaveLength(1);
      return jobs[0]!;
    },
    async chat(id: string, text: string): Promise<JobRecord> {
      const result = await director.submit('chat', id, text, NPC_ID);
      expect(result.ok, result.message).toBe(true);
      await director.idle();
      return (await store.getJob(result.jobId!))!;
    },
    /** The complete accepted "About me" snapshot every semantic decision includes. */
    aboutMe: () => service.world.innerWorlds?.[NPC_ID]?.text ?? '',
    /** The job's Decision accounting stage, checked entry by entry and group by group against
     * the fake receipts and the requests actually dispatched. `generationLevel` is the level
     * the caller expects for the decision's npc_response generation. Returns request levels
     * and compact totals. */
    async accounting(jobId: string, generationLevel?: CognitionLevel) {
      const { stage } = await trace(jobId);
      const records = stage('Decision accounting');
      expect(records.map((record) => record.id)).toEqual([`${jobId}:decision-accounting`]);
      const output = records[0]!.output as {
        groups: Record<string, Totals>;
        total: Totals;
        entries: LedgerEntry[];
      };
      const dispatched = jobCalls(jobId);
      // Expected ledger group of every dispatched request, independent of the ledger itself:
      // Jev routing, selection and context attention are level-1 work; the npc_response
      // generation is the caller's level; anything else is preparation or grounding.
      const LEVEL_ONE = /:(route|action-attention|attention:\d+)$/;
      const expectedGroup = new Map<string, string | null>([
        ...dispatched.judges.map(
          (request) =>
            [request.requestId, LEVEL_ONE.test(request.requestId) ? 'level1' : null] as const,
        ),
        ...dispatched.generations.map((request) => {
          if (request.task === 'npc_response') expect(generationLevel).toBeDefined();
          return [
            request.requestId,
            request.task === 'npc_response' ? `level${generationLevel}` : null,
          ] as const;
        }),
      ]);
      const byId = new Map<string, { provider: 'jev' | 'openai'; size: LedgerEntry['size'] }>([
        ...dispatched.judges.map(
          (request) =>
            [
              request.requestId,
              {
                provider: 'jev' as const,
                size: {
                  instructions: 0,
                  // UTF-8 bytes as submitted; a string state is not re-encoded as JSON.
                  context: Buffer.byteLength(
                    typeof request.state === 'string'
                      ? request.state
                      : JSON.stringify(request.state),
                  ),
                  schema: Buffer.byteLength(JSON.stringify(request.questions)),
                },
              },
            ] as const,
        ),
        ...dispatched.generations.map(
          (request) =>
            [
              request.requestId,
              {
                provider: 'openai' as const,
                size: {
                  instructions: Buffer.byteLength(request.instructions),
                  context: Buffer.byteLength(String(request.context)),
                  schema: Buffer.byteLength(JSON.stringify(request.schema)),
                },
              },
            ] as const,
        ),
      ]);
      // Every dispatched request is in the ledger exactly once, and nothing else is.
      expect(output.entries.map((entry) => entry.requestId).sort()).toEqual(
        [...byId.keys()].sort(),
      );
      const expectedTotals = new Map<
        string,
        {
          requests: number;
          reservedUsd: number;
          settledUsd: number;
          inputBytes: number;
          schemaBytes: number;
        }
      >();
      const add = (key: string, provider: 'jev' | 'openai', size: LedgerEntry['size']) => {
        const totals = expectedTotals.get(key) ?? {
          requests: 0,
          reservedUsd: 0,
          settledUsd: 0,
          inputBytes: 0,
          schemaBytes: 0,
        };
        totals.requests++;
        totals.reservedUsd += decisionAllowance(config, provider);
        totals.settledUsd += FIXTURE_COST_USD;
        totals.inputBytes += size.instructions + size.context;
        totals.schemaBytes += size.schema;
        expectedTotals.set(key, totals);
      };
      for (const entry of output.entries) {
        const sent = byId.get(entry.requestId)!;
        expect(entry.provider).toBe(sent.provider);
        expect(entry.size).toEqual(sent.size);
        expect(entry.reservedUsd).toBeCloseTo(decisionAllowance(config, sent.provider), 12);
        expect(entry.settledUsd).toBeCloseTo(FIXTURE_COST_USD, 12);
        expect(entry.uncertain).toBe(false);
        expect(entry.outcome).toBe(
          sent.provider === 'openai' &&
            dispatched.generations.find((request) => request.requestId === entry.requestId)
              ?.task !== 'npc_response'
            ? 'unavailable'
            : 'value',
        );
        const group = expectedGroup.get(entry.requestId);
        const key = entry.category === 'level' ? `level${entry.level}` : entry.category;
        if (group) expect(key, entry.requestId).toBe(group);
        else expect(entry.category, entry.requestId).not.toBe('level');
        add(group ?? key, sent.provider, sent.size);
      }
      // Group totals match what was actually sent and what the fake receipts charged.
      expect(Object.keys(output.groups).sort()).toEqual([...expectedTotals.keys()].sort());
      const limitsByLevel = levelLimits(config);
      for (const [key, expected] of expectedTotals) {
        const actual = output.groups[key]!;
        expect(actual.requests, key).toBe(expected.requests);
        expect(actual.inputBytes, key).toBe(expected.inputBytes);
        expect(actual.schemaBytes, key).toBe(expected.schemaBytes);
        expect(actual.reservedUsd, key).toBeCloseTo(expected.reservedUsd, 9);
        expect(actual.settledUsd, key).toBeCloseTo(expected.settledUsd, 9);
        expect(actual.uncertain, key).toBe(false);
        // Fixture receipts carry no token usage; the ledger must say so, not report zero.
        expect(actual.usageMissing, key).toBe(true);
        const level = /^level(\d)$/.exec(key)?.[1];
        if (level) {
          const limits = limitsByLevel[Number(level) as CognitionLevel];
          expect(actual.requests, key).toBeLessThanOrEqual(limits.requestsPerDecision);
          expect(actual.reservedUsd, key).toBeLessThanOrEqual(limits.decisionUsd + 1e-9);
        }
      }
      // The recorded limits are the configured limits of exactly the levels that did work.
      const usedLevels = [...new Set(output.entries.flatMap((entry) => entry.level ?? []))];
      expect(records[0]!.input).toEqual({
        limits: Object.fromEntries(
          usedLevels.map((level) => [`level${level}`, limitsByLevel[level]]),
        ),
      });
      const sent = [...byId.values()];
      expect(output.total.requests).toBe(byId.size);
      expect(output.total.inputBytes).toBe(
        sent.reduce((sum, entry) => sum + entry.size.instructions + entry.size.context, 0),
      );
      expect(output.total.schemaBytes).toBe(
        sent.reduce((sum, entry) => sum + entry.size.schema, 0),
      );
      expect(output.total.reservedUsd).toBeCloseTo(
        sent.reduce((sum, entry) => sum + decisionAllowance(config, entry.provider), 0),
        9,
      );
      expect(output.total.settledUsd).toBeCloseTo(byId.size * FIXTURE_COST_USD, 9);
      expect(output.total.uncertain).toBe(false);
      const levels = new Map(
        output.entries.map((entry) => [entry.requestId, entry.level ?? 1] as const),
      );
      return {
        level: (requestId: string) => levels.get(requestId)!,
        summary: {
          groups: Object.fromEntries(
            Object.entries(output.groups).map(([key, totals]) => [key, totals.requests]),
          ),
          requests: output.total.requests,
          reservedUsd: Number(output.total.reservedUsd.toFixed(6)),
          settledUsd: Number(output.total.settledUsd.toFixed(6)),
          usageMissing: output.total.usageMissing,
        },
      };
    },
  };
}

function report(scenario: string, summary: Record<string, unknown>) {
  // fetchCalls is the blocked global transport's count so far; afterEach also asserts zero.
  console.info(
    `PAYLOAD_INSPECTION ${JSON.stringify({ scenario, ...summary, fetchCalls: network.mock.calls.length })}`,
  );
}
const ROUTE = ':attempt:0:route';
const disposition = (job: JobRecord | undefined) =>
  (job?.result as { disposition?: string } | undefined)?.disposition;
const quota = {
  documents: MIND_LIMITS.documents,
  documentBytes: MIND_LIMITS.documentBytes,
  quotaBytes: MIND_LIMITS.documents * MIND_LIMITS.documentBytes,
  greetingTargetBytes: GREETING_TARGET_BYTES,
};

// Disposable PostgreSQL creation and world startup dominate; allow slower shared databases.
describe(
  'CR01 payload inspection with fixture providers and no external requests',
  {
    timeout: 180_000,
  },
  () => {
    it('greeting: routing and one level-2 generation within limits, empty facts stated', async () => {
      const h = await harness({
        script: { route: { level2: 0.9 } },
        reply: (request) => ({
          operations: [
            operation('reply', { talk: talk('Hello. Welcome to camp.', speakerHandle(request)) }),
          ],
        }),
      });
      const job = await h.chat('greeting', 'Hello, Ada.');
      expect(job.status).toBe('completed');
      expect(disposition(job)).toBe('responded');
      const dispatched = h.jobCalls(job.id);
      const route = dispatched.judges.find((request) => request.requestId === `${job.id}${ROUTE}`);
      expect(route).toBeDefined();
      expect(Object.keys(route!.questions)).toEqual(
        expect.arrayContaining(['route', 'reflection', 'possibleAction']),
      );
      // Speech routing sees the same readable context the generation later receives.
      expect(typeof route!.state).toBe('string');
      expect(dispatched.judges.map((request) => request.requestId)).toEqual([
        `${job.id}${ROUTE}`,
        `${job.id}:attempt:0:action-attention`,
      ]);
      expect(dispatched.generations).toHaveLength(1);
      const [generation] = dispatched.generations;
      const ledger = await h.accounting(job.id, 2);
      expect(ledger.level(generation!.requestId)).toBe(2);
      expect(generation).toMatchObject({ execution: 'fast', reasoningEffort: 'low' });
      const inspected = [
        ...dispatched.judges.map((request) => inspectJudge(h, job.id, request)),
        inspectGeneration(h, job.id, generation!, 2),
      ];

      const context = String(generation!.context);
      const parts = sections(context);
      // Routing and generation share every section except the action shortlist; the
      // generation additionally carries the actor-invention context after References.
      const routeParts = sections(route!.state as string);
      for (const part of routeParts.filter((entry) => entry.heading !== 'References'))
        expect(section(parts, part.heading).body, part.heading).toBe(part.body);
      expect(
        parts
          .map((part) => part.heading)
          .filter((heading) => !routeParts.some((entry) => entry.heading === heading)),
      ).toEqual(['Actions']);
      const routeReferences = section(routeParts, 'References').body;
      expect(section(parts, 'References').body.startsWith(routeReferences)).toBe(true);
      // Text the generation carries after the reference list, under no heading of its own.
      const unheaded = section(parts, 'References').body.slice(routeReferences.length);
      // Meaningful empty facts survive as explicit statements rather than blank sections.
      const commitments = section(parts, 'My commitments').body.split('\n');
      expect(commitments[0]).toBe('None supplied.');
      expect(section(parts, 'Private intentions and native work').body).toContain(
        'No remaining chosen work.',
      );
      // Absent optional controls are omitted, not rendered as empty JSON.
      expect(parts.map((part) => part.heading)).not.toContain('Private intent controls');
      // The complete accepted About-me snapshot is present verbatim in both requests.
      const aboutMe = h.aboutMe();
      expect(Buffer.byteLength(aboutMe)).toBeGreaterThan(0);
      expect(section(parts, 'Me').body).toContain(aboutMe);
      expect(section(routeParts, 'Me').body).toContain(aboutMe);
      const input = inspected.at(-1)!.bytes;
      report('greeting', {
        requests: inspected,
        unheadedAfterReferences: unheaded,
        aboutMe: {
          acceptedBytes: Buffer.byteLength(aboutMe),
          meSectionBytes: section(parts, 'Me').bytes,
          revision: h.service.world.innerWorlds?.[NPC_ID]?.revision ?? null,
        },
        greeting: {
          ...quota,
          instructionsPlusContextBytes: input.instructions + input.context,
          withSchemaBytes: input.instructions + input.context + input.schema,
          overTargetBy: input.instructions + input.context - GREETING_TARGET_BYTES,
        },
        scaffolding: scaffolding(parts, h.aboutMe()),
        routeStateScaffolding: scaffolding(routeParts, h.aboutMe()),
        // The byte ceiling the model-facing format states, beside the enforced level-2 limit.
        responseFormatStatedBytes: Number(
          /and (\d+) UTF-8 bytes in total/.exec(section(parts, 'Response format').body)?.[1] ?? NaN,
        ),
        enforcedVisibleOutputBytes: levelLimits(h.config)[2].visibleOutputBytes,
        accounting: ledger.summary,
      });
    });

    it('resource task: one combined Jev request routes and rates owned food', async () => {
      const h = await harness({ food: true });
      const berries = () => quantityOf(h.service.world, NPC_ID, 'berries');
      expect(berries()).toBe(2);
      const job = await h.thought();
      expect(job.status).toBe('completed');
      expect(job.result).toMatchObject({
        disposition: 'responded',
        components: { action: { ok: true, code: 'queued' } },
        level1: { kind: 'act', reason: 'selected', rating: 0.9 },
      });
      const dispatched = h.jobCalls(job.id);
      // Exactly one Jev request carries the route question and every a* rating.
      expect(dispatched.judges.map((request) => request.requestId)).toEqual([`${job.id}${ROUTE}`]);
      expect(dispatched.generations).toHaveLength(0);
      const route = dispatched.judges[0]!;
      const keys = Object.keys(route.questions);
      expect(keys).toEqual(expect.arrayContaining(['route', 'reflection']));
      expect(keys.filter(handleKey).length).toBeGreaterThan(1);
      const state = route.state as {
        decisionContext: Record<string, unknown>;
        candidates: Record<string, string>;
      };
      const decisionContext = state.decisionContext;
      // Owned food is supplied; the no-food fact is correctly absent.
      expect(decisionContext['food']).toBeUndefined();
      expect(JSON.stringify(decisionContext['possessions'])).toContain('Wild berries');
      // The selected handle is the rated eat option, and the next step actually eats.
      // Candidates are labelled "Option N" in question order, aligned with the a* handles.
      const handle = (job.result as { level1: { handle: string } }).level1.handle;
      const description = Object.values(state.candidates)[keys.filter(handleKey).indexOf(handle)];
      expect(isEat(description ?? '')).toBe(true);
      await h.service.tick(0.1);
      expect(berries()).toBe(1);
      const ledger = await h.accounting(job.id);
      report('resource-task:level1', {
        requests: dispatched.judges.map((request) => inspectJudge(h, job.id, request)),
        ratingQuestions: keys.filter(handleKey).length,
        jevStateEmptyEntries: emptyStateEntries(route.state),
        jevStateEmptyPaths: stateEmptyPaths(route.state),
        accounting: ledger.summary,
      });
    });

    it('resource task: level-2 generation payload for the same owned-food task', async () => {
      const h = await harness({ food: true, script: { route: { level2: 0.9 } } });
      const job = await h.thought();
      expect(job.status).toBe('completed');
      const dispatched = h.jobCalls(job.id);
      expect(dispatched.judges.map((request) => request.requestId)).toEqual([`${job.id}${ROUTE}`]);
      expect(dispatched.generations).toHaveLength(1);
      const [generation] = dispatched.generations;
      const ledger = await h.accounting(job.id, 2);
      expect(ledger.level(generation!.requestId)).toBe(2);
      const inspected = [
        ...dispatched.judges.map((request) => inspectJudge(h, job.id, request)),
        inspectGeneration(h, job.id, generation!, 2),
      ];
      const parts = sections(String(generation!.context));
      expect(section(parts, 'Inventory').body).toContain('Wild berries');
      expect(section(parts, 'Me').body).not.toContain('I have no food.');
      // Ratings from the routing request are reused at the relevance line: eating is offered.
      expect(section(parts, 'Actions').body).toContain('Eat one Wild berries');
      const route = dispatched.judges[0]!;
      expect(
        (route.state as { decisionContext: Record<string, unknown> }).decisionContext['food'],
      ).toBeUndefined();
      // The listed eat option's handle is one the generation schema permits.
      const eat = /^- (a\d+): Eat one Wild berries/m.exec(section(parts, 'Actions').body)?.[1];
      expect(eat).toBeDefined();
      expect(actionHandles(generation!.schema)).toContain(eat);
      report('resource-task:level2', {
        trigger: section(parts, 'Trigger').body.trim(),
        requests: inspected,
        aboutMeBytes: Buffer.byteLength(h.aboutMe()),
        scaffolding: scaffolding(parts, h.aboutMe()),
        jevStateEmptyEntries: emptyStateEntries(route.state),
        jevStateEmptyPaths: stateEmptyPaths(route.state),
        accounting: ledger.summary,
      });
    });

    it('resource task without food: "I have no food." reaches Jev and generation', async () => {
      const h = await harness({ food: false, script: { route: { level2: 0.9 } } });
      expect(quantityOf(h.service.world, NPC_ID, 'berries')).toBe(0);
      const job = await h.thought();
      expect(job.status).toBe('completed');
      const dispatched = h.jobCalls(job.id);
      const route = dispatched.judges.find((request) => request.requestId === `${job.id}${ROUTE}`)!;
      expect((route.state as { decisionContext: Record<string, unknown> }).decisionContext).toEqual(
        expect.objectContaining({ food: 'I have no food.' }),
      );
      expect(dispatched.generations).toHaveLength(1);
      const [generation] = dispatched.generations;
      const parts = sections(String(generation!.context));
      expect(section(parts, 'Me').body).toContain('I have no food.');
      const ledger = await h.accounting(job.id, 2);
      expect(ledger.level(generation!.requestId)).toBe(2);
      report('resource-task:no-food', {
        requests: [
          ...dispatched.judges.map((request) => inspectJudge(h, job.id, request)),
          inspectGeneration(h, job.id, generation!, 2),
        ],
        inventory: section(parts, 'Inventory').body.split('\n')[0],
        eatOffered: /^- a\d+: Eat /m.test(section(parts, 'Actions').body),
        scaffolding: scaffolding(parts, h.aboutMe()),
        jevStateEmptyEntries: emptyStateEntries(route.state),
        jevStateEmptyPaths: stateEmptyPaths(route.state),
        accounting: ledger.summary,
      });
    });

    it('promise: a spoken promise becomes a native commitment shown under My commitments', async () => {
      const h = await harness({
        script: { route: { level2: 0.9 } },
        reply: (request) => ({
          operations: [
            operation('promise', {
              talk: talk('I promise to gather berries.', speakerHandle(request)),
            }),
          ],
        }),
      });
      const active = () =>
        (h.service.world.memories[NPC_ID] ?? []).filter(
          (memory) => memory.kind === 'commitment' && !memory.resolved,
        );
      expect(active()).toEqual([]);
      const asked = await h.chat('request', 'Ada, will you gather berries for me?');
      expect(asked.status).toBe('completed');
      expect(disposition(asked)).toBe('responded');
      // The committed speech created the obligation through the real native promise path:
      // its evidence is Ada's own speech event carrying the fixture reply's words.
      expect(active()).toHaveLength(1);
      const commitment = active()[0]!;
      expect(commitment.obligation).toMatchObject({ status: 'active' });
      const spoken = h.service.world.events.find(
        (event) => event.id === commitment.obligation?.evidenceId,
      );
      expect(spoken).toMatchObject({ type: 'speech', actorId: NPC_ID });
      expect(String(spoken?.data?.['text'])).toBe('I promise to gather berries.');

      h.state.reply = (request) => ({
        operations: [
          operation('reply', { talk: talk('I will gather them soon.', speakerHandle(request)) }),
        ],
      });
      const job = await h.chat('follow-up', 'Ada, what did you promise me?');
      expect(job.status).toBe('completed');
      const dispatched = h.jobCalls(job.id);
      expect(dispatched.generations).toHaveLength(1);
      const [generation] = dispatched.generations;
      const parts = sections(String(generation!.context));
      const commitments = section(parts, 'My commitments').body;
      expect(commitments).toContain('I promise to gather berries');
      expect(commitments.split('\n')[0]).toMatch(/^- /);
      expect(commitments).not.toContain('None supplied.');
      const ledger = await h.accounting(job.id, 2);
      expect(ledger.level(generation!.requestId)).toBe(2);
      report('promise', {
        commitmentSummary: commitment!.summary,
        requests: [
          ...dispatched.judges.map((request) => inspectJudge(h, job.id, request)),
          inspectGeneration(h, job.id, generation!, 2),
        ],
        commitmentsSection: commitments.split('\n')[0],
        aboutMeBytes: Buffer.byteLength(h.aboutMe()),
        scaffolding: scaffolding(parts, h.aboutMe()),
        accounting: ledger.summary,
      });
    });

    it('hazard: another actor strikes Ada; combined routing and a level-3 payload', async () => {
      const h = await harness({ script: { route: { level3: 0.9 } } });
      const health = h.service.world.entities[NPC_ID]!.actor!.health;
      const struck = await h.service.command('fixture-punch', {
        type: 'strike',
        definitionId: 'punch',
        targetId: NPC_ID,
      });
      expect(struck.ok, struck.message).toBe(true);
      const hit = () =>
        h.service.world.events.find(
          (event) => event.type === 'struck' && event.targetId === NPC_ID,
        );
      // The player walks into reach and completes the native punch; bounded simulation steps.
      for (let step = 0; step < 400 && !hit(); step++) await h.service.tick(0.5);
      expect(hit(), 'native punch landed').toBeDefined();
      // The blow came from the player's body, not from Ada or the environment.
      expect(hit()!.actorId).toBe(controlledEntityId(h.service.world));
      expect(h.service.world.entities[NPC_ID]!.actor!.health).toBeLessThan(health);

      const job = await h.thought();
      expect(job.status).toBe('completed');
      const dispatched = h.jobCalls(job.id);
      expect(dispatched.judges.map((request) => request.requestId)).toEqual([`${job.id}${ROUTE}`]);
      const route = dispatched.judges[0]!;
      const decisionContext = (route.state as { decisionContext: Record<string, unknown> })
        .decisionContext;
      expect(String(decisionContext['stimulus'])).toMatch(/punched/);
      expect(Object.keys(route.questions).some(handleKey)).toBe(true);
      expect(dispatched.generations).toHaveLength(1);
      const [generation] = dispatched.generations;
      expect(generation).toMatchObject({ execution: 'complex', reasoningEffort: 'low' });
      const ledger = await h.accounting(job.id, 3);
      expect(ledger.level(generation!.requestId)).toBe(3);
      const parts = sections(String(generation!.context));
      expect(section(parts, 'Trigger').body).toMatch(/punched/);
      report('hazard', {
        trigger: section(parts, 'Trigger').body,
        requests: [
          ...dispatched.judges.map((request) => inspectJudge(h, job.id, request)),
          inspectGeneration(h, job.id, generation!, 3),
        ],
        aboutMeBytes: Buffer.byteLength(h.aboutMe()),
        scaffolding: scaffolding(parts, h.aboutMe()),
        jevStateEmptyEntries: emptyStateEntries(route.state),
        jevStateEmptyPaths: stateEmptyPaths(route.state),
        accounting: ledger.summary,
      });
    });

    it('rejects oversize and unsupported output after one generation, with no world effect', async () => {
      // Owned food makes the eat option the one shortlisted action when selection is opened.
      const h = await harness({
        food: true,
        script: { route: { level2: 0.9 }, possibleAction: { no: 0.95 } },
      });
      const limit = levelLimits(h.config)[2].visibleOutputBytes;
      const ada = () => h.service.world.entities[NPC_ID]!.actor!;
      const outcomes: Record<string, unknown>[] = [];
      type Issue = {
        code: string;
        path: (string | number)[];
        expected?: string;
        values?: unknown[];
      };
      /** Per-variant issues of the single-kind union, as the parse stage recorded them. */
      const unionBranches = (parse: { output?: unknown }[]): Issue[][] => {
        const issues = (parse[0]?.output as { error?: unknown } | undefined)?.error;
        const union = Array.isArray(issues)
          ? (issues as { code: string; errors?: Issue[][] }[]).find(
              (issue) => issue.code === 'invalid_union',
            )
          : undefined;
        return union?.errors ?? [];
      };
      const attempt = async (
        name: string,
        reply: (request: GenerateRequest) => unknown,
        script?: Script,
      ) => {
        h.state.reply = reply;
        if (script) h.state.script = script;
        const events = new Set(h.service.world.events.map((event) => event.id));
        const before = structuredClone({
          agency: ada().agency,
          inner: h.service.world.innerWorlds?.[NPC_ID],
          commitments: h.service.world.memories[NPC_ID]?.filter(
            (memory) => memory.kind === 'commitment',
          ),
        });
        const job = await h.chat(name, 'Ada, tell me about the camp.');
        const dispatched = h.jobCalls(job.id);
        // Exactly one paid generation; no repair or retry request followed the rejection.
        expect(dispatched.generations).toHaveLength(1);
        const generation = dispatched.generations[0]!;
        inspectGeneration(h, job.id, generation, 2);
        expect(job.status).toBe('failed');
        expect(h.service.world.responseReceipts?.[job.id]).toBeUndefined();
        expect(
          h.service.world.events.filter(
            (event) => !events.has(event.id) && event.actorId === NPC_ID,
          ),
        ).toEqual([]);
        expect({
          agency: ada().agency,
          inner: h.service.world.innerWorlds?.[NPC_ID],
          commitments: h.service.world.memories[NPC_ID]?.filter(
            (memory) => memory.kind === 'commitment',
          ),
        }).toEqual(before);
        const ledger = await h.accounting(job.id, 2);
        expect(ledger.summary.groups['level2']).toBe(1);
        const { root, stage } = await h.trace(job.id);
        const parse = stage('Response parsing');
        const failure = stage('Workflow failure').map(
          (entry) => (entry.input as { reason?: string }).reason,
        );
        // The failure is recorded, not silent.
        expect(failure).toHaveLength(1);
        // The fixture reply is deterministic, so replaying it yields exactly what was returned.
        const sent = h.state.reply(generation);
        const bytes = Buffer.byteLength(JSON.stringify(sent));
        // Whether the provider JSON Schema actually sent would itself admit this reply.
        const providerAccepts = providerSchema(generation).safeParse(sent).success;
        outcomes.push({
          case: name,
          status: job.status,
          disposition: disposition(job) ?? null,
          traceDisposition: root.disposition ?? null,
          message: job.message,
          failure,
          responseBytes: bytes,
          providerSchemaAccepts: providerAccepts,
          offeredActionHandles: actionHandles(generation.schema),
          parseStage: parse.map((entry) => entry.status),
          parseError: parse.map((entry) => JSON.stringify(entry.output ?? null).slice(0, 240)),
          generations: dispatched.generations.length,
          accounting: ledger.summary,
        });
        return { job, parse, bytes, generation, providerAccepts };
      };

      // Beyond the advertised response envelope, as from a provider ignoring its token ceiling.
      const oversize = await attempt('oversize', (request) => ({
        operations: [
          operation('reply', {
            talk: talk('The camp is quiet tonight. '.repeat(1700).trim(), speakerHandle(request)),
          }),
        ],
      }));
      expect(oversize.bytes).toBeGreaterThan(limit);
      expect(disposition(oversize.job)).toBe('invalid');
      expect(oversize.job.message).toBe(
        `The level 2 response exceeded its ${limit}-byte visible-output allowance. No paid repair was attempted.`,
      );
      // Rejected before parsing: the oversized value was never interpreted.
      expect(oversize.parse).toEqual([]);

      const twoKinds = await attempt('two-kinds', (request) => ({
        operations: [
          operation('both', {
            talk: talk('Hello.', speakerHandle(request)),
            think: { text: 'A private thought.', aboutEntityIds: [] },
          }),
        ],
      }));
      expect(twoKinds.providerAccepts).toBe(false);
      expect(twoKinds.parse.map((entry) => entry.status)).toEqual(['failed']);
      expect(disposition(twoKinds.job)).toBe('invalid');
      expect(twoKinds.job.message).toBe(
        'The response did not match the decision contract. No paid repair was attempted.',
      );
      // The bound schema is a union of single-kind shapes. The talk-only and think-only shapes
      // each fail on exactly one field, the other kind, so the second kind alone is the defect.
      const twoKindSingles = unionBranches(twoKinds.parse)
        .filter((branch) => branch.length === 1)
        .map(([issue]) => ({ path: issue!.path.join('.'), expected: issue!.expected }));
      expect(twoKindSingles).toEqual(
        expect.arrayContaining([
          { path: 'think', expected: 'null' },
          { path: 'talk', expected: 'null' },
        ]),
      );
      expect(twoKindSingles).toHaveLength(2);

      // Offer real action handles so the rejected handle is unknown, not merely any handle.
      const unknownAction = await attempt(
        'unknown-action',
        () => ({
          operations: [
            operation('act', {
              act: {
                kind: 'known',
                actionId: 'a99',
                verb: null,
                targetEntityId: null,
                description: null,
                invocation: null,
                slots: null,
                mode: 'enqueue',
              },
            }),
          ],
        }),
        { route: { level2: 0.9 }, possibleAction: { yes: 0.9 } },
      );
      const offered = actionHandles(unknownAction.generation.schema);
      expect(offered.length).toBeGreaterThan(0);
      expect(offered).not.toContain('a99');
      expect(unknownAction.providerAccepts).toBe(false);
      expect(unknownAction.parse.map((entry) => entry.status)).toEqual(['failed']);
      expect(disposition(unknownAction.job)).toBe('invalid');
      // The act-only shape fails on exactly one field: the handle is not an offered value.
      const actBranch = unionBranches(unknownAction.parse).find((branch) =>
        branch.every((issue) => issue.path[0] === 'act'),
      );
      expect(actBranch).toHaveLength(1);
      expect(actBranch![0]).toMatchObject({ code: 'invalid_value', path: ['act', 'actionId'] });
      report('output-rejection', { visibleOutputBytes: limit, outcomes });
    });

    it('accepted inner world near its quota versus the level-2 input budget and greeting target', async () => {
      const reply = (request: GenerateRequest) => ({
        operations: [operation('reply', { talk: talk('Hello.', speakerHandle(request)) })],
      });
      const h = await harness({ script: { route: { level2: 0.9 } }, reply });
      // Files at the per-file byte quota; long hyphenated words keep each under 500 words.
      const files = Array.from({ length: MIND_LIMITS.documents }, (_, index) => {
        const path = `memory-${index}.md`;
        const words: string[] = [];
        const word = `long-remembered-riverside-evening-${index}`;
        while (
          byteCount(`${path}\n${[...words, word].join(' ')}`) <= MIND_LIMITS.documentBytes &&
          wordCount(`${path} ${[...words, word].join(' ')}`) <= MIND_LIMITS.words
        )
          words.push(word);
        return { path, text: words.join(' ') };
      });
      const fileBytes = files.map((file) => byteCount(`${file.path}\n${file.text}`));
      expect(Math.min(...fileBytes)).toBeGreaterThan(MIND_LIMITS.documentBytes - 64);
      const half = { ...files[9]!, text: files[9]!.text.slice(0, files[9]!.text.length / 2) };
      /** One greeting with the given accepted files; flattenFiles enforces the file quota. */
      const probe = async (
        target: Harness,
        world: string,
        count: number,
        accepted: typeof files,
      ) => {
        const text = flattenFiles(accepted);
        await editWorld(target.service, (state) => {
          const prior = state.innerWorlds![NPC_ID]!;
          state.innerWorlds![NPC_ID] = {
            ...prior,
            text,
            files: accepted,
            revision: prior.revision + 1,
          };
        });
        expect(target.aboutMe()).toBe(text);
        const job = await target.chat(`quota-${world}-${count}`, 'Hello, Ada.');
        const dispatched = target.jobCalls(job.id);
        expect(dispatched.generations.length).toBeLessThanOrEqual(1);
        const generation = dispatched.generations[0];
        // Every request actually sent stays within its level's limits.
        const requests = [
          ...dispatched.judges.map((request) => inspectJudge(target, job.id, request)),
          ...(generation ? [inspectGeneration(target, job.id, generation, 2)] : []),
        ];
        const { stage } = await target.trace(job.id);
        const failure = stage('Workflow failure').map(
          (entry) => (entry.input as { reason?: string }).reason,
        );
        // CG09: the complete snapshot is never truncated. A decision either sends all of it or
        // sends no generation, fails and records why.
        if (generation) {
          expect(String(generation.context)).toContain(text);
          expect(job.status).toBe('completed');
        } else {
          expect(job.status).toBe('failed');
          expect(failure).toHaveLength(1);
        }
        const route = dispatched.judges.find(
          (request) => request.requestId === `${job.id}${ROUTE}`,
        );
        const accounting = requests.length
          ? (await target.accounting(job.id, generation ? 2 : undefined)).summary
          : null;
        return {
          world,
          files: count,
          acceptedBytes: Buffer.byteLength(text),
          status: job.status,
          disposition: disposition(job) ?? null,
          message: job.message,
          failure,
          requestsSent: requests.length,
          routeHasCompleteSnapshot:
            typeof route?.state === 'string' ? route.state.includes(text) : null,
          generationInputBytes: generation
            ? Buffer.byteLength(generation.instructions) +
              Buffer.byteLength(String(generation.context))
            : null,
          accounting,
        };
      };
      // Largest first in one world: the whole quota, nine and a half files, then nine and
      // eight. Each greeting is a fresh decision; earlier greetings stay in the conversation.
      const probes: Record<string, unknown>[] = [];
      for (const [count, accepted] of [
        [10, files],
        [9.5, [...files.slice(0, 9), half]],
        [9, files.slice(0, 9)],
        [8, files.slice(0, 8)],
      ] as [number, typeof files][])
        probes.push(await probe(h, 'shared', count, accepted));
      // Nine and a half files again in a fresh world, so no earlier unanswered greeting
      // confounds the result.
      const fresh = await harness({ script: { route: { level2: 0.9 } }, reply });
      probes.push(await probe(fresh, 'fresh', 9.5, [...files.slice(0, 9), half]));
      // Not vacuous: at least the eight-file snapshot (about 64 KB) reaches a generation.
      expect(probes.find((entry) => entry['files'] === 8)).toMatchObject({
        status: 'completed',
        routeHasCompleteSnapshot: true,
      });
      report('inner-world-quota', {
        ...quota,
        fileBytes: fileBytes[0],
        level2InputLimit: levelLimits(h.config)[2].inputSize,
        level1InputLimit: levelLimits(h.config)[1].inputSize,
        probes,
      });
    }, 300_000);
  },
);
