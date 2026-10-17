import * as pc from 'playcanvas';

/** Finite local comparisons for the bundled wilderness art study. No saved
 * world or provider settings. docs/projects/3d-pixel-art-first-scene-plan.md */
export interface ArtTreatment {
  materials: 'original' | 'regions';
  lighting: 'smooth' | 'hard' | 'soft';
  sampling: '40' | '60' | '80' | '96' | 'native' | 'screen';
  sceneGrid:
    | 'full'
    | 'half'
    | 'third'
    | 'pixels2'
    | 'pixels3'
    | 'anchored2'
    | 'anchored3'
    | 'metres30'
    | 'metres40'
    | 'metres64';
  surfaceArt: 'plain' | 'painted' | 'rigid';
  surfaceEdges: 'sharp' | 'filtered';
  coverage: 'none' | 'msaa4';
  subjectDetail: 'shared' | 'preserve' | 'small' | 'balanced';
  foliageLight: 'original' | 'diffuse';
  shadowSampling: 'screen' | 'fixed';
  filtering: 'source' | 'nearest' | 'mip';
  characterFiltering: 'source' | 'nearest' | 'mip';
  mercenaryArt:
    | 'original'
    | 'faithful'
    | 'painted'
    | 'graphic'
    | 'restored'
    | 'tailored'
    | 'embroidered';
  hareArt: 'sprite' | 'field' | 'russet' | 'winter';
  edges: 'none' | 'silhouette' | 'depth';
  motion: 'smooth' | 'held8' | 'held12';
  cloth: 'flowing' | 'settled';
  environment: 'baseline' | 'grouped' | 'kenney' | 'quaternius' | 'study' | 'canopy';
  groundPalette: 'meadow' | 'woodland' | 'understory';
  vegetation: 'still' | 'smooth' | 'held';
  atmosphere: 'baseline' | 'restrained' | 'survival';
  effects: 'direct' | 'buffer';
  prop: 'authored' | 'generated' | 'carved' | 'banded' | 'cache' | 'grounded';
  actionFixture: boolean;
}
export const baselineArt: Readonly<ArtTreatment> = Object.freeze({
  materials: 'original',
  lighting: 'smooth',
  sampling: '96',
  sceneGrid: 'full',
  surfaceArt: 'plain',
  surfaceEdges: 'sharp',
  coverage: 'none',
  subjectDetail: 'shared',
  foliageLight: 'original',
  shadowSampling: 'screen',
  filtering: 'source',
  characterFiltering: 'source',
  mercenaryArt: 'original',
  hareArt: 'sprite',
  edges: 'none',
  motion: 'smooth',
  cloth: 'flowing',
  environment: 'baseline',
  groundPalette: 'meadow',
  vegetation: 'still',
  atmosphere: 'baseline',
  effects: 'direct',
  prop: 'authored',
  actionFixture: false,
});
export const candidateArt: Readonly<ArtTreatment> = Object.freeze({
  ...baselineArt,
  materials: 'regions',
  lighting: 'soft',
  environment: 'canopy',
  mercenaryArt: 'restored',
  sampling: 'screen',
  sceneGrid: 'metres30',
  hareArt: 'field',
  groundPalette: 'understory',
  vegetation: 'still',
  atmosphere: 'survival',
  subjectDetail: 'balanced',
  foliageLight: 'diffuse',
  motion: 'held12',
  prop: 'grounded',
  surfaceArt: 'rigid',
  cloth: 'settled',
  surfaceEdges: 'filtered',
  coverage: 'msaa4',
  characterFiltering: 'mip',
  shadowSampling: 'fixed',
});

/** Extend the same StandardMaterial programs used by ordinary/reveal/shadow
 * owners. One uniform update switches the comparison without repainting art. */
