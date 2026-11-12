# MMORPG engine foundations: design coverage and remaining questions

The [research](../../../research/mmorpg-engine-foundations/README.md) informs D22/D61 and R06/R12/R13/R15. This handoff records which questions now have a consuming design and which remain future scope; it is not nine new implementation projects.

## Target and current design

Investigate **1,000 concurrent humans per independently evolving world, potentially 5,000**, plus declared NPC activity, and the largest useful local encounter. Preserve the smaller native proof and release gates. Spatial indexes and transparent compute ownership are not gameplay separation; a fixed crowd cap, forced dispersal, duplicated encounter or queue remains a separately justified product choice.

**Selected near-term scope: Done — designed.** The [native runtime foundation feature specification](../../projects/native-runtime-foundations-feature-spec.md) and [technical design](../../projects/native-runtime-foundations-tech-design.md) reconcile actual code with the research. They specify current boundary preservation and four isolated candidates: one JSON shape preflight, synchronous scratch ownership, equivalent-connection capture reuse and ordered same-pool rate reads. [NRF00–NRF06](../native-runtime-foundations.md) owns their implementation/dispositions without duplicating the active proof or its profiling.

The [source/repertoire reconciliation](../../projects/native-runtime-foundations-evidence-and-repertoire.md) is pinned to `codex/native-simulation-proof` at `d9544ae5d017e697bfcfe2a38c71bb8569ad14f6`. The implementation ref is now accessible. The original research's earlier access limitation remains historical provenance, not a current blocker or evidence that native implementation is absent. Owner-reported uncommitted work and unrun measurements remain distinct from inspected source.

The [native tracker](../native-simulation-core.md) and its [coverage inventory](../native-simulation-core-coverage.md) retain completed NSC01, the completed NSC03 rejection of the current 128 MiB profile, A/B/C and read/admission repairs, passing reconnect evidence and scoped CPU/memory/SQL attribution. Successful adoption, settled memory and E2 remain unqualified. Preserve those results and their limits rather than reopening the finished assessment. NRF candidates require separate implementation authorization, a demonstrated consuming need and isolated correctness/performance comparisons; writing a candidate does not establish a speedup.

The main [needs-design register](../needs-design.md) already routes continuing communities through DG17, worthwhile crowds through DG18, participants/travel through DG29 and shared campaigns through DG34. Keep those group identities and existing PS/PF/PT/PD ownership. Completed narrow design does not close their broader feature delivery or population qualification.

## Working-set lifecycle and exact background advancement

**Current boundary: Done — designed in NRF technical section 1.2. Physical-region streaming remains a later consuming design.** Keep fast complete internal reads; do not add cold checks or a new repository abstraction to every field. Existing partial history retains explicit coverage and current accepted overlays.

For a nonresident physical place, NSC04/NSC05, simulation-time/save-load and PS02–PS03/DG17/DG29 must specify activation/deactivation across unsaved changes, action continuation, deadlines, physical and named nonlocal dependencies, pending external results, personal evidence and derived indexes. Missing resident data is not nonexistence. Prepare outside mutation, then recheck relevant inputs before acceptance.

The first useful consumer remains two places, one supported continuing activity and a cold-place arrival/interrupt, preserving effects, order, randomness, identities, observations and restoration without full-world/lifetime hydration. Measure activation cost; final positions alone do not prove exact progress. General coarse outcomes, independent clocks and distributed storage are not implied.

## Influence declarations and sparse deterministic scheduling

**Selected read-only decomposition: Done — designed as R for existing NSC03/E2.** Its coherent inputs, prepaid bounds, actual work charging, same-pool ranges and ordered effects are specified; implementation and measured benefit remain open.

Other recurring families retain their existing operation/dependency/native-time owners. Name reads/writes, spatial and nonlocal influence, wakeups/deadlines, continuation, ordering and output work. Unknown/overflowed dependencies remain conservative and observable. Preserve actual time-dependent invalidation and source order; a short boundary must not automatically trigger all-world work. Reuse prepared participant/forecast structures before adding an index or generic graph.

Broader NSC05 boundary work still needs independent and coupled interactions, a nonlocal dependency and unknown fallback, with interior/border equivalence and complete cost. New RNG semantics and cross-machine execution remain separate decisions.

## Coordinate precision and independently addressable geography

**Current numeric/identity contract: Done — designed and substantially already present.** NRF section 1.3 preserves f64 coordinates, units, logical identities, native handles and exact conversion owners rather than replacing them.

NSC04 and spatial/navigation/client owners must qualify a selected larger-world or different-library consumer before narrowing precision or introducing local frames. Include attachments, routes, support surfaces, personal evidence, save/restore, near/far interaction and local geometry change. Keep geometry independently addressable and invalidation scoped. Visual streaming and authoritative residency are separate consumers. A complete continent, global navigation rebuild or blanket numeric rewrite is not current work.

## Dense encounters and separate fidelity budgets

**Existing selected attention/scene designs remain designed; a new crowd movement/fidelity offer is not selected by NRF.** DG18/D22/D61, PS04/PS06, spatial and character-quality owners retain the broader question.

Keep occupancy, goal navigation, advisory avoidance, authoritative collision, mandatory perception/reaction, optional deliberation, evidence and presentation distinct. The research's occupancy-limited kinematic movement versus pushing comparison remains a candidate, not a changed physical law. Actual whole-interval clearance cannot be certified by a truncated advisory neighbour list. The earlier TypeScript `local-avoidance.ts` inspection concerned projectile avoidance, not a general crowd solver.

