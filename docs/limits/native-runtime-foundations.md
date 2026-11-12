# Native runtime foundation constraints

[Feature](../projects/native-runtime-foundations-feature-spec.md) · [Technical design](../projects/native-runtime-foundations-tech-design.md) · [NRF work](../maintainers/native-runtime-foundations.md)

These are limits of the selected candidate designs and their experiments, not implemented population or fictional-world rules. Current NSC and underlying semantic owners retain their actual limits. Do not copy this inventory into runtime constants.

## NRF-L01 — Existing proof profile, not a new memory quota

Keep the before/after run's actual selected host transient allowance and independent resident/pending-save accounting unchanged. The inspected continuation uses 128 MiB; its complete qualification is unresolved. This restriction prevents gains manufactured by extra memory, dropped evidence or forced GC. A later explicitly changed profile must be pinned consistently for both arms; it does not retroactively qualify earlier failures. Reservation bounds and RSS remain separate measures.

## NRF-L02 — Scratch scope

S owns only the sequential temporary work of one synchronous JSON encoding operation. It cannot escape, retain sources, cross an await, reopen after close or fund output/transport bodies. This intentionally excludes general arenas and request-wide pooling whose overlapping lifetimes are different. Extend only for a separately traced real consumer and an isolated comparison; never suppress actual wrapper-header custody. Count additional native-boundary calls as well as avoided wrappers.

## NRF-L03 — Capture-sharing scope

P initially covers consecutive compatible embodied periodic SSE publications, not creator inspection, bootstrap, reconnect, command responses, different observers or different permission scopes. It shares raw facts, not complete views, tokens, deltas or disclosure leases. Preserve existing stream order. One current group is prepared at a time and no capture cache survives a publication pass. This contains memory lifetime, fairness and authorization risk; broader reuse needs its own complete key and consumer evidence.

The group also binds the native handle, generation and accepted cut at acquisition. Reuse and final shared publication require that same cut; changed progress retires reuse rather than attaching a newer host revision to old facts. Use existing service scalar progress, not a fresh full capture or SQL lookup. This optimization-only restriction leaves ordinary scoped disclosure unchanged. Its lost hits and group bookkeeping count in P's cost.

P's reuse budget is the current pass's existing `nextPublicationAt` in `native-player-http.ts::schedule` (currently set from the monotonic clock plus 50 ms), not an existing hard pass timeout. Before creating a shared group and before lending it to another recipient, compare the current monotonic clock with that captured cutoff. At or beyond it, stop group reuse and serve remaining recipients through the ordinary fresh-capture path in original order. Do not refresh the cutoff for each group, add a timer, cancel an active recipient or shorten its original operation deadline. An active borrow and its independently retained output remain funded until their actual consumers finish; the cutoff bounds new reuse, not total response lifetime. Final source/permission checks still decide whether any output may be disclosed. A changed publisher cadence changes this derived cutoff, not a fictional-world rule.

## NRF-L04 — Parallel family and pool

R initially covers pure status-rate selection for the existing supported family. Effects, reductions, RNG, identity, reception and mutation remain ordered in their original owners. It uses only the existing bounded host pool and performs no blocking external work inside a range. These are execution boundaries, not claims that all other work is inherently serial. Another family requires a scoped safe decomposition and isolated comparison.

Initial experimental scheduling uses one worker inline, fewer than twice the selected worker count inline, and at most four times that count in one prepared batch. These are reversible starting values to measure, not player/cell limits. No per-actor thread, second pool or permanent one-cell/one-core mapping is introduced.

Before borrowed-state joins, R0 permits only one runnable outer bridge call per world. Waiting calls share the existing host outstanding limit and keep their input/byte ownership outside the compute pool; inner rate jobs do not reacquire it. No independently admitted queue or busy/retry loop is added. This prevents same-world lock reentry through Rayon's work stealing. [Technical section 5.4](../projects/native-runtime-foundations-tech-design.md#54-use-the-existing-host-pool-safely) owns dispatch, completion and shutdown. R0 remains separately measured prerequisite work, not an assertion of current delivery.

## NRF-L05 — Evidence and adoption

Every uncertain performance mechanism is an isolated experiment. Freeze its criterion before measurement and retain failures:

- **J:** reproducibly lower complete affected-consumer CPU beyond repeat variation, without meaningful response/resource regression. Its small helper consolidation does not need the overall Rust-adoption improvement threshold.
- **S/P:** at least 10% lower median complete qualifying-workload CPU, consistently beyond repeat variation, or closure of a previously demonstrated binding resource failure under the unchanged profile. Select the route before timing. The resource route allows at most 5% additional complete CPU per work unit and retains current latency gates. Neither route accepts single/distinct-client or tiny-scene regression beyond variation.
- **R:** existing E2's at least 10% throughput/completion-tail benefit, at most 5% additional complete CPU per work unit and no tiny-scene regression beyond variation. Compare serial extraction, R0 dispatch and R1 parallelism independently, then the entire candidate against its original baseline. Prerequisite overhead is included, not hidden by comparing only post-R0 kernels.

Actual current correctness, latency and resource gates remain required. For the resource route, complete the unchanged previously failing journey and assess CPU/regression guards on an additional matched journey both control and candidate actually complete; a failed control's partial work is not a denominator. Without matched cost evidence the result is inconclusive. Live-model quality, fixture correctness and human enjoyment are distinct evidence.

[Technical section 7.2](../projects/native-runtime-foundations-tech-design.md#72-required-correctness) requires the actual cognition-boundary differential case for affected encoding/scheduling consumers. Preserve required evidence, prompt/schema/reference meaning and admitted reply effects; a different stochastic response is not itself a deterministic correctness comparison. No optimization may qualify by quietly reducing context, dropping a reply or retuning behavior.

J cannot claim improvement from helper counts; S/P cannot free still-live allocations or omit inconvenient connections. Combined gains are measured, not added. Criteria may be deliberately revised before a new experiment with a stated rationale, never retrospectively to turn failure into acceptance. Rejected paths and unused scaffolding are removed, including R-only dispatch work unless independently justified. No compatibility switch remains to support an earlier codebase; Native-to-Native gains do not replace overall NSC adoption.

## NRF-L06 — No new gameplay approximation or scale cap

No crowd-blindness switch, weakened defense, changed perception cadence, pushing rule, admission queue or 1,000/5,000-player guarantee is selected. Physical exclusion, recipient count and connected effects remain different dimensions. Compromises can be designed explicitly by their existing world/product owners; technical overload cannot silently invent them.

## NRF-L07 — No physical eviction without a complete consumer

Current cold-history support does not permit unloading arbitrary physical entities. A partial physical-region consumer must supply exact obligations/dependencies, coverage and activation before exposing absence-like lookups. Existing complete internal reads remain fast and synchronous. This avoids premature generic residency machinery while keeping the actual future extension boundary explicit.

## NRF-L08 — Existing identity, precision and lifecycle

Preserve logical world-scoped identity, slot generations, authoritative f64 units, exact current-format continuation and scoped permission/source checks. No legacy reader, origin-rebasing project or second seed-overlay engine is added. Future data/library changes must qualify their affected conversion, not reinterpret a numerical location or machine address as identity.
