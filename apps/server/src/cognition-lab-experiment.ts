import { createHash, randomUUID } from 'node:crypto';
import { JSONParser, TokenType } from '@streamparser/json';
import {
  CognitionLabRecords,
  LabStorageError,
  labExperimentSnapshotSchema,
  type LabArtifact,
  type LabExperimentSnapshot,
  type LabJson,
} from './cognition-lab-records.js';

export const LAB_EXPERIMENT_CONTENT_TYPE = 'application/vnd.openlegend.lab-experiment+json';
const CHUNK_BYTES = 64 * 1024;

/** Keep the serialized copy bounded even when one authored string or the complete
 * experiment exceeds a native metadata row. The applied snapshot itself is needed
 * once at capture/restore, rather than hydrated by ordinary saved-work paging. */
function* jsonParts(value: LabJson | LabExperimentSnapshot): Generator<string> {
  if (typeof value === 'string') {
    yield '"';
    for (let offset = 0; offset < value.length; ) {
      let end = Math.min(offset + 4096, value.length);
      const last = value.charCodeAt(end - 1);
      if (end < value.length && last >= 0xd800 && last <= 0xdbff) end--;
      yield JSON.stringify(value.slice(offset, end)).slice(1, -1);
      offset = end;
    }
    yield '"';
  } else if (value === null || typeof value !== 'object') yield JSON.stringify(value);
  else if (Array.isArray(value)) {
    yield '[';
    for (let index = 0; index < value.length; index++) {
      if (index) yield ',';
      yield* jsonParts(value[index]!);
    }
    yield ']';
  } else {
    yield '{';
    let first = true;
    for (const [key, child] of Object.entries(value)) {
      if (!first) yield ',';
      first = false;
      yield* jsonParts(key);
      yield ':';
      yield* jsonParts(child);
    }
    yield '}';
  }
}
export function* labExperimentChunks(snapshot: LabExperimentSnapshot): Generator<Buffer> {
  let pending = '';
  let pendingBytes = 0;
  for (const part of jsonParts(snapshot)) {
    pending += part;
    pendingBytes += Buffer.byteLength(part);
    // Escaped pieces contain at most 24 KiB, so coalescing remains bounded.
    if (pendingBytes >= CHUNK_BYTES / 2) {
      yield Buffer.from(pending);
      pending = '';
      pendingBytes = 0;
    }
  }
  if (pending) yield Buffer.from(pending);
}
export function labExperimentMetadata(snapshot: LabExperimentSnapshot): LabArtifact {
  const checksum = createHash('sha256');
  let bytes = 0;
  for (const chunk of labExperimentChunks(snapshot)) {
    bytes += chunk.length;
    checksum.update(chunk);
  }
  return {
    id: randomUUID(),
    bytes,
    checksum: checksum.digest('hex'),
    contentType: LAB_EXPERIMENT_CONTENT_TYPE,
    createdAt: new Date().toISOString(),
  };
}

export async function decodeLabExperiment(
  chunks: AsyncIterable<Uint8Array>,
  expectedBytes: number,
): Promise<LabExperimentSnapshot> {
  let selected: unknown;
  let bytes = 0;
  const invalid = (): never => {
    throw new LabStorageError('invalid', 'The saved experiment context is malformed.');
  };
  const parser = new JSONParser({ paths: ['$'], keepStack: true, stringBufferSize: CHUNK_BYTES });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const decode = (chunk?: Uint8Array) => {
    try {
      return decoder.decode(chunk, { stream: chunk !== undefined });
    } catch {
      return invalid();
    }
  };
  parser.onError = invalid;
  parser.onValue = ({ value }) => {
    selected = value;
  };
  const frames: Array<Set<string> | null> = [];
  let expectingKey = false;
  parser.onToken = ({ token, value }) => {
    if (token === TokenType.LEFT_BRACE || token === TokenType.LEFT_BRACKET) {
      frames.push(token === TokenType.LEFT_BRACE ? new Set() : null);
      expectingKey = token === TokenType.LEFT_BRACE;
    } else if (token === TokenType.RIGHT_BRACE || token === TokenType.RIGHT_BRACKET) {
      frames.pop();
      expectingKey = false;
    } else if (token === TokenType.COMMA) expectingKey = frames.at(-1) instanceof Set;
    else if (token === TokenType.STRING && expectingKey) {
      const keys = frames.at(-1);
      if (typeof value !== 'string' || !keys || keys.has(value)) return invalid();
      keys.add(value);
      expectingKey = false;
    }
  };
  for await (const chunk of chunks) {
    bytes += chunk.byteLength;
    if (bytes > expectedBytes) invalid();
    parser.write(decode(chunk));
  }
  const tail = decode();
  if (tail) parser.write(tail);
  if (!parser.isEnded) parser.end();
  if (bytes !== expectedBytes || selected === undefined) invalid();
  return labExperimentSnapshotSchema.parse(selected);
}
export async function readLabExperiment(
  records: CognitionLabRecords,
  artifactId: string,
): Promise<LabExperimentSnapshot> {
  const artifact = await records.artifact(artifactId);
  if (!artifact || artifact.contentType !== LAB_EXPERIMENT_CONTENT_TYPE)
    throw new LabStorageError('integrity', 'The saved experiment context is unavailable.');
  return decodeLabExperiment(records.streamArtifact(artifact.id), artifact.bytes);
}
