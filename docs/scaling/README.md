# Scaling readiness

**Status: current-code audit and planned remediation, not delivered scaling.** Reviewed 25 September 2026 against runtime commit [`03105fed`](https://github.com/Macrofold/OpenLegend/commit/03105fed9209c126e4e69e9faeb4687f42d1e74a). The research branch includes that main revision. No game, provider, failure-injection or load tests were run for this documentation audit.

## Start here

- [Current-code limitations](current-code-audit.md): evidence, growth mechanisms, risky assumptions, existing protections and the work owner for every finding.
- [Scaling remediation tracker](../maintainers/scaling.md): actionable child work, dependencies and exit evidence; links to existing tasks instead of duplicating them.
- [Mechanic growth and invention](mechanic-growth.md): how library size, dependency changes and composed runtime effects affect extensibility.
- [Research dossier](../../archive/02-research/massive-scale/README.md): papers, case studies and architectural alternatives. Its earlier independent-world-first recommendation is not the current product priority.

## Current direction and ownership

The accepted direction is a **shared world divided into regions, with independent worlds also supported**. Implement a correct small authoritative world first, but make its data access and ownership boundaries compatible with regional working sets. Adding independent worlds does not satisfy the main shared-world scaling goal. [Production delivery](../maintainers/production-data.md) retains D0–D6 and their release gates.

[Performance](../performance.md) owns cadence and runtime budgets; [production data](../../archive/07-technical-architecture/production-data-model.md) owns records and transactions; [synchronization](../../archive/07-technical-architecture/realtime-synchronization.md) owns the wire protocol; [memory](../memory-architecture.md) and [EPR](../events-perception-and-reactions.md) own knowledge and acquisition. This folder owns the audit and its cross-cutting integration guidance, not replacement versions of those contracts.

The SC items are focused child work under the existing phase/subsystem owners. Their detailed task bodies live in one place, the scaling tracker. Findings already covered in detail by EPR02, EPR05, PF08, SW or other tasks point directly there. Do not copy those task bodies into a second backlog.

## What to do when

**NOW — prevent assumptions spreading.** Bind human identity and control explicitly; use stable world/entity/source identities rather than machine or renderer identity; retain one mutation owner; give routine reads an affected-entity/region or indexed-query scope. Record changed identities at mutation time instead of rediscovering them by scanning growing dictionaries. Preserve scoped evidence, operation receipts and source versions. Address confirmed repeated scans through their existing owners after a short relevant baseline.

**SOON — before public shared play.** Deliver independent authenticated participants, per-recipient snapshots, bounded request admission, fair agent work, operational records and database-side recall selection. Qualify restart, duplicate requests, stale results, erasure, cold joins and real browser behavior. Ordinary people must not receive local-owner/god access merely because they can connect.

**LATER — before multiple authorities or large retained datasets.** Qualify regional ownership/fencing, cross-boundary interaction and coherent recovery. Partition physical storage, specialize retrieval or offload kernels only for a demonstrated bottleneck. Global clocks, RNG, ownership and external effects need explicit protocols before parallel execution. Keep the earlier seams useful without deploying every eventual service today.

## Rules this audit must not weaken

A work budget is not an arbitrary lifetime content cap. Preserve the accepted removal of small recipe, memory, entity and save-count ceilings. Bound one request, transaction, execution slice, pending queue and active working set through paging, continuation, scheduling and measured admission. Do not silently delete records or prohibit growth to make a benchmark pass.

A full result can be inherently large. Preserve every legitimate witness and required native outcome; optimize candidate selection and shared work without inventing sensory absence. Incomplete navigation/search is not proof of impossibility. Missing vectors do not mean missing knowledge. A failed or uncertain paid request is not permission to repurchase automatically.

Creator authority does not include human-private messages or character notes. Current local-owner tooling is not evidence of that future shared-world privacy boundary. Physical archives never grant an NPC recall of forgotten, unperceived or otherwise ineligible sources. Save restoration must retain current erasure, permission and external-accounting protections.

## How to close a finding

Inspect the implementation at the new head; preserve existing optimizations; implement through the named semantic owner; exercise the stated failure and workload cases. Record actual evidence in [Verification](../verification.md) and mark only the demonstrated child criterion complete. A table, type, queue library or passing native microbenchmark does not close a public multiplayer, privacy or recovery gate.

This is a broad static review of the named paths, not a proof that every defect in the repository has been found. The audit states where a finding is an observed implementation property, a future-boundary risk, or an unqualified capacity assumption. Re-audit affected callers when a feature changes those assumptions.
