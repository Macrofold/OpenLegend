# Game asset storage, delivery and art studies — technical design

| Status      | Current progress                                                                                                        | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | The architecture and S3 layout are specified; infrastructure, publication, consumers and migration are not implemented. | 2026-10-17   |

The [feature specification](game-asset-storage-feature-spec.md) owns the desired behavior. Mike accepted external storage, deliberate cross-boundary copies, reference reuse and durable documentation URLs. Concrete limits below remain proposed until implementation qualification. Names containing braces and the `example.com` URLs are templates, not provisioned resources.

Design work changes zero executable lines. Scope: one storage/reference design, its implementation/limits owners, and reconciliation of deployment/art/guidance documents. Future implementation is cross-layer and material around privacy, publication, retention and history removal; estimate each stage from its then-current callers. Required design checks are full affected-diff review, local links/anchors, formatting and guidance routing. No infrastructure purchase, upload, asset deletion or history rewrite follows from this documentation task.

## 1. Ownership and integration

| Owner                                                    | Responsibility                                                                                                    | Boundary                                                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Authored world package                                   | Select logical appearances, style, supported depiction and permitted content dependencies                         | Base-world choices stay under `packages/domain/src/worlds/base/` and `docs/worlds/base/`; other worlds own their own selections |
| Existing appearance/publication service and repositories | Rights, exact revision lookup, publication/selection records, dependency pins and permitted client projection     | One semantic publication owner; no new world mutation authority or mandatory microservice                                       |
| Asset tooling                                            | Import, source bookkeeping, existing Blender export, checksums, study capture and selective local materialization | Offline or explicitly scheduled; no provider work in the game loop                                                              |
| S3 store adapter                                         | Exact bounded read/write/checksum and transfer of named objects                                                   | Does not decide who may publish, see or reuse an asset                                                                          |
| Existing client resource owners                          | Fetch/verify/prepare permitted assets, reuse resources, reject stale loads, swap and dispose                      | Keep `WorldRenderer`, scene/model/scenery owners and their fallback/lifetime contracts                                          |
| Deployment owner                                         | Select qualified release/configuration in dev, preview, staging and production                                    | Asset publication and application deployment are related explicit records, not the same revision counter                        |
| Study publisher                                          | Build safe gallery pages from exact study manifests and record review decisions                                   | A gallery selection cannot publish gameplay content                                                                             |
| Recovery/retention operator                              | Protected copies, restore, deletion candidates and withdrawal reconciliation                                      | Separate from normal game/upload credentials                                                                                    |

Reuse the proposed V3D02/PD05 immutable appearance boundary and INV's durable art owner. The initial implementation may be one server module plus a CLI using the existing PostgreSQL repositories and a local-cache/S3 adapter. Do not add a queue service, search cluster, asset microservice or alternative database merely to move files out of Git.

The current `study-assets.ts`, `art-study.ts`, direct GLB imports and `library-scenery.ts` consume bundled files; their future replacement reads exact catalog references through the existing loading owners. A blanket URL replacement is insufficient: the inspector currently emits original GLBs/Blender sources into the client build, and large scenery JSON must leave the JavaScript dependency graph too. Keep the code-defined generator where appropriate and externalize substantial output.

## 2. Physical storage and accounts

Use separate production and nonproduction AWS accounts as in the deployment proposal, plus a separately controlled recovery account. Keep the durable art library and studies in the production account initially, in dedicated tooling buckets and stacks with distinct roles; they are not part of an application/staging destroy operation. A later dedicated content account can replace that placement without changing logical references. Authorized artists may read library content from their workstations; ordinary nonproduction game roles receive no such access.

Bucket-name template: `ol-{account-id}-{region}-{purpose}`. Purposes below are fixed deployment roles; infrastructure validates actual S3 naming/length and global availability. Region is the bucket's actual region. Use one bucket per trust/lifecycle role, not per animal, file type, artist, engine version or world instance.

