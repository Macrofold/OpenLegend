import R from '@dimforge/rapier3d-compat';
import { installBodySweep, type CollisionSolid } from './body-query.js';
import { MOVEMENT, type BodyProfile, type WorldPoint } from './types.js';

const rotation = { x: 0, y: 0, z: 0, w: 1 };
const zero = { x: 0, y: 0, z: 0 };
const solids = new WeakMap<CollisionSolid, { shape: R.Shape; position: WorldPoint }>();
const bodies = new Map<string, R.Shape>();
let ready: Promise<void> | undefined;

function bodyShape(body: BodyProfile): R.Shape {
  const key = `${body.radius}:${body.height}`;
  let shape = bodies.get(key);
  if (!shape) {
    const radius = body.radius + MOVEMENT.skin;
    shape =
      body.height >= 2 * body.radius
        ? new R.Capsule(body.height / 2 - body.radius, radius)
        : new R.Cylinder(body.height / 2 + MOVEMENT.skin, radius);
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
  if (s && (s.slopeX || s.slopeZ)) {
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
/** Shape-level queries deliberately reuse our static broad phase, not a second mutable
 * Rapier world whose query index could lag a collider edit. Support contact remains an
 * explicit OpenLegend rule; this adapter answers round-body obstruction only.
 * archive/07-technical-architecture/spatial-world-runtime.md#collision-authority
 */
export function initializeCollisionRuntime(): Promise<void> {
  return (ready ??= R.init().then(() => {
    installBodySweep((solid, from, to, body) => {
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
        return !!contact && contact.distance < -1e-5;
      }
      return !!shape.castShape(
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
      );
    });
  }));
}
