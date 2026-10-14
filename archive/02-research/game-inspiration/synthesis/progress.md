# Synthesis progress and evidence rules

[Topic map](README.md) · [Game coverage](coverage.csv) · [Game source inventory](subjects.csv) · [World coverage](world-coverage.csv) · [Source and goal map](source-and-goal-map.md) · [Assessment evidence](assessment-records.md).

**Scope:** these records track assessment and incorporation into the 35 learning topics. They do not replace per-game or world research ledgers, certify that a source dossier is complete, allocate features, or record implementation progress. Building or reviewing the framework is distinct from filling its guides.

## Current snapshot — October 14, 2026

Baseline: published `Macrofold/OpenLegend` main at `74e081a2ddc39a18da1ffe3357ffc298a4f14dce`. The later world-library integration at `467e7f1be02f2a3e9bb69ebb83bfdef435483c9e` adds the D&D world dossier as unassessed; the original structural-review scope remains unchanged. Counts below are recomputed from the matrices, not a second per-source status list.

| Measure                     | State                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Topic pages                 | 35: 31 unfilled synthesis shells plus FUN, CREATE, DISCOVERY and PRODUCTION routes to existing research       |
| Game/case sources           | 168 stable keys: 167 roster subjects plus the unnumbered EVE Online essay case                                |
| Available game/case sources | 150 dossier files and 1 scoped essay case; availability is not full research certification                    |
| Queued game sources         | 17 G150–G166 subjects on this inspected baseline; no claim about unpublished branch work                      |
| Game matrix                 | 168 × 35 = 5,880 cells: 4,681 U, 527 W and 672 X                                                              |
| World matrix                | 29 listed world dossiers × 35 = 1,015 cells: 903 U and 112 X                                                  |
| New incorporation           | No completed assessments, incorporated pairs or not-applicable exclusions are claimed by the framework review |
| Existing owners             | X retains unreconciled evidence, not an assertion that earlier learning is absent                             |

Update this snapshot from the actual matrices when coverage changes. Do not inflate completion by calling a source available, by citing a summary, or by adding a research heading. A structural review may read source material to improve questions without completing the relevant source-to-topic assessment.

## What a cell means

`coverage.csv` is the sole per-game/per-topic status table. `world-coverage.csv` is the sole per-fictional-world/per-topic table, using the same topic columns and status codes. Their source kinds are distinct; neither is a duplicate status owner for the other. `subjects.csv` owns game identities and availability; world keys resolve to the corresponding file in the world library. Assessment records own evidence, not a second current status list.

| Code | Meaning                                                      | Required evidence                                                                                                                                               |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U    | Unassessed for this particular topic                         | No incorporation is claimed. A candidate route, title or metadata read does not advance the status.                                                             |
| W    | Waiting for an available dossier or scoped source            | Identify the unavailable source and its location/status. Not a finding of irrelevance or permission to start unrelated research.                                |
| X    | Existing or branch-owned coverage not yet reconciled         | Inspect the actual owner and its source trail before assigning a research outcome.                                                                              |
| R    | Review in progress                                           | A record names the source revision, sections being reviewed and remaining scope.                                                                                |
| A    | Assessed; relevant evidence identified but not incorporated  | A record describes findings, counterevidence and the intended destination.                                                                                      |
| I    | Incorporated into the substantive topic synthesis            | A record links the exact source revision/sections and stable destination lesson anchors; the agreed source scope for this pair has been addressed and reviewed. |
| N    | Assessed; no material contribution or intentionally excluded | A record gives the reviewed scope and reason. Absence can itself supply a counterexample; do not blanket-exclude by genre or source medium.                     |
| B    | Blocked after beginning review                               | A record states the evidence/access gap, partial work and next action.                                                                                          |
| S    | Needs refresh                                                | A record names changed source material, affected lessons and review still needed; preserve earlier evidence.                                                    |

