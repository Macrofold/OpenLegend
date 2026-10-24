# Implementation workflow — adoption draft

| Status      | Current progress                                                  | Last updated |
| ----------- | ----------------------------------------------------------------- | ------------ |
| Not started | Operational workflow text is proposed; it is not active guidance. | 2026-10-22   |

Proposed text for `.agents/rules/implementation.md`; not active guidance. On adoption, omit this preamble and resolve the bracketed owners using [the edit plan](03-instruction-edit-plan.md).

---

# Implement the agreed outcome

Use for authorized changes to product behavior or maintained code/tooling, including behavior-affecting data and configuration. Questions, research, design-only work, prose-only edits, findings-only review, and history reconciliation do not activate it. A disposable analysis script alone does not change task mode. Reading this workflow grants no authority.

## Plan the outcome and evidence

Read the task, prior decisions, affected owners, and matching engineering guidance. Reuse current plans and evidence. Define the outcome, dependencies, consequential risks, selected checks, and finish condition. A small fix needs only a short conversation plan. Substantial uncertainty, cross-layer contracts, or long-running work warrants a durable plan, preferably an existing one. Plan the whole assignment at dependency level and detail the next connected unit; line counts are not documentation triggers. Replan for changed dependencies or risk, not each checkpoint.

Where completion depends on the distinction, identify required behavior, measurements, performance passes, exploration, and human/external evidence. A failed measurement can fulfill a reporting obligation without establishing a pass. Do not weaken a gate or invent one from a diagnostic. Routine reversible choices remain yours; resolve consequential unanswered questions before dependent work.

Choose the sequence for this task. Check high-risk assumptions early when they threaten real resources or substantial dependent work. Otherwise build connected behavior before expensive overlapping verification. Permissions, private knowledge, saving, and committed consequences remain protected; merely touching those topics does not mandate immediate tests or production hardening.

## Implement through existing owners

Work through dependencies in coherent units. Reuse semantic owners and helpers; trace affected callers, lifecycle, saved effects, and player/character views. Keep world rules and content in the world's definitions. Add abstraction for shared meaning or an accepted requirement, not speculative expansion.

Apply the short [Performance core] before choosing algorithms. Consider repeated work, growth, selection, and safe reuse. Use task-relevant evidence before risky optimization. For optional diagnostics, choose the smallest workload that answers a concrete risk, escalating only if needed; accepted required workloads remain controlling. A new largest cost is not automatically another optimization task.

## Verify and review by impact

Follow [Verification]: retain the default against new maintained tests, reuse existing checks and small disposable scenarios, and simplify brittle setup. Required tests and CI gates remain required. Prove the intended consumer actually ran. Repairing a fixture does not demonstrate product progress.

Inspect the complete affected change under [Review]. After fixes, review corrections and affected assumptions. Reopen broader verification or review only for a concrete finding, invalidated dependency, missing required evidence, or explicit requirement. Consolidate costly overlapping checks once relevant changes stabilize.

Before expensive work, reuse or check only needed prerequisites and establish its question and finish condition in the existing plan or update. Distinguish product, fixture, and environment failures before repeating. Continue independent work while a prerequisite is unavailable. Do not overlap owned workloads that invalidate measurements. Preserve failed evidence, real spending, and gameplay semantics.

## Resume and finish

For long-running work, maintain one compact current-progress section in its existing owner: unfinished scope, decisions, next action, evidence links, and owned resources or unresolved spending. Replace stale content; [Documentation] owns detailed evidence and filing. Small tasks need no new progress file. After compaction, use that summary and current changes instead of reconstructing the full history. Compaction or a safety commit does not restart base selection or qualification.

Batch documentation and remaining checks at meaningful boundaries. Follow root commit rules and [Rebase] history protections; a safety commit does not trigger verification or documentation.

Complete all available authorized work through integration, review fixes, and required checks. A phase is a checkpoint, not a stopping point. Once agreed obligations are satisfied, finish. Report genuine blockers precisely without substituting fixtures for independent character or human evidence, claiming completion, or inventing extra work. Follow root handoff, spending, and merge rules.
