import { readFile, writeFile } from 'node:fs/promises';
import { buildManifest, repository } from './paths.mjs';
import { hash, listBuild, verifiedSource } from './inputs.mjs';

// Run after the workflow's inspected pnpm build step. This captures its outputs;
// the preceding workflow log remains the evidence that the build actually ran.
const { source, bytes } = await verifiedSource();
const files = [];
for (const path of await listBuild()) {
  const data = await readFile(repository + '/' + path);
  files.push({ path, bytes: data.length, sha256: hash(data) });
}
if (!files.some((entry) => entry.path === 'dist/client/index.html'))
  throw new Error('The production client build is absent.');
await writeFile(
  buildManifest,
  JSON.stringify(
    {
      commit: source.commit,
      capturedUtc: new Date().toISOString(),
      sourceManifestSha256: hash(bytes),
      provenance: 'Outputs captured after the preceding CI production-build step.',
      files,
    },
    null,
    2,
  ) + '\n',
  { flag: 'wx' },
);
console.log(JSON.stringify({ sourceCommit: source.commit, compiledFiles: files.length }));
