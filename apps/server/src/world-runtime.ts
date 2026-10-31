import type { AiClient } from '@open-legend/ai';
import type { AssetRevisionReference } from '@open-legend/assets';
import { AiDirector } from './ai-director.js';
import { Autosaves } from './autosaves.js';
import { CognitionExecution } from './cognition-execution.js';
import type { CognitionRuntimeControl } from './cognition-runtime-control.js';
import type { AppConfig } from './config.js';
import type { CreationActivationReceipt } from './creation-target-contracts.js';
import { NavigationCoordinator } from './navigation/coordinator.js';
import {
  countMetric,
  profilingEnabled,
  recordBackgroundFailure,
  recordDuration,
  timed,
} from './performance.js';
import type { GameRepository } from './store.js';
import { WorldService } from './world-service.js';
import { OverloadError } from './work-lane.js';
import type { RequestScope } from './authority.js';

export interface WorldRuntimeOptions {
  store: GameRepository;
  config: AppConfig;
  now?: () => number;
  aiClient?: AiClient;
  execution?: CognitionExecution;
  labControl?: CognitionRuntimeControl;
  presentationRelease?: AssetRevisionReference;
  createdActivation?: CreationActivationReceipt;
  runtimeAuthority?: (scope: RequestScope) => boolean;
  initialWorldId?: string;
  automaticAutosaves?: boolean;
}

/** The same elapsed-time driver serves game and lab. Holds drop elapsed debt without
 * invoking native pause/cancellation; provider work never owns the native tick lane.
 */
export class WorldClock {
  private previous = performance.now();
  private previousCallback = this.previous;
  private suspendedSeconds = 0;
  private interval?: ReturnType<typeof setInterval>;
  private continuation?: ReturnType<typeof setImmediate>;
  private active?: Promise<void>;
  private thinking?: Promise<void>;
  private stopped = false;
  private blocked = false;
  private finiteOffer = false;
  private offerEpoch = 0;
  private readonly boundaryHolds = new Set<symbol>();
  private readonly boundaryWaiters = new Set<() => void>();
  private get heldAtBoundary(): boolean {
    return this.blocked || this.boundaryHolds.size > 0 || !!this.control?.processing;
  }
  private readonly unsubscribe?: () => void;

