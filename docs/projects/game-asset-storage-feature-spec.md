# Game asset storage, delivery and art studies — feature specification

| Status      | Current progress                                                                                              | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | The storage direction and design are documented; cloud storage, consumers and migration remain unimplemented. | 2026-10-17   |

**Direction accepted by Mike; implementation not started.** This request authorizes design and documentation, not provisioning, uploads, asset removal or Git history rewriting. The [technical design](game-asset-storage-tech-design.md) owns object keys, records, URLs, permissions and publication. Existing render, appearance, world and save contracts remain authoritative.

## 1. Purpose and current baseline

Keep the code repository small while making every approved game asset and every preserved art-study iteration reliably retrievable. A developer should be able to clone the code, fetch only the assets needed for a task, run the game and reproduce a selected study. A player should receive the approved assets needed for their scene without downloading our authoring library or experiments.

At branch revision `18f164d188767fe062b40f3e1b275ba51abc9ba9`, tracked client props/alternatives occupy about 524.7 MiB, editable sources/downloads 329.3 MiB, and study archives 301.9 MiB. The existing local `dist/client` occupies about 846 MiB. The asset inspector imports GLBs and editable Blender projects into build output; runtime models are fetched on demand, so these figures are not the initial player download size. The current workflow preserves files in Git and has no implemented S3 asset catalog or selective external downloader.

This design supersedes that **storage practice**, not the requirement to preserve earlier art, licenses, meaningful rejected trials or exact evidence. Existing local links remain valid until migration publishes and verifies their replacements. No fictitious hosted URLs count as completed migration.

## 2. Agreed product decisions

1. **S3 is the durable home for substantial asset files.** CloudFront delivers approved game files and authorized study pages. Git holds preparation code, small declarative catalogs, version pins, documentation and deliberately tiny bootstrap assets.
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
| Recovery                  | Independently protected copies of retained objects, manifests and their publication/pin records                                                  | Recoverable after an operator mistake or primary-account loss; actual restore checks, not just successful uploads                   |

Large JSON arrays containing geometry, pixels or animation are assets, not small metadata merely because they are text. Code-authored procedural generators and small authored definitions stay in Git; their substantial generated outputs follow this policy. Compiler code, shaders, scripts and WASM remain application build artifacts with normal code release controls, not arbitrary executable art served through an asset manifest.

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

Names, categories and tags support browsing. Renaming “Woodland wolf” or moving it between browsing categories must not break URLs, history or world references. Art revisions are independent of engine versions, world-definition versions, deployments and S3's recovery versions. Compatibility is explicit; a newer engine does not require copying every asset.

A reusable world's content package and one running instance of that world are separate. Hundreds of worlds using the same approved forest pack should reuse its files. An appearance created privately in one world has separate access and binding records even if identical bytes exist elsewhere.

## 5. Player and developer journeys

### A player enters the game

The server supplies the permitted, version-pinned asset references needed for the current view. Required starting-scene files load first; nearby optional content can follow under bounded work. Repeated trees share the same decoded model and materials. The game never waits for an S3 listing or source conversion in its simulation/render loop.

If an optional model cannot load, retain the prior compatible representation or use an approved lightweight fallback. Show a useful loading/unavailable state where appropriate. An art failure cannot delete the animal, change its dimensions mechanically, buy new generation or change what the character knows. Missing mandatory release dependencies prevent publication; unexpected delivery failure remains a diagnosed runtime failure.

### A developer starts a fresh checkout or worktree

The code revision identifies the exact supported release or development asset lock. One explicit asset-fetch operation downloads its required files into a shared local cache outside Git, verifies checksums and reports missing access clearly. Worktrees reuse identical cached bytes without sharing mutable Blender edits. CI fetches the named fixture/release subset, not the whole art archive.

Development can use cached files offline once its exact dependencies are present. A cache miss is reported; it does not silently choose “latest,” use production credentials or regenerate art. Fork/untrusted CI receives only a deliberately public small fixture pack and no private storage credentials. Full private qualification runs in a trusted context before promotion.

### An artist improves the wolf

Fetch its exact editable source and reference records; create a separate mutable workspace; export several variants through the existing tools; inspect them in the actual renderer. Publish a study iteration with all meaningful choices. Selecting a preferred variant records a review decision; runtime publication additionally checks its supported animation, format, rights and dependency requirements. Copy only the necessary qualified files into the target delivery boundary and record the relationship to the source/study.

### Mike revisits an earlier study

A dated URL opens the original comparison and recordings with the model revisions, camera/light settings and code revision used. Later work does not change those captures. A study landing page can identify the current selection, but a specific iteration link always retains its earlier evidence. An interactive historical viewer uses its recorded supported viewer build; when that viewer is unavailable or incompatible, retained screenshots/videos still show the actual historical result rather than presenting today's renderer as equivalent evidence.

