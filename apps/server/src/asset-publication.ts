import {
  artifactReferenceKey,
  assertAssetManifest,
  assetDependencyClosure,
  sameArtifact,
  type ArtifactBoundary,
  type ArtifactReference,
  type AssetClosureLimits,
  type AssetManifest,
  type AssetRevisionReference,
} from '@open-legend/assets';
import { createHash } from 'node:crypto';
import {
  AssetAccessError,
  AssetRepository,
  type AssetDomain,
  type AssetPrincipal,
  type AssetPublicationInput,
  type AssetPublicationOutcome,
  type AssetSelectionRequest,
  type AssetTransferReceipt,
  type AssetRetentionLimits,
  type AssetStorageIdentity,
} from './asset-repository.js';

export interface AssetPublicationRequest {
  operationId: string;
  principal: AssetPrincipal;
  manifest: AssetManifest;
  destination: AssetDomain;
  selection?: AssetSelectionRequest;
  configurationRevision: string;
  publicProjectionReviewed?: boolean;
  namedFiles?: { reference: ArtifactReference; key: string }[];
  storage: AssetStorageIdentity;
  /** Trusted configuration supplies locations; only needed cross-boundary entries persist. */
  dependencyStorage?: Partial<Record<ArtifactBoundary, AssetStorageIdentity>>;
}
export interface AssetTransferContext {
  operationId: string;
  generation: number;
  signal?: AbortSignal;
}
/** Transport implementations accept exact admitted files, never arbitrary provider URLs.
 * They independently establish the whole-file digest, media type and byte length. */
export interface AssetPublicationTransport {
  ensureArtifact(
    reference: ArtifactReference,
    context: AssetTransferContext,
  ): Promise<AssetTransferReceipt>;
  putManifest(
    reference: ArtifactReference,
    bytes: Uint8Array,
    context: AssetTransferContext,
  ): Promise<AssetTransferReceipt>;
}
export interface AssetPublicationLimits extends AssetClosureLimits, AssetRetentionLimits {
  maxManifestBytes: number;
  maxTransferConcurrency: number;
  maxInFlightBytes: number;
}
/** Allocate revision identity first, serialize once and hash those final bytes. The
 * derived lock may contain this hash; the immutable manifest never hashes itself. */
export function prepareAssetManifest(
  manifest: AssetManifest,
  destination: AssetDomain,
): {
  reference: AssetRevisionReference;
  manifestArtifact: ArtifactReference;
  manifestText: string;
} {
  assertAssetManifest(manifest);
  if (
    Object.values(manifest.files).some(
      (file) =>
        file.boundary !== destination.boundary || file.accessDomain !== destination.accessDomain,
    )
  )
    throw new AssetAccessError(
      'integrity',
      'Every manifest file must match its explicitly selected destination before rights approval or publication.',
    );
  const manifestText = JSON.stringify(manifest);
  const sha256 = createHash('sha256').update(manifestText).digest('hex');
  return {
    reference: { ...manifest.identity, manifestSha256: sha256 },
    manifestArtifact: {
      boundary: destination.boundary,
      accessDomain: destination.accessDomain,
      sha256,
      bytes: Buffer.byteLength(manifestText),
      mediaType: 'application/json',
    },
    manifestText,
  };
}

/** In-process coordinator, shared by trusted CLI and server callers. Database
 * transactions protect authority and publication only; transfers never occupy them. */
export class AssetPublisher {
  constructor(
    readonly repository: AssetRepository,
    private readonly transport: AssetPublicationTransport,
    private readonly limits: AssetPublicationLimits,
  ) {
    for (const limit of Object.values(limits))
      if (!Number.isSafeInteger(limit) || limit <= 0)
        throw new Error('Asset publication allowances must be positive safe integers.');
  }

