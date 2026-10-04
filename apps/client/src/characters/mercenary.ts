import * as pc from 'playcanvas';
import mercenaryUrl from './mercenary-assets/mercenary.glb?url';
import type { EntityView } from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import { WorldPresentation } from '../world-presentation';
import { PixelCharacter } from './pixel-character';
import { CapeCloth } from './mercenary-cloth';
import { MercenaryMaterials } from './mercenary-materials';

type Container = pc.ContainerResource & { animations: pc.Asset[] };
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
  private asset?: pc.Asset;
  private pending?: Promise<Container>;
  private disposed = false;
  private readonly materials: MercenaryMaterials;
  constructor(
    private readonly app: pc.Application,
    private readonly presentation: WorldPresentation,
    private readonly camera: pc.Entity,
    sun: pc.Light,
  ) {
    this.materials = new MercenaryMaterials(app.graphicsDevice, sun);
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
  private load(): Promise<Container> {
    return (this.pending ??= new Promise((resolve, reject) => {
      this.app.assets.loadFromUrl(mercenaryUrl, 'container', (error, asset) => {
        if (this.disposed) {
          asset?.unload();
          if (asset) this.app.assets.remove(asset);
          reject(new Error('Mercenary renderer disposed'));
          return;
        }
        if (asset) this.asset = asset;
        const resource: unknown = asset?.resource;
        if (error || !container(resource)) {
          reject(new Error('Mercenary model unavailable'));
          return;
        }
        resolve(resource);
      });
    }));
  }
  destroy(): void {
    this.disposed = true;
    this.materials.destroy();
    this.asset?.unload();
    if (this.asset) this.app.assets.remove(this.asset);
  }
}

export class MercenaryActor {
  private node?: pc.Entity;
  private cloth?: CapeCloth;
  private pixels?: PixelCharacter;
  private revealAmount = 0;
  private selected = false;
  private readonly renderPixels = () =>
    this.pixels?.update(this.parent.getPosition(), this.visible, this.revealAmount, this.selected);
  private meshes: pc.MeshInstance[] = [];
  private disposed = false;
  private wanted = false;
  private wasMoving = false;
  private resetCloth = true;
  private settling = 0;
  private yaw?: number;
  private readonly previousFoot = new pc.Vec3();
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  readonly height = 1.85;
  constructor(
    private readonly app: pc.Application,
    private readonly parent: pc.Entity,
    private readonly presentation: WorldPresentation,
    private readonly materials: MercenaryMaterials,
    loading: Promise<Container>,
    private readonly camera: pc.Entity,
  ) {
    this.app.on('prerender', this.renderPixels);
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
  private install(resource: Container): void {
    const tracks = resource.animations
      .map((a) => a.resource)
      .filter((r): r is pc.AnimTrack => r instanceof pc.AnimTrack);
    const idle = tracks.find((r) => r.name === 'Idle');
    const walk = tracks.find((r) => r.name === 'Walk');
    if (!(idle instanceof pc.AnimTrack) || !(walk instanceof pc.AnimTrack))
      throw new Error('Mercenary idle/walk clips missing');
    const node = (this.node = resource.instantiateRenderEntity({
      castShadows: true,
      receiveShadows: true,
    }));
    this.parent.addChild(node);
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
    anim.loadStateGraph({
      layers: [
        {
          name: 'Body',
          states: [{ name: 'START' }, { name: 'Idle', loop: true }, { name: 'Walk', loop: true }],
          transitions: [{ from: 'START', to: 'Idle' }],
        },
      ],
      parameters: {},
    });
    anim.assignAnimation('Idle', idle);
    anim.assignAnimation('Walk', walk);
    const layer = anim.baseLayer;
    if (!layer) throw new Error('Mercenary animation layer missing');
    layer.play('Idle');
    anim.speed = 0;
    // Force the first supported pose before attaching skin-relative fabric.
    node.enabled = true;
    layer.update(0);
    this.cloth = new CapeCloth(this.app, node);
    const components = [
      ...renders(node).filter((r) => r.enabled),
      ...this.cloth.patches.flatMap((p) => renders(p.node)),
    ];
    this.meshes = components.flatMap((r) => r.meshInstances);
    this.pixels = new PixelCharacter(
      this.app,
      this.camera,
      this.presentation.characterLayer,
      this.presentation.foregroundLayer,
      this.presentation.protectionLayer,
      components,
    );
    this.previousFoot.copy(this.parent.getPosition());
    this.state = 'ready';
    this.setVisible(false);
  }
  setVisible(visible: boolean): void {
    if (visible && !this.wanted) this.resetCloth = true;
    this.wanted = visible;
    this.visible = visible && this.state === 'ready' && !this.resetCloth && this.settling === 0;
    if (this.node) this.node.enabled = this.visible;
    this.cloth?.setVisible(this.visible);
    for (const mesh of this.meshes) mesh.castShadow = this.visible;
    this.pixels?.setVisible(this.visible);
  }
  update(
    view: EntityView,
    dt: number,
    moving: boolean,
    paused: boolean,
    reveal: number,
    selected: boolean,
  ): void {
    this.selected = selected;
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
    if (moving !== this.wasMoving) {
      anim.baseLayer?.transition(moving ? 'Walk' : 'Idle', 0.12);
      this.wasMoving = moving;
    }
    anim.speed = paused ? 0 : 1;
    this.cloth.update(dt, !paused);
    this.revealAmount = reveal;
  }
  get revealStrength(): number {
    return this.visible ? this.revealAmount : 0;
  }
  get outlineMeshes(): readonly pc.MeshInstance[] {
    return this.pixels?.outlineMeshes ?? [];
  }
  hit(from: pc.Vec3, to: pc.Vec3): number | null {
    // Conservative per-mesh bounds for this one pilot, retaining world obstruction.
    // Exact skinned-triangle picking remains part of the broader representation work.
    let nearest: number | null = null;
    for (const mesh of this.meshes) {
      const hit = intersectBox(from, to, { min: mesh.aabb.getMin(), max: mesh.aabb.getMax() });
      if (hit !== null && (nearest === null || hit < nearest)) nearest = hit;
    }
    return nearest;
  }
  diagnostics() {
    return {
      state: this.state,
      visible: this.visible,
      meshes: this.meshes.length,
      resolution: [128, 192],
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
    this.meshes.length = 0;
    this.visible = false;
  }
  destroy(): void {
    this.disposed = true;
    this.app.off('prerender', this.renderPixels);
    this.release();
  }
}
