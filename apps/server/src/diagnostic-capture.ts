import type { IntelligenceCall } from '@open-legend/protocol';

export const DIAGNOSTIC_LIMITS = Object.freeze({
  inputBytes: 500_000,
  recordBytes: 1_000_000,
  retainedBytes: 16 * 1024 * 1024,
  records: 1000,
  nodes: 20_000,
  depth: 32,
  sourceByteMultiplier: 2,
});

interface PreparedValue {
  readonly value: unknown;
  readonly json: string;
  readonly bytes: number;
}
export interface PreparedDiagnosticRecord extends PreparedValue {
  readonly value: IntelligenceCall;
  readonly id: string;
  readonly startedAt: string;
}
const preparedValues = new WeakMap<object, PreparedValue>();
const secretKey =
  /authorization|context[_-]?handle|api[_-]?key|secret|password|access[_-]?token|refresh[_-]?token/i;
class CaptureOmission extends Error {}
// These are exact operational relationships, not prose or encoded provider bodies.
// Redacting their spelling would split SQL keys from payload and parent references.
const identityFields = new Set(['id', 'parentId', 'worldId', 'actorId', 'ownerAccountId']);

/** Owned immutable fragments retain their encoding; caller-owned objects never qualify. */
function prepare(value: unknown, maxBytes: number, recordMetadata = false): PreparedValue {
  const chunks: string[] = [];
  const ancestors = new WeakSet<object>();
  let bytes = 0;
  let nodes = 0;
  let sourceBytes = 0;
  const sourceLimit = maxBytes * DIAGNOSTIC_LIMITS.sourceByteMultiplier;
  const examine = (text: string) => {
    // Redaction can shrink repeated large source strings to tiny output. Bound
    // all fresh text examined, including keys and embedded JSON before parsing.
    const remaining = sourceLimit - sourceBytes;
    if (text.length > remaining) throw new CaptureOmission();
    const length = Buffer.byteLength(text);
    if (length > remaining) throw new CaptureOmission();
    sourceBytes += length;
    return length;
  };
  const write = (text: string, length = Buffer.byteLength(text)) => {
    if (length > maxBytes - bytes) throw new CaptureOmission();
    bytes += length;
    chunks.push(text);
  };
  const string = (text: string, length = Buffer.byteLength(text)) => {
    // Reject before regexes, JSON parsing or escaping can copy a large supplied body.
    if (text.length > maxBytes || length > maxBytes) throw new CaptureOmission();
    let encodedBytes = length + 2;
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (code === 34 || code === 92) encodedBytes++;
      else if (code < 32) encodedBytes += [8, 9, 10, 12, 13].includes(code) ? 1 : 5;
      else if (code >= 0xd800 && code <= 0xdbff) {
        const next = text.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) index++;
        else encodedBytes += 3;
      } else if (code >= 0xdc00 && code <= 0xdfff) encodedBytes += 3;
      if (encodedBytes > maxBytes - bytes) throw new CaptureOmission();
    }
    write(JSON.stringify(text), encodedBytes);
    return text;
  };
  const visit = (item: unknown, depth: number, key = '', embedding = false): unknown => {
    if (++nodes > DIAGNOSTIC_LIMITS.nodes || depth > DIAGNOSTIC_LIMITS.depth)
      throw new CaptureOmission();
    if (secretKey.test(key)) return string('[redacted]');
    if (typeof item === 'string') {
      if (item.length > maxBytes) throw new CaptureOmission();
      const length = examine(item);
      if (length > maxBytes) throw new CaptureOmission();
      if (recordMetadata && depth === 1 && identityFields.has(key)) return string(item, length);
      if (/^\s*[\[{]/.test(item)) {
        try {
          return visit(JSON.parse(item), depth + 1, key, embedding);
        } catch {
          // A truncated/malformed JSON prefix cannot be safely treated as prose:
          // quoted or escaped secret keys would bypass the prose redactor.
          throw new CaptureOmission();
        }
      }
      const redacted = item
        .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [redacted]')
        .replace(
          /((?:api[_-]?key|password|secret|access[_-]?token|refresh[_-]?token)\s*[=:]\s*)[^\s&,;]+/gi,
          '$1[redacted]',
        );
      return string(redacted, redacted === item ? length : undefined);
    }
    if (!item || typeof item !== 'object') {
      const result =
        typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))
          ? item
          : null;
      write(JSON.stringify(result) ?? 'null');
      return result;
    }
    if (ancestors.has(item)) return string('[circular]');
    const prior = preparedValues.get(item);
    if (prior) {
      write(prior.json, prior.bytes);
      return prior.value;
    }
    if (ArrayBuffer.isView(item))
      return visit(
        { dimensions: item.byteLength, unavailable: 'Binary capture omitted.' },
        depth + 1,
      );
    const numericArray = () => {
      if (!Array.isArray(item) || (!embedding && item.length <= 32)) return false;
      for (let index = 0; index < item.length; index++) {
        if (++nodes > DIAGNOSTIC_LIMITS.nodes) throw new CaptureOmission();
        if (typeof Object.getOwnPropertyDescriptor(item, String(index))?.value !== 'number')
          return false;
      }
      return true;
    };
    if (Array.isArray(item) && (/embedding|vectors?/i.test(key) || numericArray()))
      return visit({ dimensions: item.length }, depth + 1);
    const kind = Object.getOwnPropertyDescriptor(item, 'kind')?.value as unknown;
    if (!embedding && typeof kind === 'string') {
      examine(kind);
      embedding = /embedding/i.test(kind);
    }
    ancestors.add(item);
    let result: unknown;
    if (Array.isArray(item)) {
      if (item.length > DIAGNOSTIC_LIMITS.nodes) throw new CaptureOmission();
      const array: unknown[] = [];
      write('[');
      for (let index = 0; index < item.length; index++) {
        if (index) write(',');
        const entry: unknown = Object.getOwnPropertyDescriptor(item, String(index))?.value;
        array.push(visit(typeof entry === 'function' ? null : entry, depth + 1, '', embedding));
      }
      write(']');
      result = Object.freeze(array);
    } else {
      const object: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      let first = true;
      write('{');
      for (const name in item) {
        if (++nodes > DIAGNOSTIC_LIMITS.nodes) throw new CaptureOmission();
        const nameBytes = examine(name);
        if (!Object.hasOwn(item, name)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(item, name);
        // Diagnostic capture never invokes getters or carries cancellation resources.
        if (!descriptor || !('value' in descriptor)) continue;
        const entry: unknown = descriptor.value;
        if (
          typeof entry === 'function' ||
          /signal|abort/i.test(name) ||
          entry instanceof AbortSignal ||
          entry instanceof AbortController
        )
          continue;
        if (!first) write(',');
        first = false;
        string(name, nameBytes);
        write(':');
        object[name] = visit(entry, depth + 1, name, embedding);
      }
      write('}');
      result = Object.freeze(object);
    }
    ancestors.delete(item);
    return result;
  };
  const result = visit(value, 0);
  const prepared = Object.freeze({ value: result, json: chunks.join(''), bytes });
  if (result && typeof result === 'object') preparedValues.set(result, prepared);
  return prepared;
}

