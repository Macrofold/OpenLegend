import * as pc from 'playcanvas';
import type { ArtTreatment } from './art-treatment';
import { PixelEffects } from './pixel-effects';
import { ScenePixels } from './scene-pixels';
import type { GameView } from '@open-legend/protocol';
import { sunlightAtHour } from './sunlight';
import type { ShadowQuality } from './world-renderer';
import { ShadowMaterial, shadowSettings, type ShaderVariantParameters } from './shadow-material';
import type { HoverOutline } from './hover-outline';
import {
  characterReadThroughStencil,
  readThroughStencil,
  setVisibilityStencil,
} from './visibility-stencil';

type CameraTargetImplementation = {
  _glMsaaDepthBuffer: WebGLRenderbuffer | null;
  msaaDepthBufferKey?: string;
  destroy(device: pc.GraphicsDevice): void;
};

const SUNLIGHT_INTERPOLATION_SECONDS = 0.05;

/** Renderer-only approximations. Mechanical bodies, hearing and sight never use these shaders.
 * docs/world-presentation.md#sprite-lighting
 */
const litSprites = new WeakSet<pc.StandardMaterial>();
export function lightSprite(material: pc.StandardMaterial, device: pc.GraphicsDevice): void {
  if (litSprites.has(material)) return;
  litSprites.add(material);
  material.twoSidedLighting = true;
  material.specular.set(0, 0, 0);
  // Painted fronts use a two-sided response: bias toward each light, including
  // lights behind the displayed card. Retain the pinned engine's filtering and
  // atlas code; only orient its normal-offset term for these sprite materials.
  const chunks = pc.ShaderChunks.get(device);
  for (const name of ['lightFunctionShadowPS', 'clusteredLightShadowsPS']) {
    const suffix = name === 'clusteredLightShadowsPS' ? ' * clamp' : '';
    material.shaderChunks.glsl.set(
      name,
      chunks
        .get(name)!
        .replaceAll(
          `normal * shadowParams.y${suffix}`,
          `faceforward(normal, lightDirNorm, normal) * shadowParams.y${suffix}`,
        ),
    );
  }
  material.shaderChunks.glsl.set(
    'normalMapPS',
    `
    #ifdef OL_INSTANCED_SPRITE
      varying vec3 ol_spriteFoot;
      varying vec2 ol_spriteSize;
    #else
      uniform vec3 ol_spriteFoot;
      uniform vec2 ol_spriteSize;
    #endif
    void getNormal() {
      vec2 uv = {STD_DIFFUSE_TEXTURE_UV};
      float across = uv.x * 2.0 - 1.0;
      vec3 outward = normalize(vec3(dVertexNormalW.x, 0.0, dVertexNormalW.z));
      vec3 relative = vPositionW - ol_spriteFoot;
      relative.y = (relative.y - ol_spriteSize.y * 0.5) * 0.35;
      // A rounded virtual body, rather than lighting the entire image as a rotating flat sheet.
      relative += outward * ol_spriteSize.x * 0.5 * sqrt(max(0.08, 1.0 - across * across));
      dNormalW = normalize(relative);
      // Shadow bias uses the upright sheet, not the camera-pitched display normal.
      dVertexNormalW = outward;
    }
  `,
  );
  material.shaderChunks.glsl.set(
    'lightDiffuseLambertPS',
    `
    float getLightDiffuse(vec3 worldNormal, vec3 viewDir, vec3 lightDirNorm) {
      return max((dot(worldNormal, -lightDirNorm) + 0.25) / 1.25, 0.0);
    }
  `,
  );
  material.update();
}

export interface RevealBinding {
  sourceMeshes: readonly pc.MeshInstance[];
  sourceMaterials?: pc.StandardMaterial[];
  meshes: pc.MeshInstance[];
  strength: number;
  frame: pc.StandardMaterial;
  center: Float32Array;
  size: Float32Array;
  foot: Float32Array;
  spriteSize: Float32Array;
  lastStrength: number;
  layer: pc.Layer;
  foreground?: pc.MeshInstance[];
  protection?: pc.MeshInstance[];
  preparedMaterials: WeakSet<pc.StandardMaterial>;
}
interface PreparedVariant {
  mesh: pc.MeshInstance;
  layer: pc.Layer;
  pass?: number;
  camera?: pc.CameraComponent;
}

/** Only hidden fragments of currently authorized targets are drawn. This is the compositing
 * equivalent of fading the obstruction over that silhouette, without opening a hole onto
 * unknown objects behind it. It needs no per-target/per-occluder CPU raycast matrix.
 * docs/world-presentation.md#local-read-through
 */
