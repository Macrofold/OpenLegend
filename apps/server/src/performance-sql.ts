/** SQL observation helpers only; no values or SQL text are exported. The adapter
 * still executes each original statement exactly once. */
export type DatabaseMeasurementOwner =
  | 'save'
  | 'receipt'
  | 'retention'
  | 'recall'
  | 'projection'
  | 'checkpoint'
  | 'authority'
  | 'startup'
  | 'unmapped';
export interface DatabaseWireCounters {
  read: number;
  written: number;
}
export function databaseWireCounters(client: unknown): DatabaseWireCounters | undefined {
  const stream = (
    client as
      | { connection?: { stream?: { bytesRead?: number; bytesWritten?: number } } }
      | undefined
  )?.connection?.stream;
  return typeof stream?.bytesRead === 'number' && typeof stream.bytesWritten === 'number'
    ? { read: stream.bytesRead, written: stream.bytesWritten }
    : undefined;
}
/** Known pg text/binary parameter payload only. Objects/arrays use driver-specific
 * preparation, so report unavailable instead of serializing them a second time. */
export function databaseParameterBytes(values: readonly unknown[]): number | null {
  let bytes = 0;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') bytes += Buffer.byteLength(value);
    else if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean')
      bytes += Buffer.byteLength(String(value));
    else if (ArrayBuffer.isView(value)) bytes += value.byteLength;
    else return null;
  }
  return bytes;
}
/** Count submitted statements, not claimed backend execution. Semicolons inside
 * quoted identifiers/values, dollar strings and nested comments are not splits. */
function inspectSql(
  sql: string,
  includeTemplate: boolean,
): { statements: number; template?: string } {
  if (!includeTemplate && !sql.includes(';') && !sql.includes('--') && !sql.includes('/*'))
    return { statements: sql.trim() ? 1 : 0 };
  const visible: string[] | undefined = includeTemplate ? [] : undefined;
  let visibleStart = 0;
  const hide = (at: number, replacement = ' ? ') => {
    visible?.push(sql.slice(visibleStart, at), replacement);
  };
  const reveal = (at: number) => {
    visibleStart = at;
  };
  let statements = 0,
    content = false,
    index = 0;
  let quote = '',
    dollar = '',
    blockDepth = 0,
    line = false;
  let escapes = false;
  while (index < sql.length) {
    const value = sql[index]!,
      next = sql[index + 1];
    if (line) {
      if (value === '\n' || value === '\r') {
        line = false;
        reveal(index + 1);
      }
      index++;
      continue;
    }
    if (blockDepth) {
      if (value === '/' && next === '*') {
        blockDepth++;
        index += 2;
      } else if (value === '*' && next === '/') {
        blockDepth--;
        index += 2;
        if (!blockDepth) reveal(index);
      } else index++;
      continue;
    }
    if (dollar) {
      if (sql.startsWith(dollar, index)) {
        index += dollar.length;
        dollar = '';
        reveal(index);
      } else index++;
      continue;
    }
    if (quote) {
      if (value === quote && next === quote) index += 2;
      else if (value === quote) {
        quote = '';
        index++;
        reveal(index);
      } else if (value === '\\' && quote === "'" && escapes) index += 2;
      else index++;
      continue;
    }
    if (value === '-' && next === '-') {
      hide(index, ' ');
      line = true;
      index += 2;
      continue;
    }
    if (value === '/' && next === '*') {
      hide(index, ' ');
      blockDepth = 1;
      index += 2;
      continue;
    }
    if (value === "'" || value === '"') {
      hide(index);
      quote = value;
      escapes =
        value === "'" &&
        (sql[index - 1] === 'E' || sql[index - 1] === 'e') &&
        (index < 2 || !/[A-Za-z_0-9$]/.test(sql[index - 2]!));
      content = true;
      index++;
      continue;
    }
    if (
      value === '$' &&
      (index === 0 || !/[A-Za-z_0-9$]/.test(sql[index - 1]!)) &&
      (next === '$' || (next !== undefined && /[A-Za-z_]/.test(next)))
    ) {
      const tag = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(sql.slice(index))?.[0];
      if (tag) {
        hide(index);
        dollar = tag;
        content = true;
        index += tag.length;
        continue;
      }
    }
    if (value === ';') {
      if (content) statements++;
      content = false;
    } else if (!/\s/.test(value)) content = true;
    index++;
  }
  if (!quote && !dollar && !line && !blockDepth) visible?.push(sql.slice(visibleStart));
  return {
    statements: statements + Number(content),
    template: visible
      ?.join('')
      .replace(/(^|[^$\w])\d+(?:\.\d+)?\b/g, '$1?')
      .replace(/\s+/g, ' ')
      .trim(),
  };
}
export function submittedSqlStatements(sql: string): number {
  return inspectSql(sql, false).statements;
}
/** Diagnostic identities/table labels never include literal/comment contents.
 * Quoted identifiers remain unknown rather than risk exporting authored values. */
export function databaseSqlTemplate(sql: string): string {
  return inspectSql(sql, true).template!;
}
