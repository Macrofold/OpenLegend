# Performance overhaul: deliberate compromise experiments

Updated October 17, 2026 after the sixth complete compromise observation. **The latest average is 2.995×, but smooth 3× still fails.** Busy minutes reach only 2.039× and 2.429×, one accepted walking request takes 10.20 seconds to confirm, and Orin is no longer alive at closure. The checkpoint confirms hunger while he still carried food; a test-driver scheduling hole can strand an idle resident after a busy admission error. The run keeps slower production/four-metre movement sampling and adds the sighting-continuation repair plus longer calculation batches. [Latest result and limits](#sixth-combined-compromise-result--near-target-average-failures-remain). Earlier results remain below.

[Current results](overhaul-implementation.md) · [Current bottlenecks](bottlenecks.md) · [Execution and task decisions](../../projects/performance-overhaul/execution.md)

## What will be different

| Experiment                        | Before                                                                                                                      | Initial version                                                                                                                                                                                                            | Price paid                                                                                                                                                  | Disposition                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Small-character cloth             | Every detailed mercenary garment uses eight constraint passes.                                                              | Small unselected characters may use four; selected and large characters keep eight. The integration rate, body contact, pins, seams and drawing cadence remain.                                                            | Small distant cloth may stretch or move less accurately. Close/selected detail returns; selected one-model checks pass, while crowd quality is unqualified. | Retained after selected visual/lifecycle checks. |
| Busy people noticing routine work | Every eligible nearby person automatically gets an account of routine activity, even while concentrating on their own work. | A busy autonomous gatherer/preparer/crafter may omit an unimportant bystander's routine start/result. Their own actions, human observations, direct involvement, speech, urgent/notable events and active watching remain. | Those people may not later remember the exact routine activity they missed. Current visibility and physics remain. No memory is fabricated afterward.       | Removed after failed complete test.              |

## Why these initial versions

The ten-minute ordinary run completed 335 resident meals but still ran at 1.098×, with 981 saves taking 279 seconds of overlapping elapsed time. Repeated witnessed routine activity multiplies saved accounts across nearby people. Removing automatic capture for a narrowly declared distracted observer attacks that multiplier; merely combining optional recall while saving every original account does not remove it. This revises the originally selected PF17.5 first slice explicitly, under Mike's authorization to experiment with gameplay tradeoffs.

The cloth experiment is narrower: one detailed model family pays per-frame simulation cost. It can help drawing without changing world behavior, but cannot remove database waits. Population counts do not equal cloth-model counts.

## Engine and world ownership

The tested version added a reusable bystander-notice decision to event observation, called only after sensory eligibility for external bystanders. That unused hook was removed with the trial. The trial's base-world policy selected the routine event/action families, autonomous working observers and salience exceptions. Private records, actors' own records and directly involved recipients retain their existing producers. An alternative authored world can always retain every eligible witness. No new save representation, background authority, compatibility reader or invented episode is introduced.

The presentation owner chooses cloth passes using actual displayed projected height. The pinned camera implementation uses the graphics device's client rectangle, so the result is already in CSS pixels; no additional device-pixel scaling is applied. The [official camera API](https://api.playcanvas.com/engine/classes/CameraComponent.html#worldtoscreen) and installed source were inspected. World movement, reach, bodily needs and cognition remain outside this rendering choice.

## Checks and results

Both initial implementations were tested; the busy-witness trial has since been removed as recorded below. A focused native scenario passes through actual commands: an idle witness gets the nearby preparation start, a working witness does not (five audience members become four), both actors retain their own start/result, the working witness still sees the actor and hears speech, and two actual preparation results occur. Policy checks retain important/urgent/unknown events and speech. Cloth threshold/equality/invalid-projection checks pass. TypeScript and generated-configuration checks pass after the implementation and diagnostic additions. Production build `index-BRd6c500.js` passes with the existing large-bundle warnings. The initial ad-hoc launch lacked collision initialization, then used an unsuitable temporary file extension; both fixture setup errors were corrected before these passing checks.

Actual browser visual/lifecycle checks now pass for one rendered detailed model: approximately 20-pixel unselected height uses four passes; selection at about 19 pixels restores eight; about 141 pixels uses eight. At about 94 pixels, arriving from the near tier retains eight and arriving from the far tier retains four. Paused stepping stops, a greater-than-1.5-metre teleport settles with finite coordinates, and explicit graphics loss/recovery resumes drawing with unchanged landscape resource count and finite cloth. The far/near/recovered images were inspected. This qualifies those functional cases, not garment crowds or a timing gain.

The first visual fixture called a nonexistent service method after its successful near/far checks. The correction used the actual Resume button. The second reached recovery setup but the temporary TypeScript runner inserted an unavailable helper into the browser callback; a plain browser expression then passed the remaining recovery check. Both owned fixtures closed normally after recording the errors. Two existing perception cases pass. Eight of nine existing server disclosure cases pass; the cold-history case timed out at 15 seconds while a graphics fixture also ran, and its isolated repeat passes at the unchanged 15-second limit. The complete combined observation and its failed result are recorded below. A profiling-only on-demand view exposes actual model size, selection, constraint passes, finite cloth coordinates and step counts through the existing scene profiler. Ordinary frames do not collect these arrays. The native profiler counts omitted eligible bystander accounts, so a timing result cannot conceal the behavioral reduction. These changes have not achieved 3×.

## First complete compromise observation selected before launch

Run the same 185-second server / 180-second browser expanded fixture as ordinary run 5, with actual resident finite plans, meals, travel, player walking and the same survival-read driver. No CPU sampler or provider. Record achieved clock, input tails, real activity, saved-account and omitted-account counts, source indexing and actual detailed-model diagnostics. This changes both compromises together and therefore cannot assign a combined timing change to cloth alone or attention alone. Raw output will be `/private/tmp/ol-overhaul-compromise1-20261016/`. The five ordinary observations are complete and unchanged.

## First complete compromise result — failed

**0.43157× over 185.112 seconds with 3× selected.** This observation does not demonstrate a speed gain or justify declaring either compromise adopted for capacity. One resident's initial plan admission was busy; 45 plans were admitted for the other 15 residents and 30 meals matched their produced food. All 17 people remained alive. The ordinary comparison had all 16 residents working and a different host load, so this is not an equal-work causal comparison.

| What was measured                | Ordinary run 5                   | Combined compromise observation                            | Conclusion                                                                                                       |
| -------------------------------- | -------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Game speed                       | 1.346×                           | 0.432×                                                     | Both fail; the observed compromise build is much slower. Do not hide this negative result.                       |
| Walking confirmation, 95% within | 1,636 ms                         | 6,109 ms                                                   | Both fail; latest maximum 9,416 ms.                                                                              |
| Accepted walks                   | 150 of 173                       | 102 of 138; 29 blocked and seven busy                      | Latest input intake fails, with 30 overdue slots skipped and five slots lacking a visible ground choice.         |
| Starts from stationary           | 28; p95 2,974 ms                 | Three; p95/max 5,408 ms                                    | Latest sample is too small for capacity and still visibly slow.                                                  |
| Real resident work               | 128 plans, 112 matched meals     | 45 plans, 30 matched meals; one initial admission overload | Unequal work, not a valid isolated performance comparison.                                                       |
| Saving                           | 317 saves / 83.7 seconds elapsed | 185 saves / 118.9 seconds elapsed                          | Fewer saves take longer in aggregate. SQL awaits and host contention remain material.                            |
| Drawing submissions              | 77.21/s; maximum gap 71.4 ms     | 81.75/s; maximum gap 162.2 ms                              | No smooth-drawing pass. These are rendering submissions, not physical display presentation.                      |
| Computer load                    | About 43 throughout              | About 65→139 on ten logical CPUs                           | External contention prevents assigning the difference solely to the code. It does not turn failure into success. |

The latest whole-server CPU is 53.319 seconds; native advancement occupies 58.452 seconds of overlapping elapsed time. All SQL requests occupy 171.633 seconds of overlapping await time across 4,198 statements. These are not additive CPU shares. Final reported game-time debt is 24,789.351 game seconds. No storage pause or page error; two cancelled activity-read requests are retained. Server exit 1, browser exit 0. The ordinary five observations remain unchanged.

The actual detailed model is visible, unselected, approximately 53 CSS pixels tall, at four passes, with 9,701 cloth steps and finite coordinates at closure. Thus the visual variant really ran. The native detailed-counter option was accidentally omitted from this observation, so the exact omitted-witness count is unavailable. A focused controlled work comparison supplies that missing structural evidence; it cannot retroactively repair this complete observation.

Source `9aeeed143a6828a863045b45a89cd1ec6d730941`, runtime SHA-256 `b872785466b506c2a475489c5ef8e346e61758c5d0b9f231dd300f8138f618c5`, actual workspace bindings verified, production bundle `index-BRd6c500.js`. Raw owned reports `/private/tmp/ol-overhaul-compromise1-20261016/`. Exact owned database `openlegend_fixture_b3002d7600fe44cc987dca7d4ec033c9` is confirmed absent after closure. No provider calls; additional and cumulative Jev/provider cost $0.

## Controlled work comparison and retention decision

A finite native scenario places 17 actual biped workers nearby, provides finite sufficient fibers and performs three real preparation actions per person. The comparison changes only the bystander-notice policy to retain all eligible witnesses in the control. No server, database, browser, provider or speed claim. Both variants produce exactly 385 events, all 51 own preparation results, the same final item quantities and the same elapsed game time.

| Work counted                        | Retain every eligible witness | Busy-witness trial | What it proves                                                                                        |
| ----------------------------------- | ----------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| New personal observations           | 2,012                         | 1,244              | 768 omitted, about 38%; this is real loss of incidental chronology, not an equivalent representation. |
| Complete simulation preparations    | 29                            | 29                 | The rule does not remove this calculation.                                                            |
| Smaller movement calculations       | 167                           | 167                | Physical work stays.                                                                                  |
| Condition rules considered          | 24,424                        | 24,424             | Bodily/status checking stays.                                                                         |
| Observers selected for sight checks | 2,535                         | 2,535              | Current perception stays.                                                                             |
| Animal wander decisions             | 287                           | 287                | Animal behavior stays.                                                                                |

The first controlled fixture mistakenly included non-biped animals among workers and then provided too few fibers for three actions; those setup failures were corrected. A source-text override did not match the temporary loader's transformed text, so the isolated control instead replaces just the already imported policy callback before creating the disposable world. No checked-in runtime was altered for that control. Raw controlled reports: `/private/tmp/ol-attention-work-counts-{retain-all,busy-rule}.json`.

**Decision:** remove the busy-witness attention rule and its otherwise-unused engine hook from the retained build. The trial demonstrably reduces account creation, but has not shown an acceptable complete-game benefit; changing character recollection is too consequential to adopt on that evidence. The implementation remains recoverable in checkpoint `9aeeed143`; no dormant flag, parallel runtime or compatibility path is retained. Existing observation behavior is restored. Optional episode grouping and coarse distant activity remain unimplemented alternatives, not completed mechanisms.

Retain the small-model cloth tier: the actual solver performs four rather than eight passes at small unselected size, and the selected visual, pause, teleport and recovery checks pass. This is a limited cosmetic tradeoff. Its sustained frame benefit and many-model quality are still unqualified. The failed combined observation is never relabeled a pass or erased by this retention decision.

## Final retained-source checks

The restored ordinary event-recording path is byte-for-byte identical to its pre-trial source in the four affected domain files. The actual command scenario now gives both idle and working witnesses five audience members, preserving their routine account again; own actions, speech, current sight and two actual preparation results pass. Cloth boundary assertions continue to pass. TypeScript and the final production build pass; bundle remains `index-BRd6c500.js`. The raw ad-hoc console's `clothBoundaryChecks:16` label is a handwritten fixture label, not a measured assertion count; no claim relies on it. Existing perception cases pass; all nine selected disclosure cases pass across the initial eight passes and the isolated cold-history repeat, preserving the first timeout in this report. Generated configuration passed earlier with unchanged generated inputs.

The final retained cloth-only combination is measured in the separately authorized second compromise observation below; no sixth ordinary observation is added. Required smooth-3×/walking/long-play qualification and normal CI gates remain unmet. All task-owned browser/server/database fixture processes have closed; no ordinary development save was reset and no paid call was made.

## Final retained-build observation selected before launch

The cloth-only retained build will receive a second separate compromise observation with the same 185/180-second fixture and no sampler/provider. This closes the final-combination measurement gap without adding an ordinary observation. All previous failures remain preserved. Source checkpoint `10f0cfe36`; output `/private/tmp/ol-overhaul-compromise2-20261016/`.

## Final retained cloth-only result — failed

**Current measured result: 0.38459× over 185.383 seconds with 3× selected.** The ordinary event-recording behavior is restored and the small-model cloth tier remains. All 16 resident work plans are active; 48 finite plans are admitted and 32 meals match their produced food. All 17 people and 40 animals remain. The earlier missing resident does not explain this failure.

| Requirement or cost    | Actual retained-build observation                                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clock                  | 4,277.801 game seconds; **0.385×**, with 20,203.839 admitted game seconds still owed.                                                                                                                                                                                                                |
| Walking confirmation   | 92 accepted of 133 submitted; median 1,300 ms, 95% within **9,160 ms**, maximum 11,598 ms. Twenty-nine busy refusals, nine blocked and three unconfirmed; 42 overdue input slots skipped.                                                                                                            |
| Visible walking starts | Eleven stationary starts: 95%/maximum 3,626 ms.                                                                                                                                                                                                                                                      |
| Drawing                | 88.53 submissions/second, gap p95 18.75 ms, p99 40 ms, maximum **4,716.9 ms**. Fast average drawing hides a serious freeze. Physical display presentation remains unmeasured.                                                                                                                        |
| Saving                 | 160 saves occupy **130.114 seconds** of overlapping elapsed time, 2,490 attributed statements.                                                                                                                                                                                                       |
| Database work          | 3,939 statements occupy 185.181 seconds of overlapping awaits; longest 2,284 ms. These waits are not additive CPU shares.                                                                                                                                                                            |
| Native calculations    | 642 advancement calls occupy 44.163 seconds elapsed; whole process CPU 38.840 seconds.                                                                                                                                                                                                               |
| Resident activity      | 48 admitted plans, 32 matched meals; all people alive, no sleep/wake cycle completed.                                                                                                                                                                                                                |
| Errors                 | Server/browser exit 0 and server failure count 0; no storage pause/page error. The browser still records 29 HTTP busy refusals, three unconfirmed walks, and failed presence/state reads with connection refused. The two failed-read records lack timestamps, so closure attribution is not proved. |
| Computer               | Load about 97→135 on ten logical CPUs. A bounded process inventory found no leftover check/profiling scripts tied to this checkout beyond the active campaign. External applications were left untouched.                                                                                            |

The actual detailed model closes visible and unselected at about 53 CSS pixels, four passes, 10,393 cloth steps and finite coordinates. This proves the retained cosmetic tier executed; it does not establish that it improved complete-game timing. Startup/shutdown source bindings agree; source checkpoint `10f0cfe36010f6a0103b14e0f8fcbb673b81b37b`, runtime SHA-256 `1d4541a70273149517ac5f38f91bcf1c26fa8e1fe58e6cfda3262fcd6e37d543`, bundle `index-BRd6c500.js`. Native detailed counters and CPU sampling are disabled. Raw owned reports `/private/tmp/ol-overhaul-compromise2-20261016/`. Exact owned database `openlegend_fixture_36f52dcdf9684039afafc9c3acb2e621` is confirmed absent afterward. No normal save reset. Additional and cumulative provider/Jev cost $0.

The earlier 1.346× ordinary result is preserved, not presented as current capacity. Different computer load and activity prevent a clean causal percentage attribution. **The final retained build still fails world progression, prompt walking and freeze-free drawing.** Five ordinary plus two separately authorized compromise observations are now complete. There is no smooth-3× or merge-readiness claim.

## October 17 — Original optional gathering-episode trial

To do, before code: implement the [original source-preserving PF17.5 experiment](../../projects/performance-overhaul/storage.md#pf175--world-authored-episodes-for-routine-observation). This differs from the removed busy-witness rule above: every exact permitted account remains recorded, required evidence and history retain it, and only optional recall/search may prefer an observer-owned grouping of that activity's two witnessed endpoints. Measure actual canonical/source/link/index writes and optional candidates through gathering and repository commits. Remove the runtime if its upkeep is a net loss; preserve the evidence and distinguish a rejected representation from an exhausted idea. No provider/full-game campaign is authorized for this slice; additional and cumulative provider/Jev cost remains $0.

| Existing gathering source fact                                                                                                   | Required trial handling                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start: `action-started`, with actual actor/target and `actionType` in the raw event; bystander data currently strips that field. | Explicit world disclosure admits the selected visible activity metadata. Exact action identity must come from the producing action, never inferred from prose. |
| Result: `gathered`, with actual actor/target, definition and quantity; two actual event occurrences per ordinary gather.         | Link only to the exact observed start of that same action. Preserve quantity, time and observer wording.                                                       |
| Personal account: source/target IDs, recognized flag, references and source/target perception-episode IDs.                       | Match exposure/recognition/detail continuity. A missing start, hidden target or gap does not gain earlier facts.                                               |

| Situation                                                                                   | Optional recall after trial                                                | Exact history and required evidence                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| A bystander sees the same ordinary gather start and finish, with no protected interruption. | One source-linked summary containing the two actual permitted statements.  | Both original accounts remain independently available.       |
| A bystander arrives after gathering has begun.                                              | The independently witnessed result; no invented start or continuous watch. | Only the actual later account exists for that observer.      |
| The target is hidden at the start and visible at the finish.                                | Separate limited activity account and later detailed result.               | Earlier material/quantity/target detail remains undisclosed. |

| Consumer                                                                                                  | Exact occurrence or grouped view?                                                                               |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Physical outcomes, immediate reactions/appraisal, commitments, trigger evidence and historical inspection | Existing exact occurrence/account.                                                                              |
| Required memory retrieval, correction/forgetting and source revision checks                               | Existing exact source identities; derived grouping is invalidated when its source wording/reachability changes. |
| Ordinary optional context/search selection                                                                | Grouping when the selected world and exact coverage permit it; raw account otherwise.                           |
| Search-source, lexical/vector upkeep and save/reopen                                                      | Measure the additional summary/link work explicitly; no claim of fewer raw events or accounts.                  |

October17, 12:54 EDT selection: first run a best-case lower-bound implementation of that representation through real gathering, the existing summary mutation owner, actual PostgreSQL source/link/index preparation and existing optional selection's covered-source exclusion. This isolates the unavoidable extra write cost before adding permanent event metadata, an automatic policy or another shared lookup. Both exact accounts remain. The private trial has exact action/endpoints supplied by its own admitted command, so it does not claim to have solved automatic privacy/continuity qualification. If even this best case loses, retain the rejection rather than install a more expensive automatic producer; if it wins, finish the complete producer/consumer contract. Record this narrower trial honestly, not as a finished adopted grouping policy.

### Result: grouping preserved sources but added saving work

The real six-gather sequence retains104 exact observations and6 personal memories in both modes. The trial adds6 ordinary summaries linking12 of those observations. Optional recall for the witness ends with13 choices instead of19; each pair becomes one grouped choice. Both original statements remain in the grouping and the exact canonical accounts survive reconstruction unchanged. This prototype deliberately gives grouping its best case: the finite caller already knows the exact admitted action and witnessed endpoints, so no automatic detection/policy cost is included.

| Complete six-gather/optional-read sequence      | Existing exact sources | Source-preserving grouping trial |
| ----------------------------------------------- | ---------------------: | -------------------------------: |
| Saving SQL calls                                |                     93 |                              105 |
| Optional selection/hydration SQL calls          |                     36 |                               48 |
| Search-source records / pending lexical records |                    110 |                              116 |
| Summary links                                   |                      0 |                               12 |
| Optional choices after sixth gather             |                     19 |                               13 |
| First order-balanced observation: elapsed / CPU |         2293ms /2646ms |                   1897ms /2263ms |
| Reversed order observation: elapsed / CPU       |         1925ms /1956ms |                   2230ms /1784ms |

Separate fresh disposable databases run the order existing→grouped→grouped→existing; all setup is excluded, while native gathering, saving and optional reading are included. Process CPU can exceed elapsed time because runtime workers contribute. Timings are mixed and do not establish a reliable net speedup. The extra12 saving calls,12 read calls and6 searchable sources are repeatable structural costs. Optional text workers are stopped equally; pending lexical record counts measure owed indexing work, not completed indexing throughput. No semantic model or paid relevance selection is measured.

**Decision:** do not retain this grouping policy as a default performance change for the currently measured zero-provider workload. That workload does not perform optional model-context selection, so the trial's only potential saving is absent while its additional source/link/index work remains. This is a real rejected representation trial, not proof that all grouping/compression strategies are useless. A future paid-context workload or a world policy that reduces captured routine detail has a different tradeoff. The automatic event-metadata/continuity producer is not installed; an earlier unqualified lookup/field preparation was removed rather than left as half a feature. Required history stays unchanged, and no gameplay/evidence compromise is adopted.

Private reproduction/report: `/private/tmp/openlegend-routine-representation-proof.mts` and `openlegend-routine-representation-proof.json`. Exact source reconstruction and both endpoint observations pass. Early fixtures stopped before the selected420-second wood gather could finish; the corrected fixture uses the existing raw-fiber source and resolves ordinary navigation. Those setup attempts are not capacity failures. No ordinary complete campaign, real save reset or provider call occurred. Additional/cumulative provider/Jev cost$0.

## Third combined compromise observation — selected October17, 2026, 13:14 EDT

Run185seconds of server activity with180seconds of real browser walking and survival input, using the same existing expanded travel/work/food/rest fixture, no CPU/allocation sampler, no detailed native counters, no trace and no providers. This is the separately authorized compromise qualification for the newly implemented remote-crafting/offscreen visual policies alongside the retained exact improvements. It is not a sixth ordinary observation, an isolated causal comparison, or permission to ignore the five-run limit. Keep actual eligibility visible: the fixture may offer no isolated crafting and only one detailed model, so it cannot prove their individual benefit. Capture source/workspace bindings and compare start/end provenance; do not edit runtime or run independent heavy checks during measurement. Use fresh private output `/private/tmp/ol-overhaul-compromise3-20261017/`; preserve setup failures and every negative result. The current complete measured result remains0.385× until this observation completes.

## Third combined compromise result — still fails3×

**2.047210711× over185.015seconds, with3× selected.** Walking confirmations are within751.4ms for95% of170 accepted moves; six observed idle-to-moving starts are within532ms. Drawing submits106.8frames/second on average, with16.75ms/28ms/180.9ms p95/p99/maximum gaps. These are engine submissions, not physical display presentation. The game still misses the clock/input/freeze acceptance targets.

| Actual complete observations             | Earlier retained cloth-only build | October17 integrated build |
| ---------------------------------------- | --------------------------------: | -------------------------: |
| Achieved game speed                      |                            0.385× |                     2.047× |
| Accepted walking confirmation p95        |                           9,160ms |                      751ms |
| Longest rendered-submission gap          |                           4,700ms |                      181ms |
| Completed meals matched to produced food |     Earlier result retained above |                    185/185 |
| Resident plans admitted / refusals       |     Earlier result retained above |                     201 /0 |
| Whole-process server CPU                 |                       38.8seconds |              133.97seconds |
| Native advancement elapsed spans         |                       44.2seconds |              104.01seconds |
| Saving elapsed spans                     |          130.1seconds /160commits |   59.87seconds /380commits |

This is a current-build result, not a clean causal speedup percentage: work completed, source and host contention differ. All17people and40animals remain in the fixture; all16residents participate and survive. The fixture contains133other physical roots initially. No resident refusal, stopped plan, runtime failure or storage error occurs. No sleep/wake cycle completes, and no crafting action starts, so this full observation does not qualify the remote-craft executor. The one retained detailed mercenary is finite, at four passes and391cloth steps at closure, and is then outside current observation; this cannot assign the total improvement to offscreen suspension.

Progress deteriorates: the first minute achieves2.503×, the second minute alone1.964× and the third1.718×. Resident entities grow355→417→475 across those minute samples; native receipts432→739→998. Natural heap grows184.5→465.9MB without a forced collection; that is not proof of a leak. Final unprocessed game time is still growing. The host has ten logical CPUs, with load186.4→139.9, so external contention remains a major interpretation limit.

There are4,187native calls occupying104.01seconds and380world commits occupying59.87seconds of overlapping elapsed spans. SQL has12,613statements and117.93seconds of overlapping await; these values cannot be added or called exclusive CPU. Canonical preparation itself is2.20seconds; public information preparation7.49seconds. Only46commits take the new journal append path (2.83seconds); other families retain synchronous tables. A notable added journal barrier checks committed/applied equality1,026times, totaling9.05seconds of await. The next selected experiment targets safe writer-side fence reuse and saving shared native calculations without undoing their arithmetic/forecast reuse; [its complete contract](../../projects/performance-overhaul/saved-native-calculations.md) precedes code.

Server and browser exit0. There is no page/click error or unconfirmed movement; two ordinary cancelled action/activity reads are retained. Runtime source is551files, SHA-256`6332c9be04175f37cd9bc73d48fd674541305b4a8cb7340b01b4839a14d87c0a`, commit`66ce31e70be578028b14a767fba387b5b26c4fd6`; all12workspace bindings and start/ready/after hashes match. The exact owned database`openlegend_fixture_979544ab476f451abc210b9ee661d61a`, its sessions and temporary directory are confirmed absent afterward. Raw reports/cleanup/source-after record remain under`/private/tmp/ol-overhaul-compromise3-20261017/`. Five ordinary plus three separately authorized compromise observations are complete. Additional/cumulative provider/Jev cost$0. No3× or merge-readiness claim.

## Fourth compromise — authored work pacing, finite qualification

**October 17, 2026, 13:52 EDT.** This trial makes the same gathering and preparation actions take twice as long as the preceding authored rules. It is a gameplay pacing compromise: uninterrupted production per game hour halves, while food and energy spent per output double. Yields, ingredients, movement, collision, observation, actual spending and the world clock keep their existing rules. This is the twentyfold pacing trial relative to the former original defaults, replacing the preceding tenfold trial for this experiment. The [selection before editing](../../projects/performance-overhaul/execution.md#fourth-compromise-selected-before-editing--october-17-2026-1346-edt) records the intended tradeoff and separate full-observation boundary.

| Work                                             | Previous authored duration |   Trial duration | Finite result                                                                                                                                 |
| ------------------------------------------------ | -------------------------: | ---------------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Gather fibers                                    |           360 game seconds | 720 game seconds | Actual admitted work completes after 720 seconds and yields 2 units; no output exists just before completion.                                 |
| Gather wood                                      |                        420 |              840 | Fresh ordinary/custom openings and the spawn factory select 840; individual wood work is not separately replayed here.                        |
| Gather stone                                     |                        240 |              480 | Fresh ordinary/custom openings and the spawn factory select 480; individual stone work is not separately replayed here.                       |
| Gather berries                                   |                        300 |              600 | Actual ordinary approach and work produce 2 berries; eating consumes 1 of those berries and restores 18 food points.                          |
| Clean fibers                                     |                        480 |              960 | Actual work consumes 2 raw fibers at start and produces 2 prepared fibers at completion.                                                      |
| Native and invented cord                         |                        600 |            1,200 | Each actual route consumes 2 prepared fibers at start and produces 1 cord at completion; both displayed and executed work times agree.        |
| Five-step work/berry/eating cycle, before travel |                      1,740 |            3,480 | 58 game minutes, or 19.33 real seconds at the requested 3×. This finite specimen takes 3,510.486 game seconds with its actual berry approach. |

A single evolving native scenario checks the complete path rather than only inspecting constants. It creates a current solitary opening with finite declared starting stock, places the person in reach of the first fiber patch as fixture setup, and admits the ordinary gathering, cleaning, twisting, berry gathering/eating and invented-cord commands. The later berry approach uses the ordinary navigation backend; it is not teleported. No provider chooses these diagnostic actions.

- All 19 matching resource patches in the fresh integrated ordinary opening use the trial times, including 12 outer-wilderness patches. Each newly constructed solitary and inhabited custom opening has 4 matching resource patches with those same times. The 6 authored spawn-factory variants for fibers/reeds/branches/stones/berries also return the correct times. This verifies the factories' authored values, not 6 separate UI spawn interactions.
- The actual plan-choice descriptions show 720 seconds for gathering fibers,960 for cleaning and 1,200 for native cord. The invented-cord plan choice and player-facing activity facts both show 1,200. These are current preparation/choice calls with a minimal service view; no HTTP server or browser is started.
- Three halfway cancellations cover cleaning, native cord and invented cord. Already-spent ingredients remain spent, and no output appears after cancellation or subsequent advancement. There is no refund, duplicated charge or speculative completed object.
- Five same-version JSON reconstruction cuts cover gathering just before completion, cleaning halfway, native cord halfway, invented cord halfway and the completed invented cord. Current-format validation accepts each cut; subsequent complete serialized current worlds match uninterrupted continuation. Further advancement does not repeat the completed output. This is native serialization/continuation evidence, not an independent PostgreSQL checkpoint/recovery check.
- The invented-cord compiler, its derived work fact, its selected exact family identity and native cord preparation all use 1,200 seconds. A reference family identity built from the preceding 600-second meaning is refused through the existing exact-dependency validator. No old-family adapter, old-save conversion or database replacement is introduced.
- A currently installed patch with an explicitly authored 360-second cost still offers and admits 360 seconds. Changing default sources does not rewrite installed patch durations or make the default a universal engine law.

The production-rate consequence is intentional and must remain visible in any later capacity report. The existing diagnostic driver forces a berry serving at the end of every production cycle even when the person is already full. Food consumption is 10.44 points per trial cycle before travel, against 18 points restored by that serving; changing nutrition alone would not remove those forced completions. This pacing trial changes the amount of work completed per game hour, not the richness or exact ownership of an individual completed action. It may reduce repeated completions, plan admissions and saved evidence, but **no measured performance improvement follows from these finite correctness checks**.

The unchanged ordinary acceptance workload remains the historical baseline. A later combined observation must identify these changed durations, actual completed actions/output/meals and all other retained changes. It cannot be called an isolated pacing speedup or a pass of unchanged-workload acceptance. The 185-second fixture at perfect 3× still covers only 9 h 15 m, short of the ordinary work-to-rest threshold from default energy, so it cannot establish a complete sleep/wake day.

Private artifacts: `/private/tmp/openlegend-pacing-proof.mts`, `/private/tmp/openlegend-pacing-proof.json`, `/private/tmp/openlegend-pacing-proof-output.txt` and `/private/tmp/openlegend-pacing-proof-errors.txt`. The final scenario exits 0 with an empty error file. Resource-source SHA-256 is`56d7d451345ffeffedb9352074b4719dfc93ce1e25e5f3ca5f34e185ff6bd15c`; item-rule SHA-256 is`0fea24a3777434235245e21ec552fc3c667470875c3edd362b6c9f4302cc0d7f`. Concurrent unrelated engine integration means this is finite trial-source qualification, not a frozen full-runtime timing comparison. Root's combined static/selected existing checks and the separately authorized fourth compromise observation remain separate. No normal save was reset and no paid call ran: additional/cumulative provider cost$0.

### Fourth observation: setup-only failure and correction — October17,2026,14:39EDT

The first attempt at source `3bb22276d304335c216287c0d071c0de2e293da9` stops before browser readiness and before performance measurement. Its discarded rehearsal required each of16 residents to finish the first work/meal cycle and return to fibers, but allowed only2,400game seconds. The new authored work alone requires3,480. This is a stale profiler setup allowance, not measured game speed or a gameplay failure. The failed report/log remain in `/private/tmp/ol-overhaul-compromise4-20261017/`; explicit cleanup confirms zero matching databases/sessions and absence of its owned temporary directory.

The stock planner now also reports the largest actual resident cycle, and rehearsal uses that value plus the previous660-game-second travel margin. The2,000-call/30-real-second ceilings, real route/sight/reach checks, produced-food meal check and requirement that every resident returns remain. Errors report actual calls, game time/allowance and elapsed time. No measured workload or game law changes. TypeScript passes; the retry must still pass this actual rehearsal before measurement. Its reports use the new private `retry/` subdirectory.

## Fourth combined compromise result — near 3× average, uneven play

**The game averages 2.983825× over 450.132 seconds, but it does not yet run smoothly at 3× throughout.** It falls to 2.340× during the third minute. A later minute reaches 3.905× while residents are sleeping, helping the game catch up. Walking confirmation improves, but visible walking starts still take up to 2.40 seconds and the longest drawing gap is 208 ms.

The world contains 17 people and 40 animals, plus 100 added objects and three added buildings. All 16 residents work, travel, eat food they produced, sleep and wake once. This is the first complete observation here to include their full sleep/wake cycle. The player also sleeps and remains asleep at the end; the final report's zero visible people/animals/objects reflects that sleeping view, not a death or vanished population. All 17 people remain alive, with no resident refusal, stopped routine or recorded activity error.

| What the player or test experienced           | Previous combined observation |                 Fourth combined observation |
| --------------------------------------------- | ----------------------------: | ------------------------------------------: |
| Server observation / browser input            |                  185 s /180 s |                                450 s /445 s |
| Average game speed, with 3× selected          |                        2.047× |                                      2.984× |
| Slowest complete minute                       |                        1.718× |                                      2.340× |
| Walking requests accepted                     |                           170 |                   382 of 390; eight blocked |
| Walking confirmation, 95% within              |                        751 ms |                    549 ms; maximum 2,261 ms |
| Starts from stationary, 95% within            |      532 ms across six starts | 1,314 ms across 37 starts; maximum 2,398 ms |
| Drawing submissions per second                |                         106.8 |                                      106.25 |
| Longest drawing-submission gap                |                        181 ms |                                      208 ms |
| Resident routines accepted                    |                           201 |  282:266 work routines and 16 rest routines |
| Meals matched to the resident's produced food |                           185 |                          250 of 250 checked |
| Residents who sleep and wake                  |                             0 |                                    16 of 16 |

These columns describe different builds, durations, computer loads and work pacing. They do not establish an isolated speedup percentage. Everyday gathering/fiber/cord work takes twice as long as in the previous observation, with the same ingredients and output. One complete work/meal cycle now requires 58 game minutes before travel instead of 29. Production per game hour halves and uninterrupted food/energy use per output doubles. The trial changes how often completions and their saved records occur; it does not prove that the original faster production workload can keep up.

### Where the average hides slowdown

Speeds below are calculated from consecutive recorded game-time/real-time samples. Waiting game time means simulation work already owed but not yet processed. Sleeping counts describe the residents at the end of each interval, not every moment within it.

| Approximate real-time interval | Achieved speed | Residents asleep at interval end | Waiting game time at interval end |
| ------------------------------ | -------------: | -------------------------------: | --------------------------------: |
| 0–60 s                         |         2.988× |                                0 |                              26 s |
| 60–120 s                       |         2.941× |                                0 |                             259 s |
| 120–180 s                      |         2.340× |                                0 |                           2,643 s |
| 180–240 s                      |         2.828× |                                0 |                           3,246 s |
| 240–300 s                      |         3.905× |                               16 |                               0 s |
| 300–361 s                      |         2.996× |                               15 |                              11 s |
| 361–421 s                      |         2.826× |                                0 |                             643 s |
| 421–450 s                      |         3.117× |                                0 |                             406 s |

The busy period accumulates about 54 game minutes of waiting work before the sleep period clears it. All residents are awake again by the seven-minute sample, when the game falls below 3× again. The final near-target average therefore does not establish the requested absence of slowdown. It spans 22 hours 23 minutes 7 seconds of game time, short of a complete 24-hour day.

### Input, drawing and activity coverage

The browser submits 405 intentions: 390 walks, 14 meals and one sleep action. It receives 397 acceptances, with all eight refusals explained by blocked walks and no unconfirmed requests. None of the scheduled input slots is skipped for being overdue, and every offered walk has a visible ground choice. Recovery and sleeping deliberately defer normal inputs; the run contains 442 scheduled input slots and 390 walks rather than 445 walks. All 15 recovery intentions are accepted. No page error, failed request, console error, lost motion observation or truncated drawing measurement is recorded.

Foreground drawing submits 47,283 frames over the 445-second browser interval. Gaps are within 16.25 ms for 95% and 30.25 ms for 99%, with a 207.6 ms maximum. These are engine rendering submissions, not physical display presentation. The single detailed model uses four cloth-solving passes when eligible and has finite cloth coordinates; this observation still does not qualify a large detailed-model crowd. No crafting action starts, so it does not establish a benefit from the remote-crafting executor.

The residents complete 250 work cycles, 506 gathering results and 511 preparation results; 282 accepted routines include 266 work routines and 16 rest routines. The test continues to require a meal at the end of each work cycle; those meals are not evidence of natural hunger-driven decisions. All residents' rest starts/wakes are recorded once. There are no paid character decisions or narration calls.

### Remaining cost and evidence limits

The server records 11,410 simulation advances occupying 244.54 seconds, 715 saves occupying 104.25 seconds, and 19,221 database statements occupying 188.47 seconds of await. Preparing public views occupies 25.94 seconds. These spans overlap and include waiting; they are not additive CPU shares. Whole-server process CPU is 303.79 seconds. There is no CPU sampling during this complete observation, so it cannot precisely rank functions within simulation.

Only 152 of 715 saves use the durable-change-first path, totaling 7.60 seconds before later table application. Live physical records grow 280→541 and item lots 90→351; retained game-command results grow 62→1,360. These are scaling pressure, not proof of a memory leak or a single cause. Without forced collection, the separate heap report grows 207.5→378.8 MB. Computer load rises 48.5→107.1 on ten logical CPUs, limiting causal timing comparisons.

Source is `f2afb961a0a47c1f82e752653cd50508e572be1f`, runtime SHA-256 `00dbf33abded8660b161f0073febe2d21988d488c489efc4ec04513514a7ac4e`, 551 runtime files and 12 verified workspace bindings. The postmeasurement source/binding check matches startup and readiness. The browser loads `index-Csw0xxdi.js`. Server and browser exit 0. The original premeasurement rehearsal failure remains above and is not a performance sample.

Raw reports are `/private/tmp/ol-overhaul-compromise4-20261017/retry/server.json`, `browser.json` and `ready.json`; postmeasurement `source-after.json` and `cleanup.json` preserve provenance/cleanup. The owned database has zero remaining databases/sessions and its exact temporary directory is absent. The private checkpoint passes checksum/row-count integrity checks: 95,058 rows at revision 722, about 80 MB. Its pause/capture advances another 50.909 game seconds after the performance cutoff, which are excluded from every result above. Export integrity is not a claim that the complete service restore path was exercised. Additional/cumulative provider/Jev cost remains $0.

## Fifth compromise candidate: fewer movement samples — finite evidence

Selected October 17, 2026, 15:12 EDT; the subsequent complete observation is recorded below. A moving body previously allowed at most one metre of travel between ordinary perception samples. The candidate allows four metres, while keeping the existing tighter bound for a nearby smaller sense. This reduces repeated calculations; it deliberately makes some noticing and reconsideration less precise. It does not slow walking, change the world clock or reduce wall/support geometry precision.

The existing finite caller reconstructs the preserved fourth-observation checkpoint, validates its complete records and then invokes the service's four actual history-release owners. Timing begins with 541 resident entities, 190 physical roots, 57 living actors, 16 residents working and one bird using the clearing flight route. No animal is frightened. This is a cold reconstruction of the resident scene, not the running service's private warm caches. It advances exactly 600 game seconds with the real eight-millisecond cooperative budget, one shared interval per call and the service's public navigation checks. No sampler, storage, renderer or paid AI runs inside this measurement.

| First diagnostic                         | 1 m control | 2 m candidate | 4 m candidate |
| ---------------------------------------- | ----------: | ------------: | ------------: |
| Complete elapsed time                    | 1,458.20 ms |   1,212.17 ms |   1,130.99 ms |
| Process CPU                              | 2,396.92 ms |   2,101.40 ms |   1,980.48 ms |
| Movement slices                          |          98 |            72 |            69 |
| Published world snapshots                |          79 |            61 |            57 |
| Shared upcoming-calculation preparations |          39 |            34 |            30 |
| Exact sight tests                        |       9,081 |         7,172 |         6,601 |

The subsequent matched control/candidate/candidate/control comparison keeps all source owners pinned and starts a fresh process for every observation:

| Order       | Allowed travel |                         Elapsed |                     Process CPU | Movement slices | Published snapshots |
| ----------- | -------------: | ------------------------------: | ------------------------------: | --------------: | ------------------: |
| Control 1   |            1 m |                     1,406.91 ms |                     2,351.63 ms |              98 |                  78 |
| Candidate 1 |            4 m |                     1,125.69 ms |                     1,950.51 ms |              69 |                  57 |
| Candidate 2 |            4 m |                     1,163.34 ms |                     1,995.37 ms |              69 |                  57 |
| Control 2   |            1 m |                     1,402.33 ms |                     2,361.84 ms |              98 |                  78 |
| Mean        |      1 m → 4 m | 1,404.62 → 1,144.51 ms (−18.5%) | 2,356.73 → 1,972.94 ms (−16.3%) |         98 → 69 |             78 → 57 |

All cases complete the same game duration. They produce 32 new events and 278 new private awareness entries, but their contents/times are **not identical**. In the final matched comparison, Tavin records losing sight of a person about 1.26 game seconds later. The full comparison has 812 differing fields, including sight/event timing, movement/meter/work revisions, sequence numbers and last-bit values. Both final worlds contain the same 549 identities and item quantities and the same saved randomness. The bird ends at the same position; two residents differ only in last-bit coordinates. These facts do not establish universal equivalence or physical correctness in a moving crowd. Even the two time-budgeted controls have different exact final hashes, which is another reason to keep fixed-schedule correctness separate from actual-budget timing.

The four-metre value is selected in the bundled world's existing policy, with no engine-wide performance mode or second scheduler. Static swept geometry, each route/support transition, action admission and separate work/arrival deadlines still use their current owners. Ordinary escape steering retains its independent one-metre review, and wandering retains its 0.4-metre impulse. Sight/contact sample timing, following/approaching reconsideration and refused landing retries can change. The complete fleeting-encounter protection covers only the predictable path families the crossing solver supports; it does not make every follow, approach or fall exact. Ordinary walking also does not implement the evasion path's universal occupied-body sweep, so this experiment cannot claim to preserve an actor-collision guarantee that the original walker never provided.

Raw private evidence: `/private/tmp/ol-motion-fidelity-c4-initial-{1,2,4}.summary.json`, `/private/tmp/ol-motion-fidelity-c4-abba-{a1,b1,b2,a2}.{summary,final}.json`, and `/private/tmp/ol-motion-fidelity-c4-endpoint-differences.json`. The private evolving caller is `/private/tmp/openlegend-resident-motion-compromise.mts`; it changes only the authored policy in each fresh process before setup and records the actual selected value and unchanged source hashes. Original source is `f2afb961a` runtime files; the private policy override is explicitly different behavior, not a hash claim of an unmodified run. The later production candidate checkpoint is `e45ddb40b`. No development save/database is replaced; no full-game speed result follows yet. Additional/cumulative provider cost remains $0.

## Fifth combined compromise result — less native work, delays remain

**The game averages 2.981720× over 450.830 seconds, but smooth 3× remains unmet.** The average is essentially unchanged from the fourth observation. One busy minute reaches only 2.654×; another period catches up at 3.368× as residents begin sleeping. Walking confirmation and visible-start delays are worse in this sample, and a drawing submission pauses for 477.6 ms. Less simulation work does not establish a better complete player experience.

The measured build is `89df6b9c6c4c10970683216ae6381654a12593d2`. It uses the same slower production pacing as the fourth observation and changes ordinary movement sampling from one to four metres. The scene still contains 17 people, 40 animals, 100 added objects and three added buildings. All 16 residents work, travel, eat their output, sleep and wake once; all 17 people survive. The player is asleep at closure, explaining the final empty visible-population report. A later change to how movement predictions survive publication is outside this measured build and has no complete-game speed result here.

| What the player or test experienced        |              Fourth observation, 1 m |               Fifth observation, 4 m |
| ------------------------------------------ | -----------------------------------: | -----------------------------------: |
| Server observation / browser input         |                 450.132 s /445.002 s |                 450.830 s /445.012 s |
| Average game speed, with 3× selected       |                               2.984× |                               2.982× |
| Slowest complete minute                    |                               2.340× |                               2.654× |
| Walking requests accepted                  |                382 of 390; 8 blocked |               380 of 392; 12 blocked |
| Walking confirmation, 95% within           |             549 ms; maximum 2,261 ms |             960 ms; maximum 2,282 ms |
| Visible starts from stationary, 95% within | 1,314 ms across 37; maximum 2,398 ms | 1,747 ms across 40; maximum 2,578 ms |
| Drawing submissions per second             |                               106.25 |                               108.17 |
| Drawing-submission gaps, 95% /99% within   |                      16.25 /30.25 ms |                      16.50 /28.25 ms |
| Longest drawing-submission gap             |                             207.6 ms |                             477.6 ms |
| Whole-server process CPU                   |                             303.79 s |                             281.15 s |
| Simulation advances /overlapping elapsed   |                     11,410 /244.54 s |                      9,920 /217.17 s |
| Saves /overlapping elapsed                 |                        715 /104.25 s |                        721 /117.75 s |
| Database statements /overlapping await     |                     19,221 /188.47 s |                     19,436 /203.97 s |
| Resident routines admitted                 |              282: 266 work + 16 rest |              276: 260 work + 16 rest |
| Meals matched to produced food             |                   250 of 250 checked |                   244 of 244 checked |
| Residents sleeping and waking              |                             16 of 16 |                             16 of 16 |

These are two complete observations, not an isolated repeated experiment with identical actions and host conditions. They differ in noticing times, accepted walking/activity counts, publication choices and computer load. Total process CPU is lower in the fifth sample, while database awaits, save time and walking tails are worse. These totals overlap and include waiting; do not add them or turn them into separate CPU shares. The earlier finite paired experiment supports a native-work reduction for four-metre sampling, but this complete run does not prove a causal whole-game speedup.

### Busy and sleeping periods

The interval speeds use consecutive recorded samples, with actual timestamps. Sleeping counts are the residents asleep at each interval's end; they do not describe every moment of that interval.

| Approximate real-time interval | Achieved speed | Residents asleep at end | Waiting game time at end |
| ------------------------------ | -------------: | ----------------------: | -----------------------: |
| 0–60 s                         |         2.999× |                       0 |                     34 s |
| 60–120 s                       |         2.987× |                       0 |                     81 s |
| 120–180 s                      |         2.654× |                       0 |                  1,312 s |
| 180–240 s                      |         3.368× |                       5 |                      7 s |
| 240–300 s                      |         3.002× |                      16 |                      0 s |
| 300–360 s                      |         3.000× |                      11 |                      0 s |
| 360–421 s                      |         2.888× |                       0 |                    398 s |
| 421–451 s                      |         2.933× |                       0 |                    525 s |

About 22 game minutes of waiting work accumulate by the third-minute sample. The game catches up, then falls behind again after everyone wakes. It ends with 525 game seconds still owed. The observation covers 22 hours 24 minutes 15 seconds of game time, short of a full 24-hour day. The near-target average still hides slowdown.

### Input, drawing and real activity

The browser submits 407 intentions: 392 walks, 14 meals and one sleep action. It receives 395 acceptances; all 12 refusals are blocked walks. All 15 recovery intentions are accepted. There are 442 scheduled input slots and no overdue skipped slot or unconfirmed intention. All 394 ground probes find visible ground; two extra probes do not become submitted walks. These figures do not establish the requested long-play walking count, natural hunger-driven choices or funded AI behavior.

The 40 starts measured from a stationary character take up to 2,577.7 ms to appear; 95% appear within 1,747.4 ms. The 380 accepted walking confirmations have a 960 ms 95th percentile and 2,281.5 ms maximum. Drawing submits 48,139 frames during 445.012 seconds. Its 99th-percentile gap improves to 28.25 ms, but its 477.6 ms maximum is worse than before. The separate animation-callback clock records 576.1 ms; that is not the postrender submission maximum or physical display presentation. Three browser long tasks are recorded, the longest 491 ms. One detailed character model remains present; no larger-model crowd is qualified.

The residents complete 244 produced-food meals, 500 gathering results and 510 preparation results. The driver still requests a meal after each work cycle, including when a character is already full. No crafting action starts, so this does not measure the remote-crafting optimization. Every resident sleeps and wakes exactly once, with no resident refusal, stopped routine or activity error. The server records no runtime/storage failure. The browser records no page exception, but retains two aborted `/api/actions` requests and console messages for HTTP 400 and 403; their cause is not established. All submitted timed intentions themselves report zero HTTP failures. These diagnostics are preserved rather than reported as an error-free browser run.

### Tradeoffs, source and preservation

The production compromise remains: a work/meal cycle takes 58 game minutes before travel, twice the previous 29-minute pacing and 20 times the original authored work durations. Ingredients and output are unchanged; output per game hour halves relative to the third observation, and uninterrupted food/energy use per output doubles. Four-metre movement sampling further trades some noticing/reconsideration precision for fewer calculations. The finite example above records a sight-loss notice about 1.26 game seconds later. Separate escape steering, wandering and exact geometry owners retain their own rules. Neither the original faster-work workload nor exact observation timing is qualified by this result.

Live physical records grow 280→540, item lots 90→350, retained command results 62→1,348 and admitted action records 0→1,681. Unforced heap samples vary; the separate start/end heap report is 189.0→216.6 MB, while a minute sample reaches 471.2 MB. This is not a memory-leak or memory-improvement proof. Reported host load is 66.5→72.0 on ten logical CPUs, versus 48.5→107.1 in the fourth observation. No detailed CPU sampling runs during either full observation.

Runtime SHA-256 is `63d47105191580cab7bffc398792525dea9cde1cca2fc47cd133d3705ccb2a93` across 551 runtime files. All 12 actual workspace bindings and the postmeasurement source check match startup/readiness. The browser loads `index-Csw0xxdi.js`; server and browser exit 0. The two exact arithmetic trials and the navigation trial are removed from this measured source. A separate exact save/load continuation gap is under investigation; the later movement-prediction change is not qualified by this run.

Raw reports are `/private/tmp/ol-overhaul-compromise5-20261017/retry/server.json`, `browser.json`, `ready.json`, `source-after.json` and `cleanup.json`. Cleanup verifies both owned attempt databases have zero remaining databases/sessions and their temporary directories are absent. The preserved checkpoint is `67e1863c-68ff-43dc-9758-33705c033e81`, revision 728, 89,340 rows and 74,610,601 bytes. Its checksum/row-count export checks pass; a complete service restore is not claimed. Pause/preservation advances another 201.364 game seconds after the performance cutoff, excluded from all results above. No development save/database is replaced. Additional/cumulative provider/Jev cost remains $0.

## Sixth combined compromise result — near-target average, failures remain

**The game averages 2.995013× over 450.143 seconds, but this is not a smooth-3× pass.** The first minute reaches only 2.039× and accumulates almost 55 game minutes of waiting simulation. Another minute reaches 2.429×; catch-up periods hide these slowdowns in the average. One accepted walk takes 10.201 seconds to confirm, four walking requests receive busy refusals, and one resident routine admission also fails busy. Orin is dead at the end. Subsequent validated checkpoint history confirms hunger damage and death while he still carried food. The driver can strand an idle resident after a thrown busy error; the exact failed request ID is unavailable, so its connection to this sequence is not presented as precisely attributed.

The measured source is `e86a01771975cbf1acfc97818ad44aaa2b0b65e9`. It combines the repaired lifetime of movement predictions and adaptive calculation batches with the same four-metre movement samples and twentyfold work durations. The scene starts with 17 people, 40 animals, 100 added objects and three added buildings. Fifteen of the 16 residents survive and sleep/wake once; Orin never starts rest. The player survives and remains asleep at closure, explaining the final empty visible-population report. Lost resident activity makes this an unequal workload as well as a failed activity outcome.

| What the player or test experienced        |                    Fifth observation |                    Sixth observation |
| ------------------------------------------ | -----------------------------------: | -----------------------------------: |
| Server observation / browser input         |                450.830 s / 445.012 s |                450.143 s / 445.018 s |
| Average speed with 3× selected             |                               2.982× |                               2.995× |
| Slowest complete minute                    |                               2.654× |                               2.039× |
| Walking requests accepted                  |               380 of 392; 12 blocked |     379 of 392; 9 blocked and 4 busy |
| Walking confirmation, 95% within           |             960 ms; maximum 2,282 ms |            748 ms; maximum 10,201 ms |
| Visible starts from stationary, 95% within | 1,747 ms across 40; maximum 2,578 ms | 1,393 ms across 33; maximum 1,620 ms |
| Drawing submissions/second                 |                               108.17 |                               107.23 |
| Drawing gaps, 95% / 99% within             |                     16.50 / 28.25 ms |                     16.25 / 28.75 ms |
| Longest drawing-submission gap             |                             477.6 ms |                             177.6 ms |
| Whole-server process CPU                   |                             281.15 s |                             294.84 s |
| Simulation advances / overlapping elapsed  |                     9,920 / 217.17 s |                     9,237 / 243.54 s |
| Saves / overlapping elapsed                |                       721 / 117.75 s |                       709 / 108.32 s |
| Database statements / overlapping await    |                    19,436 / 203.97 s |                    19,254 / 195.54 s |
| Resident routines admitted                 |              276: 260 work + 16 rest |              265: 250 work + 15 rest |
| Meals matched to produced food             |                   244 of 244 checked |                   235 of 235 checked |
| Residents sleeping and waking              |                             16 of 16 |                             15 of 16 |
| Residents alive at closure                 |                             16 of 16 |                             15 of 16 |

The fifth and sixth builds differ in both movement-prediction lifetime and calculation batching. The sixth also loses one resident's activity, has different player outcomes and runs under a different host load. Total CPU and simulation elapsed are higher despite fewer advances; saving/await totals and the worst drawing gap are lower. None of those changes establishes an isolated gain or regression from one component. Spans overlap and include waiting; they cannot be added into separate CPU shares.

### Slow periods and catch-up

Rates use consecutive growth samples with actual timestamps. Sleep counts describe the interval's end, not every moment inside it. The largest recorded minute-sample backlog is 3,290.816 game seconds; these occasional samples do not prove the absolute peak between samples.

| Approximate real-time interval | Achieved speed | Residents asleep at end | Waiting game time at end |
| ------------------------------ | -------------: | ----------------------: | -----------------------: |
| 0–60 s                         |         2.039× |                       0 |                  3,291 s |
| 60–120 s                       |         3.943× |                       0 |                      0 s |
| 120–180 s                      |         2.942× |                       0 |                    211 s |
| 180–240 s                      |         2.429× |                       1 |                  2,259 s |
| 240–301 s                      |         3.626× |                      15 |                      0 s |
| 301–361 s                      |         2.997× |                      14 |                     12 s |
| 361–421 s                      |         3.003× |                       0 |                      0 s |
| 421–450 s                      |         2.967× |                       0 |                      9 s |

The game ends with only 9.005 game seconds owed, but clearing the debt later does not erase earlier slowdown. It advances 80,891.089 game seconds: 22 hours 28 minutes 11 seconds, still short of a full day. A near-target average is compatible with long stalls and incomplete character activity.

### Player input, drawing and resident outcomes

The browser submits 407 intentions: 392 walks, 14 meals and one sleep action. It receives 394 acceptances. All 15 recovery intentions are accepted, and no intention remains unconfirmed. There are 442 scheduled input slots and no overdue skipped slot. Thirteen walks are refused: nine blocked and four busy. The four busy requests report HTTP failures and correspond to four console HTTP 503 messages. There is no page exception or failed network transport request; an HTTP error response is still a failed action and is not hidden by those zero counts.

Among 379 accepted walking confirmations, the 95th percentile is 748.2 ms and the maximum 10,200.9 ms. The 33 visible starts from stationary have a 1,393 ms 95th percentile and 1,619.8 ms maximum. These measure different subsets and stages; the shorter visible-start maximum does not cancel the slow accepted confirmation. The raw results do not identify its cause.

Drawing submits 47,720 frames over 445.018 seconds. Submission gaps are within 16.25 ms for 95% and 28.75 ms for 99%, with a 177.6 ms maximum. The separate animation-callback clock records a 156.7 ms maximum; physical display presentation is not measured. One 59 ms browser long task is recorded, and one detailed character model remains present. The lower maximum gap than the fifth run is an observation, not a guarantee of smooth drawing or larger-crowd capacity.

Residents produce 477 gathering results and 483 preparation results, with 235 meals matched to their produced food. The driver still requests meals at work-cycle ends, so this is not natural needs-based decision making. All 15 surviving residents start and finish one rest routine. Orin has two accepted work routines, no rest start/wake, one recorded routine-admission error and `alive: false`. The validated complete checkpoint records death from hunger; the detailed evidence follows. There is no crafting action, so remote-crafting benefit remains unmeasured. Browser exit is 0; server exit is 1 because the routine failure is counted, with `storageError: null` and no claim of an uncaught storage crash.

### Orin's death: validated history and the diagnostic scheduling hole

The preserved checkpoint passes actual current-world and complete-history validation. Orin completes exactly ten actions in two work plans, `profile-plan-5` and `profile-plan-22`. He eats at game time 3,735 (event `event-1102`) and 7,332.90741954 (event `event-1751`), with no third plan, later meal or rest. At 37,633.3333 game seconds, hunger first reduces his health from 100 to 97 (event `event-6906`). Damage repeats every 300 game seconds. At 47,533.3333, his health falls from 1 to 0 and the death records cause `needs`, labeled Hunger (event `event-8104`). He still carries two cooked meats and two berries. Measured activity is about 7,012 game seconds active and 73,878 idle, with two work selections, no rest and one admission error.

Source inspection identifies a concrete driver liveness hole: it removes a resident from the queued set before awaiting plan admission and does not re-add the resident when that await throws busy. Its observer schedules more work on action/plan transitions or waking, which an already idle resident no longer produces. This matches Orin's stranded sequence, but the failure report omits its exact request ID; the precise failed request cannot be reconstructed from this evidence. The recorded death is hunger, and this diagnosis does not demonstrate a collision defect or general hunger-rule failure.

The small diagnostic repair is implemented and passes focused actual-owner checks: recover only a busy admission proved not to have entered its mutation, use fresh offers and bounded requeueing, and retain the failed result/counts. Post-entry errors remain uncertain and are not silently retried. Complete-game survival/performance after this repair remains unmeasured. [Selected repair and verification](../../projects/performance-overhaul/execution.md#prevent-a-refused-diagnostic-routine-from-stranding-a-resident--selected-october-17-2026-1554-edt). Private diagnosis: `/private/tmp/ol-compromise6-resident-diagnosis-full-orin.json` and `ol-compromise6-resident-diagnosis.json`. No additional full-game run follows from these checkpoint reads.

Orin's loss of activity makes the later sixth workload less representative. It does not turn the near-target average into a pass, and does not excuse the recorded busy periods, four busy player walks or ten-second accepted walking confirmation.

### What changed, and what remains unproved

The retained save/load repair preserves the checked moving scene's sighting identities, clocks and later events through 32 future updates; one tiny saved countdown difference converges after arrival without affecting those checked outcomes. The game still yields to network/storage callbacks after roughly 8 ms, and uncontended work targets 32 ms before returning a complete world. Waiting ordinary requests ask for the next complete boundary; durability requests and computed-route publication do not trigger that earlier stop. Neither target is a maximum latency guarantee. [Repair qualification](overhaul-simulation-implementation.md#longer-continuation-result--october-17-2026-1539-edt) · [Scheduling comparison and actual queued-Pause proof](overhaul-simulation-implementation.md#share-more-calculations-before-publishing-a-world-update--october-17-2026-1540-edt).

Slower production and less precise noticing remain deliberate compromises: one work/meal cycle takes 58 game minutes before travel, with the same ingredients/output, and ordinary motion permits four metres between samples. The original faster-production/one-metre workload has not passed. The smaller finite native scheduling comparison's roughly 7% elapsed/5% CPU reduction is not reproduced as an isolated complete-game gain here. A subsequent [prediction-lifetime comparison](overhaul-simulation-implementation.md#cost-of-rebuilding-crossing-predictions-at-each-native-call--october-17-2026-1552-edt) finds about 1.2% more mean elapsed and 1.7% more CPU, with overlapping samples. It does not establish the repair's complete-game cost or explain the busy-minute slowdown; the old prediction lifetime already has a demonstrated save/load defect.

Live records grow 280→527, item lots 90→337, retained command results 62→1,286 and admitted action records 0→1,618. The separate unforced heap report is 187.1→170.2 MB; this does not prove a memory improvement or absence of leaks. Host load is 36.1→22.3 on ten logical CPUs, substantially different from the fifth observation's 66.5→72.0. There is no CPU sampler or paid AI/provider call in this run.

### Source, preserved evidence and cleanup

The source fingerprint is `d8e3fa12459d478efd5f44c731a67d17b69f913f7ad5135835ec5d94231d28a9` across 551 runtime files. Startup, readiness and postmeasurement source agree; all 12 actual workspace bindings match. The browser loads `index-Csw0xxdi.js`. Raw reports are `/private/tmp/ol-overhaul-compromise6-20261017/server.json`, `browser.json`, `source-after.json` and `cleanup.json`, with `checkpoint/preservation.json`.

The preserved checkpoint is `6bbd98c8-6f27-4d4d-b3e1-8027021e08c5`, revision 716, 93,539 rows and 78,271,782 bytes. Export checksum/row-count integrity passes; this is not complete service-restore qualification. Pause/preservation advances another 115.176 game seconds after the performance cutoff, excluded from every result above. Owned database/session counts are zero and the exact temporary directory is absent. No development save/database is replaced. Additional/cumulative provider/Jev cost remains $0.

### Guarded diagnostic recovery — October 17, 2026, 15:58 EDT

The two-file diagnostic correction is implemented. Only a typed busy error before the native plan callback enters returns a safe-unstarted marker; the failed diagnostic job is completed first. The driver records refusal/error/failure and schedules a fresh current choice through its single existing guard after a 250 ms cooldown. Initial-job errors, errors after callback entry and terminal-job errors remain uncertain and do not become automatic retries. Failure records now preserve their timestamp and selection ID.

An actual disposable-service proof holds the mutation queue and privately narrows admission to 30 ms. The first attempt has zero callback entries, no plan/receipt and a terminal failed job; the subsequent fresh selection admits exactly once with a completed job/receipt. Injecting a typed busy error after callback entry propagates without a safe marker. Current TypeScript, formatting and independent full-diff review pass. The proof closes its owned repositories, drops its owned database through the normal non-force owner and removes its own directory; no generated identifiers were retained for an independent session query. No paid calls or complete campaign follows. The sixth result remains the earlier failed workload, not proof of post-repair survival or speed. Raw proof: `/private/tmp/ol-routine-busy-proof.json`.

**Timestamp cross-check — October 17, 2026, 16:01 EDT.** The persisted `server.json` failure omitted time, but the original console log retains `atUnixMs:1792266223890`, or 19:43:43.890UTC, exactly 54.881285 seconds after measurement started. The actor and native-plan-admission stage match the sole recorded routine error. Its exact selection/request ID is absent. Earlier draft wording conflated the omitted report field with unavailable time; the current summaries now distinguish the known timestamp from the missing request identity. No simulated clock at that exact callback is inferred.

## Seventh combined compromise result — catches up, walking and drawing still fail

**October 17, 2026, 17:23 EDT. The game averages2.995010× over 605.011 seconds, but still fails smooth3×.** Its second minute runs at 2.156×and accumulates about 52 game minutes of waiting simulation; the next minute catches up at 3.812×. Every resident survives, works, sleeps and wakes. Walking confirmation still reaches 3.870 seconds, and one drawing gap reaches 1.592 seconds. The final checkpoint export also fails because another checkpoint is in progress.

| What the player experiences or the test requires |   Sixth observation |   Seventh observation |
| ------------------------------------------------ | ------------------: | --------------------: |
| Server/browser duration                          | 450.143 s/445.018 s |   605.011 s/600.003 s |
| Average actual clock                             |           2.995013× |             2.995010× |
| Slowest complete minute                          |              2.039× |                2.156× |
| Worst sampled waiting game time                  |         3,290.816 s |           3,137.418 s |
| Accepted walking confirmations,95% within        |            748.2 ms |            1,110.9 ms |
| Longest accepted walking confirmation            |         10,200.9 ms |            3,869.9 ms |
| Idle-to-visible walking starts,95% within        | 1,393 ms(33 starts) | 1,088.9 ms(48 starts) |
| Longest observed idle walking start              |          1,619.8 ms |            1,807.8 ms |
| Actual engine drawing submissions/second         |              107.23 |                109.63 |
| Longest actual drawing interval                  |            177.6 ms |            1,592.2 ms |
| Living resident NPCs at cutoff                   |            15 of 16 |              16 of 16 |
| Resident sleep/wake cycles                       |            15 of 16 |              16 of 16 |
| Matched produced-food meals                      |                 235 |                   368 |
| Accepted/submitted player intentions             |             394/407 |               461/474 |
| Busy player refusals                             |                   4 |                     0 |
| Other walking refusals                           |           9 blocked |            13 blocked |

This is the same declared twentyfold work-duration/four-metre noticing compromise, with the retained forecast-write improvement, safer resident driver and request attribution. Both failed saving-batch trials and the four-interval service trial are removed. The one-interval service remains. The small multi-interval teaching repair has no speed claim for this service. This is a combined build observation, not an isolated causal percentage: duration, initial measured clock and host activity differ. The five ordinary full observations remain consumed; this is the seventh declared compromise observation.

| Server interval                | Actual interval speed | Resident sleepers at its end | Sampled waiting game time |
| ------------------------------ | --------------------: | ---------------------------: | ------------------------: |
| 0–60.194 s                     |                2.974× |                            0 |                  96.412 s |
| 60.194–120.286 s               |                2.156× |                            0 |               3,137.418 s |
| 120.286–180.311 s              |                3.812× |                            0 |                 215.535 s |
| 180.311–240.349 s              |                3.059× |                            5 |                       0 s |
| 240.349–300.550 s              |                3.000× |                           16 |                       0 s |
| 300.550–360.598 s              |                3.001× |                           11 |                       0 s |
| 360.598–420.766 s              |                2.999× |                            0 |                       0 s |
| 420.766–480.824 s              |                3.001× |                            0 |                       0 s |
| 480.824–540.860 s              |                2.999× |                            0 |                       0 s |
| 540.860–600.918 s              |                3.000× |                            0 |                       0 s |
| 600.918–605.011 s,partial tail |                2.262× |                            0 |                  15.785 s |

All 17 people are alive; the fixture contains40 animals,100added objects and three buildings remain part of the expanded fixture. All 16 residents complete work, one sleep and one wake, with zero recorded routine errors/refusals/stops. Scripted native plans exercise real approach travel, work and produced-food meals, not paid or independent model decision quality. There are 368 matched meals. The player sleeps/wakes once, with about 119.789 real seconds recorded as rest. The browser offers597 one-second opportunities without overdue skips; it submits474 intentions(457 walks,16 meals,one sleep), accepts461 and has zero unconfirmed movement. Ordinary sleeping suppresses walking opportunities rather than offering the same input load continuously. Thirteen blocked walks remain visible as genuine gameplay refusals.

Drawing has 65,780 postrender submissions,109.6327/second, p99 27 msand maximum 1,592.2 ms. The separate animation-callback gap reaches 1,582 mswith1,576 msmaximum supplied-timestamp lag. These are engine/callback deliveries, not physical screen presentation. All 69,988 raw frame intervals fit the existing capture bound; no frame/view/GPU sample is truncated. The browser records zero page errors/console errors but four aborted request transports(three action-menu reads and one activity-request read). Their cause/phase is not yet established; browserexit0 does not erase them.

Server process CPU is 395.052 seconds. Completed native spans are 12,702 calls/284.328 seconds(max736.6 ms);960 world-commit spans total 166.558 seconds(max3,316.7 ms);27,243 SQLspans total 277.623 seconds(max1,486.0 ms);8,657 public projections total 22.874 seconds. These overlap and are not a wall-time or exclusive CPU partition. Nineteen explicit waits for an earlier background save total 12.979 seconds and reach 3.204 seconds. Exact request/save correlation is being analyzed before assigning a particular walking delay. The bounded detailed event trace retains 20,000 of 118,105 events;98,105 are omitted. All 474 HTTPcommand records fit the4,000 bound. Metric percentiles cover their declared completion windows.

The report has failureCount0, no storage pause and no recorded SQL/maintenance rejection. Separately, the before/after search-index failure counter rises by one; its historical cause/time is not retained. This is independent of the intelligence-diagnostics error below, and zero SQL-rejection observations does not identify either failure as a database error. The server log nevertheless contains one unexplained “Could not persist intelligence diagnostics” failure. This replaceable diagnostic write is distinct from authoritative world saving; its swallowed cause is unknown. The server exits1 because postmeasurement checkpoint preservation fails after an ordinary pause with “Another checkpoint is in progress; the next opportunity will retry.” Preservation status is **incomplete**. The disposable database is correctly cleaned up; this observation has no retained usable continuation checkpoint, and no cold-restoration pass is claimed. The original measured report remains intact. No retry or replacement run hides either failure.

Measured source is`fb2e838e3a63cb27e0fef37984b1200ae76c80c2`; all 551 runtime files and twelve workspace bindings match startup/ready/after at`a3fa4a1fd87e9577bae100ca2f049f39ce4c21d4f2b27f1e5ac93c9d6a7093c4`. The production client remains`index-Csw0xxdi.js`, built before the frozen run. Host load on ten logical CPUs is 38.15→63.88; this is contended and differs from the sixth observation. No CPU/allocation sampler, trace, blur override, near-start shortcut or provider is used. All owned processes end normally without TERM/KILL. Independent cleanup proves database`openlegend_fixture_050c3e5294ff4208983669950c895fb5`and its sessions absent, and its temporary directory removed. Browser exits0; server exits1 for incomplete preservation. Additional and cumulative provider/Jev cost is$0.

Private outputs:`/private/tmp/ol-overhaul-compromise7-20261017/`contains server/browser reports, logs, screenshot, startup manifest, coordinator status, source-after proof, cleanup proof and incomplete preservation report. This intermediate test cannot close the existing1,800-second/minimum 1,000 accepted-intention acceptance. Busy-minute progress, walking and drawing all remain below the requested quality; implementation and iteration continue.
