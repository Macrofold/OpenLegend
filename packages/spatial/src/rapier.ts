import R from '@dimforge/rapier3d-compat';
import { installBodySweep, type CollisionSolid, type RoundVolume } from './body-query.js';
import { MOVEMENT, type WorldPoint } from './types.js';
import { panelGeometry } from './finite-panel.js';

const rotation = { x: 0, y: 0, z: 0, w: 1 };
const zero = { x: 0, y: 0, z: 0 };
const solids = new WeakMap<CollisionSolid, { shape: R.Shape; position: WorldPoint }>();
const bodies = new Map<string, R.Shape>();
let ready: Promise<void> | undefined;

function bodyShape(body: RoundVolume): R.Shape {
  const key = `${body.shape ?? 'body'}:${body.radius}:${body.height}`;
  let shape = bodies.get(key);
  if (!shape) {
    const skin = body.shape === 'cylinder' ? 0 : MOVEMENT.skin;
    const radius = body.radius + skin;
    shape =
      body.shape !== 'cylinder' && body.height >= 2 * body.radius
        ? new R.Capsule(body.height / 2 - body.radius, radius)
        : new R.Cylinder(body.height / 2 + skin, radius);
    if (bodies.size >= 32) bodies.delete(bodies.keys().next().value!);
    bodies.set(key, shape);
  }
  return shape;
}
function solidShape(solid: CollisionSolid) {
  let entry = solids.get(solid);
  if (entry) return entry;
  const { min, max } = solid.bounds;
  const position = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  const s = solid.surface;
  if (solid.panel) {
    entry = {
      shape: new R.ConvexPolyhedron(
        new Float32Array(
          panelGeometry(solid.panel).vertices.flatMap((p) => [
            p.x - position.x,
            p.y - position.y,
            p.z - position.z,
          ]),
        ),
      ),
      position,
    };
  } else if (s && (s.slopeX || s.slopeZ)) {
    const vertices: number[] = [];
    for (const x of [s.minX, s.maxX])
      for (const z of [s.minZ, s.maxZ]) {
        const y = s.y + (x - s.minX) * s.slopeX + (z - s.minZ) * s.slopeZ;
        for (const h of [y, s.solidBase ?? y - s.thickness])
          vertices.push(x - position.x, h - position.y, z - position.z);
      }
    entry = { shape: new R.ConvexPolyhedron(new Float32Array(vertices)), position };
  } else
    entry = {
      shape: new R.Cuboid((max.x - min.x) / 2, (max.y - min.y) / 2, (max.z - min.z) / 2),
      position,
    };
  solids.set(solid, entry);
  return entry;
}
/** Point bins and map cells are conservative. Reject only plainly disjoint box
 * sweeps before allocating shapes or crossing into WASM; Rapier still owns contact.
 * Its f32 positions and iterative solver need generous rounding/tolerance padding.
 * Surface/panel geometry can extend beyond a caller's box, so keep its exact path.
 * docs/spatial-world.md#what-a-location-means */
function disjointBoxSweep(
  solid: CollisionSolid,
  from: WorldPoint,
  to: WorldPoint,
  body: RoundVolume,
): boolean {
  if (solid.surface || solid.panel) return false;
  const { min, max } = solid.bounds;
  const skin = body.shape === 'cylinder' ? 0 : MOVEMENT.skin;
  const padding = Math.max(
    1e-3,
    2 ** -20 *
      Math.max(
        Math.abs(from.x),
        Math.abs(from.y),
        Math.abs(from.z),
        Math.abs(to.x),
        Math.abs(to.y),
        Math.abs(to.z),
        Math.abs(min.x),
        Math.abs(min.y),
        Math.abs(min.z),
        Math.abs(max.x),
        Math.abs(max.y),
        Math.abs(max.z),
        body.radius,
        body.height,
      ),
  );
  const radius = body.radius + skin + padding;
  return (
    Math.max(from.x, to.x) + radius < min.x ||
    Math.min(from.x, to.x) - radius > max.x ||
    Math.max(from.z, to.z) + radius < min.z ||
    Math.min(from.z, to.z) - radius > max.z ||
    Math.max(from.y, to.y) + body.height + skin + padding < min.y ||
    Math.min(from.y, to.y) - skin - padding > max.y
  );
}

/** Shape-level queries deliberately reuse our static broad phase, not a second mutable
 * Rapier world whose query index could lag a collider edit. Support contact remains an
 * explicit OpenLegend rule; this adapter answers round-body obstruction only.
 * archive/07-technical-architecture/spatial-world-runtime.md#collision-authority
 */
export function initializeCollisionRuntime(): Promise<void> {
  return (ready ??= R.init().then(() => {
    installBodySweep((solid, from, to, body) => {
      if (disjointBoxSweep(solid, from, to, body)) return;
      const other = solidShape(solid),
        shape = bodyShape(body);
      const centre = { x: from.x, y: from.y + body.height / 2, z: from.z };
      const velocity = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
      if (Math.abs(velocity.x) + Math.abs(velocity.y) + Math.abs(velocity.z) < 1e-9) {
        const contact = shape.contactShape(
          centre,
          rotation,
          other.shape,
          other.position,
          rotation,
          0,
        );
        return contact && contact.distance < -1e-5 ? 0 : undefined;
      }
      return shape.castShape(
        centre,
        rotation,
        velocity,
        other.shape,
        other.position,
        rotation,
        zero,
        0,
        1,
        true,
      )?.time_of_impact;
    });
  }));
}
