# Documentation ownership, navigation and lifecycle

Read only the section relevant to creating, splitting, filing or reconciling documents. Known owners can be opened directly; [navigation](README.md) is a discovery aid. The [documentation policy](../.agents/rules/documentation.md) owns preservation and update obligations.

## Homes and filing units

These conventions govern new and maintained documents. Existing useful current contracts keep their established paths and are indexed; established useful paths remain valid. Create folders and indexes when they have content, not an empty directory scaffold.

| Kind                                                | Home and filing unit                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current feature behavior                            | `docs/features/README.md` indexes maintained owners. Reuse established paths; new standalone owners use `docs/features/<topic>.md`. Create only for a distinct feature without an owner. Edit current truth in place.                                                                                                                          |
| Current technical contracts                         | `docs/technical/README.md` indexes mechanisms/owners, including established root files. New independent contracts use `docs/technical/<topic>.md`; `docs/architecture.md` remains a system map. Combine feature/technical prose when separate files add no value.                                                                              |
| World rules, limits, UX, assets, production methods | Existing specialized collections remain authoritative. Current decisions stay with their owner; research and iterations are separate. Do not copy world laws into generic specifications. Existing external-asset rules remain controlling.                                                                                                    |
| Unfinished projects                                 | `docs/projects/README.md` links unfinished project families. Existing flat pairs remain valid; new multi-document projects can use `<project>/`. Create design pairs only under the design policy, not for every implementation task.                                                                                                          |
| Completed / withdrawn projects                      | New completions use `docs/projects/completed/<year>/`; explicitly cancelled/superseded proposals use `docs/projects/archive/<year>/`. Move once at the actual boundary with links repaired. Existing completed paths need no immediate move.                                                                                                   |
| TODOs, dependencies, open decisions                 | Focused `docs/maintainers/<topic>.md`; `TODO.md` only without a suitable owner. One current-progress section belongs here or in its project plan. File completed task bodies in coherent batches under `docs/maintainers/completed/<year>/<topic>.md`, retaining IDs.                                                                          |
| Research                                            | `docs/research/<topic>/` for active questions/current synthesis; `<topic>/archive/<year>/YYYY-MM-DD-<subject>.md` for settled investigations/source notes. One question or coherent batch per record. Promote accepted conclusions to their current owner; rewrite synthesis rather than appending forever.                                    |
| Verification                                        | A small report can use `docs/verification/<topic>.md`. Growing topics use one short entry point plus `<topic>/<year>/YYYY-MM-DD-<question>.md`. One behavioral investigation/campaign per record, grouping related retries. Close the record when answered, ended, or blocked with a disposition; unfinished acceptance stays open.            |
| Benchmarks                                          | `docs/benchmarks/README.md` → topic entry → `<topic>/<year>/YYYY-MM-DD-<question>.md`. One comparison/campaign per record, including variance runs. Covers runtime scale, latency/memory/cost, model comparisons, and method audits. Current applicable evidence is identified by workload/revision, not merely latest date or fastest result. |
| Decision history and past notes                     | `docs/documentation-changelog.md` navigates to `docs/changelog/<year>/<week-start-date>.md`: one Monday-starting week with meaningful entries, no empty weeks. Other useful historical notes use the owning topic's archive. Current rationale remains beside its contract.                                                                    |
| Scratch and raw output                              | Task-owned external workspace, outside Git. Promote accepted decisions, significant gaps, and needed evidence before cleanup. Keep a project working note in Git only when coordination needs it; retire it at completion. No compulsory scratch file or new tool.                                                                             |

Create a dedicated report only when required or useful for substantial evidence that must remain retrievable. Otherwise a concise result in the existing task owner or handoff is sufficient. These categories are storage choices, not a checklist of documents to produce.

Protocols and executable runners stay at their existing procedural/tooling owners, separate from results. A report spanning behavior and performance has one primary home chosen by its main question; other collections link to it. Accepted-but-undelivered capability must remain labeled as a target, never presented as implemented current behavior.

## Current contracts and completed projects

Moving a project must not hide the only description of a supported feature. At completion:

