# Deeper current-state and publication ablation

## Question and scope

Identify substantial CPU costs left after BK24 by removing entire subsystems and then their components. Measured source: Macrofold/OpenLegend `3a6baeff2ee23341f8e7514e3be9a8ef24f2be82`, `codex/stealth-runtime-01-evidence`, repository `https://github.com/Macrofold/OpenLegend.git`. Its executable `apps/`, `packages/` and `scripts/` contents are identical to reviewed runtime `bd7da905984e500c6434bc39aab814a042e69e1b`. Every group uses source archive SHA-256 `3c092ce38867a61a94c894c9eebea4d5f4f8a413d7bf8aea2eadce6f033e6cdf`. Production runtime is unchanged; replacements are proposals.

This follows the [sparse-reception investigation](2026-11-05-sparse-reception.md). Its earlier failed sustained gate is historical evidence for its recorded source/settings, not the result of this campaign.

**Completed investigation:** 61 case procedures reached measurement across four groups. Two removals were unexercised; the final long baseline subsequently failed full cold validation. These are not 61 distinct variants or 61 acceptance passes. Production runtime is unchanged. Normal-clock results, CPU demand and lifecycle qualification are separate outcomes; no production speedup or scale pass is claimed.

## Workload, hardware and interpretation

- Standard managed AWS worker: m7i.xlarge, four logical CPUs, nominal 16 GiB, project `027677879749`, `us-east-2`; actual A/B receipt reports Intel Xeon Platinum 8488C, `MemTotal: 16078388 kB`, Node 24.13 x64. Instance `i-01bdb83b2c3aadf43`, slot 2; A/B/C generations 146/147/148. Each comparison group has its own controls. Do not assume a continuous OS session across claims; C was stopped before D generation 149 started.
- Fresh owned PostgreSQL database and authored wilderness seed 1086 per case. All 48 A–C cases retain seven living people, twenty living animals and 74 root objects. The final long D baseline ends with six living people, twenty living animals and the controlled person alive; that population change matters to interpretation. One controlled person actually walks; other people are not scripted to work. A real NPC utterance is offered about every five real seconds. Native animal behavior remains active except for named cuts.
- Clock 60 game seconds per real second; broad/detail sight 60/30 game seconds, contextual/relation timing 20, ten detailed-attention slots. `sight-3x` alone changes ordinary sight to 180/90. No god mode, browser/renderer or paid model calls. Autonomous thought returns before context preparation at budget zero.
- Thirty real seconds warmup and ninety measured seconds in A–C, with application counters, runtime monitoring and CPU sampling off. The controlled input interval is 500 ms with a triple command burst every thirtieth interval. **Actual measured and warmup HTTP state-poll counts are zero in all 32 A/B cases**: the standard driver passes `readIntervalMs: 0`; the script's 250 ms default applies elsewhere. The real SSE stream, control, presence and permitted projection remain.
- Actual cold initialization/reopen/validation precedes cut activation. The private transformation manifest, exact applied anchors, private patch and positive bypass counters establish what ran. The private tree/database/process are cleaned through the managed runner. Static transform checks are not gameplay checks; no unit suite ran.
- Main-thread CPU divided by completed game seconds measures computational demand. At 60:1, 16.667 CPU ms per game second consumes an entire core. Process CPU includes other Node threads, excludes PostgreSQL and the HTTP load child, and overlaps main CPU. Neither overlapping CPU nor inclusive/waiting stage times are added.
- The measured phase includes request drain and the pressure-stop tail. The child offer-stop/parent observation records pending game-time debt before stream closure, including lateness and receipt lag. Short ratios above 100% can repay warmup debt; they do not establish sustainable speed above 1×. Lifecycle endpoint pauses after stream closure are distinguished from pauses during offered work.
- Cut effects include changed downstream behavior and are **not additive subsystem CPU shares**. Seeded wall-timed input does not produce identical animal routes: A control animal travel varies 389.6–819.1 m. Control CPU/game spreads are A 1.03%, B 6.32%, C 2.84%; these ranges are not statistical confidence intervals. Small differences remain uncertain.

## Completed comparisons

