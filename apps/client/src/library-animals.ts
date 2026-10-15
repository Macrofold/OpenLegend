import * as pc from 'playcanvas';
import type { EntityView } from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import fieldUrl from './props/library-animals/hare-field.glb?url';
import russetUrl from './props/library-animals/hare-russet.glb?url';
import winterUrl from './props/library-animals/hare-winter.glb?url';
import { ArtMaterials, type ArtTreatment } from './art-treatment';
import { WorldPresentation, type RevealBinding } from './world-presentation';
import { ShadowMaterial } from './shadow-material';
import { personStencil, setVisibilityStencil } from './visibility-stencil';

export type HareVariant = 'field' | 'russet' | 'winter';
type AnimalContainer = pc.ContainerResource & { animations: pc.Asset[] };
const sources: Record<HareVariant, string> = {
  field: fieldUrl,
  russet: russetUrl,
  winter: winterUrl,
};
function container(value: unknown): value is AnimalContainer {
  return (
    typeof value === 'object' &&
    value !== null &&
    'instantiateRenderEntity' in value &&
    typeof value.instantiateRenderEntity === 'function' &&
    'animations' in value &&
    Array.isArray(value.animations)
  );
}

/** Three fixed painted/shape alternatives from the retained CC0 wild rabbit.
 * Meshes, textures, clips and prepared materials are shared per variant; ordinary
 * frames evaluate only each admitted visible animal's pose and heading. */
export class LibraryAnimals {
  private readonly assets: pc.Asset[] = [];
  private readonly pending = new Map<HareVariant, Promise<AnimalContainer>>();
  private readonly prepared = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly actors = new Set<LibraryAnimalActor>();
  private disposed = false;
  constructor(
    private readonly app: pc.Application,
    private readonly presentation: WorldPresentation,
    private readonly camera: pc.Entity,
    private readonly sun: pc.Light,
    private readonly art: ArtMaterials,
  ) {}
  create(parent: pc.Entity, variant: HareVariant): LibraryAnimalActor {
    const actor = new LibraryAnimalActor(
      parent,
      variant,
      this.load(variant),
      this.presentation,
      this.camera,
      (source) => this.prepare(source),
      () => this.actors.delete(actor),
    );
    this.actors.add(actor);
    return actor;
  }
  private load(variant: HareVariant): Promise<AnimalContainer> {
    const existing = this.pending.get(variant);
    if (existing) return existing;
    const promise = new Promise<AnimalContainer>((resolve, reject) => {
      this.app.assets.loadFromUrl(sources[variant], 'container', (error, asset) => {
        if (this.disposed || error || !asset || !container(asset.resource)) {
          if (asset) {
            asset.unload();
            this.app.assets.remove(asset);
          }
          reject(
            new Error(this.disposed ? 'Animal owner was destroyed.' : 'Animal asset unavailable.'),
          );
          return;
        }
        this.assets.push(asset);
        resolve(asset.resource);
      });
    });
    this.pending.set(variant, promise);
    return promise;
  }
  private prepare(source: pc.StandardMaterial): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const material = new ShadowMaterial(this.sun).copy(source);
    setVisibilityStencil(material, personStencil);
    if (material.diffuseMap) {
      // Fixed UV paint remains fixed when the camera moves. Mips suppress
      // distant texture aliasing without changing the authored 64px artwork.
      material.diffuseMap.magFilter = pc.FILTER_NEAREST;
      material.diffuseMap.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
      material.diffuseMap.anisotropy = 1;
    }
    this.art.prepare(material);
    material.update();
    this.prepared.set(source, material);
    return material;
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const actor of [...this.actors]) actor.destroy();
    for (const material of this.prepared.values()) {
      this.presentation.releaseMaterial(material);
      material.destroy();
    }
    this.prepared.clear();
    for (const asset of this.assets) {
      asset.unload();
      this.app.assets.remove(asset);
    }
    this.assets.length = 0;
    this.pending.clear();
  }
}

