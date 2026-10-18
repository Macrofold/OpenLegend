# Can unrelated record writes share a database request?

October 16, 2026. **Completed four running-game comparisons. Fewer requests and shorter saving, but the responsiveness target still fails; change remains private.**

The current short graphical game performs 126 saves with 2,495 statement requests: about twenty requests per save. Its longest recorded save takes 897 ms, including 878 ms awaiting statements. That waiting includes database work, transport and application scheduling; it is not measured database CPU. Accepted walking confirmation still reaches 646 ms at the 95th percentile.

The existing batching owner already sends independent table writes together. It stops a group whenever another write names a table already present. Actual slow-save recordings show repeated splits between newly inserted records and updates to different existing records in the same table. PostgreSQL forbids changing the same row twice inside one such statement; that is more specific than forbidding every pair of writes to a table.

Test a narrow change at the existing batching/record-writing owners. The world-record writer may supply its exact record IDs as proof that two writes are disjoint. The batch may share a request only when it has complete disjoint-ID proofs from both writes. An overlap or missing proof keeps the existing flush. Tables with additional unique indexes retain the existing order and barriers, because different primary IDs do not prove independence of those constraints. The current schema has four such tables. Do not combine deletes with their preceding writes, read after an unflushed write, or put values into SQL text.

This is approximately 35–65 runtime logic lines in two existing server files. There is no universal deferred queue, driver replacement, new gameplay state, weaker durability, changed authority, history pruning or altered record order. Existing 64-write, 10,000-parameter and approximately 256 KiB bounds remain. The disjoint-ID metadata is bounded by the same admitted row groups and lives only for the current batch. Unknown future writers receive no shortcut without their owner's proof.

Before actual gameplay, qualify source/types/packages and the actual navigation worker. Reuse unchanged native/active-animal evidence only by exact unchanged computation/helper identity. Evolve the existing real PostgreSQL proof to compare control/candidate contents and request counts for mixed new/changed records, parent/child creation, repeated/overlapping IDs, insert-only duplicate refusal, secondary uniqueness and write-before-delete behavior. Retain meaningful rollback, discarded/competing preparation, paging, normal reopening and private correction/forgetting coverage through the existing storage proofs. Check both normal and failed owned cleanup.

Only a demonstrated reduction in complete controlled-save requests with identical saved contents and successful functional/failure checks releases four fresh two-minute control/candidate/candidate/control gameplay phases. Use the qualified combined system as parent, unchanged finite provisions, 300-second outer process and ordinary SQL limits, no sampler, extra counters, paid provider, forced collection or refill. Compare actual command delays, saving, CPU per completed activity, residents' travel/own food and all survival/errors/cleanup. A smaller request count alone is not a speedup or a smoothness pass. Keep every failed trial and the earlier negative batching results.

