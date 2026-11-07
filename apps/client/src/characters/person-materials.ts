import * as pc from 'playcanvas';
import { artifactReferenceKey } from '@open-legend/assets';
import type { AppearanceRecipe } from '@open-legend/protocol';
import { assetUrl, readAssetBytes } from '../asset-files';
import { ArtMaterials } from '../art-treatment';
import { ShadowMaterial } from '../shadow-material';
import { personStencil, setVisibilityStencil } from '../visibility-stencil';
import {
  requiredPersonValue,
  type CompiledPersonFamily,
  type PersonMaterial,
  type PersonTexture,
} from './person-family';

interface TextureEntry {
  references: number;
  abort: AbortController;
  ready: Promise<pc.Texture>;
  texture?: pc.Texture;
  bitmap?: ImageBitmap;
}
interface TextureLease {
  ready: Promise<pc.Texture>;
  release(): void;
}

/** Shared immutable maps use the existing exact-release reader. A wearer retains
 * only its current pair and one pending pair; unreferenced maps are released. */
export class PersonTextures {
  private readonly entries = new Map<string, TextureEntry>();
  private disposed = false;
  constructor(private readonly device: pc.GraphicsDevice) {}

  acquire(source: PersonTexture, linearData = false): TextureLease {
    if (this.disposed) throw new Error('Appearance texture owner was destroyed.');
    const key = JSON.stringify([artifactReferenceKey(source.reference), linearData]);
    let entry = this.entries.get(key);
    if (!entry) {
      const abort = new AbortController();
      const created: TextureEntry = {
        references: 0,
        abort,
        ready: Promise.resolve()
          .then(async () => {
            const bytes = await readAssetBytes(
              assetUrl(source.path),
              abort.signal,
              source.reference,
            );
            const bitmap = await createImageBitmap(
              new Blob([bytes], { type: source.reference.mediaType }),
              {
                // Compiler UVs retain Blender's bottom-origin convention. glTF
                // exports flip V, but this direct-mesh consumer does not.
                imageOrientation: 'flipY',
                premultiplyAlpha: 'none',
                colorSpaceConversion: 'none',
              },
            );
            if (this.disposed || abort.signal.aborted || created.references === 0) {
              bitmap.close();
              throw new Error('Appearance texture request ended.');
            }
            const texture = new pc.Texture(this.device, {
              name: source.path,
              width: bitmap.width,
              height: bitmap.height,
              format: linearData ? pc.PIXELFORMAT_RGBA8 : pc.PIXELFORMAT_SRGBA8,
              flipY: false,
              addressU: pc.ADDRESS_CLAMP_TO_EDGE,
              addressV: pc.ADDRESS_CLAMP_TO_EDGE,
              minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
              magFilter: pc.FILTER_LINEAR,
              mipmaps: true,
            });
            // The pinned engine supports ImageBitmap; its declarations omit it.
            texture.setSource(bitmap as unknown as HTMLImageElement);
            created.texture = texture;
            created.bitmap = bitmap;
            return texture;
          })
          .catch((error: unknown) => {
            if (this.entries.get(key) === created) this.entries.delete(key);
            throw error;
          }),
      };
      entry = created;
      this.entries.set(key, entry);
    }
    entry.references++;
    let released = false;
    return {
      ready: entry.ready,
      release: () => {
        if (released) return;
        released = true;
        entry.references--;
        if (entry.references) return;
        entry.abort.abort();
        entry.texture?.destroy();
        entry.bitmap?.close();
        entry.texture = undefined;
        entry.bitmap = undefined;
        if (this.entries.get(key) === entry) this.entries.delete(key);
      },
    };
  }

  diagnostics() {
    return {
      maps: this.entries.size,
      gpuBytes: [...this.entries.values()].reduce(
        (sum, entry) => sum + (entry.texture?.gpuSize ?? 0),
        0,
      ),
      decodedBytes: [...this.entries.values()].reduce(
        (sum, entry) => sum + (entry.bitmap ? entry.bitmap.width * entry.bitmap.height * 4 : 0),
        0,
      ),
    };
  }

  destroy(): void {
    this.disposed = true;
    for (const entry of this.entries.values()) {
      entry.abort.abort();
      entry.texture?.destroy();
      entry.bitmap?.close();
      entry.texture = undefined;
      entry.bitmap = undefined;
    }
    this.entries.clear();
  }
}

