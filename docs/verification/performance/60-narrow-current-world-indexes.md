# Keep the lookups, reduce repeated world identifiers

October 16, 2026. **Fixed comparison complete; no adoption or full-game release.** The narrower keys reduce recovery-log bytes by 10.3%, but one representative search now also scans the entire world's primary index. Keeping every index did not preserve its search cost.

The broad removal test proves that extra memory-search indexes multiply recovery-log work, but it removes useful lookup structures and does not establish a complete game gain. Try reducing their size while preserving every lookup rather than removing them.

## Existing storage fact and proposed physical change

The current database header permits exactly one live world: `world_head` has a primary key constrained to the value1. Every canonical world-record table and `recall_sources` has a foreign key to that header's unique world identifier. Thus all rows in each of these tables must carry that same identifier. This is an existing enforced storage contract, not a new world/gameplay limit. Historical event tables and other tables without this exact guarantee are outside the trial.

Create matched private copies of the qualified PF16.177 ordinary-index control. In the candidate, omit the leading `world_id` field from **non-unique B-tree secondary indexes** on the 131 canonical record tables and `recall_sources` (roughly 15–30 executable lines across the two existing initialization owners). Keep all index names, remaining keys/order/predicates/included fields, primary keys, unique indexes, foreign keys, checks, columns, stored values and query wording. The full world filter remains in every scoped query. The text-search index already has no such key and stays intact.

These are physical lookup keys, not record identities or permissions. Complete world/observer/kind predicates and unique identity constraints remain unchanged. Typical actor/parent/event searches retain the same varying lookup keys. A world-only query can become a full scan; for a valid current world it already asks for the complete table. Wrong-world refusal / absence paths and ordinary cold reads still need explicit checks. Supporting multiple simultaneous header worlds would invalidate the single-value premise and require reassessing these index keys; do not silently extend this optimization to cold history or other multi-world tables.

## Proof and measured comparison

First require full source / exact two-owner delta / format / TypeScript / real worker / unchanged-native proof. In fresh owned actual SQL fixtures, verify the one-header CHECK, all132 direct current-world foreign keys, unchanged primary/unique constraints, the complete expected index-key difference, and actual refusal of a second header / other-world canonical and searchable rows. Use savepoints for refused statements and verify normal rollback. No operator/user database or manual statistics/settings change.

Adapt the existing fixed64-synthetic-event burst sequence to the new variants. Keep all fifteen recall indexes in both copies; require every non-unique B-tree key to equal its original after removing only the leading constant world identifier. All unique indexes must remain byte-for-byte equivalent. Use the existing actual-once explained inserts and full logical world / all131 canonical tables / three derived tables / original completion details / public-private audiences / actual SQL failure / current load-reopen / exact960 added observations / exact-owned-cleanup checks. Four fresh fixed **control / candidate / candidate / control** phases, sequential with complete per-phase comparisons, keep all original180-second / world / report / table / derived / plan bounds from PF16.180. Record root recovery-log / buffer counts, elapsed and CPU; do not infer a game gain from smaller keys.

Before any actual game, additionally inspect representative cold parent, actor/source/event and wrong-world query plans against the real narrow index catalog, keeping query result checks and unrefreshed statistics explicit. A missing useful path or slower case remains evidence. Only separately preregistered current full-game tests can establish throughput/input effects. No integration, development-save reset or final schema policy is selected by this private diagnosis.

The required cold-read proof is a separate bounded set within the fixed helper: at most six read-only plans / 1 MiB, still sharing its original 4 MiB result and 180-second deadline. The existing explained-insert cap remains four / 2 MiB; it is not enlarged. The read cases cover parent, exact actor/source, related event, complete current-world and absent-world queries, comparing complete returned identities as well as actual plans. No manual statistics refresh is allowed. This small extra read allocation is selected before those helper edits.

## Review correction — October 16, 2026, 18:29 EDT

The first control completed normally and passed its structural, content, refusal and cleanup checks. The candidate has not run. Review found that the helper calls its six searches “cold” after it has already read the complete tables, and runs each search before explaining it. These are warmed reads. Preserve the frozen helper and its completed result; do not relabel them as first-use proof. The original first-use requirement remains open before any game comparison or adoption. Neither a new connection nor a database reopen alone guarantees an empty PostgreSQL or operating-system cache.

## Results — October 16, 2026, 18:44 EDT

