# Game asset storage — implementation plan

| Status      | Current progress                                                                                                                        | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | All asset payloads are external and strict cleanup, publication and recovery checks pass; existing-world owner sign-in remains pending. | 2026-10-18   |

The [feature](game-asset-storage-feature-spec.md), [technical design](game-asset-storage-tech-design.md), [AS tracker](../maintainers/game-asset-storage.md) and [AST limits](../limits/game-asset-storage.md) own requirements and acceptance. Mike authorized the complete implementation, AWS provisioning in the authenticated OpenLegend project, migration, documentation and agent routing. History rewriting remains a separate AS08 operation with its own concrete coordination plan.

## Scope, base and ownership

Work stays on `codex/ai-game-dev-art-workflows` in `/Users/mzw/.codex/worktrees/7196/OpenLegend`, starting at `8e1134d9b367e717ab902965870e6a9997848c67`. It contains the selected local `main` at `4c5675e0dc632deb8e519bbbc06f4401dd1b0ff8`; the repository remote is `https://github.com/Macrofold/OpenLegend.git`. No branch or other checkout switch is needed.

The implementation affects approximately 10,000 lines across shared references, server publication/access repositories, S3 transfer and cache tooling, developer commands, existing client loaders/build entrypoints, infrastructure and migration/recovery tools. Physical-copy recovery, current access restrictions and historical page preservation account for much of the cross-layer scope. Privacy, durable publication, saved dependencies and deletion require staged qualification. Media removal affects over a thousand tracked files without changing their preserved bytes.

- Shared contracts and publication: one pure package and one PostgreSQL authority, integrated with existing repository and backup conventions.
- Consumers: preserve current scene/resource owners; change exact file lookup and separate study/player builds, not gameplay semantics.
- Transfer and workflows: explicit `openlegend` credentials, exact verified immutable objects, bounded shared cache and isolated editable workspaces.
- Preservation and migration: inventory every selected current/historical dependency, retain exact original media and provenance, repair local and dynamically constructed study links, prove recovery before removal.
- Documentation/guidance: one tested practical workflow guide, conditional routing and accurate open qualification records.

## Dependencies and sequence

1. Freeze current inventory and review actual callers, including large generated JSON, embedded gallery media, fonts and source downloads. Record scope of inventoried Git refs and existing broken links.
2. Implement and qualify exact references, durable publication/claims/pins/current restrictions and S3/cache interfaces independently of physical bucket names.
3. Deploy to Mike's selected AWS project `027677879749`, Region `us-east-2`, profile `openlegend`, using separate buckets and roles and the now-provisioned `assets.openlegend.ai` hostname. Recovery protects against ordinary publication/deletion mistakes through separate permissions, but cannot survive loss of the entire project or Region. The configured AWS experience forbids cross-Region resources. AWS currently reports Paid/Active; this implementation did not request a plan change. Mike explicitly approved public access to the migrated art, sources and studies; retain their recorded rights qualifications and do not infer production licensing from public access. Future private content retains scoped access.
4. Provision reproducible retained storage and narrow delivery/authoring/recovery permissions, finite operating/spend limits and useful visibility. Verify actual policies and origins before publication.
5. Publish retained sources/studies and exact release metadata. Integrate game/study consumers, local/offline workflows and coherent save dependency retention. Keep source paths/private metadata out of player output.
6. Qualify clean-cache pulls, concurrent worktrees, publication interruption/replay/cancellation, permissions/revocation, partial/corrupt files, cache exhaustion, actual browser game/study rendering and isolated recovery under current restrictions.
7. Publish verified permanent links and rewrite the exact migration map. Remove tracked substantial payloads only after all required preservation, consumer and restore gates pass. Keep code-defined loading/native depiction, semantic metadata, references and licenses in Git; store no standalone or embedded asset payloads. Measure checkout/build sizes and report reachable Git history size separately.
8. Reconcile all affected documents, the practical guide and AGENTS routing; review the complete diff and commit task work. Prepare any separate AS08 reclamation operation concretely, without rewriting unrelated refs or other worktrees.

