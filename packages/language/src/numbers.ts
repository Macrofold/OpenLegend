const formats = [0, 1, 2].map(
  (maximumFractionDigits) =>
    new Intl.NumberFormat('en', { maximumFractionDigits, useGrouping: false }),
);

/** Display precision only: never round saved facts, editable inputs or real charges. */
export function formatDisplayNumber(
  value: number,
  options: { integer?: boolean; maximumFractionDigits?: 0 | 1 | 2 } = {},
): string {
  const digits = options.integer ? 0 : (options.maximumFractionDigits ?? 2);
  // Avoid showing negative zero after a small negative delta rounds to zero.
  return formats[digits]!.format(Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value);
}
