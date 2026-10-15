import * as pc from 'playcanvas';
import type { EntityView } from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import modelUrl from './mercenary-assets/mercenary-sculpted.glb?url';
import modelArt from './mercenary-assets/mercenary-sculpted-provenance.json';
import { WorldPresentation, type RevealBinding } from '../world-presentation';
import { personStencil, setVisibilityStencil } from '../visibility-stencil';
import { ModelSurfaceDepth } from './model-surface-depth';

function isContainer(value: unknown): value is pc.ContainerResource {
  return (
    typeof value === 'object' &&
    value !== null &&
    'instantiateRenderEntity' in value &&
    typeof value.instantiateRenderEntity === 'function'
  );
}

/** Scene-owned immutable art. The earlier sampled model remains in mercenary.ts.
 * docs/projects/completed/mercenary-voxel-iteration.md */
export class VoxelMercenaryModels {
  private asset?: pc.Asset;
  private pending?: Promise<pc.ContainerResource>;
  private disposed = false;
  readonly material = new pc.StandardMaterial();
  constructor(
    private readonly app: pc.Application,
    private readonly presentation: WorldPresentation,
    private readonly camera: pc.Entity,
  ) {
    this.material.name = 'Authored mercenary block colors';
    this.material.diffuse.set(1, 1, 1);
    this.material.diffuseVertexColor = true;
    // Blender/glTF COLOR_0 is linear in the pinned engine. Lighting changes
    // whole authored faces, never their placement or palette assignment.
    this.material.specular.set(0, 0, 0);
    this.material.gloss = 0;
    setVisibilityStencil(this.material, personStencil);
    ModelSurfaceDepth.prepareMaterial(this.material, app.graphicsDevice);
    this.material.update();
  }
  create(parent: pc.Entity): VoxelMercenaryActor {
    return new VoxelMercenaryActor(
      parent,
      this.presentation,
      this.material,
      this.load(),
      this.app,
      this.camera,
    );
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
type LegName = 'leftThigh' | 'rightThigh';
interface LegRest {
  neutralY: number;
  hipHeight: number;
  kneeY: number;
  kneeZ: number;
  soleY: number;
  minZ: number;
  maxZ: number;
}
// Upright geometry is foreshortened at the ordinary pitched game camera; the
// comparison sprites face that camera. A fixed art scale matches normal play
// without resizing cells during zoom or orbit. Native body dimensions do not change.
const displayScale = 1.4;

/** Blocks are permanent mesh faces; walking moves rigid parts without resampling
 * or deforming their cells. Native movement remains the only position authority. */
export class VoxelMercenaryActor {
  private node?: pc.Entity;
  private readonly parts = new Map<PartName, pc.GraphNode>();
  private readonly legs = new Map<LegName, LegRest>();
  private meshes: pc.MeshInstance[] = [];
  private bindings: RevealBinding[] = [];
  private surface?: ModelSurfaceDepth;
  private disposed = false;
  private wanted = false;
  private yaw?: number;
  private phase = 0;
  private stride = 0;
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  readonly height = modelArt.heightMetres * displayScale;
  readonly width = modelArt.widthMetres * displayScale;
  constructor(
    private readonly parent: pc.Entity,
    private readonly presentation: WorldPresentation,
    private readonly material: pc.StandardMaterial,
    loading: Promise<pc.ContainerResource>,
    private readonly app: pc.Application,
    private readonly camera: pc.Entity,
  ) {
    void loading
      .then((resource) => {
        if (this.disposed) return;
        const node = (this.node = resource.instantiateRenderEntity({
          castShadows: true,
          receiveShadows: true,
        }));
        node.enabled = false;
        node.setLocalScale(displayScale, displayScale, displayScale);
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
        this.prepareLeg('leftThigh', 'leftShin');
        this.prepareLeg('rightThigh', 'rightShin');
        this.surface = new ModelSurfaceDepth(this.app, this.camera, this.meshes);
        for (const binding of this.bindings)
          for (const mesh of [...binding.meshes, ...(binding.protection ?? [])])
            this.surface.bind(mesh);
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
      this.surface?.setEnabled(false);
      for (const binding of this.bindings)
        this.presentation.updateReveal(
          binding,
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
      this.poseLeg('leftThigh', swing * 18);
      this.poseLeg('rightThigh', -swing * 18);
      this.parts.get('leftShin')?.setLocalEulerAngles(Math.max(0, -swing) * 12, 0, 0);
      this.parts.get('rightShin')?.setLocalEulerAngles(Math.max(0, swing) * 12, 0, 0);
      this.parts.get('leftUpperArm')?.setLocalEulerAngles(-swing * 12, 0, 0);
      this.parts.get('rightUpperArm')?.setLocalEulerAngles(swing * 12, 0, 0);
      this.parts.get('leftForearm')?.setLocalEulerAngles(-Math.abs(swing) * 5, 0, 0);
      this.parts.get('rightForearm')?.setLocalEulerAngles(-Math.abs(swing) * 5, 0, 0);
    }
    for (const binding of this.bindings) {
      this.presentation.updateReveal(
        binding,
        this.material,
        this.parent.getPosition(),
        this.width,
        this.height,
        reveal,
        dt,
        true,
        selected,
      );
      for (const mesh of binding.foreground ?? []) this.surface?.bind(mesh);
    }
    // The depth must stay current while read-through fades out, including
    // camera movement after its requested strength has already become zero.
    this.surface?.setEnabled(selected || (this.bindings[0]?.strength ?? 0) > 0.01);
  }
  get revealStrength(): number {
    return this.visible ? (this.bindings[0]?.strength ?? 0) : 0;
  }
  private prepareLeg(name: LegName, shinName: PartName): void {
    const thigh = this.parts.get(name);
    const shin = this.parts.get(shinName);
    if (!thigh || !shin) throw new Error('Authored mercenary leg missing');
    const toShin = shin.getWorldTransform().clone().invert();
    const transform = new pc.Mat4();
    const bound = new pc.BoundingBox();
    const sole = new pc.BoundingBox();
    let found = false;
    for (const mesh of this.meshes) {
      if (mesh.node !== shin && !mesh.node.isDescendantOf(shin)) continue;
      transform.mul2(toShin, mesh.node.getWorldTransform());
      bound.setFromTransformedAabb(mesh.mesh.aabb, transform);
      if (found) sole.add(bound);
      else sole.copy(bound);
      found = true;
    }
    if (!found) throw new Error(`Authored mercenary sole missing: ${shinName}`);
    const knee = shin.getLocalPosition();
    const min = sole.getMin();
    const max = sole.getMax();
    // Capture rest geometry once, before heading/pose. Dividing the hip's
    // height above the gameplay foot removes only the fixed display scale;
    // the shin-local bounds already exclude parent placement and scale.
    this.legs.set(name, {
      neutralY: thigh.getLocalPosition().y,
      hipHeight: (thigh.getPosition().y - this.parent.getPosition().y) / displayScale,
      kneeY: knee.y,
      kneeZ: knee.z,
      soleY: min.y,
      minZ: min.z,
      maxZ: max.z,
    });
  }
  private poseLeg(name: LegName, degrees: number): void {
    const part = this.parts.get(name);
    const rest = this.legs.get(name);
    if (!part || !rest) return;
    part.setLocalEulerAngles(degrees, 0, 0);
    const thigh = degrees * pc.math.DEG_TO_RAD;
    const shin = thigh + Math.max(0, -thigh) * (2 / 3);
    // These bounded walk angles keep cosine positive, so the lowest sole
    // corner uses its minimum Y and the heel/toe selected by sine's sign.
    const soleZ = Math.sin(shin) > 0 ? rest.maxZ : rest.minZ;
    const kneeY = Math.cos(thigh) * rest.kneeY - Math.sin(thigh) * rest.kneeZ;
    const soleY = Math.cos(shin) * rest.soleY - Math.sin(shin) * soleZ;
    const lift = Math.max(0, -rest.hipHeight - kneeY - soleY);
    const position = part.getLocalPosition();
    part.setLocalPosition(position.x, rest.neutralY + lift, position.z);
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
      cellSize: modelArt.cellSizeMetres * displayScale,
      height: this.height,
      meshes: this.meshes.length,
      stride: this.stride,
      phase: this.phase,
    };
  }
  private release(): void {
    for (const binding of this.bindings) this.presentation.removeReveal(binding);
    this.bindings = [];
    this.surface?.destroy();
    this.surface = undefined;
    this.node?.destroy();
    this.node = undefined;
    this.parts.clear();
    this.legs.clear();
    this.meshes = [];
    this.visible = false;
  }
  destroy(): void {
    this.disposed = true;
    this.release();
  }
}
