import { createHash, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createReadStream, createWriteStream } from 'node:fs';
import { link, stat, unlink } from 'node:fs/promises';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromIni, fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { createNetworkOwner, type NetworkOperation, type NetworkPhase } from '@open-legend/network';
import {
  consumeSdkReadable,
  ownNodeStream,
  pipeOwned,
  waitSdkValue,
  waitForOperationResources,
} from '@open-legend/network/node';
import type { AssetStoragePurpose } from './asset-configuration.js';
import {
  artifactKey,
  isArtifactObjectKey,
  assertArtifactReference,
  isAssetStorageId,
  isRepositoryAssetPath,
  type ArtifactBoundary,
  type ArtifactReference,
} from '@open-legend/assets';

const metadataNetwork = createNetworkOwner({ role: 'server-asset-metadata', capacity: 8 });
const transferNetwork = createNetworkOwner({ role: 'tool-asset-transfer', capacity: 4 });
const storageOperation = new AsyncLocalStorage<NetworkOperation>();
const storageParent = new AsyncLocalStorage<NetworkOperation>();
const responseByteLimit = new AsyncLocalStorage<number>();

/** A finite operator workflow owns its original deadline across storage clients.
 * Each leaf still admits its existing service slot; nested SDK phases reuse it. */
export function withAssetStorageOperation<T>(
  parent: NetworkOperation,
  work: () => Promise<T>,
): Promise<T> {
  // A workflow phase preserves approval/AWS error identity and inherits both
  // parent clocks; rounding the selected duration never extends its deadline.
  return parent.within(Math.max(1, Math.ceil(parent.remainingMs())), (operation) =>
    storageParent.run(operation, async () => {
      operation.throwIfStopped();
      const result = await work();
      operation.throwIfStopped();
      return result;
    }),
  );
}

async function settleStorageResources<T>(
  operation: NetworkOperation,
  work: Promise<T>,
): Promise<T> {
  let result: T;
  try {
    result = await work;
  } catch (error) {
    try {
      await waitForOperationResources(operation, { bounded: true });
    } catch {
      // Keep the failed attempt's semantic error. The enclosing network owner
      // reports expiry and retains every resource whose actual close is unknown.
    }
    throw error;
  }
  // The SDK body can close before the original HTTP source. Observe that source
  // outside the tracked consumer callback so cleanup cannot wait on itself.
  await waitForOperationResources(operation, { bounded: true });
  return result;
}

/** The SDK caches handler configuration, so derive the current operation's
 * remaining time at handle(), including clients created by credential providers. */
class AssetHttpHandler extends NodeHttpHandler {
  override async handle(...[request, options]: Parameters<NodeHttpHandler['handle']>) {
    const operation = storageOperation.getStore();
    if (!operation) throw new Error('Asset HTTP request has no admitted network operation.');
    operation.throwIfStopped();
    const result = await super.handle(request, {
      ...options,
      abortSignal: options?.abortSignal ?? operation.signal,
      requestTimeout: Math.max(1, Math.ceil(operation.remainingMs())),
    });
    const source: unknown = result.response.body;
    if (!(source instanceof Readable)) {
      operation.throwIfStopped();
      return result;
    }
    const input = ownNodeStream(operation, source, { adoptLate: true });
    try {
      operation.throwIfStopped();
    } catch (error) {
      input.stop();
      throw error;
    }
    const streamMaximum =
      result.response.statusCode >= 200 && result.response.statusCode < 300
        ? responseByteLimit.getStore()
        : undefined;
    if (request.method === 'HEAD' || [204, 205, 304].includes(result.response.statusCode)) {
      input.stop();
      await input.closed;
      operation.throwIfStopped();
      return { response: { ...result.response, body: new Uint8Array() } };
    }
    if (streamMaximum === undefined) {
      const chunks: Buffer[] = [];
      const sink = new Writable({
        write(chunk: Buffer, _encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        },
      });
      await pipeOwned(operation, source, sink, { maxBytes: 1_048_576 });
      operation.throwIfStopped();
      return { response: { ...result.response, body: Buffer.concat(chunks) } };
    }
    const maximum = streamMaximum;
    let received = 0;
    const bounded = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        callback(
          received > maximum
            ? new Error('Asset SDK reply exceeded its admitted byte allowance.')
            : null,
          chunk,
        );
      },
    });
    ownNodeStream(operation, bounded);
    // Apply the encoded-body allowance before SDK XML/error decoding can buffer
    // it. The original source and bounded body remain owned through real closure.
    void pipeline(source, bounded, { signal: operation.signal }).catch(() => undefined);
    return { response: { ...result.response, body: bounded } };
  }
}

