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

Use [root task authorization](../../../AGENTS.md#task-scope-and-authorization). Interpret chat approval of the discussed project plan from context: “approved,” “looks good,” “yes,” “go ahead,” “start work,” “implement” or “do it” can suffice; no repeated spec filenames are needed. GitHub PR approval or a document-status change is not that chat instruction.

For a spec/design-only request, deliver the pair, feasible stages and open choices. After chat approval to implement, apply [root startup](../../../AGENTS.md#work-discipline), then [Documentation](../../rules/documentation.md#project-approval-and-current-truth) for pre-implementation tracker/contract reconciliation, and **commence implementation in the same working session**. Planning/tracker updates do not complete an implementation request.

Use [root completion/handoff](../../../AGENTS.md#completion-and-handoff--every-task) and [Verification](../../rules/verification.md) through the full agreed scope, including user/agent surfaces; the linked documentation policy owns work IDs, dependencies and acceptance status.
