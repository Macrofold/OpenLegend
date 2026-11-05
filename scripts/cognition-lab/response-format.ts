/** Compile request-only format comparisons. The generic worker/execution owners
 * retain dispatch, funding, receipts and recovery; planning performs no I/O to them. */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  prepareMacrofoldGenerationInput,
  prepareSchema,
  serialize,
  type GenerateRequest,
  type MacrofoldOutputMode,
} from '@open-legend/ai';
import { campaign, type WorkerJob } from '../verification-workers/contracts.mjs';
import { executeAiRequest } from '../verification-workers/execute-ai.js';

const checksum = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const encoded = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const run = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const entrypoint = 'scripts/cognition-lab/response-format.ts';
const arms = ['A', 'B', 'C', 'D'] as const;
type Arm = (typeof arms)[number];

// Explicit fields prevent a captured provider/service credential envelope from
// being mistaken for model input. This is the shared service's catalog request,
// not a second provider execution contract.
const requestSchema = z
  .object({
    requestId: z.string().min(1).max(256).optional(),
    deadlineMs: z.number().finite().optional(),
    model: z.string().min(1).max(256).optional(),
    reasoningEffort: z.enum(['none', 'low', 'medium', 'high']).optional(),
    task: z.string().min(1),
    instructions: z.string().min(1),
    context: z.json(),
    schema: z.record(z.string(), z.json()),
    schemaName: z.string().optional(),
    maxOutputTokens: z.number().int().min(1).max(16384),
    actorScope: z.string().optional(),
    execution: z.enum(['fast', 'complex']).optional(),
    macrofoldOutputMode: z.enum(['json_schema', 'json_object', 'prompted_json']).optional(),
  })
  .strict();
type FrozenRequest = Omit<z.infer<typeof requestSchema>, 'macrofoldOutputMode'>;
// A lane name alone does not prove its configured strategy. The shared owner
// checks this assertion before a paid attempt or reservation is created.
const dispatchRequestSchema = requestSchema.required({ macrofoldOutputMode: true });

/** B obtains its exact instruction suffix from the same compiler as C/D. No
 * production placement flag, hand-copied schema or alternate decoder is needed. */
export function compileResponseFormats(input: unknown, model: string) {
  const captured = requestSchema.parse(input);
  if (captured.model !== undefined && captured.model !== model)
    throw new Error('The selected model differs from the frozen request.');
  // Captures include the active policy; output mode is the deliberately varied
  // factor rather than character meaning shared by all four arms.
  const {
    requestId: _requestId,
    deadlineMs: _deadline,
    macrofoldOutputMode: _outputMode,
    ...meaning
  } = captured;
  const baseline: FrozenRequest = { ...meaning, model };
  const schema = prepareSchema(baseline.schema, 500_000);
  const compiled = (request: FrozenRequest, mode: MacrofoldOutputMode) =>
    prepareMacrofoldGenerationInput({ ...request, requestId: 'format-compilation' }, schema, mode);
  const objectInput = compiled(baseline, 'json_object');
  const system = z
    .array(z.object({ role: z.string(), content: z.string() }))
    .parse(objectInput['messages'])[0]!;
  const requests = {
    A: baseline,
    B: { ...baseline, instructions: system.content },
    C: baseline,
    D: baseline,
  };
  const modes = {
    A: 'json_schema',
    B: 'json_schema',
    C: 'json_object',
    D: 'prompted_json',
  } as const;
  const inputs = Object.fromEntries(
    arms.map((arm) => [arm, compiled(requests[arm], modes[arm])]),
  ) as Record<Arm, Record<string, unknown>>;
  const withoutFormat = ({ response_format: _format, ...input }: Record<string, unknown>) => input;
  const checks = {
    strictDefaultUnchanged:
      JSON.stringify(inputs.A) ===
      JSON.stringify(
        prepareMacrofoldGenerationInput({ ...baseline, requestId: 'format-compilation' }, schema),
      ),
    strictAndObjectMessagesIdentical:
      JSON.stringify(inputs.B['messages']) === JSON.stringify(inputs.C['messages']),
    objectAndPromptedOnlyFormatDiffers:
      JSON.stringify(withoutFormat(inputs.C)) === JSON.stringify(inputs.D),
    strictAndObjectOnlyFormatDiffers:
      JSON.stringify(withoutFormat(inputs.B)) === JSON.stringify(withoutFormat(inputs.C)),
  };
  if (Object.values(checks).some((value) => !value))
    throw new Error('Response format arms do not preserve their declared byte relations.');
  return { requests, modes, inputs, checks };
}

