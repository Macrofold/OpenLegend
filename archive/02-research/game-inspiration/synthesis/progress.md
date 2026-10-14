# Synthesis progress and evidence rules

[Topic map](README.md) · [Game-by-topic matrix](coverage.csv) · [Source inventory](subjects.csv) · [Assessment evidence](assessment-records.md).

**Scope:** this tracker owns only the assessment and incorporation of game evidence into the 30 topics in the map. It does not replace the per-game research ledgers, mark new games researched, or record implementation progress. Creation of the empty framework is distinct from completion of its guides.

## Initial snapshot — October 14, 2026

| Measure                 | State                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| New guides              | 26 shells; substantive sections intentionally empty                                                                    |
| Existing/ongoing topics | FUN, CREATE, DISCOVERY, PRODUCTION; existing owners preserved and coverage not reconciled                              |
| Source rows             | 166 approved roster subjects plus 2 explicitly unnumbered/conflicted contextual candidates                             |
| New-guide assessments   | 0 assessed; 0 incorporated; 0 excluded as not applicable                                                               |
| New-guide cells         | 3,874 U cells for 149 available dossier sources; 494 W cells for 19 sources awaiting an available dossier/topical case |
| Existing-owner cells    | 672 X cells; no claim that earlier work is absent or has zero incorporation                                            |
| Matrix size             | 168 game keys by 30 topic columns = 5,040 independent coverage cells                                                   |

These counts initialize the framework, not certify the quality of any dossier or the state of unpublished work. When changing coverage, replace this snapshot with a dated recomputation from the CSV rather than keeping a competing hand-maintained completion list.

## What a cell means

`coverage.csv` is the sole current per-game/per-topic status table. `subjects.csv` supplies stable identities and source availability. The topic map owns column definitions and destinations. Assessment records own evidence, not a second status table.

| Code | Meaning                                                      | Required evidence                                                                                                                                                |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U    | Unassessed for this particular topic                         | No incorporation is claimed. A candidate link or dossier title does not advance this status.                                                                     |
| W    | Waiting for an available dossier or scoped source            | Source availability in subjects.csv explains the wait. This is not a finding of irrelevance or permission to start game research.                                |
| X    | Existing or branch-owned coverage not yet reconciled         | Reserve existing work; inspect the actual owner and its source trail before assigning a research outcome.                                                        |
| R    | Review in progress                                           | An assessment record names the source revision, sections being reviewed and remaining scope.                                                                     |
| A    | Assessed; relevant evidence identified but not incorporated  | A record describes findings, counterevidence and the intended destination.                                                                                       |
| I    | Incorporated into the substantive topic synthesis            | A record links the exact source revision/sections and stable destination lesson anchors. Full agreed source scope for this pair has been addressed and reviewed. |
| N    | Assessed; no material contribution or intentionally excluded | A record gives the reviewed scope and reason. Absence can itself supply a useful counterexample; do not blanket-exclude by genre.                                |
| B    | Blocked after beginning review                               | A record states the concrete evidence or access gap, partial work and next action.                                                                               |
| S    | Needs refresh                                                | A record names changed source material, affected lessons and the review still needed; preserve earlier evidence.                                                 |

An I cell can contribute a counterexample, a disagreement or a carefully scoped absence; it need not endorse a rule. Mentioning a game's name or adding a bibliography entry is not incorporation. A partial excerpt does not establish completion of the dossier's relevant coverage.

## How to assess and incorporate one game

1. Resolve the game by its stable `game_key`, not a bare G number. Locate the actual dossier and its relevant earlier chapter, mechanics studies or supplements. Read enough contiguous material to understand the interaction and reception; keep version and access qualifications.
2. Create the evidence record `<TOPIC>--<game_key>` in assessment-records.md and mark R. Record source paths, immutable commit/blob references, the sections read, date and reviewer. A source's available revision is not the revision assessed until it has actually been read.
3. Identify what the game contributes: concrete player situations, the supporting and contrary accounts, the plausible mechanism, limits and alternative explanations. Mark A when assessment is done but synthesis is still unwritten. Keep B when a real gap prevents a defensible conclusion.
4. Incorporate useful evidence into the owning guide's comparisons and lessons, not a disconnected appendix of game summaries. Give conclusions stable anchors such as `econ-l001`. Cite dossier sections and their underlying sources where needed; compare like metrics and versions and preserve disagreements.
5. Record exact destination file/anchors, contribution summary, remaining qualifications and review evidence. Mark I only after the actual source-to-lesson links and resulting diff are checked. Use N with an explicit rationale when no contribution belongs here. There are no automatic bulk N decisions.
6. Update the matrix and topic header in the same change. Change shell-only wording once real evidence is incorporated. Follow the repository's existing commit/review policies; do not create new gameplay tests, runtime policies or research tasks merely to maintain this tracker.

The record can name the incorporation commit after it exists, but a same-commit relative destination anchor plus the repository history is sufficient; do not invent a self-referential commit hash. One pair's record may retain several dated assessments for different editions or later revisions. Its current status is still owned only by coverage.csv.

