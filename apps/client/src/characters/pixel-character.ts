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

const imageWidth = 64;
const imageHeight = 112;
// Ordinary people occupy 86 of their 96 artwork rows. Retain their pixel size
// while giving this tall adult 10% more visible height.
const visibleRows = 86 * 1.1;
const worldPixelSize = 2.1 / 96;

/** Sample the whole animated character, including lighting and silhouette.
 * Height matches neighboring camera-facing people; these image-space samples
 * are not permanent 3D cells. Physical rig and shadows retain their own scale.
 * docs/projects/completed/mercenary-visible-size-and-pixels.md */
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
  private readonly sourceRect = new Float32Array(4);
  private readonly projection = new pc.Mat4();
  private readonly crop = new pc.Mat4();
  private readonly foot = new pc.Vec3();
  private readonly top = new pc.Vec3();
  private readonly screen = new pc.Vec3();
  private readonly screenTop = new pc.Vec3();
  private readonly point = new pc.Vec3();
  private readonly localPoint = new pc.Vec3();
  private readonly inverseRoot = new pc.Mat4();
  private readonly view = new pc.Mat4();
  private readonly viewProjection = new pc.Mat4();
  private readonly inverseViewProjection = new pc.Mat4();
  private readonly mappedCamera = new pc.Mat4();
  private readonly mappedProjection = new pc.Mat4();
  private readonly mappedRoot = new pc.Mat4();
  private readonly mappedFoot = new pc.Vec3();
  private readonly mappedViewport = new Float64Array(6);
  private mappingReady = false;
  private readonly neutralPoints: pc.Vec3[] = [];
  private neutralVertices = 0;
  private neutralPreparationMs = 0;
  private readonly bodyBounds = { minY: 0, maxY: 0 };
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
    private readonly bodyRoot: pc.Entity,
  ) {
    const device = app.graphicsDevice;
    this.world = app.scene.layers.getLayerById(pc.LAYERID_WORLD)!;
    app.scene.layers.insert(this.layer, 0);
    const texture = (name: string, format: number) =>
      new pc.Texture(device, {
        name,
        width: imageWidth,
        height: imageHeight,
        format,
        mipmaps: false,
        minFilter: pc.FILTER_NEAREST,
        magFilter: pc.FILTER_NEAREST,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE,
      });
    this.color = texture('Character color 64x112', pc.PIXELFORMAT_RGBA16F);
    this.depth = texture('Character depth 64x112', pc.PIXELFORMAT_DEPTH);
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
        this.prepareProjection(true);
      },
    );
    this.pass.init(this.target);
    this.pass.setClearColor(new pc.Color(0, 0, 0, 0));
    this.pass.setClearDepth(1);
    // The pinned engine runs camera before-passes after its directional shadows.
    // Use that same camera's shadow data instead of rendering the entire shadow map twice.
    this.worldCamera.camera!.camera.beforePasses.push(this.pass);
    this.casters = components.flatMap((c) => c.meshInstances);
    // Displayed Y can remain on screen after its upright source falls outside
    // the ordinary camera frustum. This dedicated layer has only this actor.
    for (const mesh of this.casters) mesh.cull = false;
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
    for (const component of this.app.root.findComponents('light'))
      if (component instanceof pc.LightComponent) this.addLight(component.entity, component);
    this.app.systems.light?.on('add', this.addLight, this);
    this.app.systems.light?.on('beforeremove', this.removeLight, this);
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
    this.foot.copy(foot);
    const distance = this.top
      .sub2(foot, this.worldCamera.getPosition())
      .dot(this.worldCamera.forward);
    if (!visible || distance <= this.worldCamera.camera!.nearClip) {
      this.setVisible(false);
      return;
    }
    this.setVisible(true);
    this.reveal.visible = !selected && reveal > 0.001;
    this.protection.visible = this.reveal.visible;
    this.foreground.visible = selected;
    this.revealMaterial.setParameter('characterOpacity', reveal);
    this.protectionMaterial.setParameter('characterOpacity', reveal);
    this.prepareProjection();
  }

  private readonly addLight = (_entity: pc.Entity, component: pc.LightComponent): void => {
    if (this.lights.has(component)) return;
    component.layers = [...component.layers, this.layer.id];
    this.lights.add(component);
  };
  private readonly removeLight = (_entity: pc.Entity, component: pc.LightComponent): void => {
    this.lights.delete(component);
  };

  private prepareProjection(capture = false): void {
    const camera = this.worldCamera.camera!;
    if (this.neutralPoints.length === 0) {
      // Only pass preparation runs after the engine updates CPU skin matrices.
      if (!capture) return;
      this.captureNeutralBounds();
    }
    const transform = this.bodyRoot.getWorldTransform();
    const cameraTransform = this.worldCamera.getWorldTransform();
    const projection = camera.projectionMatrix;
    const viewport = this.app.graphicsDevice.clientRect;
    const cameraRect = camera.rect;
    if (
      this.mappingReady &&
      this.mappedCamera.equals(cameraTransform) &&
      this.mappedProjection.equals(projection) &&
      this.mappedRoot.equals(transform) &&
      this.mappedFoot.equals(this.foot) &&
      this.mappedViewport[0] === viewport.width &&
      this.mappedViewport[1] === viewport.height &&
      this.mappedViewport[2] === cameraRect.x &&
      this.mappedViewport[3] === cameraRect.y &&
      this.mappedViewport[4] === cameraRect.z &&
      this.mappedViewport[5] === cameraRect.w
    )
      return;
    // Labels can run after the camera moves but before the engine's prerender
    // refreshes its cached view matrix. Derive this view from public transforms.
    this.view.copy(cameraTransform).invert();
    this.viewProjection.mul2(projection, this.view);
    this.inverseViewProjection.copy(this.viewProjection).invert();
    let minY = Infinity,
      maxY = -Infinity;
    for (const point of this.neutralPoints) {
      transform.transformPoint(point, this.point);
      this.project(this.point, this.screenTop);
      minY = Math.min(minY, this.screenTop.y);
      maxY = Math.max(maxY, this.screenTop.y);
    }
    if (!Number.isFinite(minY) || maxY - minY < 1e-5) return;
    this.bodyBounds.minY = minY;
    this.bodyBounds.maxY = maxY;
    this.project(this.foot, this.screen);
    this.top
      .copy(this.worldCamera.up)
      .mulScalar(worldPixelSize * visibleRows)
      .add(this.foot);
    this.project(this.top, this.screenTop);
    const visibleHeight = Math.abs(this.screenTop.y - this.screen.y);
    const height = (visibleHeight * imageHeight) / visibleRows;
    const width = (height * imageWidth) / imageHeight;
    const sourceHeight = ((maxY - minY) * imageHeight) / visibleRows;
    const sourceCenterY = (minY + maxY) / 2;
    const centerY = this.screen.y + ((sourceCenterY - this.screen.y) * height) / sourceHeight;
    // Separate Y ranges compensate for upright-body foreshortening. X stays
    // unchanged so steep views cannot widen him; displayed texels stay square.
    this.rect[0] = this.sourceRect[0] = (this.screen.x / viewport.width) * 2 - 1;
    this.rect[1] = 1 - (centerY / viewport.height) * 2;
    this.sourceRect[1] = 1 - (sourceCenterY / viewport.height) * 2;
    this.rect[2] = this.sourceRect[2] = width / viewport.width;
    this.rect[3] = height / viewport.height;
    this.sourceRect[3] = sourceHeight / viewport.height;
    this.crop.setIdentity();
    const m = this.crop.data;
    m[0] = 1 / this.sourceRect[2]!;
    m[5] = 1 / this.sourceRect[3]!;
    m[12] = -this.sourceRect[0]! / this.sourceRect[2]!;
    m[13] = -this.sourceRect[1]! / this.sourceRect[3]!;
    this.projection.mul2(this.crop, camera.projectionMatrix);
    this.mappedCamera.copy(cameraTransform);
    this.mappedProjection.copy(projection);
    this.mappedRoot.copy(transform);
    this.mappedFoot.copy(this.foot);
    this.mappedViewport[0] = viewport.width;
    this.mappedViewport[1] = viewport.height;
    this.mappedViewport[2] = cameraRect.x;
    this.mappedViewport[3] = cameraRect.y;
    this.mappedViewport[4] = cameraRect.z;
    this.mappedViewport[5] = cameraRect.w;
    this.mappingReady = true;
  }

  private project(point: pc.Vec3, result = new pc.Vec3()): pc.Vec3 {
    const m = this.viewProjection.data;
    const w = point.x * m[3]! + point.y * m[7]! + point.z * m[11]! + m[15]!;
    this.viewProjection.transformPoint(point, result);
    const viewport = this.app.graphicsDevice.clientRect;
    const rect = this.worldCamera.camera!.rect;
    result.x = ((result.x / w + 1) * 0.5 * rect.z + rect.x) * viewport.width;
    result.y = ((1 - result.y / w) * 0.5 * rect.w + 1 - rect.y - rect.w) * viewport.height;
    return result;
  }

  private unproject(x: number, y: number, z: number): pc.Vec3 {
    const viewport = this.app.graphicsDevice.clientRect;
    const rect = this.worldCamera.camera!.rect;
    const point = new pc.Vec3(
      ((x / viewport.width - rect.x) / rect.z) * 2 - 1,
      ((1 - y / viewport.height - rect.y) / rect.w) * 2 - 1,
      z,
    );
    const m = this.inverseViewProjection.data;
    const w = point.x * m[3]! + point.y * m[7]! + point.z * m[11]! + m[15]!;
    return this.inverseViewProjection.transformPoint(point).mulScalar(1 / w);
  }

  private captureNeutralBounds(): void {
    const started = performance.now();
    this.inverseRoot.copy(this.bodyRoot.getWorldTransform()).invert();
    const points: number[] = [];
    const weighted = new pc.Vec3();
    // Evaluate the complete clothed figure once, after CPU skin updates and
    // cloth settling. Body-only bounds miss the cape's extent in steep views;
    // bone boxes instead overestimate the silhouette and make him too short.
    for (const instance of this.casters) {
      const skin = instance.skinInstance;
      const positions: number[] = [],
        weights: number[] = [],
        indices: number[] = [];
      const count = instance.mesh.getPositions(positions);
      if (skin) {
        instance.mesh.getVertexStream(pc.SEMANTIC_BLENDWEIGHT, weights);
        instance.mesh.getVertexStream(pc.SEMANTIC_BLENDINDICES, indices);
      }
      const worldTransform = instance.node.getWorldTransform();
      for (let vertex = 0; vertex < count; vertex++) {
        this.point.set(
          positions[vertex * 3]!,
          positions[vertex * 3 + 1]!,
          positions[vertex * 3 + 2]!,
        );
        if (skin) {
          weighted.set(0, 0, 0);
          for (let influence = 0; influence < 4; influence++) {
            const offset = vertex * 4 + influence;
            const weight = weights[offset]!;
            if (weight === 0) continue;
            const matrix: pc.Mat4 | undefined = skin.matrices[indices[offset]!];
            if (matrix) {
              matrix.transformPoint(this.point, this.localPoint);
              weighted.x += this.localPoint.x * weight;
              weighted.y += this.localPoint.y * weight;
              weighted.z += this.localPoint.z * weight;
            }
          }
        } else weighted.copy(this.point);
        worldTransform.transformPoint(weighted, this.point);
        this.inverseRoot.transformPoint(this.point, this.localPoint);
        points.push(this.localPoint.x, this.localPoint.y, this.localPoint.z);
      }
    }
    this.neutralVertices = points.length / 3;
    // Retain directional extrema, not the full vertex cloud. These cover a
    // hemisphere; minimum and maximum together include the opposite directions.
    // The cached neutral pose keeps walking from changing the display scale.
    const extrema = new Set<number>();
    for (let yaw = 0; yaw < 16; yaw++) {
      const angle = (yaw * Math.PI * 2) / 16;
      for (let elevation = 0; elevation < 9; elevation++) {
        const pitch = (elevation * Math.PI) / 16;
        const x = Math.sin(angle) * Math.cos(pitch),
          y = Math.sin(pitch),
          z = Math.cos(angle) * Math.cos(pitch);
        let min = Infinity,
          max = -Infinity,
          first = -1,
          last = -1;
        for (let point = 0; point < points.length; point += 3) {
          const value = points[point]! * x + points[point + 1]! * y + points[point + 2]! * z;
          if (value < min) {
            min = value;
            first = point;
          }
          if (value > max) {
            max = value;
            last = point;
          }
        }
        if (first >= 0) extrema.add(first);
        if (last >= 0) extrema.add(last);
      }
    }
    for (const point of extrema)
      this.neutralPoints.push(new pc.Vec3(points[point]!, points[point + 1]!, points[point + 2]!));
    this.neutralPreparationMs = performance.now() - started;
  }

  /** Apply the image's display mapping to labels and projected anchors. */
  screenPoint(worldPoint: pc.Vec3): pc.Vec3 {
    this.prepareProjection();
    const point = this.project(worldPoint);
    const viewport = this.app.graphicsDevice.clientRect;
    const y = 1 - (point.y / viewport.height) * 2;
    if (this.sourceRect[3]! > 0)
      point.y =
        (1 - (this.rect[1]! + ((y - this.sourceRect[1]!) * this.rect[3]!) / this.sourceRect[3]!)) *
        viewport.height *
        0.5;
    return point;
  }

  get anchor(): { x: number; y: number } {
    this.prepareProjection();
    const viewport = this.app.graphicsDevice.clientRect;
    const sourceY = 1 - (this.bodyBounds.minY / viewport.height) * 2;
    const y =
      this.sourceRect[3]! > 0
        ? this.rect[1]! + ((sourceY - this.sourceRect[1]!) * this.rect[3]!) / this.sourceRect[3]!
        : this.rect[1]!;
    return {
      x: (this.rect[0]! + 1) * viewport.width * 0.5,
      y: (1 - y) * viewport.height * 0.5,
    };
  }

  /** Undo display stretching on equal camera-depth endpoint planes. Fractions
   * along this source ray therefore agree with displayed depth and obstructions. */
  sourceRay(from: pc.Vec3, to: pc.Vec3): { from: pc.Vec3; to: pc.Vec3 } {
    this.prepareProjection();
    const viewport = this.app.graphicsDevice.clientRect;
    const screen = this.project(from);
    const y = 1 - (screen.y / viewport.height) * 2;
    const sourceY =
      this.rect[3]! > 0
        ? this.sourceRect[1]! + ((y - this.rect[1]!) * this.sourceRect[3]!) / this.rect[3]!
        : y;
    const screenY = (1 - sourceY) * viewport.height * 0.5;
    const near = this.unproject(screen.x, screenY, -1);
    const far = this.unproject(screen.x, screenY, 1);
    const direction = far.clone().sub(near);
    const forward = this.worldCamera.forward;
    const length = direction.dot(forward);
    const atDepth = (point: pc.Vec3) =>
      direction
        .clone()
        .mulScalar(point.clone().sub(near).dot(forward) / length)
        .add(near);
    return { from: atDepth(from), to: atDepth(to) };
  }

  diagnostics() {
    return {
      resolution: [imageWidth, imageHeight],
      visibleRows,
      worldPixelSize,
      sourceRect: [...this.sourceRect],
      displayRect: [...this.rect],
      bodyBounds: { ...this.bodyBounds },
      neutralPoints: this.neutralPoints.length,
      neutralVertices: this.neutralVertices,
      neutralPreparationMs: this.neutralPreparationMs,
    };
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
    this.app.systems.light?.off('add', this.addLight, this);
    this.app.systems.light?.off('beforeremove', this.removeLight, this);
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
