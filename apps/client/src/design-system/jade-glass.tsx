import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import {
  createBezelSvg,
  createGlassSvg,
  createLightMaskSvg,
  createPoolSvg,
  createStoneSvg,
  JADE_LIGHT,
  JADE_POOL_SCALE,
  JADE_TOP_LIGHT,
  type StoneVariant,
} from './jade-glass-material';
import './jade-glass.css';

interface GlassConfiguration {
  enabled: boolean;
  reduceMotion: boolean | undefined;
}
let configuration: GlassConfiguration = { enabled: false, reduceMotion: undefined };
const subscribers = new Set<() => void>();
const subscribe = (listener: () => void) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};
const snapshot = () => configuration;

/** The application's existing theme and motion preferences remain authoritative. */
export function configureJadeGlass(next: GlassConfiguration): void {
  if (next.enabled === configuration.enabled && next.reduceMotion === configuration.reduceMotion)
    return;
  configuration = next;
  for (const listener of subscribers) listener();
  refreshMotion();
}

interface Pool {
  element: HTMLCanvasElement;
  margin: number;
  x: number;
  y: number;
}
interface Surface {
  host: HTMLElement;
  root: HTMLSpanElement;
  drawing: HTMLSpanElement;
  pane: HTMLSpanElement;
  light: HTMLSpanElement;
  bezelLayer: HTMLSpanElement;
  halo: HTMLSpanElement;
  shaft: HTMLSpanElement;
  pools: Pool[];
  seed: number;
  stone: StoneVariant;
  bezel: boolean;
  radius?: number;
  width: number;
  height: number;
  builtWidth: number;
  builtHeight: number;
  builtNight?: boolean;
  resizedAt: number;
  visible: boolean;
  disposed: boolean;
  urls: string[];
  preparation?: AbortController;
  pointer?: { x: number; y: number };
}

const surfaces = new Map<HTMLElement, Surface>();
const dirty = new Set<Surface>();
const queue = new Set<Surface>();
const awake = new Set<Surface>();
let resizeObserver: ResizeObserver | undefined;
let intersectionObserver: IntersectionObserver | undefined;
let lightingObserver: MutationObserver | undefined;
let motionQuery: MediaQueryList | undefined;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let preparationFrame: number | undefined;
let preparing = false;
let animationFrame: number | undefined;
let lastFrame = 0;
let night = false;

function seedFor(identity: string): number {
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index++)
    hash = Math.imul(hash ^ identity.charCodeAt(index), 16777619);
  return ((hash >>> 0) % 2147483646) + 1;
}

function rendered(surface: Surface): boolean {
  return (
    !surface.disposed &&
    surface.visible &&
    surface.host.isConnected &&
    !surface.host.closest('[hidden]') &&
    !!surface.host.getClientRects().length &&
    getComputedStyle(surface.host).visibility !== 'hidden'
  );
}

function moving(): boolean {
  return (
    configuration.enabled &&
    !document.hidden &&
    !(configuration.reduceMotion || motionQuery?.matches)
  );
}

function wake(surface: Surface): void {
  awake.add(surface);
  if (animationFrame === undefined && !document.hidden)
    animationFrame = requestAnimationFrame(animate);
}

function refreshMotion(): void {
  for (const surface of surfaces.values()) {
    if (!moving()) {
      surface.pointer = undefined;
      for (const pool of surface.pools) {
        pool.x = pool.y = 0;
        pool.element.style.transform = '';
      }
      awake.delete(surface);
    } else wake(surface);
  }
}