export class LibraryAnimalActor {
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  readonly height = 0.45;
  readonly width = 0.76;
  private node?: pc.Entity;
  private meshes: pc.MeshInstance[] = [];
  private binding?: RevealBinding;
  private material?: pc.StandardMaterial;
  private disposed = false;
  private yaw?: number;
  private clip: 'Idle' | 'Run' = 'Idle';
  private elapsed = 0;
  private sampled = 0;
  constructor(
    private readonly parent: pc.Entity,
    private readonly variant: HareVariant,
    loading: Promise<AnimalContainer>,
    private readonly presentation: WorldPresentation,
    private readonly camera: pc.Entity,
    private readonly prepare: (source: pc.StandardMaterial) => pc.StandardMaterial,
    private readonly release: () => void,
  ) {
    void loading
      .then((resource) => {
        if (this.disposed) return;
        this.install(resource);
      })
      .catch((error: unknown) => {
        if (this.disposed) return;
        this.clear();
        this.state = 'failed';
        console.warn('Library hare unavailable; keeping its sprite.', error);
      });
  }
  private install(resource: AnimalContainer): void {
    const node = (this.node = resource.instantiateRenderEntity({
      castShadows: true,
      receiveShadows: true,
    }));
    this.parent.addChild(node);
    for (const component of node.findComponents('render')) {
      if (!(component instanceof pc.RenderComponent)) continue;
      for (const mesh of component.meshInstances) {
        if (!(mesh.material instanceof pc.StandardMaterial))
          throw new Error('Unsupported hare material.');
        mesh.material = this.prepare(mesh.material);
        mesh.visible = mesh.castShadow = false;
        this.meshes.push(mesh);
      }
    }
    const material = this.meshes[0]?.material;
    if (!(material instanceof pc.StandardMaterial)) throw new Error('Hare mesh missing.');
    this.material = material;
    node.addComponent('anim', { activate: true });
    const anim = node.anim;
    if (!anim) throw new Error('Hare animation component missing.');
    anim.loadStateGraph({
      layers: [
        {
          name: 'Body',
          states: [{ name: 'START' }, { name: 'Idle', loop: true }, { name: 'Run', loop: true }],
          transitions: [{ from: 'START', to: 'Idle' }],
        },
      ],
      parameters: {},
    });
    for (const name of ['Idle', 'Run']) {
      const track = resource.animations
        .map((asset) => asset.resource)
        .find(
          (track): track is pc.AnimTrack => track instanceof pc.AnimTrack && track.name === name,
        );
      if (!track) throw new Error('Hare clip missing: ' + name);
      anim.assignAnimation(name, track);
    }
    anim.playing = false;
    anim.baseLayer?.play('Idle');
    anim.update(0);
    this.binding = this.presentation.addReveal(node, material, false, true, this.meshes);
    this.state = 'ready';
    // Loading never publishes appearance. The ordinary scene update admits the
    // current observed/pose/visibility state before replacing its sprite.
    this.setVisible(false);
  }
  setVisible(visible: boolean): void {
    this.visible = visible && this.state === 'ready' && !this.disposed;
    // Keep the rig enabled: toggling RenderComponent destroys cached skin data
    // that the reveal meshes borrow. Hidden rigs receive no manual animation.
    for (const mesh of this.meshes) mesh.visible = mesh.castShadow = this.visible;
    if (!this.visible && this.binding && this.material)
      this.presentation.updateReveal(
        this.binding,
        this.material,
        this.parent.getPosition(),
        this.width,
        this.height,
        0,
        0,
        false,
        false,
      );
  }
  update(
    view: EntityView,
    dt: number,
    moving: boolean,
    paused: boolean,
    reveal: number,
    selected: boolean,
    art: Readonly<ArtTreatment>,
  ): void {
    const node = this.node;
    if (!this.visible || !node?.anim || !this.binding || !this.material) return;
    const step = Math.min(dt, 0.1);
    const target = view.heading * pc.math.RAD_TO_DEG;
    this.yaw =
      this.yaw === undefined
        ? target
        : pc.math.lerpAngle(this.yaw, target, 1 - Math.exp(-step * 12));
    node.setLocalEulerAngles(0, this.yaw, 0);
    const next = moving ? 'Run' : 'Idle';
    if (next !== this.clip) {
      node.anim.baseLayer?.transition(next, 0.08);
      this.clip = next;
      this.elapsed = this.sampled = 0;
    }
    if (!paused) this.elapsed += step;
    const frequency = art.motion === 'held8' ? 8 : art.motion === 'held12' ? 12 : 0;
    const sampled = frequency ? Math.floor(this.elapsed * frequency) / frequency : this.elapsed;
    node.anim.update(Math.max(0, sampled - this.sampled));
    this.sampled = sampled;
    this.presentation.updateReveal(
      this.binding,
      this.material,
      this.parent.getPosition(),
      this.width,
      this.height,
      reveal,
      step,
      true,
      selected,
    );
  }
  get revealStrength(): number {
    return this.visible ? (this.binding?.strength ?? 0) : 0;
  }
  get outlineMeshes(): readonly pc.MeshInstance[] {
    return this.meshes;
  }
  get screenAnchor(): undefined {
    return undefined;
  }
  screenPoint(point: pc.Vec3): pc.Vec3 {
    return this.camera.camera!.worldToScreen(point);
  }
  hit(from: pc.Vec3, to: pc.Vec3): { fraction: number; point: pc.Vec3 } | null {
    let nearest: number | null = null;
    for (const mesh of this.meshes) {
      const hit = intersectBox(from, to, { min: mesh.aabb.getMin(), max: mesh.aabb.getMax() });
      if (hit !== null && (nearest === null || hit < nearest)) nearest = hit;
    }
    return nearest === null
      ? null
      : { fraction: nearest, point: new pc.Vec3().lerp(from, to, nearest) };
  }
  diagnostics() {
    return {
      state: this.state,
      visible: this.visible,
      variant: this.variant,
      representation: 'library-rigged-hare',
      height: this.height,
      width: this.width,
      meshes: this.meshes.length,
      animation: this.node?.anim?.baseLayer?.activeState,
      animationTime: this.node?.anim?.baseLayer?.activeStateCurrentTime,
      automaticUpdate: this.node?.anim?.playing,
      sharedRevealSkin: this.binding?.meshes.every(
        (mesh, i) => mesh.skinInstance === this.meshes[i]?.skinInstance,
      ),
    };
  }
  private clear(): void {
    if (this.binding) this.presentation.removeReveal(this.binding);
    this.binding = undefined;
    this.node?.destroy();
    this.node = undefined;
    this.meshes.length = 0;
    this.visible = false;
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.release();
  }
}
