/** Interpret a finite weighted Score as the nearest offered rubric position.
 * The offered range, never the hidden reference, bounds the answer. Exact halves
 * round upward; invalid nonfinite output remains invalid rather than an endpoint.
 */
export function nearestOfferedCategory(value: number, maximum: number): number {
  return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(maximum, value))) : value;
}
