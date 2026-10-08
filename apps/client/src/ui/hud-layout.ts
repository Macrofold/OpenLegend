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
      '.ol-survival, .ol-timebar, .ol-time-settings, .ol-world-controls, .ol-qa, .ol-camera, .ol-panel, .ol-caption-gap, .ol-subject-picking',
    ),
  ];
  const controls = root.querySelector<HTMLElement>('.ol-world-controls');
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
  // The same measurement owner docks panels below the variable-height condition card.
  const observer = new ResizeObserver((entries) => {
    const entry = entries.find((change) => change.target === condition);
    if (entry)
      root.style.setProperty(
        '--status-height',
        `${entry.borderBoxSize[0]?.blockSize ?? condition.offsetHeight}px`,
      );
    measure();
  });
  for (const element of obstacles) observer.observe(element);
  observer.observe(canvas);
  root.addEventListener('animationend', measure);
  measure();
  return () => {
    observer.disconnect();
    root.removeEventListener('animationend', measure);
  };
}
