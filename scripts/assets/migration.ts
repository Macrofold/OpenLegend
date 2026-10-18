import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  statfs,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, posix, resolve, sep } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify, parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  artifactReferenceKey,
  artifactKey,
  assertArtifactReference,
  sameArtifact,
  type ArtifactReference,
  type AssetManifest,
  type AssetIndex,
} from '@open-legend/assets';
import { prepareAssetManifest } from '../../apps/server/src/asset-publication.js';
import { externalAssetPath } from '../../apps/server/src/asset-directories.js';
import {
  readAssetIndex,
  readAssetManifestText,
} from '../../apps/server/src/asset-configuration.js';
import {
  assetMediaType,
  fileSha256,
  inventoryTrackedAssets,
  type AssetInventoryRecord,
} from './inventory.js';
import { planReferenceRewrite } from './migrate-references.js';

const execute = promisify(execFile);
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
// Share the CLI's admitted metadata boundary; never buffer an arbitrary-sized
// operator-selected JSON file merely to discover its record count afterward.
const readPlanJson = async (path: string) =>
  JSON.parse(await readAssetManifestText(path, 16 * 1024 * 1024));
/** A revision names all immutable manifest meaning, including provenance and
 * dependencies. Files alone cannot distinguish two different admitted releases. */
function identifyManifest(manifest: AssetManifest): AssetManifest {
  const { revisionId: _revisionId, ...identity } = manifest.identity;
  return {
    ...manifest,
    identity: {
      ...identity,
      revisionId: 'sha256-' + hash(JSON.stringify({ ...manifest, identity })),
    },
  };
}
export type MigrationSource =
  | { kind: 'file'; path: string }
  | { kind: 'git-blob'; root: string; objectId: string };
export interface MigrationSourceRecord {
  reference: ArtifactReference;
  source: MigrationSource;
  originalPaths: string[];
}

/** Materialize one admitted source at a time. The caller owns release even when
 * an upload fails; neither the complete history nor an object-sized buffer is retained. */