  constructor(
    private readonly service: WorldService,
    private readonly director: () => AiDirector,
    private readonly autosaves: Autosaves,
    private readonly control?: CognitionRuntimeControl,
    private readonly automaticAutosaves = true,
  ) {
    this.unsubscribe = control?.subscribe(() => {
      this.offerEpoch++;
      this.previous = performance.now();
      this.previousCallback = this.previous;
      this.suspendedSeconds = 0;
      this.signalBoundary();
      if (!control.held) this.wake();
    });
  }
  setBlocked(blocked: boolean): void {
    this.offerEpoch++;
    this.blocked = blocked;
    this.previous = performance.now();
    this.suspendedSeconds = 0;
    this.signalBoundary();
  }
  /** A scoped lab inspection/capture boundary drops only this runtime's elapsed
   * offers. Native time arithmetic and other runtimes are unchanged. */
  holdBoundary(): () => void {
    this.offerEpoch++;
    const token = Symbol();
    this.boundaryHolds.add(token);
    this.previous = this.previousCallback = performance.now();
    this.suspendedSeconds = 0;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.offerEpoch++;
      this.boundaryHolds.delete(token);
      this.previous = this.previousCallback = performance.now();
      this.suspendedSeconds = 0;
      this.signalBoundary();
      if (!this.heldAtBoundary) this.wake();
    };
  }
  start(): void {
    if (this.interval || this.stopped) return;
    this.service.useMonotonicClock();
    this.previous = this.previousCallback = performance.now();
    this.interval = setInterval(() => {
      const current = performance.now();
      const gap = (current - this.previousCallback) / 1000;
      this.previousCallback = current;
      if (this.finiteOffer || this.control?.held || this.heldAtBoundary) {
        this.previous = current;
        this.suspendedSeconds = 0;
        return;
      }
      if (gap > 2) this.suspendedSeconds += gap;
      if (profilingEnabled()) recordDuration('timer.lateness', Math.max(0, gap * 1000 - 50));
      if (this.active) {
        countMetric('timer.skippedWhileBusy');
        return;
      }
      this.wake();
    }, 50);
  }
  /** Navigation completion releases a physical wait. Reuse the clock's one
   * continuation without reentering the native publication that delivered it. */
  requestWake(): void {
    if (
      !this.interval ||
      this.stopped ||
      this.finiteOffer ||
      this.heldAtBoundary ||
      this.control?.held ||
      this.continuation
    )
      return;
    this.continuation = setImmediate(() => {
      this.continuation = undefined;
      this.wake();
    });
  }
  wake(): void {
    if (
      !this.interval ||
      this.stopped ||
      this.finiteOffer ||
      this.heldAtBoundary ||
      this.control?.held ||
      this.active
    )
      return;
    if (this.continuation) clearImmediate(this.continuation);
    this.continuation = undefined;
    const current = performance.now();
    const elapsed = (current - Math.max(this.previous, this.service.clockStartedAt)) / 1000;
    this.previous = current;
    const excluded = this.suspendedSeconds;
    const offerEpoch = this.offerEpoch;
    this.suspendedSeconds = 0;
    let more = false;
    this.active = (async () => {
      more = await timed('tick.wall', () =>
        this.service.tick(elapsed, excluded, {
          drain: false,
          offeredUntil: current,
          ...(this.control
            ? {
                offerCurrent: () =>
                  offerEpoch === this.offerEpoch && !this.control!.held && !this.heldAtBoundary,
              }
            : {}),
        }),
      );
      const admitted = Math.min(
        elapsed,
        Math.max(0, (current - this.service.clockStartedAt) / 1000),
      );
      if (this.automaticAutosaves) this.autosaves.advance(Math.max(0, admitted - excluded));
      this.consider();
    })()
      .catch((error: unknown) => {
        if (error instanceof OverloadError) return;
        recordBackgroundFailure('simulation-tick', error);
        this.service.storageError =
          'Automatic simulation failed; simulation paused. Restart after resolving the recorded failure.';
        this.service.notify();
      })
      .finally(() => {
        this.active = undefined;
        if (more) this.requestWake();
      });
  }
  private consider(): void {
    if (this.thinking || this.finiteOffer || this.control?.held || this.stopped) return;
    this.thinking = this.director()
      .considerThought()
      .catch((error: unknown) => {
        if (error instanceof OverloadError) return;
        recordBackgroundFailure('decision-admission', error);
        this.service.storageError =
          'Character decision admission failed; simulation paused. Restart after resolving the recorded failure.';
        this.service.notify();
      })
      .finally(() => {
        this.thinking = undefined;
      });
  }
  /** Own an explicit offer before opening its admission. Automatic elapsed work
   * cannot race its resume, but native processing/capture and operator holds still apply. */
  async withFiniteOffer<T>(offer: () => Promise<T>): Promise<T> {
    if (this.finiteOffer) throw new Error('An explicit simulation-time offer is already active.');
    this.finiteOffer = true;
    this.offerEpoch++;
    try {
      await this.active;
      if (this.thinking) throw new Error('The runtime clock is held.');
      return await offer();
    } finally {
      this.finiteOffer = false;
      this.offerEpoch++;
      this.previous = this.previousCallback = performance.now();
      this.suspendedSeconds = 0;
    }
  }
  private signalBoundary(): void {
    for (const resolve of this.boundaryWaiters) resolve();
    this.boundaryWaiters.clear();
  }
  private async waitBoundary(signal?: AbortSignal): Promise<void> {
    while (this.heldAtBoundary) {
      signal?.throwIfAborted();
      if (this.stopped || this.blocked || this.control?.held)
        throw new Error('The runtime clock is held.');
      await new Promise<void>((resolve, reject) => {
        const changed = () => {
          signal?.removeEventListener('abort', aborted);
          resolve();
        };
        const aborted = () => {
          this.boundaryWaiters.delete(changed);
          reject(signal!.reason);
        };
        this.boundaryWaiters.add(changed);
        signal?.addEventListener('abort', aborted, { once: true });
        if (signal?.aborted) aborted();
      });
    }
  }
  /** One finite intent may cross internal processing/capture pauses. Only actual
   * native progress reduces its remaining duration; operator holds end the intent. */
  async advance(
    seconds: number,
    cognition = true,
    options: { settleProcessing?(): Promise<void>; signal?: AbortSignal } = {},
  ): Promise<void> {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new Error('Elapsed time must be finite and nonnegative.');
    await this.active;
    const startedSim = this.service.world.simTime;
    let remaining = seconds;
    while (remaining > 1e-6) {
      options.signal?.throwIfAborted();
      if (this.stopped || this.blocked || this.control?.held)
        throw new Error('The runtime clock is held.');
      await options.settleProcessing?.();
      await this.waitBoundary(options.signal);
      options.signal?.throwIfAborted();
      if (this.stopped || this.blocked || this.control?.held)
        throw new Error('The runtime clock is held.');
      const offerEpoch = this.offerEpoch;
      const current = () =>
        offerEpoch === this.offerEpoch &&
        !this.stopped &&
        !this.heldAtBoundary &&
        !this.control?.held &&
        !options.signal?.aborted;
      const before = this.service.world.simTime;
      await this.service.tick(remaining / (this.service.config.baseRatio * this.service.speed), 0, {
        ...(this.control ? { offerCurrent: current } : {}),
      });
      remaining = seconds - (this.service.world.simTime - startedSim);
      if (remaining <= 1e-6) break;
      // A changed processing/capture boundary owns the next wake. A native pause
      // or a zero-progress offer with no such transition cannot be retried.
      if (current() && this.service.world.simTime === before)
        throw new Error('Simulation stopped before the requested duration elapsed.');
    }
    if (cognition && !options.signal?.aborted && !this.stopped && !this.control?.held)
      await this.director().considerThought();
    this.previous = performance.now();
  }
  async idle(): Promise<void> {
    await this.active;
    await this.thinking;
  }
  stop(): void {
    this.stopped = true;
    this.signalBoundary();
    if (this.interval) clearInterval(this.interval);
    if (this.continuation) clearImmediate(this.continuation);
    this.interval = undefined;
    this.continuation = undefined;
    this.unsubscribe?.();
  }
}

