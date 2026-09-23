import * as pc from 'playcanvas';
import type { EntityView, GameView } from '@open-legend/protocol';

/** Renderer-only approximations. Mechanical bodies, hearing and sight never use these shaders.
 * docs/world-presentation.md#sprite-lighting
 */
export function lightSprite(material: pc.StandardMaterial): void {
  material.twoSidedLighting = true;
  material.specular.set(0, 0, 0);
  material.shaderChunks.glsl.set(
    'normalMapPS',
    `
    uniform vec3 ol_spriteFoot;
    uniform vec2 ol_spriteSize;
    void getNormal() {
      vec2 uv = {STD_DIFFUSE_TEXTURE_UV};
      float across = uv.x * 2.0 - 1.0;
      vec3 outward = normalize(vec3(dVertexNormalW.x, 0.0, dVertexNormalW.z));
      vec3 relative = vPositionW - ol_spriteFoot;
      relative.y = (relative.y - ol_spriteSize.y * 0.5) * 0.35;
      // A rounded virtual body, rather than lighting the entire image as a rotating flat sheet.
      relative += outward * ol_spriteSize.x * 0.5 * sqrt(max(0.08, 1.0 - across * across));
      dNormalW = normalize(relative);
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
  meshes: pc.MeshInstance[];
  strength: number;
  frame: pc.StandardMaterial;
}

/** Only hidden fragments of currently authorized targets are drawn. This is the compositing
 * equivalent of fading the obstruction over that silhouette, without opening a hole onto
 * unknown objects behind it. It needs no per-target/per-occluder CPU raycast matrix.
 * docs/world-presentation.md#local-read-through
 */
export class WorldPresentation {
  readonly layer: pc.Layer;
  private revealMaterials = new Map<pc.StandardMaterial, pc.StandardMaterial>();
  private readonly proxyMaterial: pc.StandardMaterial;
  private readonly lights: pc.Entity[] = [];
  private readonly frame: pc.CameraFrame;
  constructor(
    private app: pc.Application,
    private camera: pc.Entity,
    private sun: pc.Entity,
  ) {
    this.layer = new pc.Layer({ name: 'Authorized read-through' });
    // Last world pass; DOM UI is separate. Depth from the ordinary world is retained.
    app.scene.layers.push(this.layer);
    camera.camera!.layers = [...camera.camera!.layers, this.layer.id];
    sun.light!.layers = [...sun.light!.layers, this.layer.id];
    this.proxyMaterial = new pc.StandardMaterial();
    this.proxyMaterial.useLighting = false;
    this.proxyMaterial.redWrite =
      this.proxyMaterial.greenWrite =
      this.proxyMaterial.blueWrite =
      this.proxyMaterial.alphaWrite =
        false;
    this.proxyMaterial.depthWrite = false;
    this.proxyMaterial.update();
    this.frame = new pc.CameraFrame(app, camera.camera!);
    this.frame.rendering.toneMapping = pc.TONEMAP_ACES;
    this.frame.bloom.intensity = 0.025;
    this.frame.bloom.blurLevel = 3;
    this.frame.grading.enabled = true;
    this.frame.grading.saturation = 1.05;
    this.frame.update();
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
  addReveal(sprite: pc.Entity, material: pc.StandardMaterial): RevealBinding {
    const meshes = (sprite.render?.meshInstances ?? []).map((mi) => {
      const copy = new pc.MeshInstance(mi.mesh, this.revealMaterial(material), mi.node);
      copy.castShadow = false;
      copy.receiveShadow = false;
      copy.visible = false;
      return copy;
    });
    this.layer.addMeshInstances(meshes, true);
    return { meshes, strength: 0, frame: material };
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
    // Revoked knowledge disappears immediately; only still-authorized presentation eases out.
    binding.strength = authorized
      ? binding.strength + (strength - binding.strength) * (1 - Math.exp(-dt * 12))
      : 0;
    for (const mi of binding.meshes) {
      mi.visible = binding.strength > 0.01;
      if (source !== binding.frame) mi.material = this.revealMaterial(source);
      mi.setParameter('ol_revealStrength', binding.strength);
      mi.setParameter('ol_revealCenter', [foot.x, foot.y + height / 2, foot.z]);
      mi.setParameter('ol_revealSize', [
        Math.max(width * 0.7, 0.1),
        Math.max(height * 0.65, 0.1),
        Math.max(width * 0.7, 0.1),
      ]);
      mi.setParameter('ol_spriteFoot', [foot.x, foot.y, foot.z]);
      mi.setParameter('ol_spriteSize', [width, height]);
    }
    binding.frame = source;
  }
  removeReveal(binding: RevealBinding): void {
    this.layer.removeMeshInstances(binding.meshes, true);
    for (const mi of binding.meshes) mi.destroy();
  }
  releaseMaterial(source: pc.StandardMaterial): void {
    this.revealMaterials.get(source)?.destroy();
    this.revealMaterials.delete(source);
  }
  shadowProxy(parent: pc.Entity, width: number, height: number, depth = width): pc.Entity {
    const proxy = new pc.Entity('Shadow-only body', this.app);
    proxy.addComponent('render', {
      type: 'sphere',
      material: this.proxyMaterial,
      castShadows: true,
      receiveShadows: false,
    });
    proxy.setLocalPosition(0, height / 2, 0);
    proxy.setLocalScale(width, height, depth);
    parent.addChild(proxy);
    return proxy;
  }
  lighting(view: GameView): void {
    const daylight = Math.max(0, Math.sin(((view.clock.hour - 6) * Math.PI) / 12));
    this.app.scene.ambientLight.set(
      0.09 + 0.32 * daylight,
      0.12 + 0.32 * daylight,
      0.18 + 0.29 * daylight,
    );
    this.sun.light!.intensity = 0.12 + 1.2 * daylight;
    const p = view.player.position;
    // Only authorized, currently observed fire locations reach the renderer. No ghost lights.
    const sources = view.entities
      .filter((e) => e.kind === 'station' && e.status.startsWith('Lit'))
      .sort(
        (a, b) =>
          (a.position.x - p.x) ** 2 +
          (a.position.y - p.y) ** 2 +
          (a.position.z - p.z) ** 2 -
          ((b.position.x - p.x) ** 2 + (b.position.y - p.y) ** 2 + (b.position.z - p.z) ** 2),
      )
      .slice(0, 8);
    for (let i = 0; i < Math.max(this.lights.length, sources.length); i++) {
      let light = this.lights[i];
      if (!light) {
        light = new pc.Entity('Observed fire light', this.app);
        light.addComponent('light', {
          type: 'omni',
          color: new pc.Color(1, 0.47, 0.12),
          intensity: 3.5,
          range: 8,
          castShadows: i === 0,
          shadowResolution: 512,
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
    for (const light of this.lights) light.destroy();
    this.proxyMaterial.destroy();
  }
}
