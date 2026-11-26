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
    '@aws-sdk/rds-signer',
    '@smithy/node-http-handler',
  ],
  'infrastructure/assets/study-access.cts': ['@aws-sdk/client-secrets-manager'],
  'scripts/performance/profile-browser.mjs': ['@playwright/test'],
  'scripts/art/texel-splatting/run.mjs': ['@playwright/test'],
  'scripts/verification-workers/aws.mjs': ['@aws-sdk/credential-providers'],
  'scripts/verification-workers/artifacts.mjs': ['@aws-sdk/client-s3'],
  'scripts/verification-workers/controller.mjs': [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-ec2',
    '@aws-sdk/client-ssm',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-scheduler',
    '@aws-sdk/client-cloudtrail',
  ],
  'scripts/verification-workers/campaigns.mjs': ['@aws-sdk/lib-dynamodb', '@aws-sdk/client-lambda'],
  'scripts/verification-workers/coordination.mjs': ['@aws-sdk/lib-dynamodb'],
  'scripts/verification-workers/images.mjs': ['@aws-sdk/client-ec2', '@aws-sdk/client-ssm'],
  'scripts/verification-workers/preflight.mjs': [
    '@aws-sdk/client-service-quotas',
    '@aws-sdk/client-ec2',
  ],
  'scripts/verification-workers/cli.mjs': [
    '@aws-sdk/client-lambda',
    '@aws-sdk/client-sts',
    '@aws-sdk/client-ssm',
  ],
  'scripts/verification-workers/deploy.mjs': [
    '@aws-sdk/client-cloudformation',
    '@aws-sdk/client-sts',
    '@aws-sdk/client-ec2',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-lambda',
    '@aws-sdk/client-ssm',
  ],
  'scripts/verification-workers/deploy-controller.mjs': [
    '@aws-sdk/client-cloudformation',
    '@aws-sdk/client-sts',
    '@aws-sdk/client-ec2',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-lambda',
    '@aws-sdk/client-ssm',
  ],
  'scripts/verification-workers/quarantine.mjs': ['@aws-sdk/client-ec2', '@aws-sdk/client-ssm'],
  'scripts/verification-workers/supervisor.mjs': [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-lambda',
  ],
};

/** The Rust server uses its own socket owner. OIDC takes that owner's custom
 * transport, and database transactions use the single locked store. */
