import { readFile, readdir, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';

interface WorkspacePackage {
  path: string;
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
/** Verify that managed cases resolve the declared workspace dependencies
 * inside their own checkout before running any build or gameplay. */
export async function workspaceBindings(root: string) {
  const manifests = [join(root, 'package.json')];
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
      if (!target) throw new Error(`Workspace package ${name} is absent from this checkout.`);
      const packageDirectory = await realpath(dirname(target.path));
      const expected = await realpath(createRequire(target.path).resolve(name));
      const actual = await realpath(require.resolve(name));
      const entryWithinPackage = relative(packageDirectory, expected);
      // TypeScript path mappings can redirect self-resolution and consumer imports
      // together. Equal entries alone do not prove either belongs to this checkout.
      if (
        isAbsolute(entryWithinPackage) ||
        entryWithinPackage === '..' ||
        entryWithinPackage.startsWith(`..${sep}`)
      )
        throw new Error(
          `Workspace package ${name} resolves outside ${packageDirectory}: ${expected}.`,
        );
      if (actual !== expected)
        throw new Error(
          `Workspace binding mismatch: ${owner.name} imports ${name} from ${actual}; expected ${expected}.`,
        );
      bindings.push({ consumer: owner.name, dependency: name, entry: actual });
    }
  }
  return bindings;
}