## Performance and verification

Cost grows with retained media/history, unique dependency bytes, parallel transfers, decoded representations, catalog pages and recovery copies. Compile/check exact dependency closures once at publication; reuse immutable verified files across worktrees and existing decoded client resources. Changed digest, access boundary, rights, binding or authority generation invalidates the appropriate use; unrelated world ticks and camera motion do not. Bound bytes and work before materialization, including partial files and cross-process reservations.

Measure complete cold/warm fetch, clean build, game/study open, concurrent worktree, publication and restore journeys. Record transferred/retained bytes, request counts, decode/upload stalls, browser memory and failures separately from cloud product claims. Use focused existing/native scenarios, disposable PostgreSQL where needed, static checks and actual browser interaction; no paid AI calls are required. Count authorized cloud work against the root task spending ceiling; existing AWS credits are not a larger task allowance.

Completion requires the AS01–AS07 criteria and the guide/routing checks for delivered workflows, verified archived media and historical viewers, smaller current checkout/player output, and no task-owned uncommitted work. Unavailable configuration, hardware or runtime evidence remains unfinished acceptance, not a pass. AS08 completion additionally requires its explicit approved rewrite/ref plan.

The completed cleanup removes 1,285 tracked asset payload files, externalizes the inline panel texture and replaces 15 retained HTML entries with verified immutable hosted links. The current checkout measures about 54.4 MB versus about 1.43 GB before cleanup. The production build and zero-payload guard pass: three `dist/client` files total 3,667,328 bytes. Reachable Git history is unchanged.

Full isolated restoration verified all 13,692 physical object versions totaling 8,266,953,700 bytes in private intake against an independent listing and current authority generation 52. Its disposable database was removed; original source objects were not deleted. The [verification report](../verification/game-asset-storage.md) retains the recovery and bounded browser evidence. The existing 31-actor world remains unchanged without selected external artwork. Its owner still needs to restart the configured server, complete normal OIDC sign-in and choose the installed art; final acceptance remains open.

## Complete current-tree cleanup

Mike requested no asset payloads in the current repository tree. The nine standalone SVG wireframes, six small generated mesh JSON files, UI icon artwork bundle and inline SVG panel texture are externally published with protected-copy readback and removed from Git source. Preparation code, semantic names, small catalogs, licenses and attribution remain source. Code-authored JSX, shaders and ordinary declarative definitions remain code.

The focused completion is approximately 350 changed logic lines across the shared inventory/guard and existing client resource owners. Publish eight exact runtime files with the previously verified runtime release as a required dependency, and publish the complete study supplement with its prior study release as a required dependency. Verify both physical runtime environments, anonymous exact HTTPS bytes, protected recovery copies and isolated readback before removal. Update the two release locks and existing wireframe links. The guard must reject small mesh arrays, vector artwork bundles and encoded media without treating ordinary source templates or JSON schema examples as assets.

Cost grows with the seventeen newly preserved files and their deliberate delivery/recovery copies; no whole-library transfer is needed. Reuse existing immutable dependencies and one icon-catalog request, prepare mesh data once per renderer owner, and abort late work at that owner's destruction. Exact selected hashes invalidate reuse. Exercise normal/failing/cancelled renderer loading, the icon fallback and CSS texture, then typecheck, production/study builds, full current-tree inventory, formatting and affected links. Reuse prior unchanged recovery and cloud-delivery evidence. The existing shared $10 ceiling applies; reserve at most another $0.10 for these small cloud transfers. No provider calls or history rewriting are needed.

## Implementation review

Review the complete asset implementation from `8e1134d9b367e717ab902965870e6a9997848c67` through `d3a7c939a6a5b58fec6a1e7b980862a77d56368b` in this existing checkout of `https://github.com/Macrofold/OpenLegend.git`. The selected implementation base is the already integrated local commit `4c5675e0dc632deb8e519bbbc06f4401dd1b0ff8`; reviewing this change does not rewrite history or integrate unrelated newer work. Inspect all affected owners/callers, including public delivery and current SQL authority, physical-version recovery, cache reservation/lifecycle, client loading, generated output boundaries and deployment/tool contracts. Corrective scope is approximately 350 logic lines across the existing owners: withdrawal/current-authority safety, cache queueing and cleanup, browser loading/resource cleanup, one shared viewer selection, external output guards and build/logging verification. These are bounded owner-level fixes; no new storage service or gameplay contract is required.

