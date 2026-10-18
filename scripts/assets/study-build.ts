import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  artifactReferenceKey,
  assertAssetRevisionReference,
  sameAssetRevision,
  type ArtifactReference,
  type AssetManifest,
} from '@open-legend/assets';
import { readAssetIndex } from '../../apps/server/src/asset-configuration.js';
import { prepareAssetManifest } from '../../apps/server/src/asset-publication.js';
import { externalAssetPath } from '../../apps/server/src/asset-directories.js';
import type { MigrationHostingFile, MigrationSourceRecord } from './migration.js';

const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const mediaTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
};

/** Freeze one compiled tool against its exact presentation release. Generated
 * JS/CSS and HTML are retained externally; later builds cannot mutate this
 * staging directory or silently update an existing viewer URL. */
export async function prepareCompiledStudyViewer(options: {
  buildRoot: string;
  indexPath: string;
  outputRoot: string;
  studyBaseUrl: string;
  sourceCommit: string;
}) {
  const buildRoot = await realpath(options.buildRoot);
  const outputRoot = await externalAssetPath(options.outputRoot);
  const base = new URL(
    options.studyBaseUrl.endsWith('/') ? options.studyBaseUrl : options.studyBaseUrl + '/',
  );
  if (
    base.origin !== 'https://assets.openlegend.ai' ||
    base.username ||
    base.password ||
    base.pathname !== '/studies/' ||
    base.search ||
    base.hash
  )
    throw new Error('Compiled viewers require the selected public study origin.');
  if (!/^[a-f0-9]{40,64}$/.test(options.sourceCommit))
    throw new Error('Viewer source needs an exact Git commit.');
  const index = await readAssetIndex(options.indexPath);
  if (
    Object.values(index.files).some(
      (reference) =>
        reference.accessDomain !== 'public' ||
        !['runtime', 'art-studies'].includes(reference.boundary),
    )
  )
    throw new Error(
      'Hosted public viewers require an explicitly published public runtime/study copy index.',
    );
  const compiled: unknown = JSON.parse(
    await readFile(join(buildRoot, 'asset-release.json'), 'utf8'),
  );
  if (!compiled || typeof compiled !== 'object' || !('release' in compiled))
    throw new Error('The compiled viewer does not identify its exact presentation release.');
  assertAssetRevisionReference(compiled.release);
  if (!sameAssetRevision(compiled.release, index.release))
    throw new Error(
      'The compiled viewer and selected asset index name different releases. Rebuild before staging.',
    );
  const entries: { path: string; bytes: Buffer; reference: ArtifactReference }[] = [];
  const pending = [''];
  let totalBytes = 0;
  while (pending.length) {
    const directory = pending.pop()!;
    const children = await readdir(join(buildRoot, directory), { withFileTypes: true });
    for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = directory ? directory + '/' + child.name : child.name;
      if (child.isDirectory()) {
        pending.push(path);
        continue;
      }
      const type = mediaTypes[extname(path)];
      if (!child.isFile() || !type || (extname(path) === '.json' && path !== 'asset-release.json'))
        throw new Error('Unexpected compiled viewer payload: ' + path);
      const info = await stat(join(buildRoot, path));
      if (
        info.size > 16 * 1024 * 1024 ||
        totalBytes + info.size > 64 * 1024 * 1024 ||
        entries.length >= 128
      )
        throw new Error('Compiled viewer exceeds its admitted file/byte envelope.');
      const bytes = await readFile(join(buildRoot, path));
      if (bytes.length !== info.size) throw new Error('Compiled viewer changed during staging.');
      if (extname(path) === '.html' && /(?:src|href)=["']\/assets\//.test(bytes.toString()))
        throw new Error('Nested compiled study pages require relative JS and CSS links.');
      if (extname(path) === '.css' && bytes.includes(Buffer.from('/__assets/')))
        throw new Error('Hosted study fonts must resolve through exact public CDN references.');
      totalBytes += bytes.length;
      entries.push({
        path,
        bytes,
        reference: {
          boundary: 'art-studies',
          accessDomain: 'public',
          sha256: sha256(bytes),
          bytes: bytes.length,
          mediaType: type,
        },
      });
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  if (
    !entries.some((entry) => entry.path === 'art-study.html') ||
    !entries.some((entry) => entry.path === 'scene-study.html')
  )
    throw new Error('The compiled study requires both authored inspection tools.');
  const metadata = {
    sourceBaseCommit: options.sourceCommit,
    sourceKind: 'working-tree-build',
    presentationRelease: index.release,
    studyBaseUrl: base.href,
    purpose:
      'Compiled asset and scene inspection. Appearance choices do not alter the installed world rules.',
  };
  const snapshot = sha256(
    JSON.stringify({
      metadata,
      files: entries.map((entry) => [entry.path, entry.reference]),
    }),
  );
  const prefix = 'public/viewers/webgl-' + snapshot + '/';
  const files: Record<string, ArtifactReference> = {};
  const sources: Record<string, MigrationSourceRecord> = {};
  const hosting: MigrationHostingFile[] = [];
  await mkdir(outputRoot, { mode: 0o700 });
  await mkdir(join(outputRoot, 'files'), { mode: 0o700 });
  for (const entry of entries) {
    const path = join(outputRoot, 'files', entry.reference.sha256);
    const logicalPath = prefix + entry.path;
    const key = artifactReferenceKey(entry.reference);
    if (!sources[key]) {
      await writeFile(path, entry.bytes, { flag: 'wx', mode: 0o600 });
      sources[key] = {
        reference: entry.reference,
        source: { kind: 'file', path },
        originalPaths: [logicalPath],
      };
    } else sources[key]!.originalPaths.push(logicalPath);
    files[logicalPath] = entry.reference;
    hosting.push({
      key: logicalPath,
      path,
      ...entry.reference,
      url: new URL(logicalPath, base).href,
      originalPath: entry.path,
    });
  }
  const manifest: AssetManifest = {
    kind: 'study',
    identity: {
      owner: { kind: 'collection', id: 'openlegend-curated' },
      assetId: 'compiled-study-viewer',
      revisionId: 'sha256-' + snapshot,
    },
    files,
    dependencies: [index.release],
    rightsEvidence: ['owner-authorized-public-study-and-source-presentation-2026-10-17'],
    metadata,
  };
  const prepared = prepareAssetManifest(manifest, {
    boundary: 'art-studies',
    accessDomain: 'public',
    visibility: 'public',
  });
  const manifestPath = join(outputRoot, 'compiled-study.manifest.json');
  const sourcesPath = join(outputRoot, 'sources.json');
  const hostingPath = join(outputRoot, 'hosting.json');
  await writeFile(manifestPath, prepared.manifestText, { flag: 'wx', mode: 0o600 });
  await writeFile(sourcesPath, JSON.stringify(sources, null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(hostingPath, JSON.stringify(hosting, null, 2), { flag: 'wx', mode: 0o600 });
  const result = {
    outputRoot,
    manifestPath,
    sourcesPath,
    hostingPath,
    reference: prepared.reference,
    files: entries.length,
    bytes: totalBytes,
    artStudyUrl: new URL(prefix + 'art-study.html', base).href,
    sceneStudyUrl: new URL(prefix + 'scene-study.html', base).href,
    verifiedHosted: false,
  };
  await writeFile(join(outputRoot, 'viewer-plan.json'), JSON.stringify(result, null, 2), {
    flag: 'wx',
    mode: 0o600,
  });
  return result;
}
