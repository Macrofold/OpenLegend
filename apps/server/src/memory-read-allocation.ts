import type { NativeWorldConsumer } from '@open-legend/native-simulation';
import type { ExperienceEntry, MemoryRecord, NativeText } from '@open-legend/domain';
import { attachNativeConsumer, retainNativeSources } from './native-consumer.js';
import { memoryEmbeddingText } from './perceived-context.js';
import type { RetrievedMemory } from './memory-repository.js';

/** Capacity only. The repository never receives the native mutation handle. */
export interface MemoryHydrationBudget {
  reserveBytes(bytes: number): NativeWorldConsumer;
  reserveJson(bytes: Buffer): NativeWorldConsumer;
}

// Match the supported Node layout allowances of runtime/consumer.rs. These
// cover object/map backing and string headers, not a claim about process RSS.
const WORD = 8;
const CONTAINER = 32 * WORD;
const MEMBER = 64 * WORD;
const SLOT = 8 * WORD;
const STRING = 8 * WORD;
const objectBytes = (members: number) => CONTAINER + members * MEMBER;
const stringBytes = (units: number) => STRING + 2 * units;
const admitted = new WeakMap<object, MemoryHydrationBudget>();

export const memorySourceAdmitted = (source: RetrievedMemory) => admitted.has(source);

/** The real SQL byte/count query runs first, in the same read snapshot. Funding
 * includes wire UTF-8, decoded UTF-16, the temporary parse Buffer, row objects
 * and the id lookup map before the body SELECT allocates them. */
export function reserveMemoryTransfer(
  budget: MemoryHydrationBudget,
  payloadBytes: number,
  idBytes: number,
  rows: number,
): NativeWorldConsumer {
  return budget.reserveBytes(
    4 * (payloadBytes + idBytes) +
      2 * CONTAINER +
      rows * (objectBytes(2) + 2 * STRING + 3 * SLOT + MEMBER),
  );
}

/** The common decoder, including current-format validation, remains the sole
 * parser. Its decoded JSON graph is admitted before parsing. */
export function decodeAdmittedMemory(
  budget: MemoryHydrationBudget,
  payload: string,
  decode: () => ExperienceEntry,
): ExperienceEntry {
  const storage = budget.reserveJson(Buffer.from(payload));
  let entry: ExperienceEntry;
  try {
    entry = decode();
  } catch (error) {
    storage.release();
    throw error;
  }
  return attachNativeConsumer(entry, storage);
}

/** Captured narration can repeat a long participant name many times. Bound the
 * actual grammar expansion, including temporary concatenated prefixes; source
 * byte length alone is insufficient. The decoder has already validated names.
 * See domain/narration.ts renderNarrationParts and language name/personPhrase. */
function narrationBytes(text: NativeText): { retained: number; workspace: number } {
  if (typeof text === 'string') return { retained: 0, workspace: 0 };
  let names = 0;
  for (const id in text.names) if (Object.hasOwn(text.names, id)) names++;
  let prefix = 0;
  let fragments = 0;
  for (const part of text.narration.parts) {
    const added =
      typeof part === 'string'
        ? part.length
        : 'verb' in part
          ? part.verb.length + 2
          : Math.max(10, text.names[part.entityId]!.name.length + 8);
    prefix += added;
    // Literal parts borrow the parsed body. Article/possessive/case grammar
    // produces at most four named fragments or one conjugated verb.
    if (typeof part !== 'string') fragments += 4 * added;
  }
  return {
    retained: 2 * (prefix + fragments) + text.narration.parts.length * 6 * STRING,
    // Sentence-boundary matching may flatten old+new accumulated prefixes.
    // The temporary names Map belongs to this call, not the retained reading.
    workspace: 4 * prefix + names * (MEMBER + 3 * SLOT) + CONTAINER,
  };
}

export function admitMemoryReading(
  budget: MemoryHydrationBudget,
  entry: ExperienceEntry,
  read: () => MemoryRecord,
): MemoryRecord {
  if (entry.source === 'memory') return retainNativeSources(read(), entry);
  // awarenessMemory has at most 20 fields. summaryMemory adds one fixed grammar
  // prefix of fewer than 64 UTF-16 units; other fields borrow the decoded body.
  const text =
    entry.source === 'awareness'
      ? narrationBytes(entry.value.text)
      : { retained: stringBytes(entry.value.text.length + 64), workspace: 0 };
  const storage = budget.reserveBytes(objectBytes(20) + text.retained);
  let workspace: NativeWorldConsumer | undefined;
  let memory: MemoryRecord;
  try {
    if (text.workspace) workspace = budget.reserveBytes(text.workspace);
    memory = read();
  } catch (error) {
    storage.release();
    throw error;
  } finally {
    workspace?.release();
  }
  return attachNativeConsumer(memory, storage, entry);
}

export function retainMemorySource<T extends RetrievedMemory>(
  create: () => T,
  budget: MemoryHydrationBudget,
  ...roots: readonly object[]
): T {
  const storage = budget.reserveBytes(objectBytes(8));
  let source: T;
  try {
    source = create();
  } catch (error) {
    storage.release();
    throw error;
  }
  const result = attachNativeConsumer(source, storage, ...roots);
  admitted.set(result, budget);
  return result;
}

/** JSON.stringify string length without first allocating the encoded text. */
function quotedUnits(text: string): number {
  let units = 2;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 34 || code === 92) units += 2;
    else if (code < 32)
      units += code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : 6;
    else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      i + 1 < text.length &&
      text.charCodeAt(i + 1) >= 0xdc00 &&
      text.charCodeAt(i + 1) <= 0xdfff
    ) {
      units += 2;
      i++;
    } else units += code >= 0xd800 && code <= 0xdfff ? 6 : 1;
  }
  return units;
}

/** Immediate index projection uses the already admitted reading instead of
 * rendering/validating the same body again. Its separate text, batch-encoding
 * workspace and wrapper guard stay with the actual embedding batch object. */
export function memoryEmbeddingSource(source: RetrievedMemory): RetrievedMemory & { text: string } {
  const budget = admitted.get(source);
  if (!budget) return { ...source, text: memoryEmbeddingText(source.memory) };
  let units = 2;
  let fields = 0;
  for (const key of ['kind', 'source', 'eventType', 'summary'] as const) {
    const value = source.memory[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') throw new Error('Invalid stored memory embedding wording.');
    units +=
      (fields++ ? 1 : 0) + quotedUnits(key === 'summary' ? 'text' : key) + 1 + quotedUnits(value);
  }
  // The index also trims and JSON-encodes this already encoded string. A second
  // JSON string needs at most 2*units+2 (all controls/surrogates are escaped in
  // the first encoding). Reserve those live/intermediate strings before either.
  const storage = budget.reserveBytes(objectBytes(12) + stringBytes(4 * units + 2));
  let value: RetrievedMemory & { text: string };
  try {
    value = { ...source, text: memoryEmbeddingText(source.memory) };
  } catch (error) {
    storage.release();
    throw error;
  }
  return attachNativeConsumer(value, storage, source);
}
