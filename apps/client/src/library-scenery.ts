import * as pc from 'playcanvas';
import type { SceneryInstance } from '@open-legend/spatial';
import { ArtMaterials, type ArtTreatment } from './art-treatment';
import { SceneryCameraOcclusion, prepareSceneryNormals } from './environment-art';
import { ShadowMaterial } from './shadow-material';
import { sceneryStencil, setVisibilityStencil } from './visibility-stencil';
import { markPixelEnvironment } from './scene-pixels';

type Library = 'kenney' | 'quaternius' | 'study';
interface GeometryPart {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
  material: string;
}
interface Shape {
  parts: GeometryPart[];
  bounds: { min: number[]; max: number[] };
}
interface MaterialArt {
  baseColor: number[];
  alphaCutoff?: number;
  doubleSided?: boolean;
  texture?: string;
  paintedTexture?: string;
  canopyNormals?: boolean;
}
interface PixelArt {
  width: number;
  height: number;
  rgba: number[];
}
interface SceneryArt {
  shapes: Record<string, Shape>;
  materials: Record<string, MaterialArt>;
  textures: Record<string, PixelArt>;
}
const sources = import.meta.glob<SceneryArt>('./props/library-environment/scenery-*.json', {
  import: 'default',
});

/** Licensed source meshes are prepared once and instanced at the existing
 * scenery feet/envelopes. This owner has no placement or native world authority. */
