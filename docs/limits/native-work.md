# Native work and invalidation: limits and constraints

[Feature contract](../projects/dependency-invalidation-feature-spec.md) · [Implementation work](../maintainers/dependency-invalidation.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [work-budget.ts](../../packages/domain/src/work-budget.ts), [host-work.ts](../../apps/server/src/host-work.ts), [native-work.ts](../../packages/domain/src/native-work.ts).

## LA168

**Historical — needs recheck · Restrictiveness: Safe.**

Native simulation advances in steps no larger than one game second, with the server timer normally running every 50 milliseconds.

**Reason / tradeoff:** Keep small deterministic simulation steps and measure timer frequency before changing the balance between responsiveness and processing cost.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

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

Per-call/group native work

**Reason / tradeoff:** Versioned conservative admission bounds; no claim that these values establish supported population. Overruns refuse admission or pause required work.

[Implementation starting point](../../packages/domain/src/work-budget.ts).

| Counter            |    Ceiling |
| ------------------ | ---------: |
| Candidate visits   |  2,000,000 |
| Predicate checks   |  4,000,000 |
| Input bytes        | 64,000,000 |
| Output bytes       | 16,000,000 |
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

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Dense physical and witness work lacks a per-phase slice bound.** All current physical entities live in one world process. updateEncounters builds spatial candidates from participating roots and traverses real nearby actors/objects; emitEvent processes each actual audience member. Spatial radius/index filters reduce sparse work but do not cap the number inside a dense region. No per-phase wall-time preemption exists. Native work meters bound charged effects/output and other declared work; they do not make every loop a bounded-time slice.

**Exposure / consequence:** Crowds, animals, placed objects and many real witnesses can cause long indivisible native steps during ordinary supported interactions. If required native work exceeds its admitted envelope, WorldService pauses publication/the world; do not describe this as a harmless warning.

**Reason / tradeoff:** Preserve real witnesses and deterministic outcomes. Use change-fed perception, measured admission/backpressure and resumable phases where semantics permit. Never silently trim the audience to meet a target.

**Evidence:** PF09 already records slow dense fixtures; this source review does not establish the exact population at which a work ceiling is hit. [Implementation](../../packages/domain/src/kernel.ts) (`updateEncounters; events.ts emitEvent; world-service.ts acceptRoutine/persist`). [Revisit C18](../maintainers/limits-audit.md#c18).

## NW11

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Serialized mutation and SQL lanes have no queue-depth admission cap.** WorldService.mutate and PostgreSQL/SQLite transaction lanes chain pending promises without a maximum queued count/bytes/age at those owners. One execution at a time bounds concurrency, not backlog. The HTTP activeWrites counter is used for restore exclusion, not general queue admission. Stream/connection caps and normal client behavior constrain some producers but are not a server-wide work-queue limit.

**Exposure / consequence:** Concurrent commands or inspection during slow native/SQL work can accumulate waiting operations, latency and memory. A PostgreSQL statement timeout starts during execution and does not cap time spent waiting for its lane.

**Reason / tradeoff:** Preserve ordered atomic mutations. Add measurable per-owner queue admission/backpressure and explicit overload responses; coalesce only operations whose semantics permit replacement.

**Evidence:** Code-level risk, not a measured saturation threshold. PF01/PF07 own queue attribution and admission design. [Implementation](../../apps/server/src/world-service.ts) (`mutate; postgres.ts serial/readTransaction; sqlite-database.ts run/readTransaction`). [Revisit C19](../maintainers/limits-audit.md#c19).
