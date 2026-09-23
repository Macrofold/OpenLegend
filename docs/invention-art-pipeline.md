# Runtime invention art pipeline

**Status: accepted target design.** This document owns staged runtime asset production, the presentation contract, review/publication, and compatibility with mechanical revisions. It refines the accepted [visual direction](../archive/03-design-proposals/visual-direction.md#art-generated-during-play); that document retains artistic goals and immediate-state presentation intent. [Hybrid art methods](../archive/03-design-proposals/procedural-art-and-animation.md) owns procedural composition, rigs, pixel density, and rendering choices. [Invention foundation](invention-foundation.md) owns project coordination; [INV](maintainers/inventions-and-world-evolution.md) owns implementation and acceptance.

## 1. Purpose and non-negotiable behavior

An invention created during play needs a useful representation without blocking native action resolution, survival, crafting, harvesting, or the simulation clock. It can start with a truthful fallback, gain a rough identity-specific asset, and later receive refined art, directions, or animation. Not every invention needs every stage or any new art.

Art and mechanics have independent artifacts, reviews, and publication receipts, connected by explicit compatibility. An image cannot add anatomy, extend reach, alter collision, create resources, light a fire, or turn an attempted action into a committed outcome. Improving art cannot silently redesign the chosen invention.

A player intention is not a visual-state fact. A requested kill can miss; death/blood/fire presentation follows committed outcomes and supported state bindings. A decorative stain may be a harmless rendering detail, but active bleeding, emitted light, sound, or other observable consequences need their admitted contracts. The distinction between representation and observable semantics belongs in the candidate, not in an image prompt alone.

## 2. The shared presentation contract

Derive a bounded, versioned presentation requirement from the submitted candidate and its permitted semantic/physical facts. Keep it distinct from the implementation-specific asset manifest and from live instance state.

The contract identifies:

| Field group | Required meaning |
| --- | --- |
| Subject binding | Definition/version or compatible semantic contract, subject family, and optional specific-instance identity where unique appearance is intended. |
| Functional/observable constraints | Required silhouette/topology/scale classes, meaningful materials, admitted visible/audible properties, footprint/reach cues, and supported states. |
| Cosmetic freedom | Permitted surface detail, palette variation, ornamentation, and style choices that cannot change the constrained meaning. |
| Player/creator intent | Approved references and pinned features, with `refine rendering` distinct from `redesign appearance`. |
| Camera and density | Projection/directions, world-space footprint, bounded source resolution, pixel density, framing, and style revision. |
| Alignment | Pivots, anchors, attachment sockets, draw/layer order requirements, and compatible rig/part families. |
| Deliverables | Required icon/world/equipped forms, directions, poses, state variants, and optional enrichments. |
| Budgets and fallback | Limits on bytes, pixels, parts, frames, channels, texture memory, generation/validation work, and the minimum adequate representation. |
| Provenance and rights | Authorized reference/source identities, allowed storage/use/modification/export scope, and generation provenance. |

Reference typed facts rather than unbounded narrative context. A sling brief specifies the admitted swing mechanism, stone ammunition, cord/pouch materials, handheld scale, compatible state/attachment requirements, and the house style. It does not ask an image model to reinterpret an actor's entire conversation.

Visual state is separate from the asset request: an intact item can become broken, equipped, destroyed, or removed while artwork is being produced. The reusable asset may still be useful later; its completion does not authorize changing current state.

### 2.1 Adequacy versus polish

Define the minimum representation per supported family/state. A neutral icon can represent an inventory-only tool. A trap needs readable presence/footprint and required safety cues. A building opening must agree with traversal/occlusion. A creature needs enough pose/state information to avoid showing a living animal where only remains exist.

If the family can provide no adequate fallback, the affected capability/instance is not ready for ordinary use even when some mechanical definition is approved. Retain a draft or non-executable preview rather than lie visually. Do not make final polish a mechanical acceptance requirement when a faithful fallback is available.

Required performance/readability cues are part of usability. The renderer cannot recover missing structural meaning by guessing collision from a generated silhouette. Geometry that affects gameplay must be separately proposed and mechanically admitted.

## 3. Stages and selection order

The stages are capabilities, not mandatory sequential purchases. Exact authorized reuse or trusted composition can be the final result. A provider that can generate adequate final art promptly may skip a separate rough pass. Native presentation remains available through provider failure or zero budget.

### Stage A — immediate native representation

Select an exact authorized asset, a compatible reusable family/rig, or a bounded trusted procedural composition and state effect. Preserve meaningful material and geometry cues. Use a neutral symbol only when it meets the family's adequacy contract.

This stage uses ordinary code and a separate visual seed; it must not consume simulation RNG. It should not make a model call on every interaction, death, menu opening, or frame. Do not promise a fixed millisecond latency without measurement; it belongs on the fast presentation path with explicit work bounds.

Known state changes use existing poses, overlays, particles, or material changes justified by the visual-state contract. A dead animal can show a supported death pose immediately. A detailed bleeding or combustion depiction is not evidence that an unimplemented physical system exists.

### Stage B — optional fast rough generation

When the visual vocabulary is insufficient or a distinct identity is worthwhile, generate a small usable concept/icon/sprite within a specifically admitted allowance. Optimize for readable silhouette, faithful meaning, stable identity, and house style rather than final beauty.

Generate from the bounded brief and authorized reference assets. Keep output count, dimensions, model work, and directions finite. One rough sprite does not establish a complete animation set. Rough generation is still asynchronous paid work; `real time` means during play with an immediate fallback, not guaranteed completion within a render frame.

A candidate still under mechanical review may obtain a speculative rough concept only under the project's explicit speculation policy and budget. That concept remains draft-only. Confirmed conjuring still prohibits paid art before the required confirmation.

### Stage C — optional refinement and additional deliverables

After accepted mechanics and a sufficiently stable design, refine the chosen appearance and produce only the requested useful deliverables: cleaned icon, world/equipped variants, directions, state variants, rig parts, or animations.

A refinement preserves selected identity and pinned features. It does not randomly replace an approved silhouette because a new generation looks prettier. Requesting alternative designs is a distinct operation; preserve liked candidates and lineage so a player can choose rather than lose earlier work.

Prioritize refinement using explicit request, visibility/use, reuse potential, world importance, and available funding. Ranking is a scheduling policy, not a mandatory LLM call. Avoid refining rejected, cancelled, superseded, unobserved, or trivially represented content by default.

### Stage D — review and promotion

Technical validity and semantic faithfulness are required before any live publication. `Provisional` describes art maturity, not permission to publish malformed or misleading output.

Auto-publication may apply to low-impact assets under a configured policy. Important identity changes, complex animated families, shared-library releases, or creator-selected content can require owner/author review. The same screen may review mechanics and art, but keep the underlying decisions separate.

Gameplay can continue with adequate approved fallback/provisional art while higher-quality review is pending. Rejection of refined art leaves the prior adequate representation in use. A curated pack can require reviewed final art even when local play allows provisional art; release policy does not retroactively invalidate the working mechanic.

Approved promotion publishes an immutable manifest/artifact revision. `Canonical art` means the approved preferred binding for a declared scope, not an unversioned global file that silently changes every world.

## 4. Different assets need different production paths

Use a hybrid strategy rather than pure raster generation for every object.

| Asset class | Useful first path | Main constraint |
| --- | --- | --- |
| Simple invented tools and resource variants | Shared family silhouette/parts, palette, icon/world sprite, then optional distinct art. | Correct material/functional cues and attachment scale. |
| Clothing and equipment | Compatible rig parts/sockets, supported layers and directional variants. | A standalone image is insufficient for held/worn alignment. |
| Characters and creatures | Reusable anatomy-compatible visual families, authored/generated parts, supported poses. | Visual limbs cannot grant physical limbs; identity across directions/states must persist. |
| Buildings and constructed assemblies | Validated modular layout, shared materials and state overlays. | Traversal, footprint, support, openings, and occlusion follow authoritative structure. |
| Effects and transformations | Existing effect/overlay families driven by committed state. | Finite variants; presentation cannot invent gameplay sources or ongoing effects. |
| Invisible policies or abstract mechanics | Existing symbolic/action/log presentation where appropriate. | Do not invent a physical object or buy art merely because a rule was admitted. |

Offline tools can create the reusable vocabulary. Runtime invention composes that vocabulary and requests missing art when justified. A future 3D source/bake workflow can supply consistent pixel-art views, but neither it nor a new image API requires changing the current PlayCanvas renderer or simulation.

## 5. Art and mechanic compatibility

Bind an asset to a presentation contract and its approved semantic dependencies, not only an invention display name. Mechanical and visual version numbers are independent.

An illustrative relationship is `mechanical definition v3 -> presentation contract C7 -> visual manifest A12`. Better shading can produce A13 without mechanical v4. A mechanical cost change may keep C7 if its required depiction is unchanged. Changing the material, geometry, supported state, or attachment requirements may require C8 and invalidate affected art.

The compiler and art validator determine the actual changed requirements. A model/client cannot label a functional redesign as cosmetic to bypass mechanical review. A visually discovered structural change becomes a revised mechanical candidate if the player accepts it; it never modifies an active definition implicitly.

Keep function, observable semantics, and rendering separate. Cosmetic color can be free variation only where the world does not give that color a mechanically relevant meaning. A recognizable insignia, camouflage behavior, light emission, or altered apparent size may need semantic review under the relevant sense/effect contract. Do not derive actor knowledge from arbitrary image pixels or unreviewed captions.

## 6. Validation before publication

Validate cheap technical conditions before paying for deeper review. Decode in a bounded trusted path. Reject unsupported executable formats, oversized/decompression-heavy content, unsafe external references, invalid dimensions, or missing required outputs.

Checks cover format, byte/pixel/frame/part limits, transparency where required, palette/style constraints, registration, pivots, scale, directions, animation coherence, attachment alignment, readable silhouettes, identity preservation, and agreement with required observable/physical cues. Some are deterministic; visual-semantic review may require an appropriate vision-capable model or a human. A text classifier receiving the brief has not inspected the resulting pixels.

Reference fetching uses authorized artifact sources, not arbitrary model-supplied URLs or paths. Rendering generated SVG/scripts or loading arbitrary code is not an accepted shortcut. Trusted conversion may produce safe retained raster/mesh artifacts under finite limits.

Preserve the source brief, generator/model identity, authorized reference identities, validation results, and immutable output digest. A successful generation request is not an approved asset. A large attractive still does not prove game-scale readability, correct animation, acceptable texture memory, or fidelity across poses.

If the asset implies an unsupported capability, reject it or revise the design with acceptance. Do not repair mechanics merely to justify the model's picture. If one representation cannot depict a valid mechanic, try a supported alternative or keep the fallback before changing intended function.

## 7. Durable work, storage, and publication

Reuse the existing application-owned job/persistence boundaries. A visual requirement can durably make an asset job eligible at the relevant commit; dispatch happens later, outside the mutation transaction. Restart inspects job/attempt records without regenerating already completed work or replaying uncertain paid attempts.

Store durable bytes in a local-file adapter or object storage, with database metadata for identity, digest, rights, versions, validation, and compatibility. Provider download URLs and worker workspaces are temporary delivery mechanisms, not the only durable copy.

Prepare and validate new artifact bytes before atomically publishing the manifest/binding pointer. A crash can leave an unreferenced staged artifact for bounded cleanup; it must not leave a live pointer to partial bytes or destroy the old working binding. Promotion uses expected binding/revision checks so late work cannot overwrite a newer chosen design.

The client receives a permitted manifest update and fetches assets asynchronously. Reuse hashes and versioned cache identities, but respect scope and rights. Updating a rendering binding cannot create a world instance, teach a recipe, change health, or emit a fictional discovery event.

An asset can be retained as an authorized reusable artifact even if the original instance no longer exists. Applying it to a current instance requires matching current identity, definition/presentation/style contract, and visual state. A corpse sprite arriving after harvesting cannot restore the corpse or overwrite a living state.

## 8. Cancellation, supersession, and shared generation

Cancelling/rejecting a mechanical candidate prevents new dependent art spending and publication for that candidate. Abort outstanding work where possible, but fence publication even when cancellation fails. Keep incurred/uncertain cost in the episode ledger.

An art failure leaves accepted mechanics and adequate prior presentation intact. A failed new mechanical revision leaves the old active definition/appearance intact. A current runtime quarantine uses the mechanical recovery policy; it is not ordinary aesthetic rejection.

Coalesce only compatible requests with authorized references, output/state requirements, style, camera/density, and rights/funding scopes. If one consumer cancels, remove its publication authority; do not discard useful work for other authorized consumers. Technical deduplication is distinct from who funds and may use the result.

Generation and validation failures do not authorize an endless paid retry loop. A bounded explicitly admitted refinement attempt may repair an output; uncertainty after dispatch stays conservatively accounted until reconciled. Each new paid attempt has a distinct identity and existing episode lineage.

## 9. Cost, caching, and runtime efficiency

Use the [budget contract](invention-budgets.md). Art has a visible allocation beneath the relevant overall allowance. Include image-provider charges, optional planning/classification, validation compute, storage, and serving where attributable, without summing the same cost twice.

Do not issue one image job per instance, state tick, death, wound intensity, or zoom level. Prefer finite state mappings, procedural overlays, shared family assets, dirty-layer updates, and exact/compatible reuse. A distinctive appearance can use an explicit instance-specific key; not every instance is inherently distinctive.

Generation cache keys include relevant definition/presentation and style versions, reference asset identities, supported state, camera/direction, density, generator/rig version, visual seed, output requirements, and authorized reuse scope. Similarity may find candidates but does not prove fit or grant rights.

Share compatible textures/atlases and cache static rasterization. A procedural image is not inherently cheaper to display than a PNG once both are textures. Evaluate rigs versus baked frames under actual crowd/animation load, preserve alignment and pixel stability, and keep texture/variant expansion bounded.

Use a separate visual RNG. Preserve approved raster bytes when exact repeatability or pack portability matters; a procedural recipe alone does not promise identical pixels across renderer/browser revisions. Rebuilding a local derived cache does not require a paid model call.

Faithful depiction, state variants, and improved art do not consume a second player invention unit. A new behavior follows the separate entitlement policy. Origin invention locks do not block faithful visualization of existing mechanics, while author refinement locks, art rights, and funding still govern replacement/generation.

## 10. Retention, saves, and packs

Retained worlds and saves pin the necessary definition and presentation dependencies. Approved artifacts cannot disappear merely because a model run, temporary URL, or workspace expires. Missing content on load must follow the save compatibility/fallback policy; do not silently buy regeneration.

A saved preferred binding can be restored only where compatible with current external rights/privacy and safety restrictions. Old-generation jobs cannot publish into the restored timeline. Historical art candidates may remain in authorized project history but are not automatically current.

Pack export includes the permitted exact manifests/bytes or supported procedural descriptions plus their required dependencies. Exclude private prompts, raw source conversations, unrelated NPC memories, and ungranted reference art. Report blocked dependencies and partial payloads honestly. Buying or receiving a pack does not confer world-edit or source-asset redistribution rights.

Deleting an unused draft can reclaim unreferenced assets after the relevant retention interval. Do not collect bytes still pinned by another authorized consumer, retained save, or released pack. Privacy/rights restrictions can override ordinary retention through their designated policies.

## 11. Provider and orchestrator boundaries

Use replaceable image/asset execution adapters returning artifacts and actual receipts. OpenLegend chooses the needed visual, permitted inputs, resource limits, validation/review policy, publication, and payer. Macrofold or another execution backend may coordinate a bounded job but cannot decide the world state or activate a mechanic.

An image-generation API, procedural generator, authored source, rigging tool, or future 3D bake path can all produce candidates for the same presentation contract. Qualify their output on the actual in-game scale, materials, states, directions, animation, and equipment alignment. A provider's advertised generation time is not OpenLegend's end-to-end usable-asset latency.

Start with one asset class, one adapter, one durable manifest, and a readable fallback. Add stage-specific providers only when measurements justify extra complexity. No per-entity permanent sandbox, provider call in the render loop, or mandatory new workflow platform is required.