function animate(now: number): void {
  animationFrame = undefined;
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
  lastFrame = now;
  const ease = 1 - Math.exp(-dt / JADE_LIGHT.lag);
  const live = moving();
  // Read every active box before writing transforms; pointer events never set React state.
  const measured = [...awake].map((surface) => ({
    surface,
    rect: rendered(surface) ? surface.host.getBoundingClientRect() : undefined,
  }));
  for (const { surface, rect } of measured) {
    if (!rect?.width || !rect.height || !surface.builtWidth || !surface.builtHeight) {
      awake.delete(surface);
      continue;
    }
    const point = live ? surface.pointer : undefined;
    // Client coordinates include CSS zoom. Pool transforms are local CSS pixels.
    const dx = point ? ((point.x - rect.left) / rect.width - 0.5) * surface.builtWidth : 0;
    const dy = point ? ((point.y - rect.top) / rect.height - 0.5) * surface.builtHeight : 0;
    const boost = Math.max(1, JADE_LIGHT.span / Math.max(surface.builtWidth, surface.builtHeight));
    let settled = true;
    surface.pools.forEach((pool, index) => {
      const layer = JADE_LIGHT.layers[index]!;
      const mx = pool.margin * surface.builtWidth * 0.8;
      const my = pool.margin * surface.builtHeight * 0.8;
      const x = Math.max(-mx, Math.min(mx, dx * layer.parallax * boost));
      const y = Math.max(-my, Math.min(my, dy * layer.parallax * boost));
      pool.x += (x - pool.x) * ease;
      pool.y += (y - pool.y) * ease;
      if (Math.abs(x - pool.x) < 0.1 && Math.abs(y - pool.y) < 0.1) {
        pool.x = x;
        pool.y = y;
      } else settled = false;
      pool.element.style.transform = `translate3d(${pool.x.toFixed(2)}px, ${pool.y.toFixed(2)}px, 0)`;
    });
    if (settled) awake.delete(surface);
  }
  if (awake.size && !document.hidden) animationFrame = requestAnimationFrame(animate);
  else lastFrame = 0;
}

function pointerMoved(event: PointerEvent): void {
  if (event.pointerType === 'touch' || !moving()) return;
  const path = event.composedPath();
  const pointed = [...surfaces.values()].filter((surface) => path.includes(surface.host));
  for (const surface of surfaces.values()) {
    let inside = pointed.includes(surface);
    // Character artwork's glass is deliberately click-through. Its decorative
    // regions can still respond when no overlapping reading surface owns the pointer.
    if (
      !inside &&
      !pointed.length &&
      surface.host.closest('.ol-character-panel') &&
      rendered(surface)
    ) {
      const rect = surface.host.getBoundingClientRect();
      inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
    }
    if (inside) {
      surface.pointer = { x: event.clientX, y: event.clientY };
      wake(surface);
    } else if (surface.pointer) {
      surface.pointer = undefined;
      wake(surface);
    }
  }
}

function pointerLeft(event: PointerEvent): void {
  if (event.type === 'pointerout' && event.relatedTarget) return;
  for (const surface of surfaces.values())
    if (surface.pointer) {
      surface.pointer = undefined;
      wake(surface);
    }
}

function enqueue(surface: Surface): void {
  if (surface.disposed || !surface.width || !surface.height || !rendered(surface)) return;
  queue.add(surface);
  runQueue();
}

function runQueue(): void {
  if (preparing || preparationFrame !== undefined || document.hidden) return;
  if (!queue.size) return;
  // One surface, including its two quarter-resolution pools, is prepared at a
  // time. A burst of popups cannot decode every filtered pane in one frame.
  preparationFrame = requestAnimationFrame(() => {
    preparationFrame = undefined;
    const surface = queue.values().next().value as Surface | undefined;
    if (!surface) return;
    queue.delete(surface);
    if (!rendered(surface)) {
      runQueue();
      return;
    }
    preparing = true;
    void prepare(surface).finally(() => {
      preparing = false;
      runQueue();
    });
  });
}

function settleSizes(): void {
  resizeTimer = undefined;
  const now = performance.now();
  let next = Infinity;
  for (const surface of dirty) {
    const remaining = 100 - (now - surface.resizedAt);
    if (remaining <= 0) {
      dirty.delete(surface);
      enqueue(surface);
    } else next = Math.min(next, remaining);
  }
  if (dirty.size) resizeTimer = setTimeout(settleSizes, next);
}

