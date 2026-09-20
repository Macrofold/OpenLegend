/** Presentation-only focus mask. It blurs existing scene pixels without adding
 * darkness or receiving world secrets. Projected radii follow camera pan/zoom. */
export const VISION_FOCUS = { clearFraction: 0.6, obscuredFraction: 0.72 } as const;

export class VisionBlur {
  private readonly element = document.createElement('div');
  private previous = '';

  constructor(canvas: HTMLCanvasElement) {
    this.element.className = 'vision-blur';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.hidden = true;
    this.element.style.setProperty('--vision-clear', `${VISION_FOCUS.clearFraction * 100}%`);
    this.element.style.setProperty('--vision-obscured', `${VISION_FOCUS.obscuredFraction * 100}%`);
    canvas.after(this.element);
  }

  update(x: number, y: number, radiusX: number, radiusY: number): void {
    const values = [x, y, radiusX, radiusY].map((value) => value.toFixed(1));
    const signature = values.join(',');
    if (signature === this.previous) return;
    this.previous = signature;
    for (const [index, name] of ['x', 'y', 'rx', 'ry'].entries())
      this.element.style.setProperty(`--vision-${name}`, `${values[index]}px`);
    this.element.hidden = false;
  }

  destroy(): void {
    this.element.remove();
  }
}