All A–C profile procedures completed without setup/control/cleanup hard failure. Figures below are measured-window main CPU and command latency, not cold setup or external procedure duration. Unexercised removals are excluded from causal rankings. Counterfactual completion establishes neither gameplay equivalence nor same-format restoration of deliberately omitted working state.

### A — Native reception and attention

| Case                                  | Removal / control                                | Main CPU ms / game second | Command p95 ms |
| ------------------------------------- | ------------------------------------------------ | ------------------------: | -------------: |
| a00-baseline                          | Control                                          |                    16.224 |          470.8 |
| a01-encounters-off                    | Encounter pipeline off                           |                    12.217 |          103.0 |
| a02-optional-history-off              | Optional history off                             |                    16.338 |          400.3 |
| a03-attention-freeze-early            | Attention and relations held                     |                    15.433 |          292.5 |
| a04-attention-hold-after-rank         | Full ranking, held membership                    |                    16.300 |          400.0 |
| a05-attention-hold-before-rank        | Ranking skipped, held membership                 |                    16.124 |          347.9 |
| a06-relations-off                     | Native relations off                             |                    16.944 |          537.0 |
| a07-baseline                          | Control                                          |                    16.330 |          454.8 |
| a08-geometry-off                      | Context geometry acquisition off                 |                    16.497 |          550.7 |
| a09-detail-off                        | Selected detail acquisition off                  |                    16.368 |          460.2 |
| a10-broad-off                         | Broad acquisition off                            |                    16.467 |          475.1 |
| a11-current-confirmation-mutation-off | Partition confirmations and optional history off |                    16.155 |          393.5 |
| a12-body-read-guards-off              | Current body/channel guards bypassed             |                    16.602 |          660.3 |
| a13-ordered_forecast_off              | Ordered movement preview off                     |               Unexercised |              — |
| a14-animal-choices-off                | New animal actions stopped                       |                    12.903 |          210.6 |
| a15-baseline                          | Control                                          |                    16.163 |          493.3 |

### B — Storage and snapshots

| Case                                     | Removal / control                            | Main CPU ms / game second | Command p95 ms |
| ---------------------------------------- | -------------------------------------------- | ------------------------: | -------------: |
| b00-baseline                             | Control                                      |                    16.936 |          508.0 |
| b01-current-metadata-rowprep-off         | Current metadata preparation skipped         |                    16.324 |          526.4 |
| b02-current-contact-rowprep-off          | All current-contact preparation skipped      |                    16.564 |          473.5 |
| b03-current-row-application-off          | Current-contact SQL application skipped      |                    16.144 |          479.0 |
| b04-attention-relation-rowprep-off       | Attention/relation preparation skipped       |                    17.323 |          531.4 |
| b05-perception-working-state-rowprep-off | Perception working-state preparation skipped |                    16.536 |          467.6 |
| b06-current-freshness-save-off           | Saved check metadata normalized              |                    16.416 |          494.1 |
| b07-baseline                             | Control                                      |                    15.929 |          499.6 |
| b08-seal_all_off                         | Specialized evidence sealing off             |                    16.397 |          608.8 |
| b09-seal_nested_off                      | Nested specialized sealing off               |                    16.452 |          696.1 |
| b10-seal_final_off                       | Final specialized sealing off                |                    16.317 |          559.2 |
| b11-seal_perception_off                  | Current-perception specialized sealing off   |                    16.158 |          620.0 |
| b12-danger-refresh-off                   | Animal danger refresh held                   |                    18.129 |          653.9 |
| b13-status-rules-off                     | New status-rule reconciliation off           |                    15.617 |          347.3 |
| b14-sight-3x                             | Ordinary sight three times slower            |                    16.456 |          585.3 |
| b15-baseline                             | Control                                      |                    16.592 |          549.8 |

### C — Deeper removals and interactions

