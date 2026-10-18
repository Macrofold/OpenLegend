import * as pc from 'playcanvas';
import { readAssetJson } from '../asset-files';
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
type FaceDesign = Exclude<MercenaryArt, 'tailored' | 'embroidered'>;
const sources: Record<FaceDesign, string> = {
  original: 'apps/client/src/characters/mercenary-assets/mercenary-face.json',
  faithful: 'apps/client/src/characters/mercenary-assets/variants/face-faithful.json',
  painted: 'apps/client/src/characters/mercenary-assets/variants/face-painted.json',
  graphic: 'apps/client/src/characters/mercenary-assets/variants/face-graphic.json',
  restored: 'apps/client/src/props/art-study/source-mercenary/face-study.json',
};
function designFor(variant: MercenaryArt): FaceDesign {
  return variant === 'tailored' || variant === 'embroidered' ? 'restored' : variant;
}

/** Shaped features follow the original curved face. One vertex-colored mesh
 * combines each design's regions; switching its shared mesh also updates the
 * existing capture/shadow participants without replacing their instances. */
export class MercenaryFaceResources {
  private readonly heads = new WeakMap<pc.Entity, pc.GraphNode>();
  private readonly attached = new Map<pc.Entity, pc.MeshInstance>();
  private readonly meshes = new Map<FaceDesign, pc.Mesh>();
  private readonly pending = new Map<FaceDesign, Promise<void>>();
  private readonly downloads = new Set<AbortController>();
  private disposed = false;
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
  }
  /** Load only the selected design. The three source-painted outfits share one
   * exact face mesh, while the existing material owner commits each comparison
   * only after its face and both textures are ready. */
  load(variant: MercenaryArt): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Mercenary face owner was destroyed.'));
    const name = designFor(variant);
    if (this.meshes.has(name)) return Promise.resolve();
    const existing = this.pending.get(name);
    if (existing) return existing;
    const download = new AbortController();
    this.downloads.add(download);
    let preparing: pc.Mesh | undefined;
    const pending = readAssetJson<FaceArt>(sources[name], download.signal)
      .then((design) => {
        if (this.disposed) throw new Error('Mercenary face owner was destroyed.');
        const palette = name === 'original' ? originalPalette : design.palette;
        const positions: number[] = [],
          normals: number[] = [],
          colors: number[] = [],
          indices: number[] = [];
        for (const region of design.regions) {
          const offset = positions.length / 3;
          const color = new pc.Color().fromString(palette[region.name]!).linear();
          positions.push(...region.positions);
          normals.push(...region.normals);
          for (let i = 0; i < region.positions.length / 3; i++)
            colors.push(color.r, color.g, color.b, 1);
          for (const index of region.indices) indices.push(offset + index);
        }
        const mesh = (preparing = new pc.Mesh(this.app.graphicsDevice));
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
        this.meshes.set(name, mesh);
      })
      .catch((error: unknown) => {
        // Upload can fail before the prepared mesh joins the shared owner.
        if (preparing && !this.meshes.has(name)) preparing.destroy();
        throw error;
      })
      .finally(() => {
        this.downloads.delete(download);
        this.pending.delete(name);
      });
    this.pending.set(name, pending);
    return pending;
  }
  setVariant(variant: MercenaryArt): void {
    this.variant = variant;
    const mesh = this.meshes.get(designFor(variant));
    if (mesh) for (const instance of this.attached.values()) instance.mesh = mesh;
  }
  attach(root: pc.Entity): void {
    const head = root.findByName('Head');
    if (!head) throw new Error('Mercenary face attachment missing');
    this.heads.set(root, head);
    const node = new pc.Entity('Mercenary shaped facial details', this.app);
    head.addChild(node);
    const mesh = this.meshes.get(designFor(this.variant));
    if (!mesh) throw new Error('Mercenary face artwork is not prepared.');
    const instance = new pc.MeshInstance(mesh, this.material, node);
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
    const scale = ['restored', 'tailored', 'embroidered'].includes(this.variant) ? 1 : 1.08;
    this.heads.get(root)?.setLocalScale(scale, scale, scale);
  }
  destroy(): void {
    this.disposed = true;
    for (const download of this.downloads) download.abort();
    this.downloads.clear();
    this.pending.clear();
    this.attached.clear();
    for (const mesh of this.meshes.values()) {
      mesh.decRefCount();
      if (mesh.refCount === 0) mesh.destroy();
    }
    this.meshes.clear();
    this.source.destroy();
  }
}
