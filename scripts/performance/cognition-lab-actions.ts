import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { loadavg } from 'node:os';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { PLAYER_ID, createItemLot } from '@open-legend/domain';
import { stockedCamp } from '../../tests/fixtures/world.js';
import { testRepository, readConfig, closeTestDatabases } from '../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../tests/fixtures/service.js';
import { WorldService } from '../../apps/server/src/world-service.js';
import {
  operatorActionCatalogue,
  operatorActionCataloguePage,
} from '../../apps/server/src/action-catalogue.js';
import { startPerformanceCapture, performanceSnapshot } from '../../apps/server/src/performance.js';

/** Native catalogue caller, not HTTP/browser or provider qualification.
 * OPENLEGEND_TEST_DATABASE_URL=postgresql://127.0.0.1/postgres AI_BUDGET_USD=0
 * pnpm exec tsx scripts/performance/cognition-lab-actions.ts /tmp/new-actions-report.json
 */
const output = process.argv[2];
if (!output || process.env['AI_BUDGET_USD'] !== '0')
  throw new Error('Choose a new external JSON report path and AI_BUDGET_USD=0.');
const rows: Record<string, unknown>[] = [];
try {
  for (const size of [30, 300, 1000]) {
    const store = await testRepository(undefined, stockedCamp());
    const service = new WorldService(
      store,
      readConfig({ OPEN_LEGEND_GOD_MODE: 'true', AI_BUDGET_USD: '0' }),
    );
    try {
      await enterLocalWorld(service);
      await service.setPresence('fixture', true);
      await editWorld(service, (world) => {
        for (let i = 0; i < size; i++)
          createItemLot(world, PLAYER_ID, 'berries', 1, `fixture-food-${i}`);
      });
      const scope = service.localScope,
        context = { catalogue: true };
      for (const kind of ['page', 'search', 'full'] as const) {
        const histogram = monitorEventLoopDelay({ resolution: 10 });
        histogram.enable();
        await new Promise((resolve) => setTimeout(resolve, 25));
        const memory = process.memoryUsage(),
          cpu = process.cpuUsage(),
          start = performance.now(),
          capture = startPerformanceCapture({ runtimeMonitoring: false });
        try {
          const result =
            kind === 'full'
              ? operatorActionCatalogue(service, context, PLAYER_ID, scope)
              : await operatorActionCataloguePage(service, context, PLAYER_ID, scope, {
                  limit: 50,
                  ...(kind === 'search' ? { query: `fixture-food-${size - 1}` } : {}),
                });
          const json = JSON.stringify(result),
            wallMs = performance.now() - start,
            cpuUsed = process.cpuUsage(cpu),
            after = process.memoryUsage(),
            metrics = performanceSnapshot();
          capture.stop();
          await new Promise((resolve) => setTimeout(resolve, 25));
          const row = {
            size,
            kind,
            wallMs,
            cpuMs: (cpuUsed.user + cpuUsed.system) / 1000,
            heapDelta: after.heapUsed - memory.heapUsed,
            rssDelta: after.rss - memory.rss,
            replyBytes: Buffer.byteLength(json),
            rows: 'items' in result ? result.items.length : result.actions.length,
            eventLoopMaximumMs: histogram.max / 1e6,
            metrics,
          };
          rows.push(row);
          console.log(JSON.stringify({ size, kind, wallMs, rows: row.rows }));
        } finally {
          capture.stop();
          histogram.disable();
        }
      }
    } finally {
      service.releaseHostWork();
      await store.close();
    }
  }
  const source = 'apps/server/src/action-catalogue.ts';
  await writeFile(
    output,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        sourceSha256: {
          [source]: createHash('sha256')
            .update(await readFile(source))
            .digest('hex'),
        },
        node: process.version,
        loadAverage: loadavg(),
        scope:
          'One sample per case, native service and preview owner, complete result JSON consumed. No GC/cache control, HTTP, browser or provider.',
        rows,
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
} finally {
  await closeTestDatabases();
}
