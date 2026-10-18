import { execFile } from 'node:child_process';
import { readdir, open, lstat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { promisify } from 'node:util';
import { assetDataCategory, isAssetMediaPath, scanAssetPayload } from './assets/inventory.js';

const root = resolve(import.meta.dirname, '..');
const failures: string[] = [];

/** File names are not a storage boundary: renamed binary files and embedded
 * payloads must receive the same review as an ordinary image/model import. */
async function inspectPayload(path: string, label: string) {
  const info = await lstat(path);
  if (!info.isFile()) {
    if (isAssetMediaPath(label) || assetDataCategory(label))
      failures.push(`Asset path is not a regular file: ${label}`);
    return;
  }
  const file = await open(path, 'r');
  let bytes: Buffer;
  try {
    bytes = Buffer.alloc(Math.min(info.size, 4096));
    const result = await file.read(bytes, 0, bytes.length, 0);
    bytes = bytes.subarray(0, result.bytesRead);
  } finally {
    await file.close();
  }
  const head = bytes.toString('latin1');
  // Source code can contain JSX or an SVG template without being an asset file.
  // A renamed SVG document still starts with its document tag and needs review.
  const svgDocument = /^(?:\uFEFF)?\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(
    head,
  );
  const binary =
    bytes.includes(0) ||
    /^(?:\x89PNG\r\n\x1a\n|\xff\xd8\xff|GIF8[79]a|glTF|BLENDER|wOFF|wOF2|OTTO|PK\x03\x04|%PDF-|ID3|OggS|fLaC|\x1f\x8b|Kaydara FBX Binary)/.test(
      head,
    ) ||
    /^RIFF[\s\S]{4}(?:WEBP|WAVE|AVI )/.test(head) ||
    /^....ftyp/.test(head);
  if (binary || isAssetMediaPath(label) || assetDataCategory(label) || svgDocument) {
    failures.push(`Externalize asset payload: ${label}`);
    return;
  }
  const payload = await scanAssetPayload(path);
  if (payload.binary) failures.push(`Externalize asset payload: ${label}`);
  if (payload.embeddedMedia) failures.push(`Externalize embedded media: ${label}`);
  if (payload.generatedGeometry) failures.push(`Externalize generated geometry: ${label}`);
}

// Include unstaged additions while respecting Git ignores, so authors receive
// the same feedback before and after adding a file to the index.
const workingFiles = await promisify(execFile)(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { cwd: root, maxBuffer: 8 * 1024 * 1024 },
);
for (const path of new Set(workingFiles.stdout.split('\0').filter(Boolean))) {
  try {
    await inspectPayload(join(root, path), path);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
}
if (process.argv.includes('--build')) {
  const directory = join(root, 'dist/client');
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop()!;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else await inspectPayload(path, `player build/${relative(directory, path)}`);
    }
  }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log('Asset guard passed: no repository asset payloads.');