Split the audit among publication/recovery, client/rendering, storage/cache/tooling and an independent spec/guidance comparison. Fix concrete correctness, authority, cancellation, performance and ownership defects before optional refactoring. Keep world-authored visual selections with their current owner and generic storage/transport outside deterministic gameplay. Update the feature specification to the actual delivered behavior, record its review datetime and the technical design's use datetime, reconcile accurate stage/limit/verification status, and add guidance only for a demonstrated gap that existing routed instructions do not cover.

For recurring requests, cost grows with delivered bytes, concurrent clients, authorized dependency closures and cache readers; identify full scans or synchronous I/O on those paths. Reuse exact immutable file metadata and prepared closures, while validating current permissions at the owning boundary after waits. Publication/recovery work remains bounded offline/operator work. Select focused existing or small disposable checks for each actual fix, measure meaningful changed hot paths through their callers, reuse prior unchanged cloud/browser/recovery evidence, then run affected static/build/guidance/link checks and review the full resulting diff. No paid provider call or AWS mutation is needed merely to review; all work shares the existing task budget. Commit corrections and report remaining acceptance without treating the existing owner sign-in or separately authorized history rewriting as completed.

## Maintained records

- Implementation: [AS01–AS08](../maintainers/game-asset-storage.md).
- Limits: [AST01–AST08](../limits/game-asset-storage.md).
- Contract: [Feature specification](game-asset-storage-feature-spec.md) and [technical design](game-asset-storage-tech-design.md).

## Separate history-reclamation approval

AS05 removed the inventoried substantial media from the current checkout and player build. Existing clones and remote history retain reachable older media. AS08 requires Mike to approve the exact refs whose commit identities may change and a coordinated remote update; the instruction to work on this branch does not authorize rewriting local or remote `main`.

Protected storage contains a self-contained 1,358,441,794-byte Git bundle, SHA-256 `4ce0e76aad43fb129d29293ea6af359ec87c6abc3bbc52f55276fbf16603792f`, covering these explicitly selected pre-migration tips:

| Ref                                                   | Preserved commit                           |
| ----------------------------------------------------- | ------------------------------------------ |
| Task starting branch                                  | `8e1134d9b367e717ab902965870e6a9997848c67` |
| Selected local `main`                                 | `4c5675e0dc632deb8e519bbbc06f4401dd1b0ff8` |
| `research/game-engine-tradeoffs`                      | `f2561a7979739225b61e83c9ced6ef78eda9e639` |
| `docs/ai-game-development-research-review-2026-10-17` | `ac05217019d2397fd355a948019dda87fe506ef5` |
| `codex/starting-scene-pixel-art`                      | `2a8d6b3ea9e7d0f04a262d046bc7868377554665` |
| `codex/grounded-asset-research-2026-10-17`            | `83147d81ec77bfba52954a81d059956012fb50e0` |

Independent cloud download, bundle verification, a new bare-repository restore, all six tip checks, full Git integrity checking and representative current/historical model/source checks passed. These preserved tips are recovery evidence, not an approved rewrite scope. The shared object store measured about 160.69 MiB loose and 1.57 GiB packed before reclamation; that is not a fresh-clone size prediction.

Before any destructive history operation, inventory the specifically approved branches, tags, pull-request references and affected clones/worktrees; agree a maintenance window and whether historical generated HTML is removed or reconstructed. Prepare filtering in an isolated mirror, removing only inventoried media blobs while retaining code, licenses, provenance and comparison records. Produce old-to-new commit mappings and a verified fresh clone with measured object sizes before proposing exact leased remote updates. Coordinate adoption without discarding unrelated work. No history rewrite, shared-object pruning or force-push is part of the currently authorized implementation.
