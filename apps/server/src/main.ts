import { createGameServer } from './http.js';
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
  console.log(
    config.databaseUrl ? 'Persistence: PostgreSQL' : `Local save: ${config.databasePath}`,
  );
  console.log(
    config.macrofoldKey || (config.jevKey && config.llmKey)
      ? `Live AI enabled with a $${config.budgetUsd.toFixed(2)} world spending cap.`
      : 'Live AI not configured. Native survival is available; see .env.example for the live experience.',
  );
});
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    void game
      .close()
      .then(() => {
        process.exitCode = 0;
      })
      .catch(() => {
        process.exitCode = 1;
      });
  });
