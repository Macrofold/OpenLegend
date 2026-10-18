# Game asset storage, delivery and art studies — feature specification

| Status      | Current progress                                                                                                               | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | All asset payloads are external and reviewed implementation fixes are qualified; existing-world owner sign-in remains pending. | 2026-10-18   |

**Specification reconciled with implementation:** 2026-10-18 04:11 UTC. The [review evidence](../verification/game-asset-storage.md#implementation-review) records the checked scope and limits.

**Implementation authorized by Mike.** Provisioning, uploads, verified preservation and current-tree asset removal are in scope; Git history rewriting retains its separate AS08 authorization gate. The [technical design](game-asset-storage-tech-design.md) owns object keys, records, URLs, permissions and publication. Existing render, appearance, world and save contracts remain authoritative.

## 1. Purpose and current baseline

Keep the code repository small while making every approved game asset and every preserved art-study iteration reliably retrievable. A developer should be able to clone the code, fetch only the assets needed for a task, run the game and reproduce a selected study. A player should receive the approved assets needed for their scene without downloading our authoring library or experiments.

The pre-migration baseline at branch revision `18f164d188767fe062b40f3e1b275ba51abc9ba9` contains about 524.7 MiB of client props/alternatives, 329.3 MiB of editable sources/downloads and 301.9 MiB of study archives. Its local `dist/client` occupies about 846 MiB because the asset inspector includes GLBs and editable Blender projects in build output; this is not the initial player download size. The migrated checkout measures about 54.4 MB, compared with about 1.43 GB before cleanup; reachable Git history is unchanged. The post-removal player build passes with three files totaling 3,667,328 bytes. These are checkout/build measurements, not initial player download or rendering-capacity claims. The [AS tracker](../maintainers/game-asset-storage.md) and [verification report](../verification/game-asset-storage.md) record preservation, full isolated restoration and bounded game/study checks. Selecting the installed art in the existing 31-actor world still requires its owner to complete normal sign-in.

Earlier art, licenses, meaningful rejected trials and exact evidence remain preserved externally. Active asset links and retained study entries use verified immutable hosted replacements; original repository paths remain provenance. Git history reclamation requires separate authorization under AS08.

## 2. Agreed product decisions

1. **S3 is the durable home for every asset payload, regardless of size.** CloudFront delivers approved game files and authorized study pages. Git holds code, shaders, JSX, small semantic authored data and catalogs, version pins, documentation, recipes, licenses and attribution. Standalone media/SVGs, generated mesh or animation data, vector/icon bundles and embedded images remain external; there is no tiny-file or bootstrap-media exception.
2. **Separate production art, working sources and study archives.** They have different audiences, release policies, retention and backup needs. A development environment reset cannot erase the art library or study history.
3. **Use exact references by default.** Unchanged files are reused by reference within the same storage/access boundary. Intentional copies across library, study, environment, delivery or recovery boundaries are permitted and recorded. A copy is never mistaken for a new artistic revision.
4. **Published versions never change in place.** A revised wolf, texture, animation, gallery or catalog receives a new revision. An explicit selection can choose that revision; existing releases and studies retain their pins.
5. **World ownership and storage are different concerns.** A world's trees and creatures remain authored world content. A shared file store does not turn them into universal engine rules. Cross-world reuse requires permitted references, not copying every file into each world directory.
6. **Documentation uses durable HTTPS references after migration.** Evidence links identify a specific study or asset revision. Private links require login but remain stable; temporary signed download URLs, machine paths and provider download links are not durable references to our stored work.
7. **Retain meaningful study history.** Preserve all iterations requested by Mike, including unsuccessful trials. Storage pressure stops or limits new optional work before it silently erases preserved work. License, privacy and explicit withdrawal obligations remain controlling.

## 3. What is stored

| Collection                | Contents and audience                                                                                                                            | Required behavior                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Runtime delivery          | Reviewed models, textures, sprites, audio, animation clips, generated scenery data, permitted fonts/UI media and dependency manifests            | Only qualified, permitted representations; exact versions, readable failure/fallback and independent delivery from application code |
| Art library               | Original downloads, permitted references, editable Blender/Meshy outputs, source textures, rigs, export candidates, source evidence and licenses | Private by default; retain source lineage, allowed uses and reproducible preparation; originals stay identifiable                   |
| Study archive             | Screenshots, recordings, model alternatives, comparison pages, review notes and reproducibility records                                          | Dated permanent study identity, immutable iterations, clear selection/rejection labels, original framing and recorded limitations   |
| Intake and temporary work | Untrusted imports, incomplete transfers, disposable exports and conversion scratch                                                               | Isolated from runtime delivery; bounded work and cleanup; never the sole copy of a preserved study or accepted source               |
| Recovery                  | Independently protected copies of retained objects, manifests and their publication/pin records                                                  | Recoverable after ordinary operator mistakes; the selected one-project deployment cannot survive loss of its entire project/Region  |

Exported JSON containing mesh, pixel or animation payloads and vector/icon bundles are assets even when small. Base64 and percent-encoded images embedded in CSS or other source files follow the same external-storage rule. Code-authored procedural generators, JSX drawing code and small semantic authored definitions stay in Git; their exported asset outputs follow this policy. Compiler code, shaders, scripts and WASM remain application build artifacts with normal code release controls, not arbitrary executable art served through an asset manifest. [AST01](../limits/game-asset-storage.md#ast01--git-and-bootstrap-assets) owns the zero-payload repository restriction.

Reference artwork can be useful for research without being licensed for runtime redistribution, public study hosting or provider input. Those permissions are recorded separately. A source-page link alone is not proof of a redistribution grant.

## 4. Identity, organization and versions

The catalog must distinguish the following without making users understand S3 keys:

- **Owner:** engine presentation package, authored world package, permitted shared collection or private creator/world scope.
- **Asset:** a stable concept such as a particular wolf model, independent of its display name and folder label.
- **Revision:** an immutable version of that asset's description, dependencies and permitted representations.
- **Representation:** a specific runtime model, editable source, texture, animation, thumbnail or supported lower-detail alternative.
- **File:** exact bytes identified by a checksum; several permitted records can reference the same bytes.
- **Pack and release:** a compatible selection of asset revisions, and the exact collection published for a particular deployment or reproducible offline use.
- **Study and iteration:** the question being explored, followed by immutable captures and alternatives from one recorded iteration.

Names, categories and tags retain their descriptive meaning in manifest metadata; a general asset-search/browse UI is outside this implementation. Renaming “Woodland wolf” or moving it between browsing categories must not break URLs, history or world references. Art revisions are independent of engine versions, world-definition versions, deployments and S3's recovery versions. Compatibility is explicit; a newer engine does not require copying every asset.

A reusable world's content package and one running instance of that world are separate. Hundreds of worlds using the same approved forest pack should reuse its files. An appearance created privately in one world has separate access and binding records even if identical bytes exist elsewhere.

## 5. Player and developer journeys

### A player enters the game

The curated game saves one exact presentation release. The server discloses that release only when the current participant may read it; the browser loads external art only when it matches the exact release compiled into its build. That build maps existing authored appearance choices to exact files, and existing resource owners load the models/textures needed for the scene. Required starting-scene files take priority; optional loading stays bounded. Repeated trees share the same decoded model and materials. The game never waits for an S3 listing or source conversion in its simulation/render loop.

If an optional model cannot load, retain the prior compatible, still-permitted representation or use an approved lightweight fallback. Withdrawn content cannot remain the fallback. Show a useful loading/unavailable state where appropriate. An art failure cannot delete the animal, change its dimensions mechanically, buy new generation or change what the character knows. Missing mandatory release dependencies prevent publication; unexpected delivery failure remains a diagnosed runtime failure. A known retained release whose rights were withdrawn can restart, save and restore an existing pinned slot using native depiction. An unknown/corrupt release or unknown current authority cannot be silently treated as that fallback. A newer or older build can open a known retained release using native depiction until the owner explicitly selects the installed release; saved-slot restore and new installation still refuse a mismatched release before replacing the active world.

### A developer starts a fresh checkout or worktree

The code revision identifies the exact supported release or development asset lock. One explicit asset-fetch operation downloads its required files into a shared local cache outside Git, verifies checksums and reports missing access clearly. Worktrees reuse identical cached bytes without sharing mutable Blender edits. CI fetches the named fixture/release subset, not the whole art archive.

Developers and agents follow one maintained asset-work guide, reached through `AGENTS.md` and the relevant development/art entrypoints. It provides tested instructions for finding and pulling exact assets, editing isolated working copies, saving sources and outputs, preserving studies, publishing permitted revisions and updating references. Each delivered tool includes its matching instructions; architecture prose and proposed command names alone do not complete the workflow.

A warmed local authoritative game can use cached files without AWS connectivity while its local database still checks current permission. Public assets can also be fetched explicitly without AWS credentials; private authoring commands require authenticated identity and current catalog admission. There is no portable disconnected private-grant package or cache-authorized access substitute. A cache miss is reported; it does not silently choose “latest” or regenerate art. Environment configuration explicitly selects the nonproduction or production runtime bucket and scoped read role; promotion does not happen merely because a branch is renamed. Fork/untrusted CI receives only a deliberately public small fixture pack and no private storage credentials. Full private qualification runs in a trusted context before promotion.

Concurrent downloads share verified bytes without letting one cancelled task interrupt another. Disk admission includes partial downloads and reservations across worktrees; unsaved artist work is kept separately and is never deleted to free the cache. An oversized requested set gives a clear capacity result before exhausting the disk.

The local study server and its browser use one exact study selection, including recorded scenes and source records. The game's developer art link opens a verified immutable hosted inspector; current local rendering work uses the separate operator study server. Optional interface artwork is prepared before the ordinary game interface mounts, with a finite wait and accessible fallback symbols; standalone scene studies do not wait for that artwork.

### An artist improves the wolf

Fetch its exact editable source and reference records; create a separate mutable workspace; export several variants through the existing tools; inspect them in the actual renderer. Publish a study iteration with all meaningful choices. Selecting a preferred variant records a review decision; runtime publication additionally checks its supported animation, format, rights and dependency requirements. Copy only the necessary qualified files into the target delivery boundary and record the relationship to the source/study.

### Mike revisits an earlier study

A dated URL opens the original comparison and recordings with the model revisions, camera/light settings and code revision used. Later work does not change those captures. A study landing page can identify the current selection, but a specific iteration link always retains its earlier evidence. An interactive historical viewer uses its recorded supported viewer build; when that viewer is unavailable or incompatible, retained screenshots/videos still show the actual historical result rather than presenting today's renderer as equivalent evidence.

### A release moves from development to production

Development/preview, staging and production choose explicit release records. Promotion verifies the exact qualified files and dependencies in the destination, then changes the deployment selection through its owning release process. Source and destination may contain intentional copies with the same checksum. A staging success does not grant production publication; a branch name or mutable “latest” file is never a saved asset identity. Each publication retains the actual project, Region, bucket, canonical/named object keys and exact S3 versions, so identical logical releases in two environments have independently provable coverage.

## 6. Study organization and documentary references

Each study has an ID, human title, UTC creation timestamp with display timezone, scope, purpose, relevant art-direction revision and optional related worlds/assets. Each iteration records:

- Exact model/source/finish references, previous iteration and meaningful alternatives; assets can appear in many studies without duplication.
- Exporter and source code revision, tool versions, parameters, inputs and output checksums. Generated work also preserves permitted provider/model/receipt references, without publishing credentials or private prompts.
- Capture resolution, camera pose/projection/distance, lighting, renderer/pixel profile, animation clip/time/speed and relevant hardware when a performance claim is made.
- Preserved media, comparison layout, notes, Mike's feedback, selected/rejected/unreviewed status and measured limitations.

Study membership does not imply production approval. “Selected for this comparison” and “qualified for production use” remain different decisions. A selected choice points to an existing immutable revision rather than creating a copied “final-final” file.

New documentation links to a published study iteration or asset revision page; inline media links resolve to exact hosted objects in the appropriate access boundary. The migration provides reviewed immutable source-record/download pages and CLI source-bundle access. It does not provide a general private artifact-management portal. A future authenticated source page must preserve that same exact-reference/current-audience boundary. Do not embed access tokens in Git. Reference-page URLs to third-party creators remain attribution; retained internal copies get their own durable URLs.

## 7. Failure, retention and recovery expectations

Interrupted publication cannot expose a manifest whose files are missing. Duplicate upload attempts converge on the same verified file within a permitted boundary. Two artists publishing alternatives cannot silently overwrite each other's revision or selection. Losing a local cache is recoverable by download; losing a source does not authorize paid regeneration.

Retained releases, current-format saves, active work and preserved studies protect their referenced files. Ending a preview deployment releases that preview's references but does not delete a source or study that also uses them. Any future storage collector must account for all these references and in-flight publication before deleting anything. Automatic retained-object collection is disabled. Publication reserves finite global physical bytes/files/operations before network work, including pending and terminal orphan claims; reaching the envelope refuses new optional publication rather than deleting preserved files. Initially, retained library/study/runtime content has no automatic age-based deletion; temporary intake and local caches have separate bounded policies. See the [limits inventory](../limits/game-asset-storage.md).

Withdrawal stops new SQL-authorized delivery and removes selected releases while recording why an old study or release cannot serve a file. For public and supported curated-private runtime/study copies, the operator workflow follows exact physical receipts, preserves independently permitted uses, deletes current copies with retained-version markers and waits for controlled CDN invalidation before declaring completion. Interrupted physical/cache work remains pending and fences republication while the logical denial stays committed. Do not secretly replace it with different art. Files already delivered to a user cannot be recalled merely by revoking access, including private files. Recovery must apply current permissions and withdrawals rather than restoring access from an old backup.

An independently permitted use requires the other release and every dependency to retain permission for that release's actual purpose. Permission to show a model in an art study does not authorize its use in the game. A permission change that cannot fit the supported complete recovery record is refused before it commits, preserving the previous usable recovery coverage.

For private delivery, revocation immediately stops issuing new access credentials. Existing signed downloads can remain usable for their explicitly admitted lifetime; already-started transfers can complete. Content needing current permission on every request uses a delivery path that enforces that requirement. Cache invalidation alone does not withdraw a file. Restrictions cover the affected logical uses and controlled copies, without assuming that another independently permitted use of identical bytes must also be removed. The documented hosted private study login checks the exact named page’s committed publication and current SQL permission before and after issuing its expiring credential. Signed-cookie requests then retain their admitted lifetime until expiry or complete controlled origin/cache withdrawal. Privileged direct IAM administration is separate from this normal login path; neither exposes arbitrary creator/world scope. Current private game/local-viewer reads use the current-permission handler. If current permission/withdrawal records cannot be recovered, restored application access stays quarantined until an independently current complete authority record is established. Restored permitted bytes go first to private intake, and their later publication/installation requires normal admission.

## 8. Scope and implementation stages

This design covers curated and future generated assets, world/engine ownership, environments, delivery, local development, studies, references, retention and migration. It does not implement a marketplace, collaborative Blender editor, general digital-asset-management product, new gameplay semantics, automatic generation service or a new renderer. No Git LFS repository or per-world bucket is required.

Deliver the curated path first: store/source catalog and selective local fetch; hosted studies; a real game release and bounded consumer. Qualify preservation and restoration before removing tracked media during migration, then qualify production promotion. Future private/generated appearances consume the same storage/reference boundary through V3D/INV authority rather than bypassing it. The delivered curated release binding does not claim to implement generated appearance production, per-entity release bindings or a general art-management product. The [implementation tracker](../maintainers/game-asset-storage.md) owns exact stages and dependencies.

Migration preserves current files and reachable historical versions before removing tracked copies. History cleanup is a distinct later operation requiring an approved ref/worktree coordination plan. Preserving artwork versions is archival retention, not support for incompatible old application APIs or saves; the [development policy](../../AGENTS.md#development-save-policy) is unchanged.

## 9. Acceptance

The feature is complete only when a fresh checkout can fetch a bounded named set and run the selected game/study; the actual browser renders the pinned assets; required rights/dependencies survive restart; multiple worktrees reuse verified cache bytes within the combined disk budget; private scopes cannot access each other's artifacts; interrupted/cancelled publication leaves the prior selection intact; retained studies and old source versions remain retrievable; migration rewrites documentation to verified URLs; and a restore into a clean destination reproduces a retained release/study under current permissions. Lost acknowledgements must recover the same outcome, and missing current restriction records must block restored delivery.

Measure initial/warm download bytes, build output, request counts, decode/upload stalls, cache reuse, peak/retained browser memory and publish/restore failures. Storage externalization alone does not prove faster rendering or reduced GPU memory. Numerical service/capacity promises require qualification; [A3D](../limits/3d-pixel-art.md) and [deployment limits](../limits/production-deployment.md) retain their owners.

The documented workflow must reproduce the supported fetch/edit/preserve/publish journeys from a fresh checkout. Verify agent routing for development, art creation, capture, asset-link maintenance and new tools, including package-directory starts; an unrelated prose mention must not trigger asset operations. Record actual read/execution evidence and any unverified agent environments separately.

## Maintained records

- Implementation and migration: [AS01–AS08](../maintainers/game-asset-storage.md).
- Limits and constraints: [Asset storage inventory](../limits/game-asset-storage.md).
- Architecture and directory/URL contract: [Technical design](game-asset-storage-tech-design.md).
- Consuming projects: [Production deployment](production-deployment-feature-spec.md), [3D asset pipeline](3d-pixel-art-asset-pipeline.md), [runtime invention art](../invention-art-pipeline.md).
