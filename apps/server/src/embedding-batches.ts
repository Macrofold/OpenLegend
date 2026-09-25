import { EMBEDDING_LIMITS } from '@open-legend/ai';

/** Count and exact JSON UTF-8 budget both apply; invalid optional sources stay structured.
 * The optional query prefix is reserved in each planned batch, never silently truncated.
 * docs/memory-architecture.md#conversation-speech-pool */
export function* embeddingBatches<T extends { text: string; embeddingText?: string }>(
  sources: readonly T[],
  prefix: readonly string[] = [],
): Generator<T[], undefined> {
  const baseBytes = Buffer.byteLength(JSON.stringify(prefix));
  if (
    prefix.length >= EMBEDDING_LIMITS.texts ||
    baseBytes > EMBEDDING_LIMITS.batchBytes ||
    prefix.some((text) => !text.trim() || Buffer.byteLength(text) > EMBEDDING_LIMITS.textBytes)
  )
    throw new Error('Embedding query prefix exceeds adapter limits.');
  const count = Math.min(32, EMBEDDING_LIMITS.texts - prefix.length);
  let batch: T[] = [],
    bytes = baseBytes;
  for (const source of sources) {
    const text = source.embeddingText ?? source.text;
    if (!text.trim() || Buffer.byteLength(text) > EMBEDDING_LIMITS.textBytes)
      continue;
    const encoded = Buffer.byteLength(JSON.stringify(text));
    const comma = () => (prefix.length || batch.length ? 1 : 0);
    if (
      batch.length &&
      (batch.length >= count || bytes + encoded + comma() > EMBEDDING_LIMITS.batchBytes)
    ) {
      yield batch;
      batch = [];
      bytes = baseBytes;
    }
    if (bytes + encoded + comma() > EMBEDDING_LIMITS.batchBytes) continue;
    bytes += encoded + comma();
    batch.push(source);
  }
  if (batch.length) yield batch;
}
