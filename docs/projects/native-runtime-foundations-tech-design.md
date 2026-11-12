# Native runtime foundations: technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | Four scoped experiments specify implementation, dispatch safety and isolated regression comparisons; runtime adoption remains open. | 2026-11-12 |

[Feature specification](native-runtime-foundations-feature-spec.md) · [Evidence and repertoire reconciliation](native-runtime-foundations-evidence-and-repertoire.md) · [NRF work](../maintainers/native-runtime-foundations.md) · [Constraints](../limits/native-runtime-foundations.md)

## 1. Integration contract and source baseline

Use `Macrofold/OpenLegend` at `d9544ae5d017e697bfcfe2a38c71bb8569ad14f6` as this design's inspection baseline, not as an instruction to discard newer implementation. Before changing a named owner, compare its current implementation and recorded NSC disposition against the evidence map. Reuse a satisfying implementation instead of reimplementing this description. Preserve the active proof's unfinished correctness/resource gates.

This document supplies narrow mechanisms beneath the existing [native-core architecture](native-simulation-core-tech-design.md). NSC owns the proof, already commissioned repairs, attribution and E2 acceptance. NRF owns these four candidate recipes and their disposition. If the current implementer selects one during the already authorized repair work, use this recipe there; do not create a second implementation or campaign. One change, one owner and one experiment record are sufficient even when both trackers link it.

Names introduced below are proposed private implementation names, not claims that those APIs already exist. Reuse an equivalent current helper when its lifetime and behavior match. Keep helpers beside their first real consumer; no new package, service or generic execution language is required.

### 1.1 Existing boundaries that need no replacement

`state.rs::Point` already uses `f64`. `EntityStore` already separates durable string identity, semantic ordering and slot/generation handles. `SimulationState` separates physical, personal, received and temporal owners. `BodyIndex` already updates changed bodies with bounded accounting rather than recounting every body on a move. `StatusRead` already reads earned current values without settling them. The host already has one Rayon pool, a separate acceptance fence and consumer reservations. PostgreSQL reads already join accepted pending prefixes through `nativeScopedReadCut`.

`NativeDefinitionCapture` already captures and freezes immutable installed definitions for one native installation. Per-attempt player projection is a different operation; do not mistake its remaining cost for an absent installation cache. `AcceptedAdvanceContinuation` already carries actual accepted forecast/group preparation across a matching cut and explicitly rebinds the fresh journal. A second broad preparation cache could duplicate or weaken that mechanism.

Leave the repaired narrow movement read, one-definition preparation, selected-payload encoding and moved attention undo paths in the common baseline. Do not change the authored clock, sampling cadence, storage schedule, resource profile or model behavior to make an experiment pass.

### 1.2 Complete execution scopes, not cold checks everywhere

The current physical `EntityStore` represents the installed supported physical world, while historical inputs may be partial. Its existing `get`/`resolve` semantics remain unchanged. A missing item in a declared complete collection is still absent; the native port must not turn all existing getters into asynchronous reads or add a branch to every field access.

At a boundary admitting a genuinely partial collection, carry coverage through that collection's existing codec/query owner. Its result must distinguish available selected data, proved absence, and unavailable/incomplete preparation. An unavailable result may request a bounded existing SQL preparation or refuse/defer the operation; it must not fabricate an empty inventory, nonexistent person or negative observation. Prepare outside authoritative mutation, then check current relevant identities/source inputs before acceptance. Pure internal operators receive the complete input closure they require.

A future physical-region consumer must supply its region directory, dependency closure, exact continuing obligations and activation before it can install a partial physical store. Until then, do not evict physical entities as a cache optimization. Existing cold-history pages, metadata-only lookup and selected-source hydration remain the actual partial-residency implementation. This is a deliberate boundary decision, not a requirement to build continent streaming during NRF.

### 1.3 Identity, numbers and seed copies

Retain authoritative metres, Y-up XYZ and `f64` arithmetic, including existing JavaScript-equivalence primitives and current numerical tolerances. No narrowing to `f32` at bridge/storage boundaries, no grid-coordinate identity and no new coordinate rebase are selected. A later library requiring a local frame converts at its spatial adapter and proves error/support behavior there; it cannot change stored positions or personal evidence. Existing representable-number and safe-ID checks remain at their owning boundaries.

Cache or preparation identity includes the actual world installation/generation and relevant owner identity. Identical seed definitions do not make two worlds' mutable records, current knowledge or output tokens interchangeable. Use current world creation's definition pins, reviewed input and activation receipt; do not add a second seed manifest. Lazy physical generation and cross-world travel retain their own scope. This task changes no save schema or persistent identifier.

### 1.4 Read, calculate, publish

Select bounded inputs, perform pure preparation, then publish through the existing semantic owner. Reusing exact immutable inputs does not broaden grants or replace an acquired historical cut with today's facts. Stop/cancel, final permission checks, protected SQL publication and release of actual resources retain their current order.

