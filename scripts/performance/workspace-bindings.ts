import { readFile, readdir, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

interface WorkspacePackage {
  path: string;
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
/** Source hashes do not prove which linked workspace modules actually execute.
 * Resolve declared local imports before starting a disposable profiling server. */
export async function workspaceBindings(root: string) {
  const packages: WorkspacePackage[] = [];
  for (const group of ['apps', 'packages']) {
    for (const entry of await readdir(join(root, group), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = join(root, group, entry.name, 'package.json');
      try {
        packages.push({ ...JSON.parse(await readFile(path, 'utf8')), path });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
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
      const expected = await realpath(createRequire(target.path).resolve(name));
      const actual = await realpath(require.resolve(name));
      if (actual !== expected)
        throw new Error(
          `Profiler workspace binding mismatch: ${owner.name} imports ${name} from ${actual}; expected ${expected}.`,
        );
      bindings.push({ consumer: owner.name, dependency: name, entry: actual });
    }
  }
  return bindings;
}
