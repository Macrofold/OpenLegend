import {
  ARTIFACT_BOUNDARIES,
  artifactReferenceKey,
  artifactKey,
  assertArtifactReference,
  assertAssetManifest,
  assertAssetRevisionReference,
  assetRevisionKey,
  isAssetStorageId,
  isArtifactObjectKey,
  sameArtifact,
  sameAssetRevision,
  type ArtifactBoundary,
  type ArtifactReference,
  type AssetManifest,
  type AssetRevisionReference,
} from '@open-legend/assets';
import { createHash } from 'node:crypto';
import type { SqlDatabase } from './store.js';
import { CHECKPOINT_LIMITS } from './checkpoint-format.js';

/** Operational records never enter gameplay rewind. Register this complete catalog in
 * operational-backup.ts when adding another owned record. */
export const ASSET_TABLES = [
  'asset_domains',
  'asset_grants',
  'asset_rights',
  'asset_revisions',
  'asset_revision_files',
  'asset_dependencies',
  'asset_operations',
  'asset_claims',
  'asset_claim_references',
  'asset_named_targets',
  'asset_transfers',
  'asset_selections',
  'asset_save_claims',
  'asset_world_bindings',
  'asset_pins',
  'asset_pin_files',
  'asset_restrictions',
  'asset_authority',
  'asset_authority_operations',
  'asset_delivery_removals',
  'asset_withdrawal_plans',
  'asset_withdrawal_items',
  'asset_removal_receipts',
] as const;
export type AssetPermission = 'read' | 'publish' | 'manage' | 'offline';
export type AssetUse =
  | 'source'
  | 'private-study'
  | 'public-study'
  | 'private-runtime'
  | 'public-runtime'
  | 'offline'
  | 'recovery';
export interface AssetPrincipal {
  /** Populated by authenticated server/CLI composition, never a browser request body. */
  accountId: string;
  session?: { id: string; revision: number };
}
export interface AssetDomain {
  boundary: ArtifactBoundary;
  accessDomain: string;
  visibility: 'public' | 'restricted';
}
export interface AssetSelectionRequest {
  /** Structured application owner key, for example JSON.stringify(['dev', workspaceId]). */
  key: string;
  expectedRevision: number;
}
export interface AssetRetentionLimits {
  maxRetainedBytes: number;
  maxRetainedFiles: number;
  maxPublicationOperations: number;
}
export interface AssetStorageIdentity {
  accountId: string;
  region: string;
  bucket: string;
}
export interface AssetPhysicalLocation extends AssetStorageIdentity {
  key: string;
  versionId?: string;
}
export function assetPhysicalKey(storage: AssetStorageIdentity, key: string): string {
  return JSON.stringify([storage.accountId, storage.region, storage.bucket, key]);
}
export interface AssetPublicationInput {
  operationId: string;
  principal: AssetPrincipal;
  destination: AssetDomain;
  reference: AssetRevisionReference;
  manifestText: string;
  manifestArtifact: ArtifactReference;
  files: ArtifactReference[];
  /** The already compiled exact dependency set; final admission checks every current right. */
  dependencies: AssetRevisionReference[];
  selection?: AssetSelectionRequest;
  /** All effective transfer/configuration inputs are part of retry identity. No credentials. */
  configurationRevision: string;
  publicProjectionReviewed: boolean;
  storage: AssetStorageIdentity;
  /** Effective deployment locations only for required children in other boundaries. */
  dependencyStorage?: Partial<Record<ArtifactBoundary, AssetStorageIdentity>>;
  namedFiles?: { reference: ArtifactReference; key: string }[];
}
export interface AssetTransferReceipt {
  reference: ArtifactReference;
  fullFileSha256: string;
  bytes: number;
  mediaType: string;
  location: AssetPhysicalLocation;
  verifiedAt: string;
  reason: 'publication' | 'boundary-copy' | 'recovery';
  source?: ArtifactReference;
  locations?: (AssetPhysicalLocation & { sourceVersionId?: string })[];
}
export interface AssetObjectLocation extends AssetPhysicalLocation {
  reference: ArtifactReference;
  key: string;
}
export interface AssetCurrentRemovalReceipt extends AssetObjectLocation {
  deleteMarkerVersionId: string;
  removedAt: string;
}
export interface AssetControlledRemovalPlan {
  id: string;
  generation: number;
  status: 'pending' | 'complete';
  references: AssetRevisionReference[];
  files: AssetObjectLocation[];
  keptShared: ArtifactReference[];
  cachePurge?: { completed: true; receipt: string };
}
interface StoredWithdrawalPlan {
  id: string;
  generation: number;
  status: AssetControlledRemovalPlan['status'];
  itemCounts: { references: number; files: number; keptShared: number };
  cachePurge?: AssetControlledRemovalPlan['cachePurge'];
}
export interface AssetPublicationOutcome {
  operationId: string;
  reference: AssetRevisionReference;
  manifestArtifact: ArtifactReference;
  selectionRevision?: number;
}
export interface AssetOperation {
  id: string;
  principalId: string;
  generation: number;
  status: 'admitted' | 'prepared' | 'committed' | 'cancelled';
  fingerprint: string;
  input: AssetPublicationInput;
  outcome?: AssetPublicationOutcome;
}
export interface StoredAssetRevision {
  reference: AssetRevisionReference;
  destination: AssetDomain;
  manifestArtifact: ArtifactReference;
  manifestText: string;
  manifest: AssetManifest;
}
export interface AssetAuthoritySnapshot {
  generation: number;
  domains: Record<string, unknown>[];
  grants: Record<string, unknown>[];
  rights: Record<string, unknown>[];
  restrictions: Record<string, unknown>[];
  deliveryRemovals: Record<string, unknown>[];
  withdrawalPlans: Record<string, unknown>[];
  withdrawalItems: Record<string, unknown>[];
  removalReceipts: Record<string, unknown>[];
  authorityOperations: Record<string, unknown>[];
}
export const ASSET_AUTHORITY_MAX_BYTES = 32 * 1024 * 1024;
const authorityTables = {
  domains: 'asset_domains',
  grants: 'asset_grants',
  rights: 'asset_rights',
  restrictions: 'asset_restrictions',
  deliveryRemovals: 'asset_delivery_removals',
  withdrawalPlans: 'asset_withdrawal_plans',
  withdrawalItems: 'asset_withdrawal_items',
  removalReceipts: 'asset_removal_receipts',
  authorityOperations: 'asset_authority_operations',
} as const;

/** Refuse an authority mutation before commit if its result cannot pass the
 * independent recovery exporter or existing operational-backup row codec. Count
 * one row at a time rather than constructing an oversized complete export. */
function assertRecoverableAuthority(snapshot: AssetAuthoritySnapshot): void {
  let bytes = Buffer.byteLength(JSON.stringify({ generation: snapshot.generation }));
  for (const [field, table] of Object.entries(authorityTables)) {
    bytes += Buffer.byteLength(JSON.stringify(field)) + 4; // ,"field":[]
    const rowOverhead = Buffer.byteLength(JSON.stringify({ table, row: {} })) - 2 + 1;
    let first = true;
    for (const row of snapshot[field as keyof typeof authorityTables]) {
      const rowBytes = Buffer.byteLength(JSON.stringify(row));
      if (rowBytes + rowOverhead > CHECKPOINT_LIMITS.rowBytes)
        throw new AssetAccessError(
          'integrity',
          'Asset authority exceeds the recoverable SQL record allowance.',
        );
      bytes += rowBytes + (first ? 0 : 1);
      first = false;
      if (bytes > ASSET_AUTHORITY_MAX_BYTES)
        throw new AssetAccessError(
          'unavailable',
          'Current asset authority would exceed its recovery byte allowance.',
        );
    }
  }
}
export class AssetAccessError extends Error {
  constructor(
    readonly code: 'unavailable' | 'forbidden' | 'conflict' | 'cancelled' | 'integrity',
    message = 'The requested asset operation is unavailable.',
  ) {
    super(message);
  }
}
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const permissions = ['read', 'publish', 'manage', 'offline'] as const;
const uses: readonly AssetUse[] = [
  'source',
  'private-study',
  'public-study',
  'private-runtime',
  'public-runtime',
  'offline',
  'recovery',
];
const revisionChecksumKey = (reference: AssetRevisionReference) =>
  JSON.stringify([assetRevisionKey(reference), reference.manifestSha256]);
const parse = <T>(row: Record<string, unknown> | undefined, column = 'payload'): T | undefined =>
  row ? (JSON.parse(String(row[column])) as T) : undefined;
const readScopes = new WeakMap<
  SqlDatabase,
  {
    generation: number;
    entries: Map<string, Promise<boolean>>;
    listeners: Set<() => void>;
  }
>();
const deliveryScopes = new WeakMap<
  SqlDatabase,
  Map<string, Promise<Map<string, ArtifactReference>>>