| Case                                 | Removal / control                                                                                                                                | Main CPU ms / game second | Command p95 ms |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------: | -------------: |
| c00-baseline                         | Control                                                                                                                                          |                    16.930 |          538.7 |
| c01-encounters-off-replica           | Encounter pipeline off                                                                                                                           |                    13.686 |          206.5 |
| c02-animal-choices-off-replica       | New animal actions stopped                                                                                                                       |                    12.655 |          200.8 |
| c03-encounter-animal-interaction     | Encounter pipeline off + New animal actions stopped                                                                                              |                     5.418 |           32.2 |
| c04-private-measurement-deadline-off | Measurement deadline queries skipped                                                                                                             |                    16.201 |          514.4 |
| c05-attention-deadline-off           | Attention deadline queries skipped                                                                                                               |                    15.832 |          490.9 |
| c06-sight-deadline-off               | Sight deadline queries skipped                                                                                                                   |                    16.258 |          514.8 |
| c07-contact-deadline-off             | Incidental-contact deadline skipped                                                                                                              |               Unexercised |              — |
| c08-baseline                         | Control                                                                                                                                          |                    16.660 |          537.7 |
| c09-all-deadlines-off                | Measurement deadline queries skipped + Attention deadline queries skipped + Sight deadline queries skipped + Incidental-contact deadline skipped |                    16.473 |          428.1 |
| c10-animal-subjects-human-sight-off  | Animals excluded as human visual subjects                                                                                                        |                    16.417 |          379.2 |
| c11-animal-dynamic-body-sweeps-off   | Animal dynamic-body sweeps bypassed                                                                                                              |                    16.313 |          575.0 |
| c12-attention-history-parent         | Attention and relations held + Optional history off                                                                                              |                    15.851 |          358.6 |
| c13-parent-visual-reception-off      | Attention and relations held + Optional history off + Visual current reception skipped                                                           |                    15.239 |          255.9 |
| c14-status-rules-off-replica         | New status-rule reconciliation off                                                                                                               |                    16.006 |          440.0 |
| c15-baseline                         | Control                                                                                                                                          |                    16.463 |          603.4 |

### D — Projection, native interaction and longer operation

D adds one coherent parent-observed offer-stop CPU/time/game cut **before request drain**. The CPU column uses that cut; clock fraction and command p95 use the complete measured phase. These are different explicitly named boundaries. D controls, not A–C small differences, establish its comparisons. All short cases offer ninety seconds; the last two offer 360.

| Case                                        | Removal / control                                       | Offer-stop main CPU ms / game second | Phase normal fraction | Accepted-command p95 ms |
| ------------------------------------------- | ------------------------------------------------------- | -----------------------------------: | --------------------: | ----------------------: |
| d00-baseline-off                            | Control, app counters off                               |                               15.914 |              0.999074 |                   325.8 |
| d01-wire-payload-off                        | Outgoing payload suppressed                             |                               16.110 |              0.997806 |                   346.1 |
| d02-view-hold-wire-off                      | Same-scope player view held + payload suppressed        |                               15.037 |              0.999267 |                   222.6 |
| d03-view-wire-encounters-off                | Held view/payload + encounter pipeline off              |                               10.797 |              0.999898 |                    57.9 |
| d04-baseline-app-on                         | Control, app counters on                                |                               16.044 |              0.999923 |                   375.4 |
| d05-interaction-app-on                      | Animal actions + encounter pipeline off, counters on    |                                4.686 |              0.999963 |                    26.8 |
| d06-animal-choices-app-on                   | Animal actions off, counters on                         |                               11.447 |              1.000166 |                   187.5 |
| d07-baseline-cpu-only                       | Fresh measured-window CPU profile                       |                               15.898 |              1.005707 |                   325.5 |
| d08-baseline-off                            | Control, app counters off                               |                               15.989 |              0.998313 |                   343.5 |
| d09-empty-native-evidence-end-off           | No-effect current endings skipped                       |                               15.512 |              0.999623 |                   307.5 |
| d10-memoryless-native-routine-reception-off | Memoryless native ordinary reception off                |                               16.223 |              0.999971 |                   363.1 |
| d11-long-optional-history-off               | Optional history off, 360 seconds                       |                               16.875 |              0.976984 |                  1063.8 |
| d12-long-baseline-retain-mature             | Unmodified baseline, 360 seconds; cold validation fails |                               16.284 |              0.999624 |                   996.5 |

D controls use 15.914–15.989 offer-stop CPU ms/game second; instrumentation-on control is 16.044, without a large observed application-counter penalty. Payload suppression has no CPU gain. Holding projection/patch inputs as well lowers 16.110 to 15.037 (6.7% conditional); removing encounters after that lowers 15.037 to 10.797 (28.2%). This bounds permitted view/patch work separately: downstream presentation cannot explain the whole encounter cost. The held view is deliberately stale and is not a production option.