I can represent a counterexample, disagreement or carefully scoped absence; it need not endorse a rule. Merely mentioning a source, quoting a passage or adding a bibliography entry is not incorporation. Reading one excerpt does not establish completion of all relevant source coverage.

## How to assess and incorporate one source

1. Resolve the stable game key or world key and declared edition/continuity. Locate the relevant dossier, earlier chapter, mechanics study and supplements. Read enough contiguous material to understand the interaction or fictional context and its qualifications.
2. Create a record in `assessment-records.md` and mark R in the appropriate matrix. Preserve existing game record IDs as `<TOPIC>--<game_key>`; use `<TOPIC>--world--<world_key>` for world records. Record source kind, paths, immutable commit/blob revisions, sections actually read, date and reviewer.
3. Identify the contribution, supporting and contrary material, explanation, limits and alternatives. Keep player testimony, literary interpretation, developer intent, product goals and runtime evidence distinct. Mark A when assessment is complete but the synthesis has not been written; use B for a real blocking gap.
4. Incorporate useful evidence into the guide's comparisons and lessons, not a disconnected appendix of summaries. Give actual lessons stable anchors such as `econ-l001`. Cite the dossier and its underlying source where needed. Do not treat the same franchise, underlying report and later summary as independent corroboration.
5. Record exact destination anchors, contribution, qualifications and actual review. Mark I only after checking source-to-lesson links and the resulting diff. Use N with a concrete reason when no contribution belongs here. There are no automatic bulk N decisions.
6. Update the relevant matrix and topic wording in the same change. Replace shell-only wording once real evidence is incorporated. Follow existing commit and review policies rather than create a separate gameplay-test or implementation workflow.

A source's available revision is not its assessed revision until read. The record may name the incorporation commit after it exists; same-change relative anchors and repository history are sufficient without an invented self-referential hash. Preserve several dated assessments when editions or later revisions matter. Current status remains in the matrix, not repeated in every record.

## Reading progress without misleading percentages

Report assessed, incorporated, excluded, in progress, waiting/blocked, unassessed and unreconciled existing coverage separately. At the named source scope, A/I/N are finished assessments; only I is incorporated. I/N are resolved dispositions, but N is not incorporated evidence. R/W/X/B/S remain open; stale historical incorporation is not current completion.

State the source kind and denominator. For games, distinguish available dossiers, available scoped cases and queued work. Report world coverage separately; adding a literary example does not advance a game's row or prove audience enjoyment. Shared intellectual-property worlds and their games can both contribute, but that is not automatically two independent demonstrations.

A full topical pass is complete only for an explicit source snapshot and scope, with the in-scope pairs resolved and lessons reviewed. A useful partial guide is allowed. Do not hide difficult cases by changing the denominator or require every guide to extract a positive lesson from every source. The purpose is useful comparison, not an invented quota of universal rules.

## Source inventory and branch boundaries

Game keys are dossier basenames without `.md`; titles and G numbers are navigation labels. Edition boundaries belong to the roster and dossiers. Paired games stay separate where rostered, and a supplemental case never silently becomes a full-game study.

| Game availability code | Meaning                                                                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M                      | Dossier exists under `../dossiers/<game_key>.md` on the inspected main baseline. Availability is not a new quality or completion certification.                                                                                                                       |
| T                      | A scoped source is available, not a full-game dossier. Current case: EVE Online in [Player-created content, modding tools and marketplaces](../essays/player-created-content-modding-and-marketplaces.md). Its assessment must remain limited to the actual evidence. |
| P                      | Rostered/queued subject with no dossier on the inspected baseline. The [expansion ledger](../research-progress-expansion-2026-10-13.md) and current roster retain research authorization/status.                                                                      |
| E                      | Available only on an explicitly inspected external branch/snapshot; record its exact route. No current row needs this code after Songs of Syx merged.                                                                                                                 |
| C                      | Contextual candidate whose actual source is not yet available; record the gap. No current row needs this code after the Starfield/EVE sources became available.                                                                                                       |

