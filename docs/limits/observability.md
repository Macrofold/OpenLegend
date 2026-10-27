# Diagnostics and inspection: limits and constraints

[Feature contract](../performance.md) · [Implementation work](../maintainers/performance-profiling.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

The original source inspection was 2026-10-06 at `7fddcea7c7c1adf79bd53c1dfa16558111c772d3`. The October 15 documentation audit reconciled these capture, queue, query and monitoring bounds with the integrated source at local `main` `8ce0e2a236904b1a343cf6a07227b63e8a1968c1`; it adds no runtime measurement. These are implemented limits and known exceptions, not new capacity measurements or approval to expand them. Original recommendations retain the audit rationale. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [intelligence-log.ts](../../apps/server/src/intelligence-log.ts), [performance.ts](../../apps/server/src/performance.ts).

## LA198

**Current — source inspected 2026-10-18 · Restrictiveness: Very safe.**

The PostgreSQL log targets the newest 1,000 records across top-level requests and their processing steps, pruning when writes cross a multiple of 25. This is approximate between pruning passes, not an exact admission ceiling or a complete retained archive.

The logger shares one 16 MiB encoded-content budget and 1,000-entry allowance across unique recent, pending and actively written snapshots plus active capture reservations. A snapshot shared by recent lookup and pending storage is counted once; a write keeps its reference until it actually finishes. Each active capture reserves 3,000,000 bytes for its initial record/input, exchanges and final output. Completion or logger shutdown retires the capture and drops its content references; inherited late callbacks cannot record after that retirement. Capacity pressure evicts optional recent/pending snapshots, including running snapshots; active reservations and writes remain pinned. If capacity is still unavailable, the original operation runs without that optional capture. Logger-local counters distinguish omitted content, records and captures through the authorized performance endpoint.

These counters describe admitted encoded content, not exact JavaScript heap use. Bounded temporary preparation, decoded object overhead and the original operation's own inputs/results remain separate costs.

**Reason / tradeoff:** Keep debugging retention finite even with concurrent calls and stalled storage. The former recent-call cache had no aggregate byte allowance and exempted running records from its count target. Replacing that exception can omit useful running diagnostics sooner; required accounting, gameplay outcomes and their durable receipts remain independent.

[Diagnostic storage](../../apps/server/src/store.ts) · [Recent-call cache](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

## LA199

**Current — source inspected 2026-10-18 · Restrictiveness: Safe.**

The shared diagnostic preparation owner limits a call's captured input to 500,000 encoded UTF-8 bytes and every complete retained record to 1,000,000 bytes. Each newly prepared value has a 20,000-visit traversal allowance, including property and numeric-array classification work, and a maximum nesting depth of 32. String size is checked before parsing embedded JSON or preparing escaped output. Cumulative fresh source text, including property names and decoded embedded text, is limited to twice the encoded-byte allowance per preparation: 1,000,000 source UTF-8 bytes for input and 2,000,000 for a complete-record-sized value. The factor of two accommodates a JSON body plus its decoded strings while bounding repeated large text that redacts to tiny output; source text already owned by a prepared fragment is not examined again. Owned immutable fragments retain their sanitized value and encoding for reuse; caller-owned mutable inputs never qualify for that reuse.

Oversized, overly complex or malformed JSON-looking optional fields become omission notices. Incomplete JSON never falls back to prose redaction, which cannot safely interpret quoted or escaped secret keys. If a complete record still exceeds its allowance, preparation removes exchanges and then replaces output; a record that still cannot fit is omitted. Each omission is counted. The original operation's input/output and authoritative accounting are unaffected. These are per-preparation traversal and encoded-size limits, not a CPU preemption guarantee or a peak-memory measurement.

**Reason / tradeoff:** Preserve the existing 500,000/1,000,000-byte content envelopes while enforcing them during preparation and before retention. This replaces full traversal followed by repeated serialization and the missing final complete-record refusal. The traversal, source-text and depth bounds can omit a complicated or heavily redacted but otherwise small diagnostic value; explicit omission is preferable to delaying the operation merely to record optional detail.

[Shared preparation](../../apps/server/src/diagnostic-capture.ts) · [Logger admission](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Expand**.

## LA200

**Current — source inspected 2026-10-18 · Restrictiveness: Safe.**

One Intelligence call retains at most 100 HTTP exchanges within a conservative 1,000,000-byte encoded exchange allowance. To admit a newer exchange, the logger removes the oldest GET exchange first, or the oldest exchange when no GET remains, until both allowances fit; these omissions are counted. Request text passes through the same bounded sanitization owner. The network observer checks live content interest before retaining each diagnostic chunk and again before its final content copy. It retains a diagnostic prefix of already-consumed response bytes, capped at 1,000,000 bytes with explicit truncation. It opens no additional reader or response clone. Streaming event bodies remain omitted; the final typed result is recorded separately. LA199 can remove the entire exchange list when the complete record cannot fit.

**Reason / tradeoff:** Bound optional capture before decoding and retention, and keep delivery independent of a second body reader. The existing preference for newer exchanges and removal of polling history now also applies when encoded bytes reach their allowance. The separately captured final outcome and omission counters remain available, but neither is a complete HTTP history.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Expand**.

## LA201

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

The Intelligence logger hides numeric arrays longer than 32 numbers, or arrays in known embedding-related data, to avoid storing search vectors.

**Reason / tradeoff:** Identify actual search-vector fields instead of hiding every long numeric array, which might contain legitimate diagnostic data.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

## LA202

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The grouped Intelligence list displays 25 top-level requests per page and fetches a twenty-sixth as a continuation sentinel. Its single child-step query is limited to 1,000 records across all roots on that page, not 1,000 per root. The detail query uses that same limit for one root. `stageCount` counts returned children; there is no child continuation or exact omitted-child count. Details explicitly warn that only retained diagnostics are shown, but the root-page `hasMore` flag describes roots only. Do not interpret these summaries or their known-cost subtotal as complete workflow or accounting history.

**Reason / tradeoff:** Keep small display pages while ensuring the selected request's recorded processing steps remain accessible.

[Grouped/detail projections](../../apps/server/src/cognition-inspection.ts) · [SQL paging](../../apps/server/src/store.ts).

Original recommendation: **Keep**.

## LA203

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The creator-scoped `/api/god/triggers` endpoint accepts offsets from 0 to 1,000 for grouped root pages. `/api/god/intelligence-calls` accepts 0 to 1,000,000 for 25-record raw-call pages. Both query retained diagnostic rows under the caller's access scope; the larger offset does not recover records already pruned under LA198.

**Reason / tradeoff:** Use a saved-record cursor to reach older available records rather than making a numeric page offset hide retained history.

[Request boundaries](../../apps/server/src/http.ts) · [SQL paging and access](../../apps/server/src/store.ts).

Original recommendation: **Replace**.

## LA204

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The grouped-trigger request schema limits search text to 200 JavaScript string units, actor/stage filters to 100, route/outcome to 50 and from/to date strings to 40. The date checks here limit length; they do not themselves validate a date format. These are read-filter bounds, not limits on the stored actor names or provider output.

**Reason / tradeoff:** Keep read-query input bounded, but ensure the permitted filter lengths can express every stored value users need to find.

[Request boundaries](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA209

**Current — source inspected 2026-10-17 · Restrictiveness: Safe.**

Server monitoring retains up to 64 timing categories, 32 counters and 32 current-value measurements. Each timing category keeps a 256-sample ring for recent percentiles; its count, total duration and maximum aggregate across all recorded samples in that capture. New category/counter/measurement names are omitted after their respective capacities are reached, while existing names continue updating. Fixed omission counts report recording calls refused at each name bound without retaining rejected names. Collection is default-off and these bounds apply per explicit capture. The optional duration observer receives spans before the retained-category limit is applied. A missing category in the snapshot therefore does not prove that its work did not run.

The opt-in finite-plan scene workload retains at most 4,000 detailed completed-output examples and 4,000 stopped-plan examples. Per-actor selection/completion totals and completed-output check/match counts continue for the entire run. This reuses the scene profiler's bounded detail convention and does not limit gameplay plans, resource supplies or retained action evidence; later detailed examples are omitted explicitly rather than becoming false successful checks.

With `OPENLEGEND_PROFILE_REJECTIONS=1`, the disposable server profiler additionally counts SQL/maintenance rejections and retains at most ten combined failure examples. Each has start/end clocks and phase labels, a parameter-free SQL prefix of at most 120 characters when present, error name/code of at most 64 characters and message/cause of at most 512 characters each. URL-shaped text in the SQL prefix and message/cause is redacted; arbitrary error text remains private synthetic diagnostic data. Observation-format failures are counted and cannot replace the original rejection. No production pause, deadline, rollback or retry policy changes.

The browser profiler's existing bounded failed-request examples now include the controller's observed wall-clock timestamp, URL path and error. The timestamp allows comparison with measurement bounds; delayed event delivery means it is not the exact network-failure instant. It retains no request body or credentials.

Process snapshots also retain the first 20 failures from background memory-search preparation and intelligence-diagnostic writes, with observed and omitted totals across the process. Each record contains a fixed operation name, timestamp, error class and code of at most 64 characters when available, plus whether the search transaction callback was entered or how many diagnostic calls were attempted. Exception messages, stacks, SQL, parameters, source text and record identifiers are excluded. Missing error codes remain unknown; recording a failure does not retry it.

The accepted-batch application worker reports aggregate completed batches, SQL statement count, total SQL wait, maximum SQL wait and elapsed time separately from game-thread SQL observations. A failed or lost reply increments an unobserved-batch count instead of claiming zero SQL work. Whole-process CPU already includes worker threads; never add worker CPU again. These optional counters are absent off; focused real-worker checks cover both modes and cold reopen, without establishing full-game capacity.

The independent database probe retains its first 4,000 completed timings for percentiles. Whole-run count, total and maximum continue afterward, with explicit retained/omitted counts and percentile coverage; the sample bound does not hide a late maximum or become a claim that the whole soak had the sampled percentile.

**Reason / tradeoff:** Keep monitoring memory bounded and report when extra measurement names are ignored so profiling gaps are not mistaken for zero work.

[Performance monitoring](../../apps/server/src/performance.ts).

Original recommendation: **Keep**.

## LA210

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Only an explicit capture requesting process monitoring creates these resources. The event-loop histogram requests 20-millisecond resolution. A one-second timer samples process CPU, heap, resident memory and event-loop percentiles/maximum, then resets that histogram. Garbage-collection durations are recorded separately through the performance observer. These intervals do not establish complete short-delay capture or a one-second maximum delay; capture stop removes the timer and monitoring observers, including after attempted shutdown.

**Reason / tradeoff:** Keep lightweight monitoring while recognizing that these samples do not capture every short scheduling delay.

[Performance monitoring](../../apps/server/src/performance.ts).

Original recommendation: **Keep**.

## SV18

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

**Checkpoint stress-tool envelope:** default 100,000 sources and three rounds; accepted source range 128–200,000 and round range 1–10. Out-of-range arguments are refused. These are benchmark-tool bounds, not supported world capacity or evidence that all allowed sizes passed.

**Reason / tradeoff:** Keep a disposable local run finite and practical; exact values are engineering choices. Change the tooling envelope only for a named qualification workload, preserving zero-provider spending and explicit report output. No expansion task is justified solely by the existence of these bounds.

[Implementation](../../scripts/stress-checkpoints.ts).

## Diagnostic write backlog

**Current — source inspected 2026-10-18 · Restrictiveness: Very safe.**

Queued intelligence diagnostics retain the latest prepared snapshot per call ID within the shared [LA198](#la198) allowance. Updates waiting within a 100 ms drain delay or behind storage coalesce. Each drain passes at most 64 distinct IDs and their already-prepared JSON to bounded multi-row SQL writes. Moving a record from pending to active storage keeps it charged until the write settles. The inspector may therefore lag capture by about 100 ms plus storage wait. Capacity omissions are counted; graceful shutdown drains admitted pending records. A failed optional batch can be lost and is reported by the background-failure owner. No automatic retry is added.

**Reason / tradeoff:** A slow database must not create an unlimited backlog or save every superseded inspector state. The original unbounded promise chain was replaced by a 1,000-ID/16-MiB pending queue plus an independently retained active batch; the current shared allowance also covers recent records, active captures and writes. Sharing immutable prepared records removes repeated encoding without weakening their ownership. Overload can omit optional diagnostics, never command receipts, spending records, source evidence or accepted effects. Revisit if ordinary supported workloads overflow; no higher value is recommended without evidence.

## OB01 — Explicit browser performance capture

**Current — source reviewed October 16, 2026 · Restrictiveness: Safe.**

The opt-in `?profile=1` scene collector and disposable browser driver retain at most 100,000 raw samples per series, with explicit truncation counts. Whole-run timing summaries continue after that ceiling: 0.25 ms histogram buckets through 1,024 ms plus overflow, exact count/total/maximum, and counts above 25/50/100 ms. Percentiles become reported bounds when raw samples no longer cover the complete run; late stalls are not silently dropped. GPU work has at most sixteen pending asynchronous timer queries. Stop immediately releases active and pending timing queries; `pendingGpuQueries` in the completed report means uncollected at Stop, not resources still alive. New capture clears the five optional landscape diagnostic attributes, whose counts cover that capture rather than the scene lifetime. At most 64 movement watches remain simultaneously unresolved, with sixty-second expiry checked on each delivered animation callback; a blocked callback can retire a watch late. Resolved/expired watches are removed so later clicks can be measured throughout the phase. This is not a first-64-click prefix. Overflow, expired and unconfirmed observations remain explicit rather than being called immediate. Scenario duration arguments are bounded to thirty minutes; canonical detailed browser trace and CPU phase arguments are limited to sixty seconds. Their stop timers request collection shutdown after sixty seconds from startup; a busy browser may acknowledge later, so actual collection clocks and measured overlap are reported rather than assumed. A weak map keyed by actual graphics-program identity retains at most sixteen material/role/pass attribution records per program, with role names at most 100 characters and explicit truncation counts. Console warnings/errors, page errors and failed network requests each retain at most 1,000 details, with each text field limited to 2,000 characters. Total observed and omitted counts remain explicit; omitted diagnostics fail the driver's acceptance result. This replaces the uncapped page-error/request-failure arrays and the console-only cap without omission accounting. Failure-page text remains limited to 10,000 characters.

Raw trace output is limited to 64 MiB and encoded CPU-profile output to 16 MiB. Overflow fails the capture; a partial trace is retained with incomplete stream metadata, while an oversized CPU profile is refused before file creation. Stop-request and browser-acknowledgment times are distinct, with actual trace bytes, stream completion and the browser's data-loss flag preserved. The trace file and browser stream close on write/open failures. The CPU byte check bounds file output after the browser has produced its profile; it is not a bound on browser profiling memory or JSON encoding. These limits protect diagnostic resources and can refuse a useful oversized capture. They do not cap visible people, gameplay activity or event retention. [Qualification and limits](../verification/performance/61-branch-review-and-lessons.md) distinguishes controlled checks from full-game acceptance.

CPU analysis retains at most forty ranked nodes per summary and twenty largest sample-delta examples. Raw profiles remain private; timing-quality faults suppress weighted/phase ranks while whole-profile sample counts remain labeled separately. Unknown node identities are explicit and monotonic overshoot is reported/clipped rather than discarding usable spans.

Frame delivery intervals use performance.now() at animation-callback entry. Raw frame columns retain callback-entry time, delivery interval and the supplied animation timestamp. Whole-run supplied-timestamp lag count/total/maximum continue after raw truncation; initial/final censored callback boundary gaps remain separate from complete-interval percentiles. Earlier October 14/15 captures before the renewed-soak correction use supplied-animation-timestamp differences instead; under host pressure those timestamps can lag callback entry, so their reported percentiles are not actual callback-delivery tails. The runner records its own source SHA-256 outside measurement, separately from the server’s previously captured source fingerprint and loaded app bundle.

The survival-aware browser driver admits at most 1,800 scheduled input slots within its 1,800-second envelope, retaining at most 1,800 public-meter/input observations and 1,800 ground-probe records. The historical strict schedule can catch up after a delay; only the new bounded variants guarantee at least one second between actual slot starts. Each movement input tests at most thirty-two screen coordinates through the opt-in scene owner’s read-only boolean predicate: whether ordinary picking would choose empty visible ground at that point. It returns no world coordinates, hidden route or command. The driver rejects overlay-covered points, varies chosen screen positions, records tested counts/chosen points/no-ground skips and measured probe duration, then uses actual canvas input. Probe work remains inside measurement. Scene teardown clears the callback. Actual HTTP 200 success admissions, rather than canvas clicks or target selections, count as player intentions. The whole-run callback report also retains the twenty largest complete delivery gaps with their callback/supplied timestamps and the occurrence time of maximum supplied-timestamp lag, independently of the raw prefix. The optional `--near-start` survival variant additionally constrains those boolean probes to five metres around the first public player position and retains current public position plus visible-other-person/animal counts in the same bounded input records. `--wait-for-resume` records observed pauses as failed activity gates while waiting for ordinary public resumption, without sending Resume, presence or retries. Either new option uses at least one second between slot starts and skips overdue slots; public-read errors and unavailable players remain fatal. Old strict drifting inputs and their evidence remain distinct.

**Reason / tradeoff:** The requested long mixed-activity soak needs whole-run evidence without retaining every rendered frame indefinitely. Fine traces and CPU sampling are separate diagnostic workloads; capacity samples identify instrumentation and use bounded aggregate capture. Unsupported/disjoint GPU timings and dropped/pending samples are explicit. Public presentation coordinates and timings stay in the local diagnostic report; raw output is private and excluded from Git.

[Collector](../../apps/client/src/scene-performance.ts) · [Browser driver](../../scripts/performance/profile-browser.mjs) · [Reproduction](../maintainers/performance-profiling.md#full-server-scene-profiler) · [PF16](../maintainers/performance.md#october-14-expanded-3-investigation).

## OB02 — Optional profiling controls

**Implemented — source and focused lifecycle checks October 17, 2026; full-game overhead qualification remains tracked · Restrictiveness: Safe.**

The [optional profiling project](../projects/profiling-controls-feature-spec.md) implements `OPEN_LEGEND_PROFILING=off|on`, default off, with a process restart required to change it. The existing browser `profile=1` flag remains independent and local to that tab; its opted-in collector can stop/start within that page. CPU/allocation sampling and detailed traces remain separate explicit instruments. Server capture has one owner per JavaScript isolate; there is no remote toggle or live worker reconfiguration. Tools explicitly select collection rather than relying on ordinary execution being instrumented.

**Reason / tradeoff:** Avoid optional clocks, storage, measurement-only timers and worker statistics during normal play. Restarting is simpler and more predictable than a remote control/worker broadcast system, but cannot recover performance measurements from before collection was enabled. Operational failure records, gameplay history, real deadlines and spending/accounting remain independent. An inactive check, necessary FPS display and external test observations still have costs; neither zero overhead nor a measured speedup is asserted.

The project preserves LA209 timing/name/ring bounds, LA210 monitoring cadence when enabled and OB01 browser retention/query limits. It adds fixed counts of recording calls omitted at name capacity, without a second set of omitted names. The browser's pending-query field identifies uncollected GPU results at stop even though their resources are released immediately. A stopped collector internally retains only its one bounded final report until restart/destruction; explicit external consumers own any exported copies. No new gameplay or stored-history limit is introduced.

There is no new numeric cap on trusted duration-listener count or synchronous listener execution time. The one capture owner clears its listener set at stop, and current tools attach/detach bounded listeners. This is not a user-extensible subscription surface; callbacks must not serialize whole worlds, do file I/O or accumulate unbounded samples. Their enabled CPU cost still requires measurement. This limited trusted-caller choice avoids adding an unneeded queue or scheduling framework.

Initially, `--app-profiling=off` browser comparisons support the existing fixed-input workload, with the same external callback/request observations as the on run. They reject survival input modes that require the optional scene inspection API and reject CPU/trace capture. Missing scene/pose evidence cannot pass a scene-dependent acceptance gate. A separate read-only inspection hook for matched survival comparisons is deferred until that workload requires it; this narrower comparison does not establish full-soak qualification.

Implementation and verification: [PC01–PC06](../maintainers/profiling-controls.md), [technical design](../projects/profiling-controls-tech-design.md), [tool restrictions and comparisons](../projects/profiling-controls/tools-and-verification.md). LA209/LA210/OB01 retain the unchanged numeric bounds; the linked runtime report records measured coverage and limitations.
