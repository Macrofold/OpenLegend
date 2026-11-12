# MMORPG engine foundations: needs-design briefs

This is the focused design handoff from the [research](../../../research/mmorpg-engine-foundations/README.md), extending D22/D61 and R06/R12/R13/R15. It identifies refinements to existing owners, not nine new projects or an implementation-ready replacement engine design.

## Target and disposition

Investigate **1,000 concurrent humans per independently evolving world, potentially 5,000**, plus declared NPC activity, and the largest useful local encounter. Preserve the smaller native proof and release gates. Spatial indexes and transparent compute ownership are not gameplay separation; a fixed crowd cap, forced dispersal, duplicated encounter or queue remains a separately justified product choice. Consider compromises explicitly without silently adopting them.

The original source audit is pinned to `ec3d137f55434b01844075362f0f9364e2c91929`'s inherited runtime base `56e9ab35a1d6ac71ccce9cf97c0f76250a78e977`; `codex/native-simulation-proof` was unavailable during that audit. This research branch now follows `codex/native-simulation-proof` at `d1211430d65390957baf5b0094d2cf2057950f8f`. Moving the documents is not a new implementation review. The [native tracker](../native-simulation-core.md) and its [coverage inventory](../native-simulation-core-coverage.md) own current implementation and qualification evidence.

**Conversion follow-through:** use the existing caller/field manifest to review scoped state access, influence/wakeups, coordinates/identity and capture lifetimes as each owner is converted. Preserve the implementation branch's completed NSC01 and current NSC02/NSC03 gates; these research notes do not reopen satisfied work or claim that their broader requirements are already verified. Record satisfied coverage or the specific missing contract in the [native design pair](../../projects/native-simulation-core-tech-design.md) before its affected conversion. NSC04 consumes that coverage when full conversion is adopted, and NSC08 reconciles adoption and remaining qualification. Do not add a parallel manifest, implement general streaming to finish the small proof, or treat changed behavior as an equivalent-work speedup; use the [existing capacity/quality criteria](../../product-scalability/capacity-and-economics.md#10-qualification-workloads) and retain the actual human-input/NPC-decision/reaction mix.

**Next consuming designs:** use the existing [scalability pair](../../projects/product-scalability-tech-design.md), [attention/scenes pair](../../projects/attention-and-scenes-tech-design.md), spatial/multiplayer owners and [capacity contract](../../product-scalability/capacity-and-economics.md). The main [needs-design register](../needs-design.md) already assigns continuing communities to DG17, worthwhile crowds to DG18, participants/travel to DG29 and shared campaigns to DG34. Those groups and PS/PF/PT/PD remain authoritative; do not add duplicate DG/ND entries. Detailed proposals below become implementation tasks in the named owner when their consumer is selected.

