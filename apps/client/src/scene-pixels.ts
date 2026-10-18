import * as pc from 'playcanvas';
import type { ArtTreatment } from './art-treatment';

/** Presentation calibration, not a mechanical size rule. Small props/animals
 * need more samples to retain identifying features; adults keep the shared grid. */
export const needsFinePixels = (width: number, height: number, depth: number): boolean =>
  Math.max(width, height, depth) <= 1.6;

export function markPixelDetail(material: pc.StandardMaterial, device: pc.GraphicsDevice): void {
  const output =
    material.shaderChunks.glsl.get('outputAlphaPS') ??
    pc.ShaderChunks.get(device).get('outputAlphaPS')!;
  material.shaderChunks.glsl.set(
    'outputAlphaPS',
    output + '\n#if LIT_BLEND_TYPE == NONE\n gl_FragColor.a = 0.5;\n#endif\n',
  );
}

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
  private fineSubjects = false;
  private detailMultiplier = 1;
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
      uniform float ol_fineSubjects;
      uniform float ol_detailMultiplier;
      vec4 ol_gridCell(vec2 center, float size, float fine) {
        vec2 texel = sceneTextureInvRes;
        // Integrate the cell's interior before enlargement, rather than pick a
        // single fine source fragment that can flash as coverage changes.
        vec2 radius = vec2(size * .25) * texel;
        vec2 uv = center * texel;
        vec4 a = texture2DLod(sceneTexture, uv + radius, 0.0);
        vec4 b = texture2DLod(sceneTexture, uv - radius, 0.0);
        vec4 c = texture2DLod(sceneTexture, uv + radius * vec2(1.0,-1.0), 0.0);
        vec4 d = texture2DLod(sceneTexture, uv + radius * vec2(-1.0,1.0), 0.0);
        if (ol_preserveSubjects < .5 && ol_fineSubjects < .5) return .25 * (a+b+c+d);
        vec4 weights = 1.0 - clamp(vec4(a.a,b.a,c.a,d.a),0.0,1.0);
        if (ol_fineSubjects > .5) {
          vec4 marked = 1.0 - smoothstep(.08,.25,abs(vec4(a.a,b.a,c.a,d.a)-.5));
          weights = mix(1.0-marked,marked,fine);
        }
        float total = dot(weights,vec4(1.0));
        // Retain color numerator and scenery coverage through interpolation.
        // Normalizing an empty cell to black before interpolation creates halos.
        return .25 * vec4(a.rgb*weights.x+b.rgb*weights.y+c.rgb*weights.z+d.rgb*weights.w,total);
      }
      vec4 ol_reconstructScene(vec4 value, vec4 original) {
        if (ol_preserveSubjects < .5 && ol_fineSubjects < .5) return value;
        vec3 color = value.rgb / max(value.a,.0001);
        return vec4(mix(color,original.rgb,smoothstep(0.0,.25,1.0-value.a)),original.a);
      }
      vec4 ol_sampleScene(vec2 uv) {
        if (ol_sceneGrid.x < 1.01) return texture2DLod(sceneTexture, uv, 0.0);
        vec4 original = texture2DLod(sceneTexture, uv, 0.0);
        if (ol_preserveSubjects > .5 && original.a > .001) return original;
        float fine = ol_fineSubjects * (1.0-step(.2,abs(original.a-.5)));
        float size = max(1.0,ol_sceneGrid.x / mix(1.0,ol_detailMultiplier,fine));
        if (size < 1.01) return original;
        vec2 pixel = uv / sceneTextureInvRes;
        vec2 coordinate = (pixel - ol_sceneGrid.yz) / size;
        vec2 cell = floor(coordinate);
        vec2 center = (cell + .5) * size + ol_sceneGrid.yz;
        if (ol_sceneGrid.w < .5) {
          vec4 value = ol_gridCell(center,size,fine);
          return ol_reconstructScene(value,original);
        }
        // At a moving cell boundary integrate one display pixel's coverage.
        // The flat cell interiors stay sharp; fractional translation does not
        // suddenly replace a whole physical column of color.
        vec2 shifted = coordinate - .5;
        vec2 blend = clamp((fract(shifted) - .5) * size + .5, 0.0, 1.0);
        vec2 nearCenter = (floor(shifted) + .5) * size + ol_sceneGrid.yz;
        vec4 value = mix(mix(ol_gridCell(nearCenter,size,fine),
                       ol_gridCell(nearCenter + vec2(size,0.0),size,fine), blend.x),
                   mix(ol_gridCell(nearCenter + vec2(0.0,size),size,fine),
                       ol_gridCell(nearCenter + vec2(size),size,fine), blend.x), blend.y);
        return ol_reconstructScene(value,original);
      }
    `,
    );
    this.update();
  }
  setTreatment(mode: ArtTreatment['sceneGrid'], detail: ArtTreatment['subjectDetail']): void {
    this.mode = mode;
    this.preserveSubjects = detail === 'preserve';
    this.fineSubjects = detail === 'small' || detail === 'balanced';
    this.detailMultiplier = detail === 'small' ? 3 : detail === 'balanced' ? 2 : 1;
    this.update();
  }
  update(): void {
    const density =
      this.mode === 'metres30'
        ? 30
        : this.mode === 'metres40'
          ? 40
          : this.mode === 'metres64'
            ? 64
            : 0;
    const anchored = this.mode.startsWith('anchored') || density > 0;
    const enabled = anchored || this.mode.startsWith('pixels');
    const scale = this.mode.endsWith('3') ? 3 : 2;
    // The camera owner also retains its focus-plane half-height in orthoHeight
    // for perspective. Keep density fixed there while zooming; depth still
    // changes perspective coverage away from that plane.
    this.pixelSize = anchored
      ? ((density ? 1 / density : 0.025 * scale) * this.device.height) /
        (2 * this.camera.orthoHeight)
      : scale;
    this.grid.fill(0);
    this.grid[0] = enabled ? Math.max(1, this.pixelSize) : 0;
    this.grid[3] = anchored ? 1 : 0;
    if (anchored && this.camera.projection === pc.PROJECTION_ORTHOGRAPHIC) {
      this.camera.worldToScreen(this.origin, this.screen);
      const rect = this.device.clientRect;
      this.grid[1] = ((this.screen.x / rect.width) * this.device.width) % this.grid[0]!;
      this.grid[2] = ((1 - this.screen.y / rect.height) * this.device.height) % this.grid[0]!;
      this.grid[3] = 1;
    }
    this.device.scope.resolve('ol_sceneGrid').setValue(this.grid);
    this.device.scope.resolve('ol_preserveSubjects').setValue(this.preserveSubjects ? 1 : 0);
    this.device.scope.resolve('ol_fineSubjects').setValue(this.fineSubjects ? 1 : 0);
    this.device.scope.resolve('ol_detailMultiplier').setValue(this.detailMultiplier);
  }
  diagnostics() {
    return {
      mode: this.mode,
      pixelsPerCell: this.grid[0],
      phase: [this.grid[1], this.grid[2]],
      orthographicAnchoring:
        this.grid[3] === 1 && this.camera.projection === pc.PROJECTION_ORTHOGRAPHIC,
      densityPlane:
        this.camera.projection === pc.PROJECTION_ORTHOGRAPHIC
          ? 'whole orthographic view'
          : 'camera focus plane',
      preserveSubjects: this.preserveSubjects,
      smallSubjectDensityMultiplier: this.detailMultiplier,
    };
  }
  destroy(): void {
    this.chunks.set('composePS', this.original);
    this.chunks.set('composeDeclarationsPS', this.originalDeclarations);
    this.grid.fill(0);
    this.device.scope.resolve('ol_sceneGrid').setValue(this.grid);
  }
}
