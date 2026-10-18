# Making OpenLegend run smoothly at 3×

| Status      | Current progress                                                                                                               | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Historical experiments are preserved; smooth 3× remains unresolved, runtime work is stopped, and a new proposal batch links from this report. | 2026-10-16   |

## Read this first: what we know now

**Currency note — October 16, 2026:** this document preserves the chronological explanation from earlier stages. “Latest” and “most recent” in those accounts refer to their stage, not necessarily the newest experiment or the normally launched game. Use the [current ranked report](performance/bottlenecks.md) for the consolidated findings, and [Performance Overhaul Ideas](../projects/performance-overhaul-feature-spec.md) for the new source-analysis proposals. The [evidence audit](../projects/performance-overhaul/evaluation.md) records limitations and future comparison requirements; no runtime work was resumed for that analysis.

For a standalone explanation of the ranked costs, current gaps and trade-offs, read [Why OpenLegend is still slow](performance/bottlenecks.md). Detailed evidence is now split into [smaller topic files](performance/README.md).

**The game still fails the sustained 3× target.** The latest ten-minute test averages **2.484×**. After the other characters wake and return to work, the last two full minutes run at only **1.638× and 1.688×**. The game ends about **104 real seconds behind** its requested progress. The best earlier short graphical test reaches 2.983×, but that does not establish sustained performance. The scene contains seventeen people, forty animals and 133 other physical objects, including three sheds. All sixteen other people actually travel, work, eat, sleep and wake. The navigation worker passes a real route query before each test; the earlier copied-worker error is corrected in these comparisons.

The speed figures use the game’s normal 1× rate. A measured 1.5× is half the requested 3× pace. The earlier 0.091× result was about one-eleventh of normal 1× speed and was a severe failure.

The most recent experiments have these outcomes. **None has yet proved smooth, sustained 3× play.** Calculation-only results exclude saving and drawing the game.

| Experiment                                                    | Before → after                                                                 | Current decision                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Slower bird and less frequent idle-stag threat checks         | Calculation CPU **9.61 → 6.63 s**, about **31% less**                          | Isolated gain; first full game comparison fails after one player command is refused. Animals behave differently.       |
| Reuse completed, unchanged world data                         | Same outcomes, but calculation CPU **8.59 → 9.03 s**, about **5.2% worse**     | Rejected. Original saving timeouts remain failed checks.                                                               |
| Freeze all forty animals completely, for diagnosis            | Calculation CPU **9.47 → 4.75 s**, about **50% less**                          | Strong measured contribution; loses animal movement, needs and reactions. Not retained.                                |
| Stop incremental new sightings and recognition, for diagnosis | Calculation CPU **9.47 → 8.09 s**, about **15% less**                          | Separate measured contribution; loses new encounter updates. Not retained; cannot add these savings to animal removal. |
| Share the work that finishes several updates                  | Calculation CPU **8.11 → 8.46 s**, about **4% worse**                          | Reject this version.                                                                                                   |
| Double six already-lengthened work durations                  | Full game speed **0.82× → 1.50×**, still below 3×                              | Not retained. Different work and host conditions prevent a controlled speedup claim.                                   |
| Reuse unchanged shadow data                                   | Matching graphics data in 111 comparisons; builds pass                         | Real graphics recovery and whole-browser performance remain untested.                                                  |
| Rule out impossible cape/body contacts                        | Same motion, but CPU **1.314 → 1.425 ms per cloth step**, about **8.4% worse** | Reject this version. Avoiding more checks does not make it faster.                                                     |
| Combine pending progress with a walking-command save          | The ordinary walking path already performs one combined save                   | No change selected. Removing an already-started save would risk losing or misordering saved history.                   |

| Latest ten-minute result                                        |    Measured result | What it tells us                                                                           |
| --------------------------------------------------------------- | -----------------: | ------------------------------------------------------------------------------------------ |
| Actual game speed, requested 3×                                 |         **2.484×** | Fails; later working minutes are substantially slower                                      |
| Average drawings submitted each second                          |              88.74 | The average hides a **569 ms** drawing gap and does not prove successful display           |
| Slow click-to-acceptance time, 95th / 99th percentile           | **722 / 1,081 ms** | Walking still waits too long                                                               |
| Slow first movement after an idle click, 95th / 99th percentile | **885 / 1,191 ms** | The player still sees a substantial delay before moving                                    |
| Actual accepted player commands                                 |                528 | 516 moves and twelve meals; player sleep is not covered                                    |
| Other characters' completed work-and-meal cycles                |                579 | All sixteen participate and each sleeps and wakes once                                     |
| Produced item lots, start → end                                 |           90 → 680 | The game has more real possessions to update; the cost needs attribution                   |
| Saved command confirmations, start → end                        |         62 → 3,014 | More completed work accumulates; deleting history is not an established fix                |
| Graphics warnings in the complete capture                       |              **8** | Fails the clean-graphics check; the existing recording cannot identify their time or cause |

