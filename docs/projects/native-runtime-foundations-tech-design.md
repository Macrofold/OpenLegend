# Native runtime foundations: technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | Four scoped implementation experiments and preservation contracts are specified; runtime and adoption evidence remain open. | 2026-11-11 |

[Feature specification](native-runtime-foundations-feature-spec.md) · [Evidence and repertoire reconciliation](native-runtime-foundations-evidence-and-repertoire.md) · [NRF work](../maintainers/native-runtime-foundations.md) · [Constraints](../limits/native-runtime-foundations.md)

## 1. Integration contract and source baseline

Use `Macrofold/OpenLegend` at `d9544ae5d017e697bfcfe2a38c71bb8569ad14f6` as this design's inspection baseline, not as an instruction to discard newer implementation. Before changing a named owner, compare its current implementation and recorded NSC disposition against the evidence map. Reuse a satisfying implementation instead of reimplementing this description. Preserve the active proof's unfinished correctness/resource gates.

This document supplies narrow mechanisms beneath the existing [native-core architecture](native-simulation-core-tech-design.md). NSC owns the proof, already commissioned repairs, attribution and E2 acceptance. NRF owns these four candidate recipes and their disposition. One change, one implementation owner and one experiment record are sufficient even when both trackers link it.

Names introduced below are proposed private implementation names, not claims that those APIs already exist. Reuse an equivalent current helper when its lifetime and behavior match. Keep new helpers beside their first real consumer; no new package, service or generic execution language is required.

### 1.1 Existing boundaries that need no replacement

`state.rs::Point` already uses `f64`. `EntityStore` already separates durable string identity, semantic ordering and slot/generation handles. `SimulationState` separates physical, personal, received and temporal owners. `BodyIndex` already updates changed bodies with bounded accounting rather than recounting every body on a move. `StatusRead` already reads earned current values without settling them. The host already has one Rayon pool, a separate acceptance fence and consumer reservations. PostgreSQL reads already join accepted pending prefixes through `nativeScopedReadCut`.

Do not introduce new versions of those mechanisms. In particular, leave the repaired narrow movement read, one-definition preparation, selected-payload encoding and moved attention undo paths in the common baseline. Do not change the authored clock, sampling cadence, storage schedule, resource profile or model behavior to make an experiment pass.

### 1.2 Complete execution scopes, not cold checks everywhere

The current physical `EntityStore` represents the installed supported physical world, while historical inputs may be partial. Its existing `get`/`resolve` semantics remain unchanged. A missing item in a declared complete collection is still absent; the native port must not turn all existing getters into asynchronous reads or add a branch to every field access.

At a boundary admitting a genuinely partial collection, carry coverage through that collection's existing codec/query owner. Its result must distinguish available selected data, proved absence, and unavailable/incomplete preparation. An unavailable result may request a bounded existing SQL preparation or refuse/defer the operation; it must not fabricate an empty inventory, nonexistent person or negative observation. Prepare outside authoritative mutation, then check current relevant identities/source inputs before acceptance. Pure internal operators receive the complete input closure they require.

A future physical-region consumer must supply its region directory, dependency closure, exact continuing obligations and activation before it can install a partial physical store. Until then, do not evict physical entities as a cache optimization. Existing cold-history pages, metadata-only lookup and selected-source hydration remain the actual partial-residency implementation. This is a deliberate boundary decision, not an unfinished requirement to build continent streaming during NRF.

### 1.3 Identity, numbers and seed copies

Retain authoritative metres, Y-up XYZ and `f64` arithmetic, including existing JavaScript-equivalence primitives and current numerical tolerances. No narrowing to `f32` at bridge/storage boundaries, no grid-coordinate identity and no new coordinate rebase are selected. A later library that requires a local frame must convert at its spatial adapter and prove error/support behavior there; it cannot change stored positions or personal evidence. Existing representable-number and safe-ID checks remain at their owning boundaries.

Cache or preparation identity always includes the actual world installation/generation and relevant owner identity. Identical seed definitions do not make two worlds' mutable records, current knowledge or output tokens interchangeable. Use current world creation's definition pins, reviewed input and activation receipt; do not add a second seed manifest. Lazy physical generation and cross-world travel retain their own design scope. This task changes no save schema or persistent identifier.

