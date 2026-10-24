import { assetUrl, readAssetJson } from '../asset-files';
import * as pc from 'playcanvas';
import { BundledModels, type BundledModel } from '../bundled-models';
import { MercenaryMotion } from './mercenary-motion';
import { MercenaryFaceResources } from './mercenary-face';
import { ArtMaterials, type ArtTreatment, baselineArt } from '../art-treatment';
import type { EntityView } from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import { WorldPresentation } from '../world-presentation';
import { PixelCharacter } from './pixel-character';
import { CapeCloth, clothPassesForSize, type MercenaryClothData } from './mercenary-cloth';
import { MercenaryMaterials } from './mercenary-materials';
const mercenaryUrl = assetUrl('apps/client/src/characters/mercenary-assets/mercenary.glb');
const motionUrl = assetUrl('apps/client/src/characters/mercenary-assets/mercenary-motion.glb');

type LoadedModel = {
  resource: BundledModel;
  tracks: pc.AnimTrack[];
  cloth: MercenaryClothData;
};
function renders(root: pc.Entity): pc.RenderComponent[] {
  return root
    .findComponents('render')
    .filter((c): c is pc.RenderComponent => c instanceof pc.RenderComponent);
}

/** One trusted release-selected pilot. No generated URL intake, appearance authority, or world writes.
 * docs/projects/completed/mercenary-scene-pilot.md */
export class MercenaryModels {
  private readonly models: BundledModels;
  private pending?: Promise<LoadedModel>;
  private readonly download = new AbortController();
  private readonly materials: MercenaryMaterials;
  private readonly faces: MercenaryFaceResources;
  constructor(
    private readonly app: pc.Application,
    private readonly presentation: WorldPresentation,
    private readonly camera: pc.Entity,
    sun: pc.Light,
    art: ArtMaterials,
  ) {
    this.models = new BundledModels(app);
    this.materials = new MercenaryMaterials(
      app,
      sun,
      art,
      (variant) => this.faces.setVariant(variant),
      (variant) => this.faces.load(variant),
    );
    this.faces = new MercenaryFaceResources(app, this.materials);
  }
  create(parent: pc.Entity): MercenaryActor {
    return new MercenaryActor(
      this.app,
      parent,
      this.presentation,
      this.materials,
      this.faces,
      this.load(),
      this.camera,
    );
  }
  private load(): Promise<LoadedModel> {
    return (this.pending ??= Promise.all([
      this.models.load('Original mercenary', mercenaryUrl),
      this.models.load('Mercenary motion', motionUrl),
      readAssetJson<MercenaryClothData>(
        'apps/client/src/characters/mercenary-cloth.json',
        this.download.signal,
      ),
      this.faces.load('original'),
    ])
      .then(([resource, motion, cloth]) => ({
        resource,
        cloth,
        tracks: [...resource.animations, ...motion.animations]
          .map((a) => a.resource)
          .filter((track): track is pc.AnimTrack => track instanceof pc.AnimTrack),
      }))
      .catch((error: unknown) => {
        this.pending = undefined;
        throw error;
      }));
  }
  setArtTreatment(style: Readonly<ArtTreatment>): void {
    this.materials.setArtTreatment(style);
  }
  artworkReady(): Promise<boolean> {
    return this.materials.artworkReady();
  }
  destroy(): Promise<void> | undefined {
    this.download.abort();
    this.faces.destroy();
    this.materials.destroy();
    return this.models.destroy();
  }
}

// The visual body is ten percent taller than the 1.85 m study adults. Native
// collision dimensions stay with the world's body definition.
const displayScale = 1.1;