Preserve direct interactions, threats and commitments. World-authored attention limits are not load-triggered blindness or weaker defenses. Detail transitions retain identity and truthful personal history, are prospective, consider dependencies as well as distance, and avoid thrashing, starvation and stale thought debt. Measure moving and stationary/uncooperative participants, opposing flows, entry/exit, blocked routes and an individual encounter; add other body/geometry families when supported. Local neighbour degree, coupled scope and recipient load remain separate measures. No queued-away population is successful encounter capacity.

## Recipient-first publication and bounded joining

**Equivalent periodic capture reuse: Done — designed as P.** It shares real captured facts only; each recipient retains its own full view, scope, tokens, final disclosure lease, baseline and transport. It is not general shared-view caching or a new join protocol.

Multiplayer/projection/client, PF11 and PS04/DG18/DG29 retain broader delivery. Select actual eligible scopes before rich formatting; preserve personal names, stale detail, correction and permission. Existing bounded baseline/delta, reliable effects, replaceable presentation and resynchronization owners remain. A late joiner or slow/reconnecting client must obtain permitted current state without full-world serialization or replayed commands. Rendering omission does not remove authoritative bodies or grant knowledge. Network, browser and privacy evidence remain separate from socket count.

## Capture lifetimes, overload and fair resource admission

**Selected preparation/lifetime refinements: Done — designed as J/S, with existing NSC repairs retained.** Actual simultaneous-owner attribution and recurring 128 MiB failures remain with the active proof; no cause or repair is presumed from the research.

Scheduling/NET/PD07–PD08 continue to own bounded scratch, undo, snapshots, model context, save suffixes and unresolved requests. Give real resources release owners and count/byte/work/age bounds; reserve required output before acceptance. Preserve uncertainty after local cancellation, reliable evidence/receipts and fairness across worlds/participants. A slow consumer or noisy world must not silently drop accepted effects or starve unrelated play. Include ordinary walking/commands, save pressure and actual release tails. No automatic paid retries, higher allowance or generic priority platform is selected.

## Seed-copy identity and many-world creation

**Current source/instance and identity preservation: Done — designed in NRF section 1.3; existing creation already supplies reviewed definitions and activation.** No second manifest, overlay engine, database or process-per-world design is needed for this slice.

A later lazy materialization consumer under world creation/PD11/DG12/DG29 must define generator/definition pins, independent mutable caches and namespaced keys, order-independent content/ID/RNG allocation, creation/deletion markers and bounded current-state resolution/compaction. Avoid seed-object resurrection or mistaking current location/custody for persistent identity. Routing-only changes do not invalidate still-valid model jobs; actual source changes do.

Its first consumer remains two divergent seed copies with a deletion, separate save/restore and places encountered in different orders. Count stored, loaded and active worlds separately; share immutable resources, not consequences. Travel/import/custody semantics retain their existing owners.

## Mature persistence and recovery amplification

**Current incremental/cold-history architecture retained; no additional near-term architecture design is required solely by this research.** Existing NSC/production-data/save-load/PF11/PD06 own current read/preparation fixes and qualification. Physical-region streaming and a different distributed writer remain outside this disposition.

For longer-lived worlds, grow history independently of dormant geography. Trace packing, batches, working indexes, cold reads, correction/forgetting, reclamation and useful restore; include database CPU, indexes, WAL and maintenance as well as logical payload. The same active town fresh and aged must preserve continuity without routine lifetime scans or revoked-information resurrection. Keep in-memory acceptance separate from durable cuts and current authority/accounting. The initial whole-world complete-cut recovery contract stands; regional storage, event sourcing and a local WAL remain separate designs.

## Capacity frontier and operating offer

**Selected before/after and adoption procedure: Done — designed in NRF section 7. Actual operating capacity remains unqualified.** R12/PF11/PS06/PS08/PT/PD and the first-playable owners retain broader evidence, not another benchmark or fun-scoring programme.

Use the [qualification chapter](../../../research/mmorpg-engine-foundations/05-qualification-and-capacity.md) and [capacity contract](../../product-scalability/capacity-and-economics.md#10-qualification-workloads). Separate human input, NPC decisions/native reactions, active places, density/reach, history and service failures. Retain a useful individual journey and full response/client/CPU/memory/write/network/provider costs. Native correctness, actual model quality and human enjoyment are different evidence.

Keep failures and exact source/hardware/configuration. Changed fidelity is a different offer with explicit preserved guarantees and transitions, not an equivalent-work speedup. Excluded participants, inert bots, raw core counts or many independent worlds cannot qualify one concentrated encounter. No research estimate becomes a cap or a mandatory 5,000-client test.

## Sequencing and remaining decisions

If implementation is separately authorized, select only eligible NRF candidates through their existing semantic owners and the NRF tracker. NSC retains its completed assessment, recorded repairs/attribution and proof/adoption gates; full conversion uses its coverage inventory. Later PS/PF/PT/PD work consumes the remaining scopes above. Unconsumed streaming, crowds, fleet or mature-world machinery is not a prerequisite for the small proof.

No new product answer is required for the selected NRF contracts. Pushing/body-blocking, changed sensory/cognitive rules, unattended service and a real congestion offer remain future consumer choices. Preserve meaningful individual encounters, readable spatial choices and later consequences without inventing a new feature obligation. The design task executed no runtime, cloud, speed-test or paid-model work.
