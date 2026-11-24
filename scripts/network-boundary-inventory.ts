/** Reviewed acquisition boundaries. This is static build policy, never runtime
 * authority. Ordinary callers consume @open-legend/network results.
 * docs/projects/completed/bounded-network-requests-tech-design.md#10-source-boundary-enforcement
 */
export const rawNetworkOwners: Readonly<Record<string, string>> = {
  'packages/network/src/owner.ts':
    'Bootstrap transport injection and fixed finite admission owners; network.test.ts.',
  'packages/network/src/http.ts': 'Single HTTP dispatch, body and late disposal; network.test.ts.',
  'packages/network/src/node.ts':
    'Owned SDK/Node streams and argument-array remote subprocesses; network.test.ts.',
};

export const sdkOwners: Readonly<Record<string, readonly string[]>> = {
  'apps/server/src/asset-storage.ts': [
    '@aws-sdk/client-s3',
    '@aws-sdk/client-sts',
    '@aws-sdk/credential-providers',
    '@smithy/node-http-handler',
  ],
  'infrastructure/assets/study-access.cts': ['@aws-sdk/client-secrets-manager'],
  'scripts/performance/profile-browser.mjs': ['@playwright/test'],
  'scripts/art/texel-splatting/run.mjs': ['@playwright/test'],
};

/** The Rust server uses its own socket owner. OIDC takes that owner's custom
 * transport, and database transactions use the single locked store. */
export const rustServerNetworkOwners: Readonly<Record<string, readonly RegExp[]>> = {
  reqwest: [/^network\.rs$/, /^oidc\.rs$/, /^provider_transport(?:\.rs|\/)/],
  openidconnect: [/^oidc\.rs$/],
  tokio_postgres: [
    /^store(?:\.rs|\/)/,
    /^authority(?:\.rs|\/)/,
    /^(boot|command_epoch|embodiment|launch)\.rs$/,
  ],
  tokio_postgres_rustls: [/^(boot|store)\.rs$/],
};

/** These runners execute local programs/files. Changing one to remote work must
 * move that invocation through runRemoteProcess with an explicit finite profile.
 */
export const localProcessOwners: Readonly<Record<string, string>> = {
  'scripts/decision-benchmark/main.ts': 'Local Git root inspection only.',
  'scripts/decision-benchmark/run.ts': 'Local Git revision/diff inspection only.',
  'scripts/performance/rust-profile/registry.ts':
    'Read-only Git object and probe inventory for offline Rust campaign planning.',
  'scripts/check-agent-guidance.mjs': 'Local Git inventory only.',
  'scripts/check-assets.ts': 'Local Git inventory only.',
  'scripts/assets/migration.ts': 'Local Git object inspection; no fetch/clone/pull.',
  'scripts/assets/inventory.ts': 'Local Git index inspection; no remote operation.',
  'scripts/assets/restore-rust-world.ts':
    'Fixed local stopped Rust backup and restore commands; cloud permission reads remain in the existing recovery adapter.',
};

/** Command positions are closed; later arguments are local revision/path data.
 * Git global options (including -c aliases) cannot precede these commands. */
export const localGitCommands: Readonly<Record<string, readonly string[]>> = {
  'scripts/decision-benchmark/main.ts': ['rev-parse'],
  'scripts/decision-benchmark/run.ts': ['rev-parse', 'ls-files', 'diff'],
  'scripts/performance/rust-profile/registry.ts': ['cat-file', 'ls-tree', 'grep', 'diff'],
  'scripts/check-agent-guidance.mjs': ['ls-files'],
  'scripts/check-assets.ts': ['ls-files'],
  'scripts/assets/migration.ts': [
    'cat-file',
    'rev-parse',
    'log',
    'count-objects',
    'init',
    'update-ref',
    'bundle',
    'ls-tree',
    'ls-files',
  ],
  'scripts/assets/inventory.ts': ['ls-files'],
};

/** The only local Node children execute these checked-in files, never strings. */
export const localNodeEntries: Readonly<
  Record<string, { kind: 'spawn' | 'fork' | 'spawnSync'; entry: string }>
> = {};

/** Complete argv is closed and data is confined to the named local inputs.
 * By default the runner is spawnSync for the existing offline compiler calls. */
