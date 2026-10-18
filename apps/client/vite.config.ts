import { defineConfig, type Plugin, type UserConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertAssetIndex, assetUrl, type AssetIndex } from '@open-legend/assets';
import type {
  RuntimeStudyCatalogAsset,
  StudyCatalog,
  StudyCatalogAsset,
} from './src/study-catalog.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const workspace = fileURLToPath(new URL('../..', import.meta.url));
const assetsModule = '\0openlegend-assets';
const catalogsModule = '\0openlegend-study-catalogs';

function deliveryProjection(
  studies: boolean,
  indexPath: string,
  localAssetDelivery: boolean,
): Plugin {
  const deliveryPath = resolve(workspace, 'assets/delivery.json');
  const configurationPath = resolve(
    process.env['OPEN_LEGEND_ASSET_CONFIG'] ?? resolve(workspace, 'assets/config.json'),
  );
  const catalogsPath = resolve(root, 'src/props/art-study');
  let selectedIndex: AssetIndex | undefined;
  function readDelivery(): {
    runtimeBaseUrl?: string;
    studyBaseUrl?: string;
    studyViewerBaseUrl?: string;
    sourcePages?: Record<string, string>;
  } {
    const delivery = existsSync(deliveryPath) ? JSON.parse(readFileSync(deliveryPath, 'utf8')) : {};
    const configuration = existsSync(configurationPath)
      ? JSON.parse(readFileSync(configurationPath, 'utf8'))
      : {};
    if (configuration.runtimeEnvironment === 'development' && delivery.runtimeBaseUrl) {
      if (delivery.runtimeBaseUrl !== 'https://assets.openlegend.ai')
        throw new Error('Development delivery requires the selected canonical public asset host.');
      delivery.runtimeBaseUrl += '/development';
    }
    if (delivery.studyViewerBaseUrl) {
      const viewer = new URL(delivery.studyViewerBaseUrl);
      const studies = new URL(delivery.studyBaseUrl);
      if (
        viewer.protocol !== 'https:' ||
        viewer.origin !== studies.origin ||
        viewer.username ||
        viewer.password ||
        viewer.search ||
        viewer.hash ||
        !viewer.pathname.startsWith(studies.pathname.replace(/\/$/, '') + '/public/viewers/') ||
        !viewer.pathname.endsWith('/')
      )
        throw new Error(
          'The study viewer must be a credential-free exact page directory on the configured study origin.',
        );
    }
    return delivery;
  }
  function readIndex(): AssetIndex {
    if (selectedIndex) return selectedIndex;
    const index: unknown = JSON.parse(readFileSync(indexPath, 'utf8'));
    assertAssetIndex(index);
    selectedIndex = index;
    return selectedIndex;
  }
  function readCatalogs(
    all: boolean,
    watch: (path: string) => void,
  ): StudyCatalog<RuntimeStudyCatalogAsset>[] {
    const delivery = readDelivery();
    return readdirSync(catalogsPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && (all || entry.name.startsWith('source-')))
      .filter((entry) => existsSync(resolve(catalogsPath, entry.name, 'catalog.json')))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => {
        const path = resolve(catalogsPath, entry.name, 'catalog.json');
        watch(path);
        const catalog = JSON.parse(readFileSync(path, 'utf8')) as StudyCatalog & {
          sourceFile?: string;
        };
        // Explicitly project presentation fields: catalog recipes and original
        // local source paths are not part of either browser's public manifest.
        const project = (asset: StudyCatalogAsset) =>
          all
            ? ({
                id: asset.id,
                family: asset.family,
                label: asset.label,
                variant: asset.variant,
                description: asset.description,
                recommended: asset.recommended,
                file: asset.file,
                fileGroup: asset.fileGroup,
                animatedFile: asset.animatedFile,
                depletedFile: asset.depletedFile,
                bounds: asset.bounds,
                triangles: asset.triangles,
                vertices: asset.vertices,
                textureSizes: asset.textureSizes,
                source:
                  asset.source.startsWith('/') || asset.source.startsWith('file:')
                    ? 'Retained source control; provenance is recorded in the authoring catalog.'
                    : asset.source,
              } satisfies StudyCatalogAsset)
            : {
                id: asset.id,
                file: asset.file,
                animatedFile: asset.animatedFile,
                depletedFile: asset.depletedFile,
                bounds: asset.bounds,
              };
        return {
          group: catalog.group,
          sourcePage:
            all && catalog.sourceFile
              ? localAssetDelivery
                ? '/__asset-records/' + encodeURIComponent(catalog.sourceFile)
                : delivery.sourcePages?.[catalog.sourceFile]
              : undefined,
          assets: catalog.assets.map(project),
          controls: all ? catalog.controls?.map(project) : undefined,
        };
      });
  }
  return {
    name: 'openlegend-asset-delivery',
    enforce: 'pre',
    watchChange(id) {
      if (id === indexPath) selectedIndex = undefined;
    },
    transformIndexHtml(html) {
      // The public asset host serves the inspection tools, not a game service.
      // Keep local navigation useful without inventing a hosted game address.
      return studies && !localAssetDelivery
        ? html.replace(/<a\s+data-local-game-link\b[^>]*>[\s\S]*?<\/a>/g, '')
        : html;
    },
    generateBundle() {
      if (studies)
        this.emitFile({
          type: 'asset',
          fileName: 'asset-release.json',
          source: JSON.stringify({ release: readIndex().release }),
        });
    },
    resolveId(id) {
      if (id === 'virtual:openlegend-assets') return assetsModule;
      if (id === 'virtual:openlegend-study-catalogs/all') return catalogsModule + ':all';
      if (id === 'virtual:openlegend-study-catalogs/runtime') return catalogsModule + ':runtime';
    },
    load(id) {
      if (id === assetsModule) {
        this.addWatchFile(indexPath);
        if (existsSync(deliveryPath)) this.addWatchFile(deliveryPath);
        if (existsSync(configurationPath)) this.addWatchFile(configurationPath);
        const index = readIndex();
        const files = Object.fromEntries(
          Object.entries(index.files).filter(
            ([, reference]) =>
              reference.accessDomain === 'public' &&
              (reference.boundary === 'runtime' ||
                (studies && reference.boundary === 'art-studies')),
          ),
        );
        const configured = readDelivery();
        const delivery = {
          runtimeBaseUrl: localAssetDelivery ? undefined : configured.runtimeBaseUrl,
          studyBaseUrl: studies && !localAssetDelivery ? configured.studyBaseUrl : undefined,
          studyViewerBaseUrl: studies ? './' : configured.studyViewerBaseUrl,
        };
        return `export const files = ${JSON.stringify(files)};\nexport const release = ${JSON.stringify(index.release)};\nexport const releaseSha256 = ${JSON.stringify(index.release.manifestSha256)};\nexport const delivery = ${JSON.stringify(delivery)};`;
      }
      if (id.startsWith(catalogsModule))
        return `export default ${JSON.stringify(readCatalogs(id.endsWith(':all'), (path) => this.addWatchFile(path)))};`;
    },
    config() {
      if (localAssetDelivery) return;
      return {
        css: {
          postcss: {
            plugins: [
              {
                postcssPlugin: 'openlegend-exact-public-fonts',
                Declaration(declaration: { value: string }) {
                  if (!declaration.value.includes('/__assets/')) return;
                  const index = readIndex();
                  const delivery = readDelivery();
                  declaration.value = declaration.value.replace(
                    /\/__assets\/([^'"\s)]+)/g,
                    (original, encodedPath: string) => {
                      const reference = index.files[decodeURIComponent(encodedPath)];
                      if (!reference || reference.accessDomain !== 'public') return original;
                      const base =
                        reference.boundary === 'runtime'
                          ? delivery.runtimeBaseUrl
                          : delivery.studyBaseUrl;
                      return base ? assetUrl(reference, base) : original;
                    },
                  );
                },
              },
            ],
          },
        },
      };
    },
  };
}

export function clientViteConfiguration(
  options: { studies?: boolean; indexPath?: string; localAssetDelivery?: boolean } = {},
): UserConfig {
  const studies = options.studies ?? false;
  const input: Record<string, string> = studies
    ? { study: `${root}art-study.html`, worldStudy: `${root}scene-study.html` }
    : { game: `${root}index.html` };
  return {
    root,
    base: studies ? './' : '/',
    plugins: [
      deliveryProjection(
        studies,
        resolve(
          options.indexPath ??
            resolve(
              workspace,
              studies ? 'assets/locks/studies.json' : 'assets/locks/development.json',
            ),
        ),
        options.localAssetDelivery ?? false,
      ),
    ],
    server: { fs: { allow: [workspace] } },
    build: {
      outDir: `${workspace}/dist/${studies ? 'studies' : 'client'}`,
      emptyOutDir: true,
      target: 'es2022',
      rolldownOptions: {
        input,
        // Font URLs intentionally resolve through the verified asset service,
        // rather than becoming generated files in the application build.
        external: (id) => id.startsWith('/__assets/'),
      },
    },
  };
}

export default defineConfig(({ mode, command }) =>
  clientViteConfiguration({ studies: mode === 'studies', localAssetDelivery: command === 'serve' }),
);
