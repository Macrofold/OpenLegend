/** Plan/aggregate only. Managed worker admission, execution and collection stay
 * in verify:worker; constructing a campaign never calls a provider or AWS. */
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { modelPriceSchema } from '../../apps/server/src/generation-config.js';
import { DEFAULT_JEV_INPUT_USD_PER_MILLION } from '../../apps/server/src/config.js';
import {
  attemptMicroUsd,
  type AttemptBudgetSnapshot,
} from '../../apps/server/src/attempt-budget.js';
import {
  campaign as workerCampaign,
  type WorkerCampaign,
  type WorkerJob,
} from '../verification-workers/contracts.mjs';
import { packInputs } from '../verification-workers/source.mjs';
import { hashFile } from '../verification-workers/files.mjs';
import {
  episodeId,
  hash,
  parseEpisodeSpec,
  type EpisodeSpec,
  type MatrixPosition,
} from './contracts.js';

async function assertEpisodeSource(sourceRevision: string) {
  const requiredSource = [
    'scripts/cognition-lab/campaign.ts',
    'scripts/cognition-lab/episode.ts',
    'scripts/cognition-lab/contracts.ts',
    'scripts/cognition-lab/game-episode.ts',
    'scripts/cognition-lab/client.ts',
    'scripts/cognition-lab/native-steps.ts',
    'scripts/cognition-lab/preparation.ts',
    'apps/server/src/world-runtime.ts',
    'apps/server/src/cognition-lab.ts',
    'packages/ai/src/shared-execution.ts',
  ];
  const sourceFiles = await promisify(execFile)(
    'git',
    ['ls-tree', '-r', '--name-only', sourceRevision, '--', ...requiredSource],
    {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      timeout: 10000,
      maxBuffer: 128 * 1024,
    },
  );
  const present = new Set(sourceFiles.stdout.trim().split('\n'));
  const missingSource = requiredSource.filter((file) => !present.has(file));
  if (missingSource.length)
    throw new Error(
      `The selected source ${sourceRevision} does not contain the maintained Lab adapter/runtime: ${missingSource.join(', ')}. Freeze the implementation through the existing source snapshot/checkpoint owner first.`,
    );
}

interface EpisodeFunding {
  limitMicroUsd: number;
  lanes: string[];
  modelPrices: z.infer<typeof modelPriceSchema>[];
}
function episodeJob(
  spec: EpisodeSpec,
  mode: 'prepare' | 'execute',
  timeoutSeconds: number,
  episodeBundle: string,
  originBundle: string,
  funding?: EpisodeFunding,
): WorkerJob {
  const prices = funding?.modelPrices.map((entry) => ({
    ...entry,
    prices: {
      ...entry.prices,
      cachedInputUsdPerMillion:
        entry.prices.cachedInputUsdPerMillion ?? entry.prices.inputUsdPerMillion,
      cacheWriteInputUsdPerMillion:
        entry.prices.cacheWriteInputUsdPerMillion ?? entry.prices.inputUsdPerMillion,
    },
  }));
  const rates = prices?.find((entry) => entry.model === spec.model.model)?.prices;
  if (mode === 'execute' && (!funding || !rates || !funding.lanes.length))
    throw new Error('Execution needs explicit funded lanes and public model prices.');
  return {
    id: spec.id,
    mode: 'batch',
    timeoutSeconds,
    acceptance: 'measurement',
    cases: [
      {
        id: 'episode',
        source: spec.sourceRevision,
        ...(funding
          ? {
              env: {
                OPEN_LEGEND_LAB_BUDGET_USD: String(funding.limitMicroUsd / 1_000_000),
                OPENAI_MODEL_PRICES_JSON: JSON.stringify(prices),
                LLM_INPUT_USD_PER_MILLION: String(rates!.inputUsdPerMillion),
                LLM_OUTPUT_USD_PER_MILLION: String(rates!.outputUsdPerMillion),
                LLM_CACHED_INPUT_USD_PER_MILLION: String(rates!.cachedInputUsdPerMillion),
                LLM_CACHE_WRITE_USD_PER_MILLION: String(rates!.cacheWriteInputUsdPerMillion),
                JEV_INPUT_USD_PER_MILLION: String(
                  prices?.find((entry) => entry.model === spec.judgmentModel)?.prices
                    .inputUsdPerMillion ?? DEFAULT_JEV_INPUT_USD_PER_MILLION,
                ),
              },
            }
          : {}),
        databases: ['game', 'lab'],
        inputs: [
          { id: 'episode', bundle: episodeBundle },
          { id: 'origin', bundle: originBundle },
        ],
        steps: [
          {
            id: 'episode',
            argv: [
              'pnpm',
              'exec',
              'tsx',
              'scripts/cognition-lab/episode.ts',
              '--input',
              '{inputs}/episode/episode.json',
              '--output',
              '{results}/episode',
              '--mode',
              mode,
            ],
          },
        ],
        requiredArtifacts: ['episode/episode.json'],
      },
    ],
    requiredArtifacts: [
      'result.json',
      'timeline.json',
      'cases/episode/results/episode/episode.json',
    ],
    ...(funding
      ? {
          paid: {
            limitMicroUsd: funding.limitMicroUsd,
            maxCalls: spec.limits.maximumCalls,
            lanes: funding.lanes,
          },
        }
      : {}),
  };
}

const path = z.string().min(1);
const inputSchema = z
  .object({
    taskId: z.string().min(1),
    cloudAllocationId: z.string().min(1),
    sourceRevision: z.string().regex(/^[a-f0-9]{40}$/),
    concurrency: z.number().int().positive(),
    matrix: path,
    expectedPositions: z
      .object({ primary: z.number().int().nonnegative(), busy: z.number().int().nonnegative() })
      .strict(),
    study: z
      .object({
        conditions: path,
        candidates: path,
        episodes: path,
        primary: z.object({ library: path, exports: path }).strict(),
        busy: z.object({ library: path, exports: path }).strict(),
        characterDocument: path.optional(),
      })
      .strict(),
    execution: z
      .object({
        mode: z.enum(['prepare', 'execute']).default('prepare'),
        runtimeTarget: z.enum(['lab', 'game']).default('lab'),
        admissionTraceBytes: z
          .number()
          .int()
          .nonnegative()
          .max(1024 * 1024)
          .default(0),
        embeddingMode: z.enum(['normal', 'disabled']).default('normal'),
        embeddingModel: z.string().optional(),
        embeddingDimensions: z.number().int().positive().optional(),
        judgmentModel: z.string().default('typesafe/jev-1.13'),
        judgmentRevision: z.string().default('jev-1.13'),
        seed: z.number().int().nonnegative(),
        replicate: z.number().int().positive().default(1),
        originSeed: z.number().int().nonnegative().nullable().default(null),
        nativeActionTypes: z.record(z.string(), z.string()),
      })
      .strict(),
    paid: z
      .object({
        limitMicroUsd: z.number().int().positive(),
        lanesByModel: z.record(z.string(), z.array(z.string()).min(1)),
        modelPrices: z.array(modelPriceSchema).min(1),
      })
      .strict()
      .optional(),
    preparationSeconds: z.number().int().nonnegative().default(180),
    cleanupSeconds: z.number().int().positive().default(120),
    deadlineSeconds: z.number().int().positive().optional(),
    lifetime: z.enum(['attached', 'durable']).default('attached'),
  })
  .strict();