Do not use one global world revision as the only validity key for every retained computation. Conversely, do not invent a narrower key without covering every consumed input. P deliberately permits new sharing only within one accepted cut; that conservative optimization guard does not replace scoped disclosure checks or invalidate ordinary captures on unrelated progress. R's inputs cannot mutate until its synchronous read phase joins. No universal invalidation graph is introduced.

## 2. J: fuse native JSON shape preflight

### 2.1 Source and eligibility

Affected owner: `apps/server/src/native-consumer.ts`, specifically `jsonAncestorWorkspace`, `jsonInputStringUnits`, `measureNativeJson` and existing callers. `packages/domain/src/records.ts::jsonByteLength` calculates exact UTF-8 JSON size without allocating output; native callers use `cache: false`. The encoder already selects the actual outgoing payload before `JSON.stringify`.

Activate J only when existing NSC accounting/encoding attribution shows these repeated shape walks contribute material work in an actual consumer. Two loops in source establish a hypothesis, not a bottleneck. J changes neither reservations nor encoding/protocol meaning.

### 2.2 Algorithm and contract

Replace the two private shape helpers with one `nativeJsonShape(value)` returning their existing ancestor-workspace bound and input-string-unit count. Visit the same supported graph in the same enumeration order. At each node apply both original formulae; recurse once into each child and combine each result exactly as its old helper did. Ancestor workspace uses the maximum child workspace, while string units sum all child contributions. Include own enumerable property keys even when their values are undefined; visit every array position as the original helpers do. Exact wire-size omission/escaping rules remain with `jsonByteLength`, not this structural walk.

Use scalar accumulators, not an allocated result object per node; the public result is one fixed-size pair. A closure can accumulate string units while recursion returns the existing workspace value. Repeated references are visited as before. No identity cache, seen-set, proxy/getter/toJSON expansion or repeated validation pass is added to the trusted plain-data path.

`measureNativeJson` reserves its existing measurement workspace from that pair, calls unchanged `jsonByteLength(value, { cache: false })`, computes the current body/flattening bounds, and releases measurement ownership. Exact size and standard serialization remain separate passes. Fusing them too is a different experiment and is not selected.

### 2.3 Implementation sequence

1. Pin the current formulae and real captured inputs, including empty and large supported products. Compare both old outputs with the new pair before changing callers.
2. Implement the traversal and update `measureNativeJson` only. Delete replaced helpers after callers use the new owner; no world/network interface changes.
3. Exercise the real encoder with prefix/suffix, exact bytes, escaping, non-ASCII and isolated UTF-16, numeric edge representations, optional fields, arrays and repeated immutable children. Preserve the existing supported-input domain.
4. Verify genuine pre-serialization refusal, serializer failure cleanup, explicit retry and independently held output through actual callers, including the cognition-boundary comparison in section 7.2.
5. Run isolated J qualification under section 7, separately from S. Remove the candidate on rejection and retain its measured disposition.

Expected saving is one structural traversal and repeated property enumeration. Exact measurement, V8 serialization, buffers and consumers remain. More complex branching or recursion can lose; helper timing alone does not justify adoption. Never reinstate the rejected ordered installation encoder or a persistent measurement cache through J.

## 3. S: one operation-local scratch reservation

### 3.1 Source and eligibility

`RuntimeConsumer` in `native/simulation/src/runtime/consumer.rs` has a shared body reservation and an independently charged reference/header reservation. `release` clears the body; the wrapper header can remain until JavaScript collection. `ByteReservation::resize`, `split_off` and `merge` already exist in `host/budget.rs`. Sequential temporary reservations currently create distinct wrapper lifetimes.

S activates only if existing attribution identifies material temporary-wrapper churn or released-header retention in an actual encoding path. It is not an assumed solution to 128 MiB exhaustion. Unknown residual bytes remain unknown; do not lower a bound because it looks conservative.

### 3.2 Narrow API and ownership

Add a private `NativeJsonScratch` bridge class through existing runtime/bridge ownership modules, created by `NativeWorld.reserveJsonScratch()`. It owns one mutable temporary `ByteReservation` and its actual wrapper/header reservation. Operations are creation with zero body bytes, synchronous `resize(bytes)`, and terminal idempotent `close()`. It has no retain, decode, source-grant, output attachment or mutation method. A closed object cannot resize or reopen.

Use the current bridge's checked safe-integer byte conversion. Fund the new owner's actual fixed carrier/header through the existing accounting method, including its real added fields; do not reuse an undersized constant by assumption. Growth uses `ByteReservation::resize` before allocation and leaves the old reservation unchanged on refusal. Shrink follows actual end of the old temporary ownership. Close releases body custody; actual wrapper/header custody lasts to destruction. Creation/growth follows the existing live-host admission boundary; cleanup remains permitted after shutdown starts. No world lock or permission read is needed merely to release capacity.

A private TypeScript helper owns scratch for one synchronous `encodeNativeJson` and closes it in `finally`. Initial scope is only its sequential measurement and stringify workspaces. Output Buffer/text/decoded graphs, source pins, asynchronous input borrows and socket buffers keep independent existing consumer ownership. Scratch cannot fund an escaping product or cross an await. No global pool, nested arena, manual GC or accounting reclassification is introduced.