export class ArtMaterials {
  private readonly settings = new Float32Array(3);
  private readonly prepared = new WeakSet<pc.StandardMaterial>();
  constructor(private readonly device: pc.GraphicsDevice) {
    this.update(baselineArt);
  }
  update(style: Readonly<ArtTreatment>): void {
    this.device.scope
      .resolve('ol_groundContrast')
      .setValue(style.groundPalette === 'understory' ? 0.3 : 1);
    this.device.scope.resolve('ol_foliageLight').setValue(style.foliageLight === 'diffuse' ? 1 : 0);
    this.settings[0] = style.materials === 'regions' ? 1 : 0;
    this.settings[1] = style.lighting === 'smooth' ? 0 : style.lighting === 'hard' ? 1 : 2;
    this.settings[2] = 0.055;
    this.device.scope.resolve('ol_artStyle').setValue(this.settings);
    this.device.scope
      .resolve('ol_surfaceEnabled')
      .setValue(style.surfaceArt === 'painted' ? 1 : style.surfaceArt === 'rigid' ? 2 : 0);
    this.device.scope
      .resolve('ol_surfaceEdges')
      .setValue(style.surfaceEdges === 'filtered' ? 1 : 0);
    this.device.scope
      .resolve('ol_fixedShadowPattern')
      .setValue(style.shadowSampling === 'fixed' ? 1 : 0);
  }
  prepare(material: pc.StandardMaterial, role = 0): void {
    if (this.prepared.has(material) || !material.useLighting) return;
    this.prepared.add(material);
    // These overrides extend the installed 2.22 shader signatures.
    material.shaderChunks.version = '2.22';
    const chunks = pc.ShaderChunks.get(this.device);
    // Directional and local PCSS use different chunks/seeds. Both otherwise
    // rotate their sample pattern as a surface crosses display coordinates.
    const shadowUniform =
      '#ifndef OL_FIXED_SHADOW_PATTERN\n#define OL_FIXED_SHADOW_PATTERN\nuniform float ol_fixedShadowPattern;\n#endif\n';
    for (const [chunk, seed] of [
      ['shadowPCSSPS', 'noise( gl_FragCoord.xy )'],
      ['shadowSoftPS', 'fractSinRand(gl_FragCoord.xy)'],
    ] as const)
      material.shaderChunks.glsl.set(
        chunk,
        shadowUniform +
          chunks.get(chunk)!.replaceAll(seed, `(ol_fixedShadowPattern > .5 ? 0.0 : ${seed})`),
      );
    const diffuse = material.shaderChunks.glsl.get('diffusePS') ?? chunks.get('diffusePS')!;
    if (role === 1) {
      const declarations = material.shaderChunks.glsl.get('litUserDeclarationVS') ?? '';
      const end = material.shaderChunks.glsl.get('litUserMainEndVS') ?? '';
      material.shaderChunks.glsl.set(
        'litUserDeclarationVS',
        declarations + '\nvarying vec3 ol_restPosition;',
      );
      material.shaderChunks.glsl.set(
        'litUserMainEndVS',
        'ol_restPosition = vertex_position.xyz;\n' + end,
      );
    }
    const bodyPaint =
      role === 1
        ? `
      if(ol_restPosition.y > 1.64) return;
      float h=ol_restPosition.y;
      float outerArm=smoothstep(.25,.34,abs(ol_restPosition.x));
      vec3 mail=vec3(.075,.105,.105);
      vec3 leather=vec3(.20,.09,.035);
      vec3 linen=vec3(.39,.34,.22);
      vec3 base=h<.21?vec3(.085,.05,.026):h<.57?linen:h<1.07?leather:mail;
      float skin=smoothstep(.16,.32,c.r-c.b)*smoothstep(.17,.36,c.r);
      base=mix(base,c,outerArm*skin);
      // Broad authored garment zones stay attached to source vertices. Sparse
      // stitches suggest mail while flat fields describe its main form.
      vec2 cell=floor(ol_restPosition.xy*38.0);
      float stitch=step(.94,fract(sin(dot(cell,vec2(12.99,78.23)))*43758.54));
      if(h>1.07&&h<1.58&&outerArm<.1)base+=stitch*.022;
      dAlbedo=base;
    `
        : '';

    material.shaderChunks.glsl.set(
      'diffusePS',
      diffuse.replace('void getAlbedo()', 'void ol_sourceAlbedo()') +
        `
      #ifndef OL_ART_UNIFORM
      #define OL_ART_UNIFORM
      uniform vec3 ol_artStyle;
      #endif
      uniform float ol_artRole;
      ${role === 1 ? 'varying vec3 ol_restPosition;' : ''}
      void getAlbedo() {
        ol_sourceAlbedo();
        if (ol_artStyle.x < .5 || ol_artRole < .5) return;
        vec3 c = dAlbedo;
        float l = dot(c, vec3(.2126,.7152,.0722));
        if (ol_artRole > 1.5) {
          // The authored cape keeps its red field and sparse gold embroidery.
          float gold = smoothstep(.20,.55,c.g / max(c.r,.001));
          dAlbedo = mix(vec3(.24,.025,.018),vec3(.53,.25,.045),gold);
        } else {
          ${bodyPaint}
        }
      }
    `,
    );
    material.setParameter('ol_artRole', role);
    const lambert =
      material.shaderChunks.glsl.get('lightDiffuseLambertPS') ??
      chunks.get('lightDiffuseLambertPS')!;
    material.shaderChunks.glsl.set(
      'lightDiffuseLambertPS',
      lambert.replace('float getLightDiffuse(', 'float ol_sourceDiffuse(') +
        `
      #ifndef OL_ART_UNIFORM
      #define OL_ART_UNIFORM
      uniform vec3 ol_artStyle;
      #endif
      float getLightDiffuse(vec3 n, vec3 v, vec3 l) {
        float value = ol_sourceDiffuse(n,v,l);
        if (ol_artStyle.y < .5) return value;
        float width = ol_artStyle.y > 1.5 ? ol_artStyle.z : .0005;
        return .14 + .29*smoothstep(.19-width,.19+width,value)
          + .31*smoothstep(.49-width,.49+width,value)
          + .26*smoothstep(.79-width,.79+width,value);
      }
    `,
    );
    material.update();
  }
}

