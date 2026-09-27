# Native work and invalidation: limits and constraints

[Feature contract](../projects/dependency-invalidation-feature-spec.md) · [Implementation work](../maintainers/dependency-invalidation.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [work-budget.ts](../../packages/domain/src/work-budget.ts), [host-work.ts](../../apps/server/src/host-work.ts), [native-work.ts](../../packages/domain/src/native-work.ts).

## LA168

**Removed during spatial/cadence integration · Restrictiveness: — (superseded).**

The mandatory one-game-second integration step is removed. The host still wakes at 50 ms, while mechanics integrate boundary-limited elapsed prefixes and rendering uses device cadence. [NW12](#nw12) records the finite replacement bounds; [simulation time](../simulation-time.md) owns semantics.

## LA169

**Historical — needs recheck · Restrictiveness: Safe.**

The server yields after roughly 8 milliseconds of native simulation work before continuing accumulated work.

**Reason / tradeoff:** Keep opportunities for commands and network handling to run while the simulation catches up.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA170

**Historical — needs recheck · Restrictiveness: Safe.**

A gap longer than 2 seconds between server timer callbacks is treated as possible host suspension rather than normal elapsed play.

**Reason / tradeoff:** Keep an explicit suspended-time policy and ensure heavy processing is not incorrectly mistaken for the computer being asleep.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## NW01

**Reported · Restrictiveness: Medium.**

The **whole server process shares the same ceilings as one world**, across its world instances. No distributed budget coordinator. [Host accounting](../../apps/server/src/host-work.ts)

**Reason / tradeoff:** Contain one process’s aggregate work; this is not a distributed or per-world scaling guarantee.

## NW02

**Reported · Restrictiveness: Medium.**

Limits are hardcoded, versioned constants, without deployment configuration.

**Reason / tradeoff:** Version saved deterministic work contracts; operator overrides have not been qualified.

## NW03

**Reported · Restrictiveness: Medium.**

Memory accounting uses conservative estimates: generally serialized string length × 3; reservation overhead **256 bytes**; status-effect overhead **1,024 bytes**.

**Reason / tradeoff:** Conservative estimates bound retained state without expensive heap tracing; estimates can over-admit or over-reject.

## NW04

**Reported · Restrictiveness: Medium.**

Installation estimates multiply interface subscriptions/work by **every independently placed world entity**, potentially rejecting configurations before their actual workload reaches the ceiling.

**Reason / tradeoff:** Static upper bounds avoid missing possible subscribers; placed-entity multiplication can substantially overestimate actual use.

## NW05

**Reported · Restrictiveness: Medium.**

Each status-effect episode permits **1,024 evaluations per simulated second**. [Native accounting](../../packages/domain/src/native-work.ts)

**Reason / tradeoff:** Bound repeated native condition evaluation during elapsed simulation time.

## NW06

**Reported · Restrictiveness: Medium.**

Child work must retain its parent’s actor, definition and work family; it cannot declare independent recurrence.

**Reason / tradeoff:** Prevent children escaping parent accounting; independent recurrence needs its own admitted root.

## NW07

**Reported · Restrictiveness: Medium.**

Recurring work cannot renew its interval while children remain pending and **cannot accumulate unused catch-up credit**.

**Reason / tradeoff:** Avoid overlapping recurrence and unbounded catch-up bursts; missed credit is not accumulated.

## NW08

**Reported · Restrictiveness: Medium.**

Saved top-level work currently recognizes status effects and feeling records/processes; adding another durable process family requires code integration.

**Reason / tradeoff:** Only integrated process owners have durable resume/recovery contracts.

## NW09

**Reported · Restrictiveness: Medium.**

Required-work budget failure can **pause the entire world** rather than defer just that process.

**Reason / tradeoff:** Do not silently lose required effects; safe local backpressure needs explicit progress semantics.

## QU13

**Reported · Restrictiveness: Safe.**

Two audience-specific caches each retain **32 scopes**.

**Reason / tradeoff:** Bound audience-specific projection cache memory; eviction causes recomputation.

## QU14

**Reported · Restrictiveness: Safe.**

Change tracking retains **4,096 distinct scopes** before falling back to broader invalidation; draft-history lookup stops after **1,024 links** and falls back to full comparison. These affect performance, not result completeness.

**Reason / tradeoff:** Bound bookkeeping; broad invalidation/full comparison preserves completeness at higher cost.

## WB01

**Reported · Restrictiveness: Medium.**

Per-call/group native work. Output admission changed from 16,000,000 to 64,000,000 actual UTF-8 bytes: the valid dense first exposure otherwise refused complete witness output. Other counters are unchanged.

**Reason / tradeoff:** Versioned conservative admission bounds; no claim that these values establish supported population. Overruns refuse admission or pause required work.

[Implementation starting point](../../packages/domain/src/work-budget.ts).

| Counter            |    Ceiling |
| ------------------ | ---------: |
| Candidate visits   |  2,000,000 |
| Predicate checks   |  4,000,000 |
| Input bytes        | 64,000,000 |
| Output bytes       | 64,000,000 |
| Effects            |    100,000 |
| Resource claims    |    100,000 |
| Subscriptions      |    100,000 |
| Live allocations   |     65,536 |
| Queued allocations |     65,536 |
| Retained bytes     | 64,000,000 |
| Nested work depth  |         32 |

## WB02

**Reported · Restrictiveness: Medium.**

Aggregate retained allocations

**Reason / tradeoff:** Versioned conservative admission bounds; no claim that these values establish supported population. Overruns refuse admission or pause required work.

[Implementation starting point](../../packages/domain/src/work-budget.ts).

| Scope                  |   Live | Queued | Retained bytes | Subscriptions |
| ---------------------- | -----: | -----: | -------------: | ------------: |
| Actor                  |  2,048 |  4,096 |      4,000,000 |         8,192 |
| Definition/work family | 32,768 | 32,768 |     32,000,000 |        65,536 |
| World                  | 65,536 | 65,536 |     64,000,000 |       100,000 |

## PB12

**Reported · Restrictiveness: Safe.**

Dependency authority-scope string: **512 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## NW10

**Changed · Restrictiveness: Too liberal for the full release-speed gate.**

Exposure membership reuses correctly invalidated derived inputs. Native actor/ambient/exposure phases yield private progress; the server yields to I/O after roughly 8 ms between checkpoints while retaining the same writer and work meter. Individual operations and finalization remain indivisible. Group output is 64 MB measured as UTF-8; the prior 16 MB allowance rejected the release-sized first crowd exposure.

**Reason / tradeoff:** Preserve witnesses, order and atomic publication. No audience truncation or meter replenishment. A valid 100-person/50-animal/500-added-object first exposure emitted 65,903 events; later steps improved but the first step remains expensive. All physical state still resides in one process. [Evidence](../verification.md#immediate-gameplay-limits); [remaining C18](../maintainers/limits-audit.md#c18).

## NW11

**Changed · Restrictiveness: Safe.**

Pending world mutations: 256; pending operations per SQL read/write lane: 512; pending age: five seconds. Executing work is never cancelled. HTTP simultaneous handlers and projection queue depth: four times player capacity (default 400). Aggregate retained request bodies: 16 MiB, plus existing per-request limits. Publication coalesces for 50 ms and yields between viewers after roughly 8 ms. Overloaded disconnect cleanup retries after one second, bounded by admitted transports. Rejection is explicit `busy`/503 with Retry-After.

**Reason / tradeoff:** Bound queued closures and body memory while preserving atomic writes and durable receipts. Age/depth are overload protection, not an execution deadline. Optional publication retries may refresh later; uncertain mutations are not automatically replayed. [Owner](../performance.md#bounded-admission).

## NW12

**Current · Restrictiveness: Safe.**

A native advance accepts at most one game day, at most 4,096 intervals and at most 4,096 motion slices per call. A publication interval contains at most 32 motion slices; the server requests one interval and can stop earlier at a coherent slice boundary after its existing eight-millisecond batch budget. These are ceilings, not a latency guarantee. The bundled-world idle horizon is 60 game seconds; sight motion is limited to one metre or one quarter of a potentially interacting observer’s smaller positive non-hearing sense radius, using conservative reachable envelopes. Unsupported serial/coupled clamped rates retain a one-second fallback. A 0.000001-second numerical guard handles strict threshold departures; it is not a biological tick or a cure for a stuck boundary.

**Reason / tradeoff:** Bound work and sampled-perception error using finite native families. Private motion deadlines can reuse predictions and avoid repeated publication; continuous state still synchronizes globally at occurrences. The 32-slice ceiling bounds an offline caller that supplies no earlier stop request. Exact fleeting contact/LOS crossings, independent regional rates and pathological deadline qualification remain PF13.11/PF13.16. Main's contributions, reservation expiries and appraisal deadlines use their existing owners and budgets. [Base time policy](../worlds/base/time.md), [boundary catalogue](../maintainers/simulation-boundaries.md), [RP06](../maintainers/revisitable-policies.md#rp06--elapsed-time-fidelity-and-integration-limits).

## NW13

**Current — native-action integration source review, 2026-09-26 · Restrictiveness: Safe.**

Private visual acquisition batches flush after 128 records; contact acquisition cooperatively yields every 64 candidates. These are construction/yield sizes, not evidence or actor quotas. Finalization still seals owned records through the shared domain owner, and a single indivisible operation may exceed the host's yield target.

**Reason / tradeoff:** Reduce repeated allocation and permit I/O between coherent pieces of native work without discarding evidence. [Events](../../packages/domain/src/events.ts), [contacts](../../packages/domain/src/contact-acquisition.ts); broader incremental perception remains [EPR](../maintainers/events-perception-and-reactions.md).

## NW14

**Current — native-action integration source review, 2026-09-26 · Restrictiveness: Safe.**

Cognition and maintenance intake select at most 64 ready eligible actors before asynchronous schedule reads. Successful inspection rotates the ticket after dependency/generation validation; ineligible or incomplete spatial queries cannot occupy the thought batch. The refresh and eligibility scan still traverse the mind roster, so this is a database fan-out bound, not a total CPU bound.

**Reason / tradeoff:** Bound simultaneous preparation without losing wakeups or starving later eligible actors. [ActorWork](../../apps/server/src/actor-work.ts), [director](../../apps/server/src/ai-director.ts); [PF03](../maintainers/performance.md) retains broader scheduling qualification.