export async function materializeMigrationSource(
  record: MigrationSourceRecord,
  options: { directory: string; signal?: AbortSignal },
): Promise<{ path: string; release(): Promise<void> }> {
  assertArtifactReference(record.reference);
  options.signal?.throwIfAborted();
  if (record.source.kind === 'file') {
    const stat = await lstat(record.source.path);
    if (
      !stat.isFile() ||
      stat.size !== record.reference.bytes ||
      (await fileSha256(record.source.path, options.signal)) !== record.reference.sha256
    )
      throw new Error('The exact migration source file is unavailable or changed.');
    return { path: record.source.path, release: async () => undefined };
  }
  if (!/^[a-f0-9]{40,64}$/.test(record.source.objectId))
    throw new Error('A migration Git source requires a complete blob identity.');
  const capacity = await statfs(options.directory);
  if (record.reference.bytes > capacity.bavail * capacity.bsize)
    throw new Error('The exact migration source exceeds available temporary disk capacity.');
  const directory = await mkdtemp(join(await realpath(options.directory), 'asset-source-'));
  const path = join(directory, record.reference.sha256);
  const child = spawn('git', ['cat-file', 'blob', record.source.objectId], {
    cwd: record.source.root,
    stdio: ['ignore', 'pipe', 'pipe'],
    signal: options.signal,
  });
  const completed = once(child, 'close');
  void completed.catch(() => undefined);
  let errorText = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (text: string) => {
    errorText = (errorText + text).slice(-8192);
  });
  let bytes = 0;
  const digest = createHash('sha256');
  const bounded = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      bytes += chunk.length;
      if (bytes > record.reference.bytes)
        return done(new Error('Git source exceeds its admitted byte length.'));
      digest.update(chunk);
      done(null, chunk);
    },
  });
  const release = () => rm(directory, { recursive: true, force: true });
  try {
    await pipeline(child.stdout, bounded, createWriteStream(path, { flags: 'wx', mode: 0o600 }), {
      signal: options.signal,
    });
    const [code] = await completed;
    if (
      code !== 0 ||
      bytes !== record.reference.bytes ||
      digest.digest('hex') !== record.reference.sha256
    )
      throw new Error('Exact migration Git source failed verification: ' + errorText);
    return { path, release };
  } catch (error) {
    if (child.exitCode === null) child.kill();
    await completed.catch(() => undefined);
    await release();
    throw error;
  }
}
export interface CurrentMigrationPreparation {
  outputRoot: string;
  sourcesPath: string;
  inventoryPath: string;
  development: { manifestPath: string; indexPath: string };
  library: { manifestPath: string; indexPath: string };
  operator: { manifestPath: string; indexPath: string };
  files: number;
  bytes: number;
}
export interface CurrentMigrationOptions {
  root: string;
  outputRoot: string;
  /** Only set after the owner authorizes public presentation of this collection. */
  publicPresentation?: boolean;
}
async function git(root: string, args: string[]) {
  return (await execute('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 })).stdout;
}
async function outside(output: string) {
  const target = await externalAssetPath(output);
  await mkdir(target, { mode: 0o700 });
  return target;
}
async function json(path: string, value: unknown) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
function register(
  sources: Map<string, MigrationSourceRecord>,
  path: string,
  reference: ArtifactReference,
  source: MigrationSource,
) {
  const key = artifactReferenceKey(reference);
  const prior = sources.get(key);
  if (prior) {
    if (!sameArtifact(prior.reference, reference))
      throw new Error(`Identical stored bytes have conflicting MIME/length metadata: ${path}`);
    if (!prior.originalPaths.includes(path)) prior.originalPaths.push(path);
  } else sources.set(key, { reference, source, originalPaths: [path] });
}
async function writeSelection(
  outputRoot: string,
  name: string,
  files: Record<string, ArtifactReference>,
  sourceCommit: string,
  kind: AssetManifest['kind'],
  publicPresentation = false,
) {
  const manifest = identifyManifest({
    kind,
    identity: {
      owner: { kind: 'collection', id: 'openlegend-curated' },
      assetId: name,
      revisionId: 'pending',
    },
    files,
    dependencies: [],
    rightsEvidence: [
      publicPresentation
        ? 'owner-authorized-public-study-and-source-presentation-2026-10-17'
        : 'owner-authorized-private-preservation; source licenses remain separately required',
    ],
    metadata: {
      sourceCommit,
      rightsStatus: publicPresentation
        ? 'Owner-authorized presentation and source access; upstream production licenses and reference-only limits remain applicable.'
        : 'Preservation does not grant production or public-study qualification.',
    },
  });
  const prepared = prepareAssetManifest(manifest, {
    boundary: kind === 'release' ? 'runtime' : kind === 'study' ? 'art-studies' : 'art-library',
    accessDomain: publicPresentation ? 'public' : 'curated-private',
    visibility: publicPresentation ? 'public' : 'restricted',
  });
  const manifestPath = join(outputRoot, name + '.manifest.json');
  await writeFile(manifestPath, prepared.manifestText, { flag: 'wx', mode: 0o600 });
  const index: AssetIndex = { release: prepared.reference, files };
  const indexPath = join(outputRoot, name + '.index.json');
  await json(indexPath, index);
  return { manifestPath, indexPath };
}
async function runtimeClosure(root: string, tracked: string[]): Promise<Set<string>> {
  const paths = new Set<string>();
  for (const path of tracked) {
    if (
      path.startsWith('apps/client/src/') &&
      /\.(?:ts|tsx|css)$/.test(path) &&
      !/\/(?:art-study|scene-study)\.ts$/.test(path)
    ) {
      const text = await readFile(join(root, path), 'utf8');
      for (const match of text.matchAll(/assetUrl\(\s*['"](apps\/client\/[^'"]+)['"]/g))
        paths.add(match[1]!);
    }
    if (/^apps\/client\/src\/props\/art-study\/source-[^/]+\/catalog\.json$/.test(path)) {
      const catalog: unknown = JSON.parse(await readFile(join(root, path), 'utf8'));
      if (
        !catalog ||
        typeof catalog !== 'object' ||
        !('group' in catalog) ||
        typeof catalog.group !== 'string' ||
        !('assets' in catalog) ||
        !Array.isArray(catalog.assets)
      )
        throw new Error(`Malformed authored study catalog: ${path}`);
      for (const asset of catalog.assets) {
        if (!asset || typeof asset !== 'object')
          throw new Error(`Malformed catalog asset: ${path}`);
        for (const field of ['file', 'animatedFile', 'depletedFile']) {
          const file: unknown = Object.getOwnPropertyDescriptor(asset, field)?.value;
          if (typeof file === 'string')
            paths.add(`apps/client/src/props/art-study/${catalog.group}/${file}`);
        }
      }
    }
    if (/^apps\/client\/src\/props\/library-environment\/scenery-[^/]+\.json$/.test(path))
      paths.add(path);
    if (path.startsWith('apps/client/src/design-system/fonts/') && path.endsWith('.woff2'))
      paths.add(path);
  }
  return paths;
}
async function fontRights(root: string, path: string): Promise<string> {
  const fonts = 'apps/client/src/design-system/fonts/';
  const name = path.slice(fonts.length);
  const families: Record<string, string> = {
    'atkinson-hyperlegible-next-': 'atkinsonhyperlegiblenext-OFL.txt',
    'chakra-petch-': 'chakrapetch-OFL.txt',
    'cinzel-': 'cinzel-OFL.txt',
    'cormorant-garamond-': 'cormorantgaramond-OFL.txt',
    'ibm-plex-mono-': 'ibmplexmono-OFL.txt',
  };
  const license = Object.entries(families).find(([prefix]) => name.startsWith(prefix))?.[1];
  if (!license) throw new Error(`No reviewed family license maps to this font: ${path}`);
  const licensePath = fonts + license;
  const text = await readFile(join(root, licensePath), 'utf8');
  if (!/SIL OPEN FONT LICENSE/i.test(text) || !/permission is hereby granted/i.test(text))
    throw new Error(`The retained font license requires review: ${licensePath}`);
  return licensePath;
}

function preservationContext(path: string): boolean {
  return (
    (path.startsWith('art-direction/') ||
      /^apps\/client\/src\/(?:props|characters|design-system\/fonts)\//.test(path)) &&
    /(?:\.(?:md|txt|json|html|css|[cm]?js|py|sh)|(?:^|\/)LICENSE(?:\.[^/]*)?)$/i.test(path) &&
    !/(?:^|\/)(?:[^/]*private[^/]*|\.env|node_modules|__pycache__)(?:\/|$)/i.test(path)
  );
}

function contextMediaType(path: string): string {
  if (/\.md$/i.test(path)) return 'text/markdown; charset=utf-8';
  if (/\.css$/i.test(path)) return 'text/css; charset=utf-8';
  if (/\.[cm]?js$/i.test(path)) return 'text/javascript; charset=utf-8';
  if (/\.(?:txt|py|sh)$/i.test(path) || /(?:^|\/)LICENSE(?:\.[^/]*)?$/i.test(path))
    return 'text/plain; charset=utf-8';
  return assetMediaType(path);
}

export interface MigrationHostingFile {
  /** Exact StudiesBucket key; the configured CDN strips only /studies. */
  key: string;
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  url: string;
  originalPath: string;
}

/** Partition immutable manifests by their actual serialized byte budget. Child
 * revisions publish first; the root pins their complete exact dependency set. */
export async function splitMigrationManifest(options: {
  manifestPath: string;
  outputRoot: string;
  maxManifestBytes: number;
  maxFilesPerManifest?: number;
  hostingPath?: string;
}) {
  if (!Number.isSafeInteger(options.maxManifestBytes) || options.maxManifestBytes < 8192)
    throw new Error('Manifest partition allowance must fit metadata and at least one file.');
  const outputRoot = await outside(options.outputRoot);
  const original: AssetManifest = await readPlanJson(options.manifestPath);
  const maxFiles = options.maxFilesPerManifest ?? 20000;
  if (!Number.isSafeInteger(maxFiles) || maxFiles <= 0)
    throw new Error('Manifest file partition allowance must be a positive safe integer.');
  const hosting: MigrationHostingFile[] | undefined = options.hostingPath
    ? await readPlanJson(options.hostingPath)
    : undefined;
  const chunks: Record<string, ArtifactReference>[] = [];
  let files: Record<string, ArtifactReference> = {};
  let fileCount = 0;
  let bytes = 2;
  const allowance = options.maxManifestBytes - 4096;
  for (const [path, reference] of Object.entries(original.files)) {
    const size = Buffer.byteLength(JSON.stringify({ [path]: reference })) + 1;
    if (size > allowance)
      throw new Error('One exact manifest file description exceeds its byte allowance.');
    if ((bytes + size > allowance || fileCount >= maxFiles) && fileCount) {
      chunks.push(files);
      files = {};
      fileCount = 0;
      bytes = 2;
    }
    files[path] = reference;
    fileCount++;
    bytes += size;
  }
  if (fileCount) chunks.push(files);
  const sample = Object.values(original.files)[0];
  if (!sample) throw new Error('Only a nonempty file manifest needs partitioning.');
  const isPublic = sample.accessDomain === 'public';
  const destination = {
    boundary:
      original.kind === 'release'
        ? ('runtime' as const)
        : original.kind === 'study'
          ? ('art-studies' as const)
          : ('art-library' as const),
    accessDomain: isPublic ? 'public' : 'curated-private',
    visibility: isPublic ? ('public' as const) : ('restricted' as const),
  };
  const write = async (name: string, manifest: AssetManifest, selectedFiles = manifest.files) => {
    const prepared = prepareAssetManifest(identifyManifest(manifest), destination);
    if (Buffer.byteLength(prepared.manifestText) > options.maxManifestBytes)
      throw new Error('Serialized migration manifest exceeds its admitted byte allowance.');
    const manifestPath = join(outputRoot, name + '.manifest.json');
    const indexPath = join(outputRoot, name + '.index.json');
    await writeFile(manifestPath, prepared.manifestText, { flag: 'wx', mode: 0o600 });
    await json(indexPath, { release: prepared.reference, files: selectedFiles });
    return {
      manifestPath,
      indexPath,
      reference: prepared.reference,
      bytes: Buffer.byteLength(prepared.manifestText),
    };
  };
  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    const selectedFiles = chunks[i]!;
    const name = original.identity.assetId + '-part-' + String(i + 1).padStart(3, '0');
    const part = await write(name, {
      ...original,
      identity: { ...original.identity, assetId: name },
      files: selectedFiles,
      dependencies: [],
    });
    const hostingPath = hosting ? join(outputRoot, name + '.hosting.json') : undefined;
    if (hostingPath) {
      const description = (file: { sha256: string; bytes: number; mediaType: string }) =>
        JSON.stringify([file.sha256, file.bytes, file.mediaType]);
      const refs = new Set(Object.values(selectedFiles).map(description));
      await json(
        hostingPath,
        hosting!.filter((file) => refs.has(description(file))),
      );
    }
    parts.push({ ...part, ...(hostingPath ? { hostingPath } : {}) });
  }
  const dependencies = [...original.dependencies, ...parts.map((part) => part.reference)];
  const parent = await write(
    original.identity.assetId,
    {
      ...original,
      identity: {
        ...original.identity,
      },
      files: {},
      dependencies,
    },
    original.files,
  );
  const result = {
    outputRoot,
    ...parent,
    parts,
    files: Object.keys(original.files).length,
    maxManifestBytes: options.maxManifestBytes,
    maxFilesPerManifest: maxFiles,
    publishOrder: [...parts.map((part) => part.manifestPath), parent.manifestPath],
  };
  await json(join(outputRoot, 'partition-plan.json'), result);
  return result;
}
export interface ViewerMigrationPreparation {
  outputRoot: string;
  sourcesPath: string;
  manifestPath: string;
  indexPath: string;
  hostingPath: string;
  linkMapPath: string;
  pages: number;
  sourceRecords: number;
  unresolved: { documentPath: string; original: string; sourcePath: string }[];
}

/** Current navigation may use today's compiled tools without rewriting an old
 * comparison to imply that its historical renderer has been reproduced. */
export async function prepareStudyNavigation(options: {
  root: string;
  outputRoot: string;
  boardLinkMapPath: string;
  boardIndexPath: string;
  compiledPlanPath: string;
  studyBaseUrl: string;
}) {
  const root = await realpath(options.root);
  const outputRoot = await outside(options.outputRoot);
  const board = (await readPlanJson(options.boardLinkMapPath)) as {
    documents: Record<string, string>;
    sourcePages: Record<string, string>;
    assets: Record<string, string>;
  };
  const index = await readAssetIndex(options.boardIndexPath);
  const compiled = (await readPlanJson(options.compiledPlanPath)) as {
    reference: AssetIndex['release'];
    artStudyUrl: string;
    sceneStudyUrl: string;
  };
  const base = publicBase(options.studyBaseUrl);
  const sourceCommit = (await git(root, ['rev-parse', 'HEAD'])).trim();
  const recipe = await fileSha256(fileURLToPath(import.meta.url));
  const inputs = {
    board,
    indexRelease: index.release,
    compiled,
    base: base.href,
    sourceCommit,
    recipe,
  };
  const snapshot = 'navigation-' + hash(JSON.stringify(inputs));
  const key = 'public/viewers/' + snapshot + '/index.html';
  const url = pathUrl(base, key);
  for (const destination of [
    compiled.artStudyUrl,
    compiled.sceneStudyUrl,
    ...Object.values(board.documents),
    ...Object.values(board.sourcePages),
  ]) {
    const target = new URL(destination);
    if (
      target.origin !== base.origin ||
      !target.pathname.startsWith(base.pathname) ||
      target.username ||
      target.password ||
      target.search ||
      target.hash
    )
      throw new Error(
        'Study navigation requires exact permanent links under the selected study origin.',
      );
  }
  const links = Object.entries(board.documents)
    .map(
      ([path, destination]) =>
        `<li><a href="${escapeHtml(destination)}">${escapeHtml(path)}</a></li>`,
    )
    .join('');
  const text = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OpenLegend art studies</title><style>body{max-width:70rem;margin:3rem auto;padding:0 1rem;background:#17211e;color:#e2dfcd;font:17px/1.65 system-ui}a{color:#e2cf99}li{margin:.55rem 0;overflow-wrap:anywhere}h2{margin-top:2rem}</style><h1>OpenLegend art studies</h1><p>Explore the current models and starting scene, or open a preserved comparison board with its exact captures and source downloads.</p><h2>Interactive inspection</h2><ul><li><a href="${escapeHtml(compiled.artStudyUrl)}">Inspect models, materials and art variants</a></li><li><a href="${escapeHtml(compiled.sceneStudyUrl)}">Inspect the starting scene and camera</a></li></ul><p>These tools use the current published renderer and selected asset collection. Archived boards retain their recorded appearances; the current tools do not reproduce an earlier renderer.</p><h2>Preserved comparison boards</h2><ul>${links}</ul><p>Each preserved board keeps its source and capture links. Source records describe the exact original path, SHA-256, byte length and download. The project owner authorized public study and source access; upstream licenses, attribution and reference-only limits still apply. Public access does not qualify an asset for production use.</p></html>`;
  const reference: ArtifactReference = {
    boundary: 'art-studies',
    accessDomain: 'public',
    sha256: hash(text),
    bytes: Buffer.byteLength(text),
    mediaType: 'text/html; charset=utf-8',
  };
  const path = join(outputRoot, 'index.html');
  await writeFile(path, text, { flag: 'wx', mode: 0o600 });
  const files = { [key]: reference };
  const manifest = identifyManifest({
    kind: 'study',
    identity: {
      owner: { kind: 'collection', id: 'openlegend-curated' },
      assetId: 'current-study-navigation',
      revisionId: 'pending',
    },
    files,
    dependencies: [index.release, compiled.reference],
    rightsEvidence: ['owner-authorized-public-study-and-source-presentation-2026-10-17'],
    metadata: {
      sourceCommit,
      purpose:
        'Current inspection entry points with exact preserved historical boards; historical renderer limits remain explicit.',
    },
  });
  const prepared = prepareAssetManifest(manifest, {
    boundary: 'art-studies',
    accessDomain: 'public',
    visibility: 'public',
  });
  const manifestPath = join(outputRoot, 'navigation.manifest.json');
  const indexPath = join(outputRoot, 'navigation.index.json');
  const sourcesPath = join(outputRoot, 'sources.json');
  const hostingPath = join(outputRoot, 'hosting.json');
  const linkMapPath = join(outputRoot, 'link-map.json');
  await writeFile(manifestPath, prepared.manifestText, { flag: 'wx', mode: 0o600 });
  await json(indexPath, { release: prepared.reference, files });
  await json(sourcesPath, {
    [artifactReferenceKey(reference)]: {
      reference,
      source: { kind: 'file', path },
      originalPaths: [key],
    },
  });
  await json(hostingPath, [
    { key, path, ...reference, url, originalPath: 'current-study-navigation' },
  ]);
  await json(linkMapPath, { ...board, navigation: url, verifiedHosted: false });
  const result = {
    outputRoot,
    manifestPath,
    indexPath,
    sourcesPath,
    hostingPath,
    linkMapPath,
    reference: prepared.reference,
    url,
    files: 1,
    bytes: reference.bytes,
    verifiedHosted: false,
  };
  await json(join(outputRoot, 'navigation-plan.json'), result);
  return result;
}

/** Retain a reviewed self-contained external viewer unchanged. A common exact
 * path mirror preserves both document-relative fetches and module-relative imports. */
export async function prepareOriginalPathMirror(options: {
  root: string;
  outputRoot: string;
  indexPath: string;
  sourcesPath: string;
  sourcePrefix: string;
  studyBaseUrl: string;
  name: string;
}) {
  const root = await realpath(options.root);
  const outputRoot = await outside(options.outputRoot);
  const index = await readAssetIndex(options.indexPath);
  const registry: Record<string, MigrationSourceRecord> = await readPlanJson(options.sourcesPath);
  const base = publicBase(options.studyBaseUrl);
  if (
    !options.sourcePrefix.endsWith('/') ||
    options.sourcePrefix.startsWith('/') ||
    options.sourcePrefix.includes('\\') ||
    options.sourcePrefix
      .split('/')
      .slice(0, -1)
      .some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('A source mirror requires an explicit ordinary relative prefix.');
  const selected = Object.entries(index.files);
  if (!selected.length || selected.length > 20000)
    throw new Error('Source mirror exceeds its bounded file selection.');
  for (const [path, reference] of selected) {
    assertArtifactReference(reference);
    if (
      !path.startsWith(options.sourcePrefix) ||
      reference.boundary !== 'art-studies' ||
      reference.accessDomain !== 'public'
    )
      throw new Error(
        'A public source mirror requires exact independently published study copies under its selected prefix.',
      );
  }
  const snapshot = hash(
    JSON.stringify({
      index,
      sourcePrefix: options.sourcePrefix,
      base: base.href,
      name: options.name,
    }),
  );
  const prefix = 'public/viewers/source-' + snapshot + '/';
  const files: Record<string, ArtifactReference> = {};
  const sources = new Map<string, MigrationSourceRecord>();
  const hosting: MigrationHostingFile[] = [];
  const links: Record<string, string> = {};
  for (const [originalPath, reference] of selected) {
    const record = registry[artifactReferenceKey(reference)];
    if (!record || !sameArtifact(record.reference, reference))
      throw new Error('Source mirror lacks its exact verified source record.');
    const materialized = await materializeMigrationSource(record, { directory: outputRoot });
    let path = materialized.path;
    try {
      if (record.source.kind === 'git-blob') {
        path = join(outputRoot, reference.sha256);
        if (!sources.has(artifactReferenceKey(reference))) await rename(materialized.path, path);
      }
      const key = prefix + originalPath.slice(options.sourcePrefix.length);
      files[key] = reference;
      register(sources, key, reference, { kind: 'file', path });
      const url = pathUrl(base, key);
      links[originalPath] = url;
      hosting.push({ key, path, ...reference, url, originalPath });
    } finally {
      await materialized.release();
    }
  }
  const manifest = identifyManifest({
    kind: 'study',
    identity: {
      owner: { kind: 'collection', id: 'openlegend-curated' },
      assetId: options.name,
      revisionId: 'pending',
    },
    files,
    dependencies: [index.release],
    rightsEvidence: ['owner-authorized-public-study-and-source-presentation-2026-10-17'],
    metadata: {
      purpose:
        'Exact original external viewer and relative source closure; retained historical renderer and rights limitations apply.',
      originalRelease: index.release,
    },
  });
  const prepared = prepareAssetManifest(manifest, {
    boundary: 'art-studies',
    accessDomain: 'public',
    visibility: 'public',
  });
  const manifestPath = join(outputRoot, 'mirror.manifest.json'),
    indexPath = join(outputRoot, 'mirror.index.json'),
    sourcesPath = join(outputRoot, 'sources.json'),
    hostingPath = join(outputRoot, 'hosting.json'),
    linkMapPath = join(outputRoot, 'link-map.json');
  await writeFile(manifestPath, prepared.manifestText, { flag: 'wx', mode: 0o600 });
  await json(indexPath, { release: prepared.reference, files });
  await json(sourcesPath, Object.fromEntries(sources));
  await json(hostingPath, hosting);
  await json(linkMapPath, { links, verifiedHosted: false });
  const result = {
    outputRoot,
    manifestPath,
    indexPath,
    sourcesPath,
    hostingPath,
    linkMapPath,
    reference: prepared.reference,
    files: selected.length,
    bytes: Object.values(files).reduce((sum, file) => sum + file.bytes, 0),
    prefix,
    verifiedHosted: false,
  };
  await json(join(outputRoot, 'mirror-plan.json'), result);
  return result;
}

export interface HistoricalMigrationRef {
  name: string;
  commit: string;
}
export interface HistoricalMigrationPreparation {
  outputRoot: string;
  sourcesPath: string;
  inventoryPath: string;
  provenancePath: string;
  scopePath: string;
  manifestPath: string;
  indexPath: string;
  files: number;
  bytes: number;
}
const historicalMedia =
  /\.(?:avif|bin|blend\d*|dae|dds|fbx|flac|gif|glb|gltf|gz|jpe?g|mov|mp3|mp4|ogg|otf|pdf|png|psd|svg|tga|tiff?|ttf|wav|webm|webp|woff2?|xlsx|zip)$/i;
function historicalCandidate(path: string) {
  return (
    historicalMedia.test(path) ||
    preservationContext(path) ||
    /(?:^|\/)scenery-[^/]+\.json$/.test(path) ||
    path.endsWith('/art-study/starting-world.json')
  );
}

/** A single git cat-file process streams objects serially with bounded buffering. */
class GitBlobReader {
  readonly child;
  private readonly chunks;
  private readonly completion;
  private current = Buffer.alloc(0);
  private cursor = 0;
  private errorText = '';
  constructor(root: string) {
    this.child = spawn('git', ['cat-file', '--batch'], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.completion = once(this.child, 'close');
    void this.completion.catch(() => undefined);
    this.chunks = this.child.stdout[Symbol.asyncIterator]();
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (text: string) => {
      this.errorText = (this.errorText + text).slice(-8192);
    });
  }
  private async take(maximum: number): Promise<Buffer> {
    if (this.cursor === this.current.length) {
      const next = await this.chunks.next();
      if (next.done) throw new Error('Git source ended unexpectedly: ' + this.errorText);
      this.current = Buffer.from(next.value);
      this.cursor = 0;
    }
    const end = Math.min(this.current.length, this.cursor + maximum);
    const chunk = this.current.subarray(this.cursor, end);
    this.cursor = end;
    return chunk;
  }
  private async header() {
    let header = '';
    while (header.length < 256) {
      const byte = await this.take(1);
      if (byte[0] === 10) return header;
      header += byte.toString('ascii');
    }
    throw new Error('Invalid Git object header.');
  }
  async inspect(objectId: string, capture = false) {
    if (!/^[a-f0-9]{40,64}$/.test(objectId)) throw new Error('Invalid complete Git blob identity.');
    this.child.stdin.write(objectId + '\n');
    const [returned, kind, length] = (await this.header()).split(' ');
    const bytes = Number(length);
    if (returned !== objectId || kind !== 'blob' || !Number.isSafeInteger(bytes) || bytes < 0)
      throw new Error('Selected historical source is not an available Git blob.');
    if (capture && bytes > 16 * 1024 * 1024)
      throw new Error('Historical document exceeds the bounded text preparation allowance.');
    const digest = createHash('sha256');
    const text: Buffer[] = [];
    let remaining = bytes;
    while (remaining > 0) {
      const chunk = await this.take(Math.min(remaining, 64 * 1024));
      remaining -= chunk.length;
      digest.update(chunk);
      if (capture) text.push(chunk);
    }
    if ((await this.take(1))[0] !== 10) throw new Error('Incomplete Git object framing.');
    return {
      bytes,
      sha256: digest.digest('hex'),
      text: capture ? Buffer.concat(text).toString('utf8') : undefined,
    };
  }
  async close() {
    this.child.stdin.end();
    const [code] = await this.completion;
    if (code !== 0) throw new Error('Git object reader failed: ' + this.errorText);
  }
  async abort() {
    this.child.kill();
    await this.completion.catch(() => undefined);
  }
}

async function exactHistoryScope(root: string, refs: readonly HistoricalMigrationRef[]) {
  if (refs.length === 0 || refs.length > 32)
    throw new Error('Select one through 32 exact historical refs.');
  for (const ref of refs) {
    if (!ref.name || !/^[a-f0-9]{40,64}$/.test(ref.commit))
      throw new Error('Historical scope requires named complete commits.');
    const actual = (await git(root, ['rev-parse', '--verify', ref.commit + '^{commit}'])).trim();
    if (actual !== ref.commit) throw new Error('Historical scope commit mismatch.');
  }
  return [...new Map(refs.map((ref) => [JSON.stringify([ref.name, ref.commit]), ref])).values()];
}

/** Preserve every relevant byte and original before/after Git path in the exact
 * approved reachable history. Private preservation grants no public-use rights. */
export async function prepareHistoricalAssetMigration(options: {
  root: string;
  outputRoot: string;
  refs: readonly HistoricalMigrationRef[];
}): Promise<HistoricalMigrationPreparation> {
  const root = await realpath(options.root);
  const refs = await exactHistoryScope(root, options.refs);
  const outputRoot = await outside(options.outputRoot);
  const commits = [...new Set(refs.map((ref) => ref.commit))];
  const log = await git(root, [
    'log',
    ...commits,
    '-m',
    '--raw',
    '--no-renames',
    '--no-abbrev',
    '--root',
    '-z',
    '--format=%x00commit %H%x00',
  ]);
  const tokens = log.split('\0');
  const candidates = new Map<string, Set<string>>();
  const provenance: {
    commit: string;
    path: string;
    before: string | null;
    after: string | null;
    status: string;
  }[] = [];
  let commit = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!.replace(/^\n+/, '');
    if (token.startsWith('commit ')) {
      commit = token.slice(7);
      continue;
    }
    if (!token.startsWith(':')) continue;
    const path = tokens[++i];
    if (!path || !historicalCandidate(path)) continue;
    const fields = token.slice(1).split(' ');
    const [beforeMode, afterMode, before, after, status] = fields;
    if (!before || !after || !status || !commit)
      throw new Error('Invalid Git history source record.');
    const admitted = (id: string, mode: string | undefined) => {
      if (/^0+$/.test(id) || mode === '120000' || mode === '160000') return null;
      let paths = candidates.get(id);
      if (!paths) {
        paths = new Set();
        candidates.set(id, paths);
      }
      paths.add(path);
      return id;
    };
    provenance.push({
      commit,
      path,
      before: admitted(before, beforeMode),
      after: admitted(after, afterMode),
      status,
    });
    if (candidates.size > 20000 || provenance.length > 250000)
      throw new Error(
        'Historical migration exceeds its admitted object/path allowance. Split the explicit source scope.',
      );
  }
  const inventory: {
    objectId: string;
    paths: string[];
    sha256: string;
    bytes: number;
    mediaType: string;
    rightsStatus: string;
  }[] = [];
  const sources = new Map<string, MigrationSourceRecord>();
  const files: Record<string, ArtifactReference> = {};
  const reader = new GitBlobReader(root);
  let bytes = 0;
  try {
    for (const [objectId, paths] of candidates) {
      const first = paths.values().next().value;
      if (!first) continue;
      const entry = await reader.inspect(objectId);
      const mediaType = contextMediaType(first);
      const reference: ArtifactReference = {
        boundary: 'art-library',
        accessDomain: 'curated-private',
        sha256: entry.sha256,
        bytes: entry.bytes,
        mediaType,
      };
      // Object identity scopes identical old paths without conflating iterations.
      files[`git/${objectId}/${first}`] = reference;
      for (const path of paths)
        register(sources, path, reference, { kind: 'git-blob', root, objectId });
      inventory.push({
        objectId,
        paths: [...paths],
        sha256: entry.sha256,
        bytes: entry.bytes,
        mediaType,
        rightsStatus:
          'Private preservation only; retained source licenses and reference-only restrictions apply.',
      });
      bytes += entry.bytes;
    }
    await reader.close();
  } catch (error) {
    await reader.abort();
    throw error;
  }
  const inventoryPath = join(outputRoot, 'historical-inventory.json');
  const provenancePath = join(outputRoot, 'historical-path-provenance.json');
  const scopePath = join(outputRoot, 'historical-scope.json');
  const sourcesPath = join(outputRoot, 'sources.json');
  await json(inventoryPath, inventory);
  await json(provenancePath, provenance);
  await json(scopePath, {
    refs,
    policy:
      'Only the explicitly selected commits and their ancestors; no unrelated local branches, stashes or Codex internal snapshots.',
  });
  await json(sourcesPath, Object.fromEntries(sources));
  const selection = await writeSelection(
    outputRoot,
    'historical-library-preservation',
    files,
    commits[0]!,
    'source-bundle',
  );
  const result = {
    outputRoot,
    sourcesPath,
    inventoryPath,
    provenancePath,
    scopePath,
    ...selection,
    files: inventory.length,
    bytes,
  };
  await json(join(outputRoot, 'historical-plan.json'), result);
  return result;
}

/** Standard self-contained Git bundle, composed in our own temporary bare repo.
 * Never create temporary refs in the user's shared repository. */
export async function prepareHistoricalGitBundle(options: {
  root: string;
  outputPath: string;
  refs: readonly HistoricalMigrationRef[];
}) {
  const root = await realpath(options.root);
  const refs = await exactHistoryScope(root, options.refs);
  const outputPath = await externalAssetPath(options.outputPath);
  const parent = await realpath(dirname(outputPath));
  const existing = await lstat(outputPath).then(
    () => true,
    (error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
      throw error;
    },
  );
  if (existing) throw new Error('Historical bundle output already exists.');
  const objects = await realpath(
    resolve(root, (await git(root, ['rev-parse', '--git-path', 'objects'])).trim()),
  );
  const capacity = await statfs(parent);
  // Packing needs space for the complete reachable Git payload, without pruning
  // the source repository or sharing writable object storage.
  const counts = await git(root, ['count-objects', '-v']);
  const sourceBytes =
    (Number(counts.match(/^size-pack: (\d+)$/m)?.[1] ?? '0') +
      Number(counts.match(/^size: (\d+)$/m)?.[1] ?? '0')) *
    1024;
  if (capacity.bavail * capacity.bsize < sourceBytes + 256 * 1024 * 1024)
    throw new Error(
      'Insufficient local disk space for a complete verified Git preservation bundle.',
    );
  const composer = await mkdtemp(join(parent, 'asset-git-composer-'));
  try {
    await git(composer, ['init', '--bare', '--quiet']);
    await writeFile(join(composer, 'objects/info/alternates'), objects + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    for (let i = 0; i < refs.length; i++)
      await git(composer, [
        'update-ref',
        `refs/heads/preserved-${String(i).padStart(3, '0')}`,
        refs[i]!.commit,
      ]);
    await git(composer, ['bundle', 'create', outputPath, '--all']);
    await git(root, ['bundle', 'verify', outputPath]);
    const stat = await lstat(outputPath);
    return {
      path: outputPath,
      bytes: stat.size,
      sha256: await fileSha256(outputPath),
      refs,
      bundledRefs: (await git(root, ['bundle', 'list-heads', outputPath])).trim().split('\n'),
    };
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error;
  } finally {
    await rm(composer, { recursive: true, force: true });
  }
}

/** Explicit referenced source-package files only. No directory crawling and no
 * provider-private job metadata is admitted by this preservation helper. */
export async function prepareExternalAssetSources(options: {
  root: string;
  sourceRoot: string;
  paths: readonly string[];
  outputRoot: string;
  publicPresentation?: boolean;
}) {
  const root = await realpath(options.root);
  const sourceRoot = await realpath(options.sourceRoot);
  const outputRoot = await outside(options.outputRoot);
  if (options.paths.length > 20000)
    throw new Error('Explicit source file selection exceeds its allowance.');
  const sources = new Map<string, MigrationSourceRecord>();
  const libraryFiles: Record<string, ArtifactReference> = {};
  const studyFiles: Record<string, ArtifactReference> = {};
  let bytes = 0;
  for (const path of options.paths) {
    // Finder metadata and interpreter caches are neither authored sources nor
    // evidence. Exclude them before opening any selected external file.
    if (
      /(?:^|\/)(?:\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX|__pycache__)(?:\/|$)/i.test(path) ||
      path.endsWith('.pyc')
    )
      continue;
    if (
      !path ||
      path.startsWith('/') ||
      path.split('/').some((part) => !part || part === '.' || part === '..') ||
      path.includes('\\') ||
      /(?:^|\/)(?:[^/]*private[^/]*|\.env(?:\.[^/]*)?|__pycache__)(?:\/|$)/i.test(path) ||
      path.endsWith('.pyc')
    )
      throw new Error('Only explicit ordinary non-private art source paths are admitted.');
    const sourcePath = join(sourceRoot, path);
    const actual = await realpath(sourcePath);
    if (!actual.startsWith(sourceRoot + sep))
      throw new Error('External source path escapes its selected package.');
    const stat = await lstat(sourcePath);
    if (!stat.isFile())
      throw new Error('External source must be an ordinary file, not a symbolic link.');
    const sha256 = await fileSha256(sourcePath);
    const after = await lstat(sourcePath);
    if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ino !== stat.ino)
      throw new Error('External source changed during preservation preparation.');
    const key = 'external/OpenLegend-art/' + path;
    const library: ArtifactReference = {
      boundary: 'art-library',
      accessDomain: 'curated-private',
      sha256,
      bytes: stat.size,
      mediaType: contextMediaType(path),
    };
    libraryFiles[key] = library;
    register(sources, key, library, { kind: 'file', path: sourcePath });
    if (options.publicPresentation) {
      const study: ArtifactReference = {
        ...library,
        boundary: 'art-studies',
        accessDomain: 'public',
      };
      studyFiles[key] = study;
      register(sources, key, study, { kind: 'file', path: sourcePath });
    }
    bytes += stat.size;
  }
  const commit = (await git(root, ['rev-parse', 'HEAD'])).trim();
  const library = await writeSelection(
    outputRoot,
    'referenced-source-preservation',
    libraryFiles,
    commit,
    'source-bundle',
  );
  const study = options.publicPresentation
    ? await writeSelection(outputRoot, 'referenced-source-study', studyFiles, commit, 'study', true)
    : undefined;
  const sourcesPath = join(outputRoot, 'sources.json');
  await json(sourcesPath, Object.fromEntries(sources));
  const result = {
    outputRoot,
    sourceRoot,
    sourcesPath,
    library,
    study,
    files: Object.keys(libraryFiles).length,
    bytes,
    exclusions:
      'Explicit provider-private directories, credentials, compiled Python caches and unrelated external files are excluded.',
  };
  await json(join(outputRoot, 'external-source-plan.json'), result);
  return result;
}

/** Preserve a small explicit set of external recovery files with the same
 * verified source registry as media migration; never crawl a parent directory. */
export async function preparePreservationFiles(options: {
  root: string;
  outputRoot: string;
  name: string;
  files: readonly { path: string; originalPath: string }[];
  sourceCommit?: string;
}) {
  const root = await realpath(options.root);
  const outputRoot = await outside(options.outputRoot);
  if (!options.files.length || options.files.length > 20000)
    throw new Error('Preservation requires a bounded explicit file selection.');
  const files: Record<string, ArtifactReference> = {};
  const sources = new Map<string, MigrationSourceRecord>();
  for (const selected of options.files) {
    if (
      !selected.originalPath ||
      selected.originalPath.startsWith('/') ||
      selected.originalPath.includes('\\') ||
      selected.originalPath.split('/').some((part) => !part || part === '.' || part === '..')
    )
      throw new Error('Preservation requires an ordinary relative record path.');
    if (files[selected.originalPath]) throw new Error('Preservation paths must be unique.');
    const path = await realpath(selected.path);
    const info = await lstat(selected.path);
    if (!info.isFile()) throw new Error('Preservation requires an ordinary source file.');
    const sha256 = await fileSha256(path);
    const after = await lstat(path);
    if (after.size !== info.size || after.mtimeMs !== info.mtimeMs || after.ino !== info.ino)
      throw new Error('Preservation source changed while it was being recorded.');
    const reference: ArtifactReference = {
      boundary: 'art-library',
      accessDomain: 'curated-private',
      sha256,
      bytes: info.size,
      mediaType: contextMediaType(selected.originalPath),
    };
    files[selected.originalPath] = reference;
    register(sources, selected.originalPath, reference, { kind: 'file', path });
  }
  const sourceCommit = options.sourceCommit ?? (await git(root, ['rev-parse', 'HEAD'])).trim();
  const selection = await writeSelection(
    outputRoot,
    options.name,
    files,
    sourceCommit,
    'source-bundle',
  );
  const sourcesPath = join(outputRoot, 'sources.json');
  await json(sourcesPath, Object.fromEntries(sources));
  const result = {
    outputRoot,
    ...selection,
    sourcesPath,
    files: Object.keys(files).length,
    bytes: Object.values(files).reduce((sum, file) => sum + file.bytes, 0),
  };
  await json(join(outputRoot, 'preservation-plan.json'), result);
  return result;
}

/** Retain standalone HTML at each distinct approved art-history commit. Media
 * versions are deduplicated by exact bytes; dynamically assembled relative paths
 * retain a bounded original-path mirror. Original HTML remains separately archived. */
export async function prepareHistoricalStudyViewers(options: {
  root: string;
  outputRoot: string;
  refs: readonly HistoricalMigrationRef[];
  inventoryPath: string;
  runtimeBaseUrl: string;
  studyBaseUrl: string;
}) {
  const root = await realpath(options.root);
  const refs = await exactHistoryScope(root, options.refs);
  const outputRoot = await outside(options.outputRoot);
  const inventory: {
    objectId: string;
    paths: string[];
    sha256: string;
    bytes: number;
    mediaType: string;
  }[] = await readPlanJson(options.inventoryPath);
  if (inventory.length > 20000)
    throw new Error('Historical viewer inventory exceeds its admitted allowance.');
  const objects = new Map(inventory.map((entry) => [entry.objectId, entry]));
  const commits = [
    ...new Set([
      ...refs.map((ref) => ref.commit),
      ...(
        await git(root, [
          'log',
          ...refs.map((ref) => ref.commit),
          '--format=%H',
          '--',
          'art-direction',
        ])
      )
        .trim()
        .split('\n')
        .filter(Boolean),
    ]),
  ];
  if (commits.length > 1000)
    throw new Error('Split the selected historical viewers into finite source collections.');
  const sources = new Map<string, MigrationSourceRecord>();
  const allFiles: Record<string, ArtifactReference> = {};
  let allFileCount = 0;
  const hosting = new Map<string, MigrationHostingFile>();
  const snapshots = [];
  const reader = new GitBlobReader(root);
  try {
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i]!;
      const tree = new Map<string, string>();
      for (const entry of (await git(root, ['ls-tree', '-r', '-z', commit])).split('\0')) {
        if (!entry) continue;
        const match = /^(100644|100755) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
        if (match) tree.set(match[3]!, match[2]!);
      }
      const files: Record<string, ArtifactReference> = {};
      const inputSources = new Map<string, MigrationSourceRecord>();
      for (const [path, objectId] of tree) {
        const original = objects.get(objectId);
        if (!original || !historicalCandidate(path)) continue;
        const reference: ArtifactReference = {
          boundary: 'art-studies',
          accessDomain: 'public',
          sha256: original.sha256,
          bytes: original.bytes,
          mediaType: original.mediaType,
        };
        files[path] = reference;
        register(inputSources, path, reference, { kind: 'git-blob', root, objectId });
      }
      if (
        !Object.keys(files).some(
          (path) => path.startsWith('art-direction/') && path.endsWith('.html'),
        )
      )
        continue;
      const inputName = 'snapshot-' + String(i).padStart(3, '0');
      const input = await writeSelection(outputRoot, inputName, files, commit, 'study', true);
      const inputSourcesPath = join(outputRoot, inputName + '.sources.json');
      await json(inputSourcesPath, Object.fromEntries(inputSources));
      const texts = new Map<string, string>();
      let textBytes = 0;
      const prepared = await prepareStudyViewers({
        root,
        outputRoot: join(outputRoot, inputName),
        indexPath: input.indexPath,
        sourcesPath: inputSourcesPath,
        sourceCommit: commit,
        runtimeBaseUrl: options.runtimeBaseUrl,
        studyBaseUrl: options.studyBaseUrl,
        recordAllFiles: false,
        readText: async (path) => {
          const objectId = tree.get(path);
          if (!objectId)
            throw new Error('Historical document is absent from its exact source tree.');
          let text = texts.get(objectId);
          if (text === undefined) {
            text = (await reader.inspect(objectId, true)).text!;
            textBytes += Buffer.byteLength(text);
            if (textBytes > 32 * 1024 * 1024)
              throw new Error(
                'One historical HTML snapshot exceeds the bounded text preparation allowance.',
              );
            texts.set(objectId, text);
          }
          return text;
        },
      });
      const index: AssetIndex = JSON.parse(await readFile(prepared.indexPath, 'utf8'));
      const selectedSources: Record<string, MigrationSourceRecord> = JSON.parse(
        await readFile(prepared.sourcesPath, 'utf8'),
      );
      for (const [path, reference] of Object.entries(index.files)) {
        const key = artifactReferenceKey(reference);
        const prior = sources.get(key);
        const record = selectedSources[key];
        if (!record) throw new Error('Prepared historical viewer is missing an exact source.');
        if (!prior) {
          sources.set(key, record);
          allFiles['preserved/' + reference.sha256] = reference;
          allFileCount++;
        } else {
          if (!sameArtifact(prior.reference, reference))
            throw new Error('Historical source media metadata conflicts.');
          for (const originalPath of record.originalPaths)
            if (!prior.originalPaths.includes(originalPath)) prior.originalPaths.push(originalPath);
        }
        if (allFileCount > 20000)
          throw new Error('Prepared historical viewer files exceed the publication allowance.');
      }
      const snapshotHosting: MigrationHostingFile[] = JSON.parse(
        await readFile(prepared.hostingPath, 'utf8'),
      );
      for (const file of snapshotHosting) {
        const prior = hosting.get(file.key);
        if (
          prior &&
          (prior.sha256 !== file.sha256 ||
            prior.mediaType !== file.mediaType ||
            prior.bytes !== file.bytes)
        )
          throw new Error(
            'Two historical snapshots proposed different bytes for one immutable hosted path.',
          );
        if (!prior) hosting.set(file.key, file);
      }
      snapshots.push({ commit, ...prepared });
    }
    await reader.close();
  } catch (error) {
    await reader.abort();
    throw error;
  }
  const selected = await writeSelection(
    outputRoot,
    'historical-public-studies',
    allFiles,
    refs[0]!.commit,
    'study',
    true,
  );
  const sourcesPath = join(outputRoot, 'sources.json');
  const hostingPath = join(outputRoot, 'hosting.json');
  await json(sourcesPath, Object.fromEntries(sources));
  await json(hostingPath, [...hosting.values()]);
  const result = {
    outputRoot,
    ...selected,
    sourcesPath,
    hostingPath,
    refs,
    snapshots,
    files: allFileCount,
    hostedFiles: hosting.size,
    verifiedHosted: false,
  };
  await json(join(outputRoot, 'historical-viewer-plan.json'), result);
  return result;
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const editableSource = /\.(?:blend\d*|fbx|psd|zip|dae)$/i;
function publicBase(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('Viewer migration requires an explicit credential-free HTTPS destination.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}
function pathUrl(base: URL, path: string) {
  return new URL(path.split('/').map(encodeURIComponent).join('/'), base).href;
}
function sourcePage(path: string, reference: ArtifactReference, download: string, commit: string) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(path)} · preserved source</title><style>body{max-width:60rem;margin:3rem auto;padding:0 1rem;background:#17211e;color:#e2dfcd;font:16px/1.6 system-ui}a{color:#e2cf99}code,dd{overflow-wrap:anywhere}dt{font-weight:bold;margin-top:1rem}dd{margin-left:0}</style><h1>Preserved asset source</h1><p><a href="${escapeHtml(download)}" download>Download ${escapeHtml(posix.basename(path))}</a></p><dl><dt>Original repository path</dt><dd>${escapeHtml(path)}</dd><dt>SHA-256</dt><dd><code>${reference.sha256}</code></dd><dt>Bytes and media type</dt><dd>${reference.bytes} · ${escapeHtml(reference.mediaType)}</dd><dt>Recorded source</dt><dd><code>${escapeHtml(commit)}</code></dd></dl><p>The project owner authorized public study and source access. Original licenses, attribution and reference-only limits still apply; public access does not qualify an asset for production use.</p></html>`;
}

/** Produce hosted copies from an explicit selected public index. The returned
 * URLs are proposed staging destinations; only the uploader can verify hosting. */
export async function prepareStudyViewers(options: {
  root: string;
  outputRoot: string;
  indexPath: string;
  sourcesPath: string;
  runtimeBaseUrl: string;
  studyBaseUrl: string;
  sourceCommit?: string;
  /** Historical snapshots read exact Git text without checking out another tree. */
  readText?: (path: string) => Promise<string>;
  recordAllFiles?: boolean;
  interactiveStudyUrls?: { art: string; scene: string };
}): Promise<ViewerMigrationPreparation> {
  const root = await realpath(options.root);
  const current = await readAssetIndex(options.indexPath);
  if (
    Object.values(current.files).some(
      (reference) => reference.boundary !== 'art-studies' || reference.accessDomain !== 'public',
    )
  )
    throw new Error(
      'Public study viewers require an explicitly published public study-copy index.',
    );
  const outputRoot = await outside(options.outputRoot);
  const existing: Record<string, MigrationSourceRecord> = await readPlanJson(options.sourcesPath);
  const sources = new Map(Object.entries(existing));
  const commit = options.sourceCommit ?? (await git(root, ['rev-parse', 'HEAD'])).trim();
  const loadText = options.readText ?? ((path: string) => readFile(join(root, path), 'utf8'));
  const texts = new Map<string, string>();
  let textBytes = 0;
  const readText = async (path: string) => {
    const cached = texts.get(path);
    if (cached !== undefined) return cached;
    const reference = current.files[path];
    if (
      !reference ||
      reference.bytes > 16 * 1024 * 1024 ||
      textBytes + reference.bytes > 32 * 1024 * 1024
    )
      throw new Error('Study HTML exceeds its bounded exact-text preparation allowance.');
    const text = await loadText(path);
    if (Buffer.byteLength(text) !== reference.bytes || hash(text) !== reference.sha256)
      throw new Error('Study HTML changed after its exact migration inventory was selected.');
    textBytes += reference.bytes;
    texts.set(path, text);
    return text;
  };
  const runtimeBase = publicBase(options.runtimeBaseUrl);
  const studyBase = publicBase(options.studyBaseUrl);
  if (options.interactiveStudyUrls) {
    publicBase(options.interactiveStudyUrls.art);
    publicBase(options.interactiveStudyUrls.scene);
  }
  // Named hosted objects are immutable too. Their namespace must include every
  // rewrite input and the actual recipe, rather than only the selected assets.
  const recipe = await Promise.all([
    fileSha256(fileURLToPath(import.meta.url)),
    fileSha256(fileURLToPath(new URL('./migrate-references.ts', import.meta.url))),
  ]);
  const snapshot =
    'current-' +
    hash(
      JSON.stringify({
        current,
        commit,
        runtimeBase: runtimeBase.href,
        studyBase: studyBase.href,
        recordAllFiles: options.recordAllFiles !== false,
        interactiveStudyUrls: options.interactiveStudyUrls ?? null,
        recipe,
      }),
    );
  const prefix = `public/viewers/${snapshot}/`;
  const files = { ...current.files };
  const destinations = new Map<string, string>();
  const sourcePages: Record<string, string> = {};
  const documentPages: Record<string, string> = {};
  const hosting: MigrationHostingFile[] = [];
  const hostedKeys = new Set<string>();
  const stagedPages = new Set<string>();
  const unresolved: ViewerMigrationPreparation['unresolved'] = [];
  const payloadDirectory = join(outputRoot, 'pages');
  await mkdir(payloadDirectory, { mode: 0o700 });
  const mirrorDirectory = join(outputRoot, 'mirror');
  await mkdir(mirrorDirectory, { mode: 0o700 });
  const addPage = async (key: string, originalPath: string, text: string) => {
    const bytes = Buffer.from(text);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const path = join(payloadDirectory, sha256 + '.html');
    if (!stagedPages.has(path)) {
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
      stagedPages.add(path);
    }
    const reference: ArtifactReference = {
      boundary: 'art-studies',
      accessDomain: 'public',
      sha256,
      bytes: bytes.length,
      mediaType: 'text/html; charset=utf-8',
    };
    files[key] = reference;
    register(sources, key, reference, { kind: 'file', path });
    const entry = {
      key,
      path,
      sha256,
      bytes: bytes.length,
      mediaType: reference.mediaType,
      url: pathUrl(studyBase, key),
      originalPath,
    };
    hosting.push(entry);
    hostedKeys.add(key);
    return entry;
  };
  for (const [path, reference] of Object.entries(current.files)) {
    assertArtifactReference(reference);
    if (reference.accessDomain !== 'public')
      throw new Error(
        'The selected viewer projection must contain only owner-authorized public copies.',
      );
    const canonical = pathUrl(
      reference.boundary === 'runtime' ? runtimeBase : studyBase,
      artifactKey(reference),
    );
    destinations.set(path, canonical);
    if (options.recordAllFiles !== false || editableSource.test(path)) {
      const recordKey = prefix + 'records/' + path + '.html';
      sourcePages[path] = pathUrl(studyBase, recordKey);
      await addPage(recordKey, path, sourcePage(path, reference, canonical, commit));
      if (editableSource.test(path)) destinations.set(path, sourcePages[path]!);
    }
    if (path.startsWith('art-direction/') && path.endsWith('.html')) {
      documentPages[path] = pathUrl(studyBase, prefix + path);
      destinations.set(path, documentPages[path]!);
    }
  }
  // Only recognized prior checkout roots are admitted. File URLs to unrelated
  // workstation data remain unresolved and are reported, never read.
  const roots = new Set([root]);
  for (const path of Object.keys(documentPages)) {
    const text = await readText(path);
    for (const match of text.matchAll(/file:\/\/([^\s"'<>]*\/OpenLegend)\//g)) {
      try {
        roots.add(fileURLToPath('file://' + match[1]));
      } catch {
        /* report at rewriting */
      }
    }
  }
  for (const path of Object.keys(documentPages)) {
    const original = await readText(path);
    // Gallery code may build a scene image from a selected place and light. Keep
    // those exact original paths beside the hosted HTML, without executing JS.
    for (const match of original.matchAll(/(["'])((?:\.{1,2}\/)?[A-Za-z0-9_.\/-]+\/)\1\s*\+/g)) {
      const directory =
        posix.normalize(posix.join(posix.dirname(path), match[2]!)).replace(/\/$/, '') + '/';
      let count = 0;
      for (const [sourcePath, reference] of Object.entries(current.files)) {
        if (!sourcePath.startsWith(directory)) continue;
        const key = prefix + sourcePath;
        count++;
        if (hostedKeys.has(key)) continue;
        const record = existing[artifactReferenceKey(reference)];
        if (!record) throw new Error('The original-path mirror has no exact preserved source.');
        let localPath: string;
        if (record.source.kind === 'file') localPath = record.source.path;
        else {
          localPath = join(mirrorDirectory, reference.sha256);
          const present = await lstat(localPath).then(
            () => true,
            (error: unknown) => {
              if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
                return false;
              throw error;
            },
          );
          if (!present) {
            const materialized = await materializeMigrationSource(record, {
              directory: outputRoot,
            });
            try {
              await rename(materialized.path, localPath);
            } finally {
              await materialized.release();
            }
          }
        }
        hosting.push({
          key,
          path: localPath,
          ...reference,
          url: pathUrl(studyBase, key),
          originalPath: sourcePath,
        });
        hostedKeys.add(key);
      }
      if (!count)
        unresolved.push({ documentPath: path, original: match[0], sourcePath: directory });
    }
    const plan = planReferenceRewrite(path, original, destinations, {
      sourceRoots: [...roots],
      quotedFileReferences: true,
    });
    let text = plan.text;
    for (const missing of plan.unmapped) {
      unresolved.push({ documentPath: path, ...missing });
      if (/\.(?:png|jpe?g|webp|gif|svg)$/i.test(missing.sourcePath)) {
        // A pre-existing missing capture is evidence loss, not permission to
        // substitute another iteration. Show that fact instead of a broken image.
        const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#26332b"/><g fill="#e2dfcd" font-family="sans-serif" text-anchor="middle"><text x="480" y="240" font-size="30">Original capture unavailable</text><text x="480" y="292" font-size="20">${escapeHtml(posix.basename(missing.sourcePath))}</text><text x="480" y="334" font-size="18">This file was already absent from the preserved source.</text></g></svg>`;
        const data = 'data:image/svg+xml;base64,' + Buffer.from(placeholder).toString('base64');
        text = text.replace(
          /\bsrc\s*=\s*(["'])([^"']*)\1/gi,
          (full, quote: string, value: string) =>
            value === missing.original ? `src=${quote}${data}${quote}` : full,
        );
      }
    }
    let localInstructions = false;
    text = text.replace(
      /\bhref\s*=\s*(["'])(https?:\/\/(?:127\.0\.0\.1|localhost):\d+\/(art-study|scene-study)\.html[^"']*)\1/gi,
      (_full, quote: string, originalUrl: string, kind: string) => {
        const original = new URL(originalUrl.replaceAll('&amp;', '&'));
        const selected =
          kind === 'art-study'
            ? options.interactiveStudyUrls?.art
            : options.interactiveStudyUrls?.scene;
        const destination = selected
          ? new URL(selected)
          : new URL(pathUrl(studyBase, prefix + 'interactive-study-instructions.html'));
        if (!selected) localInstructions = true;
        destination.search = original.search;
        destination.hash = original.hash;
        return `href=${quote}${escapeHtml(destination.href)}${quote}`;
      },
    );
    if (localInstructions) {
      const key = prefix + 'interactive-study-instructions.html';
      if (!hostedKeys.has(key))
        await addPage(
          key,
          'local-interactive-study-instructions',
          '<!doctype html><html lang="en"><meta charset="utf-8"><title>Inspect an archived study</title><style>body{max-width:55rem;margin:3rem auto;padding:1rem;font:17px/1.6 system-ui}code{overflow-wrap:anywhere}</style><h1>Inspect an archived study</h1><p>The original comparison linked to an application running on the artist’s computer. That address is not a hosted historical renderer. The preserved board, captures and exact source downloads remain available from their archive links.</p><p>For interactive inspection in the current OpenLegend checkout, select the intended published asset index and run <code>pnpm assets serve --page /art-study.html --index /absolute/path/to/selected.index.json</code>, or choose <code>/scene-study.html</code>. Open the one-use local login URL printed by that command. This uses the current renderer and does not assert that an older renderer has been reproduced.</p></html>',
        );
    }
    await addPage(prefix + path, path, text);
  }
  const selection = await writeSelection(
    outputRoot,
    'hosted-study-viewers',
    files,
    commit,
    'study',
    true,
  );
  const sourcesPath = join(outputRoot, 'sources.json');
  const hostingPath = join(outputRoot, 'hosting.json');
  const linkMapPath = join(outputRoot, 'link-map.json');
  await json(sourcesPath, Object.fromEntries(sources));
  await json(hostingPath, hosting);
  await json(linkMapPath, {
    snapshot,
    sourceCommit: commit,
    documents: documentPages,
    sourcePages,
    assets: Object.fromEntries(destinations),
    verifiedHosted: false,
  });
  const result = {
    outputRoot,
    sourcesPath,
    ...selection,
    hostingPath,
    linkMapPath,
    pages: Object.keys(documentPages).length,
    sourceRecords: Object.keys(sourcePages).length,
    unresolved,
  };
  await json(join(outputRoot, 'viewer-plan.json'), result);
  return result;
}

/** Prepare private preservation and the actual current consumer selection. No upload,
 * rights approval, deletion, historical rewrite or channel selection occurs here. */
export async function prepareCurrentAssetMigration(
  options: CurrentMigrationOptions,
): Promise<CurrentMigrationPreparation> {
  const root = await realpath(options.root);
  const outputRoot = await outside(options.outputRoot);
  const sourceCommit = (await git(root, ['rev-parse', 'HEAD'])).trim();
  const tracked = (await git(root, ['ls-files', '-z'])).split('\0').filter(Boolean);
  const closure = await runtimeClosure(root, tracked);
  const sources = new Map<string, MigrationSourceRecord>();
  const libraryFiles: Record<string, ArtifactReference> = {};
  const runtimeFiles: Record<string, ArtifactReference> = {};
  const operatorFiles: Record<string, ArtifactReference> = {};
  const inventory: AssetInventoryRecord[] = [];
  const licenses = new Set<string>();
  let bytes = 0;
  for await (const entry of inventoryTrackedAssets({ root })) {
    if (inventory.length >= 20000)
      throw new Error(
        'Migration inventory exceeds the current publication file allowance; split the admitted collection.',
      );
    inventory.push(entry);
    bytes += entry.bytes;
    const base = { sha256: entry.sha256, bytes: entry.bytes, mediaType: entry.mediaType };
    const library: ArtifactReference = {
      ...base,
      boundary: 'art-library',
      accessDomain: 'curated-private',
    };
    const source: MigrationSource = { kind: 'file', path: join(root, entry.path) };
    libraryFiles[entry.path] = library;
    register(sources, entry.path, library, source);
    // Inspection is an independently admitted study copy, including private
    // authoring. A mixed library/runtime index cannot be published as one release.
    const study: ArtifactReference = {
      ...base,
      boundary: 'art-studies',
      accessDomain: options.publicPresentation ? 'public' : 'curated-private',
    };
    operatorFiles[entry.path] = study;
    register(sources, entry.path, study, source);
    if (closure.has(entry.path)) {
      const font =
        entry.path.startsWith('apps/client/src/design-system/fonts/') &&
        entry.path.endsWith('.woff2');
      if (font) licenses.add(await fontRights(root, entry.path));
      const runtime: ArtifactReference = {
        ...base,
        boundary: 'runtime',
        accessDomain: options.publicPresentation ? 'public' : 'curated-private',
      };
      runtimeFiles[entry.path] = runtime;
      register(sources, entry.path, runtime, source);
    }
  }
  // Keep attribution, authored catalogs, recipes and original viewer source with
  // the source collection. These small explanatory files are not media inventory.
  for (const path of tracked) {
    if (Object.hasOwn(libraryFiles, path) || !preservationContext(path)) continue;
    const absolute = join(root, path);
    const contents = await readFile(absolute);
    const base = {
      sha256: createHash('sha256').update(contents).digest('hex'),
      bytes: contents.length,
      mediaType: contextMediaType(path),
    };
    const original: ArtifactReference = {
      ...base,
      boundary: 'art-library',
      accessDomain: 'curated-private',
    };
    const source: MigrationSource = { kind: 'file', path: absolute };
    libraryFiles[path] = original;
    register(sources, path, original, source);
    const presentation: ArtifactReference = {
      ...base,
      boundary: 'art-studies',
      accessDomain: options.publicPresentation ? 'public' : 'curated-private',
    };
    operatorFiles[path] = presentation;
    register(sources, path, presentation, source);
  }
  for (const path of licenses) {
    const contents = await readFile(join(root, path));
    const license: ArtifactReference = {
      boundary: 'runtime',
      accessDomain: options.publicPresentation ? 'public' : 'curated-private',
      sha256: createHash('sha256').update(contents).digest('hex'),
      bytes: contents.length,
      mediaType: 'text/plain; charset=utf-8',
    };
    runtimeFiles[path] = license;
    const studyLicense: ArtifactReference = { ...license, boundary: 'art-studies' };
    operatorFiles[path] = studyLicense;
    register(sources, path, license, { kind: 'file', path: join(root, path) });
    register(sources, path, studyLicense, { kind: 'file', path: join(root, path) });
  }
  for (const path of closure)
    if (!Object.hasOwn(runtimeFiles, path))
      throw new Error(`An actual consumer dependency is missing from the media inventory: ${path}`);
  const inventoryPath = join(outputRoot, 'current-inventory.json');
  await json(inventoryPath, inventory);
  const development = await writeSelection(
    outputRoot,
    'development-runtime',
    runtimeFiles,
    sourceCommit,
    'release',
    options.publicPresentation,
  );
  const library = await writeSelection(
    outputRoot,
    'library-preservation',
    libraryFiles,
    sourceCommit,
    'source-bundle',
  );
  const operator = await writeSelection(
    outputRoot,
    options.publicPresentation ? 'public-studies' : 'operator-studies',
    operatorFiles,
    sourceCommit,
    'study',
    options.publicPresentation,
  );
  const sourcesPath = join(outputRoot, 'sources.json');
  await json(sourcesPath, Object.fromEntries(sources));
  const result = {
    outputRoot,
    sourcesPath,
    inventoryPath,
    development,
    library,
    operator,
    files: inventory.length,
    bytes,
  };
  await json(join(outputRoot, 'current-plan.json'), result);
  return result;
}

async function main() {
  const { values } = parseArgs({
    options: { root: { type: 'string' }, output: { type: 'string' }, public: { type: 'boolean' } },
  });
  if (!values.output)
    throw new Error(
      'Usage: migration.ts --output <new-private-directory-outside-repository> [--root <repository>]',
    );
  console.log(
    JSON.stringify(
      await prepareCurrentAssetMigration({
        root: values.root ?? process.cwd(),
        outputRoot: values.output,
        publicPresentation: values.public,
      }),
      null,
      2,
    ),
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
