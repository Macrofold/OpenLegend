# Preparing OpenLegend for massive scale

**Research dossier · 25 September 2026 · informational, not an accepted replacement architecture.**

Repository research baseline: [`3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238`](https://github.com/Macrofold/OpenLegend/commit/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238). Branch: `research/massive-scale-readiness`. This dossier contains **33 Markdown documents and 65 annotated source entries**, including papers, preprints, official documentation and engineering accounts. No capacity benchmark, runtime implementation, infrastructure deployment, or paid model evaluation is claimed.

## Current-code follow-through and superseding direction

The later [scaling readiness docs](../../../docs/scaling/README.md) audit runtime [`03105fed`](https://github.com/Macrofold/OpenLegend/commit/03105fed9209c126e4e69e9faeb4687f42d1e74a), recording **52 findings** and [16 focused remediation workstreams](../../../docs/maintainers/scaling.md) alongside existing D/PF/EPR/SW/CR/INV/EWF/SL work. Use that [current-code audit](../../../docs/scaling/current-code-audit.md), not this folder's earlier code snapshot, to locate actionable limitations. New work remains unimplemented unless its owner records actual evidence.

The owner has since selected a **shared world divided into regions, with independent worlds also supported**. The earlier independent-world-first recommendation retained in some research chapters is an architectural alternative, **not the current product priority**. The [production-data delivery slices](../../../docs/maintainers/production-data.md#delivery-slices-and-exit-evidence) and canonical specifications take precedence. Build a correct small authority first while preserving region-compatible identity, query scope and ownership; adding more independent worlds does not by itself satisfy the shared-world goal.

The newer audit also preserves removal of arbitrary lifetime content-count caps, actual physical-contact semantics, human-private data restrictions and safe in-place development migration. [Mechanic-growth guidance](../../../docs/scaling/mechanic-growth.md) and the updated declaration/feature specifications carry these learnings into ongoing work without replacing their semantic owners.

## The central recommendation

Preserve the expressive game by making **authority, knowledge, work, and lifecycle boundaries explicit**, rather than buying a distributed database or distributing every entity immediately. Establish a measurable, recoverable multiplayer world and region-compatible access contracts. Qualify regional execution and cross-boundary interaction when the shared-world workload requires them; independent-world fleet scaling remains supported but is not a substitute.

A million registered accounts, a million simultaneously connected players, a million active minds, and a million mutually interacting bodies in one place are four radically different requirements. None follows automatically from the others. A browser is a delivery and rendering environment, not a reason to surrender server authority or a proof that rich simulation is impossible.

The existing repository already anticipates many of the right boundaries. Its production target is substantially more scalable than a naive world-sized JSON save, but the current implementation has not completed that target. The highest-risk mistake would be to treat target documentation as delivered capacity—or to abandon its protections while optimizing. The original [repository audit](repository-audit.md) and [code-grounded pressure points](repository-hot-paths.md) remain historical context; start new implementation with the [current audit](../../../docs/scaling/current-code-audit.md).

## Reading routes

| Your question | Read |
|---|---|
| What is actionable in current code? | [Current-code limitations](../../../docs/scaling/current-code-audit.md) and [maintainer work](../../../docs/maintainers/scaling.md) |
| What should the eventual system look like? | [Target architecture research](target-architecture.md), [hot-world partitioning](later/hot-world.md), and [whole-world fleet](later/world-fleet.md); apply the current shared-world priority above |
| What decisions could become painful within a year? | [NOW: foundations](now/foundations.md), [contract review](now/contracts.md), [decision questions](decision-questions.md) |
| What do we build before public multiplayer? | [SOON: production world](soon/production-world.md), [data migration](soon/data-migration.md), [operational readiness](soon/operational-readiness.md) |
| How much does a million-player version actually require? | [Capacity model](capacity-model.md), [benchmark plan](benchmark-plan.md), [operations and cost](domains/operations-cost.md) |
| How do we retain deep simulation? | [Simulation and time](domains/simulation-time.md), [physics and navigation](domains/physics-navigation.md), [perception and interest](domains/perception-interest.md) |
| What about fires, buildings, ecology and invented machines? | [Environmental and structural systems](domains/environment-systems.md), [admission and security](domains/extensibility-security.md), [current mechanic-growth integration](../../../docs/scaling/mechanic-growth.md) |
| How do browsers stay responsive and synchronized? | [Networking and browser execution](domains/browser-networking.md), [media and assets](domains/media-assets.md) |
| How do billions of memories remain useful and private? | [Memory and retrieval](domains/memory-retrieval.md), [planetary memory growth](later/planetary-memory.md), [agent compute](domains/agent-compute.md) |
| How do trades, inventions, and social interactions survive failure? | [Persistence and consistency](domains/persistence-consistency.md), [economy and social systems](domains/economy-social.md), [extensibility and security](domains/extensibility-security.md) |
| What do successful games and papers actually demonstrate? | [MMO case studies](case-studies/mmo-lessons.md), [research comparison](case-studies/research-panel.md), [annotated sources](sources.md) |
| What might we still be overlooking? | [Risk register](risk-register.md), [creative architectural options](architectural-options.md), [research gaps](research-gaps.md) |

Suggested first sitting: current-code audit → NOW foundations → capacity model → target architecture research with current product direction. The domain chapters are a reference library, not a demand to implement every technique.

## Preserve the already accepted choices

The [existing decision register](../../05-project/open-decisions.md) retains accepted directions as well as residual questions. In particular, D03 already establishes the shared-world **Continue while unattended** toggle, all-player absence behavior, pause precedence and no server-downtime catch-up. The current local implementation does not demonstrate that hosted multiplayer target. The research discusses implementation and residual exposure/load questions, not reopening the accepted policy.

D14 and the [memory specification](../../../docs/memory-architecture.md) preserve raw-recall eligibility, consolidation, bounded authored continuity and protected commitments. Physical cold storage or a creator's archive does **not** grant an NPC access to forgotten, unperceived or otherwise ineligible sources. Cold personal recollection is not selected by this dossier. Optional world transfer, runtime scripts and sector behavior retain their existing decision owners.

## What is known, recommended, and unproven

**Observed** means inspected code or documentation at the identified pinned baseline. **Accepted target** refers to an existing canonical specification, not a new recommendation in this folder. **Proposed** means this report's engineering synthesis. **Conditional** means a later option whose trigger and tradeoff still need review. **Measured** is reserved for a reproducible experiment; the arithmetic here is not measured capacity.

Sources distinguish papers, preprints, official implementation documentation, and first-person engineering reports. Historic techniques remain useful where the underlying problem is unchanged; their hardware figures, browser constraints, product limits, and operational policies are not treated as current promises. Some sources were examined in full relevant sections, while others were screened from abstracts or indexed excerpts. The [source registry](sources.md) records that boundary.

## Documentation ownership

This folder owns the research synthesis and its proposed experiments. It does not become a second specification or implementation backlog. The [production-data tracker](../../../docs/maintainers/production-data.md) remains the sole owner of D0–D6; [performance](../../../docs/maintainers/performance.md), [spatial work](../../../docs/maintainers/spatial-world.md), [cognition](../../../docs/maintainers/cognition-redesign.md), and [event/perception work](../../../docs/maintainers/events-perception-and-reactions.md) retain their work items and acceptance gates. [SC01–SC16](../../../docs/maintainers/scaling.md) hold focused new child details once and route already owned work back to those trackers. Unresolved product decisions still belong in [open decisions](../../05-project/open-decisions.md); accepted changes must be reconciled there and in their specifications.

This research adds no permission to reduce required perception cadence, discard legitimate witnesses, fabricate unobserved history, erase protected commitments, truncate required character continuity, weaken ownership, or retry unknown paid effects. Approximation and gameplay limits are explicit product choices, not hidden performance fixes.

The earlier [hosting study](../hosting-and-scale.md) remains useful for deployment and framework context. Its proposed Colyseus/hosting choices are not evidence that the current runtime uses that stack. This dossier follows its pinned implementation baseline; current production contracts and the subsequent audit supersede conflicting recommendations.
