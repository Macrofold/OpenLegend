import * as pc from 'playcanvas';
import { BundledModels } from './bundled-models';
import generatedChestUrl from './props/generated-chest.glb?url';
import { ArtMaterials } from './art-treatment';
import { studyAssets } from './study-assets';
import carved from './props/art-study/source-chests/chest-carved-lid.glb?url';
import banded from './props/art-study/source-chests/chest-banded-lid.glb?url';
import cache from './props/art-study/source-chests/chest-plank-cache.glb?url';
import { ShadowMaterial } from './shadow-material';
import { ordinaryStencil, setVisibilityStencil } from './visibility-stencil';

interface PropSource {
  url: string;
  width: number;
  height: number;
  depth: number;
  depletedUrl?: string;
}
const sources = new Map<string, PropSource>([
  ['generated', { url: generatedChestUrl, width: 1, height: 1, depth: 1 }],
  ...Object.entries({ carved, banded, cache }).map(
    ([key, url]) => [key, { url, width: 1, height: 0.8, depth: 0.8 }] as [string, PropSource],
  ),
]);
for (const [key, asset] of studyAssets) if (!asset.animationUrl) sources.set(key, asset);
export const propDimensions = (appearance: string) => sources.get(appearance);

/** Offline prepared props. The scene owns fallback, reveal and semantic picking;
 * source materials retain their authored wood, cloth and metal distinctions. */
export class ScenePropResources {
  private readonly models: BundledModels;
  private disposed = false;
  private readonly prepared = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly actors = new Set<ScenePropActor>();
  constructor(
    private readonly app: pc.Application,
    private readonly art: ArtMaterials,
    private readonly sun?: pc.Light,
  ) {
    this.models = new BundledModels(app);
  }

  create(
    parent: pc.Entity,
    width: number,
    height: number,
    depth: number,
    variant: string = 'generated',
    depleted = false,
    onReady?: (actor: ScenePropActor) => void,
  ): ScenePropActor {
    const source = sources.get(variant)!;
    const actor: ScenePropActor = new ScenePropActor(
      parent,
      width / source.width,
      height / source.height,
      depth / source.depth,
      this.models.load(
        'Scene prop · ' + variant,
        depleted && source.depletedUrl ? source.depletedUrl : source.url,
      ),
      (material) => this.prepare(material),
      () => this.actors.delete(actor),
      onReady,
    );
    this.actors.add(actor);
    return actor;
  }

  private prepare(source: pc.StandardMaterial): pc.StandardMaterial {
    const existing = this.prepared.get(source);
    if (existing) return existing;
    const material = new ShadowMaterial(this.sun).copy(source);
    setVisibilityStencil(material, ordinaryStencil);
    this.art.prepare(material);
    material.update();
    this.prepared.set(source, material);
    return material;
  }

  /** Release any WorldPresentation cached copies before destroying this owner. */
  get materials(): readonly pc.StandardMaterial[] {
    return [...this.prepared.values()];
  }

  destroy(): Promise<void> | undefined {
    if (this.disposed) return;
    this.disposed = true;
    for (const actor of [...this.actors]) actor.destroy();
    for (const material of this.prepared.values()) material.destroy();
    this.prepared.clear();
    return this.models.destroy();
  }
}

export class ScenePropActor {
  readonly ready: Promise<boolean>;
  readonly meshes: pc.MeshInstance[] = [];
  state: 'loading' | 'ready' | 'failed' = 'loading';
  visible = false;
  private node?: pc.Entity;
  private wanted = false;
  private disposed = false;
  get root(): pc.Entity | undefined {
    return this.node;
  }
  constructor(
    parent: pc.Entity,
    width: number,
    height: number,
    depth: number,
    loaded: Promise<pc.ContainerResource>,
    prepare: (source: pc.StandardMaterial) => pc.StandardMaterial,
    private readonly release: () => void,
    onReady?: (actor: ScenePropActor) => void,
  ) {
    this.ready = loaded
      .then((resource) => {
        if (this.disposed) return false;
        const node = (this.node = resource.instantiateRenderEntity({
          castShadows: true,
          receiveShadows: true,
        }));
        node.setLocalScale(width, height, depth);
        node.enabled = false;
        parent.addChild(node);
        for (const component of node.findComponents('render')) {
          if (!(component instanceof pc.RenderComponent)) continue;
          for (const instance of component.meshInstances) {
            if (instance.material instanceof pc.StandardMaterial)
              instance.material = prepare(instance.material);
            this.meshes.push(instance);
          }
        }
        if (this.meshes.length === 0) throw new Error('Scene prop contains no render meshes.');
        this.state = 'ready';
        this.setVisible(this.wanted);
        return true;
      })
      .catch((error: unknown) => {
        if (!this.disposed) {
          this.node?.destroy();
          this.node = undefined;
          this.meshes.length = 0;
          this.state = 'failed';
          this.visible = false;
          console.warn('Scene prop unavailable; keeping its authored fallback.', error);
        }
        return false;
      })
      .then((installed) => {
        if (!installed || this.disposed) return false;
        onReady?.(this);
        return true;
      });
  }

  setVisible(visible: boolean): void {
    this.wanted = visible;
    this.visible = !this.disposed && this.state === 'ready' && visible;
    if (this.node) this.node.enabled = this.visible;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.visible = false;
    this.node?.destroy();
    this.node = undefined;
    this.meshes.length = 0;
    this.release();
  }
}
