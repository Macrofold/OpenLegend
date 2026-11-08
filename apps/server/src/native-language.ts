import { prepareSpeechWords } from '@open-legend/domain';

/** ICU word boundaries are prepared once per utterance by the existing language
 * owner. No listener, identity, evidence or world state participates here.
 */
export function nativeUtterance(text: string): {
  words: Array<{ start: number; end: number }>;
  lowercase: string;
} {
  let previous = 0;
  let bytes = 0;
  const words = prepareSpeechWords(text).map(({ index, segment }) => {
    bytes += Buffer.byteLength(text.slice(previous, index));
    const start = bytes;
    bytes += Buffer.byteLength(segment);
    previous = index + segment.length;
    return { start, end: bytes };
  });
  return { words, lowercase: text.toLowerCase() };
}

/** Recognition uses the source runtime's default ICU collation. Only the
 * selected comparison strings cross this finite provider boundary. Ties retain
 * input order, exactly as the source's stable Array.sort does. */
export function nativeCollation(values: readonly string[]): { order: number[]; groups: number[] } {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value.localeCompare(b.value));
  let group = 0;
  const groups = sorted.map(({ value }, at) => {
    if (at > 0 && sorted[at - 1]!.value.localeCompare(value) !== 0) group++;
    return group;
  });
  return { order: sorted.map(({ index }) => index), groups };
}

/** A single language batch for the supplied name and all actually heard text
 * segments. The native world decides whether that evidence can teach a name. */
export function nativeWordSegments(values: readonly string[]): string[][] {
  return values.map((value) => prepareSpeechWords(value).map(({ segment }) => segment));
}
