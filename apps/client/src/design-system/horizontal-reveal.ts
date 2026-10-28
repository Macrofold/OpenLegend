/** Reveal a focused choice within its own horizontal strip. Direct scrollLeft
 * avoids scrollIntoView moving a panel, transcript or the world; rects account
 * for the reading scale without assuming the child's positioned ancestor. */
export function revealHorizontalChild(strip: HTMLElement, child: HTMLElement): void {
  const frame = strip.getBoundingClientRect();
  const choice = child.getBoundingClientRect();
  const scale = frame.width / strip.offsetWidth;
  const left = frame.left + strip.clientLeft * scale;
  const right = left + strip.clientWidth * scale;
  if (choice.left < left) strip.scrollLeft += (choice.left - left) / scale;
  else if (choice.right > right) strip.scrollLeft += (choice.right - right) / scale;
}
