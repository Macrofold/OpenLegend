import * as pc from 'playcanvas';

/** Finite local comparisons for the bundled wilderness art study. No saved
 * world or provider settings. docs/projects/3d-pixel-art-first-scene-plan.md */
export interface ArtTreatment {
  materials: 'original' | 'regions';
  lighting: 'smooth' | 'hard' | 'soft';
  sampling: '40' | '60' | '80' | '96' | 'native';
  filtering: 'nearest' | 'mip';
  edges: 'none' | 'silhouette' | 'depth';
  motion: 'smooth' | 'held8' | 'held12';
  cloth: 'flowing' | 'settled';
  environment: 'baseline' | 'grouped';
  vegetation: 'still' | 'smooth' | 'held';
  atmosphere: 'baseline' | 'restrained';
  effects: 'direct' | 'buffer';
  actionFixture: boolean;
}
export const baselineArt: Readonly<ArtTreatment> = Object.freeze({
  materials: 'original',
  lighting: 'smooth',
  sampling: '96',
  filtering: 'nearest',
  edges: 'none',
  motion: 'smooth',
  cloth: 'flowing',
  environment: 'baseline',
  vegetation: 'still',
  atmosphere: 'baseline',
  effects: 'direct',
  actionFixture: false,
});
export const candidateArt: Readonly<ArtTreatment> = Object.freeze({
  ...baselineArt,
  materials: 'regions',
  lighting: 'soft',
  environment: 'grouped',
  vegetation: 'smooth',
  atmosphere: 'restrained',
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
    this.settings[0] = style.materials === 'regions' ? 1 : 0;
    this.settings[1] = style.lighting === 'smooth' ? 0 : style.lighting === 'hard' ? 1 : 2;
    this.settings[2] = 0.055;
    this.device.scope.resolve('ol_artStyle').setValue(this.settings);
  }
  prepare(material: pc.StandardMaterial, role = 0): void {
    if (this.prepared.has(material) || !material.useLighting) return;
    this.prepared.add(material);
    const chunks = pc.ShaderChunks.get(this.device);
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
    sampling: ['40', '60', '80', '96', 'native'],
    filtering: ['nearest', 'mip'],
    edges: ['none', 'silhouette', 'depth'],
    motion: ['smooth', 'held8', 'held12'],
    cloth: ['flowing', 'settled'],
    environment: ['baseline', 'grouped'],
    vegetation: ['still', 'smooth', 'held'],
    atmosphere: ['baseline', 'restrained'],
    effects: ['direct', 'buffer'],
  };
  const controls = new Map<keyof ArtTreatment, HTMLSelectElement>();
  const refresh = () => {
    for (const [key, select] of controls) select.value = String(current()[key]);
  };
  for (const [key, values] of Object.entries(fields)) {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;justify-content:space-between;gap:16px;margin-top:8px';
    label.append(document.createTextNode(key));
    const select = document.createElement('select');
    for (const value of values) {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(value);
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
  fixture.onclick = () => apply({ ...current(), actionFixture: !current().actionFixture });
  panel.append(fixture);
  document.body.append(panel);
  refresh();
  return () => panel.remove();
}
