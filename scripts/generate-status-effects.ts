import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { format, resolveConfig } from 'prettier';
import { createWorld } from '../packages/domain/src/data.js';
import { validateStatusEffectPolicy } from '../packages/domain/src/status-effect-validation.js';

// Authored YAML stays out of the runtime dependency/I/O boundary. Check mode prevents drift.
// docs/status-effects.md#configuration
const source = new URL('../packages/domain/config/status-effects.yaml', import.meta.url);
const destination = new URL(
  '../packages/domain/config/status-effects.generated.json',
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