function changedSize(surface: Surface, width: number, height: number): void {
  if (width === surface.width && height === surface.height) return;
  surface.width = width;
  surface.height = height;
  surface.preparation?.abort();
  if (!width || !height) {
    dirty.delete(surface);
    queue.delete(surface);
    return;
  }
  if (
    width === surface.builtWidth &&
    height === surface.builtHeight &&
    surface.builtNight === night
  ) {
    // A retained reader can report zero while hidden. Reopening the same pane
    // needs neither another filter decode nor a delayed resize preparation.
    surface.drawing.style.transform = '';
    dirty.delete(surface);
    queue.delete(surface);
    if (!dirty.size && resizeTimer !== undefined) {
      clearTimeout(resizeTimer);
      resizeTimer = undefined;
    }
    wake(surface);
    return;
  }
  if (surface.builtWidth) {
    // Keep a built pane built while a drag/resize settles. Only its transform
    // scales briefly; expensive filters are regenerated once at the settled size.
    surface.drawing.style.transform = `scale(${width / surface.builtWidth}, ${height / surface.builtHeight})`;
    surface.resizedAt = performance.now();
    dirty.add(surface);
    if (resizeTimer === undefined) resizeTimer = setTimeout(settleSizes, 100);
  } else enqueue(surface);
}

function svgUrl(svg: string, urls: string[]): string {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  urls.push(url);
  return url;
}

async function decoded(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  signal.throwIfAborted();
  const image = new Image();
  let cancel: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => {
        image.removeAttribute('src');
        reject(signal.reason);
      };
      signal.addEventListener('abort', cancel, { once: true });
    });
    image.src = url;
    await Promise.race([image.decode(), cancelled]);
    signal.throwIfAborted();
    return image;
  } catch (error) {
    image.removeAttribute('src');
    throw error;
  } finally {
    if (cancel) signal.removeEventListener('abort', cancel);
  }
}

async function prepare(surface: Surface): Promise<void> {
  const controller = new AbortController();
  surface.preparation?.abort();
  surface.preparation = controller;
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
  const urls: string[] = [];
  const images: HTMLImageElement[] = [];
  const size = { width: surface.width, height: surface.height };
  const dark = night;
  let committed = false;
  try {
    const css = getComputedStyle(surface.host);
    const rawRadius = css.borderTopLeftRadius;
    const radius =
      surface.radius ??
      (rawRadius.endsWith('%')
        ? (Math.min(size.width, size.height) * parseFloat(rawRadius)) / 100
        : parseFloat(rawRadius) || 0);
    const sized = (svg: string) =>
      svg.replace('width="100%" height="100%"', `width="${size.width}" height="${size.height}"`);
    const glass = svgUrl(sized(createGlassSvg(surface.seed)), urls);
    const stone = svgUrl(sized(createStoneSvg(surface.seed, size, surface.stone)), urls);
    const mask = svgUrl(sized(createLightMaskSvg(surface.seed, surface.stone)), urls);
    const bezel = surface.bezel
      ? svgUrl(createBezelSvg(surface.seed, size, radius, dark ? '#ffba78' : undefined), urls)
      : undefined;
    for (const url of [glass, stone, mask, ...(bezel ? [bezel] : [])])
      images.push(await decoded(url, signal));
    const boost = Math.max(1, JADE_LIGHT.span / Math.max(size.width, size.height));
    const poolDrawings: Array<{
      image: HTMLImageElement;
      width: number;
      height: number;
      margin: number;
    }> = [];
    for (let index = 0; index < JADE_LIGHT.layers.length; index++) {
      const layer = JADE_LIGHT.layers[index]!;
      const margin = Math.max(layer.margin, 0.65 * Math.abs(layer.parallax) * boost);
      const width = Math.max(1, Math.round(size.width * (1 + 2 * margin) * JADE_POOL_SCALE));
      const height = Math.max(1, Math.round(size.height * (1 + 2 * margin) * JADE_POOL_SCALE));
      const url = svgUrl(
        createPoolSvg(
          surface.seed,
          index,
          width,
          height,
          +(size.width * margin * JADE_POOL_SCALE).toFixed(2),
          +(size.height * margin * JADE_POOL_SCALE).toFixed(2),
          dark ? [1, 186 / 255, 120 / 255] : undefined,
        ),
        urls,
      );
      const image = await decoded(url, signal);
      images.push(image);
      poolDrawings.push({ image, width, height, margin });
    }
    signal.throwIfAborted();
    if (!rendered(surface)) return;
    const contexts = surface.pools.map((pool) => pool.element.getContext('2d'));
    if (contexts.some((context) => !context))
      throw new Error('Panel light drawing is unavailable.');
    surface.root.style.inset = `${-parseFloat(css.borderTopWidth)}px ${-parseFloat(css.borderRightWidth)}px ${-parseFloat(css.borderBottomWidth)}px ${-parseFloat(css.borderLeftWidth)}px`;
    surface.root.style.borderRadius = css.borderRadius;
    surface.drawing.style.width = `${size.width}px`;
    surface.drawing.style.height = `${size.height}px`;
    surface.drawing.style.transform = '';
    surface.pane.style.backgroundImage = `url("${stone}"), url("${glass}")`;
    surface.light.style.maskImage = `url("${mask}")`;
    surface.light.style.webkitMaskImage = `url("${mask}")`;
    surface.bezelLayer.style.backgroundImage = bezel ? `url("${bezel}")` : '';
    const { halo, shaft } = JADE_TOP_LIGHT;
    const clamp = (value: number, minimum: number, maximum: number) =>
      Math.max(minimum, Math.min(maximum, value));
    surface.halo.style.width = `${clamp(halo.width * size.width, halo.min, halo.max)}px`;
    surface.halo.style.height = `${halo.height}px`;
    surface.halo.style.top = `${1.5 - halo.height / 2}px`;
    surface.shaft.style.width = `${clamp(shaft.width * size.width, shaft.min, shaft.max)}px`;
    surface.shaft.style.height = `${clamp(shaft.height * size.height, shaft.min, shaft.max * 2)}px`;
    poolDrawings.forEach((drawing, index) => {
      const pool = surface.pools[index]!;
      const canvas = pool.element;
      canvas.width = drawing.width;
      canvas.height = drawing.height;
      contexts[index]!.drawImage(drawing.image, 0, 0);
      canvas.style.inset = `${-drawing.margin * 100}% auto auto ${-drawing.margin * 100}%`;
      canvas.style.width = canvas.style.height = `${(1 + drawing.margin * 2) * 100}%`;
      canvas.style.transform = '';
      pool.margin = drawing.margin;
      pool.x = pool.y = 0;
    });
    // Pool pixels now belong to their canvases; only the static material URLs remain.
    const retained = urls.slice(0, bezel ? 4 : 3);
    for (const url of surface.urls) URL.revokeObjectURL(url);
    for (const url of urls.slice(retained.length)) URL.revokeObjectURL(url);
    surface.urls = retained;
    surface.builtWidth = size.width;
    surface.builtHeight = size.height;
    surface.builtNight = dark;
    surface.root.dataset.ready = 'true';
    surface.root.dataset.lighting = dark ? 'night' : 'day';
    committed = true;
    wake(surface);
  } catch (error) {
    if (!controller.signal.aborted && !surface.disposed)
      console.warn('Procedural panel glass unavailable; retaining the readable pane.', error);
  } finally {
    for (const image of images) image.removeAttribute('src');
    if (!committed) for (const url of urls) URL.revokeObjectURL(url);
    if (surface.preparation === controller) surface.preparation = undefined;
  }
}

