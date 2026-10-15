# Progressive 3D pixel art — limits and constraints

[Feature](../projects/3d-pixel-art-feature-spec.md) · [Technical design](../projects/3d-pixel-art-tech-design.md) · [Implementation](../maintainers/3d-pixel-art.md) · [Inventory rules](README.md)

**A3D01–A3D14 are Proposed, not current runtime behavior or measured capacity. A3D15 preserves the sampled-model study, A3D16/A3D17 preserve the rejected block trials, and A3D18 records restoration of the original animated model with its own scoped browser evidence.** These are conservative starting envelopes for the first controlled asset pipeline. They must be implemented, instrumented, and qualified before enabling production generation. Restrictiveness describes the proposed envelope, not confidence, correctness, security, or image quality. Values are operator/family/device profile data where appropriate, not scattered literals or new universal world laws.

Existing owners retain [VP01 lighting/reveal](interface.md#vp01), [AI execution and money](ai-execution.md), [invention authority](inventions.md), [physical geometry](spatial.md), [object state](objects.md), and [persistence/retention](persistence.md). This document does not change those values. Exact provider restrictions are additional constraints checked at dispatch, not substitutes for local enforcement.

## A3D01 — Manifest and dependency envelope

**Proposed · Restrictiveness: Safe.** One serialized runtime manifest: at most **64 KiB**, **128 direct dependency references**, and a dependency closure checked against the bundle limits below. One imported hierarchy: at most **256 nodes** and **16 levels**. Dependency cycles are rejected, not truncated.

**Why / boundary:** Bound parsing, traversal and dependency fan-out before allocating resources. A larger legitimate assembly needs a reviewed chunk/family design and an aggregate budget, not recursive evasion of per-file checks. Oversized candidates remain unpublished. Owner: V3D02; measure manifest/dependency workload before expansion.

## A3D02 — Encoded intake and runtime payload

**Proposed · Restrictiveness: Safe.** Quarantined source intake: **64 MiB per artifact**. Published runtime representation and its required first-use dependency payload: **16 MiB aggregate**. Enforce streaming byte counts, not only a declared Content-Length. All retained source, runtime, derivative and staging bytes count against A3D10.

**Why / boundary:** Keep downloaded provider files and browser transfers finite. A smaller GLB can still decode into excessive data, so A3D03–A3D06 apply independently. Oversized art can be deliberately processed into an eligible candidate within the funded plan; it is never loaded directly into the browser. Owner: V3D02/V3D08.

## A3D03 — Decoded and conversion work

**Proposed · Restrictiveness: Safe.** A trusted conversion worker receives at most **512 MiB working memory** and **60 seconds per native conversion stage**, with **2 active conversion workers per server process** initially. Decoded runtime resources for one representation and dependencies: **64 MiB**, including geometry, animation and texture/mip estimates. Aggregate assembly and client budgets still apply.

**Why / boundary:** Bound expansion attacks and expensive processing separately from network size. Process-level termination and explicit output accounting are required; a JavaScript timer around a blocking decoder is not a hard memory/time sandbox. Exhaustion rejects/defers optional art, preserves the previous representation, and never triggers paid repair. Owner: V3D02/V3D07; qualify realistic conversion stages before revising.

## A3D04 — Mesh complexity

**Proposed · Restrictiveness: Medium.** Initial ordinary visible LOD: **20,000 triangles per rigid representation**, **40,000 per skinned body**, and **100,000 active triangles per assembled render root**. The full imported representation bundle, including stored LODs and attached imported geometry within that bundle, is capped at **100,000 triangles** before client publication. Shared bytes may be reused, but active instances still have rendering cost.

**Why / boundary:** A concrete first profile, not a claim these counts are optimal or that more triangles improve pixel art. Buildings may use separately budgeted modules/chunks; scene-wide measurements and client residency prevent unlimited aggregation. Validate actual post-decode triangle counts rather than trusting provider target parameters. Owner: V3D04/V3D05/V3D11.

## A3D05 — Textures and materials

**Proposed · Restrictiveness: Safe.** Runtime texture edge: **2,048 pixels maximum**; total base-level texture area: **8,388,608 pixels per representation bundle** across all channels/maps. At most **8 distinct material slots per render root** in the first profile. Mips, decoded format, geometry and animation also consume A3D03/A3D11 budgets.

**Why / boundary:** Control texture residency and material/draw fragmentation, not just PNG size. Pixel density and palette choice still need art review. Shared atlases must not disclose private variants. Unsupported high-detail imports remain source candidates or require an approved smaller derivative. Owner: V3D02/V3D04; review minification and source-to-gameplay quality before increasing limits.

## A3D06 — Articulation and visual composition

**Proposed · Restrictiveness: Safe.** Initial rig profile: **64 joints**, **4 influences per vertex**, **32 animation clips**, and **1,000,000 scalar keyframe values across the imported bundle**. Runtime evaluation: **4 pose layers**, **4 bounded IK chains**, and **32 separately managed cosmetic/attachment parts per character render root**. Clips and parts remain subject to all aggregate byte/node limits.

**Why / boundary:** Prevent a small-looking actor from carrying unbounded pose or composition work. A real equipment/item remains in game state even if a visual is simplified. The initial model profile does not admit arbitrary morph animation, cloth, ragdoll simulation, or generated solvers; add a reviewed family/profile only for a concrete consumer. Owner: V3D05/V3D06.

## A3D07 — Demand, stages and active work

**Proposed · Restrictiveness: Safe.** Per world: **64 coalesced queued art demands** and **2 active external art stages**. Per server process: **256 queued demands** and **4 active external stages**, further restricted by account/provider/Worker limits. A root plan contains at most **16 total stages**, of which at most **8 are paid execution stages**. Each paid stage has **one admitted attempt** unless a new explicit retry authorization creates another recorded attempt.

**Why / boundary:** Bound queued work independently from active capacity and root monetary ceilings. Local queue entries contain bounded metadata, not eagerly downloaded artifact payloads. At capacity, reuse/dedupe or defer new optional demand with a truthful reason; never drop an already-paid attempt or lose its reservation. No batch can evade aggregate account/host admission. Owner: V3D07.

## A3D08 — Supervision and remote status traffic

**Proposed · Restrictiveness: Safe.** Initial automatic supervision window: **30 minutes per accepted external stage**. Poll no faster than **once every 5 seconds**, back off toward **30 seconds**, and cap at **120 status reads per stage** within that window; authenticated provider notifications can replace polling. This is operational wall time, not simulation time.

**Why / boundary:** Keep observation work bounded without holding a paid Run open. A deadline is not proof that the provider stopped or refunded money. Move unresolved work to an inspectable reconciliation state and preserve its original identity/reserve. Actual provider service levels and rate limits may require a revised explicit profile. Owner: V3D07/V3D08.

## A3D09 — Retrieval before hydration

**Proposed · Restrictiveness: Safe.** Scoped metadata pages: **40 results**; optional similarity candidate set: at most **200 candidates before application hydration/scoring**; metadata response: **256 KiB**. Initial optional indexed-query deadline: **250 ms**. Exact ID/digest lookup has exact-match semantics; a bounded similarity page does not establish exhaustive absence.

**Why / boundary:** Avoid scanning/deserializing an entire asset library before limiting output. Use indexed scope/family/version filters and bounded provider/index query work, not a whole-corpus JavaScript filter. Return cursor, coverage and unavailable/budget status. A failed lookup is not authorization to pay for a duplicate. Owner: V3D02/V3D07; remeasure at realistic library sizes.

## A3D10 — Durable storage and quarantine

**Proposed · Restrictiveness: Safe.** Initial allowance: **1 GiB of logically referenced plus staging art bytes per world**, and **10 GiB of physically retained art bytes per account**. Physical deduplication counts bytes once at account storage while each world's logical pins remain explicit. Reserve expected output/storage headroom before starting work.

Unpinned rejected/unclaimed source candidates are eligible for cleanup after **24 hours**; an explicit review hold initially lasts **7 days** and can be renewed within quota. Published artifacts, retained current-format saves, approved pack pins and in-flight dependencies are not deleted by these timers. Review expiry is visible, not a silent approval.

**Why / boundary:** Art accumulates even with low concurrency. Block new optional production when quota is exhausted; preserve existing pinned gameplay and financial evidence. Job/billing metadata and unresolved receipts follow the existing operational retention owner and are not deleted with candidate bytes. Coordinate collection with publication/pin generations. Owner: V3D02/V3D07/V3D10.

## A3D11 — Client loading and residency

**Proposed · Restrictiveness: Safe.** Initial client profile: **4 concurrent fetches**, **2 concurrent decodes**, and **32 queued load descriptors**. Track an estimated **256 MiB asset GPU residency** plus **128 MiB temporary/decoded CPU residency** for appearance resources, including old/new resources during handoff. Reserve a reusable fallback set. Existing render-target and non-asset application costs must also be measured; these are not a total browser-memory guarantee.

**Why / boundary:** A valid individual model may still exceed the available scene budget. Driver allocation can differ from estimates, so tracked limits require high-water observation and device qualification. Evict unreferenced resources or choose an approved lighter representation; do not remove a required visible target or refetch/generate on every camera movement. Owner: V3D03/V3D11.

## A3D12 — Performance targets and device profiles

**Proposed · Restrictiveness: Medium; targets, not safety limits.** Proposed desktop goal: **60 displayed frames/second**, with **p95 frame time at or below 16.7 ms** and **p99 at or below 33.3 ms** in the qualified workload. Reduced-quality goal: **30 frames/second**, with **p95 at or below 33.3 ms**. Target optional appearance-update/upload scheduling overhead of **2 ms per displayed frame** before accepting more work; a single uninterruptible upload must be measured, not falsely described as preempted by that budget.

**Why / boundary:** Hardware, browser/backend, scene diversity, DPR/resolution, shadows, population and simulation speed must be recorded. These targets do not establish 8× native simulation capacity. Profile and reduce the measured cost source before raising quotas. Final hardware and frame budgets remain the existing D09/R01/performance decision, informed by [visual qualification](../projects/3d-pixel-art-validation.md#5-performance-qualification). Owner: V3D01/V3D11/V3D12.

## A3D13 — Handoff deferral

**Proposed · Restrictiveness: Safe.** A prepared compatible upgrade may wait at most **2 seconds of wall time** for a preferred quiet visual boundary. After that, use a safe direct current-state switch if compatible; otherwise retain the previous representation and report incompatibility. This is not a deadline to install unsafe art.

**Why / boundary:** Avoid indefinite cosmetic waiting without forcing blended duplicate geometry or interrupting gameplay. Privacy revocation and required current-state changes never wait for this timer. Owner: V3D03.

## A3D14 — No additional lifetime count cap

**Proposed — no separate limit · Restrictiveness: Liberal.** Do not add a new global number-of-inventions, number-of-objects, or lifetime-published-assets cap solely for 3D art. Existing mechanics/data limits and A3D's bytes, work, scope and retention envelopes still apply. This is not an unlimited-storage or unlimited-population claim; metadata growth must remain within the existing database/operational budgets before deployment.

**Why / boundary:** Budget the resources that grow instead of forcing every world into a fixed art catalogue. Reuse and pinned immutable variants should remain valuable as a world develops. Owner: V3D07/V3D10.

## A3D15 — Bundled mercenary pilot

**Preserved earlier iteration · Restrictiveness: Medium.** One trusted bundled model family, with Idle/Walk clips and a 34-joint skeleton. The source package contains 42,426 triangles and 14,391,244 bytes; its original cape surfaces are replaced by four runtime cloth patches. Surface paint is prepared once at up to 256×256 with a 29-color palette. Character output is fixed at 128×192 in a 2.8 m viewing window centered 0.95 m above the foot, using nearest color/depth samples. This is an asset-specific presentation profile, not a universal character size or general import allowance.

Cape simulation uses 366 particles, eight constraint iterations, 60 Hz steps and at most three steps per displayed frame. Sixty initial settling steps are distributed three per frame before the model replaces its sprite. A displacement over 1.5 m resets contact rather than stretching cloth across a teleport. Dead/horizontal/unsupported action states and loading failures use the existing sprite. Exact skinned-silhouette picking, modular equipment, cloth self-collision and broader pose coverage are not delivered. Camera/model targets and cloth are per instance; GLB/materials are shared by the scene owner. There is no qualified crowd population limit yet.

**Why / boundary:** Preserve animated dimensionality while keeping zoom from exposing progressively finer surface detail. Fixed sampling bounds color work; actual geometry still costs skinning and shadow work. The [measured pilot](../verification/mercenary-default.md) is not a 60 FPS crowd or physical low-end guarantee. Expand through V3D01/V3D05/V3D11 when asset LOD, pose/equipment coverage and multiple clothed characters have been qualified. The owner superseded the earlier opt-in player replacement with a default separate NPC; no save migration or generated-art pipeline is implied.

## A3D16 — Authored block mercenary

**Preserved rejected figure · Restrictiveness: Medium.** One trusted bundled art family made from **21,613** deliberately authored cubic cells. Source cell edge **0.025 m**, source height **2.10 m**; fixed game display scale **1.4** gives **0.035 m** blocks, **2.94 m** presentation height and **1.26 m** width. This scale never depends on the camera and changes no native body. It compensates for normal elevated play compared with camera-facing sprites; lower pitch can make the model look larger.

The self-contained GLB is **467,296 bytes**, with **5,890 triangles**, **11,780 exported vertices**, **11 rigid meshes**, one shared opaque vertex-color material and no textures, skins or clips. Counts describe this actual asset, not a universal import allowance. Same-color coplanar surface merging preserves its authored solid cells. A solid **two-cell-thick cape**, covered joints and absent covered skin replace thin garment sheets. The cape remains rigid. Walking supports thigh swings up to **18°**, knee bends **12°**, arm swings **12°** and forearm bends **5°**; a bounded visual leg lift of about **0.0281 m in source units** keeps soles above support. These are asset-fit choices, not gameplay actions or physics rules. Unsupported actions/conditions, missing/loading assets and failures retain the sprite.

The ordinary color pass draws geometry directly. A per-instance framebuffer-sized depth texture and **11 borrowed mesh instances** protect nearest surfaces only while selected/read-through effects are visible, including fade-out; no low-resolution color image is composited. Shared GLB/material preparation is scene-owned. Camera changes invalidate depth drawing when the effect is active, but never alter the cells or asset. Picking retains conservative per-part bounds. Actor removal and scene teardown release effect bindings, targets and borrowed instances; late loads are fenced.

**Why / boundary:** Mike rejected the earlier study's camera-dependent sampled pixels, disappearing facial details, small apparent size and garment/body intersections. Fixed authored volumes address those causes while sacrificing freely simulated cloth. The previous asset/renderer/source remain intact, and [A3D15](#a3d15--bundled-mercenary-pilot) preserves their limits and rationale. [Evidence](../verification/mercenary-default.md#authored-voxel-iteration--october-14-2026) qualifies this finite walking/art/rendering slice; creator style acceptance, arbitrary poses, modular equipment, crowd/low-end capacity and supported sloped-foot placement remain with MER05/MER07, V3D05 and V3D11.

Mike explicitly rejected this figure's anatomy/style after those technical checks. Its source artifacts and counts remain historical; [A3D17](#a3d17--sculpted-source-guided-mercenary) superseded that default art without erasing its result, before the later restoration in A3D18.

## A3D17 — Sculpted source-guided mercenary

**Preserved rejected sculpture · Restrictiveness: Medium.** One trusted bundled fixed-cell model derived offline from the original study's standing body and fitted cape. Source cell edge **0.0125 m**, source height **2.10 m**, width **1.025 m**; the same fixed display scale **1.4** gives **0.0175 m** cells, **2.94 m** presentation height and **1.435 m** width. Zoom, orbit and projection never select a different cell density. Authored paint and explicit facial corrections replace texture-atlas sampling. Measured source/export dimensions come from the asset's provenance rather than the rejected figure's bounds.

The **5,553,168-byte GLB** represents **125,643 cells**, **71,046 triangles** and **142,092 exported vertices**. Eleven rigid meshes share one opaque vertex-color material, with no texture, skin or clip. Same-color coplanar faces merge offline. This sculpted asset has more triangles than the original imported body, so the first figure's reduced geometry is not a performance claim for this replacement. The renderer prepares boot bounds once, then updates finite part transforms during walking; the cape remains rigid. Offline fit checks **360 gait phases** with a **0.025 m cloth allowance**, retaining **18°/12° thigh/knee** and **12°/5° arm/elbow** movement. Maximum source boot lift is about **0.02830 m**. Some sleeve volume remains buried under the cape; inspected coverage does not mean zero volume overlap. The existing conditional full-frame depth-only protection, scene-owned shared loading, sprite fallback and conservative per-part picking are unchanged.

**Why / boundary:** Mike requested a substantially closer likeness after rejecting A3D16's box-like figure. Smaller fixed cells and the actual source shape preserve adult anatomy, shaped hands/boots and diagonal cape folds, at a larger geometry/payload cost. Imported source-model production rights remain unqualified. [MER09](../maintainers/art/mercenary.md#rejected-first-block-figure-and-new-sculpted-iteration) owns the revision, [evidence](../verification/mercenary-default.md#sculpted-source-guided-iteration--october-14-2026) owns exact counts and actual fit/browser checks, and [world presentation](../world-presentation.md#preserved-sculpted-block-figure) retains the trial description. Creator style acceptance, arbitrary poses/equipment, sloped-foot placement and crowd/device qualification retain their existing owners.

Mike subsequently rejected the face and block-like body and selected the original animated model. [A3D18](#a3d18--restored-original-animated-mercenary) supersedes this default without erasing its artifacts, rationale or scoped technical results.

## A3D18 — Restored original animated mercenary

**Current scoped implementation · Restrictiveness: Medium.** One trusted bundled original model with Idle/Walk clips and a 34-joint skeleton. The unchanged GLB contains **42,426 triangles** and **14,391,244 bytes**; its authored cape surfaces are replaced by four runtime cloth panels. Source diffuse artwork remains at its original dimensions: **1,254×1,254** for the body and **1,024×1,536** for the cape. Imported self-emission is disabled; there is no runtime atlas reduction/recoloring or fixed-resolution character color image. Actual geometry draws in world light and casts shadows. The preserved source package also retains its original unused emission map; this revision does not regenerate or strip the asset.

The camera-independent display scale is **1.6**, giving an approximately **2.96 m presentation height** from the **1.85 m source body**. Native body dimensions and mechanics are unchanged. This deliberately offsets foreshortening beside camera-facing people; final visual acceptance remains under review. The cape retains **366 particles**, **eight constraint iterations**, **60 Hz steps** and at most **three steps per displayed frame**, with **60 initial settling steps** distributed three per frame. World-space rest/tether lengths, collision radii, ground allowance and gravity scale consistently; the sampled chest lookup stays in authored coordinates through the original/current bone transforms. Exterior embroidery and dark lining share each moving panel with opposite face culling; no new thickness or general cloth solver is introduced. A displacement over **1.5 m** resets the cloth. Pause freezes settled folds while position/heading edits carry them with the attachment without advancing the solver; unsupported/dead/horizontal states and loading failure use the sprite.

Selection/read-through and the conditional full-frame nearest-surface depth pass borrow the actual skinned/cloth geometry. Per-instance cloth/effects are released before scene-owned prepared materials and shared assets; source textures remain asset-owned. Conservative per-mesh bounds picking, arbitrary action/equipment poses, cloth self-contact, sloped-foot placement and crowd/physical-device qualification retain their existing limits. No crowd capacity follows from this profile.

**Why / boundary:** Mike preferred the original animated face, body and fabric over both block trials. Preserve that artwork and motion while correcting displayed size, lighting and scale-dependent cape fit. [MER10](../maintainers/art/mercenary.md#original-model-refinement) and the [refinement plan](../projects/completed/mercenary-original-refinement.md) own current verification and remaining work; [world presentation](../world-presentation.md#animated-character-pixels) owns behavior. [Current scoped browser checks](../verification/mercenary-default.md#original-model-refinement--october-14-2026) cover fit, sizing, lighting, pause, visibility/fallback and lifecycle; the earlier sampled/block measurements do not qualify this revision. Final creator style approval and imported body/rig/texture production rights remain open. Revisit through V3D01/V3D05/V3D11 when the actual supported pose, art or device/population envelope changes; this is not a general import allowance or generated-art pipeline.

## Non-tunable boundaries

Authorization, no generated executable code, mechanic/visual separation, current-format save integrity, truthful failure, no automatic paid retry, no generation from camera/LOD/frame changes, and preservation of unresolved real obligations are integrity rules, not adjustable performance limits. A more liberal profile cannot waive them.

## Revising these values

Before a slice enables a profile, record enforcement locations, rejection/defer behavior, accounting unit, shared-budget composition, measurement, and the trigger for revision in its V3D task. Keep provider-specific limits in adapter configuration and device-specific profiles explicit. Do not copy these tables into other specs or mark a proposal Current merely because code constants were added; qualify the complete path and retain any unsatisfied constraints.