async function frozenFile(path: string, value: string) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    const previous = await readFile(path, 'utf8');
    if (previous !== value) throw new Error(`Frozen output differs: ${path}`);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    await writeFile(path, value, { flag: 'wx', mode: 0o600 });
  }
}

function flags(args: string[]) {
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index],
      value = args[index + 1];
    if (!name?.startsWith('--') || value === undefined || Object.hasOwn(values, name.slice(2)))
      throw new Error('Use unique --name value arguments.');
    values[name.slice(2)] = value;
  }
  return values;
}

const planOptions = z
  .object({
    request: z.string().min(1),
    source: z.string().regex(/^[a-f0-9]{40}$/),
    'task-id': z.string().min(1),
    'allocation-id': z.string().min(1),
    concurrency: z.coerce.number().int().positive(),
    model: z.string().min(1),
    'strict-lane': z.string().min(1),
    'json-object-lane': z.string().min(1),
    'prompted-lane': z.string().min(1),
    'call-limit-micro-usd': z.coerce.number().int().positive().max(100_000_000),
    repeats: z.coerce.number().int().min(1).max(3),
    output: z.string().min(1),
  })
  .strict();

export async function planResponseFormats(values: unknown) {
  const options = planOptions.parse(values);
  // A declared source must actually include this maintained executable.
  await run('git', ['cat-file', '-e', `${options.source}:${entrypoint}`], { cwd: root });
  const bytes = await readFile(resolve(options.request));
  if (bytes.byteLength > 2_000_000)
    throw new Error('Frozen generation request exceeds its input allowance.');
  const comparison = compileResponseFormats(JSON.parse(bytes.toString()), options.model);
  const output = resolve(options.output),
    inputRoot = join(output, 'inputs');
  const declaration = {
    ...options,
    request: resolve(options.request),
    sourceRequestSha256: checksum(bytes),
  };
  const identity = checksum(JSON.stringify(declaration)).slice(0, 24);
  const lane = {
    A: options['strict-lane'],
    B: options['strict-lane'],
    C: options['json-object-lane'],
    D: options['prompted-lane'],
  };
  if (new Set([lane.A, lane.C, lane.D]).size !== 3)
    throw new Error('Declare distinct configured lanes for the three output strategies.');
  const jobs: WorkerJob[] = [],
    paths: string[] = [],
    positions = [];
  // Cyclic order gives each arm a different ordinal in each of the three waves.
  // Actual concurrent execution/provider/cache conditions remain reportable data.
  for (let wave = 0; wave < options.repeats; wave++)
    for (let order = 0; order < arms.length; order++) {
      const arm = arms[(wave + order) % arms.length]!;
      const id = `r1-w${wave + 1}-${arm.toLowerCase()}`;
      const request = {
        ...comparison.requests[arm],
        requestId: `r1-${identity}-${id}`,
        macrofoldOutputMode: comparison.modes[arm],
      };
      const requestBytes = encoded(request),
        path = `requests/${id}.json`,
        sha256 = checksum(requestBytes);
      paths.push(path);
      positions.push({
        id,
        arm,
        wave: wave + 1,
        order: order + 1,
        lane: lane[arm],
        outputMode: comparison.modes[arm],
        requestId: request.requestId,
        requestSha256: sha256,
        compiledInputSha256: checksum(serialize(comparison.inputs[arm], 500_000)),
        messagesSha256: checksum(serialize(comparison.inputs[arm]['messages'], 500_000)),
      });
      jobs.push({
        id,
        mode: 'batch',
        timeoutSeconds: 180,
        acceptance: 'measurement',
        paid: { limitMicroUsd: options['call-limit-micro-usd'], maxCalls: 1, lanes: [lane[arm]] },
        cases: [
          {
            id: 'smoke',
            source: options.source,
            inputs: [{ id: 'request', bundle: 'response-format-inputs' }],
            steps: [
              {
                id: 'generate',
                argv: [
                  'node',
                  '--import',
                  'tsx',
                  entrypoint,
                  'execute',
                  '--request',
                  `{inputs}/request/${path}`,
                  '--sha256',
                  sha256,
                  '--output',
                  '{results}',
                ],
              },
            ],
            requiredArtifacts: ['request.json', 'result.json', 'execution.json'],
          },
        ],
        requiredArtifacts: [
          'result.json',
          'timeline.json',
          'cases/smoke/results/request.json',
          'cases/smoke/results/result.json',
          'cases/smoke/results/execution.json',
        ],
      });
      await frozenFile(join(inputRoot, path), requestBytes);
    }
  const plan = campaign({
    taskId: options['task-id'],
    cloudAllocationId: options['allocation-id'],
    concurrency: options.concurrency,
    deadlineSeconds: Math.max(360, Math.ceil(jobs.length / options.concurrency) * 180 + 120),
    lifetime: 'attached',
    inputs: [{ id: 'response-format-inputs', root: inputRoot, paths }],
    jobs,
  });
  const index = {
    kind: 'response-format-request-comparison',
    declaration,
    checks: comparison.checks,
    plannedCalls: jobs.length,
    modelReserveMicroUsd: jobs.length * options['call-limit-micro-usd'],
    deadlinePerCallMs: 31_000,
    meaning:
      'Request-only diagnostics; no native effects or model-quality pass is implied. No campaign or provider request was launched.',
    positions,
  };
  await frozenFile(join(output, 'response-format-index.json'), encoded(index));
  await frozenFile(join(output, 'campaign.json'), encoded(plan));
  return {
    campaign: join(output, 'campaign.json'),
    index: join(output, 'response-format-index.json'),
    calls: jobs.length,
    checks: comparison.checks,
  };
}

