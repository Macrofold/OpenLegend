/** Exact portable file descriptions. Buckets, credentials and URLs belong to trusted
 * deployment configuration, never to world-authored records. */
export const ARTIFACT_BOUNDARIES = [
  'art-library',
  'art-studies',
  'runtime',
  'intake',
  'asset-recovery',
] as const;
const utf8 = new TextEncoder();
export type ArtifactBoundary = (typeof ARTIFACT_BOUNDARIES)[number];
export interface ArtifactReference {
  boundary: ArtifactBoundary;
  accessDomain: string;
  sha256: string;
  bytes: number;
  mediaType: string;
}
export interface AssetIndex {
  release: AssetRevisionReference;
  files: Record<string, ArtifactReference>;
}
export interface AssetOwner {
  kind: 'engine' | 'world' | 'collection' | 'creator' | 'instance';
  id: string;
}
export interface AssetRevisionIdentity {
  owner: AssetOwner;
  assetId: string;
  revisionId: string;
}
export interface AssetRevisionReference extends AssetRevisionIdentity {
  manifestSha256: string;
}
export interface AssetManifest {
  kind: 'asset' | 'source-bundle' | 'study' | 'release';
  identity: AssetRevisionIdentity;
  files: Record<string, ArtifactReference>;
  dependencies: AssetRevisionReference[];
  /** Evidence identity only. Current permission is checked separately at publication/use. */
  rightsEvidence: string[];
  metadata: Record<string, unknown>;
}
const HASH = /^[a-f0-9]{64}$/;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const TYPES = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:;[ -~]+)?$/i;
const own = (value: object, key: string) => Object.hasOwn(value, key);
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isAssetStorageId(value: unknown): value is string {
  return typeof value === 'string' && SEGMENT.test(value) && value !== '.' && value !== '..';
}
export function isRepositoryAssetPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 4096 &&
    !value.includes('\\') &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..') &&
    !/^[A-Za-z]:/.test(value)
  );
}
export function assertArtifactReference(value: unknown): asserts value is ArtifactReference {
  if (
    !record(value) ||
    !ARTIFACT_BOUNDARIES.includes(value['boundary'] as ArtifactBoundary) ||
    !isAssetStorageId(value['accessDomain']) ||
    typeof value['sha256'] !== 'string' ||
    !HASH.test(value['sha256']) ||
    !Number.isSafeInteger(value['bytes']) ||
    Number(value['bytes']) < 0 ||
    typeof value['mediaType'] !== 'string' ||
    value['mediaType'].length > 160 ||
    !TYPES.test(value['mediaType'])
  )
    throw new Error('Invalid exact asset file reference.');
}
export function assertAssetIndex(value: unknown): asserts value is AssetIndex {
  if (!record(value) || !record(value['files']))
    throw new Error('Invalid exact asset release index.');
  assertAssetRevisionReference(value['release']);
  for (const [path, reference] of Object.entries(value['files'])) {
    if (!isRepositoryAssetPath(path)) throw new Error('Unsafe asset source path.');
    assertArtifactReference(reference);
  }
}
export function assertAssetRevisionReference(
  value: unknown,
): asserts value is AssetRevisionReference {
  assertRevisionIdentity(value, true);
  if (
    !record(value) ||
    typeof value['manifestSha256'] !== 'string' ||
    !HASH.test(value['manifestSha256'])
  )
    throw new Error('Invalid exact asset manifest reference.');
}
function assertRevisionIdentity(
  value: unknown,
  checksum = false,
): asserts value is AssetRevisionIdentity {
  // Logical authored IDs are tuple values, never storage path segments. Restricting
  // them to URL-safe spelling would reject valid external-world identities.
  const logicalId = (id: unknown) =>
    typeof id === 'string' && id.length > 0 && id.length <= 1024 && !id.includes('\u0000');
  if (
    !record(value) ||
    !record(value['owner']) ||
    Object.keys(value).some(
      (key) =>
        !['owner', 'assetId', 'revisionId', ...(checksum ? ['manifestSha256'] : [])].includes(key),
    ) ||
    Object.keys(value['owner']).some((key) => !['kind', 'id'].includes(key)) ||
    !['engine', 'world', 'collection', 'creator', 'instance'].includes(
      String(value['owner']['kind']),
    ) ||
    !logicalId(value['owner']['id']) ||
    !logicalId(value['assetId']) ||
    !logicalId(value['revisionId'])
  )
    throw new Error('Invalid scoped asset revision identity.');
  // Composite dependency/pin indexes contain two exact tuples. Bound encoded
  // bytes, including JSON escaping, without restricting authored spelling.
  if (
    utf8.encode(
      JSON.stringify([assetRevisionKey(value as unknown as AssetRevisionIdentity), '0'.repeat(64)]),
    ).length > 1000
  )
    throw new Error('The scoped asset identity exceeds its indexed storage allowance.');
}
export function assertAssetManifest(value: unknown): asserts value is AssetManifest {
  if (
    !record(value) ||
    !['asset', 'source-bundle', 'study', 'release'].includes(String(value['kind'])) ||
    !record(value['files']) ||
    !Array.isArray(value['dependencies']) ||
    !Array.isArray(value['rightsEvidence']) ||
    !value['rightsEvidence'].every(
      (id) => typeof id === 'string' && id.length > 0 && id.length <= 512,
    ) ||
    !record(value['metadata'])
  )
    throw new Error('Invalid immutable asset manifest.');
  assertRevisionIdentity(value['identity']);
  for (const [path, reference] of Object.entries(value['files'])) {
    if (!isRepositoryAssetPath(path)) throw new Error('Unsafe asset manifest member path.');
    assertArtifactReference(reference);
  }
  for (const reference of value['dependencies']) assertAssetRevisionReference(reference);
}
/** Structured keys preserve identity boundaries even for display names containing separators. */
export function assetRevisionKey(reference: AssetRevisionIdentity): string {
  return JSON.stringify([
    reference.owner.kind,
    reference.owner.id,
    reference.assetId,
    reference.revisionId,
  ]);
}
export function sameAssetRevision(
  a: AssetRevisionReference | undefined,
  b: AssetRevisionReference | undefined,
): boolean {
  return (
    a === b ||
    (!!a &&
      !!b &&
      assetRevisionKey(a) === assetRevisionKey(b) &&
      a.manifestSha256 === b.manifestSha256)
  );
}
export function assertAssetBinding(reference: unknown, revision: unknown): void {
  if (reference === undefined && revision === undefined) return;
  if (
    !Number.isSafeInteger(revision) ||
    Number(revision) < 0 ||
    (reference !== undefined && Number(revision) === 0)
  )
    throw new Error('Invalid saved asset binding revision.');
  if (reference !== undefined) assertAssetRevisionReference(reference);
}
export function artifactReferenceKey(reference: ArtifactReference): string {
  return JSON.stringify([reference.boundary, reference.accessDomain, reference.sha256]);
}
export function artifactKey(reference: ArtifactReference): string {
  const suffix = `blobs/sha256/${reference.sha256.slice(0, 2)}/${reference.sha256}`;
  switch (reference.boundary) {
    case 'art-library':
      return `domains/${reference.accessDomain}/${suffix}`;
    case 'runtime':
    case 'art-studies':
      return reference.accessDomain === 'public'
        ? `public/${suffix}`
        : `restricted/${reference.accessDomain}/${suffix}`;
    case 'intake':
    case 'asset-recovery':
      return `domains/${reference.accessDomain}/${suffix}`;
  }
}
/** Named immutable pages/copies stay inside the same declared access boundary. */
export function isArtifactObjectKey(reference: ArtifactReference, key: string): boolean {
  if (!isRepositoryAssetPath(key) || utf8.encode(key).length > 1024) return false;
  if (key === artifactKey(reference)) return true;
  if (reference.boundary === 'art-library')
    return key.startsWith(`domains/${reference.accessDomain}/`);
  if (reference.boundary === 'runtime' || reference.boundary === 'art-studies')
    return key.startsWith(
      reference.accessDomain === 'public' ? 'public/' : `restricted/${reference.accessDomain}/`,
    );
  if (reference.boundary === 'intake') return key.startsWith(`runs/${reference.accessDomain}/`);
  return (
    reference.boundary === 'asset-recovery' &&
    /^(?:origins\/\d{12}\/[a-z0-9.-]+\/|checkpoints\/[^/]+\/|migrations\/[^/]+\/)/.test(key)
  );
}
/** Public URL creation is a configuration operation; it grants no private read access. */
export function assetUrl(reference: ArtifactReference, baseUrl: string): string {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  if (
    !['https:', 'http:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new Error('Asset delivery origin must be a credential-free HTTP(S) URL.');
  return new URL(artifactKey(reference), base).href;
}
export function sameArtifact(a: ArtifactReference, b: ArtifactReference): boolean {
  return (
    artifactReferenceKey(a) === artifactReferenceKey(b) &&
    a.bytes === b.bytes &&
    a.mediaType === b.mediaType
  );
}
export interface AssetClosureLimits {
  maxRevisions: number;
  maxFiles: number;
  maxBytes: number;
  maxDepth: number;
}
export interface ResolvedAssetManifest {
  reference: AssetRevisionReference;
  manifest: AssetManifest;
}
/** Offline publication preparation. A bounded result must also bound visited work. */
export async function assetDependencyClosure(
  roots: readonly AssetRevisionReference[],
  resolve: (reference: AssetRevisionReference) => Promise<AssetManifest>,
  limits: AssetClosureLimits,
): Promise<{
  revisions: ResolvedAssetManifest[];
  files: ArtifactReference[];
  bytes: number;
  members: number;
}> {
  for (const limit of Object.values(limits))
    if (!Number.isSafeInteger(limit) || limit < 0)
      throw new Error('Invalid asset closure allowance.');
  const visited = new Map<string, ResolvedAssetManifest>();
  const active = new Set<string>();
  const files = new Map<string, ArtifactReference>();
  const heights = new Map<string, number>();
  let bytes = 0,
    members = 0,
    edges = 0;
  async function visit(reference: AssetRevisionReference, depth: number): Promise<number> {
    assertAssetRevisionReference(reference);
    if (++edges > limits.maxRevisions || depth > limits.maxDepth)
      throw new Error('Asset dependency traversal exceeds its edge/depth allowance.');
    const key = assetRevisionKey(reference);
    if (active.has(key)) throw new Error('Asset dependency cycle.');
    const prior = visited.get(key);
    if (prior) {
      if (prior.reference.manifestSha256 !== reference.manifestSha256)
        throw new Error('Asset revision has conflicting manifest checksums.');
      const height = heights.get(key)!;
      if (depth + height > limits.maxDepth)
        throw new Error('Asset dependency depth exceeds its allowance.');
      return height;
    }
    if (depth > limits.maxDepth || visited.size >= limits.maxRevisions)
      throw new Error('Asset dependency closure exceeds its revision/depth allowance.');
    active.add(key);
    const manifest = await resolve(reference);
    assertAssetManifest(manifest);
    if (assetRevisionKey(manifest.identity) !== key)
      throw new Error('Asset manifest identity mismatch.');
    visited.set(key, { reference, manifest });
    for (const artifact of Object.values(manifest.files)) {
      if (++members > limits.maxFiles)
        throw new Error('Asset manifest member count exceeds its file allowance.');
      const fileKey = artifactReferenceKey(artifact);
      const existing = files.get(fileKey);
      if (existing && !sameArtifact(existing, artifact))
        throw new Error('Conflicting asset file metadata.');
      if (existing) continue;
      if (files.size >= limits.maxFiles || artifact.bytes > limits.maxBytes - bytes)
        throw new Error('Asset dependency closure exceeds its file/byte allowance.');
      files.set(fileKey, artifact);
      bytes += artifact.bytes;
    }
    let height = 0;
    for (const dependency of manifest.dependencies)
      height = Math.max(height, 1 + (await visit(dependency, depth + 1)));
    active.delete(key);
    heights.set(key, height);
    return height;
  }
  for (const reference of roots) await visit(reference, 0);
  return { revisions: [...visited.values()], files: [...files.values()], bytes, members };
}

/** Preserve absent membership rather than trusting inherited JavaScript properties. */
export function indexedAsset(index: AssetIndex, path: string): ArtifactReference {
  if (!own(index.files, path))
    throw new Error(`Asset is absent from the selected release: ${path}`);
  return index.files[path]!;
}
