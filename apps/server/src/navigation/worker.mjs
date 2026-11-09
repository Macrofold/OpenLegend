// The server runs TypeScript through tsx too; do not inherit provider keys or parent loader flags.
// Startup attribution begins before the loader and runtimes (worker.ts reports it once); static
// imports would run before this statement, so the loader is imported dynamically.
const { workerData, parentPort } = await import('node:worker_threads');
if (workerData.profiling) globalThis.navigationWorkerStartedAt = performance.now();
const { register } = await import('tsx/esm/api');
register();
if (workerData.measurement) {
  try {
    const { startWorkerPerformance } = await import('../performance-worker.ts');
    await startWorkerPerformance(workerData.measurement, parentPort);
  } catch {
    parentPort.on('message', (message) => {
      if (message.type === 'profiling-export')
        parentPort.postMessage({
          type: 'profiling-export',
          captureId: message.captureId,
          report: { status: 'failed', reason: 'Navigation measurement bootstrap failed.' },
        });
    });
  }
}
await import('./worker.ts');
