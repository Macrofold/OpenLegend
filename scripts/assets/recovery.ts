import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, readdir, link, unlink, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import {
  artifactKey,
  artifactReferenceKey,
  assetRevisionKey,
  isArtifactObjectKey,
  assertArtifactReference,
  assertAssetRevisionReference,
  assertAssetManifest,
  assetDependencyClosure,
  sameArtifact,
  isAssetStorageId,
  isRepositoryAssetPath,
  type ArtifactReference,
  type AssetRevisionReference,
} from '@open-legend/assets';
import {
  ASSET_TABLES,
  ASSET_AUTHORITY_MAX_BYTES,
  AssetAccessError,
  type AssetRepository,
  type AssetAuthoritySnapshot,
  type AssetPrincipal,
  type StoredAssetRevision,
  type AssetPhysicalLocation,
  type AssetStorageIdentity,
  type AssetTransferReceipt,
  assetPhysicalKey,
  assertAssetPhysicalLocation,
} from '../../apps/server/src/asset-repository.js';
import type {
  S3AssetStorage,
  RecoveryAuthorityObject,
} from '../../apps/server/src/asset-storage.js';
import { hashAssetFile } from '../../apps/server/src/asset-storage.js';
import { tableRows } from '../../apps/server/src/record-pages.js';
import { CHECKPOINT_LIMITS } from '../../apps/server/src/checkpoint-format.js';
import { writeOperationalBackup } from '../../apps/server/src/operational-backup.js';
import { syncDirectory } from '../../apps/server/src/save-files.js';

/** Independent recovery storage protects an old content checkpoint from restoring
 * an old grant. The marker coordinates coverage only; PostgreSQL remains authority. */
export type AssetRecoveryTransport = Pick<
  S3AssetStorage,
  | 'configuration'
  | 'principal'
  | 'bucket'
  | 'upload'
  | 'copy'
  | 'verify'
  | 'downloadNamed'
  | 'readRecoveryMarker'
  | 'compareRecoveryMarker'
>;
export interface RecoveryObject {
  reference: ArtifactReference;
  key: string;
  versionId?: string;
}
export interface RecoveredAssetLocation {
  source: ArtifactReference;
  sourceLocation: AssetPhysicalLocation;
  reference: ArtifactReference;
  location: AssetPhysicalLocation;
}
interface AuthorityMarker {
  format: 'openlegend-asset-authority';
  domain: string;
  generation: number;
  status: 'pending' | 'complete';
  operation?: { id: string; accountId: string; fingerprint: string };
  authority?: RecoveryObject;
}
export interface AssetRecoveryCheckpoint {
  format: 'openlegend-asset-recovery';
  id: string;
  accountId: string;
  region: string;
  createdAt: string;
  authorityDomain: string;
  authorityGeneration: number;
  authority: RecoveryObject;
  metadata: ({ path: string } & RecoveryObject)[];
  artifacts: {
    revision: AssetRevisionReference;
    source: ArtifactReference;
    sourceBucket: string;
    sourceAccountId: string;
    sourceRegion: string;
    sourceKey: string;
    sourceVersionId?: string;
    recovery: RecoveryObject;
  }[];
  unavailable: AssetRevisionReference[];
  operationalBackup: boolean;
}
const MAX_CHECKPOINT_BYTES = 64 * 1024 * 1024;
const MAX_ARTIFACTS = 100000;
/** Protection, verification and intake restoration overlap four streaming requests.
 * Failure stops admission and waits for every owned transfer before returning. */
