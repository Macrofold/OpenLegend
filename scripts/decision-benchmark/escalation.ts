import {
  recordDecisionTiming,
  type DecisionPublication,
} from '../../apps/server/src/decision-publication.js';
import { undispatchedReceipt } from '../../apps/server/src/decision-state.js';
import { mkdir, open, writeFile } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  createAiClient,
  usdToMicroUsd,
  type AiClient,
  type AiResult,
  type JudgeValue,
  type GenerateRequest,
} from '../../packages/ai/src/index.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import { NPC_ID, entityGet } from '../../packages/domain/src/index.js';
import { createDisposableDatabase } from '../disposable-postgres.mjs';
import { readConfig } from '../../apps/server/src/config.js';
import { SqlGameRepository, digest, type JobRecord } from '../../apps/server/src/store.js';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import { WorldService } from '../../apps/server/src/world-service.js';
import { IntelligenceLog } from '../../apps/server/src/intelligence-log.js';
import { CognitionExecution } from '../../apps/server/src/cognition-execution.js';
import { DecisionEscalator } from '../../apps/server/src/decision-escalator.js';
import {
  decisionRoot,
  DECISION_MODEL,
  DECISION_EFFORT,
  DECISION_REASONS,
} from '../../apps/server/src/decision-state.js';
import {
  decisionOrigin,
  decisionPolicyDigest,
  level1EscalationReason,
  decisionFailureReason,
} from '../../apps/server/src/decision-task.js';
import {
  levelLimits,
  decisionAllowance,
  sumRequestCosts,
} from '../../apps/server/src/cognition-budget.js';
import { prepareQuestionRead } from '../../apps/server/src/decision-question-reader.js';
import { resolveLevel1 } from '../../apps/server/src/level1-selection.js';
import {
  batchedAttentionQuestions,
  ACTION_EVIDENCE_POLICY,
} from '../../apps/server/src/jev-questions.js';
import { MacrofoldBackend } from '../../apps/server/src/macrofold.js';
import { escalationEpisodes, escalationSeed } from './escalation-episodes.js';
import {
  escalationReport,
  escalationMarkdown,
  type EscalationObservation,
} from './escalation-report.js';

const flags = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, '').split('=');
    return [key!, value.join('=') || 'true'];
  }),
);
const live = flags.has('live'),
  probe = flags.has('route-probe');
const out = resolve(flags.get('out') ?? '');
const inside = relative(process.cwd(), out);
if (!flags.has('out') || !isAbsolute(flags.get('out')!) || !inside.startsWith('..'))
  throw new Error('Use --out=/absolute/private/path outside the repository.');
const cap = Number(flags.get('cap-usd') ?? 10);
if (!usdToMicroUsd(cap) || cap > 10)
  throw new Error('This implementation qualifier requires a positive cap no greater than $10.');
const prior = Number(flags.get('prior-commitment-usd') ?? 0);
if (
  !Number.isFinite(prior) ||
  prior < 0 ||
  prior >= cap ||
  (live && !flags.has('prior-commitment-usd'))
)
  throw new Error(
    'Live qualification requires --prior-commitment-usd with every earlier task charge and uncertain commitment; it must be below the same task cap.',
  );
const max = Number(flags.get('max') ?? (probe ? 1 : 48));
if (!Number.isInteger(max) || max < 1 || max > 48) throw new Error('--max must be 1–48.');
if (probe && !live) throw new Error('--route-probe is a separately accounted live route check.');
await mkdir(out, { recursive: true, mode: 0o700 });
const lock = await open(join(out, 'run.lock'), 'wx', 0o600);
// Fresh runs only. A second invocation never guesses whether a prior paid request was sent.
// Reconciliation uses this database and its actual receipts, not replaying the qualifier.
const runId = randomUUID();
const episodes = escalationEpisodes();
for (const episode of episodes) {
  if (
    !episode.allowed.length ||
    episode.allowed.some((id) => !Object.hasOwn(episode.choices, id)) ||
    !Object.entries(episode.reference.points).some(
      ([id, points]) => points === 100 && episode.allowed.includes(id),
    )
  )
    throw new Error('Authored episode has no permitted accepted alternative.');
}
const permittedChoices = (episode: (typeof episodes)[number]) =>
  Object.fromEntries(
    Object.entries(episode.choices).filter(([id]) => episode.allowed.includes(id)),
  );