>();
function assetReadScopes(db: SqlDatabase) {
  let scopes = readScopes.get(db);
  if (!scopes) {
    scopes = { generation: 0, entries: new Map(), listeners: new Set() };
    readScopes.set(db, scopes);
  }
  return scopes;
}
function assertDomain(domain: AssetDomain): void {
  assertArtifactReference({
    ...domain,
    sha256: '0'.repeat(64),
    bytes: 0,
    mediaType: 'application/json',
  });
  if (
    !['public', 'restricted'].includes(domain.visibility) ||
    (domain.visibility === 'public') !== (domain.accessDomain === 'public') ||
    (domain.visibility === 'public' && !['runtime', 'art-studies'].includes(domain.boundary))
  )
    throw new AssetAccessError('integrity', 'Invalid asset audience boundary.');
}
function publicationUse(domain: AssetDomain): AssetUse {
  if (domain.boundary === 'runtime')
    return domain.visibility === 'public' ? 'public-runtime' : 'private-runtime';
  if (domain.boundary === 'art-studies')
    return domain.visibility === 'public' ? 'public-study' : 'private-study';
  return domain.boundary === 'asset-recovery' ? 'recovery' : 'source';
}
function isAssetStorageIdentity(value: AssetStorageIdentity | undefined): boolean {
  return (
    !!value &&
    typeof value.accountId === 'string' &&
    /^\d{12}$/.test(value.accountId) &&
    typeof value.region === 'string' &&
    value.region.length <= 64 &&
    /^[a-z]{2}-[a-z0-9-]+-\d$/.test(value.region) &&
    typeof value.bucket === 'string' &&
    /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value.bucket)
  );
}
function withdrawalHeader(plan: AssetControlledRemovalPlan): StoredWithdrawalPlan {
  return {
    id: plan.id,
    generation: plan.generation,
    status: plan.status,
    itemCounts: {
      references: plan.references.length,
      files: plan.files.length,
      keptShared: plan.keptShared.length,
    },
    ...(plan.cachePurge ? { cachePurge: plan.cachePurge } : {}),
  };
}
function withdrawalPlan(
  header: StoredWithdrawalPlan,
  items: Record<string, unknown>[],
): AssetControlledRemovalPlan {
  if (
    !header ||
    !isAssetStorageId(header.id) ||
    !Number.isSafeInteger(header.generation) ||
    header.generation < 1 ||
    !['pending', 'complete'].includes(header.status) ||
    !header.itemCounts ||
    items.length > 50000
  )
    throw new AssetAccessError('integrity', 'Invalid controlled withdrawal header.');
  const references: AssetRevisionReference[] = [],
    files: AssetObjectLocation[] = [],
    keptShared: ArtifactReference[] = [];
  for (const item of items) {
    if (item['plan_id'] !== header.id) throw new AssetAccessError('integrity');
    const value = JSON.parse(String(item['payload'])) as unknown;
    let identity: string;
    if (item['kind'] === 'reference') {
      assertAssetRevisionReference(value);
      references.push(value);
      identity = revisionChecksumKey(value);
    } else if (item['kind'] === 'location') {
      const file = value as AssetObjectLocation;
      assertArtifactReference(file.reference);
      assertAssetPhysicalLocation(file, file.reference);
      if (!['runtime', 'art-studies'].includes(file.reference.boundary))
        throw new AssetAccessError('integrity');
      files.push(file);
      identity = JSON.stringify([
        artifactReferenceKey(file.reference),
        assetPhysicalKey(file, file.key),
      ]);
    } else if (item['kind'] === 'preserved') {
      assertArtifactReference(value);
      keptShared.push(value);
      identity = artifactReferenceKey(value);
    } else throw new AssetAccessError('integrity');
    if (identity !== item['identity']) throw new AssetAccessError('integrity');
  }
  if (
    references.length !== header.itemCounts.references ||
    files.length !== header.itemCounts.files ||
    keptShared.length !== header.itemCounts.keptShared ||
    references.length > 10000 ||
    files.length > 20000 ||
    keptShared.length > 20000
  )
    throw new AssetAccessError('integrity', 'Controlled withdrawal item coverage is incomplete.');
  if (
    header.cachePurge &&
    (header.cachePurge.completed !== true ||
      !header.cachePurge.receipt ||
      header.cachePurge.receipt.length > 16384)
  )
    throw new AssetAccessError('integrity');
  return {
    id: header.id,
    generation: header.generation,
    status: header.status,
    references,
    files,
    keptShared,
    ...(header.cachePurge ? { cachePurge: header.cachePurge } : {}),
  };
}
export function assertAssetPhysicalLocation(
  value: AssetPhysicalLocation,
  reference: ArtifactReference,
): void {
  if (
    !isAssetStorageIdentity(value) ||
    !isArtifactObjectKey(reference, value.key) ||
    typeof value.versionId !== 'string' ||
    !value.versionId ||
    Buffer.byteLength(value.versionId) > 1024
  )
    throw new AssetAccessError(
      'integrity',
      'Exact physical transfer location/version is missing or invalid.',
    );
}
function assertInput(input: AssetPublicationInput): void {
  if (!isAssetStorageIdentity(input.storage) || Object.keys(input.storage).length !== 3)
    throw new AssetAccessError(
      'integrity',
      'Publication requires its verified physical destination.',
    );
  for (const [boundary, storage] of Object.entries(input.dependencyStorage ?? {}))
    if (
      !ARTIFACT_BOUNDARIES.includes(boundary as ArtifactBoundary) ||
      boundary === input.destination.boundary ||
      !isAssetStorageIdentity(storage) ||
      Object.keys(storage).length !== 3
    )
      throw new AssetAccessError('integrity', 'Invalid required-dependency deployment mapping.');
  if (
    !isAssetStorageId(input.operationId) ||
    !input.principal.accountId ||
    !input.configurationRevision
  )
    throw new AssetAccessError('integrity', 'Publication identity/configuration is missing.');
  assertDomain(input.destination);
  assertAssetRevisionReference(input.reference);
  assertArtifactReference(input.manifestArtifact);
  const manifest: unknown = JSON.parse(input.manifestText);
  assertAssetManifest(manifest);
  if (
    sha(input.manifestText) !== input.reference.manifestSha256 ||
    assetRevisionKey(manifest.identity) !== assetRevisionKey(input.reference) ||
    input.manifestArtifact.sha256 !== input.reference.manifestSha256 ||
    input.manifestArtifact.bytes !== Buffer.byteLength(input.manifestText) ||
    input.manifestArtifact.mediaType !== 'application/json'
  )
    throw new AssetAccessError(
      'integrity',
      'Publication manifest identity or exact bytes disagree.',
    );
  if (input.destination.visibility === 'public' && !input.publicProjectionReviewed)
    throw new AssetAccessError(
      'forbidden',
      'Public asset metadata requires an explicit reviewed projection.',
    );
  const allFiles = [...input.files, input.manifestArtifact];
  const unique = new Map<string, ArtifactReference>();
  for (const file of allFiles) {
    assertArtifactReference(file);
    if (
      file.boundary !== input.destination.boundary ||
      file.accessDomain !== input.destination.accessDomain
    )
      throw new AssetAccessError(
        'integrity',
        'Publication outputs cross their admitted destination.',
      );
    const key = artifactReferenceKey(file),
      prior = unique.get(key);
    if (prior && !sameArtifact(prior, file))
      throw new AssetAccessError('integrity', 'Conflicting immutable file metadata.');
    unique.set(key, file);
  }
  for (const file of Object.values(manifest.files)) {
    const admitted = unique.get(artifactReferenceKey(file));
    if (!admitted || !sameArtifact(admitted, file))
      throw new AssetAccessError('integrity', 'Manifest names an unclaimed file.');
  }
  const manifestFileKeys = new Set(Object.values(manifest.files).map(artifactReferenceKey));
  if (input.files.some((file) => !manifestFileKeys.has(artifactReferenceKey(file))))
    throw new AssetAccessError(
      'integrity',
      'Publication claims a file outside its rights-reviewed manifest.',
    );
  const namedKeys = new Set<string>();
  const namedByArtifact = new Map<string, string[]>();
  for (const target of input.namedFiles ?? []) {
    const admitted = unique.get(artifactReferenceKey(target.reference));
    if (
      !admitted ||
      !sameArtifact(admitted, target.reference) ||
      !isArtifactObjectKey(target.reference, target.key) ||
      Buffer.byteLength(target.key) > 512 ||
      namedKeys.has(target.key)
    )
      throw new AssetAccessError(
        'integrity',
        'Named delivery targets must be unique and match exact admitted files.',
      );
    namedKeys.add(target.key);
    const key = artifactReferenceKey(target.reference);
    const names = namedByArtifact.get(key) ?? [];
    names.push(target.key);
    namedByArtifact.set(key, names);
  }
  for (const dependency of input.dependencies) assertAssetRevisionReference(dependency);
  const dependencyKeys = new Set(input.dependencies.map(revisionChecksumKey));
  if (
    input.dependencies.some(
      (dependency) => assetRevisionKey(dependency) === assetRevisionKey(input.reference),
    ) ||
    manifest.dependencies.some((dependency) => !dependencyKeys.has(revisionChecksumKey(dependency)))
  )
    throw new AssetAccessError(
      'integrity',
      'Publication dependency coverage disagrees with its manifest.',
    );
  if (
    input.selection &&
    (!input.selection.key ||
      input.selection.key.length > 1024 ||
      !Number.isSafeInteger(input.selection.expectedRevision) ||
      input.selection.expectedRevision < 0)
  )
    throw new AssetAccessError('integrity', 'Invalid expected asset selection.');
  // Durable authority must fit its existing streaming recovery codec. The same
  // immutable manifest appears in compact operation/revision records, so its input
  // byte allowance alone does not establish the size of the encoded SQL row.
  const admission = {
    destination: input.destination,
    reference: input.reference,
    dependencies: input.dependencies,
    storage: input.storage,
  };
  const operation: AssetOperation = {
    id: input.operationId,
    principalId: input.principal.accountId,
    generation: Number.MAX_SAFE_INTEGER,
    status: 'committed',
    fingerprint: 'f'.repeat(64),
    input,
    outcome: {
      operationId: input.operationId,
      reference: input.reference,
      manifestArtifact: input.manifestArtifact,
      selectionRevision: Number.MAX_SAFE_INTEGER,
    },
  };
  const value: StoredAssetRevision = {
    reference: input.reference,
    destination: input.destination,
    manifestArtifact: input.manifestArtifact,
    manifestText: input.manifestText,
    manifest,
  };
  const encodedRows = [
    {
      table: 'asset_operations',
      row: {
        id: operation.id,
        principal_id: operation.principalId,
        fingerprint: operation.fingerprint,
        generation: String(Number.MAX_SAFE_INTEGER),
        status: operation.status,
        created_at: String(Number.MAX_SAFE_INTEGER),
        admission: JSON.stringify(admission),
        payload: JSON.stringify(operation),
      },
    },
    {
      table: 'asset_revisions',
      row: {
        revision_key: assetRevisionKey(input.reference),
        manifest_sha256: input.reference.manifestSha256,
        boundary: input.destination.boundary,
        access_domain: input.destination.accessDomain,
        owner_kind: input.reference.owner.kind,
        owner_id: input.reference.owner.id,
        asset_id: input.reference.assetId,
        revision_id: input.reference.revisionId,
        created_at: String(Number.MAX_SAFE_INTEGER),
        payload: JSON.stringify(value),
      },
    },
  ];
  if (
    encodedRows.some(
      (row) => Buffer.byteLength(JSON.stringify(row)) + 1 > CHECKPOINT_LIMITS.rowBytes,
    )
  )
    throw new AssetAccessError(
      'integrity',
      'Asset metadata exceeds the recoverable SQL record allowance.',
    );
  // One file can have many named aliases. Reserve its complete receipt before
  // transfer, including S3's maximum 1,024-byte opaque version identifiers and
  // worst JSON escaping. Operation-row sizing alone does not bound this record.
  const versionId = '\u0001'.repeat(1024);
  for (const [key, reference] of unique) {
    const receipt: AssetTransferReceipt = {
      reference,
      fullFileSha256: reference.sha256,
      bytes: reference.bytes,
      mediaType: reference.mediaType,
      location: { ...input.storage, key: artifactKey(reference), versionId },
      verifiedAt: '9999-12-31T23:59:59.999Z',
      reason: 'boundary-copy',
      source: reference,
      locations: [],
    };
    let rowBytes = transferRowBytes(input.operationId, receipt) + 4096;
    let names = 0;
    for (const name of namedByArtifact.get(key) ?? []) {
      if (rowBytes > CHECKPOINT_LIMITS.rowBytes) break;
      const location = { ...input.storage, key: name, versionId, sourceVersionId: versionId };
      // Locations sit inside the receipt's JSON string in the SQL-row JSON.
      // Count one doubly escaped member at a time, without building a huge row.
      rowBytes +=
        Buffer.byteLength(JSON.stringify(JSON.stringify(location))) - 2 + (names++ ? 1 : 0);
    }
    if (rowBytes > CHECKPOINT_LIMITS.rowBytes)
      throw new AssetAccessError(
        'integrity',
        'One file has more named delivery targets than its recoverable receipt can hold.',
      );
  }
}

function transferRowBytes(operationId: string, receipt: AssetTransferReceipt): number {
  return (
    Buffer.byteLength(
      JSON.stringify({
        table: 'asset_transfers',
        row: {
          operation_id: operationId,
          artifact_key: artifactReferenceKey(receipt.reference),
          payload: JSON.stringify(receipt),
        },
      }),
    ) + 1
  );
}

/** One SQL owner for publication, current rights and retention. Byte transfer happens
 * outside its transactions; S3 objects and exports cannot select or authorize content. */
