import { readFile, readdir, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';

interface WorkspacePackage {
  path: string;
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: { '.'?: { import?: string } };
}
/** Source hashes do not prove which linked workspace modules actually execute.
 * Resolve declared local imports before starting disposable profiling. */
export async function workspaceBindings(root: string) {
  const nativeManifest = join(root, 'native', 'package.json');
  const manifests = [nativeManifest];
  for (const group of ['apps', 'packages']) {
    for (const entry of await readdir(join(root, group), { withFileTypes: true })) {
      if (entry.isDirectory()) manifests.push(join(root, group, entry.name, 'package.json'));
    }
  }
  const packages: WorkspacePackage[] = [];
  for (const path of manifests) {
    try {
      packages.push({ ...JSON.parse(await readFile(path, 'utf8')), path });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const byName = new Map(packages.map((owner) => [owner.name, owner]));
  const bindings: { consumer: string; dependency: string; entry: string }[] = [];
  for (const owner of packages) {
    const require = createRequire(owner.path);
    for (const [name, version] of Object.entries({
      ...owner.dependencies,
      ...owner.devDependencies,
    })) {
      if (!version.startsWith('workspace:')) continue;
      const target = byName.get(name);
      if (!target)
        throw new Error(`Workspace package ${name} is absent from this profiler checkout.`);
      const packageDirectory = await realpath(dirname(target.path));
      let expected: string;
      let actual: string;
      if (target.path === nativeManifest) {
        // Native exports only an ESM entry, and the worker checks links before
        // the addon is built. Verify its declared workspace link without loading it.
        const entry = target.exports?.['.']?.import;
        if (typeof entry !== 'string' || !entry.startsWith('./'))
          throw new Error(`Native workspace package ${name} has no relative import entry.`);
        if (packageDirectory !== join(await realpath(root), 'native'))
          throw new Error(`Native workspace package ${name} resolves outside the checkout.`);
        const linked = await realpath(join(dirname(owner.path), 'node_modules', name));
        if (linked !== packageDirectory)
          throw new Error(
            `Profiler workspace binding mismatch: ${owner.name} imports ${name} from ${linked}; expected ${packageDirectory}.`,
          );
        expected = await realpath(join(packageDirectory, entry));
        actual = expected;
      } else {
        expected = await realpath(createRequire(target.path).resolve(name));
        actual = await realpath(require.resolve(name));
      }
      const entryWithinPackage = relative(packageDirectory, expected);
      // TypeScript path mappings can redirect self-resolution and consumer imports
      // together. Equal entries alone do not prove either belongs to this checkout.
      if (
        isAbsolute(entryWithinPackage) ||
        entryWithinPackage === '..' ||
        entryWithinPackage.startsWith(`..${sep}`)
      )
        throw new Error(
          `Profiler package ${name} resolves outside ${packageDirectory}: ${expected}.`,
        );
      if (actual !== expected)
        throw new Error(
          `Profiler workspace binding mismatch: ${owner.name} imports ${name} from ${actual}; expected ${expected}.`,
        );
      bindings.push({ consumer: owner.name, dependency: name, entry: actual });
    }
  }
  return bindings;
}
