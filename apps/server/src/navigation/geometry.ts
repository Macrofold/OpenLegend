import {
  panelGeometry,
  PANEL_TRIANGLES,
  spatialBlockers,
  surfaceHeight,
  type SpatialMap,
} from '@open-legend/spatial';

/** Mechanical geometry only: billboards never create navigation or collision. Terrain cells
 * retain authored non-supporting holes. Units/winding match the shared right-handed Y-up spatial contract.
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
    nonWalkable = false,
  ) => {
    const a = [x0, top(x0, z0), z0],
      b = [x0, top(x0, z1), z1],
      c = [x1, top(x1, z1), z1],
      d = [x1, top(x1, z0), z0];
    // Recast marks downward facing tops as non-walkable while retaining solid clearance.
    if (nonWalkable) quad(d, c, b, a);
    else quad(a, b, c, d);
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
    if (s.terrain) {
      // Cell squares are centered on integer coordinates. Visit only squares touching
      // this patch; exact clipping below retains its original edges and triangle order.
      const minX = Math.max(0, Math.floor(s.minX + 0.5)),
        maxX = Math.min(map.width - 1, Math.ceil(s.maxX - 0.5)),
        minZ = Math.max(0, Math.floor(s.minZ + 0.5)),
        maxZ = Math.min(map.height - 1, Math.ceil(s.maxZ - 0.5));
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++) {
          const tile = map.tiles[z]?.[x],
            terrain = tile === undefined ? undefined : map.terrain[tile];
          if (!terrain || (!terrain.walkable && !terrain.solid?.movement)) continue;
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
  for (const blocker of spatialBlockers(map)) {
    if (!blocker.movement) continue;
    if (blocker.panel) {
      const n = positions.length / 3;
      positions.push(...panelGeometry(blocker.panel).vertices.flatMap((p) => [p.x, p.y, p.z]));
      for (let i = 0; i < PANEL_TRIANGLES.length; i += 3) {
        const [a, b, c] = PANEL_TRIANGLES.slice(i, i + 3);
        // Flexible roofs obstruct clearance but never become a navigation floor.
        indices.push(
          n + a!,
          n + (blocker.nonWalkable && i < 6 ? c! : b!),
          n + (blocker.nonWalkable && i < 6 ? b! : c!),
        );
      }
    } else {
      const { min, max } = blocker.bounds;
      slab(
        min.x,
        max.x,
        min.z,
        max.z,
        () => max.y,
        () => min.y,
        blocker.nonWalkable,
      );
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}
