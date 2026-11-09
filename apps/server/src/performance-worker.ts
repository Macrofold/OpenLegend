import { Session } from 'node:inspector';
import { threadId, type MessagePort } from 'node:worker_threads';
import { startPerformanceCapture, type WorkerPerformanceConfiguration } from './performance.js';
import type { CampaignDrainResult } from './performance-campaign.js';
import { assertProfileJsonBudget } from './performance-json.js';

/** Trusted worker bootstrap extension. Each isolate uses the ordinary capture
 * owner and local clocks. Results leave only on the parent's final export. */
export async function startWorkerPerformance(
  configuration: WorkerPerformanceConfiguration,
  port: MessagePort,
): Promise<void> {
  const beforeUnixMs = Date.now(),
    monoMs = performance.now(),
    afterUnixMs = Date.now();
  const parent = configuration.parentClock;
  const lowerOffsetMs = parent.beforeUnixMs - parent.monoMs - (afterUnixMs + 1 - monoMs);
  const upperOffsetMs = parent.afterUnixMs + 1 - parent.monoMs - (beforeUnixMs - monoMs);
  const shift = (lowerOffsetMs + upperOffsetMs) / 2;
  const convertWindow = (window: NonNullable<typeof configuration.campaign.window>) => ({
    startMs: window.startMs + shift,
    endMs: window.endMs + shift,
    drainUntilMs: window.drainUntilMs + shift,
  });
  const failures: string[] = [];
  let omittedFailures = 0;
  const fail = (reason: string) => {
    if (failures.length < 16) failures.push(reason);
    else omittedFailures++;
  };
  let measurementWindow = configuration.campaign.window
    ? convertWindow(configuration.campaign.window)
    : undefined;
  const capture = startPerformanceCapture({
    runtimeMonitoring: false,
    campaign: {
      ...configuration.campaign,
      isolate: `${configuration.campaign.isolate ?? 'worker'}:${threadId}`,
      window: measurementWindow,
    },
  });
  let session: Session | undefined;
  let instrument: 'cpu' | 'allocation' | undefined;
  const call = (method: string, params: object = {}): Promise<unknown> =>
    new Promise((resolve, reject) => {
      session!.post(method, params, (error, result) => (error ? reject(error) : resolve(result)));
    });
  const choice = configuration.instruments;
  try {
    if (choice?.cpu && choice.allocation) throw new Error('Select one worker sampling instrument.');
    if (choice?.cpu || choice?.allocation) {
      session = new Session();
      session.connect();
      if (choice.cpu) {
        const interval = choice.cpuIntervalUs ?? 1000;
        if (!Number.isSafeInteger(interval) || interval < 100 || interval > 1_000_000)
          throw new Error('Invalid worker CPU sampling interval.');
        await call('Profiler.enable');
        await call('Profiler.setSamplingInterval', { interval });
        instrument = 'cpu';
      } else {
        const samplingInterval = choice.allocationIntervalBytes ?? 32768;
        if (!Number.isSafeInteger(samplingInterval) || samplingInterval < 1024)
          throw new Error('Invalid worker allocation interval.');
        await call('HeapProfiler.enable');
        instrument = 'allocation';
      }
    }
  } catch {
    fail('Worker sampling instrument could not start.');
    session?.disconnect();
    session = undefined;
  }
  const resources: Array<{
    boundary: 'start' | 'end';
    requestedAtMs: number;
    observedAtMs: number;
    threadCpu: { user: number; system: number } | null;
    memory: ReturnType<typeof process.memoryUsage>;
  }> = [];
  let profile: unknown = null;
  let startSampling: Promise<void> | undefined;
  let stopSampling: Promise<void> | undefined;
  const samplingBoundaries: Array<{
    boundary: 'start' | 'end';
    requestedAtMs: number;
    invokedAtMs: number;
    settledAtMs: number;
  }> = [];
  const startSampler = (requestedAtMs: number): Promise<void> => {
    if (startSampling) return startSampling;
    startSampling = (async () => {
      if (!session || !instrument) return;
      const invokedAtMs = performance.now();
      try {
        await call(
          instrument === 'cpu' ? 'Profiler.start' : 'HeapProfiler.startSampling',
          instrument === 'allocation'
            ? { samplingInterval: choice?.allocationIntervalBytes ?? 32768 }
            : {},
        );
        samplingBoundaries.push({
          boundary: 'start',
          requestedAtMs,
          invokedAtMs,
          settledAtMs: performance.now(),
        });
      } catch {
        fail('Worker sampler did not start at its measurement boundary.');
      }
    })();
    return startSampling;
  };
  const stopSampler = (requestedAtMs: number): Promise<void> => {
    if (stopSampling) return stopSampling;
    stopSampling = (async () => {
      if (!session || !instrument) return;
      if (!startSampling) {
        fail('Worker sampling window did not start.');
        return;
      }
      await startSampling;
      const invokedAtMs = performance.now();
      try {
        profile = await call(instrument === 'cpu' ? 'Profiler.stop' : 'HeapProfiler.stopSampling');
        samplingBoundaries.push({
          boundary: 'end',
          requestedAtMs,
          invokedAtMs,
          settledAtMs: performance.now(),
        });
      } catch {
        fail('Worker sampling results could not be collected.');
      }
    })();
    return stopSampling;
  };
  let exported = false,
    stopped = false;
  let releasePhaseEdgeWait: (() => void) | undefined;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const onExit = () => {
    stopped = true;
    exported = true;
    releasePhaseEdgeWait?.();
    releasePhaseEdgeWait = undefined;
    for (const timer of timers.splice(0)) clearTimeout(timer);
    port.off('message', listener);
    process.off('exit', onExit);
    try {
      session?.disconnect();
    } catch {
      fail('Worker sampling instrument could not disconnect.');
    } finally {
      session = undefined;
      capture.stop();
    }
  };
  const sample = (boundary: 'start' | 'end', requestedAtMs: number) => {
    const cpu = (process as unknown as { threadCpuUsage?: () => { user: number; system: number } })
      .threadCpuUsage;
    resources.push({
      boundary,
      requestedAtMs,
      observedAtMs: performance.now(),
      threadCpu: cpu ? cpu.call(process) : null,
      memory: process.memoryUsage(),
    });
  };
  const schedule = (window: NonNullable<typeof configuration.campaign.window>) => {
    for (const timer of timers.splice(0)) clearTimeout(timer);
    for (const boundary of ['start', 'end'] as const) {
      const at = boundary === 'start' ? window.startMs : window.endMs;
      if (!Number.isFinite(at)) continue;
      const timer = setTimeout(
        () => {
          sample(boundary, at);
          void (boundary === 'start' ? startSampler(at) : stopSampler(at));
        },
        Math.max(0, at - performance.now()),
      );
      timer.unref();
      timers.push(timer);
    }
  };
  if (measurementWindow) schedule(measurementWindow);
  const listener = async (message: {
    type?: string;
    captureId?: string;
    window?: NonNullable<typeof configuration.campaign.window>;
    endMs?: number;
    drainUntilMs?: number;
  }) => {
    if (message.captureId !== configuration.captureId || stopped) return;
    if (message.type === 'profiling-stop') {
      onExit();
      return;
    }
    if (exported) return;
    if (message.type === 'profiling-window' && message.window) {
      try {
        const window = convertWindow(message.window);
        capture.setWindow(window);
        measurementWindow = window;
        schedule(window);
      } catch {
        fail('Worker measurement window could not be established.');
      }
      return;
    }
    if (
      message.type === 'profiling-cutoff' &&
      message.endMs !== undefined &&
      message.drainUntilMs !== undefined
    ) {
      capture.cutoff(message.endMs + shift, message.drainUntilMs + shift);
      if (measurementWindow)
        measurementWindow = {
          ...measurementWindow,
          endMs: message.endMs + shift,
          drainUntilMs: message.drainUntilMs + shift,
        };
      sample('end', message.endMs + shift);
      await stopSampler(message.endMs + shift);
      return;
    }
    if (message.type !== 'profiling-export') return;
    exported = true;
    let drain: CampaignDrainResult | undefined;
    if (message.drainUntilMs !== undefined) {
      try {
        // The bracketed clock mapping can put this isolate's cutoff slightly
        // after the parent's. Wait only for that phase edge before its one census.
        const endMs = measurementWindow?.endMs;
        if (endMs !== undefined && endMs > performance.now())
          await new Promise<void>((resolve) => {
            const timer = setTimeout(
              () => {
                releasePhaseEdgeWait = undefined;
                resolve();
              },
              Math.ceil(endMs - performance.now()),
            );
            timer.unref();
            releasePhaseEdgeWait = () => {
              clearTimeout(timer);
              resolve();
            };
          });
        if (stopped) return;
        drain = await capture.drain(message.drainUntilMs + shift);
      } catch {
        fail('Worker measurements could not drain through their admitted deadline.');
      }
    }
    if (stopped) return;
    try {
      await stopSampler(performance.now());
    } catch {
      fail('Worker sampling results could not be collected.');
    } finally {
      try {
        session?.disconnect();
      } catch {
        fail('Worker sampling instrument could not disconnect.');
      }
      session = undefined;
    }
    if (stopped) return;
    // Admit the existing Inspector value before any IPC copy, without first
    // constructing a potentially oversized JSON string just to measure it.
    if (profile) {
      try {
        assertProfileJsonBudget(profile);
      } catch {
        fail('Worker sampling result exceeds the admitted export allowance or JSON shape.');
        profile = null;
      }
    }
    const metrics = capture.snapshot();
    const stop = capture.stop();
    onExit();
    port.postMessage({
      type: 'profiling-export',
      captureId: configuration.captureId,
      report: {
        metrics,
        stop,
        drain: drain ?? null,
        profile,
        threadId,
        instrument: instrument ?? null,
        failures,
        resources,
        samplingBoundaries,
        omittedFailures,
        clockMapping: {
          lowerOffsetMs,
          upperOffsetMs,
          uncertaintyMs: (upperOffsetMs - lowerOffsetMs) / 2,
          method: 'Bracketed wall-clock mapping; durations use only this isolate monotonic clock.',
          parentOrigin: parent,
          workerOrigin: { beforeUnixMs, monoMs, afterUnixMs },
        },
        resourceNotes: {
          threadCpu: 'This isolate thread only.',
          rss: 'Shared Node process RSS; do not sum worker RSS with process RSS.',
        },
      },
    });
  };
  port.on('message', listener);
  process.once('exit', onExit);
}