export class LibraryScenery {
  private readonly sources = new Map<Library, SceneryArt>();
  private readonly pending = new Map<Library, Promise<boolean>>();
  private readonly materialArt = new Map<string, MaterialArt>();
  private readonly pixelArt = new Map<string, PixelArt>();
  private disposed = false;
  private readonly textures = new Map<string, pc.Texture>();
  private readonly materials = new Map<string, pc.StandardMaterial>();
  private readonly meshes = new Map<Shape, pc.Mesh[]>();
  private painted = true;
  constructor(
    private readonly app: pc.Application,
    private readonly treatment: ArtMaterials,
    private readonly sun: pc.Light,
  ) {}
  /** Import only the requested comparison. Geometry and GPU resources remain
   * owned by this scene; a late import cannot revive a destroyed scene. */
  load(family: Library): Promise<boolean> {
    if (this.sources.has(family)) return Promise.resolve(false);
    const pending = this.pending.get(family);
    if (pending) return pending.then(() => false);
    const request = sources[`./props/library-environment/scenery-${family}.json`]!()
      .then((source) => {
        if (this.disposed) return false;
        this.sources.set(family, source);
        for (const [key, value] of Object.entries(source.materials))
          this.materialArt.set(key, value);
        for (const [key, value] of Object.entries(source.textures)) this.pixelArt.set(key, value);
        return true;
      })
      .finally(() => this.pending.delete(family));
    this.pending.set(family, request);
    return request;
  }
  setTreatment(style: Readonly<ArtTreatment>): void {
    this.painted = style.surfaceArt === 'painted';
    for (const [key, material] of this.materials)
      this.setPaint(material, this.materialArt.get(key)!);
  }
  private texture(id: string): pc.Texture {
    const existing = this.textures.get(id);
    if (existing) return existing;
    const pixels = this.pixelArt.get(id)!;
    const canvas = document.createElement('canvas');
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas
      .getContext('2d')!
      .putImageData(
        new ImageData(new Uint8ClampedArray(pixels.rgba), pixels.width, pixels.height),
        0,
        0,
      );
    const texture = new pc.Texture(this.app.graphicsDevice, {
      name: 'Library pixel artwork · ' + id,
      width: pixels.width,
      height: pixels.height,
      format: pc.PIXELFORMAT_SRGBA8,
      mipmaps: true,
      minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
      magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_REPEAT,
      addressV: pc.ADDRESS_REPEAT,
      flipY: false,
    });
    texture.setSource(canvas);
    this.textures.set(id, texture);
    return texture;
  }
  private setPaint(material: pc.StandardMaterial, entry: MaterialArt): void {
    const texture = this.painted ? (entry.paintedTexture ?? entry.texture) : entry.texture;
    material.diffuseMap = texture ? this.texture(texture) : null;
    // Source and painted versions retain identical UV alpha, including shadow cutouts.
    material.opacityMap = entry.alphaCutoff && entry.texture ? this.texture(entry.texture) : null;
    material.update();
  }
  private material(id: string): pc.StandardMaterial {
    const existing = this.materials.get(id);
    if (existing) return existing;
    const entry = this.materialArt.get(id)!;
    const material = new ShadowMaterial(this.sun);
    material.name = 'Library scenery · ' + id;
    material.diffuse.set(entry.baseColor[0]!, entry.baseColor[1]!, entry.baseColor[2]!).gamma();
    material.diffuseVertexColor = true;
    material.opacity = entry.baseColor[3] ?? 1;
    material.alphaTest = entry.alphaCutoff ?? 0;
    material.opacityMapChannel = 'a';
    material.cull = entry.doubleSided ? pc.CULLFACE_NONE : pc.CULLFACE_BACK;
    material.twoSidedLighting = !entry.canopyNormals && (entry.doubleSided ?? false);
    material.useMetalness = true;
    material.metalness = 0;
    material.specular.set(0.015, 0.015, 0.015);
    setVisibilityStencil(material, sceneryStencil);
    prepareSceneryNormals(material, this.app.graphicsDevice);
    this.treatment.prepare(material);
    markPixelEnvironment(material, this.app.graphicsDevice);
    this.setPaint(material, entry);
    this.materials.set(id, material);
    return material;
  }
  create(family: Library, appearance: string, instances: readonly SceneryInstance[]) {
    const shape = this.sources.get(family)?.shapes[appearance];
    if (!shape) return null;
    let meshes = this.meshes.get(shape);
    if (!meshes) {
      meshes = shape.parts.map((part) => {
        const mesh = new pc.Mesh(this.app.graphicsDevice);
        mesh.setPositions(part.positions);
        mesh.setNormals(part.normals);
        mesh.setUvs(0, part.uvs);
        mesh.setColors(part.colors);
        mesh.setIndices(part.indices);
        mesh.update();
        mesh.incRefCount();
        return mesh;
      });
      this.meshes.set(shape, meshes);
    }
    const transforms = new Float32Array(instances.length * 16);
    const matrix = new pc.Mat4(),
      rotation = new pc.Quat(),
      scale = new pc.Vec3(),
      position = new pc.Vec3();
    const localBounds = new pc.BoundingBox();
    const [minX, minY, minZ] = shape.bounds.min,
      [maxX, maxY, maxZ] = shape.bounds.max;
    localBounds.setMinMax(new pc.Vec3(minX, minY, minZ), new pc.Vec3(maxX, maxY, maxZ));
    const bounds = new pc.BoundingBox();
    const worldBounds = new pc.BoundingBox();
    const occluding = instances.map((instance, index) => {
      const p = instance.position;
      rotation.setFromEulerAngles(
        0,
        Math.sin(p.x * 12.9898 + p.z * 78.233 + instance.seed) * 360,
        0,
      );
      matrix.setTRS(
        position.set(p.x, p.y, p.z),
        rotation,
        scale.set(instance.width, instance.height, instance.width),
      );
      transforms.set(matrix.data, index * 16);
      worldBounds.setFromTransformedAabb(localBounds, matrix);
      if (index === 0) bounds.copy(worldBounds);
      else bounds.add(worldBounds);
      return {
        inverse: matrix.clone().invert(),
        bounds: { min: worldBounds.getMin().clone(), max: worldBounds.getMax().clone() },
      };
    });
    const buffer = new pc.VertexBuffer(
      this.app.graphicsDevice,
      pc.VertexFormat.getDefaultInstancingFormat(this.app.graphicsDevice),
      instances.length,
      { data: transforms, usage: pc.BUFFER_STATIC },
    );
    const meshInstances = shape.parts.map((part, index) => {
      const instance = new pc.MeshInstance(meshes[index]!, this.material(part.material));
      instance.setInstancing(buffer, true);
      instance.setCustomAabb(bounds);
      instance.castShadow = instances[0]?.castShadows ?? false;
      instance.receiveShadow = true;
      return instance;
    });
    const occlusion = shape.parts.map((part) => {
      const material = this.materialArt.get(part.material)!;
      const pixels = material.texture ? this.pixelArt.get(material.texture) : undefined;
      const alpha =
        pixels && material.alphaCutoff
          ? { ...pixels, uvs: part.uvs, cutoff: material.alphaCutoff }
          : undefined;
      return new SceneryCameraOcclusion(
        part.positions,
        part.indices,
        occluding,
        { min: bounds.getMin().clone(), max: bounds.getMax().clone() },
        alpha,
      );
    });
    return { meshInstances, buffer, bounds, occlusion };
  }
  diagnostics() {
    return {
      templates: this.meshes.size,
      materials: this.materials.size,
      textures: this.textures.size,
      loadedChoices: [...this.sources.keys()],
      pendingChoices: this.pending.size,
    };
  }
  destroy(): void {
    this.disposed = true;
    this.sources.clear();
    this.materialArt.clear();
    this.pixelArt.clear();
    for (const meshes of this.meshes.values())
      for (const mesh of meshes) {
        mesh.decRefCount();
        if (mesh.refCount === 0) mesh.destroy();
      }
    this.meshes.clear();
    for (const material of this.materials.values()) material.destroy();
    this.materials.clear();
    for (const texture of this.textures.values()) texture.destroy();
    this.textures.clear();
  }
}
