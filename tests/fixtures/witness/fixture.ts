import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { entityValues } from '../../../packages/domain/src/entity-collection.js';
import { bodyProfile, spatialMap } from '../../../packages/domain/src/spatial-state.js';
import type { WorldState } from '../../../packages/domain/src/types.js';
import { writeRustNavigationRelease } from '../../../scripts/rust-game-server-navigation.js';
import { writeRustGameServerStorage } from '../../../scripts/rust-game-server-storage.js';

export function witnessInputs(output: string | undefined) {
  assert(output, 'Supply a new output directory outside the Git checkout.');
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const adminUrl = process.env.OPENLEGEND_TEST_DATABASE_URL;
  const language = process.env.OPENLEGEND_WITNESS_LANGUAGE;
  assert(adminUrl, 'Set OPENLEGEND_TEST_DATABASE_URL to a loopback PostgreSQL admin URL.');
  assert(language, 'Set OPENLEGEND_WITNESS_LANGUAGE to a built native language directory.');
  return {
    root,
    output: resolve(output),
    adminUrl,
    language: resolve(language),
    executable: resolve(
      process.env.OPENLEGEND_WITNESS_BINARY ??
        join(root, 'native/target/release/openlegend-game-server'),
    ),
    browser: resolve(process.env.OPENLEGEND_WITNESS_BROWSER ?? join(root, 'dist/client')),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  };
}

/** Export the same current records, navigation and settings the native game loads. */
export async function prepareWitnessRelease({
  output,
  databaseUrl,
  world,
  language,
  browser,
}: {
  output: string;
  databaseUrl: string;
  world: WorldState;
  language: string;
  browser: string;
}): Promise<string> {
  const release = join(output, 'release');
  await writeRustGameServerStorage(release, databaseUrl);
  await writeRustNavigationRelease(
    join(release, 'navigation'),
    spatialMap(world),
    [...entityValues(world.entities)].filter((entity) => entity.actor).map(bodyProfile),
  );
  await Promise.all([
    symlink(language, join(release, 'language'), 'dir'),
    symlink(browser, join(release, 'browser'), 'dir'),
  ]);
  return release;
}

/** Wait for one complete loopback listener line. The caller still owns shutdown and logs. */
async function waitForGameListener(stdout: Readable, closed: Promise<unknown>): Promise<string> {
  let tail = '';
  let consume: (chunk: Buffer) => void = () => {};
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const listening = new Promise<string>((resolveAddress, reject) => {
    consume = (chunk) => {
      const output = tail + chunk.toString();
      const address = /^OpenLegend listening on (127\.0\.0\.1:\d+)\r?\n/m.exec(output)?.[1];
      if (address) resolveAddress('http://' + address);
      tail = output.slice(-128);
    };
    stdout.on('data', consume);
    timeout = setTimeout(
      () =>
        reject(new Error('Game server did not announce a loopback listener before the deadline.')),
      60_000,
    );
  });
  try {
    return await Promise.race([
      listening,
      closed.then((status) => {
        throw new Error(
          'Game server closed before announcing its listener: ' + JSON.stringify(status),
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    stdout.off('data', consume);
  }
}

/** Start one owned server with no inherited database or provider credentials. */
export function launchWitnessServer({
  executable,
  release,
  output,
  label,
  databaseUrl,
  provider,
}: {
  executable: string;
  release: string;
  output: string;
  label: string;
  databaseUrl: string;
  provider?: { url: string; key: string; certPath: string };
}) {
  if (provider) {
    const endpoint = new URL(provider.url);
    assert(
      endpoint.protocol === 'https:' &&
        endpoint.hostname === '127.0.0.1' &&
        endpoint.port &&
        provider.key &&
        provider.certPath,
      'Witness verification accepts only its loopback HTTPS fixture provider.',
    );
  }
  const database = new URL(databaseUrl);
  database.searchParams.set('sslmode', 'disable');
  const stack = process.env.OPENLEGEND_WITNESS_RUST_MIN_STACK;
  const child = spawn(executable, ['serve', release], {
    env: {
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      PORT: '0',
      OPEN_LEGEND_HOST: '127.0.0.1',
      OPEN_LEGEND_AUTH_MODE: 'local',
      OPEN_LEGEND_GOD_MODE: 'true',
      OPEN_LEGEND_PAUSE_WHEN_HIDDEN: 'false',
      OPEN_LEGEND_DATA_DIR: join(output, 'runtime'),
      OPEN_LEGEND_DATABASE_URL: database.href,
      ...(stack ? { RUST_MIN_STACK: stack } : {}),
      ...(provider
        ? {
            AI_BUDGET_USD: '2',
            MACROFOLD_API_KEY: provider.key,
            MACROFOLD_BASE_URL: provider.url,
            SSL_CERT_FILE: provider.certPath,
          }
        : { AI_BUDGET_USD: '0' }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
  child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
  const closed = once(child, 'close');
  const ready = waitForGameListener(child.stdout, closed);
  return {
    ready,
    pid: child.pid,
    async stop() {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      const escalation = setTimeout(() => child.kill('SIGKILL'), 18_000).unref();
      try {
        assert.deepEqual(await closed, [0, null], stdout + stderr);
        const finalMemory = [...stdout.matchAll(/^OpenLegend native memory (\{[^\n]+\})$/gm)].at(
          -1,
        )?.[1];
        assert(finalMemory, 'Game server did not report its shutdown memory totals.');
        const { transientBytes, residentBytes, pendingSaveBytes } = JSON.parse(finalMemory);
        assert.deepEqual([transientBytes, residentBytes, pendingSaveBytes], [0, 0, 0]);
      } finally {
        clearTimeout(escalation);
        await writeFile(join(output, label + '.log'), stdout + stderr);
      }
    },
  };
}