async function recoveryTransfers<T>(
  items: readonly T[],
  transfer: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  let failed = false;
  let failure: unknown;
  await Promise.all(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (!failed && cursor < items.length) {
        const index = cursor++;
        try {
          await transfer(items[index]!, index);
        } catch (error) {
          failed = true;
          failure ??= error;
        }
      }
    }),
  );
  if (failed) throw failure;
}
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function recoveryReference(
  bytes: Uint8Array,
  domain: string,
  mediaType = 'application/json',
): ArtifactReference {
  return {
    boundary: 'asset-recovery',
    accessDomain: domain,
    sha256: digest(bytes),
    bytes: bytes.length,
    mediaType,
  };
}
function marker(value: RecoveryAuthorityObject, domain: string): AuthorityMarker {
  const parsed = JSON.parse(Buffer.from(value.bytes).toString('utf8')) as AuthorityMarker;
  if (
    parsed.format !== 'openlegend-asset-authority' ||
    parsed.domain !== domain ||
    !Number.isSafeInteger(parsed.generation) ||
    parsed.generation < 0 ||
    !['pending', 'complete'].includes(parsed.status) ||
    (parsed.status === 'complete' && !parsed.authority) ||
    (parsed.status === 'pending' &&
      (!parsed.operation ||
        !isAssetStorageId(parsed.operation.id) ||
        !parsed.operation.accountId ||
        !/^[a-f0-9]{64}$/.test(parsed.operation.fingerprint)))
  )
    throw new Error(
      'Recovery authority marker is incomplete or invalid; recovered assets remain quarantined.',
    );
  if (parsed.authority) assertRecoveryObject(parsed.authority, domain);
  return parsed;
}
function assertRecoveryObject(value: RecoveryObject, domain: string): void {
  assertArtifactReference(value.reference);
  if (
    value.reference.boundary !== 'asset-recovery' ||
    value.reference.accessDomain !== domain ||
    !isRepositoryAssetPath(value.key)
  )
    throw new Error('Invalid exact recovery object.');
}
async function writeNew(path: string, bytes: Uint8Array | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(path), `.pending-${randomUUID()}`);
  const file = await open(temporary, 'wx', 0o600);
  try {
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    await link(temporary, path);
    await syncDirectory(dirname(path));
  } finally {
    await unlink(temporary);
  }
}
async function boundedJson(path: string, maxBytes: number): Promise<unknown> {
  const file = await open(path, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > maxBytes)
      throw new Error('Recovery metadata exceeds its byte allowance.');
    const parts: Buffer[] = [];
    let bytes = 0;
    for (;;) {
      const buffer = Buffer.allocUnsafe(Math.min(65536, maxBytes + 1 - bytes));
      const read = await file.read(buffer, 0, buffer.length, null);
      if (!read.bytesRead) break;
      bytes += read.bytesRead;
      if (bytes > maxBytes) throw new Error('Recovery metadata exceeds its byte allowance.');
      parts.push(buffer.subarray(0, read.bytesRead));
    }
    return JSON.parse(Buffer.concat(parts, bytes).toString('utf8')) as unknown;
  } finally {
    await file.close();
  }
}
async function downloadExact(
  storage: AssetRecoveryTransport,
  object: RecoveryObject,
  path: string,
): Promise<void> {
  try {
    const existing = await hashAssetFile(path);
    if (existing.sha256 !== object.reference.sha256 || existing.bytes !== object.reference.bytes)
      throw new Error('Existing isolated recovery file differs from its exact reference.');
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await storage.downloadNamed(object.reference, object.key, path, undefined, object.versionId);
}
function authoritySnapshot(value: unknown): AssetAuthoritySnapshot {
  const snapshot = value as AssetAuthoritySnapshot;
  if (
    !snapshot ||
    !Number.isSafeInteger(snapshot.generation) ||
    snapshot.generation < 0 ||
    ![
      snapshot.domains,
      snapshot.grants,
      snapshot.rights,
      snapshot.restrictions,
      snapshot.deliveryRemovals,
      snapshot.withdrawalPlans,
      snapshot.withdrawalItems,
      snapshot.removalReceipts,
      snapshot.authorityOperations,
    ].every(Array.isArray)
  )
    throw new Error('Recovery authority export is incomplete.');
  return snapshot;
}
async function exportAuthority(
  repo: AssetRepository,
  storage: AssetRecoveryTransport,
  domain: string,
  directory: string,
): Promise<{ snapshot: AssetAuthoritySnapshot; object: RecoveryObject }> {
  const snapshot = await repo.restrictionSnapshot();
  const bytes = Buffer.from(JSON.stringify(snapshot));
  if (bytes.length > ASSET_AUTHORITY_MAX_BYTES)
    throw new Error('Recovery authority export exceeds its byte allowance.');
  const reference = recoveryReference(bytes, domain),
    key = artifactKey(reference);
  const path = join(directory, `authority-${reference.sha256}.json`);
  // Reusing an exact operation can reuse its immutable local export after verification.
  try {
    await writeNew(path, bytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (!(await readFile(path)).equals(bytes))
      throw new Error('Recovery export path contains different bytes.');
  }
  const stored = await storage.upload(reference, path, key);
  return {
    snapshot,
    object: { reference, key, ...(stored.versionId ? { versionId: stored.versionId } : {}) },
  };
}
export async function initializeRecoveryAuthority(
  repo: AssetRepository,
  storage: AssetRecoveryTransport,
  options: { domain: string; directory: string },
): Promise<AuthorityMarker> {
  if (repo.db.transactionActive)
    throw new Error('Recovery authority initialization must run outside a database transaction.');
  if (!isAssetStorageId(options.domain)) throw new Error('Invalid recovery authority domain.');
  const principal = { accountId: await storage.principal() };
  await repo.assertRecoveryOperator(principal);
  if (await storage.readRecoveryMarker(options.domain))
    throw new Error(
      'Recovery authority already exists; bootstrap cannot replace its current restrictions.',
    );
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const exported = await exportAuthority(repo, storage, options.domain, options.directory);
  const current = await repo.restrictionSnapshot();
  if (current.generation !== exported.snapshot.generation)
    throw new Error('Asset authority changed during initial recovery coverage.');
  const complete: AuthorityMarker = {
    format: 'openlegend-asset-authority',
    domain: options.domain,
    generation: current.generation,
    status: 'complete',
    authority: exported.object,
  };
  await storage.compareRecoveryMarker(options.domain, Buffer.from(JSON.stringify(complete)));
  return complete;
}
export async function withRecoveryAuthority<T>(
  repo: AssetRepository,
  storage: AssetRecoveryTransport,
  options: {
    domain: string;
    directory: string;
    operationId: string;
    fingerprint: string;
    principal: AssetPrincipal;
  },
  mutation: () => Promise<T>,
): Promise<T> {
  if (repo.db.transactionActive)
    throw new Error('Recovery authority coordination must run outside a database transaction.');
  if (
    !isAssetStorageId(options.domain) ||
    !isAssetStorageId(options.operationId) ||
    !/^[a-f0-9]{64}$/.test(options.fingerprint)
  )
    throw new Error('Invalid recovery authority operation.');
  if ((await storage.principal()) !== options.principal.accountId)
    throw new Error('Recovery storage identity differs from the admitted operator.');
  const observed = await storage.readRecoveryMarker(options.domain);
  if (!observed)
    throw new Error(
      'Initialize verified recovery authority before changing current asset permissions.',
    );
  const head = marker(observed, options.domain);
  const operation = {
    id: options.operationId,
    accountId: options.principal.accountId,
    fingerprint: options.fingerprint,
  };
  const matches = head.operation && JSON.stringify(head.operation) === JSON.stringify(operation);
  const replay = await repo.authorityOperationOutcome<T>(
    options.principal,
    options.operationId,
    options.fingerprint,
  );
  if (head.status === 'pending' && !matches) {
    // A multistage owner can read its already committed earlier outcome to reach
    // the exact later phase whose coverage was interrupted. This does not clear
    // the pending marker or admit another authority mutation.
    if (replay && replay.generation <= head.generation) return replay.outcome;
    throw new Error(
      'Another asset authority operation has incomplete recovery coverage; reconcile it first.',
    );
  }
  const before = await repo.restrictionSnapshot();
  if (!matches && head.generation !== before.generation)
    throw new Error(
      'Current SQL authority is not covered by the independently retained recovery marker.',
    );
  const prior = replay;
  if (prior && head.status === 'complete' && head.generation === before.generation)
    return prior.outcome;
  // An already admitted operation can finish its coverage after the mutation
  // removed the caller's own grant; the retained pending marker fixes its exact
  // identity. A new operation must still hold every current manage grant.
  if (!matches) await repo.assertRecoveryOperator(options.principal);
  let pending = observed;
  if (head.status !== 'pending') {
    const next: AuthorityMarker = { ...head, status: 'pending', operation };
    pending = await storage.compareRecoveryMarker(
      options.domain,
      Buffer.from(JSON.stringify(next)),
      observed.etag,
    );
  }
  // The independently pending marker is committed before SQL changes, so a crash
  // cannot silently authorize a restore using yesterday's grants.
  let result: { generation: number; outcome: T };
  try {
    result = await repo.authorityOperation(
      options.principal,
      options.operationId,
      options.fingerprint,
      mutation,
    );
  } catch (error) {
    // If a transaction was conclusively rolled back, restore complete coverage
    // of the unchanged authority instead of stranding every later operation.
    // An unavailable database or uncertain commit deliberately leaves pending.
    const committed = await repo.authorityOperationOutcome<T>(
      options.principal,
      options.operationId,
      options.fingerprint,
    );
    if (committed) result = committed;
    else {
      const unchanged = await repo.restrictionSnapshot();
      if (unchanged.generation !== before.generation) throw error;
      await mkdir(options.directory, { recursive: true, mode: 0o700 });
      const exported = await exportAuthority(repo, storage, options.domain, options.directory);
      if (exported.snapshot.generation !== before.generation) throw error;
      const restored: AuthorityMarker = {
        format: 'openlegend-asset-authority',
        domain: options.domain,
        generation: before.generation,
        status: 'complete',
        authority: exported.object,
      };
      await storage.compareRecoveryMarker(
        options.domain,
        Buffer.from(JSON.stringify(restored)),
        pending.etag,
      );
      throw error;
    }
  }
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const exported = await exportAuthority(repo, storage, options.domain, options.directory);
  if (result.generation !== exported.snapshot.generation)
    throw new Error(
      'Another authority mutation raced recovery coverage; the marker remains pending.',
    );
  const complete: AuthorityMarker = {
    format: 'openlegend-asset-authority',
    domain: options.domain,
    generation: result.generation,
    status: 'complete',
    operation,
    authority: exported.object,
  };
  await storage.compareRecoveryMarker(
    options.domain,
    Buffer.from(JSON.stringify(complete)),
    pending.etag,
  );
  return result.outcome;
}
async function* diskFiles(root: string, directory = root): AsyncGenerator<string> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* diskFiles(root, path);
    else if (entry.isFile()) yield relative(root, path).split('\\').join('/');
    else throw new Error('Recovery metadata must contain ordinary files and directories only.');
  }
}
async function capturedRevisions(path: string): Promise<StoredAssetRevision[]> {
  const revisions: StoredAssetRevision[] = [];
  for await (const line of catalogLines(path)) {
    const value = JSON.parse(line) as { table: string; row?: Record<string, unknown> };
    if (value.table === 'asset_revisions' && value.row) {
      const revision = JSON.parse(String(value.row['payload'])) as StoredAssetRevision;
      assertAssetRevisionReference(revision.reference);
      assertAssetManifest(revision.manifest);
      assertArtifactReference(revision.manifestArtifact);
      if (
        digest(revision.manifestText) !== revision.reference.manifestSha256 ||
        JSON.stringify(revision.manifest) !== revision.manifestText ||
        assetRevisionKey(revision.manifest.identity) !== assetRevisionKey(revision.reference) ||
        revision.manifestArtifact.sha256 !== revision.reference.manifestSha256 ||
        revision.manifestArtifact.bytes !== Buffer.byteLength(revision.manifestText) ||
        revision.manifestArtifact.mediaType !== 'application/json'
      )
        throw new Error('Captured immutable manifest identity or bytes disagree.');
      revisions.push(revision);
      if (revisions.length > 10000)
        throw new Error('Recovery revision count exceeds its allowance.');
    }
  }
  return revisions;
}
async function* catalogLines(path: string): AsyncGenerator<string> {
  const input = createReadStream(path, { highWaterMark: 65536 });
  let pending = Buffer.alloc(0),
    bytes = 0,
    rows = 0;
  try {
    for await (const value of input) {
      const chunk = value as Buffer;
      bytes += chunk.length;
      if (bytes > CHECKPOINT_LIMITS.bytes)
        throw new Error('Recovery catalog exceeds its byte allowance.');
      pending = Buffer.concat([pending, chunk]);
      let end: number;
      while ((end = pending.indexOf(10)) >= 0) {
        if (end + 1 > CHECKPOINT_LIMITS.rowBytes || ++rows > CHECKPOINT_LIMITS.rows)
          throw new Error('Recovery catalog exceeds its record allowance.');
        yield pending.subarray(0, end).toString('utf8');
        pending = pending.subarray(end + 1);
      }
      if (pending.length > CHECKPOINT_LIMITS.rowBytes)
        throw new Error('Recovery catalog record exceeds its allowance.');
    }
    if (pending.length) throw new Error('Recovery catalog has an incomplete final record.');
  } finally {
    input.destroy();
  }
}
function sameStorage(a: AssetStorageIdentity, b: AssetStorageIdentity): boolean {
  return a.accountId === b.accountId && a.region === b.region && a.bucket === b.bucket;
}
async function capturedTransferLocations(
  path: string,
): Promise<Map<string, { reference: ArtifactReference; location: AssetPhysicalLocation }[]>> {
  const operations = new Map<
    string,
    { reference: AssetRevisionReference; storage: AssetStorageIdentity }
  >();
  const claims = new Map<string, Map<string, ArtifactReference>>();
  const targets = new Map<string, Set<string>>();
  const receipts = new Map<string, Map<string, AssetTransferReceipt>>();
  let count = 0;
  for await (const line of catalogLines(path)) {
    const { table, row } = JSON.parse(line) as { table: string; row?: Record<string, unknown> };
    if (!row) continue;
    if (table === 'asset_operations' && row['status'] === 'committed') {
      const admission = JSON.parse(String(row['admission'])) as {
        reference: AssetRevisionReference;
        storage: AssetStorageIdentity;
      };
      assertAssetRevisionReference(admission.reference);
      if (!admission.storage)
        throw new Error('Committed publication lacks its exact physical destination admission.');
      operations.set(String(row['id']), admission);
      if (operations.size > 10000)
        throw new Error('Recovery operation count exceeds its allowance.');
    }
    if (table === 'asset_claims') {
      const reference = JSON.parse(String(row['payload'])) as ArtifactReference;
      assertArtifactReference(reference);
      const operationId = String(row['operation_id']);
      let files = claims.get(operationId);
      if (!files) {
        files = new Map();
        claims.set(operationId, files);
      }
      files.set(artifactReferenceKey(reference), reference);
      if (++count > 100000) throw new Error('Recovery claim count exceeds its allowance.');
    }
    if (table === 'asset_named_targets') {
      const identity = JSON.stringify([row['operation_id'], row['artifact_key']]);
      let keys = targets.get(identity);
      if (!keys) {
        keys = new Set();
        targets.set(identity, keys);
      }
      keys.add(String(row['object_key']));
    }
    if (table === 'asset_transfers') {
      const receipt = JSON.parse(String(row['payload'])) as AssetTransferReceipt;
      const operationId = String(row['operation_id']);
      let files = receipts.get(operationId);
      if (!files) {
        files = new Map();
        receipts.set(operationId, files);
      }
      files.set(String(row['artifact_key']), receipt);
    }
  }
  const result = new Map<
    string,
    { reference: ArtifactReference; location: AssetPhysicalLocation }[]
  >();
  for (const [operationId, operation] of operations) {
    const files = claims.get(operationId);
    if (!files?.size) throw new Error('Committed publication has no captured output claims.');
    const identity = JSON.stringify([
      assetRevisionKey(operation.reference),
      operation.reference.manifestSha256,
    ]);
    let locations = result.get(identity);
    if (!locations) {
      locations = [];
      result.set(identity, locations);
    }
    for (const [key, reference] of files) {
      const receipt = receipts.get(operationId)?.get(key);
      if (
        !receipt ||
        !sameArtifact(receipt.reference, reference) ||
        receipt.fullFileSha256 !== reference.sha256 ||
        receipt.bytes !== reference.bytes ||
        receipt.mediaType !== reference.mediaType
      )
        throw new Error('Committed publication lacks an exact captured transfer receipt.');
      assertAssetPhysicalLocation(receipt.location, reference);
      if (
        !sameStorage(receipt.location, operation.storage) ||
        receipt.location.key !== artifactKey(reference)
      )
        throw new Error(
          'Canonical transfer receipt differs from its admitted physical destination.',
        );
      locations.push({ reference, location: receipt.location });
      const keys = targets.get(JSON.stringify([operationId, key])) ?? new Set<string>();
      if ((receipt.locations?.length ?? 0) !== keys.size)
        throw new Error('Named transfer receipts do not cover their admitted targets.');
      const seen = new Set<string>();
      for (const location of receipt.locations ?? []) {
        assertAssetPhysicalLocation(location, reference);
        if (
          !sameStorage(location, operation.storage) ||
          !keys.has(location.key) ||
          seen.has(location.key)
        )
          throw new Error('Named transfer receipt differs from its admitted physical target.');
        seen.add(location.key);
        locations.push({ reference, location });
      }
    }
  }
  return result;
}
/** Own the SQL snapshot briefly; transfer bytes outside it. Every copied file is
 * checked against current rights on both sides of elapsed cloud work. */
