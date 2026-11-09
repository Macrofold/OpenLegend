// Geometry workers receive only physical queries, without provider credentials.
const { register } = await import('tsx/esm/api');
register();
const { workerData, parentPort } = await import('node:worker_threads');
if (workerData?.measurement) {
  try {
    const { startWorkerPerformance } = await import('./performance-worker.ts');
    await startWorkerPerformance(workerData.measurement, parentPort);
  } catch {
    parentPort.on('message', (message) => {
      if (message.type === 'profiling-export')
        parentPort.postMessage({
          type: 'profiling-export',
          captureId: message.captureId,
          report: { status: 'failed', reason: 'Geometry measurement bootstrap failed.' },
        });
    });
  }
}
await import('./geometry-worker.ts');