**Current identities:** Songs of Syx remains G149; Starfield is G167 in the merged roster; EVE Online remains unnumbered and scoped. Preserve all 168 existing keys. The earlier duplicate G149 was resolved by the merged source work, not by inventing a new assignment during this review.

For `world-coverage.csv`, `world_key` is the exact dossier basename under `../../worldbuilding/worlds/`. The original 28 keys came from the inspected [world index](../../worldbuilding/README.md); the baseline files are available, but no new per-world assessments are implied. The later D&D dossier uses `29-dungeons-and-dragons`; its 35 cells are U until assessed. Supplementary D&D game studies remain discoverable from the game hub and source map without renumbering the original game snapshot. Record continuity and source revision in the evidence record. Add later worlds or tabletop sources only after inspecting their identity and scope; do not guess keys or assume an uninspected referenced addition was included.

Supporting world essays, game essays, source atlases and current goal/design documents are listed in the [source and goal map](source-and-goal-map.md). Cite the relevant passages in assessment evidence; they do not need a second completion matrix or count as newly independent game/world dossiers. Product intent can guide selection without becoming empirical proof that a feature works.

Refresh source availability after an actual merge or publication without granting incorporation. Preserve each assessed revision. Mark S only when later changes materially affect a lesson; unrelated typos do not require rereading every source. Add new authorized game keys to both game CSVs and new world keys to their matrix, with U/W/X as justified, never inferred I/N. New topic columns must be added to both matrices without altering other statuses.

## Working alongside other branches

Edit only the intended source/topic cells and evidence records; preserve other topics, conclusions, source IDs and current owners. Do not duplicate or overwrite the ongoing FUN work or the merged CREATE essay. A writer can finish a selected topic without another agent completing first. This framework grants no branch-merging or history-rewriting authority.

## Verification and remaining work

The current task delivers the source/goal review, organized topic set, skeletons, template and accurate tracking—not completed substantive syntheses. All 31 new guides remain unfilled; four existing owners require scoped coverage reconciliation. The world essays were read for structural coverage, not falsely marked incorporated into each new guide.

Check unique source keys and topic columns, valid codes, equal row widths, expected source identities, preserved existing cell meanings, working local paths/anchors and the actual affected diff. These are documentation checks, not game execution, fresh verification of every inherited fact, or a whole-archive audit. Check results belong in the handoff or focused review record, not fabricated assessment entries.

## Research, design and implementation are separate

Use the [template](main-topic-template.md) for actual scoped proposals. Their ND identity and design disposition remain in [Future work needing design](../../../../docs/maintainers/needs-design.md), with reciprocal topic and eventual feature-spec/technical-design links. The technical design defines modules; the existing focused maintainer tracker owns implementation progress. No new ND entries are allocated by a topic or source-coverage row.

Research headings do not count as registered features. Completing a design does not complete research incorporation, runtime delivery, player evidence or a whole project. Keep the existing rules for design authorization, spending, privacy and accepted world/engine boundaries.

## Historical initialization and corrections

The initial framework was based on published main `7a576214fbb9891b2e9f742db56bbeccaa3a58a1`, with expansion material inspected at `7bef5a1e70adaa14c8a172f6b6ec2f076d6a164e`. It had 26 new guides plus four existing topics, 168 game keys and 5,040 cells: 3,874 U, 494 W and 672 X. Songs of Syx was external-only; Starfield's then-conflicting G149 and EVE were contextual candidates. Those dated facts are retained as provenance, not current warnings.

The broader review uses main `74e081a2ddc39a18da1ffe3357ffc298a4f14dce`, adds five topic columns, and adds the separate world matrix. It updates Songs of Syx availability, Starfield's canonical ID/availability and EVE's scoped availability. The only changes to pre-existing game/topic cells are Starfield and EVE's 52 W-to-U transitions for newly available source material. No existing game key, assessed revision, completed status or original dossier is removed, and no I/N status is inferred.
