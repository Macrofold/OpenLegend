import * as pc from 'playcanvas';
import type { GameView } from '@open-legend/protocol';
import { sunlightAtHour } from './sunlight';
import type { ShadowQuality } from './world-renderer';
import { shadowSettings } from './shadow-material';

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
  sourceMesh?: pc.MeshInstance;
  meshes: pc.MeshInstance[];
  strength: number;
  frame: pc.StandardMaterial;
  center: Float32Array;
  size: Float32Array;
  foot: Float32Array;
  spriteSize: Float32Array;
  lastStrength: number;
}

/** Only hidden fragments of currently authorized targets are drawn. This is the compositing
 * equivalent of fading the obstruction over that silhouette, without opening a hole onto
 * unknown objects behind it. It needs no per-target/per-occluder CPU raycast matrix.
 * docs/world-presentation.md#local-read-through
 */
export class WorldPresentation {
  readonly layer: pc.Layer;
  private revealMaterials = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private spriteRevealMesh?: pc.Mesh;
  private readonly worldLayer: pc.Layer;
  private readonly lights: pc.Entity[] = [];
  private readonly selectedLights = new Set<string>();
  private readonly sunDirection = new pc.Vec3();
  private readonly sunRotation = new pc.Quat();
  private shadowQuality?: ShadowQuality;
  private readonly frame: pc.CameraFrame;
  private readonly hiddenMeshes = new WeakSet<pc.MeshInstance>();
  constructor(
    private app: pc.Application,
    private camera: pc.Entity,
    private sun: pc.Entity,
  ) {
    this.worldLayer = app.scene.layers.getLayerById(pc.LAYERID_WORLD)!;
    this.layer = new pc.Layer({ name: 'Authorized read-through' });
    // CameraFrame composites through Immediate, then renders later layers onto
    // the output target without world depth. Reveal needs the original depth.
    const immediate = app.scene.layers.getLayerById(pc.LAYERID_IMMEDIATE)!;
    app.scene.layers.insert(this.layer, app.scene.layers.getOpaqueIndex(immediate));
    camera.camera!.layers = [...camera.camera!.layers, this.layer.id];
    sun.light!.layers = [...sun.light!.layers, this.layer.id];
    this.setShadowQuality('detailed');
    // Angular spread, not a world-space blur radius: large values make the
    // blocker search miss small bodies. Keep the sun close to a small disk.
    sun.light!.penumbraSize = 0.015;
    sun.light!.shadowSamples = 16;
    sun.light!.shadowBlockerSamples = 16;
    this.frame = new pc.CameraFrame(app, camera.camera!);
    this.frame.rendering.toneMapping = pc.TONEMAP_ACES;
    this.frame.bloom.intensity = 0.025;
    this.frame.bloom.blurLevel = 3;
    this.frame.grading.enabled = true;
    this.frame.grading.saturation = 1.05;
    this.frame.update();
  }
  setShadowQuality(quality: ShadowQuality): boolean {
    if (this.shadowQuality === quality) return false;
    this.shadowQuality = quality;
    const settings = shadowSettings[quality];
    // Device-local cost/quality choice; both modes retain the same casters and receivers.
    // Clustered lights use the shared atlas, not individual light resolutions.
    // docs/world-presentation.md#shadow-quality
    this.app.scene.lighting.shadowType = settings.local;
    this.app.scene.lighting.shadowAtlasResolution = settings.resolution;
    this.sun.light!.shadowType = settings.sun;
    this.sun.light!.shadowResolution = settings.resolution;
    return true;
  }
  private revealMaterial(source: pc.StandardMaterial): pc.StandardMaterial {
    let m = this.revealMaterials.get(source);
    if (m) return m;
    m = source.clone();
    m.depthFunc = pc.FUNC_GREATER;
    m.depthWrite = false;
    m.blendType = pc.BLEND_NORMAL;
    m.opacityDither = pc.DITHER_NONE;
    m.alphaTest = 0.01;
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
  addReveal(sprite: pc.Entity, material: pc.StandardMaterial, billboard = false): RevealBinding {
    if (billboard && !this.spriteRevealMesh) {
      // Reveal only the front image. A relief's back faces are behind its visible
      // front and would otherwise pass the occluded-fragment depth comparison.
      this.spriteRevealMesh = pc.Mesh.fromGeometry(
        this.app.graphicsDevice,
        new pc.PlaneGeometry({ widthSegments: 1, lengthSegments: 1 }),
      );
      this.spriteRevealMesh.incRefCount();
    }
    const meshes = (sprite.render?.meshInstances ?? []).map((mi) => {
      const copy = new pc.MeshInstance(
        billboard ? this.spriteRevealMesh! : mi.mesh,
        this.revealMaterial(material),
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
    this.layer.addMeshInstances(meshes, true);
    const binding: RevealBinding = {
      meshes,
      sourceMesh: sprite.render?.meshInstances[0],
      strength: 0,
      frame: material,
      lastStrength: 0,
      center: new Float32Array(3),
      size: new Float32Array(3),
      foot: new Float32Array(3),
      spriteSize: new Float32Array(2),
    };
    for (const mi of meshes) {
      mi.setParameter('ol_revealCenter', binding.center);
      mi.setParameter('ol_revealSize', binding.size);
      mi.setParameter('ol_spriteFoot', binding.foot);
      mi.setParameter('ol_spriteSize', binding.spriteSize);
      mi.setParameter('ol_revealStrength', 0);
    }
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
  ): void {
    // Most targets are outside the local reveal. Skip both allocations and uniform writes
    // once hidden, but always process revocation of a previously visible target immediately.
    const target = authorized ? strength : 0;
    if (target === 0 && binding.strength === 0) return;
    binding.strength = authorized
      ? binding.strength + (target - binding.strength) * (1 - Math.exp(-Math.min(dt, 0.1) * 12))
      : 0;
    if (Math.abs(binding.strength - target) < 0.001) binding.strength = target;
    binding.center[0] = foot.x;
    binding.center[1] = foot.y + height / 2;
    binding.center[2] = foot.z;
    binding.size[0] = binding.size[2] = Math.max(width * 0.7, 0.1);
    binding.size[1] = Math.max(height * 0.65, 0.1);
    const spriteFoot = (
      binding.sourceMesh?.getParameter('ol_spriteFoot') as { data?: ArrayLike<number> } | undefined
    )?.data;
    binding.foot[0] = spriteFoot?.[0] ?? foot.x;
    binding.foot[1] = spriteFoot?.[1] ?? foot.y;
    binding.foot[2] = spriteFoot?.[2] ?? foot.z;
    binding.spriteSize[0] = width;
    binding.spriteSize[1] = height;
    for (const mi of binding.meshes) {
      mi.visible = binding.strength > 0.01;
      if (source !== binding.frame) mi.material = this.revealMaterial(source);
      if (binding.lastStrength !== binding.strength)
        mi.setParameter('ol_revealStrength', binding.strength);
    }
    binding.lastStrength = binding.strength;
    binding.frame = source;
  }
  removeReveal(binding: RevealBinding): void {
    this.layer.removeMeshInstances(binding.meshes, true);
    for (const mi of binding.meshes) {
      mi.skinInstance = null;
      mi.morphInstance = null;
      mi.destroy();
    }
  }
  releaseMaterial(source: pc.StandardMaterial): void {
    this.revealMaterials.get(source)?.destroy();
    this.revealMaterials.delete(source);
  }
  /** A floor cutaway changes camera visibility, not shadow casting or physical geometry. */
  setCutaway(node: pc.Entity, hidden: boolean): void {
    for (const render of node.findComponents('render') as pc.RenderComponent[])
      for (const mi of render.meshInstances) {
        const wasHidden = this.hiddenMeshes.has(mi);
        if (hidden && !wasHidden) {
          this.hiddenMeshes.add(mi);
          this.worldLayer.removeMeshInstances([mi], true);
        } else if (!hidden && wasHidden) {
          this.hiddenMeshes.delete(mi);
          this.worldLayer.addMeshInstances([mi], true);
        }
      }
  }
  lighting(view: GameView): void {
    const { daylight, toSun } = sunlightAtHour(view.clock.hour);
    this.sunDirection.set(toSun.x, toSun.y, toSun.z);
    // PlayCanvas directional rays follow local −Y. Use world orientation so camera
    // motion cannot move the sun; received clock updates also handle pause/load/rewind.
    this.sun.setRotation(this.sunRotation.setFromDirections(pc.Vec3.UP, this.sunDirection));
    this.app.scene.ambientLight.set(
      0.18 + 0.26 * daylight,
      0.22 + 0.25 * daylight,
      0.3 + 0.2 * daylight,
    );
    this.sun.light!.intensity = 1.2 * daylight;
    this.sun.enabled = daylight > 0.001;
    const p = view.player.position;
    // Only authorized, currently observed fire locations reach the renderer. No ghost lights.
    const distance = (e: GameView['entities'][number]) =>
      Math.hypot(e.position.x - p.x, e.position.y - p.y, e.position.z - p.z) -
      (this.selectedLights.has(e.id) ? 1 : 0);
    const sources = view.entities
      .filter((e) => e.kind === 'station' && e.status.startsWith('Lit'))
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
          color: new pc.Color(1, 0.47, 0.12),
          intensity: 2.8,
          range: 8,
          // Every illuminating source needs occlusion, or secondary fires light
          // through floors/walls. Quality bounds the selected count and shared atlas.
          castShadows: true,
          normalOffsetBias: 0.025,
          layers: [pc.LAYERID_WORLD, this.layer.id],
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
    this.frame.destroy();
    this.app.scene.layers.remove(this.layer);
    for (const m of this.revealMaterials.values()) m.destroy();
    this.revealMaterials.clear();
    if (this.spriteRevealMesh) {
      this.spriteRevealMesh.decRefCount();
      if (this.spriteRevealMesh.refCount === 0) this.spriteRevealMesh.destroy();
    }
    for (const light of this.lights) light.destroy();
  }
}
