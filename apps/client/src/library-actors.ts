import * as pc from 'playcanvas';
import { BundledModels, type BundledModel } from './bundled-models';
import type { EntityView } from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import fieldUrl from './props/library-animals/hare-field.glb?url';
import russetUrl from './props/library-animals/hare-russet.glb?url';
import winterUrl from './props/library-animals/hare-winter.glb?url';
import { ArtMaterials, type ArtTreatment } from './art-treatment';
import { WorldPresentation, type RevealBinding } from './world-presentation';
import { ShadowMaterial } from './shadow-material';
import { personStencil, setVisibilityStencil } from './visibility-stencil';
import { studyAssets } from './study-assets';
import { installLocomotion } from './model-animation';
import { markPixelDetail, needsFinePixels } from './scene-pixels';

interface ActorSource {
  url: string;
  height: number;
  width: number;
}
const sources = new Map<string, ActorSource>([
  ['field', { url: fieldUrl, height: 0.45, width: 0.76 }],
  ['russet', { url: russetUrl, height: 0.45, width: 0.76 }],
  ['winter', { url: winterUrl, height: 0.45, width: 0.76 }],
]);
for (const [key, asset] of studyAssets)
  if (asset.animationUrl)
    sources.set(key, {
      url: asset.animationUrl,
      height: asset.height,
      width: Math.max(asset.width, asset.depth),
    });
export const hasLibraryActor = (appearance: string): boolean => sources.has(appearance);
/** Retained CC0 anatomy and fitted clothing, plus the animated wild hare.
 * Meshes, textures, clips and prepared materials are shared per variant; ordinary
 * frames evaluate only each admitted visible actor's pose and heading. */
export class LibraryActors {
  private readonly models: BundledModels;
  private readonly prepared = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly actors = new Set<LibraryActor>();
  private disposed = false;
  constructor(
    private readonly app: pc.Application,
    private readonly presentation: WorldPresentation,
    private readonly camera: pc.Entity,
    private readonly sun: pc.Light,
    private readonly art: ArtMaterials,
  ) {
    this.models = new BundledModels(app);
  }
  create(parent: pc.Entity, variant: string): LibraryActor {
    const source = sources.get(variant)!;
    const actor = new LibraryActor(
      parent,
      variant,
      this.models.load('Library actor · ' + variant, source.url),
      source,
      this.presentation,
      this.camera,
      (material) => this.prepare(material, needsFinePixels(source.width, source.height, source.width)),
      () => this.actors.delete(actor),
    );
    this.actors.add(actor);
    return actor;
  }
  private prepare(source: pc.StandardMaterial, fine: boolean): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const material = new ShadowMaterial(this.sun).copy(source);
    setVisibilityStencil(material, personStencil);
    if (material.diffuseMap) {
      // Fixed UV paint remains fixed when the camera moves. Mips suppress
      // distant texture aliasing without repainting the authored artwork.
      material.diffuseMap.magFilter = pc.FILTER_NEAREST;
      material.diffuseMap.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
      material.diffuseMap.anisotropy = 1;
    }
    this.art.prepare(material);
    if (fine) markPixelDetail(material, this.app.graphicsDevice);
    material.update();
    this.prepared.set(source, material);
    return material;
  }
  destroy(): Promise<void> | undefined {
    if (this.disposed) return;
    this.disposed = true;
    for (const actor of [...this.actors]) actor.destroy();
    for (const material of this.prepared.values()) {
      this.presentation.releaseMaterial(material);
      material.destroy();
    }
    this.prepared.clear();
    return this.models.destroy();
  }
}

export class LibraryActor {
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  get height(): number {
    return this.source.height;
  }
  get width(): number {
    return this.source.width;
  }
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
    private readonly variant: string,
    loading: Promise<BundledModel>,
    private readonly source: ActorSource,
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
        console.warn('Library actor unavailable; keeping its sprite.', error);
      });
  }
  private install(resource: BundledModel): void {
    const node = (this.node = resource.instantiateRenderEntity({
      castShadows: true,
      receiveShadows: true,
    }));
    this.parent.addChild(node);
    for (const component of node.findComponents('render')) {
      if (!(component instanceof pc.RenderComponent)) continue;
      for (const mesh of component.meshInstances) {
        if (!(mesh.material instanceof pc.StandardMaterial))
          throw new Error('Unsupported actor material.');
        mesh.material = this.prepare(mesh.material);
        mesh.visible = mesh.castShadow = false;
        this.meshes.push(mesh);
      }
    }
    const material = this.meshes[0]?.material;
    if (!(material instanceof pc.StandardMaterial)) throw new Error('Actor mesh missing.');
    this.material = material;
    installLocomotion(node, resource);
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
    const changed = next !== this.clip;
    if (changed) {
      node.anim.baseLayer?.transition(next, 0.08);
      this.clip = next;
      this.elapsed = this.sampled = 0;
    }
    if (!paused) this.elapsed += step;
    const frequency = art.motion === 'held8' ? 8 : art.motion === 'held12' ? 12 : 0;
    const sampled = frequency ? Math.floor(this.elapsed * frequency) / frequency : this.elapsed;
    // Holding a pose (or pausing) needs no repeat skeleton evaluation. Rendering
    // still follows current placement and reveal, independently of pose cadence.
    const advance = Math.max(0, sampled - this.sampled);
    if (changed || advance > 0) node.anim.update(advance);
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
      representation: 'library-rigged-actor',
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
