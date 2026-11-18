# Implement the agreed outcome

Use this workflow when authorized to change product behavior, maintained code or tools, or data and configuration that affect behavior. Questions, research, prioritization, design-only work, prose edits, findings-only review and history reconciliation stay in their own workflows. A disposable analysis script alone does not change the task.

## Plan the outcome and evidence

1. **Define done.** Use the request, prior decisions, affected contracts and existing evidence. Identify what must work, who uses it and what would demonstrate success. Where it matters, distinguish a required measurement from a required pass. For example, recording a valid capacity result can finish a measurement, while a promised capacity still has to be achieved. Identify any evidence that must come from a person or an external service.
2. **Choose the size of the plan.** A small, well-understood fix needs only a short plan in the conversation. Use a written plan for substantial uncertainty, a contract shared across layers or work likely to span substantial stages or sessions. Reuse the existing plan or tracker where available. Name the major deliverables and dependencies, then detail the next connected change and its real-caller checks. Revise the plan when a dependency or risk changes. Line counts alone do not determine what to document.
3. **Choose the order.** Check an assumption early if being wrong could harm real resources or invalidate substantial dependent work. Otherwise build the connected behavior before running the expensive checks that cover it. Preserve permissions, private knowledge, saving and committed effects throughout. Use reversible judgment for routine choices and resolve consequential questions with Mike before the work that depends on them.
4. **Give independent work an owner.** Parallelize authorized implementation and verification when work is ready and the needed resources are available. Give each subagent clear file ownership and name one person or agent to integrate shared files, generated outputs and commits. Keep each proposed optimization independently reviewable against the same control with the necessary correctness repairs. Continue independent work during builds and remote runs. Coordinate worker capacity and the shared budget under [worker scheduling](verification-workers.md#parallel-comparisons-and-reuse).

## Implement through existing owners

Trace the changed behavior from its producer through the callers that use it, including affected player or character views, saved effects and work that can outlive its caller. Reuse the code that already owns the rule or operation. Keep fictional laws and content in the world's definitions. Introduce a shared abstraction when it expresses shared meaning or an accepted requirement.

Apply the [Performance core](../skills/openlegend-performance/SKILL.md) before choosing algorithms. Consider what repeats, what grows, what the caller needs and what can safely be reused. For an optional investigation, start with the smallest workload that answers the question. Honor any agreed workload or threshold. Discovering the next largest cost does not commit the task to optimizing it.

## Verify and review by impact

Use [Verification](verification.md) to select checks and where they run. Use existing checks and disposable scenarios. Write new automated tests only when Mike asks. Exercise the real caller and check that the intended behavior ran. A working fixture establishes that the setup works. Product qualification still needs the promised result from the actual consumer.

Before an expensive run, identify its question, finish condition and prerequisites in the existing plan or a short update. Reuse valid checks and combine expensive checks once the changes they cover are ready. Schedule other work on a separate resource when it would distort the measurement. If a run fails, identify whether the product, fixture or environment failed before repeating it. Preserve failed evidence, spending and required gameplay behavior.

Inspect the complete affected change under [Review](../skills/openlegend-review/SKILL.md). After a fix, review the correction and the evidence it affects. Reopen wider verification or review when a specific finding, changed dependency, missing required evidence or explicit request calls for it.

## Resume and finish

For work spanning substantial stages or sessions, keep one current-progress section in the existing tracker or plan. Record unfinished scope, decisions, the next action, evidence links and owned resources or unresolved spending. On resumption, start from that section and the current changes. A safety commit or a new context window alone does not require new base selection, documentation, review or verification.

At coherent checkpoints and before handoff, [reconcile affected contracts, tasks and navigation](documentation.md#reconcile-documentation). Follow the [local commit rules](../../AGENTS.md#commit-progress-and-completed-work) and [history protections](../skills/openlegend-rebase/SKILL.md).

Apply an agreed review pause to the promised outcome. If an ordinary conversation must work and a benchmark exposes a broken conversation, fix it and recheck affected evidence. A completed comparison may reject an optional optimization and close that experiment. Continue independent work when a dependency is blocked, subject to explicit stopping instructions and mandatory limits. Once the agreed batch and its required checks are complete, report its results and link the outstanding scope of the parent project. [Completion and handoff](../../AGENTS.md#completion-and-handoff--every-task) governs the final report.
