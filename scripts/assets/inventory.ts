import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, lstat, realpath } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const mediaTypes: Readonly<Record<string, string>> = {
  '.avif': 'image/avif',
  '.bin': 'application/octet-stream',
  '.blend': 'application/octet-stream',
  '.blend1': 'application/octet-stream',
  '.dae': 'model/vnd.collada+xml',
  '.dds': 'image/vnd-ms.dds',
  '.fbx': 'application/octet-stream',
  '.flac': 'audio/flac',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.gz': 'application/gzip',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.psd': 'image/vnd.adobe.photoshop',
  '.svg': 'image/svg+xml',
  '.tga': 'image/x-tga',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
};
const sourceMedia = new Set(
  Object.keys(mediaTypes).filter((type) => !['.json', '.html'].includes(type)),
);
const sampleBytes = 64 * 1024;

export function isAssetMediaPath(path: string): boolean {
  const extension = extname(path).toLowerCase();
  return sourceMedia.has(extension) || /^\.blend[0-9]+$/.test(extension);
}

export function assetDataCategory(
  path: string,
): 'generated-geometry' | 'recorded-study' | undefined {
  if (/(?:^|\/)scenery-[^/]+\.json$/.test(path)) return 'generated-geometry';
  if (path.endsWith('/art-study/starting-world.json')) return 'recorded-study';
  return undefined;
}

const number = '-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?';
const numericArray = (fields: string, minimum: number) =>
  new RegExp(
    `"(?:${fields})"\\s*:\\s*\\[\\s*${number}(?:\\s*,\\s*${number}){${minimum - 1}}\\s*[,\\]]`,
  );
const meshPositions = numericArray('positions|vertices', 9);
const meshAttributes = numericArray('normals|indices|uvs', 3);

/** Scan bounded chunks rather than parsing a potentially large generated JSON
 * document. Numeric mesh fields identify payloads; schema names, string examples,
 * statistics and short authored location tuples do not become geometry assets. */
