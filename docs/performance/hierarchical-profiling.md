# Hierarchical performance profiling

This is the reusable procedure and instrumentation design for measuring a complete execution path, then its actual constituent operations. It works with the [simulation inventory](simulation-inventory.md) or a different explicitly supplied measurement inventory. [Measurement and interpretation](measurement.md) remains the shared evidence contract; [existing profiler commands](../maintainers/performance-profiling.md) describe tools already installed.

**Delivery boundary:** the hierarchical registry, complete distributions, workload matrix and campaign adapter below are designed, not installed. [PC07–PC10](../maintainers/profiling-controls.md#hierarchical-server-measurements) track delivery. Existing CPU profiles, domain counters and 256-value timing rings do not satisfy these requirements. Finish that tooling before claiming this procedure has run. This document authorizes neither gameplay changes nor a profiling campaign by itself.

## 1. Questions and scope

For each selected operation answer: what calls it, how often, how many inputs it visits, how many useful outputs it produces, how long one invocation takes, and its aggregate cost. Cover initialization, ordinary work, changed inputs, cold reads, maintenance and shutdown separately. A subsystem not exercised by a walking fixture needs its own workload; an empty measurement is not free execution.

The hierarchy is an explanation of work, not a claim that every parent equals the sum of its children. Measure parents directly with children disabled in separate passes. Shared preparation, worker execution and asynchronous waiting have separate owners. A helper used by several systems has one measurement definition and a bounded caller classification; do not create separate writable stores or implementations to profile each caller.

Use the existing game, server, PostgreSQL adapter, immutable state boundaries and managed worker. No replacement simulation, telemetry service, remote toggle, profiling database or general tracing platform is required. Ordinary gameplay must not read the measurement inventory or accumulate timing records.

## 2. Freeze the experiment

Before implementing probes, draft `plan.json` outside Git with pinned gameplay, inventory, scope and budget. After tooling/fixtures are complete, resolve their hashes and the finite matrix below, then freeze the complete plan before dispatch:

- Campaign/task ID, authorization reference and aggregate spending ceiling; exact gameplay commit, tooling commit, instrumentation patch hash and source archive hash. Pin dependencies, Node, pnpm, PostgreSQL, native libraries and workspace resolution. Branch names alone are insufficient.
- Inventory document/hash and selected stable measurement IDs; selected scenarios, seeds, units, workload assertions and attribution modes. Name required measurements separately from performance pass requirements and optional investigations.
- Machines, database placement/configuration, storage, worker counts, runtime flags, warmup/measurement/drain durations, run order, three repetition IDs, hard deadlines, output/retention allowances and cost reservations.
- Known exclusions, unavailable instruments, environmental prerequisites and success/failure rules. No live provider calls unless separately authorized. Never infer an old task's cloud or model allowance.

Use an isolated exact source snapshot. If development continues elsewhere, do not pull it into the campaign. Instrumentation may wrap existing operations but may not change world rules, sampling cadence, attention, history retention, permission checks, action choices, save cadence or work budgets. If a gameplay defect prevents measurement, stop the affected case and report it; a repaired source starts a new comparison family.

Keep three identifiable source configurations: untouched gameplay plus the shared workload driver; that same gameplay with the reviewed probe patch disabled; and that identical patched build with a selected probe set enabled. Fixture/driver inputs and required correctness observations are the same in all three. Tooling commits may add the driver and probes, but may not import unrelated gameplay changes. Generate the control/disabled/enabled configurations from these two source manifests rather than maintain parallel game implementations. Store the exact probe diff; verify workspace bindings for both builds.

Use the existing [workspace binding check](../../scripts/performance/workspace-bindings.ts) before each build/run. Archive the actual source/patch and fixture, rather than relying on a temporary worktree remaining available. Record cold process, cold game state and cold database/cache as different conditions. Do not label a fresh Node process over a warm PostgreSQL cache as cold storage.

### Concrete plan and case interface

PC07's plan adapter accepts a JSON object with these required fields; unknown fields refuse rather than silently changing the experiment. This is a profiling-tool input, not a public game protocol or a new worker-plan format:

```json
{
  "id": "hierarchical-server-20261107",
  "gameSource": "2a17fa7c42f777c5eefd3fba67c652ef2c5f54ec",
  "toolSource": "<exact-40-hex-commit-after-tooling-is-complete>",
  "inventory": "docs/performance/simulation-inventory.md",
  "select": ["S05"],
  "workloads": ["W03"],
  "machines": ["H0"],
  "modes": ["control", "disabled", "parents", "children", "leaf"],
  "repetitions": 3,
  "seed": 1086,
  "limitUsd": 100,
  "authorizationRef": "Mike: hierarchical server campaign, 2026-11-07",
  "outputDirectory": "<absent-absolute-private-directory>"
}
```

The example selects sight only; it is not the default campaign. The inventory’s [initial run plan](simulation-inventory.md#initial-run-plan) defines the selected 27 runs. A complete-inventory campaign is a separately selected expansion, never implicit. Resolve prefixes before dispatch, expand children using the typed registry, deduplicate cells, and reject an ID with no source binding or positive workload. The generated immutable plan adds its hash, selected metric definitions, instrumentation patch/hash, machine profiles/prices, actual cases, expected reservations and required artifacts. No wildcard selection may silently omit a newly added child.

Each generated case has `id`, `gameSource`, `toolSource`, `probeIds`, `mode`, `samplingProbability`, `scenarioId`, exact fixture/input hashes, `repetition`, `seed`, `hardware`, `warmupSeconds`, `measureSeconds` or a finite fixed-work schedule (mutually exclusive), `drainSeconds`, `hardDeadlineSeconds`, `expectedWork`, `outputDirectory` and required artifacts. The fixture supplies native setup, game-time commands, assertions and world settings; the tool supplies timing and host input schedule. A source-only measurement patch is explicitly listed; refuse all other differences in gameplay files between control and instrumented sources.

For the initial campaign, freeze the 27 run slots, candidate probe IDs, selection rule and budget before any dispatch. I05/I06’s exact probe sets are resolved from I01–I04; generate their concrete cases with the same `plan` command only after that selection. Record each immutable stage plan/hash and the earlier results that justified it under the parent campaign directory. Every dispatched case has concrete probe IDs; a future slot is not a runnable case with placeholders. Generate separate existing-runner batches for these stages under one task allocation, rather than add an adaptive cloud controller or mutate a running job plan. The final summary indexes every stage and checks the global 27-run allowance.

`plan` emits this resolved plan, a missing-coverage list and an adapter-generated **existing managed-runner** plan. `case` accepts one resolved case, creates one owned disposable database, runs that case and writes its outputs. It does not provision/claim machines. `summarize` reads only collected files and emits the hierarchy/coverage/comparisons; it never starts missing cases. Missing repetitions stay missing. The runner injects database/credential locations separately; no secrets or database URLs in these JSON objects.

## 3. Measurement definitions

The maintained tool registry is a small typed table under `scripts/performance/`, populated for selected coverage when PC07 is implemented; unselected catalogue rows need no executable probes or new fixtures until separately requested. The Markdown inventory owns coverage and meaning; the table owns executable probe bindings. Each row has:

| Field                   | Contract                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `parent`, `label` | Stable semantic identifier, optional explanatory parent and plain-language operation. Parent presence never authorizes summing overlapping totals.                                          |
| `source`, `boundary`    | Repository file, function/block, exact start/end, early exits, error and cancellation behavior. Bind at the real caller, not a synthetic helper loop.                                       |
| `kind`                  | `sync`, `active-segments`, `async-latency`, `queue-wait`, `counter`, `gauge` or `sampled-cpu`. Different kinds remain separate series.                                                      |
| `unit`                  | Invocation, completed observer opportunity, observer-subject query, ray batch, actor interval, action, event-recipient, row batch, transaction, request or checkpoint. State exactly which. |
| `dimensions`            | A finite enum of branch, result, caller and workload class. No dynamic actor ID, SQL text, timestamp or source ID in a metric name.                                                         |
| `work`                  | Existing counts available inside the operation: candidates visited, inputs/bytes, actual changes, reuse, discarded/stale work and outputs. No extra whole-state scan to obtain a counter.   |
| `shared`                | Whether costs belong once to a phase/batch instead of separately to every recipient.                                                                                                        |
| `coverage`              | Required scenarios and positive assertions proving that this operation executed.                                                                                                            |

Source symbols/blocks must be verified against the pinned revision. A missing or multiply matched anchor fails probe preparation. Do not silently instrument a nearby function or import a workspace package from another checkout. An instrumentation diff is reviewed for return, exception, `this`, generator and Promise semantics before remote runs.

### Timing kinds

- **Synchronous elapsed:** bracket actual entry/exit with a monotonic clock. Includes preemption and GC during the bracket; it is not exact function CPU time. Record success/refusal/error separately without swallowing exceptions.
- **Active segments:** for a generator or asynchronous operation, time each actual synchronous resume separately and retain the total for that one completed logical operation. Pause timing before `yield`/`await`. Keep its independently measured end-to-end latency too. An observer's active time is not elapsed time while another observer or worker runs.
- **Asynchronous latency:** entry until settlement, including necessary waits. A nested save, SQL request or worker round trip can overlap its parent's latency. Do not add their totals to obtain CPU or wall duration.
- **Queue wait / hold:** enqueue to admission, then admission to release. Include expired/refused waits in separate distributions. Decompose held work into active segments and actual awaited operations where needed; a lane held for a second does not imply a second of CPU.
- **CPU:** OS process/thread CPU deltas for measured windows; sampled stacks for attribution. Measure server main thread, each worker thread/process, PostgreSQL and load generator separately. Whole Node process CPU includes its workers; do not add it to those workers again. Do not read `process.cpuUsage()` around every tiny helper and call the result per-helper CPU.
- **Allocation and memory:** allocation samples in a separate pass; natural heap/RSS and queue gauges at a fixed low rate; retained heap and storage census after measurement. Retained bytes, allocated bytes, JSON parameters, WAL, disk space and reclaimable cleanup debt are distinct quantities.

Shared sight preparation gets one batch measurement. Each observer's candidate query, visibility processing and evidence application get their own invocation measurements. Report shared cost per batch and optionally `sharedMs / completedObservers` as **amortized shared cost**. Do not call it measured per-observer latency or invent its p95. An observer summary may show its measured active/elapsed distributions alongside this allocation.

For common tiny lookups, first time the real enclosing loop and count visited items. `loopMs / visitedItems` is amortized cost, not an individual-lookup percentile. If individual latency is required, run the leaf-only sampling pass below; never repeat calls against warmed toy objects to impersonate the production path.

## 4. Instrumentation with bounded disturbance

Reuse [`apps/server/src/performance.ts`](../../apps/server/src/performance.ts), its capture lifetime and listener boundary; extend rather than build a competing recorder. Reuse [`diagnostic-counters.ts`](../../packages/domain/src/diagnostic-counters.ts) for already-defined work counts. Preserve the default-off switch and existing operational errors. Domain code stays deterministic and receives an optional synchronous measurement sink; clocks and buffers live in the host/tool, never saved world state. The sink cannot return a gameplay decision, await, mutate arguments, consume saved randomness or alter a work budget.

Choose the probe set once at process startup. At the outer selected scope, bind disabled children to the ordinary execution path. Disabled sites do no optional clock reads, closures, label construction, argument scans, buffers, Promise wrapping or listener calls. Do not claim the remaining branch is literally free; compare the untouched source to the instrumented-but-disabled build. Keep the domain sink and the server recorder in one capture session, with numeric metric IDs assigned before measurement.

The installed anonymous `beginTiming()` cannot filter a stage before its clock read because it has no stage argument. PC08 must not simply enable every existing timing wrapper for a leaf pass. Extend the single capture owner with a campaign mode and prebound selected scope handles; existing unselected duration/counter producers return before measurement preparation. Named `timed`/`timedSync` producers can resolve their selection before entry; explicitly scoped begin/end sites need the same selected handle passed to both ends. Host-provided domain sink callbacks forward into that owner. Existing default/recent-window capture remains a separate startup choice, not a second simultaneous recorder.

At the tool boundary select Inspector, allocation and SQL instruments independently of application timing. The current scripts' blanket rejection of CPU sampling with application profiling off must be replaced by validation of the actual selected mode, so a CPU-only pass does not accidentally enable all application timers. Update installed callers/docs together when implementing this seam; it is a tooling change, not permission to collect profiling in normal play.

For synchronous scopes use `try/finally` and a preallocated numeric stack; do not construct one object per lookup. Explicitly pass an operation token across existing async/generator boundaries rather than adding AsyncLocalStorage everywhere. Reuse existing request/job/transaction identities at the server's existing async boundaries where available. Tokens identify both their capture and slot generation: a duplicate or late `end` cannot close a later operation that reused the slot. Capture stop discards unfinished tokens with counts; late completions cannot enter a new capture. Bounded per-actor counters are allowed for the declared fixture roster, but no per-actor histogram matrix by default.

The concrete token lifecycle is `begin(scope, unitCount) → [pause → resume]* → end(outcome)`. `begin` records one logical start and active-segment start; `pause` adds the current synchronous elapsed segment and leaves the active stack before yielding; `resume` starts a new segment without restarting logical latency; `end` closes an active segment if present, records one invocation's active sum and end-to-end elapsed, then releases its slot. A token may be ended while paused. No token can be concurrently active on two stacks. An observer waiting for shared rays is paused; the ray batch has its own token. Retain an optional numeric parent token for bounded traces, not an allocation-heavy call tree. Invalid clock samples/unbalanced scopes mark measurement failure without modifying the game's returned result.

For a generator parent, pause/resume at each actual `next()` boundary; a child observer token is active only while code is executing for that observer. A newly selected observer can retain a paused logical token until its later evidence application. For parallel asynchronous children, use explicit tokens and links, not a process-global “current actor.” When instrumentation itself fails, detach the affected capture, retain a bounded failure record and preserve the operation's original result/error. An unrecorded operation remains unqualified even if the game completes successfully.

In a same-pass synchronous parent/children diagnostic, maintain child-active durations on the stack to expose the parent's exclusive residual. This derived residual is labeled as such; both parent and child gross durations are directly measured. Child bookkeeping can occur inside the measured parent, so the residual includes unassigned application work **and probe overhead**; it is not exact exclusive application CPU. The parent-only pass qualifies the parent's latency. Do not subtract children across asynchronous overlaps, separate runs, or different processes. A logical subsystem with several entry points gets several direct parent series; it does not acquire an imaginary single invocation simply because the report groups them together.

Each process/worker uses its own monotonic clock for durations. Join request, worker and database boundaries using existing job IDs and capture IDs; never subtract timestamps from unrelated clock origins. A cross-process timeline needs a recorded clock mapping and its uncertainty; otherwise show send→reply on the sender and compute time on the worker separately. Export summaries after measurement, not one IPC message per timed ray or field. Inspector sessions must cover the actual main/worker isolates being attributed; a main-thread profile alone cannot explain whole-process CPU.

### Collection passes

| Mode                | Enabled                                                                                             | Purpose                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `control`           | External command/SSE observer and coarse OS samples only; existing optional application metrics off | Actual whole-server behavior with no detailed hooks. No heap snapshots, Inspector or SQL diagnostic logging.              |
| `disabled`          | Instrumented build, all optional hooks off; same external observations                              | Detect cost from the dormant instrumentation itself.                                                                      |
| `parents`           | Selected root or immediate parent scopes only                                                       | Direct category distributions without all descendant clocks.                                                              |
| `children:<parent>` | That parent's immediate children, their needed counters, and one enclosing span                     | Explain the selected category and compute same-pass synchronous residuals. Deeper children off.                           |
| `leaf:<id-set>`     | Only selected deep operations                                                                       | Resolve per-unit costs; reduce sampling if necessary. No simultaneous CPU/allocation sampler.                             |
| `cpu`               | Inspector sampling plus control observations                                                        | Caller attribution, including utility work not yet named in the inventory. Not the source of exact operation percentiles. |
| `sql`               | Adapter/transaction boundaries and database statistics                                              | Calls, rows, bytes, queues and query families; exact hot plans are inspected separately.                                  |
| `allocation`        | Allocation sampler plus control observations                                                        | Allocation sources; never use this pass as clean throughput evidence.                                                     |

A probe set normally has at most 32 active duration series, independent of the inventory's size. Split it if dimensions would exceed that; do not truncate the least convenient metrics. The UI's existing 256-value rings remain recent-window diagnostics. Add campaign-only whole-window histograms to the same capture owner; do not use those rings as full-run p95/p99.

For selected durations maintain exact count/sum/min/max and a fixed histogram with 1 microsecond lower bound, successive upper bounds multiplied by 1.01 through one hour, plus underflow/overflow. Precompute boundaries outside timing; binary-search the numeric bounds on insertion. Report quantiles as bin intervals and their upper-bound estimate, with the <1% bin-width convention above 1 microsecond. Exact raw percentiles are optional, not falsely implied. For sub-microsecond or clock-floor results report the bound and use enclosing-loop measurements. Overflow makes the affected tail unqualified, not one hour. Counts use Float64 counters and report precision exhaustion rather than wrap.

For sampled leaf timing, select eligible invocations with a separate deterministic measurement PRNG, never the game's RNG; count all eligible calls and timed calls. Start at probability 1, then 1/8, then 1/64 only when overhead qualification fails. Keep seeds fixed per repetition and rotate across the three repetitions. Report sampled distributions, estimated totals `eligibleCount × sampledMean` and their limitations separately from exact total duration. Never discard a slow sample because it appears to be GC. Recursion, exceptions and unfinished work have explicit outcome counters.

Raw correlated traces are opt-in and bounded to 64 MiB per isolate per case, retained in typed buffers; no file output or formatting in measured callbacks. Histogram/counter recording continues after trace capacity, but omitted trace events are counted. Maximum 8 MiB per-isolate aggregate recorder allocation and 32 active timing series are initial tooling budgets, not game limits. Export after cutoff; if memory or transport limits cannot fit mandatory results, split cases instead of discarding them. A stack/token cap of 4,096 rejects further measurement tokens and reports capture incompleteness without rejecting gameplay.

### Overhead qualification and stop rules

**Experimental until qualified:** every new probe family, collection mode, driver/setup seam and resource-limit configuration. None has a zero-overhead or cognition-safety guarantee from source review alone. Keep probe families independently selectable/removable; compare each selected family against its matched disabled baseline, the combined parent mode against disabled, and the complete disabled patch against untouched source. A failed dormant patch needs its responsible family removed or repaired before using its timings. Do not retain a regressing hook merely because it is default-off.

Run untouched control, disabled hooks and each probe mode three times on the same workload/machine family. In paired fixed-work cases require identical accepted native inputs, ordering, RNG outcome and canonical results; in real-time cases report differences in admitted work and state, because wall scheduling can change naturally. A driver or fixture seam is qualified against the existing caller before its results are used as a baseline; changes to its input rate, pauses or save barriers are new workloads, not instrumentation gains.

Treat instrumentation as low disturbance only when the median CPU per completed work unit rises by no more than 3%, command p95 rises by no more than 5% or 2 ms (whichever is larger), and no new stall, quota crossing, pause, failure or measurable workload change appears. Compare Node-process CPU and total owned Node-plus-PostgreSQL CPU separately; also report allocation, retained memory, database/IPC operations and bytes introduced by probes. A new per-event export/query is a failed design, not hidden inside a CPU allowance. These are engineering qualification thresholds, not confidence guarantees. Show all three pairs and their spread; a result smaller than natural variation is inconclusive. Do not subtract calibrated clock cost from individual samples.

If a detailed mode exceeds the budget: split siblings, then use the leaf sampling schedule, then report unresolved fine-grained timing with parent measurements. Do not change gameplay or repeat indefinitely to find a favorable sample. A diagnostic with higher overhead may explain source activity but cannot establish normal latency. The complete report must identify every unresolved metric.

## 5. Workloads and repetition

Maintain two complementary modes:

1. **Real-time service:** real server timer, commands, permissions, SSE, saves, maintenance and PostgreSQL. Report achieved game time, debt, responsiveness, actual useful activity and CPU per real second. Never omit long gaps or draining waits to improve the result.
2. **Fixed admitted work:** a finite deterministic scenario through the same service/domain owners, with explicit game-time boundaries, inputs and awaited worker completions. Measure completion latency and CPU for equal work. This is a cost diagnostic, not proof of real-time responsiveness. Do not disable save application to obtain equality.

Use three complete fresh repetitions of each resolved configuration. Its identity includes source, hardware/settings, scenario/fixture/input hashes, warmup/measurement/drain schedule, mode, probe set and sampling probability. Warmup ends by starting a fresh statistics window while preserving active tokens, gameplay state and caches. All repeats use the same fixture and command schedule; separate alternative gameplay seeds are separate workloads. Order paired control/instrumented runs as A–B, B–A, A–B; hardware session order rotates where practical. Do not run two measured workloads on one machine. The load generator runs separately from the server process; record its CPU and scheduled versus actual send times so a starved generator cannot make the game look faster.

The resolved plan names each case's exact comparison partner and the one intended difference. Instrumentation pairs share fixture, hardware, offered work and all phase durations; a short probe pass needs equally short untouched/disabled controls, not the longer operating baseline. Hardware pairs retain identical probes, sampling and workload settings, with the machine or declared CPU/memory limit as the difference. Compare repeats by their scheduled pair; do not pool different durations, sampling probabilities or workload variants to fill a missing repetition. Reuse a completed run only when it is the identical planned cell in the same matched comparison block; qualification and final reporting may reference that artifact without running it again. No control is reused across a changed setup, worker configuration or source.

The [simulation inventory](simulation-inventory.md#campaign-workloads) supplies the current scenarios. A different investigation supplies equivalent setup, inputs, timing bounds, coverage and positive assertions. Generate the finite matrix before spending: each selected metric must have a positive exercised cell on its designated machine, the ordinary opening gets its selected parent boundaries, and deep probe sets run only on scenarios that execute them. Hardware-only controls do not require all detailed probes to be repeated. There is no need for every helper to run under every unrelated scenario.

Three runs do not establish stable extreme tails for rare operations. Always show `n`. Mark p95 provisional below 100 observed operations and p99 provisional below 1,000; these are reporting heuristics, not statistical guarantees. For a one-off restore, three real restores yield three observations, not a fabricated reliable p99. Do not repeat destructive/rare gameplay thousands of times merely to fill a percentile quota.

Report each repetition, arithmetic mean and range of its mean/median/p95/p99, and a separately labeled merged histogram. Merge histogram counts, not percentile values, for the pooled quantile. A mean of three p95 estimates is **mean run p95**, not pooled p95. For aggregate work use actual total duration and actual invocation count; `sum durations / calls` is the weighted mean. Multiplying a mean by all actors is invalid when some actors skip work or do different work. If offering a normalized estimate, show the assumed opportunities and candidates explicitly.

Record requested and completed actions; no coordinated omission: a slow server must not silently lower the input rate. Retain intended offer time, actual send time, admission time where observable, settlement, refusal/timeout and unresolved count. Give scheduled-to-reply and sent-to-reply distributions separately. End the offered-load window at the driver's recorded cutoff; measure drain separately and retain incomplete operations as censored rather than excluding them silently.

### Window edges and incomplete operations

Use one measured interval `[t0,t1)` in each recorder's clock. Timed cases set the cutoff before starting; fixed-work cases fix the terminating barrier beforehand and record its actual completion as `t1`. Keep selected tokens alive across warmup rather than clearing them at `t0`; mark earlier starts as carry-in. Classify by timestamps, not when a delayed timer callback happens. Record actual boundary-read times/lateness for OS CPU, game state and database statistics; do not present those delayed reads as exact values at `t1`.

Keep two separate accounts. **Window activity** clips synchronous segments to `[t0,t1)`, including carry-in; it is the account to compare with window resource use. Count timestamped work notices there, but leave counts known only at batch completion with that batch; do not prorate items/rows from elapsed duration. **Started-operation latency** includes only operations begun in `[t0,t1)`, following them through the existing drain deadline to settlement or censoring. Its duration sum may extend beyond `t1` and must not be divided by window length and called utilization. Report carry-in, unfinished-at-cutoff, completed-in-drain and still-censored counts. Percentiles use completed observations and disclose censoring; if any remain censored, they are not qualified tail percentiles of all offered work. Report lower bounds for unresolved latencies without replacing them with timeout durations.

At `t1`, stop new driver offers, not accepted effects or ordinary background game work. Post-cutoff work has a separate phase; drain must not leak into steady-state speed/CPU. Close through the ordinary owner after the fixed drain deadline and report its outcome. A capture's final stop releases its tokens; late completions cannot alter exported results. Phase edge handling must work without forcing a world pause or a save merely to create a tidy measurement boundary.

## 6. SQL, storage and asynchronous work

Instrument the existing adapter, not individual query strings throughout the app. Associate every query with its submitting semantic owner (`save`, `receipt`, `retention`, `recall`, `projection`, `checkpoint`, `authority`, `startup` or explicitly unmapped). Keep a normalized template ID and operation/table family; never parameters, utterances, credentials or private memories in public reports. Count SQL statements, adapter calls, grouped transport round trips, transactions and affected/returned rows separately. One call containing ten statements is not one statement.

Measure enqueue→lane admission, client submission→callback, transaction begin→commit/rollback and result decode/application separately. Their intervals overlap. PostgreSQL execution statistics or isolated `EXPLAIN (ANALYZE, BUFFERS, WAL, FORMAT JSON)` on a disposable matched database provide server-side work; adapter elapsed time includes network and event-loop delay. Aggregate query statistics do not provide per-query latency distributions. Obtain those from adapter boundaries, labeled correctly. Never run `EXPLAIN ANALYZE` against the measured live database or inside its timing window; writes in a rolled-back diagnostic still create work and WAL.

At window boundaries collect owned-database statistics: calls, rows, shared/local/temp blocks, WAL where supported, table/index bytes and dead tuples, plus PostgreSQL process CPU/I/O and lock waits. Record availability and instrumentation cost. Do not enable statement logging on every request or claim a physical-I/O delta belongs to one subsystem without attribution. A separately sampled diagnostic can classify statements hidden by grouped transport; its overhead is not part of clean operating evidence.

For saving, measure record discovery, encoding, pending-batch merge, ownership/reference preparation, transaction application and settlement separately. Count changed logical records, prepared row images, bytes encoded, bytes transmitted, superseded rows, actual durable rows and retained bytes. For cleanup distinguish eligible bytes, protected bytes, scheduled work, completed removals, partially dead blocks and physical space reclamation. An archive is not debt just because it is large. For async work include queue age, active work, transfer bytes, stale/discarded results and commit waiting; moving work off the main thread does not eliminate it.

## 7. Hardware comparisons

Use [worker ownership and AWS policy](../../.agents/rules/verification-workers.md), including exact project/Region and exclusive claims. Preserve the standard `m7i.xlarge` baseline. Different types require task authorization. The current simulation campaign's authorized hardware matrix is in the inventory; this guide does not replace that standard for future tasks.

Keep source, scenario, worker/thread counts, database configuration, Node heap limit, storage type/provisioning and observation modes fixed. Record actual instance type, CPU model, logical/physical topology, affinity, cgroup limits, memory, kernel, EBS settings, free disk, CPU steal and background work. A vCPU is not necessarily an independent physical core. Report worker startup and caches separately from timed game work.

Compare complete-server throughput, per-unit latency and cost per simulated hour/useful action. At normal speed, a faster machine may idle more without advancing faster; CPU headroom and a fixed-work completion experiment reveal that improvement. Calculate observed speedup and resource elasticity only over measured points, e.g. `log(throughputB/throughputA) / log(cpuCountB/cpuCountA)` for matched CPU-limit cases. Do not extrapolate a universal scaling law from three machines.

More cores plus more RAM is a combined comparison, not proof of either cause. Use optional controlled limits on the same larger machine to separate them, applied to the entire experiment (Node, workers and PostgreSQL), preserving two SMT threads per selected physical core. Record effective `memory.max`, CPU affinity and fixed DB/heap settings. Memory limits include filesystem cache effects. A constrained result does not impersonate a smaller EC2 instance. If the maintained runner cannot enforce these safely, that cell is blocked; do not bypass the worker supervisor.

### Maintained runner extension and commands

For PC09 extend the runner's existing `environment` profile through its contract validator, campaign admission/estimate, claim selection, machine start/verification and supervisor; a profile contains exact instance type, vCPU/RAM, pinned x86 image/toolchain and price observation. Keep the standard profile as default. A claimed slot must match the requested profile or be safely retired/replaced while unclaimed through the existing lifecycle; never change the instance under another experiment. Cost estimates must use that profile's rate instead of the current four-vCPU constant. Carry actual type/topology/limits into artifacts and reject mismatch before the game starts.

For a separately selected controlled CPU/memory experiment (deferred from the initial PC09 scope), use a supervisor-owned parent cgroup covering the server, its workers and the dedicated worker's PostgreSQL processes; the load driver remains separately measured. Apply only under the exclusive claim, verify effective limits and restore/retire through normal cleanup. Do not move a shared or unowned PostgreSQL service. The worker image/bootstrap contract must explicitly support that placement before H1C can run. Image/source caching, reservations, generation fencing, cleanup and artifact collection retain their existing owners. No new fleet/controller is needed.

After PC07–PC09 are installed and authorized for execution, use the generated adapter rather than hand-writing cloud orchestration:

```text
node --import tsx scripts/performance/profile-campaign.ts plan /absolute/plan.json
# In the maintained runner checkout, using the generated runner-plan.json:
pnpm verify:worker plan /absolute/runner-plan.json
pnpm verify:worker allocate TASK_ID --usd 100 --authorization-ref AUTHORIZATION_REF
pnpm verify:worker run /absolute/runner-plan.json
pnpm verify:worker status CAMPAIGN_ID
pnpm verify:worker collect CAMPAIGN_ID /absolute/campaign/ownership/collected
# In the profiling tooling checkout, after verified collection:
node --import tsx scripts/performance/profile-campaign.ts summarize /absolute/campaign
```

The profiling commands are planned interfaces; `verify:worker` commands are the separately delivered runner's current interface, to recheck against its pinned source before use. The plan adapter fills task/allocation IDs and generates step argument arrays, input bundles and artifact paths using that runner's contract, never a shell string. Reconcile existing allocation status before `allocate`; do not request another $100 per batch. Split jobs/campaigns at its 16-case/job and eight-hour campaign limits while retaining one overall task budget, plan and three-repetition matrix. Only subsequent batches actually dispatched consume new reservations; settle previous uncertainty first. Collection artifacts are indexed into the hierarchy without copying raw payloads again.

## 8. Artifacts and output contract

Use one private local directory per campaign:

```text
/Users/mzw/.codex/verification/OpenLegend/experiments/<UTC-date>-hierarchical-server-<campaign-id>/
  README.md                 # plain-language results, coverage, decisions, exact source
  plan.json                 # frozen requested matrix, budget and assertions
  inventory.json            # resolved IDs, boundaries, units, source bindings
  source/                   # manifests and exact instrumentation patch/archive references
  cases/<case-id>/repeat-1/  # repeat-2 and repeat-3 have the same layout
    manifest.json           # machine, source/tool hashes, config, scenario and seeds
    timeline.json           # setup, warmup, measure, drain, export, cleanup boundaries
    metrics.json            # histograms, counts, sums, outcome/missing-data status
    workload.json           # admitted/completed work, progress and correctness assertions
    resources.json          # per-process/thread CPU, memory, I/O, cost observations
    sql.json                # optional query/transaction families; no parameter values
    profiles/               # optional CPU/allocation traces
    stdout.log
    stderr.log
    completion.json         # result, required artifacts, cleanup and uncertain charges
  summary/
    hierarchy.csv           # one row per metric/dimension/case/repetition
    comparisons.csv         # paired overhead and hardware comparisons
    coverage.csv            # every requested ID and its disposition
    report.json             # machine-readable merged distributions and provenance
    report.html             # static local hierarchy, filters and links, no hosted service
  ownership/                # managed run/collection/cleanup receipts
```

Use owner-only permissions and checksum verified downloads. Private full checkpoints, if needed, stay under the case's explicitly admitted artifact allowance; do not capture a full world for every leaf pass. Keep required manifests, histograms and results even when optional raw traces reach their cap. The managed runner's output/disk ceilings still apply; plan separate cases/bundles rather than increase them silently. The report links raw artifacts by relative path so the directory can move together.

Each metric result includes: ID/parent, timing kind, unit, dimensions, measured source, coverage status, eligible/timed/completed/failed/censored/omitted counts, total/mean/min/max, median/p95/p99 bounds, histogram precision, shared/overlap notes and work denominators. Store unavailable values as null with a reason, never zero. Statuses are `measured`, `sampled`, `not-selected`, `not-exercised`, `disabled`, `unsupported`, `failed`, `censored` and `unqualified-overhead`; a metric can carry more than one applicable limitation. Zero is valid only for an observed count or a duration within stated clock precision.

The human report explains the game operation before the symbol name; includes top disjoint measured costs and separately inclusive stacks; separates CPU, waiting, allocations and write amplification; shows per-unit and aggregate values, shared work and scaling; lists failed starts/warmups apart from completed runs; and states remaining uncertainty and the smallest resolving measurement. Publish one concise canonical evidence report in the existing verification collection. Raw outputs remain outside Git. The final handoff must give the **actual absolute local directory and report file**, cost/reservations/uncertainty and cleanup status—not only an AWS URL or a path that will expire.

## 9. Implementation and execution sequence

1. **Inventory/plan (PC07).** Bind requested IDs to exact sources and enumerate scenarios. Generate the complete matrix and expected artifact sizes/time/cost before AWS admission. Review uncovered entry points and mark exclusions explicitly.
2. **Capture/tooling (PC08).** Extend the current collector with selected hierarchical scopes, capture-owned histograms/tokens and a tool-side adapter. Keep normal runtime off. Extend the existing full-server driver's workload input rather than copy its server, authentication, database and SSE setup. Add `scripts/performance/profile-campaign.ts` only as a plan/report adapter to these owners, not another game runner. Implement its `plan PLAN.json`, `case CASE.json OUTPUT_DIRECTORY` and `summarize CAMPAIGN_DIRECTORY` commands; `plan` and `summarize` never start a game or spend money. These are required future interfaces, not commands available today.
3. **Fixture/runner integration (PC09).** Add the selected campaign’s workload and timing modes to the existing fixture owners; catalogue scenarios are not an obligation to implement all fixtures or unfinished gameplay. Use typed commands and real native transitions. Extend the maintained worker's selected-machine contract if needed; do not create an unmanaged parallel pool. Keep secret/DB injection in the worker. Set case deadlines to include installation, startup, warmup, measured work, drain, output, transfer and the runner's cleanup reservation. A 300-second job with 120 seconds reserved for cleanup cannot fit a 60/120 experiment plus setup.
4. **Correctness and overhead qualification (PC10).** After tooling is complete, run focused deterministic/disposable checks for disabled equivalence, return/throw/cancel, capture stop/restart, token reuse, yields, independent observer privacy, generator continuations, row/statement accounting, histogram aggregation, phase edges/censoring and source-binding refusal. Use the same admitted fixed-work inputs on untouched, disabled and selected-probe builds; compare canonical effects and the affected permitted cognition inputs/result effects through existing supplied-response fixtures. The inventory’s [profiler-safety checks](simulation-inventory.md#profiler-safety-checks) define the initial scope; full mechanics journeys and the full W09 workload are not required. Do not run the unit suite for this campaign. No speed tests locally. Qualify three matched overhead repetitions on AWS before accepting detailed timings.
5. **Execute the finite matrix.** Run all requested cells three times, preserve failures, no replacement by a favorable fourth result. A corrected setup creates a clearly named replacement set of three; old failures remain. Resolve gaps without changing gameplay. Respect the selected campaign’s run allowance; an initial campaign may deliberately select broad parents and only expensive children. Report all unselected layers rather than claim full-inventory coverage.
6. **Review the accounting.** Check unique invocation units, disjoint versus overlapping scopes, actual work, histogram counts, phase edges, DB/process separation and unexplained cost. In a child pass compare its parent active segments with nonoverlapping children in that same pass; report residual and nesting errors. Do not combine parent/control and child runs into an artificial exact partition. Investigate a residual above 5% of server CPU or 10% of an expensive parent's active time with one targeted source/CPU pass, then add the missing named operation or retain an explicit unresolved remainder. These are discovery triggers, not a promise every instruction is instrumented. A fixed run allowance requires a named follow-up plan before extra dispatch; it does not authorize the deferred full matrix.
7. **Collect, summarize and release.** Verify all required local artifacts and worker cleanup, then produce the human hierarchy and concise repository report. Do not begin optimization as part of measurement. A slow result is a completed measurement, not permission to remove features or retune the game.

## 10. Completion and limits

The measurement campaign is complete when every required metric has three qualified observations/distributions in an applicable workload (with honest rare-operation tail limits); substantial residual work is accounted for; source/workload/hardware and overhead are reproducible; artifacts are local; and owned cleanup is confirmed. A report may close a blocked or budget-limited attempt, but required missing measurements, unresolved substantial attribution or uncertain resource cleanup keep campaign acceptance open. Never convert a genuine blocker into a passed campaign.

No claim of zero overhead, exact tiny-operation CPU, statistically proven p99 from three rare calls, all possible gameplay combinations or hundreds-of-characters capacity follows from this procedure. Its purpose is to replace repeated broad guesses with directly measured, reproducible work accounting while protecting the fun and meaning of the actual game.

## Maintained records

- Scope and delivery: [profiling feature specification](../projects/profiling-controls-feature-spec.md#hierarchical-server-campaigns), [technical integration](../projects/profiling-controls-tech-design.md#hierarchical-server-campaigns), [PC07–PC10](../maintainers/profiling-controls.md#hierarchical-server-measurements).
- Measurement constraints: [OB03](../limits/observability.md#ob03--hierarchical-campaign-measurement).
- Current component/workload selection: [simulation inventory](simulation-inventory.md).