### A release moves from development to production

Development/preview, staging and production choose explicit release records. Promotion verifies the exact qualified files and dependencies in the destination, then changes the deployment selection through its owning release process. Source and destination may contain intentional copies with the same checksum. A staging success does not grant production publication; a branch name or mutable “latest” file is never a saved asset identity.

## 6. Study organization and documentary references

Each study has an ID, human title, UTC creation timestamp with display timezone, scope, purpose, relevant art-direction revision and optional related worlds/assets. Each iteration records:

- Exact model/source/finish references, previous iteration and meaningful alternatives; assets can appear in many studies without duplication.
- Exporter and source code revision, tool versions, parameters, inputs and output checksums. Generated work also preserves permitted provider/model/receipt references, without publishing credentials or private prompts.
- Capture resolution, camera pose/projection/distance, lighting, renderer/pixel profile, animation clip/time/speed and relevant hardware when a performance claim is made.
- Preserved media, comparison layout, notes, Mike's feedback, selected/rejected/unreviewed status and measured limitations.

Study membership does not imply production approval. “Selected for this comparison” and “qualified for production use” remain different decisions. A selected choice points to an existing immutable revision rather than creating a copied “final-final” file.

New documentation links to a published study iteration or asset revision page; inline media links resolve to exact hosted objects in the appropriate access boundary. An authenticated artifact page provides durable access to private sources and issues fresh authorized downloads. Do not embed access tokens in Git. Reference-page URLs to third-party creators remain attribution; retained internal copies get their own durable URLs.

## 7. Failure, retention and recovery expectations

Interrupted publication cannot expose a manifest whose files are missing. Duplicate upload attempts converge on the same verified file within a permitted boundary. Two artists publishing alternatives cannot silently overwrite each other's revision or selection. Losing a local cache is recoverable by download; losing a source does not authorize paid regeneration.

Retained releases, current-format saves, active work and preserved studies protect their referenced files. Ending a preview deployment releases that preview's references but does not delete a source or study that also uses them. The storage collector must account for all these references and in-flight publication before deleting anything. Initially, retained library/study/runtime content has no automatic age-based deletion; temporary intake and local caches have separate bounded policies. See the [limits inventory](../limits/game-asset-storage.md).

Withdrawal must stop new access and remove active bindings/cached delivery where possible, while recording why an old study or release can no longer serve a file. Do not secretly replace it with different art. Files already delivered to a user cannot be recalled merely by revoking access, including private files. Recovery must apply current permissions and withdrawals rather than restoring access from an old backup.

## 8. Scope and implementation stages

This design covers curated and future generated assets, world/engine ownership, environments, delivery, local development, studies, references, retention and migration. It does not implement a marketplace, collaborative Blender editor, general digital-asset-management product, new gameplay semantics, automatic generation service or a new renderer. No Git LFS repository or per-world bucket is required.

Deliver the curated path first: store/source catalog and selective local fetch; hosted studies; a real game release and bounded consumer. Qualify preservation and restoration before removing tracked media during migration, then qualify production promotion. Future private/generated assets consume the same storage/reference boundary through existing V3D/INV authority rather than bypassing it. The [implementation tracker](../maintainers/game-asset-storage.md) owns exact stages and dependencies.

Migration preserves current files and reachable historical versions before removing tracked copies. History cleanup is a distinct later operation requiring an approved ref/worktree coordination plan. Preserving artwork versions is archival retention, not support for incompatible old application APIs or saves; the [development policy](../../AGENTS.md#development-save-policy) is unchanged.

## 9. Acceptance

The feature is complete only when a fresh checkout can fetch a bounded named set and run the selected game/study; the actual browser renders the pinned assets; required rights/dependencies survive restart; multiple worktrees reuse verified cache bytes; private scopes cannot access each other's artifacts; interrupted publication leaves the prior selection intact; retained studies and old source versions remain retrievable; migration rewrites documentation to verified URLs; and a restore into a clean destination reproduces a retained release/study under current permissions.

Measure initial/warm download bytes, build output, request counts, decode/upload stalls, cache reuse, peak/retained browser memory and publish/restore failures. Storage externalization alone does not prove faster rendering or reduced GPU memory. Numerical service/capacity promises require qualification; [A3D](../limits/3d-pixel-art.md) and [deployment limits](../limits/production-deployment.md) retain their owners.

## Maintained records

- Implementation and migration: [AS01–AS08](../maintainers/game-asset-storage.md).
- Limits and constraints: [Asset storage inventory](../limits/game-asset-storage.md).
- Architecture and directory/URL contract: [Technical design](game-asset-storage-tech-design.md).
- Consuming projects: [Production deployment](production-deployment-feature-spec.md), [3D asset pipeline](3d-pixel-art-asset-pipeline.md), [runtime invention art](../invention-art-pipeline.md).