The no-effect ending guard bypasses 41,242 existing-empty and 19,632 absent-owner calls for only about 2.5–3% less CPU/game than D controls. Native ordinary-reception suppression bypasses 38,618 alarm and 104,581 acoustic-only relevance queries without a CPU gain. Neither large call count establishes a large CPU owner. Those cuts retain native danger/action effects and actual hearing but can change later continuity and reactions.

With counters on, stopping animal actions lowers 16.044 to 11.447; adding encounter removal lowers it to 4.686. Baseline → animal-only → combined native forecast counts are 2,162 → 300 → 289; considered status rules 403,135 → 63,946 → 60,858; materialized native value episodes 3,454 → 469 → 456. Thus animal removal already eliminates most mechanical/rule preparation. The additional combined saving is not explained by another comparably large collapse of those populations. Rate materializations remain 2,791 → 1,925 → 1,808. Selected sensory observers instead rise 1,485 → 3,768 → 0: animal freezing leaves thirteen alarm episodes unresolved, changing observer demand. Do not subtract these cases to claim clean component CPU percentages.

Long optional-history removal reaches 0.976984 normal versus baseline 0.999624, with no demonstrated history-removal gain. Both develop roughly one-second command p95. The input child skips 52 and 44 timer intervals respectively; accepted/busy commands are 714/2 and 715/6. A near-normal game clock therefore does not establish responsive or fully delivered input load, spare CPU, long-term cleanup sustainability or capacity. The baseline automatically captures and settles one checkpoint with zero reported capture failures; its subsequent explicit full cold read fails, as described below.

### Applied work and fidelity limits

- `a13` ordered-movement preview and `c07` incidental-contact deadline have zero measured bypass hits. Their raw numbers cannot establish savings. `c09` exercises only the measurement, attention and sight families; its fourth contact flag is unexercised.
- Attention freeze includes relation suppression and changed downstream attention; held-before versus held-after ranking isolates only their conditional rank-loop difference. `a11` also disables optional history and must be compared with `a02`, not treated as a standalone confirmation cost.
- Optional-history suppression bypasses actual optional group preparation, selection/capture and geometry recording; required occurrences and independently supported knowledge remain. There is no clear young-opening CPU win. It does not qualify history/memory loss as acceptable, nor settle mature history cost.
- Bypassed current body/channel guards run 466,920 scope and 253,291 channel times in `a12`, without a clear large CPU win. Counts alone do not establish an expensive owner. Ordinary continuous movement does not automatically invalidate current body grants: the guard compares explicit `invalidatedRevision`, physical life and channel conditions.
- Row-preparation counters in `b01/b02/b04/b05` count skipped visits/preparation nodes before final equality/diff. A skipped owner can suppress a subtree; these are not emitted SQL-row counts. `b03` is the actual prepared-row application boundary: 19,733 current-contact rows, 18,081 metadata-only (91.6%) and 1,652 content rows. Payload-string lengths sum to 86,546,982 bytes and metadata-string lengths to 37,183,053. Cached strings can be counted repeatedly; these are neither newly encoded/allocated bytes nor actual SQL transport. Metadata-only SQL omits the old payload.
- Specialized sealing bypasses are exercised: all 6,875, nested 1,680, final 5,773 and current-perception 2,586. They leave generic Immer/current/final freeze behavior intact; Immer auto-freeze was already off. No large young-opening CPU win follows. A sealed structure is an in-memory read snapshot, not a durable memory or SQL record.
- Stopping animal actions freezes animal travel at zero and leaves thirteen response episodes active, versus zero to four at control endpoints. Its saving includes movement, consumer demand and altered controller state. Excluding animals from human sight keeps their movement/controllers; bypassing animal body sweeps keeps terrain/path execution but changes trajectories (4,448 m in `c11`). Neither narrower cut demonstrates a large clean gain here.
- Slower sight, individual deadline-family removal and the three-exercised-family combination show no comparable large saving. Actual service still runs and can be late; these cuts do not prove equivalent deadlines. Whole-encounter cut deadline counters count calls in that changed run, not baseline calls: removing deadlines changes traversal and interval counts.
- Status-rule suppression remains a possible small effect. Both specimens have about three seconds of request drain after the ninety-second offer window; preserve that limitation instead of claiming an isolated 6% saving.

