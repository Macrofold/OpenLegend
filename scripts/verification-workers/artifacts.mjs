import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat, mkdir, rm, link } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { createNetworkOwner } from '@open-legend/network';
import {
  consumeSdkReadable,
  pipeOwned,
  ownNodeStream,
  waitSdkValue,
} from '@open-legend/network/node';
import { defaults } from './contracts.mjs';
import { json, hashFile } from './files.mjs';
import { clientOptions, send } from './aws.mjs';
const s3 = new S3Client(clientOptions());
const owner = createNetworkOwner({ role: 'verification-artifacts', capacity: 3 });
export function upload(bucket, key, path, disposable = false, exclusive = false) {
  return owner.run({ timeoutMs: 180_000 }, async (operation) => {
    const info = await stat(path);
    const source = createReadStream(path);
    const owned = ownNodeStream(operation, source);
    try {
      await waitSdkValue(operation, 'connect', (signal) =>
        s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentLength: info.size,
            ...(exclusive ? { IfNoneMatch: '*' } : {}),
            Body: source,
            ...(disposable ? { Tagging: 'disposable=true' } : {}),
          }),
          { abortSignal: signal },
        ),
      );
    } finally {
      owned.stop();
    }
  });
}
export function download(bucket, key, path, maxBytes, timeoutMs = 180_000) {
  return owner.run({ timeoutMs }, (operation) =>
    consumeSdkReadable(
      operation,
      (signal) =>
        s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: signal }),
      (result) => ({ source: result.Body, metadata: result.ContentLength }),
      async (body, bytes) => {
        if (bytes > maxBytes) throw new Error('Artifact exceeds its admitted size.');
        await mkdir(dirname(path), { recursive: true, mode: 0o700 });
        const temporary = `${path}.${randomUUID()}.download`;
        try {
          await pipeOwned(
            operation,
            body,
            createWriteStream(temporary, { flags: 'wx', mode: 0o600 }),
            { maxBytes },
          );
          await link(temporary, path);
        } finally {
          await rm(temporary, { force: true });
        }
      },
    ),
  );
}
export function getJson(bucket, key, maxBytes = 8 * 1024 ** 2) {
  return owner.run({ timeoutMs: 30_000 }, (operation) =>
    consumeSdkReadable(
      operation,
      (signal) =>
        s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: signal }),
      (result) => ({ source: result.Body, metadata: result.ContentLength }),
      async (body, bytes) => {
        if (bytes > maxBytes) throw new Error('JSON artifact exceeds its admitted size.');
        const chunks = [];
        let size = 0;
        for await (const chunk of body) {
          operation.throwIfStopped();
          size += chunk.length;
          if (size > maxBytes) throw new Error('JSON artifact too large.');
          chunks.push(chunk);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
      },
    ),
  );
}

// Only the operator stages source; an uncertain HEAD is not permission to overwrite.
export async function staged(bucket, key, minimumFreshUntil) {
  try {
    const value = await send(s3, HeadObjectCommand, { Bucket: bucket, Key: key });
    return value.LastModified.getTime() + defaults.retentionMs > minimumFreshUntil;
  } catch (error) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') return false;
    throw error;
  }
}

export async function stageArchive(bucket, prefix, descriptorPath, archive, freshUntil) {
  const start = performance.now(),
    descriptor = await json(descriptorPath);
  const archiveReused = await staged(bucket, `${prefix}.tar.gz`, freshUntil),
    descriptorReused = await staged(bucket, `${prefix}.json`, freshUntil);
  if (!archiveReused) {
    if ((await hashFile(archive)) !== descriptor.archiveSha256)
      throw new Error('Captured archive changed; refusing replacement input.');
    await upload(bucket, `${prefix}.tar.gz`, archive, true);
  }
  if (!descriptorReused) await upload(bucket, `${prefix}.json`, descriptorPath, true);
  return {
    prefix,
    archiveReused,
    descriptorReused,
    bytes: descriptor.archiveBytes,
    elapsedMs: performance.now() - start,
  };
}