### 1.4 Read, calculate, publish

The common pattern is to select bounded inputs, perform pure preparation, then publish through the existing semantic owner. A proposed optimization may reuse exact immutable inputs; it may not broaden grants or replace an acquired historical cut with today's facts. Stop/cancel, final permission checks, protected SQL publication and release of actual resources retain their current order.

Do not use one global world revision as the only validity key for every retained computation. Conversely, do not invent a narrower key without covering every input consumed by that product. For P the initial key is intentionally conservative; for R the inputs cannot mutate until the synchronous read phase joins. No new universal invalidation graph is introduced.

## 2. J: fuse native JSON shape preflight

### 2.1 Source and eligibility

Affected owner: `apps/server/src/native-consumer.ts`, specifically `jsonAncestorWorkspace`, `jsonInputStringUnits`, `measureNativeJson` and their existing callers. `packages/domain/src/records.ts::jsonByteLength` already calculates exact UTF-8 JSON size without allocating the output; native callers use `cache: false`. The encoder already selects the actual outgoing payload before calling `JSON.stringify`.

Activate J only when the existing NSC accounting/encoding attribution shows these repeated shape walks contribute material work in an actual player/NPC/bridge consumer. Finding two loops in source is a hypothesis, not a measured bottleneck. J does not change reservations, object ownership, encoding or protocol meaning.

### 2.2 Algorithm and contract

Replace the two private shape helpers with one `nativeJsonShape(value)` returning their two existing results: ancestor-workspace bound and input-string-unit count. Visit the same supported graph in the same enumeration order. At each node apply both original formulae; recurse once into each child and combine each result exactly as its old helper did. Preserve maxima versus sums, property-key contributions, separators, array handling and the actual recursive-stack bound. Do not substitute a guessed bytes-per-node rule.

Use one accumulator per recursive activation, not an allocated result object per node. The public result can be one fixed-size object. Repeated references are visited and counted as they were before; a new identity cache or seen-set would change accounting and add lifetime/lookup cost. This helper consumes only the existing admitted plain-data graphs. It does not add proxy/getter/toJSON support or a new repeated validation pass.

`measureNativeJson` uses that pair to reserve its existing measurement workspace, calls unchanged `jsonByteLength(value, { cache: false })`, computes the existing body/flattening bounds, then releases measurement ownership. The exact size calculation and standard `JSON.stringify` remain separate passes. Fusing them too would be another experiment with different risk and is not selected.

### 2.3 Implementation sequence

1. Pin the current helper formulae and select real captured inputs from the existing qualified consumer, including empty and large supported products. Compare the two old outputs with the new pair before changing callers.
2. Implement the single traversal in `native-consumer.ts`; update `measureNativeJson` only. Delete the two replaced helpers after affected callers use the new owner. No world or network interface changes.
3. Exercise the real encoder with and without prefix/suffix: exact bytes, escaping, non-ASCII and isolated UTF-16 units, numeric edge representations, optional absent fields, arrays and repeated immutable children. Preserve the existing supported-input domain; malformed foreign graphs are not a new product feature.
4. Verify genuine pre-serialization refusal, serializer failure cleanup and successful retry through existing callers. Output and borrowed source lifetimes must be identical to the baseline.
5. Run isolated J before/after qualification under section 7. Do not combine J with S or a changed workload. If rejected, remove the fused implementation and retain the original helpers with its measured disposition.

### 2.4 Cost and failure analysis

Expected saving: one structural traversal and its repeated property enumeration. Remaining costs: exact UTF-8 measurement, V8 serialization, buffer creation, native admission and consumers. J may lose through a more complex loop, recursion pressure or poor JIT behavior; helper timing alone cannot justify adoption. It must not start caching measurement metadata after the owning workspace ends or reinstate the rejected ordered installation encoder.

## 3. S: one operation-local scratch reservation

### 3.1 Source and eligibility

`RuntimeConsumer` in `native/simulation/src/runtime/consumer.rs` has a shared body reservation and an independently charged reference/header reservation. `release` clears the body; the actual wrapper header can remain until JavaScript collection. `ByteReservation::resize` and `split_off` already exist in `host/budget.rs`. Repeated `reserveConsumerBytes` creates new wrapper lifetimes even for sequential temporary work.

