import { readAssetJson } from '../../asset-files';

interface IconArtwork {
  body: string;
  viewBox: string;
  set: string;
  source: string;
  license: string;
  author?: string;
  url?: string;
}

/** One reviewed catalog request is shared without suspending unrelated renderer
 * modules. The ordinary React entrypoint awaits preparation before mounting its
 * UI; unavailable optional artwork retains the accessible letter fallback. */
const icons: Record<string, IconArtwork> = {};
export const iconCatalogReady = readAssetJson<Record<string, IconArtwork>>(
  'apps/client/src/design-system/icons/icons.json',
  AbortSignal.timeout(15000),
)
  .then((loaded) => {
    Object.assign(icons, loaded);
  })
  .catch((error: unknown) => {
    console.warn('Interface artwork unavailable; using letter symbols.', error);
  });

export default icons;
