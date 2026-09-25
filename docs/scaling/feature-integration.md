# Feature architecture: applying the massive-scale research

[Scaling index](README.md) · [Sequence](sequence-and-gates.md) · [Research coverage](research-coverage.md)

This integration guide identifies the early architectural seams and later implementation triggers. The linked feature specifications remain canonical; this page adds no new writable state, protocol, privacy policy or automatic approval of a researched technique. Work state belongs in the linked maintainers.

## Identity, control and public hosting

The local service's profile/control/presence context cannot become multiplayer authority by adding sockets. Keep account, session, controller generation, world/timeline and actor identity distinct; recipient caches must include the actual disclosure context. A creator role is not access to human-private content.

**Now:** SC01.1/SC01.4 and SC04.1 contracts. **Before public P2:** SC01.2/01.3, SC02 and SF09/SF12. **Later:** LT-R03/04 transfer the same stable identities rather than renaming them. Owner: [Identity](../identity-and-references.md). Research: [NOW foundations](../../archive/02-research/massive-scale/now/foundations.md).

## Native simulation and time

Keep pure native validation, continuation and required physical/evidence updates independent of paid reasoning. Simulated seconds, real deadlines, logical order and client presentation are separate clocks. The accepted accelerated clock multiplies work measured per simulated time; a small real-time queue can still represent a large amount of fictional delay.

**Now/growth:** SC09.2, SC15, PF03/PF09 and SF01/SF03. **Later:** LT-S01 evaluates exact due-time execution; LT-S06 evaluates deliberately changed fidelity only with approval; LT-R07 owns distributed causal time. Owner: [Performance](../performance.md). Research: [simulation/time](../../archive/02-research/massive-scale/domains/simulation-time.md).

## Spatial physics, navigation and collisions

XYZ bodies, support surfaces and geometry stay independent of sprites, cameras and libraries. Use conservative candidates followed by exact supported checks. A bounded/partial/unavailable route result must not become a fictional proof of unreachable space. Large bodies and topology edits affect candidate membership, not only returned entities.

**Now/growth:** SW05/SW06/SW08, SC13.3/SC14.3/SC15.3 and SF03/SF06. **P3 edits:** SF13. **Later:** LT-S03/04 and LT-R05/06 compare larger navigation, crowds and connected-island ownership. Owner: [Spatial world](../spatial-world.md). Research: [physics/navigation](../../archive/02-research/massive-scale/domains/physics-navigation.md).

## Perception and interactions

Physical influence, private acquisition and network delivery are related but different graphs. A common event payload can be shared without granting everyone the same intelligibility or recognition. Candidate indexing removes irrelevant work; it cannot eliminate required output to a genuinely large audience. Coalescing a wake signal is not coalescing away distinct speech/evidence.

**Now/growth:** EPR02/03/05/08/09/10, SC08 and SF03/SF15. **Public clients:** SC02. **Later:** LT-R05 for boundary evidence and LT-M04 for source sharing; any spectator/instance/crowd compromise requires LT-S08/D61. Owner: [EPR](../events-perception-and-reactions.md). Research: [perception/interest](../../archive/02-research/massive-scale/domains/perception-interest.md).

## Memory, knowledge and intelligent agents

Global corpus size differs from one actor's eligible query corpus. Select scoped source/revision records before optional context text; mandatory current conversation, accepted continuity and protected obligations are not optional nearest-neighbor matches. Derived embeddings and summaries need incarnation/revision checks at durable publication, not only a preliminary read.

**Now/growth:** D2-MS01–03, SC06/08/11 and SF05. **Before multiple active conversations:** SC07's per-actor serialization and bounded execution classes; maintenance must have measured fairness without automatic extra paid calls. **Later:** LT-M and LT-O05/LT-S07 evaluate specialized retrieval/hosting or narrow surrogates. Owners: [Memory](../memory-architecture.md), [Knowledge](../knowledge.md), [Agency](../agent-agency.md). Research: [memory retrieval](../../archive/02-research/massive-scale/domains/memory-retrieval.md), [agent compute](../../archive/02-research/massive-scale/domains/agent-compute.md).

## Actions, plans and conserved resources

Action discovery, path proposals, native effect admission and durable success are distinct. Index local holdings and applicable candidates without inventing a second resource authority. Preserve ongoing plan outputs, consumed inputs and remaining work across data loading, cancellation and restore.

**Now/growth:** SC15, D1-MS02/03/04, AG05/SW05/SW06 and SF04. **P2/P4:** SF14 qualifies contested barter/currency. **Later:** LT-R06 coordinates a specific cross-owner effect rather than assuming all local actions are mergeable. Owners: [Targeted actions](../targeted-actions.md) and [agency runtime](../../archive/07-technical-architecture/agent-agency-runtime.md). Research: [persistence](../../archive/02-research/massive-scale/domains/persistence-consistency.md).

## Invention libraries, active mechanics and evolution

