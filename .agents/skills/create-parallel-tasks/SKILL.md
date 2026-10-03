---
name: create-parallel-tasks
description: >-
  Prioritize OpenLegend work from plans, TODOs and current code; define complete parallel
  assignments and standalone implementation prompts, defaulting to five tasks.
---

# Create useful parallel assignments

Define important, implementable tasks that separate agents can start without this conversation or communication with each other. This skill writes plans and instructions; it does not dispatch tasks or implement them.

Follow [AGENTS.md](../../../AGENTS.md) and [documentation ownership](../../rules/documentation.md). Those sources own development workflow, authorization, verification, spending and completion. Do not reproduce or extend those policies in this skill's output.

## Interpret the request

- Default to **five assignments**. A user-specified count overrides five. An assignment can contain several related work items; item IDs are not a headcount.
- Honor a specified task, feature, category, priority, excluded area or existing branch. “Focus on” weights selection toward that subject; “only” restricts the scope. Explain any necessary enabling work outside the focus rather than quietly broadening it.
- Use a supplied time horizon, engineering capacity and constraints. Otherwise give reasoned effort ranges and assumptions; do not invent a workweek, hours per engineer, AI productivity multiplier or spending allocation.
- For an existing plan, audit and extend the relevant definitions rather than restart selection or duplicate documents. For a prompts-only request, reuse adequate designs; identify or fill missing task information within the authorized scope.
- Clarify only missing information that materially prevents a sound assignment. Use current project evidence and reversible judgment for routine choices.

## Select and define the work

When selecting, expanding or specifying the assignments, read [planning and task definitions](references/planning.md). Inspect current TODOs, accepted plans, relevant code and active work before deciding what remains. The four areas to consider are established-system bugs, engine/world foundations, world-specific gameplay and presentation. **They are search lenses, not quotas:** any number of assignments, including all of them, may come from one area.

Rank by the project's priorities, impact, urgency, dependencies and risk of building on a weak foundation. Avoid low-value padding, obsolete fixes and duplicate ongoing work. Make a cohesive parallel allocation with concrete completion criteria and realistic shared dependencies. Use the existing [design workflow](../openlegend-design/SKILL.md#feature-spec-or-technical-design-requests) when feature/technical specifications need creating or strengthening; its canonical document and approval rules remain controlling.

## Produce the handoff

Read [standalone task prompts](references/task-prompts.md) when writing the copy/paste instructions. Default output is a prioritized allocation, linked task definitions/designs and one complete prompt per assignment. Honor narrower requested deliverables.

The assignments **must not communicate with one another**. Settle shared contracts in the planning documents. Explain sequencing to the owner when one task depends on another; do not instruct workers to negotiate interfaces, message peers, poll other chats, send status to an integration agent or orchestrate sibling tasks. Shared files are acceptable when responsibilities and the intended combined behavior are clear.

Prompts define work and point to helpful evidence. They must not instruct agents to write tests, invent development procedures, assign Git/integration powers or grant spending. Defer those matters to current `AGENTS.md` and explicit user instructions. Include the concrete results that need demonstrating, without turning them into a new testing policy.

Check count, focus, priorities, prerequisites, acceptance and links. Reconcile affected records under the documentation policy. Report unresolved design or unavailable dependencies rather than claim readiness.
