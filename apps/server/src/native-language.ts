import { canonicalJson, normalizeAttempt, prepareSpeechWords } from '@open-legend/domain';
import { parseFreeTypedActionSyntax } from './typed-action-syntax.js';
import { createHash } from 'node:crypto';

/** Installed method signatures use Source canonicalJson once per actual row.
 * Exact row bytes bind this pure preparation; it supplies no method authority. */
export function nativeActivityMethodSignatures(rows: readonly { id: string; payload: string }[]) {
  return rows.map((row) => {
    const method = JSON.parse(row.payload) as Record<string, unknown>;
    return {
      rowId: row.id,
      payloadSha256: createHash('sha256').update(row.payload).digest('hex'),
      signature: canonicalJson({
        root: method['root'],
        roles: method['roles'],
        manifest: method['manifest'],
        executable: method['executable'],
      }),
    };
  });
}

/** ICU word boundaries are prepared once per utterance by the existing language
 * owner. No listener, identity, evidence or world state participates here.
 */
export function nativeUtterance(text: string): {
  words: Array<{ start: number; end: number }>;
  lowercase: string;
} {
  const words = prepareSpeechWords(text).map(({ index, segment }) => ({
    start: index,
    end: index + segment.length,
  }));
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

/** Exact Source canonical JSON for finite native-selected data. Native code constructs these
 * finite cells, checks the returned binding and compares their meaning before
 * any component can run. This formatter has no world or policy access. */
export function nativeCanonicalJson(request: {
  binding: {
    candidateId: number;
    baseCut: number;
    generation: number;
    geometryRevision: number;
    serial: number;
  };
  value: unknown;
}) {
  return { binding: request.binding, canonical: canonicalJson(request.value) };
}

/** Intent matching uses the same engine normalization as Source, including its
 * NFKC and JavaScript Unicode rules. This finite language preparation receives
 * descriptions only; it neither reads a world nor decides whether an intent is
 * permitted, pending or executable. */
export function nativeAttemptNormalization<Binding>(request: {
  readonly binding: Binding;
  readonly descriptions: readonly string[];
}) {
  return {
    binding: request.binding,
    normalized: request.descriptions.map(normalizeAttempt),
    syntax: request.descriptions.map(parseFreeTypedActionSyntax),
  };
}

/** Cold and first-creation inputs bind each pure result to its actual canonical
 * intention row. The native importer consumes every supplied result exactly
 * once and compares both the description and saved normalized value. */
export function nativeNormalizedIntents(rows: readonly { id: string; payload: string }[]) {
  const descriptions = rows.map((row) => {
    const value: unknown = JSON.parse(row.payload);
    if (
      !value ||
      typeof value !== 'object' ||
      typeof (value as { description?: unknown }).description !== 'string'
    )
      throw new Error('The current intention row has no description to normalize.');
    return (value as { description: string }).description;
  });
  const prepared = nativeAttemptNormalization({ binding: null, descriptions });
  return rows.map((row, index) => ({
    rowId: row.id,
    description: descriptions[index]!,
    normalized: prepared.normalized[index]!,
  }));
}
