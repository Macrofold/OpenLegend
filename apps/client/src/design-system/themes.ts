import tokens from './tokens/tokens.json';

/** Settings and characterless entry points share the authored theme inventory. */
export const THEMES = tokens.color.themes;

export function isTheme(value: unknown): value is string {
  return typeof value === 'string' && THEMES.some((theme) => theme.id === value);
}
