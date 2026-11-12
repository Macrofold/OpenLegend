# MMORPG engine foundations: needs-design briefs

These briefs extend D22/D61 and R06/R12/R13/R15. They are proposed follow-through from the [foundation research](../../../research/mmorpg-engine-foundations/README.md), not new runtime authorization or a duplicate implementation tracker. Delivery stays in NSC, PF, PS, PD and the existing subsystem owners. A future full feature/technical design should update its existing pair where one exists and follow the current design policy.

## Target and interpretation

Mike selected a research ambition of **1,000 concurrent humans per independently evolving persistent world, potentially 5,000**, plus NPC activity. Establish the largest feasible local gathering through optimization and measurement; no arbitrary lower crowd cap is selected. Meaningful geography and physical crowding are candidate contributors, not capacity guarantees. Compromises may be evaluated, but existing gameplay/time/privacy contracts are not silently relaxed.

Many worlds may share one seed but diverge in mutable state and history. The smaller native proof and existing release qualification remain valid milestones; this target does not turn 5,000 players into a prerequisite for the next playable game.

Source basis: `Macrofold/OpenLegend`, `codex/stealth-runtime-01-evidence`, `56e9ab35a1d6ac71ccce9cf97c0f76250a78e977`. The named `codex/native-simulation-proof` ref was unavailable through GitHub during research. Reconcile actual implementation before changing its interfaces; do not treat a design-only tracker as proof that no local implementation exists.

## How to use these briefs

For each selected design, trace current producers, consumers and persistence, identify which requirements are already satisfied, and add only the missing seam. Record one minimal end-to-end slice, unchanged contracts, explicit exclusions, required correctness passes, required measurements and conditions for later expansion. A design entry is not a request to build every scenario or write a new test framework.

NOW means preserve a boundary while native storage and APIs are taking shape. SOON means a consuming larger-world or multiplayer slice should design and qualify it. LATER means retain the existing staged route without building speculative infrastructure. No new numerical limit below is an adopted gameplay policy.

## Working-set lifecycle and exact background advancement

**Timing and owners:** NOW access/lifecycle seam; SOON first nonresident region. NSC01/NSC04/NSC05, simulation-time and save/load owners, PS02/PS03. Basis: research chapters 01, 03 and 04; sources S06, S12 and S14.

**Existing coverage:** native resident authority, cold personal history, dirty/due work and selected exact distant activity. Missing qualification is their composition with partially resident physical geography and active obligations, not a reason to replace those systems.

**Design deliverable:** specify persistent existence versus residency versus execution activity; state/query outcomes when required input is cold; activation/deactivation ownership; deadlines and interruption horizons; unsaved changes and derived-index rebuild; pending action/model references; and readiness before publication. Trace `entity-collection.ts`, `dependencies.ts`, native state access, `world-records.ts`, the actual advancement caller and cold-read consumers. Preserve coherent time and current evidence when a cold place can affect an active one.

**Minimal slice:** two places, one supported continuing activity and a real arrival/interrupt that requires a cold place. Cold preparation occurs outside authoritative mutation and its relevant inputs are rechecked before acceptance. Empty resident lookup is not interpreted as nonexistence. No full-world or lifetime-history load is required.

**Completion evidence:** equivalent supported outcomes, identities, ordering, saved randomness and personal evidence across resident/nonresident execution, interruption and cold restore; bounded activation work and measured pause/CPU/memory. Exact elapsed progress is not inferred from the final position alone. Unsupported interactions are explicit, not silently approximated.

**Deferred:** generic coarse simulation for every mechanic, independent regional clocks and distributed databases. Do not block the existing complete small proof on implementing the entire streaming system.

## Influence declarations and sparse deterministic scheduling

**Timing and owners:** NOW while porting recurring families. NSC01–NSC05 and existing native-time, dependency and operation owners. Basis: chapters 02/03/05; S07–S09.

**Existing coverage:** typed query/dependency families, semantic changes, conservative fallbacks, ordered phases and bounded native pool. Extend these rather than creating a runtime universal dependency graph.

**Design deliverable:** for each consumed family name reads, writes, spatial and named nonlocal dependencies, due conditions, cancellation/continuation, required ordering and bounded output. Trace global geometry/dependency revisions and overflow paths. Specify what may run independently inside a busy cell and what must join a coupled scope. Distinguish safe unchanged-input skips from deadlines crossed by elapsed time.

**Minimal slice:** one independent pair of jobs and one genuinely coupled interaction, with the same result under one/multiple workers and interior/boundary placement. Include a known nonlocal dependency and an unknown-dependency conservative path. Avoid recomputing every entity merely because one family's next boundary is short.

**Completion evidence:** deterministic accepted effects and RNG/identity behavior, no missed wakeups or stale input, observed fallback frequency, total work and critical-path cost. Record actual worker and memory limits; race freedom or thread count alone is not a pass.

