import type { CSSProperties } from 'react';

/** Admission owns the amounts; the creation flow presents only the remaining allowance. */
export function UsageRemaining({
  limit,
  spent,
  reserved,
  available,
  label = 'Usage remaining',
}: {
  limit: number;
  spent: number;
  reserved: number;
  available: boolean;
  label?: string;
}) {
  const percent =
    limit > 0 ? Math.max(0, Math.min(100, (1 - (spent + reserved) / limit) * 100)) : 0;
  const description = !available
    ? 'Usage unavailable'
    : percent <= 0
      ? 'Allowance used up'
      : percent < 1
        ? 'Less than 1% remaining'
        : `${Math.floor(percent)}% remaining`;
  return (
    <div className="ol-usage-remaining" style={{ '--v': percent } as CSSProperties}>
      <div>
        <span>{label}</span>
        <span>{description}</span>
      </div>
      {available && (
        <span
          className="ol-meter-track"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={label}
          aria-valuetext={description}
        >
          <span className="ol-meter-fill" />
        </span>
      )}
    </div>
  );
}
