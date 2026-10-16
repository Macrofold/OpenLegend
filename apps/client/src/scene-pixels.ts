import * as pc from 'playcanvas';
import type { ArtTreatment } from './art-treatment';

/** The opaque HDR alpha channel is unused by the ordinary world. Tag scenery
 * after shading, retaining its full-resolution color/depth and all cutouts.
 * Blended reveal/foreground copies must retain their actual opacity. */
export function markPixelEnvironment(
  material: pc.StandardMaterial,
  device: pc.GraphicsDevice,
): void {
  const output =
    material.shaderChunks.glsl.get('outputAlphaPS') ??
    pc.ShaderChunks.get(device).get('outputAlphaPS')!;
  material.shaderChunks.glsl.set(
    'outputAlphaPS',
    output + '\n#if LIT_BLEND_TYPE == NONE\n gl_FragColor.a = 0.0;\n#endif\n',
  );
  material.update();
}

/** Compare one final pixel grid against repeated low-resolution captures. The
 * original depth/visibility passes remain untouched. Orthographic anchoring
 * follows a world point; it does not promise perspective/rotation invariance.
 * docs/projects/3d-pixel-art-first-scene-plan.md#authorized-pixel-finish-and-stability-revision--october-15-2026 */
export class ScenePixels {
  private readonly chunks: ReturnType<typeof pc.ShaderChunks.get>;
  private readonly original: string;
  private readonly originalDeclarations: string;
  private readonly grid = new Float32Array(4);
  private readonly screen = new pc.Vec3();
  private readonly origin = new pc.Vec3();
  private mode: ArtTreatment['sceneGrid'] = 'full';
  private pixelSize = 1;
  private preserveSubjects = false;
  constructor(
    private readonly device: pc.GraphicsDevice,
    private readonly camera: pc.CameraComponent,
  ) {
    this.chunks = pc.ShaderChunks.get(device);
    this.original = this.chunks.get('composePS')!;
    this.originalDeclarations = this.chunks.get('composeDeclarationsPS') ?? '';
    this.chunks.set(
      'composePS',
      this.original.replace(
        'vec4 scene = texture2DLod(sceneTexture, uv, 0.0);',
        'vec4 scene = ol_sampleScene(uv);',
      ),
    );
    this.chunks.set(
      'composeDeclarationsPS',
      this.originalDeclarations +
        `
      uniform vec4 ol_sceneGrid;
      uniform float ol_preserveSubjects;
      vec4 ol_gridCell(vec2 center) {
        vec2 texel = sceneTextureInvRes;
        // Integrate the cell's interior before enlargement, rather than pick a
        // single fine source fragment that can flash as coverage changes.
        vec2 radius = vec2(ol_sceneGrid.x * .25) * texel;
        vec2 uv = center * texel;
        vec4 a = texture2DLod(sceneTexture, uv + radius, 0.0);
        vec4 b = texture2DLod(sceneTexture, uv - radius, 0.0);
        vec4 c = texture2DLod(sceneTexture, uv + radius * vec2(1.0,-1.0), 0.0);
        vec4 d = texture2DLod(sceneTexture, uv + radius * vec2(-1.0,1.0), 0.0);
        if (ol_preserveSubjects < .5) return .25 * (a+b+c+d);
        vec4 weights = 1.0 - clamp(vec4(a.a,b.a,c.a,d.a),0.0,1.0);
        float total = dot(weights,vec4(1.0));
        // Retain color numerator and scenery coverage through interpolation.
        // Normalizing an empty cell to black before interpolation creates halos.
        return .25 * vec4(a.rgb*weights.x+b.rgb*weights.y+c.rgb*weights.z+d.rgb*weights.w,total);
      }
      vec4 ol_reconstructScene(vec4 value, vec4 original) {
        if (ol_preserveSubjects < .5) return value;
        vec3 color = value.rgb / max(value.a,.0001);
        return vec4(mix(color,original.rgb,smoothstep(0.0,.25,1.0-value.a)),original.a);
      }
      vec4 ol_sampleScene(vec2 uv) {
        if (ol_sceneGrid.x < 1.01) return texture2DLod(sceneTexture, uv, 0.0);
        vec4 original = texture2DLod(sceneTexture, uv, 0.0);
        if (ol_preserveSubjects > .5 && original.a > .001) return original;
        vec2 pixel = uv / sceneTextureInvRes;
        vec2 coordinate = (pixel - ol_sceneGrid.yz) / ol_sceneGrid.x;
        vec2 cell = floor(coordinate);
        vec2 center = (cell + .5) * ol_sceneGrid.x + ol_sceneGrid.yz;
        if (ol_sceneGrid.w < .5) {
          vec4 value = ol_gridCell(center);
          return ol_reconstructScene(value,original);
        }
        // At a moving cell boundary integrate one display pixel's coverage.
        // The flat cell interiors stay sharp; fractional translation does not
        // suddenly replace a whole physical column of color.
        vec2 shifted = coordinate - .5;
        vec2 blend = clamp((fract(shifted) - .5) * ol_sceneGrid.x + .5, 0.0, 1.0);
        vec2 nearCenter = (floor(shifted) + .5) * ol_sceneGrid.x + ol_sceneGrid.yz;
        vec4 value = mix(mix(ol_gridCell(nearCenter),
                       ol_gridCell(nearCenter + vec2(ol_sceneGrid.x,0.0)), blend.x),
                   mix(ol_gridCell(nearCenter + vec2(0.0,ol_sceneGrid.x)),
                       ol_gridCell(nearCenter + vec2(ol_sceneGrid.x)), blend.x), blend.y);
        return ol_reconstructScene(value,original);
      }
    `,
    );
    this.update();
  }
  setTreatment(mode: ArtTreatment['sceneGrid'], detail: ArtTreatment['subjectDetail']): void {
    this.mode = mode;
    this.preserveSubjects = detail === 'preserve';
    this.update();
  }
  update(): void {
    const anchored = this.mode.startsWith('anchored') || this.mode === 'metres30';
    const enabled = anchored || this.mode.startsWith('pixels');
    const scale = this.mode.endsWith('3') ? 3 : 2;
    // A fixed orthographic surface scale enlarges the same grid when zooming.
    this.pixelSize =
      anchored && this.camera.projection === pc.PROJECTION_ORTHOGRAPHIC
        ? ((this.mode === 'metres30' ? 1 / 30 : 0.025 * scale) * this.device.height) /
          (2 * this.camera.orthoHeight)
        : scale;
    this.grid.fill(0);
    this.grid[0] = enabled ? Math.max(1, this.pixelSize) : 0;
    if (anchored && this.camera.projection === pc.PROJECTION_ORTHOGRAPHIC) {
      this.camera.worldToScreen(this.origin, this.screen);
      const rect = this.device.clientRect;
      this.grid[1] = ((this.screen.x / rect.width) * this.device.width) % this.grid[0]!;
      this.grid[2] = ((1 - this.screen.y / rect.height) * this.device.height) % this.grid[0]!;
      this.grid[3] = 1;
    }
    this.device.scope.resolve('ol_sceneGrid').setValue(this.grid);
    this.device.scope.resolve('ol_preserveSubjects').setValue(this.preserveSubjects ? 1 : 0);
  }
  diagnostics() {
    return {
      mode: this.mode,
      pixelsPerCell: this.grid[0],
      phase: [this.grid[1], this.grid[2]],
      orthographicAnchoring: this.grid[3] === 1,
      preserveSubjects: this.preserveSubjects,
    };
  }
  destroy(): void {
    this.chunks.set('composePS', this.original);
    this.chunks.set('composeDeclarationsPS', this.originalDeclarations);
    this.grid.fill(0);
    this.device.scope.resolve('ol_sceneGrid').setValue(this.grid);
  }
}