**Deferred:** cross-machine execution and new RNG schemes. Unknown dependencies remain conservative until declared, not falsely parallel. Future authored-law expansion must state its supported execution envelope.

## Coordinate precision and independently addressable geography

**Timing and owners:** NOW numeric/frame contract; SOON first larger mutable geography slice. NSC01/NSC04, spatial/navigation and existing client geometry owners. Basis: chapter 03; S12/S13.

**Existing coverage:** current world positions, body bounds, spatial query indexes and compiled geometry/navigation providers. Existing query bins are not proof of large-coordinate correctness or streamed terrain.

**Design deliverable:** trace units and precision through TypeScript, Rust, boundary encoding, storage, physics, navigation and client rendering. Specify world extent, local accuracy and frame conversions; check narrowing casts and rebasing effects on identities, routes, attachments and perceived evidence. Define independently addressable geometry pieces and scoped invalidation for mutable structures without choosing a new renderer.

**Minimal slice:** an ordinary interaction near the origin and far away, including crossing a piece boundary and changing geometry. Use a numeric extent selected by the actual authored world rather than a universal engine constant.

**Completion evidence:** correct relative motion/contact/targeting, stable save/restore and references, no whole-map rebuild for a local mutation, measured conversion/loading overhead. Unsupported library precision must be visible, not masked with an arbitrary enlarged collision tolerance.

**Deferred:** a complete procedural continent, global navigation precomputation or blanket replacement of all numbers. The design should identify exactly which boundaries need a change.

## Dense encounters and separate fidelity budgets

**Timing and owners:** SOON before selecting a crowd offer; NOW retain separate mechanisms. D22/D61, PS04/PS06, PF11, ordinary movement/perception/participation owners. Basis: chapter 02; S01, S02, S08, S10 and S11.

**Existing coverage:** personal attention, selected compact communication, conservative geometry candidates and native action continuation. The inspected `local-avoidance.ts` is not evidence of a complete crowd solver.

**Design deliverable:** distinguish physical occupancy, local movement/avoidance, coupled effects, mandatory perception/reaction, optional deliberation, evidence retention and presentation. Define the supported body's/influence family's geometric assumptions. Compare unchanged-semantics work removal and within-encounter parallelism before selecting any lower-detail behavior. Keep individual threats, speech and other required exceptions correct; do not switch every subsystem off through one hidden crowd flag.

**Minimal slice:** a meaningful gathering with moving, stationary and uncooperative participants, entry/exit and a required individual interaction. Add a bottleneck, vertical/body-size variation and a long-range or chained dependency only as consumed by the supported family.

**Completion evidence:** useful control and interaction under measured density, exact protected outcomes and privacy, no collision safety claim from silently truncated candidates, bounded transitions and observed fairness. Report both neighbour degree and connected-component/recipient load. Queued-away people are not supported active population.

**Open product choices for a future offer:** which approximations, optional-thought delays or congestion controls are acceptable in the measured problem case. Research authorization to consider compromises does not answer those choices for every mechanic. No loading wall, time dilation, mandatory queue or fixed local cap is adopted here.

## Recipient-first publication and bounded joining

**Timing and owners:** NOW product boundaries; SOON multiplayer path. Existing multiplayer/projection/client owners, PF11, PS04 and NSC capture consumers. Basis: chapters 02/03; S01/S05.

**Existing coverage:** scoped views, personal identity/freshness, independent publication and coalescing. Do not replace these with one objective crowd snapshot delivered to everybody.

**Design deliverable:** identify actual recipient scopes before rich preparation; share only compatible receiver-independent work; define permitted baseline, reliable effect sequence, replaceable updates, resynchronization and revocation. Trace native capture through formatting, sockets, browser state and presentation. Protect individual stale detail and unknown identity when global geometry changes. Separate transport from message meaning.

**Minimal slice:** multiple observers with different knowledge, a late joiner and a slow/reconnecting client during an evolving encounter. A bounded baseline plus compatible updates restores current permitted state without world-wide serialization or replaying commands.

**Completion evidence:** actual delivered byte/CPU and retained-buffer costs, first useful response, current authorization and correction handling, no secret leakage, and representative browser performance. Server sockets and a renderer-only crowd are separate evidence.

**Deferred:** transport migration, a new renderer, universal client prediction and aggregate crowd semantics not yet adopted. Trace the current path first; choose a smaller optimization when it satisfies the needed envelope.

## Capture lifetimes, overload and fair resource admission

**Timing and owners:** NOW at native/host boundaries; SOON cross-world contention. NSC01–NSC04, performance scheduling, NET and PD07/PD08. Basis: chapters 03/04/05; S16/S17.

**Existing coverage:** count/age-bounded queues, storage-failure handling, protected receipts, provider admission and current network lifetimes. Extend missing byte/work/fairness coverage rather than installing another queue service.

