import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
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

export interface AssetStorageConfiguration {
  profile: string;
  region: string;
  accountId: string;
  buckets: Partial<Record<ArtifactBoundary, string>>;
  roleArns?: Partial<Record<AssetStoragePurpose, string>>;
  /** Prevent accidental enormous transfers before allocating SDK/stream resources. */
  maxObjectBytes: number;
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
      configuration.maxObjectBytes < 1
    )
      throw new Error(
        'Asset storage requires an explicit project, profile, Region and byte allowance.',
      );
    const masterCredentials = fromIni({ profile: configuration.profile });
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
    const options = { region: configuration.region, maxAttempts: 1 };
    this.client = new S3Client({
      ...options,
      credentials: roleArn
        ? fromTemporaryCredentials({
            masterCredentials,
            clientConfig: options,
            params: { RoleArn: roleArn, RoleSessionName: `openlegend-assets-${purpose}` },
          })
        : masterCredentials,
    });
    // Logical approval belongs to the authenticated human/operator; assuming a
    // narrower storage role never changes that PostgreSQL authority identity.
    this.identity = new STSClient({ ...options, credentials: masterCredentials });
  }
  async principal(): Promise<string> {
    this.verifiedIdentity ??= this.identity
      .send(new GetCallerIdentityCommand({}))
      .then((identity) => {
        if (identity.Account !== this.configuration.accountId || !identity.Arn)
          throw new Error('AWS identity does not match the configured asset project.');
        // Session suffixes expire; the authenticated role remains the operator identity.
        const match = /^arn:aws:sts::(\d+):assumed-role\/(.+)\/[^/]+$/.exec(identity.Arn);
        return match ? `arn:aws:iam::${match[1]}:role/${match[2]}` : identity.Arn;
      });
    return this.verifiedIdentity;
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

  async inspect(
    reference: ArtifactReference,
    key = artifactKey(reference),
    versionId?: string,
  ): Promise<ExactStoredObject | undefined> {
    this.admit(reference);
    this.admitKey(reference, key);
    await this.principal();
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket(reference.boundary),
          ExpectedBucketOwner: this.configuration.accountId,
          Key: key,
          VersionId: versionId,
          ChecksumMode: 'ENABLED',
        }),
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
  ): Promise<void> {
    this.admit(reference);
    this.admitKey(reference, key);
    await this.principal();
    const output = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket(reference.boundary),
        ExpectedBucketOwner: this.configuration.accountId,
        Key: key,
        VersionId: versionId,
      }),
      { abortSignal: signal },
    );
    const body = output.Body;
    if (!(body instanceof Readable)) throw new Error('S3 did not return a readable asset body.');
    if (output.ContentLength !== reference.bytes || output.ContentType !== reference.mediaType) {
      body.destroy();
      throw new Error('Asset response metadata differs from its admitted file reference.');
    }
    const hash = createHash('sha256');
    let count = 0;
    const check = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        count += chunk.length;
        if (count > reference.bytes)
          return callback(new Error('Asset response exceeded its declared byte length.'));
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    try {
      if (destination)
        await pipeline(body, check, createWriteStream(destination, { flags: 'wx', mode: 0o600 }), {
          signal,
        });
      else
        await pipeline(
          body,
          check,
          new Writable({
            write(_chunk, _encoding, callback) {
              callback();
            },
          }),
          { signal },
        );
      if (count !== reference.bytes || hash.digest('hex') !== reference.sha256)
        throw new Error('Asset checksum or byte length did not match the pinned file.');
    } catch (error) {
      body.destroy();
      check.destroy();
      if (destination) await unlink(destination).catch(() => undefined);
      throw error;
    }
  }
  verify(
    reference: ArtifactReference,
    key = artifactKey(reference),
    versionId?: string,
  ): Promise<void> {
    return this.consume(reference, key, versionId);
  }
  download(reference: ArtifactReference, destination: string, signal?: AbortSignal): Promise<void> {
    return this.consume(reference, artifactKey(reference), undefined, destination, signal);
  }
  downloadNamed(
    reference: ArtifactReference,
    key: string,
    destination: string,
    signal?: AbortSignal,
    versionId?: string,
  ): Promise<void> {
    return this.consume(reference, key, versionId, destination, signal);
  }
  private async retryExactTransfer<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const status =
          error instanceof S3ServiceException ? error.$metadata.httpStatusCode : undefined;
        const transient =
          (status !== undefined && (status === 429 || status >= 500)) ||
          (error instanceof Error &&
            /\b(?:ECONNRESET|ETIMEDOUT|EPIPE|ECONNABORTED)\b/.test(error.message));
        if (!transient || attempt >= 2) throw error;
        // A fresh stream and absent-only key make a lost acknowledgement safe:
        // the next attempt verifies an existing exact object instead of replacing it.
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
      }
    }
  }
  upload(
    reference: ArtifactReference,
    source: string,
    key = artifactKey(reference),
  ): Promise<ExactStoredObject> {
    return this.retryExactTransfer(() => this.uploadOnce(reference, source, key));
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
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket(reference.boundary),
          ExpectedBucketOwner: this.configuration.accountId,
          Key: key,
          Body: createReadStream(source),
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
      );
    } catch (error) {
      if (!(error instanceof S3ServiceException && error.$metadata.httpStatusCode === 412))
        throw error;
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
    return this.retryExactTransfer(() =>
      this.copyOnce(reference, destination, destinationKey, sourceKey, sourceVersionId),
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
    const incoming = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket(reference.boundary),
        ExpectedBucketOwner: this.configuration.accountId,
        Key: sourceKey,
        VersionId: source.versionId,
      }),
    );
    if (!(incoming.Body instanceof Readable))
      throw new Error('Exact copy source was not readable.');
    const body = incoming.Body;
    let count = 0;
    const bounded = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        count += chunk.length;
        if (count > reference.bytes)
          return callback(new Error('Copy source exceeded its admitted size.'));
        callback(null, chunk);
      },
    });
    try {
      await Promise.all([
        pipeline(body, bounded),
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
        ),
      ]);
    } catch (error) {
      body.destroy();
      bounded.destroy();
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
  async removeCurrent(
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
    const removed = await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket(reference.boundary),
        ExpectedBucketOwner: this.configuration.accountId,
        Key: key,
      }),
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
  async readRecoveryMarker(accessDomain: string): Promise<RecoveryAuthorityObject | undefined> {
    if (!isAssetStorageId(accessDomain)) throw new Error('Invalid recovery authority domain.');
    await this.principal();
    try {
      // A least-privilege writer without bucket-wide ListBucket receives 403 for
      // HEAD/GET of an absent key. An exact-prefix listing distinguishes absence
      // without treating genuine denied reads as a new/empty authority marker.
      const key = `recovery-authority/${accessDomain}/current.json`;
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket('asset-recovery'),
          ExpectedBucketOwner: this.configuration.accountId,
          Prefix: key,
          MaxKeys: 1,
        }),
      );
      if (listed.Contents?.[0]?.Key !== key) return undefined;
      const output = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket('asset-recovery'),
          ExpectedBucketOwner: this.configuration.accountId,
          Key: key,
          ChecksumMode: 'ENABLED',
        }),
      );
      const body = output.Body;
      if (!(body instanceof Readable))
        throw new Error('Recovery authority marker is not readable.');
      if (
        !output.ETag ||
        output.ContentType !== 'application/json' ||
        output.ContentLength === undefined ||
        output.ContentLength > 65536
      ) {
        body.destroy();
        throw new Error('Recovery authority marker metadata is invalid.');
      }
      const chunks: Buffer[] = [];
      let length = 0;
      try {
        for await (const chunk of body) {
          const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          length += part.length;
          if (length > 65536)
            throw new Error('Recovery authority marker exceeds its byte allowance.');
          chunks.push(part);
        }
      } finally {
        body.destroy();
      }
      const bytes = Buffer.concat(chunks);
      if (length !== output.ContentLength)
        throw new Error('Recovery authority marker is incomplete.');
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
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
        return undefined;
      throw error;
    }
  }
  async compareRecoveryMarker(
    accessDomain: string,
    bytes: Uint8Array,
    expectedETag?: string,
  ): Promise<RecoveryAuthorityObject> {
    if (!isAssetStorageId(accessDomain) || bytes.length > 65536)
      throw new Error('Invalid bounded recovery authority marker.');
    await this.principal();
    await this.client.send(
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
    );
    const stored = await this.readRecoveryMarker(accessDomain);
    if (!stored || !Buffer.from(stored.bytes).equals(Buffer.from(bytes)))
      throw new Error(
        'Recovery authority marker update could not be confirmed; current coverage remains uncertain.',
      );
    return stored;
  }
  close(): void {
    this.client.destroy();
    this.identity.destroy();
  }
}
