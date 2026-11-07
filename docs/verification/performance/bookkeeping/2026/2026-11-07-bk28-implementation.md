# BK28 implementation and adoption — November 7, 2026

## Scope and source

[BK28](../../../../maintainers/production-data.md#bk28--receiving-preparation-and-command-wait-removal-proposed) implements the [receiving/retention design](../../../../projects/bookkeeping-simplification-tech-design.md#20-receiving-preparation-and-command-wait-removal). Source conversion, affected review, functional checks and selected AWS comparisons are complete. Final source passes the single-run normal-clock check, but reliable progress, CPU headroom and broader operating qualification remain unmet. The configured local startup gate is separately blocked below.

Repository: Macrofold/OpenLegend, local `codex/stealth-runtime-01-evidence`, `/Users/mzw/.codex/worktrees/7f12/OpenLegend`. Accepted design base `11e2e395681639f527b912dcff11ef7b2931f520`; adopted runtime `d435c054b6a510fa25634750ff64d44d0c46d583`. No branch/checkout switch, push or merge. Development format is schema 57; comparison sources initialize their own matching databases without migration.

The [pre-BK28 investigation](2026-11-07-latest-runtime-isolation.md) measures source `934190d80`, not this implementation. Its clock/CPU/latency and checkpoint census remain historical evidence.

## Functional evidence

- Typecheck, configuration check, production build and asset guard pass. Existing PlayCanvas browser-externalization and large-bundle warnings remain. No unit suite or new maintained tests.
- `d03b5c18e`: 50 focused checks pass across SQL overlays/source retention (12), memory/expiry/cold restoration (17), native selection (4), support-reference races (4), actual player projection (5), concurrent/cold/expired receipts (6), protected failure (1) and failure after ordinary live acceptance (1). The memory count includes its 13 native checks; do not count them again.
- SQL checks exercise typed scope removal, pending recreation, partial/null updates, actor/private cuts, exact pending-only source archival, selected predecessor batching, due selection and empty-work avoidance. Four cold originals share one memory-header batch; another changed table has its own batch, with no redundant body hydration.
- Independent native knowledge expiry, 96-actor fair cohort selection and dirty-generation fencing pass. A newly retained account adopting old evidence invalidates support cleanup; unrelated appends still permit release. Missing proof and watch overflow reject cleanup.
- Memory checks preserve required results, meaningful/unknown/bound outcomes, deliberate summary decisions, independent support and exact correction/forgetting through actual PostgreSQL closure, save and cold reopen. Eligible own routine travel is discarded only after existing exact support releases.
- Actual player projection preserves unknown identity, independently unchecked old description and newly received body/position. Body-grant withdrawal, death/life change and session authority change during real practice hydration fence publication.
- `93cf4fe20`: ten disposable dispatcher cases pass locally and on AWS for overlapping preparation refusal/read failure, fingerprint conflict, expiry, authority, generation/timeline and unchanged no-prior failures. Actual native execution and the receipt-install owner are used with controlled writer/read/authority boundaries; these are not PostgreSQL durability results. The actual PostgreSQL overlap check and all eight existing receipt/failure cases also pass on this pin: one accepted native utterance is replayed despite a later preparation refusal, without another effect or weakened authority.

All fixtures are disposable and use native acquisition and existing storage owners. There are no paid game-model calls; these checks do not qualify live-model quality, enjoyment, mature memory or population capacity.

## Measurement protocol

All speed measurements use the standard managed m7i.xlarge worker: four vCPUs, 16 GiB, owned local PostgreSQL, source-specific private workspace bindings. Final worker `i-01bdb83b2c3aadf43` runs Node 24.13.0, pnpm 10.33.0 and PostgreSQL 16.15 in project `027677879749`, us-east-2. Workspaces are checked before execution and their source manifests retained. No speed test runs on Mike's computer.

Complete-game cases use the standard combined opening, seed 1086, 60-second warmup and 360-second normal-speed offer window. The clock remains 60 game seconds per real second; broad/detail sight remains 60/30 game seconds. Wildlife, attention, speech, presence, SSE and saves remain active; paid models are off. Movement offers/bursts and scripted NPC speech use the same schedule. Compare actual accepted/skipped work, elapsed game time and stalls alongside CPU and command delay. A completed run is not automatically an operating pass.

Root stages are bracketed by controls on one boot. Historical stage pins qualify their exact changes; they do not qualify the later retry-preparation fix. Final/fixed-owner variants use the integrated pin. SQL plans are captured after gameplay settlement; planning/JIT/backend execution and application waiting are separate. Inclusive timings are not added together.

Conditional C first measures complete cold body projection with independent sections warm, preserving opaque revision tokens and requiring exact whole-view equality. E1 compares version-specific actual selection plus eligible player maintenance on independent current-format databases: due expiry is selected, already-expired no-op work is not. Neither owner comparison establishes whole-game CPU savings.

## Incomplete and invalid attempts

Fifteen supervised jobs end on classified setup/diagnostic-fixture failures; successful subcases are retained by their actual scope. These are separate from the 17 completed full-server phases (15 unsampled, one CPU diagnostic and one reader diagnostic) and three fixed-view phases. Completion does not imply a performance pass.

Initial disposable semantic fixtures had malformed history JSON, missing collision initialization, incorrectly ordered derived-source setup and expectations inconsistent with existing nullable/compressed output. Receipt expiry also invalidated the fixture's old local session; intentional write failure was separated into a fresh authorized case. These attempts produced no performance evidence. Corrected current-format semantic cases pass as scoped above.

The first root timing attempt failed before world startup because a disposable diagnostic insertion interpreted JavaScript replacement-string syntax. Literal insertion and syntax checks of every generated source mode repair the tooling; no warmup or measured speed from that attempt is accepted. The first fixed-view attempt reset unrelated inventory revision caches, invalidating its equality check before valid timing. Its replacement resets only body membership/presentation caches, retaining complete output equality.

## Historical structural comparisons

Campaign `3aee615e-9fc3-48c2-9af6-3f05550030dc`, one managed boot, seven completed 60/360 cases. Both brackets use the original design-base source; **the last bracket is not the integrated final build**.

| Source/stage                  | Normal clock | Command p95 | Accepted / skipped offers | Sampled animal travel |
| ----------------------------- | -----------: | ----------: | ------------------------: | --------------------: |
| `11e2e3956`, before control   |       95.96% |    1,128 ms |                  699 / 65 |               2,366 m |
| `86f390ccc`, E4 typed scopes  |       87.69% |      800 ms |                  744 / 21 |               3,185 m |
| `ad727e06b`, D receipt owner  |       94.54% |      883 ms |                  733 / 33 |               1,533 m |
| `4f673e5be`, E2 actual intent |       92.70% |      622 ms |                  748 / 19 |               2,181 m |
| `1bab83daa`, E5 cardinality   |       93.65% |      415 ms |                   766 / 2 |               3,436 m |
| `af3c66b04`, E3 exact batches |       84.74% |      379 ms |                   768 / 0 |               1,884 m |
| `11e2e3956`, after control    |       99.99% |    1,192 ms |                  696 / 67 |               2,522 m |

All use 7 people, 20 animals, 74 objects and one controlled living player initially. Each ends with 6 living people, the player alive and 19–20 living animals; native alarms and trajectories differ. Scripted speech accepts 80–81 utterances with none rejected. There are no command refusals, clock pauses or background/storage failures. Faster command service delivers more actual work; these are equal offered workloads, **not identical physical work**. Main-thread CPU is 98.94–99.37% of one core in every case. Main CPU per advanced game second ranges 16.49–19.53 ms; no whole-game CPU/clock efficiency improvement is established by these prefixes.

Post-settlement backend evidence is stronger and independent of that workload variation:

- **E4:** the before-control dependency query evaluates the JSON field predicate 121,432 times; the repeated control has 17,901 evaluations with another pending cut. Typed matching has zero such interpreter nodes/evaluations. Captured execution is 33.329 ms versus 1,080.543 ms before and 220.184 ms in the repeated control; later typed cases are 31–51 ms. Different scopes/data prevent treating this as a universal speedup factor.
- **E5:** the preceding E2 retention query takes 770.233 ms **including** 765.926 ms of JIT compilation across 47 functions. Typed request cardinality runs in 4.232 ms without JIT. Baseline brackets similarly take 718.678/765.121 ms, of which 714.798/761.591 ms is JIT. The request estimate becomes the actual small tuple count instead of the function's default 100; the root row estimate falls from 71,610 to 726 (later 1,442), without a new index or global JIT setting.
- **E2/E3:** source/semantic evidence establishes actual-intent-only preparation, bounded missing-header batches and reuse of selected bodies. These counter-disabled full runs do not quantify saved query calls or Node CPU. E3's dependency replay is 36.339 ms versus 31.431 ms before; that is no additional backend timing win.

EXPLAIN runs after saves settle against a later durable state using retained captured SQL/parameters; it demonstrates the query mechanism, not the timing of one gameplay request. JIT is already included in execution. Do not add backend plans to gameplay timings or PostgreSQL CPU to Node CPU without a separate nonoverlapping measurement.

Wholly collectible native-block payload is 0–0.61 MB here. Partially live blocks, queued shared-value candidates and unowned candidates are separate, overlapping categories. The earlier 229 MB result is not reproduced. Pending clock debt is measured in **game seconds**, not storage bytes. Retained heap samples are after two requested GCs, outside measurement; they include world, pending and profiling state. RSS includes worker/process memory and is neither retained heap nor peak allocation.

## Fixed complete-view comparison

All three runs have exactly equal complete player output and the same 35-entity semantic hash. Only body membership/presentation caches are cold; independent sections stay warm. Across 24 cold views, C reduces subject lookups 2,520 → 840, native selections 9,240 → 7,560 and read scopes 96 → 48. Complete-view process CPU is 6.80–6.94 ms/view with C versus 7.84 without, about 11.5–13.3% lower. Wall time is 4.61–4.75 versus 4.80 ms/view. Warm process CPU is 3.51–3.66 versus 3.61 ms/view: no warm gain is established. This supports adoption of C’s finite within-call sharing, not a whole-game CPU claim.

## Integrated comparisons and adoption

Campaign `ccd9b47e-4065-4ddd-95b0-24448da73e5f`, parent source `93cf4fe20`, one boot. Every case accepts 768 commands except without C (767); there are no refusals, pauses or storage/background failures.

| Parent-source variant                | Normal clock | Main-core CPU | Command p95 | Sampled player / animal travel |
| ------------------------------------ | -----------: | ------------: | ----------: | -----------------------------: |
| First full control — failed progress |       33.93% |        95.44% |     93.5 ms |                  413 / 1,193 m |
| Without receipt absence filter       |     100.007% |        97.73% |    197.9 ms |                1,223 / 2,000 m |
| Without E5 cardinality               |      99.979% |        94.15% |    142.5 ms |                1,256 / 2,464 m |
| Without A1 subset lookup             |     100.000% |        94.15% |    131.7 ms |                1,195 / 1,619 m |
| Without C view reuse                 |      99.991% |        96.80% |    126.9 ms |                1,287 / 2,062 m |
| Prior after-release promotion policy |      99.810% |        97.31% |    158.9 ms |                1,266 / 1,218 m |
| Last identical full control          |      99.881% |        95.74% |    146.0 ms |                1,210 / 1,617 m |

**The first control is a serious unresolved progress failure.** It starts at game time 3,599.5506846000294 and finishes at exactly 10,928.571428571428, unchanged after settlement, with 14,273.88 game seconds still pending. Requests remain responsive and the player moves much less. Its low response delay is not a gain. The report lacks a per-minute game-time series, CPU trace and retained checkpoint for that case, so the exact onset, duration and responsible deadline owner are unknown. The later identical control progresses normally. The failed bracket prevents confident whole-server CPU attribution to individual optional changes; removing A1/filter is not proof that either caused or fixed the boundary.

F's retained-record difference is decisive: the prior policy retains 1,524 controlled impressions and 176 exact episodes; the functioning full control has 1 impression and 174 exact episodes. Other functioning discard-policy variants have 1 impression and 167–182 episodes. These are surviving account counts, not discard execution counts. The comparator changes after-release policy only; event-time snapshot construction and the canonical retention field remain on both sides. Actual cold retirement checks independently prove the discard branch and meaningful-memory protections.

[The tracker](../../../../maintainers/production-data.md#bk28--receiving-preparation-and-command-wait-removal-proposed) owns dispositions: retain E1–E4, E5, F, G, C and required D correctness; remove A1 and the D absence filter. E4/E5 have backend work evidence, F has semantic/retained-row evidence, and C has fixed complete-view evidence. E2/E3 retain simpler bounded actual-intent/dependency preparation without a claimed whole-game CPU win. A1 and the added filter state lack demonstrated useful complete-caller benefit outside the confounded bracket; their unused code/state is removed. A2, B and S2 remain unselected.

## Native expiry owner and necessary follow-up

Version-specific scripts use separate current-format databases and the actual scheduler selection. Across 25 warm independently repeated due-name expiries, old `af3c66b04` spends 151.232 ms process CPU / 229.322 ms wall, with 200 SQL statements and 75 header rows. New native expiry spends 38.800 ms CPU / 24.451 ms wall with zero SQL. Both genuine already-expired no-op cohorts issue zero SQL; no otherwise-unrequested old maintenance is forced.

**Support work has not vanished.** The final player remains dirty generation 2 / settled 0 with 11 capsules. Its separately executed actual support owner uses 5 SQL statements, 11.532 ms CPU / 10.202 ms wall once, settles 2 / 2 and retains one capsule. Two other eligible actors are excluded from this player-only experiment. The cold support pass and repeated warm native measurements have different scopes/warmth; do not add them into a claimed full-E1 CPU saving. The removed work is unrelated cold-account preparation; native expiry and necessary support proof remain separate measured owners.

## Exact adopted-source qualification

Campaign `eea48d4b-10dc-4ed3-8795-8f4eeb36098d`, source `d435c054b6a510fa25634750ff64d44d0c46d583`, after removing both unqualified candidates. Five affected receipt/concurrency/failure scripts pass before timing. Both real checkpoints pass complete cold validation. The normal gameplay systems and all numerical defaults remain enabled.

| Measurement                           |           Clean final | Separate late-CPU diagnostic |
| ------------------------------------- | --------------------: | ---------------------------: |
| Normal clock over 360 seconds         |               99.348% |                      81.577% |
| Main CPU, units of one core           |                96.85% |                       99.15% |
| Whole Node process, units of one core |               111.96% |                      116.72% |
| Command p95 / p99                     |      208.8 / 312.2 ms |             306.7 / 532.4 ms |
| Maximum command delay                 |              689.6 ms |                     960.8 ms |
| Accepted / rejected / skipped         |           768 / 0 / 0 |                  768 / 0 / 0 |
| Advanced / expected game seconds      | 21,460.02 / 21,600.82 |        17,621.07 / 21,600.47 |
| Remaining game-time debt              |        141.47 seconds |             3,979.73 seconds |
| Pauses / runtime or background errors |                 0 / 0 |                        0 / 0 |

The clean run passes the single-run 0.98 clock gate and improves response delay against the historical 1,128–1,192 ms p95 controls while delivering more commands. It still consumes nearly an entire main thread, with no demonstrated capacity for dozens/hundreds of active people. This is not reliable-clock or broad operating qualification: the parent control's unexplained progress failure remains open.

The late case already reaches only 85.51% of expected time before sampling starts at 270 seconds. Both cases disable app profiling, runtime monitoring, domain counters and external event-loop monitoring, with external process cuts enabled. Late mode additionally enables/connects Inspector before warmup; sampling itself covers 90.100604 seconds and 80,156 valid samples. It is not a fully uninstrumented control before sampling. Different actual work also matters: clean finishes with 6 living people / 18 animals; sampled finishes with 7 / 19. Neither instrumentation nor production behavior alone explains the difference from this pair. The sampled world continues beyond the earlier exact stopped boundary; no fix for that boundary is established.

Final retained own accounts are 178 exact episodes (185,530 canonical TEXT bytes) and one impression (868 bytes). These bytes exclude shared sources, indexes and quota charges. There are zero wholly collectible blocks. The 112 queued shared-value candidates total 41,887 bytes, but none is currently unowned; five partly live blocks total 73,469 payload bytes and are not entirely garbage. Do not sum those categories into cleanup debt. Clean and sampled retained-heap samples follow the same extra checkpoint/cold-restore lifecycle; the earlier matrix's final control has that extra lifecycle while its reversals do not, so their heap samples cannot establish an F/C leak or saving.

## Remaining CPU and response work

The diagnostic shows work spread across native advancement and its consumers:

- Native world advancement is 64.32% inclusive sampled time. Encounter updating is 16.07%, status reconciliation 7.42%, and continued perception 6.86%, nested/overlapping with that work. They move bodies, update received surroundings, apply status rules and publish the resulting native state.
- Actual command execution is 10.29% inclusive and player projection 10.13%; their preparation and publication repeatedly read current records and construct outgoing representations. These overlap other owners and cannot be added into a total.
- Immutable/draft/record utility **self** samples total 32.18%. Individual utility self leaders include Immer property reads 3.65%, shallow copies 3.42%, readonly draft views 2.94%, immutability checks 2.53% and draftability checks 2.02%. GC separately accounts for 4.18%. They reflect recurring graph access/copy/certification and allocation, not database waiting.
- Utility work appears beneath several real callers: command-event publication (3.39% of all samples across utilities), command execution (2.25%), a native-loop callback (1.26%), saved-row encoding (0.93%), spatial read preparation (0.84%) and received-detail envelope preparation (0.78%). There is no demonstrated single giant finish function whose removal solves the remaining CPU.
- Attention/current readers remain consumers of that representation: attention update 6.45% inclusive, candidate preparation 5.24%, received-attention reconciliation 3.97% and native contact-facet access 3.93%. Status/deadline preparation also overlaps the advancement path. Those percentages identify callers, not additive savings from deleting gameplay.

A separate bounded reader diagnostic on the adopted source captures 400 completed read operations without dropped entries, enqueued from 270.017 to 360.003 seconds. It advances at 100.117% of offered normal time, accepts all 768 commands, returns command p95/p99/max of 279/452/797 ms and passes cold restoration with no pause/error. Its hooks make this attribution, not a clean speedup result. Account-aging preparation (`Store.prepareAccountRetention`) occupies the reader for 28.750 seconds across 169 transactions in roughly 90 seconds, about 1.88 passes/second. Its 1,353 SQL statements comprise 169 each of BEGIN, world head, awareness headers, memory headers, summary headers, reverse dependencies, source versions and COMMIT, plus one additional memory fetch. Support cleanup is separate: seven passes hold the lane for 0.666 seconds. The 193 receipt lookups wait 4.845 seconds in aggregate, p95 135.16 ms and maximum 211.76 ms; the longest wait overlaps 211.685 ms of one account-aging transaction whose full hold is 251.951 ms. This directly identifies a remaining command blocker.

A hold measures read-lane callback entry through completion; wait measures enqueue through callback entry. The SQL wrapper’s 25.488 seconds are nested within account-aging hold and include waiting to resume Node callbacks; neither is PostgreSQL CPU, and they must not be added. Even BEGIN/COMMIT average about 16 ms at this layer. Backend-only time and actual retirement/no-op counts are not captured. E2/E3 reuse selected resident bodies, so one extra body fetch does not imply 168 useless passes. The offered workload rapidly replaces movement destinations; it still creates exact completed/interrupted result accounts whose individual deadlines drive real aging. This is not evidence that a single uninterrupted walk generates 1.88 accounts/second.

The remaining structural targets are repeated representation/access/copy work in existing native receiving, command/publication, status and view owners, plus the frequency and reader occupancy of genuine account aging. This evidence does not select a replacement representation, another cache or removal of initial result accounts; the latter remains unselected pending a complete consumer design. No further optimization round is part of this qualification.

## Saved data, distinct from cleanup debt

The clean final checkpoint is 70,317,302 JSONL bytes and contains 25,711 saved records plus 179 format/header markers. Offline streaming analysis of that exact artifact reproduces every row’s serialized bytes; it adds no game workload.

| Saved family                     | Serialized bytes | Saved records |
| -------------------------------- | ---------------: | ------------: |
| Recent received-history pages    |       40,547,598 |         1,863 |
| Shared received values           |        9,460,772 |         8,259 |
| Historical personal perspectives |        5,246,704 |         6,062 |
| Awareness accounts               |        3,614,045 |           603 |
| Retained support proofs          |        2,221,432 |           470 |
| Action occurrences               |        1,968,900 |           978 |
| World events                     |        1,941,266 |         2,441 |
| Current observed contacts        |        1,513,593 |           172 |

The history pages contain 18,324 entries: 8,433 acquired baselines, 7,425 occurrences, 2,138 attention-exit and 328 loss boundaries, covering 30,831 facets. Their encoded bodies (20.740 MB), eligibility/charge directories (9.893 MB) and source aliases (6.371 MB) together account for 52.6% of the checkpoint. These are history entries and lookup projections, not thousands of distinct physical objects. Of 978 action occurrences, 897 are movement; animal-response and action-start events together are 1,975 of 2,441 world events. Personal reception/knowledge tables occupy 84.27% of serialized bytes, physical/map simulation 2.11%.

This locates retained bulk in received chronology and its projections. JSON escaping, indexes/projections and payloads all contribute; serialized checkpoint size is not resident heap, garbage, allocation rate or evidence that the complete graph is visited every tick. It does not assign the sampled utility CPU to a particular table.

## Configured local destination

Read-only inspection of the actual configured loopback destination finds schema 22 and no other connected writer, with five uncertain Jev/OpenAI attempt records. No local database or credentials were changed. Their test-data status is unresolved; the development reset policy does not authorize erasing real spending/accounting. Fresh current-format AWS verification is distinct from this unmet local-readiness gate. These existing records are outside the task’s disposable verification/accounting.

## Resources and limits

The managed allocation was $6 within the $10 task ceiling. Final controller accounting estimates **$3.399850 cloud cost**, with $0 outstanding reservation and **$0 paid game-model cost**; this is an estimate, not an AWS billing settlement. All 27 job manifests verify, covering 554 files / 359,694,076 bytes. Last generation 205 released cleanly; controller lifecycle records stopped at 16:12:06.861 UTC, and independent EC2 readback confirms the m7i.xlarge is stopped. No task-owned processes, databases, workspaces or active claims remain on the worker. Final documentation review, 22 added local file/anchor links, changed-file pinned formatting and whitespace checks pass.

Retained raw fixtures, logs, exact source copies, CPU profiles and checkpoints stay outside Git at `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-07-bk28-implementation/`. Key summaries under `aws/` are `root-stage-summary.json`, `root-query-plans-summary.json`, `fixed-view-summary.json`, `optional-final-summary.json`, `native-owner-summary.json`, `accepted-final-summary.json`, `accepted-late-cpu-analysis.json`, `accepted-utility-callers.json`, `accepted-reader-summary.json`, `accepted-reader-analysis.json` and `accepted-checkpoint-breakdown.json`. Campaign identifiers above identify the managed provenance. These machine-local artifacts are retained evidence, not a published permanent archive.