**Design deliverable:** inventory native scratch, undo batches, immutable products, in-flight model contexts, view baselines, save suffixes and unresolved requests. Name each release owner and count/byte/age bounds. Distinguish optional replacement from mandatory retention. Reserve required output before acceptance, retain capacity for uncertain external work, and schedule fairly across worlds and participants without reordering accepted causal effects.

**Minimal slice:** one slow consumer or provider plus unrelated walking/commands, then one noisy world beside an independent world. Include cancellation that does not prove remote completion and pressure during required save/evidence production.

**Completion evidence:** no unbounded retained cuts, no duplicate paid/accepted effects, preserved required evidence, bounded optional backlog, observable degraded state and absence of cross-world starvation. Measure complete memory and queue tails, not only main-thread utilization.

**Deferred:** generalized priority frameworks or automatic paid retries. Existing pause, funding and storage policies remain controlling; a local queue timeout grants no new gameplay authority.

## Seed-copy identity and many-world creation

**Timing and owners:** NOW identity/source separation; SOON first many-world creation consumer. PD11, existing authored-world initializer, identity, save/load and travel owners. Basis: chapters 03/04; S04, S18–S20.

**Existing coverage:** authored definitions and assets, selected identities, world lifecycle and production fleet direction. This brief does not prescribe one database or process per world.

**Design deliverable:** distinguish immutable seed/version/generator/resource pins from mutable instance state; qualify local IDs against the right namespace; keep persistent identity independent of current machine and, where supported, travel destination. Specify lazy materialization order, RNG consumption, mutations, creations, deletions/tombstones and bounded current-state resolution. Prevent mutable references or caches from leaking changes between copies.

**Minimal slice:** two instances of the same seed, different actions and one deletion, independent save/restore, and a nonmaterialized place encountered in different orders. Share actual immutable resources without sharing mutable consequences.

**Completion evidence:** no cross-world aliasing, stable supported identity and seed content, no accidental resurrection, scoped database/cache keys and bounded creation/activation work. Record stored versus loaded versus active-world costs separately. Complete independent histories are not a state-sync problem to solve with layering.

**Deferred:** a generalized snapshot/overlay storage engine, worldwide fleet infrastructure and cross-world travel mechanics. Existing travel design remains the authority for custody and permitted imports.

## Mature persistence and recovery amplification

**Timing and owners:** SOON alongside longer-lived playable worlds. Production-data/save/load owners, PF11, PD06 and NSC save/restore stages. Basis: chapters 03–05; S14/S15.

**Existing coverage:** incremental changed records, cold history and native candidate acceptance. Reuse temporal suffix/record codecs and the current PostgreSQL writer.

**Design deliverable:** trace routine mutation, packing, write batching, cold reads, retention/correction, physical reclamation and restore with independently aged history. Specify bounded hot data and working indexes without deleting required evidence for speed. Preserve accepted in-memory versus durable cut distinctions and current authority/privacy overlays on recovery.

**Minimal slice:** the same active town in a fresh and aged world, with a current action, cold memory read, correction/forgetting and restart. Grow dormant geography separately from history to expose different causes.

**Completion evidence:** useful restored continuity, no reappearance of revoked information, no lifetime scan on routine play, and complete CPU/memory/database/write-amplification results. A successful snapshot creation is not usable-world recovery.

**Deferred:** regional storage sharding, a new event-sourcing platform or local WAL. The initial distributed design's whole-world complete-cut recovery remains selected until a separately adopted design changes it.

## Capacity frontier and operating offer

**Timing and owners:** NOW preserve attribution; SOON at each actual expansion. R12, PF11, PS06 and PD01/PD09. Basis: chapter 05 and its workload families.

**Design deliverable:** define source-bound workload profiles separating dispersed activity, concentrated recipients/coupling, world age, cold activation and failure bursts. Choose exact correctness passes and measurements before running; keep exploratory maximum searches separate. Report useful active people, game-time progress, p95/p99 response, memory, write/network amplification, provider outcomes and complete cost.

**Minimal slice:** reuse the complete native proof and its existing controls. Add one growth dimension that answers the next architectural uncertainty, not a compulsory 5,000-client gate or another benchmark framework.

**Completion evidence:** an honest qualified envelope with failures, source/hardware/configuration and behavior changes stated. Use it to select the next architecture investment or explicit compromise. Cloud fleet counts, CPU/core counts and configured connection limits are not substitutes.

## Sequencing and unresolved dependencies

First preserve scoped state access, identity, numeric/frame contracts, declared recurring work and bounded products during NSC01–NSC04. Then select the smallest useful residency, delivery, crowd and mature-world designs when their consumers require them. NSC05–NSC07 retain cell/distribution/adaptation ownership; PD11–PD12 retain fleet and production expansion.

The inaccessible implementation branch is a source-reconciliation dependency before modifying that work, not evidence of a runtime defect. Concrete fidelity, unattended-service and congestion offers require their existing product decisions before activation. No further product answer is required to retain these research findings and needs-design briefs. No runtime, cloud resource, load-test or paid-model work was performed for this record.
