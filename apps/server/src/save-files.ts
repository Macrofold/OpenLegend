import { mkdir, open, opendir, readFile, rename, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CHECKPOINT_ENCODING, CHECKPOINT_LIMITS } from './checkpoint-format.js';

const metadataSchema = z
  .object({
    id: z.string().uuid(),
    worldId: z.string().min(1),
    label: z.string().min(1).max(80),
    createdAt: z.string().datetime(),
    simTime: z.number().finite(),
    format: z.string().min(1),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    encoding: z.literal(CHECKPOINT_ENCODING).optional(),
    kind: z.enum(['manual', 'auto', 'recovery']).optional(),
    bytes: z.number().int().positive().max(CHECKPOINT_LIMITS.bytes).optional(),
    rows: z.number().int().positive().max(CHECKPOINT_LIMITS.rows).optional(),
    revision: z.number().int().nonnegative().optional(),
  })
  .refine(
    (metadata) =>
      !metadata.encoding || (metadata.bytes !== undefined && metadata.rows !== undefined),
    {
      message: 'Streamed checkpoint metadata requires byte and record counts.',
    },
  );
export type SaveFileMetadata = z.infer<typeof metadataSchema>;
export interface SavePosition {
  id: string;
  createdAt: string;
}
export const compareSaves = (a: SavePosition, b: SavePosition) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
export async function syncDirectory(path: string) {
  const directory = await open(path, 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

/** Immutable local slots: only complete packages are published into this namespace. */
export class SaveFiles {
  issueCount = 0;
  constructor(private readonly directory: string) {}
  private path(id: string) {
    if (!z.string().uuid().safeParse(id).success) throw new Error('Invalid save identifier.');
    return join(this.directory, id);
  }
  async cleanInterruptedStages() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    for await (const entry of await opendir(this.directory)) {
      const match = /^\.pending-([1-9][0-9]*)-([a-f0-9-]{36})$/.exec(entry.name);
      if (!entry.isDirectory() || !match || !z.string().uuid().safeParse(match[2]).success)
        continue;
      try {
        process.kill(Number(match[1]), 0);
      } catch (error) {
        // Only a demonstrably dead local owner is safe to reclaim. PID reuse,
        // permission errors and legacy stages remain available for operator review.
        if ((error as NodeJS.ErrnoException).code === 'ESRCH')
          await rm(join(this.directory, entry.name), { recursive: true, force: true });
      }
    }
  }
  async list(
    worldId: string,
    options: {
      limit?: number;
      before?: SavePosition;
      kind?: SaveFileMetadata['kind'];
      excludeRecovery?: boolean;
    } = {},
  ): Promise<SaveFileMetadata[]> {
    if (
      options.limit !== undefined &&
      (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 101)
    )
      throw new Error('Invalid catalog page size.');
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const entries = await opendir(this.directory);
    const saves: SaveFileMetadata[] = [];
    let issues = 0;
    for await (const entry of entries) {
      if (!entry.isDirectory() || !z.string().uuid().safeParse(entry.name).success) continue;
      try {
        const metadata = await this.metadata(entry.name);
        if (!metadata) throw new Error('Save metadata is missing.');
        if (metadata.worldId === worldId) {
          const size = (
            await stat(
              join(this.path(entry.name), metadata.encoding ? 'world.jsonl' : 'world.json'),
            )
          ).size;
          if (
            size <= 0 ||
            size > (metadata.encoding ? CHECKPOINT_LIMITS.bytes : 64 * 1024 * 1024) ||
            (metadata.bytes !== undefined && size !== metadata.bytes)
          )
            throw new Error('Incomplete save payload.');
          if (
            (options.kind && metadata.kind !== options.kind) ||
            (options.excludeRecovery && metadata.kind === 'recovery') ||
            (options.before && compareSaves(metadata, options.before) <= 0)
          )
            continue;
          saves.push(metadata);
          if (options.limit && saves.length > options.limit) {
            saves.sort(compareSaves);
            saves.pop();
          }
        }
      } catch {
        issues++;
      }
    }
    this.issueCount = issues;
    return saves.sort(compareSaves);
  }
  async metadata(id: string): Promise<SaveFileMetadata | null> {
    const path = join(this.path(id), 'metadata.json');
    try {
      if ((await stat(path)).size > 16 * 1024)
        throw new Error('Save metadata exceeds its allowance.');
      const metadata = metadataSchema.parse(JSON.parse(await readFile(path, 'utf8')));
      if (metadata.id !== id) throw new Error('Save metadata identity mismatch.');
      return metadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
  async write(metadata: SaveFileMetadata, payload: string): Promise<void> {
    await this.publish(
      metadata,
      (async function* () {
        yield payload;
      })(),
    );
  }
  async writeStream(
    metadata: Omit<SaveFileMetadata, 'checksum'>,
    lines: AsyncIterable<string>,
  ): Promise<void> {
    await this.publish(
      { ...metadata, checksum: '0'.repeat(64), encoding: CHECKPOINT_ENCODING },
      lines,
    );
  }
  private async publish(metadata: SaveFileMetadata, chunks: AsyncIterable<string>): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const destination = this.path(metadata.id);
    const staging = join(this.directory, `.pending-${process.pid}-${randomUUID()}`);
    await mkdir(staging, { mode: 0o700 });
    try {
      const file = await open(
        join(staging, metadata.encoding ? 'world.jsonl' : 'world.json'),
        'wx',
        0o600,
      );
      const hash = createHash('sha256');
      let bytes = 0,
        rows = 0,
        pending = '',
        pendingBytes = 0;
      try {
        for await (const chunk of chunks) {
          const size = Buffer.byteLength(chunk);
          if (
            (metadata.encoding && size > CHECKPOINT_LIMITS.rowBytes) ||
            (bytes += size) > CHECKPOINT_LIMITS.bytes ||
            ++rows > CHECKPOINT_LIMITS.rows
          )
            throw new Error(
              'Checkpoint exceeds its record, row-count or total-byte allowance; previous saves retained.',
            );
          hash.update(chunk);
          pending += chunk;
          pendingBytes += size;
          if (pendingBytes >= 256 * 1024) {
            await file.writeFile(pending);
            pending = '';
            pendingBytes = 0;
          }
        }
        if (pending) await file.writeFile(pending);
        await file.sync();
      } finally {
        await file.close();
      }
      const complete = metadata.encoding
        ? { ...metadata, checksum: hash.digest('hex'), bytes, rows }
        : metadata;
      metadataSchema.parse(complete);
      const manifest = await open(join(staging, 'metadata.json'), 'wx', 0o600);
      try {
        await manifest.writeFile(JSON.stringify(complete));
        await manifest.sync();
      } finally {
        await manifest.close();
      }
      await syncDirectory(staging);
      // A published destination is nonempty: rename cannot replace it. Staging
      // paths are private and never interpreted as restore points after interruption.
      await rename(staging, destination);
      await syncDirectory(this.directory);
    } catch (error) {
      await rm(staging, { recursive: true, force: true });
      throw error;
    }
  }
  async read(id: string, maxBytes: number): Promise<string> {
    const path = join(this.path(id), 'world.json');
    if ((await stat(path)).size > maxBytes) throw new Error('Save exceeds the supported size.');
    return readFile(path, 'utf8');
  }
  async *lines(metadata: SaveFileMetadata): AsyncGenerator<string> {
    const path = join(this.path(metadata.id), 'world.jsonl');
    if (metadata.bytes === undefined || (await stat(path)).size !== metadata.bytes)
      throw new Error('Incomplete checkpoint payload.');
    const hash = createHash('sha256');
    let bytes = 0,
      rows = 0,
      pending = Buffer.alloc(0);
    for await (const value of createReadStream(path, { highWaterMark: 64 * 1024 })) {
      const chunk = value as Buffer;
      bytes += chunk.length;
      if (bytes > CHECKPOINT_LIMITS.bytes)
        throw new Error('Checkpoint exceeds the total-byte allowance.');
      hash.update(chunk);
      pending = Buffer.concat([pending, chunk]);
      let end: number;
      while ((end = pending.indexOf(10)) >= 0) {
        if (end + 1 > CHECKPOINT_LIMITS.rowBytes || ++rows > CHECKPOINT_LIMITS.rows)
          throw new Error('Checkpoint record exceeds its allowance.');
        const line = pending.subarray(0, end).toString('utf8');
        pending = pending.subarray(end + 1);
        yield line;
      }
      if (pending.length > CHECKPOINT_LIMITS.rowBytes)
        throw new Error('Checkpoint record exceeds its allowance.');
    }
    if (
      pending.length ||
      bytes !== metadata.bytes ||
      rows !== metadata.rows ||
      hash.digest('hex') !== metadata.checksum
    )
      throw new Error('Checkpoint integrity check failed.');
  }
  async verify(metadata: SaveFileMetadata) {
    if (metadata.encoding) {
      for await (const _line of this.lines(metadata)) {
        /* Validate the complete stream before retention. */
      }
    } else if (
      createHash('sha256')
        .update(await this.read(metadata.id, 64 * 1024 * 1024))
        .digest('hex') !== metadata.checksum
    )
      throw new Error('Save integrity check failed.');
  }
  async confirmPublished(metadata: SaveFileMetadata) {
    await this.verify(metadata);
    // A previous attempt may have renamed successfully but failed parent fsync.
    // A retry must establish durability before acknowledging that immutable slot.
    await syncDirectory(this.directory);
  }
  async delete(id: string): Promise<void> {
    await rm(this.path(id), { recursive: true, force: true });
    await syncDirectory(this.directory);
  }
}
