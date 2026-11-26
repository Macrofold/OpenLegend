// Compile declarative measurements into the existing worker campaign. The
// supervisor verifies mounted bundles, leases, source and funded job grants.
import { dirname, join, resolve } from 'node:path';
import { campaign, relativePath } from '../verification-workers/contracts.mjs';
import { packInputs } from '../verification-workers/source.mjs';
import { json } from '../verification-workers/files.mjs';

export async function planWorkers(indexFile, index, input, out, readEpisode, freeze) {
  const config = await json(input),
    root = dirname(input);
  if (
    !['prepare', 'execute'].includes(config.mode) ||
    (config.mode === 'execute') !== Boolean(config.paid)
  )
    throw new Error(
      'Choose prepare without funding or execute with explicit per-job worker funding.',
    );
  const inputs = [],
    evidence = {},
    jobs = [];
  for (const id of ['runtime', 'release', 'backup']) {
    const supplied = config[id];
    if (
      !supplied?.root ||
      !Array.isArray(supplied.paths) ||
      !supplied.paths.length ||
      !/^[a-f0-9]{64}$/.test(supplied.sha256)
    )
      throw new Error(
        'Declare each reviewed runtime, release and backup bundle with its input manifest digest.',
      );
    const paths = supplied.paths.map(relativePath),
      base = resolve(root, supplied.root);
    const verified = await packInputs(base, paths, join(out, 'archives'));
    if (verified.sha256 !== supplied.sha256)
      throw new Error('The reviewed ' + id + ' bundle changed.');
    evidence[id] = verified.sha256;
    inputs.push({ id, root: base, paths });
  }
  for (const row of index.positions.filter((p) => p.selected)) {
    const spec = await readEpisode(indexFile, row);
    if (!spec.source)
      throw new Error(
        'Workers need an explicitly selected reviewed opening or signed game backup. Private live checkpoints remain under their source permissions.',
      );
    const bundle = 'episode-' + String(jobs.length),
      folder = join(out, 'cases', bundle);
    const paid = config.paid;
    const jobConfig = {
      spec,
      sha256: row.sha256,
      sourceRevision: index.sourceRevision,
      sourceArchiveSha256: config.sourceHash,
      bundleSha256s: Object.fromEntries(
        ['runtime', 'release', 'backup'].map((id) => [id, evidence[id]]),
      ),
      mode: config.mode,
      budgetMicroUsd: paid?.limitMicroUsd ?? 0,
    };
    await freeze(join(folder, 'episode.json'), jobConfig);
    const encoded = await packInputs(folder, ['episode.json'], join(out, 'archives'));
    evidence[bundle] = encoded.sha256;
    inputs.push({ id: bundle, root: folder, paths: ['episode.json'] });
    jobs.push({
      id: row.id,
      mode: 'batch',
      acceptance: 'measurement',
      timeoutSeconds: config.timeoutSeconds,
      ...(config.environment && { environment: config.environment }),
      ...(paid && {
        paid: {
          limitMicroUsd: paid.limitMicroUsd,
          maxCalls: spec.limits.maxCalls,
          lanes: paid.lanes,
        },
      }),
      cases: [
        {
          id: 'episode',
          source: index.sourceRevision,
          sourceHash: config.sourceHash,
          databases: ['game', 'lab'],
          inputs: [
            ...['runtime', 'release', 'backup'].map((id) => ({ id, bundle: id })),
            { id: 'episode', bundle },
          ],
          steps: [
            {
              id: 'episode',
              argv: [
                'node',
                '--import',
                'tsx',
                'scripts/cognition-lab/worker-episode.mjs',
                '{inputs}/episode/episode.json',
                '{results}/episode',
              ],
            },
          ],
          requiredArtifacts: ['episode/episode.json'],
        },
      ],
      requiredArtifacts: [
        'result.json',
        'timeline.json',
        'cases/episode/results/episode/episode.json',
      ],
    });
  }
  if (!/^[a-f0-9]{64}$/.test(config.sourceHash))
    throw new Error('Supply the exact registered source archive digest.');
  const plan = campaign({
    taskId: config.taskId,
    cloudAllocationId: config.cloudAllocationId,
    concurrency: config.concurrency,
    deadlineSeconds: config.deadlineSeconds,
    inputs,
    jobs,
  });
  await freeze(join(out, 'worker-inputs.json'), evidence);
  await freeze(join(out, 'campaign.json'), plan);
  return { jobs: jobs.length, positions: index.positions.length, mode: config.mode };
}