export interface AssetStorageConfiguration {
  profile: string;
  region: string;
  accountId: string;
  buckets: Partial<Record<ArtifactBoundary, string>>;
  roleArns?: Partial<Record<AssetStoragePurpose, string>>;
  /** Prevent accidental enormous transfers before allocating SDK/stream resources. */
  maxObjectBytes: number;
  transferTimeoutMs?: number;
}
export interface ExactStoredObject {
  accountId: string;
  region: string;
  bucket: string;
  key: string;
  versionId?: string;
  sourceVersionId?: string;
  sha256: string;
  bytes: number;
  mediaType: string;
}
export interface RecoveryAuthorityObject {
  bytes: Uint8Array;
  etag: string;
  versionId?: string;
}
export interface CurrentAssetRemoval {
  accountId: string;
  region: string;
  bucket: string;
  reference: ArtifactReference;
  key: string;
  deleteMarkerVersionId: string;
  removedAt: string;
}
export async function hashAssetFile(path: string): Promise<{ sha256: string; bytes: number }> {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { sha256: hash.digest('hex'), bytes };
}

/** Exact transfer only. Logical rights, publication and retained pins belong to
 * AssetPublisher; a successful upload never selects or authorizes an appearance. */
export class S3AssetStorage {
  private readonly client: S3Client;
  private readonly identity: STSClient;
  private readonly handler: NodeHttpHandler;
  private closed = false;
  private verifiedIdentity?: Promise<string>;
  constructor(
    readonly configuration: AssetStorageConfiguration,
    readonly purpose: AssetStoragePurpose = 'authoring',
  ) {
    if (
      !configuration.profile ||
      !configuration.region ||
      !/^\d{12}$/.test(configuration.accountId) ||
      !Number.isSafeInteger(configuration.maxObjectBytes) ||
      configuration.maxObjectBytes < 1 ||
      (configuration.transferTimeoutMs !== undefined &&
        (!Number.isSafeInteger(configuration.transferTimeoutMs) ||
          configuration.transferTimeoutMs < 1))
    )
      throw new Error(
        'Asset storage requires an explicit project, profile, Region and byte allowance.',
      );
    // Nested STS/SSO/sign-in clients receive the same finite transport settings.
    // The enclosing operation additionally bounds credential providers that do
    // not expose an abort hook, and rejects their late values before S3 starts.
    this.handler = new AssetHttpHandler({
      connectionTimeout: 10_000,
      requestTimeout: 30_000,
      socketTimeout: 30_000,
      throwOnRequestTimeout: true,
    });
    const options = { region: configuration.region, maxAttempts: 1, requestHandler: this.handler };
    const master = fromIni({ profile: configuration.profile, clientConfig: options });
    const masterCredentials = () => this.sdk(() => master(), 'credentials');
    const roleArn = configuration.roleArns?.[purpose];
    if (configuration.roleArns && !roleArn)
      throw new Error(`No asset storage role is configured for ${purpose}.`);
    if (
      roleArn &&
      !new RegExp(`^arn:aws:iam::${configuration.accountId}:role/[A-Za-z0-9_+=,.@/-]+$`).test(
        roleArn,
      )
    )
      throw new Error('Asset storage roles must belong to the configured AWS project.');
    const roleCredentials = roleArn
      ? fromTemporaryCredentials({
          masterCredentials,
          clientConfig: options,
          params: { RoleArn: roleArn, RoleSessionName: `openlegend-assets-${purpose}` },
        })
      : masterCredentials;
    this.client = new S3Client({
      ...options,
      // The SDK resolves credentials lazily inside the first object command. Their
      // STS/SSO replies are metadata, not that object: keep them out of its exact
      // byte allowance, or a file smaller than the credential reply stalls until
      // the transfer deadline. They keep the handler's small-reply limit.
      credentials: () =>
        responseByteLimit.exit(() => this.sdk(() => roleCredentials(), 'credentials')),
    });
    // Logical approval belongs to the authenticated human/operator; assuming a
    // narrower storage role never changes that PostgreSQL authority identity.
    this.identity = new STSClient({ ...options, credentials: masterCredentials });
  }
  private network<T>(
    timeoutMs: number,
    work: () => Promise<T>,
    signal?: AbortSignal,
    owner = metadataNetwork,
  ): Promise<T> {
    if (this.closed) return Promise.reject(new Error('Asset storage is closed.'));
    const current = storageOperation.getStore();
    if (current) {
      current.throwIfStopped();
      return work();
    }
    return owner.run({ timeoutMs, signal, parent: storageParent.getStore() }, (operation) =>
      storageOperation.run(operation, work),
    );
  }
  private transfer<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return this.network(
      this.configuration.transferTimeoutMs ?? 300_000,
      work,
      signal,
      transferNetwork,
    );
  }
  private operation(): NetworkOperation {
    const operation = storageOperation.getStore();
    if (!operation) throw new Error('Asset storage work has no admitted network operation.');
    operation.throwIfStopped();
    return operation;
  }
  private sdk<T>(
    start: (signal: AbortSignal) => Promise<T>,
    phase: NetworkPhase = 'connect',
  ): Promise<T> {
    return waitSdkValue(this.operation(), phase, start);
  }
  async principal(): Promise<string> {
    if (this.closed) throw new Error('Asset storage is closed.');
    const current = storageOperation.getStore() ?? storageParent.getStore();
    current?.throwIfStopped();
    if (!this.verifiedIdentity) {
      const pending = metadataNetwork.run({ timeoutMs: 30_000 }, (operation) =>
        storageOperation.run(operation, async () => {
          const identity = await this.sdk((signal) =>
            this.identity.send(new GetCallerIdentityCommand({}), { abortSignal: signal }),
          );
          operation.throwIfStopped();
          if (identity.Account !== this.configuration.accountId || !identity.Arn)
            throw new Error('AWS identity does not match the configured asset project.');
          // Session suffixes expire; the authenticated role remains the operator identity.
          const match = /^arn:aws:sts::(\d+):assumed-role\/(.+)\/[^/]+$/.exec(identity.Arn);
          return match ? `arn:aws:iam::${match[1]}:role/${match[2]}` : identity.Arn;
        }),
      );
      this.verifiedIdentity = pending;
      void pending.catch(() => {
        if (this.verifiedIdentity === pending) this.verifiedIdentity = undefined;
      });
    }
    const pending = this.verifiedIdentity;
    return current ? current.wait('credentials', () => pending) : pending;
  }
  bucket(boundary: ArtifactBoundary): string {
    const bucket = this.configuration.buckets[boundary];
    if (!bucket) throw new Error(`Storage boundary is not configured: ${boundary}`);
    return bucket;
  }
  private admit(reference: ArtifactReference): void {
    assertArtifactReference(reference);
    if (reference.bytes > this.configuration.maxObjectBytes)
      throw new Error('Asset exceeds the configured transfer byte allowance.');
  }
  private admitKey(reference: ArtifactReference, key: string): void {
    if (!isArtifactObjectKey(reference, key))
      throw new Error('Named object key crosses its declared access boundary.');
  }

  inspect(
    reference: ArtifactReference,
    key = artifactKey(reference),
    versionId?: string,
  ): Promise<ExactStoredObject | undefined> {
    return this.network(30_000, () => this.inspectWithin(reference, key, versionId));
  }
  private async inspectWithin(
    reference: ArtifactReference,
    key = artifactKey(reference),
    versionId?: string,
  ): Promise<ExactStoredObject | undefined> {
    this.admit(reference);
    this.admitKey(reference, key);
    await this.principal();
    try {
      const result = await this.sdk((signal) =>
        this.client.send(
          new HeadObjectCommand({
            Bucket: this.bucket(reference.boundary),
            ExpectedBucketOwner: this.configuration.accountId,
            Key: key,
            VersionId: versionId,
            ChecksumMode: 'ENABLED',
          }),
          { abortSignal: signal },
        ),
      );
      if (result.ContentLength !== reference.bytes || result.ContentType !== reference.mediaType)
        throw new Error(`Stored asset length/type disagrees with its exact reference: ${key}`);
      const expected = Buffer.from(reference.sha256, 'hex').toString('base64');
      // Composite multipart checksums are not hashes of the complete file.
      if (result.ChecksumType !== 'FULL_OBJECT' || result.ChecksumSHA256 !== expected)
        await this.verify(reference, key, result.VersionId);
      return {
        accountId: this.configuration.accountId,
        region: this.configuration.region,
        bucket: this.bucket(reference.boundary),
        key,
        versionId: result.VersionId,
        ...reference,
      };
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
        return undefined;
      throw error;
    }
  }
  private async consume(
    reference: ArtifactReference,
    key: string,
    versionId?: string,
    destination?: string,
    signal?: AbortSignal,
    suppliedSink?: Writable,
  ): Promise<void> {
    this.admit(reference);
    this.admitKey(reference, key);
    const operation = this.operation();
    signal?.throwIfAborted();
    const current = operation;
    return storageOperation.run(current, async () => {
      await this.principal();
      const consuming = consumeSdkReadable(
        current,
        (abortSignal) =>
          responseByteLimit.run(reference.bytes, () =>
            this.client.send(
              new GetObjectCommand({
                Bucket: this.bucket(reference.boundary),
                ExpectedBucketOwner: this.configuration.accountId,
                Key: key,
                VersionId: versionId,
              }),
              { abortSignal },
            ),
          ),
        (output) => {
          if (!(output.Body instanceof Readable))
            throw new Error('S3 did not return a readable asset body.');
          return { source: output.Body, metadata: output };
        },
        async (body, output, context) => {
          if (
            output.ContentLength !== reference.bytes ||
            output.ContentType !== reference.mediaType
          )
            throw new Error('Asset response metadata differs from its admitted file reference.');
          context.throwIfStopped();
          const hash = createHash('sha256');
          const check = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
              hash.update(chunk);
              callback(null, chunk);
            },
          });
          const sink =
            suppliedSink ??
            (destination
              ? createWriteStream(destination, { flags: 'wx', mode: 0o600 })
              : new Writable({
                  write(_chunk, _encoding, callback) {
                    callback();
                  },
                }));
          // The checksum transform belongs to this pipeline; both externally
          // live stream ends remain registered through actual closure.
          const pumping = pipeline(body, check, { signal: current.signal });
          void pumping.catch(() => undefined);
          try {
            await Promise.all([
              pumping,
              pipeOwned(current, check, sink, {
                maxBytes: reference.bytes,
                exactBytes: reference.bytes,
              }),
            ]);
            context.throwIfStopped();
            if (hash.digest('hex') !== reference.sha256)
              throw new Error('Asset checksum did not match the pinned file.');
          } finally {
            body.unpipe(check);
            body.destroy();
            check.destroy();
          }
        },
      );
      await settleStorageResources(current, consuming);
    });
  }
  /** Cache owns the sink and pathname. Late SDK bodies are destroyed before
   * this callback can write, rename or remove any cache file. */
  downloadInto(
    reference: ArtifactReference,
    sink: Writable,
    operation: NetworkOperation,
  ): Promise<void> {
    if (this.closed) return Promise.reject(new Error('Asset storage is closed.'));
    operation.throwIfStopped();
    return storageOperation.run(operation, () =>
      this.consume(reference, artifactKey(reference), undefined, undefined, undefined, sink),
    );
  }
  verify(
    reference: ArtifactReference,
    key = artifactKey(reference),
    versionId?: string,
  ): Promise<void> {
    return this.transfer(() => this.consume(reference, key, versionId));
  }
  download(reference: ArtifactReference, destination: string, signal?: AbortSignal): Promise<void> {
    return this.transfer(
      () => this.downloadPath(reference, artifactKey(reference), destination, signal),
      signal,
    );
  }
  downloadNamed(
    reference: ArtifactReference,
    key: string,
    destination: string,
    signal?: AbortSignal,
    versionId?: string,
  ): Promise<void> {
    return this.transfer(
      () => this.downloadPath(reference, key, destination, signal, versionId),
      signal,
    );
  }
  private async downloadPath(
    reference: ArtifactReference,
    key: string,
    destination: string,
    signal?: AbortSignal,
    versionId?: string,
  ): Promise<void> {
    const operation = this.operation();
    const temporary = `${destination}.openlegend-${randomUUID()}.partial`;
    try {
      await this.consume(reference, key, versionId, temporary, signal);
      operation.throwIfStopped();
      // Same-directory link admission is atomic and refuses an existing output.
      // After unlinking the temporary, the verified tool output is independent;
      // this never links a mutable output to the shared immutable asset cache.
      await link(temporary, destination);
    } finally {
      await waitForOperationResources(operation);
      await unlink(temporary).catch((error: unknown) => {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      });
    }
  }
  private async retryExactTransfer<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        this.operation().throwIfStopped();
        return await operation();
      } catch (error) {
        const status =
          error instanceof S3ServiceException ? error.$metadata.httpStatusCode : undefined;
        const transient =
          (status !== undefined && (status === 429 || status >= 500)) ||
          (error instanceof Error &&
            /\b(?:ECONNRESET|ETIMEDOUT|EPIPE|ECONNABORTED)\b/.test(error.message));
        if (!transient || attempt >= 2) throw error;
        try {
          await waitForOperationResources(this.operation(), { bounded: true });
        } catch {
          // Preserve the failed attempt in its raw workflow; the enclosing owner
          // reports its original deadline and retains unresolved physical work.
          throw error;
        }
        // A fresh stream and absent-only key make a lost acknowledgement safe:
        // the next attempt verifies an existing exact object instead of replacing it.
        await this.operation().wait(
          'connect',
          () => new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt)),
        );
      }
    }
  }
  upload(
    reference: ArtifactReference,
    source: string,
    key = artifactKey(reference),
  ): Promise<ExactStoredObject> {
    return this.transfer(() =>
      this.retryExactTransfer(() => this.uploadOnce(reference, source, key)),
    );
  }
  private async uploadOnce(
    reference: ArtifactReference,
    source: string,
    key = artifactKey(reference),
  ): Promise<ExactStoredObject> {
    this.admit(reference);
    this.admitKey(reference, key);
    await this.principal();
    // A known existing object avoids sending a large body only to receive an
    // early 412. Without ListBucket, 403 says nothing about absence: only the
    // following conditional PUT can decide whether creation is allowed.
    try {
      const existing = await this.inspect(reference, key);
      if (existing) return existing;
    } catch (error) {
      if (!(error instanceof S3ServiceException && error.$metadata.httpStatusCode === 403))
        throw error;
    }
    const facts = await stat(source);
    if (!facts.isFile() || facts.size !== reference.bytes)
      throw new Error('Prepared asset is absent or has changed size.');
    const checksum = await hashAssetFile(source);
    if (checksum.bytes !== reference.bytes || checksum.sha256 !== reference.sha256)
      throw new Error('Prepared asset bytes differ from the approved reference.');
    const operation = this.operation();
    operation.throwIfStopped();
    const body = createReadStream(source);
    const owned = ownNodeStream(operation, body);
    try {
      await this.sdk((signal) =>
        this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket(reference.boundary),
            ExpectedBucketOwner: this.configuration.accountId,
            Key: key,
            Body: body,
            ContentLength: reference.bytes,
            ContentType: reference.mediaType,
            ChecksumAlgorithm: 'SHA256',
            ChecksumSHA256: Buffer.from(reference.sha256, 'hex').toString('base64'),
            IfNoneMatch: '*',
            ServerSideEncryption: 'AES256',
            CacheControl:
              reference.accessDomain === 'public'
                ? 'public,max-age=31536000,immutable'
                : 'private,no-store',
          }),
          { abortSignal: signal },
        ),
      );
    } catch (error) {
      if (!(error instanceof S3ServiceException && error.$metadata.httpStatusCode === 412))
        throw error;
    } finally {
      owned.stop();
      await owned.closed;
      operation.throwIfStopped();
    }
    const verified = await this.inspect(reference, key);
    if (!verified) throw new Error('Asset upload did not produce a verified object.');
    return verified;
  }
  copy(
    reference: ArtifactReference,
    destination: ArtifactReference,
    destinationKey = artifactKey(destination),
    sourceKey = artifactKey(reference),
    sourceVersionId?: string,
  ): Promise<ExactStoredObject> {
    return this.transfer(() =>
      this.retryExactTransfer(() =>
        this.copyOnce(reference, destination, destinationKey, sourceKey, sourceVersionId),
      ),
    );
  }
  private async copyOnce(
    reference: ArtifactReference,
    destination: ArtifactReference,
    destinationKey = artifactKey(destination),
    sourceKey = artifactKey(reference),
    sourceVersionId?: string,
  ): Promise<ExactStoredObject> {
    this.admit(reference);
    this.admit(destination);
    this.admitKey(destination, destinationKey);
    this.admitKey(reference, sourceKey);
    if (
      reference.sha256 !== destination.sha256 ||
      reference.bytes !== destination.bytes ||
      reference.mediaType !== destination.mediaType
    )
      throw new Error('An exact storage copy cannot change the file description.');
    const source = await this.inspect(reference, sourceKey, sourceVersionId);
    if (!source) throw new Error('The exact source asset is unavailable.');
    try {
      const existing = await this.inspect(destination, destinationKey);
      if (existing)
        return { ...existing, ...(source.versionId ? { sourceVersionId: source.versionId } : {}) };
    } catch (error) {
      if (!(error instanceof S3ServiceException && error.$metadata.httpStatusCode === 403))
        throw error;
    }
    // Enforced conditional-write bucket policies cannot safely rely on CopyObject.
    // Stream the exact source version through a conditional, full-checksum PUT.
    const operation = this.operation();
    try {
      const copying = consumeSdkReadable(
        operation,
        (abortSignal) =>
          responseByteLimit.run(reference.bytes, () =>
            this.client.send(
              new GetObjectCommand({
                Bucket: this.bucket(reference.boundary),
                ExpectedBucketOwner: this.configuration.accountId,
                Key: sourceKey,
                VersionId: source.versionId,
              }),
              { abortSignal },
            ),
          ),
        (incoming) => {
          if (!(incoming.Body instanceof Readable))
            throw new Error('Exact copy source was not readable.');
          return { source: incoming.Body, metadata: incoming };
        },
        async (body, incoming, context) => {
          if (
            incoming.ContentLength !== reference.bytes ||
            incoming.ContentType !== reference.mediaType
          )
            throw new Error('Exact copy source metadata differs from its reference.');
          context.throwIfStopped();
          const bounded = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
              callback(null, chunk);
            },
          });
          const owned = ownNodeStream(operation, bounded);
          const sending = this.sdk((signal) =>
            this.client.send(
              new PutObjectCommand({
                Bucket: this.bucket(destination.boundary),
                ExpectedBucketOwner: this.configuration.accountId,
                Key: destinationKey,
                Body: bounded,
                ContentLength: destination.bytes,
                IfNoneMatch: '*',
                ChecksumAlgorithm: 'SHA256',
                ChecksumSHA256: Buffer.from(destination.sha256, 'hex').toString('base64'),
                ContentType: destination.mediaType,
                ServerSideEncryption: 'AES256',
                CacheControl:
                  destination.accessDomain === 'public'
                    ? 'public,max-age=31536000,immutable'
                    : 'private,no-store',
              }),
              { abortSignal: signal },
            ),
          );
          void sending.catch(() => undefined);
          try {
            await Promise.all([
              pipeOwned(operation, body, bounded, {
                maxBytes: reference.bytes,
                exactBytes: reference.bytes,
              }),
              sending,
            ]);
            context.throwIfStopped();
          } finally {
            owned.stop();
            body.destroy();
            await owned.closed;
          }
        },
      );
      await settleStorageResources(operation, copying);
    } catch (error) {
      if (!(error instanceof S3ServiceException && error.$metadata.httpStatusCode === 412))
        throw error;
    }
    const verified = await this.inspect(destination, destinationKey);
    if (!verified) throw new Error('Exact destination copy could not be verified.');
    return { ...verified, ...(source.versionId ? { sourceVersionId: source.versionId } : {}) };
  }
  /** Remove only currently admitted public or curated-private delivery through
   * a dedicated role. Version history and recovery copies require a separate
   * explicitly authorized erasure operation. */
  removeCurrent(
    reference: ArtifactReference,
    key = artifactKey(reference),
  ): Promise<CurrentAssetRemoval> {
    return this.network(30_000, () => this.removeCurrentWithin(reference, key));
  }
  private async removeCurrentWithin(
    reference: ArtifactReference,
    key = artifactKey(reference),
  ): Promise<CurrentAssetRemoval> {
    this.admit(reference);
    this.admitKey(reference, key);
    if (
      this.purpose !== 'withdrawal' ||
      !['public', 'curated-private'].includes(reference.accessDomain) ||
      !['runtime', 'art-studies'].includes(reference.boundary)
    )
      throw new Error('Current-delivery withdrawal requires its dedicated admitted-delivery role.');
    await this.principal();
    const removed = await this.sdk((signal) =>
      this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket(reference.boundary),
          ExpectedBucketOwner: this.configuration.accountId,
          Key: key,
        }),
        { abortSignal: signal },
      ),
    );
    // All durable asset origins are versioned. The returned current delete marker
    // is the strongly consistent S3 result; a guessed 403/404 is never proof.
    if (!removed.DeleteMarker || !removed.VersionId)
      throw new Error('Current delivery removal was not confirmed by a versioned delete marker.');
    return {
      reference,
      key,
      deleteMarkerVersionId: removed.VersionId,
      accountId: this.configuration.accountId,
      region: this.configuration.region,
      bucket: this.bucket(reference.boundary),
      removedAt: new Date().toISOString(),
    };
  }
  /** Separate, versioned recovery coordination. This is not an asset catalog or
   * selection pointer: it only says whether the SQL authority export is complete. */
  readRecoveryMarker(accessDomain: string): Promise<RecoveryAuthorityObject | undefined> {
    return this.network(30_000, () => this.readRecoveryMarkerWithin(accessDomain));
  }
  private async readRecoveryMarkerWithin(
    accessDomain: string,
  ): Promise<RecoveryAuthorityObject | undefined> {
    if (!isAssetStorageId(accessDomain)) throw new Error('Invalid recovery authority domain.');
    await this.principal();
    try {
      // A least-privilege writer without bucket-wide ListBucket receives 403 for
      // HEAD/GET of an absent key. An exact-prefix listing distinguishes absence
      // without treating genuine denied reads as a new/empty authority marker.
      const key = `recovery-authority/${accessDomain}/current.json`;
      const listed = await this.sdk((signal) =>
        this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket('asset-recovery'),
            ExpectedBucketOwner: this.configuration.accountId,
            Prefix: key,
            MaxKeys: 1,
          }),
          { abortSignal: signal },
        ),
      );
      if (listed.Contents?.[0]?.Key !== key) return undefined;
      const operation = this.operation();
      return await consumeSdkReadable(
        operation,
        (abortSignal) =>
          responseByteLimit.run(65_536, () =>
            this.client.send(
              new GetObjectCommand({
                Bucket: this.bucket('asset-recovery'),
                ExpectedBucketOwner: this.configuration.accountId,
                Key: key,
                ChecksumMode: 'ENABLED',
              }),
              { abortSignal },
            ),
          ),
        (output) => {
          if (!(output.Body instanceof Readable))
            throw new Error('Recovery authority marker is not readable.');
          return { source: output.Body, metadata: output };
        },
        async (body, output, context) => {
          if (
            !output.ETag ||
            output.ContentType !== 'application/json' ||
            output.ContentLength === undefined ||
            output.ContentLength > 65536
          )
            throw new Error('Recovery authority marker metadata is invalid.');
          const chunks: Buffer[] = [];
          const sink = new Writable({
            write(chunk: Buffer, _encoding, callback) {
              chunks.push(Buffer.from(chunk));
              callback();
            },
          });
          await pipeOwned(operation, body, sink, {
            maxBytes: 65536,
            exactBytes: output.ContentLength,
          });
          context.throwIfStopped();
          const bytes = Buffer.concat(chunks);
          if (
            output.ChecksumType === 'FULL_OBJECT' &&
            output.ChecksumSHA256 &&
            createHash('sha256').update(bytes).digest('base64') !== output.ChecksumSHA256
          )
            throw new Error('Recovery authority marker checksum mismatch.');
          return {
            bytes,
            etag: output.ETag,
            ...(output.VersionId ? { versionId: output.VersionId } : {}),
          };
        },
      );
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
        return undefined;
      throw error;
    }
  }
  compareRecoveryMarker(
    accessDomain: string,
    bytes: Uint8Array,
    expectedETag?: string,
  ): Promise<RecoveryAuthorityObject> {
    return this.network(30_000, () =>
      this.compareRecoveryMarkerWithin(accessDomain, bytes, expectedETag),
    );
  }
  private async compareRecoveryMarkerWithin(
    accessDomain: string,
    bytes: Uint8Array,
    expectedETag?: string,
  ): Promise<RecoveryAuthorityObject> {
    if (!isAssetStorageId(accessDomain) || bytes.length > 65536)
      throw new Error('Invalid bounded recovery authority marker.');
    await this.principal();
    await this.sdk((signal) =>
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket('asset-recovery'),
          ExpectedBucketOwner: this.configuration.accountId,
          Key: `recovery-authority/${accessDomain}/current.json`,
          Body: bytes,
          ContentLength: bytes.length,
          ContentType: 'application/json',
          CacheControl: 'private,no-store',
          ServerSideEncryption: 'AES256',
          ChecksumAlgorithm: 'SHA256',
          ChecksumSHA256: createHash('sha256').update(bytes).digest('base64'),
          ...(expectedETag ? { IfMatch: expectedETag } : { IfNoneMatch: '*' }),
        }),
        { abortSignal: signal },
      ),
    );
    const stored = await this.readRecoveryMarker(accessDomain);
    if (!stored || !Buffer.from(stored.bytes).equals(Buffer.from(bytes)))
      throw new Error(
        'Recovery authority marker update could not be confirmed; current coverage remains uncertain.',
      );
    return stored;
  }
  /** Dispose transports after the caller's operation has stopped or settled.
   * SDK agent destruction is not proof that pending work physically closed;
   * that work retains its original operation's admission until it settles. */
  close(): void {
    this.closed = true;
    this.client.destroy();
    this.identity.destroy();
    this.handler.destroy();
  }
}
