/// <reference types="vite/client" />

declare module 'virtual:openlegend-assets' {
  import type { ArtifactReference, AssetRevisionReference } from '@open-legend/assets';
  export const files: Readonly<Record<string, ArtifactReference>>;
  /** Every file in the selected release, including private ones `files` leaves out. */
  export const releaseFileCount: number;
  export const releaseSha256: string;
  export const release: AssetRevisionReference;
  export const delivery: {
    runtimeBaseUrl?: string;
    studyBaseUrl?: string;
    studyViewerBaseUrl?: string;
  };
}

declare module 'virtual:openlegend-study-catalogs/all' {
  const catalogs: readonly import('./study-catalog').StudyCatalog[];
  export default catalogs;
}

declare module 'virtual:openlegend-study-catalogs/runtime' {
  const catalogs: readonly import('./study-catalog').StudyCatalog<
    import('./study-catalog').RuntimeStudyCatalogAsset
  >[];
  export default catalogs;
}
