import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import type { Page } from '@playwright/test';
import { createDisposableDatabase } from '../../scripts/disposable-postgres.mjs';

const run = promisify(execFile);

function input(name: string): string {
  const value = process.env[name];
  if (!value || !isAbsolute(value)) throw new Error(`${name} must name a prepared absolute path.`);
  return value;
}

/** Restore a current-format, local-auth fixture backup into one owned database
 * before serving the production browser. The test runner owns all three
 * lifetimes (process, database, private checkpoint directory) until close. */
export async function rustBrowserGame(options: { godMode?: boolean } = {}) {
  const executable = input('OPENLEGEND_TEST_RUST_EXECUTABLE');
  const release = input('OPENLEGEND_TEST_RUST_RELEASE');
  const backup = input('OPENLEGEND_TEST_RUST_BACKUP');
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-browser-rust-'));
  let closeDatabase: (() => Promise<void>) | undefined;
  let closeServer: (() => Promise<void>) | undefined;
  const close = async () => {
    try {
      await closeServer?.();
    } finally {
      await closeDatabase?.();
      await rm(directory, { recursive: true });
    }
  };
  try {
    const database = await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']);
    closeDatabase = database.close;
    const url = new URL(database.url);
    url.searchParams.set('sslmode', 'disable');
    const env = {
      PATH: '/usr/bin:/bin',
      PORT: '0',
      OPEN_LEGEND_AUTH_MODE: 'local',
      OPEN_LEGEND_HOST: '127.0.0.1',
      OPEN_LEGEND_DATA_DIR: directory,
      OPEN_LEGEND_DATABASE_URL: url.href,
      AI_BUDGET_USD: '0',
      OPEN_LEGEND_GOD_MODE: String(options.godMode ?? false),
    };
    await run(executable, ['restore-world', release, backup], { env, timeout: 60_000 });

    const child = spawn(executable, ['serve', release], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = new Promise<number | null>((resolve) => child.once('close', resolve));
    let diagnostics = '';
    let startup: ReturnType<typeof setTimeout> | undefined;
    const capture = (chunk: Buffer) => {
      diagnostics = (diagnostics + chunk.toString()).slice(-32_768);
    };
    const ready = new Promise<string>((resolve, reject) => {
      let stdout = '';
      child.stdout.on('data', (chunk: Buffer) => {
        capture(chunk);
        stdout = (stdout + chunk.toString()).slice(-512);
        const address = stdout.match(/^OpenLegend listening on (127\.0\.0\.1:\d+)\r?\n/m)?.[1];
        if (address) resolve(`http://${address}`);
      });
      child.stderr.on('data', capture);
      child.once('error', reject);
      child.once('close', () => reject(new Error(`Rust exited before listening.\n${diagnostics}`)));
      startup = setTimeout(() => reject(new Error(`Rust did not listen.\n${diagnostics}`)), 30_000);
    });
    closeServer = async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      const escalation = setTimeout(() => child.kill('SIGKILL'), 15_000).unref();
      try {
        if ((await exited) !== 0)
          throw new Error(`Fixture Rust server did not shut down cleanly.\n${diagnostics}`);
      } finally {
        clearTimeout(escalation);
      }
    };
    try {
      const base = await ready;
      return { base, close };
    } finally {
      clearTimeout(startup);
    }
  } catch (error) {
    try {
      await close();
    } catch (retirementError) {
      throw new AggregateError([error, retirementError], 'Rust browser fixture did not open.');
    }
    throw error;
  }
}

/** A signed read belongs to the actual browser tab, using its current session
 * cookie and client identity. It never refreshes or replaces control. */
export async function browserTabHeaders(page: Page): Promise<Record<string, string>> {
  const client = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
  if (!client) throw new Error('The game tab has not established its browser identity.');
  return { 'X-OL-Client': client };
}
