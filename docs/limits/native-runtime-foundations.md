# Native runtime foundation constraints

[Feature](../projects/native-runtime-foundations-feature-spec.md) · [Technical design](../projects/native-runtime-foundations-tech-design.md) · [NRF work](../maintainers/native-runtime-foundations.md)

These are limits of the selected candidate designs and their experiments, not implemented population or fictional-world rules. Current NSC and underlying semantic owners retain their actual limits. Do not copy this inventory into runtime constants.

## NRF-L01 — Existing proof profile, not a new memory quota

Keep the before/after run's actual selected host transient allowance and independent resident/pending-save accounting unchanged. The inspected continuation uses 128 MiB; its complete qualification is unresolved. This restriction prevents gains manufactured by extra memory, dropped evidence or forced GC. A later explicitly changed profile must be pinned consistently for both arms; it does not retroactively qualify earlier failures. Reservation bounds and RSS remain separate measures.

## NRF-L02 — Scratch scope

S owns only the sequential temporary work of one synchronous JSON encoding operation. It cannot escape, retain sources, cross an await, reopen after close or fund output/transport bodies. This intentionally excludes general arenas and request-wide pooling whose overlapping lifetimes are different. Extend only for a separately traced real consumer and an isolated comparison; never suppress actual wrapper-header custody.

## NRF-L03 — Capture-sharing scope

P initially covers consecutive compatible embodied periodic SSE publications, not creator inspection, bootstrap, reconnect, command responses, different observers or different permission scopes. It shares raw facts, not complete views, tokens, deltas or disclosure leases. Preserve existing stream order. One current group is prepared at a time and no capture cache survives a publication pass. This contains memory lifetime, fairness and authorization risk; broader reuse needs its own complete key and consumer evidence.

## NRF-L04 — Parallel family and pool

R initially covers pure status-rate selection for the existing supported family. Effects, reductions, RNG, identity, reception and mutation remain ordered in their original owners. It uses only the existing bounded host pool and performs no blocking external work inside a range. These are execution boundaries, not claims that all other work is inherently serial. Another family requires a scoped safe decomposition and an isolated comparison.

Initial experimental scheduling uses one worker inline, fewer than twice the selected worker count inline, and at most four times that count in one prepared batch. These are reversible starting values to measure, not player/cell limits. No per-actor thread, second pool or permanent one-cell/one-core mapping is introduced.

## NRF-L05 — Evidence and adoption

Every uncertain performance mechanism is an isolated experiment. Freeze its criterion before measurement and retain failures. [Technical section 7.4](../projects/native-runtime-foundations-tech-design.md#74-candidate-decisions-and-overall-adoption) owns the candidate-specific criteria: J must reduce complete affected-consumer CPU beyond variation without meaningful regression; S/P's new lifetime machinery must earn at least 10% complete qualifying-workload CPU reduction or close a demonstrated binding resource failure with at most 5% additional complete CPU per work unit; R retains E2's 10% benefit/5% CPU bound and tiny-scene conditions. Actual current latency, correctness and resource gates remain required.

For the resource route, the candidate must complete the unchanged previously failing journey. Assess its CPU/regression guard on an additional matched journey that both control and candidate actually complete; a failed control's partial work is not the cost denominator. Without that matched cost evidence, the result remains inconclusive. This prevents a capacity success from concealing an unmeasured CPU or latency regression.

J cannot claim improvement from helper counts; S/P cannot free still-live allocations or omit inconvenient connections. Combined gains are measured, not added. Criteria may be deliberately revised before a new experiment with a stated rationale, never retrospectively to turn failure into acceptance. Rejected paths and unused scaffolding are removed. No compatibility switch remains to support an earlier codebase, and individual Native-to-Native gains do not replace overall NSC adoption.

## NRF-L06 — No new gameplay approximation or scale cap

No crowd-blindness switch, weakened defense, changed perception cadence, pushing rule, admission queue or 1,000/5,000-player guarantee is selected. Physical exclusion, recipient count and connected effects remain different dimensions. Compromises can be designed explicitly by their existing world/product owners; technical overload cannot silently invent them.

## NRF-L07 — No physical eviction without a complete consumer

Current cold-history support does not permit unloading arbitrary physical entities. A partial physical-region consumer must supply exact obligations/dependencies, coverage and activation before exposing absence-like lookups. Existing complete internal reads remain fast and synchronous. This avoids premature generic residency machinery while keeping the actual future extension boundary explicit.

## NRF-L08 — Existing identity, precision and lifecycle

Preserve logical world-scoped identity, slot generations, authoritative f64 units, exact current-format continuation and scoped permission/source checks. No legacy reader, origin-rebasing project or second seed-overlay engine is added. Future data/library changes must qualify their affected conversion, not reinterpret a numerical location or machine address as identity.
