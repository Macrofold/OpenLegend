# Why storing searchable experiences takes time

October 16, 2026. **Completed query-plan diagnosis. No runtime optimization adopted.**

The current compact-write game identifies two recurring costs outside that prototype: inserting searchable character-experience records takes 1.663 seconds in 95 requests, and reconciling whether memories remain usable / need search preparation takes 1.160 seconds in 62 requests. These are database elapsed times in a thirty-second diagnostic, not pure CPU or promised removable savings. Mixed statements retain their complete cost rather than attributing it to one table.

First trace the existing memory owner and transaction adapter, and inspect its actual execution plans before changing its algorithm. The relevant operations preserve each character's perspective, forgetting, corrections, summary dependencies, search eligibility and durable indexing requests. No provider is needed to study their SQL work, and disabling paid AI does not remove these writes.

## Selected bounded measurement

Use the exact qualified PF16.174 compact candidate, with no game/source/schema/rule change. A private main-thread probe (estimated 50–90 logic lines) wraps the existing database query method. For the two exact production statement families above, collect at most two examples each: the first example and a later example with at least 100 parameters. The probe must be explicitly armed after installation / successful ordinary resume, and only runs inside the existing writer transaction. It must neither open a new outer transaction nor install a world before its real commit.

For a selected request, run its actual parameterized `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` inside a savepoint, roll it back, then execute the original request normally. Verify complete equality of the three tables it could change (`recall_sources`, `memory_vectors`, `memory_index_queue`) before and after the rolled-back explanation. Their current definitions have no sequence allocation or external effects. Savepoint failure stops the trial; never catch and continue after a damaged transaction. Plans may include private synthetic fixture text and stay outside the repository. Retain at most four plans / 8 MiB output, at most 8 MiB per comparison snapshot / 64 MiB combined snapshot bytes; the existing 300-second outer deadline remains. No manual ANALYZE, settings change, index change or paid provider.

Before gameplay, qualify source identity / formatting / syntax / worker inactivity and the probe's selection rules. Adapt the already qualified fixed-world sixteen-plan actual-SQL helper to arm the probe, retain its full logical-world / all-131-canonical-table / current load / actual rollback / privacy comparisons and compare against the unchanged prior compact result. Original source/static/worker/native/storage evidence is reusable only by exact unchanged identity. Every explained statement must prove its savepoint left all three potentially changed tables intact, and then return the original real result. The qualification may have fewer than four qualifying examples; that is recorded coverage, not manufactured large input.

Only a successful qualification can release one separately pinned 30-second actual HTTP/SSE game, with ordinary independent presence, seventeen people / forty animals / finite travel-work-food, full life/source/unpaused/error/owned-cleanup gates and existing report bounds. Preserve every speed/input/activity failure; extra explanation/verification writes and reads make this a diagnostic, not a capacity test. Require both selected examples of each family or report missing coverage explicitly.

Inspect actual rows, loops, buffer reads/writes, planning/execution time and any JIT compilation before choosing a rewrite. The possible next changes are still unselected. Counts of parameters or query text length alone do not prove that parsing, scans, indexes or JIT caused the measured delay.

## Qualification before gameplay

Syntax, formatting, exact statement-family selection and an actual worker that must leave the probe inactive all pass. The complete private probe and fixed-helper difference are reviewed. Its scope grows slightly to roughly 90–120 logic lines because SQL measures snapshot bytes before loading rows, verifies every affected table, handles ordinary browser-style resume, and restores the wrapped methods at shutdown. No game file changes.

The fixed-world SQL qualification closes normally with exact owned cleanup and unchanged source guards. All sixteen ordinary plan admissions retain their real completion information: sixteen saves, 128 ordinary requests, plus sixteen existing verification reads. Complete logical-world bytes and every one of the 4,037 canonical rows match the earlier compact result across all 131 tables. Public/speech/private audiences, current load/reopen and actual deliberate SQL failure rollback pass. Only ordinary cross-run job wall-clock fields differ; no stored fields are masked.

Two actual statements qualify: a 589-parameter experience insert and a 67-parameter eligibility reconciliation. Both explanations roll back with complete before/after equality of all three potentially changed tables, then execute the original statement. The probe adds 32 diagnostic requests and compares 1.86 million snapshot bytes. There is no later large eligibility example in this fixed scenario; that missing coverage remains explicit. These fixed-world timings are not a performance comparison.

