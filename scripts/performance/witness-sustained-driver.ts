import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const extract = promisify(execFile);
const driverHashes = [
  ['typed-provider.mts', '6f38ffd280071eac3384447fb6e0e3e09b07133c010bdacb518b9e5d0b1e2854'],
  ['stream.mts', '8d01445527f308c702b835d17c043a8b149f82d2a0f824c1d8fde086bd3320b4'],
  [
    'linux-process-accounting.mjs',
    '4d4665ebb82dfe7c0f02851ebff22e71d2914c08296c0a462bca2353b2fb84de',
  ],
] as const;

function replace(source: string, original: string, replacement: string) {
  const index = source.indexOf(original);
  assert(
    index >= 0 && source.indexOf(original, index + original.length) < 0,
    'Archived provider adaptation must match exactly once',
  );
  return source.slice(0, index) + replacement + source.slice(index + original.length);
}

// Reuse the archive's loopback authentication, request size guard, TLS and
// closure. This diagnostic sends no inference result back to the game.
function holdModelRequests(source: string) {
  source = replace(
    source,
    '  const exchanges: any[] = [],',
    '  let heldRequests = 0;\n  const exchanges: any[] = [],',
  );
  source = replace(
    source,
    '        const body = JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));',
    `        if (holdRequests) {
          heldRequests++;
          return;
        }
        const body = JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));`,
  );
  source = replace(source, '  responses,', '  responses, holdRequests,');
  return replace(
    source,
    '        exchanges: exchanges.slice(),',
    '        heldRequests, exchanges: exchanges.slice(),',
  );
}

/** Prepare just the selected helpers before launch. Only explicitly named,
 * hash-verified members are read. The source archive stays read-only. */
export async function stageSustainedDriver(
  archive: string,
  directory: string,
  use: { provider: boolean; resources: boolean },
) {
  // GNU tar can interpret a relative name like host:path as a remote archive.
  const archivePath = await realpath(archive);
  for (const [name, hash] of driverHashes) {
    if (
      (name === 'typed-provider.mts' && !use.provider) ||
      (name === 'linux-process-accounting.mjs' && !use.resources)
    )
      continue;
    const { stdout } = await extract('tar', ['-xOzf', archivePath, 'ordinary/' + name], {
      encoding: 'buffer',
      maxBuffer: 128 * 1024,
    });
    assert.equal(createHash('sha256').update(stdout).digest('hex'), hash, name);
    await writeFile(
      join(directory, name),
      name === 'typed-provider.mts' ? holdModelRequests(stdout.toString()) : stdout,
      { flag: 'wx', mode: 0o600 },
    );
  }
}