A million inactive definitions, a million simultaneous invocations and a single high-fanout rule are different workloads. Library discovery needs indexed eligibility/exact identity. Active rules need transitive work, scope and lifecycle accounting. Evolution needs reverse dependencies, immutable pins and a coherent activation boundary. Changing a port can widen authority/cost even when the outer type is unchanged.

**Now/growth:** SC12 for libraries, SC13 for combined work, SC14 for dependency/evolution; D4-MS01 for durable authorship/installations. **P3:** SF13 proves a concrete environmental composition. **Later:** G2 stays in INV/EWF's conditional owner and richer solvers in LT-S. Owners: [Declarations](../../archive/07-technical-architecture/declarations-and-evolution.md), [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md), [mechanic growth](mechanic-growth.md). Research: [extensibility/security](../../archive/02-research/massive-scale/domains/extensibility-security.md).

## Status effects and environmental systems

Index automatic applicability before activation, not only effects already active. Preserve declared phase order, units, threshold transitions and explicit source/sink accounting. A roof or wall can alter several supported query relationships; unsupported thermal/structural laws do not become implemented from an attribute name.

**Now/growth:** SC15.1/15.3, SC13/14. **P3:** SF13 and the specific coarse world mechanic. **Later:** LT-S05/06 evaluate a richer model with an explicit conversion and error envelope. Owners: [Status effects](../status-effects.md) and the appropriate base-world mechanic. Research: [environment systems](../../archive/02-research/massive-scale/domains/environment-systems.md).

## Conversations, social structures and economy

Sparse directional social records are not an all-pairs matrix. Conversation membership is not retroactive hearing. A market listing may be stale; a purchase must still preserve authoritative ownership. Faster worlds and rewindable timelines require explicit policy before exporting conserved goods.

**P2/P4:** SF14/SF15, D1/D2/NC and SC01/02/07. **Later:** LT-R06 for cross-owner exchange; LT-S08 for explicitly different remote participation. Owner: [Narration/conversations](../narration-and-conversations.md) and the chosen economy/social feature. Research: [economy/social](../../archive/02-research/massive-scale/domains/economy-social.md).

## Browser synchronization and rendering

Send permitted working sets, not saves. Reliable admitted effects and replaceable presentation have different loss/replay behavior. Join and resnapshot need a coherent revision boundary; cold bursts can dominate steady-state bandwidth. Prediction changes perceived latency, not authority or durable acknowledgment.

**Now/growth/public:** SC02/03, PF05/PF10 and SF02/SF06/SF10. **Later:** only adopt new transport/worker/representation after a measured need; LT-O03 handles fleet-level warming. Owner: [Realtime synchronization](../../archive/07-technical-architecture/realtime-synchronization.md). Research: [browser networking](../../archive/02-research/massive-scale/domains/browser-networking.md).

## Assets, speech and media

Approved assets are asynchronous, versioned presentation; native fallback and authoritative body mechanics must remain usable without them. Media transport enforces recipients; local volume/muting is not confidentiality. Share synthesis/transcription work only when actual source/detail permissions permit it.

**At the asset consumer:** SF16 and SF06. **P5 before voice:** SF17/SF18 and current NC/EPR/SW. Do not defer those safeguards until P6 or treat media-room marketing capacity as a gameplay limit. Owner: [runtime art](../../archive/03-design-proposals/procedural-art-and-animation.md) and conversation/sensory owners. Research: [media/assets](../../archive/02-research/massive-scale/domains/media-assets.md).

## Persistence, saves and asynchronous side effects

A checkpoint, current operational record, historical source, derived index and diagnostic log are different data products. One writable owner survives migration. Paid attempts, privacy overlays and external rights do not rewind with a fictional save. A timeout can represent an unknown accepted effect.

**Now/growth:** D0/D1/D2 children, PF08-MS01/MS02, SC05/06/09/10/11/16. **Public:** SF07/SF10/SF11. **Later:** LT-R10/LT-M08/LT-O04 qualify physical distribution and larger recovery. Owners: [production data](../../archive/07-technical-architecture/production-data-model.md), [save/load](../save-and-load.md). Research: [data migration](../../archive/02-research/massive-scale/soon/data-migration.md).

## Operations and evolution of infrastructure

Measure a workload vector and full cost distribution, not accounts or average tokens. Bound queues, isolate optional failures and publish actual admitted envelopes. Choose supported devices, privacy/retention and recovery objectives before release qualification. A sophisticated fleet cannot cure a globally serialized or unbounded mechanic.

**Before public persistence:** SF07–SF12, SC03/SC10. **Later:** LT-O and LT-R, with explicit promotion/stop criteria. Managed services remain replaceable behind the actual behavior needed; this research does not select a vendor. Owner: [delivery/scale](../../archive/07-technical-architecture/data-delivery-and-scale.md). Research: [operations/cost](../../archive/02-research/massive-scale/domains/operations-cost.md).

This guide is a cross-feature reading route. It deliberately does not copy schemas, phase budgets, task bodies or accepted policies out of their canonical owners.
