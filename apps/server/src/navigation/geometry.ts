import { spatialBlockers, surfaceHeight, type SpatialMap } from '@open-legend/spatial';

/** Mechanical geometry only: billboards never create navigation or collision. Terrain cells
 * retain water holes. Units/winding match the shared right-handed Y-up spatial contract.
 */
export function navigationTriangles(map: SpatialMap) {
  const positions: number[] = [],
    indices: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    const n = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  const slab = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    top: (x: number, z: number) => number,
    bottom?: (x: number, z: number) => number,
  ) => {
    const a = [x0, top(x0, z0), z0],
      b = [x0, top(x0, z1), z1],
      c = [x1, top(x1, z1), z1],
      d = [x1, top(x1, z0), z0];
    quad(a, b, c, d);
    if (!bottom) return;
    const e = [x0, bottom(x0, z0), z0],
      f = [x0, bottom(x0, z1), z1],
      g = [x1, bottom(x1, z1), z1],
      h = [x1, bottom(x1, z0), z0];
    quad(h, g, f, e);
    quad(e, f, b, a);
    quad(d, c, g, h);
    quad(a, d, h, e);
    quad(f, g, c, b);
  };
  for (const s of map.spatial.surfaces) {
    if (s.material === 'ground') {
      for (let z = 0; z < map.height; z++)
        for (let x = 0; x < map.width; x++) {
          if (map.tiles[z]?.[x] === 'water') continue;
          const x0 = Math.max(s.minX, x - 0.5),
            x1 = Math.min(s.maxX, x + 0.5),
            z0 = Math.max(s.minZ, z - 0.5),
            z1 = Math.min(s.maxZ, z + 0.5);
          if (x0 < x1 && z0 < z1) slab(x0, x1, z0, z1, (x, z) => surfaceHeight(s, x, z));
        }
    } else
      slab(
        s.minX,
        s.maxX,
        s.minZ,
        s.maxZ,
        (x, z) => surfaceHeight(s, x, z),
        (x, z) => s.solidBase ?? surfaceHeight(s, x, z) - s.thickness,
      );
  }
  for (const {
    movement,
    bounds: { min, max },
  } of spatialBlockers(map))
    if (movement)
      slab(
        min.x,
        max.x,
        min.z,
        max.z,
        () => max.y,
        () => min.y,
      );
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}
