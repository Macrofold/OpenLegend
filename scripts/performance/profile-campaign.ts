import { dirname, resolve } from 'node:path';
import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { planCampaign, readPlan } from './rust-profile/plan.js';
import { summarizeCampaign } from './rust-profile/report.js';
import { sealCase } from './rust-profile/report-evidence.js';
import { identifier, isMissing, text } from './rust-profile/contract.js';

/** The offline commands never start a game, allocate a worker or consult AWS. */
export async function campaignCommand(args: string[]) {
  const [command, ...values] = args;
  if (command === 'plan' && values.length === 1) return planCampaign(values[0]!, process.cwd());
  if (command === 'summarize' && (values.length === 1 || values.length === 2))
    return summarizeCampaign(values[0]!, values[1]);
  if (command === 'case' && values.length === 3) {
    const id = text(values[0], 'case ID', identifier);
    const path = resolve(values[1]!);
    const planned = await readPlan(path);
    const matches = planned.cases.filter((item) => item.id === id);
    if (matches.length !== 1) throw new Error('Case is absent or ambiguous in the frozen plan.');
    const item = matches[0]!;
    const output = resolve(values[2]!);
    if (output === dirname(path)) throw new Error('Case output must be separate from the plan.');
    const { runCase } = await import('./rust-profile/case.js');
    try {
      await runCase(item, output);
    } catch (error) {
      try {
        await sealCase(output, item, true);
      } catch (sealError) {
        if (!isMissing(sealError))
          throw new AggregateError(
            [error, sealError],
            'The case failed and its partial export could not be sealed.',
          );
      }
      throw error;
    }
    await sealCase(output, item);
    return { caseId: id, output };
  }
  throw new Error(
    'Usage: profile-campaign.ts plan INPUT.json | case CASE_ID PLAN.json OUTPUT | summarize CAMPAIGN_DIRECTORY [COLLECTED_DIRECTORY]',
  );
}

const entry = process.argv[1]
  ? await realpath(process.argv[1]).catch((error: unknown) => {
      if (isMissing(error)) return null;
      throw error;
    })
  : null;
if (entry && pathToFileURL(entry).href === import.meta.url) {
  try {
    console.log(JSON.stringify(await campaignCommand(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
