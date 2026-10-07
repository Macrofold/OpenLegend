---
name: create-parallel-tasks
description: >-
  Prioritize OpenLegend work from plans, TODOs and current code; define complete parallel
  assignments and standalone implementation prompts, defaulting to five tasks.
---

# Create useful parallel assignments

Define important, implementable tasks that separate agents can carry out once their stated prerequisites are met, without this conversation or communication with each other. This skill writes plans and instructions; it does not dispatch tasks or implement them.

Follow [AGENTS.md](../../../AGENTS.md) and [documentation ownership](../../rules/documentation.md). Those sources own development workflow, authorization, verification, spending and completion. Do not reproduce or extend those policies in this skill's output.

## Interpret the request

- Default to **five assignments**. A user-specified count overrides five. An assignment can contain several related work items; item IDs are not a headcount.
- Honor a specified task, feature, category, priority, excluded area or existing branch. “Focus on” weights selection toward that subject; “only” restricts the scope. Explain any necessary enabling work outside the focus rather than quietly broadening it.
- Use a supplied time horizon, engineering capacity and constraints. Otherwise give reasoned effort ranges and assumptions; do not invent a workweek, hours per engineer, AI productivity multiplier or spending allocation.
- For an existing plan, audit and extend the relevant definitions rather than restart selection or duplicate documents. For a prompts-only request, reuse adequate designs; identify or fill missing task information within the authorized scope.
- Apply [the developer-question rule](../../../AGENTS.md#resolve-developer-questions-before-dependent-work): complete independent investigation and task definitions, then ask for the answers needed to finish the remaining allocation. Do not design dependent contracts, finalize prompts whose design still requires those answers, or substitute a design-only assignment to avoid resolving those questions. Preserve an explicitly requested design-only scope; routine choices follow root guidance.

## Select and define the work

When choosing or reprioritizing the assignments, first apply [experience-led prioritization](../openlegend-prioritize/SKILL.md). Do not restart selection for a prompts-only handoff of an unchanged agreed plan. When selecting, expanding or specifying the assignments, read [planning and task definitions](references/planning.md). Inspect current TODOs, accepted plans, relevant code and active work before deciding what remains. The four areas to consider are established-system bugs, engine/world foundations, world-specific gameplay and presentation. **They are search lenses, not quotas:** any number of assignments, including all of them, may come from one area. For the world-specific gameplay category, explicitly perform [the repertoire-priority check](../openlegend-prioritize/SKILL.md#check-repertoire-priorities-when-selecting-gameplay) before choosing its next entries; consulting general repertoire ideas alone is insufficient.

Rank by the project's priorities, impact, urgency, dependencies and risk of building on a weak foundation. Avoid low-value padding, obsolete fixes and duplicate ongoing work. Make a cohesive parallel allocation with concrete completion criteria and realistic shared dependencies. Use the existing [design workflow](../openlegend-design/SKILL.md#feature-spec-or-technical-design-requests) when feature/technical specifications need creating or strengthening; its canonical document and approval rules remain controlling.

Apply [unfinished-prerequisite planning](../openlegend-prioritize/SKILL.md#plan-around-unfinished-prerequisites): batches may depend on earlier unfinished work or work not confirmed fully merged into `main`. Use the [blocker-only prerequisite format](references/task-prompts.md#make-open-prerequisites-a-start-decision): list only actual waits on required work owned by another task, with its completion/merge evidence and the exact blocked portion. State start readiness and independent scope separately; keep available work, this task's own implementation and nonblocking qualifications out of Open prerequisites. Do not label conditional work ready now or exclude it merely because its prerequisite remains open.

## Name and register the allocation

For a new allocation, inspect the [parallel-batch register](../../../docs/projects/parallel-batches.md) and existing batch files, then use the next unused sequential number with a descriptive outcome name: `parallel-batch-<number>-<descriptive-name>`. Use at least two digits. Apply the same number/name to its project pair, prompts and focused allocation tracker, and add their links to the register. Avoid generic names such as “next tasks” that become ambiguous after another run.

Keep the number when revising an existing allocation or preparing its prompts; preserve stable work-item IDs and completion evidence. Do not renumber unrelated product proposals or design groups as staffing batches. When explicitly renaming older allocations, preserve their order and useful content, repair repository-wide references (including prompts and code comments), and retain completed-project placement. A new number does not mean earlier work is complete or override its outstanding acceptance.

## Produce the handoff

Read [standalone task prompts](references/task-prompts.md) when writing the copy/paste instructions. Default output is a prioritized allocation, linked task definitions/designs and one complete prompt per assignment. Honor narrower requested deliverables.

The assignments **must not communicate with one another**. Settle shared contracts in the planning documents. Explain sequencing to the owner when one task depends on another; do not instruct workers to negotiate interfaces, message peers, poll other chats, send status to an integration agent or orchestrate sibling tasks. Shared files are acceptable when responsibilities and the intended combined behavior are clear.

Prompts define work and point to helpful evidence. Every copyable task prompt must instruct creation of a specifically named new branch describing its changes, under [the prompt branch rule](references/task-prompts.md#name-a-new-branch-in-each-prompt). Beyond that requested branch instruction, do not invent Git/integration powers or development procedures, tell agents to write tests, or grant spending. Defer those matters to current `AGENTS.md` and explicit user instructions. Include the concrete results that need demonstrating, without turning them into a new testing policy.

Check count, focus, priorities, prerequisites, acceptance and links. Reconcile affected records under the documentation policy. Report unresolved design or unavailable dependencies rather than claim readiness.
