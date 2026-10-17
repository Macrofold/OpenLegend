# Game asset storage and study delivery

**Design delivered; implementation not started. Updated 2026-10-17 15:54 EDT / 19:54 UTC.** Mike accepted S3/CloudFront storage, deliberate boundary copies, exact shared references, externally hosted studies and tiny-only Git assets. [Feature specification](../projects/game-asset-storage-feature-spec.md) · [Technical design and directory contract](../projects/game-asset-storage-tech-design.md) · [AST limits](../limits/game-asset-storage.md).

This tracker owns storage organization, local tooling, study delivery and migration. [PD05](production-deployment.md) retains hosted-game acceptance; [V3D02/V3D03](3d-pixel-art.md) retain general appearance publication/client handoff; INV retains art-production authority. The AS stages implement shared portions once. Nothing here closes those broader gates, authorizes paid infrastructure or rewrites history.

- [x] Record the accepted storage direction, paired design, S3/URL scheme, environment/world ownership and staged migration; reconcile affected documentation. This is a design completion, not a runtime/storage pass.

## AS01 — Storage foundation and exact references

**Owners:** asset tooling, existing appearance repositories, deployment. **Dependencies:** approved accounts/regions/domains/operating envelope for actual provisioning; no need to wait for the full game-hosting rollout.

- [ ] Implement the narrow S3/local-cache adapter, exact current-format artifact/revision manifests and scoped metadata/pin records at the existing repository/publication boundary.
- [ ] Provision reviewed durable library/study and nonproduction/runtime roles with conditional writes, protected origins, versioning, restricted access and a separately controlled recovery destination. Keep staging resets separate from durable art stacks.
- [ ] Qualify hash/type/length checks, partial/duplicate writes, access separation, publication claims and destination verification. **Exit:** an authorized exact artifact survives process restart, competing upload and unavailable storage without a broken committed reference; no public/private existence leak.

## AS02 — Selective local and CI materialization

**Owners:** tooling, developer startup/build, existing asset consumers. **Depends on:** AS01.

- [ ] Implement named lock/release/study/asset fetch, a shared bounded cache outside worktrees, verified atomic downloads, active-use pins, isolated mutable editing workspaces and explicit offline failures.
- [ ] Add a deliberately public tiny CI fixture pack, scoped trusted-job access and checked-in small lock files. **Exit:** two clean worktrees reuse one verified file; concurrent/partial reads, eviction and revoked scopes are correct; fork CI receives no private credentials; selected offline use needs no S3 connection after materialization.

## AS03 — Study publication and permanent links

**Owners:** art tooling, authenticated artifact/study routes. **Depends on:** AS01; AS02 for local reproduction.

- [ ] Publish immutable dated studies/iterations, reviewed gallery templates, exact source/model/media references, append-only feedback, current-selection index and viewer provenance.
- [ ] Implement stable authorized source/revision pages and generated media/documentation URL mapping; preserve all requested meaningful trials and intentionally copied study dependencies.
- [ ] Qualify private/public access, external-source rights, cross-study reuse, expired preview independence and an older study after a newer export. **Exit:** Mike can revisit the exact original comparison/video/model/source and distinguish reconstructed interactive views from recorded evidence, without local checkout paths or embedded expiring credentials.

## AS04 — Game release and consumer integration

**Owners:** client asset/scenery owners, existing appearance publication, deployment. **Depends on:** AS01/AS02; consumes V3D02/V3D03 and PD05.

- [ ] Externalize substantial GLB/texture/audio/scenery outputs, remove broad source/study glob dependencies from the player build and retain the explicit tiny bootstrap.
- [ ] Publish scoped release/pack closures, destination-verified environment promotion and exact application/world bindings. Keep world selections with their authored owner.
- [ ] Reuse existing asynchronous loading, fallback, decoded resource sharing and stale-result/disposal paths; qualify bounded transfer/decode work and actual CloudFront/CORS/CSP/range delivery.
- [ ] **Exit:** actual starting-scene game and study consumers work from a fresh checkout/browser with missing/corrupt/interrupted/replaced assets; no private sources appear in game output, and repeated appearances share resources. Record complete bytes, decode/upload stalls and memory; remote storage alone is no render-performance pass.