1. Identify useful current behavior and technical contracts. If the project pair is their only owner, promote the useful current documents to `docs/features/` and `docs/technical/`, removing project-only progress/history. If established owners already exist, reconcile genuinely missing current requirements there instead.
2. Move the remaining project scope, completion record, and useful historical rationale into `docs/projects/completed/<year>/`, retaining the project's relative organization. Use an existing completion record to link promoted contracts; create no extra report or copied pair solely to populate an archive.
3. Update navigation and incoming links together. Keep current rationale beside its contract. Historical project content must be labeled as such and cannot be required to recover an otherwise undocumented current rule.

This is one batched completion operation, not three new recurring checkpoints. Do not force a permanent feature/technical pair for a small fix or a design-only research assignment. No duplicated current specification is created.

A reopened portion returns to the active project area with its owning work ID and references repaired; unrelated completed history stays filed. A newly requested expansion is new scope, not an automatic reopening of everything previously delivered. Missing required participant evidence stays in the active acceptance owner; the project is not marked complete simply because code is finished. Existing independent parent gates retain their actual owners and do not automatically reopen a narrower completed assignment.

## Growth rules that do not require another maintenance programme

**Current documents replace; historical records accumulate in bounded files.** A new report is justified by a new question, materially different workload/contract, or new campaign after closure—not by another command, failure, safety commit, or elapsed hour. Related retries within the same investigation belong together. Record meaningful results and failures, not a transcript of fixture repairs.

Add material to a report when it answers the same open question; otherwise use a separate record only when durable detail is needed. If an ongoing topic covers independent questions, split those records now rather than creating a single perpetual topic log. Use dates plus descriptive subjects; avoid global sequence numbers that require scanning the whole archive.

Before expanding a current contract or index, separate independently read subjects where useful. Length is a signal, not a reason to fragment a cohesive contract into tiny files. No line-count timer or per-task size audit is required. Never solve a large file by splitting it into chapters that an unchanged route still requires reading in full.

For completed tracker entries, preserve stable IDs and completion evidence in the dated completion record. Maintain only pointers needed by active dependencies, stable external references, or a current disposition table. An accumulated pointer list can itself move behind a year/topic index; the active tracker must not become a second historical register.

A growing topic has one short entry point: retain its established `<topic>.md` if useful, or use `<topic>/README.md` for a new collection, never duplicate both. Dated evidence stays at its original path when a newer result arrives. Update the short topic summary's applicable evidence links; do not repeatedly move every old run between active and archived directories. Corrections must be explicit about the affected result and reason. Preserve measured revision, workload, meaningful failures, and real financial uncertainty. Git records prose edits, but a temporary `/tmp` path is not a durable evidence archive.

## Indexes are navigation, not required reading lists

`docs/README.md` becomes the short front door, with categories for current behavior, technical contracts, worlds, unfinished projects, TODOs, research, verification, benchmarks, and history. Specialized collections keep their own indexes. The root instructions can link this guide for discovery without requiring it before every known-file edit.

Each index explains what it contains, when it is useful, and where its current authority lives. List topic families or active project entry points with one-line descriptions. Large dated collections link year folders and describe filename patterns; they need not enumerate every report or week. Do not copy task tables, acceptance status, measurement tables, or contract text into indexes.

For example, the changelog entry page can link `docs/changelog/2026/` and explain `YYYY-MM-DD.md` as the week's Monday. It does not need 52 links. A benchmark topic index can link its current applicable comparison and its yearly record folders; the year's filenames supply the historical inventory. A completed-project index can group by year rather than accumulate every completed project forever.

Discover an exact old result by listing matching paths and searching headings/IDs in the relevant collection. Read that record only when needed. Navigation does not require loading each child to learn whether it is active: the folder and index distinguish current work, completed work, and historical evidence. A task that already identifies the owner can go directly there.

## Context selection

For implementation, start with the accepted task, current progress, affected contracts, and matching engineering guidance. Review starts from the actual diff and those contracts; performance diagnosis also uses the applicable benchmark summary. Design/research loads only sources that inform its question and never activates implementation execution rules.

Historical material is needed when it establishes a relevant result, limitation, prior failed approach, or decision. Resume from current progress and changes, not full logs. Known owners can be opened directly; indexes are discovery aids. No rule requires traversing every category or reading every linked child.
