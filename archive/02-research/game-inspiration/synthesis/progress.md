# Synthesis progress and evidence rules

[Topic map](README.md) · [Game coverage](coverage.csv) · [Game source inventory](subjects.csv) · [World coverage](world-coverage.csv) · [Source and goal map](source-and-goal-map.md) · [Assessment evidence](assessment-records.md) · [Focused intelligence/simulation pass](../research-progress-intelligent-simulation-2026-10-14.md).

**Scope:** these records track assessment and incorporation into the 35 learning topics. They do not replace per-game or world research ledgers, certify that a source dossier is complete, allocate features, or record implementation progress. Building or reviewing the framework is distinct from filling its guides.

## Current snapshot — October 14, 2026

The focused intelligence/simulation pass uses published `Macrofold/OpenLegend` main at `0c12398e32e7c9578e18de07bbe79d39b4827208` as its source base and writes to `research/intelligent-simulation-2026-10-14`. Earlier structural-review provenance is retained below. Counts are recomputed from the matrices and inventory, not a second per-source status list.

| Measure | State |
| --- | --- |
| Topic pages | 35: 30 unfilled synthesis shells, the NPC guide with a completed focused intelligence/simulation pass, and FUN, CREATE, DISCOVERY and PRODUCTION routes to existing research. |
| Game/case sources | 176 stable keys: 167 roster subjects, the unnumbered EVE Online essay case and eight new unnumbered topic-only subjects. |
| Available game/case sources | 150 original dossier files and ten scoped sources: EVE Online plus nine topic-only dossiers. Availability is not full research certification. |
| Queued game sources | 16 of G150–G166 remain queued; G159 now has a focused dossier. No claim about unpublished branch work. |
| Game matrix | 176 × 35 = 6,160 cells: 4,932 U, 526 W, 672 X and 30 I. |
| NPC column | 30 scoped incorporations, 130 U and 16 W. The focused pass does not complete every source or all relationship subtopics. |
| World matrix | Unchanged: 29 listed world dossiers × 35 = 1,015 cells: 903 U and 112 X. |
| New incorporation | Thirty dated source-to-NPC assessments link exact source scopes and stable lessons. No other topic or world cell is advanced by this pass. |
| Existing owners | X retains unreconciled evidence, not an assertion that earlier learning is absent. |

The corrected game matrix was byte-checked against a locally validated expected document before publication: blob `9c090e25e3fb106c48cd7679b4a3f3d5cd0e9f46`, published in commit `02966e0bae31482b1f5d06191a687506f82c2593`. The check preserved the baseline's exact bytes before applying only 22 existing NPC changes and eight new rows, then verified 176 unique keys, 35 unique topic columns, equal row widths and valid codes. This is a document-integrity check, not a runtime test.

Update this snapshot from the actual matrices when coverage changes. Do not inflate completion by calling a source available, by citing a summary, or by adding a research heading. A structural review may read source material to improve questions without completing the relevant source-to-topic assessment.

## What a cell means

`coverage.csv` is the sole per-game/per-topic status table. `world-coverage.csv` is the sole per-fictional-world/per-topic table, using the same topic columns and status codes. Their source kinds are distinct; neither is a duplicate status owner for the other. `subjects.csv` owns game identities and availability; world keys resolve to the corresponding file in the world library. Assessment records own evidence, not a second current status list.

| Code | Meaning | Required evidence |
| --- | --- | --- |
| U | Unassessed for this particular topic | No incorporation is claimed. A candidate route, title or metadata read does not advance the status. |
| W | Waiting for an available dossier or scoped source | Identify the unavailable source and its location/status. Not a finding of irrelevance or permission to start unrelated research. |
| X | Existing or branch-owned coverage not yet reconciled | Inspect the actual owner and its source trail before assigning a research outcome. |
| R | Review in progress | A record names the source revision, sections being reviewed and remaining scope. |
| A | Assessed; relevant evidence identified but not incorporated | A record describes findings, counterevidence and the intended destination. |
| I | Incorporated into the substantive topic synthesis | A record links the exact source revision/sections and stable destination lesson anchors; the agreed source scope for this pair has been addressed and reviewed. |
| N | Assessed; no material contribution or intentionally excluded | A record gives the reviewed scope and reason. Absence can itself supply a counterexample; do not blanket-exclude by genre or source medium. |
| B | Blocked after beginning review | A record states the evidence/access gap, partial work and next action. |
| S | Needs refresh | A record names changed source material, affected lessons and review still needed; preserve earlier evidence. |

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

| Game availability code | Meaning |
| --- | --- |
| M | Dossier exists under `../dossiers/<game_key>.md` on the inspected main baseline. Availability is not a new quality or completion certification. |
| T | A scoped source is available, not a completed full-game dossier. Current sources are EVE Online in the [creator-content essay](../essays/player-created-content-modding-and-marketplaces.md) and the nine topic-only files in the [intelligence/simulation inventory](../research-progress-intelligent-simulation-2026-10-14.md). Assessment remains limited to the actual evidence. |
| P | Rostered/queued subject with no available scoped dossier on the inspected snapshot. The [expansion ledger](../research-progress-expansion-2026-10-13.md) and current roster retain wider research authorization/status. |
| E | Available only on an explicitly inspected external branch/snapshot; record its exact route. No current row needs this code after Songs of Syx merged. |
| C | Contextual candidate whose actual source is not yet available; record the gap. No current row needs this code after the Starfield/EVE sources became available. |

