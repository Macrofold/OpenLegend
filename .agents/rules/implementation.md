# Implement the agreed outcome

Use for authorized changes to product behavior or maintained code/tooling, including behavior-affecting data and configuration. Questions, research, design-only work, prose-only edits, findings-only review, and history reconciliation do not activate it. A disposable analysis script alone does not change task mode. Reading this workflow grants no authority.

## Plan the outcome and evidence

Read the task, prior decisions, affected owners, and matching engineering guidance. Reuse current plans and evidence. Define the outcome, dependencies, consequential risks, selected checks, and finish condition. A small fix needs only a short conversation plan. Substantial uncertainty, cross-layer contracts, or development work expected to take substantial time warrants a durable plan, preferably an existing one. List the major deliverables and prerequisites; detail the next implementation step and checks through its real callers. Line counts are not documentation triggers. Replan for changed dependencies or risk, not each checkpoint.

Where completion depends on the distinction, identify required behavior, measurements, performance passes, exploration, and human/external evidence. A failed measurement can fulfill a reporting obligation without establishing a pass. Do not weaken a gate or invent one from a diagnostic. Routine reversible choices remain yours; resolve consequential unanswered questions before dependent work.

Plan the execution order and parallel work to minimize completion time within the authorized scope and budget. Check high-risk assumptions early when they threaten real resources or substantial dependent work. Otherwise implement the connected behavior covered by expensive checks before running them. Permissions, private knowledge, saving, and committed consequences remain protected; merely touching those topics does not mandate immediate tests or production hardening.

Parallelize independent authorized implementation and verification when useful work is ready. Use subagents when available and permitted, with bounded file ownership and one integration owner for shared files, generated outputs and commits. Keep provisional optimizations independently reviewable against a common repaired baseline until their dispositions are known; share accepted prerequisites explicitly. Continue independent work during builds and remote runs. Coordinate expensive checks under [worker scheduling](verification-workers.md#parallel-comparisons-and-reuse), and serialize only actual dependencies or competing resources.

## Implement through existing owners

Work through dependencies in coherent units. Reuse semantic owners and helpers; trace affected callers, lifecycle, saved effects, and player/character views. Keep world rules and content in the world's definitions. Add abstraction for shared meaning or an accepted requirement, not speculative expansion.

Apply the short [Performance core](../skills/openlegend-performance/SKILL.md) before choosing algorithms. Consider repeated work, growth, selection, and safe reuse. Use task-relevant evidence before risky optimization. For optional diagnostics, choose the smallest workload that answers a concrete risk, escalating only if needed; accepted required workloads remain controlling. A new largest cost is not automatically another optimization task.

## Verify and review by impact

Follow [Verification](verification.md): retain the default against new maintained tests, reuse existing checks and small disposable scenarios, and simplify brittle setup. Explicitly required tests and permitted local verification gates remain required; hosted CI follows the repository’s local-only verification policy. Prove the intended consumer actually ran. Repairing a fixture does not demonstrate product progress.

Inspect the complete affected change under [Review](../skills/openlegend-review/SKILL.md). After fixes, review corrections and affected assumptions. Reopen broader verification or review only for a concrete finding, invalidated dependency, missing required evidence, or explicit requirement. Consolidate repeated expensive checks after implementing the changes they cover, except for early checks of the high-risk assumptions above.

Before expensive work, reuse or check only needed prerequisites and establish its question and finish condition in the existing plan or update. Distinguish product, fixture, and environment failures before repeating. Continue independent work while a prerequisite is unavailable. Do not overlap owned workloads that invalidate measurements. Preserve failed evidence, real spending, and gameplay semantics.

## Resume and finish

For development assignments expected to take substantial time, maintain one compact current-progress section in the existing tracker or plan: unfinished scope, decisions, next action, evidence links, and owned resources or unresolved spending. Replace stale content; [Documentation](documentation.md) owns detailed evidence and filing. Small tasks need no new progress file. After compaction, use that summary and current changes instead of reconstructing the full history. Compaction or a safety commit does not restart base selection or qualification.

At coherent checkpoints and before handoff, apply [documentation reconciliation](documentation.md#reconcile-documentation) to affected contracts, tasks and navigation alongside remaining checks. Follow root commit rules and [Rebase](../skills/openlegend-rebase/SKILL.md) history protections; a safety commit does not trigger verification or documentation.

When handing off a bounded batch within a larger project, identify the batch's dispositions and link the outstanding parent scope. A review pause names the stopping point without implying that the next named experiment is the only remaining work.

Complete all available authorized work through integration, review fixes, and required checks. A phase is a checkpoint, not a stopping point. Once agreed obligations are satisfied, finish. Report genuine blockers precisely without substituting fixtures for independent character or human evidence, claiming completion, or inventing extra work. Follow [root handoff, spending, and merge rules](../../AGENTS.md#completion-and-handoff--every-task).
