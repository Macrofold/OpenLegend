import * as pc from 'playcanvas';
import mercenaryUrl from './mercenary-assets/mercenary.glb?url';
import motionUrl from './mercenary-assets/mercenary-motion.glb?url';
import { MercenaryMotion } from './mercenary-motion';
import { ArtMaterials, type ArtTreatment, baselineArt } from '../art-treatment';
import type { EntityView } from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import { WorldPresentation } from '../world-presentation';
import { PixelCharacter } from './pixel-character';
import { CapeCloth } from './mercenary-cloth';
import { MercenaryMaterials } from './mercenary-materials';

type Container = pc.ContainerResource & { animations: pc.Asset[] };
type LoadedModel = { resource: Container; tracks: pc.AnimTrack[] };
function container(value: unknown): value is Container {
  return (
    typeof value === 'object' &&
    value !== null &&
    'instantiateRenderEntity' in value &&
    typeof value.instantiateRenderEntity === 'function' &&
    'animations' in value &&
    Array.isArray(value.animations)
  );
}
function renders(root: pc.Entity): pc.RenderComponent[] {
  return root
    .findComponents('render')
    .filter((c): c is pc.RenderComponent => c instanceof pc.RenderComponent);
}

/** One trusted bundled pilot. No generated URL intake, appearance authority, or world writes.
 * docs/projects/completed/mercenary-scene-pilot.md */
export class MercenaryModels {
  private readonly assets: pc.Asset[] = [];
  private pending?: Promise<LoadedModel>;
  private disposed = false;
  private readonly materials: MercenaryMaterials;
  constructor(
    private readonly app: pc.Application,
    private readonly presentation: WorldPresentation,
    private readonly camera: pc.Entity,
    sun: pc.Light,
    art: ArtMaterials,
  ) {
    this.materials = new MercenaryMaterials(sun, art);
  }
  create(parent: pc.Entity): MercenaryActor {
    return new MercenaryActor(
      this.app,
      parent,
      this.presentation,
      this.materials,
      this.load(),
      this.camera,
    );
  }
  private load(): Promise<LoadedModel> {
    return (this.pending ??= Promise.all([
      this.loadAsset(mercenaryUrl),
      this.loadAsset(motionUrl),
    ]).then(([resource, motion]) => ({
      resource,
      tracks: [...resource.animations, ...motion.animations]
        .map((a) => a.resource)
        .filter((track): track is pc.AnimTrack => track instanceof pc.AnimTrack),
    })));
  }
  private loadAsset(url: string): Promise<Container> {
    return new Promise((resolve, reject) =>
      this.app.assets.loadFromUrl(url, 'container', (error, asset) => {
        if (this.disposed) {
          asset?.unload();
          if (asset) this.app.assets.remove(asset);
          reject(new Error('Mercenary renderer disposed'));
          return;
        }
        if (asset) this.assets.push(asset);
        const resource: unknown = asset?.resource;
        if (error || !container(resource)) {
          reject(new Error('Mercenary model unavailable'));
          return;
        }
        resolve(resource);
      }),
    );
  }
  destroy(): void {
    this.disposed = true;
    this.materials.destroy();
    for (const asset of this.assets) {
      asset.unload();
      this.app.assets.remove(asset);
    }
    this.assets.length = 0;
  }
}

// Keep physical rig and cloth dimensions fixed; the character image corrects
// apparent height beside the camera-facing people without enlarging this body.
const displayScale = 1.1;