**Current identities:** Songs of Syx remains G149; Starfield remains G167; Shadows of Doubt retains G159; EVE Online remains unnumbered and scoped. All 168 inherited keys are preserved. The eight new keys are unnumbered rather than assigned guessed roster numbers. Original Creatures is not substituted for Creatures 3 or Docking Station. The earlier duplicate G149 was resolved by the merged source work, not by inventing a new assignment during this review.

For `world-coverage.csv`, `world_key` is the exact dossier basename under `../../worldbuilding/worlds/`. The original 28 keys came from the inspected [world index](../../worldbuilding/README.md); the baseline files are available, but no new per-world assessments are implied. The later D&D dossier uses `29-dungeons-and-dragons`; its 35 cells remain U until assessed. Supplementary D&D game studies remain discoverable from the game hub and source map without renumbering the original game snapshot. Record continuity and source revision in the evidence record. Add later worlds or tabletop sources only after inspecting their identity and scope; do not guess keys or assume an uninspected referenced addition was included.

Supporting world essays, game essays, source atlases and current goal/design documents are listed in the [source and goal map](source-and-goal-map.md). Cite the relevant passages in assessment evidence; they do not need a second completion matrix or count as newly independent game/world dossiers. Product intent can guide selection without becoming empirical proof that a feature works.

Refresh source availability after an actual merge or publication without granting incorporation. Preserve each assessed revision. Mark S only when later changes materially affect a lesson; unrelated typos do not require rereading every source. Add new authorized game keys to both game CSVs and new world keys to their matrix, with U/W/X as justified, never inferred I/N. New topic columns must be added to both matrices without altering other statuses.

## Working alongside other branches

Edit only the intended source/topic cells and evidence records; preserve other topics, conclusions, source IDs and current owners. Do not duplicate or overwrite the ongoing FUN work or the merged CREATE essay. A writer can finish a selected topic without another agent completing first. This framework grants no branch-merging or history-rewriting authority.

## Verification and remaining work

The framework review delivered the source/goal review, organized topic set, skeletons, template and tracking. The subsequent intelligence/simulation pass fills NPC at its declared 30-source scope and adds general research. Thirty other shells remain unfilled; four existing owners require scoped coverage reconciliation. The NPC guide's wider source and relationship coverage is not complete. World essays were read for structural coverage, not falsely marked incorporated into each new guide.

Check unique source keys and topic columns, valid codes, equal row widths, expected source identities, preserved existing cell meanings, working local paths/anchors and the actual affected diff. These are documentation checks, not game execution, fresh verification of every inherited fact, or a whole-archive audit. Check results belong in the handoff or focused review record, not fabricated assessment entries.

## Research, design and implementation are separate

Use the [template](main-topic-template.md) for actual scoped proposals. Their ND identity and design disposition remain in [Future work needing design](../../../../docs/maintainers/needs-design.md), with reciprocal topic and eventual feature-spec/technical-design links. The technical design defines modules; the existing focused maintainer tracker owns implementation progress. No new ND entries are allocated by a topic or source-coverage row.

Research headings do not count as registered features. Completing a design does not complete research incorporation, runtime delivery, player evidence or a whole project. Keep the existing rules for design authorization, spending, privacy and accepted world/engine boundaries.

## Historical initialization and corrections

The initial framework was based on published main `7a576214fbb9891b2e9f742db56bbeccaa3a58a1`, with expansion material inspected at `7bef5a1e70adaa14c8a172f6b6ec2f076d6a164e`. It had 26 new guides plus four existing topics, 168 game keys and 5,040 cells: 3,874 U, 494 W and 672 X. Songs of Syx was external-only; Starfield's then-conflicting G149 and EVE were contextual candidates. Those dated facts are retained as provenance, not current warnings.

The broader review used main `74e081a2ddc39a18da1ffe3357ffc298a4f14dce`, added five topic columns and the separate world matrix. It updated Songs of Syx availability, Starfield's canonical ID/availability and EVE's scoped availability. Its only changes to pre-existing game/topic cells were Starfield and EVE's 52 W-to-U transitions for newly available source material; it inferred no I/N statuses. That snapshot had 168 game sources and 5,880 cells: 4,681 U, 527 W and 672 X. The later world integration at `467e7f1be02f2a3e9bb69ebb83bfdef435483c9e` added D&D as unassessed, leaving the structural-review scope unchanged.

The focused October 14 intelligence/simulation pass changes 21 existing available NPC cells from U to I and G159's NPC cell from W to I, backed by assessment records. It adds eight topic-only rows with NPC I and every other topic U. Other inherited topic statuses and the world matrix remain unchanged. This advances useful research without claiming a full pass over every source, changing full-game completion or allocating implementation work.
