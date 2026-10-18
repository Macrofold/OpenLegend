import { parseArgs } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import { copyFile, mkdir, readFile, realpath, stat, statfs, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ARTIFACT_BOUNDARIES,
  artifactReferenceKey,
  assertAssetManifest,
  assertAssetRevisionReference,
  sameArtifact,
  type ArtifactBoundary,
  type ArtifactReference,
  type AssetManifest,
  type AssetRevisionReference,
} from '@open-legend/assets';
import {
  assetRepositoryRoot,
  readAssetConfiguration,
  readAssetIndex,
  readAssetManifestText,
  readAssetRetentionLimits,
} from '../apps/server/src/asset-configuration.js';
import {
  S3AssetStorage,
  hashAssetFile,
  type ExactStoredObject,
} from '../apps/server/src/asset-storage.js';
import {
  AssetRepository,
  type AssetDomain,
  type AssetUse,
} from '../apps/server/src/asset-repository.js';
import { AssetPublisher, prepareAssetManifest } from '../apps/server/src/asset-publication.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { createAssetResolver } from '../apps/server/src/asset-runtime.js';
import { externalAssetPath } from '../apps/server/src/asset-directories.js';
import { inventoryTrackedAssets, writeAssetInventory } from './assets/inventory.js';
import { materializeMigrationSource, type MigrationSourceRecord } from './assets/migration.js';
import { mutateAssetAuthority } from './assets/authority-workflows.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    config: { type: 'string' },
    name: { type: 'string' },
    index: { type: 'string' },
    path: { type: 'string' },
    prefix: { type: 'string' },
    output: { type: 'string' },
    manifest: { type: 'string' },
    operation: { type: 'string' },
    boundary: { type: 'string' },
    domain: { type: 'string' },
    use: { type: 'string' },
    evidence: { type: 'string' },
    account: { type: 'string' },
    permissions: { type: 'string' },
    expected: { type: 'string' },
    selection: { type: 'string' },
    'source-root': { type: 'string' },
    all: { type: 'boolean' },
    help: { type: 'boolean' },
    port: { type: 'string' },
    page: { type: 'string' },
    'public-reviewed': { type: 'boolean' },
    origin: { type: 'string' },
    sources: { type: 'string' },
    hosting: { type: 'string' },
    'authority-domain': { type: 'string' },
    bootstrap: { type: 'boolean' },
    public: { type: 'boolean' },
    plan: { type: 'string' },
    'source-config': { type: 'string', multiple: true },
    'quarantine-domain': { type: 'string' },
    'prohibit-bytes': { type: 'boolean' },
  },
});
const command = positionals[0] ?? 'help';
const required = (name: keyof typeof values): string => {
  const value = values[name];
  if (typeof value !== 'string' || !value) throw new Error(`Missing --${name}.`);
  return value;
};
const expectedRevision = () => {
  const number = Number(values.expected ?? 0);
  if (!Number.isSafeInteger(number) || number < 0)
    throw new Error('--expected must be a nonnegative revision.');
  return number;
};
const configuration = await readAssetConfiguration(values.config);
const resolverOptions = {
  ...(values.config ? { configPath: values.config } : {}),
  ...(values.index ? { indexPath: values.index } : {}),
};
const authorityDomain = values['authority-domain'] ?? 'openlegend-assets';
if (authorityDomain !== 'openlegend-assets')
  throw new Error(
    'This project asset catalog uses the established openlegend-assets recovery authority. A different marker cannot authorize its mutations.',
  );
async function sourceConfigurations() {
  const paths = values['source-config'] ?? [];
  if (paths.length > 8)
    throw new Error('At most eight explicitly trusted environment configurations may be selected.');
  const configurations = [];
  for (const path of paths) {
    const source = await readAssetConfiguration(resolve(path));
    if (
      source.accountId !== configuration.accountId ||
      source.region !== configuration.region ||
      source.profile !== configuration.profile ||
      source.buckets['asset-recovery'] !== configuration.buckets['asset-recovery'] ||
      source.buckets.intake !== configuration.buckets.intake
    )
      throw new Error(
        'Source environments must share the selected project, Region, operator profile and recovery/intake boundaries.',
      );
    configurations.push(source);
  }
  return configurations;
}
const changeAuthority = <T>(
  repo: AssetRepository,
  principal: { accountId: string },
  change: unknown,
  mutation: () => Promise<T>,
) =>
  mutateAssetAuthority(
    {
      repository: repo,
      configuration,
      principal,
      domain: authorityDomain,
      operationId: values.operation,
      change,
      bootstrap: values.bootstrap === true,
    },
    mutation,
  );
