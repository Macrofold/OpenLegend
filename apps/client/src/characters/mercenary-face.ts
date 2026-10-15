import * as pc from 'playcanvas';
import face from './mercenary-assets/mercenary-face.json';
import type { MercenaryMaterials } from './mercenary-materials';

const palette: Record<string, string> = {
  ivory: '#c0b69b',
  iris: '#56645d',
  charcoal: '#1e2528',
  lip: '#563c32',
};

/** Sparse shaped details follow the original curved face, not the camera.
 * The source nose, beard, scars and hair remain the identity and silhouette.
 * Geometry/material preparation is shared once by the scene's pilot owner. */
export class MercenaryFaceResources {
  private readonly heads = new WeakMap<pc.Entity, pc.GraphNode>();
  private readonly parts: {
    mesh: pc.Mesh;
    material: pc.StandardMaterial;
    source: pc.StandardMaterial;
  }[] = [];
  constructor(app: pc.Application, materials: MercenaryMaterials) {
    for (const region of face.regions) {
      const color = palette[region.name];
      if (!color) throw new Error('Unsupported authored facial region');
      const mesh = new pc.Mesh(app.graphicsDevice);
      mesh.setPositions(region.positions);
      mesh.setNormals(region.normals);
      mesh.setIndices(region.indices);
      mesh.update();
      // The scene retains a reference even when its last actor is replaced.
      mesh.incRefCount();
      const source = new pc.StandardMaterial();
      source.name = 'Mercenary face · ' + region.name;
      source.diffuse = new pc.Color().fromString(color).linear();
      source.useMetalness = true;
      source.metalness = 0;
      source.gloss = 0;
      const material = materials.prepare(source);
      // These authored feature colors should not be reclassified as clothing.
      material.setParameter('ol_artRole', 0);
      this.parts.push({ mesh, material, source });
    }
  }
  attach(root: pc.Entity): void {
    const head = root.findByName('Head');
    if (!head) throw new Error('Mercenary face attachment missing');
    this.heads.set(root, head);
    const node = new pc.Entity('Mercenary shaped facial details');
    head.addChild(node);
    node.addComponent('render', {
      meshInstances: this.parts.map((part) => new pc.MeshInstance(part.mesh, part.material, node)),
      castShadows: true,
      receiveShadows: true,
    });
  }
  preparePose(root: pc.Entity): void {
    // A small art-only proportion adjustment gives the realistic source head
    // enough room for distinct eyes in the same coarse full-figure image.
    const head = this.heads.get(root);
    head?.setLocalScale(1.08, 1.08, 1.08);
  }
  destroy(): void {
    for (const part of this.parts) {
      part.mesh.decRefCount();
      part.mesh.destroy();
      part.source.destroy();
    }
    this.parts.length = 0;
  }
}