/** Runtime composition only. HTTP, login, asset delivery and World Agent stay host-owned. */
export async function createWorldRuntime(options: WorldRuntimeOptions) {
  const service = new WorldService(options.store, options.config, options.now, {
    createdActivation: options.createdActivation,
    presentationRelease: options.presentationRelease,
    cognitionControl: options.labControl,
    runtimeAuthority: options.runtimeAuthority,
    initialWorldId: options.initialWorldId,
    ...(options.labControl ? { runtimeLiveness: () => true, runtimeParticipants: true } : {}),
  });
  const autosaves = new Autosaves(service);
  let execution: CognitionExecution | undefined;
  let director: AiDirector | undefined;
  let navigation: NavigationCoordinator | undefined;
  let clock: WorldClock | undefined;
  const closeOwners = async () => {
    const failures: unknown[] = [];
    const closeOwner = async (work: () => unknown) => {
      try {
        await work();
      } catch (error) {
        failures.push(error);
      }
    };
    await closeOwner(() => clock?.stop());
    await closeOwner(() => options.labControl?.close());
    await closeOwner(() => clock?.idle());
    await closeOwner(() => director?.close());
    await closeOwner(() => navigation?.close());
    await closeOwner(() => autosaves.close());
    await closeOwner(() => service.releaseHostWork());
    if (execution !== options.execution) await closeOwner(() => execution?.close());
    if (failures.length) throw failures[0];
  };
  try {
    await service.ready;
    // Renderer-free participation changes absence, not the saved manual-pause intent.
    // Materialize that ordinary pause calculation before the first source is admitted.
    if (options.labControl) await service.control({});
    await autosaves.initialize();
    execution = options.execution
      ? options.execution.register(options.store, options.labControl)
      : new CognitionExecution(options.store, options.now, undefined, options.labControl);
    await execution.ready;
    const makeDirector = () =>
      new AiDirector(service, options.aiClient, options.now, undefined, execution);
    director = makeDirector();
    clock = new WorldClock(
      service,
      () => director!,
      autosaves,
      options.labControl,
      options.automaticAutosaves,
    );
    navigation = new NavigationCoordinator(service, () => clock!.requestWake());
    let closing: Promise<void> | undefined;
    return {
      service,
      autosaves,
      execution,
      navigation,
      clock,
      get director() {
        return director!;
      },
      async replaceDirector() {
        await director!.close();
        director = makeDirector();
        return director;
      },
      close() {
        return (closing ??= closeOwners());
      },
    };
  } catch (error) {
    await closeOwners().catch(() => undefined);
    throw error;
  }
}
export type WorldRuntime = Awaited<ReturnType<typeof createWorldRuntime>>;
