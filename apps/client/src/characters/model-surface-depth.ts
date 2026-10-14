import * as pc from 'playcanvas';

class SurfacePass extends pc.RenderPass {
  constructor(
    device: pc.GraphicsDevice,
    private readonly draw: () => void,
  ) {
    super(device);
  }
  override execute(): void {
    this.draw();
  }
}

/** Selected/read-through meshes ignore scenery depth, but must still reject their
 * own rear surfaces. This full-resolution depth-only pass never supplies color or
 * changes the model's cells. docs/world-presentation.md#animated-character-pixels */
export class ModelSurfaceDepth {
  private readonly depth: pc.Texture;
  private readonly target: pc.RenderTarget;
  private readonly pass: SurfacePass;
  private readonly material: pc.ShaderMaterial;
  private readonly copies: pc.MeshInstance[];
  private readonly size = new Float32Array(2);
  private readonly bound = new WeakSet<pc.MeshInstance>();
  constructor(
    private readonly app: pc.Application,
    private readonly camera: pc.Entity,
    meshes: readonly pc.MeshInstance[],
  ) {
    const device = app.graphicsDevice;
    this.depth = new pc.Texture(device, {
      name: 'Mercenary nearest surface depth',
      width: device.width,
      height: device.height,
      format: pc.PIXELFORMAT_DEPTH,
      mipmaps: false,
      minFilter: pc.FILTER_NEAREST,
      magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    });
    this.target = new pc.RenderTarget({ depthBuffer: this.depth, samples: 1 });
    this.material = new pc.ShaderMaterial({
      uniqueName: 'Rigid character nearest depth',
      attributes: { aPosition: pc.SEMANTIC_POSITION },
      vertexGLSL: `attribute vec3 aPosition;
        uniform mat4 matrix_model;
        uniform mat4 matrix_viewProjection;
        void main(void) {
          vec4 world = matrix_model * vec4(aPosition, 1.0);
          gl_Position = matrix_viewProjection * world;
        }`,
      fragmentGLSL: 'void main(void) { gl_FragColor = vec4(0.0); }',
    });
    this.material.redWrite =
      this.material.greenWrite =
      this.material.blueWrite =
      this.material.alphaWrite =
        false;
    this.material.update();
    this.copies = meshes.map((mesh) => {
      const copy = new pc.MeshInstance(mesh.mesh, this.material, mesh.node);
      copy.castShadow = copy.receiveShadow = false;
      return copy;
    });
    this.pass = new SurfacePass(device, () => {
      this.size[0] = this.depth.width;
      this.size[1] = this.depth.height;
      app.renderer.renderForwardLayer(
        camera.camera!.camera,
        this.target,
        // @ts-expect-error The pinned engine accepts null for an explicit
        // meshInstances list; its Layer-only declaration omits that branch.
        null,
        false,
        pc.SHADER_FORWARD,
        { meshInstances: this.copies },
      );
    });
    this.pass.init(this.target);
    this.pass.setClearDepth(1);
    this.pass.enabled = false;
    camera.camera!.camera.beforePasses.push(this.pass);
    for (const mesh of meshes) this.bind(mesh, false);
  }
  static prepareMaterial(material: pc.StandardMaterial, device: pc.GraphicsDevice): void {
    const diffuse = pc.ShaderChunks.get(device).get('diffusePS')!;
    material.shaderChunks.glsl.set(
      'diffusePS',
      `
      uniform sampler2D ol_modelSurfaceDepth;
      uniform vec2 ol_modelSurfaceSize;
      uniform float ol_nearestSurfaceOnly;
      ${diffuse.replace(
        'void getAlbedo() {',
        `void getAlbedo() {
        if (ol_nearestSurfaceOnly > 0.5) {
          float nearest = texture2D(ol_modelSurfaceDepth,
            gl_FragCoord.xy / ol_modelSurfaceSize).r;
          // Identical projection/vertex math: two float-depth ulps suffice.
          // A larger normalized tolerance leaks rear cells at distant perspective zoom.
          if (gl_FragCoord.z > nearest + 0.0000001) discard;
        }`,
      )}
    `,
    );
  }
  bind(mesh: pc.MeshInstance, nearestOnly = true): void {
    if (this.bound.has(mesh)) return;
    this.bound.add(mesh);
    mesh.setParameter('ol_modelSurfaceDepth', this.depth);
    mesh.setParameter('ol_modelSurfaceSize', this.size);
    mesh.setParameter('ol_nearestSurfaceOnly', nearestOnly ? 1 : 0);
  }
  setEnabled(enabled: boolean): void {
    if (
      enabled &&
      (this.depth.width !== this.app.graphicsDevice.width ||
        this.depth.height !== this.app.graphicsDevice.height)
    )
      this.target.resize(this.app.graphicsDevice.width, this.app.graphicsDevice.height);
    this.pass.enabled = enabled;
  }
  destroy(): void {
    const passes = this.camera.camera!.camera.beforePasses;
    const index = passes.indexOf(this.pass);
    if (index >= 0) passes.splice(index, 1);
    this.pass.destroy();
    for (const copy of this.copies) copy.destroy();
    this.material.destroy();
    this.target.destroy();
    this.depth.destroy();
  }
}