export async function scanAssetPayload(
  path: string,
  signal?: AbortSignal,
): Promise<{
  binary: boolean;
  embeddedMedia: boolean;
  generatedGeometry: boolean;
}> {
  let previous = '';
  let jsonLike: boolean | undefined;
  let positions = false;
  let attributes = false;
  let binary = false;
  let embeddedMedia = false;
  let viewBox = false;
  let vectorBody = false;
  for await (const chunk of createReadStream(path, {
    encoding: 'utf8',
    highWaterMark: sampleBytes,
    signal,
  })) {
    const text = previous + chunk;
    const leading = text.trimStart();
    if (jsonLike === undefined && leading) jsonLike = /^[\[{]/.test(leading);
    binary ||= text.includes('\0');
    embeddedMedia ||=
      /data:(?:image|video|audio|font|application\/octet-stream)[^,\s]{0,256};base64,[A-Za-z0-9+/]{256}/i.test(
        text,
      );
    // A URL that actually supplies embedded media needs external storage. A
    // bare documentation string or a producer constructing a URL is not one.
    embeddedMedia ||=
      /(?:\burl\(\s*["']?|\b(?:src|href)\s*=\s*["']|"(?:src|href|url)"\s*:\s*")data:(?:image|video|audio|font|application\/octet-stream)[^,\s]{0,256},(?:(?:%3c|<)svg\b|[A-Za-z0-9%+;/=_:!?@&.-]{16})/i.test(
        text,
      );
    if (jsonLike) {
      positions ||= meshPositions.test(text);
      attributes ||= meshAttributes.test(text);
      viewBox ||= /"viewBox"\s*:\s*"\s*-?[0-9.]+(?:[ ,]+-?[0-9.]+){3}\s*"/.test(text);
      vectorBody ||=
        /"body"\s*:\s*"\s*<(?:svg|path|g|circle|rect|polygon|polyline|line|ellipse)\b/i.test(text);
      embeddedMedia ||= viewBox && vectorBody;
    }
    if (binary || embeddedMedia || (positions && attributes)) break;
    previous = text.slice(-2048);
  }
  return { binary, embeddedMedia, generatedGeometry: positions && attributes };
}

/** MIME metadata is transport information, never approval to render untrusted HTML/SVG. */
export function assetMediaType(path: string): string {
  return mediaTypes[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

export interface AssetInventoryRecord {
  path: string;
  sourceRoot: string;
  sourceKind: 'working-tree';
  /** Identity in the index; sha256 below always describes the actual inventoried bytes. */
  gitBlob: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  category: 'media' | 'font' | 'generated-geometry' | 'recorded-study' | 'embedded-media';
  flags: string[];
  rights: {
    status: 'unreviewed';
    privateByDefault: true;
    evidencePaths: string[];
    cautions: string[];
  };
}

export interface AssetInventoryOptions {
  root: string;
  signal?: AbortSignal;
}

/** Bound buffering to one path and one streamed file; do not collect a growing archive in memory. */
async function* trackedPaths(root: string, signal?: AbortSignal) {
  const child = spawn('git', ['ls-files', '--stage', '-z'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    signal,
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr = (stderr + chunk).slice(-8192);
  });
  const completion = once(child, 'close');
  // Handle a spawn error immediately even if the consumer is currently hashing a large file.
  void completion.catch(() => undefined);
  child.stdout.setEncoding('utf8');
  let pending = '';
  try {
    for await (const chunk of child.stdout) {
      pending += String(chunk);
      let end: number;
      while ((end = pending.indexOf('\0')) >= 0) {
        const entry = pending.slice(0, end);
        pending = pending.slice(end + 1);
        const split = entry.indexOf('\t');
        const fields = entry.slice(0, split).split(' ');
        const [mode, gitBlob, stage] = fields;
        if (split < 0 || !mode || !gitBlob || stage !== '0') {
          throw new Error('Inventory requires a resolved Git index.');
        }
        yield { path: entry.slice(split + 1), mode, gitBlob };
      }
    }
    const [code] = await completion;
    if (code !== 0) throw new Error(`Git inventory failed: ${stderr || String(code)}`);
    if (pending) throw new Error('Git returned an incomplete path record.');
  } finally {
    if (child.exitCode === null) child.kill();
  }
}

export async function fileSha256(path: string, signal?: AbortSignal): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path, { signal })) hash.update(chunk);
  return hash.digest('hex');
}

async function evidencePaths(root: string, path: string): Promise<string[]> {
  const directory = dirname(path);
  const candidates = [
    `${directory}/ATTRIBUTION.md`,
    `${directory}/LICENSE`,
    `${directory}/LICENSE.txt`,
    `${directory}/README.md`,
    `${directory}/catalog.json`,
    `${directory}/provenance.json`,
  ];
  if (path.startsWith('apps/client/src/props/') || path.startsWith('art-direction/')) {
    candidates.push('apps/client/src/props/ATTRIBUTION.md');
  }
  const found: string[] = [];
  for (const candidate of candidates) {
    try {
      await access(resolve(root, candidate));
      found.push(candidate);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  return found;
}

export async function* inventoryTrackedAssets(
  options: AssetInventoryOptions,
): AsyncGenerator<AssetInventoryRecord> {
  const root = await realpath(options.root);
  // Evidence is shared by a directory, rather than repeatedly reading the same nearby records.
  const evidence = new Map<string, string[]>();
  for await (const tracked of trackedPaths(root, options.signal)) {
    options.signal?.throwIfAborted();
    const extension = extname(tracked.path).toLowerCase();
    const knownMedia = isAssetMediaPath(tracked.path);
    if (!knownMedia && !['.json', '.html', '.css'].includes(extension)) continue;
    if (tracked.mode !== '100644' && tracked.mode !== '100755') {
      throw new Error(`Asset inventory will not follow a non-file index entry: ${tracked.path}`);
    }
    const fullPath = resolve(root, tracked.path);
    const before = await lstat(fullPath).catch((error: unknown) => {
      // A working-tree removal is already absent from this inventory even before
      // Git stages it. Historical preservation reads the exact Git blob separately.
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
      throw error;
    });
    if (!before) continue;
    if (!before.isFile()) throw new Error(`Asset is no longer a regular file: ${tracked.path}`);
    let category: AssetInventoryRecord['category'] =
      extension.startsWith('.woff') || ['.ttf', '.otf'].includes(extension) ? 'font' : 'media';
    if (!knownMedia) {
      const recorded = assetDataCategory(tracked.path);
      if (recorded) category = recorded;
      else {
        const payload = await scanAssetPayload(fullPath, options.signal);
        if (payload.embeddedMedia) category = 'embedded-media';
        else if (payload.generatedGeometry) category = 'generated-geometry';
        else if (payload.binary) category = 'media';
        else continue;
      }
    }
    const sha256 = await fileSha256(fullPath, options.signal);
    const after = await lstat(fullPath);
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ino !== after.ino
    ) {
      throw new Error(`Asset changed while being inventoried: ${tracked.path}`);
    }
    const directory = dirname(tracked.path);
    let nearby = evidence.get(directory);
    if (!nearby) {
      nearby = await evidencePaths(root, tracked.path);
      evidence.set(directory, nearby);
    }
    const flags: string[] = [];
    const cautions: string[] = [];
    if (before.size > sampleBytes) flags.push('substantial-payload');
    if (/screenshots|(?:^|\/)references(?:\/|\.)|research/.test(tracked.path))
      cautions.push(
        'Research/reference retention does not establish redistribution or runtime rights.',
      );
    if (/mercenary/i.test(tracked.path))
      cautions.push(
        'Owner-supplied mercenary production rights require the recorded qualification.',
      );
    if (tracked.path.startsWith('art-direction/studies/')) flags.push('preserved-study');
    if (category === 'embedded-media') flags.push('preserve-html-and-embedded-media');
    yield {
      path: tracked.path,
      sourceRoot: root,
      sourceKind: 'working-tree',
      gitBlob: tracked.gitBlob,
      sha256,
      bytes: before.size,
      mediaType: assetMediaType(tracked.path),
      category,
      flags,
      rights: { status: 'unreviewed', privateByDefault: true, evidencePaths: nearby, cautions },
    };
  }
}

export async function writeAssetInventory(options: AssetInventoryOptions, outputPath: string) {
  const root = await realpath(options.root);
  const output = resolve(outputPath);
  const parent = await realpath(dirname(output));
  const fromRoot = relative(root, parent);
  if (!isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`)) {
    throw new Error('Full generated inventories belong outside the repository.');
  }
  const stream = createWriteStream(output, { flags: 'wx', mode: 0o600 });
  const finished = once(stream, 'close');
  void finished.catch(() => undefined);
  let files = 0;
  let bytes = 0;
  try {
    for await (const entry of inventoryTrackedAssets(options)) {
      if (!stream.write(`${JSON.stringify(entry)}\n`)) await once(stream, 'drain');
      files++;
      bytes += entry.bytes;
    }
    stream.end();
    await finished;
    return { output, files, bytes };
  } catch (error) {
    stream.destroy();
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  const output = value('--output');
  if (!output)
    throw new Error(
      'Usage: inventory.ts --output <new-file-outside-repository> [--root <checkout>]',
    );
  console.log(
    JSON.stringify(await writeAssetInventory({ root: value('--root') ?? process.cwd() }, output)),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