### Interaction and current diagnosis

The encounter-removal saving repeats: 12.217 CPU ms/game second in A and 13.686 in C, against their own 16.163–16.330 and 16.463–16.930 controls. Animal-action removal repeats at 12.903 and 12.655, with the substantial behavioral changes above.

**Together they fall to 5.418 CPU ms/game second in `c03`, 67.1–68.0% below C controls.** Main CPU is 29.271 seconds in the roughly ninety-second phase, command p95 32.24 ms, 192 move intents succeed and the person travels 327.3 m. All seven people and twenty animals remain alive. The animals do not move. This is a strong coupled removal result, not a playable optimized implementation or a partition of CPU shares.

D reproduces the interaction and separates much of presentation. It also shows that animal freezing increases some sensory work while eliminating most forecast/rule preparation. The confirmed conclusion is overlapping native simulation and personal-current processing with substantial representation overhead, not one discovered global cache failure. Mechanical revision excludes perception writes. The unused `preserveReceivedValuePreparation` and unexercised ordered-movement preview are not measured causes.

## Source-backed mechanisms and tested limits

These are actual code paths; their relative CPU contribution remains experimental:

1. **Repeated preparation before knowing work is due.** `nextPerceptionMeasurementAt` calls the full `perceptionMeasurementWork`, which resolves vision participation, inspects attended bodies/familiarity and constructs a subject set to return only `nextAt`. `updateEncounters` can request that preparation in its pre-measurement probe, perform an all-actor cleanup pass, then request it again for routine work. Getter cuts did not demonstrate a large saving by themselves. A cached scalar schedule is therefore a candidate, not the established primary fix. Actual cleanup, priority/latch work and rate materialization prevent an unsafe blanket early return.
2. **Empty current-evidence endings.** `endCurrentEvidence` touches native snapshot metadata before testing for an owner. For an existing empty owner it opens the receiving/current transaction and its temporary collections, sends an empty availability transition and invokes attended reconciliation. Calm memoryless native actors can take this path repeatedly. The D guard retains actual movement, sensing and lifecycle work; its small saving supports a bounded cleanup, not a primary redesign.
3. **Native acoustic continuity creates ordinary observer demand.** An external audible source that is also visible can create a visual episode before native null-profile/subthreshold alarm rejection. `routineObservationRelevant` treats a remaining episode as receiver demand; later native visual reconciliation clears it only after actual loss. Acoustic-pattern expiry alone does not clear that binding. Thus a quiet memoryless native animal can keep ordinary reception active while the old source stays visible. Self sounds cannot create this episode (`!self` gates visibility). D exercises the affected queries but shows no CPU gain from removing native ordinary reception. Do not adopt weaker native continuity/alarm behavior for an unsupported performance benefit.
4. **Permitted view preparation can multiply native reads.** `projectView` resolves visible body IDs, four current detail kinds, identity/grants and interaction information before several row memo checks. Its visible-list cache depends on the whole entity collection. Existing GamePatch transport and memoized context-action references are already installed; proposing them again is not a new fix. D holds a same-scope permitted projection and separately removes payload encoding/delivery; its conditional projection saving is about 6.7%, while payload-only suppression has none. Existing stream bytes/chunks do not prove visible-body counts or projection CPU: the encounter cut retains more total current contacts (238 versus 204 in one control), with fewer pooled values (782 versus 3,152).

A real successful check can legitimately change a proof's revision/opaque reference. Global confirmation metadata also gives meaning to omitted per-detail times. Future reuse must preserve the actual encoded time/source tuple and independent stale details, not drop those dependencies to make rows appear stable.

## Valid CPU trace and structural interpretation

`d07` starts Inspector profiling after warmup and stops before accounting/cleanup. Its raw trace has 83,618 samples, the same number of finite positive deltas and zero negative deltas. Raw duration is 93.022 seconds, including about 0.576 seconds of Inspector-start lead; the actual phase is 92.446 seconds. Sample counts below identify recurring code, **not exact CPU milliseconds or additive CPU percentages**. Compiled TypeScript frame columns are not source line numbers.