export class MercenaryActor {
  readonly ready: Promise<boolean>;
  private node?: pc.Entity;
  private cloth?: CapeCloth;
  private pixels?: PixelCharacter;
  private strength = 0;
  private selected = false;
  private meshes: pc.MeshInstance[] = [];
  private disposed = false;
  private wanted = false;
  private motion?: MercenaryMotion;
  private resetCloth = true;
  private settling = 0;
  private yaw?: number;
  private readonly previousFoot = new pc.Vec3();
  private readonly worldHead = new pc.Vec3();
  private readonly screenHead = new pc.Vec3();
  private readonly screenFoot = new pc.Vec3();
  private projectedHeight?: number;
  private decorativeSleeping = false;
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  readonly height = 1.85 * displayScale;
  readonly width = 0.95 * displayScale;
  constructor(
    private readonly app: pc.Application,
    private readonly parent: pc.Entity,
    private readonly presentation: WorldPresentation,
    private readonly materials: MercenaryMaterials,
    private readonly faces: MercenaryFaceResources,
    loading: Promise<LoadedModel>,
    private readonly camera: pc.Entity,
  ) {
    this.ready = loading
      .then((resource) => {
        if (this.disposed) return false;
        this.install(resource);
        return true;
      })
      .catch((error: unknown) => {
        if (this.disposed) return false;
        this.release();
        this.state = 'failed';
        console.warn('Mercenary preview keeps the sprite fallback:', error);
        return false;
      });
  }
  /** Offscreen decorative sleeping does not need to finish a visible pose. */
  get presentationReady(): boolean {
    return (
      this.state === 'ready' &&
      (!this.wanted || this.decorativeSleeping || (!this.resetCloth && this.settling === 0))
    );
  }
  private install({ resource, tracks, cloth }: LoadedModel): void {
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
    this.faces.attach(node);
    this.faces.preparePose(node);
    this.cloth = new CapeCloth(this.app, node, displayScale, cloth);
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
    this.visible =
      visible &&
      this.state === 'ready' &&
      !this.decorativeSleeping &&
      !this.resetCloth &&
      this.settling === 0;
    // Disabling a skinned RenderComponent destroys its cached skin. Keep the rig
    // alive while settling/falling back; hide its geometry and skip pose updates.
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
    const foot = this.parent.getPosition();
    const sleeping = this.pixels ? !this.pixels.nearViewport(foot, this.decorativeSleeping) : false;
    if (sleeping !== this.decorativeSleeping) {
      this.decorativeSleeping = sleeping;
      if (!sleeping) this.resetCloth = true;
      this.setVisible(this.wanted);
    }
    if (sleeping) {
      // Decorative pose, cloth and shadows sleep. Current positions/intentions still
      // update in the scene; return settles under the present pose with sprite fallback.
      // docs/verification/performance/overhaul-presentation-implementation.md#offscreen-detailed-model-trial--october17-2026
      anim.speed = 0;
      this.projectedHeight = undefined;
      return;
    }
    const target = view.heading * pc.math.RAD_TO_DEG;
    this.yaw =
      this.yaw === undefined
        ? target
        : pc.math.lerpAngle(this.yaw, target, 1 - Math.exp(-Math.min(dt, 0.1) * 12));
    node.setLocalEulerAngles(0, this.yaw, 0);
    const projection = this.camera.camera;
    this.projectedHeight = undefined;
    if (projection) {
      const cameraPosition = this.camera.getPosition(),
        forward = this.camera.forward;
      const depth =
        (foot.x - cameraPosition.x) * forward.x +
        (foot.y - cameraPosition.y) * forward.y +
        (foot.z - cameraPosition.z) * forward.z;
      if (depth > projection.nearClip) {
        this.worldHead.copy(foot);
        this.worldHead.y += this.height;
        // The pinned camera API uses graphicsDevice.clientRect (CSS pixels).
        // Clip-space Z is not a forward-distance test for orthographic cameras.
        projection.worldToScreen(foot, this.screenFoot);
        projection.worldToScreen(this.worldHead, this.screenHead);
        this.projectedHeight = Math.abs(this.screenHead.y - this.screenFoot.y);
      }
    }
    this.cloth.constraintPasses = clothPassesForSize(
      this.cloth.constraintPasses,
      this.projectedHeight,
      selected,
    );
    if (this.resetCloth || foot.distance(this.previousFoot) > 1.5) {
      this.motion?.rest();
      this.faces.preparePose(node);
      this.cloth.reset();
      this.settling = 60;
      this.resetCloth = false;
      this.setVisible(this.wanted);
    }
    this.previousFoot.copy(foot);
    if (this.settling > 0) {
      // Keep the neutral pose during preparation, including a load while walking.
      // Settle without a 60-step first-use hitch.
      // Keep the existing sprite until the prepared model can replace it atomically.
      for (let i = 0; i < Math.min(3, this.settling); i++) this.cloth.step(1 / 60);
      this.settling = Math.max(0, this.settling - 3);
      this.cloth.publish();
      if (this.settling > 0) return;
      this.pixels?.prepareNeutralPose();
      this.setVisible(this.wanted);
    }
    this.motion?.update(dt, moving, paused, art.motion, art.actionFixture);
    this.faces.preparePose(node);
    this.cloth.update(dt, !paused, art.cloth);
    this.pixels?.setTreatment(
      art.sampling,
      art.edges,
      ['restored', 'tailored', 'embroidered'].includes(art.mercenaryArt),
    );
    this.selected = selected;
    const targetStrength = selected ? 0 : reveal;
    this.strength += (targetStrength - this.strength) * (1 - Math.exp(-Math.min(dt, 0.1) * 12));
    if (Math.abs(this.strength - targetStrength) < 0.001) this.strength = targetStrength;
    this.pixels?.update(foot, this.visible, this.strength, selected);
  }
  setReadThrough(strength: number): void {
    this.strength = strength;
    this.pixels?.update(this.parent.getPosition(), this.visible, strength, this.selected);
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
      selected: this.selected,
      meshes: this.meshes.length,
      representation: 'original-model-coarse-image',
      pixels: this.pixels?.diagnostics(),
      displayScale,
      height: this.height,
      width: this.width,
      artwork: this.materials.diagnostics(),
      animation: this.node?.anim?.baseLayer?.activeState,
      motion: this.motion?.diagnostics(),
      settling: this.settling,
      projectedHeight: this.projectedHeight,
      decorativeSleeping: this.decorativeSleeping,
      cloth: this.cloth?.diagnostics(),
    };
  }
  private release(): void {
    this.pixels?.destroy();
    this.pixels = undefined;
    this.cloth?.destroy();
    this.cloth = undefined;
    if (this.node) this.faces.detach(this.node);
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
