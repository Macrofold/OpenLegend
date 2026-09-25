# Scaling readiness

**Status: research-derived planning and current-code audit, not delivered scaling.** The runtime audit is pinned to [`03105fed`](https://github.com/Macrofold/OpenLegend/commit/03105fed9209c126e4e69e9faeb4687f42d1e74a), 25 September 2026. Implementation must inspect the then-current branch. No game, paid-provider, load or fault-injection tests were run for this documentation work.

## Start here

| Need | Canonical entry point |
|---|---|
| What to do now, before feature growth, before public release, or much later | [Sequence and promotion gates](sequence-and-gates.md) |
| How the findings affect each feature's architecture | [Feature integration](feature-integration.md) |
| Where every research chapter is tracked | [Research-to-work coverage](research-coverage.md) |
| What the current code actually limits | [SCA01–SCA52 audit](current-code-audit.md) |
| Current cross-cutting implementation work | [SC01–SC16 with specific child tasks](../maintainers/scaling.md) |
| Full-stack evidence and P3/P4/P5 feature readiness | [SF01–SF18](../maintainers/scaling-feature-readiness.md) |
| Truly long-term, explicitly deferred work | [LT regional, memory, simulation and operations backlog](../maintainers/scaling-long-term/README.md) |
| Invention libraries, dependencies and active-rule growth | [Mechanic growth](mechanic-growth.md) |
| Papers, case studies and alternatives | [Massive-scale dossier](../../archive/02-research/massive-scale/README.md) |

## Current direction and ownership

The accepted direction is a **shared world divided into regions, with independent worlds also supported**. Build a correct small authoritative world first while keeping data access and ownership compatible with regional working sets. Independent-world throughput does not qualify the shared-world goal. [Production data](../maintainers/production-data.md) retains D0–D6; [product roadmap](../../archive/05-project/roadmap.md) retains P1–P7.

[Performance](../performance.md) owns cadence and runtime budgets; [production records](../../archive/07-technical-architecture/production-data-model.md) owns storage/transaction meaning; [synchronization](../../archive/07-technical-architecture/realtime-synchronization.md) owns the protocol; [memory](../memory-architecture.md) and [EPR](../events-perception-and-reactions.md) own knowledge/acquisition. This folder owns cross-cutting integration and sequencing, not replacement schemas or alternative writable systems.

SC tasks are specific remediation children; SF tasks are shared scenario/release evidence children; LT tasks are deferred expansion/evaluation children. Existing PF/EPR/SW/CR/AG/INV/EWF/SL/D work stays in its owner. The [coverage map](research-coverage.md) links recommendations to those bodies and has no duplicate checkboxes. Every new or clarified research-derived item is labeled **Massive-scale research** with the relevant chapter and audit finding where applicable.

## What to do when

**NOW / G0:** prevent assumptions spreading. Establish authenticated-control context, stable world/entity/source identity, exact units, one mutation owner, affected-record/region query scope and dirty identities. Remove a confirmed unwanted multiplier after a short relevant baseline. This does not require completing public authentication, a global database or a distributed engine before ordinary local features work.

**SOON / G1:** before the next history/library/population promise, implement consumed operational records and database-first selection, efficient recovery, bounded jobs and applicable-rule/resource queries. Faster JSON remains transitional; it cannot close D1/D2. Native work stays in memory and provider work stays outside transactions.

**SOON / G2:** before public shared play, deliver independently authenticated humans, recipient-specific views, human-private denial, bounded/fair admission, erasure, recovery/deployment, browser behavior and measured cost. These safeguards apply at external P2 access, not only P6. P3 construction, P4 economy and P5 media have their own feature-specific SF gates.

**LATER / G3–G4:** only after an explicit trigger, qualify regional authority, cross-boundary effects/time, physical storage distribution, specialized memory/search, fleet/geography and selected solver/fidelity experiments. The separate LT backlog is not the next-task queue. Promote in place with evidence and authorization, rather than copying tasks into a second tracker.

## Rules this work must not weaken

A work budget is not an arbitrary lifetime content cap. Preserve the removal of small recipe, memory, entity and named-save ceilings. Bound requests, transaction work, execution slices, queues and active working sets through paging, continuation, scheduling and measured admission. Do not delete knowledge or prohibit growth merely to pass a benchmark.

Preserve every legitimate witness and required native outcome. Optimize candidates/shared work without manufacturing sensory absence. Incomplete navigation/search is not proof of impossibility; missing vectors are not missing knowledge. Uncertain paid work is not permission to purchase again automatically.

Creator powers exclude human-private messages and character notes. A creator archive grants no NPC recall of forgotten/unperceived sources. Restoration retains current erasure, permissions and external accounting. No time dilation, cohort approximation, observer-dependent physics or new downtime catch-up is silently accepted.

## Closure

Inspect the new implementation, preserve existing optimizations, exercise the named workload and failure cases, and record actual evidence in [Verification](../verification.md). Close only the demonstrated child; parent release gates remain independent. A table, type, queue library or native microbenchmark does not qualify public multiplayer or million-player scale. The broad static audit does not prove that every possible defect has been found.
