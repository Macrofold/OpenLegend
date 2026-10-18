# Mark the newest usable place observation once

October16,2026. **Completed diagnostic; not integrated.** When a character's remembered information about a place changes, the database marks which observation is newest and still usable. The current implementation clears the old mark, then marks the chosen observation. It does this even when the chosen observation was already correct. Earlier captured slow commands show real database-file waits in this query family.

| Trial                         | Before                                                   | Proposed experiment                                                                  | Result                                                                    |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Mark newest place information | Two database requests per affected batch; clear then set | Choose the winner once, clear only other rows, set only a winner that needs changing | Correctness passes; actual mean improves 8.3%, but smoothness still fails |

Every retained observation and its privacy, correction and forgetting rules must stay the same. The query still chooses after eligibility is reconciled, uses the same ordering and touches only the requested character/place/world. It keeps the250-pair limit and normal atomic, durable saving. No new index or dropped memory is part of this trial.

PostgreSQL runs combined modifying statements against the same snapshot in an unspecified order and does not support changing the same row twice. The new operation must therefore use two disjoint sets of rows and never depend on seeing a sibling update. This design follows [PostgreSQL14's documented rules](https://www.postgresql.org/docs/14/queries-with.html#QUERIES-WITH-MODIFYING); simply combining the old clear-all and mark statements would be incorrect.

Full source/type/package/actual-worker checks and real database parity cases precede performance measurement. Cases cover unchanged/new/missing/ineligible winners, ties, private scopes, independent people/places/worlds and batch/page boundaries. Current full-world saving/load/reopen and affected forgetting/correction/retention behavior must still pass. Four actual older-world comparisons retain all original watchdog, source, activity, input, survival, error and exact owned-cleanup checks. No provider, sampler, new recurring observer or resource refill is added.

This might reduce requests and unnecessary writes; it is not a promised whole-game gain. Incorrect, neutral and negative results remain recorded. No canonical change is retained from setup. Additional/cumulative provider cost remains $0.

[Standalone remaining gaps](bottlenecks.md) · [Project plan](../../projects/three-times-scene-performance.md#single-newest-place-observation-update) · [Experiment register](../../maintainers/performance.md)

## Qualification attempts

The first real-database qualification stopped before testing the candidate. Its synthetic case reused one observation ID for two places for the same person, violating the existing unique observation key. This was a mistake in the diagnostic data, not a measured runtime regression. The baseline process exited normally with the owned database and directory removed; the exact database and connection counts were both zero. The corrected case uses distinct observation IDs. The failed report remains preserved and no candidate game was released from that attempt.

The corrected fifteen metadata cases and initial full-world/private-event save/load/reopen passed on both versions. Extending the same helper to private place observations first failed JavaScript parsing before any database identity was generated. No database creation was demonstrated in that attempt. The missing parentheses around a default function argument were corrected, and the helper is syntax-checked before another launch.

The next extended baseline attempt saved and exactly reloaded the private place observation, but its diagnostic reader incorrectly converted the world’s opaque generation identifier to a number. The existing generation fence correctly returned no observations, so that attempt failed before candidate release. Cleanup again passed with exact zero database/connections and the owned directory absent. The helper now keeps the original identifier as text and creates its reader against the reopened repository. These are diagnostic-helper repairs, not game changes or successful performance observations.

## Correctness and actual writes: passed before timing

Both source copies pass the selected production type check, pinned formatting, six package aliases and an actual separate route-worker query. The only runtime difference is the place-marking query. No rule, memory body, index or schema changes.

| Controlled case                                     | Current implementation          | Candidate                | Final information |
| --------------------------------------------------- | ------------------------------- | ------------------------ | ----------------- |
| One place already points at the correct observation | 2 update requests; 2 row writes | 1 request; 0 row writes  | Exactly equal     |
| 250 unchanged places                                | 2 requests; 500 row writes      | 1 request; 0 row writes  | Exactly equal     |
| 251 unchanged places                                | 4 requests; 502 row writes      | 2 requests; 0 row writes | Exactly equal     |
| 501 unchanged places / 1,002 observations           | 6 requests; 1,002 row writes    | 3 requests; 0 row writes | Exactly equal     |

All fifteen real PostgreSQL metadata cases pass on both versions, including unavailable/deleted winners, time/sequence/ID ties, inconsistent old marks, independent people/places, a different world identifier and an empty change. The 501-place case crosses both the 250-place batch and 1,000-observation eligibility page. A temporary database trigger counts actual row updates solely during qualification; the transaction is rolled back before full-world checks. These are counts, not timing claims. The game timing has no trigger or extra observer.

The same helper also saves and exactly reloads every field of the current world, checks 15/15/1 actual event audiences and stored personal accounts, and reopens it. Five further ordinary commits add two private place observations, correct the newest, forget it to reveal the earlier observation, and forget the second new observation. Actual place reads hydrate the right observation/correction; the other person's place information remains unchanged. Final complete saving and reopen pass. Current-format validation passes throughout. This verifies affected removal and fallback behavior; it does not claim an exhaustive test of all unrelated retention policies or live AI quality.

Successful reports: `/private/tmp/ol-pf151-postgres-{0-baseline,1-candidate}-20261016-e.json`, with matching `.lifecycle.json` files. Both normal closures report source/input guards, no forced stop, exact zero owned databases/connections and the owned directory absent. Earlier failed helper attempts above remain preserved. Additional/cumulative provider cost is $0.

## Selected running-game protocol

The selected four older-world runs use baseline/candidate/candidate/baseline order and the exact original saved world, people, animals, stock, routines and normal saving. Each has a 30-second measured phase and the unchanged 300-second outer watchdog. Source/input/assets/worker gates and exact ownership cleanup remain required. Plan: `/private/tmp/ol-pf151-aged-launch-plan-20261016-a.json` (SHA-256 `39276e1d9b0d730892485f0a2f0208e919450eb029f0a10bdef1d024895aa7a4`). Full-game benefit, smooth clicks and sustained 3× remain unproven. The candidate is private.

The first running-game report reader classified place updates by searching for the later `SET place_latest` clause. Stored SQL shapes are bounded prefixes, so this missed the candidate query and incorrectly reported zero place requests. The report and game are valid; this derived field is not. A corrected reader identifies the unique `WITH changed(actor_id,place_id)` prefix for both versions and writes separate review-b files, preserving the originals. No raw report, runtime query, capacity failure or launch limit changes.

Further source review establishes that the SQL-shape table contains only the thirty most expensive shapes. Even the corrected prefix count therefore cannot be presented as the complete number of place updates. Review-c files label these as counts/waits within the reported top30 only; whole-phase statement totals remain available from the complete stage counters. Only the separate controlled PostgreSQL cases above establish exact place-update request/write counts. No speed conclusion uses the incomplete family counts.

## Four older-world games: modest gain, smoothness still fails

| Order | Version   | Actual speed | Command confirmation p95 | Accepted / skipped inputs | New plans / minimum per resident | Checked food outputs |
| ----- | --------- | -----------: | -----------------------: | ------------------------- | -------------------------------- | -------------------: |
| 1     | Current   |       2.048× |                   727 ms | 29 / 1                    | 33 / 2                           |                   17 |
| 2     | Candidate |       2.179× |                   706 ms | 29 / 1                    | 36 / 2                           |                   20 |
| 3     | Candidate |       2.052× |                   888 ms | 29 / 1                    | 32 / 1                           |                   17 |
| 4     | Current   |       1.858× |                 1,583 ms | 24 / 6                    | 28 / 1                           |                   12 |

Mean progress rises **1.953→2.115× (+8.30%)**. The mean of each run's command percentile falls **1,155→797ms**; this is not a pooled percentile. Mean save elapsed time falls **13.055→11.070s (−15.20%)** and summed ordered-change waiting **19.328→14.903s (−22.90%)**. Save, query, queue and native spans overlap; these savings cannot be added. Mean process CPU per completed game second instead rises **6.339→6.542ms (+3.19%)**. Runs complete different activity and the last baseline is substantially worse, so the average is not a stable 8.3% capacity guarantee.

All four pass current source/checkpoint/assets/dependency/actual-worker, ordinary issued-command, storage/error, people/animal survival and exact owned cleanup. All seventeen people and forty animals remain alive. All fail the 3× and input targets and skip scheduled inputs. The second candidate also misses the per-resident new-plan floor; the final baseline misses that floor and the food-output floor. These failures remain in the comparison. No run is graphical or sustained acceptance.

The candidate remains private. It does remove directly counted unnecessary writes without losing information, but the measured improvement does not establish adequate gameplay. Other save work still dominates: in the first baseline's reported expensive shapes, inserting recall metadata waits about1.96s, work-request writes1.29s, and event/personal-account writes1.23s. These are application request waits, overlap CPU/other spans and cover the reported thirty most expensive shapes rather than every query. They are next diagnostic evidence, not database CPU measurements.

Comparison `/private/tmp/ol-pf151-aged-comparison-20261016-a.json`, SHA-256 `4dd806eb19ab4f78810700d4accc1dc4cd5dbacc178d57078ebcb0e12122cac9`, retains all four raw report hashes and review-c coverage limits. Each process exits normally without a forced stop, with exact owned database/session counts0/0 and owned folder absent. Additional/cumulative provider cost remains $0. No canonical executable file changes.
