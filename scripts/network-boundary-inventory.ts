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
  'apps/server/src/authentication.ts': ['openid-client'],
  'apps/server/src/asset-storage.ts': [
    '@aws-sdk/client-s3',
    '@aws-sdk/client-sts',
    '@aws-sdk/credential-providers',
    '@smithy/node-http-handler',
  ],
  'infrastructure/assets/study-access.cts': ['@aws-sdk/client-secrets-manager'],
  'apps/server/src/world-mcp.ts': ['@modelcontextprotocol/node', '@modelcontextprotocol/server'],
  'scripts/performance/profile-browser.mjs': ['@playwright/test'],
  'scripts/art/texel-splatting/run.mjs': ['@playwright/test'],
};

/** These runners execute local programs/files. Changing one to remote work must
 * move that invocation through runRemoteProcess with an explicit finite profile.
 */
export const localProcessOwners: Readonly<Record<string, string>> = {
  'scripts/decision-benchmark/main.ts': 'Local Git root inspection only.',
  'scripts/decision-benchmark/run.ts': 'Local Git revision/diff inspection only.',
  'scripts/decision-benchmark/escalation.ts': 'Local Git revision/diff inspection only.',
  'scripts/profile-server.ts': 'Local Git revision inspection only.',
  'scripts/performance/profile-server.mjs':
    'Local profiling server child; outgoing work uses script network boundary.',
  'scripts/stress-data.ts': 'Local Git revision inspection only.',
  'scripts/check-agent-guidance.mjs': 'Local Git inventory only.',
  'scripts/check-assets.ts': 'Local Git inventory only.',
  'scripts/stress-native.ts': 'Local native workload child with its existing workload lifecycle.',
  'scripts/assets/migration.ts': 'Local Git object inspection; no fetch/clone/pull.',
  'scripts/assets/inventory.ts': 'Local Git index inspection; no remote operation.',
  'scripts/decision-benchmark/escalation-load.ts':
    'Offline fixture load and local Git revision; external fetch is replaced by a throwing fixture.',
};

/** Command positions are closed; later arguments are local revision/path data.
 * Git global options (including -c aliases) cannot precede these commands. */
export const localGitCommands: Readonly<Record<string, readonly string[]>> = {
  'scripts/decision-benchmark/main.ts': ['rev-parse'],
  'scripts/decision-benchmark/run.ts': ['rev-parse', 'ls-files', 'diff'],
  'scripts/decision-benchmark/escalation.ts': ['rev-parse', 'diff'],
  'scripts/profile-server.ts': ['rev-parse', 'ls-files', 'branch'],
  'scripts/stress-data.ts': ['rev-parse'],
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
  'scripts/decision-benchmark/escalation-load.ts': ['rev-parse', 'diff'],
};

/** The only local Node children execute these checked-in files, never strings. */
export const localNodeEntries: Readonly<Record<string, { kind: 'spawn' | 'fork'; entry: string }>> =
  {
    'scripts/stress-native.ts': { kind: 'spawn', entry: './profile-native.ts' },
    'scripts/performance/profile-server.mjs': { kind: 'fork', entry: 'self' },
  };

export const acquisitionObservers: Readonly<Record<string, string>> = {
  'scripts/decision-benchmark/escalation-load.ts':
    'Offline test block replaces global fetch with a throwing implementation; no production dispatch.',
};

export const inboundOwners: Readonly<Record<string, string>> = {
  'apps/server/src/http.ts': 'Incoming game HTTP/SSE, bounded receive and blocked-write ownership.',
  'apps/server/src/creation-host.ts': 'Incoming prepared-world HTTP, bounded receive ownership.',
  'apps/server/src/world-mcp.ts': 'Incoming MCP HTTP transport.',
  'scripts/assets/serve.ts': 'Incoming local exact-asset HTTP.',
};

export const networkDependencies: Readonly<Record<string, string>> = {
  '@aws-sdk/client-s3': 'asset-storage.ts',
  '@aws-sdk/client-sts': 'asset-storage.ts',
  '@aws-sdk/credential-providers': 'asset-storage.ts',
  '@smithy/node-http-handler': 'asset-storage.ts',
  '@aws-sdk/client-secrets-manager':
    'Generated study-access source; the runtime supplies this exact SDK family.',
  'openid-client': 'authentication.ts',
  '@modelcontextprotocol/node':
    'Incoming MCP transport; SDK must not create unclassified remote clients.',
  '@modelcontextprotocol/server': 'Incoming MCP server.',
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
  'scripts/performance/workspace-bindings.ts':
    'Resolves declared workspace package paths without invoking their network clients.',
};

/** Generated cloud source is checked against its canonical source by the required
 * network:generate --check step. Other inline cloud functions are scanned as JS. */
export const generatedNetworkArtifacts: Readonly<Record<string, string>> = {
  'infrastructure/assets/template.json#Resources.StudyAccess.Properties.Code.ZipFile':
    'infrastructure/assets/study-access.cts',
};

export const fixtureToolOwners: Readonly<Record<string, string>> = {
  'scripts/performance/profile-action-input.ts':
    'Disposable PostgreSQL-backed native input measurement; no listener, inference worker or provider calls.',
  'scripts/capture-starting-art-study.ts':
    'Disposable native HTTP journey through bounded test helper; no app deployment import.',
  'scripts/decision-benchmark/escalation-load.ts':
    'Offline fixture workload; external inference is blocked.',
};

/** Browser-only qualification entries are test authority, never application
 * imports. Each executable fixture needs its own reviewed source record. */
export const testSourceOwners: Readonly<Record<string, string>> = {
  'apps/client/test-fixtures/renderer-network.ts':
    'In-memory browser qualification of real PlayCanvas model parsing and resource cleanup with synthetic transport completion.',
};
