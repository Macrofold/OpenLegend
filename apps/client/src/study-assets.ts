import selections from './props/art-study/selections.json';
import catalogs from 'virtual:openlegend-study-catalogs/runtime';
import { assetUrl } from './asset-files';

/** Finite, offline-authored study exports. Exact references do not fetch models;
 * the scene's existing model owner loads only the selected appearances. */
export interface StudyAsset {
  url: string;
  animationUrl?: string;
  depletedUrl?: string;
  width: number;
  height: number;
  depth: number;
}
export const studyAssets = new Map<string, StudyAsset>();
for (const catalog of catalogs)
  for (const asset of catalog.assets) {
    const prefix = `apps/client/src/props/art-study/${catalog.group}/`;
    studyAssets.set('study:' + asset.id, {
      url: assetUrl(prefix + asset.file),
      animationUrl: asset.animatedFile ? assetUrl(prefix + asset.animatedFile) : undefined,
      depletedUrl: asset.depletedFile ? assetUrl(prefix + asset.depletedFile) : undefined,
      width: asset.bounds.max[0]! - asset.bounds.min[0]!,
      height: asset.bounds.max[1]! - asset.bounds.min[1]!,
      depth: asset.bounds.max[2]! - asset.bounds.min[2]!,
    });
  }

/** Current art comparison, applied only in presentation. The retained profile
 * keeps the previous source models available without changing a saved world. */
const selectedAppearances = new Map(Object.entries(selections));
export const studyAppearance = (appearance: string, sources: 'retained' | 'natural') =>
  sources === 'natural' ? (selectedAppearances.get(appearance) ?? appearance) : appearance;
