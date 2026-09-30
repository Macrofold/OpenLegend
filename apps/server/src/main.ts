import { createGameServer, SHUTDOWN_DEADLINE_MS } from './http.js';
import { readConfig } from './config.js';

const config = readConfig();
const game = await createGameServer({ config, production: process.argv.includes('--production') });
game.server.on('error', (error) => {
  console.error(`Open Legend could not start: ${error.message}`);
  process.exitCode = 1;
  void game.close();
});
game.server.listen(config.port, config.host, () => {
  console.log(`Open Legend · http://${config.host}:${config.port}`);
  console.log('Persistence: PostgreSQL');
  console.log(
    config.macrofoldKey || config.jevKey
      ? `Live AI enabled with a $${config.budgetUsd.toFixed(2)} per-agent monthly spending cap.`
      : 'Live AI not configured. Native world mechanics remain available; see .env.example for the live experience.',
  );
});
let closing = false;
let firstSignalAt = 0;
let reported = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    // After the report the process is only waiting to exit; a late signal changes nothing.
    if (reported) return;
    if (closing) {
      // `tsx watch` (pnpm dev) relays the terminal's Ctrl-C as a second SIGINT within
      // milliseconds; treat that as the same request. A later repeat exits at once.
      if (performance.now() - firstSignalAt < 1_000) return;
      console.error(
        `Open Legend: second signal; exiting before shutdown finished. Last confirmed durable revision ${game.service.durable.revision}; later routine progress may not be saved.`,
      );
      process.exit(130);
    }
    closing = true;
    firstSignalAt = performance.now();
    // Shutdown stages share SHUTDOWN_DEADLINE_MS; this backstop covers a stage that ignores it.
    setTimeout(() => {
      console.error('Open Legend: shutdown exceeded its backstop; exiting without a clean close.');
      process.exit(1);
    }, SHUTDOWN_DEADLINE_MS + 15_000).unref();
    const report = await game.shutdown().catch((error: unknown) => ({
      saved: false,
      durableRevision: game.service.durable.revision,
      durableSimTime: game.service.durable.simTime,
      problems: [`Shutdown failed: ${error instanceof Error ? error.message : 'unknown error'}`],
    }));
    reported = true;
    for (const problem of report.problems) console.error(`Open Legend shutdown: ${problem}`);
    // Without a confirmed final save, a commit abandoned at its deadline may still have reached
    // the database, so the message states only what this process confirmed.
    console.log(
      report.saved
        ? `Open Legend stopped; world saved at revision ${report.durableRevision}.`
        : `Open Legend stopped WITHOUT a confirmed final save; the last revision confirmed durable is ${report.durableRevision}${report.durableSimTime === undefined ? '' : ` (simulation time ${report.durableSimTime.toFixed(1)} s)`}. Later routine progress may not have been saved; the database may be ahead if a commit was still outstanding.`,
    );
    process.exitCode = report.saved && !report.problems.length ? 0 : 1;
    // Normally nothing remains and the process exits now. A stage abandoned at its deadline
    // (for example a stalled database socket) would keep it alive until the backstop.
    setTimeout(() => process.exit(), 1_000).unref();
  });
