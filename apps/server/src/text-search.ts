import { HistoryCursorError } from './perceived-events.js';

/** Owner history search: every word must match the start of a word in the text the viewer
 * is shown (docs/limits/memory.md#mh08). */
export const SEARCH_TERMS = 8;
export const SEARCH_TERM_CHARACTERS = 64;
/** Rows examined per search request before offering to continue into older history. */
export const SEARCH_SCAN_ROWS = 2000;
/** Rows read per query while scanning, so a search with early matches reads little text. */
const SEARCH_CHUNK_ROWS = 250;

/** Lowercase letter/number words. Matching runs here rather than in PostgreSQL because the
 * database parser depends on its locale: under C it glues non-ASCII punctuation to words
 * (“Wait—burst”) and does not lowercase non-ASCII letters. */
function searchWords(text: string): string[] {
  return (
    text
      .normalize('NFKC')
      .toLowerCase()
      // Lowercasing İ adds a combining dot; fold it so “izmir” finds “İzmir”.
      .replace(/i\u0307/g, 'i')
      .match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
  );
}

/** Normalized search words, or undefined when no search was requested. */
export function searchTerms(text: string | undefined): string[] | undefined {
  if (text === undefined || !text.trim()) return undefined;
  const terms = [...new Set(searchWords(text))];
  if (!terms.length) throw new HistoryCursorError('Search needs at least one letter or number.');
  if (
    terms.length > SEARCH_TERMS ||
    terms.some((term) => [...term].length > SEARCH_TERM_CHARACTERS)
  )
    throw new HistoryCursorError('Search with up to 8 words of at most 64 characters each.');
  return terms;
}

export function matchesSearch(terms: string[], text: string): boolean {
  const words = searchWords(text);
  return terms.every((term) => words.some((word) => word.startsWith(term)));
}

/** Reads rows newest first in chunks until `limit + 1` rows match or `scan` rows were
 * examined. `read(after, count)` returns the next rows older than `after` (or than the
 * request's own start when undefined). `scanLimited` means older rows remain unexamined. */
export async function scanMatches<Row>(
  read: (after: Row | undefined, count: number) => Promise<Row[]>,
  matches: (row: Row) => boolean,
  limit: number,
  scan: number,
): Promise<{ matched: Row[]; last?: Row; scanLimited: boolean }> {
  const matched: Row[] = [];
  let last: Row | undefined,
    examined = 0;
  for (;;) {
    const count = Math.min(SEARCH_CHUNK_ROWS, scan - examined);
    // The final chunk reads one extra row, only to learn whether older rows remain.
    const final = examined + count >= scan;
    const rows = await read(last, final ? count + 1 : count);
    for (const row of rows.slice(0, count)) {
      examined++;
      last = row;
      if (matches(row)) matched.push(row);
      if (matched.length > limit) return { matched, last, scanLimited: false };
    }
    if (final || rows.length < count)
      return { matched, last, scanLimited: final && rows.length > count };
  }
}
