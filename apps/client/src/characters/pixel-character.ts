import * as pc from 'playcanvas';
import {
  personStencil,
  characterReadThroughStencil,
  setVisibilityStencil,
} from '../visibility-stencil';

class CharacterPass extends pc.RenderPass {
  constructor(
    device: pc.GraphicsDevice,
    private readonly draw: () => void,
    private readonly prepare: () => void,
  ) {
    super(device);
  }
  override frameUpdate(): void {
    super.frameUpdate();
    this.prepare();
  }
  override execute(): void {
    this.draw();
  }
}

/** A live model sampled at a fixed character resolution. Cropping changes only clip X/Y:
 * each color pixel retains the model's original world-camera depth, not a billboard depth.
 * docs/projects/completed/mercenary-scene-pilot.md#fixed-character-pixels-and-default-npc--authorized-follow-up */
export class PixelCharacter {
  readonly layer = new pc.Layer({ name: 'Character pixels' });
  private readonly pass: CharacterPass;
  private readonly clusters: pc.WorldClusters;
  private readonly color: pc.Texture;
  private readonly depth: pc.Texture;
  private readonly target: pc.RenderTarget;
  private readonly quad: pc.Mesh;
  private readonly node = new pc.GraphNode('Character pixel composite');
  private readonly material: pc.ShaderMaterial;
  private readonly revealMaterial: pc.ShaderMaterial;
  private readonly image: pc.MeshInstance;
  private readonly outlineSources: readonly pc.MeshInstance[];
  private readonly reveal: pc.MeshInstance;
  private readonly foreground: pc.MeshInstance;
  private readonly foregroundMaterial: pc.ShaderMaterial;
  private readonly protection: pc.MeshInstance;
  private readonly protectionMaterial: pc.ShaderMaterial;
  private readonly rect = new Float32Array(4);
  private readonly projection = new pc.Mat4();
  private readonly crop = new pc.Mat4();
  private readonly center = new pc.Vec3();
  private readonly top = new pc.Vec3();
  private readonly screen = new pc.Vec3();
  private readonly screenTop = new pc.Vec3();
  private readonly lights = new Set<pc.LightComponent>();
  private readonly casters: pc.MeshInstance[];
  private readonly world: pc.Layer;
  constructor(
    private readonly app: pc.Application,
    private readonly worldCamera: pc.Entity,
    private readonly revealLayer: pc.Layer,
    private readonly foregroundLayer: pc.Layer,
    private readonly protectionLayer: pc.Layer,
    components: pc.RenderComponent[],
  ) {
    const device = app.graphicsDevice;
    this.world = app.scene.layers.getLayerById(pc.LAYERID_WORLD)!;
    app.scene.layers.insert(this.layer, 0);
    const texture = (name: string, format: number) =>
      new pc.Texture(device, {
        name,
        width: 128,
        height: 192,
        format,
        mipmaps: false,
        minFilter: pc.FILTER_NEAREST,
        magFilter: pc.FILTER_NEAREST,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE,
      });
    this.color = texture('Character color 128x192', pc.PIXELFORMAT_RGBA16F);
    this.depth = texture('Character depth 128x192', pc.PIXELFORMAT_DEPTH);
    this.target = new pc.RenderTarget({
      colorBuffer: this.color,
      depthBuffer: this.depth,
      samples: 1,
    });
    this.clusters = new pc.WorldClusters(device);
    this.pass = new CharacterPass(
      device,
      () => this.render(),
      () => {
        this.app.renderer.culler.requestMeshInstanceCull(
          this.worldCamera.camera!.camera,
          this.layer,
        );
      },
    );
    this.pass.init(this.target);
    this.pass.setClearColor(new pc.Color(0, 0, 0, 0));
    this.pass.setClearDepth(1);
    // The pinned engine runs camera before-passes after its directional shadows.
    // Use that same camera's shadow data instead of rendering the entire shadow map twice.
    this.worldCamera.camera!.camera.beforePasses.push(this.pass);
    this.casters = components.flatMap((c) => c.meshInstances);
    for (const component of components) component.layers = [this.layer.id];
    // Real geometry casts into the world's light passes but is absent from its color pass.
    this.world.addShadowCasters(this.casters);
    this.quad = new pc.Mesh(device);
    this.quad.setPositions([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    this.quad.setIndices([0, 1, 2, 0, 2, 3]);
    this.quad.update();
    this.material = new pc.ShaderMaterial({
      uniqueName: 'Depth-aware character pixels',
      attributes: { aPosition: pc.SEMANTIC_POSITION },
      vertexGLSL: `attribute vec3 aPosition;
        uniform vec4 characterRect;
        varying vec2 characterUV;
        void main(void) {
          characterUV = aPosition.xy * .5 + .5;
          gl_Position = vec4(characterRect.xy + aPosition.xy * characterRect.zw, 0.0, 1.0);
        }`,
      fragmentGLSL: `precision highp float;
        uniform sampler2D characterColor;
        uniform sampler2D characterDepth;
        uniform float characterOpacity;
        uniform float characterOutline;
        varying vec2 characterUV;
        void main(void) {
          vec4 color = texture2D(characterColor, characterUV);
          float depth = texture2D(characterDepth, characterUV).r;
          if (color.a < .5 || depth >= 1.0) discard;
          gl_FragDepth = depth;
          gl_FragColor = characterOutline > .5 ? vec4(1.0) : vec4(color.rgb, color.a * characterOpacity);
        }`,
    });
    this.material.cull = pc.CULLFACE_NONE;
    this.material.depthWrite = true;
    setVisibilityStencil(this.material, personStencil);
    this.material.setParameter('characterRect', this.rect);
    this.material.setParameter('characterColor', this.color);
    this.material.setParameter('characterDepth', this.depth);
    this.material.setParameter('characterOpacity', 1);
    this.material.setParameter('characterOutline', 0);
    this.revealMaterial = this.material.clone();
    this.revealMaterial.depthFunc = pc.FUNC_GREATER;
    this.revealMaterial.depthWrite = false;
    this.revealMaterial.blendType = pc.BLEND_NORMAL;
    setVisibilityStencil(this.revealMaterial, characterReadThroughStencil);
    this.protectionMaterial = this.revealMaterial.clone();
    this.protectionMaterial.redWrite =
      this.protectionMaterial.greenWrite =
      this.protectionMaterial.blueWrite =
      this.protectionMaterial.alphaWrite =
        false;
    this.foregroundMaterial = this.material.clone();
    this.foregroundMaterial.depthFunc = pc.FUNC_ALWAYS;
    this.foregroundMaterial.depthWrite = false;
    this.foregroundMaterial.stencilFront = this.foregroundMaterial.stencilBack = null;
    this.image = new pc.MeshInstance(this.quad, this.material, this.node);
    this.outlineSources = [this.image];
    this.reveal = new pc.MeshInstance(this.quad, this.revealMaterial, this.node);
    this.foreground = new pc.MeshInstance(this.quad, this.foregroundMaterial, this.node);
    this.protection = new pc.MeshInstance(this.quad, this.protectionMaterial, this.node);
    for (const mesh of [this.image, this.reveal, this.foreground, this.protection]) {
      mesh.cull = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
    this.world.addMeshInstances([this.image], true);
    revealLayer.addMeshInstances([this.reveal], true);
    foregroundLayer.addMeshInstances([this.foreground], true);
    protectionLayer.addMeshInstances([this.protection], true);
    this.setVisible(false);
  }
  setVisible(value: boolean): void {
    this.pass.enabled = value;
    this.image.visible = value;
    this.reveal.visible = false;
    this.foreground.visible = false;
    this.protection.visible = false;
  }
  get outlineMeshes(): readonly pc.MeshInstance[] {
    return this.outlineSources;
  }
  update(foot: pc.Vec3, visible: boolean, reveal: number, selected: boolean): void {
    const camera = this.worldCamera.camera!;
    this.center.copy(foot).y += 0.95;
    const distance = this.top
      .sub2(this.center, this.worldCamera.getPosition())
      .dot(this.worldCamera.forward);
    if (!visible || distance <= camera.nearClip) {
      this.setVisible(false);
      return;
    }
    // A fixed world-space window gives the same character texel density at every zoom.
    // Match the main projection exactly rather than creating a second viewing angle.
    this.top.copy(this.worldCamera.up).mulScalar(1.4).add(this.center);
    camera.worldToScreen(this.center, this.screen);
    camera.worldToScreen(this.top, this.screenTop);
    const device = this.app.graphicsDevice;
    const height = Math.abs(this.screenTop.y - this.screen.y) * 2;
    const width = (height * 128) / 192;
    this.rect[0] = (this.screen.x / device.width) * 2 - 1;
    this.rect[1] = 1 - (this.screen.y / device.height) * 2;
    this.rect[2] = width / device.width;
    this.rect[3] = height / device.height;
    this.crop.setIdentity();
    const m = this.crop.data;
    m[0] = 1 / this.rect[2]!;
    m[5] = 1 / this.rect[3]!;
    m[12] = -this.rect[0]! / this.rect[2]!;
    m[13] = -this.rect[1]! / this.rect[3]!;
    this.projection.mul2(this.crop, camera.projectionMatrix);
    for (const component of this.app.root.findComponents('light')) {
      if (!(component instanceof pc.LightComponent) || this.lights.has(component)) continue;
      component.layers = [...component.layers, this.layer.id];
      this.lights.add(component);
    }
    this.setVisible(true);
    this.reveal.visible = !selected && reveal > 0.001;
    this.protection.visible = this.reveal.visible;
    this.foreground.visible = selected;
    this.revealMaterial.setParameter('characterOpacity', reveal);
    this.protectionMaterial.setParameter('characterOpacity', reveal);
  }
  private render(): void {
    const component = this.worldCamera.camera!;
    const projection = component.calculateProjection;
    const gamma = component.gammaCorrection;
    const tone = component.toneMapping;
    this.clusters.update(this.world.clusteredLightsSet, this.app.scene.lighting);
    component.calculateProjection = (matrix: pc.Mat4) => matrix.copy(this.projection);
    component.gammaCorrection = pc.GAMMA_NONE;
    component.toneMapping = pc.TONEMAP_NONE;
    try {
      this.app.renderer.renderForwardLayer(
        component.camera,
        this.target,
        this.layer,
        false,
        pc.SHADER_FORWARD,
        {
          lightClusters: this.clusters,
        },
      );
    } finally {
      component.calculateProjection = projection;
      component.gammaCorrection = gamma;
      component.toneMapping = tone;
    }
  }
  destroy(): void {
    this.world.removeShadowCasters(this.casters);
    this.world.removeMeshInstances([this.image], true);
    this.revealLayer.removeMeshInstances([this.reveal], true);
    this.foregroundLayer.removeMeshInstances([this.foreground], true);
    this.protectionLayer.removeMeshInstances([this.protection], true);
    const passes = this.worldCamera.camera!.camera.beforePasses;
    const index = passes.indexOf(this.pass);
    if (index >= 0) passes.splice(index, 1);
    this.pass.destroy();
    this.clusters.destroy();
    for (const light of this.lights)
      if (light.entity.light === light)
        light.layers = light.layers.filter((id) => id !== this.layer.id);
    this.lights.clear();
    this.app.scene.layers.remove(this.layer);
    this.image.destroy();
    this.reveal.destroy();
    this.foreground.destroy();
    this.protection.destroy();
    this.material.destroy();
    this.revealMaterial.destroy();
    this.foregroundMaterial.destroy();
    this.protectionMaterial.destroy();
    this.target.destroy();
    this.color.destroy();
    this.depth.destroy();
  }
}
