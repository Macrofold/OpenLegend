# Full documentation review

## Scope and authority

Mike requested an exhaustive reconciliation of every non-archived documentation, project, maintainer and to-do file against the current implementation and accepted project intent, plus a reusable **Full Documentation Review** skill. This is a documentation and planning reconciliation, not authorization to implement every outstanding feature or promote proposals into approved requirements.

Starting revision: `Macrofold/OpenLegend` GitHub `refs/heads/main` at `8005f7c7245cfecec128652efe3ef07926604e0a`. Working branch: `docs/full-documentation-review-2026-10-02`. No existing local checkout or worktree was supplied. The remote default branch was verified before branch creation; no existing history is rewritten.

Status: **In progress. No exhaustive-coverage or completion claim yet.**

Reuse the reviewed draft skill and incomplete plan from the previous review branch (`dc0f1a1114ae441f571ba274b75105515f9808e7`); do not treat that preliminary work as completed coverage. Inspect the more recent product-scalability design at `19a775f88d59f107029e497354f0d055ba2e05b9` and production-deployment design at `df7e23fa3a476ce914773b919c18d1e6fea1296c` as additional planning sources. Reconcile accepted decisions with the current owners, without silently merging unrelated branches, claiming those targets are implemented, or changing proposal approval status.

## Review principles

The controlling policies remain [AGENTS.md](../../AGENTS.md), [documentation ownership](../../.agents/rules/documentation.md), [engine/world boundaries](../engine-and-world-boundaries.md), [verification](../../.agents/rules/verification.md), and [guidance maintenance](../../.agents/skills/openlegend-guidance/SKILL.md).

Code and evidence establish observed implementation; accepted decisions establish intended behavior. Neither newer prose nor newer code automatically overrides accepted intent. Preserve useful requirements, explanations, task IDs, dependencies, approval boundaries and historical evidence. Remove obsolete work only with a concrete superseding decision, implementation or canonical replacement. Do not mark an unperformed acceptance check complete.

World laws, content, vocabulary, tuning and AI/presentation wording belong to the authored world. Reusable mechanisms belong to the engine. Audit the boundary across domain, server, protocol, client and model context, not only package names. Prefer one semantic owner, narrow composition and explicit invalidation over duplicate writable state, parallel paths or speculative frameworks.

Examine how cognition, observation, memory, status effects, elapsed simulation, navigation and persistence costs grow with active beings, world size, history and concurrent activity. Retain concrete bounded-work, privacy, determinism, cancellation, spending and same-version save/load integrity requirements. Do not preserve obsolete development-save compatibility work or change the root no-legacy policy.

## Work plan

1. Inventory tracked documentation and applicable guidance throughout the repository, including documentation outside `docs/`, nested projects, limits, world definitions, repertoires, verification reports and maintainer subdirectories. Exclude bulk archive traversal; inspect explicitly maintained archived owners only when necessary to resolve an active contract. Keep the complete working coverage inventory outside the repository, rather than committing generated review output.
2. Read every in-scope document in full. Map every open task and accepted unimplemented requirement to its canonical owner, relevant code producers/consumers and available verification. Distinguish implementation gaps, stale documentation, obsolete work, duplicate tracking, unapproved proposals and unverified acceptance.
3. Trace the current implementation for every affected claim and task. Use recent history to resolve supersession where necessary. Record concrete code defects against the accepted requirement; do not rewrite requirements to excuse them. Make only justified in-scope corrections, with additional planning and verification before any consequential runtime change.
4. Reconcile canonical specifications, project status, focused trackers, indexes, limits and meaningful decision history together. Keep ideas distinct from delivery commitments, and reference existing owners instead of copying task bodies or contracts.
5. Create `.agents/skills/full-documentation-review/SKILL.md` with a conditional operational route, the full workflow and explicit evidence-based completion criteria. Reuse existing policy owners; do not create competing rules or preload this exhaustive workflow for ordinary documentation edits.
6. Review the entire final diff for lost meaning, invalid approval changes, duplicate owners, stale links and unsupported completion claims. Validate changed-file formatting, links/anchors and `pnpm guidance:check` where tooling permits. Recheck upstream and report the exact reviewed revision and any later upstream changes.

## Risk and verification

Expected runtime logic changes: **0** initially. Documentation reach is broad and cross-layer; the principal risks are silently reversing accepted intent, erasing valid remaining work, confusing evidence with acceptance, and making implementation defects appear intentional. The durable plan is warranted by these semantic risks, not by a line-count threshold.

The environment can read/write the repository through its GitHub connection but cannot clone GitHub directly. A temporary, branch-scoped, read-only GitHub Actions snapshot may be used to transfer only tracked repository content for complete local inventory and analysis; it must not read secrets or saves outside Git, grant write permissions, alter existing checks, or remain as an unnecessary permanent workflow. Ordinary repository CI remains a merge gate. No model/provider calls are needed.

Documentation-only changes require content, link, guidance and formatting checks, not invented gameplay qualification. Existing runtime evidence retains its actual revision, workload and limitations. Missing tools, incomplete reads, unmet acceptance checks and unresolved material decisions must remain explicitly visible; they cannot be relabeled complete.

## Completion criteria

- Every inventoried in-scope document has been read completely and reconciled or explicitly confirmed unchanged, with no uncovered pages/ranges hidden by truncated retrieval.
- Every open maintainer/to-do item has a supported disposition, and accepted requirements missing from tracking have an appropriate single owner.
- Current behavior, accepted targets, proposals, obsolete plans and historical evidence are distinguishable and point to current canonical owners.
- Engine/world separation, performance, authority, privacy, lifecycle, persistence and modularity findings are corrected or accurately tracked without speculative backlog growth.
- The reusable skill is present, conditionally reachable and reviewed against existing guidance.
- The complete diff and selected checks have been reviewed; actual verification limits and remaining implementation work are reported honestly.

## Results

Pending the full review. This section must describe actual coverage, consequential reconciliations, verification and any genuine limits before completion; creating the branch or this plan does not complete the task.
