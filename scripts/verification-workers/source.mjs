import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
  readFile,
  stat,
  lstat,
  copyFile,
  utimes,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { digest, integrityError } from './contracts.mjs';
import { files, manifest, json, hashFile } from './files.mjs';
import { exec } from './process.mjs';
const excluded = (path) =>
  /(^|\/)(?:\.env(?:\..*)?|\.git|node_modules|dist|coverage|\.DS_Store)(?:\/|$)/.test(path) &&
  !/\.env\.example$/.test(path);
export const sourceFiles = (root) => files(root, '', 50000, excluded);
export async function pack(root, commit, directory) {
  await mkdir(directory, { recursive: true });
  const staging = await mkdtemp(join(tmpdir(), 'ol-source-'));
  try {
    const archive = join(staging, 'source.tar');
    await exec('git', ['archive', '--format=tar', '--output', archive, commit], { cwd: root });
    const source = join(staging, 'source');
    await mkdir(source);
    await exec('tar', ['-xf', archive, '-C', source]);
    // Git archives contain no working-tree secrets. Reject accidental committed secrets too.
    for (const file of await files(source))
      if (excluded(file)) await rm(join(source, file), { force: true });
    const entries = await manifest(source);
    if (Buffer.byteLength(JSON.stringify(entries)) > 7 * 1024 ** 2)
      throw new Error('Archive file catalog exceeds its 8 MiB descriptor allowance.');
    const message = (await exec('git', ['show', '-s', '--format=%B', commit], { cwd: root }))
      .stdout;
    const dirty = message.startsWith('Disposable verification snapshot\n\n')
      ? JSON.parse(message.slice(message.indexOf('\n\n') + 2))
      : {};
    const value = { commit, sha256: digest(entries), files: entries, ...dirty };
    const output = join(directory, `${commit}.tar.gz`);
    await archiveFiles(source, entries, output, staging);
    return {
      ...value,
      archive: output,
      archiveSha256: await hashFile(output),
      archiveBytes: (await stat(output)).size,
    };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
async function archiveFiles(source, entries, output, staging) {
  const raw = join(staging, 'filtered.tar');
  const list = join(staging, 'paths');
  if (!Object.keys(entries).length || Object.keys(entries).some((path) => path.includes('\n')))
    throw new Error('Archives require files without newline names.');
  await writeFile(list, Object.keys(entries).join('\0') + '\0');
  await exec(
    'tar',
    [
      '-cf',
      raw,
      '-C',
      source,
      '--format=ustar',
      ...(process.platform === 'darwin' ? ['--uid=0', '--gid=0'] : ['--owner=0', '--group=0']),
      '--null',
      '-T',
      list,
    ],
    { env: { ...process.env, COPYFILE_DISABLE: '1' } },
  );
  await pipeline(
    createReadStream(raw),
    createGzip(),
    createWriteStream(output, { flags: 'wx', mode: 0o600 }),
  );
}
// Explicit fixture selection shares the source archive format, not its public read scope.
export async function packInputs(root, selected, directory) {
  const staging = await mkdtemp(join(tmpdir(), 'ol-input-'));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    const source = join(staging, 'input');
    await mkdir(source);
    const paths = new Set();
    for (const selection of selected) {
      const info = await lstat(join(root, selection));
      if (info.isSymbolicLink()) throw new Error('Input selection contains a link.');
      if (info.isDirectory()) for (const file of await files(root, selection)) paths.add(file);
      else if (info.isFile()) paths.add(selection);
      else throw new Error('Input selection is not ordinary data.');
    }
    if (paths.size > 50000) throw new Error('Input bundle exceeds file allowance.');
    let bytes = 0;
    for (const path of [...paths].sort()) {
      if (
        excluded(path) ||
        /(^|\/)(?:credentials|private\.json|connection\.json)(?:$|\/)/i.test(path)
      )
        throw new Error('Protected input file selected.');
      // Check all ancestors; lstat on the final file alone would permit a directory symlink.
      let parent = resolve(root);
      for (const part of path.split('/')) {
        parent = join(parent, part);
        if ((await lstat(parent)).isSymbolicLink()) throw new Error('Input path traverses a link.');
      }
      bytes += (await stat(join(root, path))).size;
      if (bytes > 512 * 1024 ** 2) throw new Error('Input bundle exceeds 512 MiB.');
      await mkdir(join(source, path, '..'), { recursive: true });
      const before = await hashFile(join(root, path));
      await copyFile(join(root, path), join(source, path));
      if (
        (await hashFile(join(source, path))) !== before ||
        (await hashFile(join(root, path))) !== before
      )
        throw new Error('Input changed during capture.');
      await utimes(join(source, path), 0, 0);
    }
    const entries = await manifest(source),
      sha256 = digest(entries);
    if (Buffer.byteLength(JSON.stringify(entries)) > 7 * 1024 ** 2)
      throw new Error('Input file catalog exceeds its descriptor allowance.');
    const archive = join(directory, `${sha256}.tar.gz`);
    try {
      await stat(archive);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await archiveFiles(source, entries, archive, staging);
    }
    return {
      sha256,
      files: entries,
      archive,
      archiveSha256: await hashFile(archive),
      archiveBytes: (await stat(archive)).size,
    };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
export async function verifyFiles(root, value, listing = files) {
  if (!value || digest(value.files) !== value.sha256)
    throw integrityError('Manifest digest mismatch.');
  const actual = await listing(root);
  if (
    actual.length !== Object.keys(value.files).length ||
    actual.some((path) => !value.files[path])
  )
    throw integrityError('Unadmitted archive files.');
  for (const [path, entry] of Object.entries(value.files)) {
    if (relative(resolve(root), resolve(root, path)).startsWith('..'))
      throw integrityError('Archive path escapes root.');
    if ((await hashFile(join(root, path))) !== entry.sha256)
      throw integrityError(`Archive mismatch: ${path}`);
  }
}
export async function verifySnapshot(root, value) {
  await verifyFiles(root, value, sourceFiles);
  return {
    status: 'captured',
    head: value.commit,
    branch: '',
    files: Object.keys(value.files).length,
    sha256: value.sha256,
    capturedAt: new Date().toISOString(),
  };
}
export async function snapshot(root, directory, selected) {
  if (!selected?.length)
    throw new Error('snapshot DESTINATION PATH... requires explicit files or directories.');
  for (const path of selected)
    if (relative(resolve(root), resolve(root, path)).startsWith('..') || excluded(path))
      throw new Error('Snapshot selection escapes source or includes protected paths.');
  // A private index freezes dirty work without changing HEAD, branches or the real index.
  const staging = await mkdtemp(join(tmpdir(), 'ol-dirty-'));
  const env = { ...process.env, GIT_INDEX_FILE: join(staging, 'index') };
  try {
    const base = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    await exec('git', ['read-tree', base], { cwd: root, env });
    await exec('git', ['add', '--', ...selected], { cwd: root, env });
    await exec(
      'git',
      ['diff', '--exit-code', '--no-ext-diff', '--no-textconv', '--', ...selected],
      { cwd: root, env },
    );
    const tree = (await exec('git', ['write-tree'], { cwd: root, env })).stdout.trim();
    const messagePath = join(staging, 'message');
    await writeFile(
      messagePath,
      'Disposable verification snapshot\n\n' +
        JSON.stringify({ dirty: true, base, selected }).replace(
          /[\u007f-\uffff]/g,
          (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
        ) +
        '\n',
    );
    const commit = (
      await exec('git', ['commit-tree', tree, '-p', base, '-F', messagePath], { cwd: root, env })
    ).stdout.trim();
    const value = await pack(root, commit, directory);
    value.dirty = true;
    value.base = base;
    return value;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