interface SkinFinish {
  lowerColor?: PersonTexture;
  upperColor?: PersonTexture;
  lowerNormal?: PersonTexture;
  upperNormal?: PersonTexture;
  blend: number;
}

function finishAt(material: PersonMaterial, age: number): SkinFinish {
  const samples = Object.entries(material.ageMaps ?? {})
    .map(([age, maps]) => ({ age: Number(age), maps }))
    .sort((a, b) => a.age - b.age);
  if (!samples.length)
    return { lowerColor: material.colorTexture, lowerNormal: material.normalTexture, blend: 0 };
  const upperIndex = samples.findIndex((sample) => sample.age >= age);
  const upper = requiredPersonValue(
    samples[upperIndex === -1 ? samples.length - 1 : upperIndex],
    'upper age finish',
  );
  const lower = requiredPersonValue(
    samples[Math.max(0, upperIndex === -1 ? samples.length - 1 : upperIndex - 1)],
    'lower age finish',
  );
  return {
    lowerColor: lower.maps.color,
    upperColor: upper.maps.color,
    lowerNormal: lower.maps.normal ?? material.normalTexture,
    upperNormal: upper.maps.normal ?? material.normalTexture,
    blend: upper.age === lower.age ? 0 : (age - lower.age) / (upper.age - lower.age),
  };
}

function finishKey(finishes: ReadonlyMap<string, SkinFinish>): string {
  return JSON.stringify(
    [...finishes].map(([id, finish]) => [
      id,
      ...[finish.lowerColor, finish.upperColor, finish.lowerNormal, finish.upperNormal].map(
        (source) => (source ? artifactReferenceKey(source.reference) : null),
      ),
    ]),
  );
}

interface PreparedMaterial {
  material: ShadowMaterial;
  tint: Float32Array;
  age: Float32Array;
}
interface MaterialRequest {
  key: string;
  leases: Map<string, TextureLease[]>;
  recipe: AppearanceRecipe;
  ready?: Promise<boolean>;
  commit?: { current(): boolean; install(): void };
}

/** Materials and uniforms are private to one wearer. Its reveal/hover copies
 * deliberately retain these uniform arrays through PlayCanvas Material.copy. */
export class PersonMaterials {
  readonly values = new Map<string, PreparedMaterial>();
  private current?: MaterialRequest;
  private pending?: MaterialRequest;
  private disposed = false;

  private release(request: MaterialRequest | undefined): void {
    if (!request) return;
    request.commit = undefined;
    for (const leases of request.leases.values()) for (const lease of leases) lease.release();
    request.leases.clear();
  }

  cancelPreparation(): void {
    this.release(this.pending);
    this.pending = undefined;
  }

  /** Removal releases only maps no longer used by the displayed covered wearer.
   * Pending replacements retain their separate leases until committed or cancelled. */
  retain(materialIds: readonly string[]): void {
    const keep = new Set(materialIds);
    if (this.current) {
      for (const [id, leases] of this.current.leases)
        if (!keep.has(id)) {
          leases.forEach((lease) => lease.release());
          this.current.leases.delete(id);
        }
      const finishes = new Map(
        [...this.current.leases.keys()].map((id) => [
          id,
          finishAt(
            requiredPersonValue(this.family.materials[id], id),
            requiredPersonValue(
              this.current?.recipe.controls[this.family.ageControl],
              this.family.ageControl,
            ),
          ),
        ]),
      );
      this.current.key = finishKey(finishes);
    }
    const removed = [...this.values].filter(([id]) => !keep.has(id));
    if (removed.length) this.invalidate(removed.map(([, value]) => value.material));
    for (const [id, value] of removed) {
      value.material.destroy();
      this.values.delete(id);
    }
  }

  constructor(
    private readonly family: CompiledPersonFamily,
    private readonly textures: PersonTextures,
    private readonly device: pc.GraphicsDevice,
    private readonly invalidate: (materials: readonly pc.StandardMaterial[]) => void,
    private readonly sun?: pc.Light,
    private readonly art?: ArtMaterials,
  ) {}

