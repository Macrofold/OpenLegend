import { join } from 'node:path';
import { digest } from '../verification-workers/contracts.mjs';
import { json, manifest } from '../verification-workers/files.mjs';
import { openWorkerGame } from '../verification-workers/native-game.ts';
import { validateEpisode, episodeDigest, runEpisode } from './episode.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error('Supply the mounted episode and its private output directory.');
const config = await json(input),
  spec = validateEpisode(config.spec);
if (
  !spec.source ||
  episodeDigest(spec) !== config.sha256 ||
  !['prepare', 'execute'].includes(config.mode) ||
  !Number.isSafeInteger(config.budgetMicroUsd) ||
  (config.mode === 'execute' ? config.budgetMicroUsd <= 0 : config.budgetMicroUsd !== 0)
)
  throw new Error('The frozen worker episode or its budget differs.');
const execute = config.mode === 'execute';
const mounts = process.env.OPENLEGEND_JOB_INPUTS;
if (!mounts) throw new Error('A supervisor-owned input directory is required.');
for (const id of ['runtime', 'release', 'backup']) {
  const expected = config.bundleSha256s?.[id];
  if (!/^[a-f0-9]{64}$/.test(expected) || digest(await manifest(join(mounts, id))) !== expected)
    throw new Error('The mounted ' + id + ' input differs from the reviewed experiment.');
}
const game = await openWorkerGame({
  lab: {
    budgetUsd: config.budgetMicroUsd / 1e6,
    ...(execute && { grantPath: process.env.OPENLEGEND_JOB_EXECUTION }),
  },
});
try {
  if (
    game.sourceProvenance.ready.head !== config.sourceRevision ||
    game.sourceProvenance.ready.archiveSha256 !== config.sourceArchiveSha256
  )
    throw new Error('Worker source revision differs from the episode.');
  const result = await runEpisode(spec, {
    address: game.base,
    output,
    execute,
    initializeSource: true,
  });
  await json(join(output, 'episode.json'), { ...result, source: game.sourceProvenance.ready });
} finally {
  await game.close();
}