| Self-sampled code        | Samples | Actual work                                                           |
| ------------------------ | ------: | --------------------------------------------------------------------- |
| Immer state library      |  17,140 | Proxy reads, draftability checks, shallow copies and finalization     |
| `perception-current.ts`  |   8,088 | Contact/group/part lookup and temporary native field views            |
| `perception-evidence.ts` |   5,959 | Measurement selection, current reception and permitted evidence reads |
| `records.ts`             |   5,541 | Immutable graph certification/copying and encoding helpers            |
| `draft.ts`               |   3,935 | Reading draft backing objects and preparing/finalizing snapshots      |

These file buckets are disjoint self samples, but complete stacks are required to assign their meaning. Actual sampled paths include:

- `advanceWorldNative → executeCommand → executeCommandNative → draftWorld → current → currentImpl → shallowCopy`: admitting a native command can detach the working world. Single-route quiet native movement already has an in-place fast path. Generic command admission, including the source-backed foraging path, and re-entering the native working world still fork. The trace does not identify each sampled command type; `nativeMovementTransition` itself appears in only six inclusive samples. Removing the special sealing optimization leaves generic `current` copying, so its null ablation does not exonerate snapshot work.
- `advanceWorldNative → finish → finishWorld → sealNativeEvidence → immutableDataSnapshot`: a changed observer/history owner can be walked at publication. Identity/certification checks and shared immutable leaves avoid some copying; they do not turn all changed mutable containers into constant-time operations.
- `updateEncounters → withCurrentPerceptionBatch` and `projectView → currentObservedFacetValues → currentNativeFacetAt → currentContactNativeFacet`: consumers repeatedly resolve a contact's fields, group, original and metadata partition. Existing indexes and body-read scopes help; typed field calls still allocate borrowed-view wrappers and repeat backing-object reads. Removing permission guards alone does not remove this graph-navigation work.
- Native rule/rate preparation remains real: the baseline considers 403,135 rules and prepares 24,259 subject-status entries, while reusing 84,880. Animal-action removal changes these populations sharply. A status-rule cut alone has no comparably large gain, so neither the rule count nor its overlap with proxy work is an independent CPU percentage.

Within the exact phase, 83,617 samples remain. A separate attribution classifies 21,634 utility-leaf samples once by their nearest matching semantic stage: current-field lookup/projection 4,009; status/rate/capability preparation 3,891; world completion/snapshot 3,305; native command/forecast forks 1,611; player-view preparation 103; other world forks 3; other contexts 8,712. These disjoint sample buckets cover only those utility leaves, not complete subsystem CPU. Nested completion is not necessarily a public publication. `draftWorld` occurs in 2,344 inclusive samples and the whole generic-command subtree in 6,016; these overlap other owners. Copy elimination alone is therefore not demonstrated to recover the two-thirds combined ceiling.

Two additional source mechanisms guide the next isolated experiments:

1. `AnimalWorkQueue.nextChoiceAt` already wakes private controller reviews, but `nativeInterval` also treats `foraging.reviewAt` as a global mechanical endpoint. The due foraging call unconditionally discards mechanics again. The baseline has 1,040 foraging-review ending causes and 1,540 endpoint discards. Reusing the private wake path could preserve unrelated physical calculations when review changes no actual dependencies, without slowing animals. Actual work ends and status/physical thresholds remain mandatory.
2. Broad and detailed visual intake each open/close `withCurrentPerceptionBatch` before `finishVisualReception`; deferred inner completion does not suppress every outer attended/contact finalizer. A subject's sibling fields can also re-enter receiving hooks independently. One existing-owner acquisition lifetime and subject patch can eliminate those duplicate boundaries; an outer wrapper alone does not remove the immediate `confirm → captureTemporalCurrent` path. The prototype must explicitly convert that obligation and preserve source order.

The animal cut also removes native food-search work: the baseline visits 76,723 foraging sight candidates and 219,782 wandering eligibility checks. These differ from its 2,879 ordinary sensory pair retests; native ordinary-reception suppression keeps the food-search/controller owners. `nativeActionCalls` counts action advancement, not new decisions/commands. The `foraging.ts` frame-family union has 863 of 83,617 exact-phase samples (693 inclusive in `nativeForagingIntention`, 68 self there). Inlining limits absence inference, but this does not establish food-candidate filtering as another major cost. No measured split assigns the candidate visits exact CPU time. Unknown current-group read cost and review invalidation are better next targets than a weaker native acoustic continuity policy.