  private create(id: string): PreparedMaterial {
    const source = this.family.materials[id];
    if (!source) throw new Error('The selected appearance material is missing.');
    const material = new ShadowMaterial(this.sun);
    material.name = `Person / ${id}`;
    material.diffuse.set(1, 1, 1);
    material.useMetalness = true;
    material.metalness = source.metallic;
    material.gloss = 1 - source.roughness;
    material.opacity = source.baseColor[3];
    setVisibilityStencil(material, personStencil);
    const tint = new Float32Array(source.baseColor);
    const age = new Float32Array([0, 0]);
    material.shaderChunks.version = '2.22';
    const chunks = pc.ShaderChunks.get(this.device);
    const diffuse = chunks.get('diffusePS');
    const normal = chunks.get('normalMapPS');
    if (!diffuse || !normal) throw new Error('Appearance material shader support is unavailable.');
    const ageUniform =
      '#ifndef OL_PERSON_AGE_UNIFORM\n#define OL_PERSON_AGE_UNIFORM\nuniform vec2 ol_personAge;\n#endif\n';
    material.shaderChunks.glsl.set(
      'diffusePS',
      `${ageUniform}uniform vec4 ol_personTint;\nuniform vec4 ol_personBaseTint;\nuniform sampler2D ol_personAgeColor;\n${source.tintMask ? 'uniform sampler2D ol_personTintMask;\n' : ''}${diffuse}`
        .replace('dAlbedo = material_diffuse.rgb;', 'dAlbedo = ol_personTint.rgb;')
        .replace(
          'dAlbedo *= albedoTexture;',
          `if (ol_personAge.x > 0.0) {\n  vec3 upper = {STD_DIFFUSE_TEXTURE_DECODE}(texture2DBias(ol_personAgeColor, {STD_DIFFUSE_TEXTURE_UV}, textureBias)).rgb;\n  albedoTexture = mix(albedoTexture, upper, ol_personAge.x);\n}\n${source.tintMask ? 'dAlbedo = mix(ol_personBaseTint.rgb, ol_personTint.rgb, texture2DBias(ol_personTintMask, {STD_DIFFUSE_TEXTURE_UV}, textureBias).r);\n' : ''}dAlbedo *= albedoTexture;`,
        ),
    );
    material.shaderChunks.glsl.set(
      'normalMapPS',
      `${ageUniform}uniform sampler2D ol_personAgeNormal;\n${normal}`.replace(
        'normalMap = mix(vec3(0.0, 0.0, 1.0), normalMap, material_bumpiness);',
        `if (ol_personAge.y > 0.0) {\n  vec3 upper = {STD_NORMAL_TEXTURE_DECODE}(texture2DBias(ol_personAgeNormal, {STD_NORMAL_TEXTURE_UV}, textureBias));\n  normalMap = normalize(mix(normalMap, upper, ol_personAge.y));\n}\nnormalMap = mix(vec3(0.0, 0.0, 1.0), normalMap, material_bumpiness);`,
      ),
    );
    material.setParameter('ol_personTint', tint);
    material.setParameter('ol_personBaseTint', new Float32Array(source.baseColor));
    material.setParameter('ol_personAge', age);
    this.art?.prepare(material);
    material.update();
    const result = { material, tint, age };
    this.values.set(id, result);
    return result;
  }

  material(id: string): pc.StandardMaterial {
    return (this.values.get(id) ?? this.create(id)).material;
  }

  private uniforms(recipe: AppearanceRecipe, finishes: ReadonlyMap<string, SkinFinish>): void {
    for (const [id, finish] of finishes) {
      const source = requiredPersonValue(this.family.materials[id], id);
      const prepared = this.values.get(id) ?? this.create(id);
      const selected = source.paletteSelectionRole
        ? requiredPersonValue(
            recipe.selections[source.paletteSelectionRole],
            source.paletteSelectionRole,
          )
        : undefined;
      // A declared choice must be authored. Substituting the neutral tint would
      // make a visible, supposedly supported creator option silently do nothing.
      prepared.tint.set(
        selected === undefined
          ? source.baseColor
          : requiredPersonValue(source.palettes?.[selected], selected),
      );
      if (source.colorBlend) {
        const control = requiredPersonValue(
          this.family.controls[source.colorBlend.control],
          source.colorBlend.control,
        );
        const value = requiredPersonValue(
          recipe.controls[source.colorBlend.control],
          source.colorBlend.control,
        );
        const span = control.bounds[1] - control.bounds[0];
        const amount = span === 0 ? 0 : (value - control.bounds[0]) / span;
        for (let channel = 0; channel < 4; channel++) {
          const tint = requiredPersonValue(prepared.tint[channel], 'tint channel');
          prepared.tint[channel] =
            tint +
            (requiredPersonValue(source.colorBlend.color[channel], 'blend channel') - tint) *
              amount;
        }
      }
      const blend = finishAt(source, recipe.controls[this.family.ageControl] ?? 0).blend;
      prepared.age[0] = finish.upperColor ? blend : 0;
      prepared.age[1] = finish.upperNormal ? blend : 0;
    }
  }