export async function createAssetRecoveryCheckpoint(
  repo: AssetRepository,
  storage: AssetRecoveryTransport,
  options: {
    checkpointId: string;
    authorityDomain: string;
    sourceDirectory: string;
    directory: string;
    sourceStorages?: AssetRecoveryTransport[];
  },
): Promise<RecoveryObject> {
  if (repo.db.transactionActive)
    throw new Error('Recovery checkpoint creation must run outside a database transaction.');
  if (!isAssetStorageId(options.checkpointId) || !isAssetStorageId(options.authorityDomain))
    throw new Error('Invalid recovery checkpoint identity.');
  const principal = { accountId: await storage.principal() };
  await repo.assertRecoveryOperator(principal);
  const observed = await storage.readRecoveryMarker(options.authorityDomain);
  if (!observed) throw new Error('Recovery authority coverage must be initialized first.');
  const current = marker(observed, options.authorityDomain);
  if (current.status !== 'complete' || !current.authority)
    throw new Error('Current authority coverage is incomplete.');
  const owner = {
    id: options.checkpointId,
    domain: options.authorityDomain,
    accountId: storage.configuration.accountId,
  };
  try {
    await mkdir(options.directory, { mode: 0o700 });
    await writeNew(join(options.directory, 'owner.json'), JSON.stringify(owner));
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !== 'EEXIST' ||
      JSON.stringify(await boundedJson(join(options.directory, 'owner.json'), 16384)) !==
        JSON.stringify(owner)
    )
      throw error;
  }
  const metadataRoot = join(options.directory, 'metadata');
  const catalogPath = join(metadataRoot, 'asset-catalog.jsonl');
  let totalBytes = 0,
    rows = 0,
    operationalBackup = false;
  const capturePath = join(options.directory, 'capture.json');
  let capture:
    | {
        generation: number;
        operationalBackup: boolean;
        files: { path: string; sha256: string; bytes: number }[];
      }
    | undefined;
  try {
    capture = (await boundedJson(capturePath, 4 * 1024 * 1024)) as typeof capture;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (capture) {
    if (
      capture.generation !== current.generation ||
      typeof capture.operationalBackup !== 'boolean' ||
      !Array.isArray(capture.files) ||
      capture.files.length > 20000
    )
      throw new Error(
        'Checkpoint capture belongs to another authority generation; keep it and start a new checkpoint.',
      );
    for (const file of capture.files) {
      if (!isRepositoryAssetPath(file.path)) throw new Error('Invalid captured metadata path.');
      const actual = await hashAssetFile(join(metadataRoot, file.path));
      if (actual.sha256 !== file.sha256 || actual.bytes !== file.bytes)
        throw new Error('Captured recovery metadata changed.');
    }
    operationalBackup = capture.operationalBackup;
  } else {
    // The exact owner record permits discarding only this attempt's unpublished,
    // incomplete metadata capture. Protected cloud bytes are never removed here.
    await rm(metadataRoot, { recursive: true, force: true });
    await mkdir(metadataRoot, { mode: 0o700 });
    await (repo.db.readTransaction?.bind(repo.db) ?? repo.db.transaction.bind(repo.db))(
      async () => {
        const snapshot = await repo.restrictionSnapshot();
        if (snapshot.generation !== current.generation)
          throw new Error('Current recovery authority does not cover the SQL snapshot.');
        await writeNew(join(metadataRoot, 'authority.json'), JSON.stringify(snapshot));
        const catalog = await open(catalogPath, 'wx', 0o600);
        try {
          for (const table of ASSET_TABLES) {
            await catalog.writeFile(JSON.stringify({ table }) + '\n');
            for await (const row of tableRows(repo.db, table)) {
              const line = JSON.stringify({ table, row }) + '\n',
                bytes = Buffer.byteLength(line);
              totalBytes += bytes;
              rows++;
              if (
                bytes > CHECKPOINT_LIMITS.rowBytes ||
                totalBytes > CHECKPOINT_LIMITS.bytes ||
                rows > CHECKPOINT_LIMITS.rows
              )
                throw new Error(
                  'Asset catalog exceeds the existing checkpoint encoding allowance.',
                );
              await catalog.writeFile(line);
            }
          }
          await catalog.sync();
        } finally {
          await catalog.close();
        }
        if (await repo.db.prepare('SELECT world_id FROM world_head LIMIT 1').get()) {
          await writeOperationalBackup(
            repo.db,
            options.sourceDirectory,
            join(metadataRoot, 'world'),
          );
          operationalBackup = true;
        }
      },
    );
    const files: { path: string; sha256: string; bytes: number }[] = [];
    for await (const path of diskFiles(metadataRoot)) {
      if (files.length >= 20000)
        throw new Error('Recovery metadata file count exceeds its allowance.');
      files.push({ path, ...(await hashAssetFile(join(metadataRoot, path))) });
    }
    capture = { generation: current.generation, operationalBackup, files };
    await writeNew(capturePath, JSON.stringify(capture));
  }
  const revisions = await capturedRevisions(catalogPath);
  const physicalSources = await capturedTransferLocations(catalogPath);
  const artifacts: AssetRecoveryCheckpoint['artifacts'] = [],
    unavailable: AssetRevisionReference[] = [];
  const copied = new Map<string, { object: RecoveryObject; sourceVersionId?: string }>();
  for (const revision of revisions) {
    try {
      await repo.revision(revision.reference, principal);
    } catch (error) {
      if (!(error instanceof AssetAccessError && error.code === 'unavailable')) throw error;
      unavailable.push(revision.reference);
      continue;
    }
    const sources = [revision.manifestArtifact, ...Object.values(revision.manifest.files)];
    const canonical = new Map(
      sources.map((reference) => [artifactReferenceKey(reference), reference]),
    );
    const locations = physicalSources.get(
      JSON.stringify([assetRevisionKey(revision.reference), revision.reference.manifestSha256]),
    );
    if (!locations)
      throw new Error('Available revision lacks recorded physical transfer locations.');
    const visited = new Set<string>();
    const work = locations.filter(({ reference, location }) => {
      const identity = JSON.stringify([
        artifactReferenceKey(reference),
        location.accountId,
        location.region,
        location.bucket,
        location.key,
        location.versionId,
      ]);
      if (visited.has(identity)) return false;
      visited.add(identity);
      return true;
    });
    if (artifacts.length + work.length > MAX_ARTIFACTS)
      throw new Error('Recovery reference count exceeds its allowance.');
    const outcomes: AssetRecoveryCheckpoint['artifacts'] = new Array(work.length);
    const protect = async (index: number) => {
      const { reference: source, location } = work[index]!;
      const actual = canonical.get(artifactReferenceKey(source));
      if (!actual || !sameArtifact(actual, source))
        throw new Error('Recorded physical source is outside its immutable manifest.');
      const sourceKey = location.key;
      await repo.authorizeRecoveryArtifact(principal, revision.reference, source);
      const identity = JSON.stringify([
        artifactReferenceKey(source),
        location.accountId,
        location.region,
        location.bucket,
        sourceKey,
        location.versionId,
      ]);
      let retained = copied.get(identity);
      if (!retained) {
        if (copied.size >= MAX_ARTIFACTS)
          throw new Error('Recovery artifact count exceeds its allowance.');
        const reference: ArtifactReference = {
          ...source,
          boundary: 'asset-recovery',
          accessDomain: options.authorityDomain,
        };
        const sourceStorage = [storage, ...(options.sourceStorages ?? [])].find(
          (candidate) =>
            candidate.configuration.accountId === location.accountId &&
            candidate.configuration.region === location.region &&
            candidate.configuration.buckets[source.boundary] === location.bucket &&
            candidate.configuration.buckets['asset-recovery'] ===
              storage.configuration.buckets['asset-recovery'],
        );
        if (!sourceStorage)
          throw new Error(
            'No trusted environment configuration covers this recorded physical source.',
          );
        const key = `origins/${location.accountId}/${location.bucket}/${sourceKey}`;
        const stored = await sourceStorage.copy(
          source,
          reference,
          key,
          sourceKey,
          location.versionId,
        );
        if (stored.sourceVersionId !== location.versionId)
          throw new Error('Recovery copy did not verify the recorded exact source version.');
        retained = {
          object: { reference, key, ...(stored.versionId ? { versionId: stored.versionId } : {}) },
          ...(stored.sourceVersionId ? { sourceVersionId: stored.sourceVersionId } : {}),
        };
        copied.set(identity, retained);
      }
      await repo.authorizeRecoveryArtifact(principal, revision.reference, source);
      outcomes[index] = {
        revision: revision.reference,
        source,
        sourceAccountId: location.accountId,
        sourceRegion: location.region,
        sourceBucket: location.bucket,
        sourceKey,
        ...('sourceVersionId' in retained ? { sourceVersionId: retained.sourceVersionId } : {}),
        recovery: retained.object,
      };
    };
    // Four owned transfers overlap network latency. Keep captured order stable,
    // stop admitting on failure, and settle every admitted copy before returning.
    await recoveryTransfers(work, (_file, index) => protect(index));
    artifacts.push(...outcomes);
  }
  const metadata: AssetRecoveryCheckpoint['metadata'] = [];
  let metadataBytes = 0;
  for await (const path of diskFiles(metadataRoot)) {
    if (metadata.length >= 20000)
      throw new Error('Recovery metadata file count exceeds its allowance.');
    const facts = await hashAssetFile(join(metadataRoot, path));
    metadataBytes += facts.bytes;
    if (metadataBytes > CHECKPOINT_LIMITS.bytes)
      throw new Error('Combined recovery metadata exceeds its byte allowance.');
    const reference: ArtifactReference = {
      ...facts,
      boundary: 'asset-recovery',
      accessDomain: options.authorityDomain,
      mediaType: 'application/octet-stream',
    };
    const key = `checkpoints/${options.checkpointId}/metadata/${facts.sha256}`;
    const stored = await storage.upload(reference, join(metadataRoot, path), key);
    metadata.push({
      path,
      reference,
      key,
      ...(stored.versionId ? { versionId: stored.versionId } : {}),
    });
  }
  const latest = await storage.readRecoveryMarker(options.authorityDomain);
  if (
    !latest ||
    latest.etag !== observed.etag ||
    (await repo.restrictionSnapshot()).generation !== current.generation
  )
    throw new Error(
      'Authority changed during checkpoint protection; this checkpoint is not published.',
    );
  const checkpoint: AssetRecoveryCheckpoint = {
    format: 'openlegend-asset-recovery',
    id: options.checkpointId,
    accountId: storage.configuration.accountId,
    region: storage.configuration.region,
    createdAt: new Date().toISOString(),
    authorityDomain: options.authorityDomain,
    authorityGeneration: current.generation,
    authority: current.authority,
    metadata,
    artifacts,
    unavailable,
    operationalBackup,
  };
  const bytes = Buffer.from(JSON.stringify(checkpoint));
  if (bytes.length > MAX_CHECKPOINT_BYTES)
    throw new Error('Recovery checkpoint manifest exceeds its allowance.');
  const reference = recoveryReference(bytes, options.authorityDomain),
    key = `checkpoints/${options.checkpointId}/manifest.json`;
  const path = join(options.directory, 'manifest.json');
  try {
    await writeNew(path, bytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const prior = (await boundedJson(path, MAX_CHECKPOINT_BYTES)) as AssetRecoveryCheckpoint;
    // A complete local manifest is immutable. Its original timestamp/receipts
    // survive a lost upload acknowledgement instead of inventing a second cut.
    assertCheckpoint(
      prior,
      options.authorityDomain,
      storage.configuration.accountId,
      storage.configuration.region,
    );
    if (prior.id !== options.checkpointId || prior.authorityGeneration !== current.generation)
      throw new Error('Existing checkpoint manifest belongs to another capture.');
    const facts = await hashAssetFile(path);
    const savedReference = { ...reference, ...facts };
    const stored = await storage.upload(savedReference, path, key);
    return {
      reference: savedReference,
      key,
      ...(stored.versionId ? { versionId: stored.versionId } : {}),
    };
  }
  const stored = await storage.upload(reference, path, key);
  return { reference, key, ...(stored.versionId ? { versionId: stored.versionId } : {}) };
}
function assertCheckpoint(
  value: unknown,
  domain: string,
  accountId: string,
  region: string,
): asserts value is AssetRecoveryCheckpoint {
  const checkpoint = value as AssetRecoveryCheckpoint;
  if (
    !checkpoint ||
    checkpoint.format !== 'openlegend-asset-recovery' ||
    !isAssetStorageId(checkpoint.id) ||
    checkpoint.accountId !== accountId ||
    checkpoint.region !== region ||
    checkpoint.authorityDomain !== domain ||
    !Number.isSafeInteger(checkpoint.authorityGeneration) ||
    checkpoint.authorityGeneration < 0 ||
    !Array.isArray(checkpoint.artifacts) ||
    checkpoint.artifacts.length > MAX_ARTIFACTS ||
    !Array.isArray(checkpoint.metadata) ||
    checkpoint.metadata.length > 20000 ||
    !Array.isArray(checkpoint.unavailable) ||
    checkpoint.unavailable.length > 10000 ||
    typeof checkpoint.operationalBackup !== 'boolean'
  )
    throw new Error('Invalid recovery checkpoint manifest.');
  assertRecoveryObject(checkpoint.authority, domain);
  const paths = new Set<string>();
  for (const file of checkpoint.metadata) {
    assertRecoveryObject(file, domain);
    if (!isRepositoryAssetPath(file.path) || paths.has(file.path))
      throw new Error('Unsafe recovery metadata path.');
    paths.add(file.path);
  }
  if (
    checkpoint.metadata.reduce((sum, file) => sum + file.reference.bytes, 0) >
    CHECKPOINT_LIMITS.bytes
  )
    throw new Error('Combined recovery metadata exceeds its byte allowance.');
  if (!paths.has('asset-catalog.jsonl') || !paths.has('authority.json'))
    throw new Error('Recovery checkpoint omits its SQL authority.');
  for (const file of checkpoint.artifacts) {
    assertAssetRevisionReference(file.revision);
    assertArtifactReference(file.source);
    assertRecoveryObject(file.recovery, domain);
    assertAssetPhysicalLocation(
      {
        accountId: file.sourceAccountId,
        region: file.sourceRegion,
        bucket: file.sourceBucket,
        key: file.sourceKey,
        versionId: file.sourceVersionId,
      },
      file.source,
    );
    if (
      file.source.sha256 !== file.recovery.reference.sha256 ||
      file.source.bytes !== file.recovery.reference.bytes ||
      file.source.mediaType !== file.recovery.reference.mediaType ||
      file.sourceAccountId !== accountId ||
      file.sourceRegion !== checkpoint.region ||
      !isArtifactObjectKey(file.source, file.sourceKey) ||
      !/^[a-z0-9][a-z0-9.-]+$/.test(file.sourceBucket) ||
      file.recovery.key !== `origins/${file.sourceAccountId}/${file.sourceBucket}/${file.sourceKey}`
    )
      throw new Error('Recovery object differs from its recorded exact source.');
  }
  checkpoint.unavailable.forEach(assertAssetRevisionReference);
}
async function verifyCapturedClosure(
  checkpoint: AssetRecoveryCheckpoint,
  directory: string,
): Promise<void> {
  const catalog = join(directory, 'metadata/asset-catalog.jsonl');
  const revisions = await capturedRevisions(catalog),
    physical = await capturedTransferLocations(catalog);
  const key = (reference: AssetRevisionReference) =>
    JSON.stringify([assetRevisionKey(reference), reference.manifestSha256]);
  const records = new Map(revisions.map((record) => [key(record.reference), record]));
  if (records.size !== revisions.length)
    throw new Error('Recovery catalog repeats an immutable revision.');
  const unavailable = new Set(checkpoint.unavailable.map(key));
  if (
    unavailable.size !== checkpoint.unavailable.length ||
    [...unavailable].some((reference) => !records.has(reference))
  )
    throw new Error('Recovery unavailable records do not match its captured catalog.');
  const files = new Map<string, ArtifactReference>();
  for (const file of checkpoint.artifacts) {
    const identity = key(file.revision);
    if (!records.has(identity) || unavailable.has(identity))
      throw new Error('Recovery file has no available captured owner.');
    const location = JSON.stringify([
      identity,
      artifactReferenceKey(file.source),
      assetPhysicalKey(
        { accountId: file.sourceAccountId, region: file.sourceRegion, bucket: file.sourceBucket },
        file.sourceKey,
      ),
      file.sourceVersionId,
    ]);
    if (files.has(location)) throw new Error('Recovery manifest repeats an exact source location.');
    files.set(location, file.source);
  }
  const roots: AssetRevisionReference[] = [];
  for (const record of revisions) {
    const identity = key(record.reference);
    if (unavailable.has(identity)) continue;
    roots.push(record.reference);
    const expected = [record.manifestArtifact, ...Object.values(record.manifest.files)];
    const members = new Map(
      expected.map((reference) => [artifactReferenceKey(reference), reference]),
    );
    const locations = physical.get(identity);
    if (!locations) throw new Error('Captured revision has no exact physical receipts.');
    const covered = new Set<string>();
    for (const { reference, location } of locations) {
      const member = members.get(artifactReferenceKey(reference));
      if (!member || !sameArtifact(member, reference))
        throw new Error('Captured physical receipt names a file outside its immutable manifest.');
      const actual = files.get(
        JSON.stringify([
          identity,
          artifactReferenceKey(reference),
          assetPhysicalKey(location, location.key),
          location.versionId,
        ]),
      );
      if (!actual || !sameArtifact(actual, reference))
        throw new Error('Recovery checkpoint omits a required canonical or named file.');
      covered.add(artifactReferenceKey(reference));
    }
    if (expected.some((reference) => !covered.has(artifactReferenceKey(reference))))
      throw new Error('Recovery checkpoint lacks physical receipt coverage for a manifest member.');
  }
  await assetDependencyClosure(
    roots,
    async (reference) => {
      const record = records.get(key(reference));
      if (!record || unavailable.has(key(reference)))
        throw new Error('Recovery checkpoint has an unavailable required dependency.');
      return record.manifest;
    },
    { maxRevisions: 100000, maxFiles: 100000, maxBytes: Number.MAX_SAFE_INTEGER, maxDepth: 10000 },
  );
}
/** Downloads into an absent isolated directory and verifies all retained bytes.
 * It does not install a database or grant access to recovered content. */
export async function verifyAssetRecoveryCheckpoint(
  storage: AssetRecoveryTransport,
  locator: RecoveryObject,
  options: { directory: string },
): Promise<AssetRecoveryCheckpoint> {
  assertRecoveryObject(locator, locator.reference.accessDomain);
  if (locator.reference.bytes > MAX_CHECKPOINT_BYTES)
    throw new Error('Recovery manifest exceeds its allowance.');
  await mkdir(options.directory, { mode: 0o700 });
  const path = join(options.directory, 'manifest.json');
  await storage.downloadNamed(locator.reference, locator.key, path, undefined, locator.versionId);
  const checkpoint = await boundedJson(path, MAX_CHECKPOINT_BYTES);
  assertCheckpoint(
    checkpoint,
    locator.reference.accessDomain,
    storage.configuration.accountId,
    storage.configuration.region,
  );
  await recoveryTransfers(checkpoint.metadata, async (file) => {
    const destination = join(options.directory, 'metadata', file.path);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await storage.downloadNamed(file.reference, file.key, destination, undefined, file.versionId);
  });
  await verifyCapturedClosure(checkpoint, options.directory);
  const verified = new Map<string, RecoveryObject>();
  for (const file of checkpoint.artifacts) {
    const identity = JSON.stringify([file.recovery.key, file.recovery.versionId]);
    const prior = verified.get(identity);
    if (prior && !sameArtifact(prior.reference, file.recovery.reference))
      throw new Error('One protected object/version has conflicting exact file descriptions.');
    verified.set(identity, file.recovery);
  }
  await recoveryTransfers([...verified.values()], async (file) => {
    await storage.verify(file.reference, file.key, file.versionId);
  });
  const snapshot = authoritySnapshot(
    await boundedJson(
      join(options.directory, 'metadata/authority.json'),
      ASSET_AUTHORITY_MAX_BYTES,
    ),
  );
  if (snapshot.generation !== checkpoint.authorityGeneration)
    throw new Error('Recovery SQL snapshot authority generation disagrees.');
  return checkpoint;
}
/** Install only an asset catalog into an empty target. A full-world checkpoint uses
 * the existing operational restore owner instead. Both paths retain quarantine. */
export async function restoreAssetRecoveryCatalog(
  repo: AssetRepository,
  directory: string,
): Promise<void> {
  await repo.db.transaction(async () => {
    for (const table of ASSET_TABLES)
      if (await repo.db.prepare(`SELECT 1 AS present FROM ${table} LIMIT 1`).get())
        throw new Error('Recovery catalog target is not empty.');
    let index = -1;
    for await (const line of catalogLines(join(directory, 'metadata/asset-catalog.jsonl'))) {
      const entry = JSON.parse(line) as { table: string; row?: Record<string, unknown> };
      if (!entry.row) {
        if (ASSET_TABLES[++index] !== entry.table)
          throw new Error('Recovery catalog table coverage mismatch.');
        continue;
      }
      const columns = Object.keys(entry.row);
      if (
        ASSET_TABLES[index] !== entry.table ||
        !columns.length ||
        columns.some((column) => !/^[a-z_][a-z0-9_]*$/.test(column))
      )
        throw new Error('Invalid recovery catalog row.');
      await repo.db
        .prepare(
          `INSERT INTO ${entry.table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
        )
        .run(...columns.map((column) => entry.row![column]));
    }
    if (index !== ASSET_TABLES.length - 1) throw new Error('Recovery catalog is incomplete.');
    await repo.quarantineAuthority();
  });
}
export async function readCurrentAssetAuthority(
  storage: AssetRecoveryTransport,
  options: { domain: string; directory: string },
): Promise<AssetAuthoritySnapshot> {
  const observed = await storage.readRecoveryMarker(options.domain);
  if (!observed)
    throw new Error(
      'Independent current authority is missing; recovered content remains quarantined.',
    );
  const current = marker(observed, options.domain);
  if (current.status !== 'complete' || !current.authority)
    throw new Error(
      'Independent authority coverage is pending; recovered content remains quarantined.',
    );
  if (current.authority.reference.bytes > ASSET_AUTHORITY_MAX_BYTES)
    throw new Error('Authority export exceeds its allowance.');
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const path = join(options.directory, `authority-${current.authority.reference.sha256}.json`);
  await downloadExact(storage, current.authority, path);
  const snapshot = authoritySnapshot(await boundedJson(path, ASSET_AUTHORITY_MAX_BYTES));
  const latest = await storage.readRecoveryMarker(options.domain);
  if (!latest || latest.etag !== observed.etag)
    throw new Error('Independent authority changed during restore verification.');
  // Current recovery IAM possession alone is insufficient: the independently
  // current export must also retain this operator's manage grants for every domain.
  const accountId = await storage.principal();
  const managedDomains = new Set<string>();
  for (const grant of snapshot.grants)
    if (
      grant['account_id'] === accountId &&
      (JSON.parse(String(grant['permissions'])) as string[]).includes('manage')
    )
      managedDomains.add(JSON.stringify([grant['boundary'], grant['access_domain']]));
  for (const domain of snapshot.domains) {
    if (!managedDomains.has(JSON.stringify([domain['boundary'], domain['access_domain']])))
      throw new Error('Current recovery authority does not admit this operator.');
  }
  if (snapshot.generation !== current.generation)
    throw new Error('Current authority export differs from its independent generation.');
  return snapshot;
}
export async function reconcileRecoveredAssetAuthority(
  repo: AssetRepository,
  storage: AssetRecoveryTransport,
  options: { domain: string; directory: string },
): Promise<number> {
  const snapshot = await readCurrentAssetAuthority(storage, options);
  await repo.reconcileAuthority(snapshot, snapshot.generation);
  return snapshot.generation;
}
/** Rehydrate currently permitted exact locations into private intake quarantine.
 * The recovery role cannot write primary origins; promotion uses publication. */
export async function restoreAssetRecoveryObjects(
  repo: AssetRepository,
  storage: AssetRecoveryTransport,
  checkpoint: AssetRecoveryCheckpoint,
  options: { quarantineDomain: string },
): Promise<{
  restored: number;
  locations: RecoveredAssetLocation[];
  unavailable: AssetRevisionReference[];
}> {
  const { quarantineDomain } = options;
  if (!isAssetStorageId(quarantineDomain) || !quarantineDomain.startsWith('recovery-'))
    throw new Error('Isolated recovery needs an explicit recovery-* quarantine domain.');
  assertCheckpoint(
    checkpoint,
    checkpoint.authorityDomain,
    storage.configuration.accountId,
    storage.configuration.region,
  );
  const destination = {
    accountId: storage.configuration.accountId,
    region: storage.configuration.region,
    bucket: storage.bucket('intake'),
  };
  // Quarantine after failed independent coverage must commit even though the
  // operation reports failure; transfers never belong to a caller transaction.
  if (repo.db.transactionActive)
    throw new Error('Recovery transfers must run outside a database transaction.');
  const principal = { accountId: await storage.principal() };
  // A caller without local recovery authority cannot quarantine another
  // operator's catalog merely by presenting unusable storage credentials.
  await repo.assertRecoveryOperator(principal);
  const authorityDirectory = await mkdtemp(join(tmpdir(), 'openlegend-intake-authority-'));
  try {
    const currentAuthority = async (expectedGeneration?: number): Promise<number> => {
      try {
        const current = await readCurrentAssetAuthority(storage, {
          domain: checkpoint.authorityDomain,
          directory: authorityDirectory,
        });
        await repo.assertRecoveryOperator(principal);
        const local = await repo.db
          .prepare("SELECT generation,complete FROM asset_authority WHERE id='current'")
          .get();
        if (
          Number(local?.['complete']) !== 1 ||
          Number(local?.['generation']) !== current.generation ||
          (expectedGeneration !== undefined && current.generation !== expectedGeneration)
        )
          throw new Error(
            'Independent asset authority changed or differs from the reconciled catalog.',
          );
        return current.generation;
      } catch (error) {
        await repo.quarantineAuthority();
        throw new Error(
          'Current recovery authority could not be confirmed. Copies remain private; reconcile current authority explicitly before retrying.',
          { cause: error },
        );
      }
    };
    const authorityGeneration = await currentAuthority();
    const denied = new Set<string>();
    const restored = new Map<string, Promise<RecoveredAssetLocation>>();
    const outcomes: ({ identity: string; location: RecoveredAssetLocation } | undefined)[] =
      new Array(checkpoint.artifacts.length);
    await recoveryTransfers(checkpoint.artifacts, async (file, index) => {
      try {
        await repo.authorizeRecoveryArtifact(principal, file.revision, file.source);
      } catch (error) {
        if (!(error instanceof AssetAccessError && error.code === 'unavailable')) throw error;
        denied.add(assetRevisionKey(file.revision));
        return;
      }
      const sourceLocation = {
        accountId: file.sourceAccountId,
        region: file.sourceRegion,
        bucket: file.sourceBucket,
        key: file.sourceKey,
        versionId: file.sourceVersionId,
      };
      const identity = JSON.stringify([
        artifactReferenceKey(file.source),
        assetPhysicalKey(sourceLocation, file.sourceKey),
        file.sourceVersionId,
      ]);
      let transfer = restored.get(identity);
      if (!transfer) {
        const reference: ArtifactReference = {
          ...file.source,
          boundary: 'intake',
          accessDomain: quarantineDomain,
        };
        const key = `runs/${quarantineDomain}/restored/${file.sourceAccountId}/${file.sourceBucket}/${file.sourceKey}`;
        transfer = storage
          .copy(file.recovery.reference, reference, key, file.recovery.key, file.recovery.versionId)
          .then((stored) => {
            const location: AssetPhysicalLocation = {
              accountId: stored.accountId,
              region: stored.region,
              bucket: stored.bucket,
              key: stored.key,
              versionId: stored.versionId,
            };
            assertAssetPhysicalLocation(location, reference);
            if (!sameStorage(location, destination) || location.key !== key)
              throw new Error(
                'Recovery copy differs from its admitted private intake destination.',
              );
            return { source: file.source, sourceLocation, reference, location };
          });
        restored.set(identity, transfer);
      }
      const location = await transfer;
      await repo.authorizeRecoveryArtifact(principal, file.revision, file.source);
      outcomes[index] = { identity, location };
    });
    // Keep exact receipt ordering stable across network completion order/replay.
    // Distinct recorded source versions remain distinct even at one intake key.
    const locations = new Map<string, RecoveredAssetLocation>();
    const unavailable = new Map<string, AssetRevisionReference>();
    for (let index = 0; index < checkpoint.artifacts.length; index++) {
      const file = checkpoint.artifacts[index]!;
      const outcome = outcomes[index];
      if (outcome && !locations.has(outcome.identity))
        locations.set(outcome.identity, outcome.location);
      if (denied.has(assetRevisionKey(file.revision)))
        unavailable.set(assetRevisionKey(file.revision), file.revision);
    }
    await currentAuthority(authorityGeneration);
    return {
      restored: locations.size,
      locations: [...locations.values()],
      unavailable: [...unavailable.values()],
    };
  } finally {
    await rm(authorityDirectory, { recursive: true, force: true });
  }
}