| Purpose          | Account                                | Access and lifetime                                                                                                                                                   |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `art-library`    | Production                             | Private durable originals, editable sources, candidates and provenance; authoring/publication roles only                                                              |
| `art-studies`    | Production                             | Durable study iterations, review media and gallery output; authenticated by default; explicitly cleared public subset                                                 |
| `runtime`        | Nonproduction and production, one each | Only qualified delivery files/manifests; nonproduction covers dev/previews/staging through explicit release selections                                                |
| `intake`         | Nonproduction initially                | Untrusted downloads, resumable incoming transfers and disposable conversion work; no CloudFront origin; add production intake only with authorized runtime generation |
| `asset-recovery` | Recovery                               | Verified retained objects and metadata checkpoints, isolated writer/restore roles; approved recovery region                                                           |

Enable S3 Block Public Access and disable object ACL ownership ambiguity. Use encrypted transport/storage and least-privilege roles; restrict keys separately where the approved deployment requires KMS. CloudFront accesses regular bucket origins through origin access control, not S3 website endpoints. Public delivery is a CloudFront behavior, not a public-write/read bucket. Library/source contents are never exposed simply by attaching a domain. [AWS origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).

Production and nonproduction delivery copies are intentional isolation. Study-local copies are allowed when they make the archive independently retrievable or establish a different access/retention boundary. Prefer references inside a boundary; never require cross-account live reads just to save a small copy. Record copy reason and source/destination checksums in a transfer receipt. No public deduplication/existence endpoint may expose another creator's private files.

## 3. Identity and reference contract

Do not overload these values:

| Value               | Meaning                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Owner reference     | Structured owner kind and exact ID: engine package, world package, curated collection, creator or world instance             |
| Asset ID            | Stable identity allocated by the application/catalog owner; display name and category can change                             |
| Asset revision ID   | Immutable logical asset description and representations; new authored content or meaningful metadata requires a new revision |
| Blob SHA-256        | Checksum of exact stored file bytes; identical permitted bytes can be shared within a boundary                               |
| Manifest SHA-256    | Checksum of the exact immutable serialized manifest bytes; independent of its allocated revision ID                          |
| Pack/release ID     | Exact compatible set of asset references/dependencies; a deployment selects one release                                      |
| Schema/tool version | Format interpretation and preparation provenance, not the identity of every file it processed                                |
| S3 VersionId        | Storage recovery locator only; not an art revision, game reference or release identity                                       |

Revision IDs are allocated before serialization, so there is no self-hash cycle. Hash the final manifest byte serialization; do not rebuild signed/digested JSON with a different property order on retrieval. Retain the current supported schema and explicit validation; no legacy format reader is introduced.

An artifact reference carries storage-class/boundary ID, access-domain ID when applicable, checksum, byte length and media type. The registry derives the exact key; it does not accept arbitrary browser/provider URLs as trusted file locations. Logical asset references retain owner kind/ID, asset ID, revision ID and manifest checksum. Use structured tuples, not ambiguous delimiter concatenation. Arbitrary authored IDs are mapped to stable URL-safe storage IDs by their owner; do not sanitize two different names into the same path. Renaming display prose does not allocate a new identity.

An immutable asset revision describes representations/dependencies, dimensions/axes/pivot, state/animation coverage, relevant renderer/family/style compatibility and provenance/rights references. Shared V3D representation contracts remain canonical; this design adds storage references rather than copying their schema. A source `AssetRevision` may include private lineage; a derived runtime manifest contains only permitted information, has its own checksum and references that logical revision. Private prompts, source paths and hidden dependencies must not leak into its projection.

## 4. S3 directory contract

S3 has object-key prefixes rather than real directories. The following trees are the normative organization. The two-character hash prefix distributes browsing/administrative work; it is not a capacity claim. File bytes have one canonical key per bucket/access domain and checksum, without a filename extension. Media type is validated metadata; downloads provide a safe descriptive filename. Tags and indexes are derived conveniences, never sole authority for rights or deletion.

