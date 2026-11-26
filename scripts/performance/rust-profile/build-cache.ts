import { constants } from 'node:fs';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  realpath,
  rename,
  rm,
  statfs,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  containedFile,
  digest,
  gitHash,
  hashFile,
  integer,
  jsonFile,
  object,
  sha256,
  text,
  writeJson,
} from './contract.js';
import type { BuildMode } from './contract.js';
import type { RunnerInput } from './inputs.js';

const workerRoot = '/var/lib/openlegend-verification';
const cache = join(workerRoot, 'cache', 'rust-release');
const fileName = 'openlegend-game-server';
// Prior line-table release executables reach 544 MiB. The per-file cap
// leaves room for measured growth while bounding the four retained entries.
const executableLimit = 768 * 1024 ** 2;
const retainedEntries = 4;
const diskHeadroom = 10 * 1024 ** 3;
const pendingEntry = /^\.pending-[a-zA-Z0-9]{6}$/;

type RecordValue = Record<string, unknown>;

interface BuildContext {
  mode: BuildMode;
  sourcePath: string;
  source: RecordValue;
  home: string;
  work: string;
  output: string;
  inputs: RunnerInput[];
  recipeSha256: string;
  rustflags: string | undefined;
}

async function assertSealedCargoConfiguration() {
  // Cargo searches parent directories as well as the verified project and
  // the recipe's private CARGO_HOME. Only the latter two may configure it.
  let ancestor = dirname(process.cwd());
  for (;;) {
    for (const name of ['config', 'config.toml']) {
      try {
        await lstat(join(ancestor, '.cargo', name));
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
        throw error;
      }
      throw new Error('Found a Cargo configuration outside the verified source checkout.');
    }
    const parent = dirname(ancestor);
    if (parent === ancestor) return;
    ancestor = parent;
  }
}

async function buildInputs(context: BuildContext) {
  await assertSealedCargoConfiguration();
  const source = context.source;
  const files = object(source.files);
  const execution = object(source.execution);
  const machine = object(execution.machine);
  const hardware = object(execution.hardware);
  const cpu = text(hardware.cpuModel, 'worker CPU identity');
  const hostInputs = await Promise.all(
    [
      '/etc/os-release',
      '/var/lib/dpkg/status',
      '/usr/bin/bash',
      '/usr/bin/dash',
      '/usr/bin/tar',
      '/usr/bin/time',
    ].map(async (path) => [path, await hashFile(path)] as const),
  );
  const lock = (path: string) => text(object(files[path]).sha256, path, sha256);
  return {
    // The snapshot covers cross-package inputs and repository Cargo settings.
    // The commit also binds tracked file modes, which the byte catalog omits.
    sourceCommit: text(source.commit, 'supervised source commit', gitHash),
    sourceFilesSha256: text(source.sha256, 'supervised source files', sha256),
    cargoLockSha256: lock('native/Cargo.lock'),
    pnpmLockSha256: lock('pnpm-lock.yaml'),
    // The tools archive identifies the offline vendor tree, cargo, rustc, std,
    // Zig and pinned Node bytes. The staged recipe identifies the generated
    // linker wrapper, fixed Cargo environment and release command.
    bundles: Object.fromEntries(
      context.inputs
        .filter(({ id }) => id === 'tools' || id === 'language')
        .map(({ id, archiveSha256 }) => [id, archiveSha256]),
    ),
    recipeSha256: context.recipeSha256,
    worker: {
      image: text(machine.imageId, 'worker image identity'),
      kernel: text(hardware.kernel, 'worker kernel identity'),
      cpu: cpu.split('\n').filter((line) => /^(?:model name|microcode|flags)\s*:/.test(line)),
      installed: Object.fromEntries(hostInputs),
    },
    target: 'x86_64-unknown-linux-gnu',
    profile: 'release',
    features: [],
    rustflags: context.rustflags ?? null,
  };
}

