import { open, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { finalizeMilliseconds, repository, traceByteLimit } from './paths.mjs';

const require = createRequire(repository + '/package.json');
const { test } = require('@playwright/test');

// Import the existing journey itself: every original action, assertion, native
// tick, screenshot and database-cleanup hook remains in that unchanged module.
await import(pathToFileURL(repository + '/tests/browser/time.spec.ts').href);

const requestedCategories = [
  'devtools.timeline',
  'v8',
  'blink.user_timing',
  'gpu',
  'toplevel',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-v8.cpu_profiler',
];
let session;
let traceCompletion;
let traceStarted = false;
let stream;
let file;
let diagnostics;

function until(promise, deadline, operation) {
  const remaining = deadline - performance.now();
  if (remaining <= 0) {
    Promise.resolve(promise).catch(() => {});
    return Promise.reject(new Error(operation + ' exceeded the observation deadline.'));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(operation + ' exceeded the observation deadline.')),
      remaining,
    );
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

test.beforeEach('Observe browser work without changing the Time journey', async ({ browser }) => {
  const started = performance.now();
  const setupDeadline = started + 10_000;
  diagnostics = {
    setupStartedUtc: new Date().toISOString(),
    setupStartedMonotonicMs: started,
    observer: 'Browser CDP tracing; no application instrumentation',
    requestedCategories,
    bufferUsage: [],
    bufferUsageRecordsDropped: 0,
    traceByteLimit,
    finalizationLimitMs: finalizeMilliseconds,
    samplingCadence: 'Browser-selected; not set by this observer',
    errors: [],
  };
  session = await until(browser.newBrowserCDPSession(), setupDeadline, 'CDP attachment');
  diagnostics.browser = await until(
    session.send('Browser.getVersion'),
    setupDeadline,
    'Browser version',
  );
  const available = await until(
    session.send('Tracing.getCategories'),
    setupDeadline,
    'Trace category discovery',
  );
  const categories = requestedCategories.filter((name) => available.categories.includes(name));
  diagnostics.selectedCategories = categories;
  diagnostics.unavailableCategories = requestedCategories.filter(
    (name) => !categories.includes(name),
  );
  if (!categories.includes('devtools.timeline'))
    throw new Error('Browser timeline observation is unavailable; the journey was not run.');
  const system = await until(
    session.send('SystemInfo.getInfo'),
    setupDeadline,
    'Graphics identity',
  );
  diagnostics.graphics = {
    devices: system.gpu.devices,
    auxiliary: system.gpu.auxAttributes,
    featureStatus: system.gpu.featureStatus,
  };
  session.on('Tracing.bufferUsage', (usage) => {
    if (diagnostics.bufferUsage.length < 180)
      diagnostics.bufferUsage.push({ atMs: performance.now(), ...usage });
    else diagnostics.bufferUsageRecordsDropped++;
  });
  traceCompletion = new Promise((resolve) => session.once('Tracing.tracingComplete', resolve));
  await until(
    session.send('Tracing.start', {
      transferMode: 'ReturnAsStream',
      streamFormat: 'json',
      streamCompression: 'gzip',
      bufferUsageReportingInterval: 1000,
      traceConfig: {
        recordMode: 'recordUntilFull',
        traceBufferSizeInKb: traceByteLimit / 1024,
        enableSampling: true,
        enableSystrace: false,
        includedCategories: categories,
      },
    }),
    setupDeadline,
    'Trace start',
  );
  traceStarted = true;
  await until(
    session.send('Tracing.recordClockSyncMarker', { syncId: 'openlegend-time-profile-start' }),
    setupDeadline,
    'Trace clock marker',
  );
  diagnostics.setupFinishedMonotonicMs = performance.now();
  diagnostics.setupDurationMs = diagnostics.setupFinishedMonotonicMs - started;
});

test.afterEach('Save bounded browser attribution evidence', async ({}, info) => {
  if (!diagnostics) return;
  const started = performance.now();
  // Reserve two seconds within the total bound for stream/session cleanup.
  const captureDeadline = started + finalizeMilliseconds - 2_000;
  const cleanupDeadline = started + finalizeMilliseconds;
  diagnostics.statusAtAfterEach = info.status;
  diagnostics.testErrorsAtAfterEach = info.errors.map((error) => error.message);
  diagnostics.traceBytesWritten = 0;
  diagnostics.traceComplete = false;
  try {
    if (session && traceStarted) {
      await until(session.send('Tracing.end'), captureDeadline, 'Trace end');
      const completed = await until(traceCompletion, captureDeadline, 'Trace completion');
      diagnostics.dataLossOccurred = completed.dataLossOccurred;
      stream = completed.stream;
      if (!stream) throw new Error('The browser did not provide a trace stream.');
      file = await open(info.outputPath('browser-profile.json.gz'), 'wx');
      while (performance.now() < captureDeadline) {
        const chunk = await until(
          session.send('IO.read', { handle: stream, size: 1024 * 1024 }),
          captureDeadline,
          'Trace stream read',
        );
        const bytes = Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8');
        if (diagnostics.traceBytesWritten + bytes.length > traceByteLimit)
          throw new Error(
            'Compressed trace output reached its 64 MiB limit; output is incomplete.',
          );
        await until(file.writeFile(bytes), captureDeadline, 'Trace file write');
        diagnostics.traceBytesWritten += bytes.length;
        if (chunk.eof) {
          diagnostics.traceComplete = true;
          break;
        }
      }
      if (!diagnostics.traceComplete) throw new Error('Trace finalization deadline reached.');
    }
  } catch (error) {
    diagnostics.errors.push({ stage: 'trace finalization', message: String(error) });
  } finally {
    if (file) {
      try {
        await until(file.close(), cleanupDeadline, 'Trace file close');
        diagnostics.traceFileClosed = true;
      } catch (error) {
        diagnostics.errors.push({ stage: 'file cleanup', message: String(error) });
      }
    }
    if (session) {
      if (stream) {
        try {
          await until(
            session.send('IO.close', { handle: stream }),
            cleanupDeadline,
            'Stream close',
          );
          diagnostics.traceStreamClosed = true;
        } catch (error) {
          diagnostics.errors.push({ stage: 'stream cleanup', message: String(error) });
        }
      }
      try {
        await until(session.detach(), cleanupDeadline, 'CDP detach');
        diagnostics.sessionDetached = true;
      } catch (error) {
        diagnostics.errors.push({ stage: 'CDP cleanup', message: String(error) });
      }
    }
    diagnostics.finalizationDurationMs = performance.now() - started;
    diagnostics.finishedUtc = new Date().toISOString();
    await writeFile(
      info.outputPath('browser-observation.json'),
      JSON.stringify(diagnostics, null, 2) + '\n',
      { flag: 'wx' },
    );
  }
});