**Player value:** a busy place should offer recognizable people and useful individual encounters; bodily space can support readable approaches and protection rather than compulsory obstruction; one campaign can offer different contributions to one outcome; distant work can make return meaningful. [Concrete applications and the movement candidate](../../../research/mmorpg-engine-foundations/02-scale-model-and-crowds.md#player-value-and-the-first-crowd-candidate) are proposals to evaluate, not newly required mechanics. Current character, scene and playability acceptance owns whether they are worthwhile.

## Working-set lifecycle and exact background advancement

**Owners:** NSC01/NSC04/NSC05, simulation-time/save-load and PS02–PS03; DG17/DG29. Preserve the access seam now; design a nonresident place when a consuming slice needs it.

Distinguish persistent existence, residency and execution activity. Extend current query/dependency outcomes and cold-history access: missing resident input is not nonexistence, an empty container or false recollection. Prepare cold state outside the mutation lane and recheck relevant inputs before acceptance. Specify who activates/deactivates state, with unsaved changes, action continuation, scheduled deadlines, physical/nonlocal dependencies, pending external results, personal evidence and derived-index reconstruction covered. Trace entity/dependency access, advancement, native captures and `world-records.ts`; do not add a competing repository abstraction.

**First slice and evidence:** two places, one supported continuing activity and an arrival/interrupt involving the cold place. Preserve effects, ordering, randomness, identity, observations and restoration without whole-world/lifetime-history hydration. Measure activation work and pause/memory cost; final positions alone do not prove exact progression. Unknown interactions retain the existing conservative path. Universal coarse simulation, independent authoritative clocks and distributed storage remain outside this slice.

## Influence declarations and sparse deterministic scheduling

**Owners:** NSC01–NSC05 and existing operation, dependency and native-time owners. Extend declarations while porting recurring families.

Name actual reads/writes, spatial and named nonlocal dependencies, wakeups/deadlines, continuation/cancellation, ordering and output work. Reuse finite query families, semantic changes and operation declarations, not a generic runtime graph. Unknown or overflowed dependencies remain conservative and observable. Trace global revisions and fine boundaries that could accidentally trigger world-wide work; time crossing a deadline invalidates an unchanged-input skip.

**First slice and evidence:** independent jobs plus a genuinely coupled interaction, one named nonlocal dependency and a conservative unknown case. Compare one/multiple workers and interior/boundary placement for accepted effects, RNG/identity and missed wakeups. Measure total work, critical path, memory/copying and fallback frequency. Stable merging matters beyond race freedom. New RNG semantics and cross-machine execution are separate decisions.

## Coordinate precision and independently addressable geography

**Owners:** NSC01/NSC04, spatial/navigation and client geometry. Resolve numeric/frame assumptions before they spread through native APIs.

Trace units, required world extent/local accuracy and precision through TypeScript, Rust, boundary encoding, storage, physics, navigation and rendering. Specify narrowing conversions and local frames where needed; do not use floating positions or cell addresses as identities. Include attachments, routes and personal evidence across frame changes. Give mutable geometry independently addressable pieces and scoped revisions so a local change need not rebuild world-wide navigation or invalidate every observer. Visual streaming and authoritative residency have different consumers.

**First slice and evidence:** the same supported interaction near and far from the origin, across a geometry boundary and after a local edit/save/restore. Qualify relative motion, contact, targeting, stable references and conversion/loading cost. Surface unsupported precision rather than conceal it with inflated collision tolerance. No complete procedural continent, global navigation precomputation or blanket numeric rewrite is required.

## Dense encounters and separate fidelity budgets

**Owners:** DG18/D22/D61, PS04/PS06, PF11, ordinary movement/perception/participation and existing character-quality owners. Refine the existing attention/scenes and scalability designs for one useful gathering before selecting a crowd offer.

Keep physical occupancy, goal navigation, advisory avoidance, authoritative collision, mandatory perception/reaction, optional deliberation, retained evidence and presentation distinct. The research's proposed first comparison is occupancy-limited kinematic movement with advisory avoidance, not an assumed fully pushable rigid-body crowd. Trace existing movement before choosing it: changing force transmission/pushing is a world-rule change. Require conservative whole-interval contact handling; a capped advisory neighbour list cannot certify nonpenetration. The inspected `local-avoidance.ts` concerns projectile avoidance, not a delivered general crowd solver.

Preserve direct conversation, threats and consequential commitments under the installed evidence/reaction rules. World-authored attention limits must not become load-triggered blindness, weaker opponents or silent loss of evidence. Keep independent identity/choice and truthful memory through prospective detail transitions. Use relevant dependencies as well as spatial proximity, bound transition work, prevent thrashing and starvation, and revalidate stale opportunities instead of accumulating optional-thought debt.

**First slice and evidence:** moving and stationary/uncooperative participants, opposing flows and a required individual encounter, with entry/exit and blocked-route recovery. Add body sizes, corners, vertical overlap, moving support or long-range coupling only when supported. Measure useful control, individual response, fairness, local degree, coupled scope, recipient load and client playability. No dropped physical effects, false memories or queued-away capacity. The actual pushing/fidelity/congestion choices remain explicit proposals until selected; do not install a hidden global crowd mode.

## Recipient-first publication and bounded joining

**Owners:** multiplayer/projection/client owners, PF11, PS04 and NSC captures; DG18/DG29.

Select eligible recipients and changed subjects before rich preparation. Share compatible receiver-independent work, then preserve personal identity, freshness, correction and permissions. Define a bounded baseline, compatible deltas, reliable effects, replaceable presentation, resynchronization and revocation. Trace native capture through formatting, socket buffering, browser state and presentation; transport does not determine message meaning. Cheap rendering or delivery omission does not remove authoritative bodies/effects or grant unseen knowledge.

**First slice and evidence:** observers with different knowledge, a late joiner and a slow/reconnecting client during an evolving encounter. Restore permitted state without world-wide serialization or replayed commands. Measure real bytes, CPU, retained buffers, first useful response and representative browser behavior. A socket count or renderer-only crowd is not full acceptance. Change transport, prediction or renderer only for a consuming measured bottleneck; aggregate sensory semantics still require their existing owner.

## Capture lifetimes, overload and fair resource admission

**Owners:** NSC01–NSC04, scheduling, NET and PD07/PD08; extend existing admission rather than create another queue service.

Inventory scratch, undo batches, captures, model contexts, baselines, save suffixes and unresolved requests. Name release owners and count/byte/work/age bounds; counts alone do not bound memory. Reserve mandatory output before acceptance. Distinguish replaceable presentation from required evidence, receipts and accounting. Preserve uncertainty when local cancellation does not establish upstream completion. Fairness across worlds, participants and work classes cannot reorder accepted causal effects or let noisy inputs starve unrelated play.

**First slice and evidence:** one slow consumer/provider alongside useful walking/commands, then a noisy world beside an independent world, including required save/evidence pressure. Demonstrate bounded retained cuts/backlog, honest degraded state, no lost/duplicated effects and no cross-world starvation; measure complete memory and queue tails. Existing funding/storage-stop rules remain controlling. No automatic paid retries or generalized priority platform is selected.

## Seed-copy identity and many-world creation

**Owners:** PD11, authored-world initialization, identity/save-load and travel; DG12/DG29. Preserve immutable-source/mutable-instance separation now, with materialization consumed by actual creation work.

Qualify IDs and cache/database keys by the right namespace. Persistent identity survives native slot reuse and routing; current membership, origin, life/timeline and custody generations have distinct meanings. Define seed/definition/generator pins, lazy materialization order and RNG/ID allocation so exploration order does not alter unrelated content. Cover creation, mutation, explicit deletion/tombstones and bounded current-state resolution/compaction; do not resurrect seed objects or share mutable caches between worlds. Routing-only moves must not unnecessarily invalidate still-valid model work; actual dependency changes must.

**First slice and evidence:** two seed copies with divergent actions and a deletion, independent save/restore, and an unmaterialized place encountered in different orders. Verify identities, no aliases/resurrection, independently preserved knowledge/resources and bounded creation/activation cost. Share immutable resources, not consequences. Count stored, loaded and active worlds separately. A generic overlay engine, per-world database/process, fleet expansion and travel mechanics are not prerequisites; existing travel owners decide imports/custody.

## Mature persistence and recovery amplification

**Owners:** production-data/save-load, PF11, PD06 and native save/restore; use existing changed-record and temporal-suffix owners.

Trace mutation, packing, batching, hot working indexes, cold reads, correction/forgetting, reclamation and restoration as history ages independently of geography. Bound hot state and retained captures without deleting required evidence for speed. Include physical writes/indexes/WAL/maintenance, not only logical payloads. Preserve in-memory acceptance versus durable cuts and current privacy/authority/accounting overlays on recovery; a database snapshot alone does not include unsaved native state.

**First slice and evidence:** the same active town fresh and aged, with an action, cold memory, correction/forgetting and restart. Demonstrate useful continuity, no revoked-information resurrection or routine lifetime scan, and complete CPU/memory/database cost. Keep the initial whole-world complete-cut recovery model. Regional storage, event sourcing and a local WAL remain separate designs.

## Capacity frontier and operating offer

**Owners:** R12, PF11, PS06/PS08, PT01–PT06 and PD01/PD09; DG18/DG29/DG34. Reuse their acceptance, not another benchmark or fun-scoring framework.

Use the [qualification chapter](../../../research/mmorpg-engine-foundations/05-qualification-and-capacity.md) and [existing quality/cost contract](../../product-scalability/capacity-and-economics.md#10-qualification-workloads). State human input, NPC decisions/native reactions, independently active places, density/reach, history, baseline/reconnect traffic and service failures separately. Compare the same useful gameplay journey while measuring useful progress, tails, client response, complete memory/write/network amplification and provider cost/quality. Native correctness, actual model quality and human enjoyment remain separate evidence.

Preserve failures and exact source/hardware/configuration. A reduced-fidelity offer must name changed observable behavior, preserved guarantees, transition/failure cases and why the resulting play remains worthwhile. Excluded participants, inert bots, raw core counts or many independent worlds cannot qualify one concentrated encounter. Choose the next bounded investment from observed limits; no research estimate becomes a cap or mandatory 5,000-client test.

## Sequencing and unresolved decisions

The existing caller/field manifest and NSC08 own conversion reconciliation; NSC04 consumes that coverage when full conversion is adopted. Existing PS/PF/PT/PD tasks own the consuming implementations and evidence. This handoff does not mark these broader designs complete. Do not delay the small proof for unconsumed streaming, crowds, fleet or mature-world machinery.

No new product answer is required to preserve these seams. Before adopting the corresponding experience, settle pushing/body-blocking, any changed sensory/cognitive rules and their individual guarantees, or an actual unattended/congestion offer with its existing owner. Do not reopen already selected exact distant activity merely because another representation is being explored. No runtime, cloud resource, speed test or paid-model call was executed for this record.
