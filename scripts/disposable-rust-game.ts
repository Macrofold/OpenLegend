import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import { createDisposableDatabase } from './disposable-postgres.mjs';

const run = promisify(execFile);

function input(name: string): string {
  const value = process.env[name];
  if (!value || !isAbsolute(value)) throw new Error(`${name} must name a prepared absolute path.`);
  return value;
}

/** Restore a current-format local or loopback sign-in backup into one owned database
 * before serving the native game. The caller owns the process, its game and
 * optional Lab databases, and the private checkpoint directory until close. */
export async function openDisposableRustGame({
  godMode = false,
  oidc,
  prepared,
  lab,
}: {
  godMode?: boolean;
  lab?: { budgetUsd: number; openingSha256: string; grantPath?: string };
  prepared?: { executable: string; release: string; backup: string; databaseAdmin: string };
  oidc?: { origin: string; issuer: string; clientId: string };
} = {}) {
  const executable = await realpath(prepared?.executable ?? input('OPENLEGEND_TEST_RUST_EXECUTABLE'));
  const release = prepared?.release ?? input('OPENLEGEND_TEST_RUST_RELEASE');
  const backup = prepared?.backup ?? input('OPENLEGEND_TEST_RUST_BACKUP');
  const origin = oidc ? new URL(oidc.origin) : undefined;
  if (oidc) {
    const issuer = new URL(oidc.issuer);
    if (
      origin?.protocol !== 'http:' ||
      origin.hostname !== '127.0.0.1' ||
      origin.origin !== oidc.origin ||
      !origin.port ||
      issuer.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost'].includes(issuer.hostname) ||
      !oidc.clientId
    )
      throw new Error(
        'The Rust browser fixture requires its loopback sign-in provider and origin.',
      );
  }
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-browser-rust-'));
  let closeDatabase: (() => Promise<void>) | undefined;
  let closeLab: (() => Promise<void>) | undefined;
  let closeServer: (() => Promise<void>) | undefined;
  const close = async () => {
    try {
      await closeServer?.();
    } finally {
      try {
        await closeLab?.();
      } finally {
        try {
          await closeDatabase?.();
        } finally {
          await rm(directory, { recursive: true });
        }
      }
    }
  };
  try {
    const database = await createDisposableDatabase(
      prepared?.databaseAdmin ?? process.env['OPENLEGEND_TEST_DATABASE_URL'],
    );
    closeDatabase = database.close;
    const url = new URL(database.url);
    url.searchParams.set('sslmode', 'disable');
    const env = {
      PATH: '/usr/bin:/bin',
      PORT: origin?.port ?? '0',
      OPEN_LEGEND_AUTH_MODE: oidc ? 'oidc' : 'local',
      OPEN_LEGEND_HOST: '127.0.0.1',
      OPEN_LEGEND_DATA_DIR: lab ? join(directory, 'game') : directory,
      OPEN_LEGEND_DATABASE_URL: url.href,
      AI_BUDGET_USD: '0',
      OPEN_LEGEND_GOD_MODE: String(godMode),
      ...(oidc && {
        OPEN_LEGEND_PUBLIC_ORIGIN: oidc.origin,
        OPEN_LEGEND_OIDC_LOOPBACK_HTTP: 'true',
        OPEN_LEGEND_OIDC_ISSUER: oidc.issuer,
        OPEN_LEGEND_OIDC_CLIENT_ID: oidc.clientId,
      }),
    };
    await run(executable, ['restore-world', release, backup], { env, timeout: 60_000 });

    const labDb = lab
      ? await createDisposableDatabase(
          prepared?.databaseAdmin ?? process.env['OPENLEGEND_TEST_DATABASE_URL'],
        )
      : undefined;
    closeLab = labDb?.close;
    if (labDb) await mkdir(join(directory, 'lab'), { mode: 0o700 });
    const child = spawn(executable, ['serve', release], {
      env: {
        ...env,
        ...(lab &&
          labDb && {
            OPEN_LEGEND_LAB_DATABASE_URL: labDb.url,
            OPEN_LEGEND_LAB_DATA_DIR: join(directory, 'lab'),
            OPEN_LEGEND_LAB_OPENING_SHA256: lab.openingSha256,
            OPEN_LEGEND_CAPTURE_INTELLIGENCE: 'true',
            OPEN_LEGEND_LAB_BUDGET_USD: String(lab.budgetUsd),
            ...(lab.grantPath && { OPENLEGEND_JOB_EXECUTION: lab.grantPath }),
          }),
      },
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