### 4.1 Art library

```text
art-library/
  domains/{access-domain-id}/
    blobs/sha256/{first-2-hex}/{full-sha256}
    catalogs/
      engine/{engine-package-id}/assets/{asset-id}/revisions/{revision-id}.json
      worlds/{world-package-id}/assets/{asset-id}/revisions/{revision-id}.json
      collections/{collection-id}/assets/{asset-id}/revisions/{revision-id}.json
      creators/{creator-id}/assets/{asset-id}/revisions/{revision-id}.json
      instances/{world-instance-id}/assets/{asset-id}/revisions/{revision-id}.json
    packs/{pack-id}/revisions/{pack-revision-id}.json
    provenance/{record-id}/revisions/{revision-id}.json
    reviews/{review-id}.json
    transfers/{transfer-id}.json
```

An access domain groups records with the same permitted audience/security policy; it is not automatically one domain per asset or entity. Instance/creator prefixes are consumed only when private/generated authorship exists. Metadata and children are authorization-scoped too. A private source and a redistributable derivative can occupy different domains; the publisher records the allowed transition.

Human browsing uses catalog fields such as `category: wildlife/mammals`, title, species, role, tags, source creator and approval state. These fields do not rename blob paths. A wolf can belong to both a woodland study and a wilderness pack without duplicated bytes. “Shared collection” is a licensing/catalog concept; reuse by two worlds does not make a wolf an engine-owned asset.

### 4.2 Runtime buckets

```text
runtime/
  public/
    blobs/sha256/{first-2-hex}/{full-sha256}
    manifests/assets/{owner-kind}/{owner-id}/{asset-id}/{revision-id}.json
    manifests/packs/{pack-id}/{pack-revision-id}.json
    releases/{release-id}/manifest.json
  restricted/{access-domain-id}/
    blobs/sha256/{first-2-hex}/{full-sha256}
    manifests/assets/{owner-kind}/{owner-id}/{asset-id}/{revision-id}.json
    manifests/packs/{pack-id}/{pack-revision-id}.json
    releases/{release-id}/manifest.json
  receipts/promotions/{promotion-id}.json
```

Only `public/` and explicitly authorized `restricted/` paths are eligible delivery origins. Material must already be cleared for public distribution before entering `public/`; an unselected public file may be retrievable by its exact URL, so the later selection transaction is not a privacy barrier. Private drafts remain restricted. Promotion receipts are operator records, not public media. A production release is complete within its declared delivery boundaries; it cannot depend on temporary preview keys, an artist's local disk, source-vendor hosting or nonproduction credentials.

There is deliberately no physical copy under every `engine-version/world-version/environment` combination. Packs pin selected asset revisions and compatible profiles; immutable releases select packs and any permitted instance additions. Nonproduction channel selection distinguishes `dev/{workspace-id}`, `preview/{preview-id}` and `staging`; production selection identifies its qualified release. Channel pointers live at the existing release/publication owner, not in a second mutable `latest.json` on S3. Application release records pin both code and asset releases. An independently published art revision does not automatically update every deployment or saved world.

### 4.3 Study archive

```text
art-studies/
  public/                         # only explicitly cleared studies
    blobs/sha256/{first-2-hex}/{full-sha256}
    studies/{year}/{study-id}/
      iterations/{iteration-id}/manifest.json
      iterations/{iteration-id}/index.html
      reviews/{review-id}.json
  restricted/{access-domain-id}/
    blobs/sha256/{first-2-hex}/{full-sha256}
    studies/{year}/{study-id}/
      iterations/{iteration-id}/manifest.json
      iterations/{iteration-id}/index.html
      reviews/{review-id}.json
```

Use a readable immutable study ID such as `2026-10-17-grounded-animal-gaits` and an allocated iteration ID; validate uniqueness on creation. Dates describe creation in UTC; a display timezone is additional metadata. Cross-world studies list related owner references rather than choosing an arbitrary world folder. Do not relocate older studies when their title, category or preferred asset changes.