### 3.3 Encoder state machine

```text
create scratch (header admitted; body = 0)
  -> resize to the existing measurement bound
  -> calculate exact bytes and current derived bounds
  -> end measurement-only temporaries; resize scratch to zero body bytes
  -> independently reserve output bytes, in the baseline's existing order
  -> resize scratch to the existing stringify/flattening workspace bound
  -> allocate output Buffer, stringify and write the selected payload
  -> attach output's own reservation and required source pins
  -> end stringify temporaries; close scratch in finally
```

The measurement result's scalar fields do not keep its traversal workspace alive. The input graph keeps its original independent owner. Where an actual temporary overlaps phases, retain its charge until that overlap ends; do not replace overlapping bounds with their maximum. Preserve existing formulae and output-before-stringify reservation order so optional refactoring does not change the refusal boundary.

Failure before output attachment releases its independent reservation and closes scratch. Returned output stays with its consumer. Failed growth permits cleanup only, not proceeding under the old smaller charge. Existing `withNativeJsonInput` retains the encoded Buffer until actual native consumption/cancellation settles, independently of the closed scratch. Do not pin scratch from the escaping output's source list.

### 3.4 Implementation and qualification

Implement the runtime owner with existing reservation primitives; expose it and regenerate declarations with the pinned toolchain. Replace only the selected encoder's sequential temporary owners. Use actual quota exhaustion at creation, measurement growth, output reservation and encoding growth, plus completion, thrown serialization, close twice and use-after-close. Every failed growth preserves prior ownership and every output remains independently funded.

Through actual HTTP/bridge and cognition callers, compare exact bytes, current privacy/source refusal, held asynchronous output and final release. Record wrapper count, still-live headers, native-boundary calls, reservations, ordinary-GC/RSS and total CPU. More resize calls can cost more than the avoided wrappers; fewer wrappers or a smaller accounting number alone is not a gain. S is measured separately from J. Broader formatter/request/provider pools are not authorized by success here.

## 4. P: share only equivalent player captures

### 4.1 Source boundary

`NativePlayerCapture.capture` acquires account/actor facts, event evidence and actual player-control geometry. Its packet contains self, perception, events and controls. `publishIfPermitted` obtains a fresh native disclosure lease. The complete projector also consumes profile, operational, control, narrator, asset and optional SQL state; each stream retains its own previous view and transport ownership.

P initially covers periodic embodied SSE publications. Initial GET, reconnect bootstrap, creator inspection, command responses and unrelated player/NPC products keep their existing routes. Never share complete GameView objects, encoded payloads or input/control tokens across connections.

Before enabling reuse, audit the shared packet's actual formatter consumers for mutation. Use existing immutable/readonly conventions and a focused mutation-detecting correctness specimen; do not add a full deep-freeze/copy walk to every production publication. A helper needing to modify a selected value must create its own funded derived value, not mutate shared facts. Account that extra work in the comparison.

### 4.2 Group identity, ordering and lifetime

Use an exact tuple: runtime installation identity, world ID, timeline/generation, account ID, session ID/revision, grant revision, actor ID, audience and event-window request. Definition/geometry installation identity is bound by the capture and checked on reuse. Only embodied audiences share. Different worlds, accounts, sessions, actors, grants, timelines, event windows or inspection audiences do not.

Exclude connection ID and control generation only from this raw-facts key. They remain in each ordinary RequestScope, currentness check, token construction, reference binding and final view. Do not substitute a command-recovery key or silently alter the existing full `scopeKey`.

Bind the group to the accepted cut at acquisition as well as that tuple. Inside the service's existing accepted-boundary route, capture the native handle identity, generation and `progress.throughCut` alongside the actual capture. Before another borrower and again in its final publication callback, require that same handle/generation/cut. A changed cut retires further reuse; it never relabels old facts with a newer host revision. Read the service's already-held scalar progress, not `liveReadCuts()`, a new SQL lookup or a new bridge capture. This conservative check is specific to P: ordinary captures retain their existing scoped currentness contract.

Preserve publisher order. Share only a consecutive run of compatible ready streams, skipping streams the original publisher would not service. Refresh and check each stream's scope through its existing owner. A singleton uses the unchanged path. Walk the stream iterator once with one lookahead and one current group; do not construct every group's captures up front or rescan all streams for each recipient. Charge the group's actual fixed metadata, key storage and borrow bookkeeping through existing consumer reservations.

A private `SharedPlayerCapture` owns one real capture and a dedicated existing `createNativeConsumerScope`. Run only raw-capture acquisition and group-owned preparation inside that scope; recipient formatting and optional reads retain their ordinary request scopes. `decodeNativeProduct` otherwise attaches the packet to the first request's automatic cleanup, so merely retaining the capture object or incrementing a borrower count is insufficient. Do not extend a complete request scope across the group or disable cleanup globally.

