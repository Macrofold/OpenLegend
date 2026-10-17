import { undispatchedReceipt } from '../../apps/server/src/decision-state.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { NPC_ID, definitionPin } from '../../packages/domain/src/index.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import type { AiClient, AiResult, GenerateRequest } from '../../packages/ai/src/index.js';
import { createDisposableDatabase } from '../disposable-postgres.mjs';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import {
  SqlGameRepository,
  COGNITION_PENDING_EXECUTIONS_SQL,
  COGNITION_UNSENT_ATTEMPTS_SQL,
  type JobRecord,
} from '../../apps/server/src/store.js';
import { WorldService } from '../../apps/server/src/world-service.js';
import { OverloadError } from '../../apps/server/src/work-lane.js';
import { readConfig } from '../../apps/server/src/config.js';
import { IntelligenceLog } from '../../apps/server/src/intelligence-log.js';
import { CognitionExecution } from '../../apps/server/src/cognition-execution.js';
import { DecisionEscalator } from '../../apps/server/src/decision-escalator.js';
import { prepareQuestionRead } from '../../apps/server/src/decision-question-reader.js';
import { prepareReconsideration } from '../../apps/server/src/decision-preparation.js';
import { RecallService } from '../../apps/server/src/recall.js';
import {
  decisionRoot,
  DECISION_MODEL,
  DECISION_REASONS,
} from '../../apps/server/src/decision-state.js';
import { levelLimits } from '../../apps/server/src/cognition-budget.js';
import { decisionOrigin, decisionPolicyDigest } from '../../apps/server/src/decision-task.js';
import { observeDurations } from '../../apps/server/src/performance.js';
import { escalationEpisodes } from './escalation-episodes.js';
import { distribution } from './escalation-report.js';
import { enterLocalWorld, editWorld, useNearCampSight } from '../../tests/fixtures/service.js';

// No external inference, credentials, application database or real save is used.
globalThis.fetch = async () => {
  throw new Error('External network blocked by fixture load tool.');
};
process.on('uncaughtExceptionMonitor', (_error, origin) => {
  process.stderr.write(JSON.stringify({ unhandledFailure: origin }) + '\n');
});
const flags = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key!, rest.join('=')];
  }),
);
if (
  !flags.get('out')?.startsWith('/') ||
  !relative(process.cwd(), resolve(flags.get('out')!)).startsWith('..')
)
  throw new Error('Use an absolute --out outside the repository.');
const out = resolve(flags.get('out')!);
await mkdir(out, { recursive: true, mode: 0o700 });
const counts = (flags.get('counts') ?? '100,1000').split(',').map(Number);
if (counts.some((n) => ![100, 1000].includes(n)))
  throw new Error('Counts are 100 and/or 1000 admitted opportunities.');
const only = flags.get('only')?.split(',');
const modelDelayMs = Number(flags.get('model-delay-ms') ?? 250);
if (!Number.isSafeInteger(modelDelayMs) || modelDelayMs < 0 || modelDelayMs > 10_000)
  throw new Error('Model delay is 0–10000 fixture milliseconds.');
const caseLimitMs = Number(flags.get('max-case-ms') ?? 120_000);
if (!Number.isSafeInteger(caseLimitMs) || caseLimitMs < 1000 || caseLimitMs > 600_000)
  throw new Error('Case time limit is 1000–600000 milliseconds.');
