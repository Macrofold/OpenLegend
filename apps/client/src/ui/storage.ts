import { useState } from 'react';
export function readLocal<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Browser storage is optional. */
  }
}
export function useLocal<T>(key: string, fallback: T, valid: (value: unknown) => value is T) {
  const [value, set] = useState(() => readLocal(key, fallback, valid));
  return [
    value,
    (next: T) => {
      set(next);
      writeLocal(key, next);
    },
  ] as const;
}
