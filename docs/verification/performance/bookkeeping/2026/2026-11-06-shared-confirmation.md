# Shared confirmation and history repair — November 6, 2026

[BK26/BK27](../../../../maintainers/production-data.md#bk26--sensory-deadlines-and-attention-preparation-proposed) own this implementation and its experimental adoption. [The technical plan](../../../../projects/bookkeeping-simplification-tech-design.md#19-reviewed-source-work-removal) and [runtime companion](../../../../projects/bookkeeping-simplification-runtime-design.md#11-history-intent-and-metadata-read-repairs) retain the contracts and stop conditions. S2 is excluded. Operating, mature-history, cleanup and population gates remain independent.

## Source and scope

Repository: Macrofold/OpenLegend, local `codex/stealth-runtime-01-evidence`, starting commit `f7353e241d4d62e5fa1136cbecc7f5ed9c963075`.

| Source                                     | Scope                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `4a0858f8e6c2e34dc342a99ba6ea8509355ce4f9` | R1 admitted-history application, including protected writes.                                                |
| `5cfba29f6d7fb067fbfe78616959470be1f62933` | R1 plus R2 membership-only reads; repaired comparison control.                                              |
| `d66a8cdac6b8a85e819c2d9b5ae46216d890e906` | P1 with selected-native read reuse; isolated control without N2. This commit creates no branch or checkout. |
| `6dd7e38c9dbe7d975de13d8470c7573d3d8ea436` | Same P1 implementation plus the N2 status-validity candidate.                                               |
| `a7d45dbddbc87034644d6e53b41879bbeab929df` | Final adopted source: R1/R2/P1, N2 removed, maintained offer-stop CPU capture.                              |

P1 changes the current format to database schema 56 / `development-2026-11-06-shared-sight-confirmation`, without an older reader. All checked worlds/databases are disposable; no existing developer save was replaced. No checkout/branch switch, unit-suite run, new maintained test or paid model call accompanies the implementation. Additional and cumulative Jev cost is $0. Fixture/native request checks do not establish live-model response quality or graphical play.

## Connected correctness

Local checks run after source implementation; their incidental elapsed times are not speed evidence. TypeScript and production build pass, including the repository asset guard. Existing browser-worker externalization and bundle-size warnings remain; renderer behavior was not changed.

- **R1: ten connected checks.** The actual service preserves 1,025 exact canonical event IDs/bodies/totals, including 496 events evicted before first saving, a detached save prefix, 257 later changes and an empty cut. Five real speech perspectives agree with permitted history. Protected cold rewrite, correcting speech, forgetting without erasing another witness, explicit deletion, stale/unscoped refusal, pre-start refusal, executing-write rollback/fault latch and full repository reopening pass. Ordinary projections remove zero events; the intentional deletion removes one. Final durable reopening contains 1,026 events after subsequent real speech.
- **R2: sixteen connected checks.** Actual service prefix/suffix membership reads examine zero native body inputs, with an uncached poisoned-source negative control. The real suffix is 4,848 body bytes. A separate constructed adapter specimen repeats 73 real writer rows totaling 718,510 bytes: headers succeed while ordinary SQL retains the 512 KiB preparation refusal. This is an adapter work-bound check, not a valid large gameplay-save claim. Selected true-recent reads still load a body. Seven aliases, two local individuals, independent observers, pending replacement/deletion/reacquisition, parent removal, stale revision refusal, correction, forgetting and full cold validation pass.
- **P1: fifteen native checks and the existing actual supplied-context consumer.** Checks cover same-time full/partial/full order and frames, partial-first acquisition, unchanged broad content/raw dates, original pose separation, independently stale detail, filtered location capture, frame references, last-seen closure, cold loss/reacquisition, exactly-once familiarity and bounded failed-baseline recovery. The existing consumer exercises an unknown crowd, acquired cliff relationships, delayed remembering, independent observers and correction/forgetting fences.
- **N2: six owner checks plus five existing native integration checks.** Already established validity is reused; retaining one actor does not hide another's mutation. Status activation/deactivation, complete rates, changed/exact deadlines, unknown-feed fallback and current-format restoration pass. The existing long/subdivided native check preserves RNG and ten moving foragers; its maximum position difference is `1.42e-14`. Work exhaustion still rolls back through its owner.

The actual `AiDirector` also reaches an injected provider, holds its finite context while native advancement proceeds, and completes its job. The old raw request/binding comparator fails because P1 renumbers issued IDs and changes internal proof versions/receipt positions; that failure is retained. A separate bounded comparison joins only exact captured native entity, field, channel, acquisition and occurrence anchors, establishing equivalent supplied facts, labels, chronology, uncertainty, instructions, schema, budgets and response authority. It does not rewrite raw hashes or remove arbitrary references. Internal representation differences remain explicit. Ordinary broad renewal permits delayed remembering; actual correction invalidates the same cut and the response owner refuses the old request. External transport and paid calls are zero; this is not live-provider quality evidence.

Setup failures are preserved separately: a missing public export was an integration defect fixed before acceptance; fixture assumptions about pinned event rollover, canonical notification counts, speech size, presence/backpressure and continuing a service after replacing its repository baseline were corrected. None is counted as a passing attempt or a speed result. Owned disposable databases were dropped.

Raw scenarios/results and hashes remain outside Git under `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-06-followthrough/` and `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-06-revised-runtime/r1-n2/`. The latter manifest preserves the actual R1/N2 source and logs. Complete affected-source review found no remaining known integrity issue; performance adoption is separate.

## AWS comparisons and adoption

The first ten staged cases complete without gameplay/startup failure on one managed m7i.xlarge (4 vCPU/16 GiB, linux x86_64), Node 24.13.0, pnpm 10.33.0, in the selected project/Region. Source archives and profiler-only input transforms are exact and bounded; these are real server/native/PostgreSQL runs with one controlled person, six idle people and twenty native animals. Seed 1086, 60:1 clock, 60/30-game-second broad/detail sensing, 500 ms movement/bursts, SSE, presence and no state polling remain unchanged. Paid cognition is disabled.

Each short case warms 30 seconds and offers 90 measured seconds. The staged harness captures published clock progress at offer stop, but CPU only at later phase completion. Those CPU figures include request drain and are labeled whole-procedure costs; staged offer-stop CPU is unavailable. The maintained profiler now captures `clockDebt.through.offerStopCpu` directly for the final measurement, so CPU and progress use one boundary. This is a measurement correction, not a game optimization. Published pauses, late input/IPC, debt and real completed work remain separate.

N2 removes 26.46% of native signature builds (2,400 → 1,765), with identical checked physical/RNG digests. Its fixed-work CPU is 4,927.929 ms versus 4,901.301/4,861.262 ms for its P1 controls; whole-procedure server CPU is 16.0132 ms/game second versus 16.0380/15.8514. It fails the adoption gate and is removed; fewer helper calls do not establish a complete-path gain.

P1's first fixed-work result is 4,923.886 ms versus 4,931.580/5,002.370 ms for repaired controls. Its whole-procedure server cost is 16.0410 versus 16.1169/16.1719 ms/game second, but wildlife travel is 495 m versus 1,664/1,372 m. This does not demonstrate equivalent-work saving. The one permitted repetition uses 600 three-game-second native advances (1,800 game seconds/30 broad periods, matching normal host offer size more closely) and a fresh repaired → P1 → repaired server bracket. Its exact offer-stop main CPU is 15.28008 / 15.00890 / 15.64908 ms per game second, core usage 91.660 / 90.047 / 93.870%, normal clock 99.9776 / 99.9929 / 99.9737%, and command p95 280.17 / 200.95 / 288.25 ms; all accept 192 commands. Wildlife travel remains unequal (925 / 554 / 456 m), with player travel 299 / 307 / 320 m. P1 therefore has limited observed server benefit, not a guaranteed equivalent-overhead percentage or scale result.

The repetition's fixed native CPU is 21,566.040 / 21,643.138 / 21,718.021 ms: P1 remains between controls. Checked physical/RNG/numeric/action consequences agree, with two explicit allocated-action-ID renamings; raw hashes are retained. Unchanged attention-candidate preparations fall 5,888 → 310, while changed candidates remain 560 and root lookups 55,146. Field selections barely change (546,029 → 545,833), as do history encoded bytes (1,417,239 → 1,414,885). Cold opening is 4,685 / 4,314 / 4,633 ms, restore 1,199 / 1,203 / 1,213 ms, retained main heap 226.28 / 218.14 / 200.64 MB; differing age/trajectories limit heap conclusions. P1 is retained for the removed work and consistent server CPU/latency direction across both brackets, without a native CPU, sustainable-cleanup or capacity claim. N2 remains removed. No further repetition follows.

The A5 census observes 1,438 received-body occurrences and only seven zero-urgency/non-direct upper-bound candidates; those seven are not proof they could safely skip selection. No broader eligibility cache is adopted. Q1 observes zero history-revocation calls during ordinary progress; no batching machinery is added for that absent cost. The explicit correction/delete correctness scenarios remain required and passed.

Raw staged results, input revisions and analysis remain in `followthrough/aws/`; 155 staged collected files are hash-verified. The fixed-native digest covers recorded placements, attributes, alive/status flags, foraging mode and RNG; it is not an exhaustive action/health equivalence proof and is paired with the connected native checks above.

## Final operating measurement

The final adopted source runs the prescribed 60-second warmup/360-second opening and a separate 30/90 CPU diagnostic. Both complete without a failed-case stop. The managed pool assigns another standard m7i.xlarge, so this is independent qualification, not a paired speedup against the earlier worker. No subsystem is disabled beyond the prescribed zero-paid-cognition workload.

| Offer-stop observation                    | Final opening                         |
| ----------------------------------------- | ------------------------------------- |
| Published normal-clock progress           | 99.99949%                             |
| Game / real seconds                       | 21,600.53222 / 360.01071              |
| Main CPU                                  | 349,795.434 ms; 97.16251% of one core |
| Server-process CPU                        | 114.47030% of one core                |
| Main CPU per game second                  | 16.19383 ms                           |
| Successful command requests               | 727                                   |
| Skipped load intervals                    | 41                                    |
| Command p95                               | 985.405 ms                            |
| Paused / storage or background failures   | 0 ms / none                           |
| Admitted pending debt, beginning → ending | 3.58389 → 3.26156 game seconds        |
| Offer-stop IPC receipt lag                | 11.718 ms                             |
| Living people / animals, beginning → end  | 7 → 6 / 20 → 20                       |
| Retained main heap / process RSS          | 391,184,728 / 1,959,858,176 bytes     |

CPU and progress share the actual offer-stop boundary; the process measure includes other Node threads, excludes PostgreSQL and is not added to main-thread CPU. RSS is resident process memory, not heap or peak allocation. Skipped intervals are load-driver opportunities missed while its prior request is still completing, not refused game commands. Ada dies at game time 21,866.66667: the retained event identifies `cause: needs`, without distinguishing hunger from thirst. This reduces late observer work; paid/autonomous cognition is disabled. Population/work changes remain explicit, and this long opening is not an equivalent-work comparison to the short brackets. Normal-clock acceptance passes, but near-core saturation and roughly one-second command replies do not establish acceptable headroom or population capacity. No further optimization campaign follows this result.

The actual manual checkpoint completes and passes full cold validation: 72,530,784 bytes, 26,837 rows, simulation time 25,300/revision 406, checksum `61a17a26fc6d7c4ef82f036e8675f853a6d20b2896318d3bce785f22e418a046`. Correctly retained canonical history is not pruned to improve a benchmark. Sustainable cleanup and mature-history acceptance remain open.

Automatic capture records one due attempt, one captured/settled checkpoint and zero failures, busy refusals or retention failures. Cleanup begins with zero debt. At the ending retained cut there are zero wholly collectible blocks/payload bytes and zero unowned candidate values, plus 130 queued value candidates/49,359 bytes that may still be owned and five partial blocks/59,222 bytes of occupied boundary storage. The latter are not wholly collectible debt. This one boundary does not establish sustained cleanup or a long-lived character's storage rate.

### Remaining CPU work

The separate fresh-phase main-thread Inspector trace contains 83,525 samples/35,428 distinct nodes; sample/delta counts agree and no invalid deltas occur. It excludes setup/warmup/cleanup and includes bounded outstanding-request drain. The following nearest-application-owner partition assigns every sample once; it is not PostgreSQL CPU, database waiting or a promise that these percentages can be eliminated.

| Exclusive sampled owner                      | Share   |
| -------------------------------------------- | ------- |
| Sensory, attention and personal-history work | 29.353% |
| Mutable-draft and immutable-value handling   | 15.654% |
| Other domain helpers                         | 14.721% |
| Status, attributes and time                  | 9.541%  |
| Native movement and scheduling               | 6.972%  |
| Other server work                            | 5.252%  |
| Saving and historical placement              | 3.914%  |
| Garbage collection                           | 3.749%  |
| Geometry and navigation                      | 3.523%  |
| Idle                                         | 2.657%  |
| Player/context projection                    | 2.423%  |
| Events and experience                        | 1.154%  |
| Runtime/library without application owner    | 1.087%  |

Remaining reception still acquires actual changes, selects effective fields, maintains detailed attention/chronology and supplies player views. Important complete call chains include `updateEncounters` (19.776%), `projectView` (10.047%), `withCurrentPerceptionBatch` (9.934%), `updateAttention` (7.835%) and `acquireAwarenessObservation` (7.515%). These are **overlapping inclusive** samples and must not be added to each other or the table. Sharing broad confirmations removes one write/invalidation cause, not this whole procedure: fixed-work root lookups remain 55,146 and field selections barely move, as quantified above.

Nearest-application-owner attribution includes `finishWorld` (3.717%), `readOnlyDraftView` (2.861%), `isImmutableData` (2.796%), `currentContactNativeFacet` (2.072%), `entityGet` (1.190%), `nextAttentionWorkAt` (1.111%), `encodedBody` (1.086%) and `receivedAttentionSources` (1.034%). This includes library work assigned to its nearest application caller; it is not function self time. These figures identify repeated record access, draft traversal/finalization, current-field selection and encoding still on real callers, not independent additional subsystem costs. The 14.721% other-domain group remains explicitly unassigned at a gameplay-subsystem level; neither it nor the 3.914% saving group can establish exact backend/wait costs. Sustainable cleanup, retained growth and population capacity need their existing operating gates, not inference from this small trace. Node/callsite and owner analyses are preserved in `followthrough/aws/final-cpu-nodes.json` and `final-cpu-owners.json`.

### Evidence and resource closure

All three managed campaigns complete cleanly, with artifacts collected, verified, acknowledged and claims released. Staged/repetition/final manifests contain 155/50/38 verified files. Final campaign `0145acf2-2663-4fca-b70e-f87a4c285ceb`, run `dcf7a8cd2b11d9fc6a490d9e13684115`, uses slot 3/generation 58; its 38 manifest files total 86,796,494 bytes. The collector's final copy has 43 files including sidecars, all separately hashed. Manifest hash is `24e4b191f42e25ce2550cb6979dc6d499111a449c4845e616ee3c7034b1c6ff7`; artifact-set hash is `6d9e93eb8007b55b92d015f66f6675c47dd0d9a1b620c30e0ce441f2dd8cf756`. The canonical manifest remains outside Git at `/Users/mzw/.codex/verification/OpenLegend/workers/campaigns/0145acf2-2663-4fca-b70e-f87a4c285ceb/results/followthrough-final/manifest.json`.

Generation-fenced closure confirms comparison worker `i-01bdb83b2c3aadf43` stopped after the repetition, and final worker `i-0a79acd3dc442cf82` terminated after release; no uncertain lease remains. The final controller ledger charges $1.030763, with $0 reserved, within the shared $6 worker allocation/$10 task ceiling. This is controller-accounted execution, not a reconciled AWS invoice or a claim about unrelated pool storage costs. Paid model cost remains $0. Lifecycle/allocation receipts are in `followthrough/aws/final-generation-status.json`, `allocation-after-final.json` and `final-completed-status.json`. No further campaign is launched for that qualification.

## Focused confirmation and persistence review

Review of `f7353e241..fe7a5e2c0` identifies two local correctness defects. A kind-limited, detail-only or unrelated-exposure confirmation could promote a contact-wide stamp and refresh unchecked siblings. The common receiver now requires actual unrestricted broad body coverage before promotion; restricted checks retain their exact partition clocks. A metadata-only current-contact write also assumed its reference closure could not change. The existing writer now compares that closure once, writes `value_refs` only when necessary and supplies exact additions/removals through its ordinary ownership path. Unchanged reference sets skip redundant set/delta construction across current-owner tables. No new store, cache, format or world policy is introduced.

Twelve actual receiver/current-consumer checks and current-format validation pass. A negative control applying the exact old promotion guard reproduces false sibling freshness for location-only, description-only, detail-only and unrelated-exposure checks; it is explicitly rejected. Whole broad/detail and default-unmasked checks still refresh their actual covered fields. Evidence remains in `followthrough/p1/review-confirm-scopes{,-old-control}.{mts,json,log}`.

Six connected PostgreSQL checks pass: actual native and direct inline confirmations retain metadata-only writes with no target-contact ownership SQL; a constructed supported shared-frame specimen updates metadata/reference columns and exact additions/removals; after phase renewal, collection deletes unowned frame A while retaining contact-only frame B; full current-format cold validation restores B exactly. Today's native producer inlines frames, so the shared-frame specimen qualifies the supported representation, not its frequency in ordinary gameplay. Four fixture/import setup failures are excluded and retained separately: acquiring new detail was not a metadata-only control, and copied teleports violated authored terrain support. Simplified valid authored placements resolve setup without runtime changes. Owned disposable databases and working directories are removed; retained results remain external. Evidence is in `followthrough/review/contact-frame-result.json`, `contact-frame-run.log` and the separate attempt logs.

TypeScript, production build/asset guard, affected formatting and links pass. No unit suite, new maintained tests, speed run, cloud resource or paid model call accompanies these fixes; additional and cumulative Jev cost is $0. The AWS measurements above bind their exact earlier source and are not fresh speed qualification of this review. Bounded current-owner closure comparison and removal of duplicate reference/set work add no historical scan or per-field confirmation loop. Existing CPU/latency, sustained-cleanup and population gates remain open.

### Dependent-field withdrawal and filtered cuts

The subsequent source review through `d50a86e0b` identifies two detachment gaps. Narrow body-fact removal or unavailability could leave surviving location/detection fields unable to consult their last shared check. A location-only captured cut after an explicit partial confirmation could also retain that check's time/frame/order but emit its older measurement proof version. One shared detachment helper now selects the eligible check once and preserves its complete proof. Destructive body changes detach only exact affected exposure/channel siblings; same-exposure value replacement and ordinary full-phase renewal do not flush contacts. Non-sight, onset-pose and otherwise ineligible checks remain unchanged.

Three actual native forgetting/correction/unchecked scenarios pass. Surviving location retains time 10, revision 5 and its exact frame/order, with measurement/acquisition dates unchanged; corresponding terminal coverage begins at 10. Independent stale description and every unrelated contact remain unchanged. Current/temporal validation passes after mutation and JSON cold copying. Two excluded setup failures used an unprepared world/camp marker; the existing prepared stocked-camp fixture supplies valid authored state without a product workaround. External evidence, source copies, hashes and the dirty patch are in `followthrough/review/capture-lifecycle-manifest.json`.

Nine grouped native/capture/support checks pass: an unchanged location with measurement revision 1 and later same-time partial-check revision 3/order 165 emits revision 3 and the exact frame/order in a body-omitting cut. Original dates, native identities and later-cut isolation remain intact; `recordSnapshotSupport` → `retainedTemporalReceipt` retains that version. The old conditional expression reproduces revision 1 and is rejected. Real touch acquisition/renewal under the authored touch-demo preset stays independent of the higher sight counter. One excluded fixture attempt lacked an installed touch channel. Evidence is in `followthrough/p1/review-filtered-partial-capture.{mts,json,log}` and its separate failed-attempt log.

TypeScript, production build/asset guard and focused formatting/link checks pass. No unit suite, maintained test, service/database startup, cloud work, speed run or paid model call accompanies this follow-through; additional and cumulative Jev cost is $0. The earlier PostgreSQL codec/ownership checks remain applicable to the unchanged record layout; JSON cold checks do not claim a new database restore or performance result. CPU/latency, cleanup, population and configured-local readiness gates remain open.

## Configured local development destination

The configured local database is schema 22, already incompatible with the task's schema-55 starting code. Read-only inspection finds nonempty protected spending/uncertain-attempt and access records. It has no active connections, but a fresh replacement would disconnect that authority; retaining only selected old tables is not a supported current-format initialization. The operational restore tool also refuses the older marker. No database, credentials or ignored configuration is changed. Fresh current-format startup/reopening is verified separately; replacing this configured destination needs an owner-directed protected-data resolution under the existing [save policy](../../../../../AGENTS.md#development-save-policy) and [operational boundary](../../../../save-and-load.md#external-work-privacy-and-shared-authority). No legacy reader, migration or weakened policy is introduced.
