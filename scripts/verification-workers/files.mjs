import { readFile, writeFile, rename, mkdir, opendir, lstat, link, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
export async function json(path, value, { exclusive = false } = {}) {
  if (arguments.length === 1) return JSON.parse(await readFile(path, 'utf8'));
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    if (exclusive) await link(temp, path);
    else await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
export async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function files(root, directory = '', maxEntries = 50000, exclude = (_path) => false) {
  const result = [];
  let visited = 0;
  async function walk(directory) {
    for await (const entry of await opendir(join(root, directory))) {
      if (++visited > maxEntries)
        throw new Error('File traversal exceeds its admitted entry count.');
      const path = join(directory, entry.name);
      if (exclude(path)) continue;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) result.push(path);
      else throw new Error(`Unsupported link or special file: ${path}`);
    }
  }
  await walk(directory);
  return result.sort();
}

export async function manifest(root) {
  const result = {};
  for (const path of await files(root))
    result[path] = {
      sha256: await hashFile(join(root, path)),
      bytes: (await lstat(join(root, path))).size,
    };
  return result;
}
