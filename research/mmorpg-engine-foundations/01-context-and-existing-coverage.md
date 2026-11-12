# Context and existing coverage

[Collection](README.md) · [Sources](sources.md)

## Provenance and interpretation

Repository: `Macrofold/OpenLegend`. Research base: `codex/stealth-runtime-01-evidence` at `56e9ab35a1d6ac71ccce9cf97c0f76250a78e977`. Research branch: `research/mmorpg-engine-foundations`. Source conclusions below concern that pinned base, not a developer's unpushed checkout or subsequent branches.

The supplied Rust implementation ref, `codex/native-simulation-proof`, returned GitHub's `No commit found for the ref` response. Its implementation progress could not be inspected. That does not establish that the work does not exist locally. Reconcile these findings with that implementation before changing native APIs; do not infer current code solely from an integrated design tracker marked not started.

The investigation used the root instructions, documentation/performance/design/review guidance, the native feature specification and delivery tracker, relevant sections of its technical design, current scheduling and production-deployment contracts, decision owners, and selected source ranges. It is a focused architecture audit, not a complete line-by-line review of the game or a new performance profile.

## Prior conversations and earlier research

Conversation retrieval provided historical context on the October 18 gameplay-scalability discussion, October 2 AWS/GCP hosting work, product-scalability planning, and the later simulation-performance investigation. Retrieved summaries are not complete transcripts or reliable direct conversation URLs. Earlier assistant labels such as “Worker Architecture / Autoscaling” are not verified chat titles and should not be used as exact navigation instructions.

The useful continuity is substantive: communities sharing persistent worlds; meaningful travel rather than interchangeable instances; unattended NPC life and its cost; spatially distributed activity versus crowded encounters; and stateful cloud deployment rather than ordinary stateless web scaling. These topics did not begin with this research.

The current [production-deployment tracker](../../docs/maintainers/production-deployment.md) independently records the earlier `research/massive-scale-readiness` work at `d2fa69bd` and its October 2 AWS/GCP research. PD11 already covers many-world fleet placement and measured provider comparisons. PD12 already covers the progression from working sets to regional compute and eventually storage distribution. This research does not create a competing cloud roadmap.

The [world-and-play decisions](../../docs/maintainers/decisions/world-and-play.md) are more precise than a generic recollection of “lower-fidelity offscreen simulation.” They select exact distant activity through rates, trajectories, known interactions and event timing for supported families. They separately select compact expressive background communication with independent contributions and interpretations. Approximate combat outcomes are not selected. The new permission to consider compromises authorizes evaluating alternatives, not silently replacing these contracts.

## Foundations already covered

The [native-core design](../../docs/projects/native-simulation-core-tech-design.md) already specifies resident compact authority, stable external identities and process-local handles, generated boundary types, bounded captures, per-operation rollback, deterministic ordering, a shared compute pool, and staged cell ownership. It explicitly rejects per-actor threads, per-field bridge calls, a parallel authoritative TypeScript world, and a wholesale rewrite before a complete proof.

The [native delivery tracker](../../docs/maintainers/native-simulation-core.md) puts NSC03 multicore before NSC05 same-machine cells. NSC06 initially preserves one clock/controller and writer, fenced custody, and whole-world recovery from a complete durable cut. NSC07 makes adaptive placement conditional on a measured benefit. These are existing design obligations, not new discoveries or completed runtime claims.

The [scheduling contract](../../docs/performance/scheduling.md) already distinguishes dirty/due work from unconditional scans, simulation deadlines from wall-clock timeouts, reliable outcomes from replaceable presentation, bounded buffers from durable state, and background overload from actual storage failure. It already warns that configured connection capacity is not demonstrated simulation capacity.

Storage already has changed-record and partial-history machinery. Knowledge already distinguishes shared immutable source values from receiver-specific evidence and permissions. Retaining these boundaries matters more than naming a new cache or distributed database.

## Selected source observations

### Entity access and order

`packages/domain/src/entity-collection.ts`, inspected lines 1–180, uses indexed records and explicit ordering. It has exact lookup and complete-enumeration paths, with draft bookkeeping and counters. It is incorrect to describe the current engine as necessarily copying an entire plain entity array on every update. The relevant native-conversion question is which callers need a bounded subset and how complete enumeration, ordering and changed-record tracking are represented after conversion.

### Dependencies and conservative fallbacks

`packages/domain/src/dependencies.ts`, inspected lines 1–170, already defines finite query families, value/membership/existence/geometry/definition dependencies, deadlines, semantic changes, and explicit incomplete query outcomes. Its bounded sensory change set has a conservative overflow path. A future influence/residency contract should extend these owners and account for fallback frequency. It should not build a second universal dependency graph or treat missing dependency information as proof of independence.

### Spatial query bins

`packages/domain/src/spatial.ts`, inspected lines 1–170, already contains a spatial candidate index with separate general and body-query bin sizes, maintained membership, selected-ID queries, conservative candidate extents and explicit result ordering. These bins optimize candidate discovery; they are not native authority cells, one-core assignments, or crowd capacity claims. Exact geometry and disclosure remain separate checks.

### Local avoidance is not evidence of a crowd solver

`packages/domain/src/local-avoidance.ts`, inspected lines 1–190, concerns a supported projectile-avoidance pose with body clearance and dependency handling. Its filename does not establish that an ORCA-style general crowd system is present. A dense-crowd design must inspect ordinary movement and occupancy callers rather than assume this file solves the problem.

### Storage preparation

`apps/server/src/world-records.ts`, inspected lines 1–150, includes partial-history owners and detached temporal-suffix packing outside simulation advancement. This is evidence of existing incremental storage preparation, not proof of complete mature-world scaling. Preserve these owners and measure their full lifecycle; do not replace them with periodic whole-world JSON snapshots.

### Scope of the kernel read

The inspected opening of `packages/domain/src/kernel.ts` identifies movement, perception, native-change, navigation, projectile and other owners. It does not constitute an audit of every advancement loop. Concrete algorithmic defects require tracing the relevant function and its callers before implementation.

## What remains a genuine design question

The inspected contracts provide many necessary pieces but do not establish a complete partially resident, independently evolving, 1,000–5,000-player world. The main unresolved integration questions are how those pieces compose when most geography is cold, many observers share an encounter, one interaction spans many cells, thousands of jobs wait on external services, and history grows for months.

Classify each proposal accordingly: preserve an accepted boundary; extend an existing mechanism; design an unconsumed capability; or measure an uncertain bottleneck. An unverified feature is not automatically missing, and an existing interface is not automatically qualified. The [needs-design briefs](../../docs/maintainers/decisions/mmorpg-engine-foundations.md) make that distinction explicit.