export class MercenaryActor {
  private node?: pc.Entity;
  private cloth?: CapeCloth;
  private pixels?: PixelCharacter;
  private strength = 0;
  private meshes: pc.MeshInstance[] = [];
  private disposed = false;
  private wanted = false;
  private motion?: MercenaryMotion;
  private resetCloth = true;
  private settling = 0;
  private yaw?: number;
  private readonly previousFoot = new pc.Vec3();
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  readonly height = 1.85 * displayScale;
  readonly width = 0.95 * displayScale;
  constructor(
    private readonly app: pc.Application,
    private readonly parent: pc.Entity,
    private readonly presentation: WorldPresentation,
    private readonly materials: MercenaryMaterials,
    loading: Promise<LoadedModel>,
    private readonly camera: pc.Entity,
  ) {
    void loading
      .then((resource) => {
        if (this.disposed) return;
        this.install(resource);
      })
      .catch((error: unknown) => {
        if (this.disposed) return;
        this.release();
        this.state = 'failed';
        console.warn('Mercenary preview keeps the sprite fallback:', error);
      });
  }
  private install({ resource, tracks }: LoadedModel): void {
    /* prepared clips include original and deliberately exported holds. */
    const originalTracks = resource.animations
      .map((a) => a.resource)
      .filter((r): r is pc.AnimTrack => r instanceof pc.AnimTrack);
    const idle = originalTracks.find((r) => r.name === 'Idle');
    const walk = originalTracks.find((r) => r.name === 'Walk');
    if (!(idle instanceof pc.AnimTrack) || !(walk instanceof pc.AnimTrack))
      throw new Error('Mercenary idle/walk clips missing');
    const node = (this.node = resource.instantiateRenderEntity({
      castShadows: true,
      receiveShadows: true,
    }));
    this.parent.addChild(node);
    // Preserve the GLB root's centimetre-to-metre conversion.
    node.setLocalScale(node.getLocalScale().clone().mulScalar(displayScale));
    node.enabled = false;
    for (const render of renders(node))
      for (const mesh of render.meshInstances) {
        if (!(mesh.material instanceof pc.StandardMaterial))
          throw new Error('Unsupported mercenary material');
        mesh.material = this.materials.prepare(mesh.material);
      }
    node.addComponent('anim', { activate: true });
    const anim = node.anim;
    if (!anim) throw new Error('Mercenary animation component missing');
    node.enabled = true;
    this.motion = new MercenaryMotion(anim, tracks);
    this.cloth = new CapeCloth(this.app, node, displayScale);
    const components = [
      ...renders(node).filter((r) => r.enabled),
      ...this.cloth.patches.flatMap((p) => renders(p.node)),
    ];
    this.meshes = components.flatMap((r) => r.meshInstances);
    this.pixels = new PixelCharacter(
      this.app,
      this.camera,
      this.presentation.layer,
      this.presentation.foregroundLayer,
      this.presentation.protectionLayer,
      components,
      node,
    );
    this.previousFoot.copy(this.parent.getPosition());
    this.state = 'ready';
    this.setVisible(this.wanted);
  }
  setVisible(visible: boolean): void {
    if (visible && !this.wanted) this.resetCloth = true;
    this.wanted = visible;
    this.visible = visible && this.state === 'ready' && !this.resetCloth && this.settling === 0;
    // Disabling a skinned RenderComponent destroys its cached skin. Keep the rig
    // alive while settling/falling back; hide its geometry and stop its animation.

    this.cloth?.setVisible(this.visible);
    for (const mesh of this.meshes) {
      mesh.visible = this.visible;
      mesh.castShadow = this.visible;
    }
    if (!this.visible) {
      this.strength = 0;
      this.pixels?.setVisible(false);
    }
  }
  update(
    view: EntityView,
    dt: number,
    moving: boolean,
    paused: boolean,
    reveal: number,
    selected: boolean,
    art: Readonly<ArtTreatment> = baselineArt,
  ): void {
    const node = this.node,
      anim = node?.anim;
    if (!node || !anim || !this.cloth || !this.wanted) return;
    const target = view.heading * pc.math.RAD_TO_DEG;
    this.yaw =
      this.yaw === undefined
        ? target
        : pc.math.lerpAngle(this.yaw, target, 1 - Math.exp(-Math.min(dt, 0.1) * 12));
    node.setLocalEulerAngles(0, this.yaw, 0);
    const foot = this.parent.getPosition();
    this.motion?.update(dt, moving, paused, art.motion, art.actionFixture);
    if (this.resetCloth || foot.distance(this.previousFoot) > 1.5) {
      this.cloth.reset();
      this.settling = 60;
      this.resetCloth = false;
      this.setVisible(this.wanted);
    }
    this.previousFoot.copy(foot);
    if (this.settling > 0) {
      // Settle under the current pose even while paused, without a 60-step first-use hitch.
      // Keep the existing sprite until the prepared model can replace it atomically.
      for (let i = 0; i < Math.min(3, this.settling); i++) this.cloth.step(1 / 60);
      this.settling = Math.max(0, this.settling - 3);
      this.cloth.publish();
      if (this.settling > 0) return;
      this.setVisible(this.wanted);
    }
    this.cloth.update(dt, !paused, art.cloth);
    this.pixels?.setTreatment(art.sampling, art.edges);
    const targetStrength = selected ? 0 : reveal;
    this.strength += (targetStrength - this.strength) * (1 - Math.exp(-Math.min(dt, 0.1) * 12));
    if (Math.abs(this.strength - targetStrength) < 0.001) this.strength = targetStrength;
    this.pixels?.update(foot, this.visible, this.strength, selected);
  }
  get revealStrength(): number {
    return this.visible ? this.strength : 0;
  }
  get outlineMeshes(): readonly pc.MeshInstance[] {
    return this.pixels?.outlineMeshes ?? [];
  }
  get screenAnchor(): { x: number; y: number } | undefined {
    return this.pixels?.anchor;
  }
  screenPoint(point: pc.Vec3): pc.Vec3 {
    return this.pixels?.screenPoint(point) ?? this.camera.camera!.worldToScreen(point);
  }
  hit(from: pc.Vec3, to: pc.Vec3): { fraction: number; point: pc.Vec3 } | null {
    // Invert the displayed image before testing the original model. Geometry and
    // its world-depth range remain unchanged by the apparent-height correction.
    const ray = this.pixels?.sourceRay(from, to) ?? { from, to };
    let nearest: number | null = null;
    for (const mesh of this.meshes) {
      const hit = intersectBox(ray.from, ray.to, {
        min: mesh.aabb.getMin(),
        max: mesh.aabb.getMax(),
      });
      if (hit !== null && (nearest === null || hit < nearest)) nearest = hit;
    }
    return nearest === null
      ? null
      : { fraction: nearest, point: new pc.Vec3().lerp(ray.from, ray.to, nearest) };
  }
  diagnostics() {
    return {
      state: this.state,
      visible: this.visible,
      meshes: this.meshes.length,
      representation: 'original-model-coarse-image',
      pixels: this.pixels?.diagnostics(),
      displayScale,
      height: this.height,
      width: this.width,
      animation: this.node?.anim?.baseLayer?.activeState,
      motion: this.motion?.diagnostics(),
      settling: this.settling,
      cloth: this.cloth?.diagnostics(),
    };
  }
  private release(): void {
    this.pixels?.destroy();
    this.pixels = undefined;
    this.cloth?.destroy();
    this.cloth = undefined;
    this.node?.destroy();
    this.node = undefined;
    this.motion = undefined;
    this.meshes.length = 0;
    this.visible = false;
  }
  destroy(): void {
    this.disposed = true;
    this.release();
  }
}
