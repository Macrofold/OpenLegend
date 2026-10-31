import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { assetUrl, readAssetJson } from '../asset-files';
import './gildmoss-kit.css';

type Edges = [number, number, number, number];
interface KitPart {
  files: { '1x': { path: string }; '2x': { path: string } };
  size: [number, number];
  slice: Edges;
  outset?: Edges;
  designSize?: [number, number];
  minSize?: [number, number];
  alpha?: number;
}
interface KitCatalog {
  parts: Record<string, KitPart>;
  needTrack: {
    background: string;
    rim: string;
    rimWidth: number;
    radius: number;
    fillInset: number;
    fillTopShade: number;
  };
}

function image(part: KitPart): string {
  const url = (density: '1x' | '2x') =>
    assetUrl(part.files[density].path.replace(/^exports\//, ''));
  return `image-set(url("${url('1x')}") 1x, url("${url('2x')}") 2x)`;
}

const kitLoad = new AbortController();
const kitSignal = AbortSignal.any([kitLoad.signal, AbortSignal.timeout(15000)]);
/** Frame and control metadata are shared for the document. JadeGlass owns
 * native seeded material; no repeated texture or baked glint is prepared. */
export const gildmossKitReady = readAssetJson<KitCatalog>(
  'apps/client/src/design-system/art/gildmoss/gildmoss.json',
  kitSignal,
)
  .then(({ parts, needTrack }) => {
    const values: Record<string, string> = {};
    const required = (id: string): KitPart => {
      const part = parts[id];
      if (!part) throw new Error(`Gildmoss production part is unavailable: ${id}`);
      return part;
    };
    const frame = (name: string, part: KitPart) => {
      values[`${name}-image`] = image(part);
      values[`${name}-slice`] = part.slice.join(' ');
      if (part.minSize) {
        values[`${name}-min-width`] = `${part.minSize[0]}px`;
        values[`${name}-min-height`] = `${part.minSize[1]}px`;
      }
      values[`${name}-width`] = part.slice.map((value) => `${value}px`).join(' ');
      values[`${name}-outset`] = (part.outset ?? [0, 0, 0, 0])
        .map((value) => `${value}px`)
        .join(' ');
    };
    const ornateFrame = required('filigree.frame');
    frame('filigree-frame', ornateFrame);
    values['viewport-inset'] = `${Math.max(...(ornateFrame.outset ?? [0]))}px`;
    const designHeight = required('crest.button-normal').designSize?.[1];
    if (!designHeight) throw new Error('Gildmoss button is missing its designed height.');
    for (const state of ['normal', 'hover', 'pressed', 'unavailable']) {
      const part = required(`crest.button-${state}`);
      values[`button-${state}`] = image(part);
      values[`button-${state}-slice`] = part.slice.join(' ');
      values[`button-${state}-width`] = part.slice
        .map((value) => `calc(var(--gildmoss-button-height, 32px) * ${value / designHeight})`)
        .join(' ');
      values[`button-${state}-outset`] = (part.outset ?? [0, 0, 0, 0])
        .map((value) => `calc(var(--gildmoss-button-height, 32px) * ${value / designHeight})`)
        .join(' ');
    }
    const ornament = required('crest.button-label-ornament');
    values['button-ornament'] = image(ornament);
    values['button-ornament-width'] =
      `calc(var(--gildmoss-button-height, 32px) * ${ornament.size[0] / designHeight})`;
    values['button-ornament-height'] =
      `calc(var(--gildmoss-button-height, 32px) * ${ornament.size[1] / designHeight})`;
    const declarations = Object.entries(values)
      .map(([name, value]) => `--gildmoss-kit-${name}: ${value};`)
      .join('\n');
    const need = Object.entries(needTrack)
      .filter(([key]) => key !== 'note')
      .map(
        ([key, value]) =>
          `--gildmoss-need-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`,
      )
      .join('\n');
    const style = document.createElement('style');
    style.dataset.gildmossKit = 'true';
    style.textContent = `[data-theme='gildmoss'] {\n${declarations}\n${need}\n}`;
    document.head.append(style);
  })
  .catch((error: unknown) => {
    kitLoad.abort();
    console.warn('Gildmoss panel artwork unavailable; retaining plain reading surfaces.', error);
  });

/** Positioners work in physical viewport pixels, while frame outsets follow
 * the surface's logical CSS pixels. Reserve its exact selected art perimeter;
 * surfaces without this material retain their existing viewport allowance. */
export function gildmossViewportInset(element: HTMLElement, minimum: number): number {
  const logical = Number.parseFloat(
    getComputedStyle(element).getPropertyValue('--gildmoss-kit-viewport-inset'),
  );
  if (!logical) return minimum;
  const scale = element.offsetWidth
    ? element.getBoundingClientRect().width / element.offsetWidth
    : 1;
  return Math.max(minimum, logical * scale);
}

/** Keep the shared Button's live label and interaction node intact. Measuring
 * its actual height also covers wrapped modal labels, rather than assuming every
 * secondary button keeps the nominal control height. No frame/timer polling. */
export function CrestButtonLabel({ children }: { children: ReactNode }) {
  const label = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const text = label.current;
    const button = text?.closest('button');
    if (!text || !button || button.dataset.variant !== 'secondary') return;
    const update = () => {
      const height = button.offsetHeight;
      if (!height) return;
      const rect = button.getBoundingClientRect();
      const bounds = text.getBoundingClientRect();
      const scale = rect.height / height;
      const previous = text.previousElementSibling?.getBoundingClientRect();
      const next = text.nextElementSibling?.getBoundingClientRect();
      const left = previous?.right ?? rect.left;
      const right = next?.left ?? rect.right;
      const space = ((15 * height) / 61 + 8) * scale;
      const ornaments = bounds.left - left >= space && right - bounds.right >= space;
      const size = `${height}px`;
      if (button.style.getPropertyValue('--gildmoss-button-height') !== size)
        button.style.setProperty('--gildmoss-button-height', size);
      if (button.dataset.crestOrnaments !== String(ornaments))
        button.dataset.crestOrnaments = String(ornaments);
    };
    const observer = new ResizeObserver(update);
    observer.observe(button);
    observer.observe(text);
    update();
    return () => observer.disconnect();
  }, []);
  return (
    <span ref={label} className="ol-btn-label">
      {children}
    </span>
  );
}