/** Optional developer panel, absent unless explicitly requested in a dev URL.
 * Its native labeled controls change presentation only; teardown owns listeners. */
export function mountArtControls(
  canvas: HTMLCanvasElement,
  apply: (style: ArtTreatment) => void,
  current: () => Readonly<ArtTreatment>,
): () => void {
  if (!import.meta.env.DEV || !new URLSearchParams(location.search).has('artLab')) return () => {};
  const panel = document.createElement('details');
  panel.style.cssText =
    'position:fixed;right:12px;top:74px;z-index:30;background:#18251f;color:#eee4cb;padding:10px;max-height:75vh;overflow:auto;font:13px sans-serif;';
  const title = document.createElement('summary');
  title.textContent = 'Art comparisons';
  panel.append(title);
  const fields: { [K in keyof ArtTreatment]?: readonly ArtTreatment[K][] } = {
    materials: ['original', 'regions'],
    lighting: ['smooth', 'hard', 'soft'],
    sampling: ['40', '60', '80', '96', 'native', 'screen'],
    sceneGrid: [
      'full',
      'half',
      'third',
      'pixels2',
      'pixels3',
      'anchored2',
      'anchored3',
      'metres30',
      'metres40',
      'metres64',
    ],
    surfaceArt: ['plain', 'painted', 'rigid'],
    surfaceEdges: ['sharp', 'filtered'],
    coverage: ['none', 'msaa4'],
    subjectDetail: ['balanced', 'small', 'shared', 'preserve'],
    foliageLight: ['diffuse', 'original'],
    shadowSampling: ['screen', 'fixed'],
    filtering: ['source', 'nearest', 'mip'],
    characterFiltering: ['source', 'nearest', 'mip'],
    mercenaryArt: [
      'restored',
      'tailored',
      'embroidered',
      'original',
      'faithful',
      'painted',
      'graphic',
    ],
    hareArt: ['sprite', 'field', 'russet', 'winter'],
    edges: ['none', 'silhouette', 'depth'],
    motion: ['smooth', 'held8', 'held12'],
    cloth: ['flowing', 'settled'],
    environment: ['canopy', 'study', 'baseline', 'grouped', 'kenney', 'quaternius'],
    groundPalette: ['understory', 'meadow', 'woodland'],
    vegetation: ['still', 'smooth', 'held'],
    atmosphere: ['survival', 'restrained', 'baseline'],
    effects: ['direct', 'buffer'],
    prop: ['grounded', 'carved', 'banded', 'cache', 'authored', 'generated'],
  };
  const controls = new Map<keyof ArtTreatment, HTMLSelectElement>();
  const labels: Record<string, string> = {
    materials: 'Surface art',
    lighting: 'Light transitions',
    sampling: 'Character detail',
    sceneGrid: 'Scene sampling',
    surfaceArt: 'Environment surface art',
    surfaceEdges: 'Painted pixel edges',
    coverage: 'Silhouette coverage',
    subjectDetail: 'People and small-object detail',
    foliageLight: 'Leaf light response',
    shadowSampling: 'Soft-shadow sample pattern',
    filtering: 'Sprite texture filtering',
    characterFiltering: 'Character texture filtering',
    mercenaryArt: 'Mercenary artwork',
    hareArt: 'Hare artwork',
    edges: 'Character edges',
    motion: 'Walking poses',
    cloth: 'Cape movement',
    environment: 'Environment shapes',
    groundPalette: 'Ground palette',
    vegetation: 'Grass movement',
    atmosphere: 'Color and bloom',
    effects: 'Effects drawing',
    prop: 'Crate appearance',
  };
  const refresh = () => {
    for (const [key, select] of controls) select.value = String(current()[key]);
    fixture.setAttribute('aria-pressed', String(current().actionFixture));
  };
  for (const [key, values] of Object.entries(fields)) {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;justify-content:space-between;gap:16px;margin-top:8px';
    label.append(document.createTextNode(labels[key]!));
    const select = document.createElement('select');
    for (const value of values) {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent =
        value === 'native'
          ? '378 rows (detail control)'
          : value === 'screen'
            ? 'Full displayed detail (before scene sampling)'
            : value === 'pixels2'
              ? 'Single final grid: 2 display pixels'
              : value === 'pixels3'
                ? 'Single final grid: 3 display pixels'
                : value === 'anchored2'
                  ? 'World-anchored grid: 5 cm (orthographic)'
                  : value === 'anchored3'
                    ? 'World-anchored grid: 7.5 cm (orthographic)'
                    : value === 'metres30' || value === 'metres40'
                      ? `Fixed world density: ${value.slice(6)} samples/metre`
                      : String(value);
      select.append(option);
    }
    select.onchange = () => apply({ ...current(), [key]: select.value });
    label.append(select);
    panel.append(label);
    controls.set(key as keyof ArtTreatment, select);
  }
  for (const [name, style] of [
    ['Baseline', baselineArt],
    ['Candidate', candidateArt],
  ] as const) {
    const button = document.createElement('button');
    button.textContent = name;
    button.onclick = () => {
      apply({ ...style });
      refresh();
    };
    panel.append(button);
  }
  const fixture = document.createElement('button');
  fixture.textContent = 'Toggle staged motion (visual fixture)';
  fixture.setAttribute('aria-pressed', String(current().actionFixture));
  fixture.onclick = () => {
    apply({ ...current(), actionFixture: !current().actionFixture });
    refresh();
  };
  panel.append(fixture);
  const study = document.createElement('a');
  study.href = '/art-study.html';
  study.textContent = 'Open the Blender pixel-art study';
  study.style.cssText = 'display:block;margin-top:12px;color:inherit';
  panel.append(study);
  document.body.append(panel);
  refresh();
  return () => panel.remove();
}
