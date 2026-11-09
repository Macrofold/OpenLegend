import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsePlan,
  prepareSourceConfigurations,
  writeResolvedPlan,
  freezeDetailedStage,
} from './profiling-plan.js';
import {
  OPENING_PARENT_IDS,
  OPENING_CANDIDATE_IDS,
  PROFILING_SAFETY_DEFINITIONS,
  resolveProfilingInventory,
  auditProfilingEntrypoints,
} from './profiling-registry.js';
import { instrumentSource } from './profiling-source-patches.js';
import { installProfilingDeadline } from './profiling-deadline.js';
import type { ProfilingCase } from './profiling-types.js';
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));

/** This adapter prepares local manifests and delegates execution to the existing
 * harness/managed runner. Merely importing or planning never initializes a game. */
export async function campaignCommand(arguments_: string[]) {
  const [command, ...args] = arguments_;
  if (command === 'plan' && args.length === 1) {
    const input = parsePlan(await json(resolve(args[0]!)));
    await mkdir(input.outputDirectory, { recursive: true, mode: 0o700 });
    await mkdir(join(input.outputDirectory, 'source'), { mode: 0o700 });
    await mkdir(join(input.outputDirectory, 'ownership'), { mode: 0o700 });
    const inventory = await resolveProfilingInventory(process.cwd());
    const safetyInventory = await resolveProfilingInventory(
      process.cwd(),
      PROFILING_SAFETY_DEFINITIONS,
    );
    const selected = new Set([...OPENING_PARENT_IDS, ...OPENING_CANDIDATE_IDS]);
    const definitions = [
      ...inventory.filter((definition) => selected.has(definition.id)),
      ...safetyInventory,
    ];
    const configurations = await prepareSourceConfigurations(
      process.cwd(),
      input,
      (path, source) => instrumentSource(path, source, definitions).source,
    );
    await writeFile(
      join(input.outputDirectory, 'source', 'safety-inventory.json'),
      JSON.stringify(safetyInventory, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    const result = await writeResolvedPlan(process.cwd(), input, configurations);
    await writeFile(
      join(input.outputDirectory, 'source', 'entrypoints.json'),
      JSON.stringify(await auditProfilingEntrypoints(process.cwd()), null, 2) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    await writeFile(
      join(input.outputDirectory, 'source', 'configurations.json'),
      JSON.stringify(configurations, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    return {
      plan: join(input.outputDirectory, 'plan.json'),
      hash: result.hash,
      counts: result.counts,
      duration: result.duration,
      schedules: result.schedules,
      costs: result.costs,
    };
  }
  if (command === 'stage' && args.length === 2)
    return await freezeDetailedStage(resolve(args[0]!), await json(resolve(args[1]!)));
  if (command === 'workers' && args.length === 2) {
    const { writeWorkerPlans } = await import('./profiling-worker-plans.js');
    return await writeWorkerPlans(resolve(args[0]!), await json(resolve(args[1]!)));
  }
  if (command === 'safety' && args.length === 3) {
    const directory =
      args[0] === '--input'
        ? join(process.env.OPENLEGEND_JOB_INPUTS ?? '', 'campaign')
        : resolve(args[0]!);
    if (args[0] === '--input' && !process.env.OPENLEGEND_JOB_INPUTS)
      throw Error('An owned campaign input mount is required.');
    const output = resolve(args[2]!);
    await mkdir(output, { recursive: true, mode: 0o700 });
    const deadline = installProfilingDeadline(630, async () => {
      try {
        await writeFile(
          join(output, 'safety.json'),
          JSON.stringify({
            status: 'failed',
            configuration: args[1],
            reason: 'Safety case absolute deadline reached.',
          }),
          { flag: 'wx', mode: 0o600 },
        );
      } catch {
        /* Preserve prior evidence. */
      }
    });
    try {
      const { runSafetyCase } = await import('./profile-campaign-safety.js');
      return await runSafetyCase(directory, args[1]!, output, deadline.signal);
    } finally {
      deadline.stop();
    }
  }
  if (command === 'qualify-safety' && args.length === 1) {
    const { qualifySafety } = await import('./profile-campaign-safety.js');
    return await qualifySafety(resolve(args[0]!));
  }
  if (command === 'summarize' && args.length === 1) {
    const { summarizeCampaign } = await import('./profiling-report.js');
    return await summarizeCampaign(resolve(args[0]!));
  }
  if (command === 'case' && (args.length === 2 || (args.length === 3 && args[0] === '--input'))) {
    let campaignDirectory: string, casePath: string, output: string;
    if (args[0] === '--input') {
      if (!process.env.OPENLEGEND_JOB_INPUTS)
        throw Error('An owned campaign input mount is required.');
      if (!/^I\d\d-H[012]-r[123]$/.test(args[1]!)) throw Error('Unknown case identity.');
      campaignDirectory = join(process.env.OPENLEGEND_JOB_INPUTS, 'campaign');
      casePath = join(campaignDirectory, 'case-inputs', `${args[1]}.json`);
      output = resolve(args[2]!);
    } else {
      casePath = resolve(args[0]!);
      campaignDirectory = dirname(dirname(casePath));
      output = resolve(args[1]!);
    }
    const item = (await json(casePath)) as ProfilingCase;
    const { runCampaignCase } = await import('./profile-campaign-case.js');
    await runCampaignCase(item, output, campaignDirectory);
    return { caseId: item.id, output };
  }
  throw Error(
    'Usage: profile-campaign.ts plan PLAN.json | stage DIRECTORY SELECTION.json | workers DIRECTORY ADMISSION.json | case CASE.json OUTPUT | case --input CASE_ID OUTPUT | safety DIRECTORY CONFIG OUTPUT | qualify-safety DIRECTORY | summarize DIRECTORY',
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await campaignCommand(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Campaign preparation failed.');
    process.exitCode = 1;
  }
}
