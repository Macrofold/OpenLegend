# Send saved rows as one structured batch

October 16, 2026. **Database correctness passes. Actual timing stops at the third run because the test driver lets the player’s presence expire. No complete performance comparison or adoption exists.**

The current database recording spends 3.574 summed seconds parsing and preparing writes in thirty seconds. One request expands 4,949 separate values and takes 262 ms inside PostgreSQL, including 180 ms before execution. Test a compact encoding at the shared owner that writes the world’s stored records, rather than changing many individual gameplay systems.

| Proposed change                                                                                       | Intended saving                                                                                      | Possible cost or failure                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Send a batch of rows as one JSON value, then expand it using the target table’s existing column types | Shorter SQL text, fewer separate bound values, and a query shape that does not change with row count | Creating/decoding the JSON costs CPU and can enlarge encoded strings. Type conversion and ordering must match the original writer.   |
| Keep the existing central writer and transaction                                                      | Preserve the same game information and atomic save boundary                                          | Different encoded sizes and parameter counts may change which independent writes fit in an existing bounded group. Measure that too. |

## Scope, behavior and implementation plan

Prepare fresh control/candidate copies of the qualified PF16.171 source. Both keep its newer world-editing library, stable recent-result storage, 60-game-second idle animal reviews, corrected HTTP timers and optional reporting. Change only the candidate’s world-record insertion block in `apps/server/src/world-records.ts` (estimated 10–25 logic lines). No schema, persisted format, record, history, AI, provider, authorization, command receipt or gameplay rule is removed. This is a private experiment, not accepted behavior or integration.

Use the existing trusted table name and explicit column list. Encode each already-prepared row as an object keyed by those columns. Use PostgreSQL’s `jsonb_populate_recordset` with the target table’s own composite type; select the same columns and explicitly preserve batch row order using ordinality. Retain insert-only versus upsert behavior, original conflict clauses, per-table grouping, parent-before-delete order, all row/byte batch construction limits, existing independent-write grouping limits and actual awaited COMMIT. Preserve the current driver’s replacement of isolated UTF-16 surrogates before JSON escaping, using Node’s existing text conversion utility; do not silently reject previously storable text. No new dependency, generic SQL parser, parallel writable store or old-save adapter.

Source review must trace the actual table definitions, supported extra-column values, original byte/parameter accounting, grouping and transaction/row-count ownership. Existing source assessment finds the world-record columns already come from the canonical record schema; deriving rows from them avoids a duplicate type registry. The plan intentionally excludes memory-source/history query rewrites: establish the central record transport first. A positive result would justify considering their separate owners later, not presume their benefit.

## Required qualification before timing

Inspect the complete private delta, run formatting / executable-equivalence / TypeScript, validate all 443 source/package/dependency bindings and the actual six-identity separate route worker. Reuse native computation only by exact identity because no domain/spatial/preparation code changes. Storage qualification must run anew.

Extend the existing actual fixed-time SQL comparison with sixteen ordinary separate native work-plan admissions on each side. Compare the entire saved world, all canonical tables/columns and every operational request difference without masking. Require complete current loading/reopening, public/private audiences and an actual injected pre-COMMIT failure preserving world, revision, receipts and the failed-request result. Keep all previous report/world/table/row/time limits and exact allocated-database/process cleanup. Both versions retain the helper’s normal final success details; the earlier omission experiment is not part of this candidate.

Also exercise the actual world-record writer against temporary tables inside the exactly owned fixture to compare transport behavior without changing the saved world: empty/single/large batches, nulls and empty strings, quotes/backslashes/newlines, emoji and isolated surrogates, finite floating-point extremes, safe large integer positions/revisions, insert-only conflicts, upserts, original row order and uniqueness failures. Drop the temporary tables before current-world validation; their synthetic values are transport checks, not authored gameplay. Preserve original errors and real transaction rollback. No timing result is inferred from these functional checks. If values, failures, order or current loading differ, stop and document the defect before any game timing.

The actual SQL plan must show the new typed expansion rather than thousands of placeholders. Retain complete query shape / batch size / bound-value counts and actual execution diagnostics on representative small and larger prepared batches inside rollback; do not refresh statistics or alter shared settings. More compact SQL is not enough if decoding makes it slower.

