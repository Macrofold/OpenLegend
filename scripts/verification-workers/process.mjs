import { createNetworkOwner } from '@open-legend/network';
import { runRemoteProcess } from '@open-legend/network/node';
import { lstat } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
const owner = createNetworkOwner({ role: 'verification-processes', capacity: 8 });
/** Local filesystem programs and supervised host commands share bounded physical-child ownership. */
export function exec(command, args, options = {}) {
  const { timeoutMs = 60000, maxBuffer = 8 * 1024 ** 2, signal, ...configuration } = options;
  return owner
    .run({ timeoutMs, signal }, (operation) =>
      runRemoteProcess(operation, { command, args, maxOutputBytes: maxBuffer, ...configuration }),
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        const error = new Error(
          `${command} exited ${result.exitCode ?? result.signal}: ${result.stderr.slice(0, 4000)}`,
        );
        error.code = result.exitCode;
        error.stderr = result.stderr;
        error.stdout = result.stdout;
        throw error;
      }
      return result;
    });
}

/** A live tree is not a filesystem snapshot: package managers can rename entries
 * between du's directory read and stat. Retain its measured total for vanished
 * descendants only; every other failure still invalidates the resource check. */
export async function directoryBytes(directory, options = {}) {
  const { command = 'du', ...processOptions } = options;
  const root = resolve(directory);
  let result;
  try {
    result = await exec(command, ['-s', '-b', '--null', '--', root], {
      ...processOptions,
      env: { ...process.env, ...processOptions.env, LC_ALL: 'C' },
    });
  } catch (error) {
    const diagnostics = typeof error.stderr === 'string' ? error.stderr.trim().split('\n') : [];
    const prefix = `${basename(command)}: cannot access '`;
    const readPrefix = `${basename(command)}: cannot read directory '`;
    const suffix = "': No such file or directory";
    if (
      error.code !== 1 ||
      !diagnostics.length ||
      !diagnostics.every((line) => {
        const start = line.startsWith(prefix)
          ? prefix
          : line.startsWith(readPrefix)
            ? readPrefix
            : undefined;
        if (!start || !line.endsWith(suffix)) return false;
        const missing = resolve(line.slice(start.length, -suffix.length));
        return missing.startsWith(root + sep);
      })
    )
      throw error;
    result = error;
  }
  const total =
    typeof result.stdout === 'string' ? /^([0-9]+)\t([\s\S]*)\0$/.exec(result.stdout) : undefined;
  const bytes = total ? Number(total[1]) : NaN;
  if (!total || total[2] !== root || !Number.isSafeInteger(bytes) || bytes < 0)
    throw new Error('Directory usage did not return one valid root total.');
  if (!(await lstat(root)).isDirectory())
    throw new Error('Directory usage root is not a directory.');
  return bytes;
}
