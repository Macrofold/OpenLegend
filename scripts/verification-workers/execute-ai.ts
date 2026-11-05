// Portable paid consumer. World/Lab callers can inject the same AiClient after their own admission.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadJobExecutionClient,
  type JudgeRequest,
  type GenerateRequest,
  type EmbeddingRequest,
} from '@open-legend/ai';
type Executor = Pick<
  Awaited<ReturnType<typeof loadJobExecutionClient>>,
  'judge' | 'generate' | 'embed' | 'dispose'
>;

/** Both the CLI and request-comparison runner use this same paid boundary. */
export async function executeAiRequest(
  kind: string,
  input: string,
  output: string,
  open: () => Promise<Executor> = loadJobExecutionClient,
) {
  if (!input || !output || !['judge', 'generate', 'embed'].includes(kind))
    throw new Error('Use execute-ai.ts judge|generate|embed REQUEST.json RESULT.json.');
  const request = JSON.parse(await readFile(input, 'utf8')) as unknown;
  const client = await open();
  try {
    // The shared service validates the request before monetary admission.
    const result =
      kind === 'judge'
        ? await client.judge(request as JudgeRequest)
        : kind === 'generate'
          ? await client.generate(request as GenerateRequest)
          : await client.embed(request as EmbeddingRequest);
    await writeFile(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
    return result;
  } finally {
    await client.dispose();
  }
}

export async function main(args = process.argv.slice(2)) {
  const [kind, input, output] = args;
  const result = await executeAiRequest(kind ?? '', input ?? '', output ?? '');
  if (result.outcome !== 'value') process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
