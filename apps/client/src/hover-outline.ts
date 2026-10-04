import * as pc from 'playcanvas';
import { outsidePeopleStencil } from './visibility-stencil';

/** A single delayed hover silhouette, using the same alpha/pose as world presentation.
 * Materials are private copies: outline rendering must not replace the world's shader hooks.
 * docs/world-presentation.md#selection-and-hover */
export class HoverOutline extends pc.OutlineRenderer {
  private readonly blendLayer: pc.Layer;
  private readonly copies: pc.MeshInstance[] = [];
  private readonly materials = new Map<pc.Material, pc.Material>();
  private sources: readonly pc.MeshInstance[] = [];
  private readonly white = new Float32Array([1, 1, 1]);
  private amount = 0;
  private protectPeople = true;
  constructor(
    app: pc.Application,
    private readonly camera: pc.Entity,
  ) {
    const maskLayer = new pc.Layer({ name: 'Hover silhouette mask' });
    super(app, maskLayer);
    app.scene.layers.insert(maskLayer, 0);
    this.blendLayer = new pc.Layer({ name: 'Hover outline' });
    const immediate = app.scene.layers.getLayerById(pc.LAYERID_IMMEDIATE)!;
    app.scene.layers.insert(this.blendLayer, app.scene.layers.getOpaqueIndex(immediate));
    camera.camera!.layers = [...camera.camera!.layers, this.blendLayer.id];
    this.outlineCameraEntity.enabled = false;
    this.quadRenderer.destroy();
    this.shaderBlend = pc.ShaderUtils.createShader(app.graphicsDevice, {
      uniqueName: 'Fading hover outline',
      attributes: { vertex_position: pc.SEMANTIC_POSITION },
      vertexChunk: 'fullscreenQuadVS',
      fragmentGLSL: `
        varying vec2 vUv0;
        uniform sampler2D source;
        uniform float hoverFade;
        void main(void) {
          float edge = texture2D(source, vUv0).a;
          gl_FragColor = vec4(1.8, 1.45, 0.65, edge * hoverFade);
        }`,
    });
    this.quadRenderer = new pc.QuadRender(this.shaderBlend);
  }
  private material(source: pc.Material): pc.Material {
    let material = this.materials.get(source);
    if (!material) {
      material = source.clone();
      material.stencilFront = material.stencilBack = null;
      material.depthFunc = pc.FUNC_LESSEQUAL;
      material.depthWrite = true;
      material.blendType = pc.BLEND_NONE;
      if (material instanceof pc.StandardMaterial) {
        material.opacityDither = pc.DITHER_NONE;
        material.useLighting = false;
        material.onUpdateShader = undefined;
      } else if (material instanceof pc.ShaderMaterial) {
        // The character composite owns this supported mask branch and its depth.
        material.setParameter('characterOutline', 1);
      }
      material.update();
      this.materials.set(source, material);
    }
    return material;
  }
  update(sources: readonly pc.MeshInstance[], amount: number, protectPeople: boolean): void {
    const changed =
      sources.length !== this.sources.length || sources.some((mesh, i) => mesh !== this.sources[i]);
    if (changed) {
      this.clearTarget();
      this.sources = sources.slice();
      for (const source of sources) {
        const mesh = new pc.MeshInstance(source.mesh, this.material(source.material), source.node);
        mesh.cull = source.cull;
        mesh.castShadow = mesh.receiveShadow = false;
        mesh.skinInstance = source.skinInstance;
        mesh.morphInstance = source.morphInstance;
        this.copies.push(mesh);
      }
      this.renderingLayer.addMeshInstances(this.copies, true);
    }
    this.amount = amount;
    this.protectPeople = protectPeople;
    this.outlineCameraEntity.enabled = sources.length > 0 && amount > 0;
    if (!this.outlineCameraEntity.enabled) return;
    for (let i = 0; i < this.copies.length; i++) {
      const mesh = this.copies[i]!;
      const source = sources[i]!;
      if (mesh.mesh !== source.mesh) mesh.mesh = source.mesh;
      mesh.material = this.material(source.material);
      mesh.setParameter('pcOutlineColor', this.white);
      for (const name in source.parameters) mesh.setParameter(name, source.parameters[name]!.data);
    }
    this.frameUpdate(this.camera, this.blendLayer, true);
  }
  override blendOutlines(): void {
    const device = this.app.graphicsDevice;
    device.scope.resolve('source').setValue(this.rt.colorBuffer);
    device.scope.resolve('hoverFade').setValue(this.amount);
    const stencil = this.protectPeople ? outsidePeopleStencil : undefined;
    device.setDrawStates(this.blendState, undefined, undefined, undefined, stencil, stencil);
    this.quadRenderer.render();
  }
  private clearTarget(): void {
    this.renderingLayer.removeMeshInstances(this.copies, true);
    for (const mesh of this.copies) {
      mesh.skinInstance = null;
      mesh.morphInstance = null;
      mesh.destroy();
    }
    this.copies.length = 0;
    this.sources = [];
    for (const material of this.materials.values()) material.destroy();
    this.materials.clear();
  }
  override destroy(): void {
    this.clearTarget();
    this.camera.camera!.layers = this.camera.camera!.layers.filter(
      (id) => id !== this.blendLayer.id,
    );
    this.app.scene.layers.remove(this.renderingLayer);
    this.app.scene.layers.remove(this.blendLayer);
    super.destroy();
  }
}