async function executeFrozen(values: unknown) {
  const options = z
    .object({
      request: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      output: z.string().min(1),
    })
    .strict()
    .parse(values);
  const bytes = await readFile(options.request);
  if (checksum(bytes) !== options.sha256)
    throw new Error('Frozen arm request differs from the admitted plan.');
  const original = dispatchRequestSchema.parse(JSON.parse(bytes.toString()));
  if (!original.requestId || original.deadlineMs !== undefined)
    throw new Error('The arm needs its planned request identity and no expired deadline.');
  const output = resolve(options.output);
  await mkdir(output, { recursive: true, mode: 0o700 });
  const path = join(output, 'request.json');
  // Persist once before dispatch. A repeated step refuses; receipt observation,
  // never a fresh deadline or blind paid resubmission, owns recovery.
  const request: GenerateRequest = {
    ...original,
    requestId: original.requestId,
    deadlineMs: Date.now() + 31_000,
  };
  await writeFile(path, encoded(request), { flag: 'wx', mode: 0o600 });
  const startedAt = new Date().toISOString();
  let code = 1;
  try {
    const result = await executeAiRequest('generate', path, join(output, 'result.json'));
    code = result.outcome === 'value' ? 0 : 1;
  } finally {
    await writeFile(
      join(output, 'execution.json'),
      encoded({
        requestId: request.requestId,
        requestSha256: checksum(encoded(request)),
        frozenRequestSha256: options.sha256,
        deadlineMs: request.deadlineMs,
        startedAt,
        completedAt: new Date().toISOString(),
        code,
        signal: null,
      }),
      { flag: 'wx', mode: 0o600 },
    );
  }
  if (code !== 0) process.exitCode = code;
}

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  if (command === 'plan') console.log(JSON.stringify(await planResponseFormats(flags(rest))));
  else if (command === 'execute') await executeFrozen(flags(rest));
  else
    throw new Error(
      'Use response-format.ts plan --request FILE --source COMMIT --task-id ID --allocation-id ID --concurrency N --model MODEL --strict-lane ID --json-object-lane ID --prompted-lane ID --call-limit-micro-usd N --repeats 3 --output DIRECTORY.',
    );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
