import { Worker } from 'node:worker_threads';
import type { NavigationRequest } from '@open-legend/spatial';
import { activelyParticipates, worldRootEntities, type WorldState } from '@open-legend/domain';
import type { WorldService } from '../world-service.js';
import { recordDuration, gaugeMetric, countMetric } from '../performance.js';
import { OverloadError } from '../work-lane.js';
import type { NavigationMessage, NavigationReply } from './messages.js';
interface Task {
  actorId: string;
  actionId: string;
  request: NavigationRequest;
  map: WorldState['map'];
  timeline: string;
  queuedAt: number;
}

/** One persistent worker initially; no per-actor WASM worlds and no waits in the mutation lane.
 * Only admitted pending actions enter the queue. A canceled/edited/restored action cannot consume
 * an old result. Pending state is saved, while workers, refs and caches are disposable.
 */
export class NavigationCoordinator {
  private worker?: Worker;
  private active?: { id: number; task?: Task; key: string };
  private timer?: ReturnType<typeof setTimeout>;
  private scheduled?: ReturnType<typeof setImmediate>;
  private queue: Task[] = [];
  private key = '';
  private map?: WorldState['map'];
  private timeline = '';
  private serial = 0;
  private requestId = 0;
  private closed = false;
  private failed = false;
  private retiring?: Promise<number>;
  private completion?: Promise<void>;
  private readonly unsubscribe: () => void;
  constructor(private readonly service: WorldService) {
    this.unsubscribe = service.subscribe(() => this.schedule());
    this.schedule();
  }
  private schedule() {
    if (!this.closed && !this.scheduled)
      this.scheduled = setImmediate(() => {
        this.scheduled = undefined;
        this.reconcile();
      });
  }
  private reconcile() {
    if (this.closed || this.service.storageError) return;
    const { world, timelineId } = this.service;
    if (this.map !== world.map || this.timeline !== timelineId) {
      this.map = world.map;
      this.timeline = timelineId;
      this.key = `${world.id}:${timelineId}:${++this.serial}`;
      // Do not make a loaded/replaced world wait for an obsolete heavy build. Termination
      // finishes before another worker is created, keeping the pool bounded to one.
      if (this.active) {
        void this.failedWorker(false);
        return;
      }
    }
    const previous = new Map(this.queue.map((t) => [t.actionId, t]));
    this.queue = [];
    for (const actor of worldRootEntities(world)) {
      const a = actor.actor?.action;
      if (
        !a?.navigation ||
        a.navigation.failure ||
        !actor.actor?.alive ||
        !activelyParticipates(actor) ||
        actor.actor.incapacitated
      )
        continue;
      if (
        this.active?.task?.actionId === a.id &&
        this.active.task.map === world.map &&
        this.active.task.timeline === timelineId
      )
        continue;
      if (this.queue.length >= 64) break; // Additional saved actions remain pending; do not mislabel queue pressure as no-route.
      const prior = previous.get(a.id);
      this.queue.push({
        actorId: actor.id,
        actionId: a.id,
        request: a.navigation.request,
        map: world.map,
        timeline: timelineId,
        queuedAt: prior?.queuedAt ?? performance.now(),
      });
    }
    gaugeMetric('navigation.queued', this.queue.length);
    this.pump();
  }
  private pump() {
    if (this.active || this.retiring || this.closed || this.service.storageError || !this.map)
      return;
    const task = this.queue.shift();
    // A failed worker does not restart on an idle timer. A newly requested action permits one retry.
    if (!task && this.failed) return;
    if (!task && this.worker && this.preparedKey === this.key) return;
    const id = ++this.requestId;
    this.active = { id, task, key: this.key };
    try {
      if (!this.worker) {
        this.failed = false;
        this.worker = new Worker(new URL('./worker.mjs', import.meta.url), {
          execArgv: [],
          env: {},
          resourceLimits: { maxOldGenerationSizeMb: 128 },
        });
        const worker = this.worker;
        worker.on('message', (reply: NavigationReply) => {
          if (this.worker === worker) this.completion = this.completed(reply);
        });
        worker.on('error', () => {
          if (this.worker === worker) void this.failedWorker();
        });
        worker.on('exit', () => {
          if (!this.closed && this.worker === worker) void this.failedWorker();
        });
      }
      const message: NavigationMessage = {
        id,
        key: this.key,
        ...(this.preparedKey !== this.key ? { map: this.map } : {}),
        ...(task ? { request: task.request } : {}),
      };
      if (task) recordDuration('navigation.queueWait', performance.now() - task.queuedAt);
      this.timer = setTimeout(() => void this.failedWorker(), 20_000);
      this.worker.postMessage(message);
    } catch {
      // Launch/serialization can fail before an error event. Use the same terminal path
      // instead of throwing from setImmediate or leaving a saved action pending forever.
      void this.failedWorker();
    }
  }

