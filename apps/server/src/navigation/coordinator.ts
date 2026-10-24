import { entityGet } from '@open-legend/domain';
import { Worker } from 'node:worker_threads';
import type { BodyProfile, NavigationRequest, NavigationResult } from '@open-legend/spatial';
import {
  navigationPending,
  nativeRefugeBatch,
  nativeRefugePreparationReady,
  type NativeRefugeBatch,
  type BoundaryExitBatch,
  bodyProfile,
  sameBodyProfile,
  activelyParticipates,
  worldSupport,
  type Entity,
  spatialMap,
  worldRootEntities,
  type WorldState,
} from '@open-legend/domain';
import type { WorldService } from '../world-service.js';
import {
  beginTiming,
  endTiming,
  profilingEnabled,
  recordDuration,
  gaugeMetric,
  countMetric,
  recordBackgroundFailure,
} from '../performance.js';
import { OverloadError } from '../work-lane.js';
import type {
  NavigationMessage,
  NavigationReply,
  PreparedNavigationPublication,
} from './messages.js';
type Task = {
  actorId: string;
  map: WorldState['map'];
  timeline: string;
  queuedAt?: number;
} & (
  | { kind: 'action'; actionId: string; request: NavigationRequest }
  | { kind: 'native-refuge'; batch: NativeRefugeBatch }
  | { kind: 'boundary-exits'; actionId: string; batch: BoundaryExitBatch }
);
const taskIdentity = (task: Task) => (task.kind === 'action' ? task.actionId : task.batch.key);
function boundaryGroups(batch: BoundaryExitBatch) {
  const groups = new Map<WorldState['map'], typeof batch.tasks>();
  for (const task of batch.tasks) {
    let group = groups.get(task.map);
    if (!group) groups.set(task.map, (group = []));
    group.push(task);
  }
  return [...groups].map(([map, tasks]) => ({ map, tasks }));
}

/** This is derived preparation, never route admission. Resolve one actual grounded body only
 * when a geometry/timeline key changes; every real request still supplies its exact body. */
function warmupBodies(world: WorldState): BodyProfile[] {
  const eligible = (entity: Entity | undefined): entity is Entity =>
    !!entity?.actor?.alive &&
    activelyParticipates(entity) &&
    worldSupport(entity) !== null &&
    !entity.spatial.flight &&
    entity.spatial.fallVelocity === undefined;
  const designatedId = world.identity?.controlledEntityId;
  const designated = designatedId ? entityGet(world.entities, designatedId) : undefined;
  const bodies: BodyProfile[] = [];
  const actors = worldRootEntities(world).filter(eligible);
  actors.sort(
    (a, b) =>
      Number(!!b.animal?.episode || !!b.actor?.action) -
      Number(!!a.animal?.episode || !!a.actor?.action),
  );
  for (const entity of [...(eligible(designated) ? [designated] : []), ...actors]) {
    const body = bodyProfile(entity);
    if (!bodies.some((current) => sameBodyProfile(current, body))) bodies.push({ ...body });
    if (bodies.length === 6) break; // Matches the existing planner's resident profile bound.
  }
  return bodies;
}

/** One persistent worker initially; no per-actor WASM worlds and no waits in the mutation lane.
 * Pending actions and animal requests share this bounded queue. Admission always
 * checks the current action/proposal; canceled, edited or restored work cannot consume an old
 * result. Pending gameplay is saved, while workers and caches are disposable.
 */
export class NavigationCoordinator {
  private readonly profiling = profilingEnabled();
  private worker?: Worker;
  private active?: { id: number; tasks: Task[]; key: string; sentAt?: number };
  private timer?: ReturnType<typeof setTimeout>;
  private ageTimer?: ReturnType<typeof setInterval>;
  private scheduled?: ReturnType<typeof setImmediate>;
  private queue: Task[] = [];
  private key = '';
  private map?: WorldState['map'];
  private warmBodies: BodyProfile[] = [];
  private timeline = '';
  private serial = 0;
  private requestId = 0;
  private closed = false;
  private failed = false;
  private retiring?: Promise<number>;
  private completion?: Promise<void>;
  private readonly unsubscribe: () => void;
  constructor(
    private readonly service: WorldService,
    private readonly onPrepared?: () => void,
  ) {
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
    const map = spatialMap(world);
    if (this.map !== map || this.timeline !== timelineId) {
      this.map = map;
      this.warmBodies = warmupBodies(world);
      this.timeline = timelineId;
      this.key = `${world.id}:${timelineId}:${++this.serial}`;
      // Do not make a loaded/replaced world wait for an obsolete heavy build. Termination
      // finishes before another worker is created, keeping the pool bounded to one.
      if (this.active) {
        void this.failedWorker(false);
        return;
      }
    }
    const previous = new Map(this.queue.map((task) => [taskIdentity(task), task]));
    this.queue = [];
    const actors = worldRootEntities(world),
      prepared = this.service.nativeRefugePreparations;
    for (const actor of actors) {
      const batch =
        actor.animal?.episode?.proposal || actor.animal?.foraging?.proposal
          ? nativeRefugeBatch(world, actor)
          : undefined;
      const action = actor.actor?.action;
      const exits = action?.assemblyExitPending
        ? this.service.pendingBoundaryExit(actor.id)
        : undefined;
      let task: Task;
      if (exits?.outcome.code === 'construction-exit-pending' && exits.batch && action)
        task = {
          kind: 'boundary-exits',
          actorId: actor.id,
          actionId: action.id,
          batch: exits.batch,
          map,
          timeline: timelineId,
        };
      else if (batch?.requests.length && !nativeRefugePreparationReady(world, actor, prepared)) {
        task = { kind: 'native-refuge', actorId: actor.id, batch, map, timeline: timelineId };
      } else if (action?.navigation && navigationPending(world, [actor.id], prepared))
        task = {
          kind: 'action',
          actorId: actor.id,
          actionId: action.id,
          request: action.navigation.request,
          map,
          timeline: timelineId,
        };
      else continue;
      const identity = taskIdentity(task);
      if (
        this.active?.tasks.some(
          (active) =>
            taskIdentity(active) === identity &&
            active.map === map &&
            active.timeline === timelineId,
        )
      )
        continue;
      if (this.queue.length >= 64) break;
      const prior = previous.get(identity);
      if (this.profiling) task.queuedAt = prior?.queuedAt ?? performance.now();
      this.queue.push(task);
    }
    gaugeMetric('navigation.queued', this.queue.length);
    this.reportQueueAge();
    this.pump();
  }

