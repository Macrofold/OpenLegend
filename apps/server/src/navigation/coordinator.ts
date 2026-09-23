import { Worker } from 'node:worker_threads';
import type { NavigationRequest } from '@open-legend/spatial';
import type { WorldState } from '@open-legend/domain';
import type { WorldService } from '../world-service.js';
import { recordDuration, gaugeMetric, countMetric } from '../performance.js';
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
    if (this.closed) return;
    const { world, timelineId } = this.service;
    if (this.map !== world.map || this.timeline !== timelineId) {
      this.map = world.map;
      this.timeline = timelineId;
      this.key = `${world.id}:${timelineId}:${++this.serial}`;
    }
    const previous = new Map(this.queue.map((t) => [t.actionId, t]));
    this.queue = [];
    for (const actor of Object.values(world.entities)) {
      const a = actor.actor?.action;
      if (
        !a?.navigation ||
        a.navigation.failure ||
        !actor.actor?.alive ||
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
    if (this.active || this.closed || !this.map) return;
    const task = this.queue.shift();
    // A failed worker does not restart on an idle timer. A newly requested action permits one retry.
    if (!task && this.failed) return;
    if (!this.worker) {
      this.failed = false;
      this.worker = new Worker(new URL('./worker.mjs', import.meta.url), {
        execArgv: [],
        env: {},
        resourceLimits: { maxOldGenerationSizeMb: 128 },
      });
      const worker = this.worker;
      worker.on('message', (reply: NavigationReply) => {
        if (this.worker === worker) void this.completed(reply);
      });
      worker.on('error', () => {
        if (this.worker === worker) void this.failedWorker();
      });
      worker.on('exit', (code) => {
        if (code !== 0 && !this.closed && this.worker === worker) void this.failedWorker();
      });
    } else if (!task && this.preparedKey === this.key) return;
    const id = ++this.requestId;
    this.active = { id, task, key: this.key };
    const message: NavigationMessage = {
      id,
      key: this.key,
      ...(this.preparedKey !== this.key ? { map: this.map } : {}),
      ...(task ? { request: task.request } : {}),
    };
    if (task) recordDuration('navigation.queueWait', performance.now() - task.queuedAt);
    this.timer = setTimeout(() => void this.failedWorker(), 20_000);
    this.worker.postMessage(message);
  }
  private preparedKey = '';
  private async completed(reply: NavigationReply) {
    const active = this.active;
    if (!active || active.id !== reply.id || active.key !== reply.key) return;
    clearTimeout(this.timer);
    if (!reply.error) {
      this.preparedKey = reply.key;
      this.failed = false;
    } else this.failed = true;
    recordDuration('navigation.build', reply.buildMs);
    recordDuration('navigation.query', reply.queryMs);
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
    } catch {
      countMetric('navigation.commitFailure');
    } finally {
      this.active = undefined;
      this.schedule();
    }
  }
  private async failedWorker() {
    const worker = this.worker;
    if (!worker) return;
    this.worker = undefined;
    this.preparedKey = '';
    clearTimeout(this.timer);
    this.failed = true;
    await worker.terminate();
    const active = this.active;
    if (active?.task) {
      const t = active.task;
      try {
        await this.service.preparedNavigation(
          t.actorId,
          t.actionId,
          t.request,
          { status: 'unavailable', path: [] },
          t.map,
          t.timeline,
        );
      } catch {}
    }
    this.active = undefined;
    countMetric('navigation.workerFailure');
    this.schedule();
  }
  async close() {
    this.closed = true;
    this.unsubscribe();
    clearImmediate(this.scheduled);
    clearTimeout(this.timer);
    await this.worker?.terminate();
    this.worker = undefined;
  }
}
