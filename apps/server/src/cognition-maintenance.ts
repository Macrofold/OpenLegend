import {
  consolidationBatch,
  CONSOLIDATION_INSTRUCTIONS,
  type ConsolidationBatch,
} from './memory-consolidation.js';
import { interactiveAllowance } from './cognition-budget.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  experiences,
  acceptConsolidation,
  publishInnerWorld,
  mindFor,
  DEFAULT_COGNITION_POLICY,
} from '@open-legend/domain';
import type { AiClient, AiResult, GenerateRequest } from '@open-legend/ai';
import { summarySchema, reflectionSchema, REFLECTION_INSTRUCTIONS } from './cognition-contracts.js';
import type { WorldService } from './world-service.js';
import type { MacrofoldBackend } from './macrofold.js';
import type { IntelligenceLog } from './intelligence-log.js';
import { digest, type JobRecord } from './store.js';
import { gameTime, type RecallService } from './recall.js';
import { prepareDecision } from './decision-context.js';
interface ReflectionRequest {
  actorId: string;
  origin: string;
  reason: string;
  at: number;
}
export class CognitionMaintenance {
  private active: AbortController | null = null;
  private pending: Promise<void> | null = null;
  private stopped = false;
  private unsubscribe: () => void;
  constructor(
    private service: WorldService,
    private client: AiClient,
    private macrofold: MacrofoldBackend,
    private log: IntelligenceLog,
    private recall: RecallService,
    private now = Date.now,
  ) {
    this.unsubscribe = service.subscribe(() => {
      if (service.paused) this.active?.abort();
    });
  }
  private key(actorId: string) {
    return `reflection-queue:${this.service.world.id}:${actorId}`;
  }
  async enqueue(actorId: string, origin: string, reason: string): Promise<void> {
    if (!(this.service.world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).reflection) return;
    const world = this.service.world;
    const actor = world.entities[actorId]?.actor;
    if (!actor?.alive) return;
    const current = (await this.service.store.getIntegration(this.key(actorId))) as
      | ReflectionRequest
      | undefined;
    const request = {
      actorId,
      origin,
      reason,
      at: current?.at ?? this.now(),
    };
    if (current?.reason === reason) return;
    await this.service.store.putIntegration(this.key(actorId), request);
    const unavailable =
      this.service.store.persistence !== 'postgres'
        ? 'PostgreSQL is required for accepted workspace publication.'
        : !this.service.config.macrofoldKey
          ? 'Reflection harness is not configured.'
          : undefined;
    await this.log.save({
      id: `reflection-queued:${world.id}:${actorId}`,
      kind: 'Reflection opportunity',
      worldId: world.id,
      actorId,
      actorName: world.entities[actorId]!.name,
      trigger: reason,
      startedAt: new Date(request.at).toISOString(),
      status: unavailable ? 'completed' : 'running',
      disposition: unavailable ? 'deferred' : current ? 'coalesced' : 'queued',
      input: { origin },
      output: { reason: unavailable ?? 'Waiting for safe downtime and background capacity.' },
      exchanges: [],
    });
  }
  private scheduling = false;
  private schedulingTask: Promise<void> | null = null;
  async tick(interactiveBusy: boolean): Promise<void> {
    if (this.schedulingTask) return;
    this.schedulingTask = this.schedule(interactiveBusy);
    try {
      await this.schedulingTask;
    } finally {
      this.schedulingTask = null;
    }
  }
  private async schedule(interactiveBusy: boolean): Promise<void> {
    if (this.scheduling || this.active || this.stopped || this.service.paused || interactiveBusy)
      return;
    this.scheduling = true;
    try {
      const actors = Object.values(this.service.world.entities).filter((e) => e.actor?.alive);
      const times = new Map(
        await Promise.all(actors.map(async (e) => [e.id, await this.last(e.id)] as const)),
      );
      actors.sort((a, b) => times.get(a.id)! - times.get(b.id)!);
      for (const entity of actors) {
        if (this.stopped || this.service.paused || this.active) return;
        if (this.now() - times.get(entity.id)! < 60000) continue;
        const world = this.service.world,
          actor = world.entities[entity.id]!.actor!;
        const safe =
          actor.controller === 'npc' &&
          actor.health >= 40 &&
          actor.fullness >= 30 &&
          !actor.incapacitated &&
          (!actor.action || actor.action.type === 'rest');
        const mind = mindFor(world, entity.id);
        const sleeping =
          safe &&
          actor.action?.type === 'rest' &&
          actor.rest?.asleep &&
          actor.rest.sleepingSeconds >= 7200;
        const hasMemories = experiences(world, entity.id, true).length > 0;
        const day = Math.floor(world.simTime / 86400);
        const reflectedToday =
          mind.lastReflectionAt > 0 && Math.floor(mind.lastReflectionAt / 86400) === day;
        if (
          safe &&
          !actor.action &&
          hasMemories &&
          !reflectedToday &&
          !(await this.service.store.getIntegration(this.key(entity.id))) &&
          world.simTime - mind.lastReflectionAt >= 3600
        )
          await this.enqueue(
            entity.id,
            'native-downtime',
            'Safe idle time to reconsider remembered experience',
          );

        // Dream maintenance reviews the previous completed day in one mini-model call.
        // It is separate from intentional idle reflection and never marks memories reflected.
        const reviewKey = `memory-review:${world.id}:${entity.id}`;
        const reviewDay = day - 1;
        const review = (await this.service.store.getIntegration(reviewKey)) as
          | { day: number; completed?: boolean }
          | undefined;
        const queued = (await this.service.store.getIntegration(this.key(entity.id))) as
          | ReflectionRequest
          | undefined;
        const previousKind = await this.service.store.getIntegration(
          `maintenance-kind:${world.id}:${entity.id}`,
        );
        const prioritizeReflection =
          safe &&
          !actor.action &&
          queued &&
          previousKind === 'consolidation' &&
          this.service.config.macrofoldKey &&
          this.service.store.persistence === 'postgres';
        if (sleeping && reviewDay >= 0 && review?.day !== reviewDay && !prioritizeReflection) {
          const batch = consolidationBatch(world, entity.id, 'daily', reviewDay);
          // Attempt each completed day at most once. Provider failure preserves every source.
          await this.service.store.putIntegration(reviewKey, { day: reviewDay });
          if (batch) {
            await this.start(entity.id, 'consolidation', async (controller) => {
              const accepted = await this.consolidate(entity.id, batch, controller);
              if (accepted)
                await this.service.store.putIntegration(reviewKey, {
                  day: reviewDay,
                  completed: true,
                });
            });
            return;
          }
        }
        const batch = consolidationBatch(world, entity.id, 'hourly');
        const cleanupKey = `cleanup:${world.id}:${entity.id}`;
        const previous = (await this.service.store.getIntegration(cleanupKey)) as
          | { hour: number; sourceDigest: string }
          | undefined;
        const hour = Math.floor(world.simTime / 3600);
        if (
          batch &&
          !prioritizeReflection &&
          (previous?.hour !== hour || !!this.service.memoryBacklog) &&
          previous?.sourceDigest !== digest(batch.sources)
        ) {
          await this.service.store.putIntegration(cleanupKey, {
            hour,
            sourceDigest: digest(batch.sources),
          });
          await this.start(entity.id, 'consolidation', (controller) =>
            this.consolidate(entity.id, batch, controller).then(() => undefined),
          );
          return;
        }
        if (
          !safe ||
          actor.action ||
          !queued ||
          !this.service.config.macrofoldKey ||
          this.service.store.persistence !== 'postgres'
        )
          continue;
        const attemptKey = `reflection-attempt:${world.id}:${entity.id}`;
        const attempt = (await this.service.store.getIntegration(attemptKey)) as
          | { day?: number }
          | undefined;
        if (attempt?.day === day) continue;
        await this.service.store.putIntegration(attemptKey, { day });
        await this.service.store.putIntegration(this.key(entity.id), null);
        await this.start(entity.id, queued.reason, (controller) =>
          this.reflect(queued, controller),
        );
        return;
      }
    } finally {
      this.scheduling = false;
    }
  }
  private async last(actorId: string): Promise<number> {
    return Number(
      (await this.service.store.getIntegration(
        `maintenance-at:${this.service.world.id}:${actorId}`,
      )) ?? 0,
    );
  }
  private async start(
    actorId: string,
    reason: string,
    execute: (controller: AbortController) => Promise<void>,
  ) {
    if (this.stopped || this.service.paused) return;
    const controller = new AbortController();
    this.active = controller;
    await this.service.store.putIntegration(
      `maintenance-kind:${this.service.world.id}:${actorId}`,
      reason === 'consolidation' ? 'consolidation' : 'reflection',
    );
    await this.service.store.putIntegration(
      `maintenance-at:${this.service.world.id}:${actorId}`,
      this.now(),
    );
    this.pending = execute(controller)
      .catch(() => {
        /* Job receipt records failure; no paid retry. */
      })
      .finally(() => {
        this.active = null;
        this.pending = null;
        this.service.notify();
      });
  }
  private async job(
    actorId: string,
    trigger: string,
    origin: string,
    execute: (job: JobRecord) => Promise<void>,
  ) {
    const id = `maintenance-${randomUUID()}`;
    const job: JobRecord = {
      id,
      kind: 'thought',
      status: 'generating',
      message: trigger,
      request: { text: trigger, npcId: actorId },
      fingerprint: digest({ actorId, trigger, id }),
      createdAt: this.now(),
    };
    await this.service.store.putJob(job);
    const queueTrace = await this.service.store.intelligenceCall(
      `reflection-queued:${this.service.world.id}:${actorId}`,
    );
    if (!['Hourly consolidation', 'Daily dream review'].includes(trigger) && queueTrace)
      await this.log.save({
        ...queueTrace,
        status: 'completed',
        disposition: 'dispatched',
        output: { jobId: id },
      });
    const root = {
      id,
      worldId: this.service.world.id,
      actorId,
      actorName: this.service.world.entities[actorId]!.name,
      trigger,
      kind: 'Semantic trigger',
      route: ['Hourly consolidation', 'Daily dream review'].includes(trigger)
        ? 'summary'
        : 'level5',
      gameTime: this.service.world.simTime,
      startedAt: new Date().toISOString(),
      status: 'running' as const,
      input: { origin },
      exchanges: [],
    };
    await this.log.save(root);
    try {
      await this.log.withTrigger(id, async () => await execute(job));
      job.status = 'completed';
      job.message = 'Maintenance accepted.';
    } catch (error) {
      job.status = this.active?.signal.aborted ? 'cancelled' : 'failed';
      job.message = error instanceof Error ? error.message : 'Maintenance failed.';
    } finally {
      job.completedAt = this.now();
      await this.service.store.putJob(job);
      await this.log.save({
        ...root,
        status: job.status === 'completed' ? 'completed' : 'failed',
        disposition: job.status,
        completedAt: new Date().toISOString(),
        output: { message: job.message },
      });
    }
  }
  private async paid<T>(
    id: string,
    provider: 'jev' | 'openai',
    execute: () => Promise<AiResult<T>>,
  ): Promise<T> {
    const c = this.service.config;
    if (this.service.paused || this.active?.signal.aborted)
      throw new Error('Maintenance canceled.');
    const amount =
      provider === 'jev'
        ? c.jevReserveUsd
        : c.macrofoldKey
          ? c.macrofoldRunUsd
          : Math.max(c.llmReserveUsd, 0.25);
    // Leave one interactive request allowance untouched by background admission.
    const ceiling = Math.max(0, c.budgetUsd - interactiveAllowance(c));
    if (!(await this.service.store.reserve(id, provider, amount, ceiling)))
      throw new Error('Background allowance exhausted.');
    const result = await execute();
    await this.service.store.settle(id, result.receipt);
    if (result.outcome !== 'value') throw new Error(`${result.outcome}: ${result.reason}`);
    if (this.service.paused || this.active?.signal.aborted)
      throw new Error('Maintenance canceled before publication.');
    return result.value;
  }
  private async consolidate(
    actorId: string,
    batch: ConsolidationBatch,
    controller: AbortController,
  ): Promise<boolean> {
    let committed = false;
    await this.job(
      actorId,
      batch.mode === 'daily' ? 'Daily dream review' : 'Hourly consolidation',
      `native-${batch.mode}`,
      async (job) => {
        const c = this.service.config;
        const groups = batch.protected.map((source) => ({
          sourceIds: [source.id],
          text: source.summary,
        }));
        if (batch.routine.length) {
          const positions = new Map(batch.sources.map((source, i) => [source.id, i]));
          const handles = new Map(batch.routine.map((source, i) => [`s${i}`, source]));
          const request: GenerateRequest = {
            requestId: `${job.id}:summary`,
            actorScope: actorId,
            execution: 'fast',
            model: c.macrofoldKey ? c.macrofoldSummaryModel : c.summaryModel,
            reasoningEffort: 'low',
            maxOutputTokens: 8192,
            task: 'memory_consolidation',
            instructions: CONSOLIDATION_INSTRUCTIONS,
            context: {
              mode: batch.mode,
              memoryOwner: this.service.world.entities[actorId]?.name,
              maxGroups: batch.maxGroups,
              protectedSources: Object.fromEntries(
                batch.protected.map((source) => [
                  source.id,
                  {
                    text: source.summary,
                    at: gameTime(source.at),
                    chronologicalPosition: positions.get(source.id),
                    source: source.source,
                  },
                ]),
              ),
              sources: Object.fromEntries(
                [...handles].map(([handle, source]) => [
                  handle,
                  {
                    text: source.summary,
                    at: gameTime(source.at),
                    chronologicalPosition: positions.get(source.id),
                    source: source.source,
                    existingSummary: source.kind === 'reflection',
                  },
                ]),
              ),
            },
            schema: z.toJSONSchema(summarySchema, { target: 'draft-7' }),
            signal: controller.signal,
          };
          const value = summarySchema.parse(
            await this.paid(request.requestId, 'openai', () =>
              this.client.generate<unknown>(request),
            ),
          );
          if (!value.feasible || !value.groups.length || value.groups.length > batch.maxGroups)
            throw new Error('Consolidation cannot safely fit; original memories retained.');
          const covered = new Set<string>();
          let previousPosition = -1;
          for (const group of value.groups) {
            const groupPositions = group.sourceIds.map((handle) => {
              const source = handles.get(handle);
              if (!source || covered.has(handle))
                throw new Error('Consolidation returned unknown or repeated source handles.');
              covered.add(handle);
              return positions.get(source.id)!;
            });
            if (
              groupPositions.some(
                (position, i) =>
                  position <= previousPosition ||
                  (i > 0 && position !== groupPositions[i - 1]! + 1),
              )
            )
              throw new Error(
                'Consolidation changed chronological order or crossed an intervening memory.',
              );
            previousPosition = groupPositions.at(-1)!;
          }
          if (covered.size !== handles.size)
            throw new Error('Consolidation did not cover every routine source exactly once.');
          groups.push(
            ...value.groups.map((group) => ({
              text: group.text,
              sourceIds: group.sourceIds.map((handle) => {
                const source = handles.get(handle);
                if (!source) throw new Error('Unknown consolidation source handle.');
                return source.id;
              }),
            })),
          );
          groups.sort(
            (a, b) =>
              Math.min(...a.sourceIds.map((id) => positions.get(id)!)) -
              Math.min(...b.sourceIds.map((id) => positions.get(id)!)),
          );
        }
        await this.log.record(`${job.id}:coverage`, 'Consolidation coverage', {
          mode: batch.mode,
          sources: batch.sources.map((s) => s.id),
          groups,
        });
        if (controller.signal.aborted || this.service.paused)
          throw new Error('Consolidation canceled before publication.');
        const accepted = await this.service.transition((world) =>
          acceptConsolidation(world, actorId, job.id, batch.sources, groups),
        );
        if (!accepted.ok) throw new Error(accepted.message);
        committed = true;
        try {
          await this.service.store.vectors?.invalidate(
            `vectors:${this.service.world.id}:${actorId}`,
            batch.sources.map((source) => source.id),
          );
        } catch (error) {
          // Retired/revised rows cannot match the current permission/revision filter.
          // Record derived-index cleanup failure without misreporting the committed memory update.
          await this.log.record(`${job.id}:vector-invalidation`, 'Vector invalidation failure', {
            reason: error instanceof Error ? error.message : 'Unknown vector-store failure',
          });
        }
        await this.log.record(`${job.id}:publication`, 'Summary publication', {}, accepted);
      },
    );
    return committed;
  }
  private async reflect(queued: ReflectionRequest, controller: AbortController) {
    return await this.job(queued.actorId, queued.reason, queued.origin, async (job) => {
      const { actorId } = queued;
      const snapshot = this.service.world.innerWorlds![actorId]!;
      const obligations = digest(
        (this.service.world.memories[actorId] ?? []).filter((m) => m.kind === 'commitment'),
      );
      const prepared = await prepareDecision(
        this.service,
        this.recall,
        actorId,
        job.id,
        queued.reason,
        [],
        async (r) =>
          await this.paid(
            `${job.id}:attention`,
            'jev',
            async () =>
              await this.client.judge({
                ...r,
                requestId: `${job.id}:attention`,
                signal: controller.signal,
              }),
          ),
        controller.signal,
        Math.max(0, this.service.config.budgetUsd - interactiveAllowance(this.service.config)),
      );
      await this.log.record(
        `${job.id}:context`,
        'Reflection context',
        prepared.diagnostics,
        prepared.context,
      );
      const request: GenerateRequest = {
        requestId: `${job.id}:reflection`,
        actorScope: actorId,
        execution: 'full',
        task: 'background_reflection',
        instructions: `${REFLECTION_INSTRUCTIONS} Reflect using only the supplied context and accepted files in mind/*.md. Edit those files directly; flexible names, at most ten files, each at most 500 whitespace words including its name and 8000 UTF-8 bytes. Durable scratch counts. Preserve identity.md exactly and native obligations. Do not read old sessions or other paths. Complete within eight tool operations; stop rather than repair invalid output. Return only one to three presentation thoughts, each at most twenty words. Do not echo file contents or patches.`,
        context: prepared.context,
        schema: z.toJSONSchema(reflectionSchema, { target: 'draft-7' }),
        signal: controller.signal,
      };
      const value = await this.paid(request.requestId, 'openai', () =>
        this.log.run(
          'Reflection harness',
          request,
          async () => await this.macrofold.reflect(request, snapshot.files),
        ),
      );
      reflectionSchema.parse({ thoughts: value.thoughts });
      if (
        obligations !==
        digest((this.service.world.memories[actorId] ?? []).filter((m) => m.kind === 'commitment'))
      )
        throw new Error('Obligations changed during reflection.');
      await this.log.record(`${job.id}:files`, 'Workspace publication proposal', {
        sourceSnapshot: value.revision,
        files: value.files,
        thoughts: value.thoughts,
      });
      const accepted = await this.service.transition((world) =>
        publishInnerWorld(
          world,
          actorId,
          snapshot.revision,
          job.id,
          value.revision,
          value.files,
          value.thoughts,
          prepared.binding.evidenceIds,
          null,
        ),
      );
      if (!accepted.ok) throw new Error(accepted.message);
      await this.log.record(
        `${job.id}:publication`,
        'Accepted inner-world publication',
        {},
        accepted,
      );
    });
  }
  cancel(): void {
    this.active?.abort();
  }
  async close() {
    this.stopped = true;
    this.active?.abort();
    this.unsubscribe();
    await this.schedulingTask;
    await this.pending;
  }
}
