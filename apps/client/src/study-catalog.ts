/** Public presentation fields only. Authoring paths, recipes and private lineage
 * stay in the original catalogs and never enter the game/viewer build. */
export interface RuntimeStudyCatalogAsset {
  id: string;
  file: string;
  animatedFile?: string;
  /** The animated file's stride clips with the ground speeds `art-tool.py clips` measured on
   * it; re-measure when the file changes. The game paces them to travel (characters/gait.ts). */
  strides?: { name: string; groundSpeed: number; seconds: number }[];
  depletedFile?: string;
  bounds: { min: number[]; max: number[] };
}

export interface StudyCatalogAsset extends RuntimeStudyCatalogAsset {
  family: string;
  label: string;
  variant: string;
  description: string;
  recommended: boolean;
  fileGroup?: string;
  triangles: number;
  vertices: number;
  textureSizes: number[][];
  source: string;
}

/** A credit the source's license requires wherever its artwork is shown (Settings → Credits). */
export interface ArtworkAttribution {
  work: string;
  creator: string;
  url: string;
  license: string;
  licenseUrl: string;
  /** OpenLegend's changes, which the license asks a credit to state. */
  changes: string;
}

export interface StudyCatalog<Asset extends RuntimeStudyCatalogAsset = StudyCatalogAsset> {
  group: string;
  sourcePage?: string;
  attribution?: ArtworkAttribution[];
  assets: Asset[];
  controls?: Asset[];
}
