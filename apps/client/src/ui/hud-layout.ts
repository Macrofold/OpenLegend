import type { ScreenRect } from '../world-renderer';

/** React owns HUD geometry; the scene receives only canvas-local occupied rectangles.
 * Recreate when panels mount or responsive scale changes, never for a world snapshot.
 * docs/hearing-and-speech.md#7-caption-component-and-lifetime */
export function observeHudLayout(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  condition: HTMLElement,
  publish: (rectangles: ScreenRect[]) => void,
): () => void {
  const obstacles = [
    ...root.querySelectorAll<HTMLElement>(
      '.ol-survival, .ol-current-work, .ol-clock-position, .ol-timebar, .ol-time-settings, .ol-world-controls, .ol-qa, .ol-camera, .ol-panel, .ol-caption-gap, .ol-subject-picking, .ol-world-composer',
    ),
  ];
  const controls = root.querySelector<HTMLElement>('.ol-world-controls');
  const leftRail = root.querySelector<HTMLElement>('.ol-rail-left');
  let previous: ScreenRect[] = [];
  const measure = () => {
    const origin = canvas.getBoundingClientRect();
    const controlBounds = controls?.getBoundingClientRect();
    const boundedControls = !!controlBounds?.width && !!controlBounds.height;
    const next = obstacles
      // The narrow scroller owns only its visible region. Its clipped descendants
      // must not reserve invisible space; display:contents keeps desktop measurements.
      .filter((element) => !boundedControls || element === controls || !controls?.contains(element))
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
  // Only the compact status/clock positions use these measurements. Reading
  // panels and centered launcher rails never depend on current work height.
  const observer = new ResizeObserver((entries) => {
    const rail = entries.find((change) => change.target === leftRail);
    if (rail)
      root.style.setProperty(
        '--left-rail-height',
        `${rail.borderBoxSize[0]?.blockSize ?? leftRail!.offsetHeight}px`,
      );
    const entry = entries.find((change) => change.target === condition);
    if (entry)
      root.style.setProperty(
        '--status-height',
        `${entry.borderBoxSize[0]?.blockSize ?? condition.offsetHeight}px`,
      );
    const clock = entries.find((change) => change.target.matches('.ol-clock-position'));
    if (clock)
      root.style.setProperty(
        '--clock-height',
        `${clock.borderBoxSize[0]?.blockSize ?? (clock.target as HTMLElement).offsetHeight}px`,
      );
    measure();
  });
  for (const element of obstacles) observer.observe(element);
  if (leftRail) observer.observe(leftRail);
  observer.observe(canvas);
  root.addEventListener('animationend', measure);
  root.addEventListener('ol-panel-moved', measure);
  measure();
  return () => {
    observer.disconnect();
    root.removeEventListener('animationend', measure);
    root.removeEventListener('ol-panel-moved', measure);
  };
}
