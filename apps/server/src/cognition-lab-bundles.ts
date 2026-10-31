import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { CHECKPOINT_LIMITS } from './checkpoint-format.js';
import { SAVE_FORMAT, type GameSaves } from './game-saves.js';
import type { SaveFileMetadata } from './save-files.js';
import { decodeLabExperiment, LAB_EXPERIMENT_CONTENT_TYPE } from './cognition-lab-experiment.js';
import { importLabCheckpoint } from './cognition-lab-saves.js';
import {
  CognitionLabRecords,
  LabStorageError,
  LAB_STORAGE_DEFAULTS,
  labJson,
  assertLabMetadataSize,
  labRecordSchema,
  labSavedDataSchema,
  type LabArtifact,
  type LabExperimentSnapshot,
  type LabImportEntry,
  type LabNativeCheckpoint,
  type LabRecord,
} from './cognition-lab-records.js';

const CHUNK_BYTES = LAB_STORAGE_DEFAULTS.chunkBytes / 2;
const uuid = z.string().uuid();
const byteCount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const checksum = z.string().regex(/^[a-f0-9]{64}$/);
const kind = z.enum(['scenario', 'checkpoint', 'run']);
const headerSchema = z
  .object({
    type: z.literal('header'),
    format: z.literal(SAVE_FORMAT),
    encoding: z.literal('cognition-lab-jsonl'),
    kind,
    id: uuid,
    name: z.string().max(500),
    completeness: z.enum(['complete', 'partial']),
  })
  .strict();
const artifactSchema = z
  .object({
    id: uuid,
    runId: uuid.optional(),
    bytes: byteCount,
    checksum,
    contentType: z.string().min(1).max(150),
    createdAt: z.string().datetime(),
  })
  .strict();
const nativeSchema = z
  .object({
    id: uuid,
    worldId: z.string().min(1),
    label: z.string().min(1).max(80),
    createdAt: z.string().datetime(),
    simTime: z.number().finite(),
    format: z.literal(SAVE_FORMAT),
    checksum,
    encoding: z.literal('records-jsonl-2'),
    kind: z.enum(['manual', 'auto', 'recovery']).optional(),
    bytes: byteCount.max(CHECKPOINT_LIMITS.bytes),
    rows: z.number().int().positive().max(CHECKPOINT_LIMITS.rows),
    revision: z.number().int().nonnegative().optional(),
    sequence: z.number().int().positive().optional(),
  })
  .strict();
const blobSchema = z
  .object({
    type: z.literal('blob'),
    kind: z.enum(['entry', 'artifact', 'native']),
    id: uuid,
    bytes: byteCount,
    checksum,
    metadata: z.unknown().optional(),
  })
  .strict();
const chunkSchema = z
  .object({
    type: z.literal('chunk'),
    id: uuid,
    offset: byteCount,
    data: z.string().max(Math.ceil(CHUNK_BYTES / 3) * 4 + 4),
  })
  .strict();
const endSchema = z.object({ type: z.literal('end'), id: uuid }).strict();
const footerSchema = z
  .object({ type: z.literal('footer'), blobs: byteCount, bytes: byteCount, checksum })
  .strict();
const linkSchema = z
  .object({ kind: z.enum(['artifact', 'checkpoint', 'record']), id: uuid })
  .strict();
const evidenceSchema = z
  .object({
    id: z.string().min(1),
    stageId: uuid,
    kind: z.string().min(1),
    label: z.string(),
    source: z.unknown().optional(),
    summary: z.unknown(),
  })
  .strict();
const entrySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('record'),
      record: labRecordSchema,
      links: z.array(linkSchema),
      recipients: z.array(z.string().min(1)).optional(),
      runAllowanceBytes: byteCount.positive().optional(),
    })
    .strict(),
  z.object({ kind: z.literal('evidence'), stageId: uuid, items: z.array(evidenceSchema) }).strict(),
  z
    .object({
      kind: z.literal('attempt'),
      runId: uuid,
      attemptId: z.string().min(1),
      receipt: z.unknown(),
      costUsd: z.number().finite().nonnegative().optional(),
      completionUncertain: z.boolean(),
    })
    .strict(),
]);
type BundleEntry = LabImportEntry;
interface StagedBlob {
  header: z.infer<typeof blobSchema>;
  file: string;
}
export interface LabBundleImport {
  ok: true;
  message: string;
  importId: string;
  recordId: string;
  kind: 'scenario' | 'checkpoint' | 'run';
  name: string;
  completeness: 'complete' | 'partial';
  checkpoint?: LabNativeCheckpoint;
  experiment?: LabExperimentSnapshot;
}
function encoded(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
}
async function* fileChunks(path: string): AsyncGenerator<Buffer> {
  for await (const value of createReadStream(path, { highWaterMark: CHUNK_BYTES }))
    yield value as Buffer;
}
/** Bounded byte rows preserve Unicode across transport chunks without guessing characters. */
async function* lines(stream: AsyncIterable<Uint8Array>, maxBytes: number): AsyncGenerator<Buffer> {
  let pending = Buffer.alloc(0);
  for await (const chunk of stream) {
    let offset = 0;
    while (offset < chunk.byteLength) {
      const remainder = Buffer.from(
        chunk.buffer,
        chunk.byteOffset + offset,
        chunk.byteLength - offset,
      );
      const end = remainder.indexOf(10);
      const part = end < 0 ? remainder : remainder.subarray(0, end + 1);
      if (pending.length + part.length > maxBytes)
        throw new LabStorageError('invalid', 'Bundle row exceeds the bounded transport allowance.');
      pending = Buffer.concat([pending, part]);
      offset += part.length;
      if (end >= 0) {
        yield pending;
        pending = Buffer.alloc(0);
      }
    }
  }
  if (pending.length) throw new LabStorageError('integrity', 'Bundle ended in an incomplete row.');
}
async function* nativeLines(path: string, encodedRows: boolean): AsyncGenerator<string> {
  for await (const row of lines(fileChunks(path), CHECKPOINT_LIMITS.rowBytes)) {
    const text = row.toString('utf8');
    yield encodedRows ? text : text.slice(0, -1);
  }
}
function parseEntry(value: unknown): BundleEntry {
  const entry = entrySchema.parse(value);
  if (entry.kind === 'record') {
    if (['workspace', 'disclosure', 'customField', 'hold'].includes(entry.record.kind))
      throw new LabStorageError(
        'invalid',
        'A saved bundle cannot replace current authoring metadata. Restore its experiment snapshot explicitly.',
      );
    return entry;
  }
  if (entry.kind === 'attempt') return { ...entry, receipt: labJson(entry.receipt) };
  return {
    ...entry,
    items: entry.items.map(({ source, summary, ...item }) => ({
      ...item,
      summary: labJson(summary),
      ...(source !== undefined ? { source: labJson(source) } : {}),
    })),
  };
}

/** A current-format, dependency-closed NDJSON container. It stages files and saved work;
 * only the separate native runtime replacement owner may install a world. No paths,
 * credentials, financial authority, remote workspaces or executable callbacks are imported. */
