import { chmod, lstat, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import {
  containedFile,
  hashFile,
  integer,
  jsonFile,
  object,
  sha256,
  text,
  writeJson,
} from './contract.js';
import type { CasePlan } from './contract.js';

type RecordValue = Record<string, unknown>;

function binding(plan: CasePlan, source: RecordValue) {
  const execution = object(source.execution);
  return {
    runId: execution.runId,
    generation: execution.generation,
    runnerCaseId: execution.caseId,
    source: plan.source,
    toolSource: plan.toolSource,
    sourceArchiveSha256: source.archiveSha256,
    comparisonIdentity: plan.comparisonIdentity,
    flavor:
      plan.mode === 'disabled' || plan.mode === 'enabled' ? 'profile-campaign' : 'frame-pointers',
  };
}

/** Shares one immutable executable between two arms of one owned worker case.
 * Each arm still launches its own process and uses its own fresh database.
 */
export async function readCaseBuild(
  plan: CasePlan,
  source: RecordValue,
  output: string,
  shared: string,
  build: () => Promise<void>,
) {
  const seal = binding(plan, source);
  const paired = plan.sharedBuild;
  const home = dirname(shared);
  if (paired?.role === 'second') {
    const proof = object(await jsonFile(shared, 'toolchain.json'));
    const recorded = object(proof.binding);
    if (
      Object.entries(seal).some(([key, value]) => recorded[key] !== value) ||
      proof.first !== paired.peerId ||
      proof.second !== plan.id
    ) {
      throw new Error('The preceding build was owned by a different comparison or worker case.');
    }
    const toolchain = object(proof.toolchain);
    const path = text(proof.executableRelativePath, 'sealed executable path');
    await verifyExecutable(home, path, object(toolchain.executable), false);
    await writeJson(join(output, 'toolchain.json'), toolchain);
    return toolchain;
  }
  await build();
  const toolchain = object(await jsonFile(output, 'toolchain.json'));
  if (!paired) return toolchain;
  const executable = object(toolchain.executable);
  const artifact = text(executable.path, 'built executable path');
  const executableRelativePath = relative(home, artifact);
  await verifyExecutable(home, executableRelativePath, executable, true);
  await mkdir(shared, { mode: 0o700 });
  await writeJson(join(shared, 'toolchain.json'), {
    binding: seal,
    first: plan.id,
    second: paired.peerId,
    executableRelativePath,
    toolchain,
  });
  return toolchain;
}

/** The executable stays in the supervisor's case HOME through both arms.
 * Use the pinned builder's observed size as the bound, not the export cap.
 */
async function verifyExecutable(
  home: string,
  path: string,
  descriptor: RecordValue,
  freeze: boolean,
) {
  const bytes = integer(
    descriptor.bytes,
    'built executable byte count',
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const expected = text(descriptor.sha256, 'built executable digest', sha256);
  const file = await containedFile(home, path, bytes);
  const stat = await lstat(file.path);
  if (
    descriptor.path !== file.path ||
    file.bytes !== bytes ||
    stat.uid !== process.getuid?.() ||
    !(stat.mode & 0o100) ||
    (!freeze && stat.mode & 0o222)
  )
    throw new Error('The paired executable has unexpected ownership, path, size or mode.');
  if (freeze) await chmod(file.path, 0o500);
  if ((await hashFile(file.path)) !== expected)
    throw new Error('The paired executable does not match the built digest.');
}