const selected = probe ? [episodes.find((episode) => !episode.immediateOnly)!] : episodes;
const observed: EscalationObservation[] = [],
  rootIds: string[] = [];
const journal = await open(join(out, 'attempts.jsonl'), 'wx', 0o600);
let tail = Promise.resolve();
const append = (value: unknown) =>
  (tail = tail.then(async () => {
    await journal.write(JSON.stringify(value) + '\n');
    await journal.sync();
  }));
const json = async (name: string, value: unknown) =>
  writeFile(join(out, name), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
await json('frozen-episodes.json', { seed: escalationSeed, episodes: selected });
await json('manifest.json', {
  runId,
  live,
  probe,
  cap,
  priorCommitmentUsd: prior,
  max,
  corpusDigest: digest(selected),
  gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(),
  sourcePatchFile: 'source.patch',
  trigger:
    'Existing action suitability resolver, native admitted-choice set, and actual DecisionEscalator. References are grading-only.',
  scope:
    'Fresh authored hypothetical choice episodes; live character/feeling review remains separate.',
});
await writeFile(
  join(out, 'source.patch'),
  execFileSync('git', [
    'diff',
    '--no-ext-diff',
    '--no-textconv',
    '--binary',
    'HEAD',
    '--',
    'apps',
    'packages',
    'scripts',
  ]),
  { mode: 0o600 },
);
const database = await createDisposableDatabase(
  flags.get('database-admin') ?? process.env['OPENLEGEND_TEST_DATABASE_URL'],
);
await json('database.json', {
  url: database.url,
  ...database.details,
  retainedUntilAccountingExport: true,
});
const fixturePrices = [
  { model: DECISION_MODEL, prices: { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.5 } },
];
const env = live
  ? process.env
  : {
      OPENAI_API_KEY: 'fixture',
      TYPESAFE_API_KEY: 'fixture',
      OPENAI_MODEL_PRICES_JSON: JSON.stringify(fixturePrices),
    };
const providerEnv = Object.fromEntries(
  Object.entries(env).filter(([name]) => /^(OPENAI_|MACROFOLD_|TYPESAFE_|LLM_|JEV_)/.test(name)),
);
const config = readConfig({
  ...providerEnv,
  OPEN_LEGEND_DATABASE_URL: database.url,
  OPENAI_EMBEDDING_API_KEY: '',
  OPEN_LEGEND_AUTH_MODE: 'local',
  OPEN_LEGEND_HOST: '127.0.0.1',
  AI_BUDGET_USD: String(Math.min(cap - prior, Number(env['AI_BUDGET_USD'] ?? cap - prior))),
  DECISION_ESCALATION_JSON: JSON.stringify({
    mode: 'apply',
    reasons: [...DECISION_REASONS],
    origins: [
      env['MACROFOLD_API_KEY']
        ? `macrofold/${env['MACROFOLD_JEV_MODEL'] ?? 'typesafe/jev-1.13'}`
        : `jev/${env['TYPESAFE_MODEL'] ?? 'jev-1.13.0'}`,
    ],
  }),
});
// Use the actual resolved origin; unrelated operator defaults cannot silently exclude the run.
config.decisionEscalation.origins = [decisionOrigin(config)];
await json('execution-policy.json', {
  policy: config.decisionEscalation,
  model: DECISION_MODEL,
  effort: DECISION_EFFORT,
  prices: config.llmModelPrices,
  taskCapUsd: cap,
  priorCommitmentUsd: prior,
  availableUsd: config.budgetUsd,
  capturedAt: new Date().toISOString(),
});
const store = new SqlGameRepository(join(out, 'data'), new PostgresDatabase(database.url));
const service = new WorldService(store, config),
  log = new IntelligenceLog(store);
const execution = new CognitionExecution(store);
let activeEpisode = selected[0]!,
  activeIndex = 0;
let stop: string | undefined, rootTimer: ReturnType<typeof setTimeout> | undefined;
let presenceTimer: ReturnType<typeof setInterval> | undefined;
const fixtureReceipt = (id: string, provider: 'jev' | 'openai') => ({
  ...undispatchedReceipt(id, provider, Date.now()),
  dispatched: true,
  model: provider === 'openai' ? DECISION_MODEL : 'fixture',
  requestedModel: provider === 'openai' ? DECISION_MODEL : 'fixture',
  estimatedCostUsd: 0,
});
const fixture: AiClient = {
  async judge(request): Promise<AiResult<JudgeValue>> {
    const accepted = Object.entries(activeEpisode.reference.points)
      .filter(([, points]) => points === 100)
      .map(([id]) => id);
    const wrong =
      Object.keys(permittedChoices(activeEpisode)).find((id) => !accepted.includes(id)) ??
      accepted[0]!;
    const picked = activeIndex % 4 === 0 ? accepted[0]! : wrong;
    return {
      outcome: 'value',
      receipt: fixtureReceipt(request.requestId, 'jev'),
      value: {
        answers:
          activeIndex % 4 === 3
            ? {}
            : Object.fromEntries(
                Object.keys(permittedChoices(activeEpisode)).map((id) => [
                  id,
                  {
                    type: 'noul',
                    noul: id === picked ? (activeIndex % 4 === 2 || probe ? 0.6 : 0.95) : 0.05,
                  },
                ]),
              ),
      },
    };
  },
  async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
    const choice = Object.keys(activeEpisode.reference.points).find(
      (id) => activeEpisode.reference.points[id] === 100,
    )!;
    return {
      outcome: 'value',
      receipt: fixtureReceipt(request.requestId, 'openai'),
      value: { answers: { q0: { status: 'answered', value: { choice }, reason: null } } } as T,
    };
  },
};
const escalator = new DecisionEscalator(
  service,
  execution,
  log,
  async (job) => {
    const choices = permittedChoices(activeEpisode);
    return prepareQuestionRead(service, {
      questions: {
        q0: {
          kind: 'choice',
          question:
            'Choose the personally suitable supplied alternative, using the complete permitted evidence. Abstain when none fits.',
          choices,
        },
      },
      inputs: {
        situation: {
          value: activeEpisode.context,
          owner: 'frozen authored episode reader',
          revision: digest(activeEpisode.context),
        },
      },
      sourceTime: service.world.simTime,
      currentRevisions: async () => ({ situation: digest(activeEpisode.context) }),
    });
  },
  live ? undefined : fixture,
);
try {
  await initializeCollisionRuntime();
  await service.ready;
  // Macrofold binds provisioned work to the loaded world, just as in the server composition.
  const primaryClient =
    !live || probe
      ? fixture
      : config.macrofoldKey
        ? new MacrofoldBackend(service, log)
        : createAiClient({
            jev: { apiKey: config.jevKey, model: config.jevModel, prices: config.jevPrices },
            timeoutMs: 31_000,
          });
  const scope = service.localScope;
  await service.changeEmbodiment(scope, {
    id: `qualification-${runId}`,
    expectedGeneration: scope.controlGeneration,
    operation: 'replace',
  });
  await service.setConnection('qualification', true);
  await service.setPresence('qualification', true);
  await service.control({ paused: false });
  // The isolated qualifier stands in for a connected browser, including its presence heartbeat.
  presenceTimer = setInterval(() => {
    void service.setPresence('qualification', true).catch(() => {
      stop = 'Fixture presence could not be renewed.';
    });
  }, 4000);
  presenceTimer.unref();
  for (const [index, episode] of selected.slice(0, max).entries()) {
    activeEpisode = episode;
    const choices = permittedChoices(episode);
    activeIndex = probe ? 2 : index;
    if (
      execution.snapshot().primary === 'unknown' ||
      execution.snapshot().background === 'unknown'
    ) {
      stop = 'Uncertain remote completion; no replacement was launched.';
      break;
    }
    const id = `qualification-${runId}-${index}`,
      started = Date.now();
    rootIds.push(id);
    const job: JobRecord = {
      id,
      kind: 'thought',
      fingerprint: id,
      status: 'judging',
      createdAt: started,
      request: { npcId: NPC_ID, text: 'Choose from a frozen actor-permitted authored situation.' },
      message: 'Qualification decision admitted.',
      decision: decisionRoot({
        jobId: id,
        worldId: service.world.id,
        timelineId: service.timelineId,
        generation: service.generation,
        actorId: NPC_ID,
        physicalLife: entityGet(service.world.entities, NPC_ID)!.actor!.physicalLife ?? 0,
        cause: { kind: 'intent', id },
        originalWatermark: 0,
        urgency: 0,
        acceptedAt: started,
        usefulness: episode.immediateOnly ? 'immediate-only' : 'useful-later',
        groups: { q0: 'choice' },
        origin: decisionOrigin(config),
        policyDigest: decisionPolicyDigest(config),
        limits: levelLimits(config),
      }),
    };
    await store.putJob(job);
    await append({ event: 'root', id, episodeId: episode.id, decision: job.decision });
    rootTimer = setTimeout(() => {
      void store
        .mutateDecision(id, async (current) =>
          current.decision?.phase === 'immediate'
            ? {
                ...current,
                decision: {
                  ...current.decision,
                  phase: 'waiting-primary',
                  immediate: { kind: 'deferred', at: Date.now() },
                },
              }
            : undefined,
        )
        .then(async (saved) => {
          if (saved) await recordDecisionTiming(log, saved, 'immediate', Date.now());
        })
        .catch(() => {
          stop = 'The immediate disposition could not be saved.';
        });
    }, 1000);
    const attemptId = `${id}:primary`,
      allowance = probe ? 0.000001 : decisionAllowance(config, 'jev');
    const lease = await execution.primary();
    if (
      !lease ||
      !(await store.reserve(
        attemptId,
        'jev',
        allowance,
        config.budgetUsd,
        NPC_ID,
        undefined,
        undefined,
        {
          rootJobId: id,
          category: 'level',
          level: 1,
          stage: 'qualification-primary',
          executionClass: 'primary',
        },
      ))
    ) {
      lease?.release();
      await escalator.end(id, 'budget-exhausted');
      stop = 'Task spending or execution allowance exhausted.';
      clearTimeout(rootTimer);
      break;
    }
    await store.markDecisionDispatch(attemptId);
    let result: AiResult<JudgeValue>;
    try {
      result = await primaryClient.judge({
        requestId: attemptId,
        state: {
          permittedContext: episode.context,
          candidates: choices,
          attentionPolicy: ACTION_EVIDENCE_POLICY,
        },
        questions: batchedAttentionQuestions(
          Object.keys(choices),
          'choose-action',
          service.world.cognitionPolicy.actionGuidance,
        ),
        // The one-second gameplay deadline must not cancel paid execution or hide a late answer.
        // Publication still checks the root's usefulness deadline independently.
        signal: AbortSignal.timeout(31_000),
      });
      await store.settle(attemptId, result.receipt);
      if (result.receipt.completionUncertain) lease.uncertain(attemptId);
    } catch (error) {
      lease.uncertain(attemptId);
      throw error;
    } finally {
      lease.release();
    }
    const answers = result.outcome === 'value' ? result.value.answers : {};
    const resolution = resolveLevel1({
      offered: Object.keys(choices).map((handle) => ({ handle })),
      answers,
      isContinue: () => false,
      escalation: { available: true, level: 4 },
    });
    const ratings = Object.entries(answers).flatMap(([handle, answer]) =>
      answer.type === 'noul' && Number.isFinite(answer.noul) && Object.hasOwn(choices, handle)
        ? [{ handle, value: answer.noul }]
        : [],
    );
    const proposed = ratings.length
      ? ratings.reduce((a, b) => (b.value > a.value ? b : a)).handle
      : undefined;
    const chosen = resolution.outcome.kind === 'act' ? resolution.outcome.handle : undefined;
    const reason =
      result.outcome !== 'value'
        ? decisionFailureReason(result.outcome, result.reason, result.receipt)
        : chosen && !episode.allowed.includes(chosen)
          ? 'native-rejection'
          : level1EscalationReason(resolution.outcome);
    let admitted = false,
      delivered = false;
    if (result.receipt.completionUncertain) {
      await escalator.end(id, 'uncertain');
      stop = 'Primary execution completion is uncertain.';
    } else if (chosen && episode.allowed.includes(chosen)) {
      const prepared = prepareQuestionRead(service, {
        questions: { q0: { kind: 'choice', question: 'Frozen choice.', choices } },
        inputs: {
          situation: { value: episode.context, owner: 'frozen episode reader', revision: 'frozen' },
        },
        sourceTime: service.world.simTime,
        currentRevisions: async () => ({ situation: 'frozen' }),
      });
      const current = (await store.getJob(id))!;
      const publication: DecisionPublication = {
        rootJobId: id,
        attemptId: id,
        expectedRevision: current.decision!.revision,
        receiptId: attemptId,
        groups: {},
        final: true,
        now: Date.now,
      };
      delivered = (
        await prepared.publish(
          { q0: { status: 'answered', value: { choice: chosen }, reason: null } },
          publication,
        )
      ).ok;
      if (publication.deliveredAt !== undefined) {
        await recordDecisionTiming(
          log,
          current,
          'final',
          publication.deliveredAt,
          publication.deliveredElapsedMs,
        );
        if (current.decision!.immediate.kind === 'pending')
          await recordDecisionTiming(
            log,
            current,
            'immediate',
            publication.deliveredAt,
            publication.deliveredElapsedMs,
          );
      }
      if (!delivered) await escalator.end(id, 'expired');
    } else if (reason) {
      admitted = await escalator.enqueue(id, reason);
      await execution.idle();
    } else await escalator.end(id, 'provider-failed');
    clearTimeout(rootTimer);
    rootTimer = undefined;
    const finished = (await store.getJob(id))!,
      linked = await store.decisionAttempts(id);
    await log.flush();
    const stages = await store.diagnosticStages([id], true);
    const timing = (phase: 'immediate' | 'final') => {
      const output = stages.find((stage) => stage.id === `${id}:delivered:${phase}`)?.output;
      return output &&
        typeof output === 'object' &&
        'elapsedMs' in output &&
        typeof output.elapsedMs === 'number'
        ? output.elapsedMs
        : undefined;
    };
    const proposal = stages.find((stage) => stage.kind === 'Higher-model decision')?.output as
      | {
          outcome?: string;
          value?: { answers?: { q0?: { status: string; value?: { choice?: string } } } };
        }
      | undefined;
    const finalAnswer = (
      finished.result as
        | { answers?: { q0?: { status: string; value?: { choice?: string } } } }
        | undefined
    )?.answers?.q0;
    const proposedHigher = proposal?.outcome === 'value' ? proposal.value?.answers?.q0 : undefined;
    // A current-world rejection is still an answered model error. Retain that proposal
    // for grading even when it was late, stale, or never delivered to the reader.
    const finalChoice =
      proposedHigher?.status === 'answered'
        ? proposedHigher.value?.choice
        : finalAnswer?.status === 'answered'
          ? finalAnswer.value?.choice
          : proposed;
    const primaryDelivered = delivered;
    delivered ||= finished.decision?.groups['q0']?.state === 'resolved';
    const finances = (attempts: typeof linked) => ({
      knownCostUsd: sumRequestCosts(
        attempts.flatMap((attempt) =>
          !attempt.receipt || attempt.receipt.completionUncertain
            ? []
            : [
                Math.max(
                  attempt.receipt.estimatedCostUsd ?? 0,
                  attempt.receipt.providerReportedCostUsd ?? 0,
                ),
              ],
        ),
      ),
      heldUsd: sumRequestCosts(
        attempts
          .filter(
            (attempt) =>
              !attempt.receipt ||
              (attempt.receipt.dispatched &&
                (attempt.receipt.completionUncertain ||
                  attempt.receipt.estimatedCostUsd === undefined)),
          )
          .map((attempt) => attempt.reservedUsd),
      ),
    });
    const { knownCostUsd, heldUsd } = finances(linked);
    const primaryMoney = finances(linked.filter((attempt) => attempt.attemptId === attemptId));
    observed.push({
      id: episode.id,
      episodeId: episode.episodeId,
      primaryChoice: proposed,
      finalChoice,
      triggered: !!reason,
      admitted,
      completed: !!finished.decision?.higher?.returnedAt,
      delivered,
      primaryDelivered,
      primaryKnownCostUsd: primaryMoney.knownCostUsd,
      primaryHeldUsd: primaryMoney.heldUsd,
      immediateMs: timing('immediate'),
      ...(delivered ? { finalMs: timing('final') } : {}),
      knownCostUsd,
      heldUsd,
      end: finished.decision?.end,
    });
    await append({
      event: 'result',
      root: finished,
      attempts: linked,
      observation: observed.at(-1),
      primaryResult: result,
    });
    const report = escalationReport(selected, observed, live && !probe);
    await json('report.json', { ...report, stop });
    await writeFile(join(out, 'report.md'), escalationMarkdown(report), { mode: 0o600 });
    if (
      linked.some((attempt) =>
        /quota|credit|billing/.test(attempt.receipt?.providerErrorCode ?? ''),
      )
    ) {
      stop = 'Provider account refused further funding.';
      break;
    }
    if (stop) break;
  }
} finally {
  if (rootTimer) clearTimeout(rootTimer);
  if (presenceTimer) clearInterval(presenceTimer);
  await escalator.close();
  await execution.idle();
  execution.close();
  await log.close();
  const report = escalationReport(selected, observed, live && !probe);
  await json('report.json', { ...report, stop, routeProbe: probe });
  await writeFile(join(out, 'report.md'), escalationMarkdown(report), { mode: 0o600 });
  await tail;
  await journal.close();
  const pending = (await Promise.all(rootIds.map((id) => store.decisionAttempts(id))))
    .flat()
    .some(
      (attempt) =>
        !attempt.receipt ||
        (attempt.receipt.dispatched &&
          (attempt.receipt.completionUncertain || attempt.receipt.estimatedCostUsd === undefined)),
    );
  service.releaseHostWork();
  await store.close();
  if (!live || !pending) {
    await database.close();
    await json('database.json', { ...database.details, removedAfterAccountingExport: true });
  } else
    await json('database.json', {
      url: database.url,
      ...database.details,
      retainedForAccounting: true,
    });
  await lock.close();
  process.stdout.write(
    JSON.stringify({
      output: out,
      attempted: report.attempted,
      knownCostUsd: report.knownCostUsd,
      heldUsd: report.heldUsd,
      qualified: false,
      stop,
    }) + '\n',
  );
}