Only a separately recorded PASS of all these gates releases four fresh 120-second control/candidate/candidate/control ordinary HTTP/SSE games, under existing 300-second outer / 4 MiB report limits and the same finite real travel/work/food/player activity. No browser, sampler, forced collection or paid model. Preserve all clock/input/skip/activity failures and normal source/life/error/exact-owned-cleanup gates, compare complete saving and CPU per game second/meal, and do not choose a favorable pair. No automatic adoption; graphical/full-day/growing-world/real-AI acceptance remains required for the overall task.

PostgreSQL’s [typed JSON row expansion](https://www.postgresql.org/docs/14/functions-json.html) defines how fields and nulls convert to the target column types. This supports the proposed transport; it does not establish its performance or prove equivalence for our records.

## Private source and static qualification

Both new private versions pass formatting / execution-equivalent formatting, TypeScript, all 443 source/package/dependency bindings and actual six-identity separate route-worker checks; all eight processes close normally. Control SHA-256 `f854388de51c598ebc1c29a6aa88f31a2304a5a95edc122990d85cdc44d6bb2c`; formatted candidate `0d4d37249c2437a29f7bbadc9e43ad89e466d645faec3ca2f735e12d83389b60`. Only `world-records.ts` differs. A five-case Node 22 check confirms the standard text utility matches the old UTF-8 conversion for ordinary text, emoji and paired/isolated surrogates. This is not yet a database transport proof.

The fixed-time sixteen-admission check may reuse the qualified current-format 15-game-second opening at game time zero, where no animal time advances. Both actual timing constructors still use the unchanged full 60-game-second policy. No old saved policy is converted. At that stage, the new storage / temporary-value / query-plan / rollback / complete cross-version comparison gates were still open; no SQL or timing run had been released.

## First control qualification fails on synthetic placement input

The ordinary writer correctly rejects the first synthetic placement with a check-constraint error before any native plan or changed-writer run. The test incorrectly combines fields for being in the world with fields for being attached to something. Current table constraints require those sets of fields to be separate. This is a qualification-input defect, not a demonstrated game or candidate regression. The original failed source/report remains unchanged. Its process closes normally, exact generated database / sessions are 0 / 0, owned directory is absent and all source guards pass.

Before a new attempt, correct only the private verifier in fresh b files: generate valid world-position and assembly-attachment rows, testing finite numbers in the active coordinate fields and nulls in the inactive fields. Continue to use the actual constraints; do not weaken them. Also match the actual database adapter’s existing sanitized error message, which carries the SQL code in its text rather than as an error-object property. Require the same unchanged rejection message and no partial rows. The game sources, bounds, fixtures, checks and complete comparison requirements stay unchanged. Requalify private helper formatting/syntax and full delta before a fresh control/candidate functional attempt. No timing release follows from the failed control.

Failed report `/private/tmp/ol-pf173-sql-0-control-20261016-a.json`; owned process 99768 / database `openlegend_fixture_c6a01acbb1214b7dbb09c3e9fdb2d92f` close normally. Helper source is `ol-pf173-transport-qualification-20261016-a.mjs`. In that failed attempt, native/full-world/candidate/timing checks were unrun.

## Corrected complete database comparison passes

Both writers pass all thirteen actual temporary-table checks. Every column of all **1,011 synthetic rows** matches across versions, including floating-point extremes, nulls, UTF-8 text replacement, ordering and refusal behavior. New parents and children commit correctly together; moving a child finishes before restricted deletion of its old parent. Temporary tables are verified absent on the actual writer connection before real-world loading.

The sixteen separate native plan admissions also pass on both sides: sixteen saves, 128 ordinary requests and sixteen separately counted verification reads each. The complete logical world (1,072,438 bytes) and all **131 canonical tables / 4,037 rows** match exactly, with zero differing cells. Current loading/reopening, public/private audiences, completed request/receipt facts and actual pre-COMMIT SQL failure rollback pass. Neither version omits final helper completion details. The only cross-run operational differences are fully reported wall-clock creation/completion values. No comparison field is hidden.

| Actual prepared write     | Ordinary bound values | Compact bound values | Ordinary SQL text | Compact SQL text |
| ------------------------- | --------------------: | -------------------: | ----------------: | ---------------: |
| One placement row         |                    19 |                    1 |         248 bytes |        701 bytes |
| A 526-row placement batch |                 9,994 |                    1 |      21,248 bytes |        701 bytes |

Actual execution plans expand exactly one / 526 rows through the new typed function. The single-row SQL is longer, an explicit possible cost. Complete parameter values still travel in the JSON; this is not deleting their information or proving a smaller total wire payload. Original batch construction limits remain. Functional process durations are not performance comparisons.

Both owned processes close normally without forced termination; exact generated databases / sessions count 0 / 0, owned directories are absent and all source/helper guards pass. Including temporary evidence, each attempt stays within the original combined 64 MiB raw / 16 MiB stored / 25,000-row budget (13,122 retained rows).

Comparison `/private/tmp/ol-pf173-sql-comparison-20261016-b.json`, SHA-256 `23328b46c59bdccdc508d073f5d7166af265b561f96d11d8502ae190fc7885d6`; complete source/static/worker/native-only reuse, both SQL reports/lifecycles and compressed temporary/canonical/operational evidence remain beside it. The original failed a control remains a failure.

## Actual timing series — selected before launch

These complete functional checks release four fresh 120-second ordinary HTTP/SSE games in control / candidate / candidate / control order. Use the same qualified current 17 people, 40 animals, 133 initial objects, finite food, actual travel/work/food cycles and one-hertz player commands on both versions. Only world-record encoding differs. Turn off optional detailed recording, CPU sampling, forced collection, browser and providers. Pin exact source/dependency/worker/native-only/complete new SQL/helper evidence. Keep the existing 300-second outer and 4 MiB report limits.

Require normal exact owned cleanup, complete sources, all people/animals alive, finite stock, continuing matched meals and travel, current unpaused clock, zero routine/storage/HTTP/provider errors, and exact client/server command counts after every phase. Preserve speed, 200 ms walking, skipped-slot and twelve-plan-per-resident volume failures. An integrity/life/source/error/cleanup failure stops the sequence. Otherwise retain all four fixed results and compare both controls with both candidates, including CPU per game second/meal, actual activity, saves, requests, saving time and all input failures. No favorable-pair selection, automatic integration, frame-rate claim or long-play acceptance.

## Actual timing stops at a required continuity failure

| Run order | Version  | Actual speed | Walking p95 | Accepted / skipped inputs | Plans / checked meals | Outcome                                                                |
| --------- | -------- | -----------: | ----------: | ------------------------: | --------------------: | ---------------------------------------------------------------------- |
| 1         | Ordinary |       2.632× |    1,839 ms |                  100 / 18 |             174 / 158 | Functional/source/owned-cleanup checks pass; performance goals fail.   |
| 2         | Compact  |       2.320× |    1,212 ms |                  104 / 14 |             152 / 136 | Functional/source/owned-cleanup checks pass; performance goals fail.   |
| 3         | Compact  |       1.809× |    3,453 ms |                   81 / 38 |             122 / 106 | Player-away condition fails the required continuous-clock check. Stop. |
| 4         | Ordinary |            — |           — |                         — |                     — | Not run: prior phase fails a release gate.                             |

The third run’s exact source/life/finite-stock/travel/error/cleanup checks pass before the reader stops at the clock condition. Later checks in that reader remain unrun. All owned processes and exact databases/directories close normally. Do not compute a completed four-run gain, discard the failed run, or start the final control under this plan.

The driver sends presence only before every fourth command. Slow commands and missed command slots let the gap between two presence submissions reach **12.399 seconds**, exceeding the unchanged twelve-second lease. The receiving call then completes in about 52 ms and restores presence. The player-away condition lasts about **0.412 seconds**; the saved paused flag is true for about 0.181 seconds. That brief interval cannot explain the whole fall to 1.809×, but it independently invalidates continuous play. The real browser sends presence independently every five seconds. Correct the test driver in a separately registered change before another comparison; do not extend the game’s lease or bypass pause checks.

The third run also reports host load 84.70→96.52 on ten logical CPUs. A later independent one-second system sample observes 31 GB used, about 13 GB compressed, 208 swap-ins and 64.27% combined user/system CPU; this is real contention, not attribution of any particular query delay. A names-only CPU snapshot finds other active processes; no unrelated process is stopped. Working-directory checks of two already-ended Node processes provide no ownership evidence. The first unprivileged process-metadata read is denied by the operating-system sandbox; the normal reviewed read-only escalation succeeds.

The source/functional reduction remains established, while actual-game benefit remains unproved. Preserve the original three reports, the third `.review-a.json` failure and the unrun fourth slot under `/private/tmp/ol-pf173-fresh120-*20261016-b`.
