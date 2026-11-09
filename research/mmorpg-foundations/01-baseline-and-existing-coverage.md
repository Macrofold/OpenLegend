# Baseline, prior discussions and existing coverage

## Evidence boundary

Baseline: `Macrofold/OpenLegend`, `codex/stealth-runtime-01-evidence`, commit `56e9ab35a1d6ac71ccce9cf97c0f76250a78e977`. Research branch: `codex/mmorpg-foundations-research-20261109`. The investigation used connected GitHub reads, retrievable prior-conversation context, Mike's supplied native-core summary and public primary sources. It sampled important current source boundaries; it was not a line-by-line audit of every gameplay family, SQL query, client consumer or hidden implementation checkout.

Read the [current architecture](../../docs/architecture.md) for installed behavior and [NSC](../../docs/maintainers/native-simulation-core.md) for the design/implementation boundary. At this baseline NSC says design complete and implementation not started. Mike separately reports implementation work on `codex/native-simulation-proof`; that branch could not be retrieved from the connected remote. Neither the baseline tracker nor the failed remote read establishes the state of that other workspace. No native implementation performance was independently measured here.

## What previous discussions actually contribute

Prior-context retrieval surfaced discussions about attention/world scaling, layered or calculated progression, continuing communities, crowded encounters, engine mechanisms and model-hosting requirements. It did not provide a complete searchable transcript archive or reliable direct links for every conversation. Therefore exact conversation titles, dates, document counts and claims that no AWS discussion existed are not treated as verified evidence.

The useful durable trail is much stronger:

| Discussion theme | Verified repository destination | What it establishes |
| --- | --- | --- |
| Persistent lives, absence, communities, attention and capacity | [Product scalability](../../docs/product-scalability/README.md) and [delivery](../../docs/maintainers/product-scalability.md) | Accepted product principles; multiple proposals and qualification scopes remain distinct |
| Regional loading, independent worlds, storage distribution and failure | [Earlier delivery/scale architecture](../../archive/07-technical-architecture/data-delivery-and-scale.md) | Foundational regional and world-scoping proposals existed before the native conversion; historical mechanisms and numeric examples are not all current contracts |
| Engine jobs, streaming, coordinate precision, replication and persistence | [Unreal/Unity collection](../unity-unreal-runtime/README.md), especially chapters 05–07 | Comparative mechanisms and explicit limits, not an adopted engine replacement |
| Recent representation costs, Rust proof, multicore and cells | [Native technical design](../../docs/projects/native-simulation-core-tech-design.md) and [NSC](../../docs/maintainers/native-simulation-core.md) | Concrete selected architecture and conditional experiments, including AWS arithmetic and comparisons |
| Triggered cognition, bounded queues, publication and data growth | [Scheduling](../../docs/performance/scheduling.md) and existing BK/PF owners | Significant work already has bounded/admitted owners; additional proposals must not recreate them |

In particular, the native technical design explicitly contains AWS instance examples, CPU accounting and MMO comparisons. An earlier conversational claim that no AWS/cloud work could be found was not a sufficient search result. Use the repository evidence, not that negative claim. The retrieved conversation summaries are discovery aids; they do not substitute for a source-backed status statement.

UEBS2 means *Ultimate Epic Battle Simulator 2*. Earlier crowd discussions are relevant as prompts about massive populations, not as proof of heavy autonomous cognition, persistent observer histories or multiplayer server capacity. This corpus does not make implementation claims about UEBS2 without primary evidence.

## The ambition that controls this research

The [product-scalability principles](../../docs/product-scalability/README.md) distinguish durable lives from continuously maximal intelligence, existence from attention, actual observation from deliberation, and stored identities from active minds. The selected calculated physical progression must preserve installed consequences; approximate physical outcomes are not a free overload mode. World-specific meanings remain under authored worlds. This matters more than importing another game's entity count.

Mike's newer seed-copy scenario adds an especially useful qualification axis: independently evolving worlds may share immutable starting material but not a mutable past. Treat roughly 1,000 players per world as a working target for investigation, not as a replacement for prior release/growth gates. First establish a compelling, responsive small world and preserve the interfaces that later allow its geography, population and lifetime to grow.

## Already designed: do not rediscover or duplicate

The [native design](../../docs/projects/native-simulation-core-tech-design.md) already covers the following foundations in considerable detail:

- Resident authoritative mutable state, semantic mutation owners, local generational handles, stable external IDs, deterministic order, retained RNG and exact current-format installation.
- Bounded bridge commands and captures; no whole-world TS mirror, per-field bridge traffic or arbitrary TypeScript policy call in a native hot loop.
- Private candidates, nested undo checkpoints, host-current authorization, partial response outcomes, protected durable acceptance and uncertain receipt resolution.
- Dirty/due/spatial selection before jobs, one bounded host compute pool, independent batches, deterministic contested effects, small jobs inline and explicit phase barriers.
- Captured changed-record saving, pending suffixes, SQL read overlays, cold personal-history coverage and correction/forgetting across delayed consumers.
- Spatial cells separate from cores, conservative influence overlap, one effect owner, coherent timing, fenced machine handoff and conditional adaptive placement.
- Complete smaller-pipeline comparison, whole supported-game conversion, actual consumer equivalence and full lifecycle cost rather than reduced Node-main-thread usage.

Those remain preservation and implementation obligations. A research checklist item does not reopen their design or create a second conversion queue. In particular, a new asynchronous executor must not bypass the candidate/acceptance boundary, and a new sparse-world API must not bypass the current personal-knowledge contract.

## Inspected source and what it does—and does not—prove

The following reads were source inspection, not runtime verification. Paths refer to the pinned baseline; line windows document the inspected scope rather than imply complete-file review.

| Source | Inspected scope | Observation | Limit |
| --- | --- | --- | --- |
| `packages/domain/src/entity-collection.ts` | Lines 1–180 | Exact keyed lookup and semantic order are separate; drafts have explicit access tracking; full enumeration is still an explicit collection-wide operation | This does not prove that every caller selects candidates efficiently; it disproves the assumption that all current entity lookup is linear |
| `packages/domain/src/identity-allocation.ts` | Complete file | Allocation proof is transition-local, world-aware, and restore preserves identity high-water | Does not prove all caches, database joins, provider jobs and transport tokens are fully world-scoped |
| `packages/domain/src/native-work.ts` | Lines 1–200 | Installed capabilities and status work already declare tests/effects/subscriptions/retained bytes and combine work admission | Do not propose a new generic quota framework; audit coverage and future fan-out against these existing owners |
| `apps/server/src/world-record-schema.ts` | Lines 1–190 | Canonical growing collections have record boundaries, actor ownership, index declarations, codecs and completeness metadata rather than one lifetime JSON history | Does not establish physical sharding, mature-world performance or every query's index shape |
| `apps/server/src/world-records.ts` | Lines 1–160 | Detached temporal suffixes are materialized through existing record changes and actual page ownership; immutable-cut encoding reuse already exists | Does not establish the cost of the entire writer, retention or cold restore |

Current architecture also documents bounded navigation/geometry workers, exact scoped observations and a technical navigation hold with retained time debt. Those are current contract observations, not fresh measurements. Whole-map navigation rebuilding is a documented present boundary; a general tiled, physically streamed world is not established by those workers. The new research does not claim that one sampled `entityValues` import is a performance defect or that every global traversal must be removed, including bounded installation and validation.

## Earlier scale notes are valuable, but not a second current authority

The archived [delivery/scale document](../../archive/07-technical-architecture/data-delivery-and-scale.md) already separates logical regions, storage partitions and machines; proposes bounded regional state, world-keyed records, stable references, due work, durability and migration; and warns that world sharding cannot solve a single tightly coupled encounter. Preserve that reasoning.

It also retains historical journal/adaptor and retention proposals. Do not reinstall a deleted journal, obsolete database adapter, fixed retention number or older durability policy simply because it appears there. Current native, save/load, scheduling, BK and production-data owners win for installed contracts. The actionable preparation is to reconcile incomplete regional/lifecycle contracts with those current owners, not to copy the archived architecture wholesale.

## Coverage classification

| Area | Classification at this research boundary |
| --- | --- |
| Resident Rust, multicore pool, candidate acceptance and current-format restore | Selected design; implementation must be checked on actual work branch |
| Same-world cells, distributed custody, adaptive placement | Selected staged design; conditional qualification, not immediate infrastructure |
| Complete numeric precision through future native/geometry/network paths | Targeted preparation/qualification needed before widespread layout commitments |
| Sparse physical residency, coverage-aware queries and topology-dependent preparation | Earlier proposal exists; complete supported physical contract not established by inspected native-history work |
| Independently seeded world lifecycle and namespace closure | Existing identity/creation/scale owners provide much; explicit end-to-end seed-copy preparation remains useful |
| Unattended service and advancement promises | Existing PS product/design decisions, not a technical permission to approximate |
| Queue bounds, scoped publication, personal retention and once-only effects | Significant existing contracts; combined capacity and failure coverage must be extended, not duplicated |
| Cloud fleet/database product selection | Deferred; public research identifies constraints, not a purchasing decision |

The focused [needs-design register](../../docs/maintainers/mmorpg-scalability-needs-design.md) owns the remaining preparation. Source access limits are preserved there so later designers first reconcile work already completed on another branch.