S is justified only if the existing owner attribution identifies material temporary-wrapper churn or retained released headers in a real encoding path. It is not a claimed solution to the recurring 128 MiB failures before that attribution. Never treat all residual bytes as dead headers or lower a bound merely because it looks conservative.

### 3.2 Narrow API and ownership

Add one private bridge class, provisionally `NativeJsonScratch`, through the existing runtime/bridge ownership modules. It owns one mutable `ByteReservation` for temporary body storage and one real wrapper-header reservation. Its operations are creation with zero body bytes, synchronous `resize(bytes)`, and terminal idempotent `close()`. It has no `retain`, decode, serialization, source-grant or mutation method. A closed object cannot resize or reopen.

Use checked nonnegative safe-integer input conversion at this bridge boundary. Growth calls the existing reservation's `resize` before allocation and preserves the previous reservation on refusal. Shrink occurs only after the previous temporary values are no longer owned by that phase. `close` drops body custody but the existing header accounting remains until the wrapper itself is destroyed. Finalization is cleanup, not the normal release protocol. Do not add manual GC, hide header bytes, transfer temporary custody to resident accounting, or pool released wrappers globally.

A private TypeScript helper owns the scratch for one synchronous `encodeNativeJson` operation and closes it in `finally`. The first integration covers only the sequential measurement and stringify workspaces of that encoder. The output `Buffer`, copied text, decoded graphs, source pins, asynchronous input borrows and socket buffers retain the existing independent `NativeWorldConsumer` ownership. The scratch object cannot be attached to an escaping product and must never survive an `await`.

### 3.3 Encoder state machine

```text
create scratch (header admitted; body = 0)
  -> resize to existing measurement bound
  -> measure exact bytes and all existing derived bounds
  -> end measurement-only temporary ownership
  -> resize scratch to existing stringify/flattening bound
  -> independently reserve actual output bytes
  -> allocate the output Buffer and stringify/write the selected payload
  -> attach the output's own reservation and required source pins
  -> end stringify temporary ownership
  -> close scratch in finally
```

Preserve the original semantic refusal-before-allocation guarantees. The order of independent output versus stringify reservations must remain the baseline order when it determines a visible/refusal outcome; implement the transition using the baseline encoder's current order rather than admitting output early as an unrelated optimization. During a transition, any still-live temporary from the earlier phase remains included in the new bound. Never replace overlapping requirements with their maximum unless the old phase has actually ended. Keep the baseline bound formulae unchanged in S.

Failure before output attachment releases its independent reservation and closes scratch. Failure after a product is returned leaves its output custody with the real consumer. A failed growth leaves the old scratch state valid for cleanup, not for proceeding with a smaller allowance. Existing asynchronous `withNativeJsonInput` keeps the output Buffer alive until the real native borrow settles, independently of the already-closed scratch.

### 3.4 Implementation and qualification

Implement the runtime owner using existing `ByteBudget`/`ByteReservation`, expose it through the existing bridge and regenerate declarations with the pinned toolchain. Add no new package or allocator. Replace only the two sequential temporary owners in the selected encoder; leave other consumers untouched. Use a serial before/after component with actual quota exhaustion at creation, measurement growth, encoding growth and output reservation, plus normal completion, thrown serialization and close twice. Every failed growth must preserve previous ownership, and use after close must refuse.

Through the actual HTTP/bridge caller, compare exact output, privacy/source refusal, held asynchronous output and final release. Record new wrapper count, still-live headers, reservations, ordinary GC/RSS and total CPU. A lower reservation number without a real lifecycle improvement is not a gain. S changes bookkeeping ownership, so it is measured separately from J even when both are eventually adopted.

Do not extend S to nested formatter arenas, whole-request pools or all provider work automatically. Such scopes have different overlapping and escaping lifetimes and need a concrete consuming design.

## 4. P: share only equivalent player captures

### 4.1 Source boundary

`NativePlayerCapture.capture` in `apps/server/src/native-player-capture.ts` acquires account/actor facts, actual event evidence and player-control geometry. Its `facts` packet contains self, perception, events and controls. `publishIfPermitted` subsequently obtains a fresh native disclosure lease. The complete formatter in `native-player-view.ts` also consumes profile, operational, control, narrator, asset and optional SQL state. `native-player-http.ts` retains each stream's previous view and transport ownership.