This supports testing the existing private-review boundary, one visual completion, joined current reads and qualified native admission before another history, SQL, scheduler or world-policy rewrite. It does not prove their prospective speedup. [The proposed design](../../../../projects/bookkeeping-simplification-tech-design.md#16-proposed-native-execution-and-current-read-reduction) separates these changes and adoption experiments.

## Restoration failure and focused reproduction

The final unmodified 360-second runtime reaches **0.999624 normal**, with no runtime/storage error or offered-window pause, and one settled automatic checkpoint. The later manual retained checkpoint's full `GameSaves.read` fails `validateCurrentWorldState`: **“Attention annotation has no matching received source.”** Its fixture procedure therefore reports incomplete/failure, not a qualified complete-game/save pass. The intended mature checkpoint was not exported before fixture cleanup, so the exact offending actor in that AWS state is unavailable.

A subsequent disposable **non-timing native correctness scenario**, using `stockedCamp713`, reproduces the same defect without SQL/providers: initial and committed-death states validate; after one ordinary game second, dead NPC `entity-0002` has zero current contacts but 32 attention annotations referencing removed leases. Both live validation and JSON cold-copy validation fail; another sixty game seconds does not repair them. The reproduced route is `endCurrentEvidence` removing current leases without pruning attention annotations when no later visual selection runs. This proves a reachable semantic lifecycle gap; it does not identify the unexported AWS actor. Fix withdrawal/attention atomically through their existing owners, without restoring global reranking during recording or weakening validation.

## Evidence, stopping and resources

The fixed four-group set is complete; no unchanged retries or further campaigns follow it. Startup/reopen validates before experimental cuts. All 61 admitted cases reach measurement; no hidden cloud startup/warmup retry is omitted. Source-anchor/parser preparation failures before dispatch are static-only attempts, not game measurements. The final failure is post-measurement cold validation, not failed startup or an omitted runtime. A–C profile procedures completed; D has twelve completed procedures and the final runtime-complete/cold-validation-failed procedure. The two unexercised removals remain excluded. No executable source, defaults or maintained tests changed; no unit suite or live model calls ran.

Private hash-verified artifacts and exact patches remain outside Git under `/Users/mzw/.codex/verification/OpenLegend/workers/campaigns/`:

- A/B: `f3184a6c-f120-4fcf-8d4f-78fa9f0ff6b6` (`b9eb64744a3c1972cca77e4f6ff868a8`, `aa97a74b87b2ff823fb00c8ddb91cf23`).
- C: `b1210c4c-91f8-421b-885e-43925ca7b455` (`5611996bf18db0de767171b190178a2a`).
- D: `570bca74-ee92-4da7-88f0-ade674cb7099` (`ebbe35dd0dec99d5ea539b88bc0001a8`), final input archive SHA-256 `ad12f4ec0ca2aca44d9f6cd13958b378e5e82df03495b93472998024034990f8`.

The D receipt confirms m7i.xlarge, four logical CPUs / two physical cores, Xeon Platinum 8488C, `MemTotal: 16078392 kB`, Node 24.13 x64. Slot 2 generation 149 completed cleanly; the owned instance was confirmed **stopped November 5, 2026, 14:14:07 UTC**, and the slot has no owner. This is task-resource cleanup, not a passing game checkpoint. The unrelated pre-existing slot 1 quarantine was not touched.

Settled controller cost estimates are A/B $0.536917, C $0.305809 and D $0.319485: **$1.162211 cumulative**, reserved $0, uncertainty recorded $0, under the shared $6 allocation/$10 ceiling. These are controller estimates, not an invoice. Paid game-model cost is **$0**. Derived trace analyses, final resource proof and the non-timing death reproduction are retained privately at `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-05-deep-runtime-ablation/`, with file hashes in its manifest. Raw artifacts are private local evidence, not a published permanent archive. Sustainable retirement/heap, successful mature restoration, browser/live-AI behavior and dozens/hundreds of active actors remain unqualified.