The group holds one lifetime reference; each borrow adds one and has an idempotent release. Retirement forbids new borrows and drops the group reference once. At zero references, call the original capture's release and dispose the group scope in `finally`, once. Acquisition failure disposes that scope and releases any acquired read through its existing owner. A recipient failure releases only its borrow. Completed views retain actual borrowed allocations through existing source pins independently; releasing the group cannot free their data. No extra packet copy, repeated freeze or cache across publication passes is required.

### 4.3 Publication sequence

1. Select a consecutive compatible ready pair; later compatible streams may join that run. Check the existing pass cutoff described in NRF-L03 before acquiring or lending a shared capture.
2. Acquire one actual capture and its cut stamp through the service's accepted-boundary and geometry route, using the group-owned consumer scope. Do not enter the session directly from the publisher or hold a native lock across SQL/provider waits.
3. Supply each recipient a borrow through a narrow internal capture-provider option on the existing projector. The default provider remains ordinary acquisition. Preserve profile, per-attempt definitions, optional reads, token/source construction and final operational checks.
4. For each output, obtain that recipient's fresh native disclosure lease and current operational checks. Check the group's acquisition stamp before selecting no output, patch or reset; then encode only that selection inside the existing synchronous callback. Baselines and transport remain separate.
5. On capture-related staleness, retire future group reuse and use ordinary fresh capture for remaining recipients. The current stale attempt publishes nothing and follows the existing rescheduling/error path. Preserve original request deadlines; do not add an immediate retry loop or replay a command. A recipient-only permission refusal does not invalidate another valid scope.
6. End new reuse at the existing pass cutoff or group completion. Remaining recipients use fresh acquisition in original order. An active borrower keeps its normal deadline and actual resource lifetime; cutoff is not cancellation. Socket backpressure never waits inside the group/lease; preserve blocked/drop/drain behavior.
7. Retire the group in `finally`, including canceled acquisition and service shutdown. Actual release follows section 4.2's outstanding-borrow rule; independently retained views and payload bytes remain alive to their last consumer. Reconnect uses its ordinary baseline.

The original HTTP publisher only compares equality of its previous view revision before preparing a patch; do not assume that is a general older-capture rejection mechanism. P's acquisition stamp prevents reuse across accepted progress, including an earlier command or newer view reaching the recipient. Authority/epoch checks remain independently required. Count cut invalidations and actual useful reuse; do not freeze world time or widen eligibility to manufacture hits.

### 4.4 Implementation boundaries

Factor acquisition/release in `native-player-view.ts`, not a second shared formatter. Put the small group owner beside `native-player-capture.ts` and pass the private option through the service's existing `publishPlayer` route. The service owns the cut checks against its existing `progress`; the HTTP owner need not expose private progress in GameView. A borrow exposes genuine capture facts/publication and a borrow-specific release, never the underlying owner's early release. Keep Rust `RuntimePlayerRead` and `publishIfPermitted` as authority. No public protocol field changes.

The option accepts a real capture borrow, never arbitrary caller facts or an authorization Boolean. Share neither SQL selections nor full view formatting nor encoded deltas. Some already have caches and all have different lifetime keys. Remove redundant capture work, not its checks. Unchanged request-local definition preparation remains common baseline work.

### 4.5 Required comparisons

Compare one normal stream, two compatible streams, interleaved different-actor streams, and two different observers. Preserve movement, both conversations, autonomous reactions, saves and actual progress. Attribute key/group construction, captures, geometry, decode bytes, live source pins, formatting and transport separately. Capture count is not performance evidence by itself.

Exercise control transfer, a tab closing during preparation, blocked transport, session/grant revocation during an awaited read, correction/forgetting, timeline replacement, changed event window and reconnect. Place an accepted command between first and second recipients and during an awaited formatting read: no old capture may acquire the later host revision or overwrite newer state. Check distinct tokens and exact private evidence, no mutation of shared facts, correct retained-old-view funding and per-recipient final disclosure. A different world copied from the same seed must not match the key.

Finish the first recipient's request scope before the second borrows. The packet must remain funded and usable, while the first recipient's temporary formatting ends normally. Retire the group while a borrow is active, close that borrow twice, then release independently retained views: ownership must end exactly once at each actual lifetime, without relying on forced GC. Use the existing request-scope and transport paths, not a detached capture-only helper.

P can lose by prolonging a large capture, worsening latency or adding machinery for rare reuse. Adopt only for material actual compatible-connection benefit without single/distinct-client regression or greater binding memory pressure. Do not extrapolate duplicate-tab savings to thousands of independent players. Broader reuse requires another actual consumer and evidence, not automatic expansion.

## 5. R: deterministic parallel status-rate preparation

### 5.1 Narrow first family

R implements a candidate for NSC03/E2, not a second multicore project. First consumer: `time/prediction.rs::MechanicalForecast::prepare_selected`, currently calling `status/rates.rs::prepare_status_rates` over selected ordered status participants. That function reads installed policy, entity/episode bindings and earned values, evaluates ordered predicates and produces rate/periodic selections.

