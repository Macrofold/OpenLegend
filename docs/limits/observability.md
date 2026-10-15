# Diagnostics and inspection: limits and constraints

[Feature contract](../performance.md) · [Implementation work](../maintainers/performance-profiling.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values below were source-inspected on 2026-10-06 against the review branch at `7fddcea7c7c1adf79bd53c1dfa16558111c772d3`; synchronization with newer main is deferred. These are implemented limits and known exceptions, not new capacity measurements or approval to expand them. Original recommendations retain the audit rationale. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [intelligence-log.ts](../../apps/server/src/intelligence-log.ts), [performance.ts](../../apps/server/src/performance.ts).

## LA198

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

The PostgreSQL log targets the newest 1,000 records across top-level requests and their processing steps, pruning when writes cross a multiple of 25. This is approximate between pruning passes, not an exact admission ceiling or a complete retained archive. The separate recent-call cache tries to evict a non-running record above 1,000 entries but retains running records, so it can exceed that count and has no aggregate byte bound. Neither limit describes the independently bounded pending-write queue below.

**Reason / tradeoff:** Separate saved debugging history from the small display cache, retaining failed requests long enough to investigate them.

[Diagnostic storage](../../apps/server/src/store.ts) · [Recent-call cache](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

## LA199

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

After cleaning and serializing a diagnostic record, the logger replaces input above 500,000 UTF-8 bytes with an omission notice. If the complete serialized record exceeds 1,000,000 bytes, it removes captured exchanges, then replaces output with an omission notice if still oversized. It does not perform a final whole-record rejection after that replacement. These are capture-reduction thresholds, not a bound on the initial traversal/serialization work or a guaranteed maximum for arbitrary remaining metadata. Accounting receipts remain with their separate durable owner.

**Reason / tradeoff:** Keep full accepted inputs available for debugging or explicitly show what was omitted and how to retrieve it safely.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Expand**.

## LA200

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

One Intelligence call retains at most 100 HTTP exchanges; overflow preferentially removes the oldest GET, otherwise the oldest exchange. The current array does not retain an omitted-exchange count. A non-streaming response clone is captured up to 1,000,000 bytes and marks truncation when larger; this does not limit the original response or independently bound each request body. Streaming event bodies are deliberately omitted without draining a clone, so capture does not delay live delivery; the final typed result is recorded separately. LA199 can remove the entire exchange list when the complete record is too large.

**Reason / tradeoff:** Keep useful failure exchanges and make any removed poll history or oversized body clearly visible to the person debugging the call.

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

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Server monitoring retains up to 64 timing categories, 32 counters and 32 current-value measurements. Each timing category keeps a 256-sample ring for recent percentiles; its count, total duration and maximum aggregate across all recorded samples in the process. New category/counter/measurement names are silently ignored after their respective capacities are reached, while existing names continue updating. The optional duration observer receives spans before the retained-category limit is applied. A missing category in the snapshot therefore does not prove that its work did not run.

**Reason / tradeoff:** Keep monitoring memory bounded and report when extra measurement names are ignored so profiling gaps are not mistaken for zero work.

[Performance monitoring](../../apps/server/src/performance.ts).

Original recommendation: **Keep**.

## LA210

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The event-loop histogram requests 20-millisecond resolution. A one-second timer samples process CPU, heap, resident memory and event-loop percentiles/maximum, then resets that histogram. Garbage-collection durations are recorded separately through the performance observer. These intervals do not establish complete short-delay capture or a one-second maximum delay; shutdown removes the timer and monitoring observers.

**Reason / tradeoff:** Keep lightweight monitoring while recognizing that these samples do not capture every short scheduling delay.

[Performance monitoring](../../apps/server/src/performance.ts).

Original recommendation: **Keep**.

## SV18

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

**Checkpoint stress-tool envelope:** default 100,000 sources and three rounds; accepted source range 128–200,000 and round range 1–10. Out-of-range arguments are refused. These are benchmark-tool bounds, not supported world capacity or evidence that all allowed sizes passed.

**Reason / tradeoff:** Keep a disposable local run finite and practical; exact values are engineering choices. Change the tooling envelope only for a named qualification workload, preserving zero-provider spending and explicit report output. No expansion task is justified solely by the existence of these bounds.

[Implementation](../../scripts/stress-checkpoints.ts).

## Diagnostic write backlog

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Queued intelligence diagnostics retain the latest snapshot per call ID, with at most 1,000 pending IDs or 16 MiB of encoded records, plus an active drain batch of at most 64 IDs. Updates waiting within a 100 ms drain delay or behind storage coalesce. Each drain passes at most 64 distinct IDs to bounded multi-row SQL writes; adapters without that operation retain sequential writes. The inspector may therefore lag capture by about 100 ms plus storage wait. Distinct IDs stay distinct until capacity is exhausted; overflow omits the oldest pending diagnostic and reports a warning. Graceful shutdown drains pending records. A failed optional batch can be lost; in a sequential adapter, one failed record does not prevent attempts to save the later unrelated records. No automatic retry is added.

**Reason / tradeoff:** A slow database must not create an unlimited pending-write backlog or save every superseded inspector state. The queue bounds do not also bound the separate recent-call cache, running-call objects or capture traversal/serialization; LA198/LA199 retain those distinctions. This changes diagnostic completeness during overload, never command receipts, spending records, source evidence or accepted effects. The former write promise chain had no backlog bound. Revisit if ordinary supported workloads overflow; no higher value is recommended without evidence.