Media entries identify file reference, capture role, variant/pose, dimensions/duration and provenance. Multiple iterations can reference the same source, model or capture. Source-model dependencies normally point into the library with a retention pin; a study copy is explicit when needed for access or independent preservation. A public gallery never embeds a restricted source link that discloses private identifiers, nor does it turn a private file public by reference.

Generated HTML uses a reviewed static template and escaped metadata; imported HTML/scripts are not executed. An interactive viewer is trusted application code identified by build digest and served on its approved tooling origin, with restrictive CSP. Keep preview code and cookies isolated from the production game. Pin its version and parameters in the study, preserve captures independently, and label any later-renderer reconstruction. Do not promise indefinite execution of obsolete application code.

The browse/search index and current-study selection are derived from the metadata owner and can update. Specific iteration pages and reviews are immutable. A later note is another review record; its presence does not rewrite the original capture.

### 4.4 Intake and recovery

```text
intake/
  runs/{run-id}/incoming/{file-id}
  runs/{run-id}/scratch/{file-id}
  runs/{run-id}/reports/{report-id}.json

asset-recovery/
  origins/{source-account-id}/{source-bucket-name}/{original-object-key}
  checkpoints/{checkpoint-id}/manifest.json
  checkpoints/{checkpoint-id}/metadata/{file-id}
  migrations/{migration-id}/inventory.json
  migrations/{migration-id}/git-history/{file-id}
```

Intake is non-executable quarantine. Bound archive expansion, redirects, external dependencies and transfer work under the existing pipeline admission. A completed candidate is copied/verified/pinned in durable storage before temporary cleanup. A source bundle may retain its internal file layout, with an inventory of members and dependencies; avoid unpacking whole vendor libraries into every task.

