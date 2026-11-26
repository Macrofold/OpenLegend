/** Build-time Recast artifacts for the stand-alone Rust server. No navigation
 * work or JavaScript carrier from this exporter is needed at launch.
 * README.md#run-the-stand-alone-rust-server
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  validateBodyProfile,
  validateSpatialMap,
  type BodyProfile,
  type SpatialMap,
} from '../packages/spatial/src/index.js';
import {
  initializeNavigationRuntime,
  RecastPlanner,
} from '../apps/server/src/navigation/backend.js';

const wasmSha256 = '008696e1a67df34aa3c830417a520034a2a358c838fc631084681f7f8f1f7a38';
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const wasmFile = () => {
  // Resolve via the exact locked Recast dependency used by the real provider.
  const server = createRequire(new URL('../apps/server/package.json', import.meta.url));
  const recast = createRequire(server.resolve('recast-navigation'));
  const core = createRequire(recast.resolve('@recast-navigation/core'));
  return new URL(
    './recast-navigation.wasm.wasm',
    pathToFileURL(core.resolve('@recast-navigation/wasm/wasm')),
  );
};

/** The map and numeric profiles come from the approved world initializer.
 * Write a fresh release directory. Preserve exact per-file hashes for the
 * installer to verify before it passes a mesh to the native binding. */
export async function writeRustNavigationRelease(
  directory: string,
  map: SpatialMap,
  profiles: readonly BodyProfile[],
): Promise<void> {
  validateSpatialMap(map);
  const bodies = new Map<string, BodyProfile>();
  for (const body of profiles) {
    validateBodyProfile(body);
    bodies.set(JSON.stringify([body.radius, body.height, body.maxSlope]), body);
  }
  if (!bodies.size || bodies.size > 6)
    throw new Error('The navigation release needs one to six body profiles.');
  const modulePath = wasmFile();
  const [wasm, license] = await Promise.all([
    readFile(modulePath),
    readFile(new URL('../LICENSE', modulePath)),
  ]);
  if (hash(wasm) !== wasmSha256)
    throw new Error('The installed Recast artifact differs from the Rust binding.');
  const geometry = Buffer.from(JSON.stringify(map));
  await initializeNavigationRuntime();
  const planner = new RecastPlanner(map);
  try {
    await mkdir(directory);
    await Promise.all([
      writeFile(join(directory, 'geometry.json'), geometry, { flag: 'wx' }),
      writeFile(join(directory, 'recast-navigation.wasm'), wasm, { flag: 'wx' }),
      writeFile(join(directory, 'recast-navigation.LICENSE'), license, { flag: 'wx' }),
    ]);
    const meshes: { file: string; bytes: number; sha256: string; body: BodyProfile }[] = [];
    for (const body of bodies.values()) {
      const mesh = planner.exportPreparedMesh(body);
      const file = `mesh-${meshes.length}.detour`;
      await writeFile(join(directory, file), mesh, { flag: 'wx' });
      meshes.push({ file, bytes: mesh.length, sha256: hash(mesh), body });
    }
    await writeFile(
      join(directory, 'navigation.json'),
      JSON.stringify({ geometrySha256: hash(geometry), wasmSha256, meshes }),
      { flag: 'wx' },
    );
  } finally {
    planner.destroy();
  }
}