function visibilityChanged(): void {
  if (document.hidden) {
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    lastFrame = 0;
    for (const surface of surfaces.values()) {
      surface.pointer = undefined;
      surface.preparation?.abort();
    }
  } else {
    for (const surface of surfaces.values()) {
      if (
        surface.builtWidth !== surface.width ||
        surface.builtHeight !== surface.height ||
        surface.builtNight !== night
      )
        enqueue(surface);
      wake(surface);
    }
    runQueue();
  }
}

function connect(): void {
  motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', refreshMotion);
  document.addEventListener('pointermove', pointerMoved, { passive: true });
  document.addEventListener('pointerout', pointerLeft, { passive: true });
  document.addEventListener('pointercancel', pointerLeft, { passive: true });
  document.addEventListener('visibilitychange', visibilityChanged);
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const surface = surfaces.get(entry.target as HTMLElement);
      if (!surface) continue;
      const box = entry.borderBoxSize[0];
      changedSize(
        surface,
        box?.inlineSize ?? surface.host.offsetWidth,
        box?.blockSize ?? surface.host.offsetHeight,
      );
    }
  });
  intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const surface = surfaces.get(entry.target as HTMLElement);
      if (!surface) continue;
      surface.visible = entry.isIntersecting;
      if (surface.visible) {
        if (
          surface.builtWidth !== surface.width ||
          surface.builtHeight !== surface.height ||
          surface.builtNight !== night
        )
          enqueue(surface);
      } else {
        surface.pointer = undefined;
        surface.preparation?.abort();
      }
      wake(surface);
    }
  });
  night = document.documentElement.dataset.lighting === 'night';
  lightingObserver = new MutationObserver(() => {
    const next = document.documentElement.dataset.lighting === 'night';
    if (next === night) return;
    night = next;
    for (const surface of surfaces.values()) {
      surface.preparation?.abort();
      enqueue(surface);
    }
  });
  lightingObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lighting'],
  });
}