  async publish(
    request: AssetPublicationRequest,
    signal?: AbortSignal,
  ): Promise<AssetPublicationOutcome> {
    if (this.repository.db.transactionActive)
      throw new Error('Asset publication must run outside a database transaction.');
    const prepared = prepareAssetManifest(request.manifest, request.destination);
    // Recover an exact committed operation before dependency work. A newer catalog or
    // unrelated unavailable child cannot turn lost acknowledgement into publication.
    const prior = await this.repository.operation(request.operationId, request.principal);
    if (
      prior?.status !== 'committed' &&
      prepared.manifestArtifact.bytes > this.limits.maxManifestBytes
    )
      throw new AssetAccessError(
        'integrity',
        'Asset manifest exceeds its publication byte allowance.',
      );
    let input: AssetPublicationInput;
    if (prior) {
      input = {
        ...prior.input,
        principal: request.principal,
        ...prepared,
        destination: request.destination,
        storage: request.storage,
        selection: request.selection,
        configurationRevision: request.configurationRevision,
        publicProjectionReviewed: request.publicProjectionReviewed === true,
        ...(prior.input.dependencyStorage
          ? {
              dependencyStorage: Object.fromEntries(
                Object.keys(prior.input.dependencyStorage).map((boundary) => [
                  boundary,
                  request.dependencyStorage?.[boundary as ArtifactBoundary],
                ]),
              ),
            }
          : {}),
        ...(request.namedFiles ? { namedFiles: request.namedFiles } : { namedFiles: undefined }),
      };
    } else {
      const dependencyStorage: Partial<Record<ArtifactBoundary, AssetStorageIdentity>> = {};
      const closure = await assetDependencyClosure(
        request.manifest.dependencies,
        async (reference) => {
          const record = await this.repository.dependencyRevision(reference, request.principal);
          const boundary = record.destination.boundary;
          if (boundary !== request.destination.boundary) {
            const storage = request.dependencyStorage?.[boundary];
            if (!storage)
              throw new AssetAccessError(
                'integrity',
                'A required dependency needs an explicit deployment mapping for its storage boundary.',
              );
            dependencyStorage[boundary] = storage;
          }
          return record.manifest;
        },
        this.limits,
      );
      input = {
        operationId: request.operationId,
        principal: request.principal,
        destination: request.destination,
        storage: request.storage,
        ...prepared,
        files: this.files(request.manifest),
        dependencies: closure.revisions.map((revision) => revision.reference),
        selection: request.selection,
        configurationRevision: request.configurationRevision,
        publicProjectionReviewed: request.publicProjectionReviewed === true,
        ...(Object.keys(dependencyStorage).length ? { dependencyStorage } : {}),
        ...(request.namedFiles ? { namedFiles: request.namedFiles } : {}),
      };
      const ownBytes = input.files.reduce(
        (total, file) => total + file.bytes,
        prepared.manifestArtifact.bytes,
      );
      const namedBytes = (input.namedFiles ?? []).reduce(
        (total, target) => total + target.reference.bytes,
        0,
      );
      if (
        Object.keys(request.manifest.files).length +
          closure.members +
          (input.namedFiles?.length ?? 0) >
          this.limits.maxFiles ||
        closure.revisions.length + 1 > this.limits.maxRevisions ||
        !Number.isSafeInteger(ownBytes) ||
        !Number.isSafeInteger(namedBytes) ||
        ownBytes > this.limits.maxBytes - closure.bytes - namedBytes
      )
        throw new AssetAccessError(
          'integrity',
          'Asset publication exceeds its complete file/byte allowance.',
        );
      if (
        [...input.files, input.manifestArtifact].some(
          (file) => file.bytes > this.limits.maxInFlightBytes,
        )
      )
        throw new AssetAccessError(
          'integrity',
          'One file exceeds the admitted transfer byte allowance.',
        );
    }
    const operation = await this.repository.admit(input, this.limits);
    if (operation.status === 'committed' && operation.outcome) return operation.outcome;
    const context: AssetTransferContext = {
      operationId: operation.id,
      generation: operation.generation,
      ...(signal ? { signal } : {}),
    };
    const checkCancellation = async () => {
      if (!signal?.aborted) return;
      await this.repository.cancel(operation.id, request.principal);
      throw new AssetAccessError('cancelled', 'Asset publication was cancelled.');
    };
    await checkCancellation();
    if (operation.status !== 'prepared') {
      const pending = [...operation.input.files];
      let next = 0,
        inFlightBytes = 0;
      const running = new Set<Promise<void>>();
      let failure: unknown;
      try {
        while (next < pending.length || running.size) {
          await checkCancellation();
          while (
            !failure &&
            next < pending.length &&
            running.size < this.limits.maxTransferConcurrency
          ) {
            const file = pending[next]!;
            if (file.bytes > this.limits.maxInFlightBytes)
              throw new AssetAccessError(
                'integrity',
                'One file exceeds the admitted transfer byte allowance.',
              );
            if (file.bytes > this.limits.maxInFlightBytes - inFlightBytes) break;
            next++;
            inFlightBytes += file.bytes;
            const transfer = (async () => {
              await this.repository.assertTransfer(
                operation.id,
                operation.generation,
                request.principal,
                file,
              );
              const receipt = await this.transport.ensureArtifact(file, context);
              await checkCancellation();
              await this.repository.recordTransfer(
                operation.id,
                operation.generation,
                request.principal,
                receipt,
              );
            })();
            const tracked = transfer
              .catch((error: unknown) => {
                failure ??= error;
              })
              .finally(() => {
                inFlightBytes -= file.bytes;
                running.delete(tracked);
              });
            running.add(tracked);
          }
          if (running.size) await Promise.race(running);
          else if (failure) throw failure;
          if (failure) {
            // Already admitted transfers settle and cannot leak unhandled work. Their
            // outcomes remain claims/receipts; no broken manifest is selected.
            await Promise.all(running);
            throw failure;
          }
        }
      } finally {
        await Promise.all(running);
      }
      await checkCancellation();
      await this.repository.assertTransfer(
        operation.id,
        operation.generation,
        request.principal,
        operation.input.manifestArtifact,
      );
      const receipt = await this.transport.putManifest(
        operation.input.manifestArtifact,
        new TextEncoder().encode(operation.input.manifestText),
        context,
      );
      await checkCancellation();
      await this.repository.recordTransfer(
        operation.id,
        operation.generation,
        request.principal,
        receipt,
      );
      await this.repository.prepared(operation.id, operation.generation, request.principal);
    }
    await checkCancellation();
    return this.repository.commit(operation.id, operation.generation, request.principal);
  }

  private files(manifest: AssetManifest): ArtifactReference[] {
    const files = new Map<string, ArtifactReference>();
    for (const file of Object.values(manifest.files)) {
      const key = artifactReferenceKey(file),
        existing = files.get(key);
      if (existing && !sameArtifact(existing, file))
        throw new AssetAccessError('integrity', 'Conflicting exact file metadata.');
      files.set(key, file);
    }
    return [...files.values()];
  }
}
