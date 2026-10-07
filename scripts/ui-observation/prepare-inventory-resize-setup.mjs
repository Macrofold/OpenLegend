import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// Run only after the ordinary frozen install, production build and pinned
// Playwright browser installation. This records their actual products.
const repository = resolve(process.env.OPENLEGEND_OBSERVATION_ROOT ?? process.cwd());
assert.ok(process.argv[2], 'Provide a new setup JSON path outside the repository.');
const output = resolve(process.argv[2]);
assert.ok(output !== repository && !output.startsWith(repository + sep));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pinBytes = await readFile(new URL('./inventory-resize-source-pins.json', import.meta.url));
const pins = JSON.parse(pinBytes);
assert.equal(pins.source.commit, '67c01d97b0138c9b2d831c494e7684825d7f3c3e');
const files = [];
for (const file of pins.files) {
  const bytes = await readFile(join(repository, file.path));
  assert.equal(digest(bytes), file.sha256, `Published source changed: ${file.path}`);
  files.push({
    path: file.path,
    sha256: file.sha256,
    bytes: bytes.length,
    kind: 'published',
  });
}

async function recordBuild(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await recordBuild(path);
    else if (entry.isFile()) {
      const bytes = await readFile(path);
      files.push({
        path: relative(repository, path),
        sha256: digest(bytes),
        bytes: bytes.length,
        kind: 'built',
      });
    }
  }
}
await recordBuild(join(repository, 'dist/client'));
assert.ok(files.some((file) => file.path === 'dist/client/index.html'));
assert.ok(files.some((file) => file.kind === 'built' && file.path.endsWith('.js')));

const dependencies = [];
for (const path of [
  'node_modules/@playwright/test/package.json',
  'node_modules/typescript/package.json',
  'node_modules/tsx/package.json',
  'node_modules/vite/package.json',
  'apps/client/node_modules/react/package.json',
  'apps/client/node_modules/react-aria-components/package.json',
  'apps/client/node_modules/playcanvas/package.json',
  'apps/server/node_modules/pg/package.json',
]) {
  const bytes = await readFile(join(repository, path));
  const info = JSON.parse(bytes);
  dependencies.push({
    name: info.name,
    version: info.version,
    path,
    sha256: digest(bytes),
  });
  files.push({
    path,
    sha256: digest(bytes),
    bytes: bytes.length,
    kind: 'installed metadata',
  });
}
const pnpmVersion = execFileSync('pnpm', ['--version'], {
  cwd: repository,
  encoding: 'utf8',
}).trim();
assert.equal(pnpmVersion, '10.33.0', 'Use the repository-pinned pnpm.');
assert.equal(
  Number(process.versions.node.split('.')[0]),
  22,
  'This observation uses the existing CI Node 22 environment.',
);
const { chromium } = await import(
  pathToFileURL(join(repository, 'node_modules/@playwright/test/index.mjs')).href
);
const registeredChromiumPath = chromium.executablePath();
const registeredChromiumBytes = await readFile(registeredChromiumPath);
// executablePath is Playwright's registered Chromium path. The runner retains
// default headless launch selection and records the browser's actual version.
const setup = {
  executionReady: true,
  source: pins.source,
  repositoryPath: repository,
  sourcePinsSha256: digest(pinBytes),
  preparedAt: new Date().toISOString(),
  scenario: 'inventory-resize',
  scope:
    'One existing Small stone stack and its unsent quantity 3 through desktop-to-narrow and desktop-to-wide-short Inventory sheets, with Character opened last. Selected item, focus, full popup bounds, unchanged six-item quantity and revisions, and zero command/receipt requests. No world seeding, time advancement or provider calls.',
  desktop: { width: 1440, height: 960 },
  narrow: { width: 390, height: 844 },
  wideShort: { width: 1440, height: 540 },
  journeyDeadlineMs: 90_000,
  interactionTimeoutMs: 5_000,
  captureTimeoutMs: 15_000,
  bounds: {
    commands: 0,
    receipts: 0,
    captures: 3,
    providerBudgetUsd: 0,
  },
  tooling: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    pnpm: pnpmVersion,
    dependencies,
    registeredChromium: {
      path: registeredChromiumPath,
      bytes: registeredChromiumBytes.length,
      sha256: digest(registeredChromiumBytes),
    },
    github: {
      ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA,
      run: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
    },
  },
  files: files.sort((left, right) => left.path.localeCompare(right.path)),
};
await writeFile(output, JSON.stringify(setup, null, 2) + '\n', { flag: 'wx' });
console.log(
  JSON.stringify({
    source: setup.source.commit,
    publishedFiles: pins.files.length,
    builtFiles: files.filter((file) => file.kind === 'built').length,
    dependencyMetadata: dependencies.length,
    setupSha256: digest(await readFile(output)),
    execution: 'prepared only; no game or browser was started',
  }),
);
