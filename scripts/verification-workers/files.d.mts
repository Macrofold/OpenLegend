export function json(path: string): Promise<unknown>;
export function json(
  path: string,
  value: unknown,
  options?: { exclusive?: boolean },
): Promise<void>;
export function hashFile(path: string): Promise<string>;
export function files(
  root: string,
  directory?: string,
  maxEntries?: number,
  exclude?: (path: string) => boolean,
): Promise<string[]>;
export function manifest(root: string): Promise<Record<string, { sha256: string; bytes: number }>>;