export class CognitionLabBundles {
  private readonly importDirectory: string;
  constructor(
    private readonly records: CognitionLabRecords,
    private readonly nativeSaves: GameSaves,
    directory: string,
  ) {
    this.importDirectory = join(directory, 'imports');
  }
  async *export(
    selectedKind: 'scenario' | 'checkpoint' | 'run',
    id: string,
  ): AsyncGenerator<Uint8Array> {
    const releases: Array<() => void> = [];
    try {
      yield* this.exportContents(selectedKind, id, (kind, target) =>
        releases.push(this.records.pinRetained(kind, target)),
      );
    } finally {
      for (const release of releases.reverse()) release();
    }
  }
  private async *exportContents(
    selectedKind: 'scenario' | 'checkpoint' | 'run',
    id: string,
    pin: (kind: 'artifact' | 'checkpoint', id: string) => void,
  ): AsyncGenerator<Uint8Array> {
    const selected = await this.records.getRecord(id, selectedKind);
    if (!selected) throw new LabStorageError('missing', 'The selected saved work is unavailable.');
    const summary =
      selected.summary && typeof selected.summary === 'object' && !Array.isArray(selected.summary)
        ? selected.summary
        : undefined;
    const completeness =
      selectedKind !== 'run' || summary?.['completeness'] === 'complete' ? 'complete' : 'partial';
    const hash = createHash('sha256');
    let blobCount = 0,
      totalBytes = 0;
    const emit = (value: unknown) => {
      const row = encoded(value);
      if (row.length > LAB_STORAGE_DEFAULTS.chunkBytes)
        throw new LabStorageError(
          'invalid',
          'Bundle metadata exceeds its transport row allowance.',
        );
      hash.update(row);
      totalBytes += row.length;
      return row;
    };
    yield emit({
      type: 'header',
      format: SAVE_FORMAT,
      encoding: 'cognition-lab-jsonl',
      kind: selectedKind,
      id,
      name: selected.name,
      completeness,
    });
    const blob = async function* (
      type: 'entry' | 'artifact' | 'native',
      blobId: string,
      bytes: number,
      identity: string,
      chunks: AsyncIterable<Uint8Array>,
      metadata?: unknown,
    ): AsyncGenerator<Buffer> {
      blobCount++;
      yield emit({
        type: 'blob',
        kind: type,
        id: blobId,
        bytes,
        checksum: identity,
        ...(metadata !== undefined ? { metadata } : {}),
      });
      let offset = 0;
      const check = createHash('sha256');
      for await (const chunk of chunks) {
        for (let start = 0; start < chunk.byteLength; start += CHUNK_BYTES) {
          const part = Buffer.from(chunk.subarray(start, start + CHUNK_BYTES));
          check.update(part);
          yield emit({ type: 'chunk', id: blobId, offset, data: part.toString('base64') });
          offset += part.length;
        }
      }
      if (offset !== bytes || check.digest('hex') !== identity)
        throw new LabStorageError('integrity', 'Export source changed or became incomplete.');
      yield emit({ type: 'end', id: blobId });
    };
    const entry = async function* (value: BundleEntry): AsyncGenerator<Buffer> {
      assertLabMetadataSize(value);
      const bytes = Buffer.from(JSON.stringify(value), 'utf8');
      yield* blob(
        'entry',
        value.kind === 'record' ? value.record.id : randomUUID(),
        bytes.length,
        createHash('sha256').update(bytes).digest('hex'),
        (async function* () {
          yield bytes;
        })(),
      );
    };
    const queue = [id];
    let queueIndex = 0;
    const seen = new Set<string>(),
      artifacts = new Set<string>(),
      checkpoints = new Set<string>();
    while (queueIndex < queue.length) {
      const recordId = queue[queueIndex++];
      if (recordId === undefined) break;
      if (seen.has(recordId)) continue;
      seen.add(recordId);
      const record = await this.records.getRecord(recordId);
      if (!record) throw new LabStorageError('missing', 'A retained dependency is unavailable.');
      if (['workspace', 'disclosure', 'customField', 'hold'].includes(record.kind))
        throw new LabStorageError(
          'invalid',
          'Current authoring metadata belongs in the saved experiment snapshot.',
        );
      if (record.parentId) queue.push(record.parentId);
      if (record.runId && record.runId !== record.id) queue.push(record.runId);
      const links = await this.records.recordLinks(recordId);
      for (const link of links) {
        if (link.kind === 'record') queue.push(link.id);
        else if (link.kind === 'artifact') {
          if (!artifacts.has(link.id)) pin('artifact', link.id);
          artifacts.add(link.id);
        } else {
          if (!checkpoints.has(link.id)) pin('checkpoint', link.id);
          checkpoints.add(link.id);
        }
      }
      const usage = record.kind === 'run' ? await this.records.runUsage(record.id) : undefined;
      yield* entry({
        kind: 'record',
        record,
        links,
        recipients: await this.records.recipients(recordId),
        ...(usage ? { runAllowanceBytes: usage.allowanceBytes } : {}),
      });
      if (record.kind === 'run') {
        let cursor: string | undefined;
        do {
          const page = await this.records.pageRecords(undefined, { runId: record.id, cursor });
          queue.push(...page.items.map((item) => item.id));
          cursor = page.nextCursor;
        } while (cursor);
        let attemptCursor: string | undefined;
        do {
          const page = await this.records.pageAttempts(record.id, attemptCursor);
          for (const attempt of page.items)
            yield* entry({ kind: 'attempt', runId: record.id, ...attempt });
          attemptCursor = page.nextCursor;
        } while (attemptCursor);
      }
      if (record.kind === 'stage') {
        let cursor: string | undefined;
        do {
          const page = await this.records.pageEvidence(record.id, { cursor });
          for (const item of page.items)
            yield* entry({ kind: 'evidence', stageId: record.id, items: [item] });
          cursor = page.nextCursor;
        } while (cursor);
      }
    }
    for (const artifactId of artifacts) {
      const metadata = await this.records.artifact(artifactId);
      if (!metadata) throw new LabStorageError('missing', 'A captured artifact is unavailable.');
      yield* blob(
        'artifact',
        metadata.id,
        metadata.bytes,
        metadata.checksum,
        this.records.streamArtifact(metadata.id, CHUNK_BYTES),
        metadata,
      );
    }
    for (const checkpointId of checkpoints) {
      const checkpoint = await this.records.checkpoint(checkpointId);
      if (!checkpoint)
        throw new LabStorageError('missing', 'A native checkpoint dependency is unavailable.');
      const metadata = await this.nativeSaves.metadata(checkpoint.worldId, checkpoint.id);
      yield* blob(
        'native',
        metadata.id,
        metadata.bytes,
        metadata.checksum,
        (async function* (saves: GameSaves) {
          for await (const line of saves.exportLines(metadata.worldId, metadata.id))
            yield Buffer.from(line, 'utf8');
        })(this.nativeSaves),
        metadata,
      );
    }
    yield encoded({
      type: 'footer',
      blobs: blobCount,
      bytes: totalBytes,
      checksum: hash.digest('hex'),
    });
  }

