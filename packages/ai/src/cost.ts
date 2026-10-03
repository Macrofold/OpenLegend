import type { AiReceipt } from './types.js';

const maxMicro = BigInt(Number.MAX_SAFE_INTEGER);

/** Provider counters and amounts use unsigned decimal integers, never numeric coercion. */
export function parseNonnegativeSafeInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined;
  const digits = value.replace(/^0+/, '') || '0';
  if (digits.length > 16) return undefined;
  const integer = BigInt(digits);
  return integer <= maxMicro ? Number(integer) : undefined;
}

/** Round the represented decimal USD upward, without binary multiplication artifacts. */
export function usdToMicroUsd(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  const [decimal = '', exponent = '0'] = value.toString().split('e');
  const [whole = '', fraction = ''] = decimal.split('.');
  const digits = BigInt(whole + fraction);
  const shift = 6 + Number(exponent) - fraction.length;
  const divisor = shift < 0 ? 10n ** BigInt(-shift) : 1n;
  const micro = shift >= 0 ? digits * 10n ** BigInt(shift) : (digits + divisor - 1n) / divisor;
  return micro <= maxMicro ? Number(micro) : undefined;
}

/** Provider integers must survive the public numeric USD receipt without losing money. */
export function microUsdToUsd(value: unknown): number | undefined {
  const micro = parseNonnegativeSafeInteger(value);
  if (micro === undefined) return undefined;
  const usd = micro / 1_000_000;
  return usdToMicroUsd(usd) === micro ? usd : undefined;
}

export function sumSafeIntegers(values: readonly number[]): number | undefined {
  let total = 0;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - total)
      return undefined;
    total += value;
  }
  return total;
}

/** Unknown/invalid billing is omitted, never coerced to a zero charge. */
export function normalizeReceiptCost(receipt: AiReceipt): AiReceipt {
  const result = { ...receipt };
  if (usdToMicroUsd(result.estimatedCostUsd) === undefined) delete result.estimatedCostUsd;
  return result;
}