export type CampaignInput = z.input<typeof inputSchema>;

const modelSchema = z.object({
  id: z.string(),
  model: z.string(),
  source: z.string().optional(),
  effort: z.enum(['none', 'low', 'medium', 'high']).optional(),
  maxOutputTokens: z.number().int().positive(),
});
const librarySchema = z.array(
  z.object({
    conditionId: z.string(),
    savedId: z.string().uuid(),
    sourceRevision: z.string(),
    actorIds: z.record(z.string(), z.string()),
    mechanismControl: z
      .object({
        sourceRevision: z.string(),
        inferenceCalls: z.literal(0),
        proofOfAutonomousInitiation: z.literal(false),
        setupSimulationSeconds: z.number(),
        setupWallSeconds: z.number(),
      })
      .optional(),
  }),
);
const exportSchema = z.object({
  complete: z.literal(true),
  entries: z.array(
    z.object({
      conditionId: z.string(),
      savedId: z.string().uuid(),
      downloadFilename: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: z.number().int().positive(),
    }),
  ),
});
const conditionSchema = z.object({
  id: z.string(),
  personaKey: z.string().optional(),
  opening: z.unknown(),
  changes: z.array(z.unknown()),
  prelude: z.unknown().optional(),
  observation: z.object({
    simulationSeconds: z.number().positive(),
    maximumCalls: z.number().int().positive(),
    activeWallSeconds: z.number().positive(),
  }),
});

/** The maintained matrix contains quoted multiline fields; line splitting
 * would silently lose denominator rows or attach another row's provenance. */