export class WorldPresentation {
  private survivalAtmosphere = false;
  readonly layer: pc.Layer;
  readonly characterLayer: pc.Layer;
  readonly foregroundLayer: pc.Layer;
  readonly protectionLayer: pc.Layer;
  private revealMaterials = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private foregroundMaterials = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private protectionMaterials = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly variantPreparations = new Map<
    ShadowMaterial,
    {
      layouts: Map<string, PreparedVariant[]>;
      requested: WeakSet<pc.Shader>;
    }
  >();
  private readonly interactionMeshes = new Set<pc.MeshInstance>();
  private hover?: HoverOutline;
  private spriteRevealMesh?: pc.Mesh;
  private readonly lights: pc.Entity[] = [];
  private readonly selectedLights = new Set<string>();
  private readonly sunDirection = new pc.Vec3();
  private readonly sunRotation = new pc.Quat();
  private sunlightSample?: {
    worldId: string;
    saveTimeline?: string;
    scope?: string;
    clock: GameView['clock'];
  };
  private sunlightSeconds = 0;
  private sunlightFromSeconds = 0;
  private sunlightElapsed = 0;
  private readonly updateSunlight = (dt: number): void => {
    const clock = this.sunlightSample?.clock;
    if (!clock || this.sunlightSeconds === clock.seconds) return;
    this.sunlightElapsed = Math.min(SUNLIGHT_INTERPOLATION_SECONDS, this.sunlightElapsed + dt);
    this.sunlightSeconds =
      this.sunlightElapsed === SUNLIGHT_INTERPOLATION_SECONDS
        ? clock.seconds
        : this.sunlightFromSeconds +
          (clock.seconds - this.sunlightFromSeconds) *
            (this.sunlightElapsed / SUNLIGHT_INTERPOLATION_SECONDS);
    this.applySunlight();
  };
  private shadowQuality?: ShadowQuality;
  private readonly frame: pc.CameraFrame;
  private readonly preparedTargets = new WeakSet<pc.RenderTarget>();
  private readonly preparedImplementations = new WeakSet<CameraTargetImplementation>();
  private readonly pixels: ScenePixels;
  private readonly updatePixels = (): void => this.pixels.update();
  private effects?: PixelEffects;
  private readonly effectSources = new Set<pc.RenderComponent>();
  constructor(
    private app: pc.Application,
    private camera: pc.Entity,
    private sun: pc.Entity,
  ) {
    this.layer = new pc.Layer({ name: 'Authorized read-through' });
    this.characterLayer = new pc.Layer({ name: 'Character read-through' });
    this.foregroundLayer = new pc.Layer({ name: 'Selected foreground' });
    this.protectionLayer = new pc.Layer({ name: 'Protected character silhouettes' });
    // CameraFrame composites through Immediate, then renders later layers onto
    // the output target without world depth. Reveal needs the original depth.
    const immediate = app.scene.layers.getLayerById(pc.LAYERID_IMMEDIATE)!;
    for (const layer of [
      this.protectionLayer,
      this.layer,
      this.characterLayer,
      this.foregroundLayer,
    ]) {
      app.scene.layers.insert(layer, app.scene.layers.getOpaqueIndex(immediate));
      camera.camera!.layers = [...camera.camera!.layers, layer.id];
      sun.light!.layers = [...sun.light!.layers, layer.id];
    }
    this.setShadowQuality('economy');
    // Angular spread, not a world-space blur radius: large values make the
    // blocker search miss small bodies. Keep the sun close to a small disk.
    sun.light!.penumbraSize = 0.015;
    // Each filter sample blends four depth comparisons. Eight samples retain
    // soft penumbras without quadrupling the previous 16-point filter's reads.
    sun.light!.shadowSamples = 8;
    sun.light!.shadowBlockerSamples = 16;
    this.frame = new pc.CameraFrame(app, camera.camera!);
    const updateFrame = this.frame.update.bind(this.frame);
    this.frame.update = () => {
      updateFrame();
      this.prepareCameraTarget();
    };
    this.frame.rendering.stencil = true;
    this.frame.rendering.toneMapping = pc.TONEMAP_ACES;
    this.frame.bloom.intensity = 0.025;
    this.frame.bloom.blurLevel = 3;
    this.frame.grading.enabled = true;
    this.frame.grading.saturation = 1.05;
    this.frame.update();
    this.pixels = new ScenePixels(app.graphicsDevice, camera.camera!);
    app.on('prerender', this.updatePixels);
    app.on('update', this.updateSunlight);
  }
  private prepareCameraTarget(): void {
    const device = this.app.graphicsDevice;
    if (!(device instanceof pc.WebglGraphicsDevice)) return;
    const pass = this.camera.camera!.framePasses.find(
      (pass): pass is pc.FramePassCameraFrame => pass instanceof pc.FramePassCameraFrame,
    );
    const scenePass = pass?.scenePass as pc.RenderPass | undefined;
    const target = scenePass?.renderTarget;
    if (!target) return;
    if (!this.preparedTargets.has(target)) {
      this.preparedTargets.add(target);
      const resize = target.resize;
      target.resize = (width, height) => {
        const previous = target.impl;
        resize.call(target, width, height);
        if (target.impl !== previous) this.prepareCameraImplementation(target);
      };
    }
    this.prepareCameraImplementation(target);
  }
  private prepareCameraImplementation(target: pc.RenderTarget): void {
    const device = this.app.graphicsDevice;
    if (!(device instanceof pc.WebglGraphicsDevice)) return;
    const implementation = target.impl as CameraTargetImplementation;
    if (this.preparedImplementations.has(implementation)) return;
    this.preparedImplementations.add(implementation);
    const destroy = implementation.destroy;
    // PlayCanvas 2.22.2 omits deletion of unshared MSAA depth renderbuffers.
    // Own only this camera target's missing release, including resize and late
    // layer rebuilds; cached/shared depth retains its engine owner.
    // docs/verification/starting-scene-pixel-stability.md
    implementation.destroy = function (destroyDevice) {
      if (this._glMsaaDepthBuffer && !this.msaaDepthBufferKey) {
        device.gl.deleteRenderbuffer(this._glMsaaDepthBuffer);
        this._glMsaaDepthBuffer = null;
      }
      destroy.call(this, destroyDevice);
    };
  }
  setArtTreatment(style: Readonly<ArtTreatment>): void {
    this.survivalAtmosphere = style.atmosphere === 'survival';
    const survival = this.survivalAtmosphere;
    const restrained = style.atmosphere === 'restrained';
    this.frame.rendering.renderTargetScale =
      style.sceneGrid === 'half' ? 0.5 : style.sceneGrid === 'third' ? 1 / 3 : 1;
    this.frame.rendering.samples = style.coverage === 'msaa4' ? 4 : 1;
    this.pixels.setTreatment(style.sceneGrid, style.subjectDetail);
    this.frame.rendering.renderFormats =
      style.subjectDetail !== 'shared'
        ? [pc.PIXELFORMAT_RGBA16F, pc.PIXELFORMAT_RGBA32F]
        : [pc.PIXELFORMAT_111110F, pc.PIXELFORMAT_RGBA16F, pc.PIXELFORMAT_RGBA32F];
    this.frame.bloom.intensity = survival ? 0.018 : restrained ? 0.045 : 0.025;
    this.frame.grading.saturation = survival ? 0.88 : restrained ? 1.02 : 1.05;
    this.frame.grading.contrast = survival ? 1.03 : 1;
    this.frame.grading.brightness = restrained ? 1.025 : 1;
    this.frame.update();
    // Compare a shared scene grid through the existing compositor. Captions
    // remain at display resolution and the camera/picking mapping stays intact.
    const pass = this.camera.camera!.framePasses.find(
      (pass): pass is pc.FramePassCameraFrame => pass instanceof pc.FramePassCameraFrame,
    );
    if (pass) {
      const sourceFilter =
        style.sceneGrid.startsWith('pixels') ||
        style.sceneGrid.startsWith('anchored') ||
        style.sceneGrid.startsWith('metres')
          ? pc.FILTER_LINEAR
          : pc.FILTER_NEAREST;
      pass.sceneTexture.minFilter = sourceFilter;
      pass.sceneTexture.magFilter = sourceFilter;
    }
    if (style.effects === 'buffer' && !this.effects) {
      this.effects = new PixelEffects(this.app, this.camera, this.protectionLayer);
      for (const source of this.effectSources) this.effects.add(source);
      this.effects.setBuffered(true);
    } else if (style.effects === 'direct' && this.effects) {
      this.effects.destroy();
      this.effects = undefined;
    }
  }
  addEffect(source: pc.RenderComponent): void {
    this.effectSources.add(source);
    this.effects?.add(source);
  }
  removeEffect(source: pc.RenderComponent): void {
    this.effects?.remove(source);
    this.effectSources.delete(source);
  }
  effectsDiagnostics() {
    return this.effects?.diagnostics() ?? { buffered: false, sources: this.effectSources.size };
  }
  pixelDiagnostics() {
    return this.pixels.diagnostics();
  }
  setShadowQuality(quality: ShadowQuality): boolean {
    if (this.shadowQuality === quality) return false;
    this.shadowQuality = quality;
    const settings = shadowSettings[quality];
    // Device-local cost/quality choice; both modes retain the same casters and receivers.
    // Clustered lights use the shared atlas, not individual light resolutions.
    // docs/world-presentation.md#shadow-quality
    this.app.scene.lighting.shadowType = settings.local;
    this.app.scene.lighting.shadowAtlasResolution = settings.localResolution;
    this.sun.light!.shadowType = settings.sun;
    this.sun.light!.shadowResolution = settings.sunResolution;
    return true;
  }
  private revealMaterial(source: pc.StandardMaterial): pc.StandardMaterial {
    let m = this.revealMaterials.get(source);
    if (m) return m;
    m = source.clone();
    m.name = `${source.name} / revealed`;
    m.depthFunc = pc.FUNC_GREATER;
    m.depthWrite = false;
    setVisibilityStencil(
      m,
      source.stencilFront?.ref === 2 ? characterReadThroughStencil : readThroughStencil,
    );
    m.blendType = pc.BLEND_NORMAL;
    m.opacityDither = pc.DITHER_NONE;
    m.alphaTest = 0.01;
    m.shaderChunks.version = '2.22';
    m.shaderChunks.glsl.set(
      'opacityPS',
      `
      uniform float material_opacity;
      uniform float material_alphaDitherScale;
      uniform float ol_revealStrength;
      uniform vec3 ol_revealCenter;
      uniform vec3 ol_revealSize;
      void getOpacity() {
        dAlpha = material_opacity;
        #ifdef STD_OPACITY_TEXTURE
          dAlpha *= texture2DBias({STD_OPACITY_TEXTURE_NAME}, {STD_OPACITY_TEXTURE_UV}, textureBias).{STD_OPACITY_TEXTURE_CHANNEL};
        #endif
        vec3 q = (vPositionW - ol_revealCenter) / ol_revealSize;
        float edge = 1.0 - smoothstep(0.65, 1.35, length(q));
        dAlpha *= edge * ol_revealStrength;
        // Stable screen-space stipple only at the soft fringe, not a temporal pattern over pixel art.
        float stipple = fract(dot(mod(floor(gl_FragCoord.xy), 4.0), vec2(0.25, 0.625)));
        if (dAlpha < stipple * 0.06) discard;
      }
    `,
    );
    m.update();
    this.revealMaterials.set(source, m);
    return m;
  }
  private foregroundMaterial(source: pc.StandardMaterial): pc.StandardMaterial {
    let material = this.foregroundMaterials.get(source);
    if (!material) {
      material = source.clone();
      material.name = `${source.name} / selected`;
      material.depthFunc = pc.FUNC_ALWAYS;
      material.depthWrite = false;
      material.stencilFront = material.stencilBack = null;
      material.opacityDither = pc.DITHER_NONE;
      material.blendType = pc.BLEND_NORMAL;
      material.update();
      this.foregroundMaterials.set(source, material);
    }
    return material;
  }
  private protectionMaterial(source: pc.StandardMaterial): pc.StandardMaterial {
    let material = this.protectionMaterials.get(source);
    if (!material) {
      // Protect the whole alpha silhouette, including the reveal's faded fringe.
      // Otherwise an object would still show through a partially faded person.
      material = source.clone();
      material.name = `${source.name} / silhouette protection`;
      material.depthFunc = pc.FUNC_GREATER;
      material.depthWrite = false;
      material.opacityDither = pc.DITHER_NONE;
      setVisibilityStencil(material, characterReadThroughStencil);
      material.redWrite = material.greenWrite = material.blueWrite = material.alphaWrite = false;
      material.update();
      this.protectionMaterials.set(source, material);
    }
    return material;
  }
  /** Prepare actual program inputs, never a hidden draw or a readiness query. A
   * material/vertex layout is shared by every object using that artwork. The
   * private instances retain geometry, not scene nodes, until the material dies.
   */
  private prepareMaterial(source: pc.StandardMaterial, binding: RevealBinding): void {
    if (!(source instanceof ShadowMaterial) || binding.preparedMaterials.has(source)) return;
    binding.preparedMaterials.add(source);
    let preparation = this.variantPreparations.get(source);
    if (!preparation) {
      preparation = { layouts: new Map(), requested: new WeakSet() };
      this.variantPreparations.set(source, preparation);
      const owner = preparation;
      source.prepareRelated = (params, shader) => {
        if (owner.requested.has(shader)) return;
        owner.requested.add(shader);
        for (const targets of owner.layouts.values())
          for (const target of targets) this.prepareMesh(target, params);
        for (const mesh of this.interactionMeshes)
          this.prepareMesh(
            { mesh, layer: this.app.scene.layers.getLayerById(pc.LAYERID_WORLD)! },
            params,
          );
        this.interactionMeshes.clear();
      };
    }
    for (let index = 0; index < binding.meshes.length; index++) {
      const mesh = binding.meshes[index]!;
      // Animated models own their separate pixel renderer. Do not borrow and
      // retain a skeleton/morph lifetime merely to anticipate a static card.
      if (mesh.skinInstance || mesh.morphInstance) continue;
      const hoverMesh = binding.sourceMeshes[index]?.mesh ?? mesh.mesh;
      const key = `${mesh.mesh.vertexBuffer!.format.renderingHashString}|${hoverMesh.vertexBuffer!.format.renderingHashString}|${binding.layer.id}|${!!binding.protection}`;
      if (preparation.layouts.has(key)) continue;
      const targets = [
        { material: this.revealMaterial(source), layer: binding.layer, geometry: mesh.mesh },
        {
          material: this.foregroundMaterial(source),
          layer: this.foregroundLayer,
          geometry: mesh.mesh,
        },
        ...(binding.protection
          ? [
              {
                material: this.protectionMaterial(source),
                layer: this.protectionLayer,
                geometry: mesh.mesh,
              },
            ]
          : []),
        ...(this.hover
          ? [
              {
                material: this.hover.prepareMaterial(source),
                layer: this.hover.renderingLayer,
                geometry: hoverMesh,
                pass: this.hover.outlineShaderPass,
                camera: this.hover.outlineCameraEntity.camera!,
              },
            ]
          : []),
      ].map(({ material, layer, geometry, ...inputs }) => {
        const copy = new pc.MeshInstance(geometry, material, new pc.GraphNode('Prepared variant'));
        copy.visible = false;
        copy.castShadow = copy.receiveShadow = false;
        return { mesh: copy, layer, ...inputs };
      });
      preparation.layouts.set(key, targets);
      preparation.requested = new WeakSet();
      // A material may already have been drawn before its first reveal binding.
      source.clearVariants();
    }
  }
  private prepareMesh(
    { mesh, layer, pass, camera }: PreparedVariant,
    params: ShaderVariantParameters,
  ): void {
    if (camera) {
      // Match ForwardRenderer 2.22.2's preparation for this actual camera/target.
      // Its initially disabled outline camera has not received these inputs yet.
      camera.shaderParams.fog = (camera.camera.fogParams ?? params.scene.fog).type;
      camera.shaderParams.srgbRenderTarget = camera.renderTarget?.isColorBufferSrgb(0) ?? false;
    }
    mesh.material.prepareForRender(params.device, params.scene);
    mesh.getShaderInstance(
      pass ?? params.pass,
      layer.getLightHash(params.scene.clusteredLightingEnabled),
      params.scene,
      camera?.shaderParams ?? params.cameraShaderParams,
      params.viewUniformFormat,
      layer.splitLights,
    );
  }
  prepareInteraction(mesh: pc.MeshInstance): void {
    this.interactionMeshes.add(mesh);
  }
  prepareHover(hover: HoverOutline): void {
    this.hover = hover;
  }
  private releasePreparation(source: pc.StandardMaterial): void {
    if (!(source instanceof ShadowMaterial)) return;
    const preparation = this.variantPreparations.get(source);
    if (!preparation) return;
    source.prepareRelated = undefined;
    for (const targets of preparation.layouts.values())
      for (const { mesh } of targets) mesh.destroy();
    this.hover?.releaseMaterial(source);
    this.variantPreparations.delete(source);
  }
  addReveal(
    sprite: pc.Entity,
    material: pc.StandardMaterial,
    billboard = false,
    character = false,
    sourceMeshes = sprite.render?.meshInstances ?? [],
  ): RevealBinding {
    if (billboard && !this.spriteRevealMesh) {
      // Reveal only the front image. A relief's back faces are behind its visible
      // front and would otherwise pass the occluded-fragment depth comparison.
      this.spriteRevealMesh = pc.Mesh.fromGeometry(
        this.app.graphicsDevice,
        new pc.PlaneGeometry({ widthSegments: 1, lengthSegments: 1 }),
      );
      this.spriteRevealMesh.incRefCount();
    }
    const sourceMaterials = billboard
      ? undefined
      : sourceMeshes.map((mi) =>
          mi.material instanceof pc.StandardMaterial ? mi.material : material,
        );
    const meshes = sourceMeshes.map((mi, index) => {
      const copy = new pc.MeshInstance(
        billboard ? this.spriteRevealMesh! : mi.mesh,
        this.revealMaterial(sourceMaterials?.[index] ?? material),
        mi.node,
      );
      copy.castShadow = false;
      copy.receiveShadow = false;
      copy.visible = false;
      // Reveal borrows the current pose; it never owns or evaluates a second skeleton.
      copy.skinInstance = mi.skinInstance;
      copy.morphInstance = mi.morphInstance;
      return copy;
    });
    const layer = character ? this.characterLayer : this.layer;
    layer.addMeshInstances(meshes, true);
    const protection = character
      ? meshes.map((mesh, index) => {
          const copy = new pc.MeshInstance(
            mesh.mesh,
            this.protectionMaterial(sourceMaterials?.[index] ?? material),
            mesh.node,
          );
          copy.visible = false;
          copy.castShadow = copy.receiveShadow = false;
          copy.skinInstance = mesh.skinInstance;
          copy.morphInstance = mesh.morphInstance;
          return copy;
        })
      : undefined;
    if (protection) this.protectionLayer.addMeshInstances(protection, true);
    const binding: RevealBinding = {
      meshes,
      layer,
      protection,
      preparedMaterials: new WeakSet(),
      sourceMeshes,
      sourceMaterials,
      strength: 0,
      frame: material,
      lastStrength: 0,
      center: new Float32Array(3),
      size: new Float32Array(3),
      foot: new Float32Array(3),
      spriteSize: new Float32Array(2),
    };
    for (const mi of [...meshes, ...(protection ?? [])]) {
      mi.setParameter('ol_revealCenter', binding.center);
      mi.setParameter('ol_revealSize', binding.size);
      mi.setParameter('ol_spriteFoot', binding.foot);
      mi.setParameter('ol_spriteSize', binding.spriteSize);
      mi.setParameter('ol_revealStrength', 0);
    }
    this.prepareMaterial(material, binding);
    return binding;
  }
  updateReveal(
    binding: RevealBinding,
    source: pc.StandardMaterial,
    foot: pc.Vec3,
    width: number,
    height: number,
    strength: number,
    dt: number,
    authorized: boolean,
    selected: boolean,
    immediate = false,
  ): void {
    if (source !== binding.frame) this.prepareMaterial(source, binding);
    // Most targets are outside the local reveal. Skip both allocations and uniform writes
    // once hidden, but always process revocation of a previously visible target immediately.
    const target = authorized && !selected ? strength : 0;
    if (selected && authorized && !binding.foreground) {
      binding.foreground = binding.meshes.map((mesh, index) => {
        const copy = new pc.MeshInstance(
          mesh.mesh,
          this.foregroundMaterial(binding.sourceMaterials?.[index] ?? source),
          mesh.node,
        );
        copy.castShadow = copy.receiveShadow = false;
        copy.skinInstance = mesh.skinInstance;
        copy.morphInstance = mesh.morphInstance;
        for (const name of ['ol_spriteFoot', 'ol_spriteSize'])
          copy.setParameter(name, name === 'ol_spriteFoot' ? binding.foot : binding.spriteSize);
        return copy;
      });
      this.foregroundLayer.addMeshInstances(binding.foreground, true);
    }
    for (let i = 0; i < (binding.foreground?.length ?? 0); i++) {
      const mesh = binding.foreground![i]!;
      const original = binding.sourceMeshes[i]!;
      if (mesh.skinInstance !== original.skinInstance) mesh.skinInstance = original.skinInstance;
      mesh.visible = authorized && selected;
      if (!binding.sourceMaterials && source !== binding.frame)
        mesh.material = this.foregroundMaterial(source);
    }
    if (target === 0 && binding.strength === 0 && !selected) return;
    binding.strength = !authorized
      ? 0
      : immediate
        ? target
        : binding.strength + (target - binding.strength) * (1 - Math.exp(-Math.min(dt, 0.1) * 12));
    if (Math.abs(binding.strength - target) < 0.001) binding.strength = target;
    binding.center[0] = foot.x;
    binding.center[1] = foot.y + height / 2;
    binding.center[2] = foot.z;
    binding.size[0] = binding.size[2] = Math.max(width * 0.7, 0.1);
    binding.size[1] = Math.max(height * 0.65, 0.1);
    const spriteFoot = (
      binding.sourceMeshes[0]?.getParameter('ol_spriteFoot') as
        | { data?: ArrayLike<number> }
        | undefined
    )?.data;
    binding.foot[0] = spriteFoot?.[0] ?? foot.x;
    binding.foot[1] = spriteFoot?.[1] ?? foot.y;
    binding.foot[2] = spriteFoot?.[2] ?? foot.z;
    binding.spriteSize[0] = width;
    binding.spriteSize[1] = height;
    for (let i = 0; i < binding.meshes.length; i++) {
      const mi = binding.meshes[i]!;
      // PlayCanvas can recreate a skin when its source component is re-enabled.
      // Borrowed copies must follow the current skin without owning its lifetime.
      const original = binding.sourceMeshes[i]!;
      if (mi.skinInstance !== original.skinInstance) mi.skinInstance = original.skinInstance;
      mi.visible = !selected && binding.strength > 0.01;
      if (!binding.sourceMaterials && source !== binding.frame)
        mi.material = this.revealMaterial(source);
      if (binding.lastStrength !== binding.strength)
        mi.setParameter('ol_revealStrength', binding.strength);
    }
    for (let i = 0; i < (binding.protection?.length ?? 0); i++) {
      const mesh = binding.protection![i]!;
      const original = binding.sourceMeshes[i]!;
      if (mesh.skinInstance !== original.skinInstance) mesh.skinInstance = original.skinInstance;
      mesh.visible = !selected && binding.strength > 0.01;
      if (!binding.sourceMaterials && source !== binding.frame)
        mesh.material = this.protectionMaterial(source);
      if (binding.lastStrength !== binding.strength)
        mesh.setParameter('ol_revealStrength', binding.strength);
    }
    binding.lastStrength = binding.strength;
    binding.frame = source;
  }
  removeReveal(binding: RevealBinding): void {
    binding.layer.removeMeshInstances(binding.meshes, true);
    if (binding.foreground) this.foregroundLayer.removeMeshInstances(binding.foreground, true);
    if (binding.protection) this.protectionLayer.removeMeshInstances(binding.protection, true);
    for (const mi of [
      ...binding.meshes,
      ...(binding.foreground ?? []),
      ...(binding.protection ?? []),
    ]) {
      mi.skinInstance = null;
      mi.morphInstance = null;
      mi.destroy();
    }
  }
  releaseMaterial(source: pc.StandardMaterial): void {
    this.releasePreparation(source);
    this.revealMaterials.get(source)?.destroy();
    this.revealMaterials.delete(source);
    this.foregroundMaterials.get(source)?.destroy();
    this.foregroundMaterials.delete(source);
    this.protectionMaterials.get(source)?.destroy();
    this.protectionMaterials.delete(source);
  }
  private receiveSunlight(view: GameView): void {
    const { clock } = view;
    const previous = this.sunlightSample;
    const before = previous?.clock;
    const delta = before ? clock.seconds - before.seconds : 0;
    const immediate =
      !previous ||
      previous.worldId !== view.worldId ||
      previous.saveTimeline !== view.saveTimeline ||
      previous.scope !== view.access?.scope ||
      clock.paused ||
      clock.preparingNavigation ||
      before?.paused ||
      before?.preparingNavigation ||
      delta < 0 ||
      delta > Math.max(1, 0.25 * clock.baseRatio * clock.speed) ||
      before?.speed !== clock.speed ||
      before?.baseRatio !== clock.baseRatio ||
      before?.offsetHours !== clock.offsetHours ||
      before?.daylight?.startHour !== clock.daylight?.startHour ||
      before?.daylight?.endHour !== clock.daylight?.endHour ||
      before?.daylight?.noonElevationDegrees !== clock.daylight?.noonElevationDegrees;
    this.sunlightSample = {
      worldId: view.worldId,
      saveTimeline: view.saveTimeline,
      scope: view.access?.scope,
      clock,
    };
    if (immediate) {
      this.sunlightSeconds = clock.seconds;
    } else if (delta !== 0) {
      this.sunlightFromSeconds = this.sunlightSeconds;
      this.sunlightElapsed = 0;
    }
    // Clock receipt bounds this short transition: after 50 ms it settles at
    // that exact sample, including if the connection stops sending. Repeated
    // quality/art updates reapply lighting without restarting the transition.
    // docs/world-presentation.md#sun-path
    this.applySunlight();
  }
  private applySunlight(): void {
    const clock = this.sunlightSample!.clock;
    // Use the received hour's offset and a seconds delta, so midnight does not
    // interpolate backwards through an entire day.
    const hour = clock.hour + (this.sunlightSeconds - clock.seconds) / 3600;
    const { daylight, toSun } = sunlightAtHour(hour, clock.daylight);
    this.sunDirection.set(toSun.x, toSun.y, toSun.z);
    // PlayCanvas directional rays follow local −Y. Use world orientation so camera
    // motion cannot move the sun; clock discontinuities snap before this call.
    this.sun.setRotation(this.sunRotation.setFromDirections(pc.Vec3.UP, this.sunDirection));
    if (this.survivalAtmosphere)
      this.app.scene.ambientLight.set(
        0.35 + 0.05 * daylight,
        0.4 + 0.04 * daylight,
        0.5 - 0.02 * daylight,
      );
    else
      this.app.scene.ambientLight.set(
        0.5 + 0.08 * daylight,
        0.56 + 0.06 * daylight,
        0.68 - 0.06 * daylight,
      );
    this.sun.light!.intensity = (this.survivalAtmosphere ? 1.08 : 1.2) * daylight;
    this.sun.enabled = daylight > 0.001;
  }
  lighting(view: GameView, remembered: GameView['entities'] = view.entities): void {
    this.receiveSunlight(view);
    const p = view.player.position;
    // Retain illumination from last-permitted fire images when their sources leave sight.
    // This is presentation memory, never current hidden source data.
    const distance = (e: GameView['entities'][number]) =>
      Math.hypot(e.position.x - p.x, e.position.y - p.y, e.position.z - p.z) -
      (this.selectedLights.has(e.id) ? 1 : 0);
    const sources = remembered
      .filter((e) => e.heat?.lit)
      .sort((a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id))
      .slice(0, this.shadowQuality === 'economy' ? 2 : 8);
    // Retain admitted lights through small distance crossovers; a missing or
    // extinguished source is excluded before this ranking and revoked immediately.
    this.selectedLights.clear();
    for (const source of sources) this.selectedLights.add(source.id);
    for (let i = 0; i < Math.max(this.lights.length, sources.length); i++) {
      let light = this.lights[i];
      if (!light) {
        light = new pc.Entity('Observed fire light', this.app);
        light.addComponent('light', {
          type: 'omni',
          color: new pc.Color(1, 0.64, 0.33),
          intensity: 2.8,
          range: 8,
          // Every illuminating source needs occlusion, or secondary fires light
          // through floors/walls. Quality bounds the selected count and shared atlas.
          castShadows: true,
          normalOffsetBias: 0.025,
          layers: [
            pc.LAYERID_WORLD,
            this.layer.id,
            this.characterLayer.id,
            this.foregroundLayer.id,
          ],
        });
        this.app.root.addChild(light);
        this.lights.push(light);
      }
      const source = sources[i];
      light.enabled = !!source;
      if (source) light.setPosition(source.position.x, source.position.y + 0.8, source.position.z);
    }
  }
  destroy(): void {
    for (const source of this.variantPreparations.keys()) this.releasePreparation(source);
    this.interactionMeshes.clear();
    this.hover = undefined;
    this.app.off('prerender', this.updatePixels);
    this.app.off('update', this.updateSunlight);
    this.pixels.destroy();
    this.effects?.destroy();
    this.effectSources.clear();
    this.frame.destroy();
    this.app.scene.layers.remove(this.layer);
    this.app.scene.layers.remove(this.characterLayer);
    this.app.scene.layers.remove(this.foregroundLayer);
    this.app.scene.layers.remove(this.protectionLayer);
    for (const m of this.revealMaterials.values()) m.destroy();
    for (const m of this.foregroundMaterials.values()) m.destroy();
    for (const m of this.protectionMaterials.values()) m.destroy();
    this.revealMaterials.clear();
    this.foregroundMaterials.clear();
    this.protectionMaterials.clear();
    if (this.spriteRevealMesh) {
      this.spriteRevealMesh.decRefCount();
      if (this.spriteRevealMesh.refCount === 0) this.spriteRevealMesh.destroy();
    }
    for (const light of this.lights) light.destroy();
  }
}
