import selections from './props/art-study/selections.json';
import catalogs from 'virtual:openlegend-study-catalogs/runtime';
import { assetUrl } from './asset-files';
import type { Stride } from './characters/gait';
import type { ArtworkAttribution } from './study-catalog';

/** Finite, offline-authored study exports. Exact references do not fetch models;
 * the scene's existing model owner loads only the selected appearances. */
export interface StudyAsset {
  url: string;
  animationUrl?: string;
  strides?: readonly Stride[];
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
      strides: asset.strides,
      depletedUrl: asset.depletedFile ? assetUrl(prefix + asset.depletedFile) : undefined,
      width: asset.bounds.max[0]! - asset.bounds.min[0]!,
      height: asset.bounds.max[1]! - asset.bounds.min[1]!,
      depth: asset.bounds.max[2]! - asset.bounds.min[2]!,
    });
  }

/** Current art comparison, applied only in presentation. The retained profile
 * keeps the previous source models available without changing a saved world. */
const selectedAppearances = new Map(Object.entries(selections));
export const studyAppearance = (appearance: string, sources: 'retained' | 'natural') => {
  const selected = sources === 'natural' ? selectedAppearances.get(appearance) : undefined;
  // Retain the authored choice for a later published release, while the current
  // game uses its installed depiction rather than requesting an unshipped study.
  return selected && studyAssets.has(selected) ? selected : appearance;
};

/** Every credit the shipped artwork's licenses require, once per work. Retained comparison
 * models ship too and can be shown, so their credits stay listed. */
export const artworkCredits: readonly ArtworkAttribution[] = [
  ...new Map(
    catalogs
      .flatMap((catalog) => catalog.attribution ?? [])
      .map((credit) => [JSON.stringify(credit), credit]),
  ).values(),
].sort((a, b) => a.creator.localeCompare(b.creator) || a.work.localeCompare(b.work));
