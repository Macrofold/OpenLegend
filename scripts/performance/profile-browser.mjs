import { chromium, expect } from '@playwright/test';
import { open, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const [readyPath, outputPath, durationArg = '30', ...flags] = process.argv.slice(2);
const seconds = Number(durationArg);
const runnerSourceSha256 = createHash('sha256')
  .update(await readFile(new URL(import.meta.url)))
  .digest('hex');
if (!readyPath || !outputPath || !Number.isInteger(seconds) || seconds < 5 || seconds > 1800)
  throw new Error(
    'Usage: node scripts/performance/profile-browser.mjs READY.json NEW_REPORT.json [5–1800 SECONDS] [--app-profiling=on|off] [--cpu-profile] [--trace] [--blur-off] [--selection-sweep] [--survival] [--near-start] [--wait-for-resume]',
  );
if (
  flags.some(
    (flag) =>
      !/^--app-profiling=(on|off)$/.test(flag) &&
      ![
        '--cpu-profile',
        '--trace',
        '--blur-off',
        '--selection-sweep',
        '--survival',
        '--near-start',
        '--wait-for-resume',
      ].includes(flag),
  )
)
  throw new Error('Unknown browser profiling option.');
const appProfilingFlags = flags.filter((flag) => flag.startsWith('--app-profiling='));
if (appProfilingFlags.length > 1) throw new Error('Specify --app-profiling only once.');
const appProfiling = appProfilingFlags[0]?.slice('--app-profiling='.length) ?? 'on';
const sceneProfiling = appProfiling === 'on';
if (
  !sceneProfiling &&
  flags.some((flag) =>
    ['--cpu-profile', '--trace', '--survival', '--near-start', '--wait-for-resume'].includes(flag),
  )
)
  throw new Error(
    'Profiling off supports the fixed-input workload without CPU sampling or traces.',
  );
try {
  await stat(outputPath);
  throw new Error('The report path must be new.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const ready = JSON.parse(await readFile(readyPath, 'utf8'));
const target = new URL(ready.url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
  target.protocol !== 'http:' ||
  ready.databaseAdapter !== 'postgres' ||
  !ready.startMarkerPath
)
  throw new Error('Use the owned disposable PostgreSQL fixture manifest from profile-server.ts.');
if (sceneProfiling) target.searchParams.set('profile', '1');
else target.searchParams.delete('profile');
const cpuProfile = flags.includes('--cpu-profile');
if (cpuProfile && seconds > 60) throw new Error('CPU sampling is limited to 60 seconds.');
const trace = flags.includes('--trace');
if (trace && seconds > 60) throw new Error('Detailed browser traces are limited to 60 seconds.');
const blurOff = flags.includes('--blur-off');
const selectionSweep = flags.includes('--selection-sweep');
const survival = flags.includes('--survival');
const nearStart = flags.includes('--near-start');
const waitForResume = flags.includes('--wait-for-resume');
if ((nearStart || waitForResume) && !survival)
  throw new Error('Near-start and wait-for-resume diagnostics require --survival.');
if (
  survival &&
  (!ready.playerSurvival ||
    !Number.isFinite(ready.longSoak?.nutrition) ||
    ready.longSoak.nutrition <= 0 ||
    ['foodAttributeId', 'energyAttributeId', 'sleepEffectId', 'foodDefinitionId'].some(
      (key) => typeof ready.playerSurvival[key] !== 'string',
    ))
)
  throw new Error('Survival input requires the owned finite-stock long-soak fixture.');
const errors = [];
const failedRequests = [];
const consoleMessages = [];
const captureLimits = {
  messages: 1000,
  text: 2000,
  traceBytes: 64 * 1024 ** 2,
  cpuBytes: 16 * 1024 ** 2,
};
const diagnostics = { errors, failedRequests, consoleMessages };
const diagnosticCounts = { errors: 0, failedRequests: 0, consoleMessages: 0 };
function recordDiagnostic(name, value) {
  diagnosticCounts[name]++;
  const rows = diagnostics[name];
  if (rows.length >= captureLimits.messages) return false;
  rows.push(value);
  return true;
}
const recordError = (error) =>
  recordDiagnostic('errors', String(error).slice(0, captureLimits.text));
const diagnosticOmissions = () =>
  Object.fromEntries(
    Object.entries(diagnosticCounts).map(([name, count]) => [
      name,
      count - diagnostics[name].length,
    ]),
  );
const sse = [];
let sseCount = 0;
let sseBytes = 0;
let accessChangedEvents = 0;
let browser;
let page;
let cdp;
let cpuRunning = false;
let traceRunning = false;
let cpuTimer;
let traceTimer;
let cpuStopPromise;
let traceStopPromise;
const cpuCollection = {
  startRequestedAtUnixMs: null,
  startAcknowledgedAtUnixMs: null,
  stopRequestedAtUnixMs: null,
  stopAcknowledgedAtUnixMs: null,
};
const traceCollection = {
  startRequestedAtUnixMs: null,
  startAcknowledgedAtUnixMs: null,
  stopRequestedAtUnixMs: null,
  stopAcknowledgedAtUnixMs: null,
  streamComplete: false,
  dataLossOccurred: null,
  bytes: 0,
};
let report;
let intentionHeaders = {};
function saveTrace() {
  if (traceStopPromise) return traceStopPromise;
  if (!traceRunning) return Promise.resolve();
  traceRunning = false;
  traceCollection.stopRequestedAtUnixMs = Date.now();
  clearTimeout(traceTimer);
  traceStopPromise = (async () => {
    const completed = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.end');
    const { stream, dataLossOccurred } = await completed;
    traceCollection.stopAcknowledgedAtUnixMs = Date.now();
    traceCollection.dataLossOccurred = dataLossOccurred ?? null;
    let destination;
    try {
      destination = await open(`${outputPath}.trace.json`, 'wx', 0o600);
      while (true) {
        const part = await cdp.send('IO.read', { handle: stream, size: 1024 * 1024 });
        const chunk = Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8');
        if (traceCollection.bytes + chunk.length > captureLimits.traceBytes)
          throw new Error('Browser trace exceeded its byte limit; partial capture is incomplete.');
        await destination.writeFile(chunk);
        traceCollection.bytes += chunk.length;
        if (part.eof) {
          traceCollection.streamComplete = true;
          break;
        }
      }
    } finally {
      try {
        await destination?.close();
      } finally {
        await cdp.send('IO.close', { handle: stream });
      }
    }
  })();
  return traceStopPromise;
}
function saveCpu() {
  if (cpuStopPromise) return cpuStopPromise;
  if (!cpuRunning) return Promise.resolve(null);
  cpuRunning = false;
  cpuCollection.stopRequestedAtUnixMs = Date.now();
  clearTimeout(cpuTimer);
  cpuStopPromise = (async () => {
    const { profile } = await cdp.send('Profiler.stop');
    cpuCollection.stopAcknowledgedAtUnixMs = Date.now();
    const encoded = JSON.stringify(profile);
    if (Buffer.byteLength(encoded) > captureLimits.cpuBytes)
      throw new Error('Browser CPU profile exceeded its byte limit; capture is incomplete.');
    await writeFile(`${outputPath}.cpuprofile`, encoded, {
      flag: 'wx',
      mode: 0o600,
    });
    return profile;
  })();
  return cpuStopPromise;
}
function distribution(values) {
  if (!values.length) return { count: 0, p50: null, p95: null, p99: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
  return {
    count: values.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: sorted.at(-1),
  };
}
function moved(a, b) {
  return a && b && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 0.005;
}
function histogramDistribution(histogram) {
  const percentile = (fraction) => {
    const needed = Math.ceil(histogram.count * fraction);
    let count = 0;
    for (let bucket = 0; bucket < histogram.bins.length; bucket++) {
      count += histogram.bins[bucket];
      if (count >= needed)
        return bucket === 4096
          ? [1024, null]
          : [bucket / 4, Math.min(histogram.maxMs, (bucket + 1) / 4)];
    }
    return [null, null];
  };
  const bounds = Object.fromEntries(
    [0.5, 0.95, 0.99].map((fraction) => [
      fraction,
      histogram.count ? percentile(fraction) : [null, null],
    ]),
  );
  return {
    count: histogram.count,
    p50: bounds[0.5][1],
    p95: bounds[0.95][1],
    p99: bounds[0.99][1],
    max: histogram.count ? histogram.maxMs : null,
    totalMs: histogram.totalMs,
    percentileBoundsMs: bounds,
    resolutionMs: 0.25,
    overflowCount: histogram.bins[4096],
  };
}
function analyzeCpuProfile(profile, navigationStart, measuredStart, measuredEnd) {
  const samples = profile.samples ?? [],
    deltas = profile.timeDeltas ?? [];
  const nodes = new Map(profile.nodes.map((node) => [node.id, node.callFrame]));
  const counts = new Map(),
    largestDeltas = [];
  let negativeDeltas = 0,
    nonfiniteDeltas = 0,
    negativeTotalUs = 0;
  let cursorUs = profile.startTime,
    minimumDeltaUs = Infinity,
    maximumDeltaUs = -Infinity;
  for (let index = 0; index < deltas.length; index++) {
    const delta = deltas[index];
    if (!Number.isFinite(delta)) {
      nonfiniteDeltas++;
      continue;
    }
    minimumDeltaUs = Math.min(minimumDeltaUs, delta);
    maximumDeltaUs = Math.max(maximumDeltaUs, delta);
    if (delta < 0) {
      negativeDeltas++;
      negativeTotalUs += delta;
    }
    cursorUs += delta;
    if (largestDeltas.length < 20 || delta > largestDeltas.at(-1).deltaUs) {
      largestDeltas.push({ sampleIndex: index, deltaUs: delta });
      largestDeltas.sort((a, b) => b.deltaUs - a.deltaUs);
      if (largestDeltas.length > 20) largestDeltas.pop();
    }
  }
  let unmappedSamples = 0;
  for (const id of samples) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!nodes.has(id)) unmappedSamples++;
  }
  const reasons = [];
  if (!samples.length) reasons.push('empty-profile');
  if (samples.length !== deltas.length) reasons.push('delta-count-mismatch');
  if (negativeDeltas) reasons.push('negative-deltas');
  if (nonfiniteDeltas) reasons.push('nonfinite-deltas');
  if (
    ![
      profile.startTime,
      profile.endTime,
      navigationStart,
      measuredStart,
      measuredEnd,
      cursorUs,
    ].every(Number.isFinite) ||
    profile.endTime < profile.startTime ||
    measuredEnd < measuredStart
  )
    reasons.push('unusable-clock-bounds');
  const usable = reasons.length === 0;
  const rank = (values, column) =>
    [...values]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([id, value]) => ({
        nodeId: id,
        ...(nodes.get(id) ?? { functionName: '(unmapped node)', url: '' }),
        [column]: value,
      }));
  const result = {
    cpuTimingQuality: {
      usableForWeightedSampledSpans: usable,
      reasons,
      samples: samples.length,
      deltas: deltas.length,
      negativeDeltas,
      nonfiniteDeltas,
      unmappedSamples,
      negativeTotalUs,
      minimumDeltaUs: Number.isFinite(minimumDeltaUs) ? minimumDeltaUs : null,
      maximumDeltaUs: Number.isFinite(maximumDeltaUs) ? maximumDeltaUs : null,
      largestDeltas,
      unsampledProfileTailMs: usable ? Math.max(0, profile.endTime - cursorUs) / 1000 : null,
      sampleTimestampOvershootMs: usable ? Math.max(0, cursorUs - profile.endTime) / 1000 : null,
      interpretation:
        'Weights are elapsed sampled spans, not measured CPU consumption. Long delayed intervals do not prove their endpoint leaf ran throughout. Invalid chronology permits whole-profile sample counts only; no phase attribution.',
    },
    wholeProfileSampleCounts: rank(counts, 'samples'),
    topCpu: [],
    startupTopCpu: [],
    measuredTopCpu: [],
  };
  if (!usable) return result;
  const total = new Map(),
    startup = new Map(),
    measured = new Map();
  const add = (map, id, ms) => {
    if (ms > 0) map.set(id, (map.get(id) ?? 0) + ms);
  };
  const clip = (from, through, low, high) =>
    Math.max(0, Math.min(through, high) - Math.max(from, low));
  const profileStart = profile.startTime / 1000 - navigationStart;
  const profileEnd = profile.endTime / 1000 - navigationStart;
  cursorUs = profile.startTime;
  for (let index = 0; index < samples.length; index++) {
    const from = cursorUs / 1000 - navigationStart;
    cursorUs += deltas[index];
    const through = cursorUs / 1000 - navigationStart,
      id = samples[index];
    add(total, id, clip(from, through, profileStart, profileEnd));
    add(startup, id, clip(from, through, profileStart, Math.min(measuredStart, profileEnd)));
    add(
      measured,
      id,
      clip(from, through, Math.max(measuredStart, profileStart), Math.min(measuredEnd, profileEnd)),
    );
  }
  result.topCpu = rank(total, 'sampledElapsedMs');
  result.startupTopCpu = rank(startup, 'sampledElapsedMs');
  result.measuredTopCpu = rank(measured, 'sampledElapsedMs');
  return result;
}

try {
  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=metal'],
    timeout: 30_000,
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  page = await context.newPage();
  if (survival)
    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['x-ol-scope'])
        intentionHeaders = Object.fromEntries(
          Object.entries(headers).filter(([key]) => key.startsWith('x-ol-')),
        );
    });
  page.on('pageerror', (error) => {
    if (recordError(error.message))
      console.error(`browser page error: ${error.message.slice(0, captureLimits.text)}`);
  });
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) {
      const location = message.location();
      const url = URL.canParse(location.url) ? new URL(location.url) : null;
      recordDiagnostic('consoleMessages', {
        observedAtUnixMs: Date.now(),
        type: message.type(),
        text: message.text().slice(0, captureLimits.text),
        location: {
          pathname:
            url?.origin === target.origin ? url.pathname.slice(0, captureLimits.text) : null,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
        },
      });
    }
  });
  page.on('requestfailed', (request) =>
    recordDiagnostic('failedRequests', {
      observedAtUnixMs: Date.now(),
      url: new URL(request.url()).pathname.slice(0, captureLimits.text),
      error: request.failure()?.errorText?.slice(0, captureLimits.text),
    }),
  );
  const browserProbeOptions = { probeGl: cpuProfile, sceneProfiling };
  await page.addInitScript(({ probeGl, sceneProfiling }) => {
    const limit = 100_000;
    let active = true;
    let destroyed = false;
    let frameRequest;
    let observer;
    let capture = 0;
    let lastFrame;
    const emptyCallbackTiming = () => ({
      count: 0,
      totalTimestampLagMs: 0,
      maxTimestampLagMs: 0,
      maxTimestampLagAt: null,
      largestCompleteGaps: [],
      firstAt: null,
      lastAt: null,
    });
    let callbackTiming = emptyCallbackTiming();
    let frames = [],
      longTasks = [],
      clicks = [],
      commands = [],
      control = [];
    let dropped = 0;
    let motionWatches = [];
    let motionWatchDropped = 0;
    let phaseStartedAt = 0;
    const glCalls = {};
    const glRestorations = [];
    const slowGl = [];
    const programLabels = new WeakMap();
    const programOwners = new WeakMap();
    let programOwnerTruncated = 0;
    if (probeGl)
      window.__openLegendShaderProbe = (shader, material, pass) => {
        if (!active) return;
        const program = shader.impl?.glProgram;
        if (!program) return;
        const name = material.name.slice(0, 100);
        let owners = programOwners.get(program);
        if (!owners) programOwners.set(program, (owners = []));
        if (owners.some((owner) => owner.name === name && owner.pass === pass)) return;
        if (owners.length < 16) owners.push({ materialId: material.id, name, pass });
        else programOwnerTruncated++;
      };
    const programLabel = (gl, program) => {
      let label = programLabels.get(program);
      if (label) return label;
      label = (gl.getAttachedShaders(program) ?? []).map((shader) => {
        const source = gl.getShaderSource(shader) ?? '';
        let hash = 2166136261;
        for (let index = 0; index < source.length; index++)
          hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
        return {
          sourceHash: (hash >>> 0).toString(16),
          name: /#define SHADER_NAME ([^\n]+)/.exec(source)?.[1] ?? null,
          defines: [...source.matchAll(/^#define\s+([A-Za-z_]\w*)([^\n]*)/gm)]
            .map((match) => `${match[1]}${match[2]}`)
            .filter((line) => /SHADER_|SHADOW|DITHER|INSTANC|SKIN|GAMMA|TONE|LIGHT|FOG/.test(line))
            .slice(0, 64),
          features: [
            'ol_revealStrength',
            'ol_instanceFoot',
            'characterDepth',
            'matrix_pose',
          ].filter((name) => source.includes(name)),
        };
      });
      programLabels.set(program, label);
      return label;
    };
    const rawTruncated = {
      frames: 0,
      longTasks: 0,
      clicks: 0,
      commands: 0,
      control: 0,
      slowGl: 0,
    };
    const emptyHistogram = () => ({
      count: 0,
      totalMs: 0,
      maxMs: 0,
      bins: Array(4097).fill(0),
      above25Ms: 0,
      above50Ms: 0,
      above100Ms: 0,
    });
    let histograms = { browserFrame: emptyHistogram(), longTask: emptyHistogram() };
    const duration = (series, ms) => {
      const histogram = histograms[series];
      histogram.count++;
      histogram.totalMs += ms;
      histogram.maxMs = Math.max(histogram.maxMs, ms);
      histogram.bins[Math.min(4096, Math.floor(ms * 4))]++;
      if (ms > 25) histogram.above25Ms++;
      if (ms > 50) histogram.above50Ms++;
      if (ms > 100) histogram.above100Ms++;
    };
    const append = (series, value) => {
      if (series.length < limit) series.push(value);
      else {
        dropped++;
        const name =
          series === frames
            ? 'frames'
            : series === longTasks
              ? 'longTasks'
              : series === clicks
                ? 'clicks'
                : series === commands
                  ? 'commands'
                  : series === control
                    ? 'control'
                    : 'slowGl';
        rawTruncated[name]++;
      }
    };
    if (probeGl)
      for (const name of [
        'compileShader',
        'linkProgram',
        'getProgramParameter',
        'texImage2D',
        'bufferData',
        'readPixels',
        'finish',
      ]) {
        const original = WebGL2RenderingContext.prototype[name];
        const wrapped = function (...args) {
          if (!active) return original.apply(this, args);
          const at = performance.now();
          try {
            return original.apply(this, args);
          } finally {
            const ms = performance.now() - at;
            const total = (glCalls[name] ??= { count: 0, ms: 0, maxMs: 0 });
            total.count++;
            total.ms += ms;
            total.maxMs = Math.max(total.maxMs, ms);
            if (ms >= 2)
              append(slowGl, {
                at,
                ms,
                name,
                ...(name === 'getProgramParameter'
                  ? {
                      parameter: args[1],
                      program: programLabel(this, args[0]),
                      owners: (programOwners.get(args[0]) ?? []).map((owner) => ({ ...owner })),
                    }
                  : {}),
              });
          }
        };
        WebGL2RenderingContext.prototype[name] = wrapped;
        glRestorations.push(() => {
          if (WebGL2RenderingContext.prototype[name] === wrapped)
            WebGL2RenderingContext.prototype[name] = original;
        });
      }
    const sample = (suppliedAt) => {
      if (!active) return;
      const at = performance.now();
      if (active) {
        const lag = Math.max(0, at - suppliedAt);
        callbackTiming.count++;
        callbackTiming.totalTimestampLagMs += lag;
        if (lag > callbackTiming.maxTimestampLagMs) {
          callbackTiming.maxTimestampLagMs = lag;
          callbackTiming.maxTimestampLagAt = at;
        }
        const gaps = callbackTiming.largestCompleteGaps;
        if (lastFrame !== undefined && (gaps.length < 20 || at - lastFrame > gaps.at(-1)[1])) {
          gaps.push([at, at - lastFrame, suppliedAt]);
          gaps.sort((a, b) => b[1] - a[1]);
          if (gaps.length > 20) gaps.pop();
        }
        callbackTiming.firstAt ??= at;
        callbackTiming.lastAt = at;
      }
      if (active && lastFrame !== undefined) {
        append(frames, [at, at - lastFrame, suppliedAt]);
        duration('browserFrame', at - lastFrame);
        if (sceneProfiling) window.__openLegendSceneProfile?.recordBrowserFrame(at - lastFrame);
      }
      if (active && sceneProfiling) {
        const frame = window.__openLegendSceneProfile?.snapshot().latestFrame;
        if (frame)
          motionWatches = motionWatches.filter((click) => {
            if (frame[0] < click.at) return true;
            if (
              click.firstAuthoritativeAt === undefined &&
              click.authoritative &&
              Math.hypot(
                frame[4] - click.authoritative[0],
                frame[5] - click.authoritative[1],
                frame[6] - click.authoritative[2],
              ) > 0.005
            )
              click.firstAuthoritativeAt = frame[0];
            if (
              click.firstDisplayedAt === undefined &&
              click.displayed &&
              Math.hypot(
                frame[7] - click.displayed[0],
                frame[8] - click.displayed[1],
                frame[9] - click.displayed[2],
              ) > 0.005
            )
              click.firstDisplayedAt = frame[0];
            if (at - click.at >= 60_000) click.motionWatchExpired = true;
            return (
              (click.firstAuthoritativeAt === undefined || click.firstDisplayedAt === undefined) &&
              at - click.at < 60_000
            );
          });
      }
      lastFrame = at;
      frameRequest = requestAnimationFrame(sample);
    };
    frameRequest = requestAnimationFrame(sample);
    const longTaskSupported = PerformanceObserver.supportedEntryTypes.includes('longtask');
    if (longTaskSupported)
      (observer = new PerformanceObserver((list) => {
        if (active)
          for (const entry of list.getEntries()) {
            if (entry.startTime < phaseStartedAt) continue;
            append(longTasks, [entry.startTime, entry.duration]);
            duration('longTask', entry.duration);
            if (sceneProfiling) window.__openLegendSceneProfile?.recordLongTask(entry.duration);
          }
      })).observe({ type: 'longtask', buffered: false });
    const pointerUp = (event) => {
      if (active && event.target instanceof HTMLCanvasElement) {
        const scene = sceneProfiling ? window.__openLegendSceneProfile?.snapshot() : undefined;
        const last = scene?.latestFrame;
        const click = {
          at: performance.now(),
          x: event.clientX,
          y: event.clientY,
          authoritative: last?.slice(4, 7),
          displayed: last?.slice(7, 10),
          inputWasStationary: !!last && performance.now() - scene.stationarySince >= 250,
          playerWasIdle: last?.[12] === 0,
          pendingMoveRequests: commands.filter(
            (command) => command.type === 'move' && command.receiptAt === undefined,
          ).length,
        };
        append(clicks, click);
        if (scene) {
          if (motionWatches.length < 64) motionWatches.push(click);
          else motionWatchDropped++;
        }
      }
    };
    addEventListener('pointerup', pointerUp, true);
    let stopRequestObserver;
    let observeRequests;
    const pendingRequests = new Map();
    const requestRecorder = (observation) => {
      if (!active) return;
      const path = observation.path.split('?')[0];
      if (!['/api/command', '/api/control', '/api/presence', '/api/embodiment'].includes(path))
        return;
      if (observation.phase === 'started') {
        const input = observation.input;
        const command = {
          started: observation.at,
          type: input?.command?.type,
          ...(typeof input?.commandId === 'string' ? { commandId: input.commandId } : {}),
          ...(path === '/api/command'
            ? {}
            : {
                path,
                visible: input?.visible,
                operation: input?.operation,
                paused: input?.paused,
                speed: input?.speed,
              }),
        };
        pendingRequests.set(observation.id, command);
        append(path === '/api/command' ? commands : control, command);
      } else {
        const command = pendingRequests.get(observation.id);
        pendingRequests.delete(observation.id);
        if (!command) return;
        if (observation.phase === 'failed') {
          command.error = 'Request observation failed';
          return;
        }
        command.status = observation.status;
        command.ok = observation.result?.ok;
        command.code = observation.result?.code;
        command.message = observation.result?.message;
        if (typeof command.ok !== 'boolean') command.unreadable = true;
        else command.receiptAt = observation.at;
      }
    };
    const recorderReady = import('/assets/network-tools.js').then((module) => {
      observeRequests = module.observeBrowserRequests;
      if (active) stopRequestObserver = observeRequests(requestRecorder);
    });
    let completed;
    const api = {
      ready: recorderReady,
      start() {
        if (active || destroyed) return;
        capture++;
        completed = undefined;
        frames = [];
        longTasks = [];
        clicks = [];
        commands = [];
        control = [];
        for (const name of Object.keys(glCalls)) delete glCalls[name];
        slowGl.length = 0;
        programOwnerTruncated = 0;
        dropped = 0;
        for (const name of Object.keys(rawTruncated)) rawTruncated[name] = 0;
        motionWatches = [];
        motionWatchDropped = 0;
        histograms = { browserFrame: emptyHistogram(), longTask: emptyHistogram() };
        phaseStartedAt = performance.now();
        callbackTiming = emptyCallbackTiming();
        lastFrame = undefined;
        active = true;
        if (observeRequests) stopRequestObserver = observeRequests(requestRecorder);
        frameRequest = requestAnimationFrame(sample);
        observer?.observe({ type: 'longtask', buffered: false });
      },
      stop() {
        if (!active) return completed;
        active = false;
        stopRequestObserver?.();
        stopRequestObserver = undefined;
        pendingRequests.clear();
        cancelAnimationFrame(frameRequest);
        observer?.disconnect();
        const stoppedAt = performance.now();
        return (completed = {
          histograms,
          callbackTiming: {
            ...callbackTiming,
            initialBoundaryMs:
              callbackTiming.firstAt === null ? null : callbackTiming.firstAt - phaseStartedAt,
            finalBoundaryMs:
              callbackTiming.lastAt === null ? null : stoppedAt - callbackTiming.lastAt,
          },
          frames,
          longTasks,
          clicks,
          commands,
          control,
          dropped,
          rawTruncated: { ...rawTruncated },
          motionWatchDropped,
          longTaskSupported,
          timeOrigin: performance.timeOrigin,
          glCalls: Object.fromEntries(
            Object.entries(glCalls).map(([name, value]) => [name, { ...value }]),
          ),
          slowGl: [...slowGl],
          programOwnerTruncated,
          stoppedAt,
        });
      },
      destroy() {
        if (destroyed) return;
        api.stop();
        destroyed = true;
        removeEventListener('pointerup', pointerUp, true);
        for (const restore of glRestorations) restore();
        if (probeGl) delete window.__openLegendShaderProbe;
        if (window.__openLegendBrowserProfile === api) delete window.__openLegendBrowserProfile;
      },
    };
    window.__openLegendBrowserProfile = api;
  }, browserProbeOptions);
  cdp = await context.newCDPSession(page);
  if (trace) {
    traceCollection.startRequestedAtUnixMs = Date.now();
    await cdp.send('Tracing.start', {
      categories:
        'devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline.stack',
      transferMode: 'ReturnAsStream',
    });
    traceRunning = true;
    traceCollection.startAcknowledgedAtUnixMs = Date.now();
    traceTimer = setTimeout(() => void saveTrace().catch(recordError), 60_000);
  }
  await cdp.send('Network.enable');
  await cdp.send('Performance.enable');
  if (cpuProfile) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    cpuCollection.startRequestedAtUnixMs = Date.now();
    await cdp.send('Profiler.start');
    cpuCollection.startAcknowledgedAtUnixMs = Date.now();
    cpuRunning = true;
    cpuTimer = setTimeout(() => void saveCpu().catch(recordError), 60_000);
  }
  let navigationStart = 0;
  let measuring = false;
  cdp.on('Network.eventSourceMessageReceived', (message) => {
    if (measuring && message.eventName === 'access-changed') accessChangedEvents++;
    if (!measuring || !['patch', 'reset'].includes(message.eventName)) return;
    const value = JSON.parse(message.data);
    sseCount++;
    sseBytes += Buffer.byteLength(message.data);
    if (sse.length < 100_000)
      sse.push({
        at: message.timestamp * 1000 - navigationStart,
        revision: value.revision,
        position: value.player?.position,
        simTime: value.clock?.seconds,
        paused: value.clock?.paused,
        pauseReason: value.clock?.pauseReason,
        preparingNavigation: value.clock?.preparingNavigation,
        type: message.eventName,
        bytes: Buffer.byteLength(message.data),
      });
  });
  // Obtain the ordinary local sign-in cookie without loading/rendering the app twice.
  const login = await context.request.get(new URL('/auth/login', target).href);
  if (!login.ok()) throw new Error(`Local fixture sign-in failed (${login.status()}).`);
  console.error('browser profile stage: signed in');
  await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  console.error('browser profile stage: page loaded, waiting for entry or rendered scene');
  const resumeHere = page.getByRole('button', { name: 'Resume Here', exact: true });
  await Promise.race([
    page.locator('#world[data-ready="true"]').waitFor({ timeout: 60_000 }),
    resumeHere.waitFor({ timeout: 60_000 }),
  ]);
  if (await resumeHere.isVisible()) await resumeHere.click();
  await page.locator('#world[data-ready="true"]').waitFor({ timeout: 30_000 });
  console.error('browser profile stage: scene rendered');
  if (sceneProfiling)
    await page.waitForFunction(() => !!window.__openLegendSceneProfile, undefined, {
      timeout: 10_000,
    });
  const resume = page.getByRole('button', { name: 'Resume world', exact: true });
  // Fixture time must stay paused while cold reads and collector preparation run.
  await resume.waitFor();
  const threeTimes = page.getByRole('radio', { name: '3×', exact: true });
  // The visible React Aria label owns pointer input; use the radio's ordinary keyboard action.
  if (!(await threeTimes.isChecked())) await threeTimes.press('Space');
  await expect(threeTimes).toBeChecked({ timeout: 10_000 });
  if (blurOff)
    await page.addStyleTag({
      content:
        '.vision-blur { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
    });
  await resume.waitFor();
  const metrics = await cdp.send('Performance.getMetrics');
  navigationStart =
    metrics.metrics.find((metric) => metric.name === 'NavigationStart')?.value * 1000;
  if (!Number.isFinite(navigationStart))
    throw new Error('Missing browser navigation clock reference.');
  const startup = await page.evaluate(
    (sceneProfiling) => ({
      browser: window.__openLegendBrowserProfile.stop(),
      scene: sceneProfiling ? window.__openLegendSceneProfile.stop() : null,
      characterModels: sceneProfiling ? window.__openLegendSceneProfile.characterModels() : null,
      navigation: performance.getEntriesByType('navigation').map((entry) => entry.toJSON()),
    }),
    sceneProfiling,
  );
  const startRequestedAtUnixMs = Date.now();
  await page.evaluate(() => window.__openLegendBrowserProfile.ready);
  const started = await page.evaluate((sceneProfiling) => {
    if (sceneProfiling) window.__openLegendSceneProfile.start();
    window.__openLegendBrowserProfile.start();
    const blur = document.querySelector('.vision-blur');
    const blurStyle = blur && getComputedStyle(blur);
    const blurBounds = blur?.getBoundingClientRect();
    return {
      at: performance.now(),
      unixMs: Date.now(),
      framebuffer: [
        document.querySelector('#world').width,
        document.querySelector('#world').height,
      ],
      visibility: document.visibilityState,
      focused: document.hasFocus(),
      peripheralBlur: blurStyle && {
        display: blurStyle.display,
        backdropFilter: blurStyle.backdropFilter,
        webkitBackdropFilter: blurStyle.getPropertyValue('-webkit-backdrop-filter'),
        bounds: [blurBounds.width, blurBounds.height],
      },
    };
  }, sceneProfiling);
  const startAcknowledgedAtUnixMs = Date.now();
  measuring = true;
  const resumeRequestedAtUnixMs = Date.now();
  await resume.click();
  await page.getByRole('button', { name: 'Pause world', exact: true }).waitFor();
  const resumeAcknowledgedAtUnixMs = Date.now();
  await writeFile(ready.startMarkerPath, JSON.stringify({ startedAtUnixMs: started.unixMs }), {
    flag: 'wx',
    mode: 0o600,
  });
  console.error('browser profile stage: measurement started');
  const hostStarted = performance.now();
  let offered = 0;
  const selectionInputs = [];
  const clickErrors = [];
  const survivalInputs = [];
  const groundInputs = [];
  let previousGroundInput;
  let lastInputProgressAt = hostStarted;
  const survivalObservedMs = {};
  let previousSurvivalSample;
  let recovering = false;
  let finalMealAccepted = false;
  let groundConstraint;
  let nextBoundedSlot = 500;
  let skippedOverdueSlots = 0;
  async function survivalInput(slotStartedAt) {
    const state = await page.evaluate(async (headers) => {
      const { browserRequest } = await import('/assets/network-tools.js');
      const response = await browserRequest('/api/state', { headers, credentials: 'same-origin' });
      const view = response.body;
      if (!response.ok) throw new Error(`Public survival read: ${response.status}`);
      return view;
    }, intentionHeaders);
    const at = performance.now() - hostStarted;
    if (previousSurvivalSample)
      survivalObservedMs[previousSurvivalSample.reason] =
        (survivalObservedMs[previousSurvivalSample.reason] ?? 0) + at - previousSurvivalSample.at;
    if (
      !state.player.alive ||
      state.player.participation !== 'active' ||
      (state.clock.paused && !waitForResume)
    )
      throw new Error(
        `Survival player unavailable: alive=${state.player.alive}, participation=${state.player.participation}, paused=${state.clock.paused}, pauseReason=${state.clock.pauseReason}.`,
      );
    if (nearStart && !groundConstraint)
      groundConstraint = { anchor: { ...state.player.position }, radius: 5 };
    const publicScene = nearStart
      ? {
          position: state.player.position,
          anchorDistance: Math.hypot(
            state.player.position.x - groundConstraint.anchor.x,
            state.player.position.y - groundConstraint.anchor.y,
            state.player.position.z - groundConstraint.anchor.z,
          ),
          visibleOtherPeople: state.entities.filter(
            (entity) => entity.kind === 'actor' && entity.id !== state.player.id,
          ).length,
          visibleAnimals: state.entities.filter((entity) => entity.kind === 'animal').length,
        }
      : undefined;
    if (state.clock.paused) {
      const sample = {
        at,
        slotStartedAt,
        simTime: state.clock.seconds,
        reason: 'observed world pause',
        pauseReason: state.clock.pauseReason,
        failedActivityGate: true,
        publicScene,
      };
      survivalInputs.push(sample);
      if (previousSurvivalSample?.reason !== sample.reason)
        console.error(
          'browser activity gate failed; waiting for actual public resumption:',
          state.clock.pauseReason,
        );
      previousSurvivalSample = sample;
      return true;
    }
    const { foodAttributeId, energyAttributeId, sleepEffectId, foodDefinitionId } =
      ready.playerSurvival;
    const food = state.player.attributes.find((attribute) => attribute.id === foodAttributeId);
    const energy = state.player.attributes.find((attribute) => attribute.id === energyAttributeId);
    if (
      food?.status !== 'known' ||
      energy?.status !== 'known' ||
      typeof food.value !== 'number' ||
      typeof food.max !== 'number'
    )
      throw new Error('The configured survival meters are absent from the current public view.');
    const resting = state.player.statusEffects?.some((effect) => effect.id === sleepEffectId);
    const protectedAction = recovering && !!state.player.action;
    if (!protectedAction && !resting) recovering = false;
    if (!energy.concern) finalMealAccepted = false;
    const item = state.player.inventory.find(
      (item) => item.definitionId === foodDefinitionId && item.quantity > 0,
    );
    const shouldEat =
      food.critical || (!!energy.concern && !finalMealAccepted && food.value < food.max && !!item);
    const reason = resting
      ? 'ordinary sleep'
      : protectedAction
        ? 'ordinary recovery activity'
        : shouldEat
          ? 'food recovery'
          : energy.concern
            ? 'energy recovery'
            : 'mixed input';
    const sample = {
      at,
      slotStartedAt,
      simTime: state.clock.seconds,
      reason,
      food: food.value,
      foodMaximum: food.max,
      energy: energy.value,
      finalMealAccepted,
      publicScene,
      foodQuantity: state.player.inventory
        .filter((item) => item.definitionId === foodDefinitionId)
        .reduce((sum, item) => sum + item.quantity, 0),
    };
    survivalInputs.push(sample);
    previousSurvivalSample = sample;
    if (resting || protectedAction) return true;
    if (!shouldEat && !energy.concern) return false;
    if (shouldEat && !item)
      throw new Error('No finite carried food remains for ordinary recovery.');
    // Recovery is deliberate input. Read only this possession or self context;
    // routine walking never requests a catalogue or relies on continuous offers.
    const checked = await page.evaluate(
      async ({ headers, context }) => {
        const { browserRequest } = await import('/assets/network-tools.js');
        const response = await browserRequest(
          '/api/actions',
          {
            method: 'POST',
            credentials: 'same-origin',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(context),
          },
          context,
        );
        let body = null;
        try {
          body = response.body;
        } catch {
          /* Retain an unreadable read. */
        }
        return { status: response.status, body };
      },
      {
        headers: intentionHeaders,
        context: shouldEat ? { itemId: item.id } : { targetId: state.player.id },
      },
    );
    sample.offerRead = checked;
    if (checked.status !== 200 || checked.body?.ok !== true)
      throw new Error(
        `Survival choices unavailable: HTTP ${checked.status}, ${checked.body?.code ?? 'unreadable'}.`,
      );
    const action = checked.body.catalogue.actions.find(
      (choice) =>
        choice.enabled &&
        choice.intent.kind === 'command' &&
        (shouldEat
          ? choice.intent.command.type === 'eat' && choice.intent.command.itemId === item.id
          : choice.intent.command.type === 'status-effect' &&
            choice.intent.command.definitionId === sleepEffectId &&
            choice.intent.command.effectOperation === 'activate'),
    );
    if (!action) throw new Error(`No current permitted ${reason} offer remains.`);
    const command = action.intent.command;
    sample.command = command;
    const result = await page.evaluate(
      async ({ headers, command, commandEpoch }) => {
        const { browserRequest } = await import('/assets/network-tools.js');
        const input = { commandId: crypto.randomUUID(), commandEpoch, command };
        const response = await browserRequest(
          '/api/command',
          {
            method: 'POST',
            credentials: 'same-origin',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
          input,
        );
        let body = null;
        let unreadable = false;
        try {
          body = response.body;
        } catch {
          unreadable = true;
        }
        return { status: response.status, body, unreadable };
      },
      { headers: intentionHeaders, command, commandEpoch: state.commandEpoch },
    );
    sample.receipt = result;
    if (result.status !== 200 || result.body?.ok !== true)
      throw new Error(
        `Survival intention unconfirmed or refused: HTTP ${result.status}, ${result.body?.code ?? 'unreadable'}: ${result.body?.message ?? 'No confirmed success acknowledgment.'}`,
      );
    // Continuous hunger can fall again before the next sample. Use the installed
    // serving value to finish this finite meal sequence, rather than eat forever
    // while waiting to observe the exact instant at maximum (PF16.30).
    if (shouldEat && energy.concern && food.max - food.value <= ready.longSoak.nutrition) {
      finalMealAccepted = true;
      sample.finalPreSleepMealAccepted = true;
    }
    recovering = command.type === 'status-effect';
    return true;
  }
  // Real canvas input; no hidden move endpoint or future NPC path enters the browser.
  const points = [
    [220, 80],
    [-220, 80],
    [180, -90],
    [-180, -90],
  ];
  while (performance.now() - hostStarted < seconds * 1000) {
    const boundedSlots = nearStart || waitForResume;
    if (boundedSlots && nextBoundedSlot < performance.now() - hostStarted) {
      const missed = Math.ceil((performance.now() - hostStarted - nextBoundedSlot) / 1000);
      nextBoundedSlot += missed * 1000;
      skippedOverdueSlots += missed;
    }
    const scheduled = boundedSlots ? nextBoundedSlot : 500 + offered * 1000;
    // Leave three seconds for accepted work to publish before the measurement cutoff.
    if (scheduled >= (seconds - 3) * 1000) break;
    if (boundedSlots) {
      while (performance.now() - hostStarted < scheduled)
        await delay(Math.max(1, scheduled - (performance.now() - hostStarted)));
    } else if (performance.now() - hostStarted < scheduled)
      await delay(scheduled - (performance.now() - hostStarted));
    const [dx, dy] = points[offered % points.length];
    offered++;
    if (performance.now() - lastInputProgressAt >= 60_000) {
      lastInputProgressAt = performance.now();
      console.error(
        JSON.stringify({
          type: 'browser-input-progress',
          elapsedSeconds: (lastInputProgressAt - hostStarted) / 1000,
          offeredInputSlots: offered,
          skippedOverdueInputSlots: skippedOverdueSlots,
          groundChoices: groundInputs.filter((input) => input.point).length,
          noVisibleGround: groundInputs.filter((input) => !input.point).length,
          recoveryAttempts: survivalInputs.filter((input) => input.command).length,
          confirmedRecovery: survivalInputs.filter(
            (input) => input.receipt?.status === 200 && input.receipt?.body?.ok === true,
          ).length,
          lastObservedReason: previousSurvivalSample?.reason ?? null,
        }),
      );
    }
    try {
      const slotStartedAt = performance.now() - hostStarted;
      if (boundedSlots) nextBoundedSlot = slotStartedAt + 1000;
      if (survival && (await survivalInput(slotStartedAt))) continue;
      if (selectionSweep && offered % 3 === 0) {
        const panel = page.locator('#nearbyPanel');
        if (!(await panel.isVisible()))
          await page.locator('.ol-launcher[aria-label="In view"]').click({ timeout: 2000 });
        const back = panel.getByRole('button', { name: 'Back to In view', exact: true });
        if (await back.isVisible()) await back.click({ timeout: 2000 });
        const rows = panel.locator('[data-entity]');
        const count = await rows.count();
        if (!count) throw new Error('No visible entity available for selection sweep.');
        const row = rows.nth((Math.floor(offered / 3) - 1) % Math.min(count, 12));
        const entityId = await row.getAttribute('data-entity');
        const at = await page.evaluate(() => performance.now());
        const attempt = { at, entityId, outcome: 'pending' };
        selectionInputs.push(attempt);
        try {
          await row.getByRole('button').click({ timeout: 2000 });
          await back.waitFor({ timeout: 2000 });
          attempt.outcome = 'selected';
        } catch (error) {
          const ids = await panel
            .locator('[data-entity]')
            .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-entity')));
          const toast = page.locator('#toast');
          const refused =
            (await toast.isVisible()) && (await toast.innerText()).endsWith("can't see this.");
          const showingList = await panel
            .getByText('Within your character’s sight.', { exact: true })
            .isVisible();
          if (!refused && !(showingList && !ids.includes(entityId))) throw error;
          attempt.outcome = 'skipped';
          attempt.reason = refused ? 'Sight-focus refusal' : 'Target no longer in visible list';
        }
        await panel.getByRole('button', { name: /^Hide .* panel$/ }).click({ timeout: 2000 });
        continue;
      }
      let point = [960 + dx, 540 + dy];
      if (survival) {
        const probe = await page.evaluate(
          ({ offset, previous, constraint }) => {
            const canvas = document.querySelector('#world');
            const profile = window.__openLegendSceneProfile;
            if (!canvas || !profile?.isGroundInput)
              throw new Error('The current scene has no ground-input profiler.');
            const rect = canvas.getBoundingClientRect(),
              started = performance.now();
            let candidatesTested = 0;
            for (let i = 0; i < 32; i++) {
              const index = (i + offset) % 32;
              const angle = ((index % 8) * Math.PI) / 4;
              const radius =
                Math.min(rect.width, rect.height) * (0.025 + Math.floor(index / 8) * 0.025);
              const x = Math.round(
                rect.left +
                  rect.width * (constraint ? 0.5 : 0.22 + (index % 8) * 0.08) +
                  (constraint ? Math.cos(angle) * radius : 0),
              );
              const y = Math.round(
                rect.top +
                  rect.height * (constraint ? 0.5 : 0.33 + Math.floor(index / 8) * 0.11) +
                  (constraint ? Math.sin(angle) * radius : 0),
              );
              candidatesTested++;
              if (previous?.[0] === x && previous?.[1] === y) continue;
              if (document.elementFromPoint(x, y) !== canvas) continue;
              if (profile.isGroundInput(x - rect.left, y - rect.top, constraint))
                return { candidatesTested, point: [x, y], probeMs: performance.now() - started };
            }
            return { candidatesTested, point: null, probeMs: performance.now() - started };
          },
          { offset: offered % 32, previous: previousGroundInput, constraint: groundConstraint },
        );
        groundInputs.push({ at: performance.now() - hostStarted, ...probe });
        if (!probe.point) continue;
        point = previousGroundInput = probe.point;
      }
      await page.mouse.click(point[0], point[1], { timeout: 5000 });
    } catch (error) {
      clickErrors.push(String(error));
      console.error('browser input loop stopped:', String(error));
      break;
    }
  }
  await delay(Math.max(0, seconds * 1000 - (performance.now() - hostStarted)));
  const stopRequestedAtUnixMs = Date.now();
  const stopped = await page.evaluate((sceneProfiling) => {
    const result = {
      browser: window.__openLegendBrowserProfile.stop(),
      scene: sceneProfiling ? window.__openLegendSceneProfile.stop() : null,
      characterModels: sceneProfiling ? window.__openLegendSceneProfile.characterModels() : null,
      visibility: document.visibilityState,
      focused: document.hasFocus(),
    };
    window.__openLegendBrowserProfile.destroy();
    return result;
  }, sceneProfiling);
  const stopAcknowledgedAtUnixMs = Date.now();
  measuring = false;
  const endingMetrics = await cdp.send('Performance.getMetrics');
  let cpuAnalysis = {
    cpuTimingQuality: null,
    wholeProfileSampleCounts: [],
    topCpu: [],
    startupTopCpu: [],
    measuredTopCpu: [],
  };
  let cpuProfileWindow = null;
  if (cpuProfile) {
    const profile = await saveCpu();
    cpuProfileWindow = {
      startedAt: profile.startTime / 1000 - navigationStart,
      endedAt: profile.endTime / 1000 - navigationStart,
      measuredOverlapMs: Math.max(
        0,
        Math.min(profile.endTime / 1000 - navigationStart, stopped.browser.stoppedAt) -
          Math.max(profile.startTime / 1000 - navigationStart, started.at),
      ),
    };
    cpuAnalysis = analyzeCpuProfile(
      profile,
      navigationStart,
      started.at,
      stopped.browser.stoppedAt,
    );
  }
  await saveTrace();
  await page.screenshot({ path: `${outputPath}.png` });
  const movement = stopped.browser.commands
    .filter((command) => command.type === 'move')
    .map((command) => {
      const click = [...stopped.browser.clicks]
        .reverse()
        .find((click) => click.at <= command.started && command.started - click.at < 1000);
      const network = sse.find(
        (update) =>
          update.at >= command.started &&
          update.position &&
          moved([update.position.x, update.position.y, update.position.z], click?.authoritative),
      );
      return {
        ...command,
        clickAt: click?.at,
        inputWasStationary: sceneProfiling ? (click?.inputWasStationary ?? false) : null,
        playerWasIdle: sceneProfiling ? (click?.playerWasIdle ?? false) : null,
        pendingMoveRequests: click?.pendingMoveRequests ?? null,
        clickToReceiptMs:
          click && command.receiptAt !== undefined ? command.receiptAt - click.at : null,
        clickToAuthoritativeSseMs: click && network ? network.at - click.at : null,
        clickToAuthoritativeSceneMs:
          click?.firstAuthoritativeAt !== undefined ? click.firstAuthoritativeAt - click.at : null,
        clickToDisplayedMotionMs:
          click?.firstDisplayedAt !== undefined ? click.firstDisplayedAt - click.at : null,
      };
    });
  const histograms = stopped.scene?.histograms;
  const externalHistograms = stopped.browser.histograms;
  const graphicsBytes = stopped.scene?.frames.map((frame) => frame[11]);
  const renderedEntries = stopped.scene?.views.map((view) => view[6]);
  const acceptedIntent = (command) => command.status === 200 && command.ok === true;
  const unconfirmedIntent = (command) => command.receiptAt === undefined || command.unreadable;
  const acceptedMovement = movement.filter(
    (command) => acceptedIntent(command) && command.code === 'accepted',
  );
  // Settled display alone can hide an earlier walk stalled on the server. A new
  // movement-start sample also needs no active public action or older request.
  const movementStarts = acceptedMovement.filter(
    (command) =>
      command.inputWasStationary && command.playerWasIdle && command.pendingMoveRequests === 0,
  );
  const refusals = Object.fromEntries(
    [
      ...new Set(movement.filter((command) => command.ok === false).map((command) => command.code)),
    ].map((code) => [
      code,
      movement.filter((command) => command.ok === false && command.code === code).length,
    ]),
  );
  report = {
    fixture: {
      readyPath: resolve(readyPath),
      serverOutputPath: ready.outputPath,
      nativeSpeed: ready.nativeSpeed,
      instrumentation: ready.instrumentation ?? null,
    },
    runnerSourceSha256,
    environment: {
      browser: browser.version(),
      headless: true,
      loadedScripts: await page.evaluate(() => {
        const paths = [...document.scripts]
          .filter((script) => script.src)
          .map((script) => new URL(script.src))
          .filter((url) => url.origin === location.origin)
          .map((url) => url.pathname);
        return { paths: paths.slice(0, 32), truncated: Math.max(0, paths.length - 32) };
      }),
      viewport: { width: 1920, height: 1080 },
      framebuffer: started.framebuffer,
      renderer: stopped.scene?.renderer ?? null,
      angle: 'metal',
      startedVisibility: started.visibility,
      stoppedVisibility: stopped.visibility,
      startedFocused: started.focused,
      stoppedFocused: stopped.focused,
    },
    measurement: {
      startedAtUnixMs: started.unixMs,
      startRequestedAtUnixMs,
      startAcknowledgedAtUnixMs,
      resumeRequestedAtUnixMs,
      resumeAcknowledgedAtUnixMs,
      startSequence:
        'Collectors arm while the world is paused. The browser interval includes the ordinary resume request; fixed inputs and the server interval begin after the running UI and start marker.',
      stopRequestedAtUnixMs,
      stopAcknowledgedAtUnixMs,
      instrumentation: {
        server: ready.instrumentation ?? null,
        sceneProfiling: appProfiling,
        sceneMeasurements: sceneProfiling ? 'observed' : 'disabled',
        sceneMovementEvidence: sceneProfiling
          ? 'observed when eligible'
          : 'unavailable: scene profiling disabled',
        externalBrowserCallbacks: true,
        externalLongTasks: stopped.browser.longTaskSupported,
        externalHttpReceipts: true,
        devToolsNetwork: true,
        devToolsPerformance: true,
        cpuSampling: cpuProfile,
        detailedTrace: trace,
        timedWebGlCalls: cpuProfile,
      },
      startedAt: started.at,
      endedAt: stopped.browser.stoppedAt,
      seconds: (stopped.browser.stoppedAt - started.at) / 1000,
      cpuSamplingEnabled: cpuProfile,
      cpuProfileWindow,
      cpuCollection,
      detailedTraceEnabled: trace,
      traceCollection,
      blurDisabledDiagnostic: blurOff,
      peripheralBlur: started.peripheralBlur,
      selectionSweep,
      survivalDriver: survival,
      nearStartDiagnostic: nearStart,
      waitForActualResumptionDiagnostic: waitForResume,
      frameClock:
        'performance.now() at callback entry; raw frame columns are callbackAt, deliveryIntervalMs, suppliedRafTimestamp. Boundary gaps are censored and reported separately.',
      instrumentationDescription:
        'Full-page rAF, long tasks and HTTP receipts remain enabled in both modes. Scene CPU brackets, public poses and asynchronous GPU timer queries are present only with application profiling on. CPU sampling and timed WebGL calls are independently requested together. GPU excludes browser composition; frame callbacks do not prove display presentation.',
    },
    summary: {
      offeredInputSlots: offered,
      skippedOverdueInputSlots: skippedOverdueSlots,
      offeredClicks: stopped.browser.clicks.length,
      groundInputProbes: {
        count: groundInputs.length,
        chosen: groundInputs.filter((input) => input.point).length,
        noVisibleGround: groundInputs.filter((input) => !input.point).length,
        maxCandidatesPerInput: 32,
        probeMs: distribution(groundInputs.map((input) => input.probeMs)),
      },
      selectionInputs,
      movementCommands: movement.length,
      acceptedMovement: acceptedMovement.length,
      submittedPlayerIntentions: stopped.browser.commands.length,
      acceptedPlayerIntentions: stopped.browser.commands.filter(acceptedIntent).length,
      playerIntentionsByType: Object.fromEntries(
        [...new Set(stopped.browser.commands.map((command) => command.type))].map((type) => [
          type,
          {
            submitted: stopped.browser.commands.filter((command) => command.type === type).length,
            accepted: stopped.browser.commands.filter(
              (command) => command.type === type && acceptedIntent(command),
            ).length,
            refused: stopped.browser.commands.filter(
              (command) => command.type === type && command.ok === false,
            ).length,
            unconfirmed: stopped.browser.commands.filter(
              (command) => command.type === type && unconfirmedIntent(command),
            ).length,
            httpFailures: stopped.browser.commands.filter(
              (command) =>
                command.type === type && command.status !== undefined && command.status !== 200,
            ).length,
          },
        ]),
      ),
      stationaryMovementStarts: sceneProfiling ? movementStarts.length : null,
      refusedMovement: refusals,
      unconfirmedMovement: movement.filter(unconfirmedIntent).length,
      frames: histogramDistribution(externalHistograms.browserFrame),
      frameDeliveryTiming: {
        callbacks: stopped.browser.callbackTiming.count,
        completeIntervals: externalHistograms.browserFrame.count,
        retainedIntervals: stopped.browser.frames.length,
        truncatedIntervals: stopped.browser.rawTruncated.frames,
        suppliedTimestampLagMeanMs: stopped.browser.callbackTiming.count
          ? stopped.browser.callbackTiming.totalTimestampLagMs /
            stopped.browser.callbackTiming.count
          : null,
        suppliedTimestampLagMaxMs: stopped.browser.callbackTiming.maxTimestampLagMs,
        suppliedTimestampLagMaxAt: stopped.browser.callbackTiming.maxTimestampLagAt,
        largestCompleteGaps: stopped.browser.callbackTiming.largestCompleteGaps,
        initialCensoredGapMs: stopped.browser.callbackTiming.initialBoundaryMs,
        finalCensoredGapMs: stopped.browser.callbackTiming.finalBoundaryMs,
      },
      fps:
        (externalHistograms.browserFrame.count * 1000) / (stopped.browser.stoppedAt - started.at),
      renderedFrameTiming: stopped.scene && {
        interpretation:
          'Foreground engine postrender submissions; physical display presentation is not measured.',
        count: stopped.scene.renderedFrames.count,
        meanSubmissionsPerSecond:
          (stopped.scene.renderedFrames.count * 1000) /
          (stopped.scene.stoppedAt - stopped.scene.startedAt),
        intervals: histogramDistribution(histograms.renderedFrame),
        firstAt: stopped.scene.renderedFrames.firstAt,
        lastAt: stopped.scene.renderedFrames.lastAt,
        maxGapAt: stopped.scene.renderedFrames.maxGapAt,
        initialCensoredGapMs:
          stopped.scene.renderedFrames.firstAt === null
            ? null
            : stopped.scene.renderedFrames.firstAt - stopped.scene.startedAt,
        finalCensoredGapMs:
          stopped.scene.renderedFrames.lastAt === null
            ? null
            : stopped.scene.stoppedAt - stopped.scene.renderedFrames.lastAt,
      },
      framesAbove25Ms: externalHistograms.browserFrame.above25Ms,
      framesAbove50Ms: externalHistograms.browserFrame.above50Ms,
      framesAbove100Ms: externalHistograms.browserFrame.above100Ms,
      rendererCpuMs: histograms ? histogramDistribution(histograms.rendererCpu) : null,
      sceneUpdateCpuMs: histograms ? histogramDistribution(histograms.sceneUpdate) : null,
      sceneViewCpuMs: histograms ? histogramDistribution(histograms.sceneView) : null,
      gpuMs: histograms ? histogramDistribution(histograms.gpu) : null,
      estimatedGraphicsBytes: stopped.scene && {
        initial: graphicsBytes[0] ?? null,
        final: stopped.scene.latestFrame?.[11] ?? null,
        max: stopped.scene.peakEstimatedGraphicsBytes,
      },
      renderedEntries: stopped.scene && {
        initial: renderedEntries[0] ?? null,
        final: renderedEntries.at(-1) ?? null,
        max: stopped.scene.maxRenderedEntries,
      },
      clickToReceiptMs: distribution(
        acceptedMovement.flatMap((command) =>
          command.clickToReceiptMs === null ? [] : [command.clickToReceiptMs],
        ),
      ),
      clickToAuthoritativeSceneMs: sceneProfiling
        ? distribution(
            movementStarts.flatMap((command) =>
              command.clickToAuthoritativeSceneMs === null
                ? []
                : [command.clickToAuthoritativeSceneMs],
            ),
          )
        : null,
      clickToDisplayedMotionMs: sceneProfiling
        ? distribution(
            movementStarts.flatMap((command) =>
              command.clickToDisplayedMotionMs === null ? [] : [command.clickToDisplayedMotionMs],
            ),
          )
        : null,
      longTasks: histogramDistribution(externalHistograms.longTask),
      sseUpdates: sseCount,
      accessChangedEvents,
      sseBytes,
      dropped: {
        browser: stopped.browser.dropped,
        sse: sseCount - sse.length,
        diagnostics: diagnosticOmissions(),
        scene: stopped.scene?.dropped ?? null,
      },
      motionWatchDropped: stopped.browser.motionWatchDropped,
    },
    errors,
    consoleMessages,
    failedRequests,
    diagnosticCounts,
    captureLimits,
    clickErrors,
    survival: survival && {
      installed: ready.playerSurvival,
      groundConstraint,
      failedActivityGate: survivalInputs.some((input) => input.failedActivityGate),
      pausedObservations: survivalInputs.filter((input) => input.failedActivityGate).length,
      inputs: survivalInputs,
      observedMilliseconds: survivalObservedMs,
      observedFrom: survivalInputs[0]?.at ?? null,
      observedThrough: survivalInputs.at(-1)?.at ?? null,
      submittedRecoveryIntentions: survivalInputs.filter((input) => input.command).length,
      acceptedRecoveryIntentions: survivalInputs.filter(
        (input) => input.receipt?.status === 200 && input.receipt?.body?.ok === true,
      ).length,
      sleepingObservations: survivalInputs.filter((input) => input.reason === 'ordinary sleep')
        .length,
      note: 'One ordinary public state read per scheduled input. Interval totals classify the interval after each sample using that observed state, through the final sample only; they are not exact action durations. Sleeping and recovery defer mixed inputs. Accepted intentions do not prove completed recovery; native/server evidence owns completion. All food is finite initial stock.',
    },
    movement,
    groundInputs,
    sse,
    startup,
    ...cpuAnalysis,
    browserMetrics: { starting: metrics.metrics, ending: endingMetrics.metrics },
    ...stopped,
  };
  await writeFile(outputPath, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  // Keep normal browser presence alive through the server's final measured interval.
  const drainDeadline = performance.now() + 15_000;
  while (performance.now() < drainDeadline) {
    try {
      await stat(ready.outputPath);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await delay(100);
    }
  }
  console.log(
    JSON.stringify({
      outputPath: resolve(outputPath),
      summary: report.summary,
      errors,
      failedRequests,
      clickErrors,
    }),
  );
  if (
    errors.length ||
    Object.values(diagnosticOmissions()).some((count) => count > 0) ||
    clickErrors.length ||
    !report.summary.acceptedMovement ||
    stopped.browser.motionWatchDropped ||
    stopped.visibility !== 'visible' ||
    report.survival?.failedActivityGate
  )
    process.exitCode = 1;
} catch (error) {
  const failurePage = page
    ? await page
        .locator('body')
        .innerText({ timeout: 1000 })
        .catch(() => null)
    : null;
  await page?.screenshot({ path: `${outputPath}.failure.png` }).catch(() => undefined);
  await saveCpu().catch(() => undefined);
  await saveTrace().catch(() => undefined);
  if (!report)
    await writeFile(
      outputPath,
      JSON.stringify({
        status: 'failed',
        error: String(error),
        errors,
        consoleMessages,
        failedRequests,
        diagnosticCounts,
        diagnosticOmitted: diagnosticOmissions(),
        captureLimits,
        cpuCollection,
        traceCollection,
        failurePage: failurePage?.slice(0, 10000),
      }),
      { flag: 'wx', mode: 0o600 },
    );
  throw error;
} finally {
  clearTimeout(cpuTimer);
  clearTimeout(traceTimer);
  try {
    await page
      ?.evaluate((sceneProfiling) => {
        window.__openLegendBrowserProfile?.destroy();
        if (sceneProfiling) window.__openLegendSceneProfile?.stop();
      }, sceneProfiling)
      .catch((error) => {
        recordError(error);
        process.exitCode = 1;
      });
    await saveCpu().catch((error) => {
      recordError(error);
      process.exitCode = 1;
    });
    await saveTrace().catch((error) => {
      recordError(error);
      process.exitCode = 1;
    });
  } finally {
    await browser?.close();
  }
}