  /** Oldest waiting request's age, refreshed while any wait: a cold build or a paused world
   * publishes no reconcile, so an age computed only at queue time would read near zero. */
  private reportQueueAge() {
    if (!this.profiling) return;
    const oldest = this.queue.reduce((min, task) => Math.min(min, task.queuedAt!), Infinity);
    gaugeMetric('navigation.oldestQueuedMs', oldest === Infinity ? 0 : performance.now() - oldest);
    if (oldest === Infinity || this.closed) {
      clearInterval(this.ageTimer);
      this.ageTimer = undefined;
    } else this.ageTimer ??= setInterval(() => this.reportQueueAge(), 250).unref();
  }
  private pump() {
    if (this.active || this.retiring || this.closed || this.service.storageError || !this.map)
      return;
    const task = this.queue.shift();
    // A failed worker does not restart on an idle timer. A newly requested action permits one retry.
    if (!task && this.failed) return;
    if (!task && this.worker && this.preparedKey === this.key && !this.warmBodies.length) return;
    const warmBody = !task ? this.warmBodies.shift() : undefined;
    const id = ++this.requestId;
    const tasks = task ? [task] : [];
    if (task && task.kind !== 'boundary-exits') {
      let routes = task.kind === 'action' ? 1 : task.batch.requests.length;
      // Adjacent requests share geometry and a worker. Keep complete animal comparisons and
      // canonical actor order within the same existing 64-route allowance; never delay idle work.
      while (this.queue.length) {
        const next = this.queue[0]!;
        if (next.kind === 'boundary-exits') break;
        // The planner owns bounded per-body meshes. Different bodies do not need
        // another dispatch/publication round; result order remains actor order.
        const count = next.kind === 'action' ? 1 : next.batch.requests.length;
        if (routes + count > 64) break;
        tasks.push(this.queue.shift()!);
        routes += count;
      }
    }
    if (task) this.reportQueueAge();
    this.active = { id, tasks, key: this.key };
    if (task?.kind === 'boundary-exits' && task.batch.tasks.length > 64) {
      this.completion = this.completed({
        id,
        key: this.key,
        error: 'Navigation batch is too large.',
      });
      return;
    }
    try {
      if (!this.worker) {
        this.failed = false;
        this.worker = new Worker(new URL('./worker.mjs', import.meta.url), {
          execArgv: [],
          env: {},
          workerData: { profiling: this.profiling },
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
        ...(task?.kind !== 'boundary-exits' && this.preparedKey !== this.key
          ? { map: this.map }
          : {}),
        ...(warmBody ? { warmBody } : {}),
        ...(task?.kind === 'boundary-exits'
          ? {
              variants: boundaryGroups(task.batch).map(({ map, tasks }) => ({
                map,
                requests: tasks.map((entry) => entry.request),
              })),
            }
          : task?.kind === 'action' && tasks.length === 1
            ? { request: task.request }
            : task
              ? {
                  requests: tasks.flatMap((entry) =>
                    entry.kind === 'action'
                      ? [entry.request]
                      : entry.kind === 'native-refuge'
                        ? entry.batch.requests.map((route) => route.request)
                        : [],
                  ),
                }
              : {}),
      };
      for (const entry of tasks)
        if (entry.queuedAt !== undefined)
          recordDuration('navigation.queueWait', performance.now() - entry.queuedAt);
      if (tasks.length) countMetric('navigation.preparedTasks', tasks.length);
      this.timer = setTimeout(() => void this.failedWorker(), 20_000);
      // Synchronous structured clone of the map (on a key change) and the request.
      const posting = this.profiling ? performance.now() : undefined;
      this.worker.postMessage(message);
      if (posting !== undefined) {
        this.active.sentAt = performance.now();
        recordDuration('navigation.dispatch', this.active.sentAt - posting);
      }
    } catch {
      // Launch/serialization can fail before an error event. Use the same terminal path
      // instead of throwing from setImmediate or leaving a saved action pending forever.
      void this.failedWorker();
    }
  }

  private preparedKey = '';
  private async completed(reply: NavigationReply, publicationRetry = false) {
    const active = this.active;
    if (this.closed || !active || active.id !== reply.id || active.key !== reply.key) return;
    clearTimeout(this.timer);
    if (!reply.error) {
      // Private alternatives leave no gameplay planner resident in the worker.
      this.preparedKey = active.tasks[0]?.kind === 'boundary-exits' ? '' : reply.key;
      this.failed = false;
    } else this.failed = true;
    // SW06.2a attribution: record each worker reply's work once, and never a placeholder for
    // a failure or a publication retry. Failures keep their own counters.
    if (!publicationRetry && reply.timing) {
      if (reply.timing.warmupFailed) countMetric('navigation.warmupFailure');
      if (reply.timing.startupMs !== undefined)
        recordDuration('navigation.startup', reply.timing.startupMs);
      if (reply.timing.prepareMapMs !== undefined)
        recordDuration('navigation.prepareMap', reply.timing.prepareMapMs);
      for (const build of reply.timing.builds)
        recordDuration(
          build.reason === 'map' ? 'navigation.build' : 'navigation.buildFirstUse',
          build.ms,
        );
      if (active.tasks.length && !reply.error) {
        recordDuration('navigation.query', reply.timing.queryMs);
        if (active.sentAt !== undefined)
          recordDuration('navigation.roundTrip', performance.now() - active.sentAt);
      }
    }
    let deferred = false,
      published = false;
    const publishing = this.profiling ? beginTiming() : undefined;
    try {
      if (active.tasks[0]?.kind === 'boundary-exits') {
        const task = active.tasks[0];
        const ordered = boundaryGroups(task.batch).flatMap((group) => group.tasks);
        await this.service.preparedBoundaryExits(
          task.actorId,
          task.actionId,
          task.batch,
          new Map(
            ordered.map((entry, index) => [
              entry.id,
              {
                request: entry.request,
                result: reply.results?.[index] ?? { status: 'unavailable' as const, path: [] },
              },
            ]),
          ),
          task.timeline,
        );
      } else if (active.tasks.length) {
        let offset = 0;
        const results = reply.results ?? (reply.result ? [reply.result] : []);
        const answers: PreparedNavigationPublication[] = active.tasks.map((task) => {
          if (task.kind === 'action')
            return {
              kind: 'action',
              actorId: task.actorId,
              actionId: task.actionId,
              request: task.request,
              result: results[offset++] ?? { status: 'unavailable', path: [] },
            };
          if (task.kind !== 'native-refuge') throw new Error('Invalid navigation batch.');
          const routes = task.batch.requests.map<NavigationResult>(
            () => results[offset++] ?? { status: 'unavailable', path: [] },
          );
          return {
            kind: 'native-refuge',
            actorId: task.actorId,
            batch: task.batch,
            results: routes,
          };
        });
        await this.service.preparedNavigationBatch(
          answers,
          active.tasks[0]!.map,
          active.tasks[0]!.timeline,
        );
      }
      published = true;
    } catch (error) {
      // Retry only while this reply still owns the coordinator; after a world replacement the
      // action is re-queued, and this.timer already guards the next request.
      if (error instanceof OverloadError && !this.closed && this.active === active) {
        // Queue admission did not execute the mutation. Retain this one computed reply;
        // retrying publication neither reruns navigation nor labels load as storage damage.
        // docs/performance.md#navigation-failure-and-shutdown
        deferred = true;
        countMetric('navigation.publicationDeferred');
        this.timer = setTimeout(() => {
          this.completion = this.completed(reply, true);
        }, 1000);
      } else this.commitFailed();
    } finally {
      if (!deferred) {
        if (active.tasks.length && (reply.result || reply.results || reply.error)) {
          endTiming('navigation.publish', publishing);
          for (const task of active.tasks)
            if (task.queuedAt !== undefined)
              recordDuration('navigation.requestLatency', performance.now() - task.queuedAt);
        }
        if (this.active === active) this.active = undefined;
        this.schedule();
        if (published && !this.closed) this.onPrepared?.();
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
      if (markUnavailable && active?.tasks.length && !this.closed) {
        this.completion = this.completed({
          id: active.id,
          key: active.key,
          result: { status: 'unavailable', path: [] },
          error: 'Navigation worker failed.',
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
    clearInterval(this.ageTimer);
    const worker = this.worker;
    this.worker = undefined;
    // Retirement and reply publication can already be underway when the host closes.
    // Drain them before the application's store is closed; never publish after disposal.
    await Promise.all([worker?.terminate(), this.retiring, this.completion]);
    this.active = undefined;
    this.queue = [];
  }
}
