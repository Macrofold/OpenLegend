# Game asset storage — limits and constraints

[Feature](../projects/game-asset-storage-feature-spec.md) · [Architecture](../projects/game-asset-storage-tech-design.md) · [AS work](../maintainers/game-asset-storage.md) · [Inventory rules](README.md).

**Design baseline: 2026-10-17.** Mike selected external substantial-asset storage and meaningful study preservation. The numerical defaults below are proposals, not implemented controls or measured capacity. Correct reference identity, privacy, publication atomicity and retained-dependency integrity are requirements, not tunable limits.

## AST01 — Git and bootstrap assets

**Selected direction; proposed numerical guard / Very safe:** only explicit tiny offline/bootstrap or source-native UI assets remain in code version control. Initial proposal: at most **64 KiB per file and 1 MiB total** of allowlisted media in a checkout; metadata/pins are separately checked for embedded substantial payloads. An asset below the threshold still needs a reason to ship locally. Code, shaders and ordinary small authored definitions are not media counted by this guard.

This prevents renewed binary/history growth while retaining a useful fallback/loading experience. Reject newly added media outside the allowlist or above the envelope; move it to external storage or review a justified bound change. Existing large files are AS05 migration debt, not silent permanent exceptions. AST01 does not cap world/game asset size or import qualification; A3D owns those. AS02/AS05 validate the practical bootstrap and enforce the guard.

## AST02 — Storage boundaries and reuse

**Selected / Medium:** distinct library, studies, delivery, intake and recovery storage roles; separate production/nonproduction delivery. No per-world/per-asset bucket. Reuse identical files within a permitted boundary; allow documented copies across access, environment, study-independence and recovery boundaries.

This spends some extra storage to keep deployment/rights/retention independent. Global cross-private-domain deduplication is not a requirement and must not leak existence. Expansion to another content account or region changes deployment mapping, not logical references. AS01/AS03/AS04 own qualification.

## AST03 — Published dependency graph

**Proposed / Safe:** required immutable file/manifest dependencies form a directed acyclic graph. File descriptions, retention pins, optional lineage/navigation links and permitted public/private closures are distinct. Cycles in required dependencies fail publication explicitly; repeated dependencies share a visited identity and are counted once within the closure. Descriptive study/model backlinks are not recursively expanded dependencies.

This keeps closure validation, export and retention understandable. Maximum admitted graph bytes/records/depth and processing time must be configured at the existing publication owner before public production; no numeric qualification is inferred here. Exact lookup does not scan the global library. AS01/AS04 exercise refusal and complete closure; A3D01–A3D05/A3D09/A3D10 retain shared format/rights envelopes.

## AST04 — Local cache and download work

**Proposed / Safe:** one configurable shared user cache outside worktrees, with a **10 GiB default disk budget**, active-use pins and eviction of unused verified entries. Workspaces containing unsaved art are separate. If pinned content fills the budget, pause new materialization with an explicit disk-capacity result. The value is a starting developer convenience, not optimality evidence.

**Unqualified / Too liberal until configured:** there is no newly qualified transfer-concurrency, queued-byte, decoder or GPU-upload limit in this design. AS02/AS04 must consume finite existing client limits where applicable and define/measure missing ones before enabling automatic prefetch. Whole-library sync is explicit operator work, not startup behavior. Warm cache hits do not qualify cold latency or total browser memory.

## AST05 — Retained sources, releases and studies

**Selected preservation; no automatic age/count deletion / Too liberal for unattended growth without admission:** preserve published source/library revisions, pinned runtime dependencies and all requested meaningful study iterations, including rejected variants. There is no fixed artistic-history count cap. More exports/captures can grow storage indefinitely even though publication and browsing are bounded.

Monitor unique/copy bytes and configure the operating storage/spend envelope before unattended production. At capacity, refuse/pause new optional work; never discard retained dependencies to satisfy a local cache or generation budget. License/privacy withdrawal and explicit owner deletion remain separate controlling policies. AS06 owns recovery/pins; automatic retained-object GC remains disabled until its publication-race checks pass. No blanket archive-class transition or irreversible retention period is selected.

## AST06 — Temporary intake and previews

**Proposed / Safe:** disposable terminal intake runs have a **7-day cleanup grace**, and incomplete multipart uploads are aborted after **7 days**. Active work is renewed/protected explicitly; published/preserved outputs are copied/verified into durable storage before a run becomes disposable. Any transfer legitimately lasting longer needs a reviewed operation policy, not silent deletion.

Preview deployment expiry releases its own references; it never expires a study or source that refers to the same content. Preview duration is an operator-selected deployment setting, not a study-retention limit. No age-based S3 expiration rule applies to durable blob prefixes. AS01/AS06 own cleanup qualification.

## AST07 — Delivery and documentary URLs

**Selected / Medium:** documentation uses stable owned-domain revision URLs after verified migration; access tokens and temporary provider/worker/local paths are not durable references. Specific evidence links pin iterations; current-selection links are labeled as navigation.

Public immutable delivery can use the deployment owner's long cache policy; restricted credentials/cache lifetimes depend on sensitivity and current authority. This design sets no universal private-link lifetime. Existing [DEP07](production-deployment.md#dep07--asset-access-and-caching) remains the cache-policy owner. AS03/AS04/AS05 verify login, CORS/CSP/ranges, expiry, takedown and corrected links. Local existing links remain only until real replacements are verified, not fake migration URLs.

## AST08 — Global admission, catalog and recovery growth

**Unqualified / Too liberal until configured:** total retained revisions, study media, active operations, public request volume, library indexes and recovery copies can grow independently. Per-file bounds do not bound those totals. Browse queries must select a permitted cursor page before hydration; publication processes only an admitted closure; administrative inventory/backup/GC are resumable bounded batches outside native/render paths.

AS01/AS07 must configure and measure catalog-page bytes, queued/active transfer bytes and count, closure work, recovery/inventory batch work, total storage/spend alarms and the approved deployment objectives. No artificial lifetime world/asset count is chosen. No RPO/RTO, CDN bill or frame rate is promised from cloud product specifications. [A3D](3d-pixel-art.md), [DEP05/DEP09](production-deployment.md) and existing spending admission remain the shared owners.