export class AssetRepository {
  constructor(readonly db: SqlDatabase) {}
  private changedAuthority(): void {
    const invalidate = () => {
      const cache = assetReadScopes(this.db);
      cache.generation++;
      cache.entries.clear();
      deliveryScopes.delete(this.db);
      for (const listener of cache.listeners) listener();
    };
    if (this.db.afterCommit) this.db.afterCommit(invalidate);
    else invalidate();
  }
  get projectionGeneration(): number {
    return assetReadScopes(this.db).generation;
  }
  subscribeAuthority(listener: () => void): () => void {
    const listeners = assetReadScopes(this.db).listeners;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
  async initialize(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS asset_domains (
        boundary TEXT NOT NULL, access_domain TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(boundary,access_domain));
      CREATE TABLE IF NOT EXISTS asset_grants (
        boundary TEXT NOT NULL, access_domain TEXT NOT NULL, account_id TEXT NOT NULL,
        revision BIGINT NOT NULL, permissions TEXT NOT NULL,
        PRIMARY KEY(boundary,access_domain,account_id));
      CREATE TABLE IF NOT EXISTS asset_rights (
        revision_key TEXT PRIMARY KEY, manifest_sha256 TEXT NOT NULL,
        boundary TEXT NOT NULL, access_domain TEXT NOT NULL, revision BIGINT NOT NULL,
        payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS asset_revisions (
        revision_key TEXT PRIMARY KEY, manifest_sha256 TEXT NOT NULL,
        boundary TEXT NOT NULL, access_domain TEXT NOT NULL,
        owner_kind TEXT NOT NULL, owner_id TEXT NOT NULL, asset_id TEXT NOT NULL,
        revision_id TEXT NOT NULL, created_at BIGINT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS asset_owner_browse
        ON asset_revisions(boundary,access_domain,owner_kind,owner_id,asset_id,revision_id);
      CREATE TABLE IF NOT EXISTS asset_revision_files (
        revision_key TEXT NOT NULL, artifact_key TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(revision_key,artifact_key));
      CREATE INDEX IF NOT EXISTS asset_revision_file_reverse ON asset_revision_files(artifact_key,revision_key);
      CREATE TABLE IF NOT EXISTS asset_dependencies (
        parent_key TEXT NOT NULL, child_key TEXT NOT NULL, child_sha256 TEXT NOT NULL,
        PRIMARY KEY(parent_key,child_key));
      CREATE INDEX IF NOT EXISTS asset_reverse_dependency ON asset_dependencies(child_key,parent_key);
      CREATE TABLE IF NOT EXISTS asset_operations (
        id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, fingerprint TEXT NOT NULL,
        generation BIGINT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL, admission TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS asset_operation_recovery ON asset_operations(principal_id,status,id);
      CREATE INDEX IF NOT EXISTS asset_dependency_publication_storage
        ON asset_operations ((admission::jsonb->'reference'),(admission::jsonb->'storage'))
        WHERE status='committed';
      CREATE TABLE IF NOT EXISTS asset_claims (
        operation_id TEXT NOT NULL, artifact_key TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(operation_id,artifact_key));
      CREATE INDEX IF NOT EXISTS asset_claim_reverse ON asset_claims(artifact_key,operation_id);
      CREATE TABLE IF NOT EXISTS asset_claim_references (
        operation_id TEXT NOT NULL, reference_key TEXT NOT NULL, physical_key TEXT NOT NULL,
        PRIMARY KEY(operation_id,reference_key,physical_key));
      CREATE INDEX IF NOT EXISTS asset_claim_reference_reverse ON asset_claim_references(reference_key,operation_id);
      CREATE TABLE IF NOT EXISTS asset_named_targets (
        operation_id TEXT NOT NULL, artifact_key TEXT NOT NULL, object_key TEXT NOT NULL,
        PRIMARY KEY(operation_id,artifact_key,object_key));
      CREATE INDEX IF NOT EXISTS asset_named_reverse ON asset_named_targets(object_key,operation_id);
      CREATE TABLE IF NOT EXISTS asset_transfers (
        operation_id TEXT NOT NULL, artifact_key TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(operation_id,artifact_key));
      CREATE TABLE IF NOT EXISTS asset_selections (
        selection_key TEXT PRIMARY KEY, revision BIGINT NOT NULL, revision_key TEXT NOT NULL,
        manifest_sha256 TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS asset_selection_reverse ON asset_selections(revision_key,selection_key);
      CREATE TABLE IF NOT EXISTS asset_save_claims (
        world_id TEXT NOT NULL, save_id TEXT NOT NULL, expected_revision BIGINT NOT NULL,
        status TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,save_id));
      CREATE TABLE IF NOT EXISTS asset_world_bindings (
        world_id TEXT PRIMARY KEY, revision_key TEXT NOT NULL, manifest_sha256 TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS asset_pins (
        owner_kind TEXT NOT NULL, owner_id TEXT NOT NULL, revision_key TEXT NOT NULL,
        manifest_sha256 TEXT NOT NULL, PRIMARY KEY(owner_kind,owner_id,revision_key));
      CREATE INDEX IF NOT EXISTS asset_pin_reverse ON asset_pins(revision_key,owner_kind,owner_id);
      CREATE TABLE IF NOT EXISTS asset_pin_files (
        owner_kind TEXT NOT NULL, owner_id TEXT NOT NULL, artifact_key TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(owner_kind,owner_id,artifact_key));
      CREATE INDEX IF NOT EXISTS asset_pin_file_reverse ON asset_pin_files(artifact_key,owner_kind,owner_id);
      CREATE TABLE IF NOT EXISTS asset_restrictions (
        kind TEXT NOT NULL, subject_key TEXT NOT NULL, generation BIGINT NOT NULL,
        recorded_at BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(kind,subject_key));
      CREATE TABLE IF NOT EXISTS asset_authority (id TEXT PRIMARY KEY, generation BIGINT NOT NULL, complete BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS asset_authority_operations (
        account_id TEXT NOT NULL, operation_id TEXT NOT NULL, fingerprint TEXT NOT NULL,
        generation BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(account_id,operation_id));
      CREATE TABLE IF NOT EXISTS asset_delivery_removals (
        artifact_key TEXT PRIMARY KEY,plan_id TEXT NOT NULL,generation BIGINT NOT NULL,status TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS asset_removal_plan ON asset_delivery_removals(plan_id,artifact_key);
      CREATE TABLE IF NOT EXISTS asset_withdrawal_plans (
        id TEXT PRIMARY KEY,principal_id TEXT NOT NULL,fingerprint TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS asset_withdrawal_items (
        plan_id TEXT NOT NULL,kind TEXT NOT NULL,identity TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(plan_id,kind,identity));
      CREATE TABLE IF NOT EXISTS asset_removal_receipts (
        plan_id TEXT NOT NULL,location_key TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(plan_id,location_key));
    `);
  }
  /** Trusted deployment bootstrap only. Existing grants/revocations are never reseeded. */
  async initializeDomain(domain: AssetDomain, initialOperatorAccountId: string): Promise<void> {
    assertDomain(domain);
    if (!initialOperatorAccountId) throw new AssetAccessError('forbidden');
    await this.db.transaction(async () => {
      const existing = await this.domain(domain.boundary, domain.accessDomain);
      if (existing) {
        if (
          existing.boundary !== domain.boundary ||
          existing.accessDomain !== domain.accessDomain ||
          existing.visibility !== domain.visibility
        )
          throw new AssetAccessError('conflict');
        return;
      }
      await this.db
        .prepare("INSERT INTO asset_authority VALUES ('current',0,1) ON CONFLICT(id) DO NOTHING")
        .run();
      await this.db
        .prepare('INSERT INTO asset_domains VALUES (?,?,?)')
        .run(domain.boundary, domain.accessDomain, JSON.stringify(domain));
      await this.db
        .prepare('INSERT INTO asset_grants VALUES (?,?,?,?,?)')
        .run(
          domain.boundary,
          domain.accessDomain,
          initialOperatorAccountId,
          1,
          JSON.stringify(permissions),
        );
      await this.advanceAuthority();
    });
  }
  async domain(boundary: ArtifactBoundary, accessDomain: string): Promise<AssetDomain | undefined> {
    return parse<AssetDomain>(
      await this.db
        .prepare('SELECT payload FROM asset_domains WHERE boundary=? AND access_domain=?')
        .get(boundary, accessDomain),
    );
  }
  private async assertPrincipal(principal: AssetPrincipal): Promise<void> {
    if (!principal.accountId) throw new AssetAccessError('forbidden');
    if (principal.session) {
      const session = await this.db
        .prepare('SELECT account_id,revision,expires_at FROM auth_sessions WHERE id=?')
        .get(principal.session.id);
      if (
        !session ||
        session['account_id'] !== principal.accountId ||
        Number(session['revision']) !== principal.session.revision ||
        Number(session['expires_at']) <= Date.now()
      )
        throw new AssetAccessError('forbidden');
    }
  }
  private async assertAuthority(): Promise<void> {
    const row = await this.db
      .prepare("SELECT complete FROM asset_authority WHERE id='current'")
      .get();
    if (Number(row?.['complete']) !== 1)
      throw new AssetAccessError(
        'unavailable',
        'Current asset restrictions are unavailable; delivery remains blocked.',
      );
  }
  private async advanceAuthority(): Promise<number> {
    const row = await this.db
      .prepare(
        "UPDATE asset_authority SET generation=generation+1 WHERE id='current' RETURNING generation",
      )
      .get();
    const generation = Number(row?.['generation']);
    if (!Number.isSafeInteger(generation) || generation < 1)
      throw new AssetAccessError('integrity');
    this.changedAuthority();
    return generation;
  }
  async assertPermission(
    principal: AssetPrincipal | undefined,
    domain: AssetDomain,
    permission: AssetPermission,
  ): Promise<void> {
    await this.assertAuthority();
    const configured = await this.domain(domain.boundary, domain.accessDomain);
    if (!configured || configured.visibility !== domain.visibility)
      throw new AssetAccessError('unavailable');
    if (permission === 'read' && configured.visibility === 'public') return;
    if (!principal) throw new AssetAccessError('unavailable');
    await this.assertPrincipal(principal);
    const row = await this.db
      .prepare(
        'SELECT permissions FROM asset_grants WHERE boundary=? AND access_domain=? AND account_id=?',
      )
      .get(domain.boundary, domain.accessDomain, principal.accountId);
    const allowed = parse<AssetPermission[]>(row, 'permissions');
    if (!allowed?.includes(permission)) throw new AssetAccessError('unavailable');
  }
  async setGrant(
    operator: AssetPrincipal,
    domain: AssetDomain,
    accountId: string,
    allowed: readonly AssetPermission[],
    expectedRevision: number,
  ): Promise<number> {
    if (
      !accountId ||
      allowed.some((permission) => !permissions.includes(permission)) ||
      new Set(allowed).size !== allowed.length
    )
      throw new AssetAccessError('integrity');
    return this.db.transaction(async () => {
      await this.assertPermission(operator, domain, 'manage');
      const prior = await this.db
        .prepare(
          'SELECT revision FROM asset_grants WHERE boundary=? AND access_domain=? AND account_id=?',
        )
        .get(domain.boundary, domain.accessDomain, accountId);
      if (Number(prior?.['revision'] ?? 0) !== expectedRevision)
        throw new AssetAccessError('conflict');
      const revision = expectedRevision + 1;
      await this.db
        .prepare(
          `INSERT INTO asset_grants VALUES (?,?,?,?,?) ON CONFLICT(boundary,access_domain,account_id)
        DO UPDATE SET revision=excluded.revision,permissions=excluded.permissions`,
        )
        .run(domain.boundary, domain.accessDomain, accountId, revision, JSON.stringify(allowed));
      await this.advanceAuthority();
      return revision;
    });
  }
  async approveRights(
    operator: AssetPrincipal,
    input: {
      reference: AssetRevisionReference;
      domain: AssetDomain;
      uses: readonly AssetUse[];
      evidence: readonly string[];
    },
    expectedRevision = 0,
  ): Promise<number> {
    assertAssetRevisionReference(input.reference);
    if (
      input.uses.some((use) => !uses.includes(use)) ||
      !input.evidence.length ||
      input.evidence.some((entry) => !entry || entry.length > 2048)
    )
      throw new AssetAccessError('integrity');
    return this.db.transaction(async () => {
      await this.assertPermission(operator, input.domain, 'manage');
      const key = assetRevisionKey(input.reference);
      const prior = await this.db
        .prepare(
          'SELECT revision,manifest_sha256,boundary,access_domain FROM asset_rights WHERE revision_key=?',
        )
        .get(key);
      const changingDomain =
        !!prior &&
        (prior['boundary'] !== input.domain.boundary ||
          prior['access_domain'] !== input.domain.accessDomain);
      if (
        Number(prior?.['revision'] ?? 0) !== expectedRevision ||
        (prior && prior['manifest_sha256'] !== input.reference.manifestSha256)
      )
        throw new AssetAccessError('conflict');
      if (changingDomain) {
        const previous = await this.domain(
          prior!['boundary'] as ArtifactBoundary,
          String(prior!['access_domain']),
        );
        if (!previous) throw new AssetAccessError('integrity');
        await this.assertPermission(operator, previous, 'manage');
        if (
          (await this.db
            .prepare('SELECT revision_key FROM asset_revisions WHERE revision_key=?')
            .get(key)) ||
          (await this.db
            .prepare(
              "SELECT id FROM asset_operations WHERE admission::jsonb->'reference'=?::jsonb LIMIT 1",
            )
            .get(JSON.stringify(input.reference)))
        )
          throw new AssetAccessError(
            'conflict',
            'An admitted or published asset cannot change its approved storage boundary.',
          );
      }
      const revision = expectedRevision + 1;
      await this.db
        .prepare(
          `INSERT INTO asset_rights VALUES (?,?,?,?,?,?) ON CONFLICT(revision_key)
        DO UPDATE SET revision=excluded.revision,payload=excluded.payload,boundary=excluded.boundary,access_domain=excluded.access_domain`,
        )
        .run(
          key,
          input.reference.manifestSha256,
          input.domain.boundary,
          input.domain.accessDomain,
          revision,
          JSON.stringify({ uses: input.uses, evidence: input.evidence }),
        );
      await this.advanceAuthority();
      return revision;
    });
  }
  private async assertUnrestricted(
    reference: AssetRevisionReference,
    files: readonly ArtifactReference[] = [],
  ): Promise<void> {
    const restriction = await this.db
      .prepare(
        `SELECT subject_key FROM asset_restrictions
      WHERE (kind='revision' AND subject_key=?) OR (kind='artifact' AND subject_key=ANY(?::text[])) LIMIT 1`,
      )
      .get(revisionChecksumKey(reference), files.map(artifactReferenceKey));
    if (restriction) throw new AssetAccessError('unavailable');
    if (
      files.length &&
      (await this.db
        .prepare(
          `SELECT artifact_key FROM asset_delivery_removals
      WHERE status='pending' AND artifact_key=ANY(?::text[]) LIMIT 1`,
        )
        .get(files.map(artifactReferenceKey)))
    )
      throw new AssetAccessError('unavailable', 'Controlled asset delivery is being withdrawn.');
  }
  private async assertRights(reference: AssetRevisionReference, use: AssetUse): Promise<void> {
    await this.assertUnrestricted(reference);
    const row = await this.db
      .prepare('SELECT manifest_sha256,payload FROM asset_rights WHERE revision_key=?')
      .get(assetRevisionKey(reference));
    const right = parse<{ uses: AssetUse[] }>(row);
    if (!row || row['manifest_sha256'] !== reference.manifestSha256 || !right?.uses.includes(use))
      throw new AssetAccessError('unavailable');
  }
  private async storedRevision(reference: AssetRevisionReference): Promise<StoredAssetRevision> {
    assertAssetRevisionReference(reference);
    const record = parse<StoredAssetRevision>(
      await this.db
        .prepare('SELECT payload FROM asset_revisions WHERE revision_key=? AND manifest_sha256=?')
        .get(assetRevisionKey(reference), reference.manifestSha256),
    );
    if (!record) throw new AssetAccessError('unavailable', 'The exact asset revision is unknown.');
    return record;
  }
  private async permitRevision(
    record: StoredAssetRevision,
    principal: AssetPrincipal | undefined,
    use: AssetUse,
  ): Promise<void> {
    await this.assertPermission(principal, record.destination, 'read');
    await this.assertUnrestricted(record.reference, [
      ...Object.values(record.manifest.files),
      record.manifestArtifact,
    ]);
    await this.assertRights(record.reference, use);
  }
  private async readRevision(
    reference: AssetRevisionReference,
    principal?: AssetPrincipal,
  ): Promise<StoredAssetRevision> {
    const record = await this.storedRevision(reference);
    await this.permitRevision(record, principal, publicationUse(record.destination));
    return record;
  }
  private async revisionClosure(
    reference: AssetRevisionReference,
  ): Promise<{ record: StoredAssetRevision; dependencies: StoredAssetRevision[] }> {
    const record = await this.storedRevision(reference);
    const rows = await this.db
      .prepare(
        `SELECT r.payload,d.child_sha256 FROM asset_dependencies d
      LEFT JOIN asset_revisions r ON r.revision_key=d.child_key WHERE d.parent_key=? ORDER BY d.child_key LIMIT 10001`,
      )
      .all(assetRevisionKey(reference));
    if (rows.length > 10000)
      throw new AssetAccessError('integrity', 'Asset dependency closure exceeds its allowance.');
    const dependencies: StoredAssetRevision[] = [],
      known = new Map<string, StoredAssetRevision>();
    for (const row of rows) {
      if (typeof row['payload'] !== 'string')
        throw new AssetAccessError(
          'integrity',
          'Asset dependency is missing its immutable revision.',
        );
      const child = parse<StoredAssetRevision>(row)!;
      if (child.reference.manifestSha256 !== row['child_sha256'])
        throw new AssetAccessError('integrity');
      dependencies.push(child);
      known.set(assetRevisionKey(child.reference), child);
    }
    for (const child of [record, ...dependencies])
      for (const required of child.manifest.dependencies)
        if (!sameAssetRevision(known.get(assetRevisionKey(required))?.reference, required))
          throw new AssetAccessError('integrity', 'Asset dependency closure is incomplete.');
    // Imported normalized rows must describe an acyclic exact graph too. An
    // iterative walk bounds work and cannot overflow the JavaScript call stack.
    const stack = [{ record, index: 0 }],
      active = new Set([assetRevisionKey(reference)]),
      done = new Set<string>();
    let edges = 0;
    while (stack.length) {
      const frame = stack.at(-1)!,
        key = assetRevisionKey(frame.record.reference);
      const next = frame.record.manifest.dependencies[frame.index++];
      if (!next) {
        active.delete(key);
        done.add(key);
        stack.pop();
        continue;
      }
      if (++edges > 100000)
        throw new AssetAccessError(
          'integrity',
          'Asset dependency traversal exceeds its allowance.',
        );
      const nextKey = assetRevisionKey(next);
      if (active.has(nextKey)) throw new AssetAccessError('integrity', 'Asset dependency cycle.');
      if (!done.has(nextKey)) {
        active.add(nextKey);
        stack.push({ record: known.get(nextKey)!, index: 0 });
      }
    }
    return { record, dependencies };
  }
  async revision(
    reference: AssetRevisionReference,
    principal?: AssetPrincipal,
  ): Promise<StoredAssetRevision> {
    const closure = await this.revisionClosure(reference),
      use = publicationUse(closure.record.destination);
    for (const record of [closure.record, ...closure.dependencies])
      await this.permitRevision(record, principal, use);
    return closure.record;
  }
  /** Retaining a known unavailable picture never grants delivery. Native depiction
   * can continue through licensing/grant changes; unknown authority stays blocked. */
  async retainedReleaseStatus(
    reference: AssetRevisionReference,
    principal: AssetPrincipal,
  ): Promise<{ record: StoredAssetRevision; available: boolean }> {
    await this.assertAuthority();
    const closure = await this.revisionClosure(reference);
    if (
      closure.record.manifest.kind !== 'release' ||
      closure.record.destination.boundary !== 'runtime'
    )
      throw new AssetAccessError('integrity', 'The retained binding is not a runtime release.');
    try {
      for (const record of [closure.record, ...closure.dependencies])
        await this.permitRevision(record, principal, publicationUse(closure.record.destination));
      return { record: closure.record, available: true };
    } catch (error) {
      if (!(error instanceof AssetAccessError && error.code === 'unavailable')) throw error;
      await this.assertAuthority();
      return { record: closure.record, available: false };
    }
  }
  /** The publication compiler visits each required revision itself. Revalidating a
   * flattened descendant set on every visit would make a shared graph quadratic. */
  async dependencyRevision(
    reference: AssetRevisionReference,
    principal: AssetPrincipal,
  ): Promise<StoredAssetRevision> {
    return this.readRevision(reference, principal);
  }
  /** Exact selected-file admission for CLI and HTTP. One immutable closure is shared
   * within a current SQL authority generation; each call checks that generation so a
   * read-only process cannot miss a grant change committed by the game writer. */
  async authorizeArtifact(
    principal: AssetPrincipal | undefined,
    release: AssetRevisionReference,
    reference: ArtifactReference,
    use: 'read' | 'offline' = 'read',
  ): Promise<void> {
    assertAssetRevisionReference(release);
    assertArtifactReference(reference);
    if (principal) await this.assertPrincipal(principal);
    const authority = await this.db
      .prepare("SELECT generation,complete FROM asset_authority WHERE id='current'")
      .get();
    if (Number(authority?.['complete']) !== 1) throw new AssetAccessError('unavailable');
    const generation = Number(authority?.['generation']);
    const key = JSON.stringify([
      assetRevisionKey(release),
      release.manifestSha256,
      principal?.accountId ?? null,
      use,
      generation,
    ]);
    let cache = deliveryScopes.get(this.db);
    if (!cache) {
      cache = new Map();
      deliveryScopes.set(this.db, cache);
    }
    // Never retain permission obtained from an uncommitted write snapshot: its
    // generation can be rolled back and reused by a different later mutation.
    const reusable = this.db.transactionActive === false;
    let ready = reusable ? cache.get(key) : undefined;
    if (!ready) {
      const read = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
      ready = read(async () => {
        const current = await this.db
          .prepare("SELECT generation,complete FROM asset_authority WHERE id='current'")
          .get();
        if (Number(current?.['complete']) !== 1 || Number(current?.['generation']) !== generation)
          throw new AssetAccessError('unavailable');
        const root = await this.revision(release, principal);
        if (use === 'offline') {
          await this.assertPermission(principal, root.destination, 'offline');
          await this.assertRights(release, 'offline');
          const children = await this.db
            .prepare(
              `SELECT r.payload FROM asset_dependencies d JOIN asset_revisions r
            ON r.revision_key=d.child_key WHERE d.parent_key=? ORDER BY d.child_key LIMIT 10001`,
            )
            .all(assetRevisionKey(release));
          if (children.length > 10000) throw new AssetAccessError('unavailable');
          for (const row of children) {
            const child = parse<StoredAssetRevision>(row)!;
            await this.assertPermission(principal, child.destination, 'offline');
            await this.assertRights(child.reference, 'offline');
          }
        }
        const rows = await this.db
          .prepare(
            `SELECT f.payload FROM asset_revision_files f
          WHERE f.revision_key=? OR f.revision_key IN (SELECT child_key FROM asset_dependencies WHERE parent_key=?)
          ORDER BY f.revision_key,f.artifact_key LIMIT 20001`,
          )
          .all(assetRevisionKey(release), assetRevisionKey(release));
        if (rows.length > 20000)
          throw new AssetAccessError(
            'unavailable',
            'Selected delivery closure exceeds its file allowance.',
          );
        const members = new Map<string, ArtifactReference>();
        for (const row of rows) {
          const file = parse<ArtifactReference>(row)!;
          const prior = members.get(artifactReferenceKey(file));
          if (prior && !sameArtifact(prior, file)) throw new AssetAccessError('integrity');
          members.set(artifactReferenceKey(file), file);
        }
        return members;
      });
      if (reusable) {
        if (cache.size >= 8) cache.delete(cache.keys().next().value!);
        cache.set(key, ready);
        void ready.catch(() => {
          if (cache.get(key) === ready) cache.delete(key);
        });
      }
    }
    const actual = (await ready).get(artifactReferenceKey(reference));
    if (!actual || !sameArtifact(actual, reference)) throw new AssetAccessError('unavailable');
    const current = await this.db
      .prepare("SELECT generation,complete FROM asset_authority WHERE id='current'")
      .get();
    if (Number(current?.['complete']) !== 1 || Number(current?.['generation']) !== generation)
      throw new AssetAccessError('unavailable');
  }
  /** Projection-only reuse. Scope/session admission still belongs to the caller;
   * publication and actual byte delivery never use this cached permission result. */
  async mayRead(reference: AssetRevisionReference, principal?: AssetPrincipal): Promise<boolean> {
    const cache = assetReadScopes(this.db);
    const key = JSON.stringify([
      assetRevisionKey(reference),
      reference.manifestSha256,
      principal?.accountId ?? null,
    ]);
    const generation = cache.generation;
    const prior = cache.entries.get(key);
    if (prior) return prior.then((allowed) => generation === cache.generation && allowed);
    const result = this.revision(reference, principal)
      .then(
        () => true,
        (error: unknown) => {
          if (
            error instanceof AssetAccessError &&
            ['unavailable', 'forbidden'].includes(error.code)
          )
            return false;
          throw error;
        },
      )
      .then((allowed) => generation === cache.generation && allowed);
    if (cache.entries.size >= 1024) cache.entries.delete(cache.entries.keys().next().value!);
    cache.entries.set(key, result);
    void result.catch(() => {
      if (cache.entries.get(key) === result) cache.entries.delete(key);
    });
    return result;
  }
  private async assertPublication(input: AssetPublicationInput): Promise<void> {
    await this.assertPermission(input.principal, input.destination, 'publish');
    const use = publicationUse(input.destination);
    await this.assertRights(input.reference, use);
    await this.assertUnrestricted(input.reference, [...input.files, input.manifestArtifact]);
    const mappedBoundaries = new Set<ArtifactBoundary>();
    for (const dependency of input.dependencies) {
      const record = await this.readRevision(dependency, input.principal);
      await this.assertRights(dependency, use);
      if (input.destination.visibility === 'public' && record.destination.visibility !== 'public')
        throw new AssetAccessError(
          'forbidden',
          'Private asset identities cannot enter a public manifest.',
        );
      const boundary = record.destination.boundary;
      const storage =
        boundary === input.destination.boundary
          ? input.storage
          : input.dependencyStorage?.[boundary];
      if (!storage)
        throw new AssetAccessError(
          'integrity',
          'A required dependency needs an explicit deployment mapping for its storage boundary.',
        );
      if (boundary !== input.destination.boundary) mappedBoundaries.add(boundary);
      // Logical existence in another environment cannot prove this deployment
      // holds the complete verified child publication. Reuse its committed receipt.
      if (
        !(await this.db
          .prepare(
            `SELECT 1 AS present FROM asset_operations WHERE status='committed'
             AND admission::jsonb->'reference'=?::jsonb
             AND admission::jsonb->'storage'=?::jsonb LIMIT 1`,
          )
          .get(JSON.stringify(record.reference), JSON.stringify(storage)))
      )
        throw new AssetAccessError(
          'unavailable',
          'Publish every required dependency into this deployment before publishing its parent.',
        );
    }
    if (
      Object.keys(input.dependencyStorage ?? {}).some(
        (boundary) => !mappedBoundaries.has(boundary as ArtifactBoundary),
      )
    )
      throw new AssetAccessError(
        'integrity',
        'The dependency deployment mapping contains unused boundaries.',
      );
  }
  async operation(id: string, principal: AssetPrincipal): Promise<AssetOperation | undefined> {
    await this.assertPrincipal(principal);
    const operation = parse<AssetOperation>(
      await this.db
        .prepare('SELECT payload FROM asset_operations WHERE id=? AND principal_id=?')
        .get(id, principal.accountId),
    );
    if (operation)
      await this.assertPermission(
        principal,
        operation.input.destination,
        operation.status === 'committed' ? 'read' : 'publish',
      );
    return operation;
  }
  async admit(input: AssetPublicationInput, limits: AssetRetentionLimits): Promise<AssetOperation> {
    for (const limit of Object.values(limits))
      if (!Number.isSafeInteger(limit) || limit < 1)
        throw new AssetAccessError(
          'integrity',
          'Retained storage allowances must be positive safe integers.',
        );
    assertInput(input);
    // Session transport can change on reconnect; authenticated account and exact admitted
    // work remain the durable identity. Every retry still checks the current session.
    const fingerprint = sha(
      JSON.stringify({ ...input, principal: { accountId: input.principal.accountId } }),
    );
    return this.db.transaction(async () => {
      const prior = await this.operation(input.operationId, input.principal);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new AssetAccessError(
            'conflict',
            'This asset operation ID already describes different work.',
          );
        if (prior.status === 'committed') {
          await this.revision(prior.input.reference, input.principal);
          return prior;
        }
        if (prior.status === 'cancelled') throw new AssetAccessError('cancelled');
        await this.assertPublication(input);
        return prior;
      }
      await this.assertPublication(input);
      const operation: AssetOperation = {
        id: input.operationId,
        principalId: input.principal.accountId,
        generation: 1,
        status: 'admitted',
        fingerprint,
        input,
      };
      // The compact immutable admission avoids decoding the complete file list on every
      // upload callback. It is a projection written only by this same operation owner.
      const admission = {
        destination: input.destination,
        reference: input.reference,
        dependencies: input.dependencies,
        storage: input.storage,
      };
      await this.db
        .prepare('INSERT INTO asset_operations VALUES (?,?,?,?,?,?,?,?)')
        .run(
          operation.id,
          operation.principalId,
          fingerprint,
          1,
          operation.status,
          Date.now(),
          JSON.stringify(admission),
          JSON.stringify(operation),
        );
      const claim = async (reference: ArtifactReference, objectKey: string) => {
        const physicalKey = assetPhysicalKey(input.storage, objectKey);
        const prior = parse<ArtifactReference>(
          await this.db
            .prepare('SELECT payload FROM asset_claims WHERE artifact_key=? LIMIT 1')
            .get(physicalKey),
        );
        if (prior && !sameArtifact(prior, reference))
          throw new AssetAccessError(
            'integrity',
            'A permanent delivery key already identifies different bytes.',
          );
        await this.db
          .prepare(
            'INSERT INTO asset_claims VALUES (?,?,?) ON CONFLICT(operation_id,artifact_key) DO NOTHING',
          )
          .run(operation.id, physicalKey, JSON.stringify(reference));
        await this.db
          .prepare('INSERT INTO asset_claim_references VALUES (?,?,?) ON CONFLICT DO NOTHING')
          .run(operation.id, artifactReferenceKey(reference), physicalKey);
      };
      for (const file of [...input.files, input.manifestArtifact])
        await claim(file, artifactKey(file));
      for (const target of input.namedFiles ?? []) {
        await this.db
          .prepare('INSERT INTO asset_named_targets VALUES (?,?,?)')
          .run(operation.id, artifactReferenceKey(target.reference), target.key);
        await claim(target.reference, target.key);
      }
      // Claims remain after success/cancellation: unselected uploaded files still
      // consume storage until a separately qualified collector proves deletion.
      // Bound metadata rows first, so the subsequent deduplicated sum is bounded.
      const counts = await this.db
        .prepare(
          `SELECT
        (SELECT COUNT(*) FROM (SELECT id FROM asset_operations LIMIT ?) operations) AS operations,
        (SELECT COUNT(*) FROM (SELECT artifact_key FROM asset_claims LIMIT ?) claims) AS claims`,
        )
        .get(limits.maxPublicationOperations + 1, limits.maxRetainedFiles + 1);
      if (
        Number(counts?.['operations']) > limits.maxPublicationOperations ||
        Number(counts?.['claims']) > limits.maxRetainedFiles
      )
        throw new AssetAccessError(
          'unavailable',
          'Retained publication metadata has reached its operating allowance.',
        );
      const retained = await this.db
        .prepare(
          `SELECT COALESCE(SUM(bytes),0) AS bytes FROM (
        SELECT artifact_key,MAX(CAST(CAST(payload AS JSONB)->>'bytes' AS BIGINT)) AS bytes
        FROM asset_claims GROUP BY artifact_key) objects`,
        )
        .get();
      if (Number(retained?.['bytes']) > limits.maxRetainedBytes)
        throw new AssetAccessError(
          'unavailable',
          'Retained and reserved asset bytes have reached their operating allowance.',
        );
      return operation;
    });
  }
  private async active(
    id: string,
    generation: number,
    principal: AssetPrincipal,
  ): Promise<AssetOperation> {
    const operation = await this.operation(id, principal);
    if (!operation || operation.generation !== generation || operation.status === 'cancelled')
      throw new AssetAccessError('cancelled');
    return operation;
  }
  /** Recheck the exact output immediately before a transfer. This compact read does
   * not repeatedly hydrate every file in a growing publication. */
  async assertTransfer(
    id: string,
    generation: number,
    principal: AssetPrincipal,
    reference: ArtifactReference,
  ): Promise<AssetStorageIdentity> {
    assertArtifactReference(reference);
    await this.assertPrincipal(principal);
    const row = await this.db
      .prepare(
        'SELECT generation,status,admission FROM asset_operations WHERE id=? AND principal_id=?',
      )
      .get(id, principal.accountId);
    if (!row || Number(row['generation']) !== generation || row['status'] === 'cancelled')
      throw new AssetAccessError('cancelled');
    const admission = parse<
      Pick<AssetPublicationInput, 'destination' | 'reference' | 'dependencies' | 'storage'>
    >(row, 'admission');
    if (!admission) throw new AssetAccessError('unavailable');
    await this.assertPermission(principal, admission.destination, 'publish');
    const use = publicationUse(admission.destination);
    await this.assertRights(admission.reference, use);
    await this.assertUnrestricted(admission.reference, [reference]);
    for (const dependency of admission.dependencies) {
      await this.assertRights(dependency, use);
      const right = await this.db
        .prepare('SELECT boundary,access_domain FROM asset_rights WHERE revision_key=?')
        .get(assetRevisionKey(dependency));
      const domain =
        right &&
        (await this.domain(right['boundary'] as ArtifactBoundary, String(right['access_domain'])));
      if (!domain) throw new AssetAccessError('unavailable');
      await this.assertPermission(principal, domain, 'read');
    }
    const claim = parse<ArtifactReference>(
      await this.db
        .prepare('SELECT payload FROM asset_claims WHERE operation_id=? AND artifact_key=?')
        .get(id, assetPhysicalKey(admission.storage, artifactKey(reference))),
    );
    if (!claim || !sameArtifact(claim, reference))
      throw new AssetAccessError('integrity', 'Transfer has no matching durable output claim.');
    return admission.storage;
  }
  async recordTransfer(
    id: string,
    generation: number,
    principal: AssetPrincipal,
    receipt: AssetTransferReceipt,
  ): Promise<void> {
    assertArtifactReference(receipt.reference);
    if (
      receipt.fullFileSha256 !== receipt.reference.sha256 ||
      receipt.bytes !== receipt.reference.bytes ||
      receipt.mediaType !== receipt.reference.mediaType ||
      !Number.isFinite(Date.parse(receipt.verifiedAt)) ||
      transferRowBytes(id, receipt) > CHECKPOINT_LIMITS.rowBytes
    )
      throw new AssetAccessError(
        'integrity',
        'Transfer did not verify the complete admitted file.',
      );
    await this.db.transaction(async () => {
      const storage = await this.assertTransfer(id, generation, principal, receipt.reference);
      const physical = (location: AssetPhysicalLocation | undefined, key: string) =>
        location &&
        location.accountId === storage.accountId &&
        location.region === storage.region &&
        location.bucket === storage.bucket &&
        location.key === key &&
        typeof location.versionId === 'string' &&
        location.versionId.length > 0 &&
        Buffer.byteLength(location.versionId) <= 1024;
      if (!physical(receipt.location, artifactKey(receipt.reference)))
        throw new AssetAccessError(
          'integrity',
          'Transfer receipt does not identify its admitted physical version.',
        );
      const targets = await this.db
        .prepare(
          'SELECT object_key FROM asset_named_targets WHERE operation_id=? AND artifact_key=? ORDER BY object_key',
        )
        .all(id, artifactReferenceKey(receipt.reference));
      const locations = receipt.locations ?? [];
      const keys = new Set(locations.map((location) => location.key));
      if (
        locations.length !== targets.length ||
        keys.size !== locations.length ||
        targets.some((target) => !keys.has(String(target['object_key']))) ||
        locations.some((location) => !physical(location, location.key))
      )
        throw new AssetAccessError(
          'integrity',
          'Transfer did not verify every admitted named delivery target.',
        );
      await this.db
        .prepare(
          'INSERT INTO asset_transfers VALUES (?,?,?) ON CONFLICT(operation_id,artifact_key) DO NOTHING',
        )
        .run(id, artifactReferenceKey(receipt.reference), JSON.stringify(receipt));
    });
  }
  async prepared(
    id: string,
    generation: number,
    principal: AssetPrincipal,
  ): Promise<AssetOperation> {
    return this.db.transaction(async () => {
      const operation = await this.active(id, generation, principal);
      if (operation.status === 'committed') return operation;
      await this.assertPublication({ ...operation.input, principal });
      for (const file of [...operation.input.files, operation.input.manifestArtifact]) {
        const receipt = parse<AssetTransferReceipt>(
          await this.db
            .prepare('SELECT payload FROM asset_transfers WHERE operation_id=? AND artifact_key=?')
            .get(id, artifactReferenceKey(file)),
        );
        if (!receipt || !sameArtifact(receipt.reference, file))
          throw new AssetAccessError(
            'integrity',
            'Publication is missing a verified durable output.',
          );
      }
      const prepared = { ...operation, status: 'prepared' as const };
      await this.saveOperation(prepared);
      return prepared;
    });
  }
  private saveOperation(operation: AssetOperation): Promise<unknown> {
    return this.db
      .prepare('UPDATE asset_operations SET generation=?,status=?,payload=? WHERE id=?')
      .run(operation.generation, operation.status, JSON.stringify(operation), operation.id);
  }
  async commit(
    id: string,
    generation: number,
    principal: AssetPrincipal,
  ): Promise<AssetPublicationOutcome> {
    return this.db.transaction(async () => {
      const operation = await this.active(id, generation, principal);
      if (operation.status === 'committed' && operation.outcome) {
        await this.revision(operation.outcome.reference, principal);
        return operation.outcome;
      }
      if (operation.status !== 'prepared')
        throw new AssetAccessError('integrity', 'Asset publication is not fully prepared.');
      const input = { ...operation.input, principal };
      await this.assertPublication(input);
      const key = assetRevisionKey(input.reference);
      const existing = await this.db
        .prepare(
          'SELECT manifest_sha256,boundary,access_domain FROM asset_revisions WHERE revision_key=?',
        )
        .get(key);
      if (
        existing &&
        (existing['manifest_sha256'] !== input.reference.manifestSha256 ||
          existing['boundary'] !== input.destination.boundary ||
          existing['access_domain'] !== input.destination.accessDomain)
      )
        throw new AssetAccessError('conflict');
      const value: StoredAssetRevision = {
        reference: input.reference,
        destination: input.destination,
        manifestArtifact: input.manifestArtifact,
        manifestText: input.manifestText,
        manifest: JSON.parse(input.manifestText) as AssetManifest,
      };
      let selectionRevision: number | undefined;
      if (input.selection) {
        const selected = await this.db
          .prepare('SELECT revision,payload FROM asset_selections WHERE selection_key=?')
          .get(input.selection.key);
        if (selected) {
          const current = parse<{ destination: AssetDomain }>(selected)!;
          if (
            !current.destination ||
            current.destination.boundary !== input.destination.boundary ||
            current.destination.accessDomain !== input.destination.accessDomain
          )
            throw new AssetAccessError('unavailable');
        }
        if (Number(selected?.['revision'] ?? 0) !== input.selection.expectedRevision)
          throw new AssetAccessError(
            'conflict',
            'Another publication changed this asset selection.',
          );
        selectionRevision = input.selection.expectedRevision + 1;
      }
      await this.db
        .prepare(
          'INSERT INTO asset_revisions VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(revision_key) DO NOTHING',
        )
        .run(
          key,
          input.reference.manifestSha256,
          input.destination.boundary,
          input.destination.accessDomain,
          input.reference.owner.kind,
          input.reference.owner.id,
          input.reference.assetId,
          input.reference.revisionId,
          Date.now(),
          JSON.stringify(value),
        );
      for (const file of [...input.files, input.manifestArtifact])
        await this.db
          .prepare(
            'INSERT INTO asset_revision_files VALUES (?,?,?) ON CONFLICT(revision_key,artifact_key) DO NOTHING',
          )
          .run(key, artifactReferenceKey(file), JSON.stringify(file));
      for (const dependency of input.dependencies)
        await this.db
          .prepare(
            'INSERT INTO asset_dependencies VALUES (?,?,?) ON CONFLICT(parent_key,child_key) DO NOTHING',
          )
          .run(key, assetRevisionKey(dependency), dependency.manifestSha256);
      await this.pinInTransaction(
        value.manifest.kind,
        key,
        [input.reference, ...input.dependencies],
        [...input.files, input.manifestArtifact],
      );
      if (input.selection && selectionRevision)
        await this.db
          .prepare(
            `INSERT INTO asset_selections VALUES (?,?,?,?,?) ON CONFLICT(selection_key)
          DO UPDATE SET revision=excluded.revision,revision_key=excluded.revision_key,manifest_sha256=excluded.manifest_sha256,payload=excluded.payload`,
          )
          .run(
            input.selection.key,
            selectionRevision,
            key,
            input.reference.manifestSha256,
            JSON.stringify({
              reference: input.reference,
              revision: selectionRevision,
              destination: input.destination,
            }),
          );
      const outcome: AssetPublicationOutcome = {
        operationId: id,
        reference: input.reference,
        manifestArtifact: input.manifestArtifact,
        ...(selectionRevision ? { selectionRevision } : {}),
      };
      await this.saveOperation({ ...operation, status: 'committed', outcome });
      return outcome;
    });
  }
  async cancel(id: string, principal: AssetPrincipal): Promise<void> {
    await this.db.transaction(async () => {
      // Losing publication permission must not prevent an authenticated owner from
      // cancelling already admitted work. No private operation payload is disclosed.
      await this.assertPrincipal(principal);
      const operation = parse<AssetOperation>(
        await this.db
          .prepare('SELECT payload FROM asset_operations WHERE id=? AND principal_id=?')
          .get(id, principal.accountId),
      );
      if (!operation || operation.status === 'cancelled') return;
      if (operation.status === 'committed')
        throw new AssetAccessError(
          'conflict',
          'Committed assets require withdrawal, not cancellation.',
        );
      await this.saveOperation({
        ...operation,
        generation: operation.generation + 1,
        status: 'cancelled',
      });
      // Claims remain conservative holds. No age/terminal cleanup can race a late writer;
      // retained collection stays disabled until its exclusion protocol is qualified.
    });
  }
  private async pinInTransaction(
    ownerKind: string,
    ownerId: string,
    references: readonly AssetRevisionReference[],
    files: readonly ArtifactReference[],
  ): Promise<void> {
    for (const reference of references)
      await this.db
        .prepare(
          'INSERT INTO asset_pins VALUES (?,?,?,?) ON CONFLICT(owner_kind,owner_id,revision_key) DO NOTHING',
        )
        .run(ownerKind, ownerId, assetRevisionKey(reference), reference.manifestSha256);
    for (const file of files)
      await this.db
        .prepare(
          'INSERT INTO asset_pin_files VALUES (?,?,?,?) ON CONFLICT(owner_kind,owner_id,artifact_key) DO NOTHING',
        )
        .run(ownerKind, ownerId, artifactReferenceKey(file), JSON.stringify(file));
  }
  async pin(
    principal: AssetPrincipal,
    owner: { kind: 'save' | 'export' | 'active-operation'; id: string },
    references: readonly AssetRevisionReference[],
  ): Promise<void> {
    await this.db.transaction(async () => {
      const files: ArtifactReference[] = [];
      const complete = new Map<string, AssetRevisionReference>(
        references.map((reference) => [assetRevisionKey(reference), reference]),
      );
      for (const reference of references) {
        const children = await this.db
          .prepare(
            `SELECT r.payload,d.child_sha256 FROM asset_dependencies d
          JOIN asset_revisions r ON r.revision_key=d.child_key WHERE d.parent_key=? ORDER BY d.child_key LIMIT 10001`,
          )
          .all(assetRevisionKey(reference));
        if (children.length > 10000) throw new AssetAccessError('unavailable');
        for (const row of children) {
          const child = parse<StoredAssetRevision>(row)!;
          if (child.reference.manifestSha256 !== row['child_sha256'])
            throw new AssetAccessError('integrity');
          complete.set(assetRevisionKey(child.reference), child.reference);
        }
      }
      for (const reference of complete.values()) {
        const record = await this.readRevision(reference, principal);
        files.push(...Object.values(record.manifest.files), record.manifestArtifact);
      }
      await this.pinInTransaction(owner.kind, owner.id, [...complete.values()], files);
    });
  }
  async releasePin(
    principal: AssetPrincipal,
    owner: { kind: 'save' | 'export' | 'active-operation'; id: string },
    domain: AssetDomain,
  ): Promise<void> {
    await this.db.transaction(async () => {
      await this.assertPermission(principal, domain, 'manage');
      const members = await this.db
        .prepare(
          `SELECT r.payload FROM asset_pins p JOIN asset_revisions r
        ON r.revision_key=p.revision_key WHERE p.owner_kind=? AND p.owner_id=? LIMIT 10001`,
        )
        .all(owner.kind, owner.id);
      if (members.length > 10000) throw new AssetAccessError('unavailable');
      for (const row of members) {
        const member = parse<StoredAssetRevision>(row)!;
        await this.assertPermission(principal, member.destination, 'manage');
      }
      // Published source/study/release pins have no generic deletion path.
      await this.db
        .prepare('DELETE FROM asset_pins WHERE owner_kind=? AND owner_id=?')
        .run(owner.kind, owner.id);
      await this.db
        .prepare('DELETE FROM asset_pin_files WHERE owner_kind=? AND owner_id=?')
        .run(owner.kind, owner.id);
    });
  }
  async selection(
    key: string,
    principal?: AssetPrincipal,
  ): Promise<{ reference: AssetRevisionReference; revision: number } | undefined> {
    const selected = parse<{
      reference?: AssetRevisionReference;
      revision: number;
      withdrawn?: boolean;
    }>(
      await this.db.prepare('SELECT payload FROM asset_selections WHERE selection_key=?').get(key),
    );
    if (!selected?.reference || selected.withdrawn) return undefined;
    await this.revision(selected.reference, principal);
    return { reference: selected.reference, revision: selected.revision };
  }
  async selectionRevision(
    key: string,
    principal: AssetPrincipal,
    destination: AssetDomain,
  ): Promise<number> {
    await this.assertPermission(principal, destination, 'publish');
    const selected = parse<{ revision: number; destination: AssetDomain }>(
      await this.db.prepare('SELECT payload FROM asset_selections WHERE selection_key=?').get(key),
    );
    if (!selected) return 0;
    if (
      selected.destination.boundary !== destination.boundary ||
      selected.destination.accessDomain !== destination.accessDomain
    )
      throw new AssetAccessError('unavailable');
    return selected.revision;
  }
  /** Called only by the world owner's guarded commit. It changes retention, never
   * world laws or asset selection; those remain with their respective owners. */
  async bindWorld(
    principal: AssetPrincipal | undefined,
    worldId: string,
    reference: AssetRevisionReference | undefined,
  ): Promise<void> {
    await this.db.transaction(async () => {
      if (!reference) {
        await this.db
          .prepare("DELETE FROM asset_pins WHERE owner_kind='world' AND owner_id=?")
          .run(worldId);
        await this.db
          .prepare("DELETE FROM asset_pin_files WHERE owner_kind='world' AND owner_id=?")
          .run(worldId);
        await this.db.prepare('DELETE FROM asset_world_bindings WHERE world_id=?').run(worldId);
        return;
      }
      const currentPrincipal = principal ?? (await this.worldPrincipal(worldId, reference));
      const record = await this.revision(reference, currentPrincipal);
      if (record.manifest.kind !== 'release' || record.destination.boundary !== 'runtime')
        throw new AssetAccessError(
          'unavailable',
          'This game build requires an approved runtime release.',
        );
      const children = await this.db
        .prepare(
          `SELECT r.payload,d.child_sha256 FROM asset_dependencies d
        JOIN asset_revisions r ON r.revision_key=d.child_key WHERE d.parent_key=? ORDER BY d.child_key LIMIT 10001`,
        )
        .all(assetRevisionKey(reference));
      if (children.length > 10000) throw new AssetAccessError('unavailable');
      const dependencies = children.map((row) => parse<StoredAssetRevision>(row)!);
      await this.db
        .prepare("DELETE FROM asset_pins WHERE owner_kind='world' AND owner_id=?")
        .run(worldId);
      await this.db
        .prepare("DELETE FROM asset_pin_files WHERE owner_kind='world' AND owner_id=?")
        .run(worldId);
      await this.pinInTransaction(
        'world',
        worldId,
        [reference, ...dependencies.map((child) => child.reference)],
        [record, ...dependencies].flatMap((child) => [
          ...Object.values(child.manifest.files),
          child.manifestArtifact,
        ]),
      );
      await this.db
        .prepare(
          `INSERT INTO asset_world_bindings VALUES (?,?,?,?) ON CONFLICT(world_id)
        DO UPDATE SET revision_key=excluded.revision_key,manifest_sha256=excluded.manifest_sha256,payload=excluded.payload`,
        )
        .run(
          worldId,
          assetRevisionKey(reference),
          reference.manifestSha256,
          JSON.stringify({ reference, principal: { accountId: currentPrincipal.accountId } }),
        );
    });
  }
  private async worldPrincipal(
    worldId: string,
    reference: AssetRevisionReference,
  ): Promise<AssetPrincipal> {
    const bound = parse<{ reference: AssetRevisionReference; principal: AssetPrincipal }>(
      await this.db
        .prepare(
          'SELECT payload FROM asset_world_bindings WHERE world_id=? AND revision_key=? AND manifest_sha256=?',
        )
        .get(worldId, assetRevisionKey(reference), reference.manifestSha256),
    );
    if (!bound || !sameAssetRevision(bound.reference, reference) || !bound.principal.accountId)
      throw new AssetAccessError(
        'unavailable',
        'The installed asset release has no current world authorization.',
      );
    // A retained world operation continues under its admitting account's current
    // asset grant, independently of the browser session used to admit it. It does
    // not recreate that session or grant other people private delivery permission.
    return { accountId: bound.principal.accountId };
  }
  async worldRelease(
    worldId: string,
    reference: AssetRevisionReference,
  ): Promise<StoredAssetRevision> {
    return this.revision(reference, await this.worldPrincipal(worldId, reference));
  }
  async worldReleaseStatus(
    worldId: string,
    reference: AssetRevisionReference,
  ): Promise<{ record: StoredAssetRevision; available: boolean }> {
    const status = await this.retainedReleaseStatus(
      reference,
      await this.worldPrincipal(worldId, reference),
    );
    await this.assertRetainedOwner('world', worldId, reference);
    return status;
  }
  async assertRetainedSave(
    worldId: string,
    saveId: string,
    reference: AssetRevisionReference,
  ): Promise<void> {
    await this.assertRetainedOwner('save', JSON.stringify([worldId, saveId]), reference);
  }
  private async assertRetainedOwner(
    kind: 'world' | 'save',
    owner: string,
    reference: AssetRevisionReference,
  ): Promise<void> {
    await this.assertAuthority();
    const closure = await this.revisionClosure(reference);
    const pins = await this.db
      .prepare(
        'SELECT revision_key,manifest_sha256 FROM asset_pins WHERE owner_kind=? AND owner_id=? ORDER BY revision_key LIMIT 10001',
      )
      .all(kind, owner);
    const held = new Map(
      pins.map((pin) => [String(pin['revision_key']), String(pin['manifest_sha256'])]),
    );
    if (
      pins.length > 10000 ||
      [closure.record, ...closure.dependencies].some(
        (record) =>
          held.get(assetRevisionKey(record.reference)) !== record.reference.manifestSha256,
      )
    )
      throw new AssetAccessError(
        'integrity',
        'The retained save or world does not hold its exact asset dependencies.',
      );
    const files = await this.db
      .prepare(
        'SELECT artifact_key,payload FROM asset_pin_files WHERE owner_kind=? AND owner_id=? ORDER BY artifact_key LIMIT 20001',
      )
      .all(kind, owner);
    const artifacts = new Map(
      files.map((file) => [String(file['artifact_key']), parse<ArtifactReference>(file)!]),
    );
    if (
      files.length > 20000 ||
      [closure.record, ...closure.dependencies].some((record) =>
        [record.manifestArtifact, ...Object.values(record.manifest.files)].some((file) => {
          const pinned = artifacts.get(artifactReferenceKey(file));
          return !pinned || !sameArtifact(pinned, file);
        }),
      )
    )
      throw new AssetAccessError(
        'integrity',
        'The retained save or world does not hold its exact asset files.',
      );
  }
  /** Existing save retention is proof for unavailable art, never authority to make
   * a new binding. The world/save owner admits this call after verifying the slot. */
  async restoreWorldBinding(
    principal: AssetPrincipal | undefined,
    worldId: string,
    reference: AssetRevisionReference | undefined,
    saveId: string,
  ): Promise<void> {
    if (!reference) return this.bindWorld(principal, worldId, reference);
    const current = principal ?? (await this.worldPrincipal(worldId, reference));
    const status = await this.retainedReleaseStatus(reference, current);
    if (status.available) return this.bindWorld(current, worldId, reference);
    await this.assertRetainedSave(worldId, saveId, reference);
    const owner = JSON.stringify([worldId, saveId]);
    await this.db.transaction(async () => {
      await this.assertAuthority();
      await this.assertRetainedSave(worldId, saveId, reference);
      await this.db
        .prepare("DELETE FROM asset_pins WHERE owner_kind='world' AND owner_id=?")
        .run(worldId);
      await this.db
        .prepare("DELETE FROM asset_pin_files WHERE owner_kind='world' AND owner_id=?")
        .run(worldId);
      await this.db
        .prepare(
          "INSERT INTO asset_pins SELECT 'world',?,revision_key,manifest_sha256 FROM asset_pins WHERE owner_kind='save' AND owner_id=?",
        )
        .run(worldId, owner);
      await this.db
        .prepare(
          "INSERT INTO asset_pin_files SELECT 'world',?,artifact_key,payload FROM asset_pin_files WHERE owner_kind='save' AND owner_id=?",
        )
        .run(worldId, owner);
      await this.db
        .prepare(
          `INSERT INTO asset_world_bindings VALUES (?,?,?,?) ON CONFLICT(world_id) DO UPDATE
        SET revision_key=excluded.revision_key,manifest_sha256=excluded.manifest_sha256,payload=excluded.payload`,
        )
        .run(
          worldId,
          assetRevisionKey(reference),
          reference.manifestSha256,
          JSON.stringify({ reference, principal: { accountId: current.accountId } }),
        );
    });
  }
  /** Main writer creates this durable hold before its independent checkpoint reader
   * starts. The expected revision and canonical binding establish the same world cut. */
  async claimSaveSnapshot(
    worldId: string,
    saveId: string,
    expectedRevision?: number,
  ): Promise<AssetRevisionReference | undefined> {
    return this.db.transaction(async () => {
      const head = await this.db
        .prepare('SELECT world_id,revision FROM world_head WHERE id=1')
        .get();
      if (
        !head ||
        head['world_id'] !== worldId ||
        (expectedRevision !== undefined && Number(head['revision']) !== expectedRevision)
      )
        throw new AssetAccessError(
          'conflict',
          'The world changed before its asset dependencies could be held.',
        );
      const row = await this.db
        .prepare("SELECT payload FROM data_world WHERE world_id=? AND parent_id='' LIMIT 1")
        .get(worldId);
      const state = parse<{ presentationRelease?: AssetRevisionReference }>(row);
      const reference = state?.presentationRelease;
      if (!reference) return undefined;
      assertAssetRevisionReference(reference);
      const active = await this.db
        .prepare(
          "SELECT manifest_sha256 FROM asset_pins WHERE owner_kind='world' AND owner_id=? AND revision_key=?",
        )
        .get(worldId, assetRevisionKey(reference));
      if (active?.['manifest_sha256'] !== reference.manifestSha256)
        throw new AssetAccessError(
          'integrity',
          'The installed asset release has no coherent world retention hold.',
        );
      await this.worldReleaseStatus(worldId, reference);
      const ownerId = JSON.stringify([worldId, saveId]);
      const old = await this.db
        .prepare(
          'SELECT expected_revision,payload FROM asset_save_claims WHERE world_id=? AND save_id=?',
        )
        .get(worldId, saveId);
      if (
        old &&
        (Number(old['expected_revision']) !== Number(head['revision']) ||
          !sameAssetRevision(parse<AssetRevisionReference>(old), reference))
      )
        throw new AssetAccessError(
          'conflict',
          'This save ID already holds another asset dependency cut.',
        );
      await this.db
        .prepare(
          'INSERT INTO asset_save_claims VALUES (?,?,?,?,?) ON CONFLICT(world_id,save_id) DO NOTHING',
        )
        .run(worldId, saveId, Number(head['revision']), 'capturing', JSON.stringify(reference));
      await this.db
        .prepare(
          `INSERT INTO asset_pins SELECT 'save-capture',?,revision_key,manifest_sha256
        FROM asset_pins WHERE owner_kind='world' AND owner_id=? ON CONFLICT DO NOTHING`,
        )
        .run(ownerId, worldId);
      await this.db
        .prepare(
          `INSERT INTO asset_pin_files SELECT 'save-capture',?,artifact_key,payload
        FROM asset_pin_files WHERE owner_kind='world' AND owner_id=? ON CONFLICT DO NOTHING`,
        )
        .run(ownerId, worldId);
      return reference;
    });
  }
  /** File publication and SQL use the durable save identity to recover the same
   * operation. Promoting a hold grants no delivery or restored access. */
  async completeSaveSnapshot(worldId: string, saveId: string): Promise<void> {
    const ownerId = JSON.stringify([worldId, saveId]);
    await this.db.transaction(async () => {
      await this.db
        .prepare(
          `INSERT INTO asset_pins SELECT 'save',?,revision_key,manifest_sha256
        FROM asset_pins WHERE owner_kind='save-capture' AND owner_id=? ON CONFLICT DO NOTHING`,
        )
        .run(ownerId, ownerId);
      await this.db
        .prepare(
          `INSERT INTO asset_pin_files SELECT 'save',?,artifact_key,payload
        FROM asset_pin_files WHERE owner_kind='save-capture' AND owner_id=? ON CONFLICT DO NOTHING`,
        )
        .run(ownerId, ownerId);
      await this.db
        .prepare("DELETE FROM asset_pins WHERE owner_kind='save-capture' AND owner_id=?")
        .run(ownerId);
      await this.db
        .prepare("DELETE FROM asset_pin_files WHERE owner_kind='save-capture' AND owner_id=?")
        .run(ownerId);
      await this.db
        .prepare("UPDATE asset_save_claims SET status='published' WHERE world_id=? AND save_id=?")
        .run(worldId, saveId);
    });
  }
  /** SaveFiles has proved the immutable slot absent before this call. No asset or
   * published source/study pin is deleted by checkpoint cleanup. */
  async releaseSaveSnapshot(
    worldId: string,
    saveId: string,
    provisionalOnly = false,
  ): Promise<void> {
    const ownerId = JSON.stringify([worldId, saveId]);
    await this.db.transaction(async () => {
      const kinds = provisionalOnly ? ['save-capture'] : ['save-capture', 'save'];
      await this.db
        .prepare('DELETE FROM asset_pins WHERE owner_kind=ANY(?::text[]) AND owner_id=?')
        .run(kinds, ownerId);
      await this.db
        .prepare('DELETE FROM asset_pin_files WHERE owner_kind=ANY(?::text[]) AND owner_id=?')
        .run(kinds, ownerId);
      await this.db
        .prepare(
          `DELETE FROM asset_save_claims WHERE world_id=? AND save_id=?${provisionalOnly ? " AND status='capturing'" : ''}`,
        )
        .run(worldId, saveId);
    });
  }
  /** Current restriction authority must be established before restored records are served. */
  async quarantineAuthority(): Promise<void> {
    await this.db.prepare("UPDATE asset_authority SET complete=0 WHERE id='current'").run();
    this.changedAuthority();
  }
  async restrictionSnapshot(): Promise<AssetAuthoritySnapshot> {
    return (this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db))(
      async () => {
        await this.assertAuthority();
        const authority = await this.db
          .prepare("SELECT generation FROM asset_authority WHERE id='current'")
          .get();
        const domains = await this.db
          .prepare(
            'SELECT boundary,access_domain,payload FROM asset_domains ORDER BY boundary,access_domain LIMIT 100001',
          )
          .all();
        const grants = await this.db
          .prepare(
            'SELECT boundary,access_domain,account_id,revision,permissions FROM asset_grants ORDER BY boundary,access_domain,account_id LIMIT 100001',
          )
          .all();
        const rights = await this.db
          .prepare(
            'SELECT revision_key,manifest_sha256,boundary,access_domain,revision,payload FROM asset_rights ORDER BY revision_key LIMIT 100001',
          )
          .all();
        const restrictions = await this.db
          .prepare(
            'SELECT kind,subject_key,generation,recorded_at,payload FROM asset_restrictions ORDER BY kind,subject_key LIMIT 100001',
          )
          .all();
        const deliveryRemovals = await this.db
          .prepare('SELECT * FROM asset_delivery_removals ORDER BY artifact_key LIMIT 100001')
          .all();
        const withdrawalPlans = await this.db
          .prepare('SELECT * FROM asset_withdrawal_plans ORDER BY id LIMIT 100001')
          .all();
        const withdrawalItems = await this.db
          .prepare(
            'SELECT * FROM asset_withdrawal_items ORDER BY plan_id,kind,identity LIMIT 100001',
          )
          .all();
        const removalReceipts = await this.db
          .prepare(
            'SELECT * FROM asset_removal_receipts ORDER BY plan_id,location_key LIMIT 100001',
          )
          .all();
        const authorityOperations = await this.db
          .prepare(
            'SELECT * FROM asset_authority_operations ORDER BY account_id,operation_id LIMIT 100001',
          )
          .all();
        if (
          [
            domains,
            grants,
            rights,
            restrictions,
            deliveryRemovals,
            withdrawalPlans,
            withdrawalItems,
            removalReceipts,
            authorityOperations,
          ].some((rows) => rows.length > 100000)
        )
          throw new AssetAccessError(
            'unavailable',
            'Current asset authority exceeds its recovery row allowance.',
          );
        return {
          generation: Number(authority?.['generation']),
          domains,
          grants,
          rights,
          restrictions,
          deliveryRemovals,
          withdrawalPlans,
          withdrawalItems,
          removalReceipts,
          authorityOperations,
        };
      },
    );
  }
  /** Recovery coordination wraps authority mutation, while its durable outcome stays
   * with the same SQL owner as the changed grant/right. A lost acknowledgement never
   * runs the mutation a second time. The caller owns independent recovery coverage. */
  async authorityOperation<T>(
    principal: AssetPrincipal,
    operationId: string,
    fingerprint: string,
    mutation: () => Promise<T>,
  ): Promise<{ generation: number; outcome: T }> {
    if (!isAssetStorageId(operationId) || !/^[a-f0-9]{64}$/.test(fingerprint))
      throw new AssetAccessError('integrity', 'Invalid asset authority operation identity.');
    return this.db.transaction(async () => {
      await this.assertPrincipal(principal);
      const prior = await this.db
        .prepare(
          'SELECT fingerprint,generation,payload FROM asset_authority_operations WHERE account_id=? AND operation_id=?',
        )
        .get(principal.accountId, operationId);
      if (prior) {
        if (prior['fingerprint'] !== fingerprint) throw new AssetAccessError('conflict');
        return {
          generation: Number(prior['generation']),
          outcome: JSON.parse(String(prior['payload'])) as T,
        };
      }
      const outcome = await mutation();
      const text = JSON.stringify(outcome);
      if (text === undefined || Buffer.byteLength(text) > 65536)
        throw new AssetAccessError(
          'integrity',
          'Authority outcome must be bounded serializable data.',
        );
      const authority = await this.db
        .prepare("SELECT generation,complete FROM asset_authority WHERE id='current'")
        .get();
      if (Number(authority?.['complete']) !== 1) throw new AssetAccessError('unavailable');
      const generation = Number(authority?.['generation']);
      await this.db
        .prepare('INSERT INTO asset_authority_operations VALUES (?,?,?,?,?)')
        .run(principal.accountId, operationId, fingerprint, generation, text);
      // Include the operation receipt itself. A committed change that cannot be
      // exported would otherwise strand the independent marker as pending.
      assertRecoverableAuthority(await this.restrictionSnapshot());
      return { generation, outcome };
    });
  }
  async authorityOperationOutcome<T>(
    principal: AssetPrincipal,
    operationId: string,
    fingerprint: string,
  ): Promise<{ generation: number; outcome: T } | undefined> {
    await this.assertPrincipal(principal);
    const prior = await this.db
      .prepare(
        'SELECT fingerprint,generation,payload FROM asset_authority_operations WHERE account_id=? AND operation_id=?',
      )
      .get(principal.accountId, operationId);
    if (!prior) return undefined;
    if (prior['fingerprint'] !== fingerprint) throw new AssetAccessError('conflict');
    return {
      generation: Number(prior['generation']),
      outcome: JSON.parse(String(prior['payload'])) as T,
    };
  }
  /** Recovery is an explicitly approved use of each exact logical revision; the
   * operator's storage role alone cannot authorize copying another creator's art. */
  async authorizeRecoveryArtifact(
    principal: AssetPrincipal,
    release: AssetRevisionReference,
    reference: ArtifactReference,
  ): Promise<void> {
    await this.authorizeArtifact(principal, release, reference);
    const row = await this.db
      .prepare(
        `SELECT d.payload FROM asset_revisions r JOIN asset_domains d
      ON d.boundary=r.boundary AND d.access_domain=r.access_domain WHERE r.revision_key=? AND r.manifest_sha256=?`,
      )
      .get(assetRevisionKey(release), release.manifestSha256);
    if (!row) throw new AssetAccessError('unavailable');
    await this.assertPermission(principal, parse<AssetDomain>(row)!, 'manage');
    await this.assertRights(release, 'recovery');
  }
  /** Hosted operator login admits a named page only through a completed exact
   * publication in the selected physical study origin, before and after issuing. */
  async authorizeNamedArtifact(
    principal: AssetPrincipal,
    storage: AssetStorageIdentity,
    boundary: ArtifactBoundary,
    accessDomain: string,
    key: string,
  ): Promise<void> {
    if (!isAssetStorageIdentity(storage)) throw new AssetAccessError('integrity');
    const rows = await this.db
      .prepare(
        `SELECT (o.admission::jsonb->'reference')::text AS reference,
          (t.payload::jsonb->'reference')::text AS artifact
       FROM asset_named_targets n JOIN asset_operations o ON o.id=n.operation_id
       JOIN asset_transfers t ON t.operation_id=n.operation_id AND t.artifact_key=n.artifact_key
       WHERE n.object_key=? AND o.status='committed'
         AND o.admission::jsonb->'storage'->>'accountId'=?
         AND o.admission::jsonb->'storage'->>'region'=?
         AND o.admission::jsonb->'storage'->>'bucket'=?
       ORDER BY o.id LIMIT 101`,
      )
      .all(key, storage.accountId, storage.region, storage.bucket);
    if (rows.length > 100)
      throw new AssetAccessError(
        'unavailable',
        'The named page exceeds its publication lookup allowance.',
      );
    for (const row of rows) {
      const artifact = parse<ArtifactReference>(row, 'artifact')!;
      if (artifact.boundary !== boundary || artifact.accessDomain !== accessDomain) continue;
      const release = JSON.parse(String(row['reference'])) as unknown;
      assertAssetRevisionReference(release);
      try {
        // Commit already verified every indexed named target in this physical
        // storage; do not reload its potentially large alias list for each login.
        await this.authorizeArtifact(principal, release, artifact);
        return;
      } catch (error) {
        if (!(error instanceof AssetAccessError && error.code === 'unavailable')) throw error;
      }
    }
    throw new AssetAccessError('unavailable');
  }
  async assertRecoveryOperator(principal: AssetPrincipal): Promise<void> {
    await this.assertPrincipal(principal);
    await this.assertAuthority();
    const domains = await this.db
      .prepare('SELECT payload FROM asset_domains ORDER BY boundary,access_domain LIMIT 10001')
      .all();
    if (domains.length > 10000) throw new AssetAccessError('unavailable');
    for (const row of domains)
      await this.assertPermission(principal, parse<AssetDomain>(row)!, 'manage');
  }
  /** Recovery-only composition supplies an independently verified current watermark.
   * An old backup's own generation is never evidence that its grants are still current. */
  async reconcileAuthority(
    snapshot: AssetAuthoritySnapshot,
    verifiedCurrentGeneration: number,
  ): Promise<void> {
    if (
      !Number.isSafeInteger(snapshot.generation) ||
      snapshot.generation < 0 ||
      snapshot.generation !== verifiedCurrentGeneration ||
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
      ].every((rows) => Array.isArray(rows) && rows.length <= 100000)
    )
      throw new AssetAccessError(
        'unavailable',
        'Current asset authority coverage was not established.',
      );
    const domainKeys = new Set<string>();
    for (const row of snapshot.domains) {
      const domain = JSON.parse(String(row['payload'])) as AssetDomain;
      assertDomain(domain);
      if (domain.boundary !== row['boundary'] || domain.accessDomain !== row['access_domain'])
        throw new AssetAccessError('integrity');
      domainKeys.add(JSON.stringify([domain.boundary, domain.accessDomain]));
    }
    for (const row of snapshot.grants) {
      const values: unknown = JSON.parse(String(row['permissions']));
      if (
        !domainKeys.has(JSON.stringify([row['boundary'], row['access_domain']])) ||
        typeof row['account_id'] !== 'string' ||
        !row['account_id'] ||
        !Number.isSafeInteger(Number(row['revision'])) ||
        Number(row['revision']) < 1 ||
        !Array.isArray(values) ||
        values.some((value) => !permissions.includes(value as AssetPermission))
      )
        throw new AssetAccessError('integrity');
    }
    for (const row of snapshot.rights) {
      const value = JSON.parse(String(row['payload'])) as { uses?: unknown; evidence?: unknown };
      if (
        !domainKeys.has(JSON.stringify([row['boundary'], row['access_domain']])) ||
        !/^[a-f0-9]{64}$/.test(String(row['manifest_sha256'])) ||
        typeof row['revision_key'] !== 'string' ||
        !row['revision_key'] ||
        !Number.isSafeInteger(Number(row['revision'])) ||
        Number(row['revision']) < 1 ||
        !Array.isArray(value.uses) ||
        value.uses.some((use) => !uses.includes(use as AssetUse)) ||
        !Array.isArray(value.evidence) ||
        !value.evidence.length ||
        value.evidence.some((evidence) => typeof evidence !== 'string' || !evidence)
      )
        throw new AssetAccessError('integrity');
    }
    for (const row of snapshot.restrictions)
      if (
        !['revision', 'artifact'].includes(String(row['kind'])) ||
        typeof row['subject_key'] !== 'string' ||
        !Number.isSafeInteger(Number(row['generation'])) ||
        Number(row['generation']) < 1 ||
        Number(row['generation']) > snapshot.generation ||
        !Number.isSafeInteger(Number(row['recorded_at'])) ||
        typeof row['payload'] !== 'string'
      )
        throw new AssetAccessError('integrity');
    const plans = new Map<
      string,
      {
        plan: AssetControlledRemovalPlan;
        artifacts: Set<string>;
        locations: Map<string, AssetObjectLocation>;
      }
    >();
    const itemsByPlan = new Map<string, Record<string, unknown>[]>();
    for (const item of snapshot.withdrawalItems) {
      const id = String(item['plan_id']);
      let items = itemsByPlan.get(id);
      if (!items) {
        items = [];
        itemsByPlan.set(id, items);
      }
      items.push(item);
    }
    for (const row of snapshot.withdrawalPlans) {
      const plan = withdrawalPlan(
        parse<StoredWithdrawalPlan>(row)!,
        itemsByPlan.get(String(row['id'])) ?? [],
      );
      if (
        plan.id !== row['id'] ||
        plan.generation > snapshot.generation ||
        typeof row['principal_id'] !== 'string' ||
        !row['principal_id'] ||
        !/^[a-f0-9]{64}$/.test(String(row['fingerprint']))
      )
        throw new AssetAccessError('integrity');
      plans.set(plan.id, {
        plan,
        artifacts: new Set(plan.files.map((file) => artifactReferenceKey(file.reference))),
        locations: new Map(
          plan.files.map((file) => [
            JSON.stringify([
              artifactReferenceKey(file.reference),
              assetPhysicalKey(file, file.key),
            ]),
            file,
          ]),
        ),
      });
    }
    if ([...itemsByPlan.keys()].some((id) => !plans.has(id)))
      throw new AssetAccessError('integrity', 'Controlled withdrawal items lack their header.');
    for (const row of snapshot.deliveryRemovals) {
      if (
        !plans.has(String(row['plan_id'])) ||
        !['pending', 'complete'].includes(String(row['status'])) ||
        !Number.isSafeInteger(Number(row['generation'])) ||
        Number(row['generation']) < 1 ||
        Number(row['generation']) > snapshot.generation ||
        typeof row['artifact_key'] !== 'string'
      )
        throw new AssetAccessError('integrity');
      const { plan, artifacts } = plans.get(String(row['plan_id']))!;
      if (plan.status !== row['status'] || !artifacts.has(String(row['artifact_key'])))
        throw new AssetAccessError('integrity');
    }
    for (const row of snapshot.removalReceipts) {
      const receipt = parse<AssetCurrentRemovalReceipt>(row)!;
      if (
        !plans.has(String(row['plan_id'])) ||
        !receipt ||
        !receipt.deleteMarkerVersionId ||
        !Number.isFinite(Date.parse(receipt.removedAt)) ||
        typeof row['location_key'] !== 'string'
      )
        throw new AssetAccessError('integrity');
      assertArtifactReference(receipt.reference);
      const expected = plans
        .get(String(row['plan_id']))!
        .locations.get(String(row['location_key']));
      if (
        !expected ||
        !sameArtifact(expected.reference, receipt.reference) ||
        !isAssetStorageIdentity(receipt) ||
        !isArtifactObjectKey(receipt.reference, receipt.key) ||
        row['location_key'] !==
          JSON.stringify([
            artifactReferenceKey(receipt.reference),
            assetPhysicalKey(receipt, receipt.key),
          ])
      )
        throw new AssetAccessError('integrity');
    }
    for (const row of snapshot.authorityOperations) {
      if (
        typeof row['account_id'] !== 'string' ||
        !row['account_id'] ||
        !isAssetStorageId(row['operation_id']) ||
        !/^[a-f0-9]{64}$/.test(String(row['fingerprint'])) ||
        !Number.isSafeInteger(Number(row['generation'])) ||
        Number(row['generation']) < 0 ||
        Number(row['generation']) > snapshot.generation ||
        typeof row['payload'] !== 'string'
      )
        throw new AssetAccessError('integrity');
      JSON.parse(row['payload']);
    }
    await this.db.transaction(async () => {
      const existing = await this.db
        .prepare("SELECT generation FROM asset_authority WHERE id='current'")
        .get();
      if (Number(existing?.['generation'] ?? 0) > snapshot.generation)
        throw new AssetAccessError('conflict', 'Recovery cannot rewind current asset authority.');
      await this.db.prepare('DELETE FROM asset_grants').run();
      await this.db.prepare('DELETE FROM asset_rights').run();
      await this.db.prepare('DELETE FROM asset_domains').run();
      await this.db.prepare('DELETE FROM asset_delivery_removals').run();
      await this.db.prepare('DELETE FROM asset_withdrawal_plans').run();
      await this.db.prepare('DELETE FROM asset_withdrawal_items').run();
      await this.db.prepare('DELETE FROM asset_removal_receipts').run();
      await this.db.prepare('DELETE FROM asset_authority_operations').run();
      for (const row of snapshot.deliveryRemovals)
        await this.db
          .prepare('INSERT INTO asset_delivery_removals VALUES (?,?,?,?)')
          .run(row['artifact_key'], row['plan_id'], row['generation'], row['status']);
      for (const row of snapshot.withdrawalPlans)
        await this.db
          .prepare('INSERT INTO asset_withdrawal_plans VALUES (?,?,?,?)')
          .run(row['id'], row['principal_id'], row['fingerprint'], row['payload']);
      for (const row of snapshot.withdrawalItems)
        await this.db
          .prepare('INSERT INTO asset_withdrawal_items VALUES (?,?,?,?)')
          .run(row['plan_id'], row['kind'], row['identity'], row['payload']);
      for (const row of snapshot.removalReceipts)
        await this.db
          .prepare('INSERT INTO asset_removal_receipts VALUES (?,?,?)')
          .run(row['plan_id'], row['location_key'], row['payload']);
      for (const row of snapshot.authorityOperations)
        await this.db
          .prepare('INSERT INTO asset_authority_operations VALUES (?,?,?,?,?)')
          .run(
            row['account_id'],
            row['operation_id'],
            row['fingerprint'],
            row['generation'],
            row['payload'],
          );
      for (const row of snapshot.domains)
        await this.db
          .prepare('INSERT INTO asset_domains VALUES (?,?,?)')
          .run(row['boundary'], row['access_domain'], row['payload']);
      for (const row of snapshot.grants)
        await this.db
          .prepare('INSERT INTO asset_grants VALUES (?,?,?,?,?)')
          .run(
            row['boundary'],
            row['access_domain'],
            row['account_id'],
            row['revision'],
            row['permissions'],
          );
      for (const row of snapshot.rights)
        await this.db
          .prepare('INSERT INTO asset_rights VALUES (?,?,?,?,?,?)')
          .run(
            row['revision_key'],
            row['manifest_sha256'],
            row['boundary'],
            row['access_domain'],
            row['revision'],
            row['payload'],
          );
      // Retain any older withdrawal absent from a supplied export conservatively.
      // Recovery cannot itself authorize lifting a takedown.
      for (const row of snapshot.restrictions)
        await this.db
          .prepare(
            'INSERT INTO asset_restrictions VALUES (?,?,?,?,?) ON CONFLICT(kind,subject_key) DO NOTHING',
          )
          .run(
            row['kind'],
            row['subject_key'],
            row['generation'],
            row['recorded_at'],
            row['payload'],
          );
      await this.db
        .prepare(
          "INSERT INTO asset_authority VALUES ('current',?,1) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,complete=1",
        )
        .run(snapshot.generation);
      this.changedAuthority();
    });
  }
  async withdraw(
    operator: AssetPrincipal,
    reference: AssetRevisionReference,
    reason: string,
  ): Promise<AssetRevisionReference[]> {
    if (!reason || reason.length > 2048) throw new AssetAccessError('integrity');
    return this.db.transaction(async () => {
      const original = await this.storedRevision(reference);
      await this.assertPermission(operator, original.destination, 'manage');
      const generation = await this.advanceAuthority();
      await this.db
        .prepare(
          'INSERT INTO asset_restrictions VALUES (?,?,?,?,?) ON CONFLICT(kind,subject_key) DO NOTHING',
        )
        .run(
          'revision',
          revisionChecksumKey(reference),
          generation,
          Date.now(),
          JSON.stringify({ reference, reason }),
        );
      return this.withdrawSelections([reference]);
    });
  }
  private async withdrawSelections(
    roots: AssetRevisionReference[],
  ): Promise<AssetRevisionReference[]> {
    const affected: AssetRevisionReference[] = [...roots];
    const pending = roots.map(assetRevisionKey),
      seen = new Set(pending);
    while (pending.length) {
      if (seen.size > 10000)
        throw new AssetAccessError('integrity', 'Withdrawal exceeds its dependency allowance.');
      const key = pending.shift()!;
      // Keep the selection generation after withdrawal. Deleting the row would
      // permit an old expected-zero publication to mistake it for an unused slot.
      await this.db
        .prepare(
          `UPDATE asset_selections SET revision=revision+1,revision_key='',manifest_sha256='',
          payload=(payload::jsonb || jsonb_build_object('revision',revision+1,'withdrawn',true))::text WHERE revision_key=?`,
        )
        .run(key);
      const parents = await this.db
        .prepare(
          'SELECT parent_key FROM asset_dependencies WHERE child_key=? ORDER BY parent_key LIMIT 10001',
        )
        .all(key);
      if (parents.length > 10000)
        throw new AssetAccessError('integrity', 'Withdrawal exceeds its dependency allowance.');
      for (const parent of parents) {
        const parentKey = String(parent['parent_key']);
        if (seen.has(parentKey)) continue;
        seen.add(parentKey);
        pending.push(parentKey);
        const record = parse<StoredAssetRevision>(
          await this.db
            .prepare('SELECT payload FROM asset_revisions WHERE revision_key=?')
            .get(parentKey),
        );
        if (record) affected.push(record.reference);
      }
    }
    // Selection removal is immediate SQL authority. The operator must also withdraw
    // controlled media delivery/CDN copies; this return value drives that exact work.
    return affected;
  }
  /** Explicit byte prohibition is scoped by full boundary/domain references. It
   * never infers that another independently licensed use in another scope ended. */
  async prohibitArtifacts(
    operator: AssetPrincipal,
    references: readonly ArtifactReference[],
    reason: string,
  ): Promise<AssetRevisionReference[]> {
    if (!reason || reason.length > 2048 || !references.length || references.length > 20000)
      throw new AssetAccessError('integrity');
    return this.db.transaction(async () => {
      for (const reference of references) {
        assertArtifactReference(reference);
        await this.assertPermission(
          operator,
          {
            boundary: reference.boundary,
            accessDomain: reference.accessDomain,
            visibility: reference.accessDomain === 'public' ? 'public' : 'restricted',
          },
          'manage',
        );
      }
      const generation = await this.advanceAuthority();
      for (const reference of references)
        await this.db
          .prepare(
            `INSERT INTO asset_restrictions VALUES ('artifact',?,?,?,?)
        ON CONFLICT(kind,subject_key) DO NOTHING`,
          )
          .run(
            artifactReferenceKey(reference),
            generation,
            Date.now(),
            JSON.stringify({ reference, reason }),
          );
      const rows = await this.db
        .prepare(
          `SELECT DISTINCT r.revision_key,r.payload FROM asset_revision_files f
        JOIN asset_revisions r ON r.revision_key=f.revision_key WHERE f.artifact_key=ANY(?::text[])
        ORDER BY r.revision_key LIMIT 10001`,
        )
        .all(references.map(artifactReferenceKey));
      if (rows.length > 10000)
        throw new AssetAccessError(
          'integrity',
          'Byte prohibition exceeds its dependency allowance.',
        );
      return this.withdrawSelections(rows.map((row) => parse<StoredAssetRevision>(row)!.reference));
    });
  }
  /** Freeze exact public copies only after logical access was withdrawn. A current
   * independently permitted logical use of identical bytes preserves those copies. */
  /** Independent reuse is an audience/property of the logical dependency closure,
   * not whether the withdrawing manager also happens to hold a read grant. */
  private async hasPermittedAudience(reference: AssetRevisionReference): Promise<boolean> {
    const closure = await this.revisionClosure(reference);
    const use = publicationUse(closure.record.destination);
    const domains = new Map<string, AssetDomain>();
    for (const record of [closure.record, ...closure.dependencies]) {
      await this.assertUnrestricted(record.reference, [
        record.manifestArtifact,
        ...Object.values(record.manifest.files),
      ]);
      // A study's permission to show its own files does not authorize those
      // files as a runtime dependency of another release.
      await this.assertRights(record.reference, use);
      if (record.destination.visibility === 'restricted')
        domains.set(
          JSON.stringify([record.destination.boundary, record.destination.accessDomain]),
          record.destination,
        );
    }
    if (!domains.size) return true;
    const needed = [...domains.values()];
    return !!(await this.db
      .prepare(
        `SELECT g.account_id FROM asset_grants g
        JOIN UNNEST(?::text[],?::text[]) AS needed(boundary,access_domain)
          ON needed.boundary=g.boundary AND needed.access_domain=g.access_domain
        WHERE g.permissions::jsonb @> '["read"]'::jsonb
        GROUP BY g.account_id HAVING COUNT(*)=? LIMIT 1`,
      )
      .get(
        needed.map((domain) => domain.boundary),
        needed.map((domain) => domain.accessDomain),
        needed.length,
      ));
  }
  async planControlledRemoval(
    operator: AssetPrincipal,
    id: string,
    references: AssetRevisionReference[],
  ): Promise<AssetControlledRemovalPlan> {
    if (!isAssetStorageId(id) || !references.length || references.length > 10000)
      throw new AssetAccessError('integrity');
    references.forEach(assertAssetRevisionReference);
    const fingerprint = sha(JSON.stringify(references.map(revisionChecksumKey).sort()));
    return this.db.transaction(async () => {
      await this.assertPrincipal(operator);
      await this.assertAuthority();
      const prior = await this.db
        .prepare('SELECT principal_id,fingerprint,payload FROM asset_withdrawal_plans WHERE id=?')
        .get(id);
      if (prior) {
        if (prior['principal_id'] !== operator.accountId || prior['fingerprint'] !== fingerprint)
          throw new AssetAccessError('conflict');
        return this.controlledRemoval(operator, id);
      }
      const candidates = new Map<string, ArtifactReference>();
      for (const reference of references) {
        const record = parse<StoredAssetRevision>(
          await this.db
            .prepare(
              'SELECT payload FROM asset_revisions WHERE revision_key=? AND manifest_sha256=?',
            )
            .get(assetRevisionKey(reference), reference.manifestSha256),
        );
        if (!record) throw new AssetAccessError('unavailable');
        await this.assertPermission(operator, record.destination, 'manage');
        let available = false;
        try {
          await this.revision(reference, operator);
          available = true;
        } catch (error) {
          if (!(error instanceof AssetAccessError && error.code === 'unavailable')) throw error;
        }
        if (available)
          throw new AssetAccessError(
            'conflict',
            'Withdraw logical access before removing its controlled delivery copies.',
          );
        for (const file of [record.manifestArtifact, ...Object.values(record.manifest.files)]) {
          if (!['runtime', 'art-studies'].includes(file.boundary)) continue;
          candidates.set(artifactReferenceKey(file), file);
          if (candidates.size > 20000)
            throw new AssetAccessError(
              'integrity',
              'Controlled withdrawal exceeds its file allowance.',
            );
        }
      }
      const allowed = new Map<string, Promise<boolean>>();
      let inspected = 0;
      const files: AssetObjectLocation[] = [],
        keptShared: ArtifactReference[] = [];
      for (const [key, reference] of candidates) {
        const users = await this.db
          .prepare(
            `SELECT r.revision_key,r.payload FROM asset_revision_files f
          JOIN asset_revisions r ON r.revision_key=f.revision_key WHERE f.artifact_key=? ORDER BY r.revision_key LIMIT 10001`,
          )
          .all(key);
        inspected += users.length;
        if (inspected > 100000 || users.length > 10000)
          throw new AssetAccessError(
            'integrity',
            'Controlled withdrawal exceeds its reverse-reference allowance.',
          );
        let shared = false;
        for (const row of users) {
          const revisionKey = String(row['revision_key']);
          let permitted = allowed.get(revisionKey);
          if (!permitted) {
            const record = parse<StoredAssetRevision>(row)!;
            permitted = this.hasPermittedAudience(record.reference).then(
              (available) => available,
              (error: unknown) => {
                if (error instanceof AssetAccessError && error.code === 'unavailable') return false;
                throw error;
              },
            );
            allowed.set(revisionKey, permitted);
          }
          if (await permitted) {
            shared = true;
            break;
          }
        }
        if (shared) {
          keptShared.push(reference);
          continue;
        }
        // A generation fence prevents commit, but cannot recall an S3 request
        // already carrying bytes. Only committed publisher outcomes establish that
        // every owned transfer settled; unresolved claims conservatively block
        // physical removal until their owner reconciles the interrupted writer.
        if (
          await this.db
            .prepare(
              `SELECT c.operation_id FROM asset_claim_references c JOIN asset_operations o ON o.id=c.operation_id
          WHERE c.reference_key=? AND o.status<>'committed' LIMIT 1`,
            )
            .get(key)
        )
          throw new AssetAccessError(
            'conflict',
            'An interrupted publication still reserves this file; reconcile its writer before controlled removal.',
          );
        const removal = await this.db
          .prepare(
            "SELECT plan_id FROM asset_delivery_removals WHERE artifact_key=? AND status='pending'",
          )
          .get(key);
        if (removal && removal['plan_id'] !== id)
          throw new AssetAccessError(
            'conflict',
            'Another controlled withdrawal owns this exact file.',
          );
        const transfers = await this.db
          .prepare(
            `SELECT t.payload FROM asset_transfers t JOIN asset_operations o ON o.id=t.operation_id
             WHERE t.artifact_key=? AND o.status='committed' ORDER BY t.operation_id LIMIT 10001`,
          )
          .all(key);
        if (!transfers.length || transfers.length > 10000)
          throw new AssetAccessError(
            'integrity',
            'Controlled withdrawal lacks bounded exact physical transfer receipts.',
          );
        const locations = new Map<string, AssetPhysicalLocation>();
        for (const row of transfers) {
          const receipt = parse<AssetTransferReceipt>(row)!;
          if (!sameArtifact(receipt.reference, reference)) throw new AssetAccessError('integrity');
          for (const location of [receipt.location, ...(receipt.locations ?? [])]) {
            assertAssetPhysicalLocation(location, reference);
            locations.set(assetPhysicalKey(location, location.key), location);
          }
        }
        if (files.length + locations.size > 20000)
          throw new AssetAccessError(
            'integrity',
            'Controlled withdrawal exceeds its location allowance.',
          );
        files.push(...[...locations.values()].map((location) => ({ ...location, reference })));
      }
      const generation = await this.advanceAuthority();
      const plan: AssetControlledRemovalPlan = {
        id,
        generation,
        status: 'pending',
        references,
        files,
        keptShared,
      };
      const encoded = JSON.stringify(withdrawalHeader(plan));
      if (
        Buffer.byteLength(
          JSON.stringify({
            table: 'asset_withdrawal_plans',
            row: { id, principal_id: operator.accountId, fingerprint, payload: encoded },
          }),
        ) +
          4096 >
        CHECKPOINT_LIMITS.rowBytes
      )
        throw new AssetAccessError(
          'integrity',
          'Controlled withdrawal plan exceeds its recoverable record allowance.',
        );
      for (const key of new Set(files.map((file) => artifactReferenceKey(file.reference))))
        await this.db
          .prepare(
            `INSERT INTO asset_delivery_removals VALUES (?,?,?,'pending') ON CONFLICT(artifact_key)
          DO UPDATE SET plan_id=excluded.plan_id,generation=excluded.generation,status=excluded.status`,
          )
          .run(key, id, generation);
      await this.db
        .prepare('INSERT INTO asset_withdrawal_plans VALUES (?,?,?,?)')
        .run(id, operator.accountId, fingerprint, encoded);
      const groups = [
        {
          kind: 'reference',
          items: plan.references.map((value) => ({
            identity: revisionChecksumKey(value),
            payload: JSON.stringify(value),
          })),
        },
        {
          kind: 'location',
          items: plan.files.map((value) => ({
            identity: JSON.stringify([
              artifactReferenceKey(value.reference),
              assetPhysicalKey(value, value.key),
            ]),
            payload: JSON.stringify(value),
          })),
        },
        {
          kind: 'preserved',
          items: plan.keptShared.map((value) => ({
            identity: artifactReferenceKey(value),
            payload: JSON.stringify(value),
          })),
        },
      ];
      for (const group of groups)
        if (group.items.length)
          await this.db
            .prepare(
              `INSERT INTO asset_withdrawal_items
        SELECT ?,?,identity,payload FROM UNNEST(?::text[],?::text[]) AS item(identity,payload)`,
            )
            .run(
              id,
              group.kind,
              group.items.map((item) => item.identity),
              group.items.map((item) => item.payload),
            );
      return plan;
    });
  }
  async controlledRemoval(
    operator: AssetPrincipal,
    id: string,
  ): Promise<AssetControlledRemovalPlan> {
    await this.assertPrincipal(operator);
    await this.assertAuthority();
    const row = await this.db
      .prepare('SELECT principal_id,payload FROM asset_withdrawal_plans WHERE id=?')
      .get(id);
    if (!row || row['principal_id'] !== operator.accountId)
      throw new AssetAccessError('unavailable');
    const items = await this.db
      .prepare(
        'SELECT * FROM asset_withdrawal_items WHERE plan_id=? ORDER BY kind,identity LIMIT 50001',
      )
      .all(id);
    const plan = withdrawalPlan(parse<StoredWithdrawalPlan>(row)!, items);
    const domains = new Set<string>();
    for (const file of plan.files) {
      const key = JSON.stringify([file.reference.boundary, file.reference.accessDomain]);
      if (!domains.has(key)) {
        domains.add(key);
        await this.assertPermission(
          operator,
          {
            boundary: file.reference.boundary,
            accessDomain: file.reference.accessDomain,
            visibility: file.reference.accessDomain === 'public' ? 'public' : 'restricted',
          },
          'manage',
        );
      }
    }
    return plan;
  }
  /** Composition calls only after S3 accepted current-version delete markers and
   * controlled CDN invalidation completed. Historical/recovery bytes are retained. */
  async completeControlledRemoval(
    operator: AssetPrincipal,
    id: string,
    receipts: AssetCurrentRemovalReceipt[],
    cachePurge: { completed: true; receipt: string },
  ): Promise<AssetControlledRemovalPlan> {
    return this.db.transaction(async () => {
      const plan = await this.controlledRemoval(operator, id);
      if (plan.status === 'complete') return plan;
      if (
        !cachePurge.completed ||
        !cachePurge.receipt ||
        cachePurge.receipt.length > 16384 ||
        receipts.length !== plan.files.length
      )
        throw new AssetAccessError(
          'integrity',
          'Controlled withdrawal lacks complete origin/cache outcomes.',
        );
      const key = (file: AssetObjectLocation) =>
        JSON.stringify([artifactReferenceKey(file.reference), assetPhysicalKey(file, file.key)]);
      const actual = new Map(receipts.map((receipt) => [key(receipt), receipt]));
      if (
        actual.size !== receipts.length ||
        plan.files.some((file) => {
          const receipt = actual.get(key(file));
          return (
            !receipt ||
            !sameArtifact(receipt.reference, file.reference) ||
            !receipt.deleteMarkerVersionId ||
            !Number.isFinite(Date.parse(receipt.removedAt))
          );
        })
      )
        throw new AssetAccessError(
          'integrity',
          'Controlled withdrawal receipts differ from the exact admitted copies.',
        );
      for (const receipt of receipts)
        await this.db
          .prepare('INSERT INTO asset_removal_receipts VALUES (?,?,?) ON CONFLICT DO NOTHING')
          .run(id, key(receipt), JSON.stringify(receipt));
      const complete = { ...plan, status: 'complete' as const, cachePurge };
      await this.db
        .prepare(
          "UPDATE asset_delivery_removals SET status='complete' WHERE plan_id=? AND generation=?",
        )
        .run(id, plan.generation);
      await this.db
        .prepare('UPDATE asset_withdrawal_plans SET payload=? WHERE id=?')
        .run(JSON.stringify(withdrawalHeader(complete)), id);
      // Releasing the publication fence is another authority change and must use
      // the same independently covered authority wrapper as withdrawal admission.
      await this.advanceAuthority();
      return complete;
    });
  }
  async controlledRemovalReceipts(
    operator: AssetPrincipal,
    id: string,
  ): Promise<AssetCurrentRemovalReceipt[]> {
    await this.controlledRemoval(operator, id);
    const rows = await this.db
      .prepare(
        'SELECT payload FROM asset_removal_receipts WHERE plan_id=? ORDER BY location_key LIMIT 20001',
      )
      .all(id);
    if (rows.length > 20000) throw new AssetAccessError('integrity');
    return rows.map((row) => parse<AssetCurrentRemovalReceipt>(row)!);
  }
  /** A network transfer checks one indexed admitted location. Rehydrating every
   * location before each deletion would make a large withdrawal quadratic. */
  async assertControlledRemovalLocation(
    operator: AssetPrincipal,
    id: string,
    location: AssetObjectLocation,
  ): Promise<void> {
    await this.assertPrincipal(operator);
    await this.assertAuthority();
    const header = await this.db
      .prepare('SELECT principal_id,payload FROM asset_withdrawal_plans WHERE id=?')
      .get(id);
    if (!header || header['principal_id'] !== operator.accountId)
      throw new AssetAccessError('unavailable');
    const plan = parse<StoredWithdrawalPlan>(header)!;
    const identity = JSON.stringify([
      artifactReferenceKey(location.reference),
      assetPhysicalKey(location, location.key),
    ]);
    const row = await this.db
      .prepare(
        "SELECT payload FROM asset_withdrawal_items WHERE plan_id=? AND kind='location' AND identity=?",
      )
      .get(id, identity);
    const admitted = parse<AssetObjectLocation>(row);
    if (
      plan.status !== 'pending' ||
      !admitted ||
      !sameArtifact(admitted.reference, location.reference) ||
      assetPhysicalKey(admitted, admitted.key) !== assetPhysicalKey(location, location.key)
    )
      throw new AssetAccessError('integrity', 'The location is not in the exact pending removal.');
    await this.assertPermission(
      operator,
      {
        boundary: location.reference.boundary,
        accessDomain: location.reference.accessDomain,
        visibility: location.reference.accessDomain === 'public' ? 'public' : 'restricted',
      },
      'manage',
    );
  }
  async recordControlledRemoval(
    operator: AssetPrincipal,
    id: string,
    receipt: AssetCurrentRemovalReceipt,
  ): Promise<void> {
    await this.db.transaction(async () => {
      await this.assertControlledRemovalLocation(operator, id, receipt);
      const identity = JSON.stringify([
        artifactReferenceKey(receipt.reference),
        assetPhysicalKey(receipt, receipt.key),
      ]);
      if (!receipt.deleteMarkerVersionId || !Number.isFinite(Date.parse(receipt.removedAt)))
        throw new AssetAccessError(
          'integrity',
          'Removal receipt does not belong to the exact pending plan.',
        );
      await this.db
        .prepare('INSERT INTO asset_removal_receipts VALUES (?,?,?) ON CONFLICT DO NOTHING')
        .run(id, identity, JSON.stringify(receipt));
    });
  }
}
