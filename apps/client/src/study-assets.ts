/** Finite, offline-authored study exports. URL imports do not fetch the models;
 * the scene's existing model owner loads only the selected appearances. */
interface Catalog {
  group: string;
  assets: {
    id: string;
    file: string;
    animatedFile?: string;
    depletedFile?: string;
    bounds: { min: number[]; max: number[] };
  }[];
}
export interface StudyAsset {
  url: string;
  animationUrl?: string;
  depletedUrl?: string;
  width: number;
  height: number;
  depth: number;
}
const files = import.meta.glob<string>('./props/art-study/source-*/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});
const catalogs = import.meta.glob<Catalog>('./props/art-study/source-*/catalog.json', {
  eager: true,
  import: 'default',
});
export const studyAssets = new Map<string, StudyAsset>();
for (const catalog of Object.values(catalogs))
  for (const asset of catalog.assets) {
    const prefix = `./props/art-study/${catalog.group}/`;
    studyAssets.set('study:' + asset.id, {
      url: files[prefix + asset.file]!,
      animationUrl: asset.animatedFile ? files[prefix + asset.animatedFile] : undefined,
      depletedUrl: asset.depletedFile ? files[prefix + asset.depletedFile] : undefined,
      width: asset.bounds.max[0]! - asset.bounds.min[0]!,
      height: asset.bounds.max[1]! - asset.bounds.min[1]!,
      depth: asset.bounds.max[2]! - asset.bounds.min[2]!,
    });
  }
