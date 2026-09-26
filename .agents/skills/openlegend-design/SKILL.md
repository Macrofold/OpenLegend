---
name: openlegend-design
description: >-
  Create paired feature specs and technical designs, execute a project plan after chat approval,
  or design changed engine/world contracts; not routine fixes.
---

# Design from playable behavior

Start with player/NPC scenarios: trigger, available knowledge, interaction, visible outcome and meaningful failure, or equivalent non-game examples. Consult relevant [repertoires](../../../docs/repertoires/actions.md) for context and expansion possibilities, not automatic requirements. Separate the ambitious target from feasible, incremental end-to-end stages. Follow the [root planning requirement](../../../AGENTS.md#plan-before-implementation), scaling detail to the task.

## Feature-spec or technical-design requests

A request to create either deliverable produces both, as distinct cross-linked files with the same project prefix: `docs/projects/<project>-feature-spec.md` and `docs/projects/<project>-tech-design.md`. Update an existing pair rather than create duplicates.

Follow [Feature documentation](../../../docs/feature-documentation.md) for required content and the Maintained records section linking the focused implementation tracker and feature limits/constraints inventory. Keep behavior distinct from mechanism and proposals from implemented behavior; record numerical and behavioral restrictions with reasons, restrictiveness and removed/no-limit decisions under the linked tracking rules.

## Architecture and extension boundaries

Read the canonical specification and focused tracker; apply the [boundary decision procedure](../../../docs/engine-and-world-boundaries.md#5-a-repeatable-boundary-decision) and P01–P12 without duplicating their catalogue.

Distinguish protected runtime integrity, reusable mechanisms, replaceable policy and authored content. Could another coherent world differ? Compose existing operations first; add a narrow trusted capability only for missing computation. Native code can implement world policy. Generality is not arbitrary strings, ambient permissions or executable prose.

Trace relevant ownership, units, permitted reads/writes, triggers, work bounds, interaction effects and lifecycle through save/restore. Include cognition/observation and player discoverability, not only storage. For invention/world-authoring work, specify supported inspection, creation and modification through existing admission, with understandable consequences and explicit unsupported capabilities.

Challenge claimed composability with a genuinely different scenario. Localize necessary v1 specificity with its owner, limit, seam and extraction trigger instead of building an unused framework. Logical modularity does not require new packages, services or an ECS replacement.

## Approval to implementation

The trigger is the developer's **chat instruction approving the discussed project plan for work**. Interpret the conversation, not a magic phrase: “approved,” “looks good” or “yes” accepting the plan, or “go ahead” / “start work” / “implement” / “do it” referring to it are sufficient. No formal approval artifact, repeated spec filenames or second confirmation is required. Honor scope, requested revisions and “do not implement yet” qualifiers. Reading an old approval/status, quoting these examples or editing this workflow is not a new go-ahead.

Spec/design creation alone stops at the paired deliverables, feasible stages and open choices. After chat approval, apply the root development startup before edits; follow [Documentation](../../rules/documentation.md#project-approval-and-current-truth) to link detailed maintainer work to both project files and integrate accepted decisions, then **commence implementation in the same working session**. Do not stop after planning/tracker updates or ask whether to begin. “Continue” resumes the next unfinished authorized work from current docs/trackers, not a new design/approval cycle.

Honor specified scope, batch or time range. Otherwise continue until the full agreed scope satisfies the [root completion criteria](../../../AGENTS.md#completion-and-handoff--every-task); there is no default time window for stopping early. A progress report or one completed stage is not a stopping point. Do not idle to fill time or expand scope. Conflict stops, genuine blockers, permissions, budgets and platform limits still apply; report actual progress and any incomplete work honestly.

Complete the agreed scope and user/agent surfaces; resolve reversible choices and record blockers, continuing independent work only when the conflict-stop rule permits. [Verification](../../rules/verification.md) owns evidence; preserve existing work IDs/dependencies/exit criteria and distinguish implementation from unverified acceptance.
