---
name: openlegend-design
description: >-
  Create paired feature specs and technical designs, translate approval into tracked implementation,
  or design changed engine/world contracts; not routine fixes.
---

# Design from playable behavior

Start with player/NPC scenarios: trigger, knowledge, interaction, outcome and meaningful failure, or equivalent non-game examples. Consult relevant [repertoires](../../../docs/repertoires/actions.md) for context and expansion possibilities, not automatic requirements. Separate the ambitious target from feasible, incremental end-to-end stages. Skip planning ceremony for an already clear local change.

## Feature-spec or technical-design requests

A request to create either deliverable produces both, as distinct cross-linked files with the same project prefix: `docs/projects/<project>-feature-spec.md` and `docs/projects/<project>-tech-design.md`. Update an existing pair rather than create duplicates.

The feature spec details behavior, user/agent journeys, target scenarios, scope/non-goals, edge/failure cases, acceptance criteria and staged capabilities. The technical design details architecture, semantic owners, contracts/data flow, persistence/migration, performance, security/privacy, extension seams, implementation stages, verification and tradeoffs/open decisions. Keep behavior distinct from mechanism and proposals from implemented behavior.

## Architecture and extension boundaries

Read the canonical specification and focused tracker; apply the [boundary decision procedure](../../../docs/engine-and-world-boundaries.md#5-a-repeatable-boundary-decision) and P01–P12 without duplicating their catalogue.

Distinguish protected runtime integrity, reusable mechanisms, replaceable policy and authored content. Could another coherent world differ? Compose existing operations first; add a narrow trusted capability only for missing computation. Native code can implement world policy. Generality is not arbitrary strings, ambient permissions or executable prose.

Trace relevant ownership, units, permitted reads/writes, triggers, work bounds, interaction effects and lifecycle through save/restore. Include cognition/observation and player discoverability, not only storage. For invention/world-authoring work, specify supported inspection, creation and modification through existing admission, with understandable consequences and explicit unsupported capabilities.

Challenge claimed composability with a genuinely different scenario. Localize necessary v1 specificity with its owner, limit, seam and extraction trigger instead of building an unused framework. Logical modularity does not require new packages, services or an ECS replacement.

## Approval to implementation

Design-only work stops at the paired deliverables, feasible stages and open choices. Once the developer approves the pair, commence implementation unless they explicitly withhold it. Before coding, follow [Documentation](../../rules/documentation.md#project-approval-and-current-truth): create/update detailed `docs/maintainers/` work items referencing both project files, preserve IDs/dependencies/exit criteria and promote accepted behavior/decisions into persistent docs without claiming targets are implemented.

Honor any specified items, batch or time range. Without one (for example, “start work,” “implement” or “do it”), select a reasonable first batch estimated at 45 minutes of continuous agent coding; continue related in-scope work until the one-hour window is exhausted or all related work is complete. Do not idle to fill time or expand scope. Conflict stops, genuine blockers, permissions, budgets and platform limits still apply; report actual progress and any early stop honestly.

Apply the root development workflow before coding. Complete the agreed slice and user/agent surfaces; resolve reversible choices and record blockers, continuing independent work only when the conflict-stop rule permits. [Verification](../../rules/verification.md) owns evidence; implementation and unverified acceptance remain distinct.