  async import(
    stream: AsyncIterable<Uint8Array>,
    beforePublish?: (checksum: string) => Promise<void>,
  ): Promise<LabBundleImport> {
    await mkdir(this.importDirectory, { recursive: true, mode: 0o700 });
    const reservation = await this.records.reserve(LAB_STORAGE_DEFAULTS.terminalBytes);
    let directory: string;
    try {
      directory = await mkdtemp(join(this.importDirectory, `.pending-${process.pid}-`));
    } catch (error) {
      await this.records.release(reservation);
      throw error;
    }
    const blobs: StagedBlob[] = [];
    const blobIds = new Set<string>();
    const createdArtifacts: LabArtifact[] = [];
    const configuredRuns: string[] = [];
    const importedCheckpoints: Array<Awaited<ReturnType<typeof importLabCheckpoint>>> = [];
    let active:
      | {
          header: z.infer<typeof blobSchema>;
          file: Awaited<ReturnType<typeof open>>;
          path: string;
          bytes: number;
          hash: ReturnType<typeof createHash>;
        }
      | undefined;
    let checksum = '';
    let header: z.infer<typeof headerSchema> | undefined,
      finished = false;
    const hash = createHash('sha256');
    let wireBytes = 0;
    try {
      for await (const row of lines(stream, LAB_STORAGE_DEFAULTS.chunkBytes)) {
        let value: unknown;
        try {
          value = JSON.parse(row.toString('utf8'));
        } catch {
          throw new LabStorageError('invalid', 'Bundle contains invalid JSON.');
        }
        const type = value && typeof value === 'object' && 'type' in value ? value.type : undefined;
        if (finished)
          throw new LabStorageError(
            'invalid',
            'Bundle contains material after its final integrity record.',
          );
        if (type === 'footer') {
          if (!header || active)
            throw new LabStorageError('integrity', 'Bundle ended with an incomplete payload.');
          const footer = footerSchema.parse(value);
          if (
            footer.blobs !== blobs.length ||
            footer.bytes !== wireBytes ||
            footer.checksum !== hash.digest('hex')
          )
            throw new LabStorageError('integrity', 'Bundle integrity check failed.');
          finished = true;
          checksum = footer.checksum;
          continue;
        }
        hash.update(row);
        wireBytes += row.length;
        if (!header) {
          header = headerSchema.parse(value);
          continue;
        }
        if (type === 'blob') {
          if (active) throw new LabStorageError('invalid', 'Bundle payloads cannot overlap.');
          const item = blobSchema.parse(value);
          if (item.kind === 'entry' && item.bytes > CHECKPOINT_LIMITS.rowBytes)
            throw new LabStorageError(
              'invalid',
              'A metadata entry exceeds the 1 MiB native row work bound. Long evidence must use streamed artifacts.',
            );
          const blobKey = JSON.stringify([item.kind, item.id]);
          if (blobIds.has(blobKey))
            throw new LabStorageError('invalid', 'Repeated bundle payload identity.');
          blobIds.add(blobKey);
          const path = join(directory, randomUUID());
          active = {
            header: item,
            file: await open(path, 'wx', 0o600),
            path,
            bytes: 0,
            hash: createHash('sha256'),
          };
        } else if (type === 'chunk') {
          const chunk = chunkSchema.parse(value);
          if (!active || active.header.id !== chunk.id || active.bytes !== chunk.offset)
            throw new LabStorageError('integrity', 'Bundle payload offsets are inconsistent.');
          if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(chunk.data))
            throw new LabStorageError('invalid', 'Bundle chunk has invalid base64 data.');
          const bytes = Buffer.from(chunk.data, 'base64');
          if (bytes.length > CHUNK_BYTES || active.bytes + bytes.length > active.header.bytes)
            throw new LabStorageError('integrity', 'Bundle payload exceeds its declared size.');
          if (bytes.length) await this.records.growReservation(reservation, bytes.length);
          await active.file.writeFile(bytes);
          active.bytes += bytes.length;
          active.hash.update(bytes);
        } else if (type === 'end') {
          const end = endSchema.parse(value);
          if (
            !active ||
            active.header.id !== end.id ||
            active.bytes !== active.header.bytes ||
            active.hash.digest('hex') !== active.header.checksum
          )
            throw new LabStorageError('integrity', 'Bundle payload integrity check failed.');
          await active.file.sync();
          await active.file.close();
          blobs.push({ header: active.header, file: active.path });
          active = undefined;
        } else throw new LabStorageError('invalid', 'Unsupported bundle record.');
      }
      if (!finished || !header) throw new LabStorageError('integrity', 'Bundle is incomplete.');
      const recordIds = new Set<string>(),
        artifactIds = new Set<string>(),
        nativeIds = new Set<string>(),
        runIds = new Set<string>(),
        stageIds = new Set<string>();
      const ownership = new Map<
        string,
        {
          runId?: string;
          parentId?: string;
          links: Array<{ kind: 'artifact' | 'checkpoint' | 'record'; id: string }>;
        }
      >();
      const entries: StagedBlob[] = [],
        artifacts: Array<{ blob: StagedBlob; metadata: LabArtifact }> = [],
        natives: Array<{ blob: StagedBlob; metadata: SaveFileMetadata }> = [];
      let root: LabRecord | undefined;
      for (const blob of blobs) {
        if (blob.header.kind === 'entry') {
          const item = parseEntry(JSON.parse(await readFile(blob.file, 'utf8')));
          entries.push(blob);
          if (item.kind === 'record') {
            if (recordIds.has(item.record.id))
              throw new LabStorageError('invalid', 'Repeated imported record identity.');
            recordIds.add(item.record.id);
            ownership.set(item.record.id, {
              runId: item.record.runId,
              parentId: item.record.parentId,
              links: item.links,
            });
            if (item.record.kind === 'run') runIds.add(item.record.id);
            if (item.record.kind === 'stage') stageIds.add(item.record.id);
            if (item.record.id === header.id) root = item.record;
          }
        } else if (blob.header.kind === 'artifact') {
          const metadata = artifactSchema.parse(blob.header.metadata);
          if (
            metadata.id !== blob.header.id ||
            metadata.bytes !== blob.header.bytes ||
            metadata.checksum !== blob.header.checksum
          )
            throw new LabStorageError('integrity', 'Artifact metadata disagrees with its content.');
          artifactIds.add(metadata.id);
          artifacts.push({ blob, metadata });
        } else {
          const metadata = nativeSchema.parse(blob.header.metadata);
          if (
            metadata.id !== blob.header.id ||
            metadata.bytes !== blob.header.bytes ||
            metadata.checksum !== blob.header.checksum
          )
            throw new LabStorageError('integrity', 'Native metadata disagrees with its content.');
          await this.nativeSaves.validateLines(metadata.worldId, nativeLines(blob.file, false));
          nativeIds.add(metadata.id);
          natives.push({ blob, metadata });
        }
      }
      if (!root || root.kind !== header.kind)
        throw new LabStorageError(
          'invalid',
          'The selected bundle record is missing or has the wrong kind.',
        );
      const reachable = new Set<string>(),
        neededArtifacts = new Set<string>(),
        neededNative = new Set<string>(),
        pending = [root.id];
      const childrenByRun = new Map<string, string[]>();
      for (const [childId, child] of ownership)
        if (child.runId) {
          const children = childrenByRun.get(child.runId) ?? [];
          children.push(childId);
          childrenByRun.set(child.runId, children);
        }
      for (let index = 0; index < pending.length; index++) {
        const id = pending[index];
        if (!id || reachable.has(id)) continue;
        reachable.add(id);
        const owner = ownership.get(id);
        if (!owner)
          throw new LabStorageError(
            'invalid',
            'The bundle is missing a retained record dependency.',
          );
        if (owner.parentId) pending.push(owner.parentId);
        if (owner.runId && owner.runId !== id) pending.push(owner.runId);
        if (runIds.has(id)) pending.push(...(childrenByRun.get(id) ?? []));
        for (const link of owner.links) {
          if (link.kind === 'record') pending.push(link.id);
          else if (link.kind === 'artifact') neededArtifacts.add(link.id);
          else neededNative.add(link.id);
        }
      }
      if (
        reachable.size !== recordIds.size ||
        [...artifactIds].some((id) => !neededArtifacts.has(id)) ||
        [...nativeIds].some((id) => !neededNative.has(id))
      )
        throw new LabStorageError('invalid', 'The bundle contains unrelated records or payloads.');
      let selectedExperiment: LabExperimentSnapshot | undefined;
      for (const blob of entries) {
        const item = parseEntry(JSON.parse(await readFile(blob.file, 'utf8')));
        if (item.kind !== 'record' || !['scenario', 'checkpoint'].includes(item.record.kind))
          continue;
        const saved = labSavedDataSchema.parse(item.record.data);
        const context = artifacts.find((value) => value.metadata.id === saved.experimentArtifactId);
        if (
          !context ||
          context.metadata.contentType !== LAB_EXPERIMENT_CONTENT_TYPE ||
          !item.links.some(
            (link) => link.kind === 'artifact' && link.id === saved.experimentArtifactId,
          )
        )
          throw new LabStorageError(
            'invalid',
            'The saved experiment context is missing its exact artifact.',
          );
        const decoded = await decodeLabExperiment(
          fileChunks(context.blob.file),
          context.metadata.bytes,
        );
        if (item.record.id === root.id) selectedExperiment = decoded;
      }
      // Complete input and dependency validation precedes application admission.
      // The host binds an upload command to these exact verified bytes before
      // any retained descriptor, native file or world replacement is published.
      await beforePublish?.(checksum);
      const runAllowances: Array<{ id: string; bytes: number }> = [];
      for (const blob of entries) {
        const item = parseEntry(JSON.parse(await readFile(blob.file, 'utf8')));
        if (item.kind === 'record') {
          if (item.record.runId && !runIds.has(item.record.runId))
            throw new LabStorageError('invalid', 'An imported child is missing its exact run.');
          if (item.record.parentId && !recordIds.has(item.record.parentId))
            throw new LabStorageError('invalid', 'An imported child is missing its exact parent.');
          for (const link of item.links)
            if (
              !(
                link.kind === 'record'
                  ? recordIds
                  : link.kind === 'artifact'
                    ? artifactIds
                    : nativeIds
              ).has(link.id)
            )
              throw new LabStorageError('invalid', 'The bundle is missing a retained dependency.');
          if (item.record.kind === 'scenario' || item.record.kind === 'checkpoint') {
            const saved = labSavedDataSchema.parse(item.record.data),
              native = natives.find((value) => value.metadata.id === saved.checkpoint.id)?.metadata;
            if (
              !native ||
              native.worldId !== saved.checkpoint.worldId ||
              native.bytes !== saved.checkpoint.bytes ||
              native.checksum !== saved.checkpoint.checksum
            )
              throw new LabStorageError(
                'invalid',
                'The experiment snapshot lacks its exact native checkpoint.',
              );
          }
          const prior = await this.records.getRecord(item.record.id);
          if (prior && JSON.stringify(prior) !== JSON.stringify(item.record))
            throw new LabStorageError(
              'conflict',
              'Imported record identity conflicts with retained evidence.',
            );
          if (item.record.kind === 'run' && !(await this.records.runUsage(item.record.id)))
            runAllowances.push({
              id: item.record.id,
              bytes: item.runAllowanceBytes ?? LAB_STORAGE_DEFAULTS.runCaptureBytes,
            });
        } else if (
          item.kind === 'evidence' &&
          (!stageIds.has(item.stageId) ||
            item.items.some((value) => value.stageId !== item.stageId))
        )
          throw new LabStorageError('invalid', 'Evidence is missing its exact stage.');
        else if (item.kind === 'attempt' && !runIds.has(item.runId))
          throw new LabStorageError('invalid', 'Attempt evidence is missing its exact run.');
      }
      // Files retain their actual per-run admission before metadata publication.
      // Empty newly owned configurations are discarded if any later step fails.
      for (const run of runAllowances) {
        configuredRuns.push(run.id);
        await this.records.configureRun(run.id, run.bytes);
      }
      for (const { blob, metadata } of natives) {
        const charge = await this.records.reserve(
          metadata.bytes + LAB_STORAGE_DEFAULTS.terminalBytes,
        );
        try {
          importedCheckpoints.push(
            await importLabCheckpoint(
              this.records,
              this.nativeSaves,
              metadata,
              nativeLines(blob.file, true),
              charge,
            ),
          );
        } finally {
          await this.records.release(charge);
        }
      }
      for (const { blob, metadata } of artifacts) {
        const prior = await this.records.artifact(metadata.id);
        if (!prior) createdArtifacts.push(metadata);
        await this.records.putArtifactStream(fileChunks(blob.file), metadata);
      }
      await this.records.publishImport(
        (async function* () {
          for (const blob of entries)
            yield parseEntry(JSON.parse(await readFile(blob.file, 'utf8')));
        })(),
      );
      const saved =
        root.kind === 'scenario' || root.kind === 'checkpoint'
          ? labSavedDataSchema.parse(root.data)
          : undefined;
      return {
        ok: true,
        message: 'Saved work imported and validated. The active world is unchanged.',
        importId: root.id,
        recordId: root.id,
        kind: header.kind,
        name: root.name,
        completeness: header.completeness,
        ...(saved ? { checkpoint: saved.checkpoint, experiment: selectedExperiment } : {}),
      };
    } catch (error) {
      const failures: unknown[] = [];
      for (const cleanup of [
        ...createdArtifacts.map(
          (artifact) => () => this.records.removeUnreferencedArtifact(artifact.id),
        ),
        ...importedCheckpoints.map((checkpoint) => () => checkpoint.rollback()),
        ...configuredRuns.map((runId) => () => this.records.discardUnpublishedRun(runId)),
      ])
        try {
          await cleanup();
        } catch (failure) {
          failures.push(failure);
        }
      if (failures.length)
        throw new AggregateError([error, ...failures], 'Bundle import cleanup was incomplete.');
      throw error;
    } finally {
      try {
        await active?.file.close();
      } finally {
        try {
          await rm(directory, { recursive: true, force: true });
        } finally {
          await this.records.release(reservation);
        }
      }
    }
  }
}
