import { useLayoutEffect, useRef } from 'react';
import type { EntityView } from '@open-legend/protocol';

/** Display-only preview size. Look closer (In view) and the searchable Pick Up list remain
 * the complete paths; stored and projected contents are never capped here.
 * docs/limits/interface.md#hv01 */
const PREVIEW_STACKS = 8;
const EDGE = 12;

/** Pointer hover card for a world entity. It follows the pointer and ignores pointer events,
 * so it flips and clamps to stay fully inside the viewport instead of scrolling. */
export function WorldHover({
  name,
  point,
  contents,
}: {
  name: string;
  point: { x: number; y: number };
  contents?: EntityView['contents'];
}) {
  const card = useRef<HTMLDivElement>(null);
  // Runs after each pointer update; the card is at most PREVIEW_STACKS + 2 lines tall.
  useLayoutEffect(() => {
    const element = card.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    let left = point.x + 16,
      top = point.y + 18;
    if (left + width > innerWidth - EDGE) left = point.x - 16 - width;
    if (top + height > innerHeight - EDGE) top = point.y - 18 - height;
    element.style.left = `${Math.max(EDGE, Math.min(left, innerWidth - width - EDGE))}px`;
    element.style.top = `${Math.max(EDGE, Math.min(top, innerHeight - height - EDGE))}px`;
  });
  const shown = contents?.slice(0, PREVIEW_STACKS) ?? [];
  const omitted = (contents?.length ?? 0) - shown.length;
  return (
    <div ref={card} className="ol-world-hover">
      <div>{name}</div>
      {shown.map((item) => (
        <div key={item.id}>
          {item.name} × {item.quantity}
        </div>
      ))}
      {omitted > 0 && (
        <div className="ol-world-hover-more">
          +{omitted} more · Look closer lists all {contents!.length}
        </div>
      )}
    </div>
  );
}
