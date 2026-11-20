import { constants } from 'node:fs';
import { chmod, copyFile, lstat, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { containedFile, hashFile, jsonFile, object, sha256, text, writeJson } from './contract.js';
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
    const executable = object(toolchain.executable);
    const file = await containedFile(shared, 'openlegend-game-server');
    if (executable.path !== file.path || executable.sha256 !== (await hashFile(file.path)))
      throw new Error('The paired executable changed before the second arm.');
    await writeJson(join(output, 'toolchain.json'), toolchain);
    return toolchain;
  }
  await build();
  const toolchain = object(await jsonFile(output, 'toolchain.json'));
  if (!paired) return toolchain;
  const executable = object(toolchain.executable);
  const artifact = text(executable.path, 'built executable path');
  const expected = text(executable.sha256, 'built executable digest', sha256);
  const stat = await lstat(artifact);
  if (!stat.isFile() || !(stat.mode & 0o100) || (await hashFile(artifact)) !== expected)
    throw new Error('The application builder did not produce the exact runnable executable.');
  await mkdir(shared, { mode: 0o700 });
  const immutable = join(shared, 'openlegend-game-server');
  await copyFile(artifact, immutable, constants.COPYFILE_EXCL);
  await chmod(immutable, 0o500);
  const published = await containedFile(shared, 'openlegend-game-server');
  if ((await hashFile(published.path)) !== expected)
    throw new Error('The pair-owned executable copy failed its identity check.');
  toolchain.executable = { ...executable, path: published.path };
  await writeJson(join(shared, 'toolchain.json'), {
    binding: seal,
    first: plan.id,
    second: paired.peerId,
    toolchain,
  });
  await writeJson(join(output, 'toolchain.json'), toolchain, false);
  return toolchain;
}
