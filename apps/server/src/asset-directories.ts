import { lstat, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

/** Resolve absent output parents without creating them. Neither a requested path
 * nor its symlink destination may put asset payloads in any Git checkout. */
export async function externalAssetPath(path: string): Promise<string> {
  const requested = resolve(path);
  let ancestor = requested;
  let destination: string;
  for (;;) {
    try {
      destination = resolve(await realpath(ancestor), relative(ancestor, requested));
      break;
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
  for (const path of new Set([requested, destination])) {
    for (let directory = path; ; directory = dirname(directory)) {
      try {
        await lstat(join(directory, '.git'));
        throw new Error('Asset outputs and caches must be outside every Git checkout.');
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            'code' in error &&
            (error.code === 'ENOENT' || error.code === 'ENOTDIR')
          )
        )
          throw error;
      }
      if (dirname(directory) === directory) break;
    }
  }
  return destination;
}