  private preparedKey = '';
  private async completed(reply: NavigationReply) {
    const active = this.active;
    if (this.closed || !active || active.id !== reply.id || active.key !== reply.key) return;
    clearTimeout(this.timer);
    if (!reply.error) {
      this.preparedKey = reply.key;
      this.failed = false;
    } else this.failed = true;
    recordDuration('navigation.build', reply.buildMs);
    recordDuration('navigation.query', reply.queryMs);
    let deferred = false;
    try {
      if (active.task && reply.result)
        await this.service.preparedNavigation(
          active.task.actorId,
          active.task.actionId,
          active.task.request,
          reply.result,
          active.task.map,
          active.task.timeline,
        );
    } catch (error) {
      if (error instanceof OverloadError && !this.closed) {
        // Queue admission did not execute the mutation. Retain this one computed reply;
        // retrying publication neither reruns navigation nor labels load as storage damage.
        // docs/performance.md#navigation-failure-and-shutdown
        deferred = true;
        countMetric('navigation.publicationDeferred');
        this.timer = setTimeout(() => {
          this.completion = this.completed(reply);
        }, 1000);
      } else this.commitFailed();
    } finally {
      if (!deferred) {
        if (this.active === active) this.active = undefined;
        this.schedule();
      }
    }
  }
  private commitFailed() {
    // Storage failure is not permission to retry the same computation indefinitely.
    // docs/performance.md#navigation-failure-and-shutdown
    countMetric('navigation.commitFailure');
    this.service.storageError =
      'Navigation persistence failed; simulation paused. Restart and reconcile storage.';
    this.service.notify();
  }
  private async failedWorker(markUnavailable = true) {
    // A second invalidation/error may arrive while termination is still pending. Keep
    // ownership of that retirement until it settles; never launch a replacement early.
    if (this.retiring) {
      await this.retiring;
      return;
    }
    const worker = this.worker;
    const active = this.active;
    if (!worker && !active) return;
    this.worker = undefined;
    this.preparedKey = '';
    clearTimeout(this.timer);
    this.failed = true;
    this.retiring = worker?.terminate() ?? Promise.resolve(0);
    try {
      await this.retiring;
      if (markUnavailable && active?.task && !this.closed) {
        this.completion = this.completed({
          id: active.id,
          key: active.key,
          result: { status: 'unavailable', path: [] },
          error: 'Navigation worker failed.',
          buildMs: 0,
          queryMs: 0,
        });
        await this.completion;
      } else if (this.active === active) this.active = undefined;
    } catch {
      this.commitFailed();
    } finally {
      this.retiring = undefined;
      countMetric(markUnavailable ? 'navigation.workerFailure' : 'navigation.obsoleteWorker');
      this.failed = markUnavailable;
      this.schedule();
    }
  }
  async close() {
    this.closed = true;
    this.unsubscribe();
    clearImmediate(this.scheduled);
    clearTimeout(this.timer);
    const worker = this.worker;
    this.worker = undefined;
    // Retirement and reply publication can already be underway when the host closes.
    // Drain them before the application's store is closed; never publish after disposal.
    await Promise.all([worker?.terminate(), this.retiring, this.completion]);
    this.active = undefined;
    this.queue = [];
  }
}