  /** Returns false for superseded work; callers must not mark an old age ready. */
  async prepare(
    recipe: AppearanceRecipe,
    materialIds: readonly string[],
    commit?: MaterialRequest['commit'],
  ): Promise<boolean> {
    if (this.disposed) return false;
    const finishes = new Map(
      materialIds.map((id) => {
        const source = this.family.materials[id];
        if (!source) throw new Error('The selected appearance material is missing.');
        return [id, finishAt(source, recipe.controls[this.family.ageControl] ?? 0)] as const;
      }),
    );
    const key = finishKey(finishes);
    if (this.current?.key === key) {
      this.cancelPreparation();
      if (commit && !commit.current()) return false;
      this.uniforms(recipe, finishes);
      this.current.recipe = recipe;
      commit?.install();
      return true;
    }
    if (this.pending?.key === key && this.pending.ready) {
      this.pending.recipe = recipe;
      this.pending.commit = commit;
      return this.pending.ready;
    }
    this.cancelPreparation();
    const request: MaterialRequest = { key, leases: new Map(), recipe, commit };
    this.pending = request;
    const take = (
      source: PersonTexture | undefined,
      id: string,
      linearData = false,
    ): Promise<pc.Texture | undefined> => {
      if (!source) return Promise.resolve(undefined);
      const lease = this.textures.acquire(source, linearData);
      requiredPersonValue(request.leases.get(id), id).push(lease);
      return lease.ready;
    };
    const ready = (async () => {
      try {
        const loaded = await Promise.all(
          [...finishes].map(async ([id, finish]) => {
            request.leases.set(id, []);
            return {
              id,
              maps: await Promise.all([
                take(finish.lowerColor, id),
                take(finish.upperColor, id),
                take(finish.lowerNormal, id, true),
                take(finish.upperNormal, id, true),
                take(requiredPersonValue(this.family.materials[id], id).tintMask, id, true),
              ]),
            };
          }),
        );
        if (this.disposed || this.pending !== request) return false;
        if (request.commit && !request.commit.current()) {
          this.cancelPreparation();
          return false;
        }
        const changed = loaded.map(({ id }) => (this.values.get(id) ?? this.create(id)).material);
        // Cached reveal/hover materials retain map objects, so replace those copies
        // at a map-pair boundary, never for continuous tint/blend changes.
        this.invalidate(changed);
        for (const {
          id,
          maps: [color, upperColor, normal, upperNormal, tintMask],
        } of loaded) {
          const material = (this.values.get(id) ?? this.create(id)).material;
          material.diffuseMap = color ?? null;
          material.normalMap = normal ?? null;
          const ageColor = upperColor ?? color;
          const ageNormal = upperNormal ?? normal;
          if (ageColor) material.setParameter('ol_personAgeColor', ageColor);
          if (ageNormal) material.setParameter('ol_personAgeNormal', ageNormal);
          if (tintMask) material.setParameter('ol_personTintMask', tintMask);
          material.update();
        }
        this.release(this.current);
        this.current = request;
        this.pending = undefined;
        this.uniforms(request.recipe, finishes);
        // Commit matching geometry in this same turn; another queued completion
        // cannot pair these uniforms with an older wearer's buffers.
        const commit = request.commit;
        request.commit = undefined;
        commit?.install();
        return true;
      } catch (error) {
        if (this.disposed || (this.pending !== request && this.current !== request)) return false;
        if (this.pending === request) {
          this.pending = undefined;
          this.release(request);
        }
        throw error;
      }
    })();
    request.ready = ready;
    return ready;
  }

  destroy(): void {
    this.disposed = true;
    this.release(this.pending);
    this.release(this.current);
    this.pending = this.current = undefined;
    this.invalidate([...this.values.values()].map(({ material }) => material));
    for (const { material } of this.values.values()) material.destroy();
    this.values.clear();
  }
}