function destination(): AssetDomain {
  const boundary = required('boundary');
  if (!ARTIFACT_BOUNDARIES.includes(boundary as ArtifactBoundary))
    throw new Error('Unknown storage boundary.');
  const accessDomain = required('domain');
  return {
    boundary: boundary as ArtifactBoundary,
    accessDomain,
    visibility: accessDomain === 'public' ? 'public' : 'restricted',
  };
}
async function repository<T>(
  operation: (
    repo: AssetRepository,
    storage: S3AssetStorage,
    principal: { accountId: string },
  ) => Promise<T>,
  readOnly = false,
): Promise<T> {
  const url = process.env['OPEN_LEGEND_DATABASE_URL'];
  if (!url || !['postgres:', 'postgresql:'].includes(new URL(url).protocol))
    throw new Error(
      'Publication needs OPEN_LEGEND_DATABASE_URL for the owning PostgreSQL database.',
    );
  const storage = new S3AssetStorage(configuration, readOnly ? 'authoring' : 'publication');
  let database: PostgresDatabase | undefined;
  try {
    const principal = { accountId: await storage.principal() };
    database = new PostgresDatabase(url, readOnly);
    const repo = new AssetRepository(database);
    if (!readOnly) await repo.initialize();
    return await operation(repo, storage, principal);
  } finally {
    try {
      await database?.close();
    } finally {
      storage.close();
    }
  }
}
async function manifestInput(): Promise<AssetManifest> {
  const text = await readAssetManifestText(
    resolve(required('manifest')),
    configuration.publication.maxManifestBytes,
  );
  const value: unknown = JSON.parse(text);
  assertAssetManifest(value);
  return value;
}
function selectedPaths(files: Record<string, ArtifactReference>): string[] {
  if (values.path) {
    if (!Object.hasOwn(files, values.path))
      throw new Error('The requested path is absent from the exact selected release.');
    return [values.path];
  }
  if (values.prefix) {
    const prefix = values.prefix.replace(/\/+$/, '') + '/';
    const result = Object.keys(files).filter((path) => path.startsWith(prefix));
    if (!result.length) throw new Error('The selected release has no files under that prefix.');
    return result;
  }
  if (values.all) return Object.keys(files);
  throw new Error(
    'Select --path, --prefix or explicit --all; asset work never syncs the whole library by default.',
  );
}
async function outsideRepository(path: string): Promise<string> {
  const absolute = await externalAssetPath(path);
  await mkdir(dirname(absolute), { recursive: true, mode: 0o700 });
  return absolute;
}
async function writeExactOutput(path: string, value: unknown): Promise<void> {
  const content = JSON.stringify(value, null, 2) + '\n';
  try {
    await writeFile(path, content, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
    if ((await readAssetManifestText(path, Buffer.byteLength(content))) !== content)
      throw new Error('The existing output belongs to different exact recovery work.');
  }
}
async function run(): Promise<void> {
  if (values.help || command === 'help') {
    console.log(`OpenLegend asset workflows (exact selected references; profile from assets/config.json)
  inventory --output /outside/repository/inventory.ndjson
  inspect [--path repository/path]
  environment --name development|production --output /outside/repository/environment.json
  pull|verify [--public] --path PATH | --prefix PREFIX | --all
  workspace [--public] --path PATH | --prefix PREFIX --output /outside/repository/workspace
  prepare --manifest FILE --boundary BOUNDARY --domain DOMAIN
  initialize --manifest FILE --boundary BOUNDARY --domain DOMAIN
  approve --manifest FILE --boundary BOUNDARY --domain DOMAIN --use USE[,USE] --evidence RECORD [--expected N]
  publish --manifest FILE --boundary BOUNDARY --domain DOMAIN --operation ID
    [--source-root DIRECTORY | --sources REGISTRY.json] [--hosting NAMED_TARGETS.json]
    [--public-reviewed] [--selection KEY --expected N]
  publish-plan --plan PLAN.json --sources REGISTRY.json --output /outside/repository/publication
    --boundary BOUNDARY --domain DOMAIN --use USE[,USE] --evidence RECORD [--public-reviewed]
  grant --boundary BOUNDARY --domain DOMAIN --account ACCOUNT --permissions read[,publish,manage,offline] [--expected N]
  withdraw --manifest FILE --boundary BOUNDARY --domain DOMAIN --evidence REASON
    [--operation ID] [--source-config FROZEN_ENV_CONFIG] [--prohibit-bytes [--path MANIFEST_PATH]]
  serve [--port PORT] [--page /art-study.html]
  login --page /restricted/curated-private/PUBLISHED/PAGE.html
  install --operation ID [--origin http://127.0.0.1:3211]
  authority-export --output /outside/repository/current-authority.json
  recovery-initialize --output /outside/repository/authority-work
  recovery-create --operation CHECKPOINT --output /outside/repository/checkpoint-work [--source-config FROZEN_ENV_CONFIG]
  recovery-verify --manifest LOCATOR.json --output /outside/repository/verified-restore
  recovery-restore-catalog --source-root /outside/repository/verified-restore
  recovery-reconcile --output /outside/repository/current-authority-work
  recovery-restore-objects --source-root /outside/repository/verified-restore --quarantine-domain recovery-ID --output /outside/repository/restored-locations.json
All commands accept --config FILE; pulls/viewers accept --index FILE.
serve defaults to assets/locks/studies.json; other asset reads default to development.json.
--public uses anonymous HTTPS delivery; private reads require current SQL permission.
Publishing opens the existing exclusive PostgreSQL writer; stop the local game first.
AWS credentials remain in the named CLI/SDK session and are never written to a lock.`);
    return;
  }
  if (command === 'inventory') {
    const output = await outsideRepository(required('output'));
    await writeAssetInventory({ root: assetRepositoryRoot }, output);
    console.log(JSON.stringify({ inventory: output }));
    return;
  }
  if (command === 'environment') {
    const environment = required('name');
    if (environment !== 'production' && environment !== 'development')
      throw new Error('Select development or production explicitly.');
    const { writeAssetEnvironment } = await import('./assets/environment.js');
    console.log(
      JSON.stringify(
        await writeAssetEnvironment({
          configuration,
          environment,
          output: await outsideRepository(required('output')),
        }),
      ),
    );
    return;
  }
  if (command === 'inspect') {
    const index = await readAssetIndex(values.index);
    if (values.path) {
      const file = index.files[values.path];
      if (!file) throw new Error('No exact file exists at that selected path.');
      console.log(JSON.stringify({ release: index.release, path: values.path, file }, null, 2));
    } else
      console.log(
        JSON.stringify(
          {
            release: index.release,
            files: Object.keys(index.files).length,
            bytes: Object.values(index.files).reduce((sum, ref) => sum + ref.bytes, 0),
          },
          null,
          2,
        ),
      );
    return;
  }
  if (['pull', 'verify', 'workspace'].includes(command)) {
    const index = await readAssetIndex(values.index);
    const paths = selectedPaths(index.files);
    const resolver = await createAssetResolver({
      ...resolverOptions,
      publicOnly: values.public === true,
    });
    for (const path of paths) resolver.reference(path);
    const output =
      command === 'workspace' ? await outsideRepository(required('output')) : undefined;
    if (output) {
      await mkdir(output, { mode: 0o700 });
      const disk = await statfs(output);
      const requiredBytes = paths.reduce((sum, path) => sum + index.files[path]!.bytes, 0);
      if (requiredBytes > disk.bavail * disk.bsize)
        throw new Error('The selected editable workspace exceeds available disk space.');
    }
    let bytes = 0;
    try {
      const prepare = async (repo?: AssetRepository, principal?: { accountId: string }) => {
        // The shared cache independently bounds concurrent processes and reserved bytes.
        for (const path of paths) {
          const reference = index.files[path]!;
          if (repo && principal)
            await repo.authorizeArtifact(
              principal,
              index.release,
              reference,
              output ? 'offline' : 'read',
            );
          const file = await resolver(path);
          try {
            if (repo && principal)
              await repo.authorizeArtifact(
                principal,
                index.release,
                reference,
                output ? 'offline' : 'read',
              );
            if (command === 'verify') {
              const check = await hashAssetFile(file.path);
              if (check.sha256 !== file.reference.sha256 || check.bytes !== file.reference.bytes)
                throw new Error(`Cached file failed exact verification: ${path}`);
            }
            if (output) {
              const target = resolve(output, path);
              if (!target.startsWith(output + sep)) throw new Error('Unsafe workspace path.');
              await mkdir(dirname(target), { recursive: true, mode: 0o700 });
              const actualParent = await realpath(dirname(target));
              if (!actualParent.startsWith(output + sep) && actualParent !== output)
                throw new Error('Workspace parent escaped through a symbolic link.');
              await copyFile(file.path, target, 1); // COPYFILE_EXCL: never overwrite unsaved art.
            }
            bytes += file.reference.bytes;
          } finally {
            await file.release();
          }
        }
      };
      if (values.public) await prepare();
      else await repository((repo, _storage, principal) => prepare(repo, principal), true);
    } finally {
      await resolver.close();
    }
    console.log(
      JSON.stringify({
        operation: command,
        files: paths.length,
        bytes,
        ...(output ? { workspace: output } : {}),
      }),
    );
    return;
  }
  if (command === 'prepare') {
    const manifest = await manifestInput();
    const prepared = prepareAssetManifest(manifest, destination());
    console.log(
      JSON.stringify(
        { reference: prepared.reference, manifestArtifact: prepared.manifestArtifact },
        null,
        2,
      ),
    );
    return;
  }
  if (command === 'initialize') {
    const manifest = await manifestInput();
    await repository(async (repo, _storage, principal) => {
      const domains = new Map<string, AssetDomain>();
      for (const file of Object.values(manifest.files)) {
        const domain: AssetDomain = {
          boundary: file.boundary,
          accessDomain: file.accessDomain,
          visibility: file.accessDomain === 'public' ? 'public' : 'restricted',
        };
        domains.set(JSON.stringify([domain.boundary, domain.accessDomain]), domain);
      }
      const target = destination();
      domains.set(JSON.stringify([target.boundary, target.accessDomain]), target);
      await changeAuthority(
        repo,
        principal,
        { operation: 'initialize', domains: [...domains.values()] },
        async () => {
          for (const domain of domains.values())
            await repo.initializeDomain(domain, principal.accountId);
          return { initializedDomains: domains.size };
        },
      );
      console.log(
        JSON.stringify({ initializedDomains: domains.size, principal: principal.accountId }),
      );
    });
    return;
  }
  if (command === 'approve') {
    const manifest = await manifestInput();
    const domain = destination();
    const prepared = prepareAssetManifest(manifest, domain);
    const permitted = required('use').split(',');
    const uses: AssetUse[] = [];
    for (const use of permitted) {
      if (
        ![
          'source',
          'private-study',
          'public-study',
          'private-runtime',
          'public-runtime',
          'offline',
          'recovery',
        ].includes(use)
      )
        throw new Error(`Unsupported asset use: ${use}`);
      uses.push(use as AssetUse);
    }
    await repository(async (repo, _storage, principal) => {
      const revision = await changeAuthority(
        repo,
        principal,
        {
          operation: 'approve',
          reference: prepared.reference,
          domain,
          uses,
          evidence: required('evidence'),
          expected: expectedRevision(),
        },
        () =>
          repo.approveRights(
            principal,
            { reference: prepared.reference, domain, uses, evidence: [required('evidence')] },
            expectedRevision(),
          ),
      );
      console.log(JSON.stringify({ reference: prepared.reference, rightsRevision: revision }));
    });
    return;
  }
  if (command === 'publish') {
    const manifest = await manifestInput();
    const sourceRoot = await realpath(resolve(values['source-root'] ?? assetRepositoryRoot));
    const sources = new Map<string, string>();
    for (const [path, reference] of Object.entries(manifest.files))
      sources.set(artifactReferenceKey(reference), path);
    const registry = values.sources
      ? (JSON.parse(
          await readAssetManifestText(resolve(values.sources), 16 * 1024 * 1024),
        ) as Record<string, MigrationSourceRecord>)
      : undefined;
    const hosting = values.hosting
      ? (JSON.parse(await readAssetManifestText(resolve(values.hosting), 16 * 1024 * 1024)) as {
          key: string;
          sha256: string;
          bytes: number;
          mediaType: string;
        }[])
      : [];
    const exactFiles = new Map(
      Object.values(manifest.files).map((file) => [
        JSON.stringify([file.sha256, file.bytes, file.mediaType]),
        file,
      ]),
    );
    const namedFiles = hosting.map((target) => {
      const reference = exactFiles.get(
        JSON.stringify([target.sha256, target.bytes, target.mediaType]),
      );
      // A missing named page must refuse the whole publication, rather than commit
      // a successful release with a silently omitted permanent link.
      if (!reference)
        throw new Error('A named hosting target is absent from the exact selected manifest.');
      return { reference, key: target.key };
    });
    const namedFilesByArtifact = new Map<string, typeof namedFiles>();
    for (const target of namedFiles) {
      const identity = artifactReferenceKey(target.reference);
      const targets = namedFilesByArtifact.get(identity) ?? [];
      targets.push(target);
      namedFilesByArtifact.set(identity, targets);
    }
    await repository(async (repo, storage, principal) => {
      const source = async (reference: ArtifactReference, signal?: AbortSignal) => {
        if (registry) {
          const record = registry[artifactReferenceKey(reference)];
          if (!record || !sameArtifact(record.reference, reference))
            throw new Error(
              'The explicit source registry does not contain this exact approved file.',
            );
          return materializeMigrationSource(record, { directory: tmpdir(), signal });
        }
        const path = sources.get(artifactReferenceKey(reference));
        if (!path) throw new Error('No admitted source exists for this exact output file.');
        const actual = await realpath(resolve(sourceRoot, path));
        if (!actual.startsWith(sourceRoot + sep))
          throw new Error('Source escaped its explicitly selected root.');
        return { path: actual, release: async () => undefined };
      };
      const location = (stored: ExactStoredObject) => ({
        accountId: stored.accountId,
        region: stored.region,
        bucket: stored.bucket,
        key: stored.key,
        ...(stored.versionId ? { versionId: stored.versionId } : {}),
      });
      const receipt = (reference: ArtifactReference, stored: ExactStoredObject) => ({
        reference,
        fullFileSha256: reference.sha256,
        bytes: reference.bytes,
        mediaType: reference.mediaType,
        verifiedAt: new Date().toISOString(),
        reason: 'publication' as const,
        location: location(stored),
      });
      let transferredFiles = 0;
      let transferredBytes = 0;
      const publisher = new AssetPublisher(
        repo,
        {
          ensureArtifact: async (reference, context) => {
            let stored;
            const preparedSource = await source(reference, context.signal);
            try {
              stored = await storage.upload(reference, preparedSource.path);
            } catch (error) {
              throw new Error(
                `Asset transfer failed for ${reference.sha256} (${reference.bytes} bytes): ${error instanceof Error ? error.message : 'unknown failure'}`,
                { cause: error },
              );
            } finally {
              await preparedSource.release();
            }
            transferredFiles++;
            transferredBytes += reference.bytes;
            if (transferredFiles % 25 === 0)
              console.error(
                JSON.stringify({
                  verifiedFiles: transferredFiles,
                  verifiedBytes: transferredBytes,
                }),
              );
            const locations = [];
            for (const target of namedFilesByArtifact.get(artifactReferenceKey(reference)) ?? []) {
              const copied = await storage.copy(reference, reference, target.key);
              locations.push({
                ...location(copied),
                ...(copied.sourceVersionId ? { sourceVersionId: copied.sourceVersionId } : {}),
              });
            }
            return { ...receipt(reference, stored), ...(locations.length ? { locations } : {}) };
          },
          putManifest: async (reference, bytes) => {
            const folder = await import('node:fs/promises').then((fs) =>
              fs.mkdtemp(join(tmpdir(), 'ol-asset-manifest-')),
            );
            const file = join(folder, 'manifest.json');
            try {
              await writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
              return receipt(reference, await storage.upload(reference, file));
            } finally {
              await import('node:fs/promises').then((fs) =>
                fs.rm(folder, { recursive: true, force: true }),
              );
            }
          },
        },
        {
          ...configuration.publication,
          ...(await readAssetRetentionLimits()),
          maxTransferConcurrency: configuration.cache.maxConcurrent,
          maxInFlightBytes: configuration.maxObjectBytes,
        },
      );
      const result = await publisher.publish({
        operationId: required('operation'),
        principal,
        manifest,
        destination: destination(),
        storage: {
          accountId: configuration.accountId,
          region: configuration.region,
          bucket: storage.bucket(destination().boundary),
        },
        dependencyStorage: Object.fromEntries(
          Object.entries(configuration.buckets).map(([boundary, bucket]) => [
            boundary,
            {
              accountId: configuration.accountId,
              region: configuration.region,
              bucket,
            },
          ]),
        ),
        configurationRevision: createHash('sha256')
          .update(JSON.stringify(configuration))
          .digest('hex'),
        ...(values['public-reviewed'] ? { publicProjectionReviewed: true } : {}),
        ...(namedFiles.length ? { namedFiles } : {}),
        ...(values.selection
          ? { selection: { key: values.selection, expectedRevision: expectedRevision() } }
          : {}),
      });
      console.log(JSON.stringify(result, null, 2));
    });
    return;
  }
  if (command === 'publish-plan') {
    const { publishAssetPlan } = await import('./assets/publish-plan.js');
    console.log(
      JSON.stringify(
        await publishAssetPlan({
          planPath: required('plan'),
          sourcesPath: required('sources'),
          directory: await outsideRepository(required('output')),
          destination: destination(),
          uses: required('use'),
          evidence: required('evidence'),
          configPath: values.config,
          publicReviewed: values['public-reviewed'] === true,
        }),
      ),
    );
    return;
  }
  if (command === 'grant') {
    const permitted = required('permissions').split(',');
    if (permitted.some((value) => !['read', 'publish', 'manage', 'offline'].includes(value)))
      throw new Error('Unknown asset permission.');
    await repository(async (repo, _storage, principal) => {
      const revision = await changeAuthority(
        repo,
        principal,
        {
          operation: 'grant',
          domain: destination(),
          account: required('account'),
          permitted,
          expected: expectedRevision(),
        },
        () =>
          repo.setGrant(
            principal,
            destination(),
            required('account'),
            permitted as ('read' | 'publish' | 'manage' | 'offline')[],
            expectedRevision(),
          ),
      );
      console.log(JSON.stringify({ grantRevision: revision }));
    });
    return;
  }
  if (command === 'withdraw') {
    const manifest = await manifestInput();
    const prepared = prepareAssetManifest(manifest, destination());
    const reference = prepared.reference;
    if (values.path && !values['prohibit-bytes'])
      throw new Error(
        '--path narrows only an explicit --prohibit-bytes operation. Logical withdrawal applies to the exact revision.',
      );
    let prohibited: ArtifactReference[] | undefined;
    if (values['prohibit-bytes']) {
      if (values.path && !Object.hasOwn(manifest.files, values.path))
        throw new Error('The selected prohibited file is absent from the exact manifest.');
      prohibited = values.path
        ? [manifest.files[values.path]!]
        : [...Object.values(manifest.files), prepared.manifestArtifact];
      prohibited = [
        ...new Map(
          prohibited.map((reference) => [artifactReferenceKey(reference), reference]),
        ).values(),
      ];
    }
    const configurations = await sourceConfigurations();
    const { withdrawAssetRevision } = await import('./assets/withdrawal.js');
    await repository(async (repo, _storage, principal) => {
      const result = await withdrawAssetRevision({
        repository: repo,
        configuration,
        sourceConfigurations: configurations,
        principal,
        authorityDomain,
        operationId:
          values.operation ??
          'withdraw-' +
            createHash('sha256')
              .update(JSON.stringify([reference, required('evidence'), prohibited ?? []]))
              .digest('hex')
              .slice(0, 40),
        reference,
        reason: required('evidence'),
        ...(prohibited ? { prohibited } : {}),
        progress: (value) =>
          process.stderr.write(JSON.stringify({ assetWithdrawal: value }) + '\n'),
      });
      console.log(JSON.stringify(result));
    });
    return;
  }
  if (command === 'authority-export') {
    const output = await outsideRepository(required('output'));
    await repository(async (repo) => {
      const snapshot = await repo.restrictionSnapshot();
      await writeFile(output, JSON.stringify(snapshot), { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ authority: output, generation: snapshot.generation }));
    });
    return;
  }
  if (command.startsWith('recovery-')) {
    const workflows = await import('./assets/recovery.js');
    const storage = new S3AssetStorage(
      configuration,
      [
        'recovery-verify',
        'recovery-restore-catalog',
        'recovery-reconcile',
        'recovery-restore-objects',
      ].includes(command)
        ? 'recovery-restore'
        : 'recovery-writer',
    );
    const additionalStorages: S3AssetStorage[] = [];
    try {
      if (command === 'recovery-verify') {
        const locator = JSON.parse(
          await readAssetManifestText(resolve(required('manifest')), 128 * 1024),
        ) as import('./assets/recovery.js').RecoveryObject;
        const checkpoint = await workflows.verifyAssetRecoveryCheckpoint(storage, locator, {
          directory: await outsideRepository(required('output')),
        });
        console.log(
          JSON.stringify({
            verified: checkpoint.id,
            artifacts: checkpoint.artifacts.length,
            authorityGeneration: checkpoint.authorityGeneration,
          }),
        );
        return;
      }
      await repository(async (repo) => {
        if (command === 'recovery-initialize') {
          const result = await workflows.initializeRecoveryAuthority(repo, storage, {
            domain: authorityDomain,
            directory: await outsideRepository(required('output')),
          });
          console.log(
            JSON.stringify({
              authorityDomain,
              generation: result.generation,
              status: result.status,
            }),
          );
        } else if (command === 'recovery-create') {
          const { readConfig } = await import('../apps/server/src/config.js');
          const directory = await outsideRepository(required('output'));
          for (const source of await sourceConfigurations())
            additionalStorages.push(new S3AssetStorage(source, 'recovery-writer'));
          const locator = await workflows.createAssetRecoveryCheckpoint(repo, storage, {
            checkpointId: required('operation'),
            authorityDomain,
            sourceDirectory: values['source-root']
              ? await realpath(values['source-root'])
              : readConfig().dataDirectory,
            directory,
            sourceStorages: additionalStorages,
          });
          await writeExactOutput(join(directory, 'locator.json'), locator);
          console.log(JSON.stringify(locator));
        } else if (command === 'recovery-restore-catalog') {
          await workflows.restoreAssetRecoveryCatalog(
            repo,
            await realpath(required('source-root')),
          );
          console.log(
            JSON.stringify({
              restored: true,
              access: 'quarantined until current authority is reconciled',
            }),
          );
        } else if (command === 'recovery-reconcile') {
          const generation = await workflows.reconcileRecoveredAssetAuthority(repo, storage, {
            domain: authorityDomain,
            directory: await outsideRepository(required('output')),
          });
          console.log(JSON.stringify({ reconciled: generation }));
        } else if (command === 'recovery-restore-objects') {
          const checkpoint = JSON.parse(
            await readAssetManifestText(
              join(await realpath(required('source-root')), 'manifest.json'),
              64 * 1024 * 1024,
            ),
          ) as import('./assets/recovery.js').AssetRecoveryCheckpoint;
          const result = await workflows.restoreAssetRecoveryObjects(repo, storage, checkpoint, {
            quarantineDomain: required('quarantine-domain'),
          });
          const output = await outsideRepository(required('output'));
          await writeExactOutput(output, result);
          console.log(
            JSON.stringify({
              restored: result.restored,
              unavailable: result.unavailable.length,
              receipt: output,
            }),
          );
        } else throw new Error('Unknown recovery command.');
      });
    } finally {
      storage.close();
      for (const source of additionalStorages) source.close();
    }
    return;
  }
  if (command === 'serve') {
    const { serveAssetWork } = await import('./assets/serve.js');
    await serveAssetWork({
      ...resolverOptions,
      port: Number(values.port ?? 0),
      page: values.page ?? '/art-study.html',
    });
    return;
  }
  if (command === 'login') {
    const { openAssetStudy } = await import('./assets/cloud-login.js');
    const page = required('page');
    await repository(async (repo, storage, principal) => {
      const receipt = await openAssetStudy({
        page,
        authorize: () =>
          repo.authorizeNamedArtifact(
            principal,
            {
              accountId: configuration.accountId,
              region: configuration.region,
              bucket: storage.bucket('art-studies'),
            },
            'art-studies',
            'curated-private',
            decodeURIComponent(page.slice(1)),
          ),
      });
      console.log(JSON.stringify(receipt));
    }, true);
    return;
  }
  if (command === 'install') {
    const { installLocalAssetRelease } = await import('./assets/install.js');
    const receipt = await installLocalAssetRelease({
      origin: values.origin ?? 'http://127.0.0.1:' + (process.env['PORT'] ?? '3211'),
      operationId: required('operation'),
      reference: (await readAssetIndex(values.index)).release,
    });
    console.log(JSON.stringify(receipt));
    return;
  }
  throw new Error(`Unknown asset operation: ${command}. Use pnpm assets help.`);
}
try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Asset operation failed.');
  process.exitCode = 1;
}