export const localBinaryCommands: Readonly<
  Record<
    string,
    readonly {
      readonly program: string;
      readonly kind?: 'execFile';
      readonly args: readonly (string | null)[];
    }[]
  >
> = {
  'scripts/assets/restore-rust-world.ts': [
    {
      program: 'openlegend-game-server',
      kind: 'execFile',
      args: ['backup-world', null, null],
    },
    {
      program: 'openlegend-game-server',
      kind: 'execFile',
      args: ['restore-world', null, null, '--artwork-operator', null],
    },
  ],
};

export const acquisitionObservers: Readonly<Record<string, string>> = {};

export const inboundOwners: Readonly<Record<string, string>> = {
  'scripts/assets/serve.ts': 'Incoming local exact-asset HTTP.',
};

export const networkDependencies: Readonly<Record<string, string>> = {
  '@aws-sdk/client-s3': 'asset-storage.ts',
  '@aws-sdk/client-sts': 'asset-storage.ts',
  '@aws-sdk/credential-providers': 'asset-storage.ts',
  '@smithy/node-http-handler': 'asset-storage.ts',
  '@aws-sdk/client-secrets-manager':
    'Generated study-access source; the runtime supplies this exact SDK family.',
  pg: 'Existing PostgreSQL/storage authority; excluded from HTTP retry machinery.',
  '@playwright/test':
    'Browser verification and existing tooling; awaited HTTP in evaluated source is still checked.',
  vite: 'Local build/dev-server tooling, not an outgoing HTTP allowance.',
};

/** Every direct dependency needs a reviewed role. A new HTTP SDK cannot avoid
 * classification merely because its package name is absent from a denylist. */
export const localDependencies: Readonly<Record<string, string>> = {
  '@dimforge/rapier3d-compat': 'Local collision geometry.',
  '@noble/hashes': 'Local deterministic hashing and byte conversion; no network transport.',
  '@streamparser/json': 'Local incremental JSON parsing.',
  '@types/node': 'Compile-time declarations.',
  '@types/pg': 'Compile-time declarations.',
  '@types/react': 'Compile-time declarations.',
  '@types/react-dom': 'Compile-time declarations.',
  ajv: 'Local JSON validation.',
  esbuild: 'Local deterministic handler bundling.',
  immer: 'Local immutable state.',
  playcanvas:
    'Existing renderer/browser-managed resources; explicit application HTTP still uses the shared boundary.',
  prettier: 'Local source formatting.',
  react: 'Local presentation.',
  'react-aria-components': 'Local accessible presentation.',
  'react-dom': 'Local presentation.',
  'recast-navigation': 'Local navigation geometry.',
  tsx: 'Local TypeScript execution.',
  typescript: 'Local static analysis.',
  vitest: 'Fixture runner; production cannot import fixture authority.',
  yaml: 'Local configuration parsing.',
  zod: 'Local boundary validation.',
  'virtual:openlegend-assets':
    'Exact build-generated local asset catalogue from the reviewed Vite plugin.',
  'virtual:openlegend-study-catalogs':
    'Exact build-generated local study catalogues from the reviewed Vite plugin.',
};

export const continuousBrowserPaths = new Set([
  '/api/events',
  '/api/world-agent/session/progress',
  '/api/chat/preview',
]);

/** Dynamic loading is confined to these exact local source/binding owners. */
export const dynamicModuleOwners: Readonly<Record<string, string>> = {
  'scripts/compare-world-survival.ts':
    'Loads exact selected local domain/spatial source paths for offline comparison.',
};

/** Generated cloud source is checked against its canonical source by the required
 * network:generate --check step. Other inline cloud functions are scanned as JS. */
export const generatedNetworkArtifacts: Readonly<Record<string, string>> = {
  'infrastructure/assets/template.json#Resources.StudyAccess.Properties.Code.ZipFile':
    'infrastructure/assets/study-access.cts',
};

export const fixtureToolOwners: Readonly<Record<string, string>> = {};

/** Browser-only qualification entries are test authority, never application
 * imports. Each executable fixture needs its own reviewed source record. */
export const testSourceOwners: Readonly<Record<string, string>> = {
  'apps/client/test-fixtures/renderer-network.ts':
    'In-memory browser qualification of real PlayCanvas model parsing and resource cleanup with synthetic transport completion.',
};
