import * as pc from 'playcanvas';
import clothData from './mercenary-cloth.json';

function at<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error('Invalid authored cape index');
  return value;
}
interface Patch {
  name: string;
  columns: number;
  rows: number;
  uvs: number[];
  flip: boolean;
  start: number;
  source: pc.RenderComponent;
  mesh: pc.Mesh;
  node: pc.Entity;
  material: pc.StandardMaterial;
  positions: Float32Array;
  indices: number[];
}
interface Collider {
  a: pc.GraphNode;
  b: pc.GraphNode;
  rx: number;
  rz: number;
  front: boolean;
  from: pc.Vec3;
  to: pc.Vec3;
  direction: pc.Vec3;
  inverseLengthSquared: number;
}
function bone(root: pc.Entity, name: string): pc.GraphNode {
  const value = root.findByName(name);
  if (!value) throw new Error('Missing mercenary bone: ' + name);
  return value;
}
export class CapeCloth {
  private readonly root: pc.Entity;
  private readonly bone: pc.GraphNode;
  private readonly torso: pc.GraphNode;
  private readonly frontContact = clothData.frontContact;
  private readonly contactRest: pc.Mat4;
  private readonly contactRestInverse: pc.Mat4;
  private readonly contactInverse = new pc.Mat4();
  private readonly contactPoint = new pc.Vec3();
  private readonly p: pc.Vec3[] = [];
  private readonly previous: pc.Vec3[] = [];
  private readonly rest: pc.Vec3[] = [];
  private readonly pinned: boolean[] = [];
  private readonly links: Array<[number, number, number, number]> = [];
  readonly patches: Patch[] = [];
  private readonly seams: Array<[number, number, number, number]> = [];
  private readonly tethers: Array<[number, number, number]> = [];
  private readonly colliders: Collider[];
  private readonly right = new pc.Vec3();
  private readonly up = new pc.Vec3();
  private readonly forward = new pc.Vec3();
  private readonly target = new pc.Vec3();
  private ground = 0;
  private time = 0;
  private steps = 0;
  private elapsed = 0;
  enabled = true;
  constructor(app: pc.Application, root: pc.Entity) {
    const data = clothData;
    this.root = root;
    this.bone = bone(root, 'cape_root');
    if (!this.bone) throw Error('Cape attachment is missing');
    this.torso = bone(root, 'Spine01');
    this.contactRest = new pc.Mat4().set(data.bindMatrices.Spine01);
    this.contactRestInverse = this.contactRest.clone().invert();
    const inverse = new pc.Mat4().set(data.bindMatrices.cape_root).invert();
    for (const patch of data.patches) {
      const source = root
        .findComponents('render')
        .filter((c): c is pc.RenderComponent => c instanceof pc.RenderComponent)
        .find((r) => r.entity.name.includes(patch.name));
      if (!source) throw Error('Cape panel missing: ' + patch.name);
      const start = this.p.length;
      for (let i = 0; i < patch.positions.length; i += 3) {
        const p = new pc.Vec3(
          at(patch.positions, i),
          at(patch.positions, i + 1),
          at(patch.positions, i + 2),
        );
        this.p.push(p);
        this.previous.push(p.clone());
        this.rest.push(inverse.transformPoint(p, new pc.Vec3()));
        const j = (i / 3 / patch.columns) | 0,
          k = (i / 3) % patch.columns;
        this.pinned.push(
          (patch.name === 'yoke' && j === 0) || (patch.name === 'front throw' && k === 0),
        );
      }
      const indexAt = (x: number, y: number) => start + y * patch.columns + x;
      const indices = [];
      for (let y = 0; y < patch.rows; y++)
        for (let x = 0; x < patch.columns; x++) {
          if (x + 1 < patch.columns) this.link(indexAt(x, y), indexAt(x + 1, y), 1);
          if (y + 1 < patch.rows) this.link(indexAt(x, y), indexAt(x, y + 1), 1);
          if (x + 1 < patch.columns && y + 1 < patch.rows) {
            this.link(indexAt(x, y), indexAt(x + 1, y + 1), 0.7);
            this.link(indexAt(x + 1, y), indexAt(x, y + 1), 0.7);
            const a = indexAt(x, y) - start,
              b = a + 1,
              c = a + patch.columns,
              d = c + 1;
            indices.push(...(patch.flip ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
          }
          // Longer links resist folding sharply while allowing broad fabric folds.
          if (x + 2 < patch.columns) this.link(indexAt(x, y), indexAt(x + 2, y), 0.12);
          if (y + 2 < patch.rows) this.link(indexAt(x, y), indexAt(x, y + 2), 0.12);
        }
      const positions = new Float32Array(patch.positions),
        mesh = new pc.Mesh(app.graphicsDevice);
      mesh.clear(true, false);
      mesh.setPositions(positions);
      mesh.setNormals(pc.calculateNormals(positions, indices));
      mesh.setUvs(0, patch.uvs);
      mesh.setIndices(indices);
      mesh.update();
      const material = at(source.meshInstances, 0).material;
      if (!(material instanceof pc.StandardMaterial)) throw new Error('Unsupported cape material');
      material.cull = pc.CULLFACE_NONE;
      material.twoSidedLighting = true;
      material.update();
      const node = new pc.Entity('Simulated ' + patch.name);
      app.root.addChild(node);
      node.addComponent('render', {
        meshInstances: [new pc.MeshInstance(mesh, material, node)],
        castShadows: true,
        receiveShadows: true,
      });
      source.enabled = false;
      this.patches.push({
        ...patch,
        start,
        mesh,
        node,
        material,
        positions,
        indices,
        source,
      });
    }
    const [back, yoke, front, bridge] = [
      at(this.patches, 0),
      at(this.patches, 1),
      at(this.patches, 2),
      at(this.patches, 3),
    ];
    for (let x = 0; x < back.columns; x++)
      this.link(back.start + x, yoke.start + (yoke.rows - 1) * yoke.columns + x, 1, 0);
    for (let x = 0; x < bridge.columns; x++)
      this.link(bridge.start + x, front.start + (front.columns - 1) / 2 + x, 1, 0);
    // Bridge-to-back seam attaches between samples, avoiding a torn shoulder edge.
    for (let x = 0; x < bridge.columns; x++) {
      const u = (0.73 + (0.27 * x) / (bridge.columns - 1)) * (back.columns - 1),
        a = Math.floor(u),
        b = Math.min(a + 1, back.columns - 1);
      this.seams.push([
        bridge.start + (bridge.rows - 1) * bridge.columns + x,
        back.start + a,
        back.start + b,
        u - a,
      ]);
    }
    // Long-range stretch limits keep the hem from lengthening under gravity
    // when a small iteration budget cannot fully converge every short edge.
    for (let i = back.start + back.columns * 4; i < back.start + back.positions.length / 3; i++) {
      let anchor = yoke.start,
        distance = Infinity;
      for (let j = yoke.start; j < yoke.start + yoke.columns; j++) {
        const d = at(this.p, i).distance(at(this.p, j));
        if (d < distance) {
          anchor = j;
          distance = d;
        }
      }
      this.tethers.push([i, anchor, distance * 1.04]);
    }
    const colliders: Array<[string, string, number, number, boolean?]> = [
      ['Hips', 'Spine01', 0.25, 0.215, false],
      ['Spine01', 'neck', 0.25, 0.245, false],
      ['LeftArm', 'RightArm', 0.12, 0.245, false],
      ['LeftArm', 'LeftForeArm', 0.085, 0.085],
      ['RightArm', 'RightForeArm', 0.085, 0.085],
      ['LeftForeArm', 'LeftHand', 0.065, 0.065],
      ['RightForeArm', 'RightHand', 0.065, 0.065],
      ['Hips', 'LeftLeg', 0.2, 0.23, false],
      ['Hips', 'RightLeg', 0.2, 0.23, false],
      ['LeftUpLeg', 'LeftLeg', 0.145, 0.17],
      ['RightUpLeg', 'RightLeg', 0.145, 0.17],
      ['LeftLeg', 'LeftFoot', 0.1, 0.115],
      ['RightLeg', 'RightFoot', 0.1, 0.115],
      ['LeftFoot', 'LeftToeBase', 0.1, 0.14],
      ['RightFoot', 'RightToeBase', 0.1, 0.14],
    ];
    this.colliders = colliders.map(([a, b, rx, rz, front = true]) => ({
      a: bone(root, a),
      b: bone(root, b),
      rx,
      rz,
      front,
      from: new pc.Vec3(),
      to: new pc.Vec3(),
      direction: new pc.Vec3(),
      inverseLengthSquared: 1,
    }));
    this.reset();
  }
  private link(
    a: number,
    b: number,
    stiffness: number,
    length = at(this.p, a).distance(at(this.p, b)),
  ) {
    this.links.push([a, b, length, stiffness]);
  }
  reset() {
    this.time = 0;
    const m = this.bone.getWorldTransform();
    for (let i = 0; i < this.p.length; i++) {
      m.transformPoint(at(this.rest, i), at(this.p, i));
      at(this.previous, i).copy(at(this.p, i));
    }
    this.publish();
  }
  private frontDepth(p: pc.Vec3): number | null {
    const c = this.frontContact;
    const x = ((p.x - at(c.min, 0)) / (at(c.max, 0) - at(c.min, 0))) * (c.columns - 1);
    const y = ((p.y - at(c.min, 1)) / (at(c.max, 1) - at(c.min, 1))) * (c.rows - 1);
    if (x < 0 || y < 0 || x >= c.columns - 1 || y >= c.rows - 1) return null;
    const ix = Math.floor(x),
      iy = Math.floor(y),
      u = x - ix,
      v = y - iy;
    const baseIndex = iy * c.columns + ix;
    const a = at(c.depths, baseIndex),
      b = at(c.depths, baseIndex + 1),
      d = at(c.depths, baseIndex + c.columns),
      e = at(c.depths, baseIndex + c.columns + 1);
    if (a === null || b === null || d === null || e === null) return null;
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + d * (1 - u) * v + e * u * v;
  }
  private collide(p: pc.Vec3, front: boolean) {
    let contact: number | null = null;
    if (front) {
      this.contactInverse.transformPoint(p, this.contactPoint);
      this.contactRest.transformPoint(this.contactPoint, this.contactPoint);
      contact = this.frontDepth(this.contactPoint);
      if (contact !== null && this.contactPoint.z < contact + 0.006) {
        this.contactPoint.z = contact + 0.006;
        this.contactRestInverse.transformPoint(this.contactPoint, p);
        this.torso.getWorldTransform().transformPoint(p, p);
      }
    }
    for (const c of this.colliders) {
      // Use the sampled garment for front chest contact; the broad capsules
      // remain conservative protection for the back and moving limbs.
      if (front && !c.front) continue;
      const a = c.from;
      const r = this.right,
        u = this.up,
        f = this.forward;
      const xp = p.x - a.x,
        yp = p.y - a.y,
        zp = p.z - a.z;
      const { x: dx, y: dy, z: dz } = c.direction;
      const px = (xp * r.x + yp * r.y + zp * r.z) / c.rx,
        py = (xp * u.x + yp * u.y + zp * u.z) / c.rx,
        pz = (xp * f.x + yp * f.y + zp * f.z) / c.rz;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) * c.inverseLengthSquared));
      const x = px - t * dx,
        y = py - t * dy,
        z = pz - t * dz,
        squared = x * x + y * y + z * z;
      if (squared < 1 && squared > 1e-12) {
        const amount = 1 / Math.sqrt(squared) - 1,
          ox = x * amount * c.rx,
          oy = y * amount * c.rx,
          oz = z * amount * c.rz;
        p.x += r.x * ox + u.x * oy + f.x * oz;
        p.y += r.y * ox + u.y * oy + f.y * oz;
        p.z += r.z * ox + u.z * oy + f.z * oz;
      }
    }
    p.y = Math.max(this.ground, p.y);
  }
  step(dt: number) {
    const matrix = this.bone.getWorldTransform();
    this.contactInverse.copy(this.torso.getWorldTransform()).invert();
    this.right.copy(this.root.right);
    this.up.copy(this.root.up);
    this.forward.copy(this.root.forward);
    this.ground = this.root.getPosition().y + 0.035;
    // Bone endpoints are constant across all particles and constraint iterations in this step.
    for (const c of this.colliders) {
      c.from.copy(c.a.getPosition());
      c.to.copy(c.b.getPosition()).sub(c.from);
      c.direction.set(
        c.to.dot(this.right) / c.rx,
        c.to.dot(this.up) / c.rx,
        c.to.dot(this.forward) / c.rz,
      );
      c.inverseLengthSquared = 1 / (c.direction.lengthSq() || 1);
    }
    for (let i = 0; i < this.p.length; i++) {
      const p = at(this.p, i),
        old = at(this.previous, i);
      matrix.transformPoint(at(this.rest, i), this.target);
      if (at(this.pinned, i)) {
        p.copy(this.target);
        old.copy(p);
        continue;
      }
      const x = p.x,
        y = p.y,
        z = p.z;
      // Heavy wool: dissipate motion; a weak rest-fold force avoids flattening every authored fold.
      p.x += (p.x - old.x) * 0.97 + (this.target.x - p.x) * 1.5 * dt * dt;
      p.y += (p.y - old.y) * 0.97 + (-9.81 + (this.target.y - p.y) * 1.5) * dt * dt;
      p.z += (p.z - old.z) * 0.97 + (this.target.z - p.z) * 1.5 * dt * dt;
      old.set(x, y, z);
    }
    for (let iteration = 0; iteration < 8; iteration++) {
      for (const [a, b, length, stiffness] of this.links) {
        const p = at(this.p, a),
          q = at(this.p, b),
          wa = at(this.pinned, a) ? 0 : 1,
          wb = at(this.pinned, b) ? 0 : 1;
        const x = q.x - p.x,
          y = q.y - p.y,
          z = q.z - p.z,
          d = Math.sqrt(x * x + y * y + z * z);
        if (d < 1e-8 || wa + wb === 0) continue;
        const amount = (((d - length) / d) * stiffness) / (wa + wb);
        p.x += x * amount * wa;
        p.y += y * amount * wa;
        p.z += z * amount * wa;
        q.x -= x * amount * wb;
        q.y -= y * amount * wb;
        q.z -= z * amount * wb;
      }
      for (const [i, anchor, max] of this.tethers) {
        const p = at(this.p, i),
          a = at(this.p, anchor),
          d = p.distance(a);
        if (d > max) {
          const k = max / d;
          p.set(a.x + (p.x - a.x) * k, a.y + (p.y - a.y) * k, a.z + (p.z - a.z) * k);
        }
      }
      for (const [i, a, b, t] of this.seams) {
        const p = at(this.p, i),
          u = at(this.p, a),
          v = at(this.p, b);
        p.set(u.x + (v.x - u.x) * t, u.y + (v.y - u.y) * t, u.z + (v.z - u.z) * t);
      }
      for (let i = 0; i < this.p.length; i++)
        if (!at(this.pinned, i)) this.collide(at(this.p, i), i >= at(this.patches, 2).start);
    }
    this.steps++;
  }
  update(dt: number, playing: boolean) {
    if (!playing || !this.enabled) return;
    const start = performance.now();
    this.time += Math.min(dt, 0.05);
    let count = 0;
    while (this.time >= 1 / 60 && count++ < 3) {
      this.step(1 / 60);
      this.time -= 1 / 60;
    }
    if (count) this.publish();
    this.elapsed = performance.now() - start;
  }
  publish() {
    for (const p of this.patches) {
      for (let i = 0; i < p.positions.length; i += 3) {
        const v = at(this.p, p.start + i / 3);
        p.positions[i] = v.x;
        p.positions[i + 1] = v.y;
        p.positions[i + 2] = v.z;
      }
      p.mesh.setPositions(p.positions);
      p.mesh.setNormals(pc.calculateNormals(p.positions, p.indices));
      p.mesh.update();
    }
  }
  setVisible(visible: boolean) {
    this.enabled = visible;
    for (const p of this.patches) p.node.enabled = visible;
  }
  diagnostics() {
    return {
      particles: this.p.length,
      steps: this.steps,
      finite: this.p.every((p) => Number.isFinite(p.x + p.y + p.z)),
      lastStepMs: this.elapsed,
    };
  }
  destroy() {
    for (const p of this.patches) {
      p.node.destroy();
    }
  }
}