The initial P scope is periodic embodied SSE publication for two or more compatible ready streams. Initial GET, reconnect bootstrap, creator inspection, command response and unrelated player/NPC products stay on their existing route. Do not share encoded payloads or complete `GameView` objects across connections.

### 4.2 Group identity and lifetime

Use an exact tuple, not delimiter concatenation: runtime installation identity, world ID, timeline/generation, account ID, session ID and session revision, grant revision, actor ID, audience and event-window request. Definition/geometry installation identity is bound by the acquired capture and checked when reused. Group only the embodied audience. Different accounts, sessions, actors, grants, timelines, event windows or inspection audiences do not share.

Connection ID and control generation are deliberately excluded only from this raw-facts key. They remain in each recipient's ordinary `RequestScope`, currentness checks, control/input token construction, references and final view. Do not substitute the existing complete `scopeKey` or a command-recovery key for this new purpose without preserving those distinctions.

Use the publisher's existing stream collection and publication scheduling. During one periodic publication pass, select compatible ready streams in their existing order and handle one group at a time. Selection may use a small map of stream references/keys; it contains no world snapshots or decoded captures. There is at most one shared capture group being prepared by this publisher at a time. Do not prebuild captures for every actor or retain a cache across publication passes.

A private `SharedPlayerCapture` owns the real `NativePlayerCapture` and gives short-lived recipient borrows. It is not another native authority. The group and each in-progress projection hold explicit references. Last release calls the original capture's `release` exactly once; one recipient's failure or close releases only its borrow. Every resulting view retains its actual borrowed source allocations through existing `retainNativeSources`/consumer ownership. Clearing the group must not free memory still used by an older view or independently held socket output.

### 4.3 Publication sequence

1. Select a group of at least two ready compatible streams. A singleton takes the unchanged ordinary path, with no shared-capture allocation. Snapshot stream identities, not permissions; permissions will be rechecked.
2. Acquire one real capture through the service's existing accepted-boundary and geometry route. Do not call the native session directly from the stream publisher or hold a native read lock across SQL/provider waits.
3. For each selected stream in original order, pass a borrow to the existing player projector through a narrow internal capture-provider option. The default provider remains the ordinary capture owner. All other inputs, per-attempt definition preparation, optional reads, source binding and final operational checks follow the existing path.
4. Immediately before each recipient's actual output, obtain that recipient's current native publication lease and current operational permission checks. Select no output, patch or reset and encode only that selection inside the existing synchronous disclosure callback. Never reuse another recipient's lease, input/control token or previous view.
5. On capture-related staleness, retire the group for future reuse and route remaining recipients through the ordinary fresh-capture path. The original per-request retry/deadline policy remains the total bound; do not add a nested retry loop or resend a command. Permission refusal for one recipient does not revoke another's valid scope.
6. End the group after its pass or the existing publication budget is reached. A slow SQL/formatter recipient must not extend reuse into later publication passes. Subsequent recipients then use fresh captures under normal scheduling. Socket backpressure never waits inside the group or disclosure lease; its existing blocked/drop/drain behavior remains.
7. Release the group in `finally`, including canceled preparation and service shutdown. Keep independently retained recipient views and transport bytes until their actual owners finish. Reconnect starts from its own bounded baseline.

Do not publish an older captured sequence after a recipient has already accepted a newer sequence or changed epoch. Reuse the stream's current monotonic/reset checks. The shared capture's exact cut remains unchanged; unrelated native progress may occur while view construction awaits, just as today. Existing scoped currentness decides whether that evidence is still usable, and the publication-pass budget prevents an indefinitely old shared product. Sharing never freezes world time to force a cache hit.

### 4.4 Implementation boundaries

Factor capture acquisition and release ownership in `native-player-view.ts` without copying its formatter into a second shared variant. Introduce the small group owner beside `native-player-capture.ts`; pass it through `NativeWorldService.publishPlayer`'s existing projection route. Keep `NativePlayerCapture.publishIfPermitted` and Rust's `RuntimePlayerRead` as authority. The private injection point accepts a real capture borrow, not arbitrary caller-supplied facts or an authorization Boolean. No public protocol/API field changes are needed.

