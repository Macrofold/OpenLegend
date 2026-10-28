import { readAssetJson } from '../../asset-files';

export interface IconArtwork {
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
export const gildmossIcons: Record<string, IconArtwork> = {};
export const iconMetalDefinitions = { body: '' };
export const iconCatalogReady = readAssetJson<{
  shared: Record<string, IconArtwork>;
  gildmoss: Record<string, IconArtwork>;
  metal: string;
}>('apps/client/src/design-system/gildmoss/icons/runtime-catalog.json', AbortSignal.timeout(15000))
  .then(({ shared, gildmoss, metal }) => {
    Object.assign(icons, shared);
    Object.assign(gildmossIcons, gildmoss);
    // New semantic keys also have a monochrome representation in older themes.
    // Existing artwork remains unchanged outside the Gildmoss theme.
    for (const [key, artwork] of Object.entries(gildmoss))
      if (!Object.hasOwn(icons, key)) icons[key] = artwork;
    iconMetalDefinitions.body = metal;
  })
  .catch((error: unknown) => {
    console.warn('Interface artwork unavailable; using letter symbols.', error);
  });

export default icons;