## AS05 — Inventory, preservation and repository migration

**Owners:** tooling, art/doc maintainers. **Depends on:** AS01–AS04 and the AS06 preservation/restore gate before removal.

- [ ] Inventory current and selected-ref historical asset versions, renamed paths, external source folders, meaningful attachments and all code/doc/gallery consumers; retain exact source/recipe/code provenance and a recoverable Git snapshot in protected storage.
- [ ] Publish/verify the archive and backup; replace active documentation/media URLs using the migration map, preserve historical path metadata, and verify private/public access and all dependency closures.
- [ ] Remove tracked large media/generated asset payloads only after fresh-checkout/build/render/restore evidence. Implement the explicit tiny-asset allowlist and new-blob/build guard, including disguised base64/geometry payloads. **Exit:** Git carries only permitted small assets/metadata, all inventoried art is retrievable, and docs link to real verified hosted revisions. No history rewrite is part of this stage.

## AS06 — Retention, withdrawal and recovery

**Owners:** storage/publication, PD06, save/rights owners. **Depends on:** AS01; exercise AS03/AS04 records as they become available.

- [ ] Backfill protected recovery copies, record coherent metadata/object checkpoints and implement bounded temporary cleanup distinct from durable retention.
- [ ] Qualify current grants/withdrawals during an isolated restore, missing dependencies, source/study preservation, expired preview pins and unavailable backups. **Exit:** a retained source, complete study and game release restore with verified content and current access policy; actual recovery evidence is recorded.
- [ ] Keep automatic retained-object deletion disabled until reference-aware GC, publication exclusion and mark/grace/recheck races are qualified. A later GC implementation is an explicit substage; its absence does not permit age-based deletion. Record growing storage and admission pressure under AST05/AST08.

## AS07 — Production delivery and operational qualification

**Owners:** PD05/PD06/PD08, V3D qualification, asset storage. **Depends on:** AS01–AS06 and the consuming production gates.

- [ ] Promote the same qualified closure into production with exact destination verification and independent release selection; rehearse fallback, withdrawal and compatible rollback.
- [ ] Measure actual startup/warm transfer, requests, decode/GPU upload, study load, cache/retained bytes, storage/CDN/backup costs and selected recovery objectives; configure finite admission/work limits before enabling public growth. **Exit:** PD05 receives complete asset-storage evidence, not a directory-only implementation or a claimed capacity based on uploaded file count.

## AS08 — Separately authorized Git history reclamation

**Owners:** repository operator and affected branch/worktree owners. **Depends on:** AS05/AS06; explicit approved rewrite/ref/coordination plan.

- [ ] Inventory affected refs/tags/PRs/clones/worktrees and retained commit links; establish backup/restore and old-to-new commit/recovery mappings before proposing the concrete operation.
- [ ] If authorized, remove only inventoried externalized blobs from the agreed histories, coordinate remote updates and clone/worktree resynchronization, and verify recoverability plus actual clone/object-size reduction. **Exit:** no lost code/art, no silently reset unrelated checkout and no broken historic recipe reference. Until then, deleting current files reduces checkout/build weight but leaves old reachable Git blobs.

## Verification status

Current evidence is repository inspection and design/documentation checking only. No S3 buckets/domains, downloads, publications, budgets, migration, new runtime performance or restore behavior have been qualified. Existing art/render evidence remains valid for its recorded scope; the storage architecture does not change its acceptance results.

**Design checks — 2026-10-17 19:54 UTC:** reviewed the complete affected diff and checked local documentation targets/anchors, with no missing links. Changed-file formatting, `git diff --check` and `pnpm guidance:check` pass; the latter retains advisory guidance-size warnings. Scoped [routing read reports](agent-guidance.md) do not establish broader installed-agent dispatch qualification. No executable code changed, so game/runtime checks were not run.
