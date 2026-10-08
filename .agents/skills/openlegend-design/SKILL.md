---
name: openlegend-design
description: >-
  Create paired feature specs and technical designs, execute a project plan after chat approval,
  or design changed engine/world contracts and gameplay discoveries, rewards, knowledge or progression;
  not routine fixes or prose corrections.
---

# Design from playable behavior

For prioritized parallel assignments or standalone task prompts, use [create-parallel-tasks](../create-parallel-tasks/SKILL.md).

Start with player/NPC scenarios: trigger, available knowledge, interaction, visible outcome and meaningful failure, or equivalent non-game examples. Consult relevant [repertoires](../../../docs/repertoires/actions.md) for context and expansion possibilities, not automatic requirements. Separate the ambitious target from feasible, incremental end-to-end stages. Follow the [root planning requirement](../../../AGENTS.md#plan-before-implementation), scaling detail to the task.

Apply [the developer-question rule](../../../AGENTS.md#resolve-developer-questions-before-dependent-work) to design as well as code: complete the independent parts, then obtain the developer's answers before developing the dependent specification. An open-decisions section records remaining questions; it does not replace asking them or authorize designing around assumed answers.

## Discoveries, rewards and earned progress

For gameplay discovery/reward/knowledge/progression work, read the relevant [knowledge contract](../../../docs/knowledge.md) and authored-world profile before planning changes. Distinguish finding a place, inspecting an object, learning a method, taking stock, manufacturing and using the result; one does not imply the others. Compose existing custody, knowledge, admission and manufacture owners, with the world's profile selecting rewards, grants and tuning. A physical record discloses its exact admitted method through [the record contract](../../../docs/knowledge.md#physical-production-method-records); it is not a hidden substitute for live invention. Keep origin and qualifying action evidence durable and consistent across receipts, repeated requests, persistence and player labels. Progress must credit what actually happened, not merely the presence of equivalent knowledge or an output item.

Name the useful option or tradeoff the reward adds and a worthwhile stopping point where the feature allows partial participation. Exercise the reward through ordinary manufacture/use and verify actual remaining stock, repeat inspection and private second-visitor consequences under the selected world rules. Record mechanical correctness separately from engineer-assessed usefulness, uncoached enjoyment and balance; one successful scripted journey does not prove the latter. [Expedition evidence](../../../docs/verification/rewarding-expeditions.md#practical-value-of-the-second-trip) records that distinction rather than making finite rewards or a two-site route universal engine laws.

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