Private comparison: `ol-pf176-fixed-comparison-20261016-a.json`, SHA-256 `2ff3a3a0dba89ed6e9ec6ae803e3da3ebaecf00030f9d6ec1845777efcf97da3`. Actual plan report SHA-256: `9058bed81fe3254409939ce644978d6f32668e86dc5ef437375f2a5dde58cffc`. All original output/snapshot/time bounds remain unchanged.

Those gates release one 30-second actual game: `ol-pf176-current30-launch-plan-20261016-a.json`, SHA-256 `93f2bd4f2412aada9da342e2d51326becec973f0c6709dc6b6031124d11f3890`; release SHA-256 `b03b6b453c26c5be85576c348d4a74b7e5a7532064d116ce3daf247f5e1c7aea`. The first example can itself be large; the sampling rule requires an initial example and a later example with at least 100 parameters, rather than inventing a small request. Gameplay coverage and plans are pending.

## Actual game: all four selected plans captured

The 30.223-second game completes with 48 accepted resident plans, 32 matched meals, 29 confirmed walks and all seventeen people / forty animals alive. Sources, physical travel, finite resources, unpaused clock, zero errors/providers and exact normal owned cleanup all pass. Actual speed **2.896×** and walking p95 **757 ms** still fail. This is an intrusive explanation run, not an improvement over another version.

All four selected examples finish; all three potentially changed tables match completely before/after every explanation. The probe adds 64 diagnostic requests and compares 4.92 million bytes. All bounds pass. Both initial requests are already large, so these are initial/later samples rather than a promised small-versus-large comparison.

| Operation during real play            | Input parameters | Existing searchable rows | Planning | Actual execution |
| ------------------------------------- | ---------------: | -----------------------: | -------: | ---------------: |
| Insert 228 new searchable experiences |            4,332 |                      768 | 1.340 ms |    **18.261 ms** |
| Reconcile 228 affected experiences    |              461 |                      996 | 1.270 ms |     **4.533 ms** |
| Insert 15 new searchable experiences  |              285 |                      996 | 0.572 ms |     **0.965 ms** |
| Reconcile 119 affected experiences    |              243 |                    1,417 | 1.440 ms |     **3.097 ms** |

The 228-row insert's incoming-row scan takes **0.543 ms**; its complete insert node takes **16.544 ms**, plus separately reported foreign-key trigger work. It reports 6,263 shared-buffer hits, no shared-buffer reads and forty shared-buffer writes. These counters include repeated accesses and are not unique pages or disk time. This points toward insertion/constraint/index maintenance rather than expensive generation of the incoming rows in that sample. It does **not** assign all insertion time to indexes. The table has fourteen secondary lookup indexes in addition to its primary key; an explicit index-removal diagnostic can test their contribution.

The reconciliation examples revisit 228 and 119 existing rows but actually update zero eligibility rows and add no search-index requests. Their indexed update checks remove each already-correct row. This identifies repeated no-change checking, without proving it can safely be omitted when forgetting, corrections, a related experience or an indexing model changes. No whole-history scan or JIT compilation runs in these four samples. There are dormant sequential-scan plan branches with **zero loops**; their presence in a plan is not evidence that those scans happened. Buffer-read counts do not rule out other I/O or scheduling delays, and four samples cannot explain every prior outlier.

No runtime optimization is adopted here. Next candidates must be separately selected and compared; the query plans alone do not establish the complete game's removable saving.

Private raw game SHA-256: `428ff251763f29702e2e69689d7675098905ce32cca8b33d5d92bea0d0cb64cc`. Complete structural readback: `ol-pf176-plan-readback-20261016-a.json`, SHA-256 `24457f855e914a770c1bba7e6c0ff3924c369ef43abf61f4b525fd9d1589cb96`. It checks all input hashes, all four rollback snapshots, measured-play placement and complete game verification, and retains every structural node. Nested timings / reused query parts and their buffer counters are inclusive and must not be added together. Additional and cumulative game-provider/Jev cost remains **$0**.
