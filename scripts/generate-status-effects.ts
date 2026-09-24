import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { format, resolveConfig } from 'prettier';
import { createWorld } from '../packages/domain/src/data.js';
import { validateStatusEffectPolicy } from '../packages/domain/src/status-effect-validation.js';

// Authored YAML stays out of the runtime dependency/I/O boundary. Check mode prevents drift.
// docs/status-effects.md#configuration
const source = new URL(
  '../packages/domain/src/worlds/base/config/status-effects.yaml',
  import.meta.url,
);
const destination = new URL(
  '../packages/domain/src/worlds/base/config/status-effects.generated.json',
  import.meta.url,
);
const policy: unknown = parse(await readFile(source, 'utf8'));
validateStatusEffectPolicy(createWorld(), policy);
const output = await format(JSON.stringify(policy), {
  ...(await resolveConfig(destination.pathname)),
  parser: 'json',
});
if (process.argv.includes('--check')) {
  if ((await readFile(destination, 'utf8')) !== output)
    throw new Error('Generated status effects are stale. Run pnpm config:generate.');
} else if ((await readFile(destination, 'utf8').catch(() => '')) !== output) {
  await writeFile(destination, output);
}

// The base world's notepad policy uses the same build-time authoring boundary.
const knowledgeSource = new URL('../packages/domain/src/worlds/base/config/knowledge.yaml', import.meta.url);
const knowledgeDestination = new URL('../packages/domain/src/worlds/base/config/knowledge.generated.json', import.meta.url);
const knowledge = parse(await readFile(knowledgeSource, 'utf8'));
if (knowledge?.knowledge?.policy !== 'editable-notepads' || knowledge?.observerIdentity?.policy !== 'observer-given-names' ||
    !['general', 'subject'].every(key => Number.isSafeInteger(knowledge.knowledge.maxCharacters[key]) && knowledge.knowledge.maxCharacters[key] > 0))
  throw new Error('Invalid base-world knowledge policy.');
const knowledgeOutput = await format(JSON.stringify(knowledge), { ...(await resolveConfig(knowledgeDestination.pathname)), parser: 'json' });
if (process.argv.includes('--check')) {
  if (await readFile(knowledgeDestination, 'utf8') !== knowledgeOutput) throw new Error('Generated knowledge policy is stale. Run pnpm config:generate.');
} else if (await readFile(knowledgeDestination, 'utf8') !== knowledgeOutput) await writeFile(knowledgeDestination, knowledgeOutput);
