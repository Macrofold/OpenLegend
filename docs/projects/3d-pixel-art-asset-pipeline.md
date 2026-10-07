# Progressive 3D pixel art — generation and publication pipeline

| Status      | Current progress                                                                                                            | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | The runtime generation and publication pipeline remains proposed; importing the fixed mercenary asset did not implement it. | 2026-10-07   |

**Status: proposed, no provider integration or live generation performed.** This document specifies art production during play, including optional 2D-first/3D-later delivery. It proposes an implementation of the direction in the [feature specification](3d-pixel-art-feature-spec.md) through the [technical contracts](3d-pixel-art-tech-design.md); it does not authorize mechanical invention, spending, or arbitrary generated code by itself.

## Maintained records

- Implementation: [V3D07–V3D10](../maintainers/3d-pixel-art.md).
- Capacity and staged-work limits: [A3D inventory](../limits/3d-pixel-art.md). Shared [AI execution](../limits/ai-execution.md), [invention](../limits/inventions.md), and [persistence](../limits/persistence.md) limits remain controlling.
- Existing policy: [runtime art and publication](../invention-art-pipeline.md), [shared episode funding](../invention-budgets.md), [INV workflow](../maintainers/inventions-and-world-evolution.md), and [AI/provider boundary](../ai-providers.md). The [original visual direction](../../archive/03-design-proposals/visual-direction.md#art-generated-during-play) retains artistic intent, not a competing publication or spending contract.
- Visual coverage: [appearance families](3d-pixel-art-appearance-families.md). Evidence: [qualification](3d-pixel-art-validation.md).

## 1. The pipeline is demand-driven, not a simulation loop

Mechanical admission, actual object creation, and art publication are independent outcomes. An admitted tool can be crafted using a known visual fallback. A failed image stage does not undo the recipe. A successful image does not install a recipe. A generated model does not create an item, open a doorway, or grant a creature locomotion.

Create appearance demand from an admitted definition, a supported state lacking a suitable visual, a permitted explicit appearance edit, or confirmed conjuring. Do not create demand from every render, camera angle, network reconnect, low LOD choice, animation frame, health decrement, or ordinary repeated death. Coalesce compatible missing-asset requests before allocating paid work.

Use this selection order: exact authorized approved representation; compatible library part/material/rig composition; existing family fallback; and only then a bounded authoring plan for useful missing appearance. A new color or combination can be novel without needing a new image. A missing family solver cannot be manufactured by an LLM returning a new JSON field.

Exact-ID and scoped compatibility lookup precede optional semantic ranking. Similarity or a vision score proposes a candidate; family validators establish fit. Incomplete/unavailable lookup is not a proven miss. Defer optional generation or request explicit continuation under the existing workflow rather than silently paying because a search failed.

## 2. One appearance brief, several possible outputs

Create or select an immutable AppearanceDefinition before production. Its brief records the object's identity, family, dimensions and critical anchors, meaningful silhouette features, material regions, distinctive marks, supported states/actions, intended component boundaries, style revision, permitted references, and mechanical constraints. Keep assumptions and unresolved views explicit.

The following artifacts have different purposes:

| Artifact                                | Purpose                                                                              | Authority and reuse                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Runtime fallback                        | Immediate readable depiction of current supported state                              | Existing approved family; never waits on generation                                  |
| Construction/reference image            | Communicate form, separated parts, neutral pose/materials and identity to production | Authoring input, not automatically public or runtime-ready                           |
| Runtime sprite or directional set       | A usable pixel-art representation at known scale, pivots and view coverage           | Can publish independently after its own validation                                   |
| Source model candidate                  | Generated or authored geometry/textures before runtime normalization                 | Quarantined; not downloaded directly by players                                      |
| Sanitized runtime model                 | Bounded geometry/materials and, when supported, a validated rig/animation set        | Immutable approved manifest, exact dependencies and compatible fallback              |
| Derived icon, portrait, LOD or imposter | Optional alternate presentation of the same identity                                 | Generated or compiled only when useful and authorized; not mandatory for each object |

A tiny sprite is not a full blueprint of hidden geometry. It may exaggerate edges, omit backside features, or bake a light direction. Prefer separate higher-resolution, neutral-light construction views when the generation route needs them, while preserving the artistic identity of the actual sprite. Multiple generated views must be checked for agreement; more images do not guarantee consistency.

Use the appearance brief to constrain both outputs. A change in the accepted sprite's distinctive features must be reconciled into that brief before requesting a model, not left as two conflicting sources of identity. Preserve the prior published appearance until an intentional new revision is approved.

## 3. Supported production routes

### Reuse or native composition

Select approved components, vary supported material/proportion parameters, and compile a representation locally or in bounded trusted server work. No generative call is needed. Persist the visual assembly recipe and exact asset dependencies; this is not a second writable copy of a mechanical invention recipe. Retain approved bytes where exact reproduction matters. Known procedural rebuilding is separate from paid generation.

### 2D first, 3D later

Derive a bounded image request from the shared brief and permitted references. Validate and publish a useful sprite without waiting for a mesh. Independently continue the already authorized model stage from the same brief, accepted reference artifacts, and required geometry/part constraints. Normalize, validate, and publish the model only when it is compatible with the intended states.

The model stage may need multi-view references, remeshing, material cleanup, part separation, rigging, or animations. Each is either an explicitly planned bounded stage or a new authorization decision. A single successful image-to-model response does not prove any of those additional requirements were met. Failure retains the sprite, the diagnostic, and the consumed/uncertain cost without automatic regeneration.

### Direct model production

Use a trusted procedural family, an authored GLB, or a permitted model-generation stage directly when a sprite is unnecessary. Rendering a sprite/icon from an approved model can later supply a lighter representation. The first production milestone is a rigid object; a supported humanoid pipeline follows only after rig/animation validation exists.

### Novel rig or functional assembly

Prefer generation of compatible parts around an existing reviewed rig or mechanical assembly. A monolithic model cannot be assumed to contain usable joints, interiors, detachable tools, or construction components. If decomposition or a new visual solver is missing, preserve an honest fallback and report the gap. Mechanical family expansion still goes through INV/EWF/SW, not the art worker.

## 4. Durable records and state transitions

Use the existing application repository/execution conventions. The names below are proposed records, not a second generic orchestration platform.

`ArtDemand` records a world/account scope, appearance revision, required coverage, permitted reference set, initiating authority, relevant policy/revocation generation, subscribers, and priority reason. Many entities may subscribe to one compatible demand. Private reference scope is part of compatibility, not an after-the-fact metadata check.

`ArtJob` records the exact plan, stage dependencies, root funding authorization, current durable outcome, and candidate lineage. `ArtStage` records its inputs/digests, selected adapter/model/configuration, bounded output/compute expectations, reservation, and state. `ArtAttempt` records one actual external dispatch intent, provider request/task IDs when known, receipts, cancellation, and uncertainty. An explicit retry creates a new attempt; it never erases the original.

Stage states are distinct: waiting for prerequisites; eligible; reserved; dispatching; running; collecting; validating; awaiting review; published; or a terminal reused, rejected, failed, cancelled, stale, unsupported, or unresolved-dispatch outcome. A funding/capacity block is inspectable and resumable without pretending the provider started. Store enough state that restart can read or reconcile the existing attempt rather than rerun it.

Before a paid POST, durably reserve its conservative upper bound and record dispatch intent. Persist a returned provider task ID before relying on its result. If the response is lost, do not assume the request failed. Reconcile the original request through a provider-supported exact identity mechanism when possible. If that mechanism is unavailable, retain an unresolved attempt and reserve; do not guess a match from a similar prompt or resubmit automatically.

Task status updates may arrive repeatedly or out of order. Apply monotonic guarded transitions and exact stage/attempt identity. Authenticate provider notifications according to the supported adapter, or confirm them through trusted status reads; a webhook body is not proof of an approved artifact or authority. Polling uses bounded shared scheduling, not one in-memory endless loop per entity.

No simulation mutation lock, database transaction, or paid harness Run stays open while a provider or human reviewer works. Publish short durable transitions and yield. A restart resumes observation of accepted work, not generation.

## 5. Scheduling and funding

Prioritize demanded, visible, reusable, or explicitly requested improvements over speculative completion of the whole library. Scheduling metadata must not leak hidden objects to other users. Fairness operates across authorized roots/accounts so one prolific author cannot occupy every slot. Bound active work, queued demand, request bytes, queue age, collection work, and retained artifacts separately under [A3D](../limits/3d-pixel-art.md).

Do not fund every optional stage merely because the root has an allowance. Each stage checks current authority, references, policy/revocation history, remaining reservation capacity, and whether the artifact is still needed. Plan dependencies can proceed under the original explicit allowance when their conditions and maximum cost were included. A failed stage cannot trigger an unplanned paid repair, extra view, alternate model, or provider fallback.

Track image/model generation, any language/vision planning or review, rigging/animation, conversion compute, artifact storage/transfer, and shared compute separately where applicable. Count settled costs plus outstanding/uncertain commitments once against the root and applicable shared ceilings. Do not add the same provider charge again as workflow cost. A missing price or credible upper bound blocks automatic dispatch.

The existing Macrofold Worker is selected and funded by its owner. OpenLegend must not create, replace, resume, or destroy shared compute merely because an asset is pending. Per-Run limits are not a cap on shared Worker idle/allocation expense; follow [the current Worker contract](../ai-providers.md#shared-worker-setup-and-cutover). An art integration needs an explicit compatible execution adapter; current language inference routes are not proof of image/mesh support.

Cancellation stops future paid stages immediately and requests cancellation of known accepted work where supported. It does not promise a refund or the disappearance of an in-progress result. If a subscriber disappears, remaining permitted subscribers may still justify the artifact. If none remain, follow the plan's cancellation/retention policy without spawning replacement work. Deleting an entity never causes a completed asset to recreate it.

## 6. Quarantine, conversion, and validation

### Safe intake

Collect provider outputs through a trusted server adapter into bounded quarantine. Enforce MIME/signature agreement, transport and decoded limits, redirects/host policy, archive/path traversal protection where an archive is deliberately supported, and no private/internal-address fetches. Prefer direct required artifacts over downloading every vendor output format. Never give the browser a provider credential, source URL with privileged access, or arbitrary user-supplied remote asset location.

The initial runtime interchange is a deliberately narrow glTF/GLB 2.0 profile plus standard validated raster images. Import only approved primitive/material/skin/animation features and a pinned extension allowlist. Unknown required extensions fail; optional metadata is not executable behavior. External buffer/texture references must be resolved, checked and repackaged into permitted immutable dependencies before publication. Do not auto-install embedded cameras, lights, scripts, physics metadata, custom shaders, or arbitrary animation callbacks.

### Technical conversion

Normalize units, axes, root/pivots, transform handedness, winding, finite positions/normals, bounds, hierarchy, skin data, and texture color spaces. Verify accessors/index ranges, decompressed geometry, image pixel area, node/material counts, animation samples/channels, joint weights and dependency closure before resource allocation grows beyond the selected profile.

A bounded trusted processor may simplify geometry, generate LODs, resize/atlas textures, remove unsupported metadata, normalize material parameters, or bake reviewed derivatives. Record input/output digests and processor versions. Conversion that changes silhouette, critical openings, part boundaries, skinning or identity must be revalidated. A target polygon parameter sent to a provider is not enforcement of the returned complexity.

Do not execute a generated script to repair a generated asset. New processing capabilities are reviewed host code. Self-hosted generation is still compute with a resource/funding owner; it is not automatically free or authorized.

### Semantic and artistic validation

Validate in layers: structural safety; geometry/anchor fit; appearance identity; material/style/readability; required state/animation/attachment coverage; and actual target-client rendering. Structural success cannot compensate for a misleading door or a missing corpse state. A model confidence score cannot grant publication or mechanical compatibility.

Render controlled turntables and the target gameplay-scale previews in neutral, daylight, and local firelight profiles. Check that distinctive features and dimensions remain consistent with the accepted brief/sprite, textures are not fighting new light directions, and thin tools/limbs remain readable. For rigs, evaluate representative poses, clipping, joint extremes, item grips, feet and supported death/rest states. For assemblies, inspect intended separations and functional openings.

Initially require creator review of the new production families and genuinely novel silhouettes/rigs. Exact approved reuse and deterministic variants within an already reviewed envelope need no repeated manual approval. A later opt-in automatic-publication policy can cover qualified low-risk families after its false-accept/rejection evidence exists. Keep it distinct from mechanical admission and art-budget authorization; do not introduce a mandatory confirmation on every ordinary valid invention. Awaiting optional polish does not block continued play with an already adequate representation. A new family without a permitted adequate fallback cannot become usable merely because its mechanics passed validation; hold the affected capability until [presentation adequacy](../invention-art-pipeline.md#21-adequacy-versus-polish) is satisfied, while unrelated native play continues.

## 7. Atomic publication and current-state binding

Persist validated bytes first, verify their digests and dependency availability, then atomically publish the immutable manifest and revision record through the appearance owner. A database publication must not reference a partially uploaded artifact. If publication notification is lost, the committed record is still discoverable through existing refresh/read paths; no distributed broker is required.

Recheck candidate digest, expected appearance/style/family revision, publication grant, reference rights, and relevant revocation history. Unrelated simulation ticks do not invalidate an appearance candidate. A material mechanical change, withdrawn grant, or replaced appearance brief does. Retaining a late candidate for permitted reuse is separate from binding it to any current entity.

Client subscribers follow the [safe handoff protocol](3d-pixel-art-tech-design.md#5-renderer-integration-and-resource-lifecycle). They prepare asynchronously, recheck current entity/state/authorization, and replace only the visual representation. Different clients may temporarily show different approved quality levels; they must agree on gameplay identity and outcomes. A failed client decode cannot roll back a valid server publication or remove the object.

Support explicit visual rollback to a retained approved version through a new guarded publication. Do not mutate already published bytes in place or use a mutable `latest.glb` as saved identity. A model can be approved for one state/view/family but ineligible for another.

## 8. Storage, reuse, privacy, and portable packs

Store immutable runtime artifacts, required source evidence, manifests, digests, validation reports, provenance, rights, and dependency pins in the existing database/artifact-store boundary. Provider-hosted URLs and execution workspaces are transit, not durable world storage. Retain exact source references or a reproducible authorized recipe where permitted; record when license or retention restrictions prevent keeping a source.

Use content-addressed bytes for integrity and deduplication where useful, but enforce scope on every logical reference and retrieval. Identical hashes do not authorize private reuse. Do not merge private/public manifests in a way that exposes hidden creator prompts, unpublished inventions, concealed parts, or another character's private evidence. Technical logs contain IDs/digests and bounded diagnostics, not raw private reference bytes.

World saves pin appearance identities and approved dependencies; operational billing and dispatch journals remain outside fictional rewind. Restoring a world clears obsolete subscribers and client callbacks, not real obligations. Current-format validation follows the save owner; no legacy migration is added. Missing derived local caches can be rebuilt without paid work; missing source/provider bytes do not authorize automatic regeneration.

Reference pins cover active publications, retained current-format saves, authorized exported packs, and in-progress candidates that still need their inputs. Garbage collection checks all pin owners and in-flight publication under a safe generation/grace protocol. It must not delete an artifact between validation and publication. Exhausted storage blocks new optional production, not existing pinned gameplay.

Pack export includes permitted runtime bytes, exact manifests/compatible family dependencies, style requirements, attribution and derivation/license metadata. It excludes private prompts, conversations, memories, unrelated source art, credentials, and live job tokens. Imports validate the same runtime profile and destination permissions. An asset pack without a supported mechanical family remains visual content, not a runnable new mechanic.

## 9. Failure contract

| Failure                                                                | Required result                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| No generation permission, budget, provider, or queue capacity          | Existing visuals continue; explain the specific art limitation without marking mechanics failed     |
| Duplicate demand or reconnect                                          | Subscribe/read the same durable work; no duplicate paid dispatch                                    |
| Lost admission response or ambiguous cancellation                      | Preserve unresolved attempt and reserve; reconcile the original work or require explicit recovery   |
| Image succeeds, model fails                                            | Keep the approved sprite; retain failed-stage evidence and actual cost                              |
| Technically valid but wrong identity, pose coverage, or mechanical fit | Quarantine/reject candidate; no automatic paid repair and no silent physical change                 |
| Entity harvested, dropped, transformed, or removed before result       | Bind only if current identity/state is eligible; never replay old gameplay or resurrect anything    |
| Grant revoked or world restored while a job runs                       | Reject obsolete binding/publication scope; preserve actual external obligations                     |
| Object storage write/validation/publication conflict                   | Keep current approved asset; no partial manifest publication or overwrite of newer work             |
| GPU decode, device/context loss, or memory budget exhaustion           | Reuse compatible local fallback, clean partial resources, expose diagnostics; no paid generation    |
| Provider result expires before collection                              | Report missing external artifact; do not claim the save contains it or silently buy another attempt |

## 10. Provider selection and evidence

No provider is selected by this proposal. Start with authored/procedural fixtures and one replaceable production adapter; do not build integrations for many vendors before measuring the first real family. Select a provider using repeatable identity/style output, rigid geometry and part quality, controllable dimensions, compatible export, rig coverage, API task/reconciliation semantics, rights/privacy terms, retention, and total useful-asset cost including correction/rejection.

Official documentation checked September 27, 2026 establishes possibilities, not OpenLegend performance:

- [Meshy Image to 3D](https://docs.meshy.ai/en/api/image-to-3d) exposes asynchronous tasks and model outputs including GLB. Its requested polygon count can differ from the result. Therefore local result validation is required; no latency or quality guarantee is inferred.
- [Meshy Multi-Image to 3D](https://docs.meshy.ai/en/api/multi-image-to-3d) accepts multiple views of the same object. This supports evaluating a shared-reference route, not assuming independently generated views agree.
- [Meshy Rigging](https://docs.meshy.ai/en/api/rigging) explicitly focuses on standard humanoid assets with clear limbs and lists non-humanoid assets as unsuitable. Do not present this as arbitrary animal, six-limbed creature, garment-fit, or assembly automation.
- [Meshy Asset Retention](https://docs.meshy.ai/en/api/asset-retention) and task expiry metadata make provider storage a separate operational concern. Collect and retain permitted approved outputs in OpenLegend's durable store.
- [Khronos glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) is the chosen interchange baseline; OpenLegend still needs its narrower importer and semantic checks.

Pin selected model/configuration/adapter versions and record the actual reported revision, rather than silently relying on a changing `latest` alias. Verify current limits, pricing, terms, and account capabilities before real dispatch. A hosted API's existence is not evidence that its price or output is appropriate for this game.

## 11. First live proof

The [completed mercenary pilot](completed/mercenary-scene-pilot.md) processes one trusted authored asset and demonstrates its client resource lifecycle. It is not evidence that the quarantined intake, scoped artifact store, generated-family validation, funded stage accounting or durable publication proposed here exists. Reuse the matching renderer work while keeping those V3D07–V3D10 requirements open.

After the native artifact/publication pipeline works, use one explicitly bounded approved trial: a supported rigid invention with a distinctive appearance and known physical constraints. Produce an approved 2D representation, then a matching model, display the transition in the real client, reload, and reuse it on a compatible second instance without generation. Include a rejected candidate or failed stage and a removed initiating object.

Report useful-asset success rate, identity defects, total provider/compute cost including unsuccessful work, planning and validation overhead, time to fallback/sprite/model, human correction time, artifact size, import cost, and remaining state coverage. Separate fixture correctness from live provider quality. Broader generated characters, animals, and constructions remain independently gated.
