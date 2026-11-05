// Root-only derived cache. Call only after validating the current job's source/input grant.
import { mkdir, stat, rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { download } from './artifacts.mjs';
import { files, hashFile } from './files.mjs';
import { defaults, integrityError } from './contracts.mjs';
export async function cachedArchive({ bucket, key, sha256, bytes, cache, temporary }) {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid immutable archive identity.');
  await mkdir(cache, { recursive: true, mode: 0o700 });
  const started = performance.now(),
    cached = bytes <= defaults.blobCacheBytes;
  const path = cached ? join(cache, `${sha256}.tar.gz`) : temporary;
  if (cached) {
    const entries = [];
    for (const file of await files(cache, '', 1024)) {
      if (/^[a-f0-9]{64}\.tar\.gz\.[a-f0-9-]+\.download$/.test(file)) {
        await rm(join(cache, file));
        continue;
      }
      if (!/^[a-f0-9]{64}\.tar\.gz$/.test(file))
        throw new Error('Unexpected blob cache entry; inspect before pruning.');
      const info = await stat(join(cache, file));
      entries.push({ file, bytes: info.size, at: info.mtimeMs });
    }
    const existing = entries.some((item) => item.file === `${sha256}.tar.gz`),
      additional = existing ? 0 : bytes;
    let total = entries.reduce((sum, item) => sum + item.bytes, 0),
      count = entries.length + (existing ? 0 : 1);
    for (const entry of entries.sort((a, b) => a.at - b.at)) {
      if (total + additional <= defaults.blobCacheBytes && count <= defaults.blobCacheEntries)
        break;
      if (entry.file === `${sha256}.tar.gz`) continue;
      await rm(join(cache, entry.file));
      total -= entry.bytes;
      count--;
    }
  }
  let hit = false;
  try {
    const info = await stat(path);
    if (info.size !== bytes || (await hashFile(path)) !== sha256)
      throw integrityError('Cached archive differs from its admitted checksum.');
    hit = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!hit) {
    await download(bucket, key, path, bytes);
    if ((await hashFile(path)) !== sha256)
      throw integrityError('Downloaded archive checksum mismatch.');
  }
  if (cached) await utimes(path, new Date(), new Date());
  return { path, cached, hit, bytes, elapsedMs: performance.now() - started };
}
