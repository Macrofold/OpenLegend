import type { Ref } from 'react';
export function progressFraction(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
/** Pure visual fraction. No timer, speech state or completion callback belongs here. */
export function ProgressRing({
  fraction,
  size = 14,
  label,
  direction = 'clockwise',
  ref,
}: {
  fraction: number;
  size?: number;
  label?: string;
  direction?: 'clockwise' | 'counterclockwise';
  ref?: Ref<SVGSVGElement>;
}) {
  if (!Number.isFinite(fraction)) return null;
  return (
    <svg
      ref={ref}
      className="ol-progress-ring"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden={label ? undefined : true}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(progressFraction(fraction) * 100) : undefined}
    >
      <circle className="ol-progress-ring-track" cx="10" cy="10" r="8" />
      <circle
        data-progress-value=""
        cx="10"
        cy="10"
        r="8"
        pathLength="100"
        transform={
          direction === 'clockwise'
            ? 'rotate(-90 10 10)'
            : 'translate(20 0) scale(-1 1) rotate(-90 10 10)'
        }
        strokeDasharray="100"
        strokeDashoffset={(1 - progressFraction(fraction)) * 100}
      />
    </svg>
  );
}
