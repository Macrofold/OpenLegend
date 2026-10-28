import type { ScreenRect } from '../world-renderer';

/** React owns HUD geometry; the scene receives only canvas-local occupied rectangles.
 * Observe mounted reading surfaces and responsive size changes, never world snapshots.
 * docs/hearing-and-speech.md#7-caption-component-and-lifetime */
export function observeHudLayout(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  condition: HTMLElement,
  publish: (rectangles: ScreenRect[]) => void,
): () => void {
  const obstacleSelector =
    '.ol-survival, .ol-current-work, .ol-attack-controls, .ol-clock-position, .ol-timebar, .ol-time-settings, .ol-world-controls, .ol-quick-position, .ol-camera, .ol-panel, .ol-caption-gap, .ol-subject-picking, .ol-world-composer, .ol-world-composer-head, .ol-gildmoss-overview, .ol-gildmoss-hotbar, .ol-gildmoss-corner, .ol-gildmoss-lock, .ol-gildmoss-notices, .ol-events-quick, .ol-narrator';
  const clippingSelector = '.ol-world-controls, .ol-gildmoss-overview';
  const obstacles = new Set<HTMLElement>();
  const leftRail = root.querySelector<HTMLElement>('.ol-rail-left');
  let previous: ScreenRect[] = [];
  let disposed = false;
  let scrollFrame: number | undefined;
  const heights = new Map<string, number>();
  const height = (name: string, entry: ResizeObserverEntry) => {
    // ResizeObserver border boxes (and offsetHeight) are logical CSS sizes even
    // when the HUD uses zoom; getBoundingClientRect would double-scale this value.
    const value = entry.borderBoxSize[0]?.blockSize ?? (entry.target as HTMLElement).offsetHeight;
    if (heights.get(name) === value) return;
    heights.set(name, value);
    root.style.setProperty(name, `${value}px`);
  };
  const measure = () => {
    if (disposed) return;
    const hotbar = root.querySelector<HTMLElement>('.ol-gildmoss-hotbar')?.getBoundingClientRect();
    const events = root.querySelector<HTMLElement>('.ol-events-quick')?.getBoundingClientRect();
    const aboveHotbar = !!(
      hotbar?.width &&
      events?.width &&
      events.right > hotbar.left &&
      events.left < hotbar.right
    );
    if (root.hasAttribute('data-events-above-hotbar') !== aboveHotbar)
      root.toggleAttribute('data-events-above-hotbar', aboveHotbar);
    const origin = canvas.getBoundingClientRect();
    const boundedRegions = [...obstacles].filter((element) => {
      if (!element.matches(clippingSelector)) return false;
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0;
    });
    const next = [...obstacles]
      // The narrow scroller owns only its visible region. Its clipped descendants
      // must not reserve invisible space; display:contents keeps desktop measurements.
      .filter(
        (element) =>
          !boundedRegions.some((region) => region !== element && region.contains(element)),
      )
      .filter((element) => getComputedStyle(element).visibility !== 'hidden')
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
      }));
    if (
      next.length === previous.length &&
      next.every((rect, index) => {
        const old = previous[index];
        return (
          old &&
          old.x === rect.x &&
          old.y === rect.y &&
          old.width === rect.width &&
          old.height === rect.height
        );
      })
    )
      return;
    previous = next;
    publish(next);
  };
  const scroll = (event: Event) => {
    if (
      disposed ||
      scrollFrame !== undefined ||
      !(event.target instanceof HTMLElement) ||
      !event.target.matches(clippingSelector)
    )
      return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = undefined;
      measure();
    });
  };
  // Compact clocks and narrow reading tools use the measured condition height.
  // Centered desktop rails never depend on the current task's height.
  const observer = new ResizeObserver((entries) => {
    if (disposed) return;
    const rail = entries.find((change) => change.target === leftRail);
    if (rail) height('--left-rail-height', rail);
    const entry = entries.find((change) => change.target === condition);
    if (entry) height('--status-height', entry);
    const clock = entries.find((change) => change.target.matches('.ol-clock-position'));
    if (clock) height('--clock-height', clock);
    const hotbar = entries.find((change) => change.target.matches('.ol-gildmoss-hotbar'));
    if (hotbar) height('--gildmoss-hotbar-height', hotbar);
    const events = entries.find((change) => change.target.matches('.ol-events-quick'));
    // Preserve the closed control reservation while its expanded reading panel is open.
    if (events?.target.querySelector(':scope > .ol-ibtn'))
      height('--gildmoss-events-control-height', events);
    const narrator = entries.find((change) => change.target.matches('.ol-narrator'));
    if (narrator) height('--gildmoss-narrator-height', narrator);
    measure();
  });
  const observeSurfaces = () => {
    const current = new Set(root.querySelectorAll<HTMLElement>(obstacleSelector));
    if (![...current].some((element) => element.matches('.ol-narrator'))) {
      heights.delete('--gildmoss-narrator-height');
      root.style.removeProperty('--gildmoss-narrator-height');
    }
    for (const element of obstacles)
      if (!current.has(element)) {
        observer.unobserve(element);
        obstacles.delete(element);
      }
    for (const element of current)
      if (!obstacles.has(element)) {
        obstacles.add(element);
        observer.observe(element);
      }
  };
  const containsSurface = (node: Node) =>
    node instanceof HTMLElement &&
    (obstacles.has(node) ||
      node.matches(obstacleSelector) ||
      !!node.querySelector(obstacleSelector));
  // Narrator/quick-view lifetimes can change without opening a panel. Rebind only
  // their actual DOM membership; text ticks and caption transforms do no work here.
  const membership = new MutationObserver((changes) => {
    if (disposed) return;
    if (
      changes.some((change) =>
        change.type === 'attributes'
          ? containsSurface(change.target)
          : [...change.addedNodes, ...change.removedNodes].some(containsSurface),
      )
    ) {
      observeSurfaces();
      measure();
    }
  });
  observeSurfaces();
  membership.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden'],
  });
  if (leftRail) observer.observe(leftRail);
  observer.observe(canvas);
  root.addEventListener('animationend', measure);
  root.addEventListener('ol-panel-moved', measure);
  root.addEventListener('scroll', scroll, true);
  measure();
  return () => {
    disposed = true;
    if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
    membership.disconnect();
    observer.disconnect();
    root.style.removeProperty('--gildmoss-hotbar-height');
    root.style.removeProperty('--gildmoss-events-control-height');
    root.style.removeProperty('--gildmoss-narrator-height');
    root.removeAttribute('data-events-above-hotbar');
    root.removeEventListener('animationend', measure);
    root.removeEventListener('ol-panel-moved', measure);
    root.removeEventListener('scroll', scroll, true);
  };
}