async function prepareCache(context: BuildContext) {
  const execution = object(context.source.execution);
  const run = text(execution.runId, 'worker run ID', /^[a-f0-9]{32}$/);
  const caseId = text(execution.caseId, 'worker case ID', /^[a-zA-Z0-9_-]+$/);
  const ownedCase = join(workerRoot, 'runs', run, 'cases', caseId);
  if (
    (await realpath(context.sourcePath)) !== join(ownedCase, 'source.json') ||
    context.home !== join(ownedCase, 'home')
  )
    throw new Error('Rust build reuse requires the supervisor’s exclusive worker case.');

  // The supervisor fences and serializes all commands on this host. An old
  // command is stopped before the next claim can start, including after reboot.
  await mkdir(cache, { mode: 0o700, recursive: true });
  const info = await lstat(cache);
  if (
    (await realpath(cache)) !== cache ||
    !info.isDirectory() ||
    info.uid !== process.getuid?.() ||
    (info.mode & 0o777) !== 0o700
  )
    throw new Error('The worker Rust build cache is not a private directory.');

  const interrupted = (await readdir(cache)).filter((name) => pendingEntry.test(name));
  for (const name of interrupted) await rm(join(cache, name), { recursive: true, force: true });
  return interrupted.length;
}

function executable(value: unknown, limit = Number.MAX_SAFE_INTEGER) {
  const record = object(value, 'Rust executable descriptor');
  return {
    bytes: integer(record.bytes, 'Rust executable bytes', 1, limit),
    sha256: text(record.sha256, 'Rust executable SHA-256', sha256),
  };
}

function compiledBuild(value: unknown, limit?: number) {
  const toolchain = object(value, 'Rust build receipt');
  const elapsed = object(toolchain.rustCompilation, 'Rust compiler timing');
  const duration = (name: string) => {
    const value = elapsed[name];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
      throw new Error(`Invalid Rust compiler timing: ${name}.`);
    return value;
  };
  return {
    source: text(toolchain.source, 'original build source', gitHash),
    sourceArchiveSha256: text(toolchain.sourceArchiveSha256, 'original source archive', sha256),
    execution: object(toolchain.execution, 'original build execution'),
    rust: object(toolchain.rust, 'original Rust toolchain'),
    executable: executable(toolchain.executable, limit),
    rustCompilation: {
      elapsedMs: duration('elapsedMs'),
      userSeconds: duration('userSeconds'),
      systemSeconds: duration('systemSeconds'),
    },
  };
}

class ChecksumMismatch extends Error {}

async function checkedCopy(root: string, path: string, candidate: unknown, target: string) {
  const expected = executable(candidate);
  const file = await containedFile(root, path, expected.bytes);
  const info = await lstat(file.path);
  if (file.bytes !== expected.bytes || info.uid !== process.getuid?.() || !(info.mode & 0o100))
    throw new Error('The Rust executable has an unexpected size, owner, or mode.');
  await copyFile(file.path, target, constants.COPYFILE_EXCL);
  await chmod(target, 0o500);
  if ((await hashFile(target)) !== expected.sha256)
    throw new ChecksumMismatch('The Rust executable checksum does not match.');
}

async function corrupt(entry: string) {
  if ((await realpath(entry)) !== entry)
    throw new Error('The diagnostic cache entry is redirected.');
  const path = (await containedFile(entry, fileName, executableLimit)).path;
  const info = await lstat(path);
  if (info.uid !== process.getuid?.() || info.nlink !== 1 || (info.mode & 0o777) !== 0o500)
    throw new Error('The diagnostic needs an immutable, independently owned cache file.');
  await chmod(path, 0o700);
  try {
    const file = await open(path, 'r+');
    try {
      // Damage the ELF magic without changing the expected length so checksum
      // validation, rather than a missing file or size check, has to reject it.
      await file.write(Buffer.from([0]), 0, 1, 0);
    } finally {
      await file.close();
    }
  } finally {
    await chmod(path, 0o500);
  }
}

async function retain(
  home: string,
  entry: string,
  identity: string,
  inputs: Awaited<ReturnType<typeof buildInputs>>,
  toolchain: RecordValue,
  build: ReturnType<typeof compiledBuild>,
) {
  if (build.executable.bytes > executableLimit) return false;
  const disk = await statfs(cache);
  if (disk.bavail * disk.bsize < diskHeadroom + build.executable.bytes) return false;
  const previous = await Promise.all(
    (await readdir(cache))
      .filter((name) => sha256.test(name))
      .map(async (name) => ({ name, mtime: (await lstat(join(cache, name))).mtimeMs })),
  );
  previous.sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name));
  for (const old of previous.slice(retainedEntries - 1))
    await rm(join(cache, old.name), { recursive: true, force: true });

  const pending = await mkdtemp(join(cache, '.pending-'));
  try {
    const descriptor = object(toolchain.executable);
    const path = text(descriptor.path, 'private built executable path');
    const prefix = home + '/';
    if (!path.startsWith(prefix))
      throw new Error('Build executable is outside its private workspace.');
    await checkedCopy(home, path.slice(prefix.length), descriptor, join(pending, fileName));
    await writeJson(join(pending, 'build.json'), { identity, inputs, originalBuild: build });
    // The checked executable and its receipt appear together, after the build
    // helper has exited successfully. Interrupted temporary entries are reaped.
    await rename(pending, entry);
    return true;
  } finally {
    await rm(pending, { recursive: true, force: true });
  }
}

