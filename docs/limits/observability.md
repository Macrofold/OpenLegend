# Diagnostics and inspection: limits and constraints

[Feature contract](../performance.md) · [Implementation work](../maintainers/performance-profiling.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [intelligence-log.ts](../../apps/server/src/intelligence-log.ts), [performance.ts](../../apps/server/src/performance.ts).

## LA198

**Historical — needs recheck · Restrictiveness: Very safe.**

The Intelligence log stores only 1,000 records total across top-level cognition requests and their individual processing steps; its in-memory recent-record cache also holds 1,000.

**Reason / tradeoff:** Separate saved debugging history from the small display cache, retaining failed requests long enough to investigate them.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

## LA199

**Historical — needs recheck · Restrictiveness: Safe.**

One Intelligence record captures at most 500,000 bytes of input and 1,000,000 bytes for the complete recorded call.

**Reason / tradeoff:** Keep full accepted inputs available for debugging or explicitly show what was omitted and how to retrieve it safely.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Expand**.

## LA200

**Historical — needs recheck · Restrictiveness: Safe.**

One Intelligence call retains at most 100 HTTP exchanges, such as status polls; an individual captured exchange body is capped at 1,000,000 bytes.

**Reason / tradeoff:** Keep useful failure exchanges and make any removed poll history or oversized body clearly visible to the person debugging the call.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Expand**.

## LA201

**Historical — needs recheck · Restrictiveness: Medium.**

The Intelligence logger hides numeric arrays longer than 32 numbers, or arrays in known embedding-related data, to avoid storing search vectors.

**Reason / tradeoff:** Identify actual search-vector fields instead of hiding every long numeric array, which might contain legitimate diagnostic data.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

## LA202

**Historical — needs recheck · Restrictiveness: Safe.**

The Intelligence list displays 25 top-level requests per page, fetches a twenty-sixth to detect another page and reads at most 1,000 child-step records.

**Reason / tradeoff:** Keep small display pages while ensuring the selected request's recorded processing steps remain accessible.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Keep**.

## LA203

**Historical — needs recheck · Restrictiveness: Safe.**

The Intelligence API limits page offsets to 1,000; another history-list API accepts offsets up to 1,000,000.

**Reason / tradeoff:** Use a saved-record cursor to reach older available records rather than making a numeric page offset hide retained history.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

## LA204

**Historical — needs recheck · Restrictiveness: Safe.**

Intelligence search filters cap search text at 200 characters, actor/stage names at 100, route/outcome at 50 and dates at 40.

**Reason / tradeoff:** Keep read-query input bounded, but ensure the permitted filter lengths can express every stored value users need to find.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Keep**.

## LA209

**Historical — needs recheck · Restrictiveness: Safe.**

Server performance monitoring tracks 32 timing categories, 32 counters and 32 current-value measurements, retaining 256 timing samples per category.

**Reason / tradeoff:** Keep monitoring memory bounded and report when extra measurement names are ignored so profiling gaps are not mistaken for zero work.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Keep**.

## LA210

**Historical — needs recheck · Restrictiveness: Safe.**

Server event-loop delay is sampled at 20-millisecond resolution, with monitoring summaries refreshed every second.

**Reason / tradeoff:** Keep lightweight monitoring while recognizing that these samples do not capture every short scheduling delay.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Keep**.
