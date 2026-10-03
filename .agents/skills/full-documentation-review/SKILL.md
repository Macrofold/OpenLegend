---
name: full-documentation-review
description: >-
  Reconcile an explicitly requested full documentation, project and maintainer backlog review
  against current code, accepted intent and evidence. Not routine documentation maintenance.
---

# Full Documentation Review

Make the documentation and remaining work describe the project that is actually intended, not merely the latest prose or whatever the code happens to do. Use this workflow for an explicitly requested exhaustive review. Its breadth does not authorize implementing every planned feature, changing protected policy, treating proposals as approved, or weakening acceptance criteria.

Start with [AGENTS.md](../../../AGENTS.md), applicable scoped instructions and [documentation ownership](../../rules/documentation.md). Apply [base selection and work protection](../openlegend-rebase/SKILL.md), [planning and authorization](../../../AGENTS.md#plan-before-implementation), [required review](../openlegend-review/SKILL.md#required-review), and [verification](../../rules/verification.md). These remain the policy owners; this skill organizes the review rather than replacing them.

## Establish an auditable scope

Identify the requested repository, branch, exclusions and deliverables. Pin the refreshed base commit and record the exact ref. Use a separate branch when requested; preserve other work and report branch changes. Create or update a durable review plan when breadth, cross-layer contracts or semantic risk warrant it. Estimate runtime logic changes separately from documentation size.

Inventory the entire agreed scope from the repository, not just the maintainer index: root/package documentation, nested project files, feature and architecture specifications, world documentation, task trackers, limits, handoffs, guidance, repertoires and verification reports. Include relevant documentation outside `docs/` and new files. An index can omit a document. Respect archive exclusions; an active document pointing into an excluded archive is a dependency to disclose or inspect narrowly, not proof its contract was checked.

Read each in-scope document completely. Keep a working coverage record by path and revision, including unread ranges, disposition and evidence pointers; keep generated scratch outside canonical documentation. Search excerpts, headings, filenames and summaries locate material but do not establish full coverage. Recover truncated or missing ranges before marking a file read. Separate **read**, **reconciled** and **verified**; count neither unchanged files nor old observations as new runtime checks.

## Resolve intent before changing status

For every claim or task, distinguish:

- Current implementation, established by relevant code paths and observed evidence.
- Accepted intended behavior and constraints, established by their authorized canonical owners.
- Approved but unimplemented scope, unapproved proposals, optional examples and historical decisions or results.

Recency is evidence of possible supersession, not authority by itself. Trace a suspected reversal through its rationale, scope, current owner and implementation; a newer comment, stale checkbox, historical approval or unmerged branch is not automatically the current contract. Preserve the requested project's goals and useful intent even when the original mechanism is obsolete. Never rewrite accepted behavior merely to excuse a code defect. Leave consequential unresolved choices explicit rather than inventing an approval.

Use the [engine/world decision procedure](../../../docs/engine-and-world-boundaries.md#5-a-repeatable-boundary-decision). Could another coherent world differ? World laws, content, action families, names, tuning, vocabulary, parser patterns, examples, help/refusal wording, schema choices, UI options and model instructions belong to one authored world source. Reusable mechanisms belong to the engine across every layer, not just the domain package. Native implementation does not make a world law universal. Add or track a missing narrow seam rather than duplicate world policy in callers. Challenge generality with a genuinely different world; do not substitute arbitrary strings or build an unused framework.

## Reconcile every task and accepted requirement

Read complete task bodies, dependencies, blockers, exit criteria and linked designs. Trace the owning implementation and its actual producers and consumers, including relevant failure, cancellation, deletion and restore paths. For each open item choose a supported disposition: retain; clarify; split delivered from remaining scope; complete satisfied criteria; reopen a regression; consolidate under an existing owner; or remove obsolete work with the superseding reason and replacement reference where applicable.

Keep stable IDs and valid criteria. A partial implementation does not close its parent, and a checked historical subtask does not qualify a newer version. Distinguish missing implementation from unperformed acceptance checks. Preserve useful deferral reasons; do not restate unchanged ones on every pass. Remove duplicate task bodies without losing unique requirements or dependencies. Do not renumber surviving items for neatness.

Perform the reverse check: every accepted unimplemented requirement and concrete newly discovered defect needs an appropriate focused tracker, using the general TODO only when no focused owner applies. Optional repertoire ideas, hypothetical optimizations and every configurable default are not automatically delivery commitments. Do not inflate the backlog with generic risks.

## Review architecture, performance and integrity together

Trace relevant behavior from a player's intention or a character's permitted evidence through choice, admission, one semantic mutation owner, dependent updates, invalidation, persistence and authorized presentation. Check that parallel entrypoints use the same rules and that presentation, model output and cached results cannot grant authority. Prefer shared meaning, narrow interfaces and real reuse over duplicated writable state, competing schedulers or abstractions without a consumer.

For cognition, memory, sight, hearing, status effects, elapsed simulation, navigation and saving, explicitly examine how work grows with active beings, world size, history, density and concurrent activity. Under the [performance workflow](../openlegend-performance/SKILL.md), consider meaningful-change triggers, incremental updates, conservative filtering, indexes, bounded candidate sets, request-scoped data reuse, batching, ordered asynchronous persistence and backpressure. Inspect cold paths and tail latency as well as warm averages. Async syntax does not offload CPU, and a configurable speed is not measured capacity.

A cache or shared query needs the same permitted fields, observer scope and state/transaction snapshot; longer-lived reuse needs bounded retention and complete invalidation for edits, removal and restore. Reducing work must preserve required events, perceptual meaning, saved randomness, effect order and durability. Budget exhaustion is not evidence of absence or physical impossibility. Coalesce replaceable snapshots, not distinct speech, observations or committed effects. Use measurable workloads and existing evidence; do not add speculative infrastructure or require gameplay stress for prose-only changes.

Check privacy, server authority, deterministic state transitions, accounting, untrusted generated definitions, stale completions, resource cleanup and same-version save/load integrity. Keep decisions, proposals, previews and committed effects distinct. Follow the sole [development save policy](../../../AGENTS.md#development-save-policy) without copying or weakening it. Obsolete development-save compatibility work is not a requirement; current-format integrity and live-definition changes retain their separate obligations. Never silently reset or replace someone's data.

When code follows obsolete documentation, identify the concrete conflict and reach. Fix only clearly authorized in-scope implementation, with proportionate planning and downstream verification; otherwise preserve the intended contract and track the precise defect. Tracking unfinished agreed implementation does not make that implementation complete.

## Update the owners together

Reconcile current specifications, world rules, focused trackers, project status, handoffs and navigation in the same change. Project documents retain project-specific context and history while pointing to canonical contracts. Keep delivered behavior, accepted targets and proposals visibly distinct. Prefer links to duplicate contracts or task bodies. Preserve unique useful requirements and rationale before consolidating or deleting.

Update [limits inventories](../../../docs/limits/README.md) for changed restrictions, including rationale, restrictiveness and removal history; use existing review triggers without treating them as permission to relax policy. Record consequential reversals and major reconciliation decisions in the [documentation changelog](../../../docs/documentation-changelog.md), not a diary of each edit. Preserve historical verification revision, environment, workload, failures and limitations; later evidence must not silently erase an earlier failure or qualify an unrelated workload.

Search inbound references, including code comments, before moving/removing paths, headings or IDs. Check relative links and anchors, examples, command names, configured values, source paths and project/tracker cross-links. Correct stale wording at its source rather than appending contradictory corrections elsewhere. Do not rewrite accurate documents just to show activity.

## Finish with evidence, not a blanket assurance

Reconcile the final diff against the coverage record and every task disposition. Inspect removed text for lost meaning, accidental approval changes, duplicate owners, abandoned dependencies and unverified checkboxes. Re-read changed shared files before committing. Check whether the upstream base moved; report the exact reviewed revision and safely reconcile relevant changes without silently incorporating unrelated branches or bypassing the mandatory conflict stop.

Run changed-file formatting and the required guidance/configuration/static checks for the actual changes. Check links/anchors separately from the guidance graph. Exercise changed runtime behavior through suitable existing checks when runtime code changed. Respect the default against authoring tests, permission and spending limits, and CI gates. For changes to this skill's routing, apply [guidance maintenance](../openlegend-guidance/SKILL.md); native-agent behavior remains unverified without actual observed dispatch.

Completion requires full agreed document coverage, supported dispositions for every open item, reverse coverage of accepted requirements, reconciled canonical owners, the complete affected-diff review and selected checks. Report concrete changes, major decisions with reasons, actual evidence, remaining implementation work and any genuine access or verification limits. Do not equate documentation reconciliation with a bug-free game, claim checks that did not run, or call a partial pass exhaustive.
