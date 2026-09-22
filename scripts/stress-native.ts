import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseScenario } from './performance/scenario.js';

const [configPath, output] = process.argv.slice(2);
if (!configPath || !output)
  throw new Error(
    'Usage: node --import tsx scripts/stress-native.ts SCENARIO.json NEW_PROFILE.cpuprofile',
  );
const scenario = parseScenario(JSON.parse(await readFile(configPath, 'utf8')));
if (scenario.input) scenario.input = resolve(dirname(resolve(configPath)), scenario.input);
// A parent watchdog can stop a synchronous encounter storm that blocks child timers.
const child = spawn(
  process.execPath,
  [
    '--import',
    'tsx',
    fileURLToPath(new URL('./profile-native.ts', import.meta.url)),
    scenario.input ?? '-',
    resolve(output),
    String(scenario.steps),
    '--scenario',
    JSON.stringify(scenario),
  ],
  { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '' } },
);
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  child.kill('SIGKILL');
}, scenario.timeoutSeconds * 1000);
const interrupt = () => child.kill('SIGTERM');
process.once('SIGINT', interrupt);
child.once('error', (error) => {
  clearTimeout(timer);
  console.error(error.message);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  clearTimeout(timer);
  process.removeListener('SIGINT', interrupt);
  if (timedOut)
    console.error(
      JSON.stringify({
        status: 'timeout',
        timeoutSeconds: scenario.timeoutSeconds,
        message:
          'Incomplete run; last stderr stage identifies where it stopped. No capacity result.',
      }),
    );
  else if (signal) console.error(`Profiler stopped: ${signal}`);
  process.exitCode = timedOut ? 124 : (code ?? 1);
});
