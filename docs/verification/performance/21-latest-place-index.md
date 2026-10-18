# Find current place observations without rereading their history

October 15, 2026. **The lookup does less work, but full-game qualification fails. The index remains private.** No memory or remembered place is removed.

When a character gets a newer observation of a place, the game clears the previous observation's “latest” marker and selects the new one. A running-game recording finds a 451 ms request in this category with repeated database file-read waits. Another takes 266 ms. A separate captured request takes 548 ms during ordinary play.

## What the query-plan experiment found

The test replays that last exact request for five character/place pairs, inside transactions that always roll back. The database contains 89,120 character-evidence rows. Each comparison finds the same five current observations.

| Comparison                                          | Observations examined by the lookup | Lookup data-page accesses | Lookup index                         |
| --------------------------------------------------- | ----------------------------------: | ------------------------: | ------------------------------------ |
| Existing database, before manual statistics refresh |                           About 250 |                       355 | All retained evidence for each place |
| Existing database, after statistics refresh         |                           About 250 |                       358 | Same broad index                     |
| Proposed additional index                           |                                   5 |                        10 | Current place observations only      |

The broader lookup returns one row per pair but filters out an average 49 old rows per pair. PostgreSQL reports rounded per-loop averages, so “about 250” is deliberate. The proposed index removes that filtering. Data-page accesses count database buffer visits, not necessarily distinct disk reads or physical storage requests.

Refreshing statistics alone does not remove the broader lookup. The proposed index covers current observations even when they have become ineligible for recall: clearing those old markers remains necessary. The existing index for listing remembered places covers only eligible observations, so it cannot generally serve this update. Both eligibility and private-character checks remain intact.

## What these numbers do not prove

Replay execution times are 1.754 ms before statistics refresh, 0.727 ms afterward and 0.454 ms with the additional index. These are warmed replays after gameplay; creating the index itself scans data. They are **not** evidence that a 548 ms click operation becomes 0.454 ms in the full game. Fewer visited records/pages is the useful result. Actual running-game comparisons must establish the benefit and the extra index-maintenance cost.

The query-plan game itself reaches only 2.505×, with 751 ms command confirmation at the 95th percentile. All 29 issued commands succeed; all sixteen residents continue, 38 plans and 22 produced-food checks pass, and all seventeen people/forty animals survive. No command/storage/SQL/maintenance error is observed. The new index is created only after the original gameplay report is saved, so it provides no gameplay speedup in this diagnostic.

All three plans are captured under the existing five-second query limit. Both game and observer close normally, source/input guards pass, and the exact allocated database/sessions/temp directory are absent. The first source version passed static checks but was never used for a game: review moved the new index operation after the original report write so a failure could not lose gameplay measurements. The corrected version passes formatting, TypeScript and actual six-package/separate-worker checks before release. No canonical memory/index code changes in this experiment.

Private evidence: `/private/tmp/ol-pf136-pf138-aged-0-candidate-20261015-b.json` and its `.recall-plan-grown.json`, `.recall-plan-grown-analyzed.json`, `.recall-plan-place-index.json`, observer and lifecycle companions. Additional and cumulative provider cost: **$0**.

## Selected full-game comparison

Before source edits, select a balanced ordinary/index/index/ordinary running-server comparison on the same complete older save. Candidate changes only the memory repository's schema initialization to add the demonstrated current-observation index. Both versions share a small postmeasurement index-size report. Keep every eligibility, ordering, source-retention, transaction and durability rule. No new gameplay limit, cache or save-format change.

Expected product change: one index statement and its local explanation, roughly 2–5 SQL/comment lines; shared diagnostic size reporting roughly 3–8 lines. Cost grows with current character/place observations, rather than every retained visit to those places. The extra index consumes storage and must be maintained as current observations change; measure startup, whole-process CPU, progress and command tails instead of assuming those costs are free.

Qualify both complete source copies, pinned formatting/TypeScript, six package identities and real route worker before one baseline. Inspect normal activity, errors and exact owned cleanup before releasing each next run. Use the unchanged 30-second measured phase and 300-second watchdog, with external observer, CPU/allocation samplers, counters, forced collection and providers disabled. Relevant current-data memory checks precede canonical retention. Sustained graphical 3× remains open.

[Earlier database attribution](20-database-activity.md) · [Plain-language gaps](bottlenecks.md)

## Full game: failed qualification, index held

All four process groups close normally and pass source/input/owned database/session/directory cleanup checks. There are no reported command, storage, SQL or maintenance errors. The second candidate nevertheless fails the required activity floor: some residents complete only one new plan rather than two. That failure remains part of the result. The final unchanged observation is retained to bracket changing conditions; it does not erase the candidate failure.

| Run | Version          | Actual speed | Command confirmation p95 | New plans / checked meals | Minimum new plans per resident |
| --- | ---------------- | -----------: | -----------------------: | ------------------------- | -----------------------------: |
| 0   | Ordinary         |       2.515× |                    784ms | 39 / 23                   |                              2 |
| 1   | Additional index |       2.527× |                    699ms | 40 / 24                   |                              2 |
| 2   | Additional index |   **1.717×** |              **1,427ms** | 27 / 12                   |                 **1 — failed** |
| 3   | Ordinary         |       2.330× |                    824ms | 37 / 21                   |                              2 |

Mean progress **2.422→2.122×** is12.4%lower. Mean per-run p95 confirmation **804→1,063ms** is32.2%worse and is not a pooled percentile. Descriptive CPU per processed game second rises7.0%; completed work differs. The first candidate is close to its baseline, while the second shows widespread longer requests, including character-evidence insertion and an authorization read. Host load changes, but load alone does not explain or excuse the result. There is no causal proof the index produces the entire slowdown, and there is **no demonstrated whole-game gain**.

Each candidate's index is16,384bytes at cutoff. Restoration takes53.98/61.60/55.30/53.32seconds respectively, outside gameplay timing. All issued commands are accepted, but the slow candidate skips five busy input offers and completes fewer residents' meals; these omissions are not hidden. The query-plan reduction remains valid and insufficient for retention by itself.

Decision: **hold the index privately; canonical memory/schema code is unchanged**. Current-data memory checks that were conditional on retention have not run; they are not claimed or waived. The next diagnosis looks at a broader whole category rather than accepting the favorable first pair or repeatedly rerunning until one looks good. Raw `/private/tmp/ol-pf139-aged-comparison-20261015-a.json` links all four observations. Additional/cumulative provider cost $0.