/** Runs only inside an exclusive managed worker case. Stages a checked copy
 * into its private workspace and records current preparation separately from
 * the original successful compile. The caller still owns gameplay and cleanup.
 */
export async function prepareReusableCaseBuild(
  context: BuildContext,
  build: (staged?: string) => Promise<void>,
) {
  const identityStart = performance.now();
  const inputs = await buildInputs(context);
  const identity = digest(inputs);
  const identityMs = performance.now() - identityStart;
  const compileReceipt = async (staged?: string) => {
    await build(staged);
    return object(await jsonFile(context.output, 'toolchain.json'));
  };
  if (context.mode === 'fresh-build') {
    const receipt = await compileReceipt();
    const originalBuild = compiledBuild(receipt);
    return writeBuildReceipt(context.output, receipt, {
      status: 'fresh',
      identity,
      inputs,
      identityMs,
      validationMs: 0,
      bytesReused: 0,
      rustCompilation: originalBuild.rustCompilation,
      originalBuild,
    });
  }

  const interruptedEntriesRemoved = await prepareCache(context);
  const entry = join(cache, identity);
  const staged = join(context.work, fileName);
  if (context.mode === 'corrupt-build') await corrupt(entry);
  let originalBuild: ReturnType<typeof compiledBuild> | undefined;
  let found = false;
  let rejection: 'checksum-mismatch' | 'invalid-entry' | undefined;
  const validationStart = performance.now();
  try {
    // A missing top-level entry is an ordinary miss. A published but
    // incomplete entry is rejected even when one of its files is missing.
    const info = await lstat(entry);
    found = true;
    if (!info.isDirectory() || info.uid !== process.getuid?.())
      throw new Error('Invalid worker Rust cache entry.');
    const record = object(await jsonFile(entry, 'build.json', 64 * 1024));
    if (record.identity !== identity || digest(record.inputs) !== identity)
      throw new Error('The Rust build inputs do not match.');
    const previous = compiledBuild(record.originalBuild, executableLimit);
    const previousFile = await lstat(join(entry, fileName));
    if (previousFile.nlink !== 1 || (previousFile.mode & 0o777) !== 0o500)
      throw new Error('The retained Rust executable is not immutable.');
    await checkedCopy(entry, fileName, previous.executable, staged);
    originalBuild = previous;
  } catch (error) {
    if (found) {
      rejection = error instanceof ChecksumMismatch ? 'checksum-mismatch' : 'invalid-entry';
      await rm(staged, { force: true });
      await rm(entry, { recursive: true, force: true });
    } else if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }
  const validationMs = performance.now() - validationStart;
  if (originalBuild) {
    const receipt = await compileReceipt(staged);
    const stagedExecutable = executable(receipt.executable);
    if (digest(stagedExecutable) !== digest(originalBuild.executable))
      throw new Error('The gameplay preparer read different Rust executable bytes.');
    return writeBuildReceipt(context.output, receipt, {
      status: 'hit',
      identity,
      inputs,
      identityMs,
      validationMs,
      bytesReused: stagedExecutable.bytes,
      interruptedEntriesRemoved,
      rustCompilation: { elapsedMs: 0, userSeconds: 0, systemSeconds: 0 },
      originalBuild,
    });
  }

  const receipt = await compileReceipt();
  originalBuild = compiledBuild(receipt);
  const retained = await retain(context.home, entry, identity, inputs, receipt, originalBuild);
  return writeBuildReceipt(context.output, receipt, {
    status: rejection ? 'rebuilt' : 'miss',
    identity,
    inputs,
    identityMs,
    validationMs,
    bytesReused: 0,
    rejection,
    interruptedEntriesRemoved,
    rustCompilation: originalBuild.rustCompilation,
    retained,
    originalBuild,
  });
}

async function writeBuildReceipt(output: string, receipt: RecordValue, buildReuse: RecordValue) {
  const amended: RecordValue = { ...receipt, buildReuse };
  const path = join(output, 'toolchain.json');
  const amendedPath = path + '.prepared';
  await writeJson(amendedPath, amended);
  await rename(amendedPath, path);
  return amended;
}
