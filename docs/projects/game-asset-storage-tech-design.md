# Game asset storage, delivery and art studies — technical design

| Status      | Current progress                                                                                                   | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Curated delivery and current-world owner selection pass; separately gated Git history reclamation remains in AS08. | 2026-10-18   |

**Technical design used for implementation review:** 2026-10-18 04:00:12 UTC. [Actual review evidence](../verification/game-asset-storage.md#implementation-review) remains separate from the design contract.

The [feature specification](game-asset-storage-feature-spec.md) owns the desired behavior. Mike accepted external storage, deliberate cross-boundary copies, reference reuse and durable documentation URLs. The implementation below is the supported curated path; [AS](../maintainers/game-asset-storage.md) and [verification](../verification/game-asset-storage.md) distinguish completed checks from remaining acceptance. Configured limits are admission policies, not measured service capacity. Names containing braces are key/command templates, not published evidence links.

Implementation crosses privacy, publication, retention and migration boundaries. Estimate each stage from its then-current callers and qualify its complete consumer journey before enabling it. The [implementation tracker](../maintainers/game-asset-storage.md) owns delivery and verification; this design is not evidence of provisioned infrastructure or permission to delete assets or rewrite history.

## 1. Ownership and integration

| Owner                                               | Responsibility                                                                                                    | Boundary                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Authored world package                              | Select logical appearances, style, supported depiction and permitted content dependencies                         | Base-world choices stay under `packages/domain/src/worlds/base/` and `docs/worlds/base/`; other worlds own their own selections |
| Server asset repository and publication coordinator | Rights, exact revision lookup, publication/selection records, dependency pins and permitted client projection     | One semantic publication owner; no new world mutation authority or mandatory microservice                                       |
| Asset tooling                                       | Import, source bookkeeping, existing Blender export, checksums, study capture and selective local materialization | Offline or explicitly scheduled; no provider work in the game loop                                                              |
| S3 store adapter                                    | Exact bounded read/write/checksum and transfer of named objects                                                   | Does not decide who may publish, see or reuse an asset                                                                          |
| Existing client resource owners                     | Fetch/verify/prepare permitted assets, reuse resources, reject stale loads, swap and dispose                      | Keep `WorldRenderer`, scene/model/scenery owners and their fallback/lifetime contracts                                          |
| Deployment owner                                    | Select qualified release/configuration in dev, preview, staging and production                                    | Asset publication and application deployment are related explicit records, not the same revision counter                        |
| Study publisher                                     | Build safe gallery pages from exact study manifests and record review decisions                                   | A gallery selection cannot publish gameplay content                                                                             |
| Recovery/retention operator                         | Protected copies, restore, deletion candidates and withdrawal reconciliation                                      | Separate from normal game/upload credentials                                                                                    |

`packages/assets` owns pure exact references, immutable manifests, lock validation and bounded dependency traversal. `apps/server/src/asset-repository.ts` owns PostgreSQL access, publication records, selections, recovery authority and pins; `asset-publication.ts` coordinates its admitted transfers. `asset-storage.ts` owns exact S3 I/O, `asset-cache.ts` owns verified local bytes and `asset-runtime.ts` composes delivery. CLI workflows use these owners in process through the existing exclusive writer; read-only viewers/pulls coexist with the game. The curated game currently saves one exact presentation release. Per-entity/generated appearance production and representation qualification remain with V3D/INV; they consume this foundation rather than creating a second registry. Do not add a queue service, search cluster, asset microservice or alternative database merely to move files out of Git.

Keep four responsibilities separate within ordinary modules, extracting packages only for actual shared consumers:

- Pure reference/manifest validation and dependency traversal: reusable by publication, CLI verification and consumers, with no AWS, database, browser or fictional-world policy dependency.
- Publication and access: the server owns durable operations, rights, selections and pins. CLI and future generated-art callers use the same admitted operations; they cannot directly write catalog authority or bypass publication through a raw bucket upload.
- Exact storage transfer: the S3 adapter reads/writes named bytes and reports verified outcomes. The local cache composes that transport with atomic files, disk reservations and active-reader ownership; it is not an alternative publication database.
- Consumer preparation: existing client resource owners decode and install permitted representations; study tooling builds galleries from permitted records. Neither defines another identity scheme, dependency resolver or rights registry.

The domain retains logical appearance/definition references and authored world selections, never AWS keys, signed URLs or cloud I/O. The server resolves those references into permitted delivery descriptions. A renderer failure changes depiction only; published mesh bounds and catalog tags cannot become collision, reach, species rules or character knowledge. A shared wolf remains world/collection content; an engine fallback icon serves a generic presentation need. An audio file uses the same storage/reference contract without inheriting a mesh or animation schema.

The client study and game loaders read exact selected asset references through their existing loading owners. The game build contains small exact references, while study tools have a separate build and source/editable files remain external. Generated mesh/animation data, recorded scenery and vector/icon bundles are fetched through exact references rather than entering the JavaScript dependency graph, regardless of file size. Code-defined generators, shaders and JSX drawing code stay with their source owners; exported asset output is external.

The ordinary game bootstrap awaits its shared optional icon request; importing an icon component does not suspend standalone scene loading. Exact browser reads refuse redirects and release failed response bodies before decoder use. Resource owners retain and dispose partially constructed cloth nodes/meshes and failed face uploads, including failures before an actor receives the completed resource.

## 2. Physical storage and accounts

Mike selected one AWS project, `027677879749`, in `us-east-2`, with separate retained buckets and narrowly scoped roles for production delivery, development delivery, sources, studies, intake and recovery. Durable sources/studies are outside application/staging teardown. Recovery credentials are separate from publication credentials; this protects ordinary operational mistakes but cannot survive project-wide compromise/loss or Region failure. A future separately controlled project changes deployment mapping without changing logical references. Authorized artists may read library content; ordinary game roles cannot. Permanent links use `https://assets.openlegend.ai`, with runtime and study paths routed to their separate origins. Mike approved public access to the migrated current art, sources and studies; private capabilities remain available for future content. Public accessibility does not establish production licensing.

`assets/config.json` supplies the verified physical mapping; `assets/delivery.json` supplies owned delivery origins. CloudFormation outputs supply the actual bucket/role names; names are not reconstructed from a guessed template. Use a bucket per trust/lifecycle role, not per animal, file type, artist, engine version or world instance. The current external production-runtime bucket and separate nonproduction/runtime origins are recorded explicitly. Publication receipts retain every actual physical environment, even when both publish the same logical release.

Logging setup selects an explicit credential-free field list. Reusing an existing delivery requires reading and matching its actual fields; drift or missing field information refuses setup rather than reporting credential omission without evidence. Reconcile a refused delivery explicitly before retrying.

| Purpose          | Account                                 | Access and lifetime                                                                                                                                                   |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `art-library`    | OpenLegend project                      | Private durable originals, editable sources, candidates and provenance; authoring/publication roles only                                                              |
| `art-studies`    | OpenLegend project                      | Durable study iterations, review media and gallery output; authenticated by default; explicitly cleared public subset                                                 |
| `runtime`        | OpenLegend project, one per environment | Only qualified delivery files/manifests; nonproduction covers dev/previews/staging through explicit release selections                                                |
| `intake`         | OpenLegend project                      | Untrusted downloads, resumable incoming transfers and disposable conversion work; no CloudFront origin; add production intake only with authorized runtime generation |
| `asset-recovery` | OpenLegend project, recovery roles      | Verified retained objects and metadata checkpoints, isolated writer/restore roles; approved recovery region                                                           |

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

An artifact reference carries storage-class/boundary ID, access-domain ID when applicable, checksum, byte length and media type. The registry derives the exact key; it does not accept arbitrary browser/provider URLs as trusted file locations. Logical asset references retain owner kind/ID, asset ID, revision ID and manifest checksum. Use structured tuples, not ambiguous delimiter concatenation. Authored IDs remain exact tuple values and never become blob path segments. Their encoded indexed identity has a finite byte allowance; spelling is not sanitized into a different identity. Renaming display prose does not allocate a new identity.

An immutable manifest has a kind (`asset`, `source-bundle`, `study` or `release`), scoped identity, relative-path file map, exact dependencies, rights-evidence references and permitted metadata. The curated import preserves source provenance and existing renderer catalogs. Typed dimensions/axes/pivot, animation coverage and renderer/family/style compatibility remain the V3D representation contract; this storage implementation does not claim that a general appearance-authoring system exists. A source manifest may include private lineage; a derived runtime manifest contains only permitted information, has its own checksum and references that logical revision. Private prompts, source paths and hidden dependencies must not leak into its projection.

The encoded logical identity, including its checksum-wrapper allowance, is bounded to 1,000 UTF-8 bytes. Dependency and retention indexes place two exact identity keys in one entry; this bound reserves space for both keys and index metadata without relying on compression or truncating authored spelling. Physical destination identity uses a 12-digit account, a Region identifier of at most 64 characters and an S3 bucket name of at most 63 characters, keeping the committed-publication identity/storage index bounded as well.

Immutable rights/provenance references record evidence, not permanent permission. Current grants, withdrawals and permitted uses remain mutable authority outside those manifests and outside gameplay rewind. The same bytes may support two independently authorized logical assets; permission for one does not authorize the other. A boundary/access-domain identifier is a logical registry identity, resolved to the current physical bucket/account by trusted configuration so restoration or relocation need not rewrite every world reference.

## 4. S3 directory contract

S3 has object-key prefixes rather than real directories. Canonical bytes **and immutable manifest bytes** use the same content-addressed form within their declared boundary. Logical owner/asset/revision descriptions, reviews, transfer receipts and selections live in PostgreSQL, not in parallel writable S3 catalogs. The two-character hash prefix is an administrative organization choice, not a capacity claim.

### 4.1 Art library

```text
art-library/
  domains/{access-domain-id}/blobs/sha256/{first-2-hex}/{full-sha256}
```

An access domain groups a permitted audience; it is not automatically one domain per asset or entity. Source-bundle manifests preserve member paths so editable files and texture dependencies can be reconstructed outside Git. A private source and a redistributable derivative can occupy different domains through separately approved publications. “Shared collection” is an ownership/licensing concept; reuse by two worlds does not make a wolf engine content.

Titles, categories, species, roles, source creator and approval notes remain metadata for exact records and future derived browsing. There is no general asset-management search/browse UI or `catalogs/`, `reviews/` or `transfers/` folder hierarchy to operate. A wolf may be referenced by several studies and packs without duplicated canonical bytes inside one boundary.

### 4.2 Runtime buckets

```text
runtime/
  public/blobs/sha256/{first-2-hex}/{full-sha256}
  restricted/{access-domain-id}/blobs/sha256/{first-2-hex}/{full-sha256}
```

Only explicitly permitted public/restricted prefixes are delivery origins. Public metadata must be reviewed before upload: an unselected public object can already be retrieved by its exact URL, so final selection is not a privacy barrier. Private drafts stay restricted. A release cannot require temporary preview keys, an artist's disk, vendor hosting or nonproduction credentials.

The same exact release can be independently published to development and production. Each operation records account, Region, bucket, canonical/named keys and exact S3 versions; it does not infer one environment's coverage from another. Before claims or transfers, every required child must have a committed complete publication in the selected physical environment. Same-boundary children use the parent's destination; cross-boundary children use an explicit trusted deployment mapping. The publisher records only the cross-boundary mappings the closure actually needs. Selection is a revision-checked PostgreSQL record, never mutable `latest.json` on S3. The compiled lock pins the complete release reference plus exact selected file map. New publication alone does not change a running or saved world.

### 4.3 Study archive

```text
art-studies/
  public/blobs/sha256/{first-2-hex}/{full-sha256}
  restricted/{access-domain-id}/blobs/sha256/{first-2-hex}/{full-sha256}
  public/viewers/{immutable-viewer-id}/{preserved-relative-path}
  restricted/{access-domain-id}/{reviewed-immutable-viewer-path}
```

The last two forms are deliberate named copies for reviewed viewers/downloads. A publisher-supplied hosting map binds every name to an exact admitted file; canonical and all named copies must verify before commit, and receipts retain both for recovery/withdrawal. Existing archived boards use an immutable original-path mirror where relative links require it. A title/category change never relocates those pages. A study/iteration remains a logical immutable manifest with related owner references, not a required physical year folder.

Study metadata preserves capture role, variant/pose, dimensions/duration, provenance, viewer build/parameters and selection/rejection limits. Source dependencies can be retained references; a separate study copy is intentional when needed for access or preservation. Public metadata cannot disclose private source identifiers. Study selection is not runtime approval.

Reviewed static output and trusted compiled viewers run on the isolated tooling origin with restrictive policy. Imported archive scripts are preserved as evidence rather than granted arbitrary execution. When an old local viewer cannot be reproduced, retain its captures and label a current-renderer reconstruction honestly. General catalog browsing, arbitrary historical-code execution and generated-art review UI are not implemented by this migration.

### 4.4 Intake and recovery

```text
intake/
  runs/{run-id}/incoming/{file-id}
  runs/{run-id}/scratch/{file-id}
  runs/recovery-{id}/restored/{source-account}/{source-bucket}/{source-key}

asset-recovery/
  domains/{authority-domain}/blobs/sha256/{first-2-hex}/{full-sha256}
  recovery-authority/{authority-domain}/current.json
  origins/{source-account-id}/{source-bucket-name}/{original-object-key}
  checkpoints/{checkpoint-id}/manifest.json
  checkpoints/{checkpoint-id}/metadata/{file-sha256}
  migrations/{migration-id}/{preserved-inventory-or-git-bundle}
```

Intake is private non-executable quarantine. A candidate becomes durable only after verified publication and pins; temporary scratch is never its only preserved copy. Archive expansion/import limits remain with the producer. Mutable workspaces and safe relative paths do not create storage authority.

Recovery retains canonical **and named** objects from every recorded physical environment. Repeated receipts for one address retain each distinct recorded source VersionId even when verified equivalent bytes share one protected destination. It streams the exact recorded source VersionId through verified conditional creation into the origin namespace; source and copied VersionIds are distinct receipts. Protection, independent verification and intake restoration overlap four owned streaming transfers, stop admitting on failure and settle before returning. Duplicate source/version copies coalesce, while receipt ordering remains deterministic. Immutable content checkpoints tie this closure to coherent asset SQL records and the existing operational backup when a world exists.

The single mutable current-authority marker is conditional compare-and-swap, separate from immutable content. A rights/grant/withdrawal operation first publishes pending coverage, commits its exact SQL outcome, exports the new current restrictions, then marks coverage complete. A crash leaves a truthful pending marker and blocks recovery release until that exact operation reconciles. Old checkpoint grants cannot authorize restoration. Restored catalogs start quarantined; only independently current complete authority admits access. Recovered permitted bytes are written to intake `recovery-*` paths, never directly over primary origins. Before copying, intake restoration admits the operator against local SQL and independently current authority, requiring its generation to match the reconciled catalog. After all owned copies settle, it independently confirms that authority remains complete and unchanged. Missing, pending, changed or unverified current authority refuses completion and durably quarantines the catalog; copied bytes stay private. Explicit reconciliation and retry are required. Each receipt records the verified destination account, Region, bucket, key and VersionId as well as the exact source location. Promotion requires fresh publication admission against the actual owning database, or a deliberate cutover whose authority has been freshly reconciled; an isolated rehearsal database is not a continuously synchronized authority. The recovery roles have no version deletion or ordinary game-delivery write authority.

Full empty-target operational world restore checks current authority before admitting work, commits its slow file/SQL/world installation quarantined, then refreshes independent authority and validates the complete retained world pins in a short final activation transaction. An exact backup-package checksum identity and pending phase let the same interrupted install resume without repeating installation or overwriting a changed target. Missing/pending current coverage or a crash before final activation leaves restored access quarantined; ordinary success completes both phases without a separate manual command.

## 5. URL and repository contract

`assets/delivery.json` owns the verified HTTPS origins. The deployed custom origin is `https://assets.openlegend.ai`:

| URL path                                               | Meaning                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `/public/blobs/sha256/{aa}/{hash}`                     | Production public runtime bytes from the external runtime origin                    |
| `/development/public/blobs/sha256/{aa}/{hash}`         | Separate nonproduction runtime copies; the routing prefix is removed at that origin |
| `/studies/public/blobs/sha256/{aa}/{hash}`             | Explicitly public study bytes                                                       |
| `/studies/public/viewers/{immutable-viewer-id}/{path}` | Verified immutable boards, trusted viewers and retained source downloads            |

Study and nonproduction CloudFront distribution hostnames also exist in deployed outputs. Private hosted study pages use the isolated study distribution's `/restricted/curated-private/` scope after operator login. The hosted exchange ticket is short-lived and replayable within its admitted validity; it is not a one-use credential. The documented login command checks the exact named page against its committed publication, selected physical origin and current SQL permission both before and after ticket issuance. Denial returns no bearer credential. Its signed cookies have a separately configured expiry and do not consult application SQL at each subsequent request; controlled withdrawal therefore removes the affected current origins and completes CDN invalidation. Raw Lambda invocation remains privileged project-operator administration, like raw S3 access, not an ordinary participant login path. The loopback development viewer uses a distinct one-use login and current SQL admission for each asset request.

There is no deployed generic `/assets/{owner}/...` source-record portal. Exact source bundles are pulled through the CLI or deliberately published as reviewed named downloads. Permanent private page links contain no credential; login supplies fresh transport access. Signed tickets/URLs/cookies, machine paths and temporary preview servers are never persisted as asset identity or documentary citations. Public file links can directly name CloudFront bytes. Third-party source URLs remain attribution alongside retained exact artifacts.

Git retains:

```text
scripts/assets.ts                # exact CLI and external-work tooling
assets/fixtures/                 # small public verification metadata
assets/locks/{named-profile}.json # exact release reference plus selected path map
packages/domain/src/worlds/base/  # world-owned logical selections, no cloud I/O
art-direction/studies/{study-id}/README.md  # notes and hosted revision URLs
docs/                            # specs, decisions, evidence summaries, URL links
```

Code, shaders, JSX, small semantic authored definitions/catalogs, licenses and attribution stay with their existing source owners. Standalone media and SVGs, exported geometry/animation JSON, vector/icon bundles, editable art sources and embedded images stay outside Git, regardless of size. Image data URLs, including base64 and percent-encoded SVG, remain asset payloads when embedded in CSS or code. Other world packages carry their own authored selections. Resolved release lock files are derived pins, not a second writable source of world rules.

There is no local-media allowlist or tiny/bootstrap exception. [AST01](../limits/game-asset-storage.md#ast01--git-and-bootstrap-assets) owns the zero-payload repository restriction. `pnpm assets:check` checks tracked/unignored files and generated build output, including renamed binary signatures, generated geometry and embedded images. Small semantic metadata and native drawing code remain source; moving an exported payload into JSON or a source string does not change its classification. Current-tree removal and reachable history preservation remain separate migration gates; a passing guard alone proves neither.

## 6. Records, indexes and publication

Use immutable manifests for file descriptions and lineage. PostgreSQL owns access, publication decisions, selection/binding revisions, transfer outcomes and reference pins; searchable catalog fields are rebuildable projections of manifests. Recovery exports are immutable snapshots of committed records, not a second selection or permission ledger; ordinary operation does not maintain duplicate review/transfer JSON folders on S3. Export failure is recoverable by the same operation identity; a recovery checkpoint includes only exports it actually verified. Never make S3 tags, a public gallery or a browser preference a competing writable authority.

Required logical records (reuse existing repository abstractions; these names describe responsibilities, not mandatory new classes):

- Asset revision and representation manifests with exact dependency references, checksums, source/rights and qualification references.
- Pack/release manifest with exact members, dependency closure, relevant engine/world/style/decoder compatibility, license bundle and starting-scene loading groups. Public and restricted closures are separate permitted projections.
- Study iteration manifest and append-only review/selection records, including captures and viewer provenance.
- Publication/transfer record with operation identity, expected prior binding, source/destination boundaries, prepared/committed outcome and intended copy reason.
- Retention pin tying an owner (release, save, study, source lineage, supported export or active operation) to an exact revision/dependency set.
- Derived searchable catalog and reference indexes. Direct reads use full scoped keys; reverse references support retention/takedown without a whole-bucket scan per action.

These are logical responsibilities, not a claim that all producer-specific schemas or user interfaces exist. The curated importer retains source/review notes and existing renderer catalogs through immutable metadata and exact source records; V3D/INV own richer representation/approval producers. PostgreSQL remains the sole current permission/selection authority.

Implemented indexes support exact scoped revision/file lookup, publication claims, transitive/reverse dependencies, physical receipts and pins. A future owner/category/study-date browser can add derived cursor indexes at its actual consumer; it must not scan the library on scene reads. Published file reads and scene preparation never enumerate the entire library. Publication compiles/validates one dependency closure once under byte/record/depth/time limits; reject cycles or excessive work explicitly, rather than silently dropping a dependency. Dependencies are a bounded directed acyclic graph for the first implementation; the inventory records this format choice.

This graph contains required file/manifest dependencies, not every descriptive relationship: “reviewed in study X” can point back to a study that references the model without recursively fetching it. Classify hard dependencies, retention pins and optional lineage/navigation links explicitly. Large curated collections are partitioned into bounded child manifests with an exact parent dependency set. The compiled selected file map keeps study/source archives out of the game build; consumers request the needed paths rather than loading the archive. Compiling the complete release closure is bounded offline publication work, never repeated per player/frame.

### 6.1 Publication and recovery of interrupted work

Bind each operation identity to its exact requested inputs, destination, relevant configuration and expected prior selection. A retry first resolves the recorded outcome: identical committed work returns that outcome under current disclosure permission, different inputs conflict, and unfinished work resumes only its recorded phase after current admission. A lost acknowledgement never allocates another publication or overwrites a newer selection.

Publication sequence:

1. Admit the operation, rights, destination and total work/spend; allocate its durable identity and protect the prepared input dependencies from cleanup. Before each output upload, reserve its exact destination key under that operation so collection cannot delete prepared outputs before final publication; commit converts these claims into durable pins, while interrupted operations retain recoverable claims.
2. Freeze the prepared file, hash its exact bytes and upload each missing file to its exact destination using the integrity contract below. Recheck rights before copying into a broader audience, including public storage: that copy is disclosure even before selection. Use conditional creation and verify matching checksum/length/media type on an already-existing key.
3. Validate the actual prepared exports, dependency availability and allowed projection. Write immutable child manifests and then the enclosing release/study manifest. Every named byte must be durable before the manifest can be selected.
4. In the publication owner's transaction, recheck current rights and expected binding, commit exact manifest locator/digest plus dependency pins and record the operation outcome. A competing selection causes a truthful conflict, not overwrite.
5. Publish refresh/selection information through existing paths. Lost acknowledgement is recovered by exact operation identity; already-committed publication is not repeated. Unselected candidates remain explicit artifacts, not half-installed world content.

Object transfer and dependency preparation happen outside database transactions and world-mutation locks. Admission, individual receipt writes and final guarded record/pin/selection changes use short SQL transactions. Cancellation or grant loss prevents later commit; a worker completing an old phase cannot revive the operation. Claims cover prepared manifests as well as blobs and remain until the owner reconciles a terminal outcome and fences late writers. A publication failure can leave retained unselected bytes, never a committed broken reference. Reuse INV's paid-attempt record when generation produced the candidate; storage recovery neither creates a second paid ledger nor regenerates art.

Publication, current-authority coordination, initial recovery coverage and checkpoint creation refuse an enclosing SQL transaction before external work. Their durable records must commit independently before cloud I/O can rely on them. Authority mutation admission counts the complete encoded restrictions and its durable outcome against the shared recovery and backup-row limits inside the owning transaction; an oversized result rolls back instead of permanently stranding a pending coverage marker.

### 6.2 Exact bytes and S3 integrity

The artifact checksum is always SHA-256 of the complete original file, independent of transfer chunking. An S3 multipart SHA-256 checksum can be a composite of part checksums and is not that file digest; ETags and user-supplied checksum metadata are not substitutes. With a pinned SDK, validate transfer checksums using their declared algorithm/type and preserve the independently computed full-file digest. The current bounded adapter uses a single conditional PUT and supplies the checksum computed from the source file so mutation between hashing and upload fails. For multipart transfers/copies, establish the full-file digest through a trusted verified transfer record bound to the exact object version, or stream and hash that version once before admitting it; reuse the resulting immutable verification rather than downloading on every lookup. [AWS checksum types](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html#Full-object-and-composite-checksums).

The same boundary/checksum key has one validated byte length and safe media type. A conflicting claim fails; it does not rewrite object headers in place. Download names are per-record response metadata, not blob identity. Browser integrity checks apply to complete model/image bytes before decoding; a streamed video range is not claimed verified by a full-file hash until the complete bytes have actually been checked. Trusted publication and authenticated delivery still protect streamed media, with full-byte verification at archival download/restore.

Use `If-None-Match: *` for immutable creation where supported and enforce the corresponding writer policy. A precondition failure is success only after verifying the existing object. AWS's condition checks the current object; delete markers can permit a new write, so ordinary publishers must not delete immutable keys or bypass conditional writes. Versioning alone does not prevent overwrites. [AWS conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html).

The deployed adapter does not use destination-conditional `CopyObject`: that API cannot honor the required condition. Deliberate copies stream and hash a verified exact source version, then use conditional PUT at the destination. Bounded transport-only retries recreate streams for reset/timeout/service failures; they do not retry paid generation or re-admit SQL authority. Cross-boundary promotion records the same verified bytes, verifies destination closure, then publishes there. Never move the sole source or mutate a study's old references. Reusing an existing digest is allowed only after the caller's logical reference rights are established; hashes do not grant access.

### 6.3 Binding and save retention

Registering an available asset, selecting a deployment release and selecting the game's presentation release are distinct admitted operations. The current curated game saves one full exact release reference and a selection revision alongside its world. A new selection or saved-slot restore must match the installed service/build lock and otherwise refuses before replacing the active world. Startup accepts a structurally valid known retained release from another build using native depiction, keeping its exact binding so the owner can explicitly select the installed release. This permits both upgrade and rollback without an automatic art change. `pnpm assets install` uses the running game's authenticated owner operation, expected binding and durable request receipt. It requires current runtime rights, including private runtime permission where applicable. Renderer-facing asset paths come from that compiled lock, never arbitrary browser-selected cloud URLs.

Existing world-owned appearance strings remain unchanged. The browser receives the permitted release reference and loads external art only when it matches its compiled lock. Bootstrap/known unavailable art uses native procedural depiction; logical world objects and their mechanical rules remain intact. Known withdrawn or denied retained art can restart/save and restore an already pinned slot without regaining delivery permission. Unknown records, malformed/missing closure and quarantined authority remain errors. An installed-release mismatch suppresses external art at startup; it still refuses a mismatched restore or new selection. New binding or an unretained external checkpoint requires current rights. Per-entity/generated binding remains V3D/INV work.

The save owner holds the complete exact release/dependency/file closure before its checkpoint worker captures the same world revision, then promotes that provisional hold only after publishing the immutable save. A failed capture releases only its reconciled claim. Deleting a save releases only its own pins. Existing-slot restore verifies those pins and current authority before installation; gameplay rewind never restores old grants or publication receipts. This uses the current save format and operational backup owners without legacy readers or per-entity duplicate release references.

## 7. Environments, local cache and offline use

| Environment       | Asset selection and credentials                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Local development | Checked-in named lock or explicitly selected study/asset revisions; read-only fetch access; cached exact files served by the local dev server |
| Untrusted CI/fork | Native depiction code plus an explicitly fetched public fixture pack; no library, private study or deployment credentials                     |
| Trusted CI        | Short-lived scoped credentials; exact named integration fixtures/release; separate authoring and deployment jobs                              |
| Preview           | Expiring deployment selection in nonproduction; explicitly selected files and restricted audience; no production-private world content        |
| Staging           | Exact production candidate release, qualified on the actual consumer and target configuration                                                 |
| Production        | Destination-verified qualified release; CloudFront read delivery; publication privileges absent from game clients                             |

Use one configured local cache root outside all worktrees, defaulting to the operating system's user-cache location under `OpenLegend/assets`. Partition it by remote trust boundary, access domain and checksum. The reusable bytes are read-only. Materialize only requested files into a task workspace; editable Blender sources get real copies or safe copy-on-write clones, never writable hard links into shared cache. Strip expired private scope access from browsing/use and do not share a private user's cache across OS users.

For human work, materialize a readable layout such as `workspaces/{task-id}/sources/{owner-id}/{asset-id}/{revision-id}/` and `workspaces/{task-id}/outputs/{iteration-id}/{variant-id}/`. These are mutable local folders, not S3 identity. A source-bundle manifest preserves each member's logical relative path and checksum so Blender textures/linked dependencies remain resolvable; safely reconstruct those relative paths without absolute-path or traversal escapes. Fetching an editable model includes its required source dependencies, not just the `.blend` file. Importing models and textures from several creators does not merge their licenses or authorship.

`pnpm assets help` and the [workflow guide](../asset-workflow.md) describe the implemented `inspect`, `pull`, `verify`, `workspace`, `prepare`, `initialize`, `approve`, `publish`, `publish-plan`, `grant`, `withdraw`, `serve`, `login`, `install` and recovery operations. There are no separate `publish-study`, `publish-release` or cache-prune commands: manifest kind/use chooses publication, and cache admission evicts unpinned entries. Pull selects an exact lock and an explicit path/prefix/all subset, never an implicit whole-library synchronization. Verify streaming downloads into temporary paths, atomically finalize after digest checks, coalesce identical in-flight reads and coordinate concurrent processes. Each reader owns its interest: one cancelled reader does not cancel a transfer still needed by another. Failed partials are never served as complete files. Resume only when exact object identity and range semantics are established; otherwise restart the bounded transfer.

Local cache eviction observes byte budgets and active-use pins, including Blender work and running dev servers. If every file is pinned, report capacity exhaustion instead of deleting active content. Mutable task workspace output is separate from the disposable cache and is published/preserved before cleanup. The `workspace` operation requires current offline permission and creates independent editable copies; it is not a signed portable private grant. Local game delivery prepares exact public runtime/study cache misses through the existing verified public HTTP transfer without AWS credentials; current SQL permission is checked before and after preparation. Private/original-library cache misses retain their scoped S3 access. Verified warm files need no AWS connection while current SQL permission remains required. A cache miss cannot silently switch releases or regenerate art. Private authoring CLI use still requires its authenticated identity/current catalog; there is no disconnected arbitrary-private-pack authority substitute. Explicit public HTTP pulls require neither AWS nor private SQL and remain subject to whole-file integrity and cache bounds. Already copied public/editable files cannot be recalled by later revocation.

Reserve cache space across processes before transfer, counting completed entries, partial downloads and in-flight reservations against the same budget. Failed or crashed transfers reconcile reservations and temporary files through their recorded ownership; age alone cannot evict a live reader. Check available workspace space separately before making editable copies, since unsaved work is not evictable cache. A single file larger than the configured cache allowance yields an explicit capacity result or requires a deliberately changed allowance; it never silently bypasses the bound.

Each cache instance serializes metadata access before taking the cross-process filesystem lock. Its queued files wait in memory for bounded transfer slots; local readers await the shared transfer rather than individually polling all metadata. Reader counts are indexed by exact file, and eviction sorting runs only when capacity requires it. The local study server defaults to the study lock and passes one effective index to both Vite and its delivery resolver; an explicit index replaces both. The ordinary game links to the verified compiled viewer from `assets/delivery.json`, while dedicated study builds keep relative navigation within their selected viewer.

CORS allows required GET/HEAD/range behavior from named consumer origins; it is not authorization. Set MIME types, CSP media/connect origins and consistent cache headers. Public immutable bytes can use long caching. Restricted delivery checks access before cache use, has policy-defined credential/cache lifetimes, and does not get a public immutable cache policy by default. Range responses, videos, large GLBs and errors must be exercised through the actual CDN/browser.

Authorization and caching are separate checks. CloudFront validates a signed credential at each request, but does not consult the application's current grant record. Revoking a grant stops new credential issuance; an already-issued credential can remain usable until expiry, and a transfer admitted before expiry can finish. Select and expose that residual window under [DEP07](../limits/production-deployment.md#dep07--asset-access-and-caching); never call signed URLs immediate revocation. Content requiring current authorization on every request must use an authenticated delivery handler before any shared cache hit, with no direct-origin bypass. Do not enable that content through a weaker signed-link path while the handler is missing. Scope each credential to the exact allowed resources; a wildcard for an entire domain is allowed only when the grant covers every object it matches. Login pages alone do not protect blob URLs. [CloudFront signed-URL checks](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html).

Restricted pages and user-specific manifests must not enter public caches. Return safe media types with `nosniff`, download untrusted source formats as attachments, and keep executable gallery/viewer output limited to the reviewed tooling origin and template. Withdrawal must block origin/delivery access before invalidating cached objects; invalidation alone allows the next request to fetch the same file again. Its completion and any remaining credential/transfer window are reported explicitly. [CloudFront invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html).

### 7.1 Developer and agent instructions

The canonical task-oriented guide is [docs/asset-workflow.md](../asset-workflow.md). Publication, game/study delivery, migration and recovery extend that same guide. It describes implemented operations and unavailable capabilities, with exact configured destinations rather than invented commands. Keep storage/security contracts here and link from the guide rather than copying the architecture.

The guide covers these supported journeys with exact commands, prerequisites, inputs, output locations and meaningful failure/recovery instructions:

- Fresh checkout/worktree and CI: configure scoped access, select a named lock or revision, pull/verify the required subset, use the shared cache and diagnose missing permission, files or disk space.
- Art creation and editing: find permitted sources, materialize isolated editable copies with their dependencies, save working outputs, record provenance and preserve requested alternatives before cleanup.
- Studies and verification captures: distinguish temporary diagnostics from deliverables, publish retained media/iterations, verify access and obtain permanent revision URLs for documents.
- Runtime integration and release: qualify and publish the allowed representation, update the owning world selection or release pin, and verify the real consumer without copying source/study media into the player build.
- Offline work, cancellation and cleanup: explain grant expiry, interrupted transfers, unpublished work, cache pruning and the separate authorized recovery/withdrawal procedures.

The root asset-work route in `AGENTS.md` requires the guide’s relevant sections for finding, pulling, creating, editing, importing/exporting, saving, capturing, publishing or linking assets, including new files/tools and non-renderer pipelines. Link the same owner from development onboarding, art/study entrypoints, documentation policy and the applicable PlayCanvas/deployment procedures; scoped instructions add local boundaries without duplicating commands. The design/preservation links remain the contract owners alongside executable instructions. Future CLI or storage-contract changes update the guide and affected routes in the same change.

Follow the [guidance-maintenance workflow](../../.agents/skills/openlegend-guidance/SKILL.md) when those routing changes ship. Exercise matching work, unrelated mentions, new-file work and package-directory starts in installed agents, inspecting actual reads rather than self-reports. Run the documented operations through the relevant AS acceptance journeys; static link checks alone cannot establish that instructions work. Missing installed-agent coverage remains tracked under [CG05](../maintainers/agent-guidance.md#cg05--read-only-routing-cases). This guide and routing verification are part of each affected stage's completion, not optional post-migration cleanup.

## 8. Performance and cost contract

Cost grows with retained revisions/media, closure size, concurrent downloads, visible distinct representations, decoded geometry/textures, active comparisons and history indexes. Do not equate compressed download bytes with browser/GPU memory.

Shared preparation: checksum/validation and dependency closure at publication; immutable decoded assets/materials through existing client owners; local downloads across worktrees and CDN/browser cache reuse across repeated appearances. Reuse keys include the exact artifact revision and access boundary. Rights/binding changes invalidate selection/access; a new revision fetches new bytes. Camera motion and unrelated world changes do not redownload art or recompile manifests.

Prioritize the starting visible scene, then bounded look-ahead work. Limit active and queued transfers by bytes as well as count; keep decode/GPU-upload work bounded and release superseded comparisons. Do not load all historical alternatives, source controls or full-world private catalogs to select one appearance. Optional preview capture and conversion remain outside the render/simulation critical path. No per-frame storage or database lookup is introduced.

Measure through complete fresh-checkout, cold-browser, warm-scene, multi-worktree and study-open journeys: unique bytes/files requested, queued/in-flight bytes, cache hits, parse/decode/upload timings, render stalls, retained memory, build size, storage/requests/CDN costs and restoration latency. Compare matched scenes. Existing A3D render budgets remain; new storage/queue/catalog bounds are tracked in [AST](../limits/game-asset-storage.md), with unqualified numbers identified before production use.

## 9. Retention, backups and withdrawal

Start conservatively: no automatic deletion of published runtime files, durable source/library versions or preserved study iterations. Pins include exact transitive dependencies, active publications, retained supported saves, approved exports and active production inputs. A huge retained library does not justify scanning it during gameplay. SQL admission reserves exact physical keys before transfers and charges canonical/named/environment copies separately; same-address reuse is deduplicated. The configured global byte/file/operation envelope includes pending and terminal orphan claims and rolls back an over-limit reservation before network work. Claims are conservatively retained; no collector or automatic reconciliation declares old network writers harmless.

Intake has a distinct [cleanup policy](../limits/game-asset-storage.md#ast06--temporary-intake-and-previews). Keep completed runs untagged through the operator-enforced grace, then explicitly review the exact disposable versions; S3's age-based timer does not measure time since tagging. Preserved/published dependencies must have been copied and verified first. Abort stale incomplete multipart uploads. Never apply an age-only lifecycle rule to retained blob prefixes or assume an old file is unused.

Future garbage collection is an explicit reference-aware stage: compute a bounded candidate set against a consistent pin generation, mark candidates, wait a grace period, and recheck current pins/in-flight publications and holds under the same exclusion protocol used by publication before deleting. Pin creation must cancel/block a pending deletion. GC is disabled until race and recovery checks pass. Moving genuinely cold sources to an archive storage class requires an explicit retrieval expectation; current game files and ordinary study videos stay immediately retrievable.

Enable versioning on durable buckets, plus a protected copy in the separate recovery bucket in the same AWS project/Region and a coherent checkpoint for catalog/publication/pin metadata. Production roles cannot administer/delete recovery copies. Configure retention against actual privacy/license obligations; no blanket irreversible Object Lock policy is assumed. The namespaced copy/checkpoint process is asynchronous: record completed coverage, explicitly backfill existing data, alert on lag and qualify its recovery window. Do not treat an enqueued copy as protected data. Native replication, if later adopted with a compatible destination layout, is also asynchronous and does not automatically backfill pre-existing objects. [S3 versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html), [S3 replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html).

Rehearse restoration into an isolated destination: restore manifests/bytes and metadata checkpoint, verify checksums and closure, reconcile current grants/withdrawals/erasure records, then test a retained game release and study. The recovery record must establish how current restrictions survived independently of the content checkpoint. If that authority is unavailable or its completeness is unknown, recovered content stays quarantined and delivery/publication remain blocked for the affected scope; an old grant is not assumed current. Restriction updates require durable recovery coverage under the operational recovery contract. A generic object-copy lag allowance cannot silently permit forgotten withdrawals. Backup success alone is not restore success. Account/region, recovery objectives and costs belong to deployment configuration before execution; do not invent an achieved RPO/RTO.

Logical withdrawal records exact affected revisions/scopes, removes selected releases through revision tombstones and blocks new SQL-authorized delivery. A distinct explicit byte prohibition applies to all matching uses **inside the selected boundary/access domain**; a hash match cannot infer wider rights. Independent permitted uses of identical bytes are preserved.

The operator workflow then admits a bounded physical removal plan from recorded canonical/named receipts across environments. A pending fence blocks delivery/republication while the narrow withdrawal role writes S3 delete markers for current public and curated-private runtime/study copies. Library/recovery bytes and all historical S3 versions are outside that role. Each exact outcome is durable; historical S3 versions and protected recovery bytes remain retained. Controlled raw/custom CloudFront paths are invalidated and their completion recorded before the fence releases. Unknown CDN mappings, missing trusted environment config, unresolved late publication claims or failed invalidation leave a truthful pending plan; logical denial remains committed. Retrying uses the same phase outcomes and does not repeat completed deletion or advance authority again.

Ordinary grant revocation retains an already issued private credential’s admitted expiry window. A complete controlled withdrawal also removes the current private origin/cache copies, so an unexpired cookie cannot fetch those files after completion. Already downloaded files cannot be recalled. Independently current restrictions prevent recovery from resurrecting withdrawn access. Legal erasure of historical/recovery versions is a separate expressly scoped retention action, not an automatic consequence of revoking one logical use; the normal workflow intentionally has no DeleteObjectVersion authority. A takedown view must state unavailability rather than substitute different art.

## 10. Migration from this repository

1. Inventory current files, relevant external authoring folders, all reachable asset blob versions in the explicitly selected refs/tags, and every inbound asset link/import. Include renamed paths, generated geometry/animation and vector JSON of any size, embedded images, standalone SVGs, originals, licenses, screenshots/videos and study viewer code provenance. Preserve supplied attachments only when they are relevant and permitted. Report history outside the inventoried refs rather than claiming every possible lost object was recovered.
2. Create a recoverable Git snapshot/bundle and an inventory mapping original commit/path/blob identity to storage reference/checksum. Store them in protected recovery storage. Inventory first; no source deletion or history rewrite at this stage.
3. Publish library/study records and intentional destination copies, verify all required files/rights/dependencies, backfill recovery and prove restoration. Recoverable past art must remain accessible before Git stops being its durable home.
4. Replace direct asset imports and embedded payloads with exact catalog loading at the existing consumers, including small mesh JSON, icon/vector bundles and CSS images. Keep native depiction code and a selected release lock in Git. Split study tooling from game build outputs; source/editable assets never enter the player distribution by glob.
5. Publish actual owned-domain URLs and generate a migration link map. Rewrite active docs, retained study pages, Markdown images, download links and catalog references in the same change; verify private links with authorized and unauthorized access and public links without credentials. Preserve original historical provenance as metadata. No placeholder URLs, expired query tokens, symlinks into a developer's home or temporary dev servers satisfy this gate.
6. Prove a fresh checkout, clean local cache, trusted/untrusted CI paths, actual game and study rendering, offline selected pack, interruption/rollback and same-version save dependency retention. Inspect the complete build for leaked sources/private files. Enforce the zero-payload Git/build guard; remove tracked asset payloads only after these checks.
7. Coordinate an explicit history-cleanup plan separately: exact repository/remote refs, branches/tags, PRs, worktrees/clones, backup/restore, commit mapping and contributor resynchronization. A deletion commit alone cannot shrink old reachable blobs. A rewrite changes commit IDs and needs separate authorization; never force-push, prune the shared object database or reset another worktree as a side effect of asset migration.

The current-tree cleanup removes 1,285 tracked asset payloads and the inline panel texture, replaces 15 retained HTML entries with permanent hosted links, and passes the zero-payload guard and production/study builds. Sources and exact publication copies have verified protected readback. These results do not shrink reachable Git history or authorize AS08 rewriting. The [verification report](../verification/game-asset-storage.md) owns measured preservation, consumer evidence and its limits.

Preserve a prior-commit-to-recovery mapping for recipes and historical studies if history cleanup changes the code references they cite. The existing no-legacy-support development policy is unchanged: archival access to earlier artwork does not require keeping previous runtime adapters or incompatible save readers alive.

## 11. Stages, verification and configuration inputs

[AS01–AS08](../maintainers/game-asset-storage.md) owns implementation sequencing. The storage foundation and art-study migration can precede the full production world rollout; hosted game qualification still consumes PD05, V3D02/V3D03 and the relevant save/rights owners. Keep numerical tuning in the [limits inventory](../limits/game-asset-storage.md), not several trackers.

Build one curated source → verified local fetch → preserved study → game-release journey. AS01 owns the shared reference/storage/publication foundation and the curated saved release hold; V3D02 owns richer representation compatibility and future per-entity binding rather than another asset registry. AS04 integrates that narrow consumer with the needed V3D03 loading/lifetime behavior. PD05 consumes the resulting hosted asset proof; it is not a prerequisite that must first reimplement AS04. AS06 recovery begins alongside the foundation and gates AS05 deletion. AS07 supplies production operational evidence to the deployment gates. Future private generation/per-entity appearance, arbitrary rig families, general catalog browsing and automatic retained-object collection remain separate later work, not prerequisites for this curated journey. All foundational rights and retention checks still apply to the first supported asset.

Required scenarios include the existing mercenary/deer source-study chain; two worlds referencing one public tree; a private-reference fixture with identical bytes to a public model but different rights; an engine-owned fallback icon; an audio file; a study reused after its preview expires; a lost publication acknowledgement; conflicting selections; corrupt/partial files; cache eviction while a file is active; revoked access; and restore under newer withdrawal records. Include multipart versus whole-file checksum mismatch, changed input under a repeated operation ID, cancellation before commit, two processes exhausting cache space, a cancelled co-reader, a previously issued private URL after revocation, and unavailable current restrictions during restore. Exercise reference privacy with curated fixtures before generated-art features exist. The [verification report](../verification/game-asset-storage.md) records the exercised scenarios and their limits; these requirements alone do not establish measured capacity.

No unresolved owner decision blocks the accepted curated implementation. Verified project/Region, owned hostname, narrow roles and the completed current-tree migration are configured; the [tracker](../maintainers/game-asset-storage.md) and [evidence](../verification/game-asset-storage.md) retain actual qualification. The current configured world uses the installed exact artwork selected through its normal signed-in owner control. Mike authorized replacing old development progress with the current ordinary opening; authentication, asset authority and accounting remain preserved. The AST inventory distinguishes configured policies from measured capacity. No achieved recovery-time or recovery-point objective is inferred from a successful copy. Git history rewriting remains separately authorized and coordinated.

## Maintained records

- Behavior: [Feature specification](game-asset-storage-feature-spec.md).
- Implementation: [AS01–AS08](../maintainers/game-asset-storage.md).
- Limits: [AST01–AST08](../limits/game-asset-storage.md).
- Shared contracts: [Identity](../identity-and-references.md), [save/load](../save-and-load.md), [engine/world boundaries](../engine-and-world-boundaries.md), [3D asset pipeline](3d-pixel-art-asset-pipeline.md), [deployment playbook](production-deployment-playbook.md).