export function captureDiagnosticValue(
  value: unknown,
  maxBytes: number,
  omitted: () => void,
): unknown {
  try {
    return prepare(value, maxBytes).value;
  } catch {
    omitted();
    return prepare(
      { unavailable: 'Diagnostic content exceeded capture limits or could not be safely decoded.' },
      maxBytes,
    ).value;
  }
}

/** Only the capture owner uses this for the immutable values it just prepared. */
export function diagnosticValueBytes(value: object): number {
  const prepared = preparedValues.get(value);
  if (!prepared) throw new Error('Diagnostic value has no owned encoding.');
  return prepared.bytes;
}

/** A record is sanitized and encoded here once; the repository consumes those exact bytes. */
export function prepareDiagnosticRecord(
  call: IntelligenceCall,
  omitted: () => void,
): PreparedDiagnosticRecord | undefined {
  const input = captureDiagnosticValue(call.input, DIAGNOSTIC_LIMITS.inputBytes, omitted);
  const output = captureDiagnosticValue(call.output, DIAGNOSTIC_LIMITS.recordBytes, omitted);
  const exchanges = captureDiagnosticValue(call.exchanges, DIAGNOSTIC_LIMITS.recordBytes, omitted);
  let candidate = { ...call, input, output, exchanges: Array.isArray(exchanges) ? exchanges : [] };
  for (let stage = 0; stage < 3; stage++) {
    try {
      const result = prepare(candidate, DIAGNOSTIC_LIMITS.recordBytes, true);
      return Object.freeze({
        ...result,
        value: result.value as IntelligenceCall,
        id: call.id,
        startedAt: call.startedAt,
      });
    } catch {
      omitted();
      candidate =
        stage === 0
          ? { ...candidate, exchanges: [] }
          : { ...candidate, output: { unavailable: 'Diagnostic output exceeded capture limits.' } };
    }
  }
  return undefined;
}

/** Counts unique retained snapshots, including records pinned by an active SQL write. */
export class DiagnosticRetention {
  private references = new Map<PreparedDiagnosticRecord, number>();
  private active = 0;
  bytes = 0;
  get records() {
    return this.references.size + this.active;
  }
  canRetain(bytes: number): boolean {
    return (
      this.bytes + bytes <= DIAGNOSTIC_LIMITS.retainedBytes &&
      this.records < DIAGNOSTIC_LIMITS.records
    );
  }
  reserveCapture(bytes: number): (() => void) | undefined {
    if (!this.canRetain(bytes)) return;
    this.active++;
    this.bytes += bytes;
    return () => {
      this.active--;
      this.bytes -= bytes;
    };
  }
  referenceCount(record: PreparedDiagnosticRecord): number {
    return this.references.get(record) ?? 0;
  }
  retain(record: PreparedDiagnosticRecord): void {
    const count = this.references.get(record) ?? 0;
    if (!count) this.bytes += record.bytes;
    this.references.set(record, count + 1);
  }
  release(record: PreparedDiagnosticRecord): void {
    const count = this.references.get(record);
    if (count === undefined) return;
    if (count > 1) this.references.set(record, count - 1);
    else {
      this.references.delete(record);
      this.bytes -= record.bytes;
    }
  }
  snapshot() {
    return { bytes: this.bytes, records: this.records, activeCaptures: this.active };
  }
}
