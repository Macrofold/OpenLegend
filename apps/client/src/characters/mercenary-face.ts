import * as pc from 'playcanvas';
import face from './mercenary-assets/mercenary-face.json';
import faithful from './mercenary-assets/variants/face-faithful.json';
import painted from './mercenary-assets/variants/face-painted.json';
import graphic from './mercenary-assets/variants/face-graphic.json';
import type { MercenaryMaterials } from './mercenary-materials';
import type { MercenaryArt } from './mercenary-variants';

const originalPalette: Record<string, string> = {
  ivory: '#c0b69b',
  iris: '#56645d',
  charcoal: '#1e2528',
  lip: '#563c32',
};
interface FaceArt {
  palette: Record<string, string>;
  regions: { name: string; positions: number[]; normals: number[]; indices: number[] }[];
}
const designs: Record<MercenaryArt, FaceArt> = {
  original: { ...face, palette: originalPalette },
  faithful,
  painted,
  graphic,
  restored: { palette: {}, regions: [] },
  tailored: { palette: {}, regions: [] },
  embroidered: { palette: {}, regions: [] },
};

/** Shaped features follow the original curved face. One vertex-colored mesh
 * combines each design's regions; switching its shared mesh also updates the
 * existing capture/shadow participants without replacing their instances. */
export class MercenaryFaceResources {
  private readonly heads = new WeakMap<pc.Entity, pc.GraphNode>();
  private readonly attached = new Map<pc.Entity, pc.MeshInstance>();
  private readonly meshes = new Map<MercenaryArt, pc.Mesh>();
  private readonly source = new pc.StandardMaterial();
  private readonly material: pc.StandardMaterial;
  private variant: MercenaryArt = 'original';
  constructor(
    private readonly app: pc.Application,
    materials: MercenaryMaterials,
  ) {
    this.source.name = 'Mercenary shaped facial artwork';
    this.source.diffuse.set(1, 1, 1);
    this.source.diffuseVertexColor = true;
    this.source.useMetalness = true;
    this.source.metalness = 0;
    this.source.gloss = 0;
    this.material = materials.prepare(this.source);
    for (const [name, design] of Object.entries(designs)) {
      const positions: number[] = [],
        normals: number[] = [],
        colors: number[] = [],
        indices: number[] = [];
      for (const region of design.regions) {
        const offset = positions.length / 3;
        const color = new pc.Color().fromString(design.palette[region.name]!).linear();
        positions.push(...region.positions);
        normals.push(...region.normals);
        for (let i = 0; i < region.positions.length / 3; i++)
          colors.push(color.r, color.g, color.b, 1);
        for (const index of region.indices) indices.push(offset + index);
      }
      const mesh = new pc.Mesh(app.graphicsDevice);
      // Keep capture/shadow membership stable when comparing old overlays with
      // the new source-painted face. A zero-count primitive draws no overlay.
      mesh.setPositions(positions.length ? positions : [0, 0, 0]);
      mesh.setNormals(normals.length ? normals : [0, 1, 0]);
      mesh.setColors(colors.length ? colors : [0, 0, 0, 0]);
      mesh.setIndices(indices.length ? indices : [0, 0, 0]);
      mesh.update();
      if (!indices.length) mesh.primitive[0]!.count = 0;
      // The shared scene owner retains each design across actor replacements.
      mesh.incRefCount();
      this.meshes.set(name as MercenaryArt, mesh);
    }
  }
  setVariant(variant: MercenaryArt): void {
    this.variant = variant;
    for (const instance of this.attached.values()) instance.mesh = this.meshes.get(variant)!;
  }
  attach(root: pc.Entity): void {
    const head = root.findByName('Head');
    if (!head) throw new Error('Mercenary face attachment missing');
    this.heads.set(root, head);
    const node = new pc.Entity('Mercenary shaped facial details', this.app);
    head.addChild(node);
    const instance = new pc.MeshInstance(this.meshes.get(this.variant)!, this.material, node);
    node.addComponent('render', {
      meshInstances: [instance],
      castShadows: true,
      receiveShadows: true,
    });
    this.attached.set(root, instance);
  }
  detach(root: pc.Entity): void {
    this.attached.delete(root);
    this.heads.delete(root);
  }
  preparePose(root: pc.Entity): void {
    const scale = designs[this.variant].regions.length ? 1.08 : 1;
    this.heads.get(root)?.setLocalScale(scale, scale, scale);
  }
  destroy(): void {
    this.attached.clear();
    for (const mesh of this.meshes.values()) {
      mesh.decRefCount();
      if (mesh.refCount === 0) mesh.destroy();
    }
    this.meshes.clear();
    this.source.destroy();
  }
}