## Reading progress without misleading percentages

Report **assessed**, **incorporated**, **excluded**, **in progress**, **waiting/blocked**, **unassessed** and **unreconciled existing coverage** separately. At the current reviewed source scope, A/I/N are finished assessments; only I is incorporated. I/N are resolved dispositions, but N is not incorporated evidence. R, W, X, B and S remain open; stale historical incorporation is not current completion.

For an individual topic, state the number of available sources and queued/contextual sources as well as the numerator. Do not count W or X as completed, or make a guide look finished by dropping difficult games from the denominator. A full topical pass is complete only for an explicitly named source snapshot with every in-scope pair resolved and its lessons reviewed. It can remain usable before it is exhaustive.

No guide must contain a lesson from every game. The goal is useful comparative understanding, not a quota of extracted rules or a promise of universal best practices. Global research/packet-preservation gates remain with the original ledgers.

## Source inventory and branch boundaries

The stable key is the dossier basename without `.md`. Titles and G numbers are navigation labels only. Edition boundaries continue to belong to the research roster and dossier. Paired games remain separate where rostered; supplemental cases must not silently become full researched subjects.

| Availability | Snapshot meaning and location                                                                                                                                                                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M            | Dossier present under `../dossiers/<game_key>.md` on inspected GitHub main `7a576214fbb9891b2e9f742db56bbeccaa3a58a1`. This is file availability, not a fresh full research certification.                                                                                                                                        |
| E            | Songs of Syx dossier present only in the inspected [expansion snapshot](https://github.com/Macrofold/OpenLegend/blob/7bef5a1e70adaa14c8a172f6b6ec2f076d6a164e/archive/02-research/game-inspiration/dossiers/songs-of-syx.md). Do not create a broken local link or pretend it is merged.                                          |
| P            | G150–G166 listed as roster-only in that [expansion ledger](https://github.com/Macrofold/OpenLegend/blob/7bef5a1e70adaa14c8a172f6b6ec2f076d6a164e/archive/02-research/game-inspiration/research-progress-expansion-2026-10-13.md). No dossiers were found on the inspected bases; this is not a census of unpublished branches.    |
| C            | Contextual source candidate in the [modding branch ledger](https://github.com/Macrofold/OpenLegend/blob/research/modding-ecosystems-2026-10-14/archive/02-research/game-inspiration/research-progress-modding-2026-10-14.md), which still records the relevant dossier/case work in progress. No full-pass completion is claimed. |

**Numbering conflict:** the inspected main roster ends at G148; the expansion uses G149 for Songs of Syx and G150–G166 for the approved additions; the modding branch separately calls Starfield G149. Keep `songs-of-syx` and `starfield` distinct. Starfield's label is `unresolved-G149`, EVE Online's is `unnumbered`; these two rows are contextual candidates, not new numbered roster additions. No renumbering or branch merge was performed here. Reconcile the authoritative roster before assigning a permanent new G number.

Refresh source availability after an actual merge or new publication without granting incorporation automatically. Preserve the source revision already assessed in each evidence record. If later edits materially affect a lesson, mark S and describe the scope; an unrelated typo does not require rereading every game. Add newly authorized source rows to both CSVs with U or W, never inferred I/N. If an existing synthesis supplies reliable coverage, import its evidence and destination links before replacing X.

## Working alongside other branches

Edit only the intended game/topic cells and evidence records; preserve other topics, prior conclusions and source IDs. Do not duplicate or overwrite the FUN/CREATE work in progress. No contribution depends on another agent finishing, and this framework grants no branch-merging or history-rewriting authority.

## Verification and remaining work

The creation task is to deliver the topic list, empty shells and honest tracking, not to fill them. Substantive synthesis remains unstarted in all 26 new guides. The existing four owners require a future, explicitly scoped coverage reconciliation; their current branch work is neither completed nor erased by this scaffold.

Before handing off framework changes, verify unique game keys and topic columns, valid state codes, equal CSV row widths, all expected subjects, working new local paths and preservation of existing documents. These are documentation checks, not game execution, new external research or a full archive audit. Record actual check results in the handoff rather than manufacturing research completion evidence here.

## Research, design and implementation are separate

The [coverage review](coverage-review.md) expands topic questions and adds a [flexible main-topic template](main-topic-template.md). All 30 topics now have local entry pages with empty design-reference tables; the four existing/ongoing topics still route to their substantive owners. This structural work does not assess a source game or change any coverage cell, source-inventory row or assessment record.

When a scoped design subtopic is actually added, its ND identifier and design state belong to the existing [Future work needing design](../../../../docs/maintainers/needs-design.md) register, with reciprocal links from the topic and the eventual feature specification and technical design. The technical design defines implementation modules; a focused maintainer tracker owns their progress. Do not put design or implementation statuses in this game-by-topic matrix.

No new design entries have been registered by this framework; existing ND entries remain intact. Research headings do not count as registered features. Completing a design does not close game-research coverage, mark a project implemented, approve spending or authorize new gameplay. Use each record only for the distinct question it owns.