[Existing batching design](../../projects/save-round-trip-batching-tech-design.md) · [Current graphical evidence](42-combined-graphical-survival.md) · [Standalone bottleneck report](bottlenecks.md) · [Plan](../../projects/three-times-scene-performance.md#disjoint-record-write-group-trial)

## First control-helper failure

Both private sources pass formatting/equivalent execution, TypeScript, package/source bindings and the actual navigation worker. The first unchanged-control database proof reaches the current mixed-save and raw batch controls, then stops because the new helper imports a nonexistent class name for the existing record writer. No candidate or performance comparison starts. Its owned database, sessions, directory and process all close normally, with source/package checks unchanged. Preserve the failed helper/report. Correct only the helper's import/constructor to the actual exported class on fresh helper/output paths; do not alter either runtime candidate or any limit. The unique-index and parent/deletion controls remain uncompleted at this point.

## Current SQL checks pass before actual timing

The corrected helper uses the actual exported record writer, with both runtime sources unchanged. Both versions pass complete current saving, loading and reopening; private observations, corrections and forgetting; ordinary event audiences; and all nine new grouping, ordering and failure controls. Complete saved-game contents and every row of all 131 canonical record tables match exactly. The original failed helper and control report remain separate.

| Check                                                        | Ordinary grouping | Disjoint-row grouping | Result                                             |
| ------------------------------------------------------------ | ----------------: | --------------------: | -------------------------------------------------- |
| New and updated writes to different records in one table     |        2 requests |             1 request | Same rows and checked outcomes.                    |
| Complete mixed item/pose save after reopening                |       76 requests |           75 requests | Same complete saved game and all 131 table hashes. |
| Same record updated twice                                    |        2 requests |            2 requests | Sequential effects preserved.                      |
| A writer supplies no complete record-ID proof                |        2 requests |            2 requests | Existing barrier retained.                         |
| Existing 256 KiB size bound                                  |        2 requests |            2 requests | Disjoint IDs do not bypass size protection.        |
| Additional uniqueness rule, through the actual record writer |        2 requests |            2 requests | Required update-before-insert order preserved.     |
| Parent/child writes before cascading parent deletion         |        2 requests |            2 requests | Child survives with its new parent.                |

Both failed-row checks and actual duplicate-insert errors roll back every grouped effect. The complete mixed save is a **cold first write after reopening** and includes many history reads. Its 76 → 75 requests do not describe the ordinary game's roughly twenty requests per save, or establish saved milliseconds. No timing benefit is inferred from this functional proof.

The existing nine-group recent-result storage proof also passes on the current candidate. It covers unchanged surviving records, order and paging, discarded and competing prepared saves, rollback, checkpoint restoration and independent repository use. Every generated database, session, directory and process is absent after normal close, with unchanged source, package and navigation-worker identities. The running-game comparison is released only after those checks.

The complete source comparison establishes that all world calculations, navigation, current-format validation, opening construction and native/active verification helpers are unchanged. Only the two SQL writer files differ, so their earlier world-behavior evidence is reused without claiming a new world-calculation CPU gain. Four fresh two-minute viewer/HTTP phases run in control/change/change/control order, with original finite resources, the 300-second outer bound and ordinary SQL limits. There is no sampler, extra counter, paid provider, refill or forced collection.

The first control completes at **3.00017×**, with 119 accepted commands, no missed slots, 192 resident plans, 176 matching meals and all seventeen people and forty animals alive. Walking confirmation p95 is **376 ms**, so responsiveness still fails. Source checks and normal exact owned cleanup pass. At that stage the first candidate is still running; the single control does not establish a benefit.

Proof reports: `/private/tmp/ol-pf164-postgres-{0-control,1-candidate}-20261016-b.json`; comparison `/private/tmp/ol-pf164-postgres-comparison-20261016-a.json`; recovery `/private/tmp/ol-pf164-result-proof-candidate-20261016-a.json`; release `/private/tmp/ol-pf164-actual-release-20261016-a.json`.

The actual-game control source hash is `d211c2b341aa5f6805eef6d774111b9fbfd1c1c6fb17ad8e1cdf637e3873359e`; the candidate is `20e197eb5b202aa5820338ca398b23a3624af1db90c4ba5f33b86b152028d7d5`. No canonical executable is changed.

## Four actual two-minute games

Each run uses a fresh, equally provisioned world with seventeen people, forty animals, 133 other objects, ordinary resident travel/work/food and one walking input per second. Together the sixteen residents select 192 plans (twelve each) and complete 176 checked meals. All people and animals survive, with no game or storage errors. Source, package, worker and exact owned cleanup checks pass in all four. These are HTTP/viewer games, without a graphical browser.

| Order | Version               | Actual speed | Walking confirmation p95 | Requests per save | Total elapsed saving | Player commands accepted / missed slots |
| ----- | --------------------- | -----------: | -----------------------: | ----------------: | -------------------: | --------------------------------------: |
| 1     | Ordinary grouping     |     3.00017× |                   376 ms |             21.16 |              35.16 s |                                 119 / 0 |
| 2     | Disjoint-row grouping |     2.98923× |                   395 ms |             16.21 |              32.09 s |                                 119 / 0 |
| 3     | Disjoint-row grouping |     2.99834× |                   510 ms |             16.20 |              33.64 s |                                 119 / 0 |
| 4     | Ordinary grouping     |     2.99833× |                   666 ms |             20.71 |              39.63 s |                                 117 / 2 |

| Average of the two runs of each version | Ordinary grouping | Disjoint-row grouping |                              Change |
| --------------------------------------- | ----------------: | --------------------: | ----------------------------------: |
| Requests per save                       |             20.93 |                 16.21 |                         22.6% fewer |
| Total elapsed saving                    |           37.39 s |               32.87 s |                       12.1% shorter |
| Process CPU                             |           80.39 s |               79.45 s |                           1.2% less |
| CPU per completed game second           |          3.722 ms |              3.684 ms |                           1.0% less |
| Average per-run walking p95             |            521 ms |                453 ms | 13.1% shorter, with large variation |
| Actual speed                            |          2.99925× |              2.99379× |  Essentially unchanged; 0.18% lower |

The database-request reduction is clear in both changed runs. The whole-game speed gain is absent. The walking improvement is uncertain: the first control beats both changed runs, and the last control has a 1.52-second maximum save and two missed input slots. Host load varies too. Do not turn the average into a pooled percentile or a stable causal input improvement. All four walking p95 values fail the 200 ms target.

The saving and SQL/queue spans overlap other work and are not additive CPU. The changed version reaches only 192 recent character results, so its inherited stable-result rollover optimization is not exercised. No person sleeps or wakes during these short phases. Minimum verified resident travel is 83–86 metres. The fresh opening grows from 280 entities to 463–465 and from 62 permanent command records to 983–985; this is not mature-world qualification.

**Decision:** retain the implementation and complete correctness evidence privately for comparison. Do not integrate it as a solution to walking latency or sustained smooth 3×. It is a measured request-reduction option without gameplay loss, with a promising saving-time result and unresolved whole-game benefit.

Comparison: `/private/tmp/ol-pf164-fresh120-comparison-20261016-a.json`, SHA-256 `3ef0e6e58bcd81613cc6fa214aade9616e6fabb532fa028e60d43846419260ef`. All original reports, individual failures and normal closure records remain.
