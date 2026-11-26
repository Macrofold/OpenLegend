import { dirname, join } from 'node:path';
import { stat, realpath } from 'node:fs/promises';
import { openDisposableRustGame } from '../disposable-rust-game.js';
import {
  readVerifiedWorkerPostgres,
  readVerifiedWorkerSource,
} from '../performance/rust-profile/managed-postgres.js';
import {
  containedFile,
  hashFile,
  integer,
  jsonFile,
  object,
  sha256,
  text,
} from '../performance/rust-profile/contract.js';
function configured(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`The worker did not supply ${name}.`);
  return value;
}

export interface WorkerLabOptions {
  budgetUsd: number;
  grantPath?: string;
}

// Shared managed admission reads only the root-owned current case receipts
// and the checksum-bounded native input. The caller must close both its
// game process and all case databases through the returned close().
export async function openWorkerGame(options: { lab?: WorkerLabOptions } = {}) {
  const sourcePath = configured('OPENLEGEND_VERIFICATION_MANIFEST');
  const source = await readVerifiedWorkerSource(sourcePath);
  await readVerifiedWorkerPostgres(
    configured('OPENLEGEND_JOB_POSTGRES_OWNERSHIP'),
    source.execution,
  );
  const inputs = configured('OPENLEGEND_JOB_INPUTS');
  const runtime = join(inputs, 'runtime');
  const build = object(await jsonFile(runtime, 'toolchain.json'));
  const descriptor = object(build.executable);
  const binary = await containedFile(
    runtime,
    'openlegend-game-server',
    integer(descriptor.bytes, 'Rust executable bytes', 1, Number.MAX_SAFE_INTEGER),
  );
  const binaryDigest = text(descriptor.sha256, 'Rust executable checksum', sha256);
  if (
    build.source !== source.commit ||
    build.sourceArchiveSha256 !== source.receipt.archiveSha256 ||
    binary.bytes !== descriptor.bytes ||
    (await hashFile(binary.path)) !== binaryDigest
  )
    throw new Error(
      'The prepared Rust executable differs from the supervised case source or build receipt.',
    );

  const lab = options.lab;
  if (lab) {
    if (
      !Number.isFinite(lab.budgetUsd) ||
      lab.budgetUsd < 0 ||
      Boolean(lab.grantPath) !== lab.budgetUsd > 0
    )
      throw new Error('A paid Lab requires a positive finite budget and its original job grant.');
    if (lab.grantPath) {
      const expected = join(dirname(sourcePath), 'execution-private.json');
      if (
        lab.grantPath !== configured('OPENLEGEND_JOB_EXECUTION') ||
        (await realpath(lab.grantPath)) !== expected
      )
        throw new Error('The paid capability does not belong to this case.');
      const info = await stat(expected);
      if (info.uid !== 0 || info.mode & 0o222)
        throw new Error('The paid capability is not sealed by the supervisor.');
      const grant = object(
        await jsonFile(dirname(sourcePath), 'execution-private.json', 128 * 1024),
      );
      const ceiling = integer(grant.limitMicroUsd, 'funded job limit', 1, 100_000_000);
      if (
        lab.budgetUsd > ceiling / 1e6 ||
        grant.sourceHash !== source.receipt.archiveSha256 ||
        grant.caseId !== source.execution.caseId ||
        typeof grant.deadlineMs !== 'number' ||
        grant.deadlineMs <= Date.now()
      )
        throw new Error('The active job grant does not fund this source, case and Lab budget.');
    }
  }
  const game = await openDisposableRustGame({
    ...(options.lab && {
      godMode: true,
      lab: {
        ...options.lab,
        openingSha256: await hashFile(join(inputs, 'release', 'opening.json')),
      },
    }),
    prepared: {
      executable: binary.path,
      release: join(inputs, 'release'),
      backup: join(inputs, 'backup'),
      databaseAdmin: configured('OPEN_LEGEND_PROFILE_POSTGRES_URL'),
    },
  });
  const sourceProvenance = {
    ready: {
      head: source.commit,
      archiveSha256: source.receipt.archiveSha256,
      executableSha256: binaryDigest,
    },
  };
  return { ...game, sourceProvenance };
}