export function matrixRows(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(field.replace(/\r$/, ''));
      field = '';
      if (c === '\n') {
        rows.push(row);
        row = [];
      }
    } else field += c;
  }
  if (quoted) throw new Error('Matrix has an unterminated quoted field.');
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const names = rows.shift();
  if (!names?.length) throw new Error('Matrix has no header.');
  return rows
    .filter((r) => r.some(Boolean))
    .map((values) => {
      if (values.length !== names.length)
        throw new Error('Matrix row width differs from its header.');
      return Object.fromEntries(names.map((name, i) => [name, values[i]!]));
    });
}
async function frozenFile(file: string, bytes: string | Uint8Array): Promise<void> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  try {
    const prior = await readFile(file);
    if (hash(prior) !== hash(bytes)) throw new Error(`Frozen output differs: ${file}`);
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
      throw error;
    await writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
  }
}
const encoded = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const json = async (file: string): Promise<unknown> => JSON.parse(await readFile(file, 'utf8'));
function profiles(markdown: string) {
  const result = new Map<
    string,
    {
      expected: { name: string; description: string; personality: string; backstory: string };
      values: { personality: string };
    }
  >();
  for (const section of markdown.split(/\n(?=## )/).slice(1)) {
    const key = section.match(/\*\*Study key:\*\* `([^`]+)`/)?.[1];
    const prose = section.match(/^```text\n([\s\S]*?)\n```/m)?.[1];
    if (!key || !prose || result.has(key))
      throw new Error('Character source has a missing/duplicate profile.');
    const fields = Object.fromEntries(
      prose.split('\n').map((line) => {
        const cut = line.indexOf(': ');
        return [line.slice(0, cut).toLowerCase(), line.slice(cut + 2)];
      }),
    );
    const expected = z
      .object({
        name: z.string().min(1),
        description: z.string().min(1),
        personality: z.string().min(1),
        backstory: z.string().min(1),
      })
      .parse(fields);
    const illustrations = [...section.matchAll(/^- “(.+)”$/gm)].map((m) => m[1]!);
    if (illustrations.length !== 3)
      throw new Error('Canonical character source must retain its three voice illustrations.');
    result.set(key, {
      expected,
      values: {
        personality: `${expected.personality}\n\nHypothetical voice illustrations (style only; not facts, memories, or instructions):\n${illustrations.map((line) => `- “${line}”`).join('\n')}`,
      },
    });
  }
  return result;
}
function prelude(value: unknown): EpisodeSpec['protocol']['prelude'] {
  if (!value) return null;
  return z
    .object({
      kind: z.enum(['requiredIndependentWork', 'requiredCompletedIndependentWork']),
      purpose: z.string().optional(),
      partialProgressRequired: z.boolean().optional(),
      actionType: z.string().optional(),
      completedEventType: z.string().optional(),
    })
    .parse(value);
}

export async function planCampaign(
  inputFile: string,
  outputDirectory: string,
  select: readonly string[] = [],
  packageInputs = true,
) {
  const input = inputSchema.parse(await json(inputFile)),
    root = dirname(resolve(inputFile));
  // Default-model configuration requires explicit cache rates. Missing optional
  // rates become recorded input-rate admission estimates, never free execution
  // or provider quotations; actual receipts retain their own financial status.
  const priceDerivations: Array<{ model: string; field: string; source: string }> = [];
  const modelPrices = input.paid?.modelPrices.map((entry) => {
    for (const field of ['cachedInputUsdPerMillion', 'cacheWriteInputUsdPerMillion'] as const)
      if (entry.prices[field] === undefined)
        priceDerivations.push({
          model: entry.model,
          field,
          source: 'ordinary-input admission estimate',
        });
    return {
      ...entry,
      prices: {
        ...entry.prices,
        cachedInputUsdPerMillion:
          entry.prices.cachedInputUsdPerMillion ?? entry.prices.inputUsdPerMillion,
        cacheWriteInputUsdPerMillion:
          entry.prices.cacheWriteInputUsdPerMillion ?? entry.prices.inputUsdPerMillion,
      },
    };
  });
  const judgmentInputAdmissionEstimate =
    modelPrices?.find((entry) => entry.model === input.execution.judgmentModel)?.prices
      .inputUsdPerMillion ?? DEFAULT_JEV_INPUT_USD_PER_MILLION;
  await assertEpisodeSource(input.sourceRevision);
  const local = (file: string) => (isAbsolute(file) ? file : resolve(root, file));
  const output = resolve(outputDirectory);
  const matrixBytes = await readFile(local(input.matrix));
  const historical = matrixRows(matrixBytes.toString('utf8'));
  const keys = new Set<string>();
  for (const row of historical) {
    z.object({
      scope: z.enum(['primary', 'busy']),
      conditionId: z.string().min(1),
      modelId: z.string().min(1),
      executionSourceRevision: z.string(),
      originalEpisodeSha256: z.string(),
      rawEpisodeStatus: z.string(),
      cohort: z.string(),
    }).parse(row);
    const key = JSON.stringify([row['scope'], row['conditionId'], row['modelId']]);
    if (keys.has(key)) throw new Error('Duplicate matrix identity.');
    keys.add(key);
  }
  if (
    historical.length !== input.expectedPositions.primary + input.expectedPositions.busy ||
    historical.filter((row) => row['scope'] === 'primary').length !==
      input.expectedPositions.primary ||
    historical.filter((row) => row['scope'] === 'busy').length !== input.expectedPositions.busy
  )
    throw new Error(
      'The selected comparison differs from its explicitly declared complete denominator.',
    );
  const conditionsFile = local(input.study.conditions),
    candidatesFile = local(input.study.candidates);
  const conditions = z
    .object({ conditions: z.array(conditionSchema) })
    .parse(await json(conditionsFile)).conditions;
  const candidates = z
    .object({ selected: z.array(modelSchema) })
    .parse(await json(candidatesFile)).selected;
  const episodeDeclarationsFile = local(input.study.episodes);
  const episodeDeclarations = z
    .array(
      z.object({
        scope: z.string(),
        conditionId: z.string(),
        modelId: z.string(),
        path: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .parse(await json(episodeDeclarationsFile));
  const recordKeys = new Set(
    episodeDeclarations.map((entry) =>
      JSON.stringify([entry.scope, entry.conditionId, entry.modelId]),
    ),
  );
  if (recordKeys.size !== episodeDeclarations.length)
    throw new Error('Historical episode declarations repeat a matrix identity.');
  const characterProfiles = input.study.characterDocument
    ? profiles(await readFile(local(input.study.characterDocument), 'utf8'))
    : undefined;
  const originSets = new Map<
    string,
    {
      library: z.infer<typeof librarySchema>;
      exports: z.infer<typeof exportSchema>;
      directory: string;
    }
  >();
  for (const scope of ['primary', 'busy'] as const) {
    const declaration = input.study[scope];
    originSets.set(scope, {
      library: librarySchema.parse(await json(local(declaration.library))),
      exports: exportSchema.parse(await json(local(declaration.exports))),
      directory: dirname(local(declaration.exports)),
    });
  }
  const modelOrder = candidates.map((c) => c.id);
  const conditionOrder = conditions.map((c) => c.id);
  const ordered = [...historical].sort((a, b) => {
    const scope = (a['scope'] === 'primary' ? 0 : 1) - (b['scope'] === 'primary' ? 0 : 1);
    if (scope) return scope;
    const ai = conditionOrder.indexOf(a['conditionId']!),
      bi = conditionOrder.indexOf(b['conditionId']!);
    if (ai !== bi) return ai - bi;
    return (
      (modelOrder.indexOf(a['modelId']!) - modelOrder.indexOf(b['modelId']!)) *
      ((ai + input.execution.seed) % 2 ? -1 : 1)
    );
  });
  const declaredIds = new Set(
    ordered.map((row) =>
      episodeId(
        `${row['scope']!}:${input.execution.runtimeTarget}`,
        row['conditionId']!,
        row['modelId']!,
        input.execution.replicate,
      ),
    ),
  );
  for (const selection of select)
    if (
      !declaredIds.has(selection) &&
      !ordered.some(
        (row) => `${row['scope']}:${row['conditionId']}:${row['modelId']}` === selection,
      )
    )
      throw new Error(`Selected position is absent: ${selection}`);
  const positions: MatrixPosition[] = [],
    jobs: WorkerJob[] = [],
    bundles: NonNullable<WorkerCampaign['inputs']> = [];
  const originBundles = new Map<string, string>();
  const packaged: Array<{
    id: string;
    sha256: string;
    archiveSha256: string;
    archiveBytes: number;
  }> = [];
  const addBundle = async (id: string, directory: string, paths: string[]) => {
    bundles.push({ id, root: directory, paths });
    if (packageInputs) {
      const packed = await packInputs(directory, paths, join(output, 'archives'));
      packaged.push({
        id,
        sha256: packed.sha256,
        archiveSha256: packed.archiveSha256,
        archiveBytes: packed.archiveBytes,
      });
    }
  };
  for (const [ordinal, row] of ordered.entries()) {
    const scope = row['scope']!,
      conditionId = row['conditionId']!,
      modelId = row['modelId']!;
    const id = episodeId(
      `${scope}:${input.execution.runtimeTarget}`,
      conditionId,
      modelId,
      input.execution.replicate,
    );
    const selected =
      !select.length ||
      select.includes(id) ||
      select.includes(`${scope}:${conditionId}:${modelId}`);
    const position: MatrixPosition = {
      id,
      runtimeTarget: input.execution.runtimeTarget,
      scope,
      conditionId,
      modelId,
      replicate: input.execution.replicate,
      ordinal,
      selected,
      disposition: selected ? 'planned' : 'not-selected',
      sourceRevision: input.sourceRevision,
      model: (() => {
        const model = candidates.find((candidate) => candidate.id === modelId);
        return model
          ? {
              id: model.id,
              model: model.model,
              revision: model.source ?? model.model,
              effort: model.effort,
              maxOutputTokens: model.maxOutputTokens,
            }
          : undefined;
      })(),
      seed: input.execution.seed,
      historical: {
        executionSourceRevision: row['executionSourceRevision']!,
        originalEpisodeSha256: row['originalEpisodeSha256']!,
        rawEpisodeStatus: row['rawEpisodeStatus']!,
        cohort: row['cohort']!,
      },
    };
    positions.push(position);
    if (!selected) continue;
    try {
      const condition = conditions.find((c) => c.id === conditionId),
        model = candidates.find((c) => c.id === modelId),
        set = originSets.get(scope);
      const origin = set?.library.find((o) => o.conditionId === conditionId),
        exported = set?.exports.entries.find(
          (o) => o.conditionId === conditionId && o.savedId === origin?.savedId,
        );
      if (!condition || !model || !set || !origin || !exported)
        throw new Error('Condition/model/current-format origin mapping is unavailable.');
      const declaredRecord = episodeDeclarations.find(
        (entry) =>
          entry.scope === scope && entry.conditionId === conditionId && entry.modelId === modelId,
      );
      if (!declaredRecord || declaredRecord.sha256 !== row['originalEpisodeSha256'])
        throw new Error('Exact historical execution protocol is undeclared.');
      const recordPath = isAbsolute(declaredRecord.path)
        ? declaredRecord.path
        : resolve(dirname(episodeDeclarationsFile), declaredRecord.path);
      const recordBytes = await readFile(recordPath);
      if (hash(recordBytes) !== declaredRecord.sha256)
        throw new Error('Historical episode bytes differ from the immutable matrix.');
      const execution = z
        .object({
          modelId: z.string(),
          conditionId: z.string(),
          identity: z.string(),
          effort: z.string().optional(),
          outputTokens: z.number(),
          embeddingMode: z.enum(['normal', 'disabled']),
          opening: z.unknown(),
          changes: z.array(z.unknown()),
          originalPrelude: z.unknown().optional(),
          recipientFollowup: z.unknown().optional(),
          auxiliaryModels: z.object({ summary: z.string().optional() }).optional(),
          bounds: z.object({
            simulationSeconds: z.number().positive(),
            maximumCalls: z.number().int().positive(),
            activeWallSeconds: z.number().positive(),
          }),
          voiceExamples: z.object({
            profileBefore: z.object({
              name: z.string(),
              description: z.string(),
              personality: z.string(),
              backstory: z.string(),
            }),
            profileInput: z.object({ personality: z.string() }),
          }),
        })
        .parse(JSON.parse(recordBytes.toString('utf8')));
      if (
        execution.modelId !== modelId ||
        execution.conditionId !== conditionId ||
        execution.identity !== model.model ||
        execution.effort !== model.effort ||
        execution.outputTokens !== model.maxOutputTokens ||
        execution.embeddingMode !== input.execution.embeddingMode
      )
        throw new Error(
          'Selected model/settings differ from the frozen historical execution protocol.',
        );
      if (
        !characterProfiles ||
        !condition.personaKey ||
        !characterProfiles.has(condition.personaKey)
      )
        throw new Error('Canonical character/voice preparation must be explicitly declared.');
      const canonical = characterProfiles.get(condition.personaKey)!;
      if (
        JSON.stringify(canonical.expected) !==
          JSON.stringify(execution.voiceExamples.profileBefore) ||
        JSON.stringify(canonical.values) !== JSON.stringify(execution.voiceExamples.profileInput)
      )
        throw new Error(
          'Canonical character/voice source differs from the frozen execution protocol.',
        );
      const originPath = resolve(set.directory, exported.downloadFilename);
      if (dirname(originPath) !== resolve(set.directory))
        throw new Error('Origin file escapes the declared export directory.');
      const setup = scope === 'busy' ? origin.mechanismControl : undefined;
      if (scope === 'busy' && !setup)
        throw new Error('Busy-control origin lacks its zero-inference native setup proof.');
      const simulationSeconds = execution.bounds.simulationSeconds;
      const activeWallSeconds = execution.bounds.activeWallSeconds;
      if (scope === 'primary' && condition.prelude && execution.originalPrelude === undefined)
        throw new Error('Required prelude has no immutable execution protocol.');
      const nativePrelude = scope === 'busy' ? null : prelude(execution.originalPrelude);
      if (nativePrelude) {
        nativePrelude.actionType ??= input.execution.nativeActionTypes['independentWork'];
        nativePrelude.completedEventType ??=
          input.execution.nativeActionTypes['independentWorkOutcome'];
        if (
          !nativePrelude.actionType ||
          (nativePrelude.kind === 'requiredCompletedIndependentWork' &&
            !nativePrelude.completedEventType)
        )
          throw new Error(
            'Prelude requires the selected world’s explicit work and completion-event bindings.',
          );
      }
      const spec = parseEpisodeSpec({
        id,
        runtimeTarget: input.execution.runtimeTarget,
        scope,
        conditionId,
        sourceRevision: input.sourceRevision,
        historical: {
          episodeSha256: declaredRecord.sha256,
          executionSourceRevision: row['executionSourceRevision'],
          cohort: row['cohort'],
        },
        origin: {
          path: '../origin/origin.ndjson',
          sha256: exported.sha256,
          savedId: origin.savedId,
          actorIds: origin.actorIds,
          sourceRevision: origin.sourceRevision,
          seed: input.execution.originSeed,
        },
        model: {
          id: model.id,
          model: model.model,
          revision: model.source ?? model.model,
          effort: model.effort,
          maxOutputTokens: model.maxOutputTokens,
        },
        judgmentModel: input.execution.judgmentModel,
        judgmentRevision: input.execution.judgmentRevision,
        embeddingMode: input.execution.embeddingMode,
        embeddingModel: input.execution.embeddingModel,
        embeddingDimensions: input.execution.embeddingDimensions,
        limits: {
          simulationSeconds,
          maximumCalls: execution.bounds.maximumCalls,
          activeWallSeconds,
          observationWallSeconds: activeWallSeconds,
        },
        protocol: {
          mechanismControl: setup,
          postlude: execution.recipientFollowup ?? undefined,
          profileEdits: [
            {
              actor: 'focal',
              expected: execution.voiceExamples.profileBefore,
              values: execution.voiceExamples.profileInput,
            },
          ],
          prelude: nativePrelude,
          opening: execution.opening,
          changes: execution.changes,
          nativeActionTypes: input.execution.nativeActionTypes,
        },
        randomization: {
          seed: input.execution.seed,
          replicate: input.execution.replicate,
          ordinal,
          block: `${scope}:${conditionId}`,
        },
        outputs: {
          result: 'episode.json',
          exportDirectory: 'runs',
          admissionTraceBytes: input.execution.admissionTraceBytes,
        },
      });
      const specBytes = encoded(spec);
      position.episodeSha256 = hash(specBytes);
      position.originSha256 = exported.sha256;
      let originBundle = originBundles.get(exported.sha256);
      if (!originBundle) {
        if (
          (await stat(originPath)).size !== exported.bytes ||
          (await hashFile(originPath)) !== exported.sha256
        )
          throw new Error('Origin bytes differ from their frozen export declaration.');
        originBundle = `origin-${exported.sha256.slice(0, 32)}`;
        originBundles.set(exported.sha256, originBundle);
        const folder = join(output, 'inputs', originBundle);
        await mkdir(folder, { recursive: true, mode: 0o700 });
        const destination = join(folder, 'origin.ndjson');
        try {
          if ((await hashFile(destination)) !== exported.sha256)
            throw new Error('Frozen origin destination differs.');
        } catch (error) {
          if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
            throw error;
          await copyFile(originPath, destination);
        }
        if ((await hashFile(destination)) !== exported.sha256)
          throw new Error('Origin changed during portable preparation.');
        await addBundle(originBundle, folder, ['origin.ndjson']);
      }
      const episodeBundle = `episode-${id.slice(4)}`,
        folder = join(output, 'inputs', episodeBundle);
      await frozenFile(join(folder, 'episode.json'), specBytes);
      await addBundle(episodeBundle, folder, ['episode.json']);
      const timeoutSeconds = Math.max(
        180,
        Math.ceil(activeWallSeconds + input.preparationSeconds + input.cleanupSeconds),
      );
      const lanes = input.paid?.lanesByModel[modelId];
      const rates = modelPrices?.find((entry) => entry.model === model.model)?.prices;
      if (input.execution.mode === 'execute' && !lanes?.length)
        throw new Error('Execution requires explicit funded lane declarations for this model.');
      if (input.execution.mode === 'execute' && !rates)
        throw new Error(
          'Execution requires explicit public prices for the selected generation model.',
        );
      if (
        input.execution.mode === 'execute' &&
        execution.auxiliaryModels?.summary &&
        !modelPrices!.some((entry) => entry.model === execution.auxiliaryModels!.summary)
      )
        throw new Error(
          'Execution requires explicit public prices for the declared summary model.',
        );
      jobs.push(
        episodeJob(
          spec,
          input.execution.mode,
          timeoutSeconds,
          episodeBundle,
          originBundle,
          input.execution.mode === 'execute'
            ? { limitMicroUsd: input.paid!.limitMicroUsd, lanes: lanes!, modelPrices: modelPrices! }
            : undefined,
        ),
      );
    } catch (error) {
      position.disposition = 'blocked';
      position.reason = error instanceof Error ? error.message : String(error);
    }
  }
  const deadlineSeconds =
    input.deadlineSeconds ??
    Math.max(
      660,
      ...jobs.map((j) => j.timeoutSeconds + 180),
      Math.ceil(jobs.reduce((s, j) => s + j.timeoutSeconds, 0) / input.concurrency) + 480,
    );
  const plan =
    jobs.length >= input.concurrency
      ? workerCampaign({
          taskId: input.taskId,
          cloudAllocationId: input.cloudAllocationId,
          concurrency: input.concurrency,
          deadlineSeconds,
          lifetime: input.lifetime,
          inputs: bundles,
          jobs,
        })
      : undefined;
  const index = {
    declarationSha256: await hashFile(resolve(inputFile)),
    planStatus: plan ? 'ready' : 'blocked',
    ...(plan
      ? {}
      : {
          planReason: `Only ${jobs.length} runnable jobs are available for declared concurrency ${input.concurrency}. Select more independent jobs or explicitly lower concurrency.`,
        }),
    sourceRevision: input.sourceRevision,
    historicalMatrixSha256: hash(matrixBytes),
    concurrency: input.concurrency,
    executionMode: input.execution.mode,
    embeddingMode: input.execution.embeddingMode,
    ...(input.execution.mode === 'execute'
      ? {
          paidConfiguration: {
            ...input.paid,
            modelPrices,
            priceDerivations,
            judgmentInputAdmissionEstimate,
          },
        }
      : {}),
    ordering: 'condition-blocked alternating model order',
    seed: input.execution.seed,
    comparisonCondition:
      'Independent isolated jobs under declared parallel provider load; not assumed equivalent to historical serial execution.',
    positions,
    packaged,
    sourceInputs: await Promise.all(
      [
        input.matrix,
        input.study.conditions,
        input.study.candidates,
        input.study.episodes,
        input.study.primary.library,
        input.study.primary.exports,
        input.study.busy.library,
        input.study.busy.exports,
        ...(input.study.characterDocument ? [input.study.characterDocument] : []),
      ].map(async (file) => ({
        name: file.split('/').at(-1)!,
        sha256: await hashFile(local(file)),
      })),
    ),
  };
  await frozenFile(join(output, 'matrix-index.json'), encoded(index));
  if (plan) await frozenFile(join(output, 'campaign.json'), encoded(plan));
  return { plan, index };
}

/** Plan new current-format episodes without inventing historical-study metadata. */
export async function planDeclaredEpisodes(
  inputFile: string,
  destination: string,
  packageInputs = true,
) {
  const declaration = z
    .object({
      taskId: z.string().min(1),
      cloudAllocationId: z.string().min(1),
      concurrency: z.number().int().positive(),
      mode: z.enum(['prepare', 'execute']).default('prepare'),
      episodes: z.array(z.string().min(1)).min(1),
      paid: z
        .object({
          limitMicroUsd: z.number().int().positive(),
          lanesByModel: z.record(z.string(), z.array(z.string()).min(1)),
          modelPrices: z.array(modelPriceSchema).min(1),
        })
        .strict()
        .optional(),
      preparationSeconds: z.number().int().nonnegative().default(180),
      cleanupSeconds: z.number().int().positive().default(120),
    })
    .strict()
    .parse(await json(inputFile));
  const output = resolve(destination),
    root = dirname(resolve(inputFile));
  const jobs: WorkerJob[] = [],
    positions: MatrixPosition[] = [];
  const bundles: NonNullable<WorkerCampaign['inputs']> = [];
  const identities = new Set<string>(),
    origins = new Set<string>(),
    sources = new Set<string>();
  const bundle = async (id: string, folder: string, paths: string[]) => {
    bundles.push({ id, root: folder, paths });
    if (packageInputs) await packInputs(folder, paths, join(output, 'archives'));
  };
  for (const filename of declaration.episodes) {
    const file = resolve(root, filename),
      original = parseEpisodeSpec(await json(file));
    if (!sources.has(original.sourceRevision)) {
      await assertEpisodeSource(original.sourceRevision);
      sources.add(original.sourceRevision);
    }
    if (identities.has(original.id)) throw new Error('Declared episodes repeat an identity.');
    identities.add(original.id);
    const origin = resolve(dirname(file), original.origin.path);
    if ((await hashFile(origin)) !== original.origin.sha256)
      throw new Error('Declared origin checksum differs.');
    const spec = { ...original, origin: { ...original.origin, path: '../origin/origin.ndjson' } };
    const originBundle = `origin-${spec.origin.sha256.slice(0, 32)}`;
    if (!origins.has(originBundle)) {
      origins.add(originBundle);
      const folder = join(output, 'inputs', originBundle);
      await mkdir(folder, { recursive: true, mode: 0o700 });
      const target = join(folder, 'origin.ndjson');
      try {
        if ((await hashFile(target)) !== spec.origin.sha256)
          throw new Error('Frozen origin differs.');
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
          throw error;
        await copyFile(origin, target);
      }
      if ((await hashFile(target)) !== spec.origin.sha256)
        throw new Error('Origin changed during packaging.');
      await bundle(originBundle, folder, ['origin.ndjson']);
    }
    const episodeBundle = `episode-${hash(spec.id).slice(0, 32)}`,
      folder = join(output, 'inputs', episodeBundle);
    const bytes = encoded(spec);
    await frozenFile(join(folder, 'episode.json'), bytes);
    await bundle(episodeBundle, folder, ['episode.json']);
    const timeoutSeconds = Math.ceil(
      spec.limits.activeWallSeconds + declaration.preparationSeconds + declaration.cleanupSeconds,
    );
    const funding =
      declaration.mode === 'execute' && declaration.paid
        ? {
            limitMicroUsd: declaration.paid.limitMicroUsd,
            lanes: declaration.paid.lanesByModel[spec.model.id] ?? [],
            modelPrices: declaration.paid.modelPrices,
          }
        : undefined;
    jobs.push(
      episodeJob(spec, declaration.mode, timeoutSeconds, episodeBundle, originBundle, funding),
    );
    positions.push({
      id: spec.id,
      runtimeTarget: spec.runtimeTarget,
      scope: spec.scope,
      conditionId: spec.conditionId,
      modelId: spec.model.id,
      model: spec.model,
      replicate: spec.randomization.replicate,
      ordinal: spec.randomization.ordinal,
      selected: true,
      disposition: 'planned',
      sourceRevision: spec.sourceRevision,
      episodeSha256: hash(bytes),
      originSha256: spec.origin.sha256,
      seed: spec.randomization.seed,
    });
  }
  const plan = workerCampaign({
    taskId: declaration.taskId,
    cloudAllocationId: declaration.cloudAllocationId,
    concurrency: declaration.concurrency,
    deadlineSeconds: Math.max(
      660,
      Math.ceil(jobs.reduce((sum, job) => sum + job.timeoutSeconds, 0) / declaration.concurrency) +
        480,
      ...jobs.map((job) => job.timeoutSeconds + 180),
    ),
    lifetime: 'attached',
    inputs: bundles,
    jobs,
  });
  const index = {
    declarationSha256: await hashFile(inputFile),
    planStatus: 'ready' as const,
    planReason: undefined as string | undefined,
    executionMode: declaration.mode,
    concurrency: declaration.concurrency,
    positions,
  };
  await frozenFile(join(output, 'campaign.json'), encoded(plan));
  await frozenFile(join(output, 'matrix-index.json'), encoded(index));
  return { plan, index };
}

type SharedClosure = {
  status: 'not-applicable' | 'unknown' | 'pending' | 'settled';
  reason?: string;
  budget?: AttemptBudgetSnapshot;
  settledSpentUsd?: number;
  exposureUsd?: number;
  source?: { artifact: string; sha256: string; runId: string };
};

/** Finalization closes the shared grant after episode capture. Its verified
 * budget includes later work and overlaps captured receipts; never add them. */
async function readSharedClosure(
  directory: string,
  jobId: string,
  runId: string,
  sha256: string | undefined,
): Promise<SharedClosure> {
  try {
    if (!sha256) throw new Error('No verified shared grant closure was collected.');
    const bytes = await readFile(join(directory, 'completion.json'));
    if (hash(bytes) !== sha256) throw new Error('Shared closure artifact checksum changed.');
    const value = z
      .object({
        runId: z.string(),
        paidClosure: z.object({
          jobId: z.string(),
          budget: z.object({
            spentUsd: z.number().finite().nonnegative(),
            reservedUsd: z.number().finite().nonnegative(),
            uncertainUsd: z.number().finite().nonnegative(),
          }),
        }),
      })
      .parse(JSON.parse(bytes.toString('utf8')));
    if (value.runId !== runId || value.paidClosure.jobId !== jobId)
      throw new Error('Shared grant closure belongs to another job/run.');
    const budget = value.paidClosure.budget,
      spent = attemptMicroUsd(budget.spentUsd),
      reserved = attemptMicroUsd(budget.reservedUsd),
      uncertain = attemptMicroUsd(budget.uncertainUsd);
    if (uncertain > spent)
      throw new Error('Shared uncertain obligations exceed included spending.');
    return {
      status: reserved || uncertain ? 'pending' : 'settled',
      budget,
      settledSpentUsd: (spent - uncertain) / 1_000_000,
      // AttemptBudgetSnapshot.uncertainUsd is already included in spentUsd.
      exposureUsd: (spent + reserved) / 1_000_000,
      source: { artifact: 'completion.json', sha256, runId },
    };
  } catch (cause) {
    return { status: 'unknown', reason: cause instanceof Error ? cause.message : String(cause) };
  }
}

/** Consume the managed collector's checksum-verified files. Missing/failed work
 * remains a denominator row and never causes another execution. */
export async function aggregateCampaign(
  indexFile: string,
  collectedDirectory: string,
  destination: string,
) {
  const index = z
    .object({
      positions: z.array(
        z
          .object({
            id: z.string(),
            runtimeTarget: z.enum(['lab', 'game']),
            scope: z.string(),
            conditionId: z.string(),
            modelId: z.string(),
            replicate: z.number(),
            ordinal: z.number(),
            selected: z.boolean(),
            disposition: z.enum(['planned', 'not-selected', 'blocked']),
            reason: z.string().optional(),
            sourceRevision: z.string(),
            episodeSha256: z.string().optional(),
            originSha256: z.string().optional(),
            seed: z.number(),
            model: z
              .object({
                model: z.string(),
                revision: z.string(),
                effort: z.string().optional(),
                maxOutputTokens: z.number(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      ),
      executionMode: z.enum(['prepare', 'execute']),
    })
    .passthrough()
    .parse(await json(indexFile));
  const collection = z
    .object({
      campaignId: z.string(),
      pageError: z.string().optional(),
      jobs: z.array(
        z
          .object({
            jobId: z.string(),
            runId: z.string(),
            outcome: z.string(),
            source: z.array(z.string()),
            collection: z.unknown().optional(),
            collectionError: z.string().optional(),
          })
          .passthrough(),
      ),
    })
    .parse(await json(join(collectedDirectory, 'index.json')));
  const jobs = new Map(collection.jobs.map((job) => [job.jobId, job]));
  if (jobs.size !== collection.jobs.length)
    throw new Error('Managed collection repeats a job identity.');
  // Validate only the fields needed to join and summarize a result. Keep the
  // complete original result alongside them for later behavioral grading.
  const resultSummary = z.object({
    id: z.string(),
    sourceRevision: z.string(),
    runtimeTarget: z.enum(['lab', 'game']),
    originSha256: z.string(),
    specSha256: z.string(),
    status: z.string(),
    reason: z.string().optional(),
    randomization: z.object({ seed: z.number(), replicate: z.number(), ordinal: z.number() }),
    timings: z.object({
      preparationMs: z.number(),
      workMs: z.number(),
      collectionMs: z.number(),
      cleanupMs: z.number(),
    }),
    cost: z.object({
      labReportedKnownUsd: z.number(),
      providerReportedUsd: z.number(),
      estimatedUsd: z.number(),
      missingReceipts: z.number(),
      uncertainAttempts: z.number(),
      unknownCostAttempts: z.number(),
      authority: z.literal('shared-execution'),
    }),
  });
  const positions = [];
  for (const position of index.positions) {
    const job = jobs.get(position.id);
    let result: unknown;
    let summary: z.infer<typeof resultSummary> | undefined;
    let sharedClosure: SharedClosure = {
      status: index.executionMode === 'execute' && position.selected ? 'unknown' : 'not-applicable',
    };
    let error: string | undefined;
    if (job?.collection && !job.collectionError) {
      try {
        if (!job.source.includes(position.sourceRevision))
          throw new Error('Collected job source differs from the frozen matrix.');
        const root = join(collectedDirectory, position.id);
        const manifest = z
          .object({
            runId: z.string(),
            files: z.array(z.object({ path: z.string(), sha256: z.string() })),
          })
          .parse(await json(join(root, 'manifest.json')));
        if (manifest.runId !== job.runId)
          throw new Error('Artifact manifest belongs to another worker run.');
        if (sharedClosure.status === 'unknown')
          sharedClosure = await readSharedClosure(
            root,
            position.id,
            job.runId,
            manifest.files.find((f) => f.path === 'completion.json')?.sha256,
          );
        const resultPath = 'cases/episode/results/episode/episode.json';
        const entry = manifest.files.find((f) => f.path === resultPath);
        if (!entry) throw new Error('No episode result in verified worker artifacts.');
        const file = join(root, resultPath);
        if ((await hashFile(file)) !== entry.sha256)
          throw new Error('Collected episode checksum changed.');
        result = await json(file);
        summary = resultSummary.parse(result);
        if (
          summary.id !== position.id ||
          summary.runtimeTarget !== position.runtimeTarget ||
          summary.sourceRevision !== position.sourceRevision ||
          summary.originSha256 !== position.originSha256 ||
          summary.specSha256 !== position.episodeSha256 ||
          summary.randomization.seed !== position.seed ||
          summary.randomization.replicate !== position.replicate ||
          summary.randomization.ordinal !== position.ordinal
        )
          throw new Error('Episode identity or frozen input provenance differs from the matrix.');
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
        summary = undefined;
      }
    }
    positions.push({
      ...position,
      campaignId: collection.campaignId,
      job: job ?? null,
      result: result ?? null,
      summary: summary ?? null,
      sharedClosure,
      collectionError:
        error ??
        job?.collectionError ??
        (job && !result ? collection.pageError : undefined) ??
        null,
    });
  }
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const prior = await json(join(destination, 'matrix.json')).catch((error) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return undefined;
    throw error;
  });
  if (
    prior &&
    typeof prior === 'object' &&
    'campaignId' in prior &&
    prior.campaignId !== collection.campaignId
  )
    throw new Error('Aggregate output belongs to another campaign.');
  const publish = async (file: string, body: string) => {
    const pending = file + `.${process.pid}.pending`;
    await writeFile(pending, body, { mode: 0o600 });
    await rename(pending, file);
  };
  const expectedClosures = positions.filter((p) => p.sharedClosure.status !== 'not-applicable');
  const observedClosures = expectedClosures.filter((p) => p.sharedClosure.budget);
  const sumBudget = (field: keyof AttemptBudgetSnapshot) =>
    observedClosures.reduce(
      (total, p) => total + attemptMicroUsd(p.sharedClosure.budget![field]),
      0,
    ) / 1_000_000;
  const knownBudgetSum = {
    spentUsd: sumBudget('spentUsd'),
    reservedUsd: sumBudget('reservedUsd'),
    uncertainUsd: sumBudget('uncertainUsd'),
  };
  const unknownClosures = expectedClosures.length - observedClosures.length;
  const pendingClosures = expectedClosures.filter(
    (p) => p.sharedClosure.status === 'pending',
  ).length;
  const captured = positions.flatMap((p) => (p.summary ? [p.summary.cost] : []));
  const costs = {
    // Episode capture and grant closure are overlapping snapshots. The latter
    // owns complete shared spending; neither is an additional charge.
    captured: {
      episodes: captured.length,
      labReportedKnownUsd: captured.reduce((s, c) => s + c.labReportedKnownUsd, 0),
      providerReportedUsd: captured.reduce((s, c) => s + c.providerReportedUsd, 0),
      estimatedUsd: captured.reduce((s, c) => s + c.estimatedUsd, 0),
      missingReceipts: captured.reduce((s, c) => s + c.missingReceipts, 0),
    },
    sharedClosure: {
      authority: 'shared-execution',
      expectedJobs: expectedClosures.length,
      observedJobs: observedClosures.length,
      unknownJobs: unknownClosures,
      pendingJobs: pendingClosures,
      knownBudgetSum,
      totalBudget: expectedClosures.length && !unknownClosures ? knownBudgetSum : null,
      finalSpentUsd:
        expectedClosures.length && !unknownClosures && !pendingClosures
          ? knownBudgetSum.spentUsd
          : null,
      uncertaintyIncludedInSpent: true,
    },
  };
  await publish(
    join(destination, 'matrix.json'),
    encoded({
      ...index,
      campaignId: collection.campaignId,
      collectionPageError: collection.pageError ?? null,
      costs,
      positions,
    }),
  );
  const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  await publish(
    join(destination, 'matrix.csv'),
    [
      'id,runtimeTarget,scope,conditionId,modelId,model,modelRevision,effort,maxOutputTokens,replicate,ordinal,seed,selected,disposition,reason,sourceRevision,episodeSha256,originSha256,workerRun,outcome,episodeStatus,episodeReason,preparationMs,workMs,collectionMs,cleanupMs,labReportedKnownUsd,providerReportedUsd,estimatedUsd,missingReceipts,uncertainAttempts,unknownCostAttempts,sharedClosureStatus,sharedSpentUsd,sharedReservedUsd,sharedUncertainUsd,sharedSettledSpentUsd,sharedExposureUsd,sharedClosureError,collectionError',
      ...positions.map((p) =>
        [
          p.id,
          p.runtimeTarget,
          p.scope,
          p.conditionId,
          p.modelId,
          p.model?.model,
          p.model?.revision,
          p.model?.effort,
          p.model?.maxOutputTokens,
          p.replicate,
          p.ordinal,
          p.seed,
          p.selected,
          p.disposition,
          p.reason,
          p.sourceRevision,
          p.episodeSha256,
          p.originSha256,
          p.job?.runId,
          p.job?.outcome ?? (p.disposition === 'planned' ? 'unobserved' : p.disposition),
          p.summary?.status,
          p.summary?.reason,
          p.summary?.timings.preparationMs,
          p.summary?.timings.workMs,
          p.summary?.timings.collectionMs,
          p.summary?.timings.cleanupMs,
          p.summary?.cost.labReportedKnownUsd,
          p.summary?.cost.providerReportedUsd,
          p.summary?.cost.estimatedUsd,
          p.summary?.cost.missingReceipts,
          p.summary?.cost.uncertainAttempts,
          p.summary?.cost.unknownCostAttempts,
          p.sharedClosure.status,
          p.sharedClosure.budget?.spentUsd,
          p.sharedClosure.budget?.reservedUsd,
          p.sharedClosure.budget?.uncertainUsd,
          p.sharedClosure.settledSpentUsd,
          p.sharedClosure.exposureUsd,
          p.sharedClosure.reason,
          p.collectionError,
        ]
          .map(csv)
          .join(','),
      ),
    ].join('\n') + '\n',
  );
  await publish(
    join(destination, 'cost-summary.csv'),
    [
      'capturedEpisodes,capturedLabReportedKnownUsd,capturedProviderReportedUsd,capturedEstimatedUsd,capturedMissingReceipts,sharedExpectedJobs,sharedObservedJobs,sharedUnknownJobs,sharedPendingJobs,sharedKnownSpentUsd,sharedKnownReservedUsd,sharedKnownUncertainUsd,sharedTotalSpentUsd,sharedTotalReservedUsd,sharedTotalUncertainUsd,sharedFinalSpentUsd',
      [
        costs.captured.episodes,
        costs.captured.labReportedKnownUsd,
        costs.captured.providerReportedUsd,
        costs.captured.estimatedUsd,
        costs.captured.missingReceipts,
        costs.sharedClosure.expectedJobs,
        costs.sharedClosure.observedJobs,
        costs.sharedClosure.unknownJobs,
        costs.sharedClosure.pendingJobs,
        knownBudgetSum.spentUsd,
        knownBudgetSum.reservedUsd,
        knownBudgetSum.uncertainUsd,
        costs.sharedClosure.totalBudget?.spentUsd,
        costs.sharedClosure.totalBudget?.reservedUsd,
        costs.sharedClosure.totalBudget?.uncertainUsd,
        costs.sharedClosure.finalSpentUsd,
      ]
        .map(csv)
        .join(','),
    ].join('\n') + '\n',
  );
  return positions;
}

async function main() {
  const args = process.argv.slice(2),
    action = args[0] === 'aggregate' ? 'aggregate' : args[0] === 'episodes' ? 'episodes' : 'plan';
  if (args[0] === action) args.shift();
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key?.startsWith('--') || !value || options.has(key))
      throw new Error('Use unique --option value pairs.');
    options.set(key, value);
  }
  const allowed =
    action === 'aggregate'
      ? ['--index', '--collected', '--output']
      : ['--input', '--output', '--select', '--package'];
  for (const key of options.keys())
    if (!allowed.includes(key)) throw new Error(`Unexpected option ${key}`);
  const output = options.get('--output');
  if (!output) throw new Error('Declare --output DIRECTORY.');
  if (action === 'aggregate') {
    const index = options.get('--index'),
      collected = options.get('--collected');
    if (!index || !collected)
      throw new Error(
        'Use aggregate --index MATRIX_INDEX --collected MANAGED_RESULTS --output DIRECTORY.',
      );
    const rows = await aggregateCampaign(index, collected, output);
    console.log(JSON.stringify({ mode: 'aggregate-only', positions: rows.length, output }));
    return;
  }
  const input = options.get('--input');
  if (!input)
    throw new Error(
      'Use --input DECLARATION.json --output DIRECTORY [--select scope:condition:model,...] [--package true|false].',
    );
  const packageValue = options.get('--package') ?? 'true';
  if (!['true', 'false'].includes(packageValue))
    throw new Error('--package must be true or false.');
  const result =
    action === 'episodes'
      ? await planDeclaredEpisodes(input, output, packageValue === 'true')
      : await planCampaign(
          input,
          output,
          options.get('--select')?.split(',') ?? [],
          packageValue === 'true',
        );
  console.log(
    JSON.stringify(
      {
        mode: 'plan-only',
        positions: result.index.positions.length,
        selected: result.index.positions.filter((p) => p.selected).length,
        jobs: result.plan?.jobs.length ?? 0,
        planStatus: result.index.planStatus,
        ...(result.index.planReason ? { reason: result.index.planReason } : {}),
        blocked: result.index.positions.filter((p) => p.disposition === 'blocked').length,
        concurrency: result.index.concurrency,
        output,
      },
      null,
      2,
    ),
  );
  if (!result.plan) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
