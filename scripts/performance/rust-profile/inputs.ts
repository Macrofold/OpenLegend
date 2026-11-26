import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { containedFile, hashFile, jsonFile, object, text } from './contract.js';

interface InputDescriptor {
  campaign: string;
  sha256: string;
  archiveSha256: string;
  files: Record<string, { bytes: number; sha256: string }>;
}

export interface RunnerInput {
  id: string;
  root: string;
  paths: string[];
  sha256: string;
  archiveSha256: string;
}

const frozen = JSON.parse(
  await readFile(new URL('./frozen-inputs.json', import.meta.url), 'utf8'),
) as Record<string, InputDescriptor>;

function inputIds(diagnostics: readonly ('sampled' | 'sql')[]): string[] {
  return [
    'tools',
    'driver',
    'language',
    ...(diagnostics.includes('sampled') ? ['profile', 'linux-tools'] : []),
    ...(diagnostics.includes('sql') ? ['sql'] : []),
  ];
}

async function verifyInput(id: string, root: string) {
  const descriptor = frozen[id]!;
  const paths = Object.keys(descriptor.files);
  await Promise.all(
    paths.map(async (path) => {
      const member = descriptor.files[path]!;
      const file = await containedFile(root, path, member.bytes);
      if (file.bytes !== member.bytes || (await hashFile(file.path)) !== member.sha256)
        throw new Error(`Frozen Rust input does not match: ${id}/${path}.`);
    }),
  );
  return { id, root, paths, sha256: descriptor.sha256, archiveSha256: descriptor.archiveSha256 };
}

/** Verifies every file from the retained worker manifest before returning a worker input descriptor.
 * Archives can be restored under rust-profile-inputs/<archiveSha256> in the verification directory.
 * No files are copied, fetched or modified here.
 */
export async function resolvePinnedInputs(
  verificationDirectory: string,
  diagnostics: readonly ('sampled' | 'sql')[] = [],
): Promise<RunnerInput[]> {
  const directory = resolve(verificationDirectory);
  return Promise.all(
    inputIds(diagnostics).map(async (id) => {
      const descriptor = frozen[id]!;
      const archiveRoot = join(directory, 'rust-profile-inputs', descriptor.archiveSha256);
      const manifestPath = `workers/campaigns/${descriptor.campaign}/manifest.json`;
      let descriptorRoot: string;
      try {
        const manifest = object(await jsonFile(directory, manifestPath), 'frozen worker manifest');
        const receipt = object(object(manifest.inputs)[id], 'frozen input receipt');
        if (
          receipt.sha256 !== descriptor.sha256 ||
          receipt.archiveSha256 !== descriptor.archiveSha256
        )
          throw new Error(`The frozen worker manifest identifies different ${id} input.`);
        const plan = object(manifest.plan, 'frozen worker plan');
        if (!Array.isArray(plan.inputs)) throw new Error('Missing frozen worker inputs.');
        const input = plan.inputs.map((item) => object(item)).find((item) => item.id === id);
        descriptorRoot = text(input?.root, 'frozen input root');
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
        return verifyInput(id, archiveRoot);
      }
      try {
        return await verifyInput(id, descriptorRoot);
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
        return verifyInput(id, archiveRoot);
      }
    }),
  );
}

/** Verifies the file bytes the supervised job will actually execute or load.
 * Call before copying or adapting the frozen scripts.
 */
export async function verifyCaseInputs(
  root: string,
  hashes: Record<string, string>,
  modes: readonly ('sampled' | 'sql')[],
) {
  return Promise.all(
    inputIds(modes).map(async (id) => {
      const entry = await verifyInput(id, join(root, id));
      if (entry.sha256 !== hashes[id]) throw new Error(`Unexpected planned input hash for ${id}.`);
      return entry;
    }),
  );
}