The initial design deliberately shares raw capture only. Sharing request-local definitions, private SQL selections, complete view formatting or encoded deltas is not bundled into P. Those products have different keys and lifetimes, and some already have caches. Remove any now-unused duplicate capture call, not the per-recipient checks around it.

### 4.5 Required comparisons and negative cases

Compare one normal stream, two same-session/same-actor streams, and two different observers. Keep actual movement, two conversations, autonomous reactions, background saves and accepted progress. Attribute captures, control geometry, decode bytes, live source pins, formatting and transport separately. One shared capture is a work-count assertion, not proof of lower CPU or memory.

Include control transfer between the equivalent tabs, one tab closing during preparation, one blocked transport, grant/session revocation during an awaited optional read, correction/forgetting, timeline replacement, changed event window and a fresh reconnect. Views must preserve distinct connection/control data and exact permitted private evidence; a foreign observer cannot join the group. A retained old view must remain correctly funded after group release. Any serialized disclosure occurs inside its own current lease.

P can lose by prolonging a large capture, increasing recipient wait, complicating release, grouping uncommon workloads or repeating stale preparation. Adopt only if the actual duplicate-connection workload improves materially, distinct/single-connection play does not regress beyond the selected tolerance, and the shared owner does not aggravate the binding resource limit. Unique players do not benefit automatically; do not extrapolate duplicate-tab savings to 5,000 players.

## 5. R: deterministic parallel status-rate preparation

### 5.1 Narrow first family

R is a concrete implementation candidate for NSC03/E2, not another multicore project. Its first consumer is `time/prediction.rs::MechanicalForecast::prepare_selected`, which currently calls `status/rates.rs::prepare_status_rates` for the selected ordered status participants. That function reads the immutable installed status policy, current entity/episode bindings and earned values, evaluates ordered predicates, and produces ordered rate/periodic selections.

`StatusRead::evaluate_with_charge` already separates pure evaluation from charging; its metered route charges one `Tests` unit per actually visited predicate, including short-circuit behavior. `WorkMeters` is candidate-owned, and rollback does not refund attempted work. Retain that meaning. This family does not need a universal dependency graph, a copied world, independent random streams or concurrently mutable actors.

Do not parallelize movement/clearance, source acquisition, personal observations, attribute accumulation, random draws, identity allocation or final mutation as part of R. Foreign-target reads are safe only because the whole phase observes one coherent immutable state; their later combined effects remain ordered. Unknown or unconverted family behavior keeps the ordinary serial refusal/fallback route.

### 5.2 Shared input and job plan

Extract the existing selection loop into one implementation that accepts a predicate-charge callback and a pre-admitted allocation owner. The serial wrapper calls the existing `WorkMeters::charge`; the parallel wrapper counts actual visited predicates locally. Reuse the exact predicate evaluator and field/current-value readers. Do not reimplement status arithmetic or bypass saved earned-value windows.

Create a bounded `RateReadBatch` over contiguous ordinals of the existing selected participant list. Each job names its original ordinal and stable handle/generation, its entity/active episode bindings, and its exact existing allocation bound. Its output is the same `StatusRateCapture` or an error plus actual attempted predicate count. Results occupy preassigned ordinal slots, never a completion-ordered concurrent collection.

Borrow the concrete immutable entity store, installed verified definitions/policy and current value window through the synchronous phase. Construct the existing `StatusRead` locally inside a worker; its trait-object reader need not cross threads. Require ordinary compiler-proved `Sync` for captured concrete references. Do not add `unsafe impl Send/Sync`, lock each field or clone a whole `SimulationState` to make the compiler accept the design. A non-thread-safe required dependency makes that family serial until a separate justified design exists.

Derive the maximum predicate visits for each installed condition from its finite syntax tree once with the existing compiled status-work preparation. Include all branches for the bound but preserve left-to-right short circuit in execution. For a batch, sum bounds only for the selected active rate/periodic operations; restrictions remain as in the existing loop. Use checked arithmetic. The concrete rate family's only new local meter is `Tests`; do not use saved `add_work` to combine operational meters, because its depth semantics differ.

### 5.3 Deterministic admission before dispatch

Before launching a batch, verify its maximum `Tests` demand fits the remaining allowance of every active enclosing meter. This is a permission to compute that bounded read phase, not charging unvisited predicates. No other code mutates those meters while the synchronous phase runs.

