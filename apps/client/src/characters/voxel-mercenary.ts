import * as pc from 'playcanvas';
import type { EntityView } from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import modelUrl from './mercenary-assets/mercenary-voxel.glb?url';
import { WorldPresentation, type RevealBinding } from '../world-presentation';
import { personStencil, setVisibilityStencil } from '../visibility-stencil';

function isContainer(value: unknown): value is pc.ContainerResource {
  return (
    typeof value === 'object' &&
    value !== null &&
    'instantiateRenderEntity' in value &&
    typeof value.instantiateRenderEntity === 'function'
  );
}

/** Scene-owned immutable art. The earlier sampled model remains in mercenary.ts.
 * docs/projects/mercenary-voxel-iteration.md */
export class VoxelMercenaryModels {
  private asset?: pc.Asset;
  private pending?: Promise<pc.ContainerResource>;
  private disposed = false;
  readonly material = new pc.StandardMaterial();
  constructor(
    private readonly app: pc.Application,
    private readonly presentation: WorldPresentation,
  ) {
    this.material.name = 'Authored mercenary block colors';
    this.material.diffuse.set(1, 1, 1);
    this.material.diffuseVertexColor = true;
    // Blender/glTF COLOR_0 is linear in the pinned engine. Lighting changes
    // whole authored faces, never their placement or palette assignment.
    this.material.specular.set(0, 0, 0);
    this.material.gloss = 0;
    setVisibilityStencil(this.material, personStencil);
    this.material.update();
  }
  create(parent: pc.Entity): VoxelMercenaryActor {
    return new VoxelMercenaryActor(parent, this.presentation, this.material, this.load());
  }
  private load(): Promise<pc.ContainerResource> {
    return (this.pending ??= new Promise((resolve, reject) => {
      this.app.assets.loadFromUrl(modelUrl, 'container', (error, asset) => {
        if (this.disposed) {
          asset?.unload();
          if (asset) this.app.assets.remove(asset);
          reject(new Error('Mercenary scene disposed'));
          return;
        }
        if (asset) this.asset = asset;
        const resource: unknown = asset?.resource;
        if (error || !isContainer(resource)) {
          reject(new Error('Authored block mercenary unavailable'));
          return;
        }
        resolve(resource);
      });
    }));
  }
  destroy(): void {
    this.disposed = true;
    // Scene teardown destroys every actor's borrowed meshes first.
    this.presentation.releaseMaterial(this.material);
    this.material.destroy();
    this.asset?.unload();
    if (this.asset) this.app.assets.remove(this.asset);
  }
}

const partNames = [
  'leftUpperArm',
  'leftForearm',
  'rightUpperArm',
  'rightForearm',
  'leftThigh',
  'leftShin',
  'rightThigh',
  'rightShin',
] as const;
type PartName = (typeof partNames)[number];

/** Blocks are permanent mesh faces; walking moves rigid parts without resampling
 * or deforming their cells. Native movement remains the only position authority. */