Before implementing R0 or extracting the evaluator, use existing attribution to establish a credible complete-path benefit from this particular phase on the selected workload. Compare its critical-path contribution with E2's target, including unavoidable serial work and the proposed dispatch/preflight costs; aggregate CPU share alone does not predict latency. If even an optimistic removal of the phase cannot meet the intended benefit, record R as not activated and leave E2 open for a separately justified family. Do not inflate status definitions or change gameplay merely to make this candidate qualify. Missing attribution remains pending work, not an evidence-backed rejection.

`StatusRead::evaluate_with_charge` already separates evaluation from charging. The metered route charges one Tests unit per visited predicate, including short circuit. WorkMeters is candidate-owned; rollback never refunds attempted work. Retain those semantics without a copied world, universal graph or independent random streams.

Do not parallelize movement/clearance, source acquisition, personal observation, attribute accumulation, RNG, identity allocation or mutation in R. Foreign-target reads can share coherent immutable input; their resulting effects still combine in original order. Unknown/unconverted families retain the serial route and its actual refusal behavior.

### 5.2 Shared input and finite jobs

Extract the current selection loop into one implementation accepting a predicate-charge callback and a rate-family allocation source. The serial wrapper uses existing WorkMeters and direct ByteBudget reservation. The parallel wrapper counts visited predicates locally and consumes prepaid reservations. Reuse the evaluator and earned-value readers; do not replay old predicates to validate earned intervals or change previous-result reuse.

A bounded `RateReadBatch` covers contiguous ordinals of the existing selected list, preserving its skip/previous-interval logic. A job names original ordinal, stable handle/generation, actual active episode bindings and the existing allocation bound. Result is the same StatusRateCapture or error plus actual attempted Tests. Preassign result slots; never collect in completion order.

Borrow concrete immutable entities, verified definitions/policy and current value window until the synchronous phase joins. Construct StatusRead locally in each worker, so its trait object need not cross threads. Require compiler-proved Sync for captured references. No unsafe Send/Sync, per-field locking or whole-state cloning is permitted. A non-thread-safe dependency leaves the family serial rather than authorizing an unsafe bypass.

### 5.3 Admission and rate-only funding adapter

Derive maximum predicate visits from the finite installed condition tree using the existing status-work preparation, once per installed definition. Include all branches in the bound, but keep execution's left-to-right short circuit. At runtime sum bounds for selected active rate/periodic conditions with checked arithmetic. Do not charge unrelated activation predicates or invent a new condition interpreter. This family's local meter is Tests only; saved `add_work` has different depth semantics and is not the operational meter combiner.

Before dispatch, require the batch's maximum Tests to fit every enclosing active meter's remaining allowance. No other code mutates these meters while the phase runs. This bounds possible computation; charge only actual visited predicates afterward.

Pre-admit job/result slots, existing per-job output/scratch bounds and bounded scheduling scratch in ordinal order. Use existing split/merge custody, not a race among worker reservations. A private rate-family funding adapter has two modes: direct ByteBudget for the original serial path, or a prepaid ByteReservation for a job. Reserve splits from prepaid custody; growth splits the needed difference and merges it into the held output reservation. It must not call an upward global `resize` after prepaid dispatch. Unused prepaid bytes remain owned until the job ends; returned intervals keep their actual existing reservations. No generic allocator interface is introduced outside this family.

Keep old bound formulae and retention behavior in this comparison. Reducing output/scratch estimates is a different change. If a batch cannot be bounded, funded or admitted, release only that batch's extra plan/reservations before any of its jobs start, then evaluate its unprocessed subjects once in original serial order. Retain earlier batches' results and actual work charges; do not restart the whole selected list. A preflight-only discovery must not replace an earlier serial failure, and optional parallel preparation cannot refuse a serially valid operation. Once a batch starts, failure follows the existing error owner after all jobs join; it never triggers a serial retry of attempted work.

Use NRF-L04's worker-dependent inline cutoff and batch maximum, frozen before comparison. A one-worker or too-small case enters the serial path before allocating a parallel plan. Each batch includes already-retained earlier results in its actual capacity calculation; never budget it as an empty host.

### 5.4 Use the existing host pool safely

The inspected `native/node-bridge/src/world.rs::compute` dispatches into HostPool and then blocks on `WorldRuntime.session.lock()`. `finish_stop` also dispatches a session-locking closure. Calling `rayon::join` while holding that session mutex introduces a distinct risk: a waiting Rayon worker can execute another outer job for the same world and block on the mutex held by its own suspended stack. Restricting the child closures to pure computation alone does not prevent this. This is a design hazard, not a reported reproduced native failure.

