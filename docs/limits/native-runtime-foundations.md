# Native runtime foundation constraints

[Feature](../projects/native-runtime-foundations-feature-spec.md) · [Technical design](../projects/native-runtime-foundations-tech-design.md) · [NRF work](../maintainers/native-runtime-foundations.md)

These are limits of the selected candidate designs and their experiments, not implemented population or fictional-world rules. Current NSC and underlying semantic owners retain their actual limits. Do not copy this inventory into runtime constants.

## NRF-L01 — Existing proof profile, not a new memory quota

Keep the before/after run's actual selected host transient allowance and independent resident/pending-save accounting unchanged. The inspected continuation uses 128 MiB; its complete qualification is unresolved. This restriction prevents gains manufactured by extra memory, dropped evidence or forced GC. A later explicitly changed profile must be pinned consistently for both arms; it does not retroactively qualify earlier failures. Reservation bounds and RSS remain separate measures.

## NRF-L02 — Scratch scope

S owns only the sequential temporary work of one synchronous JSON encoding operation. It cannot escape, retain sources, cross an await, reopen after close or fund output/transport bodies. This intentionally excludes general arenas and request-wide pooling whose overlapping lifetimes are different. Extend only for a separately traced real consumer and an isolated comparison; never suppress actual wrapper-header custody.

## NRF-L03 — Capture-sharing scope

P initially covers compatible embodied periodic SSE publications, not creator inspection, bootstrap, reconnect, command responses, different observers or different permission scopes. It shares raw facts, not complete views, tokens, deltas or disclosure leases. One current group is prepared at a time and no capture cache survives a publication pass. The restriction contains memory lifetime and authorization risk; broader reuse needs its own complete key and consumer evidence.

## NRF-L04 — Parallel family and pool

R initially covers pure status-rate selection for the existing supported family. Effects, reductions, RNG, identity, reception and mutation remain ordered in their original owners. It uses only the existing bounded host pool and performs no blocking external work inside a range. These are execution boundaries, not claims that all other work is inherently serial. Another family requires a scoped safe decomposition and an isolated comparison.

Initial experimental scheduling uses one worker inline, fewer than twice the selected worker count inline, and at most four times that count in one prepared batch. These are reversible starting values to measure, not player/cell limits. No per-actor thread, second pool or permanent one-cell/one-core mapping is introduced.

## NRF-L05 — Evidence and adoption

Every uncertain performance mechanism is an isolated experiment. Freeze its criterion before measurement and retain failures. J cannot claim improvement from helper counts alone; S/P cannot claim improvement by freeing still-live allocations or excluding inconvenient connections. R retains NSC's E2 criteria. Combined gains are measured rather than added arithmetically. Rejected variants and unused scaffolding are removed; no compatibility switch remains to support an earlier codebase.

## NRF-L06 — No new gameplay approximation or scale cap

No crowd-blindness switch, weakened defense, changed perception cadence, pushing rule, admission queue or 1,000/5,000-player guarantee is selected. Physical exclusion, recipient count and connected effects remain different dimensions. Compromises can be designed explicitly by their existing world/product owners; technical overload cannot silently invent them.

## NRF-L07 — No physical eviction without a complete consumer

Current cold-history support does not permit unloading arbitrary physical entities. A partial physical-region consumer must supply exact obligations/dependencies, coverage and activation before exposing absence-like lookups. Existing complete internal reads remain fast and synchronous. This avoids premature generic residency machinery while keeping the actual future extension boundary explicit.

## NRF-L08 — Existing identity, precision and lifecycle

Preserve logical world-scoped identity, slot generations, authoritative f64 units, exact current-format continuation and scoped permission/source checks. No legacy reader, origin-rebasing project or second seed-overlay engine is added. Future data/library changes must qualify their affected conversion, not reinterpret a numerical location or machine address as identity.