const source = {
  gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  capturedAt: new Date().toISOString(),
  node: process.version,
  processId: process.pid,
  modelDelayMs,
  caseLimitMs,
};
await writeFile(
  join(out, 'source.patch'),
  execFileSync('git', ['diff', '--binary', 'HEAD', '--', 'apps', 'packages', 'scripts']),
  { mode: 0o600 },
);
await writeFile(join(out, 'manifest.json'), JSON.stringify(source, null, 2), { mode: 0o600 });
await initializeCollisionRuntime();
const results: { validNativeProgress: boolean }[] = [];
for (const count of counts)
  for (const concentrated of [false, true])
    for (const speed of [1, 8])
      for (const mode of ['off', 'apply'] as const) {
        const caseId = `${count}:${concentrated ? 'concentrated' : 'normal'}:${speed}:${mode}`;
        if (only && !only.includes(caseId)) continue;
        let phase = 'setup';
        const diagnostic = (stage: string) => {
          phase = stage;
          if (flags.has('diagnose'))
            process.stdout.write(JSON.stringify({ caseId, stage, at: Date.now() }) + '\n');
        };
        diagnostic('setup');
        const database = await createDisposableDatabase(
          process.env['OPENLEGEND_TEST_DATABASE_URL'],
        );
        await appendFile(
          join(out, 'databases.jsonl'),
          JSON.stringify({ caseId, ...database.details }) + '\n',
          { mode: 0o600 },
        );
        const store = new SqlGameRepository(
          join(out, randomUUID()),
          new PostgresDatabase(database.url),
        );
        const config = readConfig({
          OPEN_LEGEND_DATABASE_URL: database.url,
          OPENAI_API_KEY: 'fixture',
          TYPESAFE_API_KEY: 'fixture',
          OPENAI_EMBEDDING_API_KEY: '',
          AI_BUDGET_USD: '10',
          OPENAI_MODEL_PRICES_JSON: JSON.stringify([
            {
              model: DECISION_MODEL,
              prices: { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.5 },
            },
          ]),
          DECISION_ESCALATION_JSON: JSON.stringify({
            mode,
            origins: ['jev/jev-1.13.0'],
            reasons: [...DECISION_REASONS],
          }),
        });
        const service = new WorldService(store, config),
          log = new IntelligenceLog(store),
          pool = new CognitionExecution(store);
        const recall = new RecallService(service, log, undefined, pool);
        const episode = escalationEpisodes().find((episode) => episode.id.endsWith('dense'))!;
        const actorIds = Array.from({ length: 20 }, (_, index) =>
          index === 0 ? NPC_ID : `load-actor-${index}`,
        );
        let calls = 0,
          maxQueued = 0,
          maxInputBytes = 0,
          statements = 0,
          preparations = 0;
        const client: AiClient = {
          judge: async () => {
            throw new Error('No primary provider in this controlled scheduling load.');
          },
          async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
            calls++;
            maxInputBytes = Math.max(maxInputBytes, Buffer.byteLength(request.context as string));
            await new Promise<void>((done) => setTimeout(done, modelDelayMs));
            return {
              outcome: 'value',
              value: {
                answers: { q0: { status: 'answered', reason: null, value: { category: 1 } } },
              } as T,
              receipt: {
                ...undispatchedReceipt(request.requestId, 'openai', Date.now()),
                dispatched: true,
                estimatedCostUsd: 0,
              },
            };
          },
        };
        const read = () =>
          prepareQuestionRead(service, {
            questions: {
              q0: {
                kind: 'rating',
                question: 'How strong is the supplied quiet preference?',
                categories: { 0: 'Absent', 1: 'Strong' },
              },
            },
            inputs: {
              evidence: {
                value: episode.context,
                revision: 'fixed',
                owner: 'fixture-permitted reader',
              },
            },
            sourceTime: service.world.simTime,
            currentRevisions: async () => ({ evidence: 'fixed' }),
          });
        const escalator = new DecisionEscalator(
          service,
          pool,
          log,
          async () => {
            preparations++;
            return read();
          },
          client,
        );
        const delay = monitorEventLoopDelay({ resolution: 10 });
        let unobserve = () => {};
        let clockTimer: ReturnType<typeof setInterval> | undefined;
        let activeTick: Promise<void> | undefined;
        let tickFailure: unknown;
        let busyClockAdmissions = 0;
        let busyPublications = 0;
        let busyPresenceAdmissions = 0;
        let presenceTimer: ReturnType<typeof setInterval> | undefined;
        let activePresence: Promise<void> | undefined;
        let caseTimer: ReturnType<typeof setTimeout> | undefined;
        let activeExpiry: Promise<void> | undefined;
        let timedOut = false,
          admittedOpportunities = 0,
          nativeIntervals = 0,
          zeroProgressNativeIntervals = 0;
        try {
          await enterLocalWorld(service);
          await service.setConnection('load', true);
          await service.setPresence('load', true);
          await service.control({ paused: false });
          await useNearCampSight(service);
          await editWorld(service, (world) => {
            const template = world.moduleManifest.definitions.find(
              (definition) => definition.id === 'wilderness:fullness',
            )!;
            for (let index = 0; index < 20; index++)
              world.moduleManifest.definitions.push({
                ...structuredClone(template),
                id: `load:need-${index}`,
                name: `Load fixture need ${index}`,
                meaning: 'An explicitly hypothetical need observation.',
              });
            world.moduleManifest.pins = world.moduleManifest.definitions.map(definitionPin);
            world.moduleManifest.revision++;
            for (const actorId of actorIds) {
              if (actorId !== NPC_ID)
                world.entities[actorId] = {
                  ...structuredClone(world.entities[NPC_ID]!),
                  id: actorId,
                };
              for (let index = 0; index < 20; index++)
                world.entities[actorId]!.actor!.attributes![`load:need-${index}`] = {
                  value: 50,
                  revision: 0,
                };
              world.memories[actorId] = Array.from({ length: 539 }, (_, index) => ({
                id: `load-memory-${actorId}-${index}`,
                actorId,
                kind: 'episode' as const,
                source: 'observed' as const,
                summary: `Distinct permitted leaf observation ${index}.`,
                at: world.simTime,
                entityIds: [],
                importance: 1,
              }));
            }
          });
          diagnostic('fixture-populated');
          const coldWarmMs: number[] = [];
          const sampleRoot = decisionRoot({
            jobId: 'load-preparation',
            worldId: service.world.id,
            timelineId: service.timelineId,
            generation: service.generation,
            actorId: NPC_ID,
            physicalLife: 0,
            cause: { kind: 'intent', id: 'load-preparation' },
            originalWatermark: 0,
            urgency: 0,
            acceptedAt: Date.now(),
            groups: { q0: 'choice' },
            origin: decisionOrigin(config),
            policyDigest: decisionPolicyDigest(config),
            limits: levelLimits(config),
          });
          const sample: JobRecord = {
            id: 'load-preparation',
            kind: 'thought',
            fingerprint: 'load-preparation',
            status: 'judging',
            createdAt: Date.now(),
            request: { npcId: NPC_ID, text: 'Compare my current options.' },
            message: 'Native preparation measurement.',
            decision: sampleRoot,
          };
          sampleRoot.higherEntitlement = 'claimed-child';
          sampleRoot.higher = {
            id: 'load-preparation-child',
            reason: 'abstained',
            state: 'preparing',
            eligibleAt: sampleRoot.acceptedAt,
            dispatchBy: sampleRoot.acceptedAt + 2000,
            publishBy: sampleRoot.usefulUntilWall,
            dispatchByMonotonic: performance.now() + 2000,
            publishByMonotonic: sampleRoot.usefulUntilMonotonic,
            policyDigest: sampleRoot.policyDigest,
          };
          for (let pass = 0; pass < 2; pass++) {
            diagnostic(`native-preparation-${pass}`);
            const at = performance.now();
            await prepareReconsideration(service, recall, sample, new AbortController().signal);
            coldWarmMs.push(performance.now() - at);
          }
          // A real browser renews presence while the player remains connected. Expired
          // fixture presence would measure automatic pause instead of native headroom.
          await service.setPresence('load', true);
          await service.control({ paused: false, speed });
          // Presence must continue during provider waits and the last clock drain,
          // independently of how quickly the synthetic opportunity producer runs.
          presenceTimer = setInterval(() => {
            if (activePresence) return;
            activePresence = service
              .setPresence('load', true)
              .catch((error: unknown) => {
                if (error instanceof OverloadError) busyPresenceAdmissions++;
                else tickFailure = error;
              })
              .finally(() => {
                activePresence = undefined;
              });
          }, 4000);
          unobserve = observeDurations((stage, milliseconds) => {
            if (stage === 'postgres.statement') statements++;
            if (stage === 'native.intervalSimMs') {
              nativeIntervals++;
              if (milliseconds <= 0) zeroProgressNativeIntervals++;
            }
          });
          delay.enable();
          const startSim = service.world.simTime,
            at = performance.now(),
            intakeMs: number[] = [];
          diagnostic('load-start');
          caseTimer = setTimeout(() => {
            timedOut = true;
            activeExpiry = service.control({ paused: true }).then(
              () => {},
              (error: unknown) => {
                tickFailure = error;
              },
            );
          }, caseLimitMs);
          let previousTick = at,
            previousCallback = at,
            suspendedSeconds = 0,
            requestedRealSeconds = 0;
          // Match the host's bounded clock admission, without scheduling autonomous
          // thoughts. One outstanding tick prevents a timer backlog under slow saves.
          const advanceClock = () => {
            const now = performance.now();
            const elapsed = (now - previousTick) / 1000;
            previousTick = now;
            const excluded = suspendedSeconds;
            suspendedSeconds = 0;
            requestedRealSeconds += Math.max(0, elapsed - excluded);
            activeTick = service
              .tick(elapsed, excluded)
              .catch((error: unknown) => {
                if (error instanceof OverloadError) busyClockAdmissions++;
                else tickFailure = error;
              })
              .finally(() => {
                activeTick = undefined;
              });
            return activeTick;
          };
          clockTimer = setInterval(() => {
            const now = performance.now();
            const gap = (now - previousCallback) / 1000;
            previousCallback = now;
            if (gap > 2) suspendedSeconds += gap;
            if (!activeTick && !tickFailure) void advanceClock();
          }, 50);
          for (let index = 0; index < count; index++) {
            if (timedOut) break;
            const intake = performance.now(),
              id = `load-${index}`,
              actorId = actorIds[concentrated ? 0 : index % actorIds.length]!;
            const root = decisionRoot({
              jobId: id,
              worldId: service.world.id,
              timelineId: service.timelineId,
              generation: service.generation,
              actorId,
              physicalLife: 0,
              cause: { kind: 'intent', id },
              originalWatermark: 0,
              urgency: index % 10,
              acceptedAt: Date.now(),
              groups: { q0: 'rating' },
              origin: decisionOrigin(config),
              policyDigest: decisionPolicyDigest(config),
              limits: levelLimits(config),
            });
            await store.putJob({
              id,
              kind: 'thought',
              fingerprint: id,
              status: 'judging',
              createdAt: root.acceptedAt,
              request: { npcId: actorId, text: 'An admitted scoped semantic opportunity.' },
              message: 'Load fixture.',
              decision: root,
            });
            admittedOpportunities++;
            if (index % 4 === 0) {
              if (!(await escalator.enqueue(id, 'abstained')))
                await escalator.end(id, mode === 'off' ? 'disabled' : 'capacity');
            } else {
              const prepared = read();
              try {
                // The production primary allowance is one. Do not manufacture an
                // unbounded set of concurrent native publications in the load tool.
                await prepared.publish(
                  { q0: { status: 'answered', value: { category: 1 }, reason: null } },
                  {
                    rootJobId: id,
                    attemptId: id,
                    expectedRevision: 0,
                    receiptId: id,
                    groups: {},
                    final: true,
                    now: Date.now,
                  },
                );
              } catch (error) {
                if (!(error instanceof OverloadError)) throw error;
                busyPublications++;
                await escalator.end(id, 'capacity');
              }
            }
            maxQueued = Math.max(maxQueued, pool.snapshot().queuedDecisions);
            intakeMs.push(performance.now() - intake);
          }
          await pool.idle();
          diagnostic('provider-drained');
          clearInterval(clockTimer);
          clockTimer = undefined;
          await activeTick;
          if (!tickFailure) await advanceClock();
          diagnostic('clock-drained');
          if (tickFailure) throw tickFailure;
          clearTimeout(caseTimer);
          caseTimer = undefined;
          await activeExpiry;
          clearInterval(presenceTimer);
          presenceTimer = undefined;
          await activePresence;
          if (tickFailure) throw tickFailure;
          const durationMs = performance.now() - at;
          const nativeSimSeconds = service.world.simTime - startSim;
          const requestedSimSeconds = requestedRealSeconds * config.baseRatio * speed;
          const paused = service.paused,
            pauseReason = service.pauseReason,
            storageError = service.storageError;
          const outcomes = await store.db
            .prepare(
              "SELECT payload::jsonb #>> '{decision,groups,q0,state}' AS state, count(*) AS count FROM jobs WHERE id LIKE 'load-%' GROUP BY 1",
            )
            .all();
          const plans: Record<string, unknown> = {};
          // Retain completed history and inspect the exact pending-selection shape before ANALYZE.
          await store.db
            .prepare(
              "INSERT INTO attempts(id,provider,status,reserved,spent,receipt,created_at) SELECT 'retained-'||g,'jev','settled',1,0,'{\"completionUncertain\":false,\"dispatched\":true}',? FROM generate_series(1,20000) g",
            )
            .run(Date.now());
          await store.db
            .prepare(
              "INSERT INTO cognition_attempt_links SELECT 'retained-'||g,'retained-root','level',1,'retained','primary',true FROM generate_series(1,20000) g",
            )
            .run();
          for (const kind of ['primary', 'background']) {
            await store.db
              .prepare("INSERT INTO attempts VALUES (?,'openai','uncertain',1,1,NULL,?)")
              .run(`pending-${kind}`, Date.now());
            await store.db
              .prepare(
                "INSERT INTO cognition_attempt_links VALUES (?,'pending-root','level',4,'pending',?,true)",
              )
              .run(`pending-${kind}`, kind);
          }
          await store.db
            .prepare("INSERT INTO attempts VALUES ('unsent','openai','reserved',1,0,NULL,?)")
            .run(Date.now());
          await store.db
            .prepare(
              "INSERT INTO cognition_attempt_links VALUES ('unsent','unsent-root','level',4,'unsent','background',false)",
            )
            .run();
          const query = COGNITION_PENDING_EXECUTIONS_SQL;
          const unsentQuery = COGNITION_UNSENT_ATTEMPTS_SQL;
          plans['unsentFreshBulk'] = await store.db
            .prepare('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + unsentQuery)
            .all();
          plans['freshBulk'] = await store.db
            .prepare('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + query)
            .all();
          await store.db.prepare('ANALYZE attempts').run();
          await store.db.prepare('ANALYZE cognition_attempt_links').run();
          plans['afterStatistics'] = await store.db
            .prepare('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + query)
            .all();
          plans['unsentAfterStatistics'] = await store.db
            .prepare('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + unsentQuery)
            .all();
          const budgetAt = performance.now();
          await store.budgetAvailable(NPC_ID, 0.25, 10);
          const retainedBudgetReadMs = performance.now() - budgetAt;
          const result = {
            count,
            actors: actorIds.length,
            concentrated,
            speed,
            mode,
            timedOut,
            admittedOpportunities,
            nativeIntervals,
            zeroProgressNativeIntervals,
            durationMs,
            intakeMs: distribution(intakeMs),
            nativeSimSeconds,
            requestedSimSeconds,
            nativeProgressRatio: nativeSimSeconds / requestedSimSeconds,
            wallClockProgressRatio:
              nativeSimSeconds / ((durationMs / 1000) * config.baseRatio * speed),
            statements,
            calls,
            outcomes,
            busyClockAdmissions,
            busyPublications,
            busyPresenceAdmissions,
            preparations,
            maxQueued,
            maxQueuedMetadataBytes: maxQueued * 8192,
            maxActiveInputBytes: maxInputBytes,
            eventLoopP95Ms: delay.count ? delay.percentile(95) / 1e6 : null,
            eventLoopMaxMs: delay.count ? delay.max / 1e6 : null,
            heapUsedBytes: process.memoryUsage().heapUsed,
            rssBytes: process.memoryUsage().rss,
            coldWarmNativePreparationMs: coldWarmMs,
            retainedBudgetReadMs,
            paused,
            pauseReason,
            storageError,
            validNativeProgress: nativeSimSeconds > 0 && !paused && !storageError && !timedOut,
            plans,
          };
          results.push(result);
          process.stdout.write(
            JSON.stringify({
              count,
              concentrated,
              speed,
              mode,
              durationMs,
              calls,
              maxQueued,
              validNativeProgress: result.validNativeProgress,
              timedOut,
              nativeIntervals,
              zeroProgressNativeIntervals,
              pauseReason,
              storageError,
            }) + '\n',
          );
          await writeFile(
            join(out, 'load.json'),
            JSON.stringify(
              {
                evidence:
                  'Controlled no-network server scheduling/native preparation load; not provider or population qualification.',
                source,
                results,
              },
              null,
              2,
            ),
            { mode: 0o600 },
          );
        } catch (error) {
          const failed = {
            count,
            concentrated,
            speed,
            mode,
            phase,
            admittedOpportunities,
            nativeIntervals,
            zeroProgressNativeIntervals,
            validNativeProgress: false,
            failure: error instanceof OverloadError ? 'busy' : 'unexpected',
          };
          process.stderr.write(JSON.stringify({ caseFailure: failed }) + '\n');
          results.push(failed);
          await writeFile(join(out, 'load.json'), JSON.stringify({ source, results }, null, 2), {
            mode: 0o600,
          });
          if (!(error instanceof OverloadError)) throw error;
        } finally {
          clearInterval(clockTimer);
          clearInterval(presenceTimer);
          clearTimeout(caseTimer);
          await activeExpiry;
          await activePresence;
          await activeTick;
          delay.disable();
          unobserve();
          await escalator.close();
          await recall.close();
          await pool.idle();
          pool.close();
          await log.close();
          service.releaseHostWork();
          await store.close();
          await database.close();
        }
      }
// Keep failed case observations for diagnosis and continue the independent matrix,
// but never return a successful qualification status for paused/failed native work.
if (results.some((result) => !result.validNativeProgress)) process.exitCode = 1;