The four fixed phases now complete in their original control / candidate / candidate / control order. Every phase writes the same 960 new observations from 64 public signals, with fifteen permitted witnesses each. All 131 canonical tables / 5,061 rows, all three derived tables / 1,759 rows, complete logical world and relevant job details match. All 316 indexes remain, including all fifteen recall indexes; only the selected non-unique leading keys differ. The one-header constraint and all 132 direct world foreign keys match. Actual second-header insertion fails with CHECK code 23514, and other-world canonical/searchable insertions fail with foreign-key code 23503. Real SQL failure rolls back, current load/reopen and privacy checks pass, source is unchanged, and every owned database/connection/directory/process group closes normally.

| Fixed phase           | Whole burst elapsed | Game-process CPU | Database insert execution | Recovery-log bytes |
| --------------------- | ------------------: | ---------------: | ------------------------: | -----------------: |
| Original, first       |           314.36 ms |        196.10 ms |                  63.74 ms |          2,446,408 |
| Narrower keys, first  |           309.83 ms |        171.46 ms |                  60.27 ms |          2,195,552 |
| Narrower keys, second |           239.20 ms |        169.15 ms |                  30.89 ms |          2,195,552 |
| Original, final       |           797.58 ms |        170.81 ms |                 386.74 ms |          2,446,408 |

Mean elapsed falls 555.97→274.51 ms and mean game CPU 183.45→170.31 ms, but the final original database execution is a large outlier and the CPU ranges overlap. The first control also precedes the later phases by the intervening user-requested review work. Do not turn the mean's 50.6% elapsed reduction into a dependable speedup claim. PostgreSQL execution elapsed includes waits; game CPU excludes database-process CPU. The repeatable physical change is recovery-log bytes **−10.254%**, with records 12,634→12,609 (−0.198%) and root buffer hits 26,300→26,241.5 (−0.222%). Full-page images are zero in all four phases.

### The search regression matters for growth

All six warmed reads return identical complete identities, including both absent-world cases. However, the query for one character's 121 observations changes from one focused parent-index scan to a combination of that index and **all 1,759 entries for the current world in the primary index**. Root buffer hits rise 20→53. Both candidate plans repeat this pattern. It is fast in this small fixture, but its unnecessary primary-index work grows with the world's retained observations.

| Warmed search                          | Original executions | Narrower-key executions | Result                                           |
| -------------------------------------- | ------------------: | ----------------------: | ------------------------------------------------ |
| One character's 121 observations       |    0.064 / 0.053 ms |        0.142 / 0.151 ms | More work; whole-world primary-index scan added. |
| Exact character/source, one row        |    0.012 / 0.017 ms |        0.012 / 0.008 ms | Correct, no dependable timing difference.        |
| Related event, thirteen rows           |    0.019 / 0.017 ms |        0.080 / 0.093 ms | Both candidate reads are slower.                 |
| Complete current-world set, 1,759 rows |    1.267 / 1.313 ms |        1.269 / 1.261 ms | Similar small-fixture cost.                      |
| Absent world, zero rows                |    0.008 / 0.035 ms |        0.009 / 0.018 ms | Correct absence; variable tiny timing.           |
| Absent world/parent, zero rows         |    0.007 / 0.008 ms |        0.019 / 0.046 ms | Correct absence; candidate does extra work.      |

Statistics are deliberately not manually refreshed. The plans describe these fresh fixtures, not a claim that aged statistics will choose the same plan. First-use cache behavior and large-history search costs remain unqualified. Since the read regression is demonstrated and the complete-operation gain is uncertain, **do not integrate this candidate or release a full-game comparison now**. Further storage work must preserve efficient scoped reads as well as reduce writes; simply counting retained indexes is insufficient. No gameplay, cognition or collision compromise is selected.

### Reproduction

Sources remain the frozen PF16.181 ordinary-writer control `8bd703209512dd25e7c61992e7731c3e59c51bdae3e87cae1919697274452467` and candidate `90f7b543fba30ca6cdfdc588e894bc5f03844ef4698981308dc6af301079f89d`. Pre-run source review corrected one missed multiline index clause before static verification or any fixture run; the recorded manifests were regenerated at that stage. Both source variants passed formatting, TypeScript and the real separate-worker route check before the fixed comparison. The complete aggregate is `/private/tmp/ol-pf181-fixed-comparison-20261016-a.json`, SHA-256 `d8d86434a9e2e0c3ce0979ebc125a8c40cdb98ba1457815e60038c64a80357ee`; it pins all four full reviews and their underlying world/table/derived/job/lifecycle files. The two actual-once explained inserts retain identical 526/434-row SQL shapes. No failed game is retried, no database statistics/settings or user data are changed, and additional/cumulative provider cost remains **$0**.
