// Portable paid consumer. World/Lab callers can inject the same AiClient after their own admission.
import { readFile, writeFile } from 'node:fs/promises';
import {
  loadJobExecutionClient,
  type JudgeRequest,
  type GenerateRequest,
  type EmbeddingRequest,
} from '@open-legend/ai';
const [kind, input, output] = process.argv.slice(2);
if (!input || !output || !['judge', 'generate', 'embed'].includes(kind ?? ''))
  throw new Error('Use execute-ai.ts judge|generate|embed REQUEST.json RESULT.json.');
const client = await loadJobExecutionClient();
const request = JSON.parse(await readFile(input, 'utf8')) as unknown;
// The shared service validates the request through its kind schema before monetary admission.
const result =
  kind === 'judge'
    ? await client.judge(request as JudgeRequest)
    : kind === 'generate'
      ? await client.generate(request as GenerateRequest)
      : await client.embed(request as EmbeddingRequest);
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
if (result.outcome !== 'value') process.exitCode = 1;