Reserve the complete additional batch storage before any worker starts: job/result slots, the same per-job output/scratch bounds the serial owner would retain, and bounded scheduling scratch. Use existing `ByteReservation::split_off` to assign job reservations in ordinal order. Workers cannot race to take capacity from the shared host budget for these outputs. Preserve the original output reservation formulae during this experiment; reducing those bounds or changing retained scratch is a separate change.

If the batch cannot be bounded, funded or admitted for parallel work, choose the existing serial path before dispatch. A failed optional parallel preflight must not turn a serially valid operation into a gameplay refusal. Drop its temporary plan and restore all unconsumed reservations before running serially; this is an execution strategy, not a second authoritative backend. Actual allocator failure or an invalid installed input still follows the ordinary error owner.

Initial experimental tuning: use at most the selected host worker count; keep fewer than twice that many selected subjects inline; limit a prepared batch to four times that count. These are CPU scheduling starting values, not world rules or player caps. With one worker, use the serial wrapper without parallel-plan allocation. Record any tuning change before its comparison, and retain a threshold only if tiny and large workloads justify it.

### 5.4 Execute in the existing pool

The bridge's `HostPool` already owns a fixed Rayon pool and outer job admission. Pass its configured range width through the existing native operation construction; direct production-library callers without that host context select inline execution. Add the existing workspace-pinned Rayon dependency to the simulation crate only if needed for this consumed family; never build a second pool or silently use the global pool.