export class VoxelMercenaryActor {
  private node?: pc.Entity;
  private readonly parts = new Map<PartName, pc.GraphNode>();
  private meshes: pc.MeshInstance[] = [];
  private bindings: RevealBinding[] = [];
  private disposed = false;
  private wanted = false;
  private yaw?: number;
  private phase = 0;
  private stride = 0;
  private revealAmount = 0;
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  readonly height = 2.1;
  constructor(
    private readonly parent: pc.Entity,
    private readonly presentation: WorldPresentation,
    private readonly material: pc.StandardMaterial,
    loading: Promise<pc.ContainerResource>,
  ) {
    void loading
      .then((resource) => {
        if (this.disposed) return;
        const node = (this.node = resource.instantiateRenderEntity({
          castShadows: true,
          receiveShadows: true,
        }));
        node.enabled = false;
        this.parent.addChild(node);
        for (const name of partNames) {
          const part = node.findByName(name);
          if (!part) throw new Error(`Missing authored mercenary part: ${name}`);
          this.parts.set(name, part);
        }
        const components = node
          .findComponents('render')
          .filter(
            (component): component is pc.RenderComponent => component instanceof pc.RenderComponent,
          );
        for (const component of components) {
          for (const mesh of component.meshInstances) mesh.material = this.material;
          this.bindings.push(
            this.presentation.addReveal(component.entity, this.material, false, true),
          );
        }
        this.meshes = components.flatMap((component) => component.meshInstances);
        if (this.meshes.length === 0) throw new Error('Authored mercenary geometry missing');
        this.state = 'ready';
        this.setVisible(this.wanted);
      })
      .catch((error: unknown) => {
        if (this.disposed) return;
        this.release();
        this.state = 'failed';
        console.warn('Mercenary keeps the sprite fallback:', error);
      });
  }
  setVisible(visible: boolean): void {
    this.wanted = visible;
    this.visible = visible && this.state === 'ready';
    if (this.node) this.node.enabled = this.visible;
    for (const mesh of this.meshes) mesh.castShadow = this.visible;
    if (!this.visible) {
      this.revealAmount = 0;
      for (const binding of this.bindings)
        this.presentation.updateReveal(
          binding,
          this.material,
          this.parent.getPosition(),
          0.85,
          this.height,
          0,
          0,
          false,
          false,
        );
    }
  }
  update(
    view: EntityView,
    dt: number,
    moving: boolean,
    paused: boolean,
    reveal: number,
    selected: boolean,
  ): void {
    const node = this.node;
    if (!node || !this.visible) return;
    const step = Math.min(dt, 0.1);
    const target = view.heading * pc.math.RAD_TO_DEG;
    this.yaw =
      this.yaw === undefined
        ? target
        : pc.math.lerpAngle(this.yaw, target, 1 - Math.exp(-step * 12));
    node.setLocalEulerAngles(0, this.yaw, 0);
    if (!paused) {
      this.stride = pc.math.lerp(this.stride, moving ? 1 : 0, 1 - Math.exp(-step * 12));
      if (moving || this.stride > 0.001) this.phase += step * 8;
      const swing = Math.sin(this.phase) * this.stride;
      this.parts.get('leftThigh')?.setLocalEulerAngles(swing * 18, 0, 0);
      this.parts.get('rightThigh')?.setLocalEulerAngles(-swing * 18, 0, 0);
      this.parts.get('leftShin')?.setLocalEulerAngles(Math.max(0, -swing) * 12, 0, 0);
      this.parts.get('rightShin')?.setLocalEulerAngles(Math.max(0, swing) * 12, 0, 0);
      this.parts.get('leftUpperArm')?.setLocalEulerAngles(-swing * 12, 0, 0);
      this.parts.get('rightUpperArm')?.setLocalEulerAngles(swing * 12, 0, 0);
      this.parts.get('leftForearm')?.setLocalEulerAngles(-Math.abs(swing) * 5, 0, 0);
      this.parts.get('rightForearm')?.setLocalEulerAngles(-Math.abs(swing) * 5, 0, 0);
    }
    this.revealAmount = reveal;
    for (const binding of this.bindings)
      this.presentation.updateReveal(
        binding,
        this.material,
        this.parent.getPosition(),
        0.85,
        this.height,
        reveal,
        dt,
        true,
        selected,
      );
  }
  get revealStrength(): number {
    return this.visible ? this.revealAmount : 0;
  }
  get outlineMeshes(): readonly pc.MeshInstance[] {
    return this.meshes;
  }
  hit(from: pc.Vec3, to: pc.Vec3): number | null {
    // Retain the pilot's per-part conservative picking. Picking proposes an
    // entity; the scene still rejects world-obscured/unidentifiable targets.
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
      representation: 'authored-voxels',
      cellSize: 0.025,
      height: this.height,
      meshes: this.meshes.length,
      stride: this.stride,
      phase: this.phase,
    };
  }
  private release(): void {
    for (const binding of this.bindings) this.presentation.removeReveal(binding);
    this.bindings = [];
    this.node?.destroy();
    this.node = undefined;
    this.parts.clear();
    this.meshes = [];
    this.visible = false;
  }
  destroy(): void {
    this.disposed = true;
    this.release();
  }
}
