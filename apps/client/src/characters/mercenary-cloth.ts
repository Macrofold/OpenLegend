import * as pc from 'playcanvas';
export interface MercenaryClothData {
  patches: {
    name: string;
    columns: number;
    rows: number;
    positions: number[];
    uvs: number[];
    flip: boolean;
  }[];
  frontContact: {
    columns: number;
    rows: number;
    min: number[];
    max: number[];
    depths: (number | null)[];
  };
  bindMatrices: { Spine01: number[]; cape_root: number[] };
}

export type ClothPasses = 4 | 8;
/** Display-size hysteresis keeps small cloth cheaper without repeatedly changing
 * quality at one zoom boundary. docs/limits/3d-pixel-art.md#a3d20--experimental-cloth-quality-tiers */
export function clothPassesForSize(
  previous: ClothPasses,
  height: number | undefined,
  selected: boolean,
): ClothPasses {
  if (selected || height === undefined || !Number.isFinite(height) || height <= 0) return 8;
  return height < 80 ? 4 : height > 100 ? 8 : previous;
}

function at<T>(values: ArrayLike<T>, index: number): T {
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
interface Link {
  p: number;
  q: number;
  length: number;
  stiffness: number;
  wa: number;
  wb: number;
}
function bone(root: pc.Entity, name: string): pc.GraphNode {
  const value = root.findByName(name);
  if (!value) throw new Error('Missing mercenary bone: ' + name);
  return value;
}
export class CapeCloth {
  constraintPasses: ClothPasses = 8;
  private readonly root: pc.Entity;
  private readonly bone: pc.GraphNode;
  private readonly torso: pc.GraphNode;
  private readonly frontContact: MercenaryClothData['frontContact'];
  private readonly contactRest: pc.Mat4;
  private readonly contactRestInverse: pc.Mat4;
  private readonly contactInverse = new pc.Mat4();
  private readonly contactPoint = new pc.Vec3();
  private readonly previousAttachment = new pc.Mat4();
  private readonly attachmentInverse = new pc.Mat4();
  private readonly attachmentDelta = new pc.Mat4();

  // Particle values stay binary64 until the existing Float32 mesh publication.
  // Own the buffers for the garment lifetime; hot constraint passes only update
  // numeric slots rather than per-particle object properties/iterators.
  private readonly p: Float64Array;
  private readonly previous: Float64Array;
  private readonly rest: Float64Array;
  private readonly pinned: Uint8Array;
  // Authored topology and pins are fixed for this artwork lifetime. Resolve
  // their references once; bone transforms and particle positions stay live.
  // A changed garment/pin configuration must construct its own topology.
  // docs/world-presentation.md#animated-character-pixels
  private readonly links: Link[] = [];
  readonly patches: Patch[] = [];
  private readonly ownedMeshes = new Set<pc.Mesh>();
  private readonly nodes: pc.Entity[] = [];
  private readonly seams: Array<[number, number, number, number]> = [];
  private readonly tethers: Array<[number, number, number]> = [];
  private readonly collisionParticles: Array<{ point: number; front: boolean }> = [];
  private readonly colliders: Collider[];
  private readonly right = new pc.Vec3();
  private readonly up = new pc.Vec3();
  private readonly forward = new pc.Vec3();
  private readonly target = new pc.Vec3();
  private ground = 0;
  private time = 0;
  private steps = 0;
  private elapsed = 0;
  private motion: 'flowing' | 'settled' = 'flowing';
  private frameGapResets = 0;
  private lastUpdate = performance.now();
  enabled = true;
  constructor(
    app: pc.Application,
    root: pc.Entity,
    private readonly displayScale: number,
    data: MercenaryClothData,
  ) {
    try {
      this.frontContact = data.frontContact;
      this.p = new Float64Array(
        data.patches.reduce((size, patch) => size + patch.positions.length, 0),
      );
      this.previous = new Float64Array(this.p.length);
      this.rest = new Float64Array(this.p.length);
      this.pinned = new Uint8Array(this.p.length / 3);
      this.root = root;
      this.bone = bone(root, 'cape_root');
      if (!this.bone) throw Error('Cape attachment is missing');
      this.torso = bone(root, 'Spine01');
      this.contactRest = new pc.Mat4().set(data.bindMatrices.Spine01);
      this.contactRestInverse = this.contactRest.clone().invert();
      const inverse = new pc.Mat4().set(data.bindMatrices.cape_root).invert();
      let particleStart = 0;
      for (const patch of data.patches) {
        const source = root
          .findComponents('render')
          .filter((c): c is pc.RenderComponent => c instanceof pc.RenderComponent)
          .find((r) => r.entity.name.includes(patch.name));
        if (!source) throw Error('Cape panel missing: ' + patch.name);
        const start = particleStart;
        particleStart += patch.positions.length / 3;
        for (let i = 0; i < patch.positions.length; i += 3) {
          const p = new pc.Vec3(
            at(patch.positions, i),
            at(patch.positions, i + 1),
            at(patch.positions, i + 2),
          );
          const offset = start * 3 + i;
          this.p.set([p.x, p.y, p.z], offset);
          this.previous.set([p.x, p.y, p.z], offset);
          inverse.transformPoint(p, this.target);
          this.rest.set([this.target.x, this.target.y, this.target.z], offset);
          const j = (i / 3 / patch.columns) | 0,
            k = (i / 3) % patch.columns;
          this.pinned[start + i / 3] =
            (patch.name === 'yoke' && j === 0) || (patch.name === 'front throw' && k === 0) ? 1 : 0;
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
        mesh.incRefCount();
        this.ownedMeshes.add(mesh);
        mesh.clear(true, false);
        mesh.setPositions(positions);
        mesh.setNormals(pc.calculateNormals(positions, indices));
        mesh.setUvs(0, patch.uvs);
        mesh.setIndices(indices);
        mesh.update();
        const material = at(source.meshInstances, 0).material,
          lining = at(source.meshInstances, 1).material;
        if (!(material instanceof pc.StandardMaterial) || !(lining instanceof pc.StandardMaterial))
          throw new Error('Unsupported cape material');
        const node = new pc.Entity('Simulated ' + patch.name, app);
        this.nodes.push(node);
        app.root.addChild(node);
        node.addComponent('render', {
          meshInstances: [
            new pc.MeshInstance(mesh, material, node),
            new pc.MeshInstance(mesh, lining, node),
          ],
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
          this.coordinateOffset(bridge.start + (bridge.rows - 1) * bridge.columns + x),
          this.coordinateOffset(back.start + a),
          this.coordinateOffset(back.start + b),
          u - a,
        ]);
      }
      // Long-range stretch limits keep the hem from lengthening under gravity
      // when a small iteration budget cannot fully converge every short edge.
      for (let i = back.start + back.columns * 4; i < back.start + back.positions.length / 3; i++) {
        let anchor = yoke.start,
          distance = Infinity;
        for (let j = yoke.start; j < yoke.start + yoke.columns; j++) {
          const d = this.distance(i * 3, j * 3);
          if (d < distance) {
            anchor = j;
            distance = d;
          }
        }
        this.tethers.push([i * 3, anchor * 3, distance * 1.04 * this.displayScale]);
      }
      for (let i = 0; i < this.pinned.length; i++)
        if (!at(this.pinned, i))
          this.collisionParticles.push({ point: i * 3, front: i >= front.start });
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
        rx: rx * this.displayScale,
        rz: rz * this.displayScale,
        front,
        from: new pc.Vec3(),
        to: new pc.Vec3(),
        direction: new pc.Vec3(),
        inverseLengthSquared: 1,
      }));
      this.reset();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }
  private coordinateOffset(index: number): number {
    at(this.pinned, index);
    return index * 3;
  }
  private link(a: number, b: number, stiffness: number, length = this.distance(a * 3, b * 3)) {
    this.links.push({
      p: a * 3,
      q: b * 3,
      length: length * this.displayScale,
      stiffness,
      wa: at(this.pinned, a) ? 0 : 1,
      wb: at(this.pinned, b) ? 0 : 1,
    });
  }
  // Every coordinate offset is derived from the fixed constructed topology;
  // hot scalar reads use those offsets directly, without a generic checked read per number.
  private distance(p: number, q: number): number {
    const x = this.p[p]! - this.p[q]!,
      y = this.p[p + 1]! - this.p[q + 1]!,
      z = this.p[p + 2]! - this.p[q + 2]!;
    return Math.sqrt(x * x + y * y + z * z);
  }
  reset() {
    this.time = 0;
    this.lastUpdate = performance.now();
    const m = this.bone.getWorldTransform();
    for (let i = 0; i < this.p.length; i += 3) {
      this.contactPoint.set(this.rest[i]!, this.rest[i + 1]!, this.rest[i + 2]!);
      m.transformPoint(this.contactPoint, this.target);
      this.p[i] = this.previous[i] = this.target.x;
      this.p[i + 1] = this.previous[i + 1] = this.target.y;
      this.p[i + 2] = this.previous[i + 2] = this.target.z;
    }
    this.previousAttachment.copy(m);
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
  private collide(offset: number, front: boolean) {
    let x = this.p[offset]!,
      y = this.p[offset + 1]!,
      z = this.p[offset + 2]!;
    if (front) {
      this.target.set(x, y, z);
      this.contactInverse.transformPoint(this.target, this.contactPoint);
      this.contactRest.transformPoint(this.contactPoint, this.contactPoint);
      const contact = this.frontDepth(this.contactPoint);
      if (contact !== null && this.contactPoint.z < contact + 0.006) {
        this.contactPoint.z = contact + 0.006;
        this.contactRestInverse.transformPoint(this.contactPoint, this.target);
        this.torso.getWorldTransform().transformPoint(this.target, this.target);
        x = this.target.x;
        y = this.target.y;
        z = this.target.z;
      }
    }
    for (let i = 0; i < this.colliders.length; i++) {
      const c = at(this.colliders, i);
      // Use the sampled garment for front chest contact; the broad capsules
      // remain conservative protection for the back and moving limbs.
      if (front && !c.front) continue;
      const a = c.from;
      const r = this.right,
        u = this.up,
        f = this.forward;
      const xp = x - a.x,
        yp = y - a.y,
        zp = z - a.z;
      const dx = c.direction.x,
        dy = c.direction.y,
        dz = c.direction.z;
      const px = (xp * r.x + yp * r.y + zp * r.z) / c.rx,
        py = (xp * u.x + yp * u.y + zp * u.z) / c.rx,
        pz = (xp * f.x + yp * f.y + zp * f.z) / c.rz;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) * c.inverseLengthSquared));
      const cx = px - t * dx,
        cy = py - t * dy,
        cz = pz - t * dz,
        squared = cx * cx + cy * cy + cz * cz;
      if (squared < 1 && squared > 1e-12) {
        const amount = 1 / Math.sqrt(squared) - 1,
          ox = cx * amount * c.rx,
          oy = cy * amount * c.rx,
          oz = cz * amount * c.rz;
        x += r.x * ox + u.x * oy + f.x * oz;
        y += r.y * ox + u.y * oy + f.y * oz;
        z += r.z * ox + u.z * oy + f.z * oz;
      }
    }
    this.p[offset] = x;
    this.p[offset + 1] = Math.max(this.ground, y);
    this.p[offset + 2] = z;
  }
  step(dt: number) {
    const matrix = this.bone.getWorldTransform();
    this.contactInverse.copy(this.torso.getWorldTransform()).invert();
    this.right.copy(this.root.right);
    this.up.copy(this.root.up);
    this.forward.copy(this.root.forward);
    this.ground = this.root.getPosition().y + 0.035 * this.displayScale;
    // Bone endpoints are constant across all particles and constraint iterations in this step.
    for (let i = 0; i < this.colliders.length; i++) {
      const c = at(this.colliders, i);
      c.from.copy(c.a.getPosition());
      c.to.copy(c.b.getPosition()).sub(c.from);
      c.direction.set(
        c.to.dot(this.right) / c.rx,
        c.to.dot(this.up) / c.rx,
        c.to.dot(this.forward) / c.rz,
      );
      c.inverseLengthSquared = 1 / (c.direction.lengthSq() || 1);
    }
    const positions = this.p;
    for (let i = 0; i < positions.length; i += 3) {
      this.contactPoint.set(this.rest[i]!, this.rest[i + 1]!, this.rest[i + 2]!);
      matrix.transformPoint(this.contactPoint, this.target);
      if (at(this.pinned, i / 3)) {
        positions[i] = this.previous[i] = this.target.x;
        positions[i + 1] = this.previous[i + 1] = this.target.y;
        positions[i + 2] = this.previous[i + 2] = this.target.z;
        continue;
      }
      const x = positions[i]!,
        y = positions[i + 1]!,
        z = positions[i + 2]!;
      // Heavy wool: dissipate motion; a weak rest-fold force avoids flattening every authored fold.
      positions[i] = x + ((x - this.previous[i]!) * 0.97 + (this.target.x - x) * 1.5 * dt * dt);
      positions[i + 1] =
        y +
        ((y - this.previous[i + 1]!) * 0.97 +
          (-9.81 * this.displayScale + (this.target.y - y) * 1.5) * dt * dt);
      positions[i + 2] =
        z + ((z - this.previous[i + 2]!) * 0.97 + (this.target.z - z) * 1.5 * dt * dt);
      this.previous[i] = x;
      this.previous[i + 1] = y;
      this.previous[i + 2] = z;
    }
    for (let iteration = 0; iteration < this.constraintPasses; iteration++) {
      for (let i = 0; i < this.links.length; i++) {
        const { p, q, length, stiffness, wa, wb } = at(this.links, i);
        const x = positions[q]! - positions[p]!,
          y = positions[q + 1]! - positions[p + 1]!,
          z = positions[q + 2]! - positions[p + 2]!,
          d = Math.sqrt(x * x + y * y + z * z);
        if (d < 1e-8 || wa + wb === 0) continue;
        const amount = (((d - length) / d) * stiffness) / (wa + wb);
        positions[p] = positions[p]! + x * amount * wa;
        positions[p + 1] = positions[p + 1]! + y * amount * wa;
        positions[p + 2] = positions[p + 2]! + z * amount * wa;
        positions[q] = positions[q]! - x * amount * wb;
        positions[q + 1] = positions[q + 1]! - y * amount * wb;
        positions[q + 2] = positions[q + 2]! - z * amount * wb;
      }
      for (let i = 0; i < this.tethers.length; i++) {
        const tether = at(this.tethers, i),
          p = tether[0],
          a = tether[1],
          max = tether[2];
        const d = this.distance(p, a);
        if (d > max) {
          const k = max / d;
          positions[p] = positions[a]! + (positions[p]! - positions[a]!) * k;
          positions[p + 1] = positions[a + 1]! + (positions[p + 1]! - positions[a + 1]!) * k;
          positions[p + 2] = positions[a + 2]! + (positions[p + 2]! - positions[a + 2]!) * k;
        }
      }
      for (let i = 0; i < this.seams.length; i++) {
        const seam = at(this.seams, i),
          p = seam[0],
          u = seam[1],
          v = seam[2],
          t = seam[3];
        positions[p] = positions[u]! + (positions[v]! - positions[u]!) * t;
        positions[p + 1] = positions[u + 1]! + (positions[v + 1]! - positions[u + 1]!) * t;
        positions[p + 2] = positions[u + 2]! + (positions[v + 2]! - positions[u + 2]!) * t;
      }
      for (let i = 0; i < this.collisionParticles.length; i++) {
        const particle = at(this.collisionParticles, i);
        this.collide(particle.point, particle.front);
      }
    }
    this.steps++;
    // Initial settling also calls step directly, before the normal update path.
    this.previousAttachment.copy(matrix);
  }
  private carryWithAttachment(attachment: pc.Mat4): void {
    if (attachment.equals(this.previousAttachment)) return;
    this.attachmentInverse.copy(this.previousAttachment).invert();
    this.attachmentDelta.mul2(attachment, this.attachmentInverse);
    for (let i = 0; i < this.p.length; i += 3) {
      this.contactPoint.set(this.p[i]!, this.p[i + 1]!, this.p[i + 2]!);
      this.attachmentDelta.transformPoint(this.contactPoint, this.target);
      this.p[i] = this.target.x;
      this.p[i + 1] = this.target.y;
      this.p[i + 2] = this.target.z;
      this.contactPoint.set(this.previous[i]!, this.previous[i + 1]!, this.previous[i + 2]!);
      this.attachmentDelta.transformPoint(this.contactPoint, this.target);
      this.previous[i] = this.target.x;
      this.previous[i + 1] = this.target.y;
      this.previous[i + 2] = this.target.z;
    }
    this.publish();
    this.previousAttachment.copy(attachment);
  }
  update(dt: number, playing: boolean, motion: 'flowing' | 'settled' = 'flowing') {
    if (!this.enabled) return;
    const start = performance.now();
    // PlayCanvas caps dt before this owner sees it; the monotonic presentation
    // clock detects a real suspended-tab gap without advancing world time.
    const frameGap = dt > 0.25 || start - this.lastUpdate > 250;
    this.lastUpdate = start;
    const attachment = this.bone.getWorldTransform();
    if (motion !== this.motion || frameGap) {
      // Resume from the current folds without stale velocity after a tab gap or
      // a comparison switch. Carry both histories before restarting the solver.
      this.carryWithAttachment(attachment);
      this.previous.set(this.p);
      this.time = 0;
      if (frameGap) this.frameGapResets++;
      this.motion = motion;
    }
    if (!playing || motion === 'settled') {
      // The comparison holds settled folds relative to the shoulder attachment;
      // ordinary pause follows edited travel/heading without advancing fabric.
      this.carryWithAttachment(attachment);
      this.previousAttachment.copy(attachment);
      this.elapsed = 0;
      return;
    }
    this.time += Math.min(dt, 0.05);
    let count = 0;
    while (this.time >= 1 / 60 && count++ < 3) {
      this.step(1 / 60);
      this.time -= 1 / 60;
    }
    if (count) this.publish();
    this.elapsed = performance.now() - start;
    this.previousAttachment.copy(attachment);
  }
  publish() {
    for (const p of this.patches) {
      for (let i = 0; i < p.positions.length; i += 3) {
        const offset = p.start * 3 + i;
        p.positions[i] = this.p[offset]!;
        p.positions[i + 1] = this.p[offset + 1]!;
        p.positions[i + 2] = this.p[offset + 2]!;
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
      particles: this.p.length / 3,
      constraintPasses: this.constraintPasses,
      displayScale: this.displayScale,
      motion: this.motion,
      frameGapResets: this.frameGapResets,
      steps: this.steps,
      finite: this.pinned.every((_, i) =>
        Number.isFinite(this.p[i * 3]! + this.p[i * 3 + 1]! + this.p[i * 3 + 2]!),
      ),
      lastStepMs: this.elapsed,
    };
  }
  destroy() {
    for (const node of this.nodes) node.destroy();
    this.nodes.length = 0;
    this.patches.length = 0;
    for (const mesh of this.ownedMeshes) {
      mesh.decRefCount();
      if (mesh.refCount === 0) mesh.destroy();
    }
    this.ownedMeshes.clear();
  }
}
