/** Public presentation fields only. Authoring paths, recipes and private lineage
 * stay in the original catalogs and never enter the game/viewer build. */
export interface RuntimeStudyCatalogAsset {
  id: string;
  file: string;
  animatedFile?: string;
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

export interface StudyCatalog<Asset extends RuntimeStudyCatalogAsset = StudyCatalogAsset> {
  group: string;
  sourcePage?: string;
  assets: Asset[];
  controls?: Asset[];
}