Invoke bounded recursive `rayon::join` inside the existing host worker. Split contiguous job slices until there are at most the selected number of useful ranges; a leaf processes its jobs sequentially. `join` uses the active pool and permits the calling worker to participate. Unlike unrestricted `scope.spawn`, this design needs no heap-allocated task per actor. Official primary references: [Rayon 1.12 ThreadPool](https://docs.rs/rayon/1.12.0/rayon/struct.ThreadPool.html), [join](https://docs.rs/rayon/1.12.0/rayon/fn.join.html), and [scope](https://docs.rs/rayon/1.12.0/rayon/fn.scope.html).

Jobs perform finite CPU-only reads. No SQL, provider, Node callback, socket operation, sleep, blocking channel or reacquisition of the world mutex occurs inside them. The outer native operation retains the existing coherent mutation exclusion; workers borrow shared input only until the join completes. Other worlds still share the same bounded pool. Inner jobs do not create new external host jobs or per-cell pools.

Observe the existing cancellation flag at bounded job boundaries. A cancellation/panic joins or unwinds all started work before dropping shared input and reservations. Preserve the existing fatal-panic/poison policy; do not catch a corrupted calculation and publish a partial forecast. The batch size does not itself guarantee a wall-clock latency bound: measure the complete held phase, including preflight and all batches, against current coherent-return targets.

### 5.5 Ordered result and work accounting

After joining, account every predicate actually attempted, including work from a job that failed or ran before cancellation. The pre-admitted maximum makes successful aggregation fit the enclosing `Tests` allowances. Do not replenish a meter on rollback or silently ignore speculative read work. Keep actual diagnostic CPU separate from gameplay effects.

Inspect results in original participant order and preserve each definition/operation order within a result. A semantic error is reported from the first failing ordinal, not the first worker to finish. Expected quota-saturated or unsupported paths use the serial route before dispatch; catastrophic allocation/internal failures abort the candidate through its existing owner. Parallel failure can perform more pure reads than serial early exit; record that extra attempted work and preserve all authoritative state and refusal categories rather than claim identical failed-run cost.

Append successful intervals in source order. Run `AttributeRates::capture`, floating-point summation, threshold/deadline selection, subsequent journal writes, RNG and identity allocation through their original serial owners. Do not use a parallel floating reduction, unordered map iteration or per-worker RNG. Existing earlier-deadline/local-forecast refinements remain unchanged. A completed pure result grants no personal observation.

### 5.6 Implementation sequence and evidence

1. Confirm R is still needed under NSC03 and that its prerequisites are satisfied. Pin the actual supported participant/status family and the current proof profile.
2. Factor the pure selection and bound/charge callbacks while retaining serial execution. Compare old versus refactored serial behavior and total cost; reject a materially regressing refactor before parallel claims.
3. Add bounded job storage and deterministic preflight/splitting. Exercise inline, optional-preflight fallback, capacity refusal before mutation and cleanup without launching additional threads.
4. Connect the existing pool context and bounded `join`, then ordered result/actual-charge joining. Regenerate affected bridge declarations only if the real host interface changes. No new public command or save format is needed.
5. Compare one and multiple workers on identical inputs: ordinary tiny opening, actual crowded rate work and independent activity. Include predicate short circuit, absent optional values, foreign target reads, retained current-value windows, periodic entries, rejected candidate, cancellation and source-order preservation. Check full outcomes, saved records, IDs/RNG and continuation—not merely arrays of selected rates.
6. Apply NSC's existing E2 gate, including scheduling/preparation, memory traffic, Node and PostgreSQL work, tiny-scene behavior and actual resource limits. A fast phase with worse complete gameplay is rejected. If the family has too little material parallel work, report that result and remove the unsuccessful parallel path; do not expand to arbitrary mutable systems to force a success.

R's decision settles this candidate, not the theoretical limit of multicore execution. Any subsequent family needs a specific safe input/output and isolated comparison; this design grants no blanket conversion authorization.

## 6. Other research findings: exact disposition

**Participant/deadline scans:** `ParticipantPreparation` already creates shared ordered groups, and native continuation reuses preparation. Its construction and `sensory_bound` still visit selected populations. That is a concrete location to attribute, not proof that rebuilding dominates or that a new global index is required. Keep the existing prepared profiling owner. If measured recurring membership work is material, extend that owner with changed-ID/membership-specific reuse; do not create an additional always-maintained index in NRF. Preserve root order versus ICU order, time-dependent deadlines, rollback and conservative unknown dependencies.

**History/read preparation and SQL:** the current read-cut owner checks durable revision, accepted suffix and selected temporal overlays. Existing storage contracts already require indexed selection and overlay-before-limit semantics. Do not remove preflight transactions or use a later database view to reduce a query count. Material duplication goes through the current NSC read/SQL attribution and repair owner, not a new read cache selected here.

**Working sets and world copies:** section 1 closes the near-term boundary question. Actual physical eviction, exact background-family closure, bounded arrival and mature-region restoration remain the consuming PS/NSC designs. Shared immutable definition/asset data may be reused through existing ownership; independent mutable copies remain independent. No permanent overlay chain or lazy entity allocator is implemented now.

**Crowd physics and fidelity:** current support/clearance and ordered movement remain. The earlier occupancy/avoidance-versus-pushing comparison is preserved as a later DG18/spatial design candidate, not a current instruction to alter collisions. Do not create load-triggered blindness, weakened defense or invented memories. Computational partitioning is not gameplay separation.

**Memory allowance:** preserve the current proof's exact profile and independent resident/pending-save accounting. Full owner attribution and correctness/resource repair stay with NSC. No arbitrary reduction of evidence, extra allowance, forced GC or new general priority-budget system is selected to hide the failure.

## 7. Experiment sequence and adoption

### 7.1 Establish the control once

NRF01 consumes the existing NSC profiling and failure record. Use the latest integrated implementation for both arms, including accepted A/B/C repairs. Record source/build identities, addon, Node/toolchain, installed world definitions, input schedule, clock, actual participants, provider fixtures, publication/save policies and resource allowance. User-reported uncommitted work is context until its exact source/evidence is available.

Each candidate needs a bounded statement of why its targeted cost is material, which actual consumer exhibits it, and what will count as adoption. Missing attribution means not activated, not a speculative implementation mandate. A real correctness defect can be fixed under its existing owner without waiting for a speed ranking; do not mix that fix into an optimization comparison and infer causation.

J and S can be evaluated independently after their actual consumer is stable. P waits for the current reconnect/busy correctness work and the existing multi-connection attribution. R retains NSC03/E2's complete preceding-proof gate. Successful adoption of J is not a prerequisite for S, and neither is a prerequisite for useful multicore research. Integrate only separately accepted changes, then perform the focused combined check.

### 7.2 Required correctness

Use current owned fixtures and actual library/service/HTTP/SQL consumers under the verification policy. No new permanent test framework or blanket unit-suite mandate is created. A source helper comparison is useful but does not replace the named consuming journey. Preserve private-candidate isolation, actual pending-source refusal, current disclosure, deterministic effects, resource release and current-format continuation. Reuse unaffected prior evidence with exact scope.

For J/S check UTF-16 and serializer order, real preallocation refusal and independent output lifetime. For P check connection-specific controls, distinct observers and slow/closed/revoked consumers. For R check exact ordered successful work, serial quota fallback, failed-candidate state and all started-job cleanup. These targeted boundaries supplement, not replace, the existing complete proof.

### 7.3 Required measurements

All speed measurements use the authorized managed AWS procedure and current standard worker; no local timing or GitHub Actions. Reuse the existing campaign runner and cost counters. Freeze the before/after source with only the selected candidate changed. Use the existing three-run interleaved independent-database comparison and actual clean-work requirements. Diagnostic instrumentation runs separately from clean timing.

Record application/native/worker/client CPU and exclusive database CPU per completed work, actual game-time progress/debt, response and first-useful-view tails, pause/held-phase time, actual SQL calls/rows/bytes, wire output, native reservations and process/RSS behavior. Separate released headers awaiting ordinary GC from still-live bodies and unknown bytes. Source-control, Native-control and candidate are distinct denominators. Retain every failed attempt; no successful-only average establishes a full pass.

For J/S preserve the actual ordinary two-conversation/movement/save journey. For P add the scoped equivalent/distinct connection cases without removing their ordinary work. For R add a bounded supported rate workload sufficient to expose parallel work, then the original tiny case; a fixture of pure status reads is phase evidence only. Increased population, duration or optional diagnostic coverage must fit the existing authorized resource and spending bounds.

### 7.4 Adoption and removal

Use the current NSC criteria rather than invent a weaker gate: meaningful complete-path CPU/response benefit beyond variation, or removal of a demonstrated binding resource limit without an unacceptable cost/latency regression. The existing E1 CPU criterion is at least 10% lower median complete CPU per completed workload with consistent pairs; E2 requires at least 10% throughput/completion-tail benefit with at most 5% additional CPU per work unit and no tiny-scene regression beyond variation. A resource-motivated J/S/P acceptance must name the previously failing supported journey, show it now completes, and still meet the current responsiveness and resource criteria. A lower helper count alone is insufficient.

Record adopt, reject, inconclusive or not activated with the exact evidence. Inconclusive does not authorize broad rollout. Remove a rejected trial, temporary switch and unused helper; retain useful evidence in the existing owner. Keep a serial inline strategy when it is an intentional part of the adopted parallel algorithm, not as an old-engine compatibility backend. No retained benchmark-only public API or parallel authoritative representation is allowed.

After combining adopted changes, run the smallest complete affected journey and actual combined cost/resource comparison needed to detect lifetime interactions. Do not sum isolated percentage gains. Reconcile the native coverage inventory, relevant limits, current behavior and task dispositions. Broader 1,000–5,000-player, mature-world, multiplayer and enjoyment qualification remains with PF/PS/PT/PD and the first-playable owners.

## 8. Delivery boundaries and open questions

The selected experiments require no new product ruling. Their eligibility, measured benefit and resource behavior are open empirical results, not unspecified algorithms. Their implementations must not silently alter pushing, sensing fidelity, unattended service or player admission to obtain a pass.

The technical design is complete only for the four named candidates and the preservation decisions in section 1. General physical streaming, a new crowd-behavior family, alternative clock policy and distributed persistence are not claimed designed by this document. The [research handoff](../maintainers/decisions/mmorpg-engine-foundations.md) preserves those residual scopes with their existing owners.

## Maintained records

- Player/world requirements: [feature specification](native-runtime-foundations-feature-spec.md).
- Implementation sequence and dispositions: [NRF tracker](../maintainers/native-runtime-foundations.md).
- Restrictions, reasons and removal triggers: [NRF constraints](../limits/native-runtime-foundations.md).
- Inspected source, owner report and all-catalogue scope map: [evidence and repertoire reconciliation](native-runtime-foundations-evidence-and-repertoire.md).
- Existing architecture/proof: [native-core technical design](native-simulation-core-tech-design.md) and [NSC](../maintainers/native-simulation-core.md).