function disconnect(): void {
  motionQuery?.removeEventListener('change', refreshMotion);
  motionQuery = undefined;
  document.removeEventListener('pointermove', pointerMoved);
  document.removeEventListener('pointerout', pointerLeft);
  document.removeEventListener('pointercancel', pointerLeft);
  document.removeEventListener('visibilitychange', visibilityChanged);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  lightingObserver?.disconnect();
  resizeObserver = undefined;
  intersectionObserver = undefined;
  lightingObserver = undefined;
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  if (preparationFrame !== undefined) cancelAnimationFrame(preparationFrame);
  if (resizeTimer !== undefined) clearTimeout(resizeTimer);
  animationFrame = preparationFrame = resizeTimer = undefined;
  lastFrame = 0;
  awake.clear();
  dirty.clear();
  queue.clear();
}

/** Decoration only: the existing surface keeps content, blur, shadow, scrolling,
 * focus and event ownership. Identity chooses a stable pane without game state. */
export function JadeGlass({
  identity,
  bezel = true,
  stone = 'jade-cloud',
  radius,
}: {
  identity: string;
  bezel?: boolean;
  stone?: StoneVariant;
  radius?: number;
}) {
  const settings = useSyncExternalStore(subscribe, snapshot, snapshot);
  const root = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    const host = element?.parentElement;
    if (!settings.enabled || !element || !host) return;
    delete element.dataset.ready;
    if (!surfaces.size) connect();
    const part = (name: string) =>
      element.querySelector<HTMLSpanElement>(`.ol-jade-glass-${name}`)!;
    const surface: Surface = {
      host,
      root: element,
      drawing: part('drawing'),
      pane: part('pane'),
      light: part('light'),
      bezelLayer: part('bezel'),
      halo: part('halo'),
      shaft: part('shaft'),
      pools: [...element.querySelectorAll<HTMLCanvasElement>('canvas')].map((canvas) => ({
        element: canvas,
        margin: 0,
        x: 0,
        y: 0,
      })),
      seed: seedFor(identity),
      stone,
      bezel,
      radius,
      width: 0,
      height: 0,
      builtWidth: 0,
      builtHeight: 0,
      resizedAt: 0,
      visible: true,
      disposed: false,
      urls: [],
    };
    surfaces.set(host, surface);
    resizeObserver?.observe(host);
    intersectionObserver?.observe(host);
    changedSize(surface, host.offsetWidth, host.offsetHeight);
    return () => {
      surface.disposed = true;
      surface.preparation?.abort();
      for (const url of surface.urls) URL.revokeObjectURL(url);
      surface.urls = [];
      for (const pool of surface.pools) pool.element.width = pool.element.height = 0;
      resizeObserver?.unobserve(host);
      intersectionObserver?.unobserve(host);
      surfaces.delete(host);
      dirty.delete(surface);
      queue.delete(surface);
      awake.delete(surface);
      if (!surfaces.size) disconnect();
    };
  }, [settings.enabled, identity, bezel, stone, radius]);
  if (!settings.enabled) return null;
  return (
    <span className="ol-jade-glass" ref={root} aria-hidden="true" data-bezel={bezel || undefined}>
      <span className="ol-jade-glass-drawing">
        <span className="ol-jade-glass-fx">
          <span className="ol-jade-glass-pane" />
          <span className="ol-jade-glass-light">
            <span className="ol-jade-glass-lamp" />
            <canvas className="ol-jade-glass-pool" />
            <canvas className="ol-jade-glass-pool" />
          </span>
        </span>
        <span className="ol-jade-glass-bezel" />
        <span className="ol-jade-glass-halo" />
        <span className="ol-jade-glass-shaft" />
      </span>
    </span>
  );
}
