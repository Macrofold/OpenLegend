# Hearing 8× continuation — 2026-09-25

This annex records the continuation from `9964c18bb00d4279c8a848a74a0173490e51190d`. [HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification) and [PF03](../maintainers/performance.md#pf03--native-cpu-and-incremental-admission) retain implementation/acceptance ownership. The [prior cache review](hearing-cache-review.md) remains historical evidence, including its unsuccessful host run and unpublished ownership prototype; neither is overwritten by a faster result here.

## Delivered changes and scope

Before runtime edits, recovery commit `bc3249d` recorded the next steps and strict invariants in the HE tracker. Main `03105fed9209c126e4e69e9faeb4687f42d1e74a`, including the `fdcbd31` rules update, was already an ancestor of this branch. No rebase, force push, main modification or CI change was needed in this continuation. All Git writes used the connector.

`87d4622` prepares immutable status-condition operators once, weakly keyed by the complete immutable condition tree. It does not cache truth values, attributes, entity bindings, capability flags or clock values. Mutable and shallow-frozen trees are not retained as compiled plans. The canonical contract is [Status effects](../status-effects.md#transitions). This is handwritten interpretation preparation, not generated JavaScript or a replacement mutation engine.

`9d3fe0e` removes display-point/exit-fraction allocation from direct sound-transmission queries, omits neutral factors from the multiplication list, and stops after an exact opaque intersection. For admitted finite energy ratios in [0,1], an opaque factor proves the result is zero. Other attenuation factors retain the original fraction/ID order. The public complete `rayHits` query and its callers are unchanged. No hearing radius, recipient, source, sentence fragment, geometric tolerance or privacy rule is relaxed.

The proposed mutable-entity working-set prototype remains unpublished. A narrower local experiment replacing each status-instance row with a frozen copy was also discarded: it preserved the measured world digest but did not improve the profile. Standard domain draft ownership remains in use.

## Host and verification boundaries

Node 22.16.0, Linux x64, AMD EPYC 9V74 reported by the container, five visible logical CPUs, cgroup CPU quota equivalent to four cores and a 4 GiB memory limit. Each native simulation process is single-threaded. The restored runtime files were checked against their remote content hashes; both changed production module hashes match their committed blobs. Temporary observation programs, databases and CPU profiles stayed outside the repository.

Production TypeScript, generated-status configuration checking, changed-module formatting and the Vite build passed. Vite retains the existing large-bundle warning. Full typechecking failed with **the same 168 diagnostics and identical diagnostic text** in the baseline and revised source, all in existing test/fixture sources. No automated test files or test suites were written, edited or run. No paid provider or external model calls occurred; task spending was $0.

These runs do not qualify live models, PostgreSQL, HTTP/SSE network latency, real PlayCanvas rendering, accessibility or a long-session production capacity envelope.

## Status interpretation and transition observations

The original interpreter and prepared implementation returned identical results for the authored conditions across five manual day/night, energy and incapacity states, and for the frozen snapshot. A shallow-frozen condition with an edited mutable leaf changed from true to false; a mutable composite with an edited threshold also changed from true to false in both implementations.

A tight preparation-cost observation evaluated the same authored conditions for 50,000 sweeps. Two interpreter samples took 115.35 and 114.86 ms; prepared samples took 55.39 and 49.46 ms. Each sample returned 250,000 true results. This isolates repeated interpretation on a stationary state; it is not a whole-game speedup.

A 120-second native observation starting near the authored night boundary compared reference one-second advances with native slices at all 31 slice boundaries. The worlds matched, including final digest `4b8966dfba41d0d027de92a543cf67a75b8fed3044f29c3b45f2f6d870fd58f0`; the frozen original remained unchanged. This supplements the existing broader status/mutation qualification, not proof of every target, policy edit or nested command path.

## Exact transmission workload

A seed-73 map with 60 additional supported blocker records exercised 8,000 deterministic source/receiver rays. Geometry revision was advanced before querying. Blocker energy ratios cycled through 1, 0.99, 0.7, 0.2 and 0. Both the public complete-hit reduction and revised transmission query produced digest `bfddc1dba206c20f312b0999b6e2e4e7315e208bc7967a3c7ecf0b3d2e27d720`: 6,985 opaque, 453 partly transmitting and 562 fully transmitting paths.

Three sequential full-hit/revised samples, in milliseconds, were 86.14/24.50, 79.76/19.52 and 76.78/18.70. This obstructed, query-only workload benefits from early opacity and reduced allocation. It does not claim a fourfold improvement for open terrain, cached paths, native simulation or persistence. Complete acoustic ordering remains covered by the deferred SR01/SR03 and HE-T01 cases in [TODO](../maintainers/TODO.md).

## Native simulation

The checked-in `mixed-8x.json` workload used 10 added people, 20 animals, 300 rigid observation objects, seed 73, 2,400 simulated seconds, no warmup, requested speed 8 and native-slice execution. Matched sequential baseline/revised samples on this host:

| Metric | Baseline | Revised |
| --- | ---: | ---: |
| Native elapsed ms | 3608.42 | 3382.57 |
| p95 slice ms | 7.058 | 6.404 |
| Maximum slice ms | 155.58 | 157.41 |
| Native headroom versus 480 simulated seconds/wall second | 1.386 | 1.478 |

Both produced 344 entities, 3,342 events, 3,602 awareness entries and digest `2f3e7f706450419650af972894e544fb50d6d40bfeaae64d6a9189cbd0b401b4`. Short repeated predicate-only samples varied more than this single table suggests, so no statistically established end-to-end percentage improvement is claimed. Average throughput clears this workload's 8× requirement; the maximum indivisible slice still exceeds PF's 8 ms responsiveness target.

A separate dense native workload cloned the older `mixed.json` configuration, set 100 added people, 2,400 steps, no warmup, speed 8 and native-slice execution. Unlike `mixed-8x.json`, its 300 objects are three groups of 100 gems, food parcels and fuel. It produced 434 entities, 33,588 events, 39,191 awareness entries and identical baseline/revised digest `28d78ebec0ad1e05f9cb89cc3f07c947936a63b2a5014b94e77c23dddfdc5435`. Elapsed samples were 17,520.67/18,245.86 ms and maxima 1,234.42/1,065.55 ms. This dense workload **fails 8×**; the small-world improvements do not establish dense capacity. Sample timing variance and other native work prevent attributing its difference to the two local changes.

## Independent speech, disk SQLite and full projection

The existing independent producer driver ran for 60 real seconds at requested speed 8, with 10 added people, 20 added animals and 300 observation objects (344 entities). It offered eight utterances per wall second, cycling whisper/normal/shout, against actual WorldService transitions and disk SQLite. It also serialized complete public views after completed ticks. One speech request is in flight at a time; scheduling lateness and unmet demand remain explicit rather than being hidden by awaiting catch-up before offering speech.

Final combined-source result:

- Planned / attempted / accepted utterances: **480 / 480 / 480**, zero unattempted requests, no storage error.
- 28,827 simulated seconds advanced; 28,827.659 requested; final debt **0.659 simulated seconds**.
- Total measured time including final drain/flush: 60.180 seconds, equivalent to **7.984×** on that denominator. The admitted active clock was 60.058 seconds. This is consistent with keeping up during the active window, not an assertion of zero shutdown overhead.
- Speech request-to-commit median 6.075 ms, p95 9.101 ms, maximum 120.100 ms. Scheduling lateness, measured separately, was 6.373 ms median, 20.027 ms p95 and 129.104 ms maximum. Commit timing alone excludes a timer delayed before dispatch and is not end-to-end player input latency.
- 1,080 full-view serializations, projection p95 8.325 ms, final heap about 120.8 MiB. This is neither a browser frame rate nor a maximum-heap/soak measurement.
- Native slice maximum 176.42 ms. Its final 256-sample window had p95 10.19 ms and p99 13.60 ms; these are a recent window, not whole-run percentiles.

An earlier predicate-only 60-second run also accepted all 480 utterances and ended near 8× including drain (7.995×), but the timing difference is not an isolated transmission improvement. The final module combination above is the release-relevant observation.

## Remaining acceptance and reproduction

**Keep HE05/PF03/PF09 open.** The 344-entity active-clock run kept up; cold and tail responsiveness, the 100-person native workload and portable sustained capacity remain unqualified or failing. No unsent work, audible recipient, event, status rate or simulated time was pruned to create a passing result. A worker would move blocking but would not by itself fix single-thread throughput; profile dense perception/finalization and live status reads before changing ownership or fidelity.

Use fresh output paths with the existing runners:

```sh
AI_BUDGET_USD=0 node --import tsx scripts/stress-native.ts scripts/performance/scenarios/mixed-8x.json /tmp/hearing-resume-native.cpuprofile > /tmp/hearing-resume-native.json
AI_BUDGET_USD=0 node --import tsx scripts/stress-hearing.ts /tmp/hearing-resume-server 60 10 8 > /tmp/hearing-resume-server.json
```

The native child has its existing watchdog. The disk driver limits offered input duration, not a slow final drain. One interrupted local driver attempt produced no report and is excluded from the results above. Detailed new predicate/opaque-path regression cases are recorded with the HE05 recovery work and cross-reference the existing status/SR coverage in TODO; automated acceptance remains deferred.