Primary references: [Rayon 1.12 join](https://docs.rs/rayon/1.12.0/rayon/fn.join.html), including work-stealing and blocking behavior, and [ThreadPool](https://docs.rs/rayon/1.12.0/rayon/struct.ThreadPool.html). R therefore requires **R0: per-world outer dispatch serialization before pool execution**, followed by **R1: parallel rate reads**. Measure the two changes separately; neither is implemented by this document.

#### R0 — One runnable outer call per world

Extend existing `world.rs::dispatch` and `pool.rs` admission; do not add a service, thread, timer, retry loop or second independently admitted queue. Each world-associated dispatch retains one bounded pending envelope until it can run. The envelope owns the existing cancellation, completion/poison callbacks, captured inputs and byte reservation. Factor HostPool admission from scheduling so every waiting/running envelope consumes the same existing host outstanding permit exactly once. Scheduling an already-admitted successor must not acquire another permit or fail merely because the outstanding count is full.

`WorldRuntime` owns a short-lock pending FIFO and one active flag. Enqueue under that lock; if idle, mark active and detach its first envelope. Schedule outside the queue lock. Only the head enters Rayon; other same-world envelopes retain their inputs and admission but occupy no compute worker. Bound queue storage by the existing outstanding allowance and pre-fund actual backing growth through the byte owner. All world-associated dispatches use this path, including direct cleanup/stop calls. A worldless dispatch may not acquire a world session mutex. Audit those call sites in the existing caller manifest before enabling R1.

Queued closures receive the owning world/host as execution arguments rather than strongly capturing their containing owners. The runnable dispatcher retains the strong execution owners until its admitted chain drains. This avoids a world → queued closure → world ownership cycle; [Rust's Arc contract](https://doc.rust-lang.org/std/sync/struct.Arc.html#breaking-cycles-with-weak) explains why destruction cannot break it automatically. Terminal callbacks and dropping captured inputs run outside the short queue lock.

The active envelope executes the original closure and completion/error path. Its session guard and all child jobs must end before advancing the FIFO. After completion is handed to the existing deferred-result owner, take the next envelope under the short queue lock, or mark idle if empty; schedule outside the lock. Enqueue and idle transition share that lock so no wakeup is lost. A small scope guard performs this finish on failure/unwind as well as success. Preserve the existing single completion and poison policy; do not run another command merely because its predecessor failed.

Queued cancellation/host close uses the existing pre-execution cancellation outcome, releases that envelope's inputs and permit, and advances the queue without executing its body. Already-started work retains its normal join/rollback lifecycle. Already-admitted envelopes remain drainable after admission closes; the host cannot destroy its pool while their outstanding permits remain. Poisoned/stopped sessions reject queued work through their original error owner. Shutdown must settle every admitted envelope rather than leave promises or admission held forever.

This serializes native access, not an entire asynchronous gameplay request: provider/SQL waits retain no active outer envelope, session mutex or compute worker. Synchronous Node checks retain their current nonblocking behavior and separate acceptance fence. Do not replace repaired asynchronous mutex waits with transient `try_lock` failures or automatic retries. No job can hold one world session while acquiring another. Detached cross-world data remains scoped through existing owners.

Qualify R0 with rates still serial: concurrent same-world reads and progression, two different worlds, queued cancellation, a busy/closing host and stop during work. After R1 is present, force a same-world read to arrive while one rate branch is still running and the parent is waiting; both must finish without a worker waiting on that world's session. Use a controlled bounded completion check, not an unbounded stress run. Verify completed/canceled envelopes release their inputs and permits and leave no owner cycle. Count FIFO storage, waiting age, bridge latency and complete CPU; preserving mutex safety is not a speed claim.

#### R1 — Scoped read-only ranges

Pass existing HostPool range width through native operation construction; direct library callers without verified current-pool context run inline. Add the workspace-pinned Rayon dependency to the simulation crate only for this consumed family if required. Do not construct a new pool or silently use the global pool.

Run bounded recursive `rayon::join` inside the existing host worker, splitting contiguous slices into at most the selected useful ranges. A leaf executes sequentially. The calling worker participates and the current pool handles work stealing. No heap job per actor is needed. The R0 gate remains active until every child has joined, so another outer job for that world cannot enter Rayon during this borrowed-state phase.

Jobs are CPU-only: no SQL, provider, Node callback, socket, sleep, blocking channel or world-mutex reacquisition. The outer operation retains coherent exclusion while children borrow input. Other worlds share the same bounded pool; inner ranges are not new externally admitted operations. Audit any lock reachable from a leaf: it cannot depend on work waiting for the enclosing join.

Observe existing cancellation at bounded job boundaries. All started work joins/unwinds before shared input and reservations disappear. Preserve fatal panic/poison policy; no partial forecast is published. Batch size is not a latency guarantee: measure the complete held phase, preflight and all batches against coherent-return targets, including another world sharing the pool.

### 5.5 Ordered joining and actual work

After joining, account every attempted predicate, including jobs that fail or run before cancellation. The admitted maximum makes successful aggregation fit the enclosing Tests allowances. Do not refund it on rollback or omit speculative read work. Fatal unwind with unavailable diagnostic counts must be reported honestly, not as zero.

Inspect results in original participant order and preserve definition/operation order within each. Report the first failing ordinal, not first completion. Expected quota-saturated or unsupported paths remain serial before dispatch. Internal/allocator failure aborts the candidate normally. Parallel early failure can attempt more pure work than serial early exit; retain that actual operational cost while preserving authoritative state and refusal categories. No failed-run equal-cost claim follows.

Append intervals in source order. Keep AttributeRates::capture, floating summation, deadline/threshold choice, journal writes, RNG and identity in original serial owners. No parallel floating reduction, unordered map iteration or per-worker randomness. Preserve existing local forecast refinements and unrelated countdowns. Pure results never grant a personal observation.

### 5.6 Implementation and evidence

1. Confirm current NSC03 eligibility, actual proof profile, section 5.1's material-benefit screen and supported participant/status family. Reconcile the bridge's current dispatch implementation before applying R0.
2. Extract pure selection and bound/charge/funding callbacks with serial execution. Compare old versus refactored serial behavior and complete cost before claiming parallel benefit.
3. Implement and compare R0 separately, with rate preparation still serial. Do not enable borrowed-state Rayon joins until all session-locking dispatch paths satisfy its gate and shutdown/completion checks.
4. Add bounded storage, prepaid output/work and deterministic fallback without extra parallel work. Exercise pressure with real retained inputs, including a later batch falling back after an earlier batch completed; no repeated results or work charges.
5. Enable current-pool R1 joins and ordered charging. Compare it against the same R0/refactored-serial control. No public command or save format changes.
6. Compare one/multiple workers: tiny ordinary opening, supported crowded rate work and independent activity. Include short circuit, optional absence, foreign/shared target reads, current-value windows, periodic entries, rejected candidate, cancellation and full continuation. Check saved records, outcomes, IDs/RNG and source order, not only rate arrays. Include two ordinary world instances sharing the actual host and the same-world nested-dispatch case. Use existing installation rather than a new cloning service.
7. Apply E2 to the complete candidate against the original pre-R baseline as well as the isolated subchanges. Include dispatch/preflight cost, memory, Node/PG, held-phase time and section 7.2's cognition comparison. If insufficient parallel work or overhead makes R lose, remove R-only machinery; a separately justified repair remains with its actual owner. Do not expand into mutable systems merely to force success.

R settles this candidate, not the theoretical multicore limit. Another family needs its own safe finite decomposition and isolated comparison; it reuses an adopted dispatch owner rather than inventing another gate.

## 6. Other research findings: exact disposition

**Participant/deadline scans:** ParticipantPreparation already creates shared ordered groups; AcceptedAdvanceContinuation and local forecast refinement reuse preparation. Construction and sensory-bound selection still visit populations. Attribute actual repeated work before adding membership caches or due indexes. Existing NSC profiling owns that question. Preserve root versus ICU order, temporal wakeups, exact journal rebinding and conservative unknown dependencies. A new broad cache is not selected by NRF.

**History and SQL:** current read cuts join exact durable revision, accepted suffix and temporal overlays; storage already requires indexed selection and overlay-before-limit. Never remove a preflight transaction or substitute newer data merely to lower query counts. Existing NSC read/SQL attribution owns demonstrated duplication, not a new cache here.

**Working sets/world copies:** section 1 settles the near-term boundary. Physical eviction, exact background-family closure, bounded arrival and mature-region restore remain consuming PS/NSC designs. Reuse actual immutable definition/asset owners; do not share mutable consequences or implement a permanent overlay chain now.

**Crowd physics/fidelity:** current support, clearance and ordered movement remain. The occupancy/avoidance-versus-pushing comparison remains with DG18/spatial owners. No load-triggered blindness, weaker defense or invented memory. Transparent compute partitioning is distinct from gameplay separation.

**Memory allowance:** preserve actual current proof profile and separate resident/pending-save accounting. Simultaneous-owner attribution and correctness/resource repair stay with NSC. No bigger allowance, reduced evidence, forced GC or new general priority-budget system is selected to hide a failure.

## 7. Experiment sequence and adoption

### 7.1 Establish the control once

NRF01 consumes existing NSC profiling/failures. Use latest integrated code for both arms, including accepted A/B/C repairs. Pin source/addon/Node/toolchain, definitions, input schedule, clock, actual participants, provider fixtures, publication/save policies and allowance. Uncommitted owner reports are context until their source/evidence is available.

Each candidate records its material targeted cost, actual consumer and fixed adoption criterion before execution. Missing attribution means not activated, not a speculative implementation mandate. Correctness repairs proceed under their existing owner; do not mix them into an optimization comparison and infer causation.

J and S are independently eligible after their consumer is stable. P waits for reconnect/busy correctness and multi-connection attribution. R retains NSC03/E2's preceding complete-proof gate and section 5.1's benefit screen. Its serial extraction, R0 dispatch change and R1 parallelism each have a separate before/after; the complete R comparison includes all three costs. J need not precede S, and neither is a prerequisite for multicore design. Integrate only separately qualified changes, then check actual lifetime interactions.

### 7.2 Required correctness

Use current owned fixtures and actual library/service/HTTP/SQL consumers under the verification policy. No new permanent test framework or blanket suite mandate. Helper equality supplements, not replaces, the named journey. Preserve private-candidate isolation, actual pending-source refusal, current disclosure, deterministic effects, release and current-format continuation. Reuse unaffected prior evidence with exact scope.

J/S cover UTF-16/order, real preallocation refusal and independent output. P covers shared-fact immutability, connection-specific controls, different observers, request-scope cleanup, accepted progress during reuse and slow/closed/revoked consumers. R covers dispatch completion/shutdown, nested same-world work, ordered success, later-batch serial fallback, failed-candidate state and all started-job cleanup. These do not replace the complete native proof.

**Cognition-preserving differential case:** reuse the supported two-conversation/movement journey with the same admitted simulation-time inputs and controlled provider replies. At matching decision cuts compare actual trigger/cause, actor identity and physical life, received evidence with original acquisition/currentness, required memory, offered actions, prompt text, schema and permitted reference bindings. Fix operational IDs where possible; any normalized execution-only token is named before the comparison and keeps its exact binding relationships. Never normalize away evidence times, source revisions, missing options or private references.

Pass the same structured reply through the actual parser, current-state admission, action/speech effects and PostgreSQL continuation in each arm. Include movement while a reply is held, source correction/forgetting or control/life replacement before delivery, and one response containing independently accepted/refused components. Preserve useful fresh replies, actual stale refusals, cancellation and no duplicate speech/action. A trace change at this boundary is a regression to resolve, not permission to retune the prompt, omit evidence or weaken a gate.

These fixtures establish deterministic input/transport/effect continuity, not identical stochastic model replies or autonomous quality. Live-model quality remains its existing separate owner. J/S touch shared encoding and must include the actual cognition caller; P/R include pending replies under their changed publication/scheduling load. No additional model pipeline or automatic paid retry is added.

### 7.3 Required measurements

Speed runs use the authorized managed AWS procedure/current standard worker, not local timing or GitHub Actions. Reuse the existing runner and counters. Freeze before/after with only the selected mechanism changed. Use current three-run interleaved independent-database comparisons and clean-work criteria. Diagnostics are separate from timing.

Record application/native/worker/client and exclusive database CPU per completed work, actual game time/debt, response and useful-view tails, held-phase time, SQL calls/rows/bytes, wire output, native reservations and RSS/ordinary-GC behavior. Separate released headers, live bodies and unknown bytes. Command response, first visible result, background-save age and durable ACK are different milestones; do not reinstate a synchronous durability target on the current one-second background-save policy. Source control, Native control and candidate are different denominators. Preserve failed attempts; survivor averages do not qualify a campaign.

J/S use the actual ordinary two-conversation/movement/save journey. P adds equivalent/distinct/interleaved connections without dropping ordinary work. R adds a bounded supported rate workload, same-world overlapping reads and shared-host contention, then returns to the tiny case. Pure-read fixtures are phase evidence only. Population/duration and diagnostic expansion must fit existing authorization and spend/resource bounds.

### 7.4 Candidate decisions and overall adoption

[NRF-L05](../limits/native-runtime-foundations.md#nrf-l05--evidence-and-adoption) owns quantitative candidate criteria and the matched-work denominator. Freeze the selected route before timing. J's small consolidation must improve the complete affected consumer; S/P's extra lifetime machinery must earn a substantial gain or close a demonstrated binding resource failure. R uses E2 for its complete dispatch-plus-compute candidate, not merely its fastest kernel. R0 may have measured prerequisite cost without being a standalone speedup; it is adopted with R only when the complete result qualifies, unless independently justified by an existing repair owner.

A later revised criterion must be explicitly selected before a new experiment and cannot relabel old failed evidence. Current NSC E1/E2/resource/latency decisions remain separate; a Native-to-Native improvement does not establish Rust's advantage over Source.

Record adopt, reject, inconclusive or not activated with source/workload evidence. Inconclusive does not authorize broad rollout. Remove rejected paths, temporary switches and unused helpers; preserve evidence in the actual owner. An adopted algorithm may deliberately keep an inline strategy, but not an old-engine compatibility backend or second authority.

After combining adopted changes, run the smallest complete affected journey and combined cost/resource comparison necessary to expose interactions. Do not add isolated percentages. Reconcile actual coverage, limits, contracts and tasks. Broad population, mature-world and enjoyment qualification remains with PF/PS/PT/PD and first-playable owners.

## 8. Delivery boundaries and open questions

No new product ruling is required for the selected experiments. Their eligibility and measured benefit are open empirical results, not unspecified algorithms. Do not change pushing, sensing, unattended service or player admission to obtain a pass.

Design completion covers these four recipes, R's dispatch prerequisite and section 1's preservation decisions. General physical streaming, new crowd behavior, alternative authoritative clocks and distributed persistence are not claimed designed here. The [research handoff](../maintainers/decisions/mmorpg-engine-foundations.md) retains their existing owners and residual scopes.

## Maintained records

- Player/world requirements: [feature specification](native-runtime-foundations-feature-spec.md).
- Implementation and dispositions: [NRF tracker](../maintainers/native-runtime-foundations.md).
- Restrictions and removal triggers: [NRF constraints](../limits/native-runtime-foundations.md).
- Source/owner-report and all-catalogue scope map: [evidence and repertoire reconciliation](native-runtime-foundations-evidence-and-repertoire.md).
- Existing architecture/proof: [native-core technical design](native-simulation-core-tech-design.md) and [NSC](../maintainers/native-simulation-core.md).
