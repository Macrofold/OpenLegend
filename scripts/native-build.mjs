// The Rust exports own runtime conversion and generated JavaScript/TypeScript.
// No handwritten declaration can make an unchecked bridge input safe.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const native = join(repository, 'native');
const arguments_ = process.argv.slice(2);
const allowed = new Set(['--debug', '--check-interface']);
if (arguments_.some((argument) => !allowed.has(argument)))
  throw new Error('Use native-build.mjs [--debug] [--check-interface].');
const check = arguments_.includes('--check-interface');
const sourceFiles = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'scripts/native-build.mjs',
  'native/Cargo.toml',
  'native/Cargo.lock',
  'native/rust-toolchain.toml',
  'native/package.json',
  'native/simulation/Cargo.toml',
  'native/node-bridge/Cargo.toml',
  'native/node-bridge/build.rs',
];
function rustFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Native source must use exact files: ${path}`);
    if (entry.isDirectory()) files.push(...rustFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.rs')) files.push(relative(repository, path));
  }
  return files;
}
function sourceIdentity() {
  const files = [
    ...sourceFiles,
    ...rustFiles(join(native, 'simulation/src')),
    ...rustFiles(join(native, 'node-bridge/src')),
    ...rustFiles(join(repository, 'packages/domain/src/worlds')),
  ].sort();
  const hash = createHash('sha256');
  for (const path of files) {
    const bytes = readFileSync(join(repository, path));
    hash.update(`${Buffer.byteLength(path)}:${path}${bytes.length}:`);
    hash.update(bytes);
  }
  return hash.digest('hex');
}
const sourceSha256 = sourceIdentity();
const compiler = spawnSync('rustc', ['-vV'], { cwd: native, encoding: 'utf8' });
if (compiler.error || compiler.status !== 0)
  throw new Error('Native compiler identity is unavailable.');
const target = process.env.CARGO_BUILD_TARGET ?? compiler.stdout.match(/^host: (.+)$/m)?.[1];
if (!target) throw new Error('Native target identity is unavailable.');
const metadata = spawnSync(
  'cargo',
  ['metadata', '--locked', '--format-version', '1', '--filter-platform', target],
  {
    cwd: native,
    encoding: 'utf8',
  },
);
if (metadata.error || metadata.status !== 0)
  throw new Error('Native dependency identity is unavailable.');
const graph = JSON.parse(metadata.stdout);
const packages = new Map(graph.packages.map((entry) => [entry.id, entry]));
const features = graph.resolve.nodes
  .map((node) => {
    const selected = packages.get(node.id);
    if (!selected) throw new Error('Native dependency identity has an unresolved package.');
    return `${selected.name}@${selected.version}: ${node.features.join(',')}`;
  })
  .sort();
const interfacePaths = ['index.mjs', 'index.d.ts'].map((path) => join(native, path));
const previous = check ? interfacePaths.map((path) => readFileSync(path)) : undefined;
const argumentsNapi = [
  'exec',
  'napi',
  'build',
  '--cwd',
  native,
  '--manifest-path',
  'node-bridge/Cargo.toml',
  '--package-json-path',
  'package.json',
  '--output-dir',
  '.',
  '--platform',
  '--esm',
  '--js',
  'index.mjs',
  '--dts',
  'index.d.ts',
  ...(!arguments_.includes('--debug') ? ['--release'] : []),
  '--',
  '--locked',
];
const built = spawnSync('pnpm', argumentsNapi, {
  cwd: repository,
  stdio: 'inherit',
  env: {
    ...process.env,
    OPENLEGEND_NATIVE_SOURCE_SHA256: sourceSha256,
    OPENLEGEND_NATIVE_FEATURES: JSON.stringify(features),
  },
});
if (built.error) throw built.error;
if (built.status !== 0) throw new Error(`Native build failed (${built.status ?? built.signal}).`);
if (sourceIdentity() !== sourceSha256)
  throw new Error('Native source changed during the build; artifact provenance is unaccepted.');
for (const path of interfacePaths) {
  const options = await prettier.resolveConfig(path);
  writeFileSync(
    path,
    await prettier.format(readFileSync(path, 'utf8'), { ...options, filepath: path }),
  );
}
if (previous)
  for (const [index, path] of interfacePaths.entries())
    if (!previous[index].equals(readFileSync(path)))
      throw new Error(`Generated native interface changed: ${path}`);

const observed = spawnSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    'import { nativeBuildInfo } from "./index.mjs"; console.log(JSON.stringify(nativeBuildInfo()));',
  ],
  { cwd: native, encoding: 'utf8' },
);
if (observed.error || observed.status !== 0)
  throw new Error('Built native artifact identity could not be loaded.');
const actual = JSON.parse(observed.stdout);
if (
  actual.sourceSha256 !== sourceSha256 ||
  actual.target !== target ||
  JSON.stringify(actual.features) !== JSON.stringify(features)
)
  throw new Error('Built native artifact does not identify its actual source and dependencies.');
const lockHash = createHash('sha256')
  .update(readFileSync(join(native, 'Cargo.lock')))
  .digest('hex');
writeFileSync(
  join(native, 'build.json'),
  JSON.stringify(
    {
      ...actual,
      cargoLockSha256: lockHash,
    },
    null,
    2,
  ) + '\n',
);
