interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Place a newly opened reading window beside existing surfaces when space permits.
 * A crowded desktop keeps the nearest possible position; manual dragging stays
 * with Panel, and narrow layouts retain their existing single-sheet owner. */
export function placeReadingWindow(
  preferred: Rect,
  viewport: Rect,
  occupied: readonly Rect[],
  inset: number,
  gap: number,
): { left: number; top: number } {
  const clamp = (point: { left: number; top: number }) => ({
    left: Math.max(
      viewport.left + inset,
      Math.min(viewport.left + viewport.width - preferred.width - inset, point.left),
    ),
    top: Math.max(
      viewport.top + inset,
      Math.min(viewport.top + viewport.height - preferred.height - inset, point.top),
    ),
  });
  const candidates = [clamp(preferred)];
  for (const other of occupied) {
    candidates.push(
      clamp({ left: other.left - preferred.width - gap, top: preferred.top }),
      clamp({ left: other.left + other.width + gap, top: preferred.top }),
      clamp({ left: preferred.left, top: other.top - preferred.height - gap }),
      clamp({ left: preferred.left, top: other.top + other.height + gap }),
    );
  }
  const overlap = (point: { left: number; top: number }) =>
    occupied.reduce(
      (total, other) =>
        total +
        Math.max(
          0,
          Math.min(point.left + preferred.width + gap, other.left + other.width) -
            Math.max(point.left - gap, other.left),
        ) *
          Math.max(
            0,
            Math.min(point.top + preferred.height + gap, other.top + other.height) -
              Math.max(point.top - gap, other.top),
          ),
      0,
    );
  return candidates.reduce((best, candidate) => {
    const difference = overlap(candidate) - overlap(best);
    return difference < 0 ||
      (difference === 0 &&
        Math.hypot(candidate.left - preferred.left, candidate.top - preferred.top) <
          Math.hypot(best.left - preferred.left, best.top - preferred.top))
      ? candidate
      : best;
  });
}
