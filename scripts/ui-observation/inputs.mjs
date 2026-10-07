import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { expectedCommit, repository, sourceManifest } from './paths.mjs';

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function verifyFiles(files) {
  for (const entry of files) {
    const bytes = await readFile(repository + '/' + entry.path);
    if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256)
      throw new Error('Approved input changed: ' + entry.path);
  }
}
export async function verifiedSource() {
  const bytes = await readFile(sourceManifest);
  const source = JSON.parse(bytes);
  if (source.commit !== expectedCommit || !source.files?.length)
    throw new Error('The exact reviewed source commit and file hashes are required.');
  await verifyFiles(source.files);
  return { source, bytes };
}
export async function listBuild(directory = repository + '/dist/client') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) files.push(...(await listBuild(path)));
    else if (entry.isFile()) files.push(path.slice(repository.length + 1));
    else throw new Error('Unexpected symlink or special file in the approved build.');
  }
  return files.sort();
}
