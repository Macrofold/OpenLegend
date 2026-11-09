/** Admit Inspector's plain JSON before creating its serialized copy or IPC
 * payload. The Inspector API already materializes its result; this bounds the
 * additional export work and copy, not that engine-owned allocation. */
export function assertProfileJsonBudget(value: unknown, limitBytes = 64 * 1024 ** 2): void {
  if (!Number.isSafeInteger(limitBytes) || limitBytes <= 0)
    throw new Error('A positive profile export byte limit is required.');
  let bytes = 0;
  const active = new Set<object>();
  const add = (amount: number) => {
    bytes += amount;
    if (bytes > limitBytes) throw new Error('Raw isolate profile exceeds its export byte limit.');
  };
  const string = (text: string) => {
    add(2);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (
        code === 34 ||
        code === 92 ||
        code === 8 ||
        code === 9 ||
        code === 10 ||
        code === 12 ||
        code === 13
      )
        add(2);
      else if (code < 32) add(6);
      else if (code < 128) add(1);
      else if (code < 2048) add(2);
      else if (code >= 0xd800 && code <= 0xdbff) {
        const next = text.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          add(4);
          i++;
        } else add(6);
      } else if (code >= 0xdc00 && code <= 0xdfff) add(6);
      else add(3);
    }
  };
  const visit = (entry: unknown, depth: number): void => {
    if (depth > 512) throw new Error('Raw isolate profile exceeds the export nesting limit.');
    if (entry === null) add(4);
    else if (typeof entry === 'string') string(entry);
    else if (typeof entry === 'number') {
      if (!Number.isFinite(entry)) throw new Error('Raw isolate profile has a nonfinite value.');
      add(String(entry).length);
    } else if (typeof entry === 'boolean') add(entry ? 4 : 5);
    else if (typeof entry === 'object') {
      if (active.has(entry)) throw new Error('Raw isolate profile contains a cycle.');
      active.add(entry);
      add(2);
      let count = 0;
      if (Array.isArray(entry)) {
        for (const child of entry) {
          if (count++) add(1);
          visit(child, depth + 1);
        }
      } else {
        for (const key in entry) {
          if (!Object.hasOwn(entry, key)) continue;
          if (count++) add(1);
          string(key);
          add(1);
          visit((entry as Record<string, unknown>)[key], depth + 1);
        }
      }
      active.delete(entry);
    } else throw new Error('Raw isolate profile contains a non-JSON value.');
  };
  visit(value, 0);
}
