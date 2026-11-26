// A frozen index retains every declared position, including unselected and
// unfinished episodes. Script settings never grant access to a Lab or provider.
import { parseArgs } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { json } from '../verification-workers/files.mjs';
import { planWorkers } from './workers.mjs';
import { episodeDigest, runEpisode, validateEpisode } from './episode.mjs';

async function freeze(file, value) {
  try {
    await json(file, value, { exclusive: true });
  } catch (error) {
    if (error.code !== 'EEXIST' || !isDeepStrictEqual(await json(file), value))
      throw new Error('Frozen output differs: ' + file);
  }
}

async function position(index, row) {
  const spec = validateEpisode(await json(join(dirname(index), 'episodes', row.id + '.json')));
  if (spec.id !== row.id || episodeDigest(spec) !== row.sha256)
    throw new Error('A frozen episode differs from its index.');
  return spec;
}

async function auditedIndex(file) {
  const index = await json(file);
  if (
    !Array.isArray(index.positions) ||
    new Set(index.positions.map((p) => p.id)).size !== index.positions.length ||
    index.positions.some(
      (p) => !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(p.id) || !/^[a-f0-9]{64}$/.test(p.sha256),
    )
  )
    throw new Error('Invalid campaign position or digest.');
  return index;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      input: { type: 'string' },
      index: { type: 'string' },
      output: { type: 'string' },
      select: { type: 'string', multiple: true },
      origin: { type: 'string' },
      collected: { type: 'string' },
      execute: { type: 'boolean', default: false },
    },
  });
  const [command] = positionals;
  if (
    positionals.length !== 1 ||
    !values.output ||
    !['plan', 'run', 'aggregate', 'workers'].includes(command)
  )
    throw new Error(
      'Choose plan --input FILE, run --index INDEX --origin URL [--execute], or aggregate --index INDEX --collected DIR, each with --output DIR.',
    );
  const out = resolve(values.output);
  if (command === 'plan') {
    if (!values.input || values.execute || values.index || values.origin || values.collected)
      throw new Error('Plan accepts --input and optional --select IDs.');
    const file = resolve(values.input),
      declared = await json(file);
    if (
      !Array.isArray(declared.episodes) ||
      !declared.episodes.length ||
      !/^[0-9a-f]{40}$/.test(declared.sourceRevision) ||
      declared.expectedPositions !== declared.episodes.length
    )
      throw new Error(
        'Declare sourceRevision, expectedPositions and a complete list of episode files.',
      );
    const positions = [],
      ids = new Set(),
      selection = new Set(values.select);
    for (const path of declared.episodes) {
      const episode = validateEpisode(await json(resolve(dirname(file), path)));
      if (ids.has(episode.id)) throw new Error('Duplicate campaign position ' + episode.id);
      ids.add(episode.id);
      positions.push({
        id: episode.id,
        sha256: episodeDigest(episode),
        selected: selection.size === 0 || selection.has(episode.id),
      });
      await freeze(join(out, 'episodes', episode.id + '.json'), episode);
    }
    if ([...selection].some((id) => !ids.has(id)))
      throw new Error('One of the selected jobs does not exist.');
    await freeze(join(out, 'matrix-index.json'), {
      sourceRevision: declared.sourceRevision,
      positions,
    });
    return { positions: positions.length, selected: positions.filter((p) => p.selected).length };
  }
  if (command === 'workers') {
    if (
      !values.input ||
      !values.index ||
      values.origin ||
      values.execute ||
      values.select ||
      values.collected
    )
      throw new Error('Workers needs --index and --input WORKER_DECLARATION.');
    const file = resolve(values.index);
    return planWorkers(
      file,
      await auditedIndex(file),
      resolve(values.input),
      out,
      position,
      freeze,
    );
  }
  if (!values.index || values.input || values.select)
    throw new Error('Use a frozen --index for this operation.');
  const file = resolve(values.index),
    index = await auditedIndex(file);
  if (command === 'run') {
    if (!values.origin || values.collected)
      throw new Error('Choose the dedicated signed native Lab origin.');
    await mkdir(out, { recursive: true, mode: 0o700 });
    // A given Lab has one clock, one mutable timeline and one controller.
    for (const row of index.positions.filter((p) => p.selected)) {
      const folder = join(out, row.id);
      const spec = await position(file, row);
      let past;
      try {
        past = await json(join(folder, 'episode.json'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (past) {
        if (
          past.status === 'completed' &&
          past.episodeSha256 === row.sha256 &&
          past.mode === (values.execute ? 'execute' : 'prepare')
        )
          continue;
        throw new Error(
          'An earlier run exists. Inspect its original IDs in ' +
            folder +
            ' before starting a distinct experiment.',
        );
      }
      await runEpisode(spec, { address: values.origin, output: folder, execute: values.execute });
    }
    return {
      selected: index.positions.filter((p) => p.selected).length,
      mode: values.execute ? 'execute' : 'prepare',
    };
  }
  if (!values.collected || values.origin || values.execute)
    throw new Error('Aggregate needs --collected; it opens only local results.');
  const rows = [];
  for (const row of index.positions) {
    await position(file, row);
    let result;
    for (const name of ['episode.json', 'cases/episode/results/episode/episode.json']) {
      try {
        result = await json(resolve(values.collected, row.id, name));
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (result && (result.id !== row.id || result.episodeSha256 !== row.sha256))
      throw new Error('A collected result belongs to another episode.');
    rows.push({
      ...row,
      status: result?.status ?? (row.selected ? 'missing' : 'unselected'),
      mode: result?.mode ?? null,
      steps:
        result?.steps.map((s) => ({
          jobId: s.jobId,
          stage: s.prepared?.stage,
          inputSha256: s.prepared?.inputSha256,
          interval: s.interval,
          outcome: s.outcome,
        })) ?? [],
    });
  }
  await freeze(join(out, 'summary.json'), {
    sourceRevision: index.sourceRevision,
    positions: rows,
  });
  return { positions: rows.length, completed: rows.filter((r) => r.status === 'completed').length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await main()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