export const rustServerNetworkOwners: Readonly<Record<string, readonly RegExp[]>> = {
  reqwest: [/^network\.rs$/, /^oidc\.rs$/, /^provider_transport(?:\.rs|\/)/],
  openidconnect: [/^oidc\.rs$/],
  tokio_postgres: [
    // The Lab config opens its locked Store. Preparation and the library use Store transactions.
    /^lab\/(mod|prepare|library|scenario|holds|decisions\/(settings|participants)|fields\/(context|store|exchange))\.rs$/,
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
  'scripts/disposable-rust-game.ts': 'Restore a prepared backup and serve its signed game on loopback.',
  'scripts/model-files.ts': 'Local macOS sips image reduction of fetched files only.',
  'scripts/cognition-lab/response-format.ts':
    'Local Git object existence check only; model calls reuse execute-ai and shared execution.',
  'scripts/decision-benchmark/main.ts': 'Local Git root inspection only.',
  'scripts/decision-benchmark/run.ts': 'Local Git revision/diff inspection only.',
  'scripts/performance/rust-profile/registry.ts':
    'Read-only Git object and probe inventory for offline Rust campaign planning.',
  'scripts/performance/witness-sustained-driver.ts':
    'Extracts only named archive members from a resolved local path and checks their digests before staging.',
  'scripts/performance/witness-sustained.ts':
    'Reads local Git and OS metadata, starts the supplied local Rust release on loopback, and forks the checked-in signed workload client.',
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
  'scripts/cognition-lab/response-format.ts': ['cat-file'],
  'scripts/decision-benchmark/main.ts': ['rev-parse'],
  'scripts/decision-benchmark/run.ts': ['rev-parse', 'ls-files', 'diff'],
  'scripts/performance/rust-profile/registry.ts': ['cat-file', 'ls-tree', 'grep', 'diff'],
  'scripts/performance/witness-sustained.ts': ['rev-parse', 'status'],
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

/** Reviewed local programs other than Git and Node, named exactly; none reaches the network.
 * A local runner may not choose its program at run time or run it through a shell. */
export const localToolCommands: Readonly<Record<string, readonly string[]>> = {
  'scripts/model-files.ts': ['sips'],
};

/** The only local Node children execute these checked-in files, never strings. */
export const localNodeEntries: Readonly<
  Record<string, { kind: 'spawn' | 'fork' | 'spawnSync'; entry: string }>
> = {
  'scripts/performance/witness-sustained.ts': {
    kind: 'fork',
    entry: './witness-sustained-client.ts',
  },
};

type ResolvedLocalPath = { readonly realPath: true };
export type LocalBinaryArgument = string | readonly string[] | ResolvedLocalPath | null;

/** Complete argv is closed and data is confined to the named local inputs.
 * By default the runner is spawnSync for the existing offline compiler calls. */
export const localBinaryCommands: Readonly<
  Record<
    string,
    readonly {
      readonly program: string | ResolvedLocalPath;
      readonly kind?: 'execFile' | 'execFileSync' | 'spawn';
      readonly args: readonly LocalBinaryArgument[];
    }[]
  >
> = {
  'scripts/disposable-rust-game.ts': [
    { program: { realPath: true }, kind: 'execFile', args: ['restore-world', null, null] },
    { program: { realPath: true }, kind: 'spawn', args: ['serve', null] },
  ],
  'scripts/performance/witness-sustained-driver.ts': [
    {
      program: 'tar',
      kind: 'execFile',
      args: [
        '-xOzf',
        { realPath: true },
        [
          'ordinary/typed-provider.mts',
          'ordinary/stream.mts',
          'ordinary/linux-process-accounting.mjs',
        ],
      ],
    },
  ],
  'scripts/performance/witness-sustained.ts': [
    { program: 'getconf', kind: 'execFileSync', args: [['CLK_TCK', 'PAGESIZE']] },
    { program: { realPath: true }, kind: 'spawn', args: ['serve', null] },
  ],
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
  'apps/server/src/shared-execution-http.ts': 'Scoped execution control with bounded incoming requests.',
  'scripts/verification-workers/cli.mjs': 'Loopback port reservation before the owned SSM tunnel.',
};

export const networkDependencies: Readonly<Record<string, string>> = {
  '@aws-sdk/client-s3': 'Asset storage and bounded managed verification artifacts.',
  '@aws-sdk/client-cloudformation': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/client-dynamodb': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/lib-dynamodb': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/client-ec2': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/client-lambda': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/client-service-quotas':
    'Read-only campaign capacity admission through verification aws.mjs bounded owner.',
  '@aws-sdk/client-scheduler': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/client-ssm': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/client-cloudtrail': 'Bounded managed verification control, never game runtime.',
  '@aws-sdk/client-sts': 'Asset storage and managed verification account checks.',
  '@aws-sdk/credential-providers': 'Asset storage and managed verification scoped credentials.',
  '@aws-sdk/rds-signer': 'Signs the asset authority database token after the scoped credential lookup.',
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

/** Dynamic loading is confined to these exact local source/binding owners.
 * Archived modules also pin the filenames. The fixture verifies hashes before
 * writing any of those files to its private run directory. */
export const dynamicModuleOwners: Readonly<
  Record<string, string | { readonly members: readonly string[]; readonly purpose: string }>
> = {
  'scripts/verification-workers/workspace-check.mjs':
    'Loads only the admitted checkout workspace-binding guard before any database or game starts.',
  'scripts/compare-world-survival.ts':
    'Loads exact selected local domain/spatial source paths for offline comparison.',
  'scripts/performance/workspace-bindings.ts':
    'Verifies the managed case’s declared local workspace package bindings without loading them.',
  'scripts/performance/witness-sustained.ts': {
    members: ['typed-provider.mts', 'linux-process-accounting.mjs'],
    purpose: 'Loads the verified loopback provider and Linux resource observer for this case.',
  },
  'scripts/performance/witness-sustained-client.ts': {
    members: ['stream.mts'],
    purpose: 'Loads the verified signed stream reader from its parent’s private run directory.',
  },
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