Reaching 3× during those late working minutes requires about **78–83% more game progress per real second**. The faster minute while the other characters sleep catches up older unfinished time; it is not proof that the game can sustain 3× during activity. All seventeen people survive, and all forty animals are alive in the preserved endpoint. That animal check does not prove every animal moved throughout the run. No character, save or database error is reported. The graphics warnings are separate failures under investigation. [Complete ten-minute evidence](performance/06-sustained-game-and-browser.md#ten-minute-mixed-travel-rest-and-growing-history).

Later short comparisons also run under substantial host pressure: the machine has **10 logical CPUs and 32 GB of RAM**, with roughly **26 GB of swap in use**. Two snapshots across a 5.4-minute interval show active swapping and repeated memory compression. That interval includes setup, a diagnostic run and other applications; it does not identify the game as the source or explain any particular pause. This limits what a short elapsed-time comparison can establish. The failed 3× result remains a failure, and game-specific costs below remain under investigation. [Host measurements and limits](performance/09-animal-and-cadence-experiments.md#host-pressure-around-the-aged-comparisons).

| Biggest current issue                                                          | What the evidence says                                                                                                                                          | What happens next                                                                                                                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working characters fall further behind as the run grows                        | Late working minutes reach only 1.64–1.69×; the preserved aged world also runs at 2.060× in a separate thirty-second CPU diagnostic without a graphical browser | Sharing finishing and longer work fail; changed animal timing cuts isolated calculation CPU by 31%, while its first full game pair still fails at 0.29×/0.84× |
| Updating the world is the largest measured calculation group                   | The current aged recording assigns **16.015 of 30.271 sampled seconds** to world calculations; finishing updates is its largest separate subgroup               | Use the current CPU and allocation breakdowns below to qualify the next owner change                                                                          |
| Moving the player's cape and preparing shadows repeat substantial browser work | A later partial recording assigns **3.36 sampled seconds** to cape movement and **1.97 seconds** to preparing shadows                                           | Test reuse of unchanged shadow data and a quick rejection of impossible cape/body contacts; both are intended to preserve the current appearance              |
| Walking waits for saving                                                       | The aged thirty-second recording measures **12.81 summed** seconds inside PostgreSQL across calls taking **16.96 seconds** from submission to completion        | The bounded wait capture misses those earlier stalls; no extra index or SQL rewrite is selected                                                               |
| Some graphics draws report an insufficient buffer                              | Eight warnings are saved, but their source and occurrence time are unavailable                                                                                  | Identify the actual drawing and buffer that disagree before selecting a fix                                                                                   |

Two separate forty-five-second graphics diagnostics do **not** reproduce the buffer warning: about **1.90 million fresh-world draws** and **1.87 million aged-world draws** pass their supported buffer-range checks. The aged capture also records an authorization-request console error during startup, before draw inspection begins; its cause is separate and unclassified. The last half-second of the fresh capture and **70 ms** of the aged capture, between the final draw snapshot and browser closure, are outside those counts. These shorter tests add expensive inspection and have not qualified the original complete sleep/wake cycle. The eight original warnings remain unresolved. A later ordinary long qualification will use improved console timestamps without draw inspection; no graphics repair or clean long-run result is claimed.

The focused sleep/wake tests have exposed three test-setup failures. They remain recorded separately from game defects:

| Sleep/wake attempt | What actually passes                                                                                                                              | Why the test stops                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| First              | 453,509 checked draws with no reported buffer mismatch, warning or refused request                                                                | The observer looks for the authored character name instead of the name currently visible to the player; no sleep/wake proof      |
| Second             | Awake cape drawing and 630 game seconds of actual sleep                                                                                           | Extra flat-picture drawing passes are incorrectly counted as the 3D body; Wake is not reached                                    |
| Third              | Actual animated body/cape drawing, 730 game seconds continuously sleeping, then 27 flat-image draws with zero animated-body/cape draws            | The test searches near the player at screen centre and finds no ground near the distant sleeper; no walking or Wake is attempted |
| Fourth             | All three stages: actual animated body/cape, 675 game seconds of genuine sleep, ordinary player approach and enabled Wake restoring the body/cape | **Pass.** No warning or refused request; normal process/database cleanup passes                                                  |

The third attempt checks **316,628 draws** with no reported buffer mismatch, warning or refused request. The fourth checks another **279,699 draws** and searches the whole canvas, then uses a normal click, actual arrival and the currently enabled Wake action; the player is 0.7 metres away when waking the sleeper. **This qualifies that one character’s sleep/wake drawing transition.** It does not reproduce or resolve the original eight warnings, or prove every simultaneous character/shadow change is safe. All failed attempts and normal database/process cleanup are preserved.

The complete aged save now passes the normal load path. All sixteen characters' saved work, needs, sleep and positions and all thirty-two resource patches match before and after loading. A separate thirty-second run then reaches only **2.060× with CPU profiling enabled**, using ordinary screen-data updates and HTTP walking but no graphical browser. All sixteen inherited plans finish, followed by seventeen newly selected complete work-and-meal cycles. The player stays alive at full health. Loading takes **50.9 seconds outside the measurement**; cold caches, different inputs and profiler overhead mean this is not a matched comparison with the ten-minute graphical run. It supplies a current slow-world recording, not a speed improvement or sustained pass.

The recording also separates the largest world-update costs. These rows do not overlap each other. They describe where the sampled main thread spends time, rather than exact CPU seconds or a promise that all of that work can be removed.

| Work in the aged-world CPU recording                                | Sampled time in the roughly thirty-second recording | Meaning for the next experiment                                                                         |
| ------------------------------------------------------------------- | --------------------------------------------------: | ------------------------------------------------------------------------------------------------------- |
| Finish changed world data and prepare information for its consumers |                                          **3.94 s** | The first sharing trial also fails; trace which smaller deadlines make this work repeat                 |
| Coordinate the progression of world time and its updates            |                                          **3.28 s** | Keep following expensive child calculations rather than replacing the whole simulation without evidence |
| Update hunger, energy, bodily conditions and related rules          |                                          **2.31 s** | Earlier shared-read improvements help, but this remains a substantial cost                              |
| Determine what characters currently notice                          |                                          **1.53 s** | Preserve discoveries and private knowledge while investigating repeated preparation                     |

A separate allocation recording estimates **7.02 GB of temporary JavaScript data in thirty seconds**. This is data created over time, including objects already discarded; it is **not** 7 GB held in memory or proof of a leak. The allocation recorder itself slows the game, so its measured speed is not a capacity result.

The largest finishing cost now has a more specific breakdown from that same CPU recording. After changing people, animals or objects, the game must produce stable data that saving and the screen can safely read. Most of the finishing time goes into walking through that modified data; producing the detailed list of edits is a much smaller part.

| Part of finishing an updated world               | Sampled time | Share of finishing |
| ------------------------------------------------ | -----------: | -----------------: |
| Walk through modified data and finish its values |   **3.29 s** |            **83%** |
| Produce the detailed list of edits               |       0.22 s |                 5% |
| Check which physical or visible facts changed    |       0.17 s |                 4% |
| Remaining finishing work                         |       0.28 s |                 7% |
| Total                                            |   **3.96 s** |           **100%** |

Rounded percentages do not total exactly 100%. This points toward avoiding repeated data traversal, while keeping all real possessions and history. It does not yet identify which collection causes the most work or prove that all 3.29 seconds can be saved. [Exact breakdown and checks](performance/09-animal-and-cadence-experiments.md#measured-world-finishing-children).

The next candidate marks already-completed world data read-only before another operation uses it, so the data library can skip walking through unchanged contents again. All thirty-eight targeted correctness checks pass, including independent branches and an actual accepted walk followed by removal of its temporary result. It also matches all 269 published changes and eighty comparison points in a forty-game-minute simulation: all sixteen other characters eat food they actually gathered and physically return to work. Saving and speed comparisons are still required. No possessions or history are removed, and no performance gain is claimed yet.

I also traced whether a click to walk needlessly saves pending game progress and then saves the walking command separately. Ordinary walking already combines those changes in one save. If a save has already been prepared or started, the command must wait for it: that save establishes which history is safely stored before the next change. The game also deliberately starts a save after five seconds without saving, even when commands are waiting, to bound progress lost in a crash. Removing that limit would change durability rather than remove duplicate work. This investigation found no ordinary-walking shortcut to implement and makes no speed claim. Walking to a remembered place has a separate conditional save before reading the character's updated personal knowledge; the current ground-click test does not use that path.

The first saving qualification passes six of its seven checks. The remaining check restores a game while work is in progress and fails to finish within its existing fifteen-second limit. This happens in the unchanged version, before the changed version is tested. The failing operation within that check is still being traced. The limit has not been increased, and all four temporary databases close and are removed normally. This is an unresolved verification failure, not evidence that saving is repaired or that the candidate caused the timeout. A later isolated execution of the same behavior now passes in 5.18 seconds under the unchanged fifteen-second limit. All 29 timed steps finish; starting and entering the fresh world takes 3.51 seconds, and reopening takes 0.82 seconds. This does not locate the original timeout. Together with the earlier six passes it establishes baseline functional coverage; the changed version’s seven checks and its speed comparison remain next.

The changed version's seven saving checks then finish with four passes and three timeouts. Two stop before temporary database setup returns, before reaching the game behavior being checked; the third reaches database setup, but its later stopping point is unknown. The original limits stay unchanged. The test process closes and all four temporary folders are removed. Three known temporary databases are confirmed absent; one creation identity was never recorded and remains unknown. No unknown database is deleted. These are unresolved verification and evidence gaps, not a saving pass or a measured performance regression caused by the change.

The cape shortcut now has a completed timing comparison:

| Same cape motion, four measured runs per version | Current version |   Early contact rejection |
| ------------------------------------------------ | --------------: | ------------------------: |
| CPU time per cloth step                          |    **1.314 ms** |  **1.425 ms**, 8.4% worse |
| Elapsed time per cloth step                      |    **1.552 ms** | **1.714 ms**, 10.4% worse |
| Measured cloth steps per version                 |           7,904 |                     7,904 |
| Final cloth positions and mesh                   |       Reference |   Exact match in all runs |

Each run uses the same motion, pauses, resets and visibility changes. There is no graphical browser or database in this measurement. Although the correctness replay rejects most candidate body contacts, the extra calculations make the complete cloth update slower. **Reject this version; the game keeps its current cape.** This stops that particular trial; the larger cape cost remains under investigation.

The next private cape trial uses four rounds of fabric corrections instead of eight at the same update rate. It keeps every current body-contact shape and all normal visibility, pause and reset behavior. Folds may become stretchier or show more clipping; those are visual compromises to measure and inspect, not accepted changes. The prepared trial has not run yet. Simply re-enabling the model's original garment is not a safe alternative: those meshes currently lack their skeleton binding, and restoring it also increases geometry and introduces a known resource-lifetime issue.

| Allocation finding                                           |                  Estimated data created | What is being tried                                                                                   |
| ------------------------------------------------------------ | --------------------------------------: | ----------------------------------------------------------------------------------------------------- |
| Read which carried materials are exposed to rain or drying   | **679 MB**, about **9.7%** of the total | First read-only repair preserves behavior but fails its performance gate; rejected for now            |
| Check whether a character is waiting for a route calculation |                              **520 MB** | First read-only repair also fails its performance gate; rejected for now                              |
| Copy JavaScript objects across many game features            |                             **1.10 GB** | Identify which reads cause unnecessary writable copies before changing the saved-world representation |

These allocation rows can overlap and must not be added. Creating less temporary data does not, by itself, establish a faster game. Both read-only candidates preserve all **239 compared game transitions**, including game data, events, observations and random outcomes, but fail their performance gates:

| Change tested                                                   | Before → after                                                                                                                  | Decision                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Read exposed carried materials without creating writable copies | Fresh calculation CPU **less than 1% better**; aged actual speed **1.726× → 1.505×**, slow walking replies **1,246 → 2,213 ms** | **Reject for now.** Different completed work, database waits and host pressure limit attribution; no useful whole-game gain established |
| Read route-wait records without creating writable copies        | Fresh calculation CPU **7.180 → 7.856 s**, about **9% worse**; elapsed time also worsens                                        | **Reject for now.** Correct results are preserved, but this comparison establishes no benefit; no aged run selected                     |

Neither change is retained and neither changes gameplay. Following the saved allocation stacks shows that route checks cause about **495 MB** of the measured object-copying estimate, yet their first proposed repair is slower. I am following the actual CPU stacks before choosing another copying or world-storage rewrite. [Current aged CPU evidence](performance/08-native-cpu-and-allocation.md#restoring-the-actual-aged-world), [allocation evidence and measurement limits](performance/08-native-cpu-and-allocation.md#server-allocation-protocol-qualification), [following previously unnamed costs](performance/08-native-cpu-and-allocation.md#following-unnamed-allocation-callers).

The new saving measurement separates two kinds of delay. Across 1,822 game database calls in a fresh thirty-second run, **6.519 seconds occur inside PostgreSQL** and **10.158 seconds pass from submission to completion**. PostgreSQL's time includes its own planning, locks and I/O; it is not database CPU. The independent trivial-query probe spends only **25 ms inside PostgreSQL**, but **969 ms** from submission to completion, showing additional scheduling or transport delay too. Calls can overlap other work, so these totals are not added to the run's duration.

The aged-world recording now identifies specific saving costs:

| Database work in the aged thirty-second recording                              | Time inside PostgreSQL | Finding                                                                                                          |
| ------------------------------------------------------------------------------ | ---------------------: | ---------------------------------------------------------------------------------------------------------------- |
| Add lookup records for information characters may later remember               |             **2.10 s** | A substantial write cost; the next checks preserve all remembered information                                    |
| Save events and who witnessed them                                             |             **1.47 s** | One grouped statement can contain several kinds of record; the group total is not assigned to just one table     |
| Replace a character's previous newest remembered view of a place               |             **1.38 s** | One call takes **802 ms**; repeating both query shapes uses the existing index and does not reproduce that stall |
| Save recent results so a repeated request cannot perform the same action twice |             **0.95 s** | **5,307 rows** across **85 statements**; removing the oldest result can renumber and rewrite unchanged survivors |

Across all **1,303 game database calls**, PostgreSQL takes **12.812 summed seconds**, compared with **16.961 seconds** from submission to completion. This includes planning, locks and I/O, rather than database CPU alone. Calls can overlap other work, so the table is not a share of elapsed run time. The recent-result statements send **22.27 MB of string parameters** across all their columns; this is not a separate measurement of result bodies or network bytes.

In the aged run, database work overlaps **4.514 of 6.870 summed seconds** spent servicing 26 accepted walks. The fresh run has 29 accepted walking windows, with **3.405 of 4.750 seconds** overlapping database work. These are timing associations, not exact traces from each walk to its queries. The first aged capture exceeded its recording limit and remains invalid; the reviewed replacement retains every query. No saving shortcut or speedup is claimed yet. [Detailed database experiment](performance/03-saving-and-render-preparation.md#database-execution-timing-availability-and-selected-next-diagnosis).

Two subsequent diagnostics measure real updates before they run, roll back the diagnostic writes and let the original updates finish. Both original updates change rows and commit.

| Database query checked                                     | Earlier slow call | Repeated diagnostic | Decision                                                                  |
| ---------------------------------------------------------- | ----------------: | ------------------: | ------------------------------------------------------------------------- |
| Replace the newest remembered view of one place            |        **425 ms** |        **0.523 ms** | Existing index works in this sample; no index change justified            |
| Replace the newest remembered views of two places together |        **802 ms** |        **4.492 ms** | Existing index works here too; the intermittent stall remains unexplained |

These are different executions, not a measured optimization. The two-place diagnostic reads some database blocks while the one-place diagnostic finds them in memory. Neither reproduces the earlier long delay. Extra writes and warmed caches make these diagnoses unsuitable for capacity comparisons. The complete plans and failed attempts remain preserved.

A later diagnostic was ready to record what PostgreSQL was waiting for if those place-memory calls stayed pending for at least 100 ms. It captured **zero such waits**: the longest matching call was about **26 ms**. That leaves the earlier 425/802 ms delays unexplained; it does not prove they are fixed. Other grouped world writes still reach **757 and 655 ms**. Most of their database time is in executing the changes, which can include waiting as well as calculation. A recent-reply write also spends substantial time preparing its supplied values. The source review found ways to combine a few neighboring calls, but most work on the individual records and indexes would remain. **No further database rewrite is selected from this evidence.** [Complete database evidence](performance/03-saving-and-render-preparation.md#database-execution-timing-availability-and-selected-next-diagnosis).

The recent-reply storage candidate now passes nine correctness groups, including normal saving and loading and genuine failed transactions. At the existing 300-reply limit, adding one reply deletes the oldest and leaves the other 299 saved replies untouched. It does not remove any additional reply or weaken protection against performing a repeated request twice. Its whole-service comparison still fails:

| Recent-reply storage trial                                     |   Before |      After |
| -------------------------------------------------------------- | -------: | ---------: |
| Unchanged replies rewritten when one reply replaces the oldest |      299 |      **0** |
| Actual aged-world speed                                        |   1.876× | **1.681×** |
| Newly completed work-and-meal cycles in the phase              |       12 |         10 |
| Slow walking reply, 95th percentile                            | 1,150 ms |   1,277 ms |
| Longest walking reply                                          | 1,649 ms |   2,780 ms |

The first row comes from the controlled actual-storage proof; the other rows come from the separate thirty-second aged-world pair. All seventeen people survive and all sixteen inherited plans finish on both sides. The candidate completes less new work and ends with more time owed. Host pressure differs substantially, preventing a clean causal speed estimate. **Hold this change outside the game for now:** the write reduction is real, but a useful complete-game gain remains unproved. No gameplay compromise is selected.

The completed sharing trial lets several complete simulation intervals share the work needed to finish a world update. It still calculates every existing movement, bodily change and observation. Its controlled behavior comparison is now fully classified:

| Sharing the end-of-update work: behavior check               |    Before |                                 After | What this establishes                                                                            |
| ------------------------------------------------------------ | --------: | ------------------------------------: | ------------------------------------------------------------------------------------------------ |
| Published world updates over 2,400 game seconds              |       269 |                               **137** | Fewer completed updates; this alone does not establish a speed gain                              |
| Characters that eat and physically return to work            |        16 |                                **16** | The tested routines still finish                                                                 |
| Event identities, types, recipients and saved random choices |  Original | **Match at all 80 comparison points** | No changed event membership or random choice in this test                                        |
| Largest position difference                                  | Reference |    Less than **0.000000000001 metre** | Tiny calculation-rounding differences remain                                                     |
| Event text/data fields with changed bytes                    | Reference |                                **50** | All are tiny decimal tails in food values; the recorded meals and recovery have the same meaning |

The repeated native speed test is now complete and **fails its speed gate**:

| Sharing end-of-update work: native timing      |  Before |                   After |
| ---------------------------------------------- | ------: | ----------------------: |
| Native calls for the same 2,400 game seconds   |     223 |                  **91** |
| Mean native calculation CPU over two runs each | 7.794 s | **8.155 s**, 4.6% worse |
| Mean complete timed CPU                        | 8.105 s | **8.462 s**, 4.4% worse |
| Mean elapsed time                              | 5.922 s | **6.346 s**, 7.2% worse |

All four runs preserve their own version’s proven results, including the fourteen player walks and sixteen real meals/returns. Variation between runs remains visible in the detailed report. These measurements exclude saving, screen-data updates and the graphical browser; they do not establish whole-game capacity. No batching change is retained. Some saved record numbers and counts of automatic calculations genuinely change. At eighteen comparison points the stag has already reconsidered its behavior in one version, while the other version does that at the start of its next update at the **same game time**; no fifteen-second reaction delay was demonstrated. An intervening player command could still matter. Clicks and Pause may also wait longer for an update to finish. The first small-scene Pause test misses active-calculation overlap. A larger ordinary scene now passes all four real Pause/Cancel checks across both versions, including current control authority, one recorded cancellation, an unchanged repeat-request result and normal saving. Observed waits range from **249 to 553 ms** across these four functional cases; that is not a latency distribution or improvement. In one Pause case, the changed version finishes **18 game seconds** before pausing versus **12 before**, illustrating the later-update tradeoff. A failed intermediate check incorrectly compared later unsaved progress with the last saved cancellation; the corrected check uses the game’s normal flush first, with that failure preserved. The complete-server comparison below checks whether fewer screen-data updates or saves compensate for the slower calculations.

The complete thirty-second server comparison now also **fails the retention gate**:

| Sharing end-of-update work: complete aged server |             Before |                  After |
| ------------------------------------------------ | -----------------: | ---------------------: |
| Actual speed, requested 3×                       |             1.186× |             **0.984×** |
| Slow walking reply, 95th percentile              |           1,392 ms |           **1,460 ms** |
| Longest walking reply                            |           2,275 ms |           **3,534 ms** |
| Inherited work-and-meal plans completed          |           16 of 16 |           **14 of 16** |
| Additional complete work-and-meal cycles         |                  5 |                  **0** |
| Unfinished game time at cutoff                   | 1,182 game seconds | **2,040 game seconds** |
| Saves committed                                  |                 51 |                 **39** |

All seventeen people remain alive, with no reported game, save, route or provider error. Fewer saves still take more summed waiting time, and lower CPU accompanies less completed game progress. Host load rises substantially between the two runs, preventing a clean causal estimate of the candidate’s slowdown; loading takes **69.5 and 103.1 seconds** outside measurement. **Reject this version for now.** It establishes no useful native or whole-service gain, and no batching change enters the game. The original differences in publication timing, saved record numbers and calculation counts remain documented. [Full comparison and limits](performance/09-animal-and-cadence-experiments.md#sharing-publication-across-complete-native-intervals).

The separate longer-work candidate now passes all seven work and save/load functional groups. The actual offered costs, finished outputs and ingredient use match these durations:

| Work performed     | Current duration |  Trial duration | Actual result so far                 |
| ------------------ | ---------------: | --------------: | ------------------------------------ |
| Gather raw fiber   |   6 game minutes | 12 game minutes | Correct cost and output              |
| Gather wood        |   7 game minutes | 14 game minutes | Correct cost and output              |
| Gather stone       |   4 game minutes |  8 game minutes | Correct cost and output              |
| Gather berries     |   5 game minutes | 10 game minutes | Correct cost and output              |
| Clean fiber        |   8 game minutes | 16 game minutes | Correct cost, ingredients and output |
| Make ordinary cord |  10 game minutes | 20 game minutes | Correct cost, ingredients and output |

The full work-and-meal cycle would take about **19.3 real seconds at 3× before travel**, compared with **9.7 seconds now**. This halves uninterrupted production and doubles hunger/energy spent per finished output. Walking, needs, sleep and yields keep their current rules. **The first graphical comparison below still fails; no longer-work change is retained.** The corrected test also passes invented cord at the new duration and partial-work Save → Cancel → Load → Resume, with ingredients spent once and output produced once. The narrow follow-up now confirms that the normal reader rejects the unchanged old crafting-rule save before installing anything, leaving current play and both saved copies unchanged. Earlier failed assertions and the separate database setup failure remain recorded.

Both sixteen-person rehearsals also pass. This table checks that the work still functions; it compares different amounts of required game time and is **not a speed comparison**.

| Actual rehearsal check                                     | Current work times | Longer-work trial |
| ---------------------------------------------------------- | -----------------: | ----------------: |
| People who finish a meal using food they actually gathered |                 16 |                16 |
| People who physically return to their first work site      |                 16 |                16 |
| Game time used to complete that work and travel            |          32 min45s |       1 h1 min45s |
| Calculated maximum from actual work and routes             |             34 min |          1 h3 min |

Both versions keep finite resources and all participants alive, with no reported routine or storage failure. Their short reporting tails do not qualify performance or long-term food balance.

The first fresh-world graphical comparison is now complete. Both scenes contain seventeen people, forty animals and 133 other objects, with the same camera and open panels. Each uses 45 seconds of browser observation and about 50 seconds of server measurement.

| Longer work: actual graphical result           | Current work times | Trial work times |
| ---------------------------------------------- | -----------------: | ---------------: |
| Actual game speed, requested 3×                |          **0.82×** |        **1.50×** |
| Drawings submitted per second                  |              43.02 |            42.59 |
| Longest drawing gap                            |              99 ms |       **297 ms** |
| Slow click acceptance, 95th percentile         |           3,117 ms |         1,460 ms |
| Slow first movement from idle, 95th percentile |           1,012 ms |     **3,087 ms** |
| Completed work-and-meal cycles                 |                 16 |               16 |

**Both fail.** The trial still runs at half the requested speed, and movement can still wait seconds. These are different work laws in one ordered pair; the characters follow different paths and spend different amounts of time working. The idle-start samples are also small—five before and eleven after. The numbers do not establish a controlled same-gameplay speedup. No game, save, browser or delivered graphics error occurs, and both tests clean up normally. Longer work remains an unretained experiment; it has not earned its production/food-balance compromise. [Full comparison, clock accounting and images](performance/10-saving-and-world-snapshots.md#longer-ordinary-work-first-fresh-graphical-pair).

The separate animal trial lets the single bird fly more slowly and the idle territorial stag check for new nearby threats less often. All forty animals remain. Active pursuit, attacks and reactions to injury keep their current timing. The idle-only delay can add up to a quarter of a real second before first noticing a threat at 3×; a brief visit entirely between checks can be missed. Neither change is retained yet.

The first four calculation-only timing runs show a substantial improvement. Each covers the same forty game minutes, fourteen player walks, and sixteen actual work, food and return journeys. Current and changed versions alternate, with two runs each.

| Animal timing trial                                       | Current timing |       Changed timing |
| --------------------------------------------------------- | -------------: | -------------------: |
| Average CPU time during the trial                         |     **9.61 s** | **6.63 s**, 31% less |
| Automatic world updates                                   |            223 |                  149 |
| Separate movement steps                                   |            308 |                  152 |
| People who eat their own gathered food and return to work |             16 |                   16 |
| Animals alive at the end                                  |             40 |                   40 |
| Bird takeoffs / landings                                  |          4 / 4 |                2 / 1 |

CPU time ranges from **9.29–9.93 seconds** at the current timing and **6.44–6.81 seconds** in the trial. Elapsed time varies more: **8.76–12.97 seconds** versus **6.07–7.38 seconds**. Saving, screen updates and the browser are excluded. Every repeated version matches its own complete recorded result, but the slower bird and different noticing times produce different observations. This earns a complete-game comparison; it does not establish smooth 3× or faster clicks. [All four timings, behavior checks and limits](performance/09-animal-and-cadence-experiments.md#animal-cadence-isolated-calculation-timings).

The first complete-game animal pair has now finished. The unchanged version passes its error checks; the changed version receives one HTTP 503 refusal of a player command, so that run fails. Both keep forty animals alive and close their processes and temporary databases. The refusal is delivered 4.53 seconds after the browser measurement ends, while the server is still running; its exact command and cause are not recorded. The unchanged through-close error check still fails. No animal change is retained from this pair yet.

| First full game animal comparison                    | Current timing | Changed timing |
| ---------------------------------------------------- | -------------: | -------------: |
| Actual game speed, requested 3×                      |      **0.29×** |      **0.84×** |
| Drawings submitted per second                        |          44.56 |          46.67 |
| Slow click acceptance, 95th percentile               |       2,433 ms |       2,039 ms |
| Longest first visible movement, only five cases each |       7,912 ms |       1,782 ms |
| Completed resident work-and-meal cycles              |              0 |             16 |
| Accepted player commands                             |             21 |             33 |
| Delivered console errors before browser close        |              0 |              1 |

Both fail the speed and smoothness target. Each server phase is intended to last 50 seconds; actual duration is 50.24 seconds before and 55.20 seconds after because the stopping callback is delayed. The browser windows last 45.26 and 45.92 seconds. The changed version gets through more game time and work; this single ordered pair and the heavy host load prevent a controlled same-work speedup claim. Server process CPU is 9.24 and 15.33 seconds, so those CPU totals also cannot be compared as equal work. Two later attempts to use storage report that it is unavailable after measurement; the saved evidence cannot distinguish ordinary closing from a connection failure. No whole-lifecycle clean-storage claim follows from the report's earlier zero-error counters.

A separate review revisits letting people continue a familiar routine across several meals before making another voluntary plan. The earlier version postpones its decision to sleep until the entire long routine finishes, so it is unsuitable as-is. The existing activity system could check tiredness between meals, but actual people would also need a supported choice to use that routine; changing only the test would not improve ordinary play. Fewer chances to reconsider work would be a real behavior compromise. This option remains unselected while the two prepared gameplay trials are measured. [What exists and what would have to change](../projects/three-times-scene-performance.md#longer-needs-aware-plan-assessment).

Temporary database setup stops one browser attempt and the narrow old-save rejection check at their existing30-second limit, before either measurement. Existing error logs identify both exact cancelled creations; both databases and their connections are absent. A subsequent setup succeeds, briefly observed waiting for a database checkpoint. That observation does not prove the cause of the earlier timeouts. No shared development database has been reset.

The subsequent 45-second browser recording finishes, but fails because five player commands receive “server busy” refusals. Its CPU recording misses the final 3.89 seconds. A later analysis, checked against twenty-four controlled examples, recovers useful information from the recorded portion while preserving that failure. It follows each measured sample back to the application work that requested it. These three rows are separate groups and do not overlap:

| Browser work in the recorded portion | Sampled time | What is being investigated                                           |
| ------------------------------------ | -----------: | -------------------------------------------------------------------- |
| Move and shape the player's cape     |   **3.36 s** | Rule out body parts the cape cannot touch before calculating contact |
| Prepare the visible scene            |   **2.33 s** | Find which object updates can reuse their previous results           |
| Prepare shadow shapes and positions  |   **1.97 s** | Reuse unchanged shadow positions and sizes                           |

These figures are measured weights within **41.13 seconds of recorded samples**, including waiting. They are not exact CPU seconds or promised savings. Cape collision calculations alone account for about **1.73 seconds** within the cape group. The broader drawing call includes **7.82 seconds**, but contains other work and overlaps this analysis; it must not be added to the table. Some native browser work remains unidentified. One tiny timestamp reversal is accounted for using the browser's actual sample ordering; it does not justify replacing the missing end of the recording. No renderer change or new 3× pass is claimed. No new insufficient-buffer warning appears in this short recording; the original eight remain unresolved. [Detailed attribution and limits](performance/06-sustained-game-and-browser.md#partial-aged-browser-cpu-caller-attribution).

The animal trial now passes thirty-nine controlled behavior checks, twenty selected physical checks and the complete ordinary encounter under both timings. Actual flight, save/load during flight and pursuit, immediate reaction to injury, search and returning home all pass. The corrected test reaches the changed version before its next scheduled idle check and confirms that damage requests an immediate reaction. It also confirms the stated compromise: a visitor who leaves entirely between the stag's slower idle checks is not noticed. Earlier test failures remain recorded. A different idea—reusing hunger-calculation preparation across animal reviews—is deferred: its measured cost is much smaller than finishing changed world data, while a safe rewrite would be substantial. None of these checks is a new 3× pass.

Reusing unchanged nearby rows is retained after a repeat improves drawings and slow movement starts. It keeps all listed objects and their interactions. The clock now keeps route-preparation time owed, with the hunger/deadline tradeoff described below. No new collision or live-AI behavior change has been retained.

Both menu columns below already use the retained tenfold increase in gathering and preparation durations and the improved memory writes. Longer work is a substantial gameplay compromise: materials arrive later, production per game hour falls, and a finished item costs more hunger and energy. Walking speed and ordinary need rules are unchanged by that duration change.

| What the player experiences                     |          Former menus | Menus prepared when opened | Two-metre movement trial |
| ----------------------------------------------- | --------------------: | -------------------------: | -----------------------: |
| Actual game speed, requested 3×                 |                2.148× |                 **2.983×** |                   2.964× |
| Average drawings submitted each second          |                 66.47 |                      68.74 |                    85.10 |
| Slow drawing gaps: 99th percentile / longest    |            52 / 81 ms |                 48 / 81 ms |               36 / 57 ms |
| Slow click-to-acceptance time: 95th percentile  |                445 ms |                 **422 ms** |                   571 ms |
| Slow first visible movement after an idle click |                863 ms |                 **446 ms** |                   621 ms |
| Resident work/meal cycles completed             |                    48 |                     **64** |                       64 |
| Decision                                        | Historical comparison |                   **Keep** |    **Do not retain now** |

Each column is one 50-second server / 45-second browser observation, not a sustained capacity guarantee. The player follows different paths and sometimes opens the nearby-people panel by selecting someone; that panel is open in the first two ending screenshots and closed in the third. Navigation preparation also pauses the clock for different amounts of time. Those differences prevent attributing the third column's faster drawing to movement precision alone. All three tests finish without resident, storage or browser errors, and all seventeen people stay alive. Drawing submissions are measured; physical display presentation is not.

Residents follow fixed diagnostic routines through ordinary game commands. Their movement, finite resource use, meals and consequences are real, but this does not test live AI choices or model latency. No provider is called; additional and cumulative task cost are $0. “95th percentile” means 95% of measured cases are at or below that time; small sample counts limit tail precision.

The menu change removes automatic suggestions and three pinned shortcuts; complete choices remain available when opened. The two-metre trial reduces calculation cost in a separate controlled native comparison, but two characters miss first discoveries of places and click responses do not improve here. It is rejected. Preparing fewer undrawn character poses also fails its repeat and is rejected. Sharing repeated simulation reads saves about 5% of isolated calculation CPU and 5.6% across four short complete-server cases, with considerable variation. It is retained, but the combined ten-minute test fails. Preparing one walking body earlier is retained for first-use latency, with an explicit loading cost.

| Recent trial                                                                  | Before → after                                                                                                                                  | Decision                                                                                                                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse unchanged nearby-object rows                                            | Temporary data **9.036→6.355 GB**; repeat without allocation sampling **64.62→77.03 frame submissions/s**, slow idle-to-movement **925→651 ms** | **Keep.** All entries and controls remain; longest reply worsens **784→1,025 ms**, actual work differs and sustained 3× remains unproven. |
| Delay replaceable drawing preparation until a frame can actually be drawn     | Actual speed **2.708× → 2.521×**; slow click responses **458 → 624 ms**                                                                         | **Reject.** Some preparation and temporary data decrease, but the repeat is slower and less responsive.                                   |
| Share repeated reads while predicting the next change to a character's meters | Isolated CPU **5.854 → 5.571 s**; four-case complete-server mean CPU **28.523 → 26.927 s**                                                      | **Keep.** All **239** compared updates match; the short service cases vary, and sustained benefit remains open.                           |
| Prepare one current walking body during earlier map preparation               | Walk request to first server-confirmed movement **353 → 127 ms**                                                                                | **Keep for first-use latency.** Roughly 190 ms of work moves earlier; loading/unused preparation costs remain.                            |
| Repair graphics measurements after the graphics device restarts               | Invalid timing-query polls **220 → 0**; graphics error **1282 → 0**                                                                             | **Keep the correctness fix.** It changes no game rule or drawing quality and has no claimed speedup.                                      |

### Other trials and earlier comparisons

| What was tried                                                                 | Before → after                                                                                       | Decision and cost to gameplay                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse the cape's numeric storage                                               | About 2.04 GB → 0.31 GB of temporary cape data in the running browser                                | Keep. Tested motion is identical; frame times are still mixed.                                                                                                                                                                     |
| Stop preparing recurring screen updates, as a diagnostic                       | Actual speed 0.446× → 0.650×                                                                         | Shows a substantial cost. Removing the screen is not a finished solution.                                                                                                                                                          |
| Let each resident choose eight work cycles at once                             | Actual speed 0.615× → 0.657× without screen updates                                                  | Too little benefit to select this gameplay change. It delays reconsidering/rest choices.                                                                                                                                           |
| Temporarily freeze automatic changes to needs, fuel and other conditions       | Actual speed 0.602× → 0.726× without screen updates                                                  | Invalid world; useful cost estimate. Too little benefit to select this rewrite alone.                                                                                                                                              |
| Measure a real memory-eligibility write                                        | 49 rows changed; 12.4 ms database execution / 16.0 ms complete wait                                  | It committed. One real sample does not explain every older/larger wait.                                                                                                                                                            |
| Save new memories once, rather than immediately rewriting their search records | **2.709× → 2.939×**; reverse order **2.888× → 2.929×**, both with ordinary screen updates            | Keep. Existing memory/privacy rules and rollback checks pass. Both short pairs improve; neither reaches 3×.                                                                                                                        |
| Lengthen gathering and preparation tenfold                                     | **Actual speed 0.656× → 2.917×** without recurring screen updates                                    | Selected for new worlds. Materials arrive later and production per game hour falls. Ordinary screen updates reach 2.832×; graphical/long checks remain open. Worlds using the old cord-making rule need a fresh development world. |
| Build unopened panel controls only when needed                                 | Temporary interface data **+64.4%**, total temporary data **+20.8%** in the fresh pair; frames worse | **Rejected and removed.** Different sessions limit causal attribution, but the candidate did not pass its performance gate.                                                                                                        |
| Measure the cost of automatic action choices                                   | **4.712 of 5.964 seconds** preparing screen updates; about **47,000 action checks** in 30 seconds    | Complete on-demand menu trial selected after the graphical failure below. Automatic suggestions and three pinned shortcuts are its explicit costs.                                                                                 |
| Prepare menus only when opened: first matched server pair                      | Screen-update preparation **6.056 → 1.284 seconds**; actual speed **2.875× → 2.906×**                | Intended calculation cost falls about 79%; walking-reply p95 still worsens 429 → 571 ms. Retained after functional qualification and the later graphical comparison; this server-only test does not pass smoothness.               |
| Earlier requested-menu graphical pair, with resident travel                    | **1.842× → 2.590×**; draws **76.88 → 88.08/second**; resident cycles **36 → 64**                     | Preserved but route-limited: copied navigation workers returned errors. The corrected comparison above supersedes its route qualification.                                                                                         |
| Earlier graphical test with resources already within reach                     | **2.124× actual speed**, about **70 draws/second**, but slow first movements reach **1.225 seconds** | Still fails. All sixteen residents work and eat; no save failure. Historical standing-work baseline; the fresh mixed-travel pair below is the current comparison.                                                                  |
| Stop asking the graphics driver for timing measurements                        | **2.124× → 1.902×**, draw rate **70.52 → 60.26/second** in one fresh pair                            | No improvement. Keeps ordinary graphics; does not support timing overhead as the explanation. No product change retained.                                                                                                          |
| Compile the installed state library with production-only branches              | Native CPU **5.445 → 5.567 seconds** on identical work                                               | **Rejected.** No useful gain and no product change; the world, event counts and saved randomness match in this narrow test.                                                                                                        |
| Skip detailed edit lists when no caller needs them                             | Native CPU **6.823 → 6.763 seconds**; about 14% fewer forward edit entries                           | **Rejected and restored.** Only 0.9% CPU gain for roughly 100 extra logic lines; all 239 compared world transitions match.                                                                                                         |
| Check movement/perception at two metres instead of one                         | Native CPU **6.756 → 5.700 seconds**, about 16% less, on actual mixed travel                         | Not retained now. Thirteen focused checks pass, but first place discoveries are lost and the graphical pair does not establish an overall/input win.                                                                               |

The menu implementation now checks choices when a menu opens. Its first server-only pair reduces screen-update preparation about 79%, but speed only rises **2.875× → 2.906×** and slow walking replies worsen. In the corrected graphical comparison above, screen-update preparation falls **10.314 → 2.599 seconds**, about 75%, despite more game progress. Actual browser targeting, cancellation and direct ongoing-control checks pass. Sustained performance qualification remains open.

### Earlier bottleneck recording, before the long test

This earlier recording follows the menu change, the longer work durations and the improved memory writes. It precedes later retained improvements and the aged-world recording at the top of this document. It uses the expanded scene with actual resident travel and records **45.2 real seconds** at **2.525×** with a CPU sampler running. That diagnostic speed is separate from the sampler-free comparison above.

| Work seen in the recording                                     | Sampled time | What it means                                                                                       |
| -------------------------------------------------------------- | -----------: | --------------------------------------------------------------------------------------------------- |
| Run the world: actions, movement, needs and what people notice |  **23.65 s** | Largest remaining calculation group. This includes libraries called by those calculations.          |
| Server main thread waiting                                     |      12.74 s | Waiting can include work elsewhere; this is not a measurement of database execution.                |
| Other server calculations                                      |       2.32 s | Includes smaller server operations outside the groups listed here.                                  |
| Collect discarded temporary objects                            |       1.79 s | Creating less temporary data may reduce this cost. It does not establish a memory leak.             |
| Prepare screen facts and requested actions                     |   **1.36 s** | This is much smaller after the menu change; it is no longer the leading measured calculation group. |
| Geometry calculations outside the world group                  |       1.01 s | Includes spatial library work attributed to its nearest recorded caller.                            |
| Prepare storage work                                           |       0.90 s | Excludes waits that do not retain this caller on the recorded stack.                                |
| Other runtime, unclassified and AI/language code               |       1.39 s | The scripted workload makes no live model calls.                                                    |

These rows divide the recorded sample once. They are sampled elapsed time, not independently measured CPU seconds for each feature. Missing asynchronous callers and delayed samples limit precision. The complete source and clock checks are in the [technical recording](performance/01-interaction-and-early-server.md#current-mixed-travel-server-cpu-capture).

Inside the world calculations, the library that tracks edits to the world accounts for **10.59 sampled seconds**. Finishing and publishing each changed world accounts for **4.87 seconds**, including **4.27 seconds** inside that library. Updating current encounters accounts for **3.07 seconds**. These figures overlap the world row and each other: **do not add them together**. Most finishing work belongs to normal clock advancement, rather than nested character commands. The detailed-edit shortcut below is rejected after a small gain; sharing forecast reads is the next qualified candidate. The source audit found no hidden intermediate world copies to combine: each advancing server batch already contains one calculation taking about21–22ms, beyond its8ms target. Extending batches could make commands wait longer. A separate breakdown of that same older recording assigns each world sample to one operation, so the rows below no longer overlap each other. It predates later retained changes and is not a new measurement of the aged game.

| What the computer calculates                         | Historical sampled time |
| ---------------------------------------------------- | ----------------------: |
| Finish changed worlds and transfer their bookkeeping |                   4.81s |
| Update character meters, effects and bodily rules    |                   4.05s |
| Run the game-clock loop outside a named operation    |                   3.90s |
| Compare current encounters and what people see       |                   2.49s |
| Predict brief sightings and contact during movement  |                   1.53s |
| Perform actions and physical movement                |                   1.47s |
| Predict when rates or rules next change              |                   1.23s |
| Operations not yet mapped to a clear owner           |                   1.03s |
| Check and charge native execution limits             |                   0.99s |
| Record events, notices and personal evidence         |                   0.65s |
| All other mapped world operations                    |                   1.50s |
| **Complete world group**                             |              **23.65s** |

The proposed rewrite of prior-observation snapshots is **rejected**: those snapshots take only27ms in the entire45-second recording, including less than1ms in the suspected copying call. It would add100–170lines for an immaterial bound. Partitioning growing dictionaries so a changed item or new command confirmation copies less data remains unselected until sustained growth cost is established. The separate1.01seconds of geometry-library samples stays outside the world table above. These are sampled elapsed spans, not removable CPU or the cause of an old stall. [Source audit and exact breakdown](performance/08-native-cpu-and-allocation.md#disjoint-historical-world-costs).

Repeated checks of an observer's senses, body and restrictions looked like another sharing opportunity. The saved profile attributes only about **0.30 of 45.16 seconds** to those selected checks inside exposure/encounter preparation, about **0.66%**. Some checking must remain, and these sampled spans are not removable CPU budgets. That small upper bound does not justify a new 90–150-line preparation layer now. The growing confirmation collection is being considered separately; its unsafe small shortcut is rejected below.

### Why the current clock falls behind

The corrected menu run comes close to 3× because it finishes almost all the time handed to it. The remaining shortfall has three distinct parts:

| Delay, expressed as real seconds at requested 3×            | Current one-metre version | Private two-metre version |
| ----------------------------------------------------------- | ------------------------: | ------------------------: |
| Recent elapsed time not yet handed to the world calculation |                   0.132 s |                   0.039 s |
| Time deliberately excluded while preparing a route          |                       0 s |                   0.561 s |
| Change in calculation backlog across the test               |                  +0.150 s |                  −0.008 s |
| Total shortfall from full-wall 3×                           |               **0.282 s** |               **0.592 s** |

The negative value means the two-metre version pays off a little backlog it already had at the start. The route row describes time classified by the clock, not measured pathfinding CPU. It explains why that version advances slightly less game time despite finishing its admitted calculation backlog. Neither short run establishes spare capacity over a long session.

The following larger delay comes from the earlier route-limited graphical run. Its arithmetic remains valid and is preserved to explain that particular failure.

The game's clock hands elapsed real time to the world calculation in batches. While one batch is catching up, the host waits before handing it more elapsed time. The recorded trace explains the complete shortfall in that earlier 50.148-second graphical run:

| Part of the delay, expressed as real seconds at the requested 3× |        Time | Meaning                                                                                             |
| ---------------------------------------------------------------- | ----------: | --------------------------------------------------------------------------------------------------- |
| Recent elapsed time not yet handed to the clock                  | **5.348 s** | The previous clock batch is still running at the cutoff. This time is carried forward, not deleted. |
| Time intentionally excluded while preparing a route              | **0.798 s** | Current policy pauses game-time charging for this technical preparation.                            |
| Time already handed over but not yet calculated                  | **0.708 s** | The admitted calculation backlog remains unfinished.                                                |
| Total shortfall from 3×                                          | **6.853 s** | Together these explain the measured 2.590× progress.                                                |

These are breakdowns of clock lag, **not CPU tables**. An unfinished batch can finish later, so a short test alone does not establish a permanent capacity ceiling. It still shows real delay. Updating the backlog counter more often would not make the required calculations cheaper. The former route-preparation exclusions also prevent exact full-wall 3× even with spare CPU. The retained correction keeps that elapsed time owed, then catches up once the route is ready. Nine functional groups pass on both old and current implementations, including cancellation, pause, controlled suspension, save/load, changed geometry and a replaced body. The technical wait now charges hunger and deadlines, and delayed travel may happen quickly afterward. The short graphical candidate did not exercise this branch, so it establishes no isolated performance gain. A larger redesign could prepare a route while the old action continues, but it must preserve durable requests, cancellation and current body/geometry/control checks while keeping other commands available. The server’s request-receiving timeout is not a response deadline.

**A later test exposes a larger clock-accounting defect.** Two clock updates discard **4.56 seconds** because a route is pending when each update checks. Almost all that discarded interval belongs to the preceding busy world update. Three actual route requests take about **37 milliseconds** in total from dispatch through publication, including worker calculation. A third request finishes between clock checks and discards no elapsed time at all. Whether time disappears therefore depends on when the check happens, rather than how long the route calculation takes. The recording does not retain the exact instant each request first becomes pending, so those 37 milliseconds are request/publication brackets, not a complete pending-lifetime measurement. The retained clock correction prevents that loss; its short graphical candidate never exercises the route-wait branch, so no isolated speedup is established. It cannot make world calculations cheaper by itself.

### Prepare the current walking body before the first request

The route finder builds geometry for a body's actual width, height and walking limits. Previously the first request for that shape paid the construction cost. The retained change prepares one current grounded body during earlier map preparation, preferring the controlled character. Other shapes still prepare when needed, and real walking requests keep their current collision and permission checks.

| Measurement                                                           |   Before | Earlier preparation | Meaning                                                    |
| --------------------------------------------------------------------- | -------: | ------------------: | ---------------------------------------------------------- |
| First requested route, average of four alternating fresh-worker cases |   211 ms |               11 ms | Work has moved out of the first request                    |
| Initial worker preparation, same cases                                |   283 ms |              474 ms | About 191 ms is paid earlier                               |
| Real walk request to first server-confirmed position change, one pair |   353 ms |              127 ms | Actual caller improvement; not a browser-visible timestamp |
| Service creation to initial map readiness, that pair                  | 1,216 ms |            1,356 ms | Earlier preparation costs loading time                     |

**Keep this bounded first-use improvement.** It is not a total CPU reduction or proof of sustained 3×. A prepared body may never walk, a changed body may need another build, and another request can wait for a speculative build already running. The selection, real routes, cancellation, changed body/map, save/load, death/Continue, controlled failures and shutdown checks pass. Browser-visible movement remains part of the combined graphical qualification. [Detailed evidence](performance/02-native-render-and-route-trials.md#preparing-a-current-walking-body-before-its-first-route).

### Reuse unchanged rows in the nearby-object list

The retained interface change keeps every nearby object and the same buttons, order, status and quantity. When a screen update changes only something else, such as an object's position, a row with identical displayed facts can reuse its existing presentation. Clicking still resolves the current permitted object and current action-selection mode; it does not act on an old saved object.

| Qualification                     | Observed result                                                                                                                                                | Limit                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Isolated presentation checks      | Five groups pass: name/icon/status/quantity changes, removal/order, keyboard and context actions                                                               | Synthetic public display properties; not game authority or capacity               |
| Actual game checks                | Eight groups covered, including current row facts, keyboard/right-click, action selection, switching control, clearing private history, and save/load/re-entry | First seven pass together; the final save/load passes in a separate focused retry |
| Short live-update observation     | 116 initial rows become 117; only the new row needs fresh row calculations, while all 3,036 comparisons reuse unchanged rows                                   | Counts inside the candidate, not a measured baseline CPU or allocation saving     |
| Production builds and type checks | Pass for the ordinary candidate and a separate copy with measurement counters                                                                                  | Exact tested version retained after the comparisons below                         |

The functional world contains 21 people, 21 animals and 100 other objects; this is separate from the expanded mixed-travel performance scene. The first final save/load attempt returns HTTP 409, and its helper failed to retain the refusal body. Review finds missing/mismatched authority headers in that helper. The corrected focused retry reads current control authorization for the actual browser client. Saving, listing checkpoints and loading all succeed, and the restored world opens with its complete 116-row list. Original failures and lifecycle HTTP refusals remain recorded. The allocation comparison and repeat without allocation sampling below now support keeping this interface change.

The first performance comparison runs the existing list, then the candidate without the extra diagnostic counters. Both use the same retained server, original frequency for checking what moving characters notice and original clock policy, with the same resident travel, work and player-click routine. The nearby-object panel is open before both captures. Each browser measures about 45 seconds with the same 32 KiB statistical allocation sampler, including temporary objects later collected; detailed CPU and timeline sampling are off.

| First comparison, with allocation sampling               | Existing list | Reused unchanged rows |
| -------------------------------------------------------- | ------------: | --------------------: |
| Estimated temporary data created                         |      9.036 GB |              6.355 GB |
| Interface/accessibility share of that estimate           |      5.122 GB |              2.230 GB |
| Engine frame submissions per second                      |         62.36 |                 80.21 |
| Gap exceeded by only 1% of frame submissions             |      52.75 ms |              41.00 ms |
| Longest complete frame-submission gap                    |      88.50 ms |              67.10 ms |
| Slow walking replies, 95th percentile                    |        563 ms |                502 ms |
| Slowest of eleven starts from idle to displayed movement |        686 ms |              1,194 ms |
| Accepted walks / submitted walks                         |       36 / 41 |               39 / 42 |
| Actual game speed over the full server window            |        2.527× |                2.465× |
| Completed resident meal/work cycles                      |            62 |                    52 |

This estimates **29.67% less temporary data overall** and **56.47% less from interface/accessibility code**. Each allocation's own size is counted once, without adding parent totals again. These are cumulative estimates of objects created, including discarded objects; they are not memory held at once, a leak measurement or measured CPU savings. More submitted frames also do not prove that the display physically presented every one.

There are important differences. All 44 recorded panel observations on each side show it open, and camera settings, 1920×1080 canvas dimensions and device pixel ratio one match. The candidate nevertheless shows fewer listed objects on average: about 122 versus 143, with ranges 15–152 versus 0–153. The baseline briefly shows no list rows, and actual selected objects and followed player positions differ. These are bounded observations, not a continuous record of identical screen contents. The candidate also receives fewer screen updates, 608 versus 638, while making more animation callbacks, 4,827 versus 3,988. The entire allocation and frame difference therefore cannot be assigned to row reuse alone.

The server completes less work in the candidate window, despite all seventeen people surviving and every completed meal using food gathered in that resident's own work cycle. Process CPU falls 41.793→40.165 seconds while travelled distance falls 733→685 metres and completed cycles fall 62→52; that is not a demonstrated saving per unit of work. The clock also classifies the windows differently: the candidate excludes 4.556 real seconds while route preparation is pending, whereas 7.298 real seconds have not yet been handed to the baseline's world calculation at cutoff. Those clock amounts describe whole elapsed batches, not time spent calculating routes. Almost all of the candidate’s excluded time overlaps an earlier busy batch of server work; the recorded route request/reply/publication spans total only about 37 milliseconds. Exact route-creation times were not retained, so those spans do not establish the complete time a route remained pending. No browser, resident, storage or service failure or pause occurs, and both browsers close and their disposable databases and temporary directories are removed.

The repeat runs the reused-row version first, then the existing list, with allocation sampling switched off. Both keep the same server, ordinary graphics timing and panel/camera observations. It again improves short frame gaps and typical input delays:

| Repeat without allocation sampling                 | Existing list | Reused unchanged rows |
| -------------------------------------------------- | ------------: | --------------------: |
| Engine frame submissions per second                |         64.62 |                 77.03 |
| Gap exceeded by only 1% of frame submissions       |      52.25 ms |              42.50 ms |
| Longest complete frame-submission gap              |     166.10 ms |              74.30 ms |
| Slow walking replies, 95th percentile              |        747 ms |                490 ms |
| Longest walking reply                              |        784 ms |              1,025 ms |
| Slowest of seven idle-to-movement starts           |        925 ms |                651 ms |
| Accepted walks / submitted walks                   |       36 / 41 |               41 / 42 |
| Average listed objects in the bounded observations |           133 |                   147 |
| Actual game speed over the full server window      |        2.091× |                2.645× |
| Completed resident meal/work cycles                |            48 |                    64 |

Here the reused-row version shows **more objects on average** and receives more screen updates, 658 versus 562. Lighter candidate list contents therefore do not explain this repeat. Its actual paths, completed work and clock admission still differ; it travels about 787 versus 602 resident metres and spends 48.163 versus 45.290 process CPU seconds. This is more work, not a measured saving per unit of server work. All seventeen people survive, every completed meal uses food from its own cycle, and no resident, route, service or storage failure occurs. Both browsers close and their disposable databases and temporary directories are removed. Each browser records one generic HTTP403 console observation without a proven individual cause; no JavaScript error, failed request or observed pause occurs.

**Keep the row reuse.** The exact tested version preserves every entry and the current keyboard, menu, selection and privacy behavior, reduces temporary allocation materially, and improves frame gaps and input p95 in the repeat without allocation sampling. The longest reply is still worse, so this does not fix every latency tail. Root inspects both saved scenes and confirms the people, animals, structures, shadows and readable current list are present; this is not an identical-pixel or fabric-motion comparison. The copied source and production JavaScript exactly match the tested version, and the combined type checks and production build pass. No extra diagnostic counters or feature compromise are kept. Smooth sustained 3×, long-session memory, ordinary rest and aging remain open. [Exact versions, measurements and limits](performance/02-native-render-and-route-trials.md#reusing-unchanged-in-view-rows-private-functional-qualification).

### A long-session concern: the small confirmation-record shortcut is rejected

Each completed step in a character's saved plan already records what happened and which items it produced. The current engine also retains a separate command confirmation for that step. Ordinary player confirmations are moved into their durable server-owned record, but these internal confirmations stay in the live world. Adding another entry copies the growing in-memory collection, and preparing the save compares its members. Each new confirmation normally adds just one database row: this is not a claim that the database rewrites every old row.

This is a concrete growth path, **not yet a measured explanation of the earlier long freeze**. A private source candidate would remove a newly created extra confirmation after that same saved plan step records its result. It intends to preserve action history, produced-item bindings, finite resources and ordinary player retry protection. Any confirmation that existed before the step began would remain, including a conflicting prior command. Deeper source review finds that its action-history promise is incomplete.

| Situation                                                | Existing behavior                                    | Rejected private proposal                                                   |
| -------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Resume or reload the same saved plan                     | Completed steps stay completed                       | Must remain the same; explicit continuation and failed-save checks required |
| Accept a new plan that reuses an old internal step label | Can return the old duplicate/conflict result         | May perform work again while reusing or altering the earlier action record  |
| Retry an ordinary player command                         | Returns its durable result without repeating effects | Must remain the same                                                        |
| Keep finishing new plan steps                            | Extra internal confirmations accumulate              | New confirmations are folded into their owning saved steps                  |

The internal label identifies the step's action-history record as well as its command confirmation. Reusing it can therefore lose a new eating-effect record or alter the older record of a scheduled action. Old records stored outside active memory can also share that same storage identity. **Reject this small form before execution.** No runtime timing, growth improvement or retained change is claimed. A safe larger design would assign separate execution identities and preserve every action record; that rewrite is not selected before measuring the growth cost. Ordinary player retries and action history remain unchanged in the retained game.

I also examined a sixty-frame-per-second presentation limit. It would give higher-refresh displays fewer new world images and change intermediate fabric motion. The related rejected rendering trial saves little preparation and worsens response times, so no cap or new renderer trial is selected from that source audit.

### Rebuilding the state library for production: no useful gain

I tested whether development-only branches in the exact installed state library explained its cost. Both versions run the same **1,965 game seconds**, eleven ordinary player walks and sixteen completed resident work/meal cycles. This is a calculation-only standing-work test, without the database or browser; it cannot prove whole-game speed.

| Same native workload                                             | Existing library | Production-compiled library | Result                                                                |
| ---------------------------------------------------------------- | ---------------: | --------------------------: | --------------------------------------------------------------------- |
| Real elapsed calculation time                                    |          3.700 s |                     3.633 s | 1.8% lower in one ordered pair; too small to establish a useful gain. |
| Total process CPU                                                |      **5.445 s** |                 **5.567 s** | 2.2% higher.                                                          |
| CPU while advancing the world                                    |          5.183 s |                     5.290 s | 2.1% higher.                                                          |
| Final complete world, saved randomness and recorded event counts |             Same |                        Same | This narrow workload preserves outcomes.                              |

**Rejected.** No product library, build setting or dependency was changed. The result does not support treating production compilation as the missing performance solution. A CPU total can exceed elapsed time because Node also uses auxiliary threads.

Two preparation checks initially failed in the private helper: one could not resolve the copied library and another created a world before initializing collision support. Corrected import/initialization checks pass for both versions. An extra earlier baseline used fourteen walks because its old spacing was wrong; its complete report is retained but excluded from this eleven-walk pair. The experiment does not separately compare every transition's event audiences, so it is not broader semantic qualification. [Exact trial and artifacts](performance/02-native-render-and-route-trials.md#production-compiled-snapshot-library-bound).

### Skipping unused detailed edit lists: correct, but too little benefit

The shared world-update owner normally constructs detailed edit lists, including entries that some callers never use. I tried omitting them only when existing change tracking could prove the required answers. Arrays, cancelled edits, unknown representations and callers that need full details kept the original path. This added roughly 100 lines of logic and changed no intended gameplay.

The complete travel/work check matches **all 239 transitions**, including every world value, event audience and saved random value. All sixteen residents eat their actually gathered food and return to work. TypeScript, thirty direct comparison cases and ten selected existing tests pass.

| Four alternating native runs, same 2,100 game seconds         | Existing implementation |             Trial | Decision                                                       |
| ------------------------------------------------------------- | ----------------------: | ----------------: | -------------------------------------------------------------- |
| Average CPU while advancing the world                         |             **6.823 s** |       **6.763 s** | Only 0.9% less.                                                |
| Average total process CPU                                     |                 7.092 s |           7.032 s | Also less than 1% gain.                                        |
| Average real elapsed time                                     |                 4.878 s |           4.733 s | About 3% lower, without the database/browser.                  |
| Finalizations using the shortcut                              |                    None | 59 of 335 (17.6%) | Most still need the original detailed path.                    |
| Forward edit entries constructed, separate instrumented proof |                 111,833 |            95,788 | 14.3% fewer entries does not translate into a useful CPU gain. |

**Rejected and restored to the original source.** The small measured gain does not justify the extra complexity. No full-service or graphical comparison is claimed for this rejected trial.

The first complete-record comparison stopped at its 512 MiB diagnostic file bound before finishing. That failed prefix is preserved. The corrected proof compresses each complete record, within explicit limits; its 239 records match byte for byte. Those recording-heavy runs are excluded from timing. The four timing runs disable the detailed recorder and optional counters, and retain all raw results in baseline/trial/trial/baseline order. Private library-resolution and synthetic-array setup mistakes are also preserved, corrected and rerun. [Full source, checks, failures and results](performance/02-native-render-and-route-trials.md#avoiding-unused-detailed-snapshot-patches).

### Share repeated reads before predicting a character's next change

Before advancing the world, the game predicts when a character's meters or conditions could change enough to require another update. The old path repeatedly looks up the same installed meter definitions, including many meters that cannot trigger the particular check. The trial prepares the relevant definitions once for that forecast, while still reading current character values and applying the existing rules. The prepared information is discarded after the forecast; it is not a lasting copy of the world.

| Same 2,100 game seconds, four alternating calculation-only runs | Existing calculation | Shared reads | Result                                                                  |
| --------------------------------------------------------------- | -------------------: | -----------: | ----------------------------------------------------------------------- |
| Average CPU while advancing the world                           |          **5.854 s** |  **5.571 s** | **4.8% less**                                                           |
| Average real elapsed calculation time                           |              4.923 s |      4.562 s | 7.3% less; excludes database and browser work                           |
| Complete recorded updates compared in a separate proof          |                  239 |          239 | Every world value, event, event audience and saved random value matches |
| All attribute-value reads in that proof                         |              535,317 |      436,117 | About 19% fewer reads; these are work counts, not CPU measurements      |

All sixteen residents travel, finish their actual meals and return to work in the proof. Thirty direct comparison cases and thirteen selected existing checks also pass, covering changing definitions and bodies, linked health effects, limits, and restoration. The recordings and read counters are disabled in the four timing runs. This is one alternating comparison, not a complete-game or long-session result.

The first actual-server comparison keeps real PostgreSQL writes, ordinary screen updates and the same offered player-walk schedule. Both versions complete 32 real resident work/meal cycles, with every meal bound to its produced food and all seventeen people alive.

| Thirty-second complete-server pair | Existing calculation | Shared reads | Result                                         |
| ---------------------------------- | -------------------: | -----------: | ---------------------------------------------- |
| Actual game speed                  |               2.974× |       2.972× | No improvement                                 |
| Total process CPU                  |             28.732 s |     29.014 s | Slightly higher                                |
| Accepted player walks              |                   28 |           29 | One busy offer is skipped only in the baseline |

The reverse comparison then runs the trial before the original calculation:

| Thirty-second complete-server reverse pair | Existing calculation | Shared reads | Result                 |
| ------------------------------------------ | -------------------: | -----------: | ---------------------- |
| Actual game speed                          |               2.912× |       2.965× | Improves in this order |
| Total process CPU                          |             28.314 s |     24.840 s | About 12.3% lower      |
| Accepted player walks                      |                   30 |           28 | Actual work differs    |

Across both orders, average process CPU falls **28.523 → 26.927 seconds**, about **5.6%**, and average game speed rises **2.943× → 2.968×**. All four cases complete 32 resident work/meal cycles, with no failures or deaths. Actual player paths, completed resident travel and cutoff backlog differ, so this is not an identical fixed command tape. The first pair is neutral and the reverse favors the trial; neither includes a graphical browser or long-session growth. **Retained after exact source integration and combined type/build checks; combined graphical and sustained qualification remain open.** No gameplay loss is selected. [Detailed evidence](performance/02-native-render-and-route-trials.md#sharing-installed-attribute-rules-within-a-forecast).

The movement-frequency and drawing-preparation trials below are rejected after their mixed graphical results. Keeping route-preparation time owed to the clock is retained separately for correct elapsed-time accounting, with functional checks and no isolated measured speedup.

## Two-metre movement checks: a real gain with changed observations

A moving character can force repeated preparation of the world’s next step. This trial changes the bundled world’s distance-based movement/perception check from one metre to two. Other earlier deadlines still stop the calculation: this does not mean every character updates only once per two metres. It preserves action durations, finite supplies, needs and ordinary route geometry checks. Brief sight/contact during approaching or following can be missed; it is an explicit precision compromise.

The calculation-only test runs the complete current expanded opening for 2,100 game seconds with twelve fixed player walks. Every one of the sixteen residents produces and eats its own meal, then returns to work. It uses the same original state-library implementation after rejecting the shortcut above.

| Same mixed-travel workload                           | One-metre checks | Two-metre checks | Measured result                                    |
| ---------------------------------------------------- | ---------------: | ---------------: | -------------------------------------------------- |
| Average world-calculation CPU, four alternating runs |      **6.756 s** |      **5.700 s** | **15.6% less**                                     |
| Average total process CPU                            |          7.017 s |          5.958 s | 15.1% less                                         |
| Average real elapsed calculation time                |          4.707 s |          4.083 s | 13.3% less                                         |
| Movement integration updates, separate diagnostic    |              272 |              194 | 28.7% fewer                                        |
| Complete world publications, same diagnostic         |              195 |              186 | 4.6% fewer                                         |
| Recorded encounter events / new observer notes       |      320 / 2,654 |      321 / 2,647 | Actual evidence changes; no blanket memory filter. |

Four-metre checks produce the same complete world, events and transition hashes as two metres in this particular scenario: other limits already force the same smaller steps. There is no reason to select the larger compromise from this result. That equality is not a promise about other scenes.

The observed costs are specific:

- Peacock Mercenary misses six bystander notes about nearby berry gathering, eating or starting another gather. Tavin misses three notes, including cord preparation, and gains a different gathering note and a sight-loss note.
- **Mara loses her first recorded discovery of Riverside Reeds; Orin loses his first recorded discovery of Watchpost.** These are their only retained place records in the one-metre run, not redundant visits. Those places would no longer appear as known travel destinations from this evidence. One added resident gains a repeated hearth-arrival note and another gains a sight-loss note. The net change is seven fewer notes, while the recorded encounter count increases by one.
- The same matched place notice can arrive 20.046 game seconds later, about **0.111 real seconds at 3×**. A completed berry gather/meal can be 9.859 game seconds later (0.055 real seconds); starting the next cycle can shift by 15 game seconds.
- Final working positions differ by up to 0.528 metres. Health and survival match for all 57 people and animals. Food differences are floating-point rounding; Energy differs by at most 0.011 percentage points because time spent working versus idle changes.

**Not retained after the corrected graphical comparison.** The native timing gain is real for this tape, and thirteen selected existing sight, reach, pause and restore checks pass. However, the corrected graphical result at the top of this report does not establish a whole-game/input improvement, and the lost first discoveries remain a real cost. Keep the current one-metre policy. Ordinary rest, aging and the long run remain open. Complete events and observer records are preserved privately, including the changed evidence; saved randomness matches only this tested tape. Recipe knowledge, explicit knowledge pads, learned methods and current minds/goals match in this tape, but missing place knowledge and bystander evidence can affect later decisions. A previous draft called the lost place records later visits; the deeper check corrects that claim. [Technical evidence](performance/02-native-render-and-route-trials.md#coarser-sampling-with-actual-mixed-travel).

The first-discovery audit found a possible general repair: stop at a moment when the character is both inside the place’s footprint and actually able to see its landmark, then let ordinary discovery checks record what happened. Seeing the landmark from outside is not arrival under current rules. Simply inserting missing knowledge afterward would invent evidence. The complete crossing change is estimated at 130–220 logic lines and has no measured cost yet; a cheaper local return to one-metre checks could give back much of the performance gain near named places. Neither repair is implemented or selected: the corrected graphical result does not justify expanding this rejected precision trial.

## Preparing fewer images that cannot be drawn: rejected

The renderer currently prepares character poses, fabric, shadows and water even during callbacks where its existing graphics-queue limit prevents drawing. The private candidate postpones that replaceable preparation until drawing is possible. Input, current visibility/privacy clearing, camera handling and caption clocks continue. Cloth receives fewer intermediate body poses, so its motion can differ; bounded catch-up can discard fabric motion after a long gap. No world movement or collision rule changes.

| Qualification so far                                                                  | Result                                                                                                           | Decision                                                                              |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Source review, TypeScript and both production builds                                  | Pass; only the two intended scene owners differ                                                                  | Ready for browser qualification                                                       |
| First baseline with allocation sampling                                               | Completes; 57.86 draw submissions/second                                                                         | Separate instrumented baseline, not comparable to the sampler-free table above        |
| First candidate attempt                                                               | Measurement starts 0.192 seconds after the server’s unchanged 120-second startup deadline; server already closed | **Invalid performance sample**; its disconnected/static frames cannot count as a gain |
| Camera, hover, caption reading during pause/resume and clearing after control changes | Four real browser groups pass                                                                                    | Specific functional evidence, not a speed result                                      |
| Graphics-device recovery                                                              | Baseline reproduces stale-query errors; corrected baseline and candidate recover with zero graphics errors       | Profiler fix retained; all six drawing-candidate lifecycle groups now pass            |

The failed attempt and its report are preserved. Immediate coordinated launch then reaches measurement fourteen seconds after readiness and completes the valid pair below, without lengthening the deadline. The measured ready-to-navigation delay in the failed attempt includes handoff, browser launch and sign-in; those parts were not separately timed. Once the candidate application loads, its startup interval is almost identical to the baseline. The renderer candidate is rejected after the repeat below.

| Same mixed game, allocation sampler enabled on both | Existing drawing preparation | Deferred preparation | Result                                                                                    |
| --------------------------------------------------- | ---------------------------: | -------------------: | ----------------------------------------------------------------------------------------- |
| Sampled temporary data created                      |                     9.754 GB |             9.099 GB | About 6.7% less; this is cumulative allocation, not resident memory or a leak measurement |
| Temporary data attributed to shared shadows         |                       607 MB |               491 MB | About 19% less                                                                            |
| Temporary data attributed to cloth                  |                       516 MB |               507 MB | Little change; cloth still catches up                                                     |
| Drawing submissions per second                      |                        57.86 |                60.29 | Modest improvement in this pair                                                           |
| Drawing gaps, 99th percentile / longest             |                   55 / 83 ms |           51 / 69 ms | Better, still visible tails                                                               |
| Click-to-acceptance, 95th percentile                |                       418 ms |               474 ms | Worse                                                                                     |
| Idle click-to-first movement, 95th percentile       |                       613 ms |               658 ms | Worse                                                                                     |
| Actual speed / resident meal cycles                 |                  2.755× / 64 |          2.762× / 64 | Neither passes 3×                                                                         |

The candidate actually defers 1,194 callbacks and prepares 2,714. Both panels stay open with matching camera settings, but player paths and incidental selections differ; the nearby list briefly has fewer rows in the candidate. The total/interface allocation changes therefore cannot all be assigned to the drawing change. Shared-shadow attribution and direct deferred-work counts provide the strongest targeted evidence.

The repeat runs the candidate first, then the baseline, with allocation sampling disabled for both. Both use the corrected graphics profiler. All seventeen people survive and the server reports no resident or storage failures.

| Same mixed game, repeat without allocation sampling | Existing drawing preparation | Deferred preparation | Result                                                     |
| --------------------------------------------------- | ---------------------------: | -------------------: | ---------------------------------------------------------- |
| Actual game speed                                   |                   **2.708×** |           **2.521×** | Worse                                                      |
| Drawing submissions per second                      |                        68.58 |                63.22 | Worse                                                      |
| Drawing gaps, 99th percentile / longest             |                   47 / 97 ms |           52 / 68 ms | Typical slow tail worsens; single maximum improves         |
| Click-to-acceptance, 95th percentile                |                       458 ms |               624 ms | Worse                                                      |
| Idle click-to-first movement, 95th percentile       |                       614 ms |               795 ms | Worse; thirteen starts in each run                         |
| Resident work/meal cycles completed                 |                           64 |                   60 | Less completed work                                        |
| Time spent preparing the scene                      |                      8.531 s |              7.933 s | About 7% less preparation does not produce an overall gain |

Both panels remain open at the same camera settings, drawing size and pixel ratio. Actual player paths and visible rows differ, so this is not identical simulation work or a pixel-by-pixel image comparison. The candidate completes less game progress, and one resident approach remains unfinished at the cutoff. **Reject the drawing change.** The modest preparation savings do not justify changing cloth motion and intermediate body poses without a consistent frame or input benefit.

The recovery failure comes from querying GPU objects from an old context. WebGL resources created before context loss are invalid afterward; [the browser documentation explains this rule](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event). The baseline reproduces that exact defect, and the profiler-only correction is retained.

| Actual baseline graphics loss and recovery                |                                   Before |            After the profiler fix |
| --------------------------------------------------------- | ---------------------------------------: | --------------------------------: |
| Old timing handles outstanding at loss                    |                                        2 |                                 2 |
| Stale timing-query polls during the next two seconds      |                                      220 |                             **0** |
| Graphics error after recovery                             |                                     1282 |                             **0** |
| Correctly discarded invalid timing handles                |                              Not handled |                             **2** |
| Fresh timing queries, GPU measurements and actual drawing | Drawing resumes, but queries are invalid | **All resume with valid queries** |

This repairs optional measurements and changes no game rule or drawing quality. All six drawing-candidate lifecycle groups pass, including actual graphics recovery and page reload. The reload check initially expects one status overlay, but the unchanged game intentionally has two different owners. That failed helper attempt is preserved; the corrected check requires exactly one of each owner’s overlay before and after reload, plus one canvas and one speech layer. It does not accept arbitrary duplicates or diagnose a leak from a shared CSS class. Two HTTP 403 observations around entry/control changes remain recorded, so this is not a claim of network cleanliness. **Keep only this profiler repair; reject the drawing-preparation change independently.**

## What the results mean

**We have not achieved the requested performance.** The most recent completed 30-minute crowded test from the first investigation ran at **0.091× normal game speed**, despite selecting 3×. That means roughly eleven real seconds passed for each normal-speed second of game progress. The target is about **33 times faster than that result**. Selecting 3× in Settings does not prove the game is advancing at 3×.

In thirty real minutes, that failed run advanced only **2 hours 43 minutes inside the world**, instead of the **90 game hours** requested at 3×.

OpenLegend's normal clock advances 60 game seconds per real second. The requested 3× clock must advance 180. We measure the time the world actually advances, divided by real elapsed time, then divide by 60. Pauses, waiting and unfinished work remain visible; we do not remove them to manufacture a passing result.

This report is the plain-language account of the investigation. The older [technical evidence](three-times-scene-performance.md) preserves exact sources, clocks, profiles and detailed checks. The [maintainer tracker](../maintainers/performance.md#october-15-continued-3-experiments) records each trial before it starts. A small calculation becoming faster is useful evidence, but it is not a whole-game performance result.

## The game as a whole: completed measurements

These are different diagnostic runs, **not before-and-after comparisons**. They show the problem persists across several measurements.

| Test                                                                     | Requested speed | Actual speed | What the player experienced                                                                                                                | Result                                                 |
| ------------------------------------------------------------------------ | --------------: | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Earlier 30-second server test                                            |              3× |       0.921× | Saving sometimes took over a second                                                                                                        | Failed                                                 |
| Current-owner 60-second server CPU capture, before the October 15 update |              3× |       0.197× | 51 accepted walks; all residents continued their standing work                                                                             | Failed                                                 |
| 30-minute crowded browser test                                           |              3× |  **0.0907×** | Average 73.5 frames/second, but a **55.7-second** gap between frame callbacks                                                              | Failed badly                                           |
| 12-minute crowded browser test with a CPU sampler                        |              3× |      0.0783× | Three gaps of about 12, 14 and 19 seconds; repeated garbage collection during those gaps                                                   | Failed; diagnostic overhead present                    |
| 45-second allocation diagnostic                                          |              3× |       0.298× | 36 accepted walks; no long pause in this short window                                                                                      | Failed; too short to assess long stalls                |
| Fresh baseline after integrating October 15 game changes                 |              3× |   **0.229×** | 18 accepted walks; longest callback gap 67.5 ms. One resident decision record refused after five seconds waiting to enter the write queue. | Failed; 30.122 real seconds, 414 game seconds advanced |

The crowded long test contained **17 people including the player, 40 animals and 133 other world objects**, including the added buildings and finite resource patches. All sixteen other people performed repeated gathering, preparation, crafting and eating. Across the 30-minute test they finished **861 five-action cycles**, with the food they ate tied to their actual gathered output. The player attempted 1,382 walks; 1,224 were accepted. Those are actual completed activities, not just extra characters standing in a scene.

There is an important limitation: the long test put each resident's resources within reach, so those residents did not need to travel. It also advanced too little game time to prove sustained ordinary sleep and survival at 3×. A final pass must include travel and enough game time for normal rest; the standing-work test alone cannot satisfy the request.

Average frame rate hides severe freezes. In the 30-minute run, 95% of frame callbacks arrived within 27.8 milliseconds, but the longest gap lasted 55.7 seconds. Walking requests also waited: the slowest 5% took over **4.1 seconds** just to return an accepted/refused answer. A smooth average alongside those delays is a failure.

The latest renderer can receive a callback without actually drawing a frame. The fresh baseline delivered 106.76 browser callbacks per second; that is **not a claim of 106.76 displayed frames per second**. Actual drawing is now counted separately. The later matched cape comparison below records about 60–63 draw submissions per second, despite about 87–89 browser callbacks per second. Neither counter proves physical display delivery. The short test completed 14 resident work cycles after selecting 28 plans. Its reports are private `/private/tmp/ol-pf59-{server,client}-a.json`; it used production bundle `index-CEkl0K8x.js` and a complete newly saved expanded opening. The refused write was queue admission, not evidence of five seconds executing SQL. Shutdown separately reported database-unavailable errors after the measured report was constructed; these remain a cleanup failure to diagnose, rather than a storage pause during measurement.

## What preparing screen updates costs: matched server comparison

These tests use the same current server source, real PostgreSQL writes, sixteen working residents and the same repeating half-metre player-walk choices offered once per real second. A busy request can skip the next offer, so completed activity differs when a version is faster. None uses a graphical browser, and none is a finished-game pass.

| 30-second server case                            | Actual speed | Completed resident cycles | Accepted walks | Outcome                                                                                         |
| ------------------------------------------------ | -----------: | ------------------------: | -------------: | ----------------------------------------------------------------------------------------------- |
| Ordinary recurring screen updates for one viewer |   **0.446×** |                        61 |             29 | No errors/refusals; still slow                                                                  |
| No recurring screen-update preparation           |   **0.650×** |                        96 |             29 | About **46% more progress**; still far below 3×                                                 |
| Explicit small-interval clock pump               |       0.555× |                        80 |             29 | Diagnostic only: also changes background-admission frequency and omits host autosave scheduling |

Removing all recurring screen preparation is an optimistic limit, not a proposed finished game. It confirms that screen preparation matters, but cannot solve the remaining slowdown alone. The explicit pump performs 1,683 background maintenance scans versus 51 in the no-view case; that makes it unsuitable as a clean comparison of the clock alone. No clock redesign is selected from it.

World-changing operations take turns in one queue so a walk, a character decision and a save cannot overwrite one another. The ordinary-viewer trace shows that queue occupied for about **29.07 of 30.18 seconds**: about 12.29 seconds advancing the world, 11.11 admitting resident plans, and 5.67 handling other authorized commands/control. Those are disjoint queue-operation categories; their internal database and screen-preparation spans overlap them. The next analysis separates those internal spans rather than adding them together.

One world-advance call began at 7.909 seconds and was still catching up at the measurement cutoff. Only 7.893 real seconds had reached outer clock admission, with 612.95 game seconds already owed. The rest of the wall time had not yet been offered to that call. This is backlog, not proof that those seconds were discarded or spent calculating paths.

Reports: private `/private/tmp/ol-pf59-{viewer,no-view,pump}-b.json`, exact runtime-source fingerprint `595ef132…46de`. All three exited normally and closed their owned resources. They are distinct from the earlier real-browser baseline, whose longer ground-selected walks and renderer load are different.

## Fresh native-only comparisons: match the player's input rate

A native-only test runs the real world calculations without the server's database and screen-update work. These measurements use the complete new expanded starting world and genuine finite resident plans; they cannot qualify the finished game.

| Same 300 game seconds                                                   |           Player walks | Resident activity                                                       | Real elapsed | Meaning                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ---------------------: | ----------------------------------------------------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| High-input diagnostic                                                   |                     66 | 16 completed five-action cycles; all alive                              |      3.226 s | About 1.55× normal speed. Far more walks per game minute than the intended 3× test.                                                                                      |
| Input rate matched to intended 3×                                       |                      2 | 16 completed five-action cycles; all alive                              |  **1.457 s** | Native-only speed about **3.43×**. The 3× budget is 1.667 s, leaving narrow headroom before database/browser work.                                                       |
| Partially remove need updates, while leaving their old deadlines active | Not a valid comparison | Advanced only 0.003 game seconds before the 3,000-call guard stopped it |     38.917 s | Failed diagnostic. The scheduler repeatedly reached a need deadline whose update had been removed. Disabled mechanics were internally incomplete; this is not a speedup. |
| Remove need updates and their dependent deadlines together              |                      2 | Same 16 cycles; all alive                                               |  **1.183 s** | 18.8% less wall time, 25.7% less native CPU. Deliberately invalid physiology; an optimistic bound, not a production change.                                              |

The high-input result overlapped a disclosed TypeScript check and is not used as a controlled capacity comparison.

The matched-input native test needed 29 finished world updates and 34 smaller movement updates, versus 92 finished world updates and 93 movement updates in the high-input test. Frequent new walking requests increase repeated preparation. A slow full game also receives more real-time clicks during each game minute, which can compound its overload. This observation motivates fixing the full server path; it does not justify ignoring player inputs.

Completely removing needs saved only 0.274 seconds of wall time in this pair. Even that impossible best case cannot explain the whole server slowdown. A large rewrite of physiology is therefore lower priority than the server and screen-update comparisons.

The matched run still changed 2,146 character-condition records, 2,146 work-accounting records and 2,226 meter records. It prepared zero periodic damage operations in this short healthy opening, so the newly integrated five-minute starvation/exhaustion damage is not the startup bottleneck. Process CPU was 2.421 s, including worker/process activity; the wall-time result remains the native throughput observation.

## Earlier bottleneck recording, before the current menu change

The current ranking is near the top of this report. This earlier recording preserves the evidence that led to the menu and cape experiments; it does not describe their remaining costs today.

| Where work happens                         | What the computer repeatedly does                                                                         | Evidence                                                                                | What this tells us                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server: living world                       | Advances actions, needs, physical interactions and what people notice                                     | 14.505 sampled seconds in a 60.558-second capture; about 38% of sampled non-idle time   | This is the largest server owner measured in that run. We need fewer repeated whole-world calculations or cheaper complete updates.                                                                                                                                                           |
| Server: preparing screen updates           | Builds visible people, possessions, descriptions and available actions                                    | 11.570 sampled seconds; about 30% of sampled non-idle time                              | Preparing information can cost almost as much as running the world. Action checks account for 6.179 seconds **inside** this total.                                                                                                                                                            |
| Browser: cape physics                      | Calculates cape particle positions and body contact every frame                                           | About **3.145 GB**, or 36%, of statistically sampled temporary allocation in 45 seconds | Cape calculations are the largest identified source of allocation in that sample. The retained numeric-storage change subsequently reduced this owner's allocation by about 85% in a fresh browser pair; see the comparison below.                                                            |
| Browser: UI and accessibility              | Rebuilds interface data and accessibility descriptions                                                    | About **1.846 GB**, or 21%, of sampled allocation                                       | This is another large source. The sample does not prove a retained-memory leak.                                                                                                                                                                                                               |
| Browser: graphics engine                   | Prepares rendering data, including bounding boxes                                                         | About **1.630 GB**, or 19%, of sampled allocation                                       | We must distinguish necessary drawing from repeated preparation.                                                                                                                                                                                                                              |
| Browser: application shadow updates        | Rebuilds and uploads shadow-instance data                                                                 | About **659 MB**, or 8%, of sampled allocation                                          | Reusing unchanged GPU data helped one part; allocation during preparation remains.                                                                                                                                                                                                            |
| Server: waiting and discarded elapsed time | Waits for queued work, persistence and route preparation; some elapsed input never becomes world progress | The old counters do not reliably separate all these intervals                           | This can amplify CPU costs. New stage clocks now separate these intervals. In a later no-view run, over 90% of sampled time inside required-save database waits is idle on the server main thread; one real database write is now measured below, while larger/older writes remain unbounded. |

The browser allocation numbers estimate **all objects created during the sample, including objects later collected**. They are not the amount of memory held at once. The sampled total was 8.720 GB. The table groups the complete allocation stacks without adding a parent and its children twice.

The server times are sampled elapsed intervals attributed to active functions, not exact independent process CPU counters. Nested times overlap. For example, the 6.179 seconds of action checking are part of the 11.570-second screen-update total and must not be added again.

## Changes that measurably helped a particular operation

These are matched before-and-after comparisons. None establishes that the full game now runs at 3×.

| What changed, in ordinary terms                                                                    |                                                          Before |                                               After | Scope and tradeoff                                                                                          |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------: | --------------------------------------------------: | ----------------------------------------------------------------------------------------------------------- |
| Check whether coaching is allowed without producing effects that the menu immediately throws away  |                                       1,155 ms for 1,000 checks |                                             54.4 ms | About 95% less time in this isolated check. Actual execution and refusal checks remain.                     |
| Check whether a temporary character condition can start without executing a discarded full attempt |                                         860 ms for 1,000 checks |                                              131 ms | About 85% less time. Cases needing complete execution still use it.                                         |
| Preview equipment changes without producing discarded evidence                                     |                                       1,032 ms for 1,000 checks |                                              448 ms | About 57% less time. Physical fit, records and admission remain checked.                                    |
| Send independent database writes together inside the same atomic save                              |                   113 database round trips across three commits | 32, then 31 after the retained-history count change | Same committed rows and rollback behavior; commands still wait for required durability.                     |
| Same database comparison with 25 ms added per round trip                                           |                                                 Median 4,580 ms |                                            1,331 ms | About 71% less time in the controlled three-commit comparison. This does not establish ordinary game speed. |
| Same comparison with 100 ms added per round trip                                                   |                                                Median 14,214 ms |                                            3,820 ms | About 73% less time under deliberately slow database transport.                                             |
| Reuse unchanged short sighting calculations                                                        |                                         21,442 prediction pairs |                                               7,941 | About 11–16% less native CPU in the controlled comparison. Sight rules were preserved.                      |
| Find changed objects directly instead of repeatedly recapturing every sensory source               |                                                 12,520 captures |                                                 640 | Final matched native CPU improved 2.8%; elapsed time remained noisy.                                        |
| Read unchanged body/condition values without unnecessary editable wrappers                         |                                   346,667 internal draft visits |                                             325,339 | Native CPU improved 2.0–6.9% in bracketing comparisons. No meter rule changed.                              |
| Complete that read-only path through body, capability and work checks                              |                                   325,339 internal draft visits |                                             300,756 | First CPU pair improved 2.2%; later timing was too noisy for a reliable larger claim.                       |
| Reject physically impossible sight/contact pieces before preparing exact geometry                  |             11,520 geometry preparations in the direct specimen |                                               3,092 | Native CPU improved 3.2–8.4% in busy comparisons. Same exact results in checked cases.                      |
| Avoid temporary vectors during sight-ray projection                                                |                                     1.565 GB sampled allocation |                                            1.365 GB | About 12.8% less temporary allocation; no demonstrated CPU improvement.                                     |
| Prepare fixed cape connections once rather than every step                                         |                                 2.4413 ms CPU per measured step |                                           2.1547 ms | About 11.7% less isolated cape CPU. Particle motion stayed exact in the checked sequence.                   |
| Do not re-upload unchanged shadow data                                                             |                                   95 publications; 59,304 bytes |                       34 publications; 22,344 bytes | About 5.35% less CPU while stationary; moving performance was neutral.                                      |
| Renew the foreground player's presence independently of an unrelated held save                     | Three 5-second renewal failures during a deliberately held save |                 About 16, 12 and 8 ms; all accepted | Prevents that particular false-away pause. It cannot renew presence while the browser sends nothing.        |
| Finish three durable character-decision records without fetching their payloads again              |                                         18 database round trips |                                                  15 | Same durable outcomes; modest request reduction.                                                            |

Other retained work removes a repeated authority read, avoids unchanged narration-banner preparation, retrieves personal history only while its panel is visible, prepares the finite set of first-use shaders during loading, and fixes speech-volume and successful save-load behavior found by real interaction checks. These have specific evidence in the detailed report; they are not presented as measured whole-game speedups.

## Ideas that failed, were rejected, or remain unproved

| Idea                                                                               | What we found                                                                                                                                                | Decision and consequence                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse an entire unchanged body-rule forecast while people walk                     | The busy trace reused zero forecasts because actual work and movement kept changing the dependencies                                                         | Removed. No cache is retained for an unmeasured gain.                                                                                                    |
| Replace a small meter record in one operation                                      | Results matched, but CPU did not consistently improve; sampled allocation fell only about 0.7%                                                               | Reverted. More code or changed object identity was not justified.                                                                                        |
| Group native publications inside an existing 8 ms responsiveness allowance         | In that earlier measurement, active native calls already took at least about 29 ms after other work                                                          | Not implemented. That grouping could not help the observed calls within the allowance.                                                                   |
| Add another cache for static obstacle geometry                                     | Existing geometry preparation was already shared and below 0.2% of sampled allocation                                                                        | Rejected as the wrong target.                                                                                                                            |
| Bypass nested command finalization                                                 | The earlier nested finalization share was about 4.3%; the current profile again puts ordinary outer advancement first. Refused attempts still need isolation | Not bypassed. It is not the dominant measured cost.                                                                                                      |
| Batch already queued resident decisions                                            | The current driver submits and awaits each durable decision sequentially; there is no existing queued burst to combine                                       | No trial. A correct complete coordinator would be a larger architectural change.                                                                         |
| Skip the final event while previewing eating                                       | The event also checks remaining identities and output limits; skipping it could advertise an action that actual execution refuses                            | Rejected during source review, before timing.                                                                                                            |
| Disable browser peripheral blur                                                    | Alternating comparisons did not demonstrate a useful improvement                                                                                             | No performance claim or retained removal.                                                                                                                |
| Blame route calculation for the whole navigation-wait counter                      | Completed worker calculations were much shorter than the broad counter, which includes other elapsed input                                                   | Not supported. Queue entry, request discovery and publication need separate clocks.                                                                      |
| Blame a database-wide outage for the 55.7-second browser gap                       | An independent process completed 55 trivial database queries during that exact gap, median 1.627 ms                                                          | Not supported for that interval. The browser's older freeze still has no proven individual cause.                                                        |
| Identify browser CPU from a short malformed sample clock                           | 2,829 negative time deltas made weighted attribution invalid                                                                                                 | Discarded the weighted ranking; corrected the analysis tool to reject invalid clocks.                                                                    |
| Conclude that rising heap/DOM/listener counts prove a leak                         | Playing and profiling both changed the page; endpoint counts do not identify retained owners                                                                 | Leak remains unproved. A separate retention experiment is tracked.                                                                                       |
| Make meter values lazy while preserving every old floating-point step and revision | Complete equivalence would require substantially more shared accounting than a small local shortcut                                                          | No runtime change attempted. The new authorization permits a simpler periodic gameplay rule, which needs separate measurement.                           |
| Prepare full action lists only when opened                                         | The old live lists also fed quick actions, pinned choices, equipment targeting and other panels                                                              | Implemented across all consumers; the corrected graphical pair improves 2.148× → 2.983×. See the menu section for removed shortcuts and remaining gates. |

## Current trials and their gameplay costs

Each row starts as a proposal. Results replace “pending” only after the trial actually runs.

| Trial                                                                | Before                                                         | After                                                                                                                     | Proposed compromise                                                                                                                                                                                                                                     | Current disposition                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Separate server queue, calculation, save and screen-preparation time | Broad overlapping totals                                       | Queue occupied about 29/30 seconds; resident admission dominated by full synchronous saves                                | None; diagnostic only                                                                                                                                                                                                                                   | Completed PF16.59; full-game target still fails                              |
| Store cape coordinates in reusable packed numeric arrays             | Large cape allocation                                          | Isolated CPU −25.6%; actual-browser cape allocation −84.6%, total allocation −16.7%                                       | No tested cloth-motion or appearance loss                                                                                                                                                                                                               | Retained PF16.60; frame tails remain mixed and the full-game target fails    |
| Measure a world with routine need calculations removed               | 1.457 s / 300 game seconds                                     | 1.183 s with invalid physiology                                                                                           | Deliberately invalid diagnostic                                                                                                                                                                                                                         | PF16.61 complete; large rewrite deprioritized                                |
| If justified, update needs once per game minute                      | Food and energy repeatedly change during fine simulation steps | Pending                                                                                                                   | Meters and their threshold notices can be up to one game minute late. A simple constant awake drain would make idle characters tire three times faster; busy-character cost stays the same. Immediate eating/injury and five-minute need damage remain. | Candidate only; no balance change selected or implemented                    |
| Prepare complete action menus when someone asks for them             | Many offers are recalculated for ordinary screen updates       | Browser interactions pass; corrected mixed graphical speed 2.148× → 2.983×                                                | Automatic suggestions, three saved action shortcuts and their number keys are removed; recipe/equipment choices require opening a menu; T checks the clicked target before acting.                                                                      | Retained after interaction/control checks; sustained acceptance remains open |
| Calculate physical/sensory changes less frequently                   | 2.243 s native CPU / 300 game seconds                          | 4/16 m sampling: 2.097/2.113 s; no encounter recording: 1.929 s                                                           | Coarser motion/observation or omitted encounters                                                                                                                                                                                                        | PF16.63 diagnostic only; modest gain does not justify losing precision here  |
| Prepare fixed attribute rules once per world forecast                | Repeated reads of rules and unrelated character values         | All 239 updates match; calculation CPU falls 4.8%; four short complete-server cases average 5.6% less CPU, with variation | No intended game change; current values and body-dependent ranges remain live                                                                                                                                                                           | Retained; combined and sustained qualification pending                       |
| Prepare one existing walking shape during map loading                | First use builds its walking mesh in about 235–245 ms          | Exact routes and lifecycle checks pass; real request to first server-confirmed movement 353 → 127 ms in one pair          | About 190 ms of work moves earlier, including when that shape never walks; other shapes stay lazy                                                                                                                                                       | Retained for first-use latency; no sustained or net CPU guarantee            |

### First packed-cape result

| Same actual cape motion and reset sequence       |               Before |             Packed coordinates | Result                                                                |
| ------------------------------------------------ | -------------------: | -----------------------------: | --------------------------------------------------------------------- |
| CPU per cape step, eight alternating runs        |             1.667 ms |                   **1.461 ms** | 12.33% less CPU                                                       |
| Elapsed time per cape step                       |             1.782 ms |                   **1.533 ms** | 14.00% less elapsed time in the controlled comparison                 |
| Exact particle and visible mesh comparisons      |            Reference | 601 matched states / 988 steps | All values matched, including pause, reset and visibility transitions |
| Collected temporary data in four matched samples |     1.617 / 1.623 GB |           **1.860 / 1.855 GB** | About **14.7% more allocation: failed version**, despite lower CPU    |
| Actual browser comparison                        | Old browser evidence |       Not run for this version | No whole-game or long-freeze improvement claim                        |

This candidate changes how the cape's numbers are stored and reused. It preserves the same cloth rules and visible mesh in the checked sequence; there is no selected visual compromise. The allocation result makes this version unsuitable for retention despite its CPU improvement. Its raw profiles are preserved. The subsequent refinement below fixes that allocation regression.

### Refined packed cape: isolated gates now pass

| Same actual cape and 7,904 measured steps per version |                  Before |              Refined candidate | Result                                                                                |
| ----------------------------------------------------- | ----------------------: | -----------------------------: | ------------------------------------------------------------------------------------- |
| CPU per step, eight alternating runs                  |                1.649 ms |                   **1.227 ms** | **25.63% less CPU**                                                                   |
| Elapsed time per step                                 |                1.685 ms |                   **1.289 ms** | 23.46% less elapsed time                                                              |
| Cloth allocation, four collected-object samples       |        1.608 / 1.609 GB |           **215.3 / 214.5 MB** | **86.64% less sampled cloth allocation**                                              |
| Total allocation in that controlled specimen          |        1.699 / 1.693 GB |               301.0 / 297.2 MB | Large measured reduction; still an isolated specimen                                  |
| Exact motion, mesh and lifecycle                      |               Reference | 601 matched states / 988 steps | All checked values match                                                              |
| Real-browser allocation                               | 2.037 GB from cape code |                   **0.314 GB** | **84.59% less** in the fresh browser pair below; long-session acceptance remains open |

The first packed version performed poorly because its hot numeric reads still passed through a generic checked helper. The refinement reads already-validated fixed coordinate indices directly. This is a measured difference between those source variants, not proof of a browser leak or a universal claim about JavaScript number storage. The complete record includes the failed version above so the favorable result is not presented alone.

### Packed cape in the actual crowded browser

Both versions run the same current server source and all sixteen residents doing their ordinary five-action work cycle. Each browser is sampled for about 45 seconds. These are fresh sessions with different completed work and player paths, so the frame results are observations rather than proof that every frame improved.

| What the running browser did              | Old cape |  Packed cape | Result                                                           |
| ----------------------------------------- | -------: | -----------: | ---------------------------------------------------------------- |
| Temporary data attributed to cape physics | 2.037 GB | **0.314 GB** | **84.59% less**                                                  |
| All sampled temporary data                | 9.231 GB | **7.686 GB** | **16.74% less**                                                  |
| Actual draw submissions per second        |    63.30 |        59.62 | Does not show a frame-rate gain                                  |
| Slowest 1% of draw intervals begin above  |  53.5 ms |     61.75 ms | Worse in this pair                                               |
| Longest observed draw interval            | 195.5 ms |      99.2 ms | Better in this short pair; no long-session proof                 |
| Actual game speed                         |   0.442× |       0.365× | Both fail 3×; different work prevents a causal server comparison |

The change keeps the same cloth calculations and checked motion. It is retained for the large, repeated reduction in temporary data and isolated CPU cost. It does **not** establish that the old long freezes are fixed. Both screenshots retain people, animals, buildings, foliage and shadows; neither browser reports a JavaScript or network failure.

After this change, interface rendering and accessibility code account for **3.787 GB, about 49%**, of sampled allocation. That identifies the next broad owner, but does not prove that floating captions cause it. The subsequent unopened-panel trial built controls only when needed, but its actual-browser allocation and frame gate failed; that change was removed. The failed trial kept retained conversations and drafts mounted and would reset unretained panel scroll/drag positions on close. That lifecycle change was removed with the candidate.

## Complete trial ledger from the first six hours

This table makes the earlier register readable without requiring knowledge of the implementation. IDs are pointers to the [full technical register](../maintainers/performance.md#october-14-expanded-3-investigation), not separate performance claims. Related attempts are grouped when they tested one question.

| Trial IDs             | Question tested                                                                    | Outcome                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 2, 4               | How slow is the real game, and can we measure actual frames, progress and walking? | Confirmed severe failures. Added actual progress, callback-entry frame clocks, movement-start conditions and bounded failure reports. Final target remains open.                |
| 3, 38                 | Are material/obstacle preparation or a missing geometry cache dominant?            | Source/allocation evidence did not justify another cache.                                                                                                                       |
| 5, 10                 | Does browser composition or blocked foreground reporting explain stalls?           | Blur removal was neutral; held saves reproduced foreground-renewal failures.                                                                                                    |
| 6, 25, 36             | Can repeated body/condition reads share existing owners?                           | Retained measured reductions without changing gameplay rules.                                                                                                                   |
| 7, 19                 | Can the same complete save use fewer database requests?                            | Retained bounded grouped writes and the retained-history count change; exact rows and failure behavior checked.                                                                 |
| 8, 12, 34             | Can menus check complete permission without producing discarded effects?           | Retained coaching, temporary-condition and equipment improvements with their fallbacks.                                                                                         |
| 9, 11, 17, 20, 32, 39 | Can sight/motion calculation reuse work or reject impossible cases earlier?        | Retained scoped sight/ray/bounds improvements; whole body-rule forecast cache failed and was removed.                                                                           |
| 13                    | Can interaction shader stalls happen during loading instead?                       | Retained finite preparation. It does not solve later CPU/collection freezes.                                                                                                    |
| 14                    | Are request permission reads duplicated?                                           | Reduced three fresh reads to two; authority remains current.                                                                                                                    |
| 15                    | Can native publications share the present 8 ms allowance?                          | Measured calls already exceed it; not implemented.                                                                                                                              |
| 16                    | Do recall queries and database planning contribute?                                | Recorded query behavior and statistics limits; no unsupported index or full-game speed claim.                                                                                   |
| 18                    | Do unchanged narration banners need rebuilding?                                    | Retained revision-based reuse after actual changes.                                                                                                                             |
| 21, 30                | Do the extra residents actually work, eat and survive?                             | Added finite five-action plans and all-sixteen standing-work/survival instrumentation. Actual cycles and output consumption verified; travel/rest capacity remains unqualified. |
| 22                    | Is personal-history text being fetched even while unread?                          | Moved it to visible-only paged reading; chronological history replaces the old importance-ranked fallback.                                                                      |
| 23, 31                | Can meter publication be made cheaper without changing its old results?            | Complete lazy representation audited only; small replacement trial reverted for no consistent CPU benefit.                                                                      |
| 24                    | Can sensory preparation identify changed objects without recapturing all of them?  | Retained direct changed-object handling with conservative fallback.                                                                                                             |
| 26, 41                | What currently dominates server work and repeated screen preparation?              | Ranked native calculation and screen preparation first. Existing memoization/scheduling does not remove the remaining cost.                                                     |
| 27, 28                | Can decision completion or memory-metadata writes share requests?                  | Decision completion retained; cross-family memory batching remains an unattempted candidate.                                                                                    |
| 29, 37                | Do real speech and Save/Load interactions still work?                              | Fixed ordinary volume admission and the successful-load reload. October 15 integration preserves new checkpoint recovery.                                                       |
| 33, 44                | Can fixed cape data and unchanged shadow uploads be reused?                        | Retained modest measured owner improvements. Large remaining allocation led to the new packed-cape trial.                                                                       |
| 35                    | Can equal memory IDs from different source types be confused?                      | Fixed the selected-memory check to include source type. Broader identity work remains separately tracked.                                                                       |
| 40                    | Can a held unrelated save make an active player appear absent?                     | Fixed the fresh-authorized foreground renewal path. A browser sending no heartbeat still cannot renew.                                                                          |
| 45, 46                | Are nested commands or queued-publication batching the next major target?          | Nested finalization is secondary; existing driver has no already-queued burst. No bypass retained.                                                                              |
| 47, 53                | Are broad database/navigation waits being attributed accurately?                   | Independent database probe refuted one outage theory; route-wait clocks need finer stage accounting.                                                                            |
| 48, 50                | Can eating previews or full action lists simply be skipped?                        | Eating shortcut rejected for incomplete admission. Full action deferral needs all consumers changed together.                                                                   |
| 49, 51, 54            | What runs during browser freezes, and are the samples trustworthy?                 | Rejected invalid short CPU timing; valid longer capture correlated three major gaps with garbage collection.                                                                    |
| 52, 55                | Can failures or capture-edge gaps be hidden by the profiler?                       | Added bounded maintenance/SQL rejection details. Pending long-task observer delivery at capture edges remains a tracked gap.                                                    |
| 56, 57, 58            | Who creates temporary browser data, and is it retained?                            | Measured allocation supply, with cape physics largest. Retained-memory ownership and the allocation reduction trial were not completed before the old cutoff.                   |

## Saving residents' next plans is a major bottleneck

In the no-view server test, there were **112 resident-plan commits and 29 player-command commits**, plus one Resume. Admitting residents' plans held the world-change queue for **13.97 seconds**; **13.02 seconds** of those holds overlapped the required complete-world saves. The two extra decision-job writes per plan took another 2.76 seconds of client-observed database-wrapper time outside that queue. None of these numbers proves time executing inside PostgreSQL.

A commit atomically saves the current world and the required outcome records. The whole no-view queue was busy for 29.764 of 30.169 seconds. Its nonoverlapping measured partition was 13.746 seconds of commits with database awaits outstanding, 1.803 of other commit work, 7.628 of native calculation without a database await, 2.297 of native/database-await overlap, 0.991 of other database waits, and 3.298 unclassified. The unclassified part includes native calls below the trace's one-millisecond capture threshold and finalization, so it is not assigned an invented cause.

The completed longer-commitment trial used the existing activity system to select **eight five-action cycles at once**, rather than selecting the same five actions again after every cycle. Forty individual actions fit its existing 64-node activity limit; the separate eight-step direct-plan limit is unchanged. Eating must use that cycle's actual gathered food. Normal action admission and interruption remain required, and the real durable decision record and save still happen for each selection.

Its tested compromise was **longer commitment before reconsidering**. The test driver's rest/replanning choice would occur once per eight cycles, potentially seven cycles later than before. Ordinary need responses still run before subsequent native steps. This is a candidate, not a claim that current live characters already choose longer routines. A legitimate world-owned selectable activity is required if the diagnostic gain justifies integrating it.

### Longer commitments: fewer saves, little speed improvement

| Matched current-source server test, no recurring screen updates | Five-action selections | Eight-cycle commitments | Result                                                                                    |
| --------------------------------------------------------------- | ---------------------: | ----------------------: | ----------------------------------------------------------------------------------------- |
| Actual game speed                                               |             **0.615×** |              **0.657×** | Only 6.9% more progress in one pair; still far below 3×                                   |
| Resident selections                                             |                     99 |                      16 | Far fewer new decisions                                                                   |
| Complete-world commits, including player commands/control       |                    130 |                      46 | Far fewer commits, but saving remains costly                                              |
| Actual completed five-action cycles                             |                     83 |                      96 | Everyone works; partially completed commitments are not counted as eight completed cycles |
| Meals checked against actual gathered output                    |          83 / 83 match |           96 / 96 match | Correct output consumption                                                                |
| Total measured real time                                        |               30.099 s |                30.670 s | Setup is separate; real measurement/drain differences remain disclosed                    |

A separate eight-cycle test with ordinary recurring screen updates reached only **0.394×**, with 51 verified cycles and 27 accepted walks. That is not an exact same-source viewer before/after pair, but it supplies no evidence that the complete game benefits enough to justify a new gameplay feature.

**Production integration is not selected.** The optional diagnostic remains reproducible, but current characters have not been changed to commit to longer routines. The trial preserved its proposed reconsideration/rest tradeoff above and proved its native behavior, then failed the material-performance decision gate.

Fewer, larger saves still spend substantial time checking which changed experience records can be used for recall. In the candidate, 82 such calls total 6.177 seconds of client-observed wait; the reference has 133 calls totaling 3.859 seconds. These overlapping waits are not PostgreSQL execution measurements. The exact query and database execution plan will be captured before changing it. A commit with 941 statements took 629 ms; the largest two-second commit had only 28 statements. Statement count alone does not identify the dominant delay.

### Eight-cycle native qualification: behavior checks pass

| Check through ordinary native composition/response admission                  | Actual result                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| All sixteen people perform the complete selected activity                     | **128 actual meals and work cycles; forty actions per person; all alive** |
| Repeat the same starting world and choices                                    | Identical complete-world result hashes                                    |
| Check that the completed world satisfies the current save-file validity rules | Pass                                                                      |
| Cancel while gathering                                                        | Stops; no automatic restart                                               |
| Energy reaches the ordinary 25% concern level                                 | Work remains allowed, as before                                           |
| Energy reaches zero                                                           | Normal forced sleep blocks further routine work                           |
| Food crosses the 40% concern level                                            | Hunger is still recorded                                                  |
| Select Sleep during the activity                                              | Interrupts the activity                                                   |

These checks prove the selected composition can run and stop through the existing owners. They do not prove the full server is faster. The real-database comparison follows with one required durable decision/save per eight-cycle selection, and completed cycles counted even when a commitment is still unfinished at cutoff.

## A promising cognition cost, not yet a selected change

The matched native test created 3,303 new records of what characters noticed. Of those, **3,014 (91%)** concerned starting an action, gathering, preparing material or eating. Some belong to the person doing the work; those must remain distinct from bystander records.

A proposed trial will preserve each actor's own outcomes and directly involved people's existing evidence, while omitting repeated routine-work observations for other bystanders. Speech, injury and other consequential events remain separate. This could greatly reduce new records, but the compromise is real: bystanders would no longer remember each routine act or use it as an individual cue for a thought, relationship appraisal or witnessed promise fulfilment. The actual work, products and acting person's precise action history would remain. Combat preparation must not be accidentally treated as routine gathering just because both start an action.

The first private trial cut new observer records from **3,303 to 531 (83.9%)** with the same action/event counts, completed cycles and saved random endpoint. Native CPU did not improve in that single pair (2.243→2.314 seconds): it still calculated every original audience before filtering. Any larger value would need to come from fewer durable rows, less later cognition work, or avoiding those audience calculations. No production attention policy has changed, and no save-speed improvement is inferred without a real-server comparison. The trial is PF16.65. Longer everyday task durations were subsequently selected under PF16.66: their actual large gain and lower production per game day are reported below. That does not select the missing-bystander-memory policy.

## Earlier architecture questions and their follow-through

The fresh remaining-cost audit also found repeated installed-rule lookup using about 0.99 sampled seconds in the 45-second profile, and other pure inspection before changing actors. Sharing those reads may help without changing gameplay, but no runtime trial or speedup is claimed. These are smaller opportunities than the measured movement change; the current priority is qualifying the complete graphical game and its real routes.

The repeated character needs/condition records deserve a complete-path test. Removing them saved only 19% of native elapsed time, but also removed thousands of records that would otherwise be marked changed and saved. The subsequent private trial kept real database writes and actual actions while deliberately disabling physiology and its deadlines; its completed bound is reported below. It is an invalid game used only to estimate the possible benefit of a complete periodic/anchored representation. No need rules have changed in production.

The memory-eligibility question was which rows the real query visits, how often it repeats a lookup, and how much time PostgreSQL itself spends. The actual write measurement and retained write-once improvement below follow this through. Earlier historical captures sometimes found millisecond execution behind multi-second client waits. We will not rewrite the query or blame the database based only on the outer wait. Any change must preserve forgetting, correction, observer privacy and the same atomic save.

## What other engines suggest

Unreal's crowd system separates how detailed something looks, how frequently its behavior is simulated, and how often it is sent to each viewer. It supports variable-frequency simulation and signal-driven work. That supports testing those three costs separately here; it does not prove that OpenLegend can skip observations without changing what characters know. [Epic's MassGameplay overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-gameplay-in-unreal-engine).

Unity documents the tradeoff directly: fewer physics updates reduce CPU work but can make contact less stable or let objects pass through each other. It also warns that repeatedly trying to catch up can make overload worse. Its maximum catch-up limit can make simulation slow down, so copying that safeguard alone would fail our actual-3× requirement. Our trial must reduce the required work while measuring the clock's real progress. [Unity's physics-frequency guidance](https://docs.unity.com/en-us/engine/6000.0/manual/physics-section/physics-overview/physics-optimization/cpu/frequency).

These are design references, not implemented engine replacements or measured speedups. The next experiments apply their relevant ideas to the existing game owners.

## What the complete server says about need updates and save waits

Removing need calculations alone looked modest in the earlier calculation-only test. We therefore also measured the full server, including real saves. The private comparison deliberately disables **all shared rate and character-condition processing**: it also freezes fuel use and replenishment and omits some timed capability cleanup. It is an invalid world used to estimate cost, not a proposed game rule. Both versions use the same CPU sampler and have no recurring screen updates.

| Same 30-second diagnostic                                   | Ordinary world | Invalid rate/condition removal | Meaning                                                                 |
| ----------------------------------------------------------- | -------------: | -----------------------------: | ----------------------------------------------------------------------- |
| Actual game speed                                           |     **0.602×** |                     **0.726×** | 20.5% more progress in one pair, still nowhere near 3×                  |
| Actual completed five-action cycles                         |             87 |                            106 | Everyone continues real work                                            |
| Accepted player walks                                       |             29 |                             29 | Same offered schedule; exact completion times differ                    |
| Time with database work outstanding during required commits |       14.005 s |                       16.801 s | These are complete waits, not measured database execution               |
| Sampled server main-thread idle share inside those waits    |      **91.7%** |                      **93.1%** | Sustained character calculation does not explain these particular waits |

All sixteen residents remain alive and neither run reports a storage or command failure. The invalid version does more work, so its larger total database wait cannot be read as a per-save regression. Removing fundamental needs and other rates buys too little to select a major rewrite from this result alone.

Earlier database plan checks repeated captured statements after measurement, when eligibility values were already updated. Those replays changed **zero rows**. Their short execution times therefore cannot exclude expensive work when the original rows and indexes were actually changed. No just-in-time compilation appeared in the fresh plans. The direct diagnostic then executes one real write exactly once inside its ordinary transaction: **49 rows change, PostgreSQL execution takes 12.443 ms, planning 1.668 ms, and the complete await 15.990 ms**. The enclosing world commit succeeds with no writer, SQL or storage error. No just-in-time compilation or disk read appears. This closes the repeated-zero-update ambiguity for that batch only; larger and older batches remain unbounded. We now compare complete request counts and dependencies before choosing a save change.

The valid full-server baseline makes **2,599 database requests in 132 world commits**, about twenty requests per commit. Retained high-cost statement groups include memory eligibility (140 requests / 4.444 seconds), memory insertion (244 / 2.154 seconds), canonical record writes (424 / 2.352 seconds), and final commits (135 / 1.711 seconds). These are measured request waits, including scheduling, not PostgreSQL execution times. Only the thirty highest-time statement groups are retained, so grouped counts are lower bounds.

The next save candidate avoids inserting a new memory lookup record as unavailable and immediately rewriting it as available. It prepares old-record preservation first, writes the current character evidence, and then inserts new lookup records using the existing availability rules. Database lookup structures are updated when indexed values change; avoiding a redundant change may reduce that work. This is a hypothesis supported by [PostgreSQL's update documentation](https://www.postgresql.org/docs/14/storage-hot.html), not a measured saving. Forgetting, correction, summaries, dependent records and rollback remain required.

A separate gameplay trial makes everyday gathering and preparation take ten times as long: the measured work/meal cycle grows from **174 to 1,740 game seconds**. Movement, needs and clock conversion remain unchanged. This directly trades lower material production and a later meal for fewer completed actions, observations and saves per game hour. It has now been selected for fresh bundled worlds after the measured gain and behavior checks below. Complete graphical and long-session acceptance remains open.

## Longer everyday work: the first large throughput gain

The two server versions keep real PostgreSQL saves, all sixteen working residents, ordinary needs, finite supplies and the same offered one-walk-per-real-second pattern. Only the base world's gathering/preparation durations differ. Neither prepares recurring screen updates, so this is a diagnostic of the world/server, not a complete playable-game pass.

| Thirty-second real-server comparison   | Ordinary durations |             Tenfold work durations | Result                                                   |
| -------------------------------------- | -----------------: | ---------------------------------: | -------------------------------------------------------- |
| Actual game speed                      |         **0.656×** |                         **2.917×** | About **4.45 times more progress**, still below 3×       |
| Game seconds advanced                  |           1,183.95 |                              5,280 | Much more game time genuinely advances                   |
| Completed work/meal cycles             |                 96 |                                 36 | Less production per game hour is the intended compromise |
| Resident participation                 |             All 16 | All 16, each completing 2–3 cycles | People keep doing actual work                            |
| Meals tied to actual gathered output   |                 96 |                           36 of 36 | Food is not fabricated                                   |
| World commits / database requests      |        142 / 2,926 |                         82 / 1,302 | Substantially fewer save requests                        |
| Summed required-commit elapsed time    |           15.783 s |                            8.099 s | Lower total wait despite more world progress             |
| Accepted player walks / skipped offers |             29 / 1 |                             30 / 0 | Same offered pattern; exact accepted timelines differ    |
| Resident survival / storage failures   |   All alive / zero |                   All alive / zero | No disabled needs or hidden failure                      |

The first fiber takes **360 rather than 36 game seconds**, and the complete work/meal cycle **1,740 rather than 174**. If the game keeps up at full 3×, those correspond to about **2 rather than 0.2 real seconds for fiber**, and **9.67 rather than 0.97 real seconds per cycle**. These conversions describe the authored pace, not a claim that this measured run reached 3×.

In the separate one-cycle behavior check, all sixteen complete their own gathered-food meal; cancellation preserves unconsumed stock, and sleep/exhaustion interrupt normally. The ending energy is 82.39 and food 47.78–88.78, with health intact. That proof has no player walking and is not a matched speed measurement. The server comparison retains ordinary player commands.

Fresh finite stock is derived from the declared game-time budget: ten units per resident patch in the slower-work version versus 66 in the ordinary version; player starting food is nine in both. There is no refill or meter override. Longer work also changes the shared authored cordage cost used when future cord-making methods are compiled. It does not change the engine's clock conversion, movement speed, senses or damage rules. Changing the cord-making rule also changes the exact rule reference stored by older worlds. Worlds that include that earlier rule are incompatible with this build and require a fresh development world under the current no-compatibility policy. No existing game database was reset here. Saved resource patches in a world whose selected rules still match retain their own costs; the code does not silently relabel them.

Restoring ordinary recurring screen updates reaches **2.832×** over 30.058 real seconds, with 32 actual work/meal cycles, exactly two for every resident, and 29 accepted walks. All people stay alive and there are no storage or command failures. Preparing 444 updates takes 6.251 summed seconds; this overlaps other measured work and is not an exclusive CPU share. There is still no graphical browser in that test. Resident travel and a long work/eat/sleep soak remain open.

## Write new memories correctly once: both comparison orders

The candidate preserves the same memory, forgetting and privacy rules. In the paired data scenario, all five snapshots of the affected memory, privacy and index tables match the old writer through new observations, correction, forgetting, replacement and rollback. The nine existing private-history checks and two store-boundary checks pass. It does not drop memories or weaken required saves.

Both speed versions use the selected longer-work world, all sixteen residents, real PostgreSQL, ordinary recurring screen updates and the same offered player-walk schedule. The comparison was repeated in reverse order. Both improved, but the different gain sizes show why one short run is insufficient.

| Thirty-second server comparison                 | Existing memory writer |  Candidate | Result                                                      |
| ----------------------------------------------- | ---------------------: | ---------: | ----------------------------------------------------------- |
| Actual game speed                               |             **2.709×** | **2.939×** | **8.49% more progress** in one pair; still below 3×         |
| Completed actual work/meal cycles               |                     32 |         38 | Everyone works; all food bindings match                     |
| Accepted player walks                           |                     28 |         29 | Same offered pattern; one baseline offer skipped while busy |
| World commits / requests within them            |             77 / 1,241 | 80 / 1,344 | Candidate completes more work, not fewer artificial steps   |
| Summed required-commit elapsed time             |                9.160 s |    8.628 s | Lower total despite more work                               |
| Memory insertion plus eligibility request waits |                2.653 s |    1.881 s | Complete waits, not database execution times                |
| Public-update preparation                       |                6.288 s |    6.293 s | Essentially unchanged in this pair                          |

The reverse-order comparison runs the candidate first, then restores the existing writer on another fresh world:

| Reversed thirty-second comparison               | Existing memory writer |  Candidate | Result                                                                  |
| ----------------------------------------------- | ---------------------: | ---------: | ----------------------------------------------------------------------- |
| Actual game speed                               |             **2.888×** | **2.929×** | **1.42% more progress**; still below 3×                                 |
| Completed actual work/meal cycles               |                     32 |         36 | All sixteen people complete real work and eat their own gathered output |
| Accepted player walks                           |                     29 |         29 | No refused command                                                      |
| Summed required-commit elapsed time             |                8.483 s |    7.601 s | Lower despite 78 → 82 commits                                           |
| Memory insertion plus eligibility request waits |                2.593 s |    1.690 s | Lower in both comparison orders                                         |

**Decision: keep the change.** It avoids writing new lookup records twice and preserves the checked memory, privacy and failure behavior. The two candidate speeds are close, 2.939× and 2.929×, while the baselines vary more. With only two samples per version, we cannot claim a precise general percentage improvement. No cognition, remembered detail or collision behavior is removed.

Both versions retain all people alive with no storage/command failure. In the first pair their active clock backlog at cutoff is 478.811 versus 22.429 game seconds; some wall time can still await the next outer clock call, so neither that backlog nor the summed spans alone gives a full time partition. There is no graphical-browser or sustained pass yet.

## Unopened-panel trial: failed and removed

| Fresh crowded-browser comparison         | Ordinary panel construction | Deferred unopened controls | Result                                                                               |
| ---------------------------------------- | --------------------------: | -------------------------: | ------------------------------------------------------------------------------------ |
| UI/accessibility temporary allocation    |                    2.129 GB |                   3.502 GB | **64.44% more: failed**                                                              |
| Total sampled allocation                 |                    6.549 GB |                   7.912 GB | **20.81% more: failed**                                                              |
| Delivered screen updates                 |                         510 |                        523 | Only about 2.5% more updates; not an explanation for the whole allocation difference |
| Actual draw submissions per second       |                       73.74 |                      60.89 | Worse in this pair                                                                   |
| Slowest 1% of draw intervals begin above |                    50.25 ms |                   54.25 ms | Worse                                                                                |

The candidate also has an approximately 1.25-second entry stall whose cause was not captured. Source-map comparison confirms the only changed application source is panel construction. Fresh sessions have different completed work, so this does not prove every regression was caused by that code. It does fail the retention gate: the exact candidate change is removed and its artifact/results preserved. No caption is suppressed.

The functional checks separately verify retained unsent conversation text, memory paging/search, one active memory read, no hidden reads, forgetting while hidden and privacy after taking control again. Exact conversation drag position differs by eight pixels after reopening, and the first final screenshot did not visibly show memory rows despite their presence in the page. Those observations were preserved. A subsequent focused check on the restored application scrolls a real seeded row into view, verifies at least 90% of it lies inside the visible panel and captures legible text, with one active read and no browser error. The eight-pixel conversation offset mismatch remains a separate cosmetic limit. The deliberate two-tab control test also records two 403 console resources and one aborted event stream without captured bodies, so it is not called network-clean.

## Combined graphical test: still below the target

This test combines the retained cape, longer work and improved memory writes. It keeps every existing action convenience. It uses the actual graphical game, real player clicks and real PostgreSQL saves, with detailed CPU/allocation/trace sampling off.

| What happened                                                               |                  Measured result | Meaning                                                       |
| --------------------------------------------------------------------------- | -------------------------------: | ------------------------------------------------------------- |
| World progress over 50.014 real seconds                                     |   **2.124×**, 6,375 game seconds | Below the requested 3×                                        |
| Actual draw submissions during the 45.039-second browser phase              |             **70.52 per second** | Average is adequate; timing still varies                      |
| Slowest 1% of complete draw intervals begin above                           |                     **50.25 ms** | Visible stutter remains possible; longest interval is 96.6 ms |
| Accepted walking requests                                                   |                     **38 of 41** | Three legitimate physical blocks; no unanswered request       |
| Time for accepted-command answers, median / slowest 5% / maximum            |         **210 / 693 / 1,083 ms** | Walking still feels delayed                                   |
| First displayed motion for twelve clicks while stationary, median / maximum |               **318 / 1,225 ms** | Directly confirms the complaint about slow walking feedback   |
| Residents' actual completed work/meal cycles                                | **48**, exactly three per person | All sixteen work and eat their own gathered food              |
| Save, routine, browser and network failures                                 |                   **0 observed** | Slowness remains even without a reported failure or pause     |

The screenshot confirms a populated visible scene and the ordinary controls. Browser and server phases differ in length, so their counts and rates retain their own windows. Draw submissions are counted when the engine finishes submitting work; physical display presentation is not measured. This short standing-work result does not qualify resident travel, rest or long-session stability.

**Decision: implement the complete on-demand action-menu trial.** The separate measurement below identifies enough avoidable preparation to justify it. The trial preserves ordinary actions and their execution checks, while removing automatic suggestions and the three pinned shortcuts. Menus need an explicit opening step, and equipped-item targeting needs a current-choice read before execution. These were the trial’s proposed costs; the later full interaction checks pass and the corrected comparison at the top now supports retention. Sustained smoothness remains open.

## Checking possible actions is most of the screen-update preparation

A fresh thirty-second measurement keeps every current action choice and ordinary screen update enabled. It measures the time spent checking what the player could do with visible people, objects and carried items. All sixteen residents complete two real work/meal cycles, all 29 walks succeed and no storage or routine error occurs. Actual game speed is still **2.740×**; this run has no graphical browser and uses the earlier memory writer, so it is an attribution measurement rather than a comparison with the retained database improvement.

| Measured preparation in 423 screen updates            | Summed elapsed time |
| ----------------------------------------------------- | ------------------: |
| Complete screen updates                               |         **5.964 s** |
| Possible actions on visible people and objects        |             2.343 s |
| Possible actions on carried items                     |             1.811 s |
| Possible self-actions, including direct work controls |             0.556 s |
| Selecting suggested actions                           |             0.002 s |

The four action-related rows total **4.712 seconds, about 79%** of the complete update preparation. Some cheap controls and classification must remain, so this is an upper estimate of the time that could be removed from routine updates. The run makes **47,005 native action checks, about 111 per update**, taking 3.418 summed seconds _inside_ those rows; adding that figure again would double-count work. The browser also rebuilds the automatic quick-action option list after each update, but this test does not measure its allocation cost.

The implemented trial prepares complete menus when the player asks for them. It keeps inventory operations, recipes, learned activities, injury treatment and ordinary command checks, and preserves T targeting by first checking the exact equipped item and clicked target. Its explicit costs are removal of automatic suggestions and the three pinned shortcuts, extra menu-opening steps for crafting/equipment choices and one read before equipped-item use. It also replaces T's advance valid/invalid coloring with neutral target highlighting. The matched graphical gain and browser interactions are now measured. The change is retained after direct-control checks; whole-game 3× acceptance is still open. [Detailed timing and limits](performance/01-interaction-and-early-server.md#current-action-menu-cost).

| Behavior checked on the new implementation                                                            | Actual result                                                                          | What this does not prove                               |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Preserve the ordinary facts about carried items, without continuously preparing their actions         | Every compared item fact matches the former full item view                             | No speed gain measured yet                             |
| Read a menu without changing the world                                                                | World contents, events and saved randomness stay unchanged                             | Browser dismissal checks remain separate               |
| Request one known recipe and reject ambiguous or invented request fields                              | Exact craft choice returned; malformed requests refused                                | Does not establish every recipe's gameplay balance     |
| Use T with the equipped knife                                                                         | One enabled exact-target choice; the real command starts successfully and is saved     | Does not establish fast click-to-action latency        |
| Remove equipment while a menu read waits for authority checks                                         | The old held-item choice is withheld                                                   | Held browser replies still need actual gesture checks  |
| Stop queued work while manually paused                                                                | Stop stays enabled and actually cancels work                                           | No pause-duration or performance claim                 |
| Discover seven genuinely learned methods, an interrupted continuation and a method needing inspection | All expected choices appear; the residents' ordinary short decision list stays at four | Scripted checks do not prove AI decision quality       |
| Gather with a modest held tool while a stronger tool is stowed                                        | Displayed facts describe the held tool; it actually produces two units                 | Tool balance is unchanged                              |
| Aim when the first matching ammunition lot is fully reserved                                          | Same unavailable result as ordinary execution; no silent switch to another lot         | Practice retains its separate existing ammunition rule |

These are real server/native-owner checks with no paid providers, not performance results. TypeScript, configuration, production/source-map builds and nineteen focused existing checks pass. Earlier private helper attempts failed because their own command/assertion setup was wrong; they are preserved, corrected and rerun rather than counted as game failures. Reports are private `/private/tmp/ol-pf62-http-menu-check-20261015-d.json` and `/private/tmp/ol-pf62-native-menu-host-20261015-b.json`.

The first 180-second browser check is **partial**, not a pass. Its saved result proves four groups: no automatic menu reads while closed, self-action requests, one exact recipe choice, and inspecting/equipping the knife through the real inventory page. The menu and recipe screenshots are legible. Two earlier attempts clicked hidden radio-input wrappers; the corrected attempt then assumed one Escape would close the whole menu, although Escape first closes its active child. A later missing-hover lookup waited until after the fixture ended. The exact owned browser was stopped; its saved partial report includes that interruption and the expected connection failures after server shutdown. This separate paused-purpose opening contains 21 people, 21 animals and 100 other roots; it is not the expanded performance workload and supplies no speed or frame claim.

Later actual-browser checks close the targeting gaps. They deliberately hold a genuinely enabled knife-menu answer, change the real game or interaction, then release that old answer. None of those old answers sends an action.

| What the player actually changes before the held answer arrives           | Result                                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Escape, open Actions, or open the ordinary right-click menu               | Old tool gesture is cancelled.                                                                                                  |
| Unequip and re-equip the knife                                            | Old answer cannot authorize the newly equipped knife.                                                                           |
| Drop an unrelated carried item while still holding the knife              | The changed inventory invalidates the old answer.                                                                               |
| Pause and resume before releasing the answer                              | The old gesture stays cancelled after play resumes.                                                                             |
| Forget remembered information through the real game owner                 | The older answer is discarded.                                                                                                  |
| Renew player control in the same page                                     | The old control's answer is discarded.                                                                                          |
| Save, load and re-enter the world                                         | The old page is torn down; no old action is sent after re-entry. This does not claim an old promise completes in the same page. |
| Walk until the person being targeted leaves the actual visible-world list | The target hint disappears and no action is sent. Other checked equipment/control/history identities stay unchanged.            |
| Start a new, still-valid knife gesture                                    | Exactly one ordinary action is accepted and starts.                                                                             |

The remaining direct controls also pass through the real server and ordinary commands. Actual death exposes Continue; manual pause disables it, and resuming allows one new physical life. Aim stays unavailable until ready, pauses disable Release while keeping Cancel, and a real release spends exactly one projectile. Six ordinary practice shots earn the qualification for a genuine lesson request; current Accept/Decline/Withdraw work and obsolete replies are refused. An ordinary item offer transfers the exact offered item once. The current bundled world installs no separate camp-recovery control, so the test does not invent one. These checks close the menu implementation's functional gates; the measured gain justifies retaining it, while sustained smooth 3× remains open.

The full menu also passes a 1,164-choice catalogue, search, keyboard navigation and Escape through child/menu layers; removed 1–3 shortcuts do not trigger actions. The final core check passes seven groups and the advanced check thirteen. Neither reports a JavaScript error. The advanced check records four generic HTTP resource errors around control/load changes (one 403 and three 409); request paths/bodies were not captured, so their precise causes remain unclassified. This limits any claim about network cleanliness, rather than erasing the successful interaction assertions. All final owned browser/server processes close and temporary databases/directories are absent. Reports are `/private/tmp/ol-pf62-menu-ui-client-{ao,aq,ar}.json` with the earlier failed/partial reports retained separately. These functional checks do not prove sustained speed, live AI quality or ordinary sleep.

### First matched speed test of the menu implementation

Both fresh thirty-second cases retain the improved memory writer, tenfold work durations, seventeen people, forty animals, 133 other physical roots and ordinary recurring screen updates. There is no graphical browser or CPU sampling. Resources remain within reach in this pair; the new travel workload follows separately. Only the nine menu-related server/domain/protocol owners differ. The same one-per-second walking pattern is offered, and faster world progress can complete more resident work.

| Measured result                                       | Before: recurring action choices |     After: requested menus |
| ----------------------------------------------------- | -------------------------------: | -------------------------: |
| Actual game speed                                     |                           2.875× |                     2.906× |
| Preparing screen updates                              |       6.056 s / 453 preparations | 1.284 s / 457 preparations |
| Data sent to the viewer                               |                         11.05 MB |                    4.70 MB |
| Processor time used by the server, across its threads |                          33.79 s |                    27.87 s |
| Complete work/meal cycles                             |                               32 |                         35 |
| Accepted walks                                        |                               29 |                         29 |
| Slowest 5% of walking replies take at least           |                           429 ms |                     571 ms |
| World commits / summed elapsed save time              |                     78 / 8.463 s |               80 / 8.836 s |
| Routine, command or storage failures                  |                                0 |                          0 |

The intended preparation cost falls about **79%**, data volume falls about **57%**, and observed server processor time falls about **17.5%** despite three more completed cycles. All meals use actual produced food and all seventeen people remain alive. These are useful reductions, but speed still misses 3× and the walking tail is worse in this one pair. We have not established that the interaction compromises are worth keeping.

The remaining measured costs have shifted. Calls that perform native world calculations take about **14.2 summed seconds**, while world commits take about **8.8 summed seconds**, compared with only **1.3 seconds** preparing screen updates. These measurements overlap and are not an exclusive division of the thirty seconds. The world-change queue remains occupied for about **25.3 seconds**, which leaves walking requests waiting behind other work. A fresh graphical comparison and whole-server CPU capture must rank the remaining causes on this new implementation; the old 79% menu figure cannot do that. Reports are private `/private/tmp/ol-pf62-{baseline-viewer-aj,menu-viewer-ak}.json`; both close normally and remove their owned databases and temporary directories.

### Earlier graphical comparison with real resident travel: route-limited

**Later audit: incomplete route qualification.** Both private copies initialized the navigation worker against a different collision-module copy. In the measured former-menu run, three worker tasks took the error branch; in the requested-menu run, one did. Raw stopped-action wording was not retained, so individual actor/message links cannot be reconstructed. All sixteen residents’ direct travel, work, food and return evidence remains valid. The unchanged later CPU sample has no measured worker request and still supports its CPU ranking. The corrected old-menu/current-menu/two-metre comparison is now complete and appears at the top of this report. Preserve the values below as the earlier limited attempt. This is a test-packaging defect, not a demonstrated defect in the ordinary checkout.

Both versions now use the same new travel fixture: the complete starting world plus ten people, twenty animals, one hundred other roots and three diagnostic sheds. That produces seventeen people, forty animals and 133 other physical roots overall. Every resident must approach separated finite resource patches, gather, prepare, craft, eat their own output and return. The game uses real PostgreSQL writes and the matching ordinary client build. There is no CPU, allocation or browser-timeline sampler. The normal diagnostic graphics timers remain on in both versions.

| Fresh mixed-activity comparison                               | Before: recurring action choices | After: requested menus |
| ------------------------------------------------------------- | -------------------------------: | ---------------------: |
| Actual speed over about fifty server seconds                  |                       **1.842×** |             **2.590×** |
| Actual draws per second over about forty-five browser seconds |                            76.88 |                  88.08 |
| Slowest 1% of complete drawing gaps begin above               |                         44.75 ms |               34.75 ms |
| Longest complete drawing gap                                  |                          65.9 ms |                50.6 ms |
| Slowest 5% of accepted/refused walking replies begin above    |                         636.6 ms |               459.6 ms |
| Slow first displayed movement after a stationary click        |                       1,277.9 ms |               796.7 ms |
| Stationary clicks with measured first movement                |                               10 |                     12 |
| Complete resident work/meal cycles                            |                               36 |                     64 |
| Accepted walks / submitted ground intentions                  |                          39 / 42 |                34 / 41 |
| Physically blocked walking requests                           |                                3 |                      7 |
| Preparing screen updates                                      |                         12.635 s |                2.038 s |
| Server processor time across its threads                      |                         53.246 s |               46.581 s |
| World commits / summed elapsed save time                      |                    97 / 15.331 s |         123 / 17.673 s |

This is about **40.6% more game progress**, with substantially more actual resident work. Every resident finishes four complete cycles in the menu version, all 64 meals use the correct produced food, and each resident has at least 38 metres of observed movement. No resident plan, storage or browser failure occurs; all seventeen people remain alive. Walking refusals remain real: the different moving scene causes three versus seven blocked intentions, and the browser also encounters one no-ground click in the candidate. These are not omitted from the activity results. Neither short window exercises ordinary sleep.

**This earlier attempt did not meet the target.** It needed about 16% more progress to reach 3×, with visible input/drawing tails. The later interaction/privacy checks now pass; the corrected comparison at the top supersedes this attempt’s route qualification. This earlier fifty-second scene spends about 25.3 summed seconds inside native world-calculation calls and 17.7 in commits. Those observations overlap; they are not separate CPU budgets. The single world-change queue is occupied about 47.5 of the fifty seconds, explaining why input still waits even though preparing choices is much cheaper. The subsequent CPU capture uses this implementation and this workload, with its ranking reported above. Reports are private `/private/tmp/ol-pf62-mixed-gui-{server,client}-{am,an}.json`.

## Making the travel test usable without weakening physical rules

The earlier performance tests put resources within each resident's reach. That does not prove the requested travel workload. The new test places finite resource pairs several metres away and requires real gathering, a real meal and the return journey. It first rehearses those actions on a separate discarded copy; the measured world then starts fresh.

| Setup attempt                                    | What happened                                                                                                                                                              | Result and next change                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Four- and six-metre opposing pairs               | Could not place a usable pair for the first added resident                                                                                                                 | Failed before any speed measurement                                                                                        |
| Same search with rejection reasons recorded      | Eight positions lacked support, six were occupied, one route needed deferred calculation and one failed the sight/reach check from the other work site                     | Explained the failure; no game rule changed                                                                                |
| Add the five-metre position between four and six | First resident passes; another fails with nine occupied positions, nine unsupported positions and six visibility/reach failures                                            | Still no measured phase                                                                                                    |
| Work sites separated by 120 or 180 degrees       | The same distances and 48 bounded candidates per resident can place all sixteen pairs                                                                                      | Placement passes; rehearsal stops at an incorrect test expectation that accepting a queued plan immediately starts walking |
| Correct the queued-plan rehearsal expectation    | Ordinary world advancement completes all sixteen residents' first work/meal cycle and return; both actual work sites and three approaches/arrivals per person are observed | Rehearsal passes: sixteen real bound meals and positive movement for everyone; full mixed speed remains open               |

The added residents' positions, animals, buildings and overall content stay in the starting scene. Resources are placed through normal physical admission. The setup remains a failure if any person lacks a workable pair. The final discarded rehearsal advances **1,965 game seconds in 4.067 real seconds** over 174 native calls; it is a setup proof, not whole-game speed. Both-resource work stances, real produced-food use and return travel pass for every resident, with three approaches/arrivals each and no pending/failed route. Thirty-one movement transitions lack an exact retained route prefix and remain explicitly unmeasured; observed displacement still proves movement. A separate 3.181-second real-service smoke reaches 2.795×, too short to qualify capacity. No character is moved or supplied during measurement to force success. The completed matched graphical cases above use this same mixed-travel fixture on both sides; sustained rest and aging still remain open.

## Keeping route-preparation time owed to the clock

The former game excluded elapsed time when it found required route preparation pending. This protected needs from technical waits but could also discard much longer preceding busy intervals. The retained correction keeps that elapsed time as ordinary work owed to the clock. The world still waits for the current route result; afterward it catches up through the existing bounded calculation. This changes fairness rather than making route calculation faster.

| Same genuinely held route result at selected 3×             | Former policy                                      | Retained correction                                               |
| ----------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Two 0.25-second elapsed inputs while the route is held      | World and Food stay unchanged; no new time is owed | World and Food stay unchanged; exactly 90 game seconds are owed   |
| Release the real successful route, then drain ordinary work | Excluded preparation time never advances           | Exactly 90 game seconds advance; Food falls 76 → 75.73            |
| Cancel the action or publish a controlled route refusal     | Existing owed world time is preserved              | All newly owed time is preserved too; retry behavior is unchanged |
| Pause, load a save or report a controlled suspension gap    | Existing reset/exclusion rules apply               | Same rules; old time is not re-added after restarting             |

Nine functional groups pass on both versions, using real server commands and route publication. They include ordinary control replacement, real death followed by Continue into the next physical life, and an obsolete result after a geometry change. Current commands remain available during the wait. The refusal is deliberately injected at a real completed worker callback; it proves refusal/debt handling, not that the backend itself found no route. A fixed presence clock is used only for these functional checks, not a speed measurement.

The first baseline attempt fails before these policy assertions because the private worker initializes a different collision-module copy. The actual exception is captured, both copies receive the same corrected module mapping, and the checks rerun. A later attempted synthetic body resize is correctly rejected because it leaves an incompatible pending route request. That fixture is replaced with supported actual death/Continue behavior; validation is not weakened. Two source-review corrections before execution explicitly select 3× and strengthen obsolete-result assertions. Every owned process and temporary database closes.

**Retained for elapsed-time accounting, with an explicit fairness cost.** After route readiness, needs and deadlines include the technical wait and delayed travel can advance quickly. Commands that arrive before catch-up retain their existing place in the queue. The old 0.80-second exclusion is only one sample; the later 4.56-second example demonstrates a larger phase-dependent loss. Neither amount is pathfinding CPU or an estimate of processing capacity. The refreshed nine groups pass for both versions on the current combined source.

| Fresh short graphical comparison                      | Former policy |              Retained correction |
| ----------------------------------------------------- | ------------: | -------------------------------: |
| Actual game speed                                     |        2.691× |                           2.816× |
| Actual route-worker requests during measurement       |             2 |                                0 |
| Elapsed time classified as route-excluded             |       0.319 s | 0 s; deferred branch also unused |
| Completed resident work/meal cycles                   |            64 |                               64 |
| Process CPU                                           |      44.870 s |                         47.911 s |
| Slow walking replies, 95th percentile                 |        569 ms |                           731 ms |
| Slow idle-to-displayed-motion starts, 95th percentile |      1,302 ms |                           976 ms |

**This pair does not prove a speedup from the correction:** the candidate never needs the worker during its measured window. Player paths, accepted walks and ending backlog also differ. Drawing submissions rise 77.85→80.43 per second; the longest drawing gap worsens 51→65.5 ms, and command replies worsen even as movement starts improve. All seventeen people survive, all completed meals use their residents' produced food, and no browser/service/storage failure or measured pause occurs. The decision rests on the demonstrated accounting defect and controlled real-route checks. Sustained capacity and input smoothness remain open. The larger alternative of preparing a route while the old action continues still needs complete cancellation, durable-result and current-body/geometry design. [Detailed clock evidence](performance/03-saving-and-render-preparation.md#deferred-route-preparation-time-private-functional-trial) preserves versions, failures and tradeoffs.

## Check whether the graphics measuring tool causes the slowdown

The frame tool normally asks the graphics driver for elapsed GPU time on every update callback. Even with detailed CPU profiling off, those requests remain. A private comparison removes only those requests, while keeping identical game graphics, drawing limits, cape behavior, click input and frame/movement counting. All 1,202 source-map modules match except the measuring tool itself.

| Fresh graphical comparison                                     | Timing requests enabled | Timing requests disabled | Result                                             |
| -------------------------------------------------------------- | ----------------------: | -----------------------: | -------------------------------------------------- |
| Actual server speed, about fifty seconds each                  |              **2.124×** |               **1.902×** | No speed gain                                      |
| Actual draws per second, about forty-five seconds each         |                   70.52 |                    60.26 | Worse in this pair                                 |
| Slowest 1% of complete draw intervals begin above              |                50.25 ms |                 52.75 ms | No smoother timing                                 |
| Longest complete draw interval                                 |                 96.6 ms |                 169.1 ms | Worse                                              |
| Accepted-command answer, slowest 5% / maximum                  |          693 / 1,083 ms |         2,213 / 2,427 ms | Worse walking feedback                             |
| First displayed movement for twelve stationary clicks, maximum |                1,225 ms |                 2,683 ms | Still unacceptable                                 |
| Accepted walks / submitted                                     |                 38 / 41 |                  38 / 41 | Three physical blocks in both                      |
| Residents' completed real work/meal cycles                     |                      48 |                       48 | Everyone completes three and eats their own output |
| Observed save, routine, browser and network failures           |                       0 |                        0 | No pause or reported failure explains either run   |

**Decision: no rendering change from this trial.** Removing the measuring requests does not improve this sample. Fresh runs still vary, so this does not prove those requests are free or helpful; it simply provides no positive explanation for the missing speed. GPU durations in the second run are deliberately unmeasured, not zero.

Preparation failures are preserved too. The first private build lacked some dependency links and passed after those links were repaired. The first browser launch was blocked by the macOS sandbox before loading the game, and its waiting server timed out without measurement. An initial retry refused reuse of the failed report path. The successful comparison uses fresh owned resources, a new output file and the required launch permission; both owned server and browser close cleanly. The action-menu trial continues independently.

## How the remaining work will be judged

We first use short matched comparisons to find changes large enough to matter. One timed workload runs at a time. Both versions use the same current world, finite supplies and player intentions; reports distinguish setup, measurement, profiler overhead and failures. Disabling a feature gives a useful upper bound on its cost, but it never counts as a valid finished game.

Then we test the complete expanded game at actual 3×, including player walking and interruptions, resident work and travel, animals, buildings, eating and ordinary rest. We measure frame gaps and command delays alongside world progress. A long freeze, hidden storage pause, unfinished requested work, unsupported save or a world that advances slowly is a failure even when average FPS looks good.

No real AI provider calls have been made for these renewed measurements. Additional provider cost is **$0**, cumulative task provider cost **$0**. Scripted decision fixtures prove native activity, not the quality or latency of live character reasoning. Any later cognition change must separately explain what characters notice, remember or decide less often and measure the resulting behavior.
