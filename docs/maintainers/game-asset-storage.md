# Game asset storage and study delivery

**Curated implementation verified; history reclamation separately gated. Updated 2026-10-28.** Shared publication, access, cache, consumer and recovery tools are implemented; current and historical game assets, sources and study pages are published and verified. Independent cloud verification, full isolated object restoration, native world restoration, protected Git restoration and repository removal pass. The signed-in owner selected the installed artwork in the configured current world, and its actual browser renders current scenery, characters and interface icons. [Feature specification](../projects/game-asset-storage-feature-spec.md) · [Technical design and directory contract](../projects/game-asset-storage-tech-design.md) · [AST limits](../limits/game-asset-storage.md).

This tracker owns storage organization, local tooling, study delivery and migration. [PD05](production-deployment.md) retains hosted-game acceptance; [V3D02/V3D03](3d-pixel-art.md) retain general appearance publication/client handoff; INV retains art-production authority. The AS stages implement shared portions once. Nothing here closes those broader gates, authorizes paid infrastructure or rewrites history.

[NET07/NET09](bounded-network-requests.md) records the delivered transfer/SDK/tooling migration that ends local waits even when cancellation is ignored. Preserve [AST04](../limits/game-asset-storage.md#ast04--local-cache-and-download-work), exact conditional transfer retries, independent reader interests and publication authority. Timed-out transfers retain their occupied resources until confirmed settlement or owned-process termination; expiry cannot admit new publication or reuse a released temporary path; an already-admitted atomic cache commit retains ownership through settlement and exact reconciliation. NET11's new adversarial qualification supplements the delivered AS evidence without closing AS07's separate operational acceptance.

The [completed local-game repair plan](../projects/completed/local-game-current-release-plan.md) covers credential-free public cache preparation, readable preparation failures, bounded browser model scheduling and the current owner's installed-art selection. Existing permission checks and private-file credentials remain controlling; the complete first-playable implementation remains a separate assignment.

Deliver the first curated source, local fetch, preserved study and game release through the [shared module boundaries](../projects/game-asset-storage-tech-design.md#1-ownership-and-integration). AS01 supplies storage/publication; V3D02 supplies representation compatibility and saved bindings; AS04 integrates that consumer and the required V3D03 lifetime behavior. PD05 receives the hosted proof instead of being a prerequisite for AS04. AS06 runs alongside these stages and gates AS05 removal; AS07 supplies production operational evidence. General generation, arbitrary rigs and automatic retained-object collection are not required to finish this curated path.

- [x] Record the accepted storage direction, paired design, S3/URL scheme, environment/world ownership and staged migration; reconcile affected documentation. This is a design completion, not a runtime/storage pass.

## AS01 — Storage foundation and exact references

**Owners:** asset tooling, planned appearance/storage module, deployment. **Dependencies:** approved accounts/regions/domains/operating envelope for actual provisioning; no need to wait for the full game-hosting rollout.

- [x] Implement reusable reference/manifest validation, the narrow exact-transfer adapter and scoped metadata/pin records through one publication module using existing repository conventions. CLI and future generated-art callers share its admitted operations; V3D does not create another registry.
- [x] Provision reviewed durable library/study and nonproduction/runtime roles with conditional writes, protected origins, versioning, restricted access and a separately controlled recovery destination. Keep staging resets separate from durable art stacks.
- [x] Qualify full-file versus multipart checksums, type/length checks, partial/duplicate writes, access separation, publication claims and destination verification. Include lost acknowledgements, changed inputs under one operation ID, cancellation/grant loss before commit and late workers. **Exit:** an authorized exact artifact survives process restart, competing upload and unavailable storage without a broken committed reference; no public/private existence leak or revived cancelled publication.

## AS02 — Selective local and CI materialization

**Owners:** tooling, developer startup/build, existing asset consumers. **Depends on:** AS01.

- [x] Implement named lock/release/study/asset fetch, a shared bounded cache outside worktrees, verified atomic downloads, active-use pins, isolated mutable editing workspaces and explicit offline failures. Reserve disk for partial and completed files across processes; cancellation releases only one reader's interest.
- [x] Deliver the [canonical developer/agent workflow guide and routing](../projects/game-asset-storage-tech-design.md#71-developer-and-agent-instructions) with the usable tooling. Update `AGENTS.md`, onboarding and relevant art/documentation/procedure entrypoints to that owner; verify actual task routing and documented fetch/edit flows. AS03–AS06 extend and verify the same guide with their supported save/publish/migrate/recover operations before those stages close.
- [x] Add a deliberately public tiny CI fixture pack, scoped trusted-job access and checked-in small lock files. **Exit:** two clean worktrees reuse one verified file; concurrent/partial reads, cancelled co-readers, combined disk exhaustion, eviction and revoked scopes are correct; fork CI receives no private credentials; selected offline use needs no S3 connection after materialization under its recorded permission.

## AS03 — Study publication and permanent links

**Owners:** art tooling, authenticated artifact/study routes. **Depends on:** AS01; AS02 for local reproduction.

- [x] Publish immutable dated studies/iterations, reviewed gallery templates, exact source/model/media references, append-only feedback, current-selection index and viewer provenance.
- [x] Implement stable authorized source/revision pages and generated media/documentation URL mapping; preserve all requested meaningful trials and intentionally copied study dependencies.
- [x] Qualify private/public page and direct-media access, external-source rights, cross-study reuse, expired preview independence and an older study after a newer export. Exercise a previously issued credential after revocation against its selected policy, cache hits and blocked origin access. **Exit:** Mike can revisit the exact original comparison/video/model/source and distinguish reconstructed interactive views from recorded evidence, without local checkout paths or embedded expiring credentials.

## AS04 — Game release and consumer integration

**Owners:** client asset/scenery owners, appearance publication, deployment. **Depends on:** AS01/AS02 and the narrow V3D02/V3D03 representation/binding/consumer slice. Supplies asset-delivery evidence to PD05; does not wait for PD05 or the full V3D program to complete.

- [x] Externalize substantial GLB/texture/audio/scenery outputs, remove broad source/study glob dependencies from the player build and retain code-defined native depiction/loading feedback.
- [x] Publish scoped release/pack closures, destination-verified environment promotion and exact application/world bindings. Keep world selections with their authored owner. Exercise coherent save dependency capture/pinning, failed capture, restore and a newer catalog revision that does not silently rebind the saved world.
- [x] Reuse existing asynchronous loading, fallback, decoded resource sharing and stale-result/disposal paths; qualify bounded transfer/decode work and actual CloudFront/CORS/CSP/range delivery.
- [x] **Exit:** actual starting-scene game and study consumers work from a fresh checkout/browser with missing/corrupt/interrupted/replaced assets; no private sources appear in game output, and repeated appearances share resources. Record complete bytes, decode/upload stalls and memory; remote storage alone is no render-performance pass.

The [bounded native-browser evidence](../verification/game-asset-storage.md#actual-asset-free-game-and-recovery-controls) covers the 27-actor fixture, eleven visible models, both pinned hosted tools, explicit renderer replacement and owner recovery. Its scope is one machine and the recorded world; the configured current world's signed-in owner journey is qualified separately under AS07.

The current game's [entry readiness evidence](../verification/first-playable-entry.md)
supplements AS04: selected initial artwork and a complete rendered frame finish
behind the loading bar, while required failures offer an explicit scene retry.
This closes the temporary-artwork flash reported in the current Main; it does not
change the wider delivery or hosted acceptance scopes above.

- [ ] Restore/reconcile the configured development catalog for the exact release in [the current development lock](../../assets/locks/development.json), then demonstrate ordinary Main initialization, persistence and reopening. The format 29 reset preserves all 39 artwork/access tables, but its catalog lacks selected revision `sha256-b47b5a09e7cecb8f53d7be1c2036cd9efa3db1282c9842e95031c9ffa66546e1`; startup correctly refuses before creating a world. Use actual publication records and independently current authority through the existing recovery owner, without fabricating records or changing the selection. [Evidence](../verification/attention-and-memory-core.md#continued-normal-clock-qualification--october-28-2026).

## AS05 — Inventory, preservation and repository migration

**Owners:** tooling, art/doc maintainers. **Depends on:** AS01–AS04 and the AS06 preservation/restore gate before removal.

- [x] Inventory current and selected-ref historical asset versions, renamed paths, external source folders, meaningful attachments and all code/doc/gallery consumers; retain exact source/recipe/code provenance and a recoverable Git snapshot in protected storage.
- [x] Publish/verify the archive and backup; replace active documentation/media URLs using the migration map, preserve historical path metadata, and verify private/public access and all dependency closures.
- [x] Remove tracked large media/generated asset payloads only after fresh-checkout/build/render/restore evidence. Enforce the zero-payload Git/build guard, including small geometry, vector bundles and encoded media. **Exit:** Git carries source, semantic metadata and exact references without stored asset payloads, all inventoried art is retrievable, and docs link to real verified hosted revisions. No history rewrite is part of this stage.

## AS06 — Retention, withdrawal and recovery

**Owners:** storage/publication, PD06, save/rights owners. **Depends on:** AS01; exercise AS03/AS04 records as they become available.

- [x] Backfill protected recovery copies, record coherent metadata/object checkpoints and implement bounded temporary cleanup distinct from durable retention.
- [x] Qualify current grants/withdrawals during an isolated restore, missing dependencies, source/study preservation, expired preview pins and unavailable backups. Include missing current restriction records, a withdrawn derivative copied into studies/delivery, and a separate permitted use of identical bytes. **Exit:** a retained source, complete study and game release restore with verified content and current access policy; unknown authority blocks affected delivery, withdrawal reaches the correct controlled copies, and actual recovery evidence is recorded.
- [x] Keep automatic retained-object deletion disabled until reference-aware GC, publication exclusion and mark/grace/recheck races are qualified. A later GC implementation is an explicit substage; its absence does not permit age-based deletion. Record growing storage and admission pressure under AST05/AST08.

## AS07 — Production delivery and operational qualification

**Owners:** PD05/PD06/PD08, V3D qualification, asset storage. **Depends on:** AS01–AS06 and the relevant PD01–PD04 operating, infrastructure, access and rollout prerequisites. Supplies the asset portion of PD05/PD06/PD08 evidence; their broader acceptance is not a prerequisite for generating that evidence.

- [x] Promote the same qualified closure into production with exact destination verification and independent release selection; rehearse fallback, withdrawal and compatible rollback.
- [x] Measure actual startup/warm transfer, requests, decode/GPU upload, study load, cache/retained bytes, storage/CDN/backup costs and selected recovery objectives; configure finite admission/work limits before enabling public growth. **Exit:** PD05 receives complete asset-storage evidence, not a directory-only implementation or a claimed capacity based on uploaded file count.

- [x] Complete normal OIDC sign-in and use the supported owner control to select the installed release in the configured current world; verify world/player identity, expected characters and unchanged authentication. Mike explicitly discarded prior development progress: the supported checkpoint owner loaded the current ordinary initializer, then the same signed-in account selected the installed release. All seven people remain alive after persistence/restart; protected authority/accounting records were unchanged across replacement. See [current local game delivery repair](../verification/game-asset-storage.md#current-local-game-delivery-repair). This does not qualify the discarded 31-actor save.

The [browser/loading slice](../verification/game-asset-storage.md#upload-stalls-and-the-first-complete-art-frame) is measured on one actual world/machine: fresh and warm transfer, model preparation, synchronous upload stalls, first-complete-frame CPU/GPU time and renderer memory. Warm browser reload still used the network. The linked record also includes measured retained storage, current rate estimates and the full isolated restoration duration; billing remains delayed and these measurements are not service objectives. The current owner selection and browser loading repair pass under the separately recorded current-world workload; older rendering measurements do not qualify that workload's frame rate or capacity.

The configured maximum cache size and broad concurrent-client throughput remain unqualified. Before expanding beyond the measured developer workload or increasing AST04 limits, measure complete cache metadata work and caller latency with a large retained cache; retain the current cross-process pins and cancellation guarantees. This is a growth-qualification gap, not an additional feature required for the curated migration.

## AS08 — Separately authorized Git history reclamation

**Owners:** repository operator and affected branch/worktree owners. **Depends on:** AS05/AS06; explicit approved rewrite/ref/coordination plan.

- [ ] Inventory affected refs/tags/PRs/clones/worktrees and retained commit links; establish backup/restore and old-to-new commit/recovery mappings before proposing the concrete operation.
- [ ] If authorized, remove only inventoried externalized blobs from the agreed histories, coordinate remote updates and clone/worktree resynchronization, and verify recoverability plus actual clone/object-size reduction. **Exit:** no lost code/art, no silently reset unrelated checkout and no broken historic recipe reference. Until then, deleting current files reduces checkout/build weight but leaves old reachable Git blobs.

## Verification status

The [implementation review](../verification/game-asset-storage.md#implementation-review) records corrected dependency-use checks during withdrawal, recoverable authority admission, enforced transaction boundaries, cache queue/lifecycle work, study selection, build enforcement and renderer cleanup. Root and scoped guidance already route these tasks through asset, performance and authorization owners; no duplicate AGENTS rules are added.

Eight S3 buckets, separate access roles, four protected CloudFront distributions and the private study access service are deployed in project `027677879749` / `us-east-2`. The public hostname is `assets.openlegend.ai`. Mike approved public presentation of the current art/source/study collection; private future collections retain scoped access. Separate buckets and roles protect recovery from ordinary mistakes, but not loss of this entire project or Region.

Current original preservation covers 1,270 paths and 1,376,244,958 bytes. The selected runtime publication contains 331 paths and 228,365,329 bytes; the selected public study/source publication contains 1,485 paths and 1,379,116,490 bytes. Exact-version verification and committed receipts record their physical buckets and S3 versions. Current immutable study/source pages and a compiled public 3D viewer are published. These publication counts establish preservation; the separate browser and build evidence establishes the qualified consumer behavior. The complete current-tree audit reports zero stored asset payloads, including the final wireframes, small face/cloth meshes, icon bundle and embedded SVG texture. Their exact public and protected copies passed full readback. Current checkout/build sizes and consumer limits are recorded in the verification report; reachable Git history is unchanged.

Focused disposable PostgreSQL scenarios cover restart/replay/cancellation, lost acknowledgements, current grant changes, saved release binding, protected authority recovery, named page copies and separate development/production physical copies. Actual cloud checks cover conditional writes, public byte ranges, private origin denial, signed-cookie expiry, retained versions and completed withdrawal invalidation. All 68 historical snapshots and their 3,028 named dependency targets are published and checked. The actual asset-free browser game passed [bounded cold/warm/failure and renderer-replacement qualification](../verification/game-asset-storage.md#actual-asset-free-game-and-recovery-controls) through the public endpoint. Protected cloud verification, all 13,692 exact-version private intake copies, native world restoration, the six-tip Git restoration and actual tracked-media removal pass. The configured current world's normal OIDC owner selection and complete model loading pass. Separately gated history reclamation remains under AS08. Existing art/render evidence remains valid only for its recorded workload.

**Design-only checks — 2026-10-17 19:54 UTC:** reviewed the complete affected diff and checked local documentation targets/anchors, with no missing links. Changed-file formatting, `git diff --check` and `pnpm guidance:check` pass; the latter retains advisory guidance-size warnings. Scoped [routing read reports](agent-guidance.md) do not establish broader installed-agent dispatch qualification. That design-only check did not change executable code or run game/runtime checks; implementation evidence is recorded above and in the linked verification record.

**Architecture review — 2026-10-17:** checked the complete storage design and integration changes against the current consumers and world, identity, publication and save contracts. Reconciled shared module ownership and stage dependencies, revocation/recovery behavior, exact-byte verification, operation recovery and cache accounting. AWS checksum and CloudFront access/cache semantics were checked against the official sources linked in the technical design. Changed-file formatting and whitespace checks passed; 1,257 relative links and 681 local heading references resolved. The playbook upload fragment passed Bash syntax and local digest-encoding checks, including different bytes producing a different checksum; AWS was not invoked. That design review did not qualify cloud, browser, runtime or capacity behavior; the implementation evidence and current stage status are recorded above.