Recovery uses bounded, resumable copy jobs through the same planned exact-transfer adapter to write the namespaced destination keys above. Native S3 replication selects a destination bucket but does not add this origin prefix; do not configure several source buckets into one replica bucket and assume key collisions are avoided. Retain source key/version, checksum and exact destination VersionId in checkpoints; never infer that a source VersionId equals its copied destination version. A checkpoint ties verified objects to metadata/publication/pin records and current operational restrictions. A raw copied bucket without that checkpoint is not a complete recovery boundary. [AWS replication configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html), [object copying](https://docs.aws.amazon.com/AmazonS3/latest/userguide/copy-object.html).

## 5. URL and repository contract

Configure verified owned hostnames centrally; the following are examples only:

| URL form                                                                                    | Meaning                                                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `https://assets.example.com/public/blobs/sha256/{aa}/{hash}`                                | Production public immutable runtime bytes                                        |
| `https://assets-staging.example.com/...`                                                    | Nonproduction delivery; access-controlled preview/staging content as appropriate |
| `https://studies.example.com/studies/{year}/{study-id}/iterations/{iteration-id}/`          | Stable study page; access checked for restricted studies                         |
| `https://art.example.com/assets/{owner-kind}/{owner-id}/{asset-id}/revisions/{revision-id}` | Stable authenticated asset record/source-download page                           |

Study/asset page routes resolve permitted records to their exact S3 keys; they are not bucket-wide listing APIs. Immutable inline media routes map to the appropriate public/restricted blob path. Public file URLs can point directly to CloudFront. Private documentation uses the stable page route; a login/session supplies fresh scoped download access. Short-lived signed URLs/cookies are transport credentials and never persisted as asset identity, committed to Markdown or used as permanent citations. [CloudFront signed URLs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html).

Documentation should use revision-specific pages for evidence and original-byte download links when needed. A “current selection” landing page is acceptable for navigation, labeled as mutable. Human links, Markdown images, gallery media, catalogs, source credits and downloadable study bundles all use the same generated URL mapping. Keep third-party source URLs as attribution alongside our retained-artifact reference.

Git retains:

```text
scripts/                         # existing preparation and future asset CLI
assets/bootstrap/                # explicit tiny offline necessities only
assets/locks/{named-profile}.json # small exact release/manifest pins
packages/domain/src/worlds/base/  # world-owned logical selections, no cloud I/O
art-direction/studies/{study-id}/README.md  # notes and hosted revision URLs
docs/                            # specs, decisions, evidence summaries, URL links
```

This is a target layout, not a declaration that new directories/tools already exist. Keep ordinary small source-native UI SVGs/shaders in their existing owners when they satisfy the explicit bootstrap/code policy; do not relocate them solely for a new folder convention. Other world packages carry their own authored selections. Resolved release lock files are derived pins, not a second writable source of world rules.

The tiny-asset exception is explicit and reviewed, not “all files below a threshold.” Proposed size guardrails and allowlist behavior are in [AST01](../limits/game-asset-storage.md#ast01--git-and-bootstrap-assets). Metadata size is checked too; encoded textures, minified geometry and base64 do not bypass the policy. The eventual guard checks new Git blobs and generated build output, not just filenames. Existing binaries remain inventoried migration work; adding a rule does not claim they have been removed.

## 6. Records, indexes and publication

Use immutable manifests for file descriptions and lineage. PostgreSQL owns access, publication decisions, selection/binding revisions, transfer outcomes and reference pins; searchable catalog fields are rebuildable projections of manifests. Never make S3 tags, a public gallery or a browser preference a competing writable authority.

Required logical records (reuse existing repository abstractions; these names describe responsibilities, not mandatory new classes):

- Asset revision and representation manifests with exact dependency references, checksums, source/rights and qualification references.
- Pack/release manifest with exact members, dependency closure, relevant engine/world/style/decoder compatibility, license bundle and bootstrap/scene groups. Public and restricted closures are separate permitted projections.
- Study iteration manifest and append-only review/selection records, including captures and viewer provenance.
- Publication/transfer record with operation identity, expected prior binding, source/destination boundaries, prepared/committed outcome and intended copy reason.
- Retention pin tying an owner (release, save, study, source lineage, supported export or active operation) to an exact revision/dependency set.
- Derived searchable catalog and reference indexes. Direct reads use full scoped keys; reverse references support retention/takedown without a whole-bucket scan per action.

Indexes must support exact scoped revision lookup, owner/category browse with cursors, study/date lookup and reverse dependency/pin lookup. Published file reads and scene preparation never enumerate the entire library. Publication compiles/validates one dependency closure once under byte/record/depth/time limits; reject cycles or excessive work explicitly, rather than silently dropping a dependency. Dependencies are a bounded directed acyclic graph for the first implementation; the inventory records this format choice.

This graph contains required file/manifest dependencies, not every descriptive relationship: “reviewed in study X” can point back to a study that references the model without recursively fetching it. Classify hard dependencies, retention pins and optional lineage/navigation links explicitly. A large pack uses immutable member/index pages or scene groups with exact child digests; the client fetches the relevant permitted group, not a growing world-wide list. Compiling the complete release closure is bounded offline publication work, never repeated per player/frame.

Publication sequence:

1. Admit the operation, rights, destination and total work/spend; allocate its durable identity and protect the prepared input dependencies from cleanup. Before each output upload, reserve its exact destination key under that operation so collection cannot delete prepared outputs before final publication; commit converts these claims into durable pins, while interrupted operations retain recoverable claims.
2. Hash and upload each missing file to its exact destination. Use conditional creation and verify matching checksum/length/media type on an already-existing key. Do not interpret an ETag as our SHA-256. Multipart/checksum behavior is qualified with the pinned SDK.
3. Validate the actual prepared exports, dependency availability and allowed projection. Write immutable child manifests and then the enclosing release/study manifest. Every named byte must be durable before the manifest can be selected.
4. In the publication owner's transaction, recheck current rights and expected binding, commit exact manifest locator/digest plus dependency pins and record the operation outcome. A competing selection causes a truthful conflict, not overwrite.
5. Publish refresh/selection information through existing paths. Lost acknowledgement is recovered by exact operation identity; already-committed publication is not repeated. Unselected candidates remain explicit artifacts, not half-installed world content.

Use `If-None-Match: *` for immutable creation where supported and enforce the corresponding writer policy. A precondition failure is success only after verifying the existing object. AWS's condition checks the current object; delete markers can permit a new write, so ordinary publishers must not delete immutable keys or bypass conditional writes. Versioning alone does not prevent overwrites. [AWS conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html).

Cross-bucket/account promotion records a copy of the same verified bytes, verifies destination closure, then publishes there. Never move the sole source or mutate a study's old references. Reusing an existing digest is allowed only after the caller's logical reference rights are established; hashes do not grant access.

## 7. Environments, local cache and offline use

| Environment       | Asset selection and credentials                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Local development | Checked-in named lock or explicitly selected study/asset revisions; read-only fetch access; cached exact files served by the local dev server |
| Untrusted CI/fork | Tiny repository bootstrap plus deliberately public fixture pack; no library, private study or deployment credentials                          |
| Trusted CI        | Short-lived scoped credentials; exact named integration fixtures/release; separate authoring and deployment jobs                              |
| Preview           | Expiring deployment selection in nonproduction; explicitly selected files and restricted audience; no production-private world content        |
| Staging           | Exact production candidate release, qualified on the actual consumer and target configuration                                                 |
| Production        | Destination-verified qualified release; CloudFront read delivery; publication privileges absent from game clients                             |

Use one configured local cache root outside all worktrees, defaulting to the operating system's user-cache location under `OpenLegend/assets`. Partition it by remote trust boundary, access domain and checksum. The reusable bytes are read-only. Materialize only requested files into a task workspace; editable Blender sources get real copies or safe copy-on-write clones, never writable hard links into shared cache. Strip expired private scope access from browsing/use and do not share a private user's cache across OS users.

For human work, materialize a readable layout such as `workspaces/{task-id}/sources/{owner-id}/{asset-id}/{revision-id}/` and `workspaces/{task-id}/outputs/{iteration-id}/{variant-id}/`. These are mutable local folders, not S3 identity. A source-bundle manifest preserves each member's logical relative path and checksum so Blender textures/linked dependencies remain resolvable; safely reconstruct those relative paths without absolute-path or traversal escapes. Fetching an editable model includes its required source dependencies, not just the `.blend` file. Importing models and textures from several creators does not merge their licenses or authorship.

Proposed CLI responsibilities are `assets pull`, `assets inspect`, `assets publish-study`, `assets publish-release`, `assets verify` and `assets cache-prune`; these are interface examples, not existing executable commands. Pull accepts an exact lock/release, study iteration or asset revision; whole-library sync is an explicit operator export. Verify streaming downloads into temporary paths, atomically finalize after digest checks, coalesce identical in-flight reads and coordinate concurrent processes. Failed partials are never served as complete files. Resume only when exact object identity and range semantics are established; otherwise restart the bounded transfer.

Local cache eviction observes byte budgets and active-use pins, including Blender work and running dev servers. If every file is pinned, report capacity exhaustion instead of deleting active content. Mutable task workspace output is separate from the disposable cache and is published/preserved before cleanup. Offline packaging contains only the selected closure and its lock/licenses under an explicit permission for offline use. Cached bytes alone do not grant access to a private pack. Restricted offline use follows its recorded grant and expiry; immediate revocation cannot be guaranteed while disconnected. The interface must state that limit rather than promise a live permission check or silently enable every historical source.

CORS allows required GET/HEAD/range behavior from named consumer origins; it is not authorization. Set MIME types, CSP media/connect origins and consistent cache headers. Public immutable bytes can use long caching. Restricted delivery checks access before cache use, has policy-defined credential/cache lifetimes, and does not get a public immutable cache policy by default. Range responses, videos, large GLBs and errors must be exercised through the actual CDN/browser.

## 8. Performance and cost contract

Cost grows with retained revisions/media, closure size, concurrent downloads, visible distinct representations, decoded geometry/textures, active comparisons and history indexes. Do not equate compressed download bytes with browser/GPU memory.

Shared preparation: checksum/validation and dependency closure at publication; immutable decoded assets/materials through existing client owners; local downloads across worktrees and CDN/browser cache reuse across repeated appearances. Reuse keys include the exact artifact revision and access boundary. Rights/binding changes invalidate selection/access; a new revision fetches new bytes. Camera motion and unrelated world changes do not redownload art or recompile manifests.

Prioritize the starting visible scene, then bounded look-ahead work. Limit active and queued transfers by bytes as well as count; keep decode/GPU-upload work bounded and release superseded comparisons. Do not load all historical alternatives, source controls or full-world private catalogs to select one appearance. Optional preview capture and conversion remain outside the render/simulation critical path. No per-frame storage or database lookup is introduced.

Measure through complete fresh-checkout, cold-browser, warm-scene, multi-worktree and study-open journeys: unique bytes/files requested, queued/in-flight bytes, cache hits, parse/decode/upload timings, render stalls, retained memory, build size, storage/requests/CDN costs and restoration latency. Compare matched scenes. Existing A3D render budgets remain; new storage/queue/catalog bounds are tracked in [AST](../limits/game-asset-storage.md), with unqualified numbers identified before production use.

## 9. Retention, backups and withdrawal

Start conservatively: no automatic deletion of published runtime files, durable source/library versions or preserved study iterations. Pins include exact transitive dependencies, active publications, retained supported saves, approved exports and active production inputs. A huge retained library does not justify scanning it during gameplay. Storage accounting tracks unique and intentionally copied bytes separately; alerts/admission limits stop new optional production before losing retained work.

Intake has a distinct cleanup policy. A run explicitly marked terminal/disposable can expire after its configured grace period; preserved/published dependencies must have been copied and verified first. Abort stale incomplete multipart uploads. Never apply an age-only lifecycle rule to retained blob prefixes or assume an old file is unused.

Future garbage collection is an explicit reference-aware stage: compute a bounded candidate set against a consistent pin generation, mark candidates, wait a grace period, and recheck current pins/in-flight publications and holds under the same exclusion protocol used by publication before deleting. Pin creation must cancel/block a pending deletion. GC is disabled until race and recovery checks pass. Moving genuinely cold sources to an archive storage class requires an explicit retrieval expectation; current game files and ordinary study videos stay immediately retrievable.

Enable versioning on durable buckets, plus a protected copy in the recovery account and a recovery checkpoint for catalog/publication/pin metadata. Production roles cannot administer/delete recovery copies. Configure retention against actual privacy/license obligations; no blanket irreversible Object Lock policy is assumed. The namespaced copy/checkpoint process is asynchronous: record completed coverage, explicitly backfill existing data, alert on lag and qualify its recovery window. Do not treat an enqueued copy as protected data. Native replication, if later adopted with a compatible destination layout, is also asynchronous and does not automatically backfill pre-existing objects. [S3 versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html), [S3 replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html).

Rehearse restoration into an isolated destination: restore manifests/bytes and metadata checkpoint, verify checksums and closure, reconcile current grants/withdrawals/erasure records, then test a retained game release and study. Backup success alone is not restore success. Account/region, recovery objectives and costs belong to deployment configuration before execution; do not invent an achieved RPO/RTO.

Withdrawal records affected logical revisions/scopes, removes active selection/grants, blocks new delivery and purges controlled CDN entries where applicable. Retained pages show an accurate unavailable/takedown record without substituting bytes. Already delivered files, including private downloads, cannot be recalled merely by revoking access. Any required deletion also covers replicas/checkpoints under the owning retention/privacy policy; a recovery job must not resurrect withdrawn access.

## 10. Migration from this repository

1. Inventory current files, relevant external authoring folders, all reachable asset blob versions in the explicitly selected refs/tags, and every inbound asset link/import. Include renamed paths, large generated JSON, originals, licenses, screenshots/videos and study viewer code provenance. Preserve supplied attachments only when they are relevant and permitted. Report history outside the inventoried refs rather than claiming every possible lost object was recovered.
2. Create a recoverable Git snapshot/bundle and an inventory mapping original commit/path/blob identity to storage reference/checksum. Store them in protected recovery storage. Inventory first; no source deletion or history rewrite at this stage.
3. Publish library/study records and intentional destination copies, verify all required files/rights/dependencies, backfill recovery and prove restoration. Recoverable past art must remain accessible before Git stops being its durable home.
4. Replace direct model/source imports and large generated scenery modules with exact catalog loading at the existing consumers. Keep a tiny explicit bootstrap and a selected release lock. Split study tooling from game build outputs; source/editable assets never enter the player distribution by glob.
5. Publish actual owned-domain URLs and generate a migration link map. Rewrite active docs, retained study pages, Markdown images, download links and catalog references in the same change; verify private links with authorized and unauthorized access and public links without credentials. Preserve original historical provenance as metadata. No placeholder URLs, expired query tokens, symlinks into a developer's home or temporary dev servers satisfy this gate.
6. Prove a fresh checkout, clean local cache, trusted/untrusted CI paths, actual game and study rendering, offline selected pack, interruption/rollback and same-version save dependency retention. Inspect the complete build for leaked sources/private files. Add the new-asset Git/build guard; remove tracked binary copies only after these checks.
7. Coordinate an explicit history-cleanup plan separately: exact repository/remote refs, branches/tags, PRs, worktrees/clones, backup/restore, commit mapping and contributor resynchronization. A deletion commit alone cannot shrink old reachable blobs. A rewrite changes commit IDs and needs separate authorization; never force-push, prune the shared object database or reset another worktree as a side effect of asset migration.

Preserve a prior-commit-to-recovery mapping for recipes and historical studies if history cleanup changes the code references they cite. The existing no-legacy-support development policy is unchanged: archival access to earlier artwork does not require keeping previous runtime adapters or incompatible save readers alive.

## 11. Stages, verification and configuration inputs

[AS01–AS08](../maintainers/game-asset-storage.md) owns implementation sequencing. The storage foundation and art-study migration can precede the full production world rollout; hosted game qualification still consumes PD05, V3D02/V3D03 and the relevant save/rights owners. Keep numerical tuning in the [limits inventory](../limits/game-asset-storage.md), not several trackers.

Required scenarios include the existing mercenary/deer source-study chain; two worlds referencing one public tree; a private invention with identical bytes to a public model but different reference rights; an engine-owned fallback icon; an audio file; a study reused after its preview expires; a lost publication acknowledgement; conflicting selections; corrupt/partial files; cache eviction while a file is active; revoked access; and restore under newer withdrawal records. These are qualification requirements, not claims that those future scenarios are already implemented.

No unresolved owner decision blocks this design. Before provisioning, the operator must supply verified account IDs, primary/recovery regions, owned hostnames, access groups, approved spend/recovery objectives and the inventoried migration ref set. These are explicit deployment inputs rather than guessed resources. Public release, external uploads and Git rewriting retain their own authorization. Tiny bootstrap, local cache and temporary retention numbers are proposed conservative defaults, with failure behavior and tuning owners recorded.

## Maintained records

- Behavior: [Feature specification](game-asset-storage-feature-spec.md).
- Implementation: [AS01–AS08](../maintainers/game-asset-storage.md).
- Limits: [AST01–AST08](../limits/game-asset-storage.md).
- Shared contracts: [Identity](../identity-and-references.md), [save/load](../save-and-load.md), [engine/world boundaries](../engine-and-world-boundaries.md), [3D asset pipeline](3d-pixel-art-asset-pipeline.md), [deployment playbook](production-deployment-playbook.md).
