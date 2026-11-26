// Run through the verification supervisor on the standard worker. The mounted
// release and backup select the population, inventory and prior history.
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { openLab } from '../cognition-lab/session.mjs';
import { openWorkerGame } from '../verification-workers/native-game.ts';

const [output, ...extra] = process.argv.slice(2);
if (!output || extra.length) throw new Error('Supply one new worker report path.');
const game = await openWorkerGame({ lab: { budgetUsd: 0 } });
let lab;
try {
  lab = await openLab(game.base);
  const samples = [];
  async function measure(operation, work) {
    const at = performance.now();
    const value = await work();
    const wallMs = performance.now() - at;
    const bytes = Buffer.byteLength(JSON.stringify(value));
    samples.push({ operation, wallMs, jsonBytes: bytes });
    return value;
  }

  await measure('copy paused playable world into Lab', () =>
    lab.request('/prepare', { source: 'game' }),
  );
  const opening = await lab.state();
  await lab.control();
  for (const pass of ['first', 'repeat']) {
    await measure(pass + ' signed world view', () => lab.state());
    const menu = await measure(pass + ' ordinary action catalogue', () =>
      lab.request('/api/actions', { catalogue: true }),
    );
    if (!Array.isArray(menu.catalogue?.actions)) throw new Error('Missing native action list.');
    await measure(pass + ' decision inspector', () => lab.request('/decisions'));
    await measure(pass + ' retained runs', () => lab.request('/runs'));
    await measure(pass + ' checkpoint listing', () => lab.request('/api/saves/list', {}));
  }
  const checkpoint = randomUUID();
  await measure('checkpoint creation acknowledgement', () =>
    lab.request('/api/saves/create', {
      id: checkpoint,
      label: 'Performance fixture',
      scenario: true,
    }),
  );
  await writeFile(
    resolve(output),
    JSON.stringify(
      {
        source: game.sourceProvenance.ready,
        scope:
          'Signed, fully consumed Rust HTTP projections on the disposable worker world. Timings include request and decode. The save row measures its acknowledgement.',
        visibleEntities: opening.entities.length,
        samples,
      },
      null,
      2,
    ) + '\n',
    { flag: 'wx', mode: 0o600 },
  );
} finally {
  try {
    await lab?.close();
  } finally {
    await game.close();
  }
}
