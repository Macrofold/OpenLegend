# Latest committed runtime: CPU and command waiting

## Source and question

Profile Macrofold/OpenLegend `934190d80a6ef5703a712370d04dfaeeca7df98b`, local `codex/stealth-runtime-01-evidence`, after the confirmation/privacy review. Identify remaining CPU work and the cause of roughly one-second command replies. Runtime changes are not authorized; diagnostic removals are external source copies, not adopted fixes. [BK28](../../../../maintainers/production-data.md#bk28--receiving-preparation-and-command-wait-removal-proposed) owns proposed follow-through.

The managed worker is the standard `m7i.xlarge`, four vCPU/16 GiB, Linux x86_64, AWS account `027677879749`, `us-east-2`. The opening has one controlled person, six idle people, twenty native animals and seventy-four objects. Seed 1086, 60:1 game clock, 60/30-game-second broad/detail sight, 500 ms movement offers with bursts, a scripted NPC utterance about every five real seconds, SSE, presence and no state polling remain unchanged. No paid/autonomous model calls run. This is native/server/PostgreSQL evidence, not rendered play, model quality or population capacity.

## Full-feature baseline

The baseline warms for 60 seconds, then offers movement for 360 seconds. Application profiling, CPU sampling and runtime monitoring are off; external process boundaries measure CPU/progress at offer stop, before request drain. No subsystem is removed.

| Observation                                      | Result                                |
| ------------------------------------------------ | ------------------------------------- |
| Normal-clock progress                            | 99.89148%                             |
| Published game time / measured real time         | 21,576.9459 / 360.00645 seconds       |
| Main-thread CPU                                  | 347,903.240 ms; 96.638% of one core   |
| Whole Node-process CPU                           | 410,240.032 ms; 113.954% of one core  |
| Accepted commands / skipped driver intervals     | 713 / 52                              |
| Command p95                                      | 1,028.694 ms                          |
| Admitted pending time, beginning → end           | approximately 0 → 22.698 game seconds |
| Published pause / storage or background failure  | none                                  |
| Living people / animals, beginning → end         | 7 → 6 / 20 → 20                       |
| Sampled player / animal travel                   | 1,066.08 / 1,867.76 metres            |
| Main-isolate heap after collection / process RSS | approximately 395.53 MB / 1.765 GB    |

Node-process CPU includes other Node threads and excludes PostgreSQL; do not add it to main-thread CPU. Heap used is sampled after two explicit `global.gc()` calls, before shutdown; it includes resident state, in-flight work and harness records, not only game-owned objects or other isolates. RSS is not JavaScript heap or peak allocation. Skipped intervals are offers the driver does not issue while its preceding request is pending, not refused commands. One person dies during the workload, reducing late observer work. Timing-driven animal paths differ between runs, so an equal seed/input schedule does not prove equal physical work.

The actual manual checkpoint and full cold validation pass: 71,673,019 bytes, 26,527 rows, game time 25,266.6666677/revision 406, checksum `f26641f46d6c03c0c0b4e90f15d2a4fee2f1d034515a0ed9b6c1f9bb86bec34f`. At the final retained cut, wholly collectible blocks and unowned values are zero. There are 131 queued value candidates/52,055 bytes, which may still be owned, and five partially occupied blocks/41,506 bytes; neither is wholly collectible debt. This short run does not establish sustainable cleanup or mature-memory capacity.

Normal-clock tracking passes the existing 0.98 threshold. CPU headroom and responsive commands remain unmet. This is a new qualification of the reviewed source, not a paired speedup over the earlier `a7d45dbdd` measurement.

## CPU attribution

A separate 30-second warmup/90-second offered phase contains 83,695 Inspector samples over 93.04 seconds, including Inspector boundary delay. Its command p95 is 448 ms, so it does not by itself explain the six-minute tail. Distinct sampled nodes/call sites remain separate. These **inclusive** call chains overlap and must not be added:

| Complete call chain                                 | Sample share |
| --------------------------------------------------- | ------------ |
| Updating encounters and their received consequences | 20.937%      |
| Preparing a permitted player view                   | 9.978%       |
| Updating attention                                  | 6.880%       |
| Finalizing an immutable world                       | 5.702%       |
| Selecting a current received field from its contact | 4.440%       |
| Reconciling a completed visual sample               | 4.203%       |
| Preparing attention description inputs/meaning      | 2.091%       |

True **self** samples include Immer property access 3.765%, `readOnlyDraftView` 2.907%, `isImmutableData` 2.380%, current native-field selection 1.958%, entity lookup 1.054% and record-body encoding 1.011%. These identify repeated traversal/qualification as well as actual simulation. They are not additional costs to add to their inclusive callers, and a library frame does not identify one owning subsystem. Garbage collection has 3.374% of samples; the trace does not attribute allocation bytes to individual owners.

The nearest-application-owner partition assigns 31.823% to perception/attention/evidence helpers and 14.781% to draft/immutable helpers. That is a partition by nearby source files, not proof that those percentages can be removed. Other domain and server helpers remain separately represented; the report does not label all unassigned work as sensing.

### Which repeated reads the proposed changes actually remove

A call-stack partition of `currentContactNativeFacet`'s 3,716 samples assigns 875 to player-view preparation, 597 to attention candidates, 499 to descriptions, 476 to prepared perception contacts, 427 to native relations, 238 to direct visual reconciliation and the remainder to other selected consumers. These categories partition that one function's subtree; they are not extra CPU to add to the table above. A/C can remove some duplicated view/reconciliation work, not all 8.312 million field selections counted in the separate long diagnostic.

`recordCurrentReception` has 225 inclusive samples (0.269%); 219 are inside `captureTemporalCurrent`, which performs actual history admission. Only six are outside that necessary child. Installed-field forwarding is therefore **not selected** as a material removal. Similarly, recursive `isImmutableData` must count the topmost occurrence once: its union is 2,003 samples, not the 8,965 obtained by summing nested inclusive nodes. Its major callers include native finalization, body encoding and command-batch setup; A/C do not replace those guarantees.

Event-triggered `updateAttention` contributes 3.089% of early samples, compared with 1.913% from held-fact continuation, 0.970% from broad reception and 0.908% from detail selection. These partition that caller, not the whole game. Generic event dispatch currently gives ordinary action-start/moved events urgency 2; each can renew a real cue. Repeated selection is therefore not automatically a no-op. The proposed ownership repair moves unchanged event metrics into world policy; suppressing routine cues would be a different, unselected gameplay experiment. Relation-only continuations also invoke selection, and a scope boundary can rebuild an attention cohort; neither has a complete existing proof that safely removes its current timing/history effects. Catalogue counters alone do not justify another cross-publication cache.

## Why commands wait

The separate long application-metrics diagnostic reaches 98.413% normal clock and 1,184.875 ms command p95. It records 8.312 million temporary native field selections and 1.702 million current-root lookups. These are repeated in-memory reads, not new memories or database rows. Attention description meaning is reused 520,731 times and prepared 307 times; a reuse still gathers its field inputs first.

One native iterator call lasts up to 550.64 ms without yielding. Mutation ownership lasts up to 637.24 ms. The host's yield between iterator calls lets callbacks run but retains mutation ownership until the coherent native result is published. The separate external `native.finalization` total is only 6.45 ms because much finalization occurs inside the iterator; it does not prove that immutable publication is cheap.

Read-lane queue waits reach 2,147 ms; the last 256 retained waits have p95 about 1,890 ms. The command wrapper reaches 2,196.56 ms. Its name, `command.durable`, does not imply ordinary gameplay waits for durable saving: ordinary commands are accepted into the live world. Percentiles, maxima and nested totals cannot be added to form a hypothetical command.

Before reaching the mutation owner, every fresh command UUID misses the bounded recent-result map and asks PostgreSQL whether it already ran:

```sql
SELECT id,payload FROM gameplay_receipts
WHERE world_id=? AND id=ANY(?::text[])
```

`prepareAndAdmitCommand` → `CommandReceipts.get` uses a microtask batch of up to 128 IDs. The ordinary driver's spaced commands normally create separate misses. The query joins the single read lane shared with other reads. Thus a command can wait for a reader before it is even eligible to enter the game mutation queue. The operation trace below identifies the reader holding the lane. SQL elapsed spans include application callback delay, not just PostgreSQL execution.

The general SQL template table overflows: 12,081 calls/339,512.8 ms are aggregated as `family:template-overflow`. `omittedQueries: 0` preserves total counts, not every query identity. Those overlapping elapsed spans cannot establish database CPU or identify the competing reader.

## Read-lane isolation: memory maintenance blocks commands

A second complete 60-second warmup/360-second run records a bounded external read-operation trace: 1,448 operations, zero dropped, 1,262 completed inside the measured window. It reaches 100.005% normal clock, 95.44% main-core use and 817.9 ms command p95, with 742 accepted commands/26 skipped offers. This separately instrumented run is attribution evidence, not a speedup over the baseline.

| Reader                                                             | Completed operations | Time holding the single read lane | Time queued before acquiring it |
| ------------------------------------------------------------------ | -------------------: | --------------------------------: | ------------------------------: |
| Account aging/support preparation, `Store.prepareAccountRetention` |                  398 |                   213.644 seconds |                   0.200 seconds |
| Previously accepted command lookup, `CommandReceipts`              |                  743 |                    10.721 seconds |                 135.879 seconds |
| Session/control authorization                                      |                  121 |                     2.289 seconds |                  32.124 seconds |

Hold spans describe ownership, not CPU. The queued spans overlap other readers' hold spans and must not be added. Application-side query spans also include event-loop callback delay; they are not PostgreSQL execution time.

One actual command at 342 seconds takes **2,131.358 ms**. Its receipt lookup waits 2,085.754 ms before starting: 2,073.618 ms behind account maintenance, then 12.014 ms behind authorization. Its own receipt read holds the lane for only 13.695 ms. This directly establishes the long maintenance transaction → cold receipt miss → delayed command dependency.

Maintenance holds grow with accumulated accounts: mean hold is 228 ms in the first minute and 1,045 ms in the sixth. It occupies 16.0 seconds of the first minute and 47.0 seconds of the sixth despite completing fewer transactions, 70 → 45. Command p95 grows from 306 ms to 1,565 ms across those minutes. The maintenance query families in the measured window are:

| Query family and purpose                                                     |    Calls |
| ---------------------------------------------------------------------------- | -------: |
| Begin, read world head, commit transaction                                   | 398 each |
| Select scoped awareness headers, memory headers, summary headers             | 398 each |
| Prove surviving personal support membership                                  |      137 |
| Fetch individual previous awareness records                                  |      924 |
| Fetch individual previous memory records                                     |    2,935 |
| Find dependent accounts/source revisions through the pending-plus-saved view |      395 |
| Read old source versions                                                     |      395 |

The actual retirement-body hydration already batches selected IDs. The avoidable individual reads occur later when source-version preparation reconstructs prior headers/revisions. More importantly, `Store.prepareAccountRetention` mixes the entire pending account set into its write-intent input even when those accounts are merely read context. Repeatedly treating unchanged pending accounts as changed records drives those reads and dependency preparation. A shared deadline also sends native-only knowledge expiry and support cleanup through the full cold-account transaction; archive-byte decreases can immediately schedule another pass. [Runtime §13](../../../../projects/bookkeeping-simplification-runtime-design.md#13-separate-retention-work-by-its-actual-cause) removes those causes before considering query acceleration.

## PostgreSQL execution: the row/group multiplication

Campaign `98e07cc5-2df4-4e07-89c7-924e2ec9db5c` captures the last actually executed scoped-memory and dependency queries, then explains each once **after** measured play stops and saves settle. The full-feature diagnostic reaches 100.004% normal clock, 95.528% main-core use and 867.815 ms command p95, with 731 commands/36 skipped intervals. Query execution plans use that completed durable world plus the captured pending-query inputs; the earlier MVCC snapshot is not retained. This establishes the actual plan mechanics at the completed size, not an exact replay of every earlier slow query.

There are 641 awareness accounts, 1,672 memories, zero summaries, 3,620 dependency rows and zero source-version rows:

| Actual query                                      | PostgreSQL execution | Node-observed wall | Returned rows | Shared buffer hits | Disk/temp reads |
| ------------------------------------------------- | -------------------: | -----------------: | ------------: | -----------------: | --------------: |
| Scoped memory retention candidates/deadlines      |           687.216 ms |         690.502 ms |            89 |              1,322 |               0 |
| Source-version dependents through pending overlay |           950.668 ms |         963.999 ms |             0 |              1,850 |               0 |

Backend elapsed is not merely delayed Node callback handling. Buffer hits are accesses, not unique pages; parent/child hits and times cannot be summed. `TIMING OFF` preserves total execution and row/loop counts but omits per-operator/JIT timing.

The dependency query needs to read saved accounts as if already accepted pending edits were present. An edited account first removes its old dependency group and then installs new edges. The common `LiveReadOverlay` implements each pending group removal by expanding its JSON fields and comparing them with a JSON conversion of every stored row. In this plan, a 33-row removal input is visited for each of 3,620 durable dependency rows. Its field subquery runs **118,761 times**, and the join rejects 118,727 candidates before the overall query returns no dependents. This is work proportional to rows × removal groups × field interpretation, not a large amount of gameplay or a disk bottleneck.

The structural replacement is [E4](../../../../projects/bookkeeping-simplification-runtime-design.md#e4--compile-pending-scope-removals-once): decode each trusted removal shape once and match typed world/actor/owner columns through relational anti-joins. It applies to all pending scope removals, preserves delete/recreate order and private captured cuts, and adds no second store or new index. E2 additionally prevents unrelated pending accounts from causing a dependency investigation at all. Necessary proofs of no surviving dependent still run; they no longer interpret every field of every removal against every stored row.

The scoped-memory plan estimates 71,610 rows but returns 89, performs three scans of the 1,672-row memory table, and generates 47 JIT functions. Its next-deadline branch already uses `mind_memories_retention_due`. Compilation may account for substantial cost, but its duration is **unknown** in this capture. [E5](../../../../projects/bookkeeping-simplification-runtime-design.md#e5--expose-bounded-request-cardinality-conditional) is therefore conditional: expose the actual bounded request count to the planner and measure before changing query/index/JIT policy. No global compilation disable or new index is justified by this result alone.

### Maintenance cannot simply be removed

The same campaign's separate no-account-retention cut preserves native recent expiry, actions, saving and command receipts, but disables account aging/support/version preparation and removes only its deadline from timer selection. It fails about **53.1 seconds into measured play** at required personal-experience admission (`experience.ts:721`, “Personal experience could not be recorded”). It advances only about 3,200 game seconds: 14.815% normal-clock progress at offer stop, with 113 accepted commands followed by one server error and 654 busy refusals. Resource cleanup succeeds. This is a completed **failed gameplay diagnostic**, not a startup/warmup failure or a CPU improvement. It demonstrates that pressure relief must remain timely; the design removes redundant work without suppressing required service or enlarging quotas.

## What the movement workload retains

The full-feature baseline's validated checkpoint contains **1,676 personal memory records**, all owned by the controlled person and all describing ordinary movement. This is the `mind_memories` table, distinct from received awareness accounts and exact shared temporal pages:

| Stored memory kind                                         | Records |
| ---------------------------------------------------------- | ------: |
| Lasting impression of starting to move                     |     690 |
| Lasting impression of arriving/moving                      |     145 |
| Lasting impression of a replaced/cancelled move result     |     545 |
| Lasting impression of a completed move result              |     144 |
| Still-exact required cancelled/completed movement accounts |     152 |

The driver offers a new move every 500 ms; these commands often replace an ongoing move, generating a cancellation result and another start. It is therefore an active intention-replacement workload, not just position sampling. Native result/experience policy marks these accounts as consequences. Required-pool pressure can retire them before the one-day age limit; retirement creates an impression by copying that account's summary into a claim. This is neither an AI judgment nor consolidation of the route. Impressions then follow the existing seven-day weakening/thirty-day expiry policy. Quotas bound retained records but do not prevent creation, conversion, indexing and retirement churn.

The checkpoint also contains 7,998 pooled received values, 1,783 temporal pages, 5,639 event perspectives and 2,123 canonical history events. These counts describe different storage families, not additional copies of each memory. Their physical and personal purposes differ; deleting meaningful chronology is not the proposed fix.

[Runtime §14](../../../../projects/bookkeeping-simplification-runtime-design.md#14-routine-exact-results-need-not-become-lasting-impressions) proposes preserving the exact required/recent result while discarding low-value routine movement accounts when that support ends, instead of promoting them to lasting impressions. The initial account creation remains. The 1,524 impressions identify a substantial target population, not a measured prediction that every record qualifies or that CPU falls proportionally. Changing continuous movement-command lifecycle itself is not selected: doing so would also change cancellation, plan completion and action-result semantics.

## Matched subsystem removals

Campaign `a1ede8b2-d035-4fe0-b469-3c4a98be20d7`, job `latest-isolation`, runs sequentially on the same standard worker boot. Each control/cut uses the same 60/360 workload and four bounded scalar counters; the controls preserve all gameplay but are instrumented source copies. Application profiling/CPU sampling are off in these six comparisons. Each cut changes only its named diagnostic branch; all are deliberately incomplete behavior, not adopted implementations.

| Case                               | Normal clock | Main core | CPU ms/game second | Command p95 | Accepted/skipped | Player/animal travel, m |
| ---------------------------------- | -----------: | --------: | -----------------: | ----------: | ---------------: | ----------------------: |
| Full features, before              |     100.000% |    94.24% |             15.707 |    816.2 ms |           742/25 |               1064/1924 |
| Bypass cold receipt lookup         |      99.956% |    97.16% |             16.200 |    125.1 ms |            768/0 |               1260/2608 |
| Skip loss/unchecked reconciliation |      99.989% |    94.10% |             15.685 |    846.5 ms |           736/30 |               1118/1442 |
| Constant attention description     |      99.987% |    92.50% |             15.418 |    859.7 ms |           744/23 |               1107/1506 |
| Suppress repeated publication      |      92.906% |    95.84% |             17.192 |    959.1 ms |           728/37 |               1049/2154 |
| Full features, after               |      99.982% |    95.50% |             15.920 |    891.0 ms |           741/25 |               1082/1573 |

All six cases complete without startup, warmup, storage, background or client failure. No pause is observed during offered load; the after-control's final away pause occurs only after stream closure/drain. Living people fall from seven to six in every case; the after-control ends with nineteen animals, the other cases with twenty. The same offers do not produce identical movement, population or native scheduling. CPU/game-second adjusts clock progress, not those workload differences. These are single cuts bracketed by two controls, not statistical confidence intervals or additive component costs.

- **Cold receipts:** 769 lookup bypasses are counted, including boundary work. Existing resident retry detection, pins, native gameplay and writes remain; cold/evicted retry recovery is deliberately broken. Command p95 falls from the controls' 816–891 ms to 125 ms, and all 768 offers complete. More accepted commands and substantially more travel explain why CPU utilization rises rather than demonstrating a CPU saving. Together with the reader trace, this is strong causal evidence for the avoidable command dependency. The safe design must retain exact retry behavior.
- **Loss reconciliation:** about 200,000 contact enumerations fall to zero while current reception remains. Ended/unchecked state can become wrong and alter later attention. CPU is near the control range despite less animal travel; there is no convincing material whole-game benefit. The larger A2 coverage/repair redesign is not selected from this evidence; A1 direct-subset selection remains a conditional small experiment.
- **Descriptions:** 498,490 calls still occur but return a constant instead of preparing meaning; novelty behavior is intentionally wrong. The small observed CPU reduction does not repair command latency and does not establish that a more complex cache pays for itself. Keep semantic preparation and avoid a new cache absent stronger evidence.
- **Publication:** the stream falls to 312 bytes versus about 25.5 MB in the controls, proving the cut. Yet normal progress falls to 92.91%, with 1,533 game seconds pending and 11,937 reconciliation calls versus 5,742–5,780 in controls. Initial native alarms differ (two in this cut versus one in the controls), and ending alarms are four versus one; animal/alert trajectories and timing therefore differ. This run is not a safe estimate of the projection subtree's removable cost or proof of a hidden projection dependency. A finite within-view shared-reader experiment needs its own fixed-cut comparison. No publication suppression or scheduler rewrite is adopted.

The seventh case retains every feature and samples the late phase. Inspector starts 270.009 seconds into measurement; start acknowledgement itself takes 0.751 seconds. It records 81,884 samples over 91.762 seconds, with zero invalid time deltas, including roughly 1.75 seconds of request drain after offer stop and ending before postmeasurement accounting. Final-minute command p95 reaches 1,668 ms. Overlapping inclusive samples remain dominated by encounter processing (18.971%), player projection (8.478%), attention (5.835%), immutable completion (5.088%), visual reconciliation (3.630%) and account-retention preparation (3.605%). True self includes Immer property access 3.673%, immutable-data checking 3.394%, read-only draft viewing 3.040% and current-field selection 1.393%; GC is 3.968% and idle 6.211%. This establishes that native/read preparation still consumes CPU during the aged delay, while the independent read trace explains why an individual command waits. It does not turn the long SQL spans into JavaScript CPU.

## Initial result-account removal: invalid performance shortcut

The final disposable cut skips only `endActivity`'s automatic personal result account, after its canonical occurrence/result, physical effects, output links and action cleanup. It leaves movement/event reception, maintenance and agency fallback installed. It deliberately loses the result's personal account/required receipt and associated cognition or prepared-threat trigger. This is broader semantic loss than the proposed F after-release policy.

The case suppresses 769 admissions and ends with 531 impressions and no activity-result/derived-memory rows; no plan fallback is observed. It accepts 768 commands with no skips and 306.862 ms command p95, but advances only **34.554% normal speed**, using 94.906% of one main core and 45.777 CPU ms/game second versus controls' 15.7–15.9. It stops advancing at game time 11,060 with 14,141.775 game seconds pending. Publication notifications rise to 40,248 versus controls' roughly 11,000–12,000; player/animal travel is only 420/883 metres, all seven people remain alive and native alarms differ. No runtime exception or storage pause is reported.

This is an invalid shortcut with stalled progression, **not** evidence that deleting required accounts improves performance, nor a clean attribution of account-birth CPU. The missing required result/choice dependencies make a repeated due boundary plausible, but no CPU trace of that broken phase establishes the exact loop. No further experiment follows. F retains initial result records/receipts and changes only eligible later promotion; eliminating initial admission remains unselected until a complete consumer replacement exists.

## Recommendation and smallest follow-through

The command-delay diagnosis is strong: fresh receipt misses wait behind retention, and retention executes both unnecessary passes and an expensive generic pending-deletion interpreter. Main-thread CPU has a different distribution: real encounter/attention work plus repeated current-read, draft/finalization and view preparation remain substantial. The experiments do **not** establish a large safe CPU reduction from another wholesale perception rewrite.

Rank the next changes by demonstrated cause and structural reach:

1. **E4 — Typed pending scope removal.** Eliminate the measured row × scope × JSON-field interpreter in the shared read owner. This has direct backend-plan evidence and benefits every affected reader. The safe implementation's gain remains unmeasured.
2. **E2/E1 — Actual intent and actual maintenance reasons.** Stop treating unrelated pending records as another write set; separate native knowledge/support work from account aging/pressure, remove archive-decrease wakeups and fix fair-cohort consumption. Source and read traces establish the repeated work. Required maintenance stays timely.
3. **E3 — Batch only genuinely missing dependencies.** Resolve supplied metadata once, then use bounded table batches for remaining exact keys. Do not batch the same unnecessary work E2 should remove, or rebuild a body hydrator that already batches.
4. **F — Useful-only lasting promotion.** Avoid manufacturing impressions for proven routine own locomotion once exact support releases. Preserve initial results, required recent evidence, meaningful consequences and deliberate summaries. The large target record population is measured; the net CPU/storage benefit and gameplay result require an isolated comparison.
5. **D — Correct receipts, then conditional fresh-ID proof.** Install accepted receipts on both existing paths. A bounded current-epoch absence proof can safely avoid the demonstrated cold miss, but only adopt it if useful after the retention root fixes. It must retain cold/evicted retry correctness; the diagnostic bypass does not.

E5's request-cardinality change is conditional on remaining backend cost and explicit compilation/execution timing. A1 direct contacts and C within-call view reuse are smaller conditional experiments. A2's larger sensory-delta conversion and B's installed-field forwarding are not selected by this evidence. G relocates unchanged salience defaults into the world owner; it is an ownership repair, not a claimed speedup. S2 remains excluded. Do not add another queue, database, broad cache, new model loop or slower sensing to disguise these costs.

The [implementation stages](../../../../projects/bookkeeping-simplification-tech-design.md#delivery-and-acceptance) specify complete callers and lifecycle checks. The smallest decisive evidence is: exact pending/durable/cold result equivalence and deletion/recreation privacy first; then E4's eliminated interpreter loops and same-shape backend plans; then E2/E1 pass counts by actual cause and E3 remaining fetch batches. Measure F separately through real recent/result/summary consumers. Each adopted stage gets an isolated AWS before/candidate/after complete-caller comparison with actual work, CPU, latency and debt. Reuse valid baseline evidence; one justified variance repetition is enough. Reject extra machinery without a dependable net benefit, and stop after a failed final operating gate with an attributed residual rather than an open-ended optimization loop.

The final operating workload keeps normal clock, speech, native animals, current views and actual save/cold checks. No dozens/hundreds capacity, mature-memory sustainability, rendered-client performance or live cognition quality is established by this campaign. Those existing gates stay open; no proposed change is represented as implemented.

## Source-backed removal opportunities

- **Receiving a narrow detail check:** `reconcileVisualEvidence` creates/merges and sorts every current contact, then filters to measured subjects. It also reconstructs loss/unchecked decisions already partly known by the physical encounter result. Detailed attention bounds output, but this preparation still scales with all contacts.
- **Repeated current reads:** one changed subject is selected repeatedly for body, prior fields, location, removal, confirmation and attention. Existing owner-scoped readers help only within their actual lifetime. No additional qualified-track index is justified by the rejected D3b experiment.
- **Description preparation:** the cache avoids recomputing meaning only after selecting sibling fields. Numeric public-attribute changes can invalidate description preparation even when the consumed description deliberately omits that numeric sample. Invocation replacement and broad invalidation also cause preparation; numeric drift is not established as the dominant cause.
- **Player publication:** visible membership, body-grant capture and entity presentation prepare overlapping permitted evidence. Practice hydration separates synchronous sections even though entity presentation does not consume practice. One synchronous permitted-body preparation can serve them before the await, retaining final authority rechecks.
- **Saving/publication:** generic patch discovery, immutable proof and record encoding still consume CPU. Removing them without replacing their lineage, byte-admission and privacy guarantees can move more work downstream. No blanket removal, second writer, universal cache or speculative snapshot rewrite is selected from these samples.

## Evidence locations

Initial managed campaign `8fc0a599-423d-4e32-b08f-9efb6d8447d4`, job `latest-baseline`, source archive SHA-256 `de57eb528687bb19b985d319bb3bc9c8e6f98b2647cdac7bdf4a36b21b6eea8d`. Collected raw profiles, manifests and checkpoint evidence remain outside Git under `/Users/mzw/.codex/verification/OpenLegend/workers/campaigns/8fc0a599-423d-4e32-b08f-9efb6d8447d4/results/latest-baseline/`. Offline exact-node CPU attribution is in `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-07-cpu-isolation/aws/latest-cpu-analysis.json`.

Reader trace campaign `46642d90-f105-49b2-8ed1-cb2f69965162`, job `reader-attribution`; offline analysis is in the same external experiment directory as `reader-analysis.json`, `reader-minute-summary.json`, `baseline-checkpoint-census.json` and `memory-origin-census.json`. Raw reader parameters and personal memory bodies are not included in this report.

Matched case results and exact counters are in `.../2026-11-07-cpu-isolation/aws/isolation-summary.json`; late Inspector attribution is in `late-cpu-analysis.json`, with raw profiles under campaign `a1ede8b2-d035-4fe0-b469-3c4a98be20d7/results/latest-isolation/`.

Retention/query-plan campaign `98e07cc5-2df4-4e07-89c7-924e2ec9db5c`, job `retention-isolation`: 30 collected files/1,627,409 bytes independently hash-verified with zero mismatches. Sanitized plans are in `cases/retention-plans/results/retention-plans.profile.json`; no raw SQL parameters or private memory bodies are published here.

The result-account cut is campaign `283cd315-0691-47b0-a90b-7eae30db5b26`; 18 collected artifacts/707,617 bytes independently hash-verified with zero mismatches. Raw material remains outside Git in the managed campaign result directory.

## Campaign closure and verification

Five managed campaigns produced **14 measured case outputs**. There were no measured startup/warmup failures. The deliberately disabled-maintenance case fails during gameplay admission; the result-account cut finishes without an exception but stalls advancement; the no-publication cut misses normal-clock acceptance. None is reported as a successful optimization. The initial expired AWS session and free-tier-access probe occurred before measurements and produced no speed result.

All campaigns use the pinned source archive identified above, with separately hashed disposable measurement transforms and case manifests. **210 collected artifact hashes were verified.** `campaign-provenance.json`, `artifact-verification.json`, `allocation-final.json`, `worker-final.json`, `machine-final.json` and `birth-status-final.json` remain in `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-07-cpu-isolation/aws/`.

Owned processes, databases and remote task workspaces were cleaned. The final managed generation 179 released at 11:47:19.959 UTC; controller stop is recorded at 11:53:06.931 UTC on November 7. Instance `i-01bdb83b2c3aadf43` is stopped, the slot is available with no active run, and no task reservation remains. Controller-settled **estimated** cumulative cost is **$1.665877**, not an AWS invoice; no paid game-model calls ran. Retained managed storage/artifacts follow the existing funded storage policy.

Only documentation changes are retained in the repository. Source/caller and affected-document review, changed-link checks, formatting and whitespace checks cover this analysis/design handoff. No unit suite, maintained runtime changes, branch/worktree switch, push or merge occurred. Proposed BK28 implementation, experimental adoption and the existing broader operating gates remain open.
